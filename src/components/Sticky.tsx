import React, { useState, useEffect, CSSProperties, RefObject } from "react";

interface StickyProps {
  position: "top" | "bottom" | "left" | "right";
  stuckClasses?: string;
  unstuckClasses?: string;
  stuckStyles?: CSSProperties;
  unstuckStyles?: CSSProperties;
  children: React.ReactNode;
}

const Sticky: React.FC<StickyProps> = ({
  position,
  stuckClasses = "",
  unstuckClasses = "",
  stuckStyles = {},
  unstuckStyles = {},
  children,
}) => {
  const [stuck, setStuck] = useState(false);
  const ref: RefObject<HTMLDivElement> = React.createRef();

  const classes = stuck ? stuckClasses : unstuckClasses;
  const styles: CSSProperties = stuck ? stuckStyles : unstuckStyles;

  const inlineStyles: CSSProperties = {
    position: "sticky",
    [position]: -1,
    ...styles,
  };

  useEffect(() => {
    const cachedRef: HTMLDivElement | null = ref.current;
    if (cachedRef) {
      const observer = new IntersectionObserver(
        ([e]) => setStuck(e.intersectionRatio < 1),
        { threshold: [1] }
      );
      observer.observe(cachedRef);
      return () => observer.unobserve(cachedRef);
    }
  }, [ref]);

  return (
    <div style={inlineStyles} className={classes} ref={ref}>
      {children}
    </div>
  );
};

export default Sticky;
