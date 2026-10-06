/**
 * CRM de Leads — o modelo do funil comercial.
 *
 * Um lead é um negócio que passa por três mãos: Comercial (Novo Lead até
 * Qualificação), Coordenação (Agendamento de Visita) e Orçamentista (Validação
 * Técnica e Aceite). Cada etapa só avança quando o checklist dela está
 * completo; o ajuste manual de etapa fica registrado no histórico.
 *
 * Novo: o Phoenix (`prospect_live`) tem a lista, o modal de cinco abas e o
 * drawer de Efetivar Paciente. Funil, painel do negócio por papel, checklist,
 * relatório da visita, autorização e laudos ainda não existem lá.
 */
import type { TagVariant } from "../../components/Tag.js";
import { TODAY } from "../../components/today.js";

/* ---------- datas (relativas ao TODAY do ambiente) ---------- */

const DAY = 86_400_000;
const parse = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** A data `n` dias depois (ou antes) de hoje, em ISO. */
export const dOff = (n: number) => new Date(parse(TODAY) + n * DAY).toISOString().slice(0, 10);

/** Dias de hoje até `iso` (negativo quando já passou). */
export const daysFromToday = (iso?: string | null) => (iso ? Math.round((parse(iso) - parse(TODAY)) / DAY) : null);

/** Dias entre duas datas, nunca negativo. */
export const daysBetween = (a?: string, b?: string) => (!a || !b ? null : Math.max(0, Math.round((parse(b) - parse(a)) / DAY)));

export const dayLabel = (n: number | null) => (n === null ? "" : n === 0 ? "mesmo dia" : n === 1 ? "1 dia" : `${n} dias`);

/** `2026-07-30` → `30/07/2026`. */
export const fmtBR = (iso?: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** `2026-07-30` → `30/07`. */
export const fmtBRShort = (iso?: string | null) => (iso ? fmtBR(iso).slice(0, 5) : "—");

export const addMonths = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1 + n, d)).toISOString().slice(0, 10);
};

/* ---------- etapas ---------- */

export type StageId = "novo" | "contato" | "avaliacao" | "agendada" | "proposta" | "aguardando" | "desqualificado" | "perdido";
export type ColumnId = StageId | "efetivado";
export type RoleId = "comercial" | "coordenacao" | "orcamento";

/** Cor de cada etapa: as variantes de `<.tag>`, como em `prospect_step_tag`. */
export type StageColor = Extract<TagVariant, "blue" | "brand" | "purple" | "cyan" | "orange" | "yellow" | "green" | "red" | "dark-purple">;

export const COLUMNS: { id: ColumnId; label: string; color: StageColor }[] = [
  { id: "novo", label: "Novo Lead", color: "blue" },
  { id: "contato", label: "Em Contato", color: "brand" },
  { id: "avaliacao", label: "Qualificação", color: "purple" },
  { id: "agendada", label: "Agendamento de Visita", color: "cyan" },
  { id: "proposta", label: "Validação Técnica", color: "orange" },
  { id: "aguardando", label: "Aceite", color: "yellow" },
  { id: "efetivado", label: "Efetivado", color: "green" },
  { id: "desqualificado", label: "Desqualificados", color: "dark-purple" },
  { id: "perdido", label: "Perdido", color: "red" },
];

export const STATUSES: { id: StageId; label: string }[] = [
  { id: "novo", label: "Novo Lead" },
  { id: "contato", label: "Em Contato" },
  { id: "avaliacao", label: "Qualificação" },
  { id: "agendada", label: "Agendamento de Visita" },
  { id: "proposta", label: "Validação Técnica" },
  { id: "aguardando", label: "Aceite" },
  { id: "desqualificado", label: "Desqualificado" },
  { id: "perdido", label: "Perdido" },
];

export const statusLabel = (id: string) => (STATUSES.find((s) => s.id === id) ?? STATUSES[0]!).label;
export const columnOf = (id: string) => COLUMNS.find((c) => c.id === id) ?? COLUMNS[0]!;

export const ROLES: Record<RoleId, { label: string; tab: TabId }> = {
  comercial: { label: "Comercial", tab: "negocio" },
  coordenacao: { label: "Coordenação", tab: "visita" },
  orcamento: { label: "Orçamentista", tab: "autorizacao" },
};

export type TabId = "negocio" | "visita" | "autorizacao" | "historico";

/* ---------- listas ---------- */

export const OWNERS = ["Ana Beatriz", "Carla Nunes", "Rodrigo Alves"];
export const ORIGINS = ["Instagram", "Indicação", "Site", "Google", "WhatsApp"];
export const SUPPORT_LEVELS = ["Nível 1", "Nível 2", "Nível 3"];
export const SCHOOL_SHIFTS = ["Manhã", "Tarde", "Integral", "Não estuda"];
export const WEEKDAYS = ["Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado", "Domingo"];
export const SPECIALTIES = ["Fonoaudiologia", "Psicologia", "Terapia Ocupacional", "Psicopedagogia", "Fisioterapia", "Análise do Comportamento"];
export const UNITS = ["Zona Leste", "Santana", "Unidade Teste"];
export const COORDINATORS = ["Camila Duarte", "Renata Alves", "Gustavo Pires", "Paula Antunes"];
export const RELATIONS = ["Mãe", "Pai", "Avó / Avô", "Tio(a)", "Cuidador(a)", "Tutor(a) legal", "Outro"];
export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
export const LOST_REASONS = ["Preço", "Distância / localização", "Escolheu outra clínica", "Sem retorno da família", "Não elegível ao plano", "Sem vaga no horário", "Plano não autorizou"];

/** Planos atendidos pela Bloomy × planos fora da rede (ficam só no histórico do lead). */
export const OPERATORS_IN = ["Bradesco", "Medservice", "Porto Saúde", "Omint", "Care Plus", "Unimed Salto Itu", "Unimed Seguros", "Unimed Campinas", "Alice"];
export const OPERATORS_OUT = ["Amil", "Prevent Senior", "Hapvida", "UNIMED FESP", "UNIMED CNU", "UNIMED Sorocaba", "UNIMED Jundiaí", "UNIMED Baixa Mogiana"];
export const OPERATOR_OTHER = "Outros";
export const OPERATOR_OPTIONS = [
  { label: "Planos atendidos", options: OPERATORS_IN },
  { label: "Outros planos", options: OPERATORS_OUT },
  { label: "Outros", options: ["Particular", OPERATOR_OTHER] },
];

export const FOLLOW_FILTERS = [
  { id: "late", label: "Atrasado" },
  { id: "today", label: "Para hoje" },
  { id: "week", label: "Próximos 7 dias" },
  { id: "none", label: "Sem follow-up" },
];

export const CHANNELS = [
  { id: "whatsapp", label: "WhatsApp", icon: "fa-brands fa-whatsapp" },
  { id: "ligacao", label: "Ligação", icon: "fa-phone" },
  { id: "email", label: "E-mail", icon: "fa-envelope" },
  { id: "visita", label: "Visita", icon: "fa-house-chimney-user" },
];

export const CID_OPTIONS = ["F84.0 - Autismo Infantil", "F84.1 - Autismo Atípico", "F84.5 - Síndrome de Asperger", "F90.0 - TDAH", "F41.0 - Transtorno do Pânico", "F80.0 - Transtorno de Fala", "F70 - Retardo mental leve", "F80.1 - Transtorno de Linguagem"];
export const REINFORCER_OPTIONS = ["Herói", "Bexiga", "Giz de Cera", "Bola", "Doces", "Bolha", "Música", "Tablet", "Massinha", "Carrinho"];
export const MOBILITY_LOCOMOTION = ["Independente", "Com apoio", "Cadeira de rodas", "Não deambula"];
export const MOBILITY_AIDS = ["Andador", "Muletas", "Órteses (AFO)", "Cadeira de rodas", "Bengala", "Nenhum"];

export type ToggleOption = { id: string; title: string; desc: string };
export const BEHAVIORS: ToggleOption[] = [
  { id: "fuga", title: "Fuga", desc: "Corre de salas, esquiva-se de tarefas e demandas." },
  { id: "autoagressao", title: "Autoagressão", desc: "Bate a própria cabeça, se morde, se arranha." },
  { id: "heteroagressao", title: "Heteroagressão", desc: "Bate, morde, chuta ou empurra outras pessoas." },
  { id: "destruicao", title: "Destruição", desc: "Joga, quebra ou rasga materiais e objetos." },
  { id: "choro", title: "Choro / Gritos Intensos", desc: "Crises prolongadas e difíceis de acalmar." },
  { id: "estereotipias", title: "Estereotipias Motoras/Vocais", desc: "Movimentos ou sons repetitivos que bloqueiam." },
];
export const COMMUNICATION: ToggleOption[] = [
  { id: "nao_vocal", title: "Não-Vocal", desc: "Não produz fala funcional / aponta e puxa." },
  { id: "semi_vocal", title: "Semi-Vocal", desc: "Fala apenas palavras soltas, sons isolados." },
  { id: "vocal_funcional", title: "Vocal Funcional", desc: "Consegue formular frases completas." },
  { id: "comunicacao_alt", title: "Comunicação Alternativa", desc: "PECS, figuras, tablet." },
];
export const MOBILITY: ToggleOption[] = [
  { id: "apoio_transferencia", title: "Apoio para Transferências", desc: "Precisa de ajuda para sentar, levantar, subir na maca." },
  { id: "escadas", title: "Escadas com Apoio", desc: "Sobe e desce degraus somente com auxílio ou corrimão." },
  { id: "tonus", title: "Alteração de Tônus", desc: "Hipotonia ou hipertonia que afeta postura e marcha." },
  { id: "coordenacao", title: "Coordenação Motora Global", desc: "Quedas frequentes, dificuldade de equilíbrio." },
];
export const SENSORY: ToggleOption[] = [
  { id: "auditiva", title: "Sensibilidade Auditiva", desc: "Reage com choro ou tapa os ouvidos com sons." },
  { id: "movimento", title: "Busca por Movimento", desc: "Agitação motora extrema, escala móveis." },
  { id: "alimentar", title: "Seletividade Alimentar", desc: "Recusa alimentar acentuada ou restrição." },
  { id: "tatil", title: "Sensibilidade Tátil", desc: "Intolerância a sujeira nas mãos, texturas." },
];

export const REPORT_HAPPENED = [{ id: "sim", label: "Sim, aconteceu" }, { id: "faltou", label: "Não compareceu" }, { id: "remarcar", label: "Pediu para remarcar" }];
export const REPORT_WHO = ["Mãe", "Pai", "A criança", "Outro cuidador"];
export const REPORT_PRESENTED = ["Metodologia e plano de terapia", "Equipe e especialidades", "Espaço e rotina da unidade", "Horários disponíveis", "Permanência do responsável", "Cobertura do convênio"];
export const REPORT_OBJECTIONS = ["Precisa ficar na clínica", "Carga horária alta", "Distância da unidade", "Horários não batem", "Valores ou cobertura", "Comparando com outra clínica"];
export const REPORT_OUTCOMES = [{ id: "decidida", label: "Decidida" }, { id: "interessada", label: "Interessada" }, { id: "duvida", label: "Em dúvida" }, { id: "sem", label: "Sem interesse" }];
export const AUTH_RESULTS = [{ id: "integral", label: "Autorizado integralmente" }, { id: "reducao", label: "Autorizado com redução" }, { id: "negado", label: "Negado" }];

/* ---------- tipos ---------- */

export type Guardian = { id: string; name: string; relation: string; phone: string; email: string };
export type Availability = { day: string; from: string; to: string };
export type SpecialtyHours = { spec: string; hours: number };
export type Visit = { id: string; date: string; time: string; unit: string; coord: string; scheduledBy: string };
export type TimelineEntry = { id: string; kind: "contact" | "stage" | "lost"; channel?: string; label?: string; text: string; at: string; by: string };
export type Address = { cep: string; street: string; number: string; comp: string; district: string; city: string; uf: string };

export type MedicalDoc = {
  id: string;
  specialty: string;
  doctor: string;
  crm: string;
  issuedAt: string;
  expiresAt: string;
  mandatory: boolean;
  hoursMode: "weekly" | "undetermined";
  hours: string;
  file: string;
};

export type Report = {
  happened: string;
  who: string[];
  presented: string[];
  objections: string[];
  outcome: string;
  noteForSales: string;
  sentAt: string;
};

export type Auth = { sentAt: string; protocol: string; returnAt: string; result: string; note: string; authorized: Record<number, string> };

export type Lead = {
  id: string;
  status: StageId;
  stageSince: string;
  updatedAt: string;
  owner: string;
  origin: string;
  nextFollowUp: string;
  lostReason: string;
  disqualReason: string;
  notes: string;
  guardians: Guardian[];
  prefUnit: string;
  addr: Address;
  child: string;
  age: number;
  schoolShift: string;
  operator: string;
  operatorOther: string;
  cardNumber: string;
  cardFile: string;
  specialties: SpecialtyHours[];
  availability: Availability[];
  medicalDocs: MedicalDoc[];
  visits: Visit[];
  timeline: TimelineEntry[];
  cidMain: string[];
  cidAssoc: string[];
  support: string;
  priorTherapy: string;
  behaviors: Record<string, boolean>;
  comm: Record<string, boolean>;
  mobility: Record<string, boolean>;
  sensory: Record<string, boolean>;
  locomotion: string;
  mobilityAids: string[];
  mobilityNotes: string;
  reinforcers: string[];
  report: Report;
  auth: Auth;
};

export const blankAddress = (): Address => ({ cep: "", street: "", number: "", comp: "", district: "", city: "", uf: "SP" });

/** Um lead novo, como abre em "Novo Lead". */
export function blankLead(id = `ld-${Date.now()}`): Lead {
  return {
    id, status: "novo", stageSince: TODAY, updatedAt: TODAY, owner: "", origin: "Indicação", nextFollowUp: "", lostReason: "", disqualReason: "", notes: "",
    guardians: [{ id: "g1", name: "", relation: "Mãe", phone: "", email: "" }],
    prefUnit: "", addr: blankAddress(), child: "", age: 3, schoolShift: "Manhã",
    operator: "", operatorOther: "", cardNumber: "", cardFile: "",
    specialties: [{ spec: "Fonoaudiologia", hours: 4 }], availability: [{ day: "Segunda-Feira", from: "08:00", to: "12:00" }],
    medicalDocs: [], visits: [], timeline: [],
    cidMain: [], cidAssoc: [], support: "", priorTherapy: "Não",
    behaviors: {}, comm: {}, mobility: {}, sensory: {}, locomotion: "", mobilityAids: [], mobilityNotes: "", reinforcers: [],
    report: { happened: "", who: [], presented: [], objections: [], outcome: "", noteForSales: "", sentAt: "" },
    auth: { sentAt: "", protocol: "", returnAt: "", result: "", note: "", authorized: {} },
  };
}

/* ---------- derivados ---------- */

export const guardianOf = (l: Lead) => l.guardians[0] ?? { id: "", name: "", relation: "", phone: "", email: "" };
export const hoursOf = (l: Lead) => l.specialties.reduce((s, x) => s + (Number(x.hours) || 0), 0);
export const operatorName = (l: Lead, empty = "Não informado") => (!l.operator ? empty : l.operator === OPERATOR_OTHER ? l.operatorOther || "Outros" : l.operator);
export const currentVisit = (l: Lead) => [...l.visits].reverse().find((v) => v.date && v.unit && v.coord) ?? null;
export const reportOk = (l: Lead) => l.report.happened === "sim" && l.report.presented.length > 0 && !!l.report.outcome;
export const daysInStage = (l: Lead) => Math.max(0, -(daysFromToday(l.stageSince) ?? 0));
export const isOpen = (l: Lead) => l.status !== "perdido" && l.status !== "desqualificado";

/** Iniciais para o avatar: duas primeiras palavras. */
export const initialsOf = (name: string) =>
  (name.trim() || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/* ---------- desqualificação automática ---------- */

/** Etapas em que um lead fora dos critérios vai sozinho para Desqualificados. */
const DQ_EARLY: StageId[] = ["novo", "contato", "avaliacao"];
const DQ_MAX_AGE = 17;

export function disqualifyReason(l: Pick<Lead, "operator" | "age">) {
  if (l.operator && OPERATORS_OUT.includes(l.operator)) return `Plano fora da rede (${l.operator})`;
  if (Number(l.age) > DQ_MAX_AGE) return "Fora da faixa etária atendida";
  return "";
}

export function autoRoute(l: Lead): Lead {
  if (!DQ_EARLY.includes(l.status)) return l;
  const reason = disqualifyReason(l);
  return reason ? { ...l, status: "desqualificado", disqualReason: reason } : l;
}

/* ---------- follow-up ---------- */

export type FollowTone = "none" | "late" | "today" | "ok";

export function followTone(iso: string): FollowTone {
  const d = daysFromToday(iso);
  if (d === null) return "none";
  if (d < 0) return "late";
  if (d === 0) return "today";
  return "ok";
}

export function followText(iso: string) {
  const d = daysFromToday(iso);
  if (d === null) return "Sem follow-up";
  if (d < 0) return `Atrasado ${Math.abs(d)}d`;
  if (d === 0) return "Follow-up hoje";
  if (d === 1) return "Follow-up amanhã";
  return `Follow-up ${fmtBRShort(iso)}`;
}

export function matchFollow(iso: string, mode: string) {
  const d = daysFromToday(iso);
  if (mode === "none") return d === null;
  if (d === null) return false;
  if (mode === "late") return d < 0;
  if (mode === "today") return d === 0;
  if (mode === "week") return d >= 0 && d <= 7;
  return true;
}

/* ---------- autorização (linha do card) ---------- */

export type AuthInfo = { id: "autorizado" | "negado" | "solicitado" | "pendente"; label: string; title: string };

export function authInfo(l: Lead): AuthInfo {
  const a = l.auth;
  const protocol = `Protocolo ${a.protocol || "—"}`;
  if (a.result === "negado") return { id: "negado", label: `Negado${a.returnAt ? ` em ${fmtBR(a.returnAt)}` : ""}`, title: protocol };
  if (a.result) return { id: "autorizado", label: `${a.result === "reducao" ? "Autorizado c/ redução" : "Autorizado"}${a.returnAt ? ` em ${fmtBR(a.returnAt)}` : ""}`, title: protocol };
  if (a.sentAt) {
    const d = daysBetween(a.sentAt, TODAY);
    return { id: "solicitado", label: d === 0 ? "Solicitado hoje" : `Em análise há ${dayLabel(d)}`, title: protocol };
  }
  return { id: "pendente", label: "Sem autorização", title: "Visita ainda não encaminhada para autorização" };
}

/** O status de autorização só aparece no card quando é assunto: de Validação Técnica em diante, ou se já foi solicitada. */
export const authShown = (l: Lead) => authInfo(l).id !== "pendente" && (["proposta", "aguardando"].includes(l.status) || !!l.auth.sentAt);

/* ---------- checklist ---------- */

export type ChecklistItem = { id: string; role: RoleId; label: string; test: (l: Lead) => boolean };

export function requiredDocs(l: Lead) {
  return [
    { id: "laudo", label: "Pedido médico ou laudo", ok: l.medicalDocs.length > 0, tab: "negocio" as TabId },
    { id: "cart", label: "Carteirinha do convênio", ok: l.operator === "Particular" || !!l.cardFile, tab: "negocio" as TabId },
    { id: "rel", label: "Relatório da visita", ok: reportOk(l), tab: "visita" as TabId },
  ];
}

export const CHECKLIST: ChecklistItem[] = [
  { id: "resp", role: "comercial", label: "Responsável com telefone", test: (l) => !!(guardianOf(l).name.trim() && guardianOf(l).phone.trim()) },
  { id: "contato", role: "comercial", label: "Primeiro contato registrado", test: (l) => l.timeline.some((t) => t.kind === "contact") },
  { id: "crianca", role: "comercial", label: "Dados da criança", test: (l) => !!l.child.trim() && Number(l.age) > 0 },
  { id: "plano", role: "comercial", label: "Plano de saúde e carteirinha", test: (l) => l.operator === "Particular" || !!(l.operator && l.cardNumber) },
  { id: "carga", role: "comercial", label: "Carga horária por especialidade", test: (l) => hoursOf(l) > 0 },
  { id: "disp", role: "comercial", label: "Disponibilidade da família", test: (l) => l.availability.length > 0 },
  { id: "laudo", role: "comercial", label: "Pedido médico ou laudo anexado", test: (l) => l.medicalDocs.length > 0 },
  { id: "endereco", role: "comercial", label: "Unidade e endereço", test: (l) => !!(l.prefUnit && l.addr.street.trim() && l.addr.number.trim() && l.addr.city.trim()) },
  { id: "agenda", role: "comercial", label: "Visita agendada", test: (l) => !!currentVisit(l) },
  { id: "realizada", role: "coordenacao", label: "Visita realizada", test: (l) => l.report.happened === "sim" },
  { id: "relatorio", role: "coordenacao", label: "Relatório da visita", test: reportOk },
  { id: "anamnese", role: "coordenacao", label: "Pré-anamnese", test: (l) => l.cidMain.length > 0 && !!l.support },
  { id: "interesse", role: "coordenacao", label: "Família confirmou que quer seguir", test: (l) => l.report.outcome === "decidida" },
  { id: "enviado", role: "coordenacao", label: "Enviado para autorização", test: (l) => !!l.report.sentAt },
  { id: "docs", role: "orcamento", label: "Documentos exigidos", test: (l) => requiredDocs(l).every((d) => d.ok) },
  { id: "solicitacao", role: "orcamento", label: "Solicitação enviada ao convênio", test: (l) => !!(l.auth.sentAt && l.auth.protocol.trim()) },
  { id: "retorno", role: "orcamento", label: "Retorno do convênio", test: (l) => !!l.auth.result && l.auth.result !== "negado" },
  {
    id: "autorizada", role: "orcamento", label: "Carga autorizada registrada",
    test: (l) => l.specialties.length > 0 && l.specialties.every((_, i) => l.auth.authorized[i] !== undefined && l.auth.authorized[i] !== ""),
  },
];

export const checkItem = (id: string) => CHECKLIST.find((i) => i.id === id)!;

export type Stage = { id: StageId; label: string; role: RoleId; sla: number; needs: string[] };

export const STAGES: Stage[] = [
  { id: "novo", label: "Novo Lead", role: "comercial", sla: 1, needs: ["resp"] },
  { id: "contato", label: "Em Contato", role: "comercial", sla: 2, needs: ["contato"] },
  { id: "avaliacao", label: "Qualificação", role: "comercial", sla: 5, needs: ["crianca", "plano", "carga", "disp", "laudo", "endereco", "agenda"] },
  { id: "agendada", label: "Agendamento de Visita", role: "coordenacao", sla: 7, needs: ["realizada", "relatorio", "anamnese", "interesse", "enviado"] },
  { id: "proposta", label: "Validação Técnica", role: "orcamento", sla: 10, needs: ["docs", "solicitacao", "retorno", "autorizada"] },
  { id: "aguardando", label: "Aceite", role: "orcamento", sla: 3, needs: [] },
];

export const stageOf = (id: string) => STAGES.find((s) => s.id === id) ?? null;
export const stageOfItem = (itemId: string) => STAGES.find((s) => s.needs.includes(itemId)) ?? null;
export const pendingOf = (l: Lead) => (stageOf(l.status)?.needs ?? []).filter((id) => !checkItem(id).test(l));

/** Onde cada item do checklist se preenche (o `data-anchor` do card). */
export const ANCHORS: Record<string, string> = {
  resp: "resp", contato: "contato", crianca: "crianca", plano: "crianca", carga: "carga", disp: "carga", laudo: "laudo", endereco: "endereco", agenda: "agenda",
  realizada: "relatorio", relatorio: "relatorio", interesse: "relatorio", enviado: "relatorio", anamnese: "anamnese",
  docs: "docs", solicitacao: "solicitacao", retorno: "solicitacao", autorizada: "autorizada",
};

/**
 * A troca de etapa, com o registro no histórico. Pular etapa (ou voltar) é
 * "ajuste manual".
 */
export function moveLead(l: Lead, to: StageId, extra: Partial<Lead> = {}): Lead {
  const from = STAGES.findIndex((s) => s.id === l.status);
  const dest = STAGES.findIndex((s) => s.id === to);
  const manual = from >= 0 && dest !== from + 1 ? " (ajuste manual)" : "";
  const text = to === "perdido"
    ? `Negócio perdido — ${extra.lostReason || "sem motivo"}`
    : `${statusLabel(l.status)} → ${statusLabel(to)}${manual}`;
  return {
    ...l, ...extra, status: to, stageSince: TODAY, updatedAt: TODAY,
    timeline: [{ id: `t-${Date.now()}`, kind: to === "perdido" ? "lost" : "stage", text, at: TODAY, by: l.owner || "Você" }, ...l.timeline],
  };
}

/* ---------- laudos ---------- */

export const MEDICAL_SPECIALTIES = ["Pediatra", "Neuropediatra", "Psiquiatra Infantil"];
export const MEDICAL_VALIDITY_MONTHS = 6;
export const MEDICAL_STATUS = [
  { id: "ok", label: "Válido" },
  { id: "soon", label: "Vence em breve" },
  { id: "late", label: "Vencido" },
  { id: "none", label: "Sem validade" },
];

export type DocTone = "ok" | "soon" | "late" | "none";

export function docTone(d: MedicalDoc): DocTone {
  const n = daysFromToday(d.expiresAt);
  if (n === null) return "none";
  if (n < 0) return "late";
  if (n <= 30) return "soon";
  return "ok";
}

export function docLabel(d: MedicalDoc) {
  const n = daysFromToday(d.expiresAt);
  if (n === null) return "Sem validade";
  if (n < 0) return `Vencido há ${Math.abs(n)} d`;
  if (n === 0) return "Vence hoje";
  if (n <= 30) return `Vence em ${n} d`;
  return "Válido";
}

export const blankDoc = (): MedicalDoc => ({
  id: "", specialty: "Neuropediatra", doctor: "", crm: "", issuedAt: TODAY, expiresAt: addMonths(TODAY, MEDICAL_VALIDITY_MONTHS),
  mandatory: true, hoursMode: "weekly", hours: "", file: "",
});

export const docHoursLabel = (d: MedicalDoc) =>
  d.hoursMode === "undetermined" ? "Carga indeterminada" : d.hours ? `${Number(d.hours).toLocaleString("pt-BR")}h/semana prescritas` : "Carga não informada";
