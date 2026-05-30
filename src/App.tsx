import { useState, useEffect, useRef, useCallback } from "react";
import { translations } from "./utils/translations";
import { 
  Home, 
  Baby, 
  Settings,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Lock
} from "lucide-react";

import { useToddlerProgress } from "./hooks/useToddlerProgress";
import { ChildProfile, ReviewItem, StoryItem } from "./types";
import { ToddlerSoundSynth } from "./utils/audio";
import { quranMetaData } from "./data/quranMeta";
import { fetchSurahText } from "./utils/quranApi";
import { calculateAge } from "./utils/dateUtils";
import { updateChildPresets } from "./utils/dbEngine";
import { 
  handleGoogleLogin, 
  handleLogout, 
  onAuthChanged, 
  listenToGroupStudents, 
  cloudSaveStudent,
  cloudSubmitAssessment,
  cloudInviteToGroup,
  cloudJoinGroup,
  cloudDeleteStudentDocument,
  cloudBulkSeedStudents
} from "./utils/firebaseGroupEngine";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./utils/firebaseGroupEngine";

import ParentDashboard from "./components/ParentDashboard";
import ChildPlayScreen from "./components/ChildPlayScreen";
import SettingsScreen from "./components/SettingsScreen";
import LoginScreen from "./components/LoginScreen";
import QuranPlayerScreen from "./components/QuranPlayerScreen";

const STORIES: StoryItem[] = [
  {
    id: "bintang",
    title: "Bintang Kecil",
    subtitle: "Lagu Pembimbing Tidur",
    emoji: "⭐️",
    color: "#48C78E", // mint
    accentColor: "#3ab37c",
    durationString: "1 Menit",
    themeGradient: "from-amber-100 to-orange-100",
  },
  {
    id: "kancil",
    title: "Si Kancil & Buaya",
    subtitle: "Dongeng Fabel Pintar",
    emoji: "🦌",
    color: "#FF9F43", // warm orange
    accentColor: "#e08528",
    durationString: "3 Menit",
    themeGradient: "from-emerald-100 to-teal-100",
  },
  {
    id: "pelangi",
    title: "Pelangi Indah",
    subtitle: "Lagu Edukasi Warna",
    emoji: "🌈",
    color: "#4dabf7", // sky blue
    accentColor: "#228be6",
    durationString: "1.5 Menit",
    themeGradient: "from-blue-100 to-indigo-100",
  }
];

const NAV_TRANSLATIONS = {
  ID: {
    home: "Beranda",
    hafiz: "HAFIZ",
    quran: "Quran",
    settings: "Pengaturan"
  },
  EN: {
    home: "Home",
    hafiz: "HAFIZ",
    quran: "Quran",
    settings: "Settings"
  }
};

export default function App() {
  // Mode separation state
  const [activeMode, setActiveMode] = useState<"parent" | "child">("parent");
  const [showModeAnakSelector, setShowModeAnakSelector] = useState<boolean>(false);
  const [showChildLock, setShowChildLock] = useState<boolean>(false);
  const [childLockQuestion, setChildLockQuestion] = useState<{ q: string; ans: number; options: number[] }>({ q: "2 + 3", ans: 5, options: [4, 5, 6] });

  // Mode Selection: Parent-gated validation helper
  const generateChildLockQuestion = () => {
    const num1 = Math.floor(Math.random() * 6) + 2; // 2-7
    const num2 = Math.floor(Math.random() * 5) + 2; // 2-6
    const ans = num1 + num2;
    const optionsSet = new Set<number>();
    optionsSet.add(ans);
    while (optionsSet.size < 3) {
      optionsSet.add(ans + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1));
    }
    const options = Array.from(optionsSet).sort((a, b) => a - b);
    setChildLockQuestion({ q: `${num1} + ${num2}`, ans, options });
    setShowChildLock(true);
  };

  // Logic Rules state tracking
  const [currentScreen, setCurrentScreen] = useState<"dashboard" | "play" | "settings" | "quran">("dashboard");
  const [lang, setLang] = useState<"ID" | "EN">("ID");
  const [activeChild, setActiveChild] = useState<ChildProfile | null>(null);
  const [customSessionAyahs, setCustomSessionAyahs] = useState<any[] | null>(null);
  const [activeTaskCategory, setActiveTaskCategory] = useState<"ZIYADAH" | "QARIB" | "SABIQU">("ZIYADAH");
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [highlightAddChild, setHighlightAddChild] = useState<boolean>(false);
  const [settingsInitialSubView, setSettingsInitialSubView] = useState<string | null>(null);
  const [globalQari, setGlobalQari] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("wali_tahfidz_global_qari") || "ar.alafasy" : "ar.alafasy"));
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

  // Parent screen time and toddler target loops queue tracking
  const [childSessionQueue, setChildSessionQueue] = useState<any[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(0);
  const [screenTimeElapsed, setScreenTimeElapsed] = useState<number>(0);

  // Active Screen Time ticks every second in Child Play Screen
  useEffect(() => {
    if (activeMode === "child" && currentScreen === "play") {
      const timer = setInterval(() => {
        setScreenTimeElapsed((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeMode, currentScreen]);

  // Command handler to advance continuous queue
  const handleNextQueueTask = () => {
    if (childSessionQueue.length === 0) return;

    const nextIndex = currentQueueIndex + 1;
    const maxSessionDurationSeconds = (activeChild?.settings?.maxSessionDuration ?? 15) * 60;
    const isTimeExceeded = screenTimeElapsed >= maxSessionDurationSeconds;

    if (isTimeExceeded) {
       // Stop if screen time is exceeded, wait for parent to add minutes or exit
       return;
    }

    if (nextIndex < childSessionQueue.length) {
      setCurrentQueueIndex(nextIndex);
      const nextTask = childSessionQueue[nextIndex];
      setActiveTaskCategory(nextTask.category);
      setActiveTask(nextTask);
      handleStartCustomSession(nextTask.surah, nextTask.verse, activeChild!, nextTask.category);
    } else {
      // Reached end of today's targets - wrap around to beginning as requested
      setCurrentQueueIndex(0);
      const firstTask = childSessionQueue[0];
      setActiveTaskCategory(firstTask.category);
      setActiveTask(firstTask);
      handleStartCustomSession(firstTask.surah, firstTask.verse, activeChild!, firstTask.category);
    }
  };

  // Command handler to override and add minutes (extend session)
  const handleGlobalQariChange = (qariId: string) => {
    setGlobalQari(qariId);
    if (typeof window !== "undefined") {
      localStorage.setItem("wali_tahfidz_global_qari", qariId);
    }
  };

  const handleAddTimeOverride = () => {
    setScreenTimeElapsed((prev) => Math.max(0, prev - 600)); // adds 10 minutes of screen time
    setToast({
      message: lang === "EN" ? "Successfully added +10 minutes active screen time!" : "Berhasil menambah +10 menit screen time aktif!",
      visible: true
    });
    if (synthRef.current) {
      synthRef.current.playCelebrate();
    }
    // Automatically restart or continue the queue if we loop back
  };

  // Auto-dismiss Soft Toast Notification
  useEffect(() => {
    if (toast && toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => prev ? { ...prev, visible: false } : null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Auth state tracking
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wali_session_guest");
      return saved === "true";
    }
    return false;
  });
  const [waliId, setWaliId] = useState<string>("wali_adi_kurniawan");

  // Track auth state transitions and subscribe to live User profile group triggers
  useEffect(() => {
    let unsubscribeUserDoc = () => {};
    const unsubscribeAuth = onAuthChanged((currentUser) => {
      unsubscribeUserDoc();
      if (currentUser) {
        setUser(currentUser);
        setWaliId(currentUser.uid);
        
        // Listen to User Profile changes for instantaneous Group invites transitions
        const userDocRef = doc(db, "users", currentUser.uid);
        unsubscribeUserDoc = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserProfile(data);
            const activeGrp = data.groupIds?.[0] || `group_${currentUser.uid}`;
            setActiveGroupId(activeGrp);
          } else {
            setActiveGroupId(`group_${currentUser.uid}`);
          }
        }, (err) => {
          console.warn("User document live snapshot listen failed:", err.message);
          setActiveGroupId(`group_${currentUser.uid}`);
        });
      } else {
        setUser(null);
        setUserProfile(null);
        setActiveGroupId(null);
        if (isGuest) {
          setWaliId("wali_adi_kurniawan");
        }
      }
      setAuthLoading(false);
    });
    return () => {
      unsubscribeAuth();
      unsubscribeUserDoc();
    };
  }, [isGuest]);

  // Global Audio Synthesizer ref
  const synthRef = useRef<ToddlerSoundSynth | null>(null);

  // Initialize Audio once
  useEffect(() => {
    synthRef.current = new ToddlerSoundSynth();
  }, []);

  // Muted audio state
  const [muted, setMuted] = useState<boolean>(false);
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.setMute(muted);
    }
  }, [muted]);

  // Use progress logic hook for active child session
  const { 
    progress, 
    completedCount, 
    incrementProgress, 
    resetProgress, 
    resetAll: resetAllPiala 
  } = useToddlerProgress();

  // Child list state
  const [childrenList, setChildrenList] = useState<ChildProfile[]>(() => {
    const cacheKey = isGuest ? "gentle_children_list" : `gentle_children_list_default`;
    const saved = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((child: any) => {
          if (child.birthMonth && child.birthYear) {
            child.age = calculateAge(child.birthYear, child.birthMonth);
          }
          if (!child.memorizationProfile) {
            child.memorizationProfile = {
              ziyadah: child.id === "said" ? { id: "task_ziyadah_said", surah: "Al-A'laa", verse: "Ayat 6" } : { id: "task_ziyadah_sumayyah", surah: "Al-Falaq", verse: "Ayat 1" },
              qarib: child.id === "said" 
                ? [{ id: "task_qarib_said_1", surah: "Al-A'laa", verse: "Ayat 1-5", consecutiveDays: 3 }] 
                : [{ id: "task_qarib_sumayyah_1", surah: "An-Nas", verse: "Ayat 1-3", consecutiveDays: 2 }],
              sabiq: child.id === "said"
                ? [{ id: "task_sabiq_said_1", surah: "Al-Ikhlas", verse: "Ayat 1-4" }, { id: "task_sabiq_said_2", surah: "An-Nas", verse: "Ayat 1-6" }]
                : [{ id: "task_sabiq_sumayyah_1", surah: "Al-Ikhlas", verse: "Ayat 1-4" }]
            };
          }
          return child;
        });
      } catch (e) {
        console.warn("Failed to parse children list:", e);
      }
    }
    return [
      {
        id: "said",
        name: "Said",
        age: calculateAge(2022, 5),
        birthYear: 2022,
        birthMonth: 5,
        avatar: "🦊",
        streak: 5,
        completedBooks: 3,
        memorizationProfile: {
          ziyadah: { id: "task_ziyadah_said", surah: "Al-A'laa", verse: "Ayat 6" },
          qarib: [
            { id: "task_qarib_said_1", surah: "Al-A'laa", verse: "Ayat 1-5", consecutiveDays: 3 }
          ],
          sabiq: [
            { id: "task_sabiq_said_1", surah: "Al-Ikhlas", verse: "Ayat 1-4" },
            { id: "task_sabiq_said_2", surah: "An-Nas", verse: "Ayat 1-6" }
          ]
        }
      },
      {
        id: "sumayyah",
        name: "Sumayyah",
        age: calculateAge(2023, 11),
        birthYear: 2023,
        birthMonth: 11,
        avatar: "🐰",
        streak: 8,
        completedBooks: 6,
        memorizationProfile: {
          ziyadah: { id: "task_ziyadah_sumayyah", surah: "Al-Falaq", verse: "Ayat 1" },
          qarib: [
            { id: "task_qarib_sumayyah_1", surah: "An-Nas", verse: "Ayat 1-3", consecutiveDays: 2 }
          ],
          sabiq: [
            { id: "task_sabiq_sumayyah_1", surah: "Al-Ikhlas", verse: "Ayat 1-4" }
          ]
        }
      }
    ];
  });

  // Load account-specific cache when account changes or login transitions
  useEffect(() => {
    if (isGuest) {
      const cacheKey = "gentle_children_list";
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setChildrenList(parsed);
        } catch (e) {
          console.warn("Error loading guest cache:", e);
        }
      }
    } else if (user) {
      // Clear to allow real-time group-based Firestore synchronization to stream values
      setChildrenList([]);
    }
  }, [user, isGuest]);

  // Save children list to localStorage when changed, keeping offline-resilient backup for guests
  useEffect(() => {
    if (isGuest) {
      const cacheKey = "gentle_children_list";
      localStorage.setItem(cacheKey, JSON.stringify(childrenList));
    }
  }, [childrenList, isGuest]);

  // Connect Firebase Group-based real-time onSnapshot sync
  useEffect(() => {
    if (!user || !activeGroupId) return;

    const unsubscribe = listenToGroupStudents(user.uid, async (updatedStudents) => {
      if (updatedStudents && updatedStudents.length > 0) {
        // Map age calculations on-the-fly to guarantee pristine reactive views
        const processedAll = updatedStudents.map((child: any) => {
          if (child.birthMonth && child.birthYear) {
            child.age = calculateAge(child.birthYear, child.birthMonth);
          }
          return child;
        });

        setChildrenList(processedAll);
      } else {
        // Automatically seed with default profiles if newly registered workspace is blank
        const alreadySeeded = localStorage.getItem(`seeded_group_${activeGroupId}`);
        if (!alreadySeeded) {
          localStorage.setItem(`seeded_group_${activeGroupId}`, "true");
          
          const starterProfiles = [
            {
              id: "said_" + Date.now(),
              name: "Said",
              age: calculateAge(2022, 5),
              birthYear: 2022,
              birthMonth: 5,
              avatar: "🦊",
              streak: 5,
              completedBooks: 3,
              memorizationProfile: {
                ziyadah: { id: "task_ziyadah_said", surah: "Al-A'laa", verse: "Ayat 6" },
                qarib: [
                  { id: "task_qarib_said_1", surah: "Al-A'laa", verse: "Ayat 1-5", consecutiveDays: 3 }
                ],
                sabiq: [
                  { id: "task_sabiq_said_1", surah: "Al-Ikhlas", verse: "Ayat 1-4" },
                  { id: "task_sabiq_said_2", surah: "An-Nas", verse: "Ayat 1-6" }
                ]
              }
            },
            {
              id: "sumayyah_" + Date.now(),
              name: "Sumayyah",
              age: calculateAge(2023, 11),
              birthYear: 2023,
              birthMonth: 11,
              avatar: "🐰",
              streak: 8,
              completedBooks: 6,
              memorizationProfile: {
                ziyadah: { id: "task_ziyadah_sumayyah", surah: "Al-Falaq", verse: "Ayat 1" },
                qarib: [
                  { id: "task_qarib_sumayyah_1", surah: "An-Nas", verse: "Ayat 1-3", consecutiveDays: 2 }
                ],
                sabiq: [
                  { id: "task_sabiq_sumayyah_1", surah: "Al-Ikhlas", verse: "Ayat 1-4" }
                ]
              }
            }
          ];
          await cloudBulkSeedStudents(activeGroupId, starterProfiles);
        } else {
          setChildrenList([]);
        }
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeGroupId, user]);

  // Handle active children profiles CRUD
  const handleAddChild = async (name: string, birthMonth: number, birthYear: number, avatar: string) => {
    const ageString = calculateAge(birthYear, birthMonth);
    const newChild: ChildProfile = {
      id: "child_" + Date.now(),
      name,
      age: ageString,
      birthMonth,
      birthYear,
      avatar,
      streak: 1,
      completedBooks: 0,
      memorizationProfile: {
        ziyadah: null,
        qarib: [],
        sabiq: []
      },
      settings: {
        talaqqiAudioRepeats: 5,
        tikrarSelfRepeats: 10,
        maxSessionDuration: 15
      }
    };
    try {
      if (user && activeGroupId) {
        await cloudSaveStudent(activeGroupId, newChild);
      } else {
        setChildrenList((prev) => [...prev, newChild]);
      }
      setToast({
        message: `Profil anak "${name} ${avatar}" berhasil ditambahkan ke database! 🥰✨`,
        visible: true
      });
    } catch (e) {
      console.error("Gagal menyimpan profil anak:", e);
      setToast({
        message: `Gagal menyimpan profil anak ke database.`,
        visible: true
      });
    }
  };

  const handleDeleteChild = async (id: string) => {
    if (user && activeGroupId) {
      const found = childrenList.find((child) => child.id === id);
      if (found) {
        await cloudSaveStudent(activeGroupId, { ...found, isDeleted: true });
      }
    } else {
      setChildrenList((prev) => {
        const updated = prev.map((child) =>
          child.id === id ? { ...child, isDeleted: true } : child
        );
        if (activeChild?.id === id) {
          const remaining = updated.filter((child) => !child.isDeleted);
          setActiveChild(remaining.length > 0 ? remaining[0] : null);
        }
        return updated;
      });
    }
  };

  const handleRestoreChild = async (id: string) => {
    if (user && activeGroupId) {
      const found = childrenList.find((child) => child.id === id);
      if (found) {
        await cloudSaveStudent(activeGroupId, { ...found, isDeleted: false });
      }
    } else {
      setChildrenList((prev) =>
        prev.map((child) =>
          child.id === id ? { ...child, isDeleted: false } : child
        )
      );
    }
  };

  const handlePermanentDeleteChild = async (id: string) => {
    if (user && activeGroupId) {
      await cloudDeleteStudentDocument(id);
      if (activeChild?.id === id) {
        setActiveChild(null);
      }
    } else {
      setChildrenList((prev) => {
        const filtered = prev.filter((child) => child.id !== id);
        if (activeChild?.id === id) {
          const remaining = filtered.filter((child) => !child.isDeleted);
          setActiveChild(remaining.length > 0 ? remaining[0] : null);
        }
        return filtered;
      });
    }
  };

  const handleEditChild = async (
    id: string,
    name: string,
    birthMonth: number,
    birthYear: number,
    avatar: string,
    talaqqiRepeats: number = 5,
    tikrarRepeats: number = 10,
    maxSessionDuration: number = 15,
    rabtRepeats: number = 3,
    arabicFontSize: 'small' | 'medium' | 'large' | 'xlarge' | 'huge' = 'large'
  ) => {
    const ageString = calculateAge(birthYear, birthMonth);
    
    try {
      updateChildPresets(id, talaqqiRepeats, tikrarRepeats, maxSessionDuration, rabtRepeats, arabicFontSize);
    } catch (e) {
      console.warn("Failed to update child presets in dbEngine:", e);
    }

    try {
      if (user && activeGroupId) {
        const found = childrenList.find((child) => child.id === id);
        if (found) {
          const updatedChild = {
            ...found,
            name,
            age: ageString,
            birthMonth,
            birthYear,
            avatar,
            settings: {
              talaqqiAudioRepeats: talaqqiRepeats,
              tikrarSelfRepeats: tikrarRepeats,
              maxSessionDuration,
              rabtRepeats,
              arabicFontSize,
            }
          };
          await cloudSaveStudent(activeGroupId, updatedChild);
        }
      } else {
        setChildrenList((prev) => {
          const updated = prev.map((child) =>
            child.id === id
              ? {
                  ...child,
                  name,
                  age: ageString,
                  birthMonth,
                  birthYear,
                  avatar,
                  settings: {
                    talaqqiAudioRepeats: talaqqiRepeats,
                    tikrarSelfRepeats: tikrarRepeats,
                    maxSessionDuration,
                    rabtRepeats,
                    arabicFontSize,
                  },
                }
              : child
          );
          if (activeChild?.id === id) {
            const found = updated.find((c) => c.id === id);
            if (found) setActiveChild(found);
          }
          return updated;
        });
      }
      setToast({
        message: `Pengaturan & profil "${name}" berhasil diperbarui ke database! ⚙️✅`,
        visible: true
      });
    } catch (e) {
      console.error("Gagal memperbarui profil anak:", e);
      setToast({
        message: `Gagal memperbarui pengaturan profil anak.`,
        visible: true
      });
    }
  };

  // Logic Rules functions
  const handleStartSession = (childInput: ChildProfile | string) => {
    let childObj: ChildProfile | null = null;
    if (typeof childInput === "string") {
      childObj = childrenList.find((c) => c.id === childInput) || null;
    } else {
      childObj = childInput;
    }
    
    if (!childObj) return;

    setActiveChild(childObj);
    setActiveMode("child");

    const profile = childObj.memorizationProfile;
    const ziyadahTask = profile?.ziyadah;
    const qaribList = profile?.qarib || [];
    const sabiqList = profile?.sabiq || [];

    const fullQueue = [
      ...(ziyadahTask ? [{ ...ziyadahTask, category: "ZIYADAH" as const }] : []),
      ...qaribList.map(t => ({ ...t, category: "QARIB" as const })),
      ...sabiqList.map(t => ({ ...t, category: "SABIQU" as const }))
    ];

    setChildSessionQueue(fullQueue);
    setScreenTimeElapsed(0);

    let initialIndex = 0;
    let task = null;
    let cat: "ZIYADAH" | "QARIB" | "SABIQU" = "ZIYADAH";

    if (fullQueue.length > 0) {
      task = fullQueue[0];
      cat = fullQueue[0].category;
      initialIndex = 0;
    }

    setCurrentQueueIndex(initialIndex);
    setActiveTaskCategory(cat);
    const finalTask = task ? { ...task, category: cat } : null;
    setActiveTask(finalTask);

    if (task) {
      handleStartCustomSession(task.surah, task.verse, childObj, cat);
    } else {
      handleStartCustomSession("Al-Ikhlas", "Ayat 1-4", childObj, "ZIYADAH");
    }
  };

  const handleStartCustomSession = async (
    surahName: string, 
    verseRange: string, 
    child: ChildProfile, 
    category: "ZIYADAH" | "QARIB" | "SABIQU" = "ZIYADAH"
  ) => {
    setActiveChild(child);
    setActiveMode("child");
    setActiveTaskCategory(category);

    const profile = child.memorizationProfile;
    const ziyadahTask = profile?.ziyadah;
    const qaribList = profile?.qarib || [];
    const sabiqList = profile?.sabiq || [];

    const fullQueue = [
      ...(ziyadahTask ? [{ ...ziyadahTask, category: "ZIYADAH" as const }] : []),
      ...qaribList.map(t => ({ ...t, category: "QARIB" as const })),
      ...sabiqList.map(t => ({ ...t, category: "SABIQU" as const }))
    ];

    let targetIndex = fullQueue.findIndex(t => t.surah === surahName && t.category === category);
    if (targetIndex === -1) {
      const customTask = { id: "custom_" + Date.now(), surah: surahName, verse: verseRange, category };
      fullQueue.push(customTask);
      targetIndex = fullQueue.length - 1;
    }

    setChildSessionQueue(fullQueue);
    setCurrentQueueIndex(targetIndex);

    if (currentScreen !== "play") {
      setScreenTimeElapsed(0);
    }

    const matchedTask = fullQueue[targetIndex];
    const finalTask = matchedTask 
      ? { ...matchedTask, category } 
      : { id: "custom_" + Date.now(), surah: surahName, verse: verseRange, category };
    setActiveTask(finalTask);

    setCurrentScreen("play");
    resetProgress();
    setIsPlaying(false);
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
    }

    // Fuzzy matching helper to reconcile transliteration differences (e.g. Al-Ikhlas vs Al Ikhlaas)
    const normalizeStr = (str: string) => {
      if (!str) return "";
      return str
        .toLowerCase()
        .replace(/[\s\-\']/g, "")
        .replace(/aa/g, "a")
        .replace(/oo/g, "u")
        .replace(/uu/g, "u")
        .replace(/ii/g, "i")
        .replace(/ee/g, "i")
        .replace(/lh/g, "l")
        .replace(/kh/g, "h")
        .trim();
    };

    const targetNorm = normalizeStr(surahName);

    const surahNode = (quranMetaData as any[]).find((s) => {
      if (!s || s.id === 0) return false;
      const tNorm = normalizeStr(s.transliteration);
      if (tNorm === targetNorm) return true;
      if (s.alternateNames?.some((alt: string) => normalizeStr(alt) === targetNorm)) return true;
      if (normalizeStr(s.translation) === targetNorm) return true;
      return false;
    });

    const surahId = surahNode ? surahNode.id : 112;

    // Parse verses range e.g. "Ayat 1-5" or "1-5" or "Ayat 3"
    let from = 1;
    let to = 1;
    const match = verseRange.match(/(\d+)(?:\s*-\s*(\d+))?/);
    if (match) {
      from = parseInt(match[1], 10);
      to = match[2] ? parseInt(match[2], 10) : from;
    }

    // Safeguard bound limits
    const maxV = surahNode ? surahNode.verses : 10;
    const finalFrom = Math.min(Math.max(1, from), maxV);
    const finalTo = Math.min(Math.max(1, to), maxV);
    const computedFrom = Math.min(finalFrom, finalTo);
    const computedTo = Math.max(finalFrom, finalTo);

    const fallbackList = [];
    for (let i = computedFrom; i <= computedTo; i++) {
      fallbackList.push({
        surah: surahId,
        surah_name: surahNode ? surahNode.transliteration : surahName,
        ayah_number: i,
        text: `Memuat ayat ${i}...`
      });
    }
    setCustomSessionAyahs(fallbackList);

    try {
      const apiVerses = await fetchSurahText(surahId);
      if (apiVerses && apiVerses.length > 0) {
        const realAyahs = [];
        for (let i = computedFrom; i <= computedTo; i++) {
          const matchedApiObj = apiVerses.find((v: any) => v.numberInSurah === i);
          realAyahs.push({
            surah: surahId,
            surah_name: surahNode ? surahNode.transliteration : surahName,
            ayah_number: i,
            text: matchedApiObj ? matchedApiObj.text : `Ayat ${i}`
          });
        }
        if (realAyahs.length > 0) {
          setCustomSessionAyahs(realAyahs);
        }
      }
    } catch (e) {
      console.warn("Quran text fetch error - fallback mapped", e);
    }
  };

  function surIdFromNode(surNode: any, fallbackId: number): number {
    return surNode ? surNode.id : fallbackId;
  }

  const handleEndSession = () => {
    setActiveChild(null);
    setActiveMode("parent");
    setCurrentScreen("dashboard");
    setIsPlaying(false);
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
    }
  };

  const handleJumpToQuranPlayer = () => {
    setActiveChild(null);
    setActiveMode("parent");
    setCurrentScreen("quran");
    setIsPlaying(false);
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
    }
  };

  // Review items Murojaah state
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([
    {
      id: "tugas_1",
      surah: "Al-Ikhlas",
      verse: "Ayat 1-2",
      grade: "sempurna",
    },
    {
      id: "tugas_2",
      surah: "An-Nas",
      verse: "Ayat 1-4",
    },
    {
      id: "tugas_3",
      surah: "Al-Falaq",
      verse: "Ayat 1-5",
      grade: "bagus",
    }
  ]);

  // Adaptive Murojaah Engine — Binary Rating (no parent burden)
  // Streak-based exponential interval: 0->1d, 1->3d, 2->7d, 3->14d, 4->30d, 5+->60d
  const STREAK_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60];

  const computeNextReviewDate = (streak: number): string => {
    const days = STREAK_INTERVALS_DAYS[Math.min(streak, STREAK_INTERVALS_DAYS.length - 1)];
    return new Date(Date.now() + days * 86400000).toISOString();
  };

  const normalizeToBinaryRating = (rating: string): "lulus" | "ulangi" => {
    if (rating === "sempurna" || rating === "bagus" || rating === "lulus") return "lulus";
    return "ulangi";
  };

  const handleSessionRating = async (taskId: string, performanceRating: "ulangi" | "bagus" | "sempurna" | "lulus") => {
    const binaryRating = normalizeToBinaryRating(performanceRating);

    if (synthRef.current) {
      if (binaryRating === "lulus") {
        synthRef.current.playSuccess();
      } else {
        synthRef.current.playProgressUp();
      }
    }

    if (user && activeGroupId) {
      const child = childrenList.find((c) => {
        const mp = c.memorizationProfile;
        if (!mp) return false;
        if (mp.ziyadah?.id === taskId) return true;
        if (mp.qarib?.some((t) => t.id === taskId)) return true;
        if (mp.sabiq?.some((t) => t.id === taskId)) return true;
        return false;
      });
      if (child) {
        await cloudSubmitAssessment(child.id, taskId, binaryRating);
      }
    } else {
      setChildrenList((prevList) => {
        return prevList.map((child) => {
          if (!child.memorizationProfile) return child;

          const mp = child.memorizationProfile;
          let isTaskOwner = false;
          let updatedZiyadah = mp.ziyadah;
          let updatedQarib = [...mp.qarib];
          let updatedSabiq = [...mp.sabiq];

          // ── Ziyadah: Lulus -> graduate to Murojaah (qarib) with streak=0 ────
          if (mp.ziyadah && mp.ziyadah.id === taskId) {
            isTaskOwner = true;
            if (binaryRating === "lulus") {
              updatedQarib.push({
                ...mp.ziyadah,
                id: "task_qarib_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                rating: "lulus" as const,
                streak: 0,
                nextReviewDate: computeNextReviewDate(0),
              });
              updatedZiyadah = null;
            } else {
              updatedZiyadah = {
                ...mp.ziyadah,
                rating: "ulangi" as const,
                nextReviewDate: computeNextReviewDate(0),
              };
            }
          }
          // ── Murojaah qarib ────────────────────────────────────────────────────
          else {
            const qaribIndex = updatedQarib.findIndex((t) => t.id === taskId);
            if (qaribIndex > -1) {
              isTaskOwner = true;
              const task = updatedQarib[qaribIndex];
              const currentStreak = task.streak ?? task.consecutiveDays ?? 0;
              if (binaryRating === "lulus") {
                const nextStreak = currentStreak + 1;
                updatedQarib[qaribIndex] = {
                  ...task,
                  rating: "lulus" as const,
                  streak: nextStreak,
                  nextReviewDate: computeNextReviewDate(nextStreak),
                };
              } else {
                updatedQarib[qaribIndex] = {
                  ...task,
                  rating: "ulangi" as const,
                  streak: 0,
                  nextReviewDate: computeNextReviewDate(0),
                };
              }
            }
            // ── Murojaah sabiq (long-term) ────────────────────────────────────
            else {
              const sabiqIndex = updatedSabiq.findIndex((t) => t.id === taskId);
              if (sabiqIndex > -1) {
                isTaskOwner = true;
                const task = updatedSabiq[sabiqIndex];
                const currentStreak = task.streak ?? task.consecutiveDays ?? 0;
                if (binaryRating === "lulus") {
                  const nextStreak = currentStreak + 1;
                  updatedSabiq[sabiqIndex] = {
                    ...task,
                    rating: "lulus" as const,
                    streak: nextStreak,
                    nextReviewDate: computeNextReviewDate(nextStreak),
                  };
                } else {
                  updatedSabiq[sabiqIndex] = {
                    ...task,
                    rating: "ulangi" as const,
                    streak: 0,
                    nextReviewDate: computeNextReviewDate(0),
                  };
                }
              }
            }
          }

          if (isTaskOwner) {
            return {
              ...child,
              memorizationProfile: {
                ziyadah: updatedZiyadah,
                qarib: updatedQarib,
                sabiq: updatedSabiq,
              },
            };
          }
          return child;
        });
      });
    }
  };

  const handleSaveUnusedWater = useCallback(async (childId: string, count: number) => {
    setChildrenList((prev) => {
      const foundChild = prev.find((c) => c.id === childId);
      if (!foundChild) return prev;
      
      const updatedChild = {
        ...foundChild,
        unusedWaterDroplets: count
      };

      if (user && activeGroupId) {
        cloudSaveStudent(activeGroupId, updatedChild).catch((err) => {
          console.error("Cloud save student failed in handleSaveUnusedWater:", err);
        });
      }
      
      return prev.map((c) => (c.id === childId ? updatedChild : c));
    });
  }, [user, activeGroupId]);

  const handleAddTaskForChild = async (
    childId: string, 
    surah: string, 
    verse: string, 
    category: "ziyadah" | "qarib" | "sabiq" = "ziyadah",
    initialGrade?: "ulangi" | "bagus" | "sempurna",
    initialConsecutiveDays: number = 0
  ) => {
    const newTask = {
      id: "task_" + category + "_" + Date.now(),
      surah,
      verse,
      grade: initialGrade || (category === "sabiq" ? "sempurna" : "bagus"),
      consecutiveDays: initialConsecutiveDays,
      nextReviewDate: new Date().toISOString()
    };

    if (user && activeGroupId) {
      const child = childrenList.find((c) => c.id === childId);
      if (child && child.memorizationProfile) {
        const mp = child.memorizationProfile;
        const updatedMp = { ...mp };
        if (category === "ziyadah") {
          updatedMp.ziyadah = newTask;
        } else if (category === "qarib") {
          updatedMp.qarib = [...mp.qarib, newTask];
        } else {
          updatedMp.sabiq = [...mp.sabiq, newTask];
        }
        await cloudSaveStudent(activeGroupId, { ...child, memorizationProfile: updatedMp });
      }
    } else {
      setChildrenList((prev) => 
        prev.map((child) => {
          if (child.id !== childId || !child.memorizationProfile) return child;

          const mp = child.memorizationProfile;
          if (category === "ziyadah") {
            return {
              ...child,
              memorizationProfile: {
                ...mp,
                ziyadah: newTask
              }
            };
          } else if (category === "qarib") {
            return {
              ...child,
              memorizationProfile: {
                ...mp,
                qarib: [...mp.qarib, newTask]
              }
            };
          } else {
            return {
              ...child,
              memorizationProfile: {
                ...mp,
                sabiq: [...mp.sabiq, newTask]
              }
            };
          }
        })
      );
    }
  };

  const handleDeleteTaskForChild = async (childId: string, taskId: string) => {
    if (user && activeGroupId) {
      const child = childrenList.find((c) => c.id === childId);
      if (child && child.memorizationProfile) {
        const mp = child.memorizationProfile;
        const updatedMp = {
          ziyadah: mp.ziyadah?.id === taskId ? null : mp.ziyadah,
          qarib: mp.qarib.filter((t) => t.id !== taskId),
          sabiq: mp.sabiq.filter((t) => t.id !== taskId)
        };
        await cloudSaveStudent(activeGroupId, { ...child, memorizationProfile: updatedMp });
      }
    } else {
      setChildrenList((prev) => 
        prev.map((child) => {
          if (child.id !== childId || !child.memorizationProfile) return child;

          const mp = child.memorizationProfile;
          return {
            ...child,
            memorizationProfile: {
              ziyadah: mp.ziyadah?.id === taskId ? null : mp.ziyadah,
              qarib: mp.qarib.filter((t) => t.id !== taskId),
              sabiq: mp.sabiq.filter((t) => t.id !== taskId)
            }
          };
        })
      );
    }
  };

  const handleGradeVerse = (itemId: string, grade: "ulangi" | "bagus" | "sempurna") => {
    if (synthRef.current) {
      if (grade === "sempurna") {
        synthRef.current.playSuccess();
      } else {
        synthRef.current.playProgressUp();
      }
    }
    setReviewItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, grade, gradedAt: new Date().toLocaleTimeString() } : item))
    );
  };

  const handleAddReviewItem = (surah: string, verse: string) => {
    const newItem: ReviewItem = {
      id: "murojaah_" + Date.now(),
      surah,
      verse,
    };
    setReviewItems((prev) => [...prev, newItem]);
  };

  const handleDeleteReviewItem = (itemId: string) => {
    setReviewItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Audio track playing simulation
  const [activeStory, setActiveStory] = useState<StoryItem>(STORIES[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePlayClick = () => {
    if (progress >= 100) return;
    
    if (synthRef.current) {
      synthRef.current.playPop();
    }

    if (isPlaying) {
      setIsPlaying(false);
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }
    } else {
      setIsPlaying(true);
      if (synthRef.current) {
        synthRef.current.playSuccess();
      }
      playTimeoutRef.current = setTimeout(() => {
        setIsPlaying(false);
      }, 3000);
    }
  };

  const handleSelectStory = (story: StoryItem) => {
    if (synthRef.current) {
      synthRef.current.playPop();
    }
    setActiveStory(story);
    setIsPlaying(false);
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
    }
    resetProgress();
  };

  // Confettis state when complete
  const [confettis, setConfettis] = useState<{ id: number; left: number; delay: number; color: string }[]>([]);
  useEffect(() => {
    if (progress === 100) {
      if (synthRef.current) {
        synthRef.current.playCelebrate();
      }
      
      // Increment completed book count for selected child
      if (activeChild) {
        setChildrenList((prev) =>
          prev.map((child) =>
            child.id === activeChild.id
              ? { ...child, completedBooks: child.completedBooks + 1, streak: child.streak + 1 }
              : child
          )
        );
      }

      const colors = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#FF9F43", "#A855F7"];
      const newConfetti = Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
      setConfettis(newConfetti);
    } else {
      setConfettis([]);
    }
  }, [progress, activeChild]);

  // Reset entire system progress parameters 
  const handleClearAllSessionData = () => {
    resetAllPiala();
    setReviewItems([
      {
        id: "tugas_1",
        surah: "Al-Ikhlas",
        verse: "Ayat 1-2",
      }
    ]);
    setChildrenList([
      {
        id: "said",
        name: "Said",
        age: "4.5 Tahun",
        avatar: "🦊",
        streak: 1,
        completedBooks: 0,
        memorizationProfile: {
          ziyadah: { id: "task_ziyadah_said", surah: "Al-A'laa", verse: "Ayat 6" },
          qarib: [
            { id: "task_qarib_said_1", surah: "Al-A'laa", verse: "Ayat 1-5", consecutiveDays: 3 }
          ],
          sabiq: [
            { id: "task_sabiq_said_1", surah: "Al-Ikhlas", verse: "Ayat 1-4" },
            { id: "task_sabiq_said_2", surah: "An-Nas", verse: "Ayat 1-6" }
          ]
        }
      },
      {
        id: "sumayyah",
        name: "Sumayyah",
        age: "3 Tahun",
        avatar: "🐰",
        streak: 1,
        completedBooks: 0,
        memorizationProfile: {
          ziyadah: { id: "task_ziyadah_sumayyah", surah: "Al-Falaq", verse: "Ayat 1" },
          qarib: [
            { id: "task_qarib_sumayyah_1", surah: "An-Nas", verse: "Ayat 1-3", consecutiveDays: 2 }
          ],
          sabiq: [
            { id: "task_sabiq_sumayyah_1", surah: "Al-Ikhlas", verse: "Ayat 1-4" }
          ]
        }
      }
    ]);
    setIsPlaying(false);
    progress < 100 && resetProgress();
    setCurrentScreen("dashboard");
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }
    };
  }, []);

  if (authLoading) {
    return (
      <div className="w-full h-dvh bg-slate-50 flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-md h-full mx-auto relative bg-[#FDFBF7] flex flex-col items-center justify-center shadow-2xl md:border-x md:border-slate-100 overflow-hidden">
          <div className="w-10 h-10 border-4 border-[#48C78E] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-black text-slate-400 mt-4 uppercase tracking-widest select-none">
            Menyiapkan Sistem...
          </p>
        </div>
      </div>
    );
  }

  const showAuthOverlay = !user && !isGuest;

  return (
    <div className="w-full h-dvh bg-slate-50 flex items-center justify-center overflow-hidden">
      {/* Centered mobile-first responsive bounds layout simulating a smartphone shell */}
      <div className="w-full max-w-md h-full mx-auto relative bg-[#FDFBF7] flex flex-col justify-between shadow-2xl md:border-x md:border-slate-100 overflow-hidden">
        
        {/* Soft Toast Notification Feedback Overlay */}
        {toast && toast.visible && (
          <div className="absolute top-4 left-4 right-4 z-[9999] transition-all duration-300">
            <div className="bg-white/95 backdrop-blur-md text-[#3A405A] px-4 py-3 rounded-2xl border-2 border-[#48C78E] shadow-xl flex items-center gap-3 animate-bounce-gentle">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#48C78E] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 stroke-[2.5px]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[11px] font-black text-slate-800 leading-tight">Berhasil Disimpan!</p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-tight">{toast.message}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setToast(prev => prev ? { ...prev, visible: false } : null)}
                className="text-slate-400 hover:text-slate-600 shrink-0 ml-1 p-1 rounded-lg hover:bg-slate-100 font-sans font-bold select-none cursor-pointer transition-colors"
                title="Tutup Notifikasi"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {showAuthOverlay ? (
          <LoginScreen
            onLogin={async () => {
              const loggedInUser = await handleGoogleLogin();
              setUser(loggedInUser);
              setWaliId(loggedInUser.uid);
              setIsGuest(false);
              localStorage.removeItem("wali_session_guest");
              if (synthRef.current) synthRef.current.playSuccess();
            }}
            onGuestMode={() => {
              if (synthRef.current) synthRef.current.playSuccess();
              localStorage.setItem("wali_session_guest", "true");
              setIsGuest(true);
              setWaliId("wali_adi_kurniawan");
            }}
          />
        ) : (
          <>
            {/* Dynamic active screen renderer */}
            {currentScreen === "dashboard" && (
              <ParentDashboard
                user={user}
                lang={lang}
                setLang={setLang}
                childrenList={childrenList.filter((c) => !c.isDeleted)}
                onStartSession={handleStartSession}
                reviewItems={reviewItems}
                onGradeVerse={handleGradeVerse}
                onAddReviewItem={handleAddReviewItem}
                onDeleteReviewItem={handleDeleteReviewItem}
                soundSynth={synthRef.current}
                onStartCustomSession={handleStartCustomSession}
                handleSessionRating={handleSessionRating}
                onAddTaskForChild={handleAddTaskForChild}
                onDeleteTaskForChild={handleDeleteTaskForChild}
                onNavigateToSettings={(autoOpenAddChild = false, targetSubView = null) => {
                  if (synthRef.current) synthRef.current.playPop();
                  setHighlightAddChild(autoOpenAddChild);
                  setSettingsInitialSubView(targetSubView);
                  setCurrentScreen("settings");
                }}
                {...({ handleStartSession } as any)}
              />
            )}

            {currentScreen === "play" && (
              <ChildPlayScreen
                lang={lang}
                setLang={setLang}
                sessionAyahs={customSessionAyahs || undefined}
                loopsPerAyah={activeChild?.settings?.talaqqiAudioRepeats ?? 5}
                targetTikrarCount={activeChild?.settings?.tikrarSelfRepeats ?? 10}
                targetRabtCount={activeChild?.settings?.rabtRepeats ?? 3}
                progress={progress}
                completedCount={completedCount}
                incrementProgress={incrementProgress}
                resetProgress={resetProgress}
                resetAll={resetAllPiala}
                activeStory={activeStory}
                isPlaying={isPlaying}
                muted={muted}
                onSetMuted={setMuted}
                confettis={confettis}
                handlePlayClick={handlePlayClick}
                handleSelectStory={handleSelectStory}
                stories={STORIES}
                selectedChild={activeChild}
                soundSynth={synthRef.current}
                taskCategory={activeTaskCategory}
                task={activeTask}
                handleSessionRating={handleSessionRating}
                onSaveUnusedWater={handleSaveUnusedWater}
                onNavigateToQuranPlayer={handleJumpToQuranPlayer}
                onNavigateToSettings={(autoOpenAddChild = false, targetSubView = null) => {
                  if (synthRef.current) synthRef.current.playPop();
                  setHighlightAddChild(autoOpenAddChild);
                  setSettingsInitialSubView(targetSubView);
                  setCurrentScreen("settings");
                }}
                childSessionQueue={childSessionQueue}
                currentQueueIndex={currentQueueIndex}
                screenTimeElapsed={screenTimeElapsed}
                maxSessionDurationSeconds={(activeChild?.settings?.maxSessionDuration ?? 15) * 60}
                onNextQueueTask={handleNextQueueTask}
                onAddTimeOverride={handleAddTimeOverride}
                {...({ activeChild, handleEndSession } as any)}
              />
            )}

            {currentScreen === "settings" && (
              <SettingsScreen
                globalQari={globalQari}
                onGlobalQariChange={handleGlobalQariChange}
                lang={lang}
                setLang={setLang}
                childrenList={childrenList}
                onAddChild={handleAddChild}
                onEditChild={handleEditChild}
                onDeleteChild={handleDeleteChild}
                onRestoreChild={handleRestoreChild}
                onPermanentDeleteChild={handlePermanentDeleteChild}
                muted={muted}
                onSetMuted={setMuted}
                onClearAllSessionData={handleClearAllSessionData}
                soundSynth={synthRef.current}
                currentUser={user}
                activeGroupId={activeGroupId}
                onInviteToGroup={(email, role) => cloudInviteToGroup(activeGroupId || "", email, role)}
                onJoinGroup={(groupId, role) => cloudJoinGroup(groupId, role)}
                onSignOut={async () => {
                  try {
                    await handleLogout();
                    setUser(null);
                    setIsGuest(false);
                    localStorage.removeItem("wali_session_guest");
                    if (synthRef.current) synthRef.current.playPop();
                  } catch (e) {
                    console.error("Logout error in App:", e);
                  }
                }}
                autoOpenAddChildForm={highlightAddChild}
                onClearAutoOpenAddChildForm={() => setHighlightAddChild(false)}
                initialSubView={settingsInitialSubView as any}
                onClearInitialSubView={() => setSettingsInitialSubView(null)}
              />
            )}

            {currentScreen === "quran" && (
              <QuranPlayerScreen lang={lang} soundSynth={synthRef.current} globalQari={globalQari} onGlobalQariChange={handleGlobalQariChange} />
            )}

            {/* BOTTOM FIXED ACCESS NAVIGATION BAR (Chunky Geometric Balance theme) */}
            {activeMode === "parent" ? (
              <nav className="absolute bottom-0 left-0 right-0 h-20 bg-[#FDFBF7] border-t-4 border-[#EBE6D9] shadow-lg flex justify-around items-center px-4 z-40 select-none">
                {/* 1. Beranda Wali */}
                <button
                  id="tab-btn-beranda"
                  onClick={() => {
                    if (synthRef.current) synthRef.current.playPop();
                    setCurrentScreen("dashboard");
                  }}
                  className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all relative ${
                    currentScreen === "dashboard" 
                      ? "text-[#1E5E3A] scale-105" 
                      : "text-[#A39E93] hover:text-[#3A405A]"
                  }`}
                >
                  <Home className="w-5.5 h-5.5 stroke-[3px]" />
                  <span className="text-[9.5px] font-black uppercase tracking-wider mt-1">
                    {lang === 'ID' ? 'Dasbor' : 'Dashboard'}
                  </span>
                  {currentScreen === "dashboard" && (
                    <div className="absolute top-0 left-4 right-4 h-1 bg-[#1E5E3A] rounded-full" />
                  )}
                </button>

                {/* 2. Quran Player */}
                <button
                  id="tab-btn-quran"
                  onClick={() => {
                    if (synthRef.current) synthRef.current.playPop();
                    setCurrentScreen("quran");
                  }}
                  className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all relative ${
                    currentScreen === "quran" 
                      ? "text-[#1E5E3A] scale-105" 
                      : "text-[#A39E93] hover:text-[#3A405A]"
                  }`}
                >
                  <BookOpen className="w-5.5 h-5.5 stroke-[2.5px]" />
                  <span className="text-[9.5px] font-black uppercase tracking-wider mt-1">
                    {NAV_TRANSLATIONS[lang].quran}
                  </span>
                  {currentScreen === "quran" && (
                    <div className="absolute top-0 left-4 right-4 h-1 bg-[#1E5E3A] rounded-full" />
                  )}
                </button>

                {/* 3. Pengaturan */}
                <button
                  id="tab-btn-settings"
                  onClick={() => {
                    if (synthRef.current) synthRef.current.playPop();
                    setCurrentScreen("settings");
                  }}
                  className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all relative ${
                    currentScreen === "settings" 
                      ? "text-[#1E5E3A] scale-105" 
                      : "text-[#A39E93] hover:text-[#3A405A]"
                  }`}
                >
                  <Settings className="w-5.5 h-5.5 stroke-[2.5px]" />
                  <span className="text-[9.5px] font-black uppercase tracking-wider mt-1">
                    {NAV_TRANSLATIONS[lang].settings}
                  </span>
                  {currentScreen === "settings" && (
                    <div className="absolute top-0 left-4 right-4 h-1 bg-[#1E5E3A] rounded-full" />
                  )}
                </button>


              </nav>
            ) : null}

            {/* Mode Anak Avatar Welcome Screen Modal */}
            {showModeAnakSelector && (
              <div className="absolute inset-0 bg-[#FDFBF7]/98 backdrop-blur-md z-[9999] flex flex-col justify-between p-6">
                <div className="w-full flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl animate-bounce-gentle">
                    🚀
                  </div>
                  <h2 className="text-lg font-black text-slate-800 mt-4 uppercase tracking-wide">
                    {lang === 'ID' ? 'Masuk Sesi Anak' : 'Enter Child Session'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                    {lang === 'ID' ? 'Siapa hafiz cilik yang akan mengaji dan bermain bersama hari ini? 😊✨' : 'Which little hafiz will recite and play today? 😊✨'}
                  </p>

                  {/* Child List Grid with responsive touch-targets */}
                  {childrenList.filter(c => !c.isDeleted).length === 0 ? (
                    <div className="mt-8 bg-amber-50/60 border border-amber-100 rounded-2xl p-5 text-center max-w-xs">
                      <p className="text-xs text-amber-700 font-bold leading-normal">
                        Belum ada profil anak terdaftar. Buat profil untuk memantau hafalan mandiri!
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (synthRef.current) synthRef.current.playPop();
                          setShowModeAnakSelector(false);
                          setHighlightAddChild(true);
                          setCurrentScreen("settings");
                        }}
                        className="mt-4 bg-[#48C78E] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl border-b-2 border-emerald-600 shadow-sm hover:bg-emerald-500 transition-all cursor-pointer"
                      >
                        + Buat Profil Anak
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-xs">
                      {childrenList.filter(c => !c.isDeleted).map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => {
                            if (synthRef.current) synthRef.current.playSuccess();
                            setShowModeAnakSelector(false);
                            handleStartSession(child);
                          }}
                          className="bg-white border-2 border-slate-100 hover:border-[#48C78E] rounded-3xl p-4 flex flex-col items-center gap-2 text-center active:scale-95 transition-all shadow-xs cursor-pointer group"
                        >
                          <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 group-hover:bg-emerald-50 group-hover:border-emerald-200 flex items-center justify-center text-3xl transition-colors">
                            {child.avatar || "👦"}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 leading-none">{child.name}</p>
                            <span className="text-[9px] text-[#48C78E] font-black uppercase mt-1 leading-none inline-block">Mulai Sesi ➔</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (synthRef.current) synthRef.current.playPop();
                    setShowModeAnakSelector(false);
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 py-3 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest active:scale-[0.99] transition-all cursor-pointer mt-4"
                >
                  Kembali ke Mode Wali 🛡️
                </button>
              </div>
            )}

            {/* Mode Anak Lock Puzzle Gated Dialog overlay */}
            {showChildLock && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 text-slate-800">
                <div className="bg-[#FDFBF7] rounded-3xl border-4 border-[#48C78E] shadow-2xl p-6 w-full max-w-sm text-center animate-scale-up-gentle">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#48C78E] flex items-center justify-center mx-auto mb-3 text-2xl">
                    🔒
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                    {lang === 'ID' ? 'Pintu Batas Orang Tua' : 'Parent Gate Lock'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    {lang === 'ID' 
                      ? 'Bunda/Ayah, mohon selesaikan teka-teki untuk membuktikan Anda adalah orang dewasa:' 
                      : 'Parents, please solve this addition puzzle to confirm you are an adult:'}
                  </p>
                  
                  {/* Math task display */}
                  <div className="my-4 bg-white border-2 border-slate-100 rounded-2xl p-3 shadow-3xs">
                    <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">
                      {lang === 'ID' ? 'Berapakah Hasil Dari:' : 'Solve Addition:'}
                    </span>
                    <span className="text-2xl font-black text-slate-700 block mt-1 tracking-wider">
                      {childLockQuestion.q} = ?
                    </span>
                  </div>

                  {/* Answer options */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {childLockQuestion.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          if (synthRef.current) synthRef.current.playPop();
                          if (opt === childLockQuestion.ans) {
                            // Correct!
                            if (synthRef.current) synthRef.current.playSuccess();
                            setShowChildLock(false);
                            setActiveMode("parent");
                            setCurrentScreen("dashboard");
                            setActiveChild(null);
                            setToast({ message: lang === 'ID' ? "Berhasil kembali ke Mode Wali (Orang Tua)" : "Returned to Parent Mode", visible: true });
                          } else {
                            // Incorrect
                            if (synthRef.current) synthRef.current.playPop();
                            setToast({ message: lang === 'ID' ? "Jawaban masih salah, silakan coba lagi ya Ayah/Bunda!" : "Incorrect answer! Please try again.", visible: true });
                            // Reset/regenerate
                            generateChildLockQuestion();
                          }
                        }}
                        className="bg-white border-2 border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-300 py-3 rounded-2xl text-sm font-black text-slate-700 active:scale-95 transition-all text-center cursor-pointer"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (synthRef.current) synthRef.current.playPop();
                      setShowChildLock(false);
                    }}
                    className="mt-4 text-[9px] text-[#A39E93] font-bold hover:text-slate-600 uppercase tracking-widest block mx-auto underline"
                  >
                    {lang === 'ID' ? 'Lanjutkan Belajar Anak 🚀' : 'Keep Learning 🚀'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
