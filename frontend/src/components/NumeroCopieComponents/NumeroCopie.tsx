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
}

const NumeroCopie: React.FC<PropsContainer> = ({ onSendData }) => {
  const theme = useMantineTheme();
  const [copies, setCopies] = React.useState<number>(1);

  const handleChange = (v: number | string) => {
    const next = typeof v === "number" && v >= 1 ? v : 1;
    setCopies(next);
    onSendData(next);
  };

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

      <Stack gap="xs">
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
      </Stack>
    </Card>
  );
};

export default React.memo(NumeroCopie);
