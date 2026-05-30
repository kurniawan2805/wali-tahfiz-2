import { useState, useEffect, useRef, useCallback } from "react";

// The exact surahVerseCounts array aligned with Quran metadata
const surahAyahCounts = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
  5, 4, 5, 6
];

function getEveryAyahId(surah: number, ayah: number): string {
  const s = surah.toString().padStart(3, '0');
  const a = ayah.toString().padStart(3, '0');
  return `${s}${a}`;
}

// Helper to calculate the global ayah index
function getGlobalAyahNumber(surah: number, ayah: number): number {
  let total = 0;
  for (let i = 0; i < surah - 1; i++) {
    total += surahAyahCounts[i] || 0;
  }
  return total + ayah;
}

export interface QariMetadata {
  apiId: string;
  displayName: string;
  description: string;
  bitrate?: number;
  cdn?: "islamic.network" | "everyayah";
}

export const WALI_TAFHIDZ_QARI_REGISTRY: Record<string, QariMetadata> = {
  'ar.tunaiji': {
    apiId: 'ar.hudhaify-2',
    displayName: 'Syaikh Ali Al-Hudhaify',
    description: 'Artikulasi sangat lambat & jelas, rekomendasi utama untuk balita.',
    bitrate: 128
  },
  'ar.husarymuallim': {
    apiId: 'Husary_Muallim_128kbps',
    displayName: 'Syaikh Al-Husary (Muallim)',
    description: 'Tempo ketat, versi Guru (Muallim) dengan jeda repetisi.',
    bitrate: 128,
    cdn: 'everyayah'
  },
  'ar.minshawimuallim': {
    apiId: 'ar.minshawi-2',
    displayName: 'Syaikh Al-Minshawi',
    description: 'Lantunan tartil emosional, membantu anak agar tidak jenuh.',
    bitrate: 128
  },
  'ar.aymanswayd': {
    apiId: 'Ayman_Sowaid_64kbps',
    displayName: 'Syaikh Ayman Sowaid',
    description: 'Kiblat visual-artikulasi tajwid modern, sangat presisi.',
    bitrate: 64,
    cdn: 'everyayah'
  },
  'ar.muhammadayyoub': {
    apiId: 'ar.muhammadayyoub-2',
    displayName: 'Syaikh Muhammad Ayyoub',
    description: 'Alunan nada sangat tenang, cocok untuk sesi Gema Kebun malam hari.',
    bitrate: 128
  },
  'ar.ibrahimakhdar': {
    apiId: 'Ibrahim_Akhdar_32kbps',
    displayName: 'Syaikh Ibrahim Al-Akhdar',
    description: 'Bacaan stabil dan tenang, bitrate rendah hemat kuota.',
    bitrate: 32,
    cdn: 'everyayah'
  },
  'ar.hudhaify_32': {
    apiId: 'Hudhaify_32kbps',
    displayName: 'Syaikh Al-Hudhaify (32kbps)',
    description: 'Artikulasi jelas, sangat ringan untuk luring.',
    bitrate: 32,
    cdn: 'everyayah'
  },
  'ar.alafasy': {
    apiId: 'ar.alafasy',
    displayName: 'Syaikh Mishary Rashid Alafasy',
    description: 'Alunan merdu kontemporer yang sangat jernih dan tajwid yang padat.',
    bitrate: 128
  },
  'ar.minshawikids': {
    apiId: 'ar.minshawi',
    displayName: 'Al-Minshawi (dengan Anak-anak)',
    description: 'Versi murottal guru dengan pengulangan anak-anak.',
    bitrate: 128
  },
  'ar.husary': {
    apiId: 'Husary_64kbps',
    displayName: 'Syaikh Al-Husary (Classic)',
    description: 'Versi klasik Syaikh Mahmoud Khalil Al-Husary.',
    bitrate: 64,
    cdn: 'everyayah'
  },
  'ar.minshawi': {
    apiId: 'Minshawy_Murattal_128kbps',
    displayName: 'Syaikh Al-Minshawi (Classic)',
    description: 'Lantunan emosional Syaikh Muhammad Siddiq Al-Minshawi.',
    bitrate: 128,
    cdn: 'everyayah'
  },
  'ar.abdurrahmaansudais': {
    apiId: 'ar.abdurrahmaansudais',
    displayName: 'Syaikh Abdurrahman As-Sudais',
    description: 'Suara khas Imam Masjidil Haram yang bersemangat.',
    bitrate: 128
  }
};

export function resolveQariAudioId(uiValue: string): string {
  if (!uiValue) return "ar.alafasy";
  const matched = WALI_TAFHIDZ_QARI_REGISTRY[uiValue];
  return matched ? matched.apiId : uiValue;
}

export function getQariUiMetadata(uiValue: string): QariMetadata {
  if (!uiValue) {
    return {
      apiId: "ar.alafasy",
      displayName: "Syaikh Mishary Rashid Alafasy",
      description: "Alunan merdu kontemporer yang sangat jernih and tajwid yang padat."
    };
  }
  const matched = WALI_TAFHIDZ_QARI_REGISTRY[uiValue];
  if (matched) return matched;
  return {
    apiId: uiValue,
    displayName: uiValue,
    description: "Pemutar murottal ayat interaktif."
  };
}

interface UseAyahPlayerProps {
  surah: number;
  ayah: number;
  qari?: string;
  maxLoops?: number;
  onAyahComplete?: () => void;
}

export function useAyahPlayer({
  surah,
  ayah,
  qari,
  maxLoops = 5,
  onAyahComplete,
}: UseAyahPlayerProps) {
  const rawQari = qari || (typeof window !== "undefined" ? localStorage.getItem("wali_tahfidz_global_qari") || "ar.alafasy" : "ar.alafasy");
  const resolvedQari = resolveQariAudioId(rawQari);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentLoop, setCurrentLoop] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Save callback refs to prevent closure issues with state updates
  const onAyahCompleteRef = useRef(onAyahComplete);
  onAyahCompleteRef.current = onAyahComplete;

  const currentLoopRef = useRef(currentLoop);
  currentLoopRef.current = currentLoop;

  const maxLoopsRef = useRef(maxLoops);
  maxLoopsRef.current = maxLoops;

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Sync URL setup
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const globalAyah = getGlobalAyahNumber(surah, ayah);
    const qariMeta = WALI_TAFHIDZ_QARI_REGISTRY[rawQari];
    const bitrate = qariMeta?.bitrate || 128;
    
    let audioUrl = "";
    if (qariMeta?.cdn === "everyayah") {
      const eaId = getEveryAyahId(surah, ayah);
      audioUrl = `https://everyayah.com/data/${qariMeta.apiId}/${eaId}.mp3`;
    } else {
      audioUrl = `https://cdn.islamic.network/quran/audio/${bitrate}/${resolvedQari}/${globalAyah}.mp3`;
    }
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Reset loop counter and times when credentials change
    setCurrentLoop(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(audio.duration || 0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("loadedmetadata", handleDurationChange);

    // Set upended audio listener
    audio.onended = () => {
      const nextLoopCount = currentLoopRef.current + 1;
      
      if (nextLoopCount < maxLoopsRef.current) {
        setCurrentLoop(nextLoopCount);
        audio.currentTime = 0;
        audio.play().catch((err) => {
          console.warn("Audio repetition error play attempt failed:", err);
          setIsPlaying(false);
        });
      } else {
        // Complete loops max limit reached
        setIsPlaying(false);
        setCurrentLoop(maxLoopsRef.current);
        if (onAyahCompleteRef.current) {
          onAyahCompleteRef.current();
        }
      }
    };

    // Clean up event on destroy
    return () => {
      audio.pause();
      audio.onended = null;
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("loadedmetadata", handleDurationChange);
    };
  }, [surah, ayah, resolvedQari]);

  const play = useCallback(() => {
    if (!audioRef.current) return;
    
    // If we already finished, restart at loop counter 0
    if (currentLoopRef.current >= maxLoopsRef.current) {
      setCurrentLoop(0);
    }

    setIsPlaying(true);
    audioRef.current.play().catch((err) => {
      console.warn("Audio Context play error:", err);
      setIsPlaying(false);
    });
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setCurrentLoop(0);
    setIsPlaying(false);
  }, []);

  const fadeAndStop = useCallback(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    let vol = audio.volume;
    const interval = setInterval(() => {
      vol = Math.max(0, vol - 0.1);
      audio.volume = vol;
      if (vol <= 0) {
        clearInterval(interval);
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1; // restore for next play
        setIsPlaying(false);
        setCurrentLoop(0);
      }
    }, 100);
  }, []);

  return {
    isPlaying,
    currentLoop,
    currentTime,
    duration,
    play,
    pause,
    stop,
    fadeOut: fadeAndStop,
  };
}
