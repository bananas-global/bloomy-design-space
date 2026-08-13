import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da gerência.
 *
 * O sistema real tem onze listas planas. Elas permanecem como referência
 * portada; a única mudança proposta deste módulo é reorganizar sua navegação.
 */
const legacyManagementScenarios: Scenario[] = [
  {
    id: "management.monday",
    title: "Segunda de manhã",
    intent:
      "Fazer a tela responder “o que é meu e o que acontece se ficar parado” — e não “quantos são”.",
    route: "/management",
    persona: "coordinator",
    fixture: "management-monday",
    rules: ["management-fronts-have-owners", "patient-without-clinical-owner-drifts"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada frente é um item de lista com contagem, título e responsável em texto. Cor não carrega informação sozinha.",
    },
    status: "ported",
    preconditions: ["Quatro frentes com pendência, na unidade Pinheiros."],
    expected: [
      "Cada frente mostra a contagem, o título e de quem é.",
      "A frente que trava fechamento de sessão aparece destacada das demais.",
      "As seções abaixo detalham cada frente, na mesma ordem.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "management.reports-by-consequence",
    title: "O mais antigo não é o mais urgente",
    intent:
      "Ordenar a fila por consequência do atraso, e dizer qual é a consequência — dois atrasos parecidos custam coisas diferentes.",
    route: "/management",
    persona: "coordinator",
    fixture: "management-reports-overdue",
    rules: ["report-urgency-depends-on-requester"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "Um relatório pedido pela operadora atrasado há 9 dias, e um pedido pela família há 14.",
    ],
    expected: [
      "O da operadora aparece antes, apesar de o da família estar atrasado há mais tempo.",
      "Cada um diz a consequência concreta do atraso, e não um rótulo de severidade.",
      "Quem pediu aparece em cada linha, porque é o que decide a ordem.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "management.mentorship-gap",
    title: "Aplicador sem supervisor",
    intent:
      "Tornar visível antes uma lacuna que hoje aparece semanas depois, como uma pilha de sessões que ninguém pode assinar.",
    route: "/management",
    persona: "coordinator",
    fixture: "management-mentorship-gap",
    rules: ["applicator-without-supervisor-cannot-close"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "Um aplicador sem vínculo de supervisão, e uma supervisora sem nenhum supervisionado.",
    ],
    expected: [
      "O aplicador sem supervisor aparece marcado como travando fechamento de sessão.",
      "A supervisora sem supervisionados aparece sem alarme, com a observação de conferir.",
      "A consequência é escrita: as sessões acontecem e ficam pendentes.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "management.clear",
    title: "Nenhuma pendência",
    intent:
      "Definir a tela que pode ser fechada — que é o que torna as outras acionáveis.",
    route: "/management",
    persona: "coordinator",
    fixture: "management-clear",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "A tela afirma que as quatro frentes estão em dia, nomeando-as.",
      "Nada de contagem zerada empilhada: o vazio é uma frase, não quatro zeros.",
    ],
    tags: ["vazio"],
  },
  {
    id: "management.no-access",
    title: "Quem atende não alcança a gerência",
    intent: "Definir o que a terapeuta encontra ao abrir o link da gerência.",
    route: "/management",
    persona: "therapeutic_companion",
    fixture: "management-monday",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["`ManagementPolicy.can?(role, :list)` é de admin, admin de clínica e coordenação."],
    expected: ["A tela nomeia quem alcança a gerência.", "O bloqueio é de permissão, não de dado."],
    tags: ["permissão", "exceção"],
  },
];

type ActiveManagementScenario = {
  id: string;
  title: string;
  group: string;
  fixture: string;
  intent: string;
  expected: string[];
};

const managementListReferences: Scenario[] = (
  [
    {
      id: "management.supervisors",
      title: "Supervisores",
      group: "Assistencial",
      fixture: "management-supervisors",
      intent: "Consultar supervisores e coordenadores e ajustar quem está vinculado a cada um.",
      expected: [
        "A lista começa filtrada por profissionais ativos.",
        "Cada linha mostra especialidade e quantidade de aplicadores.",
        "Editar Aplicadores abre o vínculo sem sair da lista.",
      ],
    },
    {
      id: "management.applicators",
      title: "Aplicadores",
      group: "Assistencial",
      fixture: "management-applicators",
      intent: "Conferir quem supervisiona cada aplicador e se o vínculo exige segunda assinatura.",
      expected: [
        "Aplicador e supervisor aparecem lado a lado.",
        "A coluna Assina informa Sim ou Não em texto.",
        "Editar supervisor mantém visível a escolha de segunda assinatura.",
      ],
    },
    {
      id: "management.clinical-owners",
      title: "Responsáveis Clínicos",
      group: "Assistencial",
      fixture: "management-clinical-owners",
      intent: "Encontrar pacientes sem responsável clínico e corrigir o vínculo.",
      expected: [
        "Paciente, responsável e especialidade aparecem na mesma linha.",
        "Ausência de responsável é mostrada com traço, como no sistema.",
        "Editar responsáveis abre o formulário do paciente selecionado.",
      ],
    },
    {
      id: "management.patient-registration",
      title: "Cadastro de Pacientes",
      group: "Operação",
      fixture: "management-patient-registration",
      intent: "Localizar pacientes sem plano, unidade, nível de suporte ou mapa de horas.",
      expected: [
        "Os itens faltantes aparecem como etiquetas vermelhas.",
        "É possível filtrar por um item faltante específico.",
        "A ação leva ao cadastro do paciente.",
      ],
    },
    {
      id: "management.professional-registration",
      title: "Cadastro de Profissionais",
      group: "Operação",
      fixture: "management-professional-registration",
      intent: "Localizar profissionais sem unidade, escala ativa ou contrato vigente.",
      expected: [
        "Profissional e especialidade identificam cada linha.",
        "As pendências aparecem como etiquetas vermelhas.",
        "A busca combina com especialidade, item faltante e status.",
      ],
    },
    {
      id: "management.authorizations",
      title: "Autorizações",
      group: "Operação",
      fixture: "management-authorizations",
      intent: "Separar autorizações em vigência das que já venceram.",
      expected: [
        "A lista mostra paciente, data de vencimento e status.",
        "Em Vigência e Vencido aparecem em texto além da cor.",
        "A busca por paciente pode ser combinada ao status.",
      ],
    },
    {
      id: "management.professionals-by-specialty",
      title: "Profissionais por Especialidade",
      group: "Relatórios",
      fixture: "management-professionals-by-specialty",
      intent: "Comparar a composição da equipe em cada especialidade.",
      expected: [
        "A tabela separa total, coordenadores, supervisores, terapeutas, aplicadores e profissionais em formação.",
        "O filtro reduz a tabela a uma especialidade.",
      ],
    },
    {
      id: "management.hour-maps",
      title: "Mapa de Horas",
      group: "Agenda",
      fixture: "management-hour-maps",
      intent: "Encontrar pacientes sem padrão e acompanhar a vigência dos mapas existentes.",
      expected: [
        "A visão inicial usa Sem padrão, como no sistema.",
        "Cada mapa mostra vigência, horas semanais e status quando esses dados existem.",
        "Paciente e período podem refinar a lista.",
      ],
    },
    {
      id: "management.report-control",
      title: "Controle de relatórios",
      group: "Relatórios",
      fixture: "management-report-control",
      intent: "Solicitar e acompanhar relatórios por paciente, profissional, prazo e status.",
      expected: [
        "A tabela mostra tipo, solicitante, profissional, prazo e status.",
        "Prazo vencido permanece identificado em texto e estilo.",
        "Solicitar relatório abre o formulário sem sair da lista.",
      ],
    },
    {
      id: "management.absences",
      title: "Faltas Profissionais",
      group: "Agenda",
      fixture: "management-absences",
      intent: "Acompanhar dias e horas de falta e a presença no período selecionado.",
      expected: [
        "O período inicial cobre noventa dias determinísticos da fixture.",
        "Cada profissional mostra dias, horas e percentual de presença.",
        "A faixa de presença é compreensível sem depender apenas da cor.",
      ],
    },
    {
      id: "management.intervention-plans",
      title: "Planos terapêuticos",
      group: "Assistencial",
      fixture: "management-intervention-plans",
      intent: "Acompanhar planos de intervenção comportamental vigentes, pendentes e expirados.",
      expected: [
        "Paciente, vigência, autoria, responsável legal e status aparecem na mesma linha.",
        "Plano sem assinatura mostra traço no lugar de uma pessoa inexistente.",
        "Vigente, Pendente e Expirado aparecem em texto.",
      ],
    },
  ] satisfies ActiveManagementScenario[]
).map((scenario) => ({
  id: scenario.id,
  title: scenario.title,
  intent: scenario.intent,
  route: "/management",
  persona: "coordinator",
  fixture: scenario.fixture,
  a11y: {
    keyboard: "full",
    contrast: "AA",
    notes: "Filtros, ações e diálogos têm nome acessível; situação não depende só de cor.",
  },
  status: "ported",
  preconditions: ["Unidade Pinheiros selecionada.", "A pessoa tem `management.list`."],
  expected: scenario.expected,
  tags: ["lista", "referência-portada", scenario.group.toLowerCase()],
}));

const groupedNavigationProposal: Scenario = {
  id: "management.grouped-navigation",
  title: "Reorganizar as abas das Listas gerenciais",
  intent: "Trocar as onze abas planas por quatro grupos sem alterar o conteúdo das listas.",
  route: "/management",
  persona: "coordinator",
  fixture: "management-grouped-navigation",
  a11y: {
    keyboard: "full",
    contrast: "AA",
    notes: "Grupos e itens são operáveis por teclado; a seleção é indicada por texto e semântica, além da cor.",
  },
  status: "proposed",
  permissions: ["management.list"],
  preconditions: [
    "As onze listas gerenciais existentes continuam disponíveis e sem mudança de conteúdo.",
    "A pessoa tem `management.list`.",
  ],
  expected: [
    "A navegação mostra somente Operação, Agenda, Assistencial e Relatórios no primeiro nível.",
    "Operação contém Cadastro de Pacientes, Cadastro de Profissionais e Autorizações.",
    "Agenda contém Mapa de Horas e Faltas Profissionais.",
    "Assistencial contém Supervisores, Aplicadores, Responsáveis Clínicos e Planos terapêuticos.",
    "Relatórios contém Profissionais por Especialidade e Controle de Relatórios.",
    "Documentação não aparece nesta entrega.",
    "Selecionar um item abre a lista já existente; filtros, tabelas, ações, regras e permissões não fazem parte desta entrega.",
  ],
  tags: ["navegação", "trabalho-ativo"],
};

export const managementScenarios: Scenario[] = [
  ...legacyManagementScenarios,
  ...managementListReferences,
  groupedNavigationProposal,
];
