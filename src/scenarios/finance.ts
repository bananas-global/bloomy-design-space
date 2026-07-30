import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do Financeiro.
 *
 * `finance.insurance-denied` é o cenário que o documento de arquitetura usa como
 * exemplo canônico, e é onde o campo `announces` deixa de ser formalidade: uma
 * recusa que não é anunciada para leitor de tela está incompleta, não está pronta
 * para aprovação.
 */
export const financeScenarios: Scenario[] = [
  {
    id: "finance.queue",
    title: "Fila de guias",
    intent: "Saber o que resolver primeiro, e quanto dinheiro está esperando ação da clínica.",
    route: "/finance",
    persona: "financial-analyst",
    fixture: "claims-queue",
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "A fila é ordenada por urgência de ação, não por data. A situação tem rótulo textual.",
    },
    status: "in-review",
    expected: [
      "Recusadas aparecem antes de pendências, análises e autorizadas.",
      "O total aguardando ação da clínica é somado e exibido.",
      "A contagem de documentos mostra quantos faltam em cada guia.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "finance.queue-empty",
    title: "Nenhuma guia pendente",
    intent: "Definir a fila zerada.",
    route: "/finance",
    persona: "financial-analyst",
    fixture: "claims-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: ["A tela explica o que aparece aqui quando houver guia."],
    tags: ["vazio"],
  },
  {
    id: "finance.invoice-under-review",
    title: "Fatura em análise",
    intent: "Deixar claro que não há ação da clínica pendente, para não gerar reenvio inútil.",
    route: "/finance/claims/GUI-4090",
    persona: "financial-analyst",
    fixture: "claim-under-review",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Guia enviada há três dias, recebida pelo convênio para análise."],
    expected: [
      "O aviso diz explicitamente que nada é esperado da clínica.",
      "Reenviar fica indisponível, porque só recusa ou pendência permite reenvio.",
      "O histórico mostra o envio e o recebimento, com autoria.",
    ],
    tags: ["sucesso", "regra"],
  },
  {
    id: "finance.insurance-denied",
    title: "Convênio recusado",
    intent:
      "Garantir que a analista saiba exatamente o que o convênio pediu, sem reenviar adivinhando.",
    route: "/finance/claims/GUI-4042",
    persona: "financial-analyst",
    fixture: "claim-denied",
    rules: ["retry-after-document-review", "denial-reason-always-visible"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      announces: ["claim.status", "retry.result"],
      notes:
        "A recusa é a informação mais importante da página e é anunciada na chegada por região de alerta. O motivo do bloqueio de reenvio é associado ao botão por aria-describedby.",
    },
    status: "in-review",
    preconditions: [
      "Guia recusada pela SulAmérica com código TUSS-3001.",
      "Dois de quatro documentos exigidos ainda não anexados.",
    ],
    actions: ["Anexar documento", "Reenviar ao convênio"],
    expected: [
      "O motivo e o código da recusa estão visíveis na tela, não escondidos no histórico.",
      "Reenviar aparece desabilitado, nomeando os documentos que faltam.",
      "Anexar os dois documentos libera o reenvio na mesma tela.",
      "A recusa é anunciada para leitor de tela ao abrir a página.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "finance.pending-documents",
    title: "Documentos pendentes",
    intent: "Distinguir pendência de recusa — o convênio pediu algo, não negou.",
    route: "/finance/claims/GUI-4051",
    persona: "financial-analyst",
    fixture: "claim-pending-documents",
    rules: ["retry-after-document-review"],
    a11y: { keyboard: "full", contrast: "AA", announces: ["claim.status"] },
    status: "in-review",
    preconditions: ["Bradesco solicitou relatório de evolução a partir da sexta sessão."],
    expected: [
      "O aviso diz que a guia não foi recusada.",
      "O documento pendente aparece com a nota que explica por que é exigido.",
      "Reenviar fica indisponível até o documento ser anexado.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "finance.resubmit-allowed",
    title: "Reenvio permitido",
    intent: "Confirmar que o reenvio libera e é anunciado quando a documentação está completa.",
    route: "/finance/claims/GUI-4042",
    persona: "financial-analyst",
    fixture: "claim-ready-to-resubmit",
    rules: ["retry-after-document-review"],
    a11y: { keyboard: "full", contrast: "AA", announces: ["retry.result"] },
    status: "in-review",
    preconditions: ["A mesma guia recusada, agora com os quatro documentos anexados."],
    actions: ["Reenviar ao convênio"],
    expected: [
      "Reenviar está habilitado.",
      "O motivo original da recusa continua visível: ele é o contexto do reenvio.",
      "O resultado do reenvio é anunciado por região de status.",
    ],
    tags: ["sucesso", "decisão"],
  },
  {
    id: "finance.resubmit-no-permission",
    title: "Sem permissão para reenviar",
    intent: "Definir o que a gestora vê ao abrir uma guia recusada.",
    route: "/finance/claims/GUI-4042",
    persona: "manager",
    fixture: "claim-ready-to-resubmit",
    rules: ["resubmit-requires-permission"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "Toda a informação da guia continua legível.",
      "Reenviar e anexar aparecem desabilitados, com o motivo.",
    ],
    tags: ["permissão", "exceção"],
  },
];
