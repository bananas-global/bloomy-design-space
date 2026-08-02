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

/* ================================================= Pendências de cadastro */

import type { PatientGapKind, PatientGapsData, PatientWithGaps } from "../contracts/index.js";

/**
 * Regras das pendências de cadastro.
 *
 * `PatientFilters` aceita `missing=plan|unit|hour_map|support_level` e
 * `missing_any=true`. O sistema **sabe** responder "quem está sem o quê" — e
 * não existe tela nenhuma que faça essa pergunta. Alguém precisa saber digitar
 * o filtro.
 */
export const patientGapRules: Rule[] = [
  {
    id: "the-filter-exists-and-the-worklist-does-not",
    statement:
      "O sistema filtra pacientes por plano, unidade, mapa de horas e nível de suporte ausentes, e nenhuma tela mostra isso como trabalho a fazer.",
    rationale:
      "Uma consulta que só existe como parâmetro de URL é uma pergunta que ninguém faz. A informação está a um filtro de distância e permanece invisível porque depende de alguém suspeitar que ela exista.",
    source: "src/rules/patients.ts",
  },
  {
    id: "these-gaps-block-nothing",
    statement:
      "Nenhuma das quatro ausências impede atendimento. O paciente é atendido, as sessões acontecem e os programas rodam com as quatro em aberto.",
    rationale:
      "É o que as torna caras: um bloqueio se resolve porque incomoda hoje. Estas não incomodam ninguém até alguém precisar do dado — o responsável pedir o plano, a operadora pedir a unidade, a coordenação tentar montar a semana.",
    source: "src/rules/patients.ts",
  },
  {
    id: "the-four-gaps-have-different-weights",
    statement:
      "Sem unidade, o paciente não aparece em mapa nenhum. Sem mapa de horas, não há semana pretendida. Sem plano, não há o que o responsável aceite. Sem nível de suporte, o perfil que dimensiona a intensidade da intervenção está incompleto.",
    rationale:
      "Listadas como “cadastro incompleto”, as quatro pedem a mesma coisa: preencher. Nomeadas pela consequência, cada uma tem um dono e uma urgência diferentes — e a de nível de suporte é clínica, não administrativa.",
    source: "src/rules/patients.ts",
  },
];

export const GAP_ORDER: PatientGapKind[] = ["support_level", "unit", "hour_map", "plan"];

export function gapLabel(gap: PatientGapKind): string {
  switch (gap) {
    case "plan":
      return "Sem plano";
    case "unit":
      return "Sem unidade";
    case "hour_map":
      return "Sem mapa de horas";
    case "support_level":
      return "Sem nível de suporte";
  }
}

/** Implementação de `the-four-gaps-have-different-weights`. */
export function gapConsequence(gap: PatientGapKind): { efeito: string; dono: string } {
  switch (gap) {
    case "support_level":
      return {
        efeito:
          "O perfil TEA está incompleto: falta o nível de suporte, que é o que dimensiona a intensidade da intervenção.",
        dono: "Especialista, na avaliação",
      };
    case "unit":
      return {
        efeito: "O paciente não aparece no mapa de nenhuma unidade, nem na visão de capacidade.",
        dono: "Recepção ou coordenação",
      };
    case "hour_map":
      return {
        efeito:
          "Não há semana pretendida: os agendamentos existem avulsos, e nada os renova nem os confere.",
        dono: "Coordenação",
      };
    case "plan":
      return {
        efeito: "Não há plano de intervenção para o responsável aceitar.",
        dono: "Especialista, que escreve o plano",
      };
  }
}

/**
 * A lacuna mais grave de um paciente, na ordem que a consequência impõe.
 *
 * Existe porque uma lista ordenada por nome trata as quatro como iguais, e elas
 * não são: nível de suporte ausente é clínico.
 */
export function worstGap(entry: PatientWithGaps): PatientGapKind | undefined {
  return GAP_ORDER.find((gap) => entry.gaps.includes(gap));
}

/** Quem tem mais tempo de casa com a lacuna aberta aparece primeiro. */
export function byUrgency(data: PatientGapsData): PatientWithGaps[] {
  return [...data.patients].sort((a, b) => {
    const pesoA = GAP_ORDER.indexOf(worstGap(a) ?? "plan");
    const pesoB = GAP_ORDER.indexOf(worstGap(b) ?? "plan");
    if (pesoA !== pesoB) return pesoA - pesoB;
    return b.daysInCare - a.daysInCare;
  });
}

/** Quantos pacientes têm cada lacuna — o número que dá tamanho ao problema. */
export function countByGap(data: PatientGapsData): { gap: PatientGapKind; count: number }[] {
  return GAP_ORDER.map((gap) => ({
    gap,
    count: data.patients.filter((entry) => entry.gaps.includes(gap)).length,
  })).filter((linha) => linha.count > 0);
}

/**
 * A proporção sobre os pacientes ativos.
 *
 * Um número absoluto não diz se doze é muito: doze de quinze é um processo
 * quebrado, doze de quatrocentos é uma tarde de trabalho.
 */
export function shareOfActive(data: PatientGapsData): number | undefined {
  if (data.activePatients <= 0) return undefined;
  return Math.round((data.patients.length / data.activePatients) * 100);
}

/* ================================== Os dois caminhos da inativação */

/**
 * Regras dos dois caminhos.
 *
 * Inativar um paciente acontece de duas formas: alguém troca o status na tela
 * (`ChangePatientStatus`), ou a data marcada chega e o
 * `DeactivatePatientWorker` roda sozinho. O resultado pretendido é o mesmo. O
 * que os dois códigos fazem, não.
 */
export const deactivationPathRules: Rule[] = [
  {
    id: "the-unattended-path-destroys-more",
    statement:
      "O worker apaga os vínculos profissional–paciente com `delete_all`. O caminho manual não os toca. Mesma inativação, dois códigos, e o que roda sem ninguém presente destrói mais.",
    rationale:
      "Duas rotas para o mesmo resultado é normal; divergirem no que destroem não é. E a rota mais destrutiva é justamente a que ninguém acompanha — a diferença só aparece semanas depois, quando alguém procura quem atendeu a criança.",
    source: "src/rules/patients.ts",
  },
  {
    id: "the-bond-carries-clinical-context",
    statement:
      "O vínculo tem um campo de observação em texto livre. Apagar a linha apaga também o que alguém escreveu sobre aquela relação.",
    rationale:
      "Famílias em ABA pausam e voltam. Quem atendia, e o que se anotou sobre a relação, é exatamente o que se procura no retorno — e é a única parte do histórico que a inativação remove em vez de encerrar.",
    source: "src/rules/patients.ts",
  },
];

/** Implementação de `the-unattended-path-destroys-more`. */
export function bondsDeletedBy(impact: DeactivationImpact): DeactivationImpact["professionalBonds"] {
  return impact.path === "worker" ? impact.professionalBonds : [];
}

/** Implementação de `the-bond-carries-clinical-context`. */
export function bondsWithNotes(
  impact: DeactivationImpact,
): DeactivationImpact["professionalBonds"] {
  return bondsDeletedBy(impact).filter((bond) => (bond.observation ?? "").trim().length > 0);
}

/**
 * O que muda entre os dois caminhos, dito em uma frase.
 *
 * Devolve `undefined` no caminho manual quando não há vínculo nenhum: aí os
 * dois caminhos coincidem e comparar seria ruído.
 */
export function pathDifference(impact: DeactivationImpact): string | undefined {
  if (impact.professionalBonds.length === 0) return undefined;

  const quantos = impact.professionalBonds.length;
  const plural = quantos === 1 ? "vínculo" : "vínculos";

  return impact.path === "worker"
    ? `Por este caminho, ${quantos} ${plural} profissional–paciente ${quantos === 1 ? "é apagado" : "são apagados"}. Inativando pela tela, ${quantos === 1 ? "ele permanece" : "eles permanecem"}.`
    : `Inativando pela tela, ${quantos} ${plural} profissional–paciente ${quantos === 1 ? "permanece" : "permanecem"}. Se a data chegar e o worker rodar, ${quantos === 1 ? "ele é apagado" : "eles são apagados"}.`;
}
