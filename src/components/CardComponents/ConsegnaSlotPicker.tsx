// ✅ 1) Crea questo componente UNA SOLA VOLTA e riusalo in A4 e A3
// src/components/RiepilogoOrdineComponents/ConsegnaSlotPicker.tsx

import React from "react";
import { Alert, Box, Button, Card, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconInfoCircle } from "@tabler/icons-react";

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DeliverySlot = {
  id: string;
  weekday: Weekday;
  dateISO: string;
  dayLabel: string;
  timeRange: string;
};

type Props = {
  title: string;
  slots: DeliverySlot[];
  selectedId: string | null;
  onChange: (slotId: string) => void;
  hint?: string;
  disabled?: boolean;
};

export default function ConsegnaSlotPicker({
  title,
  slots,
  selectedId,
  onChange,
  hint = "Seleziona uno slot per procedere.",
  disabled = false,
}: Props) {
  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="xs">
        <Text fw={800}>{title}</Text>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {slots.map((slot) => {
            const selected = slot.id === selectedId;
            return (
              <Button
                key={slot.id}
                variant={selected ? "light" : "default"}
                color={selected ? "yellow" : "gray"}
                onClick={() => onChange(slot.id)}
                disabled={disabled}
                styles={{ inner: { justifyContent: "space-between" } }}
              >
                <Box>
                  <Text fw={800} size="sm">
                    {slot.dayLabel}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {slot.timeRange}
                  </Text>
                </Box>

                {selected && (
                  <ThemeIcon variant="light" color="yellow" radius="xl" size="sm">
                    <IconCheck size={14} />
                  </ThemeIcon>
                )}
              </Button>
            );
          })}
        </SimpleGrid>

        {!selectedId && (
          <Alert color="yellow" variant="light" icon={<IconInfoCircle size={18} />}>
            {hint}
          </Alert>
        )}
      </Stack>
    </Card>
  );
}
