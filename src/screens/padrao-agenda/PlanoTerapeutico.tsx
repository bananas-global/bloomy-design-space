/**
 * Plano Terapêutico — novo, não existe no Phoenix.
 *
 * O resumo da semana padrão do paciente para envio à operadora, no mesmo
 * formato do Exportar PIC: modal em tela cheia com a pré-visualização numa
 * folha A4 à esquerda e as opções à direita. A folha cresce com o conteúdo e
 * vira mais de uma página quando precisa. "Baixar PDF" imprime só a folha.
 *
 * No Phoenix, o PDF sairia como o `GoalsReportPdf`: um template HEEx
 * renderizado no servidor. Componentes usados: `modal/1` (variant custom, sem
 * `title`: o título e o fechar ficam no painel lateral), `switch_card/1`,
 * `input/1` (textarea) e `button/1`.
 */
import { useRef, useState } from "react";
import logo from "../../assets/bloomy-logo.svg";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input, SwitchCard } from "../../components/Input.js";
import { Modal } from "../../components/Overlay.js";
import { DAYS_FULL, SPEC, SPECS, TODAY, WEEKDAYS, br, hh, range, type AgendaItem, type SpecSlug, type Vigencia } from "./model.js";
import "./print.css";

/**
 * A cor de cada especialidade na folha, a mesma de `specialty_card_colors/1`.
 * Por extenso, para o Tailwind emitir as classes.
 */
const TONE: Record<SpecSlug, { dot: string; card: string }> = {
  psychology: { dot: "bg-brand-green", card: "bg-brand-green/10" },
  phonoaudiology: { dot: "bg-brand-blue", card: "bg-brand-blue/10" },
  occupational_therapy: { dot: "bg-brand-purple", card: "bg-brand-purple/10" },
  physiotherapy: { dot: "bg-brand-orange", card: "bg-brand-orange/10" },
  music_therapy: { dot: "bg-pink", card: "bg-pink/10" },
};
const TO_DEFINE = "A definir";

const uniq = (list: string[]) => [...new Set(list)];
/** Cada atendimento do padrão dura uma hora. */
const hours = (n: number) => `${n}h`;

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Props = {
  onClose: () => void;
  patientName: string;
  unitName?: string;
  operatorName?: string;
  vigencia: Vigencia;
  items: AgendaItem[];
};

export function PlanoTerapeutico({ show, ...props }: Props & { show: boolean }) {
  return (
    <Modal
      id="plano_terapeutico"
      show={show}
      onCancel={props.onClose}
      aria-label="Plano Terapêutico"
      variant="custom"
      customSize="h-full max-h-full! rounded-none! m-0! flex flex-col [&>div:last-child]:flex-1 [&>div:last-child]:min-h-0"
      withPadding={false}
    >
      <PlanoBody {...props} />
    </Modal>
  );
}

/** Montado junto com o modal: as opções voltam ao padrão a cada abertura. */
function PlanoBody({ onClose, patientName, unitName, operatorName, vigencia, items }: Props) {
  const [showProfs, setShowProfs] = useState(true);
  const [showRooms, setShowRooms] = useState(false);
  const [notes, setNotes] = useState("");
  const [zoom, setZoom] = useState(1);
  const doc = useRef<HTMLElement>(null);

  const bySpec = SPECS.map((s) => {
    const its = items.filter((i) => i.slug === s.slug);
    return {
      ...s,
      n: its.length,
      services: uniq(its.map((i) => i.service)),
      profs: [...uniq(its.map((i) => i.professional).filter(Boolean)), ...(its.some((i) => !i.professional) ? [TO_DEFINE] : [])],
    };
  }).filter((s) => s.n > 0);
  const days = WEEKDAYS.map((wd, i) => ({
    label: DAYS_FULL[i]!,
    items: items.filter((x) => x.weekday === wd).sort((a, b) => a.hour - b.hour),
  }));
  const activeDays = days.filter((d) => d.items.length > 0);
  const withoutProf = items.filter((i) => !i.professional).length;
  // Todas as sessões com a mesma altura, para as linhas da rotina alinharem.
  const sessionLines = 4 + (showProfs ? 1 : 0) + (showRooms ? 1 : 0);

  const zoomBy = (delta: number) => setZoom((z) => Math.min(2, Math.max(0.5, Math.round((z + delta) * 10) / 10)));

  // Imprime uma cópia da folha, direto no `body`: o resto da página sai do
  // layout (`display: none`) e não sobra página em branco depois da folha.
  function download() {
    if (!doc.current) return;
    const previous = document.title;
    const root = document.createElement("div");
    root.className = "pt-print-root";
    root.appendChild(doc.current.cloneNode(true));
    document.body.appendChild(root);
    document.title = `Plano Terapêutico - ${patientName}`;
    document.body.classList.add("pt-printing");
    const done = () => {
      document.body.classList.remove("pt-printing");
      root.remove();
      document.title = previous;
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.setTimeout(() => window.print(), 50);
  }

  const th = "pb-[0.6em] text-[0.82em] font-black uppercase tracking-wider text-brand-purple-dark/55";
  const td = "py-[0.7em] align-top border-t border-brand-purple-dark/10";
  const sectionTitle = "text-[1.15em] font-black uppercase tracking-wider text-brand-blue-dark";

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
          ref={doc}
          className="pt-doc mx-auto w-[210mm] min-h-[297mm] bg-white shadow-main box-border px-[14mm] pt-[14mm] pb-[10mm] flex flex-col gap-[1.4em] text-[11px] text-brand-purple-dark"
          style={{ zoom }}
        >
          <header className="flex items-center justify-between gap-4 pb-[1em] border-b-2 border-brand-blue">
            <img src={logo} alt="bloomy" className="h-[34px]" />
            <div className="text-right">
              <h1 className="font-black text-[1.9em] leading-tight">Plano Terapêutico</h1>
              <p className="text-brand-purple-dark/60">Semana padrão de atendimentos · vigência {range(vigencia)}</p>
            </div>
          </header>

          <dl className="grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-2.5">
            {[
              ["Paciente", patientName],
              ["Operadora", operatorName ?? "—"],
              ["Unidade", unitName ?? "—"],
              ["Emitido em", br(TODAY)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[0.82em] font-black uppercase tracking-wider text-brand-purple-dark/55">{label}</dt>
                <dd className="mt-0.5 text-[1.1em] font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-4 gap-[0.75em]">
            {[
              [items.length, "sessões por semana"],
              [hours(items.length), "carga horária semanal"],
              [bySpec.length, "especialidades"],
              [activeDays.length, "dias com atendimento"],
            ].map(([value, label]) => (
              <div key={label} className="px-[1.1em] py-[0.9em] rounded-xl bg-brand-blue/10">
                <b className="block text-[1.8em] leading-tight font-black text-brand-blue-dark">{value}</b>
                <span className="block mt-[0.15em] font-bold text-brand-purple-dark/65">{label}</span>
              </div>
            ))}
          </div>

          {items.length === 0 ? (
            <p className="text-[1.1em] text-brand-purple-dark/60 text-center p-6">Nenhum atendimento no padrão desta vigência.</p>
          ) : (
            <>
              <section className="flex flex-col gap-[0.6em]">
                <h2 className={sectionTitle}>Carga por especialidade</h2>
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <th className={th}>Especialidade</th>
                      <th className={th}>Serviços</th>
                      {showProfs && <th className={th}>Profissionais</th>}
                      <th className={cx(th, "pl-[1.2em] text-right whitespace-nowrap")}>Horas/sem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySpec.map((s) => (
                      <tr key={s.slug}>
                        <td className={cx(td, "pr-[1em] font-extrabold whitespace-nowrap")}>
                          <span className={cx("inline-block size-[0.6em] mr-[0.5em] rounded-full", TONE[s.slug].dot)} />
                          {s.name}
                        </td>
                        <td className={cx(td, "pr-[1em]")}>{s.services.join(", ")}</td>
                        {showProfs && <td className={cx(td, "pr-[1em]")}>{s.profs.join(", ")}</td>}
                        <td className={cx(td, "text-right")}>{hours(s.n)}</td>
                      </tr>
                    ))}
                    <tr className="font-black">
                      <td className={td} colSpan={showProfs ? 3 : 2}>Total</td>
                      <td className={cx(td, "text-right")}>{hours(items.length)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="flex flex-col gap-[0.6em]">
                <h2 className={sectionTitle}>Rotina semanal</h2>
                <div className="grid grid-cols-5 gap-[0.6em] items-start">
                  {days.map((d) => (
                    <div key={d.label} className="flex flex-col gap-[0.5em]">
                      <div className="flex items-center justify-between px-[0.8em] py-[0.5em] rounded-lg bg-brand-purple-dark text-white font-extrabold">
                        <span>{d.label}</span>
                        <span>{hours(d.items.length)}</span>
                      </div>
                      {d.items.length === 0 && <p className="px-[0.8em] text-[0.9em] text-brand-purple-dark/50">Sem atendimentos</p>}
                      {d.items.map((it) => (
                        <div
                          key={it.id}
                          className={cx("box-border overflow-hidden break-inside-avoid px-[0.7em] py-[0.55em] rounded-md flex flex-col leading-[1.3em]", TONE[it.slug].card)}
                          style={{ height: `${sessionLines * 1.3 + 1.1}em` }}
                        >
                          <span className="text-[0.9em] font-bold text-brand-purple-dark/60">{`${hh(it.hour)}–${hh(it.hour + 1)}`}</span>
                          <span className="font-black">
                            {SPEC[it.slug].name}
                            {it.type === "at" && <span className="ml-[0.4em] px-[0.4em] rounded bg-brand-purple-dark/10 text-[0.8em]">AT</span>}
                          </span>
                          <span className="min-h-[2.6em] text-[0.9em] text-brand-purple-dark/60">{it.service}</span>
                          {showProfs && <span className={cx("truncate text-[0.95em] font-bold", !it.professional && "text-orange-dark italic")}>{it.professional || TO_DEFINE}</span>}
                          {showRooms && it.room && <span className="truncate text-[0.9em] text-brand-purple-dark/60">{it.room}</span>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {notes.trim() && (
            <section className="flex flex-col gap-[0.5em]">
              <h2 className={sectionTitle}>Observações</h2>
              <p className="whitespace-pre-wrap text-[1.05em]">{notes.trim()}</p>
            </section>
          )}

          <footer className="mt-auto pt-[1.8em] grid grid-cols-2 gap-10">
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
          <Button type="button" variant="tint" aria-label="close" onClick={onClose}>
            <Icon name="fa-times" className="block w-4 h-4 self-center" />
          </Button>
        </div>
        <p className="-mt-2 text-sm text-brand-purple-dark/60">Resumo da semana padrão de {patientName.split(" ")[0]} para envio à operadora.</p>

        <div className="flex flex-col gap-2">
          <SwitchCard
            field={{ id: "plano_profissionais", name: "plano[professionals]", value: showProfs }}
            title="Exibir profissionais"
            description={showProfs ? "Nome do profissional em cada sessão" : "Só a especialidade e o serviço aparecem"}
            onChange={(event) => setShowProfs(event.target.checked)}
          />
          {showProfs && withoutProf > 0 && (
            <p className="flex gap-2 items-start text-sm font-bold text-orange-dark">
              <Icon type="solid" name="fa-triangle-exclamation" className="mt-0.5" />
              {withoutProf === 1
                ? `1 sessão sem profissional aparece como "${TO_DEFINE}".`
                : `${withoutProf} sessões sem profissional aparecem como "${TO_DEFINE}".`}
            </p>
          )}
        </div>
        <SwitchCard
          field={{ id: "plano_salas", name: "plano[rooms]", value: showRooms }}
          title="Exibir salas"
          description="Local de cada sessão na clínica"
          onChange={(event) => setShowRooms(event.target.checked)}
        />

        <Input
          type="textarea"
          id="plano_observacoes"
          name="plano[notes]"
          label="Observações para a operadora"
          placeholder="Opcional. Ex.: objetivos do trimestre, justificativa da carga horária."
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        <div className="mt-auto flex justify-between gap-2.5">
          <Button type="button" variant="tint" onClick={onClose}>
            Fechar
          </Button>
          <Button type="button" rightIcon="fa-file-pdf" disabled={items.length === 0} onClick={download}>
            Baixar PDF
          </Button>
        </div>
      </aside>
    </div>
  );
}
