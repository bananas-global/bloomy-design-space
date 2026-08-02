import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da origem das ausências.
 *
 * Fecham o arco aberto pelo filtro `absence`: o número que o sistema chama de
 * ausência contém três coisas, e a menos parecida com ausência é a que um
 * worker fabrica sozinho.
 */
export const absenceOriginScenarios: Scenario[] = [
  {
    id: "agenda.absence-origins",
    title: "Quinze ausências, e quatro pessoas faltaram",
    intent:
      "Separar as três origens que o sistema soma, e dizer o que cada uma de fato mede.",
    route: "/agenda/absences",
    persona: "clinic_admin",
    fixture: "absence-origin-month",
    rules: [
      "the-absence-number-holds-four-different-things",
      "some-absences-were-never-observed",
      "one-worker-blames-the-patient-by-name",
    ],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "A origem aparece como etiqueta de texto em cada linha, nunca só por cor.",
    },
    status: "in-review",
    preconditions: [
      "O filtro `absence` soma `:missed` e `:cancelled`.",
      "`MarkDelayedSchedulesAsMissedWorker` converte agendamentos parados há sete dias, com motivo `:delay`.",
      "`MissedAttendedWorker` converte na manhã seguinte todo agendamento ainda `:scheduled`, com motivo `:missing_patient`.",
      "Quinze registros em julho: quatro faltas, cinco cancelamentos, seis conversões automáticas.",
    ],
    expected: [
      "A tela abre pela proporção — 27% mede comportamento da família —, e não pelo total.",
      "Cada origem diz o que mede, e não só como se chama.",
      "As conversões automáticas têm aviso próprio, com os dias que ficaram paradas.",
      "A rotina que grava “paciente faltou” é separada da que grava “atraso”.",
    ],
    tags: ["regra", "exceção", "decisão"],
  },
  {
    id: "agenda.absence-all-observed",
    title: "Quando as três origens não se misturam",
    intent: "Fixar que a separação cala quando não há o que separar.",
    route: "/agenda/absences",
    persona: "clinic_admin",
    fixture: "absence-origin-all-observed",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "Nenhum aviso de mistura aparece.",
      "Nenhuma conversão automática é apontada.",
    ],
    tags: ["sucesso"],
  },
];
