/**
 * Documentos da unidade — a rota e os controles da tela.
 *
 * Os controles (`ControlGroup`, painel Variações do motor) montam os dados
 * sintéticos da aba; quando a própria UI muda o que um controle representa
 * (trocar Cards/Tabela, abrir ou fechar a gaveta), o controle acompanha por
 * `context.setControls`.
 *
 * `useControlledState` é o mesmo da aba do profissional e de
 * `relatorios/flow.ts` (PRs abertos): o estado nasce dos controles, é
 * re-semeado quando um controle muda de fora e sincroniza o controle quando
 * muda pela UI. Quando os três estiverem na `main`, pode ir para um lugar
 * compartilhado.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ControlGroup, ScenarioContext } from "@brucesantos/design-space";

export type Controls = Record<string, string>;

/** A rota aceita qualquer `:id`; a unidade exibida vem do controle "Unidade". */
export const UNIT_ID = "u1";

export const FLOW = "Documentos da unidade";

export const PATH = "/backoffice/unidades/:id/documentos";

export const unitDocumentsPath = (unitId = UNIT_ID) => `/backoffice/unidades/${unitId}/documentos`;

export const UNIT_DOCUMENTS_CONTROLS: ControlGroup[] = [
  {
    id: "unit",
    title: "Unidade",
    note: "O seletor de unidade do protótipo. A Unidade Teste tem os 12 documentos padrão; Santana, só 2.",
    controls: [
      {
        id: "unit",
        label: "Unidade",
        options: [
          { value: "u1", label: "Unidade Teste" },
          { value: "u2", label: "Santana" },
        ],
      },
    ],
  },
  {
    id: "view",
    title: "Visualização · radio_selector",
    component: "core.radio-selector",
    note: "A mesma lista em cards ou em tabela.",
    controls: [
      {
        id: "view",
        label: "Visualização",
        options: [
          { value: "cards", label: "Cards" },
          { value: "table", label: "Tabela" },
        ],
      },
    ],
  },
  {
    id: "rows",
    title: "Documentos",
    note: "Sem documentos: só os doze padrão, todos pendentes. Sem resultado: a busca não encontra nada.",
    controls: [
      {
        id: "rows",
        label: "Conteúdo",
        options: [
          { value: "data", label: "Com documentos" },
          { value: "empty", label: "Sem documentos" },
          { value: "no-match", label: "Sem resultado na busca" },
        ],
      },
    ],
  },
  {
    id: "alerts",
    title: "Validades · tag",
    component: "core.tag",
    note: "Unidade Teste: dedetização vencida em 31/07, potabilidade vence em 25 dias e aditivo de locação aguardando vigência. Santana: licença sanitária vence em 56 dias.",
    controls: [
      {
        id: "alerts",
        label: "Validades",
        options: [
          { value: "with", label: "Com alertas" },
          { value: "none", label: "Todos em dia" },
        ],
      },
    ],
  },
  {
    id: "overlay",
    title: "Sobreposição aberta · drawer_modal",
    component: "core.drawer-modal",
    note: "Anexar abre no primeiro documento padrão pendente (em Santana, o CLI); Editar, no alvará.",
    controls: [
      {
        id: "overlay",
        label: "Aberta",
        options: [
          { value: "none", label: "Nenhuma" },
          { value: "add", label: "Adicionar documento" },
          { value: "attach", label: "Anexar documento padrão" },
          { value: "edit", label: "Editar documento" },
          { value: "bundle", label: "Exportar agrupado" },
        ],
      },
    ],
  },
];

const validIn = (groups: ControlGroup[], id: string, value: string) =>
  groups.some((g) => g.controls.some((c) => c.id === id && c.options.some((o) => o.value === value)));

/* ============================================================
   Estado da tela semeado pelos controles
   ============================================================ */

export type ControlledStateOptions<S> = {
  groups: ControlGroup[];
  /**
   * Estado a partir dos controles. `prev` e `changed` chegam quando um controle
   * mudou de fora, para a tela poder re-semear só a parte afetada.
   */
  seed: (controls: Controls, prev?: S, changed?: string[]) => S;
  /** O que o estado atual representa em cada controle (os que não se aplicam devolvem o valor atual). */
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
