import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../backend/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
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

type PlasticaColore = {
  id: string;
  name: string;
  hex: string;
  priceEuro: number;
  enabled: boolean;
  order: number;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const COLLECTION = "configPlastiche";
const DOC = "colors";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number, d = 2) => (Number.isFinite(n) ? Number(n.toFixed(d)) : 0);

const sanitizeId = (s: string) =>
  (s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9 -]/g, "");

// ✅ niente preimpostati
const emptyColors: PlasticaColore[] = [];

const isValidHex = (hex: string) => /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test((hex || "").trim());

const PlasticheGestionale: React.FC = () => {
  const [colors, setColors] = useState<PlasticaColore[]>(emptyColors);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  // form aggiunta
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#d1ab63");
  const [newPrice, setNewPrice] = useState<number>(0);

  useEffect(() => {
    const ref = doc(db, COLLECTION, DOC);
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        setLoadError(null);

        if (snap.exists()) {
          const d = snap.data() as any;
          const arr: PlasticaColore[] = Array.isArray(d?.items) ? d.items : emptyColors;

          const cleaned = arr
            .filter((c) => c && typeof c.id === "string")
            .map((c, idx) => ({
              id: String(c.id),
              name: typeof c.name === "string" ? c.name : String(c.id),
              hex: typeof c.hex === "string" ? c.hex : "#cbd5e1",
              priceEuro: typeof c.priceEuro === "number" ? c.priceEuro : 0,
              enabled: typeof c.enabled === "boolean" ? c.enabled : true,
              order: typeof c.order === "number" ? c.order : idx + 1,
            }))
            .sort((a, b) => a.order - b.order);

          setColors(cleaned);
        } else {
          // ✅ crea doc vuoto
          await setDoc(ref, { items: [] }, { merge: true }).catch(console.error);
          setColors([]);
        }

        setLoaded(true);
      },
      (err) => {
        console.error(err);
        setLoadError("Impossibile caricare la configurazione colori plastiche.");
        setLoaded(true);
      }
    );

    return () => unsub();
  }, []);

  const handleSave = async () => {
    try {
      setSaveState("saving");
      const ref = doc(db, COLLECTION, DOC);

      const cleaned = colors
        .map((c, idx) => ({
          ...c,
          id: sanitizeId(c.id) || `colore-${idx + 1}`,
          name: (c.name || "").trim() || c.id,
          hex: isValidHex(c.hex) ? c.hex.trim() : "#cbd5e1",
          priceEuro: clamp(round(Number(c.priceEuro || 0), 2), 0, 9999),
          enabled: !!c.enabled,
          order: Number.isFinite(c.order) ? c.order : idx + 1,
        }))
        .sort((a, b) => a.order - b.order);

      await setDoc(ref, { items: cleaned }, { merge: true });

      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2500);
    } catch (e) {
      console.error(e);
      setSaveState("error");
      window.setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  const addColor = () => {
    const name = newName.trim();
    const id = sanitizeId(name);
    if (!name || !id) return;
    if (!isValidHex(newHex)) return;
    if (colors.some((c) => c.id === id)) return;

    const nextOrder = (colors.reduce((m, c) => Math.max(m, c.order), 0) || 0) + 1;

    setColors((prev) => [
      ...prev,
      {
        id,
        name,
        hex: newHex,
        priceEuro: clamp(round(Number(newPrice || 0), 2), 0, 9999),
        enabled: true,
        order: nextOrder,
      },
    ]);

    setNewName("");
    setNewPrice(0);
    setNewHex("#d1ab63");
  };

  const removeColor = (id: string) => setColors((prev) => prev.filter((c) => c.id !== id));

  const updateColor = (id: string, patch: Partial<PlasticaColore>) =>
    setColors((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const previewEnabled = useMemo(
    () => colors.filter((c) => c.enabled).sort((a, b) => a.order - b.order),
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
                {COLLECTION}/{DOC}
              </Badge>
              {saveState === "saved" && <Badge color="green">Salvato</Badge>}
              {saveState === "error" && <Badge color="red">Errore</Badge>}
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
                      <Tooltip label="Usa la tavolozza per scegliere l'HEX. Il nome genera l'ID (slug).">
                        <ActionIcon variant="subtle" radius="xl" aria-label="Info">
                          <IconInfoCircle size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>

                    <Button leftSection={<IconPlus size={18} />} radius="lg" onClick={addColor}>
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
                        .sort((a, b) => a.order - b.order)
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
                                      id: {c.id}
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
                                  value={c.order}
                                  min={1}
                                  step={1}
                                  clampBehavior="strict"
                                  radius="lg"
                                  onChange={(v) => {
                                    const n = typeof v === "number" ? v : Number(v);
                                    updateColor(c.id, { order: clamp(Number.isFinite(n) ? n : 1, 1, 9999) });
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
