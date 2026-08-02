import type { Rule } from "@brucesantos/design-space";
import type { PatientAddressAttempt, PatientAddressData } from "../contracts/index.js";

/**
 * Regras do endereço do paciente.
 *
 * O changeset do endereço exige seis campos e confere o formato do CEP:
 *
 * ```elixir
 * |> validate_required([:zip_code, :street, :neighborhood, :number, :city, :state])
 * |> validate_format(:zip_code, ~r/\d{5}-\d{3}/, message: "CEP inválido")
 * ```
 *
 * Mas o cadastro do paciente decide antes se esse changeset chega a rodar:
 *
 * ```elixir
 * if attrs["address"]["zip_code"] !== "" do
 *   cast_assoc(changeset, :address)
 * ```
 *
 * Com o CEP em branco, a associação não é casada. O endereço não é gravado, o
 * changeset que explicaria isso não roda, e o paciente salva com sucesso.
 */
export const patientAddressRules: Rule[] = [
  {
    id: "the-zip-code-decides-whether-the-address-exists",
    statement:
      "O CEP não é só mais um campo do endereço: é o que decide se o endereço inteiro é gravado. Preenchido tudo menos o CEP, rua, número, bairro, cidade e estado são descartados.",
    rationale:
      "Nada no formulário diz isso. O CEP parece um campo como os outros, e quem não o tem à mão — uma família recém-chegada, um endereço rural, um cadastro feito por telefone — preenche o resto achando que o resto fica. A guarda existe para permitir cadastrar sem endereço, que é uma necessidade real; o que ninguém escolheu é que ela também descarte o endereço que a pessoa acabou de digitar.",
    source: "src/rules/patientAddress.ts",
  },
  {
    id: "the-error-that-would-explain-it-never-runs",
    statement:
      "O changeset do endereço tem a mensagem exata para este caso — o CEP é obrigatório —, e a guarda impede que ele rode. A explicação está escrita no sistema e o sistema se organiza para nunca mostrá-la.",
    rationale:
      "Este é o que mais custa a corrigir depois, porque não deixa rastro: não há erro, não há campo em vermelho, não há registro de tentativa. Quem preencheu tem toda razão em achar que salvou. A correção é pequena — deixar o changeset rodar e devolver o erro que ele já sabe dar —, e o efeito é a diferença entre um cadastro incompleto conhecido e um desconhecido.",
    source: "src/rules/patientAddress.ts",
  },
  {
    id: "an-edit-that-blanks-the-zip-code-changes-nothing",
    statement:
      "Pular a associação não apaga o endereço antigo: ele fica exatamente como estava. Quem corrige a rua e apaga o CEP salva com sucesso, não muda nada, e vê o endereço velho na tela como se fosse a confirmação.",
    rationale:
      "É o pior dos casos porque o sistema exibe uma resposta plausível. No cadastro novo, ao menos falta endereço e alguém pode estranhar; aqui há um endereço, ele parece atualizado, e é o antigo. A mudança que a família pediu por telefone não aconteceu, e a única pessoa que poderia notar acabou de ver a tela dizendo que deu certo.",
    source: "src/rules/patientAddress.ts",
  },
  {
    id: "saving-without-an-address-reports-success",
    statement:
      "O cadastro é salvo e a tela confirma. O paciente existe, o endereço não, e nada na confirmação distingue esse caso de um cadastro completo.",
    rationale:
      "O endereço do paciente não é enfeite: é o que a operadora pede na guia, o que define a unidade de referência e o que a equipe usa para visita. A falta aparece semanas depois, no meio de outra tarefa, e quem a encontra não tem como saber que alguém já tinha digitado tudo aquilo.",
    source: "src/rules/patientAddress.ts",
  },
];

const CAMPOS = [
  ["street", "Rua"],
  ["neighborhood", "Bairro"],
  ["number", "Número"],
  ["city", "Cidade"],
  ["state", "Estado"],
] as const;

/**
 * Implementação de `the-zip-code-decides-whether-the-address-exists`.
 *
 * A guarda é literalmente a comparação do CEP com a string vazia.
 */
export function addressIsCast(attempt: PatientAddressAttempt): boolean {
  return attempt.zipCode !== "";
}

/** Os campos do endereço que a pessoa preencheu, com rótulo. */
export function filledFields(attempt: PatientAddressAttempt): { key: string; label: string }[] {
  return CAMPOS.filter(([key]) => attempt[key].trim() !== "").map(([key, label]) => ({
    key,
    label,
  }));
}

/**
 * Implementação de `saving-without-an-address-reports-success`.
 *
 * O caso que dói: a pessoa digitou endereço e ele não vai ser gravado.
 */
export function silentlyDiscarded(data: PatientAddressData): PatientAddressAttempt[] {
  return data.attempts.filter(
    (attempt) => !addressIsCast(attempt) && filledFields(attempt).length > 0,
  );
}

/** Quem deixou o endereço em branco de propósito: a guarda faz o que deve. */
export function deliberatelyWithoutAddress(data: PatientAddressData): PatientAddressAttempt[] {
  return data.attempts.filter(
    (attempt) => !addressIsCast(attempt) && filledFields(attempt).length === 0,
  );
}

/**
 * Implementação de `the-error-that-would-explain-it-never-runs`.
 *
 * O que o changeset do endereço devolveria se a guarda o deixasse rodar. É a
 * frase que existe no sistema e nunca chega a ninguém.
 */
export function errorTheChangesetWouldGive(attempt: PatientAddressAttempt): string | undefined {
  if (attempt.zipCode === "") return "CEP: não pode ficar em branco";
  if (!/\d{5}-\d{3}/.test(attempt.zipCode)) return "CEP inválido";
  const faltando = CAMPOS.filter(([key]) => attempt[key].trim() === "").map(([, label]) => label);
  return faltando.length > 0 ? `${faltando.join(", ")}: não pode ficar em branco` : undefined;
}

/** O endereço passaria pela validação, se ela rodasse. */
export function wouldBeValid(attempt: PatientAddressAttempt): boolean {
  return errorTheChangesetWouldGive(attempt) === undefined;
}

/**
 * O caso em que a guarda deixa passar e a validação recusa de verdade.
 *
 * Com CEP preenchido, o changeset roda e o erro aparece — é o comportamento
 * esperado, e serve para mostrar que o sistema sabe reclamar quando o deixam.
 */
export function rejectedWithAnError(data: PatientAddressData): PatientAddressAttempt[] {
  return data.attempts.filter((attempt) => addressIsCast(attempt) && !wouldBeValid(attempt));
}

/**
 * A edição que não muda nada.
 *
 * Pular `cast_assoc` **não apaga** o endereço que já existia: a associação
 * simplesmente não é tocada. Então quem edita a rua e apaga o CEP salva com
 * sucesso e continua com o endereço antigo gravado — sem ter mudado nada e sem
 * ter sido avisado disso.
 *
 * É pior que o cadastro novo perdido, porque o dado velho fica na tela e
 * parece confirmação de que a edição funcionou.
 */
export function editKeepsTheOldAddress(attempt: PatientAddressAttempt): boolean {
  return !addressIsCast(attempt) && attempt.hadAddressBefore;
}
