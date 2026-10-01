/**
 * Documentos da Operadora — o estado da tela e as ações que o alteram.
 * Cada ação devolve um estado já reconciliado (status dos vínculos recalculado).
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { TODAY_BR, isShared, linkKey, missingFor, reconcile, unitStatus, type DocsState, type LinkStatus } from "./model.js";

export type Store = {
  state: DocsState;
  /** Liga ou desliga o compartilhamento de um documento do profissional; o primeiro abre o credenciamento. */
  setShare: (profId: string, docId: string, on: boolean) => void;
  setLinkStatus: (profId: string, status: LinkStatus) => void;
  setUnitShare: (unitId: string, docId: string, on: boolean) => void;
  setOperatorActive: (active: boolean) => void;
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
          const key = linkKey(profId, opId);
          const links = on && !s.links[key] ? { ...s.links, [key]: { profId, opId, status: "pending" as const, since: TODAY_BR } } : s.links;
          return reconcile({ ...s, docs, links });
        }),
      setLinkStatus: (profId, status) =>
        setState((s) => {
          const key = linkKey(profId, opId);
          const prev = s.links[key] ?? { profId, opId, since: TODAY_BR };
          return reconcile({ ...s, links: { ...s.links, [key]: { ...prev, status, manual: status === "inactive" } } });
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
      setOperatorActive: (active) => setState((s) => ({ ...s, operator: { ...s.operator, active } })),
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

/** Uma linha por profissional: vínculo, documentos compartilhados e o que falta. */
export function profRows(s: DocsState) {
  const opId = s.operator.id;
  return s.professionals.map((prof) => {
    const link = s.links[linkKey(prof.id, opId)] ?? null;
    const shared = link ? (s.docs[prof.id] ?? []).filter((d) => isShared(d, opId)) : [];
    const missing = link ? missingFor(s, prof.id, opId) : s.required;
    return { prof, link, shared, missing };
  });
}

/** As unidades credenciadas na operadora. */
export const activeUnits = (s: DocsState) => s.units.filter((u) => unitStatus(u, s.operator.id).key === "active");
