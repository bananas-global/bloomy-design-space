import { ageInYears as ageAt, parseIsoDate } from "@brucesantos/design-space";

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
 * Atendimento — o ciclo de vida clínico
 * ================================================================== */

/**
 * Situação do agendamento.
 *
 * Doze valores, todos vindos de `Bloomy.Schedules.Schedule`. Não é enfeite de
 * modelagem: o agendamento é a entidade que carrega o estado do atendimento
 * inteiro, do check-in até a assinatura do supervisor. Uma tela que trate isso
 * como "agendado / realizado / cancelado" esconde cinco estados em que alguém
 * ainda precisa fazer alguma coisa.
 *
 * Os rótulos em português são os do produto, em
 * `priv/gettext/pt_BR/LC_MESSAGES/enums.po` — inclusive as abreviações do quadro
 * de agenda, como "Assinar" em vez de "Assinatura pendente".
 */
export type ScheduleStatus =
  | "scheduled"
  | "incomplete"
  | "ready_for_service"
  | "not_started"
  | "delayed"
  | "ongoing"
  | "pending_register"
  | "pending_signature"
  | "pending_supervisor_signature"
  | "finished"
  | "cancelled"
  | "missed";

/**
 * Quem é atendido.
 *
 * Muda a regra, não só o rótulo: atendimento de profissional (`professional`)
 * dispensa check-in, pula registro e assinatura, e vai direto para finalizado.
 * `at` é acompanhamento terapêutico fora da clínica.
 */
export type ScheduleType = "patient" | "legal_guardian" | "professional" | "at";

export type SessionType =
  | "initial"
  | "feedback"
  | "supervision"
  | "case_discussion"
  | "pedagogical"
  | "in_person"
  | "camera_observation"
  | "clinical_meeting"
  | "data_collection"
  | "session_training";

export type SessionLocation = "in_clinic" | "school" | "home";

/** Motivos de falta. O monólito só tem estes dois. */
export type MissingReason = "missing_patient" | "delay";

export type CancellationReason =
  | "illness"
  | "setback"
  | "vacation"
  | "rescheduled"
  | "unit_unlinked"
  | "patient_deactivated"
  | "unavailable_professionals"
  | "duplicity";

/**
 * Fase do passo — o eixo em que a evolução do paciente é medida.
 *
 * São os cinco valores de `Bloomy.Programs.Step`. Não confundir com a lista de
 * fases que aparece no `enums.po` sob `Programs.Program`, que inclui "Transição"
 * e não inclui linha de base: o que o passo carrega, e o que a tentativa
 * classifica, é este enum.
 *
 * A ordem é a da progressão clínica, e a última é um estado final: linha de base
 * mede antes de ensinar, intervenção ensina, generalização confirma fora do
 * contexto de ensino, manutenção confirma ao longo do tempo, adquirido encerra.
 */
export type StepPhase =
  | "baseline"
  | "intervention"
  | "generalization"
  | "maintenance"
  | "acquired";

/** Ajuda dada na tentativa, quando houve. */
export type Prompt = "verbal" | "motor" | "other";

/**
 * Uma tentativa registrada dentro do atendimento.
 *
 * É a unidade de dado clínico do Bloomy: o que a terapeuta marca, tentativa a
 * tentativa, enquanto atende. `prompt` vazio significa resposta independente —
 * e é essa distinção que a evolução do paciente mede.
 */
export type Trial = {
  id: string;
  result: "success" | "failure";
  prompt?: Prompt;
  at: string;
};

/** Execução de um passo do programa dentro do atendimento. */
export type ProgramStepExecution = {
  id: string;
  /** Nome do passo no vocabulário do programa. */
  name: string;
  phase: StepPhase;
  trials: Trial[];
  /** Quantas tentativas o passo exige antes de fechar. */
  targetTrials: number;
  /** Preenchido quando o passo foi encerrado antes de completar. */
  earlyTerminationReason?: string;
};

export type ProgramExecution = {
  id: string;
  programId: string;
  programName: string;
  /** `structured` entra pela especialidade do serviço; `incidental` é registro solto. */
  programType: "structured" | "incidental";
  result: "pending" | "success" | "failure";
  steps: ProgramStepExecution[];
};

export type Signature = {
  professionalId: string;
  professionalName: string;
  at: string;
  /** `owner` é o responsável pelo atendimento; `supervisor` fecha depois dele. */
  role: "owner" | "supervisor";
};

/**
 * O atendimento em si.
 *
 * Espelha `Bloomy.CustomServices.CustomService` mais o que o agendamento carrega
 * de estado. Os dois vivem juntos aqui porque, para quem opera, são uma coisa
 * só — e separar obrigaria toda tela a costurar os dois para responder "o que
 * falta neste atendimento".
 */
export type ClinicalSession = {
  id: string;
  scheduleId: string;
  status: ScheduleStatus;
  scheduleType: ScheduleType;
  sessionType: SessionType;
  location: SessionLocation;
  patient?: PatientRef;
  /** O primeiro da lista é o responsável pelo atendimento. Ordem importa. */
  professionals: Professional[];
  /** Supervisor do responsável, quando o atendimento exige segunda assinatura. */
  supervisor?: Professional;
  needsSupervisorSignature: boolean;
  service: { name: string; chargeable: boolean; specialty?: string };
  start: string;
  end: string;
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
  /** Check-in ativo do paciente, quando houve. */
  checkin?: { at: string; by: "admin" | "web" | "app" };
  /** Texto da evolução. Vazio é o que empurra o atendimento para pendente de registro. */
  register: string;
  programExecutions: ProgramExecution[];
  /**
   * Respostas de protocolo já registradas neste atendimento.
   *
   * Só a contagem, porque é só isso que a regra de reversão pergunta: o
   * monólito faz um `exists?` em `ProtocolExecutionOption`. Guardar o conteúdo
   * aqui sugeriria que a tela de atendimento o exibe, e ela não exibe.
   */
  protocolAnswers: number;
  signatures: Signature[];
  /** Preenchido quando `status` é `cancelled`. */
  cancellation?: { reason: CancellationReason; description?: string; at: string };
  /** Preenchido quando `status` é `missed`. */
  missing?: { reason: MissingReason; description?: string; at: string };
};

export type ClinicalSessionData = {
  session: ClinicalSession;
  /**
   * Atendimentos em aberto do profissional responsável, em qualquer agendamento.
   * O monólito bloqueia iniciar um novo enquanto existir um destes, e a tela só
   * consegue explicar o bloqueio se souber qual é o outro.
   */
  openSessionsForProfessional: { id: string; patientName: string; start: string }[];
};

/* ================================================================== *
 * Plano de intervenção — o que é ensinado, e quando está aprendido
 * ================================================================== */

/**
 * Critério de domínio ou de regressão de uma fase.
 *
 * Espelha `Bloomy.Programs.PhaseConfiguration.Criteria`. Três campos definem a
 * frase inteira que a clínica usa em voz alta: "oitenta por cento em três
 * sessões consecutivas". `performance` é o percentual de acerto, `frequency` é
 * quantas sessões, e `criteria` decide se elas precisam ser seguidas.
 *
 * A diferença entre consecutivo e cumulativo não é detalhe: um passo que oscila
 * atinge o critério cumulativo e nunca atinge o consecutivo, e é exatamente essa
 * oscilação que a decisão clínica quer enxergar.
 */
export type Criteria = {
  criteria: "consecutive" | "cumulative";
  /** Quantas sessões. */
  frequency: number;
  /** Percentual de acerto exigido, de 0 a 100. */
  performance: number;
};

/**
 * Configuração das fases de um programa estruturado.
 *
 * Obrigatória para `structured` e ausente em `incidental` — o monólito valida
 * isso no changeset. A linha de base é a única fase sem meta de acerto: seu
 * `mastery_performance` é forçado a zero, porque medir antes de ensinar não tem
 * critério de aprovação, só de encerramento.
 *
 * `regression` ausente significa que a fase não regride. Na intervenção isso
 * acompanha `hasPromptFading`: quando a retirada de ajuda está ativa, o passo
 * não volta de fase — ele volta de nível de ajuda.
 */
export type PhaseConfiguration = {
  baseline: { mastery: Criteria; regression?: Criteria };
  intervention: { mastery: Criteria; regression?: Criteria };
  generalization: { mastery: Criteria; regression?: Criteria };
  maintenance: { mastery: Criteria; regression?: Criteria };
  autoControl: boolean;
  hasPromptFading: boolean;
};

/**
 * Uma sessão já registrada para um passo, resumida ao que o critério pergunta.
 *
 * O critério só olha data e percentual de acerto — não olha tentativa a
 * tentativa. Guardar aqui apenas o que a regra consome mantém honesto o que a
 * tela pode prometer.
 */
export type StepSessionResult = {
  /** ISO `YYYY-MM-DD`. */
  date: string;
  /** Percentual de acerto na sessão, de 0 a 100. */
  performance: number;
};

/** Passo do programa, do lado do plano — não da execução dentro da sessão. */
export type PlanStep = {
  id: string;
  name: string;
  /** Ordem dentro do programa. O monólito ordena por ela em toda listagem. */
  position: number;
  /** Estímulo discriminativo: o que é apresentado ao paciente. */
  sd?: string;
  status: "active" | "acquired";
  phase: StepPhase;
  phaseStartedAt?: string;
  acquiredAt?: string;
  /** Sessões já registradas, da mais antiga para a mais recente. */
  history: StepSessionResult[];
};

export type PlanProgram = {
  id: string;
  name: string;
  shortDescription?: string;
  programType: "structured" | "incidental";
  answerType: "task_training" | "frequency" | "duration" | "interval";
  status: "active" | "acquired" | "interrupted" | "hidden";
  acquiredAt?: string;
  steps: PlanStep[];
  /** Ausente em programa incidental. */
  phaseConfiguration?: PhaseConfiguration;
  /**
   * Id da versão que substituiu este programa.
   *
   * Programas são versionados no Bloomy: editar um programa em uso cria uma
   * versão nova e aponta a antiga para ela. A antiga continua existindo porque
   * as tentativas já registradas pertencem a ela — apagá-la apagaria a
   * evolução medida sob as regras antigas.
   */
  nextVersionId?: string;
  specialties: string[];
};

export type Objective = {
  id: string;
  name: string;
  status: "active" | "acquired" | "hidden";
  acquiredAt?: string;
  programs: PlanProgram[];
};

export type Goal = {
  id: string;
  name: string;
  status: "active" | "acquired" | "hidden";
  acquiredAt?: string;
  /** Protocolo de origem, quando a meta veio de uma avaliação. */
  protocolName?: string;
  objectives: Objective[];
};

/**
 * O Plano de Ensino Individualizado do paciente.
 *
 * Quatro níveis: meta, objetivo, programa, passo. A aquisição sobe por eles —
 * passo adquirido pode fechar o programa, que pode fechar o objetivo, que pode
 * fechar a meta — e é essa cascata que faz o plano avançar sem ninguém marcar
 * nada à mão.
 */
export type InterventionPlan = {
  patient: PatientRef;
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
  goals: Goal[];
};

export type InterventionPlanData = {
  plan: InterventionPlan;
};

/* ================================================================== *
 * Protocolos — a avaliação de onde o plano nasce
 * ================================================================== */

/**
 * Formato do protocolo, e a diferença é de escala de resposta.
 *
 * `default` usa uma escala compartilhada por todo o protocolo — as `answers` do
 * `Bloomy.Protocols.Protocol`, cada uma com nome e valor. `abllsr` pontua item a
 * item numa faixa numérica própria, configurada por questão em
 * `QuestionConfigurations.Abllsr` com `min` e `max`.
 *
 * A consequência para o desenho é direta: no formato padrão, a mesma lista de
 * opções serve a página inteira; no ABLLS-R, cada questão tem a sua faixa e o
 * controle muda de questão para questão.
 */
export type ProtocolFormat = "default" | "abllsr";

export type ProtocolEvaluationType = "evaluation_habilits" | "others";

/** Uma opção da escala compartilhada, no formato padrão. */
export type ProtocolAnswerOption = {
  id: string;
  name: string;
  value: number;
};

export type ProtocolQuestion = {
  id: string;
  /** Código do item no instrumento — é por ele que a clínica se refere à questão. */
  code: string;
  name: string;
  question: string;
  /** Critério de pontuação do item. Obrigatório no monólito. */
  criteria: string;
  example?: string;
  objective?: string;
  position: number;
  /** Faixa de pontuação do item. Só existe no formato ABLLS-R. */
  range?: { min: number; max: number };
  /** Resposta registrada. Ausente significa não respondida. */
  answer?: { value: number; label?: string; at: string };
  observation?: string;
};

/**
 * Área do protocolo.
 *
 * O nome de exibição vem de `orientation`, não de um campo `name` — a `Area` do
 * monólito não tem `name`. Reproduzido assim de propósito: quem for conferir
 * contra o Elixir precisa achar o campo.
 */
export type ProtocolArea = {
  id: string;
  orientation: string;
  group?: string;
  details?: string;
  position: number;
  questions: ProtocolQuestion[];
};

export type Protocol = {
  id: string;
  name: string;
  format: ProtocolFormat;
  evaluationType: ProtocolEvaluationType;
  /** Intervalo até a próxima reavaliação, em meses. Obrigatório no monólito. */
  nextReassessmentInMonths: number;
  explication: string;
  /** Escala compartilhada. Vazia no formato ABLLS-R, que pontua por faixa. */
  answers: ProtocolAnswerOption[];
  areas: ProtocolArea[];
  nextVersionId?: string;
};

export type ProtocolExecution = {
  id: string;
  protocol: Protocol;
  patient: PatientRef;
  startedAt: string;
  finishedAt?: string;
  /** Calculada na aplicação a partir de `nextReassessmentInMonths`. */
  reassessmentDate?: string;
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
  /** Questão em foco na navegação. */
  currentQuestionId?: string;
};

export type ProtocolExecutionData = {
  execution: ProtocolExecution;
};

/* ================================================================== *
 * Na clínica — quem está na unidade agora
 * ================================================================== */

/**
 * Origem de um check-in ou check-out.
 *
 * `system` só existe no check-out: é o fechamento automático de quem saiu sem
 * registrar. Reproduzir a assimetria importa — um check-out feito pelo sistema
 * não é prova de presença do mesmo jeito que um feito na recepção.
 */
export type CheckSource = "admin" | "web" | "app" | "system";

/** Um agendamento do dia, resumido ao que o quadro da unidade mostra. */
export type DaySchedule = {
  id: string;
  start: string;
  end: string;
  status: ScheduleStatus;
  professionalName: string;
  serviceName: string;
};

export type PatientPresence = {
  id: string;
  patient: PatientRef;
  checkinAt: string;
  checkinBy: Exclude<CheckSource, "system">;
  checkoutAt?: string;
  checkoutBy?: CheckSource;
  /** Agendamentos do paciente no dia do check-in, em ordem de horário. */
  schedules: DaySchedule[];
  observation?: string;
};

export type ProfessionalPresence = {
  id: string;
  professional: Professional;
  checkinAt: string;
  checkoutAt?: string;
  /** Quantos atendimentos ainda em aberto. Bloqueia iniciar o próximo. */
  openSessions: number;
};

/**
 * O quadro da unidade.
 *
 * No Bloomy real esta tela se atualiza sozinha: assina o canal de check-in e,
 * além disso, recarrega a cada sessenta segundos. É um painel de parede da
 * recepção, não um relatório — e isso muda o que pode ficar escondido atrás de
 * um clique.
 */
export type InClinicData = {
  unit: Unit;
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
  patients: PatientPresence[];
  professionals: ProfessionalPresence[];
};

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
    parseIsoDate(iso),
  );
}

export function formatDate(iso: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseIsoDate(iso));
}

export function formatDateTime(iso: string, locale = "pt-BR"): string {
  return `${formatDate(iso, locale)} às ${formatTime(iso, locale)}`;
}

/**
 * Idade em anos completos, medida contra {@link TODAY} e não contra o relógio.
 *
 * A implementação vive no motor desde a versão 0.1.0: os dois primeiros produtos
 * escreveram a mesma correção de fuso separadamente, e o motor é o lugar de uma
 * correção que já se provou genérica. O que fica aqui é só o padrão de referência
 * do Bloomy — usar `new Date()` quebraria o determinismo de um jeito traiçoeiro:
 * o cenário "menor sem responsável" deixaria de existir no aniversário de 18 anos
 * da fixture, meses depois de alguém tê-lo aprovado.
 */
export function ageInYears(birthDate: string, reference = TODAY): number {
  return ageAt(birthDate, reference);
}

export function isMinor(patient: PatientRef, reference = TODAY): boolean {
  return ageInYears(patient.birthDate, reference) < 18;
}
