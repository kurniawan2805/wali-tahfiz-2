import { useState, useEffect, useCallback } from "react";
import { DailyCheckInStatus, DailyLogEntry, MonthlyHistoryMap } from "../types";

export function useMonthlyHafizReport(childId: string | undefined) {
  const [historyMap, setHistoryMap] = useState<MonthlyHistoryMap>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gentle_hafiz_monthly_history");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse monthly hafiz history:", e);
        }
      }
    }
    return {};
  });

  // Save map to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gentle_hafiz_monthly_history", JSON.stringify(historyMap));
    }
  }, [historyMap]);

  // Log a daily interaction
  const logDailyInteraction = useCallback((selectedStatus: DailyCheckInStatus, duration: number) => {
    if (!childId) return;

    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const monthKey = dateStr.substring(0, 7); // YYYY-MM

    const newEntry: DailyLogEntry = {
      date: dateStr,
      status: selectedStatus,
      durationMinutes: duration,
      timestamp: today.toISOString(),
      childId
    };

    setHistoryMap((prev) => {
      const currentMonthList = prev[monthKey] ? [...prev[monthKey]] : [];
      
      // Clean up previous entry for the same day and child to prevent duplicates
      const filteredList = currentMonthList.filter(
        (entry) => !(entry.date === dateStr && entry.childId === childId)
      );

      return {
        ...prev,
        [monthKey]: [...filteredList, newEntry]
      };
    });

    // Also update streak helper state in localStorage depending on status
    if (typeof window !== "undefined") {
      const todayStr = new Date().toISOString().split("T")[0];
      const lastDate = localStorage.getItem("gentle_last_completed_date");
      const currentStreakStr = localStorage.getItem("gentle_daily_streak_count") || "0";
      let currentStreak = parseInt(currentStreakStr, 10);

      if (selectedStatus === "aktif") {
        // Active means we increment the streak normally
        if (lastDate !== todayStr) {
          currentStreak = currentStreak === 0 ? 1 : currentStreak + 1;
          localStorage.setItem("gentle_daily_streak_count", currentStreak.toString());
          localStorage.setItem("gentle_last_completed_date", todayStr);
        }
      } else {
        // MOODY, SIBUK, or LIBUR -> Streak Freeze Control (No penalty, freeze/maintain streak count)
        // If they did not check in active today, but we log a freeze status,
        // we keep the streak exactly as is to signify "Istiqomah" consistency.
        if (lastDate !== todayStr && currentStreak > 0) {
          // Simply update the completion date to lock the freeze state so the streak survives
          localStorage.setItem("gentle_last_completed_date", todayStr);
        }
      }
    }
  }, [childId]);

  // Generate actionable, psychological suggestions for the parents
  const generateAnalyticalSuggestions = useCallback((): string[] => {
    if (!childId) return ["Mulai catat interaksi hari ini untuk melihat rekomendasi psikologis."];

    // Filter all entries for this specific child
    const childEntries: DailyLogEntry[] = [];
    Object.keys(historyMap).forEach((monthKey) => {
      const monthEntries = historyMap[monthKey] || [];
      monthEntries.forEach((entry) => {
        if (entry.childId === childId) {
          childEntries.push(entry);
        }
      });
    });

    if (childEntries.length === 0) {
      return [
        "✨ target: Istiqomah Sentuh Al-Qur'an Setiap Hari Tanpa Paksaan.",
        "💡 Rekomendasi Anda akan muncul setelah Anda mencatat minimal 1 log interaksi harian."
      ];
    }

    const totalDays = childEntries.length;
    const moodyCount = childEntries.filter((e) => e.status === "moody").length;
    const busyCount = childEntries.filter((e) => e.status === "sibuk").length;
    const activeCount = childEntries.filter((e) => e.status === "aktif").length;
    const holidayCount = childEntries.filter((e) => e.status === "libur").length;

    const totalMinutes = childEntries.reduce((sum, e) => sum + e.durationMinutes, 0);
    const avgMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;

    const suggestions: string[] = [];

    // Moody suggestion
    if (moodyCount / totalDays >= 0.25 || moodyCount >= 2) {
      suggestions.push(
        "🧠 Anak terdeteksi sering moody di sesi pendampingan harian sore/malam hari. Disarankan memindahkan waktu murojaah singkat ke pagi hari setelah sarapan, saat 'baterai sosial & fokus' si kecil berada di puncaknya."
      );
    } else if (moodyCount > 0) {
      suggestions.push(
        "🧸 Si kecil sedang dalam fase transisi eksplorasi/moody. Gantilah model drill kaku dengan media gamifikasi 'Taman Buah' atau bernyanyilah bersama untuk menurunkan resistensi emosional anak."
      );
    }

    // Busyness suggestion
    if (busyCount / totalDays >= 0.25 || busyCount >= 2) {
      suggestions.push(
        "🎧 Kendala kesibukan orang tua terdeteksi tinggi. Sangat disarankan untuk memanfaatkan fitur otomatisasi audio-listening 'QuranPlayer' di latar belakang sewaktu bepergian, memasak, atau bersantai bersama anak."
      );
    }

    // Holiday suggestion
    if (holidayCount > 0) {
      suggestions.push(
        "✈️ Sedang berlibur atau safar? Menjaga kebiasaan lebih penting daripada kuantitas. Manfaatkan 'Talaqqi Telinga Pasif' 3 menit saja sewaktu anak tidur dalam perjalanan agar ritme istiqomah tidak terputus."
      );
    }

    // Active & interaction quality feedback
    if (activeCount / totalDays >= 0.6) {
      suggestions.push(
        "💚 Masya Allah! Kualitas interaksi aktif Anda dan anak sangat prima. Menghabiskan rata-rata " + avgMinutes + " menit per sesi adalah modal emosional luar biasa untuk mencerahkan memori masa kecil anak bersama Al-Qur'an."
      );
    }

    if (suggestions.length === 0) {
      suggestions.push(
        "🌱 Langkah awal yang indah! Kebiasaan istiqomah menyentuh mushaf Al-Qur'an setiap hari tanpa paksaan adalah rahasia terbesar anak menghafal seumur hidup secara alami."
      );
    }

    return suggestions;
  }, [historyMap, childId]);

  return {
    historyMap,
    logDailyInteraction,
    generateAnalyticalSuggestions
  };
}
