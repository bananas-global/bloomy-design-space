/**
 * Relatórios do paciente — dos controles aos dados de cada tela.
 *
 * Cada função leva um relatório qualquer ao estado que um controle pede (status,
 * assinaturas, compartilhamento, rascunho, coautor, gráficos, PDF), com o
 * histórico coerente. Se o relatório já está no estado pedido, volta intacto:
 * é isso que deixa a versão da sessão aparecer quando a combinação bate.
 * `derive*` faz o caminho inverso, do relatório ao valor de cada controle.
 *
 * Carimbos fixos, sempre antes de hoje (16/07/2026 09:00), sem relógio.
 */
import type { Controls } from "./flow.js";
import { CHART_SVG, FABIO, HELENA, MARINA, extraReports, PROTOCOL_APPS, protoApp, seedReports } from "./fixtures.js";
import {
  REL_REQUESTED_BY_SHORT,
  filledSections,
  guardiansOf,
  isLate,
  relAuthors,
  relIsModel,
  relIsProtocol,
  relSlug,
  sectionsFor,
  shareState,
  signProgress,
  vbLocalText,
  type DraftContent,
  type HistoryEntry,
  type Report,
  type ReportStatus,
  type RoutineState,
  type ShareRecipient,
  type ShareState,
} from "./model.js";
import { session } from "./session.js";

const entry = (at: string, who: string, text: string, icon: string): HistoryEntry => ({ at, who, text, icon });
const profName = (r: Report) => (r.prof ?? HELENA).name;

/* ============================================================
   Onde achar um relatório
   ============================================================ */

/** Relatório por id: o da sessão, o do conjunto da tela ou um dos extras dos editores. */
export function findReport(id: string | undefined, dataset: Report[]): Report | undefined {
  if (!id) return undefined;
  return session.report(id) ?? dataset.find((r) => r.id === id) ?? extraReports().find((r) => r.id === id);
}

/** Relatório de cada status quando o id da URL não existe (ex.: a tela aberta pela aba Telas). */
const CANONICAL: Record<ReportStatus, string> = {
  solicitado: "r-103",
  em_andamento: "r-103",
  assinaturas: "r-105",
  finalizado: "r-122",
  cancelado: "r-125",
};
export const canonicalReport = (status: ReportStatus) => seedReports().find((r) => r.id === CANONICAL[status])!;

/* ============================================================
   Status, assinaturas e compartilhamento (tela Relatório)
   ============================================================ */

/** Só a criação: sem rascunho, assinatura, documento, compartilhamento nem cancelamento. */
function asRequested(r: Report): Report {
  const created = r.history.slice(0, 1);
  return {
    ...r, status: "solicitado", hasDraft: false, draftContent: undefined, draft: undefined, signatures: {}, finalDoc: null,
    share: undefined, cancelReason: "", changeRequest: undefined, editingNow: undefined, history: created,
    updatedAt: created[0]?.at ?? r.updatedAt,
  };
}

const SAMPLE_TEXT =
  "Lucas participou de 22 das 24 sessões previstas, com bom engajamento nas atividades de mesa e evolução consistente em comunicação e autonomia.";

/** Rascunho de exemplo: a primeira seção de texto (modelo) ou as duas primeiras (protocolo). */
function sampleDraft(r: Report): DraftContent {
  if (relIsProtocol(r)) {
    const app = protoApp(r.protocolAppId) ?? PROTOCOL_APPS[0]!;
    return { instrumento: vbLocalText("instrumento", app, r.patient.name), resultados: vbLocalText("resultados", app, r.patient.name) };
  }
  const first = sectionsFor(r.typeId).find((s) => s.kind !== "image");
  return first ? { [first.id]: SAMPLE_TEXT } : {};
}

const hasText = (r: Report) => filledSections(r).done > 0;

/** Responsável e mais um autor (Fábio, ou Helena quando o Fábio é o responsável). */
function withTwoAuthors(r: Report): Report {
  const prof = r.prof ?? HELENA;
  if (relAuthors({ ...r, prof }).length >= 2) return { ...r, prof };
  return { ...r, prof, coauthors: [prof.id === FABIO.id ? HELENA : FABIO] };
}

function inProgress(r: Report): Report {
  const base = asRequested(r);
  return {
    ...base, status: "em_andamento", hasDraft: true,
    draftContent: hasText(r) ? r.draftContent : { ...r.draftContent, ...sampleDraft(r) },
    draft: { updatedAt: "15/07/2026 17:40", by: profName(r) }, updatedAt: "15/07/2026 17:40",
    history: [
      ...base.history,
      entry("13/07/2026 10:05", profName(r), relIsModel(r) ? "Relatório iniciado" : "Solicitação aberta", "fa-play"),
      entry("15/07/2026 17:40", profName(r), "Rascunho salvo", "fa-floppy-disk"),
    ],
  };
}

/** Leva o relatório ao status pedido; no mesmo status, devolve o próprio relatório. */
export function withStatus(r: Report, status: ReportStatus): Report {
  if (r.status === status) return r;
  switch (status) {
    case "solicitado":
      return asRequested(r);
    case "em_andamento":
      return inProgress(r);
    case "assinaturas": {
      const base = withTwoAuthors(inProgress(r));
      return {
        ...base, status: "assinaturas", hasDraft: false, updatedAt: "15/07/2026 18:10",
        history: [...base.history, entry("15/07/2026 18:10", profName(base), `Enviado para assinaturas de ${relAuthors(base).length} autores`, "fa-signature")],
      };
    }
    case "finalizado": {
      const base = inProgress(r);
      const at = "15/07/2026 18:20";
      const model = relIsModel(base);
      return {
        ...base, status: "finalizado", hasDraft: false, updatedAt: at,
        signatures: model ? Object.fromEntries(relAuthors(base).map((a) => [a.id, at])) : {},
        finalDoc: r.finalDoc ?? { name: `${relSlug(base)}-${base.patient.name.split(" ")[0]!.toLowerCase()}.pdf`, size: "1,1 MB", at: "15/07/2026" },
        history: [...base.history, entry(at, profName(base), model ? "Relatório finalizado" : "PDF final anexado e solicitação finalizada", "fa-circle-check")],
      };
    }
    case "cancelado": {
      const base = asRequested(r);
      return {
        ...base, status: "cancelado", updatedAt: "15/07/2026 10:20",
        cancelReason: r.cancelReason || "Família informou que o relatório não é mais necessário.",
        history: [...base.history, entry("15/07/2026 10:20", REL_REQUESTED_BY_SHORT, "Solicitação cancelada", "fa-ban")],
      };
    }
  }
}

/** Aguardando assinatura: `n` dos dois autores já assinaram (o responsável primeiro). */
export function withSignatures(r: Report, n: number): Report {
  if (r.status !== "assinaturas") return r;
  if (relAuthors(r).length === 2 && signProgress(r).done === n) return r;
  const base = withTwoAuthors(r);
  const signed = relAuthors(base).slice(0, n);
  const at = "15/07/2026 18:20";
  return {
    ...base,
    signatures: Object.fromEntries(signed.map((a) => [a.id, at])),
    history: [...base.history.filter((h) => !h.text.startsWith("Assinado por")), ...signed.map((a) => entry(at, a.name, `Assinado por ${a.name}`, "fa-signature"))],
  };
}

const SHARE_TEXTS = ["Documento compartilhado", "Compartilhamento atualizado", "Acesso da família"];

/** Emitido: o estado do compartilhamento com a família. */
export function withShare(r: Report, state: ShareState): Report {
  if (r.status !== "finalizado" || shareState(r) === state) return r;
  const history = r.history.filter((h) => !SHARE_TEXTS.some((t) => h.text.startsWith(t)));
  if (state === "none") return { ...r, share: undefined, history };
  const [mae, pai] = guardiansOf(r.patient.name);
  const day = r.finalDoc?.at ?? "15/07/2026";
  const read = (g: typeof mae): ShareRecipient => ({ ...g!, viewedAt: `${day} 21:14`, viewCount: 2 });
  const unread = (g: typeof mae): ShareRecipient => ({ ...g!, viewedAt: null, viewCount: 0 });
  const recipients =
    state === "pending" ? [unread(mae)] : state === "partial" && pai ? [read(mae), unread(pai)] : [read(mae)];
  const n = `${recipients.length} responsáve${recipients.length > 1 ? "is" : "l"}`;
  const sharedAt = `${day} 19:00`;
  return {
    ...r,
    share: {
      sharedAt, sharedBy: MARINA, recipients, revokedAt: state === "revoked" ? "16/07/2026 08:30" : null,
      note: state === "partial" ? "Qualquer dúvida, falem com a Helena na próxima sessão." : "",
    },
    history: [
      ...history,
      entry(sharedAt, MARINA, `Documento compartilhado com ${n} no app da família`, "fa-share-nodes"),
      ...(state === "revoked" ? [entry("16/07/2026 08:30", MARINA, "Acesso da família ao documento revogado", "fa-ban")] : []),
    ],
  };
}

/** O relatório da tela Relatório com os controles aplicados. */
export function reportFromControls(base: Report, c: Controls): Report {
  const status = c.status as ReportStatus;
  return withShare(withSignatures(withStatus(base, status), Number(c.signatures)), c.share as ShareState);
}

/** Os controles da tela Relatório que o relatório representa (os que não se aplicam ficam como estão). */
export function deriveReport(r: Report, c: Controls): Controls {
  return {
    status: r.status,
    signatures: r.status === "assinaturas" ? String(signProgress(r).done) : c.signatures!,
    share: r.status === "finalizado" ? shareState(r) : c.share!,
  };
}

/* ============================================================
   Editores (modelo, protocolo, anexar)
   ============================================================ */

/** Rascunho novo (solicitado, sem texto) ou em produção (rascunho salvo com texto). */
export function withDraft(r: Report, draft: string): Report {
  if (draft === "new") return r.status === "solicitado" && !hasText(r) ? r : asRequested(r);
  return r.status === "em_andamento" && hasText(r) ? r : inProgress(r);
}
export const deriveDraft = (r: Report) => (hasText(r) || r.hasDraft ? "progress" : "new");

export function withCoauthor(r: Report, coauthor: string): Report {
  const has = (r.coauthors ?? []).length > 0;
  if (coauthor === "none") return has ? { ...r, coauthors: [] } : r;
  return has ? r : withTwoAuthors(r);
}
export const deriveCoauthor = (r: Report) => ((r.coauthors ?? []).length > 0 ? "with" : "none");

const imageSection = (r: Report) => sectionsFor(r.typeId).find((s) => s.kind === "image");
const hasImages = (c: DraftContent | undefined, sectionId: string) =>
  ((c?.[sectionId] as unknown[] | undefined) ?? []).length > 0 || ((c?.__extraImages as unknown[] | undefined) ?? []).length > 0;

/** Um gráfico no campo de imagem do modelo e um campo de imagem extra; ou nenhum. */
export function withImages(r: Report, images: string): Report {
  const sec = imageSection(r);
  if (!sec || hasImages(r.draftContent, sec.id) === (images === "with")) return r;
  const content = { ...r.draftContent };
  if (images === "none") {
    delete content[sec.id];
    delete content.__extraImages;
  } else {
    content[sec.id] = [{ id: `${r.id}-${sec.id}-img-1`, name: "acertos-julho.png", size: "84 KB", src: CHART_SVG, caption: "Figura 1. Acertos por programa no mês", width: "full" }];
    content.__extraImages = [{ id: "xi-1", title: "Registro de comportamentos-alvo" }];
  }
  return { ...r, draftContent: content };
}
export const deriveImages = (r: Report, c: Controls) => {
  const sec = imageSection(r);
  return sec ? (hasImages(r.draftContent, sec.id) ? "with" : "none") : c.images!;
};

/** Anexar: sem arquivo, ou o PDF final já anexado no rascunho. */
export function withFile(r: Report, file: string): Report {
  const attached = Boolean(r.draftContent?.file);
  if (file === "none") return !attached && r.status === "solicitado" ? r : asRequested(r);
  if (attached && r.status === "em_andamento") return r;
  return {
    ...inProgress({ ...r, draftContent: undefined }),
    draftContent: {
      file: { name: `${relSlug(r)}-lucas.pdf`, size: "2,1 MB", at: "15/07/2026", by: REL_REQUESTED_BY_SHORT, kind: "PDF anexado" },
      obs: "Documento emitido fora do sistema e recebido em 15/07/2026.",
    },
  };
}
export const deriveFile = (r: Report) => (r.draftContent?.file ? "attached" : "none");

/** O editor de cada tipo e os controles dele. */
export type EditorKind = "fill" | "protocol" | "upload";
export const editorKindOf = (r: Report): EditorKind => (relIsProtocol(r) ? "protocol" : relIsModel(r) ? "fill" : "upload");

/** Relatório padrão de cada editor quando o da URL não é do tipo certo. */
const EDITOR_CANONICAL: Record<EditorKind, string> = { fill: "r-130", protocol: "r-111", upload: "r-131" };
export const editorCanonical = (kind: EditorKind) =>
  [...seedReports(), ...extraReports()].find((r) => r.id === EDITOR_CANONICAL[kind])!;

export function editorFromControls(kind: EditorKind, base: Report, c: Controls): Report {
  if (kind === "upload") return withFile(base, c.file!);
  const r = withCoauthor(withDraft(base, c.draft!), c.coauthor!);
  return kind === "fill" ? withImages(r, c.images!) : r;
}

export function deriveEditor(kind: EditorKind, r: Report, c: Controls): Controls {
  if (kind === "upload") return { file: deriveFile(r) };
  const out: Controls = { draft: deriveDraft(r), coauthor: deriveCoauthor(r) };
  if (kind === "fill") out.images = deriveImages(r, c);
  return out;
}

/* ============================================================
   Lista
   ============================================================ */

/** Sem atrasos: prazos vencidos passam para o fim do mês, e a regra da escola ganha 30 dias. */
export function withoutLate(reports: Report[], routine: RoutineState): { reports: Report[]; routine: RoutineState } {
  return {
    reports: reports.map((r) => (isLate(r) ? { ...r, due: "31/07/2026" } : r)),
    routine: {
      ...routine,
      patients: Object.fromEntries(
        Object.entries(routine.patients).map(([id, p]) => [
          id,
          { ...p, own: p.own.map((rule) => (rule.dueMode === "days_after" && rule.dueValue < 30 ? { ...rule, dueValue: 30 } : rule)) },
        ]),
      ),
    },
  };
}

/** O conjunto da lista com o que a sessão mudou ou criou. */
export function withSession(reports: Report[]): Report[] {
  const changed = session.reports();
  const ids = new Set(reports.map((r) => r.id));
  return [...changed.filter((r) => !ids.has(r.id)), ...reports.map((r) => session.report(r.id) ?? r)];
}
