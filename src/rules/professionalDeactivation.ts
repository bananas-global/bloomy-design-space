import type { Rule } from "@brucesantos/design-space";
import type {
  CaseloadEntry,
  DeactivationSubstitute,
  ProfessionalDeactivationData,
} from "../contracts/index.js";
import { daysUntil } from "./documents.js";

/**
 * Regras da inativação de profissional.
 *
 * A inativação de um paciente já está em `src/rules/patients.ts`, e as duas se
 * parecem o suficiente para alguém tratá-las como a mesma tela. Não são: um
 * paciente que sai deixa horários vagos, e um profissional que sai deixa
 * **pacientes sem responsável**. Por isso esta tem uma etapa que aquela não tem
 * — o destino do caseload — e é ela que separa uma saída organizada de uma
 * clínica descobrindo na segunda-feira que ninguém vai atender.
 *
 * A decisão que estrutura o resto: inativação nunca é imediata. Marca-se uma
 * data, o cadastro entra em “em inativação”, e o intervalo até lá é o tempo que
 * a coordenação tem para transferir.
 */
export const professionalDeactivationRules: Rule[] = [
  {
    id: "professional-deactivation-is-scheduled",
    statement:
      "Inativar um profissional é marcar uma data de saída a partir de hoje. Entre a marcação e a data, o cadastro fica em inativação: continua na agenda, aparece marcado nas listas e ordenado à frente dos demais.",
    rationale:
      "Uma saída que vale no mesmo instante cancela atendimentos que já estão combinados com as famílias. O período de inativação existe para que a transferência aconteça antes de alguém ficar sem terapeuta, e não depois.",
    source: "src/rules/professionalDeactivation.ts",
  },
  {
    id: "caseload-needs-a-destination",
    statement:
      "Com pacientes em atendimento, a inativação só é confirmada depois que cada um tem destino: um profissional substituto ou o cancelamento explícito das sessões.",
    rationale:
      "É a única etapa que não pode ser resolvida depois. Um paciente sem responsável não aparece em fila nenhuma — ele simplesmente deixa de ser atendido, e a clínica descobre pela falta.",
    source: "src/rules/professionalDeactivation.ts",
  },
  {
    id: "substitute-must-outlast-the-transfer",
    statement:
      "Só pode receber caseload quem está ativo e sem data de saída marcada.",
    rationale:
      "Transferir pacientes para quem também está de saída apenas adia o problema para uma semana em que ninguém vai lembrar de olhar. O sistema conhece as duas datas e é o único que pode impedir isso na hora.",
    source: "src/rules/professionalDeactivation.ts",
  },
  {
    id: "deactivation-reason-is-required-once",
    statement:
      "O motivo é obrigatório ao marcar a inativação e não é pedido de novo ao mudar a data ou ao reativar.",
    rationale:
      "O motivo explica a saída, não a data. Pedi-lo outra vez numa correção de dois dias transforma um ajuste trivial num formulário, e a resposta que se obtém é a que estava lá antes.",
    source: "src/rules/professionalDeactivation.ts",
  },
];

type Decision = { allowed: boolean; reason?: string };

/**
 * Implementação de `professional-deactivation-is-scheduled`.
 *
 * “Em inativação” não é um campo: é ativo com data futura. Guardá-lo como estado
 * próprio criaria a terceira fonte de verdade que precisaria ser mantida em dia
 * por um worker — e que ficaria errada no dia em que ele falhasse.
 */
export function professionalStatus(
  professional: { active: boolean; deactivationDate?: string },
  now: string,
): "active" | "deactivating" | "inactive" {
  if (!professional.active) return "inactive";
  if (professional.deactivationDate && daysUntil(professional.deactivationDate, now) >= 0) {
    return "deactivating";
  }
  return "active";
}

export function professionalStatusLabel(
  status: ReturnType<typeof professionalStatus>,
): string {
  return { active: "Ativo", deactivating: "Em inativação", inactive: "Inativo" }[status];
}

/** Implementação de `substitute-must-outlast-the-transfer`. */
export function eligibleSubstitutes(
  substitutes: DeactivationSubstitute[],
  leavingId: string,
): DeactivationSubstitute[] {
  return substitutes.filter(
    (person) => person.id !== leavingId && person.active && !person.deactivationDate,
  );
}

/**
 * Substitutos ordenados: a mesma especialidade primeiro.
 *
 * Não é filtro. Transferir para outra especialidade é uma decisão legítima da
 * coordenação — o que a ordem faz é não obrigar ninguém a procurar o óbvio no
 * meio da lista.
 */
export function substitutesFor(
  entry: CaseloadEntry,
  substitutes: DeactivationSubstitute[],
  leavingId: string,
): DeactivationSubstitute[] {
  const elegiveis = eligibleSubstitutes(substitutes, leavingId);
  return [
    ...elegiveis.filter((person) => person.specialty === entry.specialty),
    ...elegiveis.filter((person) => person.specialty !== entry.specialty),
  ];
}

export type DeactivationForm = {
  /** Data de saída escolhida, em ISO. */
  date?: string;
  reason?: string;
  /** O que fazer com os atendimentos posteriores à data. */
  destination: "transfer" | "cancel";
  /** Paciente → profissional que assume. Só usado quando o destino é transferir. */
  assignments: Record<string, string | undefined>;
  acknowledged: boolean;
};

/**
 * Implementação de `caseload-needs-a-destination` e das demais recusas.
 *
 * A ordem das verificações é parte da regra. A data vem antes do caseload porque
 * o próprio quadro de transferência fala em “a partir de {data}”: pedir os
 * destinos antes de saber quando é a saída faz a pessoa escolher no escuro.
 */
export function canConfirmDeactivation(
  data: ProfessionalDeactivationData,
  form: DeactivationForm,
  permissions: string[],
  mode: "create" | "edit" = "create",
): Decision {
  if (!permissions.includes("professionals.edit")) {
    return { allowed: false, reason: "Seu perfil não edita profissionais." };
  }

  if (!form.date) {
    return {
      allowed: false,
      reason:
        "Escolha a data de saída. É ela que separa o que ainda vale do que precisa ser transferido.",
    };
  }

  if (daysUntil(form.date, data.now) < 0) {
    return {
      allowed: false,
      reason:
        "A data de saída não pode ser no passado: os atendimentos entre ela e hoje já aconteceram.",
    };
  }

  if (mode === "create" && !form.reason) {
    return { allowed: false, reason: "Selecione o motivo da inativação." };
  }

  if (form.destination === "transfer" && data.caseload.length > 0) {
    const semDestino = data.caseload.filter((entry) => !form.assignments[entry.patientId]);
    if (semDestino.length > 0) {
      return {
        allowed: false,
        reason: `Defina quem assume ${semDestino.length} ${
          semDestino.length === 1 ? "paciente" : "pacientes"
        } antes de confirmar. Paciente sem responsável não entra em fila nenhuma — ele apenas deixa de ser atendido.`,
      };
    }
  }

  if (!form.acknowledged) {
    return {
      allowed: false,
      reason: "Confirme que assume a transição antes de inativar.",
    };
  }

  return { allowed: true };
}

/** O que a inativação vai produzir, para a tela dizer antes e não depois. */
export function deactivationImpact(
  data: ProfessionalDeactivationData,
  form: DeactivationForm,
): string[] {
  const efeitos: string[] = [];

  if (data.scheduledUntil > 0) {
    efeitos.push(
      `${data.scheduledUntil} ${data.scheduledUntil === 1 ? "atendimento permanece" : "atendimentos permanecem"} na agenda até a data de saída.`,
    );
  }

  if (data.scheduledAfter > 0) {
    efeitos.push(
      form.destination === "transfer"
        ? `${data.scheduledAfter} ${data.scheduledAfter === 1 ? "atendimento passa" : "atendimentos passam"} para os profissionais escolhidos, mantendo o horário quando a agenda deles permitir.`
        : `${data.scheduledAfter} ${data.scheduledAfter === 1 ? "atendimento será cancelado" : "atendimentos serão cancelados"}, e as famílias precisam ser avisadas.`,
    );
  }

  if (data.roomPeriods > 0) {
    efeitos.push(
      `${data.roomPeriods} ${data.roomPeriods === 1 ? "período libera vaga" : "períodos liberam vaga"} na escala de salas a partir da data.`,
    );
  }

  if (form.destination === "cancel" && data.caseload.length > 0) {
    efeitos.push(
      `${data.caseload.length} ${data.caseload.length === 1 ? "paciente fica" : "pacientes ficam"} sem profissional responsável.`,
    );
  }

  return efeitos;
}
