import type { Rule } from "@brucesantos/design-space";
import type { FieldOrderingData, ValidatedField } from "../contracts/index.js";

/**
 * Regras da validação que roda antes da limpeza.
 *
 * O ajudante é curto e faz o que promete:
 *
 * ```elixir
 * def trim_changed_fields(changeset) do
 *   Enum.reduce(changeset.changes, changeset, fn {field, value}, acc ->
 *     if is_binary(value), do: put_change(acc, field, String.trim(value)), else: acc
 *   end)
 * end
 * ```
 *
 * O problema é a posição: ele é a **última** etapa de 123 changesets, depois de
 * todas as validações. Então o valor conferido e o valor gravado são diferentes,
 * e a diferença são exatamente os caracteres que ninguém vê.
 *
 * O contraexemplo está no mesmo repositório. Em `RoomServicePoint`:
 *
 * ```elixir
 * |> update_change(:name, &normalize_name/1)
 * |> validate_format(:name, ~r/^[A-Z]$/, message: "deve ser uma única letra")
 * ```
 *
 * Normaliza primeiro, valida depois. É a ordem certa, e ela já existe aqui.
 */
export const fieldOrderingRules: Rule[] = [
  {
    id: "validation-runs-before-the-cleaning",
    statement:
      "A limpeza dos espaços é a última etapa do changeset, depois de todas as validações. O sistema confere um texto e grava outro, e a diferença entre os dois são caracteres invisíveis.",
    rationale:
      "Cada metade está certa sozinha: aparar espaços na gravação é bom, e validar o que a pessoa mandou é o esperado. Juntas na ordem errada, elas produzem os dois erros opostos — recusar o que caberia e aceitar o que não cabe. Não é um campo: são 123 changesets, porque o ajudante é chamado no fim de todos eles.",
    source: "src/rules/fieldOrdering.ts",
  },
  {
    id: "rejected-for-characters-that-would-vanish",
    statement:
      "Um texto recusado por passar do limite pode caber depois de aparado. A mensagem de erro conta caracteres que nunca seriam gravados, e a pessoa olha para o campo sem ver o que está sobrando.",
    rationale:
      "É o erro que mais custa a quem preenche, porque não tem saída visível: o código de cinco caracteres colado de um e-mail veio com um espaço no fim, o sistema diz que precisa ter exatamente cinco, e o campo mostra cinco. Quem não desconfia de espaço invisível não tem como resolver.",
    source: "src/rules/fieldOrdering.ts",
  },
  {
    id: "approved-on-characters-that-vanish",
    statement:
      "O inverso é pior: um texto curto demais **passa** na validação por causa dos espaços, e é gravado sem eles. A regra de tamanho mínimo é contornada por quem nem estava tentando contorná-la.",
    rationale:
      "Aqui o defeito não fica na tela, fica no banco. Um código que a validação exige ter cinco caracteres é gravado com três, e daí em diante todo código que assume o formato encontra um valor que não deveria existir. A validação não falhou por engano — ela aprovou exatamente o que viu, e o que viu não é o que foi guardado.",
    source: "src/rules/fieldOrdering.ts",
  },
  {
    id: "the-correct-order-already-exists-in-the-repo",
    statement:
      "O nome do ponto de atendimento normaliza o texto **antes** de validar o formato. É a ordem certa, escrita neste mesmo sistema, num campo só.",
    rationale:
      "Vale apontar porque muda a natureza da correção: não é decidir uma política nova, é estender a que já foi decidida uma vez. E porque o contraste torna o defeito visível — dois campos vizinhos, duas ordens, e só uma confere o que vai guardar.",
    source: "src/rules/fieldOrdering.ts",
  },
];

/**
 * O que de fato vai para o banco: o texto aparado.
 *
 * Não depende da ordem — nas duas o valor guardado é o mesmo. É justamente por
 * isso que a ordem só muda o **veredito**, e nunca o conteúdo.
 */
export function storedValue(field: ValidatedField): string {
  return field.typed.trim();
}

/**
 * O texto que a validação examina.
 *
 * Com a ordem errada, é o que a pessoa digitou, espaços inclusive. Com a ordem
 * certa, é o texto já normalizado.
 */
export function validatedValue(field: ValidatedField): string {
  return field.trimsAfterValidation ? field.typed : field.typed.trim();
}

/** Aplica a regra do campo a um texto qualquer. */
export function satisfies(field: ValidatedField, text: string): boolean {
  const { kind, value } = field.check;
  switch (kind) {
    case "exact":
      return text.length === value;
    case "max":
      return text.length <= (value as number);
    case "min":
      return text.length >= (value as number);
    case "pattern":
      return new RegExp(value as string).test(text);
  }
}

/** O veredito que a pessoa recebe. */
export function isAccepted(field: ValidatedField): boolean {
  return satisfies(field, validatedValue(field));
}

/** O veredito que o valor gravado mereceria. */
export function wouldBeAcceptedAsStored(field: ValidatedField): boolean {
  return satisfies(field, storedValue(field));
}

/**
 * Implementação de `rejected-for-characters-that-would-vanish`.
 *
 * Recusado como veio, aceito como seria guardado.
 */
export function rejectedForInvisibleCharacters(data: FieldOrderingData): ValidatedField[] {
  return data.fields.filter((field) => !isAccepted(field) && wouldBeAcceptedAsStored(field));
}

/**
 * Implementação de `approved-on-characters-that-vanish`.
 *
 * Aceito como veio, e o que foi guardado não cumpre a regra.
 */
export function approvedButStoredInvalid(data: FieldOrderingData): ValidatedField[] {
  return data.fields.filter((field) => isAccepted(field) && !wouldBeAcceptedAsStored(field));
}

/** Os campos em que o veredito e o valor guardado combinam. */
export function coherent(data: FieldOrderingData): ValidatedField[] {
  return data.fields.filter((field) => isAccepted(field) === wouldBeAcceptedAsStored(field));
}

/** O contraexemplo: quem normaliza antes de conferir. */
export function checksWhatItStores(data: FieldOrderingData): ValidatedField[] {
  return data.fields.filter((field) => !field.trimsAfterValidation);
}

/**
 * Quantos caracteres invisíveis o texto carrega.
 *
 * É o número que a pessoa não consegue ver no campo, e o único que explica o
 * veredito.
 */
export function invisibleCharacters(field: ValidatedField): number {
  return field.typed.length - field.typed.trim().length;
}

/** Como dizer o tamanho sem obrigar ninguém a contar. */
export function sizeLabel(field: ValidatedField): string {
  const cru = field.typed.length;
  const guardado = storedValue(field).length;
  return cru === guardado
    ? `${cru} ${cru === 1 ? "caractere" : "caracteres"}`
    : `${cru} como veio, ${guardado} depois de aparado`;
}
