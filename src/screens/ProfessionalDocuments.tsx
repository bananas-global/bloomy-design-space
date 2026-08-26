import { useEffect, useMemo, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  DocumentInsurer,
  DocumentState,
  DocumentType,
  ProfessionalDocument,
  ProfessionalDocumentsData,
  TeamDocumentationData,
} from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import { EmptyState, ErrorState, LoadingState } from "../components/primitives.js";
import { Button } from "../components/bloomy/Button.js";
import { Card } from "../components/bloomy/Card.js";
import { RadioGroup, RadioSelector } from "../components/bloomy/Choice.js";
import { FileUploader } from "../components/bloomy/FileUploader.js";
import { Checkbox, Input, MultiSelect, Select } from "../components/bloomy/Input.js";
import { Avatar, EmptyStateCard, FieldsetLabel, SectionHeader } from "../components/bloomy/Layout.js";
import { DrawerModal, Modal } from "../components/bloomy/Overlay.js";
import { Table, type Coluna } from "../components/bloomy/Table.js";
import { ButtonTabs, LazyTabs, type ButtonTab, type LazyTabEntry } from "../components/bloomy/Tabs.js";
import { Tag, type TagVariant } from "../components/bloomy/Tag.js";
import { PROFESSIONAL_DOCUMENT_TYPES } from "../fixtures/documents.js";
import {
  professionalStatus,
  canExport,
  canSelectInsurer,
  daysUntil,
  documentState,
  documentStateLabel,
  hasFile,
  isTypeLocked,
  STATE_SEVERITY,
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
 * O que a tela precisa fazer e não é óbvio: **mostrar a lacuna, e não só o que
 * existe.** Os sete tipos padrão viram linha mesmo sem arquivo. Uma lista do que
 * foi anexado esconde exatamente o documento que ninguém anexou — que é o único
 * que importa.
 *
 * **O que saiu daqui.** A pasta tinha um segundo cartão, "Credenciamento nas
 * operadoras", que derivava o vínculo dos documentos e explicava que a queda do
 * credenciamento não tem autor. Foi removido a pedido do time de design, por não
 * ser reconhecível no contexto da pasta. As regras continuam existindo e em uso
 * na tela da operadora (`InsurerDocuments`), que é onde o credenciamento é o
 * assunto: `credentialStatus`, `missingForInsurer` e `canShare` não foram
 * tocadas.
 */
export function ProfessionalDocuments({ params, context }: ScreenProps) {
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

  /**
   * A lista e a pasta são o mesmo fluxo, e por isso a mesma fixture.
   *
   * Quando o dado vem da lista da equipe, o profissional é escolhido pelo id da
   * rota. Duas fixtures obrigariam a trocar o seletor de dados no meio do
   * caminho — e o fluxo deixaria de ser um.
   */
  const pasta = comoPasta(data, params.id);
  if (!pasta) {
    return wrap(
      context,
      <EmptyState
        title="Profissional não encontrado"
        description={`Nenhum profissional com o identificador ${params.id ?? "informado"}.`}
      />,
    );
  }

  return <Conteudo context={context} pasta={pasta} permissions={permissions} />;
}

/** Aceita a pasta pronta ou a fixture da lista, escolhendo pelo id da rota. */
function comoPasta(data: unknown, id: string | undefined): ProfessionalDocumentsData | null {
  const bruto = data as (ProfessionalDocumentsData & Partial<TeamDocumentationData>) | null;
  if (!bruto) return null;
  if (!bruto.rows) return bruto;

  const linha = bruto.rows.find((item) => item.professional.id === id) ?? bruto.rows[0];
  if (!linha) return null;

  return {
    now: bruto.now,
    professional: linha.professional,
    documents: linha.documents,
    insurers: bruto.insurers,
    links: linha.links,
  };
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
 * Os tipos que a pessoa escolhe.
 *
 * São os não padrão: o padrão vem do slot e não se escolhe. A ordem é a do
 * catálogo, com "Outro documento" no fim porque é o que sobra quando nenhum dos
 * outros serve.
 */
const TIPOS_ABERTOS = PROFESSIONAL_DOCUMENT_TYPES.filter((item) => !item.standard);

/** O que o formulário devolve ao salvar. */
type ValoresDoDocumento = {
  /** O tipo escolhido nas pastilhas, que pode não ser o da linha aberta. */
  tipoId: string;
  nome: string;
  arquivo: string;
  validade?: string;
  horas?: number;
  compartilhar: string[];
};

/**
 * Aplica o que foi salvo à lista de documentos da sessão.
 *
 * Duas coisas que a implementação real vai precisar decidir igual:
 *
 * 1. **A data de compartilhamento de quem já estava compartilhado não muda.**
 *    Ela registra quando a operadora ganhou acesso; reescrevê-la a cada
 *    salvamento apagaria a única informação que a etiqueta carrega no `title`.
 * 2. **Desmarcar é revogar.** A operadora que sai da seleção sai da lista, e o
 *    texto do campo já diz que revogar remove o acesso imediatamente.
 *
 * Sem `Date.now()`: a data de hoje vem do `now` declarado na fixture.
 */
function salvarDocumento(
  documentos: ProfessionalDocument[],
  linha: Linha,
  valores: ValoresDoDocumento,
  hoje: string,
): ProfessionalDocument[] {
  const compartilhamento = (anteriores: ProfessionalDocument["sharedWith"]) =>
    valores.compartilhar.map((insurerId) => ({
      insurerId,
      at: anteriores.find((share) => share.insurerId === insurerId)?.at ?? hoje,
    }));

  if (linha.doc) {
    const id = linha.doc.id;
    return documentos.map((doc) =>
      doc.id === id
        ? {
            ...doc,
            name: valores.nome,
            file: valores.arquivo || undefined,
            validUntil: valores.validade || undefined,
            hours: valores.horas,
            updatedAt: hoje,
            sharedWith: compartilhamento(doc.sharedWith),
          }
        : doc,
    );
  }

  // Id determinístico: o tipo mais a posição na lista. Não há `Math.random()`
  // em fixture, regra ou tela, e um id de sessão não é exceção.
  //
  // O tipo vem dos valores, e não da linha: numa lacuna de tipo aberto a pessoa
  // troca a pastilha antes de salvar, e o documento precisa nascer no tipo que
  // ficou escolhido.
  return [
    ...documentos,
    {
      id: `${valores.tipoId}-${documentos.length + 1}`,
      typeId: valores.tipoId,
      name: valores.nome,
      file: valores.arquivo || undefined,
      validUntil: valores.validade || undefined,
      hours: valores.horas,
      updatedAt: hoje,
      sharedWith: compartilhamento([]),
    },
  ];
}

/** O que o anúncio diz depois de salvar, sem repetir o nome do documento. */
function resumoDoCompartilhamento(compartilhar: string[], insurers: DocumentInsurer[]): string {
  if (compartilhar.length === 0) return "Nenhuma operadora tem acesso a ele.";

  const nomes = compartilhar.map((id) => nomeDaOperadora(insurers, id)).join(", ");
  return `Compartilhado com ${nomes}.`;
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

/** dd/mm/aaaa — o formato da tabela. `formatDate` do produto escreve o mês por extenso. */
function br(iso: string | undefined): string {
  if (!iso) return "—";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/* ================================================================= resumo */

type Contagem = { pendente: number; valido: number; aVencer: number; vencido: number };

/**
 * O resumo da pasta, só com o que tem documento.
 *
 * "0 a vencer" e "0 expirados" ocupavam duas etiquetas para dizer que não há
 * nada a fazer — e diluíam as duas que dizem que há. A ausência de vermelho é a
 * informação; escrever "0 expirados" em vermelho a transforma em ruído da cor
 * mais forte da tela.
 *
 * Nada some quando as quatro são zero, porque as quatro **não podem** ser zero:
 * os sete tipos padrão viram linha sempre, e uma linha é pendente ou é ativa. Se
 * a pasta chegar vazia, quem fala é o `empty_state_card` abaixo, e não um resumo
 * de nada.
 */
function Resumo({ contagem }: { contagem: Contagem }) {
  const etiquetas = [
    contagem.pendente > 0 && {
      key: "pendente",
      item: `${contagem.pendente} ${contagem.pendente === 1 ? "pendente" : "pendentes"}`,
      // `light-blue` e não amarelo: a contagem é um resumo, e o amarelo aqui
      // competia com a etiqueta "Pendente" de cada cartão, que aponta o trabalho.
      variant: "light-blue" as const,
    },
    contagem.valido > 0 && {
      key: "valido",
      item: `${contagem.valido} ${contagem.valido === 1 ? "ativo" : "ativos"}`,
      variant: "green" as const,
    },
    contagem.aVencer > 0 && {
      key: "aVencer",
      item: `${contagem.aVencer} a vencer`,
      variant: "orange" as const,
    },
    contagem.vencido > 0 && {
      key: "vencido",
      item: `${contagem.vencido} ${contagem.vencido === 1 ? "expirado" : "expirados"}`,
      variant: "red" as const,
    },
  ].filter(Boolean) as { key: string; item: string; variant: "light-blue" | "green" | "orange" | "red" }[];

  if (etiquetas.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {etiquetas.map((etiqueta) => (
        <Etiqueta key={etiqueta.key} item={etiqueta.item} variant={etiqueta.variant} />
      ))}
    </div>
  );
}

/* ================================================================ filtros */

type ValoresDeFiltro = {
  nome: string;
  tipo: string;
  situacao: string;
  operadora: string;
  padrao: string;
};

/**
 * O que "Padrão" separa, e por que é um filtro e não uma seção.
 *
 * Padrão é o tipo que a clínica exige de todo mundo: ele vira linha com ou sem
 * arquivo, e é a soma deles que a completude mede. Fora do padrão é o que a
 * pessoa juntou por conta — especialização, currículo, um segundo certificado.
 *
 * Separar os dois em seções fixas foi o que a primeira versão da proposta fazia,
 * e o efeito era esconder a lacuna: quem abria a pasta via primeiro a pilha do
 * que existe. Como filtro, a pasta continua abrindo com tudo junto e na ordem do
 * catálogo, e a separação fica disponível para quem foi buscá-la — tipicamente
 * para conferir o que a operadora exige, que é sempre padrão.
 */
const PADRAO = [
  { label: "Somente padrão", value: "padrao" },
  { label: "Somente fora do padrão", value: "extra" },
];

/**
 * Os cinco filtros da pasta.
 *
 * Três vêm de `edit_tabs/documents.ex`: Buscar por nome, Tipo e Status. Os outros
 * dois são desta entrega. **Operadora** responde a pergunta que traz a pessoa
 * aqui na maior parte das vezes — *o que a Unimed já enxerga?* —, que sem ele
 * exige ler as etiquetas de todos os cartões. **Padrão** separa o que a clínica
 * exige do que a pessoa juntou.
 *
 * As opções de Tipo e Operadora saem do que a pasta tem, e não do catálogo
 * inteiro: um filtro que oferece o que não existe devolve lista vazia e parece
 * defeito.
 */
function Filtros({
  linhas,
  insurers,
  hoje,
  valores,
  onChange,
}: {
  linhas: Linha[];
  insurers: DocumentInsurer[];
  hoje: string;
  valores: ValoresDeFiltro;
  onChange: (valores: ValoresDeFiltro) => void;
}) {
  const tipos = [...new Map(linhas.map((linha) => [linha.type.id, linha.type])).values()];

  const situacoes = [...new Set(linhas.map((linha) => documentState(linha.doc, hoje)))]
    .sort((a, b) => STATE_SEVERITY[a] - STATE_SEVERITY[b])
    .map((estado) => ({ label: documentStateLabel(estado), value: estado }));

  const operadoras = insurers.filter((insurer) =>
    linhas.some((linha) =>
      linha.doc?.sharedWith.some((share) => share.insurerId === insurer.id),
    ),
  );

  return (
    <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Input
        id="documentos-nome"
        label="Nome"
        placeholder="Buscar por nome"
        rightIcon="fa-search"
        value={valores.nome}
        onChange={(evento) => onChange({ ...valores, nome: evento.target.value })}
      />
      <Select
        id="documentos-tipo"
        label="Tipo"
        prompt="Todos"
        value={valores.tipo}
        options={tipos.map((tipo) => ({ label: tipo.name, value: tipo.id }))}
        onChange={(tipo) => onChange({ ...valores, tipo })}
      />
      <Select
        id="documentos-situacao"
        label="Status"
        prompt="Todos"
        value={valores.situacao}
        options={situacoes}
        onChange={(situacao) => onChange({ ...valores, situacao })}
      />
      <Select
        id="documentos-operadora"
        label="Operadora"
        prompt="Todas"
        value={valores.operadora}
        options={operadoras.map((insurer) => ({ label: insurer.name, value: insurer.id }))}
        onChange={(operadora) => onChange({ ...valores, operadora })}
      />
      <Select
        id="documentos-padrao"
        label="Padrão"
        prompt="Todos"
        value={valores.padrao}
        options={PADRAO}
        onChange={(padrao) => onChange({ ...valores, padrao })}
      />
    </div>
  );
}

/** O nome buscado é o do documento **ou** o do tipo: a lacuna não tem o primeiro. */
function passaNoFiltro(linha: Linha, valores: ValoresDeFiltro, hoje: string): boolean {
  const busca = valores.nome.trim().toLowerCase();
  if (
    busca &&
    !(linha.doc?.name ?? "").toLowerCase().includes(busca) &&
    !linha.type.name.toLowerCase().includes(busca)
  ) {
    return false;
  }
  if (valores.tipo && linha.type.id !== valores.tipo) return false;
  if (valores.situacao && documentState(linha.doc, hoje) !== valores.situacao) return false;
  if (valores.padrao === "padrao" && !linha.standard) return false;
  if (valores.padrao === "extra" && linha.standard) return false;
  if (
    valores.operadora &&
    !linha.doc?.sharedWith.some((share) => share.insurerId === valores.operadora)
  ) {
    return false;
  }
  return true;
}

/* =============================================================== conteúdo */

type Visao = "cards" | "tabela";

/**
 * As duas visões da pasta, no trilho de abas do sistema.
 *
 * O ícone é a extensão que a decisão 0015 já registrou — `button_tabs/1` renderiza
 * só o rótulo. Aqui ele carrega peso: "Cards" e "Tabela" são a mesma informação em
 * duas formas, e a grade e as linhas dizem isso antes da palavra.
 */
const VISOES: ButtonTab<Visao>[] = [
  { id: "cards", label: "Cards", icon: "fa-grip" },
  { id: "tabela", label: "Tabela", icon: "fa-list" },
];

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
  const [visao, setVisao] = useState<Visao>("cards");
  const [editando, setEditando] = useState<Linha | null>(null);
  const [exportando, setExportando] = useState(false);
  const [aviso, setAviso] = useState("");

  /**
   * O que foi salvo nesta sessão.
   *
   * Sem isto, salvar só anunciava: as etiquetas de operadora do cartão continuavam
   * mostrando o compartilhamento antigo, e a tela dizia uma coisa enquanto
   * mostrava outra. Numa especificação executável isso é pior que não salvar —
   * quem revisa conclui que a ação não faz nada.
   *
   * A cópia vive na tela e some ao recarregar, como todo estado de cenário. Ela é
   * refeita quando a fixture muda, que é o seletor de dados do rodapé trocando
   * de estado.
   */
  const [documentos, setDocumentos] = useState(pasta.documents);
  useEffect(() => setDocumentos(pasta.documents), [pasta.documents]);

  const linhas = useMemo(() => montarLinhas(documentos), [documentos]);
  const podeEditar = permissions.includes("professionals.edit");

  const [filtros, setFiltros] = useState<ValoresDeFiltro>({
    nome: "",
    tipo: "",
    situacao: "",
    operadora: "",
    padrao: "",
  });
  const filtradas = useMemo(
    () => linhas.filter((linha) => passaNoFiltro(linha, filtros, hoje)),
    [linhas, filtros, hoje],
  );

  const contagem = {
    pendente: linhas.filter((linha) => !hasFile(linha.doc)).length,
    valido: documentos.filter((doc) => {
      const estado = documentState(doc, hoje);
      return hasFile(doc) && (estado === "valid" || estado === "no_expiry");
    }).length,
    aVencer: documentos.filter((doc) => documentState(doc, hoje) === "expiring").length,
    vencido: documentos.filter((doc) => documentState(doc, hoje) === "expired").length,
  };


  const exportacao = canExport(documentos);

  return wrap(
    context,
    <div className="space-y-6">
      <CabecalhoDoPerfil pessoa={pasta.professional} hoje={hoje} locale={locale} />

      <Card>
        {/* `ButtonTabs`, e não um par de botões meu: o trilho com marcador móvel
            é o componente de troca de visão do sistema, e é o que a lista de
            profissionais já usa em Cadastro · Documentação · Controle de horas.
            O que estava aqui era um segmento inventado — fundo cinza, botão
            branco com sombra — que não existe em lugar nenhum do produto. */}
        <ButtonTabs
          className="espelho-do-sistema"
          id="visoes-da-pasta-do-profissional"
          label="Visões da pasta"
          tabs={VISOES}
          value={visao}
          onChange={setVisao}
          header={<SectionHeader variant="small">Documentos</SectionHeader>}
          panelClassName="space-y-6"
          actions={
            <>
              {/* Tint e não `outline`: exportar é ação secundária da seção, e o
                  contorno a colocava no mesmo peso visual de "Adicionar
                  documento", que é a ação primária. */}
              <Button
                className="espelho-do-sistema"
                variant="tint"
                rightIcon="fa-file-pdf"
                title={exportacao.allowed ? undefined : exportacao.reason}
                aria-describedby={exportacao.allowed ? undefined : "motivo-exportar"}
                aria-disabled={exportacao.allowed ? undefined : true}
                onClick={exportacao.allowed ? () => setExportando(true) : undefined}
              >
                Exportar agrupado
              </Button>

              {/* Visível e desabilitada, não escondida: é a convenção do
                  produto para ação bloqueada — decisão 0003. */}
              <Button
                className="espelho-do-sistema"
                rightIcon="fa-plus"
                disabled={!podeEditar}
                title={podeEditar ? undefined : "Adicionar documento é de quem edita o cadastro."}
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
            </>
          }
        >
          {!exportacao.allowed && (
            <p id="motivo-exportar" className="m-0 text-sm text-[var(--fg-2)]">
              {exportacao.reason}
            </p>
          )}

          <Resumo contagem={contagem} />

          <Filtros
            linhas={linhas}
            insurers={pasta.insurers}
            hoje={hoje}
            valores={filtros}
            onChange={setFiltros}
          />

          {linhas.length === 0 ? (
            <EmptyStateCard icon="fa-folder-open" text="Nenhum documento cadastrado">
              Os sete tipos padrão aparecem aqui assim que a pasta for aberta, com ou sem arquivo.
            </EmptyStateCard>
          ) : filtradas.length === 0 ? (
            <EmptyStateCard icon="fa-filter" text="Nenhum documento nesses filtros">
              Limpe um dos campos acima para ver o resto da pasta.
            </EmptyStateCard>
          ) : visao === "cards" ? (
            <Cartoes
              linhas={filtradas}
              insurers={pasta.insurers}
              hoje={hoje}
              podeEditar={podeEditar}
              onEditar={setEditando}
            />
          ) : (
            <Tabela
              linhas={filtradas}
              insurers={pasta.insurers}
              hoje={hoje}
              podeEditar={podeEditar}
              onEditar={setEditando}
            />
          )}
        </ButtonTabs>
      </Card>

      <p className="sr-only" role="status" aria-live="polite">
        {aviso}
      </p>

      <FormularioDocumento
        linha={editando}
        insurers={pasta.insurers}
        permissions={permissions}
        onClose={() => setEditando(null)}
        onSave={(valores) => {
          const linha = editando;
          if (!linha) return;
          setDocumentos((atuais) => salvarDocumento(atuais, linha, valores, hoje));
          setEditando(null);
          setAviso(
            `${valores.nome} salvo. ${resumoDoCompartilhamento(valores.compartilhar, pasta.insurers)}`,
          );
        }}
      />

      <ExportarAgrupado
        open={exportando}
        documents={documentos}
        hoje={hoje}
        onClose={() => setExportando(false)}
      />
    </div>,
    pasta,
  );
}

/* ================================================================= abas */

/**
 * Cabeçalho do perfil: avatar, nome, badges e a linha de metadados.
 *
 * É o que diz ao desenvolvedor onde a aba mora — sem ele, a tela de documentos
 * flutua e ninguém sabe de quem ela é.
 */
/**
 * Badge do cabeçalho do perfil.
 *
 * Não é `tag/1`: aquele é retangular e cola o ícone no texto. O cabeçalho do
 * perfil usa pílula com ícone separado — `pc2-badge` no protótipo.
 */
/**
 * Selo "Padrão" dos cartões: cadeado antes do texto, com gap.
 *
 * `text-xs` e não `text-sm`: no cartão de seis colunas o selo divide a linha com
 * a etiqueta de situação, que é `text-sm` porque vem de `tag/1`. No tamanho da
 * etiqueta os dois não caibam juntos e o selo quebrava para a linha de cima,
 * empurrando o título do documento para baixo em metade dos cartões.
 */
/**
 * Selo "Padrão" — `tag/1` com o cadeado antes do texto.
 *
 * Era um `span` desenhado à parte, e em `text-xs`: encolhido para caber no cartão
 * denso. É exatamente o encolhimento que a decisão 0015 recusou fazer no `tag/1`
 * da etiqueta de situação — e o selo, por não ser do sistema, não teve essa
 * proteção. Agora os dois saem do mesmo componente e no mesmo tamanho.
 */
function SeloPadrao() {
  return <Etiqueta item="Padrão" variant="brand" icon="fa-lock" />;
}

/** Duas iniciais, como no cabeçalho do sistema. */
function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter((parte) => parte.length > 2)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * As etiquetas do cabeçalho do perfil — `tag/1` arredondada.
 *
 * Era um `span` com paleta própria de cinco tons, que duplicava em parte as dez
 * variantes de `tag/1` e divergia em quatro delas: verde, vermelho, azul e neutro
 * apontavam para tokens diferentes dos do sistema. Agora saem de `tag/1`, com o
 * `rounded-full` que o cabeçalho da unidade já usa — e que vem do original: o
 * `card_header.ex` da unidade e o da operadora passam `class="rounded-full"` na
 * própria `.tag`.
 *
 * A consequência é que o cabeçalho herda a paleta do sistema, contraste incluído.
 * É a decisão 0001 valendo aqui também: quem tem `espelho-do-sistema` não é lido
 * como defeito desta entrega, e a divergência de contraste do `tag/1` está
 * registrada.
 */
function BadgeDoPerfil({
  item,
  tom,
  icon,
}: {
  item: string;
  tom: "green" | "red" | "yellow" | "blue" | "neutral";
  icon?: string;
}) {
  const variante = {
    green: "green",
    red: "red",
    yellow: "yellow",
    blue: "light-blue",
    neutral: "brand",
  }[tom] as TagVariant;

  return <Etiqueta item={item} variant={variante} icon={icon} className="rounded-full" />;
}

function CabecalhoDoPerfil({
  pessoa,
  hoje,
  locale,
}: {
  pessoa: ProfessionalDocumentsData["professional"];
  hoje: string;
  locale: string | undefined;
}) {
  const situacao = professionalStatus(pessoa, hoje);

  const badge =
    situacao === "inactive"
      ? { item: "Inativo", tom: "red" as const, icon: "fa-circle-xmark" }
      : situacao === "deactivating" && pessoa.deactivationDate
        ? {
            item: `Inativação em ${formatDate(pessoa.deactivationDate, locale)}`,
            tom: "yellow" as const,
            icon: "fa-clock",
          }
        : { item: "Ativo", tom: "green" as const, icon: "fa-circle-check" };

  const meta = [
    pessoa.phone && { icon: "fa-phone", texto: pessoa.phone },
    pessoa.email && { icon: "fa-envelope", texto: pessoa.email },
    { icon: "fa-users", texto: `${pessoa.patients ?? 0} pacientes` },
    { icon: "fa-clock", texto: `${pessoa.weeklyHours ?? 0}h semanais` },
    { icon: "fa-chart-pie", texto: `${pessoa.occupancy ?? "0.0"}% de ocupação` },
    { icon: "fa-calendar-xmark", texto: `${pessoa.absences ?? 0} faltas` },
  ].filter(Boolean) as { icon: string; texto: string }[];

  /**
   * O cabeçalho é o `header` do `lazy_tabs`, não um cartão à parte.
   *
   * No sistema o componente **é** o cartão: `card` com `p-0!`, o cabeçalho num
   * `div` com `p-6` e a barra de abas com `px-6` e borda em cima. Aqui isso
   * estava invertido — a tela tinha o próprio `Card` e enfiava o componente
   * dentro dele com `-mx-6 -mb-6 px-6`. O resultado eram dois cartões aninhados
   * e dois `px-6` somados: as abas recuavam 48px enquanto o nome recuava 24px, e
   * era esse desalinhamento que parecia margem.
   */
  const cabecalho = (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <Avatar
              title={pessoa.name}
              size="extra_large"
              className="bg-[linear-gradient(135deg,#58bada,#7459e4)]"
            />
            <span className="absolute inset-0 flex items-center justify-center text-3xl font-extrabold text-white">
              {iniciais(pessoa.name)}
            </span>
          </div>
          <div>
            <h2 className="m-0 text-[1.75rem] font-extrabold leading-tight text-[var(--color-brand-purple-dark)]">
              {pessoa.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <BadgeDoPerfil item={badge.item} tom={badge.tom} icon={badge.icon} />
              <BadgeDoPerfil item={pessoa.specialty} tom="blue" icon="fa-stethoscope" />
              {pessoa.council && <BadgeDoPerfil item={pessoa.council} tom="neutral" icon="fa-pen-to-square" />}
              {pessoa.tbd && <BadgeDoPerfil item="TBD" tom="yellow" icon="fa-user-clock" />}
            </div>
          </div>
        </div>
        <Button className="espelho-do-sistema" variant="ghost" aria-label="Mais ações">
          <Icon name="fa-ellipsis-vertical" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-x-[22px] gap-y-2 text-base text-[var(--fg-2)]">
        {meta.map((item) => (
          <span key={item.texto}>
            <Icon name={item.icon} className="mr-2" />
            {item.texto}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    // O `mb-6` que o componente traz no cartão e o `space-y-6` da página são
    // margens adjacentes: colapsam para 24px, não somam. Sem correção.
    <LazyTabs
      className="espelho-do-sistema"
      id="abas-do-profissional"
      label="Perfil do profissional"
      tabs={ABAS}
      value="documents"
      onChange={() => undefined}
      header={cabecalho}
      panelClassName="hidden"
    >
      {null}
    </LazyTabs>
  );
}

/**
 * As abas do perfil.
 *
 * `lazy_tabs/1`, o mesmo componente do perfil do paciente e das listas
 * gerenciais — é ele que traz os dois grupos com menu, Dados Pessoais e Vínculo.
 */
const ABAS: LazyTabEntry<string>[] = [
  {
    id: "personal",
    label: "Dados Pessoais",
    tabs: [
      { id: "personal_info", label: "Dados Pessoais", disabled: true },
      { id: "professional_data", label: "Dados Profissionais", disabled: true },
      { id: "address", label: "Endereço", disabled: true },
      { id: "company_info", label: "Dados PJ", disabled: true },
    ],
  },
  { id: "units", label: "Unidades", disabled: true },
  { id: "standard_agenda", label: "Escala", disabled: true },
  { id: "services", label: "Serviços", disabled: true },
  { id: "schedule_blockings", label: "Bloqueios", disabled: true },
  { id: "hired_professionals", label: "Contratação", disabled: true },
  { id: "appointments", label: "Atendimentos", disabled: true },
  {
    id: "bond",
    label: "Vínculo",
    tabs: [
      { id: "patients", label: "Responsável Clínico", disabled: true },
      { id: "supervisorship", label: "Supervisão", disabled: true },
    ],
  },
  { id: "documents", label: "Documentos" },
  { id: "hours_control", label: "Controle de Horas", disabled: true },
  { id: "presence_control", label: "Controle de Presença", disabled: true },
];

/* ============================================================== cartões */

function Cartoes({
  linhas,
  insurers,
  hoje,
  podeEditar,
  onEditar,
}: {
  linhas: Linha[];
  insurers: DocumentInsurer[];
  hoje: string;
  podeEditar: boolean;
  onEditar: (linha: Linha) => void;
}) {
  return (
    /**
     * Até seis colunas. Onze tipos em três colunas davam quatro linhas de cartão
     * e a pasta não caía numa tela; a densidade é o que faz a lacuna e o
     * documento válido serem comparados de relance.
     *
     * A sexta coluna só entra a partir de 1900px, e o corte não é arbitrário: o
     * cartão divide a linha de cima entre o quadrado do ícone, o selo "Padrão" e
     * a etiqueta de situação, e "Sem validade" em `text-sm` — que é o tamanho de
     * `tag/1` — precisa de 165px de folga. Abaixo disso a etiqueta cai para a
     * linha seguinte em todos os cartões sem validade.
     */
    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1900px]:grid-cols-6">
      {linhas.map((linha) => {
        const estado = documentState(linha.doc, hoje);
        const dias = linha.doc?.validUntil ? daysUntil(linha.doc.validUntil, hoje) : undefined;
        const semArquivo = Boolean(linha.doc) && !hasFile(linha.doc);

        return (
          <li key={linha.key}>
            {/* A lacuna tem fundo. É o único estado do cartão em que não há nada
                para ler — nem data, nem arquivo, nem operadora — e o preenchimento
                é o que a separa do documento resolvido sem depender da etiqueta. */}
            <article
              className={[
                "flex h-full flex-col gap-3 rounded-2xl border border-[var(--color-brand-purple-dark)]/10 p-5",
                linha.doc ? undefined : "bg-[var(--color-brand-purple-dark)]/5",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                {/* O tamanho é o do `item/1` variante `simplified` — `w-7 h-7
                    rounded` —, e a cor não: lá o quadrado é `bg-brand-blue/20`
                    com o ícone em `brand-blue-dark`, o que aqui pintava onze
                    quadrados de azul e disputava a atenção com a etiqueta de
                    situação, que é quem diz o que fazer. Tinta neutra, ícone no
                    roxo escuro do texto. */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--color-brand-purple-dark)]/8">
                  <Icon
                    name={linha.type.icon}
                    type="solid"
                    className="text-[var(--color-brand-purple-dark)]"
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {linha.standard && <SeloPadrao />}
                  <EtiquetaSituacao state={estado} days={dias} />
                </div>
              </div>

              <h2 className="m-0 text-base font-bold text-[var(--color-brand-purple-dark)]">
                {linha.doc?.name ?? linha.type.name}
              </h2>

              {linha.extra > 0 && (
                // "Outros documentos deste tipo", e não "versões anteriores": o
                // slot padrão aceita mais de um documento do mesmo tipo, e
                // chamá-los de versão sugere que só o primeiro vale.
                <p className="m-0 text-sm font-semibold text-[var(--color-action)]">
                  +{linha.extra} {linha.extra === 1 ? "outro documento" : "outros documentos"} deste
                  tipo
                </p>
              )}

              {linha.doc ? (
                <div className="space-y-1 text-sm text-[var(--fg-2)]">
                  <p className="m-0">
                    atualizado em {br(linha.doc.updatedAt)}
                    {linha.doc.validUntil
                      ? ` · válido até ${br(linha.doc.validUntil)}`
                      : " · sem validade"}
                  </p>
                  {/* O nome do arquivo saiu do cartão: ele ocupava uma linha em
                      todos para informar em nenhum. O que continua aparecendo é a
                      ausência dele, que é o estado que engana. */}
                  {semArquivo && (
                    <p className="m-0 font-bold text-[var(--color-danger-fg)]">
                      <Icon name="fa-file" className="mr-2" />
                      sem arquivo anexado
                    </p>
                  )}
                  {linha.doc.hours !== undefined && (
                    <p className="m-0 font-bold text-[var(--color-brand-purple-dark)]">
                      {linha.doc.hours}h de carga horária
                    </p>
                  )}
                </div>
              ) : (
                // Itálico: é texto de apoio do tipo, não dado do documento.
                <p className="m-0 text-sm italic text-[var(--fg-2)]">{linha.type.hint}</p>
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
                          title={`compartilhado em ${br(share.at)}`}
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

                {/* `color="brand"`: é a ação repetida da lista, uma por cartão.
                    Em `tint` azul, os onze botões ficavam da cor do "Adicionar
                    documento" do cabeçalho, que é a ação da página. */}
                <Button
                  size="medium"
                  variant="tint"
                  color="brand"
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
  podeEditar,
  onEditar,
}: {
  linhas: Linha[];
  insurers: DocumentInsurer[];
  hoje: string;
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
            {linha.standard && <span className="ml-2"><SeloPadrao /></span>}
          </p>
          <p className="m-0 text-sm">
            <Icon name={hasFile(linha.doc) ? "fa-file-pdf" : "fa-file"} className="mr-2" />
            {hasFile(linha.doc) ? linha.doc?.file : "sem arquivo anexado"}
          </p>
        </div>
      ),
    },
    { label: "Nº", render: (linha) => linha.doc?.number ?? "—" },
    { label: "Atualizado", render: (linha) => br(linha.doc?.updatedAt) },
    {
      label: "Validade",
      render: (linha) =>
        linha.doc?.validUntil ? br(linha.doc.validUntil) : "—",
    },
    {
      label: "Status",
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
        // `small`: a ação da tabela real são ícones de 24px, não um botão de 48.
        // Aqui o rótulo fica — "Anexar" e "Editar" não são a mesma ação, e o
        // ícone sozinho não diria qual é — mas na altura do botão pequeno.
        <Button
          size="small"
          variant="tint"
          color="brand"
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
  onSave: (valores: ValoresDoDocumento) => void;
}) {
  const editando = Boolean(linha?.doc);
  const travado = isTypeLocked(linha?.type);

  /**
   * O tipo escolhido nas pastilhas.
   *
   * Só existe quando o tipo **não** é travado: no slot padrão ele vem da linha e
   * não se escolhe. `undefined` significa "o da linha", que é o que mantém o
   * formulário coerente quando a pessoa abre uma pasta e volta.
   */
  const [tipoEscolhido, setTipoEscolhido] = useState<string | undefined>(undefined);
  const [nome, setNome] = useState("");
  // `undefined` é "não mexeu no arquivo"; `""` é "removeu o que estava anexado".
  // Sem essa distinção, remover o anexo de um documento salvo cairia de volta no
  // arquivo do servidor e o botão de remover não faria nada.
  const [arquivo, setArquivo] = useState<string | undefined>(undefined);
  const [tamanho, setTamanho] = useState(0);
  const [temValidade, setTemValidade] = useState(false);
  const [validade, setValidade] = useState("");
  const [horas, setHoras] = useState("");
  const [tocado, setTocado] = useState(false);
  const [compartilhar, setCompartilhar] = useState<string[]>([]);

  /**
   * O formulário começa no estado do documento que foi aberto.
   *
   * O que mais importa aqui é o compartilhamento: a etiqueta da operadora no
   * cartão **quer dizer** que o documento já está compartilhado com ela, então
   * abrir o formulário com o campo vazio dizia o contrário — e salvar assim
   * pareceria revogar o acesso.
   *
   * Roda por documento aberto, não a cada render, e não roda no fechamento: o
   * `linha` vira `null` enquanto o painel ainda desliza para fora, e limpar ali
   * apagaria o conteúdo na frente de quem está olhando.
   */
  const chave = linha?.key;
  useEffect(() => {
    if (!linha) return;
    setTipoEscolhido(undefined);
    setNome(linha.type.id === "other" ? (linha.doc?.name ?? "") : "");
    setArquivo(undefined);
    setTamanho(0);
    setTemValidade(Boolean(linha.doc?.validUntil));
    setValidade(linha.doc?.validUntil ?? "");
    setHoras(linha.doc?.hours !== undefined ? String(linha.doc.hours) : "");
    setTocado(false);
    setCompartilhar(linha.doc?.sharedWith.map((share) => share.insurerId) ?? []);
    // `chave` identifica o documento aberto; `linha` muda de referência a cada
    // render da tela e reiniciaria o preenchimento no meio da digitação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  /** O tipo em vigor: o escolhido nas pastilhas, ou o da linha aberta. */
  const tipo: DocumentType | undefined =
    TIPOS_ABERTOS.find((item) => item.id === tipoEscolhido) ?? linha?.type;
  const tipoAberto = tipo?.id === "other";

  /**
   * O nome que vai ser salvo.
   *
   * Fora do tipo aberto ele **é** o nome do tipo, e é isso que mantém o cabeçalho
   * da matriz e o cartão falando a mesma língua. No tipo aberto é o que a pessoa
   * digitou, e aí ele é obrigatório: sem nome, o cartão sairia como "Outro
   * documento" e a pasta ganharia dois cartões indistinguíveis.
   */
  const nomeAtual = tipoAberto ? nome : (tipo?.name ?? "");
  const arquivoAtual = arquivo ?? linha?.doc?.file ?? "";
  const exigeHoras = tipo?.id === "aba_course";

  const erroNome =
    tipoAberto && !nome.trim() ? "Informe um nome para o documento." : undefined;
  const erroArquivo = !arquivoAtual.trim() ? "Anexe o arquivo do documento." : undefined;
  const erroValidade = temValidade && !validade ? "Escolha a data de validade." : undefined;
  const erroHoras =
    exigeHoras && (!horas || Number(horas) <= 0) ? "Informe a carga horária em horas." : undefined;

  const invalido = Boolean(erroNome || erroArquivo || erroValidade || erroHoras);

  /** Quem exige este tipo para credenciar. Sai de `insurer.requires`. */
  const exigidoPor = useMemo(
    () =>
      tipo ? insurers.filter((insurer) => insurer.requires.includes(tipo.id)) : [],
    [insurers, tipo],
  );

  /**
   * As operadoras como opções do multiselect.
   *
   * Quem decide aqui é `canSelectInsurer`, não `canShare`: escolher a operadora
   * não depende do arquivo, e o arquivo é condição do salvar. A operadora que
   * não pode receber — particular, ou falta de permissão — continua na lista,
   * desabilitada, e o `reason` da regra é o que a pessoa lê abaixo do campo.
   */
  const opcoesDeCompartilhamento = useMemo(
    () =>
      insurers.map((insurer) => {
        const decisao = canSelectInsurer(insurer, permissions);

        return {
          label: insurer.name,
          value: insurer.id,
          hint: tipo && insurer.requires.includes(tipo.id) ? "exige este tipo" : undefined,
          disabled: !decisao.allowed,
          reason: decisao.allowed ? undefined : decisao.reason,
        };
      }),
    [insurers, tipo, permissions],
  );

  /**
   * O que a escolha ainda não faz.
   *
   * Sem o anexo, a intenção está registrada e o compartilhamento não acontece —
   * é o que `canShare` recusa no documento salvo. Dizer isso no campo é o que
   * evita a leitura de que marcar já liberou o acesso.
   */
  const compartilhamentoPendente =
    compartilhar.length > 0 && !arquivoAtual.trim()
      ? "Nada é compartilhado antes de salvar com o arquivo anexado. A operadora audita o papel, e um registro sem anexo é recusado como se não existisse."
      : undefined;

  function salvar() {
    setTocado(true);
    if (invalido) return;
    onSave({
      tipoId: tipo?.id ?? "",
      nome: nomeAtual,
      arquivo: arquivoAtual,
      validade: temValidade ? validade : undefined,
      horas: exigeHoras && horas ? Number(horas) : undefined,
      compartilhar,
    });
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
      titleClassName="text-[var(--color-brand-purple-dark)]"
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {/* O rótulo diz o que vai acontecer. No modal do sistema é "Salvar"
              com `fa-save` nos dois casos, e criar não é a mesma coisa que
              alterar — quem abriu uma lacuna precisa saber que vai criar. */}
          <Button rightIcon="fa-check" onClick={salvar}>
            {editando ? "Salvar alterações" : "Adicionar documento"}
          </Button>
        </div>
      }
    >
      {linha && (
        <div className="space-y-6">
          <div>
            <FieldsetLabel>Tipo de documento</FieldsetLabel>

            {travado ? (
              // Pastilha, e não caixa de aviso com parágrafo. O tipo fixo é um
              // dado do formulário — o que ele é —, e o cadeado já diz que não
              // se escolhe. A explicação de por que ele é fixo estava ocupando
              // quatro linhas para dizer uma coisa que ninguém tentou fazer.
              <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-purple-dark)]/8 px-4 py-2 font-bold text-[var(--color-brand-purple-dark)]">
                <Icon name="fa-lock" type="solid" className="text-xs" />
                {linha.type.name}
              </span>
            ) : (
              <RadioSelector
                className="mt-2"
                name="documento[tipo]"
                layout="pills"
                value={tipo?.id}
                options={TIPOS_ABERTOS.map((item) => ({ value: item.id, label: item.name }))}
                onChange={setTipoEscolhido}
              />
            )}
          </div>

          {/* O nome só é campo no tipo aberto. Nos outros ele **é** o tipo, e um
              campo pré-preenchido com "Currículo" convida a reescrever o que a
              matriz usa como cabeçalho de coluna. */}
          {tipoAberto && (
            <Input
              id="documento-nome"
              label="Nome do documento"
              placeholder="Ex.: Curso de formação em ABA — 180h"
              value={nome}
              errors={tocado && erroNome ? [erroNome] : []}
              onChange={(event) => setNome(event.target.value)}
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

          {/* A data ao lado da escolha, e não abaixo dela: "Definir data" sem o
              campo à vista faz a pessoa procurar onde digitar. */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RadioGroup
              label="Validade"
              name="documento[validade]"
              value={temValidade ? "com" : "sem"}
              options={[
                { value: "sem", label: "Sem validade" },
                { value: "com", label: "Definir data" },
              ]}
              onChange={(valor) => setTemValidade(valor === "com")}
            />

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
          </div>

          <div>
            <FieldsetLabel>Arquivo</FieldsetLabel>
            <FileUploader
              className="mt-2"
              id="documento-arquivo"
              name="documento[file]"
              variant="inline"
              hint="PDF, JPG ou PNG até 10 MB"
              fileName={arquivoAtual}
              fileSize={tamanho}
              errors={tocado && erroArquivo ? [erroArquivo] : []}
              onFileChange={(file) => {
                setArquivo(file?.name ?? "");
                setTamanho(file?.size ?? 0);
              }}
            />
          </div>

          {/* O compartilhamento em painel próprio: é a parte do formulário que
              decide credenciamento, e a única cujo efeito sai da clínica. */}
          <div className="rounded-lg bg-[var(--color-brand-purple-dark)]/5 p-4">
            <FieldsetLabel>Compartilhar com operadoras</FieldsetLabel>
            <MultiSelect
              className="mt-2"
              id="documento-compartilhar"
              name="documento[insurers]"
              ariaLabel="Compartilhar com operadoras"
              note={compartilhamentoPendente}
              prompt="Nenhuma operadora"
              values={compartilhar}
              options={opcoesDeCompartilhamento}
              onChange={setCompartilhar}
            />

            {exigidoPor.length > 0 && (
              // Quem exige este tipo, dito antes da escolha. Sai de
              // `insurer.requires`, então a frase acompanha o catálogo em vez de
              // repetir de cabeça o que cada convênio pede.
              <p className="m-0 mt-3 flex gap-2 text-sm text-[var(--fg-2)]">
                <Icon
                  name="fa-circle-info"
                  type="solid"
                  className="mt-0.5 shrink-0 text-[var(--color-brand-blue)]"
                />
                <span>
                  Exigido por {exigidoPor.map((insurer) => insurer.name).join(", ")} para
                  credenciar.
                </span>
              </p>
            )}
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
  hoje,
  onClose,
}: {
  open: boolean;
  documents: ProfessionalDocument[];
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

        <p className="sr-only">{br(hoje)}</p>
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
        { label: "Profissionais", path: "/team/documentation" },
        { label: pasta?.professional.name ?? "Profissional" },
        { label: "Documentos" },
      ]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
