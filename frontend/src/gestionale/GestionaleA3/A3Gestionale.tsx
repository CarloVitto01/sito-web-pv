// src/gestionale/GestionaleA3/A3Gestionale.tsx
import React, { useEffect, useMemo, useState } from "react";
import { api, ApiError, openAuthedFile } from "../../backend/apiClient";

import Header from "../../components/HeaderComponents/Header";

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  Group,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconPlus,
  IconTrash,
  IconAlertTriangle,
  IconCheck,
  IconTool,
  IconCoin,
  IconPackage,
  IconFolder,
  IconChevronRight,
} from "@tabler/icons-react";

/* ===== Tipi ===== */
type CostiA3 = {
  grammaturaNormale: number;
  grammaturaCartoncino: number;
  biancoNero: number;
  colore: number;
  plastificazione: number;
};

type InterniA3 = {
  foglio: number;
  biancoNero: number;
  colore: number;
  plastificazione: number;
};

type CostoExtra = {
  id: string;
  nome: string;
  unita: "per_foglio" | "per_ordine" | "percentuale" | "per_fascicolo";
  costo: number;
  note?: string;
  attivo: boolean;
  campo?: string;
  match?: string;
};

type A3CostsResponse = CostiA3 & {
  interni: InterniA3;
  costiAcquisto: CostoExtra[];
};

type OrderFile = {
  id: number;
  fileIndex: number;
  originalFileName: string;
  pages: number;
  downloadUrl: string;
  plasticaId: number | null;
  plasticaName: string | null;
};

type OrderResponse = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  files: OrderFile[];
};

type Ordine = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  files: OrderFile[];
};

/* ===== Default ===== */
const defaultCostiA3: CostiA3 = {
  grammaturaNormale: 0.12,
  grammaturaCartoncino: 0.17,
  biancoNero: 0.03,
  colore: 0.13,
  plastificazione: 0.3,
};

const defaultInterniA3: InterniA3 = {
  foglio: 0.06,
  biancoNero: 0.01,
  colore: 0.03,
  plastificazione: 0.15,
};

const seedExtras: CostoExtra[] = [
  {
    id: crypto.randomUUID(),
    nome: "Scarto lavorazione",
    unita: "percentuale",
    costo: 2,
    note: "2% sul lordo",
    attivo: true,
  },
];

const fmtKeyLabel = (k: string) =>
  k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (m) => m.toUpperCase())
    .trim();

/* ===== Component ===== */
const A3Gestionale: React.FC = () => {
  const [costi, setCosti] = useState<CostiA3>(defaultCostiA3);
  const [interni, setInterni] = useState<InterniA3>(defaultInterniA3);
  const [costiAcquisto, setCostiAcquisto] = useState<CostoExtra[]>(seedExtras);

  const [ordini, setOrdini] = useState<Ordine[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  /* ===== Backend: config costi A3 ===== */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await api.get<A3CostsResponse>("/api/admin/config/a3-costs");
        if (!alive) return;

        setCosti({
          grammaturaNormale: Number(data?.grammaturaNormale ?? defaultCostiA3.grammaturaNormale) || 0,
          grammaturaCartoncino: Number(data?.grammaturaCartoncino ?? defaultCostiA3.grammaturaCartoncino) || 0,
          biancoNero: Number(data?.biancoNero ?? defaultCostiA3.biancoNero) || 0,
          colore: Number(data?.colore ?? defaultCostiA3.colore) || 0,
          plastificazione: Number(data?.plastificazione ?? defaultCostiA3.plastificazione) || 0,
        });

        const i = data?.interni ?? ({} as Partial<InterniA3>);
        setInterni({
          foglio: Number(i?.foglio ?? defaultInterniA3.foglio) || 0,
          biancoNero: Number(i?.biancoNero ?? defaultInterniA3.biancoNero) || 0,
          colore: Number(i?.colore ?? defaultInterniA3.colore) || 0,
          plastificazione: Number(i?.plastificazione ?? defaultInterniA3.plastificazione) || 0,
        });

        if (Array.isArray(data?.costiAcquisto)) {
          const safe: CostoExtra[] = data.costiAcquisto
            .map((x: any) => ({
              id: String(x.id ?? crypto.randomUUID()),
              nome: String(x.nome ?? ""),
              unita: (x.unita as CostoExtra["unita"]) ?? "per_ordine",
              costo: Number(x.costo ?? 0) || 0,
              note: x.note ? String(x.note) : "",
              attivo: Boolean(x.attivo ?? true),
              campo: x.campo ? String(x.campo) : "",
              match: x.match ? String(x.match) : "",
            }))
            .filter((x: CostoExtra) => x.nome.trim().length > 0);
          setCostiAcquisto(safe);
        } else {
          setCostiAcquisto(seedExtras);
        }
      } catch (err) {
        console.error("Errore caricamento costi A3:", err);
        if (!alive) return;
        setCosti(defaultCostiA3);
        setInterni(defaultInterniA3);
        setCostiAcquisto(seedExtras);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  /* ===== Backend: ordini A3 ===== */
  useEffect(() => {
    let alive = true;

    const fetchOrdini = async () => {
      try {
        const data = await api.get<OrderResponse[]>("/api/orders/a3");
        if (!alive) return;
        const docs: Ordine[] = data.map((o) => ({
          id: o.id,
          nome: o.nome,
          cognome: o.cognome,
          telefono: o.telefono,
          email: o.email,
          files: Array.isArray(o.files) ? o.files : [],
        }));
        setOrdini(docs);
      } catch (err) {
        console.error("Errore caricamento ordini A3:", err);
      }
    };

    fetchOrdini();

    return () => {
      alive = false;
    };
  }, []);

  /* ===== Handlers ===== */
  const setNumberField =
    <T extends object>(setter: React.Dispatch<React.SetStateAction<T>>, key: keyof T) =>
    (v: number | string) => {
      const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
      setter((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : 0 } as T));
    };

  const addExtraRow = () => {
    setCostiAcquisto((prev) => [
      {
        id: crypto.randomUUID(),
        nome: "",
        unita: "per_ordine",
        costo: 0,
        note: "",
        attivo: true,
        campo: "",
        match: "",
      },
      ...prev,
    ]);
  };

  const updateExtra = <K extends keyof CostoExtra>(id: string, key: K, value: CostoExtra[K]) => {
    setCostiAcquisto((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const deleteExtra = (id: string) => {
    setCostiAcquisto((prev) => prev.filter((row) => row.id !== id));
  };

  const handleSave = async () => {
    try {
      setSaveState("saving");

      const cleanedExtras = costiAcquisto
        .filter((x) => x.nome.trim().length > 0)
        .map((x) => ({
          ...x,
          costo: Number.isFinite(x.costo) ? x.costo : 0,
          campo: (x.campo ?? "").trim(),
          match: (x.match ?? "").trim(),
        }));

      await api.put<A3CostsResponse>("/api/admin/config/a3-costs", {
        ...costi,
        interni: { ...interni },
        costiAcquisto: cleanedExtras,
      });

      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2200);
    } catch (e) {
      console.error(e);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    const ordine = ordini.find((o) => o.id === id);
    if (!ordine) return;
    if (!window.confirm(`Eliminare definitivamente l’ordine di ${ordine.nome} ${ordine.cognome}?`)) return;

    try {
      await api.delete(`/api/orders/${id}`);
      setOrdini((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.error("❌ Errore eliminazione ordine:", err);
      if (err instanceof ApiError) {
        window.alert(`Errore durante l’eliminazione dell’ordine: ${err.message}`);
      } else {
        window.alert("Errore durante l’eliminazione dell’ordine.");
      }
    }
  };

  const handleOpenFile = async (file: OrderFile) => {
    try {
      await openAuthedFile(file.downloadUrl, file.originalFileName);
    } catch (err) {
      console.error("Errore apertura file:", err);
      window.alert("Impossibile aprire il file.");
    }
  };

  /* ===== UI helpers ===== */
  const saveBadge = useMemo(() => {
    if (saveState === "saved") return <Badge color="green" leftSection={<IconCheck size={14} />}>Salvato</Badge>;
    if (saveState === "error") return <Badge color="red" leftSection={<IconAlertTriangle size={14} />}>Errore</Badge>;
    if (saveState === "saving") return <Badge color="yellow">Salvataggio…</Badge>;
    return null;
  }, [saveState]);

  const FieldGrid = <T extends object>({
    title,
    icon,
    state,
    setFn,
    helper,
  }: {
    title: string;
    icon: React.ReactNode;
    state: T;
    setFn: React.Dispatch<React.SetStateAction<T>>;
    helper?: React.ReactNode;
  }) => (
    <Card radius="xl" withBorder>
      <Group justify="space-between" mb="sm">
        <Group gap={10}>
          {icon}
          <Title order={3} fw={900}>
            {title}
          </Title>
        </Group>
      </Group>

      <Divider mb="md" />

      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {Object.entries(state as Record<string, number>).map(([key, value]) => (
          <NumberInput
            key={key}
            label={fmtKeyLabel(key)}
            value={value}
            onChange={(v) => setNumberField(setFn, key as keyof T)(v as any)}
            decimalScale={3}
            min={0}
            step={0.001}
            hideControls={false}
            radius="lg"
          />
        ))}
      </Box>

      {helper ? (
        <Text mt="md" c="dimmed" size="sm">
          {helper}
        </Text>
      ) : null}
    </Card>
  );

  return (
    <Box>
      <Header />

      <Container size="xl" py="lg">
        <Paper radius="xl" p="lg" withBorder>
          <Group justify="space-between" align="flex-start" gap="md">
            <Box>
              <Title order={2} fw={900}>
                Gestionale A3
              </Title>
              <Text c="dimmed" mt={6}>
                Imposta i <strong>costi base</strong> e i <strong>costi interni</strong> per A3.
                I costi interni sono usati in <em>Storico Dati</em> per il margine netto.
              </Text>
            </Box>

            <Group gap="sm" aria-live="polite" role="status">
              <Button
                radius="xl"
                leftSection={<IconDeviceFloppy size={18} />}
                onClick={handleSave}
                loading={saveState === "saving"}
                color="yellow"
              >
                Salva impostazioni
              </Button>
              {saveBadge}
            </Group>
          </Group>
        </Paper>

        <Stack mt="lg" gap="lg">
          <FieldGrid
            title="Costi base A3"
            icon={<IconTool size={20} />}
            state={costi}
            setFn={setCosti}
          />

          <FieldGrid
            title="Costi interni A3"
            icon={<IconCoin size={20} />}
            state={interni}
            setFn={setInterni}
            helper={
              <>
                Questi valori sono i <em>costi reali</em> per unità usati in <strong>Storico Dati</strong>.
              </>
            }
          />

          {/* Extra condizionali */}
          <Card radius="xl" withBorder>
            <Group justify="space-between" mb="sm">
              <Group gap={10}>
                <IconPackage size={20} />
                <Title order={3} fw={900}>
                  Costi extra (condizionali)
                </Title>
              </Group>

              <Button
                radius="xl"
                variant="light"
                leftSection={<IconPlus size={18} />}
                onClick={addExtraRow}
              >
                Aggiungi costo
              </Button>
            </Group>

            <Divider mb="md" />

            {costiAcquisto.length === 0 ? (
              <Text c="dimmed">
                Nessun extra. Aggiungi nuovi costi condizionali con “Aggiungi costo”.
              </Text>
            ) : (
              <>
                <ScrollArea type="auto">
                  <Table verticalSpacing="sm" highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Attivo</Table.Th>
                        <Table.Th>Nome</Table.Th>
                        <Table.Th>Unità</Table.Th>
                        <Table.Th>Valore</Table.Th>
                        <Table.Th>Campo</Table.Th>
                        <Table.Th>Match</Table.Th>
                        <Table.Th>Note</Table.Th>
                        <Table.Th style={{ width: 60 }} />
                      </Table.Tr>
                    </Table.Thead>

                    <Table.Tbody>
                      {costiAcquisto.map((row) => (
                        <Table.Tr key={row.id}>
                          <Table.Td>
                            <Checkbox
                              checked={row.attivo}
                              onChange={(e) => updateExtra(row.id, "attivo", e.currentTarget.checked)}
                            />
                          </Table.Td>

                          <Table.Td>
                            <TextInput
                              placeholder="Es. Carta cartoncino A3"
                              value={row.nome}
                              onChange={(e) => updateExtra(row.id, "nome", e.currentTarget.value)}
                              radius="md"
                            />
                          </Table.Td>

                          <Table.Td>
                            <Select
                              value={row.unita}
                              onChange={(v) =>
                                updateExtra(row.id, "unita", (v as CostoExtra["unita"]) ?? "per_ordine")
                              }
                              data={[
                                { value: "per_foglio", label: "Per foglio" },
                                { value: "per_fascicolo", label: "Per fascicolo" },
                                { value: "per_ordine", label: "Per ordine" },
                                { value: "percentuale", label: "Percentuale (%)" },
                              ]}
                              radius="md"
                              allowDeselect={false}
                            />
                          </Table.Td>

                          <Table.Td>
                            <NumberInput
                              value={row.costo}
                              onChange={(v) => updateExtra(row.id, "costo", typeof v === "number" ? v : 0)}
                              decimalScale={3}
                              min={0}
                              step={0.001}
                              radius="md"
                            />
                          </Table.Td>

                          <Table.Td>
                            <TextInput
                              placeholder='es. "grammatura", "inchiostro", "plastificazione", "rilegatura"'
                              value={row.campo ?? ""}
                              onChange={(e) => updateExtra(row.id, "campo", e.currentTarget.value)}
                              radius="md"
                            />
                          </Table.Td>

                          <Table.Td>
                            <TextInput
                              placeholder="stringa (case-insensitive)"
                              value={row.match ?? ""}
                              onChange={(e) => updateExtra(row.id, "match", e.currentTarget.value)}
                              radius="md"
                            />
                          </Table.Td>

                          <Table.Td>
                            <TextInput
                              placeholder="Nota opzionale"
                              value={row.note ?? ""}
                              onChange={(e) => updateExtra(row.id, "note", e.currentTarget.value)}
                              radius="md"
                            />
                          </Table.Td>

                          <Table.Td>
                            <Tooltip label="Elimina" withArrow>
                              <ActionIcon
                                color="red"
                                variant="light"
                                radius="xl"
                                onClick={() => deleteExtra(row.id)}
                                aria-label="Elimina costo extra"
                              >
                                <IconTrash size={18} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                <Text c="dimmed" size="sm" mt="md">
                  “Percentuale” applica una % sul lordo; le altre unità moltiplicano per fogli/fascicoli/ordine.
                  Se imposti <strong>Campo/Match</strong>, l’extra si applica solo quando il campo dell’ordine contiene
                  il testo indicato.
                </Text>
              </>
            )}
          </Card>

          {/* ORDINI */}
          <Card radius="xl" withBorder>
            <Group justify="space-between" mb="sm">
              <Group gap={10}>
                <IconFolder size={20} />
                <Title order={3} fw={900}>
                  Ordini A3
                </Title>
              </Group>
              <Badge variant="light">{ordini.length}</Badge>
            </Group>

            <Divider mb="md" />

            {ordini.length === 0 ? (
              <Text c="dimmed">Nessun ordine A3 presente.</Text>
            ) : (
              <Stack gap="sm">
                {ordini.map((ordine) => (
                  <Paper key={ordine.id} radius="lg" withBorder p="md">
                    <Group justify="space-between" align="flex-start" gap="md">
                      <Box>
                        <Text fw={900}>
                          {ordine.nome} {ordine.cognome}
                        </Text>
                        <Text c="dimmed" size="sm">
                          {ordine.telefono} · {ordine.email}
                        </Text>

                        {ordine.files?.length ? (
                          <Stack gap={6} mt="sm">
                            {ordine.files.map((file, idx) => (
                              <Group key={file.id ?? idx} gap={8}>
                                <IconChevronRight size={16} />
                                <Text
                                  component="a"
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleOpenFile(file);
                                  }}
                                  size="sm"
                                  style={{ textDecoration: "underline", cursor: "pointer" }}
                                >
                                  {file.originalFileName || `PDF ${idx + 1}`}
                                </Text>
                              </Group>
                            ))}
                          </Stack>
                        ) : null}
                      </Box>

                      <Button
                        color="red"
                        variant="light"
                        radius="xl"
                        leftSection={<IconTrash size={18} />}
                        onClick={() => handleDelete(ordine.id)}
                      >
                        Elimina ordine
                      </Button>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default React.memo(A3Gestionale);
