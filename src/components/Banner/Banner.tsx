// src/components/Banner/Banner.tsx
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../backend/firebase";
import { doc, onSnapshot } from "firebase/firestore";

import { Alert, Box, Center, Container, Text } from "@mantine/core";
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

  // Palette (pulita + professionale, coerente con PV)
  const tone = useMemo(() => {
    if (variant === "christmas") {
      return {
        bg: "rgba(199, 171, 43, 0.14)",
        border: "rgba(199, 171, 43, 0.30)",
        text: "#1b1b1b",
        iconBg: "rgba(199, 171, 43, 0.22)",
        iconColor: ACCENT,
      };
    }
    if (variant === "success") {
      return {
        bg: "rgba(34, 197, 94, 0.12)",
        border: "rgba(34, 197, 94, 0.28)",
        text: "#0f172a",
        iconBg: "rgba(34, 197, 94, 0.16)",
        iconColor: "#16a34a",
      };
    }
    if (variant === "warning") {
      return {
        bg: "rgba(245, 158, 11, 0.14)",
        border: "rgba(245, 158, 11, 0.30)",
        text: "#0f172a",
        iconBg: "rgba(245, 158, 11, 0.18)",
        iconColor: "#d97706",
      };
    }
    if (variant === "error") {
      return {
        bg: "rgba(239, 68, 68, 0.12)",
        border: "rgba(239, 68, 68, 0.28)",
        text: "#0f172a",
        iconBg: "rgba(239, 68, 68, 0.16)",
        iconColor: "#dc2626",
      };
    }
    // info
    return {
      bg: "rgba(59, 130, 246, 0.10)",
      border: "rgba(59, 130, 246, 0.24)",
      text: "#0f172a",
      iconBg: "rgba(59, 130, 246, 0.14)",
      iconColor: "#2563eb",
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
          title={meta.title}
          icon={<Icon size={18} />}
          styles={{
            root: {
              background: tone.bg,
              border: `1px solid ${tone.border}`,
              boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
            },
            icon: {
              background: tone.iconBg,
              color: tone.iconColor,
              borderRadius: 999,
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
            title: {
              fontWeight: 900,
              letterSpacing: 0.2,
              color: tone.text,
            },
            message: {
              color: tone.text,
              opacity: 0.95,
              fontWeight: 600,
              lineHeight: 1.35,
            },
          }}
        >
          <Center>
            <Text ta="center">{text}</Text>
          </Center>
        </Alert>
      </Container>
    </Box>
  );
};

export default React.memo(Banner);
