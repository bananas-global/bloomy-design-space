/**
 * Mapa de Salas — a rota e os controles da tela.
 *
 * Os controles (`ControlGroup`, painel Variações do motor) montam os dados
 * sintéticos da aba; quando a própria UI muda o que um controle representa
 * (trocar o dia, a vigência, abrir ou fechar uma gaveta), o controle acompanha
 * por `context.setControls`.
 *
 * `useControlledState` é o mesmo de `documentos-unidade/flow.ts` e de
 * `relatorios/flow.ts` (PRs abertos): o estado nasce dos controles, é
 * re-semeado quando um controle muda de fora e sincroniza o controle quando
 * muda pela UI. Quando estiverem na `main`, pode ir para um lugar
 * compartilhado.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ControlGroup, ScenarioContext } from "@brucesantos/design-space";

export type Controls = Record<string, string>;

/** A rota aceita qualquer `:id`; a unidade exibida vem do controle "Unidade". */
export const UNIT_ID = "u1";

export const FLOW = "Mapa de Salas";

export const PATH = "/backoffice/unidades/:id/salas";

export const roomsMapPath = (unitId = UNIT_ID) => `/backoffice/unidades/${unitId}/salas`;

export const ROOMS_MAP_CONTROLS: ControlGroup[] = [
  {
    id: "unit",
    title: "Unidade",
    note: "O seletor de unidade do protótipo. A Unidade Teste tem onze salas em três áreas; Santana, três salas.",
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
    id: "sub",
    title: "Sub-aba · button_tabs",
    component: "core.button-tabs",
    note: "Os button_tabs da aba Salas: o mapa ou os bloqueios de sala.",
    controls: [
      {
        id: "sub",
        label: "Sub-aba",
        options: [
          { value: "rooms", label: "Salas" },
          { value: "blockings", label: "Bloqueios" },
        ],
      },
    ],
  },
  {
    id: "vigencia",
    title: "Vigência do planejamento",
    note: "Hoje é 30/07/2026. Em vigência: edições viram rascunho até publicar. Futura: grava direto. Encerrada: só leitura.",
    controls: [
      {
        id: "vigencia",
        label: "Vigência",
        options: [
          { value: "v1", label: "06/05/2026 – 30/11/2026 (em vigência)" },
          { value: "v2", label: "01/12/2026 – 30/06/2027 (futura)" },
          { value: "v0", label: "05/01/2026 – 05/05/2026 (encerrada)" },
        ],
      },
    ],
  },
  {
    id: "day",
    title: "Dia da semana · radio_selector",
    component: "core.radio-selector",
    note: "O dia que o mapa mostra. Na vigência em curso, a semana é a de hoje; nas outras, a primeira semana da vigência.",
    controls: [
      {
        id: "day",
        label: "Dia",
        default: "thursday",
        options: [
          { value: "monday", label: "Segunda" },
          { value: "tuesday", label: "Terça" },
          { value: "wednesday", label: "Quarta" },
          { value: "thursday", label: "Quinta (hoje)" },
          { value: "friday", label: "Sexta" },
        ],
      },
    ],
  },
  {
    id: "focus",
    title: "Filtro de status",
    note: "Os contadores ao lado da busca: clicar num deles mostra só os pontos com aquele status.",
    controls: [
      {
        id: "focus",
        label: "Mostrar",
        options: [
          { value: "all", label: "Tudo" },
          { value: "ok", label: "Com plano e profissional" },
          { value: "open", label: "Só com plano (sem profissional)" },
          { value: "extra", label: "Só com profissional (sem plano)" },
          { value: "noplan", label: "Sem plano e sem profissional" },
          { value: "divergent", label: "Com conflito" },
          { value: "temp", label: "Temporário" },
        ],
      },
    ],
  },
  {
    id: "draft",
    title: "Rascunho da vigência em curso",
    note: "Com rascunho: uma alocação ainda não publicada (Unidade Teste: Fábio na Sala Lilás·B à tarde) e a barra Descartar / Publicar no pé da página.",
    controls: [
      {
        id: "draft",
        label: "Rascunho",
        options: [
          { value: "none", label: "Sem alterações" },
          { value: "with", label: "Com alteração não publicada" },
        ],
      },
    ],
  },
  {
    id: "blockings",
    title: "Bloqueios de sala · table",
    component: "core.table",
    note: "Sem bloqueios: \"Não existe nenhum bloqueio de sala\".",
    controls: [
      {
        id: "blockings",
        label: "Bloqueios",
        options: [
          { value: "data", label: "Com bloqueios" },
          { value: "empty", label: "Sem bloqueios" },
        ],
      },
    ],
  },
  {
    id: "overlay",
    title: "Sobreposição aberta · drawer_modal",
    component: "core.drawer-modal",
    note: "Editar sala abre a primeira sala. Definir padrão abre no primeiro ponto sem plano; Alocar, no primeiro trecho a cobrir do dia; Editar alocação, na primeira alocação. Publicar abre com o rascunho. Em Santana não há ponto sem plano, trecho a cobrir na quinta nem bloqueio.",
    controls: [
      {
        id: "overlay",
        label: "Aberta",
        options: [
          { value: "none", label: "Nenhuma" },
          { value: "room-new", label: "Nova sala" },
          { value: "room-edit", label: "Editar sala" },
          { value: "plan", label: "Definir padrão do ponto" },
          { value: "gap", label: "Alocar no trecho a cobrir" },
          { value: "card", label: "Editar alocação" },
          { value: "version", label: "Nova vigência" },
          { value: "publish", label: "Publicar rascunho" },
          { value: "blocking", label: "Novo bloqueio" },
          { value: "blocking-info", label: "Detalhes do bloqueio" },
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
