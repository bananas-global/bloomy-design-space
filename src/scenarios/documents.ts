import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da documentação — um por tela.
 *
 * As variações (vencido, a vencer, sem arquivo, descredenciado, vazio) são
 * trocas de dados na mesma tela, no seletor do rodapé. Elas não viram item na
 * lista: vinte irmãos para cinco telas fazem quem abre o link não saber por onde
 * começar.
 */
export const documentScenarios: Scenario[] = [
  {
    id: "team.docs-folder",
    title: "Documentos do profissional",
    intent:
      "A pasta de um profissional: o que existe, o que falta, o que está prestes a vencer e o que a operadora já enxerga.",
    route: "/team/prof-marina/documents",
    persona: "people",
    fixture: "docs-professional-complete",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "Os sete tipos padrão aparecem, e os que não têm arquivo aparecem como lacuna.",
      "Cada documento diz com quais operadoras foi compartilhado.",
      "O credenciamento é consequência dos documentos, e não um campo digitado.",
      "Trocar os dados no rodapé mostra vencido, a vencer, sem arquivo, descredenciado e pasta vazia.",
    ],
    tags: ["lista", "regra", "exceção"],
  },
  {
    id: "team.docs-team-matrix",
    title: "Documentação da equipe",
    intent:
      "A lista de profissionais na visão Documentação: completude e pendências por escopo, para saber por quem começar.",
    route: "/team/documentation",
    persona: "people",
    fixture: "docs-team-matrix",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "O alternador troca entre a lista de profissionais e a documentação, sem trocar de página.",
      "Cada escopo mostra o resumo por situação, ou “em dia” quando não há pendência.",
      "Quem atende não alcança a tela: o bloqueio é de permissão.",
    ],
    tags: ["lista", "permissão"],
  },
  {
    id: "team.deactivation",
    title: "Inativar um profissional",
    intent:
      "A saída marcada com data, e o destino dos pacientes em atendimento — a etapa que não pode ser resolvida depois.",
    route: "/team/prof-saindo/deactivate",
    persona: "people",
    fixture: "professional-deactivation-caseload",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "Confirmar fica indisponível enquanto houver paciente sem destino, com o motivo dito.",
      "Quem já tem saída marcada não aparece como substituto.",
      "Cancelar as sessões é a outra saída, e diz quantos atendimentos caem.",
      "Trocar os dados no rodapé mostra a inativação já marcada e a saída sem caseload.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "health-cares.docs",
    title: "Documentos da operadora",
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
    id: "structure.docs-unit",
    title: "Documentos da unidade",
    intent: "Os doze documentos que a vigilância cobra, incluindo os que ainda não existem.",
    route: "/structure/documents",
    persona: "operation",
    fixture: "docs-unit-blocked",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A licença que ainda não entrou em vigência aparece como Aguardando vigência.",
      "O documento que nunca foi anexado aparece como lacuna, com a ação de anexar.",
      "Um documento vencido segura o credenciamento da unidade inteira.",
      "Trocar os dados no rodapé mostra a unidade recém-aberta.",
    ],
    tags: ["lista", "regra", "exceção"],
  },
];
