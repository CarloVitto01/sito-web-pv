import React, { useRef, useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import "./QRgen.module.css";

// ⬇️ Aggiunte PV
import Header from "../HeaderComponents/Header";
import Footer from "../FooterComponents/Footer";

// Helpers
const normalizeHex = (hex: string) => hex.trim().toLowerCase();
const isPureBlack = (hex: string) => normalizeHex(hex) === "#000000";
const isPureWhite = (hex: string) => normalizeHex(hex) === "#ffffff";

const QRCodeGenerator: React.FC = () => {
  const [url, setUrl] = useState("");
  const [fgColor, setFgColor] = useState("#000000");
  const [transparentBg, setTransparentBg] = useState(true);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // Stato paywall
  const [isPaid, setIsPaid] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const qrPreviewRef = useRef<HTMLCanvasElement | null>(null);

  // Regole PRO: colore ≠ nero, sfondo ≠ bianco (se non trasparente), immagine presente
  const isPremium = useMemo(() => {
    const colored = !isPureBlack(fgColor);
    const bgChanged = !transparentBg && !isPureWhite(bgColor);
    const hasImage = !!imageSrc;
    return colored || bgChanged || hasImage;
  }, [fgColor, transparentBg, bgColor, imageSrc]);

  // Disegna filigrana su un ctx
  const drawWatermark = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.translate(w / 2, h / 2);
    ctx.rotate((-25 * Math.PI) / 180);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 20px sans-serif";
    ctx.fillStyle = "#000";
    const text = "PHOTO & VISION — ANTEPRIMA";
    // Trama semplice ripetuta
    for (let y = -h; y <= h; y += 60) {
      for (let x = -w; x <= w; x += 200) {
        ctx.fillText(text, x, y);
      }
    }
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

    // Logo centrale (feature PRO)
    if (imageSrc) {
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve) => (img.onload = resolve));
      ctx.drawImage(img, 96, 96, 64, 64); // centro
    }

    // Se è una configurazione PRO non pagata → apponi filigrana SEMPRE (preview e download)
    if (isPremium && !isPaid) {
      drawWatermark(ctx, canvas.width, canvas.height);
    }

    return canvas;
  };

  const guardDownloadOrOpenPaywall = () => {
    // Se PRO e non pagato → apri paywall e blocca
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

  useEffect(() => {
    const updatePreview = async () => {
      if (!qrPreviewRef.current || !url) return;

      await QRCode.toCanvas(qrPreviewRef.current, url, {
        margin: 0,
        color: {
          dark: fgColor,
          light: transparentBg ? "#00000000" : bgColor,
        },
        width: 256,
      });

      const ctx = qrPreviewRef.current.getContext("2d");
      if (!ctx) return;

      if (imageSrc) {
        const img = new Image();
        img.src = imageSrc;
        await new Promise((resolve) => (img.onload = resolve));
        ctx.drawImage(img, 96, 96, 64, 64);
      }

      if (isPremium && !isPaid) {
        drawWatermark(ctx, qrPreviewRef.current.width, qrPreviewRef.current.height);
      }
    };

    updatePreview();
  }, [url, fgColor, bgColor, transparentBg, imageSrc, isPremium, isPaid]);

  // === Checkout (stub) ===
  const startCheckout = async () => {
    try {
      // TODO integrazione reale:
      // 1) Invia POST al tuo backend Spring Boot: /api/payments/checkout
      //    con payload { product: "qr-pro", features: { colored: !isPureBlack(fgColor), bgChanged: (!transparentBg && !isPureWhite(bgColor)), hasImage: !!imageSrc } }
      // 2) Il backend crea una Stripe Checkout Session e restituisce "url"
      // 3) window.location.href = url
      // 4) Nella success_url, il backend verifica il pagamento tramite webhook e rilascia un token di sblocco (JWT)
      // 5) Qui richiami /api/payments/verify?session_id=... e, se ok, setIsPaid(true)

      // Per ora: simulazione riuscita (rimuovi quando colleghi Stripe/PayPal)
      setTimeout(() => {
        setIsPaid(true);
        setShowPaywall(false);
      }, 800);
    } catch (e) {
      console.error(e);
      alert("Pagamento non riuscito. Riprova.");
    }
  };

  return (
    <>
      <Header />

      <main className="pv-main">
        <div className="qr-container">
          <h2 className="qr-title">Genera Codice QR {isPremium ? <span className="badge-pro">PRO</span> : <span className="badge-free">FREE</span>}</h2>

          <input
            type="text"
            placeholder="Inserisci un URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="qr-input"
          />

          <div className="qr-options">
            <label className="qr-label">
              🎨 Colore QR:
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                title="Cambiare colore attiva la modalità PRO"
              />
            </label>
            <label className="qr-label">
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={() => setTransparentBg((prev) => !prev)}
                title="Sfondo trasparente è FREE finché il colore QR è nero"
              />
              Sfondo trasparente
            </label>
            {!transparentBg && (
              <label className="qr-label">
                🧱 Sfondo:
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  title="Cambiare lo sfondo da bianco attiva la modalità PRO"
                />
              </label>
            )}
          </div>

          <div className="qr-upload">
            <label title="Aggiungere un'immagine centrale attiva la modalità PRO">
              📷 Immagine centrale:
              <input type="file" accept="image/*" onChange={handleImageUpload} />
            </label>
            {imageSrc && (
              <button onClick={() => setImageSrc(null)} className="qr-remove-button">
                Elimina Foto
              </button>
            )}
          </div>

          {url && (
            <div className={`qr-preview ${isPremium && !isPaid ? "locked" : ""}`}>
              <canvas ref={qrPreviewRef} width={256} height={256} />
              {isPremium && !isPaid && (
                <div className="lock-overlay">
                  <span>Funzioni PRO in anteprima</span>
                  <button className="qr-button" onClick={() => setShowPaywall(true)}>Sblocca</button>
                </div>
              )}
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
        <div className="paywall-backdrop" onClick={() => setShowPaywall(false)}>
          <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sblocca le funzioni PRO</h3>
            <ul className="paywall-list">
              <li>Colore QR personalizzato</li>
              <li>Sfondo personalizzato</li>
              <li>Immagine centrale</li>
              <li>Download senza filigrana</li>
            </ul>
            <div className="paywall-cta">
              <button className="qr-button primary" onClick={startCheckout}>
                Procedi al pagamento
              </button>
              <button className="qr-button" onClick={() => setShowPaywall(false)}>
                Annulla
              </button>
            </div>
            <small className="paywall-note">
              Il pagamento è richiesto solo quando utilizzi funzioni PRO. La versione base (nero su sfondo bianco, senza immagine) resta gratuita.
            </small>
          </div>
        </div>
      )}
    </>
  );
};

export default QRCodeGenerator;
