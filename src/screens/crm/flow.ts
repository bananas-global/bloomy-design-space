/**
 * CRM de Leads — a rota e os controles da tela.
 *
 * Os controles abrem a tela num estado (funil ou tabela, um negócio aberto
 * numa aba, o drawer de Efetivar Paciente); quando a própria UI muda de
 * estado, o controle acompanha.
 *
 * `useControlledState` é o mesmo de `avaliacao-desempenho/flow.ts` (branch
 * ainda fora da `main`). Quando estiverem na `main`, pode ir para um lugar
 * compartilhado.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ControlGroup, ScenarioContext } from "@brucesantos/design-space";

export type Controls = Record<string, string>;

export const FLOW = "CRM de Leads";

/** A rota do Phoenix: `live "/visitas", ProspectLive.Index`. */
export const PATH = "/backoffice/visitas";

/** Negócios que os controles sabem abrir: um por etapa. */
export const LEAD_OPTIONS = [
  { value: "closed", label: "Fechado (funil ou tabela)" },
  { value: "new", label: "Novo Lead" },
  { value: "ld2", label: "Novo Lead · Sofia Mendes" },
  { value: "ld7", label: "Em Contato · Enzo Souza" },
  { value: "ld17", label: "Qualificação · Lívia Barros" },
  { value: "ld5", label: "Agendamento de Visita · Miguel Costa" },
  { value: "ld3", label: "Validação Técnica · Davi Lima" },
  { value: "ld4", label: "Aceite · Beatriz Faria" },
  { value: "ld8", label: "Desqualificado · Lucas Tavares" },
  { value: "ld6", label: "Perdido · Laura Araújo" },
];

export const CRM_CONTROLS: ControlGroup[] = [
  {
    id: "view",
    title: "Visualização",
    note: "O botão de dois estados ao lado de Novo Lead.",
    controls: [
      {
        id: "view",
        label: "Mostrar",
        options: [
          { value: "board", label: "Funil" },
          { value: "table", label: "Tabela" },
        ],
      },
    ],
  },
  {
    id: "deal",
    title: "Painel do negócio",
    note: "Abre ao clicar num card do funil ou em Editar na tabela. A aba inicial é a do papel da etapa (Comercial, Coordenação ou Orçamentista).",
    controls: [
      { id: "lead", label: "Negócio", options: LEAD_OPTIONS },
      {
        id: "tab",
        label: "Aba",
        options: [
          { value: "negocio", label: "Negócio · Comercial" },
          { value: "visita", label: "Visita · Coordenação" },
          { value: "autorizacao", label: "Autorização · Orçamentista" },
          { value: "historico", label: "Histórico" },
        ],
      },
    ],
  },
  {
    id: "convert",
    title: "Efetivar Paciente · drawer_modal",
    component: "core.drawer-modal",
    note: "Abre por Efetivar Paciente (menu ⋮ da tabela ou cabeçalho do negócio) ou ao soltar um card na coluna Efetivado.",
    controls: [
      {
        id: "convert",
        label: "Drawer",
        options: [
          { value: "closed", label: "Fechado" },
          { value: "open", label: "Aberto" },
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
