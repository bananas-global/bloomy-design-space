/**
 * Documentos da Operadora — dados sintéticos e determinísticos.
 *
 * A Unimed, os dez profissionais da clínica com os documentos de cada um e o
 * que já foi compartilhado com ela, e as duas unidades com os documentos
 * obrigatórios. Hoje é `TODAY` (05/08/2026). Nomes são fictícios.
 */
import type { Fixture } from "@brucesantos/design-space";
import { docTypeName, linkKey, reconcile, type DocsState, type Link, type LinkStatus, type Operator, type ProfDoc, type Professional, type Unit } from "./model.js";

export const OPERATOR: Operator = {
  id: "op1",
  name: "Unimed",
  ans: "339679",
  type: "Plano de saúde",
  active: true,
  services: 3,
  patients: 3,
  guides: 3,
};

/** O que a Unimed exige para credenciar um profissional. */
export const REQUIRED = ["diploma", "council", "id", "cv"];

export const PROFESSIONALS: Professional[] = [
  { id: "p1", name: "Helena Martins Costa", active: true, specialty: "Psicologia", council: "06233962", units: ["Unidade Teste"], graduation: "12/2013", abaHours: 320, badges: ["Integração Sensorial", "PECS", "Denver"] },
  { id: "p2", name: "Tânia Abreu Pinho", active: true, specialty: "Psicologia", council: "06113517", units: ["Santana"], graduation: "07/2009", abaHours: 480, badges: ["Supervisão BCaBA", "PECS"] },
  { id: "p3", name: "Mariana Palmeira Stein", active: true, specialty: "Terapia Ocupacional", council: "25044", units: ["Unidade Teste", "Santana"], graduation: "12/2016", abaHours: 180, badges: ["Integração Sensorial"] },
  { id: "p4", name: "Tiago Alves da Rocha", active: true, specialty: "Terapia Ocupacional", council: "25067", units: ["Santana"], graduation: "06/2019", abaHours: 120, badges: [] },
  { id: "p5", name: "Lívia Cardoso da Mata", active: true, specialty: "Psicopedagogia", council: "00015", units: ["Unidade Teste"], graduation: "12/2011", abaHours: 240, badges: ["Psicopedagogia clínica"] },
  { id: "p6", name: "Larissa Wippich Faria", active: true, specialty: "Psicologia", council: "123", units: ["Santana"], graduation: "12/2017", abaHours: 400, badges: ["Integração Sensorial", "ABLLS-R"] },
  { id: "p7", name: "Raiane Almeida Longo", active: true, specialty: "Fisioterapia", council: "448485", units: ["Unidade Teste", "Santana"], graduation: "07/2021", abaHours: 80, badges: [] },
  { id: "p8", name: "Lucinara Rodrigues Lima", active: true, specialty: "Fisioterapia", council: "239861", units: ["Santana"], graduation: "12/2012", abaHours: 200, badges: ["Bobath"] },
  { id: "p9", name: "Fábio Stoll Pereira", active: true, specialty: "Fonoaudiologia", council: "123123", units: ["Unidade Teste"], graduation: "12/2008", abaHours: 520, badges: ["Integração Sensorial", "PROMPT", "Supervisão BCBA"] },
  { id: "p10", name: "Carina Ferreira de Araújo", active: false, specialty: "Aplicador Psicologia", council: "123123", units: ["Unidade Teste"], graduation: "06/2022", abaHours: 60, badges: [] },
];

/** Formações especiais reconhecidas: o nome do documento sai daqui. */
const SPECIAL_TRAININGS = [
  { id: "is", name: "Integração Sensorial" },
  { id: "bobath", name: "Conceito Bobath" },
  { id: "pecs", name: "PECS — Comunicação por Troca de Figuras" },
  { id: "denver", name: "Modelo Denver (ESDM)" },
  { id: "prompt", name: "PROMPT" },
  { id: "ablls", name: "ABLLS-R" },
  { id: "vbmapp", name: "VB-MAPP" },
  { id: "psicoped", name: "Psicopedagogia clínica" },
  { id: "bcaba", name: "Supervisão BCaBA" },
  { id: "bcba", name: "Supervisão BCBA" },
];

/** Documentos de cada profissional: tipo, atualizado em, válido até. */
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

/** O que cada profissional já compartilhou com a Unimed. */
const SEED_SHARE: Record<string, string[]> = {
  p1: ["diploma", "council", "id", "cv"],
  p2: ["diploma", "council", "id"],
  p3: ["diploma", "council", "id", "address"],
  p5: ["diploma", "council"],
  p6: ["diploma", "council", "id", "cv"],
  p9: ["diploma", "council", "id", "cv"],
};

/** Vínculos com a Unimed: status inicial e desde quando (o status é recalculado pela documentação). */
const SEED_LINKS: Record<string, [LinkStatus, string]> = {
  p1: ["active", "12/02/2024"],
  p2: ["active", "10/03/2024"],
  p3: ["active", "25/04/2024"],
  p5: ["pending", "20/06/2026"],
  p6: ["active", "02/07/2024"],
  p9: ["active", "05/11/2024"],
};

const trainingFor = (badge: string) =>
  SPECIAL_TRAININGS.find((t) => t.name === badge) ??
  SPECIAL_TRAININGS.find((t) => badge.toLowerCase().includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(badge.toLowerCase()));

/** Os documentos de um profissional: os do cadastro, um por formação especial e o certificado do curso de ABA. */
function docsOf(prof: Professional): ProfDoc[] {
  const seed = SEED_DOCS[prof.id] ?? [];
  const docs: ProfDoc[] = seed.map(([typeId, updatedAt, validUntil], i) => ({
    id: `${prof.id}_d${i + 1}`,
    typeId,
    name: docTypeName(typeId),
    validUntil,
    file: `${typeId}-${prof.id}.pdf`,
    shared: (SEED_SHARE[prof.id] ?? []).includes(typeId) ? [{ opId: OPERATOR.id, at: updatedAt }] : [],
  }));
  prof.badges.forEach((badge, j) => {
    const t = trainingFor(badge);
    if (!t) return;
    docs.push({ id: `${prof.id}_ft${j + 1}`, typeId: "special_training", name: `Formação Especial — ${t.name}`, validUntil: null, file: `formacao-${t.id}-${prof.id}.pdf`, shared: [] });
  });
  if (prof.abaHours) {
    docs.push({ id: `${prof.id}_aba1`, typeId: "aba_course", name: `Curso de formação em ABA — ${prof.abaHours}h`, validUntil: null, file: `curso-aba-${prof.id}.pdf`, shared: [] });
  }
  return docs;
}

export const UNITS: Unit[] = [
  {
    id: "u1",
    name: "Unidade Teste",
    city: "São Paulo",
    documents: [
      { id: "d1", name: "Alvará de Funcionamento", validFrom: "01/01/2026", validUntil: "31/12/2026", attachment: "alvara-2026.pdf", shared: ["op1", "op2"] },
      { id: "d2", name: "AVCB — Bombeiros", validFrom: "01/06/2025", validUntil: "20/07/2028", attachment: "avcb.pdf", shared: ["op1"] },
      { id: "d3", name: "Licença Sanitária", validFrom: "01/03/2025", validUntil: "28/02/2027", attachment: "vigilancia-sanitaria.pdf", shared: ["op1"] },
      { id: "d4", name: "Contrato Social", validFrom: "01/01/2020", validUntil: null, attachment: "contrato-social.pdf", shared: [] },
      { id: "d1a", name: "CLI — Certificado de Licenciamento Integrado", validFrom: "15/01/2026", validUntil: "14/01/2027", attachment: "cli-2026.pdf", shared: ["op1"] },
      { id: "d1b", name: "CNES — Cadastro Nacional de Estabelecimentos de Saúde", validFrom: "10/02/2024", validUntil: null, attachment: "cnes-9638527.pdf", shared: ["op1"] },
      { id: "d1c", name: "Registro no CRP", validFrom: "01/02/2026", validUntil: "31/01/2027", attachment: "crp-pj.pdf", shared: ["op1"] },
      { id: "d1d", name: "Registro no CREFITO", validFrom: "01/02/2026", validUntil: "31/01/2027", attachment: "crefito-pj.pdf", shared: ["op1"] },
      { id: "d1e", name: "Registro no CREFONO", validFrom: "01/02/2026", validUntil: "31/01/2027", attachment: "crefono-pj.pdf", shared: ["op1"] },
      { id: "d1f", name: "Certificado de Dedetização", validFrom: "01/06/2026", validUntil: "30/11/2026", attachment: "dedetizacao-jun26.pdf", shared: ["op1"] },
      { id: "d1g", name: "Laudo de Potabilidade da Água", validFrom: "01/06/2026", validUntil: "30/11/2026", attachment: "potabilidade-jun26.pdf", shared: ["op1"] },
      { id: "d1h", name: "PGRSS — Plano de Gerenciamento de Resíduos", validFrom: "01/01/2026", validUntil: "31/12/2026", attachment: "pgrss-2026.pdf", shared: ["op1"] },
      { id: "d1i", name: "Contrato de Locação do Imóvel", validFrom: "01/09/2024", validUntil: "31/08/2027", attachment: "locacao-unidade-teste.pdf", shared: ["op1"] },
    ],
  },
  {
    id: "u2",
    name: "Santana",
    city: "São Paulo",
    documents: [
      { id: "d5", name: "Alvará de Funcionamento", validFrom: "01/01/2026", validUntil: "31/12/2026", attachment: "alvara-santana.pdf", shared: ["op2"] },
      { id: "d6", name: "Licença Sanitária", validFrom: "01/04/2025", validUntil: "30/09/2026", attachment: "sanitaria-santana.pdf", shared: [] },
    ],
  },
];

/** Qual parte da aba Documentos abre. */
export type DocsScope = "professionals" | "units";

export type OperatorDocsFixture = DocsState & { scope: DocsScope };

function build(scope: DocsScope): OperatorDocsFixture {
  const links: Record<string, Link> = {};
  for (const [profId, [status, since]] of Object.entries(SEED_LINKS)) {
    links[linkKey(profId, OPERATOR.id)] = { profId, opId: OPERATOR.id, status, since };
  }
  const state = reconcile({
    operator: OPERATOR,
    professionals: PROFESSIONALS,
    required: REQUIRED,
    docs: Object.fromEntries(PROFESSIONALS.map((p) => [p.id, docsOf(p)])),
    links,
    units: UNITS,
  });
  return { ...state, scope };
}

export const OPERATOR_DOCS_FIXTURES: Fixture<OperatorDocsFixture>[] = [
  {
    id: "operator-docs.professionals",
    label: "Unimed · Documentos › Profissionais",
    description:
      "Dez profissionais: seis com vínculo na Unimed (três ativos, três em credenciamento por documento faltando ou vencido) e quatro não credenciados. Duas unidades, uma credenciada.",
    data: () => build("professionals"),
  },
  {
    id: "operator-docs.units",
    label: "Unimed · Documentos › Unidades",
    description: "Os mesmos dados, com a aba Documentos aberta em Unidades: Unidade Teste credenciada, Santana sem documento compartilhado.",
    data: () => build("units"),
  },
];
