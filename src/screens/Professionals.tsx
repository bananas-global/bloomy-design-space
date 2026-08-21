import { useMemo, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  DocumentInsurer,
  DocumentState,
  DocumentType,
  TeamDocumentationData,
  TeamDocumentationRow,
} from "../contracts/index.js";
import { formatDate, formatMoney } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import { EmptyState, ErrorState, LoadingState } from "../components/primitives.js";
import { Button } from "../components/bloomy/Button.js";
import { Card } from "../components/bloomy/Card.js";
import { Input, MultiSelect, Select } from "../components/bloomy/Input.js";
import { EmptyStateCard, Progress, SectionHeader } from "../components/bloomy/Layout.js";
import { Table, type Coluna } from "../components/bloomy/Table.js";
import { ButtonTabs, type ButtonTab } from "../components/bloomy/Tabs.js";
import { Tag, TagList, type TagVariant } from "../components/bloomy/Tag.js";
import {
  INTERNAL_DOCUMENT_TYPES,
  PROFESSIONAL_DOCUMENT_TYPES,
} from "../fixtures/documents.js";
import {
  professionalStatus,
  abaHours,
  completeness,
  credentialStatus,
  credentialStatusLabel,
  daysUntil,
  documentState,
  documentStateLabel,
  hasFile,
  missingForInsurer,
} from "../rules/documents.js";

/**
 * Profissionais — uma tela, três abas.
 *
 * No sistema real isto é uma página e meia: a lista em `ProfessionalLive.Index`
 * e o controle de horas em `ProfessionalLive.HoursControl`, ligados por um
 * `link_button`. A documentação da equipe não existe lá — documento de
 * profissional é por pessoa, na aba Documentos do perfil.
 *
 * **Por que virou uma tela só.** As três respondem sobre a mesma lista de
 * pessoas, com os mesmos filtros de nome, especialidade e status, e a pessoa que
 * abre a segunda quase sempre acabou de olhar a primeira. Separadas, ela refazia
 * o filtro a cada troca — e o controle de horas, que é rota própria, ainda
 * obrigava a voltar por um link para continuar.
 *
 * A extensão que isto exigiu dos componentes portados está na decisão 0015.
 */
export function Professionals({ context }: ScreenProps) {
  const { data, isLoading, error, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando os profissionais" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  /**
   * A lista é de `professionals.list` e as outras duas abas são de
   * `professionals.edit`.
   *
   * É a divisão do monólito: `Index` autoriza `:list`, que inclui a recepção, e
   * `HoursControl` autoriza `:edit`, que não. Colapsar as duas numa só permissão
   * era a saída fácil e mudaria quem vê o quê — a recepção passaria a ver
   * remuneração de terapeuta.
   */
  if (!can("professionals.list")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso aos profissionais"
        description="A lista é de admin, admin de clínica, recepção, coordenação e People. Fale com quem administra os acessos."
      />,
    );
  }

  const documentacao = data as TeamDocumentationData | null;
  if (!documentacao) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  return <Conteudo context={context} documentacao={documentacao} />;
}

/* ============================================================== etiquetas */

/** `tag/1` traz a paleta do monólito, contraste incluído — ver decisão 0001. */
function Etiqueta(props: React.ComponentProps<typeof Tag>) {
  return (
    <Tag {...props} className={["espelho-do-sistema", props.className].filter(Boolean).join(" ")} />
  );
}

const TOM: Record<DocumentState, TagVariant> = {
  valid: "green",
  no_expiry: "green",
  expiring: "orange",
  expired: "red",
  missing: "yellow",
  waived: "brand",
};

/** Severidade primeiro: é a ordem da fila de trabalho, não a de leitura. */
const ORDEM: DocumentState[] = ["expired", "missing", "expiring", "waived", "valid"];

/* ================================================================ escopos */

const ESCOPOS = [
  { id: "professional", label: "Profissional", tipos: PROFESSIONAL_DOCUMENT_TYPES },
  {
    id: "internal",
    label: "Interno",
    tipos: INTERNAL_DOCUMENT_TYPES.filter((tipo) => tipo.scope === "internal"),
  },
  {
    id: "occupational",
    label: "Ocupacional",
    tipos: INTERNAL_DOCUMENT_TYPES.filter((tipo) => tipo.scope === "occupational"),
  },
] as const;

const TODOS_OS_TIPOS = [...PROFESSIONAL_DOCUMENT_TYPES, ...INTERNAL_DOCUMENT_TYPES];

/** Categoria da matriz: a visão geral resume, as outras abrem coluna por tipo. */
type Categoria = "overview" | "professional" | "internal" | "occupational" | "insurers";

const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: "overview", label: "Visão geral" },
  { value: "professional", label: "Profissional" },
  { value: "internal", label: "Interno" },
  { value: "occupational", label: "Ocupacional" },
  { value: "insurers", label: "Operadoras" },
];

/**
 * Estado de um tipo para uma pessoa. Registro sem arquivo é ausência.
 *
 * A dispensa sobrevive à falta de arquivo — é decisão da clínica, não pendência
 * —, e é por isso que ela sai antes na verificação.
 */
function estadoDe(linha: TeamDocumentationRow, type: DocumentType, hoje: string): DocumentState {
  const doc = linha.documents.find((item) => item.typeId === type.id);
  const estado = documentState(doc, hoje);
  if (estado !== "waived" && doc && !hasFile(doc)) return "missing";
  return estado;
}

/** Conta por estado e diz se sobrou pendência. */
function rollup(linha: TeamDocumentationRow, tipos: readonly DocumentType[], hoje: string) {
  const contagem = new Map<DocumentState, number>();
  for (const type of tipos) {
    const estado = estadoDe(linha, type, hoje);
    contagem.set(estado, (contagem.get(estado) ?? 0) + 1);
  }
  const pendencia = (["expired", "missing", "expiring"] as DocumentState[]).some((estado) =>
    contagem.has(estado),
  );
  return { contagem, emDia: !pendencia };
}

/** Uma pessoa tem pendência quando qualquer escopo dela tem. */
function temPendencia(linha: TeamDocumentationRow, hoje: string): boolean {
  return ESCOPOS.some((escopo) => !rollup(linha, escopo.tipos, hoje).emDia);
}

function Rollup({
  linha,
  tipos,
  hoje,
}: {
  linha: TeamDocumentationRow;
  tipos: readonly DocumentType[];
  hoje: string;
}) {
  const { contagem, emDia } = rollup(linha, tipos, hoje);

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

/* ================================================================= células */

/**
 * A célula de um tipo na matriz.
 *
 * Ela distingue duas ausências que o `DocumentState` trata como uma: o
 * obrigatório que falta é vermelho, e o que a clínica quer ver mas não exige é
 * um traço cinza. Sem essa distinção, uma matriz de onze colunas fica vermelha
 * de ponta a ponta e deixa de apontar o que fazer primeiro.
 *
 * O ícone é decorativo — `Icon` já sai com `aria-hidden`. Quem lê por leitor de
 * tela recebe o rótulo do estado no texto oculto ao lado, e não a cor.
 */
function Celula({
  estado,
  obrigatorio,
  texto,
  dias,
}: {
  estado: DocumentState;
  obrigatorio: boolean;
  /** Valor que o tipo carrega, quando ele carrega um. Hoje só carga de ABA. */
  texto?: string;
  dias?: number;
}) {
  const aparencia: { variant: TagVariant; icon: string } =
    estado === "valid" || estado === "no_expiry"
      ? { variant: "green", icon: "fa-check" }
      : estado === "expiring"
        ? { variant: "orange", icon: "fa-clock" }
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
      <Etiqueta
        item={texto ?? ""}
        variant={aparencia.variant}
        icon={aparencia.icon}
        title={rotulo}
      />
      <span className="sr-only">{rotulo}</span>
    </span>
  );
}

/** A célula de uma operadora: credenciamento é derivado, nunca digitado. */
function CelulaOperadora({
  linha,
  insurer,
  hoje,
}: {
  linha: TeamDocumentationRow;
  insurer: DocumentInsurer;
  hoje: string;
}) {
  const link = linha.links.find((item) => item.insurerId === insurer.id);
  const situacao = credentialStatus(link, linha.documents, insurer, hoje);
  const faltando = missingForInsurer(linha.documents, insurer, hoje).length;

  const aparencia: { variant: TagVariant; icon: string; item: string } =
    situacao === "credentialed"
      ? { variant: "green", icon: "fa-check", item: "" }
      : situacao === "in_credentialing"
        ? { variant: "orange", icon: "fa-clock", item: String(faltando) }
        : situacao === "decredentialed"
          ? { variant: "red", icon: "fa-xmark", item: "" }
          : { variant: "brand", icon: "fa-minus", item: "" };

  const rotulo =
    situacao === "in_credentialing"
      ? `${credentialStatusLabel(situacao)} — ${faltando} ${faltando === 1 ? "documento falta" : "documentos faltam"}`
      : credentialStatusLabel(situacao);

  return (
    <span className="inline-flex items-center">
      <Etiqueta item={aparencia.item} variant={aparencia.variant} icon={aparencia.icon} title={rotulo} />
      <span className="sr-only">{rotulo}</span>
    </span>
  );
}

/* ================================================================ navegação */

/**
 * A pasta de documentos de uma pessoa.
 *
 * A busca da URL vai junto porque é ela que carrega o cenário e a fixture
 * escolhida no rodapé: sem isso, abrir a pasta reinicia o estado do Design Space
 * e a pessoa perde a variação que estava examinando.
 */
function hrefDaPasta(id: string): string {
  const busca = typeof window === "undefined" ? "" : window.location.search;
  return `/team/${id}/documents${busca}`;
}

/**
 * A linha inteira leva à pasta, nas três abas.
 *
 * É o `row_click` do original, que é `phx-click` por célula. O que ele não tem é
 * caminho de teclado — e é por isso que o nome continua sendo uma âncora de
 * verdade: o clique na linha é atalho de ponteiro, e a navegação real mora no
 * link. `Table` já impede que um clique no link dispare os dois.
 */
function abrirPasta(linha: TeamDocumentationRow) {
  window.location.assign(hrefDaPasta(linha.professional.id));
}

/* =================================================================== nome */

/**
 * A coluna do nome, com a situação embutida.
 *
 * No monólito a bolinha de `status_tag/1` mora numa coluna própria de 24px. Aqui
 * ela entrou na coluna do nome porque a matriz por categoria já tem onze colunas
 * e uma delas seria só um ponto colorido — e porque a bolinha e a linha "Em
 * inativação" dizem a mesma coisa e devem ser lidas juntas.
 *
 * `status_tag/1` também só tem dois estados. "Em inativação" é o terceiro, e ele
 * é derivado: ativo com data de saída futura.
 */
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
    /**
     * Duas linhas irmãs, e não uma coluna ao lado da bolinha.
     *
     * A bolinha centraliza na linha do nome — é dele que ela fala — e para isso
     * precisa estar num flex `items-center` que contenha só o nome. Aninhada com
     * a linha de inativação, o `items-center` a jogaria para o meio das duas e o
     * `items-start` a deixava alta em relação ao texto.
     *
     * O efeito colateral é o que o desenho pede: a linha de inativação começa na
     * coluna da bolinha, meio passo à esquerda do nome, em vez de recuada abaixo
     * dele.
     */
    <div>
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            situacao === "active"
              ? "bg-[var(--color-brand-green)]"
              : situacao === "deactivating"
                ? "bg-[var(--color-brand-orange)]"
                : "bg-[var(--color-red)]"
          }`}
        />
        {/* O nome é a âncora de verdade: é ela que dá teclado e leitor de tela
            ao destino que o clique na linha alcança por ponteiro. */}
        <a
          href={hrefDaPasta(pessoa.id)}
          // `inline-block py-1` e `min-w-6`: o nome tem 18px de caixa de linha,
          // e o alvo de toque mínimo é 24 nas duas direções. O respiro vertical
          // não muda a altura da linha, que já tem `py-4`.
          className="inline-block min-w-6 rounded py-1 font-bold text-[var(--color-brand-purple-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]"
        >
          {pessoa.name}
        </a>
        {pessoa.tbd && <Etiqueta item="TBD" variant="yellow" />}
      </div>

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
    </div>
  );
}

/**
 * Destaque de quem está saindo.
 *
 * Fundo opaco de propósito: a coluna do nome é fixa na rolagem horizontal e
 * herda o fundo da linha. Translúcido, ela deixaria passar as colunas que
 * correm por baixo. A barra à esquerda é `inset` de sombra porque `border-left`
 * em `tr` desaparece com `border-collapse`.
 */
function classeDaLinha(linha: TeamDocumentationRow, hoje: string): string | undefined {
  if (professionalStatus(linha.professional, hoje) !== "deactivating") return undefined;
  return [
    "bg-[color-mix(in_srgb,var(--color-brand-orange)_10%,var(--color-white))]",
    "shadow-[inset_4px_0_0_0_var(--color-brand-orange)]",
  ].join(" ");
}

/** Rótulo de coluna com a marca de obrigatório. */
function Obrigatorio({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}{" "}
      <abbr title="Documento obrigatório" className="no-underline">
        *
      </abbr>
    </>
  );
}

/* =============================================================== conteúdo */

type Aba = "cadastro" | "documentacao" | "horas";

function Conteudo({
  context,
  documentacao,
}: {
  context: ScreenProps["context"];
  documentacao: TeamDocumentationData;
}) {
  const { locale, can } = context;
  const hoje = documentacao.now.slice(0, 10);
  const podeEditar = can("professionals.edit");

  const [aba, setAba] = useState<Aba>(podeEditar ? "documentacao" : "cadastro");

  const pendencias = documentacao.rows.filter((linha) => temPendencia(linha, hoje)).length;

  const abas: ButtonTab<Aba>[] = [
    { id: "cadastro", label: "Cadastro", icon: "fa-users" },
    {
      id: "documentacao",
      label: "Documentação",
      icon: "fa-folder-open",
      badge: pendencias,
      disabled: !podeEditar,
    },
    { id: "horas", label: "Controle de horas", icon: "fa-clock", disabled: !podeEditar },
  ];

  return wrap(
    context,
    <Card>
      <ButtonTabs
        className="espelho-do-sistema"
        id="abas-de-profissionais"
        label="Visões da lista de profissionais"
        tabs={abas}
        value={aba}
        onChange={setAba}
        header={<SectionHeader variant="large">Profissionais</SectionHeader>}
        actions={
          <Button className="espelho-do-sistema" rightIcon="fa-plus" disabled={!podeEditar}>
            Novo profissional
          </Button>
        }
      >
        {documentacao.rows.length === 0 ? (
          <EmptyStateCard icon="fa-users" text="Nenhum profissional vinculado">
            A lista aparece assim que a unidade tiver o primeiro vínculo.
          </EmptyStateCard>
        ) : aba === "cadastro" ? (
          <AbaCadastro linhas={documentacao.rows} hoje={hoje} locale={locale} />
        ) : aba === "documentacao" ? (
          <AbaDocumentacao documentacao={documentacao} hoje={hoje} locale={locale} />
        ) : (
          <AbaHoras documentacao={documentacao} hoje={hoje} locale={locale} />
        )}
      </ButtonTabs>
    </Card>,
    documentacao,
  );
}

/* ========================================================= filtros comuns */

/** Opções derivadas da própria lista: filtro não oferece o que não existe. */
function opcoesDe(valores: (string | undefined)[]): { label: string; value: string }[] {
  return [...new Set(valores.filter((valor): valor is string => Boolean(valor)))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((valor) => ({ label: valor, value: valor }));
}

/**
 * Status, com três opções onde o monólito tem duas.
 *
 * Lá o filtro é o booleano `status` — Ativo ou Inativo — e "Em inativação" não
 * existe porque não é campo: é ativo com data de saída futura. Sem a terceira
 * opção, a única forma de achar quem está saindo é ler a lista inteira
 * procurando a linha laranja.
 *
 * **Ativo continua incluindo quem está em inativação**, como `status: true`
 * inclui lá. Quem está saindo ainda atende, e tirá-lo de Ativo esconderia da
 * escala alguém que tem agenda esta semana.
 */
const STATUS = [
  { label: "Ativo", value: "ativo" },
  { label: "Em inativação", value: "em_inativacao" },
  { label: "Inativo", value: "inativo" },
];

function combina(
  linha: TeamDocumentationRow,
  hoje: string,
  filtros: { busca: string; especialidade: string; status: string; perfil?: string },
): boolean {
  const pessoa = linha.professional;
  const busca = filtros.busca.trim().toLowerCase();

  if (
    busca &&
    !pessoa.name.toLowerCase().includes(busca) &&
    !(pessoa.council ?? "").toLowerCase().includes(busca)
  ) {
    return false;
  }
  if (filtros.especialidade && pessoa.specialty !== filtros.especialidade) return false;
  if (filtros.perfil && !(pessoa.types ?? []).includes(filtros.perfil)) return false;
  if (filtros.status) {
    const situacao = professionalStatus(pessoa, hoje);
    if (filtros.status === "ativo" && situacao === "inactive") return false;
    if (filtros.status === "em_inativacao" && situacao !== "deactivating") return false;
    if (filtros.status === "inativo" && situacao !== "inactive") return false;
  }
  return true;
}

/** Rodapé de contagem. `pagination/1` não foi portado; `meta_info/1` foi. */
function Contagem({ mostrando, total }: { mostrando: number; total: number }) {
  return (
    <p className="m-0 text-sm text-[var(--fg-2)]">
      Mostrando {mostrando} de {total} {total === 1 ? "profissional" : "profissionais"}
    </p>
  );
}

/* ============================================================== cadastro */

function AbaCadastro({
  linhas,
  hoje,
  locale,
}: {
  linhas: TeamDocumentationRow[];
  hoje: string;
  locale: string | undefined;
}) {
  const [busca, setBusca] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [perfil, setPerfil] = useState("");
  const [status, setStatus] = useState("");

  const visiveis = useMemo(
    () => linhas.filter((linha) => combina(linha, hoje, { busca, especialidade, perfil, status })),
    [linhas, hoje, busca, especialidade, perfil, status],
  );

  const colunas: Coluna<TeamDocumentationRow>[] = [
    {
      id: "nome",
      label: "Nome",
      sticky: true,
      render: (linha) => <Nome pessoa={linha.professional} hoje={hoje} locale={locale} />,
    },
    {
      label: "Especialidade",
      render: (linha) => <Etiqueta item={linha.professional.specialty} variant="light-blue" />,
    },
    { label: "Conselho", render: (linha) => linha.professional.council ?? "—" },
    {
      // "Perfil" nos dois lugares. No monólito o filtro se chama Perfil e a
      // coluna se chama Tipo, para o mesmo campo — ver o log do porte.
      label: "Perfil",
      render: (linha) => (
        <TagList items={linha.professional.types ?? []} limit={2} className="espelho-do-sistema" />
      ),
    },
    {
      label: "Formação em Saúde",
      render: (linha) => (
        <Etiqueta item={linha.professional.formation ?? "Outros"} variant="light-blue" />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Input
          id="cadastro-busca"
          label="Nome/Conselho"
          placeholder="Buscar por nome ou conselho"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
        <Select
          id="cadastro-especialidade"
          label="Especialidade"
          prompt="Todas"
          value={especialidade}
          options={opcoesDe(linhas.map((linha) => linha.professional.specialty))}
          onChange={setEspecialidade}
        />
        <Select
          id="cadastro-perfil"
          label="Perfil"
          prompt="Todos"
          value={perfil}
          options={opcoesDe(linhas.flatMap((linha) => linha.professional.types ?? []))}
          onChange={setPerfil}
        />
        <Select
          id="cadastro-status"
          label="Status"
          prompt="Todos"
          value={status}
          options={STATUS}
          onChange={setStatus}
        />
      </div>

      <Table
        id="profissionais-cadastro"
        rows={visiveis}
        rowId={(linha) => linha.professional.id}
        rowClassName={(linha) => classeDaLinha(linha, hoje)}
        onRowClick={abrirPasta}
        cols={colunas}
      />

      <Contagem mostrando={visiveis.length} total={linhas.length} />
    </div>
  );
}

/* =========================================================== documentação */

const SITUACOES: { label: string; value: DocumentState | "em_dia" }[] = [
  { label: "Vencido", value: "expired" },
  { label: "Pendente", value: "missing" },
  { label: "A vencer", value: "expiring" },
  { label: "Dispensado", value: "waived" },
  { label: "Em dia", value: "em_dia" },
];

function AbaDocumentacao({
  documentacao,
  hoje,
  locale,
}: {
  documentacao: TeamDocumentationData;
  hoje: string;
  locale: string | undefined;
}) {
  const [busca, setBusca] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [status, setStatus] = useState("");
  const [situacao, setSituacao] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("overview");

  const linhas = documentacao.rows;
  const operadoras = documentacao.insurers.filter((item) => item.kind !== "particular");

  const visiveis = useMemo(
    () =>
      linhas
        .filter((linha) => combina(linha, hoje, { busca, especialidade, status }))
        .filter((linha) => {
          if (!situacao) return true;
          if (situacao === "em_dia") return !temPendencia(linha, hoje);
          return TODOS_OS_TIPOS.some((tipo) => estadoDe(linha, tipo, hoje) === situacao);
        }),
    [linhas, hoje, busca, especialidade, status, situacao],
  );

  // `min-w-56`: a coluna fixa não pode encolher com a rolagem, senão o nome
  // quebra em três linhas justamente na matriz que tem mais colunas.
  const colunaNome: Coluna<TeamDocumentationRow> = {
    id: "nome",
    label: "Nome",
    sticky: true,
    className: "min-w-56",
    render: (linha) => <Nome pessoa={linha.professional} hoje={hoje} locale={locale} />,
  };

  const colunas: Coluna<TeamDocumentationRow>[] =
    categoria === "overview"
      ? [
          colunaNome,
          {
            // `w-56` mais `pr-8` por dentro: a barra é `w-full`, então sem o
            // respiro interno ela termina a 12px da coluna seguinte e as duas
            // leituras — a barra e as contagens do escopo — se encostam.
            label: "Completude",
            className: "w-56",
            render: (linha) => {
              const completude = completeness(linha.documents, TODOS_OS_TIPOS, hoje);
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
          ...ESCOPOS.map((escopo) => ({
            id: escopo.id,
            label: escopo.label,
            render: (linha: TeamDocumentationRow) => (
              <Rollup linha={linha} tipos={escopo.tipos} hoje={hoje} />
            ),
          })),
          {
            id: "operadoras",
            label: "Operadoras",
            render: (linha) => <RollupOperadoras linha={linha} operadoras={operadoras} hoje={hoje} />,
          },
        ]
      : categoria === "insurers"
        ? [
            colunaNome,
            ...operadoras.map((insurer) => ({
              id: insurer.id,
              label: insurer.name,
              className: "text-center!",
              render: (linha: TeamDocumentationRow) => (
                <CelulaOperadora linha={linha} insurer={insurer} hoje={hoje} />
              ),
            })),
          ]
        : [
            colunaNome,
            ...(ESCOPOS.find((escopo) => escopo.id === categoria)?.tipos ?? []).map((tipo) => ({
              id: tipo.id,
              label: tipo.required ? (
                <Obrigatorio>{tipo.short}</Obrigatorio>
              ) : tipo.id === "aba_course" ? (
                `${tipo.short} (h)`
              ) : (
                tipo.short
              ),
              className: "text-center!",
              render: (linha: TeamDocumentationRow) => {
                const doc = linha.documents.find((item) => item.typeId === tipo.id);
                const estado = estadoDe(linha, tipo, hoje);
                const horas = tipo.id === "aba_course" ? abaHours(linha.documents) : 0;

                return (
                  <Celula
                    estado={estado}
                    obrigatorio={tipo.required}
                    texto={horas > 0 ? `${horas}h` : undefined}
                    dias={doc?.validUntil ? daysUntil(doc.validUntil, hoje) : undefined}
                  />
                );
              },
            })),
          ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Input
          id="docs-busca"
          label="Nome/Conselho"
          placeholder="Buscar por nome ou conselho"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
        <Select
          id="docs-especialidade"
          label="Especialidade"
          prompt="Todas"
          value={especialidade}
          options={opcoesDe(linhas.map((linha) => linha.professional.specialty))}
          onChange={setEspecialidade}
        />
        <Select
          id="docs-status"
          label="Status"
          prompt="Todos"
          value={status}
          options={STATUS}
          onChange={setStatus}
        />
        <Select
          id="docs-situacao"
          label="Situação da documentação"
          prompt="Todas"
          value={situacao}
          options={SITUACOES}
          onChange={setSituacao}
        />
        <Select
          id="docs-categoria"
          label="Categoria"
          prompt="Visão geral"
          clear={false}
          value={categoria}
          options={CATEGORIAS}
          onChange={(valor) => setCategoria((valor || "overview") as Categoria)}
        />
      </div>

      <Table
        id="profissionais-documentacao"
        rows={visiveis}
        rowId={(linha) => linha.professional.id}
        rowClassName={(linha) => classeDaLinha(linha, hoje)}
        onRowClick={abrirPasta}
        cols={colunas}
      />

      <Contagem mostrando={visiveis.length} total={linhas.length} />
    </div>
  );
}

/** Credenciados e não credenciados, na visão geral. */
function RollupOperadoras({
  linha,
  operadoras,
  hoje,
}: {
  linha: TeamDocumentationRow;
  operadoras: DocumentInsurer[];
  hoje: string;
}) {
  const credenciados = operadoras.filter(
    (insurer) =>
      credentialStatus(
        linha.links.find((item) => item.insurerId === insurer.id),
        linha.documents,
        insurer,
        hoje,
      ) === "credentialed",
  ).length;
  const restantes = operadoras.length - credenciados;

  return (
    <div className="flex flex-wrap gap-1.5">
      <Etiqueta
        item={String(credenciados)}
        variant="green"
        title={`${credenciados} de ${operadoras.length} credenciadas`}
      />
      {restantes > 0 && (
        <Etiqueta
          item={String(restantes)}
          variant="yellow"
          title={`${restantes} sem credenciamento`}
        />
      )}
    </div>
  );
}

/* ========================================================= controle de horas */

/**
 * Controle de horas.
 *
 * No monólito é rota própria, e o `Processar` é o `phx-submit` do formulário —
 * a apuração não acontece a cada tecla. Mantido: a tabela só muda quando a
 * pessoa processa, e o que ela vê enquanto mexe nos campos continua sendo o
 * resultado do último processamento.
 *
 * O que divergiu: lá o mês inicial é o do relógio, e aqui é o do `now`
 * declarado na fixture. Determinismo é critério de aceite deste repositório.
 */
function AbaHoras({
  documentacao,
  hoje,
  locale,
}: {
  documentacao: TeamDocumentationData;
  hoje: string;
  locale: string | undefined;
}) {
  const comApuracao = documentacao.rows.filter((linha) => linha.hours);
  const todosOsIds = comApuracao.map((linha) => linha.professional.id);

  const [especialidade, setEspecialidade] = useState("");
  const [escolhidos, setEscolhidos] = useState<string[]>(todosOsIds);
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [processado, setProcessado] = useState({ ids: todosOsIds, mes: hoje.slice(0, 7) });

  /**
   * Escolher a especialidade seleciona todos os profissionais dela.
   *
   * É o `handle_callback_loads` do monólito: a especialidade não filtra a
   * seleção, ela a substitui. Sem isso a pessoa escolhe a especialidade e a
   * tabela não muda, porque o que a apuração usa é a lista de ids.
   */
  function trocarEspecialidade(valor: string) {
    setEspecialidade(valor);
    const ids = comApuracao
      .filter((linha) => !valor || linha.professional.specialty === valor)
      .map((linha) => linha.professional.id);
    setEscolhidos(ids);
    setProcessado({ ids, mes });
  }

  const visiveis = comApuracao.filter((linha) => processado.ids.includes(linha.professional.id));

  const colunas: Coluna<TeamDocumentationRow>[] = [
    {
      id: "nome",
      label: "Nome",
      sticky: true,
      render: (linha) => <Nome pessoa={linha.professional} hoje={hoje} locale={locale} />,
    },
    { label: "Horas planejadas", render: (linha) => `${linha.hours?.plannedHours ?? 0}h` },
    { label: "Horas trabalhadas", render: (linha) => `${linha.hours?.workedHours ?? 0}h` },
    { label: "Atendimentos", render: (linha) => linha.hours?.appointments ?? 0 },
    {
      label: "Valor",
      render: (linha) => formatMoney(linha.hours?.compensationCents ?? 0, locale),
    },
  ];

  return (
    <div className="space-y-4">
      {/**
       * Os três campos preenchem a linha e o botão ocupa só o que o rótulo pede.
       *
       * As proporções são as do monólito — 3, 5 e 2 —, mas como `flex-grow` e
       * não como vãos de uma grade de doze: na grade, os dois vãos reservados ao
       * botão sobravam vazios em tela larga, e é esse vazio que fazia a faixa
       * parecer desalinhada do resto do cartão.
       *
       * `min-w-0` em todos porque a seleção de profissionais é larga por
       * natureza: sem ele, o campo do meio cresce até o conteúdo e engole a
       * especialidade.
       */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <Select
          className="w-full md:min-w-0 md:flex-[3]"
          id="horas-especialidade"
          label="Especialidade"
          prompt="Todas"
          value={especialidade}
          options={opcoesDe(comApuracao.map((linha) => linha.professional.specialty))}
          onChange={trocarEspecialidade}
        />
        <MultiSelect
          className="w-full md:min-w-0 md:flex-[5]"
          id="horas-profissionais"
          label="Profissionais"
          prompt="Selecione os profissionais"
          values={escolhidos}
          options={comApuracao.map((linha) => ({
            label: linha.professional.name,
            value: linha.professional.id,
          }))}
          onChange={setEscolhidos}
        />
        <Input
          className="w-full md:min-w-0 md:flex-[2]"
          id="horas-mes"
          label="Mês"
          type="month"
          value={mes}
          onChange={(evento) => setMes(evento.target.value)}
        />
        <Button
          className="espelho-do-sistema shrink-0"
          variant="tint"
          rightIcon="fa-check"
          onClick={() => setProcessado({ ids: escolhidos, mes })}
        >
          Processar
        </Button>
      </div>

      <Table
        id="profissionais-horas"
        rows={visiveis}
        rowId={(linha) => linha.professional.id}
        rowClassName={(linha) => classeDaLinha(linha, hoje)}
        onRowClick={abrirPasta}
        cols={colunas}
      />
    </div>
  );
}

/* =============================================================== moldura */

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
      breadcrumb={[{ label: "Profissionais", path: "/team/documentation" }]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
