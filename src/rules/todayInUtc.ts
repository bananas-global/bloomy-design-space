import type { Rule } from "@brucesantos/design-space";
import type { TodayData, TodaySurface } from "../contracts/index.js";

/**
 * Regras de “que dia o sistema acha que é”.
 *
 * O ajudante certo existe e está escrito no próprio sistema:
 *
 * ```elixir
 * def local_timezone(), do: "America/Sao_Paulo"
 * ```
 *
 * Ele é usado 104 vezes. `Date.utc_today()` é usado 205 vezes fora de worker,
 * em 133 arquivos. Nos workers a escolha está certa — o cron do Oban roda no
 * fuso da clínica, e isso eu já tinha verificado. Fora deles, não.
 *
 * O par mais eloquente está no chat:
 *
 * ```elixir
 * if(@date == Date.utc_today(), do: "bg-brand-blue ...", else: "...")
 * <%= Bloomy.CalendarHelper.strftime(@date, "%A, %d de %B") %>
 * ```
 *
 * Uma linha pergunta a UTC se é hoje; a seguinte formata a data no fuso certo.
 */
export const todayInUtcRules: Rule[] = [
  {
    id: "the-system-asks-utc-what-day-it-is",
    statement:
      "O sistema sabe o próprio fuso e o registra num ajudante, usado 104 vezes. Para perguntar que dia é hoje, ele consulta UTC 205 vezes, em 133 arquivos. Das 21h à meia-noite, essas 205 respostas estão um dia à frente.",
    rationale:
      "Não é um defeito num lugar: é o jeito padrão de perguntar a data neste sistema. Por isso não adianta corrigir caso a caso — cada correção isolada deixa 204 —, e por isso também nenhum caso isolado parece grave o bastante para justificar a correção. É a forma mais difícil de defeito: distribuída, pequena em cada ponto, e certa três quartos do dia.",
    source: "src/rules/todayInUtc.ts",
  },
  {
    id: "the-right-helper-sits-on-the-next-line",
    statement:
      "Na conversa com a família, a linha que decide se a data é hoje pergunta a UTC, e a linha seguinte formata essa mesma data no fuso da clínica. As duas maneiras convivem no mesmo componente, uma embaixo da outra.",
    rationale:
      "É a prova de que ninguém escolheu UTC: `Date.utc_today()` é o que se digita sem pensar, e o ajudante é o que se usa quando o assunto é formatar. A correção não precisa de decisão nova, precisa de alcance — e o exemplo cabe numa captura de tela, o que ajuda a convencer.",
    source: "src/rules/todayInUtc.ts",
  },
  {
    id: "the-form-refuses-to-let-you-pick-today",
    statement:
      "O campo de data de encerramento do mapa de horas tem hoje como valor mínimo, medido em UTC. Depois das 21h, o calendário do próprio formulário deixa de aceitar o dia de hoje.",
    rationale:
      "É o caso mais direto de todos porque não há mensagem para interpretar: a data simplesmente não é selecionável. Quem tenta encerrar um mapa de horas às 21h30 encontra o dia de hoje apagado no seletor, e a única leitura possível é que o sistema quebrou.",
    source: "src/rules/todayInUtc.ts",
  },
  {
    id: "age-is-days-divided-by-365",
    statement:
      "A idade do paciente é calculada dividindo os dias vividos por 365, em oito telas. O ano tem 365,2425 dias, então a idade vira cedo — cerca de um quarto de dia por ano de idade acumulado.",
    rationale:
      "É pequeno e é clínico: em terapia infantil a idade entra em faixa de protocolo, em critério de instrumento e no que a operadora autoriza. Uma criança de doze anos aparece com treze três dias antes do aniversário — e some do recorte de quem tinha doze. Somado ao fuso, o dia de virada antecipa mais um pouco.",
    source: "src/rules/todayInUtc.ts",
  },
];

const OFFSET_HORAS = 3;

/** A data que o sistema calcula a partir de um instante local. */
export function systemDate(now: string): string {
  const d = new Date(`${now.slice(0, 19)}Z`);
  d.setUTCHours(d.getUTCHours() + OFFSET_HORAS);
  return d.toISOString().slice(0, 10);
}

export function clinicDate(now: string): string {
  return now.slice(0, 10);
}

/**
 * Implementação de `the-system-asks-utc-what-day-it-is`.
 *
 * A janela em que as duas datas divergem.
 */
export function datesDisagree(now: string): boolean {
  return systemDate(now) !== clinicDate(now);
}

/** A hora local em que a divergência começa, todo dia. */
export function windowOpensAt(): number {
  return 24 - OFFSET_HORAS;
}

/** Quantos minutos por dia o sistema passa discordando do calendário. */
export function minutesPerDayOutOfSync(): number {
  return OFFSET_HORAS * 60;
}

/** Quantas das chamadas ficam erradas na janela — todas elas. */
export function callsWrongInsideTheWindow(data: TodayData): number {
  return data.utcCalls;
}

/** A proporção entre o jeito certo e o jeito usado. */
export function shareUsingTheHelper(data: TodayData): number {
  const total = data.utcCalls + data.timezoneAwareCalls;
  return total === 0 ? 0 : Math.round((data.timezoneAwareCalls / total) * 100);
}

function daysBetween(from: string, to: string): number {
  const dia = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  return Math.round((dia(to) - dia(from)) / 86_400_000);
}

/**
 * Implementação de `age-is-days-divided-by-365`.
 *
 * `floor(Date.diff(hoje, nascimento) / 365)`, exatamente como está escrito.
 */
export function ageAsTheSystemComputes(birthdate: string, today: string): number {
  return Math.floor(daysBetween(birthdate, today) / 365);
}

/** A idade em anos completos de verdade. */
export function ageInFullYears(birthdate: string, today: string): number {
  const [ano, mes, dia] = birthdate.split("-").map(Number) as [number, number, number];
  const [anoHoje, mesHoje, diaHoje] = today.split("-").map(Number) as [number, number, number];
  let idade = anoHoje - ano;
  if (mesHoje < mes || (mesHoje === mes && diaHoje < dia)) idade -= 1;
  return idade;
}

export function ageIsWrong(birthdate: string, today: string): boolean {
  return ageAsTheSystemComputes(birthdate, today) !== ageInFullYears(birthdate, today);
}

/**
 * Quantos dias antes do aniversário a idade já virou.
 *
 * Zero quando a conta acerta no dia.
 */
export function daysAgeTurnsEarly(birthdate: string, today: string): number {
  if (!ageIsWrong(birthdate, today)) return 0;
  let dias = 0;
  let cursor = today;
  while (ageIsWrong(birthdate, cursor) && dias < 400) {
    dias += 1;
    const d = new Date(`${cursor}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return dias;
}

export function surfacesOfKind(data: TodayData, kind: TodaySurface["kind"]): TodaySurface[] {
  return data.surfaces.filter((surface) => surface.kind === kind);
}
