/**
 * Solicitações de melhoria — aba Painel executivo, organizada pelas perguntas de
 * quem abre a tela, da mais urgente para a mais estratégica:
 *
 * 1. Precisa de atenção — o que está parado, e por quê (PMO; a Tech vê a dela).
 * 2. Saúde do fluxo — tempo médio por etapa contra o prazo, e entradas × saídas.
 * 3. Valor entregue — capacidade liberada, concluídas, sem desenvolvimento, lead time.
 * 4. Onde dói — unidades × macroprocessos pelo número de pessoas afetadas.
 * 5. Fila do backlog — com a espera e o esforço, e a carga da Tech.
 *
 * Período e unidade filtram tudo. As SMs da base cobrem o mês corrente; os meses
 * anteriores vêm do consolidado mensal (`MonthAgg`).
 *
 * `card/1`, `inside_card/1`, `table/1`, `tag/1`, `radio_selector/1` e `input/1`.
 * Os gráficos (barras por etapa, entradas × saídas e o mapa de calor) são novos:
 * não há componente de gráfico no sistema.
 */
import { useState, type ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { RadioSelector } from "../../components/Choice.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Header, InsideCard } from "../../components/Layout.js";
import { SimpleTable, Table } from "../../components/Table.js";
import { Tag } from "../../components/Tag.js";
import type { MonthAgg } from "./fixtures.js";
import {
  L, SLA_DAYS, STATUS, USERS, daysFromToday, daysInStage, isClosed, lastMonths, monthLabel, monthOf, opts, plural, prioRank, scoreOf, stageTimes,
  type Role, type Sm, type StageId,
} from "./model.js";
import { reachText } from "./Afetados.js";
import { PrioTag, StageTag, cx } from "./parts.js";

type Period = "30" | "90" | "365";
const PERIOD_MONTHS: Record<Period, number> = { "30": 1, "90": 3, "365": 12 };
const PERIOD_LABEL: Record<Period, string> = { "30": "no último mês", "90": "nos últimos 3 meses", "365": "nos últimos 12 meses" };

type Stage = keyof typeof SLA_DAYS;
const STAGES = Object.keys(SLA_DAYS) as Stage[];

const noDev = (s: Sm) => s.routes.includes("processo") && !s.routes.includes("dev") && s.subpath === "sem";

export function Painel({ sms: all, monthly, role, onOpen }: { sms: Sm[]; monthly: MonthAgg[]; role: Role; onOpen: (s: Sm) => void }) {
  const [period, setPeriod] = useState<Period>("90");
  const [unit, setUnit] = useState("");
  const tech = role === "tech";

  // Excluída não conta em nada: foi aberta por engano, duplicada ou de teste.
  const sms = all.filter((s) => s.status !== "excluida" && (!unit || s.unit === unit));
  const agg = monthly.filter((m) => !unit || m.unit === unit);
  const months = monthsOf(sms, agg, lastMonths(Math.max(6, PERIOD_MONTHS[period])));
  const inPeriod = months.slice(-PERIOD_MONTHS[period]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <RadioSelector
          label="Período"
          field={{ id: "sm_panel_period", name: "sm_panel_period", value: period }}
          radio={[{ value: "30", label: "30 dias" }, { value: "90", label: "90 dias" }, { value: "365", label: "12 meses" }]}
          onChange={(e) => setPeriod(e.target.value as Period)}
        />
        <Input type="select" id="sm_panel_unit" label="Unidade" prompt="Todas as unidades" options={opts(L.units)} value={unit} className="min-w-60" onChange={(v) => setUnit(v ?? "")} />
      </div>

      <Attention sms={sms} role={role} onOpen={onOpen} />

      <div className="grid gap-6 xl:grid-cols-2">
        <StageTimes sms={sms} />
        <InOut months={months} period={period} />
      </div>

      {!tech && <Value sms={sms} months={inPeriod} period={period} onOpen={onOpen} />}
      {!tech && <WherePain sms={sms} onOpen={onOpen} />}

      <Queue sms={sms} onOpen={onOpen} />
    </div>
  );
}

/* ============================================================
   Séries mensais: consolidado + base atual
   ============================================================ */

type MonthRow = { month: string; opened: number; concluded: number; rejected: number; hours: number; noDev: number; leadDays: number };

function monthsOf(sms: Sm[], agg: MonthAgg[], months: string[]): MonthRow[] {
  return months.map((month) => {
    const a = agg.filter((m) => m.month === month);
    const sum = (k: keyof Omit<MonthAgg, "month" | "unit">) => a.reduce((t, m) => t + m[k], 0);
    const done = sms.filter((s) => s.status === "concluida" && s.closedAt && monthOf(s.closedAt) === month);
    return {
      month,
      opened: sum("opened") + sms.filter((s) => monthOf(s.createdAt) === month).length,
      concluded: sum("concluded") + done.length,
      rejected: sum("rejected") + sms.filter((s) => s.status === "rejeitada" && monthOf(s.createdAt) === month).length,
      hours: sum("hours") + done.reduce((t, s) => t + (Number(s.gainHours) || 0), 0),
      noDev: sum("noDev") + done.filter(noDev).length,
      leadDays: sum("leadDays") + done.reduce((t, s) => t + (daysFromToday(s.closedAt) - daysFromToday(s.createdAt)), 0),
    };
  });
}

/* ============================================================
   1. Precisa de atenção
   ============================================================ */

type Reason = { text: string; tone: "red" | "orange" | "blue"; icon: string; weight: number };

const TONE_TAG = { red: "red", orange: "orange", blue: "light-blue" } as const;

/** Por que cada SM precisa de atenção, do ponto de vista do papel. */
function reasonsOf(s: Sm, role: Role): Reason[] {
  if (isClosed(s)) return [];
  const out: Reason[] = [];
  const days = daysInStage(s);
  const sla = SLA_DAYS[s.status as Stage];
  const mine = role === "tech" ? ["execucao", "homologacao"].includes(s.status) : true;

  if (mine && sla && days > sla) {
    out.push({ text: `${STATUS[s.status].label} há ${days} dias · prazo ${sla}`, tone: "red", icon: "fa-hourglass-end", weight: 300 + days - sla });
  }
  if (s.p0 && (role !== "tech" || s.status === "execucao")) {
    out.push({ text: `P0 · ${STATUS[s.status].label}`, tone: "red", icon: "fa-triangle-exclamation", weight: 400 });
  }
  if (role === "tech") {
    if (s.status === "homologacao" && !s.homologTech) out.push({ text: `Validação da Tech pendente há ${days} dias`, tone: "orange", icon: "fa-clipboard-check", weight: 200 + days });
    return out;
  }

  // Esclarecimento pedido pelo PMO e ainda sem resposta de quem pediu.
  const asked = s.comments.filter((c) => c.who === USERS.pmo.name && c.text.startsWith("Solicitante consultado")).at(-1);
  if (asked && !s.comments.some((c) => c.who === s.requester && c.at > asked.at && daysFromToday(c.at) >= daysFromToday(asked.at))) {
    const d = -daysFromToday(asked.at);
    out.push({ text: `Esclarecimento sem resposta há ${d} dias`, tone: "orange", icon: "fa-comment-dots", weight: 200 + d });
  }
  if (s.status === "homologacao" && s.homologTech && !s.homologReq && s.homologTechAt && -daysFromToday(s.homologTechAt) > 3) {
    out.push({ text: `Aceite de ${s.requester} pendente há ${-daysFromToday(s.homologTechAt)} dias`, tone: "orange", icon: "fa-user-clock", weight: 150 });
  }
  // Ganhando força: muita gente nova dizendo "Também me afeta" antes da priorização.
  const recent = s.affected.filter((a) => daysFromToday(a.at) >= -7).length;
  if (["triagem", "priorizacao"].includes(s.status) && recent >= 4) {
    out.push({ text: `+${recent} pessoas afetadas em 7 dias`, tone: "blue", icon: "fa-arrow-trend-up", weight: 100 + recent });
  }
  return out;
}

function Attention({ sms, role, onOpen }: { sms: Sm[]; role: Role; onOpen: (s: Sm) => void }) {
  const items = sms
    .map((s) => ({ s, reasons: reasonsOf(s, role) }))
    .filter((x) => x.reasons.length)
    .sort((a, b) => Math.max(...b.reasons.map((r) => r.weight)) - Math.max(...a.reasons.map((r) => r.weight)));

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Header variant="small">Precisa de atenção</Header>
          <p className="text-sm text-brand-purple-dark/60">
            {role === "tech" ? "O que está parado na Tech: execução fora do prazo, validações e P0." : "O que está parado ou ganhando força, do mais urgente para o menos."}
          </p>
        </div>
        {items.length > 0 && <Tag item={plural(items.length, "solicitação", "solicitações")} variant="red" leftIcon="fa-bell" />}
      </div>

      {items.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-green-light p-4 text-sm font-bold text-green-dark">
          <Icon name="fa-circle-check" type="solid" /> Nada travado. Todas as SMs estão dentro do prazo.
        </p>
      ) : (
        <ul className="divide-y divide-brand-purple-dark/10">
          {items.map(({ s, reasons }) => (
            <li key={s.id}>
              <button type="button" onClick={() => onOpen(s)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 py-3 text-left hover:bg-brand-purple-dark/5">
                <span className="w-16 tabular-nums text-sm font-bold text-brand-purple-dark/60">{s.id}</span>
                <span className="min-w-56 flex-1 font-bold text-brand-purple-dark">{s.title}</span>
                <span className="flex flex-wrap gap-1.5">
                  {reasons.map((r) => <Tag key={r.text} item={r.text} variant={TONE_TAG[r.tone]} leftIcon={r.icon} />)}
                </span>
                <Icon name="fa-chevron-right" className="text-brand-purple-dark/40" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ============================================================
   2. Saúde do fluxo
   ============================================================ */

function StageTimes({ sms }: { sms: Sm[] }) {
  const times = sms.map((s) => stageTimes(s).done);
  const rows = STAGES.map((k) => {
    const vals = times.map((t) => t[k as StageId]).filter((v): v is number => v != null);
    const avg = vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : null;
    return { k, avg, sla: SLA_DAYS[k], n: vals.length };
  });
  const scale = Math.max(1, ...rows.map((r) => Math.max(r.avg ?? 0, r.sla)));
  const slowest = rows.filter((r) => r.avg != null).sort((a, b) => b.avg! / b.sla - a.avg! / a.sla)[0];

  return (
    <Card className="space-y-4">
      <div>
        <Header variant="small">Tempo médio em cada etapa</Header>
        <p className="text-sm text-brand-purple-dark/60">Dias até a SM seguir, contra o prazo da etapa (o traço). Prazos provisórios, a validar com o PMO.</p>
      </div>
      {slowest && (
        <p className="flex items-start gap-2 rounded-xl bg-orange-light p-3 text-sm text-brand-purple-dark">
          <Icon name="fa-gauge-high" type="solid" className="mt-0.5 text-orange-dark" />
          <span>
            <b>Mais lenta: {STATUS[slowest.k].label}</b> · {fmtDays(slowest.avg!)} em média, {Math.round((slowest.avg! / slowest.sla) * 100)}% do prazo de {slowest.sla} dias.
          </span>
        </p>
      )}
      <ul className="space-y-2.5">
        {rows.map((r) => {
          const over = r.avg != null && r.avg > r.sla;
          return (
            <li key={r.k} className="grid grid-cols-[9.5rem_1fr_6.5rem] items-center gap-3" title={r.avg == null ? "Sem passagens no período" : `${STATUS[r.k].label}: ${fmtDays(r.avg)} em média (${plural(r.n, "SM", "SMs")}), prazo ${r.sla} dias`}>
              <span className="truncate text-sm font-bold text-brand-purple-dark">{STATUS[r.k].label}</span>
              <span className="relative h-2.5 rounded-full bg-brand-purple-dark/5">
                {r.avg != null && (
                  <span className={cx("absolute inset-y-0 left-0 rounded-full", over ? "bg-red" : "bg-blue")} style={{ width: `${Math.max(2, (r.avg / scale) * 100)}%` }} />
                )}
                <span className="absolute -inset-y-1 w-0.5 rounded bg-brand-purple-dark/40" style={{ left: `${(r.sla / scale) * 100}%` }} />
              </span>
              <span className={cx("text-right text-sm tabular-nums", over ? "font-bold text-red-dark" : "text-brand-purple-dark/70")}>
                {r.avg == null ? "—" : fmtDays(r.avg)}
                {over && <Icon name="fa-circle-exclamation" type="solid" className="ml-1" />}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="flex items-center gap-4 text-xs text-brand-purple-dark/60">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-blue" /> Dentro do prazo</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-red" /> Acima do prazo</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 rounded bg-brand-purple-dark/40" /> Prazo</span>
      </p>
    </Card>
  );
}

const fmtDays = (d: number) => `${d < 10 ? d.toFixed(1).replace(".", ",") : Math.round(d)} d`;

function InOut({ months, period }: { months: MonthRow[]; period: Period }) {
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...months.map((m) => Math.max(m.opened, m.concluded)));
  const opened = months.reduce((t, m) => t + m.opened, 0);
  const closed = months.reduce((t, m) => t + m.concluded + m.rejected, 0);
  const growing = opened > closed;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Header variant="small">Entradas e saídas por mês</Header>
          <p className="text-sm text-brand-purple-dark/60">
            {months.length} meses{period === "30" ? ", com o mês atual por último" : ""}. {growing ? `Entraram ${opened - closed} SMs a mais do que saíram: o backlog está crescendo.` : "Saem tantas SMs quanto entram: o backlog está estável."}
          </p>
        </div>
        <Button type="button" variant="ghost" size="small" leftIcon={table ? "fa-chart-column" : "fa-table"} onClick={() => setTable(!table)}>
          {table ? "Ver gráfico" : "Ver números"}
        </Button>
      </div>

      {opened + closed === 0 ? (
        <p className="py-10 text-center text-sm text-brand-purple-dark/60">Sem entradas nem saídas no período.</p>
      ) : table ? (
        <SimpleTable>
          <thead>
            <tr><th>Mês</th><th className="text-right!">Abertas</th><th className="text-right!">Concluídas</th><th className="text-right!">Rejeitadas</th></tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month}>
                <td>{monthLabel(m.month)}</td>
                <td className="text-right! tabular-nums">{m.opened}</td>
                <td className="text-right! tabular-nums">{m.concluded}</td>
                <td className="text-right! tabular-nums">{m.rejected}</td>
              </tr>
            ))}
          </tbody>
        </SimpleTable>
      ) : (
        <>
          <div className="flex h-44 items-end gap-2 border-b border-brand-purple-dark/10">
            {months.map((m) => (
              <div key={m.month} className="flex h-full flex-1 items-end justify-center gap-0.5" title={`${monthLabel(m.month)} · ${m.opened} abertas · ${m.concluded} concluídas · ${m.rejected} rejeitadas`}>
                <Bar value={m.opened} max={max} className="bg-blue" />
                <Bar value={m.concluded} max={max} className="bg-purple" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {months.map((m) => <span key={m.month} className="flex-1 text-center text-xs text-brand-purple-dark/60">{monthLabel(m.month)}</span>)}
          </div>
          <p className="flex items-center gap-4 text-xs text-brand-purple-dark/60">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-blue" /> Abertas · {opened}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-purple" /> Concluídas · {months.reduce((t, m) => t + m.concluded, 0)}</span>
          </p>
        </>
      )}
    </Card>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  return <span className={cx("w-full max-w-5 rounded-t", className)} style={{ height: `${value ? Math.max(2, (value / max) * 100) : 0}%` }} />;
}

/* ============================================================
   3. Valor entregue
   ============================================================ */

function Value({ sms, months, period, onOpen }: { sms: Sm[]; months: MonthRow[]; period: Period; onOpen: (s: Sm) => void }) {
  const t = (k: keyof Omit<MonthRow, "month">) => months.reduce((a, m) => a + m[k], 0);
  const concluded = t("concluded");
  const latest = sms
    .filter((s) => s.status === "concluida")
    .sort((a, b) => daysFromToday(b.closedAt) - daysFromToday(a.closedAt))
    .slice(0, 3);

  return (
    <Card className="space-y-4">
      <div>
        <Header variant="small">Valor entregue</Header>
        <p className="text-sm text-brand-purple-dark/60">O que as SMs concluídas {PERIOD_LABEL[period]} devolveram à operação.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <InsideCard title="Capacidade liberada" subtitle="Horas por mês devolvidas à operação" value={`+${t("hours")} h/mês`} icon="fa-piggy-bank" />
        <InsideCard title="Total concluído" subtitle={`${t("rejected")} rejeitadas na triagem`} value={String(concluded)} icon="fa-circle-check" />
        <InsideCard title="Sem desenvolvimento" subtitle="Resolvidas só com processo ou POP" value={concluded ? `${Math.round((t("noDev") / concluded) * 100)}%` : "—"} icon="fa-sitemap" />
        <InsideCard title="Lead time" subtitle="Da abertura à entrega, em média" value={concluded ? `${Math.round(t("leadDays") / concluded)} dias` : "—"} icon="fa-stopwatch" />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-black text-brand-purple-dark/60">Últimas entregas</p>
        {latest.length === 0 && <p className="text-sm text-brand-purple-dark/60">Nenhuma SM concluída ainda.</p>}
        {latest.map((s) => (
          <button key={s.id} type="button" onClick={() => onOpen(s)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-green-light/60 p-3 text-left hover:bg-green-light">
            <Icon name="fa-flag-checkered" type="solid" className="text-green-dark" />
            <span className="min-w-48 flex-1">
              <span className="block text-sm font-bold text-brand-purple-dark">{s.id} · {s.title}</span>
              <span className="block text-sm text-brand-purple-dark/70">{s.gainDesc}</span>
            </span>
            {s.gainHours && <Tag item={`+${s.gainHours} h/mês`} variant="green" />}
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ============================================================
   4. Onde dói
   ============================================================ */

/** Classes da escala sequencial (uma cor, do claro ao escuro), por faixa. */
const HEAT = ["bg-blue/10", "bg-blue/25", "bg-blue/45", "bg-blue/70", "bg-blue"];

function WherePain({ sms, onOpen }: { sms: Sm[]; onOpen: (s: Sm) => void }) {
  const open = sms.filter((s) => !isClosed(s));
  const people = (list: Sm[]) => list.reduce((t, s) => t + 1 + s.affected.length, 0);
  const macros = [...L.macros.filter((m) => open.some((s) => s.macro === m)), ...(open.some((s) => !s.macro) ? [""] : [])];
  const cell = (macro: string, unit: string) => open.filter((s) => s.macro === macro && (s.unit === unit || s.affected.some((a) => a.unit === unit)));
  const peopleAt = (macro: string, unit: string) => cell(macro, unit).reduce((t, s) => t + (s.unit === unit ? 1 : 0) + s.affected.filter((a) => a.unit === unit).length, 0);
  const max = Math.max(1, ...macros.flatMap((m) => L.units.map((u) => peopleAt(m, u))));
  const bin = (v: number) => Math.min(HEAT.length - 1, Math.floor((v / max) * HEAT.length - 0.0001));
  const loudest = open
    .filter((s) => ["triagem", "priorizacao"].includes(s.status))
    .sort((a, b) => b.affected.length - a.affected.length)
    .slice(0, 5);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card className="space-y-4">
        <div>
          <Header variant="small">Onde dói</Header>
          <p className="text-sm text-brand-purple-dark/60">Pessoas afetadas pelas SMs em aberto (quem pediu e quem disse "Também me afeta"), por macroprocesso e unidade.</p>
        </div>
        {macros.length === 0 ? (
          <p className="py-8 text-center text-sm text-brand-purple-dark/60">Nenhuma SM em aberto.</p>
        ) : (
          <div className="overflow-x-auto thin-scrollbar">
            <table className="w-full min-w-[36rem] table-fixed border-separate border-spacing-0.5 text-sm">
              <thead>
                <tr>
                  <th className="w-40" />
                  {L.units.map((u) => <th key={u} className="px-1 pb-1 text-center text-xs font-bold text-brand-purple-dark/60">{u}</th>)}
                  <th className="w-14 px-1 pb-1 text-right text-xs font-bold text-brand-purple-dark/60">Total</th>
                </tr>
              </thead>
              <tbody>
                {macros.map((m) => (
                  <tr key={m || "sem"}>
                    <th className="pr-2 text-left text-xs font-bold text-brand-purple-dark">{m || "Ainda sem triagem"}</th>
                    {L.units.map((u) => {
                      const v = peopleAt(m, u);
                      const list = cell(m, u);
                      return (
                        <td
                          key={u}
                          title={v ? `${m || "Sem triagem"} · ${u}: ${plural(v, "pessoa", "pessoas")} em ${plural(list.length, "SM", "SMs")} (${list.map((s) => s.id).join(", ")})` : `${u}: ninguém afetado`}
                          className={cx("h-9 rounded text-center tabular-nums font-bold", v ? HEAT[bin(v)] : "bg-brand-purple-dark/[0.03]", v && bin(v) >= 3 ? "text-white" : "text-brand-purple-dark")}
                        >
                          {v ? (
                            <button type="button" className="h-full w-full" onClick={() => list[0] && onOpen(list.sort((a, b) => b.affected.length - a.affected.length)[0]!)}>{v}</button>
                          ) : (
                            <span className="text-brand-purple-dark/30">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="pl-2 text-right font-bold tabular-nums text-brand-purple-dark">{people(open.filter((s) => s.macro === m))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="flex items-center gap-2 text-xs text-brand-purple-dark/60">
          Menos
          {HEAT.map((h) => <span key={h} className={cx("h-3 w-5 rounded-sm", h)} />)}
          Mais pessoas afetadas
        </p>
      </Card>

      <Card className="space-y-3">
        <div>
          <Header variant="small">Mais gente afetada, fora do backlog</Header>
          <p className="text-sm text-brand-purple-dark/60">Em triagem ou priorização, pela quantidade de pessoas afetadas.</p>
        </div>
        {loudest.length === 0 && <p className="text-sm text-brand-purple-dark/60">Nenhuma SM aguardando triagem ou priorização.</p>}
        {loudest.map((s, i) => (
          <button key={s.id} type="button" onClick={() => onOpen(s)} className="flex w-full items-center gap-3 rounded-xl border border-brand-purple-dark/10 p-3 text-left hover:bg-brand-purple-dark/5">
            <span className="w-5 text-center font-black text-brand-purple-dark/40">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-brand-purple-dark">{s.title}</span>
              <span className="block text-xs font-bold text-brand-purple-dark/60">{s.id} · {reachText(s)}</span>
            </span>
            <StageTag status={s.status} />
          </button>
        ))}
      </Card>
    </div>
  );
}

/* ============================================================
   5. Fila do backlog e carga da Tech
   ============================================================ */

function Queue({ sms, onOpen }: { sms: Sm[]; onOpen: (s: Sm) => void }) {
  const queue = sms
    .filter((s) => ["backlog", "cenarios", "modelagem", "execucao"].includes(s.status))
    .sort((a, b) => prioRank(a) - prioRank(b) || (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1));
  const techLoad = sms.filter((s) => s.status === "execucao" || (s.status === "homologacao" && !s.homologTech));
  const heavy = techLoad.filter((s) => ["G", "GG"].includes(s.effort)).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
      <Card className="space-y-4">
        <div>
          <Header variant="small">Fila priorizada do backlog</Header>
          <p className="text-sm text-brand-purple-dark/60">Por prioridade e score, com há quanto tempo cada uma espera na etapa.</p>
        </div>
        <Table
          id="sm_backlog_queue"
          rows={queue}
          rowId={(s) => `fila-${s.id}`}
          rowClick={onOpen}
          emptyMessage="Nenhuma SM no backlog"
          col={[
            { label: "#", render: (s) => <span className="font-bold">{queue.indexOf(s) + 1}</span> },
            {
              label: "Solicitação",
              render: (s) => (
                <div>
                  <p className="font-bold text-brand-purple-dark">{s.title}</p>
                  <p className="text-sm">{s.id} · {s.unit}</p>
                </div>
              ),
            },
            { label: "Prioridade", render: (s) => <PrioTag sm={s} /> },
            { label: "Esforço", render: (s) => (s.effort ? <Tag item={s.effort} variant="light-purple" /> : "—") },
            { label: "Espera", render: (s) => <Wait s={s} /> },
            { label: "Etapa", render: (s) => <StageTag status={s.status} /> },
          ]}
        />
      </Card>

      <Card className="space-y-3">
        <div>
          <Header variant="small">Carga da Tech</Header>
          <p className="text-sm text-brand-purple-dark/60">
            {plural(techLoad.length, "SM", "SMs")} com a Tech{heavy ? `, ${heavy} de esforço G ou GG` : ""}.
          </p>
        </div>
        {techLoad.length === 0 && <p className="text-sm text-brand-purple-dark/60">Nada com a Tech agora.</p>}
        {techLoad.map((s) => (
          <button key={s.id} type="button" onClick={() => onOpen(s)} className="flex w-full items-center gap-3 rounded-xl border border-brand-purple-dark/10 p-3 text-left hover:bg-brand-purple-dark/5">
            {s.effort && <Tag item={s.effort} variant="light-purple" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-brand-purple-dark">{s.title}</span>
              <span className="block text-xs font-bold text-brand-purple-dark/60">{s.id} · <Wait s={s} plain /></span>
            </span>
          </button>
        ))}
      </Card>
    </div>
  );
}

/** "12 d na etapa", em vermelho quando passou do prazo. */
function Wait({ s, plain = false }: { s: Sm; plain?: boolean }): ReactNode {
  const days = daysInStage(s);
  const sla = SLA_DAYS[s.status as Stage];
  const over = sla != null && days > sla;
  const text = `${days} d na etapa${over ? ` · prazo ${sla}` : ""}`;
  if (plain) return <span className={over ? "text-red-dark" : undefined}>{text}</span>;
  return <span className={cx("whitespace-nowrap text-sm tabular-nums", over ? "font-bold text-red-dark" : "text-brand-purple-dark/70")}>{over && <Icon name="fa-circle-exclamation" type="solid" className="mr-1" />}{text}</span>;
}
