// Script diagnostico monouso: verifica una password in chiaro contro un hash Firebase legacy
// (scrypt modificato), usando SOLO Node crypto, per isolare se il problema e' nell'algoritmo
// o altrove (es. wiring lato Spring). Non salva né logga la password.
//
// Uso:
//   node test-legacy-password.js <saltBase64> <hashBase64>
// poi inserisci la password quando richiesto (non viene stampata).

const crypto = require("crypto");
const readline = require("readline");

const SIGNER_KEY_B64 = "DzR8XTpRAX3rjFqhdTv3RAA8BEOhkbh09ldAv9LuIxesYjTc/w+cFkX58A7L2Q/zrOYna+pQsSIgQKYeD3tpnA==";
const SALT_SEPARATOR_B64 = "Bw==";
const ROUNDS = 8;
const MEM_COST = 14;

const [, , saltB64, expectedHashB64] = process.argv;
if (!saltB64 || !expectedHashB64) {
  console.error("Uso: node test-legacy-password.js <saltBase64> <hashBase64>");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Password: ", (password) => {
  rl.close();

  const salt = Buffer.from(saltB64, "base64");
  const saltSeparator = Buffer.from(SALT_SEPARATOR_B64, "base64");
  const signerKey = Buffer.from(SIGNER_KEY_B64, "base64");
  const combinedSalt = Buffer.concat([salt, saltSeparator]);

  const N = 1 << MEM_COST;
  const derivedKey = crypto.scryptSync(Buffer.from(password, "utf8"), combinedSalt, 64, {
    N, r: ROUNDS, p: 1, maxmem: 128 * N * ROUNDS * 2,
  });

  const aesKey = derivedKey.subarray(0, 32);
  const iv = Buffer.alloc(16, 0); // fisso, non deriva dalla scrypt key

  const cipher = crypto.createCipheriv("aes-256-ctr", aesKey, iv);
  const computedHash = Buffer.concat([cipher.update(signerKey), cipher.final()]);

  const expectedHash = Buffer.from(expectedHashB64, "base64");
  const match = computedHash.length === expectedHash.length && crypto.timingSafeEqual(computedHash, expectedHash);

  console.log("Hash calcolato: ", computedHash.toString("base64"));
  console.log("Hash atteso:    ", expectedHashB64);
  console.log(match ? "MATCH ✔" : "NO MATCH ✘");
});
