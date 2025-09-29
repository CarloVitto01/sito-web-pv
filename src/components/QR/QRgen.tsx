import React, { useRef, useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import "./QRgen.module.css";

// ⬇️ Aggiunte PV
import Header from "../HeaderComponents/Header";
import Footer from "../FooterComponents/Footer";

// Base API (proxy o nginx a /api → :8080)
const API_BASE = "/api";

// Helpers
const normalizeHex = (hex: string) => hex.trim().toLowerCase();
const isPureBlack = (hex: string) => normalizeHex(hex) === "#000000";
const isPureWhite = (hex: string) => normalizeHex(hex) === "#ffffff";

// === UTIL PREVIEW: contrasto e dimensioni (SOLO PER PREVIEW) ===
const hexToRgb = (hex: string) => {
  const h = normalizeHex(hex).replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const srgbToLin = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const relLuminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
};
const contrastRatio = (hex1: string, hex2: string) => {
  const L1 = relLuminance(hex1);
  const L2 = relLuminance(hex2);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
};
const pickHighContrastBW = (hex: string) => {
  const cBlack = contrastRatio(hex, "#000000");
  const cWhite = contrastRatio(hex, "#ffffff");
  return cBlack > cWhite ? "#000000" : "#ffffff";
};
const QR_SIZE = 256;    // lato del QR (come ora)
const PANEL_PAD = 16;   // padding del riquadro in preview

const QRCodeGenerator: React.FC = () => {
  const [url, setUrl] = useState("");
  const [fgColor, setFgColor] = useState("#000000");
  const [transparentBg, setTransparentBg] = useState(true);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // Stato paywall
  const [isPaid, setIsPaid] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false); // NEW
  const qrPreviewRef = useRef<HTMLCanvasElement | null>(null);

  // Regole PRO
  const isPremium = useMemo(() => {
    const colored = !isPureBlack(fgColor);
    const bgChanged = !transparentBg && !isPureWhite(bgColor);
    const hasImage = !!imageSrc;
    return colored || bgChanged || hasImage;
  }, [fgColor, transparentBg, bgColor, imageSrc]);

  // Colore riquadro SOLO PREVIEW
  const panelColor = useMemo(() => {
    if (isPureBlack(fgColor)) return "#ffffff"; // QR nero → riquadro bianco
    if (isPureWhite(fgColor)) return "#000000"; // QR bianco → riquadro nero
    return pickHighContrastBW(fgColor);         // altri colori → bianco/nero con più contrasto
  }, [fgColor]);

  // Disegna filigrana
  const drawWatermark = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();

    // 1) Strisce diagonali opache (bianco quasi pieno)
    //   - abbastanza spesse da rompere i moduli
    //   - spazi ravvicinati per coprire la matrice
    const stripeThickness = 18;
    const stripeGap = 26; // distanza tra strisce
    ctx.translate(w / 2, h / 2);
    ctx.rotate((-25 * Math.PI) / 180);
    ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = "rgba(255,255,255,0.95)"; // quasi pieno
    for (let y = -h; y <= h * 2; y += stripeThickness + stripeGap) {
      ctx.fillRect(-w, y, w * 3, stripeThickness);
    }

    // 2) Copri i finder pattern (angoli) — blocca la decodifica
    //    Con canvas 256x256 e margin:0, 72px coprono bene i marcatori 7x7.
    ctx.fillStyle = "rgba(255,255,255,0.98)";
    const fpSize = 72;
    // top-left
    ctx.fillRect(0, 0, fpSize, fpSize);
    // top-right
    ctx.fillRect(w - fpSize, 0, fpSize, fpSize);
    // bottom-left
    ctx.fillRect(0, h - fpSize, fpSize, fpSize);

    // 3) Scritta centrale (decorativa)
    ctx.translate(w / 2, h / 2);
    ctx.rotate((25 * Math.PI) / 180); // torna all’orientamento originale
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 22px sans-serif";
    // bordo per leggibilità
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.lineWidth = 3;
    ctx.fillStyle = "#070404ff";
    ctx.fillText("PASSA A PRO", 0, 0);

    ctx.restore();
  };

  const generateCanvas = async (forPreview = false): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;

    await QRCode.toCanvas(canvas, url, {
      margin: 0,
      color: {
        dark: fgColor,
        light: transparentBg ? "#00000000" : bgColor,
      },
      width: 256,
    });

    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    if (imageSrc) {
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve) => (img.onload = resolve));
      ctx.drawImage(img, 96, 96, 64, 64);
    }

    if (isPremium && !isPaid) {
      drawWatermark(ctx, canvas.width, canvas.height);
    }

    return canvas;
  };

  const guardDownloadOrOpenPaywall = () => {
    if (isPremium && !isPaid) {
      setShowPaywall(true);
      return false;
    }
    return true;
  };

  const downloadPNG = async () => {
    try {
      if (!guardDownloadOrOpenPaywall()) return;
      const canvas = await generateCanvas();
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "qr-code.png";
      link.click();
    } catch (err) {
      console.error("Errore nel download PNG:", err);
    }
  };

  const downloadPDF = async () => {
    try {
      if (!guardDownloadOrOpenPaywall()) return;
      const canvas = await generateCanvas();
      const dataUrl = canvas.toDataURL("image/png");
      const pdf = new jsPDF();
      pdf.addImage(dataUrl, "PNG", 15, 40, 80, 80);
      pdf.save("qr-code.pdf");
    } catch (err) {
      console.error("Errore nel download PDF:", err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Aggiorna anteprima (SOLO QUI aggiungiamo il riquadro)
  useEffect(() => {
    const updatePreview = async () => {
      if (!qrPreviewRef.current || !url) return;

      // Canvas di preview più grande (riquadro visibile)
      const preview = qrPreviewRef.current;
      preview.width = QR_SIZE + PANEL_PAD * 2;
      preview.height = QR_SIZE + PANEL_PAD * 2;
      const pctx = preview.getContext("2d");
      if (!pctx) return;

      // Riquadro pieno bianco/nero a contrasto col colore QR
      pctx.clearRect(0, 0, preview.width, preview.height);
      pctx.fillStyle = panelColor;
      pctx.fillRect(0, 0, preview.width, preview.height);

      // Genera il QR su canvas intermedio 256x256
      const qrCanvas = document.createElement("canvas");
      qrCanvas.width = QR_SIZE;
      qrCanvas.height = QR_SIZE;

      await QRCode.toCanvas(qrCanvas, url, {
        margin: 0,
        color: {
          dark: fgColor,
          light: transparentBg ? "#00000000" : bgColor, // se trasparente, si vede il riquadro sotto
        },
        width: QR_SIZE,
      });

      // Logo centrale (se presente)
      if (imageSrc) {
        const img = new Image();
        img.src = imageSrc;
        await new Promise((resolve) => (img.onload = resolve));
        const logoSize = 64;
        const logoX = (QR_SIZE - logoSize) / 2;
        const logoY = (QR_SIZE - logoSize) / 2;
        const qctx = qrCanvas.getContext("2d");
        qctx?.drawImage(img, logoX, logoY, logoSize, logoSize);
      }

      // Disegna il QR centrato dentro il riquadro
      pctx.drawImage(qrCanvas, PANEL_PAD, PANEL_PAD);

      // Filigrana se PRO non pagato (solo la preview deve mostrarla)
      if (isPremium && !isPaid) {
        drawWatermark(pctx, preview.width, preview.height);
      }
    };

    updatePreview();
  }, [url, fgColor, bgColor, transparentBg, imageSrc, isPremium, isPaid, panelColor]);

  // Debug helper per aprire la modale a comando
  useEffect(() => {
    // @ts-ignore
    window.__pvOpenPaywall = () => setShowPaywall(true);
  }, []);

  // Verifica pagamento al ritorno da Stripe (?session_id=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (sessionId) {
      (async () => {
        try {
          const res = await fetch(
            `${API_BASE}/payments/verify?session_id=${encodeURIComponent(sessionId)}`
          );
          const data: { paid: boolean; error?: string } = await res.json();
          if (data.paid) {
            setIsPaid(true);
            sessionStorage.setItem("qr-paid", "1");
            setShowPaywall(false);
          }
        } catch (e) {
          console.error("Verifica pagamento fallita:", e);
        } finally {
          const clean = window.location.origin + window.location.pathname;
          window.history.replaceState({}, "", clean);
        }
      })();
    } else if (sessionStorage.getItem("qr-paid") === "1") {
      setIsPaid(true);
    }
  }, []);

  // Checkout → chiama backend e reindirizza a Stripe
  const startCheckout = async () => {
    try {
      setLoadingCheckout(true);
      const payload = {
        product: "qr-pro",
        returnUrl: window.location.origin + window.location.pathname,
        features: {
          colored: !isPureBlack(fgColor),
          bgChanged: !transparentBg && !isPureWhite(bgColor),
          hasImage: !!imageSrc,
        },
      };

      const res = await fetch(`${API_BASE}/payments/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Checkout HTTP ${res.status}: ${errText}`);
      }

      const data: { url?: string; error?: string } = await res.json();
      if (data.url) {
        window.location.href = data.url; // redirect a Stripe
      } else {
        throw new Error(data.error || "URL di Checkout mancante");
      }
    } catch (e) {
      console.error(e);
      alert("Pagamento non avviato. Controlla connessione/CORS o riprova.");
    } finally {
      setLoadingCheckout(false);
    }
  };

  return (
    <>
      <Header />

      <main className="pv-main">
        <div className="qr-container">
          <h2 className="qr-title">
            Genera Codice QR {isPremium ? <span className="badge-pro">PRO</span> : <span className="badge-free">FREE</span>}
          </h2>


          <input
            type="text"
            placeholder="Inserisci un URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="qr-input"
          />

          {/* === OPZIONI QR (sostituisci l'intero blocco qr-options + upload + hint) === */}
          <div className="qr-options" style={{ display: "grid", gap: 16 }}>
            {/* Colore QR */}
            <div style={{ display: "grid", gap: 8 }}>
              <label className="qr-label">🎨 Colore QR</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  title="Cambiare colore attiva la modalità PRO"
                />
    
        
                <span style={{ fontSize: "0.85rem", opacity: 0.85 }}>
                  PRO se diverso da nero
                </span>
              </div>
            </div>

            {/* Sfondo: Trasparente / Colore */}
            <div style={{ display: "grid", gap: 8 }}>
              <label className="qr-label">Sfondo</label>

              {/* Segmented control */}
              <div
                style={{
                  display: "inline-flex",
                  border: "1px solid #333",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <label
                  style={{
                    padding: "8px 14px",
                    cursor: "pointer",
                    background: transparentBg ? "rgba(202,167,0,0.15)" : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="bgmode"
                    checked={transparentBg}
                    onChange={() => setTransparentBg(true)}
                    style={{ display: "none" }}
                  />
                  Trasparente
                </label>
                <label
                  style={{
                    padding: "8px 14px",
                    cursor: "pointer",
                    background: !transparentBg ? "rgba(202,167,0,0.15)" : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="bgmode"
                    checked={!transparentBg}
                    onChange={() => setTransparentBg(false)}
                    style={{ display: "none" }}
                  />
                  Colore
                </label>
              </div>

              {/* Picker / Anteprima */}
              {transparentBg ? (
                <div
                  style={{
                    marginTop: 8,
                    border: "1px dashed #333",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: "0.9rem",
                    color: "#bdbdbd",
                    backgroundImage:
                      "linear-gradient(45deg, #1a1a1a 25%, transparent 25%),linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),linear-gradient(45deg, transparent 75%, #1a1a1a 75%),linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)",
                    backgroundSize: "18px 18px",
                    backgroundPosition: "0 0, 0 9px, 9px -9px, -9px 0",
                  }}
                >
                  Anteprima trasparenza
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    title="Cambiare lo sfondo da bianco attiva la modalità PRO"
                  />
                  <span style={{ fontSize: "0.85rem", opacity: 0.85 }}>
                    PRO se diverso da bianco
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Upload logo con anteprima */}
          <div className="qr-upload" style={{ display: "grid", gap: 10, marginTop: 12 }}>
            Immagine Centrale
            <label
              title="Aggiungere un'immagine centrale attiva la modalità PRO"
            >
              
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setImageSrc(
                    e.target.files?.[0]
                      ? URL.createObjectURL(e.target.files[0])
                      : null
                  )
                }
              />
            </label>

            {imageSrc ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "88px 1fr auto",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 12,
                    border: "1px solid #333",
                    display: "grid",
                    placeItems: "center",
                    overflow: "hidden",
                    backgroundImage:
                      "linear-gradient(45deg, #1a1a1a 25%, transparent 25%),linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),linear-gradient(45deg, transparent 75%, #1a1a1a 75%),linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)",
                    backgroundSize: "18px 18px",
                    backgroundPosition: "0 0, 0 9px, 9px -9px, -9px 0",
                  }}
                >
                  <img
                    src={imageSrc}
                    alt="Anteprima logo"
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                </div>

                <small className="qr-hint">
                  Suggerito <strong>296×296 px</strong> (PNG con sfondo trasparente).
                </small>

                <button
                  onClick={() => setImageSrc(null)}
                  className="qr-remove-button"
                >
                  Elimina Foto
                </button>
              </div>
            ) : (
              <small className="qr-hint">
                Carica un logo quadrato <strong>296×296 px</strong> (PNG con sfondo trasparente consigliato).
              </small>
            )}
          </div>

          {url && (
            <div className={`qr-preview ${isPremium && !isPaid ? "locked" : ""}`}>
              <canvas ref={qrPreviewRef} width={256} height={256} />
            </div>
          )}

          {url && (
            <div className="qr-actions">
              <button
                onClick={downloadPNG}
                className="qr-button"
                disabled={isPremium && !isPaid}
                title={isPremium && !isPaid ? "Sblocca le funzioni PRO per scaricare" : "Scarica PNG"}
              >
                Scarica PNG
              </button>
              <button
                onClick={downloadPDF}
                className="qr-button"
                disabled={isPremium && !isPaid}
                title={isPremium && !isPaid ? "Sblocca le funzioni PRO per scaricare" : "Scarica PDF"}
              >
                Scarica PDF
              </button>
              {isPremium && !isPaid && (
                <button className="qr-button primary" onClick={() => setShowPaywall(true)}>
                  Sblocca PRO
                </button>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Paywall Modal */}
      {showPaywall && (
        <div
          className="paywall-backdrop"
          onClick={() => setShowPaywall(false)}
          // Fallback per garantire visibilità sopra tutto
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 2147483647,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            className="paywall-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 12,
              width: "min(480px, calc(100% - 32px))",
              boxShadow: "0 10px 30px rgba(0,0,0,.25)",
            }}
          >
            <h3>Sblocca le funzioni PRO</h3>
            <ul className="paywall-list">
              <li>Colore QR personalizzato</li>
              <li>Sfondo personalizzato</li>
              <li>Immagine centrale</li>
              <li>Download senza filigrana</li>
            </ul>
            <div className="paywall-cta" style={{ display: "grid", gap: 8 }}>
              <button
                className="qr-button primary"
                onClick={startCheckout}
                disabled={loadingCheckout}
                title="Paga con carta (Stripe)"
              >
                {loadingCheckout ? "Reindirizzamento..." : "Procedi al pagamento"}
              </button>
              <button className="qr-button" onClick={() => setShowPaywall(false)}>
                Annulla
              </button>
            </div>
            <small className="paywall-note">
              Il pagamento è richiesto solo quando utilizzi funzioni PRO. La versione base (nero su
              sfondo bianco, senza immagine) resta gratuita.
            </small>
          </div>
        </div>
      )}
    </>
  );
};

export default QRCodeGenerator;
