# Frontend Photo & Vision

React 18 + TypeScript + Vite. Richiede Node.js >= 22.12.

- `npm ci`: installa dal lockfile.
- `npm start`: sviluppo su http://localhost:3000.
- `npm test`: verifica gli export XLSX/PDF.
- `npm run typecheck`: controlla i tipi.
- `npm run build`: typecheck e build in `build/`.
- `npm run preview`: serve la build per una verifica locale.

Configurazione pubblica in `.env.local`: `REACT_APP_API_BASE_URL` e
`REACT_APP_PAYPAL_CLIENT_ID`. Il prefisso storico `REACT_APP_` è configurato in Vite.
Non inserire segreti in queste variabili: vengono inclusi nel JavaScript pubblico.

Le pagine vengono caricate su richiesta. Il worker PDF è importato dal pacchetto
installato e incluso da Vite, per evitare divergenze tra API PDF.js e worker.

Il checkout salva prima PDF e ordine sul backend, poi avvia PayPal con il totale
calcolato dal server. L'account permette di verificare un pagamento la cui risposta
sia andata persa. Le API PayPal richiedono autenticazione JWT.

Vedere [README principale](../README.md) per backend, test e rilascio.
