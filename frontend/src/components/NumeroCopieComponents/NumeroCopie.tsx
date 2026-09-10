// src/pages/NumeroCopieComponents/NumeroCopie.tsx
import React from "react";
import {
  Card,
  Group,
  NumberInput,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";

interface PropsContainer {
  onSendData: (value: number) => void;
  hideTitle?: boolean;
  /** Se true, non disegna la Card esterna (bordo/ombra): per essere annidato in un pannello padre. */
  bare?: boolean;
}

const NumeroCopie: React.FC<PropsContainer> = ({ onSendData, hideTitle = false, bare = false }) => {
  const theme = useMantineTheme();
  const [copies, setCopies] = React.useState<number>(1);

  const handleChange = (v: number | string) => {
    const next = typeof v === "number" && v >= 1 ? v : 1;
    setCopies(next);
    onSendData(next);
  };

  const input = (
    <NumberInput
      value={copies}
      onChange={handleChange}
      min={1}
      step={1}
      allowDecimal={false}
      clampBehavior="strict"
      size="md"
      styles={{
        input: {
          fontWeight: 800,
          textAlign: "center",
          fontSize: 16,
        },
      }}
    />
  );

  if (bare) return input;

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
          <Text
            fw={900}
            tt="uppercase"
            style={{
              letterSpacing: 0.3,
              fontSize: 13,
              color: theme.colors.dark[7],
            }}
          >
            Numero copie
          </Text>

          <Text size="xs" fw={700} c="dimmed">
            minimo 1
          </Text>
        </Group>
      )}

      <Stack gap="xs">{input}</Stack>
    </Card>
  );
};

export default React.memo(NumeroCopie);
