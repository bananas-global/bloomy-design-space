/**
 * Acompanhamento periódico — dados sintéticos. Nomes são fictícios.
 *
 * Hoje é `TODAY` (30/07/2026): a avaliação nova sai com essa data.
 */
import type { Fixture } from "@brucesantos/design-space";
import type { PatientHeader } from "../../layouts/PatientLayout.js";
import type { Monitoring } from "./model.js";

export type MonitoringFixture = { patient: PatientHeader; monitorings: Monitoring[] };

export const PATIENT: PatientHeader = {
  name: "Lucas Almeida Ferreira",
  status: "Ativo",
  supportLevel: 2,
  restrictions: true,
  age: 8,
  unitName: "Santana",
  missedCancelledCount: 2,
  activeWeeklyHours: 24,
  observation: "Paciente sensível a sons altos.",
};

/** Da mais recente para a mais antiga, uma de cada classificação. */
export const MONITORINGS: Monitoring[] = [
  {
    id: "pm-2026-06",
    date: "29/06/2026",
    author: { name: "Joana Duarte Lima", role: "supervisor" },
    // 36 pontos: Estável.
    answers: { patient_progress: 4, interfering_behaviors: 3, safety_risks: 4, program_fit: 3, data_recording: 4, team_repertoire: 3, team_adherence: 4, family_collaboration: 3, attendance: 4, continuity_risks: 4 },
  },
  {
    id: "pm-2026-05",
    date: "29/05/2026",
    author: { name: "Marcelo Pereira Rocha", role: "coordinator" },
    // 27 pontos: Atenção.
    answers: { patient_progress: 3, interfering_behaviors: 3, safety_risks: 3, program_fit: 2, data_recording: 2, team_repertoire: 3, team_adherence: 3, family_collaboration: 2, attendance: 3, continuity_risks: 3 },
    edited: { by: "Joana Duarte Lima", at: "02/06/2026" },
  },
  {
    id: "pm-2026-04",
    date: "30/04/2026",
    author: { name: "Helena Martins Costa", role: "supervisor" },
    // 29 pontos, mas nota 2 na pergunta 1 (crítica): Prioritário.
    answers: { patient_progress: 2, interfering_behaviors: 3, safety_risks: 3, program_fit: 3, data_recording: 3, team_repertoire: 3, team_adherence: 3, family_collaboration: 3, attendance: 3, continuity_risks: 3 },
  },
];

export const MONITORING_FIXTURES: Fixture<MonitoringFixture>[] = [
  {
    id: "periodic-monitoring.history",
    label: "Lucas · três avaliações",
    description: "Junho Estável (36 pts), maio Atenção (27 pts, editada) e abril Prioritário por resposta crítica (29 pts com nota 2 na pergunta 1).",
    data: () => ({ patient: PATIENT, monitorings: MONITORINGS }),
  },
  {
    id: "periodic-monitoring.empty",
    label: "Lucas · sem avaliações",
    description: "O mesmo paciente sem nenhum acompanhamento registrado.",
    data: () => ({ patient: PATIENT, monitorings: [] }),
  },
];
