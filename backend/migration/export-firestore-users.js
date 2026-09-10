// Esporta la collection Firestore "users" (e "ruoliPagineAccesso") in file JSON,
// da usare come input per l'importer Java (FirebaseUserMigrationRunner).
//
// Uso:
//   1. npm install firebase-admin
//   2. Scarica una service account key da:
//      Firebase Console > Project Settings > Service Accounts > Generate new private key
//      Salvala come backend/migration/service-account-key.json (NON committarla in git!)
//   3. node export-firestore-users.js
//
// Genera: firestore-users.json, firestore-roles.json (in questa stessa cartella)

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const keyPath = path.join(__dirname, "service-account-key.json");
if (!fs.existsSync(keyPath)) {
  console.error("Manca service-account-key.json in questa cartella. Vedi le istruzioni in cima al file.");
  process.exit(1);
}

const app = initializeApp({
  credential: cert(require(keyPath)),
});

const db = getFirestore(app);

async function main() {
  const usersSnap = await db.collection("users").get();
  const users = usersSnap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
  fs.writeFileSync(path.join(__dirname, "firestore-users.json"), JSON.stringify(users, null, 2));
  console.log(`Esportati ${users.length} utenti in firestore-users.json`);

  const rolesSnap = await db.collection("ruoliPagineAccesso").get();
  const roles = rolesSnap.docs.map((doc) => ({ nome: doc.id, ...doc.data() }));
  fs.writeFileSync(path.join(__dirname, "firestore-roles.json"), JSON.stringify(roles, null, 2));
  console.log(`Esportati ${roles.length} ruoli in firestore-roles.json`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
