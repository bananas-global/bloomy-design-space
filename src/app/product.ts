import type { ProductDefinition } from "@brucesantos/design-space";

import { COMPONENT_PREVIEWS } from "../catalog/components.js";
import { LAYOUT_PREVIEWS } from "../catalog/layouts.js";
import { personas } from "../personas/index.js";
import { AGENDA_PATTERN_PATH, AgendaPattern } from "../screens/AgendaPattern.js";
import { AGENDA_PATTERN_FIXTURES } from "../screens/agenda-pattern/fixtures.js";

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
    {
      id: "agenda-pattern.map",
      title: "Padrão de Agenda",
      route: AGENDA_PATTERN_PATH,
      fixture: "agenda-pattern.map",
      persona: "admin",
      intent: "A aba Padrão de Agenda do Mapa de Horas, com o botão verde renomeado para Plano Terapêutico.",
      expected: [
        "Cabeçalho: Padrão de Agenda; Plano Terapêutico (tint verde), Agendamentos (tint roxo), Disponibilidade e a Renovação Automática ligada.",
        "Período de Vigência 01/07/2026 até 30/09/2026 e Editar vigência.",
        "Cartões de horas semanais: Psicologia 7, Fonoaudiologia 2, Terapia Ocupacional 2, Fisioterapia 1, Musicoterapia 1.",
        "Grade de SEG a SEX, das 08:00 às 17:00, com um cartão por sessão na cor da especialidade; sexta 08:00 tem dois itens combinados.",
        "Clicar numa célula vazia abre Novo Agendamento; num cartão, Editar Agendamento com Remover.",
        "Disponibilidade mostra os filtros. Rodapé com 13 / 60 Agendamentos / Autorizações.",
        "Plano Terapêutico abre o modal com a pré-visualização do PDF.",
      ],
    },
    {
      id: "agenda-pattern.plan",
      title: "Plano Terapêutico",
      route: AGENDA_PATTERN_PATH,
      fixture: "agenda-pattern.plan",
      persona: "admin",
      intent: "O modal Plano Terapêutico: a semana padrão do paciente numa folha A4, para enviar à operadora.",
      expected: [
        "Folha à esquerda: logo, Plano Terapêutico, Semana padrão de atendimentos; Paciente, Operadora Unimed, Unidade e Emitido em 02/10/2026.",
        "Totais: 13 sessões por semana, 13h de carga horária, 5 especialidades, 5 dias com atendimento.",
        "Carga por especialidade: serviços, profissionais e horas por semana, com o total.",
        "Rotina semanal: uma coluna por dia, cada sessão com horário, especialidade, serviço (· AT quando é AT) e profissional.",
        "À direita, Exibir profissionais (ligado), Exibir salas e Observações para a operadora; cada mudança atualiza a folha na hora.",
        "Zoom de 50% a 200% no canto da folha; clicar na porcentagem volta para 100%.",
        "Baixar PDF abre a impressão só com a folha, em A4 e sem margem. Fechar, Esc ou o X fecham o modal.",
      ],
    },
    {
      id: "agenda-pattern.plan-open-slots",
      title: "Plano Terapêutico › Sessões sem profissional",
      route: AGENDA_PATTERN_PATH,
      fixture: "agenda-pattern.plan-open-slots",
      persona: "admin",
      intent: "Sessões sem profissional definido aparecem como \"A definir\" na folha, e o painel avisa.",
      expected: [
        "Abaixo de Exibir profissionais, em laranja: 2 sessões sem profissional aparecem como \"A definir\".",
        "Na folha, \"A definir\" em laranja e itálico nas sessões e na tabela de carga.",
        "Desligar Exibir profissionais esconde o aviso e a coluna Profissionais.",
      ],
    },
    {
      id: "agenda-pattern.read-only",
      title: "Padrão de Agenda › Sem permissão de gerenciar",
      route: AGENDA_PATTERN_PATH,
      fixture: "agenda-pattern.map",
      persona: "supervisor",
      intent: "Sem hour_maps.manage_hour_map, a grade é só leitura, mas o Plano Terapêutico continua disponível.",
      expected: [
        "Sem Renovação Automática, Editar vigência, Propagar para Agenda e Editar Agendamentos.",
        "Células e cartões não abrem o modal de agendamento.",
        "Plano Terapêutico abre o modal normalmente.",
      ],
    },
  ],
  personas,
  fixtures: [...AGENDA_PATTERN_FIXTURES],
  routes: [
    {
      path: AGENDA_PATTERN_PATH,
      screen: AgendaPattern,
      name: "Padrão de Agenda do paciente",
      description: "A aba Padrão de Agenda do Mapa de Horas, com o novo Plano Terapêutico: a pré-visualização do PDF da semana padrão e o Baixar PDF.",
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
