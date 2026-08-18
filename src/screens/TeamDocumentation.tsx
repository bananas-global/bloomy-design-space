import { useMemo, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  DocumentState,
  DocumentType,
  TeamDocumentationData,
  TeamDocumentationRow,
} from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import { EmptyState, ErrorState, LoadingState } from "../components/primitives.js";
import { Button } from "../components/bloomy/Button.js";
import { Card } from "../components/bloomy/Card.js";
import { EmptyStateCard, Progress, SectionHeader } from "../components/bloomy/Layout.js";
import { Tag } from "../components/bloomy/Tag.js";
import {
  INTERNAL_DOCUMENT_TYPES,
  PROFESSIONAL_DOCUMENT_TYPES,
} from "../fixtures/documents.js";
import { professionalStatus } from "../rules/professionalDeactivation.js";
import {
  daysUntil,
  completeness,
  credentialStatus,
  documentState,
  documentStateLabel,
  hasFile,
} from "../rules/documents.js";

/** A visão Documentação da lista de profissionais. */
export function TeamDocumentation({ context }: ScreenProps) {
  const { data, isLoading, error, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a documentação da equipe" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("professionals.edit")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso à documentação da equipe"
        description="A matriz é de admin, admin de clínica, coordenação e People. Fale com quem administra os acessos."
      />,
    );
  }

  const documentacao = data as TeamDocumentationData | null;
  if (!documentacao) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (documentacao.rows.length === 0) {
    return wrap(
      context,
      <Card>
        <EmptyStateCard icon="fa-folder-open" text="Nenhum profissional vinculado">
          A matriz aparece assim que a unidade tiver o primeiro vínculo.
        </EmptyStateCard>
      </Card>,
      documentacao,
    );
  }

  return <Conteudo context={context} documentacao={documentacao} />;
}

/** `tag/1` traz a paleta do monólito, contraste incluído. */
function Etiqueta(props: React.ComponentProps<typeof Tag>) {
  return (
    <Tag {...props} className={["espelho-do-sistema", props.className].filter(Boolean).join(" ")} />
  );
}

const TOM: Record<DocumentState, "green" | "orange" | "red" | "yellow" | "brand"> = {
  valid: "green",
  no_expiry: "green",
  expiring: "orange",
  expired: "red",
  missing: "yellow",
  waived: "brand",
};

const ORDEM: DocumentState[] = ["expired", "missing", "expiring", "waived", "valid"];

const ESCOPOS = [
  { id: "professional", label: "Profissional", tipos: PROFESSIONAL_DOCUMENT_TYPES },
  {
    id: "internal",
    label: "Interno",
    tipos: INTERNAL_DOCUMENT_TYPES.filter((t) => t.scope === "internal"),
  },
  {
    id: "occupational",
    label: "Ocupacional",
    tipos: INTERNAL_DOCUMENT_TYPES.filter((t) => t.scope === "occupational"),
  },
];

/** Estado de um tipo para um profissional. Registro sem arquivo é ausência. */
function estadoDe(linha: TeamDocumentationRow, type: DocumentType, hoje: string): DocumentState {
  const doc = linha.documents.find((item) => item.typeId === type.id);
  const estado = documentState(doc, hoje);
  if (estado !== "waived" && doc && !hasFile(doc)) return "missing";
  return estado;
}

/** Conta por estado, na ordem de severidade. */
function rollup(linha: TeamDocumentationRow, tipos: DocumentType[], hoje: string) {
  const contagem = new Map<DocumentState, number>();
  for (const type of tipos) {
    const estado = estadoDe(linha, type, hoje);
    contagem.set(estado, (contagem.get(estado) ?? 0) + 1);
  }
  const pendencia = ["expired", "missing", "expiring"].some((e) =>
    contagem.has(e as DocumentState),
  );
  return { contagem, emDia: !pendencia };
}

function Rollup({
  linha,
  tipos,
  hoje,
}: {
  linha: TeamDocumentationRow;
  tipos: DocumentType[];
  hoje: string;
}) {
  const { contagem, emDia } = rollup(linha, tipos, hoje);

  if (emDia) {
    return <Etiqueta item="em dia" variant="green" icon="fa-check" />;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ORDEM.filter((estado) => contagem.has(estado)).map((estado) => (
        <Etiqueta
          key={estado}
          item={String(contagem.get(estado))}
          variant={TOM[estado]}
          title={`${documentStateLabel(estado)} — ${contagem.get(estado)} de ${tipos.length}`}
        />
      ))}
    </div>
  );
}

function Nome({
  pessoa,
  hoje,
  locale,
}: {
  pessoa: TeamDocumentationRow["professional"];
  hoje: string;
  locale: string | undefined;
}) {
  const situacao = professionalStatus(pessoa, hoje);
  const dias = pessoa.deactivationDate ? daysUntil(pessoa.deactivationDate, hoje) : undefined;

  return (
    <div className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          situacao === "active"
            ? "bg-[var(--color-brand-green)]"
            : situacao === "deactivating"
              ? "bg-[var(--color-brand-orange)]"
              : "bg-[var(--color-red)]"
        }`}
      />
      <span className="min-w-0">
        {pessoa.name}
        {pessoa.tbd && <Etiqueta item="TBD" variant="yellow" className="ml-2" />}
        {situacao === "deactivating" && pessoa.deactivationDate && (
          <span className="block text-sm font-normal text-[var(--color-pending-fg)]">
            <Icon name="fa-arrow-right-from-bracket" className="mr-1" />
            Em inativação · sai {formatDate(pessoa.deactivationDate, locale)} ·{" "}
            {dias === 0 ? "hoje" : `${dias} ${dias === 1 ? "dia" : "dias"}`}
          </span>
        )}
        {situacao === "inactive" && (
          <span className="block text-sm font-normal text-[var(--fg-2)]">Inativo</span>
        )}
      </span>
    </div>
  );
}

function Conteudo({
  context,
  documentacao,
}: {
  context: ScreenProps["context"];
  documentacao: TeamDocumentationData;
}) {
  const hoje = documentacao.now.slice(0, 10);
  const [visao, setVisao] = useState<"lista" | "docs">("docs");
  const [filtro, setFiltro] = useState("");

  const linhas = useMemo(() => {
    const busca = filtro.trim().toLowerCase();
    return documentacao.rows.filter(
      (linha) =>
        !busca ||
        linha.professional.name.toLowerCase().includes(busca) ||
        linha.professional.specialty.toLowerCase().includes(busca),
    );
  }, [documentacao.rows, filtro]);

  const comPendencia = documentacao.rows.filter((linha) =>
    ESCOPOS.some((escopo) => !rollup(linha, escopo.tipos, hoje).emDia),
  ).length;

  const operadoras = documentacao.insurers.filter((item) => item.kind !== "particular");

  return wrap(
    context,
    <Card className="space-y-6">
      <SectionHeader
        variant="default"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Toggle ativo={visao} pendencias={comPendencia} onChange={setVisao} />
            <Button className="espelho-do-sistema" variant="tint" rightIcon="fa-file-arrow-down">
              Controle de horas
            </Button>
            <Button className="espelho-do-sistema" rightIcon="fa-plus">
              Novo profissional
            </Button>
          </div>
        }
      >
        Profissionais
      </SectionHeader>

      <input
        type="search"
        value={filtro}
        onChange={(event) => setFiltro(event.target.value)}
        placeholder={
          visao === "docs"
            ? "Filtrar por nome, especialidade, situação do documento ou categoria (Profissional, Interno, Ocupacional, Operadoras)"
            : "Filtrar por nome, conselho, especialidade, tipo, formação ou status — Enter para fixar"
        }
        aria-label="Filtrar a documentação da equipe"
        className="w-full rounded-lg border border-[var(--color-brand-purple-dark)]/10 bg-[var(--color-brand-purple-dark)]/5 px-4 py-3 text-sm text-[var(--color-brand-purple-dark)] placeholder:text-[var(--fg-2)]"
      />

      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Documentação da equipe">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--color-brand-purple-dark)]/10 text-left">
              <th className="px-3 py-3">Nome</th>
              {visao === "lista" ? (
                <>
                  <th className="px-3 py-3">Especialidade</th>
                  <th className="px-3 py-3">Conselho</th>
                  <th className="px-3 py-3">Tipo</th>
                  <th className="px-3 py-3">Formação em Saúde</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-3">Completude</th>
                  {ESCOPOS.map((escopo) => (
                    <th key={escopo.id} className="px-3 py-3">
                      {escopo.label}
                    </th>
                  ))}
                  <th className="px-3 py-3">Operadoras</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => {
              const completude = completeness(
                linha.documents,
                [...PROFESSIONAL_DOCUMENT_TYPES, ...INTERNAL_DOCUMENT_TYPES],
                hoje,
              );

              const credenciados = operadoras.filter(
                (insurer) =>
                  credentialStatus(
                    linha.links.find((item) => item.insurerId === insurer.id),
                    linha.documents,
                    insurer,
                    hoje,
                  ) === "credentialed",
              ).length;

              return (
                <tr
                  key={linha.professional.id}
                  className="border-b border-[var(--color-brand-purple-dark)]/10 last:border-0"
                >
                  <th scope="row" className="px-3 py-4 text-left font-bold text-[var(--color-brand-purple-dark)]">
                    <Nome pessoa={linha.professional} hoje={hoje} locale={context.locale} />
                  </th>

                  {visao === "lista" ? (
                    <>
                      <td className="px-3 py-4">
                        <Etiqueta item={linha.professional.specialty} variant="light-blue" />
                      </td>
                      <td className="px-3 py-4">{linha.professional.council ?? "—"}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(linha.professional.types ?? []).map((tipo) => (
                            <Etiqueta key={tipo} item={tipo} variant="light-blue" />
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <Etiqueta item={linha.professional.formation ?? "Outros"} variant="light-blue" />
                      </td>
                    </>
                  ) : (
                  <>
                  <td className="w-40 px-3 py-4">
                    <span className="sr-only">
                      {completude.met} de {completude.required} obrigatórios cumpridos
                    </span>
                    <Progress
                      value={completude.percent}
                      variant={
                        completude.percent === 100
                          ? "default"
                          : completude.percent >= 70
                            ? "accent"
                            : "error"
                      }
                    />
                  </td>

                  {ESCOPOS.map((escopo) => (
                    <td key={escopo.id} className="px-3 py-4">
                      <Rollup linha={linha} tipos={escopo.tipos} hoje={hoje} />
                    </td>
                  ))}

                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <Etiqueta
                        item={String(credenciados)}
                        variant="green"
                        title={`${credenciados} credenciado(s)`}
                      />
                      {operadoras.length - credenciados > 0 && (
                        <Etiqueta
                          item={String(operadoras.length - credenciados)}
                          variant="yellow"
                          title={`${operadoras.length - credenciados} sem credenciamento`}
                        />
                      )}
                    </div>
                  </td>
                  </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="m-0 text-sm text-[var(--fg-2)]">
        Mostrando {linhas.length} de {documentacao.rows.length} profissionais
      </p>
    </Card>,
    documentacao,
  );
}

/**
 * O par Profissionais / Documentação da lista.
 *
 * As duas visões são a mesma lista com colunas diferentes, e por isso o
 * alternador aparece igual nas duas telas.
 */
export function Toggle({
  ativo,
  pendencias,
  onChange,
}: {
  ativo: "lista" | "docs";
  pendencias?: number;
  onChange?: (visao: "lista" | "docs") => void;
}) {
  const base =
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors";

  return (
    <div
      className="inline-flex gap-1 rounded-xl bg-[var(--color-brand-purple-dark)]/5 p-1"
      role="group"
      aria-label="Visualização da lista"
    >
      <button
        type="button"
        onClick={() => onChange?.("lista")}
        aria-pressed={ativo === "lista"}
        className={`${base} ${
          ativo === "lista"
            ? "bg-white text-[var(--color-brand-purple-dark)] shadow-[var(--shadow-main)]"
            : "text-[var(--fg-2)]"
        }`}
      >
        <Icon name="fa-users" />
        Profissionais
      </button>
      <button
        type="button"
        onClick={() => onChange?.("docs")}
        aria-pressed={ativo === "docs"}
        className={`${base} ${
          ativo === "docs"
            ? "bg-white text-[var(--color-brand-purple-dark)] shadow-[var(--shadow-main)]"
            : "text-[var(--fg-2)]"
        }`}
      >
        <Icon name="fa-folder-open" />
        Documentação
        {pendencias !== undefined && pendencias > 0 && (
          <span className="rounded-full bg-[var(--color-brand-orange)]/25 px-2 text-xs font-bold text-[var(--color-orange-dark)]">
            {pendencias}
          </span>
        )}
      </button>
    </div>
  );
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  documentacao?: TeamDocumentationData | null,
) {
  return (
    <AppShell
      context={context}
      title="Profissionais"
      subtitle={
        documentacao && documentacao.rows.length > 0
          ? `${documentacao.rows.length} ${documentacao.rows.length === 1 ? "profissional" : "profissionais"}`
          : undefined
      }
      breadcrumb={[{ label: "Profissionais", path: "/team" }, { label: "Documentação" }]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
