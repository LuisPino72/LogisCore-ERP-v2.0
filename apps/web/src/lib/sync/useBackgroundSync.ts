import { useEffect, useState, useCallback } from "react";

interface UseBackgroundSyncOptions {
  onSyncComplete?: (tag: string) => void;
  onSyncError?: (tag: string, error: Error) => void;
}

interface UseBackgroundSyncReturn {
  isSupported: boolean;
  isRegistered: boolean;
  lastSyncResult: { tag: string; timestamp: string } | null;
  requestSync: (tag: string) => Promise<boolean>;
}

export function useBackgroundSync(options: UseBackgroundSyncOptions = {}): UseBackgroundSyncReturn {
  const { onSyncComplete, onSyncError } = options;
  const [isRegistered, setIsRegistered] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ tag: string; timestamp: string } | null>(null);

  const isSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "SyncManager" in window;

  useEffect(() => {
    if (!isSupported) return;

    async function registerServiceWorker() {
      try {
        const existing = await navigator.serviceWorker.getRegistration("/");
        const registration = existing ?? await navigator.serviceWorker.register("/sw.js", {
          scope: "/"
        });

        if ("sync" in registration) {
          setIsRegistered(true);
        }
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    }

    registerServiceWorker();
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) return;

    const stableOnSyncComplete = onSyncComplete;

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "BACKGROUND_SYNC") {
        setLastSyncResult({
          tag: event.data.tag,
          timestamp: event.data.timestamp
        });
        stableOnSyncComplete?.(event.data.tag);
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [isSupported, onSyncComplete]);

  const requestSync = useCallback(async (tag: string): Promise<boolean> => {
    if (!isSupported || !isRegistered) {
      console.warn("Background Sync not supported or not registered");
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if ("sync" in registration) {
        const syncRegistration = registration as unknown as { sync?: { register: (tag: string) => Promise<void> } };
        if (syncRegistration.sync) {
          await syncRegistration.sync.register(`sync-${tag}`);
          console.log(`Background sync registered for: ${tag}`);
          return true;
        }
        return false;
      }
      return false;
    } catch (error) {
      console.error("Failed to register background sync:", error);
      onSyncError?.(tag, error as Error);
      return false;
    }
  }, [isSupported, isRegistered, onSyncError]);

  return {
    isSupported,
    isRegistered,
    lastSyncResult,
    requestSync
  };
}