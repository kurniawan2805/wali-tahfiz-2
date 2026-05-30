import React from "react";
import { ArrowLeft, BookOpen, Sparkles, User } from "lucide-react";

interface HeaderSesiMurojaahProps {
  /** Nama anak yang sedang melakukan sesi */
  namaAnak: string;
  /** URL gambar avatar atau emoji karakter anak (misal: "👶", "🐱", "/avatars/said.png") */
  avatarUrl?: string;
  /** Jenis sesi saat ini (misal: "Murojaah Qarib", "Murojaah Sabiq", "Talaqqi") */
  jenisSesi: string;
  /** Nama surah dan rentang ayat yang sedang dipelajari (misal: "Al-A'laa Ayat 17-19") */
  namaSurah: string;
  /** Sub-teks instruksi interaktif yang fleksibel */
  instruksi?: string;
  /** Event handler ketika tombol kembali ditekan */
  onBack?: () => void;
}

export const HeaderSesiMurojaah: React.FC<HeaderSesiMurojaahProps> = ({
  namaAnak,
  avatarUrl = "👶",
  jenisSesi,
  namaSurah,
  instruksi = "Bimbing anak untuk mengulang hafalan dengan tenang & ceria ya, Bun! 🌸",
  onBack,
}) => {
  // Cek apakah avatar berupa karakter emoji biasa atau path gambar
  const isEmoji = avatarUrl.length <= 2;

  return (
    <div className="w-full flex flex-col gap-3 select-none">
      {/* Top Bar Navigasi & Profil Anak */}
      <div className="flex items-center gap-2.5">
        {onBack && (
          <button
            id="btn-back-murojaah"
            onClick={onBack}
            className="w-10 h-10 shrink-0 rounded-2xl bg-white border-2 border-[#EBE6D9] flex items-center justify-center shadow-xs hover:bg-[#F9F8F6] active:scale-95 transition-all text-[#3A405A] cursor-pointer"
            aria-label="Kembali ke Dashboard"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5px]" />
          </button>
        )}

        {/* Profil Anak & Status Sesi */}
        <div className="flex-1 bg-white pl-2 pr-4 py-1.5 rounded-2xl shadow-xs border-2 border-[#EBE6D9] flex items-center gap-3">
          {/* Avatar Dinamis */}
          <div className="w-9 h-9 shrink-0 rounded-full bg-amber-100 flex items-center justify-center text-lg shadow-inner border border-white overflow-hidden">
            {isEmoji ? (
              <span>{avatarUrl}</span>
            ) : (
              <img
                src={avatarUrl}
                alt={namaAnak}
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback ke icon user jika load image gagal
                  e.currentTarget.style.display = "none";
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const span = document.createElement("span");
                    span.innerText = "👶";
                    parent.appendChild(span);
                  }
                }}
              />
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <span className="font-black text-xs text-[#3A405A] tracking-tight uppercase truncate leading-none">
              Sesi {namaAnak} 🌟
            </span>
            <span className="text-[10px] font-black text-[#8C92AC] mt-1 leading-none uppercase tracking-wide truncate">
              {jenisSesi}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Header Card (Unified visual metadata surah & instruksi orang tua) */}
      <div className="w-full bg-amber-50 rounded-2xl border-2 border-amber-150 p-3.5 shadow-xs relative overflow-hidden">
        {/* Dekorasi Visual Kecil Ramah Anak */}
        <div className="absolute -right-3 -top-3 w-12 h-12 rounded-full bg-amber-100/40 blur-md pointer-events-none" />
        
        <div className="flex items-start gap-3">
          {/* Ikon Buku / Surah */}
          <div className="w-8 h-8 rounded-xl bg-amber-200/60 text-[#8A5E14] flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 stroke-[2.5]" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Judul Surah */}
            <h3 className="text-sm font-black text-[#8A5E14] uppercase tracking-tight leading-none flex items-center gap-1.5">
              <span>{namaSurah}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            </h3>
            
            {/* Sub-teks panduan Orang Tua/Anak */}
            <p className="text-[10.5px] font-extrabold text-[#5C6B73] mt-2 leading-relaxed">
              {instruksi}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
