import * as React from 'react';

/**
 * PatientLayout — from bloomy-design-space@0.1.0.
 */
export interface PatientLayoutProps {
  context?: Pick<LayoutContext, "can">;
  patient: PatientHeader;
  /** `@initial_tab`: `:treatment_plan` quando a URL traz `objective_id`. */
  activeTab?: unknown;
  /** O conteúdo de cada aba (o `component` de cada uma no original). */
  renderTab?: (tab: PatientTabId) => ReactNode;
}

export declare const PatientLayout: React.ComponentType<PatientLayoutProps>;
