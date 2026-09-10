/* eslint-env serviceworker */
/* eslint-disable no-restricted-globals */

// public/sw.js
// SW minimale: abilita l'installazione PWA senza cache aggressive.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
