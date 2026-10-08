import type { Feature } from "../../app/features.js";
import { ImprovementRequest, ImprovementRequestsManagement, MyImprovementRequests } from "../SolicitacoesMelhoria.js";
import { SM_FIXTURES } from "./fixtures.js";
import { DEFAULT_SM, DETAIL_CONTROLS, DETAIL_PATH, FLOW, MANAGE_CONTROLS, MANAGE_PATH, MINE_CONTROLS, PATH, detailPath } from "./flow.js";

/** Componentes do catálogo que a central usa. */
const HUB_COMPONENTS = [
  "layout.backoffice", "core.card-tabs", "core.header", "core.button", "core.card", "core.inside-card", "core.progress",
  "core.table", "core.simple-table", "core.tag", "core.input", "core.custom-select", "core.radio-selector",
  "core.empty-state-card", "core.modal", "core.steps", "core.radio-group", "core.file-uploader", "core.item", "core.notification",
  "core.breadcrumbs", "core.toast-wrapper", "core.error",
];

/** Componentes do catálogo que o detalhe usa. */
const DETAIL_COMPONENTS = [
  "layout.backoffice", "core.card", "core.header", "core.button", "core.tag", "core.input", "core.custom-select",
  "core.radio-selector", "core.radio-cards", "core.radio-group", "core.checkbox-group", "core.switch-card",
  "core.timeline-list", "core.file-uploader", "core.item", "core.empty-state-card", "core.notification",
  "core.breadcrumbs", "core.toast-wrapper",
];

type HubScenario = { id: string; title: string; controls: Record<string, string>; intent: string; expected: string[]; fixture?: string };

const hub = (route: string) => (s: HubScenario) => ({
  route,
  fixture: s.fixture ?? "sm.base",
  persona: "admin",
  components: HUB_COMPONENTS,
  ...s,
});

const detail = (s: { id: string; title: string; sm: string; papel?: string; intent: string; expected: string[] }) => ({
  id: s.id,
  title: s.title,
  route: detailPath(s.sm),
  fixture: "sm.base",
  persona: "admin",
  controls: { papel: s.papel ?? "pmo" },
  intent: s.intent,
  expected: s.expected,
  components: DETAIL_COMPONENTS,
});

const mine = hub(PATH);
const manage = hub(MANAGE_PATH);

/** Solicitações de melhoria: Minhas solicitações, a gestão, o detalhe e um atalho por etapa do fluxo. */
export const feature: Feature = {
  scenarios: [
    manage({
      id: "sm.painel",
      title: "Painel executivo (PMO)",
      controls: { papel: "pmo", aba: "painel" },
      intent: "A visão do PMO: volume, etapa, prioridade, eficiência da triagem, fila do backlog e ganhos.",
      expected: [
        "Seis indicadores: Total de SMs (13), Em análise (4), Backlog aprovado (2), Em execução (3), Entregues (2) e Economia de TI (38 h/mês, 2 resolvidas sem desenvolvimento).",
        "SMs por etapa do fluxo, uma caixa por etapa na ordem do kanban.",
        "Distribuição por prioridade de P0 a P4; a recusada não conta.",
        "Fila priorizada do backlog: as cinco primeiras por prioridade e score, entre backlog, cenários, modelagem e desenvolvimento. Clicar abre o detalhe.",
      ],
    }),
    manage({
      id: "sm.lista",
      title: "Solicitações em lista",
      controls: { papel: "pmo", aba: "solicitacoes", view: "lista" },
      intent: "A base de SMs numa tabela, da mais recente para a mais antiga.",
      expected: [
        "Colunas: Código, Solicitação (título, solicitante e área), Unidade, Aberta em, Score, Prioridade e Etapa.",
        "Busca por código, título ou solicitante; filtros de unidade, etapa e prioridade.",
        "Sem notas, a prioridade aparece \"A definir\" e o score \"—\".",
        "Clicar numa linha abre o detalhe.",
      ],
    }),
    manage({
      id: "sm.kanban",
      title: "Kanban do fluxo (Tech)",
      controls: { papel: "tech", aba: "solicitacoes", view: "kanban" },
      intent: "A Tech abre no kanban: uma coluna por etapa, com o responsável da etapa no cabeçalho.",
      expected: [
        "Nove colunas, de Em triagem a Concluída; recusadas e canceladas ficam fora.",
        "Cartões ordenados por prioridade e score: código, prioridade, título, unidade e área, score e esforço (ou a data de abertura) e os apoios.",
        "\"Ver recusadas (1)\" volta para a lista filtrada pela etapa Recusada.",
        "A Tech não tem Ideias nem Nova solicitação.",
      ],
    }),
    manage({
      id: "sm.sem-acesso",
      title: "Gestão sem acesso",
      controls: { papel: "solicitante" },
      intent: "Um solicitante que recebeu o link da gestão: a URL não basta, a permissão é que libera.",
      expected: [
        "\"Você não tem acesso à gestão de melhorias\", com o botão para as solicitações dele.",
        "Nenhum dado da base aparece.",
      ],
    }),
    mine({
      id: "sm.minhas",
      title: "Minhas solicitações (Solicitante)",
      controls: { aba: "solicitacoes" },
      intent: "Carla Mendes, da recepção de Santana, chega pelo item Solicitações de melhoria do menu do usuário e vê só as SMs que abriu.",
      expected: [
        "No menu do usuário, \"Solicitações de melhoria\" entre Meu perfil e Base de Conhecimento, para qualquer colaborador.",
        "Duas SMs: SM-009 (Em triagem) e SM-002 (Concluída), em lista; sem kanban nem Exportar base.",
        "No sino, \"Aceite pendente\" da SM-006 e o pedido de esclarecimento da SM-008, já lido.",
      ],
    }),
    mine({
      id: "sm.ideias",
      title: "Votação em ideias",
      controls: { aba: "ideias" },
      intent: "As SMs em andamento por número de apoios, para apoiar as que também afetam a sua rotina.",
      expected: [
        "Concluídas, recusadas e canceladas não aparecem.",
        "Apoiar soma um ao contador e pinta o botão; clicar de novo retira o apoio.",
        "Os apoios não mudam o score.",
      ],
    }),
    mine({
      id: "sm.nova",
      title: "Nova solicitação",
      controls: { aba: "solicitacoes", nova: "aberto" },
      intent: "O formulário de 16 perguntas em quatro passos, aberto pelo solicitante.",
      expected: [
        "Identificação já vem com nome, contato, área e unidade de quem abre.",
        "Indicador de etapas com `steps/1` e o nome do passo embaixo.",
        "\"Próximo\" não avança com campo obrigatório vazio: marca os campos e conta as pendências no rodapé.",
        "\"Como você contorna essa situação hoje?\" é obrigatório, com a explicação do porquê.",
        "Com prazo \"Sim\", pede os detalhes da data limite.",
        "Enviar exige confirmar que não há dados de pacientes; cria a SM em triagem, notifica o PMO e abre o detalhe.",
      ],
    }),
    manage({
      id: "sm.vazio",
      title: "Base de SMs vazia",
      fixture: "sm.empty",
      controls: { papel: "pmo", aba: "solicitacoes", view: "lista" },
      intent: "Antes da primeira solicitação.",
      expected: ["A tabela mostra \"Nenhuma solicitação encontrada\"; o painel mostra zeros e a fila vazia."],
    }),
    detail({
      id: "sm.triagem",
      title: "Triagem preliminar (PMO)",
      sm: "SM-008",
      intent: "O PMO analisa a SM-008: causa raiz, macroprocesso, tipo, dependências, esforço e o resultado da triagem.",
      expected: [
        "\"Pedir esclarecimento\" registra a pergunta nos comentários e notifica o solicitante.",
        "Elegível: \"Concluir triagem\" libera com causa raiz, macroprocesso e esforço; a SM vai para a matriz de critérios.",
        "Inelegível: critério e justificativa; \"Registrar recusa\" encerra a SM e notifica o solicitante.",
        "O histórico traz a troca de comentários com a planilha anexada.",
      ],
    }),
    detail({
      id: "sm.priorizacao",
      title: "Matriz de critérios (PMO)",
      sm: "SM-012",
      intent: "Notas de 0 a 5 em cinco critérios ponderados geram o score de 0 a 100 e a prioridade P0–P4.",
      expected: [
        "Pesos: Impacto 30%, Risco 20%, Urgência 20%, Abrangência 15% e Alinhamento 15%.",
        "Com contorno relatado, Impacto e Risco não aceitam nota abaixo de 3.",
        "Exceção mandatória P0 sobrepõe o score e exige motivo e justificativa.",
        "\"Salvar na base de backlog\" aprova a SM e notifica o solicitante.",
      ],
    }),
    detail({
      id: "sm.cenarios",
      title: "Reunião de desenho de cenários",
      sm: "SM-004",
      intent: "Backlog ativo: a reunião com solicitante, áreas de interface e Tech mapeia regras e requisitos.",
      expected: ["\"Concluir reunião\" libera com participantes e ao menos regras de negócio ou requisitos funcionais."],
    }),
    detail({
      id: "sm.direcionar",
      title: "Direcionar demanda",
      sm: "SM-005",
      intent: "Com os cenários mapeados, o PMO escolhe o caminho: processo, desenvolvimento ou os dois.",
      expected: ["Só processo vai para a modelagem; só desenvolvimento, para a Tech; os dois, modelagem e depois Tech."],
    }),
    detail({
      id: "sm.modelagem",
      title: "Modelagem de processo",
      sm: "SM-011",
      intent: "Fluxo, POP e capacitação, com as evidências anexadas na etapa.",
      expected: [
        "\"Concluir modelagem\" pede ao menos uma entrega e o resultado (sem ou com desenvolvimento).",
        "Sem desenvolvimento vai direto ao registro de ganhos; com, segue para a Tech.",
      ],
    }),
    detail({
      id: "sm.desenvolvimento",
      title: "Em desenvolvimento, P0 (Tech)",
      sm: "SM-003",
      papel: "tech",
      intent: "A Tech recebe a SM-003, P0 por exigência contratual, e marca a entrega em homologação.",
      expected: ["\"Funcionalidade implementada em homologação\" notifica o solicitante e o PMO."],
    }),
    detail({
      id: "sm.homologacao",
      title: "Aceite pendente (Solicitante)",
      sm: "SM-006",
      papel: "solicitante",
      intent: "A Tech já validou em produção; falta o aceite do solicitante.",
      expected: ["\"Confirmar aceite\" fecha a homologação e leva a SM ao registro de ganhos."],
    }),
    detail({
      id: "sm.ganhos",
      title: "Registro de ganhos (PMO)",
      sm: "SM-013",
      intent: "Processo implementado sem desenvolvimento: o PMO registra o ganho e encerra o ciclo.",
      expected: [
        "Tipo de ganho e descrição são obrigatórios; horas por mês alimentam a Economia de TI do painel.",
        "No fluxo, desenvolvimento e homologação aparecem riscados: \"Não se aplica neste caminho\".",
      ],
    }),
    detail({
      id: "sm.concluida",
      title: "Ciclo encerrado",
      sm: "SM-001",
      intent: "Uma SM que percorreu o fluxo inteiro, com a governança completa.",
      expected: ["Faixa verde com o ganho registrado; o fluxo todo em verde, com o evento de cada passo."],
    }),
    detail({
      id: "sm.recusada",
      title: "Recusada na triagem",
      sm: "SM-007",
      intent: "Dúvida operacional simples: a exportação já existia.",
      expected: ["Faixa vermelha com o critério e a justificativa; o fluxo para em \"Registrar recusa com justificativa\"."],
    }),
  ],
  fixtures: [...SM_FIXTURES],
  routes: [
    {
      path: PATH,
      screen: MyImprovementRequests,
      name: "Minhas solicitações",
      group: FLOW,
      description: "Para qualquer colaborador, pelo menu do usuário: as SMs que abriu, a votação em ideias e a abertura de uma nova solicitação.",
      controls: MINE_CONTROLS,
      expected: [
        "Entrada pelo item \"Solicitações de melhoria\" do menu do usuário; sem item no menu lateral.",
        "Abas Minhas solicitações (só as da pessoa, em lista) e Ideias.",
        "Nova solicitação abre o formulário de 16 perguntas em quatro passos.",
        "O sino mostra as notificações da pessoa; clicar abre a SM.",
      ],
      components: HUB_COMPONENTS,
    },
    {
      path: MANAGE_PATH,
      screen: ImprovementRequestsManagement,
      name: "Gestão de melhorias",
      group: FLOW,
      description: "Para PMO e Tech, por URL: painel executivo, a base em lista ou kanban e a votação em ideias.",
      controls: MANAGE_CONTROLS,
      expected: [
        "Sem item em menu: PMO e Tech chegam pela URL ou pelas notificações.",
        "PMO vê Painel executivo, Solicitações e Ideias; Tech, Solicitações (no kanban) e Painel executivo.",
        "Sem a permissão, a tela barra e leva às solicitações da pessoa.",
        "O PMO também registra uma nova solicitação em nome de quem pediu por outro canal.",
        "Exportar base baixa um CSV com separador ;.",
      ],
      components: HUB_COMPONENTS,
    },
    {
      path: DETAIL_PATH,
      params: { id: DEFAULT_SM },
      screen: ImprovementRequest,
      name: "Detalhe da solicitação",
      group: FLOW,
      description: "A SM com a etapa atual, a governança, as respostas, o fluxo oficial e o histórico com os comentários.",
      controls: DETAIL_CONTROLS,
      expected: [
        "O cartão Etapa atual mostra o que a etapa pede e o RACI; quem não executa vê os campos desabilitados e o aviso de quem executa.",
        "O fluxo marca os passos feitos, o atual e os que não se aplicam ao caminho escolhido.",
        "Comentar notifica os outros dois papéis; anexar evidência registra no histórico.",
        "O solicitante pode cancelar a própria SM enquanto ela está em triagem ou priorização.",
        "Voltar leva o solicitante às solicitações dele, e PMO e Tech à gestão.",
      ],
      components: DETAIL_COMPONENTS,
    },
  ],
};
