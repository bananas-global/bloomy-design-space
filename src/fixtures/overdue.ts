import type { Fixture } from "@brucesantos/design-space";
import type { OverdueData, OverdueSchedule } from "../contracts/index.js";

/**
 * Fixtures do atraso.
 *
 * As horas foram escolhidas para cair nos dois lados da janela de 48 horas: há
 * atendimentos de 3 horas atrás — atrasados só para a coordenação — e de 60
 * horas — atrasados para as duas definições. É essa faixa entre 0 e 48 que
 * torna a divergência mensurável.
 */

const NOW = "2026-07-30T15:00:00.000-03:00";

function entry(overrides: Partial<OverdueSchedule> & { id: string }): OverdueSchedule {
  return {
    patientName: "Théo Andrade Lins",
    professionalName: "Marina Okabe",
    serviceName: "Sessão de intervenção ABA",
    start: "2026-07-30T12:00:00.000-03:00",
    status: "pending_register",
    ...overrides,
  };
}

const MISTURA: OverdueSchedule[] = [
  // 3 horas: só a coordenação chama de atrasado.
  entry({ id: "s1", start: "2026-07-30T12:00:00.000-03:00", status: "pending_register" }),
  entry({
    id: "s2",
    start: "2026-07-30T11:00:00.000-03:00",
    status: "pending_signature",
    patientName: "Helena Vasconcelos Prado",
    professionalName: "Otávio Ferrandini",
  }),
  // 60 horas: as duas definições concordam.
  entry({
    id: "s3",
    start: "2026-07-28T03:00:00.000-03:00",
    status: "not_started",
    patientName: "Nina Corrêa Bastos",
    professionalName: "Bruna Kishimoto",
  }),
  // Espera o supervisor: some da lista da coordenação, apareça quando aparecer.
  entry({
    id: "s4",
    start: "2026-07-29T09:00:00.000-03:00",
    status: "pending_supervisor_signature",
    patientName: "Théo Andrade Lins",
    professionalName: "Marina Okabe",
  }),
  // Fechado: nenhuma definição pega.
  entry({ id: "s5", start: "2026-07-29T14:00:00.000-03:00", status: "finished" }),
];

/**
 * Agendamentos que nem viraram atendimento — o assunto de `supervisor_query`.
 *
 * Dois da própria supervisora, um de 5 horas e um de 60; dois de colegas, nas
 * mesmas distâncias. É a combinação que torna as duas janelas mensuráveis.
 */
const NUNCA_COMECARAM: OverdueSchedule[] = [
  entry({
    id: "n1",
    start: "2026-07-30T10:00:00.000-03:00",
    status: "scheduled",
    professionalName: "Clara Vidigal",
    patientName: "Théo Andrade Lins",
  }),
  entry({
    id: "n2",
    start: "2026-07-28T03:00:00.000-03:00",
    status: "incomplete",
    professionalName: "Clara Vidigal",
    patientName: "Nina Corrêa Bastos",
  }),
  entry({
    id: "n3",
    start: "2026-07-30T10:00:00.000-03:00",
    status: "scheduled",
    professionalName: "Marina Okabe",
    patientName: "Helena Vasconcelos Prado",
  }),
  entry({
    id: "n4",
    start: "2026-07-28T03:00:00.000-03:00",
    status: "scheduled",
    professionalName: "Marina Okabe",
    patientName: "Bento Queiroga Farias",
  }),
  // Aberto, mas de outro assunto: pendente de fechamento, não de começo.
  entry({
    id: "n5",
    start: "2026-07-27T09:00:00.000-03:00",
    status: "pending_signature",
    professionalName: "Marina Okabe",
    patientName: "Alice Bandeira Nogueira",
  }),
];

export const overdueFixtures: Fixture[] = [
  {
    id: "overdue-supervisor-query",
    label: "A conta do supervisor: dele agora, dos outros em 48h",
    description:
      "Cinco agendamentos. Os dois da Clara entram por serem dela; dos colegas, só o de 60 horas. E há um pendente de assinatura que não é deste assunto.",
    data: {
      schedules: NUNCA_COMECARAM,
      now: NOW,
      viewerRole: "supervisor",
      viewerProfessionalName: "Clara Vidigal",
    } satisfies OverdueData,
  },
  {
    id: "overdue-as-coordinator",
    label: "A lista da coordenação",
    description:
      "Mesmos cinco atendimentos, vistos por quem usa a definição imediata — e sem a etapa do supervisor.",
    data: { schedules: MISTURA, now: NOW, viewerRole: "coordinator" } satisfies OverdueData,
  },
  {
    id: "overdue-as-everyone-else",
    label: "A lista de todo mundo mais",
    description:
      "Os mesmos cinco, pela definição de 48 horas. Dois somem, e um que a coordenação não vê aparece.",
    data: { schedules: MISTURA, now: NOW, viewerRole: "clinic_admin" } satisfies OverdueData,
  },
  {
    id: "overdue-in-agreement",
    label: "As duas definições concordam",
    description:
      "Só atendimentos de mais de 48 horas: enquanto elas concordam, a ambiguidade não custa nada.",
    data: {
      schedules: [MISTURA[2]!, entry({ id: "s6", start: "2026-07-27T10:00:00.000-03:00", status: "pending_signature" })],
      now: NOW,
      viewerRole: "coordinator",
    } satisfies OverdueData,
  },
];
