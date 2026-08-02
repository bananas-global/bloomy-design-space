import { describe, expect, it } from "vitest";
import type {
  Appointment,
  ChatData,
  HourMap,
  HourMapSlot,
  ManagementData,
  MentorshipGap,
  ReportControl,
  PatientDocument,
  PatientRecord as PatientRecordType,
  Room,
  Service,
  StructureData,
  AttendanceRow,
  InsurerPortalData,
  GuardianPlan,
  GuardianPortalData,
  SupervisionLink,
  TeamMember,
  HealthcareInvoice,
  InvoiceLine,
  Closure,
  Authorization,
  AuthorizationPackage,
  ClinicalSession,
  ClinicalSessionData,
  Criteria,
  DaySchedule,
  InClinicData,
  InterventionPlan,
  Patient,
  PlanProgram,
  PlanStep,
  Protocol,
  ProtocolQuestion,
  StepSessionResult,
} from "../src/contracts/index.js";
import { ageInYears, isMinor, TODAY } from "../src/contracts/index.js";
import {
  canCancel,
  canMarkNoShow,
  findConflicts,
  NO_SHOW_TOLERANCE_MINUTES,
  wouldConflict,
} from "../src/rules/agenda.js";
import { canReadRecord, canSchedule, missingRequiredFields } from "../src/rules/patients.js";
import {
  canRevert,
  canSign,
  canStartSession,
  countTrials,
  isRegisterEmpty,
  pendingSigner,
  pendingWork,
  requiresCheckin,
  statusAfterFinish,
  statusAfterRevert,
  statusAfterSign,
} from "../src/rules/session.js";
import {
  canEditProgram,
  cascadeFrom,
  criteriaSentence,
  isSuperseded,
  meetsMastery,
  objectiveWouldBeAcquired,
  programWouldBeAcquired,
  regressionTarget,
  sessionsRemaining,
  sessionsTowardMastery,
} from "../src/rules/programs.js";
import {
  answerControl,
  areaProgress,
  completion,
  daysUntilReassessment,
  isComplete,
  neighbour,
  nextUnanswered,
  reassessmentDate,
} from "../src/rules/protocols.js";
import {
  canCheckin,
  presenceAlert,
  schedulesAfterCheckin,
  schedulesAfterCheckout,
  visibleTabs,
} from "../src/rules/inClinic.js";
import {
  actor,
  canEditAuthorization,
  canScheduleAgainst,
  daysUntilExpiry,
  maxAllowed,
  nextActionFor,
  queueOrder,
  remaining,
  shortfall,
} from "../src/rules/authorizations.js";
import {
  canAttachInvoice,
  canAttachPaymentProof,
  canChangeStatusTo,
  canConfirmPayment,
  canInteract,
  expectsInvoice,
  nextStep,
  visibleClosures,
} from "../src/rules/closures.js";
import {
  billableLines,
  canFinishInvoice,
  excludedLines,
  invoiceTotalCents,
  lineTotalCents,
  linesWithoutAgreement,
  missingInvoiceFields,
  missingTissSetup,
  sessionsWithoutAgreement,
} from "../src/rules/invoices.js";
import {
  canDeactivate,
  canLinkSupervisor,
  closureExpectsInvoice,
  downstreamEffects,
  isContractActiveOn,
  missingContractRates,
  missingProfessionalFields,
  requiresSupervisorSignature,
  signingSupervisors,
} from "../src/rules/team.js";
import {
  actionFor,
  canSubmitNps,
  errorMessage,
  identify,
  isValidCpf,
  isValidNpsCode,
  kioskError,
  nextStep as nextKioskStep,
  npsBand,
  stepIndex,
  validateNps,
} from "../src/rules/publicPortal.js";
import {
  acceptPlan,
  canAcceptPlan,
  hasAcceptedTerms,
  isExpired,
  missingTermsContext,
  overlappingPlans,
  plansAwaitingAcceptance,
  upcomingSchedules,
} from "../src/rules/guardianPortal.js";
import {
  NOT_SHARED_WITH_INSURER,
  attendanceSummary,
  hiddenFromInsurer,
  isBeneficiary,
  notDeliveredReason,
  wasDelivered,
} from "../src/rules/insurerPortal.js";
import {
  blockingMessage,
  blockingsAt,
  canUseRoom,
  isImpossibleToSchedule,
  roomServes,
  roomsFor,
  serviceEffects,
  skipsCheckin,
} from "../src/rules/structure.js";
import {
  absenceAlerts,
  canFinishAnamnese,
  canViewDocument,
  currentMonolithBehaviour,
  documentValidity,
  documentsNeedingAttention,
  hasCriteria,
  missingBehaviors,
} from "../src/rules/record.js";
import {
  canOpenManagement,
  daysLate,
  daysWithoutOwner,
  fronts,
  isBlocking,
  isOverdue,
  mentorshipConsequence,
  overdueConsequence,
  reportQueue,
} from "../src/rules/management.js";
import {
  PROFESSIONAL_CONFLICTS,
  ROOM_CONFLICTS,
  canApply,
  canEdit,
  conflictMessage,
  incompleteSlots,
  losesProfessional,
  losesRoom,
  mapSummary,
  weekdayLabel,
  weeklyMinutes,
} from "../src/rules/hourMap.js";
import {
  CHAT_ROLES,
  canEditMessage,
  canReadChat,
  canSend,
  extractMentions,
  inOrder,
  mentionsOfCurrentUser,
  mentionsWithoutAccess,
  participatingRoles,
} from "../src/rules/chat.js";

/**
 * Testes das regras de negócio.
 *
 * Regra sem teste é frase que a engenharia vai reinterpretar. Estes testes são o
 * que o handoff pode citar: cada um deles é um critério de aceite executável.
 */

const professional = { id: "p-1", name: "Dra. Helena Braga", specialty: "Clínica geral" };
const at = (time: string) => `${TODAY}T${time}:00.000-03:00`;

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "ap-1",
    patient: { id: "pt-1", name: "Ana Moreira", birthDate: "1988-04-12" },
    professional,
    procedure: "Consulta",
    start: at("09:30"),
    end: at("10:00"),
    status: "scheduled",
    ...overrides,
  };
}

/* ================================================================== agenda */

describe("cancel-requires-permission", () => {
  it("bloqueia quem não tem schedules.cancel, dizendo a quem pedir", () => {
    const result = canCancel(appointment(), ["schedules.list", "schedules.edit"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/recepção ou à coordenação/);
  });

  it("permite quem tem a permissão", () => {
    expect(canCancel(appointment(), ["schedules.cancel"]).allowed).toBe(true);
  });

  it("não cancela o que já está cancelado nem o que já foi finalizado", () => {
    expect(canCancel(appointment({ status: "cancelled" }), ["schedules.cancel"]).allowed).toBe(false);
    expect(canCancel(appointment({ status: "finished" }), ["schedules.cancel"]).allowed).toBe(false);
  });
});

describe("no-show-after-tolerance", () => {
  const permissions = ["schedules.edit"];

  it("bloqueia antes da tolerância, informando quantos minutos faltam", () => {
    const result = canMarkNoShow(appointment(), permissions, at("09:38"));
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Faltam 7/);
  });

  it("libera exatamente na fronteira da tolerância", () => {
    expect(canMarkNoShow(appointment(), permissions, at("09:45")).allowed).toBe(true);
    expect(NO_SHOW_TOLERANCE_MINUTES).toBe(15);
  });

  it("bloqueia por permissão antes de olhar o relógio", () => {
    const result = canMarkNoShow(appointment(), ["schedules.list"], at("11:00"));
    expect(result.reason).toMatch(/não registra ausência/);
  });

  it("não transforma em ausência o que já foi finalizado", () => {
    expect(
      canMarkNoShow(appointment({ status: "finished" }), permissions, at("11:00")).allowed,
    ).toBe(false);
  });
});

describe("no-double-booking", () => {
  const confirmed = appointment({ id: "ap-a", start: at("10:00"), end: at("10:45"), status: "confirmed" });
  const overlapping = appointment({ id: "ap-b", start: at("10:15"), end: at("11:00") });
  const adjacent = appointment({ id: "ap-c", start: at("10:45"), end: at("11:15") });

  it("detecta sobreposição real entre dois atendimentos da mesma profissional", () => {
    const conflicts = findConflicts([confirmed, overlapping]);
    expect(conflicts.get("ap-a")).toEqual(["ap-b"]);
    expect(conflicts.get("ap-b")).toEqual(["ap-a"]);
  });

  it("não considera conflito horário que só encosta na borda", () => {
    expect(findConflicts([confirmed, adjacent]).size).toBe(0);
  });

  it("ignora cancelado e ausente: o horário voltou a estar livre", () => {
    const cancelled = { ...overlapping, status: "cancelled" as const };
    expect(findConflicts([confirmed, cancelled]).size).toBe(0);
    expect(findConflicts([confirmed, { ...overlapping, status: "no_show" as const }]).size).toBe(0);
  });

  it("não considera conflito entre profissionais diferentes", () => {
    const other = {
      ...overlapping,
      professional: { id: "p-2", name: "Dr. Rui Alencar", specialty: "Ortopedia" },
    };
    expect(findConflicts([confirmed, other]).size).toBe(0);
  });

  it("avalia o horário pretendido antes de confirmar o reagendamento", () => {
    expect(
      wouldConflict(overlapping, { start: at("10:15"), end: at("11:00") }, [confirmed, overlapping]),
    ).toBe(true);
    expect(
      wouldConflict(overlapping, { start: at("11:45"), end: at("12:30") }, [confirmed, overlapping]),
    ).toBe(false);
  });
});

/* =============================================================== pacientes */

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: "pt-1",
    name: "Ana Moreira",
    birthDate: "1988-04-12",
    cpf: "000.111.222-00",
    missingFields: [],
    recordRestricted: false,
    ...overrides,
  };
}

describe("idade e menoridade", () => {
  it("mede contra a data de referência do ambiente, não contra o relógio", () => {
    expect(ageInYears("1988-04-12")).toBe(38);
    // Aniversário depois da data de referência: ainda não completou.
    expect(ageInYears("1988-08-12")).toBe(37);
    expect(ageInYears("2011-09-08")).toBe(14);
  });

  it("classifica menoridade pela mesma referência", () => {
    expect(isMinor({ id: "x", name: "x", birthDate: "2011-09-08" })).toBe(true);
    expect(isMinor({ id: "x", name: "x", birthDate: "2008-07-29" })).toBe(false);
  });
});

describe("incomplete-registration-blocks-scheduling", () => {
  it("bloqueia nomeando os campos que faltam", () => {
    const result = canSchedule(patient({ missingFields: ["CPF", "convênio"] }), ["schedules.create"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Cadastro incompleto. Falta: CPF, convênio.");
  });

  it("permite quando o cadastro está completo", () => {
    expect(canSchedule(patient(), ["schedules.create"]).allowed).toBe(true);
  });

  it("bloqueia por permissão antes de olhar o cadastro", () => {
    expect(canSchedule(patient(), ["patients.show"]).reason).toMatch(/não cria agendamentos/);
  });
});

describe("minor-requires-guardian", () => {
  const minor = patient({ id: "pt-4", birthDate: "2011-09-08" });

  it("bloqueia menor sem responsável, mesmo com todos os campos preenchidos", () => {
    expect(minor.missingFields).toEqual([]);
    const result = canSchedule(minor, ["schedules.create"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/menor de idade sem responsável/);
  });

  it("acrescenta o responsável à lista de pendências do cadastro", () => {
    expect(missingRequiredFields(minor)).toEqual(["responsável legal"]);
  });

  it("permite menor com responsável cadastrado", () => {
    const withGuardian = {
      ...minor,
      guardian: { name: "Renata", relation: "mãe", cpf: "000.777.888-00", phone: "(11) 90000-0007" },
    };
    expect(canSchedule(withGuardian, ["schedules.create"]).allowed).toBe(true);
    expect(missingRequiredFields(withGuardian)).toEqual([]);
  });
});

describe("restricted-record-requires-permission", () => {
  const restricted = patient({ recordRestricted: true });

  it("bloqueia prontuário restrito para quem só tem leitura comum", () => {
    const result = canReadRecord(restricted, ["patients.show", "patients.see_clinic_overview"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/acesso restrito/);
  });

  it("libera para quem tem a permissão específica", () => {
    expect(
      canReadRecord(restricted, ["patients.see_clinic_overview", "patients.view_clinical_document"]).allowed,
    ).toBe(true);
  });

  it("prontuário não restrito segue a permissão comum", () => {
    expect(canReadRecord(patient(), ["patients.see_clinic_overview"]).allowed).toBe(true);
    expect(canReadRecord(patient(), ["patients.show"]).allowed).toBe(false);
  });
});

/* ============================================================ atendimento */

/**
 * O ciclo de vida do atendimento é onde o Bloomy concentra regra de negócio.
 * Estes testes existem para que a engenharia não precise reler quatro módulos de
 * Elixir para saber em que ordem as guardas disparam — e a ordem é metade da
 * regra: dizer "falta check-in" para quem esqueceu de fechar o atendimento
 * anterior manda a pessoa resolver o problema errado.
 */

function clinicalSession(overrides: Partial<ClinicalSession> = {}): ClinicalSession {
  return {
    id: "atd-1",
    scheduleId: "agd-1",
    status: "ready_for_service",
    scheduleType: "patient",
    sessionType: "in_person",
    location: "in_clinic",
    patient: { id: "pac-1", name: "Théo Andrade Lins", birthDate: "2019-11-04" },
    professionals: [{ id: "prof-marina", name: "Marina Okabe", specialty: "Aplicador ABA" }],
    supervisor: { id: "prof-clara", name: "Clara Vidigal", specialty: "Psicologia" },
    needsSupervisorSignature: true,
    service: { name: "Terapia ABA", chargeable: true },
    start: "2026-07-30T14:00:00.000-03:00",
    end: "2026-07-30T15:00:00.000-03:00",
    now: "2026-07-30T14:02:00.000-03:00",
    checkin: { at: "2026-07-30T13:51:00.000-03:00", by: "web" },
    register: "",
    programExecutions: [],
    protocolAnswers: 0,
    signatures: [],
    ...overrides,
  };
}

function clinicalData(
  session: ClinicalSession,
  open: ClinicalSessionData["openSessionsForProfessional"] = [],
): ClinicalSessionData {
  return { session, openSessionsForProfessional: open };
}

const REGISTRA = ["custom_services.edit", "patients.see_clinic_overview"];
const REVERTE = [...REGISTRA, "custom_services.revert"];

describe("session-requires-checkin", () => {
  it("bloqueia paciente sem check-in em serviço cobrável, nomeando quem falta", () => {
    const result = canStartSession(
      clinicalData(clinicalSession({ status: "scheduled", checkin: undefined })),
      REGISTRA,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Théo Andrade Lins ainda não fez check-in/);
  });

  it("dispensa o check-in quando o serviço não é cobrável", () => {
    const session = clinicalSession({
      status: "scheduled",
      checkin: undefined,
      service: { name: "Devolutiva", chargeable: false },
    });
    expect(requiresCheckin(session)).toBe(false);
    expect(canStartSession(clinicalData(session), REGISTRA).allowed).toBe(true);
  });

  it("dispensa o check-in em atendimento entre profissionais", () => {
    const session = clinicalSession({
      status: "scheduled",
      scheduleType: "professional",
      checkin: undefined,
    });
    expect(requiresCheckin(session)).toBe(false);
    expect(canStartSession(clinicalData(session), REGISTRA).allowed).toBe(true);
  });

  it("aceita começar em não iniciado e em atrasado: o check-in já aconteceu", () => {
    for (const status of ["ready_for_service", "not_started", "delayed"] as const) {
      expect(canStartSession(clinicalData(clinicalSession({ status })), REGISTRA).allowed).toBe(
        true,
      );
    }
  });
});

describe("one-open-session-per-professional", () => {
  const aberto = [
    { id: "atd-0", patientName: "Isadora Bueno", start: "2026-07-30T13:00:00.000-03:00" },
  ];

  it("bloqueia nomeando o paciente e o horário do atendimento em aberto", () => {
    const result = canStartSession(clinicalData(clinicalSession(), aberto), REGISTRA);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Isadora Bueno, das 13:00/);
  });

  it("vem antes do bloqueio por check-in, como no monólito", () => {
    // Sem check-in E com atendimento aberto: a pessoa precisa fechar o outro
    // atendimento, e mandá-la à recepção seria mandá-la ao lugar errado.
    const result = canStartSession(
      clinicalData(clinicalSession({ status: "scheduled", checkin: undefined }), aberto),
      REGISTRA,
    );
    expect(result.reason).toMatch(/já tem um atendimento em aberto/);
  });

  it("bloqueia por permissão antes de tudo", () => {
    const result = canStartSession(clinicalData(clinicalSession(), aberto), [
      "patients.see_clinic_overview",
    ]);
    expect(result.reason).toMatch(/não registra atendimento/);
  });
});

describe("empty-register-blocks-signature", () => {
  it("evolução vazia leva a pendente de registro, não a assinatura", () => {
    expect(statusAfterFinish(clinicalSession({ register: "" }))).toBe("pending_register");
  });

  it("texto só com marcação continua contando como vazio", () => {
    // O monólito passa por `strip_tags` antes de medir: um parágrafo vazio
    // deixado por editor de texto rico não é evolução escrita.
    expect(statusAfterFinish(clinicalSession({ register: "<p></p>  " }))).toBe("pending_register");
    expect(isRegisterEmpty(clinicalSession({ register: "<p> </p>" }))).toBe(true);
  });

  it("evolução escrita leva a assinatura pendente", () => {
    expect(statusAfterFinish(clinicalSession({ register: "<p>Boa sessão.</p>" }))).toBe(
      "pending_signature",
    );
  });

  it("atendimento entre profissionais finaliza direto, sem registro nem assinatura", () => {
    expect(statusAfterFinish(clinicalSession({ scheduleType: "professional", register: "" }))).toBe(
      "finished",
    );
  });
});

describe("owner-signs-before-supervisor", () => {
  const pendente = clinicalSession({ status: "pending_signature", register: "<p>ok</p>" });

  it("o responsável assina primeiro", () => {
    expect(canSign(pendente, "prof-marina").allowed).toBe(true);
  });

  it("o supervisor não pode furar a fila, e a negativa diz quem assina antes", () => {
    const result = canSign(pendente, "prof-clara");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/primeiro por Marina Okabe/);
  });

  it("na etapa do supervisor, o responsável já não assina", () => {
    const supervisao = clinicalSession({ status: "pending_supervisor_signature" });
    expect(canSign(supervisao, "prof-marina").reason).toMatch(/deve ser feita por Clara Vidigal/);
    expect(canSign(supervisao, "prof-clara").allowed).toBe(true);
  });

  it("não assina o que não está pendente de assinatura", () => {
    expect(canSign(clinicalSession({ status: "finished" }), "prof-marina").reason).toMatch(
      /não possui a assinatura como pendente/,
    );
    expect(canSign(clinicalSession({ status: "ongoing" }), "prof-marina").allowed).toBe(false);
  });

  it("em atendimento entre profissionais, qualquer participante assina", () => {
    const reuniao = clinicalSession({
      status: "pending_signature",
      scheduleType: "professional",
      professionals: [
        { id: "prof-marina", name: "Marina Okabe", specialty: "Aplicador ABA" },
        { id: "prof-clara", name: "Clara Vidigal", specialty: "Psicologia" },
      ],
    });
    expect(canSign(reuniao, "prof-clara").allowed).toBe(true);
    expect(canSign(reuniao, "prof-estranho").reason).toMatch(/que participaram/);
  });

  it("a assinatura do responsável só vai a supervisão quando o atendimento exige", () => {
    expect(statusAfterSign(pendente)).toBe("pending_supervisor_signature");
    expect(statusAfterSign({ ...pendente, needsSupervisorSignature: false })).toBe("finished");
    expect(statusAfterSign(clinicalSession({ status: "pending_supervisor_signature" }))).toBe(
      "finished",
    );
  });

  it("nomeia quem a cadeia espera agora", () => {
    expect(pendingSigner(pendente)).toEqual({
      name: "Marina Okabe",
      role: "responsável pelo atendimento",
    });
    expect(pendingSigner(clinicalSession({ status: "pending_supervisor_signature" }))).toEqual({
      name: "Clara Vidigal",
      role: "supervisor",
    });
    expect(pendingSigner(clinicalSession({ status: "finished" }))).toBeUndefined();
  });
});

describe("revert-requires-clean-session", () => {
  const comTentativa = clinicalSession({
    status: "ongoing",
    programExecutions: [
      {
        id: "pe-1",
        programId: "prog-1",
        programName: "Imitação motora grossa",
        programType: "structured",
        result: "pending",
        steps: [
          {
            id: "s-1",
            name: "Bater palmas",
            phase: "intervention",
            targetTrials: 10,
            trials: [{ id: "t-1", result: "success", at: "2026-07-30T14:06:00.000-03:00" }],
          },
        ],
      },
    ],
  });

  it("libera enquanto nada clínico foi registrado", () => {
    expect(canRevert(clinicalSession({ status: "ongoing" }), REVERTE).allowed).toBe(true);
  });

  it("bloqueia contando as tentativas que seriam apagadas", () => {
    const result = canRevert(comTentativa, REVERTE);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Uma tentativa de programa já foi registrada/);
    expect(countTrials(comTentativa)).toBe(1);
  });

  it("concorda em número com o plural", () => {
    const duas = {
      ...comTentativa,
      programExecutions: [
        {
          ...comTentativa.programExecutions[0]!,
          steps: [
            {
              ...comTentativa.programExecutions[0]!.steps[0]!,
              trials: [
                { id: "t-1", result: "success" as const, at: "2026-07-30T14:06:00.000-03:00" },
                { id: "t-2", result: "failure" as const, at: "2026-07-30T14:08:00.000-03:00" },
              ],
            },
          ],
        },
      ],
    };
    expect(canRevert(duas, REVERTE).reason).toMatch(/2 tentativas de programa já foram/);
  });

  it("resposta de protocolo bloqueia igual a tentativa de programa", () => {
    const result = canRevert(clinicalSession({ status: "ongoing", protocolAnswers: 3 }), REVERTE);
    expect(result.reason).toMatch(/3 respostas de protocolo já foram registradas/);
  });

  it("bloqueia por permissão antes de contar o que existe", () => {
    expect(canRevert(comTentativa, REGISTRA).reason).toMatch(/não reverte atendimentos/);
  });
});

describe("para onde o agendamento volta ao reverter", () => {
  it("volta a pronto quando é de hoje e há check-in de hoje", () => {
    expect(statusAfterRevert(clinicalSession({ status: "ongoing" }))).toBe("ready_for_service");
  });

  it("volta a agendado quando é de hoje e não há check-in de hoje", () => {
    expect(statusAfterRevert(clinicalSession({ status: "ongoing", checkin: undefined }))).toBe(
      "scheduled",
    );
  });

  it("volta a não iniciado quando o agendamento não é de hoje", () => {
    // Reverter no dia seguinte não pode devolver a "pronto": o paciente foi
    // para casa, e a recepção precisaria fazer um novo check-in.
    const ontem = clinicalSession({
      status: "ongoing",
      start: "2026-07-29T14:00:00.000-03:00",
      checkin: { at: "2026-07-29T13:51:00.000-03:00", by: "web" },
    });
    expect(statusAfterRevert(ontem)).toBe("not_started");
  });

  it("atendimento entre profissionais volta sempre a agendado", () => {
    expect(statusAfterRevert(clinicalSession({ scheduleType: "professional" }))).toBe("scheduled");
  });
});

describe("o que ainda falta acontecer", () => {
  it("traduz cada situação pendente para uma frase de ação", () => {
    expect(pendingWork(clinicalSession({ status: "pending_register" }))).toMatch(
      /escrever a evolução/,
    );
    expect(pendingWork(clinicalSession({ status: "pending_signature" }))).toMatch(
      /assinatura de Marina Okabe/,
    );
    expect(pendingWork(clinicalSession({ status: "ready_for_service" }))).toMatch(
      /aguardando o início/,
    );
  });

  it("não inventa pendência para o que está fechado", () => {
    expect(pendingWork(clinicalSession({ status: "finished" }))).toBeUndefined();
    expect(pendingWork(clinicalSession({ status: "cancelled" }))).toBeUndefined();
  });
});

/* ============================================================== programas */

/**
 * As regras de aquisição são as que mais custam quando erram, porque erram em
 * silêncio: um passo muda de fase sem ninguém apertar nada, e a diferença entre
 * consecutivo e cumulativo só aparece meses depois, num relatório.
 */

const criterio = (
  performance: number,
  frequency: number,
  criteria: "consecutive" | "cumulative" = "consecutive",
): Criteria => ({ criteria, frequency, performance });

const historico = (...performances: number[]): StepSessionResult[] =>
  performances.map((performance, index) => ({
    date: `2026-07-${String(2 + index * 7).padStart(2, "0")}`,
    performance,
  }));

describe("consecutive-differs-from-cumulative", () => {
  const alvo80 = historico(90, 50, 85, 90);

  it("consecutivo conta de trás para frente e para na primeira abaixo do alvo", () => {
    expect(sessionsTowardMastery(alvo80, criterio(80, 3, "consecutive"))).toBe(2);
  });

  it("cumulativo conta todas que atingiram, em qualquer ordem", () => {
    expect(sessionsTowardMastery(alvo80, criterio(80, 3, "cumulative"))).toBe(3);
  });

  it("o mesmo histórico fecha o cumulativo e não fecha o consecutivo", () => {
    // É o caso do passo que oscila — e é exatamente ele que a decisão clínica
    // quer enxergar antes de avançar de fase.
    expect(meetsMastery(alvo80, criterio(80, 3, "cumulative"))).toBe(true);
    expect(meetsMastery(alvo80, criterio(80, 3, "consecutive"))).toBe(false);
  });

  it("uma recaída zera semanas de progresso no consecutivo", () => {
    const recaida = historico(90, 90, 90, 40);
    expect(sessionsTowardMastery(recaida, criterio(80, 3, "consecutive"))).toBe(0);
    expect(sessionsTowardMastery(recaida, criterio(80, 3, "cumulative"))).toBe(3);
  });
});

describe("mastery-closes-phase", () => {
  it("fecha quando a contagem alcança a frequência exigida", () => {
    expect(meetsMastery(historico(85, 90, 95), criterio(80, 3))).toBe(true);
    expect(meetsMastery(historico(85, 90), criterio(80, 3))).toBe(false);
  });

  it("conta o que falta sem cair para negativo", () => {
    expect(sessionsRemaining(historico(85, 90), criterio(80, 3))).toBe(1);
    expect(sessionsRemaining(historico(85, 90, 95, 100), criterio(80, 3))).toBe(0);
  });

  it("o desempenho exatamente no alvo conta", () => {
    // Fronteira: `>=`, não `>`. Combinar 80% e reprovar quem fez 80% seria
    // desmentir o critério que a clínica acertou com a família.
    expect(sessionsTowardMastery(historico(80, 80, 80), criterio(80, 3))).toBe(3);
  });
});

describe("baseline-has-no-performance-target", () => {
  it("com alvo zero, toda sessão conta e o critério vira contagem pura", () => {
    expect(sessionsTowardMastery(historico(20, 10, 0), criterio(0, 3))).toBe(3);
    expect(meetsMastery(historico(20, 10, 0), criterio(0, 3))).toBe(true);
  });

  it("a frase da linha de base não menciona percentual", () => {
    expect(criteriaSentence(criterio(0, 3), "baseline")).toBe(
      "3 sessões registradas, sem meta de acerto",
    );
  });

  it("as demais fases dizem o percentual e o tipo de contagem", () => {
    expect(criteriaSentence(criterio(80, 3), "intervention")).toBe(
      "80% de acerto em 3 sessões consecutivas",
    );
    expect(criteriaSentence(criterio(90, 2, "cumulative"), "maintenance")).toBe(
      "90% de acerto em 2 sessões no total",
    );
  });

  it("concorda em número quando a frequência é um", () => {
    expect(criteriaSentence(criterio(80, 1), "intervention")).toBe(
      "80% de acerto em 1 sessão consecutiva",
    );
  });
});

describe("regression-returns-to-previous-phase", () => {
  const regride = criterio(70, 2);

  it("devolve a fase anterior quando o critério de regressão é atingido", () => {
    expect(regressionTarget("maintenance", historico(95, 90, 60, 55), regride)).toBe(
      "generalization",
    );
    expect(regressionTarget("generalization", historico(50, 40), regride)).toBe("intervention");
  });

  it("não dispara quando as quedas não são seguidas o bastante", () => {
    expect(regressionTarget("maintenance", historico(60, 90, 55), regride)).toBeUndefined();
  });

  it("não dispara quando a fase não tem critério de regressão", () => {
    expect(regressionTarget("maintenance", historico(10, 10, 10), undefined)).toBeUndefined();
  });

  it("a linha de base não tem para onde voltar", () => {
    expect(regressionTarget("baseline", historico(10, 10), regride)).toBeUndefined();
  });
});

describe("acquisition-cascades-upward", () => {
  const passoAdquirido = (id: string): PlanStep => ({
    id,
    name: id,
    position: 1,
    status: "acquired",
    phase: "acquired",
    history: [],
  });

  const passoAtivo = (id: string): PlanStep => ({
    id,
    name: id,
    position: 2,
    status: "active",
    phase: "maintenance",
    history: [],
  });

  const programa = (id: string, steps: PlanStep[], status: PlanProgram["status"] = "active"): PlanProgram => ({
    id,
    name: id,
    programType: "structured",
    answerType: "task_training",
    status,
    specialties: [],
    steps,
  });

  it("o programa fecha quando não sobra passo por adquirir", () => {
    expect(programWouldBeAcquired(programa("p", [passoAdquirido("s1")]))).toBe(true);
    expect(programWouldBeAcquired(programa("p", [passoAdquirido("s1"), passoAtivo("s2")]))).toBe(
      false,
    );
  });

  it("o passo em questão pode ser ignorado na conta, como o monólito faz", () => {
    const p = programa("p", [passoAdquirido("s1"), passoAtivo("s2")]);
    expect(programWouldBeAcquired(p, ["s2"])).toBe(true);
  });

  it("nível sem filhos conta como adquirido — consequência do modelo", () => {
    // O monólito pergunta pela negativa: "sobrou algum filho não adquirido?".
    // Uma lista vazia responde não, e o nível fecha.
    expect(programWouldBeAcquired(programa("p", []))).toBe(true);
    expect(objectiveWouldBeAcquired({ id: "o", name: "o", status: "active", programs: [] })).toBe(
      true,
    );
  });

  it("a cascata sobe até onde não sobrar irmão pendente", () => {
    const plan: InterventionPlan = {
      patient: { id: "x", name: "x", birthDate: "2019-01-01" },
      now: "2026-07-30T09:00:00.000-03:00",
      goals: [
        {
          id: "meta",
          name: "meta",
          status: "active",
          objectives: [
            {
              id: "obj",
              name: "obj",
              status: "active",
              programs: [programa("prog", [passoAdquirido("s1"), passoAtivo("s2")])],
            },
          ],
        },
      ],
    };

    // Marcar `s2` fecha programa, objetivo e meta de uma vez.
    const cascade = cascadeFrom(plan, "s2");
    expect(cascade.program?.id).toBe("prog");
    expect(cascade.objective?.id).toBe("obj");
    expect(cascade.goal?.id).toBe("meta");
  });

  it("para no nível em que ainda há irmão pendente", () => {
    const plan: InterventionPlan = {
      patient: { id: "x", name: "x", birthDate: "2019-01-01" },
      now: "2026-07-30T09:00:00.000-03:00",
      goals: [
        {
          id: "meta",
          name: "meta",
          status: "active",
          objectives: [
            {
              id: "obj",
              name: "obj",
              status: "active",
              programs: [
                programa("prog", [passoAdquirido("s1"), passoAtivo("s2")]),
                programa("outro", [passoAtivo("s3")]),
              ],
            },
          ],
        },
      ],
    };

    const cascade = cascadeFrom(plan, "s2");
    expect(cascade.program?.id).toBe("prog");
    expect(cascade.objective).toBeUndefined();
    expect(cascade.goal).toBeUndefined();
  });

  it("não sobe nada quando o programa ainda tem outro passo pendente", () => {
    const plan: InterventionPlan = {
      patient: { id: "x", name: "x", birthDate: "2019-01-01" },
      now: "2026-07-30T09:00:00.000-03:00",
      goals: [
        {
          id: "meta",
          name: "meta",
          status: "active",
          objectives: [
            {
              id: "obj",
              name: "obj",
              status: "active",
              programs: [
                programa("prog", [passoAtivo("s2"), { ...passoAtivo("s4"), position: 3 }]),
              ],
            },
          ],
        },
      ],
    };

    expect(cascadeFrom(plan, "s2")).toEqual({});
  });
});

describe("superseded-version-keeps-its-history", () => {
  const base: PlanProgram = {
    id: "prog",
    name: "Imitação motora grossa",
    programType: "structured",
    answerType: "task_training",
    status: "active",
    specialties: [],
    steps: [],
  };

  it("versão substituída não é editável, e a negativa diz por quê", () => {
    const antiga = { ...base, nextVersionId: "prog-v2" };
    expect(isSuperseded(antiga)).toBe(true);
    expect(canEditProgram(antiga, ["programs.edit"]).reason).toMatch(
      /tentativas registradas pertencem a ela/,
    );
  });

  it("programa adquirido também não é editado", () => {
    expect(canEditProgram({ ...base, status: "acquired" }, ["programs.edit"]).reason).toMatch(
      /Crie uma versão nova/,
    );
  });

  it("a versão vigente e ativa é editável por quem tem permissão", () => {
    expect(canEditProgram(base, ["programs.edit"]).allowed).toBe(true);
  });

  it("bloqueia por permissão antes de olhar a versão", () => {
    expect(canEditProgram({ ...base, nextVersionId: "v2" }, []).reason).toMatch(
      /não edita programas/,
    );
  });
});

/* ============================================================== protocolos */

/**
 * A navegação do protocolo é regra de negócio porque a aplicação atravessa
 * sessões: retomar no lugar errado é como item fica sem resposta sem ninguém
 * notar, e o instrumento sai incompleto sem aviso.
 */

function protocolQuestion(
  id: string,
  position: number,
  answered = false,
  range?: { min: number; max: number },
): ProtocolQuestion {
  return {
    id,
    code: id.toUpperCase(),
    name: id,
    question: id,
    criteria: "critério",
    position,
    ...(range ? { range } : {}),
    ...(answered ? { answer: { value: 2, at: "2026-07-23T10:00:00.000-03:00" } } : {}),
  };
}

function protocolo(overrides: Partial<Protocol> = {}): Protocol {
  return {
    id: "prot",
    name: "Protocolo",
    format: "default",
    evaluationType: "evaluation_habilits",
    nextReassessmentInMonths: 6,
    explication: "explicação",
    answers: [
      { id: "o1", name: "Não faz", value: 1 },
      { id: "o2", name: "Faz com ajuda", value: 2 },
    ],
    areas: [
      {
        id: "area-1",
        orientation: "Área 1",
        position: 1,
        questions: [
          protocolQuestion("a1", 1, true),
          protocolQuestion("a2", 2, true),
          protocolQuestion("a3", 3),
        ],
      },
      {
        id: "area-2",
        orientation: "Área 2",
        position: 2,
        questions: [protocolQuestion("b1", 1), protocolQuestion("b2", 2)],
      },
    ],
    ...overrides,
  };
}

describe("protocol-resumes-at-first-unanswered", () => {
  it("procura primeiro no resto da área atual", () => {
    expect(nextUnanswered(protocolo(), "a1")?.id).toBe("a3");
  });

  it("passa para a próxima área quando a atual acabou", () => {
    expect(nextUnanswered(protocolo(), "a3")?.id).toBe("b1");
  });

  it("volta ao começo para recuperar o que ficou para trás", () => {
    // Posicionado no último item, com um buraco lá atrás: sem esta terceira
    // etapa, quem voltou uma área para corrigir algo ficaria preso ali.
    const comBuraco = protocolo({
      areas: [
        {
          id: "area-1",
          orientation: "Área 1",
          position: 1,
          questions: [protocolQuestion("a1", 1), protocolQuestion("a2", 2, true)],
        },
        {
          id: "area-2",
          orientation: "Área 2",
          position: 2,
          questions: [protocolQuestion("b1", 1, true)],
        },
      ],
    });
    expect(nextUnanswered(comBuraco, "b1")?.id).toBe("a1");
  });

  it("sem posição de partida, começa do primeiro em branco do protocolo", () => {
    expect(nextUnanswered(protocolo())?.id).toBe("a3");
  });

  it("devolve indefinido quando tudo está respondido", () => {
    const tudo = protocolo({
      areas: [
        {
          id: "area-1",
          orientation: "Área 1",
          position: 1,
          questions: [protocolQuestion("a1", 1, true)],
        },
      ],
    });
    expect(nextUnanswered(tudo, "a1")).toBeUndefined();
  });

  it("a navegação manual não pula respondidas — é outra coisa", () => {
    // `next` existe para revisar: precisa passar por tudo.
    expect(neighbour(protocolo(), "a1", "next")?.id).toBe("a2");
    expect(neighbour(protocolo(), "a3", "next")?.id).toBe("b1");
    expect(neighbour(protocolo(), "a1", "previous")).toBeUndefined();
  });
});

describe("protocol-progress-is-completion-not-score", () => {
  it("conta respondidas sobre o total de itens do instrumento", () => {
    expect(completion(protocolo())).toEqual({ answered: 2, total: 5, percent: 40 });
  });

  it("protocolo sem itens não divide por zero", () => {
    expect(completion(protocolo({ areas: [] }))).toEqual({ answered: 0, total: 0, percent: 0 });
  });

  it("só é completo quando há itens e todos foram respondidos", () => {
    expect(isComplete(protocolo())).toBe(false);
    expect(isComplete(protocolo({ areas: [] }))).toBe(false);
  });
});

describe("protocol-area-progress-is-independent", () => {
  it("cada área conta sobre as próprias questões", () => {
    const [primeira, segunda] = protocolo().areas;
    expect(areaProgress(primeira!)).toEqual({ answered: 2, total: 3, percent: 67 });
    expect(areaProgress(segunda!)).toEqual({ answered: 0, total: 2, percent: 0 });
  });
});

describe("answer-scale-depends-on-format", () => {
  it("no formato padrão, a escala é a mesma para todo o protocolo", () => {
    const control = answerControl(protocolo(), protocolQuestion("a1", 1));
    expect(control).toEqual({
      kind: "scale",
      options: [
        { id: "o1", name: "Não faz", value: 1 },
        { id: "o2", name: "Faz com ajuda", value: 2 },
      ],
    });
  });

  it("no ABLLS-R, cada questão tem faixa própria", () => {
    const abllsr = protocolo({ format: "abllsr", answers: [] });
    expect(answerControl(abllsr, protocolQuestion("x", 1, false, { min: 0, max: 4 }))).toEqual({
      kind: "range",
      min: 0,
      max: 4,
    });
  });

  it("devolve indefinido quando o item não tem como ser respondido", () => {
    // Melhor que uma lista vazia: força a tela a dizer que não sabe o que
    // perguntar, em vez de desenhar um controle sem opções.
    const abllsr = protocolo({ format: "abllsr", answers: [] });
    expect(answerControl(abllsr, protocolQuestion("x", 1))).toBeUndefined();
    expect(answerControl(protocolo({ answers: [] }), protocolQuestion("a1", 1))).toBeUndefined();
  });
});

describe("reassessment-follows-the-instrument", () => {
  it("soma os meses do instrumento à data de conclusão", () => {
    expect(reassessmentDate("2026-07-25T11:30:00.000-03:00", 6)).toBe("2027-01-25");
    expect(reassessmentDate("2026-01-20T11:00:00.000-03:00", 6)).toBe("2026-07-20");
    expect(reassessmentDate("2026-02-10T09:00:00.000-03:00", 12)).toBe("2027-02-10");
  });

  it("grampeia no último dia do mês em vez de estourar para o seguinte", () => {
    // 31 de janeiro mais um mês não é 2 ou 3 de março.
    expect(reassessmentDate("2026-01-31T09:00:00.000-03:00", 1)).toBe("2026-02-28");
    expect(reassessmentDate("2026-08-31T09:00:00.000-03:00", 6)).toBe("2027-02-28");
  });

  it("conta os dias que faltam, e o negativo significa atrasada", () => {
    const base = {
      id: "e",
      protocol: protocolo(),
      patient: { id: "p", name: "p", birthDate: "2019-01-01" },
      startedAt: "2026-01-15T10:00:00.000-03:00",
      now: "2026-07-30T09:00:00.000-03:00",
    };
    expect(daysUntilReassessment({ ...base, reassessmentDate: "2026-07-20" })).toBe(-10);
    expect(daysUntilReassessment({ ...base, reassessmentDate: "2026-08-09" })).toBe(10);
    expect(daysUntilReassessment(base)).toBeUndefined();
  });
});

/* ============================================================== na clínica */

/**
 * O check-in reescreve a situação de todos os agendamentos do paciente naquele
 * dia. Está em três `update_all` de `ServiceRecords.Context` que ninguém lê ao
 * desenhar a tela — e é o que decide se o atendimento pode começar.
 */

function daySchedule(
  id: string,
  start: string,
  status: DaySchedule["status"] = "scheduled",
): DaySchedule {
  return {
    id,
    start,
    end: start.replace(/T(\d\d)/, (_, hour) => `T${String(Number(hour) + 1).padStart(2, "0")}`),
    status,
    professionalName: "Marina Okabe",
    serviceName: "Terapia ABA",
  };
}

const CHECKIN = "2026-07-30T09:24:00.000-03:00";

describe("checkin-marks-later-schedules-ready", () => {
  it("coloca em Pronto o que ainda não começou, vindo de Agendado", () => {
    const [result] = schedulesAfterCheckin(
      [daySchedule("s1", "2026-07-30T10:00:00.000-03:00")],
      CHECKIN,
    );
    expect(result!.status).toBe("ready_for_service");
  });

  it("recupera para Pronto o que estava Atrasado e ainda não começou", () => {
    const [result] = schedulesAfterCheckin(
      [daySchedule("s1", "2026-07-30T10:00:00.000-03:00", "delayed")],
      CHECKIN,
    );
    expect(result!.status).toBe("ready_for_service");
  });

  it("não toca em agendamento de outro dia", () => {
    const outro = daySchedule("s1", "2026-07-31T10:00:00.000-03:00");
    expect(schedulesAfterCheckin([outro], CHECKIN)).toEqual([outro]);
  });

  it("não toca em situação que não é Agendado nem Atrasado", () => {
    for (const status of ["ongoing", "finished", "cancelled", "missed"] as const) {
      const item = daySchedule("s1", "2026-07-30T10:00:00.000-03:00", status);
      expect(schedulesAfterCheckin([item], CHECKIN)[0]!.status).toBe(status);
    }
  });
});

describe("checkin-marks-earlier-schedules-delayed", () => {
  it("marca como Atrasado o horário que já passou e estava Agendado", () => {
    const [result] = schedulesAfterCheckin(
      [daySchedule("s1", "2026-07-30T09:00:00.000-03:00")],
      CHECKIN,
    );
    expect(result!.status).toBe("delayed");
  });

  it("distingue quem chegou tarde de quem faltou", () => {
    // O que está Faltou permanece Faltou: o check-in de agora não apaga a
    // ausência de um horário que já foi encerrado como falta.
    const [result] = schedulesAfterCheckin(
      [daySchedule("s1", "2026-07-30T08:00:00.000-03:00", "missed")],
      CHECKIN,
    );
    expect(result!.status).toBe("missed");
  });

  it("horário vencido que já estava Pronto volta a Agendado, e não a Atrasado", () => {
    // Divergência do monólito reproduzida como é: a mesma situação de fato —
    // paciente presente, horário vencido — para em dois estados diferentes
    // conforme o que veio antes.
    const [result] = schedulesAfterCheckin(
      [daySchedule("s1", "2026-07-30T09:00:00.000-03:00", "ready_for_service")],
      CHECKIN,
    );
    expect(result!.status).toBe("scheduled");
  });

  it("um único check-in resolve o dia inteiro de uma vez", () => {
    const result = schedulesAfterCheckin(
      [
        daySchedule("passado", "2026-07-30T08:00:00.000-03:00"),
        daySchedule("futuro", "2026-07-30T10:00:00.000-03:00"),
        daySchedule("futuro-2", "2026-07-30T11:00:00.000-03:00", "delayed"),
      ],
      CHECKIN,
    );
    expect(result.map((item) => item.status)).toEqual([
      "delayed",
      "ready_for_service",
      "ready_for_service",
    ]);
  });
});

describe("checkout-returns-schedules-to-scheduled", () => {
  it("devolve a Agendado tudo que estava Pronto no dia, mesmo o que não começou", () => {
    const result = schedulesAfterCheckout(
      [
        daySchedule("s1", "2026-07-30T10:00:00.000-03:00", "ready_for_service"),
        daySchedule("s2", "2026-07-30T14:00:00.000-03:00", "ready_for_service"),
      ],
      CHECKIN,
    );
    expect(result.map((item) => item.status)).toEqual(["scheduled", "scheduled"]);
  });

  it("não mexe no que já foi finalizado nem no que está em sessão", () => {
    const result = schedulesAfterCheckout(
      [
        daySchedule("s1", "2026-07-30T08:00:00.000-03:00", "finished"),
        daySchedule("s2", "2026-07-30T09:00:00.000-03:00", "ongoing"),
      ],
      CHECKIN,
    );
    expect(result.map((item) => item.status)).toEqual(["finished", "ongoing"]);
  });
});

describe("one-active-checkin-per-patient", () => {
  const dados: InClinicData = {
    unit: { id: "u", name: "Pinheiros" },
    now: "2026-07-30T09:40:00.000-03:00",
    patients: [
      {
        id: "sr-1",
        patient: { id: "pac-1", name: "Théo Andrade Lins", birthDate: "2019-11-04" },
        checkinAt: "2026-07-30T09:32:00.000-03:00",
        checkinBy: "web",
        schedules: [],
      },
    ],
    professionals: [],
  };

  it("recusa o segundo check-in dizendo desde quando o primeiro está aberto", () => {
    const result = canCheckin(dados, "pac-1", ["service_records.checkin"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/já possui um check-in ativo, feito às 09:32/);
  });

  it("permite quando o check-in anterior já teve saída", () => {
    const comSaida: InClinicData = {
      ...dados,
      patients: [{ ...dados.patients[0]!, checkoutAt: "2026-07-30T09:35:00.000-03:00" }],
    };
    expect(canCheckin(comSaida, "pac-1", ["service_records.checkin"]).allowed).toBe(true);
  });

  it("bloqueia por permissão antes de olhar o histórico", () => {
    expect(canCheckin(dados, "pac-1", []).reason).toMatch(/não registra check-in/);
  });
});

describe("in-clinic-tabs-follow-role", () => {
  it("esconde pacientes de People e profissionais de quem atende", () => {
    expect(visibleTabs("people")).toEqual({ patients: false, professionals: true });
    expect(visibleTabs("therapeutic_companion")).toEqual({
      patients: true,
      professionals: false,
    });
    expect(visibleTabs("supervisor")).toEqual({ patients: true, professionals: false });
    expect(visibleTabs("specialist")).toEqual({ patients: true, professionals: false });
  });

  it("a recepção e a coordenação veem as duas", () => {
    expect(visibleTabs("attendant")).toEqual({ patients: true, professionals: true });
    expect(visibleTabs("coordinator")).toEqual({ patients: true, professionals: true });
  });
});

describe("alerta de presença", () => {
  const base = {
    id: "sr",
    patient: { id: "p", name: "Noah", birthDate: "2019-04-30" },
    checkinAt: CHECKIN,
    checkinBy: "web" as const,
  };

  it("não alarma quem tem atendimento pronto", () => {
    expect(
      presenceAlert({
        ...base,
        schedules: [daySchedule("s", "2026-07-30T10:00:00.000-03:00", "ready_for_service")],
      }),
    ).toBeUndefined();
  });

  it("não alarma quem já está em sessão", () => {
    expect(
      presenceAlert({
        ...base,
        schedules: [daySchedule("s", "2026-07-30T09:00:00.000-03:00", "ongoing")],
      }),
    ).toBeUndefined();
  });

  it("nomeia os horários atrasados em vez de só avisar do atraso", () => {
    expect(
      presenceAlert({
        ...base,
        schedules: [daySchedule("s", "2026-07-30T09:00:00.000-03:00", "delayed")],
      }),
    ).toMatch(/o atendimento das 09:00 está atrasado/);
  });

  it("avisa quando não há nada que possa começar", () => {
    expect(presenceAlert({ ...base, schedules: [] })).toMatch(/não há atendimento pronto/);
  });

  it("não alarma quem já saiu", () => {
    expect(
      presenceAlert({ ...base, checkoutAt: "2026-07-30T10:00:00.000-03:00", schedules: [] }),
    ).toBeUndefined();
  });
});

/* =========================================================== autorizações */

/**
 * A autorização decide se a sessão pode ser marcada e, depois, se pode ser
 * cobrada. As três condições de disponibilidade são checadas juntas no
 * monólito, numa consulta só — e a terceira usa `Enum.all?`, que é o detalhe
 * que faz um pacote esgotado travar a autorização inteira.
 */

function authorizationPackage(
  overrides: Partial<AuthorizationPackage> & { id: string },
): AuthorizationPackage {
  return {
    name: "Terapia ABA",
    packageType: "package",
    quantity: 4,
    maxByMonth: 4,
    executions: 0,
    ...overrides,
  };
}

function auth(overrides: Partial<Authorization> = {}): Authorization {
  return {
    id: "aut-1",
    guideNumber: "G-0001",
    patient: { id: "p", name: "Théo Andrade Lins", birthDate: "2019-11-04" },
    healthCare: "Bradesco Saúde",
    status: "authorized",
    kind: "health_care",
    category: "monthly",
    guideType: "request",
    validFrom: "2026-07-01",
    validUntil: "2026-07-31",
    requestDate: "2026-06-24",
    requestedSessions: 16,
    packages: [authorizationPackage({ id: "p1" })],
    errors: [],
    ...overrides,
  };
}

const HOJE = "2026-07-30T09:00:00.000-03:00";

describe("capitation-ignores-quantity", () => {
  it("multiplica pela quantidade nos tipos comuns", () => {
    expect(maxAllowed(authorizationPackage({ id: "p", quantity: 4, maxByMonth: 4 }))).toBe(16);
    expect(
      maxAllowed(authorizationPackage({ id: "p", packageType: "free_for_service", quantity: 2, maxByMonth: 5 })),
    ).toBe(10);
  });

  it("no capitation o teto é o máximo mensal puro", () => {
    // Quantidade 3 não vira 36: é valor fixo por paciente.
    expect(
      maxAllowed(
        authorizationPackage({ id: "p", packageType: "capitation", quantity: 3, maxByMonth: 12 }),
      ),
    ).toBe(12);
  });

  it("quantidade zero conta como um, como no monólito", () => {
    expect(maxAllowed(authorizationPackage({ id: "p", quantity: 0, maxByMonth: 4 }))).toBe(4);
  });
});

describe("authorization-availability-needs-all-three", () => {
  it("libera quando situação, validade e saldo estão certos", () => {
    expect(canScheduleAgainst(auth(), HOJE).allowed).toBe(true);
  });

  it("bloqueia por situação antes de olhar validade e saldo", () => {
    const result = canScheduleAgainst(auth({ status: "denied" }), HOJE);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Negada/);
  });

  it("bloqueia fora da janela, citando as duas datas", () => {
    const result = canScheduleAgainst(
      auth({ validFrom: "2026-06-01", validUntil: "2026-06-30" }),
      HOJE,
    );
    expect(result.reason).toMatch(/vale de 01\/06\/2026 a 30\/06\/2026/);
  });

  it("a janela inclui as duas pontas", () => {
    const janela = auth({ validFrom: "2026-07-30", validUntil: "2026-07-30" });
    expect(canScheduleAgainst(janela, HOJE).allowed).toBe(true);
  });

  it("um pacote esgotado trava a autorização inteira", () => {
    // É a consequência do `Enum.all?`: saldo em um não compensa a falta no outro.
    const mista = auth({
      packages: [
        authorizationPackage({ id: "p1", name: "Psicologia", quantity: 2, maxByMonth: 4, executions: 8 }),
        authorizationPackage({ id: "p2", name: "Fonoaudiologia", quantity: 1, maxByMonth: 4, executions: 2 }),
      ],
    });
    const result = canScheduleAgainst(mista, HOJE);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Sem saldo em Psicologia/);
    expect(result.reason).toMatch(/mesmo que os outros tenham saldo/);
  });

  it("distingue todos esgotados de alguns esgotados", () => {
    const tudoEsgotado = auth({
      packages: [authorizationPackage({ id: "p1", name: "Terapia ABA", executions: 16 })],
    });
    expect(canScheduleAgainst(tudoEsgotado, HOJE).reason).toMatch(/Sem saldo em nenhum pacote/);
  });

  it("conta o que sobra sem cair para negativo", () => {
    expect(remaining(authorizationPackage({ id: "p", executions: 20 }))).toBe(0);
    expect(remaining(authorizationPackage({ id: "p", executions: 9 }))).toBe(7);
  });
});

describe("partial-authorization-is-not-authorization", () => {
  it("devolve quantas sessões faltaram em relação ao pedido", () => {
    const parcial = auth({
      status: "partially_authorized",
      requestedSessions: 16,
      packages: [authorizationPackage({ id: "p1", quantity: 2, maxByMonth: 4 })],
    });
    expect(shortfall(parcial)).toBe(8);
  });

  it("não inventa corte em autorização que não é parcial", () => {
    expect(shortfall(auth())).toBeUndefined();
    expect(shortfall(auth({ status: "denied" }))).toBeUndefined();
  });

  it("não devolve corte quando o liberado alcança o pedido", () => {
    const semCorte = auth({
      status: "partially_authorized",
      requestedSessions: 8,
      packages: [authorizationPackage({ id: "p1", quantity: 2, maxByMonth: 4 })],
    });
    expect(shortfall(semCorte)).toBeUndefined();
  });
});

describe("pending-status-names-who-acts-next", () => {
  it("classifica de quem é a próxima ação", () => {
    expect(actor("waiting_provider_documentation")).toBe("clinic");
    expect(actor("sync_error")).toBe("clinic");
    expect(actor("denied")).toBe("clinic");
    expect(actor("waiting_requester_justification")).toBe("requester");
    expect(actor("analysing")).toBe("insurer");
    expect(actor("pending")).toBe("insurer");
    expect(actor("authorized")).toBe("none");
    expect(actor("invoiced")).toBe("none");
  });

  it("sync_error diz que reenviar resolve, e não que foi recusado", () => {
    expect(nextActionFor("sync_error")).toMatch(/Reenviar resolve/);
    expect(nextActionFor("sync_error")).not.toMatch(/negou/);
  });

  it("as duas esperas por pendência nomeiam responsáveis diferentes", () => {
    expect(nextActionFor("waiting_provider_documentation")).toMatch(/ação é da operação/);
    expect(nextActionFor("waiting_requester_justification")).toMatch(
      /ação é do profissional solicitante/,
    );
  });
});

describe("ordem da fila", () => {
  it("põe o que espera a clínica antes do que espera o convênio", () => {
    const fila = [
      auth({ id: "analise", status: "analysing", requestDate: "2026-07-01" }),
      auth({ id: "doc", status: "waiting_provider_documentation", requestDate: "2026-07-20" }),
      auth({ id: "justificativa", status: "waiting_requester_justification", requestDate: "2026-07-05" }),
    ];
    expect(queueOrder(fila).map((item) => item.id)).toEqual(["doc", "justificativa", "analise"]);
  });

  it("desempata pela data do pedido, da mais antiga para a mais nova", () => {
    const fila = [
      auth({ id: "nova", status: "sync_error", requestDate: "2026-07-28" }),
      auth({ id: "antiga", status: "denied", requestDate: "2026-07-02" }),
    ];
    expect(queueOrder(fila).map((item) => item.id)).toEqual(["antiga", "nova"]);
  });
});

describe("only-admin-edits-authorization", () => {
  it("bloqueia quem opera a central mas não é admin", () => {
    const result = canEditAuthorization(["authorizations.hub"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Só o admin edita autorização/);
  });

  it("libera o admin", () => {
    expect(canEditAuthorization(["authorizations.edit"]).allowed).toBe(true);
  });
});

describe("validade", () => {
  it("conta os dias até vencer, e o negativo significa vencida", () => {
    expect(daysUntilExpiry(auth({ validUntil: "2026-08-05" }), HOJE)).toBe(6);
    expect(daysUntilExpiry(auth({ validUntil: "2026-06-30" }), HOJE)).toBe(-30);
  });
});

/* =========================================================== fechamentos */

/**
 * O fechamento é o módulo em que o Bloomy mais se parece com um processo entre
 * duas partes. A cada etapa a bola troca de lado, e as regras existem para que a
 * tela consiga dizer de quem ela é agora.
 */

function closureFixture(overrides: Partial<Closure> = {}): Closure {
  return {
    id: "fec",
    professional: { id: "prof-marina", name: "Marina Okabe", specialty: "Aplicador ABA" },
    professionalUserId: "user-marina",
    month: 7,
    year: 2026,
    amountCents: 748_000,
    status: "wait_accept",
    issuesInvoice: true,
    logs: [],
    ...overrides,
  };
}

describe("closure-hands-over-at-each-stage", () => {
  it("as etapas de conferência são da clínica", () => {
    for (const status of ["closure", "revision"] as const) {
      expect(canInteract(closureFixture({ status }), "coordinator").allowed).toBe(true);
      expect(canInteract(closureFixture({ status }), "therapeutic_companion").allowed).toBe(false);
    }
  });

  it("as etapas de aceite e nota são do profissional", () => {
    for (const status of ["wait_accept", "pending_invoice"] as const) {
      expect(canInteract(closureFixture({ status }), "therapeutic_companion").allowed).toBe(true);
      expect(canInteract(closureFixture({ status }), "clinic_admin").allowed).toBe(false);
    }
  });

  it("as etapas de nota e pagamento são do financeiro", () => {
    for (const status of ["validate_nf", "pay_invoice"] as const) {
      expect(canInteract(closureFixture({ status }), "people").allowed).toBe(true);
      expect(canInteract(closureFixture({ status }), "admin").allowed).toBe(true);
      expect(canInteract(closureFixture({ status }), "coordinator").allowed).toBe(false);
    }
  });

  it("a negativa diz de quem é a etapa, e não só que o perfil não pode", () => {
    const result = canInteract(closureFixture({ status: "validate_nf" }), "coordinator");
    expect(result.reason).toMatch(/ação é de quem responde por admin ou People/);
  });

  it("o coordenador aparece nos dois lados, e é assim no monólito", () => {
    // `can_interact?` lista `coordinator` tanto nas etapas da clínica quanto nas
    // do profissional — ele fecha e também é fechado.
    expect(canInteract(closureFixture({ status: "closure" }), "coordinator").allowed).toBe(true);
    expect(canInteract(closureFixture({ status: "wait_accept" }), "coordinator").allowed).toBe(true);
  });
});

describe("paid-closure-is-frozen", () => {
  const pago = closureFixture({ status: "paid" });

  it("nenhum papel interage com fechamento pago, nem o admin", () => {
    for (const role of ["admin", "people", "clinic_admin", "coordinator", "therapeutic_companion"]) {
      expect(canInteract(pago, role).allowed).toBe(false);
    }
    expect(canInteract(pago, "admin").reason).toMatch(/registro contábil/);
  });

  it("nem a nota nem o comprovante podem ser trocados", () => {
    expect(canAttachInvoice(pago, "user-marina").reason).toMatch(/não troca de nota fiscal/);
    expect(canAttachPaymentProof(pago, "admin").reason).toMatch(/não troca de comprovante/);
  });
});

describe("closure-status-moves-backward-only", () => {
  const emValidacao = closureFixture({ status: "validate_nf" });

  it("permite voltar para qualquer etapa anterior", () => {
    expect(canChangeStatusTo(emValidacao, "wait_accept", "people").allowed).toBe(true);
    expect(canChangeStatusTo(emValidacao, "closure", "admin").allowed).toBe(true);
  });

  it("permite permanecer no mesmo estado", () => {
    // O monólito diz "selecione um status atual ou anterior".
    expect(canChangeStatusTo(emValidacao, "validate_nf", "people").allowed).toBe(true);
  });

  it("recusa avançar pela mão, dizendo de quem é a etapa", () => {
    const result = canChangeStatusTo(emValidacao, "paid", "admin");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Não é permitido avançar situação pela mão/);
    expect(result.reason).toMatch(/admin ou People/);
  });

  it("só três papéis corrigem situação", () => {
    expect(canChangeStatusTo(emValidacao, "closure", "coordinator").reason).toMatch(
      /Só admin, admin de clínica e People/,
    );
    expect(canChangeStatusTo(emValidacao, "closure", "clinic_admin").allowed).toBe(true);
  });
});

describe("invoice-belongs-to-the-professional", () => {
  const pendente = closureFixture({ status: "pending_invoice" });

  it("o dono anexa a própria nota", () => {
    expect(canAttachInvoice(pendente, "user-marina").allowed).toBe(true);
  });

  it("nem o admin anexa no lugar dele — a regra é de identidade", () => {
    const result = canAttachInvoice(pendente, "user-helena");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/documento fiscal de Marina Okabe/);
  });
});

describe("payment-proof-belongs-to-the-clinic", () => {
  const aPagar = closureFixture({ status: "pay_invoice" });

  it("só admin e People anexam o comprovante", () => {
    expect(canAttachPaymentProof(aPagar, "people").allowed).toBe(true);
    expect(canAttachPaymentProof(aPagar, "coordinator").reason).toMatch(/Só admin e People/);
  });

  it("confirmar sem comprovante é bloqueado, com a consequência dita", () => {
    const result = canConfirmPayment(aPagar, "people");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/sem nada para cobrar se o valor não cair/);
  });

  it("com comprovante, a confirmação libera", () => {
    const comProva = closureFixture({
      status: "pay_invoice",
      paymentProof: { name: "comprovante.pdf", at: "2026-08-01T10:22:00.000-03:00" },
    });
    expect(canConfirmPayment(comProva, "people").allowed).toBe(true);
  });

  it("não confirma pagamento fora da etapa de pagar", () => {
    expect(canConfirmPayment(closureFixture({ status: "validate_nf" }), "people").reason).toMatch(
      /Só um fechamento em A pagar/,
    );
  });
});

describe("closure-is-invisible-until-sent", () => {
  const lista = [
    closureFixture({ id: "a", status: "closure", professionalUserId: "user-marina" }),
    closureFixture({ id: "b", status: "wait_accept", professionalUserId: "user-marina" }),
    closureFixture({ id: "c", status: "paid", professionalUserId: "user-outro" }),
  ];

  it("a clínica vê tudo", () => {
    for (const role of ["admin", "people", "operation", "coordinator", "clinic_admin"]) {
      expect(visibleClosures(lista, role, "user-x")).toHaveLength(3);
    }
  });

  it("o profissional vê só os próprios, e nunca os que ainda estão em conferência", () => {
    const vistos = visibleClosures(lista, "therapeutic_companion", "user-marina");
    expect(vistos.map((item) => item.id)).toEqual(["b"]);
  });

  it("o especialista não vê fechamento nenhum, nem o próprio", () => {
    // Divergência do monólito reproduzida como é: `scope/2` lista terapeuta,
    // aplicador e supervisor, e esquece `specialist` — que cai na cláusula
    // final. `can_interact?`, porém, afirma que ele age na etapa de aceite.
    expect(visibleClosures(lista, "specialist", "user-marina")).toHaveLength(0);
    expect(canInteract(closureFixture({ status: "wait_accept" }), "specialist").allowed).toBe(true);
  });

  it("a recepção também não vê", () => {
    expect(visibleClosures(lista, "attendant", "user-marina")).toHaveLength(0);
  });
});

describe("nota fiscal no ciclo", () => {
  it("só entra quando a etapa alcançou a nota e o contrato exige", () => {
    expect(expectsInvoice(closureFixture({ status: "pending_invoice", issuesInvoice: true }))).toBe(
      true,
    );
    expect(expectsInvoice(closureFixture({ status: "pending_invoice", issuesInvoice: false }))).toBe(
      false,
    );
    expect(expectsInvoice(closureFixture({ status: "wait_accept", issuesInvoice: true }))).toBe(
      false,
    );
  });

  it("contrato sem nota muda a frase de próxima ação", () => {
    expect(nextStep(closureFixture({ status: "pending_invoice", issuesInvoice: false }))).toMatch(
      /não exige nota fiscal/,
    );
    expect(nextStep(closureFixture({ status: "pending_invoice", issuesInvoice: true }))).toMatch(
      /precisa anexar a nota fiscal/,
    );
  });
});

/* =============================================================== faturas */

/**
 * Metade destes testes existe por um motivo só: duas maneiras de a clínica
 * perder dinheiro sem receber aviso nenhum. O monólito soma sem reclamar nos
 * dois casos.
 */

function invoiceLine(overrides: Partial<InvoiceLine> & { authorizationId: string }): InvoiceLine {
  return {
    guideNumber: "G-0001",
    patientName: "Théo Andrade Lins",
    packageName: "Terapia ABA",
    quantity: 16,
    executedSessions: 16,
    agreementPriceCents: 18_500,
    ...overrides,
  };
}

function invoiceFixture(overrides: Partial<HealthcareInvoice> = {}): HealthcareInvoice {
  return {
    id: "fat",
    healthCare: {
      id: "op",
      name: "Bradesco Saúde",
      ansRegister: "005711",
      cnpj: "11.222.333/0001-44",
      providerCode: "PRT-9081",
      requesterCode: "SOL-4417",
      skipEligibility: false,
      planTypes: [],
    },
    status: "pending",
    invoiceType: "health_care",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    number: "2026-07-0148",
    protocol: "PRT-88213",
    igdr: "IGDR-2026-07",
    lines: [invoiceLine({ authorizationId: "a1" })],
    ...overrides,
  };
}

describe("invoice-includes-only-executed-authorizations", () => {
  const comSemExecucao = invoiceFixture({
    lines: [
      invoiceLine({ authorizationId: "a1" }),
      invoiceLine({ authorizationId: "a2", executedSessions: 0, quantity: 4 }),
    ],
  });

  it("descarta a autorização sem nenhum atendimento", () => {
    expect(billableLines(comSemExecucao).map((l) => l.authorizationId)).toEqual(["a1"]);
    expect(excludedLines(comSemExecucao).map((l) => l.authorizationId)).toEqual(["a2"]);
  });

  it("a descartada não contribui com nada para o total", () => {
    expect(invoiceTotalCents(comSemExecucao)).toBe(16 * 18_500);
  });

  it("linha descartada vale zero mesmo tendo preço de acordo", () => {
    expect(lineTotalCents(invoiceLine({ authorizationId: "a", executedSessions: 0 }))).toBe(0);
  });
});

describe("authorization-without-agreement-is-worth-zero", () => {
  const semAcordo = invoiceFixture({
    lines: [
      invoiceLine({ authorizationId: "a1" }),
      invoiceLine({ authorizationId: "a2", quantity: 8, agreementPriceCents: undefined }),
    ],
  });

  it("a linha atendida sem acordo entra e vale zero", () => {
    expect(billableLines(semAcordo)).toHaveLength(2);
    expect(lineTotalCents(semAcordo.lines[1]!)).toBe(0);
  });

  it("separa as linhas sem acordo para a tela poder avisar antes do envio", () => {
    expect(linesWithoutAgreement(semAcordo).map((l) => l.authorizationId)).toEqual(["a2"]);
  });

  it("conta sessões, não dinheiro — o valor perdido é desconhecível", () => {
    // Sem acordo não existe preço a aplicar; estimar um seria inventar um
    // número que a operadora nunca vai pagar.
    expect(sessionsWithoutAgreement(semAcordo)).toBe(8);
  });

  it("o total ignora silenciosamente a linha sem acordo, como no monólito", () => {
    expect(invoiceTotalCents(semAcordo)).toBe(16 * 18_500);
  });
});

describe("invoice-needs-number-protocol-igdr", () => {
  it("nomeia os três campos que faltam", () => {
    const vazia = invoiceFixture({ number: undefined, protocol: undefined, igdr: undefined });
    expect(missingInvoiceFields(vazia)).toEqual(["número", "protocolo", "IGDR"]);
  });

  it("campo só com espaço conta como vazio", () => {
    expect(missingInvoiceFields(invoiceFixture({ protocol: "   " }))).toEqual(["protocolo"]);
  });

  it("bloqueia o fechamento citando o que falta e para que serve", () => {
    const result = canFinishInvoice(invoiceFixture({ igdr: undefined }), [
      "healthcare_invoices.edit",
    ]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Falta preencher: IGDR/);
    expect(result.reason).toMatch(/identificadores com que a operadora reconhece o lote/);
  });

  it("libera com os três preenchidos e linha faturável", () => {
    expect(canFinishInvoice(invoiceFixture(), ["healthcare_invoices.edit"]).allowed).toBe(true);
  });

  it("bloqueia quando nada foi atendido no período", () => {
    const nada = invoiceFixture({
      lines: [invoiceLine({ authorizationId: "a", executedSessions: 0 })],
    });
    expect(canFinishInvoice(nada, ["healthcare_invoices.edit"]).reason).toMatch(
      /Não há o que faturar/,
    );
  });

  it("bloqueia por permissão antes de olhar o conteúdo", () => {
    expect(canFinishInvoice(invoiceFixture(), ["healthcare_invoices.list"]).reason).toMatch(
      /Só o admin fecha fatura/,
    );
  });
});

describe("generated-invoice-is-final", () => {
  it("não fecha de novo uma fatura cujo lote já saiu", () => {
    const gerada = invoiceFixture({ status: "generated_invoice" });
    expect(canFinishInvoice(gerada, ["healthcare_invoices.edit"]).reason).toMatch(
      /divergir do que a operadora recebeu/,
    );
  });
});

describe("cadastro TISS da operadora", () => {
  it("nomeia os códigos que faltam", () => {
    const incompleta = invoiceFixture({
      healthCare: {
        ...invoiceFixture().healthCare,
        providerCode: undefined,
        requesterCode: undefined,
      },
    });
    expect(missingTissSetup(incompleta)).toEqual([
      "código do prestador",
      "código do solicitante",
    ]);
  });

  it("operadora completa não gera aviso", () => {
    expect(missingTissSetup(invoiceFixture())).toEqual([]);
  });
});

/* ================================================================ equipe */

/**
 * O cadastro da equipe é onde nascem duas decisões que aparecem em outros
 * módulos: a segunda assinatura do atendimento e a nota fiscal do fechamento.
 * Estes testes fixam os dois elos, para que mexer aqui não quebre lá em
 * silêncio.
 */

function member(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: "prof",
    name: "Marina Okabe",
    tbd: false,
    specialty: "Aplicador ABA",
    email: "marina@exemplo.test",
    cpf: "000.111.222-00",
    phone: "(11) 90000-0011",
    birthDate: "1996-02-14",
    formation: "Psicologia",
    healthFormation: "Psicologia (CRP)",
    professionalTypes: ["therapeutic_companion"],
    userTypes: ["attendant"],
    appliesProtocol: false,
    isAt: false,
    active: true,
    units: ["Pinheiros"],
    supervisedBy: [],
    supervises: [],
    ...overrides,
  };
}

const link = (overrides: Partial<SupervisionLink> = {}): SupervisionLink => ({
  id: "int",
  professionalId: "prof",
  supervisorId: "sup",
  supervisorName: "Clara Vidigal",
  needsSupervisorSignature: true,
  ...overrides,
});

describe("tbd-professional-is-a-placeholder", () => {
  it("o a definir exige apenas nome e especialidade", () => {
    const tbd: TeamMember = {
      id: "t",
      name: "Terapeuta a definir",
      tbd: true,
      specialty: "Aplicador ABA",
      professionalTypes: [],
      userTypes: [],
      appliesProtocol: false,
      isAt: false,
      active: true,
      units: [],
      supervisedBy: [],
      supervises: [],
    };
    expect(missingProfessionalFields(tbd)).toEqual([]);
  });

  it("o mesmo cadastro sem a marca de a definir tem oito campos faltando", () => {
    const comum: TeamMember = {
      id: "t",
      name: "Terapeuta",
      tbd: false,
      specialty: "Aplicador ABA",
      professionalTypes: [],
      userTypes: [],
      appliesProtocol: false,
      isAt: false,
      active: true,
      units: [],
      supervisedBy: [],
      supervises: [],
    };
    expect(missingProfessionalFields(comum)).toEqual([
      "e-mail",
      "CPF",
      "data de nascimento",
      "telefone",
      "papéis por unidade",
      "formação em saúde",
      "papéis globais",
      "formação",
    ]);
  });

  it("cadastro completo não acusa nada", () => {
    expect(missingProfessionalFields(member())).toEqual([]);
  });

  it("o a definir sem especialidade ainda é incompleto", () => {
    expect(missingProfessionalFields(member({ tbd: true, specialty: "" }))).toEqual(["especialidade"]);
  });
});

describe("supervision-link-defines-second-signature", () => {
  it("um vínculo que exige assinatura faz as sessões exigirem", () => {
    expect(requiresSupervisorSignature(member({ supervisedBy: [link()] }))).toBe(true);
  });

  it("vínculo sem exigência não obriga nada", () => {
    expect(
      requiresSupervisorSignature(
        member({ supervisedBy: [link({ needsSupervisorSignature: false })] }),
      ),
    ).toBe(false);
  });

  it("com vários supervisores, basta um exigir — é a leitura conservadora", () => {
    const dois = member({
      supervisedBy: [
        link({ id: "a", supervisorId: "s1", needsSupervisorSignature: false }),
        link({ id: "b", supervisorId: "s2", supervisorName: "Rui", needsSupervisorSignature: true }),
      ],
    });
    expect(requiresSupervisorSignature(dois)).toBe(true);
    expect(signingSupervisors(dois).map((l) => l.supervisorName)).toEqual(["Rui"]);
  });

  it("sem supervisão, nenhuma exigência", () => {
    expect(requiresSupervisorSignature(member())).toBe(false);
  });

  it("o efeito é declarado em texto, ligando cadastro e atendimento", () => {
    const efeitos = downstreamEffects(member({ supervisedBy: [link()] }), "2026-07-30");
    expect(efeitos.join(" ")).toMatch(/segunda assinatura, de Clara Vidigal/);
    expect(efeitos.join(" ")).toMatch(/vem do vínculo de estágio, não do atendimento/);
  });
});

describe("one-supervision-link-per-pair", () => {
  const comVinculo = member({ supervisedBy: [link()] });
  const PERM = ["professionals.list_supervisor"];

  it("recusa vincular o mesmo supervisor duas vezes", () => {
    const result = canLinkSupervisor(comVinculo, "sup", PERM);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Clara Vidigal já é responsável por esse profissional/);
  });

  it("aceita um supervisor diferente", () => {
    expect(canLinkSupervisor(comVinculo, "outro", PERM).allowed).toBe(true);
  });

  it("ninguém supervisiona a si mesmo", () => {
    expect(canLinkSupervisor(member(), "prof", PERM).reason).toMatch(/a si mesmo/);
  });

  it("bloqueia por permissão antes de olhar os vínculos", () => {
    expect(canLinkSupervisor(comVinculo, "sup", []).reason).toMatch(/administram supervisão/);
  });
});

describe("contract-type-decides-required-rates", () => {
  it("remuneração fixa exige mensal maior que zero", () => {
    expect(
      missingContractRates({
        id: "c",
        type: "fixed_compensation",
        startDate: "2025-01-01",
        monthlyRateCents: 0,
        administrativeHourlyRateCents: 0,
        issuesInvoice: true,
      }),
    ).toEqual(["valor mensal"]);
  });

  it("e aceita hora administrativa zerada — quem tem mensalidade não cobra à parte", () => {
    expect(
      missingContractRates({
        id: "c",
        type: "fixed_compensation",
        startDate: "2025-01-01",
        monthlyRateCents: 1_250_000,
        administrativeHourlyRateCents: 0,
        issuesInvoice: true,
      }),
    ).toEqual([]);
  });

  it("remuneração por hora exige as três maiores que zero", () => {
    expect(
      missingContractRates({
        id: "c",
        type: "hourly_compensation",
        startDate: "2025-01-01",
        serviceRateCents: 9_500,
        administrativeHourlyRateCents: 0,
        issuesInvoice: true,
      }),
    ).toEqual(["hora administrativa", "hora administrativa especial"]);
  });

  it("a mesma taxa zerada é válida num tipo e inválida no outro", () => {
    // É a assimetria do `allow_zero?` no monólito, e ela é fácil de perder.
    const fixo = missingContractRates({
      id: "c",
      type: "fixed_compensation",
      startDate: "2025-01-01",
      monthlyRateCents: 100,
      administrativeHourlyRateCents: 0,
      issuesInvoice: true,
    });
    const horista = missingContractRates({
      id: "c",
      type: "hourly_compensation",
      startDate: "2025-01-01",
      serviceRateCents: 100,
      administrativeHourlyRateCents: 0,
      specialAdministrativeHourlyRateCents: 100,
      issuesInvoice: true,
    });
    expect(fixo).toEqual([]);
    expect(horista).toEqual(["hora administrativa"]);
  });
});

describe("contract-decides-invoice-requirement", () => {
  const comContrato = (issuesInvoice: boolean, endDate?: string) =>
    member({
      contract: {
        id: "c",
        type: "hourly_compensation",
        startDate: "2025-01-01",
        endDate,
        serviceRateCents: 9_500,
        administrativeHourlyRateCents: 6_000,
        specialAdministrativeHourlyRateCents: 8_500,
        issuesInvoice,
      },
    });

  it("o contrato ativo decide se o fechamento pede nota", () => {
    expect(closureExpectsInvoice(comContrato(true), "2026-07-30")).toBe(true);
    expect(closureExpectsInvoice(comContrato(false), "2026-07-30")).toBe(false);
  });

  it("contrato fora de vigência não decide nada", () => {
    expect(closureExpectsInvoice(comContrato(true, "2026-06-30"), "2026-07-30")).toBe(false);
  });

  it("sem contrato, nada é exigido", () => {
    expect(closureExpectsInvoice(member(), "2026-07-30")).toBe(false);
  });

  it("vigência inclui as duas pontas", () => {
    const contrato = comContrato(true, "2026-07-30").contract!;
    expect(isContractActiveOn(contrato, "2025-01-01")).toBe(true);
    expect(isContractActiveOn(contrato, "2026-07-30")).toBe(true);
    expect(isContractActiveOn(contrato, "2026-07-31")).toBe(false);
    expect(isContractActiveOn(contrato, "2024-12-31")).toBe(false);
  });
});

describe("deactivation-needs-a-date", () => {
  const PERM = ["professionals.edit"];

  it("bloqueia sem data, explicando o que ela separa", () => {
    const result = canDeactivate(member(), PERM);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/separa o histórico do que ainda vale/);
  });

  it("libera com a data informada", () => {
    expect(canDeactivate(member({ deactivationDate: "2026-08-31" }), PERM).allowed).toBe(true);
  });

  it("não desativa quem já está desativado", () => {
    expect(canDeactivate(member({ active: false }), PERM).reason).toMatch(/já está desativado/);
  });

  it("bloqueia por permissão antes de tudo", () => {
    expect(canDeactivate(member(), []).reason).toMatch(/não edita profissionais/);
  });
});

/* ======================================================== portal público */

/**
 * A única superfície usada por quem não trabalha na clínica. O erro mal
 * explicado aqui não vira chamado de suporte — vira uma pessoa desistindo do
 * totem e indo para a fila.
 */

const RESPONSAVEIS = [
  { cpf: "529.982.247-25", id: "resp-1", name: "Renata Andrade Lins" },
  { cpf: "111.444.777-35", id: "resp-2", name: "Alceu Menendes Pinto" },
];

describe("validação de CPF", () => {
  it("aceita CPF com dígito verificador correto", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it("recusa os CPFs sintéticos deste repositório", () => {
    // As fixtures usam dígito inválido de propósito. É conveniente: o cenário
    // de CPF inválido usa um número que é de fato inválido.
    expect(isValidCpf("000.111.222-00")).toBe(false);
    expect(isValidCpf("000.333.444-00")).toBe(false);
  });

  it("recusa comprimento errado e todos os dígitos iguais", () => {
    expect(isValidCpf("5299822472")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("")).toBe(false);
  });
});

describe("kiosk-distinguishes-three-failures", () => {
  it("CPF malformado é erro de digitação, não de cadastro", () => {
    const result = identify("000.111.222-00", RESPONSAVEIS);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe("invalid_cpf");
  });

  it("CPF correto e desconhecido é falta de cadastro", () => {
    // O mesmo número válido do teste anterior, contra uma base sem ele.
    const result = identify("529.982.247-25", []);
    expect(result.ok === false && result.error).toBe("guardian_not_found");
  });

  it("CPF correto e conhecido identifica o responsável", () => {
    const result = identify("529.982.247-25", RESPONSAVEIS);
    expect(result.ok).toBe(true);
    expect(result.ok === true && result.guardian.name).toBe("Renata Andrade Lins");
  });

  it("a formatação não importa para o reconhecimento", () => {
    expect(identify("52998224725", RESPONSAVEIS).ok).toBe(true);
  });

  it("cada falha tem mensagem e saída próprias", () => {
    expect(errorMessage("invalid_cpf").exit).toBe("Digitar de novo");
    expect(errorMessage("guardian_not_found").exit).toBe("Falar com a recepção");
    expect(errorMessage("no_scheduled_patients").body).toMatch(/outro dia, ou outra unidade/);
    expect(errorMessage("unit_not_found").body).toMatch(/QR Code/);
  });
});

describe("kiosk-never-goes-back", () => {
  it("as etapas avançam em ordem e param no fim", () => {
    expect(nextKioskStep("identification")).toBe("select_patient");
    expect(nextKioskStep("select_patient")).toBe("registration_complete");
    expect(nextKioskStep("registration_complete")).toBeUndefined();
  });

  it("a posição da etapa é conhecida, para a tela poder anunciá-la", () => {
    expect(stepIndex("identification")).toBe(0);
    expect(stepIndex("registration_complete")).toBe(2);
  });
});

describe("kiosk-lists-only-today-and-unstarted", () => {
  const base = { step: "select_patient" as const, patients: [], now: "2026-07-30T09:24:00.000-03:00" };

  it("lista vazia na etapa de escolha vira o erro de nenhum agendamento", () => {
    expect(kioskError({ ...base, unit: { id: "u", name: "Pinheiros" } })).toBe(
      "no_scheduled_patients",
    );
  });

  it("sem unidade, o erro é do link, e vem antes de qualquer outro", () => {
    expect(kioskError({ ...base, error: "invalid_cpf" })).toBe("unit_not_found");
  });

  it("com paciente na lista, não há erro", () => {
    expect(
      kioskError({
        ...base,
        unit: { id: "u", name: "Pinheiros" },
        patients: [{ id: "p", name: "Théo", times: ["10:00"], hasOpenCheckin: false }],
      }),
    ).toBeUndefined();
  });

  it("quem já está dentro recebe a ação de saída", () => {
    expect(actionFor({ id: "p", name: "x", times: [], hasOpenCheckin: true })).toBe("checkout");
    expect(actionFor({ id: "p", name: "x", times: [], hasOpenCheckin: false })).toBe("checkin");
  });
});

describe("nps-rating-is-zero-to-ten", () => {
  it("convite enviado sem nota é registro legítimo", () => {
    expect(validateNps({ code: "K7M2Q", sent: true }).allowed).toBe(true);
  });

  it("resposta sem nota é recusada", () => {
    expect(validateNps({ code: "K7M2Q", sent: false }).reason).toMatch(/Escolha uma nota de 0 a 10/);
  });

  it("as duas pontas da escala são válidas", () => {
    expect(validateNps({ code: "K7M2Q", sent: false, rating: 0 }).allowed).toBe(true);
    expect(validateNps({ code: "K7M2Q", sent: false, rating: 10 }).allowed).toBe(true);
  });

  it("fora da escala é recusado", () => {
    expect(validateNps({ code: "K7M2Q", sent: false, rating: 11 }).reason).toMatch(/entre 0 e 10/);
    expect(validateNps({ code: "K7M2Q", sent: true, rating: -1 }).reason).toMatch(/entre 0 e 10/);
  });

  it("comentário tem teto de cinco mil caracteres", () => {
    const longo = "a".repeat(5001);
    expect(validateNps({ code: "K7M2Q", sent: false, rating: 9, comment: longo }).reason).toMatch(
      /5000 caracteres/,
    );
  });
});

describe("nps-code-identifies-the-invite", () => {
  it("o código tem exatamente cinco caracteres", () => {
    expect(isValidNpsCode("K7M2Q")).toBe(true);
    expect(isValidNpsCode("K7M2")).toBe(false);
    expect(isValidNpsCode("K7M2QX")).toBe(false);
  });
});

describe("faixa do NPS", () => {
  it("classifica para a leitura interna, não para a tela da família", () => {
    expect(npsBand(0)).toBe("detractor");
    expect(npsBand(6)).toBe("detractor");
    expect(npsBand(7)).toBe("passive");
    expect(npsBand(8)).toBe("passive");
    expect(npsBand(9)).toBe("promoter");
    expect(npsBand(10)).toBe("promoter");
  });
});

describe("envio do NPS é pergunta diferente da validade do registro", () => {
  it("o convite sem nota é registro válido e envio inválido", () => {
    const convite = { code: "K7M2Q", sent: true };
    expect(validateNps(convite).allowed).toBe(true);
    expect(canSubmitNps(convite).reason).toMatch(/Escolha uma nota/);
  });

  it("com nota escolhida, o envio libera", () => {
    expect(canSubmitNps({ code: "K7M2Q", sent: true, rating: 9 }).allowed).toBe(true);
  });

  it("o envio ainda recusa nota fora da escala", () => {
    expect(canSubmitNps({ code: "K7M2Q", sent: true, rating: 42 }).reason).toMatch(/entre 0 e 10/);
  });
});

/* ============================================== portal do responsável legal */

/**
 * O consentimento é o que acontece aqui e em nenhuma outra tela do produto.
 * Estes testes fixam o que fica registrado dele — e as duas situações em que
 * assinar não pode acontecer.
 */

const THEO_REF = { id: "pac-theo", name: "Théo Andrade Lins", birthDate: "2019-11-04" };
const LAURA_REF = { id: "pac-laura", name: "Laura Menendes Pinto", birthDate: "2017-12-02" };

function guardianPlan(overrides: Partial<GuardianPlan> = {}): GuardianPlan {
  return {
    id: "pei",
    patient: THEO_REF,
    name: "PEI 2026-2",
    startAt: "2026-07-01",
    endAt: "2026-12-31",
    expired: false,
    guardianApproved: false,
    goals: [{ id: "m", name: "Comunicação funcional", objectives: ["Pedir itens"] }],
    ...overrides,
  };
}

function guardianData(overrides: Partial<GuardianPortalData> = {}): GuardianPortalData {
  return {
    guardian: { id: "resp-1", name: "Renata Andrade Lins" },
    termsAcceptance: {
      acceptedAt: "2025-03-11T20:14:00.000-03:00",
      ipAddress: "189.45.220.11",
      device: "iPhone · Safari 19",
    },
    patients: [THEO_REF],
    schedules: [],
    plans: [],
    now: "2026-07-30T09:00:00.000-03:00",
    ...overrides,
  };
}

describe("plan-is-visible-only-to-its-guardian", () => {
  it("recusa plano de paciente que não é dela, antes de qualquer outra checagem", () => {
    // Mesmo vencido e já aprovado: a negativa de escopo vem primeiro, para não
    // vazar nem a informação de que o plano existe e está em que estado.
    const alheio = guardianPlan({ patient: LAURA_REF, expired: true, guardianApproved: true });
    const result = canAcceptPlan(alheio, guardianData());
    expect(result.reason).toMatch(/não é de um paciente sob sua responsabilidade/);
  });

  it("aceita plano de paciente sob responsabilidade dela", () => {
    expect(canAcceptPlan(guardianPlan(), guardianData()).allowed).toBe(true);
  });
});

describe("expired-plan-cannot-be-accepted", () => {
  it("bloqueia quando a data final já passou", () => {
    const vencido = guardianPlan({ endAt: "2026-06-30" });
    const result = canAcceptPlan(vencido, guardianData());
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/terminou em 30\/06\/2026/);
  });

  it("bloqueia quando o sistema marcou como vencido, mesmo dentro da data", () => {
    // As duas fontes podem discordar; considerar qualquer uma é a leitura que
    // não deixa passar aceite em plano encerrado.
    const marcado = guardianPlan({ expired: true, endAt: "2026-12-31" });
    expect(isExpired(marcado, "2026-07-30T09:00:00.000-03:00")).toBe(true);
    expect(canAcceptPlan(marcado, guardianData()).allowed).toBe(false);
  });

  it("plano dentro da vigência e não marcado não está vencido", () => {
    expect(isExpired(guardianPlan(), "2026-07-30T09:00:00.000-03:00")).toBe(false);
  });

  it("já aceito bloqueia antes de olhar a vigência, dizendo quando foi", () => {
    const aceito = guardianPlan({ guardianApproved: true, signedAt: "2026-07-05" });
    expect(canAcceptPlan(aceito, guardianData()).reason).toMatch(/já aceitou este plano em 05\/07\/2026/);
  });
});

describe("plan-acceptance-records-who-when-and-what", () => {
  it("grava aprovação, assinatura, data e quem assinou, no mesmo ato", () => {
    const result = acceptPlan(guardianPlan(), "resp-1", "Renata Andrade Lins", "2026-07-30");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.guardianApproved).toBe(true);
      expect(result.plan.signature).toBe("Renata Andrade Lins");
      expect(result.plan.signedAt).toBe("2026-07-30");
      expect(result.plan.signedByGuardianId).toBe("resp-1");
    }
  });

  it("assinatura em branco não é assinatura", () => {
    const result = acceptPlan(guardianPlan(), "resp-1", "   ", "2026-07-30");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/Digite seu nome completo/);
  });

  it("apara o espaço em volta do nome digitado", () => {
    const result = acceptPlan(guardianPlan(), "resp-1", "  Renata  ", "2026-07-30");
    expect(result.ok === true && result.plan.signature).toBe("Renata");
  });
});

describe("plans-cannot-overlap-for-a-patient", () => {
  const existentes = [
    guardianPlan({ id: "a", startAt: "2026-01-01", endAt: "2026-06-30" }),
    guardianPlan({ id: "b", startAt: "2026-07-01", endAt: "2026-12-31" }),
  ];

  it("detecta sobreposição parcial", () => {
    const conflito = overlappingPlans(existentes, {
      patientId: "pac-theo",
      startAt: "2026-06-15",
      endAt: "2026-08-15",
    });
    expect(conflito.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("dois planos que se encostam no mesmo dia estão sobrepostos naquele dia", () => {
    const conflito = overlappingPlans(existentes, {
      patientId: "pac-theo",
      startAt: "2026-06-30",
      endAt: "2026-06-30",
    });
    expect(conflito.map((p) => p.id)).toEqual(["a"]);
  });

  it("período livre não conflita", () => {
    expect(
      overlappingPlans(existentes, {
        patientId: "pac-theo",
        startAt: "2027-01-01",
        endAt: "2027-06-30",
      }),
    ).toEqual([]);
  });

  it("plano de outro paciente nunca conflita", () => {
    expect(
      overlappingPlans(existentes, {
        patientId: "pac-laura",
        startAt: "2026-06-15",
        endAt: "2026-08-15",
      }),
    ).toEqual([]);
  });

  it("editar o próprio plano não conflita consigo mesmo", () => {
    const conflito = overlappingPlans(existentes, {
      patientId: "pac-theo",
      startAt: "2026-01-01",
      endAt: "2026-06-30",
      excludeId: "a",
    });
    expect(conflito).toEqual([]);
  });
});

describe("terms-acceptance-records-context", () => {
  it("os três dados precisam estar presentes", () => {
    expect(missingTermsContext(undefined)).toEqual([
      "instante",
      "endereço de rede",
      "dispositivo",
    ]);
    expect(
      missingTermsContext({ acceptedAt: "2025-03-11T20:14:00.000-03:00", ipAddress: "", device: "iPhone" }),
    ).toEqual(["endereço de rede"]);
  });

  it("aceite completo não acusa nada", () => {
    expect(missingTermsContext(guardianData().termsAcceptance)).toEqual([]);
    expect(hasAcceptedTerms(guardianData())).toBe(true);
    expect(hasAcceptedTerms(guardianData({ termsAcceptance: undefined }))).toBe(false);
  });
});

describe("o que a família vê da agenda", () => {
  const dados = guardianData({
    schedules: [
      {
        id: "passado",
        patientName: "Théo",
        start: "2026-07-20T10:00:00.000-03:00",
        end: "2026-07-20T11:00:00.000-03:00",
        professionalName: "Marina",
        serviceName: "ABA",
        unitName: "Pinheiros",
        cancelled: false,
      },
      {
        id: "cancelado",
        patientName: "Théo",
        start: "2026-08-06T10:00:00.000-03:00",
        end: "2026-08-06T11:00:00.000-03:00",
        professionalName: "Marina",
        serviceName: "ABA",
        unitName: "Pinheiros",
        cancelled: true,
      },
      {
        id: "futuro",
        patientName: "Théo",
        start: "2026-08-04T09:00:00.000-03:00",
        end: "2026-08-04T10:00:00.000-03:00",
        professionalName: "Clara",
        serviceName: "Psicologia",
        unitName: "Pinheiros",
        cancelled: false,
      },
    ],
  });

  it("mostra o que ainda vai acontecer, em ordem de horário", () => {
    expect(upcomingSchedules(dados).map((s) => s.id)).toEqual(["futuro", "cancelado"]);
  });

  it("cancelado continua na lista — sumir faria a família descobrir na clínica", () => {
    expect(upcomingSchedules(dados).some((s) => s.cancelled)).toBe(true);
  });
});

describe("planos esperando aceite", () => {
  it("conta só os próprios, vigentes e não assinados", () => {
    const dados = guardianData({
      plans: [
        guardianPlan({ id: "pendente" }),
        guardianPlan({ id: "assinado", guardianApproved: true }),
        guardianPlan({ id: "vencido", expired: true }),
        guardianPlan({ id: "alheio", patient: LAURA_REF }),
      ],
    });
    expect(plansAwaitingAcceptance(dados).map((p) => p.id)).toEqual(["pendente"]);
  });
});

/* ==================================================== portal da operadora */

/**
 * O único lugar do produto em que dados de uma clínica são mostrados a uma
 * organização de fora. Estes testes fixam o que conta como prestado — e a
 * omissão que o escopo faz em silêncio.
 */

function attendanceRow(overrides: Partial<AttendanceRow> & { id: string }): AttendanceRow {
  return {
    date: "2026-07-06",
    start: "2026-07-06T14:00:00.000-03:00",
    end: "2026-07-06T15:00:00.000-03:00",
    patientName: "Théo Andrade Lins",
    professionalName: "Marina Okabe",
    serviceName: "Terapia ABA",
    status: "finished",
    ...overrides,
  };
}

function insurerData(overrides: Partial<InsurerPortalData> = {}): InsurerPortalData {
  return {
    healthCare: {
      id: "op",
      name: "Bradesco Saúde",
      ansRegister: "005711",
      cnpj: "11.222.333/0001-44",
      skipEligibility: false,
      planTypes: [],
    },
    period: { start: "2026-07-01", end: "2026-07-31" },
    patients: [],
    attendance: [],
    hiddenIncompleteCount: 0,
    now: "2026-08-01T09:00:00.000-03:00",
    ...overrides,
  };
}

describe("attendance-list-counts-only-what-happened", () => {
  const dados = insurerData({
    attendance: [
      attendanceRow({ id: "1" }),
      attendanceRow({ id: "2" }),
      attendanceRow({ id: "3", status: "missed" }),
      attendanceRow({ id: "4", status: "cancelled" }),
      attendanceRow({ id: "5", status: "pending_signature" }),
      attendanceRow({ id: "6", status: "pending_supervisor_signature" }),
      attendanceRow({ id: "7", status: "pending_register" }),
    ],
  });

  it("só Finalizado conta como prestado", () => {
    expect(wasDelivered(attendanceRow({ id: "x" }))).toBe(true);
    expect(wasDelivered(attendanceRow({ id: "x", status: "pending_signature" }))).toBe(false);
  });

  it("separa o que fechou do que apenas aconteceu", () => {
    // A distinção existe porque contar um atendimento pendente como prestado
    // antecipa uma cobrança que ainda não fechou.
    const resumo = attendanceSummary(dados);
    expect(resumo.delivered).toBe(2);
    expect(resumo.pendingClosure).toBe(3);
    expect(resumo.missed).toBe(1);
    expect(resumo.cancelled).toBe(1);
    expect(resumo.total).toBe(7);
  });

  it("cada situação não prestada tem um motivo escrito", () => {
    expect(notDeliveredReason(attendanceRow({ id: "x", status: "missed" }))).toBe(
      "Paciente faltou",
    );
    expect(notDeliveredReason(attendanceRow({ id: "x", status: "pending_supervisor_signature" }))).toMatch(
      /aguardando assinatura do supervisor/,
    );
    expect(notDeliveredReason(attendanceRow({ id: "x" }))).toBeUndefined();
  });

  it("período sem movimento zera tudo sem quebrar", () => {
    const vazio = attendanceSummary(insurerData());
    expect(vazio).toEqual({ delivered: 0, pendingClosure: 0, missed: 0, cancelled: 0, total: 0 });
  });
});

describe("insurer-sees-only-its-own-beneficiaries", () => {
  const dados = insurerData({
    patients: [
      {
        patient: { id: "pac-theo", name: "Théo", birthDate: "2019-11-04" },
        planName: "Efetivo Pleno",
        cardNumber: "0000",
        attendedSessions: 3,
        missedSessions: 1,
      },
    ],
  });

  it("reconhece quem tem plano desta operadora", () => {
    expect(isBeneficiary(dados, "pac-theo")).toBe(true);
  });

  it("não reconhece paciente da clínica sem plano desta operadora", () => {
    // O vínculo é o plano, não a clínica: é por isso que alguém some da lista
    // ao trocar de convênio, mesmo continuando em atendimento.
    expect(isBeneficiary(dados, "pac-laura")).toBe(false);
  });
});

describe("incomplete-schedules-are-hidden-from-the-insurer", () => {
  it("expõe quantos agendamentos o escopo omitiu", () => {
    expect(hiddenFromInsurer(insurerData({ hiddenIncompleteCount: 2 }))).toBe(2);
    expect(hiddenFromInsurer(insurerData())).toBe(0);
  });
});

describe("insurer-sees-attendance-not-clinical-record", () => {
  it("a lista do que não é compartilhado nomeia o conteúdo clínico", () => {
    // Existe como constante, e não como texto na tela, para sobreviver a uma
    // reescrita de layout: é decisão de privacidade, não de composição.
    expect(NOT_SHARED_WITH_INSURER).toContain("a evolução escrita da sessão");
    expect(NOT_SHARED_WITH_INSURER).toContain("as tentativas registradas nos programas");
    expect(NOT_SHARED_WITH_INSURER).toHaveLength(4);
  });
});

/* ============================================================= estrutura */

/**
 * A camada física que a agenda esbarra. Nenhuma dessas restrições aparece numa
 * tela de agendamento — e é justamente por isso que elas precisam ter teste.
 */

function room(overrides: Partial<Room> & { id: string }): Room {
  return {
    name: overrides.id,
    roomType: "individual",
    capacity: 2,
    active: true,
    ...overrides,
  };
}

function service(overrides: Partial<Service> & { id: string }): Service {
  return {
    name: overrides.id,
    durationInMinutes: 60,
    needsRoom: true,
    roomTypes: ["individual"],
    notChargeable: false,
    ...overrides,
  };
}

function structureData(overrides: Partial<StructureData> = {}): StructureData {
  return {
    unit: { id: "u", name: "Pinheiros" },
    rooms: [],
    services: [],
    blockings: [],
    now: "2026-07-30T09:00:00.000-03:00",
    ...overrides,
  };
}

describe("service-decides-which-rooms-serve", () => {
  it("sala de tipo diferente não serve, mesmo livre", () => {
    const coletiva = room({ id: "grupo", roomType: "collective", capacity: 6 });
    const individual = service({ id: "aba" });
    expect(roomServes(coletiva, individual)).toBe(false);
    expect(canUseRoom(coletiva, individual).reason).toMatch(
      /precisa de sala individual, e grupo é coletiva/,
    );
  });

  it("serviço que não exige sala aceita qualquer uma", () => {
    const semSala = service({ id: "devolutiva", needsRoom: false, roomTypes: [] });
    expect(roomServes(room({ id: "qualquer", roomType: "motricity" }), semSala)).toBe(true);
  });

  it("serviço com mais de um tipo aceito serve nos dois", () => {
    const flexivel = service({ id: "flex", roomTypes: ["individual", "collective"] });
    expect(roomServes(room({ id: "a" }), flexivel)).toBe(true);
    expect(roomServes(room({ id: "b", roomType: "collective" }), flexivel)).toBe(true);
    expect(roomServes(room({ id: "c", roomType: "motricity" }), flexivel)).toBe(false);
  });
});

describe("room-capacity-limits-the-session", () => {
  it("sala inativa é descartada antes de qualquer outra checagem", () => {
    // Capacidade de uma sala em reforma não é informação útil.
    const inativa = room({ id: "sala-4", active: false, deactivationDate: "2026-07-14", capacity: 10 });
    const result = canUseRoom(inativa, service({ id: "aba" }), 1);
    expect(result.reason).toMatch(/está inativa desde 14\/07\/2026/);
  });

  it("capacidade insuficiente bloqueia, dizendo os dois números", () => {
    const pequena = room({ id: "sala-1", capacity: 2 });
    expect(canUseRoom(pequena, service({ id: "aba" }), 4).reason).toMatch(
      /comporta 2 pessoas, e o atendimento tem 4/,
    );
  });

  it("lista só salas ativas, do tipo certo e com capacidade", () => {
    const dados = structureData({
      rooms: [
        room({ id: "ok" }),
        room({ id: "inativa", active: false }),
        room({ id: "coletiva", roomType: "collective", capacity: 6 }),
        room({ id: "pequena", capacity: 1 }),
      ],
    });
    expect(roomsFor(dados, service({ id: "aba" }), 2).map((r) => r.id)).toEqual(["ok"]);
  });
});

describe("service-without-room-type-is-a-contradiction", () => {
  it("exigir sala sem declarar tipo torna o serviço inagendável", () => {
    expect(isImpossibleToSchedule(service({ id: "x", needsRoom: true, roomTypes: [] }))).toBe(true);
  });

  it("não exigir sala não é contradição", () => {
    expect(isImpossibleToSchedule(service({ id: "x", needsRoom: false, roomTypes: [] }))).toBe(
      false,
    );
  });

  it("o efeito distingue contradição de falta de sala", () => {
    const dados = structureData({ rooms: [] });
    const contraditorio = serviceEffects(
      service({ id: "x", needsRoom: true, roomTypes: [] }),
      dados,
    );
    const semSala = serviceEffects(service({ id: "y", roomTypes: ["motricity"] }), dados);

    expect(contraditorio.join(" ")).toMatch(/contradição de cadastro, não falta de sala/);
    expect(semSala.join(" ")).toMatch(/nenhuma sala ativa desta unidade atende/);
  });
});

describe("three-scopes-of-blocking", () => {
  const dados = structureData({
    blockings: [
      {
        id: "feriado",
        scope: "general",
        blockingType: "slot",
        start: "2026-07-09T00:00:00.000-03:00",
        end: "2026-07-10T00:00:00.000-03:00",
        isHoliday: true,
        holidayName: "Revolução Constitucionalista",
      },
      {
        id: "almoco",
        scope: "unit",
        blockingType: "time_period",
        start: "2026-07-30T12:00:00.000-03:00",
        end: "2026-07-30T14:00:00.000-03:00",
        observation: "Unidade fechada para almoço",
        isHoliday: false,
      },
      {
        id: "ferias",
        scope: "professional",
        blockingType: "time_period",
        start: "2026-07-27T00:00:00.000-03:00",
        end: "2026-08-04T00:00:00.000-03:00",
        observation: "Marina Okabe em férias",
        isHoliday: false,
        professionalName: "Marina Okabe",
      },
    ],
  });

  it("bloqueio de profissional só vale para ele", () => {
    const paraMarina = blockingsAt(dados, "2026-07-30T13:00:00.000-03:00", "Marina Okabe");
    const paraClara = blockingsAt(dados, "2026-07-30T13:00:00.000-03:00", "Clara Vidigal");
    expect(paraMarina.map((b) => b.id)).toEqual(["almoco", "ferias"]);
    expect(paraClara.map((b) => b.id)).toEqual(["almoco"]);
  });

  it("devolve todos os bloqueios que cobrem o instante, não só o primeiro", () => {
    // Resolver um não libera o outro: são restrições independentes.
    expect(blockingsAt(dados, "2026-07-30T13:00:00.000-03:00", "Marina Okabe")).toHaveLength(2);
  });

  it("o fim do intervalo é exclusivo", () => {
    expect(blockingsAt(dados, "2026-07-30T14:00:00.000-03:00")).toHaveLength(0);
    expect(blockingsAt(dados, "2026-07-30T12:00:00.000-03:00")).toHaveLength(1);
  });

  it("cada origem oferece uma saída diferente", () => {
    expect(blockingMessage(dados.blockings[0]!).exit).toMatch(/outro dia/);
    expect(blockingMessage(dados.blockings[1]!).exit).toMatch(/outro horário ou outra unidade/);
    expect(blockingMessage(dados.blockings[2]!).exit).toMatch(/outro profissional/);
  });

  it("o feriado é nomeado no título, quando tem nome", () => {
    expect(blockingMessage(dados.blockings[0]!).title).toMatch(
      /Revolução Constitucionalista — a clínica não abre/,
    );
  });
});

describe("not-chargeable-service-skips-checkin", () => {
  it("é o cadastro do serviço que desliga a guarda de check-in", () => {
    expect(skipsCheckin(service({ id: "x", notChargeable: true }))).toBe(true);
    expect(skipsCheckin(service({ id: "y" }))).toBe(false);
  });

  it("o efeito é declarado em texto, ligando cadastro e atendimento", () => {
    const efeitos = serviceEffects(
      service({ id: "devolutiva", needsRoom: false, roomTypes: [], notChargeable: true }),
      structureData(),
    );
    expect(efeitos.join(" ")).toMatch(/dispensa o check-in/);
    expect(efeitos.join(" ")).toMatch(/guarda de início do atendimento não se aplica/);
  });
});

/* ============================================================ prontuário */

/**
 * O prontuário substituiu um modelo inventado — um booleano de "restrito" e uma
 * permissão que não existe. O real é por tipo de documento, e dois dos três
 * tipos não são abertos por ninguém.
 */

function patientDocument(
  overrides: Partial<PatientDocument> & { id: string },
): PatientDocument {
  return { name: overrides.id, type: "clinical", ...overrides };
}

function patientRecord(overrides: Partial<PatientRecordType> = {}): PatientRecordType {
  return {
    patient: { id: "pac-theo", name: "Théo Andrade Lins", birthDate: "2019-11-04" },
    documents: [],
    anamnese: {
      status: "finished",
      behaviors: {
        usesBottle: "Não",
        sucksThumb: "Sim",
        sittingPositionAtHome: "Em W",
        usesScreenDevices: "2 horas",
      },
    },
    alertCriteria: {
      maximumConsecutiveAbsences: 3,
      maximumAbsences: 6,
      requiredSessionCount: 12,
    },
    attendance: { consecutiveAbsences: 1, absences: 2, sessions: 14 },
    now: "2026-07-30T09:00:00.000-03:00",
    ...overrides,
  };
}

describe("only-clinical-documents-are-visible", () => {
  it("documento pessoal e administrativo não abrem em papel nenhum", () => {
    for (const type of ["personal", "administrative"] as const) {
      const doc = patientDocument({ id: "d", type });
      for (const role of ["admin", "coordinator", "therapeutic_companion", "attendant"]) {
        const result = canViewDocument(doc, role);
        expect(result.allowed).toBe(false);
        expect(result.reason).toMatch(/em nenhum perfil/);
      }
    }
  });

  it("documento clínico abre para os sete papéis da cláusula permissiva", () => {
    const doc = patientDocument({ id: "d" });
    for (const role of [
      "admin",
      "clinic_admin",
      "attendant",
      "coordinator",
      "operation",
      "therapeutic_companion",
      "supervisor",
    ]) {
      expect(canViewDocument(doc, role).allowed).toBe(true);
    }
  });

  it("especialista, aplicador e People ficam de fora até do clínico", () => {
    const doc = patientDocument({ id: "d" });
    for (const role of ["specialist", "applicator", "people"]) {
      const result = canViewDocument(doc, role);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/Seu perfil não abre documento clínico/);
    }
  });

  it("a negativa distingue nenhum-perfil-abre de seu-perfil-não-abre", () => {
    // As duas frases levam a ações diferentes: uma manda procurar outro canal,
    // a outra manda procurar outra pessoa.
    expect(canViewDocument(patientDocument({ id: "d", type: "personal" }), "admin").reason).toMatch(
      /em nenhum perfil/,
    );
    expect(canViewDocument(patientDocument({ id: "d" }), "specialist").reason).toMatch(
      /Seu perfil/,
    );
  });
});

describe("documents-warn-before-expiring", () => {
  const NOW = "2026-07-30T09:00:00.000-03:00";

  it("avisa dentro da antecedência configurada no próprio documento", () => {
    const laudo = patientDocument({ id: "l", validUntil: "2026-08-12", alertLeadDays: 60 });
    expect(documentValidity(laudo, NOW)).toEqual({ state: "warning", daysLeft: 13 });
  });

  it("não avisa quando ainda está fora da antecedência", () => {
    const carteirinha = patientDocument({ id: "c", validUntil: "2026-08-30", alertLeadDays: 15 });
    expect(documentValidity(carteirinha, NOW).state).toBe("valid");
  });

  it("sem antecedência configurada, só o vencimento importa", () => {
    const semAviso = patientDocument({ id: "s", validUntil: "2026-08-01" });
    expect(documentValidity(semAviso, NOW).state).toBe("valid");
    expect(documentValidity({ ...semAviso, validUntil: "2026-07-29" }, NOW).state).toBe("expired");
  });

  it("documento sem validade não entra na conta", () => {
    expect(documentValidity(patientDocument({ id: "x" }), NOW)).toEqual({ state: "undated" });
  });

  it("ordena o que exige atenção pelo mais urgente", () => {
    const record = patientRecord({
      documents: [
        patientDocument({ id: "laudo", validUntil: "2026-08-12", alertLeadDays: 60 }),
        patientDocument({ id: "vencido", validUntil: "2026-06-01", alertLeadDays: 30 }),
        patientDocument({ id: "carteirinha", validUntil: "2026-08-05", alertLeadDays: 15 }),
        patientDocument({ id: "tranquilo", validUntil: "2027-01-01", alertLeadDays: 10 }),
      ],
    });
    expect(documentsNeedingAttention(record).map((d) => d.id)).toEqual([
      "vencido",
      "carteirinha",
      "laudo",
    ]);
  });
});

describe("anamnese-cannot-finish-incomplete", () => {
  const incompleta = {
    status: "pending" as const,
    behaviors: { usesBottle: "Não", sucksThumb: "   ", sittingPositionAtHome: "Em W" },
  };

  it("campo em branco e campo só com espaço contam como faltando", () => {
    expect(missingBehaviors(incompleta)).toEqual(["chupa o dedo", "uso de telas"]);
  });

  it("recusa a finalização nomeando o que falta", () => {
    const result = canFinishAnamnese(incompleta);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/chupa o dedo, uso de telas/);
  });

  it("libera quando os quatro estão respondidos", () => {
    expect(canFinishAnamnese(patientRecord().anamnese).allowed).toBe(false); // já finalizada
    expect(
      canFinishAnamnese({
        status: "pending",
        behaviors: {
          usesBottle: "Não",
          sucksThumb: "Sim",
          sittingPositionAtHome: "Em W",
          usesScreenDevices: "2 horas",
        },
      }).allowed,
    ).toBe(true);
  });

  it("descreve o comportamento atual do monólito, que é diferente", () => {
    // Hoje a operação relata sucesso e o status volta para pendente em silêncio.
    // O teste existe para que a divergência seja visível, não para aprová-la.
    const atual = currentMonolithBehaviour(incompleta);
    expect(atual.reportedSuccess).toBe(true);
    expect(atual.resultingStatus).toBe("pending");
  });

  it("com os campos completos, o comportamento atual e o proposto coincidem", () => {
    const completa = {
      status: "pending" as const,
      behaviors: {
        usesBottle: "Não",
        sucksThumb: "Sim",
        sittingPositionAtHome: "Em W",
        usesScreenDevices: "2 horas",
      },
    };
    expect(currentMonolithBehaviour(completa).resultingStatus).toBe("finished");
    expect(canFinishAnamnese(completa).allowed).toBe(true);
  });
});

describe("absence-alerts-are-per-patient", () => {
  it("cada critério estourado vira um alerta com número e limite", () => {
    const alertas = absenceAlerts(
      patientRecord({ attendance: { consecutiveAbsences: 4, absences: 7, sessions: 9 } }),
    );
    expect(alertas).toHaveLength(3);
    expect(alertas[0]).toMatch(/4 faltas seguidas, e o limite deste paciente é 3/);
    expect(alertas[2]).toMatch(/9 sessões realizadas, abaixo das 12/);
  });

  it("dentro dos limites não alerta", () => {
    expect(absenceAlerts(patientRecord())).toEqual([]);
  });

  it("o mesmo número alarma um paciente e não alarma outro", () => {
    // É a razão de o critério ser por paciente e não da clínica.
    const attendance = { consecutiveAbsences: 3, absences: 3, sessions: 20 };
    const rigoroso = patientRecord({
      attendance,
      alertCriteria: { maximumConsecutiveAbsences: 2, maximumAbsences: 4, requiredSessionCount: 12 },
    });
    const tolerante = patientRecord({
      attendance,
      alertCriteria: { maximumConsecutiveAbsences: 5, maximumAbsences: 8, requiredSessionCount: 12 },
    });
    expect(absenceAlerts(rigoroso)).toHaveLength(1);
    expect(absenceAlerts(tolerante)).toHaveLength(0);
  });

  it("sem critérios, nenhum alerta — e não há padrão da clínica", () => {
    const semCriterio = patientRecord({
      alertCriteria: undefined,
      attendance: { consecutiveAbsences: 20, absences: 30, sessions: 0 },
    });
    expect(absenceAlerts(semCriterio)).toEqual([]);
    expect(hasCriteria(semCriterio)).toBe(false);
  });
});

/* ============================================================== gerência */

/**
 * A gerência é fácil de ler como painel de indicadores. Estes testes fixam a
 * outra leitura: fila de trabalho, com dono e com consequência para o que fica
 * parado.
 */

function reportControl(overrides: Partial<ReportControl> & { id: string }): ReportControl {
  return {
    patientName: "Théo",
    professionalName: "Marina",
    reportType: "evolution_month",
    status: "not_started",
    requester: "operator",
    dueDate: "2026-07-31",
    ...overrides,
  };
}

function managementData(overrides: Partial<ManagementData> = {}): ManagementData {
  return {
    unit: { id: "u", name: "Pinheiros" },
    now: "2026-08-03T09:00:00.000-03:00",
    reports: [],
    mentorshipGaps: [],
    incompleteProfessionals: [],
    patientsWithoutOwner: [],
    ...overrides,
  };
}

describe("report-urgency-depends-on-requester", () => {
  const daOperadora = reportControl({ id: "op", requester: "operator", dueDate: "2026-07-25" });
  const daFamilia = reportControl({ id: "fam", requester: "family", dueDate: "2026-07-20" });

  it("o mais antigo não é o mais urgente", () => {
    // 14 dias de atraso da família vêm depois de 9 dias da operadora.
    expect(daysLate(daFamilia, managementData().now)).toBe(14);
    expect(daysLate(daOperadora, managementData().now)).toBe(9);

    const fila = reportQueue(managementData({ reports: [daFamilia, daOperadora] }));
    expect(fila.map((r) => r.id)).toEqual(["op", "fam"]);
  });

  it("a consequência é concreta, e diferente entre as duas origens", () => {
    expect(overdueConsequence(daOperadora)).toMatch(/segura a próxima autorização e o faturamento/);
    expect(overdueConsequence(daFamilia)).toMatch(/não trava nada no sistema/);
    expect(overdueConsequence(daFamilia)).toMatch(/procurar outra clínica/);
  });

  it("o que ainda não venceu fica depois de todo atraso", () => {
    const futuro = reportControl({ id: "futuro", dueDate: "2026-08-14" });
    const fila = reportQueue(managementData({ reports: [futuro, daFamilia, daOperadora] }));
    expect(fila.map((r) => r.id)).toEqual(["op", "fam", "futuro"]);
  });

  it("concluído e cancelado saem da fila", () => {
    const fila = reportQueue(
      managementData({
        reports: [
          reportControl({ id: "feito", status: "completed", dueDate: "2026-07-10" }),
          reportControl({ id: "cancelado", status: "cancelled", dueDate: "2026-07-10" }),
          daOperadora,
        ],
      }),
    );
    expect(fila.map((r) => r.id)).toEqual(["op"]);
  });

  it("concluído não conta como atrasado, mesmo vencido", () => {
    expect(
      isOverdue(reportControl({ id: "x", status: "completed", dueDate: "2026-01-01" }), managementData().now),
    ).toBe(false);
  });
});

describe("applicator-without-supervisor-cannot-close", () => {
  const semSupervisor: MentorshipGap = {
    professionalId: "p1",
    professionalName: "Otávio",
    specialty: "Aplicador ABA",
    kind: "applicator_without_supervisor",
  };
  const semSupervisionados: MentorshipGap = {
    professionalId: "p2",
    professionalName: "Clara",
    specialty: "Psicologia",
    kind: "supervisor_without_applicators",
  };

  it("só a lacuna do aplicador trava alguma coisa", () => {
    expect(isBlocking(semSupervisor)).toBe(true);
    expect(isBlocking(semSupervisionados)).toBe(false);
  });

  it("a consequência do aplicador é sobre sessão que não fecha", () => {
    expect(mentorshipConsequence(semSupervisor)).toMatch(/não terão quem as assine/);
    expect(mentorshipConsequence(semSupervisionados)).toMatch(/Não é um problema por si/);
  });
});

describe("management-fronts-have-owners", () => {
  const dados = managementData({
    reports: [reportControl({ id: "op", dueDate: "2026-07-25" })],
    mentorshipGaps: [
      {
        professionalId: "p1",
        professionalName: "Otávio",
        specialty: "Aplicador ABA",
        kind: "applicator_without_supervisor",
      },
    ],
    incompleteProfessionals: [
      { id: "p2", name: "Helena", specialty: "TO", missing: ["CPF"] },
    ],
    patientsWithoutOwner: [
      { id: "pac", name: "Noah", unitName: "Pinheiros", sinceDate: "2026-06-18" },
    ],
  });

  it("toda frente tem dono nomeado", () => {
    for (const front of fronts(dados)) {
      expect(front.owner.length).toBeGreaterThan(0);
    }
  });

  it("marca como travante só o que de fato trava", () => {
    const porId = Object.fromEntries(fronts(dados).map((f) => [f.id, f]));
    expect(porId.reports!.blocking).toBe(true); // relatório da operadora atrasado
    expect(porId.mentorship!.blocking).toBe(true);
    expect(porId.professionals!.blocking).toBe(false);
    expect(porId.patients!.blocking).toBe(false);
  });

  it("relatório atrasado só da família não marca a frente como travante", () => {
    const soFamilia = managementData({
      reports: [reportControl({ id: "fam", requester: "family", dueDate: "2026-07-20" })],
    });
    const frente = fronts(soFamilia).find((f) => f.id === "reports")!;
    expect(frente.count).toBe(1);
    expect(frente.blocking).toBe(false);
  });

  it("sem pendência, as contagens zeram", () => {
    expect(fronts(managementData()).every((front) => front.count === 0)).toBe(true);
  });
});

describe("patient-without-clinical-owner-drifts", () => {
  it("conta há quantos dias o paciente está sem responsável", () => {
    expect(daysWithoutOwner("2026-06-18", "2026-08-03T09:00:00.000-03:00")).toBe(46);
  });
});

describe("acesso à gerência", () => {
  it("é de admin, admin de clínica e coordenação", () => {
    expect(canOpenManagement(["management.list"]).allowed).toBe(true);
    expect(canOpenManagement(["patients.list"]).reason).toMatch(
      /admin, admin de clínica e coordenação/,
    );
  });
});

/* ========================================================= mapa de horas */

/**
 * O mapa gera a grade e, onde há conflito, apaga o campo em conflito em vez de
 * falhar. Estes testes fixam qual campo cada família de conflito apaga — e que
 * um horário pode perder os dois e ainda assim ser criado.
 */

function hourMapSlot(
  overrides: Partial<HourMapSlot> & { id: string; weekday: number },
): HourMapSlot {
  return {
    startAt: "14:00",
    endAt: "15:00",
    specialty: "Aplicador ABA",
    serviceName: "Terapia ABA",
    sessionLocation: "in_clinic",
    scheduleType: "patient",
    professionalName: "Marina Okabe",
    roomName: "Sala 1",
    conflicts: [],
    ...overrides,
  };
}

function hourMapFixture(overrides: Partial<HourMap> = {}): HourMap {
  return {
    id: "mapa",
    patient: { id: "pac", name: "Théo", birthDate: "2019-11-04" },
    unitName: "Pinheiros",
    status: "creating",
    durationStart: "2026-08-01",
    durationEnd: "2026-12-31",
    autoRenew: true,
    slots: [],
    warnings: [],
    ...overrides,
  };
}

describe("conflict-family-decides-what-is-lost", () => {
  it("os quatro conflitos de profissional apagam o profissional", () => {
    for (const conflict of PROFESSIONAL_CONFLICTS) {
      const slot = hourMapSlot({ id: "s", weekday: 1, conflicts: [conflict] });
      expect(losesProfessional(slot)).toBe(true);
      expect(losesRoom(slot)).toBe(false);
    }
  });

  it("os dois conflitos de sala apagam a sala", () => {
    for (const conflict of ROOM_CONFLICTS) {
      const slot = hourMapSlot({ id: "s", weekday: 1, conflicts: [conflict] });
      expect(losesRoom(slot)).toBe(true);
      expect(losesProfessional(slot)).toBe(false);
    }
  });

  it("um horário pode perder os dois", () => {
    const slot = hourMapSlot({
      id: "s",
      weekday: 1,
      conflicts: ["professional_blocked", "room_blocked"],
    });
    expect(losesProfessional(slot)).toBe(true);
    expect(losesRoom(slot)).toBe(true);
  });

  it("basta um conflito da família para apagar o campo", () => {
    // Espelha `set_field_value/4`: não é o pior conflito que decide, é o primeiro.
    const slot = hourMapSlot({ id: "s", weekday: 1, conflicts: ["no_agenda"] });
    expect(losesProfessional(slot)).toBe(true);
  });

  it("cada conflito aponta um responsável, e eles diferem", () => {
    expect(conflictMessage("no_agenda").owner).toMatch(/People/);
    expect(conflictMessage("professional_occupied").owner).toMatch(/Coordenação/);
    expect(conflictMessage("room_occupied").owner).toMatch(/Administração da unidade/);
  });
});

describe("no-agenda-is-not-a-clash", () => {
  it("distingue cadastro faltando de horário ocupado", () => {
    expect(conflictMessage("no_agenda").what).toMatch(/cadastro faltando, não horário ocupado/);
    expect(conflictMessage("professional_occupied").what).toMatch(/já tem outro atendimento/);
  });

  it("e por isso aponta um responsável diferente", () => {
    expect(conflictMessage("no_agenda").owner).not.toEqual(
      conflictMessage("professional_occupied").owner,
    );
  });
});

describe("hour-map-generates-with-holes", () => {
  const comBuracos = hourMapFixture({
    slots: [
      hourMapSlot({ id: "ok1", weekday: 1 }),
      hourMapSlot({ id: "ok2", weekday: 2 }),
      hourMapSlot({ id: "semProf", weekday: 3, conflicts: ["no_agenda"] }),
      hourMapSlot({ id: "semSala", weekday: 4, conflicts: ["room_occupied"] }),
      hourMapSlot({
        id: "semAmbos",
        weekday: 5,
        conflicts: ["professional_blocked", "room_blocked"],
      }),
    ],
  });

  it("conta as duas famílias separadamente, e elas se sobrepõem", () => {
    // O horário que perde os dois entra nas duas contagens: é o que permite
    // dizer a quem entregar cada parte.
    expect(mapSummary(comBuracos)).toEqual({
      total: 5,
      complete: 2,
      withoutProfessional: 2,
      withoutRoom: 2,
    });
  });

  it("lista os horários que nasceram incompletos", () => {
    expect(incompleteSlots(comBuracos).map((s) => s.id)).toEqual([
      "semProf",
      "semSala",
      "semAmbos",
    ]);
  });

  it("aplicar continua permitido mesmo com buracos", () => {
    // É assim no monólito, e é defensável. O que a especificação exige é que a
    // decisão seja informada, não bloqueada.
    expect(canApply(comBuracos, ["hour_maps.manage_hour_map"]).allowed).toBe(true);
  });

  it("mas não aplica um mapa em branco", () => {
    expect(canApply(hourMapFixture(), ["hour_maps.manage_hour_map"]).reason).toMatch(
      /ao menos um horário/,
    );
  });

  it("bloqueia por permissão antes de olhar o conteúdo", () => {
    expect(canApply(comBuracos, []).reason).toMatch(/admin, admin de clínica e coordenação/);
  });
});

describe("applied-map-is-not-redrawn", () => {
  const aplicado = hourMapFixture({
    status: "applied",
    slots: [hourMapSlot({ id: "s", weekday: 1 })],
  });

  it("não edita o desenho depois de aplicado", () => {
    expect(canEdit(aplicado, ["hour_maps.manage_hour_map"]).reason).toMatch(
      /já viraram atendimento/,
    );
  });

  it("nem aplica de novo", () => {
    expect(canApply(aplicado, ["hour_maps.manage_hour_map"]).reason).toMatch(/já foi aplicado/);
  });

  it("mapa cancelado pede um novo", () => {
    const cancelado = { ...aplicado, status: "cancelled" as const };
    expect(canApply(cancelado, ["hour_maps.manage_hour_map"]).reason).toMatch(/Desenhe um novo/);
  });

  it("mapa em desenho é editável", () => {
    expect(canEdit(hourMapFixture(), ["hour_maps.manage_hour_map"]).allowed).toBe(true);
  });
});

describe("horas por semana", () => {
  it("conta o desenho, e não o que sobrou depois dos conflitos", () => {
    // É o número combinado com a família, e ele não muda porque uma sala estava
    // ocupada.
    const mapa = hourMapFixture({
      slots: [
        hourMapSlot({ id: "a", weekday: 1, startAt: "14:00", endAt: "15:00" }),
        hourMapSlot({
          id: "b",
          weekday: 3,
          startAt: "08:00",
          endAt: "10:00",
          conflicts: ["room_blocked"],
        }),
      ],
    });
    expect(weeklyMinutes(mapa)).toBe(180);
  });

  it("nomeia os dias da semana a partir de 1", () => {
    expect(weekdayLabel(1)).toBe("Segunda");
    expect(weekdayLabel(7)).toBe("Domingo");
  });
});

/* ================================================================== chat */

/**
 * O chat é fácil de tratar como recurso secundário. Estes testes fixam o que o
 * schema diz: registro permanente de coordenação clínica, aberto à equipe
 * inteira — inclusive ao aplicador, para quem é o único canal escrito do caso.
 */

const DIRETORIO_TESTE = [
  { username: "clara", role: "supervisor" },
  { username: "marina", role: "therapeutic_companion" },
  { username: "otavio", role: "applicator" },
  { username: "helena", role: "attendant" },
];

describe("mention-notifies-but-does-not-grant", () => {
  it("extrai menções com ponto e sublinhado no nome", () => {
    expect(extractMentions("@marina.okabe e @clara vejam isso")).toEqual([
      "marina.okabe",
      "clara",
    ]);
  });

  it("apara o ponto final de fim de frase", () => {
    // "@clara." no fim de uma frase precisa encontrar "clara".
    expect(extractMentions("Combinado com @clara.")).toEqual(["clara"]);
  });

  it("não repete a mesma menção", () => {
    expect(extractMentions("@clara, @clara, @clara")).toEqual(["clara"]);
  });

  it("texto sem menção devolve lista vazia", () => {
    expect(extractMentions("Sessão correu bem hoje.")).toEqual([]);
    expect(extractMentions("e-mail@exemplo.test")).toEqual(["exemplo.test"]);
  });

  it("avisa quando a pessoa mencionada não alcança o chat", () => {
    const avisos = mentionsWithoutAccess("@helena consegue reservar a sala?", DIRETORIO_TESTE);
    expect(avisos).toEqual([
      { username: "helena", reason: "o perfil dessa pessoa não alcança o chat do caso" },
    ]);
  });

  it("avisa quando a pessoa mencionada não existe", () => {
    const avisos = mentionsWithoutAccess("@fulano dá uma olhada", DIRETORIO_TESTE);
    expect(avisos[0]!.reason).toMatch(/não existe um usuário com esse nome/);
  });

  it("não avisa quando a menção alcança o chat", () => {
    expect(mentionsWithoutAccess("@clara @otavio", DIRETORIO_TESTE)).toEqual([]);
  });
});

describe("chat-is-the-applicators-only-written-channel", () => {
  it("a equipe clínica inteira alcança o chat", () => {
    for (const role of CHAT_ROLES) {
      expect(canReadChat(role).allowed).toBe(true);
    }
  });

  it("o aplicador está entre eles — e é o único canal escrito dele", () => {
    // Ele não alcança programas, protocolos nem prontuário, e alcança este.
    expect(canReadChat("applicator").allowed).toBe(true);
  });

  it("recepção, operação e People não alcançam nem para ler", () => {
    for (const role of ["attendant", "operation", "people"]) {
      const result = canReadChat(role);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/nem para ler/);
    }
  });
});

describe("chat-messages-are-permanent", () => {
  it("não há edição nem exclusão, e a negativa diz por quê", () => {
    const result = canEditMessage();
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/registro de coordenação clínica/);
    expect(result.reason).toMatch(/consultá-la meses depois/);
  });

  it("mensagem em branco não é enviada", () => {
    expect(canSend("   ").reason).toMatch(/Escreva alguma coisa/);
    expect(canSend("ok").allowed).toBe(true);
  });
});

describe("leitura da conversa", () => {
  const dados: ChatData = {
    patient: { id: "p", name: "Théo", birthDate: "2019-11-04" },
    currentUser: { username: "clara", name: "Clara", role: "supervisor" },
    directory: DIRETORIO_TESTE,
    now: "2026-07-30T09:00:00.000-03:00",
    messages: [
      {
        id: "b",
        content: "segunda",
        authorName: "Marina",
        authorRole: "Terapeuta",
        at: "2026-07-28T09:00:00.000-03:00",
        mentions: ["clara"],
      },
      {
        id: "a",
        content: "primeira",
        authorName: "Otávio",
        authorRole: "Aplicador",
        at: "2026-07-27T15:00:00.000-03:00",
        mentions: [],
      },
    ],
  };

  it("ordena em ordem cronológica — a conversa se lê de cima para baixo", () => {
    expect(inOrder(dados).map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("encontra as menções ao usuário atual", () => {
    expect(mentionsOfCurrentUser(dados).map((m) => m.id)).toEqual(["b"]);
  });

  it("conta as especialidades que participaram — a medida de multidisciplinar", () => {
    expect(participatingRoles(dados)).toEqual(["Terapeuta", "Aplicador"]);
  });
});
