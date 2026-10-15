/**
 * Compras › Solicitação — o centro do fluxo. Todo papel abre o mesmo endereço e
 * vê a etapa, quem está com a solicitação e o histórico; o painel do meio traz
 * a ação da etapa atual para quem pode agir nela.
 *
 * Etapas: aprovação da unidade, ajuste, cotação (com cadastro rápido de item e
 * fornecedor), emissão do pedido com a alçada calculada, aprovação de alçada do
 * Financeiro ou do CFO, confirmação com o fornecedor, vínculo da nota e
 * confirmação de chegada.
 *
 * Disposição igual à do detalhe das solicitações de melhoria: no topo, o
 * cabeçalho e o fluxo na horizontal no mesmo card; abaixo, os dados da
 * solicitação, a etapa atual com o histórico e o pedido; as ações da etapa no
 * rodapé fixo.
 *
 * Feito na tela, sem equivalente no Phoenix (componente novo para o dev): o
 * fluxo na horizontal, o rodapé fixo, os cartões de cotação e os três níveis
 * de alçada. O
 * resto é `backoffice`, `card`, `header`, `button`, `input`, `drawer_modal`, `tag`,
 * `progress`, `radio_group`, `simple_table`, `file_item`, `file_uploader` e
 * `timeline_list`.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { RadioGroup } from "../components/Choice.js";
import { FileItem, FileUploader } from "../components/FileUploader.js";
import { Icon } from "../components/Icon.js";
import { FakeInput, Input } from "../components/Input.js";
import { EmptyStateCard, Header, Progress } from "../components/Layout.js";
import { SimpleTable } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import type { ComprasFixture } from "./compras/fixtures.js";
import {
  ETAPAS, NIVEIS, PAPEIS, PASSOS, PESSOAS, TODAY, TOLERANCIA_NOTA, UNIDADES_MEDIDA, entregaEm, USUARIO, br, brl, nivelDoPedido, responsavel, totalCotacao,
  type Alcadas, type Cotacao, type Etapa, type Evento, type Fornecedor, type Item, type Nivel, type Nota, type Papel, type Pessoa, type Solicitacao,
} from "./compras/model.js";
import { compras, useCompras } from "./compras/store.js";
import { Aviso, BASE, ComprasShell, Dado, EtapaTag, FormDrawer, Historico, papelDe } from "./compras/shared.js";

export const PATH = `${BASE}/:id`;

const NOW = `${TODAY}T11:00`;
const val = (e: unknown) => (e && typeof e === "object" && "target" in e ? (e as { target: { value: string } }).target.value : String(e ?? ""));
const num = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;
const dec = (v: number | undefined) => (v === undefined ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const plural = (s: Solicitacao) => `${s.quantidade} ${s.unidadeMedida}${s.quantidade > 1 ? "s" : ""}`;

type ModalState =
  | { kind: "devolver" | "reprovar" | "nova-cotacao" | "reprovar-pedido" | "cancelar"; error?: boolean }
  | { kind: "item"; nome: string; fromNota?: boolean }
  | { kind: "fornecedor"; slot?: number; razao?: string; cnpj?: string; fromNota?: boolean }
  | { kind: "emitir" }
  | null;

/* ================================================================== *
 * Tela
 * ================================================================== */

export function ComprasSolicitacao({ context, params }: ScreenProps) {
  const papel = papelDe(context, "comprador");
  const id = params.id ?? "";
  const base = useCompras(context);
  return (
    <ComprasShell context={context} papel={papel} breadcrumbs={[{ label: "Compras", to: BASE }, { label: id }]}>
      {(data) => {
        const s = base?.solicitacoes.find((x) => x.id === id);
        if (!s) {
          return (
            <Card>
              <EmptyStateCard icon="fa-magnifying-glass" text={`Solicitação ${id} não encontrada`}>
                <Button className="mt-4 mx-auto" variant="outline" onClick={() => context.navigate(BASE, { controls: { papel } })}>Voltar para Compras</Button>
              </EmptyStateCard>
            </Card>
          );
        }
        return <Detalhe key={`${id}|${JSON.stringify(context.controls)}`} context={context} papel={papel} data={{ ...data, alcadas: base!.alcadas ?? data.alcadas }} s={s} fornecedores={base!.fornecedores} />;
      }}
    </ComprasShell>
  );
}

function initialModal(estado: string | undefined, s: Solicitacao): ModalState {
  switch (estado) {
    case "devolver": return { kind: "devolver" };
    case "reprovar": return { kind: "reprovar" };
    case "reprovar-erro": return { kind: "reprovar", error: true };
    case "nova-cotacao": return { kind: "nova-cotacao" };
    case "reprovar-pedido": return { kind: "reprovar-pedido" };
    case "cancelar": return { kind: "cancelar" };
    case "emitir": return { kind: "emitir" };
    case "cadastro-item": return { kind: "item", nome: s.item };
    case "cadastro-fornecedor": return { kind: "fornecedor", slot: (s.cotacoes?.length ?? 0) };
    case "nota-fornecedor": return s.nota ? { kind: "fornecedor", razao: s.nota.razao, cnpj: s.nota.cnpj, fromNota: true } : null;
    default: return null;
  }
}

function Detalhe({ context, papel, data, s, fornecedores }: { context: ScenarioContext; papel: Papel; data: ComprasFixture; s: Solicitacao; fornecedores: Fornecedor[] }) {
  const estado = context.controls.estado;
  /** A solicitação vive na base da sessão: o que um papel faz, o outro vê. */
  const setS = (fn: (cur: Solicitacao) => Solicitacao) => compras.update(s.id, fn);
  const [modal, setModal] = useState<ModalState>(() => initialModal(estado, s));
  /** Fornecedor cadastrado pelo modal, para a cotação pôr no slot de onde veio. */
  const [atribuir, setAtribuir] = useState<{ slot: number; id: string } | null>(null);
  const user: Pessoa = USUARIO[papel];

  /** Muda de etapa, registra a decisão no histórico (RN-11) e avisa quem precisa saber (RF-12). */
  const go = (etapa: Etapa, acao: string, extra: Partial<Evento> = {}, patch: Partial<Solicitacao> = {}) => {
    setS((cur) => ({
      ...cur,
      ...patch,
      etapa,
      desde: NOW,
      historico: [{ quando: NOW, quem: user, acao, icon: "fa-check", color: "blue" as const, ...extra }, ...cur.historico],
    }));
    avisarEtapa({ ...s, ...patch, etapa }, papel);
  };
  const log = (acao: string, icon: string, patch: Partial<Solicitacao> = {}) =>
    setS((cur) => ({ ...cur, ...patch, historico: [{ quando: NOW, quem: user, acao, icon, color: "blue" as const }, ...cur.historico] }));
  const toast = (title: string, content: string) => showToast({ title, content, type: "success", closeTime: 6000 });

  const nomeFornecedor = (id: string | undefined) =>
    fornecedores.find((f) => f.id === id)?.razao ?? s.cotacoes?.find((c) => c.fornecedorId === id)?.semCadastro ?? "—";

  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const ctx: PainelCtx = { s, papel, user, go, log, toast, setModal, data, fornecedores, nomeFornecedor, estado, setS, navigate: context.navigate, atribuir };

  return (
    <FooterSlot.Provider value={slot}>
    <div className="flex min-h-[calc(100vh-8rem)] flex-col lg:min-h-[calc(100vh-9rem)]">
      {/* O cabeçalho da solicitação e o fluxo na horizontal, no mesmo card. */}
      <Card className="space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="tabular-nums text-3xl font-extrabold text-brand-purple-dark/50">{s.id}</span>
            <h1 className="text-3xl font-extrabold text-brand-purple-dark">{s.item}</h1>
            <EtapaTag s={s} />
          </div>
          <p className="text-sm leading-6 text-neutral-900">{`${s.requisitante.nome} · ${s.requisitante.cargo} · ${s.unidade} · pedida em ${br(s.criadaEm)}`}</p>
        </div>
        <FlowStepper s={s} nomeFornecedor={nomeFornecedor} />
      </Card>

      {/* Sem pedido ainda, a etapa ocupa o espaço da coluna do pedido (a cotação precisa dele). */}
      <div className="mt-6 grid flex-1 items-start gap-6 lg:grid-cols-4">
        <aside className="min-w-0 space-y-6">
          <DadosSolicitacao s={s} />
        </aside>

        <div className={["order-first min-w-0 space-y-6 lg:order-none", s.pedido ? "lg:col-span-2" : "lg:col-span-3"].join(" ")}>
          <EtapaAtual s={s}>
            <Painel ctx={ctx} />
          </EtapaAtual>
          <Card className="space-y-6">
            <Header variant="small">Histórico</Header>
            <div className="pl-4">
              <Historico eventos={s.historico} />
            </div>
          </Card>
        </div>

        {s.pedido && (
          <aside className="min-w-0 space-y-6">
            <PedidoCard s={s} nomeFornecedor={nomeFornecedor} />
          </aside>
        )}
      </div>

      {/* Some quando não há ação para o papel. */}
      <footer className="sticky bottom-0 z-30 -mx-4 -mb-4 mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-neutral-100 bg-white px-4 py-3.5 shadow-main lg:-mx-8 lg:-mb-8 lg:px-8 [&:not(:has(button))]:hidden">
        <div ref={setSlot} className="flex w-full flex-wrap items-center justify-end gap-3" />
      </footer>

      <Modais
        modal={modal}
        setModal={setModal}
        s={s}
        alcadas={data.alcadas}
        nomeFornecedor={nomeFornecedor}
        proximoPedido={proximoPedido(data)}
        onMotivo={(kind, motivo) => {
          setModal(null);
          if (kind === "cancelar") {
            go("cancelada", "Cancelou a solicitação", { icon: "fa-ban", ...(motivo ? { motivo } : {}) }, { motivo: motivo || undefined });
            toast("Solicitação cancelada", `${s.aprovador.nome} foi avisada; a solicitação sai da fila de aprovação.`);
          } else if (kind === "devolver") {
            go("ajuste", "Devolveu para ajuste", { icon: "fa-arrow-rotate-left", motivo }, { motivo });
            toast("Solicitação devolvida", `${s.requisitante.nome} foi avisada para ajustar e reenviar.`);
          } else if (kind === "reprovar") {
            go("reprovada", "Reprovou a solicitação", { icon: "fa-xmark", motivo }, { motivo });
            toast("Solicitação reprovada", `${s.requisitante.nome} vê o motivo em Minhas solicitações.`);
          } else if (kind === "nova-cotacao") {
            go("cotacao", `Pediu nova cotação do pedido ${s.pedido?.numero}`, { icon: "fa-arrow-rotate-left", motivo }, { pedido: undefined, vencedor: undefined });
            toast("Nova cotação pedida", `O pedido ${s.pedido?.numero} foi cancelado e voltou para a fila de Compras.`);
          } else {
            go("pedido_reprovado", `Reprovou o pedido ${s.pedido?.numero}`, { icon: "fa-xmark", motivo }, { motivo });
            toast("Pedido reprovado", `${s.requisitante.nome} e Compras foram avisados com o motivo.`);
          }
        }}
        onItem={(item) => {
          setModal(null);
          compras.addItem(item);
          log(`Cadastrou o item ${item.nome}`, "fa-box", { itemId: item.id, item: s.nota ? s.item : item.nome, nota: s.nota && { ...s.nota, itens: s.nota.itens.map((i) => ({ ...i, itemId: i.itemId ?? item.id })) } });
          toast("Item cadastrado", `${item.nome} entrou no catálogo de itens.`);
        }}
        onFornecedor={(f, slot, fromNota) => {
          setModal(null);
          compras.addFornecedor(f);
          if (fromNota && s.nota) {
            const antigo = s.vencedor;
            setS((cur) => ({
              ...cur,
              nota: cur.nota && { ...cur.nota, fornecedorNovo: false },
              cotacoes: cur.cotacoes?.map((c) => (c.fornecedorId === antigo ? { ...c, fornecedorId: f.id, semCadastro: undefined } : c)),
              vencedor: antigo === cur.vencedor ? f.id : cur.vencedor,
              pedido: cur.pedido && { ...cur.pedido, fornecedorId: f.id },
              historico: [{ quando: NOW, quem: user, acao: `Cadastrou o fornecedor ${f.razao} a partir da nota ${cur.nota?.numero}`, icon: "fa-building", color: "blue" }, ...cur.historico],
            }));
          } else {
            log(`Cadastrou o fornecedor ${f.razao}`, "fa-building");
            setAtribuir({ slot: slot ?? 0, id: f.id });
          }
          toast("Fornecedor cadastrado", `${f.razao} já pode ser usado em cotações.`);
        }}
        onEmitir={(numero, nivel, motivo) => {
          setModal(null);
          const venc = s.cotacoes!.find((c) => c.fornecedorId === s.vencedor)!;
          const valor = totalCotacao(venc, s.quantidade);
          const pedido = { numero, fornecedorId: venc.fornecedorId, valor, nivel, motivoNivel: motivo, emitidoEm: NOW };
          if (nivel === "compras") {
            compras.consumir("compras", valor);
            go("pedido_aprovado", `Emitiu o pedido ${numero}, aprovado na alçada de Compras`, { icon: "fa-file-invoice", color: "green" }, { pedido });
            toast(`Pedido ${numero} emitido`, "Dentro do seu limite: o pedido já está aprovado. Confirme a compra com o fornecedor.");
          } else {
            const quem = NIVEIS[nivel];
            go(quem.etapa!, `Emitiu o pedido ${numero} e enviou para aprovação do ${quem.label}`, { icon: "fa-arrow-up", motivo }, { pedido });
            toast(`Pedido ${numero} emitido`, `Enviado para ${quem.quem.nome} (${quem.label}) aprovar.`);
          }
        }}
      />
    </div>
    </FooterSlot.Provider>
  );
}

/**
 * RF-12: a cada mudança de etapa, avisa quem passa a ter a solicitação na mão
 * e o requisitante. No protótipo cada papel é uma pessoa (`USUARIO`); quem não
 * é uma delas (Bruno, Camila) não tem sino aqui. Quem agiu não avisa a si mesmo.
 */
function avisarEtapa(s: Solicitacao, quemAgiu: Papel) {
  const url = `${BASE}/${s.id}`;
  const e = ETAPAS[s.etapa];
  const proximo: Partial<Record<Etapa, Papel>> = {
    aprovacao_unidade: "aprovador", cotacao: "comprador", pedido_aprovado: "comprador", aguardando_nota: "comprador",
    divergencia: "comprador", alcada_financeiro: "financeiro", alcada_cfo: "cfo",
  };
  const para = proximo[s.etapa];
  const ehDoPapel = (p: Papel) =>
    p === "aprovador" ? s.aprovador.nome === USUARIO.aprovador.nome : p === "requisitante" ? s.requisitante.nome === USUARIO.requisitante.nome : true;
  if (para && para !== quemAgiu && ehDoPapel(para)) {
    const titulo = para === "aprovador" ? "Solicitação para aprovar" : para === "financeiro" || para === "cfo" ? "Pedido aguarda sua aprovação" : `${e.label}: com você`;
    compras.avisar(para, titulo, `${s.id} · ${s.item}${s.pedido && (para === "financeiro" || para === "cfo") ? ` · ${brl(s.pedido.valor)}` : ""}.`, url);
  }
  if (quemAgiu !== "requisitante" && ehDoPapel("requisitante")) {
    if (s.etapa === "chegada") compras.avisar("requisitante", "Confirme a chegada", `${s.item} (${s.id}) foi entregue na ${s.unidade}. Chegou tudo certo?`, url);
    else compras.avisar("requisitante", `Sua solicitação: ${e.label.toLowerCase()}`, `${s.id} · ${s.item}${s.motivo && e.encerrada ? `. Motivo: ${s.motivo}` : ""}.`, url);
  }
}

function proximoPedido(data: ComprasFixture) {
  const n = Math.max(0, ...data.solicitacoes.map((s) => Number(s.pedido?.numero.slice(3) ?? 0)));
  return `PC-${String(n + 1).padStart(6, "0")}`;
}

/* ================================================================== *
 * Resumo lateral
 * ================================================================== */

/** Rótulo pequeno sobre o valor, como no detalhe das solicitações de melhoria. */
function Fato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-black text-brand-purple-dark/60">{label}</p>
      <div className="text-sm leading-relaxed text-brand-purple-dark/80">{children}</div>
    </div>
  );
}

function DadosSolicitacao({ s }: { s: Solicitacao }) {
  return (
    <Card className="space-y-6">
      <Header variant="small">Dados da solicitação</Header>
      <Fato label="O que precisa">{s.item}</Fato>
      <Fato label="Quantidade">{plural(s)}</Fato>
      <Fato label="Precisa até">{br(s.dataDesejada)}</Fato>
      <Fato label="Unidade">{s.unidade}</Fato>
      <Fato label="Pedida por">{s.requisitante.nome} · {s.requisitante.cargo}</Fato>
      <Fato label="Aprovação da unidade">{s.aprovador.nome} · {s.aprovador.cargo}</Fato>
      <div className="space-y-2">
        <p className="text-xs font-black text-brand-purple-dark/60">Orçamento</p>
        {s.orcamento ? (
          <FileItem variant="simplified" fileName={s.orcamento.nome} size={s.orcamento.tamanho} url="#" />
        ) : (
          <p className="text-sm text-brand-purple-dark/60">Sem orçamento anexo.</p>
        )}
      </div>
    </Card>
  );
}

function PedidoCard({ s, nomeFornecedor }: { s: Solicitacao; nomeFornecedor: (id?: string) => string }) {
  const p = s.pedido!;
  return (
    <Card className="space-y-6">
      <Header variant="small">Pedido {p.numero}</Header>
      <Fato label="Fornecedor">{nomeFornecedor(p.fornecedorId)}</Fato>
      <div className="grid grid-cols-2 gap-4">
        <Fato label="Valor"><span className="font-bold text-brand-purple-dark">{brl(p.valor)}</span></Fato>
        <Fato label="Alçada">{NIVEIS[p.nivel].label}</Fato>
        <Fato label="Emitido em">{br(p.emitidoEm.slice(0, 10))}</Fato>
        {p.previsao && <Fato label="Previsão de entrega">{br(p.previsao)}</Fato>}
      </div>
      {s.nota && ETAPAS[s.etapa].passo >= 5 && <Fato label="Nota fiscal">{s.nota.numero} · {s.nota.razao}</Fato>}
      <div className="border-t border-brand-purple-dark/10 pt-4">
        <Cadeia s={s} />
      </div>
    </Card>
  );
}

/* ================================================================== *
 * Fluxo na horizontal
 * ================================================================== */

type StepState = "done" | "cur" | "todo" | "rej";

const STEP_TAG: Record<StepState, { item: string; variant: "green" | "light-blue" | "dark-purple" | "red" }> = {
  done: { item: "Concluída", variant: "green" },
  cur: { item: "Em andamento", variant: "light-blue" },
  todo: { item: "Pendente", variant: "dark-purple" },
  rej: { item: "Reprovada", variant: "red" },
};

/** O que cada passo registrou, para o texto abaixo dele. */
function eventoDoPasso(i: number, s: Solicitacao, nomeFornecedor: (id?: string) => string): string {
  switch (i) {
    case 0: return `Pedida por ${s.requisitante.nome}`;
    case 1: return `Aprovada por ${s.aprovador.nome}`;
    case 2: return s.cotacoes ? `${s.cotacoes.length} cotações · ${nomeFornecedor(s.vencedor).split(" ")[0]}` : "Cotação concluída";
    case 3: return s.pedido ? `${s.pedido.numero} · ${brl(s.pedido.valor)}` : "Pedido emitido";
    case 4: return s.nota ? `Nota ${s.nota.numero} vinculada` : "Nota vinculada";
    default: return s.chegada?.ok ? `Conferida por ${s.chegada.quem.nome}` : "Chegada confirmada";
  }
}

/**
 * O fluxo da compra na horizontal, como o das solicitações de melhoria: um nó
 * por passo, ligados por uma linha que fica verde até onde a compra chegou. Só o
 * passo anterior, o atual e o próximo mostram nome, estado e o que registraram
 * (no atual, com quem está); os outros ficam só no nó, com o nome no `title`.
 */
function FlowStepper({ s, nomeFornecedor }: { s: Solicitacao; nomeFornecedor: (id?: string) => string }) {
  const e = ETAPAS[s.etapa];
  const fim = s.etapa === "concluida";
  const parada = e.encerrada && !fim;
  // Reprovada, o fluxo termina na etapa em que parou: as seguintes não acontecem.
  const passos = parada ? PASSOS.slice(0, e.passo + 1) : [...PASSOS];
  const estados: StepState[] = passos.map((_, i) => (fim || i < e.passo ? "done" : i === e.passo ? (parada ? "rej" : "cur") : "todo"));
  const atual = fim ? passos.length - 1 : e.passo;
  const shown = new Set(fim ? [atual - 1, atual] : [atual - 1, atual, atual + 1]);
  const reached = estados.reduce((m, st, i) => (st !== "todo" ? i : m), 0);
  const r = responsavel(s);
  // No celular o fluxo rola na horizontal: abre já mostrando a etapa anterior à atual.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    const alvo = el?.querySelector<HTMLElement>(`[data-passo="${Math.max(0, atual - 1)}"]`);
    if (el && alvo) el.scrollLeft = alvo.offsetLeft - el.offsetLeft;
  }, [atual]);

  return (
    <div ref={scroller} className="-m-1 overflow-x-auto p-1 thin-scrollbar">
      <ol className={["flex", parada ? "" : "min-w-[40rem]"].join(" ")}>
        {passos.map((passo, i) => {
          const st = estados[i]!;
          const labeled = shown.has(i);
          const last = i === passos.length - 1;
          return (
            <li key={passo} data-passo={i} className={["relative min-w-0", labeled || last ? "flex-none" : "flex-1"].join(" ")} title={passo}>
              <div className="flex items-center">
                <StepNode n={i + 1} state={st} />
                {!last && <span className={["mx-1 h-0.5 flex-1 rounded-full", i < reached ? "bg-green" : "bg-brand-purple-dark/10"].join(" ")} />}
              </div>
              {labeled && (
                <div className="mt-3 space-y-1 pr-10">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-purple-dark/50">Etapa {i + 1}</p>
                  <p className={["whitespace-nowrap text-sm font-bold", st === "todo" ? "text-brand-purple-dark/60" : "text-brand-purple-dark"].join(" ")}>{passo}</p>
                  <Tag item={st === "cur" && s.etapa === "ajuste" ? "Devolvida" : st === "rej" && s.etapa === "cancelada" ? "Cancelada" : STEP_TAG[st].item} variant={st === "cur" && s.etapa === "ajuste" ? "orange" : STEP_TAG[st].variant} className="text-xs" />
                  {st === "done" && <p className="whitespace-nowrap text-xs text-brand-purple-dark/60">{eventoDoPasso(i, s, nomeFornecedor)}</p>}
                  {st === "cur" && r && <p className="whitespace-nowrap text-xs text-brand-purple-dark/60">Com {r.nome} · {r.cargo}</p>}
                  {st === "rej" && <p className="whitespace-nowrap text-xs text-brand-purple-dark/60">Encerrada em {br(s.desde.slice(0, 10))}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StepNode({ n, state }: { n: number; state: StepState }) {
  const base = "flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-black";
  if (state === "done") return <span className={`${base} bg-green text-white`}><Icon name="fa-check" type="solid" /></span>;
  if (state === "rej") return <span className={`${base} bg-red text-white`}><Icon name="fa-xmark" type="solid" /></span>;
  if (state === "cur") return <span className={`${base} bg-brand-blue text-white ring-2 ring-brand-blue ring-offset-2`}>{n}</span>;
  return <span className={`${base} bg-brand-purple-dark/10`}><span className="h-2 w-2 rounded-full border-2 border-brand-purple-dark/50" /></span>;
}

/* ================================================================== *
 * Rodapé fixo
 * ================================================================== */

/** O lugar do rodapé fixo do detalhe onde a etapa põe as ações dela. */
const FooterSlot = createContext<HTMLElement | null>(null);

/** Leva as ações da etapa para o rodapé fixo do detalhe. */
function StageFooter({ children }: { children: ReactNode }) {
  const slot = useContext(FooterSlot);
  return slot ? createPortal(children, slot) : null;
}

/** O cartão "Etapa atual": o nome da etapa, com quem está e o que ela pede. */
function EtapaAtual({ s, children }: { s: Solicitacao; children: ReactNode }) {
  const r = responsavel(s);
  return (
    <Card className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-brand-purple-dark/60">{ETAPAS[s.etapa].encerrada ? "Desfecho" : "Etapa atual"}</p>
          <Header variant="small">{ETAPAS[s.etapa].label}</Header>
        </div>
        {r && <Tag item={`Com ${r.nome} · ${r.cargo}`} variant="light-blue" leftIcon="fa-user-clock" />}
      </div>
      {children}
    </Card>
  );
}

/* ================================================================== *
 * Painel da etapa
 * ================================================================== */

type PainelCtx = {
  s: Solicitacao;
  papel: Papel;
  user: Pessoa;
  go: (etapa: Etapa, acao: string, extra?: Partial<Evento>, patch?: Partial<Solicitacao>) => void;
  log: (acao: string, icon: string, patch?: Partial<Solicitacao>) => void;
  toast: (title: string, content: string) => void;
  setModal: (m: ModalState) => void;
  setS: (fn: (s: Solicitacao) => Solicitacao) => void;
  data: ComprasFixture;
  fornecedores: Fornecedor[];
  atribuir: { slot: number; id: string } | null;
  nomeFornecedor: (id?: string) => string;
  estado: string | undefined;
  navigate: ScenarioContext["navigate"];
};

/** Quem não age na etapa vê com quem ela está. */
function Aguardando({ s, texto }: { s: Solicitacao; texto: string }) {
  const r = responsavel(s);
  return (
    <Aviso tone="blue" icon="fa-hourglass-half" title={texto}>
      {r && <>Com {r.nome} ({r.cargo}). Você recebe um aviso quando a etapa mudar.</>}
    </Aviso>
  );
}

function Painel({ ctx }: { ctx: PainelCtx }) {
  const { s, papel } = ctx;
  const can = PAPEIS[papel].permissions;
  switch (s.etapa) {
    case "aprovacao_unidade":
      return can.includes("purchases.approve_unit") && s.aprovador.nome === ctx.user.nome
        ? <PainelAprovacaoUnidade ctx={ctx} />
        : s.requisitante.nome === ctx.user.nome ? (
          <>
            <Aguardando s={s} texto="Aguardando a aprovação da unidade" />
            <CancelarMinha ctx={ctx} />
          </>
        ) : <Aguardando s={s} texto="Aguardando a aprovação da unidade" />;
    case "ajuste":
      return papel === "requisitante" && s.requisitante.nome === ctx.user.nome ? <PainelAjuste ctx={ctx} /> : (
        <div>
          <Aviso tone="orange" icon="fa-arrow-rotate-left" title={`Devolvida para ${s.requisitante.nome} ajustar`}>“{s.motivo}”</Aviso>
        </div>
      );
    case "reprovada":
    case "pedido_reprovado":
    case "cancelada":
      return <PainelReprovada ctx={ctx} />;
    case "cotacao":
      return can.includes("purchases.quote") ? <PainelCotacao ctx={ctx} /> : <Aguardando s={s} texto="Em cotação com Compras" />;
    case "alcada_financeiro":
    case "alcada_cfo": {
      const nivel: Nivel = s.etapa === "alcada_cfo" ? "cfo" : "financeiro";
      return can.includes(nivel === "cfo" ? "purchases.approve_cfo" : "purchases.approve_finance")
        ? <PainelAlcada ctx={ctx} nivel={nivel} />
        : papel === "comprador" ? <PainelAlcada ctx={ctx} nivel={nivel} readOnly /> : <Aguardando s={s} texto={`Pedido aguardando a aprovação do ${NIVEIS[nivel].label}`} />;
    }
    case "pedido_aprovado":
      return can.includes("purchases.issue_order") ? <PainelConfirmarCompra ctx={ctx} /> : <Aguardando s={s} texto="Pedido aprovado: Compras está fechando com o fornecedor" />;
    case "aguardando_nota":
      return can.includes("purchases.link_invoice") ? <PainelNota ctx={ctx} /> : <Aguardando s={s} texto={`Comprado. Aguardando a nota${s.pedido?.previsao ? ` e a entrega, prevista para ${br(s.pedido.previsao)}` : ""}`} />;
    case "chegada":
      return can.includes("purchases.confirm_arrival") ? <PainelChegada ctx={ctx} /> : <Aguardando s={s} texto="Aguardando a confirmação de chegada na unidade" />;
    case "divergencia":
      return (
        <div className="space-y-4">
          <Aviso tone="red" icon="fa-triangle-exclamation" title={`Divergência registrada por ${s.chegada?.quem.nome} em ${br(s.chegada?.quando ?? NOW)}`}>
            <p><strong>{s.chegada?.tipos?.join(", ")}:</strong> {s.chegada?.descricao}</p>
          </Aviso>
          <p className="text-sm text-brand-purple-dark/60">
            A tratativa com o fornecedor (contato, troca, estorno) é outro fluxo, fora deste protótipo. O registro fica aqui para ninguém pagar o que não chegou.
          </p>
        </div>
      );
    case "concluida":
      return (
        <div className="space-y-4">
          <Aviso tone="green" icon="fa-circle-check" title="Compra concluída">
            {s.chegada?.quem.nome} confirmou em {br(s.chegada?.quando ?? NOW)} que chegou tudo certo.
          </Aviso>
          <Cadeia s={s} />
        </div>
      );
  }
}

/** RN-08: solicitação, pedido e nota ligados pelo número. */
function Cadeia({ s }: { s: Solicitacao }) {
  const elos = [
    { icon: "fa-cart-shopping", label: "Solicitação", value: s.id },
    s.pedido && { icon: "fa-file-invoice", label: "Pedido", value: s.pedido.numero },
    // A nota só entra na cadeia depois de vinculada (RN-08).
    s.nota && ETAPAS[s.etapa].passo >= 5 && { icon: "fa-file-lines", label: "Nota fiscal", value: s.nota.numero },
  ].filter(Boolean) as { icon: string; label: string; value: string }[];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {elos.map((e, i) => (
        <div key={e.label} className="flex items-center gap-2">
          {i > 0 && <Icon name="fa-arrow-right" className="text-brand-purple-dark/30" />}
          <Tag item={`${e.label} ${e.value}`} leftIcon={e.icon} variant="dark-purple" />
        </div>
      ))}
    </div>
  );
}

/* --- Aprovação da unidade (RF-03) ---------------------------------- */

function PainelAprovacaoUnidade({ ctx }: { ctx: PainelCtx }) {
  const { s, go, toast, setModal } = ctx;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-brand-purple-dark">A unidade precisa disso?</h2>
        <p className="text-sm text-brand-purple-dark/70 mt-1">
          {s.requisitante.nome} ({s.requisitante.cargo}) pediu <strong>{plural(s)}</strong> de {s.item.toLowerCase()} até {br(s.dataDesejada)}.
          {s.orcamento ? " Tem orçamento anexo." : " Sem orçamento: Compras cota depois da sua aprovação."}
        </p>
      </div>
      <StageFooter>
        <Button variant="tint" color="red" leftIcon="fa-xmark" onClick={() => setModal({ kind: "reprovar" })}>
          Reprovar
        </Button>
        <Button variant="tint" leftIcon="fa-arrow-rotate-left" onClick={() => setModal({ kind: "devolver" })}>
          Devolver para ajuste
        </Button>
        <Button
          leftIcon="fa-check"
          onClick={() => {
            go("cotacao", "Aprovou a solicitação", { color: "green" });
            toast("Solicitação aprovada", "Entrou na fila de Compras para cotação.");
          }}
        >
          Aprovar
        </Button>
      </StageFooter>
    </div>
  );
}

/* --- Ajuste (RN-03) ------------------------------------------------ */

function PainelAjuste({ ctx }: { ctx: PainelCtx }) {
  const { s, go, toast } = ctx;
  const [item, setItem] = useState(s.item);
  const [quantidade, setQuantidade] = useState(String(s.quantidade));
  const [data, setData] = useState(s.dataDesejada);
  const [orcamento, setOrcamento] = useState(s.orcamento);
  const [medida, setMedida] = useState(s.unidadeMedida);
  return (
    <div className="space-y-8">
      <Aviso tone="orange" icon="fa-arrow-rotate-left" title={`${s.aprovador.nome} devolveu para você ajustar`}>“{s.motivo}”</Aviso>
      <Input id="ajuste-item" label="O que você precisa?" value={item} onChange={(e) => setItem(val(e))} />
      <div className="grid gap-x-4 gap-y-8 md:grid-cols-3">
        <Input id="ajuste-qtd" type="counter" label="Quantidade" value={quantidade} onChange={(e) => setQuantidade(val(e))} />
        <Input id="ajuste-medida" type="select" label="Unidade de medida" options={UNIDADES_MEDIDA.map((u) => ({ label: u, value: u }))} value={medida} clear={false} onChange={(v) => setMedida(v ?? medida)} />
        <Input id="ajuste-data" type="date" label="Preciso até" min={TODAY} value={data} onChange={(e) => setData(val(e))} />
      </div>
      <div>
        <p className="block text-sm/4 font-bold text-brand-purple-dark mb-2">
          Orçamento <span className="font-normal text-brand-purple-dark/50">(opcional)</span>
        </p>
        {orcamento ? (
          <FileItem variant="simplified" fileName={orcamento.nome} size={orcamento.tamanho} url="#" removeEvent={() => setOrcamento(undefined)} />
        ) : (
          <FileUploader
            variant="simplified"
            upload={{ ref: "ajuste-orcamento", accept: ".pdf,.jpg,.jpeg,.png", maxEntries: 1, maxFileSize: 10_000_000 }}
            onChange={(files) => files[0] && setOrcamento({ nome: files[0].name, tamanho: files[0].size })}
          />
        )}
      </div>
      <StageFooter>
      <Button variant="tint" color="red" leftIcon="fa-ban" className="mr-auto" onClick={() => ctx.setModal({ kind: "cancelar" })}>
        Cancelar minha solicitação
      </Button>
      <Button
        rightIcon="fa-paper-plane"
        onClick={() => {
          go("aprovacao_unidade", "Ajustou e reenviou a solicitação", { icon: "fa-paper-plane" }, { item, quantidade: Number(quantidade) || s.quantidade, unidadeMedida: medida, dataDesejada: data, orcamento, motivo: undefined });
          toast("Solicitação reenviada", `${s.aprovador.nome} foi avisada para aprovar de novo.`);
        }}
      >
        Reenviar para aprovação
      </Button>
      </StageFooter>
    </div>
  );
}

/** Proposta P-04: quem pediu cancela enquanto a solicitação não chegou a Compras. */
function CancelarMinha({ ctx }: { ctx: PainelCtx }) {
  return (
    <StageFooter>
      <Button variant="tint" color="red" leftIcon="fa-ban" className="mr-auto" onClick={() => ctx.setModal({ kind: "cancelar" })}>
        Cancelar minha solicitação
      </Button>
    </StageFooter>
  );
}

/* --- Reprovada ou cancelada ---------------------------------------- */

function PainelReprovada({ ctx }: { ctx: PainelCtx }) {
  const { s, papel } = ctx;
  const pedido = s.etapa === "pedido_reprovado";
  const cancelada = s.etapa === "cancelada";
  const quem = cancelada ? s.requisitante : pedido ? (s.pedido?.nivel === "cfo" ? PESSOAS.rafael : PESSOAS.rodrigo) : s.aprovador;
  const titulo = cancelada ? "Cancelada" : pedido ? `Pedido ${s.pedido?.numero} reprovado` : "Reprovada";
  return (
    <div className="space-y-4">
      <Aviso tone={cancelada ? "blue" : "red"} icon={cancelada ? "fa-ban" : "fa-circle-xmark"} title={`${titulo} por ${quem.nome} (${quem.cargo})`}>
        {s.motivo ? `“${s.motivo}”` : "Sem motivo informado."}
      </Aviso>
      {(papel === "requisitante" || papel === "aprovador") && (
        <StageFooter>
          <Button variant="outline" leftIcon="fa-plus" onClick={() => ctx.navigate(BASE, { controls: { papel, estado: "nova" } })}>Nova solicitação</Button>
        </StageFooter>
      )}
    </div>
  );
}

/* --- Cotação (RF-05, RF-06, RF-07) --------------------------------- */

type Draft = { fornecedorId: string; semCadastro?: string; unitario: string; negociado: string; frete: string; prazoDias: string; pagamento: string; obs: string };

const toDraft = (c?: Cotacao): Draft => ({
  fornecedorId: c?.fornecedorId ?? "",
  semCadastro: c?.semCadastro,
  unitario: dec(c?.unitario || undefined),
  negociado: dec(c?.negociado),
  frete: dec(c?.frete),
  prazoDias: c?.prazoDias ? String(c.prazoDias) : "",
  pagamento: c?.pagamento ?? "",
  obs: c?.obs ?? "",
});
const fromDraft = (d: Draft): Cotacao => ({
  fornecedorId: d.fornecedorId,
  semCadastro: d.semCadastro,
  unitario: num(d.unitario),
  negociado: d.negociado ? num(d.negociado) : undefined,
  frete: num(d.frete),
  prazoDias: Number(d.prazoDias) || 0,
  pagamento: d.pagamento,
  obs: d.obs || undefined,
});
const preenchida = (d: Draft) => Boolean(d.fornecedorId && num(d.unitario) > 0);

const MOTIVOS_JUSTIFICATIVA = [
  { label: "Fornecedor único", value: "Fornecedor único" },
  { label: "Urgência", value: "Urgência" },
  { label: "Outro", value: "Outro" },
];

function PainelCotacao({ ctx }: { ctx: PainelCtx }) {
  const { s, setS, setModal, fornecedores, data, estado, atribuir } = ctx;
  const [drafts, setDrafts] = useState<Draft[]>(() => {
    const base = (s.cotacoes ?? []).map(toDraft);
    while (base.length < 3) base.push(toDraft());
    return base;
  });
  const [vencedor, setVencedor] = useState(s.vencedor ?? "");
  const limpa = estado === "justificativa-erro";
  const [jMotivo, setJMotivo] = useState(s.justificativa && !limpa ? s.justificativa.split(":")[0]! : "");
  const [jTexto, setJTexto] = useState(s.justificativa && !limpa ? s.justificativa.split(": ").slice(1).join(": ") : "");
  const [erros, setErros] = useState<{ vencedor?: string; justificativa?: string; motivo?: string }>(() =>
    estado === "justificativa-erro" ? { motivo: "Escolha o motivo", justificativa: "Explique por que cotou com menos de 3 fornecedores" } : {},
  );

  // Fornecedor cadastrado pelo modal entra no slot de onde veio; se era o vencedor sem cadastro, continua vencedor.
  useEffect(() => {
    if (!atribuir) return;
    const antigo = drafts[atribuir.slot]?.fornecedorId;
    setDrafts((ds) => ds.map((d, i) => (i === atribuir.slot ? { ...d, fornecedorId: atribuir.id, semCadastro: undefined } : d)));
    if (antigo && antigo === vencedor) setVencedor(atribuir.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atribuir]);
  const slots = drafts;

  const validas = slots.filter(preenchida);
  const menos3 = validas.length < 3;
  const totais = slots.map((d) => (preenchida(d) ? totalCotacao(fromDraft(d), s.quantidade) : null));
  const menor = Math.min(...(totais.filter((t) => t !== null) as number[]));
  const venc = slots.find((d) => d.fornecedorId === vencedor && preenchida(d));
  const total = venc ? totalCotacao(fromDraft(venc), s.quantidade) : 0;
  const alcada = venc ? nivelDoPedido(total, data.alcadas) : null;
  const semItem = !s.itemId;

  const update = (i: number, patch: Partial<Draft>) => setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const emitir = () => {
    const e: typeof erros = {};
    if (!venc) e.vencedor = "Escolha o fornecedor vencedor";
    if (menos3 && !jMotivo) e.motivo = "Escolha o motivo";
    if (menos3 && !jTexto.trim()) e.justificativa = "Explique por que cotou com menos de 3 fornecedores";
    setErros(e);
    if (Object.keys(e).length) return;
    setS((cur) => ({
      ...cur,
      cotacoes: validas.map(fromDraft),
      vencedor,
      justificativa: menos3 ? `${jMotivo}: ${jTexto}` : undefined,
    }));
    setModal({ kind: "emitir" });
  };

  const fornecedorOptions = fornecedores.map((f) => ({ label: f.razao, value: f.id }));

  return (
    <>
      {semItem && (
        <div>
          <Aviso tone="yellow" icon="fa-box-open" title="Item sem cadastro">
            <p>“{s.item}” ainda não está no catálogo. Cadastre agora, com os dados da cotação, ou depois, a partir da nota.</p>
            <Button className="mt-3" size="small" variant="tint" leftIcon="fa-plus" onClick={() => setModal({ kind: "item", nome: s.item })}>
              Cadastrar item
            </Button>
          </Aviso>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-brand-purple-dark">Cotação · {plural(s)}</h2>
            <p className="text-sm text-brand-purple-dark/60">Cote com pelo menos 3 fornecedores, registre a negociação e escolha o vencedor.</p>
          </div>
          <Tag item={menos3 ? `${validas.length} de 3 cotações` : `${validas.length} cotações`} variant={menos3 ? "yellow" : "green"} pill />
        </div>

        {/* RF-05: 3 ou mais fornecedores, um abaixo do outro: adicionar não cria rolagem. */}
        <div className="space-y-4">
          {slots.map((d, i) => {
            const ok = preenchida(d);
            const escolhido = ok && d.fornecedorId === vencedor;
            const atrasa = Number(d.prazoDias) > 0 && entregaEm(Number(d.prazoDias)) > s.dataDesejada;
            return (
              <div
                key={i}
                className={[
                  "rounded-xl border bg-white p-4 pb-5 space-y-6 transition-colors",
                  escolhido ? "border-brand-blue ring-1 ring-brand-blue" : "border-brand-purple-dark/10",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Fornecedor {i + 1}</p>
                    {ok && totais[i] === menor && validas.length > 1 && <Tag item="Menor total" variant="green" />}
                    {/* P-05: o prazo do fornecedor passa da data que a unidade pediu. */}
                    {atrasa && (
                      <Tag item={`Entrega em ${br(entregaEm(Number(d.prazoDias))).slice(0, 5)}, depois de ${br(s.dataDesejada).slice(0, 5)}`} variant="red" leftIcon="fa-calendar-xmark" />
                    )}
                  </div>
                  {i >= 3 && (
                    <button
                      type="button"
                      aria-label={`Remover fornecedor ${i + 1}`}
                      className="text-brand-purple-dark/40 hover:text-red"
                      onClick={() => {
                        if (d.fornecedorId === vencedor) setVencedor("");
                        setDrafts((ds) => ds.filter((_, j) => j !== i));
                      }}
                    >
                      <Icon name="fa-trash-can" />
                    </button>
                  )}
                </div>

                <div className="grid gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-12">
                  <div className="md:col-span-2 xl:col-span-4">
                    {d.semCadastro ? (
                      <>
                        <FakeInput label="Fornecedor" value={d.semCadastro} />
                        <div className="mt-2 flex items-center gap-2">
                          <Tag item="Sem cadastro" variant="yellow" />
                          <button type="button" className="text-sm font-bold text-brand-blue" onClick={() => setModal({ kind: "fornecedor", slot: i, razao: d.semCadastro })}>
                            Cadastrar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Input
                          id={`forn-${i}`}
                          type="select"
                          label="Fornecedor"
                          prompt="Escolha"
                          options={fornecedorOptions.filter((o) => o.value === d.fornecedorId || !slots.some((x) => x.fornecedorId === o.value))}
                          value={d.fornecedorId}
                          onChange={(v) => update(i, { fornecedorId: v ?? "" })}
                        />
                        <button type="button" className="mt-2 text-sm font-bold text-brand-blue flex items-center gap-1" onClick={() => setModal({ kind: "fornecedor", slot: i })}>
                          <Icon name="fa-plus" /> Cadastrar fornecedor
                        </button>
                      </>
                    )}
                  </div>
                  <Input id={`unit-${i}`} className="xl:col-span-2" label="Unitário (R$)" inputMode="decimal" placeholder="0,00" value={d.unitario} onChange={(e) => update(i, { unitario: val(e) })} />
                  <Input id={`neg-${i}`} className="xl:col-span-2" label="Negociado (R$)" inputMode="decimal" placeholder="0,00" value={d.negociado} onChange={(e) => update(i, { negociado: val(e) })} />
                  <Input id={`frete-${i}`} className="xl:col-span-2" label="Frete (R$)" inputMode="decimal" placeholder="0,00" value={d.frete} onChange={(e) => update(i, { frete: val(e) })} />
                  <Input id={`prazo-${i}`} className="xl:col-span-2" label="Prazo (dias)" inputMode="numeric" value={d.prazoDias} onChange={(e) => update(i, { prazoDias: val(e) })} />
                  <Input id={`pag-${i}`} className="xl:col-span-4" label="Pagamento" placeholder="Ex.: 28 dias" value={d.pagamento} onChange={(e) => update(i, { pagamento: val(e) })} />
                  <Input id={`obs-${i}`} className="md:col-span-2 xl:col-span-8" label="Negociação (opcional)" placeholder="O que foi negociado" value={d.obs} onChange={(e) => update(i, { obs: val(e) })} />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-4 border-t border-brand-purple-dark/10 pt-4">
                  <p className="text-sm text-brand-purple-dark/60">
                    Total <span className="ml-2 text-xl font-extrabold text-brand-purple-dark">{totais[i] !== null ? brl(totais[i]!) : "—"}</span>
                  </p>
                  <Button
                    size="medium"
                    variant={escolhido ? "default" : "outline"}
                    leftIcon={escolhido ? "fa-check" : undefined}
                    disabled={!ok}
                    onClick={() => { setVencedor(d.fornecedorId); setErros((x) => ({ ...x, vencedor: undefined })); }}
                  >
                    {escolhido ? "Vencedor" : "Escolher"}
                  </Button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setDrafts((ds) => [...ds, toDraft()])}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-purple-dark/20 py-4 text-sm font-bold text-brand-blue hover:bg-brand-blue/5"
          >
            <Icon name="fa-plus" />
            Adicionar fornecedor
          </button>
        </div>
        {erros.vencedor && <p className="text-sm text-brand-red">{erros.vencedor}</p>}

        {menos3 && (
          <div className="rounded-xl bg-white border border-yellow p-4 pb-10 space-y-8">
            <p className="text-sm text-brand-purple-dark">
              <Icon name="fa-triangle-exclamation" type="solid" className="mr-1 text-yellow-dark" />
              <strong>Menos de 3 cotações.</strong> Registre a justificativa para emitir o pedido (RN-04).
            </p>
            <Input id="j-motivo" type="select" label="Motivo" prompt="Escolha" options={MOTIVOS_JUSTIFICATIVA} value={jMotivo} errors={erros.motivo ? [erros.motivo] : []} onChange={(v) => { setJMotivo(v ?? ""); setErros((x) => ({ ...x, motivo: undefined })); }} />
            <Input id="j-texto" type="textarea" label="Justificativa" placeholder="Ex.: só este fornecedor entrega na região esta semana" rows={2} value={jTexto} errors={erros.justificativa ? [erros.justificativa] : []} onChange={(e) => { setJTexto(val(e)); setErros((x) => ({ ...x, justificativa: undefined })); }} />
          </div>
        )}
      </div>

      <StageFooter>
        <div className="mr-auto text-sm">
          {venc && alcada ? (
            <>
              <p className="font-bold text-brand-purple-dark">
                {fornecedorNome(venc, fornecedores)} · {brl(total)}
              </p>
              <p className="text-brand-purple-dark/70 flex items-center gap-1.5 mt-1">
                <Icon name={alcada.nivel === "compras" ? "fa-circle-check" : "fa-arrow-up"} className={alcada.nivel === "compras" ? "text-green" : "text-yellow-dark"} />
                {alcada.nivel === "compras" ? "Dentro do seu limite: sai aprovado." : `Vai para aprovação do ${NIVEIS[alcada.nivel].label}.`}
              </p>
            </>
          ) : (
            <p className="text-brand-purple-dark/60">Escolha o vencedor para ver o total e a alçada.</p>
          )}
        </div>
        <Button rightIcon="fa-file-invoice" onClick={emitir}>Emitir pedido</Button>
      </StageFooter>
    </>
  );
}

function fornecedorNome(d: { fornecedorId: string; semCadastro?: string }, fornecedores: Fornecedor[]) {
  return fornecedores.find((f) => f.id === d.fornecedorId)?.razao ?? d.semCadastro ?? "—";
}

/* --- Alçada (RF-07, RF-08) ------------------------------------------ */

/** Os três níveis, com o que precisa aprovar em destaque. */
function NiveisAlcada({ alcadas, nivel }: { alcadas: Alcadas; nivel: Nivel }) {
  const ordem: Nivel[] = ["compras", "financeiro", "cfo"];
  return (
    <ol className="grid grid-cols-3 gap-2">
      {ordem.map((n, i) => {
        const ativo = n === nivel;
        const passou = i < ordem.indexOf(nivel);
        const l = n === "cfo" ? null : alcadas[n];
        return (
          <li
            key={n}
            className={[
              "rounded-xl border p-3 text-sm",
              ativo ? "border-brand-blue ring-1 ring-brand-blue bg-brand-blue/10" : "border-brand-purple-dark/10",
              passou && "opacity-60",
            ].filter(Boolean).join(" ")}
          >
            <p className="font-bold text-brand-purple-dark flex items-center gap-1.5">
              {passou && <Icon name="fa-arrow-up" className="text-brand-purple-dark/40" />}
              {ativo && <Icon name="fa-user-check" className="text-brand-blue" />}
              {NIVEIS[n].label}
            </p>
            <p className="text-xs text-brand-purple-dark/60 mt-1">{l ? `Até ${brl(l.pedido)} por pedido` : "Sem limite"}</p>
            {ativo && <p className="text-xs font-bold text-brand-blue-dark mt-1">{NIVEIS[n].quem.nome}</p>}
          </li>
        );
      })}
    </ol>
  );
}

/** Consumo do limite no mês e no ano, já com este pedido. */
function Consumo({ alcadas, nivel, valor }: { alcadas: Alcadas; nivel: "compras" | "financeiro"; valor: number }) {
  const l = alcadas[nivel];
  const c = alcadas.consumo[nivel];
  const linha = (label: string, usado: number, limite: number) => {
    const com = usado + valor;
    const pct = Math.min(100, Math.round((com / limite) * 100));
    return (
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-bold text-brand-purple-dark">{label}</span>
          <span className="text-brand-purple-dark/70">{brl(com)} de {brl(limite)}</span>
        </div>
        <Progress value={pct} variant={pct >= 90 ? "error" : "default"} />
        <p className="text-xs text-brand-purple-dark/50 mt-1">{brl(usado)} já aprovados + {brl(valor)} deste pedido</p>
      </div>
    );
  };
  return (
    <div className="space-y-4">
      {linha("No mês", c.mes, l.mes)}
      {linha("No ano", c.ano, l.ano)}
    </div>
  );
}

function PainelAlcada({ ctx, nivel, readOnly = false }: { ctx: PainelCtx; nivel: Nivel; readOnly?: boolean }) {
  const { s, go, toast, setModal, data, nomeFornecedor } = ctx;
  const p = s.pedido!;
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-brand-purple-dark">
            Pedido {p.numero} · {brl(p.valor)}
          </h2>
          <p className="text-sm text-brand-purple-dark/70">{nomeFornecedor(p.fornecedorId)} · {plural(s)} · emitido por Ana Basdadjian em {br(p.emitidoEm)}</p>
        </div>
        {readOnly && <Tag item={`Com ${NIVEIS[nivel].quem.nome}`} variant="yellow" pill />}
      </div>

      <Aviso tone="blue" icon="fa-scale-balanced" title={readOnly ? `Por que foi para o ${NIVEIS[nivel].label}` : "Por que está com você"}>
        {p.motivoNivel}
      </Aviso>

      <NiveisAlcada alcadas={data.alcadas} nivel={nivel} />

      {nivel === "financeiro" ? (
        <div>
          <h3 className="font-bold text-brand-purple-dark mb-3">Limite do Financeiro</h3>
          <Consumo alcadas={data.alcadas} nivel="financeiro" valor={p.valor} />
        </div>
      ) : (
        <p className="text-sm text-brand-purple-dark/70"><Icon name="fa-infinity" className="mr-1.5" />O CFO não tem limite: todo pedido tem quem possa aprová-lo.</p>
      )}

      <div>
        <h3 className="font-bold text-brand-purple-dark mb-3">Cotações</h3>
        <SimpleTable>
          <thead>
            <tr><th>Fornecedor</th><th>Unitário</th><th>Frete</th><th>Prazo</th><th>Total</th></tr>
          </thead>
          <tbody>
            {(s.cotacoes ?? []).map((c) => (
              <tr key={c.fornecedorId} className={c.fornecedorId === s.vencedor ? "bg-brand-blue/10" : undefined}>
                <td>
                  <span className="font-bold text-brand-purple-dark">{nomeFornecedor(c.fornecedorId)}</span>
                  {c.fornecedorId === s.vencedor && <Tag item="Vencedor" variant="light-blue" className="ml-2" />}
                  {c.obs && <p className="text-xs">{c.obs}</p>}
                </td>
                <td className="whitespace-nowrap">
                  {c.negociado !== undefined && c.negociado !== c.unitario ? (<><s className="text-brand-purple-dark/40">{brl(c.unitario)}</s> {brl(c.negociado)}</>) : brl(c.unitario)}
                </td>
                <td className="whitespace-nowrap">{c.frete ? brl(c.frete) : "Grátis"}</td>
                <td className="whitespace-nowrap">{c.prazoDias} dias</td>
                <td className="whitespace-nowrap font-bold">{brl(totalCotacao(c, s.quantidade))}</td>
              </tr>
            ))}
          </tbody>
        </SimpleTable>
        {s.justificativa && <p className="text-sm mt-3 text-yellow-dark"><Icon name="fa-triangle-exclamation" className="mr-1" />{s.justificativa}</p>}
      </div>

      {!readOnly && (
        <StageFooter>
          <Button variant="tint" color="red" leftIcon="fa-xmark" onClick={() => setModal({ kind: "reprovar-pedido" })}>Reprovar</Button>
          <Button variant="tint" leftIcon="fa-arrow-rotate-left" onClick={() => setModal({ kind: "nova-cotacao" })}>Pedir nova cotação</Button>
          <Button
            leftIcon="fa-check"
            onClick={() => {
              if (nivel === "financeiro") compras.consumir("financeiro", p.valor);
              go("pedido_aprovado", `Aprovou o pedido ${p.numero}`, { color: "green" });
              toast(`Pedido ${p.numero} aprovado`, "Compras foi avisada para fechar com o fornecedor.");
            }}
          >
            Aprovar pedido
          </Button>
        </StageFooter>
      )}
    </div>
  );
}

/* --- Pedido aprovado: confirmar com o fornecedor -------------------- */

function PainelConfirmarCompra({ ctx }: { ctx: PainelCtx }) {
  const { s, go, toast, nomeFornecedor } = ctx;
  const p = s.pedido!;
  const [previsao, setPrevisao] = useState(p.previsao ?? "");
  const [erro, setErro] = useState(false);
  return (
    <div className="space-y-6">
      <Aviso tone="green" icon="fa-circle-check" title={`Pedido ${p.numero} aprovado${p.nivel === "compras" ? " na sua alçada" : ` pelo ${NIVEIS[p.nivel].label}`}`}>
        Feche a compra com {nomeFornecedor(p.fornecedorId)} e informe o número {p.numero}: é por ele que a nota vai ser vinculada.
      </Aviso>
      <Input id="previsao" type="date" label="Previsão de entrega" min={TODAY} value={previsao} errors={erro ? ["Informe a previsão de entrega"] : []} onChange={(e) => { setPrevisao(val(e)); setErro(false); }} />
      <StageFooter>
      <Button
        leftIcon="fa-handshake"
        onClick={() => {
          if (!previsao) return setErro(true);
          go("aguardando_nota", "Confirmou a compra com o fornecedor", { icon: "fa-handshake" }, { pedido: { ...p, previsao } });
          toast("Compra confirmada", `${s.requisitante.nome} foi avisada da previsão de entrega: ${br(previsao)}.`);
        }}
      >
        Confirmar compra com o fornecedor
      </Button>
      </StageFooter>
    </div>
  );
}

/* --- Nota (RF-09) ---------------------------------------------------- */

function PainelNota({ ctx }: { ctx: PainelCtx }) {
  const { s, go, toast, setModal, setS, nomeFornecedor, fornecedores } = ctx;
  const [justificativa, setJustificativa] = useState("");
  const p = s.pedido!;
  const nota = s.nota;
  const lerNota = () => {
    const f = fornecedores.find((x) => x.id === p.fornecedorId);
    const n: Nota = {
      numero: "46.031", serie: "1", cnpj: f?.cnpj ?? "", razao: f?.razao ?? "", valor: p.valor, emitidaEm: TODAY, arquivo: "NFe-46031.xml",
      itens: [{ descricao: s.item.toUpperCase(), quantidade: s.quantidade, unitario: p.valor / s.quantidade, itemId: s.itemId }],
    };
    setS((cur) => ({ ...cur, nota: n }));
  };

  if (!nota) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-brand-purple-dark">Vincular a nota ao pedido {p.numero}</h2>
          <p className="text-sm text-brand-purple-dark/70 mt-1">
            Envie o XML da nota de {nomeFornecedor(p.fornecedorId)}. O sistema confere CNPJ, valor e itens com o pedido.
            {p.previsao && <> Entrega prevista para {br(p.previsao)}.</>}
          </p>
        </div>
        <FileUploader upload={{ ref: "nota", accept: ".xml,.pdf", maxEntries: 1, maxFileSize: 5_000_000 }} onChange={lerNota} />
        <button type="button" className="text-sm font-bold text-brand-blue" onClick={lerNota}>Simular nota recebida</button>
      </div>
    );
  }

  const itemSemCadastro = nota.itens.find((i) => !i.itemId);
  // P-02: até R$ 10 de diferença vincula direto; acima, pede justificativa.
  const diferenca = nota.valor - p.valor;
  const divergente = Math.abs(diferenca) > TOLERANCIA_NOTA;
  const semJustificativa = divergente && !justificativa.trim();
  const pendente = nota.fornecedorNovo || Boolean(itemSemCadastro) || semJustificativa;
  const confere = (ok: boolean) => <Icon name={ok ? "fa-circle-check" : "fa-circle-exclamation"} type="solid" className={ok ? "text-green" : "text-yellow-dark"} />;
  const fornecedorPedido = fornecedores.find((f) => f.id === p.fornecedorId);
  const cnpjOk = !nota.fornecedorNovo && fornecedorPedido?.cnpj === nota.cnpj;
  const qtd = nota.itens.reduce((t, i) => t + i.quantidade, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-brand-purple-dark">Nota {nota.numero} recebida</h2>
          <p className="text-sm text-brand-purple-dark/70">Emitida em {br(nota.emitidaEm)} por {nota.razao}</p>
        </div>
        <FileItem variant="simplified" fileName={nota.arquivo} size={0} url="#" />
      </div>

      <SimpleTable>
        <thead><tr><th></th><th>Pedido {p.numero}</th><th>Nota {nota.numero}</th></tr></thead>
        <tbody>
          <tr>
            <td className="font-bold">Fornecedor</td>
            <td>{nomeFornecedor(p.fornecedorId)}<p className="text-xs">{fornecedorPedido?.cnpj ?? "Sem cadastro"}</p></td>
            <td><span className="flex items-center gap-2">{confere(cnpjOk)}{nota.razao}</span><p className="text-xs">{nota.cnpj}</p></td>
          </tr>
          <tr>
            <td className="font-bold">Valor</td>
            <td>{brl(p.valor)}</td>
            <td><span className="flex items-center gap-2">{confere(Math.abs(nota.valor - p.valor) < 0.01)}{brl(nota.valor)}</span></td>
          </tr>
          <tr>
            <td className="font-bold">Itens</td>
            <td>{plural(s)} · {s.item}</td>
            <td>
              {nota.itens.map((i) => (
                <span key={i.descricao} className="flex items-center gap-2">{confere(Boolean(i.itemId) && qtd === s.quantidade)}{i.quantidade} × {i.descricao}</span>
              ))}
            </td>
          </tr>
        </tbody>
      </SimpleTable>

      {divergente && (
        <div className="rounded-xl bg-white border border-yellow p-4 pb-10 space-y-6">
          <p className="text-sm text-brand-purple-dark">
            <Icon name="fa-triangle-exclamation" type="solid" className="mr-1 text-yellow-dark" />
            <strong>A nota é {brl(Math.abs(diferenca))} {diferenca > 0 ? "maior" : "menor"} que o pedido.</strong> Justifique para vincular
            {diferenca > 0 ? "; o Financeiro é avisado da diferença." : "."}
          </p>
          <Input id="nota-justificativa" type="textarea" label="Por que o valor é diferente?" placeholder="Ex.: frete cobrado à parte, que não estava na cotação" rows={2} value={justificativa} onChange={(e) => setJustificativa(val(e))} />
        </div>
      )}
      {nota.fornecedorNovo && (
        <Aviso tone="yellow" icon="fa-building" title="Fornecedor da nota sem cadastro">
          <p>{nota.razao}, CNPJ {nota.cnpj}, foi cotado sem cadastro. Cadastre a partir da nota: CNPJ e razão social já vêm preenchidos.</p>
          <Button className="mt-3" size="small" variant="tint" leftIcon="fa-plus" onClick={() => setModal({ kind: "fornecedor", razao: nota.razao, cnpj: nota.cnpj, fromNota: true })}>
            Cadastrar fornecedor
          </Button>
        </Aviso>
      )}
      {itemSemCadastro && (
        <Aviso tone="yellow" icon="fa-box-open" title="Item da nota sem cadastro">
          <p>“{itemSemCadastro.descricao}” não está no catálogo.</p>
          <Button className="mt-3" size="small" variant="tint" leftIcon="fa-plus" onClick={() => setModal({ kind: "item", nome: s.item, fromNota: true })}>
            Cadastrar item
          </Button>
        </Aviso>
      )}

      <StageFooter>
        {pendente && (
          <p className="mr-auto text-sm font-bold text-brand-purple-dark/60">
            Pendente: {[nota.fornecedorNovo && "cadastrar o fornecedor", itemSemCadastro && "cadastrar o item", semJustificativa && "justificar a diferença de valor"].filter(Boolean).join(", ")}.
          </p>
        )}
        <Button
          leftIcon="fa-link"
          disabled={pendente}
          onClick={() => {
            go(
              "chegada",
              `Vinculou a nota ${nota.numero} ao pedido ${p.numero}${divergente ? ` com diferença de ${brl(diferenca)}` : ""}`,
              { icon: "fa-file-lines", ...(divergente ? { motivo: justificativa.trim() } : {}) },
              divergente ? { notaJustificativa: justificativa.trim() } : {},
            );
            if (divergente && diferenca > 0 && ctx.papel !== "financeiro") {
              compras.avisar("financeiro", "Nota acima do pedido", `${nota.numero} veio ${brl(diferenca)} acima do ${p.numero}: “${justificativa.trim()}”.`, `${BASE}/${s.id}`);
            }
            toast("Nota vinculada", `${s.requisitante.nome} recebeu o lembrete para confirmar a chegada.`);
          }}
        >
          Vincular ao pedido {p.numero}
        </Button>
      </StageFooter>
    </div>
  );
}

/* --- Chegada (RF-10) ------------------------------------------------- */

const TIPOS_DIVERGENCIA = [
  { label: "Quantidade diferente", value: "Quantidade diferente" },
  { label: "Item errado", value: "Item errado" },
  { label: "Avaria", value: "Avaria" },
  { label: "Devolução", value: "Devolução" },
];

function PainelChegada({ ctx }: { ctx: PainelCtx }) {
  const { s, go, toast, papel, estado } = ctx;
  const comErro = estado === "divergencia-erro";
  const [escolha, setEscolha] = useState(estado === "divergencia" || comErro ? "divergencia" : "");
  const [tipos, setTipos] = useState<string[]>([]);
  const [descricao, setDescricao] = useState("");
  const jaRecebido = s.recebido ?? 0;
  const [recebidoAgora, setRecebidoAgora] = useState(String(Math.max(1, Math.floor((s.quantidade - jaRecebido) / 2))));
  const [erros, setErros] = useState<{ escolha?: string; tipos?: string; descricao?: string; parcial?: string }>(() =>
    comErro ? { tipos: "Marque o que aconteceu", descricao: "Descreva a divergência" } : {},
  );
  const lembrete = s.historico.find((e) => e.acao.startsWith("Vinculou a nota"));

  const confirmar = () => {
    const e: typeof erros = {};
    if (!escolha) e.escolha = "Diga se chegou tudo certo";
    if (escolha === "divergencia" && tipos.length === 0) e.tipos = "Marque o que aconteceu";
    if (escolha === "divergencia" && !descricao.trim()) e.descricao = "Descreva a divergência";
    const parcial = Number(recebidoAgora) || 0;
    if (escolha === "parcial" && (parcial < 1 || jaRecebido + parcial >= s.quantidade)) e.parcial = `Entre 1 e ${s.quantidade - jaRecebido - 1}`;
    setErros(e);
    if (Object.keys(e).length) return;
    if (escolha === "parcial") {
      const total = jaRecebido + parcial;
      ctx.log(`Registrou entrega parcial: chegaram ${total} de ${s.quantidade}`, "fa-box-open", { recebido: total });
      setEscolha("");
      toast("Entrega parcial registrada", `Faltam ${s.quantidade - total}. O lembrete continua com ${s.requisitante.nome} até chegar o restante, e Compras foi avisada.`);
      return;
    }
    if (escolha === "ok") {
      go("concluida", jaRecebido ? `Confirmou a chegada do restante: ${s.quantidade} de ${s.quantidade}` : "Confirmou a chegada: chegou tudo certo", { icon: "fa-box-check", color: "green" }, { chegada: { ok: true, quem: ctx.user, quando: NOW }, recebido: undefined });
      toast("Chegada confirmada", "Compra concluída. Obrigado por conferir!");
    } else {
      go("divergencia", "Registrou divergência na chegada", { icon: "fa-triangle-exclamation", motivo: descricao }, { chegada: { ok: false, tipos, descricao, quem: ctx.user, quando: NOW } });
      toast("Divergência registrada", "Compras foi avisada para tratar com o fornecedor.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-brand-purple-dark">O material chegou na {s.unidade}?</h2>
        <p className="text-sm text-brand-purple-dark/70 mt-1">
          Confira a caixa: {plural(s)} de {s.item.toLowerCase()}, nota {s.nota?.numero}.
          {papel !== "requisitante" && ` O lembrete foi para ${s.requisitante.nome}, mas quem estiver na unidade pode confirmar.`}
        </p>
        {papel === "requisitante" && lembrete && (
          <p className="text-xs text-brand-purple-dark/50 mt-2"><Icon name="fa-bell" className="mr-1" />Lembrete enviado para você em {br(lembrete.quando)}.</p>
        )}
      </div>

      {jaRecebido > 0 && (
        <Aviso tone="blue" icon="fa-box-open" title={`Entrega parcial: chegaram ${jaRecebido} de ${s.quantidade}`}>
          Faltam {s.quantidade - jaRecebido}. Confirme quando o restante chegar.
        </Aviso>
      )}

      <RadioGroup
        label={jaRecebido ? "O restante chegou?" : "Chegou tudo certo?"}
        field={{ id: "chegada", name: "chegada", value: escolha }}
        radio={[
          { value: "ok", label: jaRecebido ? "Sim, chegou o restante" : "Sim, quantidade e itens batem com o pedido" },
          // Entrega parcial só faz sentido se faltam pelo menos 2.
          ...(s.quantidade - jaRecebido > 1 ? [{ value: "parcial", label: jaRecebido ? "Chegou mais uma parte" : "Chegou só uma parte" }] : []),
          { value: "divergencia", label: "Não, houve divergência ou devolução" },
        ]}
        onChange={(e) => { setEscolha(e.target.value); setErros({}); }}
      />
      {escolha === "parcial" && (
        <div className="max-w-xs">
          <Input id="recebido" type="counter" label="Quantos chegaram agora?" value={recebidoAgora} errors={erros.parcial ? [erros.parcial] : []} onChange={(e) => { setRecebidoAgora(val(e)); setErros((x) => ({ ...x, parcial: undefined })); }} />
        </div>
      )}
      {escolha === "divergencia" && (
        <div className="space-y-8">
          <Input id="tipos" type="checkgroup" label="O que aconteceu?" options={TIPOS_DIVERGENCIA} value={tipos} errors={erros.tipos ? [erros.tipos] : []} onChange={(v) => { setTipos(v); setErros((x) => ({ ...x, tipos: undefined })); }} />
          <Input id="descricao" type="textarea" label="Descreva" placeholder="Ex.: chegaram 8 potes, não 12" rows={3} value={descricao} errors={erros.descricao ? [erros.descricao] : []} onChange={(e) => { setDescricao(val(e)); setErros((x) => ({ ...x, descricao: undefined })); }} />
          <div>
            <p className="block text-sm/4 font-bold text-brand-purple-dark mb-2">Foto <span className="font-normal text-brand-purple-dark/50">(opcional)</span></p>
            <FileUploader variant="simplified" upload={{ ref: "foto", accept: ".jpg,.jpeg,.png", maxEntries: 3, maxFileSize: 10_000_000 }} />
          </div>
        </div>
      )}
      {erros.escolha && <p className="text-sm text-brand-red">{erros.escolha}</p>}

      <StageFooter>
      <Button color={escolha === "divergencia" ? "red" : "blue"} leftIcon={escolha === "divergencia" ? "fa-triangle-exclamation" : escolha === "parcial" ? "fa-box-open" : "fa-check"} onClick={confirmar}>
        {escolha === "divergencia" ? "Registrar divergência" : escolha === "parcial" ? "Registrar entrega parcial" : "Confirmar chegada"}
      </Button>
      </StageFooter>
    </div>
  );
}

/* ================================================================== *
 * Modais
 * ================================================================== */

function Modais({
  modal, setModal, s, alcadas, nomeFornecedor, proximoPedido, onMotivo, onItem, onFornecedor, onEmitir,
}: {
  modal: ModalState;
  setModal: (m: ModalState) => void;
  s: Solicitacao;
  alcadas: Alcadas;
  nomeFornecedor: (id?: string) => string;
  proximoPedido: string;
  onMotivo: (kind: "devolver" | "reprovar" | "nova-cotacao" | "reprovar-pedido" | "cancelar", motivo: string) => void;
  onItem: (item: Item) => void;
  onFornecedor: (f: Fornecedor, slot: number | undefined, fromNota: boolean) => void;
  onEmitir: (numero: string, nivel: Nivel, motivo: string) => void;
}) {
  const close = () => setModal(null);
  if (!modal) return null;
  switch (modal.kind) {
    case "devolver":
      return <MotivoModal key="devolver" id="devolver" title="Devolver para ajuste" label={`O que ${s.requisitante.nome} precisa ajustar?`} placeholder="Ex.: informe o modelo ou o tamanho" confirm="Devolver" color="blue" onCancel={close} onConfirm={(m) => onMotivo("devolver", m)} />;
    case "reprovar":
      return <MotivoModal key="reprovar" id="reprovar" title="Reprovar solicitação" label="Motivo da reprovação" placeholder={`${s.requisitante.nome} vai ver este motivo`} confirm="Reprovar" color="red" initialError={modal.error} note="A reprovação encerra a solicitação." onCancel={close} onConfirm={(m) => onMotivo("reprovar", m)} />;
    case "nova-cotacao":
      return <MotivoModal key="nova" id="nova-cotacao" title="Pedir nova cotação" label="O que Compras deve buscar?" placeholder="Ex.: o preço está acima do mercado; cote com fabricante" confirm="Pedir nova cotação" color="blue" note={`O pedido ${s.pedido?.numero} é cancelado e a solicitação volta para a fila de Compras. O número não é reaproveitado.`} onCancel={close} onConfirm={(m) => onMotivo("nova-cotacao", m)} />;
    case "reprovar-pedido":
      return <MotivoModal key="reprovar-pedido" id="reprovar-pedido" title={`Reprovar pedido ${s.pedido?.numero}`} label="Motivo da reprovação" placeholder="O requisitante e Compras vão ver este motivo" confirm="Reprovar pedido" color="red" note="A reprovação encerra a solicitação." onCancel={close} onConfirm={(m) => onMotivo("reprovar-pedido", m)} />;
    case "cancelar":
      return <MotivoModal key="cancelar" id="cancelar" title="Cancelar solicitação" label="Por que cancelar? (opcional)" placeholder="Ex.: a unidade recebeu doação do material" confirm="Cancelar solicitação" cancelLabel="Voltar" color="red" opcional note="Só dá para cancelar antes de a solicitação ir para Compras. Depois, fale com quem está com ela." onCancel={close} onConfirm={(m) => onMotivo("cancelar", m)} />;
    case "item":
      return <ItemModal nome={modal.nome} onCancel={close} onSave={onItem} />;
    case "fornecedor":
      return <FornecedorModal razao={modal.razao} cnpj={modal.cnpj} fromNota={modal.fromNota} onCancel={close} onSave={(f) => onFornecedor(f, modal.slot, Boolean(modal.fromNota))} />;
    case "emitir":
      return <EmitirModal s={s} alcadas={alcadas} numero={proximoPedido} nomeFornecedor={nomeFornecedor} onCancel={close} onConfirm={onEmitir} />;
  }
}

function MotivoModal({
  id, title, label, placeholder, confirm, color, note, initialError = false, opcional = false, cancelLabel, onCancel, onConfirm,
}: {
  id: string; title: string; label: string; placeholder: string; confirm: string; color: "red" | "blue"; note?: string; initialError?: boolean;
  /** O motivo não é obrigatório (cancelar a própria solicitação). */
  opcional?: boolean;
  cancelLabel?: string;
  onCancel: () => void; onConfirm: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState(initialError);
  return (
    <FormDrawer
      id={id}
      title={title}
      cancelLabel={cancelLabel}
      onCancel={onCancel}
      actions={<Button color={color} onClick={() => (motivo.trim() || opcional ? onConfirm(motivo.trim()) : setErro(true))}>{confirm}</Button>}
    >
      <Input id={`${id}-motivo`} type="textarea" label={label} placeholder={placeholder} rows={4} value={motivo} errors={erro ? ["O motivo é obrigatório"] : []} onChange={(e) => { setMotivo(val(e)); setErro(false); }} />
      {note && <p className="text-sm text-brand-purple-dark/60">{note}</p>}
    </FormDrawer>
  );
}

const MEDIDAS = UNIDADES_MEDIDA.map((u) => ({ label: u, value: u }));
const CATEGORIAS = ["Material pedagógico", "Material sensorial", "Mobiliário", "Escritório", "Limpeza", "Equipamento"].map((c) => ({ label: c, value: c }));

function ItemModal({ nome: inicial, onCancel, onSave }: { nome: string; onCancel: () => void; onSave: (i: Item) => void }) {
  const [nome, setNome] = useState(inicial);
  const [unidade, setUnidade] = useState("");
  const [categoria, setCategoria] = useState("");
  const [erros, setErros] = useState<Record<string, string[]>>({});
  return (
    <FormDrawer
      id="cadastro-item"
      title="Cadastrar item"
      onCancel={onCancel}
      actions={
        <Button
          onClick={() => {
            const e: Record<string, string[]> = {};
            if (!nome.trim()) e.nome = ["Informe o nome"];
            if (!unidade) e.unidade = ["Escolha a unidade"];
            setErros(e);
            if (!Object.keys(e).length) onSave({ id: `i_${nome.length}${unidade}`, nome: nome.trim(), unidade });
          }}
        >
          Cadastrar item
        </Button>
      }
    >
      <div className="space-y-8">
        <Input id="item-nome" label="Nome do item" value={nome} errors={erros.nome} onChange={(e) => setNome(val(e))} />
        <div className="grid grid-cols-2 gap-4">
          <Input id="item-unidade" type="select" label="Unidade de medida" prompt="Escolha" options={MEDIDAS} value={unidade} errors={erros.unidade} onChange={(v) => setUnidade(v ?? "")} />
          <Input id="item-categoria" type="select" label="Categoria" prompt="Escolha" options={CATEGORIAS} value={categoria} onChange={(v) => setCategoria(v ?? "")} />
        </div>
      </div>
    </FormDrawer>
  );
}

function FornecedorModal({ razao: r0 = "", cnpj: c0 = "", fromNota = false, onCancel, onSave }: { razao?: string; cnpj?: string; fromNota?: boolean; onCancel: () => void; onSave: (f: Fornecedor) => void }) {
  const [razao, setRazao] = useState(r0);
  const [cnpj, setCnpj] = useState(c0);
  const [contato, setContato] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erros, setErros] = useState<Record<string, string[]>>({});
  return (
    <FormDrawer
      id="cadastro-fornecedor"
      title={fromNota ? "Cadastrar fornecedor da nota" : "Cadastrar fornecedor"}
      onCancel={onCancel}
      actions={
        <Button
          onClick={() => {
            const e: Record<string, string[]> = {};
            if (cnpj.replace(/\D/g, "").length !== 14) e.cnpj = ["CNPJ precisa ter 14 dígitos"];
            if (!razao.trim()) e.razao = ["Informe a razão social"];
            setErros(e);
            if (!Object.keys(e).length) onSave({ id: `f_${cnpj.replace(/\D/g, "")}`, razao: razao.trim(), cnpj, contato, telefone });
          }}
        >
          Cadastrar fornecedor
        </Button>
      }
    >
      {fromNota && <p className="text-sm text-brand-purple-dark/70">CNPJ e razão social vêm da nota e não se editam.</p>}
      <div className="space-y-8">
        {fromNota ? <FakeInput label="CNPJ" value={cnpj} rightIcon="fa-lock" /> : <Input id="forn-cnpj" label="CNPJ" placeholder="00.000.000/0000-00" value={cnpj} errors={erros.cnpj} onChange={(e) => setCnpj(val(e))} />}
        {fromNota ? <FakeInput label="Razão social" value={razao} rightIcon="fa-lock" /> : <Input id="forn-razao" label="Razão social" value={razao} errors={erros.razao} onChange={(e) => setRazao(val(e))} />}
        <div className="grid grid-cols-2 gap-4">
          <Input id="forn-contato" label="Contato (opcional)" value={contato} onChange={(e) => setContato(val(e))} />
          <Input id="forn-tel" label="Telefone (opcional)" type="tel" value={telefone} onChange={(e) => setTelefone(val(e))} />
        </div>
      </div>
    </FormDrawer>
  );
}

function EmitirModal({
  s, alcadas, numero, nomeFornecedor, onCancel, onConfirm,
}: {
  s: Solicitacao; alcadas: Alcadas; numero: string; nomeFornecedor: (id?: string) => string;
  onCancel: () => void; onConfirm: (numero: string, nivel: Nivel, motivo: string) => void;
}) {
  const venc = s.cotacoes?.find((c) => c.fornecedorId === s.vencedor);
  if (!venc) return null;
  const valor = totalCotacao(venc, s.quantidade);
  const { nivel, motivo } = nivelDoPedido(valor, alcadas);
  return (
    <FormDrawer
      id="emitir"
      title="Emitir pedido de compra"
      size="max-w-2xl"
      cancelLabel="Voltar"
      onCancel={onCancel}
      actions={
        <Button rightIcon={nivel === "compras" ? "fa-check" : "fa-arrow-up"} onClick={() => onConfirm(numero, nivel, motivo)}>
          {nivel === "compras" ? `Emitir ${numero}` : `Emitir e enviar ao ${NIVEIS[nivel].label}`}
        </Button>
      }
    >
      <div className="space-y-6">
        <dl className="grid grid-cols-2 gap-4">
          <Dado label="Número"><span className="font-bold">{numero}</span></Dado>
          <Dado label="Fornecedor">{nomeFornecedor(venc.fornecedorId)}</Dado>
          <Dado label="Quantidade">{plural(s)}</Dado>
          <Dado label="Total"><span className="font-bold">{brl(valor)}</span></Dado>
        </dl>

        <div>
          <h3 className="font-bold text-brand-purple-dark mb-3">Alçada</h3>
          <NiveisAlcada alcadas={alcadas} nivel={nivel} />
          <div className="mt-4">
            <Aviso tone={nivel === "compras" ? "green" : "blue"} icon={nivel === "compras" ? "fa-circle-check" : "fa-arrow-up"} title={nivel === "compras" ? "Sai aprovado" : `Precisa da aprovação do ${NIVEIS[nivel].label} (${NIVEIS[nivel].quem.nome})`}>
              {motivo}
            </Aviso>
          </div>
          {nivel === "compras" && (
            <div className="mt-4">
              <Consumo alcadas={alcadas} nivel="compras" valor={valor} />
            </div>
          )}
        </div>
        {s.justificativa && <p className="text-sm text-yellow-dark"><Icon name="fa-triangle-exclamation" className="mr-1" />{s.justificativa}</p>}
        {entregaEm(venc.prazoDias) > s.dataDesejada && (
          <Aviso tone="yellow" icon="fa-calendar-xmark" title={`Entrega prevista para ${br(entregaEm(venc.prazoDias))}, depois da data pedida (${br(s.dataDesejada)})`}>
            {s.requisitante.nome} é avisada do novo prazo quando o pedido for emitido.
          </Aviso>
        )}
        <p className="text-sm text-brand-purple-dark/60">Depois de emitido, o pedido não se edita: uma correção vira um novo pedido, com outro número.</p>
      </div>
    </FormDrawer>
  );
}
