// src/pages/RecoverPasswordPage.tsx
import React, { useState } from "react";
import {
  Box,
  Grid,
  Container,
  Paper,
  Stack,
  Title,
  Text,
  TextInput,
  Group,
  Button,
  Divider,
  ThemeIcon,
  List,
  Alert,
} from "@mantine/core";
import { IconCheck, IconAlertCircle, IconLock } from "@tabler/icons-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../../backend/firebase";
import { useNavigate } from "react-router-dom";
import logoPV from "../../../assets/images/logo_b.png";

const ACCENT = "#d1ab63";

export default function RecoverPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const q = query(
        collection(db, "users"),
        where("telefono", "==", telefono),
        where("email", "==", email)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Nessun account trovato con questi dati.");
        return;
      }

      await sendPasswordResetEmail(auth, email);
      setMessage("Email di recupero inviata. Controlla la tua casella di posta.");
    } catch {
      setError("Errore durante l’invio dell’email. Riprova.");
    }
  };

  // ✅ stile “chiaro” come Login + RecoverEmail (stessa tecnica)
  const pageBg = "#F6F7FB";
  const cardBg = "rgba(255,255,255,0.78)";
  const borderSoft = "rgba(15,23,42,0.10)";
  const textPrimary = "#0B1220";
  const textMuted = "rgba(11,18,32,0.68)";
  const inputBg = "rgba(15,23,42,0.04)";
  const inputBorder = "rgba(15,23,42,0.12)";

  return (
    <Box
      mih="100vh"
      style={{
        background: pageBg,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow (chiaro) */}
      <Box
        style={{
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(900px 600px at 18% 30%, rgba(209,171,99,0.22), transparent 60%)",
            "radial-gradient(700px 480px at 75% 65%, rgba(209,171,99,0.12), transparent 60%)",
            "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(246,247,251,1) 55%, rgba(246,247,251,1) 100%)",
          ].join(","),
          pointerEvents: "none",
        }}
      />

      <Grid mih="100vh" gutter={0} style={{ position: "relative" }}>
        {/* LEFT (desktop only) */}
        <Grid.Col span={{ base: 12, md: 7 }} visibleFrom="md">
          <Box
            mih="100vh"
            style={{
              position: "relative",
              borderRight: `1px solid ${borderSoft}`,
              overflow: "hidden",
            }}
          >
            {/* Backdrop */}
            <Box
              style={{
                position: "absolute",
                inset: 0,
                background: [
                  "radial-gradient(900px 650px at 18% 30%, rgba(209,171,99,0.26), transparent 62%)",
                  "radial-gradient(700px 520px at 70% 65%, rgba(209,171,99,0.14), transparent 60%)",
                  "linear-gradient(135deg, rgba(209,171,99,0.10) 0%, rgba(255,255,255,0) 55%)",
                  "linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(246,247,251,1) 100%)",
                ].join(","),
              }}
            />

            {/* Mesh */}
            <Box
              style={{
                position: "absolute",
                inset: -80,
                background: [
                  "repeating-linear-gradient(135deg, rgba(15,23,42,0.06) 0 1px, transparent 1px 18px)",
                  "repeating-linear-gradient(45deg, rgba(15,23,42,0.04) 0 1px, transparent 1px 26px)",
                  "radial-gradient(500px 240px at 35% 85%, rgba(209,171,99,0.14), transparent 65%)",
                ].join(","),
                opacity: 0.25,
                transform: "rotate(-6deg)",
                mixBlendMode: "multiply",
              }}
            />

            {/* Vignette */}
            <Box
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(246,247,251,0.88) 0%, rgba(246,247,251,0.72) 55%, rgba(246,247,251,0.55) 100%)",
              }}
            />
            <Box
              style={{
                position: "absolute",
                inset: 0,
                boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.06), inset 0 0 140px rgba(15,23,42,0.06)",
                pointerEvents: "none",
              }}
            />

            {/* Orbs */}
            <Box
              style={{
                position: "absolute",
                top: 110,
                left: 90,
                width: 180,
                height: 180,
                borderRadius: 999,
                background:
                  "radial-gradient(circle at 30% 30%, rgba(209,171,99,0.26), rgba(209,171,99,0.08) 55%, transparent 70%)",
                filter: "blur(2px)",
                opacity: 0.7,
              }}
            />
            <Box
              style={{
                position: "absolute",
                bottom: 120,
                right: 110,
                width: 240,
                height: 240,
                borderRadius: 999,
                background:
                  "radial-gradient(circle at 30% 30%, rgba(209,171,99,0.18), rgba(209,171,99,0.06) 55%, transparent 72%)",
                filter: "blur(3px)",
                opacity: 0.65,
              }}
            />

            {/* Logo watermark */}
            <Box
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 1,
              }}
            >
              <Box
                component="img"
                src={logoPV}
                alt="Photo & Vision"
                style={{
                  width: "22%",
                  maxWidth: 460,
                  transform: "translateY(12px) scale(1.02)",
                  userSelect: "none",
                }}
              />
            </Box>

            {/* Content centered */}
            <Container size="lg" h="100%" style={{ position: "relative", zIndex: 2 }}>
              <Box
                h="100%"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Stack gap={24} ta="center" maw={720}>
                  <Text
                    style={{
                      marginTop: 300,
                      color: ACCENT,
                      fontWeight: 800,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      fontSize: 12,
                    }}
                  >
                    Recupero accesso
                  </Text>

                  <Title order={1} style={{ color: textPrimary, letterSpacing: -0.9, lineHeight: 1.05 }}>
                    Recupera la password del tuo account.
                  </Title>

                  <Text style={{ color: textMuted, lineHeight: 1.75 }}>
                    Inserisci email e numero di telefono associati al tuo profilo per ricevere il link di reset.
                  </Text>

                  <Paper
                    radius="xl"
                    p="lg"
                    maw={720}
                    w="100%"
                    mx="auto"
                    style={{
                      background: "rgba(255,255,255,0.70)",
                      border: `1px solid ${borderSoft}`,
                      backdropFilter: "blur(10px)",
                      boxShadow: "0 18px 50px rgba(15,23,42,0.10)",
                    }}
                  >
                    <Group justify="space-between" align="center" mb="sm">
                      <Group gap={10}>
                        <ThemeIcon
                          radius="xl"
                          size={26}
                          style={{
                            background: "rgba(209,171,99,0.14)",
                            border: "1px solid rgba(209,171,99,0.35)",
                            color: ACCENT,
                          }}
                        >
                          <IconLock size={16} />
                        </ThemeIcon>
                        <Text style={{ color: textPrimary, fontWeight: 800, letterSpacing: -0.2 }}>
                          Suggerimento
                        </Text>
                      </Group>
                      <Text size="sm" style={{ color: textMuted }}>
                        sicurezza
                      </Text>
                    </Group>

                    <List
                      spacing="sm"
                      styles={{ itemLabel: { color: textMuted, lineHeight: 1.6 } }}
                      icon={
                        <ThemeIcon
                          radius="xl"
                          size={22}
                          style={{
                            background: "rgba(209,171,99,0.14)",
                            border: "1px solid rgba(209,171,99,0.35)",
                            color: ACCENT,
                          }}
                        >
                          <IconCheck size={14} />
                        </ThemeIcon>
                      }
                    >
                      <List.Item>Controlla anche la cartella Spam/Promozioni</List.Item>
                      <List.Item>Dopo il reset, effettua il login con la nuova password</List.Item>
                    </List>
                  </Paper>
                </Stack>
              </Box>
            </Container>
          </Box>
        </Grid.Col>

        {/* RIGHT (form) */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Box mih="100vh" style={{ display: "flex", alignItems: "center" }}>
            <Container size={420} w="100%" py="xl">
              <Paper
                radius="xl"
                p="xl"
                style={{
                  background: cardBg,
                  border: `1px solid ${borderSoft}`,
                  boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <form onSubmit={handleRecover}>
                  <Stack gap="md">
                    <Stack gap={4}>
                      <Title order={2} style={{ color: textPrimary, letterSpacing: -0.4 }}>
                        Recupera password
                      </Title>
                      <Text style={{ color: textMuted }}>Ti invieremo un’email di reset</Text>
                    </Stack>

                    <Divider style={{ borderColor: borderSoft }} />

                    {error && (
                      <Alert
                        icon={<IconAlertCircle size={16} />}
                        color="red"
                        variant="light"
                        styles={{
                          root: { background: "rgba(255, 0, 0, 0.08)", borderColor: "rgba(255, 0, 0, 0.18)" },
                          message: { color: textPrimary },
                        }}
                      >
                        {error}
                      </Alert>
                    )}

                    {message && (
                      <Alert
                        icon={<IconAlertCircle size={16} />}
                        color="green"
                        variant="light"
                        styles={{
                          root: { background: "rgba(0, 150, 0, 0.08)", borderColor: "rgba(0, 150, 0, 0.18)" },
                          message: { color: textPrimary },
                        }}
                      >
                        {message}
                      </Alert>
                    )}

                    <TextInput
                      label="Email"
                      value={email}
                      onChange={(e) => setEmail(e.currentTarget.value)}
                      required
                      styles={{
                        label: { color: "rgba(11,18,32,0.85)" },
                        input: {
                          backgroundColor: inputBg,
                          borderColor: inputBorder,
                          color: textPrimary,
                        },
                      }}
                    />

                    <TextInput
                      label="Telefono"
                      value={telefono}
                      onChange={(e) => setTelefono(e.currentTarget.value)}
                      required
                      styles={{
                        label: { color: "rgba(11,18,32,0.85)" },
                        input: {
                          backgroundColor: inputBg,
                          borderColor: inputBorder,
                          color: textPrimary,
                        },
                      }}
                    />

                    <Button
                      type="submit"
                      radius="lg"
                      style={{
                        background: ACCENT,
                        color: "#111",
                        fontWeight: 800,
                      }}
                    >
                      Invia link di reset
                    </Button>

                    <Button
                      type="button"
                      radius="lg"
                      variant="subtle"
                      onClick={() => navigate("/login")}
                      style={{ color: "rgba(11,18,32,0.72)" }}
                    >
                      Torna al login
                    </Button>

                    <Text size="xs" style={{ color: "rgba(11,18,32,0.55)", lineHeight: 1.5 }} mt={4}>
                      Se non ricevi l’email, verifica che i dati inseriti siano corretti.
                    </Text>
                  </Stack>
                </form>
              </Paper>
            </Container>
          </Box>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
