import type { AutoCheckinData, CheckinArrival } from "../contracts/index.js";
import type { Rule } from "@brucesantos/design-space";

/**
 * Regras do auto check-in do totem público.
 *
 * O mesmo recurso tem duas implementações de “os pacientes agendados para
 * hoje”, com o mesmo nome, discordando sobre que dia é hoje:
 *
 * ```elixir
 * # lib/bloomy/service_records/checkin.ex:39
 * date = DateTime.now!("America/Sao_Paulo") |> DateTime.to_date()
 *
 * # lib/bloomy_web/public/live/auto_checkin_live/components/select_patient_step.ex:201
 * date = Date.utc_today()
 * ```
 *
 * A tela chama a segunda. E o que a família lê quando a busca não acha nada é:
 *
 * > Nenhum dos seus filhos tem consultas agendadas para hoje.
 */
export const autoCheckinRules: Rule[] = [
  {
    id: "two-functions-with-one-name-disagree-about-today",
    statement:
      "O mesmo recurso tem duas funções chamadas “pacientes agendados”, uma perguntando o dia no fuso da clínica e a outra em UTC. A tela do totem usa a que pergunta em UTC.",
    rationale:
      "É a prova mais curta de que a forma errada não foi escolhida: alguém escreveu a certa, no mesmo fluxo, com o mesmo nome, e a tela pegou a outra. Também é o que torna o defeito invisível numa revisão de código — as duas linhas nunca aparecem juntas, e cada uma isolada parece razoável.",
    source: "src/rules/autoCheckin.ts",
  },
  {
    id: "the-totem-tells-the-family-something-false",
    statement:
      "Quando a busca não acha nada, o totem responde que nenhum dos filhos da família tem consulta agendada para hoje. Das 21h à meia-noite isso é dito a quem está de pé na recepção, com a consulta marcada.",
    rationale:
      "A frase não fala do sistema, fala da família. Não é “não encontramos” nem “tente novamente”: é uma afirmação sobre os filhos dela, e é falsa. Quem lê não tem por que duvidar — foi buscar pelo próprio CPF e recebeu uma resposta específica —, então desiste do check-in ou procura a recepção achando que errou o dia.",
    source: "src/rules/autoCheckin.ts",
  },
  {
    id: "the-window-also-lets-tomorrow-check-in",
    statement:
      "A mesma janela tem o efeito oposto: quem tem atendimento **amanhã** e passa pelo totem depois das 21h consegue fazer check-in hoje. O sistema registra presença num dia em que não houve atendimento.",
    rationale:
      "Encontrei isto escrevendo o teste do limite, não lendo o código — eu estava fixando que a data de amanhã não fosse recusada, e o que apareceu foi que ela é aceita. Recusar quem tem consulta ao menos deixa alguém do lado de fora para reclamar; aceitar quem não tem cria um registro de presença falso que ninguém vai procurar.",
    source: "src/rules/autoCheckin.ts",
  },
  {
    id: "the-public-portal-is-the-last-place-to-fail",
    statement:
      "É a única superfície do sistema operada pela família, sem ninguém do lado para explicar. O mesmo defeito que numa tela interna vira uma pergunta ao colega, aqui vira uma pessoa parada no totem.",
    rationale:
      "Vale registrar porque muda a prioridade entre as 205 ocorrências. Elas não são equivalentes: as internas têm quem contorne e quem reclame; esta tem uma família chegando com uma criança, e nenhuma das duas coisas.",
    source: "src/rules/autoCheckin.ts",
  },
];

const OFFSET_HORAS = 3;

/** O dia que a tela do totem procura. */
export function dateTheScreenQueries(arrival: CheckinArrival): string {
  const d = new Date(`${arrival.arrivedAt.slice(0, 19)}Z`);
  d.setUTCHours(d.getUTCHours() + OFFSET_HORAS);
  return d.toISOString().slice(0, 10);
}

/** O dia que a outra função, a correta, devolveria. */
export function dateTheOtherFunctionQueries(arrival: CheckinArrival): string {
  return arrival.arrivedAt.slice(0, 10);
}

/** As duas implementações discordam neste instante. */
export function implementationsDisagree(arrival: CheckinArrival): boolean {
  return dateTheScreenQueries(arrival) !== dateTheOtherFunctionQueries(arrival);
}

/** O totem encontra o atendimento. */
export function found(arrival: CheckinArrival): boolean {
  return arrival.scheduleDate === dateTheScreenQueries(arrival);
}

/** A função correta encontraria. */
export function wouldBeFoundByTheOtherFunction(arrival: CheckinArrival): boolean {
  return arrival.scheduleDate === dateTheOtherFunctionQueries(arrival);
}

/**
 * Implementação de `the-totem-tells-the-family-something-false`.
 *
 * A família está na recepção, com consulta hoje, e o totem diz que não há.
 */
export function turnedAwayWrongly(data: AutoCheckinData): CheckinArrival[] {
  return data.arrivals.filter(
    (arrival) => !found(arrival) && wouldBeFoundByTheOtherFunction(arrival),
  );
}

/** Quem o totem atende sem problema. */
export function checkedIn(data: AutoCheckinData): CheckinArrival[] {
  return data.arrivals.filter(found);
}

/** Recusa correta: a consulta é mesmo de outro dia. */
export function turnedAwayCorrectly(data: AutoCheckinData): CheckinArrival[] {
  return data.arrivals.filter(
    (arrival) => !found(arrival) && !wouldBeFoundByTheOtherFunction(arrival),
  );
}

/** A hora local da chegada, para nomear a janela. */
export function arrivalHour(arrival: CheckinArrival): number {
  return Number(arrival.arrivedAt.slice(11, 13));
}

/** O que o totem responde hoje, palavra por palavra. */
export const TOTEM_MESSAGE = "Nenhum dos seus filhos tem consultas agendadas para hoje.";

/**
 * Implementação de `the-window-also-lets-tomorrow-check-in`.
 *
 * O lado oposto da janela: liberado pelo totem, e sem atendimento hoje.
 */
export function checkedInOnTheWrongDay(data: AutoCheckinData): CheckinArrival[] {
  return data.arrivals.filter(
    (arrival) => found(arrival) && !wouldBeFoundByTheOtherFunction(arrival),
  );
}
