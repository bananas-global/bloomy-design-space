#!/usr/bin/env node
/**
 * Copia `assets/css/app.css` do monólito para `src/tokens/bloomy.generated.css`.
 *
 * Os tokens e as classes globais do Bloomy vêm do sistema real, sem ajuste à
 * mão. Quando o monólito mudar, rode de novo:
 *
 *   node scripts/sync-tokens.mjs [caminho-do-monolito]
 *
 * Três adaptações, e só elas: o Tailwind daqui varre este repositório (sai o
 * `source(none)` e os `@source` do monólito), e os CSS de quill e flatpickr não
 * são dependências deste projeto.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const monolith = resolve(
  process.argv[2] ?? process.env.BLOOMY_PATH ?? join(process.env.HOME ?? "", "Documents/GitHub/bloomy"),
);
const source = join(monolith, "assets/css/app.css");
const target = new URL("../src/tokens/bloomy.generated.css", import.meta.url);

const css = readFileSync(source, "utf8")
  .replace('@import "tailwindcss" source(none);', '@import "tailwindcss";')
  .replace(/^@source .*\n/gm, "")
  .replace(/^@import "(quill|flatpickr)\/.*\n/gm, "");

const header = `/* Gerado por scripts/sync-tokens.mjs a partir de bloomy/assets/css/app.css.
   Não edite à mão: rode o script de novo quando o monólito mudar. */\n\n`;

writeFileSync(target, header + css);
console.log(`tokens sincronizados de ${source}`);
