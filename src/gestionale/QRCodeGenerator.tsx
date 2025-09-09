import React, { useRef, useState, useEffect } from "react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import "./QRCodeGenerator.css";

// ⬇️ Aggiunte PV
import Header from "../components/HeaderComponents/Header";
import Footer from "../components/FooterComponents/Footer";

const QRCodeGenerator: React.FC = () => {
  const [url, setUrl] = useState("");
  const [fgColor, setFgColor] = useState("#000000");
  const [transparentBg, setTransparentBg] = useState(true);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const qrPreviewRef = useRef<HTMLCanvasElement | null>(null);

  const generateCanvas = async (): Promise<HTMLCanvasElement> => {
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
    if (ctx && imageSrc) {
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve) => (img.onload = resolve));
      ctx.drawImage(img, 96, 96, 64, 64); // centro
    }

    return canvas;
  };

  const downloadPNG = async () => {
    try {
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
      if (ctx && imageSrc) {
        const img = new Image();
        img.src = imageSrc;
        await new Promise((resolve) => (img.onload = resolve));
        ctx.drawImage(img, 96, 96, 64, 64); // centro
      }
    };

    updatePreview();
  }, [url, fgColor, bgColor, transparentBg, imageSrc]);

  return (
    <>
      <Header />

      <main className="pv-main">
        <div className="qr-container">
          <h2 className="qr-title">Genera Codice QR</h2>

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
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
};

export default QRCodeGenerator;
