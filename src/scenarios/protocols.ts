import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da aplicação de protocolo.
 *
 * O protocolo é a avaliação de onde o plano nasce, e é aplicado ao longo de
 * várias sessões. Isso transforma duas coisas que pareceriam detalhe de
 * interface em regra de negócio: onde a aplicação retoma, e o que o percentual
 * significa.
 */
export const protocolScenarios: Scenario[] = [
  {
    id: "protocols.in-progress",
    title: "Aplicação em andamento",
    intent:
      "Impedir que o percentual de preenchimento seja lido como desempenho do paciente — são leituras opostas do mesmo número.",
    route: "/patients/pac-theo/protocols/apl-3301",
    persona: "coordinator",
    fixture: "protocol-in-progress",
    rules: ["protocol-progress-is-completion-not-score", "protocol-area-progress-is-independent"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada área é uma região com heading próprio. A escala de resposta é um fieldset com legend, não um grupo de botões soltos.",
    },
    status: "ported",
    preconditions: ["Três de oito itens respondidos, espalhados por duas das três áreas."],
    expected: [
      "O percentual vem acompanhado da palavra “preenchido”, e a tela diz que não é desempenho.",
      "Cada área mostra o próprio progresso, contado sobre as questões dela.",
      "Item respondido e item em branco têm rótulo textual, não só cor.",
    ],
    tags: ["lista", "regra"],
  },
  {
    id: "protocols.resume",
    title: "Retomar de onde parou",
    intent:
      "Verificar que retomar pula para o primeiro item em branco, e não para o próximo da lista — é o que evita item pulado sem ninguém notar.",
    route: "/patients/pac-theo/protocols/apl-3301",
    persona: "therapeutic_companion",
    fixture: "protocol-resume",
    rules: ["protocol-resumes-at-first-unanswered"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "Navegação posicionada em B1, que já está respondido. B2 e B3 estão em branco.",
    ],
    expected: [
      "Retomar aponta para B2, o próximo em branco da mesma área.",
      "A tela explica que a ordem de busca é área atual, depois as seguintes, e só então o começo.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "protocols.abllsr",
    title: "Formato ABLLS-R",
    intent:
      "Tornar visível que o formato muda o controle da tela item a item, e não apenas o rótulo do instrumento.",
    route: "/patients/pac-theo/protocols/apl-3350",
    persona: "coordinator",
    fixture: "protocol-abllsr",
    rules: ["answer-scale-depends-on-format"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "`QuestionConfigurations.Abllsr` guarda `min` e `max` por questão. O protocolo não tem escala compartilhada.",
    ],
    expected: [
      "Ao navegar entre itens da mesma área, cada questão mostra a própria faixa — A3 oferece 0–2 e A2 oferece 0–4.",
      "A tela não exibe a escala compartilhada, porque neste formato ela não existe.",
      "Item sem pontuação diz que está sem pontuação, em vez de mostrar zero.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "protocols.finished",
    title: "Aplicação concluída",
    intent: "Definir o fechamento e a data de reavaliação que ele gera.",
    route: "/patients/pac-theo/protocols/apl-3301",
    persona: "coordinator",
    fixture: "protocol-finished",
    rules: ["reassessment-follows-the-instrument"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["Instrumento inteiro respondido, fechado em 25 de julho de 2026."],
    expected: [
      "A tela confirma que todos os itens foram respondidos, com a data.",
      "A próxima reavaliação aparece calculada a partir do intervalo do instrumento.",
      "A tela diz que o intervalo é do instrumento, não escolha de quem aplica.",
    ],
    tags: ["sucesso", "regra"],
  },
  {
    id: "protocols.reassessment-overdue",
    title: "Reavaliação atrasada",
    intent:
      "Tornar a reavaliação vencida visível na própria aplicação, e não só num relatório que ninguém abre.",
    route: "/patients/pac-theo/protocols/apl-3200",
    persona: "coordinator",
    fixture: "protocol-reassessment-overdue",
    rules: ["reassessment-follows-the-instrument"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "Aplicação de janeiro, reavaliação prevista para 20 de julho de 2026.",
      "A persona é o coordenador e não o supervisor porque `ProtocolPolicy.can?(role, :list)` não inclui `supervisor` — quem supervisiona o caso não alcança a avaliação que o originou.",
    ],
    expected: [
      "O aviso diz há quantos dias a reavaliação está vencida, e não apenas que venceu.",
      "O aviso usa tom de erro, distinto do aviso informativo de reavaliação em dia.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "protocols.empty",
    title: "Aplicação recém-aberta",
    intent: "Definir o zero: nenhum item respondido, e o que a tela oferece nesse ponto.",
    route: "/patients/pac-theo/protocols/apl-3400",
    persona: "therapeutic_companion",
    fixture: "protocol-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "O progresso é zero e a tela continua dizendo que é preenchimento.",
      "Retomar aponta para o primeiro item do protocolo.",
      "Todas as áreas mostram zero respondidos, sem esconder as vazias.",
    ],
    tags: ["vazio"],
  },
  {
    id: "protocols.no-access",
    title: "Recepção não alcança protocolos",
    intent: "Definir o que a recepção vê ao abrir o link de uma avaliação.",
    route: "/patients/pac-theo/protocols/apl-3301",
    persona: "attendant",
    fixture: "protocol-in-progress",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "`ProtocolPolicy.can?(role, :list)` inclui admin, admin de clínica, coordenador, terapeuta e especialista — e deixa de fora recepção, operação, people, aplicador e supervisor.",
    ],
    expected: [
      "A tela nomeia quem alcança protocolos, em vez de devolver erro.",
      "O bloqueio é de permissão, não de dado.",
    ],
    tags: ["permissão", "exceção"],
  },
];
