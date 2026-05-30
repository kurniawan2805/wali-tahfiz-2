import { getApps, getApp, initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize app, firestore and auth safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, firebaseConfig.firestoreDatabaseId || undefined);
} catch (e) {
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

// Google Auth Provider setup
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

/**
 * Sign In with Google using standard Firebase Popup.
 * Correctly handled in Sandbox with popup-to-parent postMessages when configured or running within standard flows.
 * @returns {Promise<any>} The authenticated user object
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google login failed inside firebaseEngine:", error);
    throw error;
  }
}

/**
 * Signs out the current user.
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Signout failed inside firebaseEngine:", error);
    throw error;
  }
}

/**
 * Listen to auth state transitions.
 * @param {Function} callback 
 * @returns {Function} Unsubscribe function
 */
export function onAuthChanged(callback) {
  return onAuthStateChanged(auth, callback);
}

// Local cache key fallback if Firestore fails or network is lost
const getFallbackKey = (waliId) => {
  return waliId === "wali_adi_kurniawan" ? "gentle_children_list" : `gentle_children_list_${waliId}`;
};

/**
 * Sync wali dashboard settings and student data in real-time.
 * If Firestore listener fails or config is incomplete, it falls back gracefully to local cache.
 * 
 * @param {string} waliId - The static master household identifier.
 * @param {Function} callback - Receive clean parsed data: { students: ChildProfile[], streak: number }
 * @returns {Function} Unsubscribe listener function.
 */
export function syncWaliData(waliId = "wali_adi_kurniawan", callback) {
  const docRef = doc(db, "walis", waliId);

  // Fallback to load current local cache immediately for zero-wait UI
  const triggerLocalFallback = () => {
    try {
      const cached = localStorage.getItem(getFallbackKey(waliId));
      if (cached) {
        const children = JSON.parse(cached);
        callback({
          students: children,
          streak: children.length > 0 ? Math.max(...children.map(c => c.streak || 0)) : 1
        });
      }
    } catch (e) {
      console.warn("Failed to load local fallback cache inside syncWaliData:", e);
    }
  };

  // Listen to Firestore real-time snapshots
  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const studentsObj = data.students || {};
        const studentsArray = Object.values(studentsObj);
        
        callback({
          students: studentsArray,
          streak: data.streak || 1
        });

        // Sync back to local storage cache to keep offline-first capability perfect
        try {
          localStorage.setItem(getFallbackKey(waliId), JSON.stringify(studentsArray));
        } catch (e) {
          console.error("Failed to write updated firebase data to local fallback cache:", e);
        }
      } else {
        // Document does not exist yet; initialize it using local cache data
        triggerLocalFallback();
        try {
          const cached = localStorage.getItem(getFallbackKey(waliId));
          if (cached) {
            const children = JSON.parse(cached);
            const studentsMap = {};
            children.forEach(c => {
              studentsMap[c.id] = c;
            });
            setDoc(docRef, {
              waliId,
              streak: children.length > 0 ? Math.max(...children.map(c => c.streak || 0)) : 1,
              students: studentsMap
            }, { merge: true }).catch(err => {
              console.warn("Soft fail initializing empty wali doc in firestore:", err.message);
            });
          }
        } catch (err) {
          console.warn("Could not seed firestore doc from cache:", err);
        }
      }
    },
    (error) => {
      console.warn("Firestore connection error. Falling back to offline local storage sync.", error.message);
      triggerLocalFallback();
    }
  );

  return unsubscribe;
}

/**
 * Fully syncs the children list array to the cloud by mapping it to the students map.
 * This is very convenient for create/delete/reorder operations.
 * 
 * @param {Array} childrenList - Array of ChildProfile objects.
 * @param {string} waliId - The static master household identifier.
 * @returns {Promise<boolean>} True if Firestore update succeeded, false otherwise.
 */
export async function cloudSaveChildrenList(childrenList, waliId = "wali_adi_kurniawan") {
  const docRef = doc(db, "walis", waliId);
  const studentsMap = {};
  childrenList.forEach(child => {
    if (child && child.id) {
      studentsMap[child.id] = child;
    }
  });

  try {
    await setDoc(docRef, {
      students: studentsMap
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn("Failed to save student roster to target document in Cloud Firestore:", error.message);
    return false;
  }
}

/**
 * Patch repetition presets and maxSessionDuration screen time constraint in the cloud.
 * Modifies target child settings nested mapping without overwriting sibling states.
 * 
 * @param {string} studentId - The identifier of the child profile.
 * @param {Object} newSettings - Object containing talaqqiAudioRepeats, tikrarSelfRepeats, maxSessionDuration
 * @param {string} waliId - The static master household identifier.
 * @returns {Promise<boolean>} True if Firestore update succeeded, false otherwise.
 */
export async function cloudUpdateChildSettings(studentId, newSettings, waliId = "wali_adi_kurniawan") {
  const docRef = doc(db, "walis", waliId);

  // Read current payload to update local values first
  const updatePayload = {};
  if (newSettings.talaqqiAudioRepeats !== undefined) {
    updatePayload[`students.${studentId}.settings.talaqqiAudioRepeats`] = Number(newSettings.talaqqiAudioRepeats);
  }
  if (newSettings.tikrarSelfRepeats !== undefined) {
    updatePayload[`students.${studentId}.settings.tikrarSelfRepeats`] = Number(newSettings.tikrarSelfRepeats);
  }
  if (newSettings.maxSessionDuration !== undefined) {
    updatePayload[`students.${studentId}.settings.maxSessionDuration`] = Number(newSettings.maxSessionDuration);
  }
  if (newSettings.rabtRepeats !== undefined) {
    updatePayload[`students.${studentId}.settings.rabtRepeats`] = Number(newSettings.rabtRepeats);
  }
  if (newSettings.arabicFontSize !== undefined) {
    updatePayload[`students.${studentId}.settings.arabicFontSize`] = newSettings.arabicFontSize;
  }

  try {
    await updateDoc(docRef, updatePayload);
    return true;
  } catch (error) {
    console.warn("Failed to update child settings in cloud, updating offline cache:", error.message);
    
    // Offline local mutation fallback
    try {
      const cached = localStorage.getItem(getFallbackKey(waliId));
      if (cached) {
        const children = JSON.parse(cached);
        const updated = children.map(c => {
          if (c.id === studentId) {
            return {
              ...c,
              settings: {
                ...c.settings,
                ...newSettings
              }
            };
          }
          return c;
        });
        localStorage.setItem(getFallbackKey(waliId), JSON.stringify(updated));
      }
    } catch (e) {
      console.error("Local fallback configuration update failed:", e);
    }
    return false;
  }
}

/**
 * Translates child Spaced Repetition matrix update into an array-patch operation in Firestore.
 * 
 * @param {string} studentId - The identifier of the child profile.
 * @param {string} taskId - The identifier of the active task.
 * @param {string} rating - Performance rating: 'MUTQIN', 'SEMPURNA', 'BAGUS', 'ULANGI'.
 * @param {string} waliId - The static master household identifier.
 * @returns {Promise<boolean>} True if updated successfully, false on failure.
 */
export async function cloudUpdateTaskPerformance(studentId, taskId, rating, waliId = "wali_adi_kurniawan") {
  const docRef = doc(db, "walis", waliId);

  try {
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error("Wali document not found");
    }

    const data = docSnap.data();
    const students = data.students || {};
    const child = students[studentId];

    if (!child) {
      throw new Error("Child profile not found inside Wali");
    }

    const tasks = child.tasks || [];
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const task = { ...tasks[taskIndex] };
    const upperRating = String(rating).toUpperCase();
    const upperCategory = String(task.category || "ZIYADAH").toUpperCase();

    task.lastReviewed = new Date().toISOString().split("T")[0];

    // Spaced Repetition Matrix Translation
    if (upperRating === "SEMPURNA" || upperRating === "MUTQIN" || upperRating === "BAGUS") {
      task.currentTikrarProgress = 0; // Success loops reset tikrar tray count

      if (upperCategory === "ZIYADAH") {
        task.category = "QARIB";
        child.completedSessions = (child.completedSessions || 0) + 1;
      } else if (upperCategory === "QARIB") {
        task.consecutivePerfectDays = (task.consecutivePerfectDays || 0) + 1;
        if (task.consecutivePerfectDays >= 7) {
          task.category = "SABIQU";
        }
      }
    } else if (upperRating === "ULANGI") {
      task.consecutivePerfectDays = 0;
    }

    // Replace modern modified task list
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = task;

    await updateDoc(docRef, {
      [`students.${studentId}.tasks`]: updatedTasks,
      [`students.${studentId}.completedSessions`]: child.completedSessions || 0
    });
    return true;
  } catch (error) {
    console.warn("Failed to execute cloud performance spaced-repetition sync:", error.message);
    
    // Offline fallback for seamless toddler experience
    try {
      const cached = localStorage.getItem(getFallbackKey(waliId));
      if (cached) {
        const children = JSON.parse(cached);
        const updated = children.map(c => {
          if (c.id === studentId) {
            const tArray = c.tasks || [];
            const idx = tArray.findIndex(t => t.id === taskId);
            if (idx !== -1) {
              const matchedTask = { ...tArray[idx] };
              const upperRating = String(rating).toUpperCase();
              const upperCategory = String(matchedTask.category || "ZIYADAH").toUpperCase();

              matchedTask.lastReviewed = new Date().toISOString().split("T")[0];
              if (upperRating === "SEMPURNA" || upperRating === "MUTQIN" || upperRating === "BAGUS") {
                matchedTask.currentTikrarProgress = 0;
                if (upperCategory === "ZIYADAH") {
                  matchedTask.category = "QARIB";
                  c.completedSessions = (c.completedSessions || 0) + 1;
                } else if (upperCategory === "QARIB") {
                  matchedTask.consecutivePerfectDays = (matchedTask.consecutivePerfectDays || 0) + 1;
                  if (matchedTask.consecutivePerfectDays >= 7) {
                    matchedTask.category = "SABIQU";
                  }
                }
              } else if (upperRating === "ULANGI") {
                matchedTask.consecutivePerfectDays = 0;
              }
              const newTArray = [...tArray];
              newTArray[idx] = matchedTask;
              return {
                ...c,
                completedSessions: c.completedSessions || 0,
                tasks: newTArray
              };
            }
          }
          return c;
        });
        localStorage.setItem(getFallbackKey(waliId), JSON.stringify(updated));
      }
    } catch (e) {
      console.error("Local fallback performance trace failed:", e);
    }
    return false;
  }
}
