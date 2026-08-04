import type { Rule } from "@brucesantos/design-space";
import type {
  ImportColumn,
  ImportField,
  ImportRow,
  Lead,
  LeadIntegration,
  LeadSource,
  LeadStep,
  LeadTask,
  LeadsData,
  LostReason,
} from "../contracts/index.js";

/**
 * Regras do CRM de leads **proposto**.
 *
 * Nada aqui existe no monólito: é a extensão de `Bloomy.Prospects` desenhada
 * para cobrir a jornada inteira, do anúncio à conversão, e aposentar o CRM
 * externo e as planilhas do Drive. Os cenários que as exercitam estão marcados
 * como `proposed` de propósito — o resto do repositório descreve o sistema que
 * roda hoje, e misturar as duas coisas sem marca tornaria a especificação
 * impossível de conferir contra a realidade.
 *
 * As regras do funil que **existe** continuam em `src/rules/prospects.ts`, e
 * duas delas são exatamente o que esta proposta ataca: a conversão que pede o
 * que a visita não coleta, e a disponibilidade que ninguém anota.
 */
export const leadRules: Rule[] = [
  {
    id: "a-lead-costs-a-name-and-one-way-to-reach-back",
    statement:
      "Criar um lead exige o nome do contato e telefone **ou** e-mail. Nada mais. Os dados da criança, da operadora e da disponibilidade passam a ser exigidos por etapa do funil, não na criação.",
    rationale:
      "Hoje o formulário pede a criança inteira antes de deixar registrar quem ligou, e o resultado é que a recepção não registra: anota num papel, e o lead vira uma linha em planilha que ninguém revisita. Um formulário de quinze segundos é a diferença entre ter o funil e não ter.",
    source: "src/rules/leads.ts",
  },
  {
    id: "qualification-is-what-scheduling-an-evaluation-costs",
    statement:
      "Avançar para “Avaliação agendada” ou além exige nome da criança, idade, operadora e nível de suporte. Antes disso, o lead pode circular incompleto.",
    rationale:
      "A avaliação é a primeira coisa cara do funil: ocupa sala, especialista e uma hora de agenda. Marcar sem saber a operadora produz avaliação que a família não consegue pagar e horário que ninguém mais usou.",
    source: "src/rules/leads.ts",
  },
  {
    id: "lost-requires-a-reason-or-the-funnel-teaches-nothing",
    statement:
      "Marcar Perdido exige um dos nove motivos. O motivo fica junto da etapa de onde o lead saiu.",
    rationale:
      "“Perdemos 40% dos leads” não decide nada; “perdemos 40% por operadora não atendida, todos na qualificação” decide contratar credenciamento em vez de mais anúncio. Motivo sem etapa também não decide: perder por preço na proposta é problema de tabela, perder por preço no primeiro contato é problema de anúncio.",
    source: "src/rules/leads.ts",
  },
  {
    id: "a-lost-lead-reopens-a-converted-one-does-not",
    statement:
      "Reabrir um lead perdido é permitido e o devolve para “Em contato”, com registro. Reabrir um convertido, não: quem virou paciente sai do funil pela porta do cadastro.",
    rationale:
      "Família que sumiu em março e volta em julho é o mesmo lead, e ligá-los é o que mostra que a segunda tentativa converte. Já reabrir um convertido criaria duas verdades sobre a mesma criança — uma no funil, outra no cadastro de pacientes — e a segunda é a que a clínica cobra.",
    source: "src/rules/leads.ts",
  },
  {
    id: "converting-writes-the-link-back-to-the-lead",
    statement:
      "Converter só acontece pelo fluxo de efetivar paciente, e grava no paciente de qual lead ele veio.",
    rationale:
      "Sem esse vínculo não existe a única métrica que justifica o CRM: quanto custou o paciente que entrou. Origem sem paciente é vaidade; paciente sem origem é sorte.",
    source: "src/rules/leads.ts",
  },
  {
    id: "every-active-lead-owes-a-next-action",
    statement:
      "Lead ativo sem tarefa futura é vermelho, igual a lead com tarefa atrasada. Tarefa para hoje é amarelo; tarefa em aberto no futuro é verde.",
    rationale:
      "A ausência de próxima ação é indistinguível de “está tudo bem” em qualquer lista, e é o estado em que a maioria dos leads morre. Pintar o vazio da mesma cor do atraso é o que faz alguém abrir o card.",
    source: "src/rules/leads.ts",
  },
  {
    id: "first-contact-has-twenty-four-hours",
    statement:
      "Lead na etapa “Novo” sem nenhuma interação registrada há mais de 24 horas viola o SLA de primeiro contato e aparece destacado, independentemente de ter tarefa.",
    rationale:
      "Quem preencheu um formulário de anúncio preencheu o de três concorrentes na mesma tarde. O custo do lead já foi pago quando ele chegou; perdê-lo por um dia de silêncio é jogar fora dinheiro que já saiu do caixa.",
    source: "src/rules/leads.ts",
  },
  {
    id: "dedupe-checks-patients-not-only-leads",
    statement:
      "A checagem de duplicidade normaliza telefone (só dígitos) e e-mail (minúsculas) e procura entre os leads **e** entre os pacientes já cadastrados.",
    rationale:
      "Família que já é cliente e pede uma segunda especialidade cai no formulário do site como lead novo. Tratada como lead, ela entra num funil de captação que vai apresentar a clínica para quem já frequenta — e o comercial descobre isso na ligação.",
    source: "src/rules/leads.ts",
  },
  {
    id: "the-column-mapping-is-made-once-per-operator",
    statement:
      "O mapeamento de colunas só é válido quando os campos obrigatórios (nome do contato e telefone) estão mapeados e nenhum campo do lead recebe duas colunas. Um mapeamento válido pode ser salvo como template e reaplicado.",
    rationale:
      "Cada operadora manda um cabeçalho diferente e manda a planilha todo mês. Sem template, a importação é um trabalho manual recorrente — que é exatamente o trabalho que ela deveria eliminar.",
    source: "src/rules/leads.ts",
  },
  {
    id: "the-import-decides-row-by-row",
    statement:
      "Cada linha da planilha é classificada em válida, duplicada ou com erro. Válida pode criar ou ignorar; duplicada pode atualizar, criar mesmo assim ou ignorar; com erro só pode ignorar. A decisão padrão é atualizar o duplicado e ignorar o erro.",
    rationale:
      "Importação tudo-ou-nada por causa de uma linha sem telefone é o motivo pelo qual as planilhas continuam nas planilhas. E deixar uma linha com erro entrar seria criar um lead que ninguém consegue contatar, ocupando lugar no funil.",
    source: "src/rules/leads.ts",
  },
  {
    id: "an-active-integration-that-went-quiet-is-a-broken-integration",
    statement:
      "Integração ligada que não recebe nada há mais horas do que o seu intervalo esperado é mostrada como erro, não como ativa.",
    rationale:
      "Webhook quebrado não dá erro: dá silêncio. E silêncio, num painel, se parece com um dia fraco de anúncio — a clínica descobre semanas depois, quando alguém estranha o funil vazio.",
    source: "src/rules/leads.ts",
  },
  {
    id: "the-funnel-counts-who-reached-the-step-not-who-is-parked-there",
    statement:
      "A taxa de conversão entre etapas compara quem **alcançou** cada etapa, não quem está nela agora. Quem está em “Proposta enviada” também alcançou “Qualificado”.",
    rationale:
      "Contar ocupação atual faz o funil parecer que despenca em toda etapa que a equipe esvazia rápido — e a etapa mais eficiente vira a que mais parece vazar. É a leitura que manda consertar exatamente o que está funcionando.",
    source: "src/rules/leads.ts",
  },
  {
    id: "scheduled-means-two-places-in-the-funnel",
    statement:
      "A chave `scheduled` vale “primeira sessão marcada”, depois de `waiting_plan`, no funil que roda hoje; e “avaliação agendada”, antes de `in_avaliation`, no funil proposto. A migração do enum precisa reposicionar os registros existentes, não só renomeá-los.",
    rationale:
      "Um `UPDATE` de rótulo deixaria todo o histórico de passos com a etapa certa no lugar errado do funil, e a primeira leitura do novo painel mostraria uma conversão para avaliação que nunca aconteceu. O erro é silencioso e só aparece nos números.",
    source: "src/rules/leads.ts",
  },
];

/* ================================================================== funil */

/** A linha principal do funil proposto. `lost` é saída lateral, como hoje. */
export const LEAD_FUNNEL_LINE: LeadStep[] = [
  "new",
  "in_contact",
  "qualified",
  "scheduled",
  "in_avaliation",
  "submitted",
  "waiting_plan",
  "converted",
];

const STEP_LABEL: Record<LeadStep, string> = {
  new: "Novo",
  in_contact: "Em contato",
  qualified: "Qualificado",
  scheduled: "Avaliação agendada",
  in_avaliation: "Em avaliação",
  submitted: "Proposta enviada",
  waiting_plan: "Aguardando operadora",
  converted: "Convertido",
  lost: "Perdido",
};

export function leadStepLabel(step: LeadStep): string {
  return STEP_LABEL[step];
}

export function isTerminal(step: LeadStep): boolean {
  return step === "converted" || step === "lost";
}

export function leadStepPosition(step: LeadStep): number | undefined {
  const index = LEAD_FUNNEL_LINE.indexOf(step);
  return index === -1 ? undefined : index;
}

const SOURCE_LABEL: Record<LeadSource, string> = {
  site: "Site",
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  google_organico: "Google orgânico",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  presencial: "Recepção",
  indicacao: "Indicação",
  operadora: "Operadora",
  evento: "Evento",
  outro: "Outro",
};

export function leadSourceLabel(source: LeadSource): string {
  return SOURCE_LABEL[source];
}

export const LOST_REASONS: { key: LostReason; label: string }[] = [
  { key: "sem_resposta", label: "Sumiu / sem resposta" },
  { key: "preco", label: "Preço" },
  { key: "operadora_nao_atendida", label: "Operadora não atendida" },
  { key: "sem_vaga_horario", label: "Sem vaga / horário" },
  { key: "distancia", label: "Distância" },
  { key: "escolheu_concorrente", label: "Escolheu concorrente" },
  { key: "desistiu", label: "Desistiu do tratamento" },
  { key: "duplicado", label: "Duplicado" },
  { key: "outro", label: "Outro" },
];

export function lostReasonLabel(reason: LostReason | undefined): string {
  if (!reason) return "Motivo não informado";
  return LOST_REASONS.find((item) => item.key === reason)?.label ?? "Motivo não informado";
}

/** A próxima ação que a etapa pede. É o que substitui um card mudo. */
export const NEXT_ACTION: Partial<Record<LeadStep, { text: string; hint: string }>> = {
  new: {
    text: "Fazer primeiro contato",
    hint: "Apresentar a clínica antes que os concorrentes do mesmo anúncio liguem.",
  },
  in_contact: {
    text: "Completar a qualificação",
    hint: "Confirmar dados da criança e operadora — é o que libera agendar a avaliação.",
  },
  qualified: {
    text: "Agendar a avaliação",
    hint: "Oferecer horários dentro da disponibilidade declarada.",
  },
  scheduled: {
    text: "Confirmar presença na avaliação",
    hint: "Enviar orientações pré-avaliação e confirmar o comparecimento.",
  },
  in_avaliation: {
    text: "Concluir a avaliação e montar a proposta",
    hint: "Finalizar a devolutiva e transformar em proposta de horas.",
  },
  submitted: {
    text: "Fazer follow-up da proposta",
    hint: "Acompanhar a decisão da família antes que ela esfrie.",
  },
  waiting_plan: {
    text: "Acompanhar a autorização",
    hint: "Cobrar a operadora — o prazo dela corre independentemente do funil.",
  },
};

/* =========================================================== tempo (fixo) */

/**
 * Diferença em dias entre duas datas, no fuso da clínica.
 *
 * Sem `new Date()` nem `Date.now()`: o `now` vem sempre da fixture ou do
 * `TODAY` declarado. Determinismo é critério de aceite neste repositório, e o
 * semáforo de follow-up é exatamente o tipo de coisa que muda sozinha se ler o
 * relógio.
 */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from.slice(0, 10)}T00:00:00.000-03:00`);
  const b = Date.parse(`${to.slice(0, 10)}T00:00:00.000-03:00`);
  return Math.round((b - a) / 86_400_000);
}

export function hoursBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 3_600_000);
}

/** Há quantos dias o lead está parado na etapa atual. */
export function daysInStep(lead: Lead, now: string): number {
  const last = [...lead.history].reverse().find((item) => item.to === lead.step);
  if (!last) return 0;
  return daysBetween(last.at, now);
}

export function timeInStepLabel(days: number): string {
  if (days <= 0) return "entrou hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

/* ==================================================== criação e etapas */

export type Decision = { allowed: boolean; reason?: string };

export type LeadDraft = {
  contactName: string;
  phone?: string;
  email?: string;
};

/** Implementação de `a-lead-costs-a-name-and-one-way-to-reach-back`. */
export function canCreateLead(draft: LeadDraft): Decision {
  if (!draft.contactName.trim()) {
    return { allowed: false, reason: "Informe o nome de quem entrou em contato." };
  }
  if (!draft.phone?.trim() && !draft.email?.trim()) {
    return {
      allowed: false,
      reason: "Informe telefone ou e-mail — sem um jeito de responder, o lead não é contatável.",
    };
  }
  return { allowed: true };
}

/** Os quatro dados que a qualificação exige, e quais faltam neste lead. */
export function missingForQualification(lead: Lead): string[] {
  const missing: string[] = [];
  if (!lead.childName?.trim()) missing.push("nome da criança");
  if (lead.childAgeYears === undefined) missing.push("idade da criança");
  if (!lead.operator?.trim() || lead.operator === "Não informado") missing.push("operadora");
  if (lead.supportLevel === undefined) missing.push("nível de suporte");
  return missing;
}

export function isQualified(lead: Lead): boolean {
  return missingForQualification(lead).length === 0;
}

/**
 * Implementação de `qualification-is-what-scheduling-an-evaluation-costs`.
 *
 * O corte é em "Avaliação agendada": é a primeira etapa que gasta sala,
 * especialista e uma hora de agenda.
 */
const QUALIFICATION_GATE = LEAD_FUNNEL_LINE.indexOf("scheduled");

export function canAdvanceTo(lead: Lead, target: LeadStep): Decision {
  if (target === "converted") {
    return {
      allowed: false,
      reason: "Convertido só pelo fluxo de efetivar paciente.",
    };
  }
  if (target === "lost") {
    return { allowed: false, reason: "Marcar como perdido exige um motivo." };
  }
  if (lead.step === "converted") {
    return { allowed: false, reason: `${lead.contactName} já virou paciente.` };
  }

  const position = leadStepPosition(target);
  if (position === undefined) return { allowed: false, reason: "Etapa desconhecida." };

  if (position >= QUALIFICATION_GATE) {
    const missing = missingForQualification(lead);
    if (missing.length > 0) {
      return {
        allowed: false,
        reason: `Agendar avaliação exige a qualificação completa. ${
          missing.length === 1 ? "Falta" : "Faltam"
        }: ${missing.join(", ")}.`,
      };
    }
  }

  return { allowed: true };
}

/** A próxima etapa da linha, quando existe uma. */
export function nextStep(step: LeadStep): LeadStep | undefined {
  const position = leadStepPosition(step);
  if (position === undefined) return undefined;
  const next = LEAD_FUNNEL_LINE[position + 1];
  return next === "converted" ? undefined : next;
}

/* ====================================================== perda e reabertura */

/** Implementação de `lost-requires-a-reason-or-the-funnel-teaches-nothing`. */
export function canMarkLost(lead: Lead, reason: LostReason | undefined): Decision {
  if (lead.step === "converted") {
    return { allowed: false, reason: `${lead.contactName} já virou paciente.` };
  }
  if (lead.step === "lost") {
    return { allowed: false, reason: "Este lead já está marcado como perdido." };
  }
  if (!reason) {
    return {
      allowed: false,
      reason: "Escolha o motivo da perda — é o que faz o funil ensinar alguma coisa.",
    };
  }
  return { allowed: true };
}

/** De qual etapa o lead saiu quando foi perdido. */
export function lostFromStep(lead: Lead): LeadStep | undefined {
  if (lead.step !== "lost") return undefined;
  return [...lead.history].reverse().find((item) => item.to === "lost")?.from;
}

/** Implementação de `a-lost-lead-reopens-a-converted-one-does-not`. */
export function canReopen(lead: Lead): Decision {
  if (lead.step === "converted") {
    return {
      allowed: false,
      reason:
        "Quem virou paciente sai do funil pela porta do cadastro. Reabrir criaria duas verdades sobre a mesma criança.",
    };
  }
  if (lead.step !== "lost") {
    return { allowed: false, reason: "Este lead não está perdido." };
  }
  return { allowed: true };
}

/** Para onde um lead reaberto volta. */
export const REOPEN_TARGET: LeadStep = "in_contact";

/* ================================================================ conversão */

/**
 * Implementação de `converting-writes-the-link-back-to-the-lead`.
 *
 * A escada de motivos é a do protótipo, e ela importa: dizer "conclua a
 * avaliação" é acionável; dizer "não é possível converter" manda a pessoa
 * adivinhar.
 */
export function canConvertLead(lead: Lead, permissions: string[]): Decision {
  if (!permissions.includes("patients.create")) {
    return { allowed: false, reason: "Seu perfil não cria pacientes." };
  }
  if (lead.step === "converted") {
    return { allowed: false, reason: `${lead.contactName} já foi convertido em paciente.` };
  }
  if (lead.step === "lost") {
    return {
      allowed: false,
      reason: "Este lead está perdido. Reabra o funil antes de converter.",
    };
  }

  const missing = missingForQualification(lead);
  if (missing.length > 0) {
    return {
      allowed: false,
      reason: `Complete a qualificação primeiro: ${missing.join(", ")}.`,
    };
  }

  const position = leadStepPosition(lead.step) ?? 0;
  if (position <= LEAD_FUNNEL_LINE.indexOf("qualified")) {
    return { allowed: false, reason: "Realize a avaliação antes de efetivar." };
  }
  if (position <= LEAD_FUNNEL_LINE.indexOf("in_avaliation")) {
    return { allowed: false, reason: "Conclua a avaliação e monte a proposta." };
  }
  if (lead.step === "submitted") {
    return { allowed: false, reason: "Aguarde a resposta da família à proposta." };
  }

  return { allowed: true };
}

/* ====================================================== saúde do follow-up */

export type LeadHealth = "green" | "amber" | "red";

const HEALTH_LABEL: Record<LeadHealth, string> = {
  green: "Tem próxima ação",
  amber: "Ação para hoje",
  red: "Atrasado ou sem próxima ação",
};

export function healthLabel(health: LeadHealth): string {
  return HEALTH_LABEL[health];
}

export function openTasks(lead: Lead): LeadTask[] {
  return lead.tasks.filter((task) => !task.done);
}

/**
 * Implementação de `every-active-lead-owes-a-next-action`.
 *
 * O vazio e o atraso são a mesma cor de propósito: são o mesmo problema.
 */
export function leadHealth(lead: Lead, now: string): LeadHealth {
  if (isTerminal(lead.step)) return "green";

  const pending = openTasks(lead);
  if (pending.length === 0) return "red";

  const distances = pending.map((task) => daysBetween(now, task.dueAt));
  if (distances.some((days) => days < 0)) return "red";
  if (distances.some((days) => days === 0)) return "amber";
  return "green";
}

/** Implementação de `first-contact-has-twenty-four-hours`. */
export function breachesFirstContactSla(lead: Lead, now: string, slaHours = 24): boolean {
  if (lead.step !== "new") return false;
  const humanContact = lead.interactions.filter(
    (item) => item.type !== "automatica" && item.type !== "importacao",
  );
  if (humanContact.length > 0) return false;

  const arrival = lead.history[0]?.at ?? lead.interactions[lead.interactions.length - 1]?.at;
  if (!arrival) return false;
  return hoursBetween(arrival, now) > slaHours;
}

export function leadsWithoutNextAction(data: LeadsData): Lead[] {
  return data.leads.filter(
    (lead) => !isTerminal(lead.step) && leadHealth(lead, data.now) === "red",
  );
}

/** Leads sem dono. A fila que a distribuição round-robin deveria esvaziar. */
export function unassignedLeads(data: LeadsData): Lead[] {
  return data.leads.filter((lead) => !isTerminal(lead.step) && !lead.owner);
}

/* =================================================================== dedupe */

export function normalizePhone(phone: string | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

export function normalizeEmail(email: string | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export type DuplicateMatch = {
  kind: "lead" | "patient";
  id: string;
  name: string;
  matchedBy: "telefone" | "e-mail";
};

/**
 * Implementação de `dedupe-checks-patients-not-only-leads`.
 *
 * A ordem importa: paciente antes de lead. Uma família que já é cliente e
 * aparece nos dois lugares precisa ser reconhecida como paciente, senão o
 * comercial liga para apresentar a clínica a quem frequenta ela.
 */
export function findDuplicate(
  data: LeadsData,
  candidate: { phone?: string; email?: string },
  ignoreLeadId?: string,
): DuplicateMatch | undefined {
  const phone = normalizePhone(candidate.phone);
  const email = normalizeEmail(candidate.email);
  if (phone.length < 8 && !email) return undefined;

  for (const patient of data.existingPatients) {
    if (phone && normalizePhone(patient.phone) === phone) {
      return { kind: "patient", id: patient.id, name: patient.name, matchedBy: "telefone" };
    }
    if (email && normalizeEmail(patient.email) === email) {
      return { kind: "patient", id: patient.id, name: patient.name, matchedBy: "e-mail" };
    }
  }

  for (const lead of data.leads) {
    if (lead.id === ignoreLeadId) continue;
    if (phone && normalizePhone(lead.phone) === phone) {
      return { kind: "lead", id: lead.id, name: lead.contactName, matchedBy: "telefone" };
    }
    if (email && normalizeEmail(lead.email) === email) {
      return { kind: "lead", id: lead.id, name: lead.contactName, matchedBy: "e-mail" };
    }
  }

  return undefined;
}

/* =============================================================== importação */

export const IMPORT_FIELDS: { value: ImportField; label: string; required?: boolean }[] = [
  { value: "contactName", label: "Nome do responsável", required: true },
  { value: "phone", label: "Telefone", required: true },
  { value: "email", label: "E-mail" },
  { value: "childName", label: "Nome da criança" },
  { value: "operator", label: "Operadora" },
  { value: "ignore", label: "(ignorar)" },
];

export type MappingProblem =
  | { kind: "missing-required"; fields: string[] }
  | { kind: "duplicated-field"; fields: string[] };

/** Implementação de `the-column-mapping-is-made-once-per-operator`. */
export function validateMapping(
  columns: ImportColumn[],
  mapping: Record<string, ImportField>,
): { valid: boolean; problems: MappingProblem[] } {
  const values = columns.map((column) => mapping[column.column] ?? "ignore");
  const problems: MappingProblem[] = [];

  const missing = IMPORT_FIELDS.filter(
    (field) => field.required && !values.includes(field.value),
  ).map((field) => field.label);
  if (missing.length > 0) problems.push({ kind: "missing-required", fields: missing });

  const counts = new Map<ImportField, number>();
  for (const value of values) {
    if (value === "ignore") continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const duplicated = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([field]) => IMPORT_FIELDS.find((item) => item.value === field)?.label ?? field);
  if (duplicated.length > 0) problems.push({ kind: "duplicated-field", fields: duplicated });

  return { valid: problems.length === 0, problems };
}

export type RowStatus = "valid" | "duplicate" | "error";
export type RowDecision = "create" | "update" | "ignore";

export type ClassifiedRow = {
  row: ImportRow;
  status: RowStatus;
  match?: DuplicateMatch;
  /** Por que a linha é inválida. Vazio quando ela não é. */
  problem?: string;
  decision: RowDecision;
  options: RowDecision[];
};

/** Implementação de `the-import-decides-row-by-row`. */
export function classifyImportRow(data: LeadsData, row: ImportRow): Omit<ClassifiedRow, "row"> {
  if (!row.contactName.trim()) {
    return { status: "error", problem: "sem nome", decision: "ignore", options: ["ignore"] };
  }
  if (normalizePhone(row.phone).length < 10) {
    return {
      status: "error",
      problem: "telefone inválido",
      decision: "ignore",
      options: ["ignore"],
    };
  }

  const match = findDuplicate(data, { phone: row.phone, email: row.email });
  if (match) {
    return {
      status: "duplicate",
      match,
      decision: "update",
      options: ["update", "create", "ignore"],
    };
  }

  return { status: "valid", decision: "create", options: ["create", "ignore"] };
}

export function classifyImport(data: LeadsData, rows: ImportRow[]): ClassifiedRow[] {
  return rows.map((row) => ({ row, ...classifyImportRow(data, row) }));
}

export function summarizeImport(classified: ClassifiedRow[]): {
  total: number;
  valid: number;
  duplicate: number;
  error: number;
  willImport: number;
} {
  const count = (status: RowStatus) => classified.filter((item) => item.status === status).length;
  return {
    total: classified.length,
    valid: count("valid"),
    duplicate: count("duplicate"),
    error: count("error"),
    willImport: classified.filter(
      (item) => item.status !== "error" && item.decision !== "ignore",
    ).length,
  };
}

/* ============================================================== integrações */

export type IntegrationStatus = {
  tone: "ok" | "warn" | "error" | "paused";
  label: string;
  detail: string;
};

/**
 * Implementação de
 * `an-active-integration-that-went-quiet-is-a-broken-integration`.
 *
 * A ordem das verificações é parte da regra: uma integração pausada de
 * propósito não é um erro, então "pausada" vence "muda". Invertido, a tela
 * grita vermelho para uma decisão da clínica.
 */
export function integrationStatus(
  integration: LeadIntegration,
  now: string,
  quietAfterHours = 6,
): IntegrationStatus {
  if (integration.kind === "oauth" && !integration.account) {
    return integration.needsReview
      ? {
          tone: "warn",
          label: "Em revisão",
          detail: "Aguardando a permissão do provedor. Nenhum lead entra por aqui ainda.",
        }
      : {
          tone: "error",
          label: "Desconectada",
          detail: "Conecte a conta para começar a receber leads.",
        };
  }

  if (!integration.active) {
    return {
      tone: "paused",
      label: "Pausada",
      detail: "Desligada pela clínica. Os leads deste canal não entram.",
    };
  }

  if (integration.lastSignalAt) {
    const quiet = hoursBetween(integration.lastSignalAt, now);
    if (quiet > quietAfterHours) {
      return {
        tone: "error",
        label: `Muda há ${quiet} h`,
        detail:
          "Webhook quebrado não dá erro, dá silêncio — e silêncio se parece com um dia fraco de anúncio.",
      };
    }
  }

  return { tone: "ok", label: "Ativa", detail: integration.recentLabel };
}

/* ================================================================= métricas */

export type FunnelBar = {
  step: LeadStep;
  label: string;
  /** Quantos estão parados nesta etapa agora. */
  current: number;
  /** Quantos já chegaram até aqui, incluindo quem passou adiante. */
  reached: number;
  /** Conversão em relação à etapa anterior. */
  rate: number;
};

/**
 * Implementação de
 * `the-funnel-counts-who-reached-the-step-not-who-is-parked-there`.
 */
export function funnelBars(leads: Lead[]): FunnelBar[] {
  const inLine = leads.filter((lead) => lead.step !== "lost");

  const reached = LEAD_FUNNEL_LINE.map(
    (_, index) =>
      inLine.filter((lead) => (leadStepPosition(lead.step) ?? -1) >= index).length,
  );

  return LEAD_FUNNEL_LINE.map((step, index) => {
    const previous = index === 0 ? reached[0]! : reached[index - 1]!;
    return {
      step,
      label: leadStepLabel(step),
      current: leads.filter((lead) => lead.step === step).length,
      reached: reached[index]!,
      rate: index === 0 ? 100 : previous === 0 ? 0 : Math.round((reached[index]! / previous) * 100),
    };
  });
}

export function conversionRate(leads: Lead[]): number {
  if (leads.length === 0) return 0;
  const converted = leads.filter((lead) => lead.step === "converted").length;
  return Math.round((converted / leads.length) * 100);
}

export type LostBar = { reason: LostReason | undefined; label: string; count: number; share: number };

/** Motivos de perda, do mais frequente para o menos. */
export function lostByReason(leads: Lead[]): LostBar[] {
  const lost = leads.filter((lead) => lead.step === "lost");
  if (lost.length === 0) return [];

  const counts = new Map<LostReason | undefined, number>();
  for (const lead of lost) counts.set(lead.lostReason, (counts.get(lead.lostReason) ?? 0) + 1);

  return [...counts.entries()]
    .map(([reason, count]) => ({
      reason,
      label: lostReasonLabel(reason),
      count,
      share: Math.round((count / lost.length) * 100),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
}

/** Onde o funil vaza: as perdas agrupadas pela etapa de onde saíram. */
export function lostByStep(leads: Lead[]): { step: LeadStep; count: number }[] {
  const counts = new Map<LeadStep, number>();
  for (const lead of leads) {
    const from = lostFromStep(lead);
    if (!from) continue;
    counts.set(from, (counts.get(from) ?? 0) + 1);
  }
  return LEAD_FUNNEL_LINE.filter((step) => counts.has(step)).map((step) => ({
    step,
    count: counts.get(step)!,
  }));
}

export type SourceBar = {
  source: LeadSource;
  label: string;
  count: number;
  converted: number;
  lost: number;
  active: number;
  rate: number;
};

/** A leitura que responde "o anúncio está pagando?". */
export function bySource(leads: Lead[]): SourceBar[] {
  const groups = new Map<LeadSource, { count: number; converted: number; lost: number }>();
  for (const lead of leads) {
    const group = groups.get(lead.source) ?? { count: 0, converted: 0, lost: 0 };
    group.count += 1;
    if (lead.step === "converted") group.converted += 1;
    else if (lead.step === "lost") group.lost += 1;
    groups.set(lead.source, group);
  }

  return [...groups.entries()]
    .map(([source, group]) => ({
      source,
      label: leadSourceLabel(source),
      count: group.count,
      converted: group.converted,
      lost: group.lost,
      active: group.count - group.converted - group.lost,
      rate: group.count === 0 ? 0 : Math.round((group.converted / group.count) * 100),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
}

/* ==================================================================== tarefas */

export type TaskBucket = "overdue" | "today" | "upcoming";

export type BucketedTask = {
  task: LeadTask;
  lead: Lead;
  bucket: TaskBucket;
  daysFromNow: number;
};

/** Atrasadas, de hoje e próximas — a ordem em que o comercial abre a lista. */
export function bucketTasks(data: LeadsData, owner?: string): BucketedTask[] {
  const items: BucketedTask[] = [];

  for (const lead of data.leads) {
    if (owner && lead.owner !== owner) continue;
    for (const task of lead.tasks) {
      if (task.done) continue;
      const daysFromNow = daysBetween(data.now, task.dueAt);
      const bucket: TaskBucket =
        daysFromNow < 0 ? "overdue" : daysFromNow === 0 ? "today" : "upcoming";
      items.push({ task, lead, bucket, daysFromNow });
    }
  }

  const order: Record<TaskBucket, number> = { overdue: 0, today: 1, upcoming: 2 };
  return items.sort(
    (a, b) => order[a.bucket] - order[b.bucket] || a.daysFromNow - b.daysFromNow,
  );
}

export function tasksIn(items: BucketedTask[], bucket: TaskBucket): BucketedTask[] {
  return items.filter((item) => item.bucket === bucket);
}

/* ===================================================================== filtro */

export type LeadFilter = {
  unit?: string;
  source?: LeadSource;
  operator?: string;
  owner?: string;
  step?: LeadStep;
  search?: string;
};

export function filterLeads(leads: Lead[], filter: LeadFilter): Lead[] {
  const query = filter.search?.trim().toLowerCase();

  return leads.filter((lead) => {
    if (filter.unit && lead.unitOfInterest !== filter.unit) return false;
    if (filter.source && lead.source !== filter.source) return false;
    if (filter.operator && lead.operator !== filter.operator) return false;
    if (filter.owner && lead.owner !== filter.owner) return false;
    if (filter.step && lead.step !== filter.step) return false;
    if (query) {
      const haystack = [lead.contactName, lead.childName, lead.phone, lead.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}
