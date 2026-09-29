/**
 * Relatórios do paciente — o que a sessão mudou, compartilhado entre as telas.
 *
 * Cada tela monta os dados a partir dos próprios controles. O que a pessoa faz
 * numa tela (criar uma solicitação, salvar o rascunho, assinar) fica aqui, para
 * a tela seguinte do fluxo mostrar o mesmo relatório quando a combinação de
 * controles for a dele. Vive só em memória: recarregar a página zera.
 */
import type { Controls } from "./flow.js";
import type { Report } from "./model.js";

const touched = new Map<string, Report>();
let seq = 0;
let lastList: Controls | undefined;

export const session = {
  /** Versão do relatório mudada nesta sessão, se houver. */
  report: (id: string) => touched.get(id),
  /** Todos os relatórios mudados ou criados nesta sessão. */
  reports: () => [...touched.values()],
  save: (r: Report) => void touched.set(r.id, r),
  /** Id de uma solicitação nova, único na sessão. */
  nextId: () => `r-novo-${++seq}`,
  /** Controles da lista na última visita (para "Voltar" devolver a lista como estava). */
  listControls: () => lastList,
  rememberList: (controls: Controls) => void (lastList = controls),
};
