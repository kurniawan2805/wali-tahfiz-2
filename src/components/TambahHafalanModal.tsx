import React, { useState, useEffect, useRef } from "react";
import { X, Search, BookOpen, Sparkles, Check } from "lucide-react";
import { quranMetaData } from "../data/quranMeta";

interface SurahObj {
  id: number;
  arabic: string;
  translation: string;
  transliteration: string;
  verses: number;
  revelation: number;
  icon: string;
  alternateNames?: string[];
}

interface TambahHafalanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (surahName: string, verseRange: string) => void;
}

export default function TambahHafalanModal({
  isOpen,
  onClose,
  onSubmit,
}: TambahHafalanModalProps) {
  const [surahQuery, setSurahQuery] = useState("");
  const [selectedSurah, setSelectedSurah] = useState<SurahObj | null>(null);
  const [dariAyat, setDariAyat] = useState<number | "">(1);
  const [sampaiAyat, setSampaiAyat] = useState<number | "">(5);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cast metadata and filter placeholder
  const metadataList = (quranMetaData as any[]).filter(
    (s) => s && s.id !== 0 && s.id !== undefined
  ) as SurahObj[];

  // Focus input automatically on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Dynamic filter
  const filteredSurahs = metadataList.filter((surah) => {
    // If input contains a colon, we query by the part before the colon
    const queryBase = surahQuery.includes(":") ? surahQuery.split(":")[0] : surahQuery;
    const query = queryBase.trim().toLowerCase();
    if (!query) return true;

    if (/^\d+$/.test(query)) {
      return surah.id.toString() === query;
    }

    const transMatch = surah.transliteration?.toLowerCase().includes(query);
    const altMatch = surah.alternateNames?.some((name) =>
      name.toLowerCase().includes(query)
    );
    const translationMatch = surah.translation?.toLowerCase().includes(query);
    const arabicMatch = surah.arabic?.includes(query);

    return transMatch || altMatch || translationMatch || arabicMatch;
  });

  // Handle onChange with quick smart parsing (e.g. 2:1-3)
  const handleQueryChange = (val: string) => {
    setSurahQuery(val);
    setShowDropdown(true);

    if (val.includes(":")) {
      const [surahPart, versesPart] = val.split(":");
      const trimmedSurahPart = surahPart.trim().toLowerCase();

      // Find mathing surah in list
      const matched = metadataList.find((surah) => {
        if (/^\d+$/.test(trimmedSurahPart)) {
          return surah.id.toString() === trimmedSurahPart;
        }
        return (
          surah.transliteration?.toLowerCase().includes(trimmedSurahPart) ||
          surah.alternateNames?.some((name) => name.toLowerCase().includes(trimmedSurahPart))
        );
      });

      if (matched) {
        setSelectedSurah(matched);

        if (versesPart) {
          const trimmedVerses = versesPart.trim();
          // Match digits or digits-digits range
          const rangeMatch = trimmedVerses.match(/^(\d+)(?:-(\d+))?$/);
          if (rangeMatch) {
            const fromVal = parseInt(rangeMatch[1], 10);
            const toVal = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fromVal;

            const maxV = matched.verses;
            setDariAyat(Math.min(Math.max(1, fromVal), maxV));
            setSampaiAyat(Math.min(Math.max(1, toVal), maxV));
          }
        }
      }
    }
  };

  // Handle keyboard Shortcuts for instant selection and form submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Intercept form trigger to check search autocomplete

      if (!selectedSurah && filteredSurahs.length > 0) {
        // Auto-select first matching result
        const firstMatch = filteredSurahs[0];
        setSelectedSurah(firstMatch);
        
        // If query has no colon, clear text to default; otherwise keep it
        if (!surahQuery.includes(":")) {
          setSurahQuery("");
        }
        setShowDropdown(false);
      } else if (selectedSurah) {
        // Submit if surah already identified
        const from = dariAyat === "" ? 1 : dariAyat;
        const to = sampaiAyat === "" ? selectedSurah.verses : sampaiAyat;

        const finalFrom = Math.min(from, to);
        const finalTo = Math.max(from, to);

        const verseRange = finalFrom === finalTo ? `Ayat ${finalFrom}` : `Ayat ${finalFrom}-${finalTo}`;
        onSubmit(selectedSurah.transliteration, verseRange);

        // Reset state
        setSurahQuery("");
        setSelectedSurah(null);
        setDariAyat(1);
        setSampaiAyat(5);
        onClose();
      }
    }
  };

  // Automatically reset or cap ayat numbers if the surah switches to a shorter one
  useEffect(() => {
    if (selectedSurah) {
      const maxVerses = selectedSurah.verses;
      if (dariAyat !== "" && Number(dariAyat) > maxVerses) {
        setDariAyat(1);
      }
      if (sampaiAyat !== "" && Number(sampaiAyat) > maxVerses) {
        setSampaiAyat(maxVerses);
      }
    }
  }, [selectedSurah]);

  // Sanitize values on change
  const handleDariChange = (val: string) => {
    if (val === "") {
      setDariAyat("");
      return;
    }
    const num = Math.max(1, parseInt(val, 10));
    const limit = selectedSurah ? selectedSurah.verses : 286;
    setDariAyat(Math.min(num, limit));
  };

  const handleSampaiChange = (val: string) => {
    if (val === "") {
      setSampaiAyat("");
      return;
    }
    const num = Math.max(1, parseInt(val, 10));
    const limit = selectedSurah ? selectedSurah.verses : 286;
    setSampaiAyat(Math.min(num, limit));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurah) return;

    const from = dariAyat === "" ? 1 : dariAyat;
    const to = sampaiAyat === "" ? selectedSurah.verses : sampaiAyat;

    // Validate range values
    const finalFrom = Math.min(from, to);
    const finalTo = Math.max(from, to);

    const verseRange = finalFrom === finalTo ? `Ayat ${finalFrom}` : `Ayat ${finalFrom}-${finalTo}`;
    onSubmit(selectedSurah.transliteration, verseRange);
    
    // Reset state
    setSurahQuery("");
    setSelectedSurah(null);
    setDariAyat(1);
    setSampaiAyat(5);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3A405A]/40 backdrop-blur-xs">
      <div 
        className="w-full max-w-md bg-[#FDFBF7] rounded-[32px] border-2 border-[#EBE6D9] shadow-xl overflow-hidden animate-scale-up-gentle relative"
        style={{ animationDuration: "250ms" }}
      >
        {/* Header decoration */}
        <div className="bg-white px-6 py-5 border-b-2 border-[#EBE6D9] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-[#48C78E]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#3A405A] leading-none">
                Tambah Tugas Hafalan
              </h3>
              <p className="text-[10px] font-extrabold text-[#A39E93] uppercase tracking-wider mt-1 leading-none">
                Murojaah Terencana 🌟
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-neutral-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Smart Surah Query Selection */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-black text-[#3A405A] uppercase tracking-wider flex items-center justify-between">
              <span>Surat Pilihan</span>
              <span className="text-[9px] text-[#A39E93] normal-case font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                Format Cepat: Ketik <span className="font-mono font-black">2:1-3</span> atau <span className="font-mono font-black">Ikhlas:1-4</span>
              </span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder={selectedSurah ? `${selectedSurah.id}. ${selectedSurah.transliteration}` : "Cari nama atau nomor surat..."}
                value={surahQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border-2 border-[#EBE6D9] rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-[#3A405A] outline-none focus:border-[#48C78E] placeholder:text-[#A39E93] transition-colors"
                required={!selectedSurah}
              />
              <Search className="w-4 h-4 text-[#A39E93] absolute left-3.5 top-1/2 -translate-y-1/2" />
              {selectedSurah && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-emerald-50 text-[#48C78E] text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-100/50">
                  <Check className="w-3 h-3" /> Pilihan
                </div>
              )}
            </div>

            {/* Float Dropdown search portal */}
            {showDropdown && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border-2 border-[#EBE6D9] shadow-lg max-h-56 overflow-y-auto z-50">
                {filteredSurahs.length === 0 ? (
                  <div className="p-4 text-center text-xs text-neutral-400 font-bold">
                    Surat tidak ditemukan 🔍
                  </div>
                ) : (
                  filteredSurahs.map((surah) => (
                    <button
                      key={surah.id}
                      type="button"
                      onClick={() => {
                        setSelectedSurah(surah);
                        setSurahQuery("");
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-[#FDFBF7] transition-colors border-b last:border-0 border-neutral-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-[#F5F3EC] flex items-center justify-center text-[10px] font-black text-slate-500">
                          {surah.id}
                        </span>
                        <div>
                          <p className="text-xs font-black text-[#3A405A]">
                            {surah.transliteration}
                          </p>
                          <p className="text-[10px] font-bold text-neutral-400 mt-0.5">
                            {surah.translation} • {surah.verses} Ayat
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-bold font-arabic text-slate-600">
                        {surah.arabic}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Active selected preview */}
          {selectedSurah && (
            <div className="bg-white p-4.5 rounded-2xl border border-yellow-100 flex items-center justify-between animate-scale-up-gentle" style={{ animationDuration: "150ms" }}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">📖</span>
                <div>
                  <h4 className="text-xs font-black text-[#3A405A]">
                    Selesai Pilih Surat {selectedSurah.transliteration}
                  </h4>
                  <p className="text-[10px] font-extrabold text-[#48C78E] uppercase tracking-wide mt-0.5">
                    Kapasitas Surat: {selectedSurah.verses} Ayat
                  </p>
                </div>
              </div>
              <span className="text-2xl font-black font-arabic text-slate-700">
                {selectedSurah.arabic}
              </span>
            </div>
          )}

          {/* Range Selection with strict validation bounds */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-[#3A405A] uppercase tracking-wider">
                Dari Ayat
              </label>
              <input
                type="number"
                min={1}
                max={selectedSurah ? selectedSurah.verses : 286}
                value={dariAyat}
                onChange={(e) => handleDariChange(e.target.value)}
                className="w-full bg-white border-2 border-[#EBE6D9] rounded-2xl px-4 py-3 text-sm font-bold text-[#3A405A] outline-none focus:border-[#48C78E] transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-[#3A405A] uppercase tracking-wider">
                Sampai Ayat
              </label>
              <input
                type="number"
                min={1}
                max={selectedSurah ? selectedSurah.verses : 286}
                value={sampaiAyat}
                onChange={(e) => handleSampaiChange(e.target.value)}
                className="w-full bg-white border-2 border-[#EBE6D9] rounded-2xl px-4 py-3 text-sm font-bold text-[#3A405A] outline-none focus:border-[#48C78E] transition-colors"
                required
              />
            </div>
          </div>

          {/* Footer controls */}
          <div className="border-t border-[#EBE6D9]/50 pt-5 mt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-black text-neutral-400 px-5 py-3 rounded-full hover:bg-neutral-50 transition-colors uppercase tracking-wider cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!selectedSurah}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider border-b-3 shadow-md active:scale-95 active:border-b-0 active:translate-y-0.5 transition-all text-white cursor-pointer ${
                selectedSurah
                  ? "bg-[#48C78E] hover:bg-[#3ebe82] border-[#329e6f]"
                  : "bg-slate-300 border-slate-400/50 cursor-not-allowed"
              }`}
            >
              Simpan Tugas ✨
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
