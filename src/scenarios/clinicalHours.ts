import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do controle de horas.
 *
 * É a tela em que um erro vira dinheiro, e todos os cinco erros que ela pode
 * cometer são silenciosos: truncam, aceitam, descartam ou omitem sem reclamar.
 * Cada cenário existe para tirar um deles do silêncio.
 */
export const clinicalHourScenarios: Scenario[] = [
  {
    id: "clinical-hours.week",
    title: "Uma semana de controle de horas",
    intent:
      "Definir a leitura da tela: previsto contra marcado, com a proveniência de cada faixa ao lado.",
    route: "/clinical-hours",
    persona: "people",
    fixture: "clinical-hours-week",
    rules: ["who-registered-is-part-of-the-record"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Os números do dia são uma lista de descrição. Faixa invertida tem cor e sinal de menos — a cor nunca sozinha.",
    },
    status: "in-review",
    preconditions: ["Cinco dias, cada um com um problema diferente."],
    expected: [
      "Cada dia compara previsto com trabalhado, e mostra o valor diário.",
      "Cada faixa marcada diz quem a registrou: o profissional no app ou o escritório.",
      "O caso misto — aberto no app, fechado no escritório — tem rótulo próprio.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "clinical-hours.truncation",
    title: "7h30 previstas gravadas como 7",
    intent:
      "Tornar visível uma perda que vai sempre para o mesmo lado e que nenhuma linha isolada denuncia.",
    route: "/clinical-hours",
    persona: "people",
    fixture: "clinical-hours-truncation",
    rules: ["expected-hours-truncate-downwards"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`Enum.sum_by(...) |> div(3600)` trunca a soma em segundos.",
      "`expected_hours` é uma coluna inteira: 7,5 não caberia nela de qualquer forma.",
    ],
    expected: [
      "O previsto aparece como é e como está gravado, lado a lado.",
      "A perda é projetada no mês, porque meia hora isolada não convence ninguém a olhar.",
      "O aviso diz que o arredondamento vai sempre para o mesmo lado.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "clinical-hours.unverified",
    title: "Um dia sem nenhuma localização registrada",
    intent:
      "Transformar uma ausência silenciosa em estado declarado — porque hoje o registro não verificado parece verificado.",
    route: "/clinical-hours",
    persona: "coordinator",
    fixture: "clinical-hours-unverified",
    rules: ["verification-is-optional-and-silent"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`maybe_create_log` só grava quando latitude e longitude vêm preenchidas.",
      "O resultado de `Repo.insert` é descartado: falha na gravação também passa em silêncio.",
    ],
    expected: [
      "A tela declara que nenhuma marca tem localização.",
      "E explica as três causas possíveis, que hoje são indistinguíveis entre si.",
      "O estado intermediário — só uma das duas marcas — tem rótulo próprio.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "clinical-hours.reversed",
    title: "Uma saída anterior à entrada",
    intent:
      "Mostrar que a soma do dia pode ficar menor que uma de suas parcelas, e que nada reclamou disso.",
    route: "/clinical-hours",
    persona: "people",
    fixture: "clinical-hours-reversed",
    rules: ["checkout-before-checkin-is-accepted"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`ClinicHour.changeset` exige início e fim, e nunca os compara.",
      "A faixa das 17h às 13h foi digitada no escritório, a partir da folha de ponto.",
    ],
    expected: [
      "A faixa invertida é apontada com as duas horas por extenso.",
      "A duração negativa aparece com sinal, e não só em vermelho.",
      "A tela diz que o total do dia ficou menor que a primeira faixa sozinha.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "clinical-hours.incomplete-expected",
    title: "Uma previsão sem hora de fim",
    intent:
      "Fixar um caso em que o cadastro autoriza exatamente a forma que o cálculo a jusante não processa.",
    route: "/clinical-hours",
    persona: "people",
    fixture: "clinical-hours-incomplete-expected",
    rules: ["expected-hour-without-end-breaks-the-sum"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`ExpectedClinicHour.changeset` valida só `start_at`.",
      "`RecalculateExpectedHours` faz `Time.diff(end_at, start_at)` sem checar nulo.",
    ],
    expected: [
      "A previsão sem fim é apontada, com a hora de início.",
      "A tela diz que o erro aparece no recálculo, longe de quem salvou.",
      "A jornada em aberto do mesmo dia recebe aviso separado — são problemas diferentes.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "clinical-hours.month-does-not-fit",
    title: "O mês não cabe numa página",
    intent:
      "Declarar que o recorte de cinco por página do sistema real esconde justamente a soma que esta tela existe para revelar.",
    route: "/clinical-hours",
    persona: "people",
    fixture: "clinical-hours-month",
    rules: ["page-size-decides-what-can-be-compared"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`ClinicalHourRecord` declara `default_limit: 5` no Flop.",
      "O período tem vinte e dois dias úteis.",
    ],
    expected: [
      "A tela diz quantos dias existem no período e quantas páginas isso ocupa.",
      "E diz o que a paginação esconde: o truncamento de um dia é pequeno, o do mês não.",
      "O aviso não aparece quando tudo cabe numa página — aí seria ruído.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "clinical-hours.no-permission",
    title: "Quem lê e não corrige",
    intent: "Manter a ação visível para quem não a tem, dizendo de quem ela é.",
    route: "/clinical-hours",
    persona: "therapeutic_companion",
    fixture: "clinical-hours-week",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "Corrigir um registro fica visível e desabilitado.",
      "O motivo nomeia os perfis que corrigem, incluindo o aplicativo.",
    ],
    tags: ["permissão"],
  },
  {
    id: "clinical-hours.empty",
    title: "Nenhum registro no período",
    intent: "Explicar de onde vêm os registros a quem abriu a tela antes de existir um.",
    route: "/clinical-hours",
    persona: "people",
    fixture: "clinical-hours-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A tela diz que cada dia trabalhado vira um registro.",
      "E que o primeiro aparece depois do primeiro check-in.",
    ],
    tags: ["vazio"],
  },
];
