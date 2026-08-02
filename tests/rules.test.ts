import { describe, expect, it } from "vitest";
import type {
  Appointment,
  ClinicalSession,
  ClinicalSessionData,
  Claim,
  Criteria,
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
import { canResubmit, documentProgress, missingDocuments } from "../src/rules/finance.js";
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

/* ============================================================== financeiro */

function claim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: "GUI-1",
    patient: { id: "pt-5", name: "Júlia Prado", birthDate: "1966-06-30" },
    procedure: "Ressonância",
    amountCents: 142_500,
    insurer: "SulAmérica",
    status: "denied",
    submittedAt: "2026-07-21T09:05:00.000-03:00",
    documents: [
      { id: "d-1", name: "Guia de atendimento", received: true },
      { id: "d-2", name: "Relatório clínico assinado", received: false },
    ],
    history: [],
    ...overrides,
  };
}

describe("retry-after-document-review", () => {
  const operation = ["authorizations.hub"];

  it("bloqueia reenvio nomeando os documentos que faltam", () => {
    const result = canResubmit(claim(), operation);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Falta anexar: Relatório clínico assinado.");
  });

  it("libera quando toda a documentação está anexada", () => {
    const complete = claim({
      documents: claim().documents.map((d) => ({ ...d, received: true })),
    });
    expect(canResubmit(complete, operation).allowed).toBe(true);
  });

  it("vale também para pendência de documento, não só para recusa", () => {
    const pending = claim({ status: "pending_documents" });
    expect(canResubmit(pending, operation).reason).toMatch(/Falta anexar/);
  });

  it("não reenvia guia em análise nem autorizada", () => {
    expect(canResubmit(claim({ status: "under_review" }), operation).reason).toMatch(
      /recusada ou com pendência/,
    );
    expect(canResubmit(claim({ status: "approved" }), operation).allowed).toBe(false);
  });
});

describe("resubmit-requires-permission", () => {
  it("bloqueia por permissão antes de olhar a documentação", () => {
    const complete = claim({ documents: claim().documents.map((d) => ({ ...d, received: true })) });
    expect(canResubmit(complete, ["patients.list"]).reason).toMatch(/não reenvia guias/);
  });
});

describe("progresso de documentação", () => {
  it("conta recebidos e total", () => {
    expect(documentProgress(claim())).toEqual({ received: 1, total: 2 });
  });

  it("lista só o que falta", () => {
    expect(missingDocuments(claim()).map((d) => d.name)).toEqual(["Relatório clínico assinado"]);
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
