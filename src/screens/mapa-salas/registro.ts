import type { Feature } from "../../app/features.js";

import { UnitRoomsMap } from "../UnitRoomsMap.js";
import { ROOMS_MAP_FIXTURES } from "./fixtures.js";
import { FLOW as ROOMS_MAP_FLOW, PATH as ROOMS_MAP_PATH, ROOMS_MAP_CONTROLS, UNIT_ID, roomsMapPath } from "./flow.js";

/** Componentes do catálogo que a aba Salas (Mapa de Salas) usa. */
const ROOMS_MAP_COMPONENTS = [
  "layout.backoffice", "layout.unit", "core.card-tabs", "core.header", "core.radio-selector",
  "core.button", "core.input", "core.checkbox-group", "core.drawer-modal", "core.toast-wrapper",
];

/** Mapa de Salas: a aba Salas da unidade. */
export const feature: Feature = {
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
        "No cabeçalho Salas: Seg a Sex com Qui marcado e Nova Sala. O cabeçalho da unidade conta 11 salas (a Ludoteca, inativa, entra na conta).",
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
        "Conflitos: Camila na Sala Azul·B, Mariana na Sala Rosa·B e Helena na Sala Laranja·B.",
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
        "A régua vai de 07:30 a 19:00, com todas as horas cheias (08:00 incluída). O dia vai de Seg a Sex.",
        "Contadores: 3, 0, 0, 0, 1 e 1; o conflito é Tânia (PSI) na Sala 101·A, planejada para FIS.",
      ],
    },
    {
      id: "rooms-map.capacity",
      title: "Capacidade das salas de hoje (quinta, 30/07)",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { view: "capacity" },
      intent: "A visão Capacidade: uma linha por ponto e uma coluna por hora do funcionamento, cheia quando a escala põe um profissional no ponto.",
      expected: [
        "No header, à direita dos dias, o seletor de visão só com ícones (Mapa de Salas / Capacidade). O dia vale para as duas visões.",
        "21 pontos × 10 h = 210 h de capacidade física; 23 h com profissional, 187 h sem, cobertura de 11% em azul (azul até 25%, amarelo até 50%, laranja até 75%, vermelho acima).",
        "Embaixo da grade, a ocupação de cada hora na quinta e na semana; a da semana não muda com o dia. Sem hora parcial no dia, a legenda não mostra Parte da hora.",
        "Por sala, a Sala Verde lidera com 30%. Sala de Espera, sem ponto, e a Ludoteca, inativa, não entram.",
        "Passar o mouse num profissional destaca as horas dele na grade; clicar no nome da sala abre a gaveta da sala.",
      ],
    },
    {
      id: "rooms-map.capacity-monday",
      title: "Capacidade das salas na segunda",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "admin",
      controls: { view: "capacity", day: "monday" },
      intent: "Outro dia: muda a grade, a linha de ocupação do dia e os cards; a linha da semana fica igual.",
      expected: [
        "Cobertura de 17% (35 h de 210 h).",
        "Sala Azul em 40%, com a barra amarela.",
        "Ocupação na semana igual à da quinta: 17%, 17%, 17%, 11%, 0%…",
      ],
    },
    {
      id: "rooms-map.capacity-busy",
      title: "Capacidade numa quarta lotada",
      route: roomsMapPath(),
      fixture: "rooms-map.busy",
      persona: "admin",
      controls: { view: "capacity", day: "wednesday" },
      intent: "A fixture da quarta lotada: quase todo turno vago da Unidade Teste ganha alguém na escala, para ver a Capacidade perto do limite.",
      expected: [
        "21 pontos × 10 h = 210 h; 169,5 h com profissional, 40,5 h sem, cobertura de 81% em vermelho.",
        "Ocupação na quarta de 81% a 95% por hora, com o almoço (12h) em 0%; na semana, 31% nas horas cheias.",
        "Por sala, de 67% (Sala Rosa) a 90% (Sala Amarela e Consultório 2), com barras laranja e vermelhas.",
        "Um turno a cada nove começa às :30, então a legenda mostra Parte da hora. 23 profissionais no cabeçalho da unidade.",
      ],
    },
    {
      id: "rooms-map.busy",
      title: "Mapa de Salas numa quarta lotada",
      route: roomsMapPath(),
      fixture: "rooms-map.busy",
      persona: "admin",
      controls: { day: "wednesday" },
      intent: "A mesma quarta lotada no Mapa de Salas: a maior parte da escala nova cai em pontos sem planejado.",
      expected: [
        "Contadores: 11, 2, 22, 0, 6 e 1.",
        "Os turnos novos aparecem tracejados (escala sem planejado) ou com o alerta laranja quando a especialidade não bate com o planejado.",
        "Os outros dias e Santana ficam como na fixture do protótipo.",
      ],
    },
    {
      id: "rooms-map.readonly",
      title: "Mapa de Salas só leitura (Admin de Clínica)",
      route: roomsMapPath(),
      fixture: "rooms-map.units",
      persona: "clinic_admin",
      intent: "Quem vê a unidade mas não tem units.edit.",
      expected: ["Sem Nova Sala; o planejado não arrasta nem abre gavetas.", "\"Ver escala no perfil\" continua disponível."],
    },
  ],
  fixtures: [...ROOMS_MAP_FIXTURES],
  routes: [
    {
      path: ROOMS_MAP_PATH,
      params: { id: UNIT_ID },
      screen: UnitRoomsMap,
      name: "Salas",
      group: ROOMS_MAP_FLOW,
      description: "A aba Salas da unidade: o Mapa de Salas do dia (o planejado de cada ponto sobre a escala dos profissionais). Os bloqueios ficam em /backoffice/bloqueios, fora da unidade.",
      controls: ROOMS_MAP_CONTROLS,
      expected: [
        "Header Salas com o dia da semana (radio_selector) e Nova Sala.",
        "Uma faixa por ponto de atendimento no eixo do horário de funcionamento, em duas linhas.",
        "Em cima, o planejado do ponto (o dia todo de uma especialidade, ou duas no mesmo dia): clicar num horário vazio adiciona, clicar num trecho edita ou remove, arrastar move de hora em hora e as bordas mudam início e fim. Vale na hora, sem rascunho nem publicar.",
        "Embaixo, a escala: o profissional e a especialidade dele, as duas do perfil do profissional. Só leitura; hover mostra os detalhes e \"Ver escala no perfil\". Cinza: planejado sem profissional. Tracejado: escala sem planejado. Alerta laranja: especialidade diferente do planejado. Ampulheta roxa: temporário.",
        "Busca única por profissional, sala, sala + ponto (\"azul a\", \"1a\") ou especialidade, com sugestões; os contadores filtram por status.",
        "Sem units.edit: só leitura.",
        "Visão Capacidade (radio_selector de ícones ao lado dos dias; a visão é nova): a escala de cada ponto hora a hora no dia, a ocupação por hora no dia e na semana, a capacidade física com a taxa de cobertura, a cobertura por sala e as horas de cada profissional.",
      ],
      components: ROOMS_MAP_COMPONENTS,
    },
  ],
};
