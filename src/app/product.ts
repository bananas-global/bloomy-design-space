import type { ProductDefinition } from "@brucesantos/design-space";

import { COMPONENT_PREVIEWS } from "../catalog/components.js";
import { LAYOUT_PREVIEWS } from "../catalog/layouts.js";
import { personas } from "../personas/index.js";
import { PatientReports } from "../screens/PatientReports.js";
import { REPORTS_FIXTURES } from "../screens/relatorios/fixtures.js";

const REPORTS_ROUTE = "/backoffice/pacientes/pt1/relatorios";

/** Componentes do catálogo que a aba Relatórios (lista v2) usa. */
const REPORTS_LIST_COMPONENTS = [
  "layout.backoffice", "layout.patient", "core.lazy-tabs", "core.header", "core.button", "core.input",
  "core.multi-select", "core.custom-select", "core.table", "core.tag", "core.avatar", "core.tooltip",
  "core.dropdown-menu", "core.empty-state-card", "core.meta-info", "core.pagination", "core.toast-wrapper",
];
const REPORTS_FORM_COMPONENTS = [
  "core.drawer-modal", "core.modal", "core.fake-input", "core.radio-cards", "core.radio-selector",
  "core.range-datepicker", "core.file-uploader",
];

/**
 * O Bloomy Design Space é a biblioteca de componentes e layouts do Bloomy,
 * espelhados do monólito Phoenix.
 *
 * Telas de feature não moram aqui de forma permanente: entram num PR enquanto a
 * feature está em desenho, registradas em `scenarios` e `routes`, e saem depois
 * de implementadas.
 */
export const productDefinition: ProductDefinition = {
  id: "bloomy",
  name: "Bloomy",
  tagline: "Componentes e layouts do Bloomy, espelhados do sistema real.",

  scenarios: [
    {
      id: "reports.list",
      title: "Lista com previstos, pendentes e emitidos",
      route: REPORTS_ROUTE,
      fixture: "reports.lucas",
      persona: "admin",
      intent: "A lista única da aba: previstos pela rotina, solicitações em andamento e relatórios emitidos numa só tabela.",
      expected: [
        "Mostra atrasados primeiro, depois pendentes por prazo e emitidos do mais recente ao mais antigo.",
        "Cancelados ficam fora da lista até o filtro de Status pedir por eles.",
        "Linha atrasada tem a borda vermelha à esquerda e o prazo em vermelho.",
        "Previsto pela rotina tem o botão + que cria a solicitação na hora.",
        "Clicar numa linha de solicitação ou emitido abre o relatório em página cheia.",
        "Emitido com mais de uma ação mostra o menu ⋮ (baixar, compartilhar, reenviar, cancelar compartilhamento).",
      ],
      components: REPORTS_LIST_COMPONENTS,
    },
    {
      id: "reports.list-late",
      title: "Filtro Em atraso",
      route: REPORTS_ROUTE,
      fixture: "reports.lucas-late",
      persona: "admin",
      intent: "O Status com a condição \"Em atraso\": só o que passou do prazo.",
      expected: [
        "Status mostra EM ATRASO e a lista traz os 3 atrasados (aguardando assinatura, solicitado e previsto).",
        "Aparece \"Limpar filtros\" e a contagem \"3 relatórios\".",
      ],
      components: REPORTS_LIST_COMPONENTS,
    },
    {
      id: "reports.list-no-match",
      title: "Filtros sem resultado",
      route: REPORTS_ROUTE,
      fixture: "reports.lucas-no-match",
      persona: "admin",
      intent: "A busca não encontra nada.",
      expected: ["Mostra \"Nenhum relatório com esses filtros\" e a orientação de limpar os filtros."],
      components: REPORTS_LIST_COMPONENTS,
    },
    {
      id: "reports.list-empty",
      title: "Paciente sem relatórios",
      route: REPORTS_ROUTE,
      fixture: "reports.empty",
      persona: "admin",
      intent: "Nenhuma solicitação e nenhuma regra de rotina.",
      expected: ["Mostra \"Nenhum relatório para Lucas\" com a orientação de solicitar ou configurar a rotina."],
      components: REPORTS_LIST_COMPONENTS,
    },
    {
      id: "reports.list-professional",
      title: "Visto pelo profissional responsável",
      route: REPORTS_ROUTE,
      fixture: "reports.lucas",
      persona: "supervisor",
      intent: "A mesma lista na perspectiva do profissional (Helena Martins Costa): o menu do backoffice é o do supervisor.",
      expected: ["A lista é a mesma da coordenação; a diferença de perspectiva aparece ao abrir o relatório."],
      components: REPORTS_LIST_COMPONENTS,
    },
    {
      id: "reports.new-request",
      title: "Nova solicitação",
      route: REPORTS_ROUTE,
      fixture: "reports.new-request",
      persona: "admin",
      intent: "A gaveta de solicitar relatório a partir do prontuário, com o paciente travado.",
      expected: [
        "Criar solicitação fica desabilitado até tipo, solicitante e responsável (ou \"sem responsável\") estarem preenchidos.",
        "O tipo escolhido mostra o aviso de como o relatório será produzido; \"Outro\" pede o nome; Protocolo pede a aplicação finalizada.",
        "Ao criar, a solicitação entra na lista como Solicitado e aparece o toast de sucesso.",
      ],
      components: [...REPORTS_LIST_COMPONENTS, ...REPORTS_FORM_COMPONENTS],
    },
    {
      id: "reports.routine",
      title: "Rotina de relatórios",
      route: REPORTS_ROUTE,
      fixture: "reports.routine",
      persona: "admin",
      intent: "Regras herdadas da operadora (só pausar) e regras próprias do paciente.",
      expected: [
        "Pausar pede um motivo de ao menos 3 letras; a regra pausada some dos previstos da lista.",
        "Adicionar ou editar regra troca a gaveta pelo formulário, com a prévia do próximo período.",
        "Remover uma regra própria tira os previstos dela da lista.",
      ],
      components: [...REPORTS_LIST_COMPONENTS, ...REPORTS_FORM_COMPONENTS],
    },
    {
      id: "reports.reassign",
      title: "Reatribuir profissional",
      route: REPORTS_ROUTE,
      fixture: "reports.reassign",
      persona: "admin",
      intent: "Troca o responsável de uma solicitação (aberto a partir do relatório).",
      expected: ["Reatribuir só habilita com outro profissional escolhido; o histórico registra a troca."],
      components: [...REPORTS_LIST_COMPONENTS, "core.modal", "core.custom-select"],
    },
    {
      id: "reports.cancel",
      title: "Cancelar solicitação",
      route: REPORTS_ROUTE,
      fixture: "reports.cancel",
      persona: "admin",
      intent: "Cancelamento com motivo obrigatório (aberto a partir do relatório).",
      expected: ["Cancelar só habilita com motivo; a solicitação sai da lista padrão e fica no filtro Cancelado."],
      components: [...REPORTS_LIST_COMPONENTS, "core.modal"],
    },
  ],
  personas,
  fixtures: [...REPORTS_FIXTURES],
  routes: [
    {
      path: "/backoffice/pacientes/:id/relatorios",
      name: "Relatórios do paciente",
      description: "Aba Relatórios do paciente (v2): previstos pela rotina, solicitações e emitidos numa só lista.",
      screen: PatientReports,
    },
  ],
  components: [...LAYOUT_PREVIEWS, ...COMPONENT_PREVIEWS],

  deploy: {
    env: import.meta.env.VITE_DEPLOY_ENV,
    branch: import.meta.env.VITE_DEPLOY_BRANCH,
    commit: import.meta.env.VITE_DEPLOY_COMMIT,
  },

  theme: { locales: ["pt-BR"] },
  dataSources: { default: "fixtures" },
};
