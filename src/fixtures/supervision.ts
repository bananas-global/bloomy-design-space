import type { Fixture } from "@brucesantos/design-space";
import type {
  AbcRecord,
  ScheduleStatus,
  SessionProgramResult,
  SupervisedSchedule,
  SupervisionApplicator,
  SupervisionData,
  SupervisionPatient,
  SupervisionSession,
  SupervisionSupervisor,
  SupervisionTeamData,
  SupervisorRow,
} from "../contracts/index.js";

/**
 * Fixtures da supervisão.
 *
 * O período padrão do sistema real é [hoje − 30, hoje] — de 30/06 a 30/07 na
 * data de referência deste Design Space. As datas dos atendimentos ficam dentro
 * dele de propósito, para que o cenário do padrão mostre o que a tela de fato
 * mostra, e não uma lista vazia que esconderia a constatação.
 *
 * Uma supervisora aparece sem vínculo nenhum: é ela que a tela real perde.
 */

const CLARA: SupervisorRow = {
  id: "sup-clara",
  name: "Clara Vidigal",
  specialtyName: "Fonoaudiologia",
  active: true,
  internCount: 3,
};

const RENATO: SupervisorRow = {
  id: "sup-renato",
  name: "Renato Bezerra Alcântara",
  specialtyName: "Terapia ocupacional",
  active: true,
  internCount: 1,
};

/** Recém-designada: tem o papel e ainda não tem ninguém. Some da tela real. */
const IARA: SupervisorRow = {
  id: "sup-iara",
  name: "Iara Monteiro Sales",
  specialtyName: "Psicologia",
  active: true,
  internCount: 0,
};

function schedule(
  overrides: Partial<SupervisedSchedule> & { id: string },
): SupervisedSchedule {
  return {
    professionalName: "Marina Okabe",
    patientName: "Théo Andrade Lins",
    specialtyName: "Fonoaudiologia",
    serviceName: "Sessão de intervenção ABA",
    roomName: "Girassol 2",
    start: "2026-07-24T14:00:00.000-03:00",
    end: "2026-07-24T15:00:00.000-03:00",
    status: "finished",
    needsSupervisorSignature: true,
    ...overrides,
  };
}

const PARADOS: SupervisedSchedule[] = [
  schedule({
    id: "sch-1",
    start: "2026-07-13T14:00:00.000-03:00",
    end: "2026-07-13T15:00:00.000-03:00",
    status: "pending_supervisor_signature",
    signedByProfessionalAt: "2026-07-13T15:12:00.000-03:00",
  }),
  schedule({
    id: "sch-2",
    professionalName: "Otávio Ferrandini",
    patientName: "Helena Vasconcelos Prado",
    start: "2026-07-21T09:00:00.000-03:00",
    end: "2026-07-21T10:00:00.000-03:00",
    status: "pending_supervisor_signature",
    signedByProfessionalAt: "2026-07-21T10:05:00.000-03:00",
  }),
  schedule({
    id: "sch-3",
    professionalName: "Bruna Kishimoto",
    patientName: "Nina Corrêa Bastos",
    roomName: "Ipê 4",
    start: "2026-07-28T16:00:00.000-03:00",
    end: "2026-07-28T17:00:00.000-03:00",
    status: "pending_supervisor_signature",
    signedByProfessionalAt: "2026-07-28T17:08:00.000-03:00",
  }),
];

const RESOLVIDOS: SupervisedSchedule[] = [
  schedule({
    id: "sch-4",
    start: "2026-07-24T14:00:00.000-03:00",
    end: "2026-07-24T15:00:00.000-03:00",
    status: "finished",
    signedByProfessionalAt: "2026-07-24T15:04:00.000-03:00",
    signedBySupervisorAt: "2026-07-24T18:30:00.000-03:00",
  }),
  schedule({
    id: "sch-5",
    professionalName: "Otávio Ferrandini",
    patientName: "Helena Vasconcelos Prado",
    start: "2026-07-27T09:00:00.000-03:00",
    end: "2026-07-27T10:00:00.000-03:00",
    status: "pending_signature",
  }),
  schedule({
    id: "sch-6",
    professionalName: "Bruna Kishimoto",
    patientName: "Nina Corrêa Bastos",
    start: "2026-07-29T11:00:00.000-03:00",
    end: "2026-07-29T12:00:00.000-03:00",
    status: "cancelled",
  }),
];

const PADRAO = { start: "2026-06-30", end: "2026-07-30" };

export const supervisionFixtures: Fixture[] = [
  {
    id: "supervision-default-period",
    label: "O período padrão, olhando 30 dias para trás",
    description:
      "A tela como ela abre: 30/06 a 30/07, sem nada do que vem. Três atendimentos parados esperando a Clara assinar.",
    data: {
      period: PADRAO,
      supervisors: [CLARA, RENATO],
      selectedSupervisorId: "sup-clara",
      schedules: [...PARADOS, ...RESOLVIDOS],
    } satisfies SupervisionData,
  },
  {
    id: "supervision-supervisor-without-links",
    label: "A supervisora recém-designada, que a tela real perde",
    description:
      "Iara tem o papel e nenhum vínculo. O filtro `has_supervisor_internships` a tira da lista exatamente quando alguém precisaria encontrá-la.",
    data: {
      period: PADRAO,
      supervisors: [CLARA, RENATO, IARA],
      selectedSupervisorId: "sup-clara",
      schedules: [...PARADOS, ...RESOLVIDOS],
    } satisfies SupervisionData,
  },
  {
    id: "supervision-forward-period",
    label: "O mesmo mês, olhando para a frente",
    description:
      "O que a tela mostra quando o período inclui o que vem — a semana que ainda dá para acompanhar.",
    data: {
      period: { start: "2026-07-30", end: "2026-08-14" },
      supervisors: [CLARA, RENATO],
      selectedSupervisorId: "sup-clara",
      schedules: [
        schedule({
          id: "sch-7",
          start: "2026-08-03T14:00:00.000-03:00",
          end: "2026-08-03T15:00:00.000-03:00",
          status: "scheduled",
        }),
        schedule({
          id: "sch-8",
          professionalName: "Otávio Ferrandini",
          patientName: "Helena Vasconcelos Prado",
          start: "2026-08-04T09:00:00.000-03:00",
          end: "2026-08-04T10:00:00.000-03:00",
          status: "scheduled",
        }),
        schedule({
          id: "sch-9",
          professionalName: "Bruna Kishimoto",
          patientName: "Nina Corrêa Bastos",
          specialtyName: "Psicomotricidade",
          serviceName: "Avaliação de entrada",
          start: "2026-08-06T16:00:00.000-03:00",
          end: "2026-08-06T17:00:00.000-03:00",
          status: "scheduled",
          needsSupervisorSignature: false,
        }),
      ],
    } satisfies SupervisionData,
  },
  {
    id: "supervision-empty-period",
    label: "Nenhum atendimento no período",
    description:
      "O supervisor selecionado não tem atendimento de supervisionado dentro da janela escolhida.",
    data: {
      period: PADRAO,
      supervisors: [CLARA, RENATO],
      selectedSupervisorId: "sup-renato",
      schedules: [],
    } satisfies SupervisionData,
  },
  {
    id: "supervision-as-supervisor",
    label: "A tela vista por quem supervisiona",
    description:
      "O papel `supervisor` não tem `professionals.list_supervisor`. A tela que leva o nome dele não abre para ele.",
    data: {
      currentSupervisorId: "sup-clara",
      period: PADRAO,
      supervisors: [CLARA, RENATO],
      selectedSupervisorId: "sup-clara",
      schedules: [...PARADOS, ...RESOLVIDOS],
    } satisfies SupervisionData,
  },
];

/* ================================================================== *
 * A equipe de supervisão — fixtures da proposta
 * ================================================================== */

/**
 * Cinco supervisores, oito aplicadores, doze pacientes e trinta atendimentos.
 *
 * O tamanho é escolhido: com dois supervisores o filtro facetado parece enfeite,
 * porque tudo cabe na tela sem filtrar nada. Com cinco, a coluna do meio tem de
 * encolher para a pergunta ficar respondível — e é isso que a proposta afirma.
 *
 * As datas são literais e ancoradas na referência do ambiente (30/07/2026).
 * Escrever `hoje − 2` em código quebraria o determinismo: o cenário do lote de
 * assinaturas mudaria de conteúdo a cada dia, e a aprovação de ontem deixaria de
 * valer sem ninguém ter mudado nada.
 */

const D0 = "2026-07-30";
const D1 = "2026-07-29";
const D2 = "2026-07-28";
const D3 = "2026-07-27";
const D4 = "2026-07-26";
const D5 = "2026-07-25";
const D6 = "2026-07-24";

const SUPERVISORES: SupervisionSupervisor[] = [
  { id: "sup-rafael", name: "Rafael Andrade Nunes", specialtyName: "Psicologia" },
  { id: "sup-helena", name: "Helena Martins Costa", specialtyName: "Psicologia" },
  { id: "sup-beatriz", name: "Beatriz Lima Rocha", specialtyName: "Fonoaudiologia" },
  { id: "sup-paulo", name: "Paulo Nunes Ferreira", specialtyName: "Terapia ocupacional" },
  { id: "sup-tatiane", name: "Tatiane Ribeiro Alves", specialtyName: "Psicopedagogia" },
];

/**
 * Os oito supervisionados, com o papel do produto.
 *
 * O papel é um dos dez do Bloomy — Aplicador, Terapeuta, Especialista —, e não a
 * especialidade usada como cargo. "Fonoaudióloga" descreve o conselho de quem
 * atende, não o papel que o sistema concede: quem atende dentro de uma
 * especialidade é Especialista, e a especialidade fica no campo dela.
 */
const APLICADORES: SupervisionApplicator[] = [
  { id: "apl-marina", name: "Marina Costa", roleName: "Aplicador", specialtyName: "Psicologia", supervisorId: "sup-rafael", lastSupervisionOn: "2026-07-21" },
  { id: "apl-juliana", name: "Juliana Reis", roleName: "Terapeuta", specialtyName: "Psicologia", supervisorId: "sup-rafael", lastSupervisionOn: "2026-06-26" },
  { id: "apl-bruno", name: "Bruno Farias", roleName: "Aplicador", specialtyName: "Psicologia", supervisorId: "sup-rafael", lastSupervisionOn: "2026-07-23" },
  { id: "apl-rafael-t", name: "Rafael Tavares", roleName: "Terapeuta", specialtyName: "Psicologia", supervisorId: "sup-helena", lastSupervisionOn: "2026-07-15" },
  { id: "apl-camila", name: "Camila Duarte", roleName: "Especialista", specialtyName: "Fonoaudiologia", supervisorId: "sup-beatriz", lastSupervisionOn: "2026-07-24" },
  // Sem `lastSupervisionOn`: nunca foi supervisionada. É o ponto de atenção que
  // nenhuma outra tela do sistema mostra, porque a ausência não gera registro.
  { id: "apl-paula", name: "Paula Antunes", roleName: "Especialista", specialtyName: "Fonoaudiologia", supervisorId: "sup-beatriz" },
  { id: "apl-gustavo", name: "Gustavo Pires", roleName: "Especialista", specialtyName: "Terapia ocupacional", supervisorId: "sup-paulo", lastSupervisionOn: "2026-07-10" },
  { id: "apl-larissa", name: "Larissa Gomes", roleName: "Especialista", specialtyName: "Psicopedagogia", supervisorId: "sup-tatiane", lastSupervisionOn: "2026-07-26" },
];

/** Datas de nascimento literais, para a idade não mudar no aniversário. */
const PACIENTES: SupervisionPatient[] = [
  { id: "pac-lucas", name: "Lucas Almeida Ferreira", birthDate: "2020-03-14", expiringGuide: false, programs: [{ name: "Mandos espontâneos", trend: "up" }, { name: "Contato visual", trend: "flat" }] },
  { id: "pac-sofia", name: "Sofia Ribeiro Lopes", birthDate: "2021-01-22", expiringGuide: true, programs: [{ name: "Tato de figuras", trend: "stalled" }] },
  { id: "pac-manuela", name: "Manuela Castro Dias", birthDate: "2019-05-09", expiringGuide: false, programs: [{ name: "Comportamento social", trend: "down" }] },
  { id: "pac-bernardo", name: "Bernardo Souza Pires", birthDate: "2018-02-27", expiringGuide: false, programs: [{ name: "Autonomia na higiene", trend: "up" }, { name: "Integração sensorial", trend: "flat" }] },
  { id: "pac-theo", name: "Theo Nogueira Brandão", birthDate: "2020-06-18", expiringGuide: false, programs: [{ name: "Comunicação funcional", trend: "flat" }] },
  { id: "pac-alice", name: "Alice Ribeiro", birthDate: "2022-04-05", expiringGuide: true, programs: [{ name: "Imitação motora", trend: "up" }] },
  { id: "pac-helena", name: "Helena Vieira", birthDate: "2021-07-11", expiringGuide: false, programs: [{ name: "Fala e fonemas", trend: "up" }, { name: "Vocabulário", trend: "up" }] },
  { id: "pac-enzo", name: "Enzo Tavares", birthDate: "2019-03-30", expiringGuide: false, programs: [{ name: "Deglutição", trend: "stalled" }] },
  { id: "pac-duda", name: "Duda Lopes", birthDate: "2020-01-08", expiringGuide: false, programs: [{ name: "Integração sensorial", trend: "flat" }] },
  { id: "pac-miguel", name: "Miguel Andrade Rocha", birthDate: "2021-05-16", expiringGuide: false, programs: [{ name: "Pareamento", trend: "up" }, { name: "Atenção compartilhada", trend: "flat" }] },
  { id: "pac-laura", name: "Laura Mendes Pires", birthDate: "2019-06-24", expiringGuide: false, programs: [{ name: "Leitura funcional", trend: "up" }] },
  { id: "pac-gabriel", name: "Gabriel Pinto", birthDate: "2018-04-19", expiringGuide: false, programs: [{ name: "Raciocínio lógico", trend: "flat" }] },
];

const ABC_DEMANDA: AbcRecord = {
  antecedent: "Pedido de encerrar atividade preferida",
  behavior: "Chorou e empurrou o material da mesa",
  consequence: "Retirada breve da demanda e reapresentação com escolha",
  minutes: 2,
};

const ABC_TRANSICAO: AbcRecord = {
  antecedent: "Transição entre atividades sem aviso prévio",
  behavior: "Deitou no chão e recusou-se a levantar",
  consequence: "Antecipação visual e contagem regressiva",
  minutes: 4,
};

type Atendimento = {
  id: string;
  applicator: string;
  patient: string;
  day: string;
  from: string;
  to: string;
  status: ScheduleStatus;
  service?: string;
  /** Só quando divergir do padrão da situação — falta e cancelamento não têm. */
  record?: boolean;
  place?: string;
  note?: string;
  programs?: SessionProgramResult[];
  abc?: AbcRecord[];
};

/**
 * Registro presente por padrão em atendimento concluído e em atendimento
 * esperando a segunda assinatura — nos dois casos alguém já registrou.
 *
 * `record: false` num concluído é a exceção que existe para ser vista: é o
 * atendimento fechado sem registro, que vira ponto de atenção do paciente.
 */
function atendimento(item: Atendimento): SupervisionSession {
  const comRegistro =
    item.record ??
    (item.status === "finished" || item.status === "pending_supervisor_signature");
  const inicio = `${item.day}T${item.from}:00.000-03:00`;
  const fim = `${item.day}T${item.to}:00.000-03:00`;

  return {
    id: item.id,
    applicatorId: item.applicator,
    patientId: item.patient,
    serviceName: item.service ?? "Terapia ABA",
    start: inicio,
    end: fim,
    status: item.status,
    hasRecord: comRegistro,
    placeName: item.place ?? "Unidade Aurora",
    ...(comRegistro ? { checkinAt: inicio, checkoutAt: fim } : {}),
    ...(item.note ? { note: item.note } : {}),
    programs: item.programs ?? [],
    abc: item.abc ?? [],
  };
}

const NOTA_QUEDA =
  "Sessão produtiva. Boa disponibilidade nas primeiras tentativas, leve queda de atenção no último bloco.";
const NOTA_AJUDA =
  "Precisou de ajuda gestual em parte das tentativas. Manteve engajamento com o reforçador preferido.";
const NOTA_MAE =
  "Boa generalização com a mãe presente na sala. Reduzimos o nível de ajuda no decorrer da sessão.";
const NOTA_DESREGULACAO =
  "Alternou entre mesa e chão. Encerramos antes do previsto por desregulação leve, retomado ao final.";

const ATENDIMENTOS: SupervisionSession[] = [
  /* Marina e Lucas — o atendimento do lote que a jornada abre primeiro. */
  atendimento({
    id: "atd-01", applicator: "apl-marina", patient: "pac-lucas", day: D2, from: "08:00", to: "09:00",
    status: "pending_supervisor_signature", place: "Atendimento domiciliar", note: NOTA_MAE,
    programs: [
      { name: "Mandos espontâneos", trend: "up", correct: 8, trials: 13 },
      { name: "Contato visual", trend: "flat", correct: 8, trials: 11 },
    ],
    abc: [ABC_DEMANDA],
  }),
  atendimento({
    id: "atd-02", applicator: "apl-marina", patient: "pac-lucas", day: D4, from: "08:00", to: "09:00",
    status: "finished", note: NOTA_QUEDA,
    programs: [{ name: "Mandos espontâneos", trend: "up", correct: 7, trials: 12 }],
  }),
  atendimento({
    id: "atd-03", applicator: "apl-marina", patient: "pac-lucas", day: D0, from: "09:00", to: "10:00",
    status: "scheduled",
  }),

  /* Camila e Lucas — o segundo supervisor do mesmo paciente. */
  atendimento({
    id: "atd-04", applicator: "apl-camila", patient: "pac-lucas", day: D1, from: "13:00", to: "14:00",
    status: "finished", service: "Fonoaudiologia", note: NOTA_AJUDA,
    programs: [{ name: "Contato visual", trend: "flat", correct: 6, trials: 10 }],
  }),
  atendimento({
    id: "atd-05", applicator: "apl-camila", patient: "pac-lucas", day: D5, from: "13:00", to: "14:00",
    status: "pending_supervisor_signature", service: "Fonoaudiologia", note: NOTA_QUEDA,
    programs: [
      { name: "Mandos espontâneos", trend: "up", correct: 9, trials: 12 },
      { name: "Contato visual", trend: "flat", correct: 7, trials: 10 },
    ],
  }),

  /* Marina e Sofia — duas faltas e a guia vencendo no mesmo paciente. */
  atendimento({
    id: "atd-06", applicator: "apl-marina", patient: "pac-sofia", day: D1, from: "10:00", to: "11:00",
    status: "pending_supervisor_signature", note: NOTA_DESREGULACAO,
    programs: [{ name: "Tato de figuras", trend: "stalled", correct: 5, trials: 14 }],
    abc: [ABC_TRANSICAO],
  }),
  atendimento({ id: "atd-07", applicator: "apl-marina", patient: "pac-sofia", day: D3, from: "10:00", to: "11:00", status: "missed" }),
  atendimento({ id: "atd-08", applicator: "apl-marina", patient: "pac-sofia", day: D6, from: "10:00", to: "11:00", status: "missed" }),

  atendimento({
    id: "atd-09", applicator: "apl-rafael-t", patient: "pac-sofia", day: D2, from: "15:00", to: "16:00",
    status: "finished", note: NOTA_AJUDA,
    programs: [{ name: "Tato de figuras", trend: "stalled", correct: 4, trials: 12 }],
  }),

  /* Juliana e Manuela — o concluído sem registro. */
  atendimento({
    id: "atd-10", applicator: "apl-juliana", patient: "pac-manuela", day: D1, from: "14:00", to: "15:00",
    status: "finished", service: "Psicologia", record: false,
  }),
  atendimento({
    id: "atd-11", applicator: "apl-juliana", patient: "pac-manuela", day: D5, from: "14:00", to: "15:00",
    status: "finished", service: "Psicologia", note: NOTA_DESREGULACAO,
    programs: [{ name: "Comportamento social", trend: "down", correct: 3, trials: 11 }],
  }),

  /* Juliana e Bernardo — o atendimento com dois registros de comportamento. */
  atendimento({ id: "atd-12", applicator: "apl-juliana", patient: "pac-bernardo", day: D0, from: "09:00", to: "10:00", status: "scheduled" }),
  atendimento({
    id: "atd-13", applicator: "apl-juliana", patient: "pac-bernardo", day: D2, from: "09:00", to: "10:00",
    status: "pending_supervisor_signature", note: NOTA_AJUDA,
    programs: [
      { name: "Autonomia na higiene", trend: "up", correct: 10, trials: 12 },
      { name: "Integração sensorial", trend: "flat", correct: 6, trials: 9 },
    ],
    abc: [ABC_DEMANDA, ABC_TRANSICAO],
  }),

  atendimento({
    id: "atd-14", applicator: "apl-gustavo", patient: "pac-bernardo", day: D3, from: "11:00", to: "12:00",
    status: "finished", service: "Terapia ocupacional", note: NOTA_QUEDA,
    programs: [{ name: "Integração sensorial", trend: "flat", correct: 7, trials: 10 }],
  }),

  /* Rafael Tavares e Theo — o registro que ainda não foi feito. */
  atendimento({
    id: "atd-15", applicator: "apl-rafael-t", patient: "pac-theo", day: D3, from: "11:00", to: "12:00",
    status: "finished", note: NOTA_MAE,
    programs: [{ name: "Comunicação funcional", trend: "flat", correct: 6, trials: 11 }],
  }),
  atendimento({ id: "atd-16", applicator: "apl-rafael-t", patient: "pac-theo", day: D0, from: "13:00", to: "14:00", status: "pending_register" }),

  atendimento({
    id: "atd-17", applicator: "apl-rafael-t", patient: "pac-alice", day: D1, from: "13:00", to: "14:00",
    status: "pending_supervisor_signature", note: NOTA_QUEDA,
    programs: [{ name: "Imitação motora", trend: "up", correct: 11, trials: 13 }],
  }),

  atendimento({
    id: "atd-18", applicator: "apl-camila", patient: "pac-helena", day: D1, from: "08:00", to: "09:00",
    status: "finished", service: "Fonoaudiologia", note: NOTA_AJUDA,
    programs: [{ name: "Fala e fonemas", trend: "up", correct: 8, trials: 10 }],
  }),
  atendimento({
    id: "atd-19", applicator: "apl-camila", patient: "pac-helena", day: D2, from: "15:00", to: "16:00",
    status: "pending_supervisor_signature", service: "Fonoaudiologia", place: "Unidade Pinheiros", note: NOTA_MAE,
    programs: [
      { name: "Fala e fonemas", trend: "up", correct: 9, trials: 11 },
      { name: "Vocabulário", trend: "up", correct: 12, trials: 15 },
    ],
  }),

  atendimento({ id: "atd-20", applicator: "apl-paula", patient: "pac-enzo", day: D0, from: "10:00", to: "11:00", status: "scheduled", service: "Fonoaudiologia" }),

  atendimento({ id: "atd-21", applicator: "apl-gustavo", patient: "pac-duda", day: D4, from: "13:00", to: "14:00", status: "cancelled", service: "Terapia ocupacional" }),
  atendimento({
    id: "atd-22", applicator: "apl-gustavo", patient: "pac-duda", day: D1, from: "09:00", to: "10:00",
    status: "pending_supervisor_signature", service: "Terapia ocupacional", note: NOTA_DESREGULACAO,
    programs: [{ name: "Integração sensorial", trend: "flat", correct: 7, trials: 12 }],
  }),

  /* Bruno — o único aplicador sem nada pendente e sem ponto de atenção. */
  atendimento({
    id: "atd-23", applicator: "apl-bruno", patient: "pac-miguel", day: D2, from: "08:00", to: "09:00",
    status: "finished", note: NOTA_QUEDA,
    programs: [{ name: "Pareamento", trend: "up", correct: 9, trials: 11 }],
  }),
  atendimento({
    id: "atd-24", applicator: "apl-bruno", patient: "pac-miguel", day: D5, from: "08:00", to: "09:00",
    status: "finished", note: NOTA_AJUDA,
    programs: [{ name: "Atenção compartilhada", trend: "flat", correct: 6, trials: 10 }],
  }),
  atendimento({ id: "atd-25", applicator: "apl-bruno", patient: "pac-miguel", day: D0, from: "08:00", to: "09:00", status: "scheduled" }),

  atendimento({
    id: "atd-26", applicator: "apl-bruno", patient: "pac-laura", day: D3, from: "11:00", to: "12:00",
    status: "finished", note: NOTA_MAE,
    programs: [{ name: "Leitura funcional", trend: "up", correct: 10, trials: 12 }],
  }),
  atendimento({
    id: "atd-27", applicator: "apl-bruno", patient: "pac-laura", day: D1, from: "11:00", to: "12:00",
    status: "finished", note: NOTA_QUEDA,
    programs: [{ name: "Leitura funcional", trend: "up", correct: 11, trials: 13 }],
  }),

  atendimento({
    id: "atd-28", applicator: "apl-larissa", patient: "pac-gabriel", day: D2, from: "10:00", to: "11:00",
    status: "finished", service: "Psicopedagogia", note: NOTA_AJUDA,
    programs: [{ name: "Raciocínio lógico", trend: "flat", correct: 7, trials: 12 }],
  }),
  atendimento({ id: "atd-29", applicator: "apl-larissa", patient: "pac-gabriel", day: D0, from: "10:00", to: "11:00", status: "scheduled", service: "Psicopedagogia" }),

  atendimento({
    id: "atd-30", applicator: "apl-larissa", patient: "pac-laura", day: D4, from: "14:00", to: "15:00",
    status: "finished", service: "Psicopedagogia", note: NOTA_MAE,
    programs: [{ name: "Leitura funcional", trend: "up", correct: 9, trials: 12 }],
  }),
];

/** Nada pendente: os sete que esperavam assinatura já foram assinados. */
const ATENDIMENTOS_ASSINADOS: SupervisionSession[] = ATENDIMENTOS.map((session) =>
  session.status === "pending_supervisor_signature"
    ? { ...session, status: "finished" as ScheduleStatus }
    : session,
);

/**
 * O visitante que supervisiona é o Rafael.
 *
 * O campo vale para **todas** as fixtures, porque ele não descreve um estado da
 * clínica: descreve quem está olhando. Trocar a persona para Supervisor no painel
 * é o que o ativa — a coordenação, que lista supervisores, escolhe entre os cinco
 * e não é estreitada por ele.
 */
const EQUIPE = {
  now: "2026-07-30",
  viewerSupervisorId: "sup-rafael",
  supervisors: SUPERVISORES,
  applicators: APLICADORES,
  patients: PACIENTES,
};

export const supervisionTeamFixtures: Fixture[] = [
  {
    id: "supervision-team",
    label: "A equipe inteira, com sete assinaturas pendentes",
    description:
      "Cinco supervisores, oito aplicadores, doze pacientes e sete atendimentos esperando a segunda assinatura. Com a persona Coordenador são três colunas; com Supervisor, a carteira do Rafael.",
    data: { ...EQUIPE, sessions: ATENDIMENTOS } satisfies SupervisionTeamData,
  },
  {
    id: "supervision-team-signed",
    label: "A fila de assinaturas vazia",
    description:
      "Os sete atendimentos já foram assinados. É o estado em que a tela precisa dizer o que fazer em seguida, e não só que não há nada.",
    data: { ...EQUIPE, sessions: ATENDIMENTOS_ASSINADOS } satisfies SupervisionTeamData,
  },
  {
    id: "supervision-team-new-supervisor",
    label: "Quem supervisiona e ainda não tem ninguém",
    description:
      "Sem `viewerSupervisorId`: o visitante acabou de ser designado supervisor e nenhum vínculo existe. É a Iara do porte, agora do lado de quem entra — a tela não abre, e diz que abre quando o primeiro vínculo existir.",
    data: {
      now: "2026-07-30",
      supervisors: SUPERVISORES,
      applicators: APLICADORES,
      patients: PACIENTES,
      sessions: ATENDIMENTOS,
    } satisfies SupervisionTeamData,
  },
];
