import type { ProductDefinition } from "@brucesantos/design-space";

import { fixtures, modules, personas, rules, scenarios } from "./catalog.js";
import { guard } from "../components/ScreenBoundary.js";
import { COMPONENT_PREVIEWS } from "../gallery/entries.js";
import { contrastPairs } from "../tokens/contrast.js";
import { AgendaDay } from "../screens/AgendaDay.js";
import { AppointmentDetail } from "../screens/AppointmentDetail.js";
import { SessionDetail } from "../screens/SessionDetail.js";
import { InterventionPlanScreen } from "../screens/InterventionPlan.js";
import { ProtocolApplication } from "../screens/ProtocolApplication.js";
import { InClinic } from "../screens/InClinic.js";
import { PatientList } from "../screens/PatientList.js";
import { PatientDetail } from "../screens/PatientDetail.js";
import { AuthorizationHub } from "../screens/AuthorizationHub.js";
import { Closures } from "../screens/Closures.js";
import { HealthcareInvoiceScreen } from "../screens/HealthcareInvoice.js";
import { Team } from "../screens/Team.js";
import { Kiosk } from "../screens/Kiosk.js";
import { Nps } from "../screens/Nps.js";
import { GuardianPortal } from "../screens/GuardianPortal.js";
import { InsurerPortal } from "../screens/InsurerPortal.js";
import { Structure } from "../screens/Structure.js";
import { PatientRecordScreen } from "../screens/PatientRecord.js";
import { Management } from "../screens/Management.js";
import { HourMapScreen } from "../screens/HourMap.js";
import { Chat } from "../screens/Chat.js";
import { Notifications } from "../screens/Notifications.js";
import { Supervision } from "../screens/Supervision.js";
import { SupervisionTeam } from "../screens/SupervisionTeam.js";
import { UnitMap } from "../screens/UnitMap.js";
import { ClinicalHours } from "../screens/ClinicalHours.js";
import { NewAppointment } from "../screens/NewAppointment.js";
import { TherapyPhases } from "../screens/TherapyPhases.js";
import { PatientDeactivation } from "../screens/PatientDeactivation.js";
import { PatientGaps } from "../screens/PatientGaps.js";
import { Overdue } from "../screens/Overdue.js";
import { PlanCoverageScreen } from "../screens/PlanCoverage.js";
import { ClosureGeneration } from "../screens/ClosureGeneration.js";
import { AbsenceOriginScreen } from "../screens/AbsenceOrigin.js";
import { AutoCheckout } from "../screens/AutoCheckout.js";
import { AuthorizationRenewal } from "../screens/AuthorizationRenewal.js";
import { FieldOrdering } from "../screens/FieldOrdering.js";
import { DeactivationDate } from "../screens/DeactivationDate.js";
import { AutoCheckin } from "../screens/AutoCheckin.js";
import { Handover } from "../screens/Handover.js";
import { PatientScope } from "../screens/PatientScope.js";
import { PlanSignature } from "../screens/PlanSignature.js";
import { TodayInUtc } from "../screens/TodayInUtc.js";
import { PatientAddress } from "../screens/PatientAddress.js";
import { MeetingSummary } from "../screens/MeetingSummary.js";
import { TissBatch } from "../screens/TissBatch.js";
import { Distribution } from "../screens/Distribution.js";
import { Prospects } from "../screens/Prospects.js";
import { LeadFunnel } from "../screens/LeadFunnel.js";
import { LeadList } from "../screens/LeadList.js";
import { LeadProfile } from "../screens/LeadProfile.js";
import { LeadNew } from "../screens/LeadNew.js";
import { LeadImport } from "../screens/LeadImport.js";
import { LeadIntegrations } from "../screens/LeadIntegrations.js";
import { LeadDashboard } from "../screens/LeadDashboard.js";
import { LeadTasks } from "../screens/LeadTasks.js";
import { Reports } from "../screens/Reports.js";
import { ProfessionalDocuments } from "../screens/ProfessionalDocuments.js";
import { Professionals } from "../screens/Professionals.js";
import { UnitDocuments } from "../screens/UnitDocuments.js";
import { UnitList } from "../screens/UnitList.js";
import { InsurerDocuments } from "../screens/InsurerDocuments.js";
import { InsurerList } from "../screens/InsurerList.js";

/**
 * A única coisa que o Bloomy Design Space entrega ao motor.
 *
 * A especificação — módulos, jornadas, cenários, personas, fixtures e regras —
 * vive em `catalog.ts`, livre de React. Aqui ela é combinada com as telas que a
 * materializam. Ver o comentário de `catalog.ts` para o porquê da separação.
 */
export const productDefinition: ProductDefinition = {
  id: "bloomy",
  name: "Bloomy",
  tagline: "Gestão de clínicas — especificação executável",

  modules,
  scenarios,
  personas,
  fixtures,
  rules,
  components: COMPONENT_PREVIEWS,

  // Sem rota para `/`: a raiz é o mapa de situações do motor, que é a entrada
  // certa para quem recebe o link sem contexto.
  routes: [
    { path: "/agenda", screen: guard(AgendaDay) },
    { path: "/in-clinic", screen: guard(InClinic) },
    { path: "/agenda/:id", screen: guard(AppointmentDetail) },
    { path: "/sessions/:id", screen: guard(SessionDetail) },
    { path: "/patients", screen: guard(PatientList) },
    // Literal antes da paramétrica: `/patients/:id` casaria com "address".
    { path: "/patients/address", screen: guard(PatientAddress) },
    { path: "/patients/deactivation-date", screen: guard(DeactivationDate) },
    { path: "/patients/:id", screen: guard(PatientDetail) },
    { path: "/patients/:id/plan", screen: guard(InterventionPlanScreen) },
    { path: "/patients/:id/record", screen: guard(PatientRecordScreen) },
    { path: "/patients/:id/hour-map", screen: guard(HourMapScreen) },
    { path: "/patients/:id/chat", screen: guard(Chat) },
    { path: "/notifications", screen: guard(Notifications) },
    // A proposta primeiro, como em `/patients` e `/team`: literal antes do que
    // é mais curto. `/supervision` continua servindo as cinco situações do porte.
    { path: "/supervision/team", screen: guard(SupervisionTeam) },
    { path: "/supervision", screen: guard(Supervision) },
    { path: "/unit-map", screen: guard(UnitMap) },
    { path: "/clinical-hours", screen: guard(ClinicalHours) },
    { path: "/agenda/new", screen: guard(NewAppointment) },
    { path: "/patients/:id/phases", screen: guard(TherapyPhases) },
    { path: "/patients/:id/deactivate", screen: guard(PatientDeactivation) },
    { path: "/patients/gaps", screen: guard(PatientGaps) },
    { path: "/agenda/overdue", screen: guard(Overdue) },
    { path: "/authorizations/coverage", screen: guard(PlanCoverageScreen) },
    { path: "/closures/generation", screen: guard(ClosureGeneration) },
    { path: "/agenda/absences", screen: guard(AbsenceOriginScreen) },
    { path: "/in-clinic/auto-checkout", screen: guard(AutoCheckout) },
    { path: "/authorizations/renewal", screen: guard(AuthorizationRenewal) },
    { path: "/structure/fields", screen: guard(FieldOrdering) },
    { path: "/structure/today", screen: guard(TodayInUtc) },
    { path: "/public/auto-checkin", screen: guard(AutoCheckin) },
    { path: "/guardian/plan-signature", screen: guard(PlanSignature) },
    { path: "/agenda/handovers", screen: guard(Handover) },
    { path: "/sessions/meeting-summary", screen: guard(MeetingSummary) },
    { path: "/closures/tiss-batch", screen: guard(TissBatch) },
    { path: "/authorizations/distribution", screen: guard(Distribution) },
    { path: "/patients/:id/reports", screen: guard(Reports) },
    { path: "/patients/:id/protocols/:executionId", screen: guard(ProtocolApplication) },
    { path: "/authorizations", screen: guard(AuthorizationHub) },
    { path: "/closures", screen: guard(Closures) },
    { path: "/invoices/:id", screen: guard(HealthcareInvoiceScreen) },
    // Literais antes da paramétrica, como em `/patients`.
    { path: "/team/documentation", screen: guard(Professionals) },
    { path: "/team/patient-scope", screen: guard(PatientScope) },
    { path: "/team/:id/documents", screen: guard(ProfessionalDocuments) },
    { path: "/team", screen: guard(Team) },
    { path: "/structure/documents", screen: guard(UnitList) },
    { path: "/structure/:id/documents", screen: guard(UnitDocuments) },
    { path: "/insurers/documents", screen: guard(InsurerList) },
    { path: "/insurers/:id/documents", screen: guard(InsurerDocuments) },
    { path: "/kiosk", screen: guard(Kiosk) },
    { path: "/nps", screen: guard(Nps) },
    { path: "/guardian", screen: guard(GuardianPortal) },
    { path: "/insurer", screen: guard(InsurerPortal) },
    { path: "/structure", screen: guard(Structure) },
    { path: "/management", screen: guard(Management) },
    { path: "/prospects", screen: guard(Prospects) },
    // CRM de leads — proposta. Literais antes da paramétrica: `/leads/:id`
    // casaria com "import", "tasks" e todas as outras.
    { path: "/leads", screen: guard(LeadFunnel) },
    { path: "/leads/list", screen: guard(LeadList) },
    { path: "/leads/new", screen: guard(LeadNew) },
    { path: "/leads/import", screen: guard(LeadImport) },
    { path: "/leads/integrations", screen: guard(LeadIntegrations) },
    { path: "/leads/dashboard", screen: guard(LeadDashboard) },
    { path: "/leads/tasks", screen: guard(LeadTasks) },
    { path: "/leads/:id", screen: guard(LeadProfile) },
  ],

  // O motor é uma biblioteca já compilada e não consegue ler o ambiente de build
  // deste repositório — o `import.meta.env` dele foi resolvido quando o pacote foi
  // publicado. Quem tem acesso ao próprio build é o produto, então o contexto vem
  // daqui. Sem isso o cabeçalho da revisão mostra "development", sem branch nem
  // commit, e a URL de commit deixa de tornar a aprovação rastreável.
  deploy: {
    env: import.meta.env.VITE_DEPLOY_ENV,
    branch: import.meta.env.VITE_DEPLOY_BRANCH,
    commit: import.meta.env.VITE_DEPLOY_COMMIT,
  },

  theme: {
    contrastPairs,
    locales: ["pt-BR"],
  },

  // O Bloomy é um monólito Phoenix sem API pública, então não há adapter remoto a
  // oferecer — e não deveria haver antes de um problema concreto de fixture.
  dataSources: { default: "fixtures" },
};
