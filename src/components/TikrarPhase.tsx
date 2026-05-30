import React, { useState, useEffect } from "react";
import { resolveQariAudioId, WALI_TAFHIDZ_QARI_REGISTRY } from "../hooks/useAyahPlayer";

interface AyahData {
  text: string;
  arabicText?: string;
  surah_name?: string;
  surahName?: string;
  ayah_number: number;
  ayahNumber?: number;
  surah: number;
  surahNumber?: number;
}

interface TikrarPhaseProps {
  ayahData: AyahData;
  targetCount?: number;
  onPhaseComplete?: () => void;
  onComplete?: () => void;
  onPlayHelp?: () => void;
  playWordAudio?: (surahId: number, ayahNumber: number, wordIndex: number) => void;
  playFullAyahAudio?: (surahId: number, ayahNumber: number) => void;
  soundSynth?: any;
}

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

export default function TikrarPhase({
  ayahData,
  targetCount = 10,
  onPhaseComplete,
  onComplete,
  onPlayHelp,
  playWordAudio,
  playFullAyahAudio,
  soundSynth,
}: TikrarPhaseProps) {
  const [tikrarCount, setTikrarCount] = useState<number>(0);
  const [isDelayedCompleting, setIsDelayedCompleting] = useState(false);

  // Resolved clean data from polymorphic props for safety
  const surahId = ayahData.surah || ayahData.surahNumber || 1;
  const ayahNum = ayahData.ayah_number || ayahData.ayahNumber || 1;
  const arabicText = ayahData.text || ayahData.arabicText || "";
  const surahName = ayahData.surah_name || ayahData.surahName || "Surat";

  const words = arabicText.trim().split(/\s+/);

  // Helper local audio triggers in case parent callbacks are absent
  const handleWordClick = (wordIndex: number) => {
    if (playWordAudio) {
      playWordAudio(surahId, ayahNum, wordIndex);
    } else {
      const pad3 = (num: number): string => String(num).padStart(3, "0");
      const sss = pad3(surahId);
      const vvv = pad3(ayahNum);
      const www = pad3(wordIndex);
      const url = `https://audios.quranwbw.com/words/${surahId}/${sss}_${vvv}_${www}.mp3`;
      const audio = new Audio(url);
      audio.play().catch((err) => {
        console.warn("Wbw audio unavailable:", err);
      });
    }
  };

  const handlePlayFullAyah = () => {
    if (playFullAyahAudio) {
      playFullAyahAudio(surahId, ayahNum);
    } else if (onPlayHelp) {
      onPlayHelp();
    } else {
      // Direct CDN fallback audio
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
      audio.play().catch((err) => {
        console.warn("Full ayah audio fallback offline:", err);
      });
    }
  };

  // Safe handler to increment harvest and trigger delays
  const handleLancarClick = () => {
    if (isDelayedCompleting || tikrarCount >= 10) return;

    if (soundSynth && soundSynth.playProgressUp) {
      soundSynth.playProgressUp();
    }

    const nextCount = tikrarCount + 1;
    setTikrarCount(nextCount);

    if (nextCount === 10) {
      if (soundSynth && soundSynth.playSuccess) {
        soundSynth.playSuccess();
      }
      setIsDelayedCompleting(true);
      setTimeout(() => {
        if (onPhaseComplete) {
          onPhaseComplete();
        } else if (onComplete) {
          onComplete();
        }
        setIsDelayedCompleting(false);
      }, 1500);
    }
  };

  // Emojis mapping for harvest fruit types
  const fruits = ["🍎", "🍊", "🍉", "🍓", "🍍", "🥭", "🍒", "🍇", "🍋", "🍑"];
  const getFruitForIndex = (index: number) => {
    return fruits[index % fruits.length];
  };

  // If a new ayah arrives, reset states
  useEffect(() => {
    setTikrarCount(0);
    setIsDelayedCompleting(false);
  }, [surahId, ayahNum]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-start py-2 text-[#3A405A]">
      {/* Top Tag Header */}
      <div className="text-center w-full max-w-md px-2 flex flex-col items-center mb-1">
        <span className="bg-amber-100 text-amber-800 text-[10px] font-black tracking-widest uppercase px-4 py-1.5 rounded-full border border-amber-200 select-none">
          Ulangi Sendiri Hafalanmu 🗣️
        </span>
      </div>

      {/* Interactive Arabic Quran Text Block */}
      <div className="bg-white py-4 px-6 rounded-3xl border border-slate-50 shadow-sm w-full max-w-md text-center mt-3 mb-0 relative overflow-hidden pt-8">
        <span className="absolute top-3 left-4 text-[10px] md:text-[11px] font-sans font-extrabold text-slate-400 tracking-widest uppercase">
          {surahName} : {ayahNum}
        </span>
        <div
          dir="rtl"
          className="w-full text-center font-arabic text-2xl md:text-3xl text-slate-800 leading-[1.8] pt-8 pb-2 select-none"
        >
          {words.map((word, index) => {
            const wordIndex1Based = index + 1;
            return (
              <button
                key={index}
                onClick={() => handleWordClick(wordIndex1Based)}
                style={{ display: "inline-block", direction: "rtl" }}
                className="inline-block text-2xl md:text-3xl font-normal text-slate-800 hover:text-emerald-500 active:scale-95 active:text-orange-400 transition-all cursor-pointer mx-2 my-1 px-0.5 rounded-xl outline-none"
              >
                {word}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] md:text-xs font-semibold text-slate-400 tracking-wider uppercase mt-3 border-t border-dashed border-slate-100 pt-3 text-center">
          💡 PANDUAN MAKHRAJ: KETUK PER KATA UNTUK DETAIL AUDIO
        </p>
      </div>

      {/* Fruit Basket Reward Gamification Card */}
      <div className="bg-white p-4 rounded-3xl border border-yellow-100 shadow-xs w-full max-w-md mt-3">
        <p className="text-[10px] font-black text-center uppercase tracking-widest text-[#A39E93] mb-3 leading-none">
          🧺 Keranjang Buah Hasil Tikrar Hafalanmu
        </p>

        {/* 10 dynamic fruit/placeholder slots */}
        <div className="grid grid-cols-5 gap-2 justify-center">
          {Array.from({ length: 10 }).map((_, idx) => {
            const isCollected = idx < tikrarCount;
            return (
              <div key={idx} className="flex items-center justify-center">
                {isCollected ? (
                  <div className="text-3xl animate-[bounce_0.5s_ease-out] w-12 h-12 flex items-center justify-center bg-orange-50 rounded-2xl border border-orange-100 shadow-sm select-none animate-wiggle-once">
                    {getFruitForIndex(idx)}
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-300 select-none">
                    {idx + 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dynamic score message */}
        <p className="text-center text-[10px] font-bold leading-none uppercase tracking-wide mt-2.5 text-slate-600">
          {tikrarCount === 10 ? (
            <span className="text-emerald-500 font-extrabold animate-pulse text-xs">
              Masya Allah, Waktunya Panen! 🧺
            </span>
          ) : (
            `MAJU: ${tikrarCount}/10 KALI PANEN BUAH`
          )}
        </p>
      </div>

      {/* Side-by-side Action Tactile Buttons */}
      <div className="flex gap-4 w-full max-w-md mt-4 px-2">
        {/* Play Help Button */}
        <button
          onClick={handlePlayFullAyah}
          className="w-20 h-14 bg-[#F4D06F] rounded-2xl flex items-center justify-center shadow-md active:scale-90 transition-transform select-none cursor-pointer hover:bg-[#eec654] outline-none"
        >
          <span className="text-2xl">🔊</span>
        </button>

        {/* Lancar Completion Button */}
        <button
          onClick={handleLancarClick}
          disabled={isDelayedCompleting}
          className={`flex-1 h-14 bg-[#48C78E] rounded-2xl flex items-center justify-center shadow-md active:scale-95 transition-transform select-none cursor-pointer hover:bg-[#3ebe82] outline-none ${
            isDelayedCompleting ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          <span className="text-2xl">👍</span>
        </button>
      </div>
    </div>
  );
}
