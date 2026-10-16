/**
 * Solicitações de melhoria — a base de SMs da sessão, compartilhada entre a
 * central e o detalhe.
 *
 * Nasce da fixture e guarda o que a pessoa faz (abrir uma SM, avançar uma
 * etapa, comentar, dizer que também é afetado), para a outra tela mostrar o mesmo. Vive
 * só em memória: recarregar a página volta à fixture. Trocar de fixture também.
 *
 * As ações são as do protótipo, com os mesmos textos de histórico,
 * notificação e toast.
 */
import { useSyncExternalStore } from "react";
import type { ScenarioContext } from "@brucesantos/design-space";
import { showToast, type ToastType } from "../../components/Action.js";
import { MONTHLY, SMS, NOTIFICATIONS, type MonthAgg, type SmFixture, type SmNotification } from "./fixtures.js";
import {
  APPROVAL, CUR_LABEL, PRIO, USERS, blankSm, decisionLabel, fmt, hasWorkaround, isoToBR, nowStamp, prioOf, roleOfName, routeText, scoreOf, triageOf, TODAY_BR,
  type ActionStatus, type Approval, type ApprovalStage, type HistoryEntry, type Role, type Sm, type SmAction, type SmFile, type SmForm,
} from "./model.js";

type Data = { key: string; sms: Sm[]; notifications: SmNotification[]; monthly: MonthAgg[] };

let data: Data = { key: "", sms: [], notifications: [], monthly: [] };
const listeners = new Set<() => void>();
let seq = 0;
/** As SMs já abertas nesta sessão: cada pessoa conta uma visualização por SM. */
const seen = new Set<string>();

function set(next: Partial<Omit<Data, "key">>) {
  data = { ...data, ...next };
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function fixtureOf(context: ScenarioContext): { key: string; value: SmFixture } {
  const raw = context.fixture?.data;
  const value = (typeof raw === "function" ? raw() : raw) as SmFixture | undefined;
  return { key: context.fixture?.id ?? "sm.base", value: value ?? { sms: SMS, notifications: NOTIFICATIONS, monthly: MONTHLY } };
}

/** A base da sessão. Re-semeia quando a fixture muda. */
export function useSmData(context: ScenarioContext): Data {
  const { key, value } = fixtureOf(context);
  if (data.key !== key) {
    data = { key, sms: value.sms, notifications: value.notifications, monthly: value.monthly ?? [] };
    seen.clear();
  }
  return useSyncExternalStore(subscribe, () => data, () => data);
}

const toast = (title: string, content: string, type: ToastType = "success") => showToast({ title, content, type, closeTime: 4000 });

const get = (id: string) => data.sms.find((s) => s.id === id)!;

function update(id: string, fn: (s: Sm) => Sm) {
  set({ sms: data.sms.map((s) => (s.id === id ? fn({ ...s }) : s)) });
}

function log(s: Sm, role: Role, kind: HistoryEntry["kind"], text: string, files?: SmFile[], audit = false): Sm {
  return { ...s, history: [...s.history, { at: nowStamp(), who: USERS[role].name, kind, text, ...(files ? { files } : {}), ...(audit ? { audit } : {}) }] };
}

function notify(forRole: Role, smId: string, title: string, text: string) {
  const n: SmNotification = { id: `n-sessao-${++seq}`, at: nowStamp(), forRole, smId, title, text, read: false };
  set({ notifications: [n, ...data.notifications] });
}

/** Arquivos escolhidos num `file_uploader`: o nome, o tamanho e um link local para abrir. */
export const filesOf = (list: File[]): SmFile[] =>
  list.map((f) => ({ id: `f-${++seq}`, name: f.name, size: f.size, url: URL.createObjectURL(f) }));

export const sm = {
  /** Muda campos da SM (os campos de cada etapa). */
  patch: (id: string, patch: Partial<Sm>) => update(id, (s) => ({ ...s, ...patch })),

  /** Liga ou desliga um valor de uma lista (participantes, áreas de interface, caminhos). */
  toggle: (id: string, field: "participants" | "interfaceAreas" | "routes" | "apParticipants", value: string) =>
    update(id, (s) => {
      const list = s[field] as string[];
      return { ...s, [field]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    }),

  submit: (form: SmForm): string => {
    const n = Math.max(0, ...data.sms.map((s) => Number(s.id.slice(3)))) + 1;
    const id = `SM-${String(n).padStart(3, "0")}`;
    const at = nowStamp();
    const { lgpd: _lgpd, ...answers } = form;
    const created: Sm = {
      ...blankSm(), ...answers, id, createdAt: at, status: "triagem",
      history: [{ at, who: form.requester, kind: "recebida", text: "Solicitação registrada na base de SMs. PMO notificado." }],
    };
    set({ sms: [created, ...data.sms] });
    notify("pmo", id, "Nova solicitação registrada", `${form.requester} · ${form.title}`);
    toast("Solicitação enviada", `${id} registrada e já disponível para triagem do PMO.`);
    return id;
  },

  /** Exceção mandatória P0 (RN-004): sobrepõe o score e fica no histórico com o motivo. */
  applyP0: (id: string, role: Role, reason: string, just: string) => {
    update(id, (s) => log({ ...s, p0: true, p0Reason: reason, p0Just: just }, role, s.status, `Exceção mandatória P0 aplicada (${reason}). Justificativa: ${just}`, undefined, true));
    toast("Exceção P0 aplicada", "Registrada no histórico com o motivo e a justificativa.", "info");
  },

  removeP0: (id: string, role: Role, why: string) => {
    update(id, (s) => log({ ...s, p0: false, p0Reason: "", p0Just: "" }, role, s.status, `Exceção mandatória P0 retirada. Motivo: ${why}`, undefined, true));
    toast("Exceção P0 retirada", "A prioridade volta a seguir o score. Registrado no histórico.", "info");
  },

  /** O PMO exclui a SM (engano, duplicada, teste). Sai das listas dos colaboradores e fica no histórico. */
  remove: (id: string, role: Role, reason: string, just: string) => {
    update(id, (s) => log({ ...s, status: "excluida", closedAt: TODAY_BR }, role, "excluida", `Solicitação excluída (${reason}).${just ? ` Justificativa: ${just}` : ""}`, undefined, true));
    notify("solicitante", id, "Solicitação excluída", `${reason}${just ? ` — ${just}` : ""}`);
    toast("Solicitação excluída", "Registrada no histórico com o motivo. O solicitante foi notificado.", "info");
  },

  cancel: (id: string, role: Role) => {
    update(id, (s) => log({ ...s, status: "cancelada", closedAt: TODAY_BR }, role, "cancelada", "Solicitação cancelada pelo solicitante."));
    notify("pmo", id, "Solicitação cancelada", "O solicitante retirou a SM do fluxo.");
    toast("Solicitação cancelada", "Retirada do fluxo. O PMO foi notificado.", "info");
  },

  consult: (id: string) => {
    update(id, (s) => ({ ...s, comments: [...s.comments, { at: nowStamp(), who: USERS.pmo.name, text: "Solicitante consultado: pode detalhar como a dor aparece na rotina e com que frequência?" }] }));
    notify("solicitante", id, "PMO pediu esclarecimento", "Responda nos comentários da solicitação.");
    toast("Solicitante consultado", "Pedido registrado nos comentários e notificado.", "info");
  },

  /** "Não realizar" rejeita; "Cancelar / duplicidade" cancela. Os dois com justificativa, no histórico auditável. */
  closeTriage: (id: string, role: Role) => {
    const s0 = get(id);
    const status = triageOf(s0.triage)?.next === "cancelar" ? "cancelada" : "rejeitada";
    const analyst = s0.analyst || USERS[role].name;
    update(id, (s) =>
      log({ ...s, status, analyst, closedAt: TODAY_BR }, role, status, `Triagem: ${s.triage}. Justificativa: ${s.rejection} Solicitante notificado.`, undefined, true),
    );
    notify("solicitante", id, status === "cancelada" ? "Solicitação cancelada na triagem" : "Solicitação rejeitada na triagem", `${s0.triage} — ${s0.rejection}`);
    toast(status === "cancelada" ? "Cancelamento registrado" : "Recusa registrada", "Solicitante notificado com a justificativa.", "info");
  },

  finishTriage: (id: string, role: Role) => {
    update(id, (s) => {
      const m = hasWorkaround(s) ? 3 : 0;
      const scores = s.scores ?? { impact: m, risk: m, urgency: 0, reach: 0, alignment: 0 };
      const route = triageOf(s.triage)?.route;
      const routes = route && !s.routes.includes(route) ? [...s.routes, route] : s.routes;
      return log({ ...s, scores, routes, analyst: s.analyst || USERS[role].name, status: "priorizacao" }, role, "priorizacao", `Triagem concluída: ${s.triage}. Segue para a matriz de priorização.`);
    });
    toast("Triagem concluída", "Seguir para a matriz de priorização.");
  },

  saveBacklog: (id: string, role: Role) => {
    const s0 = get(id);
    const p = PRIO[prioOf(s0)!];
    const pts = fmt(scoreOf(s0));
    update(id, (s) =>
      log({ ...s, status: "aprovacao" }, role, "aprovacao", `Salva na base de backlog com ${p.full} (${pts} pts). Aguarda a reunião de priorização do backlog. KPIs recalculados.${s.p0 ? ` Exceção mandatória: ${s.p0Reason}.` : ""}`),
    );
    notify("solicitante", id, "Salva no backlog", `${p.full} · ${pts} pts. Aguarda a reunião de priorização do backlog.`);
    toast("Salva na base de backlog", `${id} · ${p.full}. Aguarda a reunião de priorização.`);
  },

  finishScenarios: (id: string, role: Role) => {
    update(id, (s) => log({ ...s, status: "validacao" }, role, "validacao", `Reunião de desenho de cenários realizada com ${s.participants.join(", ")}. Segue para a aprovação de cenário.`));
    notify("solicitante", id, "Cenário pronto para aprovação", "Você participa da reunião de aprovação de cenário.");
    toast("Cenários mapeados", "Segue para a reunião de aprovação de cenário.");
  },

  /**
   * Registra a decisão de uma das duas reuniões de aprovação. Seguir avança; não
   * priorizar mantém no backlog (priorização) ou volta ao desenho (cenário);
   * descontinuar encerra. Volta e descontinuada exigem justificativa e ficam
   * como registro auditável.
   */
  decide: (id: string, role: Role) => {
    const s0 = get(id);
    const stage = s0.status as ApprovalStage;
    const decision = s0.apDecision;
    if (!decision) return;
    const meeting = APPROVAL[stage].meeting;
    const approval: Approval = { stage, at: nowStamp(), who: USERS[role].name, date: s0.apDate, participants: s0.apParticipants, decision, note: s0.apNote.trim() };
    const label = decisionLabel(approval);
    const next: Sm["status"] = decision === "descontinuada" ? "descontinuada" : decision === "segue" ? (stage === "aprovacao" ? "backlog" : "cenarios") : stage === "aprovacao" ? "aprovacao" : "backlog";
    const text = `${meeting}${approval.date ? ` de ${isoToBR(approval.date)}` : ""} com ${approval.participants.join(", ")}: ${label}.${approval.note ? ` ${decision === "segue" ? "Observação" : "Justificativa"}: ${approval.note}` : ""}`;
    update(id, (s) =>
      log(
        { ...s, status: next, approvals: [...s.approvals, approval], apDate: "", apParticipants: [], apDecision: "", apNote: "", ...(next === "descontinuada" ? { closedAt: TODAY_BR } : {}) },
        role, next, text, undefined, decision !== "segue",
      ),
    );
    const notice = {
      segue: stage === "aprovacao" ? "Você será convidado à reunião de desenho de cenários." : "O PMO direciona a demanda a seguir.",
      volta: stage === "aprovacao" ? `Continua no backlog e volta à próxima reunião. ${approval.note}` : `Volta para o desenho de cenários. ${approval.note}`,
      descontinuada: approval.note,
    }[decision];
    notify("solicitante", id, label, notice);
    if (decision === "segue" && stage === "aprovacao") notify("tech", id, "SM priorizada", `Participe da reunião de desenho de cenários · ${s0.title}`);
    toast(label, decision === "descontinuada" ? "Ciclo encerrado. Solicitante notificado com a justificativa." : decision === "volta" ? "Registrado no histórico com a justificativa." : notice, decision === "segue" ? "success" : "info");
  },

  /* Plano de ação (RN-011, RN-012). Não trava nenhuma etapa. */

  /** O PMO inclui uma ação; o responsável recebe a notificação no sino. */
  addAction: (id: string, role: Role, a: Pick<SmAction, "text" | "owner" | "due">) => {
    const action: SmAction = { ...a, id: `a-${++seq}`, status: "Pendente", createdAt: nowStamp(), createdBy: USERS[role].name };
    update(id, (s) => log({ ...s, actions: [...s.actions, action] }, role, s.status, `Ação incluída no plano: ${a.text} · ${a.owner} · prazo ${isoToBR(a.due)}.`));
    const ownerRole = roleOfName(a.owner);
    if (ownerRole && ownerRole !== role) notify(ownerRole, id, "Nova ação para você", `${a.text} · prazo ${isoToBR(a.due)}`);
    toast("Ação incluída", `${a.owner} foi notificado no sino.`);
  },

  /** O PMO edita a ação. Trocar o responsável avisa o novo. */
  editAction: (id: string, role: Role, actionId: string, patch: Pick<SmAction, "text" | "owner" | "due" | "status">) => {
    const before = get(id).actions.find((a) => a.id === actionId)!;
    update(id, (s) => {
      const actions = s.actions.map((a) => (a.id === actionId ? { ...a, ...patch, doneAt: patch.status === "Concluída" ? a.doneAt ?? nowStamp() : undefined } : a));
      const changed = before.status !== patch.status ? ` Status: ${patch.status}.` : "";
      return log({ ...s, actions }, role, s.status, `Ação atualizada no plano: ${patch.text} · ${patch.owner} · prazo ${isoToBR(patch.due)}.${changed}`);
    });
    const ownerRole = roleOfName(patch.owner);
    if (patch.owner !== before.owner && ownerRole && ownerRole !== role) notify(ownerRole, id, "Nova ação para você", `${patch.text} · prazo ${isoToBR(patch.due)}`);
    toast("Ação atualizada", patch.owner !== before.owner ? `${patch.owner} foi notificado no sino.` : "Plano de ação salvo.");
  },

  /** O próprio responsável marca a ação dele como em andamento ou concluída; o PMO é avisado. */
  setActionStatus: (id: string, role: Role, actionId: string, status: ActionStatus) => {
    const a0 = get(id).actions.find((a) => a.id === actionId)!;
    update(id, (s) =>
      log({ ...s, actions: s.actions.map((a) => (a.id === actionId ? { ...a, status, doneAt: status === "Concluída" ? nowStamp() : undefined } : a)) }, role, s.status, `Ação ${status === "Concluída" ? "concluída" : "em andamento"}: ${a0.text}.`),
    );
    if (role !== "pmo") notify("pmo", id, status === "Concluída" ? "Ação concluída" : "Ação em andamento", `${USERS[role].name} · ${a0.text}`);
    toast(status === "Concluída" ? "Ação concluída" : "Ação em andamento", role !== "pmo" ? "O PMO foi avisado." : "Plano de ação salvo.");
  },

  confirmRouting: (id: string, role: Role) => {
    const s0 = get(id);
    const proc = s0.routes.includes("processo");
    update(id, (s) =>
      log({ ...s, status: proc ? "modelagem" : "execucao", subpath: s.routes.includes("dev") ? "com" : s.subpath }, role, proc ? "modelagem" : "execucao", `Demanda direcionada: ${routeText(s.routes)}.`),
    );
    if (proc) notify("solicitante", id, "Modelagem de processo iniciada", "Você participa como responsável junto ao PMO.");
    else notify("tech", id, "Nova demanda na fila de desenvolvimento", s0.title);
    toast("Demanda direcionada", proc ? "Segue para modelagem de processo, POP e treinamento." : "Na fila de parametrização e desenvolvimento da Tech.");
  },

  finishModeling: (id: string, role: Role) => {
    const s0 = get(id);
    const sem = s0.subpath === "sem";
    update(id, (s) =>
      log({ ...s, status: sem ? "encerramento" : "execucao" }, role, sem ? "encerramento" : "execucao", sem ? "Processo implementado sem desenvolvimento." : "Processo implementado com desenvolvimento. Encaminhado à Tech."),
    );
    if (!sem) notify("tech", id, "Nova demanda na fila de desenvolvimento", s0.title);
    toast(sem ? "Processo implementado sem desenvolvimento" : "Encaminhada à Tech", sem ? "Esforço de TI evitado. Segue para registro de ganhos." : "Parametrização e desenvolvimento do sistema.");
  },

  markDeployed: (id: string, role: Role) => {
    update(id, (s) => log({ ...s, status: "homologacao" }, role, "homologacao", "Funcionalidade implementada em homologação."));
    notify("solicitante", id, "Entrega pronta para teste", "Participe do teste assistido e confirme o aceite.");
    notify("pmo", id, "Funcionalidade em homologação", "Acompanhe a validação da Tech e o aceite do solicitante.");
    toast("Implementada em homologação", "Tech valida e solicitante confirma o aceite.");
  },

  homolog: (id: string, role: Role, field: "homologTech" | "homologReq") => {
    update(id, (s) => {
      const at = nowStamp();
      const who = USERS[role].name;
      const signed = field === "homologTech" ? { homologTechBy: who, homologTechAt: at } : { homologReqBy: who, homologReqAt: at };
      let next = log({ ...s, [field]: true, ...signed }, role, "homologacao", field === "homologTech" ? "Entrega validada pela Tech em produção." : "Aceite do solicitante registrado.");
      if (next.homologTech && next.homologReq) {
        next = log({ ...next, status: "encerramento" }, role, "encerramento", "Entrega homologada em produção.");
      }
      return next;
    });
    if (field === "homologTech") notify("solicitante", id, "Aceite pendente", "A Tech validou a entrega em produção. Confirme o aceite.");
    else notify("pmo", id, "Entrega homologada", "Registre os ganhos e encerre o ciclo.");
    toast(field === "homologTech" ? "Entrega validada pela Tech" : "Aceite registrado", "Quando Tech e solicitante confirmarem, a SM segue para o registro de ganhos.");
  },

  close: (id: string, role: Role) => {
    update(id, (s) => log({ ...s, status: "concluida", closedAt: TODAY_BR }, role, "concluida", "Status atualizado e ganhos registrados. Ciclo de SM encerrado."));
    notify("solicitante", id, "Ciclo da sua SM encerrado", "Obrigado pela contribuição. Os ganhos foram registrados no painel executivo.");
    toast("Ciclo de SM encerrado", "Valor capturado no KPI executivo. Solicitante notificado.");
  },

  comment: (id: string, role: Role, text: string, files: SmFile[]) => {
    update(id, (s) => ({ ...s, comments: [...s.comments, { at: nowStamp(), who: USERS[role].name, text, ...(files.length ? { files } : {}) }] }));
    (["solicitante", "pmo", "tech"] as Role[])
      .filter((r) => r !== role)
      .forEach((r) => notify(r, id, `Novo comentário de ${USERS[role].name}`, text || `${files.length} anexo(s)`));
  },

  evidence: (id: string, role: Role, files: SmFile[]) => {
    if (!files.length) return;
    update(id, (s) => log(s, role, s.status, `Anexou evidência da etapa ${CUR_LABEL[s.status] ?? ""}.`, files));
    toast("Evidência anexada", `${files.length} arquivo(s) registrado(s) no histórico.`);
  },

  /**
   * "Também me afeta": entra na lista de afetados com a unidade e a área de
   * quem clica e, se quiser, como o problema aparece na rotina. Avisa o
   * solicitante (o dos cenários); o PMO vê o número no painel, sem aviso.
   */
  affect: (id: string, role: Role, text: string) => {
    const me = USERS[role];
    const s0 = get(id);
    update(id, (s) => ({ ...s, affected: [...s.affected, { at: nowStamp(), who: me.name, unit: me.unit ?? "", area: me.area ?? "", text }] }));
    if (s0.requester === USERS.solicitante.name && role !== "solicitante") {
      notify("solicitante", id, "Mais pessoas afetadas", `${me.name} (${me.unit}) também é afetado pela sua solicitação.`);
    }
    toast("Registrado", text ? "Seu relato foi somado à solicitação e ajuda o PMO a medir a abrangência." : "Você foi somado aos afetados por esta solicitação.");
  },

  /** Abrir o detalhe conta uma visualização, uma vez por SM na sessão. */
  view: (id: string) => {
    if (seen.has(id) || !data.sms.some((s) => s.id === id)) return;
    seen.add(id);
    update(id, (s) => ({ ...s, views: s.views + 1 }));
  },

  unaffect: (id: string, role: Role) => {
    update(id, (s) => ({ ...s, affected: s.affected.filter((a) => a.who !== USERS[role].name) }));
    toast("Removido", "Você não aparece mais entre os afetados.", "info");
  },
};
