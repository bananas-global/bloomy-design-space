/**
 * Mapa de Salas — a aba Salas da unidade (`unit_live/components/unit_rooms.ex`
 * e `unit_room_schedule_blocking.ex`), na versão 2 do protótipo.
 *
 * A moldura do backoffice com a ficha da unidade e a aba Salas: os
 * `button_tabs` Salas / Bloqueios, o mapa de ocupação do dia (o planejado de
 * cada ponto, editável, sobre a escala que vem do perfil dos profissionais),
 * a gaveta da sala e os bloqueios.
 *
 * A tela monta os dados a partir dos controles (`mapa-salas/flow.ts`) sobre as
 * duas unidades do protótipo (`mapa-salas/fixtures.ts`).
 */
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { UnitLayout } from "../layouts/UnitLayout.js";
import { UNITS, unitById, type MapUnit, type RoomsMapFixture, type UnitId } from "./mapa-salas/fixtures.js";
import { ROOMS_MAP_CONTROLS, useControlledState, type Controls } from "./mapa-salas/flow.js";
import { TODAY_KEY, headerCounts, type DayKey, type Focus } from "./mapa-salas/model.js";
import { ModalHost, RoomsTab } from "./mapa-salas/RoomsTab.js";
import { RoomsMapProvider, dayModelOf, type MapModal, type RoomsMapState } from "./mapa-salas/store.js";

const CURRENT_USER = {
  name: "Marcus Vinícius Gimenes",
  units: UNITS.map((u) => u.name),
  roles: [],
  professional: false,
};

const unitsOf = (context: ScenarioContext) => (context.data as RoomsMapFixture | undefined)?.units ?? UNITS;
const DAY_KEYS: DayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const FOCUS: Focus[] = ["all", "ok", "open", "extra", "noplan", "divergent", "temp"];

/** A gaveta que cada valor do controle "Aberta" abre, achada no estado atual. */
function modalOf(overlay: string | undefined, s: RoomsMapState, unit: MapUnit): MapModal | null {
  const { model } = dayModelOf(s, unit);
  const lanes = model.rooms.flatMap(({ room, lanes }) => lanes.map((l) => ({ room, l })));
  switch (overlay) {
    case "room-new":
      return { kind: "room", roomId: null };
    case "room-edit":
      return s.rooms[0] ? { kind: "room", roomId: s.rooms[0].id } : null;
    case "plan": {
      const hit = lanes.find(({ l }) => l.point && l.plan.length === 0);
      return hit ? { kind: "plan", roomId: hit.room.id, point: hit.l.point!.name, from: model.dayStart } : null;
    }
    case "plan-edit": {
      const hit = lanes.find(({ l }) => l.plan.length > 0);
      return hit ? { kind: "planEdit", roomId: hit.room.id, point: hit.l.point!.name, from: hit.l.plan[0]!.from } : null;
    }
    case "blocking":
      return { kind: "blocking" };
    case "blocking-info":
      return s.blockings[0] ? { kind: "blockingInfo", id: s.blockings[0].id } : null;
    default:
      return null;
  }
}

const OVERLAY_OF: Record<MapModal["kind"], (m: MapModal) => string> = {
  room: (m) => (m.kind === "room" && m.roomId ? "room-edit" : "room-new"),
  plan: () => "plan",
  planEdit: () => "plan-edit",
  blocking: () => "blocking",
  blockingInfo: () => "blocking-info",
};

/** Controles que re-semeiam só a parte deles, sem refazer a unidade. */
const PATCHABLE = ["sub", "day", "focus", "blockings", "overlay"];

function seedWith(units: MapUnit[]) {
  const unitOf = (id: string) => units.find((u) => u.id === id) ?? unitById(id);

  return function seed(c: Controls, prev?: RoomsMapState, changed?: string[]): RoomsMapState {
    const unitId: UnitId = c.unit === "u2" ? "u2" : "u1";
    const unit = unitOf(unitId);
    const patch = Boolean(prev && prev.unitId === unitId && changed?.every((id) => PATCHABLE.includes(id)));
    let s: RoomsMapState;
    if (prev && changed && patch) {
      s = { ...prev };
      if (changed.includes("sub")) s = { ...s, sub: c.sub === "blockings" ? "blockings" : "rooms", tabsKey: s.tabsKey + 1 };
      if (changed.includes("day")) s = { ...s, day: DAY_KEYS.includes(c.day as DayKey) ? (c.day as DayKey) : TODAY_KEY };
      if (changed.includes("focus")) s = { ...s, focus: FOCUS.includes(c.focus as Focus) ? (c.focus as Focus) : "all" };
      if (changed.includes("blockings")) s = { ...s, blockings: c.blockings === "empty" ? [] : unit.roomBlockings };
    } else {
      s = {
        unitId,
        rooms: unit.rooms,
        blockings: c.blockings === "empty" ? [] : unit.roomBlockings,
        sub: c.sub === "blockings" ? "blockings" : "rooms",
        tabsKey: (prev?.tabsKey ?? 0) + 1,
        day: DAY_KEYS.includes(c.day as DayKey) ? (c.day as DayKey) : TODAY_KEY,
        q: "",
        focus: FOCUS.includes(c.focus as Focus) ? (c.focus as Focus) : "all",
        modal: null,
      };
    }
    if (!patch || changed?.includes("overlay")) {
      const modal = modalOf(c.overlay, s, unit);
      const sub = modal && (modal.kind === "blocking" || modal.kind === "blockingInfo") ? "blockings" : modal ? "rooms" : s.sub;
      s = { ...s, modal, ...(sub !== s.sub ? { sub, tabsKey: s.tabsKey + 1 } : {}) };
    }
    return s;
  };
}

function derive(s: RoomsMapState): Controls {
  return {
    unit: s.unitId,
    sub: s.sub,
    day: s.day,
    focus: s.focus,
    blockings: s.blockings.length ? "data" : "empty",
    overlay: s.modal ? OVERLAY_OF[s.modal.kind](s.modal) : "none",
  };
}

function RoomsMapScreen({ context }: { context: ScenarioContext }) {
  const units = unitsOf(context);
  const [state, setState] = useControlledState<RoomsMapState>(context, {
    groups: ROOMS_MAP_CONTROLS,
    seed: seedWith(units),
    derive,
  });
  const unit = units.find((u) => u.id === state.unitId) ?? unitById(state.unitId);
  const counts = headerCounts(state.rooms);

  return (
    <RoomsMapProvider context={context} unit={unit} state={state} setState={setState}>
      <BackofficeLayout
        context={context}
        currentPath="/backoffice/unidades"
        breadcrumbs={[{ label: "Unidades", to: "/backoffice/unidades" }, { label: unit.name }]}
        currentUser={CURRENT_USER}
        currentUnit={unit.name}
      >
        <UnitLayout
          key={unit.id}
          context={context}
          unit={{ name: unit.name, active: true, phone: unit.phone, address: unit.address, ...counts }}
          activeTab="rooms"
          renderTab={(tab) => (tab === "rooms" ? <RoomsTab /> : null)}
        />
        <ModalHost />
      </BackofficeLayout>
    </RoomsMapProvider>
  );
}

export function UnitRoomsMap({ context }: ScreenProps) {
  if (context.isLoading) return null;
  return <RoomsMapScreen context={context} />;
}
