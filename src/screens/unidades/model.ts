/**
 * Unidades — regras da tela, sem React.
 *
 * Duas leituras sobre as mesmas unidades:
 * - Cadastro: a lista do `UnitLive.Index`, com os filtros e as colunas dele.
 * - Documentação: cada documento padrão da unidade num de cinco estados e a
 *   completude dos essenciais. É o mesmo desenho da Documentação de
 *   Profissionais, com os documentos padrão da aba Documentos da unidade.
 *
 * Datas de documento são dd/mm/aaaa, como o produto mostra.
 */

/* ---------- unidades ---------- */

export type Address = {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
};

export type Unit = {
  id: string;
  name: string;
  cnpj: string;
  cnes: string;
  /** `active` do monólito: a coluna "Ativa?". */
  active: boolean;
  address: Address;
};

/** A coluna Endereço do `index.ex`: rua, número e, se houver, " - complemento". */
export const addressLine = (a: Address) => `${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ""}`;

/** Ativas primeiro, na ordem do cadastro; inativas por último. */
export const byActive = (a: Unit, b: Unit) => Number(b.active) - Number(a.active);

/** Busca sem acento e sem caixa. */
export const norm = (s: string | null | undefined) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** CNPJ e CNES se buscam pelos dígitos, com ou sem a máscara. */
export const digits = (s: string) => s.replace(/\D/g, "");

const DAY = 86400000;

export function brToIso(br: string): string {
  const [d, m, y] = br.split("/");
  return `${y}-${m}-${d}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/* ---------- documentos padrão ---------- */

export type DocGroup = "ess" | "per";
export type CategoryFilter = "overview" | DocGroup;

export const DOC_GROUPS: { id: DocGroup; label: string }[] = [
  { id: "ess", label: "Essenciais" },
  { id: "per", label: "Renovação periódica" },
];

export type DocSlot = {
  id: string;
  group: DocGroup;
  name: string;
  /** Rótulo da coluna. */
  short: string;
  /** "anual", "a cada 3 anos"… como na aba Documentos da unidade. */
  renewal: string;
  /** Validade de um documento novo, em dias; `null` não vence. */
  validity: number | null;
  hint: string;
};

/**
 * Os documentos padrão da aba Documentos da unidade que entram na matriz,
 * com os mesmos nomes. Essenciais contam na completude; os de renovação
 * periódica só aparecem com o estado. O CLI não tem coluna: ele atende o
 * Alvará nos municípios com licenciamento integrado.
 */
export const DOC_SLOTS: DocSlot[] = [
  { id: "alvara", group: "ess", name: "Alvará de Funcionamento", short: "Alvará / CLI", renewal: "anual", validity: 365,
    hint: "Autorização municipal para operar no endereço da unidade. O CLI atende no lugar dele onde há licenciamento integrado." },
  { id: "avcb", group: "ess", name: "AVCB — Auto de Vistoria do Corpo de Bombeiros", short: "AVCB", renewal: "a cada 3 anos", validity: 1095,
    hint: "Vistoria do Corpo de Bombeiros atestando as condições de segurança." },
  { id: "vigilancia", group: "ess", name: "Licença da Vigilância Sanitária", short: "Vigilância", renewal: "anual", validity: 365,
    hint: "Licença sanitária estadual ou municipal do estabelecimento de saúde." },
  { id: "cnes", group: "ess", name: "CNES — Cadastro Nacional de Estabelecimentos de Saúde", short: "CNES", renewal: "sem validade", validity: null,
    hint: "Comprovante de cadastro do estabelecimento no CNES." },
  { id: "crp", group: "ess", name: "Registro no CRP", short: "CRP", renewal: "anual", validity: 365,
    hint: "Registro da pessoa jurídica no Conselho Regional de Psicologia." },
  { id: "dedetizacao", group: "per", name: "Certificado de Dedetização", short: "Dedetização", renewal: "a cada 6 meses", validity: 182,
    hint: "Controle de pragas com certificado da empresa aplicadora." },
  { id: "potabilidade", group: "per", name: "Laudo de Potabilidade da Água", short: "Potabilidade", renewal: "a cada 6 meses", validity: 182,
    hint: "Análise laboratorial da água exigida pela vigilância sanitária." },
  { id: "residuos", group: "per", name: "PGRSS — Plano de Gerenciamento de Resíduos", short: "PGRSS", renewal: "anual", validity: 365,
    hint: "Plano e comprovante de coleta de resíduos de serviços de saúde." },
];

export const slotsOf = (group: DocGroup) => DOC_SLOTS.filter((s) => s.group === group);

/** Janela de alerta: a mesma da aba Documentos da unidade e da Documentação de Profissionais. */
export const WARN_DAYS = 60;

export type DocState = "ok" | "expiring" | "expired" | "missing" | "pending";

/** Ordem de gravidade: é a ordem dos números na visão geral. */
export const STATE_ORDER: DocState[] = ["expired", "missing", "expiring", "pending", "ok"];

export const DOC_STATES: Record<DocState, { label: string; icon: string }> = {
  ok: { label: "Válido", icon: "fa-check" },
  expiring: { label: "A vencer", icon: "fa-clock" },
  expired: { label: "Vencido", icon: "fa-xmark" },
  missing: { label: "Pendente", icon: "fa-minus" },
  pending: { label: "Aguardando vigência", icon: "fa-hourglass-half" },
};

/** Um documento da unidade que preenche um documento padrão. */
export type UnitDoc = {
  id: string;
  /** O documento padrão; "cli" atende o Alvará. */
  slotId: string;
  name: string;
  /** `@unit_document.user.name`. */
  responsible: string;
  updatedAt: string;
  /** Início da vigência; depois de hoje, está aguardando vigência. */
  validFrom: string | null;
  validUntil: string | null;
  file: string;
};

/** Os documentos de cada unidade, pelo id dela. */
export type DocsState = Record<string, UnitDoc[]>;

export function docState(doc: UnitDoc | null, today: string): DocState {
  if (!doc) return "missing";
  if (doc.validFrom && daysBetween(today, brToIso(doc.validFrom)) > 0) return "pending";
  if (!doc.validUntil) return "ok";
  const d = daysBetween(today, brToIso(doc.validUntil));
  if (d < 0) return "expired";
  if (d <= WARN_DAYS) return "expiring";
  return "ok";
}

/** Entre dois documentos do mesmo padrão (a renovação e o antigo), vale o mais em dia. */
const BEST: DocState[] = ["ok", "expiring", "pending", "expired"];

/* ---------- linha consolidada da Documentação ---------- */

export type DocCell = {
  slot: DocSlot;
  doc: UnitDoc | null;
  state: DocState;
  /** O Alvará atendido pelo CLI. */
  viaCli: boolean;
};

export type StateCounts = Record<DocState, number>;

export type DocRow = {
  unit: Unit;
  groups: Record<DocGroup, { cells: DocCell[]; counts: StateCounts }>;
  all: DocCell[];
  /** Completude dos essenciais: válidos e a vencer. */
  pct: number;
  expired: DocCell[];
  missing: DocCell[];
  expiring: DocCell[];
  pending: DocCell[];
};

export function countStates(states: DocState[]): StateCounts {
  const counts = { ok: 0, expiring: 0, expired: 0, missing: 0, pending: 0 };
  for (const s of states) counts[s]++;
  return counts;
}

function best(docs: UnitDoc[], today: string): UnitDoc | null {
  return [...docs].sort((a, b) => BEST.indexOf(docState(a, today)) - BEST.indexOf(docState(b, today)))[0] ?? null;
}

export function docCell(state: DocsState, unitId: string, slot: DocSlot, today: string): DocCell {
  const docs = state[unitId] ?? [];
  let doc = best(docs.filter((d) => d.slotId === slot.id), today);
  let viaCli = false;
  if (slot.id === "alvara") {
    const cli = best(docs.filter((d) => d.slotId === "cli"), today);
    const rank = (d: UnitDoc | null) => (d ? BEST.indexOf(docState(d, today)) : BEST.length);
    if (cli && rank(cli) < rank(doc)) {
      doc = cli;
      viaCli = true;
    }
  }
  return { slot, doc, state: docState(doc, today), viaCli };
}

export function docRow(state: DocsState, unit: Unit, today: string): DocRow {
  const groups = {} as DocRow["groups"];
  for (const g of DOC_GROUPS) {
    const cells = slotsOf(g.id).map((s) => docCell(state, unit.id, s, today));
    groups[g.id] = { cells, counts: countStates(cells.map((c) => c.state)) };
  }
  const all = [...groups.ess.cells, ...groups.per.cells];
  const ess = groups.ess.cells;
  const okEss = ess.filter((c) => c.state === "ok" || c.state === "expiring").length;
  return {
    unit,
    groups,
    all,
    pct: Math.round((okEss / ess.length) * 100),
    expired: all.filter((c) => c.state === "expired"),
    missing: all.filter((c) => c.state === "missing"),
    expiring: all.filter((c) => c.state === "expiring"),
    pending: all.filter((c) => c.state === "pending"),
  };
}

/** O filtro Situação da documentação. */
export type DocSituation = "" | "vencido" | "pendente" | "a_vencer" | "aguardando" | "em_dia";

export function matchesSituation(row: DocRow, key: DocSituation): boolean {
  if (key === "vencido") return row.expired.length > 0;
  if (key === "pendente") return row.missing.length > 0;
  if (key === "a_vencer") return row.expiring.length > 0;
  if (key === "aguardando") return row.pending.length > 0;
  if (key === "em_dia") return row.pct === 100;
  return true;
}
