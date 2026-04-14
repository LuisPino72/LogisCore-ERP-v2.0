import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";
import { db } from "./lib/db/dexie";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("No se encontro el nodo root.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if (typeof window !== "undefined") {
  (window as unknown as { logiscoreDb: typeof db }).logiscoreDb = db;
}
