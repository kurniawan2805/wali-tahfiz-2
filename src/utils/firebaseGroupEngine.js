import { getApps, getApp, initializeApp } from "firebase/app";
import { 
  getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, getDoc, setDoc, updateDoc, 
  query, where, onSnapshot, arrayUnion, collection, getDocs, getDocFromServer
} from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
// Use environment variables for security
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
};

// Initialize Firebase Core services safely
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

// Google Auth Provider setup with select_account prompt
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Validate Connection on startup to protect data consistency
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("client is offline")) {
      console.warn("Firebase client is offline. Zero-wait local storage simulation will govern operations.");
    }
  }
}
testConnection();

// Structured operation types for precise troubleshooting
export const OperationType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write",
};

/**
 * Standard Contextual Firestore Error Handler following strict Security and Diagnostic guidelines.
 * Converts access-denied failures into explicit telemetry-friendly payloads.
 */
function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Engine Exception:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * 1. handleGoogleLogin()
 * Triggers google oauth popup. Checks and registers users if the document under /users/{uid} is empty.
 * Defaults new accounts to role: "parent" and automatically registers a default cloud workspace group.
 * 
 * @returns {Promise<Object>} The registered user profile data
 */
export async function handleGoogleLogin() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const userDocRef = doc(db, "users", user.uid);
    
    let userSnap;
    try {
      userSnap = await getDoc(userDocRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    }

    let userProfile = null;

    if (!userSnap.exists()) {
      const defaultGroupId = `group_${user.uid}`;
      userProfile = {
        uid: user.uid,
        name: user.displayName || "Pengguna Baru",
        email: user.email,
        role: "parent", // default role
        groupIds: [defaultGroupId]
      };
      
      try {
        await setDoc(userDocRef, userProfile);
        
        // Seed default group workspace document
        const groupRef = doc(db, "groups", defaultGroupId);
        await setDoc(groupRef, {
          id: defaultGroupId,
          name: `Hafalan Keluarga ${user.displayName || "Baru"}`,
          createdAt: new Date().toISOString(),
          creator: user.uid,
          members: {
            [user.uid]: {
              email: user.email,
              name: user.displayName || "Orang Tua",
              role: "parent",
              joinedAt: new Date().toISOString()
            }
          }
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
      }
    } else {
      userProfile = userSnap.data();
      // Safeguard for legacy members who had empty groupIds arrays
      if (!userProfile.groupIds || userProfile.groupIds.length === 0) {
        const defaultGroupId = `group_${user.uid}`;
        userProfile.groupIds = [defaultGroupId];
        await setDoc(userDocRef, userProfile, { merge: true });
        
        const groupRef = doc(db, "groups", defaultGroupId);
        await setDoc(groupRef, {
          id: defaultGroupId,
          name: `Hafalan Keluarga ${userProfile.name}`,
          createdAt: new Date().toISOString(),
          creator: user.uid,
          members: {
            [user.uid]: {
              email: userProfile.email,
              name: userProfile.name,
              role: "parent",
              joinedAt: new Date().toISOString()
            }
          }
        }, { merge: true });
      }
    }

    return userProfile;
  } catch (error) {
    console.error("handleGoogleLogin critical failure:", error);
    throw error;
  }
}

/**
 * Saves/updates a student's profile directly under the shared /students/{studentId} collection.
 * This guarantees real-time propagation across all collaborating devices associated with this group.
 * 
 * @param {string} groupId - The shared Group ID
 * @param {Object} student - Child profile payload
 */
export async function cloudSaveStudent(groupId, student) {
  if (!groupId || !student || !student.id) {
    console.error("cloudSaveStudent - missing required params", { groupId, student });
    return false;
  }
  const studentDocRef = doc(db, "students", student.id);
  const payload = {
    ...student,
    groupId: groupId,
    updatedAt: new Date().toISOString()
  };
  try {
    await setDoc(studentDocRef, payload, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `students/${student.id}`);
    return false;
  }
}

/**
 * Submits multiple students to overwrite/seed the collection (useful when migrating guest profiles to account-based group space)
 * 
 * @param {string} groupId 
 * @param {Array} studentsList 
 */
export async function cloudBulkSeedStudents(groupId, studentsList) {
  if (!groupId || !studentsList) return false;
  try {
    for (const student of studentsList) {
      if (student && student.id) {
        await cloudSaveStudent(groupId, student);
      }
    }
    return true;
  } catch (err) {
    console.error("cloudBulkSeedStudents failed:", err);
    return false;
  }
}

/**
 * Performs a hard delete on a student document.
 * 
 * @param {string} studentId 
 */
export async function cloudDeleteStudentDocument(studentId) {
  if (!studentId) return false;
  try {
    const { deleteDoc } = await import("firebase/firestore");
    const docRef = doc(db, "students", studentId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `students/${studentId}`);
    return false;
  }
}

/**
 * Helper to log out standard session
 */
export async function handleLogout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Logout failure:", err);
    throw err;
  }
}

/**
 * Listen to Auth state transitions.
 * @param {Function} callback 
 */
export function onAuthChanged(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * 2. listenToGroupStudents(uid, onDataUpdate)
 * Synchronizes student documents under the group identifier retrieved from /users/{uid}.
 * Attaches a real-time listener to instantly reflect classroom evaluations.
 * 
 * @param {string} uid - Authorized User UID
 * @param {Function} onDataUpdate - Callback receiving the updated students list
 * @returns {Function} Unsubscribe teardown handle
 */
export function listenToGroupStudents(uid, onDataUpdate) {
  if (!uid) {
    return () => {};
  }

  const userDocRef = doc(db, "users", uid);
  let unsubStudents = () => {};

  // Watch user profile for real-time group alignment transitions
  const unsubUser = onSnapshot(userDocRef, (userSnap) => {
    // Unsubscribe from any previous student watch
    unsubStudents();

    if (!userSnap.exists()) {
      onDataUpdate([]);
      return;
    }

    const userData = userSnap.data();
    const groupIds = userData.groupIds || [];

    if (groupIds.length === 0) {
      onDataUpdate([]);
      return;
    }

    // Connect to the primary/active group ID
    const activeGroupId = groupIds[0];
    const studentsRef = collection(db, "students");
    const q = query(studentsRef, where("groupId", "==", activeGroupId));

    unsubStudents = onSnapshot(q, (snapshot) => {
      const studentsList = [];
      snapshot.forEach((doc) => {
        studentsList.push({ id: doc.id, ...doc.data() });
      });
      onDataUpdate(studentsList);
    }, (err) => {
      console.error(`Snapshot listen to students in group ${activeGroupId} failed:`, err.message);
      // Fallback cleanly to local storage cache if disconnected
      try {
        const cached = localStorage.getItem(`gentle_group_cached_${activeGroupId}`);
        if (cached) {
          onDataUpdate(JSON.parse(cached));
        }
      } catch (cacheErr) {
        console.warn("Could not retrieve local group fallback cache:", cacheErr);
      }
    });
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  });

  // Dual-tier unsubscribe to teardown auth mapping and streaming snap cleanly
  return () => {
    unsubUser();
    unsubStudents();
  };
}

/**
 * 3. cloudSubmitAssessment(studentId, taskId, rating)
 *
 * Adaptive Murojaah engine using a binary rating model:
 *  - "lulus"  : Child recalled verse well -> streak increments, interval grows exponentially
 *  - "ulangi" : Child needs another try  -> streak resets to 0, comes back tomorrow
 *
 * Backward-compatible: legacy "sempurna"/"bagus"/"MUTQIN" map to "lulus".
 *
 * Streak -> Interval schedule (days):
 *   streak 0 -> 1d, 1 -> 3d, 2 -> 7d, 3 -> 14d, 4 -> 30d, 5+ -> 60d
 */
const STREAK_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60];

function computeNextReviewDate(streak) {
  const days = STREAK_INTERVALS_DAYS[Math.min(streak, STREAK_INTERVALS_DAYS.length - 1)];
  return new Date(Date.now() + days * 86400000).toISOString();
}

function normalizeToBinaryRating(rating) {
  if (rating === "sempurna" || rating === "MUTQIN" || rating === "bagus" || rating === "lulus") {
    return "lulus";
  }
  return "ulangi";
}

export async function cloudSubmitAssessment(studentId, taskId, rating) {
  const studentDocRef = doc(db, "students", studentId);

  try {
    const studentSnap = await getDoc(studentDocRef);
    if (!studentSnap.exists()) {
      throw new Error(`Student profile ${studentId} not found`);
    }

    const studentData = studentSnap.data();
    const binaryRating = normalizeToBinaryRating(rating);
    let updatedFields = {};

    if (studentData.memorizationProfile) {
      const mp = { ...studentData.memorizationProfile };
      let updatedZiyadah = mp.ziyadah;
      let updatedQarib = mp.qarib ? [...mp.qarib] : [];
      let updatedSabiq = mp.sabiq ? [...mp.sabiq] : [];
      let isPatched = false;

      // Ziyadah: Lulus -> graduate to Murojaah (qarib) with streak=0
      if (mp.ziyadah && mp.ziyadah.id === taskId) {
        isPatched = true;
        if (binaryRating === "lulus") {
          updatedQarib.push({
            ...mp.ziyadah,
            id: `task_qarib_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            rating: "lulus",
            streak: 0,
            nextReviewDate: computeNextReviewDate(0),
          });
          updatedZiyadah = null;
        } else {
          updatedZiyadah = {
            ...mp.ziyadah,
            rating: "ulangi",
            nextReviewDate: computeNextReviewDate(0),
          };
        }
      }
      // Murojaah qarib list
      else {
        const qaribIdx = updatedQarib.findIndex(t => t.id === taskId);
        if (qaribIdx > -1) {
          isPatched = true;
          const task = { ...updatedQarib[qaribIdx] };
          const currentStreak = task.streak ?? task.consecutiveDays ?? 0;
          if (binaryRating === "lulus") {
            const nextStreak = currentStreak + 1;
            updatedQarib[qaribIdx] = {
              ...task,
              rating: "lulus",
              streak: nextStreak,
              nextReviewDate: computeNextReviewDate(nextStreak),
            };
          } else {
            updatedQarib[qaribIdx] = {
              ...task,
              rating: "ulangi",
              streak: 0,
              nextReviewDate: computeNextReviewDate(0),
            };
          }
        }
        // Murojaah sabiq list (long-term)
        else {
          const sabiqIdx = updatedSabiq.findIndex(t => t.id === taskId);
          if (sabiqIdx > -1) {
            isPatched = true;
            const task = { ...updatedSabiq[sabiqIdx] };
            const currentStreak = task.streak ?? task.consecutiveDays ?? 0;
            if (binaryRating === "lulus") {
              const nextStreak = currentStreak + 1;
              updatedSabiq[sabiqIdx] = {
                ...task,
                rating: "lulus",
                streak: nextStreak,
                nextReviewDate: computeNextReviewDate(nextStreak),
              };
            } else {
              updatedSabiq[sabiqIdx] = {
                ...task,
                rating: "ulangi",
                streak: 0,
                nextReviewDate: computeNextReviewDate(0),
              };
            }
          }
        }
      }

      if (isPatched) {
        updatedFields = {
          "memorizationProfile.ziyadah": updatedZiyadah,
          "memorizationProfile.qarib": updatedQarib,
          "memorizationProfile.sabiq": updatedSabiq,
        };
      }
    }

    if (Object.keys(updatedFields).length > 0) {
      await updateDoc(studentDocRef, updatedFields);

      // Update local cache for offline resiliency
      try {
        const cached = localStorage.getItem(`gentle_group_cached_${studentData.groupId}`);
        if (cached) {
          const storedList = JSON.parse(cached);
          const studentIdx = storedList.findIndex(s => s.id === studentId);
          if (studentIdx > -1) {
            storedList[studentIdx].memorizationProfile = {
              ...storedList[studentIdx].memorizationProfile,
              ziyadah: updatedFields["memorizationProfile.ziyadah"],
              qarib: updatedFields["memorizationProfile.qarib"],
              sabiq: updatedFields["memorizationProfile.sabiq"],
            };
            localStorage.setItem(`gentle_group_cached_${studentData.groupId}`, JSON.stringify(storedList));
          }
        }
      } catch (cacheErr) {
        console.warn("Soft fail patching local offline assessment cache:", cacheErr.message);
      }
      return true;
    }

    return false;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `students/${studentId}`);
    return false;
  }
}


/**
 * 4. cloudInviteToGroup(currentGroupId, inviteeEmail, assignRole)
 * Initiates collaboration between parents and teachers (Ayah, Ibu, Guru).
 * Adds the group to the invitee's groupIds roster, and adds the invitee to the /groups' members map.
 * 
 * @param {string} currentGroupId - The active family/school group token
 * @param {string} inviteeEmail - Target email address (e.g. kurniawan2805@gmail.com)
 * @param {string} assignRole - Designation: "ayah", "ibu", "guru"
 */
export async function cloudInviteToGroup(currentGroupId, inviteeEmail, assignRole) {
  if (!currentGroupId || !inviteeEmail) {
    throw new Error("Invalid parameters: group ID and invitee email are required.");
  }

  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", inviteeEmail.toLowerCase().trim()));
    const querySnap = await getDocs(q);

    if (querySnap.empty) {
      throw new Error(`Pengguna dengan email '${inviteeEmail}' belum mendaftar di aplikasi Hafalan Gentle.`);
    }

    // Process all users matching this email (or first match)
    const targetDoc = querySnap.docs[0];
    const targetUid = targetDoc.id;

    // 1. Update the invitee user's document groupIds roster with the inviting group ID
    const userDocRef = doc(db, "users", targetUid);
    await updateDoc(userDocRef, {
      groupIds: arrayUnion(currentGroupId)
    });

    // 2. Add the user into the primary Group doc's members object
    const groupDocRef = doc(db, "groups", currentGroupId);
    await setDoc(groupDocRef, {
      members: {
        [targetUid]: {
          email: inviteeEmail.toLowerCase().trim(),
          role: assignRole,
          joinedAt: new Date().toISOString()
        }
      }
    }, { merge: true });

    return { success: true, targetUid };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `groups/${currentGroupId}`);
    return { success: false, error: err.message };
  }
}

/**
 * 5. cloudJoinGroup(groupId, role)
 * Allows a user to join an existing family group by entering its code/identifier.
 * Adds the groupId to the joining user's groupIds roster, and adds the user to the /groups' members map.
 * 
 * @param {string} groupId - The target Group ID
 * @param {string} role - Designation: "ayah", "ibu", "guru"
 */
export async function cloudJoinGroup(groupId, role = "parent") {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Anda harus login terlebih dahulu.");
  }
  if (!groupId) {
    throw new Error("Kode grup tidak boleh kosong.");
  }

  const cleanGroupId = groupId.trim();
  try {
    // 1. Verify group exists in firestore
    const groupDocRef = doc(db, "groups", cleanGroupId);
    const groupSnap = await getDoc(groupDocRef);
    if (!groupSnap.exists()) {
      throw new Error(`Grup dengan kode '${cleanGroupId}' tidak ditemukan.`);
    }

    // 2. Update the joining user's document groupIds roster with the target group ID
    const userDocRef = doc(db, "users", currentUser.uid);
    await updateDoc(userDocRef, {
      groupIds: arrayUnion(cleanGroupId)
    });

    // 3. Add the user into the target Group doc's members object
    await setDoc(groupDocRef, {
      members: {
        [currentUser.uid]: {
          email: currentUser.email.toLowerCase().trim(),
          name: currentUser.displayName || "Anggota Keluarga",
          role: role,
          joinedAt: new Date().toISOString()
        }
      }
    }, { merge: true });

    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `groups/${cleanGroupId}`);
    return { success: false, error: err.message };
  }
}

