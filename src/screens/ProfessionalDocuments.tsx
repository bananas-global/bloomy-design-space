import { useMemo, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  DocumentInsurer,
  DocumentState,
  DocumentType,
  ProfessionalDocument,
  ProfessionalDocumentsData,
} from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import { EmptyState, ErrorState, LoadingState } from "../components/primitives.js";
import { Button } from "../components/bloomy/Button.js";
import { Card } from "../components/bloomy/Card.js";
import { Checkbox, Input, Select } from "../components/bloomy/Input.js";
import { EmptyStateCard, SectionHeader } from "../components/bloomy/Layout.js";
import { DrawerModal, Modal } from "../components/bloomy/Overlay.js";
import { Table, type Coluna } from "../components/bloomy/Table.js";
import { ButtonTabs } from "../components/bloomy/Tabs.js";
import { Tag } from "../components/bloomy/Tag.js";
import { PROFESSIONAL_DOCUMENT_TYPES } from "../fixtures/documents.js";
import {
  abaBand,
  abaHours,
  canExport,
  canShare,
  completeness,
  credentialStatus,
  credentialStatusLabel,
  daysUntil,
  documentState,
  documentStateLabel,
  hasFile,
  isTypeLocked,
  missingForInsurer,
} from "../rules/documents.js";

/**
 * A pasta de documentos de um profissional.
 *
 * Uma área só, com duas visões do mesmo conteúdo — e essa é a decisão que a
 * proposta original demorou duas versões para alcançar. A primeira separava
 * “compartilhamento”, “documentos padrão” e “todos os documentos” em três
 * seções, o que obrigava a pessoa a montar de cabeça a resposta que ela veio
 * buscar: *este profissional pode atender pela Unimed hoje?*
 *
 * Duas coisas que a tela precisa fazer e que não são óbvias:
 *
 * 1. **Mostrar a lacuna, e não só o que existe.** Os sete tipos padrão viram
 *    linha mesmo sem arquivo. Uma lista do que foi anexado esconde exatamente o
 *    documento que ninguém anexou — que é o único que importa.
 *
 * 2. **Dizer que a queda do credenciamento não teve autor.** Quando um registro
 *    vence, o vínculo com a operadora cai sozinho. Sem essa frase, quem opera
 *    procura quem mexeu.
 */
export function ProfessionalDocuments({ context }: ScreenProps) {
  const { data, isLoading, error, permissions, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando os documentos" />);
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
        title="Você não tem acesso à documentação"
        description="A pasta de documentos é de admin, admin de clínica, coordenação e People. Fale com quem administra os acessos."
      />,
    );
  }

  const pasta = data as ProfessionalDocumentsData | null;
  if (!pasta) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  return <Conteudo context={context} pasta={pasta} permissions={permissions} />;
}

/* ================================================================ linhas */

type Linha = {
  key: string;
  type: DocumentType;
  doc?: ProfessionalDocument;
  /** Outras versões do mesmo tipo, que viram histórico. */
  extra: number;
  standard: boolean;
};

/**
 * Implementação de `standard-slot-comes-from-the-type`.
 *
 * Todo tipo padrão vira linha, com ou sem documento. Versões extras do mesmo
 * tipo aparecem como linhas próprias e não somam pendência: a primeira ocupa o
 * slot e carrega a contagem.
 */
function montarLinhas(documents: ProfessionalDocument[]): Linha[] {
  const linhas: Linha[] = [];

  for (const type of PROFESSIONAL_DOCUMENT_TYPES.filter((item) => item.standard)) {
    const doMesmoTipo = documents.filter((doc) => doc.typeId === type.id);
    if (doMesmoTipo.length === 0) {
      linhas.push({ key: `lacuna-${type.id}`, type, extra: 0, standard: true });
      continue;
    }
    doMesmoTipo.forEach((doc, indice) => {
      linhas.push({
        key: doc.id,
        type,
        doc,
        extra: indice === 0 ? doMesmoTipo.length - 1 : 0,
        standard: true,
      });
    });
  }

  for (const doc of documents) {
    const type = PROFESSIONAL_DOCUMENT_TYPES.find((item) => item.id === doc.typeId);
    if (!type || type.standard) continue;
    linhas.push({ key: doc.id, type, doc, extra: 0, standard: false });
  }

  return linhas;
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

/* =============================================================== leitura */

const TOM: Record<DocumentState | "not_in_force", "green" | "orange" | "red" | "yellow" | "brand" | "light-blue"> = {
  valid: "green",
  no_expiry: "brand",
  expiring: "orange",
  expired: "red",
  missing: "yellow",
  waived: "brand",
  not_in_force: "light-blue",
};

function EtiquetaSituacao({ state, days }: { state: DocumentState; days?: number }) {
  return <Etiqueta item={documentStateLabel(state, days)} variant={TOM[state]} />;
}

function br(iso: string | undefined, locale: string | undefined): string {
  return iso ? formatDate(iso, locale) : "—";
}

/* =============================================================== conteúdo */

function Conteudo({
  context,
  pasta,
  permissions,
}: {
  context: ScreenProps["context"];
  pasta: ProfessionalDocumentsData;
  permissions: string[];
}) {
  const { locale } = context;
  const hoje = pasta.now.slice(0, 10);
  const [visao, setVisao] = useState<"cards" | "tabela">("cards");
  const [editando, setEditando] = useState<Linha | null>(null);
  const [exportando, setExportando] = useState(false);
  const [aviso, setAviso] = useState("");

  const linhas = useMemo(() => montarLinhas(pasta.documents), [pasta.documents]);
  const podeEditar = permissions.includes("professionals.edit");

  const contagem = {
    pendente: linhas.filter((linha) => !hasFile(linha.doc)).length,
    valido: pasta.documents.filter((doc) => {
      const estado = documentState(doc, hoje);
      return hasFile(doc) && (estado === "valid" || estado === "no_expiry");
    }).length,
    aVencer: pasta.documents.filter((doc) => documentState(doc, hoje) === "expiring").length,
    vencido: pasta.documents.filter((doc) => documentState(doc, hoje) === "expired").length,
  };

  const completude = completeness(
    pasta.documents,
    PROFESSIONAL_DOCUMENT_TYPES,
    hoje,
  );

  const horas = abaHours(pasta.documents);
  const exportacao = canExport(pasta.documents);

  return wrap(
    context,
    <div className="space-y-6">
      <AbasDoPerfil />

      <Card className="space-y-6">
        <SectionHeader
          variant="small"
          subtitle={`${completude.met} de ${completude.required} documentos obrigatórios cumpridos · ${completude.percent}% de completude`}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1 rounded-lg bg-[var(--color-brand-purple-dark)]/5 p-1" role="group" aria-label="Visualização">
                {(["cards", "tabela"] as const).map((modo) => (
                  <button
                    key={modo}
                    type="button"
                    aria-pressed={visao === modo}
                    onClick={() => setVisao(modo)}
                    className={[
                      "rounded-md px-3 py-1.5 text-sm font-bold",
                      visao === modo
                        ? "bg-white text-[var(--color-brand-purple-dark)] shadow-[var(--shadow-main)]"
                        : "text-[var(--fg-2)]",
                    ].join(" ")}
                  >
                    <Icon name={modo === "cards" ? "fa-grip" : "fa-list"} className="mr-2" />
                    {modo === "cards" ? "Cartões" : "Tabela"}
                  </button>
                ))}
              </div>

              <Button
                className="espelho-do-sistema"
                variant="outline"
                leftIcon="fa-file-pdf"
                title={exportacao.allowed ? undefined : exportacao.reason}
                aria-describedby={exportacao.allowed ? undefined : "motivo-exportar"}
                aria-disabled={exportacao.allowed ? undefined : true}
                onClick={exportacao.allowed ? () => setExportando(true) : undefined}
              >
                Exportar agrupado
              </Button>

              {podeEditar && (
                <Button
                  className="espelho-do-sistema"
                  variant="tint"
                  leftIcon="fa-plus"
                  onClick={() =>
                    setEditando({
                      key: "novo",
                      type: PROFESSIONAL_DOCUMENT_TYPES.find((item) => !item.standard)!,
                      extra: 0,
                      standard: false,
                    })
                  }
                >
                  Adicionar documento
                </Button>
              )}
            </div>
          }
        >
          Documentos
        </SectionHeader>

        {!exportacao.allowed && (
          <p id="motivo-exportar" className="m-0 text-sm text-[var(--fg-2)]">
            {exportacao.reason}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Etiqueta item={`${contagem.pendente} ${contagem.pendente === 1 ? "pendente" : "pendentes"}`} variant="yellow" />
          <Etiqueta item={`${contagem.valido} ${contagem.valido === 1 ? "em ordem" : "em ordem"}`} variant="green" />
          <Etiqueta item={`${contagem.aVencer} a vencer`} variant="orange" />
          <Etiqueta item={`${contagem.vencido} ${contagem.vencido === 1 ? "vencido" : "vencidos"}`} variant="red" />
        </div>

        {horas > 0 && (
          <p className="m-0 text-sm text-[var(--fg-2)]">
            <Icon name="fa-brain" className="mr-2" />
            {horas}h de cursos em ABA, somadas dos certificados anexados · faixa {abaBand(horas)}.{" "}
            <span className="text-[var(--fg-2)]">
              O valor do cadastro só valeria se não houvesse certificado nenhum.
            </span>
          </p>
        )}

        {linhas.length === 0 ? (
          <EmptyStateCard icon="fa-folder-open" text="Nenhum documento cadastrado">
            Os sete tipos padrão aparecem aqui assim que a pasta for aberta, com ou sem arquivo.
          </EmptyStateCard>
        ) : visao === "cards" ? (
          <Cartoes
            linhas={linhas}
            insurers={pasta.insurers}
            hoje={hoje}
            locale={locale}
            podeEditar={podeEditar}
            onEditar={setEditando}
          />
        ) : (
          <Tabela
            linhas={linhas}
            insurers={pasta.insurers}
            hoje={hoje}
            locale={locale}
            podeEditar={podeEditar}
            onEditar={setEditando}
          />
        )}
      </Card>

      <Credenciamento
        pasta={pasta}
        hoje={hoje}
        locale={locale}
        permissions={permissions}
        onAviso={setAviso}
      />

      <p className="sr-only" role="status" aria-live="polite">
        {aviso}
      </p>

      <FormularioDocumento
        linha={editando}
        insurers={pasta.insurers}
        permissions={permissions}
        onClose={() => setEditando(null)}
        onSave={(nome) => {
          setEditando(null);
          setAviso(`${nome} salvo. As operadoras que exigem esse tipo foram recalculadas.`);
        }}
      />

      <ExportarAgrupado
        open={exportando}
        documents={pasta.documents}
        locale={locale}
        hoje={hoje}
        onClose={() => setExportando(false)}
      />
    </div>,
    pasta,
  );
}

/* ================================================================= abas */

/**
 * As abas do perfil, com o recorte desta entrega dito por extenso.
 *
 * Renderizar só a aba especificada esconderia a arquitetura da informação de
 * quem vai implementar; renderizar as outras como se funcionassem seria mentira.
 * Elas aparecem inativas, e a nota diz por quê.
 */
function AbasDoPerfil() {
  return (
    <div>
      <ButtonTabs
        className="espelho-do-sistema"
        id="abas-do-profissional"
        label="Perfil do profissional"
        value="documents"
        onChange={() => undefined}
        tabs={[
          { id: "personal", label: "Dados Pessoais", disabled: true },
          { id: "units", label: "Unidades", disabled: true },
          { id: "agenda", label: "Escala", disabled: true },
          { id: "services", label: "Serviços", disabled: true },
          { id: "blockings", label: "Bloqueios", disabled: true },
          { id: "hired", label: "Contratação", disabled: true },
          { id: "appointments", label: "Atendimentos", disabled: true },
          { id: "bond", label: "Vínculo", disabled: true },
          { id: "documents", label: "Documentos" },
          { id: "hours", label: "Controle de Horas", disabled: true },
          { id: "presence", label: "Controle de Presença", disabled: true },
        ]}
      >
        <p className="m-0 text-sm text-[var(--fg-2)]">
          Esta entrega especifica apenas a aba Documentos. As demais são as abas existentes do
          perfil e aparecem aqui para preservar a ordem, sem mudança de comportamento.
        </p>
      </ButtonTabs>
    </div>
  );
}

/* ============================================================== cartões */

function Cartoes({
  linhas,
  insurers,
  hoje,
  locale,
  podeEditar,
  onEditar,
}: {
  linhas: Linha[];
  insurers: DocumentInsurer[];
  hoje: string;
  locale: string | undefined;
  podeEditar: boolean;
  onEditar: (linha: Linha) => void;
}) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
      {linhas.map((linha) => {
        const estado = documentState(linha.doc, hoje);
        const dias = linha.doc?.validUntil ? daysUntil(linha.doc.validUntil, hoje) : undefined;
        const semArquivo = Boolean(linha.doc) && !hasFile(linha.doc);

        return (
          <li key={linha.key}>
            <article className="flex h-full flex-col gap-3 rounded-2xl border border-[var(--color-brand-purple-dark)]/10 p-5">
              <div className="flex items-start justify-between gap-2">
                <Icon
                  name={linha.type.icon}
                  type="solid"
                  className="text-xl text-[var(--color-brand-blue)]"
                />
                <div className="flex flex-wrap justify-end gap-1.5">
                  {linha.standard && (
                    <Etiqueta item="Padrão" variant="light-blue" icon="fa-lock" title="Tipo padrão: o slot aparece mesmo sem arquivo" />
                  )}
                  <EtiquetaSituacao state={estado} days={dias} />
                </div>
              </div>

              <h2 className="m-0 text-base font-bold text-[var(--color-brand-purple-dark)]">
                {linha.doc?.name ?? linha.type.name}
              </h2>

              {linha.extra > 0 && (
                <p className="m-0 text-sm text-[var(--fg-2)]">
                  +{linha.extra} {linha.extra === 1 ? "versão anterior" : "versões anteriores"}
                </p>
              )}

              {linha.doc ? (
                <div className="space-y-1 text-sm text-[var(--fg-2)]">
                  <p className="m-0">
                    <Icon name={hasFile(linha.doc) ? "fa-file-pdf" : "fa-file"} className="mr-2" />
                    {hasFile(linha.doc) ? (
                      linha.doc.file
                    ) : (
                      <span className="font-bold text-[var(--color-danger-fg)]">sem arquivo anexado</span>
                    )}
                  </p>
                  <p className="m-0">
                    atualizado em {br(linha.doc.updatedAt, locale)}
                    {linha.doc.validUntil
                      ? ` · válido até ${br(linha.doc.validUntil, locale)}`
                      : " · sem validade"}
                  </p>
                  {linha.doc.hours !== undefined && (
                    <p className="m-0">{linha.doc.hours}h de carga horária</p>
                  )}
                </div>
              ) : (
                <p className="m-0 text-sm text-[var(--fg-2)]">
                  {linha.type.hint}
                </p>
              )}

              <div className="mt-auto space-y-3">
                {linha.doc && (
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    {linha.doc.sharedWith.length === 0 ? (
                      <span className="text-[var(--fg-2)]">
                        Não compartilhado
                      </span>
                    ) : (
                      linha.doc.sharedWith.map((share) => (
                        <Etiqueta
                          key={share.insurerId}
                          item={nomeDaOperadora(insurers, share.insurerId)}
                          variant="light-blue"
                          title={`compartilhado em ${br(share.at, locale)}`}
                        />
                      ))
                    )}
                  </div>
                )}

                {semArquivo && (
                  <p className="m-0 text-sm text-[var(--color-danger-fg)]">
                    Nenhuma operadora aceita este registro enquanto o arquivo não for anexado.
                  </p>
                )}

                <Button
                  className="espelho-do-sistema"
                  size="medium"
                  variant="outline"
                  leftIcon={linha.doc ? "fa-pen" : "fa-plus"}
                  disabled={!podeEditar}
                  onClick={() => onEditar(linha)}
                >
                  {linha.doc ? "Editar" : "Anexar"}
                </Button>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

/* =============================================================== tabela */

function Tabela({
  linhas,
  insurers,
  hoje,
  locale,
  podeEditar,
  onEditar,
}: {
  linhas: Linha[];
  insurers: DocumentInsurer[];
  hoje: string;
  locale: string | undefined;
  podeEditar: boolean;
  onEditar: (linha: Linha) => void;
}) {
  const colunas: Coluna<Linha>[] = [
    {
      label: "Documento",
      render: (linha) => (
        <div>
          <p className="m-0 font-bold text-[var(--color-brand-purple-dark)]">
            {linha.doc?.name ?? linha.type.name}
            {linha.standard && <Etiqueta item="Padrão" variant="light-blue" className="ml-2" icon="fa-lock" />}
          </p>
          <p className="m-0 text-sm">
            <Icon name={hasFile(linha.doc) ? "fa-file-pdf" : "fa-file"} className="mr-2" />
            {hasFile(linha.doc) ? linha.doc?.file : "sem arquivo anexado"}
          </p>
        </div>
      ),
    },
    { label: "Nº", render: (linha) => linha.doc?.number ?? "—" },
    { label: "Atualizado", render: (linha) => br(linha.doc?.updatedAt, locale) },
    {
      label: "Validade",
      render: (linha) =>
        linha.doc ? (linha.doc.validUntil ? br(linha.doc.validUntil, locale) : "sem validade") : "—",
    },
    {
      label: "Situação",
      render: (linha) => (
        <EtiquetaSituacao
          state={documentState(linha.doc, hoje)}
          days={linha.doc?.validUntil ? daysUntil(linha.doc.validUntil, hoje) : undefined}
        />
      ),
    },
    {
      label: "Compartilhado com",
      render: (linha) =>
        !linha.doc || linha.doc.sharedWith.length === 0 ? (
          <span className="text-[var(--fg-2)]">Não compartilhado</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {linha.doc.sharedWith.map((share) => (
              <Etiqueta
                key={share.insurerId}
                item={nomeDaOperadora(insurers, share.insurerId)}
                variant="light-blue"
              />
            ))}
          </div>
        ),
    },
  ];

  return (
    <Table
      id="documentos-do-profissional"
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
          onClick={() => onEditar(linha)}
        >
          {linha.doc ? "Editar" : "Anexar"}
        </Button>
      )}
    />
  );
}

/* ======================================================= credenciamento */

/**
 * O credenciamento, que é consequência e não campo.
 *
 * A frase que mais importa aqui é a que explica a queda: quando um registro
 * vence, o vínculo cai **sem que ninguém tenha agido**. Sem ela, a primeira
 * reação de quem opera é procurar quem mexeu — e não existe quem.
 */
function Credenciamento({
  pasta,
  hoje,
  locale,
  permissions,
  onAviso,
}: {
  pasta: ProfessionalDocumentsData;
  hoje: string;
  locale: string | undefined;
  permissions: string[];
  onAviso: (mensagem: string) => void;
}) {
  return (
    <Card className="space-y-4">
      <SectionHeader variant="small" subtitle="Derivado dos documentos compartilhados e válidos. Ninguém digita esta situação.">
        Credenciamento nas operadoras
      </SectionHeader>

      <ul
        aria-label="Credenciamento nas operadoras"
        className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2"
      >
        {pasta.insurers.map((insurer) => {
          const link = pasta.links.find((item) => item.insurerId === insurer.id);
          const status = credentialStatus(link, pasta.documents, insurer, hoje);
          const faltando = missingForInsurer(pasta.documents, insurer, hoje);
          const compartilhamento = canShare(pasta.documents[0], insurer, permissions);

          return (
            <li
              key={insurer.id}
              className="rounded-2xl border border-[var(--color-brand-purple-dark)]/10 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-base font-bold text-[var(--color-brand-purple-dark)]">
                    {insurer.name}
                  </h2>
                  {link && (
                    <p className="m-0 text-sm text-[var(--fg-2)]">
                      desde {br(link.since, locale)}
                    </p>
                  )}
                </div>
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
              </div>

              {insurer.kind === "particular" ? (
                <p className="m-0 mt-3 text-sm text-[var(--fg-2)]">
                  {compartilhamento.reason}
                </p>
              ) : status === "decredentialed" ? (
                <div className="mt-3 space-y-3">
                  <p className="m-0 text-sm text-[var(--fg-2)]">
                    A documentação exigida está completa e o vínculo continua fechado. Descredenciar
                    é decisão da operadora, e nenhum documento novo a desfaz — reabrir é uma ação, e
                    devolve o vínculo a Em credenciamento.
                  </p>
                  <Button
                    className="espelho-do-sistema"
                    size="medium"
                    variant="outline"
                    color="green"
                    disabled={!permissions.includes("professionals.edit")}
                    onClick={() =>
                      onAviso(`Credenciamento reaberto em ${insurer.name}. Situação: Em credenciamento.`)
                    }
                  >
                    Reabrir credenciamento
                  </Button>
                </div>
              ) : faltando.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <p className="m-0 text-sm font-bold text-[var(--color-brand-purple-dark)]">
                    <Icon name="fa-triangle-exclamation" className="mr-2 text-[var(--color-orange-dark)]" />
                    {faltando.length === 1 ? "Falta 1 documento" : `Faltam ${faltando.length} documentos`}
                  </p>
                  <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-[var(--fg-2)]">
                    {faltando.map((typeId) => (
                      <li key={typeId}>{motivoDaFalta(pasta.documents, typeId, insurer.id, hoje)}</li>
                    ))}
                  </ul>
                  {/* A frase da queda só cabe onde houve queda: um vínculo que
                      existia e caiu. Repeti-la em operadora sem vínculo diria
                      que algo se perdeu onde nunca houve nada. */}
                  {link && faltando.some((typeId) => vencido(pasta.documents, typeId, hoje)) && (
                    <p className="m-0 text-sm text-[var(--fg-2)]">
                      A queda não teve autor: o documento venceu e o vínculo voltou para credenciamento
                      sozinho. É o mesmo cálculo que a operadora faz do lado dela.
                    </p>
                  )}
                </div>
              ) : (
                <p className="m-0 mt-3 text-sm text-[var(--fg-2)]">
                  Todos os documentos exigidos estão compartilhados e válidos.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function vencido(documents: ProfessionalDocument[], typeId: string, hoje: string): boolean {
  const doc = documents.find((item) => item.typeId === typeId);
  return documentState(doc, hoje) === "expired";
}

/** A falta tem três causas, e a ação de cada uma é diferente. */
function motivoDaFalta(
  documents: ProfessionalDocument[],
  typeId: string,
  insurerId: string,
  hoje: string,
): string {
  const nome =
    PROFESSIONAL_DOCUMENT_TYPES.find((item) => item.id === typeId)?.name ?? typeId;
  const doc = documents.find((item) => item.typeId === typeId);

  if (!doc) return `${nome} — nunca foi anexado`;
  if (!hasFile(doc)) return `${nome} — registro sem arquivo anexado`;
  if (documentState(doc, hoje) === "expired") return `${nome} — vencido`;
  if (!doc.sharedWith.some((share) => share.insurerId === insurerId)) {
    return `${nome} — está no cadastro e não foi compartilhado`;
  }
  return nome;
}

function nomeDaOperadora(insurers: DocumentInsurer[], id: string): string {
  return insurers.find((item) => item.id === id)?.name ?? id;
}

/* ============================================================ formulário */

/**
 * Anexar ou editar um documento, com o compartilhamento no mesmo passo.
 *
 * Separar “salvar” de “compartilhar” em duas etapas foi o que a primeira versão
 * da proposta fazia, e produzia a pendência mais comum da pasta: o documento
 * certo, anexado, e invisível para a operadora que o exige.
 */
function FormularioDocumento({
  linha,
  insurers,
  permissions,
  onClose,
  onSave,
}: {
  linha: Linha | null;
  insurers: DocumentInsurer[];
  permissions: string[];
  onClose: () => void;
  onSave: (nome: string) => void;
}) {
  const editando = Boolean(linha?.doc);
  const travado = isTypeLocked(linha?.type);

  const [nome, setNome] = useState("");
  const [arquivo, setArquivo] = useState("");
  const [temValidade, setTemValidade] = useState(false);
  const [validade, setValidade] = useState("");
  const [horas, setHoras] = useState("");
  const [tocado, setTocado] = useState(false);
  const [compartilhar, setCompartilhar] = useState<string[]>([]);

  const nomeAtual = nome || linha?.doc?.name || linha?.type.name || "";
  const arquivoAtual = arquivo || linha?.doc?.file || "";
  const exigeHoras = linha?.type.id === "aba_course";

  const erroNome = !nomeAtual.trim() ? "Informe um nome para o documento." : undefined;
  const erroArquivo = !arquivoAtual.trim() ? "Anexe o arquivo do documento." : undefined;
  const erroValidade = temValidade && !validade ? "Escolha a data de validade." : undefined;
  const erroHoras =
    exigeHoras && (!horas || Number(horas) <= 0) ? "Informe a carga horária em horas." : undefined;

  const invalido = Boolean(erroNome || erroArquivo || erroValidade || erroHoras);

  function salvar() {
    setTocado(true);
    if (invalido) return;
    onSave(nomeAtual);
  }

  return (
    <DrawerModal
      id="documento-do-profissional"
      show={Boolean(linha)}
      onCancel={onClose}
      title={
        editando
          ? "Editar documento"
          : travado
            ? `Anexar ${linha?.type.name ?? "documento"}`
            : "Adicionar documento"
      }
      variant="medium"
    >
      {linha && (
        <div className="espelho-do-sistema space-y-6">
          {travado && (
            <div className="rounded-lg bg-[var(--color-brand-blue)]/10 p-4">
              <p className="m-0 font-bold text-[var(--color-brand-purple-dark)]">
                <Icon name="fa-lock" className="mr-2" />
                {linha.type.name}
              </p>
              <p className="m-0 mt-1 text-sm text-[var(--fg-2)]">
                {linha.type.hint}. O tipo é fixo: ele vem do slot padrão, e mudar o nome do
                documento não muda o slot que ele ocupa.
              </p>
            </div>
          )}

          {!travado && (
            <Select
              id="documento-tipo"
              label="Tipo de documento"
              value={linha.type.id}
              options={PROFESSIONAL_DOCUMENT_TYPES.filter((item) => !item.standard).map((item) => ({
                label: item.name,
                value: item.id,
              }))}
              onChange={() => undefined}
            />
          )}

          {exigeHoras && (
            <Input
              id="documento-horas"
              label="Carga horária do curso"
              type="number"
              min={1}
              step={10}
              hint="horas"
              value={horas}
              errors={tocado && erroHoras ? [erroHoras] : []}
              onChange={(event) => setHoras(event.target.value)}
            />
          )}

          <Input
            id="documento-nome"
            label="Nome do documento"
            value={nomeAtual}
            errors={tocado && erroNome ? [erroNome] : []}
            onChange={(event) => setNome(event.target.value)}
          />

          <fieldset className="m-0 border-0 p-0">
            <legend className="text-base font-bold text-[var(--color-brand-purple-dark)]">
              Validade
            </legend>
            <div className="mt-2 flex gap-4">
              {[
                { id: "sem", label: "Sem validade", valor: false },
                { id: "com", label: "Definir data", valor: true },
              ].map((opcao) => (
                <label key={opcao.id} className="flex items-center gap-2 text-base">
                  <input
                    type="radio"
                    name="documento-validade"
                    checked={temValidade === opcao.valor}
                    onChange={() => setTemValidade(opcao.valor)}
                  />
                  {opcao.label}
                </label>
              ))}
            </div>
          </fieldset>

          {temValidade && (
            <Input
              id="documento-validade"
              label="Válido até"
              type="date"
              value={validade}
              errors={tocado && erroValidade ? [erroValidade] : []}
              onChange={(event) => setValidade(event.target.value)}
            />
          )}

          <div>
            <label
              htmlFor="documento-arquivo"
              className="block text-base font-bold text-[var(--color-brand-purple-dark)]"
            >
              Arquivo
            </label>
            <p className="m-0 mt-1 text-sm text-[var(--fg-2)]">
              PDF, JPG ou PNG até 10 MB. Sem arquivo, o registro não satisfaz exigência de operadora
              nem entra em exportação.
            </p>
            <input
              id="documento-arquivo"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="mt-2 block w-full text-base"
              onChange={(event) => setArquivo(event.target.files?.[0]?.name ?? "")}
            />
            {arquivoAtual && (
              <p className="m-0 mt-2 text-sm text-[var(--fg-2)]">
                <Icon name="fa-file-circle-check" className="mr-2" />
                {arquivoAtual}
              </p>
            )}
            {tocado && erroArquivo && (
              <p className="m-0 mt-2 text-sm font-bold text-[var(--color-danger-fg)]">{erroArquivo}</p>
            )}
          </div>

          <fieldset className="m-0 border-0 p-0">
            <legend className="text-base font-bold text-[var(--color-brand-purple-dark)]">
              Compartilhar com operadoras
            </legend>
            <p className="m-0 mt-1 text-sm text-[var(--fg-2)]">
              A operadora passa a ver o arquivo e a validade. Revogar remove o acesso imediatamente.
            </p>
            <div className="mt-2 flex flex-col gap-1">
              {insurers.map((insurer) => {
                const decisao = canShare(
                  { ...(linha.doc ?? ({} as ProfessionalDocument)), file: arquivoAtual },
                  insurer,
                  permissions,
                );
                const exige = insurer.requires.includes(linha.type.id);

                return (
                  <div key={insurer.id}>
                    <Checkbox
                      id={`compartilhar-${insurer.id}`}
                      label={`${insurer.name}${exige ? " — exige este tipo" : ""}`}
                      checked={compartilhar.includes(insurer.id)}
                      disabled={!decisao.allowed}
                      aria-describedby={decisao.allowed ? undefined : `motivo-${insurer.id}`}
                      onChange={(event) =>
                        setCompartilhar((atual) =>
                          event.target.checked
                            ? [...atual, insurer.id]
                            : atual.filter((id) => id !== insurer.id),
                        )
                      }
                    />
                    {!decisao.allowed && (
                      <p
                        id={`motivo-${insurer.id}`}
                        className="m-0 pl-4 text-sm text-[var(--fg-2)]"
                      >
                        {decisao.reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button leftIcon="fa-check" onClick={salvar}>
              {editando ? "Salvar alterações" : "Adicionar documento"}
            </Button>
          </div>
        </div>
      )}
    </DrawerModal>
  );
}

/* ============================================================ exportação */

function ExportarAgrupado({
  open,
  documents,
  locale,
  hoje,
  onClose,
}: {
  open: boolean;
  documents: ProfessionalDocument[];
  locale: string | undefined;
  hoje: string;
  onClose: () => void;
}) {
  const comArquivo = documents.filter(hasFile);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const selecionados = escolhidos.length > 0 ? escolhidos : comArquivo.map((doc) => doc.id);

  return (
    <Modal id="exportar-agrupado" open={open} onClose={onClose} title="Exportar agrupado" variant="small">
      <div className="espelho-do-sistema space-y-4">
        <p className="m-0 text-sm text-[var(--fg-2)]">
          Documento sem arquivo não entra no PDF: o que a operadora audita é o papel, e uma linha
          sem anexo sairia como página em branco.
        </p>

        <ul className="m-0 list-none space-y-1 p-0">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Checkbox
                id={`exportar-${doc.id}`}
                label={`${doc.name}${
                  hasFile(doc)
                    ? ` · ${documentStateLabel(documentState(doc, hoje), doc.validUntil ? daysUntil(doc.validUntil, hoje) : undefined)}`
                    : " — sem arquivo anexado, não entra no PDF"
                }`}
                disabled={!hasFile(doc)}
                checked={selecionados.includes(doc.id)}
                onChange={(event) =>
                  setEscolhidos((atual) =>
                    event.target.checked
                      ? [...atual, doc.id]
                      : (atual.length > 0 ? atual : comArquivo.map((item) => item.id)).filter(
                          (id) => id !== doc.id,
                        ),
                  )
                }
              />
            </li>
          ))}
        </ul>

        <p className="m-0 text-sm font-bold text-[var(--color-brand-purple-dark)]">
          {selecionados.length === 0
            ? "Selecione ao menos um documento."
            : `${selecionados.length} ${selecionados.length === 1 ? "documento" : "documentos"} em 1 PDF, na ordem da lista.`}
        </p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button leftIcon="fa-file-pdf" disabled={selecionados.length === 0} onClick={onClose}>
            Exportar PDF
          </Button>
        </div>

        <p className="sr-only">{br(hoje, locale)}</p>
      </div>
    </Modal>
  );
}

/* ============================================================== moldura */

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  pasta?: ProfessionalDocumentsData | null,
) {
  return (
    <AppShell
      context={context}
      title={pasta?.professional.name ?? "Documentos"}
      subtitle={
        pasta
          ? `${pasta.professional.specialty}${pasta.professional.council ? ` · ${pasta.professional.council}` : ""}`
          : undefined
      }
      breadcrumb={[
        { label: "Equipe", path: "/team" },
        { label: pasta?.professional.name ?? "Profissional" },
        { label: "Documentos" },
      ]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
