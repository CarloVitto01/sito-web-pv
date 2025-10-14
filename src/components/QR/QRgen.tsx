import React, { useRef, useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import "./QRgen.module.css";

// ⬇️ PV
import Header from "../HeaderComponents/Header";
import Footer from "../FooterComponents/Footer";

// ⬇️ Firestore (LEGGE il prezzo dal gestionale)
import { db } from "../../backend/firebase"; // <-- ADATTA IL PATH SE SERVE
import { doc, onSnapshot } from "firebase/firestore";

// Base API
const API_BASE = "/api";

// ======= PayPal config (ENV) =======
const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID as string;

// Fallback se il doc Firestore non esiste
const PRO_PRICE_EUR_FALLBACK = Number(process.env.REACT_APP_QR_PRO_PRICE_EUR ?? "9.99");

// opzionale: sovrapprezzo PayPal
const PAYPAL_SURCHARGE_ENABLED =
  (process.env.REACT_APP_PAYPAL_SURCHARGE_ENABLED ?? "false") === "true";
const PAYPAL_FEE_PCT = Number(process.env.REACT_APP_PAYPAL_FEE_PCT ?? "0.034");
const PAYPAL_FEE_FIXED = Number(process.env.REACT_APP_PAYPAL_FEE_FIXED ?? "0.35");
function grossWithPayPalFee(net: number) {
  const gross = (net + PAYPAL_FEE_FIXED) / (1 - PAYPAL_FEE_PCT);
  return Math.max(0, Number(gross.toFixed(2)));
}

// Helpers colore/preview
const normalizeHex = (hex: string) => hex.trim().toLowerCase();
const isPureBlack = (hex: string) => normalizeHex(hex) === "#000000";
const isPureWhite = (hex: string) => normalizeHex(hex) === "#ffffff";
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

const QR_SIZE = 256;
const PANEL_PAD = 16;

declare global { interface Window { paypal?: any } }

const QRCodeGenerator: React.FC = () => {
  const [url, setUrl] = useState("");
  const [fgColor, setFgColor] = useState("#000000");
  const [transparentBg, setTransparentBg] = useState(true);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // Stato paywall
  const [isPaid, setIsPaid] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // PayPal
  const [paypalReady, setPaypalReady] = useState(false);
  const paypalButtonsRef = useRef<HTMLDivElement | null>(null);
  const [paypalError, setPaypalError] = useState<string | null>(null);

  const qrPreviewRef = useRef<HTMLCanvasElement | null>(null);

  // ======== PREZZO da Gestionale (Firestore) ========
  const [priceNetDb, setPriceNetDb] = useState<number | null>(null);
  const [, setPriceUpdatedAt] = useState<Date | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, "configQR", "costi"); // doc usato dal gestionale
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const d = snap.data() as any;
        const eur = Number(d?.prezzo_euro);
        setPriceNetDb(Number.isFinite(eur) && eur > 0 ? eur : null);
        const ts = d?.updatedAt?.toDate?.();
        setPriceUpdatedAt(ts ?? null);
        setPriceLoading(false);
      },
      (err) => {
        console.error("Errore lettura prezzo PRO:", err);
        setPriceLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Regole PRO
  const isPremium = useMemo(() => {
    const colored = !isPureBlack(fgColor);
    const bgChanged = !transparentBg && !isPureWhite(bgColor);
    const hasImage = !!imageSrc;
    return colored || bgChanged || hasImage;
  }, [fgColor, transparentBg, bgColor, imageSrc]);

  // Colore riquadro preview
  const panelColor = useMemo(() => {
    if (isPureBlack(fgColor)) return "#ffffff";
    if (isPureWhite(fgColor)) return "#000000";
    return pickHighContrastBW(fgColor);
  }, [fgColor]);

  const drawWatermark = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    const stripeThickness = 18;
    const stripeGap = 26;
    ctx.translate(w / 2, h / 2);
    ctx.rotate((-25 * Math.PI) / 180);
    ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    for (let y = -h; y <= h * 2; y += stripeThickness + stripeGap) {
      ctx.fillRect(-w, y, w * 3, stripeThickness);
    }
    ctx.fillStyle = "rgba(255,255,255,0.98)";
    const fpSize = 72;
    ctx.fillRect(0, 0, fpSize, fpSize);
    ctx.fillRect(w - fpSize, 0, fpSize, fpSize);
    ctx.fillRect(0, h - fpSize, fpSize, fpSize);

    ctx.translate(w / 2, h / 2);
    ctx.rotate((25 * Math.PI) / 180);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 22px sans-serif";
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.lineWidth = 3;
    ctx.fillStyle = "#070404ff";
    ctx.fillText("PASSA A PRO", 0, 0);
    ctx.restore();
  };

  // ⬇️ Ora con dimensione parametrica (default 256) per esportazioni HD
  const generateCanvas = async (sizePx: number = 256): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    canvas.width = sizePx;
    canvas.height = sizePx;

    await QRCode.toCanvas(canvas, url, {
      margin: 0,
      color: {
        dark: fgColor,
        light: transparentBg ? "#00000000" : bgColor,
      },
      width: sizePx,
    });

    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    if (imageSrc) {
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve) => (img.onload = resolve));
      const logoSize = Math.round(sizePx * 0.25);
      const x = Math.round((sizePx - logoSize) / 2);
      const y = Math.round((sizePx - logoSize) / 2);
      ctx.drawImage(img, x, y, logoSize, logoSize);
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
      const canvas = await generateCanvas(); // 256px
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "qr-code.png";
      link.click();
    } catch (err) {
      console.error("Errore nel download PNG:", err);
    }
  };

  // ✅ PDF ritagliato (pagina = QR), HD e compresso
  const downloadPDFTrimmed = async () => {
    try {
      if (!guardDownloadOrOpenPaywall()) return;

      const SIZE_PX = 1024; // alta qualità
      const canvas = await generateCanvas(SIZE_PX);
      const dataUrl = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        unit: "px",
        format: [SIZE_PX, SIZE_PX], // pagina quadrata = QR
        compress: true,
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, SIZE_PX, SIZE_PX, undefined, "FAST");
      pdf.save("qr-code-trim.pdf");
    } catch (err) {
      console.error("Errore nel download PDF ritagliato:", err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Anteprima con riquadro
  useEffect(() => {
    const updatePreview = async () => {
      if (!qrPreviewRef.current || !url) return;

      const preview = qrPreviewRef.current;
      preview.width = QR_SIZE + PANEL_PAD * 2;
      preview.height = QR_SIZE + PANEL_PAD * 2;
      const pctx = preview.getContext("2d");
      if (!pctx) return;

      pctx.clearRect(0, 0, preview.width, preview.height);
      pctx.fillStyle = panelColor;
      pctx.fillRect(0, 0, preview.width, preview.height);

      const qrCanvas = document.createElement("canvas");
      qrCanvas.width = QR_SIZE;
      qrCanvas.height = QR_SIZE;

      await QRCode.toCanvas(qrCanvas, url, {
        margin: 0,
        color: {
          dark: fgColor,
          light: transparentBg ? "#00000000" : bgColor,
        },
        width: QR_SIZE,
      });

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

      pctx.drawImage(qrCanvas, PANEL_PAD, PANEL_PAD);

      if (isPremium && !isPaid) {
        drawWatermark(pctx, preview.width, preview.height);
      }
    };

    updatePreview();
  }, [url, fgColor, bgColor, transparentBg, imageSrc, isPremium, isPaid, panelColor]);

  // Debug helper
  useEffect(() => {
    // @ts-ignore
    window.__pvOpenPaywall = () => setShowPaywall(true);
  }, []);

  // ===== PayPal SDK lazy-load quando apro la modale =====
  useEffect(() => {
    if (!showPaywall || !isPremium || isPaid) return;

    setPaypalError(null);

    if (!PAYPAL_CLIENT_ID) {
      console.error("REACT_APP_PAYPAL_CLIENT_ID mancante.");
      setPaypalError("Configurazione PayPal mancante.");
      return;
    }

    if (window.paypal) {
      setPaypalReady(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-pp-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => setPaypalReady(true));
      existing.addEventListener("error", () => setPaypalError("Impossibile caricare PayPal SDK."));
      return;
    }

    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      PAYPAL_CLIENT_ID
    )}&components=buttons&currency=EUR&intent=capture`;
    s.async = true;
    (s as any).dataset.ppSdk = "true";
    s.onload = () => setPaypalReady(true);
    s.onerror = () => setPaypalError("Impossibile caricare PayPal SDK.");
    document.head.appendChild(s);
  }, [showPaywall, isPremium, isPaid]);

  // ===== Importo dinamico (DB → fallback ENV) =====
  const amountNet = (priceNetDb ?? PRO_PRICE_EUR_FALLBACK);
  const amountForPayPal = PAYPAL_SURCHARGE_ENABLED
    ? grossWithPayPalFee(amountNet)
    : amountNet;
  const paypalFeeEstimate = Math.max(0, Number((amountForPayPal - amountNet).toFixed(2)));
  const priceSource = priceNetDb != null ? "db" : "env";

  // ===== Render PayPal Buttons (si aggiorna se cambia importo) =====
  useEffect(() => {
    if (!showPaywall || !isPremium || isPaid) return;
    if (!paypalReady || !paypalButtonsRef.current) return;

    paypalButtonsRef.current.innerHTML = "";
    const Buttons = window.paypal?.Buttons;
    if (!Buttons) return;

    const instance = Buttons({
      style: { layout: "vertical" },
      createOrder: async () => {
        const res = await fetch(`${API_BASE}/paypal/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amountForPayPal.toFixed(2),
            currency: "EUR",
            method: "PAYPAL",
            product: "qr-pro"
          }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Errore create-order (${res.status}): ${text}`);
        }
        const data = await res.json();
        if (!data?.orderId) throw new Error("orderId assente");
        return data.orderId;
      },
      onApprove: async (data: any) => {
        try {
          const res = await fetch(`${API_BASE}/paypal/capture-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`Errore capture-order (${res.status}): ${text}`);
          }
          const cap = await res.json();
          if (cap.status === "COMPLETED") {
            setIsPaid(true);
            sessionStorage.setItem("qr-paid", "1");
            setShowPaywall(false);
          } else {
            alert("Pagamento non completato: " + cap.status);
          }
        } catch (e) {
          console.error(e);
          alert("Si è verificato un errore durante il pagamento.");
        }
      },
      onError: (err: any) => {
        console.error("PayPal Buttons error:", err);
        alert("Errore PayPal. Riprova.");
      },
    });

    instance.render(paypalButtonsRef.current);
    return () => { try { instance.close(); } catch {} };
  }, [paypalReady, showPaywall, isPremium, isPaid, amountForPayPal]);

  // ripristina stato PRO se già pagato in sessione
  useEffect(() => {
    if (sessionStorage.getItem("qr-paid") === "1") setIsPaid(true);
  }, []);

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

          {/* Opzioni */}
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

            {/* Sfondo */}
            <div style={{ display: "grid", gap: 8 }}>
              <label className="qr-label">Sfondo</label>
              <div style={{ display: "inline-flex", border: "1px solid #333", borderRadius: 999, overflow: "hidden" }}>
                <label style={{ padding: "8px 14px", cursor: "pointer", background: transparentBg ? "rgba(202,167,0,0.15)" : "transparent" }}>
                  <input type="radio" name="bgmode" checked={transparentBg} onChange={() => setTransparentBg(true)} style={{ display: "none" }} />
                  Trasparente
                </label>
                <label style={{ padding: "8px 14px", cursor: "pointer", background: !transparentBg ? "rgba(202,167,0,0.15)" : "transparent" }}>
                  <input type="radio" name="bgmode" checked={!transparentBg} onChange={() => setTransparentBg(false)} style={{ display: "none" }} />
                  Colore
                </label>
              </div>

              {transparentBg ? (
                <div style={{
                  marginTop: 8, border: "1px dashed #333", borderRadius: 10, padding: "10px 12px",
                  fontSize: "0.9rem", color: "#bdbdbd",
                  backgroundImage:
                    "linear-gradient(45deg, #1a1a1a 25%, transparent 25%),linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),linear-gradient(45deg, transparent 75%, #1a1a1a 75%),linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)",
                  backgroundSize: "18px 18px", backgroundPosition: "0 0, 0 9px, 9px -9px, -9px 0",
                }}>
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

          {/* Upload logo */}
          <div className="qr-upload" style={{ display: "grid", gap: 10, marginTop: 12 }}>
            Immagine Centrale
            <label title="Aggiungere un'immagine centrale attiva la modalità PRO">
              <input type="file" accept="image/*" onChange={handleImageUpload} />
            </label>
            {imageSrc ? (
              <div style={{ display: "grid", gridTemplateColumns: "88px 1fr auto", gap: 12, alignItems: "center" }}>
                <div style={{
                  width: 88, height: 88, borderRadius: 12, border: "1px solid #333", display: "grid", placeItems: "center",
                  overflow: "hidden",
                  backgroundImage:
                    "linear-gradient(45deg, #1a1a1a 25%, transparent 25%),linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),linear-gradient(45deg, transparent 75%, #1a1a1a 75%),linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)",
                  backgroundSize: "18px 18px", backgroundPosition: "0 0, 0 9px, 9px -9px, -9px 0",
                }}>
                  <img src={imageSrc} alt="Anteprima logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                </div>
                <small className="qr-hint">Suggerito <strong>296×296 px</strong> (PNG con sfondo trasparente).</small>
                <button onClick={() => setImageSrc(null)} className="qr-remove-button">Elimina Foto</button>
              </div>
            ) : (
              <small className="qr-hint">Carica un logo quadrato <strong>296×296 px</strong> (PNG con sfondo trasparente consigliato).</small>
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

              {/* ⬇️ Sostituisce il vecchio download PDF con la versione ritagliata */}
              <button
                onClick={downloadPDFTrimmed}
                className="qr-button"
                disabled={isPremium && !isPaid}
                title={isPremium && !isPaid ? "Sblocca le funzioni PRO per scaricare" : "Scarica PDF (ritagliato)"}
              >
                Scarica PDF (ritagliato)
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
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2147483647, display: "grid", placeItems: "center" }}
        >
          <div
            className="paywall-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", color: "#111", padding: 20, borderRadius: 12, width: "min(480px, calc(100% - 32px))", boxShadow: "0 10px 30px rgba(0,0,0,.25)" }}
          >
            <h3>Sblocca le funzioni PRO</h3>
            <ul className="paywall-list">
              <li>Colore QR personalizzato</li>
              <li>Sfondo personalizzato</li>
              <li>Immagine centrale</li>
              <li>Download senza filigrana</li>
            </ul>

            <div style={{ margin: "8px 0 12px", lineHeight: 1.4 }}>
              {priceLoading ? (
                <>Caricamento prezzo…</>
              ) : (
                <>
                  Prezzo PRO: <strong>{amountNet.toFixed(2)} €</strong>{" "}
                  {priceSource === "db" ? (
                    <span style={{ fontSize: 12, opacity: 0.8 }}></span>
                  ) : (
                    <span style={{ fontSize: 12, opacity: 0.8 }}>(valore di default)</span>
                  )}
                  {PAYPAL_SURCHARGE_ENABLED && (
                    <>
                      <br />
                      Commissione PayPal stimata: <strong>{paypalFeeEstimate.toFixed(2)} €</strong>
                      <br />
                      Totale in cassa: <strong>{amountForPayPal.toFixed(2)} €</strong>
                    </>
                  )}
                </>
              )}
            </div>

            {paypalError ? (
              <p style={{ color: "#b00020" }}>{paypalError}</p>
            ) : (
              <div ref={paypalButtonsRef} style={{ display: "grid", placeItems: "center", minHeight: 45 }} />
            )}

            <div className="paywall-cta" style={{ display: "grid", gap: 8, marginTop: 12 }}>
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
