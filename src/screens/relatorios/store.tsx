/**
 * Relatórios do paciente — estado de uma tela do fluxo (provider React).
 *
 * Cada tela (lista, relatório, editores) monta o próprio `ReportsState` a
 * partir dos controles (`useControlledState` de `./flow.ts`) e o entrega a
 * `ReportsProvider`, que expõe as ações de negócio do protótipo por
 * `useReports()`.
 *
 * - Navegação entre telas: `toList`, `toReport(id)` e `toEditor(id)` levam à
 *   rota da tela com os controles que representam o relatório naquele momento.
 * - Modais: `openModal`/`closeModal`. O controle "Sobreposição aberta" da tela
 *   acompanha o modal aberto.
 * - Toda mudança num relatório também vai para a sessão (`./session.ts`), para
 *   a próxima tela do fluxo encontrar o mesmo relatório.
 *
 * Nada de `window`, nada de relógio (carimbos por `relStamp()`).
 */
import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";
import type { ScenarioContext } from "@brucesantos/design-space";
import { showToast, type ToastType } from "../../components/Action.js";
import type { ReportsPatient } from "./fixtures.js";
import { FILL_CONTROLS, LIST_CONTROLS, PROTOCOL_CONTROLS, REPORT_CONTROLS, UPLOAD_CONTROLS, defaultsOf, flowNavigate, listPath, reportPath } from "./flow.js";
import { session } from "./session.js";
import { deriveEditor, deriveReport, editorKindOf, type EditorKind } from "./variants.js";
import {
  REL_ME,
  REL_REQUESTED_BY,
  guardiansOf,
  isoToBR,
  pushHistory,
  relDefaultViewAs,
  relProfById,
  relAuthors,
  relSlug,
  relStamp,
  routineForecast,
  shareState,
  type DraftContent,
  type FinalDoc,
  type Forecast,
  type ListFilters,
  type Professional,
  type Report,
  type ReportTypeId,
  type Requester,
  type RoutineRule,
  type RoutineState,
  type ShareRecipient,
  type SupportFile,
  type ViewAs,
} from "./model.js";

export type ReportsModal =
  | { kind: "new" }
  | { kind: "routine" }
  | { kind: "reassign"; id: string }
  | { kind: "cancel"; id: string }
  | { kind: "share"; id: string }
  | { kind: "edit"; id: string };

/** O estado de uma tela: o que ela mostra, semeado pelos controles. */
export type ReportsState = {
  reports: Report[];
  routine: RoutineState;
  modal: ReportsModal | null;
  /** Filtros da lista. */
  filters: ListFilters;
  /** Relatório da tela de relatório ou de editor. */
  focusId?: string;
  /** Muda a cada re-semeadura pelos controles: remonta o editor com o conteúdo novo. */
  version: number;
};

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

/** O que o drawer "Editar solicitação" entrega. */
export type EditRequestData = {
  typeId: ReportTypeId;
  customName: string;
  requester: Requester;
  /** Novo prazo ISO `AAAA-MM-DD`, ou "" para manter o atual. */
  due: string;
  prof: Professional | null;
  period: string;
  obs: string;
  extra: string;
  status: Report["status"];
  support: SupportFile[];
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
  modal: ReportsModal | null;
  filters: ListFilters;
  setFilters: (next: ListFilters) => void;

  /* navegação entre as telas do fluxo */
  toList: () => void;
  /** Abre o relatório em modo foco, com os controles que o representam. */
  toReport: (id: string) => void;
  /** Abre o editor do tipo do relatório (modelo, protocolo ou anexar). */
  toEditor: (id: string) => void;
  openModal: (modal: ReportsModal) => void;
  closeModal: () => void;
  toast: (type: ToastType, title: string, content: string) => void;

  /* dados (como `RelStore`) */
  nextId: () => string;
  add: (r: Report) => void;
  patch: (id: string, patch: Patch) => void;

  /* ações de negócio do protótipo */
  createRequest: (data: NewRequestData) => void;
  requestForecast: (fc: Forecast) => void;
  reassign: (id: string, prof: Professional) => void;
  cancelRequest: (id: string, reason: string) => void;
  reopen: (id: string) => void;
  download: (r: Report) => void;
  remind: (r: Report) => void;
  revoke: (r: Report) => void;
  /** Compartilha (ou atualiza o compartilhamento) com os responsáveis marcados; fecha o modal. */
  share: (id: string, recipientIds: string[], note: string) => void;
  /** Lembrete para um responsável que ainda não abriu (painel do relatório). */
  remindGuardian: (g: ShareRecipient) => void;

  /* solicitação, coautoria e assinaturas (modo foco) */
  /** Salva o drawer "Editar solicitação"; fecha o modal. */
  updateRequest: (id: string, data: EditRequestData) => void;
  addCoauthor: (id: string, prof: Professional) => void;
  removeCoauthor: (id: string, authorId: string) => void;
  /**
   * Envia para assinaturas (2+ autores) ou assina e finaliza direto (1 autor).
   * `extra` entra no relatório junto (ex.: `{ draftContent }` do editor).
   */
  submitForSignature: (id: string, extra?: Partial<Report>) => void;
  /** Assinatura de um autor; com todas coletadas, finaliza e gera o PDF. */
  sign: (id: string, authorId: string) => void;
  /** Pedido de alteração de um autor: volta para edição e descarta as assinaturas. */
  requestChange: (id: string, authorId: string, reason: string) => void;
  /** Coordenação desfaz o envio para assinaturas ("Voltar para edição"). */
  backToEdit: (id: string) => void;

  /* editores (preencher / anexar) */
  /**
   * Ao abrir o editor: "Solicitado" passa a "Em andamento" com `text` no
   * histórico ("Relatório iniciado", "Solicitação aberta"). Idempotente.
   */
  startReport: (id: string, text: string) => void;
  /** Salva o rascunho do editor (`draftContent`) e registra "Rascunho salvo". */
  saveDraft: (id: string, content: DraftContent) => void;
  /** Tipos sem modelo: anexa o PDF final e finaliza; `obs` entra nas observações. */
  finalizeUpload: (id: string, file: FinalDoc, obs: string) => void;

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

const EDITOR_PATH: Record<EditorKind, string> = { fill: "preencher", protocol: "protocolo", upload: "anexar" };
const EDITOR_CONTROLS = { fill: FILL_CONTROLS, protocol: PROTOCOL_CONTROLS, upload: UPLOAD_CONTROLS };

type ProviderProps = {
  context: ScenarioContext;
  patient: ReportsPatient;
  state: ReportsState;
  setState: (next: ReportsState) => void;
  children: ReactNode;
};

export function ReportsProvider({ context, patient, state, setState, children }: ProviderProps) {
  const role = context.persona?.id;
  // A última versão do estado, para ações seguidas no mesmo evento (salvar e sair).
  const latest = useRef(state);
  latest.current = state;

  const store = useMemo<ReportsStore>(() => {
    const { reports, routine, modal, filters } = state;
    const commit = (fn: (s: ReportsState) => ReportsState) => {
      const next = fn(latest.current);
      latest.current = next;
      setState(next);
    };
    const get = (id: string) => latest.current.reports.find((r) => r.id === id);
    const add = (r: Report) => {
      session.save(r);
      commit((s) => ({ ...s, reports: [r, ...s.reports] }));
    };
    const patch = (id: string, p: Patch) =>
      commit((s) => ({
        ...s,
        reports: s.reports.map((r) => {
          if (r.id !== id) return r;
          const next = { ...r, ...(typeof p === "function" ? p(r) : p) };
          session.save(next);
          return next;
        }),
      }));
    const nextId = () => session.nextId();
    const toast = (type: ToastType, title: string, content: string) => showToast({ type, title, content, closeTime: 4000 });
    const closeModal = () => commit((s) => ({ ...s, modal: null }));
    const mine = reports.filter((r) => r.patient.id === patient.id || r.patient.name === patient.name);
    const patRoutine = (s: RoutineState) => s.patients[patient.id] ?? { paused: {}, own: [] };
    const setPatRoutine = (fn: (p: RoutineState["patients"][string]) => RoutineState["patients"][string]) =>
      commit((st) => ({ ...st, routine: { ...st.routine, patients: { ...st.routine.patients, [patient.id]: fn(patRoutine(st.routine)) } } }));

    const toReport = (id: string) => {
      const r = get(id);
      if (!r) return;
      const controls = deriveReport(r, defaultsOf(REPORT_CONTROLS));
      flowNavigate(context, reportPath(r.id, patient.id), REPORT_CONTROLS, controls);
    };
    const toEditor = (id: string) => {
      const r = get(id);
      if (!r) return;
      const kind = editorKindOf(r);
      const groups = EDITOR_CONTROLS[kind];
      const controls = deriveEditor(kind, r, defaultsOf(groups));
      flowNavigate(context, `${reportPath(r.id, patient.id)}/${EDITOR_PATH[kind]}`, groups, controls);
    };
    const toList = () => {
      const { overlay: _overlay, ...kept } = session.listControls() ?? {};
      flowNavigate(context, listPath(patient.id), LIST_CONTROLS, kept);
    };

    return {
      patient,
      reports,
      get,
      routine,
      forecast: routineForecast(patient, mine, routine, patient.operator),
      viewAs: relDefaultViewAs(role),
      me: REL_ME,
      modal,
      filters,
      setFilters: (next) => commit((s) => ({ ...s, filters: next })),

      toList,
      toReport,
      toEditor,
      openModal: (next) => commit((s) => ({ ...s, modal: next })),
      closeModal,
      toast,

      nextId,
      add,
      patch,

      createRequest(data) {
        const now = relStamp();
        add({
          id: nextId(), patient: { id: patient.id, name: patient.name, age: patient.age }, typeId: data.typeId,
          customName: data.customName || undefined, period: data.period, protocolAppId: data.protocolAppId || null,
          requester: data.requester, requestedBy: REL_REQUESTED_BY, requestedAt: now.split(" ")[0]!,
          due: data.due ? isoToBR(data.due) : "", prof: data.prof, status: "solicitado", hasDraft: false, updatedAt: now,
          obs: data.obs, extra: "", support: data.support, finalDoc: null, cancelReason: "",
          history: [{ at: now, who: "Marina Alves", text: data.prof ? `Solicitação criada e atribuída a ${data.prof.name}` : "Solicitação criada — sem responsável", icon: "fa-inbox" }],
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
          history: [{ at: now, who: "Marina Alves", text: fc.profId ? "Solicitação criada a partir da rotina" : "Solicitação criada a partir da rotina — sem responsável", icon: "fa-inbox" }],
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
      share(id, recipientIds, note) {
        const r = get(id);
        if (!r) return;
        const now = relStamp();
        const already = r.share && !r.share.revokedAt ? r.share : null;
        const prev = already ? already.recipients : [];
        const recipients: ShareRecipient[] = guardiansOf(r.patient.name)
          .filter((g) => recipientIds.includes(g.id))
          .map((g) => {
            const old = prev.find((x) => x.id === g.id);
            return { ...g, viewedAt: old ? old.viewedAt : null, viewCount: old ? old.viewCount : 0 };
          });
        const n = `${recipients.length} responsáve${recipients.length > 1 ? "is" : "l"}`;
        patch(id, (x) =>
          pushHistory(
            { ...x, share: { sharedAt: already ? already.sharedAt : now, sharedBy: REL_ME, note, recipients, revokedAt: null } },
            already ? `Compartilhamento atualizado (${n})` : `Documento compartilhado com ${n} no app da família`,
            "fa-share-nodes",
            REL_ME,
          ),
        );
        closeModal();
        toast(
          "success",
          already ? "Compartilhamento atualizado" : "Documento compartilhado",
          `Disponível no app para ${recipients.map((g) => g.name.split(" ")[0]).join(", ")}.`,
        );
      },
      remindGuardian(g) {
        toast("success", "Lembrete enviado", `${g.name} recebeu uma notificação no app.`);
      },

      updateRequest(id, data) {
        const r = get(id);
        if (!r) return;
        const prof = data.prof;
        const profChanged = (prof && (!r.prof || r.prof.id !== prof.id)) || (!prof && r.prof);
        patch(id, (cur) => {
          let next: Report = {
            ...cur, typeId: data.typeId, customName: data.customName || undefined, requester: data.requester, prof,
            due: data.due ? isoToBR(data.due) : cur.due, period: data.period, obs: data.obs, extra: data.extra,
            status: data.status, support: data.support, updatedAt: relStamp(),
          };
          next = pushHistory(next, "Dados da solicitação atualizados", "fa-pen-to-square");
          if (profChanged) next = pushHistory(next, prof ? `Responsável alterado para ${prof.name}` : "Responsável removido", "fa-user-pen");
          return next;
        });
        closeModal();
        toast("success", "Salvo!", "Solicitação atualizada.");
      },
      addCoauthor(id, prof) {
        patch(id, (cur) =>
          pushHistory({ ...cur, coauthors: [...(cur.coauthors ?? []), prof], updatedAt: relStamp() }, `${prof.name} adicionado(a) como coautor(a)`, "fa-user-plus"),
        );
        toast("success", "Coautor adicionado", `${prof.name} pode editar e vai assinar o relatório.`);
      },
      removeCoauthor(id, authorId) {
        patch(id, (cur) => {
          const a = (cur.coauthors ?? []).find((c) => c.id === authorId);
          if (!a) return {};
          return pushHistory({ ...cur, coauthors: (cur.coauthors ?? []).filter((c) => c.id !== authorId), updatedAt: relStamp() }, `${a.name} removido(a) dos coautores`, "fa-user-minus");
        });
      },
      submitForSignature(id, extra = {}) {
        const r = get(id);
        if (!r) return;
        const stamp = relStamp();
        const authors = relAuthors(r);
        if (authors.length <= 1) {
          const signer = authors[0];
          patch(id, (cur) =>
            pushHistory(
              {
                ...cur, ...extra, status: "finalizado", hasDraft: false, updatedAt: stamp,
                signatures: signer ? { [signer.id]: stamp } : {},
                finalDoc: { name: `${relSlug(cur)}-${cur.patient.name.split(" ")[0]!.toLowerCase()}.pdf`, size: "1,1 MB", at: stamp.split(" ")[0]! },
              },
              signer ? `Assinado por ${signer.name} e finalizado` : "Relatório finalizado",
              "fa-circle-check",
              signer?.name,
            ),
          );
          toast("success", "Finalizado!", "Relatório assinado e disponível no prontuário do paciente.");
        } else {
          patch(id, (cur) =>
            pushHistory({ ...cur, ...extra, status: "assinaturas", hasDraft: false, signatures: {}, updatedAt: stamp }, `Enviado para assinaturas de ${authors.length} autores`, "fa-signature"),
          );
          toast("success", "Enviado para assinaturas", `${authors.length} autores precisam assinar. O texto fica bloqueado até lá.`);
        }
      },
      sign(id, authorId) {
        const r = get(id);
        const author = r && relAuthors(r).find((a) => a.id === authorId);
        if (!r || !author) return;
        const stamp = relStamp();
        const signatures = { ...(r.signatures ?? {}), [author.id]: stamp };
        const authors = relAuthors(r);
        const done = authors.filter((a) => signatures[a.id]).length;
        const all = done === authors.length;
        patch(id, (cur) => {
          let next = pushHistory({ ...cur, signatures, updatedAt: stamp }, `Assinado por ${author.name}`, "fa-signature", author.name);
          if (all) {
            next = pushHistory(
              {
                ...next, status: "finalizado",
                finalDoc: { name: `${relSlug(cur)}-${cur.patient.name.split(" ")[0]!.toLowerCase()}.pdf`, size: "1,2 MB", at: stamp.split(" ")[0]! },
              },
              "Todas as assinaturas coletadas — relatório finalizado",
              "fa-circle-check",
              "Sistema",
            );
          }
          return next;
        });
        toast(
          "success",
          all ? "Finalizado!" : "Assinado",
          all ? "Todas as assinaturas coletadas. PDF gerado no prontuário." : `${done} de ${authors.length} assinaturas.`,
        );
      },
      requestChange(id, authorId, reason) {
        const r = get(id);
        const author = r && relAuthors(r).find((a) => a.id === authorId);
        if (!author) return;
        patch(id, (cur) =>
          pushHistory(
            { ...cur, status: "em_andamento", hasDraft: true, signatures: {}, changeRequest: { by: author.name, reason, at: relStamp() }, updatedAt: relStamp() },
            `${author.name} pediu alteração: “${reason}”. Assinaturas descartadas`,
            "fa-rotate-left",
            author.name,
          ),
        );
        toast("info", "Voltou para edição", "As assinaturas já feitas foram descartadas.");
      },
      backToEdit(id) {
        patch(id, (cur) =>
          pushHistory({ ...cur, status: "em_andamento", hasDraft: true, signatures: {}, updatedAt: relStamp() }, "Envio para assinaturas desfeito — voltou para edição", "fa-rotate-left"),
        );
        toast("info", "Voltou para edição", "As assinaturas já feitas foram descartadas.");
      },

      startReport(id, text) {
        patch(id, (cur) => (cur.status === "solicitado" ? pushHistory({ ...cur, status: "em_andamento", updatedAt: relStamp() }, text, "fa-play") : {}));
      },
      saveDraft(id, content) {
        const stamp = relStamp();
        patch(id, (cur) =>
          pushHistory(
            {
              ...cur, status: cur.status === "solicitado" ? "em_andamento" : cur.status, hasDraft: true, draftContent: content,
              updatedAt: stamp, draft: { updatedAt: stamp, by: cur.prof ? cur.prof.name : REL_ME },
            },
            "Rascunho salvo",
            "fa-floppy-disk",
          ),
        );
      },
      finalizeUpload(id, file, obs) {
        const stamp = relStamp();
        patch(id, (cur) =>
          pushHistory(
            {
              ...cur, status: "finalizado", hasDraft: false, updatedAt: stamp,
              finalDoc: { name: file.name, size: file.size, at: file.at },
              obs: obs ? cur.obs + (cur.obs ? "\n\n" : "") + obs : cur.obs,
            },
            "PDF final anexado e solicitação finalizada",
            "fa-file-arrow-up",
          ),
        );
        toast("success", "Finalizado!", "PDF disponível no prontuário do paciente.");
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
  }, [context, patient, state, setState, role]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
