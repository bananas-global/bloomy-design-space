/**
 * O cruzamento da semana: colunas por dia, uma linha por hora, e os encaixes
 * em blocos por especialidade (a cor da Proposta de Grade). Estrela é a
 * disponibilidade da família; tracejado, hora livre de profissional. Com
 * `onMove`, um encaixe (de hoje ou previsto) pode ser arrastado para outra hora
 * livre: ao arrastar, as horas possíveis acendem em verde (dentro da
 * disponibilidade da família) ou laranja (fora dela).
 *
 * Feito na tela, sem equivalente no Phoenix: componente novo para o dev.
 */
import { useState, type CSSProperties } from "react";
import { Icon } from "../../components/Icon.js";
import { COR, DIAS, H0, H1, LIVRES, PROF, SIGLA, br, hh, horasDaFamilia, primeiro, curto, type Faixa, type Janela, type Pedido, type Pin, type Skip } from "./model.js";

type Lead = { unit: string; specialties: Pedido[]; availability: Janela[]; nowR: Faixa[]; futR: Faixa[]; pins?: Pin[]; skips?: Skip[] };
type Drag = { spec: string; pid: string; day: number; h: number; at: string | null };

const mix = (c: string, p: number, w = "#fff") => `color-mix(in srgb, ${c} ${p}%, ${w})`;
const INK = "var(--color-brand-purple-dark)";
const COLS = "44px repeat(5,minmax(0,1fr))";

export function SemanaGrid({
  r,
  onMove,
  onReset,
}: {
  r: Lead;
  /** Move o encaixe `from` para a hora `to`. Sem ele, a grade só mostra. */
  onMove?: (from: { spec: string; day: number; h: number }, to: Pin) => void;
  /** Volta à sugestão do sistema (aparece depois de algum ajuste). */
  onReset?: () => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const mom = horasDaFamilia(r);
  const specs = r.specialties.map((s) => s.spec);
  const daUnidade = LIVRES.filter((w) => w.unit === r.unit && PROF[w.prof]!.specs.some((s) => specs.includes(s)));
  const profsAt = (spec: string, di: number, h: number) =>
    LIVRES.filter((w) => w.unit === r.unit && w.day === di && w.from <= h && h < w.to && PROF[w.prof]!.specs.includes(spec))
      .sort((a, b) => (a.at || "").localeCompare(b.at || ""))
      .map((w) => w.prof);

  // Quem está livre em cada hora e a data mais cedo em que a hora libera.
  const free: Record<string, Set<string>> = {};
  const frAt: Record<string, string | null> = {};
  daUnidade.forEach((w) => {
    for (let h = w.from; h < w.to; h++) {
      const k = `${w.day}-${h}`;
      (free[k] ??= new Set()).add(`${curto(PROF[w.prof]!.name)}${w.at ? ` (a partir de ${br(w.at)})` : ""}`);
      if (!w.at) frAt[k] = null;
      else if (frAt[k] !== null && (!frAt[k] || w.at < frAt[k]!)) frAt[k] = w.at;
    }
  });

  const cell: Record<string, (Faixa & { kind: "now" | "fut" })[]> = {};
  [...r.nowR.map((g) => ({ ...g, kind: "now" as const })), ...r.futR.map((g) => ({ ...g, kind: "fut" as const }))].forEach((g) => {
    for (let h = g.from; h < g.to; h++) (cell[`${g.day}-${h}`] ??= []).push(g);
  });
  const hours: number[] = [];
  for (let h = H0; h < H1; h++) hours.push(h);

  const hasOut = r.nowR.some((g) => g.outside);
  const adjusted = (r.pins || []).length + (r.skips || []).length > 0;
  const sw: CSSProperties = { width: 14, height: 14, borderRadius: 4, flex: "none" };

  return (
    <div className="flex flex-col gap-3">
      {onMove && (
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-brand-purple-dark/60">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="fa-hand" />
            Arraste um encaixe (hoje ou previsto) para outro horário. Ao arrastar, os horários com profissional livre acendem: verde na disponibilidade da família, laranja fora dela.
          </span>
          {adjusted && onReset && (
            <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 font-extrabold text-brand-blue-dark">
              <Icon name="fa-rotate-left" type="solid" />
              Voltar à sugestão do sistema
            </button>
          )}
        </div>
      )}
      <div role="grid" aria-label="Semana" className="flex flex-col gap-[3px]">
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: COLS }}>
          <span />
          {DIAS.map((d) => (
            <span key={d} className="pb-1 text-center text-xs font-black tracking-wide text-brand-purple-dark/60">
              {d}
            </span>
          ))}
        </div>
        {hours.map((h) => (
          <div key={h} role="row" className="grid gap-[3px]" style={{ gridTemplateColumns: COLS }}>
            <span className="pt-1.5 pr-1.5 text-right text-[11.5px] font-bold tabular-nums text-brand-purple-dark/60">{hh(h)}</span>
            {DIAS.map((d, di) => {
              const k = `${di}-${h}`, gs = cell[k] ?? [], star = mom.has(k), fr = free[k];
              const g = gs[0], c = g ? COR[g.spec] ?? "var(--color-blue)" : null;
              const ok = !!drag && !gs.length && profsAt(drag.spec, di, h).length > 0;
              const hot = ok && over === k;
              const tone = star ? "var(--color-green)" : "var(--color-orange)";
              const tip = [
                star ? "Disponibilidade da família" : null,
                ...gs.map((x) => `${x.spec} · ${PROF[x.pid]!.name}${x.kind === "now" ? " · livre hoje" : ` · a partir de ${br(x.at)}`}`),
                !g && fr ? `Profissional livre: ${[...fr].join(", ")}` : null,
              ].filter(Boolean).join(" · ");
              const alvo = ok ? profsAt(drag!.spec, di, h) : [];
              const pidAlvo = ok ? (alvo.includes(drag!.pid) ? drag!.pid : alvo[0]!) : null;
              const winAlvo = pidAlvo ? LIVRES.find((x) => x.unit === r.unit && x.prof === pidAlvo && x.day === di && x.from <= h && h < x.to) : null;
              return (
                <div
                  key={d}
                  role="gridcell"
                  title={tip || undefined}
                  onDragOver={ok ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (over !== k) setOver(k); } : undefined}
                  onDragLeave={ok ? () => setOver((o) => (o === k ? null : o)) : undefined}
                  onDrop={
                    ok
                      ? (e) => {
                          e.preventDefault();
                          onMove!({ spec: drag!.spec, day: drag!.day, h: drag!.h }, { spec: drag!.spec, pid: pidAlvo!, day: di, h });
                          setDrag(null);
                          setOver(null);
                        }
                      : undefined
                  }
                  className="relative flex min-h-[34px] flex-col justify-center gap-0.5 rounded-lg transition-colors"
                  style={{
                    padding: `3px ${star ? 14 : 3}px 3px 3px`,
                    background: ok ? mix(tone, hot ? 26 : 12) : g ? mix(c!, g.kind === "now" ? 16 : 8) : "rgba(43,35,91,.035)",
                    boxShadow: ok ? `inset 0 0 0 ${hot ? 2 : 1.5}px ${tone}` : g && g.kind === "fut" ? `inset 0 0 0 1.5px ${mix(c!, 45)}` : "none",
                    outline: !g && fr && !ok ? "1.5px dashed rgba(43,35,91,.22)" : "none",
                    outlineOffset: -1.5,
                  }}
                >
                  {star && <Icon name="fa-star" type="solid" className="absolute top-1/2 right-1 -translate-y-1/2 text-[10px] leading-none text-warning-dark" />}
                  {gs.map((x, i) => {
                    const cx = COR[x.spec] ?? "var(--color-blue)";
                    const isSrc = drag && drag.day === di && drag.h === h && drag.spec === x.spec;
                    return (
                      <span
                        key={i}
                        draggable={!!onMove || undefined}
                        onDragStart={
                          onMove
                            ? (e) => {
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("text/plain", x.spec);
                                setDrag({ spec: x.spec, pid: x.pid, day: di, h, at: x.kind === "now" ? null : x.at });
                              }
                            : undefined
                        }
                        onDragEnd={onMove ? () => { setDrag(null); setOver(null); } : undefined}
                        title={x.outside ? "Fora da disponibilidade da família · combinar com a família" : onMove ? "Arraste para outro horário com profissional livre" : undefined}
                        className={`flex min-w-0 items-center gap-1 overflow-hidden px-0.5 ${onMove ? "cursor-grab" : ""}`}
                        style={{ opacity: isSrc ? 0.4 : 1 }}
                      >
                        {x.outside && <Icon name="fa-triangle-exclamation" type="solid" className="text-[10px] text-orange-dark" />}
                        <b className="text-[11.5px] font-black" style={{ color: mix(cx, 60, INK) }}>{SIGLA[x.spec] ?? x.spec}</b>
                        <span className="min-w-0 truncate text-[11px] font-bold text-brand-purple-dark">{x.kind === "now" ? primeiro(PROF[x.pid]!.name) : br(x.at)}</span>
                      </span>
                    );
                  })}
                  {!g && !ok && fr && frAt[k] && (
                    <span className="pointer-events-none mx-0.5 my-auto self-end text-[10.5px] font-bold text-brand-purple-dark/60">{`livre ${br(frAt[k])}`}</span>
                  )}
                  {ok && (
                    <span className="pointer-events-none truncate px-0.5 text-[11px] font-bold text-brand-purple-dark">
                      {primeiro(PROF[pidAlvo!]!.name)}
                      {winAlvo?.at ? ` · ${br(winAlvo.at)}` : ""}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-brand-purple-dark/60">
        {r.nowR.length > 0 && <span className="inline-flex items-center gap-1.5"><i style={{ ...sw, background: mix("var(--color-neutral-500)", 18) }} />Encaixe hoje</span>}
        {r.futR.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <i style={{ ...sw, background: mix("var(--color-neutral-500)", 8), boxShadow: `inset 0 0 0 1.5px ${mix("var(--color-neutral-500)", 45)}` }} />
            Encaixe previsto
          </span>
        )}
        <span className="inline-flex items-center gap-1.5"><Icon name="fa-star" type="solid" className="text-[10px] text-warning-dark" />Disponibilidade da família</span>
        <span className="inline-flex items-center gap-1.5">
          <i style={{ ...sw, outline: "1.5px dashed rgba(43,35,91,.3)", outlineOffset: -1.5, background: "rgba(43,35,91,.035)" }} />
          Profissional livre (hoje ou a partir da data indicada)
        </span>
        {hasOut && (
          <span className="inline-flex items-center gap-1.5"><Icon name="fa-triangle-exclamation" type="solid" className="text-[10px] text-orange-dark" />Fora da disponibilidade · combinar com a família</span>
        )}
      </div>
    </div>
  );
}
