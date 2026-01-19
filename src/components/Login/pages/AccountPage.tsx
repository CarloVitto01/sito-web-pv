// src/pages/AccountPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../../backend/firebase";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Container,
  Paper,
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
  Card,
} from "@mantine/core";

import {
  IconHome,
  IconKey,
  IconDeviceFloppy,
  IconReceipt2,
  IconShoppingBag,
  IconCoin,
  IconAlertCircle,
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
} from "@tabler/icons-react";

import Header from "../../HeaderComponents/Header";
import Footer from "../../FooterComponents/Footer";

const ACCENT = "#d1ab63";

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
    const fetchData = async () => {
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
      setOrders(userOrders);

      const total = userOrders.reduce((sum, o) => {
        const v = o.totaleFinale ?? o.prezzo;
        return sum + parsePrice(v);
      }, 0);
      setTotalSpent(total);

      if (docSnap.exists()) {
        const ud = docSnap.data();
        setUserData(ud);
        setIsStudente(!!ud.corsoLaurea || !!ud.annoAccademico);
      }

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [orders.length, totalPages, page]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return orders.slice(start, start + PAGE_SIZE);
  }, [orders, page]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const user = auth.currentUser;
    if (!user) return;

    const updatedData = { ...userData };

    if (!isStudente) {
      delete updatedData.corsoLaurea;
      delete updatedData.annoAccademico;

      setUserData((prev: any) => ({ ...prev, corsoLaurea: "", annoAccademico: "" }));
    }

    try {
      await updateDoc(doc(db, "users", user.uid), updatedData);
      setSuccess("Dati aggiornati con successo!");
    } catch (err) {
      setError("Errore durante l'aggiornamento.");
    }
  };

  const handlePasswordReset = () => {
    const user = auth.currentUser;
    if (!user?.email) return;
    import("firebase/auth").then(({ sendPasswordResetEmail }) => {
      sendPasswordResetEmail(auth, user.email!)
        .then(() => setSuccess("Email per il cambio password inviata!"))
        .catch(() => setError("Errore durante l'invio dell'email."));
    });
  };

  if (loading) {
    return (
      <>
        <Header />
        <Box mih="70vh" style={{ display: "flex", alignItems: "center" }}>
          <Container size="lg">
            <Paper
              radius="xl"
              p="xl"
              style={{
                background: "rgba(10,12,16,0.78)",
                border: "1px solid rgba(255,255,255,0.10)",
                backdropFilter: "blur(10px)",
              }}
            >
              <Group>
                <Loader color="gray" />
                <Text style={{ color: "rgba(255,255,255,0.75)" }}>Caricamento in corso…</Text>
              </Group>
            </Paper>
          </Container>
        </Box>
        <Footer />
      </>
    );
  }

  const emailReadonly = auth.currentUser?.email || "";

  return (
    <>
      <Header />

      <Box
        mih="100vh"
        style={{
          background: "#070A0F",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow */}
        <Box
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(900px 600px at 18% 30%, rgba(209,171,99,0.16), transparent 60%), radial-gradient(700px 480px at 75% 65%, rgba(209,171,99,0.08), transparent 60%)",
            pointerEvents: "none",
          }}
        />

        <Container size="lg" py={{ base: 18, sm: 28 }} style={{ position: "relative" }}>
          {/* HERO */}
          <Paper
            radius="xl"
            p={{ base: "lg", sm: "xl" }}
            style={{
              background: "rgba(10,12,16,0.70)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
              <Stack gap={6} maw={640}>
                <Text
                  style={{
                    color: ACCENT,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    fontSize: 12,
                  }}
                >
                  Account
                </Text>

                <Title order={2} style={{ color: "#fff", letterSpacing: -0.5 }}>
                  Il mio account
                </Title>

                <Text style={{ color: "rgba(255,255,255,0.70)", lineHeight: 1.7 }}>
                  Gestisci i tuoi dati e rivedi gli ordini effettuati su{" "}
                  <span style={{ color: "#fff", fontWeight: 800 }}>Photo &amp; Vision</span>.
                </Text>

                <Group gap="sm" mt="sm">
                  <Card
                    radius="xl"
                    p="md"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      minWidth: 170,
                    }}
                  >
                    <Group gap={10} align="center">
                      <ThemeIcon
                        radius="xl"
                        size={34}
                        style={{
                          background: "rgba(209,171,99,0.14)",
                          border: "1px solid rgba(209,171,99,0.35)",
                          color: ACCENT,
                        }}
                      >
                        <IconShoppingBag size={18} />
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text style={{ color: "#fff", fontWeight: 800, lineHeight: 1.15 }}>{orders.length}</Text>
                        <Text size="xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                          Ordini
                        </Text>
                      </Stack>
                    </Group>
                  </Card>

                  <Card
                    radius="xl"
                    p="md"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      minWidth: 220,
                    }}
                  >
                    <Group gap={10} align="center">
                      <ThemeIcon
                        radius="xl"
                        size={34}
                        style={{
                          background: "rgba(209,171,99,0.14)",
                          border: "1px solid rgba(209,171,99,0.35)",
                          color: ACCENT,
                        }}
                      >
                        <IconCoin size={18} />
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text style={{ color: "#fff", fontWeight: 800, lineHeight: 1.15 }}>
                          €{fmtEuro(totalSpent)}
                        </Text>
                        <Text size="xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                          Totale speso
                        </Text>
                      </Stack>
                    </Group>
                  </Card>
                </Group>
              </Stack>

              <Group gap="sm" style={{ alignSelf: "flex-start" }}>
                <Button
                  radius="lg"
                  variant="outline"
                  onClick={() => navigate("/")}
                  leftSection={<IconHome size={18} />}
                  style={{
                    borderColor: "rgba(255,255,255,0.16)",
                    color: "rgba(255,255,255,0.82)",
                  }}
                >
                  Home
                </Button>

                <Button
                  radius="lg"
                  onClick={handlePasswordReset}
                  leftSection={<IconKey size={18} />}
                  style={{
                    background: ACCENT,
                    color: "#111",
                    fontWeight: 800,
                  }}
                >
                  Cambia password
                </Button>
              </Group>
            </Group>
          </Paper>

          {(success || error) && (
            <Alert
              mt="md"
              radius="xl"
              variant="light"
              icon={<IconAlertCircle size={18} />}
              color={success ? "green" : "red"}
              styles={{
                root: {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                },
                message: { color: success ? "#b7f7c2" : "#ffb3b3" },
                label: { color: "#fff" },
              }}
            >
              {success || error}
            </Alert>
          )}

          {/* CONTENT GRID */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" mt="xl">
            {/* LEFT: FORM */}
            <Paper
              radius="xl"
              p={{ base: "lg", sm: "xl" }}
              style={{
                background: "rgba(10,12,16,0.70)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                backdropFilter: "blur(10px)",
              }}
            >
              <Group justify="space-between" align="center" mb="sm">
                <Group gap={10}>
                  <ThemeIcon
                    radius="xl"
                    size={34}
                    style={{
                      background: "rgba(209,171,99,0.14)",
                      border: "1px solid rgba(209,171,99,0.35)",
                      color: ACCENT,
                    }}
                  >
                    <IconDeviceFloppy size={18} />
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text style={{ color: "#fff", fontWeight: 800 }}>Dati personali</Text>
                    <Text size="sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                      Aggiorna le informazioni del profilo
                    </Text>
                  </Stack>
                </Group>
              </Group>

              <Divider my="md" style={{ borderColor: "rgba(255,255,255,0.08)" }} />

              <form onSubmit={handleUpdate}>
                <Stack gap="sm">
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <TextInput
                      label="Nome"
                      name="displayName"
                      value={userData?.displayName || ""}
                      onChange={handleChange}
                      required
                      styles={{
                        label: { color: "rgba(255,255,255,0.85)" },
                        input: {
                          backgroundColor: "rgba(255,255,255,0.06)",
                          borderColor: "rgba(255,255,255,0.10)",
                          color: "#fff",
                        },
                      }}
                    />

                    <TextInput
                      label="Cognome"
                      name="cognome"
                      value={userData?.cognome || ""}
                      onChange={handleChange}
                      required
                      styles={{
                        label: { color: "rgba(255,255,255,0.85)" },
                        input: {
                          backgroundColor: "rgba(255,255,255,0.06)",
                          borderColor: "rgba(255,255,255,0.10)",
                          color: "#fff",
                        },
                      }}
                    />
                  </SimpleGrid>

                  <TextInput
                    label="Email"
                    value={emailReadonly}
                    readOnly
                    styles={{
                      label: { color: "rgba(255,255,255,0.85)" },
                      input: {
                        backgroundColor: "rgba(255,255,255,0.03)",
                        borderColor: "rgba(255,255,255,0.10)",
                        color: "rgba(255,255,255,0.70)",
                      },
                    }}
                  />

                  <TextInput
                    label="Telefono"
                    name="telefono"
                    value={userData?.telefono || ""}
                    onChange={handleChange}
                    required
                    styles={{
                      label: { color: "rgba(255,255,255,0.85)" },
                      input: {
                        backgroundColor: "rgba(255,255,255,0.06)",
                        borderColor: "rgba(255,255,255,0.10)",
                        color: "#fff",
                      },
                    }}
                  />

                  <Checkbox
                    label="Studente universitario (Ecotekne)?"
                    checked={isStudente}
                    onChange={async (e) => {
                      const checked = e.currentTarget.checked;
                      setIsStudente(checked);

                      if (!checked) {
                        setUserData((prev: any) => ({ ...prev, corsoLaurea: "", annoAccademico: "" }));
                        const user = auth.currentUser;
                        if (user) {
                          try {
                            await updateDoc(doc(db, "users", user.uid), { corsoLaurea: "", annoAccademico: "" });
                          } catch { }
                        }
                      }
                    }}
                    styles={{
                      label: { color: "rgba(255,255,255,0.78)" },
                      input: { borderColor: "rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.02)" },
                    }}
                  />

                  {isStudente && (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      <TextInput
                        label="Corso di Laurea"
                        name="corsoLaurea"
                        value={userData?.corsoLaurea || ""}
                        onChange={handleChange}
                        styles={{
                          label: { color: "rgba(255,255,255,0.85)" },
                          input: {
                            backgroundColor: "rgba(255,255,255,0.06)",
                            borderColor: "rgba(255,255,255,0.10)",
                            color: "#fff",
                          },
                        }}
                      />

                      <TextInput
                        label="Anno Accademico"
                        name="annoAccademico"
                        value={userData?.annoAccademico || ""}
                        onChange={handleChange}
                        styles={{
                          label: { color: "rgba(255,255,255,0.85)" },
                          input: {
                            backgroundColor: "rgba(255,255,255,0.06)",
                            borderColor: "rgba(255,255,255,0.10)",
                            color: "#fff",
                          },
                        }}
                      />
                    </SimpleGrid>
                  )}

                  <Group justify="flex-end" mt="xs">
                    <Button
                      type="submit"
                      radius="lg"
                      leftSection={<IconDeviceFloppy size={18} />}
                      style={{
                        background: ACCENT,
                        color: "#111",
                        fontWeight: 800,
                      }}
                    >
                      Aggiorna dati
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Paper>

            {/* RIGHT: ORDERS */}
            <Paper
              radius="xl"
              p={{ base: "lg", sm: "xl" }}
              style={{
                background: "rgba(10,12,16,0.70)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                backdropFilter: "blur(10px)",
              }}
            >
              <Group justify="space-between" align="center" mb="sm">
                <Group gap={10}>
                  <ThemeIcon
                    radius="xl"
                    size={34}
                    style={{
                      background: "rgba(209,171,99,0.14)",
                      border: "1px solid rgba(209,171,99,0.35)",
                      color: ACCENT,
                    }}
                  >
                    <IconReceipt2 size={18} />
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text style={{ color: "#fff", fontWeight: 800 }}>
                      Storico ordini
                    </Text>
                    <Text size="sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                      Ultimi ordini effettuati
                    </Text>
                  </Stack>
                </Group>

                <Badge
                  radius="xl"
                  variant="light"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {orders.length}
                </Badge>
              </Group>

              <Divider my="md" style={{ borderColor: "rgba(255,255,255,0.08)" }} />

              {orders.length === 0 ? (
                <Paper
                  radius="xl"
                  p="xl"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    textAlign: "center",
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.75)" }}>Nessun ordine trovato.</Text>
                </Paper>
              ) : (
                <Stack gap="sm">
                  {paginatedOrders.map((order) => {
                    const total = fmtEuro(parsePrice(order.totaleFinale ?? order.prezzo));
                    const dateStr =
                      typeof order.timestamp === "string"
                        ? fmtDate(order.timestamp)
                        : fmtDate(order.timestamp?.toDate?.());

                    return (
                      <Paper
                        key={order.id}
                        radius="xl"
                        p="md"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                          <Group gap={10} wrap="nowrap">
                            <ThemeIcon
                              radius="xl"
                              size={34}
                              style={{
                                background: "rgba(209,171,99,0.14)",
                                border: "1px solid rgba(209,171,99,0.35)",
                                color: ACCENT,
                              }}
                            >
                              <IconReceipt2 size={18} />
                            </ThemeIcon>

                            <Stack gap={2}>
                              <Group gap={8} wrap="wrap">
                                <Text style={{ color: "#fff", fontWeight: 800 }}>
                                  {order.tipo ?? "Ordine"}
                                </Text>
                                <Badge
                                  leftSection={<IconCalendar size={12} />}
                                  radius="xl"
                                  variant="light"
                                  style={{
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.10)",
                                    color: "rgba(255,255,255,0.80)",
                                  }}
                                >
                                  {dateStr}
                                </Badge>

                                {order?.stato && (
                                  <Badge
                                    radius="xl"
                                    variant="light"
                                    style={{
                                      background: "rgba(255,255,255,0.06)",
                                      border: "1px solid rgba(255,255,255,0.10)",
                                      color: "rgba(255,255,255,0.80)",
                                    }}
                                  >
                                    {String(order.stato)}
                                  </Badge>
                                )}
                              </Group>
                            </Stack>
                          </Group>

                          <Text style={{ color: "#fff", fontWeight: 900, whiteSpace: "nowrap" }}>
                            €{total}
                          </Text>
                        </Group>
                      </Paper>
                    );
                  })}

                  {/* Pagination */}
                  <Group justify="space-between" mt="xs" align="center" wrap="nowrap">
                    {/* PREV */}
                    <Button
                      radius="lg"
                      variant="outline"
                      leftSection={<IconChevronLeft size={18} />}
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      visibleFrom="sm"
                      style={{
                        borderColor: "rgba(255,255,255,0.16)",
                        color: "rgba(255, 255, 255, 0.82)",
                      }}
                    >
                      Precedenti
                    </Button>

                    <Button
                      radius="lg"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      hiddenFrom="sm"
                      style={{
                        borderColor: "rgba(255,255,255,0.16)",
                        color: "rgba(255, 251, 0, 0.82)",
                        width: 44,
                        paddingLeft: 0,
                        paddingRight: 0,
                      }}
                      aria-label="Precedenti"
                    >
                      <IconChevronLeft size={18} />
                    </Button>

                    {/* INFO */}
                    <Text size="sm" style={{ color: "rgba(255,255,255,0.65)", whiteSpace: "nowrap" }}>
                      {page}/{totalPages}
                    </Text>

                    {/* NEXT */}
                    <Button
                      radius="lg"
                      variant="outline"
                      rightSection={<IconChevronRight size={18} />}
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      visibleFrom="sm"
                      style={{
                        borderColor: "rgba(255,255,255,0.16)",
                        color: "rgba(255, 255, 255, 0.82)",
                      }}
                    >
                      Successivi
                    </Button>

                    <Button
                      radius="lg"
                      variant="outline"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      hiddenFrom="sm"
                      style={{
                        borderColor: "rgba(255,255,255,0.16)",
                        color: "rgba(253, 216, 4, 0.82)",
                        width: 44,
                        paddingLeft: 0,
                        paddingRight: 0,
                      }}
                      aria-label="Successivi"
                    >
                      <IconChevronRight size={18} />
                    </Button>
                  </Group>

                </Stack>
              )}
            </Paper>
          </SimpleGrid>

          <Box h={28} />
        </Container>
      </Box>

      <Footer />
    </>
  );
};

export default AccountPage;
