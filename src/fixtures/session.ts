import type { Fixture } from "@brucesantos/design-space";
import type {
  ClinicalSession,
  ClinicalSessionData,
  ProgramExecution,
  Professional,
} from "../contracts/index.js";

/**
 * Fixtures do atendimento clínico.
 *
 * Todas partem do mesmo atendimento — Théo, terapia ABA das 14h com a Marina —
 * e mudam só o que a situação exige. É de propósito: quem abre dois links
 * seguidos precisa reconhecer que é o mesmo caso em outro momento do ciclo, e
 * não dois exemplos sem relação.
 *
 * Nomes, datas e vínculos são sintéticos. Os programas são estruturas reais de
 * ABA — imitação motora, tato de figuras, espera — com dados inventados.
 */

const TERAPEUTA: Professional = {
  id: "prof-marina",
  name: "Marina Okabe",
  specialty: "Aplicador ABA",
};

const SUPERVISORA: Professional = {
  id: "prof-clara",
  name: "Clara Vidigal",
  specialty: "Psicologia",
};

const PACIENTE = {
  id: "pac-theo",
  name: "Théo Andrade Lins",
  birthDate: "2019-11-04",
};

/**
 * O programa como ele chega ao atendimento: passos com meta de tentativas e a
 * fase em que cada um está. Fase não é enfeite — é o que diz se a tentativa
 * conta para aquisição ou para manutenção do que já foi adquirido.
 */
function programs(): ProgramExecution[] {
  return [
    {
      id: "pe-1",
      programId: "prog-imitacao",
      programName: "Imitação motora grossa",
      programType: "structured",
      result: "pending",
      steps: [
        {
          id: "pe-1-s1",
          name: "Bater palmas após modelo",
          phase: "intervention",
          targetTrials: 10,
          trials: [],
        },
        {
          id: "pe-1-s2",
          name: "Levantar os braços após modelo",
          phase: "generalization",
          targetTrials: 10,
          trials: [],
        },
      ],
    },
    {
      id: "pe-2",
      programId: "prog-tato",
      programName: "Tato de figuras — animais",
      programType: "structured",
      result: "pending",
      steps: [
        {
          id: "pe-2-s1",
          name: "Nomear figura apresentada",
          phase: "intervention",
          targetTrials: 8,
          trials: [],
        },
      ],
    },
    {
      id: "pe-3",
      programId: "prog-espera",
      programName: "Tolerância à espera",
      programType: "incidental",
      result: "pending",
      steps: [
        {
          id: "pe-3-s1",
          name: "Aguardar 30 segundos por item preferido",
          phase: "maintenance",
          targetTrials: 3,
          trials: [],
        },
      ],
    },
  ];
}

/** O mesmo programa, com tentativas já marcadas. É o que trava a reversão. */
function programsWithTrials(): ProgramExecution[] {
  const base = programs();
  base[0]!.steps[0]!.trials = [
    { id: "t-1", result: "success", prompt: "motor", at: "2026-07-30T14:06:00.000-03:00" },
    { id: "t-2", result: "success", prompt: "verbal", at: "2026-07-30T14:08:00.000-03:00" },
    { id: "t-3", result: "failure", at: "2026-07-30T14:10:00.000-03:00" },
    { id: "t-4", result: "success", at: "2026-07-30T14:12:00.000-03:00" },
  ];
  base[1]!.steps[0]!.trials = [
    { id: "t-5", result: "failure", at: "2026-07-30T14:20:00.000-03:00" },
    { id: "t-6", result: "success", prompt: "verbal", at: "2026-07-30T14:23:00.000-03:00" },
  ];
  return base;
}

const REGISTRO =
  "<p>Théo chegou agitado e demorou cerca de dez minutos para aceitar a mesa. " +
  "Boa resposta em imitação motora com ajuda motora nas primeiras tentativas, " +
  "com independência a partir da quarta. Tato de figuras ainda inconsistente: " +
  "acertou cachorro e gato, errou cavalo duas vezes. Tolerou a espera de 30 " +
  "segundos nas três tentativas, sem comportamento inadequado.</p>";

/** Base comum. Cada fixture altera o mínimo que a situação exige. */
function session(overrides: Partial<ClinicalSession> = {}): ClinicalSession {
  return {
    id: "atd-8801",
    scheduleId: "agd-8801",
    status: "ready_for_service",
    scheduleType: "patient",
    sessionType: "in_person",
    location: "in_clinic",
    patient: PACIENTE,
    professionals: [TERAPEUTA],
    supervisor: SUPERVISORA,
    needsSupervisorSignature: true,
    service: { name: "Terapia ABA — individual", chargeable: true, specialty: "Aplicador ABA" },
    start: "2026-07-30T14:00:00.000-03:00",
    end: "2026-07-30T15:00:00.000-03:00",
    now: "2026-07-30T14:02:00.000-03:00",
    checkin: { at: "2026-07-30T13:51:00.000-03:00", by: "web" },
    register: "",
    programExecutions: programs(),
    protocolAnswers: 0,
    signatures: [],
    ...overrides,
  };
}

const semAberto: ClinicalSessionData["openSessionsForProfessional"] = [];

export const sessionFixtures: Fixture<ClinicalSessionData>[] = [
  {
    id: "session-ready",
    label: "Pronto para atendimento",
    description:
      "Théo fez check-in às 13:51, o atendimento é das 14h e a Marina está livre. Nada bloqueia o início.",
    data: { session: session(), openSessionsForProfessional: semAberto },
  },
  {
    id: "session-no-checkin",
    label: "Sem check-in",
    description:
      "Mesmo atendimento, serviço cobrável e paciente ainda não registrado na recepção. Iniciar fica bloqueado.",
    data: {
      session: session({ status: "scheduled", checkin: undefined }),
      openSessionsForProfessional: semAberto,
    },
  },
  {
    id: "session-not-chargeable",
    label: "Serviço não cobrável, sem check-in",
    description:
      "O mesmo caso sem check-in, num serviço que não vira guia. A exigência não se aplica e o início libera.",
    data: {
      session: session({
        status: "scheduled",
        checkin: undefined,
        service: { name: "Devolutiva à família", chargeable: false },
        sessionType: "feedback",
      }),
      openSessionsForProfessional: semAberto,
    },
  },
  {
    id: "session-professional-busy",
    label: "Profissional com atendimento em aberto",
    description:
      "Théo fez check-in, mas a Marina esqueceu de finalizar o atendimento das 13h. O bloqueio nomeia o outro.",
    data: {
      session: session(),
      openSessionsForProfessional: [
        { id: "atd-8790", patientName: "Isadora Bueno", start: "2026-07-30T13:00:00.000-03:00" },
      ],
    },
  },
  {
    id: "session-running",
    label: "Atendimento em andamento",
    description:
      "Em sessão às 14:25, com seis tentativas marcadas em dois programas e um registro incidental aberto.",
    data: {
      session: session({
        status: "ongoing",
        now: "2026-07-30T14:25:00.000-03:00",
        programExecutions: programsWithTrials(),
      }),
      openSessionsForProfessional: semAberto,
    },
  },
  {
    id: "session-pending-register",
    label: "Pendente de registro",
    description:
      "Finalizado às 15h sem evolução escrita. O atendimento não vai para assinatura enquanto o texto estiver vazio.",
    data: {
      session: session({
        status: "pending_register",
        now: "2026-07-30T15:05:00.000-03:00",
        register: "",
        programExecutions: programsWithTrials(),
      }),
      openSessionsForProfessional: semAberto,
    },
  },
  {
    id: "session-pending-signature",
    label: "Aguardando a assinatura de quem atendeu",
    description:
      "Evolução escrita, atendimento fechado. Falta a Marina assinar — e só ela pode ser a primeira.",
    data: {
      session: session({
        status: "pending_signature",
        now: "2026-07-30T15:10:00.000-03:00",
        register: REGISTRO,
        programExecutions: programsWithTrials(),
      }),
      openSessionsForProfessional: semAberto,
    },
  },
  {
    id: "session-pending-supervisor",
    label: "Aguardando a assinatura do supervisor",
    description:
      "A Marina já assinou às 15:12. O atendimento exige segunda assinatura, e ela é da Clara.",
    data: {
      session: session({
        status: "pending_supervisor_signature",
        now: "2026-07-30T15:30:00.000-03:00",
        register: REGISTRO,
        programExecutions: programsWithTrials(),
        signatures: [
          {
            professionalId: TERAPEUTA.id,
            professionalName: TERAPEUTA.name,
            at: "2026-07-30T15:12:00.000-03:00",
            role: "owner",
          },
        ],
      }),
      openSessionsForProfessional: semAberto,
    },
  },
  {
    id: "session-finished",
    label: "Atendimento finalizado",
    description: "As duas assinaturas no lugar. Nada pendente, e o histórico mostra quem e quando.",
    data: {
      session: session({
        status: "finished",
        now: "2026-07-30T16:00:00.000-03:00",
        register: REGISTRO,
        programExecutions: programsWithTrials(),
        signatures: [
          {
            professionalId: TERAPEUTA.id,
            professionalName: TERAPEUTA.name,
            at: "2026-07-30T15:12:00.000-03:00",
            role: "owner",
          },
          {
            professionalId: SUPERVISORA.id,
            professionalName: SUPERVISORA.name,
            at: "2026-07-30T15:44:00.000-03:00",
            role: "supervisor",
          },
        ],
      }),
      openSessionsForProfessional: semAberto,
    },
  },
  {
    id: "session-revertible",
    label: "Atendimento aberto por engano",
    description:
      "Em andamento há três minutos, sem nenhuma tentativa marcada. É a janela em que reverter ainda não destrói nada.",
    data: {
      session: session({
        status: "ongoing",
        now: "2026-07-30T14:05:00.000-03:00",
      }),
      openSessionsForProfessional: semAberto,
    },
  },
  {
    id: "session-professional-meeting",
    label: "Supervisão entre profissionais",
    description:
      "Reunião de supervisão sem paciente. Dispensa check-in, pula registro e assinatura, e finaliza direto.",
    data: {
      session: session({
        status: "ongoing",
        scheduleType: "professional",
        sessionType: "supervision",
        patient: undefined,
        checkin: undefined,
        needsSupervisorSignature: false,
        supervisor: undefined,
        professionals: [TERAPEUTA, SUPERVISORA],
        service: { name: "Supervisão de caso", chargeable: false },
        programExecutions: [],
        now: "2026-07-30T14:20:00.000-03:00",
      }),
      openSessionsForProfessional: semAberto,
    },
  },
];

export const sessionPeople = {
  therapist: TERAPEUTA,
  supervisor: SUPERVISORA,
  patient: PACIENTE,
} as const;
