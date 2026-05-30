/**
 * dbEngine.js
 * 
 * Lightweight offline-first mock local database engine using localStorage.
 * Serves as a local sandbox prototype before migrating to Firebase Firestore.
 * Refined for toddler-friendly gamification with streak shields and micro-session saving.
 */

// Key for storage
const STORAGE_KEY = 'wali_tahfiz_db';

// Initial seed data sequence representation of our family tracking data
const SEED_DATA = [
  {
    id: "said",
    name: "Said",
    age: 4,
    streak: 5,
    completedSessions: 3,
    streakShields: 2, // Default quota per week 🛡️
    streakStatus: "ACTIVE", // ACTIVE | STREAK_FROZEN | STREAK_WIPED
    settings: {
      talaqqiAudioRepeats: 5,
      tikrarSelfRepeats: 10,
      maxSessionDuration: 15
    },
    tasks: [
      {
        id: "task_01",
        surahId: 87,
        dariAyat: 1,
        sampaiAyat: 5,
        category: "QARIB",
        consecutivePerfectDays: 2,
        currentTikrarProgress: 3, // Persistent 3/10 fruits already harvested 🍓
        lastReviewed: "2026-05-23"
      }
    ]
  },
  {
    id: "sumayyah",
    name: "Sumayyah",
    age: 2.5,
    streak: 8,
    completedSessions: 6,
    streakShields: 2, // Default quota per week 🛡️
    streakStatus: "ACTIVE",
    settings: {
      talaqqiAudioRepeats: 5,
      tikrarSelfRepeats: 10,
      maxSessionDuration: 15
    },
    tasks: [
      {
        id: "task_02",
        surahId: 114,
        dariAyat: 1,
        sampaiAyat: 6,
        category: "ZIYADAH",
        consecutivePerfectDays: 0,
        currentTikrarProgress: 0,
        lastReviewed: "2026-05-24"
      }
    ]
  }
];

/**
 * Automatically seeds the database if it doesn't exist.
 */
function initializeDatabase() {
  if (typeof window !== 'undefined') {
    let existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      const oldData = localStorage.getItem('amaly_db');
      if (oldData) {
        localStorage.setItem(STORAGE_KEY, oldData);
        existing = oldData;
        console.log("Wali Tahfiz Database: Migrated old amaly_db local database to wali_tahfiz_db.");
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
        existing = JSON.stringify(SEED_DATA);
      }
    }
    
    if (existing) {
      // Ensure existing database elements are migration-compatible with new schema keys
      try {
        const parsed = JSON.parse(existing);
        let migrated = false;
        parsed.forEach(student => {
          if (student.streakShields === undefined) {
            student.streakShields = 2;
            migrated = true;
          }
          if (student.streakStatus === undefined) {
            student.streakStatus = "ACTIVE";
            migrated = true;
          }
          if (student.settings === undefined) {
            student.settings = {
              talaqqiAudioRepeats: 5,
              tikrarSelfRepeats: 10,
              maxSessionDuration: 15,
              rabtRepeats: 3
            };
            migrated = true;
          } else {
            if (student.settings.talaqqiAudioRepeats === undefined) {
              student.settings.talaqqiAudioRepeats = 5;
              migrated = true;
            }
            if (student.settings.tikrarSelfRepeats === undefined) {
              student.settings.tikrarSelfRepeats = 10;
              migrated = true;
            }
            if (student.settings.maxSessionDuration === undefined) {
              student.settings.maxSessionDuration = 15;
              migrated = true;
            }
            if (student.settings.rabtRepeats === undefined) {
              student.settings.rabtRepeats = 3;
              migrated = true;
            }
            if (student.settings.arabicFontSize === undefined) {
              student.settings.arabicFontSize = 'large';
              migrated = true;
            }
          }
          if (student.tasks) {
            student.tasks.forEach(task => {
              if (task.currentTikrarProgress === undefined) {
                task.currentTikrarProgress = 0;
                migrated = true;
              }
            });
          }
        });
        if (migrated) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch (e) {
        console.error("Migration error, resetting:", e);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
      }
    }
  }
}

// Side-effect database initialization
initializeDatabase();

/**
 * Gets students data array from localStorage.
 * 
 * @returns {Array} List of students and their profiles/tasks.
 */
export function getStudentsData() {
  if (typeof window === 'undefined') return SEED_DATA;
  
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    return JSON.parse(JSON.stringify(SEED_DATA));
  }
  
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse database from localStorage, resetting to seed:", error);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    return JSON.parse(JSON.stringify(SEED_DATA));
  }
}

/**
 * Saves students data array back to localStorage.
 * 
 * @param {Array} data - Array of student profiles with tasks.
 */
export function saveStudentsData(data) {
  if (typeof window !== 'undefined' && data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

/**
 * Adds a new dynamic task into the student's profile.
 * 
 * @param {string} studentId - The identifier of the student (e.g., 'said').
 * @param {number} surahId - Quran Surah number.
 * @param {number} dariAyat - Starting verse number.
 * @param {number} sampaiAyat - Ending verse number.
 * @param {string} category - Task category e.g. "ZIYADAH", "QARIB", "SABIQU".
 * @returns {Object|null} The newly created task or null.
 */
export function addTaskToStudent(studentId, surahId, dariAyat, sampaiAyat, category) {
  const data = getStudentsData();
  const student = data.find(s => s.id === studentId);
  
  if (!student) {
    console.error(`Student with ID ${studentId} not found.`);
    return null;
  }
  
  const newTask = {
    id: Date.now().toString(),
    surahId: Number(surahId),
    dariAyat: Number(dariAyat),
    sampaiAyat: Number(sampaiAyat),
    category: String(category).toUpperCase(),
    consecutivePerfectDays: 0,
    currentTikrarProgress: 0, // Persistent micro-session progress tracking 🍓
    lastReviewed: new Date().toISOString().split('T')[0]
  };
  
  if (!student.tasks) {
    student.tasks = [];
  }
  
  student.tasks.push(newTask);
  saveStudentsData(data);
  return newTask;
}


/**
 * Saves interim progress (tikrar fruit counting) to support micro-sessions.
 * Allows preserving collected count persistently when unmounted or paused.
 * 
 * @param {string} studentId - The identifier of the student.
 * @param {string} taskId - The identifier of the task.
 * @param {number} currentCount - Accumulated fruit harvest sessions (0-10) done so far.
 * @returns {boolean} True if successfully updated, false otherwise.
 */
export function saveInterimProgress(studentId, taskId, currentCount) {
  const data = getStudentsData();
  const student = data.find(s => s.id === studentId);
  
  if (!student) {
    console.error(`Student with ID ${studentId} not found.`);
    return false;
  }
  
  if (!student.tasks) {
    student.tasks = [];
  }
  
  const task = student.tasks.find(t => t.id === taskId);
  if (!task) {
    console.error(`Task with ID ${taskId} not found for student ${studentId}.`);
    return false;
  }
  
  // Guard the tikrar values securely (typically between 0 and 10)
  task.currentTikrarProgress = Math.min(10, Math.max(0, Number(currentCount)));
  
  saveStudentsData(data);
  return true;
}

/**
 * Refactored Tracking function checking for daily completions.
 * If a day passes without completing a session entry, it preserves children's streak
 * by consuming a "Streak Shield" protection.
 * 
 * @param {string} studentId - The identifier of the student.
 * @returns {Object|null} Verification status and values.
 */
export function checkAndFreezeStreak(studentId) {
  const data = getStudentsData();
  const student = data.find(s => s.id === studentId);
  
  if (!student) {
    console.error(`Student with ID ${studentId} not found.`);
    return null;
  }

  // Ensure fields are available
  if (student.streakShields === undefined) {
    student.streakShields = 2;
  }
  if (student.streakStatus === undefined) {
    student.streakStatus = "ACTIVE";
  }

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Check completion tracking
  let latestReviewDateStr = "";
  if (student.tasks && student.tasks.length > 0) {
    const dates = student.tasks
      .map(t => t.lastReviewed)
      .filter(Boolean)
      .sort();
    if (dates.length > 0) {
      latestReviewDateStr = dates[dates.length - 1];
    }
  }

  let dayPassedWithoutEntry = false;
  if (!latestReviewDateStr) {
    dayPassedWithoutEntry = true;
  } else {
    const today = new Date(todayStr);
    const lastRev = new Date(latestReviewDateStr);
    const diffTime = Math.abs(today - lastRev);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // If more than 1 day has elapsed since the last session entry
    if (diffDays > 1) {
      dayPassedWithoutEntry = true;
    }
  }

  let status = "ACTIVE";

  if (dayPassedWithoutEntry) {
    if (student.streakShields > 0) {
      student.streakShields -= 1;
      status = "STREAK_FROZEN"; // Streak preserved! Not resetting to 0
    } else {
      student.streak = 0; // Shield exhausted, reset to 0
      status = "STREAK_WIPED";
    }
  }

  student.streakStatus = status;
  saveStudentsData(data);
  
  return {
    studentId,
    streak: student.streak,
    streakShields: student.streakShields,
    status
  };
}

/**
 * Updates child settings presets for Talaqqi and Tikrar.
 * 
 * @param {string} studentId - The identifier of the child profile.
 * @param {number} talaqqiCount - Target repetition value for Phase 1.
 * @param {number} tikrarCount - Target repetition value for Phase 2.
 * @param {number} maxSessionDuration - Session time limit in minutes.
 * @param {number} rabtCount - Target repetition value for Phase 3 (rabt).
 * @returns {boolean} True if updated successfully, false otherwise.
 */
export function updateChildPresets(studentId, talaqqiCount, tikrarCount, maxSessionDuration = 15, rabtCount = 3, arabicFontSize = 'large') {
  const data = getStudentsData();
  const student = data.find(s => s.id === studentId);
  
  if (!student) {
    console.error(`Student with ID ${studentId} not found.`);
    return false;
  }
  
  if (!student.settings) {
    student.settings = {
      talaqqiAudioRepeats: 5,
      tikrarSelfRepeats: 10,
      maxSessionDuration: 15,
      rabtRepeats: 3,
      arabicFontSize: 'large'
    };
  }
  
  student.settings.talaqqiAudioRepeats = Number(talaqqiCount);
  student.settings.tikrarSelfRepeats = Number(tikrarCount);
  student.settings.maxSessionDuration = Number(maxSessionDuration);
  student.settings.rabtRepeats = Number(rabtCount);
  student.settings.arabicFontSize = arabicFontSize;
  
  saveStudentsData(data);
  return true;
}

/**
 * Updates child settings screen time limit in minutes.
 * 
 * @param {string} studentId - The identifier of the child profile.
 * @param {number} durationMinutes - Screen time duration limits in minutes.
 * @returns {boolean} True if updated successfully, false otherwise.
 */
export function updateChildScreenTime(studentId, durationMinutes) {
  const data = getStudentsData();
  const student = data.find(s => s.id === studentId);
  
  if (!student) {
    console.error(`Student with ID ${studentId} not found.`);
    return false;
  }
  
  if (!student.settings) {
    student.settings = {
      talaqqiAudioRepeats: 5,
      tikrarSelfRepeats: 10,
      maxSessionDuration: 15
    };
  }
  
  student.settings.maxSessionDuration = Number(durationMinutes);
  saveStudentsData(data);
  return true;
}
