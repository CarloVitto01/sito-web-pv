// ✅ components/CardComponents/FormatoPicker.tsx
// Sostituisce le “card” del formato con un toggle pulito (Mantine)
// - niente immagini
// - stile coerente con il resto
// - usa highlight + icona check sul selezionato

import React from "react";
import { Card, Group, SegmentedControl, Text, useMantineTheme } from "@mantine/core";
import { IconCheck, IconFileText, IconDimensions } from "@tabler/icons-react";

type Props = {
  value: "A4" | "A3";
  onChange: (v: "A4" | "A3") => void;
  hint?: string;
};

export default function FormatoPicker({ value, onChange, hint = "Seleziona un’opzione" }: Props) {
  const theme = useMantineTheme();

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
      <Group justify="space-between" align="baseline" mb="sm">
        <Text fw={900} tt="uppercase" style={{ letterSpacing: 0.3, fontSize: 13, color: theme.colors.dark[7] }}>
          FORMATO:
        </Text>

        <Text size="xs" fw={700} style={{ letterSpacing: 0.2, color: theme.colors.gray[6] }}>
          {hint}
        </Text>
      </Group>

      <SegmentedControl
        value={value}
        onChange={(v) => onChange(v as "A4" | "A3")}
        fullWidth
        radius="md"
        data={[
          {
            value: "A4",
            label: (
              <Group gap={8} justify="center" wrap="nowrap">
                <IconFileText size={16} />
                <Text fw={800}>A4</Text>
                {value === "A4" ? <IconCheck size={16} color={theme.colors.yellow[6]} /> : null}
              </Group>
            ),
          },
          {
            value: "A3",
            label: (
              <Group gap={8} justify="center" wrap="nowrap">
                <IconDimensions size={16} />
                <Text fw={800}>A3</Text>
                {value === "A3" ? <IconCheck size={16} color={theme.colors.yellow[6]} /> : null}
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
            border: `1px solid ${theme.colors.yellow[6]}`,
            boxShadow: theme.shadows.xs,
          },
          label: {
            paddingTop: 12,
            paddingBottom: 12,
          },
        }}
      />
    </Card>
  );
}
