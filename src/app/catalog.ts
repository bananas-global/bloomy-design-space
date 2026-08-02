import type { Fixture, Module, Persona, Rule, Scenario } from "@brucesantos/design-space";

import { personas } from "../personas/index.js";
import { agendaFixtures } from "../fixtures/agenda.js";
import { sessionFixtures } from "../fixtures/session.js";
import { programFixtures } from "../fixtures/programs.js";
import { protocolFixtures } from "../fixtures/protocols.js";
import { patientFixtures } from "../fixtures/patients.js";
import { financeFixtures } from "../fixtures/finance.js";
import { agendaRules } from "../rules/agenda.js";
import { sessionRules } from "../rules/session.js";
import { programRules } from "../rules/programs.js";
import { protocolRules } from "../rules/protocols.js";
import { patientRules } from "../rules/patients.js";
import { financeRules } from "../rules/finance.js";
import { agendaScenarios } from "../scenarios/agenda.js";
import { sessionScenarios } from "../scenarios/session.js";
import { programScenarios } from "../scenarios/programs.js";
import { protocolScenarios } from "../scenarios/protocols.js";
import { patientScenarios } from "../scenarios/patients.js";
import { financeScenarios } from "../scenarios/finance.js";

/**
 * Catálogo: tudo que descreve o produto **sem** tocar em React.
 *
 * A separação existe por um motivo concreto de ferramenta. O Playwright carrega
 * os arquivos de teste com esbuild puro, sem os plugins do Vite — então um
 * `import` de SVG ou de CSS na cadeia derruba a suíte inteira antes do primeiro
 * teste. Como o teste de jornada só precisa dos cenários para montar deep links,
 * importar o catálogo em vez da `ProductDefinition` mantém a cadeia livre de
 * componentes.
 *
 * O ganho secundário é conceitual: fica explícito o que é especificação e o que é
 * implementação. Um agente que vai criar um cenário mexe aqui; um que vai mudar
 * uma tela mexe em `routes`.
 */

export const modules: Module[] = [
  {
    id: "agenda",
    name: "Agenda",
    description: "O dia da clínica: marcar, confirmar, remarcar, cancelar e receber.",
    flows: [
      {
        id: "resolve-conflict",
        title: "Resolver um conflito de horário",
        description:
          "Da agenda com sobreposição até o reagendamento, com as duas saídas de bloqueio.",
        steps: [
          { scenario: "agenda.double-booking", label: "Ver o conflito na agenda" },
          {
            scenario: "agenda.reschedule-conflict",
            label: "Abrir o encaixe e reagendar",
            decision: "O horário escolhido está livre para a mesma profissional?",
            branches: {
              "Colide de novo": "agenda.double-booking",
              "Cancelar em vez de remarcar": "agenda.cancel-requires-reason",
            },
          },
        ],
      },
      {
        id: "handle-absence",
        title: "Registrar uma ausência",
        description: "A tolerância de 15 minutos como decisão de interface, não como cálculo.",
        steps: [
          { scenario: "agenda.day", label: "Ver o horário na agenda" },
          {
            scenario: "agenda.no-show-too-early",
            label: "Tentar registrar antes da tolerância",
            decision: "Passaram 15 minutos do horário marcado?",
            branches: {
              "Tolerância vencida": "agenda.no-show",
              "Perfil sem permissão": "agenda.cancel-no-permission",
            },
          },
        ],
      },
    ],
  },
  {
    id: "patients",
    name: "Pacientes",
    description: "Cadastro, responsável legal e acesso a prontuário.",
    flows: [
      {
        id: "schedule-eligibility",
        title: "Verificar se o paciente pode ser agendado",
        description:
          "Duas pendências que parecem uma: campo obrigatório em falta e responsável legal ausente.",
        steps: [
          { scenario: "patients.list", label: "Localizar o paciente" },
          {
            scenario: "patients.complete",
            label: "Abrir o cadastro",
            decision: "O cadastro tem pendência que bloqueie o agendamento?",
            branches: {
              "Falta campo obrigatório": "patients.incomplete",
              "Menor sem responsável": "patients.minor-without-guardian",
              "Prontuário restrito": "patients.restricted-record",
            },
          },
        ],
      },
    ],
  },
  {
    id: "finance",
    name: "Financeiro",
    description: "Guias, recusas de convênio e pendências de documentação.",
    flows: [
      {
        id: "recover-denied-claim",
        title: "Recuperar uma guia recusada",
        description:
          "Da fila até o reenvio: o caminho que decide se o faturamento vira receita ou perda.",
        steps: [
          { scenario: "finance.queue", label: "Escolher pela urgência" },
          {
            scenario: "finance.insurance-denied",
            label: "Ler a recusa e anexar o que falta",
            decision: "Toda a documentação exigida está anexada?",
            branches: {
              "Documentação completa": "finance.resubmit-allowed",
              "Pendência, não recusa": "finance.pending-documents",
              "Perfil sem permissão": "finance.resubmit-no-permission",
            },
          },
        ],
      },
    ],
  },
  {
    id: "session",
    name: "Atendimento",
    description:
      "A sessão de terapia: check-in, início, tentativas, evolução, assinatura e supervisão.",
    flows: [
      {
        id: "conduct-session",
        title: "Conduzir um atendimento do começo ao fim",
        description:
          "O caminho completo de uma sessão de paciente, com as três guardas de início e a cadeia de assinatura.",
        steps: [
          {
            scenario: "session.ready",
            label: "Abrir o atendimento com o paciente já na unidade",
            decision: "O paciente fez check-in e a profissional está livre?",
            branches: {
              "Falta check-in": "session.no-checkin",
              "Profissional com atendimento aberto": "session.professional-busy",
            },
          },
          { scenario: "session.running", label: "Registrar as tentativas durante a sessão" },
          {
            scenario: "session.pending-signature",
            label: "Finalizar e assinar",
            decision: "A evolução foi escrita?",
            branches: {
              "Evolução em branco": "session.pending-register",
              "Atendimento exige supervisão": "session.pending-supervisor",
            },
          },
          { scenario: "session.finished", label: "Ver o atendimento fechado" },
        ],
      },
      {
        id: "undo-session",
        title: "Desfazer um atendimento aberto por engano",
        description:
          "A janela em que reverter ainda não destrói registro clínico, e as duas saídas de bloqueio.",
        steps: [
          {
            scenario: "session.revert-allowed",
            label: "Reverter antes de qualquer tentativa",
            decision: "Já existe tentativa ou resposta de protocolo registrada?",
            branches: {
              "Há registro clínico": "session.revert-blocked",
              "Perfil sem permissão": "session.revert-no-permission",
            },
          },
        ],
      },
    ],
  },
  {
    id: "programs",
    name: "Programas",
    description:
      "O plano de intervenção: metas, objetivos, programas e passos — e como o Bloomy decide que o paciente aprendeu.",
    flows: [
      {
        id: "follow-acquisition",
        title: "Acompanhar a aquisição de um objetivo",
        description:
          "Do critério combinado até a cascata que fecha meta, objetivo e programa de uma vez.",
        steps: [
          { scenario: "programs.plan", label: "Ver o plano inteiro" },
          {
            scenario: "programs.mastery-criteria",
            label: "Ler o critério do passo em intervenção",
            decision: "O desempenho sustentou o critério ou caiu abaixo dele?",
            branches: {
              "Fecha o último passo": "programs.cascade",
              "Caiu abaixo do alvo": "programs.regression",
            },
          },
        ],
      },
    ],
  },
  {
    id: "protocols",
    name: "Protocolos",
    description:
      "A avaliação de onde o plano nasce: aplicação item a item, progresso por área e reavaliação.",
    flows: [
      {
        id: "apply-protocol",
        title: "Aplicar um protocolo em várias sessões",
        description:
          "Da aplicação em andamento até o fechamento, com a navegação que evita item pulado.",
        steps: [
          { scenario: "protocols.in-progress", label: "Ver o quanto já foi respondido" },
          {
            scenario: "protocols.resume",
            label: "Retomar no primeiro item em branco",
            decision: "O instrumento usa escala compartilhada ou faixa por item?",
            branches: {
              "Faixa por item": "protocols.abllsr",
              "Instrumento fechado": "protocols.finished",
            },
          },
        ],
      },
    ],
  },
];

export const scenarios: Scenario[] = [
  ...agendaScenarios,
  ...sessionScenarios,
  ...programScenarios,
  ...protocolScenarios,
  ...patientScenarios,
  ...financeScenarios,
];

export const fixtures: Fixture[] = [
  ...agendaFixtures,
  ...sessionFixtures,
  ...programFixtures,
  ...protocolFixtures,
  ...patientFixtures,
  ...financeFixtures,
] as Fixture[];

export const rules: Rule[] = [
  ...agendaRules,
  ...sessionRules,
  ...programRules,
  ...protocolRules,
  ...patientRules,
  ...financeRules,
];

export { personas };
export type { Persona };
