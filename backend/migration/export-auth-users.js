// Esporta gli utenti di Firebase Auth (email, passwordHash, salt) in auth-export.json,
// usando l'Admin SDK invece della Firebase CLI (utile quando "firebase login" non
// funziona, es. per problemi di rete IPv6 dentro WSL2).
//
// Genera lo stesso formato di "firebase auth:export --format=json", nella parte che
// serve all'importer Java (FirebaseUserMigrationRunner): { "users": [ { localId, email,
// passwordHash, salt, ... }, ... ] }
//
// Uso:
//   1. npm install firebase-admin (se non gia' fatto per export-firestore-users.js)
//   2. Scarica una service account key da:
//      Firebase Console > Project Settings > Service Accounts > Generate new private key
//      Salvala come backend/migration/service-account-key.json (NON committarla in git!)
//   3. node export-auth-users.js
//
// Genera: auth-export.json (in questa stessa cartella)

const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
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

async function main() {
  const users = [];
  let pageToken = undefined;

  do {
    const result = await getAuth(app).listUsers(1000, pageToken);
    for (const u of result.users) {
      users.push({
        localId: u.uid,
        email: u.email,
        passwordHash: u.passwordHash,
        salt: u.passwordSalt,
        disabled: u.disabled,
      });
    }
    pageToken = result.pageToken;
  } while (pageToken);

  fs.writeFileSync(path.join(__dirname, "auth-export.json"), JSON.stringify({ users }, null, 2));
  console.log(`Esportati ${users.length} utenti Auth in auth-export.json`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
