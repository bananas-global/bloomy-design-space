/**
 * Documentos do profissional — tipos, catálogo de documentos e regras da aba.
 *
 * Porte de `doc-sharing.jsx` e `doc-tab-v2.jsx` do protótipo. Hoje é
 * 05/08/2026 (`DS_TODAY`): nada aqui lê o relógio, para a mesma URL mostrar
 * sempre os mesmos status.
 */
import type { TagVariant } from "../../components/Tag.js";

export const TODAY_BR = "05/08/2026";
const TODAY_ISO = "2026-08-05";

/* ============================================================
   Catálogo
   ============================================================ */

export type DocTypeId =
  | "diploma" | "council" | "council_card" | "council_quit" | "aba_course" | "special_training"
  | "id" | "address" | "cv" | "specialization" | "contract" | "other";

export type DocType = { id: DocTypeId; name: string; expires: boolean };

export const DOC_TYPES: DocType[] = [
  { id: "diploma", name: "Certificado de formação", expires: false },
  { id: "council", name: "Registro no conselho", expires: true },
  { id: "council_card", name: "Carteirinha do conselho", expires: true },
  { id: "council_quit", name: "Declaração de quitação do conselho", expires: true },
  { id: "aba_course", name: "Curso de formação em ABA", expires: false },
  { id: "special_training", name: "Formação especial", expires: false },
  { id: "id", name: "RG / CPF", expires: false },
  { id: "address", name: "Comprovante de endereço", expires: true },
  { id: "cv", name: "Currículo", expires: false },
  { id: "specialization", name: "Certificado de especialização", expires: false },
  { id: "contract", name: "Contrato PJ", expires: true },
  { id: "other", name: "Outro documento", expires: false },
];

export const docType = (id: DocTypeId): DocType => DOC_TYPES.find((t) => t.id === id) ?? DOC_TYPES[DOC_TYPES.length - 1]!;
export const typeName = (id: DocTypeId) => docType(id).name;

/** Os documentos padrão: o que toda ficha deveria ter. Aparecem na lista mesmo sem arquivo. */
export type StandardSlot = { typeId: DocTypeId; icon: string; hint: string };

export const STANDARD: StandardSlot[] = [
  { typeId: "diploma", icon: "fa-graduation-cap", hint: "Diploma ou certificado de conclusão do curso superior" },
  { typeId: "council", icon: "fa-id-badge", hint: "Número de inscrição ativo no conselho de classe" },
  { typeId: "council_card", icon: "fa-address-card", hint: "Carteirinha emitida pelo conselho, frente e verso" },
  { typeId: "council_quit", icon: "fa-file-circle-check", hint: "Comprova que a anuidade do conselho está quitada" },
  { typeId: "aba_course", icon: "fa-brain", hint: "Formação, supervisão ou curso de ABA com carga horária" },
  { typeId: "special_training", icon: "fa-certificate", hint: "Certificado de abordagem específica — IS, Bobath, PECS, Denver" },
];

export const isStandard = (typeId: DocTypeId) => STANDARD.some((s) => s.typeId === typeId);
export const slotOf = (typeId: DocTypeId) => STANDARD.find((s) => s.typeId === typeId);
/** Os tipos que "Adicionar documento" oferece: os que não são padrão. */
export const FREE_TYPES = DOC_TYPES.filter((t) => !isStandard(t.id));

/** Formações especiais reconhecidas (abordagens e protocolos). */
export const SPECIAL_TRAININGS = [
  { id: "is", short: "IS", name: "Integração Sensorial" },
  { id: "bobath", short: "Bobath", name: "Conceito Bobath" },
  { id: "pecs", short: "PECS", name: "PECS — Comunicação por Troca de Figuras" },
  { id: "denver", short: "Denver", name: "Modelo Denver (ESDM)" },
  { id: "prompt", short: "PROMPT", name: "PROMPT" },
  { id: "ablls", short: "ABLLS-R", name: "ABLLS-R" },
  { id: "vbmapp", short: "VB-MAPP", name: "VB-MAPP" },
  { id: "psicoped", short: "Psicopedagogia", name: "Psicopedagogia clínica" },
  { id: "bcaba", short: "BCaBA", name: "Supervisão BCaBA" },
  { id: "bcba", short: "BCBA", name: "Supervisão BCBA" },
] as const;

export const trainingName = (id: string) => SPECIAL_TRAININGS.find((t) => t.id === id)?.name ?? "";
export const trainingDocName = (id: string) => `Formação Especial — ${trainingName(id)}`;

/** Carga horária sugerida no curso de ABA. */
export const ABA_QUICK_HOURS = [40, 80, 120, 180, 360];

/* ============================================================
   Operadoras
   ============================================================ */

export type Operator = { id: string; name: string; required: DocTypeId[] };

/** As operadoras que recebem documentos (o particular fica de fora), com o que cada uma exige para credenciar. */
export const OPERATORS: Operator[] = [
  { id: "op1", name: "Unimed", required: ["diploma", "council", "id", "cv"] },
  { id: "op2", name: "Bradesco Saúde", required: ["diploma", "council", "id"] },
  { id: "op3", name: "SulAmérica", required: ["diploma", "council"] },
  { id: "op4", name: "Cassi", required: ["diploma", "council", "id", "address"] },
  { id: "op6", name: "Porto Seguro Saúde", required: ["diploma", "council"] },
  { id: "op7", name: "Amil", required: [] },
];

export const opName = (id: string) => OPERATORS.find((o) => o.id === id)?.name ?? id;
export const requiredBy = (typeId: DocTypeId) => OPERATORS.filter((o) => o.required.includes(typeId));

/* ============================================================
   Documento e status
   ============================================================ */

export type ProfessionalDocument = {
  id: string;
  typeId: DocTypeId;
  name: string;
  /** Só em `special_training`. */
  training?: string;
  /** Só em `aba_course`. */
  hours?: number;
  /** Número do registro (só o do conselho tem). */
  number: string;
  /** `dd/mm/aaaa`. */
  updatedAt: string;
  /** `dd/mm/aaaa`, ou `null` quando não vence. */
  validUntil: string | null;
  file: string;
  /** Operadoras com acesso ao arquivo. */
  sharedWith: string[];
};

export type DocStateKey = "none" | "no_validity" | "ok" | "expiring" | "expired";

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
export function docState(doc: ProfessionalDocument | null): DocState {
  if (!doc) return { key: "none", label: "Pendente" };
  if (!doc.validUntil) return { key: "no_validity", label: "Sem validade" };
  const days = daysTo(doc.validUntil);
  if (days < 0) return { key: "expired", label: "Vencido" };
  if (days <= EXPIRING_DAYS) return { key: "expiring", label: `Vence em ${days} dia${days === 1 ? "" : "s"}` };
  return { key: "ok", label: "Válido" };
}

/** Cores de status: pendente amarelo, sem validade roxo-escuro (`dark-purple`, o mais neutro do `tag`), válido verde, a vencer laranja, vencido vermelho. */
export const STATE_VARIANT: Record<DocStateKey, TagVariant> = {
  none: "yellow",
  no_validity: "dark-purple",
  ok: "green",
  expiring: "orange",
  expired: "red",
};

/** As opções do filtro de Status (a vencer junta todos os "Vence em N dias"). */
export const STATUS_FILTER: { value: DocStateKey; label: string }[] = [
  { value: "none", label: "Pendente" },
  { value: "ok", label: "Válido" },
  { value: "expiring", label: "A vencer" },
  { value: "expired", label: "Vencido" },
  { value: "no_validity", label: "Sem validade" },
];

/* ============================================================
   Lista da aba
   ============================================================ */

/**
 * Uma linha da aba: cada documento padrão (com arquivo ou como lacuna) e, depois,
 * os documentos adicionais.
 */
export type DocRow = {
  key: string;
  standard: boolean;
  slot?: StandardSlot;
  doc: ProfessionalDocument | null;
  /** Na primeira linha de um tipo padrão com vários documentos: quantos outros há. */
  extra: number;
};

export function buildRows(docs: ProfessionalDocument[]): DocRow[] {
  const rows: DocRow[] = [];
  for (const slot of STANDARD) {
    const all = docs.filter((d) => d.typeId === slot.typeId);
    if (all.length === 0) rows.push({ key: `slot-${slot.typeId}`, standard: true, slot, doc: null, extra: 0 });
    else all.forEach((doc, i) => rows.push({ key: doc.id, standard: true, slot, doc, extra: i === 0 ? all.length - 1 : 0 }));
  }
  for (const doc of docs.filter((d) => !isStandard(d.typeId))) rows.push({ key: doc.id, standard: false, doc, extra: 0 });
  return rows;
}

/** O "Tipo" de uma linha no filtro: o tipo padrão, ou o nome do documento adicional. */
export const rowType = (r: DocRow) => (r.slot ? typeName(r.slot.typeId) : (r.doc?.name ?? ""));
export const rowTitle = (r: DocRow) => (r.doc ? r.doc.name : typeName(r.slot!.typeId));

export type DocFilters = { name: string; type: string; status: DocStateKey | ""; operator: string };

export const EMPTY_FILTERS: DocFilters = { name: "", type: "", status: "", operator: "" };

export const hasFilters = (f: DocFilters) => Boolean(f.name.trim() || f.type || f.status || f.operator);

export function filterRows(rows: DocRow[], f: DocFilters): DocRow[] {
  const q = f.name.trim().toLowerCase();
  return rows
    .filter((r) => !q || (r.slot && typeName(r.slot.typeId).toLowerCase().includes(q)) || r.doc?.name.toLowerCase().includes(q))
    .filter((r) => !f.type || rowType(r) === f.type)
    .filter((r) => !f.status || docState(r.doc).key === f.status)
    .filter((r) => !f.operator || r.doc?.sharedWith.includes(f.operator));
}

export function counts(rows: DocRow[]) {
  const states = rows.map((r) => docState(r.doc).key);
  return {
    pending: states.filter((k) => k === "none").length,
    active: states.filter((k) => k === "ok" || k === "no_validity").length,
    expiring: states.filter((k) => k === "expiring").length,
    expired: states.filter((k) => k === "expired").length,
  };
}

export const pluralize = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
