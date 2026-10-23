/**
 * Fila de Espera: a base da sessão, como o `store.ts` de compras.
 *
 * Nasce da fixture e guarda o que se faz na tela (editar o pedido, arrastar um
 * encaixe, tirar o lead da fila). Vive só em memória: recarregar a página volta
 * à fixture, e abrir outro cenário também.
 */
import { useSyncExternalStore } from "react";
import type { ScenarioContext } from "@brucesantos/design-space";
import { FILA_FIXTURES, type FilaFixture } from "./fixtures.js";
import type { Entrada } from "./model.js";

type Base = { key: string; entradas: Entrada[] };

let base: Base = { key: "", entradas: [] };
/** O último cenário aberto: navegar sem cenário não re-semeia. */
let cenario = "";
const listeners = new Set<() => void>();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function set(entradas: Entrada[]) {
  base = { ...base, entradas };
  listeners.forEach((l) => l());
}

/** Os dados da tela. Carregando ou com erro de rede, não há dados. */
export function dadosDe(context: ScenarioContext): FilaFixture | undefined {
  if (context.isLoading || context.error) return undefined;
  if (context.network === "empty") return FILA_FIXTURES[1]!.data as FilaFixture;
  return (context.data as FilaFixture | undefined) ?? (FILA_FIXTURES[0]!.data as FilaFixture);
}

/**
 * A base da sessão. Re-semeia quando os dados recebidos ou o cenário mudam.
 * A chave vem dos próprios dados, não do id da fixture: ao trocar de cenário, o
 * motor entrega a fixture nova antes dos dados dela, e a base ficaria com os
 * dados do cenário anterior.
 */
export function useFila(context: ScenarioContext): Base | null {
  const data = dadosDe(context);
  if (context.scenario?.id) cenario = context.scenario.id;
  const key = data ? `${cenario}|${context.network}|${data.entradas.map((e) => e.id).join(",")}` : base.key;
  if (data && base.key !== key) base = { key, entradas: data.entradas };
  const snap = useSyncExternalStore(subscribe, () => base, () => base);
  return data ? snap : null;
}

export const fila = {
  get: (id: string) => base.entradas.find((e) => e.id === id) ?? null,
  update(id: string, patch: Partial<Entrada>) {
    set(base.entradas.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  },
  /** O lead sai da fila: volta ao funil ou vai para Perdido. */
  release(id: string) {
    set(base.entradas.filter((e) => e.id !== id));
  },
};
