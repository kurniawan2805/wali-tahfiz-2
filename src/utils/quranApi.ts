export function stripBismillah(text: string, surahNumber: number, ayahNumber: number): string {
  // Hanya potong jika itu adalah Surat selain Al-Fatihah (1) DAN merupakan Ayat 1
  if (surahNumber === 1 || ayahNumber !== 1) {
    return text;
  }

  const cleaned = text.trim();

  // 1. Universal Regex Bismillah check that covers any font, diacritic variations, superscript, tatweel and lam shadda
  const bismillahRegex = /^ب[\u064B-\u065F\u0670\u0640]*س[\u064B-\u065F\u0670\u0640]*م[\u064B-\u065F\u0670\u0640]*\s+[ٱا][\u064B-\u065F\u0670\u0640]*ل[\u064B-\u065F\u0670\u0640]*ل[\u064B-\u065F\u0670\u0640]*ه[\u064B-\u065F\u0670\u0640]*\s+[ٱا][\u064B-\u065F\u0670\u0640]*ل[\u064B-\u065F\u0670\u0640]*ر[\u064B-\u065F\u0670\u0640]*ح[\u064B-\u065F\u0670\u0640]*م[\u064B-\u065F\u0670\u0640]*[\u0670أا]?[\u064B-\u065F\u0670\u0640]*ن[\u064B-\u065F\u0670\u0640]*\s+[ٱا][\u064B-\u065F\u0670\u0640]*ل[\u064B-\u065F\u0670\u0640]*ر[\u064B-\u065F\u0670\u0640]*ح[\u064B-\u065F\u0670\u0640]*[يیى][\u064B-\u065F\u0670\u0640]*م[\u064B-\u065F\u0670\u0640]*/;
  if (bismillahRegex.test(cleaned)) {
    return cleaned.replace(bismillahRegex, "").trim();
  }

  // 2. Word-based approach with heavy normalization
  const words = cleaned.split(/\s+/);
  if (words.length >= 4) {
    const normalize = (w: string) => {
      return w
        .replace(/[\u064B-\u065F\u0670\u0656\u0610-\u061A\u0640]/g, "") // remove all harakat & symbols
        .replace(/ٱ/g, "ا")                   // normalize aleph wasla to standard aleph
        .replace(/ى/g, "ي")                   // normalize aleph maqsurah to ya
        .trim();
    };

    // Bismillah always ends with a word that normalizes to "الرحيم" as the 4th word (index 3)
    for (let i = 0; i < Math.min(words.length, 5); i++) {
      const norm = normalize(words[i]);
      if (norm === "الرحيم" || norm === "الرحيمِ" || norm === "الرحيْم" || norm.endsWith("رحim") || norm.endsWith("رحيم") || norm.endsWith("رحيمِ")) {
        return words.slice(i + 1).join(" ").trim();
      }
    }
  }

  // 3. Simple fallback checks from user's recommendation
  const bismillahText = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
  if (cleaned.startsWith(bismillahText)) {
    return cleaned.replace(bismillahText, "").trim();
  }
  const bismillahVariants = [
    "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ",
    "بِسْمِ ٱللَّهِ ٱلرَّحْمَنِ ٱلرَّحِيمِ",
    "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ"
  ];
  for (const variant of bismillahVariants) {
    if (cleaned.startsWith(variant)) {
      return cleaned.slice(variant.length).trim();
    }
    if (cleaned.includes(variant)) {
      return cleaned.replace(variant, "").trim();
    }
  }

  return cleaned;
}

const LOCAL_SURAHS: Record<number, { numberInSurah: number; text: string }[]> = {
  1: [
    { numberInSurah: 1, text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
    { numberInSurah: 2, text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ" },
    { numberInSurah: 3, text: "الرَّحْمَٰنِ الرَّحِيمِ" },
    { numberInSurah: 4, text: "مَالِكِ يَوْمِ الدِّينِ" },
    { numberInSurah: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" },
    { numberInSurah: 6, text: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ" },
    { numberInSurah: 7, text: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ" }
  ],
  103: [
    { numberInSurah: 1, text: "وَالْعَصْرِ" },
    { numberInSurah: 2, text: "إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ" },
    { numberInSurah: 3, text: "إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ" }
  ],
  108: [
    { numberInSurah: 1, text: "إِنَّا أَعْطَيْنَاهُ الْكَوْثَرَ" },
    { numberInSurah: 2, text: "فَصَلِّ لِرَبِّكَ وَانْحَرْ" },
    { numberInSurah: 3, text: "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ" }
  ],
  112: [
    { numberInSurah: 1, text: "قُلْ هُوَ اللَّهُ أَحَدٌ" },
    { numberInSurah: 2, text: "اللَّهُ الصَّمَدُ" },
    { numberInSurah: 3, text: "لَمْ يَلِدْ وَلَمْ يُولَدْ" },
    { numberInSurah: 4, text: "وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ" }
  ],
  113: [
    { numberInSurah: 1, text: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ" },
    { numberInSurah: 2, text: "مِنْ شَرِّ مَا خَلَقَ" },
    { numberInSurah: 3, text: "وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ" },
    { numberInSurah: 4, text: "وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ" },
    { numberInSurah: 5, text: "وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ" }
  ],
  114: [
    { numberInSurah: 1, text: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ" },
    { numberInSurah: 2, text: "مَلِكِ النَّاسِ" },
    { numberInSurah: 3, text: "إِلَٰهِ النَّاسِ" },
    { numberInSurah: 4, text: "مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ" },
    { numberInSurah: 5, text: "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ" },
    { numberInSurah: 6, text: "مِنَ الْجِنَّةِ وَالنَّاسِ" }
  ]
};

export async function fetchAyahText(surah: number, ayah: number): Promise<string> {
  // Check local copy first
  if (LOCAL_SURAHS[surah]) {
    const matched = LOCAL_SURAHS[surah].find((v) => v.numberInSurah === ayah);
    if (matched) return matched.text;
  }

  try {
    const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
    let text = json.data?.text || "";
    if (ayah === 1) {
      text = stripBismillah(text, surah, ayah);
    }
    return text;
  } catch (err) {
    console.error(`Error fetching ayah ${surah}:${ayah}`, err);
    return `Ayat ${ayah}`;
  }
}

export async function fetchSurahText(surah: number): Promise<any[]> {
  // Check local copy first
  if (LOCAL_SURAHS[surah]) {
    return LOCAL_SURAHS[surah];
  }

  try {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${surah}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
    const Rawverses = json.data?.ayahs || json.data?.verses || [];
    return Rawverses.map((v: any) => {
      let text = v.text || "";
      if (v.numberInSurah === 1) {
        text = stripBismillah(text, surah, v.numberInSurah);
      }
      return {
        ...v,
        text
      };
    });
  } catch (err) {
    console.error(`Error fetching surah ${surah}`, err);
    return [];
  }
}
