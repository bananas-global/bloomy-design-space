#!/usr/bin/env node
/**
 * Confere as citações ao monólito em `docs/` e na galeria de componentes.
 *
 * A galeria entrou no escopo porque ela é um índice de 47 arquivos e linhas do
 * sistema: sem conferência, envelhece em silêncio e passa a apontar para o
 * lugar errado — que é pior que não apontar.
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

// A galeria cita `core_components.ex` uma vez por componente. As citações lá
// vivem em atributos de string, não em crases, então o padrão é outro.
const fontes = ["src/gallery/entries.tsx"].filter((caminho) => existsSync(caminho));

/** `caminho.ex` ou `caminho.ex:12` ou `caminho.ex:12-40` ou `caminho.ex:12,37,64` */
const CITATION = /`(lib\/[^`\s]+?\.exs?)(?::([\d,\-]+))?`/g;

const problems = [];
let checked = 0;

const CITACAO_SOLTA = /["'](lib\/[^"'\s]+?\.exs?):(\d+)["']/g;

for (const fonte of fontes) {
  const linhas = readFileSync(fonte, "utf8").split("\n");

  for (const [index, linha] of linhas.entries()) {
    for (const match of linha.matchAll(CITACAO_SOLTA)) {
      const [, arquivo, numero] = match;
      const alvo = join(monolith, arquivo);

      if (!existsSync(alvo)) {
        problems.push(`${fonte}:${index + 1} — ${arquivo} não existe no monólito`);
        continue;
      }

      checked += 1;

      const total = readFileSync(alvo, "utf8").split("\n").length;
      if (Number(numero) > total) {
        problems.push(
          `${fonte}:${index + 1} — ${arquivo}:${numero} passa do fim do arquivo (${total} linhas)`,
        );
      }
    }
  }
}

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
