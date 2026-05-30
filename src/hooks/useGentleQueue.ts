import { useState, useCallback } from "react";

export interface GentleAyah {
  id: string;
  title: string;
  nextReviewDate: Date;
}

export function useGentleQueue() {
  const [ayahs, setAyahs] = useState<GentleAyah[]>([
    { id: "ayah_an_nas", title: "An-Nas: Ayat 1-3", nextReviewDate: new Date() },
    { id: "ayah_al_ikhlas", title: "Al-Ikhlas: Ayat 1-2", nextReviewDate: new Date() },
    { id: "ayah_al_falaq", title: "Al-Falaq: Ayat 1-3", nextReviewDate: new Date() },
    { id: "ayah_al_fatihah", title: "Al-Fatihah: Ayat 1-4", nextReviewDate: new Date() },
    { id: "ayah_al_kautsar", title: "Al-Kautsar: Ayat 1-3", nextReviewDate: new Date() },
    { id: "ayah_al_asr", title: "Al-Asr: Ayat 1-3", nextReviewDate: new Date() },
  ]);

  const gradeAyah = useCallback((id: string, grade: "Ulangi" | "Bagus" | "Sempurna") => {
    setAyahs((prev) =>
      prev.map((ayah) => {
        if (ayah.id !== id) return ayah;

        const newDate = new Date();
        if (grade === "Ulangi") {
          newDate.setDate(newDate.getDate() + 1);
        } else if (grade === "Bagus") {
          newDate.setDate(newDate.getDate() + 3);
        } else if (grade === "Sempurna") {
          newDate.setDate(newDate.getDate() + 7);
        }

        return {
          ...ayah,
          nextReviewDate: newDate,
        };
      })
    );
  }, []);

  const getTodaysQueue = useCallback(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Include all items due up to the end of today

    const dueAyahs = ayahs.filter((ayah) => {
      return ayah.nextReviewDate <= today;
    });

    // Forgiving constraint: Max 3 items to avoid overwhelming the toddler
    return dueAyahs.slice(0, 3);
  }, [ayahs]);

  return {
    ayahs,
    gradeAyah,
    getTodaysQueue,
    setAyahs,
  };
}
