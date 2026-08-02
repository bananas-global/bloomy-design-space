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
    <div className="mx-auto max-w-[42rem] space-y-6">
      {answered ? (
        <Card className="px-8 py-8">
          <div role="status">
            <h2 className="m-0 text-[24px] font-bold text-navy">Obrigado pela resposta</h2>
            {/* Mesmo agradecimento para nota 10 e para nota 4. Quem acabou de
                reclamar não deve receber um tratamento diferente na saída. */}
            <p className="m-0 mt-2 max-w-[44ch] text-[18px] text-navy">
              Sua avaliação chegou para a equipe da unidade {nps.unit.name}.
            </p>
          </div>

          <dl className="m-0 mt-6 space-y-3">
            <div>
              <dt className="text-[15px] text-[var(--fg-2)]">Nota que você deu</dt>
              <dd className="m-0 text-[22px] font-bold text-navy">{response.rating} de 10</dd>
            </div>
            {response.comment && (
              <div>
                <dt className="text-[15px] text-[var(--fg-2)]">Seu comentário</dt>
                <dd className="m-0 max-w-[52ch] text-[17px] text-navy">{response.comment}</dd>
              </div>
            )}
          </dl>
        </Card>
      ) : (
        <Card className="px-8 py-8">
          <h2 className="m-0 text-[24px] font-bold text-navy">
            Como foi o atendimento na unidade {nps.unit.name}?
          </h2>
          <p className="m-0 mt-2 max-w-[46ch] text-[18px] text-navy">
            De 0 a 10, o quanto você recomendaria a Bloomy para outra família?
          </p>

          <fieldset className="m-0 mt-6 border-0 p-0">
            <legend className="sr-only">Nota de 0 a 10</legend>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 11 }, (_, value) => (
                <label
                  key={value}
                  className="cursor-pointer rounded-field border border-[var(--border-strong)] bg-surface px-4 py-3 text-[19px] font-semibold text-navy hover:bg-ink-50 has-[:checked]:border-action has-[:checked]:bg-action has-[:checked]:text-white"
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
            <div className="mt-2 flex justify-between text-[14px] text-[var(--fg-2)]">
              <span>0 — de jeito nenhum</span>
              <span>10 — com certeza</span>
            </div>
          </fieldset>

          <div className="mt-6">
            <label htmlFor="comentario" className="block text-[16px] font-semibold text-navy">
              Quer contar mais alguma coisa? <span className="font-normal">(opcional)</span>
            </label>
            <textarea
              id="comentario"
              rows={4}
              maxLength={5000}
              className="mt-2 w-full rounded-field border border-[var(--border-strong)] bg-surface px-4 py-3 text-[17px] text-navy"
            />
          </div>

          <div className="mt-6">
            <Button
              id="enviar-nps"
              variant="primary"
              className="px-8 py-3 text-[18px]"
              unavailableReason={submission.allowed ? undefined : submission.reason}
            >
              Enviar
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
    >
      {children}
    </AppShell>
  );
}
