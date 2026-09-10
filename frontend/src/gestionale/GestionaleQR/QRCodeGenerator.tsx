import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";

// ⬇️ Mantine
import {
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  ColorInput,
  FileButton,
  Badge,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconDownload, IconFileTypePdf, IconTrash, IconUpload } from "@tabler/icons-react";

// ⬇️ PV
import Header from "../../components/HeaderComponents/Header";
import Footer from "../../components/FooterComponents/Footer";


const QRCodeGenerator: React.FC = () => {
  const [url, setUrl] = useState("");
  const [fgColor, setFgColor] = useState("#000000");
  const [transparentBg, setTransparentBg] = useState(true);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const qrPreviewRef = useRef<HTMLCanvasElement | null>(null);

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

  const handleImageUpload = (file: File | null) => {
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

  const canDownload = Boolean(url);

  return (
    <>
      <Header />

      <Box component="main" py={28}>
        <Container size="md">
          <Stack gap="md">
            <Group justify="space-between" align="flex-end">
              <div>
                <Title order={2} c="white">Crea Codice QR</Title>
                <Text size="sm" c="dimmed">
                  Genera QR con colori, sfondo trasparente e logo centrale. Download in PNG o PDF.
                </Text>
              </div>
              <Badge variant="light">Gestionale</Badge>
            </Group>

            <Divider />

            <Card withBorder radius="md" p="md">
              <Stack gap="md">
                <TextInput
                  label="URL"
                  placeholder="Inserisci un URL"
                  value={url}
                  onChange={(e) => setUrl(e.currentTarget.value)}
                />

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <ColorInput
                    label="Colore QR"
                    value={fgColor}
                    onChange={setFgColor}
                    format="hex"
                  />

                  <Stack gap={8}>
                    <Switch
                      label="Sfondo trasparente"
                      checked={transparentBg}
                      onChange={(e) => setTransparentBg(e.currentTarget.checked)}
                    />
                    {!transparentBg && (
                      <ColorInput
                        label="Colore sfondo"
                        value={bgColor}
                        onChange={setBgColor}
                        format="hex"
                      />
                    )}
                  </Stack>
                </SimpleGrid>

                <Group justify="space-between" align="center">
                  <Group gap="sm">
                    <FileButton onChange={handleImageUpload} accept="image/*">
                      {(props) => (
                        <Button leftSection={<IconUpload size={16} />} variant="light" {...props}>
                          Immagine centrale
                        </Button>
                      )}
                    </FileButton>

                    {imageSrc && (
                      <Tooltip label="Rimuovi immagine">
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => setImageSrc(null)}
                          aria-label="Rimuovi immagine"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>

                  <Group gap="sm">
                    <Button
                      leftSection={<IconDownload size={16} />}
                      onClick={downloadPNG}
                      disabled={!canDownload}
                    >
                      PNG
                    </Button>
                    <Button
                      leftSection={<IconFileTypePdf size={16} />}
                      onClick={downloadPDF}
                      disabled={!canDownload}
                      variant="light"
                    >
                      PDF
                    </Button>
                    <Button
                      leftSection={<IconFileTypePdf size={16} />}
                      onClick={downloadPDFTrimmed}
                      disabled={!canDownload}
                      variant="outline"
                    >
                      PDF ritagliato
                    </Button>
                  </Group>
                </Group>

                {url && (
                  <Group justify="center" mt={6}>
                    <Card withBorder radius="md" p="md">
                      <canvas ref={qrPreviewRef} width={256} height={256} />
                    </Card>
                  </Group>
                )}
              </Stack>
            </Card>
          </Stack>
        </Container>
      </Box>

      <Footer />
    </>
  );
};

export default QRCodeGenerator;
