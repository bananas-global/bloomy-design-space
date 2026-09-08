import type { Scenario } from "@brucesantos/design-space";

/** Uma entrada para comunicados, NPS e biblioteca, com seus critérios reunidos. */
export const pushScenarios: Scenario[] = [
  /* ======================================================== o comunicado */
  {
    id: "push.broadcast",
    title: "Central de PUSH",
    intent:
      "Fixar a leitura básica da área: o comunicado é mão única, o público é uma definição e não uma lista, e entrega, visualização e ciência são três coisas diferentes. Validar o bloqueio por variável sem valor e a fila de NPS, que só é resolvida por tratativa registrada.",
    route: "/push",
    persona: "clinic_admin",
    fixture: "push-day",
    rules: [
      "the-audience-is-recalculated-at-send-time",
      "who-cannot-receive-is-named-before-and-after-sending",
      "a-resend-reaches-only-who-has-not-seen-it",
      "a-variable-left-unfilled-cannot-be-sent",
      "a-detractor-leaves-the-queue-only-by-a-recorded-treatment",
      "the-nps-band-is-said-in-words",
    ],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada comunicado é um item de lista alcançável por Tab, e abrir o detalhe é o mesmo botão que o nome do comunicado. No painel de novo comunicado, Enviar não sai da ordem de foco quando bloqueado: usa `aria-disabled` com o motivo associado por `aria-describedby`, como manda a decisão 0006 do motor, e o motivo aparece também junto da mensagem, que é onde os olhos estão. As barras de visualização e de ciência trazem o percentual por extenso ao lado — a barra sozinha não é lida por ninguém. O que a tela acabou de fazer é anunciado por `role=\"status\"`.",
      announces: [
        "Comunicado enviado para {n} responsáveis.",
        "Reenviado para {n} responsáveis que ainda não visualizaram.",
        "Agendamento cancelado. O comunicado não será disparado.",
        "Contato assumido com {nome}. A resposta continua na fila até a tratativa ser concluída.",
        "Tratativa de {nome} concluída. A resposta sai da fila de detratores.",
        "Pesquisa enviada para {n} responsáveis. A leitura começa vazia até a primeira resposta.",
      ],
    },
    status: "proposed",
    preconditions: [
      "A data de referência é 30/07/2026 e a hora é 10:40, declaradas na fixture.",
      "Doze responsáveis na base: dois sem aplicativo instalado e dois com a notificação desligada no aparelho.",
      "Cinco comunicados enviados e dois agendados — o primeiro deles para 31/07 às 07:30.",
      "O painel de novo comunicado abre no tipo Aviso operacional, com o modelo “Feriado — unidade fechada” já escolhido e o valor de {data} em branco.",
      "Três pesquisas enviadas para os doze responsáveis; a aberta é a de julho, com nove respostas.",
      "A pesquisa de julho tem três detratores: um resolvido, um em contato e um sem tratativa.",
      "Duas famílias sem aplicativo estão entre os destinatários e não responderam.",
    ],
    expected: [
      "A ação de criação mantém tamanho e posição nas três abas. Na biblioteca, Novo abre Novo modelo e Novo segmento por teclado, com Escape devolvendo o foco ao gatilho.",
      "Os dois agendados aparecem antes dos enviados, e não misturados por data.",
      "Cada comunicado enviado mostra a taxa de visualização com o número por extenso, e a de ciência só quando a ciência foi pedida.",
      "O comunicado de cobrança de guia mostra a falha de entrega com a razão — token de push expirado —, separada de quem simplesmente não abriu.",
      "O detalhe do agendado diz que o público será recalculado no disparo, e nomeia o recorte em vez de listar destinatários.",
      "Na seleção manual, checkboxes permitem escolher responsáveis; buscar por responsável ou paciente restringe a lista, e selecionar ou desmarcar os resultados preserva a seleção fora da busca.",
      "No público, a contagem separa quem está sem aplicativo de quem está com o push desligado.",
      "Sem valor para {data}, o campo indica a pendência e o botão Enviar fica indisponível, visível e alcançável por Tab, com o motivo lido no foco.",
      "Preenchido o valor, a pendência desaparece e o botão libera na mesma passagem.",
      "Reenviar oferece só quem não visualizou, e o número no botão é o dessa parcela — nunca o total do público.",
      "O NPS da pesquisa aberta é +11, com a zona escrita por extenso ao lado do número.",
      "A composição mostra promotores, neutros e detratores com a palavra e a faixa de nota, não só com a cor.",
      "A taxa de resposta é 9 de 12 — as duas famílias sem aplicativo continuam contando como destinatárias.",
      "A leitura por unidade separa +34 da Vila Aurora de -33 da Unidade Centro.",
      "A fila mostra dois detratores em aberto: o resolvido não conta, o em contato conta.",
      "Os detratores em aberto abrem o feed, antes de qualquer neutro ou promotor, e não em ordem de data.",
      "Buscar, Faixa e Status aparecem abaixo do título da fila. Status combina com os outros filtros: Todos inclui todas as respostas do recorte; Sem tratativa, Em contato e Resolvido incluem apenas detratores no estado escolhido, sem alterar o indicador nem a contagem de detratores em aberto.",
      "Assumir o contato muda o estado da resposta e a mantém na fila; concluir a tratativa é o que a retira.",
      "Uma pesquisa nova sai com a pergunta de 0 a 10 já escrita, e a pergunta extra sem enunciado impede o envio.",
    ],
    tags: ["lista", "sucesso", "regra", "exceção", "formulário"],
  },

];
