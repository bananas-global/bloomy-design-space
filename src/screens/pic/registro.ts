import type { Feature } from "../../app/features.js";
import { BehaviorInterventionPlan, PIC_PATH } from "../BehaviorInterventionPlan.js";
import { PIC_FIXTURES } from "./fixtures.js";

/** PIC do paciente: a aba redesenhada e o Pré-visualizar. */
export const feature: Feature = {
  scenarios: [
    {
      id: "pic.plan",
      title: "PIC › Plano aberto",
      route: PIC_PATH,
      fixture: "pic.plan",
      persona: "admin",
      intent: "A aba PIC redesenhada: vigências no cabeçalho, abas de especialidade e a grade Áreas → Objetivos → Programas, com o botão Pré-visualizar.",
      expected: [
        "Cabeçalho: Plano de Intervenção Comportamental; Pré-visualizar, seletor Grade/Lista e a vigência 01/01/2026 – 30/06/2026 Em vigência.",
        "Abaixo, Plano Terapêutico 2026 · 1º Semestre, Criado por Marcus Vinícius Gimenes · Psicologia e Assinado por Fernanda Lima.",
        "Abas Todas, Fonoaudiologia, Psicologia (Você), Terapia Ocupacional, Análise do Comportamento e Psicopedagogia; cada uma filtra as áreas.",
        "Cada área com as pílulas de especialidade; áreas de mais de uma especialidade com Compartilhada.",
        "O seletor de vigência lista as três, com o nome e o status; Nova vigência no fim.",
        "Pré-visualizar abre a simulação do atendimento em tela cheia.",
      ],
    },
    {
      id: "pic.preview",
      title: "Pré-visualizar PIC",
      route: PIC_PATH,
      fixture: "pic.preview",
      persona: "admin",
      intent: "O modal Pré-visualizar, em tela cheia: simula o atendimento com todos os programas do plano, alvo a alvo, sem gravar nada.",
      expected: [
        "Cabeçalho: Pré-visualização do atendimento, Plano Terapêutico 2026 · 1º Semestre e Todas as especialidades; o X fecha.",
        "À esquerda, a Fila de alvos com os 9 programas: nome, área · fase e o tipo de registro. O alvo atual fica destacado.",
        "Tentativas discretas: abas de fase, Nível de ajuda simulado (AV → I) na Intervenção e os botões Erro, Ajuda e Independente. Com 10 tentativas aparece o resultado: avança, mantém ou volta.",
        "Duração: cronômetro com Iniciar/Parar e a meta 01:00. Frequência: contador com Finalizar intervalo.",
        "Programa adquirido mostra o card Adquirido, sem aplicação.",
        "Rodapé: Alvo N de 9, a barra de alvos concluídos, Anterior e Próximo alvo; no último, Encerrar simulação.",
        "Filtrar a aba por especialidade antes de abrir limita a fila aos programas dela.",
      ],
    },
    {
      id: "pic.preview-empty",
      title: "Pré-visualizar PIC › Sem programas",
      route: PIC_PATH,
      fixture: "pic.preview-empty",
      persona: "admin",
      intent: "Plano sem programas: o modal avisa que não há o que simular.",
      expected: ["\"Este plano ainda não tem programas para simular.\" no lugar da fila e da simulação."],
    },
    {
      id: "pic.read-only",
      title: "PIC › Sem permissão de editar",
      route: PIC_PATH,
      fixture: "pic.plan",
      persona: "applicator",
      intent: "Quem aplica vê o PIC e pode pré-visualizá-lo, mas não edita (BehaviorInterventionPlanPolicy).",
      expected: ["Sem Áreas em lote, Novo, Importar e os menus de ação.", "Pré-visualizar continua disponível."],
    },
  ],
  fixtures: [...PIC_FIXTURES],
  routes: [
    {
      path: PIC_PATH,
      screen: BehaviorInterventionPlan,
      name: "PIC do paciente",
      description: "A aba PIC da ficha do paciente redesenhada (vigências, especialidades), com o Pré-visualizar: a simulação do atendimento em tela cheia.",
    },
  ],
};
