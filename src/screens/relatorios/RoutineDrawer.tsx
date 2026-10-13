/**
 * Gaveta "Rotina de relatórios" (`RelRoutineModal` + `RelRoutineForm` da v2):
 * regras herdadas da operadora (só pausar) e regras próprias do paciente, que
 * alimentam os "Previstos pela rotina" da lista.
 */
import { useRef, useState, type ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { RadioCards, RadioSelector } from "../../components/Choice.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { DrawerModal } from "../../components/Overlay.js";
import { Tag } from "../../components/Tag.js";
import {
  REL_PROFS,
  REL_REQUESTERS,
  REL_TYPES,
  RR_BLANK,
  RR_FREQ,
  patientRoutine,
  relProfById,
  relTypeName,
  rrActionText,
  rrMonthBR,
  rrNext,
  rrSummary,
  toBR,
  type Requester,
  type ReportTypeId,
  type RoutineFreq,
  type RoutineRule,
} from "./model.js";
import { Callout, DrawerFooter, FieldBlock, TitleWithSub } from "./parts.js";
import { useReports } from "./store.js";

/** Linha de regra da rotina (`rr-rule`). Novo — não existe no Phoenix. */
function RoutineRuleRow({ icon, operator, paused, children, side }: { icon: string; operator?: boolean; paused?: boolean; children: ReactNode; side: ReactNode }) {
  return (
    <div
      className={[
        "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-neutral-100 px-3.5 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]",
        paused ? "bg-brand-purple-dark/5" : "",
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex h-8.5 w-8.5 items-center justify-center rounded-[10px]",
          operator ? "bg-purple-light text-purple-dark" : "bg-blue-light text-blue-dark",
        ].join(" ")}
      >
        <Icon name={icon} type="solid" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">{children}</div>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1">{side}</div>
    </div>
  );
}

/** Cabeçalho de seção da rotina (`rr-sec__head`). Novo — não existe no Phoenix. */
function RoutineSection({ title, text, action, children }: { title: string; text: string; action: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-brand-purple-dark">{title}</h3>
          <p className="mt-0.5 max-w-[460px] text-[13px] text-brand-purple-dark/60">{text}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const Muted = ({ children }: { children: ReactNode }) => <p className="rounded-[10px] bg-brand-purple-dark/5 px-4 py-3.5 text-sm text-brand-purple-dark/60">{children}</p>;
const RuleName = ({ children, paused }: { children: ReactNode; paused?: boolean }) => (
  <b className={["text-sm font-extrabold", paused ? "text-brand-purple-dark/55" : "text-brand-purple-dark"].join(" ")}>{children}</b>
);
const RuleLine = ({ children }: { children: ReactNode }) => <span className="text-[12.5px] text-brand-purple-dark/60">{children}</span>;

export function RoutineDrawer() {
  const store = useReports();
  const { patient, routine, closeModal, toast } = store;
  const op = patient.operator;
  const p = patientRoutine(routine, patient.id);
  const inherited = routine.operators[op] ?? [];
  const [pausing, setPausing] = useState<{ id: string; reason: string } | null>(null);
  const [edit, setEdit] = useState<(RoutineRule & { isNew?: boolean }) | null>(null);
  const counter = useRef(0);

  if (edit) {
    return (
      <DrawerModal
        id="relatorio-rotina"
        show
        onCancel={closeModal}
        variant="medium"
        customTitle={{ children: <TitleWithSub title={edit.isNew ? "Nova regra" : "Editar regra"} sub={patient.name} /> }}
      >
        <RoutineForm
          rule={edit}
          onBack={() => setEdit(null)}
          onSave={(rule) => {
            store.saveOwnRule(rule);
            setEdit(null);
          }}
        />
      </DrawerModal>
    );
  }

  return (
    <DrawerModal
      id="relatorio-rotina"
      show
      onCancel={closeModal}
      variant="medium"
      customTitle={{ children: <TitleWithSub title="Rotina de relatórios" sub={`Relatórios que o sistema prevê para ${patient.name}.`} /> }}
    >
      <div className="flex flex-col gap-6">
        <RoutineSection
          title="Exigidos pela operadora"
          text={`Herdados do plano ${op}. A regra é editada no cadastro da operadora; aqui você pode pausar neste paciente.`}
          action={
            <Button type="button" variant="ghost" size="small" rightIcon="fa-arrow-up-right-from-square" iconType="solid" onClick={() => toast("info", "Operadoras", `Edite em Operadoras › ${op} › Relatórios.`)}>
              Editar na operadora
            </Button>
          }
        >
          {inherited.length === 0 && <Muted>A operadora não exige relatórios periódicos.</Muted>}
          {inherited.map((r) => {
            const paused = p.paused[r.id];
            const isPausing = pausing?.id === r.id;
            return (
              <RoutineRuleRow
                key={r.id}
                icon="fa-building"
                operator
                paused={Boolean(paused)}
                side={
                  <>
                    <Tag item={paused ? "Pausada" : "Ativa"} variant={paused ? "orange" : "green"} />
                    {!isPausing &&
                      (paused ? (
                        <Button type="button" size="small" variant="tint" leftIcon="fa-play" iconType="solid" onClick={() => store.resumeRule(r.id)}>
                          Retomar
                        </Button>
                      ) : (
                        <Button type="button" size="small" leftIcon="fa-pause" iconType="solid" onClick={() => setPausing({ id: r.id, reason: "" })}>
                          Pausar
                        </Button>
                      ))}
                  </>
                }
              >
                <RuleName paused={Boolean(paused)}>{relTypeName(r)}</RuleName>
                <RuleLine>{`${rrSummary(r)} · ${rrActionText(r)}`}</RuleLine>
                {paused && (
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-orange-dark">
                    <Icon name="fa-pause" type="solid" />
                    {`Pausada em ${paused.at}: ${paused.reason}`}
                  </span>
                )}
                {isPausing && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Input
                      id={`pausa-${r.id}`}
                      className="min-w-[200px] flex-1"
                      placeholder="Motivo da pausa (obrigatório)"
                      autoFocus
                      value={pausing.reason}
                      onChange={(event) => setPausing({ id: r.id, reason: event.target.value })}
                    />
                    <Button type="button" size="small" variant="ghost" onClick={() => setPausing(null)}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="small"
                      disabled={pausing.reason.trim().length < 3}
                      className="disabled:opacity-50"
                      onClick={() => {
                        store.pauseRule(r.id, pausing.reason.trim());
                        setPausing(null);
                      }}
                    >
                      Pausar
                    </Button>
                  </div>
                )}
              </RoutineRuleRow>
            );
          })}
        </RoutineSection>

        <RoutineSection
          title="Regras deste paciente"
          text="Rotinas combinadas com a família ou definidas pela equipe."
          action={
            <Button
              type="button"
              variant="tint"
              size="small"
              rightIcon="fa-plus"
              iconType="solid"
              onClick={() => setEdit({ ...RR_BLANK, id: `pr-novo-${++counter.current}`, requester: "Família", isNew: true })}
            >
              Adicionar regra
            </Button>
          }
        >
          {p.own.length === 0 && <Muted>Nenhuma regra própria.</Muted>}
          {p.own.map((r) => {
            const prof = relProfById(r.profId);
            return (
              <RoutineRuleRow
                key={r.id}
                icon="fa-user"
                side={
                  <>
                    <Button type="button" size="small" leftIcon="fa-pen" iconType="solid" onClick={() => setEdit({ ...r })}>
                      Editar
                    </Button>
                    <Button type="button" size="small" variant="tint" color="red" title="Remover" aria-label="Remover" onClick={() => store.removeOwnRule(r.id)}>
                      <Icon name="fa-trash-alt" type="solid" />
                    </Button>
                  </>
                }
              >
                <RuleName>{relTypeName(r)}</RuleName>
                <RuleLine>{`${rrSummary(r)} · Solicitante ${r.requester}${prof ? ` · ${prof.name}` : ""}`}</RuleLine>
                <RuleLine>{`${rrActionText(r)} · vigência ${rrMonthBR(r.start)}${r.end ? ` a ${rrMonthBR(r.end)}` : " sem fim"}`}</RuleLine>
              </RoutineRuleRow>
            );
          })}
        </RoutineSection>
      </div>

      <DrawerFooter>
        <Button type="button" onClick={closeModal}>
          Concluir
        </Button>
      </DrawerFooter>
    </DrawerModal>
  );
}

function RoutineForm({ rule, onBack, onSave }: { rule: RoutineRule & { isNew?: boolean }; onBack: () => void; onSave: (rule: RoutineRule) => void }) {
  const [f, setF] = useState(rule);
  const up = <K extends keyof RoutineRule>(k: K, v: RoutineRule[K]) => setF((x) => ({ ...x, [k]: v }));
  const next = rrNext(f);
  const valid = (f.typeId !== "outro" || (f.customName ?? "").trim()) && Number(f.dueValue) > 0 && f.start && (f.action === "notify" || Number(f.autoDays) > 0);
  const profSelect = (
    <Input
      id="regra-responsavel"
      type="select"
      label="Responsável padrão"
      prompt="Definir em cada solicitação"
      value={f.profId}
      options={REL_PROFS.map((p) => [`${p.name} · ${p.specialty}`, p.id] as const)}
      onChange={(v) => up("profId", v ?? "")}
    />
  );

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="regra-tipo"
            type="select"
            label="Tipo de relatório"
            value={f.typeId}
            clear={false}
            options={REL_TYPES.filter((t) => t.kind !== "external").map((t) => [t.name, t.id] as const)}
            onChange={(v) => v && up("typeId", v as ReportTypeId)}
          />
          {f.typeId === "outro" ? (
            <Input
              id="regra-nome"
              label="Nome do relatório"
              placeholder="Ex.: Relatório para a escola"
              value={f.customName ?? ""}
              onChange={(event) => up("customName", event.target.value)}
            />
          ) : (
            profSelect
          )}
        </div>
        {f.typeId === "outro" && profSelect}

        <RadioSelector
          label="Periodicidade"
          field={{ id: "regra-periodicidade", name: "regra[freq]", value: f.freq }}
          radio={RR_FREQ.map((x) => ({ value: x.id, label: x.label }))}
          onChange={(event) => up("freq", event.target.value as RoutineFreq)}
        />

        <FieldBlock label="Prazo de entrega">
          <div className="flex gap-2">
            <Input
              id="regra-prazo-modo"
              type="select"
              className="flex-1"
              value={f.dueMode}
              clear={false}
              options={[
                ["Dia do mês seguinte ao período", "day_next"],
                ["Dias após o fim do período", "days_after"],
              ]}
              onChange={(v) => v && up("dueMode", v as RoutineRule["dueMode"])}
            />
            <Input
              id="regra-prazo-valor"
              type="number"
              className="w-20 flex-none"
              min={1}
              max={f.dueMode === "day_next" ? 28 : 90}
              value={f.dueValue}
              onChange={(event) => up("dueValue", Number(event.target.value))}
            />
          </div>
        </FieldBlock>

        <RadioSelector
          label="Solicitante"
          field={{ id: "regra-solicitante", name: "regra[requester]", value: f.requester }}
          radio={REL_REQUESTERS.map((x) => ({ value: x, label: x }))}
          onChange={(event) => up("requester", event.target.value as Requester)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input id="regra-inicio" type="month" label="Início da vigência" value={f.start} onChange={(event) => up("start", event.target.value)} />
          <Input id="regra-fim" type="month" label="Fim da vigência (opcional)" value={f.end} onChange={(event) => up("end", event.target.value)} />
        </div>

        <RadioCards
          id="regra-acao"
          title="Quando o prazo se aproximar"
          value={f.action}
          onChange={(v) => up("action", v as RoutineRule["action"])}
          option={[
            { id: "notify", title: "Avisar em Previstos", subtitle: "A coordenação decide quando solicitar.", icon: "fa-bell" },
            {
              id: "auto",
              title: "Criar a solicitação automaticamente",
              icon: "fa-robot",
              children: (
                <div className="flex items-center gap-2 text-[12.5px] text-brand-purple-dark/60">
                  <Input
                    id="regra-auto-dias"
                    type="number"
                    className="w-20"
                    min={1}
                    value={f.autoDays}
                    onChange={(event) => up("autoDays", Number(event.target.value))}
                  />
                  dias antes do prazo
                </div>
              ),
            },
          ]}
        />

        <Callout tone="info" icon="fa-regular fa-calendar">
          {`Próximo: ${relTypeName(f)} · ${next.label} · prazo ${toBR(next.due)}`}
        </Callout>
      </div>

      <DrawerFooter>
        <Button type="button" variant="ghost" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="button"
          disabled={!valid}
          className="disabled:opacity-50"
          onClick={() => {
            const { isNew: _isNew, ...r } = f;
            onSave({ ...r, dueValue: Number(r.dueValue), autoDays: Number(r.autoDays) });
          }}
        >
          Salvar regra
        </Button>
      </DrawerFooter>
    </>
  );
}
