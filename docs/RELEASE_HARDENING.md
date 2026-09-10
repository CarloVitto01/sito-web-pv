# Correzioni e rilascio — 10 settembre 2026

## Modifiche

- JWT con versione della sessione: reset/cambio password e logout revocano i token
  dell'utente. I ruoli vengono letti dal database su ogni richiesta autenticata.
- Reset password monouso anche con richieste concorrenti; eliminazione degli hash
  Firebase legacy al reset. Le route protette restituiscono 401 per token scaduti.
- Proprietà delle sessioni di upload e dei PDF verificata sul backend; indici,
  byte effettivi, PDF valido, completezza e scadenza controllati. Limite 300 MB/file,
  5 MB/blocco, 50 file/ordine e quota per utente di 2 GiB nelle sessioni delle ultime
  24 ore (`app.storage.daily-user-quota-bytes`, configurabile). Le sessioni rimosse
  dalla pulizia non contribuiscono più alla quota. Massimo 1000 sessioni nello stesso periodo.
- Upload completati e invio ordini riutilizzabili nei retry. La cancellazione di un
  ordine lascia alla pulizia periodica i PDF non più referenziati, proteggendo i file
  condivisi con altri ordini. La pulizia acquisisce lock sulle sessioni.
- Ordine persistente prima del pagamento. Il server crea PayPal dal proprio totale,
  verifica ordine/importo/valuta/cattura e impedisce la conferma tramite capture ID
  fornito dal client. Creazione e cattura usano identificativi di idempotenza.
- Le notifiche partono dopo il commit, per contanti o PayPal confermato. Gli ordini
  PayPal in attesa restano nell'account e non entrano nelle liste di lavorazione/storico.
- Il pulsante “Verifica pagamento” nell'account riconcilia un pagamento già completato
  su PayPal dopo una risposta persa; non avvia un nuovo incasso.
- Validazione di copie, opzioni, numero file, dimensioni e configurazioni numeriche.
- Costi interni calcolati per file, copie, lati e rilegatura; plastificazione A3 inclusa.
  Gli extra condizionati usano una corrispondenza senza distinzione maiuscole/minuscole
  per sottostringa. Nei fascicoli separati, extra per foglio/fascicolo/percentuale sono
  applicati al file corrispondente; quelli per ordine una volta. Il freeze è idempotente.
- TypeScript aggiornato, errori del form corretti, controllo tipi incluso nella build,
  route caricate su richiesta e worker PDF importato dallo stesso pacchetto dell'API.
- React Router aggiornato e UUID di ExcelJS aggiornato tramite override: ExcelJS usa
  l'API `v4`, mantenuta nella versione CommonJS scelta. Le altre dipendenze sono state
  aggiornate con `npm audit fix` senza `--force`.
- Segreti esterni al JAR, password DB rimossa dal default locale, chiave JWT obbligatoria
  e validata in produzione. SMTP disabilitato non scrive link di reset nei log.
- Workflow con Node 22, Java 21, lockfile npm, typecheck e test backend.

## Prima del rilascio

1. Eseguire backup verificati di PostgreSQL e storage. Il database non è stato modificato
   durante questo intervento.
2. Per un database già inizializzato dal backend, applicare
   `backend/migration/sql/001_checkout_sessions.sql`. Lo script aggiunge colonne e indici;
   non crea lo schema completo di un database vuoto. In produzione Hibernate usa `validate`.
3. Configurare ambiente backend e variabili GitHub elencate nel README. Il file locale
   `config/secrets.yml` si risolve dalla directory di avvio; nel container montarlo lì,
   oppure usare le variabili d'ambiente. Il JAR non deve contenerlo.
4. Configurare esplicitamente ambiente e credenziali PayPal coerenti tra client e server.
   Il default server è sandbox. Provare in sandbox pagamento riuscito, annullamento,
   perdita della risposta e riconciliazione dall'account prima di usare le credenziali live.
5. Distribuire backend e frontend in modo coordinato: `POST /api/orders` ora richiede
   `requestId`; le API PayPal richiedono JWT e `localOrderId`.
6. Gli utenti devono autenticarsi nuovamente: i vecchi JWT non hanno la versione di sessione.
   Il logout invalida tutte le sessioni dell'account. Se il browser è offline la revoca
   server non è garantita, ma lo stato locale viene eliminato.
7. Ruotare sul provider le credenziali eventualmente già distribuite in vecchi JAR o
   versionate in passato; escluderle ora dal pacchetto non revoca le copie precedenti.

## Verifiche e limiti

Le verifiche automatiche sono locali, con mock dei provider e directory temporanee.
Non sono stati eseguiti deploy, modifiche a dati operativi, pagamenti reali o invii
email/Telegram. Il flusso completo nel browser e il database PostgreSQL effettivo
richiedono la verifica in un ambiente di staging.

Gli ordini storici già marcati “Pagato” non vengono retroattivamente certificati o
modificati: non contengono i nuovi riferimenti PayPal. La migrazione è additiva.

Le notifiche sono best effort: non è stato introdotto un outbox persistente. La
riconciliazione PayPal è disponibile su richiesta dall'account; webhook e riconciliazione
periodica sono un possibile passo successivo. Gli ordini PayPal in attesa conservano
file e riferimenti per non perdere un pagamento potenzialmente riuscito.

Restano da pianificare una baseline completa delle migrazioni del database, test browser
in CI, paginazione server degli elenchi e limiti di frequenza distribuiti per autenticazione.
Il bundle dello storico, che include ExcelJS, resta consistente anche dopo il caricamento
su richiesta; non viene caricato entrando nella pagina di login.

Riferimento API usato: [PayPal Orders v2](https://developer.paypal.com/api/rest/integration/orders-api/).

## Esito delle verifiche locali

- `mvn -o -f backend/pom.xml clean verify`: 23 test passati, JAR creato.
- Ispezione del JAR: assenti `secrets.yml` e `secrets.properties`.
- `npm run build`: typecheck e build passati.
- `npm test`: roundtrip XLSX con formattazione condizionale e generazione PDF passati.
- Ultima installazione/audit npm: 0 vulnerabilità segnalate.
- Manifest e lockfile: dipendenze coerenti.
- `git diff --check`: nessun errore.
- Bundle principale: circa 212 kB minificati / 69 kB gzip, contro circa 2725 kB /
  799 kB gzip prima delle modifiche. Le pagine PDF e storico hanno bundle separati
  ancora superiori a 500 kB; queste misure non rappresentano il peso totale della pagina.
