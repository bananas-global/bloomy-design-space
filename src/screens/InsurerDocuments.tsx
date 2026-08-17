import { useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type { InsurerDocumentsData, TeamDocumentationRow } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import { EmptyState, ErrorState, LoadingState } from "../components/primitives.js";
import { Button } from "../components/bloomy/Button.js";
import { Card } from "../components/bloomy/Card.js";
import { Avatar, SectionHeader } from "../components/bloomy/Layout.js";
import { Table, type Coluna } from "../components/bloomy/Table.js";
import { ButtonTabs } from "../components/bloomy/Tabs.js";
import { Tag } from "../components/bloomy/Tag.js";
import { UNIT_DOCUMENT_TYPES } from "../fixtures/documents.js";
import {
  abaBand,
  abaHours,
  credentialStatus,
  credentialStatusLabel,
  hasFile,
  missingForInsurer,
  unitCredentialStatus,
  unitMissingForInsurer,
} from "../rules/documents.js";

/**
 * A ficha da operadora — aba Documentos.
 *
 * A mesma pasta vista do outro lado: aqui a pergunta não é "o que falta para a
 * Marina", é "quem desta clínica eu aceito". Por isso o escopo alterna entre
 * profissionais e unidades.
 */
export function InsurerDocuments({ context }: ScreenProps) {
  const { data, isLoading, error, permissions, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a operadora" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("health_cares.show")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso à operadora"
        description="A ficha da operadora é de quem administra convênios. Fale com quem administra os acessos."
      />,
    );
  }

  const ficha = data as InsurerDocumentsData | null;
  if (!ficha) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  return <Conteudo context={context} ficha={ficha} permissions={permissions} />;
}

function Etiqueta(props: React.ComponentProps<typeof Tag>) {
  return (
    <Tag {...props} className={["espelho-do-sistema", props.className].filter(Boolean).join(" ")} />
  );
}

const TOM = {
  credentialed: "green",
  in_credentialing: "light-blue",
  not_credentialed: "brand",
  decredentialed: "red",
} as const;

function Conteudo({
  context,
  ficha,
  permissions,
}: {
  context: ScreenProps["context"];
  ficha: InsurerDocumentsData;
  permissions: string[];
}) {
  const hoje = ficha.now.slice(0, 10);
  const [escopo, setEscopo] = useState<"professionals" | "units">("professionals");
  const [aviso, setAviso] = useState("");
  const podeEditar = permissions.includes("health_cares.edit");

  const situacaoDe = (linha: TeamDocumentationRow) =>
    credentialStatus(
      linha.links.find((item) => item.insurerId === ficha.insurer.id),
      linha.documents,
      ficha.insurer,
      hoje,
    );

  const contagem = {
    naoCredenciado: ficha.professionals.filter((l) => situacaoDe(l) === "not_credentialed").length,
    emCredenciamento: ficha.professionals.filter((l) => situacaoDe(l) === "in_credentialing").length,
    ativo: ficha.professionals.filter((l) => situacaoDe(l) === "credentialed").length,
    descredenciado: ficha.professionals.filter((l) => situacaoDe(l) === "decredentialed").length,
  };

  const unidadesCredenciadas = ficha.units.filter(
    (item) =>
      unitCredentialStatus(item.documents, UNIT_DOCUMENT_TYPES, ficha.insurer.id, hoje) ===
      "credentialed",
  ).length;

  const colunasProfissionais: Coluna<TeamDocumentationRow>[] = [
    {
      label: "Profissional",
      render: (linha) => (
        <div>
          <p className="m-0 font-bold text-[var(--color-brand-purple-dark)]">
            {linha.professional.name}
          </p>
          <p className="m-0 text-sm text-[var(--fg-2)]">
            {linha.professional.active ? "" : "inativo na clínica"}
          </p>
        </div>
      ),
    },
    { label: "Especialidade", render: (linha) => linha.professional.specialty },
    {
      label: "Carga ABA",
      render: (linha) => {
        const horas = abaHours(linha.documents);
        return (
          <div>
            <p className="m-0 font-bold text-[var(--color-brand-purple-dark)]">{horas}h</p>
            <p className="m-0 text-sm text-[var(--fg-2)]">{abaBand(horas)}</p>
          </div>
        );
      },
    },
    {
      label: "Formações especiais",
      render: (linha) => {
        const formacoes = linha.documents
          .filter((doc) => doc.typeId === "special_training" && doc.training)
          .map((doc) => doc.training as string);
        return formacoes.length === 0 ? (
          <span className="text-[var(--fg-2)]">—</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {formacoes.map((nome) => (
              <Etiqueta key={nome} item={nome} variant="light-purple" />
            ))}
          </div>
        );
      },
    },
    {
      label: "Credenciamento",
      render: (linha) => {
        const situacao = situacaoDe(linha);
        return <Etiqueta item={credentialStatusLabel(situacao)} variant={TOM[situacao]} />;
      },
    },
    {
      label: "Documentos",
      render: (linha) => {
        const compartilhados = linha.documents.filter(
          (doc) => hasFile(doc) && doc.sharedWith.some((s) => s.insurerId === ficha.insurer.id),
        ).length;
        const faltando = missingForInsurer(linha.documents, ficha.insurer, hoje).length;
        return (
          <div className="flex items-center gap-2">
            <span>{compartilhados}</span>
            {faltando > 0 && (
              <span className="text-sm font-bold text-[var(--color-orange-dark)]">
                <Icon name="fa-triangle-exclamation" className="mr-1" />
                falta {faltando}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const colunasUnidades: Coluna<InsurerDocumentsData["units"][number]>[] = [
    {
      label: "Unidade",
      render: (item) => (
        <span className="font-bold text-[var(--color-brand-purple-dark)]">{item.unit.name}</span>
      ),
    },
    { label: "Cidade", render: (item) => item.city },
    {
      label: "Documentos compartilhados",
      render: (item) =>
        String(item.documents.filter((doc) => doc.sharedWith.includes(ficha.insurer.id)).length),
    },
    {
      label: "Pendências",
      render: (item) => {
        const faltando = unitMissingForInsurer(
          item.documents,
          UNIT_DOCUMENT_TYPES,
          ficha.insurer.id,
          hoje,
        ).length;
        return faltando === 0 ? (
          <span className="text-[var(--fg-2)]">—</span>
        ) : (
          <span className="text-sm font-bold text-[var(--color-orange-dark)]">
            <Icon name="fa-triangle-exclamation" className="mr-1" />
            falta {faltando}
          </span>
        );
      },
    },
    {
      label: "Credenciamento",
      render: (item) => {
        const situacao = unitCredentialStatus(
          item.documents,
          UNIT_DOCUMENT_TYPES,
          ficha.insurer.id,
          hoje,
        );
        return (
          <Etiqueta
            item={situacao === "credentialed" ? "Credenciada" : credentialStatusLabel(situacao)}
            variant={TOM[situacao]}
          />
        );
      },
    },
  ];

  return wrap(
    context,
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar title={ficha.insurer.name} size="large" />
          <div>
            <h1 className="m-0 text-2xl font-bold text-[var(--color-brand-purple-dark)]">
              {ficha.insurer.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Etiqueta item="Ativa" variant="green" icon="fa-circle-check" />
              <Etiqueta
                item={ficha.insurer.kind === "particular" ? "Particular" : "Plano de saúde"}
                variant="light-blue"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 text-sm text-[var(--fg-2)]">
          {ficha.ans && (
            <span>
              <Icon name="fa-hashtag" className="mr-2" />
              ANS {ficha.ans}
            </span>
          )}
          <span>
            <Icon name="fa-user-doctor" className="mr-2" />
            {contagem.ativo} de {ficha.professionals.length} credenciados
          </span>
          <span>
            <Icon name="fa-hospital" className="mr-2" />
            {unidadesCredenciadas} de {ficha.units.length} unidades credenciadas
          </span>
        </div>
      </Card>

      <ButtonTabs
        className="espelho-do-sistema"
        id="abas-da-operadora"
        label="Ficha da operadora"
        value="docs"
        onChange={() => undefined}
        tabs={[
          { id: "data", label: "Dados da Operadora", disabled: true },
          { id: "services", label: "Serviços e valores", disabled: true },
          { id: "docs", label: "Documentos" },
          { id: "patients", label: "Pacientes vinculados", disabled: true },
          { id: "authorizations", label: "Guias e autorizações", disabled: true },
        ]}
      >
        <Card className="space-y-6">
          <SectionHeader
            variant="small"
            actions={
              <div
                className="inline-flex gap-1 rounded-xl bg-[var(--color-brand-purple-dark)]/5 p-1"
                role="group"
                aria-label="Escopo dos documentos"
              >
                {(
                  [
                    ["professionals", "Profissionais", `${contagem.ativo} de ${ficha.professionals.length} credenciados`],
                    ["units", "Unidades", `${unidadesCredenciadas} de ${ficha.units.length} credenciadas`],
                  ] as const
                ).map(([id, rotulo, resumo]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={escopo === id}
                    onClick={() => setEscopo(id)}
                    className={`rounded-lg px-3 py-2 text-sm font-bold ${
                      escopo === id
                        ? "bg-white text-[var(--color-brand-purple-dark)] shadow-[var(--shadow-main)]"
                        : "text-[var(--fg-2)]"
                    }`}
                  >
                    {rotulo}
                    <span className="ml-2 font-normal text-[var(--fg-2)]">{resumo}</span>
                  </button>
                ))}
              </div>
            }
          >
            Documentos
          </SectionHeader>

          {escopo === "professionals" ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Etiqueta item={`${contagem.naoCredenciado} não credenciados`} variant="brand" />
                <Etiqueta item={`${contagem.emCredenciamento} em credenciamento`} variant="light-blue" />
                <Etiqueta item={`${contagem.ativo} ativos`} variant="green" />
                <Etiqueta item={`${contagem.descredenciado} descredenciados`} variant="red" />
              </div>

              <Table
                id="profissionais-da-operadora"
                rows={ficha.professionals}
                rowId={(linha) => linha.professional.id}
                cols={colunasProfissionais}
                actions={(linha) =>
                  situacaoDe(linha) === "not_credentialed" ? (
                    <Button
                      className="espelho-do-sistema"
                      size="small"
                      variant="tint"
                      leftIcon="fa-user-plus"
                      disabled={!podeEditar}
                      onClick={() =>
                        setAviso(
                          `${linha.professional.name} habilitado em ${ficha.insurer.name}. Compartilhe os documentos exigidos.`,
                        )
                      }
                    >
                      Habilitar
                    </Button>
                  ) : (
                    <Button
                      className="espelho-do-sistema"
                      size="small"
                      variant="ghost"
                      leftIcon="fa-share-nodes"
                      disabled={!podeEditar}
                      onClick={() => setAviso(`Compartilhamento de ${linha.professional.name} aberto.`)}
                    >
                      Compartilhamento
                    </Button>
                  )
                }
              />
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Etiqueta
                  item={`${ficha.units.length - unidadesCredenciadas} pendentes`}
                  variant="light-blue"
                />
                <Etiqueta item={`${unidadesCredenciadas} credenciadas`} variant="green" />
              </div>

              <Table
                id="unidades-da-operadora"
                rows={ficha.units}
                rowId={(item) => item.unit.id}
                cols={colunasUnidades}
                actions={(item) => (
                  <Button
                    className="espelho-do-sistema"
                    size="small"
                    variant="ghost"
                    leftIcon="fa-share-nodes"
                    disabled={!podeEditar}
                    onClick={() => setAviso(`Documentos da ${item.unit.name} abertos.`)}
                  >
                    {podeEditar ? "Gerenciar documentos" : "Ver documentos"}
                  </Button>
                )}
              />
            </>
          )}
        </Card>
      </ButtonTabs>

      <p className="sr-only" role="status" aria-live="polite">
        {aviso}
      </p>
    </div>,
    ficha,
  );
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  ficha?: InsurerDocumentsData | null,
) {
  return (
    <AppShell
      context={context}
      title={ficha?.insurer.name ?? "Operadora"}
      breadcrumb={[
        { label: "Operadoras" },
        { label: ficha?.insurer.name ?? "Operadora" },
        { label: "Documentos" },
      ]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
