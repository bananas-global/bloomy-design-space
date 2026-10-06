/**
 * CRM de Leads — dados sintéticos. Nomes, telefones e documentos são
 * fictícios. As datas são relativas ao TODAY do ambiente, para o funil ficar
 * sempre coerente (follow-up atrasado, para hoje, SLA estourado…).
 */
import type { Fixture } from "@brucesantos/design-space";
import { autoRoute, blankLead, dOff, type Lead, type StageId } from "./model.js";

/** Efetivados no mês, para a coluna Efetivado e o toast. */
export const CONVERTED_THIS_MONTH = 4;

type Seed = Partial<Lead> & { id: string; child: string; guardian: string; phone: string };

function lead({ guardian, phone, ...seed }: Seed): Lead {
  const base = blankLead(seed.id);
  const l: Lead = {
    ...base,
    specialties: [],
    ...seed,
    // Sem disponibilidade informada, o painel abre com um período padrão (segunda, das 8h às 12h).
    availability: seed.availability?.length ? seed.availability : base.availability,
    guardians: seed.guardians ?? [{ id: "g1", name: guardian, relation: "Mãe", phone, email: "" }],
    report: { ...base.report, ...seed.report },
    auth: { ...base.auth, ...seed.auth },
  };
  return autoRoute(l);
}

const BASE: Seed[] = [
  {
    id: "ld1", child: "Theo Rocha", age: 4, guardian: "Camila Rocha", phone: "(11) 98765-4321", status: "avaliacao", origin: "Instagram", support: "Nível 2",
    owner: "Ana Beatriz", nextFollowUp: dOff(1), stageSince: dOff(-6), updatedAt: dOff(-2), operator: "Porto Saúde", cardNumber: "4410 2231 0098", prefUnit: "Santana",
    guardians: [{ id: "g1", name: "Camila Rocha", relation: "Mãe", phone: "(11) 98765-4321", email: "camila.rocha@email.com" }],
    notes: "Mãe relatou atraso de fala.", availability: [{ day: "Segunda-Feira", from: "08:00", to: "12:00" }],
    specialties: [{ spec: "Fonoaudiologia", hours: 8 }, { spec: "Psicologia", hours: 4 }], cidMain: ["F84.0 - Autismo Infantil"], priorTherapy: "Sim",
    behaviors: { autoagressao: true, estereotipias: true }, comm: { semi_vocal: true }, sensory: { alimentar: true }, reinforcers: ["Bola", "Bexiga"],
    timeline: [
      { id: "s1b", kind: "contact", channel: "whatsapp", label: "WhatsApp", text: "Enviado resumo da avaliação inicial.", at: dOff(-2), by: "Ana Beatriz" },
      { id: "s1a", kind: "contact", channel: "visita", label: "Visita", text: "Família veio conhecer a unidade, gostou da estrutura.", at: dOff(-6), by: "Ana Beatriz" },
    ],
  },
  { id: "ld2", child: "Sofia Mendes", age: 3, guardian: "Rafael Mendes", phone: "(11) 99111-2233", status: "novo", origin: "Indicação", support: "A definir", owner: "Carla Nunes", nextFollowUp: dOff(0), stageSince: dOff(-1), updatedAt: dOff(-1), schoolShift: "Tarde" },
  {
    id: "ld3", child: "Davi Lima", age: 5, guardian: "Patrícia Lima", phone: "(11) 98123-5567", status: "proposta", origin: "Google", support: "Nível 1",
    owner: "Ana Beatriz", nextFollowUp: dOff(-3), stageSince: dOff(-11), updatedAt: dOff(-9), notes: "Proposta enviada por e-mail.",
    specialties: [{ spec: "Psicologia", hours: 16 }], cidMain: ["F90.0 - TDAH"], behaviors: { fuga: true }, comm: { vocal_funcional: true }, reinforcers: ["Tablet"],
    operator: "Omint", cardNumber: "0012 5567 8890", cardFile: "carteirinha-davi.pdf", prefUnit: "Santana",
    medicalDocs: [{ id: "lm8", specialty: "Psiquiatra Infantil", doctor: "Dr. Marcos Adami", crm: "CRM-SP 92.117", issuedAt: dOff(-45), expiresAt: dOff(135), mandatory: true, hoursMode: "weekly", hours: "16", file: "relatorio-davi.pdf" }],
    visits: [{ id: "v31", date: dOff(-12), time: "09:00", unit: "Santana", coord: "Renata Alves", scheduledBy: "Ana Beatriz" }],
    report: { happened: "sim", who: ["Mãe", "A criança"], presented: ["Metodologia e plano de terapia", "Equipe e especialidades", "Espaço e rotina da unidade"], objections: ["Carga horária alta"], outcome: "decidida", noteForSales: "Mãe consegue acompanhar dois dias por semana.", sentAt: dOff(-11) },
    auth: { sentAt: dOff(-9), protocol: "PS-2026-448192", returnAt: "", result: "", note: "", authorized: {} },
    timeline: [{ id: "s3a", kind: "contact", channel: "email", label: "E-mail", text: "Proposta de 16h semanais enviada.", at: dOff(-9), by: "Ana Beatriz" }],
  },
  {
    id: "ld4", child: "Beatriz Faria", age: 6, guardian: "Eduardo Faria", phone: "(11) 97444-1212", status: "aguardando", origin: "Site", support: "Nível 2",
    owner: "Rodrigo Alves", nextFollowUp: dOff(4), stageSince: dOff(-14), updatedAt: dOff(-5), schoolShift: "Integral", notes: "Aguardando autorização do plano.",
    guardians: [{ id: "g1", name: "Eduardo Faria", relation: "Pai", phone: "(11) 97444-1212", email: "" }],
    specialties: [{ spec: "Terapia Ocupacional", hours: 10 }], cidMain: ["F84.1 - Autismo Atípico"], priorTherapy: "Sim", sensory: { tatil: true },
    operator: "Care Plus", cardNumber: "5544 0091 2210", cardFile: "carteirinha-beatriz.jpg", prefUnit: "Unidade Teste",
    medicalDocs: [{ id: "lm7", specialty: "Neuropediatra", doctor: "Dra. Renata Salgado", crm: "CRM-SP 118.402", issuedAt: dOff(-60), expiresAt: dOff(120), mandatory: true, hoursMode: "weekly", hours: "10", file: "laudo-beatriz.pdf" }],
    visits: [{ id: "v41", date: dOff(-25), time: "15:00", unit: "Unidade Teste", coord: "Gustavo Pires", scheduledBy: "Rodrigo Alves" }],
    report: { happened: "sim", who: ["Pai"], presented: ["Metodologia e plano de terapia", "Cobertura do convênio"], objections: [], outcome: "decidida", noteForSales: "", sentAt: dOff(-24) },
    auth: { sentAt: dOff(-20), protocol: "CP-88120-2", returnAt: dOff(-2), result: "integral", note: "Guia 55120", authorized: { 0: "10" } },
    timeline: [{ id: "s4a", kind: "contact", channel: "ligacao", label: "Ligação", text: "Plano pediu relatório complementar; prazo de 10 dias.", at: dOff(-5), by: "Rodrigo Alves" }],
  },
  {
    id: "ld5", child: "Miguel Costa", age: 4, guardian: "Juliana Costa", phone: "(11) 96320-1145", status: "agendada", origin: "Indicação", support: "Nível 3",
    owner: "Carla Nunes", nextFollowUp: dOff(2), stageSince: dOff(-3), updatedAt: dOff(-3), notes: "Mãe trabalha até as 15h. Prefere manhãs.",
    specialties: [{ spec: "Fonoaudiologia", hours: 10 }, { spec: "Análise do Comportamento", hours: 10 }], cidMain: ["F84.0 - Autismo Infantil"],
    behaviors: { heteroagressao: true }, comm: { nao_vocal: true }, sensory: { auditiva: true }, reinforcers: ["Música"],
    operator: "Bradesco", cardNumber: "7788 1200 4431", cardFile: "carteirinha-miguel.jpg", prefUnit: "Zona Leste",
    medicalDocs: [{ id: "lm9", specialty: "Neuropediatra", doctor: "Dra. Renata Salgado", crm: "CRM-SP 118.402", issuedAt: dOff(-30), expiresAt: dOff(150), mandatory: true, hoursMode: "weekly", hours: "20", file: "laudo-miguel.pdf" }],
    availability: [{ day: "Terça-Feira", from: "08:00", to: "12:00" }, { day: "Quinta-Feira", from: "08:00", to: "12:00" }],
    visits: [
      { id: "v51", date: dOff(-4), time: "14:00", unit: "Zona Leste", coord: "Camila Duarte", scheduledBy: "Carla Nunes" },
      { id: "v52", date: dOff(1), time: "10:00", unit: "Zona Leste", coord: "Camila Duarte", scheduledBy: "Carla Nunes" },
    ],
    timeline: [{ id: "s5a", kind: "contact", channel: "whatsapp", label: "WhatsApp", text: "Avaliação confirmada para a próxima semana.", at: dOff(-3), by: "Carla Nunes" }],
  },
  {
    id: "ld6", child: "Laura Araújo", age: 5, guardian: "Felipe Araújo", phone: "(11) 98477-6610", status: "perdido", origin: "Instagram", support: "Nível 1",
    owner: "Rodrigo Alves", nextFollowUp: "", stageSince: dOff(-20), updatedAt: dOff(-20), schoolShift: "Tarde", notes: "Família optou por outra clínica.", lostReason: "Escolheu outra clínica",
    timeline: [{ id: "s6a", kind: "lost", text: "Lead perdido — Escolheu outra clínica", at: dOff(-20), by: "Rodrigo Alves" }],
  },
  {
    id: "ld8", child: "Lucas Tavares", age: 7, guardian: "Paula Tavares", phone: "(11) 97120-4455", status: "novo", origin: "Instagram", support: "A definir",
    owner: "Ana Beatriz", stageSince: dOff(-2), updatedAt: dOff(-2), schoolShift: "Tarde", operator: "Amil", specialties: [{ spec: "Psicologia", hours: 6 }],
  },
  {
    id: "ld7", child: "Enzo Souza", age: 3, guardian: "Marina Souza", phone: "(11) 98855-3300", status: "contato", origin: "WhatsApp", support: "Nível 2",
    owner: "Carla Nunes", nextFollowUp: dOff(-1), stageSince: dOff(-2), updatedAt: dOff(-2), notes: "Primeiro contato realizado.", specialties: [{ spec: "Fonoaudiologia", hours: 8 }],
    timeline: [{ id: "s7a", kind: "contact", channel: "whatsapp", label: "WhatsApp", text: "Primeiro contato; aguardando retorno para agendar visita.", at: dOff(-2), by: "Carla Nunes" }],
  },
];

/** Leads extras para popular o funil: [id, criança, idade, responsável, etapa, origem, plano, comercial, follow-up, dias na etapa, especialidade, horas, suporte]. */
const EXTRA: [string, string, number, string, StageId, string, string, string, number | null, number, string, number, string][] = [
  ["ld9", "Helena Prado", 4, "Bruna Prado", "novo", "Instagram", "Bradesco", "Ana Beatriz", 0, -1, "Fonoaudiologia", 6, "A definir"],
  ["ld10", "Arthur Nogueira", 5, "Diego Nogueira", "novo", "Google", "Alice", "Carla Nunes", 1, -2, "Psicologia", 8, "A definir"],
  ["ld11", "Valentina Reis", 3, "Larissa Reis", "novo", "Site", "", "Rodrigo Alves", -1, -3, "", 0, "A definir"],
  ["ld12", "Gael Martins", 6, "Tatiane Martins", "contato", "Indicação", "Porto Saúde", "Ana Beatriz", 2, -4, "Terapia Ocupacional", 8, "Nível 1"],
  ["ld13", "Alice Campos", 4, "Renato Campos", "contato", "WhatsApp", "Omint", "Rodrigo Alves", 0, -5, "Fonoaudiologia", 10, "Nível 2"],
  ["ld14", "Bernardo Pires", 8, "Fernanda Pires", "contato", "Instagram", "Unimed Campinas", "Carla Nunes", -2, -7, "Psicopedagogia", 4, "Nível 1"],
  ["ld15", "Manuela Dias", 5, "Thiago Dias", "agendada", "Google", "Care Plus", "Ana Beatriz", 3, -2, "Análise do Comportamento", 15, "Nível 2"],
  ["ld16", "Pedro Henrique Lopes", 7, "Aline Lopes", "agendada", "Indicação", "Medservice", "Rodrigo Alves", 1, -4, "Psicologia", 10, "Nível 1"],
  ["ld17", "Lívia Barros", 3, "Gabriel Barros", "avaliacao", "Site", "Bradesco", "Carla Nunes", 2, -5, "Fonoaudiologia", 12, "Nível 3"],
  ["ld18", "Samuel Rezende", 6, "Priscila Rezende", "avaliacao", "Instagram", "Unimed Seguros", "Rodrigo Alves", -1, -8, "Terapia Ocupacional", 10, "Nível 2"],
  ["ld19", "Isis Moura", 4, "Leandro Moura", "proposta", "Indicação", "Porto Saúde", "Ana Beatriz", 1, -9, "Análise do Comportamento", 20, "Nível 3"],
  ["ld20", "Benício Freitas", 5, "Carolina Freitas", "proposta", "WhatsApp", "Alice", "Carla Nunes", -2, -12, "Fonoaudiologia", 8, "Nível 1"],
  ["ld21", "Cecília Monteiro", 7, "André Monteiro", "aguardando", "Google", "Omint", "Rodrigo Alves", 5, -15, "Psicologia", 12, "Nível 2"],
  ["ld22", "Joaquim Teixeira", 4, "Vanessa Teixeira", "aguardando", "Site", "Bradesco", "Ana Beatriz", 2, -10, "Análise do Comportamento", 16, "Nível 3"],
  ["ld23", "Antonella Ribeiro", 9, "Marcelo Ribeiro", "perdido", "Instagram", "Care Plus", "Carla Nunes", null, -18, "", 0, "Nível 1"],
];

const EXTRA_SEEDS: Seed[] = EXTRA.map(([id, child, age, guardian, status, origin, operator, owner, fu, st, spec, hours, support]) => {
  const n = Number(id.slice(2));
  return {
    id, child, age, guardian, status, origin, operator, owner, support,
    phone: `(11) 9${8000 + n * 37}-${1000 + n * 211}`,
    nextFollowUp: fu === null ? "" : dOff(fu), stageSince: dOff(st), updatedAt: dOff(Math.min(-1, st + 1)),
    specialties: spec ? [{ spec, hours }] : [],
    ...(status === "perdido" ? { lostReason: "Sem retorno da família" } : {}),
  };
});

export const LEADS: Lead[] = [...BASE, ...EXTRA_SEEDS].map(lead);

export type LeadsFixture = { leads: Lead[] };

/** Ordem do `updated_at` desc, como o `default_order` do `Prospect`. */
const byUpdated = (a: Lead, b: Lead) => b.updatedAt.localeCompare(a.updatedAt);

export const LEADS_FIXTURES: Fixture[] = [
  {
    id: "crm.leads",
    label: "Leads em todas as etapas",
    description: "23 leads sintéticos espalhados pelo funil, com follow-up atrasado, para hoje e sem follow-up; um desqualificado automaticamente (plano Amil, fora da rede).",
    data: (): LeadsFixture => ({ leads: [...LEADS].sort(byUpdated) }),
  },
  {
    id: "crm.empty",
    label: "Sem leads",
    description: "A clínica ainda não cadastrou nenhum lead.",
    data: (): LeadsFixture => ({ leads: [] }),
  },
];
