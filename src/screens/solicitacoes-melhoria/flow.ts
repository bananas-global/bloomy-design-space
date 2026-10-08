/**
 * Solicitações de melhoria — as rotas e os controles das telas.
 *
 * Duas telas: a central (`/backoffice/solicitacoes-de-melhoria`, com as abas
 * Painel executivo, Solicitações e Ideias e o modal Nova solicitação) e o
 * detalhe de uma SM (`/backoffice/solicitacoes-de-melhoria/:id`). O papel no
 * fluxo (PMO, Solicitante ou Tech) é um controle das duas: no protótipo era o
 * seletor "Visualizar como" do cabeçalho.
 *
 * `useControlledState` é o mesmo de `crm/flow.ts` e `documentos-unidade/flow.ts`
 * (branches ainda fora da `main`). Quando estiverem na `main`, pode ir para um
 * lugar compartilhado.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ControlGroup, ScenarioContext } from "@brucesantos/design-space";
import type { Role } from "./model.js";

export type Controls = Record<string, string>;

export const FLOW = "Solicitações de melhoria";

export const PATH = "/backoffice/solicitacoes-de-melhoria";
export const DETAIL_PATH = `${PATH}/:id`;
export const detailPath = (id: string) => `${PATH}/${id}`;

/** A SM que o detalhe abre sem cenário: a que está na triagem, com comentários. */
export const DEFAULT_SM = "SM-008";

export const ROLE_CONTROL: ControlGroup = {
  id: "papel",
  title: "Papel no fluxo",
  note: "Quem está usando a tela. Não é um papel do Bloomy: qualquer colaborador abre SM; PMO e Tech são da governança.",
  controls: [
    {
      id: "papel",
      label: "Visualizar como",
      options: [
        { value: "pmo", label: "PMO" },
        { value: "solicitante", label: "Solicitante" },
        { value: "tech", label: "Tech" },
      ],
    },
  ],
};

export const roleOf = (controls: Controls): Role =>
  controls.papel === "solicitante" || controls.papel === "tech" ? controls.papel : "pmo";

export type TabId = "painel" | "solicitacoes" | "ideias";

/** As abas da central por papel, na ordem: a primeira é a de abertura. */
export const TABS: Record<Role, { id: TabId; title: string }[]> = {
  pmo: [
    { id: "painel", title: "Painel executivo" },
    { id: "solicitacoes", title: "Solicitações" },
    { id: "ideias", title: "Ideias" },
  ],
  tech: [
    { id: "solicitacoes", title: "Solicitações" },
    { id: "painel", title: "Painel executivo" },
  ],
  solicitante: [
    { id: "solicitacoes", title: "Minhas solicitações" },
    { id: "ideias", title: "Ideias" },
  ],
};

export const HUB_CONTROLS: ControlGroup[] = [
  ROLE_CONTROL,
  {
    id: "aba",
    title: "Aba · card_tabs",
    component: "core.card-tabs",
    note: "PMO: Painel executivo, Solicitações e Ideias. Tech: Solicitações e Painel. Solicitante: Minhas solicitações e Ideias.",
    controls: [
      {
        id: "aba",
        label: "Aba",
        options: [
          { value: "painel", label: "Painel executivo" },
          { value: "solicitacoes", label: "Solicitações" },
          { value: "ideias", label: "Ideias" },
        ],
      },
    ],
  },
  {
    id: "view",
    title: "Solicitações · radio_selector",
    component: "core.radio-selector",
    note: "A mesma base em lista ou no kanban do fluxo (uma coluna por etapa). A Tech abre no kanban.",
    controls: [
      {
        id: "view",
        label: "Mostrar",
        options: [
          { value: "lista", label: "Lista" },
          { value: "kanban", label: "Kanban" },
        ],
      },
    ],
  },
  {
    id: "nova",
    title: "Nova solicitação · modal",
    component: "core.modal",
    note: "O formulário de 16 perguntas em quatro passos.",
    controls: [
      {
        id: "nova",
        label: "Modal",
        options: [
          { value: "fechado", label: "Fechado" },
          { value: "aberto", label: "Aberto" },
        ],
      },
    ],
  },
];

export const DETAIL_CONTROLS: ControlGroup[] = [ROLE_CONTROL];

/**
 * Põe a aba da central em `?sm_tab=sm|<slug>`, sobrescrevendo a que estiver lá.
 * É o `ensureTrackedTab` de `Tabs.tsx` sem a condição: aqui a aba também é um
 * controle, e o controle manda.
 */
export function setTrackedTab(trackerId: string, id: string, slug: string) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (params.get(trackerId) === `${id}|${slug}`) return;
  params.set(trackerId, `${id}|${slug}`);
  window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
}

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
