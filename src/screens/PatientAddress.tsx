import type { ScreenProps } from "@brucesantos/design-space";
import type { PatientAddressAttempt, PatientAddressData } from "../contracts/index.js";
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
  addressIsCast,
  deliberatelyWithoutAddress,
  editKeepsTheOldAddress,
  errorTheChangesetWouldGive,
  filledFields,
  rejectedWithAnError,
  silentlyDiscarded,
} from "../rules/patientAddress.js";

/**
 * Endereço do paciente.
 *
 * O cadastro decide se grava o endereço com uma guarda de um campo só: se o CEP
 * for string vazia, a associação nem é casada. O endereço não é gravado, o
 * changeset que explicaria isso não roda, e o cadastro salva com sucesso.
 *
 * Três decisões desta tela:
 *
 * 1. **O que foi digitado e vai sumir é listado campo a campo.** “O endereço
 *    não será salvo” é abstrato; “Estrada do Aterrado, Ibiúna, SP” é a coisa que
 *    alguém acabou de digitar e vai perder.
 *
 * 2. **A mensagem que o sistema já tem aparece.** O changeset do endereço sabe
 *    dizer que o CEP é obrigatório. Mostrar essa frase aqui deixa claro que a
 *    correção é deixar rodar o que já existe, e não escrever coisa nova.
 *
 * 3. **A edição que não muda nada fica separada do cadastro perdido.** Pular a
 *    associação não apaga o endereço antigo — ele fica, e parece confirmação.
 *    É um problema diferente e mais difícil de perceber.
 */
export function PatientAddress({ context }: ScreenProps) {
  const { data, isLoading, error } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando os cadastros" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const address = data as PatientAddressData | null;
  if (!address) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (address.attempts.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhum cadastro para conferir"
        description="Esta tela mostra o que acontece com o endereço quando o cadastro do paciente é salvo."
      />,
    );
  }

  const perdidos = silentlyDiscarded(address);
  const semMudanca = address.attempts.filter(editKeepsTheOldAddress);
  const recusados = rejectedWithAnError(address);
  const semEndereco = deliberatelyWithoutAddress(address);

  // Um cadastro novo sem CEP perde o que foi digitado; uma edição sem CEP
  // mantém o antigo. São os dois lados da mesma guarda, e não se somam.
  const novosPerdidos = perdidos.filter((tentativa) => !tentativa.hadAddressBefore);

  return wrap(
    context,
    <div className="space-y-4">
      {novosPerdidos.length > 0 && (
        <Notice
          tone="danger"
          title={`${novosPerdidos.length} ${novosPerdidos.length === 1 ? "endereço digitado não vai ser gravado" : "endereços digitados não vão ser gravados"}`}
        >
          {novosPerdidos.map((tentativa) => (
            <div key={tentativa.id} className="mt-1 first:mt-0">
              <p className="m-0 max-w-[68ch]">
                <span className="font-semibold">{tentativa.patientName}</span> preencheu{" "}
                {filledFields(tentativa).length} campos do endereço e deixou o CEP em branco. Tudo
                isto é descartado:
              </p>
              <ul className="m-0 mt-1 list-disc space-y-0.5 pl-5">
                {filledFields(tentativa).map((campo) => (
                  <li key={campo.key}>
                    {campo.label}: {tentativa[campo.key as keyof PatientAddressAttempt] as string}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="m-0 mt-2 max-w-[68ch]">
            O CEP não é mais um campo do endereço: é o que decide se o endereço existe. Nada no
            formulário diz isso, e o cadastro é salvo com sucesso.
          </p>
        </Notice>
      )}

      {semMudanca.length > 0 && (
        <Notice
          tone="danger"
          title={`${semMudanca.length} ${semMudanca.length === 1 ? "edição não vai mudar nada, e vai parecer que mudou" : "edições não vão mudar nada, e vão parecer que mudaram"}`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {semMudanca.map((tentativa) => (
              <li key={tentativa.id}>
                {tentativa.patientName} — o endereço anterior continua gravado exatamente como
                estava.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2 max-w-[68ch]">
            Deixar de casar a associação não apaga o que já existia: o endereço antigo fica. Quem
            corrigiu a rua e apagou o CEP salva com sucesso, não muda nada, e vê o endereço velho na
            tela como se fosse a confirmação de que deu certo.
          </p>
        </Notice>
      )}

      {(novosPerdidos.length > 0 || semMudanca.length > 0) && (
        <Notice tone="warn" title="A frase que explicaria isso já existe no sistema">
          <p className="m-0 max-w-[68ch]">
            O cadastro de endereço exige o CEP e sabe dizer{" "}
            <span className="font-semibold">“CEP: não pode ficar em branco”</span>. É exatamente
            essa checagem que a guarda impede de rodar — a explicação está escrita, e o caminho
            evita chegar nela.
          </p>
          <p className="m-0 mt-2 max-w-[68ch]">
            A correção é deixar a checagem acontecer e devolver o erro que ela já sabe dar. A
            diferença é entre um cadastro incompleto conhecido e um desconhecido.
          </p>
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title="O que acontece ao salvar"
          hint={`${address.attempts.length} cadastros`}
        />
        <div className="px-5 py-5">
          <ul className="m-0 list-none space-y-2 p-0">
            {address.attempts.map((tentativa) => (
              <li key={tentativa.id}>
                <Row attempt={tentativa} />
              </li>
            ))}
          </ul>
          {(recusados.length > 0 || semEndereco.length > 0) && (
            <p className="m-0 mt-3 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
              {recusados.length > 0 && (
                <>
                  Com o CEP preenchido, a checagem roda e o sistema reclama do que falta — é o
                  comportamento certo, e mostra que ele sabe avisar quando o deixam.{" "}
                </>
              )}
              {semEndereco.length > 0 && (
                <>
                  E cadastrar sem endereço nenhum precisa continuar possível: é para isso que a
                  guarda existe.
                </>
              )}
            </p>
          )}
        </div>
      </Card>
    </div>,
  );
}

function Row({ attempt }: { attempt: PatientAddressAttempt }) {
  const casa = addressIsCast(attempt);
  const erro = errorTheChangesetWouldGive(attempt);
  const preenchidos = filledFields(attempt);
  const mantemAntigo = editKeepsTheOldAddress(attempt);
  const perdeDigitado = !casa && !attempt.hadAddressBefore && preenchidos.length > 0;

  const desfecho = perdeDigitado
    ? "endereço digitado é descartado"
    : mantemAntigo
      ? "o endereço antigo continua"
      : !casa
        ? "salvo sem endereço, como pedido"
        : erro
          ? "recusado, com o motivo"
          : "endereço gravado";

  return (
    <article className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">{attempt.patientName}</span>
        <span className="text-[0.8125rem] text-[var(--fg-2)]">
          CEP {attempt.zipCode === "" ? "em branco" : attempt.zipCode}
        </span>
        <span className="text-[0.8125rem] text-[var(--fg-2)]">
          {preenchidos.length} de 5 campos preenchidos
        </span>
        {/* O desfecho em palavras: é o que a tela existe para dizer. */}
        <Chip tone={perdeDigitado || mantemAntigo ? "danger" : erro ? "warn" : "ok"}>
          {desfecho}
        </Chip>
      </div>

      {casa && erro && (
        <p className="m-0 mt-1.5 text-[0.875rem] text-navy">O sistema responde: {erro}</p>
      )}

      {!casa && erro && preenchidos.length > 0 && (
        <p className="m-0 mt-1.5 max-w-[68ch] text-[0.875rem] text-navy">
          O sistema teria respondido “{erro}”, e não responde nada.
        </p>
      )}
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Endereço do paciente"
      subtitle="O CEP decide se o endereço existe"
      breadcrumb={[{ label: "Pacientes", path: "/patients" }, { label: "Endereço" }]}
    >
      {children}
    </AppShell>
  );
}
