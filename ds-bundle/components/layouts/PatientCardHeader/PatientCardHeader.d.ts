import * as React from 'react';

/**
 * PatientCardHeader — from bloomy-design-space@0.1.0.
 */
export interface PatientCardHeaderProps {
  patient: PatientHeader;
  canEdit: boolean;
  canChat: boolean;
}

export declare const PatientCardHeader: React.ComponentType<PatientCardHeaderProps>;
