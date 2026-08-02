#!/usr/bin/env node
/**
 * Confere as citações ao monólito em `docs/`.
 *
 * A tabela de achados aponta para arquivo e linha do sistema real. Uma citação
 * uma linha fora manda o leitor para o lugar errado e derruba a confiança na
 * tabela inteira — e foi exatamente o que aconteceu com sete delas antes de
 * este script existir.
 *
 * O monólito é outro repositório e pode não estar presente. Nesse caso o script
 * **não falha**: avisa e sai com zero. Um verificador que quebra o `check` de
 * quem não tem o outro repo clonado seria abandonado na primeira semana.
 *
 *   node scripts/check-citations.mjs [caminho-do-monolito]
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const DEFAULT_MONOLITH = resolve(
  process.env.HOME ?? "",
  "Documents/GitHub/bloomy",
);

const monolith = resolve(process.argv[2] ?? process.env.BLOOMY_PATH ?? DEFAULT_MONOLITH);

if (!existsSync(monolith)) {
  console.log(`aviso: monólito não encontrado em ${monolith} — checagem de citações pulada.`);
  console.log("       passe o caminho como argumento ou defina BLOOMY_PATH para rodar.");
  process.exit(0);
}

const docs = readdirSync("docs", { recursive: true })
  .filter((name) => typeof name === "string" && name.endsWith(".md"))
  .map((name) => join("docs", name));

/** `caminho.ex` ou `caminho.ex:12` ou `caminho.ex:12-40` ou `caminho.ex:12,37,64` */
const CITATION = /`(lib\/[^`\s]+?\.exs?)(?::([\d,\-]+))?`/g;

const problems = [];
let checked = 0;

for (const doc of docs) {
  const text = readFileSync(doc, "utf8");
  const lines = text.split("\n");

  for (const [index, line] of lines.entries()) {
    for (const match of line.matchAll(CITATION)) {
      const [, path, range] = match;
      checked += 1;

      const full = join(monolith, path);
      if (!existsSync(full)) {
        problems.push(`${doc}:${index + 1} — arquivo não existe no monólito: ${path}`);
        continue;
      }

      if (!range) continue;

      const total = readFileSync(full, "utf8").split("\n").length;
      const numbers = [...range.matchAll(/\d+/g)].map((entry) => Number(entry[0]));
      const beyond = numbers.filter((number) => number > total);

      if (beyond.length > 0) {
        problems.push(
          `${doc}:${index + 1} — ${path} tem ${total} linhas; a citação aponta para ${beyond.join(", ")}`,
        );
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`${problems.length} citação(ões) com problema:\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error("\nCorrija o número da linha ou remova a citação.");
  process.exit(1);
}

console.log(`${checked} citações ao monólito conferidas, todas válidas.`);
