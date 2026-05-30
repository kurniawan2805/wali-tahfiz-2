import React, { useState } from "react";
import { 
  Baby, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Mic,
  Settings, 
  BookOpen, 
  RotateCcw,
  PlusCircle,
  Edit2,
  ChevronRight,
  ChevronLeft,
  Users,
  Clock,
  Sparkles,
  LogOut,
  RefreshCw,
  Award,
  Info,
  CheckCircle2,
  BookMarked,
  UserCheck,
  Languages
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChildProfile } from "../types";
import { ToddlerSoundSynth } from "../utils/audio";
import { MONTHS_INDO, getYearsList, calculateAge } from "../utils/dateUtils";
import { translations as globalTranslations } from "../utils/translations";
import { useOfflineCache } from "../hooks/useOfflineCache";

interface SettingsScreenProps {
  childrenList: ChildProfile[];
  lang?: "ID" | "EN";
  setLang?: (lang: "ID" | "EN") => void;
  onAddChild: (name: string, birthMonth: number, birthYear: number, avatar: string) => void;
  onEditChild: (
    id: string,
    name: string,
    birthMonth: number,
    birthYear: number,
    avatar: string,
    talaqqiRepeats: number,
    tikrarRepeats: number,
    maxSessionDuration: number,
    rabtRepeats: number,
    arabicFontSize?: 'small' | 'medium' | 'large' | 'xlarge' | 'huge'
  ) => void;
  onDeleteChild: (id: string) => void;
  onRestoreChild: (id: string) => void;
  onPermanentDeleteChild: (id: string) => void;
  muted: boolean;
  onSetMuted: (muted: boolean) => void;
  onClearAllSessionData: () => void;
  soundSynth: ToddlerSoundSynth | null;
  currentUser?: any;
  onSignOut?: () => void;
  activeGroupId?: string | null;
  onInviteToGroup?: (email: string, role: string) => Promise<{ success: boolean; error?: string }>;
  onJoinGroup?: (groupId: string, role: string) => Promise<{ success: boolean; error?: string }>;
  autoOpenAddChildForm?: boolean;
  onClearAutoOpenAddChildForm?: () => void;
  initialSubView?: "profil-anak" | "anggota-grup" | "kurikulum-presets" | "screentime-qari" | "cloud-sync" | "delete-data" | "tentang" | "offline-storage" | null;
  onClearInitialSubView?: () => void;
  globalQari?: string;
  onGlobalQariChange?: (qariId: string) => void;
}

const AVATARS = [
  '🌟', // Shining Star
  '🌙', // Crescent Moon
  '☀️', // Bright Sun
  '🌈', // Rainbow
  '🎈', // Balloon
  '🍀', // Four-Leaf Clover
  '💎'  // Precious Gem
];

const translations = {
  ID: {
    title: "Pengaturan Wali Tahfiz",
    sub: "Konfigurasi sistem aplikasi",
    signOut: "Keluar",
    profileSection: "Manajemen Profil & Kelompok",
    editProfile: "Ubah Profil Anak",
    editProfileSub: "Ubah nama, bulan lahir, avatar lucu, dan hapus profil.",
    groupMember: "Kelola Anggota Grup (Kolaborasi)",
    groupMemberSub: "Sinkronisasi data bersama Ayah, Ibu, atau Guru Tahfiz.",
    curriculumSection: "Kurikulum & Target Sesi",
    sessionTarget: "Konfigurasi Target Sesi",
    sessionTargetSub: "Atur target berulang audio otomatis untuk setiap anak.",
    controlSection: "Kontrol Orang Tua & Belajar",
    screenTime: "Batas Durasi Screen Time",
    screenTimeSub: "Batasan menit belajar aktif per sesi anak.",
    voiceInt: "Suara Interaktif Instan",
    voiceIntSub: "Bunyi synthesizer peluit harakat dan piala emas.",
    systemSection: "Sistem & Preferensi",
    dbAuth: "Atur Database & Autentikasi",
    dbAuthSub: "Koneksi sync, ganti akun, atau login tamu.",
    resetApp: "Setel Ulang Aplikasi",
    resetAppSub: "Hapus semua database piala, streak, dan progres lokal.",
    aboutApp: "Tentang Wali Tahfiz",
    aboutAppSub: "Detail kurikulum, lisensi aplikasi, dan kredit.",
    qariLabel: "Pilihan Qari Rujukan",
    qariSub: "Pilih syeikh/qari untuk pemutaran audio otomatis talaqqi",
    qariTitle: "Pilih Qari Pembaca"
  },
  EN: {
    title: "Parent & Teacher Settings",
    sub: "System configuration",
    signOut: "Sign Out",
    profileSection: "Profile & Group Management",
    editProfile: "Edit Child Profile",
    editProfileSub: "Change name, birth month, avatars, or remove profiles.",
    groupMember: "Manage Group Members",
    groupMemberSub: "Real-time sync with Father, Mother, or Tahfiz Teacher.",
    curriculumSection: "Curriculum & Targets",
    sessionTarget: "Session Target Configuration",
    sessionTargetSub: "Set automatic audio repetition rules per child.",
    controlSection: "Parental Controls & Learning",
    screenTime: "Daily Screen Time Limits",
    screenTimeSub: "Set active session timers and dynamic lockouts.",
    voiceInt: "Instant Interactive Audio",
    voiceIntSub: "Toggle sound synthesizer, haptic alerts, and trophy FX.",
    systemSection: "System & Preferences",
    dbAuth: "Database & Authentication",
    dbAuthSub: "Cloud sync engine parameters, backup, or guest login.",
    resetApp: "Reset Application",
    resetAppSub: "Wipe local trophies, daily streaks, and cached storage.",
    aboutApp: "About Wali Tahfiz",
    aboutAppSub: "Curriculum details, open-source licensing, and credits.",
    qariLabel: "Default Qari Selection",
    qariSub: "Choose the primary sheikh/reciter for automatic audio playback",
    qariTitle: "Select Reciter"
  }
};

export default function SettingsScreen({
  childrenList,
  onAddChild,
  onEditChild,
  onDeleteChild,
  onRestoreChild,
  onPermanentDeleteChild,
  muted,
  onSetMuted,
  onClearAllSessionData,
  soundSynth,
  currentUser,
  onSignOut,
  activeGroupId,
  onInviteToGroup,
  onJoinGroup,
  autoOpenAddChildForm,
  onClearAutoOpenAddChildForm,
  initialSubView,
  onClearInitialSubView,
  globalQari,
  onGlobalQariChange,
  lang = "ID",
  setLang,
}: SettingsScreenProps) {
  const t = globalTranslations[lang];
  // Navigation State Drill-down
  const [activeSubView, setActiveSubView] = useState<
    null | "profil-anak" | "anggota-grup" | "kurikulum-presets" | "screentime-qari" | "cloud-sync" | "delete-data" | "tentang" | "offline-storage"
  >(null);
  const [aboutTab, setAboutTab] = useState<"metode" | "panduan" | "atribusi">("metode");

  const {
    downloadProgress,
    isDownloading,
    cachedCount,
    cacheSizeStr,
    startDownload,
    cancelDownload,
    clearAudioCache
  } = useOfflineCache();

  // Selected Qari for offline download
  const [selectedQariForOffline, setSelectedQariForOffline] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem("wali_tahfidz_global_qari") || "ar.alafasy" : "ar.alafasy")
  );

  // Add child states
  const [name, setName] = useState("");
  const [birthMonth, setBirthMonth] = useState<number>(new Date().getMonth() + 1);
  const [birthYear, setBirthYear] = useState<number>(new Date().getFullYear() - 3);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [showAddForm, setShowAddForm] = useState(false);

  React.useEffect(() => {
    if (autoOpenAddChildForm) {
      setActiveSubView("profil-anak");
      setShowAddForm(true);
      if (onClearAutoOpenAddChildForm) {
        onClearAutoOpenAddChildForm();
      }
    }
  }, [autoOpenAddChildForm, onClearAutoOpenAddChildForm]);

  React.useEffect(() => {
    if (initialSubView) {
      setActiveSubView(initialSubView);
      if (onClearInitialSubView) {
        onClearInitialSubView();
      }
    }
  }, [initialSubView, onClearInitialSubView]);

  // Invitation collaborative state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("ayah");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Join Group collaborative state
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinRoleInput, setJoinRoleInput] = useState("ayah");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinStatus, setJoinStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // User Profile & Role State for Dynamic Kunyah Greeting Generation
  const [userRole, setUserRole] = useState<'ayah' | 'bunda' | 'guru' | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gentle_user_role");
      return (saved === 'ayah' || saved === 'bunda' || saved === 'guru') ? saved : null;
    }
    return null;
  });

  const [showFeedback, setShowFeedback] = useState(false);

  const handleSetUserRole = (role: 'ayah' | 'bunda' | 'guru' | null) => {
    setUserRole(role);
    if (typeof window !== "undefined") {
      if (role) {
        localStorage.setItem("gentle_user_role", role);
      } else {
        localStorage.removeItem("gentle_user_role");
      }
    }
  };

  // Edit child profile state
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBirthMonth, setEditBirthMonth] = useState<number>(new Date().getMonth() + 1);
  const [editBirthYear, setEditBirthYear] = useState<number>(new Date().getFullYear() - 3);
  const [editAvatar, setEditAvatar] = useState(AVATARS[0]);

  // Edit child presets state (individual quick modification buffers used globally)
  const [editTalaqqiPreset, setEditTalaqqiPreset] = useState<number | "Custom">(5);
  const [editTalaqqiCustomVal, setEditTalaqqiCustomVal] = useState<number>(5);
  const [editTikrarPreset, setEditTikrarPreset] = useState<number | "Custom">(10);
  const [editTikrarCustomVal, setEditTikrarCustomVal] = useState<number>(10);
  const [editDurationPreset, setEditDurationPreset] = useState<number | "Custom">(15);
  const [editDurationCustomVal, setEditDurationCustomVal] = useState<number>(15);
  const [showCustomInputForChild, setShowCustomInputForChild] = useState<Record<string, boolean>>({});
  const [customDurInputVal, setCustomDurInputVal] = useState<Record<string, string>>({});

  // Use props for global Qari sync
  const [isQariModalOpen, setIsQariModalOpen] = useState(false);

  React.useEffect(() => {
    if (globalQari) setSelectedQariForOffline(globalQari);
  }, [globalQari]);

// 1. Sinkronkan qariList dengan ID yang valid dari API
    const qariList = [
    { id: 'ar.tunaiji', name: 'Al-Tunaiji (Standard)', style: 'Murattal' },
    { id: 'ar.husarymuallim', name: 'Al-Husary (Muallim)', style: 'Guru & Repetisi' },
    { id: 'ar.minshawikids', name: 'Al-Minshawi (Kids)', style: 'Guru & Anak' },
    { id: 'ar.aymanswayd', name: 'Ayman Sowaid', style: 'Tajwid Visual' },
    { id: 'ar.ibrahimakhdar', name: 'Ibrahim Al-Akhdar', style: 'Ringan 32kbps' },
    { id: 'ar.hudhaify_32', name: 'Al-Hudhaify', style: 'Ringan 32kbps' },
    { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy', style: 'Populer' }
  ];

  // 2. Perbaiki typo key agar match 100% dengan database Alquran.cloud
  const QARI_NAMES: Record<string, string> = {
    'ar.alafasy': 'Mishary Rashid Alafasy',
    'ar.alafasy-2': 'Mishary Rashid Alafasy (Alt)',
    'ar.minshawikids': 'Al-Minshawi (dengan Anak)',
    'ar.husary': 'Mahmoud Khalil Al-Husary',
    'ar.husarymujawwad': 'Mahmoud Khalil Al-Husary (Mujawwad)',
    'ar.hudhaify': 'Ali Al-Hudhaify',
    'ar.muhammadayyoub': 'Muhammad Ayyoub',
    'ar.ibrahimakhbar': 'Ibrahim Al-Akhdar', // perbaikan dari ar.alakahdar
    'ar.aymanswoaid': 'Ayman Sowaid',         // perbaikan dari ar.aymanswayd
    'ar.abdullahbasfar': 'Abdullah Basfar',
    'ar.ahmedajamy': 'Ahmed Al-Ajamy',
    'ar.shaatree': 'Abu Bakr Ash-Shaatree'
  };

  // Logika penentuan nama aktif (Sudah Sangat Bagus!)
  const activeQariName = QARI_NAMES[globalQari || "ar.alafasy"] || qariList.find(q => q.id === (globalQari || "ar.alafasy"))?.name || "Mishary Rashid Alafasy";

  const handleSelectQari = (qariId: string) => {
    if (onGlobalQariChange) {
      onGlobalQariChange(qariId);
    }
    
    if (soundSynth) {
      if (soundSynth.playSuccess) {
        soundSynth.playSuccess();
      } else if (soundSynth.playPop) {
        soundSynth.playPop();
      }
    }
  };



  const [deletingChildId, setDeletingChildId] = useState<string | null>(null);
  const [permDeletingChildId, setPermDeletingChildId] = useState<string | null>(null);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState<boolean>(false);
  const [showClearSuccessToast, setShowClearSuccessToast] = useState<boolean>(false);

  // Keep track of unsaved quick edits per child for immediate database saving feedback
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  const triggerPlayPop = () => {
    if (soundSynth && soundSynth.playPop) soundSynth.playPop();
  };

  const triggerPlaySuccess = () => {
    if (soundSynth && soundSynth.playSuccess) soundSynth.playSuccess();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddChild(name.trim(), birthMonth, birthYear, selectedAvatar);
    setName("");
    setBirthMonth(new Date().getMonth() + 1);
    setBirthYear(new Date().getFullYear() - 3);
    setShowAddForm(false);
    triggerPlaySuccess();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChildId || !editName.trim()) return;

    const talaqqiCount = editTalaqqiPreset === "Custom" ? editTalaqqiCustomVal : Number(editTalaqqiPreset);
    const tikrarCount = editTikrarPreset === "Custom" ? editTikrarCustomVal : Number(editTikrarPreset);
    const durationCount = editDurationPreset === "Custom" ? editDurationCustomVal : Number(editDurationPreset);

    const child = childrenList.find((c) => c.id === editingChildId);
    const existingRabt = child?.settings?.rabtRepeats ?? 3;
    const existingFontSize = child?.settings?.arabicFontSize ?? 'large';

    onEditChild(
      editingChildId,
      editName.trim(),
      editBirthMonth,
      editBirthYear,
      editAvatar,
      talaqqiCount,
      tikrarCount,
      durationCount,
      existingRabt,
      existingFontSize
    );
    setEditingChildId(null);
    setEditName("");
    triggerPlaySuccess();
  };

  // Immediate save child settings directly in the categorized sub-pages
  const handleDirectChildSettingUpdate = (
    child: ChildProfile, 
    field: "repeats" | "duration" | "fontSize" | "rabt", 
    tRepeats?: number, 
    tTikrar?: number, 
    mDuration?: number,
    tRabt?: number,
    arabicFontSize?: 'small' | 'medium' | 'large' | 'xlarge' | 'huge'
  ) => {
    const defaultSettings = child.settings || { talaqqiAudioRepeats: 5, tikrarSelfRepeats: 10, maxSessionDuration: 15, rabtRepeats: 3, arabicFontSize: 'large' };
    const talaqqi = tRepeats ?? defaultSettings.talaqqiAudioRepeats;
    const tikrar = tTikrar ?? defaultSettings.tikrarSelfRepeats;
    const duration = mDuration ?? defaultSettings.maxSessionDuration;
    const rabt = tRabt ?? defaultSettings.rabtRepeats ?? 3;
    const fontSize = arabicFontSize ?? defaultSettings.arabicFontSize ?? 'large';

    onEditChild(
      child.id,
      child.name,
      child.birthMonth || 5,
      child.birthYear || 2021,
      child.avatar || "🌟",
      talaqqi,
      tikrar,
      duration,
      rabt,
      fontSize
    );
    
    setSaveStatusMessage(`✨ Target ${child.name} tersimpan!`);
    triggerPlaySuccess();
    setTimeout(() => setSaveStatusMessage(null), 2500);
  };

  return (
    <div className="w-full h-svh flex flex-col justify-start overflow-hidden bg-[#FDFBF7] text-[#3A405A] max-w-md mx-auto relative">
      
      {/* Dynamic Drilldown Header */}
      <header className="h-16 bg-white border-b-4 border-[#EBE6D9] px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          {activeSubView ? (
            <button
              onClick={() => {
                triggerPlayPop();
                setActiveSubView(null);
              }}
              className="p-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 stroke-[3px]" />
            </button>
          ) : (
            <div className="bg-[#48C78E]/10 p-2 rounded-xl text-[#48C78E]">
              <Settings className="w-5 h-5" />
            </div>
          )}
          
          <div className="text-left font-sans">
            <h2 className="text-sm font-black text-slate-800 tracking-tight">
              {activeSubView === "profil-anak" && (lang === "EN" ? "Edit Child Profile" : "Ubah Profil Anak")}
              {activeSubView === "anggota-grup" && (lang === "EN" ? "Manage Group Members" : "Kelola Anggota Kelompok")}
              {activeSubView === "kurikulum-presets" && (lang === "EN" ? "Session Target Configuration" : "Konfigurasi Target Sesi")}
              {activeSubView === "screentime-qari" && (lang === "EN" ? "Daily Screen Time Limits" : "Batas Durasi Screen Time")}
              {activeSubView === "cloud-sync" && (lang === "EN" ? "Database Settings" : "Atur Database & Autentikasi")}
              {activeSubView === "delete-data" && (lang === "EN" ? "Reset Application" : "Setel Ulang Aplikasi")}
              {activeSubView === "offline-storage" && (lang === "EN" ? "Offline Storage" : "Penyimpanan Offline")}
              {activeSubView === "tentang" && (lang === "EN" ? "About Wali Tahfiz" : "Tentang Wali Tahfiz")}
              {!activeSubView && translations[lang].title}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 tracking-wide">
              {activeSubView ? "Wali Tahfiz Premium" : translations[lang].sub}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && !activeSubView && (
            <button
              onClick={() => {
                triggerPlayPop();
                if (onSignOut) onSignOut();
              }}
              className="p-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-black tracking-tight uppercase"
              title={lang === "EN" ? "Log out of Google Account" : "Keluar Akun Google"}
            >
              <LogOut className="w-4 h-4" />
              <span>{lang === "EN" ? "Out" : "Keluar"}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container Stage */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 scrollbar-none relative">
        <AnimatePresence mode="wait">
          {!activeSubView ? (
            /* 1. THE SETTINGS HUB / HOMEPAGE */
            <motion.div
              key="main-settings-hub"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Google Account / Guest Active Card Header */}
              <div className="bg-white p-5 rounded-3xl border-2 border-[#EBE6D9] shadow-xs flex flex-col gap-4">
                {currentUser ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3.5">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || "Google"}
                          className="w-12 h-12 rounded-full border border-[#EBE6D9] object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#48C78E] flex items-center justify-center text-lg font-black border border-emerald-200">
                          {String(currentUser.displayName || "W").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="text-left font-sans">
                        <p className="text-sm font-black text-[#3A405A] leading-tight flex items-center gap-1">
                          {currentUser.displayName || "Wali Pengguna"}
                          <span className="inline-block w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse border border-white" />
                        </p>
                        <p className="text-[10px] font-bold text-neutral-400 mt-0.5 truncate max-w-[180px]">
                          {currentUser.email || "Terhubung via Google"}
                        </p>
                        <span className="inline-flex mt-1 px-2 py-0.5 text-[8px] font-black text-emerald-700 bg-emerald-50 rounded-md uppercase tracking-wider border border-emerald-100">
                          CLOUD AKTIF ☁️
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="bg-amber-50/70 p-4 rounded-2xl border-2 border-amber-200 flex items-start gap-3">
                      <span className="text-xl">⚠️</span>
                      <div className="font-sans">
                        <h4 className="text-xs font-black text-amber-800 uppercase tracking-tight">Mode Tamu (Offline)</h4>
                        <p className="text-[10px] font-bold text-amber-600 leading-normal mt-0.5">
                          Data progress disimpan lokal pada browser ini. Gabungkan akun dengan Google sekarang untuk pencadangan cloud global real-time secara instan!
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerPlayPop();
                        localStorage.removeItem("wali_session_guest");
                        window.location.reload();
                      }}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer active:scale-[0.98] text-center uppercase tracking-wider leading-none font-sans"
                    >
                      Hubungkan via Google Cloud 🔗
                    </button>
                  </div>
                )}
              </div>

              {/* GROUP A (Profile & Group) */}
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[11px] font-extrabold text-slate-400/90 tracking-wider uppercase mb-2 pl-1">
                  👥 {translations[lang].profileSection}
                </h2>
                <div className="w-full bg-white rounded-2xl border border-slate-100/80 divide-y divide-slate-100 overflow-hidden shadow-sm">
                  {/* Row A1: Edit Child Profile */}
                  <button
                    type="button"
                    onClick={() => { triggerPlayPop(); setActiveSubView("profil-anak"); }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 rounded-xl text-[#48C78E] text-sm shrink-0">
                        <Baby className="w-4 h-4" />
                      </div>
                      <div className="text-left font-sans col-span-1">
                        <p className="text-xs font-bold text-slate-800">
                          {translations[lang].editProfile} ({childrenList.filter(c => !c.isDeleted).length})
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {translations[lang].editProfileSub}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>

                  {/* Row A2: Kelola Anggota Grup */}
                  {currentUser && (
                    <button
                      type="button"
                      onClick={() => { triggerPlayPop(); setActiveSubView("anggota-grup"); }}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-xl text-[#48C78E] text-sm shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="text-left font-sans col-span-1">
                          <p className="text-xs font-bold text-slate-800">
                            {translations[lang].groupMember}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                            {translations[lang].groupMemberSub}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  )}
                </div>
              </div>

              {/* GROUP B (Curriculum & Limits) */}
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[11px] font-extrabold text-slate-400/90 tracking-wider uppercase mb-2 pl-1">
                  📚 {translations[lang].curriculumSection}
                </h2>
                <div className="w-full bg-white rounded-2xl border border-slate-100/80 divide-y divide-slate-100 overflow-hidden shadow-sm">
                  {/* Row B1: Session Target */}
                  <button
                    type="button"
                    onClick={() => { triggerPlayPop(); setActiveSubView("kurikulum-presets"); }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 rounded-xl text-[#48C78E] text-sm shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="text-left font-sans col-span-1">
                        <p className="text-xs font-bold text-slate-800">
                          {translations[lang].sessionTarget}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {translations[lang].sessionTargetSub}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>

                  {/* Qari Selection Row */}
                  <button 
                    type="button"
                    onClick={() => {
                      triggerPlayPop();
                      setIsQariModalOpen(true);
                    }} 
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 text-sm shrink-0">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div className="text-left font-sans col-span-1">
                        <p className="text-xs font-bold text-slate-800">{translations[lang].qariLabel}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {activeQariName || "Mishary Rashid Alafasy"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>

                  {/* Row B2: Daily Screen Time */}
                  <button
                    type="button"
                    onClick={() => { triggerPlayPop(); setActiveSubView("screentime-qari"); }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 rounded-xl text-[#48C78E] text-sm shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="text-left font-sans col-span-1">
                        <p className="text-xs font-bold text-slate-800">
                          {translations[lang].screenTime}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {translations[lang].screenTimeSub}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>

                  {/* Row B3: Audio Synthesizer Toggle */}
                  <div className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 flex items-center text-left gap-3 outline-none">
                      <div className={`p-2 rounded-xl text-sm shrink-0 ${muted ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </div>
                      <div className="text-left font-sans">
                        <p className="text-xs font-bold text-slate-800">
                          {translations[lang].voiceInt}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {translations[lang].voiceIntSub}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerPlayPop();
                        onSetMuted(!muted);
                      }}
                      className={`w-14 h-9 rounded-full relative flex items-center transition-colors shadow-xs outline-none border cursor-pointer shrink-0 ${
                        !muted ? "bg-emerald-500 border-transparent" : "bg-neutral-200 border-neutral-300"
                      }`}
                    >
                      <span className={`w-7 h-7 bg-white rounded-full shadow-sm absolute transition-all flex items-center justify-center ${
                        !muted ? "left-[22.5px]" : "left-[4px]"
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* GROUP C (System) */}
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[11px] font-extrabold text-slate-400/90 tracking-wider uppercase mb-2 pl-1">
                  ⚙️ {translations[lang].systemSection}
                </h2>
                <div className="w-full bg-white rounded-2xl border border-slate-100/80 divide-y divide-slate-100 overflow-hidden shadow-sm">
                  {/* Row C0: Penyimpanan Offline */}
                  <button
                    type="button"
                    onClick={() => { triggerPlayPop(); setActiveSubView("offline-storage"); }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 rounded-xl text-[#48C78E] text-sm shrink-0">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                      </div>
                      <div className="text-left font-sans col-span-1">
                        <p className="text-xs font-bold text-slate-800 font-sans">
                          {lang === "EN" ? "Offline Storage" : "Penyimpanan Offline"}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {lang === "EN" ? "Download Juz 30 audio & fonts." : "Unduh audio Juz 30 & font tanpa internet."}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>

                  {/* Hide language switcher row to focus on Indonesian
                  <div className="w-full flex items-center justify-between p-4 bg-white">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 text-sm flex-shrink-0">
                        <Languages className="w-4 h-4" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-bold text-slate-800">
                          {lang === 'ID' ? 'Bahasa Aplikasi' : 'App Language'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                          {lang === 'ID' ? 'Pilih pengantar bahasa untuk sistem navigasi.' : 'Select primary interface language.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex bg-slate-100 rounded-full p-0.5 border border-slate-200/40 flex-shrink-0 shadow-sm ml-2">
                      <button 
                        onClick={() => {
                          triggerPlayPop();
                          if (setLang) setLang('ID');
                        }} 
                        className={`px-3 py-1 text-[10px] font-black tracking-wider rounded-full transition-all cursor-pointer ${
                          lang === 'ID' ? 'bg-[#48C78E] text-white shadow-sm' : 'text-slate-400'
                        }`}
                      >
                        ID
                      </button>
                      <button 
                        onClick={() => {
                          triggerPlayPop();
                          if (setLang) setLang('EN');
                        }} 
                        className={`px-3 py-1 text-[10px] font-black tracking-wider rounded-full transition-all cursor-pointer ${
                          lang === 'EN' ? 'bg-[#48C78E] text-white shadow-sm' : 'text-slate-400'
                        }`}
                      >
                        EN
                      </button>
                    </div>
                  </div>
                  */}

                  {/* Row C1: Atur Database */}
                  <button
                    type="button"
                    onClick={() => { triggerPlayPop(); setActiveSubView("cloud-sync"); }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 rounded-xl text-[#48C78E] text-sm shrink-0">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                      <div className="text-left font-sans col-span-1">
                        <p className="text-xs font-bold text-slate-800">
                          {translations[lang].dbAuth}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {translations[lang].dbAuthSub}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>

                  {/* Row C2: Setel Ulang */}
                  <button
                    type="button"
                    onClick={() => { triggerPlayPop(); setActiveSubView("delete-data"); }}
                    className="w-full flex items-center justify-between p-4 hover:bg-rose-50/30 text-rose-600 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-rose-50 rounded-xl text-rose-500 text-sm shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div className="text-left font-sans col-span-1">
                        <p className="text-xs font-bold text-rose-700">
                          {translations[lang].resetApp}
                        </p>
                        <p className="text-[10px] text-rose-400 mt-0.5 leading-snug">
                          {translations[lang].resetAppSub}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-rose-300 shrink-0" />
                  </button>

                  {/* Row C3: Tentang Wali Tahfiz */}
                  <button
                    type="button"
                    onClick={() => { triggerPlayPop(); setActiveSubView("tentang"); }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 rounded-xl text-[#48C78E] text-sm shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div className="text-left font-sans col-span-1">
                        <p className="text-xs font-bold text-slate-800">
                          {translations[lang].aboutApp}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {translations[lang].aboutAppSub}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* DRILL-DOWN CATEGORIZED SPECIFIC VIEW WITH SLIDE ANIMATION EFFECT */
            <motion.div
              key={activeSubView}
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.15 }}
              className="space-y-4 pb-12"
            >
              
              {/* SAVE TOAST / STATUS FEEDBACK ON THE GO NOTIFICATION */}
              {saveStatusMessage && (
                <div className="bg-emerald-500 text-white text-xs font-black py-2.5 px-4 rounded-xl text-center shadow-md animate-scale-up-gentle uppercase tracking-wider mb-2 border border-emerald-600/20">
                  {saveStatusMessage}
                </div>
              )}

              {/* RENDER VIEW 1: PROFIL ANAK (Management list and addition form) */}
              {activeSubView === "profil-anak" && (
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-3xl border border-[#EBE6D9] shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black uppercase tracking-wider text-[#48C78E] flex items-center gap-1 leading-none">
                        👶 PROFIL WALISANTRI CILIK
                      </h3>
                      <button
                        onClick={() => {
                          setShowAddForm(!showAddForm);
                          triggerPlayPop();
                        }}
                        className="text-xs font-black text-[#48C78E] flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Tambah Anak
                      </button>
                    </div>

                    {showAddForm && (
                      <form 
                        onSubmit={handleSubmit}
                        className="bg-[#FDFBF7] p-4 rounded-2xl border-2 border-[#48C78E]/40 flex flex-col gap-3.5 mb-4 shadow-inner"
                      >
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black text-[#A39E93] uppercase">Nama Anak</label>
                          <input 
                            type="text" 
                            placeholder="cth: Muhammad"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-white border-2 border-[#EBE6D9] rounded-xl px-3 py-2 text-xs font-bold outline-none font-sans focus:border-[#48C78E]"
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black text-[#A39E93] uppercase">Bulan & Tahun Lahir Anak</label>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={birthMonth}
                              onChange={(e) => setBirthMonth(Number(e.target.value))}
                              className="bg-white border-2 border-[#EBE6D9] rounded-xl px-2 py-2 text-xs font-bold font-sans outline-none"
                            >
                              {MONTHS_INDO.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                            <select
                              value={birthYear}
                              onChange={(e) => setBirthYear(Number(e.target.value))}
                              className="bg-white border-2 border-[#EBE6D9] rounded-xl px-2 py-2 text-xs font-bold font-sans outline-none"
                            >
                              {getYearsList().map((y) => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                          <p className="text-[10px] text-[#48C78E] font-black mt-1">
                            ✨ Usia Otomatis: <span className="bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{calculateAge(birthYear, birthMonth)}</span>
                          </p>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black text-[#A39E93] uppercase">Pilih Avatar</label>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {AVATARS.map((avatar) => (
                              <button
                                key={avatar}
                                type="button"
                                onClick={() => setSelectedAvatar(avatar)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer ${
                                  selectedAvatar === avatar
                                    ? "bg-[#FFD93D] scale-110 shadow-md border-2 border-white"
                                    : "bg-white border border-neutral-100 hover:border-neutral-200"
                                }`}
                              >
                                {avatar}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-100">
                          <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="text-xs font-bold text-neutral-400 px-3 py-1.5 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="bg-[#48C78E] hover:bg-[#3ab37c] text-white px-4 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer"
                          >
                            {t.saveChanges}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Listing of active toddlers */}
                    <div className="space-y-3">
                      {childrenList.filter(child => !child.isDeleted).map((child) => {
                        const isConfirming = deletingChildId === child.id;
                        const isEditing = editingChildId === child.id;

                        if (isEditing) {
                          return (
                            <form 
                              key={child.id}
                              onSubmit={handleEditSubmit}
                              className="bg-amber-50/20 p-4 rounded-2xl border-2 border-emerald-400 flex flex-col gap-3.5 animate-scale-up-gentle"
                            >
                              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                                Ubah Profil {child.name} 📝
                              </p>
                              
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-[#A39E93] uppercase">Nama Anak</label>
                                <input 
                                  type="text" 
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="bg-white border-2 border-[#EBE6D9] rounded-xl px-3 py-2 text-xs font-bold outline-none font-sans focus:border-[#48C78E]"
                                  required
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-[#A39E93] uppercase">Bulan & Tahun Lahir Anak</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    value={editBirthMonth}
                                    onChange={(e) => setEditBirthMonth(Number(e.target.value))}
                                    className="bg-white border-2 border-[#EBE6D9] rounded-xl px-2 py-2 text-xs font-bold font-sans outline-none"
                                  >
                                    {MONTHS_INDO.map((m) => (
                                      <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                  </select>
                                  <select
                                    value={editBirthYear}
                                    onChange={(e) => setEditBirthYear(Number(e.target.value))}
                                    className="bg-white border-2 border-[#EBE6D9] rounded-xl px-2 py-2 text-xs font-bold font-sans outline-none"
                                  >
                                    {getYearsList().map((y) => (
                                      <option key={y} value={y}>{y}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-[#A39E93] uppercase">Pilih Avatar</label>
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {AVATARS.map((avatar) => (
                                    <button
                                      key={avatar}
                                      type="button"
                                      onClick={() => setEditAvatar(avatar)}
                                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer ${
                                        editAvatar === avatar
                                          ? "bg-[#FFD93D] scale-110 shadow-md border-2 border-white"
                                          : "bg-white border border-neutral-100 hover:border-neutral-200"
                                      }`}
                                    >
                                      {avatar}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-150">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingChildId(null);
                                    triggerPlayPop();
                                  }}
                                  className="text-xs font-bold text-neutral-400 px-3 py-1.5"
                                >
                                  Batal
                                </button>
                                <button
                                  type="submit"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer"
                                >
                                  {t.saveChanges}
                                </button>
                              </div>
                            </form>
                          );
                        }

                        return (
                          <div 
                            key={child.id}
                            className={`flex flex-col p-4 rounded-2xl bg-[#FDFBF7] border transition-all ${
                              isConfirming ? "border-amber-300 bg-amber-50/10 shadow-inner" : "border-slate-100 shadow-3xs hover:border-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{child.avatar}</span>
                                <div className="text-left">
                                  <p className="text-sm font-black text-slate-800 tracking-tight">{child.name}</p>
                                  <p className="text-[10px] font-bold text-[#A39E93] mt-0.5 uppercase tracking-wide">
                                    Usia: {child.age} • Talaqqi: {child.settings?.talaqqiAudioRepeats || 5}x • Tikrar: {child.settings?.tikrarSelfRepeats || 10}x • Rabt: {child.settings?.rabtRepeats || 3}x
                                  </p>
                                </div>
                              </div>

                              {!isConfirming && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingChildId(child.id);
                                      setEditName(child.name);
                                      setEditBirthMonth(child.birthMonth || new Date().getMonth() + 1);
                                      setEditBirthYear(child.birthYear || new Date().getFullYear() - 3);
                                      setEditAvatar(child.avatar || AVATARS[0]);

                                      const talVal = child.settings?.talaqqiAudioRepeats ?? 5;
                                      const tikVal = child.settings?.tikrarSelfRepeats ?? 10;
                                      setEditTalaqqiPreset([3,5,10,20,30].includes(talVal) ? talVal : "Custom");
                                      setEditTalaqqiCustomVal(talVal);
                                      setEditTikrarPreset([3,5,10,20,30].includes(tikVal) ? tikVal : "Custom");
                                      setEditTikrarCustomVal(tikVal);

                                      const durVal = child.settings?.maxSessionDuration ?? 15;
                                      setEditDurationPreset([5,10,15,20,30].includes(durVal) ? durVal : "Custom");
                                      setEditDurationCustomVal(durVal);

                                      triggerPlayPop();
                                    }}
                                    className="p-2 text-neutral-300 hover:text-[#48C78E] hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                                    title="Ubah Profil"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      setDeletingChildId(child.id);
                                      triggerPlayPop();
                                    }}
                                    className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                    title="Pindahkan ke Sampah"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {isConfirming && (
                              <div className="flex flex-col gap-1.5 p-2 bg-amber-50/60 rounded-xl border border-amber-200 mt-2 animate-wiggle-once text-left">
                                <p className="text-[10px] font-black text-amber-800 leading-normal uppercase">
                                  Pindahkan {child.name} ke tempat sampah? (Bisa dipulihkan kapan saja)
                                </p>
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeletingChildId(null);
                                      triggerPlayPop();
                                    }}
                                    className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-neutral-600 bg-white border border-neutral-200 rounded-lg cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteChild(child.id);
                                      setDeletingChildId(null);
                                      triggerPlayPop();
                                    }}
                                    className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white bg-red-500 hover:bg-red-600 rounded-lg cursor-pointer"
                                  >
                                    Pindahkan
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {childrenList.filter(child => !child.isDeleted).length === 0 && (
                        <div className="text-center py-6 bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl p-4">
                          <p className="text-xs font-black text-amber-600">Terbaca kosong!</p>
                          <p className="text-[9px] text-amber-500 mt-1 leading-normal uppercase tracking-wide">
                            Silakan klik button "Tambah Anak" di atas untuk mendatangkan progress jagoan cilik Anda.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Soft Delete / Trash Storage list inside profile page so it keeps primary safe */}
                  {childrenList.some(child => child.isDeleted) && (
                    <div className="bg-amber-50/20 p-5 rounded-3xl border-2 border-dashed border-amber-200 shadow-xs">
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5 mb-1.5 leading-none">
                        🗑️ TEMPAT SAMPAH PROFIL ANAK
                      </h3>
                      <p className="text-[9px] text-[#A39E93] leading-normal mb-3 font-extrabold uppercase tracking-wider">
                        Profil berikut disembunyikan. Pulihkan kembali progress mereka atau tumpas permanen.
                      </p>

                      <div className="space-y-2">
                        {childrenList.filter(child => child.isDeleted).map((child) => {
                          const isConfirmingPerm = permDeletingChildId === child.id;
                          return (
                            <div 
                              key={child.id}
                              className={`flex flex-col p-3 rounded-2xl bg-white border shadow-3xs transition-all text-left ${
                                isConfirmingPerm ? "border-red-300 bg-red-50/10" : "border-amber-100"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl filter saturate-50 opacity-80">{child.avatar}</span>
                                  <div>
                                    <p className="text-sm font-black text-[#3A405A]/80">{child.name}</p>
                                    <p className="text-[10px] font-bold text-[#A39E93]">Usia: {child.age}</p>
                                  </div>
                                </div>

                                {!isConfirmingPerm && (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        onRestoreChild(child.id);
                                        triggerPlayPop();
                                      }}
                                      className="flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-[#48C78E] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-100/50"
                                    >
                                      <RotateCcw className="w-3 h-3 stroke-[3px]" />
                                      <span>Pulihkan</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        setPermDeletingChildId(child.id);
                                        triggerPlayPop();
                                      }}
                                      className="p-1 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {isConfirmingPerm && (
                                <div className="flex flex-col gap-1.5 p-2 bg-red-50 rounded-xl border border-red-200 mt-2">
                                  <p className="text-[10px] font-black text-red-700 leading-normal uppercase">
                                    Hapus permanen {child.name}? Riwayat bintang dan log akan lebur mutlak!
                                  </p>
                                  <div className="flex gap-1.5 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPermDeletingChildId(null);
                                        triggerPlayPop();
                                      }}
                                      className="px-2 py-0.5 text-[9.5px] font-black uppercase text-neutral-500 bg-white border border-neutral-200 rounded-md"
                                    >
                                      Batal
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onPermanentDeleteChild(child.id);
                                        setPermDeletingChildId(null);
                                        triggerPlayPop();
                                      }}
                                      className="px-2 py-0.5 text-[9.5px] font-black uppercase text-white bg-red-500 rounded-md"
                                    >
                                      Sapu Habis
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* RENDER VIEW 2: ANGGOTA GRUP (Invite / Join codes) */}
              {activeSubView === "anggota-grup" && currentUser && (
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-3xl border border-[#EBE6D9] shadow-xs">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#48C78E] flex items-center gap-1.5 leading-none mb-3">
                      👥 AKUN GRUP & SYNC KOLABORATOR
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed mb-4">
                      Bagi tanggungan setoran hafalan jagoan cilik Anda dengan melibatkkan Ayah, Ibu, Kakek, atau Guru Tahfiz di sekolah. Setiap progres akan sync otomatis seketika!
                    </p>

                    {/* Peran Anda di Grup Ini Selector */}
                    <div className="flex flex-col gap-1 w-full mb-3.5 text-left">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
                        Peran Anda di Grup Ini
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['ayah', 'bunda', 'guru'] as const).map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              triggerPlayPop();
                              handleSetUserRole(role);
                              setShowFeedback(true);
                            }}
                            className={`py-2 px-1 rounded-xl border font-black text-[10px] uppercase tracking-wider text-center transition-all active:scale-[0.98] cursor-pointer ${
                              userRole === role
                                ? 'bg-emerald-50 text-[#48C78E] border-[#48C78E]/60 shadow-sm'
                                : 'bg-slate-50/60 text-slate-400 border-transparent hover:bg-slate-50'
                            }`}
                          >
                            {role === 'ayah' ? '🧎‍♂️ Ayah' : role === 'bunda' ? '🧎‍♀️ Ibu' : '🎓 Guru'}
                          </button>
                        ))}
                      </div>

                      {showFeedback && (
                        <div className="mt-2 bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 text-center animate-fade-in">
                          <p className="text-[9.5px] text-emerald-700 font-bold leading-tight">
                            ✨ Peran berhasil disimpan! Format sapaan dashboard telah diperbarui. Anda dapat mengubah peran ini kembali kapan saja di halaman ini.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-dashed border-[#EBE6D9] w-full my-4"></div>

                    <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-slate-100 flex flex-col gap-2.5 mb-6 text-left">
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none">KODE GRUP SINKRONISASI AKTIF:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={activeGroupId || "Menghubungkan Database..."}
                          className="bg-white border-2 border-[#EBE6D9] rounded-xl px-3 py-2 text-xs font-mono font-black outline-none flex-1 focus:border-[#48C78E]"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (activeGroupId) {
                              try {
                                navigator.clipboard.writeText(activeGroupId);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              } catch (_) {
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              }
                              triggerPlaySuccess();
                            }
                          }}
                          className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black rounded-xl border border-emerald-100 transition-all cursor-pointer uppercase tracking-widest"
                        >
                          {copied ? "TERSALIN! ✅" : "SALIN"}
                        </button>
                      </div>
                    </div>

                    {/* Invite form */}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!inviteEmail.trim() || !onInviteToGroup) return;
                        setInviteLoading(true);
                        setInviteStatus(null);
                        triggerPlayPop();

                        try {
                          const res = await onInviteToGroup(inviteEmail.trim(), inviteRole);
                          if (res.success) {
                            setInviteStatus({ success: true, message: `🚀 Akses kolaborasi dikirim untuk ${inviteEmail}! Akun tersebut otomatis di-grupkan.` });
                            setInviteEmail("");
                            triggerPlaySuccess();
                          } else {
                            setInviteStatus({ success: false, message: `❌ Gagal mengirim: ${res.error}` });
                          }
                        } catch (err: any) {
                          setInviteStatus({ success: false, message: `❌ Koneksi terputus: ${err.message || String(err)}` });
                        } finally {
                          setInviteLoading(false);
                        }
                      }}
                      className="flex flex-col gap-4 pt-4 border-t border-dashed border-[#EBE6D9] text-left"
                    >
                      <span className="text-[10.5px] font-black text-neutral-500 uppercase tracking-wider leading-none">Kirim Undangan Baru</span>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-[#A39E93] uppercase">Email Akun Google Kolaborator</label>
                        <input
                          type="email"
                          required
                          placeholder="misal: contoh.ibu@gmail.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="bg-[#FAF8F5] border-2 border-[#EBE6D9] rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#48C78E]"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-[#A39E93] uppercase mb-1">Pilih Peran Anggota</label>
                        <div className="grid grid-cols-3 gap-2">
                          {["ayah", "ibu", "guru"].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => { setInviteRole(r); triggerPlayPop(); }}
                              className={`py-2 text-[10px] font-black rounded-xl transition-all border uppercase tracking-wider ${
                                inviteRole === r
                                  ? "bg-[#48C78E] text-white border-transparent shadow-xs scale-102"
                                  : "bg-slate-50 text-slate-500 border-slate-200"
                              }`}
                            >
                              {r === "ayah" && "👨‍👦 Ayah"}
                              {r === "ibu" && "👩‍👦 Ibu"}
                              {r === "guru" && "👨‍🏫 Guru"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={inviteLoading}
                        className={`w-full py-3 text-white text-xs font-black rounded-xl transition-all uppercase tracking-wider leading-none cursor-pointer ${
                          inviteLoading ? "bg-neutral-300 cursor-not-allowed" : "bg-[#48C78E] hover:bg-[#3ab37c]"
                        }`}
                      >
                        {inviteLoading ? "Menautkan..." : `Undang Kolaborator 🚀`}
                      </button>

                      {inviteStatus && (
                        <div className={`p-3.5 rounded-xl border text-[10px] font-bold leading-normal uppercase tracking-wide text-left ${
                          inviteStatus.success
                            ? "bg-emerald-50 border-emerald-100 text-emerald-800 animate-scale-up-gentle"
                            : "bg-rose-50 border-rose-100 text-rose-800 animate-wiggle-once"
                        }`}>
                          {inviteStatus.message}
                        </div>
                      )}
                    </form>

                    {/* Join Code input fallback */}
                    <div className="relative flex py-4 items-center">
                      <div className="flex-grow border-t border-[#EBE6D9]"></div>
                      <span className="flex-shrink mx-4 text-[#A39E93] text-[9px] font-black uppercase tracking-wider">Atau Gabung Grup Lain</span>
                      <div className="flex-grow border-t border-[#EBE6D9]"></div>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!joinCodeInput.trim() || !onJoinGroup) return;
                        setJoinLoading(true);
                        setJoinStatus(null);
                        triggerPlayPop();

                        try {
                          const res = await onJoinGroup(joinCodeInput.trim(), joinRoleInput);
                          if (res.success) {
                            setJoinStatus({ success: true, message: `🎉 Berhasil bergabung! Memuat ulang sistem sinkronisasi...` });
                            setJoinCodeInput("");
                            triggerPlaySuccess();
                            setTimeout(() => window.location.reload(), 1500);
                          } else {
                            setJoinStatus({ success: false, message: `❌ Gagal: ${res.error}` });
                          }
                        } catch (err: any) {
                          setJoinStatus({ success: false, message: `❌ Gagal: ${err.message || String(err)}` });
                        } finally {
                          setJoinLoading(false);
                        }
                      }}
                      className="flex flex-col gap-3.5 text-left"
                    >
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-[#A39E93] uppercase">Masukkan Kode Grup Keluarga</label>
                        <input
                          type="text"
                          required
                          placeholder="contoh: group_7d38f89s1"
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value)}
                          className="bg-[#FAF8F5] border-2 border-[#EBE6D9] rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-[#48C78E]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={joinLoading}
                        className={`w-full py-3 text-white text-xs font-black rounded-xl transition-all uppercase tracking-wider cursor-pointer ${
                          joinLoading ? "bg-neutral-300 cursor-not-allowed" : "bg-sky-500 hover:bg-sky-600"
                        }`}
                      >
                        {joinLoading ? "Mengecek Grup..." : "Gabung ke Grup Keluarga 🔗"}
                      </button>

                      {joinStatus && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-bold text-red-700 uppercase">
                          {joinStatus.message}
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}

              {/* RENDER VIEW 3: PRESETS TIKRAR & TALAQQI (Structured loop modifiers per child) */}
              {activeSubView === "kurikulum-presets" && (
                <div className="space-y-4 text-left">
                  <div className="bg-white p-5 rounded-3xl border border-[#EBE6D9] shadow-xs">
                    {/* Listing Children preset cards for immediate adjusting */}
                    <div className="space-y-4">
                      {childrenList.filter(c => !c.isDeleted).map((child) => {
                        const currentTal = child.settings?.talaqqiAudioRepeats ?? 5;
                        const currentTik = child.settings?.tikrarSelfRepeats ?? 10;
                        return (
                          <div key={child.id} className="p-4 rounded-2xl bg-[#FDFBF7] border border-slate-150 flex flex-col gap-4">
                            <div className="flex items-center gap-2.5 pb-2.5 border-b border-dashed border-[#EBE6D9]">
                              <span className="text-2xl">{child.avatar}</span>
                              <div>
                                <p className="text-sm font-black text-slate-800 tracking-tight">{child.name}</p>
                                <p className="text-[9px] text-[#48C78E] font-extrabold uppercase">
                                  {lang === "EN" ? "Current Session Target" : "Target Sesi Saat Ini"}
                                </p>
                              </div>
                            </div>

                            {/* Option A: Talaqqi Repeats */}
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-black text-[#A39E93] uppercase tracking-wide">
                                👨‍🏫 {t.fieldTalaqqi}: <span className="text-[#48C78E] text-[11px]">{currentTal} {lang === "EN" ? "Times" : "Kali"}</span>
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {[1, 3, 5, 7, 10, 15].map((presetNum) => (
                                  <button
                                    key={presetNum}
                                    type="button"
                                    onClick={() => handleDirectChildSettingUpdate(child, "repeats", presetNum, currentTik)}
                                    className={`py-1.5 px-3 rounded-lg text-[11px] font-black uppercase transition-all border cursor-pointer ${
                                      currentTal === presetNum
                                        ? "bg-[#48C78E] text-white border-transparent scale-105"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    }`}
                                  >
                                    {presetNum}x
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Option B: Tikrar Repeats */}
                            <div className="flex flex-col gap-2 pt-2 border-t border-dashed border-slate-200">
                              <span className="text-[10px] font-black text-[#A39E93] uppercase tracking-wide">
                                🎯 {t.fieldTikrar}: <span className="text-amber-500 text-[11px]">{currentTik} {lang === "EN" ? "Times" : "Kali"}</span>
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {[3, 5, 10, 15, 20, 30].map((presetNum) => (
                                  <button
                                    key={presetNum}
                                    type="button"
                                    onClick={() => handleDirectChildSettingUpdate(child, "repeats", currentTal, presetNum)}
                                    className={`py-1.5 px-3 rounded-lg text-[11px] font-black uppercase transition-all border cursor-pointer ${
                                      currentTik === presetNum
                                        ? "bg-amber-400 text-white border-transparent scale-105"
                                        : "bg-[#FDFBF7] text-slate-600 border-slate-200 hover:bg-slate-50"
                                    }`}
                                  >
                                    {presetNum}x
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Option C: Rabt Repeats */}
                            <div className="flex flex-col gap-2 pt-2 border-t border-dashed border-slate-200">
                              <span className="text-[10px] font-black text-[#A39E93] uppercase tracking-wide">
                                🔗 {lang === "EN" ? "Rabt Repeats" : "Pengulangan Rabt (Konsolidasi)"}: <span className="text-indigo-500 text-[11px]">{child.settings?.rabtRepeats ?? 3} {lang === "EN" ? "Times" : "Kali"}</span>
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {[1, 2, 3, 5, 7, 10].map((presetNum) => {
                                  const currentRabt = child.settings?.rabtRepeats ?? 3;
                                  return (
                                    <button
                                      key={presetNum}
                                      type="button"
                                      onClick={() => handleDirectChildSettingUpdate(child, "repeats", currentTal, currentTik, undefined, presetNum)}
                                      className={`py-1.5 px-3 rounded-lg text-[11px] font-black uppercase transition-all border cursor-pointer ${
                                        currentRabt === presetNum
                                          ? "bg-indigo-500 text-white border-transparent scale-105"
                                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                      }`}
                                    >
                                      {presetNum}x
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {childrenList.filter(c => !c.isDeleted).length === 0 && (
                        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed text-slate-400 border-slate-200">
                          Tidak ditemukan profil anak untuk dikonfigurasi targetnya.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* RENDER VIEW 4: SCREENTIME & GLOBAL QARI SOUNDS */}
              {activeSubView === "screentime-qari" && (
                <div className="space-y-4 text-left">
                  {/* Part A: Child Duration Time Constraints */}
                  <div className="bg-white p-5 rounded-3xl border border-[#EBE6D9] shadow-xs">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#48C78E] flex items-center gap-1.5 leading-none mb-1.5">
                      ⏱️ {t.screenTimeLimit}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 leading-normal mb-4">
                      {lang === "EN"
                        ? "Manage allowed active screen time per session to balance device usage and foster disciplined habits."
                        : "Atur lama waktu tatap layar aktif per sesi bermain untuk memutus kecanduan gadget dan membiasakan pola disiplin."}
                    </p>

                    <div className="space-y-3">
                      {childrenList.filter(c => !c.isDeleted).map((child) => {
                        const currentDuration = child.settings?.maxSessionDuration ?? 15;
                        return (
                          <div key={child.id} className="p-3.5 rounded-2xl bg-[#FDFBF7] border border-slate-150 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black text-slate-800 tracking-tight">{child.name}</span>
                              <span className="text-xs font-extrabold text-[#48C78E] bg-[#48C78E]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                {currentDuration} {lang === "EN" ? "Mins" : "Menit"}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {[3, 5, 10, 20, 30].map((dur) => (
                                <button
                                  key={dur}
                                  type="button"
                                  onClick={() => {
                                    handleDirectChildSettingUpdate(child, "duration", undefined, undefined, dur);
                                    setShowCustomInputForChild(prev => ({ ...prev, [child.id]: false }));
                                  }}
                                  className={`py-1.5 px-3 rounded-lg text-[10.5px] font-black uppercase transition-all border cursor-pointer ${
                                    currentDuration === dur && !showCustomInputForChild[child.id]
                                      ? "bg-slate-800 text-white border-transparent"
                                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  {dur} {lang === "EN" ? "Mins" : "Menit"}
                                </button>
                              ))}

                              <button
                                type="button"
                                onClick={() => {
                                  setShowCustomInputForChild(prev => ({ ...prev, [child.id]: !prev[child.id] }));
                                  setCustomDurInputVal(prev => ({ ...prev, [child.id]: String(currentDuration) }));
                                }}
                                className={`py-1.5 px-3 rounded-lg text-[10.5px] font-black uppercase transition-all border cursor-pointer ${
                                  showCustomInputForChild[child.id] || ![3, 5, 10, 20, 30].includes(currentDuration)
                                    ? "bg-slate-800 text-white border-transparent"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                {lang === "EN" ? "Custom" : "Kustom"}
                              </button>
                            </div>

                            {(showCustomInputForChild[child.id] || ![3, 5, 10, 20, 30].includes(currentDuration)) && (
                              <div className="flex items-center gap-2 mt-1 animate-scale-up-gentle bg-[#F5F2EB]/50 p-2 py-2.5 px-3.5 rounded-xl border border-[#EBE6D9]">
                                <span className="text-[10px] font-black text-[#A39E93] uppercase">
                                  {lang === "EN" ? "Custom Minutes" : "Menit Kustom"}:
                                </span>
                                <input
                                  type="number"
                                  min="1"
                                  max="120"
                                  value={customDurInputVal[child.id] ?? String(currentDuration)}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomDurInputVal(prev => ({ ...prev, [child.id]: val }));
                                    const parsed = parseInt(val, 10);
                                    if (!isNaN(parsed) && parsed > 0 && parsed <= 120) {
                                      handleDirectChildSettingUpdate(child, "duration", undefined, undefined, parsed);
                                    }
                                  }}
                                  className="w-16 bg-white border-2 border-[#EBE6D9] rounded-lg px-2 py-1 text-xs font-black text-center outline-none focus:border-[#48C78E]"
                                />
                                <span className="text-xs font-black text-slate-600">
                                  {lang === "EN" ? "Mins" : "Menit"}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {childrenList.filter(c => !c.isDeleted).length === 0 && (
                        <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-250 text-slate-400">
                          Tambahkan profil anak terlebih dahulu untuk membatasi screen time.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Part A2: Child Arabic Font Size Configuration */}
                  <div className="bg-white p-5 rounded-3xl border border-[#EBE6D9] shadow-xs">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#48C78E] flex items-center gap-1.5 leading-none mb-1.5">
                      📖 {lang === "EN" ? "Child Mode Quran Font Size" : "Ukuran Font Al-Quran Mode Anak"}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 leading-normal mb-4">
                      {lang === "EN"
                        ? "Configure the Arabic font size for children's learning stages to protect their vision or improve readability."
                        : "Sesuaikan besar-kecilnya ukuran huruf Arab di layar bermain anak agar nyaman di mata dan mudah dieja."}
                    </p>

                    <div className="space-y-3">
                      {childrenList.filter(c => !c.isDeleted).map((child) => {
                        const currentSize = child.settings?.arabicFontSize ?? 'large';
                        const sizes: { value: 'small' | 'medium' | 'large' | 'xlarge' | 'huge'; labelID: string; labelEN: string }[] = [
                          { value: 'small', labelID: 'Kecil', labelEN: 'Small' },
                          { value: 'medium', labelID: 'Sedang', labelEN: 'Medium' },
                          { value: 'large', labelID: 'Besar (Bawaan)', labelEN: 'Large (Default)' },
                          { value: 'xlarge', labelID: 'Sangat Besar', labelEN: 'Extra Large' },
                          { value: 'huge', labelID: 'Sangat Besar Sekali', labelEN: 'Huge' }
                        ];

                        return (
                          <div key={child.id} className="p-3.5 rounded-2xl bg-[#FDFBF7] border border-slate-150 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black text-slate-800 tracking-tight">{child.name}</span>
                              <span className="text-[10px] font-extrabold text-[#48C78E] bg-[#48C78E]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                {lang === "EN" 
                                  ? sizes.find(s => s.value === currentSize)?.labelEN 
                                  : sizes.find(s => s.value === currentSize)?.labelID}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                              {sizes.map((sz) => (
                                <button
                                  key={sz.value}
                                  type="button"
                                  onClick={() => {
                                    handleDirectChildSettingUpdate(child, "fontSize", undefined, undefined, undefined, undefined, sz.value);
                                  }}
                                  className={`py-2 px-3.5 rounded-xl text-xs font-black text-left transition-all border cursor-pointer flex items-center justify-between ${
                                    currentSize === sz.value
                                      ? "bg-[#48C78E] text-white border-transparent shadow-xs"
                                      : "bg-white text-slate-600 border-slate-250 hover:bg-slate-50"
                                  }`}
                                >
                                  <span>{lang === "EN" ? sz.labelEN : sz.labelID}</span>
                                  <span className="font-arabic text-base" dir="rtl">بِسْمِ اللّهِ</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {childrenList.filter(c => !c.isDeleted).length === 0 && (
                        <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-250 text-slate-400">
                          {lang === "EN" ? "Add child profiles first." : "Tambahkan profil anak terlebih dahulu."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* RENDER VIEW 5: SINKRONISASI CLOUD & AKUN DETAILS */}
              {activeSubView === "cloud-sync" && (
                <div className="space-y-4 text-left">
                  <div className="bg-white p-5 rounded-3xl border border-[#EBE6D9] shadow-xs">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#48C78E] flex items-center gap-1.5 leading-none mb-2">
                      ☁️ SINKRONISASI DATABASE GOOGLE CLOUD
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 leading-normal mb-4">
                      Wali Tahfiz PWA terintegrasi penuh dengan Firebase Firestore. Memungkinkan Anda bekerja luring, dan langsung mengunggah progres ke internet saat sinyal kembali terhubung berkala.
                    </p>

                    {currentUser ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3.5 bg-[#FAF8F5] p-3.5 rounded-2xl border border-slate-150">
                          {currentUser.photoURL ? (
                            <img
                              src={currentUser.photoURL}
                              alt={currentUser.displayName || "Google"}
                              className="w-12 h-12 rounded-full border border-[#EBE6D9]"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#48C78E] flex items-center justify-center text-lg font-black border border-emerald-200">
                              {String(currentUser.displayName || "W").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-black text-[#3A405A] leading-tight flex items-center gap-1">
                              {currentUser.displayName || "Wali Pengguna"}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate max-w-[180px]">
                              {currentUser.email}
                            </p>
                            <span className="inline-flex mt-1.5 px-2 py-0.5 text-[8.5px] font-extrabold text-emerald-700 bg-emerald-50 rounded-md border border-emerald-100 uppercase tracking-wider">
                              Cloud Aktif Terhubung ✅
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            triggerPlayPop();
                            if (onSignOut) onSignOut();
                          }}
                          className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/60 text-xs font-black rounded-2xl shadow-xs transition-all cursor-pointer text-center uppercase tracking-wider"
                        >
                          {t.signOutWali}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 flex items-start gap-3">
                          <span className="text-xl">⚠️</span>
                          <div>
                            <p className="text-xs font-black text-amber-800">Menyimpan Lokal Perangkat Saat Ini</p>
                            <p className="text-[10px] font-semibold text-amber-600 mt-1 leading-normal">
                              Gawai Anda berada pada mode luring atau mode tamu. Segera gabungkan dengan database global demi mengamankan data progres sang buah hati.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            triggerPlayPop();
                            localStorage.removeItem("wali_session_guest");
                            window.location.reload();
                          }}
                          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer text-center uppercase tracking-wider leading-none"
                        >
                          Hubungkan Akun Google Cloud 🔗
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* RENDER VIEW 6: HAPUS MEMORI DATA (Dangerous resets) */}
              {activeSubView === "delete-data" && (
                <div className="space-y-4 text-left animate-wiggle-once">
                  <div className="bg-white p-5 rounded-3xl border border-red-200/60 shadow-xs relative">
                    <h3 className="text-sm font-black uppercase tracking-wider text-red-500 flex items-center gap-1 leading-none mb-1.5">
                      ⚠️ AREA BAHAYA & HAPUS MEMORI
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 leading-normal mb-5">
                      Mereset total aplikasi akan membersihkan piala bintang, streak, riwayat setoran, serta menghapus data profil anak. Pikir secara bijak sebelum mengeksekusi ini!
                    </p>

                    {!showClearDataConfirm ? (
                      <div className="flex flex-col gap-3 bg-red-50/50 p-4 rounded-2xl border border-red-100">
                        <div>
                          <p className="text-xs font-black text-red-700 uppercase">Bersihkan Riwayat Belajar & Cache</p>
                          <p className="text-[10px] text-red-500 leading-normal mt-0.5">Kembalikan semua piala bintang, status qari pilihan ke awal mula bawaan.</p>
                        </div>
                        <button
                          onClick={() => {
                            setShowClearDataConfirm(true);
                            triggerPlayPop();
                          }}
                          className="w-full bg-red-500 hover:bg-red-650 text-white text-xs font-black py-2.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 text-center uppercase tracking-wider"
                        >
                          Hapus Seluruh Data
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 p-3.5 bg-red-100/50 rounded-2xl border-2 border-red-300">
                        <p className="text-xs font-black text-red-700 leading-normal uppercase">
                          Konfirmasi kebersihan mutlak! Semua kemajuan setoran hafalan jagoan cilik Anda akan lebur tak tersisa. Lanjutkan?
                        </p>
                        <div className="flex gap-2 justify-end mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowClearDataConfirm(false);
                              triggerPlayPop();
                            }}
                            className="px-4 py-1.5 text-xs font-black uppercase text-neutral-600 bg-white border border-neutral-200 rounded-lg cursor-pointer animate-pulse"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClearAllSessionData();
                              setShowClearDataConfirm(false);
                              setShowClearSuccessToast(true);
                              triggerPlaySuccess();
                              setTimeout(() => setShowClearSuccessToast(false), 3000);
                            }}
                            className="px-4 py-1.5 text-xs font-black uppercase text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md cursor-pointer"
                          >
                            Hapus Permanen!
                          </button>
                        </div>
                      </div>
                    )}

                    {showClearSuccessToast && (
                      <div className="bg-emerald-500 text-white text-xs font-black py-2.5 px-4 rounded-xl text-center shadow-md animate-scale-up-gentle uppercase tracking-wider mt-3 border border-emerald-600/20">
                        🎉 Semua data berhasil dibersihkan!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* RENDER VIEW 7: TENTANG WALI TAHFIDZ CREDITS */}
              {activeSubView === "tentang" && (
                <div className="space-y-4 text-left animate-scale-up-gentle">
                  {/* Symmetrical Capsule Tab Navigation Bar */}
                  <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 shadow-3xs shrink-0 select-none">
                    <button
                      type="button"
                      onClick={() => {
                        triggerPlayPop();
                        setAboutTab("metode");
                      }}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center ${
                        aboutTab === "metode"
                          ? "bg-white text-emerald-700 shadow-xs border border-slate-100"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {lang === "EN" ? "Methodology" : "Metode Tahfiz"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerPlayPop();
                        setAboutTab("panduan");
                      }}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center ${
                        aboutTab === "panduan"
                          ? "bg-white text-emerald-700 shadow-xs border border-slate-100"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {lang === "EN" ? "Parent Guide" : "Alur Awam"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerPlayPop();
                        setAboutTab("atribusi");
                      }}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center ${
                        aboutTab === "atribusi"
                          ? "bg-white text-emerald-700 shadow-xs border border-slate-100"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {lang === "EN" ? "Attributions" : "Atribusi"}
                    </button>
                  </div>

                  {/* TAB CONTENT 1: METODE TAHFIZ */}
                  {aboutTab === "metode" && (
                    <motion.div
                      key="metode-tab"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      {/* Premium Vertical Educational Timeline */}
                      <div className="w-full bg-white rounded-3xl border border-stone-200/80 p-5 shadow-sm flex flex-col gap-6 font-sans">
                        <div className="flex flex-col">
                          <h2 className="text-xs font-black text-slate-800 tracking-tight uppercase">
                            {lang === "ID" ? "Peta Alur Metode Tahfiz" : "Memorization Workflow Matrix"}
                          </h2>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {lang === "ID" 
                              ? "Bagaimana hafalan anak bergerak, diuji, dan naik kelas?" 
                              : "How do verses cycle and advance based on play sessions?"}
                          </p>
                        </div>

                        {/* Classic Terminology Note callout box */}
                        <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 flex items-start gap-2.5">
                          <span className="text-base">🕌</span>
                          <div className="text-left font-sans flex-1">
                            <h4 className="text-[10.5px] font-black text-emerald-800 uppercase tracking-tight">Qarib & Sabiq vs Sabqi & Manzil</h4>
                            <p className="text-[10px] font-medium text-emerald-600 leading-normal mt-0.5">
                              {lang === "ID"
                                ? "Sistem kami memadukan istilah Nusantara (Qarib & Sabiq) yang senilai dengan istilah Hifz Asia Selatan (Sabqi/Murojaah Dekat & Manzil/Murojaah Jauh). Kami memilih istilah Qarib/Sabiq agar lebih ramah bagi wali asuh prasekolah."
                                : "Our scheme translates classic South Asian Hifz terms (Sabqi & Manzil) into regional Nusantara terms (Qarib & Sabiq). Qarib represents recent review (Sabqi), while Sabiq acts as long-term archive (Manzil)."}
                            </p>
                          </div>
                        </div>

                        {/* Vertical Stepper Chain */}
                        <div className="relative border-l-2 border-[#EBE6D9] ml-4 pl-6 flex flex-col gap-6">
                          
                          {/* Step 1: Ziyadah */}
                          <div className="relative">
                            <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-lg bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center text-xs font-bold shadow-3xs">
                              🎯
                            </div>
                            <div className="flex flex-col text-left">
                              <h3 className="text-xs font-black text-slate-800">1. Ziyadah (Hafalan Baru / Lesson)</h3>
                              <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed mt-0.5">
                                Ayat baru yang sedang dipelajari hari ini. Ketika anak berhasil melewati evaluasi, sistem akan memindahkannya ke zone <b>Qarib</b> untuk pemantapan esok hari.
                              </p>
                            </div>
                          </div>

                          {/* Step 2: Qarib */}
                          <div className="relative">
                            <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-lg bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center text-xs font-bold shadow-3xs">
                              🔄
                            </div>
                            <div className="flex flex-col text-left">
                              <h3 className="text-xs font-black text-slate-800">2. Qarib (Murojaah Dekat / Sabqi)</h3>
                              <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed mt-0.5">
                                Setoran murojaah berkala harian agar melekat kuat di memori jangka pendek. Jika anak konsisten mengulangnya dengan predikat bagus selama <b>7 hari berturut-turut</b>, otomatis naik kelas ke kelompok <b>Sabiq</b>.
                              </p>
                            </div>
                          </div>

                          {/* Step 3: Sabiq */}
                          <div className="relative">
                            <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-lg bg-slate-50 text-slate-400 border border-slate-150 flex items-center justify-center text-xs font-bold shadow-3xs">
                              ⏳
                            </div>
                            <div className="flex flex-col text-left">
                              <h3 className="text-xs font-black text-slate-800">3. Sabiq (Murojaah Jauh / Manzil)</h3>
                              <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed mt-0.5">
                                Hafalan lama yang sudah mapan. Ayat-ayat di zona ini dirotasi secara otomatis (Spaced Repetition) seminggu atau sepuluh hari sekali lewat game interaktif <b>Tebak Ayat</b> demi mencegah kejenuhan anak & orang tua.
                              </p>
                            </div>
                          </div>

                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB CONTENT 2: PANDUAN_ORANG_AWAM */}
                  {aboutTab === "panduan" && (
                    <motion.div
                      key="panduan-tab"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="w-full bg-white rounded-3xl border border-stone-200/80 p-5 shadow-sm flex flex-col gap-5 font-sans">
                        <div className="flex flex-col">
                          <h2 className="text-xs font-black text-slate-800 tracking-tight uppercase">
                            {lang === "ID" ? "Panduan Alur Penggunaan (Orang Awam)" : "Layperson Workflow Guide"}
                          </h2>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {lang === "ID"
                              ? "Langkah sederhana mengelola hafalan toddler minim lelah & burnout"
                              : "Simple steps to guide preschool children with zero burnout"}
                          </p>
                        </div>

                        {/* Interactive Steps with Icons */}
                        <div className="flex flex-col gap-4">
                          {/* Step 1 */}
                          <div className="flex gap-3">
                            <span className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-xs font-black border border-emerald-100 shrink-0 select-none">
                              1
                            </span>
                            <div className="text-left flex-1">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Atur Mood Harian</h4>
                              <p className="text-[10.5px] text-slate-500 font-medium leading-normal mt-0.5">
                                Sebelum bermain, setel status kondisi anak di Beranda: <b>🌱 Active</b> (hafal baru), <b>🟡 Moody</b> (jeda setoran, hanya audio), <b>🚗 Safar</b> (istirahat ceria), atau <b>🔵 Busy</b> (orang tua sibuk, putar audio saja).
                              </p>
                            </div>
                          </div>

                          {/* Step 2 */}
                          <div className="flex gap-3">
                            <span className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-xs font-black border border-emerald-100 shrink-0 select-none">
                              2
                            </span>
                            <div className="text-left flex-1">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Sesi Bermain Anak (Click Card)</h4>
                              <p className="text-[10.5px] text-slate-500 font-medium leading-normal mt-0.5">
                                Klik area tengah kartu surat anak. Ini membuka pemutar audio interaktif pintar, tikrar harakat, atau game tebak tantangan kata-per-kata yang dirancang ramah balita.
                              </p>
                            </div>
                          </div>

                          {/* Step 3 */}
                          <div className="flex gap-3">
                            <span className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-xs font-black border border-emerald-100 shrink-0 select-none">
                              3
                            </span>
                            <div className="text-left flex-1">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Evaluasi Santai (Klik Evaluasi)</h4>
                              <p className="text-[10.5px] text-slate-500 font-medium leading-normal mt-0.5">
                                Klik tombol <b>Evaluasi →</b> di sebelah kanan kartu untuk menguji hafalan. Cukup geser slider repetisi, lalu vote <b>Mutqin 🟢</b> atau <b>Bagus 🟡</b> untuk meloloskan target, atau <b>Ulangi 🔴</b> jika perlu diulang esok hari.
                              </p>
                            </div>
                          </div>

                          {/* Step 4 */}
                          <div className="flex gap-3">
                            <span className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-xs font-black border border-emerald-100 shrink-0 select-none">
                              4
                            </span>
                            <div className="text-left flex-1">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Nourish Taman Buah</h4>
                              <p className="text-[10.5px] text-slate-500 font-medium leading-normal mt-0.5">
                                Setiap setoran yang berhasil divalidasi menghasilkan item pertumbuhan taman: 💧 Air Biasa (+1), 🧪 Pupuk Organik (+2), atau paling mutqin ☀️ Sinar Matahari (+3) taman cilik Nusantara!
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB CONTENT 3: CREDITS & ATRIBUSI */}
                  {aboutTab === "atribusi" && (
                    <motion.div
                      key="atribusi-tab"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="w-full bg-white rounded-3xl border border-stone-200/80 p-5 shadow-sm flex flex-col gap-4 font-sans">
                        <div className="text-center mt-1">
                          <h2 className="text-sm font-black text-slate-800 tracking-tight">Wali Tahfiz v2.1.0</h2>
                          <span className="inline-block bg-emerald-50 text-emerald-600 font-black text-[9px] px-2.5 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider mt-1">
                            Progressive Web App
                          </span>
                        </div>

                        <div className="w-full border-t border-slate-50 my-1"></div>

                        {/* Credits Details */}
                        <div className="flex flex-col gap-3 text-left font-sans text-stone-600 leading-relaxed">
                          <div>
                            <h4 className="text-[10.5px] font-black text-slate-700 uppercase tracking-wide">
                              Mushaf Al-Quran API:
                            </h4>
                            <p className="text-[10px] font-medium leading-relaxed mt-0.5">
                              Penyedia teks ayat Utsmani bersumber dari <b>Al-Quran Cloud</b> (alquran.cloud), yang menyajikan teks resmi digital berkualitas tinggi bebas lisensi.
                            </p>
                          </div>

                          <div>
                            <h4 className="text-[10.5px] font-black text-slate-700 uppercase tracking-wide">
                              Audio Pembaca Al-Quran (Qari):
                            </h4>
                            <p className="text-[10px] font-medium leading-relaxed mt-0.5">
                              File murottal dan rekaman syeikh bersumber dari <b>Islamic Network</b> dan <b>EveryAyah</b>. Termasuk suara jernih dari Sheikh Mishary Rashid Al-Alafasy dan Mahmoud Khalil Al-Husary (standardisasi tempo lambat untuk anak).
                            </p>
                          </div>

                          <div>
                            <h4 className="text-[10.5px] font-black text-slate-700 uppercase tracking-wide">
                              Animasi & Pustaka Interaktif:
                            </h4>
                            <p className="text-[10px] font-medium leading-relaxed mt-0.5">
                              <b>Framer Motion</b> (`motion/react`) untuk transisi slide antar halaman, <b>Tailwind CSS</b> untuk tata letak visual premium, dan <b>Lucide Icons</b> untuk koleksi ikon navigasi.
                            </p>
                          </div>

                          <div>
                            <h4 className="text-[10.5px] font-black text-slate-700 uppercase tracking-wide">
                              Offline Caching Strategy:
                            </h4>
                            <p className="text-[10px] font-medium leading-relaxed mt-0.5">
                              Memadukan <b>Service Workers</b> modern & <b>Cache Storage API</b> untuk mengunduh seluruh file MP3 dan aset gambar tanpa mengurangi performa gawai Anda.
                            </p>
                          </div>
                        </div>

                        <div className="w-full text-center text-[9px] font-extrabold text-neutral-400 mt-2 border-t border-slate-50/60 pt-3">
                          Bebas Digunakan & Disebarluaskan • Hak Cipta © 2026 Wali Tahfiz PWA
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* RENDER VIEW 8: PENYIMPANAN OFFLINE WITH CUSTOM CACHING */}
              {activeSubView === "offline-storage" && (
                <div className="space-y-4 text-left font-sans">
                  {/* Apple Aesthetic Offline Storage Card */}
                  <div className="bg-white p-5 rounded-3xl border border-[#EBE6D9] shadow-xs animate-scale-up-gentle">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#48C78E] flex items-center gap-1.5 leading-none mb-1.5">
                      💾 PENYIMPANAN OFFLINE
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 leading-normal mb-5 font-sans">
                      {lang === "EN"
                        ? "Download audio files for Juz 30 and Quranic fonts to play them instantly without any internet connection."
                        : "Unduh file audio Juz 30 dan font Al-Quran agar dapat diputar seketika secara luring tanpa kuota internet."}
                    </p>

                    <div className="space-y-4">
                      {/* Row 1: Quranic Font */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FDFBF7] border border-slate-150">
                        <div className="text-left font-sans">
                          <p className="text-xs font-bold text-slate-800">KFGQPC Uthmanic Script</p>
                          <p className="text-[9px] font-extrabold text-[#48C78E] uppercase tracking-wider mt-0.5">
                            Font Resmi Al-Quran • 1.5 MB
                          </p>
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 uppercase tracking-wide font-sans">
                          ✅ Tersimpan
                        </span>
                      </div>

                      {/* Row 2: Audio Selection and Download */}
                      <div className="p-3.5 rounded-2xl bg-[#FDFBF7] border border-slate-150 flex flex-col gap-3 font-sans">
                        <div>
                          <p className="text-xs font-bold text-slate-800 font-extrabold font-sans">
                            {lang === "EN" ? "Juz 30 Audio Download" : "Unduh Audio Juz 30"}
                          </p>
                          <p className="text-[9px] font-extrabold text-[#A39E93] uppercase tracking-wider mt-0.5 font-bold font-sans">
                            {cachedCount > 0 
                              ? (lang === "EN" ? `Cached: ${cachedCount} / 564 Verses (${cacheSizeStr})` : `Tersimpan: ${cachedCount} / 564 Ayat (${cacheSizeStr})`)
                              : (lang === "EN" ? "Provides full offline play support" : "Mendukung putar luring penuh")}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black text-[#A39E93] uppercase font-sans">Pilih Qari Rujukan</label>
                          <select
                            value={selectedQariForOffline}
                            onChange={(e) => setSelectedQariForOffline(e.target.value)}
                            disabled={isDownloading}
                            className="bg-white border-2 border-[#EBE6D9] rounded-xl px-2 py-2 text-xs font-bold outline-none disabled:bg-slate-50 disabled:text-slate-400 font-sans cursor-pointer"
                          >
                            {qariList.map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.name} ({q.style})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="pt-1">
                          {isDownloading ? (
                            <div className="flex flex-col gap-2 font-sans">
                              <button
                                type="button"
                                onClick={cancelDownload}
                                className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-white text-xs font-black rounded-2xl shadow-sm transition-all cursor-pointer text-center uppercase tracking-wider flex items-center justify-center gap-2 font-sans"
                              >
                                ⏳ {lang === "EN" ? "Downloading" : "Mengunduh"}... {downloadProgress}% ({lang === "EN" ? "Cancel" : "Batal"})
                              </button>
                              
                              {/* Sleek inline progress bar */}
                              <div className="w-full bg-slate-150 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-[#48C78E] h-1.5 rounded-full transition-all duration-305" 
                                  style={{ width: `${downloadProgress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startDownload(selectedQariForOffline)}
                              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer text-center uppercase tracking-wider leading-none font-sans"
                            >
                              ⬇️ {lang === "EN" ? "Download Audio Juz 30" : "Unduh Audio Juz 30"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Storage Management Delete Action */}
                      <div className="pt-2 border-t border-dashed border-slate-200 flex flex-col items-center gap-2 font-sans">
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(lang === "EN" ? "Are you sure you want to delete all cached audio files?" : "Apakah Anda yakin ingin menghapus semua cache file audio?")) {
                              const success = await clearAudioCache();
                              if (success) {
                                triggerPlaySuccess();
                              }
                            }
                          }}
                          disabled={isDownloading || cachedCount === 0}
                          className="text-[10px] font-black text-rose-500 hover:text-rose-700 tracking-wide uppercase transition-colors mr-auto ml-auto cursor-pointer disabled:opacity-40 disabled:pointer-events-none mt-2 font-sans"
                        >
                          🗑️ {lang === "EN" ? "Delete audio data (Free memory)" : "Hapus data audio (Kosongkan memori)"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Qari Selection Modal/Drawer Slide-up Sheet */}
      <AnimatePresence>
        {isQariModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                triggerPlayPop();
                setIsQariModalOpen(false);
              }}
              className="absolute inset-0 bg-black/40 z-40 cursor-pointer"
            />
            {/* Slide-up Container */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-[#FDFBF7] border-t-4 border-[#EBE6D9] rounded-t-[2.5rem] z-50 p-4 sm:p-6 pb-6 shadow-2xl flex flex-col gap-5 max-h-[85%] overflow-y-auto"
            >
              {/* Header drag-indicator visual bar */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto" />
              
              <div className="flex items-center justify-between pb-2 border-b border-dashed border-[#EBE6D9]">
                <div className="text-left font-sans col-span-1">
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">
                    {translations[lang].qariTitle}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed font-semibold">
                    {translations[lang].qariSub}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerPlayPop();
                    setIsQariModalOpen(false);
                  }}
                  className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-[10px] font-black transition-all cursor-pointer"
                >
                  {lang === "EN" ? "Close" : "Tutup"}
                </button>
              </div>

              {/* Qari List layout */}
              <div className="flex flex-col gap-3">
                {qariList.map((q) => {
                  const isSelected = (globalQari || "ar.alafasy") === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        handleSelectQari(q.id);
                        setTimeout(() => setIsQariModalOpen(false), 200);
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between bg-white ${
                        isSelected
                          ? "border-[#48C78E] ring-2 ring-[#48C78E]/10"
                          : "border-slate-150 hover:border-slate-300 shadow-3xs"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                          isSelected ? "bg-[#48C78E]/10 text-[#48C78E]" : "bg-slate-50 text-slate-400"
                        }`}>
                          <Mic className="w-4 h-4" />
                        </div>
                        <div className="text-left font-sans">
                          <p className={`text-xs font-black transition-colors ${isSelected ? "text-slate-800 font-black" : "text-slate-700"}`}>
                            {q.name}
                          </p>
                          <p className="text-[9px] text-[#48C78E] font-black uppercase mt-0.5 leading-none">
                            {q.style}
                          </p>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? "border-[#48C78E] bg-[#48C78E] text-white" : "border-slate-200 bg-white"
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 stroke-[3px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
