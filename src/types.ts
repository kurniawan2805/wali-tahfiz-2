export interface MemorizationTask {
  id: string;
  surah: string;
  verse: string;
  /** Binary rating result: 'lulus' (passed) or 'ulangi' (repeat tomorrow) */
  rating?: "lulus" | "ulangi";
  /** @deprecated Use `rating` instead. Kept for backward-compatibility with cloud data. */
  grade?: "ulangi" | "bagus" | "sempurna";
  /** Consecutive successful Murojaah sessions. Drives exponential interval schedule. */
  streak?: number;
  /** @deprecated Use `streak` instead. Kept for backward-compatibility with cloud data. */
  consecutiveDays?: number;
  nextReviewDate?: string;
  /** Implicit behavioral signals captured automatically during Hafalan Baru session */
  implicitSignals?: {
    tikrarCompleted?: number;
    phasesSkipped?: string[]; // e.g. ["talaqqi", "rabt"]
  };
}

export interface MemorizationProfile {
  ziyadah: MemorizationTask | null;
  qarib: MemorizationTask[];
  sabiq: MemorizationTask[];
}

export interface ChildSettings {
  talaqqiAudioRepeats: number;
  tikrarSelfRepeats: number;
  maxSessionDuration?: number;
  rabtRepeats?: number;
  arabicFontSize?: 'small' | 'medium' | 'large' | 'xlarge' | 'huge';
}

export interface ChildProfile {
  id: string;
  name: string;
  age: string;
  birthMonth?: number;
  birthYear?: number;
  avatar: string;
  streak: number;
  completedBooks: number;
  isDeleted?: boolean;
  memorizationProfile?: MemorizationProfile;
  settings?: ChildSettings;
  unusedWaterDroplets?: number;
}

export interface ReviewItem {
  id: string;
  surah: string;
  verse: string;
  grade?: "ulangi" | "bagus" | "sempurna";
  gradedAt?: string;
}

export interface StoryItem {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  accentColor: string;
  durationString: string;
  themeGradient: string;
}

export type DailyCheckInStatus = 'aktif' | 'moody' | 'sibuk' | 'libur';

export interface DailyLogEntry {
  date: string; // YYYY-MM-DD
  status: DailyCheckInStatus;
  durationMinutes: number;
  timestamp: string; // ISO String
  notes?: string;
  childId: string;
}

export interface SurahRetentionState {
  name: string;
  current_verse_range: { from: number; to: number };
  retention_score: number; // Range 0 to 100
  next_review_interval: number; // in days
  consecutive_stuck_days: number; // Counter for tracking if child is struggling
}

export type MonthlyHistoryMap = Record<string, DailyLogEntry[]>; // Record key: YYYY-MM

