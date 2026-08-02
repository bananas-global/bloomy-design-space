import type { Rule } from "@brucesantos/design-space";
import type { SupervisionLink, TeamContract, TeamMember } from "../contracts/index.js";

/**
 * Regras do cadastro da equipe.
 *
 * Este módulo tem uma função incomum no porte: ele explica os outros. Duas
 * decisões que pareciam do atendimento e do pagamento nascem aqui.
 *
 * - `needsSupervisorSignature`, que faz a sessão exigir uma segunda assinatura,
 *   vem do vínculo de estágio entre profissional e supervisor.
 * - `issuesInvoice`, que faz o fechamento passar pelas etapas de nota fiscal,
 *   vem do contrato do mês.
 *
 * Quem for desenhar o atendimento sem saber disso vai procurar a configuração
 * no lugar errado.
 */
export const teamRules: Rule[] = [
  {
    id: "tbd-professional-is-a-placeholder",
    statement:
      "Um profissional a definir exige apenas nome e especialidade, contra dez campos obrigatórios de um profissional comum.",
    rationale:
      "É um espaço reservado na agenda, criado antes de a clínica saber quem vai atender. Exigir CPF e formação de um lugar vazio impediria montar a grade da semana seguinte.",
    source: "src/rules/team.ts",
  },
  {
    id: "supervision-link-defines-second-signature",
    statement:
      "A exigência de assinatura do supervisor num atendimento vem do vínculo de estágio do profissional, não do atendimento.",
    rationale:
      "Quem desenha a tela de atendimento procura essa configuração no próprio atendimento e não acha. Ela é uma propriedade da relação de supervisão, e vale para todas as sessões daquele profissional.",
    source: "src/rules/team.ts",
  },
  {
    id: "one-supervision-link-per-pair",
    statement:
      "O mesmo supervisor não pode ser vinculado duas vezes ao mesmo profissional.",
    rationale:
      "Dois vínculos com exigências de assinatura diferentes deixariam indefinido se a sessão precisa de uma ou de duas assinaturas.",
    source: "src/rules/team.ts",
  },
  {
    id: "contract-type-decides-required-rates",
    statement:
      "Remuneração fixa exige mensalidade maior que zero e aceita hora administrativa zerada. Remuneração por hora exige as três taxas maiores que zero.",
    rationale:
      "Cada tipo tem uma base de cálculo diferente, e um campo faltando produz um fechamento com valor errado — descoberto pelo profissional, no aceite.",
    source: "src/rules/team.ts",
  },
  {
    id: "contract-decides-invoice-requirement",
    statement:
      "O contrato do mês decide se o fechamento passa pelas etapas de nota fiscal.",
    rationale:
      "É o mesmo `issue_invoice` que o módulo de Fechamentos consome. Sem saber disso, a variante curta do ciclo parece um bug.",
    source: "src/rules/team.ts",
  },
  {
    id: "deactivation-needs-a-date",
    statement:
      "Desativar um profissional exige registrar a data. Sem ela, não dá para saber a partir de quando a agenda dele deixou de valer.",
    rationale:
      "A data de desativação é o que separa o histórico do que ainda vale. Sem ela, agendamentos futuros de alguém que saiu continuam parecendo legítimos.",
    source: "src/rules/team.ts",
  },
];

/* ============================================================== cadastro */

/**
 * Implementação de `tbd-professional-is-a-placeholder`.
 *
 * Os dois conjuntos vêm de `@full_required_fields` e `@tbd_required_fields` do
 * monólito. Vale ver os dois lado a lado: a diferença é de oito campos.
 */
export const FULL_REQUIRED = [
  "nome",
  "e-mail",
  "CPF",
  "data de nascimento",
  "telefone",
  "especialidade",
  "papéis por unidade",
  "formação em saúde",
  "papéis globais",
  "formação",
] as const;

export const TBD_REQUIRED = ["nome", "especialidade"] as const;

export function missingProfessionalFields(member: TeamMember): string[] {
  if (member.tbd) {
    const missing: string[] = [];
    if (!member.name.trim()) missing.push("nome");
    if (!member.specialty.trim()) missing.push("especialidade");
    return missing;
  }

  const missing: string[] = [];
  if (!member.name.trim()) missing.push("nome");
  if (!member.email?.trim()) missing.push("e-mail");
  if (!member.cpf?.trim()) missing.push("CPF");
  if (!member.birthDate?.trim()) missing.push("data de nascimento");
  if (!member.phone?.trim()) missing.push("telefone");
  if (!member.specialty.trim()) missing.push("especialidade");
  if (member.professionalTypes.length === 0) missing.push("papéis por unidade");
  if (!member.healthFormation?.trim()) missing.push("formação em saúde");
  if (member.userTypes.length === 0) missing.push("papéis globais");
  if (!member.formation?.trim()) missing.push("formação");
  return missing;
}

type Decision = { allowed: boolean; reason?: string };

/** Implementação de `deactivation-needs-a-date`. */
export function canDeactivate(member: TeamMember, permissions: string[]): Decision {
  if (!permissions.includes("professionals.edit")) {
    return { allowed: false, reason: "Seu perfil não edita profissionais." };
  }
  if (!member.active) {
    return { allowed: false, reason: `${member.name} já está desativado.` };
  }
  if (!member.deactivationDate) {
    return {
      allowed: false,
      reason:
        "Informe a data de desativação. É ela que separa o histórico do que ainda vale — sem ela, agendamentos futuros de quem saiu continuam parecendo legítimos.",
    };
  }
  return { allowed: true };
}

/* ============================================================ supervisão */

/**
 * Implementação de `supervision-link-defines-second-signature`.
 *
 * Um profissional pode ter mais de um supervisor. Basta que **um** dos vínculos
 * exija assinatura para que as sessões dele precisem da segunda — é a leitura
 * conservadora, e a única que não deixa passar sessão sem o endosso pedido.
 */
export function requiresSupervisorSignature(member: TeamMember): boolean {
  return member.supervisedBy.some((link) => link.needsSupervisorSignature);
}

/** Quais vínculos exigem assinatura, para a tela poder nomeá-los. */
export function signingSupervisors(member: TeamMember): SupervisionLink[] {
  return member.supervisedBy.filter((link) => link.needsSupervisorSignature);
}

/** Implementação de `one-supervision-link-per-pair`. */
export function canLinkSupervisor(
  member: TeamMember,
  supervisorId: string,
  permissions: string[],
): Decision {
  if (!permissions.includes("professionals.list_supervisor")) {
    return {
      allowed: false,
      reason: "Só admin, admin de clínica e coordenação administram supervisão.",
    };
  }

  const existing = member.supervisedBy.find((link) => link.supervisorId === supervisorId);
  if (existing) {
    return {
      allowed: false,
      reason: `${existing.supervisorName} já é responsável por esse profissional.`,
    };
  }

  if (supervisorId === member.id) {
    return { allowed: false, reason: "Um profissional não supervisiona a si mesmo." };
  }

  return { allowed: true };
}

/* =============================================================== contrato */

/**
 * Implementação de `contract-type-decides-required-rates`, espelhando
 * `HiredProfessional.validate_by_type/2`.
 *
 * A assimetria do `allow_zero?` está reproduzida: em remuneração fixa, a hora
 * administrativa pode ser zero — quem tem mensalidade não precisa cobrar hora
 * administrativa à parte. Em remuneração por hora, ela não pode.
 */
export function missingContractRates(contract: TeamContract): string[] {
  const missing: string[] = [];
  const positive = (value?: number) => value !== undefined && value > 0;
  const present = (value?: number) => value !== undefined && value >= 0;

  if (contract.type === "fixed_compensation") {
    if (!positive(contract.monthlyRateCents)) missing.push("valor mensal");
    if (!present(contract.administrativeHourlyRateCents)) missing.push("hora administrativa");
    return missing;
  }

  if (!positive(contract.serviceRateCents)) missing.push("valor por atendimento");
  if (!positive(contract.administrativeHourlyRateCents)) missing.push("hora administrativa");
  if (!positive(contract.specialAdministrativeHourlyRateCents)) {
    missing.push("hora administrativa especial");
  }
  return missing;
}

export function isContractComplete(contract: TeamContract): boolean {
  return missingContractRates(contract).length === 0;
}

/** O contrato vale na data? Espelha `get_contract_active_in_month`. */
export function isContractActiveOn(contract: TeamContract, date: string): boolean {
  const day = date.slice(0, 10);
  if (day < contract.startDate) return false;
  return contract.endDate === undefined || day <= contract.endDate;
}

/**
 * Implementação de `contract-decides-invoice-requirement`.
 *
 * Existe para tornar explícito o elo com o módulo de Fechamentos: é este
 * booleano que faz o ciclo daquele módulo pular duas etapas.
 */
export function closureExpectsInvoice(member: TeamMember, date: string): boolean {
  const contract = member.contract;
  if (!contract || !isContractActiveOn(contract, date)) return false;
  return contract.issuesInvoice;
}

/* ================================================================ leitura */

export function contractTypeLabel(type: TeamContract["type"]): string {
  return type === "fixed_compensation" ? "Remuneração fixa" : "Remuneração por hora";
}

/** O que o cadastro deste profissional decide em outros módulos. */
export function downstreamEffects(member: TeamMember, date: string): string[] {
  const effects: string[] = [];

  if (requiresSupervisorSignature(member)) {
    const names = signingSupervisors(member)
      .map((link) => link.supervisorName)
      .join(", ");
    effects.push(
      `As sessões deste profissional exigem uma segunda assinatura, de ${names}. A exigência vem do vínculo de estágio, não do atendimento.`,
    );
  }

  if (member.contract && isContractActiveOn(member.contract, date)) {
    effects.push(
      closureExpectsInvoice(member, date)
        ? "O fechamento mensal passa pelas etapas de nota fiscal, porque o contrato do mês exige emissão."
        : "O fechamento mensal pula as etapas de nota fiscal: o contrato do mês não exige emissão.",
    );
  }

  if (member.tbd) {
    effects.push(
      "É um espaço reservado na agenda. Aparece na grade e não tem pessoa por trás — trocar por alguém real é o passo que falta.",
    );
  }

  if (member.isAt) {
    effects.push("Atende como acompanhante terapêutico, fora da clínica.");
  }

  if (member.appliesProtocol) {
    effects.push("Pode aplicar protocolo de avaliação.");
  }

  return effects;
}
