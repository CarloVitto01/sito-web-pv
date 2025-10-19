// seed-banner.ts
import { db } from "./backend/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

(async () => {
  await setDoc(
    doc(db, "config", "homeBanner"),
    {
      enabled: true,
      text: "Saremo chiusi il 1° novembre. Gli ordini riprenderanno il 2 novembre.",
      variant: "info",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  console.log("Banner inizializzato.");
})();
