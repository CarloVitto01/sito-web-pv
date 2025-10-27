// src/components/PwaInstallButton.tsx
import React, { useMemo } from "react";
import { useInstallPromptCtx } from "../pwa/InstallPromptContext";
import styles from "./PwaInstallBanner.module.css";

function isIOS() {
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}
function isStandalone() {
  return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
    || (navigator as any).standalone === true;
}

export default function PwaInstallButton({
  label = "Installa l’app",
  className = ""
}: { label?: string; className?: string }) {
  const { canPrompt, promptOnce } = useInstallPromptCtx();
  const onIOS = useMemo(isIOS, []);
  const installed = useMemo(isStandalone, []);

  const handleClick = async () => {
    if (onIOS) {
      // iOS non ha popup programmabile → fai nulla o mostra un toast
      // alert("Su iPhone: Condividi → Aggiungi a Home");
      return;
    }
    if (installed) return; // già installata
    if (!canPrompt) {
      // opzionale: toast “Installa dal menu del browser”
      // alert("Apri il menu del browser e scegli Installa app");
      return;
    }
    await promptOnce(); // apre il popup nativo (Android/desktop)
  };

  return (
    <button className={[styles.btn, className].join(" ")} onClick={handleClick}>
      {label}
    </button>
  );
}
