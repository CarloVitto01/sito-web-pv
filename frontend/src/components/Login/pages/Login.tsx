import { ApiError } from "../../../backend/apiClient";
// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { login } from "../../../backend/auth";

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
  Anchor,
  Divider,
  ThemeIcon,
  List,
  Alert,
  Image,
} from "@mantine/core";
import { IconCheck, IconAlertCircle } from "@tabler/icons-react";

import logo from "../../../assets/images/logo orizzontale.png";

const FONT_DISPLAY = "'Oswald', sans-serif";

// ✅ stessa palette scura/oro usata nel resto del sito (pagina stampa, riepilogo ordine, header)
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

interface LoginFormInputs {
  username: string; // email
  password: string;
}

const inputStyles = {
  label: { color: "rgba(255,255,255,.80)", fontWeight: 600, marginBottom: 6 },
  input: {
    backgroundColor: inputBg,
    borderColor: inputBorder,
    color: textPrimary,
  },
  error: { color: "#ff8a8a" },
};

export default function LoginPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>();

  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setAuthError("");
    try {
      await login(data.username.trim(), data.password);
      navigate("/");
    } catch (err: unknown) {
      setAuthError(err instanceof ApiError && err.status === 401
        ? "Email o password non corretti"
        : "Accesso momentaneamente non disponibile. Riprova tra poco.");
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
                    Accesso sicuro
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
                    Gestisci i tuoi ordini di stampa in modo semplice e veloce.
                  </Title>

                  <Text style={{ color: textMuted, lineHeight: 1.75 }}>
                    Accedi per inviare un ordine, controllare i dettagli e visualizzare lo storico.
                    L’esperienza è ottimizzata per desktop e mobile.
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
                      Supporto rapido via WhatsApp
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
                      Cosa puoi fare dopo il login
                    </Text>
                    <Text size="sm" style={{ color: textMuted }}>
                      in pochi click
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
                    <List.Item>Invio ordini A4/A3 con configurazioni complete</List.Item>
                    <List.Item>Storico ordini con riepilogo e dettagli</List.Item>
                    <List.Item>Conferma pagamento e consegna (se disponibile)</List.Item>
                  </List>
                </Box>
              </Stack>
            </Container>
          </Box>
        </Grid.Col>

        {/* RIGHT (login, always visible) */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Box mih="100vh" style={{ display: "flex", alignItems: "center" }}>
            <Container size={420} w="100%" py="xl">
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
                <form onSubmit={handleSubmit(onSubmit)}>
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
                        Login
                      </Title>
                      <Text style={{ color: textMuted }}>Inserisci le credenziali per continuare</Text>
                    </Stack>

                    <Divider style={{ borderColor: borderSoft }} />

                    {authError && (
                      <Alert
                        icon={<IconAlertCircle size={16} />}
                        variant="light"
                        styles={{
                          root: { background: "rgba(255,80,80,.10)", borderColor: "rgba(255,80,80,.30)" },
                          icon: { color: "#ff8a8a" },
                          message: { color: textPrimary },
                        }}
                      >
                        {authError}
                      </Alert>
                    )}

                    <TextInput
                      label="Email"
                      type="email"
                      autoComplete="username"
                      placeholder="nome@email.com"
                      error={errors.username?.message}
                      {...register("username", { required: "Questo campo non può essere vuoto" })}
                      styles={inputStyles}
                    />

                    <PasswordInput
                      label="Password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      error={errors.password?.message}
                      visible={showPassword}
                      onVisibilityChange={setShowPassword}
                      {...register("password", { required: "Questo campo non può essere vuoto" })}
                      styles={{
                        ...inputStyles,
                        visibilityToggle: { color: "rgba(255,255,255,.55)" },
                      }}
                    />

                    <Group justify="space-between" mt={-6}>
                      <Anchor
                        size="sm"
                        style={{ color: ACCENT_SOFT }}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate("/recoverpassword");
                        }}
                        href="#"
                      >
                        Password dimenticata?
                      </Anchor>

                      <Anchor
                        size="sm"
                        style={{ color: textMuted }}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate("/recoveremail");
                        }}
                        href="#"
                      >
                        Email dimenticata?
                      </Anchor>
                    </Group>

                    <Group grow mt="xs">
                      <Button
                        type="submit"
                        radius="lg"
                        loading={isSubmitting}
                        disabled={isSubmitting}
                        styles={{
                          root: {
                            background: "linear-gradient(180deg,#f2c94c,#c9962f)",
                            boxShadow: "0 16px 32px -10px rgba(242,201,76,.45)",
                            border: "none",
                          },
                          label: { color: "#10141c", fontWeight: 700 },
                        }}
                      >
                        Accedi
                      </Button>

                      <Button
                        type="button"
                        radius="lg"
                        variant="outline"
                        onClick={() => navigate("/register")}
                        styles={{
                          root: { borderColor: goldBorder, color: ACCENT_SOFT },
                        }}
                      >
                        Registrati
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
                      Effettuando l’accesso accetti i Termini di servizio e l’Informativa Privacy.
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
