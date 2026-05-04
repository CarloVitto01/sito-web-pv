// src/pages/AccountPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../../backend/firebase";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Container,
  Card,
  Stack,
  Title,
  Text,
  Group,
  Button,
  Divider,
  SimpleGrid,
  TextInput,
  Checkbox,
  Badge,
  ThemeIcon,
  Alert,
  Loader,
  Pagination,
  ScrollArea,
  Select,
} from "@mantine/core";

import {
  IconHome,
  IconKey,
  IconDeviceFloppy,
  IconReceipt2,
  IconShoppingBag,
  IconCoin,
  IconAlertCircle,
  IconCalendar,
} from "@tabler/icons-react";

import Header from "../../HeaderComponents/Header";
import Footer from "../../FooterComponents/Footer";

const fmtEuro = (n?: number | string) =>
  typeof n === "number"
    ? n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Number(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parsePrice = (val: any) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = Number(val.replace(",", ".").replace(/[^\d.-]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
};

const fmtDate = (isoLike: string | Date | undefined | null) => {
  try {
    const d = typeof isoLike === "string" ? new Date(isoLike) : isoLike instanceof Date ? isoLike : null;
    if (!d || isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  } catch {
    return "-";
  }
};

// 👇 Tipo degli ordini letti da ArchivioOrdini
type FirestoreTimestampLike = { toDate?: () => Date };
type Order = {
  id: string;
  uid?: string;
  tipo?: string;
  prezzo?: number | string;
  totaleFinale?: number | string;
  timestamp?: string | null | FirestoreTimestampLike;
  _tsMillis?: number;
  [key: string]: any;
};

const PAGE_SIZE = 10;

const CORSI_LAUREA_OPTIONS = [
  { value: "Medicina", label: "Medicina" },
  { value: "Odontoiatria", label: "Odontoiatria" },
  { value: "Infermieristica", label: "Infermieristica" },
  { value: "Fisioterapia", label: "Fisioterapia" },
  { value: "Biotecnologie", label: "Biotecnologie" },
  { value: "Farmacia", label: "Farmacia" },
  { value: "CTF", label: "CTF" },
  { value: "Giurisprudenza", label: "Giurisprudenza" },
  { value: "Economia", label: "Economia" },
  { value: "Ingegneria", label: "Ingegneria" },
  { value: "Lettere", label: "Lettere" },
  { value: "Scienze della formazione", label: "Scienze della formazione" },
  { value: "Scienze motorie", label: "Scienze motorie" },
  { value: "Altro", label: "Altro" },
];

const ANNI_CORSO_OPTIONS = [
  { value: "1", label: "1° anno" },
  { value: "2", label: "2° anno" },
  { value: "3", label: "3° anno" },
  { value: "4", label: "4° anno" },
  { value: "5", label: "5° anno" },
  { value: "6", label: "6° anno" },
];

const normalizeAnnoCorsoValue = (value: any): string | null => {
  const raw = String(value || "").trim();

  if (["1", "2", "3", "4", "5", "6"].includes(raw)) return raw;

  // Retrocompatibilità: se prima avevi salvato 2026, non lo selezioniamo automaticamente.
  // L'utente dovrà scegliere 1°, 2°, ecc.
  return null;
};

const normalizeCorsoLaureaValue = (value: any): string | null => {
  const raw = String(value || "").trim();

  if (!raw) return null;

  const match = CORSI_LAUREA_OPTIONS.find(
    (opt) => opt.value.toLowerCase() === raw.toLowerCase()
  );

  return match?.value || null;
};

const AccountPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [isStudente, setIsStudente] = useState(false);
  const [totalSpent, setTotalSpent] = useState<number>(0);

  const [page, setPage] = useState<number>(1);

  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
          return;
        }

        const docRef = doc(db, "users", user.uid);
        const archiveQuery = query(collection(db, "ArchivioOrdini"), where("uid", "==", user.uid));

        const [archiveSnapshot, docSnap] = await Promise.all([getDocs(archiveQuery), getDoc(docRef)]);

        const userOrders: Order[] = archiveSnapshot.docs.map((d) => {
          const data = d.data() as any;

          let tsISO: string | null = null;
          let ms = 0;

          if (data?.timestamp?.toDate) {
            const dt = (data.timestamp as FirestoreTimestampLike).toDate!();
            tsISO = dt.toISOString();
            ms = dt.getTime();
          } else if (typeof data?.timestamp === "string") {
            tsISO = data.timestamp;
            ms = Date.parse(data.timestamp) || 0;
          } else {
            tsISO = null;
            ms = 0;
          }

          return {
            id: d.id,
            ...data,
            timestamp: tsISO ?? data?.timestamp ?? null,
            _tsMillis: ms,
          } as Order;
        });

        userOrders.sort((a, b) => (b._tsMillis ?? 0) - (a._tsMillis ?? 0));

        const total = userOrders.reduce((sum, o) => {
          const v = o.totaleFinale ?? o.prezzo;
          return sum + parsePrice(v);
        }, 0);

        if (alive) {
          setOrders(userOrders);
          setTotalSpent(total);

          if (docSnap.exists()) {
            const ud = docSnap.data();
            setUserData(ud);
            setIsStudente(!!ud.corsoLaurea || !!ud.annoAccademico);
          } else {
            setUserData(null);
            setIsStudente(false);
          }
        }
      } catch (e) {
        console.error(e);
        if (alive) setError("Errore durante il caricamento dei dati.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchData();
    return () => {
      alive = false;
    };
  }, [navigate]);

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return orders.slice(start, start + PAGE_SIZE);
  }, [orders, page]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    setUserData((prev: any) => ({ ...(prev || {}), [name]: value }));
  };

  const handleSelectChange = (name: string, value: string | null) => {
    setUserData((prev: any) => ({
      ...(prev || {}),
      [name]: value || "",
    }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const user = auth.currentUser;
    if (!user) return;

    const updatedData = { ...(userData || {}) };

    if (!isStudente) {
      delete updatedData.corsoLaurea;
      delete updatedData.annoAccademico;
      setUserData((prev: any) => ({ ...(prev || {}), corsoLaurea: "", annoAccademico: "" }));
    } else {
      updatedData.corsoLaurea = normalizeCorsoLaureaValue(updatedData.corsoLaurea) || "";
      updatedData.annoAccademico = normalizeAnnoCorsoValue(updatedData.annoAccademico) || "";

      if (!updatedData.corsoLaurea) {
        setError("Seleziona il corso di laurea.");
        return;
      }

      if (!updatedData.annoAccademico) {
        setError("Seleziona l'anno di corso.");
        return;
      }
    }

    try {
      await updateDoc(doc(db, "users", user.uid), updatedData);
      setSuccess("Dati aggiornati con successo!");
    } catch (err) {
      console.error(err);
      setError("Errore durante l'aggiornamento.");
    }
  };

  const handlePasswordReset = () => {
    setError("");
    setSuccess("");

    const user = auth.currentUser;
    if (!user?.email) return;

    import("firebase/auth").then(({ sendPasswordResetEmail }) => {
      sendPasswordResetEmail(auth, user.email!)
        .then(() => setSuccess("Email per il cambio password inviata!"))
        .catch((e) => {
          console.error(e);
          setError("Errore durante l'invio dell'email.");
        });
    });
  };

  const emailReadonly = auth.currentUser?.email || "";

  return (
    <>
      <Header />

      <Box component="main" py={28}>
        <Container size="lg">
          {loading ? (
            <Card withBorder radius="md" p="md">
              <Group>
                <Loader />
                <Text>Caricamento in corso…</Text>
              </Group>
            </Card>
          ) : (
            <Stack gap="md">
              {/* HEADER (stile gestionale) */}
              <Group justify="space-between" align="flex-end" wrap="wrap">
                <div>
                  <Title
                    order={2}
                    style={{
                      color: "white",
                    }}
                  >
                    Il mio account
                  </Title>
                  <Text size="sm" c="dimmed">
                    Gestisci i tuoi dati e rivedi gli ordini effettuati su Photo &amp; Vision.
                  </Text>
                </div>
                <Group gap="sm">
                  <Badge variant="light">Gestionale</Badge>
                  <Button variant="light" leftSection={<IconHome size={16} />} onClick={() => navigate("/")}>
                    Home
                  </Button>
                  <Button leftSection={<IconKey size={16} />} onClick={handlePasswordReset}>
                    Cambia password
                  </Button>
                </Group>
              </Group>

              <Divider />

              {(success || error) && (
                <Alert
                  variant="light"
                  icon={<IconAlertCircle size={18} />}
                  color={success ? "green" : "red"}
                >
                  {success || error}
                </Alert>
              )}

              {/* KPI */}
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Card withBorder radius="md" p="md">
                  <Group gap="sm">
                    <ThemeIcon variant="light" size={40} radius="md">
                      <IconShoppingBag size={18} />
                    </ThemeIcon>
                    <div>
                      <Text fw={700}>{orders.length}</Text>
                      <Text size="sm" c="dimmed">
                        Ordini
                      </Text>
                    </div>
                  </Group>
                </Card>

                <Card withBorder radius="md" p="md">
                  <Group gap="sm">
                    <ThemeIcon variant="light" size={40} radius="md">
                      <IconCoin size={18} />
                    </ThemeIcon>
                    <div>
                      <Text fw={700}>€{fmtEuro(totalSpent)}</Text>
                      <Text size="sm" c="dimmed">
                        Totale speso
                      </Text>
                    </div>
                  </Group>
                </Card>
              </SimpleGrid>

              {/* CONTENT GRID */}
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                {/* LEFT: FORM */}
                <Card withBorder radius="md" p="md">
                  <Group justify="space-between" align="center">
                    <Group gap="sm">
                      <ThemeIcon variant="light" size={40} radius="md">
                        <IconDeviceFloppy size={18} />
                      </ThemeIcon>
                      <div>
                        <Text fw={700}>Dati personali</Text>
                        <Text size="sm" c="dimmed">
                          Aggiorna le informazioni del profilo
                        </Text>
                      </div>
                    </Group>
                  </Group>

                  <Divider my="md" />

                  <form onSubmit={handleUpdate}>
                    <Stack gap="sm">
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                        <TextInput
                          label="Nome"
                          name="displayName"
                          value={userData?.displayName || ""}
                          onChange={handleChange}
                          required
                        />
                        <TextInput
                          label="Cognome"
                          name="cognome"
                          value={userData?.cognome || ""}
                          onChange={handleChange}
                          required
                        />
                      </SimpleGrid>

                      <TextInput label="Email" value={emailReadonly} readOnly />

                      <TextInput
                        label="Telefono"
                        name="telefono"
                        value={userData?.telefono || ""}
                        onChange={handleChange}
                        required
                      />

                      <Checkbox
                        label="Studente universitario (Ecotekne)?"
                        checked={isStudente}
                        onChange={async (e) => {
                          const checked = e.currentTarget.checked;
                          setIsStudente(checked);

                          if (!checked) {
                            setUserData((prev: any) => ({
                              ...(prev || {}),
                              corsoLaurea: "",
                              annoAccademico: "",
                            }));

                            const user = auth.currentUser;
                            if (user) {
                              try {
                                await updateDoc(doc(db, "users", user.uid), {
                                  corsoLaurea: "",
                                  annoAccademico: "",
                                });
                              } catch { }
                            }
                          }
                        }}
                      />

                      {isStudente && (
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                          <Select
                            label="Corso di Laurea"
                            placeholder="Seleziona corso"
                            value={normalizeCorsoLaureaValue(userData?.corsoLaurea)}
                            onChange={(value) => handleSelectChange("corsoLaurea", value)}
                            data={CORSI_LAUREA_OPTIONS}
                            searchable
                            clearable
                          />

                          <Select
                            label="Anno di corso"
                            placeholder="Seleziona anno"
                            value={normalizeAnnoCorsoValue(userData?.annoAccademico)}
                            onChange={(value) => handleSelectChange("annoAccademico", value)}
                            data={ANNI_CORSO_OPTIONS}
                            clearable
                          />
                        </SimpleGrid>
                      )}

                      <Group justify="flex-end" mt="xs">
                        <Button type="submit" leftSection={<IconDeviceFloppy size={16} />}>
                          Aggiorna dati
                        </Button>
                      </Group>
                    </Stack>
                  </form>
                </Card>

                {/* RIGHT: ORDERS */}
                <Card withBorder radius="md" p="md">
                  <Group justify="space-between" align="center">
                    <Group gap="sm">
                      <ThemeIcon variant="light" size={40} radius="md">
                        <IconReceipt2 size={18} />
                      </ThemeIcon>
                      <div>
                        <Text fw={700}>Storico ordini</Text>
                        <Text size="sm" c="dimmed">
                          Ultimi ordini effettuati
                        </Text>
                      </div>
                    </Group>

                    <Badge variant="light">{orders.length}</Badge>
                  </Group>

                  <Divider my="md" />

                  {orders.length === 0 ? (
                    <Card withBorder radius="md" p="md">
                      <Text c="dimmed">Nessun ordine trovato.</Text>
                    </Card>
                  ) : (
                    <Stack gap="sm">
                      <ScrollArea h={460} type="auto" scrollbarSize={8} offsetScrollbars>
                        <Stack gap="sm" pr={6}>
                          {paginatedOrders.map((order) => {
                            const total = fmtEuro(parsePrice(order.totaleFinale ?? order.prezzo));
                            const dateStr =
                              typeof order.timestamp === "string"
                                ? fmtDate(order.timestamp)
                                : fmtDate(order.timestamp?.toDate?.());

                            return (
                              <Card key={order.id} withBorder radius="md" p="md">
                                <Group justify="space-between" align="flex-start" wrap="nowrap">
                                  <Group gap="sm" wrap="nowrap">
                                    <ThemeIcon variant="light" size={40} radius="md">
                                      <IconReceipt2 size={18} />
                                    </ThemeIcon>

                                    <div>
                                      <Group gap={8} wrap="wrap">
                                        <Text fw={700}>{order.tipo ?? "Ordine"}</Text>

                                        <Badge leftSection={<IconCalendar size={12} />} variant="light">
                                          {dateStr}
                                        </Badge>

                                        {order?.stato && <Badge variant="light">{String(order.stato)}</Badge>}
                                      </Group>
                                    </div>
                                  </Group>

                                  <Text fw={800} style={{ whiteSpace: "nowrap" }}>
                                    €{total}
                                  </Text>
                                </Group>
                              </Card>
                            );
                          })}
                        </Stack>
                      </ScrollArea>

                      {totalPages > 1 && (
                        <Group justify="center" mt="xs">
                          <Pagination total={totalPages} value={page} onChange={setPage} radius="md" />
                        </Group>
                      )}
                    </Stack>
                  )}
                </Card>
              </SimpleGrid>
            </Stack>
          )}
        </Container>
      </Box>

      <Footer />
    </>
  );
};

export default AccountPage;