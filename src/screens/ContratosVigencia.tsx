/**
 * Gestão de Contratos — Vigência & Aditivos (FR-052 a FR-058).
 *
 * Três abas sobre os contratos Vigentes: Radar (por data de fim), Reajustes
 * (data-base, janela, índice e valor sugerido) e Aditivos (o livro). Abre
 * filtrada por um contrato quando vem da Ficha (`controls.contrato`); o filtro
 * vale para as três abas.
 *
 * Regras do `model.ts`: data-base é o aniversário do início (29/02 vira 28/02)
 * e a janela abre a {@link JANELA_REAJUSTE_DIAS} dias dela (RN-040); taxas fixas
 * por índice, com índice não reconhecido a 3,80% e sinalizado (RN-041). O
 * reajuste gera um termo aditivo "Reajuste Financeiro" Aprovado e Assinado,
 * sem mexer na vigência (RN-042); todo aditivo sobe a versão (minor) e registra
 * "Aditamento: Vigente → Vigente Repactuado" (RN-039).
 *
 * Feito na tela (componente novo): a etiqueta do contrato. O resto é
 * `lazy_tabs`, `table`, `modal`, `input`, `tag`, `button` e
 * `empty_state_card`; o formulário de aditivo é o mesmo da Ficha.
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
import { Tag } from "../components/Tag.js";
import { ModalAditivo } from "./gestao-de-contratos/FormAditivo.js";
import {
  APROVACAO, ASSINATURA, FAIXA, JANELA_REAJUSTE_DIAS, PAPEL_WORKFLOW, TAXA_PADRAO, TODAY, br, brl, dataBase, diasAte, diasLabel, emExperiencia, faixa,
  indiceDe, janelaAberta, parteDe, proximaVersao, proximoAditivo, rotuloAditivo, valorReajustado,
  type Aditivo, type Contrato, type ContratosData, type Faixa, type Papel,
} from "./gestao-de-contratos/model.js";
import { ACOES_COMPACTAS, AbasBotao, Aviso, Bloco, Dados, ContratosShell, Etiquetas, Selo, Valor, exportarPlanilha, papelDe, SeloLeitura, irFicha, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";

type Aba = "radar" | "reajustes" | "aditivos";
const ABAS: Aba[] = ["radar", "reajustes", "aditivos"];

/** Reajuste é do Financeiro / Controladoria; aditivo, do Jurídico e do operador. Diretoria só lê. */
const podeReajustar = (p: Papel) => p === "financeiro" || p === "administrador";
const podeAditar = (p: Papel) => p === "juridico" || p === "operador" || p === "administrador";

const USUARIO = "Marina Alves";
const pctBr = (t: number) => `${t.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const numBr = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseBr = (s: string) => Number(s.trim().replace(/\./g, "").replace(",", "."));
const cents = (v: number) => Math.round(v * 100);
const agora = () => `${TODAY}T${new Date().toTimeString().slice(0, 5)}`;

/** Data-base só para contrato com início válido (FR-054). */
const inicioValido = (c: Contrato) => /^\d{4}-\d{2}-\d{2}$/.test(c.inicio);
const dataBaseDe = (c: Contrato) => (inicioValido(c) ? dataBase(c.inicio) : undefined);
const aberta = (c: Contrato) => inicioValido(c) && janelaAberta(c.inicio);
/** Último aditivo de reajuste do contrato (coluna "Último Reajuste", FR-054). */
const ultimoReajuste = (aditivos: Aditivo[], id: string) =>
  aditivos.filter((a) => a.contratoId === id && a.origem === "reajuste").sort((a, b) => b.data.localeCompare(a.data))[0];

/**
 * Efeito de um termo aditivo no contrato (RN-039, RN-042): vigência e valor
 * quando o aditivo os traz, versão minor, registro "Vigente → Vigente
 * Repactuado", auditoria e evento no histórico.
 */
function repactuar(c: Contrato, a: Aditivo, taxa?: number): Contrato {
  const versao = proximaVersao(c.versao, "minor");
  const reajuste = a.origem === "reajuste";
  return {
    ...c,
    versao,
    fim: a.novaVigencia ?? c.fim,
    valor: a.novoValor != null && a.novoValor > 0 ? a.novoValor : c.valor,
    ...(reajuste && { ultimoReajuste: { data: a.data, taxa: taxa ?? 0, valorAnterior: a.valorAnterior ?? 0, ...(a.ajusteManual && { manual: true }) } }),
    versoes: [...c.versoes, { versao, data: a.data, fase: "Aditivos & Reajuste", motivo: a.tipo, resumo: a.impacto, revisor: USUARIO, ...(c.clausulas && { clausulas: c.clausulas }) }],
    workflow: [...c.workflow, { id: `wf_${Date.now()}`, data: agora(), workflow: "ciclo", de: "Vigente", para: "Vigente Repactuado", parecer: `${a.codigo} registrado. Vigência: ${br(a.novaVigencia ?? c.fim)}. Impacto: ${a.impacto}`, usuario: USUARIO, papel: PAPEL_WORKFLOW.aditivo }],
    auditoria: [...c.auditoria, { id: `au_${Date.now()}`, data: agora(), usuario: USUARIO, perfil: reajuste ? "Controladoria" : "Jurídico", acao: reajuste ? "REAJUSTE_APLICAR" : "ADITIVO_REGISTRAR", detalhes: `${a.codigo}: ${a.impacto}` }],
    eventos: [
      ...c.eventos,
      { id: `ev_${Date.now()}`, data: agora(), tipo: "aditivo", titulo: `${rotuloAditivo(a)} · ${a.codigo}${a.ajusteManual ? " (ajuste manual)" : ""}`, autor: USUARIO, detalhe: a.impacto },
      { id: `ev_${Date.now()}_v`, data: agora(), tipo: "versao", titulo: `Versão ${versao} registrada · ${a.tipo}`, autor: USUARIO, detalhe: "Aditamento: Vigente → Vigente Repactuado" },
    ],
  };
}

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
  const papel = papelDe(context, "administrador");
  const ctl = context.controls;
  const [contratos, setContratos] = useState(data.contratos);
  const [aditivos, setAditivos] = useState(data.aditivos);
  const [contratoId, setContratoId] = useState(data.contratos.some((c) => c.id === ctl.contrato) ? ctl.contrato! : "");
  const aba: Aba = ABAS.includes(ctl.aba as Aba) ? (ctl.aba as Aba) : ctl.modal === "aditivo" ? "aditivos" : ctl.modal === "aplicar-reajuste" ? "reajustes" : "radar";
  const [abaAtual, setAbaAtual] = useState<Aba>(aba);

  const atual = { ...data, contratos, aditivos };
  const vigentesTodos = contratos.filter((c) => c.status === "vigente");
  const filtrado = contratos.find((c) => c.id === contratoId);
  const vs = contratoId ? vigentesTodos.filter((c) => c.id === contratoId) : vigentesTodos;

  // Modal de reajuste: abre no contrato filtrado ou no primeiro com a janela aberta.
  const alvoInicial = ctl.modal === "aplicar-reajuste" ? (vs.find((c) => aberta(c) && c.valor != null) ?? vs[0])?.id : undefined;
  const [reajuste, setReajuste] = useState<string | undefined>(alvoInicial);
  const [novoAditivo, setNovoAditivo] = useState(ctl.modal === "aditivo");

  /** Registra o aditivo no livro e aplica o efeito no contrato. */
  const registrar = (a: Aditivo, taxa?: number) => {
    setAditivos((as) => [a, ...as]);
    setContratos((cs) => cs.map((x) => (x.id === a.contratoId ? repactuar(x, a, taxa) : x)));
  };

  /** Aplicar reajuste (RN-042): termo "Reajuste Financeiro" que nasce Aprovado e Assinado, sem alterar a vigência. */
  const aplicar = (id: string, novoValor: number, justificativa: string) => {
    const c = contratos.find((x) => x.id === id)!;
    const { indice, taxa } = indiceDe(data, c.indice);
    const antigo = c.valor ?? 0;
    const calculado = valorReajustado(antigo, taxa);
    const manual = cents(novoValor) !== cents(calculado);
    const { numero, codigo } = proximoAditivo(aditivos, id);
    const a: Aditivo = {
      id: `a_${Date.now()}`,
      contratoId: id,
      numero,
      codigo,
      origem: "reajuste",
      tipo: "Reajuste Financeiro",
      data: TODAY,
      novoValor,
      valorAnterior: antigo,
      motivo: [
        `Aplicação de ${pctBr(taxa)} com base no ${indice?.nome ?? c.indice ?? "índice padrão"}.`,
        manual && `Ajuste manual: calculado R$ ${numBr(calculado)}, aplicado R$ ${numBr(novoValor)}.`,
        justificativa,
      ].filter(Boolean).join(" "),
      impacto: `Valor base ajustado de R$ ${numBr(antigo)} para R$ ${numBr(novoValor)} (+${pctBr(taxa)})`,
      aprovacao: "aprovado",
      assinatura: "assinado",
      ...(manual && { ajusteManual: { calculado, justificativa } }),
    };
    registrar(a, taxa);
    setReajuste(undefined);
    showToast({
      type: "success",
      title: manual ? "Reajuste aplicado com ajuste manual" : "Reajuste aplicado",
      content: `${codigo} · ${rotuloAditivo(a)}: ${a.impacto}. Versão ${proximaVersao(c.versao, "minor")}.`,
      closeTime: 5000,
    });
  };

  const salvarAditivo = (a: Aditivo) => {
    const c = contratos.find((x) => x.id === a.contratoId);
    registrar(a);
    setNovoAditivo(false);
    showToast({ type: "success", title: "Aditivo registrado", content: `${a.codigo} · ${a.tipo}, Aprovado e Assinado. ${a.contratoId} passa à versão ${proximaVersao(c?.versao, "minor")}.`, closeTime: 5000 });
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
  const abasVigencia = (
    <AbasBotao<Aba>
      id="vigencia-abas"
      abas={[{ id: "radar", titulo: "Radar" }, { id: "reajustes", titulo: "Reajustes" }, { id: "aditivos", titulo: "Aditivos" }]}
      ativa={abaAtual}
      onChange={setAbaAtual}
    />
  );

  return (
    <>
      <Bloco>
        {/* Sem contrato filtrado o cabeçalho fica vazio e não pode ocupar o espaço do topo. */}
        {filtrado && header}
        {/* `button_tabs` controlado, na mesma linha dos filtros e botões de cada aba. */}
        {abaAtual === "radar" && <Radar abas={abasVigencia} data={atual} vs={vs} faixaInicial={ctl.faixa} abrir={(id) => irFicha(context, id, "vigencia")} />}
        {abaAtual === "reajustes" && <Reajustes abas={abasVigencia} data={atual} vs={vs} papel={papel} onAplicar={setReajuste} />}
        {abaAtual === "aditivos" && <Aditivos abas={abasVigencia} data={atual} contratoId={contratoId} papel={papel} onNovo={!naoVigente && vigentesTodos.length ? () => setNovoAditivo(true) : undefined} />}
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
/** Filtros do radar (FR-053): Todos (sem filtro), Crítico, Atenção, Regular e CLT em experiência (RN-022). */
const FILTROS_RADAR: { id: FiltroRadar; label: string }[] = [
  { id: "critico", label: "Crítico" },
  { id: "alerta", label: "Atenção" },
  { id: "regular", label: "Regular" },
  { id: "experiencia", label: "CLT em experiência" },
];

/** Crítico inclui os vencidos (faixa "Crítico (≤ 30d)", RN-014). */
function passaRadar(c: Contrato, f: FiltroRadar | "") {
  if (!f) return true;
  if (f === "experiencia") return emExperiencia(c);
  const fx: Faixa = faixa(c.fim);
  return f === "critico" ? fx === "critico" || fx === "vencido" : fx === f;
}

function Radar({ data, vs, faixaInicial, abrir, abas }: { data: ContratosData; vs: Contrato[]; faixaInicial?: string; abrir: (id: string) => void; abas: ReactNode }) {
  const [filtro, setFiltro] = useState<FiltroRadar | "">(FILTROS_RADAR.some((f) => f.id === faixaInicial) ? (faixaInicial as FiltroRadar) : "");
  const lista = useMemo(() => vs.filter((c) => passaRadar(c, filtro)).sort((a, b) => a.fim.localeCompare(b.fim)), [vs, filtro]);
  const contagem = (id: FiltroRadar) => vs.filter((c) => passaRadar(c, id)).length;
  const rotulo = FILTROS_RADAR.find((f) => f.id === filtro)?.label;

  const exportar = () =>
    exportarPlanilha(
      "radar-de-vigencia",
      ["Contrato", "Parte", "Categoria", "Término", "Dias restantes", "Faixa", "CLT em experiência", "Regra de renovação / reajuste"],
      lista.map((c) => [c.id, parteDe(data, c)?.nome ?? "", c.categoria, br(c.fim), diasLabel(c.fim), FAIXA[faixa(c.fim)].longo, emExperiencia(c) ? `Até ${br(c.experienciaAte ?? c.fim)}` : "", c.regraReajusteEspecifica ?? ""]),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {abas}
        <div className="flex flex-wrap items-end gap-3 sm:ml-auto">
        <Input
          type="select"
          id="radar-filtro"
          label="Filtro"
          prompt={`Todos (${vs.length})`}
          value={filtro}
          options={FILTROS_RADAR.map((f) => ({ label: `${f.label} (${contagem(f.id)})`, value: f.id }))}
          onChange={(v) => setFiltro((v as FiltroRadar | undefined) ?? "")}
          className="w-full sm:w-64"
        />
        <Button variant="tint" leftIcon="fa-file-spreadsheet" onClick={exportar}>
          Exportar planilha
        </Button>
        </div>
      </div>
      <Etiquetas itens={rotulo ? [{ id: filtro, label: rotulo, onRemove: () => setFiltro("") }] : []} onLimpar={() => setFiltro("")} />
      {vs.length === 0 ? (
        <Vazio icon="fa-calendar-clock" texto="Nenhum contrato Vigente no radar">
          <p>O radar acompanha o fim da vigência a partir da assinatura do contrato.</p>
        </Vazio>
      ) : lista.length === 0 ? (
        <Vazio icon="fa-filter-circle-xmark" texto="Nenhum contrato com esse filtro">
          <p>Remova a etiqueta para ver todos os Vigentes.</p>
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
              render: (c) => {
                const fx = FAIXA[faixa(c.fim)];
                return (
                  <div className="flex flex-col items-start gap-1">
                    <Selo s={{ label: fx.longo, variant: fx.variant }} />
                    <span className="text-sm font-bold tabular-nums whitespace-nowrap">{diasLabel(c.fim)}</span>
                  </div>
                );
              },
            },
            {
              label: "Experiência CLT",
              render: (c) =>
                emExperiencia(c) ? (
                  <Tag item={`Até ${br(c.experienciaAte ?? c.fim)} · ${diasLabel(c.experienciaAte ?? c.fim)}`} variant={diasAte(c.experienciaAte ?? c.fim) <= 30 ? "red" : "yellow"} leftIcon="fa-user-clock" className="whitespace-nowrap" />
                ) : (
                  <span className="text-brand-purple-dark/40">—</span>
                ),
            },
            {
              label: "Regra de renovação / reajuste",
              className: "min-w-48",
              render: (c) => (c.regraReajusteEspecifica ? <span className="text-sm">{c.regraReajusteEspecifica}</span> : <span className="text-brand-purple-dark/40">—</span>),
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

const JANELA_ABERTA = "Janela Aberta (< 60d)";
const AGUARDANDO = "Aguardando Data-Base";

type FiltroIndice = "IPCA" | "IGP-M" | "CCT";
const INDICES_FILTRO: FiltroIndice[] = ["IPCA", "IGP-M", "CCT"];

function Reajustes({ data, vs, papel, onAplicar, abas }: { data: ContratosData; vs: Contrato[]; papel: Papel; onAplicar: (id: string) => void; abas: ReactNode }) {
  const [soAberta, setSoAberta] = useState(false);
  const [indice, setIndice] = useState<FiltroIndice | "">("");
  const passa = (c: Contrato, janela: boolean, ind: FiltroIndice | "") => (!janela || aberta(c)) && (!ind || indiceDe(data, c.indice).indice?.codigo === ind);
  const lista = vs.filter((c) => passa(c, soAberta, indice)).sort((a, b) => (dataBaseDe(a) ?? "9999").localeCompare(dataBaseDe(b) ?? "9999"));
  const pode = podeReajustar(papel);
  const naoReconhecidos = vs.filter((c) => !indiceDe(data, c.indice).reconhecido);

  const exportar = () =>
    exportarPlanilha(
      "reajustes",
      ["Contrato", "Parte", "Índice", "Taxa", "Último reajuste", "Próxima data-base", "Janela", "Valor atual", "Novo valor sugerido"],
      lista.map((c) => {
        const t = indiceDe(data, c.indice);
        const ult = ultimoReajuste(data.aditivos, c.id);
        return [c.id, parteDe(data, c)?.nome ?? "", c.indice ?? "Não informado", `${pctBr(t.taxa)}${t.reconhecido ? "" : " (índice não reconhecido)"}`, ult ? br(ult.data) : "—", br(dataBaseDe(c)), inicioValido(c) ? (aberta(c) ? JANELA_ABERTA : AGUARDANDO) : "", c.valor != null ? brl(c.valor) : "", c.valor != null ? brl(valorReajustado(c.valor, t.taxa)) : ""];
      }),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {abas}
        <div className="flex flex-wrap items-end gap-3 sm:ml-auto">
        <Input
          type="select"
          id="reajuste-janela"
          label="Janela"
          prompt="Todas as janelas"
          value={soAberta ? "aberta" : ""}
          options={[{ label: `Janela Aberta (${vs.filter((c) => passa(c, true, "")).length})`, value: "aberta" }]}
          onChange={(v) => setSoAberta(!!v)}
          className="w-full sm:w-56"
        />
        <Input
          type="select"
          id="reajuste-indice"
          label="Índice"
          prompt="Todos os índices"
          value={indice}
          options={INDICES_FILTRO.map((f) => ({ label: `${f} (${vs.filter((c) => passa(c, false, f)).length})`, value: f }))}
          onChange={(v) => setIndice((v as FiltroIndice | undefined) ?? "")}
          className="w-full sm:w-56"
        />
        <Button variant="tint" leftIcon="fa-file-spreadsheet" onClick={exportar}>
          Exportar planilha
        </Button>
        </div>
      </div>
      <Etiquetas
        itens={[
          ...(soAberta ? [{ id: "janela", label: "Janela Aberta", onRemove: () => setSoAberta(false) }] : []),
          ...(indice ? [{ id: "indice", label: `Índice: ${indice}`, onRemove: () => setIndice("") }] : []),
        ]}
        onLimpar={() => { setSoAberta(false); setIndice(""); }}
      />
      <p className="text-sm text-brand-purple-dark/60">
        A data-base é o aniversário do início do contrato; a janela abre {JANELA_REAJUSTE_DIAS} dias antes dela. Taxas: {data.indices.map((i) => `${i.codigo} ${pctBr(i.taxa)}`).join(" · ")} · outro índice {pctBr(TAXA_PADRAO)}.
      </p>
      {naoReconhecidos.length > 0 && (
        <Aviso tom="atencao" titulo="Índice não reconhecido">
          {naoReconhecidos.map((c) => `${c.id} (${c.indice ?? "sem índice"})`).join(", ")}: sem taxa própria no módulo, o reajuste usa a taxa padrão de {pctBr(TAXA_PADRAO)}. Confira o índice na ficha antes de aplicar.
        </Aviso>
      )}
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
                const t = indiceDe(data, c.indice);
                if (!t.reconhecido)
                  return <Tag item={`${c.indice ?? "Sem índice"} · ${pctBr(t.taxa)}`} variant="yellow" leftIcon="fa-triangle-exclamation" className="whitespace-nowrap" title={`Índice não reconhecido: usa a taxa padrão de ${pctBr(TAXA_PADRAO)}.`} />;
                return (
                  <div className="whitespace-nowrap">
                    <p className="font-bold text-brand-purple-dark">{t.indice!.codigo}</p>
                    <p className="text-sm tabular-nums">{pctBr(t.taxa)}</p>
                  </div>
                );
              },
            },
            {
              label: "Último Reajuste",
              render: (c) => {
                const ult = ultimoReajuste(data.aditivos, c.id);
                return ult ? (
                  <div className="flex flex-col items-start gap-1 whitespace-nowrap">
                    <span>{br(ult.data)}</span>
                    {ult.ajusteManual && <Tag item="Ajuste manual" variant="yellow" leftIcon="fa-pen" />}
                  </div>
                ) : (
                  <span className="text-brand-purple-dark/40">—</span>
                );
              },
            },
            {
              label: "Próxima data-base",
              render: (c) => {
                const db = dataBaseDe(c);
                if (!db) return <span className="text-brand-purple-dark/40">—</span>;
                const d = diasAte(db);
                return (
                  <div className="whitespace-nowrap">
                    <p>{br(db)}</p>
                    <p className="text-sm">{d === 0 ? "hoje" : `em ${d} dia(s)`}</p>
                  </div>
                );
              },
            },
            {
              label: "Janela",
              render: (c) =>
                !inicioValido(c) ? (
                  <span className="text-brand-purple-dark/40">—</span>
                ) : aberta(c) ? (
                  <Tag item={JANELA_ABERTA} variant="yellow" leftIcon="fa-door-open" className="whitespace-nowrap" />
                ) : (
                  <span className="text-sm whitespace-nowrap">{AGUARDANDO}</span>
                ),
            },
            { label: "Valor atual", render: (c) => <Valor valor={c.valor} /> },
            {
              label: "Novo valor sugerido",
              render: (c) =>
                c.valor != null ? <Valor valor={valorReajustado(c.valor, indiceDe(data, c.indice).taxa)} className="font-bold text-brand-purple-dark" /> : <span className="text-sm text-brand-purple-dark/50">Sem sugestão</span>,
            },
          ]}
          action={[
            (c) =>
              pode && c.status === "vigente" && aberta(c) && c.valor != null ? (
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

function ModalReajuste({ data, contrato, onCancel, onAplicar }: { data: ContratosData; contrato: Contrato; onCancel: () => void; onAplicar: (id: string, valor: number, justificativa: string) => void }) {
  const t = indiceDe(data, contrato.indice);
  const calc = contrato.valor != null ? valorReajustado(contrato.valor, t.taxa) : undefined;
  const [valor, setValor] = useState(calc != null ? numBr(calc) : "");
  const [justificativa, setJustificativa] = useState("");
  const [erros, setErros] = useState<{ valor?: string; justificativa?: string }>({});
  const n = parseBr(valor);
  const manual = calc != null && Number.isFinite(n) && n > 0 && cents(n) !== cents(calc);
  const db = dataBaseDe(contrato);
  const bloqueio =
    contrato.status !== "vigente"
      ? "Só contratos Vigentes podem ser reajustados."
      : !aberta(contrato)
        ? `A janela de reajuste ainda não abriu: ${AGUARDANDO}${db ? ` (data-base ${br(db)}; a janela abre ${JANELA_REAJUSTE_DIAS} dias antes)` : ""}.`
        : calc == null
          ? "O contrato não tem valor base informado; não há o que reajustar."
          : undefined;

  const confirmar = () => {
    const e: typeof erros = {};
    if (!valor.trim() || !Number.isFinite(n) || n <= 0) e.valor = "Informe o novo valor mensal, maior que zero (ex.: 19.277,00).";
    if (manual && !justificativa.trim()) e.justificativa = "O valor é diferente do calculado: a justificativa do ajuste manual é obrigatória.";
    if (Object.keys(e).length) return setErros(e);
    onAplicar(contrato.id, Math.round(n * 100) / 100, justificativa.trim());
  };

  return (
    <DrawerModal id="modal-reajuste" show title={`Aplicar reajuste · ${contrato.id}`} onCancel={onCancel} variant="medium" contentClass={CONTEUDO_DRAWER}>
      {bloqueio || calc == null ? (
        <div className="space-y-6">
          <Aviso tom="neutro" titulo="Reajuste indisponível">
            {bloqueio}
          </Aviso>
          <div className={RODAPE_DRAWER}><Button variant="ghost" onClick={onCancel}>Fechar</Button></div>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-brand-purple-dark/80">
            {parteDe(data, contrato)?.nome} · {contrato.categoria} · {contrato.versao}
          </p>
          {!t.reconhecido && (
            <Aviso tom="atencao" titulo="Índice não reconhecido">
              O índice {contrato.indice ?? "do contrato"} não tem taxa própria no módulo: o cálculo usa a taxa padrão de {pctBr(TAXA_PADRAO)}.
            </Aviso>
          )}
          <Dados
            colunas={3}
            itens={[
              ["Valor atual", <span className="tabular-nums">{brl(contrato.valor!)}</span>],
              [`Taxa ${t.indice?.codigo ?? "padrão"}`, <span className="tabular-nums">{pctBr(t.taxa)}</span>],
              ["Valor calculado", <strong className="tabular-nums text-brand-purple-dark">{brl(calc)}</strong>],
              ["Índice", contrato.indice ?? "Não informado"],
              ["Data-base", br(db)],
              ["Vigência", `até ${br(contrato.fim)} (não muda)`],
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
              O valor difere do calculado ({brl(calc)}). O termo registra "ajuste manual" com os dois valores e a justificativa é obrigatória.
            </Aviso>
          )}
          <Input
            type="textarea"
            id="reajuste-justificativa"
            label={manual ? "Justificativa (obrigatória)" : "Justificativa (opcional)"}
            placeholder="Ex.: negociação com a parte, arredondamento acordado…"
            value={justificativa}
            onChange={(e) => { setJustificativa(e.target.value); setErros({}); }}
            errors={erros.justificativa ? [erros.justificativa] : []}
          />
          <Aviso tom="info">
            Gera o {proximoAditivo(data.aditivos, contrato.id).numero}º Termo Aditivo (Reajuste Financeiro), código {proximoAditivo(data.aditivos, contrato.id).codigo}, já Aprovado e Assinado, e sobe o contrato para a versão {proximaVersao(contrato.versao, "minor")}.
          </Aviso>
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

function Aditivos({ data, contratoId, papel, onNovo, abas }: { data: ContratosData; contratoId: string; papel: Papel; onNovo?: () => void; abas: ReactNode }) {
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
        return [a.codigo, rotuloAditivo(a), a.contratoId, a.tipo, a.impacto, a.motivo, c ? parteDe(data, c)?.nome ?? "" : ""].some((s) => s.toLowerCase().includes(q));
      })
      .sort((a, b) => b.data.localeCompare(a.data) || b.numero - a.numero);
  }, [base, tipo, busca, data]);
  const pode = podeAditar(papel);

  const etiquetas = [
    ...(tipo ? [{ id: "tipo", label: `Tipo: ${tipo}`, onRemove: () => setTipo("") }] : []),
    ...(busca.trim() ? [{ id: "busca", label: `Busca: "${busca.trim()}"`, onRemove: () => setBusca("") }] : []),
  ];

  const exportar = () =>
    exportarPlanilha(
      "livro-de-aditivos",
      ["Código", "Termo", "Contrato", "Parte", "Tipo", "Data de celebração", "Nova vigência", "Novo valor", "Impacto", "Ajuste manual", "Aprovação", "Assinatura"],
      lista.map((a) => {
        const c = data.contratos.find((x) => x.id === a.contratoId);
        return [a.codigo, rotuloAditivo(a), a.contratoId, c ? parteDe(data, c)?.nome ?? "" : "", a.tipo, br(a.data), a.novaVigencia ? br(a.novaVigencia) : "", a.novoValor != null ? brl(a.novoValor) : "", a.impacto, a.ajusteManual ? `Calculado ${brl(a.ajusteManual.calculado)}; aplicado ${a.novoValor != null ? brl(a.novoValor) : ""}. ${a.ajusteManual.justificativa}` : "", APROVACAO[a.aprovacao].label, ASSINATURA[a.assinatura].label];
      }),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {abas}
        <div className="flex flex-wrap items-end gap-3 sm:ml-auto">
          <Input type="search" id="aditivo-busca" placeholder="Buscar código, contrato, parte ou impacto" leftIcon="fa-magnifying-glass" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full sm:w-72" inputClass="text-ellipsis" />
          <Input type="select" id="aditivo-filtro-tipo" label="Tipo" prompt="Todos os tipos" value={tipo} options={tipos.map((t) => ({ label: t, value: t }))} onChange={(v) => setTipo(v ?? "")} className="w-full sm:w-56" />
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
            {
              label: "Código",
              render: (a) => (
                <div>
                  <p className="font-bold text-brand-purple-dark whitespace-nowrap">{a.codigo}</p>
                  <p className="text-sm">{rotuloAditivo(a)}</p>
                </div>
              ),
            },
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
            { label: "Celebração", render: (a) => <span className="whitespace-nowrap">{br(a.data)}</span> },
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
            {
              label: "Impacto",
              render: (a) => (
                <div className="flex flex-col items-start gap-1">
                  <span className="text-sm">{a.impacto}</span>
                  {a.ajusteManual && <Tag item="Ajuste manual" variant="yellow" leftIcon="fa-pen" title={`Calculado ${brl(a.ajusteManual.calculado)}. ${a.ajusteManual.justificativa}`} />}
                </div>
              ),
            },
            { label: "Aprovação", render: (a) => <Selo s={APROVACAO[a.aprovacao]} /> },
            { label: "Assinatura", render: (a) => <Selo s={ASSINATURA[a.assinatura]} /> },
          ]}
        />
      )}
    </div>
  );
}
