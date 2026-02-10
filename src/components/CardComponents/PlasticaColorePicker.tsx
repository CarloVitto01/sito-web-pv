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
  TextInput,
  Tooltip,
  Divider,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

export type PlasticaColor = {
  id: string;
  name: string;        // nome mostrato (es. "Rosso")
  hex: string;         // colore preview
  description?: string; // opzionale (es. "Lucida / Opaca", ecc.)
  disabled?: boolean;
};

type Props = {
  label?: string;
  colors?: PlasticaColor[];
  value?: string | null;                 // id selezionato (controlled)
  defaultValue?: string | null;          // id selezionato (uncontrolled)
  onChange?: (color: PlasticaColor | null) => void;
  searchable?: boolean;
  columns?: { base?: number; sm?: number; md?: number; lg?: number };
  withPreviewCard?: boolean;
};

const DEFAULT_COLORS: PlasticaColor[] = [
  { id: "nero", name: "Nero", hex: "#111111" },
  { id: "bianco", name: "Bianco", hex: "#f2f2f2" },
  { id: "rosso", name: "Rosso", hex: "#d11f2a" },
  { id: "blu", name: "Blu", hex: "#1d4ed8" },
  { id: "verde", name: "Verde", hex: "#16a34a" },
  { id: "giallo", name: "Giallo", hex: "#facc15" },
  { id: "arancione", name: "Arancione", hex: "#f97316" },
  { id: "viola", name: "Viola", hex: "#7c3aed" },
  { id: "trasparente", name: "Trasparente", hex: "#cbd5e1", description: "Effetto trasparente" },
];

export default function PlasticaColorePicker({
  label = "Scegli il colore della plastica",
  colors = DEFAULT_COLORS,
  value,
  defaultValue = null,
  onChange,
  searchable = true,
  columns = { base: 2, sm: 3, md: 4, lg: 5 },
  withPreviewCard = true,
}: Props) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string | null>(defaultValue);
  const selectedId = isControlled ? (value ?? null) : internal;

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return colors;
    return colors.filter((c) => {
      const t = `${c.name} ${c.description ?? ""} ${c.id}`.toLowerCase();
      return t.includes(q);
    });
  }, [colors, query]);

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

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text fw={700}>{label}</Text>
          {selected ? (
            <Badge variant="light" radius="sm">
              Selezionato: {selected.name}
            </Badge>
          ) : (
            <Badge variant="light" color="gray" radius="sm">
              Nessuna selezione
            </Badge>
          )}
        </Group>

        {searchable && (
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Cerca colore..."
          />
        )}

        <SimpleGrid cols={columns}>
          {filtered.map((c) => {
            const active = c.id === selectedId;
            const disabled = !!c.disabled;

            const btn = (
              <UnstyledButton
                key={c.id}
                onClick={() => !disabled && setSelected(c)}
                style={{
                  opacity: disabled ? 0.45 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                <Box
                  p="sm"
                  style={{
                    borderRadius: 12,
                    border: active
                      ? "2px solid rgba(209,171,99,0.9)"
                      : "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.02)",
                    transition: "transform .15s ease, border-color .15s ease",
                  }}
                >
                  <Group justify="space-between" align="center" gap="xs">
                    <Group gap="xs" wrap="nowrap">
                      <Box
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          background: c.hex,
                          border: "1px solid rgba(0,0,0,0.25)",
                        }}
                      />
                      <Box>
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
                        }}
                      >
                        <IconCheck size={14} />
                      </Box>
                    ) : (
                      <Box style={{ width: 22, height: 22 }} />
                    )}
                  </Group>
                </Box>
              </UnstyledButton>
            );

            return disabled ? (
              <Tooltip key={c.id} label="Non disponibile" withArrow>
                <Box>{btn}</Box>
              </Tooltip>
            ) : (
              <React.Fragment key={c.id}>{btn}</React.Fragment>
            );
          })}
        </SimpleGrid>

        {withPreviewCard && (
          <>
            <Divider />
            <Group align="center" justify="space-between">
              <Group gap="sm">
                <Box
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: selected?.hex ?? "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />
                <Box>
                  <Text fw={700}>{selected?.name ?? "Scegli un colore"}</Text>
                  <Text size="sm" c="dimmed">
                    {selected?.description ?? (selected ? selected.hex : "Seleziona un'opzione dalla griglia")}
                  </Text>
                </Box>
              </Group>

              <UnstyledButton
                onClick={() => setSelected(null)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <Text size="sm">Reset</Text>
              </UnstyledButton>
            </Group>
          </>
        )}
      </Stack>
    </Card>
  );
}
