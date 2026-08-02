import type { Fixture } from "@brucesantos/design-space";
import type { NewAppointmentData, ScheduleAttempt } from "../contracts/index.js";

/**
 * Fixtures da tentativa de marcar.
 *
 * As mensagens são as que o sistema real produz, com nomes sintéticos: é o
 * texto que a recepção lê hoje, uma frase por vez.
 */

function attempt(overrides: Partial<ScheduleAttempt> = {}): ScheduleAttempt {
  return {
    patientName: "Théo Andrade Lins",
    professionalName: "Marina Okabe",
    serviceName: "Sessão de intervenção ABA",
    roomName: "Girassol 2",
    unitName: "Unidade Pinheiros",
    start: "2026-08-03T14:00:00.000-03:00",
    end: "2026-08-03T15:00:00.000-03:00",
    scheduleType: "patient",
    roomCapacity: 3,
    roomOccupancy: 1,
    impediments: [],
    ...overrides,
  };
}

export const newAppointmentFixtures: Fixture[] = [
  {
    id: "new-appointment-clear",
    label: "Um horário sem impedimento",
    description: "As sete verificações passam. A sala tem capacidade 3 e uma ocupação.",
    data: { attempt: attempt() } satisfies NewAppointmentData,
  },
  {
    id: "new-appointment-four-impediments",
    label: "Quatro impedimentos ao mesmo tempo",
    description:
      "O sistema real diria só o primeiro. Seriam quatro tentativas de salvar, com a família na frente.",
    data: {
      attempt: attempt({
        roomOccupancy: 3,
        impediments: [
          {
            kind: "room_full",
            message:
              'A sala "2 - Girassol" está totalmente ocupada de 03/08/2026 14:00 até 03/08/2026 15:00',
          },
          {
            kind: "professional_blocked",
            message:
              'O profissional "Marina Okabe" contém um bloqueio na agenda de 03/08/2026 13:00 até 03/08/2026 18:00',
          },
          {
            kind: "duplicate_slot",
            message:
              "O profissional já possui um atendimento com as mesmas informações cadastrado na agenda de 03/08/2026 14:00 até 03/08/2026 15:00",
          },
          {
            kind: "unit_blocked",
            message:
              'A unidade "Unidade Pinheiros" contém um bloqueio na agenda de 03/08/2026 12:00 até 03/08/2026 16:00',
          },
        ],
      }),
    } satisfies NewAppointmentData,
  },
  {
    id: "new-appointment-inactive-professional",
    label: "O profissional está desativado",
    description:
      "O primeiro verificador da lista, e o único que não é resolvido nem pela coordenação nem pela recepção.",
    data: {
      attempt: attempt({
        professionalName: "Iara Monteiro Sales",
        impediments: [
          {
            kind: "professional_inactive",
            message: 'O profissional "Iara Monteiro Sales" está desativado e não pode ser agendado',
          },
        ],
      }),
    } satisfies NewAppointmentData,
  },
  {
    id: "new-appointment-room-has-room",
    label: "A sala tem atendimento e ainda cabe",
    description:
      "Capacidade 3, ocupação 2. “Ocupada” não quer dizer indisponível — quer dizer cheia.",
    data: {
      attempt: attempt({ roomCapacity: 3, roomOccupancy: 2 }),
    } satisfies NewAppointmentData,
  },
  {
    id: "new-appointment-therapeutic-companion",
    label: "Acompanhamento terapêutico, sem sala",
    description:
      "O tipo `at` não passa pela verificação de sala. A ausência de sala aqui não é cadastro incompleto.",
    data: {
      attempt: attempt({
        scheduleType: "at",
        serviceName: "Acompanhamento terapêutico na escola",
        roomName: undefined,
        roomCapacity: undefined,
        roomOccupancy: undefined,
      }),
    } satisfies NewAppointmentData,
  },
];
