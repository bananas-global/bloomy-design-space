/**
 * Sistema de compras — a base da sessão, compartilhada entre a lista e o
 * detalhe, como o `store.ts` das solicitações de melhoria.
 *
 * Nasce da fixture e guarda o que cada papel faz (pedir, aprovar, cotar,
 * emitir, vincular a nota, confirmar a chegada), para a solicitação seguir de
 * uma tela para a outra e de um papel para o outro. Vive só em memória:
 * recarregar a página volta à fixture. Abrir outro cenário também, para cada
 * cenário mostrar o estado que ele descreve.
 */
import { useSyncExternalStore } from "react";
import type { ScenarioContext } from "@brucesantos/design-space";
import { COMPRAS_FIXTURES, type ComprasFixture } from "./fixtures.js";
import type { UserNotification } from "../../components/Notification.js";
import type { Alcadas, Fornecedor, Item, Papel, Solicitacao } from "./model.js";

/** Um aviso do sino (RF-12), para quem ocupa um papel. */
export type Aviso = UserNotification & { para: Papel };

type Base = { key: string; solicitacoes: Solicitacao[]; fornecedores: Fornecedor[]; itens: Item[]; alcadas: Alcadas | null; avisos: Aviso[] };

let base: Base = { key: "", solicitacoes: [], fornecedores: [], itens: [], alcadas: null, avisos: [] };
let seq = 0;
/** O último cenário aberto: navegar sem cenário (a URL perde o parâmetro) não re-semeia. */
let cenario = "";
const listeners = new Set<() => void>();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function set(next: Partial<Omit<Base, "key">>) {
  base = { ...base, ...next };
  listeners.forEach((l) => l());
}

/**
 * Os dados da tela. Sem cenário (uma solicitação criada na sessão não tem
 * cenário que aponte para ela), o motor não entrega fixture: as telas seguem
 * com a base da sessão. Carregando ou com erro de rede, não há dados.
 */
export function dadosDe(context: ScenarioContext): ComprasFixture | undefined {
  if (context.isLoading || context.error) return undefined;
  if (context.network === "empty") return COMPRAS_FIXTURES[1]!.data as ComprasFixture;
  return (context.data as ComprasFixture | undefined) ?? (COMPRAS_FIXTURES[0]!.data as ComprasFixture);
}

/** A base da sessão. Re-semeia quando a fixture ou o cenário mudam. */
export function useCompras(context: ScenarioContext): Base | null {
  const data = dadosDe(context);
  if (context.scenario?.id) cenario = context.scenario.id;
  // Sem fixture no contexto, a base que já existe continua valendo.
  const key = context.fixture?.id ? `${context.fixture.id}|${cenario}|${context.network}` : base.key || `compras.base|${cenario}|${context.network}`;
  if (data && base.key !== key) {
    base = { key, solicitacoes: data.solicitacoes, fornecedores: data.fornecedores, itens: data.itens, alcadas: data.alcadas, avisos: [] };
  }
  const snap = useSyncExternalStore(subscribe, () => base, () => base);
  return data ? snap : null;
}

export const compras = {
  /** Uma solicitação nova entra no topo. Devolve se entrou (não entra duas vezes). */
  add(s: Solicitacao): boolean {
    if (base.solicitacoes.some((x) => x.id === s.id)) return false;
    set({ solicitacoes: [s, ...base.solicitacoes] });
    return true;
  },
  update(id: string, fn: (s: Solicitacao) => Solicitacao) {
    set({ solicitacoes: base.solicitacoes.map((s) => (s.id === id ? fn(s) : s)) });
  },
  addFornecedor(f: Fornecedor) {
    set({ fornecedores: [...base.fornecedores, f] });
  },
  addItem(i: Item) {
    set({ itens: [...base.itens, i] });
  },
  /** RF-12: o aviso entra no topo do sino de quem ocupa o papel. */
  avisar(para: Papel, title: string, content: string, onClickUrl?: string) {
    set({ avisos: [{ id: `aviso-${++seq}`, para, title, content, insertedAt: "agora", onClickUrl }, ...base.avisos] });
  },
  /** RN-06: o pedido aprovado num nível soma no consumo do mês e do ano desse nível. */
  consumir(nivel: "compras" | "financeiro", valor: number) {
    if (!base.alcadas) return;
    const c = base.alcadas.consumo[nivel];
    set({ alcadas: { ...base.alcadas, consumo: { ...base.alcadas.consumo, [nivel]: { mes: c.mes + valor, ano: c.ano + valor } } } });
  },
};
