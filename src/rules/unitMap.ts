import type { Rule } from "@brucesantos/design-space";
import type {
  UnitMapAxis,
  UnitMapData,
  UnitMapDay,
  UnitMapRow,
} from "../contracts/index.js";

/**
 * Regras do mapa da unidade.
 *
 * O mapa é a tela de **decidir onde cabe mais alguém**: a semana inteira da
 * unidade, por paciente, por profissional, por sala ou agregada. É a única tela
 * do produto em que a pergunta não é sobre um caso, e sim sobre capacidade.
 *
 * O que a torna difícil é que ela tem três maneiras diferentes de mostrar zero,
 * e elas pedem ações opostas. Traduzido de
 * `Bloomy.UnitMaps.ListWithDefinedAgendaHoursWeek` e
 * `BloomyWeb.Backoffice.UnitMapLive`.
 */
export const unitMapRules: Rule[] = [
  {
    id: "no-agenda-is-not-zero-occupancy",
    statement:
      "`calculate_occupancy(_items, [])` devolve 0. Um profissional sem agenda padrão no dia aparece com 0% de ocupação, idêntico a quem tem o dia todo definido e nenhum atendimento.",
    rationale:
      "As duas leituras pedem ações opostas: uma é “marque alguém com essa pessoa”, a outra é “defina a agenda padrão dela, no People”. Mostradas iguais, a segunda nunca acontece — e o profissional passa semanas parecendo disponível sem estar disponível para nada.",
    source: "src/rules/unitMap.ts",
  },
  {
    id: "unit-hours-drop-the-last-partial-hour",
    statement:
      "As horas do mapa vão de `abertura.hora` até `fechamento.hora − 1`. Uma unidade que fecha às 18h30 mostra até as 17h, e o que acontece às 18h não aparece no mapa.",
    rationale:
      "O atendimento existe, ocupa sala e profissional, e some da única tela que serve para ver ocupação. É invisível justamente porque a última faixa do dia é a mais disputada.",
    source: "src/rules/unitMap.ts",
  },
  {
    id: "occupancy-counts-hours-touched",
    statement:
      "A ocupação conta horas com pelo menos um atendimento, e não atendimentos. Uma hora com três atendimentos em três salas conta igual a uma hora com um.",
    rationale:
      "Para “onde cabe mais alguém” isso é defensável — a hora está tomada de qualquer jeito. Mas o número não é aproveitamento de capacidade, e ler como se fosse leva a decidir contratação com o dado errado. O nome precisa dizer o que ele mede.",
    source: "src/rules/unitMap.ts",
  },
  {
    id: "the-axis-decides-the-question",
    statement:
      "Quatro eixos: paciente, profissional, sala e unidade. Só profissional e sala aceitam escolher entre semana e dia — paciente é sempre semana e unidade é sempre o agregado.",
    rationale:
      "A restrição é correta, e no sistema real ela aparece como dois botões apagados sem explicação. Quem clica e não acontece nada aprende que a tela está quebrada, e não que a pergunta não faz sentido naquele eixo.",
    source: "src/rules/unitMap.ts",
  },
  {
    id: "people-cannot-see-the-map-they-cause",
    statement:
      "`UnitMapPolicy.can?(role, :show)` não inclui `people` nem `operation`. Quem define a agenda padrão dos profissionais não alcança a tela onde o efeito dessa definição aparece.",
    rationale:
      "É o par exato do primeiro achado: o mapa mostra “sem agenda definida”, e a pessoa que resolveria isso não vê o mapa. A pendência precisa sair da tela e chegar a quem age — nomeando o destinatário, já que ele não vai passar por aqui.",
    source: "src/rules/unitMap.ts",
  },
];

type Decision = { allowed: boolean; reason?: string };

/* ================================================================ acesso */

const CAN_SHOW = [
  "admin",
  "clinic_admin",
  "coordinator",
  "therapeutic_companion",
  "supervisor",
  "applicator",
  "specialist",
  "attendant",
];

/** Implementação de `people-cannot-see-the-map-they-cause`. */
export function canSeeMap(role: string): Decision {
  if (CAN_SHOW.includes(role)) return { allowed: true };

  if (role === "people") {
    return {
      allowed: false,
      reason:
        "O People define a agenda padrão dos profissionais e não alcança o mapa, que é onde o efeito dessa definição aparece.",
    };
  }

  return { allowed: false, reason: "Seu perfil não alcança o mapa da unidade." };
}

export function canManageMap(permissions: string[]): Decision {
  if (permissions.includes("unit_maps.manage_unit_map")) return { allowed: true };
  return {
    allowed: false,
    reason:
      "Ver o mapa é de quase todo mundo; mexer nele é de admin, admin de clínica e coordenação.",
  };
}

/* ================================================================ horas */

/**
 * Implementação de `unit-hours-drop-the-last-partial-hour`.
 *
 * Reproduz `start_at.hour..(end_at.hour - 1)`. Reproduzir em vez de corrigir é
 * o ponto: a faixa perdida só fica visível se a tela mostrar a mesma faixa que
 * o sistema real mostra.
 */
export function visibleHours(unit: { opensAt: string; closesAt: string }): number[] {
  const open = Number(unit.opensAt.slice(0, 2));
  const close = Number(unit.closesAt.slice(0, 2));
  const hours: number[] = [];
  for (let hour = open; hour <= close - 1; hour += 1) hours.push(hour);
  return hours;
}

/**
 * A faixa que o mapa perde, quando perde.
 *
 * Devolve a hora sumida, e não um booleano: quem lê precisa saber **qual**
 * faixa conferir por outro caminho.
 */
export function hourLostToRounding(unit: {
  opensAt: string;
  closesAt: string;
}): number | undefined {
  const close = Number(unit.closesAt.slice(0, 2));
  const closeMinutes = Number(unit.closesAt.slice(3, 5));
  return closeMinutes > 0 ? close : undefined;
}

/** O que acontece na faixa perdida — o que o mapa não mostra e existe. */
export function itemsInLostHour(data: UnitMapData): UnitMapDay["itemsByHour"][number] {
  const lost = hourLostToRounding(data.unit);
  if (lost === undefined) return [];

  return data.rows.flatMap((row) =>
    row.days.flatMap((day) => day.itemsByHour[lost] ?? []),
  );
}

/* ============================================================= ocupação */

/**
 * Implementação de `no-agenda-is-not-zero-occupancy`.
 *
 * Devolve `undefined` — e não 0 — quando não há agenda padrão no dia. A
 * diferença entre "0% de oito horas" e "nenhuma hora definida" é toda a razão
 * de o módulo existir, e um número não consegue carregá-la.
 */
export function occupancy(day: UnitMapDay): number | undefined {
  if (day.availableHours.length === 0) return undefined;

  const occupied = day.availableHours.filter(
    (hour) => (day.itemsByHour[hour] ?? []).length > 0,
  ).length;

  return Math.round((occupied / day.availableHours.length) * 100);
}

export type DayState = "no-agenda" | "free" | "partial" | "full";

export function dayState(day: UnitMapDay): DayState {
  const rate = occupancy(day);
  if (rate === undefined) return "no-agenda";
  if (rate === 0) return "free";
  if (rate === 100) return "full";
  return "partial";
}

export function dayStateLabel(state: DayState): string {
  switch (state) {
    case "no-agenda":
      return "Sem agenda padrão definida";
    case "free":
      return "Nenhuma hora ocupada";
    case "partial":
      return "Parcialmente ocupado";
    case "full":
      return "Todas as horas ocupadas";
  }
}

/** As linhas que precisam de cadastro, e não de agendamento. */
export function rowsWithoutAgenda(data: UnitMapData): UnitMapRow[] {
  return data.rows.filter((row) => row.days.every((day) => day.availableHours.length === 0));
}

/**
 * Implementação de `occupancy-counts-hours-touched`.
 *
 * Existe para dar nome ao que o número não mede: nas horas com mais de um
 * atendimento, a ocupação continua contando uma.
 */
export function hoursWithMoreThanOne(day: UnitMapDay): number[] {
  return day.availableHours.filter((hour) => (day.itemsByHour[hour] ?? []).length > 1);
}

/** A ocupação da semana, com a mesma recusa de inventar zero. */
export function weekOccupancy(row: UnitMapRow): number | undefined {
  const slots = row.days.reduce((total, day) => total + day.availableHours.length, 0);
  if (slots === 0) return undefined;

  const occupied = row.days.reduce(
    (total, day) =>
      total + day.availableHours.filter((hour) => (day.itemsByHour[hour] ?? []).length > 0).length,
    0,
  );

  return Math.round((occupied / slots) * 100);
}

/* ================================================================ eixos */

/** Implementação de `the-axis-decides-the-question`. */
export function granularityOf(axis: UnitMapAxis): "week" | "day" | "both" {
  switch (axis) {
    case "professional":
    case "room":
      return "both";
    case "patient":
      return "week";
    case "unit":
      return "week";
  }
}

export function axisLabel(axis: UnitMapAxis): string {
  switch (axis) {
    case "patient":
      return "Por paciente";
    case "professional":
      return "Por profissional";
    case "room":
      return "Por sala";
    case "unit":
      return "Unidade inteira";
  }
}

/**
 * Por que a granularidade não se escolhe naquele eixo.
 *
 * Dois botões apagados sem explicação ensinam que a tela está quebrada. A
 * frase ensina que a pergunta não faz sentido ali.
 */
export function granularityLocked(axis: UnitMapAxis): string | undefined {
  switch (axis) {
    case "patient":
      return "A semana do paciente é a unidade de leitura aqui: o que interessa é a distribuição dele entre os dias, e um dia isolado não mostra distribuição.";
    case "unit":
      return "A visão da unidade já é o agregado da semana. Um recorte de um dia seria outra tela, não outra granularidade desta.";
    default:
      return undefined;
  }
}

export function askedQuestion(axis: UnitMapAxis): string {
  switch (axis) {
    case "patient":
      return "Como a semana deste paciente está distribuída?";
    case "professional":
      return "Onde cabe mais um atendimento na agenda de alguém?";
    case "room":
      return "Que sala está livre neste horário?";
    case "unit":
      return "A unidade comporta mais um paciente?";
  }
}
