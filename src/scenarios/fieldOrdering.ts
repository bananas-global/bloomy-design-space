import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da validação que roda antes da limpeza.
 *
 * 123 changesets aparam os espaços na última etapa, depois de validar. O
 * veredito é dado sobre um texto, e outro é gravado.
 */
export const fieldOrderingScenarios: Scenario[] = [
  {
    id: "structure.field-ordering-rejected",
    title: "Recusado por um espaço que não seria gravado",
    intent:
      "Dar número ao caractere invisível, que é a única coisa capaz de explicar um veredito que a tela contradiz.",
    route: "/structure/fields",
    persona: "attendant",
    fixture: "field-ordering-both-directions",
    rules: ["validation-runs-before-the-cleaning", "rejected-for-characters-that-would-vanish"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "O veredito e a incoerência dele são ditos em palavras, e não por cor.",
    },
    status: "ported",
    preconditions: [
      "`Bloomy.Helpers.trim_changed_fields/1` é a última etapa de 123 changesets.",
      "O código da pesquisa exige exatamente 5 caracteres e foi colado com um espaço no fim.",
    ],
    expected: [
      "A quantidade de caracteres invisíveis aparece como número.",
      "A tela diz que sem eles o valor caberia.",
      "O tamanho é mostrado nas duas contagens: como veio e depois de aparado.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "structure.field-ordering-approved-invalid",
    title: "Aceito na tela, inválido no banco",
    intent:
      "Separar o defeito que a pessoa vê do defeito que fica guardado, porque só o segundo não tem quem reclame.",
    route: "/structure/fields",
    persona: "admin",
    fixture: "field-ordering-both-directions",
    rules: ["approved-on-characters-that-vanish"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "Um código de três caracteres foi enviado com dois espaços no fim.",
      "A validação de tamanho exato roda antes da limpeza.",
    ],
    expected: [
      "O aviso diz com quantos caracteres passou e com quantos foi gravado.",
      "A tela nomeia a consequência: o formato deixa de valer para quem confia nele.",
      "O caso aparece separado do caso da recusa.",
    ],
    tags: ["regra", "risco", "exceção"],
  },
  {
    id: "structure.field-ordering-correct-order-exists",
    title: "A ordem certa já existe num campo",
    intent:
      "Mostrar que a correção é estender uma decisão já tomada aqui dentro, e não escolher uma política nova.",
    route: "/structure/fields",
    persona: "admin",
    fixture: "field-ordering-both-directions",
    rules: ["the-correct-order-already-exists-in-the-repo"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "O nome do ponto de atendimento normaliza com `update_change` antes do `validate_format`.",
    ],
    expected: [
      "O campo que acerta a ordem é nomeado e marcado na listagem.",
      "A tela diz que corrigir os outros é estender essa ordem.",
    ],
    tags: ["regra", "sucesso"],
  },
  {
    id: "structure.field-ordering-no-symptom",
    title: "Sem espaço colado, a ordem errada não dá sintoma",
    intent:
      "Fixar por que o defeito sobrevive: no caminho comum ele não produz nada de errado.",
    route: "/structure/fields",
    persona: "admin",
    fixture: "field-ordering-all-coherent",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "Nenhum dos dois avisos aparece.",
      "Nenhum campo é marcado como incoerente.",
    ],
    tags: ["sucesso"],
  },
];
