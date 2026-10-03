import type { ProductDefinition } from "@brucesantos/design-space";

import { COMPONENT_PREVIEWS } from "../catalog/components.js";
import { LAYOUT_PREVIEWS } from "../catalog/layouts.js";
import { personas } from "../personas/index.js";
import { TransferCenter } from "../screens/TransferCenter.js";
import { TRANSFER_CENTER_FIXTURES } from "../screens/central-transferencias/fixtures.js";
import { FLOW as TRANSFER_CENTER_FLOW, PATH as TRANSFER_CENTER_PATH, TAB_ID as TRANSFER_TAB_ID, TAB_TRACKER as TRANSFER_TAB_TRACKER, TRANSFER_CENTER_CONTROLS } from "../screens/central-transferencias/flow.js";

/** A Central aberta na sub-aba Sessões do período (o `tracker_id` dos `button_tabs`). */
const TRANSFER_CENTER_SESSIONS = `${TRANSFER_CENTER_PATH}?${TRANSFER_TAB_TRACKER}=${encodeURIComponent(`${TRANSFER_TAB_ID}|sessoes-do-periodo`)}`;

/**
 * Componentes do catálogo que a Central de Transferências usa. O `icon`
 * (`core_components.ex`) também, mas ainda não tem preview no catálogo.
 */
const TRANSFER_CENTER_COMPONENTS = [
  "layout.backoffice", "core.card", "core.button-tabs", "core.input", "core.custom-select", "core.radio-group",
  "core.button", "core.tag", "core.empty-state-card", "core.toast-wrapper",
];

/**
 * O Bloomy Design Space é a biblioteca de componentes e layouts do Bloomy,
 * espelhados do monólito Phoenix.
 *
 * Telas de feature entram por PR, registradas em `scenarios` e `routes`, e
 * ficam como registro do design combinado no handoff.
 */
export const productDefinition: ProductDefinition = {
  id: "bloomy",
  name: "Bloomy",
  tagline: "Componentes e layouts do Bloomy, espelhados do sistema real.",

  scenarios: [
    // Atalhos da Central de Transferências: combinações de controles que valem
    // um link direto no PR. O resto se monta no painel Variações.
    {
      id: "transfer-center.orphans",
      title: "Mapas sem profissional (abertura)",
      route: TRANSFER_CENTER_PATH,
      fixture: "transfer-center.unit",
      persona: "admin",
      intent: "A sub-aba Mapas de horas abre nos mapas que ficaram sem profissional, porque eles têm destino possível.",
      expected: [
        "Profissional de origem: Sem profissional (inativos) · 4 mapas; contagem \"6 horários em 4 mapas · 0 com destino\".",
        "Cards de Helena Vieira, Igor Nunes, Júlia Almeida e Otávio Campos; Júlia e Otávio mostram \"Ninguém cobre todos os horários\".",
        "Painel: Mapas sem profissional · 4 mapas · 6h por semana; Transferir 0 horários desabilitado.",
        "Ao lado, Transferências programadas com 01/09 (em 11 dias), origem Rafael Lima: Otávio Rocha Qua 10:00–11:00 → Thiago Rezende.",
      ],
    },
    {
      id: "transfer-center.orphans-distributed",
      title: "Distribuir os mapas sem profissional",
      route: TRANSFER_CENTER_PATH,
      fixture: "transfer-center.unit",
      persona: "admin",
      controls: { distribute: "auto" },
      intent: "Distribuir dá a cada horário livre o profissional que recebeu menos; o que não tem destino fica com a origem.",
      expected: [
        "4 de 6 horários com destino: Helena Vieira (Ter e Qui 08:00) → Renata Siqueira; Igor Nunes → Carolina Mattos; Júlia Almeida Sex 13:00 → Murilo Pacheco.",
        "Júlia aparece com \"Personalizado por horário\" (um horário com destino, outro sem).",
        "Resumo: 4h a transferir, 3 profissionais de destino, 2h permanecem na origem. Para quem vai: Renata 2h, Carolina 1h, Murilo 1h.",
        "Transferir 4 horários aplica e mostra o toast \"Horários transferidos\"; os mapas que saíram somem e a lista continua em Sem profissional, com Júlia Almeida (Sex 14:00–15:00) e Otávio Campos, ainda sem destino.",
      ],
    },
    {
      id: "transfer-center.professional",
      title: "Mapas de um profissional (Rafael Lima)",
      route: TRANSFER_CENTER_PATH,
      fixture: "transfer-center.unit",
      persona: "admin",
      controls: { origin: "p2" },
      intent: "Antes de inativar Rafael Lima: os 16 mapas dele, com o destino para o mapa inteiro ou, em Detalhar, por horário.",
      expected: [
        "Origem Rafael Lima · Terapia Ocupacional · 16 mapas; \"39 horários em 16 mapas · 0 com destino · 1 programado\".",
        "Otávio Rocha: Qua 10:00–11:00 travado (roxo), Thiago Rezende a partir de 01/09.",
        "Detalhar abre um seletor por horário, com seta; Recolher volta ao seletor do mapa inteiro.",
        "Só aparece quem tem escala no horário, está livre e não recebeu outro horário igual nesta leva.",
      ],
    },
    {
      id: "transfer-center.professional-distributed",
      title: "Distribuir os mapas de Rafael Lima",
      route: TRANSFER_CENTER_PATH,
      fixture: "transfer-center.unit",
      persona: "admin",
      controls: { origin: "p2", distribute: "auto" },
      intent: "Mesmo com a leva inteira, só 26 dos 39 horários livres cabem em outro profissional de Terapia Ocupacional.",
      expected: [
        "Painel: Horários com destino 26 de 39; destinos Bianca Torres e Murilo Pacheco.",
        "Júlia Lopes (Seg/Qua/Sex 08:00) fica sem destino; Manuela Araújo (Seg/Qua/Sex 09:00) vai inteira para Bianca Torres.",
      ],
    },
    {
      id: "transfer-center.cross",
      title: "Exceção: outra especialidade",
      route: TRANSFER_CENTER_PATH,
      fixture: "transfer-center.unit",
      persona: "admin",
      controls: { cross: "on", distribute: "auto" },
      intent: "Permitir outra especialidade abre o aviso laranja e pede o motivo, que fica no histórico do mapa.",
      expected: [
        "Aviso \"Transferência fora da especialidade\" com o campo Motivo da exceção.",
        "Com Distribuir, os 6 horários dos mapas sem profissional têm destino; Transferir só habilita com 3 ou mais letras no motivo.",
      ],
    },
    {
      id: "transfer-center.scheduled",
      title: "Transferência programada",
      route: TRANSFER_CENTER_PATH,
      fixture: "transfer-center.unit",
      persona: "admin",
      controls: { distribute: "auto", when: "prog" },
      intent: "Início Programada: os horários ficam reservados até a data e passam para o destino nela.",
      expected: [
        "Data 28/08/2026 (mínimo: amanhã, 22/08); texto \"Até 27/08/2026 os atendimentos seguem com a origem. A partir de 28/08/2026 (em 7 dias)…\".",
        "O botão vira \"Programar 4 para 28/08\"; ao programar, entra em Transferências programadas e a lista continua em Sem profissional, com os horários reservados travados (roxo) em Detalhar.",
        "Cancelar devolve os horários à origem; Antecipar aplica hoje (na de 01/09, o horário de quarta de Otávio Rocha passa para Thiago Rezende).",
      ],
    },
    {
      id: "transfer-center.no-scheduled",
      title: "Sem transferências programadas",
      route: TRANSFER_CENTER_PATH,
      fixture: "transfer-center.unit",
      persona: "admin",
      controls: { scheduled: "none" },
      intent: "Sem programadas, o card Transferências programadas não aparece.",
      expected: [
        "Só o painel da origem ao lado da lista.",
      ],
    },
    {
      id: "transfer-center.sessions",
      title: "Sessões do período (hoje)",
      route: TRANSFER_CENTER_SESSIONS,
      fixture: "transfer-center.unit",
      persona: "admin",
      intent: "Cobertura pontual de sexta, 21/08: as sessões concretas de todos os profissionais, por titular, sem mexer nos mapas.",
      expected: [
        "Filtros De / Até 21/08/2026, Especialidade e Profissional; \"Sex, 21/08 · 87 sessões\".",
        "Um card por titular (Ana Beatriz primeiro). Ana Beatriz, Vanessa Lobo e Henrique Sales abrem recolhidos, com um substituto para o dia inteiro (Carolina Mattos cobre todos); os outros abrem detalhados, porque ninguém cobre todas as sessões.",
        "Em Detalhar, cada sessão tem Escolher substituto…; sem substituto, o seletor diz \"Só fora da especialidade\" e só oferece Sem cobertura — cancelar sessão.",
        "Painel Cobertura do período: 21/08 · os mapas de horas não mudam; Transferir 0 sessões desabilitado.",
        "Só com cancelamentos o botão vira \"Cancelar N sessões\"; com os dois, \"Transferir N e cancelar M\". As canceladas saem da lista e contam no toast.",
      ],
    },
    {
      id: "transfer-center.sessions-week",
      title: "Cobrir uma semana inteira",
      route: TRANSFER_CENTER_SESSIONS,
      fixture: "transfer-center.unit",
      persona: "admin",
      controls: { period: "week", sDistribute: "auto" },
      intent: "Uma semana (21/08 a 27/08) com os substitutos distribuídos; Transferir pede o motivo da ausência.",
      expected: [
        "446 sessões em cinco dias; Distribuir dá substituto a 196.",
        "Ana Beatriz, 21/08: 07:00 Davi Teixeira → Henrique Sales; 08:00 Heitor Almeida → Vanessa Lobo; 09:00 Isabela Mendes → Carolina Mattos; 11:00 Noah Araújo → Vanessa Lobo.",
        "Com Motivo da ausência escolhido, Transferir 196 sessões aplica; as sessões transferidas (e as canceladas) saem da lista.",
      ],
    },
  ],
  personas,
  defaultPersona: "admin",
  fixtures: [...TRANSFER_CENTER_FIXTURES],
  routes: [
    {
      path: TRANSFER_CENTER_PATH,
      screen: TransferCenter,
      name: "Central de Transferências",
      group: TRANSFER_CENTER_FLOW,
      description:
        "Nova página do backoffice: movimenta os mapas de horas dos pacientes entre profissionais antes de inativar alguém ou alterar uma escala, e cobre sessões de um período sem mexer no mapa.",
      controls: TRANSFER_CENTER_CONTROLS,
      expected: [
        "Card da lista com o título à esquerda e os button_tabs Mapas de horas / Sessões do período à direita (a sub-aba fica na URL, em ?transfer_tab=); ao lado, o painel da sub-aba aberta (abaixo, em telas estreitas).",
        "Mapas de horas: o profissional de origem (ou Sem profissional), Permitir outra especialidade com o motivo obrigatório, Distribuir e um card por mapa.",
        "Cada mapa recebe um destino para todos os horários ou, em Detalhar, um destino por horário; só aparece quem tem escala no horário, está livre e não recebeu outro horário igual nesta leva.",
        "Início Imediata ou Programada (a partir de amanhã); o resumo mostra horas a transferir, destinos e o que fica com a origem. Programadas listadas ao lado, com Cancelar e Antecipar.",
        "Sessões do período: período, especialidade e profissional; sessões por dia e titular, cada uma com o substituto ou \"Sem cobertura — cancelar sessão\". Transferir pede o motivo da ausência e não muda os mapas.",
      ],
      components: TRANSFER_CENTER_COMPONENTS,
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
