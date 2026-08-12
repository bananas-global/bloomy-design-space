import type { ScreenProps } from "@brucesantos/design-space";
import type { NpsData } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Button, Card, ErrorState, LoadingState, Notice } from "../components/primitives.js";
import { canSubmitNps } from "../rules/publicPortal.js";

/**
 * Pesquisa de satisfação.
 *
 * A segunda superfície pública, aberta por um link com código de cinco
 * caracteres. Duas decisões que valem estar escritas:
 *
 * 1. **A faixa do NPS não aparece para quem responde.** Dizer "você é um
 *    detrator" a alguém que acabou de dar nota 4 é hostil, e a classificação
 *    serve à leitura interna, não à conversa com a família.
 *
 * 2. **A escala é um grupo de rádio, não onze botões soltos.** É o que permite
 *    percorrer as notas com as setas e entender que são uma escolha só. Cada
 *    nota tem rótulo acessível com o extremo que representa.
 */
export function Nps({ context }: ScreenProps) {
  const { data, isLoading, error } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a pesquisa" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const nps = data as NpsData | null;
  if (!nps) return wrap(context, <ErrorState message="Não foi possível abrir a pesquisa." />);

  const { response } = nps;
  const answered = response.rating !== undefined;
  // Pergunta do formulário, não do registro: aqui a nota é sempre obrigatória.
  const submission = canSubmitNps(response);

  return wrap(
    context,
    <div className="mx-auto max-w-3xl space-y-6 p-5">
      <h1 className="m-0 text-3xl font-bold text-navy">Avaliação NPS</h1>
      <h2 className="m-0 text-xl font-bold text-navy">Net Promoter Score</h2>
      <p className="m-0 text-[var(--color-brand-purple-dark)]">
        Por favor, responda à pergunta abaixo para avaliar o quanto você recomendaria nosso produto/serviço.
      </p>
      {answered ? (
        <Card className="px-5 py-5">
          <div role="status">
            <h2 className="m-0 text-[1.5rem] font-bold text-navy">Obrigado pela resposta</h2>
            {/* Mesmo agradecimento para nota 10 e para nota 4. Quem acabou de
                reclamar não deve receber um tratamento diferente na saída. */}
            <p className="m-0 mt-2 max-w-[44ch] text-[1.125rem] text-navy">
              Sua avaliação chegou para a equipe da unidade {nps.unit.name}.
            </p>
          </div>

          <dl className="m-0 mt-6 space-y-3">
            <div>
              <dt className="text-[0.9375rem] text-[var(--fg-2)]">Nota que você deu</dt>
              <dd className="m-0 text-[1.375rem] font-bold text-navy">{response.rating} de 10</dd>
            </div>
            {response.comment && (
              <div>
                <dt className="text-[0.9375rem] text-[var(--fg-2)]">Seu comentário</dt>
                <dd className="m-0 max-w-[52ch] text-[1.0625rem] text-navy">{response.comment}</dd>
              </div>
            )}
          </dl>
        </Card>
      ) : (
        <Card className="px-8 py-8">
          <p className="m-0 mb-4 font-semibold text-[var(--color-brand-purple-dark)]">
            Em uma escala de 0 a 10, quão provável é que você recomende nosso produto/serviço a um amigo ou colega?
          </p>

          <fieldset className="m-0 mt-6 border-0 p-0">
            <legend className="sr-only">Nota de 0 a 10</legend>
            <div className="grid w-full grid-cols-6 overflow-hidden rounded-md border-2 border-[var(--color-brand-purple)] sm:flex">
              {Array.from({ length: 11 }, (_, value) => (
                <label
                  key={value}
                  className="min-h-11 min-w-8 flex-1 cursor-pointer border border-[var(--color-brand-purple)] bg-transparent px-2 py-3 text-center text-lg font-semibold text-[var(--color-brand-purple-dark)] hover:bg-[var(--color-brand-purple)] hover:text-white has-[:checked]:bg-[var(--color-brand-purple)] has-[:checked]:text-white"
                >
                  <input type="radio" name="nota" value={value} className="sr-only" />
                  <span aria-hidden="true">{value}</span>
                  <span className="sr-only">
                    Nota {value}
                    {value === 0 ? ", de jeito nenhum" : value === 10 ? ", com certeza" : ""}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6">
            <label htmlFor="comentario" className="block text-[1rem] font-semibold text-navy">
              O que motivou sua nota? <span className="font-normal">(opcional)</span>
            </label>
            <textarea
              id="comentario"
              rows={4}
              maxLength={5000}
              className="mt-2 w-full rounded-field border border-[var(--border-strong)] bg-surface px-4 py-3 text-[1.0625rem] text-navy"
            />
          </div>

          <div className="mt-6">
            <Button
              id="enviar-nps"
              variant="primary"
              className="px-8 py-3 text-[1.125rem]"
              unavailableReason={submission.allowed ? undefined : submission.reason}
            >
              Enviar Avaliação
            </Button>
          </div>
        </Card>
      )}

      {response.sent && !answered && (
        <Notice tone="info" title="Este convite ainda não foi respondido" level={3}>
          O registro existe desde o envio, e a nota só entra quando você responder. Enquanto isso,
          nada foi contabilizado.
        </Notice>
      )}
    </div>,
    nps,
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode, nps?: NpsData) {
  return (
    <AppShell
      context={context}
      title="Bloomy"
      subtitle={nps ? `Pesquisa de satisfação · ${nps.unit.name}` : undefined}
      surface="standalone"
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
