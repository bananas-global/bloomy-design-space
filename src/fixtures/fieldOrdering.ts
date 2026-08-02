import type { Fixture } from "@brucesantos/design-space";
import type { FieldOrderingData, ValidatedField } from "../contracts/index.js";

/**
 * Fixtures da validação que roda antes da limpeza.
 *
 * Cinco campos reais do sistema. Os espaços nos textos são deliberados e são o
 * assunto: eles decidem o veredito e depois desaparecem.
 */

const campos: ValidatedField[] = [
  {
    id: "nps-code-rejected",
    where: "Pesquisa de satisfação",
    label: "Código da pesquisa",
    typed: "K7M2P ",
    check: { kind: "exact", value: 5, message: "deve ter exatamente 5 caracteres" },
    trimsAfterValidation: true,
    source: "lib/bloomy/nps/nps_response.ex:23",
  },
  {
    id: "nps-code-approved-short",
    where: "Pesquisa de satisfação",
    label: "Código da pesquisa",
    typed: "K7M  ",
    check: { kind: "exact", value: 5, message: "deve ter exatamente 5 caracteres" },
    trimsAfterValidation: true,
    source: "lib/bloomy/nps/nps_response.ex:23",
  },
  {
    id: "comment-rejected",
    where: "Comentário da reunião",
    label: "Conteúdo do comentário",
    // 1999 caracteres de texto e três de espaço: 2002 na conferência, 1999 no
    // banco. O `slice` fixa o número exato em vez de deixá-lo depender da
    // contagem de uma frase.
    typed: `${"A família relatou melhora na rotina de sono. ".repeat(50).slice(0, 1999)}   `,
    check: { kind: "max", value: 2000, message: "deve ter no máximo 2000 caracteres" },
    trimsAfterValidation: true,
    source: "lib/bloomy/custom_services/comments/comment.ex:32",
  },
  {
    id: "guide-number-fine",
    where: "Guia de autorização",
    label: "Número da guia",
    typed: "20260731004",
    check: { kind: "max", value: 20, message: "deve ter no máximo 20 caracteres" },
    trimsAfterValidation: true,
    source: "lib/bloomy/authorizations/authorization.ex:114",
  },
  {
    id: "room-name-correct-order",
    where: "Ponto de atendimento",
    label: "Nome da sala",
    typed: "B ",
    check: { kind: "pattern", value: "^[A-Z]$", message: "deve ser uma única letra" },
    // O contraexemplo: aqui a normalização vem antes da validação.
    trimsAfterValidation: false,
    source: "lib/bloomy/units/room_service_point.ex:31-32",
  },
];

export const fieldOrderingFixtures: Fixture[] = [
  {
    id: "field-ordering-both-directions",
    label: "Um recusado que caberia, um aceito que não cabe",
    description:
      "O código de cinco caracteres colado com espaço é recusado; o de três com espaços é aceito e gravado com três. E o nome da sala, que normaliza antes de conferir, acerta os dois.",
    data: { fields: campos } satisfies FieldOrderingData,
  },
  {
    id: "field-ordering-all-coherent",
    label: "Ninguém colou espaço nenhum",
    description:
      "Os mesmos campos sem caractere invisível. A ordem continua errada, e não produz sintoma — é por isso que ela sobrevive.",
    data: {
      fields: campos.map((campo) => ({ ...campo, typed: campo.typed.trim() })),
    } satisfies FieldOrderingData,
  },
];
