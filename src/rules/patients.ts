import type { Rule } from "@brucesantos/design-space";
import type { Patient } from "../contracts/index.js";
import { isMinor } from "../contracts/index.js";

export const patientRules: Rule[] = [
  {
    id: "minor-requires-guardian",
    statement:
      "Paciente menor de 18 anos exige responsável legal com nome, relação, CPF e telefone.",
    rationale:
      "Consentimento e cobrança dependem do responsável. Sem ele, o atendimento acontece e a clínica descobre o problema no faturamento.",
    source: "src/rules/patients.ts",
  },
  {
    id: "incomplete-registration-blocks-scheduling",
    statement: "Cadastro com campo obrigatório faltando não permite agendar.",
    rationale:
      "O bloqueio é na origem porque completar depois nunca acontece: o paciente já saiu da clínica.",
    source: "src/rules/patients.ts",
  },
  {
    id: "restricted-record-requires-permission",
    statement:
      "Prontuário restrito só é legível por perfis com `patients.record.restricted`. Os demais veem que existe restrição, não o conteúdo.",
    rationale:
      "Esconder a existência da restrição seria pior: a recepção precisa saber que há informação clínica sensível para não insistir em perguntar.",
    source: "src/rules/patients.ts",
  },
];

type Decision = { allowed: boolean; reason?: string };

/** Implementação de `incomplete-registration-blocks-scheduling` e `minor-requires-guardian`. */
export function canSchedule(patient: Patient, permissions: string[]): Decision {
  if (!permissions.includes("agenda.create")) {
    return { allowed: false, reason: "Seu perfil não cria agendamentos." };
  }
  if (patient.missingFields.length > 0) {
    const list = patient.missingFields.join(", ");
    return {
      allowed: false,
      reason: `Cadastro incompleto. Falta: ${list}.`,
    };
  }
  if (isMinor(patient) && !patient.guardian) {
    return {
      allowed: false,
      reason: "Paciente menor de idade sem responsável legal cadastrado.",
    };
  }
  return { allowed: true };
}

/** Implementação de `restricted-record-requires-permission`. */
export function canReadRecord(patient: Patient, permissions: string[]): Decision {
  if (!permissions.includes("patients.record.read")) {
    return { allowed: false, reason: "Seu perfil não acessa prontuário." };
  }
  if (patient.recordRestricted && !permissions.includes("patients.record.restricted")) {
    return {
      allowed: false,
      reason: "Prontuário com acesso restrito. Fale com o profissional responsável.",
    };
  }
  return { allowed: true };
}

/** Campos obrigatórios ausentes, derivados do próprio paciente. */
export function missingRequiredFields(patient: Patient): string[] {
  const missing = [...patient.missingFields];
  if (isMinor(patient) && !patient.guardian && !missing.includes("responsável legal")) {
    missing.push("responsável legal");
  }
  return missing;
}
