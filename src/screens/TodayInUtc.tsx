import type { ScreenProps } from "@brucesantos/design-space";
import type { TodayData, TodaySurface } from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Card,
  CardHeader,
  Chip,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  ageAsTheSystemComputes,
  ageInFullYears,
  clinicDate,
  datesDisagree,
  daysAgeTurnsEarly,
  minutesPerDayOutOfSync,
  shareUsingTheHelper,
  systemDate,
  windowOpensAt,
} from "../rules/todayInUtc.js";

/**
 * Que dia o sistema acha que é.
 *
 * O ajudante que conhece o fuso da clínica existe e é usado 104 vezes.
 * `Date.utc_today()` é usado 205 vezes fora de worker, em 133 arquivos. Das 21h
 * à meia-noite, essas 205 respostas estão um dia à frente.
 *
 * Três decisões desta tela:
 *
 * 1. **A escala aparece primeiro, e em números.** Cada caso isolado parece
 *    pequeno demais para justificar a correção; é a contagem que muda a
 *    conversa, e ela é o próprio argumento.
 *
 * 2. **As consequências são ditas por superfície, não por arquivo.** “133
 *    arquivos” não diz a ninguém o que vai quebrar. “O seletor de data não
 *    aceita hoje” diz.
 *
 * 3. **O cenário fora da janela existe e é o mais importante.** Ele mostra que
 *    o sistema acerta três quartos do dia — que é exatamente como um defeito
 *    atravessa 133 arquivos sem ninguém reclamar.
 */
export function TodayInUtc({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as superfícies" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const today = data as TodayData | null;
  if (!today) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const divergem = datesDisagree(today.now);
  const doSistema = systemDate(today.now);
  const daClinica = clinicDate(today.now);

  return wrap(
    context,
    <div className="space-y-4">
      {divergem ? (
        <Notice tone="danger" title="Agora o sistema e o calendário discordam">
          <p className="m-0 max-w-[68ch]">
            Na clínica é {formatDate(`${daClinica}T12:00:00.000-03:00`, locale)}. O sistema está
            contando {formatDate(`${doSistema}T12:00:00.000-03:00`, locale)}. Isso vale para as{" "}
            {today.utcCalls} perguntas que ele faz sobre a data de hoje — todas, ao mesmo tempo.
          </p>
          <p className="m-0 mt-2 max-w-[68ch]">
            Acontece todo dia, das {windowOpensAt()}h à meia-noite: {minutesPerDayOutOfSync()}{" "}
            minutos diários, e justamente o fim do expediente.
          </p>
        </Notice>
      ) : (
        <Notice tone="ok" title="Agora as duas datas concordam">
          <p className="m-0 max-w-[68ch]">
            São {formatDate(`${daClinica}T12:00:00.000-03:00`, locale)} nos dois. É assim{" "}
            {24 - (minutesPerDayOutOfSync() / 60)} horas por dia — e é exatamente por isso que a
            forma errada de perguntar a data atravessou {today.filesAffected} arquivos sem ninguém
            reclamar.
          </p>
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title="Como o sistema pergunta a data"
          hint={`${today.utcCalls} vezes ao relógio de fora · ${today.timezoneAwareCalls} vezes ao ajudante`}
        />
        <div className="px-5 py-5">
          <p className="m-0 max-w-[68ch] text-[0.9375rem] text-navy">
            O fuso da clínica está escrito no sistema, num ajudante próprio, e é usado em{" "}
            {shareUsingTheHelper(today)}% das vezes em que a data importa. Nas outras, a pergunta vai
            para um relógio três horas à frente.
          </p>
          <p className="m-0 mt-2 max-w-[68ch] text-[0.875rem] text-[var(--fg-2)]">
            {/* O par que prova que ninguém escolheu: as duas formas convivem
                em linhas seguidas do mesmo componente. */}
            Na conversa com a família, a linha que decide se a data é hoje pergunta ao relógio de
            fora, e a linha logo abaixo formata essa mesma data no fuso da clínica. Ninguém escolheu
            uma coisa nem outra — uma é o que se digita sem pensar, a outra é o que se usa quando o
            assunto é formatar.
          </p>
          <p className="m-0 mt-2 max-w-[68ch] text-[0.875rem] text-[var(--fg-2)]">
            É também o que torna a correção difícil de começar: qualquer conserto isolado deixa{" "}
            {today.utcCalls - 1} pontos iguais atrás.
          </p>
        </div>
      </Card>

      <Card as="section">
        <CardHeader title="O que quebra enquanto a janela dura" hint={`${today.surfaces.length} superfícies`} />
        <div className="px-5 py-5">
          <ul className="m-0 list-none space-y-2 p-0">
            {today.surfaces.map((superficie) => (
              <li key={superficie.id}>
                <SurfaceRow surface={superficie} inWindow={divergem} />
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card as="section">
        <CardHeader title="A idade, que erra também fora da janela" hint="dias divididos por 365" />
        <div className="px-5 py-5">
          <AgeBlock data={today} locale={locale} />
        </div>
      </Card>
    </div>,
  );
}

function SurfaceRow({ surface, inWindow }: { surface: TodaySurface; inWindow: boolean }) {
  return (
    <article className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">{surface.where}</span>
        <span className="text-[0.875rem] text-navy">{surface.what}</span>
        <Chip tone={inWindow ? "danger" : "ok"}>
          {inWindow ? "errando agora" : "certo agora"}
        </Chip>
      </div>
      <p className="m-0 mt-1.5 max-w-[68ch] text-[0.875rem] text-[var(--fg-2)]">
        {surface.breaks}
      </p>
    </article>
  );
}

function AgeBlock({ data, locale }: { data: TodayData; locale: string | undefined }) {
  const doSistema = ageAsTheSystemComputes(data.birthdate, systemDate(data.now));
  const real = ageInFullYears(data.birthdate, clinicDate(data.now));
  const antecipa = daysAgeTurnsEarly(data.birthdate, systemDate(data.now));

  return (
    <>
      <p className="m-0 max-w-[68ch] text-[0.9375rem] text-navy">
        Uma criança nascida em{" "}
        {formatDate(`${data.birthdate}T12:00:00.000-03:00`, locale)} tem{" "}
        <span className="font-semibold">{real} anos</span> completos hoje. O sistema mostra{" "}
        <span className="font-semibold">{doSistema}</span>.
      </p>
      {antecipa > 0 && (
        <p className="m-0 mt-2 max-w-[68ch] text-[0.875rem] text-[var(--fg-2)]">
          Faltam {antecipa} {antecipa === 1 ? "dia" : "dias"} para o aniversário. A conta divide os
          dias vividos por 365, e o ano tem um quarto de dia a mais — o erro acumula cerca de um
          quarto de dia por ano de idade, e vira cedo.
        </p>
      )}
      <p className="m-0 mt-2 max-w-[68ch] text-[0.875rem] text-[var(--fg-2)]">
        Em terapia infantil a idade entra em faixa de protocolo, em critério de instrumento e no que
        a operadora autoriza. Quem for procurar pelas crianças de {real} anos não vai achar esta.
      </p>
    </>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Que dia o sistema acha que é"
      subtitle="O fuso está escrito, e a pergunta vai para outro relógio"
      breadcrumb={[{ label: "Estrutura", path: "/structure" }, { label: "Hoje" }]}
    >
      {children}
    </AppShell>
  );
}
