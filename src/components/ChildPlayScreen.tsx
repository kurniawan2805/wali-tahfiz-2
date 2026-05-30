import { resolveQariAudioId, WALI_TAFHIDZ_QARI_REGISTRY } from "../hooks/useAyahPlayer";
import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Lock, Star, SkipForward } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import TikrarPhase from "./TikrarPhase";
import IntegrationPhase from "./IntegrationPhase";
import DirectMurojaahStage from "./DirectMurojaahStage";

// Table of ayah counts of Surah 1 to 114 for calculating global numbers

function getEveryAyahId(surah: number, ayah: number): string {
  const s = surah.toString().padStart(3, '0');
  const a = ayah.toString().padStart(3, '0');
  return `${s}${a}`;
}

const surahAyahCounts = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
  5, 4, 5, 6
];

// Resolves Qari endpoint IDs compatibly with system styles

// Maintain getArabicFontClasses export for compatibility with compile targets like DirectMurojaahStage
export const getArabicFontClasses = (size?: "small" | "medium" | "large" | "xlarge" | "huge") => {
  switch (size) {
    case "small":
      return {
        container: "text-2xl md:text-3xl leading-[1.8] md:leading-[2.1]",
        word: "text-2xl md:text-3xl"
      };
    case "medium":
      return {
        container: "text-3xl md:text-4xl leading-[1.9] md:leading-[2.2]",
        word: "text-3xl md:text-4xl"
      };
    case "xlarge":
      return {
        container: "text-4xl md:text-6xl leading-[2.1] md:leading-[2.4]",
        word: "text-4xl md:text-6xl"
      };
    case "huge":
      return {
        container: "text-5xl md:text-7xl leading-[2.2] md:leading-[2.5]",
        word: "text-5xl md:text-7xl"
      };
    case "large":
    default:
      return {
        container: "text-3xl md:text-5xl leading-[2.0] md:leading-[2.3]",
        word: "text-3xl md:text-5xl"
      };
  }
};

interface ChildPlayScreenProps {
  handleEndSession?: () => void;
  sessionAyahs?: any[];
  loopsPerAyah?: number;
  targetTikrarCount?: number;
  targetRabtCount?: number;
  taskCategory?: "ZIYADAH" | "QARIB" | "SABIQU";
  task?: any;
  handleSessionRating?: (taskId: string, rating: "ulangi" | "lulus") => Promise<void> | void;
  soundSynth?: any;
  childSessionQueue?: any[];
  currentQueueIndex?: number;
  screenTimeElapsed?: number;
  maxSessionDurationSeconds?: number;
  onNextQueueTask?: () => void;
  onAddTimeOverride?: () => void;
  [key: string]: any;
}

export default function ChildPlayScreen({
  handleEndSession,
  sessionAyahs = [],
  loopsPerAyah = 5,
  targetTikrarCount = 10,
  targetRabtCount = 3,
  taskCategory = "ZIYADAH",
  task,
  handleSessionRating,
  soundSynth,
  childSessionQueue = [],
  currentQueueIndex = 0,
  screenTimeElapsed = 0,
  maxSessionDurationSeconds = 900,
  onNextQueueTask,
  onAddTimeOverride,
  ...rest
}: ChildPlayScreenProps) {
  // Master visual state
  const [viewState, setViewState] = useState<"plan" | "favorites" | "completed">("plan");
  
  // Ziyadah active phase tracking
  const [ziyadahPhase, setZiyadahPhase] = useState<"talaqqi" | "tikrar" | "rabt">("talaqqi");
  const [currentAyahIndex, setCurrentAyahIndex] = useState<number>(0);
  const [activeRabtPlayingId, setActiveRabtPlayingId] = useState<string | null>(null);
  const [isPlayingRangeRabt, setIsPlayingRangeRabt] = useState(false);
  
  // Talaqqi Audio Loops Progress States
  const [loopsCompleted, setLoopsCompleted] = useState<number>(0);
  const loopsCompletedRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  const [timerProgress, setTimerProgress] = useState<number>(0); // 0 to 100 representing play indicator of active loop
  const [isChildTurn, setIsChildTurn] = useState<boolean>(false);

  const updateLoopsCompleted = (val: number) => {
    loopsCompletedRef.current = val;
    setLoopsCompleted(val);
  };

  const updateIsPlaying = (val: boolean) => {
    isPlayingRef.current = val;
    setIsPlaying(val);
  };

  // Screen time locks and continuous target cues helper states
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number>(5);
  const [holdProgressLock, setHoldProgressLock] = useState<number>(0);
  const [isParentUnlockedLock, setIsParentUnlockedLock] = useState<boolean>(false);
  const holdIntervalRefLock = useRef<NodeJS.Timeout | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const childTurnIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Favorites database metadata representation
  const [customFavorite, setCustomFavorite] = useState<any | null>(null);
  const favoritesData = [
    { id: "fatihah", emoji: "🌟", title: "Al-Fatihah", arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", bg: "bg-rose-50/80 border-rose-100 text-rose-700 hover:bg-rose-100/60" },
    { id: "tidur", emoji: "🌙", title: "Doa Tidur", arabic: "بِاسْمِكَ اللَّهُمَّ أَحْيَا وَأَمُوتُ", bg: "bg-indigo-50/80 border-indigo-100 text-indigo-700 hover:bg-indigo-100/60" },
    { id: "pagi", emoji: "☀️", title: "Dzikir Pagi", arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ", bg: "bg-amber-50/80 border-amber-100 text-amber-700 hover:bg-amber-100/60" },
    { id: "makan", emoji: "🌱", title: "Doa Makan", arabic: "اللَّهُمَّ بَارِكْ LENA FIMA RAZAQTANA", bg: "bg-emerald-50/80 border-emerald-100 text-emerald-700 hover:bg-emerald-100/60" },
  ];

  // Resolve active verse information accurately
  const currentAyah = sessionAyahs[currentAyahIndex] || sessionAyahs[0] || {
    surah: 112,
    surah_name: "Al-Ikhlas",
    ayah_number: 1,
    text: "قُلْ هُوَ اللَّهو أَحَدٌ"
  };

  const arabicTextToShow = customFavorite ? customFavorite.arabic : currentAyah.text;

  // Clean up Audio on unmount or phase changes
  const stopAudio = () => {
    updateIsPlaying(false);
    setIsChildTurn(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (childTurnIntervalRef.current) {
      clearInterval(childTurnIntervalRef.current);
      childTurnIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  useEffect(() => {
    stopAudio();
    updateLoopsCompleted(0);
    setTimerProgress(0);
    setCurrentAyahIndex(0);
    setActiveRabtPlayingId(null);
    // Auto reset phase for new tasks
    setZiyadahPhase("talaqqi");
  }, [task?.id, taskCategory]);

  // Main Audio player loop for Talaqqi
  const playTalaqqiAudio = (forceStart = false) => {
    const isForced = forceStart === true;
    if (isPlayingRef.current && !isForced) {
      stopAudio();
      return;
    }

    if (isForced) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (childTurnIntervalRef.current) {
        clearInterval(childTurnIntervalRef.current);
        childTurnIntervalRef.current = null;
      }
      setIsChildTurn(false);
    }

    if (soundSynth && soundSynth.playPop) {
      soundSynth.playPop();
    }

    const surahId = currentAyah.surah || 112;
    const ayahNum = currentAyah.ayah_number || 1;

    // Compute global ayah offset
    let total = 0;
    for (let i = 0; i < surahId - 1; i++) {
      total += surahAyahCounts[i] || 0;
    }
    const globalAyah = total + ayahNum;

    const rawQari = typeof window !== "undefined" ? localStorage.getItem("wali_tahfidz_global_qari") || "ar.alafasy" : "ar.alafasy";
    const qari = resolveQariAudioId(rawQari);
    const qariMeta = WALI_TAFHIDZ_QARI_REGISTRY[rawQari];
    const bitrate = qariMeta?.bitrate || 128;
    let audioUrl = "";
    if (qariMeta?.cdn === "everyayah") {
      const eaId = getEveryAyahId(surahId, ayahNum);
      audioUrl = `https://everyayah.com/data/${qariMeta.apiId}/${eaId}.mp3`;
    } else {
      audioUrl = `https://cdn.islamic.network/quran/audio/${bitrate}/${qari}/${globalAyah}.mp3`;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    updateIsPlaying(true);
    setIsChildTurn(false);

    audio.play().catch((err) => {
      console.warn("Quran dynamic play offline:", err);
      // Fallback: smooth progress simulation if offline
      simulatePlayOffline();
    });

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setTimerProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      setTimerProgress(100);
      audioRef.current = null;
      const delayDuration = audio.duration || 4;
      startChildRepeatTurn(delayDuration);
    };
  };

  const simulatePlayOffline = () => {
    let dur = 0;
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      dur += 4;
      if (dur >= 100) {
        clearInterval(progressIntervalRef.current!);
        progressIntervalRef.current = null;
        setTimerProgress(100);
        audioRef.current = null;
        startChildRepeatTurn(4); // Simulated 4s delay
      } else {
        setTimerProgress(dur);
      }
    }, 150);
  };

  const startChildRepeatTurn = (duration: number) => {
    setIsChildTurn(true);
    setTimerProgress(0);

    const totalTimeMs = (duration || 4) * 1000;
    const intervalMs = 50;
    let elapsedMs = 0;

    if (childTurnIntervalRef.current) clearInterval(childTurnIntervalRef.current);

    childTurnIntervalRef.current = setInterval(() => {
      elapsedMs += intervalMs;
      const progress = Math.min(100, (elapsedMs / totalTimeMs) * 100);
      setTimerProgress(progress);

      if (elapsedMs >= totalTimeMs) {
        clearInterval(childTurnIntervalRef.current!);
        childTurnIntervalRef.current = null;
        setIsChildTurn(false);
        handleLoopFinished();
      }
    }, intervalMs);
  };

  const handleLoopFinished = () => {
    const nextLoops = loopsCompletedRef.current + 1;
    updateLoopsCompleted(nextLoops);
    setTimerProgress(0);

    if (soundSynth && soundSynth.playProgressUp) {
      soundSynth.playProgressUp();
    }

    if (nextLoops >= loopsPerAyah) {
      // Loop Target Achieved! Transition to Tikrar Phase
      updateIsPlaying(false);
      if (soundSynth && soundSynth.playSuccess) {
        soundSynth.playSuccess();
      }
      stopAudio();
      setTimeout(() => {
        setZiyadahPhase("tikrar");
      }, 800);
    } else {
      // Keep isPlaying true to avoid visual interruption
      // Auto queue next repetition loop
      setTimeout(() => {
        if (isPlayingRef.current) {
          playTalaqqiAudio(true);
        }
      }, 500);
    }
  };

  // Skip Talaqqi to Tikrar directly
  const skipTalaqqi = () => {
    stopAudio();
    if (soundSynth && soundSynth.playPop) {
      soundSynth.playPop();
    }
    setZiyadahPhase("tikrar");
  };

  // Convert progress for progress ring calculation
  const loopDisplayProgress = loopsCompleted >= loopsPerAyah ? 100 : (loopsCompleted / loopsPerAyah) * 100 + (timerProgress / loopsPerAyah);

  const strokeRadius = 52;
  const circumference = 2 * Math.PI * strokeRadius;
  const strokeDashoffset = circumference - (loopDisplayProgress / 100) * circumference;

  // Command handler to trigger and load the next task in queue
  const handleTriggerNextTask = () => {
    stopAudio();
    if (onNextQueueTask) {
      onNextQueueTask();
    }
    setViewState("plan");
  };

  // Auto progression scheduler for completed view
  useEffect(() => {
    let timerRef: NodeJS.Timeout | null = null;
    if (viewState === "completed") {
      setAutoAdvanceCountdown(5);
      timerRef = setInterval(() => {
        setAutoAdvanceCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef!);
            handleTriggerNextTask();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef) clearInterval(timerRef);
    };
  }, [viewState]);

  // Touch/Hold states block for parent lockout extend session override
  const startHoldLock = () => {
    if (holdIntervalRefLock.current) clearInterval(holdIntervalRefLock.current);
    holdIntervalRefLock.current = setInterval(() => {
      setHoldProgressLock((prev) => {
        if (prev >= 100) {
          clearInterval(holdIntervalRefLock.current!);
          holdIntervalRefLock.current = null;
          setIsParentUnlockedLock(true);
          if (soundSynth && soundSynth.playCelebrate) {
            soundSynth.playCelebrate();
          }
          if (onAddTimeOverride) {
            onAddTimeOverride();
          }
          // Reset status comfortably
          setTimeout(() => {
            setHoldProgressLock(0);
            setIsParentUnlockedLock(false);
          }, 1500);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  const stopHoldLock = () => {
    if (holdIntervalRefLock.current) {
      clearInterval(holdIntervalRefLock.current);
      holdIntervalRefLock.current = null;
    }
    setHoldProgressLock((prev) => (prev >= 100 ? 100 : 0));
  };

  useEffect(() => {
    return () => {
      if (holdIntervalRefLock.current) clearInterval(holdIntervalRefLock.current);
    };
  }, []);

  const processRating = async (rating: "ulangi" | "lulus") => {
    stopAudio();
    if (handleSessionRating && task) {
      await handleSessionRating(task.id, rating);
    }
    setViewState("completed");
  };

  // Map session ayahs gracefully to IntegrationPhase matching formats
  const mappedSessionAyahs = (sessionAyahs || []).map((ayah, idx) => ({
    id: ayah.id || `${ayah.surah}_${ayah.ayah_number}`,
    arabicText: ayah.text || ayah.arabicText || "",
    surahName: ayah.surah_name || "Surah",
    ayahNumber: ayah.ayah_number,
    surahNumber: ayah.surah || 112
  }));

  
    const handlePlayRangeRabtAudio = async () => {
      if (isPlayingRangeRabt) {
        stopAudio();
        setIsPlayingRangeRabt(false);
        return;
      }

      stopAudio();
      setIsPlayingRangeRabt(true);

      const targetAyahs = sessionAyahs.slice(0, currentAyahIndex + 1);
      const rawQari = typeof window !== "undefined" ? localStorage.getItem("wali_tahfidz_global_qari") || "ar.alafasy" : "ar.alafasy";
      const qari = resolveQariAudioId(rawQari);
      const qariMeta = WALI_TAFHIDZ_QARI_REGISTRY[rawQari];
      const bitrate = qariMeta?.bitrate || 128;

      for (let i = 0; i < targetAyahs.length; i++) {
        const item = targetAyahs[i];
        const globalNum = surahAyahCounts.slice(0, (item.surah || 112) - 1).reduce((p, c) => p + c, 0) + item.ayah_number;
        
        let audioUrl = "";
        if (qariMeta?.cdn === "everyayah") {
          const eaId = getEveryAyahId(item.surah || 112, item.ayah_number);
          audioUrl = `https://everyayah.com/data/${qariMeta.apiId}/${eaId}.mp3`;
        } else {
          audioUrl = `https://cdn.islamic.network/quran/audio/${bitrate}/${qari}/${globalNum}.mp3`;
        }

        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        setActiveRabtPlayingId(item.id || `${item.surah}_${item.ayah_number}`);

        try {
          await new Promise((resolve, reject) => {
            audio.play().catch(reject);
            audio.onended = resolve;
            const checkStop = setInterval(() => {
              if (audioRef.current !== audio) {
                clearInterval(checkStop);
                reject("stopped");
              }
            }, 100);
          });
        } catch (err) {
          console.warn("Range play interrupted or failed", err);
          break;
        }
      }

      setIsPlayingRangeRabt(false);
      setActiveRabtPlayingId(null);
    };


    const handlePlayRabtAudio = (item: any) => {
    // If the same item is currently playing, clicking it stops the playback
    if (activeRabtPlayingId === item.id) {
      stopAudio();
      setActiveRabtPlayingId(null);
      return;
    }

    // Stop all other audio FIRST
    stopAudio();
    setActiveRabtPlayingId(item.id);

    if (soundSynth && soundSynth.playPop) {
      soundSynth.playPop();
    }

    const globalNumOfAyah = surahAyahCounts.slice(0, (item.surahNumber || 112) - 1).reduce((p, c) => p + c, 0) + item.ayahNumber;
    const rawQari = typeof window !== "undefined" ? localStorage.getItem("wali_tahfidz_global_qari") || "ar.alafasy" : "ar.alafasy";
    const qari = resolveQariAudioId(rawQari);
    const qariMeta = WALI_TAFHIDZ_QARI_REGISTRY[rawQari];
    const bitrate = qariMeta?.bitrate || 128;
    let audioUrl = "";
    if (qariMeta?.cdn === "everyayah") {
      const eaId = getEveryAyahId(item.surahNumber || 112, item.ayahNumber);
      audioUrl = `https://everyayah.com/data/${qariMeta.apiId}/${eaId}.mp3`;
    } else {
      audioUrl = `https://cdn.islamic.network/quran/audio/${bitrate}/${qari}/${globalNumOfAyah}.mp3`;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.play().catch((ex) => {
      console.warn("Fallback play on integration screen offline:", ex);
      // fallback mock play progress if offline
      let dur = 0;
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        dur += 10;
        if (dur >= 100) {
          clearInterval(progressIntervalRef.current!);
          progressIntervalRef.current = null;
          setActiveRabtPlayingId(null);
        }
      }, 500);
    });

    audio.onended = () => {
      setActiveRabtPlayingId(null);
    };
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const remaining = Math.max(0, maxSessionDurationSeconds - screenTimeElapsed);
  const isTimeExceeded = remaining <= 0;

  return (
    <div id="child-play-pwa-container" className="w-full h-screen max-w-md mx-auto bg-slate-50 flex flex-col justify-between overflow-hidden relative font-sans antialiased text-[#2D3748] shadow-2xl rounded-[40px] border border-slate-100 select-none">
      
      {/* 1. Top Header (Minimalist & Safe) */}
      <header id="child-play-header" className="w-full flex items-center justify-between px-6 pt-6 pb-2 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div id="session-pill" className="bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-full border border-slate-200/40 shadow-xs flex items-center gap-1.5 select-none">
            <span className="text-yellow-400 text-xs animate-pulse">🌟</span>
            <span className="font-extrabold text-[9.5px] text-slate-500 tracking-wider">
              {taskCategory === "ZIYADAH" 
                ? `ZIYADAH`
                : taskCategory === "QARIB" 
                  ? "MUROJAAH" 
                  : "GAME TEBAK"
              }
            </span>
          </div>

          <div id="screentime-pill" className="bg-emerald-50/90 text-emerald-800 px-3 py-2 rounded-full border border-emerald-100 shadow-xs flex items-center gap-1 font-black text-[10px] tracking-wide select-none">
            <span className="text-[11px] animate-pulse">⏱️</span>
            <span>{formatTime(remaining)}</span>
          </div>
        </div>
        
        {/* Subtle, faded lock icon serving as hidden toddler gate to exit */}
        <button
          id="toddler-gate-exit-button"
          onClick={() => {
            stopAudio();
            handleEndSession?.();
          }}
          className="p-2 rounded-full opacity-30 cursor-pointer hover:opacity-100 active:scale-90 transition-all focus:outline-none"
          title="Keluar Sesi"
        >
          <Lock className="h-5 w-5 text-slate-500" />
        </button>
      </header>

      {/* Visual State Canvas with AnimatePresence */}
      <main id="child-play-canvas" className="flex-1 w-full px-5 flex flex-col justify-center relative overflow-hidden">
        <AnimatePresence mode="wait">
          
          {/* FAVORITE MODE (Jukebox / Dzikir) */}
          {viewState === "favorites" && (
            <motion.div
              key="favorites-mode-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35 }}
              className="flex-1 flex flex-col justify-between py-6 w-full"
            >
              <div id="jukebox-info-header" className="text-center pt-2">
                <h3 className="text-xl font-bold text-slate-700 tracking-tight">Pilih Kesukaanmu ✨</h3>
                <p className="text-xs text-slate-400 mt-1">Sembari jeda, yuk dengar dzikir & do'a harian!</p>
              </div>

              {/* 2x2 Grid of Favorite Cards */}
              <div id="favorites-jukebox-grid" className="grid grid-cols-2 gap-4 my-6 w-full max-w-sm mx-auto flex-1 items-center justify-center">
                {favoritesData.map((fav) => (
                  <motion.button
                    key={fav.id}
                    id={`favorit-card-${fav.id}`}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      if (soundSynth && soundSynth.playPop) soundSynth.playPop();
                      setCustomFavorite(fav);
                      setViewState("plan");
                    }}
                    className={`${fav.bg} border rounded-[28px] p-5 aspect-square flex flex-col items-center justify-center text-center shadow-sm cursor-pointer transition-all focus:outline-none relative overflow-hidden group`}
                  >
                    <span className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-300">{fav.emoji}</span>
                    <span className="font-extrabold text-xs tracking-wide uppercase">{fav.title}</span>
                  </motion.button>
                ))}
              </div>

              {/* Bottom return CTA button */}
              <div id="favorites-back-trigger-container" className="w-full flex justify-center pb-2 shrink-0">
                <button
                  id="favorites-back-trigger"
                  onClick={() => {
                    if (soundSynth && soundSynth.playPop) soundSynth.playPop();
                    setViewState("plan");
                  }}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 rounded-full text-slate-500 font-extrabold text-xs shadow-xs uppercase tracking-wider transition-colors cursor-pointer focus:outline-none"
                >
                  Kembali ke Rencana
                </button>
              </div>
            </motion.div>
          )}

          {/* SESSION COMPLETE */}
          {viewState === "completed" && (
            <motion.div
              key="session-complete-screen"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.45, type: "spring", bounce: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center text-center py-6 w-full"
            >
              <div id="completed-stellar-animation" className="relative flex flex-col items-center">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 0.95, 1.15, 0.98, 1.02, 1],
                    rotate: [0, 8, -8, 5, -5, 0]
                  }}
                  transition={{
                    duration: 2.5,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="text-8xl mb-6 select-none"
                >
                  🌟
                </motion.div>

                <h3 className="text-2xl font-black text-emerald-600 px-4 leading-tight">
                  Alhamdulillah!
                </h3>
                <p className="text-sm font-semibold text-slate-500 mt-2 px-6">
                  Sesi belajar dan bermain selesai! Hebat sekali!
                </p>
              </div>

              {/* SESSION COMPLETE — Auto-complete, no mandatory rating for Ziyadah */}
              {viewState === "completed" && taskCategory === "ZIYADAH" && (
                <div className="absolute bottom-16 right-0 left-0 flex justify-center px-5">
                  <button
                    type="button"
                    onClick={() => {
                      if (handleSessionRating && task) {
                        handleSessionRating(task.id, "ulangi");
                      }
                      if (soundSynth && soundSynth.playPop) soundSynth.playPop();
                    }}
                    className="px-5 py-2 rounded-full border border-dashed border-rose-200 text-rose-400 hover:text-rose-500 hover:border-rose-300 font-bold text-[10px] tracking-wide transition-all uppercase cursor-pointer focus:outline-none bg-transparent"
                    title="Ayat ini akan muncul lagi besok untuk diulang"
                  >
                    🔁 Belum Hafal, Ulangi Besok
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* PLAN MODE */}
          {viewState === "plan" && (
            <motion.div
              key="plan-mode-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col justify-between py-2 w-full h-full overflow-y-auto"
            >
              
              {/* IF ZIYADAH: RENDER THE 3 COMPLIANT STEPS (TALAQQI, TIKRAR, RABT) */}
              {taskCategory === "ZIYADAH" ? (
                <div id="ziyadah-phases-layout" className="flex-1 flex flex-col justify-between h-full">
                  
                  {/* Subtle Top Phase Switcher Tracker (Apple-Clean Pill) */}
                  <div className="w-full flex items-center justify-center gap-1.5 mt-1 shrink-0 select-none">
                    <span className={`px-3 py-1 text-[9px] font-black rounded-full border transition-all ${
                      ziyadahPhase === "talaqqi" 
                        ? "bg-amber-100 border-amber-200 text-amber-800" 
                        : "bg-slate-100/50 border-slate-200/30 text-slate-400"
                    }`}>
                      1. Talaqqi 🎧
                    </span>
                    <span className="text-slate-300 text-xs">➔</span>
                    <span className={`px-3 py-1 text-[9px] font-black rounded-full border transition-all ${
                      ziyadahPhase === "tikrar" 
                        ? "bg-emerald-100 border-emerald-200 text-emerald-800" 
                        : "bg-slate-100/50 border-slate-200/30 text-slate-400"
                    }`}>
                      2. Tikrar 🗣️
                    </span>
                    <span className="text-slate-300 text-xs">➔</span>
                    <span className={`px-3 py-1 text-[9px] font-black rounded-full border transition-all ${
                      ziyadahPhase === "rabt" 
                        ? "bg-indigo-100 border-indigo-200 text-indigo-800" 
                        : "bg-slate-100/50 border-slate-200/30 text-slate-400"
                    }`}>
                      3. Sambung 🔗
                    </span>
                  </div>

                  {/* STEP 1: TALAQQI SUB-STATE */}
                  {ziyadahPhase === "talaqqi" && (
                    <div id="talaqqi-active-pane" className="flex-1 flex flex-col justify-between py-4">
                      
                      {/* Center Arabic Card */}
                      <div id="arabic-word-canvas" className="flex-1 flex items-center justify-center py-2 px-1">
                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.4 }}
                          className="bg-white w-full aspect-[4/3] max-w-sm rounded-[32px] shadow-sm border border-slate-200/50 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden"
                        >
                          <div className="absolute inset-x-0 top-3 text-center select-none">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border transition-all ${
                              isChildTurn 
                                ? "text-emerald-600 bg-emerald-50 border-emerald-200 animate-pulse" 
                                : "text-amber-500 bg-amber-50 border-amber-100"
                            }`}>
                              {isChildTurn ? "🗣️ Giliranmu! Tirukan Ayat" : "🎧 Simak Qari"}
                            </span>
                          </div>

                          <span
                            id="arabic-text-view"
                            className="text-4xl font-extrabold tracking-wide text-slate-800 leading-[1.8] font-arabic select-none z-10 block pt-4 text-center mt-2.5"
                            dir="rtl"
                          >
                            {arabicTextToShow}
                          </span>

                          {/* Loop count indicator in bottom corner */}
                          <div className="absolute bottom-3 right-4 select-none">
                            <span className="text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-150 rounded-lg px-2 py-0.5 uppercase tracking-wider">
                              Putaran: {isPlaying ? Math.min(loopsPerAyah, loopsCompleted + 1) : loopsCompleted}/{loopsPerAyah}
                            </span>
                          </div>
                        </motion.div>
                      </div>

                      {/* Main Interaction Action Area */}
                      <div id="action-play-control-box" className="w-full flex items-center justify-between px-3 mt-4 relative shrink-0">
                        {/* The Boredom Button */}
                        <motion.button
                          id="boredom-button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            stopAudio();
                            if (soundSynth && soundSynth.playPop) soundSynth.playPop();
                            setViewState("favorites");
                          }}
                          className="p-3.5 rounded-2xl bg-amber-50 border border-amber-150 text-amber-400 cursor-pointer shadow-sm hover:bg-amber-100/50 transition-colors focus:outline-none"
                          title="Pilih Favorit"
                        >
                          <Star className="h-5 w-5 fill-current" />
                        </motion.button>

                        {/* Invisible Timer wrapping massive Emerald Play button */}
                        <div id="play-button-timer-ring-wrapper" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-28 w-28 select-none">
                          <svg className="absolute -rotate-90 transform w-full h-full pointer-events-none">
                            {/* Outer circular ring track */}
                            <circle
                              cx="56"
                              cy="56"
                              r={strokeRadius}
                              className="stroke-emerald-100 fill-none"
                              strokeWidth="4"
                            />
                            {/* Live timer progress stroke filling up loop requirements */}
                            <circle
                              cx="56"
                              cy="56"
                              r={strokeRadius}
                              className="stroke-emerald-400 fill-none"
                              strokeWidth="4"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              style={{ transition: "stroke-dashoffset 0.3s linear" }}
                            />
                          </svg>

                          {/* Massively inviting green play trigger */}
                          <motion.button
                            id="play-mode-control-trigger"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={playTalaqqiAudio}
                            className="h-20 w-20 rounded-full bg-emerald-400 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg active:shadow-md transition-colors z-10 focus:outline-none cursor-pointer"
                          >
                            {isPlaying ? (
                              <Pause className="h-8 w-8 fill-current text-white" />
                            ) : (
                              <Play className="h-8 w-8 fill-current text-white translate-x-0.5" />
                            )}
                          </motion.button>
                        </div>

                        {/* Manual Phase Skip Forward Bypass arrow */}
                        <motion.button
                          id="manual-skip-phrase"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={skipTalaqqi}
                          className="p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-500 cursor-pointer shadow-xs transition-colors focus:outline-none"
                          title="Lanjut Tikrar"
                        >
                          <SkipForward className="h-5 w-5" />
                        </motion.button>
                      </div>

                    </div>
                  )}

                  {/* STEP 2: TIKRAR PHASE (Ulangan Mandiri) */}
                  {ziyadahPhase === "tikrar" && (
                    <div id="tikrar-active-pane" className="flex-1 flex flex-col justify-start py-2 overflow-y-auto">
                      <TikrarPhase
                        ayahData={{
                          surah: currentAyah.surah || 112,
                          surah_name: currentAyah.surah_name || "Al-Ikhlas",
                          ayah_number: currentAyah.ayah_number || 1,
                          text: arabicTextToShow
                        }}
                        targetCount={targetTikrarCount}
                        onPhaseComplete={async () => {
                          if (soundSynth && soundSynth.playSuccess) soundSynth.playSuccess();
                          if (currentAyahIndex === 0) {
                            if (sessionAyahs && sessionAyahs.length > 1) {
                              setLoopsCompleted(0);
                              setTimerProgress(0);
                              setCurrentAyahIndex(1);
                              setZiyadahPhase("talaqqi");
                            } else {
                              await processRating("lulus");
                            }
                          } else {
                            setZiyadahPhase("rabt");
                          }
                        }}
                        soundSynth={soundSynth}
                      />
                    </div>
                  )}

                  {/* STEP 3: RABT PHASE (Sambung Ayat) */}
                  {ziyadahPhase === "rabt" && (
                    <div id="rabt-active-pane" className="flex-1 flex flex-col justify-start py-2 overflow-y-auto">
                      <IntegrationPhase
                        sessionAyahs={mappedSessionAyahs.slice(0, currentAyahIndex + 1)}
                        activePlayingId={activeRabtPlayingId}
                        onFinishSession={async () => {
                          if (currentAyahIndex + 1 < sessionAyahs.length) {
                            setLoopsCompleted(0);
                            setTimerProgress(0);
                            setCurrentAyahIndex((prev) => prev + 1);
                            setZiyadahPhase("talaqqi");
                          } else {
                            await processRating("lulus");
                          }
                        }}
                        onPlayFullAudio={handlePlayRabtAudio}
                          targetCount={targetRabtCount}
                          onPlayRangeAudio={handlePlayRangeRabtAudio}
                          isPlayingRange={isPlayingRangeRabt}
                      />
                    </div>
                  )}

                </div>
              ) : (
                /* IF MUROJAAH (QARIB OR SABIQU): DELEGATE TO DIRECT MUROJAAH STAGE COMPONENT */
                <div id="murojaah-phases-layout" className="flex-1 flex flex-col justify-start h-full">
                  <div className="flex-1 w-full overflow-y-auto py-2">
                    <DirectMurojaahStage
                      mode={taskCategory === "QARIB" ? "DAILY_REVIEW" : "ROTATIONAL_GAME"}
                      sessionAyahs={sessionAyahs}
                      activeChild={rest.selectedChild || rest.activeChild || null}
                      soundSynth={soundSynth}
                      onRatingSelected={async (rating: "lulus" | "ulangi") => {
                        await processRating(rating);
                      }}
                      onBack={() => {
                        stopAudio();
                        handleEndSession?.();
                      }}
                    />
                  </div>
                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>
      </main>
      
    </div>
  );
}
