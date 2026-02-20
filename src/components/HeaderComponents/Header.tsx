import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Group,
  Image,
  Button,
  Drawer,
  Stack,
  Text,
  Divider,
  ScrollArea,
  UnstyledButton,
  Container,
  ActionIcon,
  Menu,
  Badge,
  Tooltip,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconMenu2,
  IconX,
  IconChevronRight,
  IconUser,
  IconLogout,
  IconSettings,
} from "@tabler/icons-react";

import logo from "../../assets/images/Firma_Bianca_oro_PV.png";
import { auth, db } from "../../backend/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type NavItem = { path: string; label: string };

const HEADER_H = 76;
const ACCENT = "#d1ab63";

const Header: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [accessiblePages, setAccessiblePages] = useState<string[]>([]);

  const location = useLocation();
  const navigate = useNavigate();

  const isMobile = useMediaQuery("(max-width: 768px)");
  const [opened, { close, toggle }] = useDisclosure(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setDisplayName("");
        setAccessiblePages([]);
        return;
      }

      const userSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (!userSnap.exists()) {
        setDisplayName("");
        setAccessiblePages([]);
        return;
      }

      const data: any = userSnap.data();
      setDisplayName(data.displayName || "");

      const ruolo = data.ruolo || "PublicUser";
      const accessSnap = await getDoc(doc(db, "ruoliPagineAccesso", ruolo));
      const accessData: any = accessSnap.data();
      setAccessiblePages(accessData?.accessoPagine || []);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const linkAccessibili: NavItem[] = useMemo(
    () => [
      { path: "/gestionaleA4", label: "A4" },
      { path: "/gestionaleA3", label: "A3" },
      { path: "/qr-generator", label: "QR" },
      { path: "/utentiGestionale", label: "Utenti" },
      { path: "/gestione-accessi", label: "Accessi Ruoli" },
      { path: "/storicoDati", label: "Storico Dati" },
      { path: "/tasse", label: "Tasse" },
      { path: "/banner", label: "Banner" },
      { path: "/consegna", label: "Consegna" },
      { path: "/sconti", label: "Sconti" },
      { path: "/plastiche", label: "Plastiche" },
    ],
    []
  );

  const allowedGestionale = useMemo(
    () =>
      linkAccessibili
        .filter(({ path }) => accessiblePages.includes(path.replace("/", "")))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [accessiblePages, linkAccessibili]
  );

  const hasGestionaleAccess = allowedGestionale.length > 0;
  const isActive = (path: string) => location.pathname === path;

  const go = (to: string) => {
    close();
    navigate(to);
  };

  const onLogout = async () => {
    await signOut(auth);
    setUser(null);
    setDisplayName("");
    navigate("/");
  };

  const DesktopPill = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path);
    return (
      <Button
        variant={active ? "filled" : "subtle"}
        color={active ? "yellow" : "gray"}
        radius="xl"
        onClick={() => go(item.path)}
        styles={{
          root: {
            height: 38,
            paddingInline: 14,
            background: active ? "rgba(209,171,99,.18)" : "transparent",
            border: active ? `1px solid rgba(209,171,99,.35)` : "1px solid transparent",
          },
          label: { fontWeight: 900, letterSpacing: 0.2 },
        }}
      >
        {item.label}
      </Button>
    );
  };

  const DrawerItem = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path);
    return (
      <UnstyledButton
        onClick={() => go(item.path)}
        style={{
          width: "100%",
          padding: "12px 12px",
          borderRadius: 14,
          border: active ? `1px solid rgba(209,171,99,.35)` : "1px solid rgba(0,0,0,.06)",
          background: active ? "rgba(209,171,99,.10)" : "#fff",
          boxShadow: active ? "0 10px 24px rgba(0,0,0,.08)" : "none",
        }}
      >
        <Group justify="space-between" wrap="nowrap">
          <Text fw={900} style={{ color: "#0b0f16" }}>
            {item.label}
          </Text>
          <IconChevronRight size={16} color={active ? ACCENT : "rgba(0,0,0,.5)"} />
        </Group>
      </UnstyledButton>
    );
  };

  const NormalHeader = () => (
    <Group h={HEADER_H} justify="space-between" wrap="nowrap">
      {/* LEFT (spacer) */}
      <Box w={120} visibleFrom="sm" />

      {/* CENTER LOGO */}
      <Box style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <Link to="/" aria-label="Photo & Vision — Home" style={{ display: "inline-flex" }}>
          <Image src={logo} alt="PV" h={isMobile ? 38 : 44} fit="contain" />
        </Link>
      </Box>

      {/* RIGHT */}
      <Group gap={10} wrap="nowrap" style={{ justifyContent: "flex-end" }}>
        {!user ? (
          <>
            {!isMobile && (
              <Button
                variant="subtle"
                color="gray"
                radius="xl"
                onClick={() => navigate("/register")}
                styles={{ label: { fontWeight: 900 } }}
              >
                Registrati
              </Button>
            )}
            <Button
              variant="filled"
              color="yellow"
              radius="xl"
              onClick={() => navigate("/login")}
              styles={{
                root: { background: "rgba(209,171,99,.18)", border: "1px solid rgba(209,171,99,.35)" },
                label: { fontWeight: 900 },
              }}
            >
              Login
            </Button>
          </>
        ) : (
          <Menu position="bottom-end" withinPortal shadow="md">
            <Menu.Target>
              <Tooltip label={displayName || "Account"} withArrow>
                <Button
                  variant="light"
                  color="yellow"
                  radius="xl"
                  leftSection={<IconUser size={16} />}
                  styles={{
                    root: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.10)" },
                    label: { fontWeight: 900 },
                  }}
                >
                  {displayName}
                </Button>
              </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconSettings size={16} />} onClick={() => go("/account")}>
                Il mio account
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={onLogout}>
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
    </Group>
  );

  const GestionaleHeader = () => (
    <Group h={HEADER_H} justify="space-between" wrap="nowrap">
      {/* LEFT */}
      <Group gap={10} wrap="nowrap">
        {isMobile ? (
          <ActionIcon
            variant="light"
            radius="xl"
            size="lg"
            onClick={toggle}
            aria-label="Apri menu gestionale"
            style={{
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.10)",
              color: "#fff",
            }}
          >
            <IconMenu2 size={20} />
          </ActionIcon>
        ) : (
          <Link to="/" aria-label="Photo & Vision — Home" style={{ display: "inline-flex" }}>
            <Image src={logo} alt="PV" h={44} fit="contain" />
          </Link>
        )}

        {!isMobile && (
          <Group gap={10} wrap="nowrap">
            <Badge
              variant="light"
              color="yellow"
              styles={{
                root: {
                  background: "rgba(209,171,99,.14)",
                  border: "1px solid rgba(209,171,99,.28)",
                  color: "#fff",
                  fontWeight: 900,
                },
              }}
            >
              Gestionale
            </Badge>

            {allowedGestionale.slice(0, 5).map((it) => (
              <DesktopPill key={it.path} item={it} />
            ))}

            {allowedGestionale.length > 5 && (
              <Menu position="bottom-start" withinPortal shadow="md">
                <Menu.Target>
                  <Button
                    variant="subtle"
                    color="gray"
                    radius="xl"
                    styles={{
                      root: { height: 38 },
                      label: { fontWeight: 900 },
                    }}
                  >
                    Altro
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {allowedGestionale.slice(5).map((it) => (
                    <Menu.Item key={it.path} onClick={() => go(it.path)}>
                      {it.label}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        )}
      </Group>

      {/* CENTER (mobile logo) */}
      {isMobile && (
        <Link to="/" aria-label="Photo & Vision — Home" style={{ display: "inline-flex" }}>
          <Image src={logo} alt="PV" h={40} fit="contain" />
        </Link>
      )}

      {/* RIGHT */}
      <Group gap={10} wrap="nowrap">
        {user ? (
          <Menu position="bottom-end" withinPortal shadow="md">
            <Menu.Target>
              <Button
                variant="light"
                radius="xl"
                leftSection={<IconUser size={16} />}
                styles={{
                  root: {
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.10)",
                    color: "#fff",
                    height: 38,
                  },
                  label: { fontWeight: 900 },
                }}
              >
                {displayName}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconSettings size={16} />} onClick={() => go("/account")}>
                Il mio account
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={onLogout}>
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        ) : (
          <Group gap={8} wrap="nowrap">
            {!isMobile && (
              <Button variant="subtle" color="gray" radius="xl" onClick={() => go("/register")}>
                Registrati
              </Button>
            )}
            <Button
              variant="filled"
              color="yellow"
              radius="xl"
              onClick={() => go("/login")}
              styles={{
                root: { background: "rgba(209,171,99,.18)", border: "1px solid rgba(209,171,99,.35)" },
                label: { fontWeight: 900 },
              }}
            >
              Login
            </Button>
          </Group>
        )}
      </Group>
    </Group>
  );

  return (
    <>
      <Box
        style={{
          position: "sticky",
          top: 0,
          zIndex: 200,
          height: HEADER_H,
          background:
            "linear-gradient(180deg, rgba(6,10,16,.92) 0%, rgba(6,10,16,.78) 100%)",
          borderBottom: "1px solid rgba(255,255,255,.08)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          transform: "translateZ(0)",
        }}
      >
        {/* glow sottile */}
        <Box
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(900px 160px at 50% 0%, rgba(209,171,99,.18), transparent 60%)",
            opacity: 0.9,
          }}
        />

        <Container size="xl" h={HEADER_H} style={{ position: "relative" }}>
          {hasGestionaleAccess ? <GestionaleHeader /> : <NormalHeader />}
        </Container>
      </Box>

      {/* Drawer SOLO per gestionale (mobile) */}
      {isMobile && hasGestionaleAccess && (
        <Drawer
          opened={opened}
          onClose={close}
          position="left"
          size={360}
          withCloseButton={false}
          padding="md"
          radius="lg"
          styles={{
            content: { background: "#f7f7f7" },
            header: { background: "#f7f7f7" },
          }}
        >
          <Group justify="space-between" mb="sm">
            <Stack gap={2}>
              <Text fw={900}>Area Gestionale</Text>
              <Text size="xs" c="dimmed">
                Navigazione rapida
              </Text>
            </Stack>

            <ActionIcon
              variant="light"
              onClick={close}
              radius="xl"
              aria-label="Chiudi"
              style={{ background: "rgba(0,0,0,.06)" }}
            >
              <IconX size={18} />
            </ActionIcon>
          </Group>

          <Divider my="md" />

          <ScrollArea h="calc(100dvh - 150px)" type="auto">
            <Stack gap={10}>
              {allowedGestionale.map((it) => (
                <DrawerItem key={it.path} item={it} />
              ))}
            </Stack>
          </ScrollArea>
        </Drawer>
      )}
    </>
  );
};

export default React.memo(Header);
