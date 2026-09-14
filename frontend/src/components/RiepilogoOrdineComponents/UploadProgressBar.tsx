import React, { useEffect, useState } from "react";
import { Progress, Stack, Text } from "@mantine/core";

export type UploadProgressState = {
  loadedBytes: number;
  totalBytes: number;
  startedAt: number;
};

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toLocaleString("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(seconds));

  if (safeSeconds < 60) {
    return `${safeSeconds} sec`;
  }

  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes} min ${remainingSeconds} sec`;
}

const UploadProgressBar: React.FC<{
  uploadProgress: UploadProgressState | null;
}> = ({ uploadProgress }) => {
  const [, tick] = useState(0);
  const hasProgress = uploadProgress !== null;

  useEffect(() => {
    if (!hasProgress) return;

    const intervalId = window.setInterval(() => {
      tick((value) => value + 1);
    }, 500);

    return () => window.clearInterval(intervalId);
  }, [hasProgress]);

  const containerStyle: React.CSSProperties = {
    padding: 14,
    border: "1px solid #e2d7bf",
    borderRadius: 12,
    background: "#fffaf0",
    color: "#182331",
  };

  if (!uploadProgress) {
    return (
      <Stack gap={10} style={containerStyle} role="status">
        <Text size="sm" fw={600} c="#182331">
          Finalizzazione dell’ordine…
        </Text>

        <Progress
          value={100}
          color="gold"
          animated
          size="sm"
          radius="xl"
          aria-label="Finalizzazione dell’ordine in corso"
          aria-valuenow={undefined}
        />

        <Text size="xs" c="#657180">
          Attendi la conferma prima di chiudere la pagina.
        </Text>
      </Stack>
    );
  }

  const { loadedBytes, totalBytes, startedAt } = uploadProgress;

  const total = Number.isFinite(totalBytes)
    ? Math.max(0, totalBytes)
    : 0;

  const loaded = Number.isFinite(loadedBytes)
    ? Math.max(0, total > 0 ? Math.min(loadedBytes, total) : loadedBytes)
    : 0;

  const percent = total > 0 ? (loaded / total) * 100 : 0;
  const uploadComplete = total > 0 && loaded >= total;

  const elapsedSeconds =
    Number.isFinite(startedAt) && startedAt > 0
      ? Math.max(0, (Date.now() - startedAt) / 1000)
      : 0;

  const speedBytesPerSecond =
    elapsedSeconds > 0.5 && loaded > 0
      ? loaded / elapsedSeconds
      : 0;

  const remainingBytes = Math.max(0, total - loaded);

  const remainingSeconds =
    total > 0 && speedBytesPerSecond > 0
      ? remainingBytes / speedBytesPerSecond
      : null;

  const timeLabel = uploadComplete
    ? "Trasferimento completato. Attendo conferma dal server…"
    : remainingSeconds !== null
      ? `Tempo rimanente stimato: circa ${formatTime(remainingSeconds)}`
      : "Calcolo del tempo rimanente…";

  return (
    <Stack gap={10} style={containerStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <Text size="sm" fw={700} c="#182331">
          {uploadComplete ? "PDF trasferiti" : "Caricamento PDF"}
        </Text>

        <Text
          size="sm"
          fw={700}
          c="#896527"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {total > 0
            ? `${uploadComplete ? 100 : Math.floor(percent)}%`
            : "In corso"}
        </Text>
      </div>

      <Progress
        value={total > 0 ? percent : 100}
        animated={total === 0}
        color="gold"
        size="md"
        radius="xl"
        aria-label="Caricamento dei PDF"
        aria-valuenow={total > 0 ? percent : undefined}
        aria-valuetext={
          total > 0
            ? `${formatMB(loaded)} MB caricati su ${formatMB(total)} MB`
            : `${formatMB(loaded)} MB caricati`
        }
      />

      <Text
        size="sm"
        fw={600}
        c="#182331"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {formatMB(loaded)}
        {total > 0 ? ` / ${formatMB(total)} MB` : " MB caricati"}
      </Text>

      <Text size="xs" c="#657180">
        {timeLabel}
      </Text>
    </Stack>
  );
};

export default UploadProgressBar;