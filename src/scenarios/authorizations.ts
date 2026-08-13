import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da central de autorizações.
 *
 * Substituem os sete cenários de "guia" que existiam antes. Aqueles descreviam
 * um modelo inventado — recusa, pendência de documento, em análise, autorizada —
 * que era uma aproximação grosseira das dez situações reais.
 *
 * O que se ganha não é volume: é a distinção entre situações que pedem ações
 * diferentes. Erro de sincronização não é recusa. Autorização parcial não é
 * autorização. Aguardando documentação é trabalho da clínica; aguardando
 * justificativa é do solicitante.
 */
export const authorizationScenarios: Scenario[] = [
  {
    id: "authorizations.queue",
    title: "Central de autorizações",
    intent:
      "Fazer a fila responder “o que é meu” antes de “o que é mais antigo” — que é a primeira pergunta de quem abre a tela.",
    route: "/authorizations",
    persona: "operation",
    fixture: "authorizations-queue",
    rules: ["pending-status-names-who-acts-next"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada autorização é um artigo com heading próprio. A situação tem rótulo textual, e a cor não carrega informação sozinha.",
    },
    status: "ported",
    preconditions: ["Onze autorizações de julho, cobrindo as dez situações do produto."],
    expected: [
      "A fila ordena por quem age em seguida: clínica, solicitante, convênio.",
      "Dentro de cada grupo, a mais antiga vem primeiro.",
      "Cada autorização diz qual é a próxima ação, e não apenas em que situação está.",
      "Autorizada parcialmente não aparece com o mesmo tom de autorizada.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "authorizations.empty",
    title: "Nenhuma autorização na fila",
    intent: "Definir a fila zerada.",
    route: "/authorizations",
    persona: "operation",
    fixture: "authorizations-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: ["A tela explica o que aparece aqui, e em que ordem."],
    tags: ["vazio"],
  },
  {
    id: "authorizations.with-balance",
    title: "Autorizada, com saldo",
    intent: "Definir o caso em que tudo está certo, para servir de referência aos bloqueios.",
    route: "/authorizations",
    persona: "operation",
    fixture: "authorization-with-balance",
    rules: ["authorization-availability-needs-all-three"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["Autorizada, dentro da validade, com nove de dezesseis sessões consumidas."],
    expected: [
      "A tela afirma que serve para agendar hoje.",
      "O saldo aparece como usadas sobre o teto, e quantas sobram.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "authorizations.one-package-exhausted",
    title: "Um pacote esgotado trava a autorização inteira",
    intent:
      "Tornar visível a consequência do `Enum.all?` — a autorização para de servir por causa de um pacote, mesmo com saldo em outro.",
    route: "/authorizations",
    persona: "operation",
    fixture: "authorization-one-package-exhausted",
    rules: ["authorization-availability-needs-all-three"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "Psicologia esgotou em 8 de 8; fonoaudiologia tem 2 de 4 consumidas.",
      "`Availability` exige saldo em todos os pacotes, não em algum.",
    ],
    expected: [
      "O bloqueio nomeia qual pacote esgotou.",
      "A tela diz que a autorização inteira fica indisponível mesmo com saldo nos outros.",
      "O pacote com saldo continua mostrando quantas sessões sobram.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "authorizations.capitation",
    title: "Capitation não multiplica",
    intent:
      "Impedir que a quantidade seja multiplicada num modelo em que ela não multiplica — o erro cria saldo que o convênio não paga.",
    route: "/authorizations",
    persona: "operation",
    fixture: "authorization-capitation",
    rules: ["capitation-ignores-quantity"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["Quantidade 3 e máximo mensal 12. O teto continua 12."],
    expected: [
      "O teto exibido é 12, e não 36.",
      "A tela explica que capitation ignora a quantidade, ao lado do número.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "authorizations.expired",
    title: "Validade vencida",
    intent:
      "Mostrar que autorizada e com saldo não basta — a janela é a terceira condição, e a mais fácil de esquecer.",
    route: "/authorizations",
    persona: "operation",
    fixture: "authorization-expired",
    rules: ["authorization-availability-needs-all-three"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["Janela de junho, saldo de 3 em 16, e a data de referência é 30 de julho."],
    expected: [
      "A validade aparece marcada como vencida, com quantos dias.",
      "O motivo do bloqueio cita as duas datas da janela.",
      "O saldo continua visível: ele não é o problema.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "authorizations.partial",
    title: "Autorizada parcialmente",
    intent:
      "Dar o número que decide o que fazer — quantas sessões faltaram — em vez de um aviso de que algo mudou.",
    route: "/authorizations",
    persona: "operation",
    fixture: "authorization-partial",
    rules: ["partial-authorization-is-not-authorization"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["Pedidas 16 sessões, o convênio liberou 8."],
    expected: [
      "A diferença aparece em número, no título do aviso.",
      "A situação não usa o mesmo tom de autorizada.",
      "A tela diz o que aconteceria se a clínica agendasse as 16.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "authorizations.sync-error",
    title: "Erro de sincronização não é recusa",
    intent:
      "Impedir que uma falha técnica mande a clínica remontar um pedido que estava correto — enquanto o prazo corre.",
    route: "/authorizations",
    persona: "operation",
    fixture: "authorization-sync-error",
    rules: ["sync-error-is-not-denial"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["Certificado expirado e timeout de elegibilidade na comunicação."],
    expected: [
      "A tela diz que a integração falhou e que reenviar resolve.",
      "Os erros técnicos aparecem listados, e não escondidos atrás de “erro”.",
      "A ação é classificada como da clínica, junto das outras que ela precisa resolver.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "authorizations.waiting-documentation",
    title: "Aguardando documentação da clínica",
    intent:
      "Separar a espera que é trabalho da clínica das outras três esperas, que não são.",
    route: "/authorizations",
    persona: "operation",
    fixture: "authorization-waiting-documentation",
    rules: ["pending-status-names-who-acts-next"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["Convênio pediu relatório de evolução e cópia do plano terapêutico."],
    expected: [
      "A tela diz que a ação é da operação e que é o que destrava.",
      "O pedido do convênio aparece por extenso.",
      "A situação não é apresentada como recusa.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "authorizations.no-access",
    title: "A recepção não alcança a central",
    intent:
      "Tornar discutível que quem recebe a ligação do convênio o dia inteiro não vê a central de autorizações.",
    route: "/authorizations",
    persona: "attendant",
    fixture: "authorizations-queue",
    rules: ["only-admin-edits-authorization"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "`view_authorization_hub` é de admin, admin de clínica e operação. A recepção não tem.",
    ],
    expected: [
      "A tela nomeia quem alcança a central.",
      "A negativa registra que quem opera a agenda o dia inteiro fica de fora.",
    ],
    tags: ["permissão", "exceção"],
  },
];
