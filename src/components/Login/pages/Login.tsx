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
import { IconCheck, IconLock, IconAlertCircle } from "@tabler/icons-react";

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

  return (
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

      <Grid mih="100vh" gutter={0} style={{ position: "relative" }}>
        {/* LEFT (desktop only) */}
        <Grid.Col span={{ base: 12, md: 7 }} visibleFrom="md">
          <Box
            mih="100vh"
            style={{
              position: "relative",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            {/* BACKDROP: 100% CSS */}
            <Box
              style={{
                position: "absolute",
                inset: 0,
                background: [
                  "radial-gradient(900px 650px at 18% 30%, rgba(209,171,99,0.18), transparent 62%)",
                  "radial-gradient(700px 520px at 70% 65%, rgba(209,171,99,0.10), transparent 60%)",
                  "linear-gradient(135deg, rgba(209,171,99,0.10) 0%, rgba(0,0,0,0) 55%)",
                  "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 100%)",
                ].join(","),
              }}
            />

            {/* Decorative mesh */}
            <Box
              style={{
                position: "absolute",
                inset: -80,
                background: [
                  "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 18px)",
                  "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 26px)",
                  "radial-gradient(500px 240px at 35% 85%, rgba(209,171,99,0.12), transparent 65%)",
                ].join(","),
                opacity: 0.35,
                transform: "rotate(-6deg)",
                mixBlendMode: "overlay",
              }}
            />

            {/* Vignette */}
            <Box
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.35) 100%)",
              }}
            />
            <Box
              style={{
                position: "absolute",
                inset: 0,
                boxShadow:
                  "inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 0 140px rgba(0,0,0,0.85)",
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
                  "radial-gradient(circle at 30% 30%, rgba(209,171,99,0.30), rgba(209,171,99,0.06) 55%, transparent 70%)",
                filter: "blur(2px)",
                opacity: 0.65,
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
                  "radial-gradient(circle at 30% 30%, rgba(209,171,99,0.22), rgba(209,171,99,0.05) 55%, transparent 72%)",
                filter: "blur(3px)",
                opacity: 0.55,
              }}
            />

            {/* Logo watermark (sfocato dietro) */}
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
                  // QUI lo rimpicciolisci: abbassi width / maxWidth
                  width: "18%",
                  maxWidth: 360,
                  opacity: 0.12,
                  filter: "blur(3px)",
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

                  <Title order={1} style={{ color: "#fff", letterSpacing: -0.9, lineHeight: 1.05 }}>
                    Gestisci i tuoi ordini di stampa in modo semplice e veloce.
                  </Title>

                  <Text style={{ color: "rgba(255,255,255,0.74)", lineHeight: 1.75 }}>
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
                        boxShadow: "0 0 32px rgba(209,171,99,0.22)",
                      }}
                    />
                    <Text size="sm" style={{ color: "rgba(255,255,255,0.65)" }}>
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
                    background: "rgba(10,12,16,0.55)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
                    maxWidth: 760,
                  }}
                >
                  <Group justify="space-between" align="center" mb="sm">
                    <Text style={{ color: "#fff", fontWeight: 800, letterSpacing: -0.2 }}>
                      Cosa puoi fare dopo il login
                    </Text>
                    <Text size="sm" style={{ color: "rgba(255,255,255,0.60)" }}>
                      in pochi click
                    </Text>
                  </Group>

                  <List
                    spacing="sm"
                    styles={{
                      itemLabel: { color: "rgba(255,255,255,0.74)", lineHeight: 1.6 },
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
                  background: "rgba(10,12,16,0.78)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
                  backdropFilter: "blur(10px)",
                }}
              >
                {/* FORM: qui sta la differenza -> onSubmit collegato */}
                <form onSubmit={handleSubmit(onSubmit)}>
                  <Stack gap="md">
                    <Stack gap={4}>
                      <Title order={2} style={{ color: "#fff", letterSpacing: -0.4 }}>
                        Login
                      </Title>
                      <Text style={{ color: "rgba(255,255,255,0.70)" }}>
                        Inserisci le credenziali per continuare
                      </Text>
                    </Stack>

                    <Divider style={{ borderColor: "rgba(255,255,255,0.08)" }} />

                    {/* errore auth */}
                    {authError && (
                      <Alert
                        icon={<IconAlertCircle size={16} />}
                        color="red"
                        variant="light"
                        styles={{
                          root: { background: "rgba(255, 0, 0, 0.08)", borderColor: "rgba(255, 0, 0, 0.18)" },
                          message: { color: "rgba(255,255,255,0.85)" },
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
                        label: { color: "rgba(255,255,255,0.85)" },
                        input: {
                          backgroundColor: "rgba(255,255,255,0.06)",
                          borderColor: "rgba(255,255,255,0.10)",
                          color: "#fff",
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
                        label: { color: "rgba(255,255,255,0.85)" },
                        input: {
                          backgroundColor: "rgba(255,255,255,0.06)",
                          borderColor: "rgba(255,255,255,0.10)",
                          color: "#fff",
                        },
                      }}
                    />

                    <Group justify="space-between" mt={-6}>
                      <Anchor
                        size="sm"
                        style={{ color: ACCENT, textDecorationColor: "rgba(209,171,99,0.6)" }}
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
                        style={{ color: "rgba(255,255,255,0.72)" }}
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
                      {/* submit vero */}
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
                          borderColor: "rgba(209,171,99,0.55)",
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
                      style={{ color: "rgba(255,255,255,0.75)" }}
                    >
                      Torna alla Home
                    </Button>

                    <Text size="xs" style={{ color: "rgba(255,255,255,0.50)", lineHeight: 1.5 }} mt={4}>
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
