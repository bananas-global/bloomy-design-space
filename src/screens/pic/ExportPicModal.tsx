/**
 * Exportar PIC — novo, não existe no Phoenix.
 *
 * Modal em tela cheia com a pré-visualização do PIC numa folha A4, à esquerda,
 * e as opções da exportação à direita. A folha mostra todas as áreas em duas
 * colunas; quando o conteúdo não cabe, o texto encolhe (até 62%) para caber em
 * uma página. A especialidade filtra as áreas. "Baixar PDF" imprime só a folha.
 *
 * No Phoenix, o PDF sairia do mesmo jeito que `GoalsReportPdf`: um template
 * HEEx renderizado no servidor. Componentes usados: `modal/1` (variant
 * custom, sem `title`: o título e o fechar ficam no painel lateral), `input/1` (select), `switch_card/1` e `button/1`.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import logo from "../../assets/bloomy-logo.svg";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input, SwitchCard } from "../../components/Input.js";
import { Modal } from "../../components/Overlay.js";
import { SPECIALTIES, TODAY, type Goal, type Plan, type SpecialtyId } from "./fixtures.js";
import { countsOf, currentPhase, goalsOf, PHASES, specialtyOf } from "./parts.js";
import "./print.css";

/** 297mm a 96dpi. */
const A4_HEIGHT = 1123;
const A4_WIDTH = 794;
const MIN_SCALE = 0.62;

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Sem os adquiridos, saem as áreas adquiridas e os programas adquiridos. */
function visibleGoals(goals: Goal[], showAcquired: boolean): Goal[] {
  if (showAcquired) return goals;
  return goals
    .filter((goal) => goal.status !== "acquired")
    .map((goal) => ({
      ...goal,
      objectives: goal.objectives.map((objective) => ({
        ...objective,
        programs: objective.programs.filter((program) => program.status !== "acquired"),
      })),
    }));
}

type Props = { onCancel: () => void; plan: Plan; goals: Goal[]; patientName: string };

export function ExportPicModal({ show, ...props }: Props & { show: boolean }) {
  return (
    <Modal
      id="export_pic_modal"
      show={show}
      onCancel={props.onCancel}
      aria-label="Exportar PIC"
      variant="custom"
      customSize="h-full max-h-full! rounded-none! m-0! flex flex-col [&>div:last-child]:flex-1 [&>div:last-child]:min-h-0"
      withPadding={false}
    >
      <ExportPicBody {...props} />
    </Modal>
  );
}

/** Montado junto com o modal: as opções voltam ao padrão a cada abertura. */
function ExportPicBody({ onCancel, plan, goals, patientName }: Props) {
  const [spec, setSpec] = useState<SpecialtyId | "all">("all");
  const [showAcquired, setShowAcquired] = useState(true);
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [showPhase, setShowPhase] = useState(true);
  const [scale, setScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [fontsReady, setFontsReady] = useState(false);
  const doc = useRef<HTMLElement>(null);

  const specs = SPECIALTIES.filter((s) => goalsOf(goals, s.id).length > 0);
  const list = visibleGoals(goalsOf(goals, spec), showAcquired);
  const counts = countsOf(list);

  // A Mulish muda a altura do texto: mede de novo quando ela carrega.
  useEffect(() => {
    let alive = true;
    void document.fonts.ready.then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // Reduz o texto, de 3 em 3 pontos percentuais, até a folha caber em uma página.
  useLayoutEffect(() => {
    const el = doc.current;
    if (!el) return;
    let next = 1;
    el.style.setProperty("--pic-s", String(next));
    while (el.scrollHeight > A4_HEIGHT + 1 && next > MIN_SCALE) {
      next = Math.round((next - 0.03) * 100) / 100;
      el.style.setProperty("--pic-s", String(next));
    }
    setScale(next);
  }, [goals, spec, showAcquired, showDescriptions, showPhase, fontsReady]);

  const zoomBy = (delta: number) => setZoom((z) => Math.min(2, Math.max(0.5, Math.round((z + delta) * 10) / 10)));

  function download() {
    const previous = document.title;
    document.title = `PIC - ${patientName}`;
    document.body.classList.add("pic-printing");
    const done = () => {
      document.body.classList.remove("pic-printing");
      document.title = previous;
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.setTimeout(() => window.print(), 50);
  }

  const tooBig = scale <= MIN_SCALE + 0.01;

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

          <div className="mx-auto" style={{ width: A4_WIDTH * zoom, height: A4_HEIGHT * zoom }}>
            <div className="pic-zoom origin-top-left" style={{ transform: `scale(${zoom})` }}>
              <article
                ref={doc}
                className={cx(
                  "pic-doc w-[210mm] h-[297mm] overflow-hidden bg-white shadow-main box-border",
                  "px-[12mm] pt-[12mm] pb-[10mm] flex flex-col gap-[1.1em] text-brand-purple-dark",
                )}
                style={{ fontSize: "calc(11px * var(--pic-s, 1))" }}
              >
                <header className="flex items-center justify-between gap-4 pb-[0.9em] border-b-2 border-brand-blue">
                  <img src={logo} alt="bloomy" className="h-[34px]" />
                  <div className="text-right">
                    <h1 className="font-black text-[1.75em] leading-tight">Plano de Intervenção Comportamental</h1>
                    <p className="text-brand-purple-dark/60">{spec === "all" ? "Todas as especialidades" : specialtyOf(spec).label}</p>
                  </div>
                </header>

                <dl className="grid grid-cols-[1.6fr_1.4fr_1.4fr_1fr] gap-2.5">
                  {[
                    ["Paciente", patientName],
                    ["Vigência", `${plan.startAt} a ${plan.endAt}`],
                    ["Responsável técnico", plan.createdBy.name],
                    ["Emitido em", TODAY],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[0.82em] font-black uppercase tracking-wider text-brand-purple-dark/55">{label}</dt>
                      <dd className="mt-0.5 text-[1.1em] font-extrabold">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="grid grid-flow-col auto-cols-fr gap-[0.75em]">
                  {[
                    [counts.areas, "áreas"],
                    [counts.objectives, "objetivos"],
                    [counts.programs, "programas"],
                    ...(showAcquired ? [[counts.acquired, "adquiridos"] as const] : []),
                  ].map(([value, label]) => (
                    <div key={label} className="px-[1.1em] py-[0.9em] rounded-xl bg-brand-blue/10">
                      <b className="block text-[1.8em] leading-tight font-black text-brand-blue-dark">{value}</b>
                      <span className="block mt-[0.15em] font-bold text-brand-purple-dark/65">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="columns-2 gap-x-[1.1em]">
                  {list.map((goal) => (
                    <section key={goal.id} className="break-inside-avoid mb-[0.9em] px-[0.9em] py-[0.8em] rounded-xl border border-brand-purple-dark/10 flex flex-col gap-[0.35em]">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-[1.25em] font-black">{goal.name}</h2>
                        {goal.status === "acquired" && (
                          <span className="shrink-0 px-[0.6em] py-[0.15em] rounded-full text-[0.82em] font-extrabold bg-brand-green/20 text-brand-green-dark">Adquirida</span>
                        )}
                      </div>
                      <p className="text-[0.88em] font-bold text-brand-purple-dark/60">
                        {[goal.specialties.map((id) => specialtyOf(id).short).join(" · "), goal.protocol, goal.endDate && `Término previsto ${goal.endDate}`].filter(Boolean).join("  |  ")}
                      </p>
                      {showDescriptions && goal.description && <p className="text-[0.95em] text-brand-purple-dark/75">{goal.description}</p>}

                      {goal.objectives.map((objective) => (
                        <div key={objective.id} className="mt-[0.35em] pt-[0.45em] border-t border-dashed border-brand-purple-dark/10">
                          <p className="flex items-baseline gap-[0.5em] text-[1.02em] font-extrabold">
                            <Icon name="fa-bullseye-arrow" className="text-[0.8em] text-brand-blue" />
                            {objective.name}
                          </p>
                          {showDescriptions && objective.description && <p className="ml-[1.3em] mt-[0.1em] text-[0.9em] text-brand-purple-dark/65">{objective.description}</p>}
                          {objective.programs.length > 0 && (
                            <ul className="ml-[1.3em] mt-[0.3em] flex flex-col gap-[0.25em]">
                              {objective.programs.map((program) => {
                                const phase = currentPhase(program);
                                return (
                                  <li key={program.id} className="flex items-center justify-between gap-2 text-[0.95em] before:content-[''] before:shrink-0 before:size-1 before:rounded-full before:bg-brand-purple-dark/40">
                                    <span className={cx("flex-1 min-w-0", program.status === "acquired" && "text-brand-purple-dark/55")}>{program.name}</span>
                                    {showPhase && phase && (
                                      <span className={cx("shrink-0 whitespace-nowrap rounded-full px-[0.55em] py-[0.1em] text-[0.8em] font-semibold", PHASES[phase].className)}>
                                        {PHASES[phase].title}
                                      </span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      ))}
                    </section>
                  ))}
                </div>

                {list.length === 0 && <p className="text-[1.1em] text-brand-purple-dark/60 text-center p-6">Nenhuma área para os filtros escolhidos.</p>}

                <footer className="mt-auto pt-[1.8em] grid grid-cols-2 gap-10">
                  {["Responsável técnico", "Responsável legal"].map((label) => (
                    <div key={label}>
                      <span className="block border-t border-brand-purple-dark" />
                      <p className="mt-1.5 text-[11px] font-bold text-center text-brand-purple-dark/70">{label}</p>
                    </div>
                  ))}
                </footer>
              </article>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4 p-6 border-l border-neutral-100 overflow-auto max-lg:border-l-0 max-lg:border-b max-lg:order-1">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-bold text-2xl text-blue-dark">Exportar PIC</h1>
            <Button type="button" variant="tint" aria-label="close" onClick={onCancel}>
              <Icon name="fa-times" className="block w-4 h-4 self-center" />
            </Button>
          </div>
          <p className="-mt-2 text-sm text-brand-purple-dark/60">Resumo do plano em uma página, para leitura rápida pela família, escola ou operadora.</p>

          <Input
            type="select"
            id="export_pic_specialty"
            name="export_pic[specialty]"
            label="Especialidade"
            value={spec}
            options={[["Todas as especialidades", "all"], ...specs.map((s) => [s.label, s.id] as const)]}
            onChange={(value) => setSpec((value ?? "all") as SpecialtyId | "all")}
          />

          <SwitchCard
            field={{ id: "export_pic_acquired", name: "export_pic[acquired]", value: showAcquired }}
            title="Incluir adquiridos"
            description="Áreas e programas já concluídos"
            onChange={(event) => setShowAcquired(event.target.checked)}
          />
          <SwitchCard
            field={{ id: "export_pic_descriptions", name: "export_pic[descriptions]", value: showDescriptions }}
            title="Descrições"
            description="Texto de apoio de áreas e objetivos"
            onChange={(event) => setShowDescriptions(event.target.checked)}
          />
          <SwitchCard
            field={{ id: "export_pic_phase", name: "export_pic[phase]", value: showPhase }}
            title="Fase atual"
            description="Etapa em que cada programa está"
            onChange={(event) => setShowPhase(event.target.checked)}
          />

          {scale < 0.99 && (
            <p className={cx("flex gap-2 items-start text-sm font-bold", tooBig ? "text-orange-dark" : "text-brand-purple-dark/60")}>
              <Icon type="solid" name={tooBig ? "fa-triangle-exclamation" : "fa-compress"} className={cx("mt-0.5", !tooBig && "text-brand-blue")} />
              {tooBig
                ? "O conteúdo não cabe em uma página mesmo reduzido. Desligue descrições ou filtre por especialidade."
                : `Texto reduzido para ${Math.round(scale * 100)}% para caber em uma página.`}
            </p>
          )}

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
