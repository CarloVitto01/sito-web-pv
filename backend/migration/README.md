# Migrazione account da Firebase

Procedura in 3 passi. I primi due li fai tu (servono le tue credenziali del progetto Firebase), il terzo lo fa
il backend in automatico.

## 1. Esporta gli utenti di Firebase Auth (email, password hash, salt)

Prima serve comunque la service account key (vedi punto 2), poi due opzioni:

**Opzione A — script Node con Admin SDK (consigliata, non serve `firebase login`):**

```bash
cd backend/migration
node export-auth-users.js
```

Genera `auth-export.json`. Utile perche' `firebase login` puo' restare appeso a lungo dentro WSL2
(bug noto legato a IPv6): questa via non usa la CLI, solo la service account key.

**Opzione B — Firebase CLI classica:**

```bash
npm install -g firebase-tools
firebase login
firebase auth:export backend/migration/auth-export.json --format=json -P pv-backend-ca646
```

## 2. Esporta i profili da Firestore (nome, ruolo, corso di laurea, ecc.)

```bash
cd backend/migration
npm install firebase-admin
```

Poi scarica una **service account key**: Firebase Console → Project Settings → Service Accounts →
"Generate new private key". Salva il file scaricato esattamente come `backend/migration/service-account-key.json`
(è già escluso da git, non verra' committato). Serve sia per questo passo sia per l'opzione A del punto 1.

```bash
node export-firestore-users.js
```

Genera `firestore-users.json` e `firestore-roles.json` in questa cartella.

Alla fine dovresti avere in `backend/migration/`:
- `auth-export.json`
- `firestore-users.json`
- `firestore-roles.json`
- `service-account-key.json` (non serve piu' dopo l'export, puoi cancellarlo)

## 3. Importa nel database

Le password vengono migrate in modo trasparente: l'utente puo' continuare a usare la password che aveva su
Firebase. Al primo login dopo l'import, il backend verifica la password col vecchio algoritmo di Firebase
(i parametri del progetto sono gia' configurati in `backend/config/secrets.yml`) e, se corrisponde,
la converte subito in BCrypt — l'utente non si accorge di nulla, nessun reset richiesto. Email, nome,
cognome, telefono, ruolo, corso di laurea e anno accademico vengono importati cosi' come sono.

Avvia il backend con il profilo aggiuntivo `migrate-firebase-users`:

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local,migrate-firebase-users
```

L'importazione parte all'avvio, stampa un riepilogo nel log (utenti creati / gia' esistenti / errori) e poi
l'app continua a funzionare normalmente — puoi fermarla e riavviarla senza il profilo `migrate-firebase-users`
per tornare all'uso normale. E' sicuro rilanciare l'import piu' volte: gli utenti gia' presenti (per email)
vengono saltati, non duplicati.

Al termine, cancella i file JSON esportati e la service account key da questa cartella (contengono dati
personali e una chiave con accesso al tuo progetto Firebase).
