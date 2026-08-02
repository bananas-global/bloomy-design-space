import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da Agenda.
 *
 * O recorte segue o documento: agenda normal, conflito de horário,
 * reagendamento, cancelamento, ausência e sem permissão — mais o vazio, que
 * aparece na clínica todo dia às sete da manhã e por isso não é um caso de
 * borda.
 *
 * Nenhum destes está `approved` ainda. A aprovação depende de revisar com uma
 * pessoa de negócio pelo link público, que é o passo 6 da sequência de execução —
 * e marcar como aprovado antes disso seria exatamente o "comentário virar
 * decisão" que o documento lista como risco.
 */
export const agendaScenarios: Scenario[] = [
  {
    id: "agenda.day",
    title: "Agenda do dia",
    intent: "Ver o estado geral do dia e decidir o que fazer primeiro.",
    route: "/agenda",
    persona: "attendant",
    fixture: "agenda-day",
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Tabela com cabeçalho de coluna e de linha; a situação de cada atendimento tem rótulo textual, nunca só cor.",
    },
    status: "in-review",
    preconditions: ["Seis atendimentos marcados, do finalizado ao agendado."],
    actions: ["Abrir um atendimento"],
    expected: [
      "Os seis atendimentos aparecem em ordem de horário.",
      "A situação de cada um é legível sem depender de cor.",
      "O convênio sem autorização é sinalizado na própria linha.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "agenda.absence-and-cancellation",
    title: "Ausência e cancelamento não são a mesma coisa",
    intent:
      "Separar dois comportamentos opostos que o filtro do sistema soma — e é com essa soma que alguém liga para a família.",
    route: "/agenda",
    persona: "attendant",
    fixture: "agenda-absence-and-cancellation",
    rules: ["the-absence-filter-counts-cancellations", "three-filters-ask-the-same-question"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "O filtro `absence` de `ScheduleFilters` seleciona `status in [:missed, :cancelled]`.",
      "Uma ausência e dois cancelamentos no mesmo dia, os dois avisados antes.",
    ],
    expected: [
      "A tela separa as duas contagens e diz o número que o sistema responderia.",
      "E diz a proporção que era aviso prévio, porque é ela que muda a conversa.",
      "O recorte não aparece quando só existe um dos dois — aí não há o que separar.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "agenda.empty",
    title: "Agenda vazia",
    intent: "Garantir que um dia sem atendimento não pareça defeito do sistema.",
    route: "/agenda",
    persona: "attendant",
    fixture: "agenda-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: ["A tela explica que não há atendimento e o que faz aparecer conteúdo."],
    tags: ["vazio"],
  },
  {
    id: "agenda.double-booking",
    title: "Conflito de horário",
    intent:
      "Definir como o conflito aparece antes dos dois pacientes chegarem à recepção ao mesmo tempo.",
    route: "/agenda",
    persona: "attendant",
    fixture: "agenda-double-booking",
    rules: ["no-double-booking"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "O conflito é sinalizado por texto na linha e por aviso no topo, não apenas pelo fundo vermelho.",
    },
    status: "in-review",
    preconditions: [
      "Encaixe por urgência às 10:15 sobrepõe consulta confirmada das 10:00, mesma profissional.",
    ],
    expected: [
      "Um aviso no topo informa quantos horários estão em conflito.",
      "As linhas conflitantes são identificadas por texto, não só por cor de fundo.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "agenda.reschedule-conflict",
    title: "Reagendamento com conflito",
    intent:
      "Validar que a recepção descobre a colisão antes de prometer o horário ao paciente no telefone.",
    route: "/agenda/ap-107",
    persona: "attendant",
    fixture: "agenda-double-booking",
    rules: ["no-double-booking"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      announces: ["reschedule.availability"],
      notes: "O aviso de disponibilidade do horário é uma região live junto do campo.",
    },
    status: "in-review",
    preconditions: ["Atendimento em conflito aberto, com permissão de reagendar."],
    actions: ["Escolher novo horário", "Confirmar reagendamento"],
    expected: [
      "Digitar 10:15 informa colisão; digitar 11:45 informa horário livre.",
      "Confirmar fica bloqueado enquanto o horário escolhido colidir.",
      "A verificação acontece na escolha, não no envio.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "agenda.cancelled",
    title: "Consulta cancelada",
    intent: "Definir o que fica registrado de um cancelamento e quem consegue ver.",
    route: "/agenda/ap-105",
    persona: "attendant",
    fixture: "agenda-cancelled",
    rules: ["cancel-requires-reason", "cancel-requires-permission"],
    a11y: { keyboard: "full", contrast: "AA", announces: ["appointment.cancelled"] },
    status: "in-review",
    preconditions: ["Atendimento cancelado com justificativa, autoria e horário registrados."],
    expected: [
      "A justificativa, quem cancelou e quando aparecem na tela.",
      "Cancelar de novo fica indisponível, com o motivo.",
    ],
    tags: ["exceção"],
  },
  {
    id: "agenda.cancel-requires-reason",
    title: "Cancelamento exige justificativa",
    intent: "Verificar que a justificativa é obrigatória sem virar um passo burocrático extra.",
    route: "/agenda/ap-105",
    persona: "attendant",
    fixture: "agenda-day",
    rules: ["cancel-requires-reason"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      announces: ["appointment.cancelled"],
      notes: "O campo de justificativa tem rótulo associado e a exigência está escrita, não só no `required`.",
    },
    status: "in-review",
    actions: ["Cancelar atendimento", "Escrever justificativa", "Confirmar"],
    expected: [
      "Confirmar fica indisponível enquanto a justificativa estiver vazia.",
      "O cancelamento é anunciado por região de status.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "agenda.cancel-no-permission",
    title: "Sem permissão para cancelar",
    intent:
      "Definir o que a terapeuta vê ao abrir um atendimento da própria agenda que ela não pode cancelar.",
    route: "/agenda/ap-105",
    persona: "therapeutic_companion",
    fixture: "agenda-day",
    rules: ["cancel-requires-permission"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "No Bloomy real, `SchedulePolicy.can?/2` dá cancelamento a coordenador, admin e recepção — e não a quem atende.",
    ],
    expected: [
      "A ação de cancelar aparece desabilitada, com o motivo e para quem pedir.",
      "Reagendar também fica indisponível: `schedules.edit` tem a mesma lista de `schedules.cancel`.",
      "Ver o atendimento continua liberado — a restrição é de escrita, não de leitura.",
    ],
    tags: ["permissão", "exceção"],
  },
  {
    id: "agenda.no-show-too-early",
    title: "Ausência antes da tolerância",
    intent:
      "Verificar se a tolerância de 15 minutos fica compreensível sem que a recepção precise calcular.",
    route: "/agenda/ap-104",
    persona: "attendant",
    fixture: "agenda-no-show-window",
    rules: ["no-show-after-tolerance"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Atendimento das 09:30 com o relógio da situação em 09:38."],
    expected: [
      "Registrar ausência fica indisponível.",
      "O motivo informa quantos minutos ainda faltam, não apenas que a regra existe.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "agenda.no-show",
    title: "Paciente ausente",
    intent: "Definir o que fica visível depois de registrar uma ausência.",
    route: "/agenda/ap-104",
    persona: "attendant",
    fixture: "agenda-no-show-elapsed",
    rules: ["no-show-after-tolerance"],
    a11y: { keyboard: "full", contrast: "AA", announces: ["appointment.no-show"] },
    status: "in-review",
    preconditions: ["Tolerância vencida e ausência já registrada, relógio em 10:05."],
    expected: [
      "A ausência aparece com aviso explicando que reverter exige novo agendamento.",
      "Registrar ausência de novo fica indisponível.",
    ],
    tags: ["exceção"],
  },
];
