import React from "react";
import {
  Card,
  Group,
  SegmentedControl,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

export type PickerOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

type Props = {
  title: string; // es: "FORMATO:"
  hint?: string; // es: "Seleziona un’opzione"
  value: string; // valore corrente
  onChange: (v: string) => void;
  options: PickerOption[];
};

export default function OptionPicker({
  title,
  hint = "Seleziona un’opzione",
  value,
  onChange,
  options,
}: Props) {
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
        <Text
          fw={900}
          tt="uppercase"
          style={{
            letterSpacing: 0.3,
            fontSize: 13,
            color: theme.colors.dark[7],
          }}
        >
          {title}
        </Text>

        <Text
          size="xs"
          fw={700}
          style={{ letterSpacing: 0.2, color: theme.colors.gray[6] }}
        >
          {hint}
        </Text>
      </Group>

      <SegmentedControl
        value={value}
        onChange={onChange}
        fullWidth
        radius="md"
        data={options.map((o) => ({
          value: o.value,
          disabled: o.disabled,
          label: (
            <Group gap={8} justify="center" wrap="nowrap">
              {o.icon}
              <Text fw={800}>{o.label}</Text>
              {value === o.value ? (
                <IconCheck size={16} color={theme.colors.yellow[6]} />
              ) : null}
            </Group>
          ),
        }))}
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
