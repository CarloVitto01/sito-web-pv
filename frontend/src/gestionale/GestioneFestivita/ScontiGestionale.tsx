// src/gestionale/ScontiGestionale/ScontiGestionale.tsx
import React, { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../backend/apiClient";
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
  Select,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconDiscount2, IconDeviceFloppy } from "@tabler/icons-react";

type BasePromo = {
  enabled: boolean;
  name?: string;
  description?: string;
  percent: number;
  minPdf?: number;
  startsAt?: string;
  endsAt?: string;
};

type StudentPromo = BasePromo & {
  targetCourse?: string;

  /**
   * Ora indica l'anno di corso:
   * 1 = 1° anno
   * 2 = 2° anno
   * ecc.
   *
   * Mantengo il nome targetEnrollmentYear per non rompere RiepilogoOrdine.
   */
  targetEnrollmentYear?: number | null;
};

type PromoConfig = {
  generalPromo: BasePromo;
  studentPromo: StudentPromo;
};

type PromoPayload = PromoConfig;

const PROMO_ENDPOINT = "/api/admin/config/promo";

const todayIso = () => new Date().toISOString().slice(0, 10);

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

const normalizeCorsoLaureaValue = (value: any): string | null => {
  const raw = String(value || "").trim();

  if (!raw) return null;

  const match = CORSI_LAUREA_OPTIONS.find(
    (opt) => opt.value.toLowerCase() === raw.toLowerCase()
  );

  return match?.value || null;
};

const formatAnnoCorso = (value?: number | null) => {
  if (!value) return "non impostato";
  return `${value}° anno`;
};

const DEFAULT_GENERAL_PROMO: BasePromo = {
  enabled: false,
  name: "Promo generale",
  description: "Sconto valido per tutti gli utenti.",
  percent: 10,
  minPdf: 1,
  startsAt: todayIso(),
  endsAt: "",
};

const DEFAULT_STUDENT_PROMO: StudentPromo = {
  enabled: false,
  name: "Promo Medicina 1° anno",
  description: "Sconto aggiuntivo dedicato agli studenti del primo anno.",
  percent: 10,
  minPdf: 1,
  targetCourse: "Medicina",
  targetEnrollmentYear: 1,
  startsAt: todayIso(),
  endsAt: "",
};

const DEFAULT_PROMO: PromoConfig = {
  generalPromo: DEFAULT_GENERAL_PROMO,
  studentPromo: DEFAULT_STUDENT_PROMO,
};

type SaveState = "idle" | "saving" | "saved" | "error";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const parseNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeBasePromo = (
  data: Partial<BasePromo> | undefined,
  fallback: BasePromo
): BasePromo => ({
  enabled: typeof data?.enabled === "boolean" ? data.enabled : fallback.enabled,
  name: typeof data?.name === "string" ? data.name : fallback.name,
  description: typeof data?.description === "string" ? data.description : fallback.description,
  percent: typeof data?.percent === "number" ? data.percent : fallback.percent,
  minPdf: typeof data?.minPdf === "number" ? data.minPdf : fallback.minPdf,
  startsAt: typeof data?.startsAt === "string" ? data.startsAt : fallback.startsAt,
  endsAt: typeof data?.endsAt === "string" ? data.endsAt : fallback.endsAt,
});

const normalizeStudentPromo = (
  data: Partial<StudentPromo> | undefined,
  fallback: StudentPromo
): StudentPromo => {
  const rawYear =
    typeof data?.targetEnrollmentYear === "number"
      ? data.targetEnrollmentYear
      : fallback.targetEnrollmentYear;

  const normalizedYear =
    typeof rawYear === "number" && rawYear >= 1 && rawYear <= 6
      ? rawYear
      : fallback.targetEnrollmentYear;

  return {
    ...normalizeBasePromo(data, fallback),
    targetCourse:
      typeof data?.targetCourse === "string" ? data.targetCourse : fallback.targetCourse,
    targetEnrollmentYear: normalizedYear,
  };
};

const validateDateRange = (promo: BasePromo) => {
  if (promo.enabled && promo.startsAt && promo.endsAt && promo.endsAt < promo.startsAt) {
    return false;
  }

  return true;
};

const ScontiGestionale: React.FC = () => {
  const [promo, setPromo] = useState<PromoConfig>(DEFAULT_PROMO);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    let alive = true;

    api
      .get<PromoPayload>(PROMO_ENDPOINT)
      .then((data) => {
        if (!alive) return;

        setPromo({
          generalPromo: normalizeBasePromo(data?.generalPromo, DEFAULT_GENERAL_PROMO),
          studentPromo: normalizeStudentPromo(data?.studentPromo, DEFAULT_STUDENT_PROMO),
        });
        setLoaded(true);
      })
      .catch((err) => {
        if (!alive) return;
        console.error(err);
        setError(
          err instanceof ApiError
            ? err.message || "Impossibile leggere la configurazione sconti."
            : "Impossibile leggere la configurazione sconti."
        );
        setPromo(DEFAULT_PROMO);
        setLoaded(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  const generalPreviewText = useMemo(() => {
    const p = promo.generalPromo;

    if (!p.enabled) return "Sconto generale disattivato.";

    const name = (p.name || "Promo generale").trim();
    const min = p.minPdf ?? 1;

    const dateText =
      p.startsAt && p.endsAt
        ? `dal ${p.startsAt} al ${p.endsAt}`
        : p.startsAt
          ? `dal ${p.startsAt}`
          : p.endsAt
            ? `fino al ${p.endsAt}`
            : "senza scadenza impostata";

    return `${name}: -${p.percent}% • minimo ${min} PDF • ${dateText} • ${p.description || ""
      }`.trim();
  }, [promo.generalPromo]);

  const studentPreviewText = useMemo(() => {
    const p = promo.studentPromo;

    if (!p.enabled) return "Sconto facoltà/corso disattivato.";

    const name = (p.name || "Promo studenti").trim();
    const min = p.minPdf ?? 1;

    const target = `${p.targetCourse || "corso non impostato"} • ${formatAnnoCorso(
      p.targetEnrollmentYear
    )}`;

    const dateText =
      p.startsAt && p.endsAt
        ? `dal ${p.startsAt} al ${p.endsAt}`
        : p.startsAt
          ? `dal ${p.startsAt}`
          : p.endsAt
            ? `fino al ${p.endsAt}`
            : "senza scadenza impostata";

    return `${name}: -${p.percent}% aggiuntivo • minimo ${min} PDF • ${target} • ${dateText} • ${p.description || ""
      }`.trim();
  }, [promo.studentPromo]);

  const save = async () => {
    try {
      setSaveState("saving");
      setError(null);

      if (!validateDateRange(promo.generalPromo)) {
        setSaveState("error");
        setError("Nello sconto generale, la data fine non può essere precedente alla data inizio.");
        window.setTimeout(() => setSaveState("idle"), 2500);
        return;
      }

      if (!validateDateRange(promo.studentPromo)) {
        setSaveState("error");
        setError(
          "Nello sconto facoltà/corso, la data fine non può essere precedente alla data inizio."
        );
        window.setTimeout(() => setSaveState("idle"), 2500);
        return;
      }

      if (promo.studentPromo.enabled) {
        const normalizedCourse = normalizeCorsoLaureaValue(promo.studentPromo.targetCourse);

        if (!normalizedCourse) {
          setSaveState("error");
          setError("Seleziona il corso destinatario dello sconto facoltà/corso.");
          window.setTimeout(() => setSaveState("idle"), 2500);
          return;
        }

        const selectedYear = Number(promo.studentPromo.targetEnrollmentYear);

        if (!Number.isFinite(selectedYear) || selectedYear < 1 || selectedYear > 6) {
          setSaveState("error");
          setError("Seleziona l'anno di corso destinatario.");
          window.setTimeout(() => setSaveState("idle"), 2500);
          return;
        }
      }

      const payload: PromoPayload = {
        generalPromo: {
          enabled: Boolean(promo.generalPromo.enabled),
          name: (promo.generalPromo.name || "").trim(),
          description: (promo.generalPromo.description || "").trim(),
          percent: Number.isFinite(promo.generalPromo.percent)
            ? clamp(promo.generalPromo.percent, 0, 100)
            : 0,
          minPdf: Math.max(1, Number(promo.generalPromo.minPdf ?? 1) || 1),
          startsAt: promo.generalPromo.startsAt || "",
          endsAt: promo.generalPromo.endsAt || "",
        },

        studentPromo: {
          enabled: Boolean(promo.studentPromo.enabled),
          name: (promo.studentPromo.name || "").trim(),
          description: (promo.studentPromo.description || "").trim(),
          percent: Number.isFinite(promo.studentPromo.percent)
            ? clamp(promo.studentPromo.percent, 0, 100)
            : 0,
          minPdf: Math.max(1, Number(promo.studentPromo.minPdf ?? 1) || 1),
          targetCourse: normalizeCorsoLaureaValue(promo.studentPromo.targetCourse) || "",
          targetEnrollmentYear: clamp(
            Number(promo.studentPromo.targetEnrollmentYear ?? 1) || 1,
            1,
            6
          ),
          startsAt: promo.studentPromo.startsAt || "",
          endsAt: promo.studentPromo.endsAt || "",
        },
      };

      const saved = await api.put<PromoPayload>(PROMO_ENDPOINT, payload);

      setPromo({
        generalPromo: normalizeBasePromo(saved?.generalPromo, DEFAULT_GENERAL_PROMO),
        studentPromo: normalizeStudentPromo(saved?.studentPromo, DEFAULT_STUDENT_PROMO),
      });

      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2000);
    } catch (e) {
      console.error(e);
      setSaveState("error");
      setError(e instanceof ApiError ? e.message || "Errore durante il salvataggio." : "Errore durante il salvataggio.");
      window.setTimeout(() => setSaveState("idle"), 2500);
    }
  };

  return (
    <Box>
      <Header />

      <Container size="md" py="xl">
        <Group justify="space-between" align="flex-start" wrap="wrap" mb="lg">
          <Box>
            <Title order={2} c="white">🏷️ Gestione Sconti / Promo</Title>
            <Text c="dimmed">
              Configura lo sconto generale e lo sconto aggiuntivo per facoltà/corso.
            </Text>
          </Box>

          <Group gap="xs">
            <Badge variant="light" color="gray">
              {PROMO_ENDPOINT}
            </Badge>
            <Badge variant="light" color={promo.generalPromo.enabled ? "green" : "gray"}>
              Generale {promo.generalPromo.enabled ? "attivo" : "spento"}
            </Badge>
            <Badge variant="light" color={promo.studentPromo.enabled ? "green" : "gray"}>
              Facoltà {promo.studentPromo.enabled ? "attivo" : "spento"}
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

            {/* SCONTO GENERALE */}
            <Card withBorder radius="lg" p="lg" mb="lg">
              <Group justify="space-between" align="center" wrap="wrap" mb="sm">
                <Group gap="sm">
                  <IconDiscount2 size={18} />
                  <Box>
                    <Text fw={700}>Sconto generale</Text>
                    <Text size="sm" c="dimmed">
                      Valido per tutti gli utenti.
                    </Text>
                  </Box>
                </Group>

                <Switch
                  checked={promo.generalPromo.enabled}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked;

                    setPromo((p) => ({
                      ...p,
                      generalPromo: {
                        ...p.generalPromo,
                        enabled: checked,
                      },
                    }));
                  }}
                  size="md"
                  label={promo.generalPromo.enabled ? "Attivo" : "Disattivato"}
                />
              </Group>

              <Divider mb="md" />

              <Box style={{ display: "grid", gap: 14 }}>
                <TextInput
                  label="Nome promo generale"
                  value={promo.generalPromo.name || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.currentTarget.value;

                    setPromo((p) => ({
                      ...p,
                      generalPromo: {
                        ...p.generalPromo,
                        name: value,
                      },
                    }));
                  }}
                  radius="lg"
                  placeholder="Es. Promo generale"
                />

                <Textarea
                  label="Descrizione / banner generale"
                  value={promo.generalPromo.description || ""}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    const value = e.currentTarget.value;

                    setPromo((p) => ({
                      ...p,
                      generalPromo: {
                        ...p.generalPromo,
                        description: value,
                      },
                    }));
                  }}
                  radius="lg"
                  autosize
                  minRows={2}
                />

                <Group grow align="flex-start">
                  <NumberInput
                    label="Sconto generale (%)"
                    value={promo.generalPromo.percent}
                    onChange={(v) => {
                      const value = parseNumber(v, 0);

                      setPromo((p) => ({
                        ...p,
                        generalPromo: {
                          ...p.generalPromo,
                          percent: clamp(value, 0, 100),
                        },
                      }));
                    }}
                    min={0}
                    max={100}
                    step={1}
                    radius="lg"
                    clampBehavior="strict"
                  />

                  <NumberInput
                    label="Minimo PDF"
                    value={promo.generalPromo.minPdf ?? 1}
                    onChange={(v) => {
                      const value = parseNumber(v, 1);

                      setPromo((p) => ({
                        ...p,
                        generalPromo: {
                          ...p.generalPromo,
                          minPdf: Math.max(1, value),
                        },
                      }));
                    }}
                    min={1}
                    step={1}
                    radius="lg"
                    clampBehavior="strict"
                  />
                </Group>

                <Group grow align="flex-start">
                  <TextInput
                    label="Data inizio"
                    type="date"
                    value={promo.generalPromo.startsAt || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.currentTarget.value;

                      setPromo((p) => ({
                        ...p,
                        generalPromo: {
                          ...p.generalPromo,
                          startsAt: value,
                        },
                      }));
                    }}
                    radius="lg"
                  />

                  <TextInput
                    label="Data fine"
                    type="date"
                    value={promo.generalPromo.endsAt || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.currentTarget.value;

                      setPromo((p) => ({
                        ...p,
                        generalPromo: {
                          ...p.generalPromo,
                          endsAt: value,
                        },
                      }));
                    }}
                    radius="lg"
                  />
                </Group>

                <Alert
                  color={promo.generalPromo.enabled ? "yellow" : "gray"}
                  variant="light"
                  radius="lg"
                >
                  <Text fw={700}>Anteprima sconto generale</Text>
                  <Text size="sm" c="dimmed">
                    {generalPreviewText}
                  </Text>
                </Alert>
              </Box>
            </Card>

            {/* SCONTO FACOLTÀ / CORSO */}
            <Card withBorder radius="lg" p="lg" mb="lg">
              <Group justify="space-between" align="center" wrap="wrap" mb="sm">
                <Group gap="sm">
                  <IconDiscount2 size={18} />
                  <Box>
                    <Text fw={700}>Sconto aggiuntivo facoltà/corso</Text>
                    <Text size="sm" c="dimmed">
                      Valido solo per corso e anno selezionati.
                    </Text>
                  </Box>
                </Group>

                <Switch
                  checked={promo.studentPromo.enabled}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked;

                    setPromo((p) => ({
                      ...p,
                      studentPromo: {
                        ...p.studentPromo,
                        enabled: checked,
                      },
                    }));
                  }}
                  size="md"
                  label={promo.studentPromo.enabled ? "Attivo" : "Disattivato"}
                />
              </Group>

              <Divider mb="md" />

              <Box style={{ display: "grid", gap: 14 }}>
                <TextInput
                  label="Nome promo facoltà/corso"
                  value={promo.studentPromo.name || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.currentTarget.value;

                    setPromo((p) => ({
                      ...p,
                      studentPromo: {
                        ...p.studentPromo,
                        name: value,
                      },
                    }));
                  }}
                  radius="lg"
                  placeholder="Es. Promo Medicina 1° anno"
                />

                <Textarea
                  label="Descrizione / banner facoltà/corso"
                  value={promo.studentPromo.description || ""}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    const value = e.currentTarget.value;

                    setPromo((p) => ({
                      ...p,
                      studentPromo: {
                        ...p.studentPromo,
                        description: value,
                      },
                    }));
                  }}
                  radius="lg"
                  autosize
                  minRows={2}
                />

                <Group grow align="flex-start">
                  <Select
                    label="Corso destinatario"
                    placeholder="Seleziona corso"
                    value={normalizeCorsoLaureaValue(promo.studentPromo.targetCourse)}
                    onChange={(value) => {
                      setPromo((p) => ({
                        ...p,
                        studentPromo: {
                          ...p.studentPromo,
                          targetCourse: value || "",
                        },
                      }));
                    }}
                    data={CORSI_LAUREA_OPTIONS}
                    searchable
                    clearable
                    radius="lg"
                  />

                  <Select
                    label="Anno di corso"
                    placeholder="Seleziona anno"
                    value={
                      promo.studentPromo.targetEnrollmentYear
                        ? String(promo.studentPromo.targetEnrollmentYear)
                        : null
                    }
                    onChange={(value) => {
                      const selectedYear = value ? Number(value) : null;

                      setPromo((p) => ({
                        ...p,
                        studentPromo: {
                          ...p.studentPromo,
                          targetEnrollmentYear: selectedYear,
                        },
                      }));
                    }}
                    data={ANNI_CORSO_OPTIONS}
                    radius="lg"
                    clearable
                  />
                </Group>

                <Group grow align="flex-start">
                  <NumberInput
                    label="Sconto aggiuntivo (%)"
                    value={promo.studentPromo.percent}
                    onChange={(v) => {
                      const value = parseNumber(v, 0);

                      setPromo((p) => ({
                        ...p,
                        studentPromo: {
                          ...p.studentPromo,
                          percent: clamp(value, 0, 100),
                        },
                      }));
                    }}
                    min={0}
                    max={100}
                    step={1}
                    radius="lg"
                    clampBehavior="strict"
                  />

                  <NumberInput
                    label="Minimo PDF"
                    value={promo.studentPromo.minPdf ?? 1}
                    onChange={(v) => {
                      const value = parseNumber(v, 1);

                      setPromo((p) => ({
                        ...p,
                        studentPromo: {
                          ...p.studentPromo,
                          minPdf: Math.max(1, value),
                        },
                      }));
                    }}
                    min={1}
                    step={1}
                    radius="lg"
                    clampBehavior="strict"
                  />
                </Group>

                <Group grow align="flex-start">
                  <TextInput
                    label="Data inizio"
                    type="date"
                    value={promo.studentPromo.startsAt || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.currentTarget.value;

                      setPromo((p) => ({
                        ...p,
                        studentPromo: {
                          ...p.studentPromo,
                          startsAt: value,
                        },
                      }));
                    }}
                    radius="lg"
                  />

                  <TextInput
                    label="Data fine"
                    type="date"
                    value={promo.studentPromo.endsAt || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.currentTarget.value;

                      setPromo((p) => ({
                        ...p,
                        studentPromo: {
                          ...p.studentPromo,
                          endsAt: value,
                        },
                      }));
                    }}
                    radius="lg"
                  />
                </Group>

                <Alert
                  color={promo.studentPromo.enabled ? "yellow" : "gray"}
                  variant="light"
                  radius="lg"
                >
                  <Text fw={700}>Anteprima sconto facoltà/corso</Text>
                  <Text size="sm" c="dimmed">
                    {studentPreviewText}
                  </Text>
                </Alert>
              </Box>
            </Card>

            {/* ACTIONS */}
            <Group justify="space-between" wrap="wrap">
              <Box aria-live="polite" role="status" style={{ minHeight: 24 }}>
                {saveState === "saved" && (
                  <Text c="green" fw={700}>
                    Salvato
                  </Text>
                )}

                {saveState === "error" && (
                  <Text c="red" fw={700}>
                    Errore
                  </Text>
                )}
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