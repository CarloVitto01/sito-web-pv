// src/pages/ResetPassword.tsx
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "../../../backend/firebase";
import { useMediaQuery } from "@mantine/hooks";
import {
  Box,
  Grid,
  Container,
  Paper,
  Stack,
  Title,
  Text,
  PasswordInput,
  Group,
  Button,
  Divider,
  ThemeIcon,
  List,
} from "@mantine/core";
import { IconCheck, IconLock, IconEye, IconEyeOff } from "@tabler/icons-react";
import logoPV from "../../../assets/images/logo_b.png";

const ACCENT = "#d1ab63";

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const oobCode = searchParams.get("oobCode") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isMobile = useMediaQuery("(max-width: 900px)");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      return setError("La nuova password deve contenere almeno 6 caratteri.");
    }

    if (newPassword !== confirmPassword) {
      return setError("Le due password non coincidono.");
    }

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess("Password aggiornata con successo! Ora puoi accedere.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setError("Errore nel reset della password. Link non valido o scaduto.");
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
            {/* BACKDROP */}
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

            {/* Mesh */}
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

            {/* Vignette + border */}
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
                  width: "22%", // <-- riduci qui per rimpicciolirlo
                  maxWidth: 460,
                  opacity: 0.12,
                  filter: "blur(3px)",
                  transform: "translateY(12px) scale(1.02)",
                  userSelect: "none",
                }}
              />
            </Box>

            {/* CONTENUTO (centrato) */}
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
                      color: ACCENT,
                      fontWeight: 800,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      fontSize: 12,
                    }}
                  >
                    Recupero accesso
                  </Text>

                  <Title order={1} style={{ color: "#fff", letterSpacing: -0.9, lineHeight: 1.05 }}>
                    Reimposta la tua password in sicurezza.
                  </Title>

                  <Text style={{ color: "rgba(255,255,255,0.74)", lineHeight: 1.75 }}>
                    Inserisci la nuova password e confermala. Al termine verrai reindirizzato alla pagina di login.
                  </Text>

                  <Paper
                    radius="xl"
                    p="lg"
                    maw={720}
                    w="100%"
                    mx="auto"
                    style={{
                      background: "rgba(10,12,16,0.55)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      backdropFilter: "blur(10px)",
                      boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
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
                        <Text style={{ color: "#fff", fontWeight: 800, letterSpacing: -0.2 }}>
                          Consigli rapidi
                        </Text>
                      </Group>
                      <Text size="sm" style={{ color: "rgba(255,255,255,0.60)" }}>
                        password
                      </Text>
                    </Group>

                    <List
                      spacing="sm"
                      styles={{ itemLabel: { color: "rgba(255,255,255,0.74)", lineHeight: 1.6 } }}
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
                      <List.Item>Minimo 6 caratteri (meglio 10+)</List.Item>
                      <List.Item>Evita sequenze semplici (123456, password)</List.Item>
                      <List.Item>Usa lettere, numeri e simboli se possibile</List.Item>
                    </List>
                  </Paper>
                </Stack>
              </Box>
            </Container>
          </Box>
        </Grid.Col>

        {/* RIGHT (reset form) */}
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
                <form onSubmit={handleReset}>
                  <Stack gap="md">
                    <Stack gap={4}>
                      <Title order={2} style={{ color: "#fff", letterSpacing: -0.4 }}>
                        Reimposta password
                      </Title>
                      <Text style={{ color: "rgba(255,255,255,0.70)" }}>
                        Scegli una nuova password per il tuo account
                      </Text>
                    </Stack>

                    <Divider style={{ borderColor: "rgba(255,255,255,0.08)" }} />

                    <PasswordInput
                      label="Nuova password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.currentTarget.value)}
                      visible={showNewPassword}
                      onVisibilityChange={() => setShowNewPassword((p) => !p)}
                      visibilityToggleIcon={({ reveal }) => (reveal ? <IconEyeOff size={16} /> : <IconEye size={16} />)}
                      styles={{
                        label: { color: "rgba(255,255,255,0.85)" },
                        input: {
                          backgroundColor: "rgba(255,255,255,0.06)",
                          borderColor: "rgba(255,255,255,0.10)",
                          color: "#fff",
                        },
                      }}
                      required
                    />

                    <PasswordInput
                      label="Conferma password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                      visible={showConfirmPassword}
                      onVisibilityChange={() => setShowConfirmPassword((p) => !p)}
                      visibilityToggleIcon={({ reveal }) => (reveal ? <IconEyeOff size={16} /> : <IconEye size={16} />)}
                      styles={{
                        label: { color: "rgba(255,255,255,0.85)" },
                        input: {
                          backgroundColor: "rgba(255,255,255,0.06)",
                          borderColor: "rgba(255,255,255,0.10)",
                          color: "#fff",
                        },
                      }}
                      required
                    />

                    <Button
                      radius="lg"
                      type="submit"
                      style={{
                        background: ACCENT,
                        color: "#111",
                        fontWeight: 800,
                      }}
                    >
                      Aggiorna Password
                    </Button>

                    {error && (
                      <Text size="sm" style={{ color: "#ff6b6b", lineHeight: 1.5 }}>
                        {error}
                      </Text>
                    )}
                    {success && (
                      <Text size="sm" style={{ color: "rgba(209,171,99,0.95)", lineHeight: 1.5 }}>
                        {success}
                      </Text>
                    )}

                    <Button
                      radius="lg"
                      variant="subtle"
                      type="button"
                      onClick={() => navigate("/login")}
                      style={{ color: "rgba(255,255,255,0.75)" }}
                    >
                      Torna al login
                    </Button>

                    {/* Micro copy */}
                    <Text size="xs" style={{ color: "rgba(255,255,255,0.50)", lineHeight: 1.5 }} mt={4}>
                      Creando/aggiornando la password accetti i Termini di servizio e l’Informativa Privacy.
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
};

export default ResetPassword;
