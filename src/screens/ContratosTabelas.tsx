/**
 * Gestão de Contratos — Tabelas de Apoio e Campos por Categoria (Administrador).
 *
 * As dez listas que alimentam os formulários do módulo (FR-088, RN-064:
 * categoria, fluxo, forma e condição de pagamento, índice, tipo de cobrança,
 * natureza do dossiê, tipo de aditivo, tipo de encerramento, unidade), com
 * filtro por lista e "Mostrar Todas", e os campos extras que cada categoria
 * pede no Novo Contrato (FR-093, RN-065).
 *
 * Opção nova nasce ativa, com ordem 10; o código, se vazio, vem da descrição em
 * MAIÚSCULAS com "_" no lugar dos espaços e, se já existir na lista, ganha um
 * sufixo de desempate (_2, _3…). Opção em uso não se exclui: excluir quebraria
 * os contratos que a usam, então a tela avisa e oferece desativar (some dos
 * formulários, os contratos existentes continuam com ela).
 *
 * Para as outras telas: `linkTabela` abre a lista já filtrada (FR-088),
 * `adicionarOpcaoRapida` é a inclusão só com tipo e descrição (FR-090) e
 * `opcoesAtivas` dá as opções ativas na ordem, com um conjunto padrão se a
 * lista estiver vazia (FR-095).
 *
 * Feito na tela (componente novo): as etiquetas que escolhem a tabela e a
 * prévia do campo no Novo Contrato. O resto é `button_tabs` (controlado, `AbasBotao`), `table`, `input` (com `select` e `switch`), `modal`, `tag`,
 * `button` e `empty_state_card`.
 */
import { useState, type ReactNode } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Icon } from "../components/Icon.js";
import { Input, cx } from "../components/Input.js";
import { EmptyStateCard } from "../components/Layout.js";
import { DrawerModal, Modal } from "../components/Overlay.js";
import { Table } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import type { CampoCategoria, ContratosData, OpcaoTabela, TabelaId } from "./gestao-de-contratos/model.js";
import { ACOES_COMPACTAS, AbasBotao, Aviso, Bloco, ContratosShell, ROTAS, SeloLeitura, papelDe, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";

/** `curto` é o rótulo da etiqueta (cabem todas numa linha); `label`, o nome completo. */
const TABELAS: { id: TabelaId; label: string; curto: string; icon: string }[] = [
  { id: "categoria", label: "Categoria", curto: "Categoria", icon: "fa-tags" },
  { id: "fluxo", label: "Fluxo", curto: "Fluxo", icon: "fa-arrow-right-arrow-left" },
  { id: "forma_pagamento", label: "Forma de pagamento", curto: "Forma pgto.", icon: "fa-credit-card" },
  { id: "condicao_pagamento", label: "Condição de pagamento", curto: "Condição pgto.", icon: "fa-calendar-days" },
  { id: "indice", label: "Índice", curto: "Índice", icon: "fa-chart-line" },
  { id: "tipo_cobranca", label: "Tipo de cobrança", curto: "Cobrança", icon: "fa-file-invoice-dollar" },
  { id: "natureza_dossie", label: "Natureza do dossiê", curto: "Dossiê", icon: "fa-folder-check" },
  { id: "tipo_aditivo", label: "Tipo de aditivo", curto: "Aditivo", icon: "fa-file-plus" },
  { id: "tipo_encerramento", label: "Tipo de encerramento", curto: "Encerramento", icon: "fa-box-archive" },
  { id: "unidade", label: "Unidade", curto: "Unidade", icon: "fa-building" },
];
const labelDe = (id: TabelaId) => TABELAS.find((t) => t.id === id)!.label;

const TIPOS: { value: CampoCategoria["tipo"]; label: string; icon: string }[] = [
  { value: "texto", label: "Texto", icon: "fa-font" },
  { value: "numero", label: "Número", icon: "fa-hashtag" },
  { value: "lista", label: "Lista", icon: "fa-list" },
  { value: "data", label: "Data", icon: "fa-calendar" },
];
const tipoDe = (t: CampoCategoria["tipo"]) => TIPOS.find((x) => x.value === t)!;

const contratosLabel = (n: number) => `${n} contrato${n === 1 ? "" : "s"}`;

/* ------------------------------------------------------------------ */
/* Regras das listas (RN-064, FR-089, FR-090, FR-095)                  */
/* ------------------------------------------------------------------ */

/** Código padrão: a descrição em MAIÚSCULAS, com espaços trocados por "_". */
export const codigoDe = (descricao: string) => descricao.trim().toUpperCase().replace(/\s+/g, "_");

/** Código único na lista: em colisão, recebe sufixo de desempate (_2, _3…). */
export function codigoUnico(codigo: string, opcoes: OpcaoTabela[]) {
  const usados = new Set(opcoes.map((o) => o.codigo));
  if (!usados.has(codigo)) return codigo;
  let n = 2;
  while (usados.has(`${codigo}_${n}`)) n++;
  return `${codigo}_${n}`;
}

/** Nova opção: nasce ativa, ordem 10 por padrão, código derivado da descrição se vazio. */
export function novaOpcao(lista: TabelaId, opcoes: OpcaoTabela[], d: { descricao: string; codigo?: string; ordem?: number }): OpcaoTabela {
  const descricao = d.descricao.trim();
  return {
    id: `${lista}-${Date.now()}`,
    ordem: d.ordem ?? 10,
    codigo: codigoUnico((d.codigo?.trim() ? d.codigo.trim().toUpperCase() : codigoDe(descricao)), opcoes),
    descricao,
    ativo: true,
    emUso: 0,
  };
}

/** Inclusão rápida das outras telas (FR-090): só tipo e descrição; a descrição é aparada. */
export function adicionarOpcaoRapida(lista: TabelaId, opcoes: OpcaoTabela[], descricao: string): { opcao: OpcaoTabela } | { erro: string } {
  if (!descricao.trim()) return { erro: "Descrição obrigatória" };
  return { opcao: novaOpcao(lista, opcoes, { descricao }) };
}

/** Conjunto padrão quando a lista está vazia (FR-095). */
const PADROES: Record<TabelaId, string[]> = {
  categoria: ["PJ Assistencial", "CLT Trabalho", "Operadora Saúde", "Paciente Particular", "Locação Imobiliária", "TI / Software / SaaS", "Consultoria Projetos"],
  fluxo: ["Receita (Atendimento)", "Despesa (Contratação)", "Despesa (Pessoal)"],
  forma_pagamento: ["PIX", "TED / Transferência Bancária", "Boleto Bancário"],
  condicao_pagamento: ["À vista", "30 dias direto", "30 dias após a nota"],
  indice: ["IPCA (IBGE)", "IGP-M (FGV)", "Dissídio CCT", "Sem Reajuste / Fixo"],
  tipo_cobranca: ["NFS-e", "NF-e", "Boleto Bancário", "Fatura"],
  natureza_dossie: ["Jurídica / Societária", "Fiscal / Habilitação", "Regulatória / Técnica"],
  tipo_aditivo: ["Prorrogação", "Reajuste Financeiro", "Alteração de valor"],
  tipo_encerramento: ["Término de vigência", "Distrato amigável", "Rescisão unilateral"],
  unidade: ["Unidade Jardim"],
};

/** Opções que as listas de seleção mostram: só ativas, pela ordem e pela descrição (FR-095). */
export function opcoesAtivas(tabelas: ContratosData["tabelas"], lista: TabelaId) {
  const ativas = tabelas[lista].filter((o) => o.ativo).sort((a, b) => a.ordem - b.ordem || a.descricao.localeCompare(b.descricao)).map((o) => o.descricao);
  return ativas.length ? ativas : PADROES[lista];
}

/** Abre as Tabelas de Apoio já filtradas na lista (links de outras telas, FR-088). */
export function linkTabela(context: ScenarioContext, lista: TabelaId) {
  context.navigate(ROTAS.tabelas, { controls: { area: "tabelas", lista } });
}

type Area = "tabelas" | "campos";
const AREAS: { id: Area; titulo: string }[] = [
  { id: "tabelas", titulo: "Tabelas de apoio" },
  { id: "campos", titulo: "Campos por categoria" },
];

export function ContratosTabelas({ context }: ScreenProps) {
  const admin = papelDe(context, "administrador") === "administrador";
  return (
    <ContratosShell
      context={context}
      secao="tabelas"
      titulo="Tabelas de Apoio e Campos por Categoria"
      subtitulo="As opções que aparecem nos formulários do módulo e os campos extras de cada categoria de contrato."
    >
      {(data) => <Tabelas key={JSON.stringify(context.controls)} data={data} controls={context.controls as Record<string, string>} admin={admin} />}
    </ContratosShell>
  );
}

function Tabelas({ data, controls, admin }: { data: ContratosData; controls: Record<string, string>; admin: boolean }) {
  const [area, setArea] = useState<Area>(controls.area === "campos" ? "campos" : "tabelas");
  return (
    <div className="space-y-6">
      {/* As duas áreas num cartão só: o `button_tabs` fica na mesma linha do filtro e dos botões de cada área. */}
      <Bloco>
        {area === "tabelas"
          ? <AreaTabelas abas={<AbasBotao id="tabelas-area" abas={AREAS} ativa={area} onChange={setArea} />} data={data} controls={controls} admin={admin} />
          : <AreaCampos abas={<AbasBotao id="tabelas-area" abas={AREAS} ativa={area} onChange={setArea} />} data={data} controls={controls} admin={admin} />}
      </Bloco>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabelas de apoio                                                    */
/* ------------------------------------------------------------------ */

type Filtro = TabelaId | "todas";
type Linha = OpcaoTabela & { lista: TabelaId };
type ModalTabela = { tipo: "nova" } | { tipo: "excluir"; lista: TabelaId; id: string } | null;

/** Selo de quem só consulta as tabelas (não é Administrador). */
const SELO_LEITURA = <SeloLeitura motivo="Tabelas de apoio e campos por categoria são mantidos pelo Administrador. Para incluir ou mudar uma opção, peça a ele." />;

function AreaTabelas({ data, controls, admin, abas }: { data: ContratosData; controls: Record<string, string>; admin: boolean; abas: ReactNode }) {
  const [tabelas, setTabelas] = useState(data.tabelas);
  const [filtro, setFiltro] = useState<Filtro>(controls.lista === "todas" || TABELAS.some((t) => t.id === controls.lista) ? (controls.lista as Filtro) : "categoria");
  const listaInicial: TabelaId = filtro === "todas" ? "categoria" : filtro;
  const emUsoInicial = tabelas[listaInicial].find((o) => o.emUso > 0);
  const [modal, setModal] = useState<ModalTabela>(
    !admin ? null : controls.modal === "nova-opcao" ? { tipo: "nova" } : controls.modal === "excluir-em-uso" && emUsoInicial ? { tipo: "excluir", lista: listaInicial, id: emUsoInicial.id } : null,
  );
  const [rapida, setRapida] = useState<{ lista: TabelaId; descricao: string; erro?: string }>({ lista: listaInicial, descricao: "" });

  const todas = filtro === "todas";
  const ordenar = (l: OpcaoTabela[]) => [...l].sort((a, b) => a.ordem - b.ordem || a.descricao.localeCompare(b.descricao));
  const linhas: Linha[] = (todas ? TABELAS.map((t) => t.id) : [filtro]).flatMap((id) => ordenar(tabelas[id]).map((o) => ({ ...o, lista: id })));
  const mudar = (lista: TabelaId, fn: (l: OpcaoTabela[]) => OpcaoTabela[]) => setTabelas((t) => ({ ...t, [lista]: fn(t[lista]) }));
  const incluir = (lista: TabelaId, o: OpcaoTabela) => {
    mudar(lista, (l) => [...l, o]);
    showToast({ type: "success", title: "Opção incluída", content: `${o.descricao} (${o.codigo}) já aparece em ${labelDe(lista)}, ativa.`, closeTime: 4000 });
  };

  // Ativar/desativar fica na mesma lista (ou em Todas), a de origem (FR-091).
  const alternar = (o: Linha, ativo: boolean) => {
    mudar(o.lista, (l) => l.map((x) => (x.id === o.id ? { ...x, ativo } : x)));
    showToast({
      type: "success",
      title: ativo ? "Opção ativada" : "Opção desativada",
      content: ativo
        ? `${o.descricao} volta a aparecer nos formulários.`
        : `${o.descricao} não aparece mais nos formulários.${o.emUso ? ` Os ${contratosLabel(o.emUso)} que a usam continuam com ela.` : ""}`,
      closeTime: 5000,
    });
  };

  const adicionarRapido = () => {
    const r = adicionarOpcaoRapida(rapida.lista, tabelas[rapida.lista], rapida.descricao);
    if ("erro" in r) return setRapida((x) => ({ ...x, erro: r.erro }));
    incluir(rapida.lista, r.opcao);
    setRapida((x) => ({ ...x, descricao: "", erro: undefined }));
  };

  const emExclusao: Linha | undefined = modal?.tipo === "excluir" ? linhaDe(tabelas, modal.lista, modal.id) : undefined;

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* As dez tabelas e "Mostrar Todas" num `select`, como os filtros das listas do módulo. */}
        <div className="flex flex-wrap items-end gap-3">
          {abas}
          <div className="flex flex-wrap items-end gap-3 sm:ml-auto">
          {!admin && SELO_LEITURA}
          <Input
            type="select"
            id="tabelas-lista"
            clear={false}
            label="Tabela"
            value={filtro}
            options={[{ id: "todas" as const, label: "Mostrar Todas" }, ...TABELAS].map((t) => ({
              label: `${t.label} (${t.id === "todas" ? TABELAS.reduce((s, x) => s + tabelas[x.id].length, 0) : tabelas[t.id].length})`,
              value: t.id,
            }))}
            onChange={(v) => { const id = (v || "todas") as Filtro; setFiltro(id); if (id !== "todas") setRapida((x) => ({ ...x, lista: id, erro: undefined })); }}
            className="w-full sm:w-80"
          />
          {admin && <Button leftIcon="fa-plus" onClick={() => setModal({ tipo: "nova" })}>Nova opção</Button>}
          </div>
        </div>

        {/* Inclusão rápida (FR-090): a mesma que as outras telas usam, só tipo e descrição. */}
        {admin && (
          <div className="flex flex-wrap items-start gap-3 rounded-xl border border-dashed border-brand-blue/40 bg-brand-blue/5 p-4">
            <Input type="select" id="rapida-lista" clear={false} label="Adição rápida · tipo" value={rapida.lista} options={TABELAS.map((t) => ({ value: t.id, label: t.label }))} onChange={(v) => v && setRapida((x) => ({ ...x, lista: v as TabelaId, erro: undefined }))} className="w-full sm:w-56" />
            <Input id="rapida-descricao" label="Descrição" placeholder="Ex.: Consultoria" value={rapida.descricao} onChange={(e) => setRapida((x) => ({ ...x, descricao: e.target.value, erro: undefined }))} errors={rapida.erro ? [rapida.erro] : []} className="min-w-56 flex-1" />
            <Button variant="tint" leftIcon="fa-bolt" onClick={adicionarRapido} className="sm:mt-7">Adicionar</Button>
          </div>
        )}

        {linhas.length === 0 ? (
          <EmptyStateCard icon="fa-table-list" text="Nenhuma opção nesta tabela">
            <p>Inclua a primeira opção para ela aparecer nos formulários. Enquanto isso, os formulários mostram um conjunto padrão.</p>
          </EmptyStateCard>
        ) : (
          <Table
            className={ACOES_COMPACTAS}
            id={`tabela-${filtro}`}
            rows={linhas}
            rowId={(o) => `${o.lista}-${o.id}`}
            col={[
              ...(todas ? [{ label: "Lista", render: (o: Linha) => <span className="text-sm whitespace-nowrap">{labelDe(o.lista)}</span> }] : []),
              { label: "Ordem", className: "w-20", render: (o: Linha) => <span className="tabular-nums">{o.ordem}</span> },
              { label: "Código", render: (o: Linha) => <span className="text-sm font-bold tracking-wide">{o.codigo}</span> },
              { label: "Descrição", className: "min-w-48", render: (o: Linha) => <span className={cx("font-semibold", o.ativo ? "text-brand-purple-dark" : "text-brand-purple-dark/50")}>{o.descricao}</span> },
              {
                label: "Status",
                render: (o: Linha) =>
                  admin ? (
                    <div className="flex items-center gap-2">
                      <Input type="switch" id={`ativo-${o.lista}-${o.id}`} value={o.ativo} aria-label={`${o.ativo ? "Desativar" : "Ativar"} ${o.descricao}`} onChange={(e) => alternar(o, e.target.checked)} />
                      <span className="text-sm">{o.ativo ? "Ativo" : "Inativo"}</span>
                    </div>
                  ) : (
                    <Tag item={o.ativo ? "Ativo" : "Inativo"} variant={o.ativo ? "green" : "dark-purple"} />
                  ),
              },
              {
                label: "Em uso",
                render: (o: Linha) => (o.emUso ? <span className="text-sm whitespace-nowrap">em uso em {contratosLabel(o.emUso)}</span> : <span className="text-sm text-brand-purple-dark/40">sem uso</span>),
              },
            ]}
            action={
              admin
                ? [
                    (o) => (
                      <span className="inline-flex pr-3">
                        <Button size="small" variant="ghost" color="red" title="Excluir" aria-label={`Excluir ${o.descricao}`} onClick={() => setModal({ tipo: "excluir", lista: o.lista, id: o.id })}>
                          <Icon name="fa-trash-can" />
                        </Button>
                      </span>
                    ),
                  ]
                : []
            }
          />
        )}
      </div>

      {modal?.tipo === "nova" && (
        <ModalNovaOpcao
          inicial={todas ? "categoria" : filtro}
          tabelas={tabelas}
          onCancel={() => setModal(null)}
          onSalvar={(lista, o) => {
            incluir(lista, o);
            setModal(null);
          }}
        />
      )}

      {emExclusao && (
        <Modal id="excluir-opcao" show title={emExclusao.emUso ? "Opção em uso" : "Excluir opção"} variant="extra_small" onCancel={() => setModal(null)}>
          <div className="flex flex-col gap-5">
            {emExclusao.emUso > 0 ? (
              <Aviso tom="risco" titulo={`Usada em ${contratosLabel(emExclusao.emUso)}. Excluir quebraria esses contratos.`}>
                {emExclusao.ativo
                  ? `Desative "${emExclusao.descricao}": ela some dos formulários e os contratos que já a usam continuam com ela.`
                  : `"${emExclusao.descricao}" já está inativa: não aparece em contratos novos e os existentes continuam com ela. Não há o que excluir.`}
              </Aviso>
            ) : (
              <p className="text-brand-purple-dark/80">
                Excluir <b>{emExclusao.descricao}</b> ({emExclusao.codigo}) de {labelDe(emExclusao.lista)}? Nenhum contrato usa esta opção. A exclusão não pode ser desfeita.
              </p>
            )}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <Button variant="outline" onClick={() => setModal(null)}>{emExclusao.emUso && !emExclusao.ativo ? "Fechar" : "Cancelar"}</Button>
              {emExclusao.emUso > 0 ? (
                emExclusao.ativo && <Button leftIcon="fa-toggle-off" onClick={() => { alternar(emExclusao, false); setModal(null); }}>Desativar</Button>
              ) : (
                <Button color="red" leftIcon="fa-trash-can" onClick={() => {
                  mudar(emExclusao.lista, (l) => l.filter((x) => x.id !== emExclusao.id));
                  setModal(null);
                  showToast({ type: "success", title: "Opção excluída", content: `${emExclusao.descricao} saiu de ${labelDe(emExclusao.lista)}.`, closeTime: 4000 });
                }}>Excluir</Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function linhaDe(tabelas: ContratosData["tabelas"], lista: TabelaId, id: string): Linha | undefined {
  const o = tabelas[lista].find((x) => x.id === id);
  return o && { ...o, lista };
}

function ModalNovaOpcao({ inicial, tabelas, onCancel, onSalvar }: { inicial: TabelaId; tabelas: ContratosData["tabelas"]; onCancel: () => void; onSalvar: (lista: TabelaId, o: OpcaoTabela) => void }) {
  const [lista, setLista] = useState<TabelaId>(inicial);
  const [descricao, setDescricao] = useState("");
  const [codigo, setCodigo] = useState("");
  const [ordem, setOrdem] = useState("10");
  const [erros, setErros] = useState<{ descricao?: string; ordem?: string }>({});
  const opcoes = tabelas[lista];
  const base = codigo.trim() ? codigo.trim().toUpperCase() : codigoDe(descricao);
  const final = base ? codigoUnico(base, opcoes) : "";

  const salvar = () => {
    const e: typeof erros = {};
    if (!descricao.trim()) e.descricao = "Descrição obrigatória";
    if (!(Number(ordem) >= 0) || ordem.trim() === "") e.ordem = "Informe a ordem (número inteiro).";
    setErros(e);
    if (Object.keys(e).length) return;
    onSalvar(lista, novaOpcao(lista, opcoes, { descricao, codigo, ordem: Number(ordem) }));
  };

  return (
    <DrawerModal id="nova-opcao" show title="Nova opção" variant="small" onCancel={onCancel} contentClass={CONTEUDO_DRAWER}>
      <div className="flex flex-col gap-6">
        <Input type="select" id="op-lista" clear={false} label="Tipo (lista)" value={lista} options={TABELAS.map((t) => ({ value: t.id, label: t.label }))} onChange={(v) => v && setLista(v as TabelaId)} />
        <Input id="op-descricao" label="Descrição" placeholder="Ex.: Consultoria" value={descricao} onChange={(e) => { setDescricao(e.target.value); setErros((x) => ({ ...x, descricao: undefined })); }} errors={erros.descricao ? [erros.descricao] : []} />
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Input id="op-codigo" label="Código (opcional)" placeholder={codigoDe(descricao) || "Ex.: CONSULTORIA"} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            <p className="mt-1 text-xs text-brand-purple-dark/50">
              {final && final !== base ? `${base} já existe nesta lista: fica ${final}.` : `Vazio: usa a descrição em maiúsculas${final ? ` (${final})` : ""}.`}
            </p>
          </div>
          <div>
            <Input type="number" id="op-ordem" label="Ordem" min={0} step={10} value={ordem} onChange={(e) => setOrdem(e.target.value)} errors={erros.ordem ? [erros.ordem] : []} />
            {!erros.ordem && <p className="mt-1 text-xs text-brand-purple-dark/50">Menor aparece primeiro.</p>}
          </div>
        </div>
        <p className="text-sm text-brand-purple-dark/60">A opção nasce ativa e já aparece nos formulários de {labelDe(lista)}.</p>
        <div className={RODAPE_DRAWER}>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button leftIcon="fa-check" onClick={salvar}>Incluir</Button>
        </div>
      </div>
    </DrawerModal>
  );
}

/* ------------------------------------------------------------------ */
/* Campos por categoria                                                */
/* ------------------------------------------------------------------ */

type Rascunho = { rotulo: string; tipo: CampoCategoria["tipo"] | ""; opcoes: string; ajuda: string };
const VAZIO: Rascunho = { rotulo: "", tipo: "", opcoes: "", ajuda: "" };
const opcoesDe = (s: string) => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
/** Nome do campo gerado do rótulo: minúsculas, sem acento, "_" no lugar do resto (FR-093). */
export const nomeDoCampo = (rotulo: string) =>
  rotulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const nomeDe = (c: CampoCategoria) => c.nome ?? nomeDoCampo(c.rotulo);

function AreaCampos({ data, controls, admin, abas }: { data: ContratosData; controls: Record<string, string>; admin: boolean; abas: ReactNode }) {
  // Só as categorias ativas oferecem campos (RN-065), na ordem da tabela.
  const categorias = opcoesAtivas(data.tabelas, "categoria");
  const [campos, setCampos] = useState(data.camposCategoria);
  const [categoria, setCategoria] = useState(categorias.includes(controls.categoria ?? "") ? controls.categoria! : categorias[0] ?? "");
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO);
  const [erros, setErros] = useState<{ rotulo?: string; tipo?: string; opcoes?: string }>({});
  const lista = campos[categoria] ?? [];
  /** As 7 categorias padrão vêm com campos predefinidos (FR-093). */
  const padrao = (data.camposCategoria[categoria]?.length ?? 0) > 0;
  const emUso = data.tabelas.categoria.find((o) => o.descricao === categoria)?.emUso ?? 0;

  const set = <K extends keyof Rascunho>(k: K, v: Rascunho[K]) => { setRascunho((r) => ({ ...r, [k]: v })); setErros((e) => ({ ...e, [k]: undefined })); };

  const adicionar = () => {
    const e: typeof erros = {};
    const rotulo = rascunho.rotulo.trim();
    if (!rotulo) e.rotulo = "Informe o rótulo do campo.";
    else if (lista.some((c) => nomeDe(c) === nomeDoCampo(rotulo))) e.rotulo = `${categoria} já tem um campo com o nome ${nomeDoCampo(rotulo)}.`;
    if (!rascunho.tipo) e.tipo = "Escolha o tipo do campo.";
    if (rascunho.tipo === "lista" && opcoesDe(rascunho.opcoes).length < 2) e.opcoes = "Lista precisa de ao menos 2 opções, uma por linha.";
    setErros(e);
    if (Object.keys(e).length) return;
    const novo: CampoCategoria = {
      id: `f${Date.now()}`,
      nome: nomeDoCampo(rotulo),
      rotulo,
      tipo: rascunho.tipo as CampoCategoria["tipo"],
      ...(rascunho.tipo === "lista" && { opcoes: opcoesDe(rascunho.opcoes) }),
      ...(rascunho.ajuda.trim() && { ajuda: rascunho.ajuda.trim() }),
    };
    setCampos((c) => ({ ...c, [categoria]: [...lista, novo] }));
    setRascunho(VAZIO);
    showToast({ type: "success", title: "Campo incluído", content: `${rotulo} aparece no Novo Contrato de ${categoria}.`, closeTime: 4000 });
  };

  const remover = (campo: CampoCategoria) => {
    setCampos((c) => ({ ...c, [categoria]: lista.filter((x) => x.id !== campo.id) }));
    showToast({
      type: "success",
      title: "Campo removido",
      content: `${campo.rotulo} não aparece mais no Novo Contrato de ${categoria}.${emUso ? ` Os ${contratosLabel(emUso)} existentes guardam o valor já preenchido.` : ""}`,
      closeTime: 5000,
    });
  };

  const previa: (CampoCategoria & { novo?: boolean })[] = [
    ...lista,
    ...(rascunho.rotulo.trim() && rascunho.tipo ? [{ id: "rascunho", rotulo: rascunho.rotulo.trim(), tipo: rascunho.tipo, opcoes: opcoesDe(rascunho.opcoes), ajuda: rascunho.ajuda.trim() || undefined, novo: true }] : []),
  ];

  return (
    <div className="space-y-6">
    <div className="flex flex-wrap items-end gap-3">
      {abas}
      <div className="flex flex-wrap items-end gap-3 sm:ml-auto">
        {!admin && SELO_LEITURA}
        <Input type="select" id="campos-categoria" clear={false} label="Categoria" value={categoria} options={categorias.map((c) => ({ value: c, label: c }))} onChange={(v) => { if (v) { setCategoria(v); setRascunho(VAZIO); setErros({}); } }} className="w-full sm:w-80" />
      </div>
    </div>
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-4">
        {padrao && (
          <p className="text-sm text-brand-purple-dark/60">
            <Icon name="fa-wand-magic-sparkles" className="mr-1 text-brand-blue" />Categoria padrão: já vem com campos predefinidos. O que o Administrador muda aqui fica valendo; os predefinidos não voltam por cima.
          </p>
        )}

        {lista.length === 0 ? (
          <EmptyStateCard icon="fa-input-text" text={`${categoria} não tem campos extras`}>
            <p>O Novo Contrato desta categoria mostra só os campos comuns. {admin ? "Inclua um campo abaixo se a categoria precisar de mais dados." : ""}</p>
          </EmptyStateCard>
        ) : (
          <Table
            className={ACOES_COMPACTAS}
            id="campos"
            rows={lista}
            rowId={(c) => c.id}
            col={[
              { label: "Rótulo", render: (c) => <span className="font-semibold text-brand-purple-dark">{c.rotulo}</span> },
              { label: "Nome", render: (c) => <span className="text-sm font-mono whitespace-nowrap">{nomeDe(c)}</span> },
              { label: "Tipo", render: (c) => <Tag item={tipoDe(c.tipo).label} variant="dark-blue" leftIcon={tipoDe(c.tipo).icon} /> },
              {
                label: "Opções",
                render: (c) => (c.opcoes?.length ? <div className="flex flex-wrap gap-1">{c.opcoes.map((o) => <Tag key={o} item={o} variant="dark-purple" />)}</div> : <span className="text-brand-purple-dark/40">—</span>),
              },
              { label: "Ajuda", render: (c) => <span className="text-sm">{c.ajuda ?? <span className="text-brand-purple-dark/40">—</span>}</span> },
            ]}
            action={
              admin
                ? [
                    (c) => (
                      <span className="inline-flex pr-3">
                        <Button size="small" variant="ghost" color="red" title="Remover campo" aria-label={`Remover ${c.rotulo}`} onClick={() => remover(c)}>
                          <Icon name="fa-trash-can" />
                        </Button>
                      </span>
                    ),
                  ]
                : []
            }
          />
        )}

        {admin && (
          <div className="flex flex-col gap-4 rounded-xl border border-dashed border-brand-blue/40 bg-brand-blue/5 p-4">
            <p className="font-bold text-brand-purple-dark">Novo campo</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input id="campo-rotulo" label="Rótulo" placeholder="Ex.: Seguro do imóvel" value={rascunho.rotulo} onChange={(e) => set("rotulo", e.target.value)} errors={erros.rotulo ? [erros.rotulo] : []} />
                {!erros.rotulo && <p className="mt-1 text-xs text-brand-purple-dark/50">Nome gerado: {nomeDoCampo(rascunho.rotulo) || "—"}</p>}
              </div>
              <Input type="select" id="campo-tipo" label="Tipo" prompt="Escolha o tipo" value={rascunho.tipo} options={TIPOS.map((t) => ({ value: t.value, label: t.label }))} onChange={(v) => set("tipo", (v ?? "") as Rascunho["tipo"])} errors={erros.tipo ? [erros.tipo] : []} />
            </div>
            {rascunho.tipo === "lista" && (
              <Input type="textarea" id="campo-opcoes" label="Opções (uma por linha)" rows={3} value={rascunho.opcoes} onChange={(e) => set("opcoes", e.target.value)} errors={erros.opcoes ? [erros.opcoes] : []} />
            )}
            <Input id="campo-ajuda" label="Ajuda (opcional)" placeholder="Texto curto que aparece sob o campo" value={rascunho.ajuda} onChange={(e) => set("ajuda", e.target.value)} />
            <div className="flex justify-end">
              <Button leftIcon="fa-plus" onClick={adicionar}>Adicionar campo</Button>
            </div>
          </div>
        )}
      </div>

      {/* Prévia no mesmo cartão, ao lado: o campo como o solicitante vai ver. */}
      <aside className="flex flex-col gap-4 rounded-xl bg-brand-purple-dark/5 p-4">
        <div>
          <p className="font-bold text-brand-purple-dark"><Icon name="fa-eye" className="mr-2 text-brand-blue" />Prévia no Novo Contrato</p>
          <p className="text-sm text-brand-purple-dark/60">Seção "Dados de {categoria}" do formulário, como o solicitante vai ver.</p>
        </div>
        {previa.length === 0 ? (
          <p className="text-sm text-brand-purple-dark/50">Sem campos extras: a seção não aparece.</p>
        ) : (
          <div className="flex flex-col gap-5 rounded-xl bg-white p-4" aria-label="Prévia dos campos">
            {previa.map((c) => (
              <div key={c.id} className={cx(c.novo && "rounded-lg border border-dashed border-brand-blue/50 p-3")}>
                {c.novo && <Tag item="Novo" variant="dark-blue" className="mb-2" />}
                <CampoPrevia campo={c} />
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
    </div>
  );
}

/** O campo como entra no formulário do Novo Contrato. */
function CampoPrevia({ campo }: { campo: CampoCategoria }) {
  const id = `previa-${campo.id}`;
  return (
    <div>
      {campo.tipo === "lista" ? (
        <Input type="select" id={id} label={campo.rotulo} prompt="Selecione" options={(campo.opcoes ?? []).map((o) => ({ value: o, label: o }))} />
      ) : campo.tipo === "data" ? (
        <Input type="date" id={id} label={campo.rotulo} />
      ) : campo.tipo === "numero" ? (
        <Input type="number" id={id} label={campo.rotulo} />
      ) : (
        <Input id={id} label={campo.rotulo} />
      )}
      {campo.ajuda && <p className="mt-1 text-xs text-brand-purple-dark/60">{campo.ajuda}</p>}
    </div>
  );
}
