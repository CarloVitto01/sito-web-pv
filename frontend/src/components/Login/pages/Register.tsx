// src/pages/RegisterPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../utils/registerUsers";
import { ApiError } from "../../../backend/apiClient";

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
  Select,
  Image,
} from "@mantine/core";
import { IconCheck, IconAlertCircle } from "@tabler/icons-react";

import logo from "../../../assets/images/logo orizzontale.png";

const FONT_DISPLAY = "'Oswald', sans-serif";

// ✅ stessa palette scura/oro usata nel resto del sito (login, pagina stampa, riepilogo ordine, header)
const ACCENT = "#d4af6a";
const ACCENT_SOFT = "#e3c98b";
const PAGE_BG = "linear-gradient(180deg,#05080d 0%,#0a0e15 40%,#0c1119 100%)";
const CARD_BG = "linear-gradient(165deg,#14110f 0%,#0c1119 65%)";
const textPrimary = "#ffffff";
const textMuted = "rgba(255,255,255,.60)";
const textMuted2 = "rgba(255,255,255,.42)";
const borderSoft = "rgba(255,255,255,.10)";
const goldBorder = "rgba(212,175,106,.30)";
const inputBg = "rgba(255,255,255,.05)";
const inputBorder = "rgba(255,255,255,.14)";

const inputStyles = {
  label: { color: "rgba(255,255,255,.80)", fontWeight: 600, marginBottom: 6 },
  input: {
    backgroundColor: inputBg,
    borderColor: inputBorder,
    color: textPrimary,
  },
  error: { color: "#ff8a8a" },
};

const selectStyles = {
  ...inputStyles,
  dropdown: {
    background: "#14110f",
    border: `1px solid ${goldBorder}`,
  },
  option: {
    color: textPrimary,
  },
};

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

  const onlyLetters = (value: string) => /^[a-zA-ZÀ-ÿ\s]+$/.test(value);
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

    if (isStudente) {
      if (!corsoLaurea) return setError("Seleziona il corso di laurea.");
      if (!annoAccademico) return setError("Seleziona l'anno di corso.");
    }

    setSubmitting(true);

    try {
      await registerUser(email, password, displayName, {
        cognome: surname,
        telefono,
        corsoLaurea: isStudente ? corsoLaurea : undefined,
        annoAccademico: isStudente ? annoAccademico : undefined,
      });

      navigate("/");
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Esiste già un account con questa email. Prova a fare il login.");
      } else {
        setError("Registrazione fallita. Riprova più tardi.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box mih="100vh" style={{ background: PAGE_BG, position: "relative", overflow: "hidden" }}>
      {/* Glow di sfondo, coerente con il resto del sito */}
      <Box
        style={{
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(900px 600px at 18% 20%, rgba(212,175,106,.14), transparent 60%)",
            "radial-gradient(700px 480px at 82% 75%, rgba(212,175,106,.08), transparent 60%)",
          ].join(","),
          pointerEvents: "none",
        }}
      />

      <Grid mih="100vh" gutter={0} style={{ position: "relative" }}>
        {/* LEFT (desktop only) */}
        <Grid.Col span={{ base: 12, md: 7 }} visibleFrom="md">
          <Box mih="100vh" style={{ position: "relative", borderRight: `1px solid ${borderSoft}`, overflow: "hidden" }}>
            {/* Mesh decorativo */}
            <Box
              style={{
                position: "absolute",
                inset: -80,
                background: [
                  "repeating-linear-gradient(135deg, rgba(255,255,255,.035) 0 1px, transparent 1px 18px)",
                  "repeating-linear-gradient(45deg, rgba(255,255,255,.02) 0 1px, transparent 1px 26px)",
                ].join(","),
                opacity: 0.5,
                transform: "rotate(-6deg)",
              }}
            />

            {/* ORB decorativi */}
            <Box
              style={{
                position: "absolute",
                top: 110,
                left: 90,
                width: 200,
                height: 200,
                borderRadius: 999,
                background: "radial-gradient(circle at 30% 30%, rgba(212,175,106,.22), rgba(212,175,106,.05) 55%, transparent 70%)",
                filter: "blur(2px)",
              }}
            />
            <Box
              style={{
                position: "absolute",
                bottom: 130,
                right: 110,
                width: 260,
                height: 260,
                borderRadius: 999,
                background: "radial-gradient(circle at 30% 30%, rgba(212,175,106,.14), rgba(212,175,106,.04) 55%, transparent 72%)",
                filter: "blur(3px)",
              }}
            />

            <Container size="lg" h="100%" style={{ position: "relative", zIndex: 2 }}>
              <Stack justify="center" h="100%" py={48} gap={32}>
                <Stack gap={16} maw={760} w="100%" mx="auto" style={{ textAlign: "center" }}>
                  <Image src={logo} alt="Photo & Vision" h={52} fit="contain" mx="auto" style={{ marginBottom: 8 }} />

                  <Text
                    style={{
                      color: ACCENT_SOFT,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      fontSize: 12,
                    }}
                  >
                    Crea il tuo account
                  </Text>

                  <Title
                    order={1}
                    style={{
                      fontFamily: FONT_DISPLAY,
                      textTransform: "uppercase",
                      color: textPrimary,
                      letterSpacing: ".01em",
                      lineHeight: 1.15,
                      fontSize: 34,
                      textShadow: "0 0 24px rgba(242,201,76,.25)",
                    }}
                  >
                    Registrati per gestire ordini e storico in modo rapido.
                  </Title>

                  <Text style={{ color: textMuted, lineHeight: 1.75 }}>
                    Inserisci i tuoi dati per creare l’account. Se sei uno studente, potrai aggiungere anche corso e anno di corso.
                  </Text>

                  <Group mt="md" gap="sm" justify="center">
                    <Box
                      style={{
                        height: 8,
                        width: 140,
                        borderRadius: 999,
                        background: "linear-gradient(90deg, rgba(242,201,76,.6), rgba(212,175,106,.15))",
                        boxShadow: "0 0 30px rgba(242,201,76,.18)",
                      }}
                    />
                    <Text size="sm" style={{ color: textMuted }}>
                      Registrazione in meno di 1 minuto
                    </Text>
                  </Group>
                </Stack>

                {/* Box invece di Paper/Card: quei componenti hanno uno sfondo bianco forzato via
                    "!important" in App.css (regola globale legacy) che vince su qualunque colore
                    piatto passato in style - una gradient riesce a "coprirlo" (vedi CARD_BG sotto),
                    un colore semplice no. Box evita del tutto il problema. */}
                <Box
                  p="lg"
                  maw={760}
                  w="100%"
                  mx="auto"
                  style={{
                    background: "rgba(10,14,22,.55)",
                    border: `1px solid ${borderSoft}`,
                    borderRadius: "var(--mantine-radius-xl)",
                    boxShadow: "0 18px 50px rgba(0,0,0,.35)",
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
                          background: "rgba(212,175,106,.14)",
                          border: `1px solid ${goldBorder}`,
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
                </Box>
              </Stack>
            </Container>
          </Box>
        </Grid.Col>

        {/* RIGHT (register form) */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Box mih="100vh" style={{ display: "flex", alignItems: "center" }}>
            <Container size={460} w="100%" py="xl">
              <Image src={logo} alt="Photo & Vision" h={40} fit="contain" mx="auto" mb="xl" hiddenFrom="md" />

              <Paper
                radius="xl"
                p="xl"
                style={{
                  background: CARD_BG,
                  border: `1px solid ${goldBorder}`,
                  boxShadow: "0 30px 80px rgba(0,0,0,.55)",
                }}
              >
                <form onSubmit={handleSubmit}>
                  <Stack gap="md">
                    <Stack gap={4}>
                      <Title
                        order={2}
                        style={{
                          fontFamily: FONT_DISPLAY,
                          textTransform: "uppercase",
                          letterSpacing: ".02em",
                          color: textPrimary,
                        }}
                      >
                        Registrazione
                      </Title>
                      <Text style={{ color: textMuted }}>Compila i campi per creare l’account</Text>
                    </Stack>

                    <Divider style={{ borderColor: borderSoft }} />

                    {error && (
                      <Alert
                        icon={<IconAlertCircle size={16} />}
                        variant="light"
                        styles={{
                          root: { background: "rgba(255,80,80,.10)", borderColor: "rgba(255,80,80,.30)" },
                          icon: { color: "#ff8a8a" },
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
                        styles={inputStyles}
                      />
                      <TextInput
                        label="Cognome"
                        value={surname}
                        onChange={(e) => setSurname(e.currentTarget.value)}
                        required
                        styles={inputStyles}
                      />
                    </Group>

                    <TextInput
                      label="Email"
                      value={email}
                      onChange={(e) => setEmail(e.currentTarget.value)}
                      required
                      styles={inputStyles}
                    />

                    <PasswordInput
                      label="Password"
                      value={password}
                      onChange={(e) => setPassword(e.currentTarget.value)}
                      required
                      visible={showPassword}
                      onVisibilityChange={setShowPassword}
                      styles={{
                        ...inputStyles,
                        visibilityToggle: { color: "rgba(255,255,255,.55)" },
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
                        ...inputStyles,
                        visibilityToggle: { color: "rgba(255,255,255,.55)" },
                      }}
                    />

                    <TextInput
                      label="Telefono"
                      value={telefono}
                      onChange={(e) => setTelefono(e.currentTarget.value)}
                      required
                      styles={inputStyles}
                    />

                    <Checkbox
                      checked={isStudente}
                      onChange={(e) => {
                        const checked = e.currentTarget.checked;
                        setIsStudente(checked);

                        if (!checked) {
                          setCorsoLaurea("");
                          setAnnoAccademico("");
                        }
                      }}
                      label="Sei uno studente universitario (Ecotekne)?"
                      color="gold"
                      styles={{
                        label: { color: "rgba(255,255,255,.80)" },
                        input: { borderColor: inputBorder, backgroundColor: inputBg },
                      }}
                    />

                    {isStudente && (
                      <Group grow>
                        <Select
                          label="Corso di Laurea"
                          placeholder="Seleziona corso"
                          value={corsoLaurea || null}
                          onChange={(value) => setCorsoLaurea(value || "")}
                          data={CORSI_LAUREA_OPTIONS}
                          searchable
                          required
                          clearable
                          styles={selectStyles}
                        />

                        <Select
                          label="Anno di corso"
                          placeholder="Seleziona anno"
                          value={annoAccademico || null}
                          onChange={(value) => setAnnoAccademico(value || "")}
                          data={ANNI_CORSO_OPTIONS}
                          required
                          clearable
                          styles={selectStyles}
                        />
                      </Group>
                    )}

                    <Group grow mt="xs">
                      <Button
                        type="submit"
                        radius="lg"
                        loading={submitting}
                        disabled={submitting}
                        styles={{
                          root: {
                            background: "linear-gradient(180deg,#f2c94c,#c9962f)",
                            boxShadow: "0 16px 32px -10px rgba(242,201,76,.45)",
                            border: "none",
                          },
                          label: { color: "#10141c", fontWeight: 700 },
                        }}
                      >
                        Registrati
                      </Button>

                      <Button
                        type="button"
                        radius="lg"
                        variant="outline"
                        onClick={() => navigate("/login")}
                        styles={{ root: { borderColor: goldBorder, color: ACCENT_SOFT } }}
                      >
                        Hai un account?
                      </Button>
                    </Group>

                    <Button
                      type="button"
                      radius="lg"
                      variant="subtle"
                      onClick={() => navigate("/")}
                      styles={{ root: { color: textMuted } }}
                    >
                      Torna alla Home
                    </Button>

                    <Text size="xs" style={{ color: textMuted2, lineHeight: 1.5 }} mt={4}>
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
