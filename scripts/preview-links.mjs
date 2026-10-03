#!/usr/bin/env node
/**
 * Lista os cenários de um PR com o link de cada um no preview.
 *
 *   node scripts/preview-links.mjs <origem> [diretório-base]
 *
 * Carrega `src/app/product.ts` pelo Vite, sem abrir porta, e monta a URL de
 * cada cenário com `scenarioUrl` do motor: rota mais os parâmetros que
 * reproduzem a situação. Com `diretório-base` (um checkout da branch de destino
 * do PR), só entram os cenários novos ou alterados no PR; os que já estão na
 * `main` não são o assunto da revisão.
 *
 * Imprime um JSON: [{ id, title, url }].
 */
import { createServer } from "vite";

const [origin, baseDir] = process.argv.slice(2);
if (!origin) {
  console.error("Uso: node scripts/preview-links.mjs <origem> [diretório-base]");
  process.exit(1);
}

async function load(root) {
  const server = await createServer({
    root,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error",
  });
  try {
    const { productDefinition } = await server.ssrLoadModule("/src/app/product.ts");
    const engine = await server.ssrLoadModule("@brucesantos/design-space");
    return { scenarios: productDefinition.scenarios ?? [], scenarioUrl: engine.scenarioUrl };
  } finally {
    await server.close();
  }
}

// Só os dados do cenário entram na comparação; funções não serializam.
const fingerprint = (s) => JSON.stringify(s);

const head = await load(process.cwd());

let baseline = new Map();
if (baseDir) {
  try {
    const base = await load(baseDir);
    baseline = new Map(base.scenarios.map((s) => [s.id, fingerprint(s)]));
  } catch (error) {
    // Sem a base, mostrar todos é melhor que não mostrar nenhum.
    console.error(`Não deu para carregar a base (${error.message}); listando todos os cenários.`);
  }
}

const links = head.scenarios
  .filter((s) => baseline.get(s.id) !== fingerprint(s))
  .map((s) => ({ id: s.id, title: s.title, url: head.scenarioUrl(s, { origin }) }));

console.log(JSON.stringify(links, null, 2));
