/**
 * Solicitações de melhoria — as rotas e os controles das telas.
 *
 * Quatro telas. No menu lateral, só o item Solicitações de melhoria, que leva o
 * colaborador às solicitações dele e PMO e Tech à gestão:
 * - Minhas solicitações (`/backoffice/solicitacoes-de-melhoria`): qualquer
 *   colaborador, pelo item "Solicitações de melhoria" do menu do usuário. Uma
 *   página só, com todas as SMs em cards, lista ou kanban, e o botão Nova
 *   solicitação.
 * - Gestão (`…/gestao`): só PMO e Tech, por URL. Abas Painel executivo,
 *   Solicitações (lista, kanban ou cards). Sem a permissão, a tela barra.
 * - Nova solicitação (`…/nova`): a página do formulário, aberta pelo botão das
 *   duas telas acima. Volta para a tela de origem do papel.
 * - Detalhe (`…/:id`): a mesma SM para os três papéis, cada um com o que pode
 *   fazer na etapa.
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
export const MANAGE_PATH = `${PATH}/gestao`;
export const NEW_PATH = `${PATH}/nova`;
export const DETAIL_PATH = `${PATH}/:id`;
export const detailPath = (id: string) => `${PATH}/${id}`;

/** Para onde "Voltar" leva cada papel: o solicitante às dele, PMO e Tech à gestão. */
export const homeOf = (role: Role) => (role === "solicitante" ? PATH : MANAGE_PATH);

/** A SM que o detalhe abre sem cenário: a que está na triagem, com comentários. */
export const DEFAULT_SM = "SM-008";

const roleControl = (note: string, options: { value: Role; label: string }[]): ControlGroup => ({
  id: "papel",
  title: "Papel no fluxo",
  note,
  controls: [{ id: "papel", label: "Visualizar como", options }],
});

export const roleOf = (controls: Controls): Role =>
  controls.papel === "solicitante" || controls.papel === "tech" ? controls.papel : "pmo";

export type TabId = "painel" | "solicitacoes";
export type Area = "mine" | "manage";

/** As abas da gestão, na ordem: a primeira é a de abertura. Minhas solicitações não tem abas. */
export const TABS: Record<"pmo" | "tech", { id: TabId; title: string }[]> = {
  pmo: [
    { id: "painel", title: "Painel executivo" },
    { id: "solicitacoes", title: "Solicitações" },
  ],
  tech: [
    { id: "solicitacoes", title: "Solicitações" },
    { id: "painel", title: "Painel executivo" },
  ],
};

export const MINE_CONTROLS: ControlGroup[] = [
  {
    id: "view",
    title: "Visualização · radio_selector",
    component: "core.radio-selector",
    note: "Cards, com \"Também me afeta\" em cada SM, lista ou kanban. No kanban o colaborador só olha: a etapa anda pelo detalhe.",
    controls: [
      {
        id: "view",
        label: "Visualização",
        options: [
          { value: "cards", label: "Cards" },
          { value: "lista", label: "Lista" },
          { value: "kanban", label: "Kanban" },
        ],
      },
    ],
  },
];

export const MANAGE_CONTROLS: ControlGroup[] = [
  roleControl("Quem abre a URL da gestão. Sem a permissão (um solicitante que recebeu o link), a tela barra e leva às solicitações dele.", [
    { value: "pmo", label: "PMO" },
    { value: "tech", label: "Tech" },
    { value: "solicitante", label: "Sem acesso (solicitante)" },
  ]),
  {
    id: "aba",
    title: "Aba · card_tabs",
    component: "core.card-tabs",
    note: "PMO: Painel executivo e Solicitações. Tech: Solicitações e Painel executivo.",
    controls: [
      {
        id: "aba",
        label: "Aba",
        options: [
          { value: "painel", label: "Painel executivo" },
          { value: "solicitacoes", label: "Solicitações" },
        ],
      },
    ],
  },
  {
    id: "view",
    title: "Solicitações · radio_selector",
    component: "core.radio-selector",
    note: "A mesma base em lista, no kanban do fluxo (uma coluna por etapa) ou em cards, com as pessoas afetadas. A Tech abre no kanban.",
    controls: [
      {
        id: "view",
        label: "Mostrar",
        options: [
          { value: "lista", label: "Lista" },
          { value: "kanban", label: "Kanban" },
          { value: "cards", label: "Cards" },
        ],
      },
    ],
  },
];

export const NEW_CONTROLS: ControlGroup[] = [
  roleControl("Quem abre a página: o solicitante, pelas solicitações dele, ou o PMO, pela gestão, em nome de quem pediu por outro canal.", [
    { value: "solicitante", label: "Solicitante" },
    { value: "pmo", label: "PMO" },
  ]),
];

export const DETAIL_CONTROLS: ControlGroup[] = [
  roleControl("Quem abre a SM. Cada papel vê o que pode fazer na etapa atual.", [
    { value: "pmo", label: "PMO" },
    { value: "solicitante", label: "Solicitante" },
    { value: "tech", label: "Tech" },
  ]),
  {
    id: "aviso",
    title: "Confirmação de envio",
    note: "Logo depois de enviar, o detalhe abre com a confirmação: o protocolo, quem foi avisado e o próximo passo.",
    controls: [
      {
        id: "aviso",
        label: "Confirmação",
        options: [
          { value: "nenhum", label: "Sem confirmação" },
          { value: "enviada", label: "Solicitação enviada" },
        ],
      },
    ],
  },
];

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
