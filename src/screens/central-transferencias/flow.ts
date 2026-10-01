/**
 * Central de Transferências — a rota e os controles da tela.
 *
 * Os controles (`ControlGroup`, painel Variações do motor) montam os dados
 * sintéticos da tela; quando a própria UI muda o que um controle representa
 * (trocar a sub-aba, a origem, distribuir), o controle acompanha por
 * `context.setControls`.
 *
 * `useControlledState` é o mesmo de `mapa-salas/flow.ts` e dos outros PRs
 * abertos: o estado nasce dos controles, é re-semeado quando um controle muda
 * de fora e sincroniza o controle quando muda pela UI. Quando estiverem na
 * `main`, pode ir para um lugar compartilhado.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ControlGroup, ScenarioContext } from "@brucesantos/design-space";
import { PROFESSIONALS } from "./fixtures.js";
import { NO_PROF } from "./model.js";

export type Controls = Record<string, string>;

export const FLOW = "Central de Transferências";

export const PATH = "/backoffice/central_transferencias";

/** Controles de cada sub-aba: mudar um deles de fora abre a sub-aba. */
export const MAPS_CONTROLS = ["origin", "cross", "distribute", "when", "scheduled"];
export const SESSIONS_CONTROLS = ["period", "sCross", "sDistribute"];

export const TRANSFER_CENTER_CONTROLS: ControlGroup[] = [
  {
    id: "sub",
    title: "Sub-aba · button_tabs",
    component: "core.button-tabs",
    note: "Mapas de horas: movimenta o mapa de um profissional para outros, horário a horário. Sessões do período: cobre sessões concretas sem mudar o mapa.",
    controls: [
      {
        id: "sub",
        label: "Sub-aba",
        options: [
          { value: "maps", label: "Mapas de horas" },
          { value: "sessions", label: "Sessões do período" },
        ],
      },
    ],
  },
  {
    id: "maps",
    title: "Mapas de horas",
    note: "Hoje é sexta, 21/08/2026. A origem automática são os mapas sem profissional (quatro), que têm destino possível. Distribuir dá a cada horário livre o profissional que recebeu menos.",
    controls: [
      {
        id: "origin",
        label: "Profissional de origem",
        options: [
          { value: "auto", label: "Automática" },
          ...PROFESSIONALS.map((p) => ({ value: p.id, label: `${p.name} · ${p.specialty}` })),
          { value: NO_PROF, label: "Sem profissional (inativos)" },
        ],
      },
      {
        id: "cross",
        label: "Outra especialidade",
        options: [
          { value: "off", label: "Só a mesma especialidade" },
          { value: "on", label: "Permitir outra especialidade (exceção)" },
        ],
      },
      {
        id: "distribute",
        label: "Destinos",
        options: [
          { value: "none", label: "Nenhum horário com destino" },
          { value: "auto", label: "Distribuídos automaticamente" },
        ],
      },
      {
        id: "when",
        label: "Início da transferência",
        options: [
          { value: "now", label: "Imediata" },
          { value: "prog", label: "Programada (28/08)" },
        ],
      },
      {
        id: "scheduled",
        label: "Programadas",
        options: [
          { value: "with", label: "Com uma programada (01/09)" },
          { value: "none", label: "Nenhuma programada" },
        ],
      },
    ],
  },
  {
    id: "sessions",
    title: "Sessões do período",
    note: "O período começa no primeiro dia útil a partir de hoje (sexta, 21/08). Distribuir dá a cada sessão o substituto que recebeu menos; o que não tem substituto fica para escolher.",
    controls: [
      {
        id: "period",
        label: "Período",
        options: [
          { value: "day", label: "Um dia (21/08)" },
          { value: "week", label: "Uma semana (21/08 a 27/08)" },
        ],
      },
      {
        id: "sCross",
        label: "Outra especialidade",
        options: [
          { value: "off", label: "Só a mesma especialidade" },
          { value: "on", label: "Permitir outra especialidade" },
        ],
      },
      {
        id: "sDistribute",
        label: "Substitutos",
        options: [
          { value: "none", label: "Nenhum definido" },
          { value: "auto", label: "Distribuídos automaticamente" },
        ],
      },
    ],
  },
];

export const validIn = (groups: ControlGroup[], id: string, value: string) =>
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
