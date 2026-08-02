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
      "Prontuário restrito só é legível por perfis com `patients.view_clinical_document`. Os demais veem que existe restrição, não o conteúdo.",
    rationale:
      "Esconder a existência da restrição seria pior: a recepção precisa saber que há informação clínica sensível para não insistir em perguntar.",
    source: "src/rules/patients.ts",
  },
];

type Decision = { allowed: boolean; reason?: string };

/** Implementação de `incomplete-registration-blocks-scheduling` e `minor-requires-guardian`. */
export function canSchedule(patient: Patient, permissions: string[]): Decision {
  if (!permissions.includes("schedules.create")) {
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
  if (!permissions.includes("patients.see_clinic_overview")) {
    return { allowed: false, reason: "Seu perfil não acessa prontuário." };
  }
  if (patient.recordRestricted && !permissions.includes("patients.view_clinical_document")) {
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

/* ====================================================== Fase terapêutica */

import type {
  DeactivationImpact,
  TherapyPhase,
  TherapySpecialty,
  TherapyStep,
  TherapyPhasesData,
} from "../contracts/index.js";
import { TODAY } from "../contracts/index.js";

/**
 * Regras da fase terapêutica e da inativação.
 *
 * Duas coisas que o módulo de pacientes não tinha, e que são o que torna o
 * cadastro deste produto diferente de um cadastro de clínica qualquer.
 *
 * A fase terapêutica é **por especialidade**: a mesma criança pode estar em
 * terapia na fonoaudiologia e em ambientação na psicologia. Um campo único de
 * "fase do paciente" seria o erro mais fácil de cometer aqui.
 *
 * Traduzido de `Bloomy.Patients.TherapyPhase` e
 * `Bloomy.Patients.ChangePatientStatus`.
 */
export const therapyPhaseRules: Rule[] = [
  {
    id: "therapy-phase-is-per-specialty",
    statement:
      "A fase pertence ao par paciente + especialidade, e não ao paciente. A mesma criança pode estar em terapia numa especialidade e em ambientação em outra.",
    rationale:
      "É o que distingue este produto de um cadastro de clínica: o percurso é medido por especialidade porque cada uma entra no caso em momento diferente. Um campo único de “fase do paciente” obrigaria a escolher qual das especialidades mente.",
    source: "src/rules/patients.ts",
  },
  {
    id: "phase-defaults-to-the-beginning",
    statement:
      "`step` tem `default: :ambiance` e o changeset não valida nada. Uma fase gravada sem etapa lê-se como “ambientação” — o começo do percurso — mesmo para quem está em terapia há um ano.",
    rationale:
      "O valor omitido e o valor escolhido ficam idênticos. Numa tela de percurso isso não é um detalhe de tipo: é a diferença entre “ainda estamos conhecendo a criança” e “ninguém preencheu”.",
    source: "src/rules/patients.ts",
  },
  {
    id: "therapy-phase-requires-nothing",
    statement:
      "`TherapyPhase.changeset/2` faz `cast` de paciente, especialidade e etapa, e não chama `validate_required` para nenhum. Uma fase sem especialidade é gravável.",
    rationale:
      "Sem especialidade, a fase não pertence a lugar nenhum do percurso e nenhuma tela sabe onde mostrá-la. Ela não some — fica pendurada, e some da leitura.",
    source: "src/rules/patients.ts",
  },
  {
    id: "deactivating-cancels-every-future-appointment",
    statement:
      "Inativar um paciente cancela, num `update_all`, todos os agendamentos a partir da data de corte, encerra os mapas de horas em vigor e desliga a renovação automática de todos eles.",
    rationale:
      "É a ação mais destrutiva do produto e mora atrás de um seletor de status. O que vai acontecer precisa estar escrito antes, com os números — quantos agendamentos, quais mapas —, porque nada disso se desfaz voltando o status para ativo.",
    source: "src/rules/patients.ts",
  },
  {
    id: "scheduled-deactivation-destroys-now",
    statement:
      "Com data futura, o paciente **continua ativo** — e a cascata roda mesmo assim, imediatamente. Agendar a inativação para o mês que vem cancela hoje a agenda daquele mês em diante.",
    rationale:
      "As duas metades da operação acontecem em tempos diferentes: o status espera, a destruição não. Quem escolhe uma data futura está pedindo para adiar, e é a parte irreversível que não adia.",
    source: "src/rules/patients.ts",
  },
  {
    id: "deactivation-cut-is-utc-midnight",
    statement:
      "O corte é `DateTime.new!(deactivation_date, ~T[00:00:00], \"Etc/UTC\")`. Em Brasília isso é 21h do dia anterior: as três últimas horas da véspera são canceladas junto.",
    rationale:
      "Ninguém procura por isso, porque a data escolhida está certa e o efeito começa antes dela. O atendimento das 21h30 da véspera é cancelado com motivo “paciente inativado” num dia em que o paciente ainda estava ativo.",
    source: "src/rules/patients.ts",
  },
];

/* ------------------------------------------------------------ percurso */

/** A ordem do enum, que é a ordem do percurso. */
export const THERAPY_STEPS: TherapyStep[] = [
  "ambiance",
  "initial_assessment",
  "pre_intervention",
  "therapy",
  "reassessment",
  "discharge_preparation",
];

export function stepLabel(step: TherapyStep): string {
  switch (step) {
    case "ambiance":
      return "Ambientação";
    case "initial_assessment":
      return "Avaliação inicial";
    case "pre_intervention":
      return "Pré-intervenção";
    case "therapy":
      return "Terapia";
    case "reassessment":
      return "Reavaliação";
    case "discharge_preparation":
      return "Preparação para alta";
  }
}

export function specialtyLabel(specialty: TherapySpecialty): string {
  switch (specialty) {
    case "phonoaudiology":
      return "Fonoaudiologia";
    case "psychology":
      return "Psicologia";
    case "occupational_therapy":
      return "Terapia ocupacional";
    case "physiotherapy":
      return "Fisioterapia";
    case "music_therapy":
      return "Musicoterapia";
    case "aba_practitioner":
      return "Aplicação ABA";
    case "nutritionist":
      return "Nutrição";
  }
}

export function stepPosition(step: TherapyStep): number {
  return THERAPY_STEPS.indexOf(step) + 1;
}

/** Implementação de `therapy-phase-requires-nothing`. */
export function phasesWithoutSpecialty(data: TherapyPhasesData): TherapyPhase[] {
  return data.phases.filter((phase) => phase.specialty === undefined);
}

/** As fases que a tela consegue posicionar no percurso. */
export function placedPhases(data: TherapyPhasesData): TherapyPhase[] {
  return data.phases.filter((phase) => phase.specialty !== undefined);
}

/**
 * Implementação de `phase-defaults-to-the-beginning`.
 *
 * Não há como distinguir, no dado, "ambientação escolhida" de "ninguém
 * preencheu" — o default cobre as duas. O que a especificação pode fazer é
 * dizer isso onde a etapa é lida, e é o que esta função devolve.
 */
export function ambianceIsAmbiguous(phase: TherapyPhase): string | undefined {
  if (phase.step !== "ambiance") return undefined;
  return "Ambientação é o valor padrão do campo. Não dá para distinguir, no registro, se alguém a escolheu ou se ninguém preencheu.";
}

/** O percurso não caminha junto: é isso que a tela precisa mostrar. */
export function phasesAreUneven(data: TherapyPhasesData): boolean {
  const steps = new Set(placedPhases(data).map((phase) => phase.step));
  return steps.size > 1;
}

/* ---------------------------------------------------------- inativação */

/** Implementação de `scheduled-deactivation-destroys-now`. */
export function stillActiveAfterScheduling(
  impact: DeactivationImpact,
  today = TODAY,
): boolean {
  return impact.deactivationDate > today;
}

/**
 * Implementação de `deactivation-cut-is-utc-midnight`.
 *
 * O corte real é 00h UTC da data escolhida, que em Brasília é 21h da véspera.
 * Devolve o instante local em que o cancelamento de fato começa.
 */
export function realCutoff(deactivationDate: string): string {
  const utcMidnight = new Date(`${deactivationDate}T00:00:00.000Z`);
  const local = new Date(utcMidnight.getTime() - 3 * 3_600_000);
  return `${local.toISOString().slice(0, 10)}T${local.toISOString().slice(11, 16)}`;
}

/** Os agendamentos apanhados na véspera, antes da data escolhida. */
export function caughtOnTheEve(impact: DeactivationImpact): DeactivationImpact["schedulesToCancel"] {
  return impact.schedulesToCancel.filter(
    (entry) => entry.start.slice(0, 10) < impact.deactivationDate,
  );
}

/** O resumo que precisa estar escrito antes de alguém confirmar. */
export function deactivationSummary(impact: DeactivationImpact): string[] {
  const lines: string[] = [];

  if (impact.schedulesToCancel.length > 0) {
    lines.push(
      `${impact.schedulesToCancel.length} ${impact.schedulesToCancel.length === 1 ? "agendamento será cancelado" : "agendamentos serão cancelados"}, com motivo “paciente inativado”.`,
    );
  }
  if (impact.hourMapsToClose.length > 0) {
    lines.push(
      `${impact.hourMapsToClose.length} ${impact.hourMapsToClose.length === 1 ? "mapa de horas em vigor será encerrado" : "mapas de horas em vigor serão encerrados"} na data de corte.`,
    );
  }
  if (impact.hourMapsLosingAutoRenew > 0) {
    lines.push(
      `${impact.hourMapsLosingAutoRenew} ${impact.hourMapsLosingAutoRenew === 1 ? "mapa perde" : "mapas perdem"} a renovação automática — inclusive os que já terminaram.`,
    );
  }

  return lines;
}

/** Nada disso volta ao desfazer o status, e a tela precisa dizer. */
export function isReversible(): boolean {
  return false;
}
