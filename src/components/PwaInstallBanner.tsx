import React, { useMemo, useState } from "react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import styles from "./PwaInstallBanner.module.css";

function getPlatform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}
function isInStandaloneMode() {
  return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
    || (navigator as any).standalone === true;
}

type Props = {
  className?: string;
  sticky?: boolean;       // se true lo rende “appiccicato” in basso
  title?: string;
  message?: string;
  ctaLabel?: string;
};

export default function PwaInstallBanner({
  className = "",
  sticky = false,
  title = "Installa l’app Photo & Vision",
  message = "Icona su Home, apertura a schermo intero e accesso rapido a tutti i servizi.",
  ctaLabel = "Installa adesso",
}: Props) {
  const { hasPrompt, promptInstall } = useInstallPrompt();
  const [showHelp, setShowHelp] = useState(false);

  const platform = useMemo(getPlatform, []);
  const installed = useMemo(isInStandaloneMode, []);

  const onClick = async () => {
    if (platform === "ios") {
      setShowHelp(true);
      return;
    }
    if (hasPrompt) {
      const ok = await promptInstall();   // ⬅️ qui tentiamo l’install “automatica” al click
      if (!ok) setShowHelp(true);
      return;
    }
    setShowHelp(true);
  };

  return (
    <div className={[
      styles.banner,
      sticky ? styles.sticky : "",
      className
    ].join(" ")}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <div className={styles.title}>{title}</div>
          <p className={styles.text}>{message}</p>

          {showHelp && (
            <div className={styles.help}>
              {platform === "ios" && (
                <ol className={styles.list}>
                  <li>Premi <b>Condividi</b> (icona ↑).</li>
                  <li>Tocca <b>Aggiungi a Home</b>.</li>
                  <li>Conferma con <b>Aggiungi</b>.</li>
                </ol>
              )}
              {platform === "android" && (
                <ol className={styles.list}>
                  <li>Apri il menu '⋮' di Chrome.</li>
                  <li>Seleziona '<b>Installa app</b>' oppure <b>Aggiungi a schermata Home</b>.</li>
                  <li>Conferma con <b>Installa</b>.</li>
                </ol>
              )}
              {platform === "desktop" && (
                <ol className={styles.list}>
                  <li>Chrome: icona 'Installa' nella barra indirizzi o '⋮ → Installa app'.</li>
                  <li>Edge: '… → App → Installa questo sito come app'.</li>
                </ol>
              )}
            </div>
          )}

          {installed && <div className={styles.badge}>✅ App già installata</div>}
        </div>

        <div className={styles.actions}>
          <button className={styles.btn} onClick={onClick}>
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
