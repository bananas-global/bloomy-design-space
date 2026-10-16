import type { Feature } from "../../app/features.js";
import { ImprovementRequest, ImprovementRequestsManagement, MyImprovementRequests, NewImprovementRequest } from "../SolicitacoesMelhoria.js";
import { SM_FIXTURES } from "./fixtures.js";
import { DEFAULT_SM, DETAIL_CONTROLS, DETAIL_PATH, FLOW, MANAGE_CONTROLS, MANAGE_PATH, MINE_CONTROLS, NEW_CONTROLS, NEW_PATH, PATH, detailPath } from "./flow.js";

/** Componentes do catálogo que a central usa. */
const HUB_COMPONENTS = [
  "layout.backoffice", "core.card-tabs", "core.header", "core.button", "core.card", "core.inside-card",
  "core.table", "core.simple-table", "core.tag", "core.input", "core.custom-select", "core.radio-selector",
  "core.empty-state-card", "core.item", "core.notification", "core.breadcrumbs", "core.toast-wrapper", "core.error", "core.drawer-modal",
];

/** Componentes do catálogo que a página Nova solicitação usa. */
const NEW_COMPONENTS = [
  "layout.backoffice", "core.card", "core.button", "core.input", "core.custom-select", "core.radio-group",
  "core.file-uploader", "core.item", "core.error", "core.breadcrumbs", "core.notification", "core.tag", "core.drawer-modal",
];

/** Componentes do catálogo que o detalhe usa. */
const DETAIL_COMPONENTS = [
  "layout.backoffice", "core.card", "core.header", "core.button", "core.tag", "core.input", "core.custom-select",
  "core.radio-group", "core.checkbox-group", "core.switch-card",
  "core.timeline-list", "core.file-uploader", "core.item", "core.empty-state-card", "core.notification",
  "core.breadcrumbs", "core.toast-wrapper", "core.modal", "core.drawer-modal",
];

type HubScenario = {
  id: string;
  title: string;
  controls: Record<string, string>;
  intent: string;
  expected: string[];
  fixture?: string;
  rules?: string[];
  network?: "error";
};

/** As regras de negócio da especificação v3 do PMO, citadas pelos cenários. */
const RULES = [
  { id: "sm.rn-001", statement: "RN-001 · O solicitante descreve a dor, não a solução." },
  { id: "sm.rn-002", statement: "RN-002 · Score final ponderado = soma de nota × peso × 20 nos cinco critérios (Impacto 30%, Abrangência 15%, Risco 20%, Alinhamento 15%, Urgência 20%), com notas inteiras de 0 a 5." },
  { id: "sm.rn-003", statement: "RN-003 · P0 – Mandatória só pela exceção; pelo score, P1 – Crítica de 80 a 100, P2 – Alta de 60 a 79, P3 – Média de 40 a 59 e P4 – Baixa de 0 a 39." },
  { id: "sm.rn-004", statement: "RN-004 · A exceção P0 sobrepõe o score e exige justificativa (risco ao paciente, parada de faturamento, exigência legal com prazo, compliance)." },
  { id: "sm.rn-005", statement: "RN-005 · O resultado da triagem decide o caminho: aprovada, execução imediata, resolver por processo ou treinamento e correção seguem para a matriz; necessita aprofundamento fica na triagem; não realizar rejeita e cancelar / duplicidade cancela, as duas com justificativa e aviso ao solicitante." },
  { id: "sm.rn-006", statement: "RN-006 · Havendo workaround (planilha, papel, controle paralelo), Risco e Impacto têm nota mínima 3." },
  { id: "sm.rn-007", statement: "RN-007 · Nada vai para a Tech sem reunião de desenho de cenários com regras e requisitos validados." },
  { id: "sm.rn-008", statement: "RN-008 · No ramo de processo, a SM resolve sem software e encerra, ou exige automação e vai para a Tech." },
  { id: "sm.rn-009", statement: "RN-009 · Só conclui depois de homologar em produção com o solicitante." },
  { id: "sm.rn-010", statement: "RN-010 · O encerramento exige registro de ganho (horas, retrabalho, erros, valor) e recálculo dos KPIs." },
  {
    id: "sm.aprovacoes",
    statement: "Aprovações · Depois da matriz, a SM fica no backlog até a reunião de priorização do backlog (R PMO, Tech e Sócios). Depois do desenho de cenários, só segue para o direcionamento com a reunião de aprovação de cenário (R PMO, Tech, Solicitante e Sócios). Cada reunião decide entre seguir, não priorizar (a SM continua no backlog ou volta ao desenho de cenários) ou descontinuar (encerra), as duas últimas com justificativa.",
    rationale: "EPC \"Gerenciar e Implementar SM\": Etapa de Aprovação/Priorização e Etapa de Aprovação de Cenário. Sócios não têm tela: entram como participantes, e o PMO registra a decisão.",
  },
  { id: "sm.rn-011", statement: "RN-011 · Toda SM elegível (da triagem até o encerramento) tem plano de ação. O PMO registra as ações e atribui cada uma a um responsável, que pode ser o próprio solicitante ou alguém da área. O plano não trava nenhuma etapa." },
  { id: "sm.rn-012", statement: "RN-012 · Ao incluir uma ação, o responsável recebe uma notificação no sino. Quando o prazo vence sem a ação concluída, o responsável e o PMO recebem uma notificação de vencimento." },
  {
    id: "sm.auditoria",
    statement: "Mudança de P0, recusa, exclusão e as decisões de não priorizar ou descontinuar ficam no histórico com data, responsável e motivo.",
    rationale: "Requisito não funcional da especificação: o PMO responde por essas decisões.",
  },
];

const hub = (route: string) => (s: HubScenario) => ({
  route,
  fixture: s.fixture ?? "sm.base",
  persona: "admin",
  components: HUB_COMPONENTS,
  ...s,
});

const detail = (s: { id: string; title: string; sm: string; papel?: string; aviso?: string; intent: string; expected: string[]; rules?: string[]; network?: "error" }) => ({
  id: s.id,
  title: s.title,
  route: detailPath(s.sm),
  fixture: "sm.base",
  persona: "admin",
  controls: { papel: s.papel ?? "pmo", ...(s.aviso ? { aviso: s.aviso } : {}) },
  intent: s.intent,
  expected: s.expected,
  components: DETAIL_COMPONENTS,
  ...(s.rules ? { rules: s.rules } : {}),
  ...(s.network ? { network: s.network } : {}),
});

const mine = hub(PATH);
const manage = hub(MANAGE_PATH);

/** Solicitações de melhoria: a página do colaborador, a gestão, o detalhe e um atalho por etapa do fluxo. */
export const feature: Feature = {
  scenarios: [
    manage({
      id: "sm.dashboard",
      rules: ["sm.rn-010"],
      title: "Dashboard executivo (PMO)",
      controls: { papel: "pmo", aba: "painel" },
      intent: "O que o PMO precisa ver: o que está parado, se o fluxo anda, o valor entregue, onde a operação mais sofre e a fila.",
      expected: [
        "Sem filtros: os últimos 3 meses (entradas e saídas em 6), todas as unidades.",
        "Precisa de atenção: SM-003 (P0), SM-008 e SM-009 em triagem fora do prazo, SM-012 e SM-014 paradas, as ações vencidas (SM-008, SM-011, SM-014), o esclarecimento sem resposta da SM-009 e as que ganharam gente afetada na semana. Clicar abre a SM.",
        "Tempo médio em cada etapa contra o prazo (provisório), com a etapa mais lenta destacada e as acima do prazo em vermelho.",
        "Entradas e saídas por mês, com o aviso de que o backlog está crescendo, e \"Ver números\" em tabela.",
        "Valor entregue no período: capacidade liberada em h/mês, total concluído, % sem desenvolvimento, lead time e as últimas entregas.",
        "Onde dói: pessoas afetadas por macroprocesso e unidade, e as SMs com mais gente afetada fora do backlog.",
        "Plano de ação logo abaixo: as ações abertas de todas as SMs, as vencidas primeiro e em vermelho (SM-014, SM-008, SM-011). Precisa de atenção também aponta as SMs com ação vencida.",
        "Fila do backlog com esforço e espera na etapa, e a carga da Tech. SMs excluídas não entram em nada.",
      ],
    }),
    manage({
      id: "sm.dashboard-tech",
      title: "Dashboard da Tech",
      controls: { papel: "tech", aba: "painel" },
      intent: "A Tech vê o que é dela: o que está parado na execução e na validação, o fluxo e a fila.",
      expected: [
        "Precisa de atenção só com execução fora do prazo, validações pendentes, P0 em execução (SM-003) e as ações vencidas da Tech (SM-014).",
        "\"Ações da Tech\": só as ações em que Diego Martins é o responsável.",
        "Sem Valor entregue e Onde dói, que são do PMO.",
      ],
    }),
    manage({
      id: "sm.lista",
      title: "Solicitações em lista",
      controls: { papel: "pmo", aba: "solicitacoes", view: "lista" },
      intent: "A base de SMs numa tabela, da mais recente para a mais antiga.",
      expected: [
        "Colunas: Código, Solicitação (título, solicitante e área), Unidade, Aberta em, Afetados, Score, Prioridade e Etapa.",
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
        "Onze colunas, de Em triagem a Concluída, com Aguardando priorização e Cenário em aprovação para as duas reuniões; rejeitadas, canceladas, descontinuadas e excluídas ficam fora.",
        "Cartão com ação vencida no plano ganha o selo \"ação vencida\" (SM-008, SM-011, SM-014).",
        "Mesmo desenho do funil do CRM (colunas tingidas pela etapa, cartão com título, código e unidade, prioridade, área, score e esforço, afetados e dias na etapa em vermelho quando passa do prazo), sem arrastar: a etapa anda pelo detalhe.",
        "Cartões ordenados por prioridade e score.",
        "As rejeitadas ficam fora do kanban; a lista as mostra com o filtro de etapa Rejeitada.",
        "A Tech não tem Nova solicitação.",
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
      id: "sm.cards",
      title: "Todas as solicitações em cards (Solicitante)",
      controls: { view: "cards" },
      intent: "Carla Mendes, da recepção de Santana, chega pelo item Solicitações de melhoria do menu do usuário e vê as SMs da organização, para dizer quais também afetam a rotina dela.",
      expected: [
        "Uma página só, sem abas, com o título dentro do card: todas as SMs, em Cards, Lista ou Kanban (o kanban só para olhar).",
        "No menu do usuário, \"Solicitações de melhoria\" entre Meu perfil e Base de Conhecimento, para qualquer colaborador.",
        "Ordenadas por mais pessoas afetadas; as encerradas vão para o fim, com o relato fechado.",
        "Seletor Cards, Lista e Kanban no cabeçalho, ao lado de Nova solicitação.",
        "Na base de cada card, à esquerda, só informação: pessoas afetadas e visualizações (5600 aparece como \"5,6 mil\"). À direita, as ações: Detalhes e \"Também me afeta\".",
        "Sua solicitação (SM-006): borda azul e o selo, sem o botão. Te afeta (SM-008, SM-012): o selo, o seu relato e o \"Me afeta\" discreto, que a retira.",
        "Mostrar: Mais recentes, Mais pessoas afetadas e, para o colaborador, Minhas solicitações e Que me afetam.",
        "Encerradas: o desfecho no lugar do botão (\"Entregue · +32 h/mês\", \"Rejeitada na triagem\").",
        "A mesma ação na lista (coluna Ação) e no cartão do kanban; clicar no botão não abre o detalhe.",
        "\"Também me afeta\" abre um drawer pela direita com o resumo da SM, a unidade e a área de quem clica e um relato opcional. Abre igual nos cards, na lista e no kanban.",
        "Abrir o detalhe soma uma visualização, uma vez por SM na sessão.",
      ],
    }),
    {
      id: "sm.abertura",
      rules: ["sm.rn-001"],
      title: "Abertura: nova solicitação",
      route: NEW_PATH,
      fixture: "sm.base",
      persona: "admin",
      controls: { papel: "solicitante" },
      intent: "O formulário de 16 perguntas numa página, um card por seção, aberto pelo solicitante.",
      expected: [
        "Quatro cards, um abaixo do outro: Identificação, Necessidade e contorno, Impacto e urgência, Evidências e envio.",
        "Sem o menu lateral e o cabeçalho do sistema. Cabeçalho fixo com Voltar e o título; rodapé fixo com Cancelar e Enviar solicitação. Cada seção num card com o título, sem numeração.",
        "Identificação já vem com nome, contato, área e unidade de quem abre.",
        "Com prazo \"Sim\", pede os detalhes da data limite.",
        "Ao digitar o título (ex.: \"bloqueio de sala\"), sugere as SMs em andamento parecidas, com \"Também me afeta\" em cada uma.",
        "Enviar com pendência marca os campos e o card em vermelho, conta as pendências no rodapé e rola até o primeiro card pendente.",
        "Enviar exige confirmar que não há dados de pacientes; cria a SM em triagem, notifica o PMO e abre o detalhe.",
      ],
      components: NEW_COMPONENTS,
    },
    manage({
      id: "sm.cards-gestao",
      title: "Solicitações em cards (PMO)",
      controls: { papel: "pmo", aba: "solicitacoes", view: "cards" },
      intent: "O PMO vê a mesma base pelo alcance: quantas pessoas, unidades e áreas cada SM afeta.",
      expected: ["\"Mais pessoas afetadas\" em Mostrar põe primeiro as que mais alcançam gente; a lista ganha a coluna Afetados."],
    }),
    mine({
      id: "sm.minhas-acoes",
      rules: ["sm.rn-011", "sm.rn-012"],
      title: "Suas ações (Solicitante)",
      controls: { view: "cards" },
      intent: "No acompanhamento, Carla vê as ações do plano em que ela é a responsável, nas SMs dela.",
      expected: [
        "Card \"Suas ações\" acima das solicitações: as ações abertas dela, a vencida (SM-011) primeiro e em vermelho, com a SM e o prazo. Clicar abre a SM.",
        "No sino: \"Sua ação venceu\" e \"Nova ação para você\".",
        "Some quando ela não deve nada.",
      ],
    }),
    mine({
      id: "sm.vazio-colaborador",
      title: "Base vazia (Solicitante)",
      fixture: "sm.empty",
      controls: { view: "cards" },
      intent: "Antes da primeira SM da organização.",
      expected: ["\"Nenhuma solicitação ainda\", apontando para Nova solicitação."],
    }),
    mine({
      id: "sm.erro",
      title: "Erro ao carregar",
      network: "error",
      controls: { view: "cards" },
      intent: "A base não respondeu.",
      expected: ["\"Não foi possível carregar as solicitações\", com \"Tentar de novo\". O detalhe mostra o mesmo aviso."],
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
      rules: ["sm.rn-005"],
      title: "Triagem preliminar (PMO)",
      sm: "SM-008",
      intent: "O PMO preenche o bloco 4 da planilha na SM-008: problema real, macroprocesso, tipo, esforço, dependências, responsável pela análise e resultado da triagem.",
      expected: [
        "Responsável pela análise vem com o nome de quem está no PMO e pode ser trocado.",
        "Esforço estimado de Muito baixo a Muito alto, A estimar ou Não aplicável.",
        "\"Pedir esclarecimento\" registra a pergunta nos comentários e notifica o solicitante.",
        "Resultado que segue para a matriz: \"Concluir triagem\" libera com problema real, macroprocesso, tipo, esforço e responsável. Resolver por processo ou treinamento já marca o direcionamento a processo.",
        "Necessita aprofundamento: sem botão de avançar; a SM espera o esclarecimento.",
        "Não realizar ou Cancelar / duplicidade: justificativa; o botão encerra a SM (rejeitada ou cancelada) e notifica o solicitante.",
        "O histórico traz a troca de comentários com a planilha anexada.",
      ],
    }),
    detail({
      id: "sm.afetados",
      title: "Também me afeta, pelo detalhe (Solicitante)",
      sm: "SM-008",
      papel: "solicitante",
      intent: "Carla abre a SM-008 de outra recepção pelos cards: vê o problema e quem mais é afetado, sem o contato nem os anexos de quem pediu.",
      expected: [
        "Card \"Quem também é afetado\": unidades alcançadas, os relatos e quantos não escreveram nada.",
        "Ela já está entre os afetados; \"Me afeta\" a retira.",
        "Contato, links de apoio e anexos ficam para quem pediu, o PMO e a Tech.",
        "No lugar da etapa atual, o aviso de que a SM é de Beatriz Nogueira; sem a etapa, o rodapé de ações e o histórico de conversa.",
      ],
    }),
    detail({
      id: "sm.priorizacao",
      rules: ["sm.rn-002", "sm.rn-003", "sm.rn-004", "sm.rn-006", "sm.auditoria"],
      title: "Matriz de priorização (PMO)",
      sm: "SM-012",
      intent: "O bloco 5 da planilha: notas de 0 a 5 em cinco critérios ponderados geram o score final de 0 a 100 e a classificação P0–P4.",
      expected: [
        "Critérios na ordem da planilha: Impacto 30%, Abrangência 15%, Risco 20%, Alinhamento 15% e Urgência 20%, cada um com os pontos (nota × peso × 20) e a referência operacional.",
        "Classificação final: a tabela das faixas P0 a P4 com o tratamento de cada uma, a da SM em destaque, e a nota de que prioridade não é prazo.",
        "Com contorno relatado, Impacto e Risco não aceitam nota abaixo de 3.",
        "Abaixo de Abrangência, o alcance real: unidades, áreas e pessoas afetadas. É evidência para a nota, não muda o score sozinho.",
        "Exceção mandatória P0: ligar abre motivo e justificativa; só vale depois de \"Aplicar exceção P0\". Aplicada, sobrepõe o score e mostra quem aplicou e quando.",
        "\"Retirar exceção\" pede o motivo. Aplicar e retirar entram no histórico como Registro auditável.",
        "\"Salvar na base de backlog\" leva a SM para Aguardando priorização e notifica o solicitante. Ela ainda não está aprovada: espera a reunião de priorização do backlog.",
      ],
    }),
    detail({
      id: "sm.cenarios",
      rules: ["sm.rn-007"],
      title: "Reunião de desenho de cenários",
      sm: "SM-004",
      intent: "SM priorizada, no backlog ativo: a reunião com solicitante, áreas de interface e Tech mapeia regras e requisitos.",
      expected: ["\"Concluir reunião · enviar para aprovação\" libera com participantes e ao menos regras de negócio ou requisitos funcionais, e leva a SM para a aprovação de cenário."],
    }),
    detail({
      id: "sm.aprovacao-backlog",
      rules: ["sm.aprovacoes", "sm.auditoria"],
      title: "Reunião de priorização do backlog",
      sm: "SM-014",
      intent: "Depois da matriz, a SM fica no backlog até ser aprovada. A SM-014 já foi não priorizada uma vez e volta à pauta.",
      expected: [
        "RACI: R PMO, R Tech e R Sócios. O PMO registra a data, quem decidiu (PMO, Tech, Sócios), a decisão e a justificativa.",
        "Prioridade, score e esforço no topo, e a reunião anterior em laranja: \"SM não priorizada\" com o motivo.",
        "SM priorizada: segue para a reunião de desenho de cenários e avisa o solicitante e a Tech.",
        "SM não priorizada: continua em Aguardando priorização, com a justificativa no histórico como Registro auditável.",
        "SM descontinuada: botão vermelho, encerra o ciclo e notifica o solicitante com a justificativa.",
        "No fluxo horizontal, o passo \"Realizar reunião de priorização do backlog\" entre Salvar na base de backlog e o desenho de cenários.",
      ],
    }),
    detail({
      id: "sm.aprovacao-cenario",
      rules: ["sm.aprovacoes", "sm.rn-007"],
      title: "Reunião de aprovação de cenário",
      sm: "SM-015",
      intent: "O cenário desenhado precisa ser aprovado antes do direcionamento para modelagem ou desenvolvimento.",
      expected: [
        "RACI: R PMO, R Tech, R Solicitante e R Sócios. As regras e os requisitos mapeados aparecem para a decisão.",
        "Cenário aprovado: segue para Direcionar demanda.",
        "Cenário não aprovado: volta para a reunião de desenho de cenários, que mostra o que o grupo pediu para mudar.",
        "SM descontinuada: encerra com justificativa.",
      ],
    }),
    detail({
      id: "sm.descontinuada",
      rules: ["sm.aprovacoes", "sm.auditoria"],
      title: "Descontinuada na priorização",
      sm: "SM-016",
      intent: "Os sócios descontinuaram a SM-016 na reunião de priorização do backlog.",
      expected: [
        "Faixa \"Descontinuada na reunião de priorização do backlog\" com a justificativa.",
        "O fluxo para no passo da reunião (selo Descontinuada); os passos seguintes aparecem esmaecidos.",
        "Na governança, as reuniões de aprovação com a decisão, a data e quem decidiu.",
      ],
    }),
    detail({
      id: "sm.plano-acao",
      rules: ["sm.rn-011", "sm.rn-012"],
      title: "Plano de ação (PMO)",
      sm: "SM-011",
      intent: "O PMO deixa claro o que cada um ainda deve à SM, e até quando, sem travar o fluxo.",
      expected: [
        "Bloco Plano de ação abaixo da etapa: descrição, responsável, prazo e status (Pendente, Em andamento, Concluída) de cada ação.",
        "Vencida não é status: a ação com prazo passado e não concluída ganha a tag Vencida e a borda vermelha, e vai para o topo.",
        "\"Incluir ação\" abre um drawer pela direita, sem canto arredondado, com ação, responsável (usuários do admin, quem pediu primeiro) e prazo; o responsável é notificado no sino.",
        "\"Editar\" abre o mesmo drawer com o status. Trocar o responsável notifica o novo.",
        "O plano não trava a etapa: \"Concluir modelagem\" não depende das ações.",
        "Para quem pediu (papel Solicitante), o mesmo bloco: nas ações dela, Iniciar e Concluir, e o PMO é avisado.",
      ],
    }),
    detail({
      id: "sm.direcionar",
      rules: ["sm.rn-007", "sm.rn-008"],
      title: "Direcionar demanda",
      sm: "SM-005",
      intent: "Com o cenário aprovado, o PMO escolhe o caminho: processo, desenvolvimento ou os dois.",
      expected: ["Só processo vai para a modelagem; só desenvolvimento, para a Tech; os dois, modelagem e depois Tech."],
    }),
    detail({
      id: "sm.modelagem",
      rules: ["sm.rn-008"],
      title: "Modelagem de processo",
      sm: "SM-011",
      intent: "Fluxo, POP e capacitação, com as evidências anexadas na etapa.",
      expected: [
        "\"Concluir modelagem\" pede ao menos uma entrega e o resultado (sem ou com desenvolvimento).",
        "Sem desenvolvimento vai direto ao registro de ganhos; com, segue para a Tech.",
      ],
    }),
    detail({
      id: "sm.modelagem-solicitante",
      rules: ["sm.rn-008"],
      title: "Modelagem com quem pediu (Solicitante)",
      sm: "SM-011",
      papel: "solicitante",
      intent: "Carla Mendes pediu a SM-011 e modela o processo junto com o PMO (R e R no RACI).",
      expected: [
        "Na SM dela, os mesmos campos do PMO: entregas de processo, resultado da modelagem e \"Concluir modelagem\" no rodapé.",
        "Numa SM de outra pessoa, a mesma etapa não aparece: ela é colega ali.",
      ],
    }),
    detail({
      id: "sm.desenvolvimento",
      rules: ["sm.rn-004", "sm.rn-007"],
      title: "Em execução (Tech), P0",
      sm: "SM-003",
      papel: "tech",
      intent: "A Tech recebe a SM-003, P0 por exigência contratual, e marca a entrega em homologação.",
      expected: ["\"Funcionalidade implementada em homologação\" notifica o solicitante e o PMO."],
    }),
    detail({
      id: "sm.homologacao",
      rules: ["sm.rn-009"],
      title: "Aceite pendente (Solicitante)",
      sm: "SM-006",
      papel: "solicitante",
      intent: "A Tech já validou em produção; falta o aceite de Carla Mendes, que pediu a SM-006.",
      expected: [
        "Validação da Tech: \"Confirmado por Diego Martins\" com a data e a hora.",
        "\"Confirmar aceite\" fecha a homologação e leva a SM ao registro de ganhos.",
        "Só quem pediu confirma o aceite: o PMO acompanha, com o aviso de que a etapa é da Tech e de quem pediu.",
      ],
    }),
    detail({
      id: "sm.ganhos",
      rules: ["sm.rn-008", "sm.rn-010"],
      title: "Registro de ganhos (PMO)",
      sm: "SM-013",
      intent: "Processo implementado sem desenvolvimento: o PMO registra o ganho e encerra o ciclo.",
      expected: [
        "Tipo de ganho e descrição são obrigatórios; horas por mês alimentam a Economia gerada do dashboard.",
        "No fluxo, desenvolvimento e homologação aparecem riscados: \"Não se aplica neste caminho\".",
      ],
    }),
    detail({
      id: "sm.concluida",
      rules: ["sm.rn-009", "sm.rn-010"],
      title: "Ciclo encerrado",
      sm: "SM-001",
      intent: "Uma SM que percorreu o fluxo inteiro, com a governança completa.",
      expected: ["Faixa verde com o ganho registrado; o fluxo todo em verde, com o evento de cada passo."],
    }),
    detail({
      id: "sm.recusa",
      rules: ["sm.rn-005", "sm.auditoria"],
      title: "Rejeitada na triagem",
      sm: "SM-007",
      intent: "Triagem \"Não realizar\": a exportação já existia.",
      expected: [
        "Faixa vermelha com o resultado da triagem e a justificativa; o fluxo para em \"Registrar recusa com justificativa\".",
        "Status \"Rejeitada\". Uma recusa feita agora entra no histórico com o resultado e a justificativa, marcada como Registro auditável.",
      ],
    }),
    detail({
      id: "sm.enviada",
      title: "Confirmação de envio (Solicitante)",
      sm: "SM-009",
      papel: "solicitante",
      aviso: "enviada",
      rules: ["sm.rn-001"],
      intent: "O que Carla vê logo depois de enviar: a SM aberta com a confirmação no topo.",
      expected: [
        "Faixa verde \"Solicitação enviada · SM-009\": o PMO foi notificado e faz a triagem; ela é avisada a cada etapa.",
        "O \"x\" fecha a confirmação. Enviar uma nova solicitação abre o detalhe já com ela.",
      ],
    }),
    detail({
      id: "sm.exclusao",
      title: "Excluir solicitação (PMO)",
      sm: "SM-010",
      rules: ["sm.auditoria"],
      intent: "O PMO exclui uma SM aberta por engano, duplicada, de teste ou com dado de paciente.",
      expected: [
        "\"Excluir solicitação\", no rodapé à esquerda, abre o modal com motivo obrigatório e justificativa.",
        "Excluída: faixa \"Excluída pelo PMO\", Registro auditável no histórico e aviso ao solicitante.",
        "Some das listas dos colaboradores e dos indicadores do dashboard; na gestão, aparece com o filtro de etapa Excluída.",
      ],
    }),
  ],
  rules: RULES,
  fixtures: [...SM_FIXTURES],
  routes: [
    {
      path: PATH,
      screen: MyImprovementRequests,
      name: "Solicitações de melhoria",
      group: FLOW,
      description: "Para qualquer colaborador, pelo menu do usuário: as SMs da organização e as dele, \"Também me afeta\" e a abertura de uma nova solicitação.",
      controls: MINE_CONTROLS,
      expected: [
        "Entrada pelo item \"Solicitações de melhoria\" do menu do usuário ou pelo menu lateral, que só tem esse item.",
        "Sem abas: todas as SMs em cards, lista ou kanban.",
        "\"Também me afeta\" soma a pessoa à SM com a unidade, a área e um relato opcional.",
        "Nova solicitação abre a página do formulário de 16 perguntas.",
        "O sino mostra as notificações da pessoa; clicar abre a SM.",
      ],
      components: HUB_COMPONENTS,
    },
    {
      path: MANAGE_PATH,
      screen: ImprovementRequestsManagement,
      name: "Gestão de melhorias",
      group: FLOW,
      description: "Para PMO e Tech, por URL: painel executivo e a base em lista, kanban ou cards, com as pessoas afetadas.",
      controls: MANAGE_CONTROLS,
      expected: [
        "PMO e Tech chegam pelo item Solicitações de melhoria do menu lateral, pela URL ou pelas notificações.",
        "PMO e Tech veem Painel executivo e Solicitações, nessa ordem; a Tech abre Solicitações no kanban.",
        "Sem a permissão, a tela barra e leva às solicitações da pessoa.",
        "O PMO também registra uma nova solicitação em nome de quem pediu por outro canal.",
        "Exportar base baixa um CSV com separador ;.",
      ],
      components: HUB_COMPONENTS,
    },
    {
      path: NEW_PATH,
      screen: NewImprovementRequest,
      name: "Nova solicitação",
      group: FLOW,
      description: "O formulário de 16 perguntas numa página sem o menu do sistema: um card por seção, cabeçalho e rodapé fixos.",
      controls: NEW_CONTROLS,
      expected: [
        "Abre pelo botão Nova solicitação de Solicitações de melhoria (colaborador) ou da gestão (PMO).",
        "Voltar e Cancelar levam de volta à tela de origem; Enviar cria a SM e abre o detalhe.",
      ],
      components: NEW_COMPONENTS,
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
        "Um colega (quem não pediu) não vê a etapa nem a conversa: vê o fluxo, quem também é afetado e as respostas, sem contato e anexos.",
        "O fluxo marca os passos feitos, o atual e os que não se aplicam ao caminho escolhido.",
        "Comentar notifica os outros dois papéis; anexar evidência registra no histórico.",
        "O solicitante pode cancelar a própria SM enquanto ela está em triagem ou priorização.",
        "Plano de ação para PMO, Tech e quem pediu, da triagem ao encerramento; o colega não vê.",
        "Voltar leva o solicitante às solicitações dele, e PMO e Tech à gestão.",
      ],
      components: DETAIL_COMPONENTS,
    },
  ],
};
