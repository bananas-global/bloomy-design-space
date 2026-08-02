import type { Fixture } from "@brucesantos/design-space";
import type { ClinicalHourRecord, ClinicalHoursData } from "../contracts/index.js";

/**
 * Fixtures do controle de horas.
 *
 * Cinco dias da mesma semana, cada um exercitando uma das cinco regras. As
 * previsões de 7h30 são deliberadas: é a fração que o `div(3600)` do sistema
 * real descarta, e ela precisa existir para a perda ser mensurável.
 *
 * As coordenadas são de um ponto qualquer da cidade, arredondadas: verificação
 * de localização não precisa de precisão de metro para o cenário funcionar, e
 * dado de posição merece o mesmo cuidado que dado clínico.
 */

const PONTO = { latitude: "-23.56", longitude: "-46.69" };

function record(overrides: Partial<ClinicalHourRecord> & { id: string }): ClinicalHourRecord {
  return {
    date: "2026-07-27",
    professionalName: "Marina Okabe",
    unitName: "Unidade Pinheiros",
    clinicHours: [],
    expectedClinicHours: [],
    verifications: [],
    storedExpectedHours: 0,
    ...overrides,
  };
}

/** Dia comum: previsto 7h30, gravado 7, marcado pelo app nas duas pontas. */
const NORMAL = record({
  id: "chr-1",
  date: "2026-07-27",
  expectedClinicHours: [
    { id: "e1", startAt: "08:00", endAt: "12:00" },
    { id: "e2", startAt: "13:30", endAt: "17:00" },
  ],
  storedExpectedHours: 7,
  clinicHours: [
    { id: "h1", startAt: "08:02", endAt: "12:04", checkinDoneBy: "app", checkoutDoneBy: "app" },
    { id: "h2", startAt: "13:28", endAt: "17:11", checkinDoneBy: "app", checkoutDoneBy: "app" },
  ],
  verifications: [
    { type: "checkin", ...PONTO, at: "2026-07-27T08:02:00.000-03:00" },
    { type: "checkout", ...PONTO, at: "2026-07-27T17:11:00.000-03:00" },
  ],
  expectedDailyPaymentCents: 42000,
});

/** Aberto pelo app, fechado no escritório — o caso que mais interessa numa conferência. */
const MISTO = record({
  id: "chr-2",
  date: "2026-07-28",
  expectedClinicHours: [{ id: "e3", startAt: "08:00", endAt: "15:30" }],
  storedExpectedHours: 7,
  clinicHours: [
    { id: "h3", startAt: "08:05", endAt: "15:30", checkinDoneBy: "app", checkoutDoneBy: "admin" },
  ],
  verifications: [{ type: "checkin", ...PONTO, at: "2026-07-28T08:05:00.000-03:00" }],
  observation: "Saiu para uma visita escolar e não fechou o dia no app.",
  expectedDailyPaymentCents: 42000,
});

/** Nenhuma localização gravada, e nada avisou. */
const SEM_VERIFICACAO = record({
  id: "chr-3",
  date: "2026-07-29",
  expectedClinicHours: [{ id: "e4", startAt: "08:00", endAt: "15:30" }],
  storedExpectedHours: 7,
  clinicHours: [
    { id: "h4", startAt: "08:00", endAt: "15:30", checkinDoneBy: "app", checkoutDoneBy: "app" },
  ],
  verifications: [],
  expectedDailyPaymentCents: 42000,
});

/** Saída anterior à entrada — a soma fica negativa e nada reclamou. */
const INVERTIDO = record({
  id: "chr-4",
  date: "2026-07-30",
  expectedClinicHours: [{ id: "e5", startAt: "08:00", endAt: "15:30" }],
  storedExpectedHours: 7,
  clinicHours: [
    { id: "h5", startAt: "08:00", endAt: "12:00", checkinDoneBy: "admin", checkoutDoneBy: "admin" },
    { id: "h6", startAt: "17:00", endAt: "13:00", checkinDoneBy: "admin", checkoutDoneBy: "admin" },
  ],
  verifications: [],
  observation: "Preenchido no escritório a partir da folha de ponto em papel.",
  expectedDailyPaymentCents: 42000,
});

/** Previsão sem hora de fim: a forma exata que o recálculo não processa. */
const PREVISAO_INCOMPLETA = record({
  id: "chr-5",
  date: "2026-07-31",
  expectedClinicHours: [
    { id: "e6", startAt: "08:00", endAt: "12:00" },
    { id: "e7", startAt: "13:30" },
  ],
  storedExpectedHours: 4,
  clinicHours: [
    { id: "h7", startAt: "08:00", checkinDoneBy: "app" },
  ],
  verifications: [{ type: "checkin", ...PONTO, at: "2026-07-31T08:00:00.000-03:00" }],
  expectedDailyPaymentCents: 42000,
});

export const clinicalHourFixtures: Fixture[] = [
  {
    id: "clinical-hours-week",
    label: "Uma semana de controle de horas",
    description:
      "Cinco dias, cada um exercitando uma das cinco regras: truncamento, proveniência mista, verificação ausente, faixa invertida e previsão sem fim.",
    data: {
      records: [NORMAL, MISTO, SEM_VERIFICACAO, INVERTIDO, PREVISAO_INCOMPLETA],
    } satisfies ClinicalHoursData,
  },
  {
    id: "clinical-hours-truncation",
    label: "O dia previsto de 7h30 gravado como 7",
    description:
      "Um único dia, para a perda de meia hora aparecer sozinha — e o que ela vira num mês.",
    data: { records: [NORMAL] } satisfies ClinicalHoursData,
  },
  {
    id: "clinical-hours-unverified",
    label: "Um dia sem nenhuma localização registrada",
    description:
      "O check-in deu certo, nenhuma coordenada foi gravada e nada foi dito. O registro tem a mesma aparência de um verificado.",
    data: { records: [SEM_VERIFICACAO] } satisfies ClinicalHoursData,
  },
  {
    id: "clinical-hours-reversed",
    label: "Uma saída anterior à entrada",
    description:
      "Faixa das 17h às 13h, aceita sem reclamação. A soma do dia fica menor do que a primeira faixa sozinha.",
    data: { records: [INVERTIDO] } satisfies ClinicalHoursData,
  },
  {
    id: "clinical-hours-incomplete-expected",
    label: "Uma previsão sem hora de fim",
    description:
      "O changeset permite; o recálculo não processa. O erro aparece longe de quem salvou.",
    data: { records: [PREVISAO_INCOMPLETA] } satisfies ClinicalHoursData,
  },
  {
    id: "clinical-hours-empty",
    label: "Nenhum registro no período",
    description: "O estado antes do primeiro check-in do mês.",
    data: { records: [] } satisfies ClinicalHoursData,
  },
];
