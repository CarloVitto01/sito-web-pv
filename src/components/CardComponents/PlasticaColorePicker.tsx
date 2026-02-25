// src/components/PlasticaColorePicker/PlasticaColorePicker.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Box, Card, Group, Stack, Text, SimpleGrid, UnstyledButton, Badge, Tooltip, Divider } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

export type PlasticaColor = {
  id: string;
  name: string;
  hex: string;
  description?: string;
  disabled?: boolean;
};

type Props = {
  label?: string;
  colors: PlasticaColor[];
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (color: PlasticaColor | null) => void;
  columns?: { base?: number; sm?: number; md?: number; lg?: number };
  withPreviewCard?: boolean;
  resetLabel?: string;
  emptyHint?: string;

  /** ✅ nuovo: disabilita tutto il picker (non solo i singoli colori) */
  disabled?: boolean;
  /** ✅ nuovo: testo mostrato quando disabilitato */
  disabledHint?: string;
};

export default function PlasticaColorePicker({
  label = "Plastica copertina",
  colors,
  value,
  defaultValue = null,
  onChange,
  columns = { base: 2, sm: 3, md: 4, lg: 5 },
  withPreviewCard = true,
  resetLabel = "Rimuovi selezione",
  emptyHint = "(Se non viene selezionato, la copertina sarà trasparente)",

  disabled = false,
  disabledHint = "Opzione non disponibile con la rilegatura selezionata.",
}: Props) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string | null>(defaultValue);
  const selectedId = isControlled ? (value ?? null) : internal;

  const selected = useMemo(() => colors.find((c) => c.id === selectedId) ?? null, [colors, selectedId]);

  const setSelected = (next: PlasticaColor | null) => {
    const nextId = next?.id ?? null;
    if (!isControlled) setInternal(nextId);
    onChange?.(next);
  };

  // se la lista cambia e il selezionato non esiste più
  useEffect(() => {
    if (selectedId && !colors.some((c) => c.id === selectedId)) {
      setSelected(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors]);

  // ✅ se disabilitato, azzera la selezione
  useEffect(() => {
    if (disabled && selectedId) {
      setSelected(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  const hasColors = Array.isArray(colors) && colors.length > 0;

  return (
    <Card
      withBorder
      radius="md"
      p="md"
      style={{
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? "none" : "auto", // blocca interazioni
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text fw={700}>{label}</Text>

          {disabled ? (
            <Badge variant="light" color="gray" radius="sm">
              Non disponibile
            </Badge>
          ) : selected ? (
            <Badge variant="light" radius="sm">
              Selezionato: {selected.name}
            </Badge>
          ) : (
            <Badge variant="light" color="gray" radius="sm">
              Nessuna selezione
            </Badge>
          )}
        </Group>

        {disabled && (
          <Text size="sm" c="dimmed">
            {disabledHint}
          </Text>
        )}

        {!hasColors ? (
          <Text size="sm" c="dimmed">
            Nessun colore disponibile.
          </Text>
        ) : (
          <SimpleGrid cols={columns}>
            {colors.map((c) => {
              const active = c.id === selectedId;
              const itemDisabled = !!c.disabled;

              const content = (
                <UnstyledButton
                  key={c.id}
                  onClick={() => !itemDisabled && setSelected(c)}
                  style={{ opacity: itemDisabled ? 0.45 : 1, cursor: itemDisabled ? "not-allowed" : "pointer" }}
                >
                  <Box
                    p="sm"
                    style={{
                      borderRadius: 12,
                      border: active ? "2px solid rgba(209,171,99,0.9)" : "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.02)",
                      transition: "transform .15s ease, border-color .15s ease",
                    }}
                  >
                    <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                        <Box
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            background: c.hex,
                            border: "1px solid rgba(0,0,0,0.25)",
                            flex: "0 0 auto",
                          }}
                        />
                        <Box style={{ minWidth: 0 }}>
                          <Text size="sm" fw={600} lineClamp={1}>
                            {c.name}
                          </Text>
                          {c.description && (
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {c.description}
                            </Text>
                          )}
                        </Box>
                      </Group>

                      {active ? (
                        <Box
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            display: "grid",
                            placeItems: "center",
                            background: "rgba(209,171,99,0.18)",
                            border: "1px solid rgba(209,171,99,0.55)",
                            flex: "0 0 auto",
                          }}
                        >
                          <IconCheck size={14} />
                        </Box>
                      ) : (
                        <Box style={{ width: 22, height: 22, flex: "0 0 auto" }} />
                      )}
                    </Group>
                  </Box>
                </UnstyledButton>
              );

              return itemDisabled ? (
                <Tooltip key={c.id} label="Non disponibile" withArrow>
                  <Box>{content}</Box>
                </Tooltip>
              ) : (
                <React.Fragment key={c.id}>{content}</React.Fragment>
              );
            })}
          </SimpleGrid>
        )}

        {withPreviewCard && (
          <>
            <Divider />
            <Group align="center" justify="space-between" wrap="nowrap">
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                <Box
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: selected?.hex ?? "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    flex: "0 0 auto",
                  }}
                />
                <Box style={{ minWidth: 0 }}>
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {selected?.description ?? (selected ? selected.hex : emptyHint)}
                  </Text>
                </Box>
              </Group>

              <UnstyledButton
                onClick={() => setSelected(null)}
                disabled={!selectedId || disabled}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  opacity: selectedId && !disabled ? 1 : 0.5,
                  cursor: selectedId && !disabled ? "pointer" : "not-allowed",
                  flex: "0 0 auto",
                }}
              >
                <Text size="sm">{resetLabel}</Text>
              </UnstyledButton>
            </Group>
          </>
        )}
      </Stack>
    </Card>
  );
}