import React from "react";
import { Card, Group, SegmentedControl, Text, useMantineTheme } from "@mantine/core";
import { IconCheck, IconCash, IconBrandPaypal } from "@tabler/icons-react";

export type PaymentMethodUI = "cash" | "paypal" | null;

type Props = {
  value: PaymentMethodUI;
  onChange: (v: Exclude<PaymentMethodUI, null>) => void;
  title?: string;
  hint?: string;
};

export default function PaymentMethodPicker({
  value,
  onChange,
  title = "METODO DI PAGAMENTO:",
  hint = "Seleziona un’opzione",
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
        <Text fw={900} tt="uppercase" style={{ letterSpacing: 0.3, fontSize: 13, color: theme.colors.dark[7] }}>
          {title}
        </Text>

        <Text size="xs" fw={700} style={{ letterSpacing: 0.2, color: theme.colors.gray[6] }}>
          {hint}
        </Text>
      </Group>

      <SegmentedControl
        value={value ?? ""}
        onChange={(v) => onChange(v as Exclude<PaymentMethodUI, null>)}
        fullWidth
        radius="md"
        data={[
          {
            value: "cash",
            label: (
              <Group gap={8} justify="center" wrap="nowrap">
                <IconCash size={16} />
                <Text fw={800}>Contanti</Text>
                {value === "cash" ? <IconCheck size={16} color={theme.colors.yellow[6]} /> : null}
              </Group>
            ),
          },
          {
            value: "paypal",
            label: (
              <Group gap={8} justify="center" wrap="nowrap">
                <IconBrandPaypal size={16} />
                <Text fw={800}>PayPal</Text>
                {value === "paypal" ? <IconCheck size={16} color={theme.colors.yellow[6]} /> : null}
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
