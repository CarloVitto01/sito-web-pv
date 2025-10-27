import React, { useMemo } from "react";
import { useInstallPrompt } from "./hooks/useInstallPrompt";

function isIOS() {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}
function isInStandaloneMode() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || (window.navigator as any).standalone === true;
}

export default function InstallButton() {
  const { isInstallable, promptInstall } = useInstallPrompt();
  const showIOSGuide = useMemo(() => isIOS() && !isInStandaloneMode(), []);

  // Mostra il bottone solo dove supportato; su iOS mostriamo la guida
  if (!isInstallable && !showIOSGuide) return null;

  if (showIOSGuide) {
    return (
      <div className="p-3 rounded-xl border border-yellow-500 text-yellow-500 bg-black/40 max-w-[520px]">
        <div className="font-medium mb-1">Installa “Photo & Vision” su iPhone</div>
        <ol className="list-decimal ml-5 space-y-1 text-sm">
          <li>Tocca il tasto <b>Condividi</b> (icona ↑).</li>
          <li>Scegli <b>Aggiungi a Home</b>.</li>
          <li>Conferma con <b>Aggiungi</b>.</li>
        </ol>
      </div>
    );
  }

  return (
    <button
      onClick={promptInstall}
      className="px-4 py-2 rounded-2xl border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black transition"
    >
      Installa Photo & Vision
    </button>
  );
}
