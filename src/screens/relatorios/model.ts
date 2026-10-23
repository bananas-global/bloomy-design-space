/**
 * Relatórios do paciente (v2) — modelo e funções puras.
 *
 * Portado de `relatorios-core.jsx` e do que a v2 acrescenta
 * (`relatorios-patient-v2.jsx`, `relatorios-rotina-v2.jsx`,
 * `relatorios-share-v2.jsx`, `relatorios-autores.jsx`, `relatorios-fill.jsx`,
 * `relatorios-protocolo.jsx`). Sem relógio: "hoje" é `REL_TODAY`.
 *
 * Datas seguem o protótipo: `DD/MM/AAAA` e carimbos `DD/MM/AAAA HH:MM`.
 */

/* ============================================================
   Referências fixas
   ============================================================ */

/** "Hoje" do protótipo: 16/07/2026 09:00. */
export const REL_TODAY = new Date(2026, 6, 16, 9, 0, 0);
/** Profissional logado quando visto pelo perfil "Profissional responsável". */
export const REL_ME = "Helena Martins Costa";
/** Quem cria as solicitações no protótipo (coordenação). */
export const REL_REQUESTED_BY = "Marina Alves";
export const REL_REQUESTED_BY_SHORT = "Marina Alves";

/* ============================================================
   Tipos
   ============================================================ */

export type ReportStatus = "solicitado" | "em_andamento" | "assinaturas" | "finalizado" | "cancelado";
/** Status da lista v2: inclui "previsto", que não é registro, vem da rotina. */
export type ListStatus = "previsto" | ReportStatus;

export type ReportTypeKind = "model" | "custom" | "protocol" | "external";
export type ReportTypeId =
  | "evolucao_mensal" | "trimestral" | "avaliacao" | "admissao" | "alta" | "outro" | "protocolo" | "externo";
export type ReportType = { id: ReportTypeId; name: string; kind: ReportTypeKind };

export type Requester = "Operadora" | "Família" | "Equipe";

export type Professional = { id: string; name: string; specialty: string };
export type PatientRef = { id: string; name: string; age?: number };

/** Arquivo de apoio (não é o relatório final). */
export type SupportFile = { name: string; kind: string; size: string; at: string; by: string };
/** Documento final (PDF) do relatório emitido. */
export type FinalDoc = { name: string; size: string; at: string };

export type HistoryEntry = { at: string; who: string; text: string; icon: string };

export type Guardian = { id: string; name: string; relation: string };
export type ShareRecipient = Guardian & { viewedAt: string | null; viewCount: number };
/** Compartilhamento com os responsáveis legais (app da família). */
export type Share = {
  sharedAt: string;
  sharedBy: string;
  revokedAt: string | null;
  note: string;
  recipients: ShareRecipient[];
};
export type ShareState = "none" | "pending" | "partial" | "viewed" | "revoked";

/** Conteúdo do editor: textos por seção (`id` da seção) e campos extras. */
export type DraftContent = Record<string, unknown>;

export type Report = {
  id: string;
  patient: PatientRef;
  typeId: ReportTypeId;
  /** Nome livre de "Outro" e de "Relatório Externo". */
  customName?: string;
  period: string;
  /** Aplicação de protocolo finalizada (Relatório de protocolo). */
  protocolAppId?: string | null;
  requester: Requester;
  requestedBy: string;
  requestedAt: string;
  /** Prazo `DD/MM/AAAA`, ou "" sem prazo. */
  due: string;
  prof: Professional | null;
  status: ReportStatus;
  /** Há conteúdo salvo: rascunho em produção ou texto aguardando assinaturas. */
  hasDraft: boolean;
  updatedAt: string;
  obs: string;
  extra: string;
  support: SupportFile[];
  finalDoc: FinalDoc | null;
  cancelReason: string;
  history: HistoryEntry[];
  /** Coautores: editam o documento inteiro e assinam. */
  coauthors?: Professional[];
  /** Assinaturas por id de autor: carimbo de quando assinou. */
  signatures?: Record<string, string>;
  /** Rascunho salvo: quando e por quem. */
  draft?: { updatedAt: string; by: string };
  /** Conteúdo preenchido no editor (modelo interno, protocolo ou upload). */
  draftContent?: DraftContent;
  /** Coautor editando agora (indicador ao vivo). */
  editingNow?: string;
  /** Pedido de alteração feito durante as assinaturas. */
  changeRequest?: { by: string; reason: string; at: string };
  share?: Share;
};

/** Perspectiva da tela: coordenação ou profissional responsável. */
export type ViewAs = "coord" | "prof";

/* ============================================================
   Ciclo de vida
   ============================================================ */

export const REL_STATUS: Record<ReportStatus, { label: string; icon: string }> = {
  solicitado: { label: "Solicitado", icon: "fa-inbox" },
  em_andamento: { label: "Em andamento", icon: "fa-pen-ruler" },
  assinaturas: { label: "Aguardando assinaturas", icon: "fa-signature" },
  finalizado: { label: "Finalizado", icon: "fa-circle-check" },
  cancelado: { label: "Cancelado", icon: "fa-ban" },
};

/** Rótulos da v2 (a lista do paciente fala em "Emitido", "Em produção"…). */
export const LIST_STATUS: Record<ListStatus, { label: string; icon: string }> = {
  previsto: { label: "Previsto pela rotina", icon: "fa-regular fa-calendar" },
  solicitado: { label: "Solicitado", icon: "fa-solid fa-inbox" },
  em_andamento: { label: "Em produção", icon: "fa-solid fa-pen-ruler" },
  assinaturas: { label: "Aguardando assinatura", icon: "fa-solid fa-signature" },
  finalizado: { label: "Emitido", icon: "fa-solid fa-circle-check" },
  cancelado: { label: "Cancelado", icon: "fa-solid fa-ban" },
};
export const LIST_STATUS_ORDER: ListStatus[] = ["previsto", "solicitado", "em_andamento", "assinaturas", "finalizado", "cancelado"];

/* ============================================================
   Tipos e modelos
   ============================================================ */

/**
 * kind: "model"    → existe modelo interno (abre editor de preenchimento)
 *       "protocol" → nasce de uma aplicação de protocolo finalizada
 *       "custom"   → "Outro" (informar nome; sem modelo → anexar documento)
 *       "external" → "Relatório Externo" (sem modelo → anexar PDF final)
 */
export const REL_TYPES: ReportType[] = [
  { id: "evolucao_mensal", name: "Evolução Mensal", kind: "model" },
  { id: "trimestral", name: "Relatório Trimestral", kind: "model" },
  { id: "avaliacao", name: "Relatório de Avaliação", kind: "model" },
  { id: "admissao", name: "Relatório de Admissão", kind: "model" },
  { id: "alta", name: "Alta / Desligamento", kind: "model" },
  { id: "outro", name: "Outro", kind: "custom" },
  { id: "protocolo", name: "Relatório de protocolo", kind: "protocol" },
  { id: "externo", name: "Relatório Externo", kind: "external" },
];

export const relType = (id: ReportTypeId): ReportType => REL_TYPES.find((t) => t.id === id) ?? REL_TYPES[0]!;
export const relTypeName = (r: { typeId: ReportTypeId; customName?: string }) =>
  r.typeId === "outro" ? r.customName || "Outro" : relType(r.typeId).name;
export const relIsModel = (r: { typeId: ReportTypeId }) => {
  const k = relType(r.typeId).kind;
  return k === "model" || k === "protocol";
};
export const relIsProtocol = (r: { typeId: ReportTypeId }) => relType(r.typeId).kind === "protocol";
/** Origem na v1/detalhe. */
export const relOrigin = (r: Report) =>
  relIsProtocol(r) ? "Protocolo aplicado" : relIsModel(r) ? "Modelo interno" : r.typeId === "externo" ? "PDF externo" : "Documento anexo";
/** Origem na linha da lista v2. */
export const listOrigin = (r: { typeId: ReportTypeId }) =>
  ({ model: "Modelo interno", protocol: "Protocolo aplicado", custom: "Sem modelo", external: "PDF externo" })[relType(r.typeId).kind];

export const REL_REQUESTERS: Requester[] = ["Operadora", "Família", "Equipe"];

export const REL_PROFS: Professional[] = [
  { id: "s2", name: "Helena Martins Costa", specialty: "Psicologia" },
  { id: "a3", name: "Mariana Palmeira Stein", specialty: "Terapia Ocupacional" },
  { id: "s1", name: "Rafael Andrade Nunes", specialty: "Psicologia" },
  { id: "s4", name: "Fábio Teixeira Pereira", specialty: "Fonoaudiologia" },
  { id: "s3", name: "Tânia Abreu Pinho", specialty: "Psicologia" },
];
export const relProfById = (id: string | null | undefined) => REL_PROFS.find((p) => p.id === id) ?? null;
export const relProfByName = (name: string) => REL_PROFS.find((p) => p.name === name) ?? null;

/** Registro no conselho, usado nas assinaturas. */
export const REL_COUNCILS: Record<string, string> = {
  s2: "CRP 06/148223", a3: "CREFITO-3 22871-TO", s1: "CRP 06/131907", s4: "CRFa 2-19044", s3: "CRP 06/160512",
};
export const relCouncil = (id: string) => REL_COUNCILS[id] ?? "";

/** Perfis do sistema → perspectiva padrão da tela. */
export function relDefaultViewAs(role: string | undefined): ViewAs {
  return ["admin", "clinic_admin", "coordinator", "operation"].includes(role ?? "admin") ? "coord" : "prof";
}

/* ============================================================
   Datas
   ============================================================ */

const pad = (n: number) => String(n).padStart(2, "0");
const MON = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** `DD/MM/AAAA` (ou carimbo com hora) → Date ao meio-dia. */
export function parseBR(s: string | null | undefined): Date | null {
  if (!s) return null;
  const [d, m, y] = s.split(" ")[0]!.split("/").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d, 12, 0, 0);
}
export const toBR = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
export function isoToBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
export function brToISO(br: string | null | undefined): string {
  if (!br) return "";
  const [d, m, y] = br.split(" ")[0]!.split("/");
  return `${y}-${m}-${d}`;
}
/** "05 jul 2026". */
export function shortDate(br: string | null | undefined): string {
  if (!br) return "";
  const [d, m, y] = br.split(" ")[0]!.split("/");
  return `${d} ${MON[Number(m) - 1]} ${y}`;
}
const todayNoon = () => new Date(REL_TODAY.getFullYear(), REL_TODAY.getMonth(), REL_TODAY.getDate(), 12, 0, 0);
/** Dias de atraso (positivo) ou que faltam (negativo). */
export function daysLate(dueBR: string | null | undefined): number | null {
  const due = parseBR(dueBR);
  if (!due) return null;
  return Math.round((todayNoon().getTime() - due.getTime()) / 86400000);
}
/** Atrasado: tem prazo, não está finalizado/cancelado e passou do prazo. */
export function isLate(r: Report): boolean {
  if (r.status === "finalizado" || r.status === "cancelado" || !r.due) return false;
  const dl = daysLate(r.due);
  return dl != null && dl > 0;
}
/** "3 dias em atraso", "Vence hoje", "Faltam 4 dias". */
export function dueText(dueBR: string): string {
  const dl = daysLate(dueBR) ?? 0;
  if (dl > 0) return `${dl} ${dl === 1 ? "dia" : "dias"} em atraso`;
  if (dl === 0) return "Vence hoje";
  return `Faltam ${-dl} ${dl === -1 ? "dia" : "dias"}`;
}
export function dueSub(r: Report): string {
  if (!r.due) return "Sem prazo";
  if (r.status === "finalizado" || r.status === "cancelado") return "—";
  return dueText(r.due);
}

/** Carimbo determinístico do "agora" do protótipo: `16/07/2026 09:00`. */
export function relStamp(): string {
  const d = REL_TODAY;
  return `${toBR(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** Acrescenta uma entrada ao histórico (puro). */
export function pushHistory(r: Report, text: string, icon: string, who: string = REL_REQUESTED_BY_SHORT): Report {
  return { ...r, history: [...r.history, { at: relStamp(), who, text, icon }] };
}

/* ============================================================
   Autores e assinaturas
   ============================================================ */

export type Author = Professional & { role: "Responsável" | "Coautor" };
export const relAuthors = (r: Report): Author[] => [
  ...(r.prof ? [{ ...r.prof, role: "Responsável" as const }] : []),
  ...(r.coauthors ?? []).map((c) => ({ ...c, role: "Coautor" as const })),
];
export function signProgress(r: Report) {
  const a = relAuthors(r);
  const sig = r.signatures ?? {};
  return { total: a.length, done: a.filter((x) => sig[x.id]).length };
}
export const relSlug = (r: Report) =>
  relTypeName(r).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* ============================================================
   Compartilhamento com a família
   ============================================================ */

/** Responsáveis legais por paciente (espelha `patient.guardians`). */
export const REL_GUARDIANS: Record<string, Guardian[]> = {
  "Lucas Almeida Ferreira": [
    { id: "g1", name: "Patrícia Almeida Ferreira", relation: "Mãe" },
    { id: "g2", name: "Rogério Ferreira Pinto", relation: "Pai" },
  ],
};
export const guardiansOf = (patientName: string): Guardian[] =>
  REL_GUARDIANS[patientName] ?? [{ id: "g0", name: "Responsável legal", relation: "Responsável" }];

export function shareState(r: Report): ShareState {
  const s = r.share;
  if (!s || s.recipients.length === 0) return "none";
  if (s.revokedAt) return "revoked";
  const seen = s.recipients.filter((x) => x.viewedAt).length;
  if (seen === 0) return "pending";
  return seen === s.recipients.length ? "viewed" : "partial";
}
export const SHARE_META: Record<ShareState, { label: string; short: string; icon: string }> = {
  none: { label: "Não compartilhado", short: "Não compartilhado", icon: "fa-lock" },
  pending: { label: "Aguardando leitura", short: "Não lido", icon: "fa-paper-plane" },
  partial: { label: "Lido em parte", short: "Lido em parte", icon: "fa-book-open-reader" },
  viewed: { label: "Lido pela família", short: "Lido", icon: "fa-circle-check" },
  revoked: { label: "Acesso revogado", short: "Revogado", icon: "fa-ban" },
};
export const shareable = (r: Report) => r.status === "finalizado" && !!r.finalDoc;

/* ============================================================
   Modelos internos (seções do editor)
   ============================================================ */

export type ModelSection = { id: string; title: string; kind?: "image"; ph?: string; hint?: string; max?: number };

export const REL_MODEL_SECTIONS: Partial<Record<ReportTypeId, ModelSection[]>> = {
  evolucao_mensal: [
    { id: "resumo", title: "Resumo do período", ph: "Síntese do que foi trabalhado no mês, frequência e engajamento do paciente." },
    { id: "metas", title: "Metas e objetivos", ph: "Progresso nas metas do plano terapêutico, com dados de desempenho por programa." },
    { id: "graficos", kind: "image", title: "Gráficos de desempenho", hint: "Anexe os gráficos de acertos e independência por programa do mês.", max: 6 },
    { id: "comportamento", title: "Aspectos comportamentais", ph: "Comportamentos-alvo, intervenções aplicadas e evolução observada." },
    { id: "conclusao", title: "Conclusão e recomendações", ph: "Recomendações para o próximo período e ajustes sugeridos ao plano." },
  ],
  trimestral: [
    { id: "panorama", title: "Panorama do trimestre", ph: "Visão geral do período, carga horária cumprida e adesão." },
    { id: "areas", title: "Evolução por área", ph: "Resultados por especialidade e domínio de desenvolvimento." },
    { id: "graficos", kind: "image", title: "Gráficos do trimestre", hint: "Curvas de aquisição e comparativo com o trimestre anterior.", max: 8 },
    { id: "conclusao", title: "Conclusão", ph: "Parecer clínico e plano para o próximo trimestre." },
  ],
  avaliacao: [
    { id: "queixa", title: "Demanda e histórico", ph: "Motivo da avaliação e histórico relevante." },
    { id: "instrumentos", title: "Instrumentos aplicados", ph: "Escalas, protocolos e observações utilizadas." },
    { id: "resultados", title: "Resultados", ph: "Achados por domínio avaliado." },
    { id: "graficos", kind: "image", title: "Gráficos dos instrumentos", hint: "Perfis e gráficos gerados pelos instrumentos aplicados.", max: 4 },
    { id: "conclusao", title: "Conclusão e plano", ph: "Hipótese, conclusão e encaminhamentos." },
  ],
  admissao: [
    { id: "identificacao", title: "Identificação e demanda", ph: "Contexto de entrada do paciente." },
    { id: "baseline", title: "Linha de base", ph: "Repertório inicial observado." },
    { id: "plano", title: "Plano inicial", ph: "Metas e frequência propostas." },
  ],
  alta: [
    { id: "trajetoria", title: "Trajetória do tratamento", ph: "Resumo do período de acompanhamento e evolução global." },
    { id: "resultados", title: "Resultados alcançados", ph: "Metas concluídas e ganhos consolidados." },
    { id: "orientacoes", title: "Orientações pós-alta", ph: "Recomendações à família e à escola após o desligamento." },
  ],
};
export const sectionsFor = (typeId: ReportTypeId): ModelSection[] =>
  REL_MODEL_SECTIONS[typeId] ?? REL_MODEL_SECTIONS.avaliacao!;

/** Seções do Relatório de protocolo (`ask` é o pedido para gerar o texto com IA). */
export const REL_PROTO_SECTIONS: (ModelSection & { ask: string })[] = [
  { id: "instrumento", title: "Instrumento e contexto da aplicação", ph: "Qual instrumento foi aplicado, quando, por quem e em que condições.", ask: "Descreva o instrumento aplicado, a data, o responsável e o objetivo da avaliação. 2 a 3 frases." },
  { id: "resultados", title: "Resultados gerais", ph: "Pontuação total, distribuição por nível e leitura geral do repertório.", ask: "Descreva os resultados gerais: pontuação total, aproveitamento por nível e o que isso indica sobre o estágio de desenvolvimento verbal. Cite números." },
  { id: "fortes", title: "Repertórios consolidados", ph: "Domínios com melhor desempenho e habilidades já estabelecidas.", ask: "Aponte os domínios com melhor desempenho e o que isso significa funcionalmente. Cite as pontuações." },
  { id: "prioridades", title: "Áreas prioritárias", ph: "Domínios com maior defasagem e justificativa da priorização.", ask: "Aponte os domínios com maior defasagem, em ordem de prioridade, justificando clinicamente a escolha. Cite as pontuações." },
  { id: "evolucao", title: "Evolução desde a última avaliação", ph: "Comparação com a aplicação anterior do mesmo instrumento.", ask: "Compare com a avaliação anterior: onde houve ganho, onde houve estagnação. Cite as variações." },
  { id: "conclusao", title: "Conclusão e recomendações", ph: "Parecer clínico e encaminhamentos para o plano terapêutico.", ask: "Escreva a conclusão com parecer clínico e recomendações objetivas para o plano terapêutico (metas sugeridas e carga horária, se pertinente)." },
];
export const sheetSections = (r: Report): ModelSection[] => (relIsProtocol(r) ? REL_PROTO_SECTIONS : sectionsFor(r.typeId));
/** Seções de texto preenchidas no `draftContent`. */
export function filledSections(r: Report) {
  const secs = sheetSections(r).filter((s) => s.kind !== "image");
  const c = r.draftContent ?? {};
  return { done: secs.filter((s) => String(c[s.id] ?? "").trim()).length, total: secs.length };
}

/* ============================================================
   Protocolo: VB-MAPP · Avaliação de Marcos
   ============================================================ */

export const VB_LEVELS = [
  { id: 1, label: "Nível 1", sub: "0–18 meses" },
  { id: 2, label: "Nível 2", sub: "18–30 meses" },
  { id: 3, label: "Nível 3", sub: "30–48 meses" },
];
export const VB_DOMAINS = [
  { id: "mand", name: "Mando", short: "Mando" },
  { id: "tact", name: "Tato", short: "Tato" },
  { id: "listener", name: "Comportamento de ouvinte", short: "Ouvinte" },
  { id: "vpmts", name: "Percepção visual e pareamento", short: "VP-MTS" },
  { id: "play", name: "Brincar independente", short: "Brincar" },
  { id: "social", name: "Comportamento social e brincar social", short: "Social" },
  { id: "imitation", name: "Imitação motora", short: "Imitação" },
  { id: "echoic", name: "Ecoico", short: "Ecoico" },
  { id: "vocal", name: "Comportamento vocal espontâneo", short: "Vocal" },
  { id: "lrffc", name: "LRFFC — ouvinte por função, função e classe", short: "LRFFC" },
  { id: "intraverbal", name: "Intraverbal", short: "Intraverbal" },
  { id: "group", name: "Rotinas em grupo e habilidades de sala", short: "Grupo" },
  { id: "linguistic", name: "Estrutura linguística", short: "Ling." },
  { id: "reading", name: "Leitura", short: "Leitura" },
  { id: "writing", name: "Escrita", short: "Escrita" },
  { id: "math", name: "Matemática", short: "Mat." },
];
/**
 * Marcos por nível [N1, N2, N3], como em `vb_mapp_view` do monólito
 * (`patient_live/components/edit_tabs/protocol_executions.ex`): cada nível de
 * cada domínio tem 5 marcos, e cada marco vale 0, 0,5 ou 1. `null` = domínio
 * não avaliado no nível.
 */
export type VbMilestone = 0 | 0.5 | 1;
export type VbCells = Record<string, (VbMilestone[] | null)[]>;
export type ProtocolApplication = {
  id: string;
  protocol: string;
  instrument: string;
  patientName: string;
  appliedAt: string;
  finishedAt: string;
  by: { name: string; specialty: string };
  previousAt: string;
  cells: VbCells;
  previous: VbCells;
};
/** Marcos por nível de cada domínio (pontuação máxima de uma célula). */
export const VB_MAX_CELL = 5;
/** Pontuação de uma célula: a soma dos marcos (meio ponto conta). */
export const vbCellScore = (ms: VbMilestone[] | null | undefined): number | null =>
  ms == null ? null : ms.reduce<number>((a, v) => a + v, 0);
/** Pontuação com vírgula decimal: `75,5`. */
export const vbNum = (n: number) => String(n).replace(".", ",");
export function vbLevelTotals(cells: VbCells) {
  return VB_LEVELS.map((_, i) => {
    let score = 0;
    let max = 0;
    VB_DOMAINS.forEach((d) => {
      const v = vbCellScore((cells[d.id] ?? [])[i]);
      if (v == null) return;
      score += v;
      max += VB_MAX_CELL;
    });
    return { score, max, pct: max ? Math.round((score / max) * 100) : 0 };
  });
}
export function vbDomainRows(cells: VbCells, prev?: VbCells) {
  return VB_DOMAINS.map((d) => {
    const row = (cells[d.id] ?? []).map(vbCellScore);
    const pRow = (prev?.[d.id] ?? []).map(vbCellScore);
    let score = 0;
    let max = 0;
    let pScore = 0;
    row.forEach((v, i) => {
      if (v == null) return;
      score += v;
      max += VB_MAX_CELL;
      pScore += pRow[i] ?? 0;
    });
    return { ...d, row, pRow, score, max, pct: max ? Math.round((score / max) * 100) : 0, delta: score - pScore };
  });
}
export function vbTotal(cells: VbCells) {
  const t = vbLevelTotals(cells).reduce((a, l) => ({ score: a.score + l.score, max: a.max + l.max }), { score: 0, max: 0 });
  return { ...t, pct: t.max ? Math.round((t.score / t.max) * 100) : 0 };
}

/**
 * Texto base de uma seção do Relatório de protocolo a partir dos números da
 * aplicação (`vbLocalText`). É o que "Gerar com IA" escreve no porte: o
 * protótipo chamava um modelo e caía neste texto quando não havia resposta.
 */
export function vbLocalText(sectionId: string, app: ProtocolApplication, patientName: string): string {
  const rows = vbDomainRows(app.cells, app.previous).filter((r) => r.max > 0);
  const tot = vbTotal(app.cells);
  const lv = vbLevelTotals(app.cells);
  const first = patientName.split(" ")[0];
  const best = [...rows].sort((a, b) => b.pct - a.pct).slice(0, 3);
  const worst = [...rows].sort((a, b) => a.pct - b.pct).slice(0, 3);
  const gains = rows.filter((r) => r.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
  const flat = rows.filter((r) => r.delta === 0);
  const m: Record<string, string> = {
    instrumento: `Foi aplicada a Avaliação de Marcos do VB-MAPP em ${app.appliedAt}, sob responsabilidade de ${app.by.name} (${app.by.specialty}), com o objetivo de mapear o repertório verbal e de aprendizagem de ${first} e orientar as metas do plano terapêutico. A aplicação anterior do mesmo instrumento ocorreu em ${app.previousAt}, o que permite leitura comparativa.`,
    resultados: `${first} alcançou ${vbNum(tot.score)} de ${tot.max} marcos avaliados (${tot.pct}%). Por nível: ${lv.map((l, i) => `${VB_LEVELS[i]!.label}, ${vbNum(l.score)} de ${l.max} (${l.pct}%)`).join("; ")}. O perfil indica repertório consolidado no Nível 1 e domínios em aquisição no Nível 2, com o Nível 3 ainda em fase inicial.`,
    fortes: `Os melhores desempenhos aparecem em ${best.map((r) => `${r.name} (${vbNum(r.score)}/${r.max})`).join(", ")}. Esses repertórios já se sustentam com pouca ajuda e podem ser usados como base para ampliar as demais áreas.`,
    prioridades: `As maiores defasagens estão em ${worst.map((r) => `${r.name} (${vbNum(r.score)}/${r.max})`).join(", ")}. A priorização considera o papel desses repertórios na comunicação funcional e na participação em atividades de grupo.`,
    evolucao: `Em relação à avaliação de ${app.previousAt}, houve ganho em ${gains.length} domínios, com destaque para ${gains.map((r) => `${r.name} (+${vbNum(r.delta)})`).join(", ")}.${flat.length ? ` Permaneceram sem alteração: ${flat.map((r) => r.name).join(", ")}.` : ""}`,
    conclusao: "Os resultados sustentam a continuidade da intervenção com foco nos domínios de maior defasagem, mantendo os repertórios já consolidados em programas de manutenção e generalização. Recomenda-se revisar as metas do plano terapêutico à luz desta avaliação e reaplicar o instrumento no próximo semestre.",
  };
  return m[sectionId] ?? "";
}

/* ============================================================
   Rotina de relatórios (regras da operadora + do paciente)
   ============================================================ */

export type RoutineFreq = "mensal" | "bimestral" | "trimestral" | "semestral" | "anual";
export type RoutineRule = {
  id: string;
  typeId: ReportTypeId;
  customName?: string;
  freq: RoutineFreq;
  /** `day_next`: dia do mês seguinte ao período; `days_after`: dias após o fim. */
  dueMode: "day_next" | "days_after";
  dueValue: number;
  requester: Requester;
  /** Responsável padrão, ou "" para definir em cada solicitação. */
  profId: string;
  /** Vigência `AAAA-MM`. */
  start: string;
  end: string;
  /** `notify`: avisa em Previstos; `auto`: cria a solicitação `autoDays` antes do prazo. */
  action: "notify" | "auto";
  autoDays: number;
};
export type RoutinePause = { reason: string; at: string };
export type RoutineState = {
  /** Regras por operadora (editadas no cadastro da operadora). */
  operators: Record<string, RoutineRule[]>;
  /** Por paciente: regras da operadora pausadas e regras próprias. */
  patients: Record<string, { paused: Record<string, RoutinePause>; own: RoutineRule[] }>;
};

export const RR_MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const RR_FREQ: { id: RoutineFreq; label: string; n: number }[] = [
  { id: "mensal", label: "Mensal", n: 1 },
  { id: "bimestral", label: "Bimestral", n: 2 },
  { id: "trimestral", label: "Trimestral", n: 3 },
  { id: "semestral", label: "Semestral", n: 6 },
  { id: "anual", label: "Anual", n: 12 },
];
export const rrFreq = (id: RoutineFreq) => RR_FREQ.find((f) => f.id === id) ?? RR_FREQ[0]!;
export const RR_BLANK: Omit<RoutineRule, "id"> = {
  typeId: "evolucao_mensal", customName: "", freq: "mensal", dueMode: "day_next", dueValue: 10,
  requester: "Operadora", profId: "", start: "2026-07", end: "", action: "notify", autoDays: 10,
};

export function rrPeriod(rule: Pick<RoutineRule, "freq" | "dueMode" | "dueValue">, idx: number, year: number) {
  const n = rrFreq(rule.freq).n;
  const sm = idx * n;
  const em = sm + n - 1;
  const label =
    n === 1 ? `${RR_MONTHS[sm]} ${year}` : n === 12 ? `${year}` : `${idx + 1}º ${({ 2: "Bim", 3: "Tri", 6: "Semestre" } as Record<number, string>)[n]} ${year}`;
  const end = new Date(year, em + 1, 0, 12);
  const due = rule.dueMode === "day_next" ? new Date(year, em + 1, rule.dueValue, 12) : new Date(end.getTime() + rule.dueValue * 86400000);
  return { label, start: `${year}-${pad(sm + 1)}`, due };
}
/** Próximo período da regra a partir de hoje (prévia do formulário). */
export function rrNext(rule: Pick<RoutineRule, "freq" | "dueMode" | "dueValue">) {
  const n = rrFreq(rule.freq).n;
  return rrPeriod(rule, Math.floor(REL_TODAY.getMonth() / n), REL_TODAY.getFullYear());
}
export function rrSummary(rule: RoutineRule) {
  const f = rrFreq(rule.freq).label;
  const prazo = rule.dueMode === "day_next" ? `até o dia ${rule.dueValue} do mês seguinte` : `${rule.dueValue} dias após o fim do período`;
  return `${f} · ${prazo}`;
}
export const rrActionText = (rule: RoutineRule) =>
  rule.action === "auto" ? `Cria a solicitação ${rule.autoDays} dias antes do prazo` : "Avisa em Previstos pela rotina";
export const rrMonthBR = (ym: string) => ym.split("-").reverse().join("/");

/** Um relatório previsto pela rotina: ainda não é registro. */
export type Forecast = {
  key: string;
  typeId: ReportTypeId;
  customName: string;
  name: string;
  period: string;
  due: string;
  requester: Requester;
  profId: string;
  /** "Operadora Unimed" ou "Rotina do paciente". */
  source: string;
  rule: string;
  /** "Criação automática hoje" / "Criação automática em 05/07", ou "". */
  auto: string;
};

export const patientRoutine = (routine: RoutineState, patientId: string) =>
  routine.patients[patientId] ?? { paused: {}, own: [] };

/**
 * Previstos: período anterior e corrente de cada regra ativa, sem solicitação
 * e com prazo em até 45 dias.
 */
export function routineForecast(patient: PatientRef, mine: Report[], routine: RoutineState, operator: string): Forecast[] {
  const p = patientRoutine(routine, patient.id);
  const rules = [
    ...(routine.operators[operator] ?? []).filter((r) => !p.paused[r.id]).map((r) => ({ ...r, source: `Operadora ${operator}` })),
    ...p.own.map((r) => ({ ...r, source: "Rotina do paciente" })),
  ];
  const t = todayNoon();
  const out: Forecast[] = [];
  rules.forEach((rule) => {
    const n = rrFreq(rule.freq).n;
    const cur = Math.floor(t.getMonth() / n);
    const y = t.getFullYear();
    const cands: [number, number][] = [cur === 0 ? [12 / n - 1, y - 1] : [cur - 1, y], [cur, y]];
    cands.forEach(([idx, yr]) => {
      const per = rrPeriod(rule, idx, yr);
      if (rule.start && per.start < rule.start) return;
      if (rule.end && per.start > rule.end) return;
      const days = Math.round((per.due.getTime() - t.getTime()) / 86400000);
      if (days > 45) return;
      const name = relTypeName(rule);
      if (mine.some((r) => r.status !== "cancelado" && r.typeId === rule.typeId && r.period === per.label && (rule.typeId !== "outro" || r.customName === rule.customName))) return;
      // Regra automática: a solicitação nasce `autoDays` antes do prazo. Se essa
      // data já passou e não há registro (regra criada ou retomada depois dela),
      // a rotina cria na próxima execução, hoje. No seed, o 2º Tri já foi criado
      // em 05/07 (r-126) e por isso não aparece aqui.
      const autoAt = rule.action === "auto" ? new Date(per.due.getTime() - rule.autoDays * 86400000) : null;
      out.push({
        key: `${rule.id}-${per.label}`, typeId: rule.typeId, customName: rule.customName ?? "", name, period: per.label,
        due: toBR(per.due), requester: rule.requester, profId: rule.profId, source: rule.source, rule: rrSummary(rule),
        auto: autoAt ? (autoAt <= t ? "Criação automática hoje" : `Criação automática em ${toBR(autoAt).slice(0, 5)}`) : "",
      });
    });
  });
  return out.sort((a, b) => parseBR(a.due)!.getTime() - parseBR(b.due)!.getTime());
}

/* ============================================================
   Linhas da lista v2 (previstos + solicitações + emitidos)
   ============================================================ */

export type ListRow = {
  key: string;
  status: ListStatus;
  name: string;
  meta: string;
  late: boolean;
  /** Prazo (pendentes) ou emissão (emitidos): ordena a lista. */
  sortDate: Date | null;
  emitAt: string | null;
  year: string;
  typeId: ReportTypeId;
  /** Id do responsável, ou "none". */
  profId: string;
  requester: Requester;
} & ({ r: Report; fc?: undefined } | { fc: Forecast; r?: undefined });

export function buildRows(forecast: Forecast[], mine: Report[]): ListRow[] {
  return [
    ...forecast.map((fc): ListRow => ({
      key: fc.key, fc, status: "previsto", name: fc.name, meta: [fc.period, fc.source].join(" · "),
      late: (daysLate(fc.due) ?? 0) > 0, sortDate: parseBR(fc.due), emitAt: null, year: fc.due.split("/")[2] ?? "",
      typeId: fc.typeId, profId: fc.profId || "none", requester: fc.requester,
    })),
    ...mine.map((r): ListRow => {
      const done = r.status === "finalizado";
      const emitAt = done ? (r.finalDoc ? r.finalDoc.at : r.updatedAt.split(" ")[0]!) : null;
      return {
        key: r.id, r, status: r.status, name: relTypeName(r), meta: [r.period, listOrigin(r)].filter(Boolean).join(" · "),
        late: isLate(r), sortDate: parseBR(done ? emitAt : r.due), emitAt,
        year: ((done ? emitAt : r.due) || r.updatedAt.split(" ")[0]!).split("/")[2] ?? "",
        typeId: r.typeId, profId: r.prof ? r.prof.id : "none", requester: r.requester,
      };
    }),
  ];
}

export type ListFilters = {
  q: string;
  /** Status marcados; vazio = todos menos cancelados. */
  status: ListStatus[];
  /** Condição "Em atraso". */
  late: boolean;
  type: ReportTypeId[];
  year: string;
  prof: string;
};
export const EMPTY_FILTERS: ListFilters = { q: "", status: [], late: false, type: [], year: "", prof: "" };
export const hasFilters = (f: ListFilters) =>
  Boolean(f.q.trim() || f.status.length || f.late || f.type.length || f.year || f.prof);

const isPending = (x: ListRow) => x.status !== "finalizado" && x.status !== "cancelado";

/** Filtra e ordena: atrasados, pendentes (prazo crescente), emitidos e cancelados (mais recentes primeiro). */
export function filterRows(rows: ListRow[], f: ListFilters): ListRow[] {
  const q = f.q.trim().toLowerCase();
  return rows
    .filter((x) => (f.status.length ? f.status.includes(x.status) : x.status !== "cancelado"))
    .filter((x) => !f.late || x.late)
    .filter((x) => !f.type.length || f.type.includes(x.typeId))
    .filter((x) => !f.year || x.year === f.year)
    .filter((x) => !f.prof || x.profId === f.prof)
    .filter((x) => {
      if (!q) return true;
      const prof = x.r ? x.r.prof?.name : relProfById(x.fc.profId)?.name;
      return [x.name, x.meta, prof, x.requester].filter(Boolean).join(" ").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const g = (x: ListRow) => (x.late ? 0 : isPending(x) ? 1 : x.status === "finalizado" ? 2 : 3);
      if (g(a) !== g(b)) return g(a) - g(b);
      const ta = a.sortDate ? a.sortDate.getTime() : Infinity;
      const tb = b.sortDate ? b.sortDate.getTime() : Infinity;
      return g(a) <= 1 ? ta - tb : tb - ta;
    });
}
