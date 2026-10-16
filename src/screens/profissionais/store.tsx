/**
 * Profissionais — estado da documentação durante a sessão.
 *
 * Os drawers anexam e dispensam documentos internos e compartilham documentos
 * com operadoras; a matriz, o contador do seletor e os drawers abertos leem
 * daqui. Cada mudança passa por `reconcile`, que recalcula o credenciamento.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { OPERATORS, TODAY } from "./fixtures.js";
import { addDays, docRow, EXTRA_DOC_TYPES, linkKey, reconcile, type DocRow, type DocsState, type Professional } from "./model.js";

const ME = "Marina Alves";

type Store = {
  state: DocsState;
  rows: DocRow[];
  attach: (profId: string, typeId: string) => void;
  setWaived: (profId: string, typeId: string, on: boolean) => void;
  share: (profId: string, docId: string, opId: string) => void;
};

const DocsContext = createContext<Store | null>(null);

export function DocsProvider({ initial, professionals, children }: { initial: DocsState; professionals: Professional[]; children: ReactNode }) {
  const [state, setState] = useState(initial);
  const update = (fn: (s: DocsState) => DocsState) => setState((s) => reconcile(fn(s), OPERATORS, TODAY));

  const store = useMemo<Store>(() => {
    const rows = professionals.map((p) => docRow(state, OPERATORS, p, TODAY));
    return {
      state,
      rows,
      attach(profId, typeId) {
        const t = EXTRA_DOC_TYPES.find((x) => x.id === typeId);
        if (!t) return;
        update((s) => ({
          ...s,
          extra: {
            ...s.extra,
            [profId]: {
              ...s.extra[profId],
              [typeId]: { typeId, waived: false, updatedAt: addDays(TODAY, 0), validUntil: t.expires ? addDays(TODAY, 365) : null, by: ME },
            },
          },
        }));
      },
      setWaived(profId, typeId, on) {
        update((s) => {
          const current = s.extra[profId]?.[typeId];
          const prof = { ...s.extra[profId] };
          if (on) prof[typeId] = { ...(current ?? { typeId, updatedAt: addDays(TODAY, 0), validUntil: null, by: "Coordenação" }), waived: true };
          else if (current) prof[typeId] = { ...current, waived: false };
          return { ...s, extra: { ...s.extra, [profId]: prof } };
        });
      },
      share(profId, docId, opId) {
        update((s) => {
          const docs = (s.docs[profId] ?? []).map((d) => (d.id === docId && !d.shared.includes(opId) ? { ...d, shared: [...d.shared, opId] } : d));
          const key = linkKey(profId, opId);
          const links = s.links[key] ? s.links : { ...s.links, [key]: { status: "pending" as const, since: addDays(TODAY, 0) } };
          return { ...s, docs: { ...s.docs, [profId]: docs }, links };
        });
      },
    };
  }, [state, professionals]);

  return <DocsContext.Provider value={store}>{children}</DocsContext.Provider>;
}

export function useDocs(): Store {
  const store = useContext(DocsContext);
  if (!store) throw new Error("useDocs fora do DocsProvider");
  return store;
}
