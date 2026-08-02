import type { Fixture } from "@brucesantos/design-space";
import type { AbsenceOriginData, AbsenceRecord } from "../contracts/index.js";

/**
 * Fixtures da origem das ausências.
 *
 * Um mês de "ausências" como o filtro do sistema as devolveria: doze registros,
 * e só quatro são ausência no sentido de alguém não ter aparecido.
 */

function record(overrides: Partial<AbsenceRecord> & { id: string }): AbsenceRecord {
  return {
    patientName: "Théo Andrade Lins",
    professionalName: "Marina Okabe",
    date: "2026-07-14",
    origin: "observed",
    ...overrides,
  };
}

export const absenceOriginFixtures: Fixture[] = [
  {
    id: "absence-origin-month",
    label: "Doze ausências, quatro origens de verdade",
    description:
      "O número que o filtro devolve para julho. Quatro pessoas faltaram, cinco avisaram antes, e três foram convertidas por um worker.",
    data: {
      month: "2026-07",
      records: [
        record({ id: "a1", date: "2026-07-03" }),
        record({ id: "a2", date: "2026-07-08", patientName: "Nina Corrêa Bastos" }),
        record({ id: "a3", date: "2026-07-15", patientName: "Bento Queiroga Farias" }),
        record({ id: "a4", date: "2026-07-27", patientName: "Helena Vasconcelos Prado" }),

        record({ id: "c1", date: "2026-07-02", origin: "cancelled" }),
        record({ id: "c2", date: "2026-07-09", origin: "cancelled", patientName: "Alice Bandeira Nogueira" }),
        record({ id: "c3", date: "2026-07-16", origin: "cancelled", patientName: "Nina Corrêa Bastos" }),
        record({ id: "c4", date: "2026-07-21", origin: "cancelled" }),
        record({ id: "c5", date: "2026-07-29", origin: "cancelled", patientName: "Rafael Toledo Marinho" }),

        record({
          id: "f1",
          date: "2026-07-06",
          origin: "fabricated_by_delay",
          daysStalled: 7,
          patientName: "Bento Queiroga Farias",
        }),
        record({
          id: "f2",
          date: "2026-07-13",
          origin: "fabricated_by_delay",
          daysStalled: 9,
          patientName: "Alice Bandeira Nogueira",
        }),
        record({
          id: "f3",
          date: "2026-07-20",
          origin: "fabricated_by_delay",
          daysStalled: 7,
        }),
      ],
    } satisfies AbsenceOriginData,
  },
  {
    id: "absence-origin-all-observed",
    label: "Todas observadas",
    description: "Três ausências, as três registradas por alguém. Nada a separar.",
    data: {
      month: "2026-07",
      records: [
        record({ id: "a1", date: "2026-07-03" }),
        record({ id: "a2", date: "2026-07-08", patientName: "Nina Corrêa Bastos" }),
        record({ id: "a3", date: "2026-07-15", patientName: "Bento Queiroga Farias" }),
      ],
    } satisfies AbsenceOriginData,
  },
];
