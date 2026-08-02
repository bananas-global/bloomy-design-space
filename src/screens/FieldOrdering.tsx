import type { ScreenProps } from "@brucesantos/design-space";
import type { FieldOrderingData, ValidatedField } from "../contracts/index.js";
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
  approvedButStoredInvalid,
  checksWhatItStores,
  invisibleCharacters,
  isAccepted,
  rejectedForInvisibleCharacters,
  sizeLabel,
  storedValue,
  validatedValue,
  wouldBeAcceptedAsStored,
} from "../rules/fieldOrdering.js";

/**
 * Validação e limpeza fora de ordem.
 *
 * 123 changesets terminam aparando os espaços, **depois** de todas as
 * validações. O sistema confere um texto e grava outro, e a diferença são
 * caracteres que ninguém vê.
 *
 * Três decisões desta tela:
 *
 * 1. **Os caracteres invisíveis são contados, não descritos.** “Tem espaço
 *    sobrando” não ajuda quem está olhando para um campo que parece certo. O
 *    número é a única coisa que explica o veredito.
 *
 * 2. **As duas direções ficam separadas.** Recusar o que caberia é um problema
 *    de quem preenche; aceitar o que não cabe é um problema no banco, e ninguém
 *    da tela vai descobrir. São urgências diferentes.
 *
 * 3. **O contraexemplo aparece na mesma lista.** Um campo do próprio sistema
 *    normaliza antes de conferir. Mostrá-lo ao lado dos outros transforma o
 *    achado de “política a decidir” em “ordem a estender”.
 */
export function FieldOrdering({ context }: ScreenProps) {
  const { data, isLoading, error } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando os campos" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const ordering = data as FieldOrderingData | null;
  if (!ordering) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (ordering.fields.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhum campo para conferir"
        description="Esta tela compara o texto que a validação examina com o texto que acaba gravado."
      />,
    );
  }

  const recusadosATôa = rejectedForInvisibleCharacters(ordering);
  const aceitosInválidos = approvedButStoredInvalid(ordering);
  const naOrdemCerta = checksWhatItStores(ordering);

  return wrap(
    context,
    <div className="space-y-4">
      {aceitosInválidos.length > 0 && (
        <Notice
          tone="danger"
          title={`${aceitosInválidos.length} ${aceitosInválidos.length === 1 ? "valor foi aceito e gravado fora da regra" : "valores foram aceitos e gravados fora da regra"}`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {aceitosInválidos.map((campo) => (
              <li key={campo.id}>
                {campo.label}, em {campo.where}: passou com{" "}
                {validatedValue(campo).length} caracteres e foi gravado com{" "}
                {storedValue(campo).length}. A regra é que {campo.check.message}.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2 max-w-[68ch]">
            Este é o lado que não aparece na tela: a validação aprovou exatamente o que viu, e o que
            ela viu não é o que foi guardado. Daí em diante, todo código que confia no formato
            encontra um valor que não deveria existir.
          </p>
        </Notice>
      )}

      {recusadosATôa.length > 0 && (
        <Notice
          tone="warn"
          title={`${recusadosATôa.length} ${recusadosATôa.length === 1 ? "envio foi recusado" : "envios foram recusados"} por caracteres que não seriam gravados`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {recusadosATôa.map((campo) => (
              <li key={campo.id}>
                {campo.label}, em {campo.where}: {invisibleCharacters(campo)}{" "}
                {invisibleCharacters(campo) === 1
                  ? "caractere invisível no fim"
                  : "caracteres invisíveis no fim"}
                . Sem eles, caberia.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2 max-w-[68ch]">
            A mensagem conta caracteres que nunca seriam guardados, e quem preenche olha para um
            campo que parece certo. Um código colado de um e-mail vem com o espaço junto, e não há
            como descobrir isso pela tela.
          </p>
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title="O que é conferido e o que é gravado"
          hint={`${ordering.fields.length} campos`}
        />
        <div className="space-y-2 px-5 py-5">
          <ul className="m-0 list-none space-y-2 p-0">
            {ordering.fields.map((campo) => (
              <li key={campo.id}>
                <Row field={campo} />
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {naOrdemCerta.length > 0 && (
        <Notice tone="info" title="A ordem certa já existe neste sistema">
          <p className="m-0 max-w-[68ch]">
            {naOrdemCerta.map((campo) => campo.label).join(", ")} normaliza o texto{" "}
            <span className="font-semibold">antes</span> de conferir o formato. É o mesmo repositório
            e o mesmo tipo de campo — só a ordem é outra, e por isso o veredito combina com o que vai
            para o banco.
          </p>
          <p className="m-0 mt-2 max-w-[68ch]">
            Corrigir os outros não é decidir uma política nova: é estender a que já foi decidida uma
            vez, num campo só.
          </p>
        </Notice>
      )}
    </div>,
  );
}

function Row({ field }: { field: ValidatedField }) {
  const aceito = isAccepted(field);
  const guardadoServe = wouldBeAcceptedAsStored(field);
  const invisiveis = invisibleCharacters(field);
  const coerente = aceito === guardadoServe;

  return (
    <article className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">{field.label}</span>
        <span className="text-[0.875rem] text-navy">{field.where}</span>
        <span className="text-[0.8125rem] text-[var(--fg-2)]">{field.check.message}</span>
        {/* O veredito e a coerência dele, os dois em palavras. */}
        <Chip tone={aceito ? "ok" : "danger"}>{aceito ? "aceito" : "recusado"}</Chip>
        {!coerente && (
          <Chip tone="warn">
            {aceito ? "mas o valor gravado não cumpre a regra" : "mas o valor gravado cumpriria"}
          </Chip>
        )}
      </div>

      <p className="m-0 mt-1.5 text-[0.8125rem] text-[var(--fg-2)]">
        {sizeLabel(field)}
        {invisiveis > 0 && (
          <>
            {" · "}
            <span className="font-semibold text-navy">
              {invisiveis}{" "}
              {invisiveis === 1 ? "caractere invisível" : "caracteres invisíveis"} no fim
            </span>
          </>
        )}
        {!field.trimsAfterValidation && " · normaliza antes de conferir"}
      </p>
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Validação e limpeza fora de ordem"
      subtitle="O sistema confere um texto e grava outro"
      breadcrumb={[{ label: "Estrutura", path: "/structure" }, { label: "Campos" }]}
    >
      {children}
    </AppShell>
  );
}
