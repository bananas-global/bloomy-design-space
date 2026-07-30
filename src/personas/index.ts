import type { Persona } from "@brucesantos/design-space";

/**
 * Personas do Bloomy.
 *
 * Papel que influencia objetivo, permissão e linguagem. A recepcionista e a
 * gestora compartilham várias telas, mas não compartilham o que podem fazer
 * nelas — e é essa diferença que os cenários de permissão existem para tornar
 * visível antes da implementação.
 */
export const personas: Persona[] = [
  {
    id: "receptionist",
    name: "Recepcionista",
    goal: "Manter a agenda do dia funcionando: encaixar, confirmar, remarcar e receber.",
    description:
      "Trabalha sob interrupção constante, com o paciente na frente ou no telefone. Precisa de resposta imediata e de erro reversível.",
    permissions: [
      "agenda.read",
      "agenda.create",
      "agenda.reschedule",
      "patients.read",
      "patients.create",
      "finance.read",
    ],
  },
  {
    id: "receptionist-lead",
    name: "Recepcionista líder",
    goal: "O mesmo da recepcionista, mais as decisões que exigem responsabilidade sobre o cancelamento.",
    description:
      "Existe como persona separada porque a permissão de cancelar é o que muda o comportamento da tela de atendimento.",
    permissions: [
      "agenda.read",
      "agenda.create",
      "agenda.reschedule",
      "agenda.cancel",
      "agenda.no_show",
      "patients.read",
      "patients.create",
      "finance.read",
    ],
  },
  {
    id: "professional",
    name: "Profissional de saúde",
    goal: "Ver os atendimentos do dia e acessar o prontuário de quem está atendendo.",
    description: "Único papel com acesso a prontuário restrito.",
    permissions: [
      "agenda.read",
      "patients.read",
      "patients.record.read",
      "patients.record.restricted",
    ],
  },
  {
    id: "financial-analyst",
    name: "Analista financeiro",
    goal: "Resolver guias recusadas e pendências de documento antes que o faturamento vire perda.",
    description:
      "Trabalha em lote, por convênio, e precisa saber exatamente o que falta em cada guia.",
    permissions: ["finance.read", "claims.read", "claims.retry", "patients.read"],
  },
  {
    id: "manager",
    name: "Gestora da unidade",
    goal: "Acompanhar ocupação, ausências e faturamento sem operar a agenda.",
    description:
      "Lê tudo, opera pouco. Serve para verificar se as telas fazem sentido em modo de leitura.",
    permissions: ["agenda.read", "patients.read", "finance.read", "claims.read"],
  },
];
