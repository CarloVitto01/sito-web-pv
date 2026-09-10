// src/gestionale/GestionaleAccessi/GestioneAccessi.tsx
import React, { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../backend/apiClient";
import Header from "../../components/HeaderComponents/Header";

import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconPlus,
  IconTrash,
  IconCheck,
  IconAlertTriangle,
  IconLock,
  IconUsers,
} from "@tabler/icons-react";

const PAGINE = [
  "gestionaleA4",
  "gestionaleA3",
  "utentiGestionale",
  "storicoDati",
  "gestione-accessi",
  "qr-generator",
  "tasse",
  "banner",
  "consegna",
  "sconti",
  "plastiche",
] as const;

type SaveState = "idle" | "saving" | "saved" | "error";

type UserSummary = {
  id: string;
  ruolo: string;
};

type RoleDto = {
  id: number;
  name: string;
  pageAccess: string[];
};

const GestioneAccessi: React.FC = () => {
  const [ruoli, setRuoli] = useState<string[]>([]);
  const [ruoloSelezionato, setRuoloSelezionato] = useState<string>("");
  const [accessi, setAccessi] = useState<string[]>([]);
  const [nuovoRuolo, setNuovoRuolo] = useState<string>("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [ruoliUsati, setRuoliUsati] = useState<Set<string>>(new Set());
  const [ruoloEliminato, setRuoloEliminato] = useState<string | null>(null);
  const [rolesData, setRolesData] = useState<RoleDto[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Mappa per gestione case-insensitive
  const ruoliLower = useMemo(() => new Set(ruoli.map((r) => r.toLowerCase())), [ruoli]);

  useEffect(() => {
    const fetchRuoli = async () => {
      const [utenti, ruoliBackend] = await Promise.all([
        api.get<UserSummary[]>("/api/users"),
        api.get<RoleDto[]>("/api/roles"),
      ]);

      const ruoliUtenti = new Set<string>();
      utenti.forEach((u) => {
        if (u.ruolo) ruoliUtenti.add(String(u.ruolo));
      });
      setRuoliUsati(ruoliUtenti);

      setRolesData(ruoliBackend);
      const ruoliAccessi = new Set(ruoliBackend.map((r) => r.name));

      const unioneRuoli = new Set([...Array.from(ruoliUtenti), ...Array.from(ruoliAccessi)]);
      setRuoli(Array.from(unioneRuoli).sort((a, b) => a.localeCompare(b)));
    };

    fetchRuoli();
  }, []);

  useEffect(() => {
    if (!ruoloSelezionato) {
      setAccessi([]);
      return;
    }
    const found = rolesData.find((r) => r.name === ruoloSelezionato);
    setAccessi(found?.pageAccess || []);
  }, [ruoloSelezionato, rolesData]);

  const toggleAccesso = (pagina: string) => {
    setAccessi((prev) =>
      prev.includes(pagina) ? prev.filter((p) => p !== pagina) : [...prev, pagina]
    );
  };

  const salvaAccessi = async () => {
    if (!ruoloSelezionato) return;
    try {
      setSaveState("saving");
      const updated = await api.put<RoleDto>(`/api/roles/${ruoloSelezionato}`, { pageAccess: accessi });
      setRolesData((prev) => {
        const exists = prev.some((r) => r.name === updated.name);
        return exists
          ? prev.map((r) => (r.name === updated.name ? updated : r))
          : [...prev, updated];
      });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (e) {
      console.error(e);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  const creaNuovoRuolo = async () => {
    const ruolo = nuovoRuolo.trim();
    if (!ruolo) return;

    if (ruoliLower.has(ruolo.toLowerCase())) {
      // già presente (anche con case diverso) → selezionalo
      setRuoloSelezionato(ruolo);
      setNuovoRuolo("");
      return;
    }

    setNuovoRuolo("");

    // Crea il ruolo lato backend (cosi' compare anche nell'elenco persistito)
    try {
      const created = await api.put<RoleDto>(`/api/roles/${ruolo}`, { pageAccess: [] });
      setRolesData((prev) => [...prev, created]);
      setRuoli((prev) => [...prev, created.name].sort((a, b) => a.localeCompare(b)));
      setRuoloSelezionato(created.name);
    } catch (e) {
      console.error("Errore creazione ruolo:", e);
    }
  };

  const eliminaRuolo = async (ruolo: string) => {
    // Non eliminare se in uso dagli utenti reali
    if (ruoliUsati.has(ruolo)) return;

    setDeleteError(null);
    try {
      await api.delete(`/api/roles/${ruolo}`);
    } catch (e) {
      console.error("Errore eliminazione ruolo:", e);
      const message =
        e instanceof ApiError
          ? e.status === 409
            ? "Impossibile eliminare: il ruolo è ancora assegnato a degli utenti."
            : e.message
          : "Impossibile eliminare il ruolo.";
      setDeleteError(message);
      setTimeout(() => setDeleteError(null), 4000);
      return;
    }

    setRolesData((prev) => prev.filter((r) => r.name !== ruolo));
    setRuoli((prev) => prev.filter((r) => r !== ruolo));
    if (ruolo === ruoloSelezionato) setRuoloSelezionato("");

    setRuoloEliminato(ruolo);
    setTimeout(() => setRuoloEliminato(null), 2000);
  };

  const selectedCount = accessi.length;

  const saveBadge = useMemo(() => {
    if (saveState === "saved") return <Badge color="green" leftSection={<IconCheck size={14} />}>Salvato</Badge>;
    if (saveState === "error") return <Badge color="red" leftSection={<IconAlertTriangle size={14} />}>Errore</Badge>;
    if (saveState === "saving") return <Badge color="yellow">Salvataggio…</Badge>;
    return null;
  }, [saveState]);

  const canDeleteSelected = Boolean(ruoloSelezionato) && !ruoliUsati.has(ruoloSelezionato);

  return (
    <Box>
      <Header />

      <Container size="xl" py="lg">
        <Paper radius="xl" p="lg" withBorder>
          <Group justify="space-between" align="flex-start" gap="md">
            <Box>
              <Title order={2} fw={900}>
                Gestione accessi per ruolo
              </Title>
              <Text c="dimmed" mt={6}>
                Seleziona un ruolo, abilita le pagine e salva. I ruoli assegnati ad utenti reali non possono
                essere eliminati.
              </Text>
            </Box>

            <Group gap="sm" aria-live="polite" role="status">
              <Badge variant="light" leftSection={<IconUsers size={14} />}>
                Ruoli: {ruoli.length}
              </Badge>
              {saveBadge}
            </Group>
          </Group>
        </Paper>

        <Stack mt="lg" gap="lg">
          {/* Selettore ruolo + creazione */}
          <Card radius="xl" withBorder>
            <Group justify="space-between" align="flex-end" gap="md">
              <Box style={{ flex: 1, minWidth: 260 }}>
                <Select
                  label="Ruolo"
                  placeholder="Seleziona ruolo…"
                  data={ruoli.map((r) => ({ value: r, label: r }))}
                  value={ruoloSelezionato || null}
                  onChange={(v) => setRuoloSelezionato(v ?? "")}
                  radius="lg"
                  searchable
                  nothingFoundMessage="Nessun ruolo"
                  clearable
                />
              </Box>

              <Box style={{ flex: 1, minWidth: 260 }}>
                <TextInput
                  label="Nuovo ruolo"
                  placeholder="Es. Admin, Staff, Operatore…"
                  value={nuovoRuolo}
                  onChange={(e) => setNuovoRuolo(e.currentTarget.value)}
                  radius="lg"
                />
              </Box>

              <Group gap="sm">
                <Button
                  radius="xl"
                  variant="light"
                  leftSection={<IconPlus size={18} />}
                  onClick={creaNuovoRuolo}
                >
                  Aggiungi ruolo
                </Button>

                <Tooltip
                  label={
                    canDeleteSelected
                      ? "Elimina ruolo (solo se non assegnato ad alcun utente)"
                      : "Non eliminabile: ruolo assegnato ad utenti"
                  }
                  withArrow
                >
                  <Button
                    radius="xl"
                    color="red"
                    variant="light"
                    leftSection={<IconTrash size={18} />}
                    onClick={() => ruoloSelezionato && eliminaRuolo(ruoloSelezionato)}
                    disabled={!canDeleteSelected}
                  >
                    Elimina
                  </Button>
                </Tooltip>

                {ruoloEliminato ? (
                  <Badge color="green" leftSection={<IconCheck size={14} />}>
                    Eliminato
                  </Badge>
                ) : null}

                {deleteError ? (
                  <Badge color="red" leftSection={<IconAlertTriangle size={14} />}>
                    {deleteError}
                  </Badge>
                ) : null}
              </Group>
            </Group>

            <Divider my="md" />

            {ruoloSelezionato ? (
              <Group gap="xs">
                <Badge variant="light" leftSection={<IconLock size={14} />}>
                  {ruoloSelezionato}
                </Badge>
                <Badge variant="light">
                  {selectedCount}/{PAGINE.length} pagine abilitate
                </Badge>
              </Group>
            ) : (
              <Text c="dimmed">Seleziona un ruolo per modificare gli accessi.</Text>
            )}
          </Card>

          {/* Lista accessi */}
          {ruoloSelezionato && (
            <Card radius="xl" withBorder>
              <Group justify="space-between" mb="sm">
                <Group gap={10}>
                  <IconLock size={20} />
                  <Title order={3} fw={900}>
                    Pagine accessibili
                  </Title>
                </Group>

                <Button
                  radius="xl"
                  color="yellow"
                  leftSection={<IconDeviceFloppy size={18} />}
                  onClick={salvaAccessi}
                  loading={saveState === "saving"}
                >
                  Salva accessi
                </Button>
              </Group>

              <Divider mb="md" />

              <Box
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {PAGINE.map((pagina) => (
                  <Paper key={pagina} radius="lg" withBorder p="sm">
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap">
                        <Checkbox
                          checked={accessi.includes(pagina)}
                          onChange={() => toggleAccesso(pagina)}
                        />
                        <Text fw={800}>{pagina}</Text>
                      </Group>

                      <Badge variant="light" color={accessi.includes(pagina) ? "green" : "gray"}>
                        {accessi.includes(pagina) ? "Attivo" : "Off"}
                      </Badge>
                    </Group>
                  </Paper>
                ))}
              </Box>

              <Text c="dimmed" size="sm" mt="md">
                Suggerimento: crea ruoli “Operatore”, “Admin”, “Contabile” e assegna solo le sezioni necessarie.
              </Text>
            </Card>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default React.memo(GestioneAccessi);
