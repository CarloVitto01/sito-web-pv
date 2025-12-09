import React, { useEffect, useState } from "react";
import { db } from "../../backend/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import styles from "./Banner.module.css";

type Variant = "info" | "warning" | "success" | "error" | "christmas";

type BannerData = {
  enabled?: boolean;
  text?: string;
  variant?: Variant;
};

const Banner: React.FC = () => {
  const [data, setData] = useState<BannerData | null>(null);

  useEffect(() => {
    const ref = doc(db, "config", "homeBanner");
    const unsub = onSnapshot(ref, (snap) => {
      setData((snap.data() as BannerData) || null);
    });
    return () => unsub();
  }, []);

  if (!data?.enabled || !data?.text) return null;

  const variant: Variant = data.variant ?? "info";

  return (
    <div
      className={`${styles.banner} ${styles[variant]}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.inner}>
        <p className={styles.text}>{data.text}</p>
      </div>
    </div>
  );
};

export default Banner;
