/**
 * Unidades — estado da documentação durante a sessão.
 *
 * O drawer anexa e substitui documentos padrão; a matriz e o drawer
 * aberto leem daqui.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { ME, TODAY } from "./fixtures.js";
import { addDays, DOC_SLOTS, docRow, type DocRow, type DocsState, type Unit } from "./model.js";

type Store = {
  state: DocsState;
  rows: DocRow[];
  /** Anexa um arquivo novo ao documento padrão, vigente a partir de hoje. */
  attach: (unitId: string, slotId: string) => void;
};

const DocsContext = createContext<Store | null>(null);

export function DocsProvider({ initial, units, children }: { initial: DocsState; units: Unit[]; children: ReactNode }) {
  const [state, setState] = useState(initial);

  const store = useMemo<Store>(
    () => ({
      state,
      rows: units.map((u) => docRow(state, u, TODAY)),
      attach(unitId, slotId) {
        const slot = DOC_SLOTS.find((s) => s.id === slotId);
        if (!slot) return;
        setState((s) => {
          const docs = s[unitId] ?? [];
          const doc = {
            id: `${unitId}-${slotId}-${docs.length}`,
            slotId,
            name: slot.name,
            responsible: ME,
            updatedAt: addDays(TODAY, 0),
            validFrom: addDays(TODAY, 0),
            validUntil: slot.validity == null ? null : addDays(TODAY, slot.validity),
            file: `${slotId}-${unitId}.pdf`,
          };
          return { ...s, [unitId]: [...docs, doc] };
        });
      },
    }),
    [state, units],
  );

  return <DocsContext.Provider value={store}>{children}</DocsContext.Provider>;
}

export function useDocs(): Store {
  const store = useContext(DocsContext);
  if (!store) throw new Error("useDocs fora do DocsProvider");
  return store;
}
