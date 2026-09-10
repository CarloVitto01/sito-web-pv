import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css"; // IMPORTANTISSIMO (mantine v7)

// Oro champagne del brand (logo, header): sostituisce il giallo di default di Mantine
// ovunque nell'app venga usato color="gold" (vedi variables.css per gli stessi valori in CSS puro).
const theme = createTheme({
  colors: {
    gold: [
      "#fdf8ef",
      "#f8ecd4",
      "#f2dfb6",
      "#ecd299",
      "#e6c57c",
      "#e0b85f",
      "#d4af6a",
      "#b8934f",
      "#96773d",
      "#745c2f",
    ],
  },
});

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </React.StrictMode>
);

// --- Service Worker registration (PWA) ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("SW registration failed:", err);
    });
  });
}

reportWebVitals();
