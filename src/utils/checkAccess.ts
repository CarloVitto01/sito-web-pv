import { doc, getDoc } from "firebase/firestore";
import { db } from "../backend/firebase";

export const checkAccess = async (ruolo: string, pagina: string): Promise<boolean> => {
  try {
    const snap = await getDoc(doc(db, "ruoliPagineAccesso", ruolo));
    return snap.exists() && snap.data().accessoPagine.includes(pagina);
  } catch (err) {
    console.error("Errore controllo accesso:", err);
    return false;
  }
};
