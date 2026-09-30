import type { ProductDefinition } from "@brucesantos/design-space";

import { COMPONENT_PREVIEWS } from "../catalog/components.js";
import { LAYOUT_PREVIEWS } from "../catalog/layouts.js";
import { personas } from "../personas/index.js";
import { UnitRoomsMap } from "../screens/UnitRoomsMap.js";
import { ROOMS_MAP_FIXTURES } from "../screens/mapa-salas/fixtures.js";
import { FLOW as ROOMS_MAP_FLOW, PATH as ROOMS_MAP_PATH, ROOMS_MAP_CONTROLS, UNIT_ID, roomsMapPath } from "../screens/mapa-salas/flow.js";

/** Componentes do catálogo que a aba Salas (Mapa de Salas) usa. */
const ROOMS_MAP_COMPONENTS = [
  "layout.backoffice", "layout.unit", "core.card-tabs", "core.button-tabs", "core.radio-selector", "core.dropdown",
  "core.button", "core.input", "core.custom-select", "core.checkbox-group", "core.radio-group", "core.tag",
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
      intent: "A aba Salas da Unidade Teste na vigência em curso: uma faixa por ponto, com o planejado em cima e quem está na escala embaixo.",
      expected: [
        "Ao lado de Salas / Bloqueios: Seg a Sex com Qui marcado, a vigência 06/05/2026 – 30/11/2026 \"Em vigência\" e Nova Sala.",
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
        "Lívia no Consultório 1·A é escala sem plano (a parte de cima do card fica cinza).",
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
      id: "rooms-map.gap",
      title: "Alocar no trecho a cobrir",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { overlay: "gap" },
      intent: "O trecho planejado sem ninguém da Sala Azul·B (Fonoaudiologia, 13h–17h), com quem tem escala livre primeiro.",
      expected: [
        "O profissional sugerido primeiro é \"Fábio Stoll Pereira · escala livre 13:00–18:00\".",
        "Ao salvar, o card passa a mostrar Fábio, aparece o toast \"Profissional alocado\" e a barra \"1 alteração não publicada\".",
      ],
    },
    {
      id: "rooms-map.plan",
      title: "Definir o padrão de um ponto",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { overlay: "plan" },
      intent: "Clique num horário vazio da faixa: a gaveta define o que a unidade precisa no ponto (Sala Lilás·D).",
      expected: [
        "Especialidade, profissional (só depois da especialidade), início e fim de hora em hora, tipo Fixo / Temporário e dias.",
        "Fim antes do início, nenhum dia escolhido ou horário que cruza outro padrão do ponto mostra o aviso e não salva.",
      ],
    },
    {
      id: "rooms-map.card",
      title: "Editar uma alocação",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { overlay: "card" },
      intent: "O card de Helena na Sala Azul·A: trocar o profissional, o horário, o tipo e os dias.",
      expected: [
        "Salvar só habilita depois de mudar algo.",
        "Arrastar o card no mapa move o horário de hora em hora; puxar as bordas muda início e fim.",
      ],
    },
    {
      id: "rooms-map.draft",
      title: "Rascunho da vigência em curso",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { draft: "with" },
      intent: "Edições na vigência em curso ficam em rascunho até publicar.",
      expected: [
        "Fábio ocupa a Sala Lilás·B à tarde e a barra \"1 alteração não publicada no padrão em vigência\" fica no pé da página.",
        "Descartar volta ao padrão publicado; Publicar abre \"A partir de quando vale?\".",
      ],
    },
    {
      id: "rooms-map.publish",
      title: "Publicar o rascunho",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { overlay: "publish" },
      intent: "Escolher quando a nova versão do padrão começa e termina.",
      expected: [
        "Hoje · 30/07/2026 ou outra data; o fim vem 30/11/2026.",
        "Com fim antes de 30/11/2026, avisa que depois volta o padrão atual.",
        "Ao publicar, a vigência 06/05 – 29/07 fica encerrada e a nova vale de 30/07.",
      ],
    },
    {
      id: "rooms-map.closed",
      title: "Vigência encerrada (só leitura)",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { vigencia: "v0" },
      intent: "A vigência anterior, só com a manhã planejada.",
      expected: [
        "Aviso \"Vigência encerrada · somente leitura\"; os cards não arrastam nem abrem.",
        "Contadores: 4, 5, 0, 13, 0 e 0.",
        "Nova Sala e o lápis da sala abrem \"Vigência encerrada\" em vez da gaveta.",
      ],
    },
    {
      id: "rooms-map.version",
      title: "Nova vigência",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { overlay: "version" },
      intent: "Uma nova versão do planejamento, no dia seguinte à última.",
      expected: ["O início é 01/07/2027, travado; o planejamento vem copiado da vigência em curso ou em branco.", "Ao criar, ela vira a selecionada, marcada \"Futura\"."],
    },
    {
      id: "rooms-map.room",
      title: "Nova sala",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { overlay: "room-new" },
      intent: "Criação simplificada: nome, tipo e pontos. O padrão de cada ponto se define depois, no mapa.",
      expected: ["Pontos com nome repetido ou vazio bloqueiam o Criar sala.", "A sala nova entra no fim do mapa com uma faixa por ponto."],
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
      expected: ["Sem Nova Sala, Nova vigência nem Novo bloqueio; o mapa não arrasta nem abre gavetas.", "Detalhes do bloqueio continuam disponíveis."],
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
      description: "A aba Salas da unidade: o Mapa de Salas do dia (planejamento × escala de cada ponto), as vigências do planejamento e os bloqueios de sala.",
      controls: ROOMS_MAP_CONTROLS,
      expected: [
        "Button tabs Salas / Bloqueios; em Salas, o dia da semana (radio_selector), a vigência do planejamento e Nova Sala.",
        "Uma faixa por ponto de atendimento no eixo do horário de funcionamento. Card: especialidade planejada e Sala·Ponto em cima; especialidade e profissional embaixo.",
        "Trecho planejado sem ninguém: metade de baixo cinza, \"Alocar\" no hover. Escala sem plano: metade de cima cinza. Conflito (especialidade diferente): alerta laranja. Temporário: ampulheta roxa.",
        "Clicar num horário vazio define o padrão; clicar no trecho aloca; clicar no card edita. Arrastar move de hora em hora e as bordas mudam início e fim.",
        "Busca única por profissional, sala, sala + ponto (\"azul a\", \"1a\") ou especialidade, com sugestões; os contadores filtram por status.",
        "Vigência em curso: edições viram rascunho até publicar. Futura: grava direto. Encerrada: só leitura.",
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
