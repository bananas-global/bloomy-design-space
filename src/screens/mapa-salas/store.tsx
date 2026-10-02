/**
 * Mapa de Salas — estado da tela (provider React).
 *
 * A tela monta o `RoomsMapState` a partir dos controles (`useControlledState`
 * de `./flow.ts`) e o entrega a `RoomsMapProvider`, que deriva o dia do mapa e
 * expõe as ações do protótipo por `useRoomsMap()`.
 *
 * Só o planejamento se edita aqui, e vale na hora: não há rascunho nem
 * publicação. A escala de cada ponto vem do perfil do profissional e é só
 * leitura. Vive só em memória: recarregar a página volta aos controles.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ScenarioContext } from "@brucesantos/design-space";
import { showToast, type ToastType } from "../../components/Action.js";
import type { MapUnit } from "./fixtures.js";
import {
  TODAY_DATE,
  buildDay,
  byStart,
  dayLong,
  daysLabel,
  hhmm,
  mondayOf,
  periodDays,
  roomLabel,
  unitDays,
  type DayKey,
  type DayModel,
  type Focus,
  type PlanBlock,
  type PlanEntry,
  type PlanType,
  type Room,
  type RoomBlocking,
  type ServicePoint,
} from "./model.js";

export type RoomsSub = "rooms" | "blockings";

/** As gavetas e modais. O trecho do planejado é achado de novo no dia a cada render. */
export type MapModal =
  | { kind: "room"; roomId: string | null }
  | { kind: "plan"; roomId: string; point: string; from: number }
  | { kind: "planEdit"; roomId: string; point: string; from: number }
  | { kind: "blocking" }
  | { kind: "blockingInfo"; id: string };

export type RoomsMapState = {
  unitId: string;
  rooms: Room[];
  blockings: RoomBlocking[];
  sub: RoomsSub;
  /** Muda quando a sub-aba vem de fora, para os `button_tabs` remontarem nela. */
  tabsKey: number;
  day: DayKey;
  q: string;
  focus: Focus;
  modal: MapModal | null;
};

/** O que a gaveta do planejado entrega. */
export type PlanInput = { start: string; end: string; specialty: string; planType: PlanType; days: DayKey[] };

/** O que a gaveta da sala entrega. */
export type RoomInput = Omit<Room, "id"> & { id?: string };

export type BlockingInput = { roomId: string; type: RoomBlocking["type"]; name: string; start: string; end: string; obs: string };

export type RoomsMapStore = {
  unit: MapUnit;
  rooms: Room[];
  blockings: RoomBlocking[];
  canEdit: boolean;
  sub: RoomsSub;
  tabsKey: number;
  setSub: (sub: RoomsSub) => void;
  days: DayKey[];
  day: DayKey;
  setDay: (day: DayKey) => void;
  model: DayModel;
  q: string;
  setQ: (q: string) => void;
  focus: Focus;
  setFocus: (focus: Focus) => void;
  modal: MapModal | null;
  openModal: (modal: MapModal) => void;
  closeModal: () => void;
  findPlan: (roomId: string, point: string, from: number) => PlanBlock | undefined;

  saveRoom: (room: RoomInput) => void;
  addPlan: (room: Room, point: ServicePoint, entry: PlanInput) => void;
  updatePlan: (room: Room, point: ServicePoint, pl: PlanBlock, entry: PlanInput) => void;
  removePlan: (room: Room, point: ServicePoint, pl: PlanBlock) => void;
  movePlan: (room: Room, point: ServicePoint, pl: PlanBlock, from: number, to: number) => void;
  /** "Ver escala no perfil": a Escala do profissional fica fora deste protótipo. */
  showSchedule: (professional: string) => void;

  addBlocking: (data: BlockingInput) => void;
  removeBlocking: (id: string) => void;
};

const Ctx = createContext<RoomsMapStore | null>(null);

export function useRoomsMap(): RoomsMapStore {
  const store = useContext(Ctx);
  if (!store) throw new Error("useRoomsMap precisa de <RoomsMapProvider>.");
  return store;
}

/** O dia do mapa, na semana de hoje. */
export function dayModelOf(state: RoomsMapState, unit: MapUnit) {
  const uDays = unitDays(unit);
  const day = uDays.includes(state.day) ? state.day : uDays[0]!;
  const model = buildDay({ id: unit.id, serviceHour: unit.serviceHour, areas: unit.areas, rooms: state.rooms }, day, mondayOf(TODAY_DATE));
  return { uDays, day, model };
}

type ProviderProps = {
  context: ScenarioContext;
  unit: MapUnit;
  state: RoomsMapState;
  setState: (next: (prev: RoomsMapState) => RoomsMapState) => void;
  children: ReactNode;
};

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

/** Troca o planejamento de um ponto. */
const mapPlan = (rooms: Room[], roomId: string, point: string, fn: (plan: PlanEntry[]) => PlanEntry[]) =>
  rooms.map((r) => (r.id !== roomId ? r : { ...r, servicePoints: r.servicePoints.map((sp) => (sp.name !== point ? sp : { ...sp, plan: fn(sp.plan).sort(byStart) })) }));

export function RoomsMapProvider({ context, unit, state, setState, children }: ProviderProps) {
  const canEdit = context.can("units.edit");

  const store = useMemo<RoomsMapStore>(() => {
    const toast = (type: ToastType, title: string, content: string) => showToast({ type, title, content, closeTime: 4000 });
    const set = (patch: Partial<RoomsMapState>) => setState((s) => ({ ...s, ...patch }));
    const { uDays, day, model } = dayModelOf(state, unit);
    const lane = (roomId: string, point: string) => model.rooms.find((r) => r.room.id === roomId)?.lanes.find((l) => l.point?.name === point);
    const dayLbl = (days: DayKey[]) => daysLabel(days, uDays) ?? "todos os dias";
    const editPlan = (roomId: string, point: string, fn: (plan: PlanEntry[]) => PlanEntry[], close = true) => {
      if (!canEdit) return;
      setState((s) => ({ ...s, rooms: mapPlan(s.rooms, roomId, point, fn), ...(close ? { modal: null } : {}) }));
    };

    return {
      unit,
      rooms: state.rooms,
      blockings: state.blockings,
      canEdit,
      sub: state.sub,
      tabsKey: state.tabsKey,
      setSub: (sub) => set({ sub }),
      days: uDays,
      day,
      setDay: (d) => set({ day: d }),
      model,
      q: state.q,
      setQ: (q) => set({ q }),
      focus: state.focus,
      setFocus: (focus) => set({ focus }),
      modal: state.modal,
      openModal: (modal) => set({ modal }),
      closeModal: () => set({ modal: null }),
      findPlan: (roomId, point, from) => lane(roomId, point)?.plan.find((p) => p.from === from),

      saveRoom: (input) => {
        if (!canEdit) return;
        const isNew = !input.id;
        const full: Room = { ...input, id: input.id ?? nextId("r") };
        setState((s) => ({ ...s, rooms: isNew ? [...s.rooms, full] : s.rooms.map((r) => (r.id === full.id ? full : r)), modal: null }));
        toast("success", "Sucesso!", isNew ? "Sala criada." : "Sala atualizada.");
      },

      addPlan: (room, point, entry) => {
        editPlan(room.id, point.name, (plan) => [...plan, entry]);
        toast("success", "Planejado adicionado", `${roomLabel(room)}·${point.name}: ${entry.specialty} ${entry.start}–${entry.end}, ${dayLbl(entry.days)}.`);
      },

      updatePlan: (room, point, pl, entry) => {
        editPlan(room.id, point.name, (plan) => plan.map((x) => (x === pl._src ? { ...x, ...entry } : x)));
        toast("success", "Planejado atualizado", `${roomLabel(room)}·${point.name}: ${entry.specialty} ${entry.start}–${entry.end}, ${dayLbl(entry.days)}.`);
      },

      removePlan: (room, point, pl) => {
        editPlan(room.id, point.name, (plan) => plan.filter((x) => x !== pl._src));
        toast("success", "Planejado removido", `${roomLabel(room)}·${point.name}: ${pl.specialty} ${hhmm(pl.from)}–${hhmm(pl.to)} saiu do planejamento.`);
      },

      // Arrastar ou puxar as bordas: muda o horário só neste dia (divide o trecho se valer em outros).
      movePlan: (room, point, pl, from, to) => {
        editPlan(
          room.id,
          point.name,
          (plan) =>
            plan.flatMap((x) => {
              if (x !== pl._src) return [x];
              const days = periodDays(x, uDays);
              const moved = { ...x, start: hhmm(from), end: hhmm(to), days: [day] };
              return days.length > 1 ? [{ ...x, days: days.filter((k) => k !== day) }, moved] : [moved];
            }),
          false,
        );
        toast("success", "Planejado atualizado", `${roomLabel(room)}·${point.name}: ${pl.specialty} ${hhmm(from)}–${hhmm(to)} em ${dayLong(day)}.`);
      },

      showSchedule: (professional) =>
        toast("info", "Escala do profissional", `A sala e o ponto de ${professional} se definem no perfil do profissional, fora deste protótipo.`),

      addBlocking: (data) => {
        const roomObj = state.rooms.find((r) => r.id === data.roomId);
        const nb: RoomBlocking = {
          id: nextId("rb"),
          room: roomObj ? roomObj.name : "—",
          number: roomObj ? roomObj.number : "-",
          name: data.name || "Não informado",
          type: data.type,
          start: data.start,
          end: data.end,
          obs: data.obs,
        };
        setState((s) => ({ ...s, blockings: [nb, ...s.blockings], modal: null }));
        toast("success", "Sucesso!", "Bloqueio de sala adicionado à unidade");
      },

      removeBlocking: (id) => {
        setState((s) => ({ ...s, blockings: s.blockings.filter((b) => b.id !== id) }));
        toast("success", "Sucesso!", "Bloqueio de agenda removido da unidade");
      },
    };
  }, [state, canEdit, unit, setState]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
