import type { PlanSignature as Assinatura, PlanSignatureData } from "../contracts/index.js";
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
  actualDate,
  signedAfterThePlanEnded,
  signedAtNight,
  signingHour,
  stampedOnTheWrongDay,
  storedDate,
} from "../rules/planSignature.js";

/**
 * Assinatura do plano de intervenção comportamental.
 *
 * O plano descreve como a equipe responde ao comportamento da criança. O
 * responsável o aceita pelo portal, de casa, e o sistema carimba a data com
 * `Date.utc_today()`.
 *
 * Três decisões desta tela:
 *
 * 1. **A proporção aparece, não só a contagem.** O achado aqui não é que três
 *    horas erram — é que essas três horas são o horário principal deste
 *    público. Sem a proporção, parece o mesmo defeito das telas internas.
 *
 * 2. **A data assinada e a gravada ficam lado a lado, sempre.** Inclusive nas
 *    corretas: é a coluna igual nas duas que torna a diferença legível.
 *
 * 3. **A contradição interna do documento tem aviso próprio.** “Aceito depois
 *    de terminado” não é um dia de diferença, é um registro que se desmente.
 */
export function PlanSignature({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando os aceites" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const plano = data as PlanSignatureData | null;
  if (!plano) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (plano.signatures.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhum aceite registrado"
        description="Quando o responsável aceita o plano pelo portal, o sistema guarda a assinatura e a data."
      />,
    );
  }

  const erradas = stampedOnTheWrongDay(plano);
  const aNoite = signedAtNight(plano);
  const depoisDoFim = signedAfterThePlanEnded(plano);

  return wrap(
    context,
    <div className="space-y-4">
      {erradas.length > 0 && (
        <Notice
          tone="danger"
          title={`${erradas.length} de ${plano.signatures.length} ${erradas.length === 1 ? "aceite ficou datado" : "aceites ficaram datados"} do dia seguinte`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {erradas.map((a) => (
              <li key={a.id}>
                {a.guardianName} assinou às {signingHour(a)}h de{" "}
                {formatDate(`${actualDate(a)}T12:00:00.000-03:00`, locale)}, e o documento diz{" "}
                {formatDate(`${storedDate(a)}T12:00:00.000-03:00`, locale)}.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2 max-w-[68ch]">
            É a data de um consentimento sobre conduta clínica com uma criança. Um dia de diferença
            não parece erro de sistema — parece que alguém preencheu errado, ou que a assinatura foi
            colhida depois do combinado.
          </p>
        </Notice>
      )}

      {depoisDoFim.length > 0 && (
        <Notice tone="danger" title="Um aceite ficou registrado depois do fim do próprio plano">
          {depoisDoFim.map((a) => (
            <p key={a.id} className="m-0 max-w-[68ch]">
              O plano de {a.patientName} terminou em{" "}
              {formatDate(`${a.planEnd}T12:00:00.000-03:00`, locale)}. {a.guardianName} assinou
              às {signingHour(a)}h desse mesmo dia, e o registro diz{" "}
              {formatDate(`${storedDate(a)}T12:00:00.000-03:00`, locale)} — depois do fim.
            </p>
          ))}
          <p className="m-0 mt-2 max-w-[68ch]">
            Isto não é um dia de diferença, é um documento que se desmente: ele afirma ao mesmo
            tempo que o plano acabou e que foi aceito depois disso. Quem conferir não tem como saber
            qual das duas datas está errada.
          </p>
        </Notice>
      )}

      {aNoite.length > 0 && (
        <Notice tone="warn" title="A janela do defeito é o horário principal deste público">
          <p className="m-0 max-w-[68ch]">
            {aNoite.length} de {plano.signatures.length}{" "}
            {aNoite.length === 1 ? "aceite veio" : "aceites vieram"} depois das 18h. O responsável
            assina de casa, e lê documento de filho depois do trabalho.
          </p>
          <p className="m-0 mt-2 max-w-[68ch]">
            Nas telas internas as mesmas três horas pegam o fim do expediente e pouca gente. Aqui
            elas pegam o horário em que este público existe. O mesmo defeito, a mesma quantidade de
            horas, e proporções completamente diferentes conforme quem está do outro lado.
          </p>
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title="Aceites do responsável"
          hint={`${plano.signatures.length} no total · ${erradas.length} com data trocada`}
        />
        <div className="px-5 py-5">
          <ul className="m-0 list-none space-y-2 p-0">
            {plano.signatures.map((a) => (
              <li key={a.id}>
                <Row signature={a} locale={locale} />
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>,
  );
}

function Row({ signature, locale }: { signature: Assinatura; locale: string | undefined }) {
  const gravada = storedDate(signature);
  const real = actualDate(signature);
  const errada = gravada !== real;

  return (
    <article className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">{signature.guardianName}</span>
        <span className="text-[0.875rem] text-navy">plano de {signature.patientName}</span>
        <span className="text-[0.8125rem] text-[var(--fg-2)]">
          assinou às {signingHour(signature)}h
        </span>
        <Chip tone={errada ? "danger" : "ok"}>
          {errada ? "data trocada" : "data correta"}
        </Chip>
      </div>

      {/* As duas datas sempre, inclusive nas corretas: é a coluna igual nas
          duas que torna a diferença legível nas outras. */}
      <p className="m-0 mt-1.5 text-[0.8125rem] text-[var(--fg-2)]">
        assinou em {formatDate(`${real}T12:00:00.000-03:00`, locale)} · documento diz{" "}
        {formatDate(`${gravada}T12:00:00.000-03:00`, locale)}
      </p>
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Aceite do plano de intervenção"
      subtitle="A família assina à noite, e a data cai no dia seguinte"
      breadcrumb={[{ label: "Responsável legal", path: "/guardian" }, { label: "Aceite do plano" }]}
    >
      {children}
    </AppShell>
  );
}
