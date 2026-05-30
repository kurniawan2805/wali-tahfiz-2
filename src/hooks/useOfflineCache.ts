import { useState, useEffect, useRef, useCallback } from "react";
import { resolveQariAudioId } from "./useAyahPlayer";

export function useOfflineCache() {
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [cachedCount, setCachedCount] = useState<number>(0);
  const [cacheSizeStr, setCacheSizeStr] = useState<string>("0 MB");

  const cancelRef = useRef<boolean>(false);

  const getCachedFilesCount = useCallback(async (): Promise<number> => {
    if (typeof window === "undefined" || !("caches" in window)) return 0;
    try {
      const cache = await window.caches.open("quran-audio-cache");
      const keys = await cache.keys();
      return keys.length;
    } catch (e) {
      console.error("Failed to read cache keys:", e);
      return 0;
    }
  }, []);

  const updateCacheStats = useCallback(async () => {
    const count = await getCachedFilesCount();
    setCachedCount(count);
    
    // Approximate size: ~50KB per audio file.
    if (count > 0) {
      const sizeMB = (count * 0.05).toFixed(1);
      setCacheSizeStr(`${sizeMB} MB`);
    } else {
      setCacheSizeStr("0 MB");
    }
  }, [getCachedFilesCount]);

  useEffect(() => {
    updateCacheStats();
  }, [updateCacheStats]);

  const startDownload = async (qariId: string) => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(1);
    cancelRef.current = false;

    try {
      const cache = await window.caches.open("quran-audio-cache");
      
      // Juz 30 is global index 5673 to 6236
      const startGlobalIndex = 5673;
      const endGlobalIndex = 6236;
      const totalFiles = endGlobalIndex - startGlobalIndex + 1; // 564
      
      const resolved = resolveQariAudioId(qariId);
      
      // Generate standard URL templates
      const urls: string[] = [];
      for (let i = startGlobalIndex; i <= endGlobalIndex; i++) {
        urls.push(`https://cdn.islamic.network/quran/audio/128/${resolved}/${i}.mp3`);
      }

      // Download in batches to avoid browser/network fatigue
      const batchSize = 12;
      let downloaded = 0;

      for (let i = 0; i < urls.length; i += batchSize) {
        if (cancelRef.current) {
          console.log("Download cancelled by user.");
          break;
        }

        const batch = urls.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (url) => {
            try {
              const response = await fetch(url, { mode: "cors" });
              if (response.ok) {
                await cache.put(url, response);
              }
            } catch (err) {
              console.warn(`Cache skip/fail for ayah ${url}:`, err);
            } finally {
              downloaded++;
              const pct = Math.min(100, Math.round((downloaded / totalFiles) * 100));
              setDownloadProgress(pct);
            }
          })
        );
      }
    } catch (err) {
      console.error("Detailed cache storage error:", err);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
      await updateCacheStats();
    }
  };

  const cancelDownload = () => {
    cancelRef.current = true;
    setIsDownloading(false);
    setDownloadProgress(0);
  };

  const clearAudioCache = async () => {
    if (typeof window === "undefined" || !("caches" in window)) return false;
    try {
      const deleted = await window.caches.delete("quran-audio-cache");
      await updateCacheStats();
      return deleted;
    } catch (err) {
      console.error("Error clearing audio cache:", err);
      return false;
    }
  };

  return {
    downloadProgress,
    isDownloading,
    cachedCount,
    cacheSizeStr,
    startDownload,
    cancelDownload,
    clearAudioCache,
    updateCacheStats
  };
}
