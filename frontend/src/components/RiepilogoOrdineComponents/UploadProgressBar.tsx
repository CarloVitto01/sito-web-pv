import React, { useEffect, useState } from "react";
import { Progress, Stack, Text } from "@mantine/core";

export type UploadProgressState = {
  loadedBytes: number;
  totalBytes: number;
  startedAt: number;
};

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function formatEta(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m} min ${rem} sec`;
}

/**
 * Barra di avanzamento upload reale: MB caricati/totali e tempo residuo stimato dalla velocita'
 * media dall'inizio del trasferimento. Se uploadProgress e' assente (upload gia' concluso, in attesa
 * che il server finalizzi l'ordine) mostra un fallback indeterminato invece di inventare percentuali.
 */
const UploadProgressBar: React.FC<{ uploadProgress: UploadProgressState | null }> = ({ uploadProgress }) => {
  // Forza un re-render periodico: senza, il countdown si aggiornerebbe solo ai (rari) eventi
  // xhr.upload.onprogress e sembrerebbe fermo tra un chunk e l'altro.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!uploadProgress) return;
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [uploadProgress]);

  if (!uploadProgress) {
    return (
      <Stack gap="xs">
        <Text size="sm" style={{ color: "rgba(255,255,255,.55)" }}>
          Finalizzazione dell'ordine in corso…
        </Text>
        <Progress value={100} color="gold" animated />
      </Stack>
    );
  }

  const { loadedBytes, totalBytes, startedAt } = uploadProgress;
  const percent = totalBytes > 0 ? Math.min(100, (loadedBytes / totalBytes) * 100) : 0;
  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  const speedBytesPerSec = elapsedSeconds > 0.5 && loadedBytes > 0 ? loadedBytes / elapsedSeconds : 0;
  const remainingBytes = Math.max(0, totalBytes - loadedBytes);
  const etaLabel =
    speedBytesPerSec > 0 && percent < 100 ? ` — circa ${formatEta(remainingBytes / speedBytesPerSec)} rimanenti` : "";

  return (
    <Stack gap={6}>
      <Text size="sm" style={{ color: "rgba(255,255,255,.55)" }}>
        Caricamento PDF: {formatMB(loadedBytes)} / {formatMB(totalBytes)} MB{etaLabel}
      </Text>
      <Progress value={percent} color="gold" />
    </Stack>
  );
};

export default UploadProgressBar;
