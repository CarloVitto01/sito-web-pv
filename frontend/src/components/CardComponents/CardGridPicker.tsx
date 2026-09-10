import React from "react";
import {
  Card,
  Group,
  Image,
  SimpleGrid,
  Text,
  Tooltip,
  UnstyledButton,
  useMantineTheme,
  useMantineColorScheme,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

export type GridOption = {
  title: string; // valore/label (es. "Fronte-retro")
  imageSrc: string;
  disabled?: boolean;
  errorMessage?: string;
};

type Props = {
  title: string;               // es. "Colore:"
  hint?: string;               // es. "Seleziona un’opzione"
  value: string;               // valore selezionato
  onChange: (v: string) => void;
  options: GridOption[];
  cols?: { base: number; md?: number; xl?: number };
};

export default function CardGridPicker({
  title,
  hint = "Seleziona un’opzione",
  value,
  onChange,
  options,
  cols = { base: 2, md: 3, xl: 4 },
}: Props) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  const surfaceBg = isDark ? theme.colors.dark[6] : theme.white;
  const borderBase = isDark ? theme.colors.dark[4] : theme.colors.gray[3];

  const tileBg = isDark ? theme.colors.dark[7] : theme.colors.gray[0];
  const tileBgSelected = isDark ? theme.colors.dark[5] : theme.white;

  const titleColor = isDark ? theme.colors.gray[2] : theme.colors.dark[7];
  const hintColor = isDark ? theme.colors.gray[4] : theme.colors.gray[6];

  return (
    <Card
      withBorder
      radius="lg"
      p="md"
      style={{
        background: surfaceBg,
        borderColor: borderBase,
        boxShadow: theme.shadows.sm,
      }}
    >
      <Group justify="space-between" align="baseline" mb="sm">
        <Text fw={900} tt="uppercase" style={{ letterSpacing: 0.3, fontSize: 13, color: titleColor }}>
          {title}
        </Text>
        <Text size="xs" fw={700} style={{ letterSpacing: 0.2, color: hintColor }}>
          {hint}
        </Text>
      </Group>

      <SimpleGrid cols={cols} spacing="sm" verticalSpacing="sm">
        {options.map((o) => {
          const selected = value === o.title;
          const disabled = !!o.disabled;

          const content = (
            <UnstyledButton
              key={o.title}
              onClick={disabled ? undefined : () => onChange(o.title)}
              aria-pressed={selected}
              aria-disabled={disabled}
              style={{ width: "100%", textAlign: "left", cursor: disabled ? "not-allowed" : "pointer" }}
            >
              <Card
                withBorder
                radius="md"
                p="sm"
                style={{
                  position: "relative",
                  height: 88,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: selected ? tileBgSelected : tileBg,
                  borderColor: selected ? theme.colors.yellow[6] : borderBase,
                  boxShadow: selected ? theme.shadows.md : theme.shadows.xs,
                  opacity: disabled ? 0.55 : 1,
                  transition: "transform 140ms ease, box-shadow 180ms ease, border-color 180ms ease",
                }}
              >
                {/* check elegante in alto a destra */}
                {selected ? (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: theme.white,
                      border: `1px solid ${theme.colors.yellow[6]}`,
                      boxShadow: theme.shadows.xs,
                    }}
                  >
                    <IconCheck size={14} color={theme.colors.yellow[6]} />
                  </div>
                ) : null}

                {/* icona */}
                <div
                  style={{
                    width: 60,
                    height: 40,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1px solid ${borderBase}`,
                    background: isDark ? theme.colors.dark[6] : theme.colors.gray[8],
                  }}
                >
                  <Image src={o.imageSrc} alt={o.title} width={22} height={22} fit="contain" />
                </div>

                {/* label (prima non si vedeva: qui è sempre visibile) */}
                <Text
                  fw={850}
                  size="sm"
                  ta="center"
                  lineClamp={1}
                  style={{
                    width: "100%",
                    paddingInline: 6,
                    color: isDark ? theme.colors.gray[0] : theme.colors.dark[7],
                  }}
                >
                  {o.title}
                </Text>
              </Card>
            </UnstyledButton>
          );

          return disabled ? (
            <Tooltip key={o.title} label={o.errorMessage || "Opzione non disponibile"} withArrow position="top" openDelay={250}>
              {content}
            </Tooltip>
          ) : (
            <React.Fragment key={o.title}>{content}</React.Fragment>
          );
        })}
      </SimpleGrid>
    </Card>
  );
}
