import type { ScreenProps } from "@brucesantos/design-space";
import type { UnitMapAxis, UnitMapData, UnitMapRow } from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  askedQuestion,
  axisLabel,
  canManageMap,
  canSeeMap,
  dayState,
  dayStateLabel,
  granularityLocked,
  granularityOf,
  hourLostToRounding,
  hoursWithMoreThanOne,
  itemsInLostHour,
  occupancy,
  rowsWithoutAgenda,
  visibleHours,
  weekOccupancy,
} from "../rules/unitMap.js";

const AXES: UnitMapAxis[] = ["patient", "professional", "room", "unit"];

/**
 * Mapa da unidade.
 *
 * A única tela do produto em que a pergunta não é sobre um caso, e sim sobre
 * capacidade: onde cabe mais alguém. Quatro eixos — paciente, profissional,
 * sala e unidade — e a mesma semana em cada um.
 *
 * O que a torna difícil é que ela tem **três maneiras de mostrar zero**, e elas
 * pedem ações opostas. Três decisões seguem daí:
 *
 * 1. **Sem agenda definida não é 0% de ocupação.** No sistema real,
 *    `calculate_occupancy(_, [])` devolve 0, e quem não tem agenda padrão fica
 *    idêntico a quem tem o dia todo livre. Uma pede agendamento, a outra pede
 *    cadastro — e a segunda nunca acontece se as duas forem o mesmo número.
 *
 * 2. **A faixa que o mapa perde é dita, com o que existe nela.** As horas vão
 *    até `fechamento − 1`: numa unidade que fecha às 18h30, o que acontece às
 *    18h some da única tela que serve para ver ocupação.
 *
 * 3. **A granularidade travada é explicada, não apagada.** Dois botões
 *    desabilitados sem motivo ensinam que a tela está quebrada. A frase ensina
 *    que a pergunta não faz sentido naquele eixo.
 */
export function UnitMap({ context }: ScreenProps) {
  const { data, isLoading, error, locale, permissions, persona } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando o mapa da unidade" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const map = data as UnitMapData | null;
  if (!map) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const access = canSeeMap(persona?.id ?? "");
  if (!access.allowed) {
    return wrap(
      context,
      <EmptyState title="Você não alcança o mapa da unidade" description={access.reason!} />,
    );
  }

  const manage = canManageMap(permissions);
  const hours = visibleHours(map.unit);
  const lostHour = hourLostToRounding(map.unit);
  const lostItems = itemsInLostHour(map);
  const semAgenda = rowsWithoutAgenda(map);
  const locked = granularityLocked(map.axis);

  return wrap(
    context,
    <div className="space-y-4">
      {/* ---------------------------------------------------------- eixos */}
      <Card as="section">
        <CardHeader title={axisLabel(map.axis)} hint={askedQuestion(map.axis)} />
        <div className="space-y-3 px-5 py-5">
          <p className="m-0 text-[14px] text-navy">
            Semana de {formatDate(`${map.week.start}T12:00:00.000-03:00`, locale)} a{" "}
            {formatDate(`${map.week.end}T12:00:00.000-03:00`, locale)} ·{" "}
            {map.unit.name}, das {map.unit.opensAt} às {map.unit.closesAt}
          </p>

          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {AXES.map((axis) => (
              <li key={axis}>
                {/* Os chips listam os eixos que existem; eles não são
                    controles. Marcar o atual em palavra evita que a cor
                    sozinha tenha de carregar a distinção. */}
                <Chip tone={axis === map.axis ? "info" : "neutral"}>
                  {axisLabel(axis)}
                  {axis === map.axis && " · em uso"}
                </Chip>
              </li>
            ))}
          </ul>

          {/* A restrição é correta; o que faltava era o motivo. */}
          {locked && (
            <Notice tone="info" title="Neste eixo não se escolhe entre semana e dia" level={3}>
              {locked}
            </Notice>
          )}

          {granularityOf(map.axis) === "both" && (
            <p className="m-0 text-[13px] text-[var(--fg-2)]">
              Este eixo aceita as duas granularidades. Você está vendo a{" "}
              {map.granularity === "week" ? "semana" : "visão de um dia"}.
            </p>
          )}

          <Button
            id="editar-mapa"
            unavailableReason={manage.allowed ? undefined : manage.reason}
          >
            Mexer no mapa
          </Button>
        </div>
      </Card>

      {/* ------------------------------------------------ a faixa perdida */}
      {lostHour !== undefined && (
        <Notice
          tone={lostItems.length > 0 ? "danger" : "warn"}
          title={`O mapa vai até as ${String(hours[hours.length - 1] ?? 0).padStart(2, "0")}h e a unidade fecha às ${map.unit.closesAt}`}
        >
          <p className="m-0">
            As horas do mapa vão da abertura até a hora do fechamento menos um. A faixa das{" "}
            {String(lostHour).padStart(2, "0")}h não aparece em lugar nenhum desta tela.
          </p>
          {lostItems.length > 0 && (
            <p className="m-0 mt-2">
              <span className="font-semibold">
                {lostItems.length}{" "}
                {lostItems.length === 1 ? "atendimento existe" : "atendimentos existem"} nessa faixa
                nesta semana:
              </span>{" "}
              {lostItems.map((entry) => entry.patientName).join(", ")}. Eles ocupam sala e
              profissional, e somem da única tela que serve para ver ocupação — justamente na faixa
              mais disputada do dia.
            </p>
          )}
        </Notice>
      )}

      {/* ---------------------------------------- quem precisa de cadastro */}
      {semAgenda.length > 0 && (
        <Notice
          tone="warn"
          title={`${semAgenda.length === 1 ? "Uma linha não tem" : `${semAgenda.length} linhas não têm`} agenda padrão definida`}
        >
          <p className="m-0">
            {semAgenda.map((row) => row.name).join(", ")} — nenhuma hora definida em nenhum dia da
            semana. No sistema real isso aparece como 0% de ocupação, idêntico a quem tem a semana
            inteira livre.
          </p>
          <p className="m-0 mt-2">
            São pedidos opostos: um é “marque alguém”, o outro é “defina a agenda padrão”. Definir
            agenda padrão é do <span className="font-semibold">People</span>, que não alcança esta
            tela — por isso o destinatário está escrito aqui.
          </p>
        </Notice>
      )}

      {/* ----------------------------------------------------------- grade */}
      {map.rows.length === 0 ? (
        <EmptyState
          title="Nada nesta semana"
          description="Nenhuma linha deste eixo tem agenda ou atendimento na semana escolhida. Trocar de semana ou de eixo costuma ser o próximo passo."
        />
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {map.rows.map((row) => (
            <li key={row.id}>
              <RowCard row={row} hours={hours} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </div>,
  );
}

function RowCard({
  row,
  hours,
  locale,
}: {
  row: UnitMapRow;
  hours: number[];
  locale: string | undefined;
}) {
  const week = weekOccupancy(row);

  return (
    <Card as="article">
      <CardHeader
        title={row.name}
        hint={
          week === undefined
            ? "Sem agenda padrão — ocupação não se calcula"
            : `${week}% das horas definidas estão ocupadas`
        }
      />
      <div className="space-y-3 px-5 py-5">
        {row.subtitle && (
          <p className="m-0 text-[13px] text-[var(--fg-2)]">{row.subtitle}</p>
        )}

        {/* A grade rola dentro de si, e nunca a página. */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <caption className="sr-only">
              Ocupação de {row.name} por dia e hora, de{" "}
              {formatDate(`${row.days[0]?.date}T12:00:00.000-03:00`, locale)} em diante
            </caption>
            <thead>
              <tr>
                <th scope="col" className="px-2 py-1.5 text-left font-semibold text-navy">
                  Dia
                </th>
                {hours.map((hour) => (
                  <th
                    key={hour}
                    scope="col"
                    className="px-2 py-1.5 text-center font-semibold text-navy"
                  >
                    {String(hour).padStart(2, "0")}h
                  </th>
                ))}
                <th scope="col" className="px-2 py-1.5 text-left font-semibold text-navy">
                  Situação
                </th>
              </tr>
            </thead>
            <tbody>
              {row.days.map((day) => {
                const state = dayState(day);
                const rate = occupancy(day);
                const crowded = hoursWithMoreThanOne(day);

                return (
                  <tr key={day.date} className="border-t border-[var(--border-soft)]">
                    <th scope="row" className="px-2 py-1.5 text-left font-semibold text-navy">
                      {day.weekdayName}
                    </th>
                    {hours.map((hour) => {
                      const items = day.itemsByHour[hour] ?? [];
                      const defined = day.availableHours.includes(hour);
                      return (
                        <td
                          key={hour}
                          className={`px-2 py-1.5 text-center ${!defined ? "bg-ink-50" : ""}`}
                        >
                          {/* Três estados, três textos. A cor sozinha não os
                              distingue para quem não a enxerga.

                              "Sem agenda padrão" é o estado que este módulo
                              inteiro existe para separar de "livre" — usar o
                              ponto médio, o glifo mais apagado disponível,
                              invertia a ênfase. Travessão mais banda de fundo:
                              a faixa sem agenda vira um bloco legível de longe,
                              que é como ela de fato acontece (o dia todo). */}
                          {!defined ? (
                            <span className="text-[var(--fg-2)]" aria-label="fora da agenda padrão">
                              —
                            </span>
                          ) : items.length === 0 ? (
                            <span className="text-[var(--fg-2)]" aria-label="hora livre">
                              livre
                            </span>
                          ) : (
                            <span className="font-semibold text-navy">
                              {items.length > 1 ? `${items.length}×` : "1"}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-navy">
                      {dayStateLabel(state)}
                      {rate !== undefined && state !== "no-agenda" && <> · {rate}%</>}
                      {crowded.length > 0 && (
                        <>
                          {" "}
                          <span className="text-[var(--fg-2)]">
                            (
                            {crowded
                              .map((hour) => `${String(hour).padStart(2, "0")}h`)
                              .join(", ")}{" "}
                            com mais de um)
                          </span>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* O que a ocupação mede, dito onde ela é lida. */}
        <p className="m-0 max-w-[72ch] text-[13px] text-[var(--fg-2)]">
          A ocupação conta <span className="font-semibold">horas com pelo menos um atendimento</span>,
          e não atendimentos. Uma hora com três em três salas conta igual a uma hora com um — serve
          para saber onde cabe mais alguém, e não para medir aproveitamento de capacidade.
        </p>
      </div>
    </Card>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Mapa da unidade"
      subtitle="Onde cabe mais alguém"
      breadcrumb={[{ label: "Mapa da unidade" }]}
    >
      {children}
    </AppShell>
  );
}
