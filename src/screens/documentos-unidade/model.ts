/**
 * Documentos da unidade — tipos, documentos padrão e regras da aba.
 *
 * Porte de `unidades-docs.jsx` do protótipo, no mesmo desenho da aba
 * Documentos do profissional: os status e as cores são os mesmos, e "a vencer"
 * começa 60 dias antes. A unidade tem início de vigência, por isso ganha
 * "Aguardando vigência". Hoje é 05/08/2026: nada aqui lê o relógio, para a
 * mesma URL mostrar sempre os mesmos status.
 */
import type { TagVariant } from "../../components/Tag.js";

export const TODAY_BR = "05/08/2026";
const TODAY_ISO = "2026-08-05";

/* ============================================================
   Tipos e documentos padrão
   ============================================================ */

/** O `type` do documento (`Bloomy.Units.Document`), com os valores do protótipo. */
export type UnitDocTypeId = "license" | "certificate" | "contract" | "other";

export const UNIT_DOC_TYPES: { id: UnitDocTypeId; name: string }[] = [
  { id: "license", name: "Alvará / Licença" },
  { id: "certificate", name: "Certificado" },
  { id: "contract", name: "Contrato" },
  { id: "other", name: "Outro" },
];

export const typeName = (id: UnitDocTypeId) => UNIT_DOC_TYPES.find((t) => t.id === id)?.name ?? "Outro";

/** Os documentos padrão: o que toda unidade deveria ter. Aparecem na lista mesmo sem arquivo. */
export type StandardSlot = {
  id: string;
  name: string;
  short: string;
  type: UnitDocTypeId;
  icon: string;
  /** "anual", "a cada 3 anos", "sem validade"… */
  renewal: string;
  hint: string;
};

export const STANDARD: StandardSlot[] = [
  { id: "cli", name: "CLI — Certificado de Licenciamento Integrado", short: "CLI", type: "license", icon: "fa-file-shield", renewal: "anual",
    hint: "Licenciamento integrado da prefeitura, substitui o alvará em parte dos municípios" },
  { id: "alvara", name: "Alvará de Funcionamento", short: "Alvará", type: "license", icon: "fa-building-circle-check", renewal: "anual",
    hint: "Autorização municipal para operar no endereço da unidade" },
  { id: "avcb", name: "AVCB — Auto de Vistoria do Corpo de Bombeiros", short: "AVCB", type: "certificate", icon: "fa-fire-extinguisher", renewal: "a cada 3 anos",
    hint: "Vistoria do Corpo de Bombeiros atestando as condições de segurança" },
  { id: "vigilancia", name: "Licença da Vigilância Sanitária", short: "Vigilância", type: "license", icon: "fa-microscope", renewal: "anual",
    hint: "Licença sanitária estadual ou municipal do estabelecimento de saúde" },
  { id: "cnes", name: "CNES — Cadastro Nacional de Estabelecimentos de Saúde", short: "CNES", type: "certificate", icon: "fa-hospital", renewal: "sem validade",
    hint: "Comprovante de cadastro do estabelecimento no CNES" },
  { id: "crp", name: "Registro no CRP", short: "CRP", type: "certificate", icon: "fa-brain", renewal: "anual",
    hint: "Registro da pessoa jurídica no Conselho Regional de Psicologia" },
  { id: "crefito", name: "Registro no CREFITO", short: "CREFITO", type: "certificate", icon: "fa-person-walking", renewal: "anual",
    hint: "Registro da pessoa jurídica no conselho de fisioterapia e terapia ocupacional" },
  { id: "crefono", name: "Registro no CREFONO", short: "CREFONO", type: "certificate", icon: "fa-comment-medical", renewal: "anual",
    hint: "Registro da pessoa jurídica no Conselho Regional de Fonoaudiologia" },
  { id: "dedetizacao", name: "Certificado de Dedetização", short: "Dedetização", type: "certificate", icon: "fa-bug-slash", renewal: "a cada 6 meses",
    hint: "Controle de pragas com certificado da empresa aplicadora" },
  { id: "potabilidade", name: "Laudo de Potabilidade da Água", short: "Potabilidade", type: "certificate", icon: "fa-droplet", renewal: "a cada 6 meses",
    hint: "Análise laboratorial da água exigida pela vigilância sanitária" },
  { id: "residuos", name: "PGRSS — Plano de Gerenciamento de Resíduos", short: "PGRSS", type: "certificate", icon: "fa-recycle", renewal: "anual",
    hint: "Plano e comprovante de coleta de resíduos de serviços de saúde" },
  { id: "locacao", name: "Contrato de Locação do Imóvel", short: "Locação", type: "contract", icon: "fa-file-signature", renewal: "conforme contrato",
    hint: "Contrato vigente do imóvel onde a unidade funciona" },
];

export const slotOf = (id: string | undefined) => (id ? STANDARD.find((s) => s.id === id) : undefined);

/* ============================================================
   Operadoras
   ============================================================ */

export type Operator = { id: string; name: string };

/** As operadoras que recebem documentos (o particular fica de fora). */
export const OPERATORS: Operator[] = [
  { id: "op1", name: "Unimed" },
  { id: "op2", name: "Bradesco Saúde" },
  { id: "op3", name: "SulAmérica" },
  { id: "op4", name: "Cassi" },
  { id: "op6", name: "Porto Seguro Saúde" },
  { id: "op7", name: "Amil" },
];

export const opName = (id: string) => OPERATORS.find((o) => o.id === id)?.name ?? id;

/* ============================================================
   Documento e status
   ============================================================ */

export type UnitDocument = {
  id: string;
  /** O documento padrão que este preenche; sem ele, é adicional. */
  slotId?: string;
  type: UnitDocTypeId;
  name: string;
  /** `@unit_document.user.name`. */
  responsible: string;
  /** `dd/mm/aaaa`. */
  updatedAt: string;
  /** Início da vigência, `dd/mm/aaaa`, ou `null`. */
  validFrom: string | null;
  /** `dd/mm/aaaa`, ou `null` quando não vence. */
  validUntil: string | null;
  file: string;
  /** Operadoras com acesso ao arquivo. */
  sharedWith: string[];
};

export type DocStateKey = "none" | "pending_validity" | "no_validity" | "ok" | "expiring" | "expired";

export type DocState = { key: DocStateKey; label: string };

export const brToIso = (br: string) => {
  const [d, m, y] = br.split("/");
  return `${y}-${m}-${d}`;
};
export const isoToBr = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const daysTo = (br: string) => Math.round((Date.parse(brToIso(br)) - Date.parse(TODAY_ISO)) / 86_400_000);

/** Até quantos dias antes do vencimento o documento conta como "a vencer". */
const EXPIRING_DAYS = 60;

/** Status do documento; sem documento, a lacuna padrão está "Pendente". */
export function docState(doc: UnitDocument | null): DocState {
  if (!doc) return { key: "none", label: "Pendente" };
  if (doc.validFrom && daysTo(doc.validFrom) > 0) return { key: "pending_validity", label: "Aguardando vigência" };
  if (!doc.validUntil) return { key: "no_validity", label: "Sem validade" };
  const days = daysTo(doc.validUntil);
  if (days < 0) return { key: "expired", label: "Vencido" };
  if (days <= EXPIRING_DAYS) return { key: "expiring", label: `Vence em ${days} dia${days === 1 ? "" : "s"}` };
  return { key: "ok", label: "Válido" };
}

/** As cores do profissional, e azul-claro (o do monólito) para "Aguardando vigência". */
export const STATE_VARIANT: Record<DocStateKey, TagVariant> = {
  none: "yellow",
  pending_validity: "light-blue",
  no_validity: "dark-purple",
  ok: "green",
  expiring: "orange",
  expired: "red",
};

export const STATUS_FILTER: { value: DocStateKey; label: string }[] = [
  { value: "none", label: "Pendente" },
  { value: "ok", label: "Válido" },
  { value: "expiring", label: "A vencer" },
  { value: "expired", label: "Vencido" },
  { value: "pending_validity", label: "Aguardando vigência" },
  { value: "no_validity", label: "Sem validade" },
];

/* ============================================================
   Lista da aba
   ============================================================ */

/** Uma linha da aba: cada documento padrão (com arquivo ou como lacuna) e, depois, os adicionais. */
export type DocRow = {
  key: string;
  standard: boolean;
  slot?: StandardSlot;
  doc: UnitDocument | null;
  /** Na primeira linha de um documento padrão com vários arquivos: quantos outros há. */
  extra: number;
};

export function buildRows(docs: UnitDocument[]): DocRow[] {
  const rows: DocRow[] = [];
  for (const slot of STANDARD) {
    const all = docs.filter((d) => d.slotId === slot.id);
    if (all.length === 0) rows.push({ key: `slot-${slot.id}`, standard: true, slot, doc: null, extra: 0 });
    else all.forEach((doc, i) => rows.push({ key: doc.id, standard: true, slot, doc, extra: i === 0 ? all.length - 1 : 0 }));
  }
  for (const doc of docs.filter((d) => !slotOf(d.slotId))) rows.push({ key: doc.id, standard: false, doc, extra: 0 });
  return rows;
}

export const rowType = (r: DocRow): UnitDocTypeId => r.doc?.type ?? r.slot!.type;
export const rowTitle = (r: DocRow) => (r.doc ? r.doc.name : r.slot!.name);

export type DocFilters = { name: string; type: UnitDocTypeId | ""; status: DocStateKey | ""; operator: string; origin: "" | "standard" | "additional" };

export const EMPTY_FILTERS: DocFilters = { name: "", type: "", status: "", operator: "", origin: "" };

export const hasFilters = (f: DocFilters) => Boolean(f.name.trim() || f.type || f.status || f.operator || f.origin);

export function filterRows(rows: DocRow[], f: DocFilters): DocRow[] {
  const q = f.name.trim().toLowerCase();
  return rows
    .filter((r) => !q || r.slot?.name.toLowerCase().includes(q) || r.slot?.short.toLowerCase().includes(q) || r.doc?.name.toLowerCase().includes(q))
    .filter((r) => !f.type || rowType(r) === f.type)
    .filter((r) => !f.status || docState(r.doc).key === f.status)
    .filter((r) => !f.operator || r.doc?.sharedWith.includes(f.operator))
    .filter((r) => !f.origin || (f.origin === "standard") === r.standard);
}

export function counts(rows: DocRow[]) {
  const states = rows.map((r) => docState(r.doc).key);
  return {
    pending: states.filter((k) => k === "none").length,
    active: states.filter((k) => k === "ok" || k === "no_validity" || k === "pending_validity").length,
    expiring: states.filter((k) => k === "expiring").length,
    expired: states.filter((k) => k === "expired").length,
  };
}

export const pluralize = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
