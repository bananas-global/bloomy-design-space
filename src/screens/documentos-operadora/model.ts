/**
 * Documentos da Operadora — tipos e regras.
 * Novo — não existe no Phoenix.
 *
 * Profissionais: cada um tem os próprios documentos e escolhe quais
 * compartilhar com a operadora. O credenciamento é derivado: falta documento
 * exigido (ausente ou vencido) → "Em credenciamento"; completo → "Ativo".
 * Descredenciar é manual e nunca é revertido pela regra.
 *
 * Unidades: os documentos obrigatórios da unidade (alvará, AVCB, CNES…). Com
 * todos compartilhados, a unidade fica "Credenciada" na operadora.
 */
import type { TagVariant } from "../../components/Tag.js";

/** A data de referência do protótipo. */
export const TODAY = "2026-08-05";

/** `TODAY` em dd/mm/aaaa: a data de um compartilhamento feito agora. */
export const TODAY_BR = "05/08/2026";

/* ============================================================
   Tipos
   ============================================================ */

export type Operator = {
  id: string;
  name: string;
  ans: string;
  /** Rótulo do tipo: "Plano de saúde", "Autogestão", "Cooperativa". */
  type: string;
  active: boolean;
  services: number;
  patients: number;
  guides: number;
};

export type Professional = {
  id: string;
  name: string;
  /** Ativo na clínica. */
  active: boolean;
  specialty: string;
  council: string;
  /** Unidades em que atua. */
  units: string[];
  /** Mês de formatura, mm/aaaa. */
  graduation: string | null;
  /** Carga horária dos cursos de ABA. */
  abaHours: number;
  /** Formações especiais (abordagens e protocolos). */
  badges: string[];
};

export type ProfDoc = {
  id: string;
  typeId: string;
  name: string;
  /** dd/mm/aaaa, ou `null` quando o documento não vence. */
  validUntil: string | null;
  file: string;
  /** Operadoras com quem foi compartilhado, e quando. */
  shared: { opId: string; at: string }[];
};

export type LinkStatus = "active" | "pending" | "inactive";

/** O vínculo do profissional com a operadora (o credenciamento). */
export type Link = { profId: string; opId: string; status: LinkStatus; since: string; manual?: boolean };

export type UnitDoc = {
  id: string;
  name: string;
  validFrom: string | null;
  validUntil: string | null;
  attachment: string | null;
  /** Ids das operadoras com quem foi compartilhado. */
  shared: string[];
};

export type Unit = { id: string; name: string; city: string; documents: UnitDoc[] };

export type DocsState = {
  operator: Operator;
  professionals: Professional[];
  /** Documentos exigidos pela operadora para credenciar um profissional. */
  required: string[];
  docs: Record<string, ProfDoc[]>;
  /** Por `profId:opId`. */
  links: Record<string, Link>;
  units: Unit[];
};

/* ============================================================
   Datas
   ============================================================ */

export function parseBR(s: string | null): Date | null {
  if (!s) return null;
  const [d, m, y] = s.split("/").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

const DAY = 86_400_000;
const TODAY_DATE = new Date(`${TODAY}T00:00:00Z`);

const daysTo = (br: string) => Math.round((parseBR(br)!.getTime() - TODAY_DATE.getTime()) / DAY);

/** Tempo de formado a partir de mm/aaaa: "12 anos e 8 meses". */
export function yearsLabel(mmYYYY: string | null): string {
  if (!mmYYYY) return "—";
  const [m, y] = mmYYYY.split("/").map(Number);
  const months = (TODAY_DATE.getUTCFullYear() - y!) * 12 + (TODAY_DATE.getUTCMonth() + 1 - m!);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (years === 0) return plural(rest, "mês", "meses");
  return `${plural(years, "ano", "anos")}${rest ? ` e ${plural(rest, "mês", "meses")}` : ""}`;
}

/** Faixa da carga horária de ABA, para leitura rápida na lista. */
export function abaBand(hours: number): string {
  if (hours >= 400) return "Avançada";
  if (hours >= 160) return "Intermediária";
  return "Inicial";
}

/* ============================================================
   Profissionais
   ============================================================ */

export const DOC_TYPE_NAMES: Record<string, string> = {
  diploma: "Certificado de formação",
  council: "Registro no conselho",
  council_card: "Carteirinha do conselho",
  council_quit: "Declaração de quitação do conselho",
  aba_course: "Curso de formação em ABA",
  special_training: "Formação especial",
  id: "RG / CPF",
  address: "Comprovante de endereço",
  cv: "Currículo",
  specialization: "Certificado de especialização",
  contract: "Contrato PJ",
  other: "Outro documento",
};

export const docTypeName = (id: string) => DOC_TYPE_NAMES[id] ?? id;

export type DocState = { key: "ok" | "expiring" | "expired"; label: string; variant: TagVariant };

/** Validade de um documento do profissional (vence em até 60 dias: laranja). */
export function profDocState(doc: ProfDoc): DocState {
  if (!doc.validUntil) return { key: "ok", label: "Sem validade", variant: "light-blue" };
  const d = daysTo(doc.validUntil);
  if (d < 0) return { key: "expired", label: "Vencido", variant: "red" };
  if (d <= 60) return { key: "expiring", label: `Vence em ${d} dias`, variant: "orange" };
  return { key: "ok", label: "Válido", variant: "green" };
}

export const linkKey = (profId: string, opId: string) => `${profId}:${opId}`;

export const LINK_STATUS: Record<LinkStatus, { label: string; variant: TagVariant }> = {
  active: { label: "Ativo", variant: "green" },
  pending: { label: "Em credenciamento", variant: "light-blue" },
  inactive: { label: "Descredenciado", variant: "red" },
};

export const NOT_LINKED = "Não credenciado";

export const isShared = (doc: ProfDoc, opId: string) => doc.shared.some((s) => s.opId === opId);

/** Os documentos exigidos que faltam: não compartilhados com a operadora, ou vencidos. */
export function missingFor(s: Pick<DocsState, "docs" | "required">, profId: string, opId: string): string[] {
  const docs = s.docs[profId] ?? [];
  return s.required.filter((typeId) => {
    const d = docs.find((x) => x.typeId === typeId && isShared(x, opId));
    return !d || profDocState(d).key === "expired";
  });
}

/** Recalcula o status de cada vínculo pela documentação; o descredenciamento manual fica. */
export function reconcile(s: DocsState): DocsState {
  const links: Record<string, Link> = {};
  for (const [key, l] of Object.entries(s.links)) {
    links[key] = l.manual || l.status === "inactive" ? l : { ...l, status: missingFor(s, l.profId, l.opId).length ? "pending" : "active" };
  }
  return { ...s, links };
}

export type DocSituation = "Completo" | "Pendente" | "Não iniciado";

export const DOC_SITUATIONS: DocSituation[] = ["Completo", "Pendente", "Não iniciado"];

/* ============================================================
   Unidades
   ============================================================ */

/** Os documentos obrigatórios da unidade, reconhecidos pelo nome. */
export const UNIT_STANDARD_DOCS: { id: string; name: string; match: RegExp }[] = [
  { id: "cli", name: "CLI — Certificado de Licenciamento Integrado", match: /\bcli\b|licenciamento integrado/i },
  { id: "alvara", name: "Alvará de Funcionamento", match: /alvar[áa].*funcionamento|alvar[áa]$/i },
  { id: "avcb", name: "AVCB — Auto de Vistoria do Corpo de Bombeiros", match: /avcb|bombeiro/i },
  { id: "vigilancia", name: "Licença da Vigilância Sanitária", match: /vigil[âa]ncia|sanit[áa]ri/i },
  { id: "cnes", name: "CNES — Cadastro Nacional de Estabelecimentos de Saúde", match: /cnes/i },
  { id: "crp", name: "Registro no CRP", match: /\bcrp\b/i },
  { id: "crefito", name: "Registro no CREFITO", match: /crefito/i },
  { id: "crefono", name: "Registro no CREFONO", match: /crefono|fonoaudiolog/i },
  { id: "dedetizacao", name: "Certificado de Dedetização", match: /dedetiza|controle de praga|desinsetiza/i },
  { id: "potabilidade", name: "Laudo de Potabilidade da Água", match: /potabilidade|[áa]gua/i },
  { id: "residuos", name: "PGRSS — Plano de Gerenciamento de Resíduos", match: /pgrss|res[íi]duo/i },
  { id: "locacao", name: "Contrato de Locação do Imóvel", match: /loca[çc][ãa]o|aluguel|im[óo]vel/i },
];

const standardFor = (doc: UnitDoc) => UNIT_STANDARD_DOCS.find((s) => s.match.test(doc.name)) ?? null;

export type UnitRow = { key: string; standard: boolean; doc: UnitDoc | null };

/**
 * Um slot por documento obrigatório (preenchido ou não), na ordem da lista
 * padrão, e depois os demais documentos da unidade. Um segundo documento do
 * mesmo slot entra como extra, ainda marcado como padrão.
 */
export function unitRows(unit: Unit): (UnitRow & { duplicate?: boolean })[] {
  const bySlot: Record<string, UnitDoc[]> = {};
  for (const d of unit.documents) {
    const slot = standardFor(d);
    if (slot) (bySlot[slot.id] ??= []).push(d);
  }
  const rows: (UnitRow & { duplicate?: boolean })[] = UNIT_STANDARD_DOCS.map((slot) => ({ key: `s-${slot.id}`, standard: true, doc: bySlot[slot.id]?.[0] ?? null }));
  for (const d of unit.documents) {
    const slot = standardFor(d);
    if (!slot) rows.push({ key: `d-${d.id}`, standard: false, doc: d });
    else if (bySlot[slot.id]![0]!.id !== d.id) rows.push({ key: `x-${d.id}`, standard: true, duplicate: true, doc: d });
  }
  return rows;
}

/** Validade de um documento da unidade (vence em menos de 30 dias: laranja). */
export function unitDocState(doc: UnitDoc): { label: string; variant: TagVariant } {
  const until = parseBR(doc.validUntil);
  const from = parseBR(doc.validFrom);
  if (!until) return { label: "Ativo", variant: "green" };
  if (from && from > TODAY_DATE) return { label: "Aguardando Vigência", variant: "light-blue" };
  const diff = Math.round((until.getTime() - TODAY_DATE.getTime()) / DAY);
  if (diff < 0) return { label: "Expirado", variant: "red" };
  if (diff < 30) return { label: "A vencer", variant: "orange" };
  return { label: "Ativo", variant: "green" };
}

export type UnitStatusKey = "none" | "pending" | "active";

export const UNIT_STATUS: Record<UnitStatusKey, { label: string; variant: TagVariant }> = {
  none: { label: "Não compartilhado", variant: "light-blue" },
  pending: { label: "Em credenciamento", variant: "light-blue" },
  active: { label: "Credenciada", variant: "green" },
};

/** Os obrigatórios que faltam compartilhar, os compartilhados e o status da unidade na operadora. */
export function unitStatus(unit: Unit, opId: string) {
  const missing = unitRows(unit).filter((r) => r.standard && !r.duplicate && (!r.doc || !r.doc.shared.includes(opId)));
  const shared = unit.documents.filter((d) => d.shared.includes(opId));
  const key: UnitStatusKey = shared.length === 0 ? "none" : missing.length === 0 ? "active" : "pending";
  return { key, missing, shared };
}
