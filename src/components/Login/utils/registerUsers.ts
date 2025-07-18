import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../../backend/firebase";

export const registerUser = async (
  email: string,
  password: string,
  displayName: string,
  extraData?: {
    cognome?: string;
    telefono?: string;
    corsoLaurea?: string;
    annoAccademico?: string;
  }
) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // Rimuove i campi undefined e imposta ruolo PublicUser
  const filteredData = Object.fromEntries(
    Object.entries({
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: displayName || "",
      ruolo: "PublicUser", // 👈 aggiunto ruolo fisso
      createdAt: serverTimestamp(),
      ...extraData,
    }).filter(([_, v]) => v !== undefined)
  );

  await setDoc(doc(db, "users", cred.user.uid), filteredData);
  return cred.user;
};
