#!/usr/bin/env node
/**
 * Confere que ação destrutiva usa a variante de perigo.
 *
 * Achei duas à mão — "Inativar {paciente}" e "Confirmar cancelamento" — e as
 * duas eram do mesmo tipo: a tela explica que a ação é irreversível e o botão
 * vem com a cor da ação afirmativa, dizendo o contrário do que a tela acabou de
 * dizer. É o passo que executa, não o que abre o painel, que costuma escapar.
 *
 * Roda como parte do `pnpm check`.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DESTRUTIVAS =
  /\b(cancelar|cancelamento|inativar|excluir|apagar|remover|desativar|encerrar|recusar|reverter|desfazer|estornar)\b/i;

/**
 * Rótulos que contêm palavra destrutiva e **não** são a ação destrutiva.
 * Cada exceção precisa de motivo — é a lista que impede o verificador de virar
 * ruído, e é onde ele apodrece se ninguém a revisar.
 */
const EXCECOES = [
  { trecho: "Voltar", porque: "sai do painel de cancelamento sem cancelar nada" },
  { trecho: "Registrar outra pessoa", porque: "recomeça o quiosque, não desfaz nada" },
];

const arquivos = readdirSync("src/screens")
  .filter((nome) => nome.endsWith(".tsx"))
  .map((nome) => join("src/screens", nome));

const problemas = [];

for (const arquivo of arquivos) {
  const fonte = readFileSync(arquivo, "utf8");

  for (const encontro of fonte.matchAll(/<Button\b(.*?)>(.*?)<\/Button>/gs)) {
    const [, atributos, corpo] = encontro;
    const rotulo = corpo.replace(/\s+/g, " ").trim();

    if (!DESTRUTIVAS.test(rotulo)) continue;
    if (EXCECOES.some((excecao) => rotulo.includes(excecao.trecho))) continue;

    const variante = atributos.match(/variant="(\w+)"/)?.[1] ?? "secondary";
    if (variante === "danger") continue;

    const linha = fonte.slice(0, encontro.index).split("\n").length;
    problemas.push(
      `${arquivo}:${linha} — variante "${variante}" num rótulo destrutivo: ${rotulo.slice(0, 60)}`,
    );
  }
}

if (problemas.length > 0) {
  console.error(`${problemas.length} ação destrutiva sem a variante de perigo:\n`);
  for (const problema of problemas) console.error(`  ${problema}`);
  console.error(
    '\nUse variant="danger" ou, se o rótulo não for destrutivo de fato, adicione uma exceção com motivo em scripts/check-button-variants.mjs.',
  );
  process.exit(1);
}

console.log(`${arquivos.length} telas conferidas: toda ação destrutiva usa a variante de perigo.`);
