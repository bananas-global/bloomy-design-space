/**
 * Mapa de Salas — a gaveta do planejado (linha de cima da faixa).
 *
 * Abre num horário vazio (adiciona um trecho ao planejamento do ponto) ou num
 * trecho já planejado (edita ou remove). Define só o que a unidade precisa:
 * especialidade, horário, tipo e dias. Quem atende vem do perfil do
 * profissional e aparece na linha de baixo, só para referência.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { RadioSelector } from "../../components/Choice.js";
import { Input } from "../../components/Input.js";
import { DrawerModal } from "../../components/Overlay.js";
import {
  SPECIALTIES,
  hhmm,
  periodDays,
  periodValidOn,
  planTypeOf,
  roomLabel,
  specAbbr,
  toMin,
  type DayKey,
  type PlanBlock,
  type PlanType,
  type Room,
  type ServicePoint,
} from "./model.js";
import { DRAWER_SIZE, DayPicker, DrawerFooter, Note, Warn } from "./parts.js";
import { useRoomsMap } from "./store.js";

type Form = { specialty: string; planType: PlanType; start: number; end: number; days: DayKey[] };

type Props = {
  room: Room;
  point: ServicePoint;
  /** Hora cheia clicada (novo trecho). */
  from?: number;
  /** O trecho editado. */
  pl?: PlanBlock;
};

export function PlanDrawer({ room, point, from = 0, pl }: Props) {
  const { days: unitDays, day, model, addPlan, updatePlan, removePlan, closeModal } = useRoomsMap();
  const { dayStart, dayEnd, refISO } = model;
  const sp = room.servicePoints.find((s) => s.name === point.name) ?? point;

  const [d, setD] = useState<Form>(() => {
    if (pl) return { specialty: pl.specialty, planType: planTypeOf(pl), start: toMin(pl._src.start), end: toMin(pl._src.end), days: periodDays(pl._src, unitDays) };
    const nextStart = Math.min(dayEnd, ...sp.plan.filter((x) => periodDays(x, unitDays).includes(day) && toMin(x.start) > from).map((x) => toMin(x.start)));
    return { specialty: "", planType: "fixed", start: from, end: Math.min(nextStart, from + 60 * 4), days: [day] };
  });
  const [init] = useState(() => JSON.stringify(d));
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setD((x) => ({ ...x, [k]: v }));

  const hours: number[] = [];
  for (let m = Math.ceil(dayStart / 60) * 60; m <= dayEnd; m += 60) hours.push(m);
  const hit = (x: { start: string; end: string; days?: DayKey[] | null }) =>
    periodDays(x, unitDays).some((k) => d.days.includes(k)) && toMin(x.start) < d.end && toMin(x.end) > d.start;
  const clash = sp.plan.find((x) => x !== pl?._src && hit(x));
  const err =
    d.end <= d.start
      ? "O fim precisa ser depois do início."
      : clash
        ? `Já existe planejado ${clash.specialty} ${clash.start}–${clash.end} neste ponto em um dos dias escolhidos.`
        : d.days.length === 0
          ? "Escolha ao menos um dia."
          : null;
  const ok = Boolean(d.specialty) && !err && (!pl || JSON.stringify(d) !== init);
  // Quem o perfil dos profissionais aponta para este ponto no horário: só referência.
  const onSite = sp.periods.filter((p) => p.professional && periodValidOn(p, refISO) && hit(p));

  const code = `${roomLabel(room)}·${point.name}`;
  const entry = () => ({ start: hhmm(d.start), end: hhmm(d.end), specialty: d.specialty, planType: d.planType, days: d.days });

  return (
    <DrawerModal
      id="mapa-salas-planejado"
      show
      onCancel={closeModal}
      variant="custom"
      customSize={DRAWER_SIZE}
      contentClass="flex flex-col"
      title={pl ? `Planejado · ${code}` : `Novo planejado · ${code}`}
    >
      <div className="flex flex-1 flex-col gap-6">
        <p className="text-sm text-brand-purple-dark/60 text-pretty">
          Define o que a unidade <strong className="text-brand-purple-dark">precisa</strong> neste ponto. Quem atende vem do perfil de cada profissional.
        </p>

        <Input
          id="mapa-salas-planejado-especialidade"
          type="select"
          label="Especialidade"
          prompt="Selecione"
          clear={false}
          value={d.specialty}
          options={SPECIALTIES.map((s): [string, string] => [s, s])}
          onChange={(v) => set("specialty", v ?? "")}
        />
        <div className="grid grid-cols-2 items-start gap-4">
          <Input
            id="mapa-salas-planejado-inicio"
            type="select"
            label="Início"
            clear={false}
            value={String(d.start)}
            options={hours.slice(0, -1).map((m): [string, string] => [hhmm(m), String(m)])}
            onChange={(v) => set("start", Number(v))}
          />
          <Input
            id="mapa-salas-planejado-fim"
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
          field={{ id: "mapa-salas-planejado-tipo", name: "planejado[tipo]", value: d.planType }}
          radio={[
            { value: "fixed", label: "Fixo" },
            { value: "temporary", label: "Temporário" },
          ]}
          onChange={(e) => set("planType", e.target.value as PlanType)}
        />

        <DayPicker id="mapa-salas-planejado-dias" value={d.days} unitDays={unitDays} onChange={(v) => set("days", v)} />

        {err && <Warn>{err}</Warn>}
        {onSite.length > 0 && (
          <Note icon="fa-user">
            Na escala neste horário:{" "}
            {onSite.map((p) => `${p.professional} (${specAbbr(p.specialty)}, ${p.start}–${p.end})`).join(", ")}. Vem do perfil do profissional.
          </Note>
        )}
      </div>

      <DrawerFooter>
        {pl && (
          <Button type="button" variant="tint" color="red" leftIcon="fa-trash" className="mr-auto" onClick={() => removePlan(room, point, pl)}>
            Remover
          </Button>
        )}
        <Button type="button" variant="ghost" color="red" onClick={closeModal}>
          Cancelar
        </Button>
        <Button type="button" disabled={!ok} className="disabled:opacity-50" onClick={() => (pl ? updatePlan(room, point, pl, entry()) : addPlan(room, point, entry()))}>
          Salvar
        </Button>
      </DrawerFooter>
    </DrawerModal>
  );
}
