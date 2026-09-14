import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da Central de Transferências.
 *
 * **Dois, e a divisão é entre o caminho e o desvio.** O primeiro é a
 * movimentação inteira — selecionar, escolher destino, simular, aplicar, e
 * descobrir no meio do caminho que a transferência é parcial. O segundo é a
 * única coisa que a área proíbe: sair da especialidade sem dizer por quê.
 *
 * Não são três nem sete. A lista de mapas, a grade da semana e o bloco-resumo
 * do horário lotado são leituras da mesma situação — quem abre a área para
 * movimentar os mapas de uma inativação passa pelas três em sequência, e
 * separá-las em cenários próprios descreveria três telas onde há uma. O que
 * cada uma precisa provar está nos critérios de `transfers.queue`.
 *
 * **`proposed`, e não `ported`.** O baseline de 2026-08 é referência importada
 * do monólito; o sistema real sabe transferir um agendamento e notificar, e não
 * tem nada parecido com esta área. Por ser proposta, entra na suíte
 * automatizada — jornada, axe, zoom e toque.
 *
 * A persona é `coordinator` nas duas. Não é conveniência: `patients.edit_schedules_map`
 * é de Admin e Coordenador, e a movimentação em bloco é a decisão de quem
 * responde pela grade da unidade. Lida pela recepção, esta tela descreveria um
 * remanejamento de agenda do dia, que é outra coisa e mora na agenda.
 */
export const transferScenarios: Scenario[] = [
  /* ============================================================== a fila */
  {
    id: "transfers.queue",
    title: "Central de transferências",
    intent:
      "Provar que a tela não mente sobre o que cabe. Uma inativação deixa três mapas no mesmo horário, e a coordenação precisa ver — antes de aplicar — que eles disputam entre si, que um horário fora da escala não é a mesma coisa que um horário ocupado, e que o que sobrar continua na fila esperando o próximo destino.",
    route: "/transfers",
    persona: "coordinator",
    fixture: "transfers-week",
    rules: [
      "a-map-without-a-professional-is-listed-with-the-others",
      "the-selection-competes-with-itself",
      "outside-the-schedule-is-not-a-clash",
      "a-transfer-is-partial-by-nature",
    ],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada mapa é uma caixa de seleção com nome acessível próprio — paciente, especialidade e responsável —, sem depender de arrastar nem de apontar. O veredito da simulação tem palavra: “Cabe”, “Não cabe junto”, “Não cabe”, “Sem mudança”, e a cor da linha nunca é o único sinal. O resultado de cada rodada é anunciado por `role=\"status\"`.",
      announces: [
        "{n} mapas transferidos para {profissional}. {resto} continuam na fila.",
        "Movimentação concluída: {n} mapas transferidos em {rodadas} rodadas.",
      ],
    },
    status: "proposed",
    preconditions: [
      "A data de referência é 30/07/2026, declarada na fixture.",
      "Dezessete mapas de horas na unidade Vila Aurora, seis deles sem profissional.",
      "Juliana Reis foi inativada em 24/07 e deixou três mapas de Psicologia, todos na terça das 08:00 às 09:00.",
      "Outros cinco mapas ocupam a mesma faixa de terça, de quatro especialidades diferentes.",
      "Helena Martins Costa, também de Psicologia, só atende das 13:00 às 18:00.",
    ],
    expected: [
      "Os seis mapas sem profissional aparecem na mesma lista dos demais, com o motivo e o nome de quem os deixou.",
      "O mapa que nunca teve responsável aparece sem nome de quem o deixou, e não com um campo vazio.",
      "Selecionados os três mapas de Juliana e escolhida Marina Costa, a simulação diz que um cabe e dois não cabem junto — porque disputam o mesmo horário entre si, e não com um paciente dela.",
      "Escolhida Helena Martins Costa, os três dizem “Não cabe”, e o motivo é a escala dela, não uma agenda ocupada.",
      "Aplicada a rodada, um mapa sai da fila e dois continuam selecionados, com a tela pedindo o próximo destino e mostrando o que já foi feito.",
      "Zerada a fila, a tela lista as rodadas na ordem em que aconteceram.",
      "O filtro de especialidade da lista delimita a rodada, sem um segundo seletor no painel; as demais permanecem na fila e a exceção nunca é marcada automaticamente.",
      "A coordenação pode priorizar um mapa em disputa e revisar a simulação recalculada antes de aplicar.",
      "A vigência começa hoje ou em data futura explícita, preservando atendimentos anteriores e realizados no comportamento proposto.",
      "Pausar preserva seleção e rodadas enquanto a página permanece aberta; retomar mostra os mapas pendentes.",
      "A central apresenta somente a lista, com título e espaçamento interno no card; anúncios de operações são exclusivos para leitores de tela.",
      "O resumo precede os resultados e permite filtrar por status sem alterar os mapas considerados ao aplicar. Cards neutros distinguem o resultado pela etiqueta de status.",
    ],
    tags: ["lista", "sucesso", "regra", "agenda"],
  },

  /* ========================================================== a exceção */
  {
    id: "transfers.cross-specialty",
    title: "A única psicopedagoga da unidade",
    intent:
      "Fixar o único impedimento duro da área. Quando não existe outro profissional da mesma especialidade, a transferência não é impossível — é exceção, e exceção sem motivo escrito é um desvio clínico que ninguém vai conseguir explicar depois.",
    route: "/transfers",
    persona: "coordinator",
    fixture: "transfers-week",
    rules: ["crossing-specialty-requires-a-written-reason"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Bloqueado, o botão Simular continua visível e na ordem de tabulação: usa `aria-disabled` com o motivo associado por `aria-describedby`, como manda a decisão 0006 do motor, e o motivo aparece também junto do campo do motivo, que é onde os olhos estão. O aviso de que não há outro profissional da especialidade é texto, e não só a ausência de opções no seletor.",
      announces: ["Motivo da exceção registrado. Simular liberado."],
    },
    status: "proposed",
    preconditions: [
      "Larissa Gomes é a única psicopedagoga da unidade e detém os dois mapas de Psicopedagogia com responsável.",
      "Os dois mapas estão selecionados.",
      "A caixa da exceção começa desmarcada e o campo de motivo, vazio.",
    ],
    expected: [
      "O seletor de destino abre sem nenhum profissional da mesma especialidade, e a tela diz isso por escrito antes de oferecer a exceção.",
      "Sem a exceção marcada, Simular fica indisponível, visível e alcançável por Tab, e o motivo é lido no foco.",
      "Marcada a exceção, o destino passa a oferecer as outras especialidades e a tela avisa que o motivo vai para o histórico do mapa.",
      "Um motivo com menos de dez caracteres mantém o bloqueio, e a tela diz quantos faltam em vez de recusar em silêncio.",
      "Escrito o motivo, Simular libera na mesma passagem, e a simulação marca como exceção cada mapa que muda de especialidade.",
    ],
    tags: ["exceção", "formulário", "regra"],
  },
];
