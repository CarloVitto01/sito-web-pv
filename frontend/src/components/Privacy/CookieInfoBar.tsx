import React, { useEffect, useState } from "react";

const STORAGE_KEY = "pv_cookie_notice_dismissed_v1";

type Props = {
  policyUrl?: string;
  position?: "bottom" | "top";
  brandColor?: string;   // oro PV
  surfaceColor?: string; // sfondo scuro
  textColor?: string;
  borderColor?: string;
};

const CookieInfoBar: React.FC<Props> = ({
  policyUrl = "/cookie-policy",
  position = "bottom",
  brandColor = "var(--color-gold, #caa700)",
  surfaceColor = "#101010",
  textColor = "#eeeeee",
  borderColor = "#2a2a2a",
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Informativa cookie tecnici"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        [position]: 16,
        zIndex: 3000,
        background: surfaceColor,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        boxShadow: "0 10px 28px rgba(0,0,0,.45)",
        padding: 14,
        maxWidth: 900,
        marginInline: "auto",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Questo sito utilizza <strong style={{ color: brandColor }}>solo cookie tecnici</strong> necessari al
          funzionamento (es. autenticazione, preferenze). Per saperne di più leggi la{" "}
          <a href={policyUrl} style={{ color: brandColor, textDecoration: "underline" }}>
            Cookie Policy
          </a>.
        </p>
        <button
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, "1");
            setVisible(false);
          }}
          aria-label="Chiudi notifica cookie"
          style={{
            background: "transparent",
            color: textColor,
            border: `1px solid ${borderColor}`,
            borderRadius: 10,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Chiudi
        </button>
      </div>
    </div>
  );
};

export default CookieInfoBar;
