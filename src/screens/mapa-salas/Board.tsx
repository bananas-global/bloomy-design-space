/**
 * Mapa de Salas — o quadro do dia.
 *
 * Uma linha por sala e uma faixa por ponto de atendimento, no eixo do horário
 * de funcionamento. Cada faixa tem duas linhas:
 *
 * - Em cima, o planejado: o que a unidade precisa no ponto (o dia todo de uma
 *   especialidade, ou duas no mesmo dia). Clicar num horário vazio adiciona;
 *   clicar num trecho edita ou remove; arrastar move e puxar as bordas muda
 *   início e fim (de hora em hora). Vale na hora.
 * - Embaixo, a escala: quem o perfil do profissional aponta para o ponto, com
 *   a especialidade dele. Só leitura; cinza = planejado sem ninguém. Alerta
 *   quando a especialidade de quem está difere do planejado.
 *
 * Novo — não existe no Phoenix: o quadro, as faixas e os cards são da tela,
 * com tokens do monólito.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input, cx } from "../../components/Input.js";
import {
  FOCUS_KEYS,
  allocTypeOf,
  hhmm,
  laneCount,
  laneMatches,
  norm,
  planTypeOf,
  pluralize,
  roleLabel,
  roomLabel,
  roomTypeLabel,
  searchOptions,
  specAbbr,
  typeLabel,
  type Focus,
  type Lane,
  type PlanBlock,
  type Room,
  type SearchOption,
  type ServicePoint,
} from "./model.js";
import { useRoomsMap } from "./store.js";

const HOUR = 60;
const up = (m: number) => Math.ceil(m / HOUR) * HOUR;
const down = (m: number) => Math.floor(m / HOUR) * HOUR;

/* ============================================================
   Régua
   ============================================================ */

function Ruler({ dayStart, dayEnd, span }: { dayStart: number; dayEnd: number; span: number }) {
  // Abertura, horas cheias intermediárias e fechamento, com folga de 45 min entre rótulos.
  const gap = 45;
  const marks = [dayStart];
  for (let m = Math.ceil(dayStart / 60) * 60; m < dayEnd; m += 60) if (m - dayStart >= gap) marks.push(m);
  if (dayEnd - marks[marks.length - 1]! >= gap) marks.push(dayEnd);
  return (
    <div className="relative h-[22px]">
      {marks.map((m, i) => (
        <span
          key={m}
          className={cx(
            "absolute bottom-1 whitespace-nowrap text-[11px] font-extrabold text-brand-purple-dark/40 tabular-nums",
            i === 0 ? "" : i === marks.length - 1 ? "-translate-x-full" : "-translate-x-1/2",
          )}
          style={{ left: `${((m - dayStart) / span) * 100}%` }}
        >
          {hhmm(m)}
        </span>
      ))}
    </div>
  );
}

/* ============================================================
   Faixa de um ponto: planejado em cima, escala embaixo
   ============================================================ */

type Drag = { b: PlanBlock; mode: "move" | "l" | "r"; x0: number; from0: number; to0: number; from: number; to: number; moved: boolean };

/** O ponto, à esquerda das duas linhas: vale para o planejado e para a escala. */
function PointCell({ room, point }: { room: Room; point: ServicePoint | null }) {
  return (
    <span
      title={point ? `${room.name} · Ponto ${point.name}` : undefined}
      className={cx(
        "flex w-10 flex-none flex-col items-center justify-center rounded-md leading-none",
        point && "bg-brand-purple-dark/6 text-brand-purple-dark",
      )}
    >
      {point && (
        <>
          <span className="text-[10px] font-bold text-brand-purple-dark/50">Ponto</span>
          <span className="mt-0.5 text-base font-black">{point.name}</span>
        </>
      )}
    </span>
  );
}

const Spec = ({ children }: { children: ReactNode }) => (
  <span className="flex-none whitespace-nowrap text-xs font-bold tracking-[.02em] text-brand-purple-dark/50">{children}</span>
);

const TempIcon = () => (
  <span title="Temporário" className="flex-none text-[11px] text-purple">
    <Icon name="fa-hourglass-half" type="solid" />
  </span>
);

/** As alças de redimensionar dos dois lados do trecho planejado. */
function Edges() {
  return (
    <>
      {(["l", "r"] as const).map((e) => (
        <span key={e} data-edge={e} className={cx("absolute inset-y-0 z-2 w-2 cursor-ew-resize", e === "l" ? "left-0" : "right-0")}>
          <span
            className={cx(
              "absolute top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded-sm bg-brand-blue opacity-0 transition-opacity group-hover/card:opacity-100",
              e === "l" ? "left-0.5" : "right-0.5",
            )}
          />
        </span>
      ))}
    </>
  );
}

const TIER = "relative h-8 min-w-0 rounded-md";
const BLOCK = "group/card @container absolute inset-y-0 flex min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 text-left";

function LaneView({
  lane,
  room,
  dayStart,
  span,
  readOnly,
  onEditPlan,
  onNewPlan,
  onMovePlan,
  onEditRoom,
  onSchedule,
}: {
  lane: Lane;
  room: Room;
  dayStart: number;
  span: number;
  readOnly: boolean;
  onEditPlan: (pl: PlanBlock, point: ServicePoint) => void;
  onNewPlan: (point: ServicePoint, from: number) => void;
  onMovePlan: (pl: PlanBlock, point: ServicePoint, from: number, to: number) => void;
  onEditRoom: () => void;
  onSchedule: (professional: string) => void;
}) {
  const pct = (m: number) => ((m - dayStart) / span) * 100;
  const w = (a: number, b: number) => pct(b) - pct(a);
  const place = (a: number, b: number) => ({ left: `${pct(a)}%`, width: `${w(a, b)}%` });
  const tierRef = useRef<HTMLDivElement>(null);
  // Hora cheia sob o cursor, em espaço vazio do planejado.
  const [ghost, setGhost] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dayEnd = dayStart + span;
  const grid = {
    backgroundImage: "repeating-linear-gradient(to right, color-mix(in srgb, var(--color-brand-purple-dark) 6%, transparent) 0 1px, transparent 1px)",
    backgroundSize: `calc(100% / ${span / 60}) 100%`,
  };

  if (lane.nopoint) {
    return (
      <div className="flex min-w-0 flex-1 gap-2">
      <PointCell room={room} point={null} />
      <button
        type="button"
        className={cx(
          "flex h-[68px] min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed border-brand-purple-dark/20 bg-brand-purple-dark/2 px-2.5",
          "transition duration-200 hover:border-brand-blue hover:bg-brand-blue/6 active:scale-[0.98]",
        )}
        onClick={onEditRoom}
      >
        <Icon name="fa-plus" type="solid" className="text-brand-purple-dark/35" />
        <span className="truncate text-[13px] font-bold text-brand-purple-dark/45">{roomLabel(room)} · nenhum ponto de atendimento configurado</span>
      </button>
      </div>
    );
  }
  const point = lane.point!;

  /* ---------- planejado: arrastar, redimensionar, clicar ---------- */
  function limits(b: PlanBlock): [number, number] {
    const others = lane.plan.filter((x) => x !== b);
    const lo = Math.max(dayStart, ...others.filter((x) => x.to <= b.from).map((x) => x.to));
    const hi = Math.min(dayEnd, ...others.filter((x) => x.from >= b.to).map((x) => x.from));
    return [up(lo), down(hi)];
  }
  function onDown(e: PointerEvent<HTMLButtonElement>, b: PlanBlock) {
    if (e.button !== 0 || readOnly) return;
    const edge = (e.target as HTMLElement).closest("[data-edge]");
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ b, mode: (edge ? edge.getAttribute("data-edge") : "move") as Drag["mode"], x0: e.clientX, from0: b.from, to0: b.to, from: b.from, to: b.to, moved: false });
  }
  function onMove(e: PointerEvent<HTMLButtonElement>) {
    if (!drag || !tierRef.current) return;
    const dx = e.clientX - drag.x0;
    const moved = drag.moved || Math.abs(dx) > 4;
    const dm = (dx / tierRef.current.getBoundingClientRect().width) * span;
    const [lo, hi] = limits(drag.b);
    let from = drag.from0, to = drag.to0;
    if (drag.mode === "move") {
      const dur = Math.max(HOUR, Math.round((drag.to0 - drag.from0) / HOUR) * HOUR);
      from = Math.min(Math.max(Math.round((drag.from0 + dm) / HOUR) * HOUR, lo), hi - dur);
      to = from + dur;
    } else if (drag.mode === "l") {
      from = Math.min(Math.max(Math.round((drag.from0 + dm) / HOUR) * HOUR, lo), down(drag.to0 - HOUR));
    } else {
      to = Math.max(Math.min(Math.round((drag.to0 + dm) / HOUR) * HOUR, hi), up(drag.from0 + HOUR));
    }
    if (to - from < HOUR || from < lo || to > hi) return;
    setDrag({ ...drag, from, to, moved });
  }
  function onUp() {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (!d.moved) return onEditPlan(d.b, point);
    if (d.from !== d.from0 || d.to !== d.to0) onMovePlan(d.b, point, d.from, d.to);
  }
  /** Espaço vazio do planejado: hora cheia sob o cursor. */
  function hourAt(e: { target: EventTarget; clientX: number }) {
    if (readOnly || e.target !== tierRef.current) return null;
    const r = tierRef.current.getBoundingClientRect();
    const h = Math.floor((dayStart + ((e.clientX - r.left) / r.width) * span) / HOUR) * HOUR;
    const from = Math.max(dayStart, h), to = Math.min(dayEnd, h + HOUR);
    const busy = lane.plan.some((x) => x.from < to && x.to > from);
    return busy || to <= from ? null : from;
  }

  return (
    <div className="flex min-w-0 flex-1 gap-2">
    <PointCell room={room} point={point} />
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {/* Planejado: o que a unidade precisa no ponto. */}
      <div
        ref={tierRef}
        className={TIER}
        style={{ ...grid, cursor: ghost != null ? "pointer" : undefined }}
        onMouseMove={(e) => {
          if (drag) return;
          const h = hourAt(e);
          if (h !== ghost) setGhost(h);
        }}
        onMouseLeave={() => setGhost(null)}
        onClick={(e) => {
          const h = hourAt(e);
          if (h != null) {
            setGhost(null);
            onNewPlan(point, h);
          }
        }}
      >
        {lane.plan.length === 0 && ghost == null && (
          <span className="pointer-events-none absolute inset-0 flex items-center gap-2.5 rounded-md border-[1.5px] border-dashed border-brand-purple-dark/14 px-2 text-xs font-bold text-brand-purple-dark/40">
            {readOnly ? "Sem planejado" : "Sem planejado · clique num horário para definir"}
          </span>
        )}
        {drag?.moved && (
          <span
            className="pointer-events-none absolute -top-2 z-4 -translate-y-full whitespace-nowrap rounded-md bg-brand-purple-dark px-2 py-[3px] text-xs font-extrabold text-white tabular-nums"
            style={{ left: `${pct(drag.from)}%` }}
          >
            {hhmm(drag.from)}–{hhmm(drag.to)}
          </span>
        )}
        {ghost != null && (
          <span
            className="pointer-events-none absolute inset-y-0 flex items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border-[1.5px] border-dashed border-brand-blue bg-brand-blue/8 text-[11px] font-extrabold text-brand-blue-dark"
            style={place(ghost, ghost + HOUR)}
          >
            <Icon name="fa-plus" type="solid" />
            <span>{hhmm(ghost)}</span>
          </span>
        )}
        {lane.plan.map((pl, i) => {
          const d = drag && drag.b === pl ? drag : null;
          return (
            <button
              key={i}
              type="button"
              className={cx(
                BLOCK,
                "border-[1.5px] border-brand-purple-dark/22 bg-white transition-colors duration-200",
                readOnly ? "cursor-default" : "cursor-grab touch-none select-none hover:border-brand-blue",
                d?.moved && "z-3 cursor-grabbing border-brand-blue shadow-[0_6px_16px_rgba(43,35,91,0.14)]",
              )}
              style={d ? place(d.from, d.to) : place(pl.from, pl.to)}
              onPointerDown={(e) => onDown(e, pl)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={() => setDrag(null)}
              title={`Planejado: ${pl.specialty} · ${typeLabel(planTypeOf(pl))} · ${hhmm(pl.from)}–${hhmm(pl.to)}${pl.dayLabel ? ` · ${pl.dayLabel}` : ""}${readOnly ? "" : " — clique para editar, arraste para mudar o horário"}`}
            >
              <Spec>{specAbbr(pl.specialty)}</Spec>
              <span className="min-w-0 truncate text-[13px] font-semibold text-brand-purple-dark @max-[160px]:hidden">{pl.specialty}</span>
              {planTypeOf(pl) === "temporary" && <TempIcon />}
              {!readOnly && <Edges />}
            </button>
          );
        })}
      </div>

      {/* Escala: quem o perfil do profissional aponta para o ponto. Só leitura. */}
      <div className={TIER} style={grid}>
        {lane.allocs.length === 0 && lane.gaps.length === 0 && (
          <span className="pointer-events-none absolute inset-0 flex items-center px-2 text-xs font-semibold text-brand-purple-dark/35">Ninguém na escala neste dia</span>
        )}
        {lane.gaps.map((g, i) => (
          <span
            key={`g${i}`}
            className="absolute inset-y-0 flex items-center justify-center overflow-hidden rounded-md bg-brand-purple-dark/16 px-2 text-[11px] font-bold text-brand-purple-dark/45"
            style={place(g.from, g.to)}
            title={`Planejado sem profissional · ${g.plan.specialty} · ${hhmm(g.from)}–${hhmm(g.to)}`}
          >
            <span className="truncate">sem profissional</span>
          </span>
        ))}
        {lane.allocs.map((b, i) => {
          const why =
            b.status === "divergent" ? ` · diferente do planejado (${b.host ? b.host.specialty : "—"})` : b.status === "extra" ? " · sem planejado para este horário" : "";
          return (
            <span
              key={`a${i}`}
              className={cx(
                BLOCK,
                "border-[1.5px] bg-white",
                b.status === "extra" ? "border-dashed border-brand-purple-dark/30" : "border-brand-purple-dark/22",
              )}
              style={place(b.from, b.to)}
              title={`${b.professional} · ${b.specialty || "—"}${b.role ? " · " + roleLabel(b.role) : ""} · ${hhmm(b.from)}–${hhmm(b.to)}${b.dayLabel ? ` · ${b.dayLabel}` : ""}${why}${b.leavingAt ? " · sai em " + b.leavingAt.split("-").reverse().join("/") : ""} · vem do perfil do profissional`}
            >
              <Spec>{specAbbr(b.specialty)}</Spec>
              <span className="min-w-0 truncate text-[13px] font-semibold text-brand-purple-dark">{b.professional}</span>
              {b.status === "divergent" && <Icon name="fa-triangle-exclamation" type="solid" className="flex-none text-xs text-orange" />}
              {allocTypeOf(b._src) === "temporary" && <TempIcon />}
              <button
                type="button"
                className="ml-auto flex-none whitespace-nowrap rounded-[5px] bg-white px-1.5 py-px text-[11px] font-extrabold text-brand-blue-dark opacity-0 shadow-main transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100"
                onClick={() => onSchedule(b.professional)}
              >
                Ver escala no perfil <Icon name="fa-arrow-right" type="solid" />
              </button>
            </span>
          );
        })}
      </div>
    </div>
    </div>
  );
}

/* ============================================================
   Busca com sugestões
   ============================================================ */

function Search({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: SearchOption[] }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const nq = norm(value);
  const list = nq ? options.filter((x) => x.keys.some((k) => norm(k).includes(nq))).slice(0, 12) : [];
  const groups: { name: string; items: SearchOption[] }[] = [];
  list.forEach((x) => {
    let g = groups.find((y) => y.name === x.group);
    if (!g) groups.push((g = { name: x.group, items: [] }));
    g.items.push(x);
  });
  const flat = groups.flatMap((g) => g.items);
  const pick = (x: SearchOption) => {
    onChange(x.value);
    setOpen(false);
  };
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => (h + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => (h - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(flat[Math.min(hi, flat.length - 1)]!);
    } else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={ref} className="relative min-w-0">
      <Input
        id="mapa-salas-busca"
        value={value}
        placeholder="Profissional, sala ou ponto (ex.: Azul A)"
        leftIcon="fa-magnifying-glass"
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => value && setOpen(true)}
        onKeyDown={onKey}
      />
      {value && (
        <button
          type="button"
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-brand-purple-dark/45 hover:bg-brand-purple-dark/6 hover:text-brand-purple-dark"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
        >
          <Icon name="fa-xmark" type="solid" />
        </button>
      )}
      {open && nq && (
        <div role="listbox" className="absolute inset-x-0 top-[calc(100%+6px)] z-40 max-h-[360px] overflow-y-auto rounded-xl border border-neutral-100 bg-white p-1.5 shadow-main">
          {flat.length === 0 && <p className="px-2.5 py-3 text-[13px] font-semibold text-brand-purple-dark/50">Nada encontrado para “{value}”.</p>}
          {groups.map((g) => (
            <div key={g.name}>
              <p className="mx-2 mb-1 mt-1.5 text-[11px] font-black uppercase tracking-[.04em] text-brand-purple-dark/40">{g.name}</p>
              {g.items.map((x) => {
                const i = flat.indexOf(x);
                return (
                  <button
                    key={g.name + x.label}
                    type="button"
                    role="option"
                    aria-selected={i === hi}
                    className={cx("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left", i === hi && "bg-brand-blue/12")}
                    onMouseEnter={() => setHi(i)}
                    onClick={() => pick(x)}
                  >
                    <Icon name={x.icon} type="solid" className="w-4 flex-none text-center text-xs text-brand-purple-dark/40" />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-brand-purple-dark">{x.label}</span>
                    {x.sub && <em className="flex-none text-xs font-semibold not-italic text-brand-purple-dark/50">{x.sub}</em>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Contadores de status (filtro)
   ============================================================ */

/**
 * A amostra de cada status: uma mini-faixa com as duas linhas do ponto.
 * Em cima o planejado, embaixo a escala; cheio = tem, tracejado = não tem,
 * cinza = planejado sem profissional.
 */
type Row = "filled" | "empty" | "gray";
function Swatch({ top, bottom }: { top: Row; bottom: Row }) {
  const row = (r: Row) =>
    cx("h-[5px] w-5 rounded-[2px]", r === "filled" && "border border-brand-purple-dark/40 bg-white", r === "empty" && "border border-dashed border-brand-purple-dark/30", r === "gray" && "bg-brand-purple-dark/25");
  return (
    <span className="flex flex-none flex-col gap-0.5">
      <span className={row(top)} />
      <span className={row(bottom)} />
    </span>
  );
}

const STATUS: [Exclude<Focus, "all">, string, ReactNode][] = [
  ["ok", "Planejado com profissional", <Swatch top="filled" bottom="filled" />],
  ["open", "Planejado sem profissional", <Swatch top="filled" bottom="gray" />],
  ["extra", "Profissional sem planejado", <Swatch top="empty" bottom="filled" />],
  ["noplan", "Sem planejado e sem profissional", <Swatch top="empty" bottom="empty" />],
  ["divergent", "Especialidade do profissional diferente do planejado", <Icon name="fa-triangle-exclamation" type="solid" className="text-orange" />],
  ["temp", "Temporário (no planejado ou na escala)", <Icon name="fa-hourglass-half" type="solid" className="text-purple" />],
];

/* ============================================================
   O quadro
   ============================================================ */

export function Board() {
  const { model, q, setQ, focus, setFocus, canEdit, openModal, movePlan, showSchedule } = useRoomsMap();
  const readOnly = !canEdit;
  const baseRooms = model.rooms
    .map((r) => ({ ...r, lanes: r.lanes.filter((l) => laneMatches(r.room, l, q)) }))
    .filter((r) => r.lanes.length > 0);
  const counts = Object.fromEntries(
    FOCUS_KEYS.map((k) => [k, baseRooms.reduce((s, r) => s + r.lanes.reduce((t, l) => t + (l.nopoint ? 0 : laneCount(l, k)), 0), 0)]),
  ) as Record<Exclude<Focus, "all">, number>;
  const rooms = baseRooms
    .map((r) => ({ ...r, lanes: r.lanes.filter((l) => focus === "all" || laneCount(l, focus) > 0) }))
    .filter((r) => r.lanes.length > 0);
  const editRoom = (room: Room) => openModal({ kind: "room", roomId: room.id });

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-[1_1_360px]">
          <Search value={q} onChange={setQ} options={searchOptions(model.rooms)} />
        </div>
        <div className="flex flex-none flex-wrap items-center gap-1.5">
          {STATUS.map(([k, label, icon]) => (
            <button
              key={k}
              type="button"
              aria-pressed={focus === k}
              title={`${label}${focus === k ? " · clique para mostrar tudo" : " · clique para filtrar"}`}
              className={cx(
                "inline-flex h-12 items-center gap-[7px] rounded-lg border bg-white px-3 transition duration-200 active:scale-95 hover:border-brand-blue",
                focus === k ? "border-brand-blue bg-brand-blue/12" : "border-neutral-100",
              )}
              onClick={() => setFocus(focus === k ? "all" : k)}
            >
              {icon}
              <b className="text-sm font-extrabold text-brand-purple-dark tabular-nums">{counts[k]}</b>
            </button>
          ))}
        </div>
        {(q || focus !== "all") && (
          <Button
            type="button"
            variant="ghost"
            leftIcon="fa-xmark"
            iconType="solid"
            onClick={() => {
              setQ("");
              setFocus("all");
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-neutral-100 bg-white">
        {/* O recuo do ponto (w-10 + gap-2), para a régua alinhar com as faixas. */}
        <div className="border-b border-neutral-100 pl-16 pr-4 pt-2.5">
          <Ruler dayStart={model.dayStart} dayEnd={model.dayEnd} span={model.span} />
        </div>

        {rooms.length === 0 && (
          <div className="px-4 py-9 text-center text-sm font-bold text-brand-purple-dark/45">
            <Icon name="fa-door-closed" className="mr-2" />
            Nenhum ponto com os filtros atuais.
          </div>
        )}

        {rooms.map(({ room, lanes }) => (
          <div key={room.id} className="group flex flex-col gap-2 border-t border-brand-purple-dark/5 px-4 py-2.5 first-of-type:border-t-0">
            <div className="flex min-h-6 items-center gap-2">
              <span className="text-sm font-extrabold text-brand-purple-dark">{room.name}</span>
              <span className="text-xs font-bold text-brand-purple-dark/45">
                {pluralize(room.servicePoints.length, "ponto", "pontos")}
                {room.type !== "attendance" ? ` · ${roomTypeLabel(room.type)}` : ""}
              </span>
              <button
                type="button"
                title={`Editar ${room.name}`}
                aria-label={`Editar ${room.name}`}
                className="inline-grid size-6 place-items-center rounded-md text-[11px] text-brand-purple-dark/40 opacity-0 transition hover:bg-brand-purple-dark/6 hover:text-brand-blue-dark focus-visible:opacity-100 group-hover:opacity-100"
                onClick={() => editRoom(room)}
              >
                <Icon name="fa-pen" type="solid" />
              </button>
            </div>
            {lanes.map((lane, i) => (
              <div key={i} className="flex min-w-0 items-stretch gap-2">
                <LaneView
                  lane={lane}
                  room={room}
                  dayStart={model.dayStart}
                  span={model.span}
                  readOnly={readOnly}
                  onEditPlan={(pl, point) => openModal({ kind: "planEdit", roomId: room.id, point: point.name, from: pl.from })}
                  onNewPlan={(point, from) => openModal({ kind: "plan", roomId: room.id, point: point.name, from })}
                  onMovePlan={(pl, point, from, to) => movePlan(room, point, pl, from, to)}
                  onEditRoom={() => editRoom(room)}
                  onSchedule={showSchedule}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
