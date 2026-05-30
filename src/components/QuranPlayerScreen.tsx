import { useState, useEffect, useRef, useMemo } from "react";
import { 
  BookOpen, 
  Search, 
  ArrowLeft, 
  X,
  VolumeX,
  AudioLines,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Play,
  Pause,
  RotateCcw,
  Square,
  Globe,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { quranMetaData } from "../data/quranMeta";
import { stripBismillah } from "../utils/quranApi";
import { resolveQariAudioId, WALI_TAFHIDZ_QARI_REGISTRY } from "../hooks/useAyahPlayer";

const SURAH_AYAH_COUNTS = [
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


function getEveryAyahId(surah: number, ayah: number): string {
  const s = surah.toString().padStart(3, '0');
  const a = ayah.toString().padStart(3, '0');
  return `${s}${a}`;
}

function getGlobalAyahNumber(surah: number, ayah: number): number {
  let total = 0;
  for (let i = 0; i < surah - 1; i++) {
    total += SURAH_AYAH_COUNTS[i] || 0;
  }
  return total + ayah;
}

interface AyahMerged {
  numberInSurah: number;
  arabicText: string;
  indoText: string;
}

interface QuranPlayerScreenProps {
  soundSynth?: any;
  lang?: "ID" | "EN";
  globalQari?: string;
  onGlobalQariChange?: (qariId: string) => void;
}

export default function QuranPlayerScreen({ soundSynth, lang = "ID" }: QuranPlayerScreenProps) {
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [versesList, setVersesList] = useState<AyahMerged[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- ADVANCED AUDIO PLAYBACK SESSION STATE & REFS ---
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  // Qari Override
  const [localQari, setLocalQari] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("wali_tahfidz_global_qari") || "ar.alafasy";
    }
    return "ar.alafasy";
  });

  // Repetisi Ayat X Kali (1 - 15)
  const [ayahRepeatCount, setAyahRepeatCount] = useState<number>(1);
  const [currentAyahRepeat, setCurrentAyahRepeat] = useState<number>(0);

  // Set Ayat X Kali (Range of Verses)
  const [rangeAyatEnabled, setRangeAyatEnabled] = useState<boolean>(false);
  const [startAyah, setStartAyah] = useState<number>(1);
  const [endAyah, setEndAyah] = useState<number>(5);
  const [rangeRepeatCount, setRangeRepeatCount] = useState<number>(1);
  const [currentRangeRepeat, setCurrentRangeRepeat] = useState<number>(0);

  // Set Surat X Kali (Sequence of Surahs)
  const [rangeSuratEnabled, setRangeSuratEnabled] = useState<boolean>(false);
  const [startSurah, setStartSurah] = useState<number>(112);
  const [endSurah, setEndSurah] = useState<number>(114);
  const [surahRepeatCount, setSurahRepeatCount] = useState<number>(1);
  const [currentSurahRepeat, setCurrentSurahRepeat] = useState<number>(0);

  // Playing session state tracking
  const [isPlayingAdvanced, setIsPlayingAdvanced] = useState<boolean>(false);
  const [currentPlayingSurah, setCurrentPlayingSurah] = useState<number>(112);
  const [currentPlayingAyah, setCurrentPlayingAyah] = useState<number>(1);
  
  // Pending play when changing Surah triggers async loader
  const [pendingPlayInfo, setPendingPlayInfo] = useState<{ surahId: number; ayahNum: number; isFirstPlay?: boolean } | null>(null);

  // Ref thread alignment state to bypass stale react render execution scopes
  const stateRef = useRef({
    localQari,
    ayahRepeatCount,
    currentAyahRepeat: 0,
    
    rangeAyatEnabled,
    startAyah,
    endAyah,
    rangeRepeatCount,
    currentRangeRepeat: 0,
    
    rangeSuratEnabled,
    startSurah,
    endSurah,
    surahRepeatCount,
    currentSurahRepeat: 0,
    
    isPlayingAdvanced: false,
    currentPlayingSurah: 112,
    currentPlayingAyah: 1,
    
    versesCountCurrentSurah: 0
  });

  // Keep stateRef completely synchronized with user interface configs instantly
  useEffect(() => {
    stateRef.current.localQari = localQari;
    stateRef.current.ayahRepeatCount = ayahRepeatCount;
    stateRef.current.rangeAyatEnabled = rangeAyatEnabled;
    stateRef.current.startAyah = startAyah;
    stateRef.current.endAyah = endAyah;
    stateRef.current.rangeRepeatCount = rangeRepeatCount;
    stateRef.current.rangeSuratEnabled = rangeSuratEnabled;
    stateRef.current.startSurah = startSurah;
    stateRef.current.endSurah = endSurah;
    stateRef.current.surahRepeatCount = surahRepeatCount;
  }, [
    localQari,
    ayahRepeatCount,
    rangeAyatEnabled,
    startAyah,
    endAyah,
    rangeRepeatCount,
    rangeSuratEnabled,
    startSurah,
    endSurah,
    surahRepeatCount
  ]);

  useEffect(() => {
    stateRef.current.versesCountCurrentSurah = versesList.length;
  }, [versesList]);

  // Navigate to previous Surah (Wrap around full 114 Surahs catalog)
  const handlePrevSurah = () => {
    if (!selectedSurahId) return;
    if (soundSynth && soundSynth.playPop) soundSynth.playPop();
    const prevId = selectedSurahId - 1;
    if (prevId >= 1) {
      setSelectedSurahId(prevId);
    } else {
      setSelectedSurahId(114);
    }
  };

  // Navigate to next Surah (Wrap around full 114 Surahs catalog)
  const handleNextSurah = () => {
    if (!selectedSurahId) return;
    if (soundSynth && soundSynth.playPop) soundSynth.playPop();
    const nextId = selectedSurahId + 1;
    if (nextId <= 114) {
      setSelectedSurahId(nextId);
    } else {
      setSelectedSurahId(1);
    }
  };

  // Smooth scroll active ayah into view when playingKey changes with custom delay and cubic easing
  useEffect(() => {
    if (playingKey) {
      let elementId = "";
      if (playingKey === "bismillah") {
        elementId = "quran-ayah-bismillah";
      } else {
        const [surahId, ayahNum] = playingKey.split(":").map(Number);
        if (surahId === selectedSurahId) {
          elementId = `quran-ayah-${surahId}-${ayahNum}`;
        }
      }

      if (elementId) {
        // Wait 350ms for transition animation comfort before scrolling
        const timer = setTimeout(() => {
          const element = document.getElementById(elementId);
          const container = document.getElementById("quran-verses-container");
          
          if (element && container) {
            const elementRect = element.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            // Calculate target scroll to perfectly center the active ayah in container
            const targetY = container.scrollTop + 
              (elementRect.top - containerRect.top) - 
              (containerRect.height / 2) + 
              (elementRect.height / 2);
            
            const startY = container.scrollTop;
            const difference = targetY - startY;
            const startTime = performance.now();
            const duration = 850; // Custom 850ms duration for majestic, fluid scroll motion

            let timerFrame: number;
            const animateScroll = (currentTime: number) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              
              // Gentle ease-out quartic easing curve
              const easeProgress = 1 - Math.pow(1 - progress, 4);
              
              container.scrollTop = startY + difference * easeProgress;

              if (progress < 1) {
                timerFrame = requestAnimationFrame(animateScroll);
              }
            };

            timerFrame = requestAnimationFrame(animateScroll);
            return () => cancelAnimationFrame(timerFrame);
          }
        }, 350);

        return () => clearTimeout(timer);
      }
    }
  }, [playingKey, selectedSurahId]);

  // Core Search Indexing Engine Architecture
  const filteredSurahs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    // Filter out the placeholder item { id: 0 } during calculation so it doesn't break index keys.
    const allValid = (quranMetaData as any[]).filter(s => s && s.id > 0);
    
    if (!query) return allValid;

    return allValid.filter(surah => {
      // Criterion 1: Exact index or matching chapter ID
      const matchId = surah.id.toString() === query;

      // Criterion 2: Transliteration fuzzy lookups (stripping dashes and spaces)
      const cleanTranslit = surah.transliteration.toLowerCase().replace(/[\s'-]/g, "");
      const cleanQuery = query.replace(/[\s'-]/g, "");
      const matchTranslit = cleanTranslit.includes(cleanQuery);

      // Criterion 3: Meaning translation match (English or Indonesian context)
      const matchTranslation = surah.translation.toLowerCase().includes(query);

      // Criterion 4: Alternate names checklist array parsing
      const matchAlternate = surah.alternateNames && surah.alternateNames.some(alt => alt.toLowerCase().includes(query));

      return matchId || matchTranslit || matchTranslation || !!matchAlternate;
    });
  }, [searchQuery]);

  // Selected Surah instance
  const selectedSurah = useMemo(() => {
    if (!selectedSurahId) return null;
    return (quranMetaData as any[]).find((s) => s.id === selectedSurahId) || null;
  }, [selectedSurahId]);

  // Clean and manage active audio references on page exit or state transfers
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Fetch Arabic + Indonesian verses on tapping a surah
  useEffect(() => {
    if (!selectedSurahId) {
      setVersesList([]);
      setErrorText(null);
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    const loadSurahContent = async () => {
      setLoadingVerses(true);
      setErrorText(null);
      setPlayingKey(null);
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.pause();
        audioRef.current = null;
      }

      try {
        const [arabicRes, indoRes] = await Promise.all([
          fetch(`https://api.alquran.cloud/v1/surah/${selectedSurahId}/quran-uthmani`).then((r) => {
            if (!r.ok) throw new Error("Gagal mengambil teks Arab.");
            return r.json();
          }),
          fetch(`https://api.alquran.cloud/v1/surah/${selectedSurahId}/id.indonesian`).then((r) => {
            if (!r.ok) throw new Error("Gagal mengambil terjemahan Indonesia.");
            return r.json();
          })
        ]);

        const arabAyahs = arabicRes?.data?.ayahs || [];
        const indoAyahs = indoRes?.data?.ayahs || [];

        if (arabAyahs.length === 0) {
          throw new Error("Teks ayat tidak ditemukan.");
        }

        const merged: AyahMerged[] = arabAyahs.map((a: any, index: number) => {
          const matchingIndo = indoAyahs.find((i: any) => i.numberInSurah === a.numberInSurah) || indoAyahs[index];
          
          let cleanArabic = a.text || "";
          if (a.numberInSurah === 1) {
            cleanArabic = stripBismillah(cleanArabic, selectedSurahId, 1);
          }

          return {
            numberInSurah: a.numberInSurah,
            arabicText: cleanArabic,
            indoText: matchingIndo ? matchingIndo.text : `Terjemahan ayat ${a.numberInSurah} tidak termuat.`
          };
        });

        setVersesList(merged);

        // --- ASYNC QUEUE DELEGATOR ON SURAH TRANSITIONS ---
        if (pendingPlayInfo && pendingPlayInfo.surahId === selectedSurahId) {
          const info = pendingPlayInfo;
          setPendingPlayInfo(null);
          setTimeout(() => {
            playAdvancedAyahInner(info.surahId, info.ayahNum, info.isFirstPlay);
          }, 350);
        }
      } catch (err: any) {
        console.error("Gagal memuat surat quran:", err);
        setErrorText(err?.message || "Koneksi internet tidak stabil. Silakan coba lagi.");
      } finally {
        setLoadingVerses(false);
      }
    };

    loadSurahContent();
  }, [selectedSurahId, pendingPlayInfo]);

  // --- CORE SYSTEM OF HIGH PRECISION AUTOPLAY & LOOP ENGINE ---

  // Stop current queue
  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingKey(null);
    setIsPlayingAdvanced(false);
    
    const ref = stateRef.current;
    ref.isPlayingAdvanced = false;
    ref.currentAyahRepeat = 0;
    ref.currentRangeRepeat = 0;
    ref.currentSurahRepeat = 0;
    
    setCurrentAyahRepeat(0);
    setCurrentRangeRepeat(0);
    setCurrentSurahRepeat(0);
  };

  // Trigger Advanced Autoplay Symmetrical Loops Session
  const startAdvancedSession = () => {
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.pause();
    }

    setCurrentAyahRepeat(0);
    setCurrentRangeRepeat(0);
    setCurrentSurahRepeat(0);

    const ref = stateRef.current;
    ref.currentAyahRepeat = 0;
    ref.currentRangeRepeat = 0;
    ref.currentSurahRepeat = 0;
    ref.isPlayingAdvanced = true;
    setIsPlayingAdvanced(true);

    const startS = rangeSuratEnabled ? startSurah : (selectedSurahId || 112);
    const startA = rangeAyatEnabled ? startAyah : 1;

    ref.currentPlayingSurah = startS;
    ref.currentPlayingAyah = startA;
    setCurrentPlayingSurah(startS);
    setCurrentPlayingAyah(startA);

    // Switch representation
    if (selectedSurahId !== startS) {
      setSelectedSurahId(startS);
      setPendingPlayInfo({ surahId: startS, ayahNum: startA, isFirstPlay: true });
    } else {
      playAdvancedAyahInner(startS, startA, true);
    }
  };

  const playAdvancedAyahInner = (surahId: number, ayahNum: number, isFirstPlayOfSurah = false) => {
    // 1. Play Bismillah (Surah 1, Ayah 1) before playing new Surah (except QS 1 and At-Tawbah 9)
    if (ayahNum === 1 && surahId !== 1 && surahId !== 9 && isFirstPlayOfSurah) {
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.pause();
      }

      const qari = resolveQariAudioId(localQari);
      const qariMeta = WALI_TAFHIDZ_QARI_REGISTRY[localQari];
      const bitrate = qariMeta?.bitrate || 128;
      let audioUrl = "";
      if (qariMeta?.cdn === "everyayah") {
        audioUrl = `https://everyayah.com/data/${qariMeta.apiId}/001001.mp3`;
      } else {
        audioUrl = `https://cdn.islamic.network/quran/audio/${bitrate}/${qari}/1.mp3`;
      }

      setPlayingKey("bismillah");
      const bismillahAudio = new Audio(audioUrl);
      audioRef.current = bismillahAudio;

      bismillahAudio.play().catch((err) => {
        console.warn("Gagal memutar Bismillah transisi:", err);
        playAdvancedAyahInnerDirect(surahId, ayahNum);
      });

      bismillahAudio.onended = () => {
        setPlayingKey(null);
        playAdvancedAyahInnerDirect(surahId, ayahNum);
      };
    } else {
      playAdvancedAyahInnerDirect(surahId, ayahNum);
    }
  };

  const playAdvancedAyahInnerDirect = (surahId: number, ayahNum: number) => {
    const ref = stateRef.current;
    
    // Safety check ranges bounds clamps
    const totalVerses = Math.min(SURAH_AYAH_COUNTS[surahId - 1] || 7, ref.versesCountCurrentSurah || 286);
    const clampedAyahNum = Math.min(ayahNum, totalVerses);

    ref.currentPlayingSurah = surahId;
    ref.currentPlayingAyah = clampedAyahNum;
    setCurrentPlayingSurah(surahId);
    setCurrentPlayingAyah(clampedAyahNum);

    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.pause();
    }

    const globalAyah = getGlobalAyahNumber(surahId, clampedAyahNum);
    const qari = resolveQariAudioId(localQari);
    const qariMeta = WALI_TAFHIDZ_QARI_REGISTRY[localQari];
    const bitrate = qariMeta?.bitrate || 128;
    let audioUrl = "";
    if (qariMeta?.cdn === "everyayah") {
      const eaId = getEveryAyahId(surahId, clampedAyahNum);
      audioUrl = `https://everyayah.com/data/${qariMeta.apiId}/${eaId}.mp3`;
    } else {
      audioUrl = `https://cdn.islamic.network/quran/audio/${bitrate}/${qari}/${globalAyah}.mp3`;
    }

    const key = `${surahId}:${clampedAyahNum}`;
    setPlayingKey(key);

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.play().catch((err) => {
      console.warn("Gagal memutar audio:", err);
      stopPlayback();
    });

    audio.onended = () => {
      // 1. Check if the current single Ayah needs to be repeated X times
      const nextAyahRepeatVal = ref.currentAyahRepeat + 1;
      if (nextAyahRepeatVal < ref.ayahRepeatCount) {
        ref.currentAyahRepeat = nextAyahRepeatVal;
        setCurrentAyahRepeat(nextAyahRepeatVal);
        
        // play the exact same ayah again
        audio.currentTime = 0;
        audio.play().catch((err) => {
          console.warn("Gagal repetisi ayat:", err);
          stopPlayback();
        });
        return;
      }
      
      // Reset current Ayah repeat counter
      ref.currentAyahRepeat = 0;
      setCurrentAyahRepeat(0);

      // Transition check
      if (!ref.isPlayingAdvanced) {
        // If user is just playing normally by tapping a single verse, play next verse sequentially
        const nextVerseNum = clampedAyahNum + 1;
        if (nextVerseNum <= totalVerses) {
          playAdvancedAyahInnerDirect(surahId, nextVerseNum);
        } else {
          setPlayingKey(null);
        }
        return;
      }

      // --- ADVANCED AUTOMATIC CONTEXT AUTOMATION QUEUE STACK ---
      const isRangeAyat = ref.rangeAyatEnabled;
      const startA = isRangeAyat ? Math.min(ref.startAyah, totalVerses) : 1;
      const endA = isRangeAyat ? Math.min(ref.endAyah, totalVerses) : totalVerses;

      let nextAyah = clampedAyahNum;

      if (nextAyah < endA) {
        // Move forward across verses list
        nextAyah = nextAyah + 1;
        playAdvancedAyahInner(surahId, nextAyah);
      } else {
        // Reached end of current group block!
        // 2. Range loops repetition
        const nextRangeRepeatVal = ref.currentRangeRepeat + 1;
        const maxRangeRepeats = isRangeAyat ? ref.rangeRepeatCount : 1;

        if (nextRangeRepeatVal < maxRangeRepeats) {
          ref.currentRangeRepeat = nextRangeRepeatVal;
          setCurrentRangeRepeat(nextRangeRepeatVal);
          
          playAdvancedAyahInner(surahId, startA);
        } else {
          // Range repetition loop complete! Reset counters
          ref.currentRangeRepeat = 0;
          setCurrentRangeRepeat(0);

          // 3. Multi-Surah sequence transitions check
          const isRangeSurat = ref.rangeSuratEnabled;
          const startS = isRangeSurat ? ref.startSurah : surahId;
          const endS = isRangeSurat ? ref.endSurah : surahId;

          if (isRangeSurat && surahId < endS) {
            const nextSurahId = surahId + 1;
            const nextSurahTotal = SURAH_AYAH_COUNTS[nextSurahId - 1] || 7;
            const startingAyahOfNextSurah = isRangeAyat ? Math.min(ref.startAyah, nextSurahTotal) : 1;

            ref.currentPlayingSurah = nextSurahId;
            ref.currentPlayingAyah = startingAyahOfNextSurah;
            setCurrentPlayingSurah(nextSurahId);
            setCurrentPlayingAyah(startingAyahOfNextSurah);

            setSelectedSurahId(nextSurahId);
            setPendingPlayInfo({ surahId: nextSurahId, ayahNum: startingAyahOfNextSurah, isFirstPlay: true });
          } else {
            // Reached absolute sequence end! Let's check multi-surah repeats loops
            const nextSurahRepeatVal = ref.currentSurahRepeat + 1;
            const maxSurahRepeats = isRangeSurat ? ref.surahRepeatCount : 1;

            if (isRangeSurat && nextSurahRepeatVal < maxSurahRepeats) {
              ref.currentSurahRepeat = nextSurahRepeatVal;
              setCurrentSurahRepeat(nextSurahRepeatVal);

              const startSurahTotal = SURAH_AYAH_COUNTS[startS - 1] || 7;
              const startingAyahOfStartSurah = isRangeAyat ? Math.min(ref.startAyah, startSurahTotal) : 1;

              ref.currentPlayingSurah = startS;
              ref.currentPlayingAyah = startingAyahOfStartSurah;
              setCurrentPlayingSurah(startS);
              setCurrentPlayingAyah(startingAyahOfStartSurah);

              setSelectedSurahId(startS);
              setPendingPlayInfo({ surahId: startS, ayahNum: startingAyahOfStartSurah, isFirstPlay: true });
            } else {
              // ALL LOOPS AND ENGINES SUCCESSFULLY RESOLVED! 🎉
              stopPlayback();
              if (soundSynth && soundSynth.playSuccess) soundSynth.playSuccess();
            }
          }
        }
      }
    };
  };

  // Keep manual play cards tapping fully mapped to the looping rules!
  const handlePlayBismillah = (isAutoAdvance = false) => {
    if (!selectedSurahId) return;
    if (!isAutoAdvance && soundSynth && soundSynth.playPop) soundSynth.playPop();

    if (playingKey === "bismillah") {
      stopPlayback();
      return;
    }

    // Direct single play resets advanced multi-surah sequence transitions
    const ref = stateRef.current;
    ref.isPlayingAdvanced = false;
    setIsPlayingAdvanced(false);

    playAdvancedAyahInner(selectedSurahId, 1, true);
  };

  const handlePlayVerseAudio = (verseNum: number, isAutoAdvance = false) => {
    if (!selectedSurahId) return;
    if (!isAutoAdvance && soundSynth && soundSynth.playPop) soundSynth.playPop();

    const key = `${selectedSurahId}:${verseNum}`;
    if (playingKey === key) {
      stopPlayback();
      return;
    }

    // Direct single play resets advanced multi-surah sequence transitions
    const ref = stateRef.current;
    ref.isPlayingAdvanced = false;
    setIsPlayingAdvanced(false);

    playAdvancedAyahInner(selectedSurahId, verseNum, false);
  };

  return (
    <div className="w-full h-full flex-1 flex flex-col overflow-hidden bg-[#FDFBF7] relative">
      
      {/* Dynamic Header */}
      <header className="h-16 shrink-0 bg-white border-b border-[#EBE6D9] px-4 flex items-center justify-between z-10 shadow-xs">
        <div className="flex items-center gap-3">
          {selectedSurah ? (
            <button
              id="quran-btn-back"
              onClick={() => {
                if (soundSynth && soundSynth.playPop) soundSynth.playPop();
                setSelectedSurahId(null);
              }}
              className="p-1 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 cursor-pointer"
              title="Kembali ke Daftar Surat"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          ) : (
            <div className="bg-[#48C78E]/10 p-2 rounded-xl text-[#48C78E]">
              <BookOpen className="w-5 h-5" />
            </div>
          )}
          <div className="text-left max-w-[140px] xs:max-w-[200px] sm:max-w-none">
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight truncate">
              QURAN PLAYER
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              {selectedSurah 
                ? `${selectedSurah.transliteration} • ${selectedSurah.verses} ${lang === "ID" ? "Ayat" : "Verses"}` 
                : (lang === "ID" ? "114 Surat Terindeks" : "114 Surahs Indexed")
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 xs:gap-2">
          {/* Advanced Playback Settings Toggle Button */}
          <button
            onClick={() => {
              if (soundSynth && soundSynth.playPop) soundSynth.playPop();
              setIsExpanded(!isExpanded);
            }}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              isExpanded
                ? "bg-emerald-50 border-emerald-300 text-emerald-600 font-extrabold animate-[pulse_2s_infinite]"
                : "border-[#EBE6D9] hover:bg-slate-50 text-slate-500"
            }`}
            title="Pengaturan Putar Lanjutan"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="text-[10px] hidden xs:inline tracking-wider uppercase font-black">
              Putar Lanjutan
            </span>
          </button>

          {selectedSurah && (
            <>
              {/* Prev Surah Arrow */}
              <button
                id="quran-btn-prev-surah"
                onClick={handlePrevSurah}
                className="p-1.5 rounded-xl border border-[#EBE6D9] hover:bg-slate-50 text-slate-600 active:scale-95 transition-all cursor-pointer"
                title="Surat Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Next Surah Arrow */}
              <button
                id="quran-btn-next-surah"
                onClick={handleNextSurah}
                className="p-1.5 rounded-xl border border-[#EBE6D9] hover:bg-slate-50 text-slate-600 active:scale-95 transition-all cursor-pointer"
                title="Surat Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="text-right ml-1 sm:ml-2 min-w-[45px] sm:min-w-[50px] hidden xxs:block font-sans">
                <span className="text-sm font-bold font-arabic text-emerald-600 block leading-tight select-none">
                  {selectedSurah.arabic}
                </span>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Container Stage */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!selectedSurah ? (
            /* SURAH SELECTION VIEW */
            <motion.div
              key="selection-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex flex-col p-4 pb-24 overflow-hidden"
            >
              {/* Search Bar Input */}
              <div className="relative shrink-0 mb-4">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-[#A39E93]">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder={
                    lang === "ID"
                      ? "Cari nomor surat, arti, atau nama (Yasin, Lukman)..."
                      : "Search surah number, meaning, or name (Yasin, Lukman)..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white border-2 border-[#EBE6D9] text-[#3A405A] text-sm font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#48C78E] shadow-xs transition-colors"
                />
                {searchQuery !== "" && (
                  <button
                    onClick={() => {
                      if (soundSynth && soundSynth.playPop) soundSynth.playPop();
                      setSearchQuery("");
                    }}
                    className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Hapus Pencarian"
                  >
                    <X className="w-5 h-5 bg-slate-100 rounded-full p-0.5" />
                  </button>
                )}
              </div>

              {/* Scrollable Surah Cards List */}
              <div id="quran-surah-list" className="flex-1 overflow-y-auto pr-1 space-y-3 pb-4 scrollbar-none">
                {filteredSurahs.length > 0 ? (
                  filteredSurahs.map((surah) => (
                    <button
                      key={surah.id}
                      onClick={() => {
                        if (soundSynth && soundSynth.playPop) soundSynth.playPop();
                        setSelectedSurahId(surah.id);
                      }}
                      className="w-full text-left bg-white rounded-2xl border border-slate-100/80 p-3.5 flex items-center justify-between gap-3 shadow-sm hover:border-emerald-100/80 transition-all active:scale-[0.99] cursor-pointer"
                    >
                      {/* Left Area: Symmetrical Emerald Index Circle Badge */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-emerald-50 text-[#48C78E] font-black text-xs flex items-center justify-center flex-shrink-0">
                          {surah.id}
                        </div>

                        {/* Middle Area: Clean Latin Typography */}
                        <div className="flex flex-col truncate">
                          <h3 className="text-xs font-black text-slate-800 tracking-tight">{surah.transliteration}</h3>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
                            {surah.translation} • <span className="text-slate-400/80 font-bold">{surah.verses} {lang === 'ID' ? 'Ayat' : 'Verses'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right Area: Large, Unclipped Arabic Calligraphy Font */}
                      <div className="font-arabic text-lg text-slate-700 font-normal flex-shrink-0 pr-1 select-none">
                        {surah.arabic}
                      </div>
                    </button>
                  ))
                ) : (
                  /* Safe State Empty Feedback */
                  <div className="flex flex-col items-center justify-center py-16 text-center select-none">
                    <span className="text-3xl mb-3">🔍</span>
                    <p className="text-xs font-bold text-slate-400">
                      {lang === 'ID' ? 'Surat tidak ditemukan' : 'Surah not found'}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* VERSE VIEW & HIGH-PRECISION AUDIO PLAYER CARD STACK */
            <motion.div
              key="verse-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex flex-col p-4 pb-24 overflow-hidden"
            >
              {/* BRAND-NEW STICKY EXPANDABLE HEADER PANEL */}
              <div id="quran-sticky-panel" className="w-full shrink-0 z-30 mb-3 bg-[#FAF8F5] border border-[#EBE6D9] rounded-2xl shadow-xs overflow-hidden font-sans transition-all duration-300">
                {/* 1. COMPRESSED STICKY HEADER ROW (< 40PX) */}
                <div 
                  onClick={() => {
                    if (soundSynth && soundSynth.playPop) soundSynth.playPop();
                    setIsExpanded(!isExpanded);
                  }}
                  className="h-[38px] flex items-center justify-between px-3 cursor-pointer select-none hover:bg-emerald-50/10 active:bg-emerald-55/20 transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-slate-700 truncate tracking-tight">
                      [🎯 {rangeAyatEnabled ? `Ayat ${startAyah}-${endAyah}` : (lang === "ID" ? "Semua Ayat" : "All Verses")}] • 🔂 Ulang: {ayahRepeatCount}x • 🔁 Grup: {rangeAyatEnabled ? `${rangeRepeatCount}x` : "1x"}{rangeSuratEnabled ? ` • 📖 Sqs: QS ${startSurah}-${endSurah} (${surahRepeatCount}x)` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pl-1.5">
                    {isPlayingAdvanced && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                    <span className="text-xs font-black text-emerald-600 tracking-wider">
                      {isExpanded ? "▲ Tutup" : "⚙️ Setelan"}
                    </span>
                  </div>
                </div>

                {/* 2. COLLAPSIBLE SETTING DRAWER */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      id="quran-settings-drawer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="border-t border-[#EBE6D9] overflow-hidden"
                    >
                      <div className="p-3 bg-white space-y-3">
                        {/* QARI SELECTOR SELECT */}
                        <div className="flex items-center justify-between gap-2.5 pb-2 border-b border-[#F2EDE2]">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">🗣️ Suara Qari</span>
                          <select
                            id="qari-override-compact-select"
                            value={localQari}
                            onChange={(e) => {
                              const value = e.target.value;
                              setLocalQari(value);
                              if (typeof window !== "undefined") {
                                localStorage.setItem("wali_tahfidz_global_qari", value);
                              }
                            }}
                            className="bg-[#FAF8F5] border border-[#EBE6D9] text-xs font-bold rounded-lg px-2 py-1 outline-none focus:border-emerald-500 max-w-[150px]"
                          >
                            {Object.entries(WALI_TAFHIDZ_QARI_REGISTRY)
                              .filter(([key]) => key !== 'ar.alakahdar')
                              .map(([key, value]) => (
                                <option key={key} value={key}>{value.displayName}</option>
                              ))}
                          </select>
                        </div>

                        {/* REPEAT AYAT TIMER RANGE SLIDER */}
                        <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#F2EDE2]">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider shrink-0">🔂 Ulangi Setiap Ayat</span>
                          <div className="flex items-center gap-2 flex-1 max-w-[170px]">
                            <input
                              type="range" min="1" max="15"
                              value={ayahRepeatCount}
                              onChange={(e) => setAyahRepeatCount(Number(e.target.value))}
                              className="w-full h-1 bg-slate-100 accent-emerald-500 rounded-lg cursor-pointer appearance-none shrink"
                            />
                            <span className="text-xs font-black text-emerald-600 w-8 text-right shrink-0">{ayahRepeatCount}x</span>
                          </div>
                        </div>

                        {/* RANGE AYAT SELECTORS */}
                        <div className="pb-2 border-b border-[#F2EDE2] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">🎯 Set Range Ayat</span>
                            <button
                              id="btn-range-ayat-toggle"
                              onClick={() => setRangeAyatEnabled(!rangeAyatEnabled)}
                              className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border transition-colors ${
                                rangeAyatEnabled ? "bg-emerald-55/10 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"
                              }`}
                            >
                              {rangeAyatEnabled ? "AKTIF" : "NONAKTIF"}
                            </button>
                          </div>
                          {rangeAyatEnabled && (
                            <div className="grid grid-cols-3 gap-2 items-center bg-[#FAF8F5] p-2 rounded-xl border border-[#EBE6D9]">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-400 mb-0.5">Dari Ayat</span>
                                <input
                                  type="number" min="1" max={selectedSurah ? selectedSurah.verses : 286}
                                  value={startAyah}
                                  onChange={(e) => {
                                    const v = Math.max(1, Number(e.target.value));
                                    setStartAyah(v);
                                    if (v > endAyah) setEndAyah(v);
                                  }}
                                  className="w-full bg-white border border-[#EBE6D9] rounded-lg px-2 py-0.5 text-xs font-black text-center"
                                />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-400 mb-0.5">Sampai Ayat</span>
                                <input
                                  type="number" min={startAyah} max={selectedSurah ? selectedSurah.verses : 286}
                                  value={endAyah}
                                  onChange={(e) => setEndAyah(Math.max(startAyah, Math.min(selectedSurah ? selectedSurah.verses : 286, Number(e.target.value))))}
                                  className="w-full bg-white border border-[#EBE6D9] rounded-lg px-2 py-0.5 text-xs font-black text-center"
                                />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-400 mb-0.5">Ulang (kali)</span>
                                <input
                                  type="number" min="1" max="100"
                                  value={rangeRepeatCount}
                                  onChange={(e) => setRangeRepeatCount(Math.max(1, Number(e.target.value)))}
                                  className="w-full bg-white border border-[#EBE6D9] rounded-lg px-2 py-0.5 text-xs font-black text-center"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SEQUENCE MULTI SURAH */}
                        <div className="pb-2 border-b border-[#F2EDE2] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">📖 Sequence Multi-Surat</span>
                            <button
                              id="btn-range-surat-toggle"
                              onClick={() => setRangeSuratEnabled(!rangeSuratEnabled)}
                              className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border transition-colors ${
                                rangeSuratEnabled ? "bg-emerald-55/10 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"
                              }`}
                            >
                              {rangeSuratEnabled ? "AKTIF" : "NONAKTIF"}
                            </button>
                          </div>
                          {rangeSuratEnabled && (
                            <div className="grid grid-cols-3 gap-2 items-center bg-[#FAF8F5] p-2 rounded-xl border border-[#EBE6D9]">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-400 mb-0.5">Dari QS</span>
                                <select
                                  value={startSurah}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setStartSurah(v);
                                    if (v > endSurah) setEndSurah(v);
                                  }}
                                  className="w-full bg-white border border-[#EBE6D9] rounded-lg px-1 py-0.5 text-[10px] font-black text-center outline-none"
                                >
                                  {(quranMetaData as any[]).filter(s => s && s.id > 0).map(s => (
                                    <option key={s.id} value={s.id}>{s.id}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-400 mb-0.5">Sampai QS</span>
                                <select
                                  value={endSurah}
                                  onChange={(e) => setEndSurah(Math.max(startSurah, Number(e.target.value)))}
                                  className="w-full bg-white border border-[#EBE6D9] rounded-lg px-1 py-0.5 text-[10px] font-black text-center outline-none"
                                >
                                  {(quranMetaData as any[]).filter(s => s && s.id >= startSurah).map(s => (
                                    <option key={s.id} value={s.id}>{s.id}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-400 mb-0.5">Ulang (kali)</span>
                                <input
                                  type="number" min="1" max="100"
                                  value={surahRepeatCount}
                                  onChange={(e) => setSurahRepeatCount(Math.max(1, Number(e.target.value)))}
                                  className="w-full bg-white border border-[#EBE6D9] rounded-lg px-2 py-0.5 text-xs font-black text-center"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ACTIVE SESSION STATUS FEEDBACK */}
                        {isPlayingAdvanced && (
                          <div className="flex items-center justify-between bg-emerald-50/50 p-2 rounded-xl border border-emerald-100 text-[10px] font-bold">
                            <span className="text-emerald-700 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              QS {currentPlayingSurah}:{currentPlayingAyah}
                            </span>
                            <span className="text-slate-400">
                              Ulang: {currentAyahRepeat+1}/{ayahRepeatCount}
                            </span>
                          </div>
                        )}

                        {/* CORE COMBINED TRIGGER ACTION */}
                        <div className="flex gap-2 pt-1">
                          {isPlayingAdvanced && (
                            <button
                              id="quran-btn-stop"
                              onClick={() => {
                                if (soundSynth && soundSynth.playPop) soundSynth.playPop();
                                stopPlayback();
                              }}
                              className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[11px] tracking-wider uppercase rounded-xl flex items-center justify-center gap-1 shadow-sm active:scale-98 transition-all cursor-pointer"
                            >
                              <Square className="w-3 h-3 fill-white" />
                              STOP
                            </button>
                          )}
                          <button
                            id="quran-btn-apply"
                            onClick={() => {
                              if (soundSynth && soundSynth.playPop) soundSynth.playPop();
                              startAdvancedSession();
                              setIsExpanded(false);
                            }}
                            className="flex-3 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[11px] tracking-wider uppercase rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            ▶️ TERAPKAN & PUTAR AUDIO
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {loadingVerses ? (
                /* LOADING LOADING INDICATOR */
                <div className="flex-1 flex flex-col items-center justify-center text-center select-none animate-fade-in">
                  <div className="w-12 h-12 border-4 border-[#48C78E] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mt-4">
                    Memuat Ayat-Ayat Al-Quran...
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Mengambil teks Utsmani dan Terjemah...</p>
                </div>
              ) : errorText ? (
                /* ERROR HANDLING RECOVERY STATE */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
                    <VolumeX className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">{errorText}</p>
                  <button
                    onClick={() => {
                      // Trigger atomic fetch reloading
                      setSelectedSurahId(selectedSurahId);
                    }}
                    className="mt-4 px-6 py-2.5 bg-[#48C78E] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#3ebe82] active:scale-95 transition-transform cursor-pointer"
                  >
                    Muat Ulang
                  </button>
                </div>
              ) : (
                /* SCROLLABLE VERSE LIST STACK */
                <div id="quran-verses-container" className="flex-1 overflow-y-auto pr-1 space-y-4 pb-4 scrollbar-none scroll-smooth">
                  
                  {/* BEAUTIFUL ARABIC BISMILLAH PLAYABLE CARD */}
                  <div
                    id="quran-ayah-bismillah"
                    onClick={() => handlePlayBismillah()}
                    className={`w-full bg-white p-6 rounded-2xl border ${
                      playingKey === "bismillah"
                        ? "border-[#48C78E] ring-4 ring-[#48C78E]/15 shadow-md transform scale-[1.015]"
                        : "border-[#EBE6D9] hover:border-emerald-200 shadow-xs"
                    } text-center relative overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ease-out select-none`}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#48C78E]/30" />
                    
                    {playingKey === "bismillah" && (
                      <span className="absolute top-3 right-4 bg-emerald-50 text-[#48C78E] text-[9.5px] font-extrabold tracking-widest px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 animate-pulse">
                        <AudioLines className="w-3.5 h-3.5 animate-[bounce_0.6s_infinite]" />
                        MEMUTAR
                      </span>
                    )}

                    <span className="font-arabic text-2xl text-emerald-700 leading-normal tracking-wide">
                      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </span>
                    <span className="text-[9px] font-sans font-black text-slate-400 mt-2 uppercase tracking-widest leading-none">
                      Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang
                    </span>
                  </div>

                  {/* VERSE CARD LIST STACK */}
                  {versesList.map((ayah) => {
                    const isPlayingCurrent = playingKey === `${selectedSurahId}:${ayah.numberInSurah}`;
                    return (
                      <div
                        key={ayah.numberInSurah}
                        id={`quran-ayah-${selectedSurahId}-${ayah.numberInSurah}`}
                        onClick={() => handlePlayVerseAudio(ayah.numberInSurah)}
                        className={`w-full bg-white p-6 rounded-2xl border ${
                          isPlayingCurrent 
                            ? "border-[#48C78E] ring-4 ring-[#48C78E]/15 shadow-md transform scale-[1.015]" 
                            : "border-[#EBE6D9] hover:border-emerald-200 shadow-xs"
                        } text-left relative pt-8 transition-all duration-500 ease-out cursor-pointer select-none`}
                      >
                        {/* Absolute positioned top-left indicator */}
                        <span className="absolute top-3.5 left-4 text-[9px] font-sans font-black text-slate-400 tracking-widest uppercase flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#48C78E]" />
                          AYAT {ayah.numberInSurah}
                        </span>

                        {/* Playing Status icon at top-right */}
                        {isPlayingCurrent && (
                          <span className="absolute top-3 right-4 bg-emerald-50 text-[#48C78E] text-[9.5px] font-extrabold tracking-widest px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 animate-pulse">
                            <AudioLines className="w-3.5 h-3.5 animate-[bounce_0.6s_infinite]" />
                            MEMUTAR
                          </span>
                        )}

                        {/* Centered Arabic Text with generous line height for harakat clearance */}
                        <div className="w-full text-center pb-4 pt-4 shrink-0">
                          <p 
                            dir="rtl"
                            className="font-arabic text-3xl font-normal text-slate-800 leading-[1.8] select-none text-right"
                          >
                            {ayah.arabicText}
                            {/* Standard circular verse end symbol decoration wrapper */}
                            <span className="font-sans inline-block text-xs font-black text-emerald-600 border-2 border-emerald-500 rounded-full w-6 h-6 text-center leading-[20px] select-none mr-3 align-middle">
                              {ayah.numberInSurah}
                            </span>
                          </p>
                        </div>

                        {/* Indonesian Translation translation below the Arabic text */}
                        <div className="border-t border-dashed border-[#EBE6D9] pt-4 mt-2">
                          <p className="text-slate-500 font-sans text-sm font-semibold leading-relaxed">
                            {ayah.indoText}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
