import React, { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

interface StickyProps {
  position: "top" | "bottom" | "left" | "right";
  enabled?: boolean;

  stuckClasses?: string;
  unstuckClasses?: string;

  stuckStyles?: CSSProperties;
  unstuckStyles?: CSSProperties;

  children: React.ReactNode;
}

const Sticky: React.FC<StickyProps> = ({
  position,
  enabled = true,
  stuckClasses = "",
  unstuckClasses = "",
  stuckStyles = {},
  unstuckStyles = {},
  children,
}) => {
  const [stuck, setStuck] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const classes = enabled ? (stuck ? stuckClasses : unstuckClasses) : unstuckClasses;
  const styles: CSSProperties = enabled ? (stuck ? stuckStyles : unstuckStyles) : unstuckStyles;

  const inlineStyles: CSSProperties = useMemo(() => {
    if (!enabled) {
      // niente sticky: segue lo scroll normalmente
      return { position: "static", ...styles };
    }

    return {
      position: "sticky",
      [position]: 0, // meglio di -1 (evita comportamenti strani)
      ...styles,
    };
  }, [enabled, position, styles]);

  useEffect(() => {
    if (!enabled) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([e]) => setStuck(e.intersectionRatio < 1),
      { threshold: [1] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  return (
    <div style={inlineStyles} className={classes} ref={ref}>
      {children}
    </div>
  );
};

export default Sticky;