/**
 * Contratos do domínio Bloomy.
 *
 * Modelados a partir do fluxo, da regra e do exemplo — não derivados de uma API.
 * O Bloomy é um monólito Phoenix que renderiza páginas e executa regras
 * internamente, sem expor REST ou GraphQL público, então não existe OpenAPI para
 * gerar tipos. Isso não impede o Design Space: o que se modela aqui é o contrato
 * orientado ao design, e a engenharia reconcilia com o que o monólito já faz.
 */

/* ================================================================== *
 * Comum
 * ================================================================== */

export type PatientRef = {
  id: string;
  name: string;
  /** ISO `YYYY-MM-DD`. Determinístico: nunca calculado a partir de hoje. */
  birthDate: string;
};

export type Professional = {
  id: string;
  name: string;
  specialty: string;
};

export type Unit = {
  id: string;
  name: string;
};

/** Data de referência do ambiente. Fixture não olha o relógio (§15.1). */
export const TODAY = "2026-07-30";

/* ================================================================== *
 * Agenda
 * ================================================================== */

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_session"
  | "finished"
  | "cancelled"
  | "no_show";

export type Appointment = {
  id: string;
  patient: PatientRef;
  professional: Professional;
  procedure: string;
  /** ISO completo. */
  start: string;
  end: string;
  status: AppointmentStatus;
  room?: string;
  insurance?: { name: string; authorized: boolean };
  /** Preenchido quando `status` é `cancelled`. */
  cancellation?: { reason: string; by: string; at: string };
  /**
   * Ids de atendimentos que ocupam o mesmo intervalo do mesmo profissional.
   * Conflito é propriedade da agenda, não do atendimento isolado — mas guardar
   * aqui é o que permite a tela destacar a linha certa sem recalcular.
   */
  conflictsWith?: string[];
};

export type AgendaData = {
  date: string;
  /**
   * Instante de referência da fixture.
   *
   * Existe para que a regra de tolerância de ausência seja verificável: sem um
   * "agora" declarado, o cenário "paciente ausente" dependeria do relógio de quem
   * abre o link e deixaria de ser reproduzível depois do almoço.
   */
  now: string;
  unit: Unit;
  professional: Professional;
  appointments: Appointment[];
};

/* ================================================================== *
 * Pacientes
 * ================================================================== */

export type Guardian = {
  name: string;
  /** Relação com o paciente: "mãe", "pai", "responsável legal". */
  relation: string;
  cpf: string;
  phone: string;
};

export type Patient = PatientRef & {
  cpf?: string;
  phone?: string;
  email?: string;
  insurance?: { name: string; plan: string; cardNumber: string };
  guardian?: Guardian;
  /**
   * Campos obrigatórios ainda não preenchidos, no vocabulário do produto.
   * Lista vazia significa cadastro completo — a tela não precisa de um segundo
   * booleano que possa divergir desta lista.
   */
  missingFields: string[];
  /**
   * Prontuário com restrição de acesso. Existe por decisão clínica ou por
   * pedido do paciente, e não é o mesmo que "cadastro incompleto".
   */
  recordRestricted: boolean;
  restrictionNote?: string;
};

export type PatientsData = {
  patients: Patient[];
};

/* ================================================================== *
 * Financeiro
 * ================================================================== */

export type ClaimStatus = "under_review" | "denied" | "pending_documents" | "approved" | "resubmitted";

export type RequiredDocument = {
  id: string;
  name: string;
  received: boolean;
  /** Quando recusado por documento, o convênio costuma dizer o que falta. */
  note?: string;
};

export type ClaimEvent = {
  at: string;
  label: string;
  /** `insurer` quando o evento vem do convênio, `clinic` quando vem da clínica. */
  by: "insurer" | "clinic";
};

export type Claim = {
  id: string;
  patient: PatientRef;
  procedure: string;
  amountCents: number;
  insurer: string;
  status: ClaimStatus;
  submittedAt: string;
  /** Preenchido quando `status` é `denied`. */
  denial?: { code: string; reason: string; at: string };
  documents: RequiredDocument[];
  history: ClaimEvent[];
};

export type FinanceData = {
  claims: Claim[];
};

/* ================================================================== *
 * Formatação
 * ================================================================== */

export function formatMoney(amountCents: number, locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(
    amountCents / 100,
  );
}

export function formatTime(iso: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
    parseDate(iso),
  );
}

/**
 * Interpreta uma string de data.
 *
 * `new Date("2011-09-08")` é parseado como meia-noite **UTC** e, formatado em
 * qualquer fuso a oeste de Greenwich, exibe o dia anterior. É por isso que uma
 * data de nascimento aparecia com um dia de atraso no Brasil. Data sem horário
 * não tem fuso: precisa ser lida como local.
 */
function parseDate(iso: string): Date {
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
}

export function formatDate(iso: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseDate(iso));
}

export function formatDateTime(iso: string, locale = "pt-BR"): string {
  return `${formatDate(iso, locale)} às ${formatTime(iso, locale)}`;
}

/**
 * Idade em anos completos, medida contra {@link TODAY} e não contra o relógio.
 *
 * Usar `new Date()` aqui quebraria o determinismo de um jeito especialmente
 * traiçoeiro: o cenário "menor sem responsável" deixaria de existir no
 * aniversário de 18 anos da fixture, meses depois de alguém tê-lo aprovado.
 */
export function ageInYears(birthDate: string, reference = TODAY): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ry, rm, rd] = reference.split("-").map(Number);
  let age = ry! - by!;
  if (rm! < bm! || (rm === bm && rd! < bd!)) age -= 1;
  return age;
}

export function isMinor(patient: PatientRef, reference = TODAY): boolean {
  return ageInYears(patient.birthDate, reference) < 18;
}
