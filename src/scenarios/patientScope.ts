import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do escopo de pacientes.
 *
 * Quem vê quem é a decisão de maior consequência do sistema. As cláusulas são
 * casadas na ordem, e um papel aparece em duas.
 */
export const patientScopeScenarios: Scenario[] = [
  {
    id: "team.patient-scope-contradiction",
    title: "O código diz duas regras para o mesmo papel",
    intent:
      "Pôr as duas leituras lado a lado, porque a contradição só existe quando as duas estão visíveis juntas.",
    route: "/team/patient-scope",
    persona: "admin",
    fixture: "patient-scope-all-roles",
    rules: ["supervisor-is-listed-in-a-clause-that-never-runs"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "O alcance de cada papel é dito em palavras na etiqueta, não por cor.",
    },
    status: "ported",
    preconditions: [
      "`PatientPolicy.scope/2` casa cláusulas na ordem em que estão escritas.",
      "`supervisor` aparece na cláusula por unidade e, depois, numa lista por agendas.",
    ],
    expected: [
      "O que acontece e o que o código também afirma aparecem juntos.",
      "O alcance é dito em pessoas, e não em nome de tabela.",
      "A tela diz que o problema não é qual regra vale.",
    ],
    tags: ["regra", "risco", "decisão"],
  },
  {
    id: "team.patient-scope-empty-is-deliberate",
    title: "“Nenhum paciente” escrito como condição impossível",
    intent:
      "Separar a decisão correta da forma obscura de escrevê-la, porque na dúvida ninguém mexe.",
    route: "/team/patient-scope",
    persona: "admin",
    fixture: "patient-scope-all-roles",
    rules: ["seeing-nothing-is-written-as-an-impossible-condition"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["O papel de pessoas é escopado com uma busca por identificador nulo."],
    expected: [
      "A tela diz que o resultado está certo e a intenção precisa ser deduzida.",
      "A tela separa “quisemos zero” de “a condição está errada”.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "team.patient-scope-unknown-role-raises",
    title: "Um papel sem regra derruba a tela, e isso está certo",
    intent:
      "Marcar o comportamento seguro como acerto, para que a correção intuitiva não o desfaça.",
    route: "/team/patient-scope",
    persona: "admin",
    fixture: "patient-scope-all-roles",
    rules: ["an-unknown-role-raises-instead-of-seeing-everything"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["Não há cláusula final em `PatientPolicy.scope/2`."],
    expected: [
      "O caso aparece com tom de acerto, e não de defeito.",
      "A tela nomeia a correção perigosa e diz por que não fazê-la.",
    ],
    tags: ["sucesso", "regra"],
  },
  {
    id: "team.patient-scope-without-the-dead-clause",
    title: "Sem a cláusula morta, o comportamento é o mesmo",
    intent:
      "Mostrar que remover a contradição não muda quem vê quem — muda quem consegue conferir.",
    route: "/team/patient-scope",
    persona: "admin",
    fixture: "patient-scope-no-contradiction",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "O aviso de contradição não aparece.",
      "O alcance da supervisão continua sendo o da unidade.",
    ],
    tags: ["sucesso"],
  },
];
