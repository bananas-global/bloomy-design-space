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
  CUR_LABEL, PRIO, USERS, blankSm, fmt, hasWorkaround, nowStamp, prioOf, routeText, scoreOf, TODAY_BR,
  type HistoryEntry, type Role, type Sm, type SmFile, type SmForm,
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
  toggle: (id: string, field: "participants" | "interfaceAreas" | "routes", value: string) =>
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

  reject: (id: string, role: Role) => {
    const s0 = get(id);
    update(id, (s) => log({ ...s, status: "rejeitada" }, role, "rejeitada", `Demanda inelegível (${s.rejectCriterion}). Justificativa: ${s.rejection} Solicitante notificado.`, undefined, true));
    notify("solicitante", id, "Solicitação rejeitada na triagem", `${s0.rejectCriterion} — ${s0.rejection}`);
    toast("Recusa registrada", "Solicitante notificado com a justificativa.", "info");
  },

  finishTriage: (id: string, role: Role) => {
    update(id, (s) => {
      const m = hasWorkaround(s) ? 3 : 0;
      const scores = s.scores ?? { impact: m, risk: m, urgency: 0, reach: 0, alignment: 0 };
      return log({ ...s, scores, status: "priorizacao" }, role, "priorizacao", "Triagem preliminar concluída. Demanda elegível para avaliação.");
    });
    toast("Triagem concluída", "Demanda elegível · seguir para a matriz de critérios.");
  },

  saveBacklog: (id: string, role: Role) => {
    const s0 = get(id);
    const p = PRIO[prioOf(s0)!];
    const pts = fmt(scoreOf(s0));
    update(id, (s) =>
      log({ ...s, status: "backlog" }, role, "backlog", `Aprovada para o backlog com ${p.full} (${pts} pts). KPIs recalculados.${s.p0 ? ` Exceção mandatória: ${s.p0Reason}.` : ""}`),
    );
    notify("solicitante", id, "Aprovada para o backlog", `${p.full} · ${pts} pts. Você será convidado à reunião de cenários.`);
    toast("Aprovada para o backlog", `${id} · ${p.full}. KPIs executivos recalculados.`);
  },

  finishScenarios: (id: string, role: Role) => {
    update(id, (s) => log({ ...s, status: "cenarios" }, role, "cenarios", `Reunião de desenho de cenários realizada com ${s.participants.join(", ")}.`));
    toast("Cenários mapeados", "Pronto para direcionar a demanda.");
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
