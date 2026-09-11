# Photo & Vision

Monorepo per ordini di stampa A4/A3 e gestionale:

- `frontend/`: React 18, TypeScript 5, Vite, Mantine, React Router.
- `backend/`: Java 21, Spring Boot, PostgreSQL, storage PDF su filesystem/NAS.

## Sviluppo

Richiede Node.js >= 22.12, Java 21, Maven e un database PostgreSQL dedicato allo sviluppo.

```bash
cd frontend
npm ci
npm start
```

Frontend: http://localhost:3000. Configurazione pubblica in `.env.local`:

```dotenv
REACT_APP_API_BASE_URL=http://localhost:8080
REACT_APP_PAYPAL_CLIENT_ID=client-id-pubblico-sandbox
```

Backend (un altro terminale):

```bash
cd backend
# Impostare DB_URL, DB_USERNAME e DB_PASSWORD nel proprio ambiente.
# STORAGE_BASE_DIR deve essere una directory scrivibile di sviluppo.
mvn spring-boot:run
```

Il profilo `local` aggiorna lo schema e crea `admin@local.test` con password `Admin123!`.
Usare solo un database di sviluppo con questo profilo. Le impostazioni locali esistenti
puntano a un server di rete/NAS: sovrascriverle per usare risorse isolate.

`backend/config/secrets.yml` è un file locale opzionale, ignorato da Git e caricato
esternamente rispetto al JAR. Nessun segreto deve essere inserito nel frontend.

## Verifiche

```bash
cd frontend
npm run typecheck
npm test
npm run build
npm audit
```

```bash
mvn -f backend/pom.xml clean verify
```

La build frontend include il typecheck. I test backend usano mock e directory temporanee:
non richiedono database, PayPal, SMTP o Telegram reali.

## Rilascio

Leggere [le note di rilascio e le limitazioni](docs/RELEASE_HARDENING.md).
Questa versione modifica il contratto di checkout: distribuire frontend e backend insieme.
Prima di aggiornare un database esistente applicare, in ordine,
[`001_checkout_sessions.sql`](backend/migration/sql/001_checkout_sessions.sql) e
[`002_upload_session_page_count.sql`](backend/migration/sql/002_upload_session_page_count.sql).
Il profilo `prod` verifica lo schema (`ddl-auto: validate`) e non lo modifica automaticamente.
Lo script è incrementale e richiede le tabelle del backend già presenti; non inizializza un database vuoto.

Configurazione richiesta:

- `SPRING_PROFILES_ACTIVE=prod`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.
- `JWT_SECRET`: almeno 32 byte casuali; i token delle versioni precedenti non saranno accettati.
- `STORAGE_BASE_DIR`, `STORAGE_TEMP_DIR`: directory scrivibili e persistenti dove necessario.
- `CORS_ALLOWED_ORIGINS`, `FRONTEND_BASE_URL`, `PUBLIC_BASE_URL`: URL effettivi HTTPS.
- `PAYPAL_BASE_URL`: sandbox per i test, `https://api-m.paypal.com` per produzione;
  `PAYPAL_CLIENT_ID` e `PAYPAL_CLIENT_SECRET` dello stesso ambiente.
- `MAIL_ENABLED=true`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_FROM` ed eventuali
  `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH`, `MAIL_SMTP_STARTTLS`.
- Token/chat Telegram A4/A3, se si desiderano le notifiche degli ordini confermati.
