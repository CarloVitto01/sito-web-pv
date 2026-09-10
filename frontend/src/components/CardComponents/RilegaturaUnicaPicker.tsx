// ✅ components/CardComponents/RilegaturaUnicaPicker.tsx
// Stesso identico UI/UX di FormatoPicker (SegmentedControl + check giallo)
// - supporta disabled quando numeroPDF === 1
// - mostra hint diverso se disabilitato
// - mantiene stile coerente

import React from "react";
import {
  Card,
  Group,
  SegmentedControl,
  Text,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { IconCheck, IconLink, IconUnlink } from "@tabler/icons-react";

type Props = {
  value: "SI" | "NO";
  onChange: (v: "SI" | "NO") => void;
  hint?: string;
  disabled?: boolean;       // es: numeroPDF === 1
  disabledHint?: string;    // es: "Disponibile soltanto per 2 o più PDF"
  hideTitle?: boolean;
  /** Se true, non disegna la Card esterna (bordo/ombra): per essere annidato in un pannello padre. */
  bare?: boolean;
};

export default function RilegaturaUnicaPicker({
  value,
  onChange,
  hint = "Seleziona un’opzione",
  disabled = false,
  disabledHint = "Disponibile soltanto per 2 o più PDF",
  hideTitle = false,
  bare = false,
}: Props) {
  const theme = useMantineTheme();

  const control = (
    <SegmentedControl
      value={value}
      onChange={(v) => onChange(v as "SI" | "NO")}
      fullWidth
      radius="md"
      disabled={disabled}
      data={[
        {
          value: "SI",
          label: (
            <Group gap={8} justify="center" wrap="nowrap">
              <IconLink size={16} />
              <Text fw={800}>Sì</Text>
              {value === "SI" ? <IconCheck size={16} color={theme.colors.gold[6]} /> : null}
            </Group>
          ),
        },
        {
          value: "NO",
          label: (
            <Group gap={8} justify="center" wrap="nowrap">
              <IconUnlink size={16} />
              <Text fw={800}>No</Text>
              {value === "NO" ? <IconCheck size={16} color={theme.colors.gold[6]} /> : null}
            </Group>
          ),
        },
      ]}
      styles={{
        root: {
          background: theme.colors.gray[0],
          border: `1px solid ${theme.colors.gray[3]}`,
        },
        indicator: {
          background: theme.white,
          border: `1px solid ${theme.colors.gold[6]}`,
          boxShadow: theme.shadows.xs,
        },
        label: {
          paddingTop: 8,
          paddingBottom: 8,
        },
      }}
    />
  );

  const body = disabled ? (
    <Tooltip label={disabledHint} withArrow position="top" openDelay={200}>
      <div>{control}</div>
    </Tooltip>
  ) : (
    control
  );

  if (bare) return body;

  return (
    <Card
      withBorder
      radius="lg"
      p="md"
      style={{
        background: theme.white,
        borderColor: theme.colors.gray[3],
        boxShadow: theme.shadows.sm,
      }}
    >
      {!hideTitle && (
        <Group justify="space-between" align="baseline" mb="sm">
          <Text fw={900} tt="uppercase" style={{ letterSpacing: 0.3, fontSize: 13, color: theme.colors.dark[7] }}>
            RILEGATURA UNICA:
          </Text>

          <Text size="xs" fw={700} style={{ letterSpacing: 0.2, color: theme.colors.gray[6] }}>
            {disabled ? disabledHint : hint}
          </Text>
        </Group>
      )}

      {body}
    </Card>
  );
}
