// src/gestionale/GestionaleConsegne/ConsegneGestionale.tsx
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../backend/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import Header from "../../components/HeaderComponents/Header";

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import {
  IconCalendar,
  IconClock,
  IconDeviceFloppy,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

type TimeRange = { start: string; end: string };
type BlacklistRange = { from: string; to: string };

type DeliveryConfig = {
  weekdays: number[]; // 1..7 (1=Lun ... 7=Dom)
  timeRanges: TimeRange[];
  slotsAhead: number;
  timezone?: string;
  blacklistDates?: string[]; // YYYY-MM-DD
  blacklistRanges?: BlacklistRange[];
};

const COLL = "configConsegne";
const DOCID = "settings";

const DEFAULT_CFG: DeliveryConfig = {
  weekdays: [1, 3, 5],
  timeRanges: [{ start: "12:00", end: "13:00" }],
  slotsAhead: 6,
  timezone: "Europe/Rome",
  blacklistDates: [],
  blacklistRanges: [],
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

// Utils
const toIt = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
};
const sortISO = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const sortRange = (a: BlacklistRange, b: BlacklistRange) =>
  a.from === b.from ? sortISO(a.to, b.to) : sortISO(a.from, b.from);

const ConsegneGestionale: React.FC = () => {
  const [cfg, setCfg] = useState<DeliveryConfig>(DEFAULT_CFG);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"single" | "range">("single");
  const [singleDate, setSingleDate] = useState<string>("");
  const [rangeFrom, setRangeFrom] = useState<string>("");
  const [rangeTo, setRangeTo] = useState<string>("");
  const [modalError, setModalError] = useState<string | null>(null);

  // live load
  useEffect(() => {
    const ref = doc(db, COLL, DOCID);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<DeliveryConfig>;
          setCfg({
            weekdays:
              Array.isArray(data.weekdays) && data.weekdays.length
                ? (data.weekdays as number[])
                : DEFAULT_CFG.weekdays,
            timeRanges:
              Array.isArray(data.timeRanges) && data.timeRanges.length
                ? (data.timeRanges as TimeRange[])
                : DEFAULT_CFG.timeRanges,
            slotsAhead: typeof data.slotsAhead === "number" ? data.slotsAhead : DEFAULT_CFG.slotsAhead,
            timezone: typeof data.timezone === "string" && data.timezone ? data.timezone : DEFAULT_CFG.timezone,
            blacklistDates: Array.isArray(data.blacklistDates)
              ? (data.blacklistDates as string[]).slice().sort(sortISO)
              : [],
            blacklistRanges: Array.isArray(data.blacklistRanges)
              ? (data.blacklistRanges as BlacklistRange[]).slice().sort(sortRange)
              : [],
          });
        } else {
          setCfg(DEFAULT_CFG);
        }
        setLoaded(true);
      },
      (err) => {
        console.error(err);
        setError("Impossibile leggere la configurazione.");
        setLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  const toggleWeekday = (wd: number) => {
    setCfg((prev) => {
      const has = prev.weekdays.includes(wd);
      const weekdays = has ? prev.weekdays.filter((x) => x !== wd) : [...prev.weekdays, wd];
      weekdays.sort((a, b) => a - b);
      return { ...prev, weekdays };
    });
  };

  const updateTimeRange = (idx: number, key: "start" | "end", val: string) => {
    setCfg((prev) => {
      const tr = [...prev.timeRanges];
      tr[idx] = { ...tr[idx], [key]: val };
      return { ...prev, timeRanges: tr };
    });
  };

  const addTimeRange = () => {
    setCfg((prev) => ({
      ...prev,
      timeRanges: [...prev.timeRanges, { start: "12:00", end: "13:00" }],
    }));
  };

  const removeTimeRange = (idx: number) => {
    setCfg((prev) => {
      const tr = [...prev.timeRanges];
      tr.splice(idx, 1);
      return { ...prev, timeRanges: tr.length ? tr : [{ start: "12:00", end: "13:00" }] };
    });
  };

  // Modal openers
  const openAddSingle = () => {
    setModalMode("single");
    setSingleDate("");
    setRangeFrom("");
    setRangeTo("");
    setModalError(null);
    setModalOpen(true);
  };

  const openAddRange = () => {
    setModalMode("range");
    setSingleDate("");
    setRangeFrom("");
    setRangeTo("");
    setModalError(null);
    setModalOpen(true);
  };

  // Blacklist ops
  const addBlacklistSingle = () => {
    if (!singleDate) {
      setModalError("Seleziona una data.");
      return;
    }
    setCfg((prev) => {
      const setUnique = new Set([...(prev.blacklistDates || []), singleDate]);
      const arr = Array.from(setUnique).sort(sortISO);
      return { ...prev, blacklistDates: arr };
    });
    setModalOpen(false);
  };

  const addBlacklistRange = () => {
    if (!rangeFrom || !rangeTo) {
      setModalError("Compila entrambe le date (dal/al).");
      return;
    }
    if (rangeFrom > rangeTo) {
      setModalError("Intervallo non valido: 'dal' è successivo ad 'al'.");
      return;
    }
    setCfg((prev) => {
      const ranges = [...(prev.blacklistRanges || []), { from: rangeFrom, to: rangeTo }];
      ranges.sort(sortRange);
      return { ...prev, blacklistRanges: ranges };
    });
    setModalOpen(false);
  };

  const removeBlacklistDate = (d: string) => {
    setCfg((prev) => ({ ...prev, blacklistDates: (prev.blacklistDates || []).filter((x) => x !== d) }));
  };

  const removeBlacklistRange = (r: BlacklistRange) => {
    setCfg((prev) => ({
      ...prev,
      blacklistRanges: (prev.blacklistRanges || []).filter((x) => !(x.from === r.from && x.to === r.to)),
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const ref = doc(db, COLL, DOCID);
      await setDoc(
        ref,
        {
          weekdays: cfg.weekdays,
          timeRanges: cfg.timeRanges,
          slotsAhead: cfg.slotsAhead,
          timezone: cfg.timezone || "Europe/Rome",
          blacklistDates: cfg.blacklistDates || [],
          blacklistRanges: cfg.blacklistRanges || [],
        },
        { merge: true }
      );
    } catch (e) {
      console.error(e);
      setError("Errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  };

  const preview = useMemo(() => {
    const singles =
      (cfg.blacklistDates || []).length
        ? `Escluse singole: ${(cfg.blacklistDates || []).map(toIt).join(", ")}`
        : "";
    const ranges =
      (cfg.blacklistRanges || []).length
        ? `Intervalli: ${(cfg.blacklistRanges || [])
          .map((r) => `${toIt(r.from)}–${toIt(r.to)}`)
          .join(" | ")}`
        : "";
    return [
      `Giorni: ${cfg.weekdays
        .slice()
        .sort()
        .map((w) => DAY_LABELS[w % 7])
        .join(", ")}`,
      `Fasce: ${cfg.timeRanges.map((t) => `${t.start}-${t.end}`).join(" | ")}`,
      `Slots mostrati: ${cfg.slotsAhead}`,
      singles,
      ranges,
    ]
      .filter(Boolean)
      .join(" • ");
  }, [cfg]);

  return (
    <Box>
      <Header />

      <Container size="xl" py="lg">
        <Paper radius="xl" p="lg" withBorder>
          <Group justify="space-between" align="flex-start" gap="md">
            <Box>
              <Title order={2} fw={900}>
                Gestione consegne
              </Title>
              <Text c="dimmed" mt={6}>
                Configura giorni, fasce orarie e date escluse (festivi/chiusure). Questa configurazione viene usata
                per A4 e A3.
              </Text>
            </Box>

            <Group gap="sm">
              <Badge variant="light" color={loaded ? "green" : "gray"}>
                {loaded ? "Caricato" : "Caricamento…"}
              </Badge>
              <Button
                radius="xl"
                color="yellow"
                leftSection={<IconDeviceFloppy size={18} />}
                onClick={save}
                loading={saving}
              >
                Salva
              </Button>
            </Group>
          </Group>
        </Paper>

        <Stack mt="lg" gap="lg">
          {error ? (
            <Paper radius="lg" p="md" withBorder style={{ borderColor: "rgba(255,0,0,.25)" }}>
              <Text c="red" fw={700}>
                {error}
              </Text>
            </Paper>
          ) : null}

          {/* Giorni */}
          <Card radius="xl" withBorder>
            <Group gap={10} mb="sm">
              <IconCalendar size={20} />
              <Title order={3} fw={900}>
                Giorni della settimana
              </Title>
            </Group>
            <Divider mb="md" />

            <Box
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {DAY_LABELS.map((lab, i) => {
                const wd = i === 0 ? 7 : i; // 1..7 con 7=Dom
                const checked = cfg.weekdays.includes(wd);
                return (
                  <Paper
                    key={wd}
                    radius="lg"
                    withBorder
                    p="sm"
                    style={{
                      cursor: "pointer",
                      userSelect: "none",
                      borderColor: checked ? "rgba(199,171,43,.55)" : undefined,
                      background: checked ? "rgba(199,171,43,.10)" : undefined,
                    }}
                    onClick={() => toggleWeekday(wd)}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Text fw={900}>{lab}</Text>
                      <Switch checked={checked} onChange={() => toggleWeekday(wd)} />
                    </Group>
                  </Paper>
                );
              })}
            </Box>

            <Text c="dimmed" size="sm" mt="md">
              Tip: seleziona i giorni in cui accetti consegne (Lun–Dom).
            </Text>
          </Card>

          {/* Fasce orarie */}
          <Card radius="xl" withBorder>
            <Group justify="space-between" align="center" mb="sm">
              <Group gap={10}>
                <IconClock size={20} />
                <Title order={3} fw={900}>
                  Fasce orarie
                </Title>
              </Group>

              <Button
                radius="xl"
                variant="light"
                leftSection={<IconPlus size={18} />}
                onClick={addTimeRange}
              >
                Aggiungi fascia
              </Button>
            </Group>

            <Divider mb="md" />

            <Stack gap="sm">
              {cfg.timeRanges.map((tr, idx) => (
                <Paper key={idx} radius="lg" withBorder p="md">
                  <Group justify="space-between" align="flex-end" gap="md" wrap="wrap">
                    <Group gap="md" wrap="wrap">
                      <TimeInput
                        label="Inizio"
                        value={tr.start}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateTimeRange(idx, "start", e.currentTarget.value)
                        }
                        radius="lg"
                      />

                      <TimeInput
                        label="Fine"
                        value={tr.end}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateTimeRange(idx, "end", e.currentTarget.value)
                        }
                        radius="lg"
                      />
                    </Group>

                    <ActionIcon
                      color="red"
                      variant="light"
                      radius="xl"
                      size="lg"
                      onClick={() => removeTimeRange(idx)}
                      aria-label="Rimuovi fascia"
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Card>

          {/* Impostazioni */}
          <Card radius="xl" withBorder>
            <Group gap={10} mb="sm">
              <Title order={3} fw={900}>
                Impostazioni
              </Title>
            </Group>
            <Divider mb="md" />

            <Group gap="md" align="flex-end" wrap="wrap">
              <NumberInput
                label="Slots da mostrare"
                value={cfg.slotsAhead}
                min={1}
                max={48}
                clampBehavior="strict"
                onChange={(v) =>
                  setCfg((prev) => ({
                    ...prev,
                    slotsAhead: Math.max(1, Math.min(48, Number(v) || 1)),
                  }))
                }
                radius="lg"
              />

              <TextInput
                label="Timezone"
                value={cfg.timezone || ""}
                placeholder="Europe/Rome"
                onChange={(e) => setCfg((prev) => ({ ...prev, timezone: e.currentTarget.value }))}
                radius="lg"
              />
            </Group>
          </Card>

          {/* Blacklist */}
          <Card radius="xl" withBorder>
            <Group justify="space-between" align="center" mb="sm" wrap="wrap">
              <Group gap={10}>
                <IconCalendar size={20} />
                <Title order={3} fw={900}>
                  Date da escludere
                </Title>
              </Group>

              <Group gap="sm">
                <Button radius="xl" variant="light" leftSection={<IconPlus size={18} />} onClick={openAddSingle}>
                  Data singola
                </Button>
                <Button radius="xl" variant="light" leftSection={<IconPlus size={18} />} onClick={openAddRange}>
                  Intervallo
                </Button>
              </Group>
            </Group>

            <Divider mb="md" />

            {(cfg.blacklistDates?.length || 0) > 0 || (cfg.blacklistRanges?.length || 0) > 0 ? (
              <Group gap="sm" wrap="wrap">
                {(cfg.blacklistDates || []).map((d) => (
                  <Badge
                    key={`d-${d}`}
                    variant="light"
                    radius="md"
                    rightSection={
                      <ActionIcon
                        size="xs"
                        radius="xl"
                        variant="subtle"
                        onClick={() => removeBlacklistDate(d)}
                        aria-label="Rimuovi data"
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    }
                  >
                    {toIt(d)}
                  </Badge>
                ))}

                {(cfg.blacklistRanges || []).map((r, i) => (
                  <Badge
                    key={`r-${i}-${r.from}-${r.to}`}
                    color="grape"
                    variant="light"
                    radius="md"
                    rightSection={
                      <ActionIcon
                        size="xs"
                        radius="xl"
                        variant="subtle"
                        onClick={() => removeBlacklistRange(r)}
                        aria-label="Rimuovi intervallo"
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    }
                  >
                    {toIt(r.from)} → {toIt(r.to)}
                  </Badge>
                ))}
              </Group>
            ) : (
              <Text c="dimmed">Nessuna data o intervallo escluso.</Text>
            )}
          </Card>

          {/* Anteprima */}
          <Card radius="xl" withBorder>
            <Title order={3} fw={900}>
              Anteprima
            </Title>
            <Divider my="md" />
            <Text>{preview}</Text>
          </Card>
        </Stack>
      </Container>

      {/* Modal: aggiunta data/intervallo */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === "single" ? "Aggiungi data singola" : "Aggiungi intervallo"}
        centered
        radius="lg"
        overlayProps={{ blur: 2 }}
      >
        <Stack gap="md">
          {modalMode === "single" ? (
            <TextInput
              label="Data (YYYY-MM-DD)"
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.currentTarget.value)}
              radius="lg"
            />
          ) : (
            <>
              <TextInput
                label="Dal (YYYY-MM-DD)"
                type="date"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.currentTarget.value)}
                radius="lg"
              />
              <TextInput
                label="Al (YYYY-MM-DD)"
                type="date"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.currentTarget.value)}
                radius="lg"
              />
            </>
          )}

          {modalError ? (
            <Text c="red" fw={700}>
              {modalError}
            </Text>
          ) : null}

          <Group justify="flex-end">
            <Button radius="xl" variant="subtle" onClick={() => setModalOpen(false)}>
              Annulla
            </Button>
            {modalMode === "single" ? (
              <Button radius="xl" color="yellow" onClick={addBlacklistSingle}>
                Aggiungi
              </Button>
            ) : (
              <Button radius="xl" color="yellow" onClick={addBlacklistRange}>
                Aggiungi intervallo
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default React.memo(ConsegneGestionale);
