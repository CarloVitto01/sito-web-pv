import React, { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../backend/apiClient";
import Header from "../../components/HeaderComponents/Header";

import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  NumberInput,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconAlertCircle, IconDeviceFloppy, IconInfoCircle, IconPlus, IconTrash } from "@tabler/icons-react";

type PlasticaColor = {
  id: number | null;
  name: string;
  hex: string;
  priceEuro: number;
  enabled: boolean;
  sortOrder: number;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const PLASTICHE_ENDPOINT = "/api/admin/plastiche";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number, d = 2) => (Number.isFinite(n) ? Number(n.toFixed(d)) : 0);

// ✅ niente preimpostati
const emptyColors: PlasticaColor[] = [];

const isValidHex = (hex: string) => /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test((hex || "").trim());

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.message || fallback : fallback;

const PlasticheGestionale: React.FC = () => {
  const [colors, setColors] = useState<PlasticaColor[]>(emptyColors);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [addState, setAddState] = useState<SaveState>("idle");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // form aggiunta
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#d1ab63");
  const [newPrice, setNewPrice] = useState<number>(0);

  const loadColors = async () => {
    try {
      const list = await api.get<PlasticaColor[]>(PLASTICHE_ENDPOINT);
      const cleaned = (Array.isArray(list) ? list : [])
        .map((c, idx) => ({
          id: typeof c.id === "number" ? c.id : null,
          name: typeof c.name === "string" ? c.name : "",
          hex: typeof c.hex === "string" ? c.hex : "#cbd5e1",
          priceEuro: typeof c.priceEuro === "number" ? c.priceEuro : 0,
          enabled: typeof c.enabled === "boolean" ? c.enabled : true,
          sortOrder: typeof c.sortOrder === "number" ? c.sortOrder : idx + 1,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);

      setColors(cleaned);
      setLoadError(null);
    } catch (e) {
      console.error(e);
      setLoadError(errorMessage(e, "Impossibile caricare la configurazione colori plastiche."));
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    loadColors();
  }, []);

  // Nel nuovo backend ogni colore e' una riga separata: salviamo tutte le righe correnti
  // con un upsert (POST) per riga, poi ricarichiamo la lista aggiornata dal server.
  const handleSave = async () => {
    try {
      setSaveState("saving");

      const cleaned = colors.map((c, idx) => ({
        id: c.id,
        name: (c.name || "").trim() || `Colore ${idx + 1}`,
        hex: isValidHex(c.hex) ? c.hex.trim() : "#cbd5e1",
        priceEuro: clamp(round(Number(c.priceEuro || 0), 2), 0, 9999),
        enabled: !!c.enabled,
        sortOrder: Number.isFinite(c.sortOrder) ? c.sortOrder : idx + 1,
      }));

      await Promise.all(cleaned.map((c) => api.post<PlasticaColor>(PLASTICHE_ENDPOINT, c)));
      await loadColors();

      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2500);
    } catch (e) {
      console.error(e);
      setSaveState("error");
      setLoadError(errorMessage(e, "Errore durante il salvataggio dei colori."));
      window.setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  const addColor = async () => {
    const name = newName.trim();
    if (!name) return;
    if (!isValidHex(newHex)) return;

    const nextOrder = (colors.reduce((m, c) => Math.max(m, c.sortOrder), 0) || 0) + 1;

    try {
      setAddState("saving");

      const payload: PlasticaColor = {
        id: null,
        name,
        hex: newHex,
        priceEuro: clamp(round(Number(newPrice || 0), 2), 0, 9999),
        enabled: true,
        sortOrder: nextOrder,
      };

      const saved = await api.post<PlasticaColor>(PLASTICHE_ENDPOINT, payload);

      setColors((prev) => [...prev, saved].sort((a, b) => a.sortOrder - b.sortOrder));

      setNewName("");
      setNewPrice(0);
      setNewHex("#d1ab63");
      setAddState("saved");
      window.setTimeout(() => setAddState("idle"), 2000);
    } catch (e) {
      console.error(e);
      setAddState("error");
      setLoadError(errorMessage(e, "Errore durante l'aggiunta del colore."));
      window.setTimeout(() => setAddState("idle"), 3000);
    }
  };

  const removeColor = async (id: number | null) => {
    if (id == null) {
      setColors((prev) => prev.filter((c) => c.id !== id));
      return;
    }

    try {
      setDeletingId(id);
      await api.delete<void>(`${PLASTICHE_ENDPOINT}/${id}`);
      setColors((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error(e);
      setLoadError(errorMessage(e, "Errore durante l'eliminazione del colore."));
    } finally {
      setDeletingId(null);
    }
  };

  const updateColor = (id: number | null, patch: Partial<PlasticaColor>) =>
    setColors((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const previewEnabled = useMemo(
    () => colors.filter((c) => c.enabled).sort((a, b) => a.sortOrder - b.sortOrder),
    [colors]
  );

  return (
    <Box>
      <Header />

      <Container size="lg" py="xl">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Stack gap={4}>
              <Title order={2} c="white">Gestione Plastiche</Title>
              <Text c="dimmed">Crea i colori per il picker in PdfPrintPage (A4).</Text>
            </Stack>

            <Group gap="sm">
              <Badge variant="light" color="gray">
                {PLASTICHE_ENDPOINT}
              </Badge>
              {saveState === "saved" && <Badge color="green">Salvato</Badge>}
              {saveState === "error" && <Badge color="red">Errore</Badge>}
              {addState === "saved" && <Badge color="green">Colore aggiunto</Badge>}
              {addState === "error" && <Badge color="red">Errore aggiunta</Badge>}
            </Group>
          </Group>

          {!loaded ? (
            <Card withBorder radius="lg" p="lg">
              <Text>Caricamento…</Text>
            </Card>
          ) : (
            <>
              {loadError && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" radius="lg" variant="light">
                  {loadError}
                </Alert>
              )}

              {/* Aggiunta colore */}
              <Card withBorder radius="lg" p="lg">
                <Stack gap="md">
                  <Group justify="space-between" wrap="wrap">
                    <Group gap="xs">
                      <Text fw={700}>Aggiungi colore</Text>
                      <Tooltip label="Usa la tavolozza per scegliere l'HEX. L'ID viene assegnato automaticamente dal server.">
                        <ActionIcon variant="subtle" radius="xl" aria-label="Info">
                          <IconInfoCircle size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>

                    <Button
                      leftSection={<IconPlus size={18} />}
                      radius="lg"
                      onClick={addColor}
                      loading={addState === "saving"}
                    >
                      Aggiungi
                    </Button>
                  </Group>

                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, md: 5 }}>
                      <TextInput
                        label="Nome"
                        placeholder="Es. Oro, Rosso, Verde..."
                        value={newName}
                        radius="lg"
                        onChange={(e) => setNewName(e.currentTarget.value)}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 3 }}>
                      <TextInput
                        label="HEX"
                        placeholder="#d1ab63"
                        value={newHex}
                        radius="lg"
                        error={newHex.length > 0 && !isValidHex(newHex)}
                        onChange={(e) => setNewHex(e.currentTarget.value)}
                        rightSection={
                          <Box
                            component="input"
                            type="color"
                            value={isValidHex(newHex) ? newHex : "#d1ab63"}
                            onChange={(e: any) => setNewHex(e.currentTarget.value)}
                            style={{
                              width: 34,
                              height: 24,
                              border: "none",
                              background: "transparent",
                              padding: 0,
                              cursor: "pointer",
                            }}
                            aria-label="Scegli colore"
                          />
                        }
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <NumberInput
                        label="Extra (€)"
                        description="Sovrapprezzo (opzionale)"
                        value={newPrice}
                        min={0}
                        step={0.05}
                        clampBehavior="strict"
                        thousandSeparator="."
                        decimalSeparator=","
                        fixedDecimalScale
                        decimalScale={2}
                        radius="lg"
                        onChange={(v) => {
                          const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
                          setNewPrice(clamp(Number.isFinite(n) ? n : 0, 0, 9999));
                        }}
                      />
                    </Grid.Col>
                  </Grid>

                  <Alert color="gray" radius="lg" variant="light">
                    <Text size="sm">
                      <Text span fw={700}>Attivi:</Text>{" "}
                      {previewEnabled.length
                        ? previewEnabled.map((c) => `${c.name} (${c.hex})`).join(" • ")
                        : "Nessun colore creato"}
                    </Text>
                  </Alert>
                </Stack>
              </Card>

              {/* Lista colori */}
              <Card withBorder radius="lg" p="lg">
                <Stack gap="md">
                  <Group justify="space-between" wrap="wrap">
                    <Text fw={700}>Elenco colori</Text>

                    <Button
                      leftSection={<IconDeviceFloppy size={18} />}
                      radius="lg"
                      onClick={handleSave}
                      loading={saveState === "saving"}
                    >
                      Salva colori
                    </Button>
                  </Group>

                  <Divider />

                  {colors.length === 0 ? (
                    <Alert color="gray" radius="lg" variant="light">
                      Nessun colore presente. Aggiungine uno sopra e salva.
                    </Alert>
                  ) : (
                    <Stack gap="sm">
                      {colors
                        .slice()
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((c) => (
                          <Card key={c.id} withBorder radius="lg" p="md">
                            <Grid align="center" gutter="md">
                              <Grid.Col span={{ base: 12, md: 3 }}>
                                <Group gap="sm" wrap="nowrap">
                                  <Box
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 999,
                                      background: c.hex,
                                      border: "1px solid rgba(0,0,0,0.25)",
                                    }}
                                  />
                                  <Stack gap={2}>
                                    <TextInput
                                      label="Nome"
                                      value={c.name}
                                      radius="lg"
                                      onChange={(e) => updateColor(c.id, { name: e.currentTarget.value })}
                                    />
                                    <Text size="xs" c="dimmed" lineClamp={1}>
                                      id: {c.id ?? "nuovo"}
                                    </Text>
                                  </Stack>
                                </Group>
                              </Grid.Col>

                              <Grid.Col span={{ base: 12, md: 3 }}>
                                <TextInput
                                  label="HEX"
                                  value={c.hex}
                                  radius="lg"
                                  error={c.hex.length > 0 && !isValidHex(c.hex)}
                                  onChange={(e) => updateColor(c.id, { hex: e.currentTarget.value })}
                                  rightSection={
                                    <Box
                                      component="input"
                                      type="color"
                                      value={isValidHex(c.hex) ? c.hex : "#d1ab63"}
                                      onChange={(e: any) => updateColor(c.id, { hex: e.currentTarget.value })}
                                      style={{
                                        width: 34,
                                        height: 24,
                                        border: "none",
                                        background: "transparent",
                                        padding: 0,
                                        cursor: "pointer",
                                      }}
                                      aria-label="Scegli colore"
                                    />
                                  }
                                />
                              </Grid.Col>

                              <Grid.Col span={{ base: 12, md: 3 }}>
                                <NumberInput
                                  label="Extra (€)"
                                  value={c.priceEuro}
                                  min={0}
                                  step={0.05}
                                  clampBehavior="strict"
                                  thousandSeparator="."
                                  decimalSeparator=","
                                  fixedDecimalScale
                                  decimalScale={2}
                                  radius="lg"
                                  onChange={(v) => {
                                    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
                                    updateColor(c.id, { priceEuro: clamp(Number.isFinite(n) ? n : 0, 0, 9999) });
                                  }}
                                />
                              </Grid.Col>

                              <Grid.Col span={{ base: 12, md: 2 }}>
                                <NumberInput
                                  label="Ordine"
                                  value={c.sortOrder}
                                  min={1}
                                  step={1}
                                  clampBehavior="strict"
                                  radius="lg"
                                  onChange={(v) => {
                                    const n = typeof v === "number" ? v : Number(v);
                                    updateColor(c.id, { sortOrder: clamp(Number.isFinite(n) ? n : 1, 1, 9999) });
                                  }}
                                />
                              </Grid.Col>

                              <Grid.Col span={{ base: 12, md: 1 }}>
                                <Stack gap="xs" align="flex-end">
                                  <Switch
                                    label="Attivo"
                                    checked={c.enabled}
                                    onChange={(e) => updateColor(c.id, { enabled: e.currentTarget.checked })}
                                  />
                                  <Tooltip label="Rimuovi">
                                    <ActionIcon
                                      color="red"
                                      variant="subtle"
                                      radius="xl"
                                      aria-label="Rimuovi"
                                      loading={deletingId === c.id}
                                      onClick={() => removeColor(c.id)}
                                    >
                                      <IconTrash size={18} />
                                    </ActionIcon>
                                  </Tooltip>
                                </Stack>
                              </Grid.Col>
                            </Grid>
                          </Card>
                        ))}
                    </Stack>
                  )}
                </Stack>
              </Card>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default PlasticheGestionale;
