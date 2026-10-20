/**
 * Gestão de Contratos — Torre de Controle (painel executivo).
 *
 * Somente leitura: nenhum botão age sobre um contrato. Cada indicador, barra
 * ou fase leva à Carteira (ou à Conformidade) já filtrada, onde a ação
 * acontece. Os números vêm de `healthScore()` e `indicadores()`, os mesmos que
 * a esteira da Carteira usa, então as contagens batem entre as telas.
 *
 * Feito na tela (componente novo, sem equivalente no Phoenix): o cartão do
 * Health Score com os pilares, os gráficos de barra em HTML/CSS (saúde por
 * prazo, carteira por categoria, pipeline das fases) e o quadro de run-rate.
 * O resto é `card`, `button`, `tag`, `modal`, `table` e `empty_state_card`.
 */
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { useState, type ReactNode } from "react";
import { Button } from "../components/Button.js";
import { Icon } from "../components/Icon.js";
import { cx } from "../components/Input.js";
import { EmptyStateCard } from "../components/Layout.js";
import { DrawerModal } from "../components/Overlay.js";
import { Tag } from "../components/Tag.js";
import {
  FAIXA, FASES, SCORE_PESOS, dossieOk, faixa, healthScore, indicadores, vigentes,
  type ContratosData, type Faixa, type Score,
} from "./gestao-de-contratos/model.js";
import { Barra, Bloco, ContratosShell, Kpi, ROTAS, Valor, papelDe, type Tom, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";

type Ir = (rota: string, controls?: Record<string, string>) => void;

/** Cor do score e de cada pilar: mesma régua do rótulo (≥85 verde, ≥65 âmbar, abaixo vermelho). */
const tomDe = (pct: number): Tom => (pct >= 85 ? "ok" : pct >= 65 ? "atencao" : "risco");
const TOM_SCORE: Record<Score["variant"], { tom: Tom; texto: string; fundo: string }> = {
  green: { tom: "ok", texto: "text-brand-green-dark", fundo: "bg-brand-green/10" },
  yellow: { tom: "atencao", texto: "text-yellow-dark", fundo: "bg-yellow/10" },
  red: { tom: "risco", texto: "text-red", fundo: "bg-red-light" },
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
  const papel = papelDe(context);
  const podeCriar = papel !== "diretoria" && papel !== "financeiro" && papel !== "aprovador";
  const score = healthScore(data);
  const ind = indicadores(data);
  const [explicado, setExplicado] = useState(context.controls.score === "explicado" && score != null);

  /** Navega mantendo a visão por papel. */
  const ir: Ir = (rota, controls = {}) => context.navigate(rota, { controls: { ...controls, ...(context.controls.papel ? { papel: context.controls.papel } : {}) } });

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
        <CartaoScore score={score} data={data} className="lg:col-span-2" onExplicar={() => setExplicado(true)} />
        <RunRate receitas={ind.receitas} despesas={ind.despesas} ativos={ind.ativos} ir={ir} />
      </div>

      <section aria-label="Indicadores" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Kpi titulo="Contratos Ativos" valor={ind.ativos} detalhe="Vigentes na carteira" icone="fa-file-contract" tom="info" onClick={() => ir(ROTAS.carteira, { monitoramento: "vigentes" })} />
        <Kpi titulo="Críticos ≤30d" valor={ind.criticos} detalhe="Vencidos ou a até 30 dias do fim" icone="fa-siren-on" tom={ind.criticos ? "risco" : "neutro"} onClick={() => ir(ROTAS.carteira, { monitoramento: "critico" })} />
        <Kpi titulo="Alerta 31–90d" valor={ind.alerta} detalhe="Terminam entre 31 e 90 dias" icone="fa-triangle-exclamation" tom={ind.alerta ? "atencao" : "neutro"} onClick={() => ir(ROTAS.carteira, { monitoramento: "alerta" })} />
        <Kpi titulo="Dossiê Completo" valor={`${ind.dossiePct}%`} detalhe="Vigentes com o checklist 100% conforme" icone="fa-folder-check" tom={ind.ativos ? tomDe(ind.dossiePct) : "neutro"} onClick={() => ir(ROTAS.dossie, { filtro: "pendentes" })} />
        <Kpi titulo="Assinados Digital" valor={`${ind.digitalPct}%`} detalhe="Vigentes com assinatura eletrônica" icone="fa-signature" tom={ind.ativos ? tomDe(ind.digitalPct) : "neutro"} onClick={() => ir(ROTAS.carteira)} />
        <Kpi
          titulo="Docs de Cobrança"
          valor={ind.docsCobranca}
          detalhe={ind.docsCobranca ? `${ind.docsPendentes} aguardando conferência` : "Nenhum documento no mês"}
          icone="fa-file-invoice-dollar"
          tom={ind.docsPendentes ? "atencao" : "neutro"}
          onClick={() => ir(ROTAS.cobranca)}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <SaudePorPrazo data={data} ir={ir} />
        <PorCategoria data={data} ir={ir} />
      </div>
      <Pipeline porFase={ind.porFase} ir={ir} />

      {score && <ModalScore show={explicado} score={score} data={data} onCancel={() => setExplicado(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Health Score                                                        */
/* ------------------------------------------------------------------ */

/** Quantos Vigentes atendem a cada pilar (para a frase "qual pilar puxou para baixo"). */
function contagens(data: ContratosData) {
  const vs = vigentes(data);
  return {
    vigencia: vs.filter((c) => ["regular", "alerta"].includes(faixa(c.fim))).length,
    dossie: vs.filter((c) => dossieOk(data, c.id)).length,
    digital: vs.filter((c) => c.assinadoDigital).length,
  };
}

const FALTA: Record<"vigencia" | "dossie" | "digital", string> = {
  vigencia: "vencidos ou a até 30 dias do fim",
  dossie: "com dossiê pendente",
  digital: "sem assinatura digital",
};

/** O pilar que mais perdeu pontos e o porquê, em uma linha. */
function piorPilar(score: Score, data: ContratosData) {
  const pior = [...score.pilares].sort((a, b) => b.peso - b.pontos - (a.peso - a.pontos))[0]!;
  const ok = contagens(data)[pior.id];
  const faltam = score.total - ok;
  return { pior, texto: `${pior.label} foi o pilar que mais puxou para baixo: ${pior.pontos} de ${pior.peso} pontos, com ${faltam} de ${score.total} Vigentes ${FALTA[pior.id]}.` };
}

function CartaoScore({ score, data, className, onExplicar }: { score: Score | null; data: ContratosData; className?: string; onExplicar: () => void }) {
  if (!score) {
    return (
      <Bloco titulo="Health Score" icone="fa-heart-pulse" className={className}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 rounded-xl border border-blue/20 bg-blue-light p-6">
          <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white text-3xl font-extrabold text-blue-dark">—</span>
          <div className="space-y-1">
            <p className="text-lg font-bold text-blue-dark">Sem contratos vigentes para calcular o score</p>
            <p className="text-sm text-brand-purple-dark/80">
              O score de 10 a 100 soma Vigência Segura ({SCORE_PESOS.vigencia}), Dossiê ({SCORE_PESOS.dossie}) e Formalização Digital ({SCORE_PESOS.digital}) sobre os contratos Vigentes. Ele aparece assim que o primeiro contrato for assinado.
            </p>
          </div>
        </div>
      </Bloco>
    );
  }
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
          <Tag item={score.label} variant={score.variant} />
        </div>
        <div className="flex-1 space-y-4">
          {score.pilares.map((p) => (
            <div key={p.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-bold text-brand-purple-dark">{p.label}</span>
                <span className="tabular-nums text-brand-purple-dark/70">
                  {p.pct}% · <strong className="text-brand-purple-dark">{p.pontos}</strong>/{p.peso} pts
                </span>
              </div>
              <Barra pct={p.pct} tom={tomDe(p.pct)} />
            </div>
          ))}
          <p className="text-sm text-brand-purple-dark/70">
            {score.vencidos > 0 ? `Penalidade de −${score.penalidade} por ${score.vencidos} contrato${score.vencidos === 1 ? "" : "s"} vencido${score.vencidos === 1 ? "" : "s"}. ` : "Sem penalidade: nenhum Vigente vencido. "}
            {piorPilar(score, data).texto}
          </p>
        </div>
      </div>
    </Bloco>
  );
}

function ModalScore({ show, score, data, onCancel }: { show: boolean; score: Score; data: ContratosData; onCancel: () => void }) {
  const piso = score.bruto - score.penalidade < 10;
  const conta = `${score.pilares.map((p) => p.pontos).join(" + ")} − ${score.penalidade} = ${score.score}`;
  const th = "px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50";
  const td = "px-3 py-3 border-t border-brand-purple-dark/10 tabular-nums";
  return (
    <DrawerModal id="modal-score" show={show} title="Entenda o Score" onCancel={onCancel} variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-6">
        <p className="text-brand-purple-dark/80">
          Cada pilar vale o percentual dos {score.total} contratos Vigentes que o atendem, vezes o peso (arredondado). Cada Vigente vencido tira {SCORE_PESOS.penalidadeVencido} pontos. O score fica entre 10 e 100.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-brand-purple-dark">
            <thead>
              <tr>
                <th className={th}>Pilar</th>
                <th className={cx(th, "text-right!")}>% dos Vigentes</th>
                <th className={cx(th, "text-right!")}>Peso</th>
                <th className={cx(th, "text-right!")}>Pontos</th>
              </tr>
            </thead>
            <tbody>
              {score.pilares.map((p) => (
                <tr key={p.id}>
                  <td className={cx(td, "font-bold")}>{p.label}</td>
                  <td className={cx(td, "text-right")}>{p.pct}%</td>
                  <td className={cx(td, "text-right")}>{p.peso}</td>
                  <td className={cx(td, "text-right font-bold")}>{p.pontos}</td>
                </tr>
              ))}
              <tr>
                <td className={cx(td, "font-bold text-red")}>Penalidade</td>
                <td className={cx(td, "text-right")} colSpan={2}>
                  {score.vencidos} vencido{score.vencidos === 1 ? "" : "s"} × {SCORE_PESOS.penalidadeVencido}
                </td>
                <td className={cx(td, "text-right font-bold text-red")}>−{score.penalidade}</td>
              </tr>
              <tr>
                <td className={cx(td, "font-extrabold")}>Score</td>
                <td className={cx(td, "text-right text-brand-purple-dark/70")} colSpan={2}>{conta}</td>
                <td className={cx(td, "text-right text-xl font-extrabold", TOM_SCORE[score.variant].texto)}>{score.score}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {piso && <p className="text-sm text-brand-purple-dark/70">A conta deu {score.bruto - score.penalidade}; o score não fica abaixo de 10.</p>}
        <div className="flex gap-3 rounded-xl border border-brand-purple-dark/10 bg-brand-purple-dark/5 p-4 text-sm text-brand-purple-dark/80">
          <Icon name="fa-arrow-trend-down" className="mt-0.5 text-brand-blue" />
          <p>{piorPilar(score, data).texto}</p>
        </div>
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
/* Gráficos                                                            */
/* ------------------------------------------------------------------ */

function SemContratos() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-blue-light p-8 text-center text-blue-dark">
      <Icon name="fa-chart-simple" className="text-3xl" />
      <p className="font-bold">Sem Contratos</p>
    </div>
  );
}

/** Uma barra horizontal clicável: rótulo, contagem e largura proporcional ao maior valor. */
function BarraH({ rotulo, n, max, cor, onClick, extra }: { rotulo: ReactNode; n: number; max: number; cor: string; onClick: () => void; extra?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="group grid w-full grid-cols-[8rem_1fr_2.5rem] items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-brand-purple-dark/5">
      <span className="truncate text-sm font-bold text-brand-purple-dark">{rotulo}</span>
      <span className="h-6 rounded-md bg-brand-purple-dark/5">
        <span className={cx("block h-6 rounded-md transition-all", cor, n === 0 && "opacity-0")} style={{ width: `${max ? (n / max) * 100 : 0}%` }} />
      </span>
      <span className="text-right font-extrabold tabular-nums text-brand-purple-dark">
        {n}
        {extra}
      </span>
    </button>
  );
}

/** Cor fixa de cada faixa no gráfico (Vencido e Crítico em vermelho, o vencido mais escuro). */
const PRAZO: { id: Faixa; cor: string; destino: (ir: Ir) => void }[] = [
  { id: "vencido", cor: "bg-red-dark", destino: (ir) => ir(ROTAS.carteira, { monitoramento: "critico" }) },
  { id: "critico", cor: "bg-red", destino: (ir) => ir(ROTAS.carteira, { monitoramento: "critico" }) },
  { id: "alerta", cor: "bg-yellow", destino: (ir) => ir(ROTAS.carteira, { monitoramento: "alerta" }) },
  // A Carteira não tem filtro "Regular": o Radar de Vigência tem.
  { id: "regular", cor: "bg-brand-green", destino: (ir) => ir(ROTAS.vigencia, { aba: "radar", faixa: "regular" }) },
];

function SaudePorPrazo({ data, ir }: { data: ContratosData; ir: Ir }) {
  const vs = vigentes(data);
  const n = (f: Faixa) => vs.filter((c) => faixa(c.fim) === f).length;
  const max = Math.max(0, ...PRAZO.map((p) => n(p.id)));
  return (
    <Bloco titulo="Saúde por prazo" icone="fa-hourglass-half">
      <p className="-mt-2 text-sm text-brand-purple-dark/60">Contratos Vigentes pela distância até o fim da vigência.</p>
      {vs.length === 0 ? (
        <SemContratos />
      ) : (
        <div className="space-y-1">
          {PRAZO.map((p) => (
            <BarraH key={p.id} rotulo={FAIXA[p.id].label} n={n(p.id)} max={max} cor={p.cor} onClick={() => p.destino(ir)} />
          ))}
        </div>
      )}
    </Bloco>
  );
}

function PorCategoria({ data, ir }: { data: ContratosData; ir: Ir }) {
  const grupos = Object.entries(
    data.contratos.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.categoria]: (acc[c.categoria] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const max = Math.max(0, ...grupos.map((g) => g[1]));
  return (
    <Bloco titulo="Carteira por categoria" icone="fa-chart-bar">
      <p className="-mt-2 text-sm text-brand-purple-dark/60">Todos os contratos da carteira, em qualquer fase.</p>
      {grupos.length === 0 ? (
        <SemContratos />
      ) : (
        <div className="space-y-1">
          {grupos.map(([cat, n]) => (
            <BarraH key={cat} rotulo={cat} n={n} max={max} cor="bg-brand-blue" onClick={() => ir(ROTAS.carteira, { busca: cat })} />
          ))}
        </div>
      )}
    </Bloco>
  );
}

/** As 7 fases como na esteira da Carteira: fase e título à esquerda, contagem à direita. */
function Pipeline({ porFase, ir }: { porFase: Record<string, number>; ir: Ir }) {
  const total = Object.values(porFase).reduce((s, n) => s + n, 0);
  return (
    <Bloco titulo="Pipeline das 7 fases" icone="fa-diagram-next">
      {total === 0 ? (
        <SemContratos />
      ) : (
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
      )}
    </Bloco>
  );
}
