/**
 * Solicitações de melhoria (SM) — o modelo do fluxo.
 *
 * Tudo aqui vem do protótipo `Solicitações de Melhoria v2` do Claude Design:
 * as listas de opção, as etapas do fluxo oficial (EPC "Gerenciar e Implementar
 * SM"), a matriz de critérios ponderados, a régua de prioridade P0–P4 e o RACI
 * de cada etapa. Não existe no Phoenix: é proposta nova.
 */
import { TODAY } from "../../components/today.js";
import type { TagVariant } from "../../components/Tag.js";

/** Os três papéis do fluxo de SM. Não são papéis do Bloomy: valem para qualquer colaborador. */
export type Role = "pmo" | "solicitante" | "tech";

export const ROLES: { id: Role; label: string }[] = [
  { id: "pmo", label: "PMO" },
  { id: "solicitante", label: "Solicitante" },
  { id: "tech", label: "Tech" },
];

export const roleLabel = (role: Role) => ROLES.find((r) => r.id === role)!.label;

/* ============================================================
   Listas de opção
   ============================================================ */

export const L = {
  units: ["Santana", "Tatuapé", "Itu", "Salto", "Campinas", "Corporativo"],
  areas: ["Recepção", "Assistencial / Clínico", "Faturamento", "Financeiro", "Comercial", "Suprimentos / Farmácia", "People (RH)", "Tecnologia da Informação", "Governança & Processos", "Operações", "Marketing", "Administrativo"],
  macros: ["Atendimento / Recepção", "Assistencial / Clínico", "Faturamento / Contas Médicas", "Credenciamento", "Financeiro / Controladoria", "Suprimentos / Farmácia", "Gestão de Pessoas (RH)", "Tecnologia da Informação", "Governança & Qualidade", "Outro"],
  types: ["Melhoria de processo", "Nova funcionalidade", "Alteração de funcionalidade", "Correção de erro / Bug", "Relatório / Indicador", "Integração entre sistemas", "Dados / Cadastro / Parâmetro", "Acesso / Permissão", "Mudança de processo sem desenvolvimento", "Orientação / Treinamento", "Outro"],
  audience: ["Eu / Minha atividade individual", "Minha equipe de trabalho", "Uma área inteira", "Duas ou mais áreas", "Uma unidade inteira", "Múltiplas unidades", "Toda a organização", "Pacientes / Clientes externos"],
  freq: ["Eventualmente (raro)", "Semanalmente", "Diariamente", "Várias vezes ao dia", "Sempre que determinado evento ocorre"],
  impacts: ["Retrabalho manual", "Erro operacional", "Perda de tempo / lentidão", "Risco assistencial / paciente", "Impacto financeiro / glosa", "Falta de informação / indicador", "Dificuldade de controle / compliance"],
  p0Reasons: ["Obrigação regulatória / legal (ANS, CFM, LGPD)", "Risco assistencial / segurança do paciente", "Indisponibilidade de processo crítico", "Impacto financeiro relevante / iminente", "Incidente operacional crítico", "Dependência externa com prazo improrrogável", "Outro motivo justificado"],
  deps: ["Nenhuma", "Outro desenvolvimento", "Fornecedor / Terceiro", "Outro processo / área", "Decisão da diretoria", "Infraestrutura / servidor", "A definir"],
  /** Por que o PMO exclui uma SM. Fica no histórico com data, responsável e motivo. */
  deleteReasons: ["Aberta por engano", "Duplicada de outra SM", "Teste ou treinamento", "Contém dado de paciente", "Outro motivo"],
  gains: ["Horas economizadas", "Retrabalho eliminado", "Redução de glosas", "Redução de erros", "Mitigação de risco", "Valor financeiro preservado"],
  /** Esforço estimado (preliminar), da planilha do PMO. */
  efforts: ["Muito baixo", "Baixo", "Médio", "Alto", "Muito alto", "A estimar", "Não aplicável"],
  participants: ["Solicitante", "Áreas de interface", "Tech"],
  /** Quem decide na reunião de priorização do backlog (R no EPC). */
  backlogBoard: ["PMO", "Tech", "Sócios"],
  /** Quem decide na reunião de aprovação de cenário (R no EPC). */
  scenarioBoard: ["PMO", "Tech", "Solicitante", "Sócios"],
  /**
   * Usuários do admin que podem ser responsáveis por uma ação do plano. Fictícios:
   * o PMO, a Tech, a solicitante dos cenários e quem pediu as SMs da fixture.
   */
  staff: ["Manoel Alberto", "Diego Martins", "Carla Mendes", "Aline Dias", "Beatriz Nogueira", "Daniela Freire", "Fernanda Rocha", "Juliana Prado", "Luana Freitas", "Marcos Lima", "Paula Siqueira", "Rafael Tavares", "Renata Vieira", "Sérgio Antunes", "Tiago Nunes"],
};

/** Tuplas `{label, value}` para o `input/1` de `type="select"`. */
export const opts = (list: readonly string[]) => list.map((v) => [v, v] as const);

/**
 * Resultado da triagem (bloco 4 da planilha do PMO) e para onde ele leva a SM.
 * `matriz` segue para a priorização; `aprofundar` fica na triagem até o
 * esclarecimento; `rejeitar` e `cancelar` encerram com justificativa.
 * `route` já marca o direcionamento sem desenvolvimento.
 */
export type TriageNext = "matriz" | "aprofundar" | "rejeitar" | "cancelar";

export const TRIAGE: { value: string; next: TriageNext; hint: string; route?: Route }[] = [
  { value: "Aprovada para backlog", next: "matriz", hint: "Segue para a matriz de priorização." },
  { value: "Execução imediata", next: "matriz", hint: "Segue para a matriz; avalie a exceção mandatória P0." },
  { value: "Resolver por processo", next: "matriz", hint: "Segue para a matriz, já direcionada a processo, sem desenvolvimento.", route: "processo" },
  { value: "Resolver por treinamento", next: "matriz", hint: "Segue para a matriz, já direcionada a treinamento, sem desenvolvimento.", route: "processo" },
  { value: "Encaminhar para correção", next: "matriz", hint: "Segue para a matriz como correção de erro." },
  { value: "Necessita aprofundamento", next: "aprofundar", hint: "Fica na triagem até o solicitante esclarecer." },
  { value: "Não realizar", next: "rejeitar", hint: "Encerra a SM como rejeitada e avisa o solicitante." },
  { value: "Cancelar / duplicidade", next: "cancelar", hint: "Encerra a SM como cancelada e avisa o solicitante." },
];

export const triageOf = (value: string) => TRIAGE.find((t) => t.value === value);

/* ============================================================
   Etapas
   ============================================================ */

export type StageId = "triagem" | "priorizacao" | "aprovacao" | "backlog" | "validacao" | "cenarios" | "modelagem" | "execucao" | "homologacao" | "encerramento" | "concluida";
export type StatusId = StageId | "rejeitada" | "cancelada" | "excluida" | "descontinuada";
export type Tone = "blue" | "purple" | "yellow" | "orange" | "green" | "red" | "navy";

/** As colunas do kanban, na ordem do fluxo. */
export const ORDER: StageId[] = ["triagem", "priorizacao", "aprovacao", "backlog", "validacao", "cenarios", "modelagem", "execucao", "homologacao", "encerramento", "concluida"];

export const STATUS: Record<StatusId | "recebida", { label: string; tone: Tone; icon: string; owner: string }> = {
  recebida: { label: "Registrada", tone: "blue", icon: "fa-inbox", owner: "" },
  cancelada: { label: "Cancelada", tone: "navy", icon: "fa-circle-xmark", owner: "" },
  excluida: { label: "Excluída", tone: "navy", icon: "fa-trash-can", owner: "" },
  triagem: { label: "Em triagem", tone: "purple", icon: "fa-magnifying-glass", owner: "PMO · C Solicitante" },
  priorizacao: { label: "Em priorização", tone: "purple", icon: "fa-ranking-star", owner: "PMO · C Solicitante, Tech" },
  aprovacao: { label: "Aguardando priorização", tone: "yellow", icon: "fa-gavel", owner: "Reunião de priorização do backlog" },
  backlog: { label: "Backlog ativo", tone: "yellow", icon: "fa-layer-group", owner: "Reunião de cenários" },
  validacao: { label: "Cenário em aprovação", tone: "yellow", icon: "fa-stamp", owner: "Reunião de aprovação de cenário" },
  cenarios: { label: "Cenário aprovado", tone: "yellow", icon: "fa-diagram-project", owner: "PMO · direcionar" },
  modelagem: { label: "Modelagem de processos", tone: "purple", icon: "fa-sitemap", owner: "PMO + Solicitante" },
  execucao: { label: "Em execução (Tech)", tone: "orange", icon: "fa-code", owner: "Tech" },
  homologacao: { label: "Em homologação", tone: "blue", icon: "fa-clipboard-check", owner: "Tech + Solicitante" },
  encerramento: { label: "Registro de ganhos", tone: "green", icon: "fa-chart-line", owner: "PMO · atualizar status" },
  concluida: { label: "Concluída", tone: "green", icon: "fa-flag-checkered", owner: "Ciclo encerrado" },
  rejeitada: { label: "Rejeitada", tone: "red", icon: "fa-ban", owner: "" },
  descontinuada: { label: "Descontinuada", tone: "navy", icon: "fa-circle-stop", owner: "" },
};

/** A cor de cada tom na variante de `tag/1` que existe no sistema. */
export const TAG_OF: Record<Tone, TagVariant> = {
  blue: "light-blue",
  purple: "light-purple",
  yellow: "yellow",
  orange: "orange",
  green: "green",
  red: "red",
  navy: "dark-purple",
};

/** Fundo e texto de um tom, com os tokens do monólito (ícones de etapa, colunas do kanban). */
export const TONE_CLASS: Record<Tone, string> = {
  blue: "bg-blue-light text-blue-dark",
  purple: "bg-purple-light text-purple-dark",
  yellow: "bg-yellow/20 text-yellow-dark",
  orange: "bg-orange-light text-orange-dark",
  green: "bg-green-light text-green-dark",
  red: "bg-red-light text-red-dark",
  navy: "bg-brand-purple-dark/6 text-brand-purple-dark",
};

/** O que cada etapa ativa pede, como título do cartão "Etapa atual". */
export const CUR_LABEL: Partial<Record<StatusId, string>> = {
  triagem: "Triagem e classificação interna",
  priorizacao: "Matriz de priorização",
  aprovacao: "Reunião de priorização do backlog",
  backlog: "Reunião de desenho de cenários",
  validacao: "Reunião de aprovação de cenário",
  cenarios: "Direcionar demanda conforme tipo",
  modelagem: "Modelar processo, POP e treinamento",
  execucao: "Parametrizar e desenvolver sistema",
  homologacao: "Homologar resultado prático em produção",
  encerramento: "Atualizar status da SM e registrar ganhos",
};

/**
 * Responsável (R) e consultados (C) de cada etapa. "Áreas de interface" não é
 * papel com tela: são as áreas convidadas para a reunião de cenários e a
 * modelagem, registradas na própria SM (`interfaceAreas`).
 */
export const RACI: Partial<Record<StatusId, [string, string][]>> = {
  triagem: [["R", "PMO"], ["C", "Solicitante"]],
  priorizacao: [["R", "PMO"], ["C", "Solicitante"], ["C", "Tech"]],
  aprovacao: [["R", "PMO"], ["R", "Tech"], ["R", "Sócios"]],
  backlog: [["R", "PMO"], ["C", "Solicitante"], ["C", "Áreas de interface"], ["C", "Tech"]],
  validacao: [["R", "PMO"], ["R", "Tech"], ["R", "Solicitante"], ["R", "Sócios"]],
  cenarios: [["R", "PMO"]],
  modelagem: [["R", "PMO"], ["R", "Solicitante"], ["C", "Áreas de interface"]],
  execucao: [["R", "Tech"]],
  homologacao: [["R", "Tech"], ["R", "Solicitante"]],
  encerramento: [["R", "PMO"]],
};

/**
 * Quem executa a etapa: os R do RACI. Modelagem é do PMO com o solicitante;
 * homologação, da Tech com o solicitante. "Solicitante" é sempre quem pediu.
 * Nas duas reuniões de aprovação quem decide é o grupo; o PMO registra a decisão.
 */
export const OWNER: Partial<Record<StatusId, Role[]>> = {
  triagem: ["pmo"], priorizacao: ["pmo"], aprovacao: ["pmo"], backlog: ["pmo"], validacao: ["pmo"], cenarios: ["pmo"], modelagem: ["pmo", "solicitante"],
  execucao: ["tech"], homologacao: ["tech", "solicitante"], encerramento: ["pmo"],
};

/* ============================================================
   Prioridade
   ============================================================ */

export type PrioId = "P0" | "P1" | "P2" | "P3" | "P4";

/** As faixas da planilha do PMO: P0 só por exceção mandatória; P1 a P4 pelo score. */
export const PRIO: Record<PrioId, { short: string; full: string; tone: Tone; range: string; treatment: string }> = {
  P0: { short: "P0", full: "P0 – Mandatória", tone: "red", range: "Exceção", treatment: "Entrada prioritária imediata no ciclo de execução, independentemente do score." },
  P1: { short: "P1", full: "P1 – Crítica", tone: "orange", range: "80 a 100", treatment: "Prioridade absoluta no próximo ciclo de desenvolvimento." },
  P2: { short: "P2", full: "P2 – Alta", tone: "yellow", range: "60 a 79", treatment: "Alocação no ciclo seguinte, conforme capacidade e dependências." },
  P3: { short: "P3", full: "P3 – Média", tone: "blue", range: "40 a 59", treatment: "Entra no backlog geral, depois das P1 e P2." },
  P4: { short: "P4", full: "P4 – Baixa", tone: "purple", range: "0 a 39", treatment: "Backlog de oportunidade: só havendo capacidade ociosa." },
};

export type CritKey = "impact" | "risk" | "urgency" | "reach" | "alignment";
export type Scores = Record<CritKey, number>;

/** Os critérios do bloco 5 da planilha, na ordem dela. `ref` é a referência operacional (0 e 5). */
export const CRITS: { key: CritKey; label: string; w: number; ref: string; rub: string[] }[] = [
  { key: "impact", label: "Impacto no negócio / operação", w: 0.3, ref: "0 = sem impacto · 5 = impacto crítico", rub: ["Sem impacto relevante", "Muito baixo (ajuste estético)", "Baixo (pequeno incômodo)", "Relevante (retrabalho evidente)", "Alto (afeta rotina principal)", "Crítico (para operação ou faturamento)"] },
  { key: "reach", label: "Abrangência de usuários / unidades", w: 0.15, ref: "0 = individual · 5 = toda a organização", rub: ["Individual (1 usuário)", "Pequeno grupo (2 a 5)", "Uma equipe de trabalho", "Uma área ou unidade inteira", "Várias áreas ou unidades", "Toda a organização / corporativo"] },
  { key: "risk", label: "Risco operacional / assistencial", w: 0.2, ref: "0 = sem risco · 5 = risco gravíssimo", rub: ["Sem risco relevante", "Muito baixo / desprezível", "Baixo (erro facilmente corrigido)", "Relevante (gera passivo/glosa)", "Alto (risco grave a processos)", "Crítico (risco assistencial/legal fatal)"] },
  { key: "alignment", label: "Alinhamento estratégico", w: 0.15, ref: "0 = sem relação · 5 = essencial para metas", rub: ["Sem relação com metas", "Relação indireta", "Contribuição pequena", "Contribuição relevante", "Diretamente ligado a objetivos", "Essencial para o plano estratégico"] },
  { key: "urgency", label: "Urgência / janela de oportunidade", w: 0.2, ref: "0 = sem urgência · 5 = imediata / prazo fatal", rub: ["Sem urgência (desejável)", "Baixa urgência (confortável)", "Moderada (próximos ciclos)", "Urgente (impacto cumulativo)", "Muito urgente (prazo iminente)", "Imediata (prazo fatal / legal)"] },
];

/* ============================================================
   A solicitação
   ============================================================ */

export type SmFile = { id: string; name: string; size: number; url?: string };
/** `audit`: mudança de P0, recusa ou exclusão, que o PMO precisa poder auditar (data, responsável e motivo). */
export type HistoryEntry = { at: string; who: string; kind: StatusId | "recebida"; text: string; files?: SmFile[]; audit?: boolean };
export type SmComment = { at: string; who: string; text: string; files?: SmFile[] };
/** Alguém que também é afetado pela SM: de onde é e, se quis, como isso aparece na rotina. */
export type Affected = { at: string; who: string; unit: string; area: string; text: string };
export type Route = "processo" | "dev";

/**
 * As duas reuniões de aprovação do EPC: a de priorização do backlog (depois da
 * matriz) e a de aprovação de cenário (depois do desenho de cenários).
 */
export type ApprovalStage = "aprovacao" | "validacao";
/** `segue`: priorizada ou cenário aprovado; `volta`: não priorizada ou não aprovado; `descontinuada`: encerra. */
export type ApprovalDecision = "segue" | "volta" | "descontinuada";
export type Approval = { stage: ApprovalStage; at: string; who: string; date: string; participants: string[]; decision: ApprovalDecision; note: string };

export const APPROVAL: Record<ApprovalStage, { meeting: string; board: string[]; options: { v: ApprovalDecision; label: string; hint: string }[] }> = {
  aprovacao: {
    meeting: "Reunião de priorização do backlog",
    board: L.backlogBoard,
    options: [
      { v: "segue", label: "SM priorizada", hint: "Segue para a reunião de desenho de cenários e avisa o solicitante." },
      { v: "volta", label: "SM não priorizada", hint: "Continua no backlog e volta à pauta da próxima reunião de priorização." },
      { v: "descontinuada", label: "SM descontinuada", hint: "Atualiza o status e encerra o ciclo, com a justificativa enviada ao solicitante." },
    ],
  },
  validacao: {
    meeting: "Reunião de aprovação de cenário",
    board: L.scenarioBoard,
    options: [
      { v: "segue", label: "Cenário aprovado", hint: "Segue para o direcionamento: processo, desenvolvimento ou os dois." },
      { v: "volta", label: "Cenário não aprovado", hint: "Volta para a reunião de desenho de cenários, com o que precisa mudar." },
      { v: "descontinuada", label: "SM descontinuada", hint: "Atualiza o status e encerra o ciclo, com a justificativa enviada ao solicitante." },
    ],
  },
};

export const decisionLabel = (a: Pick<Approval, "stage" | "decision">) => APPROVAL[a.stage].options.find((o) => o.v === a.decision)!.label;

/* ============================================================
   Plano de ação
   ============================================================ */

export type ActionStatus = "Pendente" | "Em andamento" | "Concluída";
export const ACTION_STATUS: { v: ActionStatus; tag: TagVariant; icon: string }[] = [
  { v: "Pendente", tag: "dark-purple", icon: "fa-circle" },
  { v: "Em andamento", tag: "light-blue", icon: "fa-spinner" },
  { v: "Concluída", tag: "green", icon: "fa-circle-check" },
];

/** Uma ação do plano: o que alguém ainda deve à SM, e até quando (`due`, `aaaa-mm-dd`). */
export type SmAction = { id: string; text: string; owner: string; due: string; status: ActionStatus; createdAt: string; createdBy: string; doneAt?: string };

/** As 16 perguntas do formulário de abertura. */
export type SmForm = {
  requester: string;
  contact: string;
  area: string;
  unit: string;
  title: string;
  need: string;
  asIs: string;
  workaround: string;
  expected: string;
  audience: string;
  frequency: string;
  impactType: string;
  hasDeadline: "Sim" | "Não";
  deadline: string;
  consequence: string;
  attachments: string;
  files: SmFile[];
  lgpd: boolean;
};

export type Sm = Omit<SmForm, "lgpd"> & {
  id: string;
  createdAt: string;
  status: StatusId;
  // Triagem
  rootCause: string;
  macro: string;
  type: string;
  dependency: string;
  effort: string;
  /** Um dos valores de `TRIAGE`. */
  triage: string;
  /** Responsável pela análise da triagem. */
  analyst: string;
  /** Justificativa de "Não realizar" ou "Cancelar / duplicidade", enviada ao solicitante. */
  rejection: string;
  // Priorização
  scores: Scores | null;
  p0: boolean;
  p0Reason: string;
  p0Just: string;
  // Reunião de cenários
  meetingDate: string;
  participants: string[];
  interfaceAreas: string[];
  rules: string;
  reqs: string;
  // Direcionamento e modelagem
  routes: Route[];
  procFlow: boolean;
  procPop: boolean;
  procTraining: boolean;
  subpath: "" | "sem" | "com";
  // Homologação e encerramento
  homologTech: boolean;
  homologReq: boolean;
  /** Quem homologou e quando, em cada lado (RF-011). */
  homologTechBy: string;
  homologTechAt: string;
  homologReqBy: string;
  homologReqAt: string;
  gainType: string;
  gainHours: string;
  gainDesc: string;
  closedAt: string;
  // Reuniões de aprovação: o rascunho da reunião em curso e as decisões já tomadas.
  apDate: string;
  apParticipants: string[];
  apDecision: "" | ApprovalDecision;
  apNote: string;
  approvals: Approval[];
  /** Plano de ação (RN-011): o que cada um ainda deve à SM. */
  actions: SmAction[];
  affected: Affected[];
  /** Quantas vezes o detalhe foi aberto. */
  views: number;
  comments: SmComment[];
  history: HistoryEntry[];
};

export const blankForm = (): SmForm => ({
  requester: "", contact: "", area: "", unit: "", title: "", need: "", asIs: "", workaround: "", expected: "",
  audience: "", frequency: "", impactType: "", hasDeadline: "Não", deadline: "", consequence: "", attachments: "", files: [], lgpd: false,
});

/** O que a abertura sempre preenche; o resto tem padrão em `blankSm`. */
export type SmRequired = "id" | "createdAt" | "status" | "requester" | "area" | "unit" | "title" | "need" | "asIs" | "workaround" | "expected" | "audience" | "frequency" | "impactType" | "consequence";

export const blankSm = (): Omit<Sm, SmRequired> => ({
  files: [], contact: "", attachments: "", hasDeadline: "Não", deadline: "",
  rootCause: "", macro: "", type: "", dependency: "Nenhuma", effort: "", triage: "", analyst: "", rejection: "",
  scores: null, p0: false, p0Reason: "", p0Just: "", meetingDate: "", participants: [], interfaceAreas: [], rules: "", reqs: "",
  routes: [], procFlow: false, procPop: false, procTraining: false, subpath: "",
  homologTech: false, homologReq: false, homologTechBy: "", homologTechAt: "", homologReqBy: "", homologReqAt: "", gainType: "", gainHours: "", gainDesc: "", closedAt: "",
  apDate: "", apParticipants: [], apDecision: "", apNote: "", approvals: [], actions: [],
  affected: [], views: 0, comments: [], history: [],
});

/** Quem a tela mostra em cada papel. Fictícios. */
export const USERS: Record<Role, { name: string; area?: string; unit?: string; contact?: string }> = {
  solicitante: { name: "Carla Mendes", area: "Recepção", unit: "Santana", contact: "carla.mendes@bloomy.com.br" },
  pmo: { name: "Manoel Alberto", area: "Governança & Processos", unit: "Corporativo" },
  tech: { name: "Diego Martins", area: "Tecnologia da Informação", unit: "Corporativo" },
};

/** "Diego Martins em 03/08/2026 15:20": quem homologou cada lado e quando. */
export function homologOf(s: Pick<Sm, "homologTechBy" | "homologTechAt" | "homologReqBy" | "homologReqAt">) {
  const side = (by: string, at: string) => (by ? `${by} em ${at}` : "");
  return { tech: side(s.homologTechBy, s.homologTechAt), req: side(s.homologReqBy, s.homologReqAt) };
}

/* ============================================================
   Quem também é afetado
   ============================================================ */

/** Encerrada: não recebe mais "Também me afeta", mas segue visível para evitar pedido repetido. */
export const isClosed = (s: Pick<Sm, "status">) => ["concluida", "rejeitada", "cancelada", "excluida", "descontinuada"].includes(s.status);

/** O papel de um usuário do admin, quando ele é um dos três que a tela mostra. */
export const roleOfName = (name: string) => (Object.keys(USERS) as Role[]).find((r) => USERS[r].name === name);

/** Vencida: o prazo passou e a ação não foi concluída. Não é um status escolhido. */
export const isOverdue = (a: Pick<SmAction, "status" | "due">) => a.status !== "Concluída" && !!a.due && a.due < TODAY;

export const openActions = (s: Pick<Sm, "actions">) => s.actions.filter((a) => a.status !== "Concluída");
export const overdueActions = (s: Pick<Sm, "actions">) => s.actions.filter(isOverdue);

export const isMine = (s: Pick<Sm, "requester">, role: Role) => s.requester === USERS[role].name;

/** Pode agir na etapa atual: é R dela e, se for solicitante, é quem pediu. */
export const canAct = (s: Pick<Sm, "status" | "requester">, role: Role) =>
  (OWNER[s.status] ?? []).includes(role) && (role !== "solicitante" || isMine(s, role));

/** Um colaborador olhando a SM de outra pessoa. */
export const isColleague = (s: Pick<Sm, "requester">, role: Role) => role === "solicitante" && !isMine(s, role);

export const affectsMe = (s: Pick<Sm, "affected">, role: Role) => s.affected.some((a) => a.who === USERS[role].name);

/** As unidades e áreas distintas de quem pediu e de quem também é afetado. */
export function reachOf(s: Pick<Sm, "unit" | "area" | "affected">) {
  const units = [...new Set([s.unit, ...s.affected.map((a) => a.unit)])];
  const areas = [...new Set([s.area, ...s.affected.map((a) => a.area)])];
  return { units, areas, people: s.affected.length };
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Contagem curta, como nas redes: 5600 vira "5,6 mil". */
export const compact = (n: number) => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);

const STOP = new Set(["para", "como", "quando", "sobre", "entre", "depois", "antes", "sem", "com", "não", "após", "pelo", "pela", "cada", "mais", "todos", "todas"]);

/** Radicais das palavras com 4 letras ou mais: "bloqueios" e "bloqueio" casam. */
const stems = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !STOP.has(w))
      .map((w) => w.slice(0, 6)),
  );

/** SMs em andamento parecidas com um título: duas palavras em comum com o título ou a necessidade. */
export function similarTo(title: string, sms: Sm[], limit = 3): Sm[] {
  const words = stems(title);
  if (words.size < 2) return [];
  return sms
    .filter((s) => !isClosed(s))
    .map((s) => {
      const theirs = stems(`${s.title} ${s.need}`);
      return { s, hits: [...words].filter((w) => theirs.has(w)).length };
    })
    .filter((x) => x.hits >= 2)
    .sort((a, b) => b.hits - a.hits || b.s.affected.length - a.s.affected.length)
    .slice(0, limit)
    .map((x) => x.s);
}

/** O formulário de abertura já vem com os dados de quem abre, quando é o próprio solicitante. */
export function formFor(role: Role): SmForm {
  const me = USERS.solicitante;
  const base = blankForm();
  return role === "solicitante" ? { ...base, requester: me.name, contact: me.contact!, area: me.area!, unit: me.unit! } : base;
}

/* ============================================================
   Score, prioridade e textos derivados
   ============================================================ */

export function scoreOf(s: Pick<Sm, "scores">): number | null {
  if (!s.scores) return null;
  const c = s.scores;
  return Math.round((c.impact * 0.3 + c.risk * 0.2 + c.urgency * 0.2 + c.reach * 0.15 + c.alignment * 0.15) * 20 * 10) / 10;
}

export function prioOf(s: Pick<Sm, "scores" | "p0">): PrioId | null {
  const sc = scoreOf(s);
  if (sc == null) return null;
  return s.p0 ? "P0" : sc >= 80 ? "P1" : sc >= 60 ? "P2" : sc >= 40 ? "P3" : "P4";
}

/** `n,n` com vírgula, ou travessão sem valor. */
export const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toFixed(1).replace(".", ","));

export const routeText = (routes: Route[]) =>
  routes.map((r) => (r === "processo" ? "Processo, POP ou treinamento" : "Parametrização ou desenvolvimento")).join(" + ");

export const hasWorkaround = (s: Pick<Sm, "workaround">) => s.workaround.trim().length > 0;

/** Nota mínima de um critério: com contorno relatado, Impacto e Risco começam em 3. */
export const minScore = (s: Pick<Sm, "workaround">, key: CritKey) => (hasWorkaround(s) && (key === "impact" || key === "risk") ? 3 : 0);

/** A reunião em que a SM foi descontinuada. */
export const stoppedAt = (s: Pick<Sm, "approvals">) => s.approvals.filter((a) => a.decision === "descontinuada").at(-1)?.stage ?? "aprovacao";

/** Posição no fluxo: recusada, cancelada e excluída param na triagem; descontinuada, na reunião que a encerrou. */
export const stageIndex = (s: Pick<Sm, "status" | "approvals">) =>
  s.status === "descontinuada" ? ORDER.indexOf(stoppedAt(s)) : ["rejeitada", "cancelada", "excluida"].includes(s.status) ? 0 : ORDER.indexOf(s.status as StageId);

/** Para ordenar por prioridade e score: sem prioridade vai para o fim. */
export const prioRank = (s: Pick<Sm, "scores" | "p0">) => {
  const p = prioOf(s);
  return p ? Number(p[1]) : 9;
};

/* ============================================================
   Formulário de abertura
   ============================================================ */

export type FormErrors = Partial<Record<keyof SmForm, string>>;

export const FORM_STEPS: { label: string; keys: (keyof SmForm)[] }[] = [
  { label: "Identificação", keys: ["requester", "contact", "area", "unit", "title"] },
  { label: "Necessidade", keys: ["need", "asIs", "workaround", "expected"] },
  { label: "Impacto", keys: ["audience", "frequency", "impactType", "deadline", "consequence"] },
  { label: "Evidências", keys: ["lgpd"] },
];

export function validateForm(f: SmForm): FormErrors {
  const e: FormErrors = {};
  const req = "Campo obrigatório.";
  (["requester", "contact", "area", "unit", "title", "need", "asIs", "expected", "audience", "frequency", "impactType", "consequence"] as const).forEach((k) => {
    if (!String(f[k] ?? "").trim()) e[k] = req;
  });
  if (!f.workaround.trim()) e.workaround = "Este campo é obrigatório. Relate como a atividade é executada hoje (planilha, papel ou retrabalho).";
  if (f.hasDeadline === "Sim" && !f.deadline.trim()) e.deadline = req;
  if (!f.lgpd) e.lgpd = "Confirme que não há dados de pacientes antes de enviar.";
  return e;
}

export const stepErrors = (f: SmForm, step: number) => FORM_STEPS[step]!.keys.filter((k) => validateForm(f)[k]);

/* ============================================================
   Datas
   ============================================================ */

const pad = (n: number) => String(n).padStart(2, "0");

/** Data no formato do sistema (`dd/mm/aaaa`), a `days` dias de TODAY. */
export function dateBR(days = 0): string {
  const [y, m, d] = TODAY.split("-").map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d + days);
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

export const TODAY_BR = dateBR(0);

/** O mês `aaaa-mm` de um carimbo `dd/mm/aaaa…`. */
export const monthOf = (at: string) => `${at.slice(6, 10)}-${at.slice(3, 5)}`;

/** Os últimos `n` meses `aaaa-mm`, do mais antigo ao atual (o de TODAY). */
export function lastMonths(n: number): string[] {
  const [y, m] = TODAY.split("-").map(Number) as [number, number];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(y, m - 1 - (n - 1 - i), 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  });
}

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** "jul/26" de "2026-07". */
export const monthLabel = (ym: string) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`;

/** `aaaa-mm-dd` a `days` dias de TODAY (o valor de um `input type="date"`). */
export const dateISO = (days = 0) => dateBR(days).split("/").reverse().join("-");

/** Carimbo de agora: a data de referência do ambiente com a hora do relógio. */
export function nowStamp(): string {
  const d = new Date();
  return `${TODAY_BR} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Dias entre a data de um carimbo `dd/mm/aaaa…` e TODAY (negativo no passado). */
export function daysFromToday(at: string): number {
  const [d, m, y] = at.slice(0, 10).split("/").map(Number) as [number, number, number];
  const [ty, tm, td] = TODAY.split("-").map(Number) as [number, number, number];
  return Math.round((new Date(y, m - 1, d).getTime() - new Date(ty, tm - 1, td).getTime()) / 864e5);
}

/**
 * Prazo de cada etapa, em dias corridos. PROVISÓRIO: a especificação não define;
 * valores sugeridos para o painel apontar o que está parado, a validar com o PMO.
 */
export const SLA_DAYS: Record<Exclude<StageId, "concluida">, number> = {
  triagem: 5, priorizacao: 5, aprovacao: 7, backlog: 10, validacao: 5, cenarios: 3, modelagem: 15, execucao: 20, homologacao: 7, encerramento: 5,
};

/**
 * As passagens da SM pelas etapas, do histórico: quanto tempo ficou em cada uma
 * que já terminou e há quanto tempo está na atual.
 */
export function stageTimes(s: Pick<Sm, "createdAt" | "status" | "history">) {
  const moves = s.history
    .filter((h) => h.kind !== "recebida" && (ORDER as string[]).concat(["rejeitada", "excluida", "cancelada", "descontinuada"]).includes(h.kind))
    .map((h, i) => ({ kind: h.kind, key: sortKey(h.at, i), day: daysFromToday(h.at) }))
    .sort((a, b) => a.key - b.key);
  const done: Partial<Record<StageId, number>> = {};
  let stage: string = "triagem";
  let since = daysFromToday(s.createdAt);
  for (const m of moves) {
    if (m.kind === stage) continue;
    done[stage as StageId] = (done[stage as StageId] ?? 0) + Math.max(0, m.day - since);
    stage = m.kind;
    since = m.day;
  }
  return { done, current: { stage: s.status, days: Math.max(0, -since) } };
}

/** Há quantos dias a SM está na etapa atual. */
export const daysInStage = (s: Pick<Sm, "createdAt" | "status" | "history">) => stageTimes(s).current.days;

/** Chave ordenável de um carimbo `dd/mm/aaaa hh:mm`. */
export function sortKey(at: string, i = 0): number {
  const m = at.match(/(\d\d)\/(\d\d)\/(\d{4})(?: (\d\d):(\d\d))?/);
  if (!m) return i;
  return Number(m[3]! + m[2]! + m[1]! + (m[4] ?? "12") + (m[5] ?? "00")) * 100 + i;
}

/** `dd/mm/aaaa` de um `aaaa-mm-dd` (o valor de um `input type="date"`). */
export const isoToBR = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");

/** O tamanho do arquivo como o protótipo mostra: KB inteiro ou MB com uma casa. */
export function sizeStr(b: number): string {
  if (!b) return "";
  return b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
