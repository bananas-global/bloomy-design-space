import type { Fixture } from "@brucesantos/design-space";
import type { PatientAddressAttempt, PatientAddressData } from "../contracts/index.js";

/**
 * Fixtures do endereço do paciente.
 *
 * Cinco tentativas de salvar, escolhidas para separar o que a guarda faz de
 * propósito do que ela faz sem querer.
 *
 * Dados sintéticos: endereços inventados, nenhum real.
 */

function tentativa(
  overrides: Partial<PatientAddressAttempt> & { id: string },
): PatientAddressAttempt {
  return {
    patientName: "Helena M.",
    zipCode: "04567-010",
    street: "Rua das Acácias",
    neighborhood: "Vila Aurora",
    number: "212",
    city: "São Paulo",
    state: "SP",
    hadAddressBefore: false,
    ...overrides,
  };
}

const tentativas: PatientAddressAttempt[] = [
  tentativa({
    id: "a1",
    patientName: "Otávio L.",
    // Tudo preenchido menos o CEP: o endereço inteiro é descartado em silêncio.
    zipCode: "",
    street: "Estrada do Aterrado, km 4",
    neighborhood: "Zona rural",
    number: "s/n",
    city: "Ibiúna",
    state: "SP",
  }),
  tentativa({
    id: "a2",
    patientName: "Bruna S.",
    // Edição: o CEP foi apagado ao corrigir a rua. Nada muda, e o antigo fica.
    zipCode: "",
    street: "Avenida Cambuci, 900",
    hadAddressBefore: true,
  }),
  tentativa({
    id: "a3",
    patientName: "Ivo P.",
    // Cadastro deliberadamente sem endereço: a guarda faz exatamente o que deve.
    zipCode: "",
    street: "",
    neighborhood: "",
    number: "",
    city: "",
    state: "",
  }),
  tentativa({
    id: "a4",
    patientName: "Nina C.",
    // CEP preenchido e bairro em branco: o changeset roda e reclama, como deve.
    neighborhood: "",
  }),
  tentativa({ id: "a5", patientName: "Helena M." }),
];

export const patientAddressFixtures: Fixture[] = [
  {
    id: "patient-address-mixed",
    label: "Dois endereços perdidos, um recusado com erro, dois corretos",
    description:
      "Um cadastro rural sem CEP, uma edição que apaga o CEP e não muda nada, um cadastro sem endereço de propósito, um recusado com mensagem e um completo.",
    data: { attempts: tentativas } satisfies PatientAddressData,
  },
  {
    id: "patient-address-all-with-zip",
    label: "Todo mundo com CEP",
    description:
      "A guarda deixa passar e o changeset do endereço roda em todos. É assim que o sistema se comporta quando ninguém tropeça no CEP.",
    data: {
      // Completa os campos vazios em vez de só preencher o CEP: senão a
      // tentativa que estava totalmente em branco viraria uma recusa, e o
      // cenário deixaria de mostrar o que promete.
      attempts: tentativas.map((t) => ({
        ...t,
        zipCode: t.zipCode || "18150-000",
        street: t.street || "Rua Central",
        neighborhood: t.neighborhood || "Centro",
        number: t.number || "40",
        city: t.city || "Ibiúna",
        state: t.state || "SP",
      })),
    } satisfies PatientAddressData,
  },
];
