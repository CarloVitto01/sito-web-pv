import React from "react";
import { RangePagesData } from "../../types/RangePagesData";
import {
  Alert,
  Badge,
  Card,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

type Props = {
  onSendData: (value: RangePagesData) => void;
  maxValue: number;
  disable: boolean;
  errorMessage: string;
};

type Mode = "ALL" | "CUSTOM";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const IntervalloPagine: React.FC<Props> = ({ onSendData, maxValue, disable, errorMessage }) => {
  const theme = useMantineTheme();

  const max = React.useMemo(() => (maxValue && maxValue >= 1 ? maxValue : 1), [maxValue]);

  const [mode, setMode] = React.useState<Mode>("ALL");
  const [from, setFrom] = React.useState<number>(1);
  const [to, setTo] = React.useState<number>(max);

  // riallinea quando cambia max (es. carico un PDF diverso)
  React.useEffect(() => {
    if (mode === "ALL") {
      setFrom(1);
      setTo(max);
      onSendData({ from: 1, to: max, all: true, isValid: true });
      return;
    }

    // CUSTOM: clamp
    setFrom((prev) => clamp(prev || 1, 1, max));
    setTo((prev) => clamp(prev || 1, 1, max));
  }, [max]); // eslint-disable-line react-hooks/exhaustive-deps

  // quando cambia mode
  React.useEffect(() => {
    if (mode === "ALL") {
      setFrom(1);
      setTo(max);
      onSendData({ from: 1, to: max, all: true, isValid: true });
      return;
    }

    // CUSTOM: inizializza sensato se venivo da ALL
    setFrom((prev) => clamp(prev || 1, 1, max));
    setTo((prev) => clamp(prev || 1, 1, max));
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // invio dati in modalità CUSTOM (validazione + normalizzazione)
  React.useEffect(() => {
    if (mode !== "CUSTOM") return;

    const f0 = Number.isFinite(from) ? from : 1;
    const t0 = Number.isFinite(to) ? to : 1;

    const f = clamp(f0, 1, max);
    const t = clamp(t0, 1, max);

    const normalizedFrom = Math.min(f, t);
    const normalizedTo = Math.max(f, t);

    const isValid =
      normalizedFrom >= 1 && normalizedTo >= 1 && normalizedFrom <= normalizedTo && normalizedTo <= max;

    onSendData({
      from: normalizedFrom,
      to: normalizedTo,
      all: false,
      isValid,
    });
  }, [mode, from, to, max, onSendData]);

  const surfaceBg = theme.white;
  const borderBase = theme.colors.gray[3];

  return (
    <Card
      withBorder
      radius="lg"
      p="md"
      style={{
        background: surfaceBg,
        borderColor: borderBase,
        boxShadow: theme.shadows.sm,
        opacity: disable ? 0.6 : 1,
      }}
    >
      <Group justify="space-between" align="baseline" mb="sm">
        <Text fw={900} style={{ letterSpacing: 0.2 }}>
          Intervallo pagine
        </Text>

        <Badge variant="light" color="gray">
          max {max}
        </Badge>
      </Group>

      {disable ? (
        <Alert icon={<IconAlertTriangle size={16} />} color="gray" variant="light">
          {errorMessage}
        </Alert>
      ) : null}

      <Stack gap="sm" mt={disable ? "sm" : 0} style={{ pointerEvents: disable ? "none" : "auto" }}>
        <SegmentedControl
          fullWidth
          radius="md"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          data={[
            { value: "ALL", label: "Tutte" },
            { value: "CUSTOM", label: "Personalizzato" },
          ]}
          styles={{
            root: {
              background: theme.colors.gray[0],
              border: `1px solid ${theme.colors.gray[3]}`,
            },
            indicator: {
              background: theme.white,
              border: `1px solid ${theme.colors.yellow[6]}`,
              boxShadow: theme.shadows.xs,
            },
            label: { paddingTop: 10, paddingBottom: 10, fontWeight: 800 },
          }}
        />

        {mode === "CUSTOM" ? (
          <Group grow gap="sm">
            <NumberInput
              label="Da"
              value={from}
              onChange={(v) => {
                const next = typeof v === "number" ? v : 1;
                const clamped = clamp(next, 1, max);
                setFrom(clamped);
                // se supero "to", sposto anche to
                setTo((prevTo) => {
                  const pt = clamp(typeof prevTo === "number" ? prevTo : 1, 1, max);
                  return clamped > pt ? clamped : pt;
                });
              }}
              min={1}
              max={max}
              allowDecimal={false}
              clampBehavior="strict"
            />

            <NumberInput
              label="A"
              value={to}
              onChange={(v) => {
                const next = typeof v === "number" ? v : 1;
                const clamped = clamp(next, 1, max);
                setTo(clamped);
                // se scendo sotto "from", sposto anche from
                setFrom((prevFrom) => {
                  const pf = clamp(typeof prevFrom === "number" ? prevFrom : 1, 1, max);
                  return clamped < pf ? clamped : pf;
                });
              }}
              min={1}
              max={max}
              allowDecimal={false}
              clampBehavior="strict"
            />
          </Group>
        ) : null}
      </Stack>
    </Card>
  );
};

export default React.memo(IntervalloPagine);
