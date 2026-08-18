import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import babel from "@rolldown/plugin-babel";
import { devPort } from "./dev-port.js";

/**
 * Configuração do Design Space.
 *
 * Três coisas aqui não são detalhe de build e não devem ser removidas sem
 * decisão registrada:
 *
 * 1. **Source mapping** (`@react-dev-inspector/babel-plugin`). É requisito do
 *    `feedback-collector`, não opcional: em React 19 o fallback pelo fiber
 *    (`_debugSource`) não existe mais, então sem o plugin no bundler não há
 *    `arquivo:linha` — e sem `arquivo:linha` o coletor volta a produzir
 *    descrição visual, que é o que ele existe para substituir.
 *
 * 2. **Escopo do source mapping.** Ligado só em desenvolvimento por padrão. O
 *    plugin injeta os caminhos do repositório no HTML, e o preview é público
 *    (D-11): não é vazamento de dado, é exposição da estrutura do projeto.
 *    Ver `docs/decisions/0002-source-mapping-no-preview.md` para o raciocínio e
 *    para como ligar em preview quando a revisão justificar.
 *
 * 3. **Variáveis de deployment.** O contexto do build chega ao produto por
 *    `VITE_DEPLOY_*`, nome que não cita fornecedor: quem publica pode mudar sem
 *    que o contrato com o motor mude (ADR 0007 do motor). Mapear explicitamente
 *    é o que garante que o motor monte o link absoluto do cenário sem domínio
 *    hardcoded, sem depender de a exposição automática de variáveis de sistema
 *    estar ligada no projeto de quem hospeda.
 */

const isDev = process.env.NODE_ENV !== "production";

// `1` liga o source mapping também no build de preview. Decisão consciente por
// projeto, não padrão.
const sourceMappingInBuild = process.env.DESIGN_SPACE_SOURCE_MAPPING === "1";

/**
 * Contexto do deployment, injetado no código do produto.
 *
 * Vem de `build-info.json`, que o workflow de deploy grava. Duas coisas que
 * custaram tempo para descobrir e que explicam este desenho:
 *
 * 1. O `vercel build` não repassa o ambiente do shell ao build do Vite, e
 *    sobrescreve um `.env` na raiz com o arquivo que ele mesmo gera. Um arquivo
 *    lido aqui, em Node, é o único ponto que nada mais toca.
 *
 * 2. O `define` substitui **texto literal**. Ele funciona no código deste
 *    repositório, que escreve `import.meta.env.VITE_DEPLOY_ENV` por extenso — e
 *    não funcionava no motor, que é uma biblioteca já compilada e lê
 *    `import.meta.env` como objeto. Por isso o produto passa o contexto ao motor
 *    explicitamente, pelo campo `deploy` da `ProductDefinition`.
 */
type BuildInfo = { env?: string; ref?: string; sha?: string };

function readBuildInfo(): BuildInfo {
  try {
    return JSON.parse(
      readFileSync(new URL("./build-info.json", import.meta.url), "utf8"),
    ) as BuildInfo;
  } catch {
    // Sem o arquivo — desenvolvimento local — o produto cai para os padrões.
    return {};
  }
}

const buildInfo = readBuildInfo();

const deployEnv = {
  "import.meta.env.VITE_DEPLOY_ENV": JSON.stringify(buildInfo.env ?? "development"),
  "import.meta.env.VITE_DEPLOY_BRANCH": JSON.stringify(buildInfo.ref ?? ""),
  "import.meta.env.VITE_DEPLOY_COMMIT": JSON.stringify(buildInfo.sha ?? ""),
};

export default defineConfig({
  define: deployEnv,
  plugins: [
    ...(isDev || sourceMappingInBuild
      ? [babel({ plugins: ["@react-dev-inspector/babel-plugin"] })]
      : []),
    react(),
    tailwindcss(),
  ],
  server: { port: devPort, strictPort: false },
  preview: { port: devPort + 1, strictPort: false },
  build: { sourcemap: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
