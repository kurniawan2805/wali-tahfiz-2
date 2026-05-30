import { useState, useEffect, useCallback } from "react";

export interface ProgressState {
  progress: number;
  completedCount: number;
}

export function useToddlerProgress() {
  const [progress, setProgress] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);

  // Load progress from localStorage on mount
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem("toddler_progress");
      const savedCount = localStorage.getItem("toddler_completed_count");
      
      if (savedProgress !== null) {
        setProgress(parseInt(savedProgress, 10));
      }
      if (savedCount !== null) {
        setCompletedCount(parseInt(savedCount, 10));
      }
    } catch (e) {
      console.error("Failed to load progress from localStorage:", e);
    }
  }, []);

  // Save progress to localStorage whenever it changes
  const saveProgress = useCallback((newProgress: number, newCount: number) => {
    try {
      localStorage.setItem("toddler_progress", newProgress.toString());
      localStorage.setItem("toddler_completed_count", newCount.toString());
    } catch (e) {
      console.error("Failed to save progress to localStorage:", e);
    }
  }, []);

  const incrementProgress = useCallback(() => {
    setProgress((prev) => {
      const nextProgress = Math.min(prev + 20, 100);
      let nextCount = completedCount;
      if (nextProgress === 100 && prev !== 100) {
        nextCount += 1;
        setCompletedCount(nextCount);
      }
      saveProgress(nextProgress, nextCount);
      return nextProgress;
    });
  }, [completedCount, saveProgress]);

  const resetProgress = useCallback(() => {
    setProgress(0);
    saveProgress(0, completedCount);
  }, [completedCount, saveProgress]);

  const resetAll = useCallback(() => {
    setProgress(0);
    setCompletedCount(0);
    saveProgress(0, 0);
  }, [saveProgress]);

  return {
    progress,
    completedCount,
    incrementProgress,
    resetProgress,
    resetAll,
  };
}
