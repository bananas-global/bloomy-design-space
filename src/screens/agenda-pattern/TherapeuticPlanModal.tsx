/**
 * Plano Terapêutico — novo, não existe no Phoenix.
 *
 * Substitui o PDF que o botão verde "Padrão de Agenda" baixa direto
 * (`generate_pdf` + hook `DownloadFile`): o botão passa a se chamar "Plano
 * Terapêutico" e abre este modal em tela cheia, com a pré-visualização numa
 * folha A4 à esquerda e as opções à direita. A folha resume a semana padrão
 * para a operadora: carga por especialidade e a rotina de cada dia.
 * "Baixar PDF" imprime só a folha.
 *
 * No Phoenix, o PDF sairia do mesmo jeito que o atual: um template HEEx
 * renderizado no servidor, agora com as opções do modal. Componentes usados:
 * `modal/1` (variant custom, sem `title`: o título e o fechar ficam no painel
 * lateral), `switch_card/1`, `input/1` (textarea) e `button/1`.
 */
import { useState } from "react";
import logo from "../../assets/bloomy-logo.svg";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input, SwitchCard } from "../../components/Input.js";
import { Modal } from "../../components/Overlay.js";
import { SPECIALTIES, TODAY, type AgendaItem, type HourMap, type SpecialtySlug } from "./fixtures.js";
import { cx, formatHour, WEEKDAY_NAMES, WEEKDAYS } from "./parts.js";
import "./print.css";

/** A cor de cada especialidade na folha, a mesma de `specialty_card_colors/1`. */
const DOC_TONE: Record<SpecialtySlug, { dot: string; card: string }> = {
  psychology: { dot: "bg-brand-green", card: "bg-brand-green/10" },
  phonoaudiology: { dot: "bg-brand-blue", card: "bg-brand-blue/10" },
  occupational_therapy: { dot: "bg-brand-purple", card: "bg-brand-purple/10" },
  physiotherapy: { dot: "bg-brand-orange", card: "bg-brand-orange/10" },
  music_therapy: { dot: "bg-pink", card: "bg-pink/10" },
};

type Props = { onCancel: () => void; patientName: string; hourMap: HourMap; items: AgendaItem[] };

export function TherapeuticPlanModal({ show, ...props }: Props & { show: boolean }) {
  return (
    <Modal
      id="therapeutic_plan_modal"
      show={show}
      onCancel={props.onCancel}
      aria-label="Plano Terapêutico"
      variant="custom"
      customSize="h-full max-h-full! rounded-none! m-0! flex flex-col [&>div:last-child]:flex-1 [&>div:last-child]:min-h-0"
      withPadding={false}
    >
      <TherapeuticPlanBody {...props} />
    </Modal>
  );
}

/** Montado junto com o modal: as opções voltam ao padrão a cada abertura. */
function TherapeuticPlanBody({ onCancel, patientName, hourMap, items }: Props) {
  const [showProfessional, setShowProfessional] = useState(true);
  const [showRoom, setShowRoom] = useState(false);
  const [notes, setNotes] = useState("");
  const [zoom, setZoom] = useState(1);

  const bySpecialty = SPECIALTIES.map((specialty) => {
    const list = items.filter((item) => item.specialty === specialty.slug);
    return {
      ...specialty,
      hours: list.length,
      services: [...new Set(list.map((item) => item.service))],
      professionals: [...new Set(list.map((item) => item.professional).filter(Boolean))],
      open: list.some((item) => !item.professional),
    };
  }).filter((specialty) => specialty.hours > 0);
  const total = items.length;
  const withoutProfessional = items.filter((item) => !item.professional).length;
  const days = WEEKDAYS.map((weekday, i) => ({
    label: WEEKDAY_NAMES[i]!,
    items: items.filter((item) => item.weekday === weekday).sort((a, b) => a.hour - b.hour),
  }));
  const activeDays = days.filter((day) => day.items.length > 0).length;
  // Todas as sessões com a mesma altura, para as linhas da rotina alinharem.
  const sessionLines = 4 + (showProfessional ? 1 : 0) + (showRoom ? 1 : 0);

  const zoomBy = (delta: number) => setZoom((z) => Math.min(2, Math.max(0.5, Math.round((z + delta) * 10) / 10)));

  function download() {
    const previous = document.title;
    document.title = `Plano Terapêutico - ${patientName}`;
    document.body.classList.add("tp-printing");
    const done = () => {
      document.body.classList.remove("tp-printing");
      document.title = previous;
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.setTimeout(() => window.print(), 50);
  }

  const th = "text-left text-[10px] font-black uppercase tracking-wider text-brand-purple-dark/55 px-2 py-1.5 border-b border-neutral-100";
  const td = "px-2 py-[7px] border-b border-neutral-100 align-top";
  const sectionTitle = "mb-2 text-[13px] font-black uppercase tracking-wide text-brand-blue-dark";

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="relative bg-background overflow-auto p-7 max-lg:order-2">
        <div className="sticky top-0 z-10 float-right -mt-3 -mr-3 flex items-center gap-0.5 p-1 bg-white rounded-lg shadow-main print:hidden">
          <Button type="button" variant="ghost" size="small" aria-label="Diminuir zoom" disabled={zoom <= 0.5} onClick={() => zoomBy(-0.1)}>
            <Icon name="fa-minus" />
          </Button>
          <Button type="button" variant="ghost" size="small" title="Redefinir zoom" className="min-w-13" onClick={() => setZoom(1)}>
            {`${Math.round(zoom * 100)}%`}
          </Button>
          <Button type="button" variant="ghost" size="small" aria-label="Aumentar zoom" disabled={zoom >= 2} onClick={() => zoomBy(0.1)}>
            <Icon name="fa-plus" />
          </Button>
        </div>

        <article
          className="tp-doc mx-auto w-[210mm] min-h-[297mm] bg-white shadow-main box-border px-[14mm] py-[16mm] flex flex-col gap-[18px] text-brand-purple-dark"
          style={{ zoom }}
        >
          <header className="flex items-center justify-between gap-4 pb-3.5 border-b-2 border-brand-blue">
            <img src={logo} alt="bloomy" className="h-[34px]" />
            <div className="text-right">
              <h1 className="text-[22px] font-black">Plano Terapêutico</h1>
              <p className="mt-0.5 text-xs text-brand-purple-dark/60">Semana padrão de atendimentos</p>
            </div>
          </header>

          <dl className="grid grid-cols-[2fr_1.2fr_1fr_1fr] gap-3">
            {[
              ["Paciente", patientName],
              ["Operadora", hourMap.operator],
              ["Unidade", hourMap.unitName],
              ["Emitido em", TODAY],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] font-black uppercase tracking-wider text-brand-purple-dark/55">{label}</dt>
                <dd className="mt-0.5 text-[13px] font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>

          <section className="grid grid-cols-4 gap-2">
            {[
              [total, "sessões por semana"],
              [`${total}h`, "carga horária semanal"],
              [bySpecialty.length, bySpecialty.length === 1 ? "especialidade" : "especialidades"],
              [activeDays, "dias com atendimento"],
            ].map(([value, label]) => (
              <div key={String(label)} className="px-3 py-2.5 rounded-[10px] bg-brand-blue/10">
                <b className="block text-xl font-black text-brand-blue-dark">{value}</b>
                <span className="text-[11px] font-bold text-brand-purple-dark/65">{label}</span>
              </div>
            ))}
          </section>

          <section>
            <h2 className={sectionTitle}>Carga por especialidade</h2>
            <table className="w-full border-collapse text-[11.5px]">
              <thead>
                <tr>
                  <th className={th}>Especialidade</th>
                  <th className={th}>Serviços</th>
                  {showProfessional && <th className={th}>Profissionais</th>}
                  <th className={cx(th, "text-right!")}>Horas/sem</th>
                </tr>
              </thead>
              <tbody>
                {bySpecialty.map((specialty) => (
                  <tr key={specialty.slug}>
                    <td className={cx(td, "font-extrabold whitespace-nowrap")}>
                      <span className={cx("inline-block size-2 rounded-full mr-[7px] align-[1px]", DOC_TONE[specialty.slug].dot)} />
                      {specialty.name}
                    </td>
                    <td className={td}>{specialty.services.join(", ")}</td>
                    {showProfessional && <td className={td}>{[...specialty.professionals, ...(specialty.open ? ["A definir"] : [])].join(", ")}</td>}
                    <td className={cx(td, "text-right whitespace-nowrap")}>{`${specialty.hours}h`}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-black">
                  <td className="px-2 py-[7px]" colSpan={showProfessional ? 3 : 2}>
                    Total
                  </td>
                  <td className="px-2 py-[7px] text-right">{`${total}h`}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section>
            <h2 className={sectionTitle}>Rotina semanal</h2>
            <div className="grid grid-cols-5 gap-1.5">
              {days.map((day) => (
                <div key={day.label} className="flex flex-col gap-[5px]">
                  <p className="flex justify-between px-2 py-1.5 rounded-md bg-brand-purple-dark text-white text-[11px] font-black">
                    {day.label}
                    <em className="not-italic opacity-75">{day.items.length ? `${day.items.length}h` : "—"}</em>
                  </p>
                  {day.items.length === 0 && <p className="p-2 text-[10.5px] text-center text-brand-purple-dark/50">Sem atendimento</p>}
                  {day.items.map((item) => (
                    <div
                      key={item.id}
                      className={cx("box-border overflow-hidden break-inside-avoid px-[7px] py-1.5 rounded-md leading-[14px]", DOC_TONE[item.specialty].card)}
                      style={{ height: sessionLines * 14 + 14 }}
                    >
                      <p className="truncate text-[10px] font-black text-brand-purple-dark/60">{`${formatHour(item.hour)}–${formatHour(item.hour + 1)}`}</p>
                      <p className="truncate text-[11px] font-black">{SPECIALTIES.find((s) => s.slug === item.specialty)?.name}</p>
                      <p className="min-h-7 text-[10px] text-brand-purple-dark/65">
                        {item.service}
                        {item.scheduleType === "at" ? " · AT" : ""}
                      </p>
                      {showProfessional && (
                        <p className={cx("truncate text-[10px] font-bold", !item.professional && "text-orange-dark italic")}>{item.professional ?? "A definir"}</p>
                      )}
                      {showRoom && item.room && <p className="truncate text-[10px] text-brand-purple-dark/65">{item.room}</p>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {notes.trim() && (
            <section>
              <h2 className={sectionTitle}>Observações</h2>
              <p className="text-xs leading-normal whitespace-pre-wrap">{notes}</p>
            </section>
          )}

          <footer className="mt-auto pt-7 grid grid-cols-2 gap-10">
            {["Coordenação clínica", "Responsável legal"].map((label) => (
              <div key={label}>
                <span className="block border-t border-brand-purple-dark" />
                <p className="mt-1.5 text-[11px] font-bold text-center text-brand-purple-dark/70">{label}</p>
              </div>
            ))}
          </footer>
        </article>
      </div>

      <aside className="flex flex-col gap-4 p-6 border-l border-neutral-100 overflow-auto max-lg:border-l-0 max-lg:border-b max-lg:order-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-bold text-2xl text-blue-dark">Plano Terapêutico</h1>
          <Button type="button" variant="tint" aria-label="close" onClick={onCancel}>
            <Icon name="fa-times" className="block w-4 h-4 self-center" />
          </Button>
        </div>
        <p className="-mt-2 text-sm text-brand-purple-dark/60">Resumo da semana padrão de {patientName.split(" ")[0]} para envio à operadora.</p>

        <div className="flex flex-col gap-2">
          <SwitchCard
            field={{ id: "therapeutic_plan_professionals", name: "therapeutic_plan[professionals]", value: showProfessional }}
            title="Exibir profissionais"
            description={showProfessional ? "Nome do profissional em cada sessão" : "Só a especialidade e o serviço aparecem"}
            onChange={(event) => setShowProfessional(event.target.checked)}
          />
          {showProfessional && withoutProfessional > 0 && (
            <p className="flex gap-2 items-start text-sm font-bold text-orange-dark">
              <Icon type="solid" name="fa-triangle-exclamation" className="mt-0.5" />
              {withoutProfessional === 1
                ? `1 sessão sem profissional aparece como "A definir".`
                : `${withoutProfessional} sessões sem profissional aparecem como "A definir".`}
            </p>
          )}
        </div>
        <SwitchCard
          field={{ id: "therapeutic_plan_rooms", name: "therapeutic_plan[rooms]", value: showRoom }}
          title="Exibir salas"
          description="Local de cada sessão na clínica"
          onChange={(event) => setShowRoom(event.target.checked)}
        />

        <Input
          type="textarea"
          id="therapeutic_plan_notes"
          name="therapeutic_plan[notes]"
          label="Observações para a operadora"
          placeholder="Opcional. Ex.: objetivos do trimestre, justificativa da carga horária."
          rows={4}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        <div className="mt-auto flex justify-between gap-2.5">
          <Button type="button" variant="tint" onClick={onCancel}>
            Fechar
          </Button>
          <Button type="button" rightIcon="fa-file-pdf" onClick={download}>
            Baixar PDF
          </Button>
        </div>
      </aside>
    </div>
  );
}
