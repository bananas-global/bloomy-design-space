import { useMemo, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type { UnitListData, UnitListing } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { EmptyState, ErrorState, LoadingState } from "../components/primitives.js";
import { LinkButton } from "../components/bloomy/Action.js";
import { Card } from "../components/bloomy/Card.js";
import { SimpleForm } from "../components/bloomy/Feedback.js";
import { Input } from "../components/bloomy/Input.js";
import { MetaInfo, SectionHeader } from "../components/bloomy/Layout.js";
import { Table, type Coluna } from "../components/bloomy/Table.js";

/**
 * Lista de unidades.
 *
 * Espelho de `/backoffice/unidades`: cartão, cabeçalho grande, quatro filtros em
 * grade e a tabela com clique na linha. A paginação do original não entra —
 * decisão 0006.
 *
 * Origem: `lib/bloomy_web/backoffice/live/unit_live/index.ex:8-66`.
 */
export function UnitList({ context }: ScreenProps) {
  const { data, isLoading, error, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as unidades" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("services.list")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso às unidades"
        description="A lista de unidades acompanha o restante da Estrutura. Fale com quem administra os acessos."
      />,
    );
  }

  const lista = data as UnitListData | null;
  if (!lista) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  return <Conteudo context={context} lista={lista} />;
}

const FILTROS = [
  { id: "name", label: "Nome" },
  { id: "cnpj", label: "CNPJ" },
  { id: "cnes", label: "CNES" },
  { id: "city", label: "Cidade" },
] as const;

function Conteudo({ context, lista }: { context: ScreenProps["context"]; lista: UnitListData }) {
  const [filtros, setFiltros] = useState<Record<string, string>>({});

  const linhas = useMemo(
    () =>
      lista.units.filter((unidade) =>
        FILTROS.every(({ id }) => {
          const busca = (filtros[id] ?? "").trim().toLowerCase();
          if (!busca) return true;
          const campo = {
            name: unidade.name,
            cnpj: unidade.cnpj,
            cnes: unidade.cnes,
            city: unidade.city,
          }[id];
          return campo.toLowerCase().includes(busca);
        }),
      ),
    [lista.units, filtros],
  );

  const colunas: Coluna<UnitListing>[] = [
    { label: "Nome", render: (unidade) => unidade.name },
    { label: "CNPJ", render: (unidade) => unidade.cnpj },
    { label: "CNES", render: (unidade) => unidade.cnes },
    {
      label: "Endereço",
      render: (unidade) =>
        `${unidade.street}, ${unidade.number}${unidade.complement ? ` - ${unidade.complement}` : ""}`,
    },
    { label: "Cidade", render: (unidade) => unidade.city },
    { label: "Ativa?", render: (unidade) => (unidade.active ? "Sim" : "Não") },
  ];

  return wrap(
    context,
    <Card className="space-y-4">
      <div className="mb-4 flex flex-row flex-wrap items-center justify-between gap-2">
        <SectionHeader variant="large">Unidades</SectionHeader>
        <LinkButton className="espelho-do-sistema" navigate="#" rightIcon="fa-plus">
          Nova unidade
        </LinkButton>
      </div>

      <SimpleForm className="espelho-do-sistema">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {FILTROS.map(({ id, label }) => (
            <Input
              key={id}
              id={`filtro-${id}`}
              label={label}
              value={filtros[id] ?? ""}
              onChange={(event) =>
                setFiltros((atual) => ({ ...atual, [id]: event.target.value }))
              }
            />
          ))}
        </div>
      </SimpleForm>

      <div className="mt-4">
        <Table
          id="units"
          rows={linhas}
          rowId={(unidade) => unidade.id}
          cols={colunas}
          onRowClick={(unidade) => {
            window.location.assign(
              `/structure/${unidade.id}/documents${window.location.search}`,
            );
          }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <MetaInfo currentOffset={0} pageSize={linhas.length} totalCount={linhas.length} />
      </div>
    </Card>,
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Unidades"
      breadcrumb={[{ label: "Unidades" }]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
