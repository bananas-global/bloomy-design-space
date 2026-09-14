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
import {
  insurerListFixtures,
  professionalDocumentFixtures,
  teamDocumentationFixtures,
  unitListFixtures,
} from "../fixtures/documents.js";
import { publicPortalFixtures, npsFixtures } from "../fixtures/publicPortal.js";
import { guardianPortalFixtures } from "../fixtures/guardianPortal.js";
import { insurerPortalFixtures } from "../fixtures/insurerPortal.js";
import { structureFixtures } from "../fixtures/structure.js";
import { recordFixtures } from "../fixtures/record.js";
import { managementFixtures } from "../fixtures/management.js";
import { hourMapFixtures } from "../fixtures/hourMap.js";
import { chatFixtures } from "../fixtures/chat.js";
import { prospectFixtures } from "../fixtures/prospects.js";
import { leadFixtures } from "../fixtures/leads.js";
import { pushFixtures } from "../fixtures/push.js";
import { callFixtures } from "../fixtures/calls.js";
import { transferFixtures } from "../fixtures/transfers.js";
import { reportFixtures } from "../fixtures/reports.js";
import { notificationFixtures } from "../fixtures/notifications.js";
import { supervisionFixtures, supervisionTeamFixtures } from "../fixtures/supervision.js";
import { unitMapFixtures } from "../fixtures/unitMap.js";
import { clinicalHourFixtures } from "../fixtures/clinicalHours.js";
import { newAppointmentFixtures } from "../fixtures/newAppointment.js";
import { therapyPhaseFixtures, deactivationFixtures } from "../fixtures/therapyPhases.js";
import { patientGapFixtures } from "../fixtures/patientGaps.js";
import { overdueFixtures } from "../fixtures/overdue.js";
import { coverageFixtures } from "../fixtures/coverage.js";
import { closureGenerationFixtures } from "../fixtures/closureGeneration.js";
import { absenceOriginFixtures } from "../fixtures/absenceOrigin.js";
import { autoCheckoutFixtures } from "../fixtures/autoCheckout.js";
import { authorizationRenewalFixtures } from "../fixtures/authorizationRenewal.js";
import { fieldOrderingFixtures } from "../fixtures/fieldOrdering.js";
import { deactivationDateFixtures } from "../fixtures/deactivationDate.js";
import { autoCheckinFixtures } from "../fixtures/autoCheckin.js";
import { handoverFixtures } from "../fixtures/handover.js";
import { patientScopeFixtures } from "../fixtures/patientScope.js";
import { planSignatureFixtures } from "../fixtures/planSignature.js";
import { todayInUtcFixtures } from "../fixtures/todayInUtc.js";
import { patientAddressFixtures } from "../fixtures/patientAddress.js";
import { meetingSummaryFixtures } from "../fixtures/meetingSummary.js";
import { tissBatchFixtures } from "../fixtures/tissBatch.js";
import { distributionFixtures } from "../fixtures/distribution.js";
import {
  agendaRules,
  schedulingRules,
  absenceRules,
  absenceOriginRules,
} from "../rules/agenda.js";
import { overdueRules, supervisorOverdueRules } from "../rules/overdue.js";
import { coverageRules } from "../rules/coverage.js";
import { closureGenerationRules } from "../rules/closureGeneration.js";
import { fieldOrderingRules } from "../rules/fieldOrdering.js";
import { deactivationDateRules } from "../rules/deactivationDate.js";
import { autoCheckinRules } from "../rules/autoCheckin.js";
import { handoverRules } from "../rules/handover.js";
import { patientScopeRules } from "../rules/patientScope.js";
import { planSignatureRules } from "../rules/planSignature.js";
import { todayInUtcRules } from "../rules/todayInUtc.js";
import { patientAddressRules } from "../rules/patientAddress.js";
import { appointmentRowRules, meetingSummaryRules } from "../rules/meetingSummary.js";
import { tissBatchRules } from "../rules/tissBatch.js";
import { distributionRules } from "../rules/distribution.js";
import { sessionRules } from "../rules/session.js";
import { programRules } from "../rules/programs.js";
import { protocolRules } from "../rules/protocols.js";
import { inClinicRules } from "../rules/inClinic.js";
import { autoCheckoutRules } from "../rules/autoCheckout.js";
import {
  patientRules,
  therapyPhaseRules,
  patientGapRules,
  deactivationPathRules,
} from "../rules/patients.js";
import { authorizationRules, authorizationRenewalRules } from "../rules/authorizations.js";
import { closureRules } from "../rules/closures.js";
import { invoiceRules } from "../rules/invoices.js";
import { teamRules } from "../rules/team.js";
import { publicPortalRules } from "../rules/publicPortal.js";
import { guardianPortalRules } from "../rules/guardianPortal.js";
import { insurerPortalRules } from "../rules/insurerPortal.js";
import { structureRules } from "../rules/structure.js";
import { recordRules } from "../rules/record.js";
import { managementRules } from "../rules/management.js";
import { hourMapRules, hourMapExpiryRules } from "../rules/hourMap.js";
import { chatRules } from "../rules/chat.js";
import { prospectRules } from "../rules/prospects.js";
import { leadRules } from "../rules/leads.js";
import { pushRules } from "../rules/push.js";
import { callRules } from "../rules/calls.js";
import { transferRules } from "../rules/transfers.js";
import { reportRules } from "../rules/reports.js";
import { notificationRules } from "../rules/notifications.js";
import { supervisionRules, supervisionTeamRules } from "../rules/supervision.js";
import { unitMapRules } from "../rules/unitMap.js";
import { clinicalHourRules, clinicalHourPaginationRules } from "../rules/clinicalHours.js";
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
import { documentScenarios } from "../scenarios/documents.js";
import { publicPortalScenarios } from "../scenarios/publicPortal.js";
import { guardianPortalScenarios } from "../scenarios/guardianPortal.js";
import { insurerPortalScenarios } from "../scenarios/insurerPortal.js";
import { structureScenarios } from "../scenarios/structure.js";
import { recordScenarios } from "../scenarios/record.js";
import { managementScenarios } from "../scenarios/management.js";
import { hourMapScenarios } from "../scenarios/hourMap.js";
import { chatScenarios } from "../scenarios/chat.js";
import { prospectScenarios } from "../scenarios/prospects.js";
import { leadScenarios } from "../scenarios/leads.js";
import { pushScenarios } from "../scenarios/push.js";
import { callScenarios } from "../scenarios/calls.js";
import { transferScenarios } from "../scenarios/transfers.js";
import { reportScenarios } from "../scenarios/reports.js";
import { notificationScenarios } from "../scenarios/notifications.js";
import { supervisionScenarios } from "../scenarios/supervision.js";
import { unitMapScenarios } from "../scenarios/unitMap.js";
import { clinicalHourScenarios } from "../scenarios/clinicalHours.js";
import { newAppointmentScenarios } from "../scenarios/newAppointment.js";
import { therapyPhaseScenarios } from "../scenarios/therapyPhases.js";
import { patientGapScenarios } from "../scenarios/patientGaps.js";
import { overdueScenarios } from "../scenarios/overdue.js";
import { coverageScenarios } from "../scenarios/coverage.js";
import { closureGenerationScenarios } from "../scenarios/closureGeneration.js";
import { absenceOriginScenarios } from "../scenarios/absenceOrigin.js";
import { autoCheckoutScenarios } from "../scenarios/autoCheckout.js";
import { authorizationRenewalScenarios } from "../scenarios/authorizationRenewal.js";
import { fieldOrderingScenarios } from "../scenarios/fieldOrdering.js";
import { deactivationDateScenarios } from "../scenarios/deactivationDate.js";
import { autoCheckinScenarios } from "../scenarios/autoCheckin.js";
import { handoverScenarios } from "../scenarios/handover.js";
import { patientScopeScenarios } from "../scenarios/patientScope.js";
import { planSignatureScenarios } from "../scenarios/planSignature.js";
import { todayInUtcScenarios } from "../scenarios/todayInUtc.js";
import { patientAddressScenarios } from "../scenarios/patientAddress.js";
import { meetingSummaryScenarios } from "../scenarios/meetingSummary.js";
import { tissBatchScenarios } from "../scenarios/tissBatch.js";
import { distributionScenarios } from "../scenarios/distribution.js";

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
        id: "schedule-something",
        title: "Marcar um atendimento",
        description:
          "As sete verificações do sistema real, e o custo de recebê-las uma por vez.",
        steps: [
          {
            scenario: "agenda.new-four-impediments",
            label: "Tentar marcar um horário com problema",
            decision: "O que impede este horário?",
            branches: {
              "O profissional está desativado": "agenda.new-inactive-professional",
              "A sala parecia cheia e não está": "agenda.new-room-has-room",
              "Não tem sala, e não precisa ter": "agenda.new-therapeutic-companion",
            },
          },
        ],
      },
      {
        id: "where-absences-come-from",
        title: "Descobrir de onde vêm as ausências",
        description:
          "Três origens somadas num número só, e a menos parecida com ausência é fabricada por um worker.",
        steps: [
          {
            scenario: "agenda.absence-origins",
            label: "Separar as três origens",
            decision: "E quando elas não se misturam?",
            branches: {
              "Todas observadas": "agenda.absence-all-observed",
            },
          },
        ],
      },
      {
        id: "chase-what-is-late",
        title: "Cobrar o que está atrasado",
        description:
          "Duas definições de atraso na mesma palavra, e a etapa que some das duas listas.",
        steps: [
          {
            scenario: "agenda.overdue-as-coordinator",
            label: "Ver a lista da coordenação",
            decision: "Por que a outra pessoa vê uma lista diferente?",
            branches: {
              "Ela usa a folga de 48 horas": "agenda.overdue-as-everyone-else",
              "Hoje as duas concordam": "agenda.overdue-in-agreement",
              "Sou supervisor e vejo outra conta": "agenda.overdue-supervisor-query",
            },
          },
        ],
      },
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
    description:
      "Cadastro, responsável legal, prontuário — e o percurso terapêutico, que é por especialidade.",
    flows: [
      {
        id: "follow-the-course",
        title: "Acompanhar o percurso terapêutico",
        description:
          "A fase é do par paciente + especialidade. Um campo único obrigaria a escolher qual delas mente.",
        steps: [
          {
            scenario: "patients.phases-uneven",
            label: "Ver as quatro especialidades lado a lado",
            decision: "Este percurso está registrado ou só parece estar?",
            branches: {
              "Tudo em ambientação": "patients.phases-all-beginning",
              "Nenhuma fase registrada": "patients.phases-empty",
            },
          },
        ],
      },
      {
        id: "find-what-is-missing",
        title: "Descobrir o que falta e não bloqueia",
        description:
          "A consulta existe no sistema real e nenhuma tela faz a pergunta.",
        steps: [
          {
            scenario: "patients.gaps-by-consequence",
            label: "Ver as pendências por consequência",
            decision: "Esta lacuna é de quem?",
            branches: {
              "É clínica": "patients.gaps-clinical",
              "Não bloqueia nada, e por isso fica": "patients.gaps-block-nothing",
            },
          },
        ],
      },
      {
        id: "deactivate-a-patient",
        title: "Inativar um paciente",
        description:
          "A ação mais destrutiva do produto, com os números antes da confirmação.",
        steps: [
          {
            scenario: "patients.deactivation-impact",
            label: "Ver o que a inativação vai apagar",
            decision: "O que mais acontece que não está na data escolhida?",
            branches: {
              "O corte pega a véspera": "patients.deactivation-eve",
              "O caminho automático apaga vínculos": "patients.deactivation-by-worker",
              "A data futura não adia": "patients.deactivation-scheduled",
            },
          },
        ],
      },
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
        id: "check-coverage",
        title: "Conferir a vigência dos planos",
        description:
          "O filtro por operadora reconhece duas das quatro combinações de datas.",
        steps: [
          {
            scenario: "authorizations.coverage-half-filled",
            label: "Ver as quatro combinações lado a lado",
            decision: "Há o que corrigir?",
            branches: {
              "Todas estão completas": "authorizations.coverage-well-formed",
              "A janela vai renovar vazia": "authorizations.renewal-into-empty",
              "Faltou guia para o dia": "authorizations.distribution-short",
            },
          },
        ],
      },
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
        id: "meeting-summary-at-3am",
        title: "Descobrir quem reescreve o registro da reunião",
        description:
          "O resumo oficial é redigido por uma rotina de madrugada, marcado como revisado por ela mesma, e comentar é o que agenda a próxima reescrita.",
        steps: [
          {
            scenario: "session.meeting-summary-overwrites-a-person",
            label: "Ver a fila antes de ela rodar",
            decision: "O que mais essa fila carrega?",
            branches: {
              "Uma reunião que tenta há semanas": "session.meeting-summary-stuck-forever",
              "Um comentário virou instrução": "session.meeting-summary-comment-as-instruction",
              "O prontuário já veio de um pedido assim":
                "session.meeting-summary-already-generated",
              "A noite inteira travou num registro só":
                "session.meeting-summary-blocked-night",
              "Madrugada sem fila": "session.meeting-summary-nothing-queued",
            },
          },
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
        id: "close-the-list",
        title: "Fechar a lista de presenças",
        description:
          "A rotina limpa a lista de quem está na clínica — e carimba a duração junto.",
        steps: [
          {
            scenario: "in-clinic.auto-checkout-absurd",
            label: "Ver o que a rotina vai declarar",
            decision: "E quando ela faz só o que promete?",
            branches: {
              "Só check-ins de hoje": "in-clinic.auto-checkout-clean",
              "Depois de rodar, quem fechou o quê": "in-clinic.auto-checkout-signed",
            },
          },
        ],
      },
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
        id: "generate-the-month",
        title: "Gerar os fechamentos do mês",
        description:
          "A rotina que roda sozinha, e as três decisões dela que custam dinheiro sem produzir erro.",
        steps: [
          {
            scenario: "closures.generation-with-losses",
            label: "Ver o que a virada perdeu",
            decision: "E quando a virada corre bem?",
            branches: {
              "Nenhuma perda": "closures.generation-clean",
              "O lote não foi enviado": "closures.tiss-batch-lost",
            },
          },
        ],
      },
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
    name: "Profissionais",
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
    id: "documents",
    name: "Documentos",
    description:
      "A documentação que a clínica precisa manter em dia — do profissional, da operadora e da unidade.",
    flows: [
      {
        id: "keep-documents-in-order",
        title: "Manter a documentação em dia",
        description:
          "Três frentes da mesma tarefa. As variações de cada tela ficam no seletor de dados.",
        steps: [
          { scenario: "documents.professional", label: "Da lista da equipe à pasta de uma pessoa" },
          { scenario: "documents.insurer", label: "Da lista de convênios à ficha de um deles" },
          { scenario: "documents.unit", label: "Da lista de unidades à pasta de uma delas" },
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
    name: "Unidades",
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
  {
    id: "management",
    name: "Listas gerenciais",
    description:
      "Reorganização aprovada da navegação das onze listas existentes, sem mudar seu conteúdo.",
    flows: [
      {
        id: "reorganize-management-tabs",
        title: "Reorganizar as abas",
        description: "Agrupar as onze abas atuais por contexto de trabalho.",
        steps: [
          {
            scenario: "management.grouped-navigation",
            label: "Consultar a navegação aprovada",
          },
        ],
      },
    ],
  },
  {
    id: "hour-map",
    name: "Mapa de horas",
    description:
      "A semana pretendida do paciente — e o que o sistema faz quando não consegue materializá-la.",
    flows: [
      {
        id: "draw-and-apply",
        title: "Desenhar e aplicar a semana",
        description:
          "Do desenho até a aplicação, com os conflitos que criam horários incompletos em vez de falhar.",
        steps: [
          {
            scenario: "hour-map.with-conflicts",
            label: "Conferir o que vai nascer incompleto",
            decision: "Que tipo de conflito é este?",
            branches: {
              "Cadastro faltando": "hour-map.no-agenda-is-not-a-clash",
              "Perde profissional e sala": "hour-map.loses-both",
            },
          },
          { scenario: "hour-map.applied", label: "Ver o mapa depois de aplicado" },
        ],
      },
    ],
  },
  {
    id: "chat",
    name: "Chat do caso",
    description:
      "A coordenação escrita entre especialidades — registro permanente, não mensageiro.",
    flows: [
      {
        id: "coordinate-the-case",
        title: "Coordenar um caso por escrito",
        description:
          "Da conversa da semana até as duas coisas que a tela precisa avisar antes do envio.",
        steps: [
          {
            scenario: "chat.week",
            label: "Ler o que a equipe registrou",
            decision: "O que a tela precisa avisar antes de eu enviar?",
            branches: {
              "Que não dá para corrigir": "chat.permanence-before-sending",
              "Que a menção não vai chegar": "chat.mention-without-access",
            },
          },
        ],
      },
    ],
  },
  {
    id: "prospects",
    name: "Visitas",
    description:
      "O funil de quem ainda não é paciente — e a coleta de dados que a conversão exige e a visita não faz.",
    flows: [
      {
        id: "convert-a-visit",
        title: "Levar uma visita até virar paciente",
        description:
          "Do funil até a conversão, com as duas coisas que travam no fim e podiam ser coletadas no começo.",
        steps: [
          {
            scenario: "prospects.funnel",
            label: "Ver onde o funil perde gente",
            decision: "O que impede este contato de avançar?",
            branches: {
              "Faltam dados da conversão": "prospects.conversion-needs-more",
              "Sem janela para marcar": "prospects.no-availability",
              "Parado há semanas": "prospects.stalled",
            },
          },
        ],
      },
      // As três jornadas abaixo descrevem o CRM **proposto**, mas hoje pertencem
      // ao baseline `ported`: nada disso existe no monólito nem está em trabalho
      // ativo.
      {
        id: "work-the-lead-funnel",
        title: "Trabalhar o funil de leads (proposta)",
        description:
          "Do card no quadro até a conversão, passando pelos dois estados que hoje ninguém enxerga: sem próxima ação e fora do SLA.",
        steps: [
          {
            scenario: "prospects.crm-funnel",
            label: "Ler o quadro do funil",
            decision: "O que impede este lead de avançar?",
            branches: {
              "Ninguém está com ele": "prospects.crm-no-next-action",
              "Chegou e ficou em silêncio": "prospects.crm-first-contact-sla",
              "Falta a qualificação": "prospects.crm-advance-needs-qualification",
              "Quero ver a conversa inteira": "prospects.crm-lead-profile",
            },
          },
          {
            scenario: "prospects.crm-lead-profile",
            label: "Abrir o perfil e decidir a próxima ligação",
            decision: "Como este lead sai do funil?",
            branches: {
              "Virou paciente": "prospects.crm-lead-converted",
              "Foi perdido, e voltou": "prospects.crm-reopen-lost",
            },
          },
        ],
      },
      {
        id: "capture-leads-without-typing",
        title: "Captar sem digitar (proposta)",
        description:
          "As duas portas de entrada que substituem a digitação: a planilha da operadora e os canais que mandam lead sozinhos.",
        steps: [
          {
            scenario: "prospects.crm-import-review",
            label: "Revisar a planilha antes de importar",
            decision: "O que atrapalha a importação?",
            branches: {
              "As colunas não fecham": "prospects.crm-import-invalid-mapping",
              "Quero salvar o de/para": "prospects.crm-import-mapping",
              "De qual lote veio cada lead": "prospects.crm-import-history",
            },
          },
          {
            scenario: "prospects.crm-integrations",
            label: "Conferir por onde os leads entram",
            decision: "E quando alguém digita à mão?",
            branches: {
              "Registro rápido na recepção": "prospects.crm-new-lead-minimal",
              "Já existe alguém com esse telefone": "prospects.crm-duplicate-lead",
              "Na verdade já é paciente": "prospects.crm-duplicate-patient",
            },
          },
        ],
      },
      {
        id: "read-the-lead-funnel",
        title: "Descobrir onde o funil vaza (proposta)",
        description:
          "A leitura que justifica o CRM — e a distinção entre alcançar uma etapa e estar parado nela, que decide se o painel manda consertar o que funciona.",
        steps: [
          {
            scenario: "prospects.crm-dashboard",
            label: "Ler o funil, os motivos de perda e as origens",
            decision: "E na operação do dia?",
            branches: {
              "Quem eu ligo agora": "prospects.crm-tasks",
              "Quero mexer em trinta de uma vez": "prospects.crm-list",
              "O recorte não tem ninguém": "prospects.crm-dashboard-empty",
            },
          },
        ],
      },
    ],
  },
  {
    id: "reports",
    name: "Relatórios",
    description:
      "Os documentos que saem da clínica — sete tipos, destinos diferentes, e um botão só.",
    flows: [
      {
        id: "issue-a-document",
        title: "Emitir um documento sobre o paciente",
        description:
          "Da lista até as duas coisas que a tela precisa avisar antes de o papel sair da clínica.",
        steps: [
          {
            scenario: "reports.list",
            label: "Escolher o tipo e ver para onde vai",
            decision: "O que precisa ser conferido antes de gerar?",
            branches: {
              "Declaração incompleta": "reports.declaration-incomplete",
              "Conteúdo clínico numa declaração": "reports.declaration-with-clinical",
              "Perfil emite e não lê": "reports.issuing-without-reading",
            },
          },
        ],
      },
    ],
  },
  {
    id: "notifications",
    name: "Notificações",
    description:
      "Quatro avisos no produto inteiro — e três deles chegam sem levar a lugar nenhum.",
    flows: [
      {
        id: "read-what-arrived",
        title: "Ler o que chegou",
        description:
          "Da lista até as três coisas que o sino faz e ninguém decidiu: não levar, não identificar e entregar conteúdo clínico.",
        steps: [
          {
            scenario: "notifications.unread-list",
            label: "Ver o que o sistema avisa",
            decision: "O que esta notificação não resolve?",
            branches: {
              "Não leva ao agendamento": "notifications.leads-nowhere",
              "Leva a uma tela que não abre": "notifications.target-does-not-open",
              "Entrega dado clínico sem checar": "notifications.clinical-text-without-check",
            },
          },
        ],
      },
    ],
  },
  {
    id: "supervision",
    name: "Supervisão",
    description:
      "A tela que leva o nome do supervisor e não abre para ele — uma visão da coordenação.",
    flows: [
      {
        id: "supervise-the-team",
        title: "Supervisionar a equipe pelas três pontas da relação",
        description:
          "Uma tela: supervisor, aplicador e paciente como três entradas para a mesma relação, com a segunda assinatura revisada uma por uma. As variações — a carteira de quem supervisiona, a fila vazia — ficam no seletor de dados.",
        steps: [
          { scenario: "supervision.team", label: "Abrir a equipe e filtrar por qualquer coluna" },
        ],
      },
      {
        id: "follow-the-supervised",
        title: "Acompanhar quem é supervisionado",
        description:
          "Do período padrão até as três coisas que a tela atual não diz: quem ela atende, o que está parado e quem ela perde.",
        steps: [
          {
            scenario: "supervision.default-period",
            label: "Abrir a supervisão como o sistema a abre",
            decision: "O que esta tela não está me contando?",
            branches: {
              "O que está parado esperando assinatura": "supervision.awaiting-signature",
              "Que ela não é do supervisor": "supervision.not-for-the-supervisor",
              "Quem sumiu da lista": "supervision.supervisor-without-links",
            },
          },
        ],
      },
    ],
  },
  {
    id: "unit-map",
    name: "Mapa da unidade",
    description:
      "A única tela sobre capacidade — e as três maneiras que ela tem de mostrar zero.",
    flows: [
      {
        id: "find-where-someone-fits",
        title: "Descobrir onde cabe mais alguém",
        description:
          "Da semana da unidade até os três zeros que pedem ações opostas, e a faixa que o mapa perde.",
        steps: [
          {
            scenario: "unit-map.week",
            label: "Ler a semana por profissional",
            decision: "Este zero quer dizer o quê?",
            branches: {
              "Falta cadastrar a agenda": "unit-map.no-agenda-is-not-zero",
              "Falta olhar a faixa que sumiu": "unit-map.lost-hour",
              "A hora já está tomada três vezes": "unit-map.crowded-hour",
            },
          },
        ],
      },
    ],
  },
  {
    id: "clinical-hours",
    name: "Controle de horas",
    description:
      "A tela em que um erro vira dinheiro — e os cinco erros que ela comete em silêncio.",
    flows: [
      {
        id: "check-a-day",
        title: "Conferir um dia de trabalho",
        description:
          "Da semana até os quatro silêncios: o truncamento, a verificação que não aconteceu, a faixa invertida e a previsão sem fim.",
        steps: [
          {
            scenario: "clinical-hours.week",
            label: "Ler a semana",
            decision: "Este número está certo?",
            branches: {
              "Meia hora sumiu no arredondamento": "clinical-hours.truncation",
              "Ninguém sabe onde a pessoa estava": "clinical-hours.unverified",
              "A saída é anterior à entrada": "clinical-hours.reversed",
              "A previsão não tem fim": "clinical-hours.incomplete-expected",
            },
          },
        ],
      },
    ],
  },
  {
    id: "push",
    name: "Central de PUSH",
    description:
      "O que a clínica fala com as famílias pelo aplicativo: o aviso que sai, quem leu, quem deu ciência — e a pesquisa que vira fila de tratativa.",
    flows: [
      {
        id: "say-something-to-every-family",
        title: "Avisar as famílias",
        description:
          "Do texto com variável até a entrega conferida, com o único bloqueio duro da área no meio do caminho.",
        steps: [
          {
            scenario: "push.broadcast",
            label: "Escrever, escolher o público e disparar",
          },
        ],
      },
      {
        id: "work-the-detractors",
        title: "Trabalhar os detratores",
        description:
          "A nota baixa com dono: entra na fila, muda de estado, e só sai por tratativa concluída.",
        steps: [{ scenario: "push.broadcast", label: "Ler a queda e assumir o contato" }],
      },
    ],
  },
  {
    id: "calls",
    name: "Gestão de Chamadas",
    description:
      "Os anúncios por voz da unidade: quem chamar, por qual motivo, e em qual caixa a frase é falada.",
    flows: [
      {
        id: "call-who-is-waiting",
        title: "Chamar quem está esperando",
        description:
          "A fila ordenada por espera, com a frase pronta em cada cartão antes de qualquer ação.",
        /* Um passo, e sem ramificação: a situação do campo em falta deixou de
           ser cenário próprio na revisão de 08/09 e virou critério de
           `calls.queue`. Uma ramificação que aponta para cenário inexistente é
           erro duro do `validateProduct`, e apontar para o próprio passo seria
           laço — então a decisão saiu junto com o destino dela. */
        steps: [
          {
            scenario: "calls.queue",
            label: "Ler a fila por tempo de espera",
          },
        ],
      },
    ],
  },
  {
    id: "transfers",
    name: "Central de Transferências",
    description:
      "A movimentação em bloco dos mapas de horas: quem recebe o quê, o que não cabe, e o que fica na fila para a próxima rodada.",
    flows: [
      {
        id: "move-what-an-inactivation-left",
        title: "Movimentar o que uma inativação deixou",
        description:
          "Da lista com os mapas sem profissional até a fila zerada — passando pela descoberta de que a seleção disputa consigo mesma.",
        steps: [
          {
            scenario: "transfers.queue",
            label: "Selecionar, simular e aplicar a rodada",
            decision: "E se não houver outro profissional da especialidade?",
            branches: {
              "Registrar a exceção e o motivo": "transfers.cross-specialty",
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
  ...documentScenarios,
  ...publicPortalScenarios,
  ...guardianPortalScenarios,
  ...insurerPortalScenarios,
  ...structureScenarios,
  ...recordScenarios,
  ...managementScenarios,
  ...hourMapScenarios,
  ...chatScenarios,
  ...prospectScenarios,
  ...leadScenarios,
  ...pushScenarios,
  ...callScenarios,
  ...transferScenarios,
  ...reportScenarios,
  ...notificationScenarios,
  ...supervisionScenarios,
  ...unitMapScenarios,
  ...clinicalHourScenarios,
  ...newAppointmentScenarios,
  ...therapyPhaseScenarios,
  ...patientGapScenarios,
  ...overdueScenarios,
  ...coverageScenarios,
  ...closureGenerationScenarios,
  ...absenceOriginScenarios,
  ...autoCheckoutScenarios,
  ...authorizationRenewalScenarios,
  ...fieldOrderingScenarios,
  ...deactivationDateScenarios,
  ...autoCheckinScenarios,
  ...handoverScenarios,
  ...patientScopeScenarios,
  ...planSignatureScenarios,
  ...todayInUtcScenarios,
  ...patientAddressScenarios,
  ...meetingSummaryScenarios,
  ...tissBatchScenarios,
  ...distributionScenarios,
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
  ...professionalDocumentFixtures,
  ...insurerListFixtures,
  ...teamDocumentationFixtures,
  ...unitListFixtures,
  ...publicPortalFixtures,
  ...npsFixtures,
  ...guardianPortalFixtures,
  ...insurerPortalFixtures,
  ...structureFixtures,
  ...recordFixtures,
  ...managementFixtures,
  ...hourMapFixtures,
  ...chatFixtures,
  ...prospectFixtures,
  ...leadFixtures,
  ...pushFixtures,
  ...callFixtures,
  ...transferFixtures,
  ...reportFixtures,
  ...notificationFixtures,
  ...supervisionFixtures,
  ...supervisionTeamFixtures,
  ...unitMapFixtures,
  ...clinicalHourFixtures,
  ...newAppointmentFixtures,
  ...therapyPhaseFixtures,
  ...patientGapFixtures,
  ...overdueFixtures,
  ...coverageFixtures,
  ...closureGenerationFixtures,
  ...absenceOriginFixtures,
  ...autoCheckoutFixtures,
  ...authorizationRenewalFixtures,
  ...fieldOrderingFixtures,
  ...deactivationDateFixtures,
  ...autoCheckinFixtures,
  ...handoverFixtures,
  ...patientScopeFixtures,
  ...planSignatureFixtures,
  ...todayInUtcFixtures,
  ...patientAddressFixtures,
  ...meetingSummaryFixtures,
  ...tissBatchFixtures,
  ...distributionFixtures,
  ...deactivationFixtures,
] as Fixture[];

export const rules: Rule[] = [
  ...agendaRules,
  ...schedulingRules,
  ...absenceRules,
  ...absenceOriginRules,
  ...overdueRules,
  ...supervisorOverdueRules,
  ...coverageRules,
  ...closureGenerationRules,
  ...fieldOrderingRules,
  ...deactivationDateRules,
  ...autoCheckinRules,
  ...handoverRules,
  ...patientScopeRules,
  ...planSignatureRules,
  ...todayInUtcRules,
  ...patientAddressRules,
  ...appointmentRowRules,
  ...meetingSummaryRules,
  ...tissBatchRules,
  ...distributionRules,
  ...sessionRules,
  ...programRules,
  ...protocolRules,
  ...inClinicRules,
  ...autoCheckoutRules,
  ...patientRules,
  ...therapyPhaseRules,
  ...patientGapRules,
  ...deactivationPathRules,
  ...authorizationRules,
  ...authorizationRenewalRules,
  ...closureRules,
  ...invoiceRules,
  ...teamRules,
  ...publicPortalRules,
  ...guardianPortalRules,
  ...insurerPortalRules,
  ...structureRules,
  ...recordRules,
  ...managementRules,
  ...hourMapRules,
  ...hourMapExpiryRules,
  ...chatRules,
  ...prospectRules,
  ...leadRules,
  ...pushRules,
  ...callRules,
  ...transferRules,
  ...reportRules,
  ...notificationRules,
  ...supervisionRules,
  ...supervisionTeamRules,
  ...unitMapRules,
  ...clinicalHourRules,
  ...clinicalHourPaginationRules,
];

export { personas };
export type { Persona };
