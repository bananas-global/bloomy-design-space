import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários dos relatórios.
 *
 * Sete tipos que saem por um botão só, e o que muda entre eles é para onde o
 * documento vai. Um relatório é a coisa mais fácil de o produto emitir e a mais
 * difícil de recolher.
 */
export const reportScenarios: Scenario[] = [
  {
    id: "reports.list",
    title: "Relatórios do paciente",
    intent:
      "Tornar visível o destinatário de cada tipo — é ele que decide o cuidado com o conteúdo, e não está no schema.",
    route: "/patients/pac-theo/reports",
    persona: "coordinator",
    fixture: "reports-list",
    rules: ["report-type-decides-the-destination"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada relatório é um artigo com heading próprio. Levar ou não conteúdo clínico tem rótulo textual.",
    },
    status: "ported",
    preconditions: ["Quatro documentos com destinos diferentes: empregador, operadora e família."],
    expected: [
      "Cada relatório diz para onde o documento vai.",
      "Os que levam conteúdo clínico aparecem marcados como tal.",
      "Quem criou e quem responde pelo documento aparecem quando diferem.",
    ],
    tags: ["lista", "regra"],
  },
  {
    id: "reports.declaration-incomplete",
    title: "Declaração sem horário de saída",
    intent:
      "Impedir a emissão de uma declaração que não prova nada — é o único documento que a família leva para fora.",
    route: "/patients/pac-theo/reports",
    persona: "attendant",
    fixture: "reports-declaration-incomplete",
    rules: ["attendance-declaration-carries-no-clinical-content"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["Falta o horário de saída e o nome do responsável."],
    expected: [
      "Os campos que faltam aparecem nomeados, e marcados na ficha.",
      "Gerar PDF fica indisponível, dizendo o que a declaração precisa provar.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "reports.declaration-with-clinical",
    title: "Declaração com conteúdo clínico",
    intent:
      "Avisar antes de gerar: é o único tipo que sai do circuito da saúde, e o campo aceita qualquer coisa.",
    route: "/patients/pac-theo/reports",
    persona: "attendant",
    fixture: "reports-declaration-with-clinical",
    rules: ["attendance-declaration-carries-no-clinical-content"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "O campo `content` de `Reports.Report` aceita texto em qualquer tipo, sem validação.",
    ],
    expected: [
      "O aviso diz para onde o documento vai — empregador ou escola.",
      "E diz o que a declaração precisa provar, que é só a presença.",
      "O documento continua emitível: a escolha é de quem emite, informada.",
    ],
    tags: ["exceção", "decisão"],
  },
  {
    id: "reports.issuing-without-reading",
    title: "Recepção emitindo relatório clínico",
    intent:
      "Tornar discutível um descompasso real: quem não pode ler o prontuário pode produzir um documento sobre ele.",
    route: "/patients/pac-theo/reports",
    persona: "attendant",
    fixture: "reports-issuing-without-reading",
    rules: ["issuing-does-not-check-reading"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "`generate_report` inclui `attendant`; `see_clinic_overview` o exclui por lista negativa.",
      "O formulário do monólito não filtra o tipo de relatório por papel.",
    ],
    expected: [
      "A tela declara o descompasso, nomeando os dois lados.",
      "E diz que é assim no sistema real, para a decisão ser tomada e não herdada.",
      "A emissão continua possível: bloquear aqui esconderia a escolha.",
    ],
    tags: ["permissão", "exceção"],
  },
  {
    id: "reports.generated",
    title: "Relatório com PDF gerado",
    intent: "Impedir que o registro divirja do papel que já está na mão de alguém.",
    route: "/patients/pac-theo/reports",
    persona: "coordinator",
    fixture: "reports-generated",
    rules: ["generated-report-is-frozen"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "Editar aparece indisponível, explicando que o documento já saiu.",
      "Gerar PDF de novo também fica indisponível.",
      "O conteúdo continua legível.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "reports.empty",
    title: "Nenhum relatório emitido",
    intent: "Definir o vazio, nomeando os tipos que podem ser emitidos.",
    route: "/patients/pac-theo/reports",
    persona: "coordinator",
    fixture: "reports-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: ["A tela nomeia os tipos de documento que a clínica emite."],
    tags: ["vazio"],
  },
];
