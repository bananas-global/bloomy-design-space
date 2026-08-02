import type { Rule } from "@brucesantos/design-space";
import type { Closure, ClosureStatus } from "../contracts/index.js";

/**
 * Regras do fechamento mensal do profissional.
 *
 * Traduzidas de `Closures.ClosurePolicy` e `Closures.ClosureService`. É o
 * módulo em que o Bloomy mais se parece com um processo entre duas partes: a
 * clínica calcula, o profissional confere, o profissional emite a nota, a
 * clínica valida e paga. A cada etapa a bola muda de lado, e é isso que a tela
 * precisa dizer.
 */
export const closureRules: Rule[] = [
  {
    id: "closure-hands-over-at-each-stage",
    statement:
      "Cada situação do fechamento tem um dono diferente: a clínica fecha e revisa, o profissional aceita e emite a nota, e a clínica valida e paga.",
    rationale:
      "É a única informação que decide o que fazer ao abrir a tela. Uma barra de progresso mostra quanto falta e esconde de quem é a bola — que é a pergunta real.",
    source: "src/rules/closures.ts",
  },
  {
    id: "closure-status-moves-backward-only",
    statement:
      "A correção manual de situação só pode voltar. Avançar pela mão é recusado: cada avanço precisa da ação de quem é dono daquela etapa.",
    rationale:
      "Pular do fechamento para pago sem o aceite do profissional e sem nota fiscal produz um pagamento sem lastro. Voltar é correção; avançar seria burlar o processo.",
    source: "src/rules/closures.ts",
  },
  {
    id: "closure-is-invisible-until-sent",
    statement:
      "O profissional não vê o próprio fechamento enquanto ele estiver em Fechamento. Ele aparece quando é enviado para aceite.",
    rationale:
      "O valor em Fechamento ainda está sendo conferido pela clínica. Mostrar um número que vai mudar gera conversa sobre um valor que nunca existiu.",
    source: "src/rules/closures.ts",
  },
  {
    id: "paid-closure-is-frozen",
    statement:
      "Fechamento pago não aceita interação de nenhum papel, e nem a nota fiscal nem o comprovante podem ser trocados ou removidos.",
    rationale:
      "É registro contábil depois de pago. `can_interact?` devolve falso para Pago sem sequer olhar o papel — e as quatro funções de anexo têm cláusula própria para ele.",
    source: "src/rules/closures.ts",
  },
  {
    id: "invoice-belongs-to-the-professional",
    statement:
      "Só o próprio profissional dono do fechamento anexa ou remove a nota fiscal dele. A regra é de identidade, não de papel.",
    rationale:
      "A nota é emitida em nome dele e é documento fiscal dele. Nem o admin sobe nota no lugar do profissional — e é a única regra do módulo que compara usuário, não papel.",
    source: "src/rules/closures.ts",
  },
  {
    id: "payment-proof-belongs-to-the-clinic",
    statement:
      "O comprovante de pagamento é anexado por admin ou People, e o pagamento só é confirmado depois que ele existe.",
    rationale:
      "O comprovante é a prova da clínica de que pagou. Confirmar pagamento sem ele deixa o profissional sem nada para cobrar se o valor não cair.",
    source: "src/rules/closures.ts",
  },
];

/* ============================================================== situação */

/** Ordem do processo. O índice é o que permite comparar avanço e recuo. */
export const CLOSURE_FLOW: ClosureStatus[] = [
  "closure",
  "wait_accept",
  "revision",
  "pending_invoice",
  "validate_nf",
  "pay_invoice",
  "paid",
];

const LABEL: Record<ClosureStatus, string> = {
  closure: "Fechamento",
  wait_accept: "Aguardando aceite",
  revision: "Em revisão",
  pending_invoice: "Pendente de nota fiscal",
  validate_nf: "Validar nota fiscal",
  pay_invoice: "A pagar",
  paid: "Pago",
};

export function closureStatusLabel(status: ClosureStatus): string {
  return LABEL[status];
}

/**
 * De quem é a bola.
 *
 * Implementação de `closure-hands-over-at-each-stage`, derivada das cláusulas de
 * `ClosurePolicy.can_interact?/2`. Duas etapas são da clínica administrativa,
 * duas do profissional, duas do financeiro, e a última não é de ninguém.
 */
export function ownerOf(status: ClosureStatus): {
  side: "clinic" | "professional" | "finance" | "none";
  label: string;
  roles: string[];
} {
  switch (status) {
    case "closure":
    case "revision":
      return {
        side: "clinic",
        label: "Com a clínica",
        roles: ["admin", "clinic_admin", "coordinator"],
      };
    case "wait_accept":
    case "pending_invoice":
      return {
        side: "professional",
        label: "Com o profissional",
        roles: [
          "coordinator",
          "therapeutic_companion",
          "supervisor",
          "applicator",
          "specialist",
        ],
      };
    case "validate_nf":
    case "pay_invoice":
      return { side: "finance", label: "Com o financeiro", roles: ["admin", "people"] };
    case "paid":
      return { side: "none", label: "Encerrado", roles: [] };
  }
}

type Decision = { allowed: boolean; reason?: string };

/**
 * Implementação de `closure-hands-over-at-each-stage` e `paid-closure-is-frozen`,
 * espelhando `can_interact?/2`.
 */
export function canInteract(closure: Closure, role: string): Decision {
  if (closure.status === "paid") {
    return {
      allowed: false,
      reason: "Fechamento pago é registro contábil: nenhum papel interage com ele.",
    };
  }

  const owner = ownerOf(closure.status);
  if (!owner.roles.includes(role)) {
    return {
      allowed: false,
      reason: `Nesta etapa a ação é de quem responde por ${ownerLabel(owner.side)}. Seu perfil acompanha, mas não age aqui.`,
    };
  }

  return { allowed: true };
}

function ownerLabel(side: "clinic" | "professional" | "finance" | "none"): string {
  return {
    clinic: "coordenação e administração da clínica",
    professional: "o próprio profissional",
    finance: "admin ou People",
    none: "ninguém",
  }[side];
}

/**
 * Implementação de `closure-status-moves-backward-only`, espelhando
 * `ClosureService.ensure_backward_status/2`.
 *
 * Permanecer no mesmo estado é aceito pelo monólito — a mensagem de erro diz
 * "selecione um status atual ou anterior". Reproduzido assim.
 */
export function canChangeStatusTo(
  closure: Closure,
  target: ClosureStatus,
  role: string,
): Decision {
  if (!["people", "clinic_admin", "admin"].includes(role)) {
    return {
      allowed: false,
      reason: "Só admin, admin de clínica e People corrigem a situação de um fechamento.",
    };
  }

  const from = CLOSURE_FLOW.indexOf(closure.status);
  const to = CLOSURE_FLOW.indexOf(target);

  if (to > from) {
    return {
      allowed: false,
      reason: `Não é permitido avançar situação pela mão. Cada avanço depende de quem é dono da etapa — aqui, ${ownerLabel(ownerOf(closure.status).side)}.`,
    };
  }

  return { allowed: true };
}

/* ================================================================ anexos */

/**
 * Implementação de `invoice-belongs-to-the-professional`.
 *
 * A única regra do módulo que compara identidade e não papel: o monólito
 * pergunta se `closure.professional.user_id == user.id`. Nem o admin sobe nota
 * no lugar de quem a emitiu.
 */
export function canAttachInvoice(closure: Closure, currentUserId: string): Decision {
  if (closure.status === "paid") {
    return { allowed: false, reason: "Fechamento pago não troca de nota fiscal." };
  }
  if (closure.professionalUserId !== currentUserId) {
    return {
      allowed: false,
      reason: `A nota é documento fiscal de ${closure.professional.name} e só ele a anexa. Nem o admin sobe nota no lugar do profissional.`,
    };
  }
  return { allowed: true };
}

/** Implementação de `payment-proof-belongs-to-the-clinic`. */
export function canAttachPaymentProof(closure: Closure, role: string): Decision {
  if (closure.status === "paid") {
    return { allowed: false, reason: "Fechamento pago não troca de comprovante." };
  }
  if (!["admin", "people"].includes(role)) {
    return {
      allowed: false,
      reason: "O comprovante é a prova da clínica de que pagou. Só admin e People o anexam.",
    };
  }
  return { allowed: true };
}

/** Implementação de `payment-proof-belongs-to-the-clinic`, lado da confirmação. */
export function canConfirmPayment(closure: Closure, role: string): Decision {
  if (closure.status !== "pay_invoice") {
    return {
      allowed: false,
      reason: `Só um fechamento em ${LABEL.pay_invoice} pode ter o pagamento confirmado.`,
    };
  }
  if (!closure.paymentProof) {
    return {
      allowed: false,
      reason:
        "Falta anexar o comprovante. Confirmar sem ele deixa o profissional sem nada para cobrar se o valor não cair.",
    };
  }
  return canInteract(closure, role);
}

/* ============================================================== visão */

/**
 * Implementação de `closure-is-invisible-until-sent`, espelhando
 * `ClosurePolicy.scope/2`.
 *
 * Vale registrar uma divergência do monólito, reproduzida como é: o `scope`
 * lista `therapeutic_companion`, `applicator` e `supervisor`, e **não** lista
 * `specialist`. O especialista cai na cláusula final e não enxerga fechamento
 * nenhum — nem o próprio — apesar de `can_interact?` afirmar que ele age na
 * etapa de aceite. As duas funções se contradizem.
 */
export function visibleClosures(
  closures: Closure[],
  role: string,
  currentUserId: string,
): Closure[] {
  if (["admin", "people", "operation", "coordinator", "clinic_admin"].includes(role)) {
    return closures;
  }

  if (["therapeutic_companion", "applicator", "supervisor"].includes(role)) {
    return closures.filter(
      (closure) =>
        closure.professionalUserId === currentUserId && closure.status !== "closure",
    );
  }

  // `specialist` cai aqui, junto de `attendant`. Ver a nota acima.
  return [];
}

export function canViewSummary(role: string): boolean {
  return ["admin", "clinic_admin", "coordinator", "people"].includes(role);
}

/**
 * A nota fiscal faz parte do ciclo?
 *
 * Espelha `ClosureService.generates_invoice?/1`: depende da situação **e** de o
 * contrato do mês exigir emissão. Contrato sem emissão pula as etapas de nota.
 */
export function expectsInvoice(closure: Closure): boolean {
  const inScope: ClosureStatus[] = ["pending_invoice", "validate_nf", "pay_invoice", "paid"];
  return inScope.includes(closure.status) && closure.issuesInvoice;
}

/** O que falta acontecer, em uma frase de ação. */
export function nextStep(closure: Closure): string {
  switch (closure.status) {
    case "closure":
      return "A clínica está conferindo os valores. Ainda não foi enviado ao profissional.";
    case "wait_accept":
      return `${closure.professional.name} precisa aceitar o valor ou pedir revisão.`;
    case "revision":
      return "A clínica está revisando o valor a pedido do profissional.";
    case "pending_invoice":
      return closure.issuesInvoice
        ? `${closure.professional.name} precisa anexar a nota fiscal.`
        : "O contrato do mês não exige nota fiscal. Segue direto para pagamento.";
    case "validate_nf":
      return "Admin ou People precisam validar a nota fiscal anexada.";
    case "pay_invoice":
      return closure.paymentProof
        ? "Pagamento aprovado e comprovante anexado. Falta confirmar."
        : "Falta anexar o comprovante de pagamento.";
    case "paid":
      return "Ciclo encerrado.";
  }
}
