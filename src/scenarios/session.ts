import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do atendimento clínico.
 *
 * O agendamento atravessa até seis situações depois de marcado, e cinco delas
 * significam que alguém ainda precisa agir. Os cenários seguem essa fila na
 * ordem em que ela acontece na clínica — check-in, início, sessão, registro,
 * assinatura, supervisão — porque é assim que a coordenação a lê.
 *
 * As três guardas de início vêm de `CustomServices.Create` e são as que mais
 * prendem gente no produto real: check-in, atendimento já aberto e atendimento
 * duplicado. Cada uma tem cenário próprio, porque cada uma exige uma ação
 * diferente de quem esbarra nela.
 */
export const sessionScenarios: Scenario[] = [
  {
    id: "session.ready",
    title: "Pronto para atendimento",
    intent: "Definir o estado em que nada bloqueia o início, para servir de referência aos bloqueios.",
    route: "/sessions/atd-8801",
    persona: "therapeutic_companion",
    fixture: "session-ready",
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "A situação do agendamento é lida antes das ações, por heading da região de aviso.",
    },
    status: "ported",
    preconditions: ["Théo fez check-in às 13:51. O atendimento é das 14h e a Marina está livre."],
    actions: ["Iniciar atendimento"],
    expected: [
      "A situação aparece como Pronto, com o horário do check-in.",
      "Iniciar atendimento está disponível.",
      "A tela diz o que falta acontecer, não só em que estado está.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "session.no-checkin",
    title: "Sem check-in do paciente",
    intent:
      "Garantir que o bloqueio nomeie o paciente e a recepção, e não devolva um erro de sistema.",
    route: "/sessions/atd-8801",
    persona: "therapeutic_companion",
    fixture: "session-no-checkin",
    rules: ["session-requires-checkin"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "Serviço cobrável, agendamento ainda em Agendado, sem registro de chegada na recepção.",
    ],
    expected: [
      "Iniciar atendimento aparece desabilitado, nomeando o paciente que falta registrar.",
      "O campo de check-in diz explicitamente que não foi registrado, em vez de ficar em branco.",
      "A informação do atendimento continua toda legível.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "session.not-chargeable",
    title: "Serviço não cobrável dispensa check-in",
    intent:
      "Deixar visível que a exigência de check-in é sobre faturamento, não sobre presença — e que existem serviços fora dela.",
    route: "/sessions/atd-8801",
    persona: "therapeutic_companion",
    fixture: "session-not-chargeable",
    rules: ["session-requires-checkin"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["Devolutiva à família, serviço não cobrável, sem check-in registrado."],
    expected: [
      "Iniciar atendimento está disponível mesmo sem check-in.",
      "O campo de check-in explica que não é exigido neste serviço, em vez de acusar falta.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "session.professional-busy",
    title: "Profissional com atendimento em aberto",
    intent:
      "Verificar se o bloqueio manda resolver o problema certo: fechar o atendimento anterior, não procurar a recepção.",
    route: "/sessions/atd-8801",
    persona: "therapeutic_companion",
    fixture: "session-professional-busy",
    rules: ["one-open-session-per-professional"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "Théo fez check-in, mas a Marina não finalizou o atendimento das 13h com a Isadora.",
    ],
    expected: [
      "Iniciar atendimento aparece desabilitado, nomeando o paciente e o horário do atendimento em aberto.",
      "O bloqueio por atendimento aberto vem antes do bloqueio por check-in, como no sistema real.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "session.running",
    title: "Atendimento em andamento",
    intent:
      "Definir como a sessão em curso mostra o registro clínico acumulado — a unidade de dado do produto.",
    route: "/sessions/atd-8801",
    persona: "therapeutic_companion",
    fixture: "session-running",
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada tentativa tem rótulo textual completo para leitor de tela: acerto ou erro, e se houve ajuda. A cor é redundante.",
    },
    status: "ported",
    preconditions: ["Em sessão às 14:25, seis tentativas marcadas em dois programas."],
    expected: [
      "Cada programa mostra seus passos, a fase de cada passo e quantas tentativas faltam para a meta.",
      "Uma tentativa distingue acerto de erro e independente de com ajuda, sem depender de cor.",
      "O programa incidental aparece identificado como tal, separado dos estruturados.",
    ],
    tags: ["sucesso", "lista"],
  },
  {
    id: "session.pending-register",
    title: "Pendente de registro",
    intent:
      "Tornar visível que finalizar sem evolução não leva à assinatura — e por que a diferença importa.",
    route: "/sessions/atd-8801",
    persona: "therapeutic_companion",
    fixture: "session-pending-register",
    rules: ["empty-register-blocks-signature"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["Atendimento finalizado às 15h com a evolução em branco."],
    expected: [
      "A tela diz que falta escrever a evolução, no lugar de dizer apenas que está pendente.",
      "O aviso explica que assinar é declarar o registro correto, e que não há o que declarar sobre texto vazio.",
      "Assinar continua visível e indisponível, com o motivo.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "session.pending-signature",
    title: "Aguardando quem atendeu",
    intent: "Definir a primeira etapa da cadeia de assinatura, e por que a ordem existe.",
    route: "/sessions/atd-8801",
    persona: "therapeutic_companion",
    fixture: "session-pending-signature",
    rules: ["owner-signs-before-supervisor"],
    a11y: { keyboard: "full", contrast: "AA", announces: ["session.signed"] },
    status: "ported",
    preconditions: ["Evolução escrita. Falta a assinatura da Marina, responsável pelo atendimento."],
    actions: ["Assinar como responsável"],
    expected: [
      "A tela nomeia quem precisa assinar, em vez de dizer apenas que há assinatura pendente.",
      "Assinar como supervisora aparece indisponível, dizendo que a responsável assina primeiro.",
      "O resultado da assinatura é anunciado por região de status, com a próxima situação.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "session.pending-supervisor",
    title: "Aguardando o supervisor",
    intent:
      "Definir a segunda etapa da cadeia, que só existe quando o atendimento exige supervisão.",
    route: "/sessions/atd-8801",
    persona: "supervisor",
    fixture: "session-pending-supervisor",
    rules: ["owner-signs-before-supervisor"],
    a11y: { keyboard: "full", contrast: "AA", announces: ["session.signed"] },
    status: "ported",
    preconditions: ["A Marina assinou às 15:12. O atendimento exige segunda assinatura, da Clara."],
    expected: [
      "A assinatura já feita aparece com autoria e horário.",
      "Assinar como a responsável fica indisponível: a etapa dela já passou.",
      "A assinatura do supervisor encerra o atendimento em Finalizado.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "session.finished",
    title: "Atendimento finalizado",
    intent: "Definir o estado final e o que fica registrado dele.",
    route: "/sessions/atd-8801",
    persona: "coordinator",
    fixture: "session-finished",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["As duas assinaturas no lugar."],
    expected: [
      "Nenhum aviso de pendência aparece.",
      "As duas assinaturas aparecem com nome, papel e horário.",
      "Assinar fica indisponível, dizendo que não há assinatura pendente.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "session.revert-allowed",
    title: "Reverter atendimento aberto por engano",
    intent:
      "Definir a janela em que desfazer ainda não destrói dado clínico, e o que a tela promete antes de desfazer.",
    route: "/sessions/atd-8801",
    persona: "coordinator",
    fixture: "session-revertible",
    rules: ["revert-requires-clean-session", "revert-requires-permission"],
    a11y: { keyboard: "full", contrast: "AA", announces: ["session.reverted"] },
    status: "ported",
    preconditions: ["Em andamento há três minutos, sem nenhuma tentativa marcada."],
    actions: ["Reverter atendimento"],
    expected: [
      "A tela diz para qual situação o agendamento volta, antes de reverter.",
      "A explicação deixa claro que a situação de volta depende do dia e do check-in, não de quem reverte.",
      "Reverter está disponível.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "session.revert-blocked",
    title: "Reverter bloqueado por registro clínico",
    intent:
      "Garantir que a negativa mostre o que seria destruído, para a decisão ser sobre o custo e não sobre a permissão.",
    route: "/sessions/atd-8801",
    persona: "coordinator",
    fixture: "session-running",
    rules: ["revert-requires-clean-session"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["Seis tentativas já registradas em dois programas."],
    expected: [
      "Reverter aparece desabilitado, contando quantas tentativas seriam apagadas.",
      "O motivo diz que reverter apagaria o registro, não apenas que a ação está indisponível.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "session.revert-no-permission",
    title: "Sem permissão para reverter",
    intent: "Definir o que quem atendeu vê ao tentar desfazer o próprio atendimento.",
    route: "/sessions/atd-8801",
    persona: "therapeutic_companion",
    fixture: "session-revertible",
    rules: ["revert-requires-permission"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["`custom_services.revert` é de admin e coordenador. A terapeuta não tem."],
    expected: [
      "Reverter aparece desabilitado, dizendo a quem pedir.",
      "A negativa é de permissão e não de estado: o atendimento está limpo, o perfil é que não alcança.",
    ],
    tags: ["permissão", "exceção"],
  },
  {
    id: "session.applicator-cannot-register",
    title: "Aplicador não registra atendimento",
    intent:
      "Verificar se a tela continua servindo para quem só lê — o papel que nenhuma policy autoriza a escrever.",
    route: "/sessions/atd-8801",
    persona: "applicator",
    fixture: "session-ready",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "Nenhuma das vinte e seis policies dá escrita ao aplicador: nem `custom_services.edit`, nem `clinical_summaries.create`.",
    ],
    expected: [
      "Toda a informação clínica do atendimento continua legível.",
      "Iniciar atendimento aparece desabilitado, com o motivo.",
      "A tela não fica vazia nem devolve erro: ler é o uso legítimo deste perfil.",
    ],
    tags: ["permissão", "exceção"],
  },
  {
    id: "session.professional-meeting",
    title: "Supervisão entre profissionais",
    intent:
      "Definir o atendimento sem paciente, que pula três etapas do ciclo e costuma ser esquecido no desenho.",
    route: "/sessions/atd-8801",
    persona: "supervisor",
    fixture: "session-professional-meeting",
    rules: ["session-requires-checkin", "empty-register-blocks-signature"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "Reunião de supervisão entre a Marina e a Clara. `schedule_type` é profissional.",
    ],
    expected: [
      "O campo de paciente diz que não há paciente, em vez de ficar vazio.",
      "Check-in não é exigido, e a tela explica por quê.",
      "As seções de evolução e assinatura não aparecem: este tipo finaliza direto.",
    ],
    tags: ["exceção", "vazio"],
  },
];
