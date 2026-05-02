import React, { startTransition, useEffect, useMemo, useRef, useState } from "react";
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
import { IconMenu2, IconX, IconChevronRight, IconUser, IconLogout, IconSettings } from "@tabler/icons-react";

import logo from "../../assets/images/logo orizzontale.png";
import { auth, db } from "../../backend/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type NavItem = { path: string; label: string };

const HEADER_H = 76;

// ✅ cache permessi/ruolo per evitare “flash/scatti” (caricamento più pulito)
const ACCESS_CACHE_KEY = "pv_gestionale_access_v1";
const ACCESS_TTL_MS = 5 * 60 * 1000; // 5 minuti

type AccessCache = {
  uid: string;
  displayName: string;
  pages: string[];
  ts: number;
};

/** ✅ Loader header “professionale”: shimmer bar + 2 dot (sinistra/destra), niente cerchi enormi */

const Header: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [accessiblePages, setAccessiblePages] = useState<string[]>([]);

  // ✅ stato loading accessi (per header/drawer “morbidi”)
  const [accessLoading, setAccessLoading] = useState(true);

  // ✅ evita race conditions se cambiano utente/refresh
  const reqIdRef = useRef(0);

  const location = useLocation();
  const navigate = useNavigate();

  const isMobile = useMediaQuery("(max-width: 768px)");
  const [opened, { close, toggle }] = useDisclosure(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const reqId = ++reqIdRef.current;

      setUser(currentUser);
      setAccessLoading(true);

      // ✅ reset base
      if (!currentUser) {
        setDisplayName("");
        setAccessiblePages([]);
        setAccessLoading(false);
        try {
          sessionStorage.removeItem(ACCESS_CACHE_KEY);
        } catch { }
        return;
      }

      // ✅ prova cache (istantaneo, niente scatti)
      let usedCache = false;
      try {
        const raw = sessionStorage.getItem(ACCESS_CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as AccessCache;
          const fresh = Date.now() - (cached.ts || 0) < ACCESS_TTL_MS;
          if (cached.uid === currentUser.uid && fresh) {
            usedCache = true;
            setDisplayName(cached.displayName || "");
            setAccessiblePages(Array.isArray(cached.pages) ? cached.pages : []);
            setAccessLoading(false);
          }
        }
      } catch { }

      try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (reqIdRef.current !== reqId) return;

        if (!userSnap.exists()) {
          setDisplayName("");
          setAccessiblePages([]);
          setAccessLoading(false);
          return;
        }

        const data: any = userSnap.data();
        setDisplayName(data.displayName || "");

        const ruolo = data.ruolo || "PublicUser";
        const accessSnap = await getDoc(doc(db, "ruoliPagineAccesso", ruolo));
        if (reqIdRef.current !== reqId) return;

        const accessData: any = accessSnap.exists() ? accessSnap.data() : null;
        const pages = accessData?.accessoPagine || [];
        setAccessiblePages(pages);

        // ✅ aggiorna cache
        try {
          const payload: AccessCache = {
            uid: currentUser.uid,
            displayName: data.displayName || "",
            pages: Array.isArray(pages) ? pages : [],
            ts: Date.now(),
          };
          sessionStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify(payload));
        } catch { }
      } finally {
        if (reqIdRef.current !== reqId) return;
        const delay = usedCache ? 0 : 80;
        setTimeout(() => {
          if (reqIdRef.current !== reqId) return;
          setAccessLoading(false);
        }, delay);
      }
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

  // ✅ evita “saltelli” mentre carica
  const hasGestionaleAccess = !accessLoading && allowedGestionale.length > 0;

  // ✅ navigazione “non bloccante”
  const go = (to: string) => {
    close();
    startTransition(() => {
      navigate(to);
    });
  };

  const onLogout = async () => {
    await signOut(auth);
    setUser(null);
    setDisplayName("");
    setAccessiblePages([]);
    try {
      sessionStorage.removeItem(ACCESS_CACHE_KEY);
    } catch { }
    navigate("/");
  };

  const DrawerItem = ({ item }: { item: NavItem }) => (
    <UnstyledButton
      onClick={() => go(item.path)}
      style={{
        width: "100%",
        padding: "12px 12px",
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,.06)",
        background: "#fff",
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Text fw={900} style={{ color: "#0b0f16" }}>
          {item.label}
        </Text>
        <IconChevronRight size={16} color="rgba(0,0,0,.5)" />
      </Group>
    </UnstyledButton>
  );

  // ✅ layout header: burger sx / logo perfettamente centrato / account dx
  const HeaderShell = ({
    left,
    center,
    right,
  }: {
    left: React.ReactNode;
    center: React.ReactNode;
    right: React.ReactNode;
  }) => (
    <Box style={{ position: "relative", height: HEADER_H }}>
      <Box
        style={{
          position: "absolute",
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {left}
      </Box>

      <Box
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "auto",
        }}
      >
        {center}
      </Box>

      <Box
        style={{
          position: "absolute",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 10,
        }}
      >
        {right}
      </Box>
    </Box>
  );

  const AccountMenu = () =>
    user ? (
      <Menu position="bottom-end" withinPortal shadow="md">
        <Menu.Target>
          <Tooltip label={displayName || "Account"} withArrow>
            {isMobile ? (
              <ActionIcon
                variant="light"
                radius="xl"
                size="lg"
                aria-label="Account"
                style={{
                  background: "rgba(255,255,255,.06)",
                  border: "1px solid rgba(255,255,255,.10)",
                  color: "#fff",
                }}
              >
                <IconUser size={18} />
              </ActionIcon>
            ) : (
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
            )}
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
    );

  const BurgerBtn = (
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
  );

  const NormalHeader = () => (
    <HeaderShell
      left={<Box style={{ width: 1 }} />}
      center={
        <Link to="/" aria-label="Photo & Vision — Home" style={{ display: "inline-flex" }}>
          <Image src={logo} alt="PV" h={isMobile ? 40 : 52} fit="contain" />
        </Link>
      }
      right={<AccountMenu />}
    />
  );

  const GestionaleHeader = () => (
    <HeaderShell
      left={
        <Group gap={10} wrap="nowrap">
          {BurgerBtn}
          {!isMobile && (
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
          )}
        </Group>
      }
      center={
        <Link to="/" aria-label="Photo & Vision — Home" style={{ display: "inline-flex" }}>
          <Image src={logo} alt="PV" h={isMobile ? 40 : 52} fit="contain" />
        </Link>
      }
      right={<AccountMenu />}
    />
  );

  return (
    <>
      <Box
        style={{
          position: "sticky",
          top: 0,
          zIndex: 200,
          height: HEADER_H,
          background: "linear-gradient(180deg, rgba(6,10,16,.92) 0%, rgba(6,10,16,.78) 100%)",
          borderBottom: "1px solid rgba(255,255,255,.08)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          transform: "translateZ(0)",
        }}
      >
        <Box
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: "radial-gradient(900px 160px at 50% 0%, rgba(209,171,99,.18), transparent 60%)",
            opacity: 0.9,
          }}
        />

        <Container fluid px={0} h={HEADER_H} style={{ position: "relative", width: "100%" }}>
          <Box px="xl" style={{ height: "100%" }}>
            {hasGestionaleAccess ? <GestionaleHeader /> : <NormalHeader />}
          </Box>
        </Container>
      </Box>

      {/* Drawer gestionale (mobile + desktop) */}
      {hasGestionaleAccess && (
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
              {accessLoading ? (
                // ✅ evita i “palloni”: shimmer items sottili (no skeleton enormi)
                <>
                  <Box
                    style={{
                      height: 48,
                      borderRadius: 14,
                      border: "1px solid rgba(0,0,0,.06)",
                      background:
                        "linear-gradient(90deg, rgba(0,0,0,.04) 0%, rgba(0,0,0,.08) 50%, rgba(0,0,0,.04) 100%)",
                      backgroundSize: "200% 100%",
                      animation: "pvShimmer 1.05s ease-in-out infinite",
                    }}
                  />
                  <Box
                    style={{
                      height: 48,
                      borderRadius: 14,
                      border: "1px solid rgba(0,0,0,.06)",
                      background:
                        "linear-gradient(90deg, rgba(0,0,0,.04) 0%, rgba(0,0,0,.08) 50%, rgba(0,0,0,.04) 100%)",
                      backgroundSize: "200% 100%",
                      animation: "pvShimmer 1.05s ease-in-out infinite",
                    }}
                  />
                  <Box
                    style={{
                      height: 48,
                      borderRadius: 14,
                      border: "1px solid rgba(0,0,0,.06)",
                      background:
                        "linear-gradient(90deg, rgba(0,0,0,.04) 0%, rgba(0,0,0,.08) 50%, rgba(0,0,0,.04) 100%)",
                      backgroundSize: "200% 100%",
                      animation: "pvShimmer 1.05s ease-in-out infinite",
                    }}
                  />
                </>
              ) : (
                allowedGestionale.map((it) => <DrawerItem key={it.path} item={it} />)
              )}
            </Stack>
          </ScrollArea>
        </Drawer>
      )}
    </>
  );
};

export default React.memo(Header);