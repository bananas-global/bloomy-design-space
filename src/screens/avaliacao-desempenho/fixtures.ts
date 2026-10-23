/**
 * Avaliação de desempenho — dados sintéticos. Nomes são fictícios.
 *
 * Hoje é `TODAY` (30/07/2026): a avaliação nova sai com essa data, no
 * 3º trimestre de 2026.
 */
import type { Fixture } from "@brucesantos/design-space";
import type { ProfessionalHeader } from "../../layouts/ProfessionalLayout.js";
import type { Review } from "./model.js";

export type ReviewFixture = { professional: ProfessionalHeader; reviews: Review[] };

export const PROFESSIONAL: ProfessionalHeader = {
  name: "Camila Rezende Prado",
  status: "Ativo",
  specialty: "Psicologia",
  healthFormation: "CRP",
  specialtyRegister: "06/233962",
  supervisor: "Rafael Andrade Nunes",
  showInDashboard: true,
  tbd: false,
  phone: "(11) 99873-9084",
  email: "camila.prado@exemplo.com.br",
  firstContractDate: "06/05/2025",
  uniquePatientsCount: 3,
  weeklyScheduleHours: 30,
  occupancyRate: "10.0",
  absenceCount: 0,
};

/** Da mais recente para a mais antiga, uma de cada classificação. */
export const REVIEWS: Review[] = [
  {
    id: "pr-2026-q2",
    date: "10/04/2026",
    cycle: "2º trimestre · 2026",
    author: { name: "Joana Duarte Lima", role: "supervisor" },
    // 45 pontos (22 técnicas + 23 conduta): Consolidado.
    answers: {
      aba_procedures: 4, data_collection: 3, behavior_management: 4, individualization: 4, documentation: 3, feedback_uptake: 4,
      punctuality: 4, family_communication: 4, teamwork: 4, ethics: 4, emotional_regulation: 3, ownership: 4,
    },
    feedback: {
      strengths: "Condução técnica segura e leitura precisa do momento do paciente. Virou referência de manejo para os aplicadores novos.",
      improvements: "Lançamento de evoluções ainda concentrado no fim da semana.",
      actionPlan: "Registrar a evolução no mesmo dia do atendimento. Reavaliar no próximo ciclo.",
      shared: false,
    },
  },
  {
    id: "pr-2026-q1",
    date: "12/01/2026",
    cycle: "1º trimestre · 2026",
    author: { name: "Marcelo Pereira Rocha", role: "coordinator" },
    // 34 pontos (16 + 18): Em desenvolvimento.
    answers: {
      aba_procedures: 3, data_collection: 2, behavior_management: 3, individualization: 3, documentation: 2, feedback_uptake: 3,
      punctuality: 3, family_communication: 3, teamwork: 3, ethics: 4, emotional_regulation: 2, ownership: 3,
    },
    feedback: {
      strengths: "Boa relação com as famílias e presença constante nas reuniões de caso.",
      improvements: "Registro de dados irregular e dificuldade de manejo em sessões com comportamento intenso.",
      actionPlan: "Supervisão semanal em sala por 6 semanas, com foco em coleta de dados e regulação durante crises.",
      shared: true,
    },
    edited: { by: "Joana Duarte Lima", at: "15/01/2026" },
  },
  {
    id: "pr-2025-q4",
    date: "14/10/2025",
    cycle: "4º trimestre · 2025",
    author: { name: "Helena Martins Costa", role: "supervisor" },
    // 36 pontos, mas nota 2 no item 1 (crítico): Plano de ação.
    answers: {
      aba_procedures: 2, data_collection: 3, behavior_management: 3, individualization: 3, documentation: 3, feedback_uptake: 3,
      punctuality: 3, family_communication: 3, teamwork: 3, ethics: 4, emotional_regulation: 3, ownership: 3,
    },
    feedback: {
      strengths: "Comprometimento com a escala e postura ética sem ressalvas.",
      improvements: "Domínio dos procedimentos ainda dependente de consulta ao protocolo durante a sessão.",
      actionPlan: "Treinamento nos programas do caso e acompanhamento presencial da supervisora nas duas primeiras semanas.",
      shared: true,
    },
  },
];

export const REVIEW_FIXTURES: Fixture<ReviewFixture>[] = [
  {
    id: "performance-review.history",
    label: "Camila · três avaliações",
    description:
      "2º tri/2026 Consolidado (45 pts, devolutiva pendente), 1º tri/2026 Em desenvolvimento (34 pts, editada) e 4º tri/2025 Plano de ação por item crítico (36 pts com nota 2 no item 1).",
    data: () => ({ professional: PROFESSIONAL, reviews: REVIEWS }),
  },
  {
    id: "performance-review.empty",
    label: "Camila · sem avaliações",
    description: "A mesma profissional sem nenhuma avaliação registrada.",
    data: () => ({ professional: PROFESSIONAL, reviews: [] }),
  },
];
