/**
 * Profissionais — regras da tela, sem React.
 *
 * Três leituras sobre os mesmos profissionais:
 * - Cadastro: o status (ativo, em inativação, inativo).
 * - Documentação: cada documento num de cinco estados, a completude dos
 *   obrigatórios e o credenciamento em cada operadora.
 * - Controle de horas: os totais do mês.
 *
 * Datas de documento são dd/mm/aaaa, como o produto mostra; datas de
 * desligamento são ISO, como o `deactivation_date` do monólito.
 */

/* ---------- profissionais ---------- */

export type Professional = {
  id: string;
  name: string;
  /** `status` do monólito: `false` é desligado. */
  active: boolean;
  /** `deactivation_date`: depois de hoje e ativo, está em inativação. */
  deactivationAt?: string;
  tbd?: boolean;
  specialty: string;
  /** `specialty_register`. */
  council: string;
  /** `email` e `phone`: o filtro Contato busca nos dois. */
  email: string;
  phone: string;
  /** `professional_types`, já traduzidos. */
  types: string[];
  /** `health_formation`, já traduzida. */
  formation: string;
  supervisor: string | null;
};

export type ProfStatus = "ativo" | "deactivating" | "inativo";

export const PROF_STATUS: Record<ProfStatus, { label: string; dot: string }> = {
  ativo: { label: "Ativo", dot: "bg-green" },
  deactivating: { label: "Em inativação", dot: "bg-orange" },
  inativo: { label: "Inativo", dot: "bg-red" },
};


const DAY = 86400000;

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY);
}

export function profStatus(p: Professional, today: string): ProfStatus {
  if (!p.active) return "inativo";
  // Como `professional_status/1`: só em inativação com a data depois de hoje.
  if (p.deactivationAt && daysBetween(today, p.deactivationAt) > 0) return "deactivating";
  return "ativo";
}

/** Em inativação, depois TBD (só os ativos), depois ativos, depois inativos. */
function rank(p: Professional, today: string): number {
  const st = profStatus(p, today);
  if (st === "deactivating") return 0;
  if (p.tbd && st === "ativo") return 1;
  return st === "ativo" ? 2 : 3;
}

/** Em inativação primeiro (quem sai antes no topo), depois os TBD, depois o resto. */
export function byStatus(today: string) {
  return (a: Professional, b: Professional) => {
    const d = rank(a, today) - rank(b, today);
    if (d !== 0) return d;
    if (profStatus(a, today) === "deactivating") return a.deactivationAt!.localeCompare(b.deactivationAt!);
    return 0;
  };
}

export function isoToBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function brToIso(br: string): string {
  const [d, m, y] = br.split("/");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Busca sem acento e sem caixa. */
export const norm = (s: string | null | undefined) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/* ---------- controle de horas ---------- */

export type MonthHours = { planned: number; worked: number; appointments: number; compensation: string };

/* ---------- documentos ---------- */

export type DocCategory = "prof" | "internal" | "occup";
export type CategoryFilter = "overview" | DocCategory | "ops";

export const DOC_CATEGORIES: { id: DocCategory | "ops"; label: string }[] = [
  { id: "prof", label: "Profissional" },
  { id: "internal", label: "Interno" },
  { id: "occup", label: "Ocupacional" },
  { id: "ops", label: "Operadoras" },
];

export type DocType = {
  id: string;
  cat: DocCategory;
  name: string;
  /** Rótulo da coluna. */
  short: string;
  required: boolean;
  expires?: boolean;
};

/**
 * Escopo profissional: os documentos da aba Documentos do perfil. Os
 * obrigatórios são os seis documentos padrão da aba (a mesma lista do
 * `STANDARD` de `documentos/model.ts`); os outros são adicionais.
 */
export const PROF_DOC_TYPES: DocType[] = [
  { id: "diploma", cat: "prof", name: "Certificado de formação", short: "Formação", required: true },
  { id: "council", cat: "prof", name: "Registro no conselho", short: "Conselho", required: true },
  { id: "council_card", cat: "prof", name: "Carteirinha do conselho", short: "Carteirinha", required: true },
  { id: "council_quit", cat: "prof", name: "Declaração de quitação do conselho", short: "Quitação", required: true },
  { id: "aba_course", cat: "prof", name: "Curso de formação em ABA", short: "Curso ABA", required: true },
  { id: "special_training", cat: "prof", name: "Formação especial", short: "Form. especial", required: true },
  { id: "id", cat: "prof", name: "RG / CPF", short: "RG/CPF", required: false },
  { id: "address", cat: "prof", name: "Comprovante de endereço", short: "Endereço", required: false },
  { id: "cv", cat: "prof", name: "Currículo", short: "Currículo", required: false },
  { id: "specialization", cat: "prof", name: "Certificado de especialização", short: "Especialização", required: false },
];

/** Escopos interno e ocupacional: mantidos pela clínica. */
export const EXTRA_DOC_TYPES: DocType[] = [
  { id: "contract", cat: "internal", name: "Contrato PJ", short: "Contrato", expires: true, required: true },
  { id: "nda", cat: "internal", name: "Termo de confidencialidade", short: "Confidencial.", expires: false, required: true },
  { id: "lgpd", cat: "internal", name: "Termo LGPD", short: "LGPD", expires: false, required: true },
  { id: "train_aba", cat: "internal", name: "Treinamento ABA interno", short: "Treino ABA", expires: true, required: true },
  { id: "train_crisis", cat: "internal", name: "Treinamento manejo de crise", short: "Manejo crise", expires: true, required: false },
  { id: "aso", cat: "occup", name: "ASO periódico", short: "ASO", expires: true, required: true },
  { id: "vaccine", cat: "occup", name: "Carteira de vacinação", short: "Vacinação", expires: true, required: false },
];

export const typesOf = (cat: DocCategory): DocType[] =>
  cat === "prof" ? PROF_DOC_TYPES : EXTRA_DOC_TYPES.filter((t) => t.cat === cat);

export const docTypeName = (id: string) =>
  [...PROF_DOC_TYPES, ...EXTRA_DOC_TYPES].find((t) => t.id === id)?.name ?? id;

/** Janela de alerta da matriz: a mesma da aba Documentos do perfil. */
export const WARN_DAYS = 60;

export type DocState = "ok" | "expiring" | "expired" | "missing" | "waived";

/** Ordem de gravidade: é a ordem dos números na visão geral. */
export const STATE_ORDER: DocState[] = ["expired", "missing", "expiring", "waived", "ok"];

export const DOC_STATES: Record<DocState, { label: string; icon: string }> = {
  ok: { label: "Válido", icon: "fa-check" },
  expiring: { label: "A vencer", icon: "fa-clock" },
  expired: { label: "Vencido", icon: "fa-xmark" },
  missing: { label: "Pendente", icon: "fa-minus" },
  waived: { label: "Dispensado", icon: "fa-ban" },
};

/** Um documento do cadastro do profissional. */
export type ProfDoc = {
  id: string;
  typeId: string;
  name: string;
  updatedAt: string;
  validUntil: string | null;
  /** Operadoras com quem foi compartilhado. */
  shared: string[];
  hours?: number;
  training?: string;
};

/** Um documento interno ou ocupacional. */
export type ExtraDoc = {
  typeId: string;
  waived: boolean;
  updatedAt: string;
  validUntil: string | null;
  by: string;
};

export type AnyDoc = { validUntil: string | null; waived?: boolean; updatedAt: string; by?: string };

export function docState(doc: AnyDoc | null, today: string): DocState {
  if (!doc) return "missing";
  if (doc.waived) return "waived";
  if (!doc.validUntil) return "ok";
  const d = daysBetween(today, brToIso(doc.validUntil));
  if (d < 0) return "expired";
  if (d <= WARN_DAYS) return "expiring";
  return "ok";
}

/* ---------- operadoras ---------- */

export type Operator = { id: string; name: string; required: string[] };

export type LinkStatus = "active" | "pending" | "inactive";
export type Link = { status: LinkStatus; since: string; manual?: boolean };

export type DocsState = {
  docs: Record<string, ProfDoc[]>;
  extra: Record<string, Record<string, ExtraDoc>>;
  /** Chave `profId:opId`. */
  links: Record<string, Link>;
};

export const linkKey = (profId: string, opId: string) => `${profId}:${opId}`;

/** Exigidos pela operadora que não foram compartilhados ou estão vencidos. */
export function missingFor(state: DocsState, op: Operator, profId: string, today: string): string[] {
  const docs = state.docs[profId] ?? [];
  return op.required.filter((typeId) => {
    const d = docs.find((x) => x.typeId === typeId && x.shared.includes(op.id));
    if (!d) return true;
    return d.validUntil != null && daysBetween(today, brToIso(d.validUntil)) < 0;
  });
}

/**
 * O status do vínculo é derivado: falta documento exigido, está em
 * credenciamento; completo, ativo. Descredenciado à mão não volta sozinho.
 */
export function reconcile(state: DocsState, operators: Operator[], today: string): DocsState {
  const links: Record<string, Link> = {};
  for (const [key, link] of Object.entries(state.links)) {
    if (link.manual || link.status === "inactive") {
      links[key] = link;
      continue;
    }
    const [profId, opId] = key.split(":") as [string, string];
    const op = operators.find((o) => o.id === opId);
    const missing = op ? missingFor(state, op, profId, today) : [];
    links[key] = { ...link, status: missing.length ? "pending" : "active" };
  }
  return { ...state, links };
}

/* ---------- linha consolidada da Documentação ---------- */

export type DocCell = { type: DocType; doc: AnyDoc | null; state: DocState };

export type OpCell = {
  op: Operator;
  state: DocState;
  label: string;
  missing: string[];
  link: Link | null;
};

export type StateCounts = Record<DocState, number>;

export type DocRow = {
  prof: Professional;
  cats: Record<DocCategory, { cells: DocCell[]; counts: StateCounts }>;
  ops: OpCell[];
  all: DocCell[];
  /** Completude dos obrigatórios, dispensados fora da conta. */
  pct: number;
  expiring: DocCell[];
  expired: DocCell[];
  /** Só os obrigatórios (os padrão) pendentes. */
  missing: DocCell[];
};

export function countStates(states: DocState[]): StateCounts {
  const counts = { ok: 0, expiring: 0, expired: 0, missing: 0, waived: 0 };
  for (const s of states) counts[s]++;
  return counts;
}

export function docCell(state: DocsState, profId: string, type: DocType, today: string): DocCell {
  const doc = type.cat === "prof" ? (state.docs[profId] ?? []).find((d) => d.typeId === type.id) ?? null : state.extra[profId]?.[type.id] ?? null;
  return { type, doc, state: docState(doc, today) };
}

export function opCell(state: DocsState, op: Operator, profId: string, today: string): OpCell {
  const link = state.links[linkKey(profId, op.id)] ?? null;
  const missing = missingFor(state, op, profId, today);
  if (!link) return { op, state: "missing", label: "Não credenciado", missing, link };
  if (link.status === "inactive") return { op, state: "expired", label: "Descredenciado", missing, link };
  if (link.status === "pending" || missing.length)
    return { op, state: "expiring", label: missing.length ? `Falta ${missing.length}` : "Em credenciamento", missing, link };
  return { op, state: "ok", label: "Apto", missing, link };
}

export function docRow(state: DocsState, operators: Operator[], prof: Professional, today: string): DocRow {
  const cats = {} as DocRow["cats"];
  for (const cat of ["prof", "internal", "occup"] as DocCategory[]) {
    const cells = typesOf(cat).map((t) => docCell(state, prof.id, t, today));
    cats[cat] = { cells, counts: countStates(cells.map((c) => c.state)) };
  }
  const ops = operators.map((o) => opCell(state, o, prof.id, today));
  const all = [...cats.prof.cells, ...cats.internal.cells, ...cats.occup.cells];
  const required = all.filter((c) => c.type.required && c.state !== "waived");
  const okRequired = required.filter((c) => c.state === "ok" || c.state === "expiring").length;
  return {
    prof,
    cats,
    ops,
    all,
    pct: required.length ? Math.round((okRequired / required.length) * 100) : 100,
    expiring: all.filter((c) => c.state === "expiring"),
    expired: all.filter((c) => c.state === "expired"),
    missing: all.filter((c) => c.state === "missing" && c.type.required),
  };
}

/** O filtro Situação da documentação. */
export type DocSituation = "" | "vencido" | "pendente" | "a_vencer" | "dispensado" | "em_dia";

export function matchesSituation(row: DocRow, key: DocSituation): boolean {
  if (key === "vencido") return row.expired.length > 0;
  if (key === "pendente") return row.missing.length > 0;
  if (key === "a_vencer") return row.expiring.length > 0;
  if (key === "dispensado") return row.all.some((c) => c.state === "waived");
  if (key === "em_dia") return row.pct === 100;
  return true;
}
