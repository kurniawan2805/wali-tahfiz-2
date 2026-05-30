import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  ChevronLeft, 
  Search, 
  Check, 
  BookOpen, 
  X, 
  ChevronUp, 
  ChevronDown, 
  ListOrdered, 
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { ChildProfile } from "../types";
import { quranMetaData } from "../data/quranMeta";

// Granular Arabic verses and segments mapping (Strictly NO Latin transliteration of slices)
export const ARABIC_VERSES: Record<string, string[]> = {
  "An-Nas": [
    "قُلْ أَعُوذُ بِرَبِّ النَّاسِ",
    "مَلِكِ النَّاسِ",
    "إِلَهِ النَّاسِ",
    "مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ",
    "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ",
    "مِنَ الْجِنَّةِ وَالنَّاسِ"
  ],
  "Al-Falaq": [
    "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ",
    "مِنْ شَرِّ مَا خَلَقَ",
    "وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ",
    "وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ",
    "وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ"
  ],
  "Al-Ikhlas": [
    "قُلْ هُوَ اللَّهُ أَحَدٌ",
    "اللَّهُ الصَّمَدُ",
    "لَمْ يَلِدْ وَلَمْ يُولَدْ",
    "وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ"
  ],
  "Al-Lahab": [
    "تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ",
    "مَا أَغْنَى عَنْهُ مَالُهُ وَمَا كَسَبَ",
    "سَيَصْلَى نَارًا ذَاتَ لَهَبٍ",
    "وَامْرَأَتُهُ حَمَّالَةَ الْحَطَبِ",
    "فِي جِيدِهَا حَبْلٌ مِنْ مَسَدٍ"
  ],
  "An-Nasr": [
    "إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ",
    "وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا",
    "فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ إِنَّهُ كَانَ تَوَّابًا"
  ],
  "Al-Kafirun": [
    "قُلْ يَا أَيُّهَا الْكَافِرُونَ",
    "لَا أَعْبُدُ مَا تَعْبُدُونَ",
    "و|َلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ",
    "وَلَا أَنَا عَابِدٌ مَا عَبَدْتُمْ",
    "وَلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ",
    "لَكُمْ دِينُكُمْ وَلِيَ دِينِ"
  ],
  "Al-Kautsar": [
    "إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ",
    "فَصَلِّ لِرَبِّكَ وَانْحَرْ",
    "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ"
  ],
  "Al-Ma'un": [
    "أَرَأَيْتَ الَّذِي يُكَذِّبُ بِالدِّينِ",
    "فَذَلِكَ الَّذِي يَدُعُّ الْيَتِيمَ",
    "وَلَا يَحُضُ*َّ عَلَى طَعَامِ الْمِسْكِينِ",
    "فَوَيْلٌ لِلْمُصَلِّينَ",
    "الَّذِينَ هُمْ عَنْ صَلَاتِهِمْ سَاهُونَ",
    "الَّذِينَ هُمْ يُرَاءُونَ",
    "وَيَمْنَعُونَ الْمَاعُونَ"
  ],
  "Quraysh": [
    "لِإِيلَافِ قُرَيْشٍ",
    "إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ",
    "فَلْيَعْبُدُوا رَبَّ هَذَا الْبَيْتِ",
    "الَّذِي أَطْعَمَهُمْ مِنْ جُوعٍ وَآمَنَهُمْ مِنْ خَوْفٍ"
  ],
  "Al-Fil": [
    "أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ الْفِيلِ",
    "أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ",
    "وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ",
    "تَرْمِيهِمْ بِحِجَارَةٍ مِنْ سِجِّيلٍ",
    "فَجَعَلَهُمْ كَعَصْفٍ مَأْكُولٍ"
  ],
  "Al-Ashr": [
    "وَالْعَصْرِ",
    "إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ",
    "إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ"
  ],
  "Al-Fatihah": [
    "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
    "الرَّحْمَنِ الرَّحِيمِ",
    "مَالِكِ يَوْمِ الدِّينِ",
    "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
    "اِهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
    "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ"
  ],
  "Doa Sebelum Makan": [
    "بِسْمِ اللَّهِ",
    "اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا",
    "وَقِنَا عَذَابَ النَّارِ"
  ],
  "Doa Sesudah Makan": [
    "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا",
    "وَعَلَى طَعَامِهِ الْحَمْدُ"
  ],
  "Doa Sebelum Tidur": [
    "بِاسْمِكَ اللَّهُمَّ أَحْيَا",
    "وَبِاسْمِكَ أَمُوتُ"
  ],
  "Doa Bangun Tidur": [
    "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا",
    "وَإِلَيْهِ النُّشُورُ"
  ],
  "Doa Kedua Orang Tua": [
    "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ",
    "وَارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا"
  ],
  "Doa Masuk Masjid": [
    "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ"
  ],
  "Doa Sapu Jagad": [
    "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً",
    "وَفِي الْآخِرَةِ حَسَنَةً",
    "وَقِنَا عَذَابَ النَّارِ"
  ]
};

// Build full 114-surah list from quranMetaData (exclude placeholder id=0)
const ALL_SURAHS = (quranMetaData as any[]).filter(
  (s: any) => s && s.id !== 0 && s.id !== undefined
).map((s: any) => ({
  id: s.id as number,
  name: s.transliteration as string,
  verses: s.verses as number,
  translation: s.translation as string,
  arabic: s.arabic as string,
  alternateNames: s.alternateNames as string[] | undefined
}));

// Popular Short Surah Presets (Juz 'Amma — kept for smart recommendation engine)
const POPULAR_SURAH_PRESETS = [
  { id: 114, name: "An Naas", verses: 6, translation: "Manusia", arabic: "الناس" },
  { id: 113, name: "Al Falaq", verses: 5, translation: "Waktu Subuh", arabic: "الفلق" },
  { id: 112, name: "Al Ikhlaas", verses: 4, translation: "Kemurnian Keesaan", arabic: "الإخلاص" },
  { id: 111, name: "Al Masad", verses: 5, translation: "Gejolak Api", arabic: "المسد" },
  { id: 110, name: "An Nasr", verses: 3, translation: "Pertolongan", arabic: "النصر" },
  { id: 109, name: "Al Kaafiroon", verses: 6, translation: "Orang Kafir", arabic: "الكافرون" },
  { id: 108, name: "Al Kawthar", verses: 3, translation: "Nikmat Berlimpah", arabic: "الكوثر" },
  { id: 107, name: "Al Maa'un", verses: 7, translation: "Barang Berguna", arabic: "الماعون" },
  { id: 106, name: "Quraish", verses: 4, translation: "Suku Quraisy", arabic: "قريش" },
  { id: 105, name: "Al Fil", verses: 5, translation: "Gajah", arabic: "الفيل" },
  { id: 104, name: "Al Humaza", verses: 9, translation: "Pengumpat", arabic: "الهمزة" },
  { id: 103, name: "Al Asr", verses: 3, translation: "Demi Masa", arabic: "العصر" },
  { id: 1, name: "Al Faatiha", verses: 7, translation: "Pembuka", arabic: "الفاتحة" }
];

// Touch-friendly Indonesian doas
const COMMON_DOAS = [
  { id: "doa_makan", name: "Doa Sebelum Makan", type: "Doa", translation: "Memohon keberkahan makanan", segments: ["Bismillah", "Allahumma barik lana", "Fiima razaqtana", "Wa qina 'adzaban-naar"] },
  { id: "doa_makan_sesudah", name: "Doa Sesudah Makan", type: "Doa", translation: "Kesyukuran setelah kenyang", segments: ["Alhamdulillahil-ladzi ath'amana", "Wa saqaana", "Wa ja'alana minal-muslimiin"] },
  { id: "doa_tidur", name: "Doa Sebelum Tidur", type: "Doa", translation: "Perlindungan dalam tidur", segments: ["Bismika Allahumma", "Ahya wa bismika", "Amuut"] },
  { id: "doa_bangun", name: "Doa Bangun Tidur", type: "Doa", translation: "Kesyukuran pagi hari", segments: ["Alhamdulillahil-ladzi ahyaana", "Ba'da maa amaatana", "Wa ilaihin-nusyuur"] },
  { id: "doa_ortu", name: "Doa Kedua Orang Tua", type: "Doa", translation: "Kasih sayang orang tua", segments: ["Rabbighfir lii", "Wa liwaalidayya", "Warhamhuma kamaa", "Rabbayaanii shaghiiraa"] },
  { id: "doa_masjid", name: "Doa Masuk Masjid", type: "Doa", translation: "Membuka pintu rahmat", segments: ["Allahummaftah lii", "Abwaaba rahmatik"] },
  { id: "doa_dunia_akhirat", name: "Doa Sapu Jagad", type: "Doa", translation: "Keselamatan dunia akhirat", segments: ["Rabbana aatinaa", "Fiddunyaa hasanataan", "Wa fil aakhirati hasanataan", "Wa qinaa 'adzaaban-naar"] }
];

// Sliced Queue Item
export interface SlicedQueueItem {
  id: string;
  childId: string;
  sourceName: string;
  isDoa: boolean;
  segmentText: string; // The pure Arabic verse text
  addedAt: string;
  segmentIndex: number; // 0-based relative index within source sequence
}

interface SmartAddTaskFormProps {
  activeChild: ChildProfile | null;
  onAddTaskDone?: (surahOrDoaName: string, detailText: string, isDoa: boolean) => void;
  lang?: "ID" | "EN";
  soundSynth?: any;
  onClose?: () => void;
  onAddTaskForChild?: (
    childId: string, 
    surah: string, 
    verse: string, 
    category: "ziyadah" | "qarib" | "sabiq",
    initialGrade?: "ulangi" | "bagus" | "sempurna"
  ) => void;
}

export default function SmartAddTaskForm({
  activeChild,
  onAddTaskDone,
  lang = "ID",
  soundSynth,
  onClose,
  onAddTaskForChild
}: SmartAddTaskFormProps) {
  // Workflow states: "default" | "selector" | "slicing"
  const [currentView, setCurrentView] = useState<"default" | "selector" | "slicing">("default");
  
  // Method tab inside selected Details panel
  const [methodTab, setMethodTab] = useState<"simple" | "slicing">("simple");
  const [simpleDariAyat, setSimpleDariAyat] = useState<number | "">(1);
  const [simpleSampaiAyat, setSimpleSampaiAyat] = useState<number | "">(5);

  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedItem, setSelectedItem] = useState<{ id: string | number; name: string; isDoa: boolean; segments: string[]; verses?: number } | null>(null);
  const [checkedSegments, setCheckedSegments] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load date-agnostic queue
  const [pendingQueue, setPendingQueue] = useState<SlicedQueueItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wali_pending_task_queue");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Auto-focus search when entering selector view
  useEffect(() => {
    if (currentView === "selector") {
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  }, [currentView]);

  // Keep queue synced with localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wali_pending_task_queue", JSON.stringify(pendingQueue));
    }
  }, [pendingQueue]);

  // Reactive Queue Filtered by active child
  const childPendingQueue = useMemo(() => {
    if (!activeChild) return [];
    return pendingQueue.filter(item => item.childId === activeChild.id);
  }, [pendingQueue, activeChild]);

  // Group queue by sourceName consecutively for unified tidy grouping headers
  const groupedQueue = useMemo(() => {
    const groups: { sourceName: string; isDoa: boolean; items: SlicedQueueItem[] }[] = [];
    childPendingQueue.forEach((item) => {
      let existingGroup = groups.find(g => g.sourceName === item.sourceName);
      if (!existingGroup) {
        existingGroup = { sourceName: item.sourceName, isDoa: item.isDoa, items: [] };
        groups.push(existingGroup);
      }
      existingGroup.items.push(item);
    });
    return groups;
  }, [childPendingQueue]);

  // Adaptive Recommendation Engine
  const smartRecommendation = useMemo(() => {
    if (!activeChild) {
      return { id: 114, name: "An-Nas", detail: "Ayat 1-2 (Sangat Mudah)", isDoa: false };
    }

    const completed = activeChild.completedBooks || 0;
    if (completed === 0) {
      return { id: 114, name: "An-Nas", detail: "Ayat 1-2 (Sangat Mudah)", isDoa: false };
    } else if (completed === 1) {
      return { id: 113, name: "Al-Falaq", detail: "Ayat 1-2 (Tenang)", isDoa: false };
    } else if (completed === 2) {
      return { id: 112, name: "Al-Ikhlas", detail: "Ayat 1-4 (Keesaan)", isDoa: false };
    } else if (completed === 3) {
      return { id: "doa_makan", name: "Doa Sebelum Makan", detail: "Sering Didengar", isDoa: true };
    } else {
      const preset = POPULAR_SURAH_PRESETS[completed % POPULAR_SURAH_PRESETS.length];
      return {
        id: preset.id,
        name: preset.name,
        detail: `Ayat 1-2 (${preset.translation})`,
        isDoa: false
      };
    }
  }, [activeChild]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const playPop = () => {
    if (soundSynth?.playPop) soundSynth.playPop();
  };

  const playSuccess = () => {
    if (soundSynth?.playSuccess) soundSynth.playSuccess();
  };

  // Add recommendation directly to queue — with duplication guard
  const handleRecommendSelect = () => {
    if (!activeChild) return;
    playSuccess();

    const name = smartRecommendation.name;
    const isDoa = smartRecommendation.isDoa;
    const rawArabicList = ARABIC_VERSES[name] || ["بِسْمِ اللَّهِ"];
    
    // Duplication guard: check if source already exists in this child's queue
    const alreadyInQueue = pendingQueue.some(
      item => item.childId === activeChild.id && item.sourceName === name
    );

    if (alreadyInQueue) {
      showToast(`⚠️ ${name} sudah ada di antrean. Pilih surat lain atau promosikan yang ada.`);
      return;
    }

    // Add Ayat 1 and 2 (or up to length) directly as clean instant slices
    const countToAdd = Math.min(2, rawArabicList.length);
    const newSlices: SlicedQueueItem[] = [];

    for (let i = 0; i < countToAdd; i++) {
      newSlices.push({
        id: `queue_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
        childId: activeChild.id,
        sourceName: name,
        isDoa,
        segmentText: rawArabicList[i],
        addedAt: new Date().toISOString(),
        segmentIndex: i
      });
    }

    setPendingQueue(prev => [...prev, ...newSlices]);
    showToast(`✨ Berhasil menambahkan 2 kepingan ${name} ke antrean!`);

    if (onAddTaskDone) {
      onAddTaskDone(name, `Ditambahkan 2 kepingan ke antrean`, isDoa);
    }
  };

  // Manual Select Item — supports both preset+doa (with ARABIC_VERSES) and full quran (verse count only)
  const handleItemSelect = (item: any, isDoa: boolean) => {
    playPop();
    const name = item.name;
    const rawArabicList = ARABIC_VERSES[name] || [];
    // For surahs not in ARABIC_VERSES, build numbered placeholder segments based on verse count
    const verseCount = item.verses || rawArabicList.length || 1;
    const segments = rawArabicList.length > 0
      ? rawArabicList
      : Array.from({ length: verseCount }, (_, i) => `آية ${i + 1}`);

    setSelectedItem({
      id: item.id,
      name,
      isDoa,
      segments,
      verses: verseCount
    });

    // Reset default simple ranges based on size
    setSimpleDariAyat(1);
    setSimpleSampaiAyat(Math.min(verseCount, 5));
    setMethodTab("simple");

    // Prefill all segments checked (max 10 to avoid overwhelming checkboxes)
    const initChecked: Record<string, boolean> = {};
    segments.slice(0, 10).forEach((_, idx) => {
      initChecked[`seg_${idx}`] = true;
    });
    setCheckedSegments(initChecked);
    setCurrentView("slicing");
  };

  // Confirm slicing view & add to queue
  const handleConfirmSlicing = () => {
    if (!activeChild || !selectedItem) return;
    playSuccess();

    const newSlices: SlicedQueueItem[] = [];
    selectedItem.segments.forEach((seg, index) => {
      if (checkedSegments[`seg_${index}`]) {
        newSlices.push({
          id: `queue_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
          childId: activeChild.id,
          sourceName: selectedItem.name,
          isDoa: selectedItem.isDoa,
          segmentText: seg,
          addedAt: new Date().toISOString(),
          segmentIndex: index
        });
      }
    });

    if (newSlices.length > 0) {
      setPendingQueue(prev => [...prev, ...newSlices]);
      showToast(`✨ Ditambahkan ${newSlices.length} kepingan ke antrean.`);
      if (onAddTaskDone) {
        onAddTaskDone(selectedItem.name, `Ditambahkan ${newSlices.length} kepingan hafalan`, selectedItem.isDoa);
      }
    }

    setSelectedItem(null);
    setCheckedSegments({});
    setCurrentView("default");
  };

  // Confirm simple whole-range task selection
  const handleConfirmSimpleTask = () => {
    if (!activeChild || !selectedItem) return;
    playSuccess();

    const from = simpleDariAyat === "" ? 1 : Number(simpleDariAyat);
    const to = simpleSampaiAyat === "" ? selectedItem.segments.length : Number(simpleSampaiAyat);

    const finalFrom = Math.min(from, to);
    const finalTo = Math.max(from, to);

    const verseRange = finalFrom === finalTo ? `Ayat ${finalFrom}` : `Ayat ${finalFrom}-${finalTo}`;

    // 1. Direct active Ziyadah target setup
    if (onAddTaskForChild) {
      onAddTaskForChild(
        activeChild.id,
        selectedItem.name,
        verseRange,
        "ziyadah",
        "sempurna"
      );
    }

    // 2. Propagation review logs
    if (onAddTaskDone) {
      onAddTaskDone(selectedItem.name, verseRange, selectedItem.isDoa);
    }

    showToast(`✨ Berhasil memulai target baru ${selectedItem.name} ${verseRange}!`);

    // Reset and dismiss
    setSelectedItem(null);
    setCurrentView("default");
    if (onClose) onClose();
  };

  // Promote a single queue element to active Ziyadah target task
  const handlePromoteQueueToActive = (item: SlicedQueueItem) => {
    if (!activeChild) return;
    playSuccess();

    const rangeLabel = `Ayat ${item.segmentIndex + 1}`;

    // 1. Direct active Ziyadah target setup
    if (onAddTaskForChild) {
      onAddTaskForChild(
        activeChild.id,
        item.sourceName,
        rangeLabel,
        "ziyadah",
        "sempurna"
      );
    }

    // 2. Remove this specific item from the queue queue list
    setPendingQueue(prev => prev.filter(q => q.id !== item.id));

    if (onAddTaskDone) {
      onAddTaskDone(item.sourceName, rangeLabel, item.isDoa);
    }

    showToast(`✨ Memulai kepingan hafalan ${item.sourceName} ${rangeLabel}!`);

    if (onClose) onClose();
  };

  // Remove individual queue element
  const handleRemoveQueueItem = (id: string) => {
    playPop();
    setPendingQueue(prev => prev.filter(item => item.id !== id));
  };

  // Reorder queue elements
  const handleMoveQueueItem = (globalIndex: number, direction: "up" | "down") => {
    playPop();
    const currentList = [...childPendingQueue];
    if (direction === "up" && globalIndex > 0) {
      const temp = currentList[globalIndex];
      currentList[globalIndex] = currentList[globalIndex - 1];
      currentList[globalIndex - 1] = temp;
    } else if (direction === "down" && globalIndex < currentList.length - 1) {
      const temp = currentList[globalIndex];
      currentList[globalIndex] = currentList[globalIndex + 1];
      currentList[globalIndex + 1] = temp;
    }

    const nonActiveChildItems = pendingQueue.filter(item => item.childId !== activeChild?.id);
    setPendingQueue([...nonActiveChildItems, ...currentList]);
  };

  // Clean empty
  const handleClearAllQueue = () => {
    if (!activeChild) return;
    playPop();
    if (confirm("Kosongkan seluruh antrean tugas saat ini?")) {
      setPendingQueue(prev => prev.filter(item => item.childId !== activeChild.id));
      showToast("🗑️ Seluruh antrean berhasil dikosongkan");
    }
  };

  // Filter full 114-surah list — uses quranMetaData via ALL_SURAHS
  const filteredSurahs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return ALL_SURAHS;
    return ALL_SURAHS.filter(s => {
      if (/^\d+$/.test(query)) return s.id.toString() === query;
      const nameMatch = s.name.toLowerCase().includes(query);
      const transMatch = s.translation.toLowerCase().includes(query);
      const altMatch = s.alternateNames?.some((n: string) => n.toLowerCase().includes(query));
      const arabicMatch = s.arabic?.includes(query);
      return nameMatch || transMatch || altMatch || arabicMatch;
    });
  }, [searchQuery]);

  const filteredDoas = useMemo(() => {
    if (!searchQuery) return COMMON_DOAS;
    return COMMON_DOAS.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.translation.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Helper: check if a sourceName is already in this child's queue
  const isAlreadyQueued = (name: string) =>
    activeChild
      ? pendingQueue.some(item => item.childId === activeChild.id && item.sourceName === name)
      : false;

  // Is recommendation already queued?
  const isRecommendQueued = isAlreadyQueued(smartRecommendation.name);

  return (
    <div className="fixed inset-0 z-[999] bg-slate-50 flex flex-col md:max-w-md md:mx-auto shadow-2xl overflow-hidden font-sans select-none animate-scale-up-gentle" style={{ animationDuration: "200ms" }}>
      
      {/* 1. APPLE-CLEAN TOP NAVIGATION HEADER */}
      <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 shrink-0 shadow-xs">
        <button
          onClick={() => {
            playPop();
            if (currentView === "default") {
              if (onClose) onClose();
            } else if (currentView === "selector") {
              setCurrentView("default");
            } else if (currentView === "slicing") {
              setCurrentView("selector");
            }
          }}
          type="button"
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-all font-bold text-xs uppercase tracking-wider cursor-pointer select-none"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Kembali</span>
        </button>

        <h1 className="text-slate-800 font-bold text-sm tracking-tight select-none">
          {currentView === "slicing" ? "Potong Kepingan" : currentView === "selector" ? "Pilih Surat / Doa" : "Tambah Antrean"}
        </h1>

        <button
          onClick={() => {
            playPop();
            if (onClose) onClose();
          }}
          type="button"
          className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer select-none"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Floating Interactive Toast feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-18 left-4 right-4 bg-emerald-600 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-md z-50 text-center pointer-events-none"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEW PANEL DETECTOR */}
      <div className="flex-1 overflow-y-auto pb-8">
        
        <AnimatePresence mode="wait">
          
          {/* VIEW A: DEFAULT VIEW PAGE (RECOMMENDATION & CURRENT QUEUE) */}
          {currentView === "default" && (
            <motion.div
              key="default_panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col text-left"
            >
              
              {/* 2. SMART RECOMMENDATION CARD */}
              <div className="bg-white shadow-xs rounded-2xl p-5 mx-4 mt-5 border border-slate-100 flex flex-col relative overflow-hidden">
                <div className="absolute right-[-14px] top-[-14px] w-20 h-20 bg-emerald-50 rounded-full opacity-40 blur-xl pointer-events-none" />
                
                <div className="flex gap-3 items-start z-10">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-800 tracking-tight leading-none mt-0.5">
                        Siap untuk hafalan baru?
                      </h3>
                      {isRecommendQueued && (
                        <span className="text-[8.5px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full leading-none border border-emerald-200/60">
                          ✓ Di antrean
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-slate-500 font-bold leading-normal mt-1.5">
                      Rekomendasi: <span className="text-emerald-600 font-extrabold">{smartRecommendation.isDoa ? smartRecommendation.name : `Surah ${smartRecommendation.name}`}</span>{" "}
                      <span className="text-slate-400">({smartRecommendation.isDoa ? "Doa Rutinitas" : smartRecommendation.detail})</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 z-10">
                  <button
                    onClick={handleRecommendSelect}
                    type="button"
                    disabled={isRecommendQueued}
                    className={`w-full font-black text-xs uppercase tracking-widest py-3.5 px-4 rounded-xl shadow-sm transition-all active:scale-95 border-none ${
                      isRecommendQueued
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
                    }`}
                  >
                    {isRecommendQueued ? "Sudah di Antrean ✓" : "Tambahkan ke Antrean"}
                  </button>

                  <button
                    onClick={() => { playPop(); setCurrentView("selector"); }}
                    type="button"
                    className="text-[11px] text-slate-500 hover:text-slate-800 font-black text-center tracking-wide block uppercase transition-colors select-none"
                  >
                    Pilih surah/doa lain...
                  </button>
                </div>
              </div>

              {/* 3. TASK QUEUE SECTION (ANTREAN BERJALAN) */}
              <div className="px-4 mt-6">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 mb-3">
                  <div className="flex items-center gap-1.5">
                    <ListOrdered className="w-4 h-4 text-slate-400" />
                    <div>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-tight">Urutan Sesi (Tanpa Tanggal)</h4>
                      <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider leading-none mt-0.5">
                        Aliran materi harian hafiz cilik
                      </p>
                    </div>
                  </div>
                  {childPendingQueue.length > 0 && (
                    <button
                      onClick={handleClearAllQueue}
                      className="text-[9.5px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest cursor-pointer select-none"
                    >
                      KOSONGKAN
                    </button>
                  )}
                </div>

                {childPendingQueue.length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-2xl flex flex-col items-center justify-center bg-white border border-slate-100 shadow-3xs mt-2">
                    <span className="text-3xl mb-2">🧁</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Antrean Kosong</span>
                    <p className="text-[10px] text-slate-400 font-semibold max-w-[220px] leading-relaxed mt-1.5 mx-auto text-center">
                      Tambahkan kepingan dari rekomendasi atau pilih surah manual untuk memulai!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 mt-3">
                    {/* Render grouped queue items */}
                    {groupedQueue.map((group, groupIdx) => (
                      <div key={`group-${groupIdx}`} className="flex flex-col text-left">
                        
                        {/* Sticky Group Title Header Rendered ONCE per group */}
                        <div className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-2 flex items-center justify-between border-l-4 border-emerald-400">
                          <span className="ml-1.5">{group.sourceName}</span>
                          {group.isDoa && (
                            <span className="bg-emerald-50 text-emerald-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md scale-90">
                              Doa
                            </span>
                          )}
                        </div>

                        {/* List Items of this group containing ONLY Arabic text representation */}
                        <div className="space-y-1.5">
                          {group.items.map((item) => {
                            // Find the global non-filtered index of this element in childPendingQueue
                            const globalIndex = childPendingQueue.findIndex(q => q.id === item.id);
                            
                            return (
                              <div
                                key={item.id}
                                className="p-3 bg-white rounded-xl border border-slate-100/80 shadow-3xs hover:border-slate-200 transition-all flex items-center justify-between gap-3 text-left"
                              >
                                {/* Left Side: Subtle circle containing number index */}
                                <div className="flex items-center gap-2shrink-0">
                                  <span className="w-5 h-5 rounded-full bg-slate-50 border border-slate-100 text-[9px] text-slate-400 font-black flex items-center justify-center select-none">
                                    {globalIndex + 1}
                                  </span>
                                </div>

                                {/* Center: ONLY Beautiful styled Arabic text slice without Latin romanization */}
                                <div className="flex-1 text-right select-all px-2">
                                  <span className="text-xl md:text-2xl font-arabic text-slate-800 leading-[1.8] font-normal direction-rtl">
                                    {item.segmentText}
                                  </span>
                                </div>

                                {/* Right Side: Rearrange & Soft gray close remove button */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  
                                  {/* Promote button */}
                                  <button
                                    onClick={() => handlePromoteQueueToActive(item)}
                                    className="px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 transition-all cursor-pointer text-[9.5px] font-black uppercase tracking-wider shadow-4xs shrink-0 select-none active:scale-95 duration-150 border-none"
                                    title="Mulai evaluasi potongan ini sekarang!"
                                  >
                                    <span>Evaluasi</span>
                                    <span>➔</span>
                                  </button>
                                  
                                  {/* Up order click trigger */}
                                  <button
                                    onClick={() => handleMoveQueueItem(globalIndex, "up")}
                                    disabled={globalIndex === 0}
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                                      globalIndex === 0
                                        ? "text-slate-100 cursor-not-allowed"
                                        : "text-slate-400 hover:bg-slate-55 hover:text-slate-600 cursor-pointer"
                                    }`}
                                    title="Naik"
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </button>

                                  {/* Down order click trigger */}
                                  <button
                                    onClick={() => handleMoveQueueItem(globalIndex, "down")}
                                    disabled={globalIndex === childPendingQueue.length - 1}
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                                      globalIndex === childPendingQueue.length - 1
                                        ? "text-slate-100 cursor-not-allowed"
                                        : "text-slate-400 hover:bg-slate-55 hover:text-slate-600 cursor-pointer"
                                    }`}
                                    title="Turun"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </button>

                                  {/* Safe soft grey circular remove button */}
                                  <button
                                    onClick={() => handleRemoveQueueItem(item.id)}
                                    className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                                    title="Hapus kepingan"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>

                                </div>
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. SOFT INFO FOOTER */}
              <div className="mx-4 mt-8 bg-slate-100 p-4 rounded-2xl border border-transparent flex gap-2 w-auto items-start text-left shrink-0">
                <AlertCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-slate-450 text-[10.5px] leading-relaxed font-semibold">
                  💡 Kepingan teratas akan diputar pertama. Sistem otomatis lanjut ke kepingan berikutnya setelah dinilai lancar oleh orang tua.
                </p>
              </div>

            </motion.div>
          )}

          {/* VIEW B: SELECTING SOURAH OR DOA — full 114 surahs + doas */}
          {currentView === "selector" && (
            <motion.div
              key="selector_panel"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-4 pt-4 text-left"
            >
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-1 leading-none mb-3">
                CARI DARI 114 SURAT AL-QUR'AN
              </p>

              {/* Search Bar — auto-focused via useEffect + ref */}
              <div className="relative mb-4 sticky top-0 z-10">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Ketik nama, nomor, atau terjemahan surat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border-2 border-slate-200 focus:border-emerald-400 rounded-xl pl-10 pr-10 py-3 text-xs font-bold text-slate-700 outline-none transition-colors placeholder:text-slate-400 shadow-xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                {searchQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="space-y-5">
                
                {/* Full Al-Qur'an surah list */}
                <div>
                  <h3 className="text-[10.5px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Al-Qur'an — {filteredSurahs.length} Surat
                  </h3>

                  {filteredSurahs.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-400 font-bold">
                      🔍 Surat tidak ditemukan
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {filteredSurahs.map((surah) => {
                        const alreadyQueued = isAlreadyQueued(surah.name);
                        return (
                          <button
                            key={surah.id}
                            type="button"
                            onClick={() => handleItemSelect(surah, false)}
                            className={`p-3 bg-white border rounded-xl flex flex-col text-left transition-all active:scale-[0.98] cursor-pointer relative ${
                              alreadyQueued
                                ? "border-emerald-200 bg-emerald-50/30"
                                : "border-slate-100 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex justify-between items-start w-full">
                              <span className="w-5 h-5 rounded-md bg-slate-50 text-[9px] font-black text-slate-400 flex items-center justify-center border border-slate-100">
                                {surah.id}
                              </span>
                              <span className="text-sm font-bold font-arabic text-slate-500">{surah.arabic}</span>
                            </div>
                            <span className="text-xs font-black text-slate-800 mt-2 truncate w-full">{surah.name}</span>
                            <span className="text-[9.5px] text-slate-400 font-semibold truncate w-full">{surah.translation}</span>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[8.5px] text-slate-300 font-bold">{surah.verses} ayat</span>
                              {alreadyQueued && (
                                <span className="text-[7.5px] font-black text-emerald-600 uppercase tracking-wide">
                                  ✓ Antrean
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Doa presets block */}
                <div>
                  <h3 className="text-[10.5px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Doa Sehari-hari ({filteredDoas.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {filteredDoas.map((doa) => {
                      const alreadyQueued = isAlreadyQueued(doa.name);
                      return (
                        <button
                          key={doa.id}
                          type="button"
                          onClick={() => handleItemSelect(doa, true)}
                          className={`p-3 bg-white border rounded-xl flex flex-col text-left transition-all active:scale-[0.98] cursor-pointer ${
                            alreadyQueued
                              ? "border-emerald-200 bg-emerald-50/30"
                              : "border-slate-100 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className="w-5 h-5 rounded-md bg-emerald-50 text-[9px] text-emerald-600 flex items-center justify-center">
                              🙏
                            </span>
                            {alreadyQueued && (
                              <span className="text-[7.5px] font-black text-emerald-600 uppercase tracking-wide">
                                ✓
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-black text-slate-800 mt-2 truncate w-full">{doa.name}</span>
                          <span className="text-[9.5px] text-slate-400 font-semibold truncate w-full">{doa.translation}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* VIEW C: DETAILS & ALLOCATION VIEW */}
          {currentView === "slicing" && selectedItem && (
            <motion.div
              key="slicing_panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 pt-4 text-left"
            >
              {/* Header with Title */}
              <div className="mb-4">
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Pengaturan Hafalan
                </span>
                <h3 className="text-sm font-black text-slate-800 tracking-tight mt-1.5 flex items-center justify-between">
                  <span>{selectedItem.isDoa ? "Doa:" : "Surat:"} <span className="text-emerald-600">{selectedItem.name}</span> 📚</span>
                </h3>
                <p className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wider mt-1 leading-none">
                  Tentukan bagaimana si kecil akan melatih materi ini hari ini
                </p>
              </div>

              {/* Segmented Strategy selector pills */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-5 w-full border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => { playPop(); setMethodTab("simple"); }}
                  className={`flex-1 text-center py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all select-none border-none outline-none ${
                    methodTab === "simple" 
                      ? "bg-white text-slate-800 shadow-3xs"
                      : "text-slate-400 hover:text-slate-600 bg-transparent cursor-pointer"
                  }`}
                >
                  🚀 Simpel (Mulai Langsung)
                </button>
                <button
                  type="button"
                  onClick={() => { playPop(); setMethodTab("slicing"); }}
                  className={`flex-1 text-center py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all select-none border-none outline-none ${
                    methodTab === "slicing" 
                      ? "bg-white text-emerald-600 shadow-3xs"
                      : "text-slate-400 hover:text-slate-600 bg-transparent cursor-pointer"
                  }`}
                >
                  ✂️ Potong (Antrean Balita)
                </button>
              </div>

              {/* TAB CONTENT A: SIMPLE & DIRECT */}
              {methodTab === "simple" && (
                <div className="space-y-4 py-2">
                  <div className="bg-amber-50/75 p-4 rounded-2xl border border-amber-100 flex flex-col gap-1 text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#854D0E] leading-none mb-1">
                      💡 CARA INI DIREKOMENDASIKAN
                    </span>
                    <p className="text-[#854D0E] text-[10.5px] leading-relaxed font-semibold">
                      Metode ini langsung menetapkan rentang ayat pilihan Anda sebagai target aktif belajar anak hari ini. Sangat simpel dan bebas pusing!
                    </p>
                  </div>

                  {/* Range Selector Controls */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {/* Dari Ayat Counter */}
                    <div className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-2xl flex flex-col items-center">
                      <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Dari Ayat</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            playPop();
                            setSimpleDariAyat(prev => Math.max(1, (Number(prev) || 1) - 1));
                          }}
                          className="w-8 h-8 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-700 select-none cursor-pointer text-base shadow-3xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-black text-slate-800 w-6 text-center">
                          {simpleDariAyat}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            playPop();
                            const val = Math.min(selectedItem.segments.length, (Number(simpleDariAyat) || 1) + 1);
                            setSimpleDariAyat(val);
                            if (simpleSampaiAyat !== "" && val > Number(simpleSampaiAyat)) {
                              setSimpleSampaiAyat(val);
                            }
                          }}
                          className="w-8 h-8 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-700 select-none cursor-pointer text-base shadow-3xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Sampai Ayat Counter */}
                    <div className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-2xl flex flex-col items-center">
                      <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Sampai Ayat</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            playPop();
                            setSimpleSampaiAyat(prev => Math.max(Number(simpleDariAyat) || 1, (Number(prev) || 1) - 1));
                          }}
                          className="w-8 h-8 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-700 select-none cursor-pointer text-base shadow-3xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-black text-slate-800 w-6 text-center">
                          {simpleSampaiAyat}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            playPop();
                            setSimpleSampaiAyat(prev => Math.min(selectedItem.segments.length, (Number(prev) || 1) + 1));
                          }}
                          className="w-8 h-8 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-700 select-none cursor-pointer text-base shadow-3xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Summary of target setup */}
                  <div className="p-4 bg-emerald-50/30 border border-dashed border-emerald-200 rounded-2xl text-center mt-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Belajar</p>
                    <p className="text-sm font-black text-emerald-600 tracking-tight">
                      {selectedItem.name}
                    </p>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">
                      Ayat {simpleDariAyat} — {simpleSampaiAyat}
                      {selectedItem.verses && (
                        <span className="text-slate-400"> (dari {selectedItem.verses})</span>
                      )}
                    </p>
                  </div>

                  {/* Submit Action */}
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleConfirmSimpleTask}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl border-none shadow-sm transition-all cursor-pointer active:scale-95 duration-150"
                    >
                      Mulai Target Ziyadah Sekarang! 🚀
                    </button>
                  </div>
                </div>
              )}

              {/* TAB CONTENT B: MICRO-SLICING GANG */}
              {methodTab === "slicing" && (
                <div className="space-y-3">
                  <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/50 text-left mb-3">
                    <p className="text-slate-500 text-[10px] leading-relaxed font-semibold">
                      Pilhlah potongan-potongan kecil di bawah ini untuk dimasukkan ke antrean sesi tak terbatas. Si kecil dapat melatih potongan ini satu demi satu secara serial.
                    </p>
                  </div>

                  {/* Arabic Slices Checklists */}
                  <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                    {selectedItem.segments.map((seg, idx) => {
                      const isChecked = !!checkedSegments[`seg_${idx}`];
                      return (
                        <div
                          key={`seg-${idx}`}
                          onClick={() => {
                            playPop();
                            setCheckedSegments(prev => ({
                              ...prev,
                              [`seg_${idx}`]: !prev[`seg_${idx}`]
                            }));
                          }}
                          className={`p-4 rounded-xl border text-right transition-all cursor-pointer flex items-center gap-3 ${
                            isChecked 
                              ? "bg-emerald-50/20 border-emerald-300"
                              : "bg-white border-slate-100 opacity-60"
                          }`}
                        >
                          {/* Custom checklist bubble handle */}
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                            isChecked
                              ? "bg-emerald-500 border-white/10 text-white"
                              : "border-slate-200 bg-white"
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>

                          {/* Number Index Label */}
                          <span className="text-[10px] text-slate-400 font-black tracking-wider leading-none shrink-0 select-none bg-slate-50 border border-slate-100 w-5 h-5 rounded-md flex items-center justify-center">
                            {idx + 1}
                          </span>

                          {/* Pure Beautiful and Traditional Arabic text slice */}
                          <div className="flex-1 text-right">
                            <span className="text-xl md:text-2xl font-arabic text-slate-800 leading-[1.8] font-normal direction-rtl select-none">
                              {seg}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Trigger button */}
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleConfirmSlicing}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl border-none shadow-sm transition-all cursor-pointer active:scale-95 duration-150"
                    >
                      Masukkan Potongan ke Antrean 📥
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>

      </div>

    </div>
  );
}
