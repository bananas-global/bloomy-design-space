import type { Fixture } from "@brucesantos/design-space";
import { TODAY } from "../contracts/index.js";
import type {
  TransferMap,
  TransferProfessional,
  TransferSlot,
  TransferWeekday,
  TransfersData,
} from "../contracts/index.js";

/**
 * Fixture da Central de Transferências.
 *
 * **Uma inativação, e é ela que faz a semana.** Juliana Reis foi inativada em
 * 24/07 e deixou três mapas de Psicologia — todos às 8h de terça, porque é
 * assim que a agenda de uma pessoa é: as mesmas crianças no mesmo horário toda
 * semana. É esse trio que exercita a disputa interna da seleção, que é a regra
 * que decide se a tela mente.
 *
 * **A terça das 8h está lotada de propósito.** Oito mapas na mesma faixa, de
 * quatro especialidades. A clínica real chega a trinta e cinco; oito já passa do
 * limite de três faixas da grade e é o que faz o bloco-resumo existir, que é o
 * comportamento a especificar. Trinta e cinco seriam trinta e cinco linhas de
 * fixture escrita à mão para provar a mesma coisa.
 *
 * **Uma especialidade tem uma profissional só.** Larissa Gomes é a única
 * psicopedagoga da unidade, e é ela quem torna a exceção de especialidade um
 * caso real em vez de hipótese: os mapas dela não têm para onde ir dentro da
 * especialidade, e a tela precisa dizer isso antes de oferecer a exceção.
 *
 * O elenco é o do resto do Design Space — as mesmas crianças e os mesmos
 * profissionais da supervisão. Uma clínica com dois elencos faria a
 * especificação parecer dois produtos.
 */

/** A unidade do cabeçalho do `AppShell`, como na gestão de chamadas. */
const UNIDADE = "Vila Aurora";

/** Quem foi inativada. Não está no quadro — só no rastro que deixou. */
const INATIVADA = "Juliana Reis";

const semana = (start: string, end: string, dias: TransferWeekday[] = [1, 2, 3, 4, 5]): TransferSlot[] =>
  dias.map((weekday) => ({ weekday, start, end }));

const PROFISSIONAIS: TransferProfessional[] = [
  /* ------------------------------------------------------------ Psicologia */
  {
    id: "prof-rafael",
    name: "Rafael Andrade Nunes",
    specialty: "Psicologia",
    room: "Sala 1",
    availability: semana("08:00", "13:00"),
  },
  // Só à tarde: é ela que produz o "Não cabe" — impedimento de escala, que
  // nenhum outro destino da mesma especialidade resolve.
  {
    id: "prof-helena-m",
    name: "Helena Martins Costa",
    specialty: "Psicologia",
    room: "Sala 2",
    availability: semana("13:00", "18:00"),
  },
  {
    id: "prof-marina",
    name: "Marina Costa",
    specialty: "Psicologia",
    room: "Sala 3",
    availability: semana("08:00", "17:00"),
  },
  {
    id: "prof-bruno",
    name: "Bruno Farias",
    specialty: "Psicologia",
    room: "Sala 3",
    availability: semana("08:00", "12:00", [2, 3, 4]),
  },
  /* A quarta pessoa livre na terça das 8h existe para que a fila **possa**
     zerar. Com três, um dos mapas de Juliana ficaria sem destino possível
     dentro da especialidade — o que é um cenário real, e é o de
     `transfers.cross-specialty`. Aqui a fila fecha em três rodadas, que é o que
     torna a movimentação parcial demonstrável até o fim. */
  {
    id: "prof-clara",
    name: "Clara Vidigal",
    specialty: "Psicologia",
    room: "Sala 2",
    availability: semana("08:00", "16:00"),
  },

  /* ------------------------------------------------------- Fonoaudiologia */
  {
    id: "prof-beatriz",
    name: "Beatriz Lima Rocha",
    specialty: "Fonoaudiologia",
    room: "Sala 4",
    availability: semana("08:00", "14:00"),
  },
  {
    id: "prof-camila",
    name: "Camila Duarte",
    specialty: "Fonoaudiologia",
    room: "Sala 4",
    availability: semana("09:00", "18:00"),
  },

  /* -------------------------------------------------- Terapia ocupacional */
  {
    id: "prof-paulo",
    name: "Paulo Nunes Ferreira",
    specialty: "Terapia ocupacional",
    room: "Sala 5",
    availability: semana("08:00", "16:00"),
  },
  {
    id: "prof-gustavo",
    name: "Gustavo Pires",
    specialty: "Terapia ocupacional",
    room: "Sala 5",
    availability: semana("08:00", "14:00", [1, 3, 5]),
  },

  /* ---------------------------------------------------------- Psicopedagogia
     Uma só. A unidade tem uma psicopedagoga, e é isso que torna a exceção de
     especialidade inevitável quando os mapas dela precisam se mover. */
  {
    id: "prof-larissa",
    name: "Larissa Gomes",
    specialty: "Psicopedagogia",
    room: "Sala 6",
    availability: semana("08:00", "16:00"),
  },
];

const em = (weekday: TransferWeekday, start: string, end: string): TransferSlot => ({
  weekday,
  start,
  end,
});

/** A terça das 8h: oito mapas na mesma faixa, cinco deles sem profissional. */
const TERCA_DAS_OITO: TransferMap[] = [
  {
    id: "map-lucas-psi",
    patient: "Lucas Almeida Ferreira",
    specialty: "Psicologia",
    professionalId: "prof-rafael",
    since: "2026-02-09",
    slots: [em(2, "08:00", "09:00")],
  },
  // Os três de Juliana. Mesma especialidade, mesmo horário, mesma origem: é o
  // formato em que uma inativação chega, e é o que a disputa interna encontra.
  {
    id: "map-sofia-psi",
    patient: "Sofia Ribeiro Lopes",
    specialty: "Psicologia",
    professionalId: null,
    since: "2026-07-24",
    leftBy: INATIVADA,
    reason: "profissional inativado em 24/07",
    slots: [em(2, "08:00", "09:00")],
  },
  {
    id: "map-manuela-psi",
    patient: "Manuela Castro Dias",
    specialty: "Psicologia",
    professionalId: null,
    since: "2026-07-24",
    leftBy: INATIVADA,
    reason: "profissional inativado em 24/07",
    slots: [em(2, "08:00", "09:00")],
  },
  {
    id: "map-bernardo-psi",
    patient: "Bernardo Souza Pires",
    specialty: "Psicologia",
    professionalId: null,
    since: "2026-07-24",
    leftBy: INATIVADA,
    reason: "profissional inativado em 24/07",
    slots: [em(2, "08:00", "09:00")],
  },
  {
    id: "map-theo-fono",
    patient: "Theo Nogueira Brandão",
    specialty: "Fonoaudiologia",
    professionalId: "prof-beatriz",
    since: "2026-03-02",
    slots: [em(2, "08:00", "09:00")],
  },
  // Sem `leftBy`: este mapa nunca teve ninguém. É a terceira origem de mapa
  // órfão, e a que não tem a quem apontar — as outras duas são inativação e
  // escala alterada.
  {
    id: "map-alice-fono",
    patient: "Alice Ribeiro",
    specialty: "Fonoaudiologia",
    professionalId: null,
    since: "2026-07-13",
    reason: "mapa criado sem profissional",
    slots: [em(2, "08:00", "09:00")],
  },
  {
    id: "map-helena-to",
    patient: "Helena Vieira",
    specialty: "Terapia ocupacional",
    professionalId: "prof-paulo",
    since: "2026-01-19",
    slots: [em(2, "08:00", "09:00")],
  },
  {
    id: "map-enzo-to",
    patient: "Enzo Tavares",
    specialty: "Terapia ocupacional",
    professionalId: null,
    since: "2026-07-22",
    leftBy: "Gustavo Pires",
    reason: "escala alterada em 22/07",
    slots: [em(2, "08:00", "09:00")],
  },
];

/** O resto da semana: o que dá carga aos destinos e o que a grade mostra. */
const RESTO_DA_SEMANA: TransferMap[] = [
  {
    id: "map-miguel-psi",
    patient: "Miguel Andrade Rocha",
    specialty: "Psicologia",
    professionalId: "prof-marina",
    since: "2025-11-17",
    slots: [em(1, "09:00", "10:00"), em(3, "09:00", "10:00")],
  },
  // Bruno carrega uma hora a mais que Marina, e é isso que decide a sugestão:
  // empatados em mapas que cabem, ganha quem está menos carregado.
  {
    id: "map-theo-psi",
    patient: "Theo Nogueira Brandão",
    specialty: "Psicologia",
    professionalId: "prof-bruno",
    since: "2026-04-06",
    slots: [em(3, "09:00", "12:00")],
  },
  // A mais carregada das três livres na terça, e é isso que a põe em terceiro
  // na ordem da sugestão: Marina com 2h, Bruno com 3h, Clara com 4h.
  {
    id: "map-duda-psi",
    patient: "Duda Lopes",
    specialty: "Psicologia",
    professionalId: "prof-clara",
    since: "2026-01-12",
    slots: [em(4, "08:00", "12:00")],
  },
  {
    id: "map-laura-psp",
    patient: "Laura Mendes Pires",
    specialty: "Psicopedagogia",
    professionalId: "prof-larissa",
    since: "2026-02-23",
    slots: [em(4, "14:00", "15:00")],
  },
  {
    id: "map-bernardo-psp",
    patient: "Bernardo Souza Pires",
    specialty: "Psicopedagogia",
    professionalId: "prof-larissa",
    since: "2026-05-04",
    slots: [em(2, "15:00", "16:00")],
  },
  {
    id: "map-gabriel-psp",
    patient: "Gabriel Pinto",
    specialty: "Psicopedagogia",
    professionalId: null,
    since: "2026-07-06",
    reason: "mapa criado sem profissional",
    slots: [em(5, "09:00", "10:00")],
  },
  {
    id: "map-duda-to",
    patient: "Duda Lopes",
    specialty: "Terapia ocupacional",
    professionalId: "prof-gustavo",
    since: "2026-03-16",
    slots: [em(1, "10:00", "11:00"), em(3, "10:00", "11:00")],
  },
  {
    id: "map-lucas-fono",
    patient: "Lucas Almeida Ferreira",
    specialty: "Fonoaudiologia",
    professionalId: "prof-camila",
    since: "2026-06-01",
    slots: [em(4, "10:00", "11:00")],
  },
  {
    id: "map-sofia-to",
    patient: "Sofia Ribeiro Lopes",
    specialty: "Terapia ocupacional",
    professionalId: "prof-paulo",
    since: "2026-05-11",
    slots: [em(5, "13:00", "14:00")],
  },
];

const base: TransfersData = {
  unit: UNIDADE,
  /* A data de referência é a do repositório, e não uma data desta tela. Ela
     decide a primeira vigência que a transferência parcial aceita. */
  today: TODAY,
  professionals: PROFISSIONAIS,
  maps: [...TERCA_DAS_OITO, ...RESTO_DA_SEMANA],
};

export const transferFixtures: Fixture[] = [
  {
    id: "transfers-week",
    label: "A semana da unidade depois de uma inativação",
    description:
      "Dezessete mapas de horas, seis deles sem profissional. Três são da mesma pessoa inativada e caem todos na terça das 8h, junto de outros cinco mapas — o horário que a grade resume em vez de fatiar.",
    data: base satisfies TransfersData,
  },
];
