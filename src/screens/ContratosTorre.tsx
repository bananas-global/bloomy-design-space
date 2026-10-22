/**
 * Gestão de Contratos — Torre de Controle (painel executivo, FR-007 a FR-014).
 *
 * Somente leitura: nenhum botão age sobre um contrato. Cada indicador, barra
 * ou fase leva à Carteira (ou ao Dossiê / Cobrança) já filtrada, onde a ação
 * acontece (FR-013). Os números vêm de `healthScore()` e `indicadores()`, os
 * mesmos que a esteira da Carteira usa, então as contagens batem entre as telas.
 * Base do painel: contratos não encerrados (RN-015); as taxas são sobre o total
 * cadastrado (RN-021).
 *
 * Feito na tela (componente novo, sem equivalente no Phoenix): o cartão do
 * Health Score com os pilares, os gráficos de barra em HTML/CSS (saúde por
 * prazo, carteira por categoria, pipeline das fases) e o quadro de run-rate.
 * O resto é `card`, `button`, `tag`, `modal`, `table` e `empty_state_card`.
 */
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "../components/Button.js";
import { Icon } from "../components/Icon.js";
import { cx } from "../components/Input.js";
import { EmptyStateCard } from "../components/Layout.js";
import { DrawerModal } from "../components/Overlay.js";
import { Table } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import {
  FASES, SCORE_PESOS, aditivosDe, br, competencia, indicadores, healthScore, parteDe, ultimaCobranca,
  type ContratosData, type Score,
} from "./gestao-de-contratos/model.js";
import { Barra, Bloco, ContratosShell, Kpi, ROTAS, Valor, irFicha, papelDe, type Tom, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";

type Ir = (rota: string, controls?: Record<string, string>) => void;

/** Número com vírgula decimal: 53,8 · 6,3. */
const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const pct = (n: number) => `${num(n)}%`;

/** Cor de cada pilar e taxa: mesma régua do rótulo do score (≥85 verde, ≥65 âmbar, abaixo vermelho). */
const tomDe = (p: number): Tom => (p >= 85 ? "ok" : p >= 65 ? "atencao" : "risco");
/** Cor do score (RN-019, RN-020): verde, âmbar, vermelho; azul na base vazia. */
const TOM_SCORE: Record<Score["variant"], { tom: Tom; texto: string; fundo: string }> = {
  green: { tom: "ok", texto: "text-brand-green-dark", fundo: "bg-brand-green/10" },
  yellow: { tom: "atencao", texto: "text-yellow-dark", fundo: "bg-yellow/10" },
  red: { tom: "risco", texto: "text-red", fundo: "bg-red-light" },
  blue: { tom: "info", texto: "text-blue-dark", fundo: "bg-blue-light" },
};

export function ContratosTorre({ context }: ScreenProps) {
  return (
    <ContratosShell
      context={context}
      secao="torre"
      titulo="Torre de Controle"
      subtitulo="A saúde da carteira num painel de leitura. Clique num indicador para abrir a lista já filtrada."
    >
      {(data) => <Torre key={JSON.stringify(context.controls)} data={data} context={context} />}
    </ContratosShell>
  );
}

function Torre({ data, context }: { data: ContratosData; context: ScenarioContext }) {
  const papel = papelDe(context, "solicitante");
  const podeCriar = papel !== "diretoria" && papel !== "financeiro" && papel !== "aprovador";
  const score = healthScore(data);
  const ind = indicadores(data);
  const [explicado, setExplicado] = useState(context.controls.score === "explicado");

  /** Navega sem levar a visão por papel: cada tela abre no papel padrão dela. */
  const ir: Ir = (rota, controls = {}) => context.navigate(rota, { controls });

  return (
    <div className="space-y-6">
      {data.contratos.length === 0 && (
        <Bloco>
          <EmptyStateCard icon="fa-tower-observation" text="Ainda não há contratos para acompanhar">
            <p>O painel se preenche sozinho conforme os contratos entram na carteira e chegam à vigência.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" leftIcon="fa-folder-open" onClick={() => ir(ROTAS.carteira)}>Ir para a Carteira</Button>
              {podeCriar && <Button leftIcon="fa-plus" onClick={() => ir(ROTAS.novo)}>Novo Contrato</Button>}
            </div>
          </EmptyStateCard>
        </Bloco>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <CartaoScore score={score} className="lg:col-span-2" onExplicar={() => setExplicado(true)} />
        <RunRate receitas={ind.receitas} despesas={ind.despesas} ativos={ind.ativos} ir={ir} />
      </div>

      {/* Os 6 KPIs (FR-009) e o drill-down de cada um (FR-013). */}
      <section aria-label="Indicadores" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Kpi
          titulo="Contratos Ativos"
          valor={ind.ativos}
          detalhe={`de ${ind.total} cadastrados (${pct(ind.ativosPct)})`}
          icone="fa-file-contract"
          tom="info"
          onClick={() => ir(ROTAS.carteira, { status: "vigente" })}
        />
        <Kpi titulo="Críticos ≤30d" valor={ind.criticos} detalhe="Vencidos ou a até 30 dias do fim" icone="fa-siren-on" tom={ind.criticos ? "risco" : "neutro"} onClick={() => ir(ROTAS.carteira, { monitoramento: "critico" })} />
        <Kpi titulo="Alerta 31–90d" valor={ind.alerta} detalhe="Terminam entre 31 e 90 dias" icone="fa-triangle-exclamation" tom={ind.alerta ? "atencao" : "neutro"} onClick={() => ir(ROTAS.carteira, { monitoramento: "alerta" })} />
        <Kpi
          titulo="Dossiê Completo"
          valor={pct(ind.dossiePct)}
          detalhe={`${ind.dossieConformes} de ${ind.total} com o checklist 100% conforme`}
          icone="fa-folder-check"
          tom={ind.total ? tomDe(ind.dossiePct) : "neutro"}
          onClick={() => ir(ROTAS.dossie)}
        />
        <Kpi
          titulo="Assinados Digital"
          valor={pct(ind.digitalPct)}
          detalhe={`${ind.assinados} de ${ind.total} assinados digitalmente`}
          icone="fa-signature"
          tom={ind.total ? tomDe(ind.digitalPct) : "neutro"}
          onClick={() => ir(ROTAS.carteira, { assinatura: "assinado" })}
        />
        <Kpi
          titulo="Docs de Cobrança"
          valor={ind.docsAprovados}
          detalhe={`aprovados · ${ind.docsPendentes} pendente${ind.docsPendentes === 1 ? "" : "s"} de conferência`}
          icone="fa-file-invoice-dollar"
          tom={ind.docsPendentes ? "atencao" : "neutro"}
          onClick={() => ir(ROTAS.cobranca)}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <SaudePorPrazo ind={ind} ir={ir} />
        <PorCategoria porCategoria={ind.porCategoria} ir={ir} />
      </div>
      <Pipeline porFase={ind.porFase} ir={ir} />
      <Complementares data={data} ind={ind} ir={ir} abrir={(id) => irFicha(context, id, "torre")} />

      <ModalScore show={explicado} score={score} onCancel={() => setExplicado(false)} />
    </div>
  );
}

type Indicadores = ReturnType<typeof indicadores>;

/* ------------------------------------------------------------------ */
/* Health Score                                                        */
/* ------------------------------------------------------------------ */

const FALTA: Record<"vigencia" | "dossie" | "digital", string> = {
  vigencia: "sem vigência regular (mais de 90 dias)",
  dossie: "com dossiê pendente",
  digital: "sem assinatura digital concluída",
};

/** O pilar que mais perdeu pontos e o porquê, em uma linha. */
function piorPilar(score: Score) {
  const pior = [...score.pilares].sort((a, b) => b.peso - b.pontos - (a.peso - a.pontos))[0]!;
  return `${pior.label} foi o pilar que mais puxou para baixo: ${num(pior.pontos)} de ${pior.peso} pontos, com ${score.total - pior.n} de ${score.total} contratos da base ${FALTA[pior.id]}.`;
}

function CartaoScore({ score, className, onExplicar }: { score: Score; className?: string; onExplicar: () => void }) {
  const cor = TOM_SCORE[score.variant];
  return (
    <Bloco
      titulo="Health Score"
      icone="fa-heart-pulse"
      className={className}
      acoes={<Button variant="tint" size="small" leftIcon="fa-circle-question" onClick={onExplicar}>Entenda o Score</Button>}
    >
      <div className="flex flex-col md:flex-row gap-6">
        <div className={cx("flex shrink-0 flex-col items-center justify-center gap-2 rounded-2xl px-8 py-6", cor.fundo)}>
          <span className={cx("text-6xl font-extrabold tabular-nums", cor.texto)}>{score.score}</span>
          <span className="text-xs font-bold text-brand-purple-dark/50">de 100</span>
          <span className={cx("text-center font-bold", cor.texto)}>{score.label}</span>
          {/* Selo da RN-019 / RN-020. */}
          <Tag item={score.selo} variant={score.variant} />
        </div>
        <div className="flex-1 space-y-4">
          {score.vazio ? (
            <p className="text-sm text-brand-purple-dark/80">
              Ainda não há contratos na base. O score soma Vigência Segura ({SCORE_PESOS.vigencia}), Dossiê ({SCORE_PESOS.dossie}) e Formalização Digital ({SCORE_PESOS.digital}) sobre os contratos não encerrados e desconta {SCORE_PESOS.penalidadeCriticos} × críticos ÷ N. Ele passa a ser calculado assim que o primeiro contrato entrar na carteira.
            </p>
          ) : (
            <>
              {score.pilares.map((p) => (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-bold text-brand-purple-dark">{p.label}</span>
                    <span className="tabular-nums text-brand-purple-dark/70">
                      {p.pct}% · <strong className="text-brand-purple-dark">{num(p.pontos)}</strong>/{p.peso} pts
                    </span>
                  </div>
                  <Barra pct={p.pct} tom={tomDe(p.pct)} />
                </div>
              ))}
              <p className="text-sm text-brand-purple-dark/70">
                {score.criticos > 0
                  ? `Penalidade de −${num(score.penalidade)} por ${score.criticos} contrato${score.criticos === 1 ? "" : "s"} crítico${score.criticos === 1 ? "" : "s"} (≤30 dias ou vencido${score.criticos === 1 ? "" : "s"}). `
                  : "Sem penalidade: nenhum contrato crítico. "}
                {piorPilar(score)}
              </p>
            </>
          )}
        </div>
      </div>
    </Bloco>
  );
}

/** "Entenda o Score" (FR-011): a parcela real de cada pilar e a penalidade; a soma bate com o score. */
function ModalScore({ show, score, onCancel }: { show: boolean; score: Score; onCancel: () => void }) {
  const liquido = Math.round((score.bruto - score.penalidade) * 10) / 10;
  const limitado = liquido < 10 || liquido > 100;
  const conta = `${score.pilares.map((p) => num(p.pontos)).join(" + ")} − ${num(score.penalidade)} = ${num(liquido)}`;
  const th = "px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50";
  const td = "px-3 py-3 border-t border-brand-purple-dark/10 tabular-nums";
  return (
    <DrawerModal id="modal-score" show={show} title="Entenda o Score" onCancel={onCancel} variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-6">
        <p className="text-brand-purple-dark/80">
          Score = {SCORE_PESOS.vigencia} × regulares ÷ N + {SCORE_PESOS.dossie} × dossiês 100% conformes ÷ N + {SCORE_PESOS.digital} × assinados ÷ N − {SCORE_PESOS.penalidadeCriticos} × críticos ÷ N.
          N é a base do painel: os contratos não encerrados{score.vazio ? "" : ` (${score.total})`}. O resultado é arredondado e fica entre 10 e 100.
        </p>
        {score.vazio ? (
          <div className="flex gap-3 rounded-xl border border-blue/20 bg-blue-light p-4 text-sm text-blue-dark">
            <Icon name="fa-circle-info" className="mt-0.5" />
            <p>Sem contratos na base, o score é 100: "{score.label}", selo "{score.selo}", em azul.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-brand-purple-dark">
              <thead>
                <tr>
                  <th className={th}>Parcela</th>
                  <th className={cx(th, "text-right!")}>Contratos</th>
                  <th className={cx(th, "text-right!")}>Peso</th>
                  <th className={cx(th, "text-right!")}>Pontos</th>
                </tr>
              </thead>
              <tbody>
                {score.pilares.map((p) => (
                  <tr key={p.id}>
                    <td className={cx(td, "font-bold")}>{p.label}</td>
                    <td className={cx(td, "text-right")}>{p.n} de {score.total} ({p.pct}%)</td>
                    <td className={cx(td, "text-right")}>{p.peso}</td>
                    <td className={cx(td, "text-right font-bold")}>{num(p.pontos)}</td>
                  </tr>
                ))}
                <tr>
                  <td className={cx(td, "font-bold text-red")}>Penalidade (críticos)</td>
                  <td className={cx(td, "text-right")}>{score.criticos} de {score.total}</td>
                  <td className={cx(td, "text-right")}>−{SCORE_PESOS.penalidadeCriticos}</td>
                  <td className={cx(td, "text-right font-bold text-red")}>−{num(score.penalidade)}</td>
                </tr>
                <tr>
                  <td className={cx(td, "font-extrabold")}>Score</td>
                  <td className={cx(td, "text-right text-brand-purple-dark/70")} colSpan={2}>{conta}</td>
                  <td className={cx(td, "text-right text-xl font-extrabold", TOM_SCORE[score.variant].texto)}>{score.score}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {!score.vazio && (
          <p className="text-sm text-brand-purple-dark/70">
            {limitado ? `A conta deu ${num(liquido)}; o score fica entre 10 e 100.` : `${num(liquido)} arredondado dá ${score.score}.`} {score.label}: {score.selo}.
          </p>
        )}
        {!score.vazio && (
          <div className="flex gap-3 rounded-xl border border-brand-purple-dark/10 bg-brand-purple-dark/5 p-4 text-sm text-brand-purple-dark/80">
            <Icon name="fa-arrow-trend-down" className="mt-0.5 text-brand-blue" />
            <p>{piorPilar(score)}</p>
          </div>
        )}
        <div className={RODAPE_DRAWER}>
          <Button variant="ghost" onClick={onCancel}>Fechar</Button>
        </div>
      </div>
    </DrawerModal>
  );
}

/* ------------------------------------------------------------------ */
/* Run-rate                                                            */
/* ------------------------------------------------------------------ */

function RunRate({ receitas, despesas, ativos, ir }: { receitas: number; despesas: number; ativos: number; ir: Ir }) {
  const linha = (rotulo: string, icone: string, cor: string, valor: number, filtro?: string) => (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-brand-purple-dark/10 last:border-0">
      <span className="flex items-center gap-2 font-bold text-brand-purple-dark">
        <Icon name={icone} className={cor} />
        {rotulo}
      </span>
      <span className="flex items-center gap-2">
        <Valor valor={valor} className="font-bold text-brand-purple-dark" />
        {filtro && (
          <Button size="small" variant="ghost" title={`Ver ${rotulo.toLowerCase()} na carteira`} aria-label={`Ver ${rotulo.toLowerCase()} na carteira`} onClick={() => ir(ROTAS.carteira, { monitoramento: filtro })}>
            <Icon name="fa-arrow-right" />
          </Button>
        )}
      </span>
    </div>
  );
  return (
    <Bloco titulo="Run-rate mensal" icone="fa-chart-line">
      <p className="-mt-2 text-sm text-brand-purple-dark/60">Soma dos valores mensais dos {ativos} contrato(s) Vigente(s).</p>
      <div>
        {linha("Receitas", "fa-arrow-down-left", "text-brand-green-dark", receitas, "receita")}
        {linha("Despesas", "fa-arrow-up-right", "text-orange", despesas, "despesa")}
        {linha("Saldo", "fa-scale-balanced", "text-brand-blue", receitas - despesas)}
      </div>
    </Bloco>
  );
}

/* ------------------------------------------------------------------ */
/* Gráficos (FR-012)                                                   */
/* ------------------------------------------------------------------ */

/** Uma barra horizontal clicável: rótulo, contagem e largura proporcional ao maior valor. */
function BarraH({ rotulo, n, max, cor, onClick, extra }: { rotulo: ReactNode; n: number; max: number; cor: string; onClick?: () => void; extra?: ReactNode }) {
  // `div` com papel de botão: o `extra` pode trazer o olho do valor mascarado, e botão não pode conter botão.
  return (
    <div
      {...(onClick && {
        role: "button",
        tabIndex: 0,
        onClick,
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick();
          }
        },
      })}
      className={cx("group grid w-full grid-cols-[9rem_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 text-left", onClick && "cursor-pointer hover:bg-brand-purple-dark/5")}
    >
      <span className="truncate text-sm font-bold text-brand-purple-dark">{rotulo}</span>
      <span className="h-6 rounded-md bg-brand-purple-dark/5">
        <span className={cx("block h-6 rounded-md transition-all", cor, n === 0 && "opacity-0")} style={{ width: `${max ? (n / max) * 100 : 0}%` }} />
      </span>
      <span className="flex items-center justify-end gap-3 text-right font-extrabold tabular-nums text-brand-purple-dark">
        {extra}
        <span className="w-8">{n}</span>
      </span>
    </div>
  );
}

/**
 * Saúde da carteira por prazos (FR-012): Seguro (> 90d), Alerta (31–90d) e
 * Crítico (≤ 30d, inclui vencidos) sobre a base do painel (RN-015), mais os CLT
 * em experiência (RN-022), que se sobrepõem às faixas.
 */
function SaudePorPrazo({ ind, ir }: { ind: Indicadores; ir: Ir }) {
  const barras: { id: string; rotulo: string; n: number; cor: string; destino: () => void }[] = [
    // A Carteira não tem filtro "Regular": o Radar de Vigência tem.
    { id: "seguro", rotulo: "Seguro (> 90d)", n: ind.regulares, cor: "bg-brand-green", destino: () => ir(ROTAS.vigencia, { aba: "radar", faixa: "regular" }) },
    { id: "alerta", rotulo: "Alerta (31–90d)", n: ind.alerta, cor: "bg-yellow", destino: () => ir(ROTAS.carteira, { monitoramento: "alerta" }) },
    { id: "critico", rotulo: "Crítico (≤ 30d)", n: ind.criticos, cor: "bg-red", destino: () => ir(ROTAS.carteira, { monitoramento: "critico" }) },
    { id: "experiencia", rotulo: "CLT em experiência", n: ind.cltExperiencia, cor: "bg-brand-blue", destino: () => ir(ROTAS.vigencia, { aba: "radar", faixa: "experiencia" }) },
  ];
  const max = Math.max(0, ...barras.map((b) => b.n));
  return (
    <Bloco titulo="Saúde da carteira por prazos" icone="fa-hourglass-half">
      <p className="-mt-2 text-sm text-brand-purple-dark/60">Contratos não encerrados pela distância até o fim da vigência. Sem data de fim conta como Seguro.</p>
      <div className="space-y-1">
        {barras.map((b) => (
          <BarraH key={b.id} rotulo={b.rotulo} n={b.n} max={max} cor={b.cor} onClick={b.destino} />
        ))}
      </div>
    </Bloco>
  );
}

/** Carteira por categoria (RN-072): quantidade e valor base de todos os contratos, em qualquer status. */
function PorCategoria({ porCategoria, ir }: { porCategoria: Indicadores["porCategoria"]; ir: Ir }) {
  const max = Math.max(0, ...porCategoria.map((g) => g.qtd));
  return (
    <Bloco titulo="Carteira por categoria" icone="fa-chart-bar">
      <p className="-mt-2 text-sm text-brand-purple-dark/60">Todos os contratos, em qualquer status: quantidade e soma do valor base mensal. Diferente do run-rate, que soma só os Vigentes.</p>
      <div className="space-y-1">
        {porCategoria.length === 0 ? (
          <BarraH rotulo="Sem Contratos" n={0} max={0} cor="bg-brand-blue" extra={<Valor valor={0} className="font-semibold text-brand-purple-dark/70" />} />
        ) : (
          porCategoria.map((g) => (
            <BarraH
              key={g.categoria}
              rotulo={g.categoria}
              n={g.qtd}
              max={max}
              cor="bg-brand-blue"
              extra={<Valor valor={g.valor} className="font-semibold text-brand-purple-dark/70" />}
              onClick={() => ir(ROTAS.carteira, { busca: g.categoria })}
            />
          ))
        )}
      </div>
    </Bloco>
  );
}

/** As 7 fases como na esteira da Carteira (RN-024): fase e título à esquerda, contagem à direita. */
function Pipeline({ porFase, ir }: { porFase: Indicadores["porFase"]; ir: Ir }) {
  return (
    <Bloco titulo="Pipeline das 7 fases" icone="fa-diagram-next">
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {FASES.map((f) => {
          const n = porFase[f.id] ?? 0;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => ir(ROTAS.carteira, { fase: f.id })}
              title={`Ver na Carteira os contratos em ${f.label}`}
              className="flex items-center justify-between gap-3 rounded-2xl bg-brand-purple-dark/5 p-4 text-left transition hover:ring-2 hover:ring-brand-blue/30"
            >
              <span className="min-w-0">
                <span className="block text-xs font-bold text-brand-purple-dark/50">
                  <Icon name={f.icon} className="mr-1" /> Fase {f.n}
                </span>
                <span className="mt-1 block font-bold leading-tight text-brand-purple-dark">{f.label}</span>
              </span>
              <span className={cx("shrink-0 text-3xl font-extrabold tabular-nums", n ? "text-brand-blue-dark" : "text-brand-purple-dark/20")}>{n}</span>
            </button>
          );
        })}
      </div>
    </Bloco>
  );
}

/* ------------------------------------------------------------------ */
/* Indicadores complementares (FR-014)                                 */
/* ------------------------------------------------------------------ */

/**
 * Saldo de recesso PJ (RN-023), CLT em experiência (RN-022), taxa de aditivos
 * aprovados (RN-021) e, por contrato, a quantidade de aditivos e o último
 * documento de cobrança. Clicar na linha abre a ficha (só leitura aqui).
 */
function Complementares({ data, ind, ir, abrir }: { data: ContratosData; ind: Indicadores; ir: Ir; abrir: (id: string) => void }) {
  const linhas = [...data.contratos].sort((a, b) => a.id.localeCompare(b.id));
  return (
    <Bloco
      titulo="Indicadores complementares"
      icone="fa-list-check"
      acoes={<Button variant="ghost" size="small" rightIcon="fa-arrow-right" onClick={() => ir(ROTAS.vigencia, { aba: "aditivos" })}>Ver aditivos</Button>}
    >
      {/* Um cartão por indicador, no mesmo estilo dos cartões das fases. */}
      <div className="grid gap-3 md:grid-cols-3">
        {([
          ["Saldo de recesso PJ", "fa-umbrella-beach", `${num(ind.saldoRecesso)} dia${ind.saldoRecesso === 1 ? "" : "s"}`, "Teto de 24 dias/ano por contrato (Cláusula 7ª)"],
          ["CLT em período de experiência", "fa-id-badge", `${ind.cltExperiencia} contrato${ind.cltExperiencia === 1 ? "" : "s"}`, "Até 90 dias (45 + 45)"],
          ["Taxa de aditivos aprovados", "fa-file-circle-check", pct(ind.taxaAditivos), `${ind.aditivosAprovados} de ${ind.totalAditivos} aditivos`],
        ] as const).map(([rotulo, icone, valor, detalhe]) => (
          <div key={rotulo} className="rounded-2xl bg-brand-purple-dark/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">
              <Icon name={icone} className="mr-1" /> {rotulo}
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-brand-purple-dark">{valor}</p>
            <p className="text-sm text-brand-purple-dark/60">{detalhe}</p>
          </div>
        ))}
      </div>
      {linhas.length > 0 && (
        <Table
          id="torre-por-contrato"
          rows={linhas}
          rowId={(c) => c.id}
          rowClick={(c) => abrir(c.id)}
          col={[
            {
              label: "Contrato",
              render: (c) => (
                <div>
                  <p className="font-bold text-brand-purple-dark whitespace-nowrap">{c.id}</p>
                  <p className="text-sm">{parteDe(data, c)?.nome}</p>
                </div>
              ),
            },
            { label: "Aditivos", render: (c) => <span className="tabular-nums">{aditivosDe(data, c.id).length}</span> },
            {
              label: "Último documento de cobrança",
              render: (c) => {
                const b = ultimaCobranca(data, c.id);
                if (!b) return <span className="text-sm text-brand-purple-dark/50">Nenhum documento</span>;
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold whitespace-nowrap">{b.codigo}</span>
                    <span className="text-sm">{b.tipo} · {competencia(b.competencia)}{b.vencimento ? ` · vence ${br(b.vencimento)}` : ""}</span>
                    <Tag item={b.conferencia === "aprovado" ? "Aprovado" : "Pendente de conferência"} variant={b.conferencia === "aprovado" ? "green" : "yellow"} />
                  </div>
                );
              },
            },
          ]}
        />
      )}
    </Bloco>
  );
}
