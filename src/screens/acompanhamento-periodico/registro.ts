import type { Feature } from "../../app/features.js";

import { PatientPeriodicMonitoring } from "../PatientPeriodicMonitoring.js";
import { MONITORING_FIXTURES } from "./fixtures.js";
import { FLOW, MONITORING_CONTROLS, PATH, PATIENT_ID, patientPath } from "./flow.js";

/** Componentes do catálogo que o acompanhamento periódico usa. */
const MONITORING_COMPONENTS = [
  "layout.backoffice", "layout.patient", "core.drawer-modal", "core.dropdown-menu", "core.breadcrumbs", "core.button",
  "core.tag", "core.avatar", "core.label", "core.error", "core.input", "core.progress", "core.inside-card",
  "core.toast-wrapper",
];

/** Acompanhamento periódico: o drawer da ficha do paciente, no checklist novo. */
export const feature: Feature = {
  scenarios: [
    {
      id: "periodic-monitoring.list",
      title: "Todas avaliações",
      route: patientPath(),
      fixture: "periodic-monitoring.history",
      persona: "coordinator",
      controls: { drawer: "list" },
      intent: "O drawer aberto pelo menu ⋮ do card do paciente, em Acompanhamento: o histórico com pontuação e classificação.",
      expected: [
        "Três avaliações, da mais recente para a mais antiga: 29/06 Estável (36/40), 29/05 Atenção (27/40) e 30/04 Prioritário (29/40).",
        "Cada item mostra o papel e o nome de quem registrou, a data e, se houver, \"Editado por … em …\" (a de 29/05).",
        "No card do paciente, a tag \"Acomp. Estável\" vem da avaliação mais recente.",
        "Nova avaliação no rodapé.",
      ],
    },
    {
      id: "periodic-monitoring.new",
      title: "Nova avaliação",
      route: patientPath(),
      fixture: "periodic-monitoring.history",
      persona: "coordinator",
      controls: { drawer: "new" },
      intent: "O checklist mensal: dez perguntas na escala de 1 a 4, quatro delas críticas.",
      expected: [
        "Responsável é quem está logado (Marina Alves, Coordenador) e a data é hoje (30/07/2026).",
        "O cabeçalho explica o checklist e a escala; Cálculo da classificação abre as faixas e a regra das perguntas críticas (estrela).",
        "A barra conta as respondidas. Salvar com pergunta em branco marca as que faltam e rola até a primeira.",
        "Com as dez respondidas aparece a classificação: 31 a 40 Estável, 21 a 30 Atenção, 10 a 20 Prioritário; nota 1 ou 2 numa crítica dá Prioritário e diz qual pergunta.",
        "Salvar volta para a lista com a avaliação no topo e o toast \"Acompanhamento periódico criado.\"",
      ],
    },
    {
      id: "periodic-monitoring.view-critical",
      title: "Avaliação Prioritária por resposta crítica",
      route: patientPath(),
      fixture: "periodic-monitoring.history",
      persona: "coordinator",
      controls: { drawer: "list" },
      intent: "Abra a avaliação de 30/04: 29 pontos dariam Atenção, mas a nota 2 na pergunta 1 a leva a Prioritário.",
      expected: [
        "O resultado mostra Prioritário, 29/40 e o aviso \"Classificado como Prioritário por resposta crítica\" com a pergunta 1.",
        "Cada resposta aparece como tag na cor da escala.",
        "Excluir e Editar no rodapé.",
      ],
    },
    {
      id: "periodic-monitoring.edit",
      title: "Editar avaliação",
      route: patientPath(),
      fixture: "periodic-monitoring.history",
      persona: "coordinator",
      controls: { drawer: "edit" },
      intent: "O checklist preenchido com as respostas da avaliação mais recente.",
      expected: [
        "Cancelar volta para a leitura da avaliação; Salvar volta para a lista com \"Editado por Marina Alves em 30/07/2026\".",
        "Toast \"Acompanhamento periódico atualizado.\"",
      ],
    },
    {
      id: "periodic-monitoring.empty",
      title: "Paciente sem avaliações",
      route: patientPath(),
      fixture: "periodic-monitoring.empty",
      persona: "coordinator",
      controls: { drawer: "list" },
      intent: "O primeiro acompanhamento do paciente.",
      expected: ["\"Nenhum acompanhamento periódico cadastrado.\" e Nova avaliação.", "Sem a tag de acompanhamento no card do paciente."],
    },
    {
      id: "periodic-monitoring.admin",
      title: "Admin só exclui",
      route: patientPath(),
      fixture: "periodic-monitoring.history",
      persona: "admin",
      controls: { drawer: "view" },
      intent: "Pela PeriodicMonitoringPolicy, admin, admin de clínica e pessoas só excluem: criar e editar é dos papéis clínicos.",
      expected: ["Sem Nova avaliação na lista.", "Na avaliação, só Excluir."],
    },
    {
      id: "periodic-monitoring.readonly",
      title: "Atendente só vê",
      route: patientPath(),
      fixture: "periodic-monitoring.history",
      persona: "attendant",
      controls: { drawer: "view" },
      intent: "Quem não está na PeriodicMonitoringPolicy vê o histórico e as avaliações, sem ações.",
      expected: ["Sem Nova avaliação, Editar nem Excluir."],
    },
  ],
  fixtures: [...MONITORING_FIXTURES],
  routes: [
    {
      path: PATH,
      params: { id: PATIENT_ID },
      screen: PatientPeriodicMonitoring,
      name: "Ficha do paciente · Acompanhamento",
      group: FLOW,
      description: "A ficha do paciente com o drawer de acompanhamento periódico, aberto pelo menu ⋮ do card.",
      controls: MONITORING_CONTROLS,
      expected: [
        "Menu ⋮ do card do paciente → Acompanhamento abre o drawer na lista.",
        "Lista: responsável, data, pontuação de 40 e a classificação (Estável, Atenção, Prioritário). Novo em relação ao Phoenix: pontuação e classificação.",
        "Checklist novo: dez perguntas (quatro críticas) na escala do enum atual (Atenção imediata, Precisa de acompanhamento próximo, Adequado, Muito bom), no lugar das seis perguntas em select e da observação.",
        "Novo no card do paciente: a tag \"Acomp. <classificação>\" da avaliação mais recente.",
        "Permissões da PeriodicMonitoringPolicy: criar e editar para coordenador, supervisor, terapeuta, especialista e aplicador; excluir também para admin, admin de clínica e pessoas.",
      ],
      components: MONITORING_COMPONENTS,
    },
  ],
};
