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
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../../backend/firebase";
import logoPV from "../../../assets/images/logo_b.png";

const ACCENT = "#d1ab63";

export default function RecoverPasswordPage() {
  const isMobile = useMediaQuery("(max-width: 900px)");

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

  return (
    <Box mih="100vh" style={{ background: "#070A0F", position: "relative" }}>
      <Grid mih="100vh" gutter={0}>

        {/* LEFT – identica a Login/Register */}
        <Grid.Col span={{ base: 12, md: 7 }} visibleFrom="md">
          <Box mih="100vh" style={{ position: "relative", overflow: "hidden" }}>

            {/* background */}
            <Box
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(900px 650px at 18% 30%, rgba(209,171,99,0.18), transparent 62%)," +
                  "radial-gradient(700px 520px at 70% 65%, rgba(209,171,99,0.10), transparent 60%)," +
                  "linear-gradient(180deg, rgba(0,0,0,.2), rgba(0,0,0,.75))",
              }}
            />

            {/* watermark logo */}
            <Box
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <img
                src={logoPV}
                alt="Photo & Vision"
                style={{
                  width: "25%",
                  maxWidth: 520,
                  opacity: 0.12,
                  filter: "blur(3px)",
                }}
              />
            </Box>

            <Container size="lg" h="100%" style={{ position: "relative", zIndex: 1 }}>
              <Box
                h="100%"
                style={{
                  marginTop: 350,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Stack gap={24} ta="center" maw={640}>
                  <Text
                    style={{
                      color: ACCENT,
                      fontWeight: 800,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      fontSize: 12,
                    }}
                  >
                    Recupero accesso
                  </Text>

                  <Title order={1} c="white">
                    Recupera la password del tuo account
                  </Title>

                  <Text c="dimmed">
                    Inserisci email e numero di telefono associati al tuo account
                    per ricevere il link di reset.
                  </Text>
                </Stack>
              </Box>
            </Container>

          </Box>
        </Grid.Col>

        {/* RIGHT – form */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Box mih="100vh" style={{ display: "flex", alignItems: "center" }}>
            <Container size={420} w="100%">
              <Paper
                radius="xl"
                p="xl"
                style={{
                  background: "rgba(10,12,16,0.78)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <form onSubmit={handleRecover}>
                  <Stack gap="md">
                    <Stack gap={4}>
                      <Title order={2} c="white">
                        Recupera password
                      </Title>
                      <Text c="dimmed">
                        Ti invieremo un’email di reset
                      </Text>
                    </Stack>

                    <Divider />

                    <TextInput
                      label="Email"
                      value={email}
                      onChange={(e) => setEmail(e.currentTarget.value)}
                      required
                      styles={{
                        label: { color: "rgba(255,255,255,0.85)" },
                        input: {
                          backgroundColor: "rgba(255,255,255,0.06)",
                          color: "#fff",
                        },
                      }}
                    />

                    <TextInput
                      label="Telefono"
                      value={telefono}
                      onChange={(e) => setTelefono(e.currentTarget.value)}
                      required
                      styles={{
                        label: { color: "rgba(255,255,255,0.85)" },
                        input: {
                          backgroundColor: "rgba(255,255,255,0.06)",
                          color: "#fff",
                        },
                      }}
                    />

                    {error && <Text c="red" size="sm">{error}</Text>}
                    {message && <Text c="green" size="sm">{message}</Text>}

                    <Button
                      type="submit"
                      radius="lg"
                      style={{ background: ACCENT, color: "#111", fontWeight: 800 }}
                    >
                      Invia link di reset
                    </Button>

                    <Button
                      variant="subtle"
                      radius="lg"
                      component="a"
                      href="/login"
                      c="dimmed"
                    >
                      Torna al login
                    </Button>
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
