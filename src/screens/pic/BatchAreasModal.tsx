/**
 * Áreas em lote — novo, não existe no Phoenix.
 *
 * Modal em tela cheia que cria várias áreas de uma vez a partir de um
 * protocolo aplicado ao paciente: à esquerda os protocolos, à direita a
 * aplicação de referência (a última finalizada já vem escolhida) e a tabela de
 * habilidades com o acerto. Cada habilidade marcada vira uma área com o nome da
 * habilidade, o protocolo e o acerto na descrição.
 *
 * A coordenação (admin, clinic_admin, coordinator) escolhe a especialidade de
 * cada área; os demais perfis ficam travados na especialidade do login.
 * Habilidade com o mesmo nome de uma área do plano aparece como "Já cadastrada"
 * e não pode ser marcada.
 *
 * Componentes usados: `modal/1` (variant custom, como o Pré-visualizar),
 * `button/1`, `input/1` (busca, select de nível, checkbox e o select de
 * especialidade), `table/1` e `dropdown/1` (o seletor de aplicação, no padrão
 * do seletor de vigências).
 */
import { useMemo, useState } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Dropdown, Modal } from "../../components/Overlay.js";
import { Table } from "../../components/Table.js";
import { SPECIALTIES, type Goal, type PatientProtocol, type ProtocolApplication, type SkillScore, type SpecialtyId, skillScores } from "./fixtures.js";
import { specialtyOf } from "./parts.js";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Os perfis que escolhem a especialidade de cada área. */
export const COORDINATION_ROLES = ["admin", "clinic_admin", "coordinator"];

/** O que cada habilidade marcada vira: uma área nova. */
export type BatchArea = { name: string; protocol: string; level: number; specialty: SpecialtyId; description: string };

const EYEBROW = "text-xs font-black tracking-wide uppercase text-brand-purple-dark/50";
const NEED = 80;

const TONES = {
  hi: { text: "text-green-dark", bar: "bg-green" },
  mid: { text: "text-orange-dark", bar: "bg-orange" },
  low: { text: "text-red-dark", bar: "bg-red" },
};
const toneOf = (pct: number) => (pct >= NEED ? TONES.hi : pct >= 50 ? TONES.mid : TONES.low);

const lastFinished = (protocol: PatientProtocol) =>
  [...protocol.applications].reverse().find((a) => a.status === "finished") ?? protocol.applications[0];

type Props = {
  onCancel: () => void;
  onImport: (areas: BatchArea[]) => void;
  protocols: PatientProtocol[];
  /** Todas as áreas do plano, para marcar o que já existe. */
  goals: Goal[];
  canChooseSpecialty: boolean;
  mySpecialty: SpecialtyId;
};

export function BatchAreasModal({ show, ...props }: Props & { show: boolean }) {
  return (
    <Modal
      id="pic_batch_areas_modal"
      show={show}
      onCancel={props.onCancel}
      aria-label="Áreas em lote"
      variant="custom"
      customSize="h-full max-h-full! rounded-none! m-0! flex flex-col [&>div:last-child]:flex-1 [&>div:last-child]:min-h-0 [&>div:last-child]:flex [&>div:last-child]:flex-col"
      withPadding={false}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 p-6 border-b border-neutral-100">
        <div className="min-w-0">
          <p className="text-xs font-black tracking-wider uppercase text-brand-blue-dark">Plano de Intervenção Comportamental</p>
          <h1 className="mt-1 text-2xl font-extrabold text-brand-purple-dark">Áreas em lote</h1>
          <p className="mt-1 text-[13px] font-bold text-brand-purple-dark/50">Selecione um protocolo e a aplicação de referência para criar várias áreas de uma vez.</p>
        </div>
        <Button type="button" variant="tint" aria-label="Fechar" onClick={props.onCancel}>
          <Icon name="fa-times" className="block w-4 h-4 self-center" />
        </Button>
      </header>
      <BatchBody {...props} />
    </Modal>
  );
}

function ApplicationBadge({ application }: { application: ProtocolApplication }) {
  const finished = application.status === "finished";
  return (
    <span className={cx("text-xs font-extrabold px-3 py-0.5 rounded-full", finished ? "bg-green text-white" : "bg-brand-purple-dark/8 text-brand-purple-dark")}>
      {finished ? "Finalizada" : "Em andamento"}
    </span>
  );
}

/** O seletor de aplicação, no padrão do seletor de vigências do cabeçalho. */
function ApplicationDropdown({ applications, current, onSelect }: { applications: ProtocolApplication[]; current: ProtocolApplication; onSelect: (id: string) => void }) {
  return (
    <Dropdown
      id="pic_batch_application"
      placement="bottom-start"
      dropdownClass="[&>div]:min-w-80"
      items={[...applications].reverse().map((application) => {
        const selected = application.id === current.id;
        return (
          <button
            key={application.id}
            type="button"
            className={cx(
              "flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-left text-sm text-brand-purple-dark hover:bg-brand-blue/10",
              selected ? "bg-brand-blue/14 font-extrabold" : "font-semibold",
            )}
            onClick={() => onSelect(application.id)}
          >
            <span className="w-4 shrink-0 text-center text-xs text-brand-blue">{selected && <Icon type="solid" name="fa-check" />}</span>
            <span className="flex-1 tabular-nums whitespace-nowrap">
              {application.label}
              <em className="block not-italic text-xs font-bold text-brand-purple-dark/50">{application.date}</em>
            </span>
            <ApplicationBadge application={application} />
          </button>
        );
      })}
    >
      <span className="inline-flex items-center gap-2.5 h-12 px-3.5 rounded-lg border border-neutral-100 bg-brand-purple-dark/5 text-sm font-bold text-brand-purple-dark whitespace-nowrap hover:border-brand-blue hover:bg-brand-blue/8">
        <span className="inline-flex items-center gap-2 tabular-nums">
          {current.label} · {current.date}
          <ApplicationBadge application={current} />
        </span>
        <Icon type="solid" name="fa-chevron-down" className="text-[10px] text-brand-purple-dark/50" />
      </span>
    </Dropdown>
  );
}

/** O checkbox de `input type="checkbox"`, sem o rótulo, para caber na tabela. */
function RowCheckbox({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: () => void; label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className="rounded border-2 border-brand-purple-dark/10 checked:border-brand-blue text-brand-blue focus:ring-0 disabled:opacity-40 cursor-pointer disabled:cursor-default"
    />
  );
}

/** Montado junto com o modal: a seleção recomeça a cada abertura. */
function BatchBody({ onCancel, onImport, protocols, goals, canChooseSpecialty, mySpecialty }: Props) {
  const [protocolName, setProtocolName] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  /** id da habilidade → especialidade da área. */
  const [selected, setSelected] = useState<Record<string, SpecialtyId>>({});
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [onlyGaps, setOnlyGaps] = useState(false);

  const protocol = protocols.find((p) => p.name === protocolName) ?? null;
  const application = protocol?.applications.find((a) => a.id === applicationId) ?? null;
  const rows = useMemo(() => (protocol && application ? skillScores(protocol, application.id) : []), [protocol, application]);
  const existing = useMemo(() => new Set(goals.map((g) => g.name.toLowerCase())), [goals]);

  const levels = [...new Set(rows.map((r) => r.level))].sort();
  const filtered = rows.filter(
    (r) => (!search || r.skill.toLowerCase().includes(search.toLowerCase())) && (level === "all" || r.level === Number(level)) && (!onlyGaps || r.pct < NEED),
  );
  const isDuplicate = (r: SkillScore) => existing.has(r.skill.toLowerCase());
  const selectable = filtered.filter((r) => !isDuplicate(r));
  const allOn = selectable.length > 0 && selectable.every((r) => selected[r.id]);
  const count = Object.keys(selected).length;

  const pickProtocol = (next: PatientProtocol) => {
    setProtocolName(next.name);
    setApplicationId(lastFinished(next)?.id ?? null);
    setSelected({});
    setSearch("");
    setLevel("all");
    setOnlyGaps(false);
  };
  const pickApplication = (id: string) => {
    setApplicationId(id);
    setSelected({});
  };
  const toggle = (r: SkillScore) => {
    if (isDuplicate(r)) return;
    setSelected((s) => {
      const next = { ...s };
      if (next[r.id]) delete next[r.id];
      else next[r.id] = mySpecialty;
      return next;
    });
  };
  const toggleAll = () =>
    setSelected((s) => {
      const next = { ...s };
      for (const r of selectable) {
        if (allOn) delete next[r.id];
        else next[r.id] ??= mySpecialty;
      }
      return next;
    });

  const submit = () => {
    if (!protocol || !application || count === 0) return;
    onImport(
      rows
        .filter((r) => selected[r.id])
        .map((r) => ({
          name: r.skill,
          protocol: protocol.name,
          level: r.level,
          specialty: selected[r.id]!,
          description: `Nível ${r.level} · ${r.pct}% de acerto (${r.hits}/${r.total}) na ${application.label} de ${protocol.name}.`,
        })),
    );
  };

  return (
    <>
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] overflow-hidden">
        <div className="h-full overflow-y-auto p-6 border-r border-neutral-100 flex flex-col gap-2.5 max-md:border-r-0 max-md:border-b max-md:h-auto">
          <span className={EYEBROW}>Protocolos do paciente</span>
          {protocols.length === 0 && <p className="text-[13px] font-semibold text-brand-purple-dark/50">Nenhum protocolo aplicado.</p>}
          <ol className="flex flex-col gap-1.5">
            {protocols.map((p, i) => {
              const isCur = p.name === protocolName;
              const total = p.applications.length;
              return (
                <li key={p.name}>
                  <button
                    type="button"
                    onClick={() => pickProtocol(p)}
                    aria-current={isCur ? "true" : undefined}
                    className={cx(
                      "flex items-start gap-2.5 w-full text-left p-2.5 rounded-lg border transition-colors",
                      isCur ? "border-brand-blue bg-brand-blue/12" : "border-transparent hover:bg-neutral-100/40",
                    )}
                  >
                    <span
                      className={cx(
                        "shrink-0 w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-extrabold",
                        isCur ? "bg-brand-blue text-white" : "bg-brand-purple-dark/7 text-brand-purple-dark/55",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[13px] font-extrabold leading-tight text-brand-purple-dark">{p.name}</span>
                      <span className="text-[11px] font-bold text-brand-purple-dark/55">
                        {total} {total === 1 ? "aplicação" : "aplicações"}
                      </span>
                      <span className="text-[11px] font-semibold text-brand-purple-dark/40">Última edição {p.editedAt}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <section className="h-full overflow-y-auto p-6 flex flex-col gap-4 min-w-0">
          {!protocol || !application ? (
            <div className="flex flex-col items-center justify-center gap-3 min-h-90 rounded-2xl border border-dashed border-neutral-100 text-sm font-semibold text-brand-purple-dark/55">
              <span className="w-13 h-13 rounded-xl inline-flex items-center justify-center bg-brand-blue/12 text-xl text-brand-blue">
                <Icon type="solid" name="fa-clipboard-check" />
              </span>
              <p>{protocols.length === 0 ? "Aplique um protocolo ao paciente para criar áreas a partir dele." : "Selecione um protocolo para carregar as aplicações."}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 items-start">
                <span className={EYEBROW}>Aplicação</span>
                <ApplicationDropdown applications={protocol.applications} current={application} onSelect={pickApplication} />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="search"
                  id="pic_batch_search"
                  name="pic_batch[search]"
                  placeholder="Buscar habilidade..."
                  leftIcon="fa-magnifying-glass"
                  className="flex-[1_1_220px] min-w-45"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Input
                  type="select"
                  id="pic_batch_level"
                  name="pic_batch[level]"
                  className="min-w-45"
                  value={level}
                  options={[["Todos os níveis", "all"], ...levels.map((l) => [`Nível ${l}`, String(l)] as const)]}
                  onChange={(value) => setLevel(value ?? "all")}
                />
                <Input
                  type="checkbox"
                  id="pic_batch_gaps"
                  name="pic_batch[gaps]"
                  label={`Só abaixo de ${NEED}%`}
                  checked={onlyGaps}
                  onChange={(event) => setOnlyGaps(event.target.checked)}
                />
                <Button type="button" variant="ghost" size="medium" leftIcon={allOn ? "fa-square-minus" : "fa-square-check"} disabled={selectable.length === 0} className="ml-auto text-blue! disabled:opacity-50" onClick={toggleAll}>
                  {allOn ? "Desmarcar todas" : "Marcar todas"}
                </Button>
              </div>

              <Table
                id="pic_batch_skills"
                rows={filtered}
                rowId={(r) => `pic_batch_${r.id}`}
                rowClick={toggle}
                emptyMessage="Nenhuma habilidade encontrada"
                col={[
                  {
                    label: "",
                    className: "w-11",
                    render: (r) => (
                      <span onClick={(event) => event.stopPropagation()}>
                        <RowCheckbox label={`Selecionar ${r.skill}`} checked={!!selected[r.id]} disabled={isDuplicate(r)} onChange={() => toggle(r)} />
                      </span>
                    ),
                  },
                  {
                    label: "Nível",
                    className: "w-28",
                    render: (r) => (
                      <span className={cx("inline-block px-2.5 py-0.5 rounded-full bg-brand-purple-dark/6 text-xs font-extrabold text-brand-purple-dark whitespace-nowrap", isDuplicate(r) && "opacity-55")}>
                        Nível {r.level}
                      </span>
                    ),
                  },
                  {
                    label: "Habilidade",
                    render: (r) => (
                      <span className={cx("inline-flex flex-wrap items-center gap-2", isDuplicate(r) && "opacity-55")}>
                        <span className="text-sm font-bold text-brand-purple-dark">{r.skill}</span>
                        {isDuplicate(r) && <span className="px-2 py-0.5 rounded-full bg-brand-purple-dark/7 text-[11px] font-extrabold text-brand-purple-dark/60">Já cadastrada</span>}
                      </span>
                    ),
                  },
                  {
                    label: "Acerto",
                    className: "w-44",
                    render: (r) => {
                      const tone = toneOf(r.pct);
                      return (
                        <span className={cx("grid grid-cols-[auto_auto] justify-start items-baseline gap-x-2 gap-y-0.5", isDuplicate(r) && "opacity-55")}>
                          <span className={cx("text-[15px] font-black", tone.text)}>{r.pct}%</span>
                          <span className="text-xs font-semibold text-brand-purple-dark/55 tabular-nums">
                            {r.hits}/{r.total}
                          </span>
                          <span className="col-span-2 h-1 w-28 rounded-full bg-brand-purple-dark/8 overflow-hidden">
                            <span className={cx("block h-full rounded-full", tone.bar)} style={{ width: `${r.pct}%` }} />
                          </span>
                        </span>
                      );
                    },
                  },
                  {
                    label: "Especialidade",
                    className: "w-60",
                    render: (r) =>
                      canChooseSpecialty ? (
                        <span onClick={(event) => event.stopPropagation()}>
                          <Input
                            type="select"
                            id={`pic_batch_specialty_${r.id}`}
                            name={`pic_batch[specialty][${r.id}]`}
                            value={selected[r.id] ?? mySpecialty}
                            disabled={!selected[r.id]}
                            options={SPECIALTIES.map((s) => [s.label, s.id] as const)}
                            onChange={(value) => value && setSelected((s) => ({ ...s, [r.id]: value as SpecialtyId }))}
                          />
                        </span>
                      ) : (
                        <span
                          className={cx("inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-purple-dark/5 text-[13px] font-bold text-brand-purple-dark/70", isDuplicate(r) && "opacity-55")}
                          title="Sua especialidade de login"
                        >
                          <Icon type="solid" name="fa-lock" className="text-[11px] text-brand-purple-dark/45" />
                          {specialtyOf(mySpecialty).label}
                        </span>
                      ),
                  },
                ]}
              />
            </>
          )}
        </section>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-4 px-6 py-3.5 border-t border-neutral-100">
        <Button type="button" variant="tint" onClick={onCancel}>
          Cancelar
        </Button>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 text-[13px] font-extrabold text-brand-purple-dark/60">
            áreas selecionadas
            <span className="min-w-7 h-7 px-2 rounded-full inline-flex items-center justify-center bg-brand-blue text-white text-[13px] font-extrabold tabular-nums">{count}</span>
          </span>
          <Button type="button" rightIcon="fa-file-import" disabled={count === 0} className="disabled:opacity-50" onClick={submit}>
            Importar
          </Button>
        </div>
      </footer>
    </>
  );
}
