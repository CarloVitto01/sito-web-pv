// src/pages/RecoverEmailPage.tsx
import React, { useState } from "react";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../../../backend/firebase";
import { useNavigate } from "react-router-dom";

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
  Anchor,
} from "@mantine/core";
import { IconCheck, IconAt, IconAlertCircle, IconLock } from "@tabler/icons-react";
import logoPV from "../../../assets/images/logo_b.png";

const ACCENT = "#d1ab63";

const RecoverEmailPage: React.FC = () => {
  const [telefono, setTelefono] = useState("");
  const [emailRecuperata, setEmailRecuperata] = useState("");
  const [errore, setErrore] = useState("");
  const navigate = useNavigate();

  const cercaEmail = async () => {
    setErrore("");
    setEmailRecuperata("");

    try {
      const snapshot = await getDocs(collection(db, "users"));
      const utente = snapshot.docs.find((doc) => {
        const data = doc.data();
        return data.telefono === telefono;
      });

      if (utente) {
        // NB: assicurati che il campo sia davvero "email" nel documento user
        setEmailRecuperata(utente.data().email);
      } else {
        setErrore("Nessun utente trovato con questo numero.");
      }
    } catch (err) {
      console.error(err);
      setErrore("Errore durante la ricerca. Riprova più tardi.");
    }
  };

  // ✅ stile “chiaro” come Login (stessa tecnica), LEFT invariata (non oscurata qui)
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
            {/* Backdrop (stessa “tecnica” chiara) */}
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

            {/* Vignette (chiara, non oscurata extra) */}
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
                    Recupera l’email associata al tuo account.
                  </Title>

                  <Text style={{ color: textMuted, lineHeight: 1.75 }}>
                    Inserisci il numero di telefono usato in fase di registrazione: ti mostreremo l’email collegata.
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
                          Nota privacy
                        </Text>
                      </Group>
                      <Text size="sm" style={{ color: textMuted }}>
                        dati
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
                      <List.Item>Mostriamo l’email solo se il numero è presente nel profilo</List.Item>
                      <List.Item>Usa poi il login per accedere e gestire gli ordini</List.Item>
                    </List>
                  </Paper>
                </Stack>
              </Box>
            </Container>
          </Box>
        </Grid.Col>

        {/* RIGHT */}
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
                <Stack gap="md">
                  <Stack gap={4}>
                    <Title order={2} style={{ color: textPrimary, letterSpacing: -0.4 }}>
                      Recupera email
                    </Title>
                    <Text style={{ color: textMuted }}>Inserisci il numero di telefono registrato</Text>
                  </Stack>

                  <Divider style={{ borderColor: borderSoft }} />

                  {errore && (
                    <Alert
                      icon={<IconAlertCircle size={16} />}
                      color="red"
                      variant="light"
                      styles={{
                        root: { background: "rgba(255, 0, 0, 0.08)", borderColor: "rgba(255, 0, 0, 0.18)" },
                        message: { color: textPrimary },
                      }}
                    >
                      {errore}
                    </Alert>
                  )}

                  <TextInput
                    label="Telefono"
                    placeholder="Es. 3331234567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.currentTarget.value)}
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
                    radius="lg"
                    onClick={cercaEmail}
                    style={{
                      background: ACCENT,
                      color: "#111",
                      fontWeight: 800,
                    }}
                  >
                    Cerca
                  </Button>

                  {emailRecuperata && (
                    <Paper
                      radius="lg"
                      p="md"
                      style={{
                        background: "rgba(15,23,42,0.03)",
                        border: `1px solid ${borderSoft}`,
                      }}
                    >
                      <Group gap={10} align="flex-start">
                        <ThemeIcon
                          radius="xl"
                          size={28}
                          style={{
                            background: "rgba(209,171,99,0.14)",
                            border: "1px solid rgba(209,171,99,0.35)",
                            color: ACCENT,
                          }}
                        >
                          <IconAt size={16} />
                        </ThemeIcon>

                        <Stack gap={2}>
                          <Text style={{ color: textMuted }} size="sm">
                            La tua email è:
                          </Text>
                          <Text style={{ color: textPrimary, fontWeight: 800 }}>{emailRecuperata}</Text>
                        </Stack>
                      </Group>

                      <Group mt="md" gap="sm">
                        <Button
                          radius="lg"
                          variant="outline"
                          onClick={() => navigate("/login")}
                          style={{
                            borderColor: "rgba(209,171,99,0.60)",
                            color: ACCENT,
                          }}
                        >
                          Torna al Login
                        </Button>

                        <Anchor
                          size="sm"
                          style={{ color: "rgba(11,18,32,0.70)" }}
                          onClick={(e) => {
                            e.preventDefault();
                            setEmailRecuperata("");
                          }}
                          href="#"
                        >
                          Chiudi
                        </Anchor>
                      </Group>
                    </Paper>
                  )}

                  <Button
                    radius="lg"
                    variant="subtle"
                    onClick={() => navigate("/login")}
                    style={{ color: "rgba(11,18,32,0.72)" }}
                  >
                    Torna al login
                  </Button>

                  <Text size="xs" style={{ color: "rgba(11,18,32,0.55)", lineHeight: 1.5 }} mt={4}>
                    Se non riconosci il numero, contatta l’assistenza.
                  </Text>
                </Stack>
              </Paper>
            </Container>
          </Box>
        </Grid.Col>
      </Grid>
    </Box>
  );
};

export default RecoverEmailPage;
