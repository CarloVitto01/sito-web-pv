// src/gestionale/GestionaleBanner/BannerGestionale.tsx
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../backend/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import Header from "../../components/HeaderComponents/Header";

import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconDiscount2,
  IconX,
} from "@tabler/icons-react";

type Variant = "info" | "warning" | "success" | "error" | "christmas";

type BannerData = {
  enabled: boolean;
  text: string;
  variant: Variant;
};

const defaultData: BannerData = {
  enabled: false,
  text: "",
  variant: "info",
};

const VARIANT_META: Record<
  Variant,
  { label: string; icon: React.ReactNode; color: string; previewBg: string; previewBorder: string; previewText: string }
> = {
  info: {
    label: "Info",
    icon: <IconInfoCircle size={18} />,
    color: "blue",
    previewBg: "rgba(34,139,230,0.10)",
    previewBorder: "rgba(34,139,230,0.35)",
    previewText: "#0b2a4a",
  },
  warning: {
    label: "Warning",
    icon: <IconAlertTriangle size={18} />,
    color: "yellow",
    previewBg: "rgba(250,176,5,0.12)",
    previewBorder: "rgba(250,176,5,0.40)",
    previewText: "#3b2a00",
  },
  success: {
    label: "Success",
    icon: <IconCheck size={18} />,
    color: "green",
    previewBg: "rgba(64,192,87,0.12)",
    previewBorder: "rgba(64,192,87,0.40)",
    previewText: "#0b2a17",
  },
  error: {
    label: "Error",
    icon: <IconX size={18} />,
    color: "red",
    previewBg: "rgba(250,82,82,0.12)",
    previewBorder: "rgba(250,82,82,0.40)",
    previewText: "#3b0a0a",
  },
  christmas: {
    label: "Promo Natale",
    icon: <IconDiscount2 size={18} />,
    color: "grape",
    previewBg: "rgba(190,75,219,0.12)",
    previewBorder: "rgba(190,75,219,0.40)",
    previewText: "#2b0f33",
  },
};

const BannerGestionale: React.FC = () => {
  const [form, setForm] = useState<BannerData>(defaultData);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    const ref = doc(db, "config", "homeBanner");
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() as Partial<BannerData> | undefined;
      if (d) {
        setForm({
          enabled: d.enabled ?? false,
          text: d.text ?? "",
          variant: (d.variant as Variant) ?? "info",
        });
      }
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "config", "homeBanner"),
        {
          enabled: form.enabled,
          text: form.text,
          variant: form.variant,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1800);
    } catch (e) {
      console.error(e);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2600);
    } finally {
      setSaving(false);
    }
  };

  const meta = useMemo(() => VARIANT_META[form.variant], [form.variant]);

  const saveBadge = useMemo(() => {
    if (saveState === "saved") return <Badge color="green" leftSection={<IconCheck size={14} />}>Salvato</Badge>;
    if (saveState === "error") return <Badge color="red" leftSection={<IconAlertTriangle size={14} />}>Errore</Badge>;
    return null;
  }, [saveState]);

  return (
    <Box>
      <Header />

      <Container size="xl" py="lg">
        <Paper radius="xl" p="lg" withBorder>
          <Group justify="space-between" align="flex-start" gap="md">
            <Box>
              <Title order={2} fw={900}>
                Banner Home
              </Title>
              <Text c="dimmed" mt={6}>
                Gestisci il banner mostrato in home (testo, stile e attivazione).
              </Text>
            </Box>

            <Group gap="sm" aria-live="polite" role="status">
              {saveBadge}
              <Button
                radius="xl"
                color="yellow"
                leftSection={<IconDeviceFloppy size={18} />}
                onClick={handleSave}
                loading={saving}
              >
                Salva
              </Button>
            </Group>
          </Group>
        </Paper>

        <Stack mt="lg" gap="lg">
          <Card radius="xl" withBorder>
            <Group justify="space-between" align="center" mb="sm">
              <Group gap={10}>
                {meta.icon}
                <Title order={3} fw={900}>
                  Configurazione
                </Title>
              </Group>
            </Group>

            <Divider mb="md" />

            <Stack gap="md">
              <Switch
                label="Banner attivo"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.currentTarget.checked }))}
              />

              <Select
                label="Stile"
                value={form.variant}
                onChange={(v) => setForm((f) => ({ ...f, variant: (v as Variant) ?? "info" }))}
                data={(Object.keys(VARIANT_META) as Variant[]).map((k) => ({
                  value: k,
                  label: VARIANT_META[k].label,
                }))}
                radius="lg"
                allowDeselect={false}
              />

              <Textarea
                label="Testo banner"
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.currentTarget.value }))}
                placeholder="Scrivi l'avviso da mostrare in home…"
                autosize
                minRows={3}
                maxRows={6}
                radius="lg"
              />
            </Stack>
          </Card>

          <Card radius="xl" withBorder>
            <Group justify="space-between" align="center" mb="sm">
              <Group gap={10}>
                <IconInfoCircle size={20} />
                <Title order={3} fw={900}>
                  Anteprima
                </Title>
              </Group>

              <Group gap="sm">
                <Badge color={meta.color} variant="light">
                  {VARIANT_META[form.variant].label}
                </Badge>
                <Badge color={form.enabled ? "green" : "gray"} variant="light">
                  {form.enabled ? "Attivo" : "Disattivo"}
                </Badge>
              </Group>
            </Group>

            <Divider mb="md" />

            <Box
              style={{
                borderRadius: 16,
                border: `1px solid ${meta.previewBorder}`,
                background: meta.previewBg,
                padding: "14px 16px",
                color: meta.previewText,
              }}
              role="status"
              aria-live="polite"
            >
              <Group gap={10} wrap="nowrap">
                <Box style={{ display: "grid", placeItems: "center" }}>{meta.icon}</Box>
                <Text fw={800} style={{ lineHeight: 1.35 }}>
                  {form.text?.trim() ? form.text : "— nessun testo —"}
                </Text>
              </Group>
            </Box>

            <Text c="dimmed" size="sm" mt="md">
              Nota: il banner verrà mostrato solo se “Attivo” è abilitato e il testo non è vuoto.
            </Text>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default React.memo(BannerGestionale);
