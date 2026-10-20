/**
 * Gestão de Contratos — Tabelas de Apoio e Campos por Categoria (Administrador).
 *
 * As dez listas que alimentam os formulários do módulo (categoria, fluxo,
 * forma e condição de pagamento, índice, tipo de cobrança, natureza do dossiê,
 * tipo de aditivo, tipo de encerramento, unidade) e os campos extras que cada
 * categoria pede no Novo Contrato.
 *
 * Opção em uso não se exclui: excluir quebraria os contratos que a usam, então
 * a tela avisa e oferece desativar (some dos formulários, os contratos
 * existentes continuam com ela).
 *
 * Feito na tela (componente novo): as etiquetas que escolhem a tabela e a
 * prévia do campo no Novo Contrato. O resto é `button_tabs` (controlado, `AbasBotao`), `table`, `input` (com `select` e `switch`), `modal`, `tag`,
 * `button` e `empty_state_card`.
 */
import { useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Icon } from "../components/Icon.js";
import { Input, cx } from "../components/Input.js";
import { EmptyStateCard } from "../components/Layout.js";
import { DrawerModal, Modal } from "../components/Overlay.js";
import { Table } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import type { CampoCategoria, ContratosData, OpcaoTabela, TabelaId } from "./gestao-de-contratos/model.js";
import { ACOES_COMPACTAS, AbasBotao, Aviso, Bloco, ContratosShell, SeloLeitura, papelDe, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";

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

const TIPOS: { value: CampoCategoria["tipo"]; label: string; icon: string }[] = [
  { value: "texto", label: "Texto", icon: "fa-font" },
  { value: "numero", label: "Número", icon: "fa-hashtag" },
  { value: "lista", label: "Lista", icon: "fa-list" },
  { value: "data", label: "Data", icon: "fa-calendar" },
];
const tipoDe = (t: CampoCategoria["tipo"]) => TIPOS.find((x) => x.value === t)!;

const contratosLabel = (n: number) => `${n} contrato${n === 1 ? "" : "s"}`;

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
      {/* As duas áreas num cartão só: o `button_tabs` fica dentro dele, no topo. */}
      <Bloco>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AbasBotao id="tabelas-area" abas={AREAS} ativa={area} onChange={setArea} />
          {!admin && <SeloLeitura motivo="Tabelas de apoio e campos por categoria são mantidos pelo Administrador. Para incluir ou mudar uma opção, peça a ele." />}
        </div>
        {area === "tabelas" ? <AreaTabelas data={data} controls={controls} admin={admin} /> : <AreaCampos data={data} controls={controls} admin={admin} />}
      </Bloco>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabelas de apoio                                                    */
/* ------------------------------------------------------------------ */

type ModalTabela = { tipo: "nova" } | { tipo: "excluir"; id: string } | null;

function AreaTabelas({ data, controls, admin }: { data: ContratosData; controls: Record<string, string>; admin: boolean }) {
  const [tabelas, setTabelas] = useState(data.tabelas);
  const [lista, setLista] = useState<TabelaId>(TABELAS.some((t) => t.id === controls.lista) ? (controls.lista as TabelaId) : "categoria");
  const emUsoInicial = tabelas[lista].find((o) => o.emUso > 0);
  const [modal, setModal] = useState<ModalTabela>(
    !admin ? null : controls.modal === "nova-opcao" ? { tipo: "nova" } : controls.modal === "excluir-em-uso" && emUsoInicial ? { tipo: "excluir", id: emUsoInicial.id } : null,
  );

  const atual = TABELAS.find((t) => t.id === lista)!;
  const opcoes = [...tabelas[lista]].sort((a, b) => a.ordem - b.ordem || a.descricao.localeCompare(b.descricao));
  const mudar = (fn: (l: OpcaoTabela[]) => OpcaoTabela[]) => setTabelas((t) => ({ ...t, [lista]: fn(t[lista]) }));

  const alternar = (o: OpcaoTabela, ativo: boolean) => {
    mudar((l) => l.map((x) => (x.id === o.id ? { ...x, ativo } : x)));
    showToast({
      type: "success",
      title: ativo ? "Opção ativada" : "Opção desativada",
      content: ativo
        ? `${o.descricao} volta a aparecer nos formulários.`
        : `${o.descricao} não aparece mais nos formulários.${o.emUso ? ` Os ${contratosLabel(o.emUso)} que a usam continuam com ela.` : ""}`,
      closeTime: 5000,
    });
  };

  const emExclusao = modal?.tipo === "excluir" ? tabelas[lista].find((o) => o.id === modal.id) : undefined;

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* As dez tabelas em etiquetas: um clique troca a lista. */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <ul className="flex flex-1 flex-wrap gap-2" aria-label="Tabelas de apoio">
            {TABELAS.map((t) => {
              const sel = t.id === lista;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    aria-pressed={sel}
                    title={t.label}
                    aria-label={`${t.label}, ${tabelas[t.id].length} opções`}
                    onClick={() => setLista(t.id)}
                    className={cx(
                      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold transition-colors",
                      sel ? "bg-brand-blue/30 text-brand-blue-dark ring-1 ring-brand-blue" : "bg-brand-purple-dark/5 text-brand-purple-dark/70 hover:bg-brand-blue/15",
                    )}
                  >
                    <Icon name={t.icon} className="text-xs" />
                    {t.curto}
                    <span className="rounded-full bg-white px-1.5 text-xs tabular-nums">{tabelas[t.id].length}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {admin && <Button leftIcon="fa-plus" onClick={() => setModal({ tipo: "nova" })}>Nova opção</Button>}
        </div>
        {opcoes.length === 0 ? (
          <EmptyStateCard icon="fa-table-list" text="Nenhuma opção nesta tabela">
            <p>Inclua a primeira opção para ela aparecer nos formulários.</p>
          </EmptyStateCard>
        ) : (
          <Table
            className={ACOES_COMPACTAS}
            id={`tabela-${lista}`}
            rows={opcoes}
            rowId={(o) => o.id}
            col={[
              { label: "Ordem", className: "w-20", render: (o) => <span className="tabular-nums">{o.ordem}</span> },
              { label: "Código", render: (o) => <span className="text-sm font-bold tracking-wide">{o.codigo}</span> },
              { label: "Descrição", className: "min-w-48", render: (o) => <span className={cx("font-semibold", o.ativo ? "text-brand-purple-dark" : "text-brand-purple-dark/50")}>{o.descricao}</span> },
              {
                label: "Status",
                render: (o) =>
                  admin ? (
                    <div className="flex items-center gap-2">
                      <Input type="switch" id={`ativo-${o.id}`} value={o.ativo} aria-label={`${o.ativo ? "Desativar" : "Ativar"} ${o.descricao}`} onChange={(e) => alternar(o, e.target.checked)} />
                      <span className="text-sm">{o.ativo ? "Ativo" : "Inativo"}</span>
                    </div>
                  ) : (
                    <Tag item={o.ativo ? "Ativo" : "Inativo"} variant={o.ativo ? "green" : "dark-purple"} />
                  ),
              },
              {
                label: "Em uso",
                render: (o) => (o.emUso ? <span className="text-sm whitespace-nowrap">em uso em {contratosLabel(o.emUso)}</span> : <span className="text-sm text-brand-purple-dark/40">sem uso</span>),
              },
            ]}
            action={
              admin
                ? [
                    (o) => (
                      <span className="inline-flex pr-3">
                        <Button size="small" variant="ghost" color="red" title="Excluir" aria-label={`Excluir ${o.descricao}`} onClick={() => setModal({ tipo: "excluir", id: o.id })}>
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
          tabela={atual.label}
          opcoes={tabelas[lista]}
          onCancel={() => setModal(null)}
          onSalvar={(o) => {
            mudar((l) => [...l, { ...o, id: `${lista}-${Date.now()}` }]);
            setModal(null);
            showToast({ type: "success", title: "Opção incluída", content: `${o.descricao} já aparece em ${atual.label}.`, closeTime: 4000 });
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
                Excluir <b>{emExclusao.descricao}</b> ({emExclusao.codigo}) de {atual.label}? Nenhum contrato usa esta opção. A exclusão não pode ser desfeita.
              </p>
            )}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <Button variant="outline" onClick={() => setModal(null)}>{emExclusao.emUso && !emExclusao.ativo ? "Fechar" : "Cancelar"}</Button>
              {emExclusao.emUso > 0 ? (
                emExclusao.ativo && <Button leftIcon="fa-toggle-off" onClick={() => { alternar(emExclusao, false); setModal(null); }}>Desativar</Button>
              ) : (
                <Button color="red" leftIcon="fa-trash-can" onClick={() => {
                  mudar((l) => l.filter((x) => x.id !== emExclusao.id));
                  setModal(null);
                  showToast({ type: "success", title: "Opção excluída", content: `${emExclusao.descricao} saiu de ${atual.label}.`, closeTime: 4000 });
                }}>Excluir</Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function ModalNovaOpcao({ tabela, opcoes, onCancel, onSalvar }: { tabela: string; opcoes: OpcaoTabela[]; onCancel: () => void; onSalvar: (o: Omit<OpcaoTabela, "id">) => void }) {
  const [descricao, setDescricao] = useState("");
  const [codigo, setCodigo] = useState("");
  const [ordem, setOrdem] = useState("10");
  const [erros, setErros] = useState<{ descricao?: string; codigo?: string; ordem?: string }>({});
  const codigoAuto = descricao.normalize("NFD").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();

  const salvar = () => {
    const e: typeof erros = {};
    const d = descricao.trim();
    const cod = (codigo.trim() || codigoAuto).toUpperCase();
    if (!d) e.descricao = "Informe a descrição: é o texto que aparece nos formulários.";
    else if (opcoes.some((o) => o.descricao.toLowerCase() === d.toLowerCase())) e.descricao = `"${d}" já existe em ${tabela}. Se estiver inativa, ative a existente.`;
    if (d && opcoes.some((o) => o.codigo === cod)) e.codigo = `O código ${cod} já é usado em ${tabela}. Escolha outro.`;
    if (!(Number(ordem) >= 0) || ordem.trim() === "") e.ordem = "Informe a ordem (número inteiro).";
    setErros(e);
    if (Object.keys(e).length) return;
    onSalvar({ ordem: Number(ordem), codigo: cod, descricao: d, ativo: true, emUso: 0 });
  };

  return (
    <DrawerModal id="nova-opcao" show title={`Nova opção · ${tabela}`} variant="small" onCancel={onCancel} contentClass={CONTEUDO_DRAWER}>
      <div className="flex flex-col gap-6">
        <Input id="op-descricao" label="Descrição" placeholder="Ex.: Consultoria" value={descricao} onChange={(e) => { setDescricao(e.target.value); setErros((x) => ({ ...x, descricao: undefined })); }} errors={erros.descricao ? [erros.descricao] : []} />
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Input id="op-codigo" label="Código" placeholder={codigoAuto || "Ex.: CON"} value={codigo} onChange={(e) => { setCodigo(e.target.value); setErros((x) => ({ ...x, codigo: undefined })); }} errors={erros.codigo ? [erros.codigo] : []} />
            {!erros.codigo && <p className="mt-1 text-xs text-brand-purple-dark/50">Vazio: usa {codigoAuto || "as 3 primeiras letras"}.</p>}
          </div>
          <div>
            <Input type="number" id="op-ordem" label="Ordem" min={0} step={10} value={ordem} onChange={(e) => setOrdem(e.target.value)} errors={erros.ordem ? [erros.ordem] : []} />
            {!erros.ordem && <p className="mt-1 text-xs text-brand-purple-dark/50">Menor aparece primeiro.</p>}
          </div>
        </div>
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

function AreaCampos({ data, controls, admin }: { data: ContratosData; controls: Record<string, string>; admin: boolean }) {
  const categorias = data.tabelas.categoria.filter((o) => o.ativo).map((o) => o.descricao);
  const [campos, setCampos] = useState(data.camposCategoria);
  const [categoria, setCategoria] = useState(categorias.includes(controls.categoria ?? "") ? controls.categoria! : categorias[0] ?? "");
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO);
  const [erros, setErros] = useState<{ rotulo?: string; tipo?: string; opcoes?: string }>({});
  const lista = campos[categoria] ?? [];
  const emUso = data.tabelas.categoria.find((o) => o.descricao === categoria)?.emUso ?? 0;

  const set = <K extends keyof Rascunho>(k: K, v: Rascunho[K]) => { setRascunho((r) => ({ ...r, [k]: v })); setErros((e) => ({ ...e, [k]: undefined })); };

  const adicionar = () => {
    const e: typeof erros = {};
    const rotulo = rascunho.rotulo.trim();
    if (!rotulo) e.rotulo = "Informe o rótulo do campo.";
    else if (lista.some((c) => c.rotulo.toLowerCase() === rotulo.toLowerCase())) e.rotulo = `${categoria} já tem o campo "${rotulo}".`;
    if (!rascunho.tipo) e.tipo = "Escolha o tipo do campo.";
    if (rascunho.tipo === "lista" && opcoesDe(rascunho.opcoes).length < 2) e.opcoes = "Lista precisa de ao menos 2 opções, uma por linha.";
    setErros(e);
    if (Object.keys(e).length) return;
    const novo: CampoCategoria = {
      id: `f${Date.now()}`,
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
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-4">
        <Input type="select" id="campos-categoria" clear={false} label="Categoria" value={categoria} options={categorias.map((c) => ({ value: c, label: c }))} onChange={(v) => { if (v) { setCategoria(v); setRascunho(VAZIO); setErros({}); } }} className="max-w-sm" />

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
              <Input id="campo-rotulo" label="Rótulo" placeholder="Ex.: Seguro do imóvel" value={rascunho.rotulo} onChange={(e) => set("rotulo", e.target.value)} errors={erros.rotulo ? [erros.rotulo] : []} />
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
