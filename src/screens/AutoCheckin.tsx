import type { AutoCheckinData, CheckinArrival } from "../contracts/index.js";
import type { ScreenProps } from "@brucesantos/design-space";
import { formatDate } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  TOTEM_MESSAGE,
  arrivalHour,
  checkedIn,
  checkedInOnTheWrongDay,
  dateTheOtherFunctionQueries,
  dateTheScreenQueries,
  found,
  implementationsDisagree,
  turnedAwayCorrectly,
  turnedAwayWrongly,
} from "../rules/autoCheckin.js";

/**
 * Auto check-in do totem público.
 *
 * Duas funções com o mesmo nome, no mesmo fluxo, perguntam que dia é hoje de
 * maneiras diferentes. A tela usa a que pergunta em UTC.
 *
 * Três decisões desta tela:
 *
 * 1. **A frase do totem aparece literal, entre aspas.** É uma afirmação sobre
 *    os filhos da família, e é falsa. Parafraseá-la esconderia justamente o que
 *    há de errado nela.
 *
 * 2. **As duas datas consultadas aparecem lado a lado.** É o que transforma
 *    “problema de fuso” em duas linhas de código que dá para comparar.
 *
 * 3. **A recusa correta fica na mesma lista.** Sem ela, a tela pareceria dizer
 *    que o totem nunca deveria recusar ninguém.
 */
export function AutoCheckin({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as chegadas" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const checkin = data as AutoCheckinData | null;
  if (!checkin) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (checkin.arrivals.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhuma chegada registrada"
        description="Quando uma família chega ao totem e digita o CPF, o sistema procura as consultas do dia."
      />,
    );
  }

  const recusadasATôa = turnedAwayWrongly(checkin);
  const atendidas = checkedIn(checkin);
  const recusadasCerto = turnedAwayCorrectly(checkin);
  const liberadasErrado = checkedInOnTheWrongDay(checkin);

  return wrap(
    context,
    <div className="space-y-4">
      {recusadasATôa.length > 0 && (
        <Notice
          tone="danger"
          title={`${recusadasATôa.length} ${recusadasATôa.length === 1 ? "família está de pé na recepção" : "famílias estão de pé na recepção"} ouvindo que não tem consulta`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {recusadasATôa.map((chegada) => (
              <li key={chegada.id}>
                {chegada.guardianName} chegou às {arrivalHour(chegada)}h com{" "}
                {chegada.patientName}, que tem atendimento hoje às {chegada.scheduleTime}.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2 max-w-[68ch]">
            {/* Literal, entre aspas: a frase é uma afirmação sobre os filhos da
                família, e parafraseá-la esconderia o que há de errado nela. */}
            O que o totem responde é: <span className="font-semibold">“{TOTEM_MESSAGE}”</span>
          </p>
          <p className="m-0 mt-2 max-w-[68ch]">
            A frase não fala do sistema, fala da família. Não é “não encontramos” nem “tente de
            novo”: quem leu foi buscar pelo próprio documento e recebeu uma resposta específica
            sobre os próprios filhos. Não tem por que duvidar dela.
          </p>
        </Notice>
      )}

      {liberadasErrado.length > 0 && (
        <Notice
          tone="warn"
          title={`${liberadasErrado.length} ${liberadasErrado.length === 1 ? "check-in foi liberado" : "check-ins foram liberados"} num dia sem atendimento`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {liberadasErrado.map((chegada) => (
              <li key={chegada.id}>
                {chegada.guardianName} passou às {arrivalHour(chegada)}h com{" "}
                {chegada.patientName}, cujo atendimento é amanhã.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2 max-w-[68ch]">
            A mesma janela tem o efeito contrário: como a busca já procura o dia seguinte, quem tem
            atendimento amanhã é encontrado hoje. Fica registrada presença num dia em que não houve
            atendimento — e este ninguém vai procurar, porque não há quem reclame.
          </p>
        </Notice>
      )}

      <Card as="section">
        <CardHeader title="Duas funções com o mesmo nome" hint="e só uma pergunta a data certa" />
        <div className="px-5 py-5">
          <p className="m-0 max-w-[68ch] text-[0.9375rem] text-navy">
            O mesmo recurso tem duas buscas de “pacientes agendados para hoje”. Uma pergunta o dia no
            fuso da clínica; a outra, num relógio três horas à frente. A tela do totem usa a segunda.
          </p>
          {checkin.arrivals.some(implementationsDisagree) && (
            <p className="m-0 mt-2 max-w-[68ch] text-[0.875rem] text-[var(--fg-2)]">
              Agora as duas discordam: a tela procura em{" "}
              {formatDate(
                `${dateTheScreenQueries(checkin.arrivals.find(implementationsDisagree)!)}T12:00:00.000-03:00`,
                locale,
              )}
              , e a outra procuraria em{" "}
              {formatDate(
                `${dateTheOtherFunctionQueries(checkin.arrivals.find(implementationsDisagree)!)}T12:00:00.000-03:00`,
                locale,
              )}
              .
            </p>
          )}
          <p className="m-0 mt-2 max-w-[68ch] text-[0.875rem] text-[var(--fg-2)]">
            É a prova mais curta de que a forma errada não foi escolhida: alguém escreveu a certa, no
            mesmo fluxo, com o mesmo nome. As duas linhas nunca aparecem juntas numa revisão, e cada
            uma isolada parece razoável.
          </p>
          <p className="m-0 mt-2 max-w-[68ch] text-[0.875rem] text-[var(--fg-2)]">
            E este é o totem: a única superfície operada pela família, sem ninguém do lado para
            explicar. Numa tela interna o mesmo defeito vira uma pergunta ao colega; aqui vira uma
            pessoa parada, com uma criança.
          </p>
        </div>
      </Card>

      <Card as="section">
        <CardHeader
          title="Chegadas"
          hint={`${atendidas.length} liberadas · ${recusadasATôa.length + recusadasCerto.length} recusadas`}
        />
        <div className="px-5 py-5">
          <ul className="m-0 list-none space-y-2 p-0">
            {checkin.arrivals.map((chegada) => (
              <li key={chegada.id}>
                <Row arrival={chegada} locale={locale} />
              </li>
            ))}
          </ul>
          {recusadasCerto.length > 0 && (
            <p className="m-0 mt-3 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
              {/* Sem isto, a tela pareceria pedir que o totem nunca recuse. */}
              {recusadasCerto.length === 1 ? "Uma recusa está certa" : `${recusadasCerto.length} recusas estão certas`}
              : o atendimento é mesmo de outro dia. O totem precisa recusar nesse caso — o problema
              não é recusar, é recusar quem tem consulta.
            </p>
          )}
        </div>
      </Card>
    </div>,
  );
}

function Row({ arrival, locale }: { arrival: CheckinArrival; locale: string | undefined }) {
  const liberada = found(arrival);
  const outraAcharia = arrival.scheduleDate === dateTheOtherFunctionQueries(arrival);
  const erroDeFuso = !liberada && outraAcharia;

  return (
    <article className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">{arrival.guardianName}</span>
        <span className="text-[0.875rem] text-navy">com {arrival.patientName}</span>
        <span className="text-[0.8125rem] text-[var(--fg-2)]">
          chegou às {arrivalHour(arrival)}h
        </span>
        <span className="text-[0.8125rem] text-[var(--fg-2)]">
          atendimento em {formatDate(`${arrival.scheduleDate}T12:00:00.000-03:00`, locale)} às{" "}
          {arrival.scheduleTime}
        </span>
        <Chip tone={liberada ? "ok" : erroDeFuso ? "danger" : "neutral"}>
          {liberada ? "check-in liberado" : erroDeFuso ? "recusada por engano" : "recusada, e é de outro dia"}
        </Chip>
      </div>

      {erroDeFuso && (
        <p className="m-0 mt-1.5 max-w-[68ch] text-[0.875rem] text-navy">
          A tela procurou os atendimentos de{" "}
          {formatDate(`${dateTheScreenQueries(arrival)}T12:00:00.000-03:00`, locale)} e este é de{" "}
          {formatDate(`${arrival.scheduleDate}T12:00:00.000-03:00`, locale)}.
        </p>
      )}
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Auto check-in no totem"
      subtitle="Duas funções com o mesmo nome, e a tela usa a errada"
      breadcrumb={[{ label: "Público", path: "/public" }, { label: "Auto check-in" }]}
    >
      {children}
    </AppShell>
  );
}
