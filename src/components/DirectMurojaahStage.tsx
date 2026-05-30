import React, { useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, Award, ArrowLeft, RefreshCw, CheckCircle } from "lucide-react";
import { ChildProfile } from "../types";
import { getArabicFontClasses } from "./ChildPlayScreen";
import { resolveQariAudioId, getQariUiMetadata, WALI_TAFHIDZ_QARI_REGISTRY } from "../hooks/useAyahPlayer";

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


function getEveryAyahId(surah: number, ayah: number): string {
  const s = surah.toString().padStart(3, '0');
  const a = ayah.toString().padStart(3, '0');
  return `${s}${a}`;
}

function getGlobalAyahNumber(surah: number, ayah: number): number {
  let total = 0;
  for (let i = 0; i < surah - 1; i++) {
    total += surahAyahCounts[i] || 0;
  }
  return total + ayah;
}

interface AyahObj {
  id?: string;
  surah: number;
  surah_name: string;
  ayah_number: number;
  text: string;
}

interface DirectMurojaahStageProps {
  mode: "DAILY_REVIEW" | "ROTATIONAL_GAME";
  sessionAyahs: AyahObj[];
  activeChild: ChildProfile | null;
  soundSynth?: any;
  onRatingSelected: (rating: "lulus" | "ulangi") => void;
  onBack: () => void;
}

export default function DirectMurojaahStage({
  mode,
  sessionAyahs = [],
  activeChild,
  soundSynth,
  onRatingSelected,
  onBack,
}: DirectMurojaahStageProps) {
  const [isPlayingSnippet, setIsPlayingSnippet] = useState(false);
  const [activeSnippetAudio, setActiveSnippetAudio] = useState<HTMLAudioElement | null>(null);
  const [revealClue, setRevealClue] = useState(false);
  const [randomSnippetAyah, setRandomSnippetAyah] = useState<AyahObj | null>(null);

  // Gesture Lock states for Parent Panel in Qarib/Sabiqu
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isParentUnlocked, setIsParentUnlocked] = useState<boolean>(false);
  const holdIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Pagination for long surahs (chunking) to support one-sitting muraajah comfortably
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Reset page when assignment changes
  useEffect(() => {
    setCurrentPage(0);
  }, [sessionAyahs]);

  const startHold = () => {
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          clearInterval(holdIntervalRef.current!);
          setIsParentUnlocked(true);
          if (soundSynth && soundSynth.playCelebrate) {
            soundSynth.playCelebrate();
          }
          return 100;
        }
        return prev + 5; // increments by 5% every 100ms, total 2 seconds
      });
    }, 100);
  };

  const stopHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
    }
    setHoldProgress((prev) => (prev >= 100 ? 100 : 0));
  };

  const longPressTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const startLongPressTimer = () => {
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = setTimeout(() => {
      if (soundSynth && soundSynth.playCelebrate) {
        soundSynth.playCelebrate();
      }
      const lockGate = document.getElementById("child-play-lock-gate");
      if (lockGate) {
        lockGate.click();
      }
    }, 1500);
  };

  const cancelLongPressTimer = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    };
  }, []);

  // Setup smart random snippet helper for Rotational Game (SABIQU)
  const pickRandomAyah = useCallback(() => {
    if (sessionAyahs.length === 0) return;
    
    // Filter out the absolute last verse of any surah to avoid rabt boundary confusion
    const candidates = sessionAyahs.filter((ayah) => {
      const maxVerses = surahAyahCounts[ayah.surah - 1] || 999;
      return ayah.ayah_number !== maxVerses;
    });

    // Fallback to all verses if none match the filter
    const finalCandidates = candidates.length > 0 ? candidates : sessionAyahs;
    const randIndex = Math.floor(Math.random() * finalCandidates.length);
    setRandomSnippetAyah(finalCandidates[randIndex]);
    setRevealClue(false);
  }, [sessionAyahs]);

  // Setup random snippet for Rotational Game (SABIQU)
  useEffect(() => {
    if (mode === "ROTATIONAL_GAME") {
      pickRandomAyah();
    } else {
      setRandomSnippetAyah(null);
    }
    setRevealClue(false);
  }, [mode, sessionAyahs, pickRandomAyah]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (activeSnippetAudio) {
        activeSnippetAudio.pause();
      }
    };
  }, [activeSnippetAudio]);

  const playRandomSnippet = useCallback(() => {
    // If already playing, stop it
    if (activeSnippetAudio) {
      activeSnippetAudio.pause();
      setIsPlayingSnippet(false);
      setActiveSnippetAudio(null);
      return;
    }

    const targetAyah = randomSnippetAyah || sessionAyahs[0];
    if (!targetAyah) return;

    if (soundSynth && soundSynth.playPop) {
      soundSynth.playPop();
    }

    const globalAyah = getGlobalAyahNumber(targetAyah.surah, targetAyah.ayah_number);
    const rawQari = typeof window !== "undefined" ? localStorage.getItem("wali_tahfidz_global_qari") || "ar.alafasy" : "ar.alafasy";
    const qari = resolveQariAudioId(rawQari);
    const qariMeta = WALI_TAFHIDZ_QARI_REGISTRY[rawQari];
    const bitrate = qariMeta?.bitrate || 128;
    
    let audioUrl = "";
    if (qariMeta?.cdn === "everyayah") {
      const eaId = getEveryAyahId(targetAyah.surah, targetAyah.ayah_number);
      audioUrl = `https://everyayah.com/data/${qariMeta.apiId}/${eaId}.mp3`;
    } else {
      audioUrl = `https://cdn.islamic.network/quran/audio/${bitrate}/${qari}/${globalAyah}.mp3`;
    }
    
    const audio = new Audio(audioUrl);
    
    setIsPlayingSnippet(true);
    setActiveSnippetAudio(audio);

    audio.play().catch((err) => {
      console.warn("Could not play random snippet audio:", err);
      setIsPlayingSnippet(false);
    });

    audio.onended = () => {
      setIsPlayingSnippet(false);
      setActiveSnippetAudio(null);
      if (soundSynth && soundSynth.playSuccess) {
        soundSynth.playSuccess();
      }
    };
  }, [randomSnippetAyah, sessionAyahs, activeSnippetAudio, soundSynth]);

  const stopSnippet = () => {
    if (activeSnippetAudio) {
      activeSnippetAudio.pause();
    }
    setIsPlayingSnippet(false);
    setActiveSnippetAudio(null);
  };

  const currentSurahName = sessionAyahs[0]?.surah_name || "Surah";
  const startAyahNum = sessionAyahs[0]?.ayah_number || 1;
  const endAyahNum = sessionAyahs[sessionAyahs.length - 1]?.ayah_number || startAyahNum;
  const surahLabel = `${currentSurahName} Ayat ${startAyahNum === endAyahNum ? startAyahNum : `${startAyahNum}-${endAyahNum}`}`;

  // Smart Pagination / Comfort Chunking variables for long surahs
  const CHUNK_SIZE = 5;
  const isDailyReview = mode === "DAILY_REVIEW";
  const numAyahs = sessionAyahs.length;
  const hasPagination = isDailyReview && numAyahs > CHUNK_SIZE;
  const totalPages = hasPagination ? Math.ceil(numAyahs / CHUNK_SIZE) : 1;
  const activeChunkAyahs = hasPagination
    ? sessionAyahs.slice(currentPage * CHUNK_SIZE, (currentPage + 1) * CHUNK_SIZE)
    : sessionAyahs;

  const startAyahNumActive = activeChunkAyahs[0]?.ayah_number || startAyahNum;
  const endAyahNumActive = activeChunkAyahs[activeChunkAyahs.length - 1]?.ayah_number || startAyahNumActive;
  const currentSurahNameActive = activeChunkAyahs[0]?.surah_name || currentSurahName;
  const activePageLabel = `${currentSurahNameActive} Ayat ${startAyahNumActive === endAyahNumActive ? startAyahNumActive : `${startAyahNumActive}-${endAyahNumActive}`}`;

  // Alias for Sabiq variables
  const showScript = revealClue;
  const setShowScript = setRevealClue;
  const handlePlaySnippet = playRandomSnippet;

  if (mode === "ROTATIONAL_GAME") {
    return (
      <div className="w-full h-full max-w-sm mx-auto flex flex-col items-center justify-between font-sans relative overflow-hidden">
        
        {/* Scrollable Upper Interactive Workspace Area */}
        <div className="w-full flex-1 overflow-y-auto flex flex-col items-center justify-start space-y-4 px-1 pb-4 scrollbar-none">
          {/* Compact Header Taxonomy (Replaces the broken empty box) */}
          <div className="w-full flex items-center justify-between px-1 mt-1 shrink-0">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 justify-start">
                <span className="bg-slate-100 text-slate-500 font-black text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider">📦 Sesi Sabiq</span>
                <span className="bg-purple-50 text-purple-600 font-black text-[8px] px-1.5 py-0.5 rounded border border-purple-100 uppercase tracking-wider">🎮 Tebak Ayat</span>
              </div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight mt-1 text-left">{surahLabel}</h2>
            </div>
          </div>

          {/* Pristine Unified Playground Card */}
          <div className="w-full bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm flex flex-col items-center gap-5 py-6">
            
            <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase flex items-center gap-1 select-none">
              🎙️ Tebak Kelanjutan Ayat Ini
            </span>

            {/* Audio Circle - Perfectly Seated inside the flex tree */}
            <div className="flex flex-col items-center gap-3 w-full">
              <button 
                type="button"
                onClick={() => handlePlaySnippet()}
                className={`w-20 h-20 rounded-full flex flex-col items-center justify-center gap-1 shadow-md transition-all active:scale-95 border-4 cursor-pointer select-none ${
                  isPlayingSnippet 
                    ? 'bg-emerald-500 border-emerald-100 text-white animate-pulse' 
                    : 'bg-[#48C78E] border-emerald-50 text-white hover:bg-[#3ebe82]'
                }`}
              >
                <span className="text-xl">{isPlayingSnippet ? '⏸️' : '🔊'}</span>
                <span className="text-[7.5px] font-black uppercase tracking-widest text-[#E1FBF0]">
                  {isPlayingSnippet ? 'Playing' : 'Main Snippet'}
                </span>
              </button>

              {sessionAyahs.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeSnippetAudio) {
                      activeSnippetAudio.pause();
                    }
                    setIsPlayingSnippet(false);
                    setActiveSnippetAudio(null);
                    pickRandomAyah();
                    if (soundSynth && soundSynth.playPop) soundSynth.playPop();
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-violet-50 hover:bg-violet-100/80 active:scale-95 border border-violet-150 text-violet-700 font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all select-none cursor-pointer"
                >
                  <span>🎲</span> <span>Acak Ayat Lain</span>
                </button>
              )}
            </div>

            {/* Toggle Script Button */}
            <button 
              type="button"
              onClick={() => setShowScript(!showScript)}
              className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-[0.99] w-full justify-center cursor-pointer"
            >
              <span>{showScript ? '👁️' : '👁️'}</span>
              <span>{showScript ? 'Sembunyikan Teks Hafalan' : 'Tampilkan Teks Hafalan'}</span>
            </button>

            {/* Clean Arabic Script Display (No nested clipping boxes) */}
            {showScript && (
              <div className="w-full border-t border-dashed border-slate-100 pt-4 text-center">
                <div 
                  dir="rtl" 
                  className={`w-full text-center font-arabic font-bold text-slate-800 tracking-wide select-none cursor-pointer active:scale-98 transition-transform ${getArabicFontClasses(activeChild?.settings?.arabicFontSize).container}`}
                  onMouseDown={startLongPressTimer}
                  onMouseUp={cancelLongPressTimer}
                  onMouseLeave={cancelLongPressTimer}
                  onTouchStart={startLongPressTimer}
                  onTouchEnd={cancelLongPressTimer}
                >
                  {sessionAyahs.map((ayah, i) => (
                    <React.Fragment key={i}>
                      <span 
                        className={`font-normal font-arabic ${getArabicFontClasses(activeChild?.settings?.arabicFontSize).word} ${
                          randomSnippetAyah?.ayah_number === ayah.ayah_number 
                            ? "text-emerald-600 bg-emerald-50/70 px-2 py-0.5 rounded-xl border border-dashed border-emerald-200" 
                            : "text-[#2F3E46]"
                        }`}
                      >
                        {ayah.text.trim()}
                      </span>
                      <span className="font-sans text-[11px] text-[#2D6A4F] border-2 border-[#2D6A4F]/30 rounded-full w-7 h-7 inline-flex items-center justify-center font-black mx-3 select-none translate-y-[-2px] bg-emerald-50/50">
                        {ayah.ayah_number}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pinned Binary Rating Drawer — ROTATIONAL_GAME (Tebak Ayat) */}
        <div className="w-full bg-[#FDFBF7] border-t-2 border-[#EBE6D9]/70 pt-3 pb-3 flex flex-col items-center shrink-0 mt-auto gap-2.5 px-4">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
            📢 Orang Tua: Anak bisa tebak kelanjutannya?
          </p>

          {/* 2-Button Binary Evaluation */}
          <div className="w-full flex items-center gap-3 shrink-0">
            <button
              id="parent-rate-ulangi-game"
              type="button"
              onClick={() => {
                stopSnippet();
                if (soundSynth && soundSynth.playPop) soundSynth.playPop();
                onRatingSelected("ulangi");
              }}
              className="flex-1 py-3.5 text-[11px] font-black rounded-2xl active:scale-95 transition-transform duration-150 cursor-pointer bg-slate-100 hover:bg-rose-50 active:bg-rose-100 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 shadow-xs active:translate-y-0.5 outline-none leading-none text-center"
            >
              🔁 Mau Diulang
            </button>

            <button
              id="parent-rate-hafal-game"
              type="button"
              onClick={() => {
                stopSnippet();
                if (soundSynth && soundSynth.playCelebrate) soundSynth.playCelebrate();
                onRatingSelected("lulus");
              }}
              className="flex-1 py-3.5 text-[11px] font-black rounded-2xl active:scale-95 transition-transform duration-150 cursor-pointer bg-[#1E5E3A] hover:bg-[#16462b] active:bg-[#0f301e] text-white border-b-4 border-emerald-950 shadow-sm active:border-b-0 active:translate-y-0.5 outline-none leading-none text-center"
            >
              ✅ Alhamdulillah, Hafal!
            </button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="w-full h-full max-w-sm mx-auto flex flex-col items-center justify-between font-sans relative overflow-hidden">
      
      {/* Scrollable Upper Interactive Workspace Area */}
      <div className="w-full flex-1 overflow-y-auto flex flex-col items-center justify-start space-y-4 px-1 pb-4 scrollbar-none">
        {/* Main Mode Layout Container */}
        {mode === "DAILY_REVIEW" && (
          /* DAILY_REVIEW (QARIB) Layout with Automatic Comfort-Chunking Pagination */
          <div className="w-full flex flex-col space-y-3.5 items-center">
            {/* Unified, Streamlined Session Information Card */}
            <div className="w-full bg-amber-50/40 rounded-2xl border-2 border-amber-200/50 py-3 px-4 text-center shrink-0 shadow-xs mt-1">
              <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">
                {activePageLabel}
              </h3>
              <p className="text-[10px] font-extrabold text-[#9A6D24] uppercase tracking-wider mt-1.5 font-sans">
                Orang Tua Menyimak • Murojaah Qarib
              </p>
            </div>

            {/* Pagination Progress Indicator if surah is long */}
            {hasPagination && (
              <div className="w-full px-1 flex flex-col gap-1.5 shrink-0 select-none">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🍃 Comfort Deck</span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  </span>
                  <span className="text-[9.5px] font-extrabold text-[#9A6D24] bg-amber-100/70 border border-amber-200/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-sans">
                    Halaman {currentPage + 1} dari {totalPages}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/20">
                  <div 
                    className="h-full bg-[#48C78E] rounded-full transition-all duration-300"
                    style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Full Quranic Amiri Text Box - displaying chunk of verses */}
            <div className="w-full bg-[#FAF8F5] py-10 px-6 sm:px-8 rounded-[32px] border-2 border-amber-200/40 shadow-xs text-center flex flex-col items-center justify-center min-h-[220px] cursor-pointer hover:bg-[#FAF8F5]/80 active:scale-99 transition-all relative">
              <div 
                dir="rtl" 
                className={`w-full text-center font-arabic text-slate-900 tracking-wide select-none ${getArabicFontClasses(activeChild?.settings?.arabicFontSize).container}`}
                onMouseDown={startLongPressTimer}
                onMouseUp={cancelLongPressTimer}
                onMouseLeave={cancelLongPressTimer}
                onTouchStart={startLongPressTimer}
                onTouchEnd={cancelLongPressTimer}
                title="Selesaikan Halaman ini, lalu ketuk lama 1.5 detik untuk menilai"
              >
                {activeChunkAyahs.map((ayah, i) => (
                  <React.Fragment key={i}>
                    <span className={`text-[#2F3E46] font-normal font-arabic ${getArabicFontClasses(activeChild?.settings?.arabicFontSize).word}`}>
                      {ayah.text.trim()}
                    </span>
                    <span className="font-sans text-[11px] text-[#2D6A4F] border-2 border-[#2D6A4F]/30 rounded-full w-7 h-7 inline-flex items-center justify-center font-black mx-3 select-none translate-y-[-2px] bg-emerald-50/50">
                      {ayah.ayah_number}
                    </span>
                  </React.Fragment>
                ))}
              </div>

              {/* Little locked badge reminding how to unlock */}
              <div className="absolute bottom-3 right-4 left-4 text-center">
                <span className="text-[7.5px] font-sans font-black text-slate-400 tracking-widest uppercase">
                  ⚡ SENTUH LAMA (1.5s) UNTUK EVALUASI WALI
                </span>
              </div>
            </div>

            {/* Children-friendly Pagination Buttons for long surahs */}
            {hasPagination && (
              <div className="w-full flex flex-col gap-2 pt-1.5 shrink-0 select-none">
                {currentPage < totalPages - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (soundSynth && soundSynth.playPop) soundSynth.playPop();
                      setCurrentPage((prev) => prev + 1);
                    }}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#48C78E] hover:bg-emerald-600 active:scale-95 transition-all text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-md border-b-4 border-emerald-800 cursor-pointer text-center leading-none scale-100 hover:scale-[1.01]"
                  >
                    <span>Lanjut Ayat Berikutnya 👉</span>
                    <span className="text-[9px] font-bold text-emerald-100 font-sans tracking-normal opacity-90">({currentPage === totalPages - 2 ? "Halaman Terakhir" : `Halaman ${currentPage + 2}`})</span>
                  </button>
                ) : (
                  <div className="w-full flex flex-col items-center justify-center gap-1.5 bg-emerald-50/40 p-4 border-2 border-dashed border-emerald-200 rounded-2xl shrink-0 text-center animate-scale-up-gentle">
                    <span className="text-lg">🎉</span>
                    <span className="text-[10.5px] font-black text-emerald-800 uppercase tracking-wide leading-snug">
                      MasyaAllah! Seluruh ayat telah disimak.
                    </span>
                    <span className="text-[8.5px] font-bold text-emerald-600 uppercase tracking-widest leading-none mt-1.5 animate-pulse">
                      💡 TEKAN LAMA KOTAK AYAT DI ATAS UNTUK MENILAI
                    </span>
                  </div>
                )}

                {currentPage > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (soundSynth && soundSynth.playPop) soundSynth.playPop();
                      setCurrentPage((prev) => Math.max(0, prev - 1));
                    }}
                    className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 font-extrabold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>👈 KEMBALI KE HALAMAN {currentPage}</span>
                  </button>
                )
                  /* Beautiful subtle page number shortcuts so parent can directly tap */
                }
                
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (soundSynth && soundSynth.playPop) soundSynth.playPop();
                        setCurrentPage(idx);
                      }}
                      className={`w-6 h-6 rounded-lg text-[9px] font-black font-mono flex items-center justify-center border transition-all cursor-pointer ${
                        currentPage === idx
                          ? "bg-[#48C78E] border-[#48C78E] text-white font-bold scale-110 shadow-xs"
                          : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pinned Binary Rating Drawer — DAILY_REVIEW (Murojaah Qarib) */}
      <div className="w-full bg-[#FDFBF7] border-t-2 border-[#EBE6D9]/70 pt-3 pb-3 flex flex-col items-center shrink-0 mt-auto gap-2.5 px-4">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
          📢 Orang Tua: Anak bisa baca dengan lancar?
        </p>

        {/* 2-Button Binary Evaluation */}
        <div className="w-full flex items-center gap-3 shrink-0">
          <button
            id="parent-rate-ulangi-review"
            type="button"
            onClick={() => {
              stopSnippet();
              if (soundSynth && soundSynth.playPop) soundSynth.playPop();
              onRatingSelected("ulangi");
            }}
            className="flex-1 py-3.5 text-[11px] font-black rounded-2xl active:scale-95 transition-transform duration-150 cursor-pointer bg-slate-100 hover:bg-rose-50 active:bg-rose-100 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 shadow-xs active:translate-y-0.5 outline-none leading-none text-center"
          >
            🔁 Mau Diulang
            🔁 Mau Diulang
          </button>

          <button
            id="parent-rate-hafal-review"
            type="button"
            onClick={() => {
              stopSnippet();
              if (soundSynth && soundSynth.playCelebrate) soundSynth.playCelebrate();
              onRatingSelected("lulus");
            }}
            className="flex-1 py-3.5 text-[11px] font-black rounded-2xl active:scale-95 transition-transform duration-150 cursor-pointer bg-[#1E5E3A] hover:bg-[#16462b] active:bg-[#0f301e] text-white border-b-4 border-emerald-950 shadow-sm active:border-b-0 active:translate-y-0.5 outline-none leading-none text-center"
          >
            ✅ Alhamdulillah, Hafal!
          </button>
        </div>
      </div>

    </div>
  );
}
