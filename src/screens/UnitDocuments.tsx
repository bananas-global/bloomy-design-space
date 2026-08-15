import { useMemo, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  DocumentState,
  DocumentType,
  UnitDocument,
  UnitDocumentsData,
} from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import { EmptyState, ErrorState, LoadingState } from "../components/primitives.js";
import { Button } from "../components/bloomy/Button.js";
import { Card } from "../components/bloomy/Card.js";
import { SectionHeader } from "../components/bloomy/Layout.js";
import { Table, type Coluna } from "../components/bloomy/Table.js";
import { Tag } from "../components/bloomy/Tag.js";
import { UNIT_DOCUMENT_TYPES } from "../fixtures/documents.js";
import {
  credentialStatusLabel,
  daysUntil,
  documentStateLabel,
  hasFile,
  unitCredentialStatus,
  unitDocumentState,
  unitMissingForInsurer,
} from "../rules/documents.js";

/**
 * A pasta de documentos da unidade.
 *
 * Parece a pasta do profissional e responde a outra pergunta. Lá quem cobra é o
 * convênio, e cada um exige o seu conjunto; aqui quem cobra é a vigilância
 * sanitária, e o conjunto é um só — doze documentos, iguais para todas as
 * operadoras.
 *
 * Duas coisas só existem neste escopo:
 *
 * 1. **Aguardando vigência.** Alvará e licença são emitidos antes de passarem a
 *    valer. Um documento que só vale no mês que vem não está válido nem vencido,
 *    e mostrá-lo como válido faria a unidade usá-lo antes da hora.
 *
 * 2. **A conta é do conjunto.** Onze documentos em ordem não compensam o
 *    décimo segundo: faltando o AVCB, a operadora não credencia o endereço.
 */
export function UnitDocuments({ context }: ScreenProps) {
  const { data, isLoading, error, permissions, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando os documentos da unidade" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  /**
   * Ver usa a permissão do resto da Estrutura; editar usa a da unidade.
   *
   * `units.list` é de admin apenas — o monólito compara com `"admin_clinic"`, um
   * papel que não existe na lista, e isso está registrado como divergência na
   * decisão 0002. Amarrar a leitura da pasta a essa permissão deixaria a
   * operação sem enxergar o alvará da própria unidade em que trabalha, por
   * causa de um defeito de policy que este repositório não deve reproduzir num
   * lugar novo.
   */
  if (!can("services.list")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso aos documentos da unidade"
        description="A pasta da unidade acompanha o restante da Estrutura. Fale com quem administra os acessos."
      />,
    );
  }

  const pasta = data as UnitDocumentsData | null;
  if (!pasta) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  return <Conteudo context={context} pasta={pasta} permissions={permissions} />;
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

/* ================================================================ linhas */

type Linha = {
  key: string;
  type?: DocumentType;
  doc?: UnitDocument;
  extra: number;
  standard: boolean;
  /** Nome canônico do slot, quando não há documento para dar o dele. */
  nome: string;
};

/**
 * Implementação de `standard-slot-comes-from-the-type` no escopo da unidade.
 *
 * O encaixe vem do tipo declarado. A alternativa que a proposta trazia —
 * reconhecer o slot por expressão regular sobre o nome — faz um documento sair
 * do lugar quando alguém corrige uma palavra do título: renomear “Laudo de
 * Potabilidade” para “Laudo de Água Potável 2026” reabriria uma pendência que
 * estava resolvida, sem nenhuma ação que explicasse a mudança.
 */
function montarLinhas(documents: UnitDocument[]): Linha[] {
  const linhas: Linha[] = [];

  for (const type of UNIT_DOCUMENT_TYPES) {
    const doMesmoTipo = documents.filter((doc) => doc.typeId === type.id);
    if (doMesmoTipo.length === 0) {
      linhas.push({ key: `lacuna-${type.id}`, type, extra: 0, standard: true, nome: type.name });
      continue;
    }
    doMesmoTipo.forEach((doc, indice) => {
      linhas.push({
        key: doc.id,
        type,
        doc,
        extra: indice === 0 ? doMesmoTipo.length - 1 : 0,
        standard: true,
        nome: doc.name,
      });
    });
  }

  for (const doc of documents) {
    if (UNIT_DOCUMENT_TYPES.some((type) => type.id === doc.typeId)) continue;
    linhas.push({ key: doc.id, doc, extra: 0, standard: false, nome: doc.name });
  }

  return linhas;
}

const TOM: Record<DocumentState | "not_in_force", "green" | "orange" | "red" | "yellow" | "brand" | "light-blue"> = {
  valid: "green",
  no_expiry: "green",
  expiring: "orange",
  expired: "red",
  missing: "yellow",
  waived: "brand",
  not_in_force: "light-blue",
};

function br(iso: string | undefined, locale: string | undefined): string {
  return iso ? formatDate(iso, locale) : "—";
}

/* ============================================================== conteúdo */

function Conteudo({
  context,
  pasta,
  permissions,
}: {
  context: ScreenProps["context"];
  pasta: UnitDocumentsData;
  permissions: string[];
}) {
  const { locale } = context;
  const hoje = pasta.now.slice(0, 10);
  const [aviso, setAviso] = useState("");
  const linhas = useMemo(() => montarLinhas(pasta.documents), [pasta.documents]);
  const podeEditar = permissions.includes("units.edit");

  const contagem = {
    pendente: linhas.filter((linha) => !hasFile(linha.doc)).length,
    emOrdem: linhas.filter((linha) => {
      const estado = unitDocumentState(linha.doc, hoje);
      return hasFile(linha.doc) && (estado === "valid" || estado === "no_expiry" || estado === "not_in_force");
    }).length,
    aVencer: linhas.filter((linha) => unitDocumentState(linha.doc, hoje) === "expiring").length,
    vencido: linhas.filter((linha) => unitDocumentState(linha.doc, hoje) === "expired").length,
  };

  const colunas: Coluna<Linha>[] = [
    {
      label: "Documento",
      render: (linha) => (
        <div>
          <p className="m-0 font-bold text-[var(--color-brand-purple-dark)]">
            {linha.nome}
            {linha.standard ? (
              <Etiqueta item="Padrão" variant="light-blue" className="ml-2" icon="fa-lock" />
            ) : (
              <Etiqueta item="Adicional" variant="brand" className="ml-2" />
            )}
          </p>
          <p className="m-0 text-sm">
            <Icon name={hasFile(linha.doc) ? "fa-file-pdf" : "fa-file"} className="mr-2" />
            {hasFile(linha.doc) ? linha.doc?.file : linha.doc ? "sem arquivo anexado" : linha.type?.hint}
          </p>
        </div>
      ),
    },
    { label: "Responsável", render: (linha) => linha.doc?.responsible ?? "—" },
    {
      label: "Vigência",
      render: (linha) =>
        linha.doc?.validFrom ? `a partir de ${br(linha.doc.validFrom, locale)}` : "—",
    },
    {
      label: "Expira em",
      render: (linha) =>
        linha.doc ? (linha.doc.validUntil ? br(linha.doc.validUntil, locale) : "sem validade") : "—",
    },
    {
      label: "Situação",
      render: (linha) => {
        const estado = unitDocumentState(linha.doc, hoje);
        const dias = linha.doc?.validUntil ? daysUntil(linha.doc.validUntil, hoje) : undefined;
        return <Etiqueta item={documentStateLabel(estado, dias)} variant={TOM[estado]} />;
      },
    },
    { label: "Últ. atualização", render: (linha) => br(linha.doc?.updatedAt, locale) },
    {
      label: "Compartilhado com",
      render: (linha) =>
        !linha.doc || linha.doc.sharedWith.length === 0 ? (
          <span className="text-[var(--fg-2)]">Não compartilhado</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {linha.doc.sharedWith.map((id) => (
              <Etiqueta
                key={id}
                item={pasta.insurers.find((item) => item.id === id)?.name ?? id}
                variant="light-blue"
              />
            ))}
          </div>
        ),
    },
  ];

  return wrap(
    context,
    <div className="space-y-6">
      <Card className="space-y-6">
        <SectionHeader
          variant="small"
          subtitle="Doze documentos padrão, iguais para todas as operadoras. Aqui quem cobra é a vigilância sanitária, e ela não negocia por convênio."
          actions={
            podeEditar ? (
              <Button className="espelho-do-sistema" variant="tint" leftIcon="fa-plus" onClick={() => setAviso("Formulário de documento aberto.")}>
                Adicionar documento
              </Button>
            ) : undefined
          }
        >
          Documentos da unidade
        </SectionHeader>

        <div className="flex flex-wrap gap-2">
          <Etiqueta item={`${contagem.pendente} ${contagem.pendente === 1 ? "pendente" : "pendentes"}`} variant="yellow" />
          <Etiqueta item={`${contagem.emOrdem} em ordem`} variant="green" />
          <Etiqueta item={`${contagem.aVencer} a vencer`} variant="orange" />
          <Etiqueta item={`${contagem.vencido} ${contagem.vencido === 1 ? "vencido" : "vencidos"}`} variant="red" />
        </div>

        <Table
          id="documentos-da-unidade"
          rows={linhas}
          rowId={(linha) => linha.key}
          cols={colunas}
          actions={(linha) => (
            <Button
              className="espelho-do-sistema"
              size="small"
              variant="ghost"
              leftIcon={linha.doc ? "fa-pen" : "fa-plus"}
              disabled={!podeEditar}
              onClick={() => setAviso(`${linha.nome} aberto para edição.`)}
            >
              {linha.doc ? "Editar" : "Anexar"}
            </Button>
          )}
        />
      </Card>

      <CredenciamentoDaUnidade pasta={pasta} hoje={hoje} />

      <p className="sr-only" role="status" aria-live="polite">
        {aviso}
      </p>
    </div>,
    pasta,
  );
}

/* ======================================================= credenciamento */

function CredenciamentoDaUnidade({ pasta, hoje }: { pasta: UnitDocumentsData; hoje: string }) {
  return (
    <Card className="space-y-4">
      <SectionHeader
        variant="small"
        subtitle="A conta é do conjunto: onze documentos em ordem não compensam o décimo segundo."
      >
        Credenciamento da unidade
      </SectionHeader>

      <ul
        aria-label="Credenciamento da unidade"
        className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2"
      >
        {pasta.insurers
          .filter((insurer) => insurer.kind !== "particular")
          .map((insurer) => {
            const status = unitCredentialStatus(
              pasta.documents,
              UNIT_DOCUMENT_TYPES,
              insurer.id,
              hoje,
            );
            const faltando = unitMissingForInsurer(
              pasta.documents,
              UNIT_DOCUMENT_TYPES,
              insurer.id,
              hoje,
            );

            return (
              <li
                key={insurer.id}
                className="rounded-2xl border border-[var(--color-brand-purple-dark)]/10 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="m-0 text-base font-bold text-[var(--color-brand-purple-dark)]">
                    {insurer.name}
                  </h2>
                  <Etiqueta
                    item={status === "credentialed" ? "Credenciada" : credentialStatusLabel(status)}
                    variant={
                      status === "credentialed"
                        ? "green"
                        : status === "in_credentialing"
                          ? "orange"
                          : "brand"
                    }
                  />
                </div>

                {faltando.length === 0 ? (
                  <p className="m-0 mt-3 text-sm text-[var(--fg-2)]">
                    Os doze documentos padrão estão válidos e compartilhados.
                  </p>
                ) : status === "not_credentialed" ? (
                  /* Sem nenhum compartilhamento, listar os doze não informa: a
                     pendência não é documento a documento, é o credenciamento
                     que nunca começou. */
                  <p className="m-0 mt-3 text-sm text-[var(--fg-2)]">
                    Nenhum documento foi compartilhado com esta operadora. O credenciamento começa
                    ao compartilhar o primeiro.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    <p className="m-0 text-sm font-bold text-[var(--color-brand-purple-dark)]">
                      <Icon name="fa-triangle-exclamation" className="mr-2 text-[var(--color-orange-dark)]" />
                      {faltando.length === 1
                        ? "Falta 1 documento"
                        : `Faltam ${faltando.length} documentos`}
                    </p>
                    <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-[var(--fg-2)]">
                      {faltando.map((typeId) => (
                        <li key={typeId}>{motivo(pasta.documents, typeId, insurer.id, hoje)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
      </ul>
    </Card>
  );
}

function motivo(
  documents: UnitDocument[],
  typeId: string,
  insurerId: string,
  hoje: string,
): string {
  const nome = UNIT_DOCUMENT_TYPES.find((item) => item.id === typeId)?.short ?? typeId;
  const doc = documents.find((item) => item.typeId === typeId);

  if (!doc) return `${nome} — nunca foi anexado`;
  if (!hasFile(doc)) return `${nome} — registro sem arquivo anexado`;
  if (unitDocumentState(doc, hoje) === "expired") return `${nome} — vencido`;
  if (!doc.sharedWith.includes(insurerId)) return `${nome} — não compartilhado com esta operadora`;
  return nome;
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  pasta?: UnitDocumentsData | null,
) {
  return (
    <AppShell
      context={context}
      title={pasta ? `Documentos · ${pasta.unit.name}` : "Documentos da unidade"}
      subtitle={pasta?.city}
      breadcrumb={[{ label: "Estrutura", path: "/structure" }, { label: "Documentos" }]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
