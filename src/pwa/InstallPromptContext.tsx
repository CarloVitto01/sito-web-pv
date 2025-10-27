// src/pwa/InstallPromptContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";

type Ctx = {
  canPrompt: boolean;
  promptOnce: () => Promise<boolean>; // true if user accepted
};

const InstallCtx = createContext<Ctx>({ canPrompt: false, promptOnce: async () => false });

export function InstallPromptProvider({ children }: { children: React.ReactNode }) {
  const deferredRef = useRef<any>(null);
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    const onBIP = (e: any) => {
      e.preventDefault();             // prevent mini-infobar
      deferredRef.current = e;        // store the event
      setCanPrompt(true);
    };
    const onInstalled = () => {
      deferredRef.current = null;
      setCanPrompt(false);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptOnce = async () => {
    const ev = deferredRef.current;
    if (!ev) return false;
    ev.prompt();
    const { outcome } = await ev.userChoice;
    deferredRef.current = null;       // Chrome allows one prompt per captured event
    setCanPrompt(false);
    return outcome === "accepted";
  };

  return (
    <InstallCtx.Provider value={{ canPrompt, promptOnce }}>
      {children}
    </InstallCtx.Provider>
  );
}

export const useInstallPromptCtx = () => useContext(InstallCtx);
