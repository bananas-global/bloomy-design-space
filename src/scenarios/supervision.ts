import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da supervisão.
 *
 * O módulo existe por causa de uma linha de política: `list_supervisor` é de
 * admin, admin de clínica e coordenação, e o papel `supervisor` não está lá. A
 * tela que leva o nome dele não abre para ele. Tudo o mais no módulo decorre de
 * levar essa frase a sério em vez de tratá-la como engano.
 */
export const supervisionScenarios: Scenario[] = [
  {
    id: "supervision.default-period",
    title: "A tela abre olhando 30 dias para trás",
    intent:
      "Tornar visível que o padrão é auditoria, e não acompanhamento — e que as duas coisas pedem janelas opostas.",
    route: "/supervision",
    persona: "coordinator",
    fixture: "supervision-default-period",
    rules: ["supervision-defaults-to-the-past"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "O estado da supervisão tem rótulo textual além da cor. O período é anunciado por extenso, não só pelas duas datas.",
    },
    status: "in-review",
    preconditions: [
      "`Date.shift(Date.utc_today(), day: -30)` monta o intervalo inicial.",
      "Na data de referência do Design Space, isso é 30/06 a 30/07.",
    ],
    expected: [
      "A tela diz que este período olha só para trás.",
      "E que é o padrão do sistema, não uma escolha de quem abriu.",
      "Nenhum atendimento futuro aparece, porque nenhum cabe na janela.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "supervision.awaiting-signature",
    title: "Três atendimentos parados esperando assinatura",
    intent:
      "Trazer para a tela de supervisão o único efeito mecânico do vínculo — que hoje não aparece nela.",
    route: "/supervision",
    persona: "coordinator",
    fixture: "supervision-default-period",
    rules: ["supervision-table-omits-supervision"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "A tabela real mostra serviço, profissional, paciente, sala, horário e situação.",
      "Nenhuma dessas colunas diz se a segunda assinatura está pendente.",
    ],
    expected: [
      "O estado da supervisão é a primeira informação de cada linha.",
      "Os que esperam o supervisor mostram há quantos dias estão parados.",
      "Os que esperam quem atendeu são separados: a cobrança tem outro destinatário.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "supervision.not-for-the-supervisor",
    title: "A tela que leva o nome dele não abre para ele",
    intent:
      "Declarar a política como ela é, e mandar quem não passa por ela para onde a tarefa de fato acontece.",
    route: "/supervision",
    persona: "supervisor",
    fixture: "supervision-as-supervisor",
    rules: ["supervision-screen-is-not-for-the-supervisor"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`ProfessionalPolicy.can?(role, :list_supervisor)` lista admin, clinic_admin e coordinator.",
      "O papel `supervisor` não está na lista.",
    ],
    expected: [
      "A tela explica que é uma visão da coordenação, e não do supervisor.",
      "E diz por onde ele acompanha os casos dele: pelo atendimento, onde a assinatura é pedida.",
      "Um “sem permissão” seco deixaria a pessoa procurando — o destino faz parte da recusa.",
    ],
    tags: ["permissão", "exceção"],
  },
  {
    id: "supervision.supervisor-without-links",
    title: "A supervisora recém-designada some da lista",
    intent:
      "Mostrar o efeito colateral de derivar a lista do vínculo em vez do papel, sem corrigi-lo em silêncio.",
    route: "/supervision",
    persona: "clinic_admin",
    fixture: "supervision-supervisor-without-links",
    rules: ["supervisor-is-derived-from-links"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`load_professionals/2` força `has_supervisor_internships: true`.",
      "Iara tem o papel de supervisor e nenhum supervisionado.",
    ],
    expected: [
      "A lista mostra só quem tem vínculo, como no sistema real.",
      "Quem ficou de fora é nomeado, com o motivo.",
      "A tela diz que derivar do vínculo é a escolha certa, e qual é o preço.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "supervision.forward-period",
    title: "O mesmo mês, olhando para a frente",
    intent:
      "Contrastar com o padrão: com a janela virada, a tela deixa de conferir e passa a servir para decidir onde estar.",
    route: "/supervision",
    persona: "coordinator",
    fixture: "supervision-forward-period",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    preconditions: ["O período foi trocado à mão para 30/07 a 14/08."],
    expected: [
      "A tela diz que este período alcança o que ainda vai acontecer.",
      "Os atendimentos futuros aparecem como “Ainda não atendido”, e não como pendência.",
      "O que não exige segunda assinatura é marcado como tal, e não some.",
    ],
    tags: ["sucesso", "decisão"],
  },
  {
    id: "supervision.empty-period",
    title: "Nenhum atendimento do supervisionado na janela",
    intent: "Definir o vazio de forma acionável, em vez de terminar a conversa.",
    route: "/supervision",
    persona: "coordinator",
    fixture: "supervision-empty-period",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A tela diz que nada dos supervisionados desta pessoa caiu na janela.",
      "E sugere o próximo passo: ampliar o período ou olhar para a frente.",
    ],
    tags: ["vazio"],
  },
];
