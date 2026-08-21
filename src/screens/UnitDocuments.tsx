import { useEffect, useMemo, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  DocumentInsurer,
  DocumentState,
  DocumentType,
  UnitDocument,
  UnitDocumentsData,
  UnitListData,
  UnitProfile,
} from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import { EmptyState, ErrorState, LoadingState } from "../components/primitives.js";
import { Button } from "../components/bloomy/Button.js";
import { Card } from "../components/bloomy/Card.js";
import { RadioGroup } from "../components/bloomy/Choice.js";
import { RangeDatePicker } from "../components/bloomy/DatePickers.js";
import { FileUploader } from "../components/bloomy/FileUploader.js";
import { Input, MultiSelect, Select } from "../components/bloomy/Input.js";
import {
  Avatar,
  EmptyStateCard,
  FieldsetLabel,
  SectionHeader,
} from "../components/bloomy/Layout.js";
import { DrawerModal, DropdownMenu } from "../components/bloomy/Overlay.js";
import { Table, type Coluna } from "../components/bloomy/Table.js";
import { LazyTabs, type LazyTabEntry } from "../components/bloomy/Tabs.js";
import { Tag } from "../components/bloomy/Tag.js";
import { UNIT_DOCUMENT_TYPES } from "../fixtures/documents.js";
import {
  canSelectInsurer,
  daysUntil,
  documentStateLabel,
  hasFile,
  STATE_SEVERITY,
  unitDocumentState,
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
 * 2. **O responsável tem nome.** Quem responde pelo alvará é uma pessoa, e a
 *    vigilância pergunta por ela. No escopo profissional o documento é da própria
 *    pessoa, e a coluna não existiria.
 *
 * **O que saiu daqui.** A pasta tinha um segundo cartão, "Credenciamento da
 * unidade", que derivava o vínculo por operadora e explicava que onze documentos
 * em ordem não compensam o décimo segundo. Foi removido a pedido do time de
 * design — mesma decisão que a pasta do profissional já tinha recebido, e pelo
 * mesmo motivo: o credenciamento não é reconhecível no contexto da pasta.
 *
 * As regras continuam existindo e em uso na tela da operadora
 * (`InsurerDocuments`), que é onde o credenciamento é o assunto:
 * `unitCredentialStatus` e `unitMissingForInsurer` não foram tocadas.
 */
export function UnitDocuments({ params, context }: ScreenProps) {
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

  /**
   * A lista e a pasta são o mesmo fluxo, e por isso a mesma fixture.
   *
   * Quando o dado vem da lista, a unidade é escolhida pelo id da rota. Duas
   * fixtures obrigariam a trocar o seletor de dados no meio do caminho.
   */
  const pasta = comoPasta(data, params.id);
  if (!pasta) {
    return wrap(
      context,
      <EmptyState
        title="Unidade não encontrada"
        description={`Nenhuma unidade com o identificador ${params.id ?? "informado"}.`}
      />,
    );
  }

  return <Conteudo context={context} pasta={pasta} permissions={permissions} />;
}

/** Aceita a pasta pronta ou a fixture da lista, escolhendo pelo id da rota. */
function comoPasta(data: unknown, id: string | undefined): UnitDocumentsData | null {
  const bruto = data as (UnitDocumentsData & Partial<UnitListData>) | null;
  if (!bruto) return null;
  if (!bruto.units) return bruto;

  const unidade = bruto.units.find((item) => item.id === id) ?? bruto.units[0];
  if (!unidade) return null;

  // `documents` sai do perfil e vira campo próprio da pasta: é a mesma lista,
  // e duplicá-la faria duas verdades para a mesma coisa.
  const { documents, ...perfil } = unidade;

  return {
    now: bruto.now,
    unit: perfil,
    documents,
    insurers: bruto.insurers,
  };
}

/**
 * Etiqueta do sistema.
 *
 * A paleta de `tag/1` é a do monólito, e o contraste dela também: amarelo sobre
 * amarelo claro dá 2,04:1. A divergência está registrada na decisão 0001, e o
 * `espelho-do-sistema` é como este repositório marca o que é cópia fiel para que
 * a varredura de acessibilidade não a leia como defeito desta entrega.
 */
/** Selo "Padrão" dos cartões: cadeado antes do texto, com gap. */
function SeloPadrao({ item = "Padrão" }: { item?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-purple-dark)]/10 px-2.5 py-0.5 text-sm font-bold text-[var(--fg-2)]">
      <Icon name="fa-lock" type="solid" className="text-xs" />
      {item}
    </span>
  );
}

function Etiqueta(props: React.ComponentProps<typeof Tag>) {
  return (
    <Tag
      {...props}
      className={["espelho-do-sistema", props.className].filter(Boolean).join(" ")}
    />
  );
}

/* ============================================================= cabeçalho */

/** Singular ou plural, como o `pluralize/3` do original. */
function plural(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

/**
 * Cabeçalho da unidade — espelho de `UnitLive.Components.CardHeader`.
 *
 * Anatomia inteira de lá: avatar `extra_large`, nome em `text-2xl font-bold`, a
 * etiqueta de situação arredondada com ícone, e a linha de metadados em
 * `flex gap-5 flex-wrap` com quatro itens — profissionais, salas, telefone e
 * endereço por extenso.
 *
 * **As duas contagens são derivadas, não campo.** No sistema elas vêm de
 * `count_unit_rooms/1` e `count_unit_professionals/1`, chamadas no `update` do
 * componente. Quem for implementar precisa saber que o cabeçalho faz duas
 * consultas, e que uma unidade recém-cadastrada mostra zero nas duas.
 *
 * Uma correção intencional: o original monta o endereço interpolando cinco
 * campos numa string só, e uma unidade sem bairro sai como
 * "Rua Teste, 000 - , Campinas - SP". Aqui as partes vazias caem fora.
 */
function CabecalhoDaUnidade({
  unidade,
  podeEditar,
}: {
  unidade: UnitProfile;
  podeEditar: boolean;
}) {
  const endereco = [
    [unidade.street, unidade.number].filter(Boolean).join(", "),
    unidade.neighborhood,
    [unidade.city, unidade.state].filter(Boolean).join(" - "),
  ]
    .filter(Boolean)
    .join(", ");

  /**
   * O cabeçalho é o `header` do `lazy_tabs`, não um cartão à parte.
   *
   * Mesma anatomia do perfil do profissional: no sistema, o componente **é** o
   * cartão, e as abas do cadastro correm por baixo do nome. Aqui elas são as oito
   * de `unit_live/edit.ex` — Documentos é a única portada, e as outras aparecem
   * desativadas de propósito: esconder a lacuna faria a pasta parecer a tela
   * inteira da unidade.
   */
  const cabecalho = (
    <div className="espelho-do-sistema">
      <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar title={unidade.name} size="extra_large" />

          <div className="space-y-2">
            <h1 className="m-0 text-2xl font-bold text-[var(--color-brand-purple-dark)]">
              {unidade.name}
            </h1>

            <div className="mt-2 flex gap-1.5">
              <Etiqueta
                item={unidade.active ? "Ativo" : "Inativo"}
                variant={unidade.active ? "green" : "red"}
                className="rounded-full"
                icon={unidade.active ? "fa-solid fa-circle-check" : "fa-solid fa-circle-xmark"}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-5 text-[var(--fg-2)]">
              <p className="m-0">
                <Icon name="fa-user-md" className="mr-2" />
                {plural(unidade.professionals, "profissional", "profissionais")}
              </p>
              <p className="m-0">
                <Icon name="fa-door-open" className="mr-2" />
                {plural(unidade.rooms, "sala", "salas")}
              </p>
              <p className="m-0">
                <Icon name="fa-phone" className="mr-2" />
                {unidade.phone}
              </p>
              <p className="m-0">
                <Icon name="fa-location-dot" className="mr-2" />
                {endereco}
              </p>
            </div>
          </div>
        </div>

        {/* `dropdown_menu/1` com os mesmos dois itens do original: voltar para a
            lista e inativar. Inativar fica desabilitada sem `units.edit`, com o
            motivo — a decisão 0003 vale para o item de menu como vale para o
            botão. */}
        <div className="flex shrink-0 flex-row gap-4">
          <DropdownMenu
            id="unit_header_dropdown"
            items={[
              <a
                key="voltar"
                href="/structure/documents"
                className="flex h-12 items-center gap-2 rounded-md px-3 font-bold text-[var(--color-neutral-600)] no-underline hover:bg-[var(--color-brand-purple-dark)]/5"
              >
                <Icon name="fa-arrow-left" />
                Voltar para lista
              </a>,
              <button
                key="status"
                type="button"
                disabled={!podeEditar}
                title={podeEditar ? undefined : "Inativar unidade é de quem edita a Estrutura."}
                className="flex h-12 w-full items-center gap-2 rounded-md border-0 bg-transparent px-3 font-bold text-[var(--color-brand-red)] hover:bg-[var(--color-brand-purple-dark)]/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon name="fa-power-off" />
                {unidade.active ? "Inativar" : "Reativar"}
              </button>,
            ]}
          />
        </div>
      </div>
    </div>
  );

  return (
    <LazyTabs
      className="espelho-do-sistema"
      id="abas-da-unidade"
      label="Cadastro da unidade"
      tabs={ABAS_DA_UNIDADE}
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
 * As abas do cadastro da unidade.
 *
 * São as oito de `unit_live/edit.ex`, na ordem de lá. "Salas" tem sub-abas no
 * original — Salas e Bloqueios —, e aqui é uma só: o aninhamento vive dentro do
 * painel, que não foi portado.
 *
 * Origem: `lib/bloomy_web/backoffice/live/unit_live/edit.ex:20-131`.
 */
const ABAS_DA_UNIDADE: LazyTabEntry<string>[] = [
  { id: "unit_data", label: "Dados da Unidade", disabled: true },
  { id: "address", label: "Endereço", disabled: true },
  { id: "patients", label: "Pacientes", disabled: true },
  { id: "rooms", label: "Salas", disabled: true },
  { id: "services", label: "Serviços", disabled: true },
  { id: "agenda", label: "Agenda", disabled: true },
  { id: "agenda_limit", label: "Limite de Agenda", disabled: true },
  { id: "documents", label: "Documentos" },
];

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

/** dd/mm/aaaa — o formato da tabela, como na do profissional. */
function br(iso: string | undefined): string {
  if (!iso) return "—";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/* ================================================================= resumo */

type Contagem = { pendente: number; emOrdem: number; aVencer: number; vencido: number };

/**
 * O resumo da pasta, só com o que tem documento.
 *
 * Mesma regra da pasta do profissional: "0 a vencer" e "0 vencidos" gastavam duas
 * etiquetas para dizer que não há nada a fazer, e diluíam as que dizem que há. A
 * ausência de vermelho é a informação.
 */
function Resumo({ contagem }: { contagem: Contagem }) {
  const etiquetas = [
    contagem.pendente > 0 && {
      key: "pendente",
      item: `${contagem.pendente} ${contagem.pendente === 1 ? "pendente" : "pendentes"}`,
      variant: "light-blue" as const,
    },
    contagem.emOrdem > 0 && {
      key: "emOrdem",
      item: `${contagem.emOrdem} em ordem`,
      variant: "green" as const,
    },
    contagem.aVencer > 0 && {
      key: "aVencer",
      item: `${contagem.aVencer} a vencer`,
      variant: "orange" as const,
    },
    contagem.vencido > 0 && {
      key: "vencido",
      item: `${contagem.vencido} ${contagem.vencido === 1 ? "vencido" : "vencidos"}`,
      variant: "red" as const,
    },
  ].filter(Boolean) as {
    key: string;
    item: string;
    variant: "light-blue" | "green" | "orange" | "red";
  }[];

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

const PADRAO = [
  { label: "Somente padrão", value: "padrao" },
  { label: "Somente fora do padrão", value: "extra" },
];

/** Os cinco filtros da pasta, os mesmos da pasta do profissional. */
function FiltrosDaPasta({
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
  const tipos = [
    ...new Map(
      linhas
        .filter((linha) => linha.type)
        .map((linha) => [linha.type!.id, linha.type!] as const),
    ).values(),
  ];

  const situacoes = [...new Set(linhas.map((linha) => unitDocumentState(linha.doc, hoje)))]
    .sort((a, b) => STATE_SEVERITY[a] - STATE_SEVERITY[b])
    .map((estado) => ({ label: documentStateLabel(estado), value: estado }));

  const operadoras = insurers.filter((insurer) =>
    linhas.some((linha) => linha.doc?.sharedWith.includes(insurer.id)),
  );

  return (
    <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Input
        id="documentos-unidade-nome"
        label="Nome"
        placeholder="Buscar por nome"
        rightIcon="fa-search"
        value={valores.nome}
        onChange={(evento) => onChange({ ...valores, nome: evento.target.value })}
      />
      <Select
        id="documentos-unidade-tipo"
        label="Tipo"
        prompt="Todos"
        value={valores.tipo}
        options={tipos.map((tipo) => ({ label: tipo.name, value: tipo.id }))}
        onChange={(tipo) => onChange({ ...valores, tipo })}
      />
      <Select
        id="documentos-unidade-situacao"
        label="Status"
        prompt="Todos"
        value={valores.situacao}
        options={situacoes}
        onChange={(situacao) => onChange({ ...valores, situacao })}
      />
      <Select
        id="documentos-unidade-operadora"
        label="Operadora"
        prompt="Todas"
        value={valores.operadora}
        options={operadoras.map((insurer) => ({ label: insurer.name, value: insurer.id }))}
        onChange={(operadora) => onChange({ ...valores, operadora })}
      />
      <Select
        id="documentos-unidade-padrao"
        label="Padrão"
        prompt="Todos"
        value={valores.padrao}
        options={PADRAO}
        onChange={(padrao) => onChange({ ...valores, padrao })}
      />
    </div>
  );
}

function passaNoFiltro(linha: Linha, valores: ValoresDeFiltro, hoje: string): boolean {
  const busca = valores.nome.trim().toLowerCase();
  if (busca && !linha.nome.toLowerCase().includes(busca)) return false;
  if (valores.tipo && linha.type?.id !== valores.tipo) return false;
  if (valores.situacao && unitDocumentState(linha.doc, hoje) !== valores.situacao) return false;
  if (valores.padrao === "padrao" && !linha.standard) return false;
  if (valores.padrao === "extra" && linha.standard) return false;
  if (valores.operadora && !linha.doc?.sharedWith.includes(valores.operadora)) return false;
  return true;
}

/* =============================================================== cartões */

/**
 * A validade em uma linha.
 *
 * Três estados que o escopo da unidade tem e o do profissional não: a vigência
 * que ainda não começou, a cadência de renovação e o "conforme contrato" do
 * imóvel. A cadência vem de `renewal` no catálogo — não da frase de `hint`.
 */
function linhaDeValidade(linha: Linha): string {
  const partes: string[] = [];

  if (linha.doc?.validFrom && linha.doc.validFrom > (linha.doc.validUntil ?? "")) {
    partes.push(`a partir de ${br(linha.doc.validFrom)}`);
  }
  partes.push(linha.doc?.validUntil ? `Expira em ${br(linha.doc.validUntil)}` : "Sem validade");

  // "renovação sem validade" não é frase: quando a cadência repete o que a
  // validade já disse, ela sai.
  const renovacao = linha.type?.renewal;
  if (renovacao && renovacao !== "sem validade") partes.push(`renovação ${renovacao}`);

  return partes.join(" · ");
}

function Cartoes({
  linhas,
  insurers,
  hoje,
  podeEditar,
  onAbrir,
}: {
  linhas: Linha[];
  insurers: DocumentInsurer[];
  hoje: string;
  podeEditar: boolean;
  onAbrir: (linha: Linha) => void;
}) {
  return (
    // Mesma densidade da pasta do profissional, e a sexta coluna pelo mesmo
    // motivo: "Aguardando vigência" é a etiqueta mais larga deste escopo.
    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1900px]:grid-cols-6">
      {linhas.map((linha) => {
        const estado = unitDocumentState(linha.doc, hoje);
        const dias = linha.doc?.validUntil ? daysUntil(linha.doc.validUntil, hoje) : undefined;
        const semArquivo = Boolean(linha.doc) && !hasFile(linha.doc);

        return (
          <li key={linha.key}>
            <article
              className={[
                "flex h-full flex-col gap-3 rounded-2xl border border-[var(--color-brand-purple-dark)]/10 p-5",
                linha.doc ? undefined : "bg-[var(--color-brand-purple-dark)]/5",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--color-brand-purple-dark)]/8">
                  <Icon
                    name={linha.type?.icon ?? "fa-file"}
                    type="solid"
                    className="text-[var(--color-brand-purple-dark)]"
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {linha.standard ? (
                    <SeloPadrao />
                  ) : (
                    <Etiqueta item="Adicional" variant="brand" className="text-xs" />
                  )}
                  <Etiqueta item={documentStateLabel(estado, dias)} variant={TOM[estado]} />
                </div>
              </div>

              <h2 className="m-0 text-base font-bold text-[var(--color-brand-purple-dark)]">
                {linha.nome}
              </h2>

              {linha.extra > 0 && (
                <p className="m-0 text-sm font-semibold text-[var(--color-action)]">
                  +{linha.extra} {linha.extra === 1 ? "outro documento" : "outros documentos"} deste
                  tipo
                </p>
              )}

              {linha.doc ? (
                <div className="space-y-1 text-sm text-[var(--fg-2)]">
                  <p className="m-0">{linhaDeValidade(linha)}</p>
                  {/* O responsável é do escopo da unidade: quem responde pelo
                      alvará é uma pessoa nomeada, e a vigilância pergunta por
                      ela. No profissional o documento é da própria pessoa. */}
                  <p className="m-0">
                    atualizado em {br(linha.doc.updatedAt)}
                    {linha.doc.responsible ? ` · ${linha.doc.responsible}` : ""}
                  </p>
                  {semArquivo && (
                    <p className="m-0 font-bold text-[var(--color-danger-fg)]">
                      <Icon name="fa-file" className="mr-2" />
                      sem arquivo anexado
                    </p>
                  )}
                </div>
              ) : (
                <p className="m-0 text-sm italic text-[var(--fg-2)]">
                  {[linha.type?.hint, linha.type?.renewal && `renovação ${linha.type.renewal}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}

              <div className="mt-auto space-y-3">
                {linha.doc && (
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    {linha.doc.sharedWith.length === 0 ? (
                      <span className="text-[var(--fg-2)]">Não compartilhado</span>
                    ) : (
                      linha.doc.sharedWith.map((id) => (
                        <Etiqueta
                          key={id}
                          item={insurers.find((item) => item.id === id)?.name ?? id}
                          variant="light-blue"
                        />
                      ))
                    )}
                  </div>
                )}

                <Button
                  size="medium"
                  variant="tint"
                  color="brand"
                  leftIcon={linha.doc ? "fa-pen" : "fa-plus"}
                  disabled={!podeEditar}
                  onClick={() => onAbrir(linha)}
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
  const hoje = pasta.now.slice(0, 10);
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState<Linha | null>(null);
  const [visao, setVisao] = useState<"cards" | "tabela">("cards");

  /**
   * O que foi salvo nesta sessão.
   *
   * Mesma razão da pasta do profissional: sem esta cópia, salvar só anunciava — o
   * cartão continuava mostrando a validade antiga, e a tela dizia uma coisa
   * enquanto mostrava outra. Numa especificação executável isso é pior que não
   * salvar, porque quem revisa conclui que a ação não faz nada.
   *
   * A cópia vive na tela e some ao recarregar. Ela é refeita quando a fixture
   * muda, que é o seletor de dados do rodapé trocando de estado.
   */
  const [documentos, setDocumentos] = useState(pasta.documents);
  useEffect(() => setDocumentos(pasta.documents), [pasta.documents]);
  const [filtros, setFiltros] = useState<ValoresDeFiltro>({
    nome: "",
    tipo: "",
    situacao: "",
    operadora: "",
    padrao: "",
  });
  const linhas = useMemo(() => montarLinhas(documentos), [documentos]);
  const filtradas = useMemo(
    () => linhas.filter((linha) => passaNoFiltro(linha, filtros, hoje)),
    [linhas, filtros, hoje],
  );
  const podeEditar = permissions.includes("units.edit");

  /** Quem já responde por algum documento da pasta. Sem cadastro de usuário. */
  const responsaveis = useMemo(
    () =>
      [...new Set(documentos.map((doc) => doc.responsible).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [documentos],
  );

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
            <span className="ml-2">
              {linha.standard ? <SeloPadrao /> : <Etiqueta item="Adicional" variant="brand" />}
            </span>
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
        linha.doc?.validFrom ? `a partir de ${br(linha.doc.validFrom)}` : "—",
    },
    {
      label: "Expira em",
      render: (linha) =>
        linha.doc?.validUntil ? br(linha.doc.validUntil) : "—",
    },
    {
      label: "Status",
      render: (linha) => {
        const estado = unitDocumentState(linha.doc, hoje);
        const dias = linha.doc?.validUntil ? daysUntil(linha.doc.validUntil, hoje) : undefined;
        return <Etiqueta item={documentStateLabel(estado, dias)} variant={TOM[estado]} />;
      },
    },
    { label: "Últ. atualização", render: (linha) => br(linha.doc?.updatedAt) },
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
      <CabecalhoDaUnidade unidade={pasta.unit} podeEditar={podeEditar} />

      <Card className="space-y-6">
        <SectionHeader
          variant="small"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="flex gap-1 rounded-lg bg-[var(--color-brand-purple-dark)]/5 p-1"
                role="group"
                aria-label="Visualização"
              >
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
                    {modo === "cards" ? "Cards" : "Tabela"}
                  </button>
                ))}
              </div>

              <Button className="espelho-do-sistema" variant="tint" rightIcon="fa-file-pdf">
                Exportar agrupado
              </Button>

              {/* Visível e desabilitada, não escondida: é a convenção do
                  produto para ação bloqueada — decisão 0003. */}
              <Button
                className="espelho-do-sistema"
                rightIcon="fa-plus"
                disabled={!podeEditar}
                title={podeEditar ? undefined : "Adicionar documento é de quem edita a Estrutura."}
                onClick={() =>
                  setEditando({ key: "novo", extra: 0, standard: false, nome: "" })
                }
              >
                Adicionar documento
              </Button>
            </div>
          }
        >
          Documentos da unidade
        </SectionHeader>

        <Resumo contagem={contagem} />

        <FiltrosDaPasta
          linhas={linhas}
          insurers={pasta.insurers}
          hoje={hoje}
          valores={filtros}
          onChange={setFiltros}
        />

        {filtradas.length === 0 ? (
          <EmptyStateCard icon="fa-filter" text="Nenhum documento nesses filtros">
            Limpe um dos campos acima para ver o resto da pasta.
          </EmptyStateCard>
        ) : visao === "cards" ? (
          <Cartoes
            linhas={filtradas}
            insurers={pasta.insurers}
            hoje={hoje}
            podeEditar={podeEditar}
            onAbrir={setEditando}
          />
        ) : (
          <Table
            id="documentos-da-unidade"
            rows={filtradas}
            rowId={(linha) => linha.key}
            cols={colunas}
            actions={(linha) => (
              <Button
                size="small"
                variant="tint"
                color="brand"
                leftIcon={linha.doc ? "fa-pen" : "fa-plus"}
                disabled={!podeEditar}
                onClick={() => setEditando(linha)}
              >
                {linha.doc ? "Editar" : "Anexar"}
              </Button>
            )}
          />
        )}
      </Card>

      <p className="sr-only" role="status" aria-live="polite">
        {aviso}
      </p>

      <FormularioDoDocumento
        linha={editando}
        insurers={pasta.insurers}
        responsaveis={responsaveis}
        permissions={permissions}
        hoje={hoje}
        onClose={() => setEditando(null)}
        onSave={(valores) => {
          const linha = editando;
          if (!linha) return;
          setDocumentos((atuais) => salvarDocumento(atuais, linha, valores, hoje));
          setEditando(null);
          setAviso(
            `${valores.nome} salvo. ${
              valores.compartilhar.length === 0
                ? "Nenhuma operadora tem acesso a ele."
                : `Compartilhado com ${valores.compartilhar.length} ${valores.compartilhar.length === 1 ? "operadora" : "operadoras"}.`
            }`,
          );
        }}
      />
    </div>,
    pasta,
  );
}

/* ============================================================ formulário */

/** O que o formulário devolve ao salvar. */
type ValoresDoDocumento = {
  nome: string;
  responsavel: string;
  arquivo: string;
  vigencia?: { inicio: string; fim: string };
  compartilhar: string[];
};

/**
 * Aplica o que foi salvo à lista de documentos da sessão.
 *
 * Mesma decisão da pasta do profissional: **desmarcar é revogar**, e a operadora
 * que sai da seleção sai da lista. Aqui `sharedWith` é lista de id, então não há
 * data de compartilhamento a preservar.
 *
 * Sem `Date.now()`: a data de hoje vem do `now` declarado na fixture.
 */
function salvarDocumento(
  documentos: UnitDocument[],
  linha: Linha,
  valores: ValoresDoDocumento,
  hoje: string,
): UnitDocument[] {
  const campos = {
    name: valores.nome,
    responsible: valores.responsavel,
    file: valores.arquivo || undefined,
    validFrom: valores.vigencia?.inicio,
    validUntil: valores.vigencia?.fim,
    updatedAt: hoje,
    sharedWith: valores.compartilhar,
  };

  if (linha.doc) {
    const id = linha.doc.id;
    return documentos.map((doc) => (doc.id === id ? { ...doc, ...campos } : doc));
  }

  // Id determinístico: o tipo mais a posição na lista. Não há `Math.random()` em
  // fixture, regra ou tela, e um id de sessão não é exceção.
  const tipo = linha.type?.id ?? "extra";
  return [...documentos, { id: `${tipo}-${documentos.length + 1}`, typeId: tipo, ...campos }];
}

/**
 * Anexar ou editar um documento da unidade.
 *
 * O drawer é o mesmo da pasta do profissional — moldura da decisão 0014, grupos
 * nomeados, pastilha de tipo, arquivo em linha e o painel de compartilhamento —
 * com as duas peculiaridades que `unit_live/components/add_document_modal.ex`
 * tem e o do profissional não:
 *
 * 1. **A vigência é período, não só validade.** Alvará e licença têm começo e
 *    fim, e é o começo que produz "Aguardando vigência". O original usa
 *    `range_datepicker/1` neste campo, e é ele que está aqui.
 * 2. **O documento tem responsável.** Uma pessoa nomeada responde pelo papel, e
 *    a vigilância pergunta por ela. No original é um `select_search` de usuários;
 *    aqui as opções saem de quem já responde por algum documento da pasta, porque
 *    o Design Space não tem cadastro de usuário.
 *
 * O tipo nunca é escolhido: os doze do catálogo são todos slot padrão. Um
 * documento fora do catálogo — o `others` do original — entra com nome livre e
 * sem responsável obrigatório, que é a condição em que o original também não o
 * pede.
 */
function FormularioDoDocumento({
  linha,
  insurers,
  responsaveis,
  permissions,
  hoje,
  onClose,
  onSave,
}: {
  linha: Linha | null;
  insurers: DocumentInsurer[];
  responsaveis: string[];
  permissions: string[];
  hoje: string;
  onClose: () => void;
  onSave: (valores: ValoresDoDocumento) => void;
}) {
  const editando = Boolean(linha?.doc);
  const doCatalogo = Boolean(linha?.type);

  const [nome, setNome] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [arquivo, setArquivo] = useState<string | undefined>(undefined);
  const [tamanho, setTamanho] = useState(0);
  const [temVigencia, setTemVigencia] = useState(false);
  const [vigencia, setVigencia] = useState<{ inicio: string; fim: string } | undefined>(undefined);
  const [tocado, setTocado] = useState(false);
  const [compartilhar, setCompartilhar] = useState<string[]>([]);

  /**
   * O formulário começa no estado do documento aberto.
   *
   * Roda por documento, não a cada render, e não roda no fechamento: o `linha`
   * vira `null` enquanto o painel ainda desliza para fora, e limpar ali apagaria
   * o conteúdo na frente de quem está olhando.
   */
  const chave = linha?.key;
  useEffect(() => {
    if (!linha) return;
    setNome(linha.type ? "" : (linha.doc?.name ?? ""));
    setResponsavel(linha.doc?.responsible ?? "");
    setArquivo(undefined);
    setTamanho(0);
    setTemVigencia(Boolean(linha.doc?.validUntil));
    setVigencia(
      linha.doc?.validUntil
        ? { inicio: linha.doc.validFrom ?? linha.doc.updatedAt, fim: linha.doc.validUntil }
        : undefined,
    );
    setTocado(false);
    setCompartilhar(linha.doc?.sharedWith ?? []);
    // `chave` identifica o documento aberto; `linha` muda de referência a cada
    // render da tela e reiniciaria o preenchimento no meio da digitação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  const nomeAtual = doCatalogo ? (linha?.type?.name ?? "") : nome;
  const arquivoAtual = arquivo ?? linha?.doc?.file ?? "";

  const erroNome = !doCatalogo && !nome.trim() ? "Informe um nome para o documento." : undefined;
  const erroResponsavel =
    doCatalogo && !responsavel.trim() ? "Escolha quem responde por este documento." : undefined;
  const erroArquivo = !arquivoAtual.trim() ? "Anexe o arquivo do documento." : undefined;
  const erroVigencia = temVigencia && !vigencia ? "Escolha o período de vigência." : undefined;

  const invalido = Boolean(erroNome || erroResponsavel || erroArquivo || erroVigencia);

  /**
   * As operadoras como opções.
   *
   * Quem decide é `canSelectInsurer` no escopo da unidade: escolher a operadora
   * não depende do arquivo, e o arquivo é condição do salvar. Particular continua
   * na lista, desabilitada, com o motivo abaixo do campo.
   */
  const opcoes = useMemo(
    () =>
      insurers.map((insurer) => {
        const decisao = canSelectInsurer(insurer, permissions, "units.edit");
        return {
          label: insurer.name,
          value: insurer.id,
          disabled: !decisao.allowed,
          reason: decisao.allowed ? undefined : decisao.reason,
        };
      }),
    [insurers, permissions],
  );

  const compartilhamentoPendente =
    compartilhar.length > 0 && !arquivoAtual.trim()
      ? "Nada é compartilhado antes de salvar com o arquivo anexado. A operadora audita o papel, e um registro sem anexo é recusado como se não existisse."
      : undefined;

  function salvar() {
    setTocado(true);
    if (invalido) return;
    onSave({
      nome: nomeAtual,
      responsavel,
      arquivo: arquivoAtual,
      vigencia: temVigencia ? vigencia : undefined,
      compartilhar,
    });
  }

  return (
    <DrawerModal
      id="documento-da-unidade"
      show={Boolean(linha)}
      onCancel={onClose}
      title={
        editando
          ? "Editar documento"
          : doCatalogo
            ? `Anexar ${linha?.type?.name ?? "documento"}`
            : "Adicionar documento"
      }
      variant="medium"
      titleClassName="text-[var(--color-brand-purple-dark)]"
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
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
            <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-purple-dark)]/8 px-4 py-2 font-bold text-[var(--color-brand-purple-dark)]">
              <Icon name="fa-lock" type="solid" className="text-xs" />
              {linha.type?.name ?? "Documento adicional"}
            </span>
          </div>

          {!doCatalogo && (
            <Input
              id="documento-unidade-nome"
              label="Nome do documento"
              placeholder="Ex.: Laudo de inspeção elétrica"
              value={nome}
              errors={tocado && erroNome ? [erroNome] : []}
              onChange={(evento) => setNome(evento.target.value)}
            />
          )}

          {/* Responsável só no slot do catálogo, como no original, que pede a
              pessoa apenas no documento `regulatory`. */}
          {doCatalogo && (
            <Select
              id="documento-unidade-responsavel"
              label="Responsável"
              prompt="Selecione o responsável"
              value={responsavel}
              options={responsaveis.map((pessoa) => ({ label: pessoa, value: pessoa }))}
              errors={tocado && erroResponsavel ? [erroResponsavel] : []}
              onChange={setResponsavel}
            />
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RadioGroup
              label="Vigência"
              name="documento-unidade[vigencia]"
              value={temVigencia ? "com" : "sem"}
              options={[
                { value: "sem", label: "Sem validade" },
                { value: "com", label: "Definir período" },
              ]}
              onChange={(valor) => setTemVigencia(valor === "com")}
            />

            {temVigencia && (
              // `range_datepicker/1`, como no original: um campo, duas datas. É o
              // começo do período que produz "Aguardando vigência", e separar em
              // dois campos deixava a relação entre eles por conta de quem lê.
              <RangeDatePicker
                id="documento-unidade-vigencia"
                label="Período de vigência"
                value={vigencia}
                errors={tocado && erroVigencia ? [erroVigencia] : []}
                onChange={setVigencia}
              />
            )}
          </div>

          <div>
            <FieldsetLabel>Arquivo</FieldsetLabel>
            <FileUploader
              className="mt-2"
              id="documento-unidade-arquivo"
              name="documento-unidade[file]"
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

          <div className="rounded-lg bg-[var(--color-brand-purple-dark)]/5 p-4">
            <FieldsetLabel>Compartilhar com operadoras</FieldsetLabel>
            <MultiSelect
              className="mt-2"
              id="documento-unidade-compartilhar"
              name="documento-unidade[insurers]"
              ariaLabel="Compartilhar com operadoras"
              note={compartilhamentoPendente}
              prompt="Nenhuma operadora"
              values={compartilhar}
              options={opcoes}
              onChange={setCompartilhar}
            />

            {/* No escopo da unidade não há frase de "exigido por": a vigilância
                não negocia por convênio, então todas exigem os doze. O que vale
                dizer é a consequência da falta. */}
            <p className="m-0 mt-3 flex gap-2 text-sm text-[var(--fg-2)]">
              <Icon
                name="fa-circle-info"
                type="solid"
                className="mt-0.5 shrink-0 text-[var(--color-brand-blue)]"
              />
              <span>
                Todas as operadoras exigem os doze documentos padrão. Faltando um, o endereço não
                credencia em nenhuma.
              </span>
            </p>
          </div>

          <p className="sr-only">{hoje}</p>
        </div>
      )}
    </DrawerModal>
  );
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
      subtitle={pasta?.unit.city}
      breadcrumb={[
        { label: "Unidades", path: "/structure/documents" },
        { label: pasta?.unit.name ?? "Unidade" },
        { label: "Documentos" },
      ]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
