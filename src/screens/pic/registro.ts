import type { Feature } from "../../app/features.js";
import { BehaviorInterventionPlan, PIC_PATH } from "../BehaviorInterventionPlan.js";
import { PIC_FIXTURES } from "./fixtures.js";

/** PIC do paciente: a aba redesenhada e o Exportar PIC. */
export const feature: Feature = {
  scenarios: [
    {
      id: "pic.plan",
      title: "PIC › Plano aberto",
      route: PIC_PATH,
      fixture: "pic.plan",
      persona: "admin",
      intent: "A aba PIC redesenhada: vigências no cabeçalho, abas de especialidade e a grade Áreas → Objetivos → Programas, com o botão novo Exportar PDF.",
      expected: [
        "Cabeçalho: Plano de Intervenção Comportamental; Pré-visualizar, Exportar PDF (tint roxo), seletor Grade/Lista e a vigência 01/01/2026 – 30/06/2026 Em vigência.",
        "Abaixo, Plano Terapêutico 2026 · 1º Semestre, Criado por Marcus Vinícius Gimenes · Psicologia e Assinado por Fernanda Lima.",
        "Abas Todas, Fonoaudiologia, Psicologia (Você), Terapia Ocupacional, Análise do Comportamento e Psicopedagogia; cada uma filtra as áreas.",
        "Cada área com as pílulas de especialidade; áreas de mais de uma especialidade com Compartilhada.",
        "O seletor de vigência lista as três, com o nome e o status; Nova vigência no fim.",
        "Exportar PDF abre o modal Exportar PIC em tela cheia.",
      ],
    },
    {
      id: "pic.export",
      title: "Exportar PIC",
      route: PIC_PATH,
      fixture: "pic.export",
      persona: "admin",
      intent: "O modal Exportar PIC: a pré-visualização do PIC numa folha A4, para a família, a escola ou a operadora.",
      expected: [
        "Folha à esquerda: logo, Plano de Intervenção Comportamental, Todas as especialidades, Paciente, Vigência, Responsável técnico e Emitido em 02/06/2026.",
        "Totais: 5 áreas, 7 objetivos, 9 programas, 2 adquiridos. As áreas em duas colunas, com objetivos, programas e a fase atual de cada um.",
        "Autonomia e AVDs com a tag Adquirida. Rodapé com as linhas de assinatura do responsável técnico e do responsável legal.",
        "À direita, o select Especialidade e três switch_card: Incluir adquiridos, Descrições e Fase atual. Cada mudança atualiza a folha na hora.",
        "Zoom de 50% a 200% no canto da folha; clicar na porcentagem volta para 100%.",
        "Baixar PDF abre a impressão só com a folha, em A4 e sem margem. Fechar, Esc ou o X fecham o modal.",
      ],
    },
    {
      id: "pic.export-dense",
      title: "Exportar PIC › Não cabe em uma página",
      route: PIC_PATH,
      fixture: "pic.export-dense",
      persona: "admin",
      intent: "Com nove áreas, o texto da folha encolhe para caber em uma página, e o painel avisa.",
      expected: [
        "Abaixo das opções: \"Texto reduzido para N% para caber em uma página.\"",
        "Desligar Descrições ou filtrar por especialidade aumenta a porcentagem.",
        "No limite de 62% o aviso fica laranja: o conteúdo não cabe mesmo reduzido.",
      ],
    },
    {
      id: "pic.read-only",
      title: "PIC › Sem permissão de editar",
      route: PIC_PATH,
      fixture: "pic.plan",
      persona: "applicator",
      intent: "Quem aplica vê o PIC e pode exportá-lo, mas não edita (BehaviorInterventionPlanPolicy).",
      expected: ["Sem Áreas em lote, Novo, Importar e os menus de ação.", "Exportar PDF continua disponível."],
    },
  ],
  fixtures: [...PIC_FIXTURES],
  routes: [
    {
      path: PIC_PATH,
      screen: BehaviorInterventionPlan,
      name: "PIC do paciente",
      description: "A aba PIC da ficha do paciente redesenhada (vigências, especialidades), com o novo Exportar PDF: a pré-visualização do PIC em uma página e o Baixar PDF.",
    },
  ],
};
