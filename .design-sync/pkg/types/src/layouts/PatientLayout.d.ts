import { type ReactNode } from "react";
import type { LayoutContext } from "./BackofficeLayout.js";
/**
 * `backoffice/live/patient_live/show.ex` (as `lazy_tabs/1` do paciente) com
 * `PatientLive.Components.CardHeader` no slot `header`. Adaptação: `md:`/`lg:`
 * viram `md:`/`lg:`. Os modais de observação, chat, inativação e o
 * drawer de acompanhamento periódico não foram portados: os botões ficam, sem
 * efeito.
 */
export type PatientTabId = "personal_info" | "legal_guardian_info" | "school_info" | "plans" | "reports" | "patient_professionals" | "units" | "documents" | "summary" | "legal_contracts" | "clinical_summary" | "anamnese_general" | "anamnese_clinical" | "anamnese_external" | "treatment_plan" | "protocols" | "agenda_pattern" | "patient_availability" | "patient_appointments" | "program_executions" | "protocol_executions" | "patient_evolution" | "contracts" | "authorizations" | "patient_authorizations" | "invoices" | "patient_contents" | "patient_feed" | "no_show" | "nps";
export type PatientHeader = {
    name: string;
    avatarUrl?: string;
    /** `patient_status_label/1`: "Ativo", "Inativo" ou "Inativação em 10/09/2026". */
    status: string;
    /** `clinical_summary.clinical_summary_asd_profile.support_level`. */
    supportLevel?: number | string;
    restrictions?: boolean;
    isInjunction?: boolean;
    /** Idade em anos, já calculada. */
    age: number;
    /** Nome da primeira unidade do paciente. */
    unitName?: string;
    missedCancelledCount: number;
    activeWeeklyHours?: number;
    /** Com observação, o botão "Observações" ganha o `notification_badge`. */
    observation?: string;
};
/** `CardHeader.render/1`. */
export declare function PatientCardHeader({ patient, canEdit, canChat }: {
    patient: PatientHeader;
    canEdit: boolean;
    canChat: boolean;
}): import("react").JSX.Element;
export declare function PatientLayout({ context, patient, activeTab, renderTab, }: {
    context?: Pick<LayoutContext, "can">;
    patient: PatientHeader;
    /** `@initial_tab`: `:treatment_plan` quando a URL traz `objective_id`. */
    activeTab?: PatientTabId;
    /** O conteúdo de cada aba (o `component` de cada uma no original). */
    renderTab?: (tab: PatientTabId) => ReactNode;
}): import("react").JSX.Element;
