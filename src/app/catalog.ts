import type { Fixture, Module, Persona, Rule, Scenario } from "@brucesantos/design-space";

import { personas } from "../personas/index.js";
import { agendaFixtures } from "../fixtures/agenda.js";
import { patientFixtures } from "../fixtures/patients.js";
import { financeFixtures } from "../fixtures/finance.js";
import { agendaRules } from "../rules/agenda.js";
import { patientRules } from "../rules/patients.js";
import { financeRules } from "../rules/finance.js";
import { agendaScenarios } from "../scenarios/agenda.js";
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
];

export const scenarios: Scenario[] = [
  ...agendaScenarios,
  ...patientScenarios,
  ...financeScenarios,
];

export const fixtures: Fixture[] = [
  ...agendaFixtures,
  ...patientFixtures,
  ...financeFixtures,
] as Fixture[];

export const rules: Rule[] = [...agendaRules, ...patientRules, ...financeRules];

export { personas };
export type { Persona };
