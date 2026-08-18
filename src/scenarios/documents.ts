import type { Scenario } from "@brucesantos/design-space";

/**
 * Documentos — três frentes da mesma tarefa.
 *
 * Cada uma é um fluxo, e não uma tela: o profissional começa na lista e abre a
 * pasta de quem for clicado. As variações — vencido, a vencer, sem arquivo,
 * descredenciado, vazio — ficam no seletor de dados do rodapé.
 */
export const documentScenarios: Scenario[] = [
  {
    id: "documents.professional",
    title: "Profissional",
    intent:
      "Da lista da equipe à pasta de uma pessoa: o que existe, o que falta, o que está prestes a vencer e o que a operadora já enxerga.",
    route: "/team/documentation",
    persona: "people",
    fixture: "docs-team-matrix",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A lista alterna entre Profissionais e Documentação sem trocar de página.",
      "Clicar num profissional abre a pasta dele.",
      "Na pasta, os sete tipos padrão aparecem — os sem arquivo, como lacuna.",
      "O credenciamento é consequência dos documentos, e não um campo digitado.",
    ],
    tags: ["lista", "regra", "permissão"],
  },
  {
    id: "documents.insurer",
    title: "Operadora",
    intent:
      "A clínica vista pelo convênio: quem está credenciado, o que falta e quais unidades ele aceita.",
    route: "/insurers/unimed/documents",
    persona: "admin",
    fixture: "docs-insurer-unimed",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A tabela traz carga em ABA, formações especiais e credenciamento por profissional.",
      "O escopo alterna entre Profissionais e Unidades sem sair da aba.",
      "Quem não tem vínculo aparece como não credenciado, com a ação de habilitar.",
    ],
    tags: ["lista", "exceção"],
  },
  {
    id: "documents.unit",
    title: "Unidade",
    intent:
      "Da lista de unidades à pasta de uma delas: os doze documentos que a vigilância cobra, incluindo os que ainda não existem.",
    route: "/structure/documents",
    persona: "operation",
    fixture: "docs-unit-list",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A lista traz nome, CNPJ, CNES, endereço, cidade e se está ativa.",
      "Clicar numa unidade abre a pasta de documentos dela.",
      "A licença que ainda não entrou em vigência aparece como Aguardando vigência.",
      "O documento que nunca foi anexado aparece como lacuna, com a ação de anexar.",
      "Um documento vencido segura o credenciamento da unidade inteira.",
    ],
    tags: ["lista", "regra", "exceção"],
  },
];
