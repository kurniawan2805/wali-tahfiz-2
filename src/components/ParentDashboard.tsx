import React, { useState, useEffect, useMemo } from "react";
import { 
  Award, 
  Baby, 
  BookOpen, 
  CheckCircle, 
  ChevronRight, 
  Flame, 
  GraduationCap, 
  Plus, 
  PlusCircle, 
  Play,
  Sparkles, 
  Trash2, 
  UserPlus,
  Search,
  Check,
  ChevronDown,
  X,
  Settings,
  Volume2,
  Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChildProfile, ReviewItem } from "../types";
import { ToddlerSoundSynth } from "../utils/audio";
import { quranMetaData } from "../data/quranMeta";
import TamanBuahNusantara from "./TamanBuahNusantara";
import { translations } from "../utils/translations";
import { useMonthlyHafizReport } from "../hooks/useMonthlyHafizReport";
import { DailyCheckInStatus } from "../types";
import HafizReportScreen from "./HafizReportScreen";
import SmartAddTaskForm from "./SmartAddTaskForm";
import { db } from "../utils/firebaseEngine";
import { 
  collection, 
  doc, 
  getDoc, 
  onSnapshot, 
  writeBatch 
} from "firebase/firestore";

interface ParentDashboardProps {
  childrenList: ChildProfile[];
  onStartSession: (child: ChildProfile) => void;
  reviewItems: ReviewItem[];
  onGradeVerse: (itemId: string, grade: "ulangi" | "bagus" | "sempurna") => void;
  onAddReviewItem: (surah: string, verse: string) => void;
  onDeleteReviewItem: (itemId: string) => void;
  soundSynth: ToddlerSoundSynth | null;
  onStartCustomSession?: (surahName: string, verseRange: string, child: ChildProfile, category?: "ZIYADAH" | "QARIB" | "SABIQU") => void;
  handleSessionRating?: (taskId: string, performanceRating: "ulangi" | "bagus" | "sempurna") => void;
  onAddTaskForChild?: (childId: string, surah: string, verse: string, category: "ziyadah" | "qarib" | "sabiq", initialGrade?: "ulangi" | "bagus" | "sempurna", initialConsecutiveDays?: number) => void;
  onDeleteTaskForChild?: (childId: string, taskId: string) => void;
  onNavigateToSettings?: (autoOpenAddChild?: boolean, targetSubView?: string | null) => void;
  user?: any;
}

interface LocalQueueItem {
  id: string;
  surah: string;
  verse: string;
  grade?: "ulangi" | "bagus" | "sempurna";
  nextReviewDate?: string;
}

interface SurahObj {
  id: number;
  arabic: string;
  translation: string;
  transliteration: string;
  verses: number;
  revelation: number;
  icon: string;
  alternateNames?: string[];
}

const JUZ_AMMA_PRESETS = [
  { id: 114, name: "An-Nas", verses: 6 },
  { id: 113, name: "Al-Falaq", verses: 5 },
  { id: 112, name: "Al-Ikhlas", verses: 4 },
  { id: 111, name: "Al-Lahab", verses: 5 },
  { id: 110, name: "An-Nasr", verses: 3 },
  { id: 109, name: "Al-Kafirun", verses: 6 },
  { id: 108, name: "Al-Kautsar", verses: 3 },
  { id: 107, name: "Al-Ma'un", verses: 7 },
  { id: 106, name: "Quraysh", verses: 4 },
  { id: 105, name: "Al-Fil", verses: 5 },
  { id: 104, name: "Al-Humazah", verses: 9 },
  { id: 103, name: "Al-Ashr", verses: 3 },
  { id: 102, name: "At-Takatsur", verses: 8 },
  { id: 101, name: "Al-Qari'ah", verses: 11 },
  { id: 100, name: "Al-Adiyat", verses: 11 },
  { id: 99, name: "Az-Zalzalah", verses: 8 },
  { id: 98, name: "Al-Bayyinah", verses: 8 },
  { id: 97, name: "Al-Qadr", verses: 5 },
  { id: 96, name: "Al-Alaq", verses: 19 },
  { id: 95, name: "At-Tin", verses: 8 },
  { id: 94, name: "Al-Insyirah", verses: 8 },
  { id: 93, name: "Ad-Duha", verses: 11 },
  { id: 92, name: "Al-Lail", verses: 21 },
  { id: 91, name: "Ash-Shams", verses: 15 },
  { id: 90, name: "Al-Balad", verses: 20 },
  { id: 89, name: "Al-Fajr", verses: 30 },
  { id: 88, name: "Al-Ghasyiyah", verses: 26 },
  { id: 87, name: "Al-A'la", verses: 19 },
  { id: 86, name: "At-Tariq", verses: 17 },
  { id: 85, name: "Al-Buruj", verses: 22 },
  { id: 84, name: "Al-Insyiqaq", verses: 25 },
  { id: 83, name: "Al-Mutaffifin", verses: 36 },
  { id: 82, name: "Al-Infitar", verses: 19 },
  { id: 81, name: "At-Takwir", verses: 29 },
  { id: 80, name: "Abasa", verses: 42 },
  { id: 79, name: "An-Nazi'at", verses: 46 },
  { id: 78, name: "An-Naba'", verses: 40 },
  { id: 1, name: "Al-Fatihah", verses: 7 }
];

// --- FIRESTORE ADAPTER INTEGRATION FOR ADAPTIVE LOGIC ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function syncSessionToFirebase(
  childId: string, 
  surahName: string, 
  sessionData: {
    repetition_count: number;
    from: number;
    to: number;
    is_scheduled_target?: boolean;
    made_progress?: boolean;
    durationMinutes?: number;
  }
) {
  const childDocPath = `children/${childId}`;
  try {
    const childDocRef = doc(db, "children", childId);
    const childSnap = await getDoc(childDocRef);
    
    let memoryHistory: Record<string, any> = {};
    if (childSnap.exists()) {
      memoryHistory = childSnap.data().memory_history || {};
    }

    const currentSurahState = memoryHistory[surahName] || {
      name: surahName,
      current_verse_range: { from: sessionData.from, to: sessionData.to },
      retention_score: 100,
      next_review_interval: 1,
      consecutive_stuck_days: 0
    };

    let consecutive_stuck_days = currentSurahState.consecutive_stuck_days || 0;
    let retention_score = currentSurahState.retention_score ?? 100;
    let next_review_interval = currentSurahState.next_review_interval || 1;
    let current_verse_range = { ...currentSurahState.current_verse_range };

    // Check modification manually constraint
    const isTargetOverridden = sessionData.from !== currentSurahState.current_verse_range.from || 
                               sessionData.to > currentSurahState.current_verse_range.to;

    if (sessionData.repetition_count < 3) {
      consecutive_stuck_days += 1;
      retention_score = Math.max(0, retention_score - 20);
      next_review_interval = Math.max(1, Math.round(next_review_interval * 0.5));
      // FREEZE the verse range pointer so it repeats tomorrow
      current_verse_range = { from: sessionData.from, to: sessionData.to };
    } else if (sessionData.repetition_count >= 9 || isTargetOverridden) {
      consecutive_stuck_days = 0;
      retention_score = 100;
      next_review_interval = Math.min(30, Math.round(next_review_interval * 2.5));
      
      // Automatically shift the verse range boundary forward for tomorrow's recommendation draft
      const completedCount = sessionData.to - sessionData.from + 1;
      const nextFrom = sessionData.to + 1;
      const nextTo = nextFrom + completedCount - 1;
      current_verse_range = { from: nextFrom, to: nextTo };
    } else {
      consecutive_stuck_days = 0;
      retention_score = Math.min(100, retention_score + 5);
      // Keep range same or progress normally
    }

    const updatedSurahState = {
      name: surahName,
      current_verse_range,
      retention_score,
      next_review_interval,
      consecutive_stuck_days
    };

    // ATOMIC DOUBLE-WRITE OPERATION
    const batch = writeBatch(db);
    
    // 1. Create a reference to a new document in `/daily_logs`
    const logDocRef = doc(collection(db, "daily_logs"));
    const verseCount = Math.max(1, sessionData.to - sessionData.from + 1);
    const computedDuration = calculateEstimatedMinutes(verseCount, sessionData.repetition_count);

    batch.set(logDocRef, {
      childId,
      surahName,
      repetition_count: sessionData.repetition_count,
      from: sessionData.from,
      to: sessionData.to,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split("T")[0],
      status: "aktif",
      durationMinutes: computedDuration
    });

    // 2. Map update inside the child document `/children/{childId}`
    batch.set(childDocRef, {
      id: childId,
      memory_history: {
        [surahName]: updatedSurahState
      }
    }, { merge: true });

    await batch.commit();

    return {
      updated: updatedSurahState,
      logMessage: sessionData.repetition_count < 3
        ? `⚠️ TERKENDALA! Consecutive Stuck Days: ${consecutive_stuck_days}, Retention Score: ${retention_score}%, Review Interval: ${next_review_interval} hari. (Pointer range FROZEN)`
        : `🚀 SINKRON CLOUD BERHASIL! Melejit interval: ${next_review_interval} hari, score: ${retention_score}%.`
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, childDocPath);
    throw error;
  }
}

export function calculateEstimatedMinutes(verseCount: number, repetitionCount: number): number {
  const secondsPerIteration = 15;
  const parentChildBondingBufferMinutes = 1;
  const totalSeconds = verseCount * repetitionCount * secondsPerIteration;
  const estimatedMin = Math.round(totalSeconds / 60) + parentChildBondingBufferMinutes;
  return Math.max(1, estimatedMin);
}

export default function ParentDashboard({
  childrenList,
  onStartSession,
  reviewItems,
  onGradeVerse,
  onAddReviewItem,
  onDeleteReviewItem,
  soundSynth,
  onStartCustomSession,
  handleSessionRating,
  onAddTaskForChild,
  onDeleteTaskForChild,
  onNavigateToSettings,
  user,
  lang = "ID",
  setLang,
}: ParentDashboardProps & { lang?: "ID" | "EN"; setLang?: (l: "ID" | "EN") => void }) {
  const t = translations[lang];
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const scrollTop = target && "scrollTop" in target ? target.scrollTop : 0;
      setIsCollapsed(window.scrollY > 80 || scrollTop > 80);
    };
    window.addEventListener("scroll", handleScroll, { capture: true });
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, []);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showFlowGuide, setShowFlowGuide] = useState(false);
  const [kabarWaliFeedOpen, setKabarWaliFeedOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kabar_wali_feed_dismissed") !== "true";
    }
    return true;
  });
  const [heroHookOpen, setHeroHookOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hero_hook_dismissed") !== "true";
    }
    return true;
  });
  const [dismissedGuestNudge, setDismissedGuestNudge] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dismiss_guest_nudge") === "true";
    }
    return false;
  });
  const [queue, setQueue] = useState<LocalQueueItem[]>([]);
  const [pendingQueue, setPendingQueue] = useState<any[]>([]);

  const [streakCount, setStreakCount] = useState<number>(0);
  const [activeCardChildSelectId, setActiveCardChildSelectId] = useState<string | null>(null);
  const [dashboardTab, setDashboardTab] = useState<"dasbor" | "laporan">("dasbor");

  // --- OVERHAULED GARDEN GAMIFICATION STATES (Anti-Inflation & Quality Shift) ---
  const [growthPoints, setGrowthPoints] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gentle_garden_growth_points");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [waterReserve, setWaterReserve] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gentle_garden_water_reserve");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [dailyItemsCount, setDailyItemsCount] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gentle_garden_daily_items");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [gardenFeedback, setGardenFeedback] = useState<{
    itemName: string;
    itemPoints: number;
    absorbed: boolean;
    addedToGrowth: number;
    addedToReserve: number;
    dailyCount: number;
  } | null>(null);

  // Synchronize overhauled garden states to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gentle_garden_growth_points", JSON.stringify(growthPoints));
    }
  }, [growthPoints]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gentle_garden_water_reserve", JSON.stringify(waterReserve));
    }
  }, [waterReserve]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gentle_garden_daily_items", JSON.stringify(dailyItemsCount));
    }
  }, [dailyItemsCount]);

  useEffect(() => {
    if (gardenFeedback) {
      const timer = setTimeout(() => {
        setGardenFeedback(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [gardenFeedback]);

  // Point Calculation Handler: Quality-first Session-based growth engine with Daily Absorption Cap
  const processGardenReward = (childId: string, reps: number) => {
    const today = new Date().toISOString().split("T")[0];
    const dailyKey = `${childId}_${today}`;
    
    // 1. Determine quality item based on repetitions completed
    let itemName = "💧 Air Biasa";
    let itemPoints = 1;
    if (reps >= 7) {
      itemName = "☀️ Sinar Matahari";
      itemPoints = 3;
    } else if (reps >= 3) {
      itemName = "🧪 Pupuk Organik";
      itemPoints = 2;
    }

    const currentDailyCount = dailyItemsCount[dailyKey] || 0;
    
    let absorbed = false;
    let addedToGrowth = 0;
    let addedToReserve = 0;

    // 2. Limit plant absorption to exactly 3 items daily
    if (currentDailyCount < 3) {
      setGrowthPoints(prev => ({
        ...prev,
        [childId]: (prev[childId] || 0) + itemPoints
      }));
      setDailyItemsCount(prev => ({
        ...prev,
        [dailyKey]: currentDailyCount + 1
      }));
      absorbed = true;
      addedToGrowth = itemPoints;
    } else {
      // Offset excess items directly to the Water Reserve (Tandon Air)
      setWaterReserve(prev => ({
        ...prev,
        [childId]: (prev[childId] || 0) + itemPoints
      }));
      addedToReserve = itemPoints;
    }

    const result = {
      itemName,
      itemPoints,
      absorbed,
      addedToGrowth,
      addedToReserve,
      dailyCount: (currentDailyCount < 3 ? currentDailyCount + 1 : currentDailyCount)
    };
    
    setGardenFeedback(result);
    return result;
  };

  // --- MODAL EXECUTION VIEW CONTROLS ---
  const [isExecutionOpen, setIsExecutionOpen] = useState(false);
  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [currentModalRating, setCurrentModalRating] = useState<"ulangi" | "bagus" | "sempurna">("sempurna");

  const parseVerseRange = (verseStr: string) => {
    const cleaned = verseStr.replace(/Ayat/i, "").trim();
    if (cleaned.includes("-")) {
      const parts = cleaned.split("-");
      const from = parseInt(parts[0], 10) || 1;
      const to = parseInt(parts[1], 10) || from;
      return { from, to };
    } else {
      const from = parseInt(cleaned, 15) || 1;
      return { from, to: from };
    }
  };

  // Children data state track with premium loading state support
  const [childrenData, setChildrenData] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // User Profile & Role State for Dynamic Kunyah Greeting Generation
  const [userRole, setUserRole] = useState<'ayah' | 'bunda' | 'guru' | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gentle_user_role");
      return (saved === 'ayah' || saved === 'bunda' || saved === 'guru') ? saved : null;
    }
    return null;
  });

  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, string[]>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gentle_completed_stream_tasks");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    return {};
  });

  const [completedTaskDetails, setCompletedTaskDetails] = useState<Record<string, Array<{ id: string; reps: number; verseRange: string }>>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gentle_completed_stream_task_details");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    return {};
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gentle_completed_stream_tasks", JSON.stringify(completedTaskIds));
    }
  }, [completedTaskIds]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gentle_completed_stream_task_details", JSON.stringify(completedTaskDetails));
    }
  }, [completedTaskDetails]);

  const isTaskDone = (taskId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const key = `${activeChild?.id}_${today}`;
    const list = completedTaskIds[key] || [];
    return list.includes(taskId);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (userRole) {
        localStorage.setItem("gentle_user_role", userRole);
      } else {
        localStorage.removeItem("gentle_user_role");
      }
    }
  }, [userRole]);

  // Dynamic localization-friendly memoized computed variable to resolve Greeting name
  const computedGreetingName = useMemo(() => {
    if (userRole === 'guru') {
      return lang === 'ID' ? 'Ustadz/Ustadzah' : 'Teacher (Ustadz/ah)';
    }

    if (childrenData.length === 0) return "Ayah/Bunda";
    
    const oldestChildName = childrenData[0]?.name || "Anak";
    
    if (!userRole) {
      return `Keluarga ${oldestChildName}`;
    }
    
    const prefix = userRole === 'ayah' ? 'Abu' : 'Ummu';
    return `${prefix} ${oldestChildName}`;
  }, [childrenData, userRole, lang]);

  // Spaced Repetition State
  const nonDeletedChildren = childrenData.filter(c => !c.isDeleted);
  const [selectedRepChildId, setSelectedRepChildId] = useState<string>("");
  const activeChild = nonDeletedChildren.find(c => c.id === selectedRepChildId) || nonDeletedChildren[0];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wali_pending_task_queue");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as any[];
          setPendingQueue(parsed);
        } catch (e) {
          console.error("Gagal membaca antrean kepingan:", e);
        }
      } else {
        setPendingQueue([]);
      }
    }
  }, [activeChild?.id, showAddForm]);

  const handleLaunchGamificationPage = (surahName: string) => {
    if (soundSynth && soundSynth.playPop) soundSynth.playPop();
    if (!activeChild) return;
    
    // Find the task inside child's memorizationProfile to get the verse range & category
    const profile = activeChild.memorizationProfile;
    const ziyadahTask = profile?.ziyadah;
    const qaribList = profile?.qarib || [];
    const sabiqList = profile?.sabiq || [];
    
    const dailyInteractionStream = [
      ...(ziyadahTask ? [{ ...ziyadahTask, category: "ziyadah" as const }] : []),
      ...qaribList.map(t => ({ ...t, category: "qarib" as const })),
      ...sabiqList.map(t => ({ ...t, category: "sabiq" as const }))
    ];
    
    const task = dailyInteractionStream.find(t => t.surah === surahName);
    const verseRange = task ? task.verse : "Ayat 1-4";
    const category = task ? task.category : "ziyadah";
    
    let categoryUpper: "ZIYADAH" | "QARIB" | "SABIQU" = "ZIYADAH";
    if (category === "qarib") categoryUpper = "QARIB";
    if (category === "sabiq") categoryUpper = "SABIQU";

    if (onStartCustomSession) {
      onStartCustomSession(surahName, verseRange, activeChild, categoryUpper);
    } else if (onStartSession) {
      onStartSession(activeChild);
    }
  };

  const {
    historyMap,
    logDailyInteraction,
    generateAnalyticalSuggestions
  } = useMonthlyHafizReport(activeChild?.id);

  const todayStr = typeof window !== "undefined" ? (() => {
    const d = new Date();
    // Use local date conversion rather than ISO UTC string to make dates match correctly to the family timezone
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })() : "";
  const monthKey = todayStr ? todayStr.substring(0, 7) : "";
  const todayEntryForChild = activeChild && todayStr && monthKey ? (historyMap[monthKey] || []).find(
    (entry) => entry.date === todayStr && entry.childId === activeChild?.id
  ) : null;
  const currentStatus = todayEntryForChild?.status || null;
  const totalInteractionMinutes = todayEntryForChild ? todayEntryForChild.durationMinutes : 0;

  // Reactive quality time estimation calculated directly from completed stream tasks
  const reactiveTotalMinutes = useMemo(() => {
    if (!activeChild) return 0;
    const today = new Date().toISOString().split("T")[0];
    const completedKey = `${activeChild.id}_${today}`;
    const completedDetails = completedTaskDetails[completedKey] || [];
    
    let totalSec = 0;
    let completedCount = 0;
    
    completedDetails.forEach(item => {
      completedCount++;
      const range = parseVerseRange(item.verseRange);
      const verseCount = Math.max(1, range.to - range.from + 1);
      const secondsPerIteration = 15;
      totalSec += (verseCount * item.reps * secondsPerIteration);
    });
    
    if (completedCount === 0) return 0;
    
    const bondingBuffer = completedCount; 
    const estimatedMin = Math.round(totalSec / 60) + bondingBuffer;
    return Math.max(1, estimatedMin);
  }, [activeChild, completedTaskDetails]);

  const [sessionStatus, setSessionStatus] = useState<string>("");
  const [sessionMode, setSessionMode] = useState<string>(() => {
    if (typeof window !== "undefined" && activeChild) {
      return localStorage.getItem(`gentle_session_mode_${activeChild?.id}`) || "ziyadah";
    }
    return "ziyadah";
  });

  const [murojaahLog, setMurojaahLog] = useState<string>(() => {
    if (typeof window !== "undefined" && activeChild) {
      return localStorage.getItem(`gentle_murojaah_log_${activeChild?.id}`) || "";
    }
    return "";
  });

  useEffect(() => {
    setSessionStatus(currentStatus || "");
  }, [currentStatus]);

  useEffect(() => {
    if (activeChild) {
      setSessionMode(localStorage.getItem(`gentle_session_mode_${activeChild.id}`) || "ziyadah");
      setMurojaahLog(localStorage.getItem(`gentle_murojaah_log_${activeChild.id}`) || "");
    }
  }, [activeChild]);

  const [selectedPathOption, setSelectedPathOption] = useState<'A' | 'B' | null>(() => {
    if (typeof window !== "undefined" && activeChild) {
      const today = new Date().toISOString().split("T")[0];
      return localStorage.getItem(`gentle_path_option_${activeChild.id}_${today}`) as 'A' | 'B' | null;
    }
    return null;
  });

  // --- DETERMINISTIC ADAPTIVE PLAN ENGINE STATES & HANDLERS ---
  const [surahHistory, setSurahHistory] = useState<Record<string, any>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gentle_surah_history_all");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse local surah history:", e);
        }
      }
    }
    return {
      "said": [
        {
          name: "At-Tariq",
          current_verse_range: { from: 1, to: 5 },
          retention_score: 100,
          next_review_interval: 1,
          consecutive_stuck_days: 0
        },
        {
          name: "Al-A'laa",
          current_verse_range: { from: 1, to: 19 },
          retention_score: 95,
          next_review_interval: 5,
          consecutive_stuck_days: 0
        }
      ],
      "sumayyah": [
        {
          name: "An-Nas",
          current_verse_range: { from: 1, to: 6 },
          retention_score: 100,
          next_review_interval: 1,
          consecutive_stuck_days: 0
        }
      ]
    };
  });

  // Save surahHistory whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gentle_surah_history_all", JSON.stringify(surahHistory));
    }
  }, [surahHistory]);

  // Real-time Firestore snapshot synchronization listener (optimistic offline-friendly)
  useEffect(() => {
    if (!activeChild) return;

    const childId = activeChild.id;
    const childDocRef = doc(db, "children", childId);

    const unsubscribe = onSnapshot(childDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.memory_history) {
          const cloudHistoryList = Object.values(data.memory_history);
          setSurahHistory(prev => ({
            ...prev,
            [childId]: cloudHistoryList
          }));
        }
      }
    }, (error) => {
      console.warn("Real-time snapshot synchronization offline/or pending rule setup:", error.message);
    });

    return () => unsubscribe();
  }, [activeChild]);

  const [adaptSurahName, setAdaptSurahName] = useState<string>("At-Tariq");
  const [adaptRepetitionCount, setAdaptRepetitionCount] = useState<number>(5);
  const [adaptFrom, setAdaptFrom] = useState<number>(1);
  const [adaptTo, setAdaptTo] = useState<number>(5);
  const [adaptIsScheduled, setAdaptIsScheduled] = useState<boolean>(true);
  const [adaptMadeProgress, setAdaptMadeProgress] = useState<boolean>(true);
  const [adaptEvaluationResult, setAdaptEvaluationResult] = useState<string>("");

  // Keep inputs synced when active child or child list changes
  useEffect(() => {
    if (activeChild) {
      const list = surahHistory[activeChild.id] || [];
      if (list.length > 0) {
        const first = list[0];
        setAdaptSurahName(first.name);
        setAdaptFrom(first.current_verse_range?.from || 1);
        setAdaptTo(first.current_verse_range?.to || 5);
      } else {
        setAdaptSurahName("At-Tariq");
        setAdaptFrom(1);
        setAdaptTo(5);
      }
      setAdaptEvaluationResult("");
    }
  }, [activeChild]);

  const handleSelectSurahToAdapt = (name: string) => {
    setAdaptSurahName(name);
    const savedList = surahHistory[activeChild?.id || ''] || [];
    const found = savedList.find((s: any) => s.name === name);
    if (found) {
      setAdaptFrom(found.current_verse_range?.from || 1);
      setAdaptTo(found.current_verse_range?.to || 5);
    } else {
      const preset = JUZ_AMMA_PRESETS.find(p => p.name === name);
      setAdaptFrom(1);
      setAdaptTo(preset ? preset.verses : 5);
    }
    setAdaptEvaluationResult("");
  };

  const evaluateAdaptiveMetrics = (surahObject: any, dailyLogPayload: any) => {
    const updatedSurah = { ...surahObject };
    
    // CONDITION A: ACCELERATION PATH
    const isTargetOverridden = dailyLogPayload.from !== surahObject.current_verse_range.from || 
                               dailyLogPayload.to > surahObject.current_verse_range.to;
                               
    const triggerA = (dailyLogPayload.repetitionCount >= 9) || isTargetOverridden;

    // CONDITION B: STRUGGLING PATH
    const isSameRange = dailyLogPayload.from === surahObject.current_verse_range.from && 
                        dailyLogPayload.to === surahObject.current_verse_range.to;
    
    const triggerB = (dailyLogPayload.repetitionCount < 3 && dailyLogPayload.isScheduledTarget) || 
                      (isSameRange && !dailyLogPayload.madeProgress);

    if (triggerA) {
      updatedSurah.consecutive_stuck_days = 0;
      updatedSurah.retention_score = 100;
      updatedSurah.next_review_interval = Math.min(30, Math.round((updatedSurah.next_review_interval || 1) * 2.5));

      // Pointer Advance: subsequent chunk of same size
      const completedCount = dailyLogPayload.to - dailyLogPayload.from + 1;
      const nextFrom = dailyLogPayload.to + 1;
      const nextTo = nextFrom + completedCount - 1;
      
      updatedSurah.current_verse_range = {
        from: nextFrom,
        to: nextTo
      };
      
      return {
        updated: updatedSurah,
        logMessage: `🚀 AKSELERASI! Consecutive Stuck Days direset ke 0, Retention Score 100%, review diundur ke ${updatedSurah.next_review_interval} hari. Target berikutnya otomatis maju ke Ayat ${nextFrom}-${nextTo}!`
      };
    } else if (triggerB) {
      updatedSurah.consecutive_stuck_days = (updatedSurah.consecutive_stuck_days || 0) + 1;
      updatedSurah.retention_score = Math.max(0, (updatedSurah.retention_score ?? 100) - 20);
      updatedSurah.next_review_interval = Math.max(1, Math.round((updatedSurah.next_review_interval || 1) * 0.5));
      
      let msg = `⚠️ TERKENDALA! Consecutive Stuck Days bertambah menjadi ${updatedSurah.consecutive_stuck_days}, Retention Score turun ke ${updatedSurah.retention_score}%, review dipercepat dalam ${updatedSurah.next_review_interval} hari.`;
      
      if (updatedSurah.consecutive_stuck_days >= 2) {
        msg += ` background planner mengunci Ziyadah loop! Alur besok otomatis diputar untuk mengkokohkan fondasi ${activeChild?.name || 'anak'}.`;
      }
      
      return {
        updated: updatedSurah,
        logMessage: msg
      };
    } else {
      updatedSurah.consecutive_stuck_days = 0;
      updatedSurah.retention_score = Math.min(100, (updatedSurah.retention_score ?? 100) + 5);
      
      return {
        updated: updatedSurah,
        logMessage: `🌱 Stabil! Sesi diulang dengan baik (${dailyLogPayload.repetitionCount}x). Retention Score naik ke ${updatedSurah.retention_score}%.`
      };
    }
  };

  const handleSaveAdaptiveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChild) return;

    const childId = activeChild.id;
    const historyList = surahHistory[childId] ? [...surahHistory[childId]] : [];
    
    // Find or create surah in history
    let existingIndex = historyList.findIndex(
      (s: any) => s.name.toLowerCase().replace(/[\s\-\']/g, "") === adaptSurahName.toLowerCase().replace(/[\s\-\']/g, "")
    );
    
    let targetSurahObj;
    if (existingIndex !== -1) {
      targetSurahObj = historyList[existingIndex];
    } else {
      targetSurahObj = {
        name: adaptSurahName,
        current_verse_range: { from: Number(adaptFrom), to: Number(adaptTo) },
        retention_score: 100,
        next_review_interval: 1,
        consecutive_stuck_days: 0
      };
    }

    const payload = {
      surahName: adaptSurahName,
      from: Number(adaptFrom),
      to: Number(adaptTo),
      repetitionCount: Number(adaptRepetitionCount),
      isScheduledTarget: adaptIsScheduled,
      madeProgress: adaptMadeProgress
    };

    const result = evaluateAdaptiveMetrics(targetSurahObj, payload);
    
    if (existingIndex !== -1) {
      historyList[existingIndex] = result.updated;
    } else {
      historyList.push(result.updated);
    }

    setSurahHistory(prev => ({
      ...prev,
      [childId]: historyList
    }));

    setAdaptEvaluationResult(result.logMessage);

    // Automatically estimate session duration from verses and repetitions
    const activeVerseCount = Math.max(1, Number(adaptTo) - Number(adaptFrom) + 1);
    const computedMinutes = calculateEstimatedMinutes(activeVerseCount, Number(adaptRepetitionCount));
    logDailyInteraction("aktif", computedMinutes);

    // Overhauled garden reward interaction quality based processing
    if (activeChild) {
      processGardenReward(activeChild.id, Number(adaptRepetitionCount));
    }
    
    if (soundSynth) {
      if (payload.repetitionCount >= 9) {
        soundSynth.playSuccess();
      } else {
        soundSynth.playPop();
      }
    }
  };

  const handlePromoteQueueToActive = (item: any) => {
    if (!activeChild) return;
    if (soundSynth && soundSynth.playSuccess) {
      soundSynth.playSuccess();
    }

    const rangeLabel = `Ayat ${item.segmentIndex + 1}`;

    // 1. Add active ziyadah task for this child
    if (onAddTaskForChild) {
      onAddTaskForChild(
        activeChild.id,
        item.sourceName,
        rangeLabel,
        "ziyadah",
        "sempurna"
      );
    }

    // 2. Remove from pending queue in localStorage & state
    const saved = localStorage.getItem("wali_pending_task_queue");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as any[];
        const filtered = parsed.filter((q: any) => q.id !== item.id);
        localStorage.setItem("wali_pending_task_queue", JSON.stringify(filtered));
        setPendingQueue(filtered);
      } catch (e) {
        console.error(e);
      }
    }

    // 3. Optional rating or progress update
    if (onAddReviewItem) {
      onAddReviewItem(item.sourceName, rangeLabel);
    }
  };

  const handleRemoveQueueItem = (itemId: string) => {
    if (soundSynth && soundSynth.playPop) {
      soundSynth.playPop();
    }
    const saved = localStorage.getItem("wali_pending_task_queue");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as any[];
        const filtered = parsed.filter((q: any) => q.id !== itemId);
        localStorage.setItem("wali_pending_task_queue", JSON.stringify(filtered));
        setPendingQueue(filtered);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleExecuteSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChild || !selectedTask) return;

    const finalRating = currentModalRating;

    const childId = activeChild.id;
    const historyList = surahHistory[childId] ? [...surahHistory[childId]] : [];
    
    let existingIndex = historyList.findIndex(
      (s: any) => s.name.toLowerCase().replace(/[\s\-\']/g, "") === adaptSurahName.toLowerCase().replace(/[\s\-\']/g, "")
    );
    
    let targetSurahObj;
    if (existingIndex !== -1) {
      targetSurahObj = historyList[existingIndex];
    } else {
      targetSurahObj = {
        name: adaptSurahName,
        current_verse_range: { from: Number(adaptFrom), to: Number(adaptTo) },
        retention_score: 100,
        next_review_interval: 1,
        consecutive_stuck_days: 0
      };
    }

    const payload = {
      surahName: adaptSurahName,
      from: Number(adaptFrom),
      to: Number(adaptTo),
      repetitionCount: Number(adaptRepetitionCount),
      isScheduledTarget: adaptIsScheduled,
      madeProgress: finalRating !== "ulangi"
    };

    const result = evaluateAdaptiveMetrics(targetSurahObj, payload);
    
    if (existingIndex !== -1) {
      historyList[existingIndex] = result.updated;
    } else {
      historyList.push(result.updated);
    }

    setSurahHistory(prev => ({
      ...prev,
      [childId]: historyList
    }));

    setAdaptEvaluationResult(result.logMessage);

    // Automatically estimate session duration from verses and repetitions
    const activeVerseCount = Math.max(1, Number(adaptTo) - Number(adaptFrom) + 1);
    const computedMinutes = calculateEstimatedMinutes(activeVerseCount, Number(adaptRepetitionCount));
    logDailyInteraction("aktif", computedMinutes);

    // Register this task ID in our completed list for today
    const currentTodayStr = new Date().toISOString().split("T")[0];
    const completedKey = `${activeChild.id}_${currentTodayStr}`;
    setCompletedTaskIds((prev) => ({
      ...prev,
      [completedKey]: [...(prev[completedKey] || []), selectedTask.id]
    }));

    setCompletedTaskDetails((prev) => {
      const list = prev[completedKey] || [];
      if (list.some(item => item.id === selectedTask.id)) {
        return prev;
      }
      return {
        ...prev,
        [completedKey]: [
          ...list,
          {
            id: selectedTask.id,
            reps: Number(adaptRepetitionCount),
            verseRange: `${adaptFrom}-${adaptTo}`
          }
        ]
      };
    });

    syncSessionToFirebase(activeChild.id, adaptSurahName, {
      repetition_count: adaptRepetitionCount,
      from: Number(adaptFrom),
      to: Number(adaptTo),
      is_scheduled_target: adaptIsScheduled,
      made_progress: finalRating !== "ulangi",
      durationMinutes: computedMinutes
    }).then(({ logMessage }) => {
      console.log("Firebase sync successful:", logMessage);
    }).catch(err => {
      console.warn("Firebase sync offline / status pending:", err);
    });

    // Overhauled garden reward interaction quality based processing
    processGardenReward(activeChild.id, Number(adaptRepetitionCount));

    if (handleSessionRating && selectedTask.id) {
      handleSessionRating(selectedTask.id, finalRating);
    } else {
      handleGrade(selectedTask.id, selectedTask.verse, finalRating);
    }

    if (soundSynth) {
      if (adaptRepetitionCount >= 9) {
        soundSynth.playSuccess();
      } else {
        soundSynth.playPop();
      }
    }

    setIsExecutionOpen(false);
    setIsParentModalOpen(false);
    setSelectedTask(null);
  };

  useEffect(() => {
    if (activeChild) {
      const today = new Date().toISOString().split("T")[0];
      const saved = localStorage.getItem(`gentle_path_option_${activeChild.id}_${today}`);
      setSelectedPathOption(saved as 'A' | 'B' | null);
    }
  }, [activeChild]);

  const handleSelectPathOption = (option: 'A' | 'B') => {
    if (!activeChild) return;
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(`gentle_path_option_${activeChild.id}_${today}`, option);
    setSelectedPathOption(option);

    if (soundSynth && soundSynth.playSuccess) {
      soundSynth.playSuccess();
    }

    const currentDuration = totalInteractionMinutes || 15;
    logDailyInteraction("aktif", currentDuration);

    setChildrenData((prevList) => {
      const updatedList = prevList.map((c) => {
        if (c.id === activeChild.id) {
          const alreadyLoggedToday = !!todayEntryForChild;
          const newStreak = alreadyLoggedToday ? c.streak : (c.streak + 1);
          const newBooks = alreadyLoggedToday ? c.completedBooks : (c.completedBooks + 1);
          
          const updatedChild = {
            ...c,
            streak: newStreak,
            completedBooks: newBooks,
          };

          if (typeof window !== "undefined") {
            const cacheKey = "gentle_children_list";
            const savedStr = localStorage.getItem(cacheKey);
            if (savedStr) {
              try {
                const parsed = JSON.parse(savedStr) as ChildProfile[];
                const updatedParsed = parsed.map((item) => item.id === activeChild.id ? updatedChild : item);
                localStorage.setItem(cacheKey, JSON.stringify(updatedParsed));
              } catch (e) {
                console.error("Failed to backup child update to localStorage:", e);
              }
            }
          }
          return updatedChild;
        }
        return c;
      });
      return updatedList;
    });
  };

  const activateMicroZiyadah = () => {
    if (soundSynth && soundSynth.playSuccess) soundSynth.playSuccess();
    if (activeChild) {
      onStartSession(activeChild);
    }
  };

  const triggerSpacedRepetitionSync = (status: string) => {
    if (!activeChild) return;

    if (soundSynth && soundSynth.playSuccess) {
      soundSynth.playSuccess();
    }

    setChildrenData((prevList) => {
      const updatedList = prevList.map((c) => {
        if (c.id === activeChild.id) {
          const profile = c.memorizationProfile || { ziyadah: null, qarib: [], sabiq: [] };
          const sabiqList = profile.sabiq || [];

          // Spontan repetitions extend the next review interval date and retention score back to 100% capacity
          const updatedSabiq = sabiqList.map((task: any) => {
            let currentInterval = 86400000 * 7;
            if (task.nextReviewDate) {
              const parsedTime = new Date(task.nextReviewDate).getTime();
              if (!isNaN(parsedTime)) {
                currentInterval = parsedTime - Date.now();
              }
            }
            let extendedInterval = currentInterval * 2.5;
            if (isNaN(extendedInterval) || extendedInterval < 86400000 * 7) {
              extendedInterval = 86400000 * 7;
            } else if (extendedInterval > 86400000 * 365) {
              extendedInterval = 86400000 * 365; // Cap at 1 year
            }
            
            let nextReviewDate;
            try {
              nextReviewDate = new Date(Date.now() + extendedInterval).toISOString();
            } catch (err) {
              nextReviewDate = new Date(Date.now() + 86400000 * 7).toISOString();
            }

            return {
              ...task,
              nextReviewDate,
              grade: "sempurna",
              consecutiveDays: (task.consecutiveDays || 0) + 1,
              retentionScore: 100,
            };
          });

          const alreadyLoggedToday = !!todayEntryForChild;
          let newStreak = c.streak;
          let newBooks = c.completedBooks;

          if (status === "aktif") {
            newStreak = alreadyLoggedToday ? c.streak : (c.streak + 1);
            newBooks = alreadyLoggedToday ? c.completedBooks : (c.completedBooks + 1);
          } else {
            // Safe protection: maintain streak & lock freeze
            newStreak = c.streak;
          }

          const updatedChild = {
            ...c,
            streak: newStreak,
            completedBooks: newBooks,
            memorizationProfile: {
              ...profile,
              sabiq: updatedSabiq,
            }
          };

          if (typeof window !== "undefined") {
            const cacheKey = "gentle_children_list";
            const savedStr = localStorage.getItem(cacheKey);
            if (savedStr) {
              try {
                const parsed = JSON.parse(savedStr) as ChildProfile[];
                const updatedParsed = parsed.map((item) => item.id === activeChild.id ? updatedChild : item);
                localStorage.setItem(cacheKey, JSON.stringify(updatedParsed));
              } catch (e) {
                console.error("Failed to backup child update to localStorage:", e);
              }
            }
          }
          return updatedChild;
        }
        return c;
      });
      return updatedList;
    });
  };

  const getSystemGuidance = (mode: string) => {
    if (mode === "moody") {
      return lang === "EN" 
        ? "⚠️ Child is Moody: Ziyadah (new memorization) is locked. Focus on gentle play or spontaneous review to freeze & protect continuous streak."
        : "⚠️ Anak sedang Moody: Target Ziyadah (hafalan baru) dikunci. Fokus pada murojaah ringan/bebas untuk menjaga kehangatan & membekukan streak harian.";
    }
    if (mode === "safar") {
      return lang === "EN"
        ? "⚠️ Safar active: Streak protected of reset. Ziyadah is locked. Listening / spontaneous audio is recommended."
        : "⚠️ Status Safar aktif: Garansi streak aman dari hangus. Target Ziyadah dikunci sementara agar anak tidak terbebani di perjalanan.";
    }
    if (mode === "sibuk") {
      return lang === "EN"
        ? "⚠️ Parents Busy: Recommended to play autonomous looping background audio for passive absorption."
        : "⚠️ Orang Tua Sibuk: Disarankan memutar audio murojaah otomatis di latar belakang untuk stimulasi pasif mendalam.";
    }
    return lang === "EN"
      ? "🌱 Active Mode: Full curriculum stream open. Let's calibrate targets one by one."
      : "🌱 Mode Aktif: Aliran kurikulum terbuka penuh. Mari latih dan kalibrasi target satu per satu.";
  };

  const handleSessionModeChange = (nextMode: string) => {
    setSessionMode(nextMode);
    if (activeChild) {
      localStorage.setItem(`gentle_session_mode_${activeChild.id}`, nextMode);
    }
    
    if (nextMode === "ziyadah" || nextMode === "murajaah") {
      triggerSpacedRepetitionSync("aktif");
      const minutesToLog = totalInteractionMinutes === 0 ? 15 : totalInteractionMinutes;
      logDailyInteraction("aktif", minutesToLog);
    } else if (nextMode === "moody") {
      triggerSpacedRepetitionSync("moody");
      const minutesToLog = totalInteractionMinutes === 0 ? 15 : totalInteractionMinutes;
      logDailyInteraction("moody", minutesToLog);
    } else if (nextMode === "safar") {
      triggerSpacedRepetitionSync("moody");
      const minutesToLog = totalInteractionMinutes === 0 ? 15 : totalInteractionMinutes;
      logDailyInteraction("moody", minutesToLog);
    } else if (nextMode === "sibuk") {
      triggerSpacedRepetitionSync("sibuk");
      const minutesToLog = totalInteractionMinutes === 0 ? 15 : totalInteractionMinutes;
      logDailyInteraction("sibuk", minutesToLog);
    }
  };

  // State hooks for form target child assignment and spaced repetition category
  const [formChildId, setFormChildId] = useState<string>("");

  useEffect(() => {
    // Sync children data immediately without artificial delay to ensure blazing fast response times
    setChildrenData(childrenList);
    setLoading(false);
  }, [childrenList]);

  // Sync selected and form child IDs when nonDeletedChildren gets loaded
  useEffect(() => {
    if (nonDeletedChildren.length > 0 && !selectedRepChildId) {
      setSelectedRepChildId(nonDeletedChildren[0].id);
      setFormChildId(nonDeletedChildren[0].id);
    }
  }, [nonDeletedChildren, selectedRepChildId]);
  const [formCategory, setFormCategory] = useState<"ziyadah" | "qarib" | "sabiq">("ziyadah");
  const [addFormTab, setAddFormTab] = useState<"kilat" | "manual">("kilat");
  const [formInitialGrade, setFormInitialGrade] = useState<"ulangi" | "bagus" | "sempurna" | null>(null);
  const [formInitialConsecutiveDays, setFormInitialConsecutiveDays] = useState<number>(0);
  const [selectedPresetIds, setSelectedPresetIds] = useState<number[]>([]);

  // Inline Form States
  const [surahQuery, setSurahQuery] = useState("");
  const [selectedSurah, setSelectedSurah] = useState<SurahObj | null>(null);
  const [dariAyat, setDariAyat] = useState<number | "">(1);
  const [sampaiAyat, setSampaiAyat] = useState<number | "">(5);
  const [showDropdown, setShowDropdown] = useState(false);

  const isZiyadah = formCategory === "ziyadah";
  const isFormValid = addFormTab === "kilat"
    ? (selectedPresetIds.length > 0 && (isZiyadah || formInitialGrade !== null))
    : (!!selectedSurah && (isZiyadah || formInitialGrade !== null));

  // Cast metadata list safely
  const metadataList = (quranMetaData as any[]).filter(
    (s) => s && s.id !== 0 && s.id !== undefined
  ) as SurahObj[];

  // Filter surah list based on query input (id or name/alternateNames)
  const filteredSurahs = metadataList.filter((surah) => {
    const query = surahQuery.trim().toLowerCase();
    if (!query) return true;

    // Filter by exact match if numeric
    if (/^\d+$/.test(query)) {
      return surah.id.toString() === query;
    }

    const transMatch = surah.transliteration?.toLowerCase().includes(query);
    const altMatch = surah.alternateNames?.some((name) =>
      name.toLowerCase().includes(query)
    );
    const translationMatch = surah.translation?.toLowerCase().includes(query);
    const arabicMatch = surah.arabic?.includes(query);

    return transMatch || altMatch || translationMatch || arabicMatch;
  });

  // Handle onChange with smart shortcut parsing (e.g. 2:1-3)
  const handleQueryChange = (val: string) => {
    setSurahQuery(val);
    setShowDropdown(true);

    if (val.includes(":")) {
      const [surahPart, versesPart] = val.split(":");
      const trimmedSurahPart = surahPart.trim().toLowerCase();

      // Find matching surah
      const matched = metadataList.find((surah) => {
        if (/^\d+$/.test(trimmedSurahPart)) {
          return surah.id.toString() === trimmedSurahPart;
        }
        return (
          surah.transliteration?.toLowerCase().includes(trimmedSurahPart) ||
          surah.alternateNames?.some((name) => name.toLowerCase().includes(trimmedSurahPart))
        );
      });

      if (matched) {
        setSelectedSurah(matched);

        if (versesPart) {
          const trimmedVerses = versesPart.trim();
          const rangeMatch = trimmedVerses.match(/^(\d+)(?:-(\d+))?$/);
          if (rangeMatch) {
            const fromVal = parseInt(rangeMatch[1], 10);
            const toVal = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fromVal;

            const maxV = matched.verses;
            setDariAyat(Math.min(Math.max(1, fromVal), maxV));
            setSampaiAyat(Math.min(Math.max(1, toVal), maxV));
          }
        }
      }
    }
  };

  // Safe input handlers for range numbers
  const handleDariChange = (val: string) => {
    if (val === "") {
      setDariAyat("");
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    const limit = selectedSurah ? selectedSurah.verses : 286;
    setDariAyat(Math.min(Math.max(1, num), limit));
  };

  const handleSampaiChange = (val: string) => {
    if (val === "") {
      setSampaiAyat("");
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    const limit = selectedSurah ? selectedSurah.verses : 286;
    setSampaiAyat(Math.min(Math.max(1, num), limit));
  };

  // Safeguard: Clamp values if the new surah max verses is smaller
  useEffect(() => {
    if (selectedSurah) {
      const maxVerses = selectedSurah.verses;
      if (dariAyat !== "" && Number(dariAyat) > maxVerses) {
        setDariAyat(1);
      }
      if (sampaiAyat !== "" && Number(sampaiAyat) > maxVerses) {
        setSampaiAyat(maxVerses);
      }
    }
  }, [selectedSurah]);

  // Submit new task
  const handleSubmitTugas = (e: React.FormEvent) => {
    e.preventDefault();

    if (addFormTab === "kilat") {
      if (selectedPresetIds.length === 0) return;

      const newQueueItems: LocalQueueItem[] = [];

      for (const id of selectedPresetIds) {
        const surahObj = metadataList.find(m => m.id === id);
        if (!surahObj) continue;

        const verseRange = surahObj.verses === 1 ? "Ayat 1" : `Ayat 1-${surahObj.verses}`;

        // Trigger parent review item addition callback
        onAddReviewItem(surahObj.transliteration, verseRange);

        // Trigger child task addition callback
        if (onAddTaskForChild && formChildId) {
          onAddTaskForChild(
            formChildId,
            surahObj.transliteration,
            verseRange,
            formCategory,
            formInitialGrade || "sempurna",
            formInitialConsecutiveDays
          );
        }

        // Add to local queue list
        newQueueItems.push({
          id: "item_preset_" + id + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          surah: surahObj.transliteration,
          verse: verseRange,
          grade: formInitialGrade || "sempurna",
          nextReviewDate: new Date().toISOString()
        });
      }

      if (newQueueItems.length > 0) {
        const updated = [...queue, ...newQueueItems];
        setQueue(updated);
        localStorage.setItem("gentle_murojaah_queue", JSON.stringify(updated));
      }

      // Reset controls
      setSelectedPresetIds([]);
      setFormInitialGrade(null);
      setFormInitialConsecutiveDays(0);
      setShowAddForm(false);

      if (soundSynth) soundSynth.playSuccess();
      return;
    }

    if (!selectedSurah) return;

    const from = dariAyat === "" ? 1 : dariAyat;
    const to = sampaiAyat === "" ? selectedSurah.verses : sampaiAyat;

    const finalFrom = Math.min(from, to);
    const finalTo = Math.max(from, to);

    const verseRange = finalFrom === finalTo ? `Ayat ${finalFrom}` : `Ayat ${finalFrom}-${finalTo}`;
    
    // Trigger standard parent state callback
    onAddReviewItem(selectedSurah.transliteration, verseRange);

    // Trigger child-based Spaced Repetition callback
    if (onAddTaskForChild && formChildId) {
      onAddTaskForChild(
        formChildId, 
        selectedSurah.transliteration, 
        verseRange, 
        formCategory,
        formInitialGrade || "sempurna",
        formInitialConsecutiveDays
      );
    }

    // Maintain local queue state
    const newItem: LocalQueueItem = {
      id: "item_" + Date.now(),
      surah: selectedSurah.transliteration,
      verse: verseRange,
      grade: formInitialGrade || "sempurna",
      nextReviewDate: new Date().toISOString(),
    };

    const updated = [...queue, newItem];
    setQueue(updated);
    localStorage.setItem("gentle_murojaah_queue", JSON.stringify(updated));

    // Reset controls
    setSurahQuery("");
    setSelectedSurah(null);
    setDariAyat(1);
    setSampaiAyat(5);
    setFormInitialGrade(null);
    setFormInitialConsecutiveDays(0);
    setShowAddForm(false);

    if (soundSynth) soundSynth.playSuccess();
  };

  // Quick preset instant adder (completely hassle-free!)
  const handleQuickAdd = (
    surahName: string, 
    range: string, 
    category: "ziyadah" | "qarib" | "sabiq", 
    grade: "ulangi" | "bagus" | "sempurna", 
    consecutive: number = 0
  ) => {
    if (soundSynth) soundSynth.playSuccess();

    onAddReviewItem(surahName, range);

    if (onAddTaskForChild && formChildId) {
      onAddTaskForChild(
        formChildId,
        surahName,
        range,
        category,
        grade,
        consecutive
      );
    }

    // Maintain local queue
    const newItem: LocalQueueItem = {
      id: "item_quick_" + Date.now(),
      surah: surahName,
      verse: range,
      grade: grade,
      nextReviewDate: new Date().toISOString(),
    };

    const updated = [...queue, newItem];
    setQueue(updated);
    localStorage.setItem("gentle_murojaah_queue", JSON.stringify(updated));

    setShowAddForm(false);
  };

  // Initialize and load queue & streak from localStorage on mount
  useEffect(() => {
    // Streak Loading
    const storedStreak = localStorage.getItem("gentle_daily_streak_count");
    if (storedStreak) {
      setStreakCount(parseInt(storedStreak, 10));
    }

    // Queue Loading
    const stored = localStorage.getItem("gentle_murojaah_queue");
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch (e) {
        initializeDefaultQueue();
      }
    } else {
      initializeDefaultQueue();
    }
  }, []);

  const initializeDefaultQueue = () => {
    const defaultItem: LocalQueueItem = {
      id: "default_1",
      surah: "Al-Ikhlas",
      verse: "Ayat 1",
      nextReviewDate: new Date().toISOString(),
    };
    setQueue([defaultItem]);
    localStorage.setItem("gentle_murojaah_queue", JSON.stringify([defaultItem]));
  };

  const handleStreakUpdate = () => {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const lastDate = localStorage.getItem("gentle_last_completed_date");
    const currentStreakStr = localStorage.getItem("gentle_daily_streak_count");
    let currentStreak = currentStreakStr ? parseInt(currentStreakStr, 10) : 0;

    if (!lastDate) {
      currentStreak = 1;
      localStorage.setItem("gentle_daily_streak_count", "1");
      localStorage.setItem("gentle_last_completed_date", todayStr);
    } else if (lastDate === todayStr) {
      // Already completed a session today, keep current streak
    } else {
      const lastDateTime = new Date(lastDate).getTime();
      const todayTime = new Date(todayStr).getTime();
      const diffDays = Math.round((todayTime - lastDateTime) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
      localStorage.setItem("gentle_daily_streak_count", currentStreak.toString());
      localStorage.setItem("gentle_last_completed_date", todayStr);
    }
    setStreakCount(currentStreak);
  };

  const handleGrade = (surahId: string, ayahNumber: string, grade: "ulangi" | "bagus" | "sempurna") => {
    if (soundSynth) {
      if (grade === "sempurna") {
        soundSynth.playSuccess();
      } else {
        soundSynth.playProgressUp();
      }
    }

    // Support bridging to parent state callbacks if applicable
    const matchedItem = queue.find(
      (item) => item.surah === surahId && item.verse === ayahNumber
    ) || queue.find(item => item.id === surahId);
    if (matchedItem) {
      onGradeVerse(matchedItem.id, grade);
    }

    // CFR system rules: ulangi = tomorrow, bagus = +3 days, sempurna = +7 days
    const nextDate = new Date();
    if (grade === "ulangi") {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (grade === "bagus") {
      nextDate.setDate(nextDate.getDate() + 3);
    } else if (grade === "sempurna") {
      nextDate.setDate(nextDate.getDate() + 7);
    }

    const updatedQueue = queue.map((item) => {
      const isMatch = (item.surah === surahId && item.verse === ayahNumber) || item.id === surahId;
      if (isMatch) {
        return {
          ...item,
          grade,
          nextReviewDate: nextDate.toISOString(),
        };
      }
      return item;
    });

    setQueue(updatedQueue);
    localStorage.setItem("gentle_murojaah_queue", JSON.stringify(updatedQueue));

    // Handle streak update on completion
    handleStreakUpdate();
  };

  const handleDeleteItemLocal = (id: string) => {
    onDeleteReviewItem(id);
    const updated = queue.filter(item => item.id !== id);
    setQueue(updated);
    localStorage.setItem("gentle_murojaah_queue", JSON.stringify(updated));
    if (soundSynth) soundSynth.playPop();
  };

  // Filter tasks out of today's queue view when nextReviewDate is in the future
  const getTodaysQueueItems = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return queue.filter((item) => {
      if (!item.nextReviewDate) return true;
      return new Date(item.nextReviewDate) <= today;
    });
  };

  const todaysItems = getTodaysQueueItems();

  const renderCategoryGroupCard = (tasks: any[], category: "ziyadah" | "qarib" | "sabiq", targetChild?: ChildProfile) => {
    const isZiyadah = category === "ziyadah";
    const isQarib = category === "qarib";
    const resolvedChild = targetChild || nonDeletedChildren.find(c => c.id === selectedRepChildId) || nonDeletedChildren[0];

    // Header values
    let groupIcon = <BookOpen className="w-4 h-4 text-slate-500" />;
    let categoryLabelEn = "";
    let categoryLabelId = "";
    let subLabelEn = "";
    let subLabelId = "";

    if (isZiyadah) {
      groupIcon = <Sparkles className="w-4 h-4 text-amber-500" />;
      categoryLabelEn = "Today's Ziyadah";
      categoryLabelId = "Ziyadah Hari Ini";
      subLabelEn = "New Memorization";
      subLabelId = "Hafalan Baru";
    } else if (isQarib) {
      groupIcon = <Flame className="w-4 h-4 text-orange-500" />;
      categoryLabelEn = "Qarib (Near)";
      categoryLabelId = "Qarib (Dekat)";
      subLabelEn = "Daily Reviews";
      subLabelId = "Ulasan Ulang Harian";
    } else {
      groupIcon = <BookOpen className="w-4 h-4 text-emerald-500" />;
      categoryLabelEn = "Sabiq (Review)";
      categoryLabelId = "Sabiq (Review)";
      subLabelEn = "Retention Tasks";
      subLabelId = "Kondisi Pengokohan";
    }

    const headerCategoryLabel = lang === 'ID' ? categoryLabelId : categoryLabelEn;
    const headerSubLabel = lang === 'ID' ? subLabelId : subLabelEn;

    // Filter out null/undefined tasks
    const activeTasks = tasks.filter(Boolean);

    return (
      <div className="w-full bg-white rounded-3xl border border-slate-100/90 shadow-sm p-4 flex flex-col text-left">
        {/* Card Header Area - Rendered Only ONCE per Category */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-2">
          <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center text-xs shrink-0">
            {groupIcon}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase leading-none">
              {headerCategoryLabel}
            </span>
            <h2 className="text-xs font-bold text-slate-700 mt-1 leading-none">
              {headerSubLabel}
            </h2>
          </div>
        </div>

        {/* Sub-rows Container - Dynamic Looping inside the Card */}
        {activeTasks.length > 0 ? (
          <div className="flex flex-col divide-y divide-slate-50">
            {activeTasks.map((task, index) => {
              const currentGrade = task.grade;
              return (
                <div 
                  key={`${category}_${task.id || index}_${index}`} 
                  onClick={() => {
                    if (soundSynth) soundSynth.playPop();
                    setSelectedTask(task);
                    setAdaptSurahName(task.surah);
                    
                    const range = parseVerseRange(task.verse);
                    setAdaptFrom(range.from);
                    setAdaptTo(range.to);
                    
                    setCurrentModalRating(task.grade || "sempurna");
                    setAdaptRepetitionCount(5);
                    setIsExecutionOpen(true);
                  }}
                  className="flex items-center justify-between w-full py-2.5 px-2 hover:bg-slate-50/70 transition-colors rounded-2xl cursor-pointer gap-2"
                >
                  
                  {/* Left Side: Verse Identification */}
                  <div className="flex flex-col min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-800 tracking-tight leading-none">{task.surah}</span>
                      {category === "qarib" && (
                        <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100/70 leading-none">
                          🔥 {task.consecutiveDays || 0}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold mt-1 leading-none">{task.verse}</span>
                  </div>

                  {/* Right Side: Completed status checkmark vs Chevron and trash option */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {currentGrade ? (
                      <div className="flex items-center gap-1.5 bg-emerald-50 text-[#48C78E] border border-emerald-100/60 rounded-xl px-2.5 py-1 text-[9px] font-black uppercase tracking-wider">
                        <Check className="w-3 h-3" />
                        <span>
                          {currentGrade === "sempurna" ? (lang === "EN" ? "Mutqin" : "Mutqin") : (currentGrade === "bagus" ? "Bagus" : "Ulangi")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[9px] font-black text-slate-400 border border-slate-205 py-1 px-2.5 rounded-xl flex items-center gap-1 bg-white hover:bg-slate-50/70">
                        {lang === "EN" ? "Calibrate" : "Evaluasi"} ➔
                      </span>
                    )}

                    {/* Delete Action option */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (soundSynth) soundSynth.playPop();
                        if (onDeleteTaskForChild && resolvedChild) {
                          onDeleteTaskForChild(resolvedChild.id, task.id);
                        }
                      }}
                      className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-500 flex items-center justify-center cursor-pointer active:scale-95 transition-all border border-red-100/10"
                      title={lang === "EN" ? "Delete Task" : "Hapus Target"}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* EMPTY CATEGORY VIEW */
          <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-dashed border-[#EBE6D9] text-center shadow-xs">
            <p className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-widest leading-none">
              {category === "ziyadah" 
                ? (lang === "EN" ? "No Target Added ✨" : "Hafalan Baru Selesai ✨")
                : category === "qarib"
                  ? (lang === "EN" ? "All Daily Reviews Met 🌾" : "Ulasan Qarib Beres 🌾")
                  : (lang === "EN" ? "All Rotations Complete 📦" : "Ulasan Sabiq Selesai 📦")
              }
            </p>
          </div>
        )}
      </div>
    );
  };

  const getGreetingName = () => {
    if (user && user.displayName) {
      return user.displayName.split(" ")[0];
    }
    return lang === "EN" ? "Parents" : "Ayah/Bunda";
  };

  const headerLabels = {
    ID: { welcome: `Ahlan, ${getGreetingName()}! 👋`, sub: "Mode Wali Tahfiz", status: "● Aktif", streak: "Hari" },
    EN: { welcome: `Welcome, ${getGreetingName()}! 👋`, sub: "Wali Tahfiz Mode", status: "● Active", streak: "Day" }
  };

  const checkChildPendingTasks = (child: ChildProfile) => {
    if (!child.memorizationProfile) return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // Check if task is pending today
    const isTaskPending = (task: any) => {
      if (!task) return false;
      if (task.nextReviewDate) {
        if (new Date(task.nextReviewDate) > today) {
          return false;
        }
      }
      return !task.grade || task.grade === "ulangi";
    };

    const tasks = [
      child.memorizationProfile.ziyadah,
      ...(child.memorizationProfile.qarib || []),
      ...(child.memorizationProfile.sabiq || [])
    ].filter(Boolean);

    return tasks.some(isTaskPending);
  };

  return (
    <div className="w-full h-full flex-1 flex flex-col overflow-hidden text-[#3F4E4F] bg-[#FAF8F5] font-sans">
      
      {/* Scroll Container */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-48">
        
        {/* 1. Header Area (Clean & Warm) */}
        {!loading && (
          <div className="flex flex-col gap-4 text-left">
            {/* Greeting & Action Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                  Ahlan, Ayah/Bunda 👋
                </h2>
                <span className="bg-orange-50 text-orange-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight shadow-3xs border border-orange-100/50 flex items-center gap-1 select-none">
                  🔥 Streak Aman
                </span>
              </div>
              
              {/* Top-Right Action Controls (Clean Integration) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {nonDeletedChildren.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (soundSynth) soundSynth.playPop();
                      setDashboardTab(dashboardTab === "dasbor" ? "laporan" : "dasbor");
                    }}
                    className={`border px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-tight transition-all uppercase flex items-center gap-1 shadow-3xs cursor-pointer select-none ${
                      dashboardTab === "laporan"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-150"
                        : "bg-white border-slate-200 text-slate-700 hover:text-slate-900"
                    }`}
                  >
                    {dashboardTab === "dasbor" ? "🏆 Laporan" : "📋 Tugas"}
                  </button>
                )}

                {/* Hide language switcher to focus on Indonesian
                {setLang && (
                  <button
                    type="button"
                    onClick={() => setLang(lang === "ID" ? "EN" : "ID")}
                    className="bg-white border border-slate-200 px-2.5 py-1.5 rounded-full text-[9px] font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider flex items-center gap-0.5"
                  >
                    {lang === "ID" ? "EN" : "ID"} 🌐
                  </button>
                )}
                */}
              </div>
            </div>

            {/* Profile Selector */}
            {nonDeletedChildren.length > 0 && (
              <div className="flex flex-col gap-2 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Pilih Profil Anak:
                </span>
                <div className="flex items-center gap-3 overflow-x-auto py-1 no-scrollbar">
                  {nonDeletedChildren.map((child) => {
                    const isActive = selectedRepChildId === child.id;
                    let avatarEmoji = child.avatar || "👦";
                    if (child.name.toLowerCase().includes("said")) {
                      avatarEmoji = "🌈";
                    } else if (child.name.toLowerCase().includes("sumayyaah") || child.name.toLowerCase().includes("sumayyah")) {
                      avatarEmoji = "🎈";
                    }
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => {
                          if (soundSynth) soundSynth.playPop();
                          setSelectedRepChildId(child.id);
                          setFormChildId(child.id);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer ${
                          isActive 
                            ? "bg-white border-2 border-emerald-500 text-emerald-800 font-extrabold shadow-sm ring-2 ring-emerald-500/10" 
                            : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100/50"
                        }`}
                      >
                        <span className="text-base select-none">{avatarEmoji}</span>
                        <span className="text-xs font-black tracking-tight leading-none">{child.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Guest sign in nudge if not signed in & not dismissed */}
        {!user && !loading && !dismissedGuestNudge && (
          <div className="w-full mt-3 bg-emerald-50/90 border border-emerald-150/40 rounded-2xl p-3 flex items-center justify-between gap-3 text-left transition-all relative animate-fade-in shadow-3xs">
            <button 
              onClick={() => {
                if (soundSynth) soundSynth.playSuccess();
                localStorage.removeItem("wali_session_guest");
                window.location.reload();
              }} 
              className="flex-1 flex items-center gap-2.5 cursor-pointer text-left"
            >
              <span className="text-sm">☁️</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                  Mode Tamu (Lokal) <span className="text-[8px] bg-emerald-100 text-emerald-850 px-1.5 py-0.5 rounded font-black uppercase">Masuk ➔</span>
                </span>
                <p className="text-[9.5px] text-emerald-600 font-medium leading-tight mt-0.5">
                  Sinkronkan hafalan otomatis lintas perangkat dengan masuk Google.
                </p>
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (soundSynth) soundSynth.playPop();
                localStorage.setItem("dismiss_guest_nudge", "true");
                setDismissedGuestNudge(true);
              }}
              className="text-emerald-700/60 hover:text-emerald-900 p-2 cursor-pointer font-bold leading-none text-xs border border-emerald-200/40 rounded-full hover:bg-emerald-100/50 transition-all select-none"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="space-y-4 mt-6">
            <div className="w-full h-32 bg-slate-50 border border-slate-100 rounded-3xl animate-pulse" />
            <div className="w-full h-48 bg-slate-50 border border-slate-100 rounded-3xl animate-pulse" />
          </div>
        )}

        {/* EMPTY CHILDREN STATE */}
        {!loading && nonDeletedChildren.length === 0 && (
          <div className="w-full bg-white rounded-3xl border border-slate-100 p-8 text-center flex flex-col items-center justify-center gap-4 py-12 animate-fade-in mt-6 shadow-sm">
            <span className="text-4xl animate-bounce">🌱</span>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Belum Ada Profil Anak</h3>
              <p className="text-[11px] text-slate-400 font-medium max-w-[240px] mx-auto leading-relaxed">
                Dasbor hafalan masih kosong. Yuk, tambahkan profil buah hati Anda terlebih dahulu untuk mulai memantau perkembangan tahfiz mereka!
              </p>
            </div>
            <button 
              type="button"
              onClick={() => {
                if (soundSynth) soundSynth.playSuccess();
                if (onNavigateToSettings) onNavigateToSettings(true);
              }}
              className="mt-2 bg-[#48C78E] hover:bg-[#3ebe82] text-white font-black text-[10px] uppercase tracking-widest py-2.5 px-5 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              ➕ Tambah Profil Anak
            </button>
          </div>
        )}

        {/* LAPORAN TAB VIEW */}
        {!loading && nonDeletedChildren.length > 0 && dashboardTab === "laporan" && (
          <div className="mt-4">
            <HafizReportScreen
              activeChild={activeChild}
              lang={lang}
              soundSynth={soundSynth}
              onNavigateToSettings={() => onNavigateToSettings && onNavigateToSettings(true)}
            />
          </div>
        )}

        {/* DASBOR TAB VIEW */}
        {!loading && nonDeletedChildren.length > 0 && dashboardTab === "dasbor" && activeChild && (
          <div className="flex flex-col mt-4">
            
            {/* 2. Child Status & Mood Controller */}
            <div className="flex flex-col gap-2.5 text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Kondisi & Mood Harian Buah Hati
              </span>
              <div className="relative grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl">
                {[
                  { val: "ziyadah", label: "Aktif 🌱" },
                  { val: "moody", label: "Moody 🧸" },
                  { val: "safar", label: "Safar 🚗" },
                  { val: "sibuk", label: "Sibuk 💼" }
                ].map((opt) => {
                  const isSelected = (sessionMode || "ziyadah") === opt.val;
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => {
                        if (soundSynth) soundSynth.playPop();
                        handleSessionModeChange(opt.val);
                      }}
                      className="relative py-2.5 text-[11px] font-bold tracking-tight rounded-lg transition-all cursor-pointer text-center flex items-center justify-center min-h-[36px]"
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="ios-active-pill"
                          className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-250/20"
                          style={{ originY: "0px" }}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 ${isSelected ? "text-slate-800 font-extrabold" : "text-slate-400 font-medium"}`}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Bento Grid Dashboard (Daily Metrics) */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              {/* Card 1: Durasi Belajar */}
              <div className="bg-emerald-50 p-4 rounded-2xl flex flex-col justify-between text-left min-h-[100px] border-none shadow-3xs">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                  ⏱️ Durasi Belajar
                </span>
                <div>
                  <span className="text-2xl font-black text-emerald-900 leading-none">
                    {reactiveTotalMinutes}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 ml-1 uppercase">
                    Menit
                  </span>
                </div>
              </div>

              {/* Card 2: Poin Kebun */}
              <div className="bg-amber-50 p-4 rounded-2xl flex flex-col justify-between text-left min-h-[100px] border-none shadow-3xs">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                  🌳 Poin Kebun
                </span>
                <div>
                  <span className="text-2xl font-black text-amber-900 leading-none">
                    {growthPoints[activeChild?.id || ""] || 5}
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 ml-1 uppercase">
                    Poin
                  </span>
                </div>
              </div>
            </div>

            {/* Removed Smart Recommendation Card as requested to declutter visuals */}

            {/* 5. Task Management List (Manajemen Hafalan) */}
            <section className="mt-8 flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <div className="text-left">
                  <h3 className="text-xs font-black tracking-wider uppercase text-slate-400">
                    Manajemen Hafalan
                  </h3>
                  <p className="text-sm font-black text-slate-800 tracking-tight mt-0.5">
                    Target Hari Ini
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    if (soundSynth) soundSynth.playPop();
                  }}
                  className="bg-white border border-slate-200 text-slate-705 hover:bg-slate-50 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-3xs cursor-pointer transition-all"
                >
                  <span className="text-emerald-500 font-extrabold">+</span>
                  <span>Tugas Baru</span>
                </button>
              </div>

              {/* Add Task PWA Form */}
              <AnimatePresence>
                {showAddForm && (
                  <SmartAddTaskForm 
                    activeChild={activeChild}
                    soundSynth={soundSynth}
                    lang={lang}
                    onClose={() => setShowAddForm(false)}
                    onAddTaskForChild={onAddTaskForChild}
                    onAddTaskDone={(name, detail, isDoa) => {
                      if (onAddReviewItem) {
                        onAddReviewItem(name, detail);
                      }
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Verified Tasks Rendering Stream */}
              {(() => {
                const child = activeChild;
                const profile = child.memorizationProfile;
                const ziyadahTask = profile?.ziyadah;
                const qaribList = profile?.qarib || [];
                const sabiqList = profile?.sabiq || [];

                const dailyInteractionStream = [
                  ...(ziyadahTask ? [{ ...ziyadahTask, category: "ziyadah" as const, isDone: isTaskDone(ziyadahTask.id) }] : []),
                  ...qaribList.map(t => ({ ...t, category: "qarib" as const, isDone: isTaskDone(t.id) })),
                  ...sabiqList.map(t => ({ ...t, category: "sabiq" as const, isDone: isTaskDone(t.id) }))
                ];

                let streamToRender = dailyInteractionStream;
                if (sessionMode === "murajaah") {
                  streamToRender = dailyInteractionStream.filter(t => t.category === "qarib" || t.category === "sabiq");
                }

                // If moody or busy, render quiet message as required instead of list
                if (sessionMode === 'moody') {
                  return (
                    <div className="bg-amber-50/40 p-5 rounded-3xl border border-dashed border-amber-200/45 text-center text-[#5F370E] font-medium leading-relaxed text-xs">
                      🧸 Hubungan emosional yang hangat jauh lebih utama dari target setoran. Ambil jeda, ajak balita Anda bermain siram-siram visual 'Taman Buah' di bawah untuk membangun asosiasi positif yang gembira!
                    </div>
                  );
                }

                if (sessionMode === 'sibuk') {
                  return (
                    <div className="bg-blue-50/50 p-5 rounded-3xl border border-dashed border-blue-200/45 text-center text-slate-650 font-medium leading-relaxed text-xs">
                      💼 Murojaah audio otomatis aktif di latar belakang agar si kecil tetap terstimulasi hangat tanpa pendampingan ketat.
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-3 w-full">
                    {streamToRender.length > 0 ? (
                      streamToRender.map((task, idx) => {
                        const isCompleted = task.isDone;
                        const currentGrade = task.grade;

                        // Soft pastel tags
                        let tagBg = "bg-emerald-50 text-emerald-800";
                        let tagLabel = "ZIYADAH";
                        if (task.category === "qarib") {
                          tagBg = "bg-amber-100/80 text-amber-800";
                          tagLabel = "QARIB";
                        } else if (task.category === "sabiq") {
                          tagBg = "bg-blue-100/80 text-blue-800";
                          tagLabel = "SABIQ";
                        }

                        return (
                          <div
                            key={`${task.category}_${task.id || idx}_${idx}`}
                            className="flex items-center justify-between w-full p-4 bg-white border border-slate-100/60 rounded-2xl shadow-sm transition-all gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-black tracking-wider px-2.5 py-0.5 rounded-full uppercase leading-none ${tagBg}`}>
                                    {tagLabel}
                                  </span>
                                </div>
                                <span className="text-sm font-black text-slate-800 tracking-tight leading-none mt-1.5">
                                  {task.surah}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold leading-none mt-1">
                                  {task.verse}
                                </span>
                              </div>
                            </div>

                            {/* Action Checkmarks / Button */}
                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {isCompleted ? (
                                <div className="flex items-center gap-1.5 bg-emerald-50 text-[#48C78E] border border-emerald-100/60 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>{currentGrade === "sempurna" ? "Mutqin" : currentGrade === "bagus" ? "Bagus" : "Selesai"}</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (soundSynth) soundSynth.playPop();
                                    setSelectedTask(task);
                                    setAdaptSurahName(task.surah);
                                    const range = parseVerseRange(task.verse);
                                    setAdaptFrom(range.from);
                                    setAdaptTo(range.to);
                                    setCurrentModalRating(task.grade || "sempurna");
                                    setAdaptRepetitionCount(5);
                                    setIsParentModalOpen(true);
                                  }}
                                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full px-4 py-2 transition-all text-xs font-bold leading-none cursor-pointer"
                                >
                                  Evaluasi ➔
                                </button>
                              )}

                              {/* Subtle Vertical Ellipsis replaces trash can */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (soundSynth) soundSynth.playPop();
                                  if (onDeleteTaskForChild) {
                                    onDeleteTaskForChild(child.id, task.id);
                                  }
                                }}
                                className="w-8 h-8 rounded-full hover:bg-slate-50 text-slate-300 hover:text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                                title="Hapus Target"
                              >
                                <span className="text-lg leading-none font-black select-none">⋮</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-[#FAF8F5] rounded-3xl p-6 border border-dashed border-[#EBE6D9] text-center shadow-3xs">
                        <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wide">
                          Semua Target Selesai ✨
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Slicing Queue Management Sub-section */}
              {activeChild && (
                (() => {
                  const activeChildQueue = pendingQueue.filter(item => item.childId === activeChild.id);
                  if (activeChildQueue.length === 0) return null;
                  
                  return (
                    <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-3">
                      <div className="text-left select-none">
                        <h4 className="text-[10px] font-black tracking-wider uppercase text-emerald-600 flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-0.8 rounded-md w-fit">
                          📥 Antrean Belajar Slicing ({activeChildQueue.length})
                        </h4>
                        <p className="text-[10px] text-slate-400 font-extrabold mt-1">
                          Kepingan ayat hasil potong (slicing) siap untuk dipromosikan jadi target aktif balita.
                        </p>
                      </div>

                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {activeChildQueue.map((item, idx) => (
                          <div
                            key={`pending-q-${item.id}-${idx}`}
                            className="flex items-center justify-between p-4 bg-emerald-50/15 border border-emerald-100/40 rounded-2xl shadow-4xs gap-3 transition-all hover:bg-emerald-50/25"
                          >
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-800">
                                  {item.sourceName}
                                </span>
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100/60 px-2 py-0.5 rounded-sm">
                                  Ayat {item.segmentIndex + 1}
                                </span>
                              </div>
                              
                              {/* Pure traditional Arabic segment text without latin transliteration */}
                              {item.segmentText && (
                                <p className="text-right font-arabic text-md md:text-lg text-slate-700 font-normal leading-relaxed mt-2 direction-rtl select-none">
                                  {item.segmentText}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Direct promotion execution handle */}
                              <button
                                type="button"
                                onClick={() => handlePromoteQueueToActive(item)}
                                className="px-3.5 py-1.8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 transition-all cursor-pointer text-[10px] font-black uppercase tracking-wider shadow-5xs active:scale-95 duration-150 border-none"
                                title="Mulai evaluasi potongan ini sekarang!"
                              >
                                <span>Evaluasi</span>
                                <span>➔</span>
                              </button>

                              {/* Simple removal trigger */}
                              <button
                                type="button"
                                onClick={() => handleRemoveQueueItem(item.id)}
                                className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-all cursor-pointer border-none"
                                title="Hapus Kepingan"
                              >
                                <span className="text-sm font-black">✕</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              )}
            </section>

            {/* 6. Gamification Summary (COMPACTED) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs text-left mt-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-black text-slate-800 tracking-tight uppercase">
                  🌳 Taman {activeChild?.name || "Said"}: Bibit Rambutan
                </h4>
                <span className="text-[10px] font-black text-emerald-650 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {(growthPoints[activeChild?.id || ""] || 5)}/20 Poin
                </span>
              </div>
              
              {/* Horizontal Progress Bar */}
              <div className="w-full bg-emerald-100/70 h-2 rounded-full overflow-hidden mb-2">
                <div 
                  className="bg-[#48C78E] h-full rounded-full transition-all duration-350" 
                  style={{ width: `${Math.min(100, (((growthPoints[activeChild?.id || ""] || 5) / 20) * 100))}%` }}
                />
              </div>

              <p className="text-[11px] font-semibold text-[#A39E93]">
                Konsistensi hafalan berjalan baik.
              </p>
            </div>

          </div>
        )}

      </div>

      {/* 7. Primary Action (Floating Sesi Anak - Redesigned as dynamic centered capsule FAB) */}
      {!loading && activeChild && dashboardTab === "dasbor" && (
        <div className="fixed bottom-24 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <button
            type="button"
            onClick={() => {
              if (soundSynth) soundSynth.playSuccess();
              onStartSession(activeChild);
            }}
            className="pointer-events-auto bg-gradient-to-r from-[#48C78E] to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-xs uppercase tracking-widest py-3 px-6 rounded-full flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 active:scale-95 hover:scale-[1.03] transition-all cursor-pointer border border-[#52db9a]/40 animate-bounce-gentle"
          >
            <span>🚀</span>
            <span>Mulai Sesi {activeChild.name} ➔</span>
          </button>
        </div>
      )}

      {/* FULL-SCREEN ADAPTIVE PLAN MODAL EXECUTION VIEW */}
      <AnimatePresence>
        {(isExecutionOpen || isParentModalOpen) && selectedTask && (() => {
          const surahPreset = JUZ_AMMA_PRESETS.find(
            p => p.name.toLowerCase().replace(/[\s\-\']/g, "") === adaptSurahName.toLowerCase().replace(/[\s\-\']/g, "")
          );
          const maxVerses = Math.max(1, surahPreset ? surahPreset.verses : 100);
          const safeAdaptFrom = Math.min(Math.max(1, Number(adaptFrom) || 1), maxVerses);
          const safeAdaptTo = Math.min(Math.max(safeAdaptFrom, Number(adaptTo) || 1), maxVerses);
          return (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed inset-0 bg-[#FDFBF7] z-50 overflow-y-auto p-5 pb-12 flex flex-col text-left font-sans text-[#3A405A]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5 max-w-md mx-auto w-full">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black tracking-widest text-[#48C78E] uppercase leading-none">
                    🧠 DETERMINISTIC ADAPTIVE PLAN ENGINE
                  </span>
                  <h3 className="text-base font-black text-slate-800 tracking-tight mt-1.5 leading-snug">
                    Sesi Evaluasi {activeChild?.name}: {adaptSurahName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsExecutionOpen(false);
                    setIsParentModalOpen(false);
                    setSelectedTask(null);
                    if (soundSynth) soundSynth.playPop();
                  }}
                  className="w-8 h-8 rounded-full bg-white border border-slate-100/80 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 flex flex-col gap-5 max-w-md mx-auto w-full">
                {/* Target Description Card */}
                <div className="bg-emerald-50 border border-emerald-250/50 p-4 rounded-3xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📖</span>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-black text-slate-850">Surat {adaptSurahName}</span>
                      <span className="text-[10px] text-[#48C78E] font-black tracking-wider uppercase mt-0.5">
                        Target: Ayat {adaptFrom} - {adaptTo}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1. Performance rating selector / Grade */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Penilaian Kelancaran Sesi
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentModalRating("ulangi");
                        if (soundSynth) soundSynth.playPop();
                      }}
                      className={`py-3 px-3 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center font-black text-xs uppercase tracking-wider ${
                        currentModalRating === "ulangi"
                          ? "bg-rose-500 border-rose-500 text-white shadow-sm scale-[1.02]"
                          : "bg-white border-rose-200 text-rose-600 hover:bg-rose-50/50"
                      }`}
                    >
                      Ulangi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentModalRating("bagus");
                        if (soundSynth) soundSynth.playSuccess();
                      }}
                      className={`py-3 px-3 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center font-black text-xs uppercase tracking-wider ${
                        currentModalRating === "bagus"
                          ? "bg-amber-500 border-amber-500 text-white shadow-sm scale-[1.02]"
                          : "bg-white border-amber-200 text-amber-600 hover:bg-amber-50/50"
                      }`}
                    >
                      Bagus
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentModalRating("sempurna");
                        if (soundSynth) soundSynth.playSuccess();
                      }}
                      className={`py-3 px-3 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center font-black text-xs uppercase tracking-wider ${
                        currentModalRating === "sempurna"
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-sm scale-[1.02]"
                          : "bg-white border-emerald-250 text-emerald-600 hover:bg-emerald-50/50"
                      }`}
                    >
                      Mutqin
                    </button>
                  </div>
                </div>

                {/* 2. Verse adjustment range inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Dari Ayat
                    </label>
                    <select
                      value={safeAdaptFrom}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAdaptFrom(val);
                        if (adaptTo < val) {
                          setAdaptTo(val);
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-xs font-black text-slate-700 outline-none focus:border-[#48C78E] cursor-pointer"
                    >
                      {Array.from({ length: maxVerses }, (_, i) => i + 1).map((v) => (
                        <option key={v} value={v}>
                          Ayat {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Sampai Ayat
                    </label>
                    <select
                      value={safeAdaptTo}
                      onChange={(e) => setAdaptTo(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-xs font-black text-slate-700 outline-none focus:border-[#48C78E] cursor-pointer"
                    >
                      {Array.from({ length: maxVerses - safeAdaptFrom + 1 }, (_, i) => i + safeAdaptFrom).map((v) => (
                        <option key={v} value={v}>
                          Ayat {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Sesi Repetisi (Jumlah Ulang) with slider and Presets keys */}
                <div className="bg-[#FAF8F5] border border-slate-200 p-4 rounded-3xl flex flex-col gap-3 text-left">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Jumlah Sesi Repetisi
                    </label>
                    <span className="text-xs font-black text-emerald-600 block bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      {adaptRepetitionCount}x Diulang
                    </span>
                  </div>


                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdaptRepetitionCount(2);
                      if (soundSynth) soundSynth.playPop();
                    }}
                    className={`py-2 px-1 rounded-xl border text-[9.5px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                      adaptRepetitionCount === 2
                        ? "bg-rose-50 border-rose-200 text-rose-700 font-extrabold"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    ⚠️ Stuck (2x)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdaptRepetitionCount(5);
                      if (soundSynth) soundSynth.playPop();
                    }}
                    className={`py-2 px-1 rounded-xl border text-[9.5px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                      adaptRepetitionCount === 5
                        ? "bg-slate-205 border-slate-300 text-slate-700 font-extrabold"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    🌱 Stabil (5x)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdaptRepetitionCount(10);
                      if (soundSynth) soundSynth.playSuccess();
                    }}
                    className={`py-2 px-1 rounded-xl border text-[9.5px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                      adaptRepetitionCount === 10
                        ? "bg-emerald-50 border-emerald-250 text-emerald-700 font-extrabold"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    🚀 Melejit (10x)
                  </button>
                </div>

                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={adaptRepetitionCount}
                  onChange={(e) => setAdaptRepetitionCount(Number(e.target.value))}
                  className="w-full accent-[#48C78E] bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* 4. Adaptive Parameter Toggles */}
              <div className="grid grid-cols-2 gap-4 text-left">
                <label className="flex items-center gap-2.5 bg-[#FAF8F5] p-3 rounded-2xl border border-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={adaptIsScheduled}
                    onChange={(e) => setAdaptIsScheduled(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#48C78E] focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black text-slate-700 leading-none">Target Terjadwal</span>
                    <span className="text-[8px] text-slate-400 mt-0.5 leading-none">Termasuk di agenda</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 bg-[#FAF8F5] p-3 rounded-2xl border border-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={adaptMadeProgress}
                    onChange={(e) => setAdaptMadeProgress(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#48C78E] focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black text-slate-700 leading-none">Anak Buat Progress</span>
                    <span className="text-[8px] text-slate-400 mt-0.5 leading-none">Hafalan makin lancar</span>
                  </div>
                </label>
              </div>

              {/* Adaptive Feedback Info banner */}
              {adaptEvaluationResult && (
                <div className="bg-[#1E1E2F] text-slate-100 p-3.5 rounded-2xl border-l-4 border-[#48C78E] animate-scale-up-gentle text-left shadow-sm">
                  <span className="text-[8px] font-black tracking-widest text-[#48C78E] uppercase mb-1 block">
                    HASIL PLAN ENGINE
                  </span>
                  <p className="text-[10.5px] font-bold leading-normal">{adaptEvaluationResult}</p>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsExecutionOpen(false);
                    setIsParentModalOpen(false);
                    setSelectedTask(null);
                  }}
                  className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 font-extrabold text-[11px] py-3.5 px-4 rounded-xl text-center cursor-pointer active:scale-[0.98] transition-all uppercase tracking-wider"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSave}
                  className="flex-1 bg-[#48C78E] hover:bg-[#3ebe82] text-white font-black text-[11px] py-3.5 px-4 rounded-xl text-center cursor-pointer active:scale-[0.98] transition-all uppercase tracking-wider shadow-md"
                >
                  📥 Analisis & Sinkron Model
                </button>
              </div>

            </div>
          </motion.div>
        );
      })()}
    </AnimatePresence>

      {/* Beautiful Garden Feedback Toast Overlay */}
      <AnimatePresence>
        {gardenFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 left-4 right-4 z-[999] max-w-sm mx-auto bg-white/95 backdrop-blur-md border border-emerald-100 shadow-2xl rounded-3xl p-4 flex flex-col gap-2 cursor-pointer text-left pointer-events-auto"
            onClick={() => setGardenFeedback(null)}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 shadow-inner ${
                gardenFeedback.absorbed ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
              }`}>
                {gardenFeedback.itemName.split(" ")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-black tracking-widest text-[#48C78E] uppercase block">
                  {gardenFeedback.absorbed ? "🌳 NUTRISI DIABSORPSI" : "💧 TANDON AIR BERTAMBAH"}
                </span>
                <h4 className="text-xs font-black text-slate-800 tracking-tight mt-0.5">
                  Mendapatkan {gardenFeedback.itemName}
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold leading-normal mt-1">
                  {gardenFeedback.absorbed 
                    ? `Alhamdulillah! Nutrisi diserap langsung oleh kebun (+${gardenFeedback.addedToGrowth} Poin).`
                    : `Sesi harian tercapai (maks 3x). ${gardenFeedback.itemName} disimpan di Tandon Cadangan (+${gardenFeedback.addedToReserve} Poin).`
                  }
                </p>
              </div>
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); setGardenFeedback(null); }}
                className="w-6 h-6 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 text-xs font-bold transition-all shrink-0"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
