import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import { requestPersistence } from "./data/db";

// Ask for persistent storage early so IndexedDB is less likely to be evicted.
void requestPersistence();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
