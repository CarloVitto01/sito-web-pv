// src/gestionale/TasseGestionale/TasseGestionale.tsx
import React, { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../backend/apiClient";
import Header from "../../components/HeaderComponents/Header";

import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  NumberInput,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconAlertCircle, IconDeviceFloppy, IconInfoCircle } from "@tabler/icons-react";

type Tasse = {
  ivaRate: number; // 0.22 = 22%
  transportFeeEuro: number; // 1.00 €
  paypalPercent: number; // 0.0349 = 3.49%
  paypalFixed: number; // 0.35 €
};

const defaultTasse: Tasse = {
  ivaRate: 0.22,
  transportFeeEuro: 1,
  paypalPercent: 0.0349,
  paypalFixed: 0.35,
};

const FEES_ENDPOINT = "/api/admin/config/fees";

type SaveState = "idle" | "saving" | "saved" | "error";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number, d = 4) => Number.isFinite(n) ? Number(n.toFixed(d)) : 0;

const TasseGestionale: React.FC = () => {
  const [tasse, setTasse] = useState<Tasse>(defaultTasse);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    api.get<Partial<Tasse>>(FEES_ENDPOINT)
      .then((d) => {
        if (!alive) return;
        setLoadError(null);
        setTasse({
          ivaRate: typeof d.ivaRate === "number" ? d.ivaRate : defaultTasse.ivaRate,
          transportFeeEuro:
            typeof d.transportFeeEuro === "number" ? d.transportFeeEuro : defaultTasse.transportFeeEuro,
          paypalPercent:
            typeof d.paypalPercent === "number" ? d.paypalPercent : defaultTasse.paypalPercent,
          paypalFixed: typeof d.paypalFixed === "number" ? d.paypalFixed : defaultTasse.paypalFixed,
        });
        setLoaded(true);
      })
      .catch((err) => {
        if (!alive) return;
        console.error(err);
        setLoadError(err instanceof ApiError ? err.message : "Impossibile caricare la configurazione delle tasse.");
        setLoaded(true);
      });

    return () => { alive = false; };
  }, []);

  const handleSave = async () => {
    try {
      setSaveState("saving");

      const cleaned: Tasse = {
        ivaRate: clamp(round(tasse.ivaRate, 4), 0, 1),
        transportFeeEuro: clamp(round(tasse.transportFeeEuro, 2), 0, 9999),
        paypalPercent: clamp(round(tasse.paypalPercent, 4), 0, 1),
        paypalFixed: clamp(round(tasse.paypalFixed, 2), 0, 9999),
      };

      await api.put<Tasse>(FEES_ENDPOINT, cleaned);
      setTasse(cleaned);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2500);
    } catch (e) {
      console.error(e);
      setSaveState("error");
      window.setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  const preview = useMemo(() => {
    const ivaPct = (tasse.ivaRate * 100);
    const ppPct = (tasse.paypalPercent * 100);
    return {
      ivaPct,
      ppPct,
      ppFixed: tasse.paypalFixed,
      trasporto: tasse.transportFeeEuro,
    };
  }, [tasse]);

  return (
    <Box>
      <Header />

      <Container size="lg" py="xl">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Stack gap={4}>
              <Title order={2} c="white">🧮 Gestione Tasse</Title>
              <Text c="dimmed">
                Configura IVA, trasporto e commissioni PayPal. I valori percentuali vengono salvati in forma decimale.
              </Text>
            </Stack>

            <Group gap="sm">
              <Badge variant="light" color="gray">
                {FEES_ENDPOINT}
              </Badge>
              {saveState === "saved" && <Badge color="green">Salvato</Badge>}
              {saveState === "error" && <Badge color="red">Errore</Badge>}
            </Group>
          </Group>

          {!loaded ? (
            <Card withBorder radius="lg" p="lg">
              <Text>Caricamento…</Text>
            </Card>
          ) : (
            <>
              {loadError && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" radius="lg" variant="light">
                  {loadError}
                </Alert>
              )}

              <Card withBorder radius="lg" p="lg">
                <Stack gap="md">
                  <Group justify="space-between" wrap="wrap">
                    <Group gap="xs">
                      <Text fw={700}>Impostazioni</Text>
                      <Tooltip label="IVA e PayPal sono in percentuale (0–100). Vengono salvati come decimali (0–1).">
                        <ActionIcon variant="subtle" radius="xl" aria-label="Info">
                          <IconInfoCircle size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>

                    <Button
                      leftSection={<IconDeviceFloppy size={18} />}
                      radius="lg"
                      onClick={handleSave}
                      loading={saveState === "saving"}
                    >
                      Salva Tasse
                    </Button>
                  </Group>

                  <Divider />

                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <NumberInput
                        label="IVA (%)"
                        description="Esempio: 22 = 22%"
                        value={preview.ivaPct}
                        min={0}
                        max={100}
                        step={0.1}
                        clampBehavior="strict"
                        thousandSeparator="."
                        decimalSeparator=","
                        fixedDecimalScale
                        decimalScale={2}
                        radius="lg"
                        onChange={(v) => {
                          const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
                          setTasse((s) => ({ ...s, ivaRate: clamp((Number.isFinite(n) ? n : 0) / 100, 0, 1) }));
                        }}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <NumberInput
                        label="Trasporto (€)"
                        description="Costo fisso applicato dove previsto"
                        value={tasse.transportFeeEuro}
                        min={0}
                        step={0.1}
                        clampBehavior="strict"
                        thousandSeparator="."
                        decimalSeparator=","
                        fixedDecimalScale
                        decimalScale={2}
                        radius="lg"
                        onChange={(v) => {
                          const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
                          setTasse((s) => ({ ...s, transportFeeEuro: clamp(Number.isFinite(n) ? n : 0, 0, 9999) }));
                        }}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <NumberInput
                        label="PayPal (%)"
                        description="Esempio: 3,49 = 3.49%"
                        value={preview.ppPct}
                        min={0}
                        max={100}
                        step={0.01}
                        clampBehavior="strict"
                        thousandSeparator="."
                        decimalSeparator=","
                        fixedDecimalScale
                        decimalScale={2}
                        radius="lg"
                        onChange={(v) => {
                          const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
                          setTasse((s) => ({ ...s, paypalPercent: clamp((Number.isFinite(n) ? n : 0) / 100, 0, 1) }));
                        }}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <NumberInput
                        label="PayPal fisso (€)"
                        description="Quota fissa per transazione"
                        value={tasse.paypalFixed}
                        min={0}
                        step={0.01}
                        clampBehavior="strict"
                        thousandSeparator="."
                        decimalSeparator=","
                        fixedDecimalScale
                        decimalScale={2}
                        radius="lg"
                        onChange={(v) => {
                          const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
                          setTasse((s) => ({ ...s, paypalFixed: clamp(Number.isFinite(n) ? n : 0, 0, 9999) }));
                        }}
                      />
                    </Grid.Col>
                  </Grid>

                  <Alert color="gray" radius="lg" variant="light">
                    <Text size="sm">
                      <Text span fw={700}>Anteprima:</Text>{" "}
                      IVA {preview.ivaPct.toFixed(2)}% • PayPal {preview.ppPct.toFixed(2)}% +{" "}
                      {preview.ppFixed.toFixed(2)}€ • Trasporto {preview.trasporto.toFixed(2)}€
                    </Text>
                  </Alert>
                </Stack>
              </Card>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default TasseGestionale;
