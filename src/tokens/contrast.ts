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
  // O `prompt` do `select/1` não fica sobre branco: fica sobre o fundo do campo,
  // que é o mesmo navy a 10% achatado sobre a superfície. A 60% dava 3,75:1 — o
  // defeito que a Central de Transferências trouxe à tona. Ver `Select`.
  { name: "prompt do select sobre o campo", foreground: "rgba(43,35,91,0.72)", background: "#eae9ef" }, // 5.25
  // O rótulo de campo. Mesmo par do link, e é de propósito: `label/1` usava o
  // ciano de assinatura como texto sobre branco (2,22:1) e passou a usar a cor
  // de ação, que é a correção que a decisão 0001 já tinha escrito.
  { name: "rótulo de campo sobre superfície", foreground: "#276e8c", background: "#ffffff" }, // 5.68
  // O botão indisponível é alcançável pelo Tab, então não vale a isenção da
  // WCAG 1.4.3 para componentes inativos: ele precisa passar por mérito.
  { name: "rótulo de ação indisponível", foreground: "rgba(43,35,91,0.72)", background: "#f4f6f7" }, // 5.56

  // O anel de foco. Declarado porque ele já chegou ao navegador em branco uma
  // vez — invisível sobre cartão branco, em toda ação primária do produto.
  // WCAG 1.4.11 pede 3:1 para elemento não textual; estes passam com folga no
  // alvo de texto, então ficam na lista normal.
  { name: "anel de foco sobre superfície", foreground: "#6144c5", background: "#ffffff" }, // 6.69
  { name: "anel de foco sobre fundo do app", foreground: "#6144c5", background: "#f0f6f8" }, // 6.12

  // Célula do mapa fora da agenda padrão: banda de fundo para o estado mais
  // importante do módulo não depender do glifo mais apagado disponível.
  { name: "texto secundário sobre banda ink-50", foreground: "rgba(43,35,91,0.72)", background: "#f0eef5" }, // 5.38

  /* O trilho de `button_tabs/1` e o marcador da aba ativa. O rótulo a 72% do
     navy é o que aprova os dois — ver o comentário em `Tabs.tsx`. */
  { name: "rótulo de aba sobre o trilho", foreground: "rgba(43,35,91,0.72)", background: "#f4f4f7" }, // 5.55
  { name: "rótulo da aba ativa sobre o marcador", foreground: "rgba(43,35,91,0.72)", background: "#c5e3ee" }, // 4.95

  /* ---------------------------------------------------------------- ação */
  { name: "link sobre superfície", foreground: "#276e8c", background: "#ffffff" }, // 5.68
  { name: "link sobre fundo do app", foreground: "#276e8c", background: "#f0f6f8" }, // 5.21
  { name: "branco sobre botão de ação", foreground: "#ffffff", background: "#276e8c" }, // 5.68
  { name: "branco sobre botão de ação em hover", foreground: "#ffffff", background: "#1f5a73" }, // 7.28
  { name: "branco sobre acento", foreground: "#ffffff", background: "#6144c5" }, // 6.68

  /* ----------------------------------------------------------- etiquetas
     `tag/1` com o fundo do produto e o texto escurecido para o tom da família.
     `light-blue` e `red` caem exatamente nos pares de chip declarados abaixo —
     `--color-blue-light` é o mesmo valor de `--color-info-bg`, e
     `--color-red-light` o mesmo de `--color-danger-bg` —, então só as três que
     não coincidem entram aqui. Os fundos vêm achatados sobre o branco, porque um
     par declarado com alfa mediria contra o que estivesse atrás. */
  { name: "etiqueta green do tag/1", foreground: "#256a23", background: "#e7f4d1" }, // 5.77
  { name: "etiqueta orange do tag/1", foreground: "#854d0e", background: "#fcebdf" }, // 5.90
  { name: "etiqueta yellow do tag/1", foreground: "#854d0e", background: "#fff3cc" }, // 6.18
  { name: "etiqueta purple do tag/1", foreground: "#ffffff", background: "#7459e4" }, // 4.89
  /* As invertidas deste produto: fundo no tom escuro, texto no tom claro. */
  { name: "etiqueta solid-red do produto", foreground: "#fde3e3", background: "#902a2a" }, // 6.77
  { name: "etiqueta solid-green do produto", foreground: "#e2f3e1", background: "#256a23" }, // 5.73
  { name: "etiqueta solid-orange do produto", foreground: "#ffffff", background: "#854d0e" }, // 6.85
  { name: "etiqueta solid-yellow do produto", foreground: "#000000", background: "#ffc402" }, // 13.15
  { name: "etiqueta solid-brand do produto", foreground: "#ffffff", background: "#2b235b" }, // 14.05

  /* --------------------------------------------------------------- chips */
  { name: "chip confirmado", foreground: "#256a23", background: "#e2f3e1" }, // 5.73
  { name: "chip recusado", foreground: "#902a2a", background: "#fde3e3" }, // 6.77
  { name: "chip em análise", foreground: "#854d0e", background: "#fff8e1" }, // 6.45
  { name: "chip pendente", foreground: "#a8542a", background: "#fdeee1" }, // 4.66
  { name: "chip informativo", foreground: "#086b89", background: "#dbf3fb" }, // 5.25
  { name: "chip neutro", foreground: "#463589", background: "#eae6fb" }, // 8.08

  /* ------------------------------------- números de destaque do sistema
     `info_card/1` mostra o número em 20px extrabold, que é texto grande: o
     limiar é 3:1. Das cinco variantes, estas duas passam e a laranja não —
     ela está registrada como divergência. */
  { name: "número roxo do info_card", foreground: "#6144c5", background: "#ffffff", largeText: true }, // 6.68
  { name: "número azul do info_card", foreground: "#4094bb", background: "#ffffff", largeText: true }, // 3.40

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
  /*
   * O azul cheio como contorno da linha selecionada, sobre o preenchimento claro
   * dela: 2,47:1, abaixo dos 3:1 que a 1.4.11 pede para indicador de estado.
   *
   * Escolha de design, registrada na segunda passada da decisão 0016. O estado
   * não está só na borda: o preenchimento troca de família junto — cinza-lavanda
   * para ciano-claro — e o `aria-pressed` diz o que a cor diz.
   */
  {
    name: "azul cheio como contorno de selecionado",
    foreground: "#0eb2e5",
    background: "#ffffff",
    measured: 2.47,
    usedFor: "linha selecionada das três colunas da Supervisão, e a barra de assinatura",
  },
  /*
   * As cinco variantes de sinal do `tag/1` **saíram desta lista** em 2026-08-26.
   *
   * Elas estiveram aqui: `light-blue` em 2,14, `red` em 3,05, `green` em 2,46,
   * `orange` em 2,93 e `yellow` em 2,05 — a etiqueta é 14px em negrito, então o
   * limiar é 4,5. Eram divergência assumida, com o argumento de que a cor de
   * sinal do produto valia mais que a razão.
   *
   * O argumento caiu quando ficou claro que só o **texto** carregava a
   * divergência: mantendo o fundo do produto e escurecendo o texto para o tom da
   * própria família, as cinco passam AA e a cor de sinal continua sendo a do
   * produto. É a decisão 0001 aplicada onde a decisão 0016 tinha apontado, e os
   * pares corrigidos estão em `contrastPairs`, na seção de etiquetas.
   *
   * Ficam registradas aqui por nome, e não por entrada: o par que falha é o do
   * monólito, e o Design Space não usa mais nenhum deles.
   */
  /*
   * O cabeçalho do backoffice, portado por inteiro em 2026-08-25.
   *
   * As três medidas saem do navegador, com a transparência achatada sobre o
   * branco. Nenhuma delas é alcançada pelo axe hoje, e é justamente por isso que
   * elas estão aqui: o nome da pessoa aparece em toda tela e o axe o aprova por
   * medir 16px como se fosse texto grande; o link do breadcrumb só existe em
   * trilha de dois níveis, que nenhuma situação ativa tem ainda; e o sino é um
   * glifo de fonte num `span` sem texto, que a regra de contraste ignora.
   *
   * Medir sem ser obrigado é o ponto: sem estas entradas, os três só apareceriam
   * no dia em que alguém abrisse uma tela nova e se perguntasse por que o
   * cabeçalho está apagado.
   */
  {
    name: "link do breadcrumb do sistema",
    foreground: "rgba(43,35,91,0.5)",
    background: "#ffffff",
    measured: 3.03,
    usedFor: "breadcrumbs/1 — nível anterior da trilha, 14px semibold",
  },
  {
    name: "chevron separador do breadcrumb",
    foreground: "rgba(43,35,91,0.3)",
    background: "#ffffff",
    measured: 1.85,
    usedFor: "breadcrumbs/1 — separador entre níveis, decorativo",
  },
  {
    name: "sino de notificações do sistema",
    foreground: "#f58d37",
    background: "#fde8d7",
    measured: 2.02,
    usedFor: "NotificationComponent — ícone sobre o quadrado laranja do cabeçalho",
  },
  /*
   * O número laranja de `info_card/1`, no indicador de faltas da Supervisão.
   *
   * O número é 20px extrabold, então o limiar é o de texto grande — 3:1, e não
   * 4,5. `orange` fica em **2,94 sobre branco** e perde por 0,06. É a única das
   * cinco variantes do componente que reprova nesse limiar: `accent` dá 6,68 e
   * `blue` dá 3,40, e as duas estão na lista validada acima.
   *
   * Os cartões eram tingidos e isso derrubava também o azul, para 2,95. Com o
   * fundo branco sobrou uma reprovação em vez de duas — ver decisão 0016.
   */
  {
    name: "número laranja do info_card sobre cartão branco",
    foreground: "#e17c38",
    background: "#ffffff",
    largeText: true,
    measured: 2.94,
    usedFor: "info_card/1 variante orange — indicador Faltas da Supervisão",
  },
];
