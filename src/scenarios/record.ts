import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do prontuário.
 *
 * Substituem o modelo de "prontuário restrito" que este repositório tinha e que
 * era invenção. O real é por tipo de documento — e dois dos três tipos não são
 * abertos por ninguém, em papel nenhum.
 *
 * Um dos cenários mostra o sistema atual e a proposta lado a lado, porque a
 * diferença entre eles é sobre honestidade da interface: hoje finalizar uma
 * anamnese incompleta devolve sucesso e não finaliza.
 */
export const recordScenarios: Scenario[] = [
  {
    id: "record.complete",
    title: "Prontuário completo",
    intent:
      "Definir o prontuário em ordem, e tornar visível que dois tipos de documento não são abertos por ninguém.",
    route: "/patients/pac-theo/record",
    persona: "coordinator",
    fixture: "record-complete",
    rules: ["only-clinical-documents-are-visible"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada documento é um item de lista com ação própria. Tipo e validade têm rótulo textual, não só cor.",
    },
    status: "in-review",
    preconditions: ["Quatro documentos dos três tipos, anamnese finalizada."],
    expected: [
      "Documento pessoal e administrativo aparecem listados, com a abertura indisponível.",
      "O motivo diz que nenhum perfil os abre, e sugere outro canal.",
      "Documento clínico abre para este perfil.",
    ],
    tags: ["lista", "permissão"],
  },
  {
    id: "record.document-not-openable",
    title: "Documento que ninguém abre",
    intent:
      "Impedir que a recepção peça de novo à família um documento que já foi entregue — o registro fica, o conteúdo não.",
    route: "/patients/pac-theo/record",
    persona: "therapeutic_companion",
    fixture: "record-complete",
    rules: ["only-clinical-documents-are-visible"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`PatientPolicy.can?/3` só tem cláusula permissiva para `:clinical`; os outros caem no `false` final.",
    ],
    expected: [
      "O documento continua listado, com nome e tipo.",
      "Abrir aparece indisponível, com o motivo.",
      "A negativa distingue “nenhum perfil abre” de “seu perfil não abre”.",
    ],
    tags: ["permissão", "regra"],
  },
  {
    id: "record.documents-expiring",
    title: "Documentos vencendo e vencido",
    intent:
      "Tornar o vencimento acionável antes de ele parar o atendimento — e mostrar que o prazo de aviso é por documento.",
    route: "/patients/pac-theo/record",
    persona: "coordinator",
    fixture: "record-documents-expiring",
    rules: ["documents-warn-before-expiring"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "Laudo a 13 dias do vencimento com aviso de 60 dias; carteirinha a 6 dias com aviso de 15; autorização já vencida.",
    ],
    expected: [
      "O aviso do topo nomeia os documentos que exigem atenção.",
      "Cada documento mostra quantos dias faltam, ou há quantos venceu.",
      "O prazo de aviso configurado aparece junto da validade.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "record.anamnese-incomplete",
    title: "Anamnese incompleta",
    intent:
      "Mostrar lado a lado o que o sistema faz hoje e o que esta especificação propõe — a diferença é sobre a interface mentir ou não.",
    route: "/patients/pac-theo/record",
    persona: "coordinator",
    fixture: "record-anamnese-incomplete",
    rules: ["anamnese-cannot-finish-incomplete"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "Dois dos quatro campos de comportamento em branco — um deles preenchido só com espaços.",
      "`keep_pending_until_required_fields/1` devolve o status para pendente dentro do changeset, sem erro.",
    ],
    expected: [
      "A tela nomeia os campos que faltam.",
      "Finalizar aparece indisponível, com o motivo.",
      "Um aviso separado descreve o comportamento atual do sistema: sucesso relatado, anamnese ainda pendente.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "record.absence-alerts",
    title: "Critérios de falta estourados",
    intent:
      "Tornar visível que o limite de falta é do paciente, e não da clínica — o mesmo número alarma um e não alarma outro.",
    route: "/patients/pac-theo/record",
    persona: "coordinator",
    fixture: "record-absence-alerts",
    rules: ["absence-alerts-are-per-patient"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Quatro faltas seguidas contra limite de três; sete no período contra seis."],
    expected: [
      "Cada critério estourado vira uma linha do aviso, com o número e o limite.",
      "A frequência abaixo do previsto também alerta.",
      "Os limites aparecem na tela ao lado do que aconteceu.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "record.no-criteria",
    title: "Paciente sem critérios de alerta",
    intent:
      "Definir o que acontece quando ninguém configurou os limites — e deixar claro que não há padrão da clínica.",
    route: "/patients/pac-theo/record",
    persona: "coordinator",
    fixture: "record-no-criteria",
    rules: ["absence-alerts-are-per-patient"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "Nenhum alerta de falta é emitido.",
      "A tela diz que não há critério configurado, e que não existe padrão da clínica.",
    ],
    tags: ["vazio", "regra"],
  },
  {
    id: "record.no-access",
    title: "A recepção não alcança o prontuário",
    intent: "Definir o que a recepção encontra ao abrir o link do prontuário.",
    route: "/patients/pac-theo/record",
    persona: "attendant",
    fixture: "record-complete",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`patients.see_clinic_overview` exclui `operation` e `attendant` por lista negativa.",
    ],
    expected: [
      "A tela nomeia quem não alcança a visão clínica.",
      "O bloqueio é de permissão, não de dado.",
    ],
    tags: ["permissão", "exceção"],
  },
];
