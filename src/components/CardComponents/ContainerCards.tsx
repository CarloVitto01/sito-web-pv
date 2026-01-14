// components/CardComponents/ContainerCards.tsx
import React from "react";
import {
  Badge,
  Card,
  Center,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";
import { IconCheck, IconLock } from "@tabler/icons-react";

type CardItem = {
  title: string;
  imageSrc: string;
  disabled?: boolean;
  errorMessage?: string;
};

type Props = {
  title: string;
  components: CardItem[];
  defaultValue: string;
  onSendData: (value: string) => void;
  hint?: string;
};

export default function ContainerCards({
  title,
  components,
  defaultValue,
  onSendData,
  hint = "Seleziona un’opzione",
}: Props) {
  const theme = useMantineTheme();
  const [selected, setSelected] = React.useState(defaultValue);

  React.useEffect(() => {
    setSelected(defaultValue);
  }, [defaultValue]);

  const handleClick = (c: CardItem) => {
    if (c.disabled) return;
    setSelected(c.title);
    onSendData(c.title);
  };

  return (
    <Card
      withBorder
      radius="lg"
      p="md"
      style={{
        background: theme.white,
        borderColor: theme.colors.gray[3],
        boxShadow: theme.shadows.sm,
      }}
    >
      <Group justify="space-between" align="baseline" mb="sm">
        <Text
          fw={900}
          tt="uppercase"
          style={{
            letterSpacing: 0.3,
            fontSize: 13,
            color: theme.colors.dark[7],
          }}
        >
          {title}
        </Text>

        <Text size="xs" fw={700} style={{ letterSpacing: 0.2, color: theme.colors.gray[6] }}>
          {hint}
        </Text>
      </Group>

      <SimpleGrid cols={{ base: 2, md: 2, xl: 3 }} spacing="sm" verticalSpacing="sm">
        {components.map((c) => {
          const isSelected = selected === c.title;
          const isDisabled = !!c.disabled;
          const tooltipLabel = c.errorMessage || "Opzione non disponibile";

          const cardBg = isSelected ? theme.colors.gray[1] : theme.colors.gray[0];
          const cardBorder = isSelected ? theme.colors.yellow[6] : theme.colors.gray[3];

          const content = (
            <UnstyledButton
              key={c.title}
              onClick={() => handleClick(c)}
              aria-pressed={isSelected}
              aria-disabled={isDisabled}
              style={{ width: "100%", cursor: isDisabled ? "not-allowed" : "pointer" }}
            >
              <Card
                withBorder
                radius="md"
                p="sm"
                style={{
                  background: cardBg,
                  borderColor: cardBorder,
                  boxShadow: isSelected ? theme.shadows.md : theme.shadows.xs,
                  opacity: isDisabled ? 0.55 : 1,
                  transition: "transform 140ms ease, box-shadow 180ms ease, border-color 180ms ease",
                  height: 86,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (isDisabled) return;
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  if (isDisabled) return;
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0px)";
                }}
              >
                {/* icona */}
                <Center
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: theme.white,
                    border: `1px solid ${theme.colors.gray[3]}`,
                    overflow: "hidden",
                  }}
                >
                  <Image src={c.imageSrc} alt={c.title} fit="contain" width={24} height={24} />
                </Center>

                {/* ✅ TITOLO (sempre visibile) */}
                <Text
                  fw={850}
                  size="sm"
                  c={theme.colors.dark[7]}
                  ta="center"
                  style={{ maxWidth: "100%" }}
                  lineClamp={1}
                >
                  {c.title}
                </Text>

                {/* badge stato (in alto a destra) */}
                {isDisabled ? (
                  <Badge
                    leftSection={<IconLock size={14} />}
                    variant="light"
                    color="gray"
                    radius="xl"
                    style={{ position: "absolute", top: 8, right: 8 }}
                  >
                    Off
                  </Badge>
                ) : isSelected ? (
                  <Badge
                    leftSection={<IconCheck size={14} />}
                    variant="light"
                    color="yellow"
                    radius="xl"
                    style={{ position: "absolute", top: 8, right: 8 }}
                  >
                    OK
                  </Badge>
                ) : null}
              </Card>
            </UnstyledButton>
          );

          return isDisabled ? (
            <Tooltip key={c.title} label={tooltipLabel} withArrow position="top" openDelay={250}>
              {content}
            </Tooltip>
          ) : (
            <React.Fragment key={c.title}>{content}</React.Fragment>
          );
        })}
      </SimpleGrid>
    </Card>
  );
}
