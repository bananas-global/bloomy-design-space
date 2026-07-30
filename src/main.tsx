import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DesignSpace } from "@brucesantos/design-space";
import "@brucesantos/design-space/styles.css";

import { productDefinition } from "./app/product.js";
import "./tokens/tokens.css";

// Coletor de feedback: ALT destaca o elemento, ALT com clique captura e abre o
// campo de instrução, e "Copiar backlog" gera o markdown numerado com
// `arquivo:linha` para o agente.
//
// Só em desenvolvimento. Ligar no preview compartilhado é decisão por projeto —
// ver `docs/decisions/0003-source-mapping-no-preview.md`.
if (import.meta.env.DEV) {
  void import("feedback-collector");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DesignSpace product={productDefinition} />
  </StrictMode>,
);
