import type { Rule } from "@brucesantos/design-space";
import type { Claim } from "../contracts/index.js";

export const financeRules: Rule[] = [
  {
    id: "retry-after-document-review",
    statement:
      "Guia recusada só pode ser reenviada depois que todos os documentos exigidos pelo convênio estiverem anexados.",
    rationale:
      "Reenvio sem documento é recusado de novo e o prazo do convênio corre. Cada reenvio inútil custa um ciclo de dias.",
    source: "src/rules/finance.ts",
  },
  {
    id: "resubmit-requires-permission",
    statement: "Só perfis com `claims.retry` podem reenviar uma guia.",
    rationale:
      "Reenvio é interação formal com o convênio e conta contra a clínica quando indevido.",
    source: "src/rules/finance.ts",
  },
  {
    id: "denial-reason-always-visible",
    statement:
      "O motivo e o código da recusa ficam visíveis na tela da guia, não em um histórico que precise ser aberto.",
    rationale:
      "Sem o motivo à vista, a operação reenvia adivinhando. O código é o que permite conversar com o convênio.",
    source: "src/rules/finance.ts",
  },
];

type Decision = { allowed: boolean; reason?: string };

/** Implementação de `retry-after-document-review` e `resubmit-requires-permission`. */
export function canResubmit(claim: Claim, permissions: string[]): Decision {
  if (!permissions.includes("authorizations.hub")) {
    return { allowed: false, reason: "Seu perfil não reenvia guias." };
  }
  if (claim.status !== "denied" && claim.status !== "pending_documents") {
    return {
      allowed: false,
      reason: "Só guia recusada ou com pendência de documento pode ser reenviada.",
    };
  }

  const missing = missingDocuments(claim);
  if (missing.length > 0) {
    return {
      allowed: false,
      reason: `Falta anexar: ${missing.map((doc) => doc.name).join(", ")}.`,
    };
  }

  return { allowed: true };
}

export function missingDocuments(claim: Claim) {
  return claim.documents.filter((document) => !document.received);
}

/** Progresso de documentação, para a tela mostrar quanto falta sem contar à mão. */
export function documentProgress(claim: Claim): { received: number; total: number } {
  return {
    received: claim.documents.filter((document) => document.received).length,
    total: claim.documents.length,
  };
}
