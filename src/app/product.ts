import type { ProductDefinition } from "@brucesantos/design-space";

import { COMPONENT_PREVIEWS } from "../catalog/components.js";
import { LAYOUT_PREVIEWS } from "../catalog/layouts.js";
import { personas } from "../personas/index.js";
import { UnitRoomsMap } from "../screens/UnitRoomsMap.js";
import { ROOMS_MAP_FIXTURES } from "../screens/mapa-salas/fixtures.js";
import { FLOW as ROOMS_MAP_FLOW, PATH as ROOMS_MAP_PATH, ROOMS_MAP_CONTROLS, UNIT_ID, roomsMapPath } from "../screens/mapa-salas/flow.js";

/** Componentes do catálogo que a aba Salas (Mapa de Salas) usa. */
const ROOMS_MAP_COMPONENTS = [
  "layout.backoffice", "layout.unit", "core.card-tabs", "core.button-tabs", "core.radio-selector",
  "core.button", "core.input", "core.custom-select", "core.checkbox-group",
  "core.table", "core.modal", "core.drawer-modal", "core.toast-wrapper", "core.avatar", "core.dropdown-menu",
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

  // Atalhos do Mapa de Salas: combinações de controles que valem um link
  // direto no PR. O resto se monta no painel Variações.
  scenarios: [
    {
      id: "rooms-map.today",
      title: "Mapa de Salas de hoje (quinta, 30/07)",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      intent: "A aba Salas da Unidade Teste: uma faixa por ponto, com o planejado em cima e a escala (do perfil do profissional) embaixo.",
      expected: [
        "Ao lado de Salas / Bloqueios: Seg a Sex com Qui marcado e Nova Sala.",
        "Contadores: 4 com plano e profissional, 11 só com plano, 0 só com profissional, 7 sem plano nem profissional, 2 com conflito e 2 temporários.",
        "Sala Laranja·B (Helena, PSI num plano de FIS) e Sala Integração·C (Larissa, FON num plano de PSI) aparecem com o alerta laranja.",
        "Sala de Espera, sem ponto, mostra \"nenhum ponto de atendimento configurado\"; a Ludoteca, inativa, não aparece.",
      ],
    },
    {
      id: "rooms-map.monday",
      title: "Mapa de Salas na segunda",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { day: "monday" },
      intent: "Outro dia da mesma semana: as alocações que só valem em alguns dias mudam o mapa.",
      expected: [
        "Contadores: 5, 11, 1, 5, 3 e 4.",
        "Conflitos: Larissa na Sala Azul·B, Mariana na Sala Rosa·B e Helena na Sala Laranja·B.",
        "Lívia no Consultório 1·A é escala sem planejado (card tracejado na linha de baixo).",
      ],
    },
    {
      id: "rooms-map.conflicts",
      title: "Só os pontos com conflito",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { focus: "divergent" },
      intent: "O contador de conflito ligado filtra o mapa; Limpar filtros volta tudo.",
      expected: ["Só Sala Laranja·B e Sala Integração·C.", "O contador de conflito fica marcado e aparece Limpar filtros."],
    },

    {
      id: "rooms-map.plan",
      title: "Novo planejado num ponto",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { overlay: "plan" },
      intent: "Clique num horário vazio da linha de cima: a gaveta define o que a unidade precisa no ponto (Sala Lilás·D).",
      expected: [
        "Especialidade, início e fim de hora em hora, tipo Fixo / Temporário e dias. Sem campo de profissional.",
        "Fim antes do início, nenhum dia escolhido ou horário que cruza outro planejado do ponto mostra o aviso e não salva.",
        "Ao salvar, o trecho entra na linha de cima na hora, com o toast \"Planejado adicionado\".",
      ],
    },
    {
      id: "rooms-map.plan-edit",
      title: "Editar um planejado",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { overlay: "plan-edit" },
      intent: "O planejado de Psicologia da Sala Azul·A (08h–12h): mudar, ou remover.",
      expected: [
        "Salvar só habilita depois de mudar algo; Remover tira o trecho do planejamento.",
        "A nota mostra quem está na escala no horário (Helena Martins Costa), que vem do perfil do profissional.",
        "Arrastar o trecho na linha de cima move o horário de hora em hora; puxar as bordas muda início e fim.",
      ],
    },






    {
      id: "rooms-map.room",
      title: "Nova sala",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { overlay: "room-new" },
      intent: "Criação simplificada: nome, tipo e pontos. O padrão de cada ponto se define depois, no mapa.",
      expected: ["Pontos com nome repetido ou vazio bloqueiam o Criar sala.", "A sala nova entra no fim do mapa, na hora, com uma faixa por ponto."],
    },
    {
      id: "rooms-map.santana",
      title: "Mapa de Salas de Santana",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { unit: "u2" },
      intent: "A outra unidade, com horário das 07h30 às 19h.",
      expected: [
        "A régua vai de 07:30 a 19:00.",
        "Contadores: 3, 0, 0, 0, 1 e 1; o conflito é Tânia (PSI) na Sala 101·A, planejada para FIS.",
      ],
    },
    {
      id: "rooms-map.blockings",
      title: "Bloqueios de sala",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { sub: "blockings" },
      intent: "A sub-aba Bloqueios: filtros por sala, tipo e período, a tabela e Novo bloqueio.",
      expected: [
        "Dois bloqueios: Pintura na Sala Azul (10 a 11/03) e Reparo AC na Sala Amarela (05/03, 13:00 às 18:00).",
        "O ícone de informação abre \"Bloqueio de sala\"; a lixeira remove com o toast.",
      ],
    },
    {
      id: "rooms-map.blocking-new",
      title: "Novo bloqueio de sala",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { overlay: "blocking" },
      intent: "Bloqueio de um dia, de um período ou de um horário específico em cada dia do período.",
      expected: ["Horário específico pede hora inicial e final.", "O resumo abaixo das datas diz o que vai ser bloqueado (\"Só em 10/08/2026, dia inteiro.\")."],
    },
    {
      id: "rooms-map.readonly",
      title: "Mapa de Salas só leitura (Admin de Clínica)",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "clinic_admin",
      intent: "Quem vê a unidade mas não tem units.edit.",
      expected: ["Sem Nova Sala nem Novo bloqueio; o planejado não arrasta nem abre gavetas.", "Detalhes do bloqueio e \"Ver escala no perfil\" continuam disponíveis."],
    },
  ],
  personas,
  defaultPersona: "admin",
  fixtures: [...ROOMS_MAP_FIXTURES],
  routes: [
    {
      path: ROOMS_MAP_PATH,
      params: { id: UNIT_ID },
      screen: UnitRoomsMap,
      name: "Salas",
      group: ROOMS_MAP_FLOW,
      description: "A aba Salas da unidade: o Mapa de Salas do dia (o planejado de cada ponto sobre a escala dos profissionais) e os bloqueios de sala.",
      controls: ROOMS_MAP_CONTROLS,
      expected: [
        "Button tabs Salas / Bloqueios; em Salas, o dia da semana (radio_selector) e Nova Sala.",
        "Uma faixa por ponto de atendimento no eixo do horário de funcionamento, em duas linhas.",
        "Em cima, o planejado do ponto (o dia todo de uma especialidade, ou duas no mesmo dia): clicar num horário vazio adiciona, clicar num trecho edita ou remove, arrastar move de hora em hora e as bordas mudam início e fim. Vale na hora, sem rascunho nem publicar.",
        "Embaixo, a escala: o profissional e a especialidade dele, vindos do perfil do profissional. Só leitura; hover mostra os detalhes e \"Ver escala no perfil\". Cinza: planejado sem profissional. Tracejado: escala sem planejado. Alerta laranja: especialidade diferente do planejado. Ampulheta roxa: temporário.",
        "Busca única por profissional, sala, sala + ponto (\"azul a\", \"1a\") ou especialidade, com sugestões; os contadores filtram por status.",
        "Bloqueios: filtros por sala, tipo e período; tabela do Phoenix; Novo bloqueio; detalhes em modal.",
        "Sem units.edit: só leitura.",
      ],
      components: ROOMS_MAP_COMPONENTS,
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
