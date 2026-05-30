import React, { useEffect, useState } from "react";

interface TamanBuahNusantaraProps {
  streakCount: number;
  childName?: string;
  completedSessions?: number;
  lang?: "ID" | "EN";
  isHalfAwake?: boolean;
  growthPoints?: number;
  waterReserve?: number;
}

export default function TamanBuahNusantara({ 
  streakCount, 
  childName, 
  completedSessions = 0,
  lang = "ID",
  isHalfAwake = false,
  growthPoints,
  waterReserve = 0
}: TamanBuahNusantaraProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getGardenStage = (points: number) => {
    if (points <= 2) {
      return {
        emoji: "🌱",
        label: lang === "EN" ? "Fresh Sprout" : "Tunas Baru",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-100",
      };
    }
    if (points <= 6) {
      return {
        emoji: "🌰",
        label: lang === "EN" ? "Rambutan Seedling" : "Bibit Rambutan",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-100",
      };
    }
    if (points <= 12) {
      return {
        emoji: "🌿",
        label: lang === "EN" ? "Young Seedling" : "Tunas Muda",
        bgColor: "bg-teal-50",
        borderColor: "border-teal-100",
      };
    }
    if (points <= 19) {
      return {
        emoji: "🌳",
        label: lang === "EN" ? "Rambutan Tree" : "Pohon Rambutan",
        bgColor: "bg-green-50",
        borderColor: "border-green-100",
      };
    }
    return {
      emoji: "🌳🍎",
      label: lang === "EN" ? "Harvest Time!" : "Waktunya Panen!",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-100",
    };
  };

  const activePoints = growthPoints !== undefined ? growthPoints : streakCount;
  const stage = getGardenStage(activePoints);

  // Dynamic Indonesian/English motivational function (Formal/Academic Shift)
  const getGardenOration = (sessions: number, streak: number, name: string) => {
    const lowerName = name.toLowerCase();
    
    if (lang === "EN") {
      if (lowerName === "said" || (sessions === 3 && streak === 5)) {
        return "Excellent consistency, Said! Your memorization roots are growing deeper every day.";
      }
      if (lowerName === "sumayyah" || (sessions === 6 && streak === 8)) {
        return "Great start, Sumayyah! A beautiful new sprout has emerged today.";
      }
      if (streak >= 6) {
        return `Outstanding, ${name} shows highly active progress. The roots of memorization grow deeper.`;
      }
      return `Deep appreciation for ${name}. Memorization roots are growing deeper every day.`;
    }

    if (lowerName === "said" || (sessions === 3 && streak === 5)) {
      return "Apresiasi tinggi untuk Said. Konsistensi hafalan berjalan optimal dan semakin kuat.";
    }
    if (lowerName === "sumayyah" || (sessions === 6 && streak === 8)) {
      return "Awal yang hebat, Sumayyah! Progres harian aktif dan akar hafalan mulai terbentuk.";
    }
    
    // Generic fallback based on stats
    if (streak >= 6) {
      return `Luar biasa, ${name} menunjukkan progres yang sangat aktif dan akar hafalan mulai terbentuk.`;
    }
    return `Apresiasi tinggi untuk ${name}. Konsistensi hafalan berjalan optimal dan semakin kuat.`;
  };

  return (
    <div 
      id={`taman-buah-nusantara-${childName || 'generic'}`} 
      className="flex-1 bg-white rounded-3xl border border-slate-100 p-5 pb-6 flex flex-col items-center text-center h-auto relative overflow-hidden"
    >
      {/* Encapsulated scale-up keyframe animation */}
      <style>{`
        @keyframes scaleUpGentle {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-up-gentle {
          animation: scaleUpGentle 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Decorative ambient background circle */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full ${stage.bgColor} opacity-40 blur-xl pointer-events-none`} />

      {/* Center Stage Growth Emoji Asset with mount trigger animation */}
      <div 
        className={`text-5xl mb-3 select-none filter drop-shadow-xs transition-opacity duration-300 ${
          mounted ? "animate-scale-up-gentle" : "opacity-0"
        } ${isHalfAwake ? "opacity-60" : "opacity-100"}`}
        style={{ transformOrigin: "center" }}
      >
        {isHalfAwake ? `${stage.emoji} 💤` : stage.emoji}
      </div>

      {/* Child name / ID label */}
      {childName && (
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
          {lang === "EN" ? `Garden of ${childName}` : `Taman ${childName}`}
        </span>
      )}

      {/* Growth Stage Label */}
      <h3 className="text-sm font-black text-[#3A405A] tracking-tight leading-tight mb-1">
        {stage.label} {isHalfAwake ? (lang === "EN" ? "(Half-Awake)" : "(Setengah Bangun)") : ""}
      </h3>

      {/* Interactive Subtitle displaying the Streak info */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
        <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <span>🔥</span> {streakCount} {lang === "EN" ? "Days" : "Hari"}
        </span>
        <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <span>⭐</span> {activePoints}/20 {lang === "EN" ? "Points" : "Poin"}
        </span>
        {waterReserve > 0 && (
          <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
            <span>🛡️</span> Tandon: {waterReserve}
          </span>
        )}
      </div>

      {/* Cap notification / anti-overwatering guide */}
      <p className="text-[9px] font-bold text-slate-400 max-w-xs leading-tight mb-2">
        {lang === "EN" 
          ? "Max 3 items absorbed/day. Excess saved to Water Reserve Tandon."
          : "Maks. 3 item diserap/hari. Sisa aman di Tandon Air."}
      </p>

      {/* Formal description container styled as a premium report card bracket */}
      <p className="text-[11px] leading-relaxed text-slate-500 mt-2 break-words w-full">
        <span className="italic">
          "{getGardenOration(completedSessions, activePoints, childName || "Anak")}"
        </span>
      </p>
    </div>
  );
}
