import type { Fixture, Module, Persona, Rule, Scenario } from "@brucesantos/design-space";

import { personas } from "../personas/index.js";
import { agendaFixtures } from "../fixtures/agenda.js";
import { sessionFixtures } from "../fixtures/session.js";
import { programFixtures } from "../fixtures/programs.js";
import { protocolFixtures } from "../fixtures/protocols.js";
import { inClinicFixtures } from "../fixtures/inClinic.js";
import { patientFixtures } from "../fixtures/patients.js";
import { authorizationFixtures } from "../fixtures/authorizations.js";
import { closureFixtures } from "../fixtures/closures.js";
import { invoiceFixtures } from "../fixtures/invoices.js";
import { teamFixtures } from "../fixtures/team.js";
import { publicPortalFixtures, npsFixtures } from "../fixtures/publicPortal.js";
import { guardianPortalFixtures } from "../fixtures/guardianPortal.js";
import { insurerPortalFixtures } from "../fixtures/insurerPortal.js";
import { structureFixtures } from "../fixtures/structure.js";
import { recordFixtures } from "../fixtures/record.js";
import { agendaRules } from "../rules/agenda.js";
import { sessionRules } from "../rules/session.js";
import { programRules } from "../rules/programs.js";
import { protocolRules } from "../rules/protocols.js";
import { inClinicRules } from "../rules/inClinic.js";
import { patientRules } from "../rules/patients.js";
import { authorizationRules } from "../rules/authorizations.js";
import { closureRules } from "../rules/closures.js";
import { invoiceRules } from "../rules/invoices.js";
import { teamRules } from "../rules/team.js";
import { publicPortalRules } from "../rules/publicPortal.js";
import { guardianPortalRules } from "../rules/guardianPortal.js";
import { insurerPortalRules } from "../rules/insurerPortal.js";
import { structureRules } from "../rules/structure.js";
import { recordRules } from "../rules/record.js";
import { agendaScenarios } from "../scenarios/agenda.js";
import { sessionScenarios } from "../scenarios/session.js";
import { programScenarios } from "../scenarios/programs.js";
import { protocolScenarios } from "../scenarios/protocols.js";
import { inClinicScenarios } from "../scenarios/inClinic.js";
import { patientScenarios } from "../scenarios/patients.js";
import { authorizationScenarios } from "../scenarios/authorizations.js";
import { closureScenarios } from "../scenarios/closures.js";
import { invoiceScenarios } from "../scenarios/invoices.js";
import { teamScenarios } from "../scenarios/team.js";
import { publicPortalScenarios } from "../scenarios/publicPortal.js";
import { guardianPortalScenarios } from "../scenarios/guardianPortal.js";
import { insurerPortalScenarios } from "../scenarios/insurerPortal.js";
import { structureScenarios } from "../scenarios/structure.js";
import { recordScenarios } from "../scenarios/record.js";

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
    id: "authorizations",
    name: "Autorizações",
    description:
      "O TISS: o que o convênio liberou, por quanto tempo vale, quantas sessões sobram e de quem é a próxima ação.",
    flows: [
      {
        id: "work-the-queue",
        title: "Trabalhar a fila da central",
        description:
          "Da fila ordenada por responsabilidade até as três razões pelas quais uma autorização deixa de servir.",
        steps: [
          { scenario: "authorizations.queue", label: "Ver o que espera ação da clínica" },
          {
            scenario: "authorizations.with-balance",
            label: "Conferir se serve para agendar",
            decision: "Qual das três condições falhou?",
            branches: {
              "Saldo esgotado num pacote": "authorizations.one-package-exhausted",
              "Fora da validade": "authorizations.expired",
              "Liberou menos que o pedido": "authorizations.partial",
            },
          },
        ],
      },
      {
        id: "not-a-denial",
        title: "Distinguir o que não é recusa",
        description:
          "Três situações que parecem negativa do convênio e pedem ações completamente diferentes.",
        steps: [
          {
            scenario: "authorizations.sync-error",
            label: "Ler o que a integração devolveu",
            decision: "A pendência é técnica, da clínica ou de quem pediu?",
            branches: {
              "Falta documento da clínica": "authorizations.waiting-documentation",
              "Perfil sem acesso à central": "authorizations.no-access",
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
  {
    id: "in-clinic",
    name: "Na Clínica",
    description:
      "O quadro da unidade: quem está presente agora, desde quando, e o que o check-in fez com a agenda do dia.",
    flows: [
      {
        id: "watch-the-floor",
        title: "Acompanhar o salão da unidade",
        description:
          "O quadro que a recepção mantém aberto, e o caso que exige alguém agir.",
        steps: [
          {
            scenario: "in-clinic.morning",
            label: "Ver quem está na unidade",
            decision: "Há alguém presente sem atendimento que possa começar?",
            branches: {
              "Presente e sem nada pronto": "in-clinic.nothing-ready",
              "Salão vazio": "in-clinic.empty",
            },
          },
        ],
      },
    ],
  },
  {
    id: "closures",
    name: "Fechamentos",
    description:
      "O pagamento mensal do profissional: sete etapas, e a cada uma a bola troca de lado.",
    flows: [
      {
        id: "close-the-month",
        title: "Fechar o mês de um profissional",
        description:
          "Da conferência da clínica até o pagamento confirmado, passando pelas duas etapas que são do profissional.",
        steps: [
          {
            scenario: "closures.wait-accept",
            label: "O profissional confere o valor",
            decision: "O contrato do mês exige nota fiscal?",
            branches: {
              "Exige nota": "closures.invoice-is-the-professionals",
              "Não exige": "closures.no-invoice-contract",
            },
          },
          {
            scenario: "closures.pay-without-proof",
            label: "Confirmar o pagamento",
            decision: "O comprovante já foi anexado?",
            branches: {
              "Comprovante anexado": "closures.pay-with-proof",
              "Já pago": "closures.paid-is-frozen",
            },
          },
        ],
      },
    ],
  },
  {
    id: "invoices",
    name: "Faturas",
    description:
      "O lote TISS enviado à operadora — e as duas maneiras de perder dinheiro sem receber aviso.",
    flows: [
      {
        id: "close-the-invoice",
        title: "Fechar a competência de uma operadora",
        description:
          "Da conferência das linhas até a geração do lote, com os dois cortes silenciosos do cálculo.",
        steps: [
          {
            scenario: "invoices.silent-losses",
            label: "Conferir o que entra e o que some",
            decision: "O que impede o fechamento?",
            branches: {
              "Faltam identificadores": "invoices.missing-fields",
              "Nada foi atendido": "invoices.nothing-executed",
              "Operadora sem códigos": "invoices.health-care-incomplete",
            },
          },
          { scenario: "invoices.ready", label: "Gerar o lote" },
        ],
      },
    ],
  },
  {
    id: "team",
    name: "Equipe",
    description:
      "Quem trabalha na clínica — e as decisões deste cadastro que aparecem no atendimento e no fechamento.",
    flows: [
      {
        id: "understand-the-links",
        title: "Entender o que o cadastro decide em outros módulos",
        description:
          "Dois elos que quem desenha atendimento e fechamento procura no lugar errado.",
        steps: [
          {
            scenario: "team.supervision-defines-signature",
            label: "Ver de onde vem a segunda assinatura",
            decision: "O que mais este cadastro decide fora daqui?",
            branches: {
              "A nota fiscal do fechamento": "team.no-invoice-contract",
              "Um espaço reservado na agenda": "team.tbd",
            },
          },
        ],
      },
    ],
  },
  {
    id: "public",
    name: "Portal público",
    description:
      "O totem de chegada e a pesquisa de satisfação — a única parte do Bloomy usada por quem não trabalha na clínica.",
    flows: [
      {
        id: "arrive-at-the-clinic",
        title: "Registrar a chegada pelo totem",
        description:
          "Três telas que não voltam, e as três falhas que exigem respostas diferentes de quem está na frente.",
        steps: [
          {
            scenario: "public.kiosk-identification",
            label: "Digitar o CPF do responsável",
            decision: "O que aconteceu com o CPF digitado?",
            branches: {
              "Números não fecham": "public.kiosk-invalid-cpf",
              "Correto e sem cadastro": "public.kiosk-guardian-not-found",
            },
          },
          {
            scenario: "public.kiosk-select-patient",
            label: "Escolher quem chegou",
            decision: "Há agendamento hoje nesta unidade?",
            branches: { "Nenhum hoje": "public.kiosk-no-patients" },
          },
          { scenario: "public.kiosk-complete", label: "Ver a confirmação" },
        ],
      },
    ],
  },
  {
    id: "guardian",
    name: "Portal da família",
    description:
      "O que o responsável legal alcança: o combinado, e o consentimento com o plano terapêutico do filho.",
    flows: [
      {
        id: "consent-to-the-plan",
        title: "Consentir com o plano do filho",
        description:
          "Ler o plano por inteiro e assinar — com as duas situações em que assinar não é possível.",
        steps: [
          {
            scenario: "guardian.plan-pending",
            label: "Ler o plano e assinar",
            decision: "O plano ainda vale, e é de um filho seu?",
            branches: {
              "Vigência encerrada": "guardian.plan-expired",
              "De outra família": "guardian.plan-other-family",
            },
          },
          { scenario: "guardian.plan-accepted", label: "Ver o registro do aceite" },
        ],
      },
    ],
  },
  {
    id: "insurer",
    name: "Portal da operadora",
    description:
      "A clínica vista de fora: lista de presença, o que conta como prestado, e o que não acompanha a cobrança.",
    flows: [
      {
        id: "reconcile-the-month",
        title: "Conferir a competência",
        description:
          "Da lista de presença até as duas razões pelas quais os números da clínica e os da operadora divergem.",
        steps: [
          {
            scenario: "insurer.attendance",
            label: "Conferir os atendimentos do mês",
            decision: "Por que o total não bate com o faturado?",
            branches: {
              "Atendimento sem fechar": "insurer.pending-closure",
              "Agendamento omitido pelo escopo": "insurer.hidden-incomplete",
            },
          },
        ],
      },
    ],
  },
  {
    id: "structure",
    name: "Estrutura",
    description:
      "Salas, serviços e bloqueios: a camada física que a agenda esbarra e que nenhuma tela de agendamento mostra.",
    flows: [
      {
        id: "why-cannot-schedule",
        title: "Descobrir por que um horário não pode ser marcado",
        description:
          "As três razões estruturais, que pedem ações diferentes: falta de sala, erro de cadastro e bloqueio.",
        steps: [
          {
            scenario: "structure.unit",
            label: "Ver a estrutura da unidade",
            decision: "O que impede marcar este serviço?",
            branches: {
              "Nenhuma sala do tipo": "structure.no-room-for-service",
              "Cadastro contraditório": "structure.impossible-service",
              "Horário bloqueado": "structure.blockings",
            },
          },
        ],
      },
    ],
  },
  {
    id: "record",
    name: "Prontuário",
    description:
      "Documentos com validade, anamnese e critérios de alerta — e os dois tipos de documento que ninguém abre.",
    flows: [
      {
        id: "keep-the-record-current",
        title: "Manter o prontuário em dia",
        description:
          "Do prontuário completo até as três coisas que exigem ação: documento vencendo, anamnese aberta e falta em excesso.",
        steps: [
          {
            scenario: "record.complete",
            label: "Ver o prontuário",
            decision: "O que exige ação agora?",
            branches: {
              "Documento vencendo": "record.documents-expiring",
              "Anamnese incompleta": "record.anamnese-incomplete",
              "Faltas acima do limite": "record.absence-alerts",
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
  ...inClinicScenarios,
  ...patientScenarios,
  ...authorizationScenarios,
  ...closureScenarios,
  ...invoiceScenarios,
  ...teamScenarios,
  ...publicPortalScenarios,
  ...guardianPortalScenarios,
  ...insurerPortalScenarios,
  ...structureScenarios,
  ...recordScenarios,
];

export const fixtures: Fixture[] = [
  ...agendaFixtures,
  ...sessionFixtures,
  ...programFixtures,
  ...protocolFixtures,
  ...inClinicFixtures,
  ...patientFixtures,
  ...authorizationFixtures,
  ...closureFixtures,
  ...invoiceFixtures,
  ...teamFixtures,
  ...publicPortalFixtures,
  ...npsFixtures,
  ...guardianPortalFixtures,
  ...insurerPortalFixtures,
  ...structureFixtures,
  ...recordFixtures,
] as Fixture[];

export const rules: Rule[] = [
  ...agendaRules,
  ...sessionRules,
  ...programRules,
  ...protocolRules,
  ...inClinicRules,
  ...patientRules,
  ...authorizationRules,
  ...closureRules,
  ...invoiceRules,
  ...teamRules,
  ...publicPortalRules,
  ...guardianPortalRules,
  ...insurerPortalRules,
  ...structureRules,
  ...recordRules,
];

export { personas };
export type { Persona };
