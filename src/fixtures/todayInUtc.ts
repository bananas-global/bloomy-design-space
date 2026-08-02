import type { Fixture } from "@brucesantos/design-space";
import type { TodayData, TodaySurface } from "../contracts/index.js";

/**
 * Fixtures de “que dia o sistema acha que é”.
 *
 * Os números são contagens reais do monólito, conferidas com `grep`: 205
 * chamadas a `Date.utc_today()` fora de worker, em 133 arquivos, contra 104 usos
 * do ajudante que conhece o fuso.
 *
 * A data de nascimento é sintética e foi escolhida para cair no dia em que a
 * conta de idade erra.
 */

const superficies: TodaySurface[] = [
  {
    id: "s1",
    where: "Mapa de horas",
    what: "O calendário do campo “data de encerramento”",
    breaks: "O dia de hoje deixa de ser selecionável no seletor de data.",
    kind: "input",
    source: "lib/bloomy_web/backoffice/live/patient_live/components/hour_map/finish_modal.ex:25",
  },
  {
    id: "s2",
    where: "Agenda",
    what: "A janela para desfazer um atendimento do dia",
    breaks: "Fecha três horas antes da meia-noite: o atendimento de hoje deixa de ser de hoje.",
    kind: "guard",
    source: "lib/bloomy/schedules/revert_schedule.ex:85",
  },
  {
    id: "s3",
    where: "Conversa com a família",
    what: "O destaque do dia corrente no fio de mensagens",
    breaks: "As mensagens de hoje param de aparecer como do dia, e o dia seguinte já aparece destacado.",
    kind: "label",
    source: "lib/bloomy_web/backoffice/live/chat_live/chat_modal.ex:61",
  },
  {
    id: "s4",
    where: "Prontuário e relatórios",
    what: "A idade do paciente, em oito telas",
    breaks: "A virada de idade antecipa mais um dia, somando-se ao erro da divisão por 365.",
    kind: "age",
    source: "lib/bloomy_web/backoffice/live/patient_live/components/card_header.ex:54",
  },
  {
    id: "s5",
    where: "Documentos",
    what: "O filtro de vencimento",
    breaks: "Um documento que vence hoje aparece como vencido.",
    kind: "guard",
    source: "lib/bloomy/patients/document_filters.ex:26",
  },
];

const base: TodayData = {
  utcCalls: 205,
  timezoneAwareCalls: 104,
  filesAffected: 133,
  now: "2026-07-30T21:40:00.000-03:00",
  // Faz treze só em 02/08. A divisão por 365 erra sozinha, e o fuso soma
  // mais um dia — por isso a mesma data serve aos dois cenários.
  birthdate: "2013-08-02",
  surfaces: superficies,
};

export const todayInUtcFixtures: Fixture[] = [
  {
    id: "today-in-utc-window-open",
    label: "21h40 — o sistema já virou o dia",
    description:
      "Dentro da janela diária de três horas. As cinco superfícies mostram o que cada uma faz de errado enquanto ela dura.",
    data: base,
  },
  {
    id: "today-in-utc-window-closed",
    label: "14h20 — as duas datas concordam",
    description:
      "Fora da janela. As 205 chamadas devolvem a resposta certa, e é por isso que o defeito atravessou 133 arquivos sem ser notado.",
    data: { ...base, now: "2026-07-30T14:20:00.000-03:00" } satisfies TodayData,
  },
];
