/**
 * PIC — a aba Plano de Intervenção Comportamental da ficha do paciente,
 * redesenhada: um card só, com o cabeçalho do plano, as abas de especialidade
 * e a grade Áreas → Objetivos → Programas.
 *
 * Novo — não existe no Phoenix:
 * - as vigências no formato da Escala (o seletor no cabeçalho), no lugar da
 *   tabela de planos; vigência encerrada fica somente leitura;
 * - o botão "Exportar PDF" e o modal Exportar PIC (`./pic/ExportPicModal.tsx`),
 *   com a pré-visualização do PIC em uma página A4 e o "Baixar PDF";
 * - as abas e as pílulas de especialidade (`./pic/parts.tsx`).
 *
 * Fora do protótipo: Pré-visualizar (a simulação da sessão), Nova vigência, a
 * visão em Lista (desabilitada no seletor) e os modais de área, objetivo e
 * programa. Os botões ficam, com um toast.
 */
import { useEffect, useState } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { RadioSelector } from "../components/Choice.js";
import { Icon } from "../components/Icon.js";
import { Dropdown } from "../components/Overlay.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { PatientLayout } from "../layouts/PatientLayout.js";
import { ExportPicModal } from "./pic/ExportPicModal.js";
import { MY_SPECIALTY, PIC_FIXTURES, TODAY, type PicFixture, type Plan, type SpecialtyId } from "./pic/fixtures.js";
import { GridLayout, goalsOf, SpecialtyTabs } from "./pic/parts.js";

export const PIC_PATH = "/backoffice/pacientes/pt1/pic";

const CURRENT_USER = {
  name: "Marcus Vinícius Gimenes",
  units: ["Unidade Teste", "Santana"],
  roles: [],
  professional: true,
};

const fixtureOf = (context: ScenarioContext): PicFixture => {
  const data = context.data as PicFixture | undefined;
  if (data) return data;
  const first = PIC_FIXTURES[0]!.data;
  return typeof first === "function" ? first() : first;
};

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const notInPrototype = (title: string) =>
  showToast({ type: "info", title, content: "Esta ação não faz parte deste protótipo.", closeTime: 3000 });

/** dd/mm/aaaa → aaaa-mm-dd, para comparar. */
const iso = (br: string) => br.split("/").reverse().join("-");

type VigencyStatus = { label: string; order: number; className: string };

/** `agenda_period_status/1` da Escala: Em vigência, Futura ou Encerrada. */
function statusOf(plan: Plan): VigencyStatus {
  const today = iso(TODAY);
  if (today > iso(plan.endAt)) return { label: "Encerrada", order: 2, className: "bg-red-light text-red" };
  if (today < iso(plan.startAt)) return { label: "Futura", order: 1, className: "bg-brand-purple-dark/8 text-brand-purple-dark" };
  return { label: "Em vigência", order: 0, className: "bg-green text-white" };
}

function StatusBadge({ status }: { status: VigencyStatus }) {
  return <span className={cx("text-xs font-extrabold px-3 py-0.5 rounded-full", status.className)}>{status.label}</span>;
}

/** Novo: o seletor de vigências da Escala do profissional, com os nomes dos planos. */
function VigencyDropdown({ plans, current, onSelect, canCreate }: { plans: Plan[]; current: Plan; onSelect: (id: string) => void; canCreate: boolean }) {
  const sorted = [...plans].sort((a, b) => iso(b.startAt).localeCompare(iso(a.startAt)));
  return (
    <Dropdown
      id="pic_vigency"
      placement="bottom-end"
      dropdownClass="[&>div]:min-w-80"
      items={
        <>
          {sorted.map((plan) => {
            const selected = plan.id === current.id;
            return (
              <button
                key={plan.id}
                type="button"
                className={cx(
                  "flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-left text-sm text-brand-purple-dark hover:bg-brand-blue/10",
                  selected ? "bg-brand-blue/14 font-extrabold" : "font-semibold",
                )}
                onClick={() => onSelect(plan.id)}
              >
                <span className="w-4 shrink-0 text-center text-xs text-brand-blue">{selected && <Icon type="solid" name="fa-check" />}</span>
                <span className="flex-1 tabular-nums whitespace-nowrap">
                  {plan.startAt} – {plan.endAt}
                  <em className="block not-italic text-xs font-bold text-brand-purple-dark/50">{plan.name}</em>
                </span>
                <StatusBadge status={statusOf(plan)} />
              </button>
            );
          })}
          {canCreate && (
            <button
              type="button"
              className="flex items-center justify-center gap-2 w-full mt-1 px-2.5 py-2 border-t border-neutral-100 text-sm font-extrabold text-brand-blue hover:bg-brand-blue/10"
              onClick={() => notInPrototype("Nova vigência")}
            >
              <Icon type="solid" name="fa-plus" /> Nova vigência
            </button>
          )}
        </>
      }
    >
      <span className="inline-flex items-center gap-2.5 h-12 px-3.5 rounded-lg border border-neutral-100 bg-brand-purple-dark/5 text-sm font-bold text-brand-purple-dark whitespace-nowrap hover:border-brand-blue hover:bg-brand-blue/8">
        <span className="inline-flex items-center gap-2 tabular-nums">
          {current.startAt} – {current.endAt}
          <StatusBadge status={statusOf(current)} />
        </span>
        <Icon type="solid" name="fa-chevron-down" className="text-[10px] text-brand-purple-dark/50" />
      </span>
    </Dropdown>
  );
}

function PlanTab({ context, fixture }: { context: ScenarioContext; fixture: PicFixture }) {
  const { plans, goals, patient } = fixture;
  const ordered = [...plans].sort((a, b) => statusOf(a).order - statusOf(b).order || iso(b.startAt).localeCompare(iso(a.startAt)));
  const [planId, setPlanId] = useState(ordered[0]?.id);
  const [spec, setSpec] = useState<SpecialtyId | "all">("all");
  const [exporting, setExporting] = useState(fixture.exportOpen ?? false);
  // Os dados chegam do adapter depois do primeiro render.
  useEffect(() => setExporting(fixture.exportOpen ?? false), [fixture.exportOpen]);

  const plan = plans.find((p) => p.id === planId) ?? ordered[0];
  if (!plan) return null;
  const past = statusOf(plan).order === 2;
  const canCreate = context.can("behavior_intervention_plans.create");
  const canEdit = context.can("behavior_intervention_plans.edit") && !past;

  return (
    <Card>
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-xl font-bold text-brand-purple-dark">Plano de Intervenção Comportamental</h2>
          {past && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-purple-dark/6 text-xs font-extrabold text-brand-purple-dark/60">
              <Icon type="solid" name="fa-lock" className="text-[11px]" /> Vigência encerrada · somente leitura
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button type="button" variant="tint" leftIcon="fa-eye" iconType="solid" onClick={() => notInPrototype("Pré-visualizar")}>
              Pré-visualizar
            </Button>
            <Button type="button" variant="tint" color="purple" leftIcon="fa-file-pdf" iconType="solid" onClick={() => setExporting(true)}>
              Exportar PDF
            </Button>
            <RadioSelector
              field={{ id: "layout_opts_layout", name: "layout_opts[layout]", value: "grid" }}
              radio={[
                { value: "grid", icon: "fa-table-cells", title: "Grade" },
                { value: "list", icon: "fa-list", title: "Lista (fora do protótipo)", disabled: true },
              ]}
            />
            <VigencyDropdown plans={plans} current={plan} onSelect={setPlanId} canCreate={canCreate} />
          </div>
        </div>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-brand-purple-dark/70">
          <span className="font-extrabold text-brand-purple-dark">{plan.name}</span>
          <span>
            <em className="not-italic font-extrabold text-brand-purple-dark/45">Criado por</em> {plan.createdBy.name} · {plan.createdBy.specialty}
          </span>
          <span>
            <em className="not-italic font-extrabold text-brand-purple-dark/45">Assinado por</em>{" "}
            {plan.legalGuardian ? `${plan.legalGuardian.name} · ${plan.legalGuardian.phone}` : "—"}
          </span>
          {plan.observation && (
            <span>
              <em className="not-italic font-extrabold text-brand-purple-dark/45">Obs.</em> {plan.observation}
            </span>
          )}
        </p>
      </div>

      <SpecialtyTabs goals={goals} value={spec} mine={MY_SPECIALTY} onChange={setSpec} />

      <GridLayout key={`${plan.id}-${spec}`} goals={goalsOf(goals, spec)} canEdit={canEdit} canDiscard={canEdit && context.can("behavior_intervention_plans.discard")} />

      <ExportPicModal show={exporting} onCancel={() => setExporting(false)} plan={plan} goals={goals} patientName={patient.name} />
    </Card>
  );
}

export function BehaviorInterventionPlan({ context }: ScreenProps) {
  const fixture = fixtureOf(context);
  return (
    <BackofficeLayout
      context={context}
      currentPath="/backoffice/pacientes/pt1"
      breadcrumbs={[{ label: "Pacientes", to: "/backoffice/pacientes" }, { label: fixture.patient.name }]}
      currentUser={CURRENT_USER}
      currentUnit="Unidade Teste"
    >
      <PatientLayout
        context={context}
        patient={fixture.patient}
        activeTab="treatment_plan"
        renderTab={(tab) => (tab === "treatment_plan" ? <PlanTab key={context.fixture?.id} context={context} fixture={fixture} /> : null)}
      />
    </BackofficeLayout>
  );
}
