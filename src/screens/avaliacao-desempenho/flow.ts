/**
 * Avaliação de desempenho — a rota e os controles da tela.
 *
 * O controle "Gaveta" abre o drawer num estado; quando a própria UI muda de
 * estado (abrir, ver, editar, voltar), o controle acompanha.
 *
 * `useControlledState` é o mesmo de `acompanhamento-periodico/flow.ts` e
 * `mapa-salas/flow.ts` (branches ainda fora da `main`). Quando estiverem na
 * `main`, pode ir para um lugar compartilhado.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ControlGroup, ScenarioContext } from "@brucesantos/design-space";

export type Controls = Record<string, string>;

export const PROFESSIONAL_ID = "pr1";

export const FLOW = "Avaliação de desempenho";

export const PATH = "/backoffice/profissionais/:id";

export const professionalPath = (id = PROFESSIONAL_ID) => `/backoffice/profissionais/${id}`;

export type DrawerState = "closed" | "list" | "new" | "view" | "edit";

export const REVIEW_CONTROLS: ControlGroup[] = [
  {
    id: "drawer",
    title: "Gaveta · drawer_modal",
    component: "core.drawer-modal",
    note: "Abre pelo menu ⋮ do card do profissional, em Avaliação de Desempenho. Ver e Editar abrem a avaliação mais recente; sem avaliações, caem na lista.",
    controls: [
      {
        id: "drawer",
        label: "Aberta em",
        options: [
          { value: "closed", label: "Fechada" },
          { value: "list", label: "Todas avaliações" },
          { value: "new", label: "Nova avaliação" },
          { value: "view", label: "Ver avaliação" },
          { value: "edit", label: "Editar avaliação" },
        ],
      },
    ],
  },
];

export const validIn = (groups: ControlGroup[], id: string, value: string) =>
  groups.some((g) => g.controls.some((c) => c.id === id && c.options.some((o) => o.value === value)));

export type ControlledStateOptions<S> = {
  groups: ControlGroup[];
  /**
   * Estado a partir dos controles. `prev` e `changed` chegam quando um controle
   * mudou de fora, para a tela poder re-semear só a parte afetada.
   */
  seed: (controls: Controls, prev?: S, changed?: string[]) => S;
  /** O que o estado atual representa em cada controle. */
  derive: (state: S, controls: Controls) => Controls;
};

export function useControlledState<S>(context: ScenarioContext, { groups, seed, derive }: ControlledStateOptions<S>) {
  const controls = context.controls;
  const key = JSON.stringify(Object.keys(controls).sort().map((id) => [id, controls[id]]));
  const [held, setHeld] = useState(() => ({ key, controls, state: seed(controls) }));
  let current = held;

  if (held.key !== key) {
    const changed = Object.keys(controls).filter((id) => controls[id] !== held.controls[id]);
    const represented = derive(held.state, controls);
    const external = changed.filter((id) => represented[id] !== controls[id]);
    current = { key, controls, state: external.length ? seed(controls, held.state, external) : held.state };
    setHeld(current);
  }

  const lastAttempt = useRef("");
  useEffect(() => {
    const represented = derive(current.state, controls);
    const patch = Object.fromEntries(
      Object.entries(represented).filter(([c, value]) => value !== controls[c] && validIn(groups, c, value)),
    );
    if (Object.keys(patch).length === 0) return;
    const attempt = `${key}|${JSON.stringify(patch)}`;
    if (attempt === lastAttempt.current) return;
    lastAttempt.current = attempt;
    context.setControls(patch);
  });

  const setState = useCallback((next: S | ((prev: S) => S)) => {
    setHeld((h) => ({ ...h, state: typeof next === "function" ? (next as (prev: S) => S)(h.state) : next }));
  }, []);
  return [current.state, setState] as const;
}
