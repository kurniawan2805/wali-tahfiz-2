import React, { useState } from "react";

interface WordByWordTextProps {
  ayahText: string;
  surahNumber: number;
  ayahNumber: number;
  size?: "small" | "medium" | "large" | "xlarge" | "huge";
}

export default function WordByWordText({
  ayahText,
  surahNumber,
  ayahNumber,
  size = "large",
}: WordByWordTextProps) {
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);

  // Helper for 3-digit zero padding
  const pad3 = (num: number): string => {
    return String(num).padStart(3, "0");
  };

  const playWordAudio = (wordIndex: number) => {
    setActiveWordIndex(wordIndex);

    const sss = pad3(surahNumber);
    const vvv = pad3(ayahNumber);
    const www = pad3(wordIndex);

    const url = `https://audios.quranwbw.com/words/${surahNumber}/${sss}_${vvv}_${www}.mp3`;
    
    const audio = new Audio(url);
    audio.play().catch((err) => {
      console.warn("Error playing word-by-word audio:", err);
    });

    // Reset indicator highlight once audio ends, or after a conservative timeout (1 second)
    audio.onended = () => {
      setActiveWordIndex(null);
    };

    setTimeout(() => {
      setActiveWordIndex((prev) => (prev === wordIndex ? null : prev));
    }, 1200);
  };

  // Clean the text and split by spaces to isolate individual words
  const words = ayahText.trim().split(/\s+/);

  return (
    <div 
      dir="rtl" 
      className="flex flex-wrap justify-center gap-x-6 gap-y-8 leading-loose select-none py-4 font-arabic"
    >
      {words.map((word, index) => {
        const wordIndex1Based = index + 1;
        const isActive = activeWordIndex === wordIndex1Based;

        return (
          <button
            key={index}
            id={`word-wbw-${surahNumber}-${ayahNumber}-${wordIndex1Based}`}
            onClick={(e) => {
              e.stopPropagation();
              playWordAudio(wordIndex1Based);
            }}
            className={`cursor-pointer transition-all duration-200 text-6xl sm:text-7xl font-bold active:scale-90 outline-none select-none ${
              isActive 
                ? "text-[#48C78E] scale-105" 
                : "text-slate-700 hover:text-slate-800 active:text-[#48C78E]"
            }`}
          >
            {word}
          </button>
        );
      })}
    </div>
  );
}
