// src/gestionale/UtentiGestionale/UtentiGestionale.tsx
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
  Group,
  Loader,
  Menu,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconAlertCircle,
  IconDotsVertical,
  IconMail,
  IconPhone,
  IconSearch,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";

type Utente = {
  id: string;
  displayName: string;
  cognome: string;
  email: string;
  telefono: string;
  ruolo: string;
  corsoLaurea?: string;
  annoAccademico?: string;
};

type Role = {
  id: number;
  name: string;
  pageAccess: string[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

const makeInitials = (u: Utente) => {
  const a = (u.displayName || "").trim();
  const b = (u.cognome || "").trim();
  const pick = `${a} ${b}`.trim() || "U";
  return pick[0]?.toUpperCase() || "U";
};

const UtentiGestionale: React.FC = () => {
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [filtroRuolo, setFiltroRuolo] = useState<string>("Tutti");
  const [query, setQuery] = useState<string>("");
  const [ruoliDisponibili, setRuoliDisponibili] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // stato salvataggio ruolo per singolo utente
  const [roleSave, setRoleSave] = useState<Record<string, SaveState>>({});

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        // Ruoli (per popolare la dropdown filtro/select)
        const ruoliBackend = await api.get<Role[]>("/api/roles");
        const setRuoli = new Set([...ruoliBackend.map((r) => r.name), "PublicUser"]);
        setRuoliDisponibili(Array.from(setRuoli).sort((a, b) => a.localeCompare(b)));

        // Utenti
        const users = await api.get<Utente[]>("/api/users");
        setUtenti(
          users.map((u) => ({
            id: u.id,
            displayName: u.displayName ?? "",
            cognome: u.cognome ?? "",
            email: u.email ?? "",
            telefono: u.telefono ?? "",
            ruolo: u.ruolo || "PublicUser",
            corsoLaurea: u.corsoLaurea ?? "",
            annoAccademico: u.annoAccademico ?? "",
          }))
        );
      } catch (e) {
        console.error(e);
        setLoadError("Impossibile caricare gli utenti.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const utentiFiltrati = useMemo(() => {
    const q = query.trim().toLowerCase();
    return utenti.filter((u) => {
      const matchRuolo = filtroRuolo === "Tutti" || u.ruolo === filtroRuolo;
      const testo = `${u.displayName ?? ""} ${u.cognome ?? ""} ${u.email ?? ""} ${u.telefono ?? ""}`.toLowerCase();
      const matchTesto = q === "" || testo.includes(q);
      return matchRuolo && matchTesto;
    });
  }, [utenti, filtroRuolo, query]);

  const handleDelete = (u: Utente) => {
    modals.openConfirmModal({
      title: "Elimina utente",
      centered: true,
      children: (
        <Text size="sm">
          Stai per eliminare <b>{`${u.displayName} ${u.cognome}`.trim() || u.email || "utente"}</b>.
          <br />
          L’azione è irreversibile.
        </Text>
      ),
      labels: { confirm: "Elimina", cancel: "Annulla" },
      confirmProps: { color: "red", leftSection: <IconTrash size={16} /> },
      onConfirm: async () => {
        try {
          await api.delete(`/api/users/${u.id}`);
          setUtenti((prev) => prev.filter((x) => x.id !== u.id));
        } catch (e) {
          console.error(e);
          const message = e instanceof ApiError ? e.message : "Impossibile eliminare l’utente.";
          modals.open({
            title: "Errore",
            centered: true,
            children: (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                {message}
              </Alert>
            ),
          });
        }
      },
    });
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      setRoleSave((s) => ({ ...s, [id]: "saving" }));
      const updated = await api.patch<Utente>(`/api/users/${id}/role`, { ruolo: newRole });
      setUtenti((prev) => prev.map((u) => (u.id === id ? { ...u, ruolo: updated.ruolo } : u)));
      setRoleSave((s) => ({ ...s, [id]: "saved" }));
      window.setTimeout(() => setRoleSave((s) => ({ ...s, [id]: "idle" })), 1200);
    } catch (e) {
      console.error(e);
      setRoleSave((s) => ({ ...s, [id]: "error" }));
      window.setTimeout(() => setRoleSave((s) => ({ ...s, [id]: "idle" })), 1800);
    }
  };

  const ruoloOptions = useMemo(
    () => ["Tutti", ...ruoliDisponibili],
    [ruoliDisponibili]
  );

  return (
    <Box>
      <Header />

      <Container size="xl" py="xl">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Stack gap={4}>
              <Title order={2} c="white">👥 Utenti registrati</Title>
              <Text c="dimmed">
                Filtra per ruolo, cerca rapidamente e gestisci i ruoli degli utenti.
              </Text>
            </Stack>

            <Group gap="sm">
              <Badge variant="light" color="gray">users</Badge>
              <Badge variant="light" color="yellow">
                {utentiFiltrati.length} risultati
              </Badge>
            </Group>
          </Group>

          <Card withBorder radius="lg" p="lg">
            <Stack gap="md">
              <Group justify="space-between" wrap="wrap">
                <Group gap="sm" wrap="wrap">
                  <Select
                    label="Ruolo"
                    value={filtroRuolo}
                    data={ruoloOptions}
                    onChange={(v) => setFiltroRuolo(v || "Tutti")}
                    searchable
                    radius="lg"
                    w={260}
                  />
                  <TextInput
                    label="Cerca"
                    value={query}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.currentTarget.value)}
                    placeholder="Nome, cognome, email, telefono…"
                    leftSection={<IconSearch size={16} />}
                    radius="lg"
                    w={360}
                  />
                </Group>

                <Group gap="xs" justify="flex-end" style={{ alignSelf: "flex-end" }}>
                  <Tooltip label="Reset filtri">
                    <ActionIcon
                      variant="light"
                      radius="lg"
                      onClick={() => {
                        setFiltroRuolo("Tutti");
                        setQuery("");
                      }}
                      aria-label="Reset filtri"
                    >
                      ⟲
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              {loadError && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" radius="lg" variant="light">
                  {loadError}
                </Alert>
              )}
            </Stack>
          </Card>

          {loading ? (
            <Card withBorder radius="lg" p="xl">
              <Group justify="center">
                <Loader />
                <Text>Caricamento utenti…</Text>
              </Group>
            </Card>
          ) : utentiFiltrati.length === 0 ? (
            <Card withBorder radius="lg" p="xl">
              <Text c="dimmed">Nessun utente trovato con i filtri correnti.</Text>
            </Card>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {utentiFiltrati.map((u) => {
                const fullName = `${u.displayName} ${u.cognome}`.trim() || "—";
                const state = roleSave[u.id] || "idle";

                return (
                  <Card key={u.id} withBorder radius="lg" p="lg">
                    <Stack gap="md">
                      <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Group gap="md" wrap="nowrap">
                          <Box
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 14,
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 800,
                              background: "rgba(0,0,0,0.05)",
                            }}
                          >
                            {makeInitials(u)}
                          </Box>

                          <Stack gap={2} style={{ minWidth: 0 }}>
                            <Group gap="xs" wrap="wrap">
                              <Text fw={800} style={{ lineHeight: 1.1 }}>
                                {fullName}
                              </Text>
                              <Badge variant="light" color="gray">
                                {u.ruolo || "PublicUser"}
                              </Badge>
                            </Group>
                            <Text size="sm" c="dimmed" style={{ wordBreak: "break-word" }}>
                              {u.email || "—"}
                            </Text>
                          </Stack>
                        </Group>

                        <Menu withinPortal position="bottom-end" shadow="md">
                          <Menu.Target>
                            <ActionIcon variant="subtle" radius="lg" aria-label="Azioni">
                              <IconDotsVertical size={18} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              leftSection={<IconTrash size={16} />}
                              color="red"
                              onClick={() => handleDelete(u)}
                            >
                              Elimina utente
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>

                      <Divider />

                      <Stack gap={8}>
                        <Group gap="sm" wrap="nowrap">
                          <IconMail size={16} />
                          {u.email ? (
                            <Text component="a" href={`mailto:${u.email}`} size="sm" style={{ wordBreak: "break-word" }}>
                              {u.email}
                            </Text>
                          ) : (
                            <Text size="sm" c="dimmed">—</Text>
                          )}
                        </Group>

                        <Group gap="sm" wrap="nowrap">
                          <IconPhone size={16} />
                          {u.telefono ? (
                            <Text component="a" href={`tel:${u.telefono}`} size="sm">
                              {u.telefono}
                            </Text>
                          ) : (
                            <Text size="sm" c="dimmed">—</Text>
                          )}
                        </Group>

                        <Group gap="sm" wrap="nowrap">
                          <IconUser size={16} />
                          <Text size="sm" c="dimmed">
                            {u.corsoLaurea || "—"}
                            {(u.corsoLaurea || u.annoAccademico) ? " • " : ""}
                            {u.annoAccademico || ""}
                          </Text>
                        </Group>
                      </Stack>

                      <Divider />

                      <Group justify="space-between" align="flex-end" wrap="wrap">
                        <Select
                          label="Ruolo"
                          value={u.ruolo || "PublicUser"}
                          data={ruoliDisponibili.length ? ruoliDisponibili : ["PublicUser"]}
                          onChange={(v) => v && handleRoleChange(u.id, v)}
                          radius="lg"
                          w={240}
                        />

                        <Box aria-live="polite" role="status" style={{ minHeight: 24 }}>
                          {state === "saving" && <Text size="sm">Salvataggio…</Text>}
                          {state === "saved" && <Text size="sm" c="green">Salvato</Text>}
                          {state === "error" && <Text size="sm" c="red">Errore</Text>}
                        </Box>
                      </Group>

                      {/* bottone secondario (opzionale) in fondo, se preferisci visibile */}
                      <Button
                        variant="light"
                        color="red"
                        leftSection={<IconTrash size={16} />}
                        radius="lg"
                        onClick={() => handleDelete(u)}
                      >
                        Elimina
                      </Button>
                    </Stack>
                  </Card>
                );
              })}
            </SimpleGrid>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default UtentiGestionale;
