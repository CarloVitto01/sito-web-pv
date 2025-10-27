import React, { useMemo } from "react";
import styles from "./PwaInstallGuide.module.css";

function detectPlatform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent.toLowerCase();
  const isTouch = "ontouchstart" in window;

  const isiOS = /iphone|ipad|ipod/.test(ua) || (isTouch && /macintosh|mac os/.test(ua));
  const isAndroid = /android/.test(ua);

  if (isiOS) return "ios";
  if (isAndroid) return "android";
  return "desktop";
}

export default function PwaInstallGuide() {
  const platform = useMemo(detectPlatform, []);

  return (
    <div className={styles.banner}>
      <div className={styles.inner}>
        <div className={styles.title}>📲 Installa l’app Photo & Vision</div>
        <p className={styles.subtitle}>
          Segui i passaggi qui sotto per aggiungere l’app alla schermata Home e usarla come un’app nativa.
        </p>

        {platform === "ios" && (
          <ol className={styles.list}>
            <li>Premi <b>Condividi</b> (icona ↑) nella barra inferiore di Safari.</li>
            <li>Tocca <b>Aggiungi a Home</b>.</li>
            <li>Conferma con <b>Aggiungi</b>.</li>
          </ol>
        )}

        {platform === "android" && (
          <ol className={styles.list}>
            <li>Apri il menu <b>⋮</b> in alto a destra di Chrome.</li>
            <li>Seleziona <b>Installa app</b> oppure <b>Aggiungi a schermata Home</b>.</li>
            <li>Conferma con <b>Installa</b>.</li>
          </ol>
        )}

        {platform === "desktop" && (
          <ol className={styles.list}>
            <li>In Chrome: clicca l’icona <b>Installa</b> nella barra degli indirizzi.</li>
            <li>Oppure vai su <b>⋮ → Installa Photo & Vision</b>.</li>
            <li>Su Edge: <b>… → App → Installa questo sito come app</b>.</li>
          </ol>
        )}
      </div>
    </div>
  );
}
