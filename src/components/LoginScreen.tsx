import React, { useState } from "react";
import { BookOpen, AlertCircle, ArrowRight, Leaf } from "lucide-react";

interface LoginScreenProps {
  onLogin: () => Promise<void>;
  onGuestMode: () => void;
}

export default function LoginScreen({ onLogin, onGuestMode }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await onLogin();
    } catch (err: any) {
      console.error("Login component error:", err);
      setErrorMsg(err.message || "Gagal masuk menggunakan Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#FDFBF7] flex justify-center items-center font-sans selection:bg-[#48C78E]/20">
      <div className="w-full max-w-md h-svh flex flex-col justify-between p-6 bg-[#FDFBF7]">
        {/* Elegant Brand Header Section */}
        <div className="flex-1 flex flex-col justify-center gap-8 py-4">
          <div className="text-center flex flex-col items-center">
            {/* Logo Stack */}
            <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-[32px] bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-500 ease-out hover:scale-105 mb-4 group">
              {/* Soft ambient green glow under */}
              <div className="absolute inset-0 bg-emerald-500/10 rounded-[32px] blur-xl opacity-80 group-hover:opacity-100 transition-opacity"></div>
              
              {/* Inner glowing container for icon */}
              <div className="relative w-18 h-18 rounded-[24px] bg-emerald-50/60 border border-emerald-100/50 flex items-center justify-center">
                {/* Delicate floating gold crown emoji */}
                <span className="absolute -top-4 -right-1.5 text-2xl animate-bounce" style={{ animationDuration: '4s' }}>👑</span>
                
                {/* Book & Leaf Motif */}
                <div className="relative">
                  <BookOpen className="w-9.5 h-9.5 text-emerald-600 transition-transform duration-300 group-hover:scale-110" />
                  <Leaf className="w-4.5 h-4.5 text-emerald-500 absolute -bottom-1 -right-1 rotate-12 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Typography */}
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Wali Tahfiz</h1>
            <p className="text-xs text-slate-400 font-bold tracking-wide uppercase mt-1">
              SISTEM PENDAMPING HAFALAN AL-QURAN ANAK
            </p>
          </div>

          {/* Refactored Authentic Action Card */}
          <div className="bg-white rounded-[36px] border border-slate-100/80 p-7 shadow-sm w-full flex flex-col gap-6">
            <div className="text-center">
              <h2 className="text-base font-black text-slate-800 tracking-tight">Pilih Metode Masuk</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2 text-center">
                Hubungkan akun untuk mengaktifkan pemantauan kurikulum, sinkronisasi data real-time, dan pelacakan progress tahsin harian anak Anda.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Google Login Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white border border-slate-200/80 hover:border-slate-300 text-slate-700 font-bold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 active:scale-[0.99] transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4.5 h-4.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-1.14 2.77-2.4 3.63v3.01h3.84c2.25-2.07 3.69-5.12 3.69-8.77z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.84-3.01c-1.07.72-2.45 1.16-4.11 1.16-3.17 0-5.85-2.14-6.81-5.02H1.24v3.11C3.22 21.2 7.32 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.19 14.22a7.18 7.18 0 0 1 0-4.44V6.67H1.24a11.93 11.93 0 0 0 0 10.66l3.95-3.11z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.32 0 3.22 2.8 1.24 6.67l3.95 3.11c.96-2.88 3.64-5.03 6.81-5.03z"
                    />
                  </svg>
                )}
                <span>{loading ? "Menyinkronkan Sesi..." : "Masuk dengan Google"}</span>
              </button>

              {/* Guest Mode Button */}
              <button
                type="button"
                onClick={onGuestMode}
                disabled={loading}
                className="w-full bg-slate-50 hover:bg-slate-100/80 text-slate-500 font-black text-[11px] uppercase tracking-wider py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>Mulai Offline (Mode Tamu)</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Dynamic warning if error occurred (especially inside Iframes) */}
            {errorMsg && (
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 text-amber-900 text-[10.5px] leading-relaxed text-left transition-all duration-300">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span className="uppercase tracking-wider text-[9px]">Pemberitahuan Otentikasi</span>
                </div>
                <p className="font-medium text-slate-600">
                  IFrame AI Studio membatasi Google Auth. Silahkan gunakan <strong>Mode Tamu (Mulai Offline)</strong>, atau jalankan aplikasi di <strong>Tab Baru</strong> (klik tombol panah di pojok kanan atas preview).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Humanized Trust Anchor Footer */}
        <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400/90 pb-4 select-none">
          <i className="fa-solid fa-shield-halved text-emerald-500/80 text-xs"></i>
          <span>Data Hafalan Keluarga Tersimpan Aman secara Real-time</span>
        </div>
      </div>
    </div>
  );
}
