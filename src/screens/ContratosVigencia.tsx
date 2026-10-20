/**
 * Gestão de Contratos — Vigência & Aditivos.
 *
 * Três abas sobre os contratos Vigentes: Radar (por data de fim), Reajustes
 * (data-base, janela, índice e valor sugerido) e Aditivos (o livro). Abre
 * filtrada por um contrato quando vem da Ficha (`controls.contrato`).
 *
 * Regra de desenho decidida aqui: a janela de reajuste fica ABERTA quando a
 * próxima data-base está a até 90 dias ou já passou — a mesma régua do
 * "Alerta 31–90d", para o Financeiro preparar o reajuste com a antecedência
 * que o aviso de vigência já dá.
 *
 * Feito na tela (componente novo): as pílulas de filtro e a etiqueta do
 * contrato. O resto é `lazy_tabs`, `table`, `modal`, `input`, `tag`, `button`
 * e `empty_state_card`; o formulário de aditivo é o mesmo da Ficha.
 */
import { useMemo, useState, type ReactNode } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Icon } from "../components/Icon.js";
import { Input } from "../components/Input.js";
import { EmptyStateCard } from "../components/Layout.js";
import { DrawerModal } from "../components/Overlay.js";
import { Table } from "../components/Table.js";
import { ButtonTabs, titleToSlug } from "../components/Tabs.js";
import { Tag } from "../components/Tag.js";
import { ModalAditivo } from "./gestao-de-contratos/FormAditivo.js";
import {
  APROVACAO, ASSINATURA, FAIXA, TODAY, br, brl, diasAte, diasLabel, faixa, parteDe,
  type Aditivo, type Contrato, type ContratosData, type Faixa, type Indice, type Papel,
} from "./gestao-de-contratos/model.js";
import { ACOES_COMPACTAS, Aviso, Bloco, Dados, ContratosShell, Etiquetas, Selo, Valor, exportarPlanilha, papelDe, SeloLeitura, irFicha, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";

type Aba = "radar" | "reajustes" | "aditivos";
const ABAS: Aba[] = ["radar", "reajustes", "aditivos"];

/** Dias de antecedência em que a janela de reajuste abre (ver comentário do topo). */
export const JANELA_DIAS = 90;

/** Reajuste é do Financeiro; aditivo, do Jurídico e do operador. Diretoria só lê. */
const podeReajustar = (p: Papel) => p === "financeiro";
const podeAditar = (p: Papel) => p === "juridico" || p === "operador";

const pctBr = (t: number) => `${t.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const numBr = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseBr = (s: string) => Number(s.trim().replace(/\./g, "").replace(",", "."));
const umAnoDepois = (iso: string) => `${Number(iso.slice(0, 4)) + 1}${iso.slice(4)}`;
const cents = (v: number) => Math.round(v * 100);

const janelaAberta = (c: Contrato) => c.dataBase != null && diasAte(c.dataBase) <= JANELA_DIAS;
const indiceDe = (data: ContratosData, c: Contrato): Indice | undefined => data.indices.find((i) => i.codigo === c.indice);
const sugerido = (c: Contrato, i?: Indice) => (c.valor != null && i ? Math.round(c.valor * (1 + i.taxa / 100) * 100) / 100 : undefined);
const emExperiencia = (c: Contrato) => c.experienciaAte != null && c.experienciaAte >= TODAY;

export function ContratosVigencia({ context }: ScreenProps) {
  return (
    <ContratosShell
      context={context}
      secao="vigencia"
      titulo="Vigência & Aditivos"
      subtitulo="Prazos, reajustes e termos aditivos dos contratos Vigentes."
    >
      {(data) => <Vigencia key={JSON.stringify(context.controls)} data={data} context={context} />}
    </ContratosShell>
  );
}

function Vigencia({ data, context }: { data: ContratosData; context: ScenarioContext }) {
  const papel = papelDe(context, "financeiro");
  const ctl = context.controls;
  const [contratos, setContratos] = useState(data.contratos);
  const [aditivos, setAditivos] = useState(data.aditivos);
  const [contratoId, setContratoId] = useState(data.contratos.some((c) => c.id === ctl.contrato) ? ctl.contrato! : "");
  const aba: Aba = ABAS.includes(ctl.aba as Aba) ? (ctl.aba as Aba) : ctl.modal === "aditivo" ? "aditivos" : ctl.modal === "aplicar-reajuste" ? "reajustes" : "radar";
  // O cenário escolhe a aba inicial; ButtonTabs lê a escolha da URL ao montar.
  useState(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const titulo = { radar: "Radar", reajustes: "Reajustes", aditivos: "Aditivos" }[aba];
    params.set("vigenciaTab", `vigencia-abas|${titleToSlug(titulo)}`);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
  });

  const atual = { ...data, contratos, aditivos };
  const vigentesTodos = contratos.filter((c) => c.status === "vigente");
  const filtrado = contratos.find((c) => c.id === contratoId);
  const vs = contratoId ? vigentesTodos.filter((c) => c.id === contratoId) : vigentesTodos;

  // Modal de reajuste: abre no contrato filtrado ou no primeiro com a janela aberta.
  const alvoInicial = ctl.modal === "aplicar-reajuste" ? (vs.find((c) => janelaAberta(c) && c.indice) ?? vs[0])?.id : undefined;
  const [reajuste, setReajuste] = useState<string | undefined>(alvoInicial);
  const [novoAditivo, setNovoAditivo] = useState(ctl.modal === "aditivo");

  const aplicar = (id: string, novoValor: number, justificativa: string, manual: boolean) => {
    const c = contratos.find((x) => x.id === id)!;
    const i = indiceDe(data, c)!;
    setContratos((cs) =>
      cs.map((x) =>
        x.id === id
          ? {
              ...x,
              valor: novoValor,
              ultimoReajuste: { data: TODAY, taxa: i.taxa, valorAnterior: x.valor ?? 0, ...(manual && { manual: true }) },
              dataBase: x.dataBase ? umAnoDepois(x.dataBase) : x.dataBase,
              eventos: [...x.eventos, { id: `e_${Date.now()}`, data: TODAY, tipo: "versao", titulo: manual ? "Reajuste aplicado (ajuste manual)" : "Reajuste aplicado", autor: "Marina Alves", detalhe: justificativa || undefined }],
            }
          : x,
      ),
    );
    setReajuste(undefined);
    showToast({
      type: "success",
      title: manual ? "Reajuste aplicado com ajuste manual" : "Reajuste aplicado",
      content: `${id}: ${i.codigo} ${pctBr(i.taxa)}. Próxima data-base ${br(c.dataBase ? umAnoDepois(c.dataBase) : undefined)}.`,
      closeTime: 5000,
    });
  };

  const salvarAditivo = (a: Aditivo) => {
    setAditivos((as) => [a, ...as]);
    setNovoAditivo(false);
    showToast({ type: "success", title: "Aditivo registrado", content: `${a.codigo} · ${a.tipo}, Em Elaboração. Vai para aprovação antes da assinatura.`, closeTime: 5000 });
  };

  const naoVigente = filtrado && filtrado.status !== "vigente";
  const header = (
    <div className="flex flex-col gap-3">
      {filtrado && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-brand-purple-dark/80">
            Mostrando só <strong className="text-brand-purple-dark">{filtrado.id}</strong> · {parteDe(data, filtrado)?.nome}
          </p>
          <Button variant="outline" size="small" leftIcon="fa-arrow-up-right-from-square" onClick={() => irFicha(context, filtrado.id, "vigencia")}>
            Abrir ficha
          </Button>
        </div>
      )}
      {filtrado && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/16 pl-3 pr-1.5 py-1 text-sm font-bold text-brand-blue-dark">
            Contrato: {filtrado.id}
            <button type="button" onClick={() => setContratoId("")} aria-label={`Remover filtro do contrato ${filtrado.id}`} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-brand-blue/20">
              <Icon name="fa-xmark" className="text-xs" />
            </button>
          </span>
        </div>
      )}
      {naoVigente && (
        <Aviso tom="neutro" titulo={`${filtrado.id} não está Vigente`}>
          Radar, reajustes e aditivos valem só para contratos Vigentes. Este está {filtrado.status === "encerrado" ? "encerrado" : "antes da assinatura"}; acompanhe-o pela ficha ou remova o filtro para ver a carteira vigente.
        </Aviso>
      )}
    </div>
  );

  const alvo = contratos.find((c) => c.id === reajuste);

  return (
    <>
      <Bloco>
        {header}
        <ButtonTabs
          id="vigencia-abas"
          trackerId="vigenciaTab"
          size="small"
          tab={[
            { title: "Radar", content: <Radar data={atual} vs={vs} faixaInicial={ctl.faixa} abrir={(id) => irFicha(context, id, "vigencia")} /> },
            { title: "Reajustes", content: <Reajustes data={atual} vs={vs} papel={papel} onAplicar={setReajuste} /> },
            { title: "Aditivos", content: <Aditivos data={atual} contratoId={contratoId} papel={papel} onNovo={!naoVigente && vigentesTodos.length ? () => setNovoAditivo(true) : undefined} /> },
          ]}
        />
      </Bloco>
      {alvo && <ModalReajuste data={atual} contrato={alvo} onCancel={() => setReajuste(undefined)} onAplicar={aplicar} />}
      {novoAditivo && (
        <ModalAditivo show data={atual} contrato={filtrado && !naoVigente ? filtrado : undefined} onCancel={() => setNovoAditivo(false)} onSave={salvarAditivo} />
      )}
    </>
  );
}

function Vazio({ icon, texto, children }: { icon: string; texto: string; children?: ReactNode }) {
  return (
    <EmptyStateCard icon={icon} text={texto}>
      {children}
    </EmptyStateCard>
  );
}

/** Selo "Somente leitura"; o motivo fica ao passar o mouse. */
function Leitura({ children }: { children: string }) {
  return (
    <div>
      <SeloLeitura motivo={children} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Radar                                                               */
/* ------------------------------------------------------------------ */

type FiltroRadar = "critico" | "alerta" | "regular" | "experiencia";
const FILTROS_RADAR: { id: FiltroRadar; label: string; icon: string }[] = [
  { id: "critico", label: "Crítico", icon: "fa-siren-on" },
  { id: "alerta", label: "Atenção", icon: "fa-triangle-exclamation" },
  { id: "regular", label: "Regular", icon: "fa-circle-check" },
  { id: "experiencia", label: "CLT em experiência", icon: "fa-user-clock" },
];

/** Crítico inclui os vencidos (como o "Críticos ≤30d" da Torre). Faixas somam entre si; experiência restringe. */
function passaRadar(c: Contrato, f: Set<FiltroRadar>) {
  const faixas = [...f].filter((x) => x !== "experiencia");
  const fx: Faixa = faixa(c.fim);
  const okFaixa = !faixas.length || faixas.some((x) => (x === "critico" ? fx === "critico" || fx === "vencido" : fx === x));
  return okFaixa && (!f.has("experiencia") || emExperiencia(c));
}

function Radar({ data, vs, faixaInicial, abrir }: { data: ContratosData; vs: Contrato[]; faixaInicial?: string; abrir: (id: string) => void }) {
  const [filtros, setFiltros] = useState(new Set<FiltroRadar>(FILTROS_RADAR.some((f) => f.id === faixaInicial) ? [faixaInicial as FiltroRadar] : []));
  const toggle = (id: FiltroRadar) => setFiltros((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const lista = useMemo(() => vs.filter((c) => passaRadar(c, filtros)).sort((a, b) => a.fim.localeCompare(b.fim)), [vs, filtros]);
  const contagem = (id: FiltroRadar) => vs.filter((c) => passaRadar(c, new Set([id]))).length;
  const faixaSelecionada = [...filtros].find((f) => f !== "experiencia") ?? "";

  const exportar = () =>
    exportarPlanilha(
      "radar-de-vigencia",
      ["Contrato", "Parte", "Categoria", "Término", "Dias restantes", "Faixa", "Experiência até"],
      lista.map((c) => [c.id, parteDe(data, c)?.nome ?? "", c.categoria, br(c.fim), diasLabel(c.fim), FAIXA[faixa(c.fim)].label, c.experienciaAte ? br(c.experienciaAte) : ""]),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input type="select" id="radar-faixa" label="Faixa" prompt="Todas as faixas" value={faixaSelecionada} options={FILTROS_RADAR.filter((f) => f.id !== "experiencia").map((f) => ({ label: `${f.label} (${contagem(f.id)})`, value: f.id }))} onChange={(v) => setFiltros((atuais) => { const proximos = new Set<FiltroRadar>([...atuais].filter((f) => f === "experiencia")); if (v) proximos.add(v as FiltroRadar); return proximos; })} className="w-full sm:w-56" />
        <Input type="select" id="radar-experiencia" label="Experiência" prompt="Todos os contratos" value={filtros.has("experiencia") ? "experiencia" : ""} options={[{ label: `CLT em experiência (${contagem("experiencia")})`, value: "experiencia" }]} onChange={(v) => setFiltros((atuais) => { const proximos = new Set(atuais); if (v) proximos.add("experiencia"); else proximos.delete("experiencia"); return proximos; })} className="w-full sm:w-56" />
        <Button variant="tint" leftIcon="fa-file-spreadsheet" onClick={exportar} className="ml-auto">
          Exportar planilha
        </Button>
      </div>
      <Etiquetas itens={[...filtros].map((f) => ({ id: f, label: FILTROS_RADAR.find((x) => x.id === f)!.label, onRemove: () => toggle(f) }))} onLimpar={() => setFiltros(new Set())} />
      {vs.length === 0 ? (
        <Vazio icon="fa-calendar-clock" texto="Nenhum contrato Vigente no radar">
          <p>O radar acompanha o fim da vigência a partir da assinatura do contrato.</p>
        </Vazio>
      ) : lista.length === 0 ? (
        <Vazio icon="fa-filter-circle-xmark" texto="Nenhum contrato com esses filtros">
          <p>Remova uma etiqueta ou limpe os filtros.</p>
        </Vazio>
      ) : (
        <Table
          className={ACOES_COMPACTAS}
          id="radar"
          rows={lista}
          rowId={(c) => c.id}
          rowClick={(c) => abrir(c.id)}
          col={[
            { label: "Contrato", render: (c) => <span className="font-bold text-brand-purple-dark whitespace-nowrap">{c.id}</span> },
            {
              label: "Parte e categoria",
              className: "min-w-56",
              render: (c) => (
                <div>
                  <p className="font-semibold text-brand-purple-dark">{parteDe(data, c)?.nome}</p>
                  <p className="text-sm">{c.categoria}</p>
                </div>
              ),
            },
            { label: "Término", render: (c) => <span className="whitespace-nowrap">{br(c.fim)}</span> },
            {
              label: "Faixa e dias restantes",
              render: (c) => (
                <div className="flex flex-col items-start gap-1">
                  <Selo s={FAIXA[faixa(c.fim)]} />
                  <span className="text-sm font-bold tabular-nums whitespace-nowrap">{diasLabel(c.fim)}</span>
                </div>
              ),
            },
            {
              label: "Experiência CLT",
              render: (c) =>
                c.experienciaAte ? (
                  emExperiencia(c) ? (
                    <Tag item={`Até ${br(c.experienciaAte)} · ${diasLabel(c.experienciaAte)}`} variant={diasAte(c.experienciaAte) <= 30 ? "red" : "yellow"} leftIcon="fa-user-clock" className="whitespace-nowrap" />
                  ) : (
                    <span className="text-sm">Encerrada em {br(c.experienciaAte)}</span>
                  )
                ) : (
                  <span className="text-brand-purple-dark/40">—</span>
                ),
            },
          ]}
          action={[
            (c) => (
              <span className="inline-flex pr-3">
                <Button size="small" variant="ghost" title="Abrir ficha" aria-label={`Abrir ficha de ${c.id}`} onClick={(e) => { e.stopPropagation(); abrir(c.id); }}>
                  <Icon name="fa-arrow-up-right-from-square" />
                </Button>
              </span>
            ),
          ]}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reajustes                                                           */
/* ------------------------------------------------------------------ */

type FiltroReajuste = "janela" | "IPCA" | "IGP-M" | "CCT";
const FILTROS_REAJUSTE: { id: FiltroReajuste; label: string; icon?: string }[] = [
  { id: "janela", label: "Janela Aberta", icon: "fa-door-open" },
  { id: "IPCA", label: "IPCA" },
  { id: "IGP-M", label: "IGP-M" },
  { id: "CCT", label: "CCT" },
];

function passaReajuste(c: Contrato, f: Set<FiltroReajuste>) {
  const indices: FiltroReajuste[] = [...f].filter((x) => x !== "janela");
  return (!f.has("janela") || janelaAberta(c)) && (!indices.length || indices.includes(c.indice as FiltroReajuste));
}

function Reajustes({ data, vs, papel, onAplicar }: { data: ContratosData; vs: Contrato[]; papel: Papel; onAplicar: (id: string) => void }) {
  const [filtros, setFiltros] = useState(new Set<FiltroReajuste>());
  const lista = useMemo(
    () => vs.filter((c) => passaReajuste(c, filtros)).sort((a, b) => (a.dataBase ?? "9999").localeCompare(b.dataBase ?? "9999")),
    [vs, filtros],
  );
  const pode = podeReajustar(papel);

  const exportar = () =>
    exportarPlanilha(
      "reajustes",
      ["Contrato", "Parte", "Índice", "Taxa", "Próxima data-base", "Janela", "Último reajuste", "Valor atual", "Novo valor sugerido"],
      lista.map((c) => {
        const i = indiceDe(data, c);
        const s = sugerido(c, i);
        return [c.id, parteDe(data, c)?.nome ?? "", c.indice ?? "Sem índice", i ? pctBr(i.taxa) : "Índice desconhecido", br(c.dataBase), janelaAberta(c) ? "Aberta" : "Fechada", c.ultimoReajuste ? `${br(c.ultimoReajuste.data)} ${pctBr(c.ultimoReajuste.taxa)}${c.ultimoReajuste.manual ? " (ajuste manual)" : ""}` : "", c.valor != null ? brl(c.valor) : "", s != null ? brl(s) : ""];
      }),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          type="select"
          id="reajuste-janela"
          label="Janela"
          prompt="Todas as janelas"
          value={filtros.has("janela") ? "janela" : ""}
          options={[{ label: `Janela Aberta (${vs.filter((c) => passaReajuste(c, new Set(["janela"]))).length})`, value: "janela" }]}
          onChange={(v) => setFiltros((s) => { const n = new Set<FiltroReajuste>([...s].filter((x) => x !== "janela")); if (v) n.add("janela"); return n; })}
          className="w-full sm:w-56"
        />
        <Input
          type="select"
          id="reajuste-indice"
          label="Índice"
          prompt="Todos os índices"
          value={[...filtros].find((x) => x !== "janela") ?? ""}
          options={FILTROS_REAJUSTE.filter((f) => f.id !== "janela").map((f) => ({ label: `${f.label} (${vs.filter((c) => passaReajuste(c, new Set([f.id]))).length})`, value: f.id }))}
          onChange={(v) => setFiltros((s) => { const n = new Set<FiltroReajuste>([...s].filter((x) => x === "janela")); if (v) n.add(v as FiltroReajuste); return n; })}
          className="w-full sm:w-56"
        />
        <Button variant="tint" leftIcon="fa-file-spreadsheet" onClick={exportar} className="ml-auto">
          Exportar planilha
        </Button>
      </div>
      <p className="text-sm text-brand-purple-dark/60">
        A janela abre {JANELA_DIAS} dias antes da data-base e fica aberta até o reajuste ser aplicado. Taxas: {data.indices.map((i) => `${i.codigo} ${pctBr(i.taxa)} (${i.referencia})`).join(" · ")}.
      </p>
      {!pode && <Leitura>Aplicar reajuste é do Financeiro / Controladoria.</Leitura>}
      {vs.length === 0 ? (
        <Vazio icon="fa-percent" texto="Nenhum contrato Vigente para reajustar">
          <p>O reajuste vale só para contratos Vigentes, a partir da data-base.</p>
        </Vazio>
      ) : lista.length === 0 ? (
        <Vazio icon="fa-filter-circle-xmark" texto="Nenhum contrato com esses filtros">
          <p>Remova uma etiqueta ou limpe os filtros.</p>
        </Vazio>
      ) : (
        <Table
            className={ACOES_COMPACTAS}
          id="reajustes"
          rows={lista}
          rowId={(c) => c.id}
          col={[
            {
              label: "Contrato",
              className: "min-w-48",
              render: (c) => (
                <div>
                  <p className="font-bold text-brand-purple-dark whitespace-nowrap">{c.id}</p>
                  <p className="text-sm">{parteDe(data, c)?.nome}</p>
                </div>
              ),
            },
            {
              label: "Índice",
              render: (c) => {
                const i = indiceDe(data, c);
                if (!c.indice) return <Tag item="Sem índice" variant="red" leftIcon="fa-triangle-exclamation" className="whitespace-nowrap" title="O contrato não informa índice de reajuste. Corrija na ficha por revisão." />;
                if (!i) return <Tag item={`${c.indice}: índice desconhecido`} variant="red" leftIcon="fa-triangle-exclamation" className="whitespace-nowrap" title="Sem taxa cadastrada para este índice. Cadastre a taxa ou corrija o índice do contrato." />;
                return (
                  <div className="whitespace-nowrap">
                    <p className="font-bold text-brand-purple-dark">{i.codigo}</p>
                    <p className="text-sm tabular-nums">{pctBr(i.taxa)}</p>
                  </div>
                );
              },
            },
            {
              label: "Próxima data-base",
              render: (c) => {
                if (!c.dataBase) return "—";
                const d = diasAte(c.dataBase);
                return (
                  <div className="whitespace-nowrap">
                    <p>{br(c.dataBase)}</p>
                    <p className="text-sm">{d < 0 ? `há ${-d} dia(s)` : d === 0 ? "hoje" : `em ${d} dia(s)`}</p>
                  </div>
                );
              },
            },
            {
              label: "Janela",
              render: (c) =>
                janelaAberta(c) ? (
                  <Tag item="Aberta" variant="yellow" leftIcon="fa-door-open" />
                ) : (
                  <span className="text-sm whitespace-nowrap">Abre em {c.dataBase ? br(addDiasLocal(c.dataBase, -JANELA_DIAS)) : "—"}</span>
                ),
            },
            {
              label: "Último reajuste",
              render: (c) =>
                c.ultimoReajuste ? (
                  <div className="flex flex-col items-start gap-1 whitespace-nowrap">
                    <span>{br(c.ultimoReajuste.data)} · {pctBr(c.ultimoReajuste.taxa)}</span>
                    {c.ultimoReajuste.manual && <Tag item="Ajuste manual" variant="yellow" leftIcon="fa-pen" />}
                  </div>
                ) : (
                  <span className="text-sm text-brand-purple-dark/50">Nenhum ainda</span>
                ),
            },
            { label: "Valor atual", render: (c) => <Valor valor={c.valor} /> },
            {
              label: "Novo valor sugerido",
              render: (c) => {
                const s = sugerido(c, indiceDe(data, c));
                return s != null ? <Valor valor={s} className="font-bold text-brand-purple-dark" /> : <span className="text-sm text-brand-purple-dark/50">Sem sugestão</span>;
              },
            },
          ]}
          action={[
            (c) =>
              pode && janelaAberta(c) && diasAte(c.fim) <= 0 ? (
                <span className="pr-3 text-sm whitespace-nowrap text-red" title="Contrato vencido: prorrogue por termo aditivo antes de reajustar.">
                  <Icon name="fa-lock" className="mr-1" />
                  Vencido: prorrogue antes
                </span>
              ) : pode && janelaAberta(c) && indiceDe(data, c) && c.valor != null ? (
                <span className="inline-flex pr-3">
                  <Button size="small" variant="tint" leftIcon="fa-percent" onClick={() => onAplicar(c.id)} className="whitespace-nowrap">
                    Aplicar reajuste
                  </Button>
                </span>
              ) : null,
          ]}
        />
      )}
    </div>
  );
}

function addDiasLocal(iso: string, n: number) {
  return new Date(new Date(`${iso}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
}

function ModalReajuste({ data, contrato, onCancel, onAplicar }: { data: ContratosData; contrato: Contrato; onCancel: () => void; onAplicar: (id: string, valor: number, justificativa: string, manual: boolean) => void }) {
  const i = indiceDe(data, contrato);
  const calc = sugerido(contrato, i);
  const [valor, setValor] = useState(calc != null ? numBr(calc) : "");
  const [justificativa, setJustificativa] = useState("");
  const [erros, setErros] = useState<{ valor?: string; justificativa?: string }>({});
  const n = parseBr(valor);
  const manual = calc != null && Number.isFinite(n) && n > 0 && cents(n) !== cents(calc);
  const vencido = diasAte(contrato.fim) <= 0;

  const confirmar = () => {
    const e: typeof erros = {};
    if (!valor.trim() || !Number.isFinite(n) || n <= 0) e.valor = "Informe o novo valor mensal, maior que zero (ex.: 14.749,54).";
    if (manual && !justificativa.trim()) e.justificativa = "O valor é diferente do calculado pelo índice: explique o motivo para a auditoria.";
    if (Object.keys(e).length) return setErros(e);
    onAplicar(contrato.id, Math.round(n * 100) / 100, justificativa.trim(), manual);
  };

  return (
    <DrawerModal id="modal-reajuste" show title={`Aplicar reajuste · ${contrato.id}`} onCancel={onCancel} variant="medium" contentClass={CONTEUDO_DRAWER}>
      {vencido ? (
        <div className="space-y-6">
          <Aviso tom="risco" titulo="Contrato vencido: reajuste bloqueado">
            A vigência terminou em {br(contrato.fim)}. Prorrogue por termo aditivo (aba Aditivos) e depois aplique o reajuste sobre o contrato renovado.
          </Aviso>
          <div className={RODAPE_DRAWER}><Button variant="ghost" onClick={onCancel}>Fechar</Button></div>
        </div>
      ) : !i || calc == null ? (
        <div className="space-y-6">
          <Aviso tom="risco" titulo="Sem taxa para calcular o reajuste">
            O índice {contrato.indice ?? "do contrato"} não tem taxa cadastrada. Cadastre a taxa nas Tabelas de Apoio ou corrija o índice na ficha.
          </Aviso>
          <div className={RODAPE_DRAWER}><Button variant="ghost" onClick={onCancel}>Fechar</Button></div>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-brand-purple-dark/80">
            {parteDe(data, contrato)?.nome} · {contrato.categoria}
          </p>
          <Dados
            colunas={3}
            itens={[
              ["Valor atual", <span className="tabular-nums">{brl(contrato.valor!)}</span>],
              [`Taxa ${i.codigo}`, <span className="tabular-nums" title={i.referencia}>{pctBr(i.taxa)}</span>],
              ["Valor calculado", <strong className="tabular-nums text-brand-purple-dark">{brl(calc)}</strong>],
              ["Data-base", br(contrato.dataBase)],
              ["Próxima data-base", br(contrato.dataBase ? umAnoDepois(contrato.dataBase) : undefined)],
              ["Referência do índice", i.referencia],
            ]}
          />
          <Input
            type="text"
            id="reajuste-valor"
            label="Novo valor mensal"
            hint="R$/mês"
            value={valor}
            onChange={(e) => { setValor(e.target.value); setErros({}); }}
            errors={erros.valor ? [erros.valor] : []}
          />
          {manual && (
            <Aviso tom="atencao" titulo="Ajuste manual">
              O valor difere do calculado ({brl(calc)}). O reajuste fica marcado como ajuste manual e a justificativa é obrigatória.
            </Aviso>
          )}
          <Input
            type="textarea"
            id="reajuste-justificativa"
            label={manual ? "Justificativa (obrigatória)" : "Justificativa (opcional)"}
            placeholder="Ex.: negociação com a parte, arredondamento acordado, índice substituto previsto em contrato…"
            value={justificativa}
            onChange={(e) => { setJustificativa(e.target.value); setErros({}); }}
            errors={erros.justificativa ? [erros.justificativa] : []}
          />
          <div className={RODAPE_DRAWER}>
            <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
            <Button leftIcon="fa-check" onClick={confirmar}>Aplicar reajuste</Button>
          </div>
        </div>
      )}
    </DrawerModal>
  );
}

/* ------------------------------------------------------------------ */
/* Aditivos                                                            */
/* ------------------------------------------------------------------ */

function Aditivos({ data, contratoId, papel, onNovo }: { data: ContratosData; contratoId: string; papel: Papel; onNovo?: () => void }) {
  const [tipo, setTipo] = useState("");
  const [busca, setBusca] = useState("");
  const tipos = data.tabelas.tipo_aditivo.map((o) => o.descricao);
  const base = contratoId ? data.aditivos.filter((a) => a.contratoId === contratoId) : data.aditivos;
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return base
      .filter((a) => !tipo || a.tipo === tipo)
      .filter((a) => {
        if (!q) return true;
        const c = data.contratos.find((x) => x.id === a.contratoId);
        return [a.codigo, a.contratoId, a.tipo, a.impacto, a.motivo, c ? parteDe(data, c)?.nome ?? "" : ""].some((s) => s.toLowerCase().includes(q));
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [base, tipo, busca, data]);
  const pode = podeAditar(papel);

  const etiquetas = [
    ...(tipo ? [{ id: "tipo", label: `Tipo: ${tipo}`, onRemove: () => setTipo("") }] : []),
    ...(busca.trim() ? [{ id: "busca", label: `Busca: "${busca.trim()}"`, onRemove: () => setBusca("") }] : []),
  ];

  const exportar = () =>
    exportarPlanilha(
      "livro-de-aditivos",
      ["Código", "Contrato", "Parte", "Tipo", "Data", "Nova vigência", "Novo valor", "Impacto", "Aprovação", "Assinatura"],
      lista.map((a) => {
        const c = data.contratos.find((x) => x.id === a.contratoId);
        return [a.codigo, a.contratoId, c ? parteDe(data, c)?.nome ?? "" : "", a.tipo, br(a.data), a.novaVigencia ? br(a.novaVigencia) : "", a.novoValor != null ? brl(a.novoValor) : "", a.impacto, APROVACAO[a.aprovacao].label, ASSINATURA[a.assinatura].label];
      }),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input type="search" id="aditivo-busca" placeholder="Buscar código, contrato, parte ou impacto" leftIcon="fa-magnifying-glass" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full sm:w-72" inputClass="text-ellipsis" />
        <Input type="select" id="aditivo-filtro-tipo" label="Tipo" prompt="Todos os tipos" value={tipo} options={tipos.map((t) => ({ label: t, value: t }))} onChange={(v) => setTipo(v ?? "")} className="w-full sm:w-56" />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="tint" leftIcon="fa-file-spreadsheet" onClick={exportar}>Exportar planilha</Button>
          {pode && onNovo && <Button leftIcon="fa-file-plus" onClick={onNovo}>Novo aditivo</Button>}
        </div>
      </div>
      <Etiquetas itens={etiquetas} onLimpar={() => { setTipo(""); setBusca(""); }} />
      {!pode && <Leitura>Registrar aditivo é do Jurídico / Compliance e do operador de contratos.</Leitura>}
      {base.length === 0 ? (
        <Vazio icon="fa-file-plus" texto="Nenhum aditivo registrado">
          <p>Prorrogação, reajuste, inclusão de unidade e outras alterações de contrato Vigente ficam registradas aqui.</p>
          {pode && onNovo && <div className="mt-6 flex justify-center"><Button leftIcon="fa-file-plus" onClick={onNovo}>Novo aditivo</Button></div>}
        </Vazio>
      ) : lista.length === 0 ? (
        <Vazio icon="fa-filter-circle-xmark" texto="Nenhum aditivo com esses filtros">
          <p>Remova uma etiqueta ou limpe os filtros.</p>
        </Vazio>
      ) : (
        <Table
          className="overflow-x-hidden! [&_thead_th]:px-2! [&_tbody_tr_td]:px-2! [&_td_span]:whitespace-normal"
          id="aditivos"
          rows={lista}
          rowId={(a) => a.id}
          col={[
            { label: "Código", render: (a) => <span className="font-bold text-brand-purple-dark whitespace-nowrap">{a.codigo}</span> },
            {
              label: "Contrato",
              render: (a) => {
                const c = data.contratos.find((x) => x.id === a.contratoId);
                return (
                  <div>
                    <p className="font-semibold text-brand-purple-dark whitespace-nowrap">{a.contratoId}</p>
                    <p className="text-sm">{c ? parteDe(data, c)?.nome : ""}</p>
                  </div>
                );
              },
            },
            { label: "Tipo", render: (a) => <span className="whitespace-nowrap">{a.tipo}</span> },
            { label: "Data", render: (a) => <span className="whitespace-nowrap">{br(a.data)}</span> },
            {
              label: "Nova vigência / novo valor",
              render: (a) =>
                a.novaVigencia || a.novoValor != null ? (
                  <div className="flex flex-col gap-1 whitespace-nowrap">
                    {a.novaVigencia && <span>Até {br(a.novaVigencia)}</span>}
                    {a.novoValor != null && <Valor valor={a.novoValor} />}
                  </div>
                ) : (
                  <span className="text-brand-purple-dark/40">—</span>
                ),
            },
            { label: "Impacto", render: (a) => <span className="text-sm">{a.impacto}</span> },
            { label: "Aprovação", render: (a) => <Selo s={APROVACAO[a.aprovacao]} /> },
            { label: "Assinatura", render: (a) => <Selo s={ASSINATURA[a.assinatura]} /> },
          ]}
        />
      )}
    </div>
  );
}
