// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../backend/firebase";

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
} from "@mantine/core";
import { IconCheck, IconAlertCircle } from "@tabler/icons-react";

import logoPV from "../../../assets/images/logo_b.png";

const ACCENT = "#d1ab63";

interface LoginFormInputs {
  username: string; // email
  password: string;
}

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
      await signInWithEmailAndPassword(auth, data.username, data.password);
      navigate("/");
    } catch (err: any) {
      console.error("Errore login:", err?.message);
      setAuthError("Email o password non corretti");
    }
  };

  // ✅ stile “chiaro” mantenendo la stessa struttura/tecnica
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
            {/* BACKDROP: 100% CSS (chiaro) */}
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

            {/* Decorative mesh (più soft) */}
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

            {/* Vignette (chiara) */}
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
                boxShadow: `inset 0 0 0 1px rgba(15,23,42,0.06), inset 0 0 140px rgba(15,23,42,0.06)`,
                pointerEvents: "none",
              }}
            />

            {/* ORB decorativi */}
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

            {/* Logo watermark (chiaro: più “ink” e meno blur) */}
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
                {/* Hero text (centrato) */}
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
                    Accesso sicuro
                  </Text>

                  <Title order={1} style={{ color: textPrimary, letterSpacing: -0.9, lineHeight: 1.05 }}>
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
                        background: "rgba(209,171,99,0.55)",
                        boxShadow: "0 0 30px rgba(209,171,99,0.22)",
                      }}
                    />
                    <Text size="sm" style={{ color: textMuted }}>
                      Supporto rapido via WhatsApp
                    </Text>
                  </Group>
                </Stack>

                {/* Feature list (centrata) */}
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
                      Cosa puoi fare dopo il login
                    </Text>
                    <Text size="sm" style={{ color: textMuted }}>
                      in pochi click
                    </Text>
                  </Group>

                  <List
                    spacing="sm"
                    styles={{
                      itemLabel: { color: textMuted, lineHeight: 1.6 },
                    }}
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
                    <List.Item>Invio ordini A4/A3 con configurazioni complete</List.Item>
                    <List.Item>Storico ordini con riepilogo e dettagli</List.Item>
                    <List.Item>Conferma pagamento e consegna (se disponibile)</List.Item>
                  </List>
                </Paper>
              </Stack>
            </Container>
          </Box>
        </Grid.Col>

        {/* RIGHT (login, always visible) */}
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
                <form onSubmit={handleSubmit(onSubmit)}>
                  <Stack gap="md">
                    <Stack gap={4}>
                      <Title order={2} style={{ color: textPrimary, letterSpacing: -0.4 }}>
                        Login
                      </Title>
                      <Text style={{ color: textMuted }}>
                        Inserisci le credenziali per continuare
                      </Text>
                    </Stack>

                    <Divider style={{ borderColor: borderSoft }} />

                    {authError && (
                      <Alert
                        icon={<IconAlertCircle size={16} />}
                        color="red"
                        variant="light"
                        styles={{
                          root: { background: "rgba(255, 0, 0, 0.08)", borderColor: "rgba(255, 0, 0, 0.18)" },
                          message: { color: textPrimary },
                        }}
                      >
                        {authError}
                      </Alert>
                    )}

                    <TextInput
                      label="Email"
                      placeholder="nome@email.com"
                      error={errors.username?.message}
                      {...register("username", { required: "Questo campo non può essere vuoto" })}
                      styles={{
                        label: { color: "rgba(11,18,32,0.85)" },
                        input: {
                          backgroundColor: inputBg,
                          borderColor: inputBorder,
                          color: textPrimary,
                        },
                      }}
                    />

                    <PasswordInput
                      label="Password"
                      placeholder="••••••••"
                      error={errors.password?.message}
                      visible={showPassword}
                      onVisibilityChange={setShowPassword}
                      {...register("password", { required: "Questo campo non può essere vuoto" })}
                      styles={{
                        label: { color: "rgba(11,18,32,0.85)" },
                        input: {
                          backgroundColor: inputBg,
                          borderColor: inputBorder,
                          color: textPrimary,
                        },
                      }}
                    />

                    <Group justify="space-between" mt={-6}>
                      <Anchor
                        size="sm"
                        style={{ color: ACCENT, textDecorationColor: "rgba(209,171,99,0.55)" }}
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
                        style={{ color: "rgba(11,18,32,0.70)" }}
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
                        style={{
                          background: ACCENT,
                          color: "#111",
                          fontWeight: 800,
                        }}
                      >
                        Accedi
                      </Button>

                      <Button
                        type="button"
                        radius="lg"
                        variant="outline"
                        onClick={() => navigate("/register")}
                        style={{
                          borderColor: "rgba(209,171,99,0.60)",
                          color: ACCENT,
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
                      style={{ color: "rgba(11,18,32,0.72)" }}
                    >
                      Torna alla Home
                    </Button>

                    <Text size="xs" style={{ color: "rgba(11,18,32,0.55)", lineHeight: 1.5 }} mt={4}>
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
