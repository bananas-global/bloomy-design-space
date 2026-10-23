/**
 * Central de Transferências — estado da tela (provider React).
 *
 * A tela monta o `TransferCenterState` a partir dos controles
 * (`useControlledState` de `./flow.ts`) e o entrega a `TransferCenterProvider`,
 * que deriva a origem, os horários e as sessões em tela e expõe as ações do
 * protótipo por `useTransferCenter()`. Vive só em memória: recarregar a página
 * volta aos controles.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { showToast, type ToastType } from "../../components/Action.js";
import { TODAY } from "./fixtures.js";
import {
  CANCEL,
  MIXED,
  addDays,
  br,
  candidates,
  distributeMaps,
  distributeSessions,
  eligible,
  executeMoves,
  freeSlots,
  lockedSlots,
  originRows,
  originsOf,
  overlap,
  plural,
  resolveOrigin,
  sessionsOf,
  sessionsWord,
  slotKey,
  takenKey,
  weekdaysBetween,
  type Claims,
  type HoursMap,
  type MoveItem,
  type Professional,
  type ScheduledTransfer,
  type Session,
  type Slot,
} from "./model.js";

export type TransferCenterState = {
  professionals: Professional[];
  maps: HoursMap[];
  scheduled: ScheduledTransfer[];

  /* Mapas de horas */
  /** Vazio: a origem automática (`resolveOrigin`). */
  origin: string;
  /** `slotKey` → profissional de destino. */
  assign: Record<string, string>;
  cross: boolean;
  why: string;
  /** Mapas detalhados horário a horário. */
  open: Record<string, boolean>;
  when: "now" | "prog";
  startDate: string;

  /* Sessões do período */
  sFrom: string;
  sTo: string;
  sSpec: string;
  sProf: string;
  sCross: boolean;
  /** Sessão → substituto (ou `CANCEL`), ainda não aplicado. */
  sAssign: Record<string, string>;
  /** Sessão → substituto já aplicado. */
  sApplied: Record<string, string>;
  sReason: string;
  sNote: string;
  /** Motivo da exceção de especialidade nas sessões. */
  sWhy: string;
  /**
   * Titulares detalhados sessão a sessão (`data|profissional`). Sem valor, o
   * card abre detalhado só quando ninguém cobre todas as sessões dele.
   */
  sOpen: Record<string, boolean>;
};

/** O primeiro dia útil a partir de hoje: onde o período de sessões começa. */
export const FIRST_DAY = weekdaysBetween(TODAY, addDays(TODAY, 6))[0] ?? TODAY;
/** A data mínima de uma transferência programada: amanhã. */
export const MIN_START = addDays(TODAY, 1);

const toast = (type: ToastType, title: string, content: string) => showToast({ type, title, content, closeTime: 4000 });
const profsWord = (n: number) => plural(n, "profissional", "profissionais");
const slotsWord = (n: number) => plural(n, "horário", "horários");

type SlotRef = { m: HoursMap; s: Slot; k: string };

export type TransferCenterStore = {
  state: TransferCenterState;
  professionals: Professional[];
  profById: (id: string | null | undefined) => Professional | undefined;

  /* Mapas de horas */
  origins: { id: string; label: string; n: number }[];
  orphanCount: number;
  originId: string;
  originProf: Professional | undefined;
  rows: HoursMap[];
  locked: Record<string, { date: string; pid: string }>;
  allSlots: SlotRef[];
  lockedCount: number;
  assigned: SlotRef[];
  crossWouldHelp: boolean;
  crossReady: boolean;
  dateReady: boolean;
  scheduledSorted: ScheduledTransfer[];
  /** Quem pode assumir um horário, sem contar o que o próprio horário já prometeu. */
  slotCandidates: (m: HoursMap, s: Slot) => Professional[];
  /** Quem pode assumir todos os horários livres do mapa de uma vez. */
  mapCandidates: (m: HoursMap) => Professional[];
  setOrigin: (id: string) => void;
  setCross: (on: boolean) => void;
  setWhy: (why: string) => void;
  toggleOpen: (mapId: string) => void;
  setMapDest: (m: HoursMap, pid: string) => void;
  setSlotDest: (k: string, pid: string) => void;
  setWhen: (when: "now" | "prog") => void;
  setStartDate: (date: string) => void;
  distribute: () => void;
  apply: () => void;
  runNow: (sc: ScheduledTransfer) => void;
  cancelScheduled: (sc: ScheduledTransfer) => void;
  reset: () => void;

  /* Sessões do período */
  sessions: Session[];
  pending: Session[];
  /** Dia → titular → sessões pendentes. */
  groups: { date: string; total: number; profs: { pid: string; list: Session[] }[] }[];
  specialties: string[];
  profOptions: Professional[];
  selected: Session[];
  covered: Session[];
  cancelled: Session[];
  sessionCandidates: (s: Session) => Professional[];
  setPeriod: (from: string, to: string) => void;
  setSpec: (spec: string) => void;
  setProf: (prof: string) => void;
  setSCross: (on: boolean) => void;
  setSWhy: (why: string) => void;
  /** Sem exceção, ou com o motivo da exceção preenchido. */
  sCrossReady: boolean;
  setSessionDest: (id: string, pid: string) => void;
  /** Quem pode assumir todas as sessões do titular no dia de uma vez. */
  groupCandidates: (list: Session[]) => Professional[];
  setGroupDest: (list: Session[], pid: string) => void;
  setSOpen: (key: string, open: boolean) => void;
  setReason: (reason: string) => void;
  setNote: (note: string) => void;
  distributeS: () => void;
  applyS: () => void;
  resetS: () => void;
};

const Ctx = createContext<TransferCenterStore | null>(null);

export function useTransferCenter(): TransferCenterStore {
  const store = useContext(Ctx);
  if (!store) throw new Error("useTransferCenter precisa de <TransferCenterProvider>.");
  return store;
}

/** A origem, os horários e a distribuição dos mapas, derivados do estado. */
export function mapsView(s: TransferCenterState) {
  const { professionals: profs, maps, scheduled } = s;
  const originId = resolveOrigin(s.origin, profs, maps, scheduled);
  const rows = originRows(maps, originId);
  return { originId, rows };
}

/** As sessões do período com os filtros do estado. */
export const sessionsView = (s: TransferCenterState) =>
  sessionsOf(s.professionals, s.maps, { from: s.sFrom, to: s.sTo, spec: s.sSpec, prof: s.sProf });

/** "Distribuir" dos mapas, sem toast (também usado pelo controle "Destinos"). */
export function withDistributedMaps(s: TransferCenterState) {
  const { rows } = mapsView(s);
  return distributeMaps(s.professionals, s.maps, s.scheduled, rows, s.assign, s.cross);
}

/** "Distribuir" das sessões, sem toast (também usado pelo controle "Substitutos"). */
export function withDistributedSessions(s: TransferCenterState) {
  return distributeSessions(s.professionals, s.maps, sessionsView(s), s.sApplied, s.sAssign, s.sCross);
}

type ProviderProps = {
  state: TransferCenterState;
  setState: (next: (prev: TransferCenterState) => TransferCenterState) => void;
  children: ReactNode;
};

export function TransferCenterProvider({ state, setState, children }: ProviderProps) {
  const store = useMemo<TransferCenterStore>(() => {
    const set = (patch: Partial<TransferCenterState>) => setState((s) => ({ ...s, ...patch }));
    const { professionals: profs, maps, scheduled } = state;
    const profById = (id: string | null | undefined) => (id ? profs.find((p) => p.id === id) : undefined);

    /* ---------------- Mapas de horas ---------------- */
    const locked = lockedSlots(scheduled);
    const origins = originsOf(profs, maps);
    const orphanCount = maps.filter((m) => !m.profId).length;
    const { originId, rows } = mapsView(state);
    const originProf = profById(originId);
    const allSlots = freeSlots(rows, locked);
    const lockedCount = rows.reduce((n, m) => n + m.slots.filter((s) => locked[slotKey(m, s)]).length, 0);
    const assigned = allSlots.filter((x) => state.assign[x.k]);
    const cands = (m: HoursMap, s: Slot, claims: Claims, cross = state.cross) => candidates(profs, maps, scheduled, m, s, claims, cross);
    const crossWouldHelp =
      !state.cross &&
      allSlots.length > 0 &&
      allSlots.every((x) => cands(x.m, x.s, {}, false).length === 0) &&
      allSlots.some((x) => cands(x.m, x.s, {}, true).length > 0);

    /** O que os outros horários desta leva já prometeram, por destino. */
    const claimsWhere = (skip: (m: HoursMap, k: string) => boolean) => {
      const c: Claims = {};
      rows.forEach((m) =>
        m.slots.forEach((s) => {
          const k = slotKey(m, s);
          const pid = state.assign[k];
          if (pid && !skip(m, k)) (c[pid] ??= []).push(s);
        }),
      );
      return c;
    };
    const slotCandidates = (m: HoursMap, s: Slot) => {
      const k = slotKey(m, s);
      return cands(m, s, claimsWhere((_, key) => key === k));
    };
    const mapCandidates = (map: HoursMap) => {
      const free = map.slots.filter((s) => !locked[slotKey(map, s)]);
      if (!free.length) return [];
      const claims = claimsWhere((m) => m.id === map.id);
      let ids: string[] | null = null;
      free.forEach((s, i) => {
        // Horários do próprio mapa que se sobrepõem não podem ir para a mesma pessoa.
        const own = free.slice(0, i);
        const c = cands(map, s, claims).filter(() => !own.some((o) => overlap(o, s))).map((p) => p.id);
        ids = ids === null ? c : ids.filter((id) => c.includes(id));
      });
      const list: string[] = ids ?? [];
      return profs.filter((p) => list.includes(p.id));
    };

    const crossReady = !state.cross || state.why.trim().length > 2;
    const dateReady = state.when === "now" || (Boolean(state.startDate) && state.startDate >= MIN_START);
    const scheduledSorted = [...scheduled].sort((a, b) => a.date.localeCompare(b.date));
    const originName = originProf ? originProf.name : "Mapas sem profissional";

    /**
     * Aplicar muda os mapas, e a origem automática (`fallbackOrigin`) poderia
     * passar para outro profissional: a lista fica na origem que estava em tela.
     */
    const keepOrigin = (s: TransferCenterState) => s.origin || originId;

    function apply() {
      const items: MoveItem[] = assigned.map((x) => ({ mapId: x.m.id, patient: x.m.patient, specialty: x.m.specialty, s: x.s, pid: state.assign[x.k]! }));
      if (!items.length) return;
      const n = items.length;
      const destN = new Set(items.map((i) => i.pid)).size;
      if (state.when === "prog") {
        const sc: ScheduledTransfer = { id: `sc${Date.now()}`, date: state.startDate, originId, originName, items, why: state.cross ? state.why.trim() : "", createdAt: TODAY };
        setState((s) => ({ ...s, origin: keepOrigin(s), scheduled: [...s.scheduled, sc], assign: {} }));
        toast("success", "Transferência programada", `${n} ${slotsWord(n)} de ${originName} passam para ${destN} ${profsWord(destN)} em ${br(state.startDate)}`);
        return;
      }
      const stamp = Date.now().toString().slice(-5);
      setState((s) => ({ ...s, origin: keepOrigin(s), maps: executeMoves(s.maps, items, stamp), assign: {} }));
      toast("success", "Horários transferidos", `${n} ${slotsWord(n)} de ${originName} para ${destN} ${profsWord(destN)}`);
    }

    /* ---------------- Sessões do período ---------------- */
    const sessions = sessionsView(state);
    const pending = sessions.filter((s) => !state.sApplied[s.id]);
    const selected = pending.filter((s) => state.sAssign[s.id]);
    const covered = selected.filter((s) => state.sAssign[s.id] !== CANCEL);
    const cancelled = selected.filter((s) => state.sAssign[s.id] === CANCEL);
    const specialties = [...new Set(profs.map((p) => p.specialty))].sort();
    const profOptions = profs.filter((p) => (!state.sSpec || p.specialty === state.sSpec) && maps.some((m) => m.profId === p.id));
    const profName = (id: string) => profById(id)?.name ?? "—";

    // Quem já recebeu cada dia e horário nesta leva (aplicado ou escolhido).
    const takenAll: Record<string, string[]> = {};
    sessions.forEach((s) => {
      const pid = state.sApplied[s.id] || state.sAssign[s.id];
      if (pid && pid !== CANCEL) (takenAll[takenKey(pid, s)] ??= []).push(s.id);
    });
    const sessionCandidates = (s: Session) => {
      const taken: Record<string, true> = {};
      Object.keys(takenAll).forEach((k) => {
        if (takenAll[k]!.some((x) => x !== s.id)) taken[k] = true;
      });
      return eligible(profs, maps, s, taken, state.sCross);
    };

    const byDay: Record<string, Record<string, Session[]>> = {};
    pending.forEach((s) => ((byDay[s.date] ??= {})[s.profId] ??= []).push(s));
    const groups = Object.keys(byDay)
      .sort()
      .map((date) => ({
        date,
        total: Object.values(byDay[date]!).reduce((n, l) => n + l.length, 0),
        profs: Object.keys(byDay[date]!)
          .map((pid) => ({ pid, list: byDay[date]![pid]! }))
          .sort((x, y) => profName(x.pid).localeCompare(profName(y.pid))),
      }));

    return {
      state,
      professionals: profs,
      profById,

      origins,
      orphanCount,
      originId,
      originProf,
      rows,
      locked,
      allSlots,
      lockedCount,
      assigned,
      crossWouldHelp,
      crossReady,
      dateReady,
      scheduledSorted,
      slotCandidates,
      mapCandidates,
      setOrigin: (id) => set({ origin: id, assign: {}, why: "" }),
      setCross: (on) => set({ cross: on, assign: {} }),
      setWhy: (why) => set({ why }),
      toggleOpen: (mapId) => setState((s) => ({ ...s, open: { ...s.open, [mapId]: !s.open[mapId] } })),
      setMapDest: (m, pid) =>
        setState((s) => {
          if (pid === MIXED) return s;
          const next = { ...s.assign };
          m.slots.forEach((sl) => {
            const k = slotKey(m, sl);
            if (locked[k]) return;
            if (pid) next[k] = pid;
            else delete next[k];
          });
          return { ...s, assign: next };
        }),
      setSlotDest: (k, pid) =>
        setState((s) => {
          const next = { ...s.assign };
          if (pid) next[k] = pid;
          else delete next[k];
          return { ...s, assign: next };
        }),
      setWhen: (when) => set({ when }),
      setStartDate: (startDate) => set({ startDate }),
      distribute: () => {
        const r = withDistributedMaps(state);
        set({ assign: r.assign });
        toast(r.ok === r.total ? "success" : "info", "Distribuição automática", `${r.ok} de ${r.total} ${slotsWord(r.total)} com destino`);
      },
      apply,
      runNow: (sc) => {
        const stamp = Date.now().toString().slice(-5);
        setState((s) => ({ ...s, origin: keepOrigin(s), maps: executeMoves(s.maps, sc.items, stamp), scheduled: s.scheduled.filter((x) => x.id !== sc.id) }));
        toast("success", "Transferência antecipada", `${sc.items.length} ${slotsWord(sc.items.length)} de ${sc.originName} transferidos hoje`);
      },
      cancelScheduled: (sc) => {
        setState((s) => ({ ...s, scheduled: s.scheduled.filter((x) => x.id !== sc.id) }));
        toast("info", "Programação cancelada", `Os horários continuam com ${sc.originName}`);
      },
      reset: () => set({ assign: {}, why: "" }),

      sessions,
      pending,
      groups,
      specialties,
      profOptions,
      selected,
      covered,
      cancelled,
      sessionCandidates,
      setPeriod: (from, to) => set({ sFrom: from, sTo: to, sAssign: {} }),
      setSpec: (spec) =>
        setState((s) => ({ ...s, sSpec: spec, sProf: s.sProf && profById(s.sProf)?.specialty !== spec ? "" : s.sProf, sAssign: {} })),
      setProf: (prof) => set({ sProf: prof, sAssign: {} }),
      setSCross: (on) => set({ sCross: on, sAssign: {} }),
      setSWhy: (sWhy) => set({ sWhy }),
      sCrossReady: !state.sCross || state.sWhy.trim().length > 2,
      setSessionDest: (id, pid) =>
        setState((s) => {
          const next = { ...s.sAssign };
          if (pid) next[id] = pid;
          else delete next[id];
          return { ...s, sAssign: next };
        }),
      groupCandidates: (list) => {
        const open = list.filter((s) => !state.sApplied[s.id]);
        if (!open.length) return [];
        let ids: string[] | null = null;
        open.forEach((s) => {
          const c = sessionCandidates(s).map((p) => p.id);
          ids = ids === null ? c : ids.filter((id) => c.includes(id));
        });
        const list2: string[] = ids ?? [];
        return profs.filter((p) => list2.includes(p.id));
      },
      setGroupDest: (list, pid) =>
        setState((s) => {
          if (pid === MIXED) return s;
          const next = { ...s.sAssign };
          list.forEach((x) => {
            if (s.sApplied[x.id]) return;
            if (pid) next[x.id] = pid;
            else delete next[x.id];
          });
          return { ...s, sAssign: next };
        }),
      setSOpen: (key, open) => setState((s) => ({ ...s, sOpen: { ...s.sOpen, [key]: open } })),
      setReason: (sReason) => set({ sReason }),
      setNote: (sNote) => set({ sNote }),
      distributeS: () => {
        const r = withDistributedSessions(state);
        set({ sAssign: r.assign });
        toast(r.ok === r.total ? "success" : "info", "Distribuição automática", `${r.ok} de ${r.total} ${sessionsWord(r.total)} com substituto`);
      },
      applyS: () => {
        // As substituídas e as canceladas saem da lista; os mapas não mudam.
        const ids = selected.map((s) => s.id);
        setState((s) => {
          const applied = { ...s.sApplied };
          const rest = { ...s.sAssign };
          ids.forEach((id) => {
            applied[id] = s.sAssign[id]!;
            delete rest[id];
          });
          return { ...s, sApplied: applied, sAssign: rest, sReason: "", sNote: "", sWhy: "" };
        });
        const done = [
          covered.length ? `${covered.length} ${plural(covered.length, "transferida", "transferidas")}` : "",
          cancelled.length ? `${cancelled.length} ${plural(cancelled.length, "cancelada", "canceladas")}` : "",
        ].filter(Boolean).join(", ");
        toast("success", covered.length ? "Sessões transferidas" : "Sessões canceladas", `${done} · ${state.sReason} · mapas de horas inalterados`);
      },
      resetS: () => set({ sAssign: {} }),
    };
  }, [state, setState]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

