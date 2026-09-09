import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenário da gestão de chamadas.
 *
 * **Um só, e é uma decisão de escopo.** A área nasceu com sete — a fila, o
 * bloqueio por campo em falta, o público inteiro offline, o auto-preenchimento
 * pela agenda, a fila vazia, a chave-geral desligada e o histórico. Na revisão
 * de 04/09/2026 os cinco últimos saíram: a área é proposta, ainda não aprovada,
 * e sete situações de uma coisa que ninguém decidiu construir é especificação
 * escrita adiantada. A fila é o caso que carrega a intenção da área inteira.
 *
 * **O bloqueio virou critério deste cenário, e não um segundo cenário.** Na
 * revisão de 08/09 a lista de duas situações passou a uma. Ele não podia
 * simplesmente sair: `tests/product.test.ts` exige de cada módulo pelo menos um
 * cenário de exceção ou permissão — módulo só com caminho feliz é módulo que
 * ninguém testou onde dói —, e o bloqueio por campo em falta é o único
 * impedimento duro da área, com custo de erro que sai pelo alto-falante da sala
 * de espera. Então desceu para dentro: a regra, os critérios e a nota de
 * teclado dele estão aqui, e a etiqueta `exceção` veio junto.
 *
 * Isso não é contorno da regra do teste — é a mesma cobertura em um cenário só.
 * Os dois já tinham a mesma rota e a mesma fixture; o que os separava era só o
 * painel de nova chamada estar aberto, e isso é um clique dentro da situação,
 * não outra situação.
 *
 * O que saiu junto está registrado na decisão 0017.
 *
 * **`proposed`, e não `ported`.** O baseline de 2026-08 é referência importada
 * do monólito; isto é desenho novo, entrando agora na fila de trabalho — e por
 * isso entra também na suíte automatizada, com jornada, axe, zoom e toque.
 *
 * A persona é sempre `attendant`. Não é escolha de conveniência: a área existe
 * para a pessoa que trabalha sob interrupção, com o responsável na frente ou no
 * telefone, e que hoje resolve isto atravessando o corredor a pé. Uma
 * especificação que lesse esta tela pela coordenação descreveria um painel de
 * indicadores, que é outra coisa.
 */
export const callScenarios: Scenario[] = [
  /* ================================================================ a fila */
  {
    id: "calls.queue",
    title: "Chamadas",
    intent:
      "Fixar a leitura básica da área: a fila é de trabalho, ordenada por espera, e cada cartão já traz a frase que vai ser falada em voz alta. E provar o único bloqueio duro da área, que é o campo em falta não virar anúncio.",
    route: "/calls",
    persona: "attendant",
    fixture: "calls-day",
    rules: [
      "the-queue-is-ordered-by-waiting-not-arrival",
      "waiting-temperature-is-said-in-words",
      "an-event-leaves-the-queue-only-when-announced-or-dismissed",
      "an-unfilled-field-cannot-be-announced",
    ],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada pendência é um item de lista com as três ações alcançáveis por Tab. A temperatura da espera tem palavra — “Atenção”, “Urgente” — e não só cor de borda. O que a tela acabou de fazer é anunciado por `role=\"status\"`. No painel de nova chamada, o botão Anunciar não sai da ordem de foco quando bloqueado: usa `aria-disabled` com o motivo associado por `aria-describedby`, como manda a decisão 0006 do motor, e o motivo aparece também junto da mensagem, que é onde os olhos estão.",
      announces: [
        "Chamada anunciada para {nome} em {n} dispositivos.",
        "Pendência de {nome} dispensada. Ela sai da fila e não será anunciada.",
      ],
    },
    status: "proposed",
    preconditions: [
      "A hora de referência é 10:40, declarada na fixture.",
      "Quatro eventos em aberto, com 40, 35, 10 e 2 minutos de espera.",
      "Quatro dispositivos online na unidade e um offline.",
      "O painel de nova chamada abre no tipo Profissional, sem criança escolhida, com o modelo “Criança chegou” selecionado.",
    ],
    expected: [
      "A fila abre ordenada por espera decrescente, e não pela hora do evento.",
      "As faixas de 5 e de 15 minutos trazem “Atenção” e “Urgente” por extenso.",
      "Cada cartão mostra a frase pronta, entre aspas, antes de qualquer ação.",
      "O cartão de quem já foi chamado e não respondeu diz quantas vezes foi, e a ação passa a ser “Chamar novamente”.",
      "Sem criança escolhida, a mensagem do painel mostra os campos que faltam entre colchetes — `[profissional]`, `[criança]` —, e não uma frase mutilada.",
      "Nesse estado, Anunciar fica indisponível, visível e alcançável por Tab, e o motivo é lido no foco.",
      "Escolhida a criança, os colchetes desaparecem e o botão libera na mesma passagem.",
    ],
    tags: ["lista", "sucesso", "regra", "exceção", "formulário"],
  },
];
