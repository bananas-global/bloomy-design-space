import { writeFileSync } from "node:fs";

/**
 * Gera a matriz de permissões por papel a partir das 26 policies do monólito.
 * Fonte: lib/**\/*_policy.ex do repositório bloomy, extraídas em 2026-08-01.
 *
 * Cada entrada é `"recurso.acao": <regra>`, onde a regra é:
 *   ["in", ...roles]     -> role in ~W(...)
 *   ["not", ...roles]    -> role not in ~W(...)
 *   ["all"]              -> true para qualquer papel
 */
const ROLES = [
  "admin",
  "clinic_admin",
  "attendant",
  "operation",
  "people",
  "coordinator",
  "supervisor",
  "specialist",
  "therapeutic_companion",
  "applicator",
];

const M = {
  // authorizations/authorization_policy.ex
  "authorizations.list": ["in", "admin", "clinic_admin"],
  "authorizations.show": ["in", "admin", "clinic_admin"],
  "authorizations.create": ["in", "admin"],
  "authorizations.edit": ["in", "admin"],
  "authorizations.delete": ["in", "admin"],
  "authorizations.import": ["in", "admin"],
  "authorizations.replicate": ["in", "admin"],
  "authorizations.hub": ["in", "admin", "clinic_admin", "operation"],

  // backoffice/user_policy.ex
  "users.list": ["in", "admin", "clinic_admin"],
  "users.create": ["in", "admin", "clinic_admin"],
  "users.edit": ["in", "admin", "clinic_admin"],
  "users.manage_status": ["in", "admin"],
  "users.add_units": ["in", "admin"],

  // blockings/blocking_policy.ex
  "blockings.create": ["in", "admin", "clinic_admin", "attendant", "coordinator"],
  "blockings.edit": ["in", "admin", "clinic_admin", "attendant", "coordinator"],

  // clinical_summaries/clinical_summary_policy.ex
  "clinical_summaries.create": ["in", "supervisor", "specialist", "therapeutic_companion", "coordinator", "admin", "clinic_admin"],
  "clinical_summaries.update": ["in", "supervisor", "specialist", "therapeutic_companion", "coordinator", "admin", "clinic_admin"],

  // clinical_summaries/neuropediatric_assessments/neuropediatric_assessment_policy.ex
  "neuropediatric_assessments.create": ["in", "coordinator"],

  // custom_services/custom_service_policy.ex
  "custom_services.edit": ["in", "admin", "clinic_admin", "coordinator", "therapeutic_companion", "specialist"],
  "custom_services.revert": ["in", "admin", "coordinator"],
  "custom_services.edit_feedback_summary": ["in", "admin", "clinic_admin", "coordinator"],
  "custom_services.view_professional_evaluation": ["in", "admin", "clinic_admin", "coordinator", "people"],

  // health_cares/audits/audit_policy.ex
  "audits.create": ["in", "admin", "clinic_admin", "coordinator", "operation"],

  // health_cares/health_care_policy.ex
  "health_cares.list": ["in", "admin", "clinic_admin", "operation"],
  "health_cares.show": ["in", "admin", "clinic_admin", "operation"],
  "health_cares.create": ["in", "admin", "operation"],
  "health_cares.edit": ["in", "admin", "operation"],
  "health_cares.create_agreement": ["in", "coordinator", "admin"],

  // healthcare_invoices/healthcare_invoice_policy.ex
  "healthcare_invoices.list": ["in", "admin", "clinic_admin"],
  "healthcare_invoices.show": ["in", "admin", "clinic_admin"],
  "healthcare_invoices.create": ["in", "admin"],
  "healthcare_invoices.edit": ["in", "admin"],
  "healthcare_invoices.delete": ["in", "admin"],

  // multidisciplinary_chat/chat_policy.ex
  "chat.show": ["in", "admin", "clinic_admin", "coordinator", "therapeutic_companion", "supervisor", "applicator", "specialist"],

  // patients/alert_criteria/altert_criteria_policy.ex
  "alert_criteria.edit": ["in", "admin", "clinic_admin", "coordinator"],
  "alert_criteria.show": ["in", "admin", "clinic_admin", "coordinator", "therapeutic_companion", "specialist"],

  // patients/behavior_intervention_plans/behavior_intervention_plan_policy.ex
  "behavior_intervention_plans.create": ["in", "coordinator", "therapeutic_companion", "supervisor", "specialist", "admin", "clinic_admin"],
  "behavior_intervention_plans.edit": ["in", "coordinator", "therapeutic_companion", "supervisor", "specialist", "admin", "clinic_admin"],
  "behavior_intervention_plans.discard": ["in", "coordinator", "supervisor", "admin", "clinic_admin"],
  "behavior_intervention_plans.show": ["in", "coordinator", "therapeutic_companion", "supervisor", "admin", "clinic_admin", "specialist"],

  // patients/hour_maps/hour_map_agenda_policy.ex
  "hour_maps.repropagate": ["in", "admin", "clinic_admin", "coordinator"],
  "hour_maps.manage_hour_map": ["in", "admin", "clinic_admin", "coordinator"],

  // patients/patient_policy.ex
  "patients.create": ["in", "admin", "clinic_admin", "attendant", "coordinator"],
  "patients.list": ["not", "people"],
  "patients.show": ["not", "people"],
  "patients.edit": ["in", "admin", "clinic_admin", "attendant", "coordinator", "operation"],
  "patients.edit_checkin_checkout": ["in", "admin", "clinic_admin", "coordinator"],
  "patients.create_agreement": ["in", "coordinator", "admin"],
  "patients.ability_maps": ["in", "coordinator", "admin"],
  "patients.import_programs": ["in", "coordinator", "admin"],
  "patients.create_hour_map": ["in", "coordinator", "admin"],
  "patients.edit_schedules_map": ["in", "coordinator", "admin"],
  "patients.see_clinic_overview": ["not", "operation", "attendant"],
  "patients.create_content": ["in", "admin", "clinic_admin", "supervisor"],
  "patients.list_nps": ["in", "admin", "clinic_admin", "coordinator"],
  "patients.generate_report": ["in", "admin", "clinic_admin", "coordinator", "supervisor", "therapeutic_companion", "specialist", "attendant"],
  "patients.see_behavior_intervention_plan": ["not", "operation", "therapeutic_companion", "attendant", "specialist"],
  "patients.see_services": ["not", "operation"],
  "patients.see_hour_maps": ["in", "clinic_admin", "admin", "operation", "coordinator", "supervisor"],
  "patients.see_financial": ["not", "therapeutic_companion", "applicator", "attendant", "supervisor", "specialist"],
  // Arity 3 no monólito: `can?(role, :can_view_document, type)`. Só `:clinical`
  // tem cláusula permissiva; `:personal` e `:administrative` caem no `false`.
  "patients.view_clinical_document": ["in", "admin", "clinic_admin", "attendant", "coordinator", "operation", "therapeutic_companion", "supervisor"],
  "patients.view_personal_document": ["in"],
  "patients.view_administrative_document": ["in"],

  // products/service_policy.ex
  "services.list": ["in", "admin", "clinic_admin", "attendant", "coordinator", "operation"],
  "services.create": ["in", "admin", "operation"],
  "services.edit": ["in", "admin", "operation"],
  "services.show": ["in", "admin", "clinic_admin", "coordinator", "operation"],

  // professional_patients/professional_patients_policy.ex
  "professional_patients.create": ["in", "admin", "clinic_admin", "coordinator"],
  "professional_patients.list": ["in", "admin", "clinic_admin", "coordinator"],
  "professional_patients.delete": ["in", "admin", "clinic_admin", "coordinator"],

  // professionals/clinical_hours/clinical_hour_record_policy.ex
  // `app` também aparece na lista real; não é papel de pessoa e fica de fora.
  "clinical_hours.create": ["in", "admin", "coordinator", "clinic_admin", "people"],
  "clinical_hours.edit": ["in", "admin", "coordinator", "clinic_admin", "people"],

  // professionals/closures/closure_policy.ex
  "closures.list": ["all"],

  // professionals/professional_policy.ex
  "professionals.create": ["in", "admin", "clinic_admin", "coordinator", "people"],
  "professionals.edit": ["in", "admin", "clinic_admin", "coordinator", "people"],
  "professionals.list": ["in", "admin", "clinic_admin", "attendant", "coordinator", "people"],
  "professionals.create_hired_professionals": ["in", "admin", "clinic_admin", "coordinator", "people"],
  "professionals.edit_hired_professional": ["in", "admin", "clinic_admin", "coordinator", "people"],
  "professionals.create_standard_agenda": ["in", "people", "admin"],
  "professionals.edit_standard_agenda": ["in", "people", "admin"],
  "professionals.list_supervisor": ["in", "admin", "clinic_admin", "coordinator"],

  // programs/program_policy.ex
  "programs.list": ["in", "admin", "clinic_admin", "coordinator", "supervisor", "therapeutic_companion", "specialist"],
  "programs.create": ["in", "admin", "clinic_admin", "coordinator", "supervisor", "therapeutic_companion", "specialist"],
  "programs.edit": ["in", "admin", "clinic_admin", "coordinator", "supervisor", "therapeutic_companion", "specialist"],
  "programs.delete": ["in", "admin", "clinic_admin", "coordinator", "supervisor", "therapeutic_companion", "specialist"],
  "programs.import": ["in", "coordinator", "therapeutic_companion", "supervisor", "specialist"],
  "programs.create_behavior_intervention_plan_programs": ["in", "coordinator", "therapeutic_companion", "supervisor", "specialist"],
  "programs.discard_behavior_intervention_plan_programs": ["in", "coordinator", "therapeutic_companion", "supervisor", "specialist"],
  "programs.edit_behavior_intervention_plan_programs": ["in", "coordinator", "therapeutic_companion", "supervisor", "specialist"],

  // protocols/protocol_policy.ex
  "protocols.list": ["in", "admin", "clinic_admin", "coordinator", "therapeutic_companion", "specialist"],
  "protocols.create": ["in", "admin", "clinic_admin", "coordinator"],
  "protocols.edit": ["in", "admin", "clinic_admin", "coordinator"],

  // schedules/schedule_policy.ex
  "schedules.create": ["in", "admin", "clinic_admin", "attendant", "coordinator", "operation"],
  "schedules.list": ["not", "people"],
  "schedules.revert": ["in", "coordinator", "admin", "attendant"],
  "schedules.cancel": ["in", "coordinator", "admin", "attendant"],
  "schedules.edit": ["in", "coordinator", "admin", "attendant"],

  // service_records/service_record_policy.ex
  "service_records.checkin": ["in", "admin", "coordinator", "attendant"],

  // unit_maps/unit_map_policy.ex
  "unit_maps.show": ["in", "admin", "clinic_admin", "coordinator", "therapeutic_companion", "supervisor", "applicator", "specialist", "attendant"],
  "unit_maps.manage_unit_map": ["in", "admin", "clinic_admin", "coordinator"],

  // units/unit_policy.ex
  // O monólito compara com "admin_clinic", que não é um papel válido — só o
  // admin passa. Reproduzido como está, e registrado como divergência.
  "units.list": ["in", "admin"],
  "units.create": ["in", "admin"],
  "units.edit": ["in", "admin"],

  // bloomy_web/backoffice/live/management/management_policy.ex
  "management.list": ["in", "admin", "clinic_admin", "coordinator"],
};

function allows(rule, role) {
  const [kind, ...roles] = rule;
  if (kind === "all") return true;
  if (kind === "in") return roles.includes(role);
  if (kind === "not") return !roles.includes(role);
  throw new Error(`regra desconhecida: ${kind}`);
}

const out = {};
for (const role of ROLES) {
  out[role] = Object.keys(M)
    .filter((permission) => allows(M[permission], role))
    .sort();
}

console.log(JSON.stringify(out, null, 2));
console.error("permissões declaradas:", Object.keys(M).length);
for (const role of ROLES) console.error(`  ${role.padEnd(24)} ${out[role].length}`);

/* ---------------------------------------------------------------- emissão */


const target = process.argv[2];
if (target) {
  const body = Object.entries(out)
    .map(([role, permissions]) => {
      const list = permissions.map((p) => `    "${p}",`).join("\n");
      return `  ${role}: [\n${list}\n  ],`;
    })
    .join("\n\n");

  writeFileSync(
    target,
    `/**
 * Permissões por papel — DERIVADO, não escrito à mão.
 *
 * Gerado a partir das 26 policies de \`lib/**\\/*_policy.ex\` do monólito Bloomy.
 * Cada id é \`recurso.acao\`, onde \`recurso\` é o módulo da policy e \`acao\` é o
 * átomo passado para \`can?/2\`. A tradução é mecânica de propósito: quem for
 * conferir contra o Elixir precisa achar a linha.
 *
 * Três traduções não são mecânicas e estão anotadas na fonte do gerador:
 *
 * - \`patients.view_*_document\` desdobra a \`can?/3\` do monólito, que recebe o
 *   tipo do documento. Só \`:clinical\` tem cláusula permissiva — \`:personal\` e
 *   \`:administrative\` caem no \`false\` final e ninguém os vê.
 * - \`units.list\` compara com \`"admin_clinic"\` no monólito, string que não existe
 *   na lista de papéis. Reproduzido como \`admin\` apenas, e registrado como
 *   divergência na decisão 0002.
 * - \`clinical_hours.*\` aceita também \`app\` no monólito. Não é papel de pessoa —
 *   é o aplicativo do profissional — e por isso fica fora das personas.
 *
 * Para regenerar, rode o script em \`scripts/gen-permissions.mjs\`.
 */
export const permissionsByRole = {
${body}
} as const;

export type Role = keyof typeof permissionsByRole;
`,
    "utf8",
  );
  console.error(`escrito: ${target}`);
}
