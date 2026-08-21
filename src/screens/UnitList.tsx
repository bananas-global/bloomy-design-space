import { useMemo, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  DocumentState,
  DocumentType,
  UnitListData,
  UnitListing,
} from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { EmptyState, ErrorState, LoadingState } from "../components/primitives.js";
import { Button } from "../components/bloomy/Button.js";
import { Card } from "../components/bloomy/Card.js";
import { Input, Select } from "../components/bloomy/Input.js";
import { Progress, SectionHeader } from "../components/bloomy/Layout.js";
import { Table, type Coluna } from "../components/bloomy/Table.js";
import { ButtonTabs, type ButtonTab } from "../components/bloomy/Tabs.js";
import { Tag, type TagVariant } from "../components/bloomy/Tag.js";
import {
  UNIT_DOCUMENT_GROUPS,
  UNIT_DOCUMENT_TYPES,
  unitTypesOfGroup,
} from "../fixtures/documents.js";
import {
  completeness,
  daysUntil,
  documentStateLabel,
  hasFile,
  unitDocumentState,
} from "../rules/documents.js";

/**
 * Unidades — uma tela, duas abas.
 *
 * Cadastro é o espelho de `/backoffice/unidades`: os quatro filtros e as seis
 * colunas de lá, na mesma ordem. Documentação não existe no monólito e é a mesma
 * decisão da lista de profissionais (0015): a fila de papel pendente é uma
 * pergunta sobre a lista inteira, e responder por unidade obriga a abrir doze
 * pastas para descobrir qual delas tem o alvará vencido.
 *
 * Origem do Cadastro: `lib/bloomy_web/backoffice/live/unit_live/index.ex:8-66`.
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

/* ============================================================== etiquetas */

/** `tag/1` traz a paleta do monólito, contraste incluído — ver decisão 0001. */
function Etiqueta(props: React.ComponentProps<typeof Tag>) {
  return (
    <Tag {...props} className={["espelho-do-sistema", props.className].filter(Boolean).join(" ")} />
  );
}

const TOM: Record<DocumentState | "not_in_force", TagVariant> = {
  valid: "green",
  no_expiry: "green",
  expiring: "orange",
  expired: "red",
  missing: "yellow",
  waived: "brand",
  not_in_force: "light-blue",
};

/** Severidade primeiro: é a ordem da fila de trabalho, não a de leitura. */
const ORDEM: (DocumentState | "not_in_force")[] = [
  "expired",
  "missing",
  "expiring",
  "not_in_force",
  "waived",
  "valid",
];

/* ================================================================ resumo */

/**
 * Estado de um tipo para uma unidade. Registro sem arquivo é ausência.
 *
 * `unitDocumentState` traz o estado a mais deste escopo — `not_in_force`, o
 * alvará emitido que só passa a valer no mês que vem. Ele não é pendência: é um
 * documento em ordem cuja vigência ainda não começou.
 */
function estadoDe(
  unidade: UnitListing,
  tipo: DocumentType,
  hoje: string,
): DocumentState | "not_in_force" {
  const doc = unidade.documents.find((item) => item.typeId === tipo.id);
  const estado = unitDocumentState(doc, hoje);
  if (estado !== "waived" && doc && !hasFile(doc)) return "missing";
  return estado;
}

function rollup(unidade: UnitListing, tipos: DocumentType[], hoje: string) {
  const contagem = new Map<DocumentState | "not_in_force", number>();
  for (const tipo of tipos) {
    const estado = estadoDe(unidade, tipo, hoje);
    contagem.set(estado, (contagem.get(estado) ?? 0) + 1);
  }
  const pendencia = (["expired", "missing", "expiring"] as const).some((estado) =>
    contagem.has(estado),
  );
  return { contagem, emDia: !pendencia };
}

function Rollup({
  unidade,
  tipos,
  hoje,
}: {
  unidade: UnitListing;
  tipos: DocumentType[];
  hoje: string;
}) {
  const { contagem, emDia } = rollup(unidade, tipos, hoje);

  if (emDia) return <Etiqueta item="em dia" variant="green" icon="fa-check" />;

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

/**
 * A célula de um tipo, quando a categoria abre coluna por documento.
 *
 * Igual à da matriz de profissionais, com o estado a mais: o azul-claro é o
 * documento aguardando vigência, que não é falta nem está valendo.
 */
function Celula({
  estado,
  obrigatorio,
  dias,
}: {
  estado: DocumentState | "not_in_force";
  obrigatorio: boolean;
  dias?: number;
}) {
  const aparencia: { variant: TagVariant; icon: string } =
    estado === "valid" || estado === "no_expiry"
      ? { variant: "green", icon: "fa-check" }
      : estado === "expiring"
        ? { variant: "orange", icon: "fa-clock" }
        : estado === "not_in_force"
          ? { variant: "light-blue", icon: "fa-hourglass-start" }
          : estado === "expired"
            ? { variant: "red", icon: "fa-xmark" }
            : estado === "waived"
              ? { variant: "brand", icon: "fa-ban" }
              : obrigatorio
                ? { variant: "red", icon: "fa-xmark" }
                : { variant: "brand", icon: "fa-minus" };

  const rotulo =
    estado === "missing" && !obrigatorio
      ? "Pendente — não obrigatório"
      : documentStateLabel(estado, dias);

  return (
    <span className="inline-flex items-center">
      <Etiqueta item="" variant={aparencia.variant} icon={aparencia.icon} title={rotulo} />
      <span className="sr-only">{rotulo}</span>
    </span>
  );
}

/* ================================================================== nome */

/**
 * A coluna do nome, com a situação embutida.
 *
 * Mesma decisão da lista de profissionais: a bolinha entra aqui em vez de ocupar
 * uma coluna de 24px, e centraliza na linha do nome. A unidade tem dois estados,
 * não três — ela não tem data de saída marcada.
 */
function Nome({ unidade }: { unidade: UnitListing }) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          unidade.active ? "bg-[var(--color-brand-green)]" : "bg-[var(--color-red)]"
        }`}
      />
      <a
        href={hrefDaPasta(unidade.id)}
        // `inline-block py-1` e `min-w-6`: o nome tem 18px de caixa de linha, e
        // o alvo de toque mínimo é 24 nas duas direções. A largura importa aqui —
        // "Itu" tem 20px de texto.
        className="inline-block min-w-6 rounded py-1 font-bold text-[var(--color-brand-purple-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]"
      >
        {unidade.name}
      </a>
    </div>
  );
}

/** A pasta da unidade, com a busca da URL — que carrega cenário e fixture. */
function hrefDaPasta(id: string): string {
  const busca = typeof window === "undefined" ? "" : window.location.search;
  return `/structure/${id}/documents${busca}`;
}

function abrirPasta(unidade: UnitListing) {
  window.location.assign(hrefDaPasta(unidade.id));
}

/* ============================================================== conteúdo */

type Aba = "cadastro" | "documentacao";

function Conteudo({ context, lista }: { context: ScreenProps["context"]; lista: UnitListData }) {
  const hoje = lista.now.slice(0, 10);
  const podeCriar = context.can("units.edit");
  const [aba, setAba] = useState<Aba>("cadastro");

  const abas: ButtonTab<Aba>[] = [
    { id: "cadastro", label: "Cadastro", icon: "fa-hospital" },
    { id: "documentacao", label: "Documentação", icon: "fa-folder-open" },
  ];

  return wrap(
    context,
    <Card>
      <ButtonTabs
        className="espelho-do-sistema"
        id="abas-de-unidades"
        label="Visões da lista de unidades"
        tabs={abas}
        value={aba}
        onChange={setAba}
        header={<SectionHeader variant="large">Unidades</SectionHeader>}
        actions={
          <Button className="espelho-do-sistema" rightIcon="fa-plus" disabled={!podeCriar}>
            Nova unidade
          </Button>
        }
      >
        {lista.units.length === 0 ? (
          <EmptyState
            title="Nenhuma unidade cadastrada"
            description="A lista aparece assim que a primeira unidade for criada."
          />
        ) : aba === "cadastro" ? (
          <AbaCadastro unidades={lista.units} />
        ) : (
          <AbaDocumentacao unidades={lista.units} hoje={hoje} />
        )}
      </ButtonTabs>
    </Card>,
  );
}

/** Rodapé de contagem. `pagination/1` não foi portado — decisão 0006. */
function Contagem({ mostrando, total }: { mostrando: number; total: number }) {
  return (
    <p className="m-0 text-sm text-[var(--fg-2)]">
      Mostrando {mostrando} de {total} {total === 1 ? "unidade" : "unidades"}
    </p>
  );
}

/* ============================================================== cadastro */

/** Os quatro campos do filtro real, na ordem de lá. */
const FILTROS = [
  { id: "name", label: "Nome" },
  { id: "cnpj", label: "CNPJ" },
  { id: "cnes", label: "CNES" },
  { id: "city", label: "Cidade" },
] as const;

function AbaCadastro({ unidades }: { unidades: UnitListing[] }) {
  const [filtros, setFiltros] = useState<Record<string, string>>({});

  const visiveis = useMemo(
    () =>
      unidades.filter((unidade) =>
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
    [unidades, filtros],
  );

  const colunas: Coluna<UnitListing>[] = [
    {
      id: "nome",
      label: "Nome",
      sticky: true,
      className: "min-w-56",
      render: (unidade) => <Nome unidade={unidade} />,
    },
    { label: "CNPJ", render: (unidade) => unidade.cnpj },
    { label: "CNES", render: (unidade) => unidade.cnes },
    {
      label: "Endereço",
      render: (unidade) =>
        `${unidade.street}, ${unidade.number}${unidade.complement ? ` - ${unidade.complement}` : ""}`,
    },
    { label: "Cidade", render: (unidade) => unidade.city },
    {
      // Etiqueta, e não o "Sim"/"Não" solto do original. A coluna pergunta e a
      // cor responde antes da leitura, que é o que a lista de cinco unidades
      // com uma inativa precisa.
      label: "Ativa?",
      render: (unidade) => (
        <Etiqueta
          item={unidade.active ? "Sim" : "Não"}
          variant={unidade.active ? "green" : "red"}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 lg:grid-cols-4">
        {FILTROS.map(({ id, label }) => (
          <Input
            key={id}
            id={`filtro-${id}`}
            label={label}
            placeholder={id === "name" ? "Buscar por nome" : undefined}
            value={filtros[id] ?? ""}
            onChange={(evento) => setFiltros((atual) => ({ ...atual, [id]: evento.target.value }))}
          />
        ))}
      </div>

      <Table
        id="unidades-cadastro"
        rows={visiveis}
        rowId={(unidade) => unidade.id}
        cols={colunas}
        onRowClick={abrirPasta}
      />

      <Contagem mostrando={visiveis.length} total={unidades.length} />
    </div>
  );
}

/* =========================================================== documentação */

const SITUACOES: { label: string; value: DocumentState | "not_in_force" | "em_dia" }[] = [
  { label: "Vencido", value: "expired" },
  { label: "Pendente", value: "missing" },
  { label: "A vencer", value: "expiring" },
  { label: "Aguardando vigência", value: "not_in_force" },
  { label: "Em dia", value: "em_dia" },
];

function AbaDocumentacao({ unidades, hoje }: { unidades: UnitListing[]; hoje: string }) {
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("");
  const [categoria, setCategoria] = useState("");

  const visiveis = useMemo(
    () =>
      unidades
        .filter((unidade) => {
          const termo = busca.trim().toLowerCase();
          return !termo || unidade.name.toLowerCase().includes(termo);
        })
        .filter((unidade) => {
          if (!situacao) return true;
          if (situacao === "em_dia") {
            return UNIT_DOCUMENT_GROUPS.every(
              (grupo) => rollup(unidade, unitTypesOfGroup(grupo.id), hoje).emDia,
            );
          }
          return UNIT_DOCUMENT_TYPES.some((tipo) => estadoDe(unidade, tipo, hoje) === situacao);
        }),
    [unidades, busca, situacao, hoje],
  );

  const colunaNome: Coluna<UnitListing> = {
    id: "nome",
    label: "Nome",
    sticky: true,
    className: "min-w-56",
    render: (unidade) => <Nome unidade={unidade} />,
  };

  const colunas: Coluna<UnitListing>[] = categoria
    ? [
        colunaNome,
        ...unitTypesOfGroup(categoria).map((tipo) => ({
          id: tipo.id,
          label: tipo.short,
          className: "text-center!",
          render: (unidade: UnitListing) => {
            const doc = unidade.documents.find((item) => item.typeId === tipo.id);
            return (
              <Celula
                estado={estadoDe(unidade, tipo, hoje)}
                obrigatorio={tipo.required}
                dias={doc?.validUntil ? daysUntil(doc.validUntil, hoje) : undefined}
              />
            );
          },
        })),
      ]
    : [
        colunaNome,
        {
          label: "Completude",
          className: "w-56",
          render: (unidade) => {
            const completude = completeness(unidade.documents, UNIT_DOCUMENT_TYPES, hoje);
            return (
              <div className="pr-8">
                <p className="m-0 text-sm font-bold text-[var(--color-brand-purple-dark)]">
                  {completude.percent}%
                  <span className="sr-only">
                    {" "}
                    — {completude.met} de {completude.required} obrigatórios cumpridos
                  </span>
                </p>
                <Progress
                  className="espelho-do-sistema mt-1"
                  value={completude.percent}
                  showPercentage={false}
                  variant={
                    completude.percent === 100
                      ? "green"
                      : completude.percent >= 70
                        ? "default"
                        : "error"
                  }
                />
              </div>
            );
          },
        },
        ...UNIT_DOCUMENT_GROUPS.map((grupo) => ({
          id: grupo.id,
          label: grupo.label,
          render: (unidade: UnitListing) => (
            <Rollup unidade={unidade} tipos={unitTypesOfGroup(grupo.id)} hoje={hoje} />
          ),
        })),
      ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
        <Input
          id="unidades-busca"
          label="Nome"
          placeholder="Buscar por nome"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
        <Select
          id="unidades-situacao"
          label="Situação da documentação"
          prompt="Todas"
          value={situacao}
          options={SITUACOES}
          onChange={setSituacao}
        />
        <Select
          id="unidades-categoria"
          label="Categoria"
          prompt="Todas"
          value={categoria}
          options={UNIT_DOCUMENT_GROUPS.map((grupo) => ({
            label: grupo.label,
            value: grupo.id,
          }))}
          onChange={setCategoria}
        />
      </div>

      <Table
        id="unidades-documentacao"
        rows={visiveis}
        rowId={(unidade) => unidade.id}
        cols={colunas}
        onRowClick={abrirPasta}
      />

      <Contagem mostrando={visiveis.length} total={unidades.length} />
    </div>
  );
}

/* =============================================================== moldura */

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
