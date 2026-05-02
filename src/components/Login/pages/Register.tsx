// src/pages/RegisterPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../utils/registerUsers";

import {
  Box,
  Grid,
  Container,
  Paper,
  Stack,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Group,
  Button,
  Divider,
  ThemeIcon,
  List,
  Alert,
  Checkbox,
} from "@mantine/core";
import { IconCheck, IconAlertCircle } from "@tabler/icons-react";

import logoPV from "../../../assets/images/logo_b.png";

const ACCENT = "#d1ab63";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [corsoLaurea, setCorsoLaurea] = useState("");
  const [annoAccademico, setAnnoAccademico] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isStudente, setIsStudente] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onlyLetters = (value: string) => /^[a-zA-Z\s]+$/.test(value);
  const validEmail = (value: string) => /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(value);
  const onlyNumbers = (value: string) => /^[0-9]+$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!onlyLetters(displayName)) return setError("Il nome deve contenere solo lettere.");
    if (!onlyLetters(surname)) return setError("Il cognome deve contenere solo lettere.");
    if (!validEmail(email)) return setError("Inserisci un'email valida.");
    if (password.length < 6) return setError("La password deve contenere almeno 6 caratteri.");
    if (password !== confirmPassword) return setError("Le password non coincidono.");
    if (!onlyNumbers(telefono) || telefono.length !== 10) return setError("Il numero di telefono deve contenere 10 cifre.");
    if (corsoLaurea && !onlyLetters(corsoLaurea)) return setError("Il corso di laurea deve contenere solo lettere.");
    if (annoAccademico && (!onlyNumbers(annoAccademico) || annoAccademico.length !== 4))
      return setError("L'anno accademico deve essere un numero di 4 cifre.");

    setSubmitting(true);
    try {
      await registerUser(email, password, displayName, {
        cognome: surname,
        telefono,
        corsoLaurea: isStudente ? (corsoLaurea || undefined) : undefined,
        annoAccademico: isStudente ? (annoAccademico || undefined) : undefined,
      });
      navigate("/");
    } catch (err: any) {
      if (err?.code === "auth/email-already-in-use") {
        setError("Esiste già un account con questa email. Prova a fare il login.");
      } else {
        setError("Registrazione fallita. Riprova più tardi.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ tecnica “chiara” come Login/Recover*
  const pageBg = "#F6F7FB";
  const cardBg = "rgba(255,255,255,0.78)";
  const borderSoft = "rgba(15,23,42,0.10)";
  const textPrimary = "#0B1220";
  const textMuted = "rgba(11,18,32,0.68)";
  const inputBg = "rgba(15,23,42,0.04)";
  const inputBorder = "rgba(15,23,42,0.12)";

  return (
    <Box mih="100vh" style={{ background: pageBg, position: "relative", overflow: "hidden" }}>
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
            {/* BACKDROP */}
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

            {/* Decorative mesh */}
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

            {/* ORB */}
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
                  maxWidth: 360,
                  transform: "translateY(12px) scale(1.02)",
                  userSelect: "none",
                }}
              />
            </Box>

            <Container size="lg" h="100%" style={{ position: "relative", zIndex: 2 }}>
              <Stack justify="center" h="100%" py={48} gap={32}>
                <Stack gap={12} maw={760} w="100%" mx="auto" style={{ textAlign: "center" }}>
                  <Text
                    style={{
                      color: ACCENT,
                      fontWeight: 800,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      fontSize: 12,
                      marginTop: 150,
                    }}
                  >
                    Crea il tuo account
                  </Text>

                  <Title order={1} style={{ color: textPrimary, letterSpacing: -0.9, lineHeight: 1.05 }}>
                    Registrati per gestire ordini e storico in modo rapido.
                  </Title>

                  <Text style={{ color: textMuted, lineHeight: 1.75 }}>
                    Inserisci i tuoi dati per creare l’account. Se sei uno studente, potrai aggiungere anche corso e anno accademico.
                  </Text>

                  <Group mt="md" gap="sm" justify="center">
                    <Box
                      style={{
                        height: 8,
                        width: 140,
                        borderRadius: 999,
                        background: "rgba(209,171,99,0.55)",
                        boxShadow: "0 0 32px rgba(209,171,99,0.22)",
                      }}
                    />
                    <Text size="sm" style={{ color: textMuted }}>
                      Registrazione in meno di 1 minuto
                    </Text>
                  </Group>
                </Stack>

                <Paper
                  radius="xl"
                  p="lg"
                  maw={760}
                  w="100%"
                  mx="auto"
                  style={{
                    background: "rgba(255,255,255,0.70)",
                    border: `1px solid ${borderSoft}`,
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 18px 50px rgba(15,23,42,0.10)",
                    maxWidth: 760,
                  }}
                >
                  <Group justify="space-between" align="center" mb="sm">
                    <Text style={{ color: textPrimary, fontWeight: 800, letterSpacing: -0.2 }}>
                      Vantaggi dell’account
                    </Text>
                    <Text size="sm" style={{ color: textMuted }}>
                      subito disponibili
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
                    <List.Item>Salvataggio automatico dei dati per ordini futuri</List.Item>
                    <List.Item>Storico ordini e dettagli sempre consultabili</List.Item>
                    <List.Item>Accesso rapido a recupero email/password</List.Item>
                  </List>
                </Paper>
              </Stack>
            </Container>
          </Box>
        </Grid.Col>

        {/* RIGHT (register form) */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Box mih="100vh" style={{ display: "flex", alignItems: "center" }}>
            <Container size={460} w="100%" py="xl">
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
                <form onSubmit={handleSubmit}>
                  <Stack gap="md">
                    <Stack gap={4}>
                      <Title order={2} style={{ color: textPrimary, letterSpacing: -0.4 }}>
                        Registrazione
                      </Title>
                      <Text style={{ color: textMuted }}>Compila i campi per creare l’account</Text>
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

                    <Group grow>
                      <TextInput
                        label="Nome"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.currentTarget.value)}
                        required
                        styles={{
                          label: { color: "rgba(11,18,32,0.85)" },
                          input: { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary },
                        }}
                      />
                      <TextInput
                        label="Cognome"
                        value={surname}
                        onChange={(e) => setSurname(e.currentTarget.value)}
                        required
                        styles={{
                          label: { color: "rgba(11,18,32,0.85)" },
                          input: { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary },
                        }}
                      />
                    </Group>

                    <TextInput
                      label="Email"
                      value={email}
                      onChange={(e) => setEmail(e.currentTarget.value)}
                      required
                      styles={{
                        label: { color: "rgba(11,18,32,0.85)" },
                        input: { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary },
                      }}
                    />

                    <PasswordInput
                      label="Password"
                      value={password}
                      onChange={(e) => setPassword(e.currentTarget.value)}
                      required
                      visible={showPassword}
                      onVisibilityChange={setShowPassword}
                      styles={{
                        label: { color: "rgba(11,18,32,0.85)" },
                        input: { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary },
                      }}
                    />

                    <PasswordInput
                      label="Conferma password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                      required
                      visible={showConfirmPassword}
                      onVisibilityChange={setShowConfirmPassword}
                      styles={{
                        label: { color: "rgba(11,18,32,0.85)" },
                        input: { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary },
                      }}
                    />

                    <TextInput
                      label="Telefono"
                      value={telefono}
                      onChange={(e) => setTelefono(e.currentTarget.value)}
                      required
                      styles={{
                        label: { color: "rgba(11,18,32,0.85)" },
                        input: { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary },
                      }}
                    />

                    <Checkbox
                      checked={isStudente}
                      onChange={(e) => setIsStudente(e.currentTarget.checked)}
                      label="Sei uno studente universitario (Ecotekne)?"
                      styles={{
                        label: { color: "rgba(11,18,32,0.78)" },
                        input: { borderColor: "rgba(15,23,42,0.18)", backgroundColor: "rgba(15,23,42,0.04)" },
                      }}
                    />

                    {isStudente && (
                      <Group grow>
                        <TextInput
                          label="Corso di Laurea"
                          value={corsoLaurea}
                          onChange={(e) => setCorsoLaurea(e.currentTarget.value)}
                          required
                          styles={{
                            label: { color: "rgba(11,18,32,0.85)" },
                            input: { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary },
                          }}
                        />
                        <TextInput
                          label="Anno Accademico"
                          value={annoAccademico}
                          onChange={(e) => setAnnoAccademico(e.currentTarget.value)}
                          required
                          styles={{
                            label: { color: "rgba(11,18,32,0.85)" },
                            input: { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary },
                          }}
                        />
                      </Group>
                    )}

                    <Group grow mt="xs">
                      <Button
                        type="submit"
                        radius="lg"
                        loading={submitting}
                        disabled={submitting}
                        style={{ background: ACCENT, color: "#111", fontWeight: 800 }}
                      >
                        Registrati
                      </Button>

                      <Button
                        type="button"
                        radius="lg"
                        variant="outline"
                        onClick={() => navigate("/login")}
                        style={{ borderColor: "rgba(209,171,99,0.60)", color: ACCENT }}
                      >
                        Hai un account?
                      </Button>
                    </Group>

                    <Button
                      type="button"
                      radius="lg"
                      variant="subtle"
                      onClick={() => navigate("/")}
                      style={{ color: "rgba(11,18,32,0.72)" }}
                    >
                      Torna alla Home
                    </Button>

                    <Text size="xs" style={{ color: "rgba(11,18,32,0.55)", lineHeight: 1.5 }} mt={4}>
                      Creando un account accetti i Termini di servizio e l’Informativa Privacy.
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
