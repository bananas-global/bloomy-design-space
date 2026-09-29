/**
 * Relatórios do paciente — estado da aba (provider React).
 *
 * Como uma view nova entra:
 *  1. `view` é a navegação interna da aba: `{ kind: "list" }` (a lista) ou uma
 *     view de página cheia (modo foco) com o id do relatório:
 *     `"report"` (visualizar), `"fill"` (preencher modelo/protocolo), `"upload"`
 *     (anexar documento/PDF). Para ir até ela: `go({ kind: "report", id })`.
 *  2. O componente da view entra em `VIEWS` de `./views.tsx` (hoje lá há um
 *     placeholder por kind). Ele lê tudo por `useReports()`.
 *  3. Modais seguem o mesmo padrão: `openModal({ kind: "share", id })` e o
 *     componente em `MODALS` de `./views.tsx`. Um kind novo de view ou modal é
 *     acrescentado às uniões `ReportsView`/`ReportsModal` abaixo.
 *
 * Os dados vêm da fixture do cenário e ficam em estado React local: nada de
 * `window`, nada de relógio (carimbos por `relStamp()`), ids por contador.
 */
import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { showToast, type ToastType } from "../../components/Action.js";
import type { ReportsFixture, ReportsPatient } from "./fixtures.js";
import {
  EMPTY_FILTERS,
  REL_ME,
  REL_REQUESTED_BY,
  isoToBR,
  pushHistory,
  relDefaultViewAs,
  relProfById,
  relStamp,
  routineForecast,
  shareState,
  type Forecast,
  type ListFilters,
  type Professional,
  type Report,
  type ReportTypeId,
  type Requester,
  type RoutineRule,
  type RoutineState,
  type SupportFile,
  type ViewAs,
} from "./model.js";

export type ReportsView =
  | { kind: "list" }
  | { kind: "report"; id: string }
  | { kind: "fill"; id: string }
  | { kind: "upload"; id: string };

export type ReportsModal =
  | { kind: "new" }
  | { kind: "routine" }
  | { kind: "reassign"; id: string }
  | { kind: "cancel"; id: string }
  /** Compartilhar com a família (outra etapa). */
  | { kind: "share"; id: string }
  /** Editar a solicitação (outra etapa). */
  | { kind: "edit"; id: string };

/** O que o drawer de nova solicitação entrega. */
export type NewRequestData = {
  typeId: ReportTypeId;
  customName: string;
  requester: Requester;
  /** ISO `AAAA-MM-DD`, ou "". */
  due: string;
  prof: Professional | null;
  period: string;
  obs: string;
  support: SupportFile[];
  protocolAppId: string;
};

type Patch = Partial<Report> | ((r: Report) => Partial<Report>);

export type ReportsStore = {
  patient: ReportsPatient;
  /** Todos os relatórios do estado (do paciente). */
  reports: Report[];
  get: (id: string) => Report | undefined;
  routine: RoutineState;
  /** Previstos pela rotina, já sem os que viraram solicitação. */
  forecast: Forecast[];
  viewAs: ViewAs;
  /** Profissional logado na perspectiva "prof". */
  me: string;
  view: ReportsView;
  modal: ReportsModal | null;
  /** Filtros da lista (sobrevivem à ida e volta do modo foco). */
  filters: ListFilters;
  setFilters: (next: ListFilters) => void;

  /* navegação */
  go: (view: ReportsView) => void;
  toList: () => void;
  openModal: (modal: ReportsModal) => void;
  closeModal: () => void;
  toast: (type: ToastType, title: string, content: string) => void;

  /* dados (como `RelStore`) */
  nextId: () => string;
  add: (r: Report) => void;
  patch: (id: string, patch: Patch) => void;
  remove: (id: string) => void;

  /* ações de negócio do protótipo */
  createRequest: (data: NewRequestData) => void;
  requestForecast: (fc: Forecast) => void;
  reassign: (id: string, prof: Professional) => void;
  cancelRequest: (id: string, reason: string) => void;
  reopen: (id: string) => void;
  download: (r: Report) => void;
  remind: (r: Report) => void;
  revoke: (r: Report) => void;

  /* rotina */
  pauseRule: (ruleId: string, reason: string) => void;
  resumeRule: (ruleId: string) => void;
  saveOwnRule: (rule: RoutineRule) => void;
  removeOwnRule: (ruleId: string) => void;
};

const Ctx = createContext<ReportsStore | null>(null);

export function useReports(): ReportsStore {
  const store = useContext(Ctx);
  if (!store) throw new Error("useReports precisa de <ReportsProvider>.");
  return store;
}

export function ReportsProvider({ fixture, role, children }: { fixture: ReportsFixture; role?: string; children: ReactNode }) {
  const patient = fixture.patient;
  const [reports, setReports] = useState<Report[]>(() => fixture.reports);
  const [routine, setRoutine] = useState<RoutineState>(() => fixture.routine);
  const [view, setView] = useState<ReportsView>(() => fixture.initialView ?? { kind: "list" });
  const [modal, setModal] = useState<ReportsModal | null>(() => fixture.initialModal ?? null);
  const [filters, setFilters] = useState<ListFilters>(() => ({ ...EMPTY_FILTERS, ...fixture.initialFilters }));
  const counter = useRef(0);

  const store = useMemo<ReportsStore>(() => {
    const get = (id: string) => reports.find((r) => r.id === id);
    const add = (r: Report) => setReports((list) => [r, ...list]);
    const patch = (id: string, p: Patch) =>
      setReports((list) => list.map((r) => (r.id === id ? { ...r, ...(typeof p === "function" ? p(r) : p) } : r)));
    const remove = (id: string) => setReports((list) => list.filter((r) => r.id !== id));
    const nextId = () => `r-novo-${++counter.current}`;
    const toast = (type: ToastType, title: string, content: string) => showToast({ type, title, content, closeTime: 4000 });
    const closeModal = () => setModal(null);
    const mine = reports.filter((r) => r.patient.id === patient.id || r.patient.name === patient.name);
    const patRoutine = (s: RoutineState) => s.patients[patient.id] ?? { paused: {}, own: [] };
    const setPatRoutine = (fn: (p: RoutineState["patients"][string]) => RoutineState["patients"][string]) =>
      setRoutine((s) => ({ ...s, patients: { ...s.patients, [patient.id]: fn(patRoutine(s)) } }));

    return {
      patient,
      reports,
      get,
      routine,
      forecast: routineForecast(patient, mine, routine, patient.operator),
      viewAs: relDefaultViewAs(role),
      me: REL_ME,
      view,
      modal,
      filters,
      setFilters,

      go: setView,
      toList: () => setView({ kind: "list" }),
      openModal: setModal,
      closeModal,
      toast,

      nextId,
      add,
      patch,
      remove,

      createRequest(data) {
        const now = relStamp();
        add({
          id: nextId(), patient: { id: patient.id, name: patient.name, age: patient.age }, typeId: data.typeId,
          customName: data.customName || undefined, period: data.period, protocolAppId: data.protocolAppId || null,
          requester: data.requester, requestedBy: REL_REQUESTED_BY, requestedAt: now.split(" ")[0]!,
          due: data.due ? isoToBR(data.due) : "", prof: data.prof, status: "solicitado", hasDraft: false, updatedAt: now,
          obs: data.obs, extra: "", support: data.support, finalDoc: null, cancelReason: "",
          history: [{ at: now, who: "Marcus V. Gimenes", text: data.prof ? `Solicitação criada e atribuída a ${data.prof.name}` : "Solicitação criada — sem responsável", icon: "fa-inbox" }],
        });
        closeModal();
        toast("success", "Sucesso!", "Relatório solicitado a partir do prontuário.");
      },
      requestForecast(fc) {
        const now = relStamp();
        add({
          id: nextId(), patient: { id: patient.id, name: patient.name, age: patient.age }, typeId: fc.typeId,
          customName: fc.customName || undefined, period: fc.period, protocolAppId: null, requester: fc.requester,
          requestedBy: REL_REQUESTED_BY, requestedAt: now.split(" ")[0]!, due: fc.due, prof: relProfById(fc.profId),
          status: "solicitado", hasDraft: false, updatedAt: now, obs: `Solicitado a partir da rotina (${fc.source}): ${fc.rule}.`,
          extra: "", support: [], finalDoc: null, cancelReason: "",
          history: [{ at: now, who: "Marcus V. Gimenes", text: fc.profId ? "Solicitação criada a partir da rotina" : "Solicitação criada a partir da rotina — sem responsável", icon: "fa-inbox" }],
        });
        toast("success", "Sucesso!", `${fc.name} · ${fc.period} solicitado.${fc.profId ? "" : " Atribua um responsável."}`);
      },
      reassign(id, prof) {
        patch(id, (r) => pushHistory({ ...r, prof, updatedAt: relStamp() }, `Responsável alterado para ${prof.name}`, "fa-user-pen"));
        closeModal();
        toast("success", "Reatribuído", `Solicitação atribuída a ${prof.name}.`);
      },
      cancelRequest(id, reason) {
        patch(id, (r) => pushHistory({ ...r, status: "cancelado", cancelReason: reason, updatedAt: relStamp() }, "Solicitação cancelada", "fa-ban"));
        closeModal();
        toast("success", "Cancelada", "Solicitação cancelada.");
      },
      reopen(id) {
        patch(id, (r) =>
          pushHistory({ ...r, status: r.hasDraft || r.finalDoc ? "em_andamento" : "solicitado", cancelReason: "", updatedAt: relStamp() }, "Solicitação reaberta", "fa-rotate-left"),
        );
        toast("success", "Reaberta", "Solicitação reaberta.");
      },
      download(r) {
        toast("info", "Download", `Baixando ${r.finalDoc?.name ?? "documento"} (demo).`);
      },
      remind(r) {
        const pend = (r.share?.recipients ?? []).filter((g) => !g.viewedAt);
        toast("success", "Lembrete enviado", `${pend.map((g) => g.name.split(" ")[0]).join(", ")} recebe${pend.length > 1 ? "ram" : "u"} uma notificação no app.`);
      },
      revoke(r) {
        if (shareState(r) === "none") return;
        patch(r.id, (x) => ({
          share: x.share && { ...x.share, revokedAt: relStamp() },
          history: [...x.history, { at: relStamp(), who: REL_ME, icon: "fa-ban", text: "Acesso da família ao documento revogado" }],
        }));
        toast("info", "Acesso revogado", "O documento não aparece mais no app da família.");
      },

      pauseRule(ruleId, reason) {
        setPatRoutine((p) => ({ ...p, paused: { ...p.paused, [ruleId]: { reason, at: relStamp().split(" ")[0]! } } }));
        toast("success", "Regra pausada", "A regra não gera mais previstos para este paciente.");
      },
      resumeRule(ruleId) {
        setPatRoutine((p) => {
          const paused = { ...p.paused };
          delete paused[ruleId];
          return { ...p, paused };
        });
      },
      saveOwnRule(rule) {
        setPatRoutine((p) => ({
          ...p,
          own: p.own.some((r) => r.id === rule.id) ? p.own.map((r) => (r.id === rule.id ? rule : r)) : [...p.own, rule],
        }));
        toast("success", "Sucesso!", "Regra salva na rotina do paciente.");
      },
      removeOwnRule(ruleId) {
        setPatRoutine((p) => ({ ...p, own: p.own.filter((r) => r.id !== ruleId) }));
        toast("success", "Removida", "Regra removida da rotina.");
      },
    };
  }, [patient, reports, routine, view, modal, filters, role]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
