// src/gestionale/GestionaleA4/A4Gestionale.tsx
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../backend/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";

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

type Costi = {
  foglio: number;
  biancoNero: number;
  colore: number;
  anelli: number;
  fascetta: number;
  ciappatura: number;
  spirale: number;
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

type Ordine = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  tipo?: string;
  file?: string[];
};

const defaultCosti: Costi = {
  foglio: 0.03,
  biancoNero: 0.015,
  colore: 0.075,
  anelli: 1.5,
  fascetta: 1,
  ciappatura: 0.1,
  spirale: 2,
};

const defaultInterni: Costi = {
  foglio: 0.009,
  biancoNero: 0.005,
  colore: 0.02,
  anelli: 0.5,
  fascetta: 0.3,
  ciappatura: 0.05,
  spirale: 0.8,
};

const defaultExtras: CostoExtra[] = [
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

const A4Gestionale: React.FC = () => {
  const [costi, setCosti] = useState<Costi>(defaultCosti);
  const [interni, setInterni] = useState<Costi>(defaultInterni);
  const [costiAcquisto, setCostiAcquisto] = useState<CostoExtra[]>(defaultExtras);

  const [ordini, setOrdini] = useState<Ordine[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // ======== Firestore: live config ========
  useEffect(() => {
    const costiRef = doc(db, "configA4", "costi");
    const unsub = onSnapshot(costiRef, (snap) => {
      if (!snap.exists()) {
        setCosti(defaultCosti);
        setInterni(defaultInterni);
        setCostiAcquisto(defaultExtras);
        return;
      }

      const data = snap.data() as any;

      setCosti({
        foglio: Number(data?.foglio ?? defaultCosti.foglio) || 0,
        biancoNero: Number(data?.biancoNero ?? defaultCosti.biancoNero) || 0,
        colore: Number(data?.colore ?? defaultCosti.colore) || 0,
        anelli: Number(data?.anelli ?? defaultCosti.anelli) || 0,
        fascetta: Number(data?.fascetta ?? defaultCosti.fascetta) || 0,
        ciappatura: Number(data?.ciappatura ?? defaultCosti.ciappatura) || 0,
        spirale: Number(data?.spirale ?? defaultCosti.spirale) || 0,
      });

      const i = data?.interni ?? {};
      setInterni({
        foglio: Number(i?.foglio ?? defaultInterni.foglio) || 0,
        biancoNero: Number(i?.biancoNero ?? defaultInterni.biancoNero) || 0,
        colore: Number(i?.colore ?? defaultInterni.colore) || 0,
        anelli: Number(i?.anelli ?? defaultInterni.anelli) || 0,
        fascetta: Number(i?.fascetta ?? defaultInterni.fascetta) || 0,
        ciappatura: Number(i?.ciappatura ?? defaultInterni.ciappatura) || 0,
        spirale: Number(i?.spirale ?? defaultInterni.spirale) || 0,
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
        setCostiAcquisto(defaultExtras);
      }
    });

    return () => unsub();
  }, []);

  // ======== Firestore: ordini A4 ========
  useEffect(() => {
    const fetchOrdini = async () => {
      const querySnapshot = await getDocs(collection(db, "StampePDFA4"));
      const docs: Ordine[] = querySnapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            nome: data.nome,
            cognome: data.cognome,
            telefono: data.telefono,
            email: data.email,
            tipo: data.tipo || "A4",
            file: Array.isArray(data.file) ? data.file : [data.file].filter(Boolean),
          };
        })
        .filter((d) => d.tipo === "A4");
      setOrdini(docs);
    };
    fetchOrdini();
  }, []);

  // ======== Helpers ========
  const setNumberField =
    <T extends object>(setter: React.Dispatch<React.SetStateAction<T>>, key: keyof T) =>
    (v: number | string) => {
      const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
      setter((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : 0 } as T));
    };

  // ======== Extra ========
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

  // ======== Save ========
  const handleSave = async () => {
    try {
      setSaveState("saving");
      const refDoc = doc(db, "configA4", "costi");

      const cleanedExtras = costiAcquisto
        .filter((x) => x.nome.trim().length > 0)
        .map((x) => ({
          ...x,
          costo: Number.isFinite(x.costo) ? x.costo : 0,
          campo: (x.campo ?? "").trim(),
          match: (x.match ?? "").trim(),
        }));

      await setDoc(
        refDoc,
        {
          ...costi,
          interni: { ...interni },
          costiAcquisto: cleanedExtras,
        },
        { merge: true }
      );

      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2200);
    } catch (e) {
      console.error(e);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  // ======== Delete ordine + files ========
  const handleDelete = async (id: string) => {
    const ordine = ordini.find((o) => o.id === id);
    if (!ordine) return;
    if (!window.confirm(`Eliminare definitivamente l’ordine di ${ordine.nome} ${ordine.cognome}?`)) return;

    const storage = getStorage();
    if (ordine?.file?.length) {
      for (const fileUrl of ordine.file) {
        try {
          const decodedUrl = decodeURIComponent(fileUrl.split("?")[0]);
          const pathStart = decodedUrl.indexOf("/o/") + 3;
          const pathEnd = decodedUrl.indexOf(".pdf", pathStart) + 4;
          const fullPath = decodedUrl.substring(pathStart, pathEnd).replace(/%2F/g, "/");
          await deleteObject(ref(storage, fullPath));
        } catch (err) {
          console.error("Errore eliminazione file:", fileUrl, err);
        }
      }
    }

    await deleteDoc(doc(db, "StampePDFA4", id));
    setOrdini((prev) => prev.filter((o) => o.id !== id));
  };

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
                Gestionale A4
              </Title>
              <Text c="dimmed" mt={6}>
                Imposta i <strong>costi base</strong> (facoltativi) e i <strong>costi interni</strong>.
                I costi interni verranno usati per il calcolo del margine netto.
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
            title="Costi base A4"
            icon={<IconTool size={20} />}
            state={costi}
            setFn={setCosti}
          />

          <FieldGrid
            title="Costi interni A4"
            icon={<IconCoin size={20} />}
            state={interni}
            setFn={setInterni}
            helper={
              <>
                Questi valori sono i <em>costi reali</em> per unità usati in <strong>Storico Dati</strong> per
                calcolare “Costi interni (€)” e quindi il “Margine netto (€)”.
              </>
            }
          />

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
                              placeholder="Es. Carta premium 120g"
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
                              placeholder='es. "rilegatura", "inchiostro", "grammatura"'
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

          <Card radius="xl" withBorder>
            <Group justify="space-between" mb="sm">
              <Group gap={10}>
                <IconFolder size={20} />
                <Title order={3} fw={900}>
                  Ordini A4
                </Title>
              </Group>
              <Badge variant="light">{ordini.length}</Badge>
            </Group>

            <Divider mb="md" />

            {ordini.length === 0 ? (
              <Text c="dimmed">Nessun ordine A4 presente.</Text>
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

                        {ordine.file?.length ? (
                          <Stack gap={6} mt="sm">
                            {ordine.file.map((link, idx) => (
                              <Group key={idx} gap={8}>
                                <IconChevronRight size={16} />
                                <Text
                                  component="a"
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  size="sm"
                                  style={{ textDecoration: "underline" }}
                                >
                                  PDF {idx + 1}
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

export default React.memo(A4Gestionale);
