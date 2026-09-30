/**
 * Mapa de Salas — a gaveta de um trecho do ponto.
 *
 * Abre de três jeitos, com o mesmo formulário:
 * - Horário vazio da faixa: define o padrão do ponto (o que a unidade
 *   precisa). Escolher um profissional já o aloca.
 * - Trecho "Alocar": aloca alguém no planejado sem ninguém, com quem tem
 *   escala livre na unidade primeiro.
 * - Card com profissional: edita a alocação, e o padrão quando cobre o mesmo
 *   trecho. Se cobre só parte, trocar a especialidade divide o padrão.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { RadioSelector } from "../../components/Choice.js";
import { Input } from "../../components/Input.js";
import { DrawerModal } from "../../components/Overlay.js";
import { PROFESSIONALS } from "./fixtures.js";
import {
  SPECIALTIES,
  allocTypeOf,
  hhmm,
  periodDays,
  periodValidOn,
  planTypeOf,
  roomLabel,
  specAbbr,
  toMin,
  type AllocBlock,
  type DayKey,
  type Gap,
  type Period,
  type PlanType,
  type Room,
  type ServicePoint,
} from "./model.js";
import { DRAWER_SIZE, DayPicker, DrawerFooter, Note, Warn } from "./parts.js";
import { useRoomsMap, type PlanInput } from "./store.js";

type Form = { specialty: string; professional: string; planType: PlanType; start: number; end: number; days: DayKey[] };

type Props = {
  room: Room;
  point: ServicePoint;
  /** Hora cheia clicada (novo padrão). */
  from?: number;
  gap?: Gap;
  b?: AllocBlock;
  onSave: (entry: PlanInput, professional: string | null) => void;
};

export function PlanDrawer({ room, point, from = 0, gap, b, onSave }: Props) {
  const { rooms, days: unitDays, day, model, closeModal } = useRoomsMap();
  const { dayStart, dayEnd, refISO } = model;
  const sp = room.servicePoints.find((s) => s.name === point.name) ?? point;
  const host = b ? b.host : gap ? gap.plan : null;
  // O padrão só é editado junto quando cobre exatamente o mesmo trecho do card.
  const linked = Boolean(b && host && host.from === b.from && host.to === b.to);
  // Trecho parcial do padrão: ao salvar outra especialidade, o padrão é dividido nesse trecho.
  const partialPlan = Boolean(host && !linked);
  const skipPlan = host ? host._src : null;
  const skipPeriod = b ? b._src : null;

  const [d, setD] = useState<Form>(() => {
    if (gap) return { specialty: gap.plan.specialty, professional: "", planType: planTypeOf(gap.plan), start: gap.from, end: gap.to, days: [day] };
    if (b)
      return {
        specialty: host ? host.specialty : b.specialty,
        professional: b.professional,
        start: b.from,
        end: b.to,
        planType: allocTypeOf(b._src),
        days: periodDays(b._src, unitDays),
      };
    const nextStart = Math.min(dayEnd, ...sp.plan.filter((pl) => periodDays(pl, unitDays).includes(day) && toMin(pl.start) > from).map((pl) => toMin(pl.start)));
    return { specialty: "", professional: "", planType: "fixed", start: from, end: Math.min(nextStart, from + 60 * 4), days: [day] };
  });
  const [init] = useState(() => JSON.stringify(d));
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setD((x) => ({ ...x, [k]: v }));
  const [anySpec, setAnySpec] = useState(() => Boolean(b && b.status === "divergent" && host && b.specialty !== host.specialty));

  const hours: number[] = [];
  for (let m = Math.ceil(dayStart / 60) * 60; m <= dayEnd; m += 60) hours.push(m);
  const hit = (pr: { start: string; end: string; days?: DayKey[] | null }) =>
    periodDays(pr, unitDays).some((k) => d.days.includes(k)) && toMin(pr.start) < d.end && toMin(pr.end) > d.start;
  // Alocação que ainda não começou ou já terminou não ocupa o ponto (a mesma regra do mapa).
  const busy = (pr: Period) => pr.professional && periodValidOn(pr, refISO) && hit(pr);
  const clash = sp.plan.find((pl) => pl !== skipPlan && hit(pl));
  const busyElsewhere =
    d.professional &&
    rooms.some((r) => r.servicePoints.some((s) => !(r.id === room.id && s.name === point.name) && s.periods.some((pr) => pr.professional === d.professional && busy(pr))));
  const clashAlloc = sp.periods.find((pr) => pr !== skipPeriod && busy(pr));
  const err =
    d.end <= d.start
      ? "O fim precisa ser depois do início."
      : clash
        ? `Já existe padrão ${clash.specialty} ${clash.start}–${clash.end} neste ponto em um dos dias escolhidos.`
        : d.days.length === 0
          ? "Escolha ao menos um dia."
          : d.professional && busyElsewhere
            ? `${d.professional} já está em outro ponto neste horário.`
            : d.professional && clashAlloc
              ? `${clashAlloc.professional} já está neste ponto ${clashAlloc.start}–${clashAlloc.end}.`
              : null;
  const dirty = JSON.stringify(d) !== init;
  const ok = Boolean(d.specialty) && !err && (dirty || !(b || gap));

  const pros: { name: string; specialty?: string }[] = PROFESSIONALS.filter((x) => x.active && (anySpec || !d.specialty || x.specialty === d.specialty));
  if (b && !pros.some((x) => x.name === b.professional)) pros.unshift({ name: b.professional });
  const free = gap ? gap.candidates.filter((c) => !c.busy) : [];
  const proOpts: [string, string][] = [
    ...free
      .filter((c) => anySpec || c.specialty === d.specialty)
      .map((c): [string, string] => [`${c.professional} · escala livre ${c.start}–${c.end}${c.specialty !== gap!.plan.specialty ? " · " + specAbbr(c.specialty) : ""}`, c.professional]),
    ...pros.filter((x) => !free.some((c) => c.professional === x.name)).map((x): [string, string] => [anySpec && x.specialty ? `${x.name} · ${specAbbr(x.specialty)}` : x.name, x.name]),
  ];

  const code = `${roomLabel(room)}·${point.name}`;
  const title = gap ? `${code} · ${hhmm(gap.from)}–${hhmm(gap.to)}` : b ? `${code} · ${hhmm(b.from)}–${hhmm(b.to)}` : `Padrão · ${code}`;

  return (
    <DrawerModal id="mapa-salas-trecho" show onCancel={closeModal} variant="custom" customSize={DRAWER_SIZE} contentClass="flex flex-col" title={title}>
      <div className="flex flex-1 flex-col gap-6">
        {!b && !gap && (
          <p className="text-sm text-brand-purple-dark/60 text-pretty">
            Define o que a unidade <strong className="text-brand-purple-dark">precisa</strong> neste ponto. Se escolher um profissional, ele já fica alocado e a
            Escala dele passa a apontar para este ponto.
          </p>
        )}

        <div className="grid grid-cols-2 items-start gap-4">
          <Input
            id="mapa-salas-trecho-especialidade"
            type="select"
            label="Especialidade"
            prompt="Selecione"
            clear={false}
            value={d.specialty}
            options={SPECIALTIES.map((s): [string, string] => [s, s])}
            onChange={(v) => setD((x) => ({ ...x, specialty: v ?? "", professional: b || anySpec ? x.professional : "" }))}
          />
          <Input
            id="mapa-salas-trecho-profissional"
            type="select"
            label="Profissional"
            prompt={b ? "Sem profissional" : gap ? "Selecione" : d.specialty ? "Sem profissional por enquanto" : "Escolha a especialidade"}
            value={d.professional}
            options={proOpts}
            disabled={!b && !gap && !d.specialty}
            onChange={(v) => set("professional", v ?? "")}
          />
          <div className="col-span-2 -mt-2">
            <Input
              id="mapa-salas-trecho-outra-especialidade"
              type="checkbox"
              label="Profissional de outra especialidade"
              checked={anySpec}
              onChange={(e) => {
                const on = e.target.checked;
                setAnySpec(on);
                if (!on && d.professional) {
                  const pr = PROFESSIONALS.find((x) => x.name === d.professional);
                  if (pr && pr.specialty !== d.specialty) set("professional", "");
                }
              }}
            />
            {anySpec && <p className="px-4 text-sm font-semibold text-orange-dark">Vai aparecer como conflito no mapa.</p>}
          </div>
          <Input
            id="mapa-salas-trecho-inicio"
            type="select"
            label="Início"
            clear={false}
            value={String(d.start)}
            options={hours.slice(0, -1).map((m): [string, string] => [hhmm(m), String(m)])}
            onChange={(v) => set("start", Number(v))}
          />
          <Input
            id="mapa-salas-trecho-fim"
            type="select"
            label="Fim"
            clear={false}
            value={String(d.end)}
            options={hours.slice(1).map((m): [string, string] => [hhmm(m), String(m)])}
            onChange={(v) => set("end", Number(v))}
          />
        </div>

        <RadioSelector
          label="Tipo"
          className="inline-flex"
          field={{ id: "mapa-salas-trecho-tipo", name: "trecho[tipo]", value: d.planType }}
          radio={[
            { value: "fixed", label: "Fixo" },
            { value: "temporary", label: "Temporário" },
          ]}
          onChange={(e) => set("planType", e.target.value as PlanType)}
        />

        <DayPicker id="mapa-salas-trecho-dias" value={d.days} unitDays={unitDays} onChange={(v) => set("days", v)} />

        {err && <Warn>{err}</Warn>}
        {b && b.status === "divergent" && host && (
          <Warn>
            {b.professional} ({specAbbr(b.specialty)}) difere do planejado ({specAbbr(host.specialty)}).
          </Warn>
        )}
        {partialPlan && host && d.specialty !== host.specialty && (
          <Note>
            O padrão {host.specialty} {hhmm(host.from)}–{hhmm(host.to)} será dividido: {hhmm(d.start)}–{hhmm(d.end)} passa a ser {d.specialty}.
          </Note>
        )}
      </div>

      <DrawerFooter>
        <Button type="button" variant="ghost" color="red" onClick={closeModal}>
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={!ok}
          className="disabled:opacity-50"
          onClick={() => onSave({ start: hhmm(d.start), end: hhmm(d.end), specialty: d.specialty, planType: d.planType, days: d.days }, d.professional || null)}
        >
          Salvar
        </Button>
      </DrawerFooter>
    </DrawerModal>
  );
}
