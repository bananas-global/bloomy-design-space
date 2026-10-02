/**
 * Profissionais — dados sintéticos e determinísticos.
 *
 * Dez profissionais da clínica (nomes fictícios), os totais de horas do mês,
 * os documentos de cada um, o que já foi compartilhado com cada operadora e
 * os documentos internos e ocupacionais. Hoje é `TODAY` (05/08/2026): Tânia e
 * Lucinara estão em inativação, Carina já foi desligada.
 */
import type { Fixture } from "@brucesantos/design-space";
import {
  addDays,
  docTypeName,
  EXTRA_DOC_TYPES,
  linkKey,
  reconcile,
  type DocsState,
  type ExtraDoc,
  type Link,
  type LinkStatus,
  type MonthHours,
  type Operator,
  type ProfDoc,
  type Professional,
} from "./model.js";

export const TODAY = "2026-08-05";

export const PROFESSIONALS: Professional[] = [
  { id: "p1", name: "Helena Martins Costa", active: true, specialty: "Psicologia", council: "06233962", types: ["Aplicador"], formation: "Psicologia (CRP)", supervisor: "Rafael Andrade Nunes" },
  { id: "p2", name: "Tânia Abreu Pinho", active: true, deactivationAt: "2026-08-12", specialty: "Psicologia", council: "06113517", types: ["Coordenador"], formation: "Psicologia (CRP)", supervisor: null },
  { id: "p3", name: "Mariana Palmeira Stein", active: true, specialty: "Terapia Ocupacional", council: "25044", types: ["Terapeuta"], formation: "Terapia Ocupacional (CREFITO)", supervisor: "Helena Martins Costa" },
  { id: "p4", name: "Tiago Alves da Rocha", active: true, specialty: "Terapia Ocupacional", council: "25067", types: ["Terapeuta"], formation: "Terapia Ocupacional (CREFITO)", supervisor: "Helena Martins Costa" },
  { id: "p5", name: "Lívia Cardoso da Mata", active: true, tbd: true, specialty: "Psicopedagogia", council: "00015", types: ["Terapeuta"], formation: "Outros", supervisor: null },
  { id: "p6", name: "Larissa Wippich Faria", active: true, specialty: "Psicologia", council: "123", types: ["Terapeuta", "Aplicador", "Supervisor"], formation: "Psicologia (CRP)", supervisor: "Rafael Andrade Nunes" },
  { id: "p7", name: "Raiane Almeida Longo", active: true, specialty: "Fisioterapia", council: "448485", types: ["Terapeuta"], formation: "Fisioterapia (CREFITO)", supervisor: null },
  { id: "p8", name: "Lucinara Rodrigues Lima", active: true, deactivationAt: "2026-08-31", specialty: "Fisioterapia", council: "239861", types: ["Terapeuta"], formation: "Fisioterapia (CREFITO)", supervisor: "Rafael Andrade Nunes" },
  { id: "p9", name: "Fábio Stoll Pereira", active: true, specialty: "Fonoaudiologia", council: "123123", types: ["Coordenador"], formation: "Fonoaudiologia (CRF)", supervisor: null },
  { id: "p10", name: "Carina Ferreira de Araújo", active: false, specialty: "Aplicador Psicologia", council: "123123", types: ["Aplicador"], formation: "Psicologia (CRP)", supervisor: "Helena Martins Costa" },
];

/** Os totais que `hours_control.ex` calcula para o mês, por profissional. */
export const MONTH_HOURS: Record<string, MonthHours> = {
  p1: { planned: 120, worked: 114, appointments: 46, compensation: "R$ 3.420,00" },
  p2: { planned: 160, worked: 164, appointments: 62, compensation: "R$ 4.920,00" },
  p3: { planned: 80, worked: 76, appointments: 30, compensation: "R$ 2.280,00" },
  p4: { planned: 80, worked: 80, appointments: 32, compensation: "R$ 2.400,00" },
  p5: { planned: 48, worked: 32, appointments: 12, compensation: "R$ 960,00" },
  p6: { planned: 120, worked: 108, appointments: 41, compensation: "R$ 3.240,00" },
  p7: { planned: 64, worked: 64, appointments: 24, compensation: "R$ 1.920,00" },
  p8: { planned: 80, worked: 72, appointments: 27, compensation: "R$ 2.160,00" },
  p9: { planned: 160, worked: 156, appointments: 58, compensation: "R$ 4.680,00" },
  p10: { planned: 0, worked: 0, appointments: 0, compensation: "R$ 0,00" },
};

/** As operadoras conveniadas (sem Particular) e o que cada uma exige para credenciar. */
export const OPERATORS: Operator[] = [
  { id: "op1", name: "Unimed", required: ["diploma", "council", "id", "cv"] },
  { id: "op2", name: "Bradesco Saúde", required: ["diploma", "council", "id"] },
  { id: "op3", name: "SulAmérica", required: ["diploma", "council"] },
  { id: "op4", name: "Cassi", required: ["diploma", "council", "id", "address"] },
  { id: "op6", name: "Porto Seguro Saúde", required: ["diploma", "council"] },
  { id: "op7", name: "Amil", required: [] },
];

/** Formações especiais reconhecidas. */
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
];

export const trainingName = (id: string) => SPECIAL_TRAININGS.find((t) => t.id === id)?.name ?? "";
export const trainingShort = (id: string) => SPECIAL_TRAININGS.find((t) => t.id === id)?.short ?? "";

/** Carga horária ABA e formações especiais do cadastro. */
export const PROFILE: Record<string, { abaHours: number; badges: string[] }> = {
  p1: { abaHours: 320, badges: ["Integração Sensorial", "PECS", "Denver"] },
  p2: { abaHours: 480, badges: ["Supervisão BCaBA", "PECS"] },
  p3: { abaHours: 180, badges: ["Integração Sensorial"] },
  p4: { abaHours: 120, badges: [] },
  p5: { abaHours: 240, badges: ["Psicopedagogia clínica"] },
  p6: { abaHours: 400, badges: ["Integração Sensorial", "ABLLS-R"] },
  p7: { abaHours: 80, badges: [] },
  p8: { abaHours: 200, badges: ["Bobath"] },
  p9: { abaHours: 520, badges: ["Integração Sensorial", "PROMPT", "Supervisão BCBA"] },
  p10: { abaHours: 60, badges: [] },
};

/** Faixa da carga horária ABA. */
export function abaBand(hours: number): string {
  if (hours >= 400) return "Avançada";
  if (hours >= 160) return "Intermediária";
  return "Inicial";
}

/** Documentos do cadastro: tipo, atualizado em, válido até. */
const SEED_DOCS: Record<string, [string, string, string | null][]> = {
  p1: [["diploma", "01/02/2024", null], ["council", "10/01/2026", "10/01/2027"], ["id", "01/02/2024", null], ["cv", "14/03/2026", null], ["specialization", "20/05/2025", null]],
  p2: [["diploma", "05/03/2024", null], ["council", "02/02/2026", "02/02/2027"], ["id", "05/03/2024", null], ["cv", "02/02/2026", null]],
  p3: [["diploma", "18/04/2024", null], ["council", "12/07/2025", "12/07/2026"], ["id", "18/04/2024", null], ["address", "02/03/2026", "02/09/2026"]],
  p4: [["diploma", "22/05/2024", null], ["council", "01/03/2026", "01/03/2027"], ["id", "22/05/2024", null]],
  p5: [["diploma", "12/06/2024", null], ["council", "15/04/2026", "15/04/2027"], ["cv", "15/04/2026", null]],
  p6: [["diploma", "30/06/2024", null], ["council", "20/05/2026", "20/05/2027"], ["id", "30/06/2024", null], ["cv", "20/05/2026", null], ["address", "10/07/2026", "10/01/2027"]],
  p7: [["diploma", "14/08/2024", null], ["council", "08/08/2025", "08/08/2026"], ["id", "14/08/2024", null]],
  p8: [["diploma", "03/09/2024", null], ["council", "11/06/2026", "11/06/2027"], ["id", "03/09/2024", null], ["contract", "01/01/2026", "31/12/2026"]],
  p9: [["diploma", "27/10/2024", null], ["council", "19/02/2026", "19/02/2027"], ["id", "27/10/2024", null], ["cv", "19/02/2026", null], ["specialization", "05/05/2026", null]],
  p10: [["diploma", "09/11/2024", null], ["council", "03/01/2025", "03/01/2026"], ["id", "09/11/2024", null]],
};

/** O que já foi compartilhado com cada operadora. */
const SEED_SHARE: Record<string, Record<string, string[]>> = {
  p1: { op1: ["diploma", "council", "id", "cv"], op2: ["diploma", "council", "id"] },
  p2: { op1: ["diploma", "council", "id"], op3: ["diploma", "council"] },
  p3: { op1: ["diploma", "council", "id", "address"], op4: ["diploma", "council", "id", "address"] },
  p4: { op2: ["diploma", "council"] },
  p5: { op1: ["diploma", "council"] },
  p6: { op1: ["diploma", "council", "id", "cv"], op2: ["diploma", "council", "id"], op3: ["diploma", "council"] },
  p7: { op3: ["diploma", "council"] },
  p8: { op4: ["diploma", "council", "id"] },
  p9: { op1: ["diploma", "council", "id", "cv"], op2: ["diploma", "council", "id"] },
  p10: { op6: ["diploma"] },
};

/** Vínculos com as operadoras: status e desde quando. */
const SEED_LINKS: Record<string, Record<string, [LinkStatus, string]>> = {
  p1: { op1: ["active", "12/02/2024"], op2: ["active", "20/03/2024"] },
  p2: { op1: ["active", "10/03/2024"], op3: ["pending", "02/07/2026"] },
  p3: { op1: ["active", "25/04/2024"], op4: ["active", "18/11/2024"] },
  p4: { op2: ["pending", "14/07/2026"] },
  p5: { op1: ["pending", "20/06/2026"] },
  p6: { op1: ["active", "02/07/2024"], op2: ["active", "02/07/2024"], op3: ["active", "12/09/2024"] },
  p7: { op3: ["active", "20/08/2024"] },
  p8: { op4: ["active", "10/12/2024"] },
  p9: { op1: ["active", "05/11/2024"], op2: ["active", "05/11/2024"] },
  p10: { op6: ["inactive", "08/02/2025"] },
};

function profDocs(profId: string): ProfDoc[] {
  const seed = SEED_DOCS[profId] ?? [];
  const share = SEED_SHARE[profId] ?? {};
  const firstDate = seed[0]?.[1] ?? "01/02/2024";
  const docs: ProfDoc[] = seed.map(([typeId, updatedAt, validUntil], i) => ({
    id: `${profId}_d${i + 1}`,
    typeId,
    name: docTypeName(typeId),
    updatedAt,
    validUntil,
    shared: Object.keys(share).filter((op) => share[op]!.includes(typeId)),
  }));
  const profile = PROFILE[profId];
  // Formações especiais: uma por selo do cadastro.
  profile?.badges.forEach((badge, j) => {
    const t =
      SPECIAL_TRAININGS.find((s) => s.name === badge) ??
      SPECIAL_TRAININGS.find((s) => badge.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(badge.toLowerCase()));
    if (!t) return;
    docs.push({ id: `${profId}_ft${j + 1}`, typeId: "special_training", name: `Formação Especial — ${t.name}`, training: t.id, updatedAt: firstDate, validUntil: null, shared: [] });
  });
  // Curso ABA: um certificado com a carga horária do cadastro.
  if (profile?.abaHours) {
    docs.push({ id: `${profId}_aba1`, typeId: "aba_course", name: `Curso de formação em ABA — ${profile.abaHours}h`, hours: profile.abaHours, updatedAt: firstDate, validUntil: null, shared: [] });
  }
  return docs;
}

function hash(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Documentos internos e ocupacionais: cada profissional recebe um recorte
 * plausível, com faltas e vencimentos para a matriz ter o que mostrar.
 */
function extraDocs(profId: string): Record<string, ExtraDoc> {
  const docs: Record<string, ExtraDoc> = {};
  for (const t of EXTRA_DOC_TYPES) {
    const h = hash(profId + t.id);
    const roll = h % 100;
    if (roll < 8) continue; // ausente
    const waived = roll < 13 && !t.required;
    let validUntil: string | null = null;
    if (t.expires) {
      const bucket = (h >> 5) % 100;
      const offset = bucket < 8 ? -(10 + (h % 60)) : bucket < 22 ? 4 + (h % 26) : 70 + (h % 260);
      validUntil = addDays(TODAY, offset);
    }
    docs[t.id] = {
      typeId: t.id,
      waived,
      updatedAt: addDays(TODAY, -(30 + ((h >>> 3) % 500))),
      validUntil,
      by: ["Marcus Vinícius Gimenes", "Ana Paula Ribeiro", "Coordenação"][(h >>> 7) % 3]!,
    };
  }
  return docs;
}

export function buildDocsState(): DocsState {
  const links: Record<string, Link> = {};
  for (const [profId, ops] of Object.entries(SEED_LINKS)) {
    for (const [opId, [status, since]] of Object.entries(ops)) {
      links[linkKey(profId, opId)] = { status, since, manual: status === "inactive" };
    }
  }
  return reconcile(
    {
      docs: Object.fromEntries(PROFESSIONALS.map((p) => [p.id, profDocs(p.id)])),
      extra: Object.fromEntries(PROFESSIONALS.map((p) => [p.id, extraDocs(p.id)])),
      links,
    },
    OPERATORS,
    TODAY,
  );
}

/** Qual visão da lista abre. */
export type ProfessionalsView = "list" | "docs" | "hours";

export type ProfessionalsFixture = {
  view: ProfessionalsView;
  professionals: Professional[];
  docs: DocsState;
  /** Controle de horas já processado para estes profissionais. */
  processed?: string[];
};

function build(view: ProfessionalsView, processed?: string[]): ProfessionalsFixture {
  return { view, professionals: PROFESSIONALS, docs: buildDocsState(), processed };
}

export const PROFESSIONALS_FIXTURES: Fixture<ProfessionalsFixture>[] = [
  {
    id: "professionals.list",
    label: "Profissionais › Cadastro",
    description: "Dez profissionais: sete ativos, dois em inativação (Tânia sai em 12/08, Lucinara em 31/08) e uma inativa.",
    data: () => build("list"),
  },
  {
    id: "professionals.docs",
    label: "Profissionais › Documentação",
    description: "Os mesmos dez, com a documentação: documentos do cadastro, internos, ocupacionais e o credenciamento em seis operadoras.",
    data: () => build("docs"),
  },
  {
    id: "professionals.hours",
    label: "Profissionais › Controle de horas",
    description: "Controle de horas de agosto de 2026 processado para os três profissionais de Psicologia ativos.",
    data: () => build("hours", ["p1", "p2", "p6"]),
  },
];
