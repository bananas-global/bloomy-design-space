/**
 * Panorama de vagas, versão simplificada.
 *
 * Componente novo (não existe no Phoenix). Mesmas contas da versão do
 * protótipo (`panoramaModel.ts`, `Panorama.tsx`, guardada no controle "Versão
 * do Panorama"), com menos informação e menos cor:
 * 1. a resposta em uma frase: quanto falta e de quais especialidades;
 * 2. as fontes da demanda como chaves, numa linha, no formato dos filtros;
 * 3. uma tabela por especialidade (horas livres, demanda, falta, sobra), em
 *    que só a falta tem cor;
 * 4. o detalhe ao clicar na especialidade: a vaga sugerida, os períodos em
 *    que falta e a semana por horário, em dois tons (falta e sobra).
 */
import { useState } from "react";
import { Icon } from "../../components/Icon.js";
import { Input, InputSwitchCard } from "../../components/Input.js";
import type { LeadStatus, Specialty, UnitMapData } from "./fixtures.js";
import { field } from "./flow.js";
import { CALENDAR_WEEKDAYS, SHORT_WEEKDAYS, openWeekdays, unitHours } from "./model.js";
import { CellModal } from "./Panorama.js";
import { FTE, LEAD_STAGES, composition, panoramaModel, slotOf, type DemandType, type Slot, type SpecialtyModel } from "./panoramaModel.js";
import { ORDERED_SPECIALTIES, SPECIALTIES } from "./UnitHeatMap.js";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

const hh = (h: number) => `${String(h).padStart(2, "0")}h`;
const fte = (h: number) => (h / FTE).toFixed(1).replace(".", ",");
const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`);
const periodName = (id: string) => (id === "m" ? "de manhã" : "à tarde");

/** Uma chave de fonte, no formato das chaves dos filtros (`input_switch_card/1`). */
function SourceToggle({ name, label, on, onChange }: { name: string; label: string; on: boolean; onChange: (on: boolean) => void }) {
  const f = field(name, on, "panorama");
  return (
    <InputSwitchCard label={label} active={f}>
      <Input type="switch" field={f} onChange={(event) => onChange(event.target.checked)} />
    </InputSwitchCard>
  );
}

/** A semana da especialidade: falta em vermelho, sobra em cinza; clicar abre o horário. */
function WeekGrid({ data, x, useLeads, onCell }: { data: UnitMapData; x: SpecialtyModel; useLeads: boolean; onCell: (y: Slot) => void }) {
  const hours = unitHours(data);
  return (
    <div className="overflow-x-auto rounded-lg border border-brand-purple-dark/10 bg-white">
      <table
        className={cx(
          "table-fixed border-separate border-spacing-0 w-full text-xs",
          "[&_td]:border-b [&_td]:border-r [&_td]:border-brand-purple-dark/10",
          "[&_tr>td:last-child]:border-r-0 [&_tbody>tr:last-child>td]:border-b-0",
        )}
        style={{ minWidth: 112 + hours.length * 56 }}
      >
        <thead>
          <tr>
            <td className="w-28 bg-white"></td>
            {hours.map((h) => (
              <td key={h} className="py-1.5 text-center font-bold text-brand-purple-dark/70 bg-white">
                {hh(h)}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {openWeekdays(data).map((weekday) => (
            <tr key={weekday}>
              <td className="px-3 py-1.5 font-bold text-brand-purple-dark bg-white">{CALENDAR_WEEKDAYS[weekday - 1]!.split("-")[0]}</td>
              {hours.map((h) => {
                const y = slotOf(x, weekday, h);
                const gap = y.gap + (useLeads ? y.leadsOut.length : 0);
                const left = y.left;
                const empty = gap === 0 && left === 0 && y.dem.length === 0;
                return (
                  <td
                    key={h}
                    onClick={empty ? undefined : () => onCell(y)}
                    className={cx(
                      "h-8 text-center",
                      gap > 0 && "bg-brand-red/10 text-brand-red font-bold",
                      gap === 0 && left > 0 && "text-brand-purple-dark/50",
                      !empty && "cursor-pointer hover:bg-brand-blue/10",
                    )}
                    title={gap > 0 ? `Faltam ${gap}h` : left > 0 ? `${left}h livres` : undefined}
                  >
                    {gap > 0 ? `−${gap}` : left > 0 ? `+${left}` : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Detail({
  data,
  specialty,
  x,
  useLeads,
  onCell,
}: {
  data: UnitMapData;
  specialty: Specialty;
  x: SpecialtyModel;
  useLeads: boolean;
  onCell: (y: Slot) => void;
}) {
  const blocks = x.blocks.slice().sort((a, b) => b.hrs - a.hrs);
  return (
    <div className="flex flex-col gap-4 px-4 py-5 bg-brand-purple-dark/[0.02]">
      {x.need > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-sm text-brand-purple-dark">
            <b>Vaga sugerida:</b> {`${x.need}h por semana de ${SPECIALTIES[specialty].name} (cerca de ${fte(x.need)} profissional de ${FTE}h).`}
          </p>
          {blocks.length > 0 && (
            <p className="m-0 text-sm text-brand-purple-dark/80">
              <b className="text-brand-purple-dark">Onde falta:</b>{" "}
              {blocks
                .map((b) => `${SHORT_WEEKDAYS[b.weekday - 1]} ${periodName(b.period.id)} (${hh(b.from)}–${hh(b.to)}, ${b.hrs}h)`)
                .join(" · ")}
            </p>
          )}
          {x.leadNoWin > 0 && (
            <p className="m-0 text-xs text-brand-purple-dark/60">{`Inclui ${x.leadNoWin}h de leads sem disponibilidade da família preenchida, que não têm horário.`}</p>
          )}
        </div>
      ) : (
        <p className="m-0 text-sm text-brand-purple-dark">
          {x.surplus ? `A equipe cobre toda a demanda de ${SPECIALTIES[specialty].name} e sobram ${x.surplus}h livres.` : "Horas livres e demanda empatadas."}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <p className="m-0 text-xs text-brand-purple-dark/60">
          Semana por horário: <b className="text-brand-red">−N</b> horas que faltam, <b className="text-brand-purple-dark/50">+N</b> horas livres. Clique num horário para ver quem é.
        </p>
        <WeekGrid data={data} x={x} useLeads={useLeads} onCell={onCell} />
      </div>
    </div>
  );
}

export function PanoramaSimple({ data }: { data: UnitMapData }) {
  const [types, setTypes] = useState<DemandType[]>(["inc", "tbd"]);
  const [useLeads, setUseLeads] = useState(true);
  const [includeTbd, setIncludeTbd] = useState(true);
  const [fromStage, setFromStage] = useState<LeadStatus>("avaliacao");
  const [open, setOpen] = useState<Specialty | null | undefined>(undefined);
  const [cell, setCell] = useState<{ specialty: Specialty; y: Slot } | null>(null);
  const toggleType = (t: DemandType, on: boolean) => setTypes((ts) => (on ? [...ts.filter((x) => x !== t), t] : ts.filter((x) => x !== t)));

  const m = panoramaModel(data, ORDERED_SPECIALTIES, { includeTbd, types, useLeads, fromStage });
  const tbdHours = Object.values(composition(data, includeTbd).tbdProfBy).reduce((a, b) => a + (b ?? 0), 0);
  const demandOf = (s: Specialty) => m[s].demand + (useLeads ? m[s].leadNeed : 0);
  const rows = ORDERED_SPECIALTIES.filter((s) => m[s].offer || demandOf(s)).sort(
    (a, b) => m[b].need - m[a].need || demandOf(b) - demandOf(a),
  );
  const hire = rows.filter((s) => m[s].need > 0);
  const need = hire.reduce((n, s) => n + m[s].need, 0);
  // Abre com a especialidade que mais falta já expandida; `null` é "todas fechadas".
  const expanded = open === undefined ? (hire[0] ?? null) : open;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <h2 className="m-0 text-xl font-extrabold leading-tight text-brand-purple-dark">
          {need > 0 ? `${need === 1 ? "Falta" : "Faltam"} ${need}h por semana: ${list(hire.map((s) => `${SPECIALTIES[s].name} ${m[s].need}h`))}.` : "A equipe cobre toda a demanda da semana."}
        </h2>
        {need > 0 && <p className="m-0 text-sm text-brand-purple-dark/60">{`Cerca de ${fte(need)} profissional de ${FTE}h. Clique numa especialidade para ver onde falta.`}</p>}
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold text-brand-purple-dark/70">Contar na demanda:</span>
        <SourceToggle name="consider_inc" label="Pacientes sem profissional" on={types.includes("inc")} onChange={(on) => toggleType("inc", on)} />
        <SourceToggle name="consider_tbd" label="Sessões em vaga TBD" on={types.includes("tbd")} onChange={(on) => toggleType("tbd", on)} />
        <SourceToggle name="consider_leads" label="Leads" on={useLeads} onChange={setUseLeads} />
        {useLeads && (
          <span className="inline-flex items-center gap-2">
            <span className="text-sm text-brand-purple-dark/70 whitespace-nowrap">a partir de</span>
            <Input
              type="select"
              field={field("from_stage", fromStage, "panorama")}
              options={LEAD_STAGES.map((s) => [s.label, s.id] as const)}
              className="min-w-[200px]"
              onChange={(value) => value && setFromStage(value as LeadStatus)}
            />
          </span>
        )}
        <span className="mx-1 h-6 w-px bg-brand-purple-dark/10" aria-hidden="true"></span>
        <SourceToggle name="include_tbd" label={`Vagas TBD nas horas livres (${tbdHours}h)`} on={includeTbd} onChange={setIncludeTbd} />
      </section>

      {rows.length === 0 ? (
        <p className="text-center py-8 text-neutral-600">Nenhuma hora livre nem demanda na unidade para a semana.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-brand-purple-dark/10 bg-white">
          <table
            className={cx(
              "w-full border-separate border-spacing-0 text-sm",
              "[&_td]:border-b [&_td]:border-brand-purple-dark/10 [&_th]:border-b [&_th]:border-brand-purple-dark/10",
              "[&_tbody>tr:last-child>td]:border-b-0",
            )}
          >
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-brand-purple-dark/60">
                <th className="px-4 py-3 font-bold">Especialidade</th>
                <th className="px-4 py-3 font-bold text-right">Horas livres</th>
                <th className="px-4 py-3 font-bold text-right">Demanda</th>
                <th className="px-4 py-3 font-bold text-right">Falta</th>
                <th className="px-4 py-3 font-bold text-right">Sobra</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const x = m[s];
                const isOpen = expanded === s;
                const muted = x.need === 0;
                return [
                  <tr
                    key={s}
                    onClick={() => setOpen(isOpen ? null : s)}
                    aria-expanded={isOpen}
                    className={cx("cursor-pointer hover:bg-brand-purple-dark/[0.03]", muted ? "text-brand-purple-dark/50" : "text-brand-purple-dark")}
                  >
                    <td className="px-4 py-3 font-bold">{SPECIALTIES[s].name}</td>
                    <td className="px-4 py-3 text-right">{`${x.offer}h`}</td>
                    <td className="px-4 py-3 text-right">{`${demandOf(s)}h`}</td>
                    <td className={cx("px-4 py-3 text-right", x.need > 0 && "font-extrabold text-brand-red")}>{x.need > 0 ? `${x.need}h` : "–"}</td>
                    <td className="px-4 py-3 text-right">{x.surplus > 0 ? `${x.surplus}h` : "–"}</td>
                    <td className="px-4 py-3 text-center text-brand-purple-dark/40">
                      <Icon name={isOpen ? "fa-chevron-up" : "fa-chevron-down"} />
                    </td>
                  </tr>,
                  isOpen && (
                    <tr key={`${s}-detail`}>
                      <td colSpan={6} className="p-0">
                        <Detail data={data} specialty={s} x={x} useLeads={useLeads} onCell={(y) => setCell({ specialty: s, y })} />
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}

      {cell && <CellModal specialty={cell.specialty} y={cell.y} useLeads={useLeads} onClose={() => setCell(null)} />}
    </div>
  );
}
