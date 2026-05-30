import React from "react";

interface AyahDisplayBoxProps {
  arabicText: string;
  surahName: string;
  ayahNumber: number;
  isWordByWordActive: boolean;
  onWordClick?: (wordIndex: number) => void;
}

export default function AyahDisplayBox({
  arabicText,
  surahName,
  ayahNumber,
  isWordByWordActive,
  onWordClick,
}: AyahDisplayBoxProps) {
  const words = arabicText.trim().split(/\s+/);

  return (
    <div className="bg-white rounded-3xl shadow-lg border-2 border-slate-100 p-8 w-full max-w-md mx-auto mb-6">
      {/* Header Tag */}
      <div className="flex items-center justify-between border-b border-slate-50 pb-3">
        <span className="text-slate-400 font-bold text-sm tracking-widest uppercase">
          {surahName} : Ayat {ayahNumber}
        </span>
        {isWordByWordActive && (
          <span className="bg-orange-50 text-orange-500 font-black text-[10px] tracking-wider px-2.5 py-1 rounded-full uppercase animate-pulse select-none">
            👉 Ketuk Kata
          </span>
        )}
      </div>

      {/* RTL Text Area */}
      <div
        dir="rtl"
        className="flex flex-wrap justify-center gap-x-4 gap-y-6 mt-6 select-none font-arabic"
      >
        {words.map((word, index) => {
          const wordIndex1Based = index + 1;

          if (isWordByWordActive) {
            return (
              <button
                key={index}
                onClick={() => onWordClick?.(wordIndex1Based)}
                className="text-5xl md:text-6xl text-slate-800 leading-relaxed font-bold cursor-pointer transition-transform duration-150 active:scale-95 active:text-orange-400 hover:text-slate-900 outline-none select-none"
              >
                {word}
              </button>
            );
          }

          return (
            <span
              key={index}
              className="text-5xl md:text-6xl text-slate-800 leading-relaxed font-bold select-none"
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
