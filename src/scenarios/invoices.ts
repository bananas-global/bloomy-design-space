import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da fatura de convênio.
 *
 * Metade deles existe por um motivo só: duas maneiras de a clínica perder
 * dinheiro sem receber aviso nenhum. O monólito soma sem reclamar nos dois
 * casos, e é por isso que eles viram tela antes de virarem conversa com a
 * operadora.
 */
export const invoiceScenarios: Scenario[] = [
  {
    id: "invoices.ready",
    title: "Fatura pronta para fechar",
    intent: "Definir o caso limpo, para servir de referência aos bloqueios.",
    route: "/invoices/fat-2026-07-bradesco",
    persona: "admin",
    fixture: "invoice-ready",
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "As linhas são uma lista com heading próprio. Valor por sessão e total têm texto, não só posição.",
    },
    status: "in-review",
    preconditions: ["Duas autorizações atendidas, com acordo ativo, e os três identificadores preenchidos."],
    expected: [
      "Cada linha mostra sessões realizadas sobre autorizadas, preço por sessão e total.",
      "O total do lote aparece separado das linhas.",
      "Gerar lote e fechar está disponível.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "invoices.silent-losses",
    title: "As duas perdas silenciosas",
    intent:
      "Desfazer o silêncio do cálculo: uma autorização que não entra e outra que entra valendo zero, ambas sem aviso no sistema real.",
    route: "/invoices/fat-2026-07-bradesco",
    persona: "admin",
    fixture: "invoice-silent-losses",
    rules: [
      "invoice-includes-only-executed-authorizations",
      "authorization-without-agreement-is-worth-zero",
    ],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "Uma autorização com zero atendimentos, descartada antes da soma.",
      "Uma atendida cujo pacote não tem acordo ativo, somada como `0.0`.",
    ],
    expected: [
      "Os dois avisos aparecem antes do total, não depois — quem confere precisa vê-los enquanto dá para agir.",
      "O aviso do acordo diz quantas sessões vão a zero, e admite que o valor perdido é desconhecível.",
      "A linha sem acordo aparece destacada dentro da lista faturada.",
      "As autorizações fora do lote aparecem em seção própria, nomeadas.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "invoices.missing-fields",
    title: "Faltam os identificadores do lote",
    intent: "Impedir um envio que ninguém consegue rastrear depois.",
    route: "/invoices/fat-2026-07-bradesco",
    persona: "admin",
    fixture: "invoice-missing-fields",
    rules: ["invoice-needs-number-protocol-igdr"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Número preenchido; protocolo e IGDR em branco."],
    expected: [
      "Fechar aparece indisponível, nomeando os dois campos que faltam.",
      "A tela explica para que servem os identificadores, e não só que são obrigatórios.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "invoices.nothing-executed",
    title: "Nenhum atendimento no período",
    intent: "Definir a competência em que não há o que faturar.",
    route: "/invoices/fat-2026-07-bradesco",
    persona: "admin",
    fixture: "invoice-nothing-executed",
    rules: ["invoice-includes-only-executed-authorizations"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A lista faturada explica que nenhuma autorização teve atendimento.",
      "Fechar aparece indisponível pelo mesmo motivo.",
      "A autorização sem execução continua listada na seção de fora do lote.",
    ],
    tags: ["vazio", "regra"],
  },
  {
    id: "invoices.generated",
    title: "Lote já gerado",
    intent: "Impedir divergência entre o que a clínica vê e o que a operadora recebeu.",
    route: "/invoices/fat-2026-07-bradesco",
    persona: "admin",
    fixture: "invoice-generated",
    rules: ["generated-invoice-is-final"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A fatura aparece marcada como lote gerado.",
      "Fechar de novo fica indisponível, dizendo que a divergência só apareceria na glosa.",
      "As linhas continuam legíveis: travar é sobre escrita.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "invoices.health-care-incomplete",
    title: "Operadora sem códigos TISS",
    intent:
      "Tornar visível um cadastro que passa na validação e falha na geração do XML — o pior momento para descobrir.",
    route: "/invoices/fat-2026-07-bradesco",
    persona: "admin",
    fixture: "invoice-health-care-incomplete",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`provider_code` e `requester_code` são opcionais no changeset de `HealthCare` e obrigatórios no lote.",
    ],
    expected: [
      "O aviso nomeia os dois códigos que faltam.",
      "A tela diz que eles são opcionais no cadastro e obrigatórios no lote.",
      "Os campos aparecem marcados como não cadastrados na ficha da operadora.",
    ],
    tags: ["exceção"],
  },
  {
    id: "invoices.no-access",
    title: "A operação não alcança as faturas",
    intent:
      "Tornar discutível que quem cuida do contrato com a operadora não vê a fatura enviada a ela.",
    route: "/invoices/fat-2026-07-bradesco",
    persona: "operation",
    fixture: "invoice-ready",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`HealthcareInvoicePolicy.can?(role, :list)` é de admin e admin de clínica. `operation` cria e edita a operadora, e não vê a fatura dela.",
    ],
    expected: [
      "A tela nomeia quem alcança as faturas.",
      "A negativa registra que a operação cuida do contrato e não vê o faturamento.",
    ],
    tags: ["permissão", "exceção"],
  },
];
