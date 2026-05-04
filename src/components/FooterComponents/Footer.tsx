import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Box,
  Container,
  Group,
  Stack,
  Text,
  Anchor,
  Divider,
  ActionIcon,
  Image,
  SimpleGrid,
} from "@mantine/core";
import {
  IconBrandWhatsapp,
  IconBrandTelegram,
  IconBrandInstagram,
  IconMail,
  IconPhone,
} from "@tabler/icons-react";

const ACCENT = "#d1ab63";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      role="contentinfo"
      style={{
        background: "#070b12",
        borderTop: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <Container size="xl" py={40}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.2 }}
        >
          {/* TOP GRID */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
            {/* Brand */}
            <Stack gap={10}>
              <Group gap={10} wrap="nowrap" align="center">
                {/* Cambia path in base al tuo progetto */}
                <Image
                  src="/logo_b.png"
                  alt="Photo & Vision"
                  w={94}
                  h={94}
                  fit="contain"
                  style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,.35))" }}
                />
                <Stack gap={2}>
                  <Text fw={900} style={{ color: "#fff", letterSpacing: 0.2 }}>
                    Photo &amp; Vision
                  </Text>
                  <Text size="sm" style={{ color: "rgba(255,255,255,.65)" }}>
                    Beyond the Photo, into the Vision
                  </Text>
                </Stack>
              </Group>

              <Text size="sm" style={{ color: "rgba(255,255,255,.72)", lineHeight: 1.55 }}>
                Qualità di stampa professionale su PDF. <br />
                Carica il tuo documento, scegli formato e finiture, e ricevi una stampa nitida, definita e pronta all’uso.
              </Text>
            </Stack>

            {/* Email */}
            <Stack gap={8} style={{ minWidth: 220 }}>
              <Text fw={800} style={{ color: "rgba(255,255,255,.75)" }}>
                Email
              </Text>

              <Anchor
                href="mailto:pv.photoandvision@gmail.com"
                underline="never"
                style={{ color: "#fff" }}
              >
                <Group gap={10} wrap="nowrap">
                  <ActionIcon
                    variant="light"
                    radius="xl"
                    style={{
                      background: "rgba(255,255,255,.08)",
                      color: ACCENT,
                    }}
                    aria-label="Invia email"
                    title="Email"
                  >
                    <IconMail size={18} />
                  </ActionIcon>
                  <Text fw={700}>info@photoandvision.it</Text>
                </Group>
              </Anchor>
            </Stack>

            {/* Instagram */}
            <Stack gap={8} style={{ minWidth: 220 }}>
              <Text fw={800} style={{ color: "rgba(255,255,255,.75)" }}>
                Instagram
              </Text>

              <Anchor
                href="https://instagram.com/photoandvision"
                target="_blank"
                rel="noopener noreferrer"
                underline="never"
                style={{ color: "#fff" }}
              >
                <Group gap={10} wrap="nowrap">
                  <ActionIcon
                    variant="light"
                    radius="xl"
                    style={{
                      background: "rgba(255,255,255,.08)",
                      color: ACCENT,
                    }}
                    aria-label="Apri Instagram"
                    title="Instagram"
                  >
                    <IconBrandInstagram size={18} />
                  </ActionIcon>
                  <Text fw={700}>@photoandvision</Text>
                </Group>
              </Anchor>
            </Stack>

            {/* Contatti rapidi */}
            <Stack gap={8} style={{ minWidth: 220 }}>
              <Text fw={800} style={{ color: "rgba(255,255,255,.75)" }}>
                Contatti rapidi
              </Text>

              <Group gap={10}>
                <ActionIcon
                  component="a"
                  href="https://t.me/393791780539"
                  target="_blank"
                  rel="noopener noreferrer"
                  radius="xl"
                  size="lg"
                  variant="light"
                  style={{ background: "rgba(255,255,255,.08)", color: ACCENT }}
                  aria-label="Apri Telegram"
                  title="Telegram"
                >
                  <IconBrandTelegram size={20} />
                </ActionIcon>

                <ActionIcon
                  component="a"
                  href="https://wa.me/393791780539"
                  target="_blank"
                  rel="noopener noreferrer"
                  radius="xl"
                  size="lg"
                  variant="light"
                  style={{ background: "rgba(255,255,255,.08)", color: ACCENT }}
                  aria-label="Chatta su WhatsApp"
                  title="WhatsApp"
                >
                  <IconBrandWhatsapp size={20} />
                </ActionIcon>

                <ActionIcon
                  component="a"
                  href="tel:+393791780539"
                  radius="xl"
                  size="lg"
                  variant="light"
                  style={{ background: "rgba(255,255,255,.08)", color: ACCENT }}
                  aria-label="Chiama +39 379 178 0539"
                  title="Chiama"
                >
                  <IconPhone size={20} />
                </ActionIcon>
              </Group>

              <Anchor href="tel:+393791780539" underline="never" style={{ color: "#fff" }}>
                <Text fw={700}>+39 379 178 0539</Text>
              </Anchor>

              <Text size="xs" style={{ color: "rgba(255,255,255,.55)" }}>
                Risposta rapida via WhatsApp / Telegram
              </Text>
            </Stack>
          </SimpleGrid>

          <Divider my={22} style={{ borderColor: "rgba(255,255,255,.08)" }} />

          {/* BOTTOM ROW */}
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Group gap="md" wrap="wrap">
              <Anchor
                component={Link}
                to="/privacy"
                underline="hover"
                style={{ color: "rgba(255,255,255,.78)" }}
              >
                Privacy
              </Anchor>
              <Text style={{ color: "rgba(255,255,255,.25)" }}>•</Text>
              <Anchor
                component={Link}
                to="/cookie-policy"
                underline="hover"
                style={{ color: "rgba(255,255,255,.78)" }}
              >
                Cookie
              </Anchor>
              <Text style={{ color: "rgba(255,255,255,.25)" }}>•</Text>
              <Anchor
                component={Link}
                to="/termini"
                underline="hover"
                style={{ color: "rgba(255,255,255,.78)" }}
              >
                Termini
              </Anchor>
              <Text style={{ color: "rgba(255,255,255,.25)" }}>•</Text>
              <Text style={{ color: "rgba(255,255,255,.78)" }}>P. IVA 05433670758</Text>
            </Group>

            <Text style={{ color: "rgba(255,255,255,.6)" }}>© {year} Photo &amp; Vision</Text>
          </Group>
        </motion.div>
      </Container>
    </Box>
  );
};

export default React.memo(Footer);
