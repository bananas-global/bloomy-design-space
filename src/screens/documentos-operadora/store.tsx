/**
 * Documentos da Operadora — o estado da tela e as ações que o alteram.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { TODAY_BR, isShared, linkKey, profDocState, type DocsState, type LinkStatus } from "./model.js";

export type Store = {
  state: DocsState;
  /** Liga ou desliga o compartilhamento de um documento do profissional. */
  setShare: (profId: string, docId: string, on: boolean) => void;
  /** Credencia ou descredencia; ao descredenciar, guarda o motivo e pode descompartilhar os documentos. */
  setLinkStatus: (profId: string, status: LinkStatus, opts?: { reason?: string; unshare?: boolean }) => void;
  setUnitShare: (unitId: string, docId: string, on: boolean) => void;
};

const Ctx = createContext<Store | null>(null);

export function DocsProvider({ initial, children }: { initial: DocsState; children: ReactNode }) {
  const [state, setState] = useState(initial);
  const opId = state.operator.id;

  const store = useMemo<Store>(
    () => ({
      state,
      setShare: (profId, docId, on) =>
        setState((s) => {
          const docs = {
            ...s.docs,
            [profId]: (s.docs[profId] ?? []).map((d) => {
              if (d.id !== docId || isShared(d, opId) === on) return d;
              return { ...d, shared: on ? [...d.shared, { opId, at: TODAY_BR }] : d.shared.filter((x) => x.opId !== opId) };
            }),
          };
          return { ...s, docs };
        }),
      setLinkStatus: (profId, status, opts = {}) =>
        setState((s) => {
          const key = linkKey(profId, opId);
          const link = { profId, opId, status, since: TODAY_BR, ...(opts.reason ? { reason: opts.reason } : {}) };
          const docs = opts.unshare
            ? { ...s.docs, [profId]: (s.docs[profId] ?? []).map((d) => ({ ...d, shared: d.shared.filter((x) => x.opId !== opId) })) }
            : s.docs;
          return { ...s, docs, links: { ...s.links, [key]: link } };
        }),
      setUnitShare: (unitId, docId, on) =>
        setState((s) => ({
          ...s,
          units: s.units.map((u) =>
            u.id !== unitId
              ? u
              : { ...u, documents: u.documents.map((d) => (d.id !== docId ? d : { ...d, shared: on ? [...d.shared, opId] : d.shared.filter((x) => x !== opId) })) },
          ),
        })),
    }),
    [state, opId],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useDocs(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useDocs fora do DocsProvider");
  return store;
}

/* ============================================================
   Leituras derivadas
   ============================================================ */

export type ProfRow = ReturnType<typeof profRows>[number];

const GROUP = { active: 0, none: 1, inactive: 2 } as const;

/**
 * Uma linha por profissional: vínculo, documentos compartilhados e os vencidos.
 * Credenciados primeiro, depois os não credenciados e, no fim, os descredenciados; por nome em cada grupo.
 */
export function profRows(s: DocsState) {
  const opId = s.operator.id;
  return s.professionals
    .map((prof) => {
      const link = s.links[linkKey(prof.id, opId)] ?? null;
      const shared = link ? (s.docs[prof.id] ?? []).filter((d) => isShared(d, opId)) : [];
      const expired = shared.filter((d) => profDocState(d).key === "expired");
      return { prof, link, shared, expired };
    })
    .sort((a, b) => GROUP[a.link?.status ?? "none"] - GROUP[b.link?.status ?? "none"] || a.prof.name.localeCompare(b.prof.name, "pt-BR"));
}
