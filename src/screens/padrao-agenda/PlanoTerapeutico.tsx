/**
 * Pré-visualização do Plano Terapêutico: o resumo da semana padrão para envio à
 * operadora. Do `Plano Terapeutico Modal` do protótipo, no `modal/1`.
 */
import { Button } from "../../components/Button.js";
import { Modal } from "../../components/Overlay.js";
import { DAYS_FULL, SHORT, SPECS, TODAY, WEEKDAYS, br, first, hh, range, type AgendaItem, type Vigencia } from "./model.js";

const label = "font-bold text-neutral-500";
const section = "m-0 mb-1 text-[13px] font-black uppercase tracking-[.06em] text-neutral-500";

export function PlanoTerapeutico({ show, onClose, patientName, unitName, vigencia, items }: {
  show: boolean;
  onClose: () => void;
  patientName: string;
  unitName?: string;
  vigencia: Vigencia;
  items: AgendaItem[];
}) {
  const bySpec = SPECS.map((s) => {
    const its = items.filter((i) => i.slug === s.slug);
    return {
      name: s.name,
      n: its.length,
      detail: `${[...new Set(its.map((i) => i.service))].join(", ")} · ${[...new Set(its.map((i) => i.professional))].join(", ")}`,
    };
  }).filter((s) => s.n);
  const dayRows = WEEKDAYS.map((wd, i) => {
    const its = items.filter((x) => x.weekday === wd).sort((a, b) => a.hour - b.hour);
    return {
      label: DAYS_FULL[i]!,
      n: its.length,
      text: its.length ? its.map((x) => `${hh(x.hour)} ${SHORT[x.slug]}${x.type === "at" ? " (AT)" : ""} · ${first(x.professional)}`).join("   ") : "Sem atendimentos",
    };
  });

  return (
    <Modal id="plano_terapeutico" show={show} title="Plano Terapêutico" variant="large" onCancel={onClose}>
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[13px] font-semibold text-neutral-500">Pré-visualização do resumo da semana padrão para envio à operadora.</p>
        <div className="max-h-[60vh] overflow-y-auto p-5 rounded-xl bg-background">
          <article className="max-w-[640px] mx-auto px-10 py-9 bg-white rounded-md shadow-[0_2px_12px_rgba(43,35,91,.10)] flex flex-col gap-[22px] text-brand-purple-dark">
            <header className="flex justify-between items-end gap-4 pb-3.5 border-b-2 border-brand-purple-dark">
              <span className="text-[22px] font-black tracking-[-.02em]">bloomy</span>
              <div className="text-right">
                <h1 className="m-0 text-lg font-black">Plano Terapêutico</h1>
                <p className="m-0 text-xs font-semibold text-neutral-500">Semana padrão de atendimentos</p>
              </div>
            </header>
            <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-2.5 text-[12.5px]">
              <div><dt className={label}>Paciente</dt><dd className="m-0 font-extrabold">{patientName}</dd></div>
              <div><dt className={label}>Unidade</dt><dd className="m-0 font-extrabold">{unitName ?? "-"}</dd></div>
              <div><dt className={label}>Vigência</dt><dd className="m-0 font-extrabold">{range(vigencia).replace(" – ", " até ")}</dd></div>
              <div><dt className={label}>Emitido em</dt><dd className="m-0 font-extrabold">{br(TODAY)}</dd></div>
            </dl>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="px-3.5 py-3 rounded-lg bg-neutral-50"><b className="block text-[22px] font-black">{items.length}</b><span className="text-xs font-bold text-neutral-500">sessões por semana</span></div>
              <div className="px-3.5 py-3 rounded-lg bg-neutral-50"><b className="block text-[22px] font-black">{dayRows.filter((d) => d.n).length}</b><span className="text-xs font-bold text-neutral-500">dias com atendimento</span></div>
            </div>
            <section className="flex flex-col gap-1.5">
              <h3 className={section}>Carga por especialidade</h3>
              {bySpec.map((s) => (
                <div key={s.name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2 border-b border-neutral-100 text-[12.5px]">
                  <div><b className="font-extrabold">{s.name}</b><p className="mt-0.5 mb-0 font-semibold text-neutral-500">{s.detail}</p></div>
                  <b className="font-black">{s.n}h</b>
                </div>
              ))}
            </section>
            <section className="flex flex-col gap-1.5">
              <h3 className={section}>Semana padrão</h3>
              {dayRows.map((d) => (
                <div key={d.label} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 py-1.5 text-[12.5px]">
                  <b className="font-extrabold">{d.label}</b>
                  <span className="font-semibold text-neutral-600 whitespace-pre-wrap">{d.text}</span>
                </div>
              ))}
            </section>
          </article>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="tint" onClick={onClose}>Fechar</Button>
          <Button type="button" color="blue" rightIcon="fa-file-pdf">Baixar PDF</Button>
        </div>
      </div>
    </Modal>
  );
}
