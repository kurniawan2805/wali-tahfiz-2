export interface TranslationDict {
  heroHook: string;
  subDescription: string;
  ahlan: string;
  menuUtama: string;
  btnTugasBaru: string;
  btnPanduanAlur: string;
  btnTutupPanduan: string;
  tugasHariIni: string;
  manajemenHafalan: string;
  kabarNotifikasi: string;
  kabarSub: string;
  noProfile: string;
  startSetup: string;
  noProfileDesc: string;
  btnAddChild: string;
  freshSprout: string;
  youngSeedling: string;
  rambutanSeed: string;
  pepayaSeed: string;
  rambutanTree: string;
  harvestTime: string;
  streakSuffix: string;
  dailyReminderTitle: string;
  dailyReminderDesc: string;
  schoolReportTitle: string;
  schoolReportDesc: string;
  settingsHubTitle: string;
  settingsHubSub: string;
  manageChildTitle: string;
  manageChildSub: string;
  manageGroupTitle: string;
  manageGroupSub: string;
  curriculumTitle: string;
  curriculumSub: string;
  parentalCtrlTitle: string;
  parentalCtrlSub: string;
  soundTitle: string;
  soundSub: string;
  dbSyncTitle: string;
  dbSyncSub: string;
  resetAppTitle: string;
  resetAppSub: string;
  aboutTitle: string;
  aboutSub: string;
  parentDashboardHub: string;
  welcomeWali: string;
  phase1: string;
  phase2: string;
  phase3: string;
  gardeningStatus: string;
  wateredCount: string;
  outOfWater: string;
  sleepingTitle: string;
  sleepingDesc: string;
  backToHome: string;
  gardenNotReady: string;
  gardenNotReadyDesc: string;
  murojaahTarget: string;
  focusLearning: string;
  settingsHeaderTitle: string;
  editChildProfile: string;
  sessionTargetConfig: string;
  fieldTalaqqi: string;
  fieldTikrar: string;
  screenTimeLimit: string;
  saveChanges: string;
  signOutWali: string;
  qariLabel: string;
  qariSub: string;
  qariTitle: string;
}

export const translations: Record<"ID" | "EN", TranslationDict> = {
  ID: {
    heroHook: "Membantu Setiap Orang Tua Melahirkan Generasi Qurani.",
    subDescription: "Anda tidak harus menjadi seorang Hafidz untuk membimbing anak menjadi Hafidz. Wali Tahfiz mendesain metode tradisional menjadi sesi mikro modern yang praktis untuk keluarga.",
    ahlan: "Ahlan, Ayah/Bunda! 👋",
    menuUtama: "Menu Utama Wali Murid",
    parentDashboardHub: "WALI TAHFIZ HUB",
    welcomeWali: "Menu Utama Wali Murid",
    btnTugasBaru: "Tugas Baru",
    btnPanduanAlur: "Panduan Alur",
    btnTutupPanduan: "Tutup Panduan",
    tugasHariIni: "Tugas Hari Ini",
    manajemenHafalan: "MANAJEMEN HAFALAN & MUROJAAH",
    kabarNotifikasi: "Kabar & Notifikasi Wali Tahfiz",
    kabarSub: "Pantau aktivitas & kebun spiritual sang buah hati sore ini",
    noProfile: "Belum Ada Profil Anak",
    startSetup: "Mulai Setup Hafalan Si Kecil 💫",
    noProfileDesc: "Tambahkan profil anak Anda terlebih dahulu untuk mengatur tugas hafalan (Ziyadah) baru, mengulas murojaah harian, serta melacak kebun buah nusantara mereka!",
    btnAddChild: "Tambah Profil Anak 🚀",
    freshSprout: "Tunas Baru",
    youngSeedling: "Tunas Muda",
    rambutanSeed: "Bibit Rambutan",
    pepayaSeed: "Tunas Muda",
    rambutanTree: "Pohon Rambutan",
    harvestTime: "Waktunya Panen!",
    streakSuffix: "Hari",
    dailyReminderTitle: "Rekomendasi Harian Sore Hari ✨",
    dailyReminderDesc: "Ayah, Ibu... Kebun hafalan Kakak Said sudah merindukan siraman air sore ini. Yuk, luangkan waktu 5 menit bersama untuk mendengarkan ulasan Qarib-nya yang indah!",
    schoolReportTitle: "Laporan Sekolah 🌿",
    schoolReportDesc: "Alhamdulillah! Ustadz baru saja menyiram tanaman hafalan Adek Sumayyah di sekolah. Surat Al-Ikhlas dinyatakan MUTQIN! Yuk lihat pohonnya tumbuh semakin tinggi di dasbor Anda.",
    settingsHubTitle: "Pengaturan Hub ⚙️",
    settingsHubSub: "Konfigurasi Walisantri & Sistem",
    manageChildTitle: "Kelola Profil Anak",
    manageChildSub: "Ubah nama, bulan lahir, avatar lucu, dan hapus profil",
    manageGroupTitle: "Kelola Anggota Grup (Kolaborasi)",
    manageGroupSub: "Sinkronisasi data bersama Ayah, Ibu, atau Guru Tahfiz",
    curriculumTitle: "Presets Tikrar & Guru Talaqqi",
    curriculumSub: "Atur target berulang audio otomatis untuk setiap anak",
    parentalCtrlTitle: "Screen Time & Karakter Qari",
    parentalCtrlSub: "Batasan menit belajar & pilihan rujukan tilawah anak",
    soundTitle: "Suara Interaktif Instan",
    soundSub: "Bunyi synthesizer peluit harakat / piala emas",
    dbSyncTitle: "Atur Database & Autentikasi",
    dbSyncSub: "Koneksi sync, ganti akun, atau login tamu",
    resetAppTitle: "Setel Ulang Aplikasi",
    resetAppSub: "Hapus semua database piala, streak, dan progres local",
    aboutTitle: "Tentang Wali Tahfiz",
    aboutSub: "Detail kurikulum, lisensi aplikasi, dan kredit",
    phase1: "Fase 1: Talaqqi",
    phase2: "Fase 2: Tikrar",
    phase3: "Fase 3: Rabt",
    gardeningStatus: "Status Kebun",
    wateredCount: "Sudah disiram",
    outOfWater: "Sisa air habis! Yuk mengaji untuk kumpul air suci 📖✨",
    sleepingTitle: "Taman Wali Tahfiz Sudah Bobo 💤",
    sleepingDesc: "Ssst... Matahari sudah terbenam dan Taman Wali Tahfiz sudah mengantuk 💤. Pohon buah Kakak dan Adek mau bobo dulu ya. Sisa air di botolmu sudah disimpan aman di kulkas. Besok pagi kita siram lagi bersama Ayah dan Ibu!",
    backToHome: "Kembali ke Beranda 🏠",
    gardenNotReady: "Kebun Belum Siap 🌳",
    gardenNotReadyDesc: "Wah, Kebun Wali belum siap ditanam 🍃. Yuk, minta Ayah atau Ibu pilih Kebun Kakak atau Adek dulu di halaman Beranda!",
    murojaahTarget: "Target Murojaah",
    focusLearning: "Belajar & Berulang Secara Terarah 🌟",
    settingsHeaderTitle: "PENGATURAN WALI TAHFIZ",
    editChildProfile: "UBAH PROFIL ANAK",
    sessionTargetConfig: "KONFIGURASI TARGET SESI (PRESETS)",
    fieldTalaqqi: "Jumlah Putar Audio Guru (Fase 1)",
    fieldTikrar: "Target Tikrar Mandiri / Panen Buah (Fase 2)",
    screenTimeLimit: "PEMBATASAN DURASI SESI AKTIF (SCREEN TIME)",
    saveChanges: "Simpan Perubahan",
    signOutWali: "Keluar Akun Wali",
    qariLabel: "Pilihan Qari Rujukan",
    qariSub: "Pilih syeikh/qari untuk pemutaran audio otomatis talaqqi",
    qariTitle: "Pilih Qari Pembaca"
  },
  EN: {
    heroHook: "Empowering Every Parent to Nurture a Quranic Generation.",
    subDescription: "You don’t have to be a Hafidh to guide one. Wali Tahfiz scales traditional methods into simple, modern micro-sessions for families.",
    ahlan: "Welcome, Parent! 👋",
    menuUtama: "ParentDashboard Hub",
    parentDashboardHub: "WALI TAHFIZ HUB",
    welcomeWali: "Parent Dashboard Hub",
    btnTugasBaru: "New Task",
    btnPanduanAlur: "Flow Guide",
    btnTutupPanduan: "Close Guide",
    tugasHariIni: "Today's Tasks",
    manajemenHafalan: "MEMORIZATION & MUROJAAH MANAGEMENT",
    kabarNotifikasi: "Wali Tahfiz Updates & Feed",
    kabarSub: "Track your child's spiritual activities & garden updates",
    noProfile: "No Child Profile Yet",
    startSetup: "Set up Your Little One's Memorization 💫",
    noProfileDesc: "Add your child's profile first to set up new assignments (Ziyadah), review daily murojaah, and track their nusantara garden growth progress!",
    btnAddChild: "Add Child Profile 🚀",
    freshSprout: "Fresh Sprout",
    youngSeedling: "Young Seedling",
    rambutanSeed: "Rambutan Seedling",
    pepayaSeed: "Young Seedling",
    rambutanTree: "Rambutan Tree",
    harvestTime: "Harvest Time!",
    streakSuffix: "Days",
    dailyReminderTitle: "Daily Afternoon Reminder ✨",
    dailyReminderDesc: "Dear Father/Mother... Said's memorization garden is waiting to be watered this afternoon. Let's spend 5 minutes together listening to his beautiful review!",
    schoolReportTitle: "Teacher Assessment Sync 🌿",
    schoolReportDesc: "Alhamdulillah! The teacher has watered Sumayyah's garden at school. Surah Al-Ikhlas is certified MUTQIN! Let's watch her tree grow taller on your dashboard.",
    settingsHubTitle: "Settings Hub ⚙️",
    settingsHubSub: "Walisantri & System Configuration",
    manageChildTitle: "Manage Child Profile",
    manageChildSub: "Change name, birth date, cute avatar, and delete profile",
    manageGroupTitle: "Manage Group Members (Collaboration)",
    manageGroupSub: "Synchronize data with Father, Mother, or Tahfiz Teacher",
    curriculumTitle: "Tikrar & Talaqqi Presets",
    curriculumSub: "Set automatic audio repetition targets for each child",
    parentalCtrlTitle: "Screen Time & Qari Character",
    parentalCtrlSub: "Change learning minute limits and choose tilawah qari reference",
    soundTitle: "Instant Interactive Audio Feedbacks",
    soundSub: "Harakat feedback synth sounds or gold cup celebrations",
    dbSyncTitle: "Manage Database & Auth Connections",
    dbSyncSub: "Setup cloud synchronization, swap account, or login as guest",
    resetAppTitle: "Reset Current Application Data",
    resetAppSub: "Completely clear local progress, streaks, databases, and trophies",
    aboutTitle: "About Wali Tahfiz",
    aboutSub: "Curriculum mechanics details, licenses, and credits",
    phase1: "Phase 1: Listen & Absorb (Talaqqi)",
    phase2: "Phase 2: Harvest & Repeat (Tikrar)",
    phase3: "Phase 3: Connect the Chain (Rabt)",
    gardeningStatus: "Garden Status",
    wateredCount: "Watered",
    outOfWater: "Out of water! Let's study Quran to gather clean rainwater 📖✨",
    sleepingTitle: "The Quran Garden is resting 💤",
    sleepingDesc: "The Quran Garden is resting 💤. Let's water it again tomorrow!",
    backToHome: "Back to Home 🏠",
    gardenNotReady: "Garden is not ready 🌳",
    gardenNotReadyDesc: "The Wali Garden is not ready to be planted yet 🍃. Let's ask Mom or Dad to select a child from the Dashboard!",
    murojaahTarget: "Target Murojaah",
    focusLearning: "Focused & Structured Repetition 🌟",
    settingsHeaderTitle: "PARENT & TEACHER SETTINGS",
    editChildProfile: "EDIT CHILD PROFILE",
    sessionTargetConfig: "SESSION TARGET CONFIGURATION",
    fieldTalaqqi: "Teacher Audio Playback Target (Phase 1)",
    fieldTikrar: "Self-Repetition / Fruit Harvest Target (Phase 2)",
    screenTimeLimit: "DAILY SCREEN TIME LIMITS",
    saveChanges: "Save Changes",
    signOutWali: "Sign Out Wali Account",
    qariLabel: "Default Qari Selection",
    qariSub: "Choose the primary sheikh/reciter for automatic audio playback",
    qariTitle: "Select Reciter"
  }
};
