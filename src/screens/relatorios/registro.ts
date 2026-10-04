import type { Feature } from "../../app/features.js";
import {
  PatientReport,
  PatientReportFill,
  PatientReportProtocol,
  PatientReportUpload,
  PatientReportsList,
} from "../PatientReports.js";
import { REPORTS_FIXTURES } from "./fixtures.js";
import {
  FILL_CONTROLS,
  FLOW,
  LIST_CONTROLS,
  PATHS, PATIENT_ID,
  PROTOCOL_CONTROLS,
  REPORT_CONTROLS,
  UPLOAD_CONTROLS,
  listPath,
  reportPath,
} from "./flow.js";

/** Componentes do catálogo que a lista usa. */
const REPORTS_LIST_COMPONENTS = [
  "layout.backoffice", "layout.patient", "core.lazy-tabs", "core.header", "core.button", "core.input",
  "core.multi-select", "core.custom-select", "core.table", "core.tag", "core.avatar", "core.tooltip",
  "core.dropdown-menu", "core.empty-state-card", "core.meta-info", "core.pagination", "core.toast-wrapper",
  "core.drawer-modal", "core.modal", "core.fake-input", "core.radio-cards", "core.radio-selector",
  "core.range-datepicker", "core.file-uploader", "core.switch-card", "core.label",
];
/** Componentes do catálogo que o relatório em modo foco usa. */
const REPORTS_VIEW_COMPONENTS = [
  "core.card", "core.button", "core.tag", "core.avatar", "core.progress", "core.timeline-list", "core.input",
  "core.toast-wrapper", "core.drawer-modal", "core.modal", "core.switch-card", "core.label", "core.fake-input",
  "core.custom-select", "core.range-datepicker", "core.file-uploader",
];
/** Componentes do catálogo que os editores usam. */
const REPORTS_EDITOR_COMPONENTS = [
  "core.card", "core.button", "core.rich-text", "core.label", "core.modal", "core.avatar", "core.toast-wrapper",
];

const FILL = (id: string) => `${reportPath(id)}/preencher`;
const PROTOCOL = (id: string) => `${reportPath(id)}/protocolo`;
const UPLOAD = (id: string) => `${reportPath(id)}/anexar`;

/** Relatórios do paciente: rotas, cenários e fixtures do fluxo. */
export const feature: Feature = {
  // Atalhos do fluxo Relatórios do paciente: combinações de controles que
  // valem um link direto no PR. O resto se monta no painel Variações.
  scenarios: [
    {
      id: "reports.list",
      title: "Lista com previstos, pendentes e emitidos",
      route: listPath(),
      fixture: "reports.lucas",
      persona: "admin",
      intent: "A lista única da aba: previstos pela rotina, solicitações em andamento e relatórios emitidos numa só tabela.",
      expected: [
        "3 em atraso no topo (aguardando assinatura, solicitado e previsto), depois pendentes por prazo e os emitidos.",
        "Clicar numa linha abre o Relatório com o status dela.",
      ],
    },
    {
      id: "reports.list-new-request",
      title: "Nova solicitação",
      route: listPath(),
      fixture: "reports.lucas",
      persona: "admin",
      controls: { overlay: "new" },
      intent: "A gaveta de solicitar relatório a partir do prontuário, com o paciente travado.",
      expected: [
        "Criar solicitação fica desabilitado até tipo, solicitante e responsável (ou \"sem responsável\") estarem preenchidos.",
        "O tipo escolhido mostra o aviso de como o relatório será produzido; \"Outro\" pede o nome; Protocolo pede a aplicação finalizada.",
        "Ao criar, a solicitação entra na lista como Solicitado e aparece o toast de sucesso.",
      ],
    },
    {
      id: "reports.list-routine",
      title: "Rotina de relatórios",
      route: listPath(),
      fixture: "reports.lucas",
      persona: "admin",
      controls: { overlay: "routine" },
      intent: "Regras herdadas da operadora (só pausar) e regras próprias do paciente.",
      expected: [
        "Pausar pede um motivo de ao menos 3 letras; a regra pausada some dos previstos da lista.",
        "Adicionar ou editar regra troca a gaveta pelo formulário, com a prévia do próximo período.",
        "Remover uma regra própria tira os previstos dela da lista.",
      ],
    },
    {
      id: "reports.report-requested",
      title: "Alta / Desligamento solicitada",
      route: reportPath("r-103"),
      fixture: "reports.lucas",
      persona: "admin",
      controls: { status: "solicitado" },
      intent: "O começo do fluxo: a solicitação ainda não iniciada, com as ações da coordenação.",
      expected: [
        "Mostra \"Ainda não iniciado\" e o botão \"Iniciar relatório\", que abre o Editor de modelo.",
        "A coordenação pode editar, reatribuir e cancelar a solicitação e adicionar coautor.",
      ],
    },
    {
      id: "reports.report-signing",
      title: "Aguardando assinaturas (1 de 2)",
      route: reportPath("r-105"),
      fixture: "reports.lucas",
      persona: "admin",
      controls: { status: "assinaturas", signatures: "1" },
      intent: "Evolução de junho em atraso: Helena assinou, Fábio está pendente.",
      expected: [
        "Aviso de atraso com o prazo original; a prévia fica bloqueada e o chip mostra \"1 de 2\".",
        "Fábio assinando finaliza o relatório e gera o PDF; pedir alteração volta para edição e descarta as assinaturas.",
      ],
    },
    {
      id: "reports.report-issued",
      title: "Emitido e lido em parte pela família",
      route: reportPath("r-122"),
      fixture: "reports.lucas",
      persona: "admin",
      controls: { status: "finalizado", signatures: "all", share: "partial" },
      intent: "Trimestral com as duas assinaturas, compartilhado com mãe e pai; só a mãe abriu.",
      expected: [
        "Selo \"Lido em parte 1/2\"; quem não abriu tem a ação \"Lembrar\".",
        "\"Revogar acesso\" leva o painel ao estado revogado, com \"Compartilhar\" de novo.",
      ],
    },
    {
      id: "reports.fill-new",
      title: "Iniciar Alta / Desligamento",
      route: FILL("r-103"),
      fixture: "reports.lucas",
      persona: "admin",
      intent: "Modelo interno solicitado aberto no editor, só a Helena como autora.",
      expected: [
        "Abrir o editor passa o relatório para Em produção e registra no histórico.",
        "Mostra 0 de 3 seções e a ação Assinar e finalizar.",
      ],
    },
    {
      id: "reports.fill-images",
      title: "Evolução Mensal com gráficos",
      route: FILL("r-130"),
      fixture: "reports.lucas",
      persona: "admin",
      controls: { draft: "progress", images: "with" },
      intent: "Rascunho de julho com 2 de 4 seções, um gráfico anexado e um campo de imagem extra.",
      expected: [
        "Cada gráfico tem legenda e largura Inteira ou Metade.",
        "Campo extra com título editável; Adicionar campo de imagem cria outro.",
      ],
    },
    {
      id: "reports.protocol-new",
      title: "Iniciar Relatório de protocolo",
      route: PROTOCOL("r-111"),
      fixture: "reports.lucas",
      persona: "admin",
      intent: "VB-MAPP (aplicação de 18/06) aberto no editor, 0 de 6 seções.",
      expected: [
        "Mostra 44% (75,5 de 170: marcos valem 0, 0,5 ou 1), a grade de marcos por nível, as barras por nível e a tabela de domínios.",
        "Finalizar relatório fica desabilitado até alguma seção ter texto.",
      ],
    },
    {
      id: "reports.protocol-draft",
      title: "Protocolo em produção com coautor",
      route: PROTOCOL("r-111"),
      fixture: "reports.lucas",
      persona: "admin",
      controls: { draft: "progress", coauthor: "with" },
      intent: "2 de 6 seções redigidas e o Fábio como coautor.",
      expected: [
        "Mostra 2 de 6 seções.",
        "Gerar todo o relatório preenche as seis seções; a ação final é Enviar para assinaturas.",
      ],
    },
    {
      id: "reports.upload-empty",
      title: "Laudo externo sem PDF",
      route: UPLOAD("r-131"),
      fixture: "reports.lucas",
      persona: "admin",
      intent: "Laudo neuropediátrico (Relatório Externo) solicitado, ainda sem documento.",
      expected: [
        "Explica que o documento é produzido fora do sistema; Finalizar relatório fica desabilitado sem arquivo.",
        "Com o PDF enviado, Finalizar relatório conclui e volta para o Relatório emitido.",
      ],
    },
  ],
  fixtures: [...REPORTS_FIXTURES],
  routes: [
    {
      path: PATHS.list,
      params: { id: PATIENT_ID },
      screen: PatientReportsList,
      name: "Lista",
      group: FLOW,
      description: "A aba Relatórios da ficha do paciente: previstos pela rotina, solicitações e emitidos numa só lista.",
      controls: LIST_CONTROLS,
      expected: [
        "Mostra atrasados primeiro, depois pendentes por prazo e emitidos do mais recente ao mais antigo.",
        "Cancelados ficam fora da lista até o filtro de Status pedir por eles.",
        "Linha atrasada tem a borda vermelha à esquerda e o prazo em vermelho.",
        "Previsto pela rotina tem o botão + que cria a solicitação na hora.",
        "Clicar numa linha de solicitação ou emitido abre o Relatório em página cheia.",
        "Emitido com mais de uma ação mostra o menu ⋮ (baixar, compartilhar, reenviar, cancelar compartilhamento).",
        "Filtro Em atraso: só o que passou do prazo, com \"Limpar filtros\" e a contagem.",
        "Sem relatórios: \"Nenhum relatório para Lucas\" com a orientação de solicitar ou configurar a rotina.",
        "Busca sem resultado: \"Nenhum relatório com esses filtros\" e a orientação de limpar os filtros.",
      ],
      components: REPORTS_LIST_COMPONENTS,
    },
    {
      path: PATHS.report,
      params: { id: PATIENT_ID, reportId: "r-103" },
      screen: PatientReport,
      name: "Relatório",
      group: FLOW,
      description: "O relatório em modo foco: documento, autores e assinaturas, compartilhamento, dados da solicitação e histórico.",
      controls: REPORT_CONTROLS,
      expected: [
        "Solicitado: \"Ainda não iniciado\" e o botão \"Iniciar relatório\", que abre o editor do tipo.",
        "Em produção: a barra de progresso mostra as seções preenchidas; \"Continuar edição\" abre o editor.",
        "Aguardando assinatura: a prévia fica bloqueada e o chip mostra quantos assinaram; o autor pendente assina ou pede alteração; a coordenação pode voltar para edição.",
        "A última assinatura emite o relatório e gera o PDF.",
        "Emitido: a folha em PDF com as assinaturas, o painel de compartilhamento com a família, \"Baixar PDF\" e \"Reabrir relatório\".",
        "Cancelado: aviso com o motivo, sem documento, e \"Reabrir solicitação\".",
        "Em atraso: aviso com o prazo original.",
        "A coordenação edita, reatribui e cancela a solicitação; o profissional (persona supervisor ou specialist) só lê e assina a própria parte.",
      ],
      components: REPORTS_VIEW_COMPONENTS,
    },
    {
      path: PATHS.fill,
      params: { id: PATIENT_ID, reportId: "r-103" },
      screen: PatientReportFill,
      name: "Editor de modelo",
      group: FLOW,
      description: "Preenchimento de um relatório de modelo interno (Evolução Mensal, Trimestral, Avaliação, Admissão, Alta).",
      controls: FILL_CONTROLS,
      expected: [
        "Abrir o editor passa o relatório de Solicitado para Em produção e registra no histórico.",
        "A barra mostra quantas seções estão preenchidas e quando o rascunho foi salvo.",
        "Editar mostra Alterações não salvas; Voltar pergunta Sair sem salvar?",
        "Só o responsável: a ação final é Assinar e finalizar. Com coautor: Enviar para assinaturas.",
        "Campo de imagem: cada gráfico tem legenda e largura Inteira ou Metade; Adicionar campo de imagem cria outro, com título editável.",
      ],
      components: [...REPORTS_EDITOR_COMPONENTS, "core.file-uploader", "core.input"],
    },
    {
      path: PATHS.protocol,
      params: { id: PATIENT_ID, reportId: "r-111" },
      screen: PatientReportProtocol,
      name: "Editor de protocolo",
      group: FLOW,
      description: "Relatório de protocolo a partir da aplicação VB-MAPP do paciente, com grade de marcos, barras por nível e tabela de domínios.",
      controls: PROTOCOL_CONTROLS,
      expected: [
        "Mostra 44% (75,5 de 170: marcos valem 0, 0,5 ou 1), a grade de marcos por nível, as barras por nível e a tabela de domínios.",
        "Finalizar relatório fica desabilitado até alguma seção ter texto.",
        "Gerar todo o relatório preenche as seis seções.",
        "Com coautor, a ação final é Enviar para assinaturas.",
      ],
      components: [...REPORTS_EDITOR_COMPONENTS, "core.table"],
    },
    {
      path: PATHS.upload,
      params: { id: PATIENT_ID, reportId: "r-131" },
      screen: PatientReportUpload,
      name: "Anexar PDF",
      group: FLOW,
      description: "Relatório produzido fora do sistema (Relatório Externo ou Outro): anexar o PDF final e finalizar.",
      controls: UPLOAD_CONTROLS,
      expected: [
        "Explica que o documento é produzido fora do sistema.",
        "Mostra o progresso do envio; Finalizar relatório fica desabilitado sem arquivo.",
        "Com o PDF anexado, Finalizar relatório conclui e volta para o Relatório emitido.",
      ],
      components: ["core.card", "core.button", "core.file-uploader", "core.progress", "core.input", "core.modal"],
    },
  ],
};
