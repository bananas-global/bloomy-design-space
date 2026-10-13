/**
 * PIC — a grade Áreas → Objetivos → Programas, como no desenho: as três
 * colunas dentro do card do plano, cada área com as pílulas de especialidade.
 * Os itens e o `PatientGoalProgramCard` seguem o markup e as classes do HEEx
 * (`BehaviorInterventionPlan.GridLayout`).
 *
 * Novo — não existe no Phoenix: as abas de especialidade (`SpecialtyTabs`),
 * as pílulas de especialidade nas áreas e o botão "Áreas em lote".
 *
 * `phase_tag/1` (`CustomServices.Components.CommonComponents`) e
 * `status_tag/1` (`ProgramLive.Components.CommonComponents`) existem no
 * Phoenix, mas fora de `core_components.ex`: ficam aqui, espelhados, até
 * entrarem em `src/components/`.
 */
import { useState, type ReactNode } from "react";
import { showToast } from "../../components/Action.js";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Dropdown } from "../../components/Overlay.js";
import { Tag, type TagVariant } from "../../components/Tag.js";
import { PHASE_ORDER, SPECIALTIES, type Goal, type Objective, type Phase, type Program, type ProgramStatus, type Specialty, type SpecialtyId, type SpecialtyTone } from "./fixtures.js";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** `phases/0` e `tag_class/1` de `CustomServices.Components.CommonComponents`. */
export const PHASES: Record<Phase, { title: string; icon: string; className: string }> = {
  baseline: { title: "Linha de Base", icon: "fa-flag", className: "bg-brand-purple-dark/10 text-brand-purple-dark/80" },
  intervention: { title: "Intervenção", icon: "fa-hand", className: "bg-brand-orange/20 text-orange-dark" },
  generalization: { title: "Generalização", icon: "fa-arrows-turn-to-dots", className: "bg-brand-blue/20 text-brand-blue-dark" },
  maintenance: { title: "Manutenção", icon: "fa-rotate", className: "bg-brand-purple/20 text-brand-accent-dark" },
  acquired: { title: "Adquirido", icon: "fa-trophy", className: "bg-brand-green/20 text-brand-green-dark" },
};

/** `phase_tag/1`. */
export function PhaseTag({ phase, text, className }: { phase: Phase; text?: ReactNode; className?: string }) {
  const data = PHASES[phase];
  return (
    <p className={cx("text-sm font-semibold rounded-full inline-flex items-center gap-1.5 px-2 h-6", data.className, className)}>
      {text ?? data.title} <Icon type="solid" name={data.icon} />
    </p>
  );
}

/** `translate_enum/1` de `Program.status`. */
export const PROGRAM_STATUS: Record<ProgramStatus, string> = {
  active: "Ativo",
  acquired: "Adquirido",
  interrupted: "Interrompido",
  hidden: "Oculto",
};

/** `ProgramLive.Components.CommonComponents.status_tag/1`. */
export function ProgramStatusTag({ status }: { status: ProgramStatus }) {
  return (
    <span
      className={cx(
        "block px-1.5 py-0.5 text-center text-sm max-w-fit rounded-md uppercase font-semibold",
        status === "active" && "bg-blue-light text-blue",
        status === "acquired" && "bg-green-light text-green",
        status === "interrupted" && "bg-red-light text-red",
        status === "hidden" && "bg-yellow/20 text-yellow-dark",
      )}
    >
      {PROGRAM_STATUS[status]}
    </span>
  );
}

/** A fase mais avançada entre os alvos do programa. */
export function currentPhase(program: Program): Phase | undefined {
  return [...PHASE_ORDER].reverse().find((phase) => program.phases[phase]);
}

export const specialtyOf = (id: SpecialtyId): Specialty => SPECIALTIES.find((s) => s.id === id)!;

/** As áreas de uma especialidade; `all` devolve todas. */
export const goalsOf = (goals: Goal[], spec: SpecialtyId | "all") => (spec === "all" ? goals : goals.filter((g) => g.specialties.includes(spec)));

export function countsOf(goals: Goal[]) {
  let objectives = 0;
  let programs = 0;
  let acquired = 0;
  for (const goal of goals)
    for (const objective of goal.objectives) {
      objectives += 1;
      for (const program of objective.programs) {
        programs += 1;
        if (program.status === "acquired") acquired += 1;
      }
    }
  return { areas: goals.length, objectives, programs, acquired };
}

const TONE_TAG: Record<SpecialtyTone, TagVariant> = {
  blue: "dark-blue",
  purple: "light-purple",
  orange: "orange",
  green: "green",
  red: "red",
};

/** As especialidades da área, abreviadas. */
function SpecialtyPills({ specialties }: { specialties: SpecialtyId[] }) {
  if (specialties.length === 0) return <Tag item="Sem especialidade" variant="dark-purple" pill />;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {specialties.map((id) => {
        const spec = specialtyOf(id);
        return <Tag key={id} item={spec.short} variant={TONE_TAG[spec.tone]} leftIcon={spec.icon} pill />;
      })}
      {specialties.length > 1 && (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-purple-dark/45" title="Área compartilhada entre especialidades">
          <Icon name="fa-link" /> Compartilhada
        </span>
      )}
    </div>
  );
}

/** Novo: filtra a grade pelas áreas de uma especialidade. */
export function SpecialtyTabs({
  goals,
  value,
  mine,
  onChange,
}: {
  goals: Goal[];
  value: SpecialtyId | "all";
  mine: SpecialtyId;
  onChange: (value: SpecialtyId | "all") => void;
}) {
  const specs = SPECIALTIES.filter((s) => s.id === mine || goalsOf(goals, s.id).length > 0);
  const pill = (selected: boolean) =>
    cx(
      "inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm font-bold transition-colors",
      selected ? "bg-brand-blue border-brand-blue text-white" : "bg-white border-neutral-100 text-brand-purple-dark/65 hover:border-brand-blue",
    );
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button type="button" className={pill(value === "all")} onClick={() => onChange("all")}>
        Todas
      </button>
      {specs.map((s) => (
        <button key={s.id} type="button" className={pill(value === s.id)} onClick={() => onChange(s.id)}>
          {s.label}
          {s.id === mine && (
            <span className={cx("px-1.5 rounded-full text-[10px] font-extrabold uppercase", value === s.id ? "bg-white/30" : "bg-brand-blue/20 text-brand-blue-dark")}>
              Você
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

const notInPrototype = (title: string) =>
  showToast({ type: "info", title, content: "Esta ação não faz parte deste protótipo.", closeTime: 3000 });

const MENU_ITEM = "p-2 flex items-center gap-2 hover:bg-brand-purple-dark/5 font-bold rounded-md w-full text-brand-purple-dark/60";

function Counter({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-x-2">
      <p className="uppercase text-sm text-brand-purple-dark/60 font-bold">{label}</p>
      <p className="bg-brand-purple-dark/80 text-white rounded-full font-semibold px-2 py-[0.063rem]">{count}</p>
    </div>
  );
}

function ColumnEmpty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 rounded-full bg-brand-purple-dark/10 flex items-center justify-center mb-4">
        <Icon name={icon} className="text-brand-purple-dark/40 text-xl" />
      </div>
      <p className="text-brand-purple-dark/60 text-sm text-center">{text}</p>
    </div>
  );
}

const itemClass = (selected: boolean) =>
  cx(
    "flex items-start justify-between p-4 border rounded-2xl mb-4 cursor-pointer transition-colors",
    selected ? "bg-brand-blue/10 border-brand-blue" : "bg-white border-[#e6e4ea] hover:bg-brand-blue/10 hover:border-brand-blue",
  );

function ItemMenu({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div onClick={(event) => event.stopPropagation()}>
      <Dropdown id={id} items={children}>
        <div className="text-brand-purple-dark/60 px-2 py-0.5">
          <Icon name="fa-ellipsis-v" />
        </div>
      </Dropdown>
    </div>
  );
}

/** `PatientGoalProgramCard.render/1`, com `compact_pattern?`. */
function ProgramCard({ program, goal, canEdit }: { program: Program; goal: Goal; canEdit: boolean }) {
  const steps = Object.values(program.phases).reduce((sum, count) => sum + (count ?? 0), 0);
  return (
    <div className="rounded-2xl border border-brand-purple-dark/10 p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-x-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg text-lg text-brand-blue-dark bg-brand-blue/20">
            <Icon name="fa-list-check" />
          </div>
          <div className="mr-auto min-w-0 flex-1">
            <h3 className="text-base/4 font-black text-brand-purple-dark">{program.name}</h3>
            <p className="truncate text-sm text-brand-purple-dark/80 max-w-56">{program.pattern}</p>
          </div>
          <ProgramStatusTag status={program.status} />
        </div>

        {canEdit && (
          <Dropdown
            id={`program_actions-${program.id}`}
            items={
              <>
                <button type="button" className="p-2 flex items-center gap-2 hover:bg-purple-dark/10 rounded-md w-full" onClick={() => notInPrototype("Editar Programa")}>
                  <Icon name="fa-pen-to-square" />
                  <p>Editar Programa</p>
                </button>
                <button type="button" className="p-2 flex items-center gap-2 hover:bg-purple-dark/10 rounded-md w-full" onClick={() => notInPrototype("Editar Fase")}>
                  <Icon name="fa-pencil" />
                  <p>Editar Fase</p>
                </button>
                {goal.status !== "acquired" && (
                  <button type="button" className="p-2 flex items-center gap-2 hover:bg-purple-dark/10 rounded-md w-full" onClick={() => notInPrototype("Editar Status")}>
                    <Icon name="fa-pencil" />
                    <p>Editar Status</p>
                  </button>
                )}
                <button type="button" className="p-2 w-full flex items-center gap-2 hover:bg-purple-dark/10 rounded-md" onClick={() => notInPrototype("Remover")}>
                  <Icon name="fa-trash-alt" />
                  <p>Remover</p>
                </button>
              </>
            }
          >
            <div className="text-lg text-brand-purple-dark/60 px-2 py-0.5">
              <Icon name="fa-ellipsis-v" />
            </div>
          </Dropdown>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <p className="uppercase text-sm text-brand-purple-dark/60 font-bold">Alvos</p>
          <span className="bg-brand-purple-dark/80 text-white rounded-full font-semibold px-2 py-[0.063rem]">{steps}</span>
        </div>
        <div className="flex gap-3">
          {PHASE_ORDER.filter((phase) => program.phases[phase]).map((phase) => (
            <PhaseTag key={phase} phase={phase} text={program.phases[phase]} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Column({ icon, title, actions, children }: { icon: string; title: string; actions: ReactNode; children: ReactNode }) {
  return (
    <div className="flex-1 min-w-72 p-3.5 border border-neutral-100 rounded-xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="inline-flex items-center gap-2 text-lg font-bold text-brand-purple-dark">
          <Icon type="solid" name={icon} /> {title}
        </h3>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      <div className="max-h-150 overflow-y-auto pr-1">{children}</div>
    </div>
  );
}

/** `GridLayout.render/1`: Áreas → Objetivos → Programas, dentro do card do plano. */
export function GridLayout({ goals, canEdit, canDiscard }: { goals: Goal[]; canEdit: boolean; canDiscard: boolean }) {
  const [goalId, setGoalId] = useState<string | null>(null);
  const [objectiveId, setObjectiveId] = useState<string | null>(null);
  const goal = goals.find((g) => g.id === goalId) ?? null;
  const objectives = goal?.objectives ?? [];
  const objective: Objective | null = objectives.find((o) => o.id === objectiveId) ?? null;

  return (
    <div className="flex flex-wrap lg:flex-nowrap items-start gap-3.5">
      <Column
        icon="fa-book-open"
        title="Áreas"
        actions={
          canEdit && (
            <>
              <Button type="button" size="medium" variant="tint" rightIcon="fa-layer-group" onClick={() => notInPrototype("Áreas em lote")}>
                Áreas em lote
              </Button>
              <Button type="button" size="medium" rightIcon="fa-plus" onClick={() => notInPrototype("Nova área")}>
                Novo
              </Button>
            </>
          )
        }
      >
        {goals.length === 0 && <ColumnEmpty icon="fa-book-open" text="Nenhuma área desta especialidade" />}
        {goals.map((g) => (
          <div
            key={g.id}
            className={itemClass(goalId === g.id)}
            onClick={() => {
              setGoalId(g.id);
              setObjectiveId(null);
            }}
          >
            <div className="flex flex-col flex-1 min-w-0">
              <p className="text-base/4 font-black text-brand-purple-dark">{g.name}</p>
              <p className="truncate text-sm text-brand-purple-dark/80" title={g.description}>
                {g.description}
              </p>
              <p className="mt-1 text-sm text-brand-purple-dark/60">
                Data esperada de término: <strong className="font-semibold text-brand-purple-dark">{g.endDate ?? "-"}</strong>
              </p>
              <div className="flex items-center justify-between mt-2 gap-3">
                <Counter label="Objetivos" count={g.objectives.length} />
                {g.protocol && (
                  <p className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-brand-purple/20 text-brand-accent-dark">{g.protocol}</p>
                )}
              </div>
              <div className="mt-2">
                <SpecialtyPills specialties={g.specialties} />
              </div>
            </div>
            {canEdit && (
              <ItemMenu id={`goal_actions_${g.id}`}>
                <button type="button" className={MENU_ITEM} onClick={() => notInPrototype("Editar área")}>
                  <Icon name="fa-pencil" />
                  <p>Editar</p>
                </button>
                {canDiscard && (
                  <button
                    type="button"
                    className="p-2 flex items-center gap-2 hover:bg-brand-red/10 font-bold rounded-md w-full text-brand-red-dark"
                    onClick={() => notInPrototype("Remover área")}
                  >
                    <Icon name="fa-trash-alt" />
                    <p>Remover</p>
                  </button>
                )}
              </ItemMenu>
            )}
          </div>
        ))}
      </Column>

      <Column
        icon="fa-bullseye"
        title="Objetivos"
        actions={
          canEdit && (
            <Button type="button" size="medium" rightIcon="fa-plus" disabled={!goal} className="disabled:opacity-50" onClick={() => notInPrototype("Novo objetivo")}>
              Novo
            </Button>
          )
        }
      >
        {!goal && <ColumnEmpty icon="fa-bullseye" text="Selecione uma área para ver os objetivos" />}
        {goal && objectives.length === 0 && <ColumnEmpty icon="fa-bullseye" text="Nenhum objetivo cadastrado" />}
        {objectives.map((o) => (
          <div key={o.id} className={itemClass(objectiveId === o.id)} onClick={() => setObjectiveId(o.id)}>
            <div className="flex flex-col flex-1 min-w-0">
              <p className="text-base/4 font-black text-brand-purple-dark">{o.name}</p>
              {o.description && <p className="truncate text-sm text-brand-purple-dark/80">{o.description}</p>}
              <div className="flex items-center gap-x-2 mt-2">
                <Counter label="Programas" count={o.programs.length} />
              </div>
            </div>
            {canDiscard && (
              <ItemMenu id={`objective_actions_${o.id}`}>
                <button
                  type="button"
                  className="p-2 flex items-center gap-2 hover:bg-brand-red/10 font-bold rounded-md w-full text-brand-red-dark"
                  onClick={() => notInPrototype("Remover objetivo")}
                >
                  <Icon name="fa-trash-alt" />
                  <p>Remover</p>
                </button>
              </ItemMenu>
            )}
          </div>
        ))}
      </Column>

      <Column
        icon="fa-clipboard-list"
        title="Programas"
        actions={
          canEdit && (
            <Button type="button" size="medium" variant="tint" rightIcon="fa-file-import" disabled={!objective} className="disabled:opacity-50" onClick={() => notInPrototype("Importar programas")}>
              Importar
            </Button>
          )
        }
      >
        {!objective && <ColumnEmpty icon="fa-clipboard-list" text="Selecione um objetivo para ver os programas" />}
        {objective && objective.programs.length === 0 && <ColumnEmpty icon="fa-clipboard-list" text="Nenhum programa cadastrado" />}
        {goal &&
          objective?.programs.map((p) => (
            <div key={p.id} className="mb-4">
              <ProgramCard program={p} goal={goal} canEdit={canEdit} />
            </div>
          ))}
      </Column>
    </div>
  );
}
