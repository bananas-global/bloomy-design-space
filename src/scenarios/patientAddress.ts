import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do endereço do paciente.
 *
 * Uma guarda de um campo só decide se o endereço inteiro é gravado, e o
 * changeset que explicaria a perda é justamente o que ela impede de rodar.
 */
export const patientAddressScenarios: Scenario[] = [
  {
    id: "patients.address-discarded-without-zip",
    title: "Sem CEP, o endereço inteiro é descartado",
    intent:
      "Nomear campo a campo o que a pessoa acabou de digitar e vai perder, em vez de dizer que o endereço não será salvo.",
    route: "/patients/address",
    persona: "attendant",
    fixture: "patient-address-mixed",
    rules: [
      "the-zip-code-decides-whether-the-address-exists",
      "saving-without-an-address-reports-success",
    ],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "O desfecho de cada cadastro é dito em palavras na etiqueta, não pela cor.",
    },
    status: "ported",
    preconditions: [
      "`maybe_cast_address/2` casa a associação só quando `attrs[\"address\"][\"zip_code\"] !== \"\"`.",
      "Um cadastro rural preencheu rua, bairro, número, cidade e estado, e deixou o CEP em branco.",
    ],
    expected: [
      "Os campos preenchidos são listados com o que foi digitado em cada um.",
      "A tela diz que o CEP é o que decide se o endereço existe.",
      "A tela diz que o cadastro é salvo com sucesso mesmo assim.",
    ],
    tags: ["regra", "risco", "decisão"],
  },
  {
    id: "patients.address-edit-changes-nothing",
    title: "A edição que não muda nada e parece que mudou",
    intent:
      "Separar a perda do cadastro novo da edição silenciosa, que exibe o dado antigo como se fosse confirmação.",
    route: "/patients/address",
    persona: "clinic_admin",
    fixture: "patient-address-mixed",
    rules: ["an-edit-that-blanks-the-zip-code-changes-nothing"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "Pular `cast_assoc` não apaga a associação existente: ela fica intacta.",
      "Alguém corrigiu a rua e apagou o CEP no mesmo envio.",
    ],
    expected: [
      "O aviso diz que o endereço anterior continua gravado como estava.",
      "O caso aparece separado do cadastro novo perdido.",
      "A tela liga o problema ao fato de a tela seguinte exibir o dado antigo.",
    ],
    tags: ["regra", "risco", "exceção"],
  },
  {
    id: "patients.address-error-exists-and-is-skipped",
    title: "A frase que explicaria já está escrita",
    intent:
      "Mostrar que a correção é deixar rodar uma checagem que já existe, e não escrever comportamento novo.",
    route: "/patients/address",
    persona: "admin",
    fixture: "patient-address-mixed",
    rules: ["the-error-that-would-explain-it-never-runs"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "O cadastro de endereço exige `zip_code` e confere o formato.",
      "A guarda impede esse cadastro de rodar exatamente quando ele reclamaria.",
    ],
    expected: [
      "A mensagem que o sistema já tem aparece na tela, entre aspas.",
      "A tela diz que a correção é deixar a checagem acontecer.",
      "Um cadastro com CEP preenchido e bairro faltando mostra o sistema reclamando de verdade.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "patients.address-deliberately-absent",
    title: "Cadastrar sem endereço precisa continuar possível",
    intent:
      "Fixar o motivo de a guarda existir, para que a correção não a remova junto com o defeito.",
    route: "/patients/address",
    persona: "attendant",
    fixture: "patient-address-mixed",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "O cadastro sem nenhum campo de endereço aparece como salvo, e não como perda.",
      "A tela diz que essa é a necessidade que a guarda atende.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "patients.address-all-with-zip",
    title: "Com CEP em todos, nada se perde",
    intent: "Fixar que os avisos calam no caminho comum, que é por onde o defeito passa despercebido.",
    route: "/patients/address",
    persona: "attendant",
    fixture: "patient-address-all-with-zip",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "Nenhum aviso de perda aparece.",
      "Todos os cadastros terminam com o endereço gravado.",
    ],
    tags: ["sucesso"],
  },
];
