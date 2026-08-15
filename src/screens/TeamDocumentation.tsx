import { useMemo, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  DocumentScope,
  DocumentState,
  DocumentType,
  TeamDocumentationData,
  TeamDocumentationRow,
} from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import { EmptyState, ErrorState, LoadingState } from "../components/primitives.js";
import { Card } from "../components/bloomy/Card.js";
import { EmptyStateCard, Progress, SectionHeader } from "../components/bloomy/Layout.js";
import { ButtonTabs } from "../components/bloomy/Tabs.js";
import { Tag } from "../components/bloomy/Tag.js";
import {
  INTERNAL_DOCUMENT_TYPES,
  PROFESSIONAL_DOCUMENT_TYPES,
} from "../fixtures/documents.js";
import {
  STATE_SEVERITY,
  completeness,
  credentialStatus,
  credentialStatusLabel,
  daysUntil,
  documentState,
  documentStateLabel,
  hasFile,
} from "../rules/documents.js";

/**
 * A documentação da equipe inteira.
 *
 * Uma pasta por pessoa responde “o que falta para a Marina”. Esta tela responde
 * a pergunta que a coordenação faz de verdade na segunda de manhã: **por quem eu
 * começo?** É por isso que ela é uma matriz ordenada por severidade, e não uma
 * lista alfabética com um contador ao lado.
 *
 * Três escopos convivem aqui e não têm o mesmo dono. O profissional é o único
 * que a operadora enxerga, e é somente leitura nesta tela — quem o mantém é a
 * própria pasta do profissional, junto do compartilhamento. Interno e
 * ocupacional são da clínica e nunca saem dela.
 */
export function TeamDocumentation({ context }: ScreenProps) {
  const { data, isLoading, error, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a documentação da equipe" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  /**
   * A documentação usa `professionals.edit`, e não `professionals.list`.
   *
   * Não existe policy de documento de profissional no monólito, então a
   * alternativa seria inventar uma — e uma permissão inventada é pior que uma
   * aproximada, porque some na hora de conferir contra o Elixir. `professionals.edit`
   * é a policy do cadastro a que a pasta pertence e recorta admin, admin de
   * clínica, coordenação e People; `professionals.list` deixaria a recepção
   * entrar, que é o que esta escolha exclui.
   *
   * Ela traz a coordenação junto, que é um papel a mais do que a decisão pedia.
   * Está registrado na decisão 0014 como o ponto a revisar quando a engenharia
   * definir a policy própria.
   */
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

/**
 * Etiqueta do sistema.
 *
 * A paleta de `tag/1` é a do monólito, e o contraste dela também: amarelo sobre
 * amarelo claro dá 2,04:1. A divergência está registrada na decisão 0001, e o
 * `espelho-do-sistema` é como este repositório marca o que é cópia fiel para que
 * a varredura de acessibilidade não a leia como defeito desta entrega.
 */
function Etiqueta(props: React.ComponentProps<typeof Tag>) {
  return (
    <Tag
      {...props}
      className={["espelho-do-sistema", props.className].filter(Boolean).join(" ")}
    />
  );
}

/* =============================================================== escopos */

const ESCOPOS: { id: DocumentScope | "insurers"; label: string; icon: string }[] = [
  { id: "professional", label: "Profissional", icon: "fa-id-card" },
  { id: "internal", label: "Interno", icon: "fa-file-signature" },
  { id: "occupational", label: "Ocupacional", icon: "fa-heart-pulse" },
  { id: "insurers", label: "Operadoras", icon: "fa-building-shield" },
];

function tiposDo(escopo: DocumentScope | "insurers"): DocumentType[] {
  if (escopo === "professional") return PROFESSIONAL_DOCUMENT_TYPES;
  return INTERNAL_DOCUMENT_TYPES.filter((type) => type.scope === escopo);
}

const TOM: Record<DocumentState, "green" | "orange" | "red" | "yellow" | "brand"> = {
  valid: "green",
  no_expiry: "green",
  expiring: "orange",
  expired: "red",
  missing: "yellow",
  waived: "brand",
};

const ICONE: Record<DocumentState, string> = {
  valid: "fa-check",
  no_expiry: "fa-check",
  expiring: "fa-clock",
  expired: "fa-xmark",
  missing: "fa-minus",
  waived: "fa-ban",
};

/* ============================================================== conteúdo */

function Conteudo({
  context,
  documentacao,
}: {
  context: ScreenProps["context"];
  documentacao: TeamDocumentationData;
}) {
  const hoje = documentacao.now.slice(0, 10);
  const [escopo, setEscopo] = useState<DocumentScope | "insurers">("professional");

  /**
   * Implementação da ordem de severidade.
   *
   * Vencido antes de ausente porque um vencido já esteve certo: existe alguém
   * que confiou nele e pode estar atendendo agora com base num papel que caducou.
   */
  const linhas = useMemo(() => {
    const todosOsTipos = [...PROFESSIONAL_DOCUMENT_TYPES, ...INTERNAL_DOCUMENT_TYPES];
    return [...documentacao.rows].sort((a, b) => severidade(a, todosOsTipos, hoje) - severidade(b, todosOsTipos, hoje));
  }, [documentacao.rows, hoje]);

  const tipos = tiposDo(escopo);
  /**
   * A completude é do escopo aberto, e não da soma dos três.
   *
   * Somar tudo produz um número que não explica a tela em que ele aparece:
   * alguém com a pasta profissional impecável apareceria com 25% porque o ASO
   * ainda não subiu, olhando para uma matriz onde o ASO nem é coluna.
   */
  const tiposDaCompletude = escopo === "insurers" ? PROFESSIONAL_DOCUMENT_TYPES : tipos;

  return wrap(
    context,
    <div className="space-y-6">
      <Card className="space-y-6">
        <SectionHeader
          variant="small"
          subtitle="Ordenada por severidade: quem tem documento vencido aparece primeiro, depois quem tem obrigatório ausente."
        >
          Documentação da equipe
        </SectionHeader>

        <ButtonTabs
          className="espelho-do-sistema"
          id="escopos-de-documento"
          label="Escopo do documento"
          value={escopo}
          onChange={setEscopo}
          tabs={ESCOPOS.map((item) => ({ id: item.id, label: item.label }))}
        >
          {escopo === "professional" && (
            <p className="m-0 mb-4 rounded-lg bg-[var(--color-brand-blue)]/10 p-4 text-sm text-[var(--fg-2)]">
              <Icon name="fa-circle-info" className="mr-2" />
              O escopo profissional é somente leitura aqui. Ele é mantido na aba Documentos do
              perfil, junto do compartilhamento com operadoras — que é o que faz esses documentos
              contarem para o credenciamento.
            </p>
          )}

          <Legenda escopo={escopo} />

          <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Matriz de documentação">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--color-brand-purple-dark)]/10 text-left">
                  <th className="sticky left-0 bg-white px-3 py-3">Profissional</th>
                  <th className="px-3 py-3">Completude</th>
                  {escopo === "insurers"
                    ? documentacao.insurers
                        .filter((insurer) => insurer.kind !== "particular")
                        .map((insurer) => (
                          <th key={insurer.id} className="px-3 py-3">
                            {insurer.name}
                          </th>
                        ))
                    : tipos.map((type) => (
                        <th key={type.id} className="px-3 py-3" title={type.name}>
                          {type.short}
                          {type.required && (
                            <>
                              <span aria-hidden="true"> *</span>
                              <span className="sr-only"> (obrigatório)</span>
                            </>
                          )}
                        </th>
                      ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => (
                  <LinhaDaMatriz
                    key={linha.professional.id}
                    linha={linha}
                    escopo={escopo}
                    tipos={tipos}
                    tiposDaCompletude={tiposDaCompletude}
                    insurers={documentacao.insurers}
                    hoje={hoje}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {escopo !== "insurers" && (
            <p className="m-0 mt-4 text-sm text-[var(--fg-2)]">
              <span aria-hidden="true">*</span> documento obrigatório — conta na completude.
              Dispensados saem do cálculo, e um obrigatório a vencer ainda conta como cumprido.
            </p>
          )}
        </ButtonTabs>
      </Card>
    </div>,
    documentacao,
  );
}

function severidade(linha: TeamDocumentationRow, tipos: DocumentType[], hoje: string): number {
  const estados = tipos.map((type) => {
    const doc = linha.documents.find((item) => item.typeId === type.id);
    const estado = documentState(doc, hoje);
    // Registro sem arquivo é ausência, e não presença.
    if (estado !== "waived" && doc && !hasFile(doc)) return "missing" as DocumentState;
    if (!doc && !type.required && !type.standard) return "waived" as DocumentState;
    return estado;
  });

  return Math.min(...estados.map((estado) => STATE_SEVERITY[estado]), 5);
}

function Legenda({ escopo }: { escopo: DocumentScope | "insurers" }) {
  if (escopo === "insurers") {
    return (
      <p className="m-0 text-sm text-[var(--fg-2)]">
        A situação de cada operadora é derivada dos documentos compartilhados e válidos. Ninguém
        digita “credenciado”.
      </p>
    );
  }

  const estados: DocumentState[] = ["expired", "missing", "expiring", "waived", "valid"];
  return (
    <div className="flex flex-wrap gap-2">
      {estados.map((estado) => (
        <Etiqueta key={estado} item={documentStateLabel(estado)} variant={TOM[estado]} />
      ))}
    </div>
  );
}

function LinhaDaMatriz({
  linha,
  escopo,
  tipos,
  tiposDaCompletude,
  insurers,
  hoje,
}: {
  linha: TeamDocumentationRow;
  escopo: DocumentScope | "insurers";
  tipos: DocumentType[];
  tiposDaCompletude: DocumentType[];
  insurers: TeamDocumentationData["insurers"];
  hoje: string;
}) {
  const completude = completeness(linha.documents, tiposDaCompletude, hoje);

  return (
    <tr className="border-b border-[var(--color-brand-purple-dark)]/10 last:border-0">
      <th scope="row" className="sticky left-0 bg-white px-3 py-4 text-left font-bold text-[var(--color-brand-purple-dark)]">
        {linha.professional.name}
        <span className="block text-sm font-normal text-[var(--fg-2)]">
          {linha.professional.specialty}
        </span>
      </th>

      <td className="px-3 py-4">
        <span className="sr-only">
          {completude.met} de {completude.required} obrigatórios cumpridos
        </span>
        <Progress
          value={completude.percent}
          variant={completude.percent === 100 ? "default" : completude.percent >= 70 ? "accent" : "error"}
        />
      </td>

      {escopo === "insurers"
        ? insurers
            .filter((insurer) => insurer.kind !== "particular")
            .map((insurer) => {
              const link = linha.links.find((item) => item.insurerId === insurer.id);
              const status = credentialStatus(link, linha.documents, insurer, hoje);
              return (
                <td key={insurer.id} className="px-3 py-4">
                  <Etiqueta
                    item={credentialStatusLabel(status)}
                    variant={
                      status === "credentialed"
                        ? "green"
                        : status === "decredentialed"
                          ? "red"
                          : status === "in_credentialing"
                            ? "orange"
                            : "brand"
                    }
                  />
                </td>
              );
            })
        : tipos.map((type) => {
            const doc = linha.documents.find((item) => item.typeId === type.id);
            let estado = documentState(doc, hoje);
            if (estado !== "waived" && doc && !hasFile(doc)) estado = "missing";
            const dias = doc?.validUntil ? daysUntil(doc.validUntil, hoje) : undefined;

            return (
              <td key={type.id} className="px-3 py-4">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded ${
                    estado === "expired"
                      ? "bg-[var(--color-red-light)] text-[var(--color-red)]"
                      : estado === "missing"
                        ? "bg-[var(--color-yellow)]/20 text-[var(--color-yellow-dark)]"
                        : estado === "expiring"
                          ? "bg-[var(--color-brand-orange)]/20 text-[var(--color-orange-dark)]"
                          : estado === "waived"
                            ? "bg-[var(--color-brand-purple-dark)]/15 text-[var(--fg-2)]"
                            : "bg-[var(--color-brand-green)]/20 text-[var(--color-brand-green-dark)]"
                  }`}
                >
                  <Icon name={ICONE[estado]} type="solid" />
                  <span className="sr-only">
                    {type.name} — {documentStateLabel(estado, dias)}
                  </span>
                </span>
              </td>
            );
          })}
    </tr>
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
      title="Documentação da equipe"
      subtitle={
        documentacao && documentacao.rows.length > 0
          ? `${documentacao.rows.length} ${documentacao.rows.length === 1 ? "profissional" : "profissionais"}`
          : undefined
      }
      breadcrumb={[{ label: "Equipe", path: "/team" }, { label: "Documentação" }]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
