import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da renovação da janela.
 *
 * `PatientAuthorization` é o período, e não a guia. O worker move a data de
 * fim três meses à frente — e é só isso que ele faz.
 */
export const authorizationRenewalScenarios: Scenario[] = [
  {
    id: "authorizations.renewal-into-empty",
    title: "A janela renova e o saldo continua zero",
    intent:
      "Separar o que a renovação move do que ela não repõe — “autorização renovada” é lido como “o paciente tem sessões de novo”.",
    route: "/authorizations/renewal",
    persona: "operation",
    fixture: "authorization-renewal-mixed",
    rules: [
      "renewing-the-window-does-not-restore-sessions",
      "only-one-window-renews-per-patient",
    ],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "Saldo e renovação automática são etiquetas de texto distintas, nunca só cor.",
    },
    status: "ported",
    preconditions: [
      "`PatientAuthorization` tem `has_many :authorizations` e nenhuma quantidade.",
      "O worker estende `duration_end_at` três meses à frente, e só isso.",
      "Uma das três janelas está com saldo zero.",
    ],
    expected: [
      "A janela que vai renovar vazia é apontada antes de renovar.",
      "Cada linha diz o que a renovação muda e o que ela não muda.",
      "A tela nomeia quem repõe saldo: uma guia nova.",
      "Ligar a renovação numa segunda janela do mesmo paciente fica indisponível, com o motivo.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "authorizations.renewal-with-balance",
    title: "Todas com saldo",
    intent: "Fixar que o aviso cala quando nenhuma janela vai renovar vazia.",
    route: "/authorizations/renewal",
    persona: "operation",
    fixture: "authorization-renewal-all-with-balance",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "Nenhum aviso de renovação vazia aparece.",
      "As linhas continuam dizendo que a renovação não acrescenta sessão.",
    ],
    tags: ["sucesso"],
  },
];
