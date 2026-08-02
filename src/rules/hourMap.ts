import type { Rule } from "@brucesantos/design-space";
import type { HourMap, HourMapConflict, HourMapSlot } from "../contracts/index.js";

/**
 * Regras do mapa de horas.
 *
 * O mapa é a ponte entre o plano e a agenda: alguém desenha a semana pretendida
 * do paciente — segunda às 14h com a Marina na sala 1, quarta às 10h com o Rui —
 * e o sistema materializa isso em agendamentos ao longo da vigência.
 *
 * O que torna o módulo interessante é o que ele faz quando não consegue.
 * Traduzido de `HourMaps.BuildSchedules`.
 */
export const hourMapRules: Rule[] = [
  {
    id: "hour-map-generates-with-holes",
    statement:
      "Quando um horário do mapa esbarra num conflito, o sistema apaga o campo em conflito e gera o agendamento assim mesmo. A grade nasce com buracos, não com erro.",
    rationale:
      "É defensável: metade de um horário é melhor que nenhum, e a recepção completa depois. Mas a escolha precisa estar visível — um mapa aplicado com quinze agendamentos sem profissional parece pronto e não está.",
    source: "src/rules/hourMap.ts",
  },
  {
    id: "conflict-family-decides-what-is-lost",
    statement:
      "Conflito de profissional apaga o profissional; conflito de sala apaga a sala. Um horário pode perder os dois e continuar sendo criado.",
    rationale:
      "As duas perdas têm donos diferentes: profissional é problema da coordenação, sala é da administração da unidade. Um aviso único de “conflito” não diz a quem entregar.",
    source: "src/rules/hourMap.ts",
  },
  {
    id: "no-agenda-is-not-a-clash",
    statement:
      "“Sem agenda” significa que o profissional não tem agenda padrão naquele dia — não que ele esteja ocupado. É um cadastro faltando, não uma disputa de horário.",
    rationale:
      "As duas viram “profissional indisponível” e pedem ações opostas: uma é montar a agenda padrão, a outra é escolher outro horário.",
    source: "src/rules/hourMap.ts",
  },
  {
    id: "applied-map-is-not-redrawn",
    statement:
      "Mapa aplicado não é editado. Mudar a semana pretendida exige cancelar e desenhar de novo.",
    rationale:
      "Os agendamentos já existem e alguns já viraram atendimento. Editar o desenho depois faria a grade divergir do que aconteceu de fato.",
    source: "src/rules/hourMap.ts",
  },
];

/* ============================================================= conflitos */

export const PROFESSIONAL_CONFLICTS: HourMapConflict[] = [
  "no_agenda",
  "conflicting_agenda",
  "professional_blocked",
  "professional_occupied",
];

export const ROOM_CONFLICTS: HourMapConflict[] = ["room_occupied", "room_blocked"];

export function conflictFamily(conflict: HourMapConflict): "professional" | "room" {
  return PROFESSIONAL_CONFLICTS.includes(conflict) ? "professional" : "room";
}

/**
 * Implementação de `conflict-family-decides-what-is-lost`.
 *
 * Espelha `set_field_value/4`: a presença de **qualquer** conflito da família
 * apaga o campo daquela família. Não é o pior conflito que decide, é o primeiro.
 */
export function losesProfessional(slot: HourMapSlot): boolean {
  return slot.conflicts.some((conflict) => conflictFamily(conflict) === "professional");
}

export function losesRoom(slot: HourMapSlot): boolean {
  return slot.conflicts.some((conflict) => conflictFamily(conflict) === "room");
}

/**
 * O que o horário perde, e de quem é resolver.
 *
 * Implementação de `no-agenda-is-not-a-clash`. Cada conflito tem uma frase
 * própria porque as ações são diferentes: montar agenda padrão, mudar horário,
 * liberar sala, esperar o bloqueio passar.
 */
export function conflictMessage(conflict: HourMapConflict): { what: string; owner: string } {
  switch (conflict) {
    case "no_agenda":
      return {
        what: "O profissional não tem agenda padrão neste dia — é cadastro faltando, não horário ocupado.",
        owner: "People, que define agenda padrão",
      };
    case "conflicting_agenda":
      return {
        what: "A agenda padrão do profissional não cobre este horário.",
        owner: "Coordenação, escolhendo outro horário ou outro profissional",
      };
    case "professional_blocked":
      return {
        what: "O profissional tem bloqueio de agenda neste horário — férias, reunião ou ausência.",
        owner: "Coordenação",
      };
    case "professional_occupied":
      return {
        what: "O profissional já tem outro atendimento neste horário.",
        owner: "Coordenação",
      };
    case "room_occupied":
      return { what: "A sala já está ocupada neste horário.", owner: "Administração da unidade" };
    case "room_blocked":
      return {
        what: "A sala está bloqueada ou inativa neste horário.",
        owner: "Administração da unidade",
      };
  }
}

/* ================================================================ grade */

/** Horários que nasceram incompletos. */
export function incompleteSlots(map: HourMap): HourMapSlot[] {
  return map.slots.filter((slot) => slot.conflicts.length > 0);
}

/**
 * O resumo que decide se o mapa está pronto para aplicar.
 *
 * `withoutProfessional` e `withoutRoom` se sobrepõem de propósito: um horário
 * pode perder os dois, e contar cada perda separadamente é o que permite dizer
 * a quem entregar cada parte.
 */
export function mapSummary(map: HourMap): {
  total: number;
  complete: number;
  withoutProfessional: number;
  withoutRoom: number;
} {
  return {
    total: map.slots.length,
    complete: map.slots.filter((slot) => slot.conflicts.length === 0).length,
    withoutProfessional: map.slots.filter(losesProfessional).length,
    withoutRoom: map.slots.filter(losesRoom).length,
  };
}

type Decision = { allowed: boolean; reason?: string };

/**
 * Aplicar o mapa é permitido mesmo com buracos — é assim no monólito, e é
 * defensável. O que esta especificação exige é que a decisão seja informada:
 * quem aplica precisa saber quantos horários vão nascer incompletos.
 */
export function canApply(map: HourMap, permissions: string[]): Decision {
  if (!permissions.includes("hour_maps.manage_hour_map")) {
    return {
      allowed: false,
      reason: "Só admin, admin de clínica e coordenação montam mapa de horas.",
    };
  }

  if (map.status === "applied") {
    return { allowed: false, reason: "Este mapa já foi aplicado." };
  }

  if (map.status === "cancelled") {
    return { allowed: false, reason: "Este mapa foi cancelado. Desenhe um novo." };
  }

  if (map.slots.length === 0) {
    return { allowed: false, reason: "Desenhe ao menos um horário na semana antes de aplicar." };
  }

  return { allowed: true };
}

/** Implementação de `applied-map-is-not-redrawn`. */
export function canEdit(map: HourMap, permissions: string[]): Decision {
  if (!permissions.includes("hour_maps.manage_hour_map")) {
    return {
      allowed: false,
      reason: "Só admin, admin de clínica e coordenação montam mapa de horas.",
    };
  }

  if (map.status === "applied") {
    return {
      allowed: false,
      reason:
        "Mapa aplicado não é editado: os agendamentos já existem e alguns já viraram atendimento. Cancele e desenhe de novo.",
    };
  }

  return { allowed: true };
}

/* ================================================================ leitura */

export function weekdayLabel(weekday: number): string {
  return [
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
    "Domingo",
  ][weekday - 1] ?? "Dia inválido";
}

/**
 * Quantas horas por semana o mapa prevê.
 *
 * Conta o desenho, e não o que sobrou depois dos conflitos: é o número que a
 * coordenação combinou com a família, e ele não muda porque uma sala estava
 * ocupada.
 */
export function weeklyMinutes(map: HourMap): number {
  return map.slots.reduce((total, slot) => {
    const [startHour, startMinute] = slot.startAt.split(":").map(Number);
    const [endHour, endMinute] = slot.endAt.split(":").map(Number);
    return total + (endHour! * 60 + endMinute!) - (startHour! * 60 + startMinute!);
  }, 0);
}

/* ============================================== vencimento sem sucessor */

/**
 * Regras do vencimento do mapa.
 *
 * `PatientFilters` tem `hour_map_status=expiring`: mapa ativo que termina em
 * sete dias **e não tem nenhum mapa começando depois dele**. É a única consulta
 * do sistema que enxerga interrupção de intervenção antes de ela acontecer — e
 * ela também só existe como parâmetro.
 */
export const hourMapExpiryRules: Rule[] = [
  {
    id: "expiring-map-without-successor-is-a-gap-in-therapy",
    statement:
      "Um mapa que termina em sete dias sem nenhum mapa começando depois significa que a semana do paciente deixa de existir. Não é aviso administrativo: é intervenção que para.",
    rationale:
      "Numa clínica ABA a continuidade é parte do método — programa em aquisição interrompido regride. O sistema sabe detectar isto sete dias antes e não avisa ninguém; a informação vive num filtro que alguém precisa saber digitar.",
    source: "src/rules/hourMap.ts",
  },
  {
    id: "auto-renew-off-is-invisible",
    statement:
      "Um mapa que renova sozinho e um que vence sem sucessor diferem por um campo booleano, e na tela isso é uma etiqueta de presença — quando ela falta, nada aparece no lugar.",
    rationale:
      "Ausência de etiqueta não é sinal: ninguém repara no que não está lá. E a renovação automática é desligada em massa quando um paciente é inativado, então o estado perigoso chega sem ninguém ter escolhido.",
    source: "src/rules/hourMap.ts",
  },
];

export type ExpiryState =
  | "renews"
  | "has-successor"
  | "expiring-without-successor"
  | "far"
  | "over";

/**
 * Implementação de `expiring-map-without-successor-is-a-gap-in-therapy`.
 *
 * A ordem das perguntas é a ordem do risco: renovar sozinho e ter sucessor
 * resolvem o vencimento, então vêm antes de medir os dias.
 */
export function expiryState(
  map: HourMap,
  now: string,
  hasSuccessor = false,
): ExpiryState {
  const fim = new Date(`${map.durationEnd}T12:00:00.000Z`).getTime();
  const hoje = new Date(`${now.slice(0, 10)}T12:00:00.000Z`).getTime();
  const dias = Math.round((fim - hoje) / 86_400_000);

  if (dias < 0) return "over";
  if (map.autoRenew) return "renews";
  if (hasSuccessor) return "has-successor";
  if (dias <= 7) return "expiring-without-successor";
  return "far";
}

export function daysToExpiry(map: HourMap, now: string): number {
  const fim = new Date(`${map.durationEnd}T12:00:00.000Z`).getTime();
  const hoje = new Date(`${now.slice(0, 10)}T12:00:00.000Z`).getTime();
  return Math.round((fim - hoje) / 86_400_000);
}

/**
 * Implementação de `auto-renew-off-is-invisible`.
 *
 * Devolve frase para **todos** os estados que não são "renova sozinho", porque
 * o problema é justamente a ausência de sinal. Só o caso seguro fica calado.
 */
export function expiryMessage(state: ExpiryState, dias: number): string | undefined {
  switch (state) {
    case "renews":
      return undefined;
    case "has-successor":
      return `Este mapa termina em ${dias} ${dias === 1 ? "dia" : "dias"} e já existe outro começando depois. A semana continua.`;
    case "expiring-without-successor":
      // O título já afirma o quê. Aqui vai o porquê e o prazo — repetir a
      // afirmação faria o leitor de tela ouvir a mesma frase duas vezes.
      return `Termina em ${dias} ${dias === 1 ? "dia" : "dias"}, não renova sozinho e não há nenhum mapa começando depois. Programa em aquisição interrompido regride: a continuidade é parte do método, não conforto de agenda.`;
    case "far":
      return `Este mapa não renova sozinho. Faltam ${dias} dias, e alguém precisa desenhar o próximo antes disso.`;
    case "over":
      return `A vigência deste mapa terminou há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}. Não há semana pretendida em vigor.`;
  }
}
