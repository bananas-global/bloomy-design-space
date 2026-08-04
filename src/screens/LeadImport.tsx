import type { ScreenProps } from "@brucesantos/design-space";
import type { LeadsData } from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
import { LeadShell, ProposalBanner } from "../components/LeadParts.js";
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
import { IMPORT_FIELDS, classifyImport, summarizeImport, validateMapping } from "../rules/leads.js";

const DECISION_LABEL = {
  create: "Criar novo",
  update: "Atualizar existente",
  ignore: "Ignorar",
} as const;

/**
 * Importação de planilha.
 *
 * Quatro passos, e o terceiro é o que decide se a ferramenta vale: importação
 * tudo-ou-nada por causa de uma linha sem telefone é exatamente o motivo pelo
 * qual as planilhas continuam nas planilhas.
 *
 * O dedupe olha para pacientes também. A linha da Bianca, na fixture, bate com
 * o telefone de uma família que já é cliente — sem essa checagem, ela entraria
 * como lead novo e alguém ligaria para apresentar a clínica a quem frequenta.
 */
export function LeadImport({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a importação" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const leadsData = data as LeadsData | null;
  if (!leadsData) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const preview = leadsData.importPreview;
  if (!preview) {
    return wrap(
      context,
      <div className="space-y-4">
        <ProposalBanner />
        <EmptyState
          title="Nenhum arquivo enviado"
          description="Aceita CSV e XLSX. Escolha a origem do lote — a operadora que mandou a planilha, ou o canal de anúncio — e a unidade padrão dos leads que vão entrar."
        />
        <Historico data={leadsData} locale={locale} />
      </div>,
    );
  }

  const mapping = validateMapping(preview.columns, preview.mapping);
  const classified = classifyImport(leadsData, preview.rows);
  const summary = summarizeImport(classified);

  return wrap(
    context,
    <div className="space-y-4">
      <ProposalBanner />

      <ol className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-[0.875rem]">
        {["Upload", "Mapeamento", "Revisão", "Resultado"].map((label, index) => (
          <li key={label} className="text-navy">
            <span className={index <= 2 ? "font-bold" : "text-[var(--fg-2)]"}>
              {index + 1}. {label}
            </span>
            {index < 3 && (
              <span aria-hidden="true" className="ml-3 text-[var(--fg-2)]">
                ›
              </span>
            )}
          </li>
        ))}
      </ol>

      {/* ---------------------------------------------------- passo 1 */}
      <Card as="section">
        <CardHeader title="1. Arquivo" hint={`${preview.source} · unidade ${preview.unit}`} />
        <div className="px-5 py-5">
          <p className="m-0 text-[0.9375rem] text-navy">
            <strong className="font-semibold">{preview.fileName}</strong>{" "}
            <span className="text-[0.8125rem] text-[var(--fg-2)]">
              {preview.format} · {preview.sizeLabel} · {preview.rows.length} linhas
            </span>
          </p>
        </div>
      </Card>

      {/* ---------------------------------------------------- passo 2 */}
      <Card as="section">
        <CardHeader
          title="2. Mapeamento de colunas"
          hint="Feito uma vez por operadora, salvo como template e reaplicado no mês seguinte"
        />
        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[0.8125rem] font-semibold text-navy">Templates salvos:</span>
            {preview.templates.map((template) => (
              <Button key={template.name} id={`template-${template.name}`}>
                {template.name}
              </Button>
            ))}
          </div>

          {!mapping.valid && (
            <Notice tone="danger" title="O mapeamento não fecha">
              <ul className="m-0 list-disc space-y-0.5 pl-5">
                {mapping.problems.map((problem) => (
                  <li key={problem.kind}>
                    {problem.kind === "missing-required"
                      ? `Campo obrigatório sem coluna: ${problem.fields.join(", ")}.`
                      : `Duas colunas apontam para o mesmo campo: ${problem.fields.join(", ")}.`}
                  </li>
                ))}
              </ul>
            </Notice>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[0.875rem]">
              <caption className="sr-only">
                De/para entre as colunas da planilha e os campos do lead.
              </caption>
              <thead>
                <tr className="border-b border-[var(--border-soft)]">
                  <th scope="col" className="px-2 py-2 font-semibold text-navy">
                    Coluna da planilha
                  </th>
                  <th scope="col" className="px-2 py-2 font-semibold text-navy">
                    Amostra
                  </th>
                  <th scope="col" className="px-2 py-2 font-semibold text-navy">
                    Campo do lead
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.columns.map((column) => {
                  const value = preview.mapping[column.column] ?? "ignore";
                  const suggested = value === column.suggestion && value !== "ignore";
                  return (
                    <tr key={column.column} className="border-b border-[var(--border-soft)]">
                      <th scope="row" className="px-2 py-2.5 font-normal text-navy">
                        {column.column}
                      </th>
                      <td className="px-2 py-2.5 text-[var(--fg-2)]">{column.sample}</td>
                      <td className="px-2 py-2.5">
                        <label htmlFor={`map-${column.column}`} className="sr-only">
                          Campo do lead para a coluna {column.column}
                        </label>
                        <select
                          id={`map-${column.column}`}
                          defaultValue={value}
                          className="rounded-card border border-[var(--border-soft)] bg-surface px-2.5 py-1.5 text-[0.875rem] text-navy"
                        >
                          {IMPORT_FIELDS.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                        {suggested && (
                          <span className="ml-2 text-[0.8125rem] text-[var(--fg-2)]">
                            sugerido pelo nome da coluna
                          </span>
                        )}
                        {value === "ignore" && (
                          <span className="ml-2 text-[0.8125rem] text-[var(--fg-2)]">
                            ignorada — o conteúdo não entra em lugar nenhum
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-baseline gap-2.5">
            <input type="checkbox" id="salvar-template" className="h-6 w-6 shrink-0" />
            <label htmlFor="salvar-template" className="text-[0.875rem] text-navy">
              Salvar este mapeamento como template
            </label>
          </div>
        </div>
      </Card>

      {/* ---------------------------------------------------- passo 3 */}
      <Card as="section">
        <CardHeader
          title="3. Revisão e duplicidades"
          hint={`${summary.valid} válidos · ${summary.duplicate} duplicados · ${summary.error} com erro`}
        />
        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap gap-2">
            <Chip tone="neutral">Todos {summary.total}</Chip>
            <Chip tone="ok">Válidos {summary.valid}</Chip>
            <Chip tone="warn">Duplicados {summary.duplicate}</Chip>
            <Chip tone="danger">Com erro {summary.error}</Chip>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[0.875rem]">
              <caption className="sr-only">
                Linhas da planilha, com o estado de cada uma e o que será feito com ela.
              </caption>
              <thead>
                <tr className="border-b border-[var(--border-soft)]">
                  <th scope="col" className="px-2 py-2 font-semibold text-navy">
                    Linha
                  </th>
                  <th scope="col" className="px-2 py-2 font-semibold text-navy">
                    Contato
                  </th>
                  <th scope="col" className="px-2 py-2 font-semibold text-navy">
                    Telefone
                  </th>
                  <th scope="col" className="px-2 py-2 font-semibold text-navy">
                    Estado
                  </th>
                  <th scope="col" className="px-2 py-2 font-semibold text-navy">
                    O que fazer
                  </th>
                </tr>
              </thead>
              <tbody>
                {classified.map((item) => (
                  <tr key={item.row.line} className="border-b border-[var(--border-soft)]">
                    <th scope="row" className="px-2 py-2.5 font-normal text-navy">
                      {item.row.line}
                    </th>
                    <td className="px-2 py-2.5 text-navy">
                      {item.row.contactName || (
                        <span className="text-[var(--fg-2)]">sem nome</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-navy">{item.row.phone}</td>
                    <td className="px-2 py-2.5">
                      {/* O estado é texto na célula, não cor de fundo: uma
                          tabela lida em preto e branco precisa continuar
                          dizendo qual linha vai entrar. */}
                      {item.status === "valid" && <Chip tone="ok">Válido</Chip>}
                      {item.status === "duplicate" && (
                        <>
                          <Chip tone="warn">Duplicado</Chip>
                          <span className="ml-2 text-[0.8125rem] text-[var(--fg-2)]">
                            {item.match!.kind === "patient" ? "paciente" : "lead"}{" "}
                            {item.match!.name}, pelo {item.match!.matchedBy}
                          </span>
                        </>
                      )}
                      {item.status === "error" && (
                        <>
                          <Chip tone="danger">Erro</Chip>
                          <span className="ml-2 text-[0.8125rem] text-[var(--fg-2)]">
                            {item.problem}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <label htmlFor={`acao-${item.row.line}`} className="sr-only">
                        O que fazer com a linha {item.row.line}
                      </label>
                      <select
                        id={`acao-${item.row.line}`}
                        defaultValue={item.decision}
                        className="rounded-card border border-[var(--border-soft)] bg-surface px-2.5 py-1.5 text-[0.875rem] text-navy"
                      >
                        {item.options.map((option) => (
                          <option key={option} value={option}>
                            {DECISION_LABEL[option]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="m-0 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
            Linha com erro só pode ser ignorada: deixá-la entrar criaria um lead que ninguém
            consegue contatar, ocupando lugar no funil e na contagem de origem.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              id="importar-lote"
              variant="primary"
              unavailableReason={
                !mapping.valid
                  ? "Corrija o mapeamento antes de importar."
                  : summary.willImport === 0
                    ? "Nenhuma linha está marcada para entrar."
                    : undefined
              }
            >
              Importar {summary.willImport} {summary.willImport === 1 ? "lead" : "leads"}
            </Button>
            <Button id="baixar-erros">Baixar linhas com erro</Button>
          </div>
        </div>
      </Card>

      <Historico data={leadsData} locale={locale} />
    </div>,
  );
}

/* ---------------------------------------------------- histórico de lotes */

function Historico({ data, locale }: { data: LeadsData; locale: string | undefined }) {
  return (
    <Card as="section">
      <CardHeader
        title="Lotes importados"
        hint="De qual planilha veio cada lead — sem isso, ninguém confia no número de origem"
      />
      <div className="px-5 py-5">
        <ul className="m-0 list-none space-y-3 p-0">
          {data.batches.map((batch) => (
            <li key={batch.id}>
              <h3 className="m-0 text-[0.875rem] font-semibold text-navy">
                {batch.fileName}{" "}
                <span className="font-normal text-[var(--fg-2)]">
                  · {batch.source} · {batch.unit}
                </span>
              </h3>
              <p className="m-0 text-[0.8125rem] text-[var(--fg-2)]">
                {formatDate(batch.at, locale)} · {batch.by} · {batch.created} criados,{" "}
                {batch.updated} atualizados, {batch.ignored} ignorados, {batch.errors} com erro ·{" "}
                {batch.tasksCreated} tarefas de primeiro contato criadas
              </p>
              <a
                href={`/leads/list?lote=${batch.id}`}
                className="inline-block py-1 text-[0.8125rem] font-semibold underline underline-offset-2"
              >
                Ver os leads deste lote
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <LeadShell
      context={context}
      title="Importar planilha"
      subtitle="Upload, mapeamento, revisão e resultado"
      breadcrumb={[{ label: "Leads", path: "/leads" }, { label: "Importar" }]}
    >
      {children}
    </LeadShell>
  );
}
