import React, { useRef, useState, useEffect } from "react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import "./QRCodeGenerator.css";

// ⬇️ PV
import Header from "../../components/HeaderComponents/Header";
import Footer from "../../components/FooterComponents/Footer";

// ⬇️ Firestore (gestione prezzo)
import { db } from "../../backend/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

const fmtEuro = (val: number | string) => {
  const n =
    typeof val === "number"
      ? val
      : Number(String(val).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  const safe = isNaN(n) ? 0 : n;
  return safe.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseEuro = (val: string | number): number => {
  if (typeof val === "number") return val;
  const n = Number(val.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : n;
};

const QRCodeGenerator: React.FC = () => {
  const [url, setUrl] = useState("");
  const [fgColor, setFgColor] = useState("#000000");
  const [transparentBg, setTransparentBg] = useState(true);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const qrPreviewRef = useRef<HTMLCanvasElement | null>(null);

  // ======= Stato gestione prezzo (Firestore) =======
  const [priceEuro, setPriceEuro] = useState<string>("0,00");
  const [savingPrice, setSavingPrice] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const ref = doc(db, "configQR", "costi");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as any;
        const prezzo = data?.prezzo_euro ?? 0;
        setPriceEuro(fmtEuro(prezzo));
        const ts = data?.updatedAt?.toDate?.();
        setLastUpdated(ts ?? null);
        setLoadingPrice(false);
      },
      (err) => {
        console.error("Errore lettura prezzo:", err);
        setLoadingPrice(false);
      }
    );
    return () => unsub();
  }, []);

  const handleSavePrice = async () => {
    try {
      setSavingPrice(true);
      const ref = doc(db, "configQR", "costi");
      await setDoc(
        ref,
        {
          prezzo_euro: parseEuro(priceEuro),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Errore salvataggio prezzo:", err);
    } finally {
      setSavingPrice(false);
    }
  };

  // ora accetta una dimensione (default 256px)
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
    if (ctx && imageSrc) {
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve) => (img.onload = resolve));
      // logo ~25% del lato
      const logoSize = Math.round(sizePx * 0.25);
      const x = Math.round((sizePx - logoSize) / 2);
      const y = Math.round((sizePx - logoSize) / 2);
      ctx.drawImage(img, x, y, logoSize, logoSize);
    }

    return canvas;
  };

  const downloadPNG = async () => {
    try {
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

  const downloadPDF = async () => {
    try {
      const canvas = await generateCanvas(); // 256px
      const dataUrl = canvas.toDataURL("image/png");
      const pdf = new jsPDF(); // A4 di default
      pdf.addImage(dataUrl, "PNG", 15, 40, 80, 80);
      pdf.save("qr-code.pdf");
    } catch (err) {
      console.error("Errore nel download PDF:", err);
    }
  };

  // ✅ PDF ritagliato al QR
  const downloadPDFTrimmed = async () => {
    try {
      const SIZE_PX = 1024; // alta qualità
      const canvas = await generateCanvas(SIZE_PX);
      const dataUrl = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        unit: "px",
        format: [SIZE_PX, SIZE_PX], // pagina = QR
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
      if (ctx && imageSrc) {
        const img = new Image();
        img.src = imageSrc;
        await new Promise((resolve) => (img.onload = resolve));
        ctx.drawImage(img, 96, 96, 64, 64); // centro (64/256 = 25%)
      }
    };

    updatePreview();
  }, [url, fgColor, bgColor, transparentBg, imageSrc]);

  return (
    <>
      <Header />

      <main className="pv-main">
        <div className="qr-container">
          <h2 className="qr-title">Crea Codice QR</h2>

          {/* ======= Blocco gestione prezzo ======= */}
          <section className="qr-admin" style={{ marginBottom: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
              <div>
                <div className="qr-label" style={{ marginBottom: 6 }}>
                  Prezzo corrente
                  {loadingPrice ? (
                    <span style={{ marginLeft: 8, opacity: 0.7 }}>(caricamento…)</span>
                  ) : (
                    <span style={{ marginLeft: 8, fontWeight: 600 }}>€ {priceEuro}</span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={priceEuro}
                  onChange={(e) => setPriceEuro(e.target.value)}
                  className="qr-input"
                  placeholder="es. 9,90"
                />
                {lastUpdated && (
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                    Ultimo aggiornamento: {lastUpdated.toLocaleString("it-IT")}
                  </div>
                )}
              </div>
              <button
                onClick={handleSavePrice}
                className="qr-button"
                disabled={savingPrice}
                title="Salva prezzo su Firestore"
              >
                {savingPrice ? "Salvataggio…" : "Salva prezzo"}
              </button>
            </div>
          </section>
          {/* ======= Fine gestione prezzo ======= */}

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
              <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} />
            </label>
            <label className="qr-label">
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={() => setTransparentBg((prev) => !prev)}
              />
              Sfondo trasparente
            </label>
            {!transparentBg && (
              <label className="qr-label">
                🧱 Sfondo:
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
              </label>
            )}
          </div>

          <div className="qr-upload">
            <label>
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
            <div className="qr-preview">
              <canvas ref={qrPreviewRef} width={256} height={256} />
            </div>
          )}

          {url && (
            <div>
              <button onClick={downloadPNG} className="qr-button">Scarica PNG</button>
              <button onClick={downloadPDF} className="qr-button">Scarica PDF</button>
              <button onClick={downloadPDFTrimmed} className="qr-button">Scarica PDF (ritagliato)</button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
};

export default QRCodeGenerator;
