/**
 * Relatórios do paciente — o fluxo de telas e os controles de cada uma.
 *
 * Cada tela tem uma rota e um conjunto de controles (`ControlGroup`, painel
 * Variações do motor). A tela monta os próprios dados sintéticos a partir dos
 * controles; a UI do produto devolve ao controle o que muda nela (abrir ou
 * fechar uma gaveta, assinar, compartilhar) com `context.setControl`.
 *
 * `useControlledState` é a ponte: o estado da tela nasce dos controles, é
 * re-semeado quando um controle muda de fora (painel, atalho) e, quando a
 * própria UI muda o que um controle representa, sincroniza o controle.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ControlGroup, ScenarioContext } from "@brucesantos/design-space";

export type Controls = Record<string, string>;

/** Paciente único do porte (Lucas). A rota aceita qualquer `:id`, os dados são sempre dele. */
export const PATIENT_ID = "pt1";

export const FLOW = "Relatórios do paciente";

export const PATHS = {
  list: "/backoffice/pacientes/:id/relatorios",
  report: "/backoffice/pacientes/:id/relatorios/:reportId",
  fill: "/backoffice/pacientes/:id/relatorios/:reportId/preencher",
  protocol: "/backoffice/pacientes/:id/relatorios/:reportId/protocolo",
  upload: "/backoffice/pacientes/:id/relatorios/:reportId/anexar",
} as const;

export const listPath = (patientId = PATIENT_ID) => `/backoffice/pacientes/${patientId}/relatorios`;
export const reportPath = (reportId: string, patientId = PATIENT_ID) => `${listPath(patientId)}/${reportId}`;

/* ============================================================
   Controles por tela
   ============================================================ */

export const LIST_CONTROLS: ControlGroup[] = [
  {
    id: "table",
    title: "Tabela de relatórios · table",
    component: "core.table",
    note: "Previstos pela rotina, solicitações e emitidos do Lucas numa só lista.",
    controls: [
      {
        id: "rows",
        label: "Conteúdo",
        options: [
          { value: "data", label: "Com dados" },
          { value: "empty", label: "Vazia" },
          { value: "no-match", label: "Sem resultado na busca" },
        ],
      },
    ],
  },
  {
    id: "due",
    title: "Prazos",
    note: "Com atrasos: a evolução de junho (aguardando assinatura), o protocolo VB-MAPP (solicitado) e um previsto da rotina passaram do prazo.",
    controls: [
      {
        id: "late",
        label: "Atrasos",
        default: "late",
        options: [
          { value: "none", label: "Sem atrasos" },
          { value: "late", label: "Com atrasos" },
        ],
      },
    ],
  },
  {
    id: "filters",
    title: "Filtros · multi_select",
    component: "core.multi-select",
    note: "O filtro de Status. Outros filtros mudam só na tela.",
    controls: [
      {
        id: "filter",
        label: "Status",
        options: [
          { value: "none", label: "Nenhum" },
          { value: "late", label: "Em atraso" },
        ],
      },
    ],
  },
  {
    id: "overlay",
    title: "Sobreposição aberta · drawer_modal",
    component: "core.drawer-modal",
    note: "Compartilhar abre para a avaliação de fonoaudiologia, emitida e ainda não compartilhada.",
    controls: [
      {
        id: "overlay",
        label: "Aberta",
        options: [
          { value: "none", label: "Nenhuma" },
          { value: "new", label: "Nova solicitação" },
          { value: "routine", label: "Rotina de relatórios" },
          { value: "share", label: "Compartilhar" },
        ],
      },
    ],
  },
];

export const REPORT_CONTROLS: ControlGroup[] = [
  {
    id: "status",
    title: "Status do relatório · tag",
    component: "core.tag",
    note: "O relatório da URL passa ao status escolhido; o histórico acompanha.",
    controls: [
      {
        id: "status",
        label: "Status",
        options: [
          { value: "solicitado", label: "Solicitado" },
          { value: "em_andamento", label: "Em produção" },
          { value: "assinaturas", label: "Aguardando assinatura" },
          { value: "finalizado", label: "Emitido" },
          { value: "cancelado", label: "Cancelado" },
        ],
      },
    ],
  },
  {
    id: "signatures",
    title: "Assinaturas (em Aguardando assinatura)",
    component: "core.avatar",
    note: "Vale em Aguardando assinatura, com responsável e coautor. A última assinatura emite o relatório: Emitido mostra sempre Todas, e Todas em Aguardando assinatura volta a 1 de 2.",
    controls: [
      {
        id: "signatures",
        label: "Assinadas",
        default: "1",
        description: "Só muda a tela em Aguardando assinatura; em Emitido acompanha o relatório (Todas).",
        options: [
          { value: "0", label: "0 de 2" },
          { value: "1", label: "1 de 2" },
          { value: "all", label: "Todas (Emitido)" },
        ],
      },
    ],
  },
  {
    id: "share",
    title: "Compartilhamento com a família (em Emitido)",
    note: "Só em Emitido; nos outros status não muda a tela. Lido em parte: mãe e pai receberam, só a mãe abriu.",
    controls: [
      {
        id: "share",
        label: "Família",
        description: "Só muda a tela em Emitido.",
        options: [
          { value: "none", label: "Não compartilhado" },
          { value: "pending", label: "Não lido" },
          { value: "partial", label: "Lido em parte" },
          { value: "viewed", label: "Lido" },
          { value: "revoked", label: "Revogado" },
        ],
      },
    ],
  },
  {
    id: "overlay",
    title: "Sobreposição aberta · drawer_modal / modal",
    component: "core.drawer-modal",
    note: "Editar, reatribuir e cancelar só abrem para a coordenação em Solicitado e Em produção; compartilhar, em Emitido. Fora disso a escolha volta a Nenhuma.",
    controls: [
      {
        id: "overlay",
        label: "Aberta",
        description: "Fora do status indicado na opção, a sobreposição não abre e o controle volta a Nenhuma.",
        options: [
          { value: "none", label: "Nenhuma" },
          { value: "edit", label: "Editar solicitação (Solicitado, Em produção)" },
          { value: "share", label: "Compartilhar (Emitido)" },
          { value: "reassign", label: "Reatribuir profissional (Solicitado, Em produção)" },
          { value: "cancel", label: "Cancelar solicitação (Solicitado, Em produção)" },
        ],
      },
    ],
  },
];

const draftGroup = (note: string, progressLabel: string): ControlGroup => ({
  id: "draft",
  title: "Rascunho · rich_text",
  component: "core.rich-text",
  note,
  controls: [
    {
      id: "draft",
      label: "Rascunho",
      options: [
        { value: "new", label: "Novo" },
        { value: "progress", label: progressLabel },
      ],
    },
  ],
});

const authorsGroup: ControlGroup = {
  id: "authors",
  title: "Autores",
  component: "core.avatar",
  note: "Só o responsável: a ação final é Assinar e finalizar. Com coautor: Enviar para assinaturas.",
  controls: [
    {
      id: "coauthor",
      label: "Coautor",
      options: [
        { value: "none", label: "Só o responsável" },
        { value: "with", label: "Com coautor" },
      ],
    },
  ],
};

export const FILL_CONTROLS: ControlGroup[] = [
  draftGroup("Novo: o relatório solicitado abre no editor e passa a Em produção. Em produção: rascunho salvo com a primeira seção escrita.", "Em produção"),
  authorsGroup,
  {
    id: "images",
    title: "Gráficos · file_uploader (Evolução, Trimestral, Avaliação)",
    component: "core.file-uploader",
    note: "Só em modelos com campo de imagem (Evolução Mensal, Trimestral, Avaliação). Nos outros (Admissão, Alta) o controle volta a Sem gráficos.",
    controls: [
      {
        id: "images",
        label: "Gráficos",
        description: "Admissão e Alta não têm campo de imagem.",
        options: [
          { value: "none", label: "Sem gráficos" },
          { value: "with", label: "Com gráfico e campo extra" },
        ],
      },
    ],
  },
];

export const PROTOCOL_CONTROLS: ControlGroup[] = [
  draftGroup("Novo: 0 de 6 seções e Finalizar desabilitado. Em produção: 2 de 6 seções redigidas.", "Em produção"),
  authorsGroup,
];

export const UPLOAD_CONTROLS: ControlGroup[] = [
  {
    id: "file",
    title: "PDF final · file_uploader",
    component: "core.file-uploader",
    note: "Relatório Externo ou Outro: o documento é produzido fora do sistema e anexado aqui.",
    controls: [
      {
        id: "file",
        label: "Documento",
        options: [
          { value: "none", label: "Sem arquivo" },
          { value: "attached", label: "PDF anexado" },
        ],
      },
    ],
  },
];

export const defaultsOf = (groups: ControlGroup[]): Controls =>
  Object.fromEntries(groups.flatMap((g) => g.controls.map((c) => [c.id, c.default ?? c.options[0]!.value])));

const validIn = (groups: ControlGroup[], id: string, value: string) =>
  groups.some((g) => g.controls.some((c) => c.id === id && c.options.some((o) => o.value === value)));

/* ============================================================
   Navegação entre as telas do fluxo
   ============================================================ */

/**
 * Endereço de outra tela do fluxo com os controles dela.
 *
 * `context.navigate` com query própria substitui a query inteira, então a
 * persona, a rede e a viewport do contexto vão junto; os controles iguais ao
 * padrão ficam fora da URL, como o motor faz.
 */
/**
 * Navega para outra tela do fluxo levando os controles que valem nela. O motor
 * preserva persona, rede e viewport e deixa fora da URL o que for padrão.
 */
export function flowNavigate(context: ScenarioContext, path: string, groups: ControlGroup[], controls: Controls): void {
  const valid = Object.fromEntries(Object.entries(controls).filter(([id, value]) => validIn(groups, id, value)));
  context.navigate(path, { controls: valid });
}

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

/**
 * Estado local da tela, nascido de `context.controls`.
 *
 * - Controle mudado de fora (o valor novo não é o que o estado representa):
 *   re-semeia com a combinação nova.
 * - Estado mudado pela UI: os controles correspondentes são atualizados de uma
 *   vez por `setControls`.
 */
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

  const setState = useCallback((next: S) => setHeld((h) => ({ ...h, state: next })), []);
  return [current.state, setState] as const;
}
