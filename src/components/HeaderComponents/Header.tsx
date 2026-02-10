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

type NavItem = { path: string; label: string; icon?: React.ReactNode };

const HEADER_H = 72;

const Header: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [accessiblePages, setAccessiblePages] = useState<string[]>([]);

  const location = useLocation();
  const navigate = useNavigate();

  const isMobile = useMediaQuery("(max-width: 768px)");
  const [opened, { close, toggle }] = useDisclosure(false);

  // ===== Auth + accessi dalle collezioni =====
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setDisplayName("");
        setAccessiblePages([]);
        return;
      }

      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setDisplayName("");
        setAccessiblePages([]);
        return;
      }

      const data = userSnap.data();
      setDisplayName(data.displayName || "");

      const ruolo = data.ruolo || "PublicUser";
      const accessSnap = await getDoc(doc(db, "ruoliPagineAccesso", ruolo));
      const accessData = accessSnap.data();
      setAccessiblePages(accessData?.accessoPagine || []);
    });

    return () => unsubscribe();
  }, []);

  // chiudi drawer cambio route
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

  // pagine pubbliche (mettici quelle reali del sito PV)
  const linkPubblici: NavItem[] = useMemo(
    () => [
      { path: "/", label: "Home" },
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

  const NavButton = ({ item }: { item: NavItem }) => (
    <UnstyledButton
      onClick={() => go(item.path)}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: isActive(item.path)
          ? "1px solid var(--mantine-color-default-border)"
          : "1px solid transparent",
        background: isActive(item.path) ? "var(--mantine-color-default)" : "transparent",
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Text fw={800}>{item.label}</Text>
        <IconChevronRight size={16} />
      </Group>
    </UnstyledButton>
  );

  const DesktopLink = ({ item }: { item: NavItem }) => (
    <Button
      variant={isActive(item.path) ? "filled" : "subtle"}
      color={isActive(item.path) ? "yellow" : "gray"}
      onClick={() => go(item.path)}
      radius="xl"
      styles={{ label: { fontWeight: 800 } }}
    >
      {item.label}
    </Button>
  );

  // ====== HEADER UI ======
  const NormalHeader = () => (
    <Box
      style={{
        height: HEADER_H,
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
      }}
    >
      <Box />

      <Box style={{ justifySelf: "center" }}>
        <Link to="/" aria-label="Photo & Vision — Home" style={{ display: "inline-flex" }}>
          <Image src={logo} alt="PV" h={isMobile ? 40 : 44} fit="contain" />
        </Link>
      </Box>

      <Group gap={8} wrap="nowrap" style={{ justifySelf: "end" }}>
        {!user ? (
          <>
            {!isMobile && (
              <Button variant="subtle" color="gray" radius="xl" onClick={() => navigate("/register")}>
                Registrati
              </Button>
            )}
            <Button variant="filled" color="yellow" radius="xl" onClick={() => navigate("/login")}>
              Login
            </Button>
          </>
        ) : (
          <Tooltip label={displayName || "Account"} withArrow>
            <Button
              variant="filled"
              color="yellow"
              radius="xl"
              onClick={onLogout}
              leftSection={<IconLogout size={16} />}
              styles={{ label: { fontWeight: 800 } }}
            >
              {isMobile ? "" : "Logout"}
            </Button>
          </Tooltip>
        )}
      </Group>
    </Box>
  );

  const GestionaleHeader = () => (
    <Group h={HEADER_H} justify="space-between" wrap="nowrap">
      {/* LEFT */}
      <Group gap={10} wrap="nowrap">
        {isMobile ? (
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="xl"
            onClick={toggle}
            aria-label="Apri menu gestionale"
          >
            <IconMenu2 size={20} />
          </ActionIcon>
        ) : (
          <Link to="/" aria-label="Photo & Vision — Home" style={{ display: "inline-flex" }}>
            <Image src={logo} alt="PV" h={44} fit="contain" />
          </Link>
        )}

        {!isMobile && (
          <Group gap={8} visibleFrom="sm">
            {linkPubblici
              .filter((l) => l.path !== "/")
              .map((it) => (
                <DesktopLink key={it.path} item={it} />
              ))}

            <Divider orientation="vertical" />
            <Badge variant="light" color="yellow">
              Gestionale
            </Badge>

            {allowedGestionale.slice(0, 5).map((it) => (
              <DesktopLink key={it.path} item={it} />
            ))}

            {allowedGestionale.length > 5 && (
              <Menu position="bottom-start" withinPortal shadow="md">
                <Menu.Target>
                  <Button variant="subtle" color="gray" radius="xl">
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
                color="yellow"
                radius="xl"
                leftSection={<IconUser size={16} />}
                styles={{ label: { fontWeight: 800 } }}
              >
                {isMobile ? "Account" : displayName || "Account"}
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
          <Group gap={8} wrap="nowrap" ml="auto">
            {!isMobile && (
              <Button variant="subtle" color="gray" radius="xl" onClick={() => go("/register")}>
                Registrati
              </Button>
            )}
            <Button variant="filled" color="yellow" radius="xl" onClick={() => go("/login")}>
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
          background: "rgba(0,0,0,.92)",
          borderBottom: "1px solid rgba(255,255,255,.08)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Container size="xl" h={HEADER_H}>
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
        >
          <Group justify="space-between" mb="sm">
            <Text fw={900}>Area Gestionale</Text>
            <ActionIcon variant="subtle" onClick={close} radius="xl" aria-label="Chiudi">
              <IconX size={18} />
            </ActionIcon>
          </Group>

          <Divider my="md" />

          <ScrollArea h="calc(100dvh - 140px)" type="auto">
            <Stack gap={8}>
              {allowedGestionale.map((it) => (
                <NavButton key={it.path} item={it} />
              ))}
            </Stack>
          </ScrollArea>
        </Drawer>
      )}
    </>
  );
};

export default React.memo(Header);
