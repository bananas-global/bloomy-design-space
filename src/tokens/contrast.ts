import type { ContrastPair } from "@brucesantos/design-space";

/**
 * Pares de contraste do Bloomy.
 *
 * A lista é o contrato: um par que aparece na tela e não está aqui não é
 * verificado por ninguém. Cada entrada tem a razão medida no comentário para que
 * a margem fique visível — um par em 4.52:1 é aprovado, mas não sobrevive a um
 * "clareia um pouquinho".
 */
export const contrastPairs: ContrastPair[] = [
  /* --------------------------------------------------------------- texto */
  { name: "texto principal sobre superfície", foreground: "#2b235b", background: "#ffffff" }, // 14.05
  { name: "texto principal sobre fundo do app", foreground: "#2b235b", background: "#f0f6f8" }, // 12.88
  { name: "texto secundário sobre superfície", foreground: "rgba(43,35,91,0.72)", background: "#ffffff" }, // 5.79
  { name: "texto secundário sobre fundo do app", foreground: "rgba(43,35,91,0.72)", background: "#f0f6f8" }, // 5.31
  { name: "placeholder sobre superfície", foreground: "rgba(43,35,91,0.66)", background: "#ffffff" }, // 4.80
  // O botão indisponível é alcançável pelo Tab, então não vale a isenção da
  // WCAG 1.4.3 para componentes inativos: ele precisa passar por mérito.
  { name: "rótulo de ação indisponível", foreground: "rgba(43,35,91,0.72)", background: "#f4f6f7" }, // 5.56

  // O anel de foco. Declarado porque ele já chegou ao navegador em branco uma
  // vez — invisível sobre cartão branco, em toda ação primária do produto.
  // WCAG 1.4.11 pede 3:1 para elemento não textual; estes passam com folga no
  // alvo de texto, então ficam na lista normal.
  { name: "anel de foco sobre superfície", foreground: "#6144c5", background: "#ffffff" }, // 6.69
  { name: "anel de foco sobre fundo do app", foreground: "#6144c5", background: "#f0f6f8" }, // 6.12

  /* ---------------------------------------------------------------- ação */
  { name: "link sobre superfície", foreground: "#276e8c", background: "#ffffff" }, // 5.68
  { name: "link sobre fundo do app", foreground: "#276e8c", background: "#f0f6f8" }, // 5.21
  { name: "branco sobre botão de ação", foreground: "#ffffff", background: "#276e8c" }, // 5.68
  { name: "branco sobre botão de ação em hover", foreground: "#ffffff", background: "#1f5a73" }, // 7.28
  { name: "branco sobre acento", foreground: "#ffffff", background: "#6144c5" }, // 6.68

  /* --------------------------------------------------------------- chips */
  { name: "chip confirmado", foreground: "#256a23", background: "#e2f3e1" }, // 5.73
  { name: "chip recusado", foreground: "#902a2a", background: "#fde3e3" }, // 6.77
  { name: "chip em análise", foreground: "#854d0e", background: "#fff8e1" }, // 6.45
  { name: "chip pendente", foreground: "#a8542a", background: "#fdeee1" }, // 4.66
  { name: "chip informativo", foreground: "#086b89", background: "#dbf3fb" }, // 5.25
  { name: "chip neutro", foreground: "#463589", background: "#eae6fb" }, // 8.08

  /* ------------------------------------------------------ drawer escuro */
  { name: "branco sobre drawer", foreground: "#ffffff", background: "#2b235b" }, // 14.05
  { name: "item inativo do drawer", foreground: "#c3bdd7", background: "#2b235b" }, // 7.75
  { name: "acento de marca sobre drawer", foreground: "#58bada", background: "#2b235b" }, // 6.33
];

/**
 * Pares que existem no produto em produção e **não** atingem AA.
 *
 * Ficam registrados aqui, fora da lista validada, por dois motivos: para que a
 * divergência seja verificável em vez de anedótica, e para que o teste possa
 * afirmar que eles realmente falham — se algum dia o produto corrigir a origem,
 * o teste avisa que este registro ficou obsoleto.
 *
 * Ver `docs/decisions/0001-tokens-corrigidos-para-contraste.md`.
 */
export const knownProductionFailures: (ContrastPair & { measured: number; usedFor: string })[] = [
  {
    name: "brand-blue como texto sobre branco",
    foreground: "#58bada",
    background: "#ffffff",
    measured: 2.22,
    usedFor: "CTA primário e ícones no produto",
  },
  {
    name: "branco sobre brand-blue",
    foreground: "#ffffff",
    background: "#58bada",
    measured: 2.22,
    usedFor: "preenchimento de botão primário no produto",
  },
  {
    name: "brand-blue-dark como cor de link",
    foreground: "#4094bb",
    background: "#ffffff",
    measured: 3.4,
    usedFor: "links e títulos h1 no produto",
  },
  {
    name: "fg-2 do produto (alfa 0.6)",
    foreground: "rgba(43,35,91,0.6)",
    background: "#ffffff",
    measured: 4.01,
    usedFor: "texto secundário e breadcrumb no produto",
  },
  {
    name: "fg-3 do produto (alfa 0.45)",
    foreground: "rgba(43,35,91,0.45)",
    background: "#ffffff",
    measured: 2.65,
    usedFor: "placeholder de campo no produto",
  },
  {
    name: "verde do produto sobre branco",
    foreground: "#3db03a",
    background: "#ffffff",
    measured: 2.81,
    usedFor: "indicador positivo e chip de unidade no produto",
  },
];
