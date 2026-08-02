import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do portal público.
 *
 * A única parte do Bloomy usada por quem não trabalha na clínica. O critério de
 * qualidade muda: nas telas internas um erro mal explicado custa um chamado ao
 * suporte; aqui custa uma pessoa com uma criança no colo desistindo do totem e
 * indo para a fila da recepção.
 *
 * Nenhum destes cenários tem persona interna. A pessoa na frente da tela é a
 * responsável legal, e o perfil usado é o de menor permissão do produto — o
 * aplicador — para deixar explícito que nada aqui depende de permissão de
 * sistema.
 */
export const publicPortalScenarios: Scenario[] = [
  {
    id: "public.kiosk-identification",
    title: "Totem esperando um CPF",
    intent: "Definir a tela que fica aberta o dia inteiro na parede da recepção.",
    route: "/kiosk",
    persona: "applicator",
    fixture: "kiosk-identification",
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "O progresso é uma lista ordenada com `aria-current`. O campo tem rótulo associado e teclado numérico. Corpo de texto maior que o das telas internas, de propósito.",
    },
    status: "in-review",
    expected: [
      "A etapa atual é anunciada, com posição no total.",
      "O campo de CPF tem rótulo visível e alvo grande.",
      "O texto é maior que o das telas internas: quem opera está de pé.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "public.kiosk-invalid-cpf",
    title: "CPF digitado errado",
    intent:
      "Separar o erro que se resolve digitando de novo do erro que exige a recepção — são a mesma tela e ações opostas.",
    route: "/kiosk",
    persona: "applicator",
    fixture: "kiosk-invalid-cpf",
    rules: ["kiosk-distinguishes-three-failures"],
    a11y: { keyboard: "full", contrast: "AA", announces: ["kiosk.error"] },
    status: "in-review",
    expected: [
      "A mensagem diz que os números não fecham, e não que o CPF não existe.",
      "A saída oferecida é digitar de novo.",
      "O erro é anunciado para leitor de tela quando aparece.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "public.kiosk-guardian-not-found",
    title: "CPF válido, responsável não cadastrado",
    intent: "Impedir que alguém fique tentando digitar de novo um número que já está certo.",
    route: "/kiosk",
    persona: "applicator",
    fixture: "kiosk-guardian-not-found",
    rules: ["kiosk-distinguishes-three-failures"],
    a11y: { keyboard: "full", contrast: "AA", announces: ["kiosk.error"] },
    status: "in-review",
    expected: [
      "A mensagem afirma que o CPF está correto e que falta cadastro.",
      "A saída oferecida é falar com a recepção, e a tela diz que resolve rápido.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "public.kiosk-select-patient",
    title: "Escolher quem está chegando",
    intent:
      "Definir a escolha quando o responsável tem mais de um paciente, e um deles já está dentro.",
    route: "/kiosk",
    persona: "applicator",
    fixture: "kiosk-select-patient",
    rules: ["kiosk-lists-only-today-and-unstarted"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Dois pacientes agendados hoje; um já com check-in aberto."],
    expected: [
      "Cada paciente mostra os horários de hoje.",
      "Quem já está dentro oferece registrar saída, não chegada.",
      "Os alvos são grandes o bastante para quem está de pé segurando alguém.",
    ],
    tags: ["decisão", "sucesso"],
  },
  {
    id: "public.kiosk-no-patients",
    title: "Nenhum atendimento hoje",
    intent:
      "Definir o vazio que pode significar dia errado ou unidade errada — e dizer as duas possibilidades.",
    route: "/kiosk",
    persona: "applicator",
    fixture: "kiosk-no-patients",
    rules: ["kiosk-lists-only-today-and-unstarted"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A mensagem levanta as duas hipóteses: outro dia, ou outra unidade.",
      "A saída é falar com a recepção.",
    ],
    tags: ["vazio", "exceção"],
  },
  {
    id: "public.kiosk-complete",
    title: "Chegada registrada",
    intent: "Definir a confirmação e o que a família faz em seguida.",
    route: "/kiosk",
    persona: "applicator",
    fixture: "kiosk-complete",
    a11y: { keyboard: "full", contrast: "AA", announces: ["kiosk.registered"] },
    status: "in-review",
    expected: [
      "A confirmação diz que a equipe já sabe da chegada.",
      "A tela diz o que fazer agora: aguardar na recepção.",
      "A confirmação usa região de status, não de alerta — não é interrupção.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "public.kiosk-unit-not-found",
    title: "QR Code de unidade inexistente",
    intent: "Definir o que aparece quando o link do totem está errado ou antigo.",
    route: "/kiosk",
    persona: "applicator",
    fixture: "kiosk-unit-not-found",
    rules: ["kiosk-distinguishes-three-failures", "kiosk-never-goes-back"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A mensagem menciona o QR Code, que é como a pessoa chegou ali.",
      "As etapas não aparecem: não há fluxo a percorrer sem unidade.",
    ],
    tags: ["exceção", "vazio"],
  },
  {
    id: "public.nps-form",
    title: "Pesquisa de satisfação",
    intent:
      "Definir a escala de 0 a 10 como uma escolha só, percorrível por teclado, com os extremos nomeados.",
    route: "/nps",
    persona: "applicator",
    fixture: "nps-invite",
    rules: ["nps-rating-is-zero-to-ten", "nps-code-identifies-the-invite"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "A escala é um fieldset com legend e onze rádios, não onze botões soltos: as setas percorrem as notas e a escolha é uma só.",
    },
    status: "in-review",
    preconditions: ["Convite enviado, ainda sem resposta."],
    expected: [
      "Os extremos da escala são nomeados em texto, não só por número.",
      "Enviar fica indisponível enquanto não houver nota escolhida.",
      "A tela explica que nada foi contabilizado até a resposta.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "public.nps-low-rating",
    title: "Nota baixa recebe o mesmo agradecimento",
    intent:
      "Garantir que quem acabou de reclamar não receba tratamento diferente — a classificação do NPS é leitura interna.",
    route: "/nps",
    persona: "applicator",
    fixture: "nps-low-rating",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Nota 4, com comentário sobre dificuldade de horário."],
    expected: [
      "O agradecimento é o mesmo que o de uma nota alta.",
      "A tela não mostra a faixa do NPS nem qualifica a resposta.",
      "A nota e o comentário aparecem como foram enviados.",
    ],
    tags: ["decisão"],
  },
];
