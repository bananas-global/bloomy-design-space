import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DesignSpace } from "@brucesantos/design-space";
import "@brucesantos/design-space/styles.css";

// Font Awesome Pro 6.5.2, copiado de `priv/static/fonts/fontawesome/` do
// monólito. Os mesmos dois estilos que o `root.html.heex` carrega — não é um
// pacote equivalente do npm, são os mesmos arquivos que o sistema serve.
import "./assets/fontawesome/css/fontawesome.min.css";
import "./assets/fontawesome/css/regular.min.css";
import "./assets/fontawesome/css/solid.min.css";

import { productDefinition } from "./app/product.js";
import "./tokens/tokens.css";

// Coletor de feedback: ALT destaca o elemento, ALT com clique captura e abre o
// campo de instrução, e "Copiar backlog" gera o markdown numerado com
// `arquivo:linha` para o agente.
//
// Só dentro do quadro, onde a UI do produto é renderizada: é ali que os
// elementos têm `arquivo:linha`.
if (import.meta.env.DEV && window.self !== window.top) {
  void import("feedback-collector");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DesignSpace product={productDefinition} />
  </StrictMode>,
);
