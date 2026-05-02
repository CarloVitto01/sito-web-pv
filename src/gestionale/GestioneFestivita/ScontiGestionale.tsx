// src/gestionale/ScontiGestionale/ScontiGestionale.tsx
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../backend/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import Header from "../../components/HeaderComponents/Header";

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  NumberInput,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconDiscount2, IconDeviceFloppy } from "@tabler/icons-react";

type PromoConfig = {
  enabled: boolean;
  name?: string;
  description?: string;
  percent: number; // 10 = 10%
  minPdf?: number; // min numero PDF
};

const COLL_PROMO = "configPromo";
const DOC_PROMO = "current";

const DEFAULT_PROMO: PromoConfig = {
  enabled: false,
  name: "Promo",
  description: "Sconto sulle stampe PDF.",
  percent: 10,
  minPdf: 1,
};

type SaveState = "idle" | "saving" | "saved" | "error";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const ScontiGestionale: React.FC = () => {
  const [promo, setPromo] = useState<PromoConfig>(DEFAULT_PROMO);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    const ref = doc(db, COLL_PROMO, DOC_PROMO);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<PromoConfig>;
          setPromo({
            enabled: typeof data.enabled === "boolean" ? data.enabled : DEFAULT_PROMO.enabled,
            name: typeof data.name === "string" ? data.name : DEFAULT_PROMO.name,
            description:
              typeof data.description === "string" ? data.description : DEFAULT_PROMO.description,
            percent: typeof data.percent === "number" ? data.percent : DEFAULT_PROMO.percent,
            minPdf: typeof data.minPdf === "number" ? data.minPdf : DEFAULT_PROMO.minPdf,
          });
        } else {
          setPromo(DEFAULT_PROMO);
        }
        setLoaded(true);
      },
      (err) => {
        console.error(err);
        setError("Impossibile leggere la configurazione sconti.");
        setLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  const previewText = useMemo(() => {
    const name = (promo.name || "Promo").trim();
    const perc = Number.isFinite(promo.percent) ? promo.percent : 0;
    const min = promo.minPdf ?? 1;

    if (!promo.enabled) return "Promo disattivata.";
    return `${name}: -${perc}% (minimo ${min} PDF) • ${promo.description || ""}`.trim();
  }, [promo]);

  const save = async () => {
    try {
      setSaveState("saving");
      setError(null);

      const ref = doc(db, COLL_PROMO, DOC_PROMO);
      await setDoc(
        ref,
        {
          enabled: Boolean(promo.enabled),
          name: (promo.name || "").trim(),
          description: (promo.description || "").trim(),
          percent: Number.isFinite(promo.percent) ? clamp(promo.percent, 0, 100) : 0,
          minPdf: Math.max(1, Number(promo.minPdf ?? 1) || 1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      console.error(e);
      setSaveState("error");
      setError("Errore durante il salvataggio.");
      window.setTimeout(() => setSaveState("idle"), 2500);
    }
  };

  return (
    <Box>
      <Header />

      <Container size="md" py="xl">
        <Group justify="space-between" align="flex-start" wrap="wrap" mb="lg">
          <Box>
            <Title order={2}>🏷️ Gestione Sconti / Promo</Title>
            <Text c="dimmed">Configura una promo globale (testo + percentuale + soglia minima).</Text>
          </Box>

          <Group gap="xs">
            <Badge variant="light" color="gray">
              {COLL_PROMO}/{DOC_PROMO}
            </Badge>
            <Badge variant="light" color={promo.enabled ? "green" : "gray"}>
              {promo.enabled ? "Attiva" : "Spenta"}
            </Badge>
          </Group>
        </Group>

        {!loaded ? (
          <Card withBorder radius="lg" p="xl">
            <Group justify="center">
              <Loader />
              <Text>Caricamento…</Text>
            </Group>
          </Card>
        ) : (
          <Box>
            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
                radius="lg"
                mb="md"
              >
                {error}
              </Alert>
            )}

            {/* Stato */}
            <Card withBorder radius="lg" p="lg" mb="lg">
              <Group justify="space-between" align="center" wrap="wrap">
                <Group gap="sm">
                  <IconDiscount2 size={18} />
                  <Box>
                    <Text fw={700}>Stato promo</Text>
                    <Text size="sm" c="dimmed">
                      Attiva/disattiva la promo senza perdere i dati.
                    </Text>
                  </Box>
                </Group>

                <Switch
                  checked={promo.enabled}
                  onChange={(e) => setPromo((p) => ({ ...p, enabled: e.currentTarget.checked }))}
                  size="md"
                  label={promo.enabled ? "Promo attiva" : "Promo disattivata"}
                />
              </Group>
            </Card>

            {/* Dati promo */}
            <Card withBorder radius="lg" p="lg" mb="lg">
              <Group justify="space-between" align="center" mb="sm">
                <Text fw={700}>Dati promo</Text>
                <Badge variant="light" color="yellow">
                  Anteprima
                </Badge>
              </Group>

              <Divider mb="md" />

              <Box style={{ display: "grid", gap: 14 }}>
                <TextInput
                  label="Nome promo"
                  value={promo.name || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPromo((p) => ({ ...p, name: e.currentTarget.value }))
                  }
                  radius="lg"
                  placeholder="Es. Promo Invernale"
                />

                <Textarea
                  label="Descrizione (banner)"
                  value={promo.description || ""}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setPromo((p) => ({ ...p, description: e.currentTarget.value }))
                  }
                  radius="lg"
                  autosize
                  minRows={2}
                  placeholder="Messaggio breve da mostrare all’utente…"
                />

                <Group grow align="flex-start">
                  <NumberInput
                    label="Sconto (%)"
                    value={promo.percent}
                    onChange={(v) =>
                      setPromo((p) => ({
                        ...p,
                        percent: clamp(Number(v) || 0, 0, 100),
                      }))
                    }
                    min={0}
                    max={100}
                    step={1}
                    radius="lg"
                    clampBehavior="strict"
                  />

                  <NumberInput
                    label="Minimo PDF per applicare lo sconto"
                    value={promo.minPdf ?? 1}
                    onChange={(v) =>
                      setPromo((p) => ({
                        ...p,
                        minPdf: Math.max(1, Number(v) || 1),
                      }))
                    }
                    min={1}
                    step={1}
                    radius="lg"
                    clampBehavior="strict"
                  />
                </Group>

                <Alert color={promo.enabled ? "yellow" : "gray"} variant="light" radius="lg">
                  <Text fw={700}>Anteprima</Text>
                  <Text size="sm" c="dimmed">
                    {previewText}
                  </Text>
                </Alert>
              </Box>
            </Card>

            {/* Actions */}
            <Group justify="space-between" wrap="wrap">
              <Box aria-live="polite" role="status" style={{ minHeight: 24 }}>
                {saveState === "saved" && <Text c="green" fw={700}>Salvato</Text>}
                {saveState === "error" && <Text c="red" fw={700}>Errore</Text>}
              </Box>

              <Button
                radius="lg"
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={save}
                loading={saveState === "saving"}
              >
                Salva configurazione
              </Button>
            </Group>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default ScontiGestionale;
