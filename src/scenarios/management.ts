import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da gerência.
 *
 * A tela real tem nove abas e é fácil lê-la como painel de indicadores. Estes
 * cenários existem para fixar a outra leitura: cada aba é uma fila de trabalho,
 * com dono e com consequência para o que fica parado.
 */
export const managementScenarios: Scenario[] = [
  {
    id: "management.monday",
    title: "Segunda de manhã",
    intent:
      "Fazer a tela responder “o que é meu e o que acontece se ficar parado” — e não “quantos são”.",
    route: "/management",
    persona: "coordinator",
    fixture: "management-monday",
    rules: ["management-fronts-have-owners", "patient-without-clinical-owner-drifts"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada frente é um item de lista com contagem, título e responsável em texto. Cor não carrega informação sozinha.",
    },
    status: "in-review",
    preconditions: ["Quatro frentes com pendência, na unidade Pinheiros."],
    expected: [
      "Cada frente mostra a contagem, o título e de quem é.",
      "A frente que trava fechamento de sessão aparece destacada das demais.",
      "As seções abaixo detalham cada frente, na mesma ordem.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "management.reports-by-consequence",
    title: "O mais antigo não é o mais urgente",
    intent:
      "Ordenar a fila por consequência do atraso, e dizer qual é a consequência — dois atrasos parecidos custam coisas diferentes.",
    route: "/management",
    persona: "coordinator",
    fixture: "management-reports-overdue",
    rules: ["report-urgency-depends-on-requester"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "Um relatório pedido pela operadora atrasado há 9 dias, e um pedido pela família há 14.",
    ],
    expected: [
      "O da operadora aparece antes, apesar de o da família estar atrasado há mais tempo.",
      "Cada um diz a consequência concreta do atraso, e não um rótulo de severidade.",
      "Quem pediu aparece em cada linha, porque é o que decide a ordem.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "management.mentorship-gap",
    title: "Aplicador sem supervisor",
    intent:
      "Tornar visível antes uma lacuna que hoje aparece semanas depois, como uma pilha de sessões que ninguém pode assinar.",
    route: "/management",
    persona: "coordinator",
    fixture: "management-mentorship-gap",
    rules: ["applicator-without-supervisor-cannot-close"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "Um aplicador sem vínculo de supervisão, e uma supervisora sem nenhum supervisionado.",
    ],
    expected: [
      "O aplicador sem supervisor aparece marcado como travando fechamento de sessão.",
      "A supervisora sem supervisionados aparece sem alarme, com a observação de conferir.",
      "A consequência é escrita: as sessões acontecem e ficam pendentes.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "management.clear",
    title: "Nenhuma pendência",
    intent:
      "Definir a tela que pode ser fechada — que é o que torna as outras acionáveis.",
    route: "/management",
    persona: "coordinator",
    fixture: "management-clear",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A tela afirma que as quatro frentes estão em dia, nomeando-as.",
      "Nada de contagem zerada empilhada: o vazio é uma frase, não quatro zeros.",
    ],
    tags: ["vazio"],
  },
  {
    id: "management.no-access",
    title: "Quem atende não alcança a gerência",
    intent: "Definir o que a terapeuta encontra ao abrir o link da gerência.",
    route: "/management",
    persona: "therapeutic_companion",
    fixture: "management-monday",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["`ManagementPolicy.can?(role, :list)` é de admin, admin de clínica e coordenação."],
    expected: ["A tela nomeia quem alcança a gerência.", "O bloqueio é de permissão, não de dado."],
    tags: ["permissão", "exceção"],
  },
];
