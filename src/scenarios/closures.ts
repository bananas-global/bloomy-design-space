import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do fechamento mensal.
 *
 * É o módulo em que o Bloomy mais se parece com um processo entre duas partes.
 * Os cenários seguem a bola: clínica, profissional, clínica de novo — e o
 * estado final, em que ela não é de ninguém.
 */
export const closureScenarios: Scenario[] = [
  {
    id: "closures.all-stages",
    title: "O mês inteiro, etapa por etapa",
    intent:
      "Fazer a lista responder “de quem é a bola” antes de “quanto é”, que é a pergunta de quem abre a tela.",
    route: "/closures",
    persona: "clinic_admin",
    fixture: "closures-all-stages",
    rules: ["closure-hands-over-at-each-stage"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "A trilha das sete etapas é uma lista ordenada com `aria-current` na etapa vigente. Cada etapa tem posição e situação anunciadas por texto.",
    },
    status: "in-review",
    preconditions: ["Julho de 2026 em sete pontos do processo, mais um junho já pago."],
    expected: [
      "Cada fechamento diz de que lado está a bola antes de mostrar o valor.",
      "A trilha inteira fica visível, com a etapa atual marcada.",
      "A frase de próxima ação nomeia quem precisa agir, e não só o que falta.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "closures.wait-accept",
    title: "Aguardando aceite do profissional",
    intent: "Definir a primeira troca de lado — a clínica calculou, o profissional confere.",
    route: "/closures",
    persona: "therapeutic_companion",
    fixture: "closure-wait-accept",
    rules: ["closure-hands-over-at-each-stage"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["A Marina abrindo o próprio fechamento de julho, já enviado para aceite."],
    expected: [
      "A tela diz que a ação é dela, nomeando as duas saídas: aceitar ou pedir revisão.",
      "O histórico mostra quem enviou para aceite e quando.",
    ],
    tags: ["decisão", "sucesso"],
  },
  {
    id: "closures.invisible-until-sent",
    title: "O profissional não vê o fechamento em conferência",
    intent:
      "Impedir que um valor ainda em conferência gere conversa sobre um número que vai mudar.",
    route: "/closures",
    persona: "therapeutic_companion",
    fixture: "closures-all-stages",
    rules: ["closure-is-invisible-until-sent"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`ClosurePolicy.scope/2` filtra por `user_id` e exclui os que estão em Fechamento.",
      "A pessoa logada não é dona de nenhum dos fechamentos da fixture.",
    ],
    expected: [
      "A lista aparece vazia para este perfil, mesmo havendo fechamentos no mês.",
      "A explicação diz que o profissional vê só os próprios, e só depois de enviados.",
    ],
    tags: ["permissão", "vazio"],
  },
  {
    id: "closures.invoice-is-the-professionals",
    title: "Só o profissional anexa a própria nota",
    intent:
      "Tornar visível a única regra do módulo que compara identidade, e não papel — nem o admin sobe nota no lugar de quem a emitiu.",
    route: "/closures",
    persona: "therapeutic_companion",
    fixture: "closure-pending-invoice-owner",
    rules: ["invoice-belongs-to-the-professional"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["A Marina logada, olhando o próprio fechamento pendente de nota."],
    expected: [
      "Anexar nota fiscal está disponível.",
      "A tela diz que falta a nota, nomeando quem precisa anexar.",
    ],
    tags: ["sucesso", "regra"],
  },
  {
    id: "closures.invoice-blocked-for-others",
    title: "Nem o admin anexa nota no lugar do profissional",
    intent: "Verificar que a regra de identidade não cede ao papel mais poderoso do produto.",
    route: "/closures",
    persona: "admin",
    fixture: "closure-pending-invoice-other",
    rules: ["invoice-belongs-to-the-professional"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["O mesmo fechamento, com outro usuário logado."],
    expected: [
      "Anexar nota fiscal aparece indisponível, mesmo para o admin.",
      "O motivo diz que a nota é documento fiscal do profissional.",
    ],
    tags: ["permissão", "exceção"],
  },
  {
    id: "closures.no-invoice-contract",
    title: "Contrato sem emissão de nota",
    intent:
      "Mostrar que o ciclo tem uma variante mais curta, sem esconder que ela é a mesma trilha.",
    route: "/closures",
    persona: "people",
    fixture: "closure-no-invoice-contract",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Contrato do mês com `issue_invoice` falso."],
    expected: [
      "As duas etapas de nota fiscal aparecem riscadas na trilha, em vez de sumirem.",
      "A tela explica que o contrato não exige nota e que o ciclo segue para pagamento.",
      "A seção de nota fiscal não aparece.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "closures.pay-without-proof",
    title: "Confirmar pagamento sem comprovante",
    intent:
      "Impedir uma confirmação que deixaria o profissional sem nada para cobrar se o valor não cair.",
    route: "/closures",
    persona: "people",
    fixture: "closure-pay-without-proof",
    rules: ["payment-proof-belongs-to-the-clinic"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Aprovado, nota validada, comprovante ainda não anexado."],
    expected: [
      "Confirmar pagamento aparece indisponível, dizendo que falta o comprovante.",
      "O motivo explica a consequência, e não apenas a exigência.",
      "Anexar comprovante está disponível para este perfil.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "closures.pay-with-proof",
    title: "Confirmar pagamento com comprovante",
    intent: "Definir o último passo antes do estado terminal.",
    route: "/closures",
    persona: "people",
    fixture: "closure-pay-with-proof",
    rules: ["payment-proof-belongs-to-the-clinic"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "Confirmar pagamento está disponível.",
      "O comprovante aparece com nome do arquivo e data de anexo.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "closures.paid-is-frozen",
    title: "Fechamento pago está congelado",
    intent:
      "Definir o estado terminal, que é o único do produto em que nenhum papel — nem o admin — pode agir.",
    route: "/closures",
    persona: "admin",
    fixture: "closure-paid",
    rules: ["paid-closure-is-frozen", "closure-status-moves-backward-only"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`can_interact?/2` devolve falso para Pago sem olhar o papel, e as quatro funções de anexo têm cláusula própria para ele.",
    ],
    expected: [
      "Nenhuma ação está disponível, nem para o admin.",
      "Trocar nota fiscal e comprovante aparece indisponível, com o motivo.",
      "O histórico continua legível: congelar é sobre escrita, não sobre leitura.",
    ],
    tags: ["permissão", "exceção"],
  },
  {
    id: "closures.empty",
    title: "Nenhum fechamento gerado",
    intent: "Definir o antes da virada do mês.",
    route: "/closures",
    persona: "people",
    fixture: "closures-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A tela explica que os fechamentos nascem na virada do mês, um por contrato ativo.",
    ],
    tags: ["vazio"],
  },
];
