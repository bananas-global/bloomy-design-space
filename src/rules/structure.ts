import type { Rule } from "@brucesantos/design-space";
import type { Blocking, Room, Service, StructureData } from "../contracts/index.js";

/**
 * Regras da estrutura da unidade.
 *
 * É a camada física que a agenda esbarra: sala do tipo certo, com capacidade,
 * numa unidade e num horário que não estejam bloqueados. Nenhuma dessas
 * restrições aparece na tela de agendamento do Design Space até aqui — e é
 * justamente por isso que elas precisam estar escritas.
 *
 * Como no módulo de Equipe, este cadastro decide coisas em outros lugares:
 * `not_chargeable` do serviço é o mesmo campo que dispensa o check-in no módulo
 * de Atendimento.
 */
export const structureRules: Rule[] = [
  {
    id: "service-decides-which-rooms-serve",
    statement:
      "O serviço declara quais tipos de sala servem para ele. Uma sala de tipo diferente não atende, mesmo estando livre.",
    rationale:
      "Motricidade precisa de espaço e equipamento; sessão coletiva precisa de mesa grande. Agendar numa sala do tipo errado produz um atendimento que não acontece como foi desenhado.",
    source: "src/rules/structure.ts",
  },
  {
    id: "room-capacity-limits-the-session",
    statement:
      "A capacidade da sala limita quantas pessoas cabem no atendimento. Sala inativa não conta, independentemente da capacidade.",
    rationale:
      "Sala em reforma continua no cadastro e não pode receber ninguém. Deixá-la disponível é como se descobre a indisponibilidade com a família na porta.",
    source: "src/rules/structure.ts",
  },
  {
    id: "three-scopes-of-blocking",
    statement:
      "Um horário pode estar bloqueado por três origens diferentes: a unidade inteira, um profissional específico, ou o calendário geral — que é onde ficam os feriados.",
    rationale:
      "As três exigem ações diferentes de quem tenta agendar: procurar outra unidade, procurar outro profissional, ou procurar outro dia. Uma mensagem única de “horário indisponível” não distingue nenhuma delas.",
    source: "src/rules/structure.ts",
  },
  {
    id: "service-without-room-type-is-a-contradiction",
    statement:
      "Um serviço que exige sala e não declara nenhum tipo aceito não pode ser agendado em lugar nenhum.",
    rationale:
      "O cadastro aceita a combinação, e ela produz um serviço impossível de marcar. É o tipo de erro que só aparece quando a recepção tenta usar.",
    source: "src/rules/structure.ts",
  },
  {
    id: "not-chargeable-service-skips-checkin",
    statement:
      "Serviço marcado como não cobrável dispensa o check-in do paciente — e é o cadastro do serviço que decide isso, não a tela de atendimento.",
    rationale:
      "É o mesmo `not_chargeable` que a guarda de início do atendimento consulta. Quem desenha aquela tela procura a configuração lá e não acha.",
    source: "src/rules/structure.ts",
  },
];

/* =============================================================== salas */

/** Implementação de `service-decides-which-rooms-serve`. */
export function roomServes(room: Room, service: Service): boolean {
  if (!service.needsRoom) return true;
  return service.roomTypes.includes(room.roomType);
}

/**
 * Salas que atendem a um serviço, agora.
 *
 * Implementação de `room-capacity-limits-the-session`. Sala inativa é
 * descartada antes de qualquer outra checagem — capacidade de uma sala em
 * reforma não é informação útil.
 */
export function roomsFor(
  data: StructureData,
  service: Service,
  people = 1,
): Room[] {
  return data.rooms.filter(
    (room) => room.active && roomServes(room, service) && room.capacity >= people,
  );
}

type Decision = { allowed: boolean; reason?: string };

/**
 * A sala serve para este atendimento?
 *
 * A negativa nomeia qual das três condições falhou, porque cada uma tem uma
 * saída diferente: sala inativa exige outra sala, tipo errado exige outra sala
 * *de outro tipo*, e capacidade insuficiente pode exigir dividir o grupo.
 */
export function canUseRoom(room: Room, service: Service, people = 1): Decision {
  if (!room.active) {
    return {
      allowed: false,
      reason: `${room.name} está inativa${room.deactivationDate ? ` desde ${br(room.deactivationDate)}` : ""}.`,
    };
  }

  if (!roomServes(room, service)) {
    return {
      allowed: false,
      reason: `${service.name} precisa de sala ${service.roomTypes.map(roomTypeLabel).join(" ou ")}, e ${room.name} é ${roomTypeLabel(room.roomType)}.`,
    };
  }

  if (room.capacity < people) {
    return {
      allowed: false,
      reason: `${room.name} comporta ${room.capacity} ${room.capacity === 1 ? "pessoa" : "pessoas"}, e o atendimento tem ${people}.`,
    };
  }

  return { allowed: true };
}

/** Implementação de `service-without-room-type-is-a-contradiction`. */
export function isImpossibleToSchedule(service: Service): boolean {
  return service.needsRoom && service.roomTypes.length === 0;
}

export function roomTypeLabel(type: Room["roomType"]): string {
  return { individual: "individual", collective: "coletiva", motricity: "de motricidade" }[type];
}

/* =========================================================== bloqueios */

/**
 * Implementação de `three-scopes-of-blocking`.
 *
 * Devolve todos os bloqueios que cobrem o instante, e não só o primeiro: um
 * horário pode estar bloqueado por feriado **e** por férias do profissional, e
 * resolver um não libera o outro.
 */
export function blockingsAt(
  data: StructureData,
  moment: string,
  professionalName?: string,
): Blocking[] {
  return data.blockings.filter((blocking) => {
    if (blocking.start > moment || blocking.end <= moment) return false;
    if (blocking.scope !== "professional") return true;
    return blocking.professionalName === professionalName;
  });
}

/**
 * O que fazer diante de cada origem de bloqueio.
 *
 * É a razão de os três escopos serem valores distintos: "horário indisponível"
 * não diz se a pessoa procura outro dia, outro profissional ou outra unidade.
 */
export function blockingMessage(blocking: Blocking): { title: string; exit: string } {
  if (blocking.isHoliday) {
    return {
      title: blocking.holidayName
        ? `${blocking.holidayName} — a clínica não abre`
        : "Feriado — a clínica não abre",
      exit: "Escolha outro dia.",
    };
  }

  switch (blocking.scope) {
    case "unit":
      return {
        title: blocking.observation ?? "Unidade fechada neste horário",
        exit: "Escolha outro horário ou outra unidade.",
      };
    case "professional":
      return {
        title:
          blocking.observation ??
          `${blocking.professionalName ?? "O profissional"} não atende neste horário`,
        exit: "Escolha outro profissional ou outro horário.",
      };
    case "general":
      return {
        title: blocking.observation ?? "Horário bloqueado no calendário",
        exit: "Escolha outro dia.",
      };
  }
}

export function blockingTypeLabel(type: Blocking["blockingType"]): string {
  return type === "slot" ? "Janela" : "Período";
}

/* ============================================================= serviços */

/**
 * Implementação de `not-chargeable-service-skips-checkin`.
 *
 * Existe para tornar explícito o elo com o módulo de Atendimento: é este
 * booleano que faz a guarda de check-in não se aplicar.
 */
export function skipsCheckin(service: Service): boolean {
  return service.notChargeable;
}

/** O que o cadastro deste serviço decide em outros módulos. */
export function serviceEffects(service: Service, data: StructureData): string[] {
  const effects: string[] = [];

  if (isImpossibleToSchedule(service)) {
    effects.push(
      "Exige sala e não declara nenhum tipo aceito: não pode ser agendado em lugar nenhum. É contradição de cadastro, não falta de sala.",
    );
    return effects;
  }

  if (service.needsRoom) {
    const available = roomsFor(data, service);
    effects.push(
      available.length === 0
        ? `Precisa de sala ${service.roomTypes.map(roomTypeLabel).join(" ou ")}, e nenhuma sala ativa desta unidade atende.`
        : `${available.length} ${available.length === 1 ? "sala atende" : "salas atendem"} a este serviço nesta unidade.`,
    );
  } else {
    effects.push("Não exige sala: pode acontecer em qualquer lugar da unidade, ou fora dela.");
  }

  if (skipsCheckin(service)) {
    effects.push(
      "Não é cobrável, então dispensa o check-in do paciente — a guarda de início do atendimento não se aplica.",
    );
  }

  return effects;
}

function br(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
