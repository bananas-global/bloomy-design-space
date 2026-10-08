/**
 * Solicitações de melhoria — aba Painel executivo: triagem, priorização,
 * backlog e ganhos. Os indicadores usam `inside_card/1`, as barras
 * `progress/1` e a fila do backlog `table/1`.
 */
import { Card } from "../../components/Card.js";
import { Header, InsideCard, Progress } from "../../components/Layout.js";
import { SimpleTable, Table } from "../../components/Table.js";
import { Tag } from "../../components/Tag.js";
import { L, ORDER, PRIO, STATUS, TAG_OF, fmt, prioOf, prioRank, scoreOf, type PrioId, type Sm } from "./model.js";
import { PrioTag, StageTag, ToneIcon } from "./parts.js";

const pct = (n: number, max: number) => Math.round((n / Math.max(1, max)) * 100);

export function Painel({ sms, onOpen }: { sms: Sm[]; onOpen: (s: Sm) => void }) {
  const cnt = (fn: (s: Sm) => boolean) => sms.filter(fn).length;
  const hours = sms.filter((s) => s.status === "concluida").reduce((a, s) => a + (Number(s.gainHours) || 0), 0);
  const semDev = cnt((s) => s.routes.includes("processo") && !s.routes.includes("dev") && s.subpath === "sem");

  const kpis = [
    { label: "Total de SMs", value: sms.length, sub: "Volume cadastrado", icon: "fa-inbox" },
    { label: "Em análise", value: cnt((s) => ["triagem", "priorizacao"].includes(s.status)), sub: "Triagem e matriz de critérios", icon: "fa-magnifying-glass" },
    { label: "Backlog aprovado", value: cnt((s) => ["backlog", "cenarios"].includes(s.status)), sub: "Aguardando direcionamento", icon: "fa-layer-group" },
    { label: "Em execução", value: cnt((s) => ["modelagem", "execucao", "homologacao"].includes(s.status)), sub: "Processo, Tech e homologação", icon: "fa-code" },
    { label: "Entregues", value: cnt((s) => s.status === "concluida"), sub: "Concluídas com sucesso", icon: "fa-circle-check" },
    { label: "Economia de TI", value: `${hours} h/mês`, sub: `${semDev} resolvida(s) sem desenvolvimento`, icon: "fa-piggy-bank" },
  ];

  const prios = (Object.keys(PRIO) as PrioId[]).map((k) => ({ k, count: cnt((s) => prioOf(s) === k && s.status !== "rejeitada") }));
  const maxP = Math.max(...prios.map((p) => p.count));

  const routes = [
    { label: "Parametrização ou desenvolvimento", sub: "Consome esforço da Tech", count: cnt((s) => s.routes.includes("dev") || s.subpath === "com"), icon: "fa-code" },
    { label: "Processo sem desenvolvimento", sub: "Resolvido por processo · economiza Tech", count: semDev, icon: "fa-sitemap" },
    { label: "Processo com desenvolvimento", sub: "Processo + Tech", count: cnt((s) => s.routes.includes("processo") && s.subpath === "com"), icon: "fa-diagram-project" },
    { label: "Recusadas na triagem", sub: "Filtro anti-desperdício", count: cnt((s) => s.status === "rejeitada"), icon: "fa-ban" },
  ];

  const queue = sms
    .filter((s) => ["backlog", "cenarios", "modelagem", "execucao"].includes(s.status))
    .sort((a, b) => prioRank(a) - prioRank(b) || (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1))
    .slice(0, 5);

  const macros = L.macros.map((m) => ({ label: m, count: cnt((s) => s.macro === m) })).filter((m) => m.count > 0).sort((a, b) => b.count - a.count);
  const maxM = Math.max(1, ...macros.map((m) => m.count));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => (
          <InsideCard key={k.label} title={k.label} subtitle={k.sub} value={String(k.value)} icon={k.icon} className="bg-white" />
        ))}
      </div>

      <Card className="space-y-4">
        <Header variant="small">SMs por etapa do fluxo</Header>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-9">
          {ORDER.map((k) => {
            const st = STATUS[k];
            return (
              <div key={k} className="flex flex-col gap-2 rounded-xl bg-brand-purple-dark/5 p-3">
                <ToneIcon icon={st.icon} tone={st.tone} size="sm" />
                <p className="text-2xl font-black leading-none text-brand-purple-dark">{cnt((s) => s.status === k)}</p>
                <p className="text-xs font-bold leading-tight text-brand-purple-dark/70">{st.label}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <Header variant="small">Distribuição por prioridade</Header>
          {prios.map(({ k, count }) => (
            <div key={k} className="grid grid-cols-[11rem_1fr_2rem] items-center gap-3">
              <Tag item={PRIO[k].full} variant={TAG_OF[PRIO[k].tone]} className="justify-self-start" />
              <Progress value={pct(count, maxP)} showPercentage={false} />
              <p className="text-right font-bold text-brand-purple-dark">{count}</p>
            </div>
          ))}
          <p className="text-xs text-brand-purple-dark/60">A prioridade reflete valor e urgência relativos e não representa compromisso de prazo.</p>
        </Card>

        <Card className="space-y-3">
          <Header variant="small">Eficiência da triagem</Header>
          {routes.map((r) => (
            <InsideCard key={r.label} title={r.label} subtitle={r.sub} value={String(r.count)} icon={r.icon} />
          ))}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="space-y-4 xl:col-span-3">
          <Header variant="small">Fila priorizada do backlog</Header>
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
                    <p className="text-sm">{s.id} · {s.unit} · {STATUS[s.status].label}</p>
                  </div>
                ),
              },
              { label: "Score", render: (s) => <span className="tabular-nums font-bold">{fmt(scoreOf(s))}</span> },
              { label: "Prioridade", render: (s) => <PrioTag sm={s} /> },
              { label: "Etapa", render: (s) => <StageTag status={s.status} /> },
            ]}
          />
        </Card>

        <Card className="space-y-4 xl:col-span-2">
          <Header variant="small">Volume por macroprocesso</Header>
          {macros.map((m) => (
            <div key={m.label} className="space-y-1.5">
              <div className="flex justify-between text-sm font-bold text-brand-purple-dark">
                <span>{m.label}</span>
                <span>{m.count}</span>
              </div>
              <Progress value={pct(m.count, maxM)} showPercentage={false} />
            </div>
          ))}
          {macros.length === 0 && <p className="text-sm text-brand-purple-dark/60">Nenhuma SM triada ainda.</p>}
        </Card>

        <Card className="space-y-4">
          <Header variant="small">Esforço estimado</Header>
          <SimpleTable>
            <tbody>
              {L.efforts.map(([size, strategy]) => (
                <tr key={size}>
                  <td><Tag item={size} variant="light-purple" /></td>
                  <td>{strategy}</td>
                  <td className="text-right! font-bold">{cnt((s) => s.effort === size)}</td>
                </tr>
              ))}
            </tbody>
          </SimpleTable>
        </Card>
      </div>
    </div>
  );
}
