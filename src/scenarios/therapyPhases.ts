import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da fase terapêutica e da inativação.
 *
 * O módulo de pacientes foi escrito antes de o monólito ser lido a fundo e
 * ficou com três regras de cadastro. Faltavam as duas coisas que tornam este
 * cadastro diferente de um cadastro de clínica qualquer: o percurso medido por
 * especialidade, e uma inativação que apaga a agenda futura.
 */
export const therapyPhaseScenarios: Scenario[] = [
  {
    id: "patients.phases-uneven",
    title: "Quatro especialidades, quatro etapas",
    intent:
      "Fixar que a fase pertence ao par paciente + especialidade — e que um campo único obrigaria a escolher qual delas mente.",
    route: "/patients/pac-theo/phases",
    persona: "specialist",
    fixture: "therapy-phases-uneven",
    rules: ["therapy-phase-is-per-specialty", "therapy-phase-requires-nothing"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "O percurso é uma lista ordenada; etapa atual e etapas concluídas têm prefixo em texto acessível, não só peso de fonte.",
    },
    status: "ported",
    preconditions: [
      "`TherapyPhase` pertence a paciente e especialidade, com seis etapas.",
      "Uma das fases foi gravada sem especialidade — o changeset não a exige.",
    ],
    expected: [
      "Cada especialidade tem o próprio percurso, com a etapa atual destacada.",
      "A tela afirma que o percurso não caminhar junto é o normal.",
      "A fase sem especialidade é apontada: ela não some do banco, some da leitura.",
    ],
    tags: ["lista", "regra"],
  },
  {
    id: "patients.phases-all-beginning",
    title: "Tudo em ambientação, e ninguém sabe se foi escolhido",
    intent:
      "Declarar que o valor padrão do campo torna “começando” e “não preenchido” o mesmo dado.",
    route: "/patients/pac-theo/phases",
    persona: "coordinator",
    fixture: "therapy-phases-all-beginning",
    rules: ["phase-defaults-to-the-beginning"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["`step` tem `default: :ambiance` e nenhuma validação."],
    expected: [
      "Cada fase em ambientação recebe a ressalva, junto da etapa.",
      "A tela não resolve a ambiguidade — ela a declara.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "patients.phases-empty",
    title: "Nenhuma fase registrada",
    intent:
      "Separar “sem percurso registrado” de “em ambientação”, que é a confusão que o default cria.",
    route: "/patients/pac-theo/phases",
    persona: "specialist",
    fixture: "therapy-phases-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "A tela nomeia as especialidades em que há atendimento e não há fase.",
      "E explica que a fase é por especialidade, com percursos independentes.",
    ],
    tags: ["vazio"],
  },
  {
    id: "patients.deactivation-impact",
    title: "Inativar cancela a agenda inteira",
    intent:
      "Pôr os números da destruição antes da confirmação, já que nada disso volta ao reativar.",
    route: "/patients/pac-theo/deactivate",
    persona: "clinic_admin",
    fixture: "deactivation-today",
    rules: ["deactivating-cancels-every-future-appointment", "deactivation-cut-is-utc-midnight"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "`ChangePatientStatus` cancela agendamentos num `update_all`, encerra mapas em vigor e desliga a renovação de todos.",
      "Existe um atendimento em 02/08 às 21h30, véspera do corte.",
    ],
    expected: [
      "O resumo traz os números — agendamentos, mapas — antes do botão.",
      "A tela afirma que nada volta ao trocar o status de volta para ativo.",
      "Os agendamentos e os mapas afetados aparecem nomeados, um a um.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "patients.deactivation-eve",
    title: "O corte começa às 21h da véspera",
    intent:
      "Tornar visível um erro de fuso cujo efeito começa antes da data escolhida, onde ninguém procura.",
    route: "/patients/pac-theo/deactivate",
    persona: "clinic_admin",
    fixture: "deactivation-today",
    rules: ["deactivation-cut-is-utc-midnight"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "O corte é `DateTime.new!(deactivation_date, ~T[00:00:00], \"Etc/UTC\")`.",
      "Em Brasília, isso é 21h do dia anterior.",
    ],
    expected: [
      "A tela mostra o corte real com data e hora, e não só a data escolhida.",
      "Os atendimentos apanhados na véspera são listados.",
      "A frase diz o que soa errado: cancelados por inativação num dia em que o paciente estava ativo.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "patients.deactivation-by-worker",
    title: "O caminho automático apaga os vínculos",
    intent:
      "Mostrar que dois códigos com o mesmo objetivo destroem coisas diferentes — e que o mais destrutivo é o que ninguém acompanha.",
    route: "/patients/pac-theo/deactivate",
    persona: "clinic_admin",
    fixture: "deactivation-by-worker",
    rules: ["the-unattended-path-destroys-more", "the-bond-carries-clinical-context"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "`DeactivatePatientWorker` faz `Repo.delete_all` nos vínculos profissional–paciente.",
      "`ChangePatientStatus`, o caminho manual, não os toca.",
      "Dois dos três vínculos têm observação escrita.",
    ],
    expected: [
      "A tela nomeia os vínculos que serão apagados, com as observações.",
      "E diz o que o outro caminho faria com os mesmos vínculos.",
      "A justificativa é dita: famílias em ABA pausam e voltam, e é isso que se procura no retorno.",
    ],
    tags: ["regra", "exceção", "decisão"],
  },
  {
    id: "patients.deactivation-scheduled",
    title: "A data futura não adia a destruição",
    intent:
      "Separar as duas metades da operação: o status espera, a parte irreversível não.",
    route: "/patients/pac-theo/deactivate",
    persona: "clinic_admin",
    fixture: "deactivation-scheduled",
    rules: ["scheduled-deactivation-destroys-now"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "`set_status/2` mantém `active? = true` quando a data de inativação é futura.",
      "`deactivate_patient_callbacks/3` roda sempre que há data, futura ou não.",
    ],
    expected: [
      "A tela afirma que o paciente continua ativo com data futura.",
      "E que o cancelamento acontece agora, ao confirmar.",
      "Quem pediu para adiar recebe o aviso de que a parte destrutiva não adia.",
    ],
    tags: ["exceção", "decisão"],
  },
];
