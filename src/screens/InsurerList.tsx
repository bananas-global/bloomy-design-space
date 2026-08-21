import { useMemo, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type { CredentialStatus, InsurerListData, InsurerListing } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { EmptyState, ErrorState, LoadingState } from "../components/primitives.js";
import { Button } from "../components/bloomy/Button.js";
import { Card } from "../components/bloomy/Card.js";
import { Input, Select } from "../components/bloomy/Input.js";
import { Progress, SectionHeader } from "../components/bloomy/Layout.js";
import { Table, type Coluna } from "../components/bloomy/Table.js";
import { ButtonTabs, type ButtonTab } from "../components/bloomy/Tabs.js";
import { Tag, type TagVariant } from "../components/bloomy/Tag.js";
import { UNIT_DOCUMENT_TYPES } from "../fixtures/documents.js";
import {
  credentialStatus,
  credentialStatusLabel,
  missingForInsurer,
  unitCredentialStatus,
} from "../rules/documents.js";

/**
 * Operadoras — uma tela, duas abas.
 *
 * Cadastro é o espelho de `/backoffice/operadoras`: os três filtros e as quatro
 * colunas de lá, na mesma ordem. Documentação não existe no monólito e é a mesma
 * decisão das outras duas frentes (0015): a pergunta "quanto da clínica cada
 * convênio já aceita" é sobre a lista inteira, e responder por operadora obriga a
 * abrir cinco fichas para descobrir qual delas ainda não credenciou ninguém.
 *
 * Antes desta tela, o menu abria a ficha da Unimed direto. Uma frente cujo item de
 * menu cai dentro de um registro específico não tem entrada: quem chega pelo link
 * não sabe que existem outras quatro.
 *
 * Origem do Cadastro: `lib/bloomy_web/backoffice/live/health_care_live/index.ex:8-51`.
 */
export function InsurerList({ context }: ScreenProps) {
  const { data, isLoading, error, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as operadoras" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  // `HealthCarePolicy.can?(role, :list)` é admin, admin de clínica e operação.
  if (!can("health_cares.list")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso às operadoras"
        description="A lista de convênios é de quem administra contratos. Fale com quem administra os acessos."
      />,
    );
  }

  const lista = data as InsurerListData | null;
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

const TOM: Record<CredentialStatus, TagVariant> = {
  credentialed: "green",
  in_credentialing: "light-blue",
  not_credentialed: "brand",
  decredentialed: "red",
};

/** Severidade primeiro: é a ordem da fila de trabalho, não a de leitura. */
const ORDEM: CredentialStatus[] = [
  "decredentialed",
  "not_credentialed",
  "in_credentialing",
  "credentialed",
];

/* ================================================================ resumo */

/**
 * O que uma operadora já aceita da clínica.
 *
 * Tudo derivado, nada armazenado: é a mesma conta que a ficha faz, com as mesmas
 * regras — `credentialStatus` de um lado, `unitCredentialStatus` do outro. Fosse
 * campo, a lista e a ficha discordariam no primeiro documento vencido.
 */
function credenciamento(linha: InsurerListing, hoje: string) {
  const porProfissional = linha.professionals.map((row) =>
    credentialStatus(
      row.links.find((item) => item.insurerId === linha.insurer.id),
      row.documents,
      linha.insurer,
      hoje,
    ),
  );

  const contagem = new Map<CredentialStatus, number>();
  for (const situacao of porProfissional) {
    contagem.set(situacao, (contagem.get(situacao) ?? 0) + 1);
  }

  const unidadesAceitas = linha.units.filter(
    (item) =>
      unitCredentialStatus(item.documents, UNIT_DOCUMENT_TYPES, linha.insurer.id, hoje) ===
      "credentialed",
  ).length;

  /**
   * O que falta, somado.
   *
   * Contamos **documento faltando**, não pessoa faltando: uma operadora que exige
   * quatro tipos e recebeu um cobra três de cada profissional, e é o número de
   * papéis a juntar que dimensiona o trabalho.
   */
  const documentosFaltando = linha.professionals.reduce(
    (total, row) => total + missingForInsurer(row.documents, linha.insurer, hoje).length,
    0,
  );

  return {
    contagem,
    credenciados: contagem.get("credentialed") ?? 0,
    total: linha.professionals.length,
    unidadesAceitas,
    unidades: linha.units.length,
    documentosFaltando,
  };
}

function Rollup({ linha, hoje }: { linha: InsurerListing; hoje: string }) {
  const { contagem, total } = credenciamento(linha, hoje);

  return (
    <div className="flex flex-wrap gap-1.5">
      {ORDEM.filter((situacao) => contagem.has(situacao)).map((situacao) => (
        <Etiqueta
          key={situacao}
          item={String(contagem.get(situacao))}
          variant={TOM[situacao]}
          title={`${credentialStatusLabel(situacao)} — ${contagem.get(situacao)} de ${total}`}
        />
      ))}
    </div>
  );
}

/* ================================================================== nome */

/**
 * A coluna do nome.
 *
 * Sem bolinha de situação, ao contrário de unidades e profissionais: a operadora
 * não tem campo de ativa/inativa no schema. Inventar um ponto colorido aqui seria
 * afirmar um estado que o cadastro não guarda.
 */
function Nome({ linha }: { linha: InsurerListing }) {
  return (
    <a
      href={hrefDaFicha(linha.insurer.id)}
      // `inline-block py-1` e `min-w-6`: o nome tem 18px de caixa de linha, e o
      // alvo de toque mínimo é 24 nas duas direções. "Cassi" é curto.
      className="inline-block min-w-6 rounded py-1 font-bold text-[var(--color-brand-purple-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]"
    >
      {linha.insurer.name}
    </a>
  );
}

/** A ficha da operadora, com a busca da URL — que carrega cenário e fixture. */
function hrefDaFicha(id: string): string {
  const busca = typeof window === "undefined" ? "" : window.location.search;
  return `/insurers/${id}/documents${busca}`;
}

function abrirFicha(linha: InsurerListing) {
  window.location.assign(hrefDaFicha(linha.insurer.id));
}

/* ============================================================== conteúdo */

type Aba = "cadastro" | "documentacao";

function Conteudo({ context, lista }: { context: ScreenProps["context"]; lista: InsurerListData }) {
  const hoje = lista.now.slice(0, 10);
  const podeCriar = context.can("health_cares.create");
  const [aba, setAba] = useState<Aba>("cadastro");

  const abas: ButtonTab<Aba>[] = [
    { id: "cadastro", label: "Cadastro", icon: "fa-building" },
    { id: "documentacao", label: "Documentação", icon: "fa-folder-open" },
  ];

  return wrap(
    context,
    <Card>
      <ButtonTabs
        className="espelho-do-sistema"
        id="abas-de-operadoras"
        label="Visões da lista de operadoras"
        tabs={abas}
        value={aba}
        onChange={setAba}
        header={<SectionHeader variant="large">Operadoras</SectionHeader>}
        actions={
          <Button
            className="espelho-do-sistema"
            rightIcon="fa-plus"
            disabled={!podeCriar}
            title={podeCriar ? undefined : "Criar operadora é de quem administra convênios."}
          >
            Nova operadora
          </Button>
        }
      >
        {lista.insurers.length === 0 ? (
          <EmptyState
            title="Nenhuma operadora cadastrada"
            description="A clínica atende só particular até aqui. A lista aparece assim que o primeiro convênio for cadastrado."
          />
        ) : aba === "cadastro" ? (
          <AbaCadastro linhas={lista.insurers} />
        ) : (
          <AbaDocumentacao linhas={lista.insurers} hoje={hoje} />
        )}
      </ButtonTabs>
    </Card>,
  );
}

/** Rodapé de contagem. `pagination/1` não foi portado — decisão 0006. */
function Contagem({ mostrando, total }: { mostrando: number; total: number }) {
  return (
    <p className="m-0 text-sm text-[var(--fg-2)]">
      Mostrando {mostrando} de {total} {total === 1 ? "operadora" : "operadoras"}
    </p>
  );
}

/* ============================================================== cadastro */

/**
 * Os três campos do filtro real, na ordem de lá.
 *
 * São três, e não quatro como em unidades: o original filtra por nome, registro
 * ANS e cidade. O grid é `md:grid-cols-3 lg:grid-cols-4` no monólito — quatro
 * colunas para três campos, o que deixa a última vazia. Aqui são três, porque a
 * coluna vaga não é decisão, é sobra.
 */
const FILTROS = [
  { id: "name", label: "Nome" },
  { id: "ans", label: "Registro ANS" },
  { id: "city", label: "Cidade" },
] as const;

function AbaCadastro({ linhas }: { linhas: InsurerListing[] }) {
  const [filtros, setFiltros] = useState<Record<string, string>>({});

  const visiveis = useMemo(
    () =>
      linhas.filter((linha) =>
        FILTROS.every(({ id }) => {
          const busca = (filtros[id] ?? "").trim().toLowerCase();
          if (!busca) return true;
          const campo = {
            name: linha.insurer.name,
            ans: linha.profile.ansRegister ?? "",
            city: linha.city,
          }[id];
          return campo.toLowerCase().includes(busca);
        }),
      ),
    [linhas, filtros],
  );

  const colunas: Coluna<InsurerListing>[] = [
    {
      id: "nome",
      label: "Nome",
      sticky: true,
      className: "min-w-56",
      render: (linha) => <Nome linha={linha} />,
    },
    // O original imprime o campo cru, e a operadora sem registro sai como célula
    // vazia. O traço diz que o dado falta, em vez de parecer erro de carregamento.
    { label: "Registro ANS", render: (linha) => linha.profile.ansRegister ?? "—" },
    {
      label: "Endereço",
      render: (linha) =>
        `${linha.street}, ${linha.number}${linha.complement ? ` - ${linha.complement}` : ""}`,
    },
    { label: "Cidade", render: (linha) => linha.city },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
        {FILTROS.map(({ id, label }) => (
          <Input
            key={id}
            id={`filtro-operadora-${id}`}
            label={label}
            placeholder={id === "name" ? "Buscar por nome" : undefined}
            value={filtros[id] ?? ""}
            onChange={(evento) => setFiltros((atual) => ({ ...atual, [id]: evento.target.value }))}
          />
        ))}
      </div>

      <Table
        id="operadoras-cadastro"
        rows={visiveis}
        rowId={(linha) => linha.insurer.id}
        cols={colunas}
        onRowClick={abrirFicha}
      />

      <Contagem mostrando={visiveis.length} total={linhas.length} />
    </div>
  );
}

/* =========================================================== documentação */

const SITUACOES: { label: string; value: string }[] = [
  { label: "Ninguém credenciado", value: "nenhum" },
  { label: "Tem gente em credenciamento", value: "in_credentialing" },
  { label: "Tem descredenciado", value: "decredentialed" },
  { label: "Clínica toda credenciada", value: "completa" },
];

function AbaDocumentacao({ linhas, hoje }: { linhas: InsurerListing[]; hoje: string }) {
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("");

  const visiveis = useMemo(
    () =>
      linhas
        .filter((linha) => {
          const termo = busca.trim().toLowerCase();
          return !termo || linha.insurer.name.toLowerCase().includes(termo);
        })
        .filter((linha) => {
          if (!situacao) return true;
          const resumo = credenciamento(linha, hoje);
          if (situacao === "nenhum") return resumo.credenciados === 0;
          if (situacao === "completa") return resumo.credenciados === resumo.total;
          return (resumo.contagem.get(situacao as CredentialStatus) ?? 0) > 0;
        }),
    [linhas, busca, situacao, hoje],
  );

  const colunas: Coluna<InsurerListing>[] = [
    {
      id: "nome",
      label: "Nome",
      sticky: true,
      className: "min-w-56",
      render: (linha) => <Nome linha={linha} />,
    },
    {
      // Quantos tipos a operadora exige. É a coluna que explica as outras: a
      // SulAmérica pede dois documentos e credencia a clínica toda; a Unimed pede
      // quatro e não credencia ninguém.
      label: "Exige",
      render: (linha) => (
        <span className="text-[var(--color-brand-purple-dark)]">
          {linha.insurer.requires.length}{" "}
          {linha.insurer.requires.length === 1 ? "documento" : "documentos"}
        </span>
      ),
    },
    {
      label: "Profissionais credenciados",
      className: "w-56",
      render: (linha) => {
        const { credenciados, total } = credenciamento(linha, hoje);
        const percentual = total === 0 ? 0 : Math.round((credenciados / total) * 100);
        return (
          <div className="pr-8">
            <p className="m-0 text-sm font-bold text-[var(--color-brand-purple-dark)]">
              {credenciados} de {total}
              <span className="sr-only"> — {percentual}% da equipe</span>
            </p>
            <Progress
              className="espelho-do-sistema mt-1"
              value={percentual}
              showPercentage={false}
              variant={percentual === 100 ? "green" : percentual >= 70 ? "default" : "error"}
            />
          </div>
        );
      },
    },
    {
      label: "Situação da equipe",
      render: (linha) => <Rollup linha={linha} hoje={hoje} />,
    },
    {
      label: "Unidades aceitas",
      render: (linha) => {
        const { unidadesAceitas, unidades } = credenciamento(linha, hoje);
        return (
          <Etiqueta
            item={`${unidadesAceitas} de ${unidades}`}
            variant={unidadesAceitas === unidades ? "green" : "light-blue"}
          />
        );
      },
    },
    {
      label: "Documentos a juntar",
      render: (linha) => {
        const { documentosFaltando } = credenciamento(linha, hoje);
        return documentosFaltando === 0 ? (
          <Etiqueta item="nada pendente" variant="green" icon="fa-check" />
        ) : (
          <Etiqueta
            item={String(documentosFaltando)}
            variant="orange"
            icon="fa-triangle-exclamation"
            title={`${documentosFaltando} documentos a compartilhar com ${linha.insurer.name}`}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
        <Input
          id="operadoras-busca"
          label="Nome"
          placeholder="Buscar por nome"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
        <Select
          id="operadoras-situacao"
          label="Situação do credenciamento"
          prompt="Todas"
          value={situacao}
          options={SITUACOES}
          onChange={setSituacao}
        />
      </div>

      <Table
        id="operadoras-documentacao"
        rows={visiveis}
        rowId={(linha) => linha.insurer.id}
        cols={colunas}
        onRowClick={abrirFicha}
      />

      <Contagem mostrando={visiveis.length} total={linhas.length} />
    </div>
  );
}

/* =============================================================== moldura */

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Operadoras"
      breadcrumb={[{ label: "Operadoras" }]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
