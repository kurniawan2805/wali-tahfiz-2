import React from "react";
import { Play, Pause } from "lucide-react";
import WordByWordText from "./WordByWordText";

interface AyahItem {
  id: string;
  arabicText: string;
  surahName: string;
  ayahNumber: number;
  surahNumber?: number;
}

interface IntegrationPhaseProps {
  sessionAyahs: AyahItem[];
  onFinishSession: () => void;
  onPlayFullAudio: (ayah: AyahItem) => void;
  activePlayingId?: string | null;
  targetCount?: number;
  onPlayRangeAudio?: () => void;
  isPlayingRange?: boolean;
}

export default function IntegrationPhase({
  sessionAyahs,
  onFinishSession,
  onPlayFullAudio,
  activePlayingId = null,
  targetCount = 3,
  onPlayRangeAudio,
  isPlayingRange = false,
}: IntegrationPhaseProps) {
  const [rabtCount, setRabtCount] = React.useState(0);

  const handleLancarClick = () => {
    const nextCount = rabtCount + 1;
    setRabtCount(nextCount);
    if (nextCount >= targetCount) {
      onFinishSession();
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 pb-6 select-none animate-fade-in">
      <div className="text-center max-w-md w-full px-4 mt-2">
        <div className="flex items-center justify-between bg-white/80 p-4 rounded-3xl border border-indigo-100 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col items-start text-left">
            <h2 className="text-lg font-black text-[#3A405A] tracking-tight">
              Sesi Sambung Ayat 🔗
            </h2>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                Target: {rabtCount}/{targetCount}
              </span>
            </div>
          </div>
          
          <button
            onClick={onPlayRangeAudio}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90 border-b-4 ${
              isPlayingRange 
                ? 'bg-rose-500 border-rose-700 text-white animate-pulse' 
                : 'bg-indigo-500 border-indigo-700 text-white hover:bg-indigo-600'
            }`}
          >
            <span className="text-2xl">{isPlayingRange ? '⏹️' : '🔊'}</span>
          </button>
        </div>
      </div>

      {/* Card List of Ayahs to integrate */}
      <div className="w-full max-w-md flex flex-col gap-5">
        {sessionAyahs.map((ayah, index) => {
          const sNum = ayah.surahNumber || 112; // fallback to Al-Ikhlas
          const isCurrentPlaying = activePlayingId === ayah.id;

        
  const handleLancarClick = () => {
    const nextCount = rabtCount + 1;
    setRabtCount(nextCount);
    if (nextCount >= targetCount) {
      onFinishSession();
    }
  };

  return (
            <div
              key={ayah.id}
              onClick={() => onPlayFullAudio(ayah)}
              className={`rounded-2xl p-4 border-2 shadow-sm flex flex-col gap-3 relative overflow-hidden transition-all active:scale-[0.99] select-none cursor-pointer hover:shadow-md ${
                isCurrentPlaying
                  ? "bg-amber-50/20 border-[#FFD93D] ring-4 ring-amber-400/10"
                  : "bg-white border-slate-100 hover:border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-2.5">
                <span className="text-slate-400 font-black text-[10px] tracking-widest uppercase">
                  {ayah.surahName} : Ayat {ayah.ayahNumber} ({index + 1})
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayFullAudio(ayah);
                  }}
                  className={`${
                    isCurrentPlaying
                      ? "bg-rose-500 border-rose-700 text-white"
                      : "bg-[#FFD93D] hover:bg-amber-400 text-amber-950 border-amber-600"
                  } px-3.5 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-transform active:scale-95 border-b-2 shadow-sm`}
                >
                  {isCurrentPlaying ? (
                    <>
                      <Pause className="w-3 h-3 fill-white text-white" />
                      <span>Selesai ⏹️</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Dengar 🔊</span>
                    </>
                  )}
                </button>
              </div>

              {/* Renders Word-by-Word Interactive Text for Toddler */}
              <div className="py-2.5 flex justify-center">
                <WordByWordText
                  ayahText={ayah.arabicText}
                  surahNumber={sNum}
                  ayahNumber={ayah.ayahNumber}
                  size="small"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-full max-w-md pt-2 px-4">
        <button
          onClick={handleLancarClick}
          className="w-full py-4 text-white bg-[#48C78E] border-b-6 border-[#329e6f] active:border-b-0 active:translate-y-1.5 rounded-[24px] shadow-xl text-lg font-black uppercase tracking-widest transition-all cursor-pointer select-none text-center"
        >
          Sangat Lancar! 👍
        </button>
        <p className="text-[#A39E93] font-bold text-[10px] mt-3 text-center uppercase tracking-widest">
          Ketuk tombol jika sudah hafal sambungannya
        </p>
      </div>
    </div>
  );
}
