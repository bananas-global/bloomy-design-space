/**
 * Mapa da Unidade — a rota e os controles da tela.
 *
 * O `type` e o `professional_view` são o `options_form` do `UnitMapLive.Show`:
 * a UI troca os dois pelo controle (`context.setControls`), como o
 * `phx-change="filter"` troca o componente da tabela. `specialties` e
 * `overlay` só semeiam o estado inicial da visão.
 */
import { useState } from "react";
import type { ControlGroup } from "@brucesantos/design-space";
import type { FormField } from "../../components/Input.js";

export const FLOW = "Mapa da Unidade";

export const PATH = "/backoffice/mapa-da-unidade";

export type MapType = "panorama" | "patient" | "professional" | "room" | "unit";
export type MapPeriod = "week" | "day";

export const UNIT_MAP_CONTROLS: ControlGroup[] = [
  {
    id: "type",
    title: "Visão · radio_selector",
    component: "core.radio-selector",
    note: "Os ícones à direita do cabeçalho: panorama de vagas (novo), paciente, profissional, sala e unidade.",
    controls: [
      {
        id: "type",
        label: "Visão",
        default: "unit",
        options: [
          { value: "unit", label: "Unidade (mapa de calor)" },
          { value: "panorama", label: "Panorama de vagas" },
          { value: "patient", label: "Paciente" },
          { value: "professional", label: "Profissional" },
          { value: "room", label: "Sala" },
        ],
      },
    ],
  },
  {
    id: "professional_view",
    title: "Período · radio_selector",
    component: "core.radio-selector",
    note: "Semana ou dia. Só aparece em Profissional e Sala; nas outras visões o seletor fica escondido, guardando o lugar.",
    controls: [
      {
        id: "professional_view",
        label: "Período",
        default: "day",
        options: [
          { value: "day", label: "Dia" },
          { value: "week", label: "Semana" },
        ],
      },
    ],
  },
  {
    id: "specialties",
    title: "Especialidades escolhidas",
    note: "Os cartões de especialidade da visão Unidade, que abrem todos escolhidos. Sem nenhum, a grade mostra \"Nenhum dado encontrado para a pesquisa\" e os cartões, \"? horas livres\".",
    controls: [
      {
        id: "specialties",
        label: "Escolhidas",
        default: "all",
        options: [
          { value: "all", label: "Todas" },
          { value: "psychology", label: "Psicologia" },
          { value: "none", label: "Nenhuma" },
        ],
      },
    ],
  },
  {
    id: "panorama_version",
    title: "Versão do Panorama de vagas",
    note: "Visual: números em destaque e gráficos (falta × sobra, como a demanda é atendida e o mapa de calor da semana). Simplificada: a resposta em texto e uma tabela. Anterior: a do protótipo do Claude Design. As três usam as mesmas contas.",
    controls: [
      {
        id: "panorama_version",
        label: "Versão",
        default: "visual",
        options: [
          { value: "visual", label: "Visual (gráficos)" },
          { value: "simple", label: "Simplificada (tabela)" },
          { value: "v1", label: "Anterior (protótipo)" },
        ],
      },
    ],
  },
  {
    id: "overlay",
    title: "Modal aberto · modal",
    component: "core.modal",
    note: "Disponibilidade abre na visão Unidade (quinta, 10:00, com as especialidades escolhidas). Agendamento incompleto abre na visão Paciente, no de Sofia Carvalho na segunda às 16:00.",
    controls: [
      {
        id: "overlay",
        label: "Aberto",
        options: [
          { value: "none", label: "Nenhum" },
          { value: "availability", label: "Disponibilidade" },
          { value: "edit-incomplete", label: "Editar Agendamento Incompleto" },
        ],
      },
    ],
  },
];

/**
 * A linha de filtros das grades semanais (Paciente e Profissional): a mesma
 * nas duas, para a grade começar na mesma altura ao trocar de visão. Quebra em
 * mais linhas quando não cabe.
 */
export const WEEK_FILTER_ROW = "flex flex-wrap items-end gap-4 pb-8";

/** O `@filter_form[:campo]` de um componente: `filters[campo]`. */
export const field = (name: string, value: unknown, form = "filters"): FormField => ({
  id: `${form}_${name}`,
  name: `${form}[${name}]`,
  value,
});

/** O `filter_form` de um componente, com um `set` por campo. */
export function useFilterForm<T extends Record<string, unknown>>(initial: T | (() => T)) {
  const [form, setForm] = useState<T>(initial);
  const set = <K extends keyof T>(key: K, value: T[K]) => setForm((f) => ({ ...f, [key]: value }));
  return [form, set] as const;
}
