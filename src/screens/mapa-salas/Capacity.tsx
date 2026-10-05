/**
 * Mapa de Salas — a visão Capacidade.
 *
 * Uma linha por ponto de atendimento e uma coluna por hora do funcionamento,
 * no dia do header: cheio quando a escala põe um profissional no ponto,
 * listrado quando não. Embaixo, a ocupação de cada hora no dia e na semana (a
 * da semana não muda com o dia). Ao lado, em três cards: a capacidade física
 * (pontos × horas) com a taxa de cobertura do espaço, a cobertura por sala e
 * as horas de cada profissional; passar o mouse num profissional destaca as
 * horas dele na grade.
 *
 * A cor da ocupação vai do azul (sala livre) ao vermelho (sala cheia), passando
 * por amarelo e laranja (`levelOf`).
 *
 * Novo — não existe no Phoenix: a grade e os cards são da tela, com tokens do
 * monólito.
 */
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../../components/Icon.js";
import { cx } from "../../components/Input.js";
import {
  buildCapacity,
  fmtHours,
  hourRate,
  levelOf,
  occupiedHours,
  professionalHours,
  roomRates,
  type CapacityModel,
  type Level,
} from "./capacityModel.js";
import { dayLong, pluralize, type DayKey } from "./model.js";
import { useRoomsMap } from "./store.js";

const LABEL = "text-[11px] font-black uppercase tracking-[.04em] text-brand-purple-dark/40";
const ROOM_TOP = "mt-1 border-t border-neutral-100 pt-[7px]";
const CARD = "rounded-xl border border-neutral-100 bg-white";

const LEVEL: Record<Level, { card: string; text: string; bar: string }> = {
  blue: { card: "bg-blue/8", text: "text-blue-dark", bar: "bg-blue" },
  yellow: { card: "bg-yellow/12", text: "text-yellow-dark", bar: "bg-yellow" },
  orange: { card: "bg-orange/10", text: "text-orange-dark", bar: "bg-orange" },
  red: { card: "bg-red/8", text: "text-red-dark", bar: "bg-red" },
};

type Fill = "on" | "part" | "off";

const DOT: Record<Fill, string> = {
  on: "bg-brand-purple-dark",
  part: "",
  off: "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand-purple-dark)_14%,transparent)]",
};

const OFF_BG = "repeating-linear-gradient(135deg, color-mix(in srgb, var(--color-brand-purple-dark) 5%, transparent) 0 3px, color-mix(in srgb, var(--color-brand-purple-dark) 16%, transparent) 3px 4px)";
const partBg = (f: number) =>
  `linear-gradient(90deg, var(--color-brand-purple-dark) ${f * 100}%, color-mix(in srgb, var(--color-brand-purple-dark) 14%, transparent) 0)`;

function Dot({ fill, f = 0.5, dim, legend }: { fill: Fill; f?: number; dim?: boolean; legend?: boolean }) {
  const style: CSSProperties | undefined = fill === "off" ? { backgroundImage: OFF_BG } : fill === "part" ? { backgroundImage: partBg(f) } : undefined;
  return (
    <span
      className={cx("block rounded transition-opacity duration-200", legend ? "h-3 w-[22px] flex-none" : "h-4 w-full", DOT[fill], dim && "opacity-20")}
      style={style}
    />
  );
}

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

const fillOf = (f: number): Fill => (f >= 0.999 ? "on" : f > 0 ? "part" : "off");

function Grid({ m, day, hoverProf }: { m: CapacityModel; day: DayKey; hoverProf: string | null }) {
  const { canEdit, openModal } = useRoomsMap();
  const cols = { gridTemplateColumns: `minmax(120px, 168px) repeat(${m.hours.length}, minmax(26px, 1fr))` };
  const hasPart = m.cells.some((byDay) => byDay[day]!.some((c, hi) => fillOf(c.occ / m.hours[hi]!.len) === "part"));
  const rows: [string, DayKey[], string][] = [
    [`Ocupação ${day === "saturday" || day === "sunday" ? "no" : "na"} ${dayLong(day).toLowerCase()}`, [day], "text-brand-purple-dark"],
    ["Ocupação na semana", m.days, "text-brand-purple-dark/50"],
  ];

  return (
    <div className={cx(CARD, "overflow-x-auto p-4")}>
      <div className="grid min-w-[520px] items-stretch" style={cols}>
        <div className={cx(LABEL, "self-end pr-2 pb-2")}>Sala · Ponto</div>
        {m.hours.map((s) => (
          <div key={s.h} className="pt-1.5 pb-2 text-center text-[13px] font-extrabold text-brand-purple-dark/55 tabular-nums">
            {s.h}h
          </div>
        ))}

        {m.points.map(({ room, point, first }, pi) => {
          const top = first && pi > 0 && ROOM_TOP;
          const label = (
            <>
              <span className="truncate text-[13px] font-extrabold text-brand-purple-dark group-hover:text-brand-blue-dark group-hover:underline">
                {first ? room.name : ""}
              </span>
              <span className="grid size-[18px] flex-none place-items-center rounded-[5px] bg-brand-purple-dark/6 text-[11px] font-black text-brand-purple-dark/45">
                {point.name}
              </span>
            </>
          );
          const rowCls = cx("group flex min-w-0 items-center justify-between gap-2 py-[3px] pr-2.5 text-left", top);
          return (
            <div key={`${room.id}-${point.name}`} className="contents">
              {canEdit ? (
                <button type="button" title={`Editar ${room.name}`} className={cx(rowCls, "cursor-pointer")} onClick={() => openModal({ kind: "room", roomId: room.id })}>
                  {label}
                </button>
              ) : (
                <div className={rowCls}>{label}</div>
              )}

              {m.hours.map((s, hi) => {
                const c = m.cells[pi]![day]![hi]!;
                const f = c.occ / s.len;
                const head = `${room.name} · Ponto ${point.name} · ${s.h}h`;
                const tip = c.professional ? `${head}\n${c.professional}${c.specialty ? ` · ${c.specialty}` : ""}` : `${head}\nSem profissional`;
                return (
                  <div key={s.h} title={tip} className={cx("flex items-center p-[3px]", top)}>
                    <Dot fill={fillOf(f)} f={f} dim={Boolean(hoverProf) && c.professional !== hoverProf} />
                  </div>
                );
              })}
            </div>
          );
        })}

        {rows.map(([title, days, color], ri) => (
          <div key={title} className="contents">
            <div className={cx(LABEL, "pr-2", ri === 0 ? "mt-1.5 border-t border-neutral-100 pt-2.5 pb-1" : "pb-1.5")}>{title}</div>
            {m.hours.map((s, hi) => (
              <div
                key={s.h}
                className={cx("text-center text-[11px] font-black tabular-nums", color, ri === 0 ? "mt-1.5 border-t border-neutral-100 pt-2.5 pb-1" : "pb-1.5")}
              >
                {Math.round(hourRate(m, days, hi) * 100)}%
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-[18px] text-[13px] font-bold text-brand-purple-dark">
        <span className="flex items-center gap-2"><Dot fill="on" legend />Com profissional</span>
        {hasPart && <span className="flex items-center gap-2"><Dot fill="part" legend />Parte da hora</span>}
        <span className="flex items-center gap-2"><Dot fill="off" legend />Sem profissional</span>
      </div>
    </div>
  );
}

const SideCard = ({ title, children }: { title?: string; children: ReactNode }) => (
  <section className={cx(CARD, "flex flex-col gap-2 p-5")}>
    {title && <p className={cx(LABEL, "mb-0.5 text-brand-purple-dark/45")}>{title}</p>}
    {children}
  </section>
);

function Side({ m, day, hoverProf, setHoverProf }: { m: CapacityModel; day: DayKey; hoverProf: string | null; setHoverProf: (p: string | null) => void }) {
  const days = [day];
  const cap = m.points.length * m.hoursPerDay;
  const occ = occupiedHours(m, days);
  const rate = cap ? occ / cap : 0;
  const lv = LEVEL[levelOf(rate)];
  const profs = professionalHours(m, days);

  return (
    <aside className="flex flex-col gap-4">
      <SideCard>
        <p className="text-[15px] font-bold text-brand-purple-dark/60">
          {m.points.length} pontos × {fmtHours(m.hoursPerDay)} h
        </p>
        <p className="text-5xl leading-none font-black text-brand-purple-dark tabular-nums">{fmtHours(cap)} h</p>
        <p className="text-[13px] font-semibold text-brand-purple-dark/55">
          Capacidade física {day === "saturday" || day === "sunday" ? "no" : "na"} {dayLong(day).toLowerCase()}
        </p>

        <div className={cx("mt-2 rounded-xl p-4", lv.card)}>
          <p className={cx("text-sm font-extrabold", lv.text)}>Taxa de cobertura do espaço</p>
          <p className={cx("mt-1.5 text-[44px] leading-none font-black tabular-nums", lv.text)}>{Math.round(rate * 100)}%</p>
          <p className="mt-1.5 text-xs font-semibold text-brand-purple-dark/60">horas com profissional na escala ÷ capacidade física</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(
              [
                [occ, "com profissional"],
                [cap - occ, "sem profissional"],
              ] as const
            ).map(([h, label]) => (
              <div key={label} className="flex flex-col gap-0.5 rounded-lg bg-white px-2.5 py-2">
                <strong className="text-base font-black text-brand-purple-dark tabular-nums">{fmtHours(h)} h</strong>
                <span className="text-[11px] font-bold text-brand-purple-dark/55">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </SideCard>

      <SideCard title="Por sala">
        {roomRates(m, days).map(({ room, points, rate }) => (
          <div key={room.id} className="grid grid-cols-[minmax(0,1fr)_80px_38px] items-center gap-2.5 text-[13px]">
            <span className="truncate font-extrabold text-brand-purple-dark">
              {room.name}
              <span className="ml-1.5 text-[11px] font-bold text-brand-purple-dark/45">{pluralize(points, "ponto", "pontos")}</span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-brand-purple-dark/8">
              <span className={cx("block h-full rounded-full", LEVEL[levelOf(rate)].bar)} style={{ width: `${Math.round(rate * 100)}%` }} />
            </span>
            <span className="text-right font-black text-brand-purple-dark tabular-nums">{Math.round(rate * 100)}%</span>
          </div>
        ))}
      </SideCard>

      <SideCard title="Profissionais ocupando as salas">
        {profs.length === 0 && <p className="text-[13px] font-semibold text-brand-purple-dark/55">Nenhum profissional na escala neste dia.</p>}
        {profs.map((p) => (
          <div
            key={p.name}
            className={cx("-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-brand-purple-dark/4", hoverProf === p.name && "bg-brand-purple-dark/4")}
            onMouseEnter={() => setHoverProf(p.name)}
            onMouseLeave={() => setHoverProf(null)}
          >
            <span className="grid size-7 flex-none place-items-center rounded-lg bg-brand-blue/14 text-[11px] font-black text-brand-blue-dark">{initials(p.name)}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-brand-purple-dark">{p.name}</span>
            <span className="text-[13px] font-black text-brand-purple-dark tabular-nums">{fmtHours(p.h)} h</span>
          </div>
        ))}
      </SideCard>
    </aside>
  );
}

export function Capacity() {
  const { unit, rooms, day } = useRoomsMap();
  const m = useMemo(() => buildCapacity({ serviceHour: unit.serviceHour, rooms }), [unit.serviceHour, rooms]);
  const [hoverProf, setHoverProf] = useState<string | null>(null);

  if (m.points.length === 0) {
    return (
      <div className={cx(CARD, "p-10 text-center font-bold text-brand-purple-dark/55")}>
        <Icon name="fa-door-open" className="text-[28px] text-brand-blue" />
        <p className="mt-2">Nenhuma sala ativa com pontos de atendimento nesta unidade.</p>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
      <Grid m={m} day={day} hoverProf={hoverProf} />
      <Side m={m} day={day} hoverProf={hoverProf} setHoverProf={setHoverProf} />
    </div>
  );
}
