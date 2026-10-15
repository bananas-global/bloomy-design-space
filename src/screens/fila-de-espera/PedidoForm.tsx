/**
 * Editar pedido, num `drawer_modal` aberto do painel do lead: unidade, motivo,
 * especialidades com carga semanal, disponibilidade da família e observação.
 * Ao salvar, os encaixes que continuam valendo ficam.
 *
 * Componentes do sistema: `drawer_modal`, `input` (select, number, textarea),
 * `button`, `avatar`.
 */
import { useState, type ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Avatar } from "../../components/Layout.js";
import { DrawerModal } from "../../components/Overlay.js";
import {
  DIAS_SEMANA, DIA_IDX, ESPECIALIDADES, H0, H1, MOTIVOS, UNIDADES, min,
  type Entrada, type Janela, type Pedido,
} from "./model.js";

export type PedidoData = Pick<Entrada, "unit" | "reason" | "notes" | "specialties" | "availability">;

/** Meias horas da grade, das 7h às 19h. */
const HORARIOS = Array.from({ length: (H1 - H0) * 2 + 1 }, (_, i) => `${String(H0 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
const opts = (l: readonly string[]) => l.map((x) => ({ label: x, value: x }));
const val = (e: unknown) => (e && typeof e === "object" && "target" in e ? (e as { target: { value: string } }).target.value : String(e ?? ""));

type Form = { unit: string; reason: string; notes: string; specialties: { spec: string; hours: string }[]; availability: Janela[] };

function Secao({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-brand-purple-dark">{label}</p>
      {children}
    </div>
  );
}

function Remover({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <Button variant="tint" color="red" aria-label={label} title="Remover" disabled={disabled} onClick={onClick} className="disabled:opacity-40">
      <Icon name="fa-trash-can" className="self-center" />
    </Button>
  );
}

function Adicionar({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <Button variant="ghost" size="small" leftIcon="fa-plus" onClick={onClick} className="self-start">
      {children}
    </Button>
  );
}

export function PedidoForm({
  show,
  entry,
  onClose,
  onConfirm,
}: {
  show: boolean;
  /** A entrada da fila. */
  entry: Entrada;
  onClose: () => void;
  onConfirm: (data: PedidoData) => void;
}) {
  const [f, setF] = useState<Form>(() => {
    const specs = entry.specialties.filter((s) => s.spec).map((s) => ({ spec: s.spec, hours: String(s.hours || "") }));
    const av = entry.availability.filter((w) => DIA_IDX[w.day] != null).map((w) => ({ ...w }));
    return {
      unit: entry.unit,
      reason: entry.reason,
      notes: entry.notes,
      specialties: specs.length ? specs : [{ spec: "", hours: "" }],
      availability: av.length ? av : [{ day: "", from: "08:00", to: "12:00" }],
    };
  });
  const up = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const upRow = <K extends "specialties" | "availability">(k: K, i: number, patch: Partial<Form[K][number]>) =>
    setF((x) => ({ ...x, [k]: (x[k] as object[]).map((row, j) => (j === i ? { ...row, ...patch } : row)) }));
  const addRow = <K extends "specialties" | "availability">(k: K, row: Form[K][number]) => setF((x) => ({ ...x, [k]: [...x[k], row] }));
  const rmRow = (k: "specialties" | "availability", i: number) =>
    setF((x) => ({ ...x, [k]: x[k].length > 1 ? (x[k] as object[]).filter((_, j) => j !== i) : x[k] }));

  const specs: Pedido[] = f.specialties.filter((s) => s.spec && Number(s.hours) > 0).map((s) => ({ spec: s.spec, hours: Number(s.hours) }));
  const av = f.availability.filter((w) => w.day && w.from && w.to && min(w.to) > min(w.from)).map((w) => ({ ...w }));
  const valid = specs.length > 0 && av.length > 0;
  const chosen = f.specialties.map((s) => s.spec);
  const confirm = () => onConfirm({ unit: f.unit, reason: f.reason, notes: f.notes.trim(), specialties: specs, availability: av });

  const body = (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-xl bg-blue-light p-3">
        <Avatar size="medium" />
        <div>
          <p className="font-extrabold text-brand-purple-dark">{entry.child}</p>
          <p className="text-xs font-semibold text-brand-purple-dark/70">{`${entry.age} anos · ${entry.guardian} · ${entry.phone}`}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="pedido-unidade" type="select" label="Unidade preferida" options={opts(UNIDADES)} value={f.unit} clear={false} onChange={(v) => up("unit", v ?? f.unit)} />
        <Input id="pedido-motivo" type="select" label="Motivo da espera" options={opts(MOTIVOS)} value={f.reason} clear={false} onChange={(v) => up("reason", v ?? f.reason)} />
      </div>
      <Secao label="Especialidades e carga semanal">
        {f.specialties.map((s, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_124px_48px] items-end gap-2">
            <Input
              id={`pedido-esp-${i}`}
              type="select"
              aria-label="Especialidade"
              prompt="Selecionar especialidade"
              options={opts(ESPECIALIDADES.filter((x) => x === s.spec || !chosen.includes(x)))}
              value={s.spec || null}
              onChange={(v) => upRow("specialties", i, { spec: v ?? "" })}
            />
            <Input id={`pedido-horas-${i}`} type="number" min={1} max={40} placeholder="h/sem" aria-label="Horas por semana" value={s.hours} onChange={(e) => upRow("specialties", i, { hours: val(e) })} />
            <Remover label="Remover especialidade" disabled={f.specialties.length === 1} onClick={() => rmRow("specialties", i)} />
          </div>
        ))}
        <Adicionar onClick={() => addRow("specialties", { spec: "", hours: "" })}>Adicionar especialidade</Adicionar>
      </Secao>
      <Secao label="Disponibilidade da família">
        {f.availability.map((w, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_104px_104px_48px] items-end gap-2">
            <Input id={`pedido-dia-${i}`} type="select" aria-label="Dia da semana" prompt="Dia da semana" options={opts(DIAS_SEMANA)} value={w.day || null} onChange={(v) => upRow("availability", i, { day: v ?? "" })} />
            <Input
              id={`pedido-de-${i}`}
              type="select"
              aria-label="Das"
              clear={false}
              options={opts(HORARIOS.slice(0, -1))}
              value={w.from}
              onChange={(v) => {
                const from = v ?? w.from;
                upRow("availability", i, min(w.to) > min(from) ? { from } : { from, to: HORARIOS.find((t) => min(t) > min(from)) ?? w.to });
              }}
            />
            <Input id={`pedido-ate-${i}`} type="select" aria-label="Até" clear={false} options={opts(HORARIOS.filter((t) => min(t) > min(w.from)))} value={w.to} onChange={(v) => upRow("availability", i, { to: v ?? w.to })} />
            <Remover label="Remover horário" disabled={f.availability.length === 1} onClick={() => rmRow("availability", i)} />
          </div>
        ))}
        <Adicionar onClick={() => addRow("availability", { day: "", from: "08:00", to: "12:00" })}>Adicionar horário</Adicionar>
      </Secao>
      <Input id="pedido-obs" type="textarea" label="Observação" rows={3} placeholder="Ex.: prefere horários logo depois da escola" value={f.notes} onChange={(e) => up("notes", e.target.value)} />
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <Button variant="ghost" onClick={onClose}>
        Cancelar
      </Button>
      <Button disabled={!valid} onClick={confirm} rightIcon="fa-check" className="disabled:opacity-50">
        Salvar pedido
      </Button>
    </div>
  );

  return (
    <DrawerModal id="fila-pedido" show={show} title="Editar pedido" variant="custom" customSize="max-w-[640px] rounded-l-none!" contentClass="flex flex-col p-0!" onCancel={onClose}>
      <div className="flex-1 p-6">{body}</div>
      <div className="sticky bottom-0 border-t border-neutral-100 bg-white px-6 py-4">{footer}</div>
    </DrawerModal>
  );
}
