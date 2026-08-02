import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários de Pacientes.
 *
 * O par mais importante aqui é `patients.restricted-record` e
 * `patients.restricted-record-professional`: mesma tela, mesma fixture, personas
 * diferentes. É o jeito de discutir uma regra de acesso sem inventar duas telas
 * que depois divergem.
 */
export const patientScenarios: Scenario[] = [
  {
    id: "patients.list",
    title: "Lista de pacientes",
    intent: "Saber, antes de abrir o cadastro, quem pode ser agendado.",
    route: "/patients",
    persona: "attendant",
    fixture: "patients-roster",
    rules: ["incomplete-registration-blocks-scheduling"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "A situação do cadastro tem rótulo e a pendência é nomeada na própria linha.",
    },
    status: "in-review",
    expected: [
      "Cada linha diz se o cadastro está completo e, se não, o que falta.",
      "Prontuário restrito é sinalizado na lista, não só no detalhe.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "patients.empty",
    title: "Nenhum paciente cadastrado",
    intent: "Definir o primeiro acesso de uma unidade nova.",
    route: "/patients",
    persona: "attendant",
    fixture: "patients-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: ["A tela explica de onde vêm os cadastros."],
    tags: ["vazio"],
  },
  {
    id: "patients.complete",
    title: "Cadastro completo",
    intent: "Referência do caminho sem pendência: é o contraste dos outros cenários.",
    route: "/patients/pt-1",
    persona: "attendant",
    fixture: "patients-roster",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    actions: ["Agendar atendimento"],
    expected: [
      "Agendar está disponível.",
      "Nenhum aviso de pendência aparece.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "patients.incomplete",
    title: "Cadastro incompleto",
    intent:
      "Definir como a pendência é comunicada para que a recepção resolva com o paciente ainda presente.",
    route: "/patients/pt-2",
    persona: "attendant",
    fixture: "patients-roster",
    rules: ["incomplete-registration-blocks-scheduling"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Cadastro sem CPF e sem convênio."],
    expected: [
      "O aviso nomeia os campos que faltam, não diz apenas «cadastro incompleto».",
      "Agendar fica indisponível, com o motivo e a lista de pendências.",
      "Os campos vazios dizem «não informado», em vez de exibir um traço ambíguo.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "patients.minor-without-guardian",
    title: "Menor sem responsável",
    intent:
      "Separar duas pendências que parecem uma: a lista de campos obrigatórios está completa e ainda assim o agendamento é bloqueado.",
    route: "/patients/pt-4",
    persona: "attendant",
    fixture: "patients-roster",
    rules: ["minor-requires-guardian", "incomplete-registration-blocks-scheduling"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Paciente de 14 anos, cadastro sem responsável legal."],
    expected: [
      "O aviso explica que consentimento e cobrança dependem do responsável.",
      "O bloco de responsável legal aparece vazio, com instrução do que cadastrar.",
      "Agendar fica indisponível citando a ausência do responsável.",
      "A idade é calculada contra a data de referência do ambiente, não contra o relógio.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "patients.minor-with-guardian",
    title: "Menor com responsável cadastrado",
    intent: "Confirmar que a mesma tela não mostra alarme quando a regra está satisfeita.",
    route: "/patients/pt-7",
    persona: "attendant",
    fixture: "patients-roster",
    rules: ["minor-requires-guardian"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "Os dados do responsável aparecem completos.",
      "Agendar está disponível.",
      "Nenhum aviso de pendência aparece.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "patients.restricted-record",
    title: "Prontuário restrito, perfil da recepção",
    intent:
      "Decidir se a recepção descobre que existe restrição, ou se a restrição também é escondida.",
    route: "/patients/pt-5",
    persona: "attendant",
    fixture: "patients-roster",
    rules: ["restricted-record-requires-permission"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Prontuário restrito a pedido da paciente."],
    expected: [
      "A existência da restrição é visível, com a nota que a explica.",
      "O conteúdo clínico não aparece, e o motivo do bloqueio é informado.",
      "Os dados cadastrais continuam legíveis: a restrição é do prontuário, não do cadastro.",
    ],
    tags: ["permissão", "exceção"],
  },
  {
    id: "patients.restricted-record-professional",
    title: "Prontuário restrito, perfil da profissional",
    intent: "O outro lado da mesma regra, na mesma tela e com a mesma fixture.",
    route: "/patients/pt-5",
    persona: "therapeutic_companion",
    fixture: "patients-roster",
    rules: ["restricted-record-requires-permission"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "O conteúdo do prontuário fica disponível.",
      "Agendar fica indisponível: este perfil lê, não opera a agenda.",
    ],
    tags: ["permissão", "sucesso"],
  },
];
