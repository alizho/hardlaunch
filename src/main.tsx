import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { prepareIntro } from "./lib/intro";
import { initRiso } from "./lib/riso";
import "./styles.css";

// Temporary, for tracking down logos that vanish on iOS: `?off=blend,shadow`
// switches off one or more rendering features (see "Diagnostics" in styles.css).
for (const name of new URLSearchParams(location.search).get("off")?.match(/[a-z]+/g) ?? []) {
  document.documentElement.classList.add(`off-${name}`);
}

prepareIntro();
initRiso();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
