// src/components/PlasticaColorePicker/PlasticaColorePicker.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  Group,
  Stack,
  Text,
  SimpleGrid,
  UnstyledButton,
  Badge,
  Tooltip,
  Divider,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
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
  /** Se true, non disegna la Card esterna (bordo/ombra): per essere annidato in un pannello padre. */
  bare?: boolean;
};

export default function PlasticaColorePicker({
  label = "Plastica copertina",
  colors,
  value,
  defaultValue = null,
  onChange,
  columns = { base: 1, sm: 2, md: 4, lg: 5 },
  withPreviewCard = true,
  resetLabel = "Rimuovi selezione",
  emptyHint = "Nessun colore selezionato: verrà applicata la plastica trasparente.",

  disabled = false,
  disabledHint = "Opzione non disponibile con la rilegatura selezionata.",
  bare = false,
}: Props) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string | null>(defaultValue);
  const selectedId = isControlled ? value ?? null : internal;

  const selected = useMemo(
    () => colors.find((c) => c.id === selectedId) ?? null,
    [colors, selectedId]
  );

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

  const body = (
      <Stack gap="sm" style={{ opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? "none" : "auto" }}>
        <Group justify="space-between" align="center" wrap="wrap">
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
              Plastica trasparente
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
                  style={{
                    opacity: itemDisabled ? 0.45 : 1,
                    cursor: itemDisabled ? "not-allowed" : "pointer",
                    width: "100%",
                  }}
                >
                  <Box
                    p={8}
                    style={{
                      borderRadius: 10,
                      border: active
                        ? "2px solid rgba(212,175,106,0.9)"
                        : "1px solid rgba(16,20,28,0.10)",
                      background: active ? "rgba(212,175,106,0.06)" : "transparent",
                      transition: "transform .15s ease, border-color .15s ease",
                    }}
                  >
                    <Group justify="space-between" align="center" gap={6} wrap="nowrap">
                      <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                        <Box
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 999,
                            background: c.hex,
                            border: "1px solid rgba(0,0,0,0.25)",
                            flex: "0 0 auto",
                          }}
                        />

                        <Box style={{ minWidth: 0 }}>
                          <Text size="xs" fw={600} lineClamp={1}>
                            {c.name}
                          </Text>

                          {c.description && (
                            <Text
                              size="xs"
                              c="dimmed"
                              lineClamp={isMobile ? 3 : 1}
                              style={{ lineHeight: 1.3, fontSize: 10.5 }}
                            >
                              {c.description}
                            </Text>
                          )}
                        </Box>
                      </Group>

                      {active ? (
                        <Box
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 999,
                            display: "grid",
                            placeItems: "center",
                            background: "rgba(212,175,106,0.18)",
                            border: "1px solid rgba(212,175,106,0.55)",
                            flex: "0 0 auto",
                          }}
                        >
                          <IconCheck size={10} />
                        </Box>
                      ) : (
                        <Box style={{ width: 16, height: 16, flex: "0 0 auto" }} />
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

            <Box
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "stretch" : "center",
                justifyContent: "space-between",
                gap: isMobile ? 12 : 14,
              }}
            >
              <Group gap={8} wrap="nowrap" align="flex-start" style={{ minWidth: 0, flex: 1 }}>
                <Box
                  style={{
                    width: isMobile ? 26 : 30,
                    height: isMobile ? 26 : 30,
                    borderRadius: 10,
                    background: selected?.hex ?? "rgba(16,20,28,0.06)",
                    border: "1px solid rgba(16,20,28,0.12)",
                    flex: "0 0 auto",
                    marginTop: 2,
                  }}
                />

                <Box style={{ minWidth: 0, flex: 1 }}>
                  <Stack gap={1}>
                    <Text size="xs" fw={700} style={{ lineHeight: 1.25 }}>
                      {selected ? selected.name : "Plastica trasparente"}
                    </Text>

                    <Text
                      size="xs"
                      c="dimmed"
                      style={{
                        lineHeight: 1.4,
                        whiteSpace: "normal",
                        overflowWrap: "break-word",
                      }}
                    >
                      {selected?.description ?? emptyHint}
                    </Text>
                  </Stack>
                </Box>
              </Group>

              <UnstyledButton
                onClick={() => setSelected(null)}
                disabled={!selectedId || disabled}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(16,20,28,0.12)",
                  opacity: selectedId && !disabled ? 1 : 0.5,
                  cursor: selectedId && !disabled ? "pointer" : "not-allowed",
                  flex: "0 0 auto",
                  width: isMobile ? "100%" : "auto",
                  textAlign: "center",
                }}
              >
                <Text size="xs">{resetLabel}</Text>
              </UnstyledButton>
            </Box>
          </>
        )}
      </Stack>
  );

  if (bare) return body;

  return (
    <Card
      withBorder
      radius="md"
      p={isMobile ? "sm" : "md"}
    >
      {body}
    </Card>
  );
}