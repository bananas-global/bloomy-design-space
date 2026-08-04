import type { Fixture } from "@brucesantos/design-space";
import type {
  ImportBatch,
  ImportColumn,
  ImportField,
  ImportPreview,
  ImportRow,
  Lead,
  LeadIntegration,
  LeadStep,
  LeadsData,
} from "../contracts/index.js";

/**
 * Fixtures do CRM de leads proposto.
 *
 * Vinte e cinco famílias distribuídas pelas nove etapas, com timeline, tarefas
 * e origens que cobrem os quatro canais de captação. Nada aqui olha o relógio:
 * o `NOW` é declarado e todas as datas são escritas em relação a ele, porque o
 * semáforo de follow-up e o SLA de primeiro contato são exatamente o tipo de
 * coisa que muda sozinha entre duas execuções do teste.
 *
 * Os CPFs e telefones são sintéticos. Os nomes de criança aparecem só onde a
 * qualificação já aconteceu — antes disso, o funil não deveria saber.
 */

const NOW = "2026-07-30T09:00:00.000-03:00";

const MONTH_LENGTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  return month === 2 && isLeap(year) ? 29 : MONTH_LENGTH[month - 1]!;
}

/**
 * Data no fuso da clínica, a N dias de 30/07/2026.
 *
 * A aritmética é feita à mão, dia a dia, em vez de somar milissegundos num
 * objeto de data: o teste de contrato proíbe o construtor de `Date` dentro de
 * `src/fixtures/` sem exceção, e a exceção seria uma porta aberta para a
 * próxima fixture ler o relógio de verdade. Os deslocamentos aqui não passam de
 * dois meses, então o laço é barato.
 */
function day(offset: number, time = "09:00"): string {
  let year = 2026;
  let month = 7;
  let dayOfMonth = 30;

  for (let step = 0; step < Math.abs(offset); step += 1) {
    if (offset > 0) {
      dayOfMonth += 1;
      if (dayOfMonth > daysInMonth(year, month)) {
        dayOfMonth = 1;
        month += 1;
        if (month > 12) {
          month = 1;
          year += 1;
        }
      }
    } else {
      dayOfMonth -= 1;
      if (dayOfMonth < 1) {
        month -= 1;
        if (month < 1) {
          month = 12;
          year -= 1;
        }
        dayOfMonth = daysInMonth(year, month);
      }
    }
  }

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(dayOfMonth)}T${time}:00.000-03:00`;
}

const OWNERS = ["Camila Ribeiro", "Bruno Tavares", "Larissa Gomes", "Diego Santos"];
const OPERATORS = [
  "Unimed",
  "Bradesco Saúde",
  "SulAmérica",
  "Amil",
  "Hapvida",
  "Notre Dame",
  "Particular",
];
const UNITS = ["Vila Mariana", "Moema", "Santana", "Campinas"];

let sequence = 0;
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

function lead(overrides: Partial<Lead> & { id: string; contactName: string }): Lead {
  return {
    unitOfInterest: "Vila Mariana",
    specialties: [],
    availability: [],
    source: "outro",
    step: "new",
    consent: { given: false },
    interactions: [],
    tasks: [],
    history: [],
    ...overrides,
  };
}

/** Entrada no funil: o registro de história que o `daysInStep` lê. */
function arrived(step: LeadStep, at: string, by = "Sistema"): Lead["history"] {
  return [{ at, from: "new", to: step, by }];
}

function task(title: string, dueAt: string, assignedTo?: string, done = false): Lead["tasks"][0] {
  return { id: nextId("t"), title, dueAt, assignedTo, done };
}

/* ==================================================================== leads */

/* -------- Novo: quatro entradas, uma delas estourando o SLA de 24 h ------ */

const l1 = lead({
  id: "ld-1",
  contactName: "Fernanda Alves",
  phone: "(11) 98876-5521",
  email: "fernanda.alves@exemplo.test",
  source: "meta_ads",
  campaign: "ABA · Reconhecimento",
  utm: { source: "facebook", medium: "paid_social", campaign: "aba-reconhecimento" },
  unitOfInterest: "Vila Mariana",
  step: "new",
  consent: { given: true, at: day(0, "08:12"), channel: "Formulário Meta", basis: "consentimento" },
  history: arrived("new", day(0, "08:12")),
  interactions: [
    {
      id: nextId("i"),
      type: "automatica",
      at: day(0, "08:12"),
      by: "Sistema",
      text: 'Lead recebido via Meta Lead Ads — formulário "Fale com a clínica".',
    },
  ],
  tasks: [task("Fazer primeiro contato", day(0, "18:00"), "Camila Ribeiro")],
});

const l2 = lead({
  id: "ld-2",
  contactName: "Rafael Monteiro",
  phone: "(11) 99123-4477",
  email: "rafael.m@exemplo.test",
  source: "site",
  campaign: "Formulário do site",
  operator: "Bradesco Saúde",
  unitOfInterest: "Moema",
  owner: "Camila Ribeiro",
  step: "new",
  consent: { given: true, at: day(-1, "19:40"), channel: "Site", basis: "consentimento" },
  history: arrived("new", day(-1, "19:40")),
  interactions: [
    {
      id: nextId("i"),
      type: "automatica",
      at: day(-1, "19:40"),
      by: "Sistema",
      text: "Lead recebido pelo formulário do site, com consentimento LGPD registrado.",
    },
  ],
  tasks: [task("Ligar para apresentar a clínica", day(0, "15:00"), "Camila Ribeiro")],
});

/** Dois dias em silêncio, sem dono e sem tarefa. Vermelho por dois motivos. */
const l3 = lead({
  id: "ld-3",
  contactName: "Juliana Prado",
  phone: "(19) 98812-0033",
  source: "instagram",
  unitOfInterest: "Campinas",
  step: "new",
  history: arrived("new", day(-2, "21:15")),
  interactions: [
    {
      id: nextId("i"),
      type: "automatica",
      at: day(-2, "21:15"),
      by: "Sistema",
      text: "Mensagem direta no Instagram registrada como lead.",
    },
  ],
});

const l4 = lead({
  id: "ld-4",
  contactName: "Patrícia Nunes",
  phone: "(11) 99655-1200",
  email: "patinunes@exemplo.test",
  source: "whatsapp",
  operator: "Unimed",
  unitOfInterest: "Santana",
  owner: "Bruno Tavares",
  step: "new",
  history: arrived("new", day(0, "07:40")),
  interactions: [
    {
      id: nextId("i"),
      type: "whatsapp",
      at: day(0, "07:55"),
      by: "Bruno Tavares",
      text: "Respondi a mensagem e pedi os dados da criança.",
    },
  ],
  tasks: [task("Retomar se não responder", day(1, "10:00"), "Bruno Tavares")],
});

/* ------------------------------- Em contato ----------------------------- */

const l5 = lead({
  id: "ld-5",
  contactName: "Marina Costa",
  phone: "(11) 98701-2233",
  email: "marina.costa@exemplo.test",
  childName: "Théo",
  childAgeYears: 3,
  supportLevel: 2,
  source: "indicacao",
  campaign: "Indicado por Dra. Helena",
  operator: "SulAmérica",
  unitOfInterest: "Vila Mariana",
  owner: "Camila Ribeiro",
  step: "in_contact",
  specialties: [
    { name: "Fonoaudiologia", hoursPerWeek: 4 },
    { name: "Psicologia", hoursPerWeek: 6 },
  ],
  availability: [
    { weekday: 1, startAt: "08:00", endAt: "12:00" },
    { weekday: 3, startAt: "08:00", endAt: "12:00" },
  ],
  consent: { given: true, at: day(-2), channel: "Telefone", basis: "consentimento" },
  history: [
    { at: day(-3, "10:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-1, "10:05"), from: "new", to: "in_contact", by: "Camila Ribeiro" },
  ],
  interactions: [
    {
      id: nextId("i"),
      type: "whatsapp",
      at: day(0, "10:05"),
      by: "Camila Ribeiro",
      text: "Enviei apresentação da clínica e faixa de horas por WhatsApp.",
    },
    {
      id: nextId("i"),
      type: "nota",
      at: day(-1, "16:20"),
      by: "Camila Ribeiro",
      text: "Indicação da Dra. Helena, neuropediatra. Mãe já conhece o método.",
    },
  ],
  tasks: [task("Confirmar interesse e agendar avaliação", day(1, "11:00"), "Camila Ribeiro")],
});

/** Qualificação incompleta: sem criança, sem idade, sem nível de suporte. */
const l6 = lead({
  id: "ld-6",
  contactName: "Anderson Lima",
  phone: "(11) 99340-8890",
  source: "telefone",
  operator: "Amil",
  unitOfInterest: "Moema",
  owner: "Larissa Gomes",
  step: "in_contact",
  history: [
    { at: day(-5, "09:00"), from: "new", to: "new", by: "Larissa Gomes" },
    { at: day(-3, "14:00"), from: "new", to: "in_contact", by: "Larissa Gomes" },
  ],
  interactions: [
    {
      id: nextId("i"),
      type: "ligacao",
      at: day(-3, "14:00"),
      by: "Larissa Gomes",
      text: "Pai ligou perguntando valores. Não quis passar dados da criança ainda.",
    },
  ],
  tasks: [task("Retornar ligação", day(1, "09:30"), "Larissa Gomes")],
});

const l7 = lead({
  id: "ld-7",
  contactName: "Beatriz Rocha",
  phone: "(19) 98120-4567",
  email: "bia.rocha@exemplo.test",
  childName: "Sofia",
  childAgeYears: 5,
  supportLevel: 2,
  source: "google_ads",
  campaign: "Search · Autismo infantil",
  utm: { source: "google", medium: "cpc", campaign: "autismo-infantil-br" },
  operator: "Unimed",
  unitOfInterest: "Campinas",
  owner: "Diego Santos",
  step: "in_contact",
  history: [
    { at: day(-4, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-2, "11:00"), from: "new", to: "in_contact", by: "Diego Santos" },
  ],
  interactions: [
    {
      id: nextId("i"),
      type: "ligacao",
      at: day(-2, "11:00"),
      by: "Diego Santos",
      text: "Conversa longa. Mãe pediu para ligar de novo depois de falar com o pai.",
    },
  ],
  tasks: [task("Ligação combinada", day(2, "14:00"), "Diego Santos")],
});

/** Cinco dias sem retorno e sem tarefa aberta. */
const l8 = lead({
  id: "ld-8",
  contactName: "Carlos Eduardo Dias",
  phone: "(11) 99871-5540",
  source: "whatsapp",
  operator: "Particular",
  unitOfInterest: "Santana",
  owner: "Bruno Tavares",
  step: "in_contact",
  history: [
    { at: day(-8, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-5, "10:00"), from: "new", to: "in_contact", by: "Bruno Tavares" },
  ],
  interactions: [
    {
      id: nextId("i"),
      type: "whatsapp",
      at: day(-5, "10:00"),
      by: "Bruno Tavares",
      text: "Mandei mensagem. Duas marcações azuis, nenhuma resposta.",
    },
  ],
  tasks: [task("Tentar contato por outro canal", day(-2, "17:00"), "Bruno Tavares")],
});

/* -------------------------------- Qualificado --------------------------- */

const l9 = lead({
  id: "ld-9",
  contactName: "Vanessa Dias",
  phone: "(11) 98455-7781",
  email: "vanessa.dias@exemplo.test",
  childName: "Miguel",
  childAgeYears: 4,
  supportLevel: 2,
  source: "operadora",
  campaign: "Lista Unimed jul/26",
  operator: "Unimed",
  unitOfInterest: "Vila Mariana",
  owner: "Camila Ribeiro",
  step: "qualified",
  importBatchId: "lote-2481",
  specialties: [
    { name: "Fonoaudiologia", hoursPerWeek: 4 },
    { name: "Terapia ocupacional", hoursPerWeek: 4 },
  ],
  availability: [{ weekday: 2, startAt: "13:00", endAt: "18:00" }],
  consent: { given: true, at: day(-12), channel: "Operadora", basis: "execucao_de_contrato" },
  history: [
    { at: day(-12, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-11, "14:20"), from: "new", to: "in_contact", by: "Camila Ribeiro" },
    { at: day(-1, "09:30"), from: "in_contact", to: "qualified", by: "Camila Ribeiro" },
  ],
  interactions: [
    {
      id: nextId("i"),
      type: "importacao",
      at: day(-12, "09:00"),
      by: "Sistema",
      text: "Importado da planilha Unimed (lote 2481).",
    },
    {
      id: nextId("i"),
      type: "ligacao",
      at: day(-11, "14:20"),
      by: "Camila Ribeiro",
      text: "Falei com a mãe. Dados do Miguel confirmados, tem interesse em começar em agosto.",
    },
  ],
  tasks: [task("Oferecer três horários de avaliação", day(0, "16:00"), "Camila Ribeiro")],
});

const l10 = lead({
  id: "ld-10",
  contactName: "Rodrigo Peixoto",
  phone: "(11) 99012-3344",
  email: "rodrigo.p@exemplo.test",
  childName: "Laura",
  childAgeYears: 6,
  supportLevel: 1,
  source: "instagram",
  operator: "Bradesco Saúde",
  unitOfInterest: "Moema",
  owner: "Larissa Gomes",
  step: "qualified",
  history: [
    { at: day(-6, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-2, "15:00"), from: "in_contact", to: "qualified", by: "Larissa Gomes" },
  ],
  tasks: [task("Aguardar escolha de horário", day(0, "12:00"), "Larissa Gomes")],
});

const l11 = lead({
  id: "ld-11",
  contactName: "Tatiane Souza",
  phone: "(11) 98233-9977",
  childName: "Enzo",
  childAgeYears: 3,
  supportLevel: 3,
  source: "indicacao",
  operator: "SulAmérica",
  unitOfInterest: "Santana",
  owner: "Diego Santos",
  step: "qualified",
  history: [
    { at: day(-9, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-4, "11:00"), from: "in_contact", to: "qualified", by: "Diego Santos" },
  ],
  tasks: [task("Retomar contato para agendar", day(3, "10:00"), "Diego Santos")],
});

/* ---------------------------- Avaliação agendada ------------------------ */

const l12 = lead({
  id: "ld-12",
  contactName: "Gabriela Martins",
  phone: "(11) 99788-1123",
  email: "gabi.martins@exemplo.test",
  childName: "Heitor",
  childAgeYears: 5,
  supportLevel: 2,
  source: "site",
  operator: "Unimed",
  unitOfInterest: "Vila Mariana",
  owner: "Camila Ribeiro",
  step: "scheduled",
  specialties: [{ name: "Psicologia", hoursPerWeek: 8 }],
  availability: [{ weekday: 4, startAt: "09:00", endAt: "12:00" }],
  consent: { given: true, at: day(-7), channel: "Site", basis: "consentimento" },
  history: [
    { at: day(-7, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-4, "10:00"), from: "in_contact", to: "qualified", by: "Camila Ribeiro" },
    { at: day(0, "09:00"), from: "qualified", to: "scheduled", by: "Camila Ribeiro" },
  ],
  interactions: [
    {
      id: nextId("i"),
      type: "etapa",
      at: day(0, "09:00"),
      by: "Camila Ribeiro",
      text: "Avaliação agendada para 03/08 às 09h com a especialista.",
    },
  ],
  tasks: [task("Enviar orientações pré-avaliação", day(2, "17:00"), "Camila Ribeiro")],
});

const l13 = lead({
  id: "ld-13",
  contactName: "Felipe Araújo",
  phone: "(19) 98700-6612",
  childName: "Alice",
  childAgeYears: 4,
  supportLevel: 2,
  source: "meta_ads",
  campaign: "ABA · Conversão",
  operator: "Amil",
  unitOfInterest: "Campinas",
  owner: "Diego Santos",
  step: "scheduled",
  history: [
    { at: day(-10, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-1, "16:00"), from: "qualified", to: "scheduled", by: "Diego Santos" },
  ],
  tasks: [task("Confirmar presença na avaliação", day(1, "09:00"), "Diego Santos")],
});

const l14 = lead({
  id: "ld-14",
  contactName: "Simone Barros",
  phone: "(11) 99456-7810",
  childName: "Davi",
  childAgeYears: 7,
  supportLevel: 1,
  source: "telefone",
  operator: "Particular",
  unitOfInterest: "Moema",
  owner: "Bruno Tavares",
  step: "scheduled",
  history: [
    { at: day(-11, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-2, "14:00"), from: "qualified", to: "scheduled", by: "Bruno Tavares" },
  ],
  tasks: [task("Confirmar presença", day(0, "17:00"), "Bruno Tavares")],
});

/* ------------------------------- Em avaliação --------------------------- */

const l15 = lead({
  id: "ld-15",
  contactName: "Renata Camargo",
  phone: "(11) 98122-3390",
  email: "renata.c@exemplo.test",
  childName: "Lorena",
  childAgeYears: 3,
  supportLevel: 3,
  source: "operadora",
  campaign: "Lista Hapvida",
  operator: "Hapvida",
  unitOfInterest: "Santana",
  owner: "Larissa Gomes",
  step: "in_avaliation",
  importBatchId: "lote-2480",
  consent: { given: true, at: day(-20), channel: "Operadora", basis: "execucao_de_contrato" },
  history: [
    { at: day(-20, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-1, "10:00"), from: "scheduled", to: "in_avaliation", by: "Larissa Gomes" },
  ],
  tasks: [task("Registrar devolutiva da avaliação", day(1, "15:00"), "Larissa Gomes")],
});

const l16 = lead({
  id: "ld-16",
  contactName: "Marcelo Pinto",
  phone: "(11) 99655-2201",
  childName: "Gael",
  childAgeYears: 5,
  supportLevel: 2,
  source: "indicacao",
  operator: "Unimed",
  unitOfInterest: "Vila Mariana",
  owner: "Camila Ribeiro",
  step: "in_avaliation",
  history: [
    { at: day(-18, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-3, "10:00"), from: "scheduled", to: "in_avaliation", by: "Camila Ribeiro" },
  ],
  tasks: [task("Montar proposta pós-avaliação", day(0, "18:00"), "Camila Ribeiro")],
});

/* ----------------------------- Proposta enviada ------------------------- */

const l17 = lead({
  id: "ld-17",
  contactName: "Aline Ferreira",
  phone: "(11) 98900-4432",
  email: "aline.f@exemplo.test",
  childName: "Ísis",
  childAgeYears: 4,
  supportLevel: 2,
  source: "site",
  operator: "Bradesco Saúde",
  unitOfInterest: "Moema",
  owner: "Diego Santos",
  step: "submitted",
  specialties: [
    { name: "Psicologia", hoursPerWeek: 12 },
    { name: "Fonoaudiologia", hoursPerWeek: 8 },
  ],
  consent: { given: true, at: day(-24), channel: "Site", basis: "consentimento" },
  history: [
    { at: day(-24, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-2, "16:30"), from: "in_avaliation", to: "submitted", by: "Diego Santos" },
  ],
  interactions: [
    {
      id: nextId("i"),
      type: "proposta",
      at: day(-2, "16:30"),
      by: "Diego Santos",
      text: "Proposta de 20 h por semana enviada por e-mail.",
    },
  ],
  tasks: [task("Follow-up da proposta", day(1, "10:00"), "Diego Santos")],
});

const l18 = lead({
  id: "ld-18",
  contactName: "Thiago Ramos",
  phone: "(19) 98344-7789",
  childName: "Bento",
  childAgeYears: 6,
  supportLevel: 1,
  source: "google_ads",
  campaign: "Search · Autismo infantil",
  operator: "SulAmérica",
  unitOfInterest: "Campinas",
  owner: "Bruno Tavares",
  step: "submitted",
  history: [
    { at: day(-26, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-4, "11:00"), from: "in_avaliation", to: "submitted", by: "Bruno Tavares" },
  ],
  tasks: [task("Cobrar decisão da família", day(0, "14:00"), "Bruno Tavares")],
});

/** Seis dias sem retorno da proposta e nenhuma tarefa aberta. */
const l19 = lead({
  id: "ld-19",
  contactName: "Priscila Moraes",
  phone: "(11) 99120-8834",
  email: "pri.moraes@exemplo.test",
  childName: "Cecília",
  childAgeYears: 3,
  supportLevel: 2,
  source: "operadora",
  operator: "Amil",
  unitOfInterest: "Vila Mariana",
  owner: "Camila Ribeiro",
  step: "submitted",
  history: [
    { at: day(-30, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-6, "15:00"), from: "in_avaliation", to: "submitted", by: "Camila Ribeiro" },
  ],
  interactions: [
    {
      id: nextId("i"),
      type: "proposta",
      at: day(-6, "15:00"),
      by: "Camila Ribeiro",
      text: "Proposta enviada. Sem resposta desde então.",
    },
  ],
});

/* --------------------------- Aguardando operadora ----------------------- */

const l20 = lead({
  id: "ld-20",
  contactName: "Eduardo Nunes",
  phone: "(11) 98771-1290",
  childName: "Pedro",
  childAgeYears: 5,
  supportLevel: 2,
  source: "operadora",
  operator: "Unimed",
  unitOfInterest: "Vila Mariana",
  owner: "Larissa Gomes",
  step: "waiting_plan",
  availability: [{ weekday: 2, startAt: "14:00", endAt: "18:00" }],
  history: [
    { at: day(-35, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-3, "10:00"), from: "submitted", to: "waiting_plan", by: "Larissa Gomes" },
  ],
  tasks: [task("Cobrar autorização da Unimed", day(1, "09:00"), "Larissa Gomes")],
});

/** Autorização travada há oito dias, sem ninguém cobrando. */
const l21 = lead({
  id: "ld-21",
  contactName: "Camila Fonseca",
  phone: "(11) 99233-4567",
  email: "camila.f@exemplo.test",
  childName: "Manuela",
  childAgeYears: 4,
  supportLevel: 1,
  source: "indicacao",
  operator: "Bradesco Saúde",
  unitOfInterest: "Santana",
  owner: "Diego Santos",
  step: "waiting_plan",
  history: [
    { at: day(-40, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-8, "10:00"), from: "submitted", to: "waiting_plan", by: "Diego Santos" },
  ],
});

/* --------------------------------- Convertido --------------------------- */

const l22 = lead({
  id: "ld-22",
  contactName: "Luana Teixeira",
  phone: "(11) 98600-7712",
  email: "luana.t@exemplo.test",
  childName: "Arthur",
  childAgeYears: 4,
  supportLevel: 2,
  source: "site",
  operator: "Unimed",
  unitOfInterest: "Vila Mariana",
  owner: "Camila Ribeiro",
  step: "converted",
  convertedPatientId: "pa-1",
  specialties: [{ name: "Psicologia", hoursPerWeek: 16 }],
  availability: [{ weekday: 1, startAt: "08:00", endAt: "12:00" }],
  consent: { given: true, at: day(-45), channel: "Site", basis: "consentimento" },
  history: [
    { at: day(-45, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-1, "11:00"), from: "waiting_plan", to: "converted", by: "Camila Ribeiro" },
  ],
  interactions: [
    {
      id: nextId("i"),
      type: "etapa",
      at: day(-1, "11:00"),
      by: "Camila Ribeiro",
      text: "Efetivado como paciente. Cadastro criado a partir dos dados do lead.",
    },
  ],
});

const l23 = lead({
  id: "ld-23",
  contactName: "Fábio Cardoso",
  phone: "(11) 99455-3321",
  childName: "Helena",
  childAgeYears: 5,
  supportLevel: 2,
  source: "indicacao",
  operator: "SulAmérica",
  unitOfInterest: "Moema",
  owner: "Bruno Tavares",
  step: "converted",
  convertedPatientId: "pa-2",
  history: [
    { at: day(-52, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-4, "14:00"), from: "waiting_plan", to: "converted", by: "Bruno Tavares" },
  ],
});

/* ----------------------------------- Perdido ---------------------------- */

const l24 = lead({
  id: "ld-24",
  contactName: "Sandra Melo",
  phone: "(19) 98122-9080",
  childName: "Vitor",
  childAgeYears: 6,
  supportLevel: 1,
  source: "meta_ads",
  campaign: "ABA · Conversão",
  operator: "Particular",
  unitOfInterest: "Campinas",
  owner: "Larissa Gomes",
  step: "lost",
  lostReason: "preco",
  lostNote: "Achou o valor particular acima do que consegue no momento.",
  history: [
    { at: day(-30, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-5, "16:00"), from: "submitted", to: "lost", by: "Larissa Gomes" },
  ],
  interactions: [
    {
      id: nextId("i"),
      type: "etapa",
      at: day(-5, "16:00"),
      by: "Larissa Gomes",
      text: "Marcado como perdido: Preço — achou o particular acima do orçamento.",
    },
  ],
});

const l25 = lead({
  id: "ld-25",
  contactName: "Rogério Alves",
  phone: "(11) 99788-6650",
  source: "google_ads",
  operator: "Amil",
  unitOfInterest: "Santana",
  owner: "Diego Santos",
  step: "lost",
  lostReason: "sem_resposta",
  history: [
    { at: day(-22, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-10, "09:00"), from: "in_contact", to: "lost", by: "Diego Santos" },
  ],
});

const l26 = lead({
  id: "ld-26",
  contactName: "Débora Vasques",
  phone: "(11) 98330-1177",
  childName: "Nina",
  childAgeYears: 4,
  supportLevel: 2,
  source: "operadora",
  operator: "Notre Dame",
  unitOfInterest: "Moema",
  owner: "Camila Ribeiro",
  step: "lost",
  lostReason: "operadora_nao_atendida",
  lostNote: "Notre Dame ainda não está credenciada para ABA nesta unidade.",
  history: [
    { at: day(-16, "09:00"), from: "new", to: "new", by: "Sistema" },
    { at: day(-9, "11:00"), from: "qualified", to: "lost", by: "Camila Ribeiro" },
  ],
});

const ALL_LEADS: Lead[] = [
  l1, l2, l3, l4,
  l5, l6, l7, l8,
  l9, l10, l11,
  l12, l13, l14,
  l15, l16,
  l17, l18, l19,
  l20, l21,
  l22, l23,
  l24, l25, l26,
];

/* ============================================================ integrações */

const INTEGRATIONS: LeadIntegration[] = [
  {
    id: "form",
    name: "Formulário do site",
    kind: "endpoint",
    description: "Endpoint público com token, captura de UTMs e consentimento LGPD obrigatório.",
    active: true,
    endpoint: "https://api.bloomy.app/leads/vila-mariana",
    lastSignalAt: day(0, "07:20"),
    recentLabel: "12 leads nos últimos 7 dias",
    defaults: {
      unit: "Vila Mariana",
      source: "site",
      createTask: true,
      notify: true,
      captureUtm: true,
      requireConsent: true,
    },
  },
  {
    id: "google-ads",
    name: "Google Ads Lead Form",
    kind: "oauth",
    provider: "Google Ads",
    description: "Webhook do formulário de lead do Google Ads — não depende de revisão de app.",
    active: true,
    account: "Bloomy Clínica · 472-118-9930",
    formId: "Autismo — Search BR",
    lastSignalAt: day(0, "06:00"),
    recentLabel: "Último lead há 3 h",
    defaults: { unit: "Vila Mariana", source: "google_ads", createTask: true, notify: true },
  },
  {
    id: "meta",
    name: "Meta Lead Ads",
    kind: "oauth",
    provider: "Meta",
    description:
      "Recebe os leads do Graph API por webhook. Depende de uma permissão de leitura que a Meta revisa antes de liberar.",
    active: false,
    needsReview: true,
    recentLabel: "Conecte a conta para ativar",
    defaults: { unit: "Vila Mariana", source: "meta_ads", createTask: true, notify: true },
  },
  {
    id: "sheets",
    name: "Google Sheets (Drive)",
    kind: "sheets",
    description: "Lê as planilhas de anúncios do Drive a cada 30 minutos e importa as linhas novas.",
    active: true,
    sheetUrl: "https://docs.google.com/spreadsheets/d/1a2B…/edit",
    syncEvery: "30 min",
    lastSignalAt: day(-1, "03:00"),
    recentLabel: "Última leitura em 29/07 às 03h",
    defaults: { unit: "Vila Mariana", source: "outro", createTask: true, notify: false },
  },
];

/* ============================================================ importação */

const IMPORT_COLUMNS: ImportColumn[] = [
  { column: "Nome do responsável", sample: "Fernanda Alves", suggestion: "contactName" },
  { column: "Celular", sample: "(11) 98876-5521", suggestion: "phone" },
  { column: "E-mail", sample: "fernanda.alves@exemplo.test", suggestion: "email" },
  { column: "Beneficiário", sample: "Miguel", suggestion: "childName" },
  { column: "Plano", sample: "Unimed", suggestion: "operator" },
  { column: "Observação", sample: "Contato pela manhã", suggestion: "ignore" },
];

/**
 * Seis linhas que cobrem os três desfechos: válidas, duplicadas contra um lead,
 * duplicada contra um paciente já cadastrado, e uma com telefone impossível.
 */
const IMPORT_ROWS: ImportRow[] = [
  {
    line: 2,
    contactName: "Fernanda Alves",
    phone: "(11) 98876-5521",
    email: "fernanda.alves@exemplo.test",
    childName: "",
    operator: "Unimed",
  },
  {
    line: 3,
    contactName: "Helena Machado",
    phone: "(11) 98230-4411",
    email: "helena.machado@exemplo.test",
    childName: "Iara",
    operator: "Unimed",
  },
  {
    line: 4,
    contactName: "Larissa Prado",
    phone: "(11) 90731-1122",
    email: "larissa.prado@exemplo.test",
    childName: "Ana",
    operator: "Unimed",
  },
  {
    line: 5,
    contactName: "Otávio Ramos",
    phone: "(11) 90822-3344",
    email: "",
    childName: "",
    operator: "Amil",
  },
  {
    line: 6,
    contactName: "Bianca Teixeira",
    phone: "(11) 98600-7712",
    email: "",
    childName: "Théo",
    operator: "Unimed",
  },
  { line: 7, contactName: "", phone: "11 9999", email: "", childName: "", operator: "Amil" },
];

const SUGGESTED_MAPPING: Record<string, ImportField> = Object.fromEntries(
  IMPORT_COLUMNS.map((column) => [column.column, column.suggestion]),
);

/** Mapeamento quebrado: telefone não mapeado e duas colunas no mesmo campo. */
const BROKEN_MAPPING: Record<string, ImportField> = {
  ...SUGGESTED_MAPPING,
  Celular: "ignore",
  Observação: "contactName",
};

function preview(mapping: Record<string, ImportField>): ImportPreview {
  return {
    fileName: "leads_unimed_jul26.xlsx",
    format: "XLSX",
    sizeLabel: "48 KB",
    source: "Operadora · Unimed",
    unit: "Vila Mariana",
    columns: IMPORT_COLUMNS,
    rows: IMPORT_ROWS,
    templates: [
      { name: "Planilha Unimed", mapping: SUGGESTED_MAPPING },
      {
        name: "Export Meta",
        mapping: {
          ...SUGGESTED_MAPPING,
          Beneficiário: "ignore",
          Plano: "ignore",
        },
      },
    ],
    mapping,
  };
}

const BATCHES: ImportBatch[] = [
  {
    id: "lote-2481",
    fileName: "leads_unimed_jul26.xlsx",
    source: "Operadora · Unimed",
    unit: "Vila Mariana",
    at: day(-12, "09:00"),
    by: "Camila Ribeiro",
    created: 18,
    updated: 3,
    ignored: 2,
    errors: 1,
    tasksCreated: 18,
  },
  {
    id: "lote-2480",
    fileName: "hapvida-beneficiarios-jul26.csv",
    source: "Operadora · Hapvida",
    unit: "Santana",
    at: day(-20, "10:30"),
    by: "Larissa Gomes",
    created: 9,
    updated: 0,
    ignored: 4,
    errors: 0,
    tasksCreated: 9,
  },
];

/* ============================================================== pacientes */

/**
 * Pacientes já cadastrados, para o dedupe olhar além dos leads.
 *
 * O telefone da Luana é o mesmo da linha 6 da planilha de importação — de
 * propósito: é o caso da família que já é cliente e volta pedindo uma segunda
 * especialidade.
 */
const EXISTING_PATIENTS = [
  { id: "pa-1", name: "Arthur Teixeira", phone: "(11) 98600-7712", email: "luana.t@exemplo.test" },
  { id: "pa-2", name: "Helena Cardoso", phone: "(11) 99455-3321" },
  { id: "pa-3", name: "Iara Machado", phone: "(11) 98230-4411", email: "helena.machado@exemplo.test" },
];

/* =============================================================== fixtures */

function base(overrides: Partial<LeadsData> = {}): LeadsData {
  return {
    leads: ALL_LEADS,
    owners: OWNERS,
    operators: OPERATORS,
    units: UNITS,
    integrations: INTEGRATIONS,
    batches: BATCHES,
    existingPatients: EXISTING_PATIENTS,
    now: NOW,
    ...overrides,
  };
}

function only(...ids: string[]): Lead[] {
  return ALL_LEADS.filter((item) => ids.includes(item.id));
}

export const leadFixtures: Fixture<LeadsData>[] = [
  {
    id: "leads-funnel",
    label: "O funil de julho",
    description:
      "Vinte e seis leads nas nove etapas, quatro canais de captação e três motivos de perda diferentes.",
    data: base(),
  },
  {
    id: "leads-empty",
    label: "Nenhum lead no filtro",
    description: "Unidade recém-aberta, ou um filtro que não casa com ninguém.",
    data: base({ leads: [] }),
  },
  {
    id: "leads-without-next-action",
    label: "Leads sem próxima ação",
    description:
      "Quatro leads ativos sem tarefa aberta ou com tarefa vencida — o estado em que a maioria morre.",
    data: base({ leads: only("ld-3", "ld-8", "ld-19", "ld-21") }),
  },
  {
    id: "leads-sla-breach",
    label: "SLA de primeiro contato estourado",
    description:
      "Lead de anúncio parado em “Novo” há dois dias, sem dono, sem tarefa e sem nenhuma interação humana.",
    data: base({ leads: only("ld-3", "ld-1") }),
  },
  {
    id: "leads-needs-qualification",
    label: "Sem qualificação para agendar",
    description:
      "Pai ligou perguntando preço e não passou dados da criança. Agendar avaliação fica bloqueado.",
    data: base({ leads: only("ld-6") }),
  },
  {
    id: "leads-profile",
    label: "Perfil de um lead qualificado",
    description:
      "Importado da planilha da Unimed, qualificado por telefone, com timeline e tarefa aberta.",
    data: base({ leads: only("ld-9") }),
  },
  {
    id: "leads-converted",
    label: "Lead convertido em paciente",
    description: "Terminal, com o vínculo para o cadastro do paciente que ele originou.",
    data: base({ leads: only("ld-22") }),
  },
  {
    id: "leads-lost",
    label: "Lead perdido por operadora não atendida",
    description:
      "Saiu na qualificação. Reabrir é permitido e devolve para “Em contato”, com registro.",
    data: base({ leads: only("ld-26") }),
  },
  {
    id: "leads-duplicate-lead",
    label: "Duplicado contra outro lead",
    description: "O telefone digitado já pertence a um lead que está em “Novo”.",
    data: base({
      leads: only("ld-1", "ld-2"),
      newLeadDraft: { contactName: "Fernanda A.", phone: "(11) 98876-5521" },
    }),
  },
  {
    id: "leads-duplicate-patient",
    label: "Duplicado contra um paciente",
    description:
      "A família já é cliente e voltou pedindo uma segunda especialidade. Não é lead novo.",
    data: base({
      leads: only("ld-2"),
      newLeadDraft: { contactName: "Luana Teixeira", phone: "(11) 98600-7712" },
    }),
  },
  {
    id: "leads-import",
    label: "Planilha da operadora, mapeamento sugerido",
    description: "Seis linhas: três válidas, duas duplicadas e uma com telefone impossível.",
    data: base({ importPreview: preview(SUGGESTED_MAPPING) }),
  },
  {
    id: "leads-import-invalid-mapping",
    label: "Mapeamento inválido",
    description:
      "Telefone não mapeado e duas colunas apontando para o nome do responsável. Avançar fica bloqueado.",
    data: base({ importPreview: preview(BROKEN_MAPPING) }),
  },
  {
    id: "leads-integrations",
    label: "Quatro canais de captação",
    description:
      "Site ativo, Google Ads ativo, Meta aguardando revisão do app e a planilha do Drive muda desde ontem.",
    data: base(),
  },
  {
    id: "leads-tasks",
    label: "As tarefas de hoje da Camila",
    description: "Atrasadas, de hoje e próximas, com o lead ao lado de cada uma.",
    data: base(),
  },
];
