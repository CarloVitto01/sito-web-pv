// src/components/RiepilogoOrdineComponents/ConsegnaSlotPicker.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  SimpleGrid,
  Stack,
  Text,
  Checkbox,
  Group,
} from "@mantine/core";

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DeliverySlot = {
  id: string;
  weekday: Weekday;
  dateISO: string;
  dayLabel: string;
  timeRange: string;
};

type Props = {
  slots: DeliverySlot[];
  selectedId: string | null;
  onChange: (slotId: string | null) => void;

  disabled?: boolean;

  /** obbligatorio: esporta all’esterno la risposta sì/no */
  onStudentChange: (isStudent: boolean | null) => void;

  /** testo slot non selezionato (solo se Sì) */
  hint?: string;

  /** testo quando No */
  noDeliveryText?: string;
};

export default function ConsegnaSlotPicker({
  slots,
  selectedId,
  onChange,
  disabled = false,
  onStudentChange,
  hint = "Seleziona uno slot di consegna per continuare.",
  noDeliveryText = "Nessuna consegna prevista: puoi procedere al pagamento.",
}: Props) {
  const [isStudent, setIsStudent] = useState<boolean | null>(null);

  // ✅ comunica sempre al parent lo stato sì/no/null
  useEffect(() => {
    onStudentChange(isStudent);
  }, [isStudent, onStudentChange]);

  const mustAnswer = isStudent === null;

  // ✅ se l’utente passa a "No", azzera lo slot
  useEffect(() => {
    if (isStudent === false && selectedId) onChange(null);
  }, [isStudent, selectedId, onChange]);

  // ✅ gestione “mutua esclusione” tra checkbox Sì/No
  const yesChecked = isStudent === true;
  const noChecked = isStudent === false;

  const hasSlots = useMemo(() => slots?.length > 0, [slots]);

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="md">
        {/* ✅ DOMANDA OBBLIGATORIA */}
        <Stack gap={6}>
          <Text size="sm" fw={700}>
            Sei uno studente universitario di Lecce?
          </Text>

          <Group gap="md">
            <Checkbox
              label="Sì"
              checked={yesChecked}
              disabled={disabled}
              onChange={(e) => {
                const checked = e.currentTarget.checked;
                setIsStudent(checked ? true : null);
              }}
            />

            <Checkbox
              label="No"
              checked={noChecked}
              disabled={disabled}
              onChange={(e) => {
                const checked = e.currentTarget.checked;
                setIsStudent(checked ? false : null);
              }}
            />
          </Group>

          {mustAnswer && (
            <Alert color="yellow" variant="light">
              Seleziona obbligatoriamente “Sì” oppure “No” per continuare.
            </Alert>
          )}
        </Stack>

        {/* ✅ SE "Sì" -> slot consegna */}
        {isStudent === true && (
          <Stack gap="sm">
            {!hasSlots ? (
              <Alert color="gray" variant="light">
                Nessuno slot disponibile al momento.
              </Alert>
            ) : (
              <>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  {slots.map((slot) => {
                    const selected = slot.id === selectedId;

                    return (
                      <Button
                        key={slot.id}
                        variant={selected ? "light" : "default"}
                        color={selected ? "gold" : "gray"}
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
                      </Button>
                    );
                  })}
                </SimpleGrid>

                {!selectedId && (
                  <Alert color="yellow" variant="light">
                    {hint}
                  </Alert>
                )}
              </>
            )}
          </Stack>
        )}

        {/* ✅ SE "No" -> nessuna consegna */}
        {isStudent === false && (
          <Alert color="gray" variant="light">
            {noDeliveryText}
          </Alert>
        )}
      </Stack>
    </Card>
  );
}