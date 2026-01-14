import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import logo from "../../assets/images/Firma_Bianca_oro_PV.png";
import classes from "./Header.module.css";
import { auth, db } from "../../backend/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type NavItem = { path: string; label: string; icon?: string };

const Header: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [accessiblePages, setAccessiblePages] = useState<string[]>([]);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const toggleSideMenu = () => setSideMenuOpen((prev) => !prev);
  const closeSideMenu = () => setSideMenuOpen(false);

  // ===== Auth + accessi dalle collezioni =====
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setDisplayName(data.displayName || "");

          const ruolo = data.ruolo || "PublicUser";
          const accessSnap = await getDoc(doc(db, "ruoliPagineAccesso", ruolo));
          const accessData = accessSnap.data();
          setAccessiblePages(accessData?.accessoPagine || []);
        }
      } else {
        setDisplayName("");
        setAccessiblePages([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // ===== Chiudi menu quando cambi pagina =====
  useEffect(() => {
    setSideMenuOpen(false);
  }, [location.pathname]);

  // ===== Chiudi cliccando fuori dal pannello =====
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!sideMenuOpen) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSideMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sideMenuOpen]);

  // ===== ESC per chiudere =====
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSideMenuOpen(false);
    };
    if (sideMenuOpen) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sideMenuOpen]);

  // ===== Focus trap + scroll lock =====
  useEffect(() => {
    if (sideMenuOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      // sposta il focus sul pulsante chiudi
      setTimeout(() => firstFocusRef.current?.focus(), 0);

      const focusableSelector =
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
      const keyHandler = (e: KeyboardEvent) => {
        if (e.key !== "Tab" || !panelRef.current) return;
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(focusableSelector)
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      };

      document.addEventListener("keydown", keyHandler);
      return () => {
        document.removeEventListener("keydown", keyHandler);
        document.body.style.overflow = "";
        previouslyFocused.current?.focus?.();
      };
    }
  }, [sideMenuOpen]);

  // ===== Dati di navigazione =====
  const servizi: NavItem[] = useMemo(
    () => [
      { path: "/printA4", label: "Stampa in A4", icon: "🖨️" },
      { path: "/printA3", label: "Stampa in A3", icon: "🖨️" },
      { path: "/3d", label: "Stampa in 3D", icon: "🖨️" },
      { path: "/qrgen", label: "Generatore di QR Code", icon: "📱" },
    ],
    []
  );

  const linkAccessibili: NavItem[] = useMemo(
    () => [
      { path: "/gestionaleA4", label: "A4" },
      { path: "/gestionaleA3", label: "A3" },
      { path: "/bobine", label: "Bobine" },
      { path: "/qr-generator", label: "QR" },
      { path: "/utentiGestionale", label: "Utenti" },
      { path: "/gestione-accessi", label: "Accessi Ruoli" },
      { path: "/storicoDati", label: "Storico Dati" },
      { path: "/tasse", label: "Tasse" },
      { path: "/banner", label: "Banner" },
      { path: "/consegna", label: "Consegna" },
      { path: "/sconti", label: "Sconti" },
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

  const isActive = (path: string) => location.pathname === path;

  const go = (to: string) => {
    closeSideMenu();
    navigate(to);
  };

  return (
    <div className={classes.header}>
      {/* Burger */}
      <div className={classes["burger-section"]}>
        <button
          className={classes["burger-icon"]}
          onClick={toggleSideMenu}
          aria-label="Apri menu"
          aria-expanded={sideMenuOpen}
          aria-controls="pv-side-menu"
        >
          <FiMenu />
          <span className={classes["sr-only"]}>Apri menu</span>
        </button>
      </div>

      {/* sinistra vuota per bilanciare il layout */}
      <div className={classes["left-spacer"]} />

      {/* Logo */}
      <div className={classes["logo-section"]}>
        <Link to="/" aria-label="Photo & Vision — Home">
          <img src={logo} alt="PV" className={classes.Logo} />
        </Link>
      </div>


      {/* Login/Logout header-right */}
      <div className={classes["placeholder-section"]}>
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className={classes["menu-button-gold"]}
              onClick={() => {
                signOut(auth).then(() => {
                  setUser(null);
                  setDisplayName("");
                  navigate("/");
                });
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            className={classes["menu-button-gold"]}
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        )}
      </div>

      {/* Overlay */}
      {sideMenuOpen && (
        <div
          className={classes.backdrop}
          onClick={closeSideMenu}
          aria-hidden="true"
        />
      )}

      {/* Side panel */}
      {sideMenuOpen && (
        <aside
          ref={panelRef}
          id="pv-side-menu"
          className={classes["side-menu"]}
          role="dialog"
          aria-modal="true"
          aria-label="Menu laterale di navigazione"
        >
          {/* Header del pannello */}
          <div className={classes["side-menu-header"]}>
            <button
              ref={firstFocusRef}
              onClick={closeSideMenu}
              className={classes["close-button"]}
              aria-label="Chiudi menu"
              title="Chiudi"
            >
              ✕
            </button>

            {user ? (
              <>
                <div className={classes["welcome-user"]}>
                  👋 Benvenuto/a, <strong>{displayName}</strong>
                </div>

                {/* Bottoni affiancati, subito sotto il benvenuto */}
                <div className={classes.accountRow}>
                  <button
                    onClick={() => go("/account")}
                    className={classes["account-button"]}
                  >
                    👤 Il mio Account
                  </button>

                  <button
                    onClick={() => {
                      signOut(auth).then(() => {
                        setUser(null);
                        setDisplayName("");
                        window.location.href = "/";
                      });
                    }}
                    className={classes["logout-button"]}
                  >
                    Esci
                  </button>
                </div>
              </>
            ) : (
              // Utente non loggato: Accedi + Registrati affiancati
              <div className={classes.authRow}>
                <button
                  onClick={() => go("/login")}
                  className={classes["login-button"]}
                >
                  Accedi
                </button>
                <button
                  onClick={() => go("/register")}
                  className={classes["register-button"]}
                >
                  Registrati
                </button>
              </div>
            )}

            {location.pathname !== "/" && (
              <button
                className={classes["home-link"]}
                onClick={() => go("/")}
              >
                ⬅️ Torna alla Home
              </button>
            )}
          </div>

          {/* Contenuto scrollabile */}
          <div className={classes["side-menu-content"]}>
            {/* Servizi */}
            <div className={classes.section}>
              <div className={classes["section-title"]}>Servizi</div>
              <ul className={classes.list}>
                {servizi.map(({ path, label, icon }) => (
                  <li key={path} className={classes.item}>
                    <button
                      onClick={() => go(path)}
                      className={`${classes.linkBtn} ${isActive(path) ? classes.active : ""}`}
                      aria-current={isActive(path) ? "page" : undefined}
                    >
                      <span className={classes.icon}>{icon}</span>
                      <span className={classes.label}>{label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Area Gestionale (render solo se ci sono voci) */}
            {allowedGestionale.length > 0 && (
              <div className={classes.section}>
                <div className={classes["section-title"]}>Area Gestionale</div>
                <ul className={classes.list}>
                  {allowedGestionale.map(({ path, label }) => (
                    <li key={path} className={classes.item}>
                      <button
                        onClick={() => go(path)}
                        className={`${classes.linkBtn} ${classes.linkBtnWrap} ${isActive(path) ? classes.active : ""}`}
                        aria-current={isActive(path) ? "page" : undefined}
                        title={label}
                      >
                        {/* niente colonna icona qui, massimizziamo lo spazio testo */}
                        <span className={`${classes.label} ${classes.labelFull}`}>{label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>

          {/* Footer fisso con Account/Logout o Login/Registrati */}

        </aside>
      )}
    </div>
  );
};

export default React.memo(Header);
