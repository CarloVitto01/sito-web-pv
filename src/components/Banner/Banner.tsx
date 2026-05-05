// src/components/Banner/Banner.tsx
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../backend/firebase";
import { doc, onSnapshot } from "firebase/firestore";

import { Alert, Box, Center, Container, Group, Stack, Text } from "@mantine/core";
import {
  IconInfoCircle,
  IconAlertTriangle,
  IconCircleCheck,
  IconX,
  IconSnowflake,
} from "@tabler/icons-react";

type Variant = "info" | "warning" | "success" | "error" | "christmas";

type BannerData = {
  enabled?: boolean;
  text?: string;
  variant?: Variant;
};

const ACCENT = "#c7ab2b";

const Banner: React.FC = () => {
  const [data, setData] = useState<BannerData | null>(null);

  useEffect(() => {
    const ref = doc(db, "config", "homeBanner");
    const unsub = onSnapshot(ref, (snap) => {
      setData((snap.data() as BannerData) || null);
    });
    return () => unsub();
  }, []);

  const variant: Variant = data?.variant ?? "info";
  const text = data?.text?.trim();

  const meta = useMemo(() => {
    switch (variant) {
      case "success":
        return { icon: IconCircleCheck, title: "Aggiornamento" };
      case "warning":
        return { icon: IconAlertTriangle, title: "Avviso" };
      case "error":
        return { icon: IconX, title: "Attenzione" };
      case "christmas":
        return { icon: IconSnowflake, title: "Novità" };
      case "info":
      default:
        return { icon: IconInfoCircle, title: "Info" };
    }
  }, [variant]);

  // Palette dark-friendly, coerente con PV e leggibile su background scuro
  const tone = useMemo(() => {
    if (variant === "christmas") {
      return {
        bg: "rgba(199, 171, 43, 0.12)",
        border: "rgba(199, 171, 43, 0.45)",
        text: "#f8f8f8",
        iconBg: "rgba(199, 171, 43, 0.18)",
        iconColor: ACCENT,
      };
    }
    if (variant === "success") {
      return {
        bg: "rgba(34, 197, 94, 0.12)",
        border: "rgba(34, 197, 94, 0.45)",
        text: "#f8f8f8",
        iconBg: "rgba(34, 197, 94, 0.18)",
        iconColor: "#22c55e",
      };
    }
    if (variant === "warning") {
      return {
        bg: "rgba(245, 158, 11, 0.13)",
        border: "rgba(245, 158, 11, 0.50)",
        text: "#f8f8f8",
        iconBg: "rgba(245, 158, 11, 0.18)",
        iconColor: "#f59e0b",
      };
    }
    if (variant === "error") {
      return {
        bg: "rgba(239, 68, 68, 0.12)",
        border: "rgba(239, 68, 68, 0.45)",
        text: "#f8f8f8",
        iconBg: "rgba(239, 68, 68, 0.18)",
        iconColor: "#ef4444",
      };
    }
    // info
    return {
      bg: "rgba(59, 130, 246, 0.12)",
      border: "rgba(59, 130, 246, 0.45)",
      text: "#f8f8f8",
      iconBg: "rgba(59, 130, 246, 0.18)",
      iconColor: "#3b82f6",
    };
  }, [variant]);

  if (!data?.enabled || !text) return null;

  const Icon = meta.icon;

  return (
    <Box
      role="status"
      aria-live="polite"
      py={10}
      style={{
        position: "relative",
        zIndex: 5,
      }}
    >
      <Container size="xl">
        <Alert
          radius="xl"
          styles={{
            root: {
              background: tone.bg,
              border: `1px solid ${tone.border}`,
              boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
              backdropFilter: "blur(10px)",
              padding: "16px 18px",
            },
            body: {
              width: "100%",
            },
            message: {
              width: "100%",
            },
          }}
        >
          <Stack gap={8} align="center" ta="center">
            <Group gap={10} justify="center" align="center">
              <Center
                style={{
                  background: tone.iconBg,
                  color: tone.iconColor,
                  borderRadius: 999,
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </Center>

              <Text
                fw={900}
                c={tone.text}
                style={{
                  letterSpacing: 0.2,
                }}
              >
                {meta.title}
              </Text>
            </Group>

            <Text
              ta="center"
              c={tone.text}
              fw={600}
              lh={1.45}
              style={{
                opacity: 0.95,
                maxWidth: 520,
              }}
            >
              {text}
            </Text>
          </Stack>
        </Alert>
      </Container>
    </Box>
  );
};

export default React.memo(Banner);