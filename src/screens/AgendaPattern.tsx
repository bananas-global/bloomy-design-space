/**
 * Padrão de Agenda — a aba Mapa de Horas › Padrão de Agenda da ficha do
 * paciente (`PatientLive.Components.HourMap.Agenda`), com o Plano Terapêutico.
 *
 * Novo — não existe no Phoenix:
 * - o botão verde passa de "Padrão de Agenda" (que baixava o PDF direto) para
 *   "Plano Terapêutico", e abre o modal com a pré-visualização do PDF
 *   (`./agenda-pattern/TherapeuticPlanModal.tsx`): opções de profissionais,
 *   salas e observações, e o "Baixar PDF".
 *
 * O resto segue o Phoenix. Fora do protótipo: Agendamentos (o
 * `PrintHourMapModal`), Editar vigência, Voltar, Propagar para Agenda, Editar
 * Agendamentos e a disponibilidade por profissional e por sala nas células.
 * Os botões ficam, com um toast.
 */
import { useEffect, useState } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { Icon } from "../components/Icon.js";
import { FakeInput, Input, InputSwitchCard, type SelectOption } from "../components/Input.js";
import { Header } from "../components/Layout.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { PatientLayout } from "../layouts/PatientLayout.js";
import {
  AGENDA_PATTERN_FIXTURES,
  PROFESSIONALS,
  ROOMS,
  SERVICES,
  type AgendaItem,
  type AgendaPatternFixture,
} from "./agenda-pattern/fixtures.js";
import { AgendaGrid, AgendaItemModal, SpecialtyItems } from "./agenda-pattern/parts.js";
import { TherapeuticPlanModal } from "./agenda-pattern/TherapeuticPlanModal.js";

export const AGENDA_PATTERN_PATH = "/backoffice/pacientes/pt1/padrao-de-agenda";

const CURRENT_USER = {
  name: "Marcus Vinícius Gimenes",
  units: ["Unidade Teste", "Santana"],
  roles: [],
  professional: true,
};

const fixtureOf = (context: ScenarioContext): AgendaPatternFixture => {
  const data = context.data as AgendaPatternFixture | undefined;
  if (data) return data;
  const first = AGENDA_PATTERN_FIXTURES[0]!.data;
  return typeof first === "function" ? first() : first;
};

const notInPrototype = (title: string) =>
  showToast({ type: "info", title, content: "Esta ação não faz parte deste protótipo.", closeTime: 3000 });

const options = (values: string[]): SelectOption[] => [...new Set(values)].map((value) => ({ label: value, value }));
const search = (list: SelectOption[]) => (name: string) => list.filter((option) => option.label.toLowerCase().includes(name.toLowerCase()));

const UNIT_OPTIONS = options(["Unidade Teste"]);
const SERVICE_OPTIONS = options(Object.values(SERVICES).flat());
const PROFESSIONAL_OPTIONS = options(Object.values(PROFESSIONALS).flat());
const ROOM_OPTIONS = options(ROOMS);

/** Os filtros de disponibilidade (`toggle_filters`). */
function Filters() {
  return (
    <div className="flex flex-wrap items-center gap-4 pb-8">
      <p className="font-bold text-brand-purple-dark text-lg uppercase">Filtros</p>
      <Input type="select_search" id="hour_map_unit_id" prompt="Unidades (todas)" className="flex-1" options={UNIT_OPTIONS} callback={search(UNIT_OPTIONS)} />
      <Input type="select_search" id="hour_map_service_id" prompt="Serviços (todos)" className="flex-1" options={SERVICE_OPTIONS} callback={search(SERVICE_OPTIONS)} />
      <Input
        type="select_search"
        id="hour_map_professional_id"
        prompt="Profissionais (todos)"
        className="flex-1"
        options={PROFESSIONAL_OPTIONS}
        callback={search(PROFESSIONAL_OPTIONS)}
      />
      <Input type="select_search" id="hour_map_unit_room_id" prompt="Salas (todas)" className="flex-1" options={ROOM_OPTIONS} callback={search(ROOM_OPTIONS)} />
    </div>
  );
}

type ItemModal = { editing?: AgendaItem; slot?: { weekday: number; hour: number } };

function AgendaPatternTab({ context, fixture }: { context: ScenarioContext; fixture: AgendaPatternFixture }) {
  const { hourMap, patient } = fixture;
  const [items, setItems] = useState(fixture.items);
  const [showFilters, setShowFilters] = useState(false);
  const [autoRenew, setAutoRenew] = useState(hourMap.autoRenew);
  const [itemModal, setItemModal] = useState<ItemModal | null>(null);
  const [planOpen, setPlanOpen] = useState(fixture.planOpen ?? false);
  // Os dados chegam do adapter depois do primeiro render.
  useEffect(() => setItems(fixture.items), [fixture.items]);
  useEffect(() => setPlanOpen(fixture.planOpen ?? false), [fixture.planOpen]);

  const canManage = context.can("hour_maps.manage_hour_map");

  function saveItem(item: AgendaItem) {
    setItems((prev) => (prev.some((p) => p.id === item.id) ? prev.map((p) => (p.id === item.id ? item : p)) : [...prev, item]));
    setItemModal(null);
  }

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
    setItemModal(null);
  }

  return (
    <Card>
      <Header
        className="pb-8"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="tint" color="green" rightIcon="fa-file-pdf" onClick={() => setPlanOpen(true)}>
              Plano Terapêutico
            </Button>
            <Button variant="tint" color="purple" rightIcon="fa-file-pdf" onClick={() => notInPrototype("Agendamentos")}>
              Agendamentos
            </Button>
            <Button variant="tint" rightIcon={showFilters ? "fa-times" : "fa-eye"} onClick={() => setShowFilters((v) => !v)}>
              Disponibilidade
            </Button>
            {canManage && (
              <InputSwitchCard label="Renovação Automática" active={{ id: "hour_map_auto_renew", name: "hour_map[auto_renew]", value: autoRenew }}>
                <Input
                  type="switch"
                  field={{ id: "hour_map_auto_renew", name: "hour_map[auto_renew]", value: autoRenew }}
                  title="Ativar/Desativar renovação automática"
                  onChange={(event) => setAutoRenew(event.target.checked)}
                />
              </InputSwitchCard>
            )}
          </div>
        }
      >
        Padrão de Agenda
      </Header>

      <div>
        {showFilters && <Filters />}

        <div className="mb-4 flex items-end gap-2">
          <FakeInput label="Período de Vigência" value={`${hourMap.startAt} até ${hourMap.endAt}`} className="flex-1" />
          {canManage && (
            <Button type="button" variant="tint" rightIcon="fa-pen" onClick={() => notInPrototype("Editar vigência")}>
              Editar vigência
            </Button>
          )}
        </div>

        <SpecialtyItems items={items} />

        <AgendaGrid
          items={items}
          onCreate={(weekday, hour) => canManage && setItemModal({ slot: { weekday, hour } })}
          onEdit={(item) => canManage && setItemModal({ editing: item })}
        />

        <div className="flex items-center justify-between mt-8">
          <Button type="button" leftIcon="fa-arrow-left" variant="tint" onClick={() => notInPrototype("Voltar")}>
            Voltar
          </Button>

          <div className="flex gap-2 items-center ml-auto mr-2">
            <div className="text-end">
              <p className="text-brand-red font-black text-base/4">
                {items.length} / {hourMap.maxAuthorization}
              </p>
              <p className="text-sm/3 text-brand-purple-dark/80">Agendamentos / Autorizações</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-brand-red/20 flex items-center justify-center">
              <Icon type="solid" name="fa-file-check" className="text-brand-red text-lg" />
            </div>
          </div>

          {canManage && (
            <Button type="button" rightIcon="fa-calendar-day" variant="tint" color="purple" onClick={() => notInPrototype("Propagar para Agenda")}>
              Propagar para Agenda
            </Button>
          )}
          {canManage && (
            <Button rightIcon="fa-calendar-circle-user" className="ml-2" onClick={() => notInPrototype("Editar Agendamentos")}>
              Editar Agendamentos
            </Button>
          )}
        </div>
      </div>

      {itemModal && (
        <AgendaItemModal editing={itemModal.editing} slot={itemModal.slot} onCancel={() => setItemModal(null)} onSave={saveItem} onDelete={deleteItem} />
      )}

      <TherapeuticPlanModal show={planOpen} onCancel={() => setPlanOpen(false)} patientName={patient.name} hourMap={hourMap} items={items} />
    </Card>
  );
}

export function AgendaPattern({ context }: ScreenProps) {
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
        activeTab="agenda_pattern"
        renderTab={(tab) => (tab === "agenda_pattern" ? <AgendaPatternTab key={context.fixture?.id} context={context} fixture={fixture} /> : null)}
      />
    </BackofficeLayout>
  );
}
