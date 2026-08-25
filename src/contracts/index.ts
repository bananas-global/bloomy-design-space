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
 * Autorizações — o TISS, e o que decide se a sessão pode ser marcada
 * ================================================================== */

/**
 * Situação da autorização.
 *
 * Dez valores de `Bloomy.Authorizations.Authorization`, e a lista importa mais
 * que o normal porque quatro delas são frequentemente lidas como "recusado"
 * quando não são:
 *
 * - `analysing` — o convênio recebeu e está avaliando. Não há ação da clínica.
 * - `waiting_requester_justification` — falta justificativa de quem pediu.
 * - `waiting_provider_documentation` — falta documento da clínica.
 * - `sync_error` — a integração falhou. É problema técnico, não decisão do
 *   convênio, e reenviar resolve; tratar como recusa manda a clínica remontar
 *   um pedido que estava correto.
 *
 * `partially_authorized` é a mais traiçoeira: o convênio autorizou **menos**
 * sessões que o pedido. Uma tela que a pinte de verde faz a clínica agendar o
 * que não foi autorizado.
 */
export type AuthorizationStatus =
  | "pending"
  | "analysing"
  | "authorized"
  | "partially_authorized"
  | "denied"
  | "waiting_requester_justification"
  | "waiting_provider_documentation"
  | "sync_error"
  | "invoiced"
  | "cancelled";

export type GuideType = "execution" | "request";
export type GuideStatus = "pre_authorized" | "token" | "executed";
export type AuthorizationKind = "particular" | "health_care";
/** Periodicidade da autorização. `base` é a autorização-mãe de um contrato. */
export type AuthorizationCategory = "monthly" | "daily" | "base";
export type PackageType = "capitation" | "package" | "free_for_service";

/**
 * Um pacote dentro da autorização.
 *
 * É onde mora o saldo: `quantity` é quantos pacotes foram autorizados,
 * `maxByMonth` quantas sessões cabem em cada um, e `executions` quantas já
 * foram consumidas por agendamento.
 *
 * `capitation` é a exceção que mais confunde: ali o teto é `maxByMonth` puro,
 * porque a quantidade não multiplica. É o modelo de valor fixo por paciente.
 */
export type AuthorizationPackage = {
  id: string;
  name: string;
  packageType: PackageType;
  quantity: number;
  maxByMonth: number;
  /** Sessões já agendadas contra este pacote. */
  executions: number;
};

export type Authorization = {
  id: string;
  guideNumber: string;
  patient: PatientRef;
  healthCare: string;
  status: AuthorizationStatus;
  kind: AuthorizationKind;
  category: AuthorizationCategory;
  guideType: GuideType;
  guideStatus?: GuideStatus;
  /** Janela de validade. Fora dela a autorização não serve, mesmo autorizada. */
  validFrom: string;
  validUntil: string;
  requestDate: string;
  authorizationDate?: string;
  packages: AuthorizationPackage[];
  /** Quantas sessões foram pedidas. Comparar com o autorizado revela o parcial. */
  requestedSessions: number;
  /** Mensagens de erro da integração. Preenchido quando `status` é `sync_error`. */
  errors: string[];
  observation?: string;
  clinicalIndication?: string;
  authorizationPassword?: string;
};

export type AuthorizationsData = {
  authorizations: Authorization[];
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
};

/* ================================================================== *
 * Fechamento do profissional — o pagamento, e de quem é a bola
 * ================================================================== */

/**
 * Situação do fechamento mensal.
 *
 * Sete estados de `Professionals.Closures.Closure`, e o que os torna
 * interessantes não é a quantidade: é que **cada um troca de dono**. A clínica
 * fecha, o profissional aceita, o profissional emite a nota, a clínica valida,
 * a clínica paga. Uma tela que trate isso como barra de progresso esconde a
 * única informação que importa em cada ponto — de quem é a bola agora.
 *
 * `paid` é terminal: `ClosurePolicy.can_interact?/2` devolve `false` para ele
 * sem olhar o papel, e nenhum anexo pode ser trocado ou removido.
 */
export type ClosureStatus =
  | "closure"
  | "wait_accept"
  | "revision"
  | "pending_invoice"
  | "validate_nf"
  | "pay_invoice"
  | "paid";

export type ClosureLog = {
  at: string;
  /** Ausente quando a ação foi do sistema, como a geração automática do mês. */
  by?: string;
  observation: string;
};

export type Closure = {
  id: string;
  professional: Professional;
  /** Id do usuário dono deste profissional. Decide quem anexa a nota fiscal. */
  professionalUserId: string;
  month: number;
  year: number;
  amountCents: number;
  status: ClosureStatus;
  /** Nota fiscal, anexada pelo próprio profissional. */
  invoiceFile?: { name: string; at: string };
  /** Comprovante de pagamento, anexado pela clínica. */
  paymentProof?: { name: string; at: string };
  /** O contrato do mês exige emissão de nota? Sem ele, o ciclo pula a NF. */
  issuesInvoice: boolean;
  logs: ClosureLog[];
};

export type ClosuresData = {
  closures: Closure[];
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
  /**
   * Usuário que está olhando. A regra de anexo da nota fiscal pergunta por
   * identidade, não por papel: só o dono do fechamento anexa a própria nota.
   */
  currentUserId: string;
};

/* ================================================================== *
 * Faturas de convênio — o lote TISS que a clínica envia
 * ================================================================== */

/**
 * A operadora, do ponto de vista do faturamento.
 *
 * `providerCode` e `requesterCode` são os códigos que a clínica usa dentro do
 * TISS; sem eles o lote não fecha. `skipEligibility` é uma escolha por
 * operadora: algumas não expõem consulta de elegibilidade, e a clínica passa
 * sem ela — assumindo o risco de faturar um beneficiário inativo.
 */
export type HealthCare = {
  id: string;
  name: string;
  ansRegister: string;
  cnpj: string;
  providerCode?: string;
  requesterCode?: string;
  skipEligibility: boolean;
  planTypes: string[];
};

/**
 * Uma autorização dentro da fatura, resumida ao que o cálculo pergunta.
 *
 * `executedSessions` é o que o monólito chama de `schedule_dailys`: os
 * atendimentos efetivamente realizados sob aquela autorização. Zero significa
 * que ela **não entra** na fatura, por mais autorizada que esteja.
 *
 * `agreementPriceCents` é o preço do acordo ativo daquele pacote com aquela
 * operadora. Ausente significa que não há acordo vigente — e o monólito soma
 * zero, sem avisar.
 */
export type InvoiceLine = {
  authorizationId: string;
  guideNumber: string;
  patientName: string;
  packageName: string;
  quantity: number;
  executedSessions: number;
  agreementPriceCents?: number;
};

export type HealthcareInvoiceStatus = "pending" | "generated_invoice";

export type HealthcareInvoice = {
  id: string;
  healthCare: HealthCare;
  status: HealthcareInvoiceStatus;
  invoiceType: "particular" | "health_care";
  periodStart: string;
  periodEnd: string;
  /** Os três campos que o lote exige para fechar. */
  number?: string;
  protocol?: string;
  igdr?: string;
  lines: InvoiceLine[];
};

export type HealthcareInvoicesData = {
  invoice: HealthcareInvoice;
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
};

/* ================================================================== *
 * Equipe — o cadastro de onde saem decisões de outros módulos
 * ================================================================== */

/**
 * Contrato do profissional com a clínica.
 *
 * `type` decide quais valores são obrigatórios, e a diferença não é cosmética:
 * remuneração fixa exige mensalidade maior que zero e aceita hora
 * administrativa zerada; por hora exige as três taxas maiores que zero.
 *
 * `issuesInvoice` é o campo que o módulo de Fechamentos consome para decidir se
 * o ciclo passa pelas etapas de nota fiscal. Uma decisão que parece do
 * financeiro mora no cadastro.
 */
export type TeamContract = {
  id: string;
  type: "fixed_compensation" | "hourly_compensation";
  startDate: string;
  endDate?: string;
  weeklyPeriod?: number;
  monthlyRateCents?: number;
  serviceRateCents?: number;
  administrativeHourlyRateCents?: number;
  specialAdministrativeHourlyRateCents?: number;
  issuesInvoice: boolean;
};

/**
 * Vínculo de supervisão entre dois profissionais.
 *
 * `needsSupervisorSignature` vive aqui, e não no atendimento: é a relação de
 * estágio que decide se as sessões daquele profissional exigem uma segunda
 * assinatura. Outra decisão que parece do atendimento e mora no cadastro.
 */
export type SupervisionLink = {
  id: string;
  professionalId: string;
  supervisorId: string;
  supervisorName: string;
  needsSupervisorSignature: boolean;
  observation?: string;
};

/**
 * Um profissional da equipe.
 *
 * `tbd` é o conceito mais fácil de perder no porte: um profissional "a definir"
 * é um espaço reservado na agenda, criado antes de a clínica saber quem vai
 * atender. O monólito reduz os dez campos obrigatórios a dois para ele.
 */
export type TeamMember = {
  id: string;
  name: string;
  /** Profissional a definir: espaço reservado na agenda, ainda sem pessoa. */
  tbd: boolean;
  specialty: string;
  email?: string;
  cpf?: string;
  phone?: string;
  birthDate?: string;
  /** Conselho e número de registro: CRP, CRFa, CREFITO. */
  specialtyRegister?: string;
  formation?: string;
  healthFormation?: string;
  /** Papéis por unidade, do campo bitwise `professional_types`. */
  professionalTypes: string[];
  /** Papéis globais, do campo bitwise `user_types`. */
  userTypes: string[];
  appliesProtocol: boolean;
  /** Acompanhante terapêutico: atende fora da clínica. */
  isAt: boolean;
  active: boolean;
  deactivationDate?: string;
  units: string[];
  contract?: TeamContract;
  /** Quem supervisiona este profissional. */
  supervisedBy: SupervisionLink[];
  /** Quem este profissional supervisiona. */
  supervises: SupervisionLink[];
};

export type TeamData = {
  members: TeamMember[];
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
};

/* ================================================================== *
 * Portal público — a única superfície que a família usa
 * ================================================================== */

/**
 * Etapas do totem de auto check-in.
 *
 * O monólito as declara como `@steps ["identification", "select_patient",
 * "registration_complete"]` e avança por índice, sem voltar: só há um botão de
 * recomeçar. É um totem na recepção, operado por quem chegou com uma criança no
 * colo — cada etapa a mais é uma chance de desistir.
 */
export type CheckinStep = "identification" | "select_patient" | "registration_complete";

/**
 * Por que o totem parou.
 *
 * Os três motivos exigem respostas diferentes de quem está na frente da tela, e
 * é por isso que são valores distintos e não uma mensagem genérica: CPF digitado
 * errado se resolve digitando de novo; responsável não cadastrado exige a
 * recepção; nenhum agendamento hoje pode significar que a pessoa veio no dia
 * errado.
 */
export type CheckinError =
  | "invalid_cpf"
  | "guardian_not_found"
  | "no_scheduled_patients"
  | "unit_not_found";

export type KioskPatient = {
  id: string;
  name: string;
  /** Horários de hoje naquela unidade, em ordem. */
  times: string[];
  /** Já tem check-in aberto: a ação disponível vira a saída. */
  hasOpenCheckin: boolean;
};

export type KioskData = {
  /** Ausente quando o slug da URL não corresponde a nenhuma unidade. */
  unit?: Unit;
  step: CheckinStep;
  error?: CheckinError;
  guardian?: { id: string; name: string };
  patients: KioskPatient[];
  selectedPatientId?: string;
  action?: "checkin" | "checkout";
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
};

/**
 * Resposta de NPS.
 *
 * `sent` distingue o convite enviado da resposta dada: enquanto ele é verdadeiro
 * e não há nota, o registro é só o convite. `code` tem exatamente cinco
 * caracteres e é único — é por ele que a família abre o link.
 */
export type NpsResponse = {
  code: string;
  /** Zero a dez. Ausente quando só o convite foi enviado. */
  rating?: number;
  comment?: string;
  sent: boolean;
  guardianName?: string;
};

export type NpsData = {
  response: NpsResponse;
  unit: Unit;
  now: string;
};

/* ================================================================== *
 * Portal do responsável legal — consentimento e acompanhamento
 * ================================================================== */

/**
 * O Plano de Ensino Individualizado, do lado de quem consente.
 *
 * `guardianApproved`, `signature` e `signedAt` são gravados juntos no aceite. É
 * um consentimento formal: define o que vai ser ensinado ao filho e por quanto
 * tempo — e é a assinatura que responde por ele depois.
 */
export type GuardianPlan = {
  id: string;
  patient: PatientRef;
  name: string;
  startAt: string;
  endAt: string;
  expired: boolean;
  observation?: string;
  guardianApproved: boolean;
  /** Nome digitado como assinatura. Preenchido junto com a data. */
  signature?: string;
  signedAt?: string;
  /**
   * Qual responsável assinou.
   *
   * Um paciente pode ter mais de um responsável legal, e o monólito grava
   * `legal_guardian_id` no aceite justamente por isso. Sem este campo, o
   * consentimento diria que alguém concordou, sem dizer quem.
   */
  signedByGuardianId?: string;
  /** Metas do plano, no vocabulário que a família lê. */
  goals: { id: string; name: string; objectives: string[] }[];
};

/**
 * Aceite dos termos de uso.
 *
 * Guarda IP e dispositivo além do instante. Não é telemetria: é o que sustenta
 * o consentimento se alguém contestar depois que aceitou.
 */
export type TermsAcceptance = {
  acceptedAt: string;
  ipAddress: string;
  device: string;
};

/** Um atendimento como a família o vê: sem registro clínico, só o combinado. */
export type GuardianSchedule = {
  id: string;
  patientName: string;
  start: string;
  end: string;
  professionalName: string;
  serviceName: string;
  unitName: string;
  /** `true` quando o horário foi cancelado. A família precisa saber. */
  cancelled: boolean;
};

export type GuardianPortalData = {
  guardian: { id: string; name: string };
  termsAcceptance?: TermsAcceptance;
  patients: PatientRef[];
  schedules: GuardianSchedule[];
  plans: GuardianPlan[];
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
};

/* ================================================================== *
 * Portal da operadora — a clínica vista de fora
 * ================================================================== */

/**
 * Um beneficiário, do ponto de vista da operadora.
 *
 * O vínculo é o plano: a operadora enxerga o paciente porque ele tem um plano
 * dela, e não porque é paciente da clínica. É essa diferença que o escopo do
 * monólito reproduz — e ela decide quem some da lista quando o plano muda.
 */
export type InsurerPatient = {
  patient: PatientRef;
  planName: string;
  cardNumber: string;
  /** Atendimentos realizados no período consultado. */
  attendedSessions: number;
  /** Atendimentos marcados e não realizados no mesmo período. */
  missedSessions: number;
};

/**
 * Uma linha da lista de presença.
 *
 * É o documento que a operadora usa para conferir o que foi cobrado. Traz o
 * que aconteceu — data, horário, profissional, se houve presença — e nada do
 * que foi feito na sessão.
 */
export type AttendanceRow = {
  id: string;
  date: string;
  start: string;
  end: string;
  patientName: string;
  professionalName: string;
  professionalRegister?: string;
  serviceName: string;
  status: ScheduleStatus;
  /** Assinatura do profissional que conduziu, quando já houve. */
  signedBy?: string;
  signedAt?: string;
};

export type InsurerPortalData = {
  healthCare: HealthCare;
  /** Período consultado na lista de presença. */
  period: { start: string; end: string };
  patients: InsurerPatient[];
  attendance: AttendanceRow[];
  /**
   * Agendamentos do período que o escopo do monólito esconde da operadora.
   *
   * Existe só neste Design Space, e de propósito: o `scope/2` real filtra
   * `status != :incomplete` sem dizer nada. Guardar a contagem permite discutir
   * se a omissão silenciosa é o comportamento pretendido.
   */
  hiddenIncompleteCount: number;
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
};

/* ================================================================== *
 * Estrutura — salas, serviços e bloqueios: o que a agenda esbarra
 * ================================================================== */

/** Tipo de sala. O serviço declara quais tipos servem para ele. */
export type RoomType = "individual" | "collective" | "motricity";

export type Room = {
  id: string;
  name: string;
  number?: number;
  roomType: RoomType;
  capacity: number;
  active: boolean;
  deactivationDate?: string;
  areaName?: string;
};

/**
 * Serviço prestado pela clínica.
 *
 * `roomTypes` é um campo bitwise: um serviço aceita mais de um tipo de sala. E
 * `notChargeable` é o mesmo campo que o módulo de Atendimento consome para
 * dispensar o check-in — outra decisão que parece do atendimento e mora no
 * cadastro.
 */
export type Service = {
  id: string;
  name: string;
  tussCode?: string;
  durationInMinutes: number;
  needsRoom: boolean;
  /** Tipos de sala que servem. Vazio com `needsRoom` verdadeiro é contradição. */
  roomTypes: RoomType[];
  notChargeable: boolean;
  specialty?: string;
};

/**
 * Bloqueio de agenda.
 *
 * O produto tem três origens de bloqueio, com o mesmo formato e escopos
 * diferentes: da unidade inteira, de um profissional, e o geral — que é onde
 * moram os feriados.
 *
 * `slot` bloqueia um horário; `time_period` bloqueia um intervalo contínuo. A
 * diferença importa na hora de explicar: "esta janela está bloqueada" e "a
 * unidade fecha das 12h às 14h" são frases diferentes.
 */
export type Blocking = {
  id: string;
  scope: "unit" | "professional" | "general";
  blockingType: "slot" | "time_period";
  start: string;
  end: string;
  observation?: string;
  isHoliday: boolean;
  holidayName?: string;
  /** Nome do profissional, quando o escopo é dele. */
  professionalName?: string;
};

export type StructureData = {
  unit: Unit;
  rooms: Room[];
  services: Service[];
  blockings: Blocking[];
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
};

/* ================================================================== *
 * Prontuário — documentos, anamnese e critérios de alerta
 * ================================================================== */

/**
 * Tipo do documento do paciente.
 *
 * Decide quem pode ver: `PatientPolicy.can?/3` tem cláusula permissiva apenas
 * para `:clinical`. `:personal` e `:administrative` caem no `false` final — e
 * ninguém, em papel nenhum, os abre pela interface.
 */
export type PatientDocumentType = "clinical" | "personal" | "administrative";

export type PatientDocument = {
  id: string;
  name: string;
  type: PatientDocumentType;
  /** Validade do documento, quando tem. Laudo e autorização costumam ter. */
  validFrom?: string;
  validUntil?: string;
  /** Quantos dias antes do vencimento o alerta começa. */
  alertLeadDays?: number;
};

/**
 * Anamnese do paciente.
 *
 * `data` é um mapa livre no monólito. O que está modelado aqui são os quatro
 * campos de comportamento que impedem a finalização — os únicos com
 * consequência de fluxo.
 */
export type Anamnese = {
  status: "pending" | "finished";
  behaviors: {
    usesBottle?: string;
    sucksThumb?: string;
    sittingPositionAtHome?: string;
    usesScreenDevices?: string;
  };
  updatedAt?: string;
};

/**
 * Critérios de alerta do paciente.
 *
 * São por paciente, e não da clínica: uma criança em adaptação tolera mais
 * faltas que outra em manutenção. Configurá-los é do coordenador.
 */
export type AlertCriteria = {
  maximumConsecutiveAbsences: number;
  maximumAbsences: number;
  requiredSessionCount: number;
};

export type PatientRecord = {
  patient: PatientRef;
  documents: PatientDocument[];
  anamnese: Anamnese;
  alertCriteria?: AlertCriteria;
  /** O que aconteceu no período de referência dos critérios. */
  attendance: { consecutiveAbsences: number; absences: number; sessions: number };
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
};

/* ================================================================== *
 * Gerência — as filas de trabalho da coordenação
 * ================================================================== */

/**
 * Controle de relatório.
 *
 * `requester` é o campo que muda tudo: um relatório pedido pela operadora tem
 * consequência de faturamento se atrasar; um pedido pela família não tem — tem
 * consequência de confiança, que é pior de recuperar e não aparece em nenhum
 * indicador.
 */
export type ReportControl = {
  id: string;
  patientName: string;
  professionalName: string;
  reportType: "evolution_month" | "hospital_discharge";
  status: "not_started" | "in_progress" | "completed" | "cancelled";
  requester: "operator" | "family";
  dueDate: string;
  observations?: string;
};

/** Vínculo de supervisão visto pela gerência: quem cobre quem. */
export type MentorshipGap = {
  professionalId: string;
  professionalName: string;
  specialty: string;
  /** `applicator` sem supervisor, ou `supervisor` sem nenhum supervisionado. */
  kind: "applicator_without_supervisor" | "supervisor_without_applicators";
};

/** Profissional com cadastro incompleto, e o que falta nele. */
export type IncompleteProfessional = {
  id: string;
  name: string;
  specialty: string;
  missing: string[];
};

/** Paciente sem responsável clínico definido na unidade. */
export type PatientWithoutOwner = {
  id: string;
  name: string;
  unitName: string;
  sinceDate: string;
};

/** As onze listas que existem em `/backoffice/gerencia`. */
export type ManagementTab =
  | "supervisors"
  | "applicators"
  | "clinical-owners"
  | "patient-registration"
  | "professional-registration"
  | "authorizations"
  | "professionals-by-specialty"
  | "hour-maps"
  | "report-control"
  | "absences"
  | "intervention-plans";

export type ManagementPerson = {
  id: string;
  name: string;
  specialty?: string;
  active: boolean;
  initials: string;
};

export type ManagementPatient = {
  id: string;
  name: string;
  active: boolean;
  initials: string;
};

export type ManagementSupervisorRow = {
  professional: ManagementPerson;
  applicatorCount: number;
};

export type ManagementApplicatorRow = {
  id: string;
  professional: ManagementPerson;
  supervisor: ManagementPerson;
  needsSupervisorSignature: boolean;
};

export type ManagementClinicalOwnerRow = {
  patient: ManagementPatient;
  responsible?: ManagementPerson;
};

export type ManagementRegistrationRow = {
  person: ManagementPerson | ManagementPatient;
  specialty?: string;
  missing: string[];
};

export type ManagementAuthorizationRow = {
  id: string;
  patient: ManagementPatient;
  durationEndAt: string;
  status: "active" | "expired";
};

export type ManagementSpecialtyRow = {
  specialty: string;
  total: number;
  coordinators: number;
  supervisors: number;
  therapists: number;
  applicators: number;
  trainees: number;
};

export type ManagementHourMapRow = {
  id: string;
  patient: ManagementPatient;
  durationStartAt?: string;
  durationEndAt?: string;
  weeklyHours?: number;
  status?: "Em vigência" | "Aguardando" | "Encerrado" | "Pendente" | "Cancelado";
};

export type ManagementAbsenceRow = {
  professional: ManagementPerson;
  missingDays: number;
  missingHours: number;
  presencePercentage: number;
};

export type ManagementInterventionPlanRow = {
  id: string;
  patient: ManagementPatient;
  startAt: string;
  endAt: string;
  createdBy: ManagementPerson;
  signedBy?: { name: string; phone: string; initials: string };
  status: "active" | "pending" | "expired";
};

export type ManagementLists = {
  supervisors: ManagementSupervisorRow[];
  applicators: ManagementApplicatorRow[];
  clinicalOwners: ManagementClinicalOwnerRow[];
  patientRegistration: ManagementRegistrationRow[];
  professionalRegistration: ManagementRegistrationRow[];
  authorizations: ManagementAuthorizationRow[];
  professionalsBySpecialty: ManagementSpecialtyRow[];
  hourMaps: ManagementHourMapRow[];
  reportControls: ReportControl[];
  absences: ManagementAbsenceRow[];
  interventionPlans: ManagementInterventionPlanRow[];
};

export type ManagementData = {
  unit: Unit;
  reports: ReportControl[];
  mentorshipGaps: MentorshipGap[];
  incompleteProfessionals: IncompleteProfessional[];
  patientsWithoutOwner: PatientWithoutOwner[];
  /**
   * Conteúdo fiel das onze abas do sistema. Ausente nas fixtures históricas do
   * baseline portado; presente nos cenários ativos de Listas gerenciais.
   */
  lists?: ManagementLists;
  /** Aba aberta pelo deep link do cenário. */
  activeTab?: ManagementTab;
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
};

/* ================================================================== *
 * Mapa de horas — a ponte entre o plano e a agenda
 * ================================================================== */

/**
 * Conflito encontrado ao gerar a grade.
 *
 * Seis tipos, em duas famílias. Os quatro primeiros dizem respeito ao
 * profissional; os dois últimos, à sala. A família importa porque decide o que
 * o mapa faz: ele **esvazia o campo daquela família** e gera o horário assim
 * mesmo, em vez de falhar.
 */
export type HourMapConflict =
  | "no_agenda"
  | "conflicting_agenda"
  | "professional_blocked"
  | "professional_occupied"
  | "room_occupied"
  | "room_blocked";

/** Uma linha da grade semanal pretendida. */
export type HourMapSlot = {
  id: string;
  /** 1 = segunda, 7 = domingo. */
  weekday: number;
  startAt: string;
  endAt: string;
  specialty: string;
  serviceName: string;
  sessionLocation: SessionLocation;
  scheduleType: "patient" | "at";
  /** Preenchido no desenho; esvaziado quando há conflito de profissional. */
  professionalName?: string;
  /** Preenchido no desenho; esvaziado quando há conflito de sala. */
  roomName?: string;
  conflicts: HourMapConflict[];
};

export type HourMap = {
  id: string;
  patient: PatientRef;
  unitName: string;
  status: "creating" | "applied" | "cancelled";
  durationStart: string;
  durationEnd: string;
  /** Renova sozinho ao fim da vigência. Ligado por padrão no monólito. */
  autoRenew: boolean;
  slots: HourMapSlot[];
  /** Avisos produzidos na aplicação do mapa. */
  warnings: string[];
};

export type HourMapData = {
  map: HourMap;
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
  /**
   * Existe um mapa que começa depois deste?
   *
   * O sistema real responde a isso num filtro — `hour_map_status=expiring`
   * procura mapa ativo terminando em sete dias **sem sucessor**. A ausência de
   * sucessor é o que transforma um vencimento em interrupção de intervenção.
   */
  hasSuccessor?: boolean;
};

/* ================================================================== *
 * Chat multidisciplinar — a coordenação escrita do caso
 * ================================================================== */

/**
 * Uma mensagem do chat.
 *
 * O schema tem `content`, autor, paciente e nada mais: **não há campo de edição
 * nem de exclusão**. O que foi escrito fica, e isso faz do chat um registro do
 * caso, não um mensageiro.
 */
export type ChatMessage = {
  id: string;
  content: string;
  authorName: string;
  /** Papel do autor no momento — a mesma pessoa aparece com papéis diferentes. */
  authorRole: string;
  at: string;
  /** Nomes de usuário mencionados com arroba no texto. */
  mentions: string[];
};

export type ChatData = {
  patient: PatientRef;
  messages: ChatMessage[];
  /** Quem está lendo, para a tela saber o que oferecer. */
  currentUser: { username: string; name: string; role: string };
  /**
   * Quem existe e com que papel, para a tela poder avisar antes do envio que
   * uma menção não vai chegar a lugar nenhum. Vem pelo contrato, e não de uma
   * fixture importada: tela não conhece fixture.
   */
  directory: { username: string; role: string }[];
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
};

/* ================================================================== *
 * Visitas — o funil de quem ainda não é paciente
 * ================================================================== */

/**
 * Passo do funil.
 *
 * Sete passos e uma saída lateral. `lost` não é o fim da fila: é uma saída que
 * pode acontecer de qualquer passo, e tratá-la como último estágio faria a
 * leitura do funil mentir sobre onde as pessoas desistem.
 */
export type FunnelStep =
  | "new"
  | "initial_contact"
  | "in_avaliation"
  | "submitted"
  | "waiting_plan"
  | "scheduled"
  | "converted"
  | "lost";

export type ProspectSource = "indication" | "search" | "others";

/** Uma visita da família à unidade, antes de virar paciente. */
export type ProspectVisit = {
  id: string;
  date: string;
  visitedBy: string;
  observations?: string;
};

/** Janela de disponibilidade que a família declarou. */
export type ProspectAvailability = {
  weekday: number;
  startAt: string;
  endAt: string;
};

export type ProspectStepChange = {
  at: string;
  from: FunnelStep;
  to: FunnelStep;
  by: string;
};

export type Prospect = {
  id: string;
  childName: string;
  guardianName: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianCpf?: string;
  step: FunnelStep;
  source: ProspectSource;
  unitOfInterest: string;
  specialties: string[];
  observation?: string;
  visits: ProspectVisit[];
  availability: ProspectAvailability[];
  history: ProspectStepChange[];
  active: boolean;
};

export type ProspectsData = {
  prospects: Prospect[];
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
};

/* ================================================================== *
 * Leads — o CRM proposto, que ainda não existe no monólito
 * ================================================================== */

/**
 * As etapas do funil **proposto**, que não são as do funil de hoje.
 *
 * Convivem de propósito com `FunnelStep`, e a razão é uma colisão de nome:
 * `scheduled` significa "primeira sessão marcada" no sistema real, depois de
 * `waiting_plan`, e "avaliação agendada" na proposta, antes de
 * `in_avaliation`. A mesma chave, dois lugares do funil. Unificar os dois tipos
 * apagaria a diferença — e ela é justamente o que a migração do enum precisa
 * resolver. Ver `scheduled-means-two-places-in-the-funnel` em
 * `src/rules/leads.ts`.
 */
export type LeadStep =
  | "new"
  | "in_contact"
  | "qualified"
  | "scheduled"
  | "in_avaliation"
  | "submitted"
  | "waiting_plan"
  | "converted"
  | "lost";

/**
 * De onde o lead veio.
 *
 * Doze origens onde o sistema real tem três (`indication`, `search`,
 * `others`). A diferença não é de granularidade: sem separar Google Ads de
 * Meta Ads de indicação, não existe a pergunta "o anúncio está pagando?".
 */
export type LeadSource =
  | "site"
  | "google_ads"
  | "meta_ads"
  | "google_organico"
  | "instagram"
  | "whatsapp"
  | "telefone"
  | "presencial"
  | "indicacao"
  | "operadora"
  | "evento"
  | "outro";

/** Obrigatório ao marcar Perdido. Sem ele, o funil não ensina nada. */
export type LostReason =
  | "sem_resposta"
  | "preco"
  | "operadora_nao_atendida"
  | "sem_vaga_horario"
  | "distancia"
  | "escolheu_concorrente"
  | "desistiu"
  | "duplicado"
  | "outro";

export type LeadInteractionType =
  | "ligacao"
  | "whatsapp"
  | "email"
  | "visita"
  | "nota"
  | "proposta"
  | "etapa"
  | "importacao"
  | "automatica";

/**
 * Uma linha da timeline.
 *
 * As visitas do modelo atual (`ProspectVisit`) viram um tipo de interação —
 * é o que permite ler ligação, WhatsApp, proposta e visita na mesma ordem
 * cronológica em vez de em duas listas separadas.
 */
export type LeadInteraction = {
  id: string;
  type: LeadInteractionType;
  at: string;
  by: string;
  text: string;
};

/** Follow-up. Todo lead ativo deve ter uma. Lead sem tarefa é alerta. */
export type LeadTask = {
  id: string;
  title: string;
  dueAt: string;
  assignedTo?: string;
  done: boolean;
};

export type LeadStepChange = {
  at: string;
  from: LeadStep;
  to: LeadStep;
  by: string;
  note?: string;
};

/**
 * Consentimento LGPD.
 *
 * `basis` existe porque nem toda entrada tem aceite explícito: a planilha da
 * operadora chega sem checkbox, e a base legal ali é a execução do
 * procedimento a pedido do titular. Registrar qual das duas vale é o que
 * separa uma base de leads defensável de uma lista comprada.
 */
export type LeadConsent = {
  given: boolean;
  at?: string;
  channel?: string;
  basis?: "consentimento" | "execucao_de_contrato";
};

export type LeadUtm = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
};

export type LeadSpecialty = {
  name: string;
  hoursPerWeek: number;
};

export type Lead = {
  id: string;
  /** Quem atende o telefone. No topo do funil, às vezes é tudo que se tem. */
  contactName: string;
  phone?: string;
  email?: string;
  city?: string;
  region?: string;
  /** Dados da criança só passam a ser exigidos a partir de "Avaliação agendada". */
  childName?: string;
  childAgeYears?: number;
  supportLevel?: 1 | 2 | 3;
  operator?: string;
  unitOfInterest: string;
  specialties: LeadSpecialty[];
  availability: ProspectAvailability[];
  source: LeadSource;
  campaign?: string;
  utm?: LeadUtm;
  /** Responsável comercial. Ausente é uma situação real: fila sem dono. */
  owner?: string;
  step: LeadStep;
  lostReason?: LostReason;
  lostNote?: string;
  importBatchId?: string;
  consent: LeadConsent;
  interactions: LeadInteraction[];
  tasks: LeadTask[];
  history: LeadStepChange[];
  /** O vínculo que fecha a métrica origem → paciente. */
  convertedPatientId?: string;
};

/* ------------------------------------------------------- importação */

export type ImportField = "contactName" | "phone" | "email" | "childName" | "operator" | "ignore";

export type ImportColumn = {
  column: string;
  sample: string;
  suggestion: ImportField;
};

/** Uma linha crua da planilha, antes de qualquer validação. */
export type ImportRow = {
  line: number;
  contactName: string;
  phone: string;
  email: string;
  childName: string;
  operator: string;
};

/** O mapeamento salvo por operadora — feito uma vez, reusado sempre. */
export type ImportTemplate = {
  name: string;
  mapping: Record<string, ImportField>;
};

export type ImportPreview = {
  fileName: string;
  format: "CSV" | "XLSX";
  sizeLabel: string;
  source: string;
  unit: string;
  columns: ImportColumn[];
  rows: ImportRow[];
  templates: ImportTemplate[];
  mapping: Record<string, ImportField>;
};

export type ImportBatch = {
  id: string;
  fileName: string;
  source: string;
  unit: string;
  at: string;
  by: string;
  created: number;
  updated: number;
  ignored: number;
  errors: number;
  tasksCreated: number;
};

/* ------------------------------------------------------ integrações */

export type IntegrationKind = "endpoint" | "oauth" | "sheets";

export type LeadIntegration = {
  id: string;
  name: string;
  kind: IntegrationKind;
  provider?: string;
  description: string;
  /** Ligada pela clínica. Diferente de estar funcionando. */
  active: boolean;
  /** Conta OAuth conectada, quando o canal exige uma. */
  account?: string;
  formId?: string;
  endpoint?: string;
  sheetUrl?: string;
  syncEvery?: string;
  /** Aguardando revisão do app pelo provedor (o caso da Meta). */
  needsReview?: boolean;
  /** Último sinal recebido. Ausente quando nunca recebeu nada. */
  lastSignalAt?: string;
  recentLabel: string;
  defaults: {
    unit: string;
    source: LeadSource;
    owner?: string;
    createTask: boolean;
    notify: boolean;
    captureUtm?: boolean;
    requireConsent?: boolean;
  };
};

export type LeadsData = {
  leads: Lead[];
  owners: string[];
  operators: string[];
  units: string[];
  integrations: LeadIntegration[];
  batches: ImportBatch[];
  importPreview?: ImportPreview;
  /**
   * O que já foi digitado no formulário de novo lead.
   *
   * Declarado na fixture em vez de derivado de estado de componente: o aviso de
   * duplicidade é uma situação do produto, e uma situação precisa ser abrível
   * por link para virar caso verificável no handoff.
   */
  newLeadDraft?: { contactName: string; phone?: string; email?: string };
  /**
   * Pacientes já cadastrados, para o dedupe olhar além dos leads.
   * Família que já é cliente e pede segunda especialidade não é lead novo.
   */
  existingPatients: { id: string; name: string; phone?: string; email?: string }[];
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
};

/* ================================================================== *
 * Relatórios — os documentos que saem da clínica
 * ================================================================== */

/**
 * Tipo do relatório.
 *
 * Sete tipos, e o que muda entre eles não é só o conteúdo: é **para onde o
 * documento vai**. A declaração de comparecimento vai para o empregador do
 * responsável; o relatório para operadora vai para o convênio; o PEI vai para a
 * família. O mesmo botão produz documentos que saem da clínica para lugares
 * muito diferentes.
 */
export type ReportType =
  | "normal"
  | "declaration_of_attendance"
  | "protocol_report"
  | "evolution_report"
  | "pei"
  | "health_care_report"
  | "external_report";

export type ReportStatus = "elaboration" | "generated_pdf" | "cancelled";

export type PatientReport = {
  id: string;
  name: string;
  reportType: ReportType;
  status: ReportStatus;
  patientName: string;
  /** Quem responde pelo documento. Pode não ser quem o escreveu. */
  ownerName?: string;
  /** Quem criou o registro. */
  authorName: string;
  content?: string;
  createdAt: string;
  cancelledAt?: string;
  /** Campos exclusivos da declaração de comparecimento. */
  attendance?: {
    date: string;
    startTime: string;
    endTime: string;
    guardianName: string;
  };
  /** Período coberto, nos tipos que cobrem um intervalo. */
  period?: { start: string; end: string };
};

export type ReportsData = {
  reports: PatientReport[];
  /** Papel de quem está olhando, para exercitar a regra de emissão. */
  currentRole: string;
  /** Instante de referência da situação. Fixture não olha o relógio (§15.1). */
  now: string;
};

/* ================================================================== *
 * Formatação
 * ================================================================== */

export function formatMoney(amountCents: number, locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(
    amountCents / 100,
  );
}

/**
 * O fuso da clínica, e não o de quem olha.
 *
 * `Intl.DateTimeFormat` sem `timeZone` formata no fuso do navegador. Sem isto,
 * a mesma URL mostrava **08:00 em São Paulo, 12:00 em Lisboa e 20:00 em
 * Tóquio** — três situações diferentes para o mesmo cenário, o que desfaz a
 * promessa central deste Design Space.
 *
 * E é errado no produto antes de ser errado aqui: horário de atendimento é do
 * lugar onde o atendimento acontece. O monólito fixa o mesmo valor em
 * `Bloomy.CalendarHelper.local_timezone/0`.
 */
export const CLINIC_TIMEZONE = "America/Sao_Paulo";

export function formatTime(iso: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CLINIC_TIMEZONE,
  }).format(parseIsoDate(iso));
}

export function formatDate(iso: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: CLINIC_TIMEZONE,
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

/* ========================================================== Notificações */

/**
 * Uma notificação como o sistema real a guarda.
 *
 * O que o schema **não** tem é o que decide a tela: não há tipo, não há
 * categoria, não há prioridade e não há entidade referenciada. Há um título,
 * um texto e uma URL opcional — e o texto é uma cópia congelada no momento do
 * envio, não uma leitura do dado.
 */
export interface NotificationItem {
  id: string;
  title: string;
  /** Texto gravado no envio. Não acompanha o dado se ele mudar depois. */
  content: string;
  /** Para onde a notificação leva. Opcional: pode não levar a lugar nenhum. */
  onClickUrl?: string;
  /** Quando esta pessoa leu. Ausente é não lida. Mora no vínculo, não na notificação. */
  readAt?: string;
  /** Quando o vínculo foi criado — é por ele que a lista ordena. */
  at: string;
}

export interface NotificationsData {
  currentUser: { id: string; name: string; role: string };
  items: NotificationItem[];
}

/* ============================================================ Supervisão */

/** Um supervisor como a tela de supervisão o lista. */
export interface SupervisorRow {
  id: string;
  name: string;
  specialtyName: string;
  active: boolean;
  /** Quantas pessoas ele supervisiona. Zero faz a linha sumir da tela real. */
  internCount: number;
}

/**
 * Um atendimento de alguém supervisionado.
 *
 * Os quatro últimos campos são o que a tela do sistema real **não** mostra —
 * ela lista serviço, profissional, paciente, sala, horário e situação, e para
 * por aí. O estado da supervisão, que é a razão de o vínculo existir, fica de
 * fora.
 */
export interface SupervisedSchedule {
  id: string;
  professionalName: string;
  patientName: string;
  specialtyName: string;
  serviceName: string;
  roomName?: string;
  start: string;
  end: string;
  status: ScheduleStatus;
  needsSupervisorSignature: boolean;
  signedByProfessionalAt?: string;
  signedBySupervisorAt?: string;
}

export interface SupervisionData {
  /** Quem abriu a tela — usado para dizer se a assinatura pendente é dele. */
  currentSupervisorId?: string;
  /** O intervalo em vigor. O sistema real o inicializa em [hoje-30, hoje]. */
  period: { start: string; end: string };
  supervisors: SupervisorRow[];
  selectedSupervisorId?: string;
  schedules: SupervisedSchedule[];
}

/* ========================================= Supervisão — a equipe inteira */

/**
 * A supervisão como relação de três pontas, e não como lista.
 *
 * Os tipos acima descrevem a tela do sistema: uma lista de supervisores e, ao
 * lado, os atendimentos de quem o selecionado supervisiona. Os de baixo
 * descrevem a proposta — supervisor, aplicador e paciente como três entradas
 * para a mesma relação, cada uma filtrando as outras duas.
 *
 * Os dois convivem de propósito. A tela portada continua em `/supervision` e
 * responde pelas cinco situações do porte; a proposta mora em
 * `/supervision/team`. É o mesmo arranjo de Profissionais e Unidades.
 */

/** Para onde o programa está indo. Duas das quatro são ponto de atenção. */
export type ProgramTrend = "up" | "flat" | "stalled" | "down";

export interface SupervisedProgram {
  name: string;
  trend: ProgramTrend;
}

/** O que um programa produziu **numa** sessão: o que a assinatura confere. */
export interface SessionProgramResult extends SupervisedProgram {
  trials: number;
  correct: number;
}

/**
 * Registro ABC — antecedente, comportamento, consequência.
 *
 * Não é anotação livre: é o formato do registro de comportamento-alvo do ABA, e
 * quem assina precisa ver os três campos juntos para saber o que a consequência
 * respondeu.
 */
export interface AbcRecord {
  antecedent: string;
  behavior: string;
  consequence: string;
  minutes: number;
}

export interface SupervisionSupervisor {
  id: string;
  name: string;
  specialtyName: string;
}

export interface SupervisionApplicator {
  id: string;
  name: string;
  /** O papel do produto — Aplicador, Terapeuta, Especialista. */
  roleName: string;
  specialtyName: string;
  /** O vínculo de estágio. É ele, e não o papel, que monta a coluna. */
  supervisorId: string;
  /** Última supervisão registrada, `YYYY-MM-DD`. Ausente é nunca. */
  lastSupervisionOn?: string;
}

export interface SupervisionPatient {
  id: string;
  name: string;
  birthDate: string;
  /** Guia do convênio a vencer: ponto de atenção que não é clínico. */
  expiringGuide: boolean;
  programs: SupervisedProgram[];
}

/**
 * Um atendimento de alguém supervisionado, com o registro que a assinatura
 * confere.
 *
 * O registro vem junto do atendimento porque é isso que a segunda assinatura
 * afirma: quem assina está dizendo que leu as tentativas, a observação e o ABC.
 * Um lote que assine sem mostrar isso assina no escuro.
 */
export interface SupervisionSession {
  id: string;
  applicatorId: string;
  patientId: string;
  serviceName: string;
  start: string;
  end: string;
  status: ScheduleStatus;
  hasRecord: boolean;
  /** Unidade ou domicílio: o atendimento domiciliar não tem sala. */
  placeName: string;
  checkinAt?: string;
  checkoutAt?: string;
  /** Observação de quem aplicou, como ela chega para quem assina. */
  note?: string;
  programs: SessionProgramResult[];
  abc: AbcRecord[];
}

export interface SupervisionTeamData {
  /** A referência do período. Determinística, como todo `now` daqui. */
  now: string;
  /**
   * Quem o visitante **é**, quando o visitante supervisiona.
   *
   * `supervisor_internships` é um registro da pessoa, não do papel: se você tem
   * um vínculo é um fato do seu cadastro, e nenhuma permissão o expressa. Neste
   * ambiente a pessoa que abre é a persona escolhida, então é a fixture que diz
   * qual supervisor ela seria — do mesmo jeito que `NotificationsData` carrega o
   * papel de quem abriu.
   *
   * Ausente, o visitante que supervisiona é alguém recém-designado, sem ninguém
   * ainda. A tela não abre para ele, e é a mesma constatação do porte: a lista é
   * montada a partir dos vínculos, não do cargo.
   */
  viewerSupervisorId?: string;
  supervisors: SupervisionSupervisor[];
  applicators: SupervisionApplicator[];
  patients: SupervisionPatient[];
  sessions: SupervisionSession[];
}

/* ====================================================== Mapa da unidade */

/** Os quatro eixos do mapa. Dois deles não têm escolha de granularidade. */
export type UnitMapAxis = "patient" | "professional" | "room" | "unit";

export interface UnitMapItem {
  id: string;
  patientName: string;
  serviceName: string;
  status: ScheduleStatus;
}

export interface UnitMapDay {
  date: string;
  weekdayName: string;
  /**
   * As horas em que esta linha tem agenda padrão definida.
   *
   * Vazio **não** é o mesmo que zero atendimentos: é ausência de cadastro. A
   * distinção é a razão de o módulo existir.
   */
  availableHours: number[];
  /** Hora cheia → o que acontece nela. Uma hora com três atendimentos é uma chave. */
  itemsByHour: Record<number, UnitMapItem[]>;
}

export interface UnitMapRow {
  id: string;
  name: string;
  subtitle?: string;
  days: UnitMapDay[];
}

export interface UnitMapData {
  unit: {
    name: string;
    /** Hora de abertura, como `HH:MM`. */
    opensAt: string;
    /** Hora de fechamento, como `HH:MM`. */
    closesAt: string;
  };
  axis: UnitMapAxis;
  granularity: "week" | "day";
  week: { start: string; end: string };
  rows: UnitMapRow[];
}

/* ====================================================== Controle de horas */

/** Quem registrou a marca: o próprio profissional pelo app, ou alguém no escritório. */
export type RegisteredBy = "app" | "admin";

/** Uma faixa efetivamente trabalhada. `endAt` ausente é jornada em aberto. */
export interface ClinicHour {
  id: string;
  startAt: string;
  endAt?: string;
  checkinDoneBy: RegisteredBy;
  checkoutDoneBy?: RegisteredBy;
}

/**
 * Uma faixa prevista.
 *
 * `endAt` é opcional no changeset do sistema real e obrigatório no cálculo —
 * é a forma exata que a soma não consegue processar.
 */
export interface ExpectedClinicHour {
  id: string;
  startAt: string;
  endAt?: string;
}

/** Uma marca de verificação por geolocalização. Pode simplesmente não existir. */
export interface HourVerification {
  type: "checkin" | "checkout";
  latitude: string;
  longitude: string;
  at: string;
}

export interface ClinicalHourRecord {
  id: string;
  date: string;
  professionalName: string;
  unitName: string;
  observation?: string;
  clinicHours: ClinicHour[];
  expectedClinicHours: ExpectedClinicHour[];
  verifications: HourVerification[];
  /** O inteiro que o sistema real guarda — já truncado. */
  storedExpectedHours: number;
  expectedDailyPaymentCents?: number;
}

export interface ClinicalHoursData {
  records: ClinicalHourRecord[];
  /** O recorte de paginação do sistema real, quando ele muda a leitura. */
  page?: PageWindow;
}

/* =================================================== Marcar atendimento */

/** Os sete verificadores do sistema real, na ordem em que ele os executa. */
export type ImpedimentKind =
  | "professional_inactive"
  | "professional_blocked"
  | "unit_blocked"
  | "room_blocked"
  | "general_blocking"
  | "duplicate_slot"
  | "room_full";

export interface Impediment {
  kind: ImpedimentKind;
  /** A frase que o sistema real produz, com nomes e horários dentro. */
  message: string;
}

/**
 * Uma tentativa de marcar.
 *
 * Os campos booleanos não descrevem o agendamento: descrevem o **resultado de
 * cada verificação**. É assim de propósito — o Design Space não reimplementa
 * as sete consultas, e sim o comportamento de quem as recebe.
 */
export interface ScheduleAttempt {
  patientName?: string;
  professionalName?: string;
  serviceName: string;
  roomName?: string;
  unitName: string;
  start: string;
  end: string;
  scheduleType: "patient" | "at" | "professional";
  /** Capacidade da sala. Maior que um: salas comportam atendimentos simultâneos. */
  roomCapacity?: number;
  roomOccupancy?: number;
  impediments: Impediment[];
}

export interface NewAppointmentData {
  attempt: ScheduleAttempt;
}

/* ====================================================== Fase terapêutica */

/** As seis etapas do percurso, na ordem em que o enum as numera. */
export type TherapyStep =
  | "ambiance"
  | "initial_assessment"
  | "pre_intervention"
  | "therapy"
  | "reassessment"
  | "discharge_preparation";

export type TherapySpecialty =
  | "phonoaudiology"
  | "psychology"
  | "occupational_therapy"
  | "physiotherapy"
  | "music_therapy"
  | "aba_practitioner"
  | "nutritionist";

/**
 * A fase de um paciente **numa especialidade**.
 *
 * `specialty` é opcional porque o changeset do sistema real não a exige — e uma
 * fase sem especialidade é exatamente o registro que a tela não sabe onde pôr.
 */
export interface TherapyPhase {
  id: string;
  specialty?: TherapySpecialty;
  step: TherapyStep;
  updatedAt: string;
}

export interface TherapyPhasesData {
  patient: PatientRef;
  phases: TherapyPhase[];
  /** Especialidades em que o paciente tem atendimento e nenhuma fase registrada. */
  specialtiesWithoutPhase: TherapySpecialty[];
}

/* ==================================================== Inativar paciente */

export interface DeactivationImpact {
  patient: PatientRef;
  /** A data escolhida. Pode ser futura — e a cascata roda assim mesmo. */
  deactivationDate: string;
  /** Agendamentos que serão cancelados, do corte em diante. */
  schedulesToCancel: {
    id: string;
    start: string;
    serviceName: string;
    professionalName: string;
  }[];
  /** Mapas de horas em vigor no corte, que serão encerrados. */
  hourMapsToClose: { id: string; durationEnd: string }[];
  /** Mapas que perdem a renovação automática — todos, sem filtro de data. */
  hourMapsLosingAutoRenew: number;
  /**
   * Vínculos profissional–paciente.
   *
   * O caminho manual não os toca. O worker que roda na data marcada os
   * **apaga** — `delete_all`, com o campo de observação junto.
   */
  professionalBonds: { id: string; professionalName: string; observation?: string }[];
  /**
   * Por qual caminho a inativação vai acontecer.
   *
   * Mesmo resultado pretendido, dois códigos diferentes, e o desatendido
   * destrói mais.
   */
  path: "manual" | "worker";
}

/**
 * Recorte de paginação do sistema real.
 *
 * O monólito pagina com Flop em 50 schemas, com limites de 5, 8, 10 e 15. O
 * Design Space mostra listas inteiras — e essa diferença não é cosmética
 * quando o limite é menor que a unidade de trabalho da tela.
 */
export interface PageWindow {
  /** Itens por página no sistema real. */
  limit: number;
  /** Total de itens que existem no período ou filtro em vigor. */
  total: number;
}

/* ================================================= Pendências de cadastro */

/**
 * As quatro ausências que o sistema real sabe filtrar.
 *
 * São **relações que nunca foram estabelecidas**, e não campos obrigatórios em
 * branco — coisa diferente de `missingRequiredFields`. Nenhuma delas bloqueia
 * nada: o paciente é atendido normalmente com as quatro em aberto.
 */
export type PatientGapKind = "plan" | "unit" | "hour_map" | "support_level";

export interface PatientWithGaps {
  patient: PatientRef;
  gaps: PatientGapKind[];
  /** Há quantos dias o paciente está em atendimento com a lacuna aberta. */
  daysInCare: number;
  /** Nível de suporte do DSM-5, de 1 a 3. Ausente é a lacuna `support_level`. */
  supportLevel?: 1 | 2 | 3;
}

export interface PatientGapsData {
  patients: PatientWithGaps[];
  /** Total de pacientes ativos, para a lacuna ter proporção. */
  activePatients: number;
}

/* ============================================== Atendimento em atraso */

/**
 * Um atendimento que passou do horário e não fechou.
 *
 * O sistema real tem **três** definições de "pendente/atrasado", e elas não
 * coincidem — ver `src/rules/overdue.ts`. O contrato guarda o fato bruto e
 * deixa a classificação para a regra.
 */
export interface OverdueSchedule {
  id: string;
  patientName: string;
  professionalName: string;
  serviceName: string;
  start: string;
  status: ScheduleStatus;
}

export interface OverdueData {
  schedules: OverdueSchedule[];
  /** Instante de referência. Fixture não olha o relógio. */
  now: string;
  /** Papel de quem abriu — decide qual das definições o sistema aplicaria. */
  viewerRole: string;
  /**
   * Nome do profissional de quem abriu, quando é supervisor.
   *
   * `supervisor_query` trata os agendamentos dele com uma janela diferente da
   * dos colegas — a única vez no sistema em que alguém se cobra antes.
   */
  viewerProfessionalName?: string;
}

/* ================================================ Cobertura de plano */

/**
 * A vigência de um plano de saúde do paciente.
 *
 * As duas datas são **independentemente opcionais** no cadastro, e o filtro de
 * operadora só reconhece dois dos quatro estados possíveis.
 */
export interface PlanCoverage {
  id: string;
  patientName: string;
  healthCareName: string;
  /** Início da cobertura. Ausente é permitido. */
  startOfCoverage?: string;
  /** Fim da cobertura. Ausente é permitido. */
  endOfCoverage?: string;
}

export interface PlanCoverageData {
  plans: PlanCoverage[];
  /** Data de referência. Fixture não olha o relógio. */
  today: string;
}

/* ========================================== Geração mensal de fechamento */

/**
 * Um profissional na virada do mês, do ponto de vista do worker que gera
 * fechamentos.
 */
export interface ClosureCandidate {
  id: string;
  name: string;
  /** Ativo **hoje**, na hora em que o worker roda — não durante o mês fechado. */
  activeNow: boolean;
  /** Tem registro de horas no mês fechado. */
  hasClinicalHours: boolean;
  /** Dia em que foi desativado, quando foi. */
  deactivatedOn?: string;
  /** Horas registradas no mês, para a perda ter tamanho. */
  hoursInMonth: number;
  /** A geração falhou para este profissional. */
  generationFailed?: boolean;
}

export interface ClosureGenerationData {
  /** Competência fechada, como `AAAA-MM`. */
  month: string;
  /** Instante em que o worker rodou. */
  ranAt: string;
  candidates: ClosureCandidate[];
}

/* ============================================== Origem de uma ausência */

/**
 * De onde veio a marca de ausência.
 *
 * O sistema real guarda `missing_reason`, e um dos valores é `:delay` — posto
 * por um worker que converte agendamentos parados há sete dias. Essa ausência
 * **não foi observada por ninguém**.
 */
export type AbsenceOrigin =
  /** Alguém registrou que o paciente não apareceu. */
  | "observed"
  /** A família avisou antes. O sistema conta junto das ausências. */
  | "cancelled"
  /**
   * Um worker converteu depois de sete dias parado em atraso, com motivo
   * `:delay`. Ninguém viu nada, e o motivo ao menos não acusa ninguém.
   */
  | "fabricated_by_delay"
  /**
   * Um worker converteu na manhã seguinte, porque o agendamento continuava
   * marcado — motivo `:missing_patient`. **O sistema afirma que o paciente
   * faltou**, sem que ninguém tenha olhado.
   */
  | "fabricated_blaming_patient";

export interface AbsenceRecord {
  id: string;
  patientName: string;
  professionalName: string;
  date: string;
  origin: AbsenceOrigin;
  /** Dias que o registro passou parado antes da conversão automática. */
  daysStalled?: number;
}

export interface AbsenceOriginData {
  month: string;
  records: AbsenceRecord[];
}

/* ============================================== Saída automática */

/** Um check-in de paciente que ficou sem saída. */
export interface OpenPresence {
  id: string;
  patientName: string;
  unitName: string;
  checkinAt: string;
  /** Quem fechou, quando fechou. `"system"` é a rotina. */
  checkoutDoneBy?: string;
  checkoutAt?: string;
}

export interface AutoCheckoutData {
  /** Instante em que a rotina rodaria. */
  runsAt: string;
  records: OpenPresence[];
}

/* ============================================== Renovação da janela */

/**
 * A janela de autorização de um paciente.
 *
 * `PatientAuthorization` é o **período**, não a guia: tem `has_many
 * :authorizations` e nenhuma quantidade. Renovar move a data de fim; o saldo
 * de sessões vive nas guias dentro dela.
 */
export interface AuthorizationWindow {
  id: string;
  patientName: string;
  durationStart: string;
  durationEnd: string;
  autoRenew: boolean;
  /** Sessões que ainda restam nas guias dentro da janela. */
  remainingSessions: number;
  /** Nova data de fim, quando a renovação já aconteceu. */
  renewedTo?: string;
}

export interface AuthorizationRenewalData {
  windows: AuthorizationWindow[];
  today: string;
}

/* ============================================== Envio do lote TISS */

/**
 * O que aconteceu com uma tentativa de enviar o lote.
 *
 * `sent` e `refused` são respostas da operadora. `crashed` é exceção no
 * próprio código. **No sistema real, `refused` e `crashed` gravam a mesma
 * string** — a distinção existe aqui e não lá.
 */
export type BatchOutcome = "sent" | "refused" | "crashed" | "pending";

export interface BatchAttempt {
  id: string;
  invoiceCode: string;
  insurerName: string;
  authorizationCount: number;
  amountCents: number;
  attemptedAt: string;
  outcome: BatchOutcome;
  /** O que a operadora respondeu, quando respondeu. O código real descarta. */
  insurerMessage?: string;
  /** O que o job registrou. Igual para recusa e para exceção. */
  loggedMessage?: string;
}

export interface TissBatchData {
  attempts: BatchAttempt[];
}

/* ============================================== Distribuição de guias */

/** Um atendimento do dia, e a guia que o distribuidor lhe deu — ou não. */
export interface DistributedSchedule {
  id: string;
  patientName: string;
  serviceName: string;
  start: string;
  amountCents: number;
  /** Guia atribuída. Ausente é atendimento que ficou sem cobertura. */
  authorizationCode?: string;
  /** Pacote de onde saiu a sessão. */
  packageName?: string;
}

export interface DistributionData {
  date: string;
  schedules: DistributedSchedule[];
  /** Saldo que havia no início da distribuição, por pacote. */
  packages: { name: string; startingBalance: number }[];
}

/**
 * Resumo automático da reunião.
 *
 * `AutoRegenerateAppointmentContent` roda às 3h, junta os comentários da
 * reunião, pede um resumo ao modelo e **grava em `appointment.content`** — o
 * registro oficial. O campo que controla a fila chama-se `comments_reviewed`,
 * e quem o marca como revisado é a própria rotina.
 */
export interface MeetingComment {
  id: string;
  professionalName: string;
  writtenAt: string;
  content: string;
}

export interface MeetingRecord {
  id: string;
  patientName: string;
  meetingKind: string;
  finishedAt: string;
  /** `comments_reviewed` no monólito. `false` põe o registro na fila das 3h. */
  commentsReviewed: boolean;
  /** `appointment.content` — o registro oficial da reunião. */
  officialContent?: string;
  /** Quem escreveu o texto que está lá agora. */
  contentWrittenBy?: "ai" | "professional";
  contentWrittenAt?: string;
  comments: MeetingComment[];
  /** Noites seguidas em que a geração falhou para este registro. */
  failedNights: number;
  /**
   * Existe a linha em `custom_service_appointments`.
   *
   * `Create.create_appointment/1` descarta o resultado do insert, então pode
   * não existir — e a rotina das 3h lê `custom_service.appointment.id` sem
   * conferir.
   */
  hasAppointmentRow: boolean;
}

export interface MeetingSummaryData {
  /** Quando a rotina roda. Cron `0 3 * * *`, fuso da clínica. */
  runsAt: string;
  records: MeetingRecord[];
}

/**
 * Validação e limpeza fora de ordem.
 *
 * 123 changesets do sistema terminam em `Bloomy.Helpers.trim_changed_fields/1`,
 * que apara os espaços **depois** de todas as validações. O que é conferido e o
 * que é gravado são valores diferentes.
 */
export interface FieldCheck {
  kind: "exact" | "max" | "min" | "pattern";
  /** Número de caracteres, ou a expressão, conforme o tipo. */
  value: number | string;
  /** Como a regra é dita para quem preenche. */
  message: string;
}

export interface ValidatedField {
  id: string;
  /** Onde no sistema esse campo aparece. */
  where: string;
  label: string;
  /** O que a pessoa enviou, espaços inclusive. */
  typed: string;
  check: FieldCheck;
  /**
   * A limpeza acontece depois da validação.
   *
   * `false` marca o contraexemplo que existe no mesmo repositório: o nome do
   * ponto de atendimento é normalizado com `update_change` **antes** do
   * `validate_format`.
   */
  trimsAfterValidation: boolean;
  source: string;
}

export interface FieldOrderingData {
  fields: ValidatedField[];
}

/**
 * Endereço do paciente.
 *
 * O cadastro decide se casa a associação com uma guarda de um campo só:
 *
 * ```elixir
 * defp maybe_cast_address(changeset, attrs) do
 *   if attrs["address"]["zip_code"] !== "" do
 *     cast_assoc(changeset, :address)
 *   else
 *     changeset
 *   end
 * end
 * ```
 */
export interface PatientAddressAttempt {
  id: string;
  patientName: string;
  zipCode: string;
  street: string;
  neighborhood: string;
  number: string;
  city: string;
  state: string;
  /** O paciente já tinha endereço gravado antes desta edição. */
  hadAddressBefore: boolean;
}

export interface PatientAddressData {
  attempts: PatientAddressAttempt[];
}

/**
 * Data de desativação do paciente.
 *
 * ```elixir
 * if current_user_role != "admin" and Date.compare(value, Date.utc_today()) == :lt,
 *   do: add_error(changeset, :deactivation_date, "Não pode ser uma data passada")
 * ```
 *
 * Duas coisas na mesma linha: a comparação com um papel que chega como átomo, e
 * a data de hoje medida em UTC.
 */
export interface DeactivationAttempt {
  id: string;
  patientName: string;
  actorName: string;
  /** O papel de quem está desativando. */
  actorRole: string;
  /**
   * O papel chega como texto.
   *
   * No monólito é sempre `false`: `user.roles` é uma lista de átomos, e os três
   * caminhos que produziriam a string `"admin"` são barrados pela mesma
   * comparação entre texto e átomo.
   */
  roleArrivesAsText: boolean;
  /** A data escolhida no formulário, em `YYYY-MM-DD`. */
  chosenDate: string;
  /** O instante local, com fuso, em que a pessoa aperta salvar. */
  submittedAt: string;
}

export interface DeactivationDateData {
  attempts: DeactivationAttempt[];
}

/**
 * Que dia o sistema acha que é.
 *
 * `Date.utc_today()` aparece 205 vezes fora de worker, em 133 arquivos.
 * `Bloomy.CalendarHelper.local_timezone/0` existe e é usado 104 vezes. O
 * sistema sabe o próprio fuso e pergunta a data para outro.
 */
export interface TodaySurface {
  id: string;
  where: string;
  what: string;
  /** O que acontece entre 21h e a meia-noite. */
  breaks: string;
  kind: "label" | "guard" | "input" | "age";
  source: string;
}

export interface TodayData {
  /** Chamadas a `Date.utc_today()` fora de worker. */
  utcCalls: number;
  /** Chamadas ao ajudante que conhece o fuso da clínica. */
  timezoneAwareCalls: number;
  filesAffected: number;
  /** O instante local a partir do qual a tela é lida. */
  now: string;
  /** Data de nascimento usada para demonstrar o cálculo de idade. */
  birthdate: string;
  surfaces: TodaySurface[];
}

/**
 * Auto check-in do totem público.
 *
 * Duas funções com o **mesmo nome**, no mesmo fluxo, perguntam que dia é hoje
 * de maneiras diferentes:
 *
 * ```elixir
 * # Checkin.get_scheduled_patients/1 — certo
 * date = DateTime.now!("America/Sao_Paulo") |> DateTime.to_date()
 *
 * # select_patient_step.ex get_scheduled_patients/3 — errado
 * date = Date.utc_today()
 * ```
 *
 * A tela usa a segunda.
 */
export interface CheckinArrival {
  id: string;
  guardianName: string;
  patientName: string;
  /** Instante local da chegada ao totem. */
  arrivedAt: string;
  /** Data e hora do atendimento marcado. */
  scheduleDate: string;
  scheduleTime: string;
}

export interface AutoCheckinData {
  arrivals: CheckinArrival[];
}

/**
 * Assinatura do plano de intervenção comportamental.
 *
 * O responsável assina pelo portal, e o sistema carimba a data:
 *
 * ```elixir
 * signed_at: Date.utc_today()
 * ```
 */
export interface PlanSignature {
  id: string;
  patientName: string;
  guardianName: string;
  /** Instante local em que o responsável apertou assinar. */
  signedAt: string;
  planStart: string;
  planEnd: string;
}

export interface PlanSignatureData {
  signatures: PlanSignature[];
}

/**
 * Escopo de pacientes por papel.
 *
 * `PatientPolicy.scope/2` decide quem vê quais pacientes. As cláusulas são
 * casadas na ordem em que estão escritas.
 */
export interface ScopeRule {
  id: string;
  role: string;
  /** O que a cláusula que de fato roda faz. */
  effective: string;
  /** O que uma cláusula posterior, morta, diz que aconteceria. */
  shadowed?: string;
  /** Como o escopo é expresso no código. */
  shape: "all" | "by-unit" | "by-own-schedules" | "empty" | "by-link" | "raises";
  source: string;
}

export interface PatientScopeData {
  rules: ScopeRule[];
}

/**
 * Assumir um agendamento de outro profissional.
 *
 * A troca acontece dentro de `Repo.transaction`, e o ramo que recusa devolve
 * `{:error, ...}` **sem** `Repo.rollback`. A transação comita, e o chamador
 * recebe `{:ok, {:error, ...}}`.
 */
export interface Handover {
  id: string;
  patientName: string;
  serviceName: string;
  /** Quem estava com o atendimento. */
  previousProfessional: string;
  /** Quem assumiu. */
  newProfessional: string;
  scheduleStart: string;
  /**
   * O responsável anterior já foi notificado sobre este agendamento hoje.
   *
   * É o que faz a rotina cair no ramo que devolve erro — e comitar mesmo assim.
   */
  alreadyNotifiedToday: boolean;
}

export interface HandoverData {
  handovers: Handover[];
}

/* ================================================================== *
 * Documentação — a pasta que decide quem pode atender por qual convênio
 * ================================================================== */

/**
 * O escopo do documento decide quem o mantém.
 *
 * Os três escopos existem no mesmo painel e **não** têm o mesmo dono. O escopo
 * profissional é do próprio cadastro do profissional, e é o único que a
 * operadora enxerga. Interno e ocupacional são da clínica: contrato, termos e
 * ASO nunca são compartilhados com convênio, e por isso não entram em nenhuma
 * conta de credenciamento.
 */
export type DocumentScope = "professional" | "internal" | "occupational" | "unit";

/**
 * Situação de um documento.
 *
 * Seis valores, e nenhum deles é armazenado: todos saem da validade contra a
 * data de referência. Guardar a situação criaria o pior defeito possível numa
 * pasta de documentos — um papel vencido que continua dizendo "válido" porque
 * ninguém rodou o recálculo.
 *
 * `no_expiry` é separado de `valid` de propósito. Os dois são aceitáveis, mas
 * só um deles volta a exigir atenção algum dia, e a diferença muda o que a
 * pessoa faz com a linha.
 */
export type DocumentState =
  | "valid"
  | "no_expiry"
  | "expiring"
  | "expired"
  | "missing"
  | "waived";

/**
 * Um tipo de documento do catálogo.
 *
 * `standard` e `required` são coisas diferentes e é fácil confundi-las.
 * `standard` diz que o tipo **aparece como lacuna** mesmo sem arquivo — a pasta
 * mostra o buraco. `required` diz que ele **conta na completude**. Há tipo
 * padrão que não é obrigatório (a carteirinha do conselho aparece vazia e não
 * derruba o percentual) e o contrário não existe.
 */
export interface DocumentType {
  id: string;
  scope: DocumentScope;
  /** Nome por extenso, o que a pessoa lê no formulário. */
  name: string;
  /** Abreviação para cabeçalho de matriz, onde não cabe o nome. */
  short: string;
  standard: boolean;
  required: boolean;
  /** Se falso, um documento deste tipo nunca vence. */
  expires: boolean;
  /**
   * Cadência de renovação, quando o tipo tem uma — "anual", "a cada seis meses".
   *
   * É campo e não parte do `hint` porque é dado que a tela mostra ao lado da
   * validade. Dentro da frase, nenhuma tela conseguia lê-lo.
   */
  renewal?: string;
  icon: string;
  hint: string;
}

/** A operadora, do ponto de vista do credenciamento. */
export interface DocumentInsurer {
  id: string;
  name: string;
  /** `particular` não credencia ninguém e não recebe documento. */
  kind: "health_care" | "particular";
  /** Tipos exigidos por esta operadora para credenciar um profissional. */
  requires: string[];
}

/**
 * Um documento do profissional.
 *
 * `file` ausente é o estado que mais engana: a linha existe, o tipo está
 * escolhido, a validade está preenchida — e não há papel nenhum. Um documento
 * sem arquivo não satisfaz exigência de operadora e não entra em exportação.
 */
export interface ProfessionalDocument {
  id: string;
  typeId: string;
  name: string;
  /** Número de inscrição ou do próprio documento, quando o tipo tem um. */
  number?: string;
  /** Nome do arquivo anexado. Ausente significa que não há anexo. */
  file?: string;
  updatedAt: string;
  /** Ausente significa que o documento não vence. */
  validUntil?: string;
  /** Carga horária, quando o tipo é curso de ABA. */
  hours?: number;
  /** Abordagem certificada, quando o tipo é formação especial. */
  training?: string;
  /** Dispensado para este profissional: sai da conta de completude. */
  waived?: boolean;
  /** Com quais operadoras este documento foi compartilhado, e quando. */
  sharedWith: { insurerId: string; at: string }[];
}

/**
 * Situação do credenciamento de um profissional numa operadora.
 *
 * Três destes quatro são derivados dos documentos compartilhados. O quarto,
 * `decredentialed`, é o único que uma pessoa digita — e é o único que o
 * recálculo não pode desfazer.
 */
export type CredentialStatus =
  | "not_credentialed"
  | "in_credentialing"
  | "credentialed"
  | "decredentialed";

export interface CredentialLink {
  professionalId: string;
  insurerId: string;
  status: CredentialStatus;
  /** Data em que o primeiro documento foi compartilhado. */
  since: string;
  /** Decisão registrada por uma pessoa. Blinda o vínculo do recálculo. */
  manual: boolean;
}

/** O profissional, do ponto de vista da pasta de documentos. */
export interface DocumentSubject {
  id: string;
  name: string;
  specialty: string;
  council?: string;
  /** Papéis por unidade, como aparecem na coluna Tipo. */
  types?: string[];
  /** Formação em saúde, com o conselho entre parênteses. */
  formation?: string;
  phone?: string;
  email?: string;
  patients?: number;
  weeklyHours?: number;
  occupancy?: string;
  absences?: number;
  /** Espaço reservado na agenda. */
  tbd?: boolean;
  active: boolean;
  /** Data de saída marcada. Presente e futura significa "em inativação". */
  deactivationDate?: string;
}

/** A aba Documentos de um profissional. */
export interface ProfessionalDocumentsData {
  now: string;
  professional: DocumentSubject;
  documents: ProfessionalDocument[];
  insurers: DocumentInsurer[];
  links: CredentialLink[];
}

/**
 * O mês fechado de um profissional, como o controle de horas o mostra.
 *
 * `plannedHours` vem da escala e `workedHours` do que foi atendido — e eles
 * divergem de propósito. É a divergência que a tela existe para mostrar: quem
 * trabalhou mais do que a escala previa e quem trabalhou menos.
 */
export interface ProfessionalHours {
  plannedHours: number;
  workedHours: number;
  appointments: number;
  compensationCents: number;
}

/** Uma linha da matriz de documentação da equipe. */
export interface TeamDocumentationRow {
  professional: DocumentSubject;
  documents: ProfessionalDocument[];
  links: CredentialLink[];
  /** Ausente quando o mês não tem apuração para esta pessoa. */
  hours?: ProfessionalHours;
}

export interface TeamDocumentationData {
  now: string;
  rows: TeamDocumentationRow[];
  insurers: DocumentInsurer[];
}

/**
 * Um documento da unidade.
 *
 * `validFrom` não existe no documento do profissional e existe aqui porque
 * alvará e licença são emitidos antes de passarem a valer. Sem esse campo, um
 * documento que só vale no mês que vem aparece como se já valesse.
 */
export interface UnitDocument {
  id: string;
  typeId: string;
  name: string;
  responsible: string;
  validFrom?: string;
  validUntil?: string;
  updatedAt: string;
  file?: string;
  sharedWith: string[];
}

/**
 * A unidade como o cabeçalho dela mostra.
 *
 * Espelha o que `UnitLive.Components.CardHeader` lê: nome, situação, telefone,
 * endereço por extenso e duas contagens. As contagens não são campo da unidade —
 * saem de `count_unit_rooms/1` e `count_unit_professionals/1`, que o componente
 * chama no `update`. Estão aqui porque quem desenha o cabeçalho precisa saber que
 * elas existem e que são derivadas.
 */
export interface UnitProfile {
  id: string;
  name: string;
  active: boolean;
  phone: string;
  cnpj: string;
  cnes: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  /** Salas cadastradas. Derivado, não armazenado. */
  rooms: number;
  /** Profissionais vinculados. Derivado, não armazenado. */
  professionals: number;
}

export interface UnitDocumentsData {
  now: string;
  unit: UnitProfile;
  documents: UnitDocument[];
  insurers: DocumentInsurer[];
}


/**
 * A operadora como o cabeçalho dela mostra.
 *
 * Espelha o que `HealthCareLive.Components.CardHeader` lê de `health_cares`:
 * registro ANS, contagem de planos, telefone, e-mail e observação. `DocumentInsurer`
 * continua sendo a referência leve — id, nome, natureza e o que a operadora exige —
 * e é ela que viaja nas listas; estes campos só a ficha carrega.
 *
 * Os quatro últimos são opcionais no schema, e o original imprime `"-"` quando
 * faltam. Quem desenhar o cabeçalho precisa saber disso: uma operadora recém
 * cadastrada tem nome, ANS e mais nada.
 */
export interface InsurerProfile {
  /**
   * `ans_register`. O changeset valida `~r/\d{5}-\d/` — cinco dígitos, hífen e o
   * dígito verificador. É por isso que o cabeçalho mostra "33967-9", e não
   * "339679".
   */
  ansRegister?: string;
  /** `plan_count` — virtual no schema, contado na consulta que abre a ficha. */
  planCount: number;
  phone?: string;
  email?: string;
  /**
   * `observation` — o texto livre do modal de observações.
   *
   * Presente, acende o sino no botão: é o `notification_badge` de
   * `card_header.ex`, e é a única pista de que existe algo escrito ali.
   */
  observation?: string;
}

/** A ficha da operadora, do ponto de vista dos documentos. */
export interface InsurerDocumentsData {
  now: string;
  insurer: DocumentInsurer;
  /** Os campos que só o cabeçalho da ficha usa. */
  profile: InsurerProfile;
  professionals: TeamDocumentationRow[];
  units: {
    unit: Unit;
    city: string;
    documents: UnitDocument[];
  }[];
}

/**
 * Uma unidade na lista de Unidades.
 *
 * É o perfil mais os documentos: a lista mostra as colunas do cabeçalho, e
 * clicar numa linha abre a pasta com o mesmo dado. Uma linha que não carregasse o
 * perfil inteiro obrigaria a pasta a buscar de novo o que a lista já tinha.
 */
export interface UnitListing extends UnitProfile {
  /** Quantos dos doze documentos padrão estão em ordem. */
  documents: UnitDocument[];
}

export interface UnitListData {
  now: string;
  units: UnitListing[];
  insurers: DocumentInsurer[];
}

/**
 * Uma operadora na lista de Operadoras.
 *
 * As quatro colunas de `health_care_live/index.ex` são nome, registro ANS,
 * endereço e cidade — e o endereço é uma associação, não campo da operadora: o
 * `list/1` faz `preload(:address)`, e uma operadora sem endereço não passa no
 * changeset (`cast_assoc(:address, required: true)`).
 *
 * Como em `UnitListing`, a linha carrega o **perfil inteiro** e não só as quatro
 * colunas: a lista e a ficha são o mesmo fluxo, e uma linha que não trouxesse o
 * perfil obrigaria a ficha a buscar de novo o que a lista já tinha.
 *
 * Vale saber que no monólito não é assim, e a diferença é intencional: `plan_count`
 * é virtual e só é calculado em `get_health_care!/2`; o `list/1` não conta plano
 * nenhum, porque a lista não tem essa coluna e a contagem custaria uma consulta por
 * linha. Quem implementar mantém as duas consultas separadas — aqui elas são uma
 * fixture só para não obrigar a trocar o seletor de dados no meio do caminho.
 *
 * O credenciamento é o que a aba nova acrescenta, e é derivado: sai dos documentos
 * dos profissionais e das unidades contra o `requires` da operadora.
 */
export interface InsurerListing {
  insurer: DocumentInsurer;
  /** Os campos do cabeçalho da ficha, incluindo o registro ANS que a lista mostra. */
  profile: InsurerProfile;
  street: string;
  number: string;
  complement?: string;
  city: string;
  /** Profissionais da clínica, para contar credenciamento contra esta operadora. */
  professionals: TeamDocumentationRow[];
  /** Unidades da clínica, para o mesmo cálculo do outro lado. */
  units: {
    unit: Unit;
    city: string;
    documents: UnitDocument[];
  }[];
}

export interface InsurerListData {
  now: string;
  insurers: InsurerListing[];
}
