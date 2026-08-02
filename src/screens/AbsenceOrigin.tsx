import type { ScreenProps } from "@brucesantos/design-space";
import type { AbsenceOriginData, AbsenceRecord } from "../contracts/index.js";
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
  absenceOriginLabel,
  absencesByOrigin,
  shareThatIsReallyAbsence,
  wasObserved,
  whatTheOriginMeasures,
} from "../rules/agenda.js";

/**
 * De onde vêm as ausências.
 *
 * O número de "ausências" do sistema contém três coisas, e só uma é ausência:
 *
 * - alguém **registrou** que o paciente não apareceu;
 * - a família **avisou antes** — e o filtro `absence` soma cancelamentos;
 * - um worker **converteu** um agendamento que ficou sete dias parado em
 *   atraso, com motivo `:delay`. **Ninguém viu nada.**
 *
 * A terceira é a menos parecida com ausência de todas: ela mede desorganização
 * interna, não comportamento da família. E é esse número somado que embasa a
 * conversa com quem trouxe a criança.
 *
 * Duas decisões:
 *
 * 1. **A tela abre pela proporção, não pelo total.** Doze ausências não dizem
 *    nada; quatro de doze dizem tudo.
 *
 * 2. **Cada origem diz o que mede.** Nomear a origem sem dizer o que ela mede
 *    deixaria a separação parecendo preciosismo de vocabulário.
 */
export function AbsenceOriginScreen({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Separando as ausências" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const absences = data as AbsenceOriginData | null;
  if (!absences) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (absences.records.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhuma ausência na competência"
        description="Nem falta registrada, nem cancelamento, nem conversão automática por atraso."
      />,
    );
  }

  const porOrigem = absencesByOrigin(absences);
  const proporcao = shareThatIsReallyAbsence(absences);
  const fabricadas = absences.records.filter(
    (record) => record.origin === "fabricated_by_delay",
  );
  const misturado = porOrigem.length > 1;

  return wrap(
    context,
    <div className="space-y-4">
      {misturado && (
        <Notice
          tone="warn"
          title={`O sistema conta ${absences.records.length} ausências. ${proporcao}% mede comportamento da família.`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {porOrigem.map((linha) => (
              <li key={linha.origin}>
                <span className="font-semibold">
                  {linha.count} {absenceOriginLabel(linha.origin).toLowerCase()}
                </span>{" "}
                — mede {whatTheOriginMeasures(linha.origin)}.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2">
            Três origens, uma conta. É esse número somado que embasa a conversa com quem trouxe a
            criança.
          </p>
        </Notice>
      )}

      {fabricadas.length > 0 && (
        <Notice tone="danger" title="Ausências que ninguém observou">
          <ul className="m-0 list-disc space-y-1 pl-5">
            {fabricadas.map((record) => (
              <li key={record.id}>
                {record.patientName}, {formatDate(`${record.date}T12:00:00.000-03:00`, locale)} —
                convertida depois de {record.daysStalled} dias parada em atraso.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2">
            Um worker transforma em ausência todo agendamento que fica sete dias em atraso. A
            criança pode ter vindo e o registro simplesmente não ter sido fechado — e a partir da
            conversão não há como distinguir uma coisa da outra sem abrir o histórico.
          </p>
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title={`Competência ${absences.month}`}
          hint={`${absences.records.length} registros`}
        />
        <div className="px-5 py-5">
          <ul className="m-0 list-none space-y-2 p-0">
            {absences.records.map((record) => (
              <li key={record.id}>
                <Row record={record} locale={locale} />
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>,
  );
}

function Row({ record, locale }: { record: AbsenceRecord; locale: string | undefined }) {
  const observada = wasObserved(record);

  return (
    <article className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-field border border-[var(--border-soft)] px-4 py-2.5">
      <span className="text-[0.9375rem] font-semibold text-navy">{record.patientName}</span>
      <span className="text-[0.8125rem] text-[var(--fg-2)]">
        {formatDate(`${record.date}T12:00:00.000-03:00`, locale)} · {record.professionalName}
      </span>
      {/* A origem em texto: sem ela, as três viram a mesma linha. */}
      <Chip
        tone={
          observada ? "warn" : record.origin === "fabricated_by_delay" ? "danger" : "neutral"
        }
      >
        {absenceOriginLabel(record.origin)}
      </Chip>
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="De onde vêm as ausências"
      subtitle="Três origens, uma conta — e só uma é ausência"
      breadcrumb={[{ label: "Agenda", path: "/agenda" }, { label: "Ausências" }]}
    >
      {children}
    </AppShell>
  );
}
