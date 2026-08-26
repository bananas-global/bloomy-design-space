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
    rules: ["supervision-defaults-to-the-past", "today-is-measured-in-utc"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "O estado da supervisão tem rótulo textual além da cor. O período é anunciado por extenso, não só pelas duas datas.",
    },
    status: "ported",
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
    status: "ported",
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
    status: "ported",
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
    status: "ported",
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
    status: "ported",
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
    status: "ported",
    expected: [
      "A tela diz que nada dos supervisionados desta pessoa caiu na janela.",
      "E sugere o próximo passo: ampliar o período ou olhar para a frente.",
    ],
    tags: ["vazio"],
  },

  /* ================================================================== *
   * A equipe de supervisão — proposta
   * ================================================================== */

  /**
   * Uma situação, três conjuntos de dados.
   *
   * A tela é uma só, e as variações dela — a carteira travada de quem
   * supervisiona, a fila vazia — são **dados**, não situações diferentes. Quatro
   * cenários apontando para a mesma rota davam quatro entradas na navegação para
   * a mesma tela, e quem revisa perdia o que separa uma da outra. As variações
   * ficam no seletor de dados, como nas três frentes de Documentos.
   */
  {
    id: "supervision.team",
    title: "A equipe de supervisão, pelas três pontas da relação",
    intent:
      "Verificar a supervisão desenhada como relação de três pontas: se ela responde as perguntas que a lista de supervisores não responde, se o alcance de cada coluna segue a permissão de quem abriu, e se a segunda assinatura continua sendo um ato de leitura.",
    route: "/supervision/team",
    persona: "coordinator",
    fixture: "supervision-team",
    rules: [
      "supervision-is-a-three-sided-relation",
      "supervision-selection-drops-what-stopped-holding",
      "supervision-queue-follows-the-selected-scope",
      "supervision-signature-is-reviewed-one-at-a-time",
      "supervision-scope-is-locked-for-who-supervises",
      "supervision-column-has-its-own-permission",
      "supervision-needs-two-of-the-three-columns",
    ],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      announces: ["signature.result"],
      notes:
        "Cada coluna é uma região nomeada com um grupo de botões de alternância, e `aria-pressed` diz o que está selecionado. A fila e os pontos de atenção têm rótulo textual além do número; a situação do atendimento e a tendência do programa têm rótulo e ícone. As cinco etiquetas usam a paleta de `tag/1`, que reprova o contraste, e os pares estão registrados como divergência. No drawer, o trilho é leitura — o andamento vai por texto (\"4 de 7\") e quem navega são duas setas rotuladas. O drawer e o resumo prendem o foco e fecham com Esc.",
    },
    status: "proposed",
    preconditions: [
      "Cinco supervisores, oito aplicadores, doze pacientes e trinta atendimentos.",
      "Sete atendimentos esperando a segunda assinatura, espalhados por cinco aplicadores.",
      "Uma aplicadora nunca foi supervisionada; outra está há trinta e quatro dias sem supervisão.",
      "Três conjuntos de dados no seletor: a equipe inteira, a fila de assinaturas já vazia, e o supervisor recém-designado sem nenhum vínculo.",
    ],
    actions: [
      "Selecionar um supervisor, um aplicador ou um paciente em qualquer coluna.",
      "Remover uma marca de filtro, ou limpar todas.",
      "Abrir a fila de revisão, assinar e avançar, ou pular o atendimento.",
      "Abrir o registro de uma sessão qualquer pelo link da linha, inclusive de uma que não espera assinatura.",
      "Trocar a persona para ver o alcance mudar de coluna.",
    ],
    expected: [
      "Selecionar um supervisor filtra aplicadores e pacientes, e os indicadores passam a contar só a carteira dele.",
      "Selecionar um aplicador revela o supervisor dele na coluna da esquerda, em vez de manter o que estava.",
      "Selecionar um paciente mostra quem o atende e de quem é a assinatura de cada um — a pergunta que a tela atual não tem por onde receber.",
      "Uma seleção incompatível com a anterior apaga a anterior, em vez de produzir “nenhum resultado”.",
      "O lote abre um atendimento por vez, com as tentativas de cada programa, a observação de quem aplicou e os registros de comportamento; assinar avança e derruba a fila, e pular não assina.",
      "Quando a fila acaba, o painel fecha e o resumo aparece centrado, contando quantos foram assinados e quantos seguem pendentes.",
      "O link do registro abre o mesmo painel para uma sessão que não espera assinatura, e nele o rodapé diz que não há assinatura a dar em vez de oferecer o botão.",
      "Com a persona de quem supervisiona, a coluna de supervisores não existe e limpar os filtros volta para os vínculos dele, não para a clínica — quem diz de quem é a carteira é o painel de detalhe, não um aviso.",
      "Admin, admin de clínica e coordenação veem três colunas; a recepção vê duas, sem supervisores; People, Operação e quem é supervisionado não abrem a tela e são mandados para onde a pergunta que sobrou é respondida.",
      "Com a fila vazia, a barra diz que não há assinatura pendente e os pontos de atenção continuam ali — guia vencendo, programa estagnado, faltas e a aplicadora que nunca foi supervisionada.",
    ],
    tags: ["sucesso", "regra", "permissão", "vazio", "decisão"],
  },
];
