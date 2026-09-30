/**
 * Mapa de Salas — estado da tela (provider React).
 *
 * A tela monta o `RoomsMapState` a partir dos controles (`useControlledState`
 * de `./flow.ts`) e o entrega a `RoomsMapProvider`, que deriva a vigência em
 * tela e o dia do mapa e expõe as ações do protótipo por `useRoomsMap()`.
 *
 * Toda edição do mapa passa por `saveRooms`: na vigência futura grava direto;
 * na vigência em curso vira rascunho até publicar; na encerrada não edita.
 * Vive só em memória: recarregar a página volta aos controles.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ScenarioContext } from "@brucesantos/design-space";
import { showToast, type ToastType } from "../../components/Action.js";
import type { MapUnit } from "./fixtures.js";
import {
  TODAY_DATE,
  addDays,
  applySps,
  buildDay,
  byStart,
  cloneSps,
  cloneStruct,
  dayLong,
  daysLabel,
  extractSps,
  fmtBR,
  hhmm,
  mondayOf,
  parseISO,
  periodDays,
  professionalSpecialty,
  roomLabel,
  splitPlan,
  structOf,
  toISO,
  toMin,
  unitDays,
  versionStatus,
  type AllocBlock,
  type DayKey,
  type DayModel,
  type Focus,
  type Gap,
  type PlanBlock,
  type PlanEntry,
  type PlanType,
  type Period,
  type Room,
  type RoomBlocking,
  type ServicePoint,
  type Sps,
  type Struct,
  type Version,
  type VersionStatus,
} from "./model.js";

export type RoomsSub = "rooms" | "blockings";

/** As gavetas e modais. Os trechos são achados de novo no dia a cada render. */
export type MapModal =
  | { kind: "room"; roomId: string | null }
  | { kind: "plan"; roomId: string; point: string; from: number }
  | { kind: "gap"; roomId: string; point: string; from: number }
  | { kind: "card"; roomId: string; point: string; from: number; professional: string }
  | { kind: "version" }
  | { kind: "publish" }
  | { kind: "blocking" }
  | { kind: "blockingInfo"; id: string };

/** Edições na vigência em curso, ainda não publicadas. */
export type Draft = { versionId: string; sps: Sps; struct: Struct; n: number };

export type RoomsMapState = {
  unitId: string;
  /** O cadastro das salas (a estrutura base; cada vigência guarda a sua). */
  rooms: Room[];
  blockings: RoomBlocking[];
  versions: Version[];
  selVid: string;
  draft: Draft | null;
  sub: RoomsSub;
  /** Muda quando a sub-aba vem de fora, para os `button_tabs` remontarem nela. */
  tabsKey: number;
  day: DayKey;
  q: string;
  focus: Focus;
  modal: MapModal | null;
};

/** O que a gaveta do padrão entrega. */
export type PlanInput = { start: string; end: string; specialty: string; planType: PlanType; days: DayKey[] };

/** O que a gaveta da sala entrega. */
export type RoomInput = Omit<Room, "id"> & { id?: string };

export type BlockingInput = { roomId: string; type: RoomBlocking["type"]; name: string; start: string; end: string; obs: string };

export type RoomsMapStore = {
  unit: MapUnit;
  /** As salas como a vigência em tela as vê. */
  rooms: Room[];
  blockings: RoomBlocking[];
  canEdit: boolean;
  versions: Version[];
  version: Version;
  vStatus: VersionStatus;
  readOnly: boolean;
  draft: Draft | null;
  sub: RoomsSub;
  tabsKey: number;
  setSub: (sub: RoomsSub) => void;
  days: DayKey[];
  day: DayKey;
  setDay: (day: DayKey) => void;
  monday: Date;
  model: DayModel;
  q: string;
  setQ: (q: string) => void;
  focus: Focus;
  setFocus: (focus: Focus) => void;
  modal: MapModal | null;
  openModal: (modal: MapModal) => void;
  closeModal: () => void;
  findGap: (roomId: string, point: string, from: number) => Gap | undefined;
  findAlloc: (roomId: string, point: string, from: number, professional: string) => AllocBlock | undefined;

  selectVersion: (id: string) => void;
  createVersion: (data: { start: string; end: string; copyFrom: string }) => void;
  publishDraft: (start: string, end: string) => void;
  discardDraft: () => void;

  saveRoom: (room: RoomInput) => void;
  commitPlan: (room: Room, point: ServicePoint, entry: PlanInput, professional: string | null) => void;
  commitGap: (gap: Gap, entry: PlanInput, professional: string | null) => void;
  commitCard: (room: Room, point: ServicePoint, b: AllocBlock, entry: PlanInput | null, professional: string | null) => void;
  commitMove: (room: Room, point: ServicePoint, b: AllocBlock, from: number, to: number) => void;
  commitPlanMove: (room: Room, point: ServicePoint, pl: PlanBlock, from: number, to: number) => void;

  addBlocking: (data: BlockingInput) => void;
  removeBlocking: (id: string) => void;
};

const Ctx = createContext<RoomsMapStore | null>(null);

export function useRoomsMap(): RoomsMapStore {
  const store = useContext(Ctx);
  if (!store) throw new Error("useRoomsMap precisa de <RoomsMapProvider>.");
  return store;
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

/** Troca os pontos de uma sala. */
const mapPoint = (rooms: Room[], roomId: string, point: string, fn: (sp: ServicePoint) => ServicePoint) =>
  rooms.map((r) => (r.id !== roomId ? r : { ...r, servicePoints: r.servicePoints.map((sp) => (sp.name !== point ? sp : fn(sp))) }));

/**
 * A vista do estado: a vigência em tela (com o rascunho, se for dela), as
 * salas como ela as vê e o dia do mapa. Na vigência em curso a semana é a de
 * hoje; nas outras, a primeira semana da vigência.
 */
export function viewOf(state: RoomsMapState, unit: MapUnit) {
  const version = state.versions.find((v) => v.id === state.selVid) ?? state.versions[0]!;
  const vStatus = versionStatus(version);
  const draft = state.draft && state.draft.versionId === version.id ? state.draft : null;
  const rooms = applySps(state.rooms, draft ? draft.sps : version.sps, draft ? draft.struct : version.struct);
  const uDays = unitDays(unit);
  const monday = mondayOf(vStatus.order === 0 ? TODAY_DATE : parseISO(version.start));
  const day = uDays.includes(state.day) ? state.day : uDays[0]!;
  const model = buildDay({ id: unit.id, serviceHour: unit.serviceHour, areas: unit.areas, rooms }, day, monday);
  return { version, vStatus, draft, rooms, uDays, monday, day, model };
}

export function RoomsMapProvider({ context, unit, state, setState, children }: ProviderProps) {
  const canEdit = context.can("units.edit");

  const store = useMemo<RoomsMapStore>(() => {
    const toast = (type: ToastType, title: string, content: string) => showToast({ type, title, content, closeTime: 4000 });
    const set = (patch: Partial<RoomsMapState>) => setState((s) => ({ ...s, ...patch }));

    const { version, vStatus, draft, rooms, uDays, monday, day, model } = viewOf(state, unit);
    const readOnly = vStatus.order === 2 || !canEdit;
    const lane = (roomId: string, point: string) => model.rooms.find((r) => r.room.id === roomId)?.lanes.find((l) => l.point?.name === point);
    const range = (v: Pick<Version, "start" | "end">) => `${fmtBR(v.start)} – ${fmtBR(v.end)}`;

    /** Toda edição passa por aqui: futura grava direto; em vigência vira rascunho; encerrada não edita. */
    function saveRooms(next: Room[], base?: Room[]) {
      if (readOnly) return;
      const sps = extractSps(next), struct = structOf(next);
      setState((s) => {
        const out = { ...s, ...(base ? { rooms: base } : {}) };
        if (vStatus.order === 1) return { ...out, versions: s.versions.map((v) => (v.id === version.id ? { ...v, sps, struct } : v)) };
        const n = (s.draft && s.draft.versionId === version.id ? s.draft.n : 0) + 1;
        return { ...out, draft: { versionId: version.id, sps, struct, n } };
      });
    }

    const dayLbl = (days: DayKey[]) => daysLabel(days, uDays) ?? "todos os dias";

    return {
      unit,
      rooms,
      blockings: state.blockings,
      canEdit,
      versions: state.versions,
      version,
      vStatus,
      readOnly,
      draft,
      sub: state.sub,
      tabsKey: state.tabsKey,
      setSub: (sub) => set({ sub }),
      days: uDays,
      day,
      setDay: (d) => set({ day: d }),
      monday,
      model,
      q: state.q,
      setQ: (q) => set({ q }),
      focus: state.focus,
      setFocus: (focus) => set({ focus }),
      modal: state.modal,
      openModal: (modal) => set({ modal }),
      closeModal: () => set({ modal: null }),
      findGap: (roomId, point, from) => lane(roomId, point)?.gaps.find((g) => g.from === from),
      findAlloc: (roomId, point, from, professional) =>
        lane(roomId, point)?.allocs.find((b) => b.from === from && b.professional === professional),

      selectVersion: (id) => set({ selVid: id }),

      createVersion: ({ start, end, copyFrom }) => {
        const src = state.versions.find((v) => v.id === copyFrom);
        const nv: Version = {
          id: nextId("v"),
          start,
          end,
          sps: src ? cloneSps(src.sps) : {},
          struct: cloneStruct(src ? src.struct : structOf(state.rooms)),
          autoRenew: true,
        };
        setState((s) => ({ ...s, versions: [...s.versions.map((v) => ({ ...v, autoRenew: false })), nv], selVid: nv.id, modal: null }));
        toast("success", "Vigência criada", `Padrão de ${range(nv)}${src ? ` copiado da vigência ${range(src)}` : " em branco"}.`);
      },

      publishDraft: (start, end) => {
        if (!draft) return;
        const partial = end < version.end;
        const dayBefore = toISO(addDays(parseISO(start), -1));
        const nv: Version = { id: nextId("v"), start, end, sps: draft.sps, struct: draft.struct, autoRenew: partial ? false : version.autoRenew };
        // Sem buracos: depois do fim da nova versão, volta o padrão anterior até o fim original.
        const tail: Version | null = partial
          ? { id: nextId("v"), start: toISO(addDays(parseISO(end), 1)), end: version.end, sps: cloneSps(version.sps), struct: cloneStruct(version.struct), autoRenew: version.autoRenew }
          : null;
        setState((s) => {
          let out = s.versions.filter((v) => v.id !== version.id || start > version.start);
          out = out.map((v) => (v.id === version.id ? { ...v, end: dayBefore, autoRenew: false } : v));
          return { ...s, versions: [...out, nv, ...(tail ? [tail] : [])], selVid: nv.id, draft: null, modal: null };
        });
        toast(
          "success",
          "Padrão publicado",
          `Nova versão de ${fmtBR(start)} a ${fmtBR(end)}.${start > version.start ? ` A anterior termina em ${fmtBR(dayBefore)}.` : ""}${partial ? ` Depois, volta o padrão anterior até ${fmtBR(version.end)}.` : ""}`,
        );
      },

      discardDraft: () => set({ draft: null }),

      // Criar ou editar sala também é uma alteração da vigência selecionada.
      saveRoom: (input) => {
        if (readOnly) return;
        const isNew = !input.id;
        const full: Room = { ...input, id: input.id ?? nextId("r") };
        let base: Room[] | undefined;
        if (isNew) base = [...state.rooms, { ...full, servicePoints: full.servicePoints.map((sp) => ({ ...sp, plan: [], periods: [] })) }];
        else {
          const baseR = state.rooms.find((r) => r.id === full.id);
          if (!baseR) return;
          // Pontos novos passam a existir no cadastro.
          const missing = full.servicePoints.filter((sp) => !baseR.servicePoints.some((b) => b.name === sp.name));
          if (missing.length)
            base = state.rooms.map((r) =>
              r.id === full.id ? { ...r, servicePoints: [...r.servicePoints, ...missing.map((sp) => ({ name: sp.name, plan: [], periods: [] }))] } : r,
            );
        }
        saveRooms(isNew ? [...rooms, full] : rooms.map((r) => (r.id === full.id ? full : r)), base);
        set({ modal: null });
        const where = vStatus.order === 1 ? ` na vigência ${range(version)}` : " · publique para valer";
        toast("success", "Sucesso!", `${isNew ? "Sala criada" : "Sala atualizada"}${where}.`);
      },

      // Horário vazio da faixa: nova entrada no padrão do ponto (e, se escolhido, a alocação).
      commitPlan: (room, point, entry, professional) => {
        const period: Period | null = professional
          ? { start: entry.start, end: entry.end, specialty: entry.specialty, professional, type: entry.planType === "temporary" ? "temporary" : "default", days: entry.days }
          : null;
        saveRooms(
          mapPoint(rooms, room.id, point.name, (sp) => ({
            ...sp,
            plan: [...sp.plan, entry].sort(byStart),
            periods: period ? [...sp.periods, period].sort(byStart) : sp.periods,
          })),
        );
        set({ modal: null });
        toast(
          "success",
          "Padrão definido",
          `${roomLabel(room)}·${point.name}: ${entry.specialty} ${entry.start}–${entry.end}, ${dayLbl(entry.days)}${professional ? ` · ${professional} alocado` : ""}.`,
        );
      },

      // Trecho planejado sem ninguém: aloca o profissional (o padrão só muda se a especialidade mudar).
      commitGap: (gap, entry, professional) => {
        const period: Period | null = professional
          ? {
              start: entry.start,
              end: entry.end,
              specialty: professionalSpecialty(professional) ?? entry.specialty,
              professional,
              type: entry.planType === "temporary" ? "temporary" : "default",
              days: entry.days,
            }
          : null;
        const src = gap.plan._src;
        const whole = gap.from === gap.plan.from && gap.to === gap.plan.to;
        const nextPlan = (list: PlanEntry[]) => {
          // O trecho cobre o padrão inteiro: horário, especialidade, tipo e dias vão para o padrão.
          if (whole && !professional)
            return list
              .map((pl) => (pl === src ? { ...pl, start: entry.start, end: entry.end, specialty: entry.specialty, planType: entry.planType, days: entry.days } : pl))
              .sort(byStart);
          if (entry.specialty && entry.specialty !== gap.plan.specialty) return splitPlan(list, src, toMin(entry.start), toMin(entry.end), entry.specialty);
          return list;
        };
        saveRooms(
          mapPoint(rooms, gap.room.id, gap.point.name, (sp) => ({
            ...sp,
            periods: [...sp.periods, ...(period ? [period] : [])].sort(byStart),
            plan: nextPlan(sp.plan),
          })),
        );
        set({ modal: null });
        const where = `${roomLabel(gap.room)}·${gap.point.name}`;
        if (!professional) toast("success", "Alterações salvas", `${where}: padrão ${entry.specialty} ${entry.start}–${entry.end}.`);
        else
          toast(
            "success",
            "Profissional alocado",
            `${professional} em ${where}, ${entry.start}–${entry.end}, ${dayLbl(entry.days)}. A Escala dele passa a apontar para este ponto.`,
          );
      },

      // Card clicado: edita a alocação (e o padrão, quando cobre o mesmo trecho).
      commitCard: (room, point, b, entry, professional) => {
        const remove = entry == null;
        const host = b.host;
        const linked = Boolean(host && host.from === b.from && host.to === b.to);
        const planEntry: PlanEntry | null = entry ? { start: entry.start, end: entry.end, specialty: entry.specialty, planType: entry.planType, days: entry.days } : null;
        const nextPlan = (list: PlanEntry[]) => {
          if (!planEntry) return list;
          if (linked && host) return list.map((pl) => (pl === host._src ? planEntry : pl)).sort(byStart);
          if (!host && planEntry.specialty) return [...list, planEntry].sort(byStart);
          if (host && planEntry.specialty && planEntry.specialty !== host.specialty)
            return splitPlan(list, host._src, toMin(planEntry.start), toMin(planEntry.end), planEntry.specialty);
          return list;
        };
        const period: Period | null =
          entry && professional
            ? {
                ...b._src,
                start: entry.start,
                end: entry.end,
                professional,
                days: entry.days,
                specialty: professionalSpecialty(professional) ?? b._src.specialty,
                type: entry.planType === "temporary" ? "temporary" : "default",
              }
            : null;
        saveRooms(
          mapPoint(rooms, room.id, point.name, (sp) => ({
            ...sp,
            plan: nextPlan(sp.plan),
            periods: [...sp.periods.filter((pr) => pr !== b._src), ...(period ? [period] : [])].sort(byStart),
          })),
        );
        set({ modal: null });
        const where = `${roomLabel(room)}·${point.name}`;
        if (remove || !professional) toast("success", "Profissional removido", `${b.professional} saiu de ${where}. O trecho volta a ficar a cobrir.`);
        else toast("success", "Alterações salvas", `${where}: ${professional} ${entry.start}–${entry.end}, ${dayLbl(entry.days)}.`);
      },

      // Arrastar / redimensionar um card: muda o horário do período só neste dia.
      // Se o período vale em outros dias, ele é dividido; os outros dias ficam como estavam.
      commitMove: (room, point, b, from, to) => {
        saveRooms(
          mapPoint(rooms, room.id, point.name, (sp) => ({
            ...sp,
            periods: sp.periods
              .flatMap((pr) => {
                if (pr !== b._src) return [pr];
                const days = periodDays(pr, uDays);
                const moved = { ...pr, start: hhmm(from), end: hhmm(to), days: [day] };
                return days.length > 1 ? [{ ...pr, days: days.filter((d) => d !== day) }, moved] : [moved];
              })
              .sort(byStart),
          })),
        );
        toast(
          "success",
          "Horário atualizado",
          `${b.professional} em ${room.name} · Ponto ${point.name}, ${dayLong(day)} ${hhmm(from)}–${hhmm(to)}. A Escala do profissional acompanha.`,
        );
      },

      // Arrastar um trecho vazio: muda o horário do padrão só neste dia (divide se valer em outros).
      commitPlanMove: (room, point, pl, from, to) => {
        const src = pl._src;
        saveRooms(
          mapPoint(rooms, room.id, point.name, (sp) => ({
            ...sp,
            plan: sp.plan
              .flatMap((x) => {
                if (x !== src) return [x];
                const days = periodDays(x, uDays);
                const moved = { ...x, start: hhmm(from), end: hhmm(to), days: [day] };
                return days.length > 1 ? [{ ...x, days: days.filter((k) => k !== day) }, moved] : [moved];
              })
              .sort(byStart),
          })),
        );
        toast("success", "Padrão atualizado", `${roomLabel(room)}·${point.name}: ${pl.specialty} ${hhmm(from)}–${hhmm(to)} em ${dayLong(day)}.`);
      },

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
