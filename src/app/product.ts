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
/** Componentes do catálogo que a visualização em foco usa. */
const REPORTS_VIEW_COMPONENTS = [
  "layout.patient", "core.card", "core.button", "core.tag", "core.avatar", "core.progress",
  "core.timeline-list", "core.input", "core.toast-wrapper",
];
/** Componentes do catálogo que o compartilhamento com a família usa. */
const REPORTS_SHARE_COMPONENTS = [
  "core.drawer-modal", "core.input", "core.switch-card", "core.label", "core.button", "core.tag",
];
/** Componentes do catálogo que os editores usam. */
const REPORTS_EDITOR_COMPONENTS = [
  "layout.patient", "core.card", "core.button", "core.rich-text", "core.label", "core.modal",
  "core.avatar", "core.toast-wrapper",
];
const REPORTS_UPLOAD_COMPONENTS = [
  "layout.patient", "core.card", "core.button", "core.file-uploader", "core.progress", "core.input", "core.modal",
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
    {
      id: "reports.view-requested",
      title: "Relatório solicitado",
      route: REPORTS_ROUTE,
      fixture: "reports.view-requested",
      persona: "admin",
      intent: "Relatório aberto em modo foco, ainda não iniciado.",
      expected: [
        "Mostra \"Ainda não iniciado\" e o botão \"Iniciar relatório\".",
        "A coordenação pode editar, reatribuir e cancelar a solicitação e adicionar coautor.",
      ],
      components: REPORTS_VIEW_COMPONENTS,
    },
    {
      id: "reports.view-in-progress",
      title: "Relatório em produção",
      route: REPORTS_ROUTE,
      fixture: "reports.view-in-progress",
      persona: "admin",
      intent: "Relatório em produção, com coautor.",
      expected: [
        "A barra de progresso mostra quantas seções estão preenchidas.",
        "\"Continuar edição\" abre o editor; o coautor pode ser removido.",
      ],
      components: REPORTS_VIEW_COMPONENTS,
    },
    {
      id: "reports.view-signing",
      title: "Aguardando assinaturas",
      route: REPORTS_ROUTE,
      fixture: "reports.view-signing",
      persona: "admin",
      intent: "Relatório em atraso aguardando a segunda assinatura.",
      expected: [
        "Aviso de atraso com o prazo original.",
        "A prévia fica bloqueada para edição e o chip mostra \"1 de 2\" assinaturas.",
        "O autor pendente pode assinar ou pedir alteração; a coordenação pode voltar para edição.",
        "A última assinatura finaliza o relatório e gera o PDF.",
      ],
      components: REPORTS_VIEW_COMPONENTS,
    },
    {
      id: "reports.view-signing-prof",
      title: "Aguardando assinaturas, visto pelo profissional",
      route: REPORTS_ROUTE,
      fixture: "reports.view-signing",
      persona: "specialist",
      intent: "O mesmo relatório visto por quem não coordena.",
      expected: ["Sem as ações de coordenação; o profissional só lê o documento e assina a própria parte."],
      components: REPORTS_VIEW_COMPONENTS,
    },
    {
      id: "reports.view-final",
      title: "Relatório emitido",
      route: REPORTS_ROUTE,
      fixture: "reports.view-final",
      persona: "admin",
      intent: "Relatório finalizado, com o documento e o compartilhamento.",
      expected: [
        "Mostra a folha em PDF com as duas assinaturas.",
        "Painel de compartilhamento com a família; \"Baixar PDF\" e \"Reabrir relatório\".",
      ],
      components: [...REPORTS_VIEW_COMPONENTS, ...REPORTS_SHARE_COMPONENTS],
    },
    {
      id: "reports.view-cancelled",
      title: "Solicitação cancelada",
      route: REPORTS_ROUTE,
      fixture: "reports.view-cancelled",
      persona: "admin",
      intent: "Solicitação cancelada aberta em modo foco.",
      expected: ["Aviso com o motivo do cancelamento, sem documento, e a ação \"Reabrir solicitação\"."],
      components: REPORTS_VIEW_COMPONENTS,
    },
    {
      id: "reports.edit-request",
      title: "Editar solicitação",
      route: REPORTS_ROUTE,
      fixture: "reports.edit-request",
      persona: "admin",
      intent: "Edição dos dados da solicitação em drawer.",
      expected: [
        "O paciente fica travado; o prazo atual aparece junto do campo de novo prazo.",
        "Trocar o tipo quando já há conteúdo pede confirmação; salvar registra no histórico.",
      ],
      components: [...REPORTS_VIEW_COMPONENTS, "core.drawer-modal", "core.fake-input", "core.range-datepicker", "core.file-uploader"],
    },
    {
      id: "reports.share-new",
      title: "Compartilhar com a família",
      route: REPORTS_ROUTE,
      fixture: "reports.share-new",
      persona: "admin",
      intent: "Primeiro compartilhamento de um relatório emitido.",
      expected: [
        "Os responsáveis vêm marcados; \"Compartilhar\" desabilita sem nenhum marcado.",
        "Ao confirmar, o histórico registra o compartilhamento e a coluna Família passa a \"Não lido\".",
      ],
      components: [...REPORTS_LIST_COMPONENTS, ...REPORTS_SHARE_COMPONENTS],
    },
    {
      id: "reports.share-edit",
      title: "Editar compartilhamento",
      route: REPORTS_ROUTE,
      fixture: "reports.share-edit",
      persona: "admin",
      intent: "Ajustar destinatários e mensagem de um compartilhamento ativo.",
      expected: ["Quem já leu mantém a leitura; o histórico registra \"Compartilhamento atualizado\"."],
      components: [...REPORTS_LIST_COMPONENTS, ...REPORTS_SHARE_COMPONENTS],
    },
    {
      id: "reports.share-partial",
      title: "Relatório lido em parte",
      route: REPORTS_ROUTE,
      fixture: "reports.share-partial",
      persona: "admin",
      intent: "Painel de compartilhamento com leitura parcial.",
      expected: [
        "Selo \"Lido em parte 1/2\"; quem não abriu tem a ação \"Lembrar\".",
        "\"Revogar acesso\" leva o painel ao estado revogado, com \"Compartilhar\" de novo.",
      ],
      components: [...REPORTS_VIEW_COMPONENTS, ...REPORTS_SHARE_COMPONENTS],
    },
    {
      id: "reports.share-revoked",
      title: "Acesso revogado",
      route: REPORTS_ROUTE,
      fixture: "reports.share-revoked",
      persona: "admin",
      intent: "Painel depois da revogação do acesso da família.",
      expected: ["Mostra quando e por quem o acesso foi revogado e oferece compartilhar de novo."],
      components: [...REPORTS_VIEW_COMPONENTS, ...REPORTS_SHARE_COMPONENTS],
    },
    {
      id: "reports.fill-model-new",
      title: "Iniciar relatório de modelo interno",
      route: REPORTS_ROUTE,
      fixture: "reports.fill-model-new",
      persona: "admin",
      intent: "Alta / Desligamento solicitado, aberto no editor.",
      expected: [
        "Abrir o editor passa o relatório para Em produção e registra no histórico.",
        "Mostra 0 de 3 seções e a ação Assinar e finalizar.",
      ],
      components: REPORTS_EDITOR_COMPONENTS,
    },
    {
      id: "reports.fill-model",
      title: "Continuar relatório de modelo interno",
      route: REPORTS_ROUTE,
      fixture: "reports.fill-model",
      persona: "admin",
      intent: "Rascunho com coautor.",
      expected: [
        "Mostra 1 de 3 seções e quando o rascunho foi salvo.",
        "Editar mostra Alterações não salvas; Voltar pergunta Sair sem salvar?",
        "Com coautor, a ação final é Enviar para assinaturas.",
      ],
      components: REPORTS_EDITOR_COMPONENTS,
    },
    {
      id: "reports.fill-images",
      title: "Relatório com gráficos",
      route: REPORTS_ROUTE,
      fixture: "reports.fill-images",
      persona: "admin",
      intent: "Evolução Mensal com campos de imagem.",
      expected: [
        "Cada gráfico tem legenda e largura Inteira ou Metade.",
        "Campo extra com título editável; Adicionar campo de imagem cria outro.",
      ],
      components: [...REPORTS_EDITOR_COMPONENTS, "core.file-uploader", "core.input"],
    },
    {
      id: "reports.fill-protocol",
      title: "Iniciar relatório de protocolo",
      route: REPORTS_ROUTE,
      fixture: "reports.fill-protocol",
      persona: "admin",
      intent: "Relatório a partir da aplicação VB-MAPP do paciente.",
      expected: [
        "Mostra 43% (73 de 170), a grade de marcos, as barras por nível e a tabela de domínios.",
        "Finalizar relatório fica desabilitado até alguma seção ter texto.",
      ],
      components: [...REPORTS_EDITOR_COMPONENTS, "core.table"],
    },
    {
      id: "reports.fill-protocol-draft",
      title: "Relatório de protocolo em produção",
      route: REPORTS_ROUTE,
      fixture: "reports.fill-protocol-draft",
      persona: "admin",
      intent: "Rascunho de protocolo com coautor.",
      expected: [
        "Mostra 2 de 6 seções.",
        "Gerar todo o relatório preenche as seis seções; a ação final é Enviar para assinaturas.",
      ],
      components: [...REPORTS_EDITOR_COMPONENTS, "core.table"],
    },
    {
      id: "reports.upload-empty",
      title: "Anexar PDF externo",
      route: REPORTS_ROUTE,
      fixture: "reports.upload-empty",
      persona: "admin",
      intent: "Relatório externo ainda sem documento.",
      expected: [
        "Explica que o documento é produzido fora do sistema.",
        "Mostra o progresso do envio; Finalizar relatório fica desabilitado sem arquivo.",
      ],
      components: REPORTS_UPLOAD_COMPONENTS,
    },
    {
      id: "reports.upload-ready",
      title: "PDF externo anexado",
      route: REPORTS_ROUTE,
      fixture: "reports.upload-ready",
      persona: "admin",
      intent: "Relatório externo com o PDF já anexado.",
      expected: [
        "O arquivo aparece na lista; Finalizar relatório conclui e volta para o relatório.",
      ],
      components: REPORTS_UPLOAD_COMPONENTS,
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
