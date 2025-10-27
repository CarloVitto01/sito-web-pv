// src/hooks/useInstallPrompt.ts
import { useEffect, useState } from "react";



export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: any) => {
      console.log('[PWA] beforeinstallprompt fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const onInstalled = () => console.log('[PWA] appinstalled');
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] userChoice:', outcome);
    setDeferredPrompt(null);
    setIsInstallable(false);
    return outcome === "accepted";
  };

  return { isInstallable, promptInstall };
}
