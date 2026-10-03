/**
 * Documentos da unidade — dados sintéticos e determinísticos.
 *
 * As duas unidades do protótipo (`UNITS_DATA`): a Unidade Teste, com os doze
 * documentos padrão e o contrato social, e Santana, só com alvará e licença
 * sanitária. Hoje é 05/08/2026. Nomes e documentos são fictícios.
 *
 * Com alertas, a Unidade Teste tem a dedetização vencida, o laudo de
 * potabilidade a vencer e um aditivo de locação aguardando vigência; Santana,
 * a licença sanitária a vencer.
 */
import type { Fixture } from "@brucesantos/design-space";
import type { UnitHeader } from "../../layouts/UnitLayout.js";
import type { UnitDocument } from "./model.js";

export type UnitId = "u1" | "u2";

export type DocumentsUnit = { id: UnitId; name: string; header: UnitHeader };

export type UnitDocumentsFixture = { units: DocumentsUnit[] };

export const UNITS: DocumentsUnit[] = [
  {
    id: "u1",
    name: "Unidade Teste",
    header: {
      name: "Unidade Teste",
      active: true,
      professionalsCount: 4,
      roomsCount: 4,
      phone: "(11) 3255-8890",
      address: { street: "Av. Paulista", number: "1578", neighborhood: "Bela Vista", city: "São Paulo", state: "SP" },
    },
  },
  {
    id: "u2",
    name: "Santana",
    header: {
      name: "Santana",
      active: true,
      professionalsCount: 5,
      roomsCount: 3,
      phone: "(11) 2098-4471",
      address: { street: "Rua Voluntários da Pátria", number: "2044", neighborhood: "Santana", city: "São Paulo", state: "SP" },
    },
  },
];

export const unitById = (id: string) => UNITS.find((u) => u.id === id) ?? UNITS[0]!;

const RESPONSIBLE = "Marina Alves";
const UNIMED = "op1";
const BRADESCO = "op2";

const doc = (d: Omit<UnitDocument, "responsible" | "sharedWith"> & Partial<UnitDocument>): UnitDocument => ({
  responsible: RESPONSIBLE,
  sharedWith: [],
  ...d,
});

function unidadeTeste(alerts: boolean): UnitDocument[] {
  return [
    doc({ id: "d1a", slotId: "cli", type: "license", name: "CLI — Certificado de Licenciamento Integrado", validFrom: "15/01/2026", validUntil: "14/01/2027", updatedAt: "15/01/2026", file: "cli-2026.pdf", sharedWith: [UNIMED] }),
    doc({ id: "d1", slotId: "alvara", type: "license", name: "Alvará de Funcionamento", validFrom: "01/01/2026", validUntil: "31/12/2026", updatedAt: "10/01/2026", file: "alvara-2026.pdf", sharedWith: [UNIMED, BRADESCO] }),
    doc({ id: "d2", slotId: "avcb", type: "certificate", name: "AVCB — Auto de Vistoria do Corpo de Bombeiros", validFrom: "01/06/2025", validUntil: "20/07/2028", updatedAt: "18/06/2025", file: "avcb.pdf", sharedWith: [UNIMED] }),
    doc({ id: "d3", slotId: "vigilancia", type: "license", name: "Licença da Vigilância Sanitária", validFrom: "01/03/2025", validUntil: "28/02/2027", updatedAt: "05/03/2025", file: "vigilancia-sanitaria.pdf", sharedWith: [UNIMED] }),
    doc({ id: "d1b", slotId: "cnes", type: "certificate", name: "CNES — Cadastro Nacional de Estabelecimentos de Saúde", validFrom: "10/02/2024", validUntil: null, updatedAt: "10/02/2024", file: "cnes-7418529.pdf", sharedWith: [UNIMED] }),
    doc({ id: "d1c", slotId: "crp", type: "certificate", name: "Registro no CRP", validFrom: "01/02/2026", validUntil: "31/01/2027", updatedAt: "01/02/2026", file: "crp-pj.pdf", sharedWith: [UNIMED] }),
    doc({ id: "d1d", slotId: "crefito", type: "certificate", name: "Registro no CREFITO", validFrom: "01/02/2026", validUntil: "31/01/2027", updatedAt: "01/02/2026", file: "crefito-pj.pdf", sharedWith: [UNIMED] }),
    doc({ id: "d1e", slotId: "crefono", type: "certificate", name: "Registro no CREFONO", validFrom: "01/02/2026", validUntil: "31/01/2027", updatedAt: "01/02/2026", file: "crefono-pj.pdf", sharedWith: [UNIMED] }),
    alerts
      ? doc({ id: "d1f", slotId: "dedetizacao", type: "certificate", name: "Certificado de Dedetização", validFrom: "01/02/2026", validUntil: "31/07/2026", updatedAt: "01/02/2026", file: "dedetizacao-fev26.pdf", sharedWith: [UNIMED] })
      : doc({ id: "d1f", slotId: "dedetizacao", type: "certificate", name: "Certificado de Dedetização", validFrom: "01/06/2026", validUntil: "30/11/2026", updatedAt: "01/06/2026", file: "dedetizacao-jun26.pdf", sharedWith: [UNIMED] }),
    doc({ id: "d1g", slotId: "potabilidade", type: "certificate", name: "Laudo de Potabilidade da Água", validFrom: "01/03/2026", validUntil: alerts ? "30/08/2026" : "30/11/2026", updatedAt: "01/03/2026", file: "potabilidade-mar26.pdf", sharedWith: [UNIMED] }),
    doc({ id: "d1h", slotId: "residuos", type: "certificate", name: "PGRSS — Plano de Gerenciamento de Resíduos", validFrom: "01/01/2026", validUntil: "31/12/2026", updatedAt: "01/01/2026", file: "pgrss-2026.pdf", sharedWith: [UNIMED] }),
    doc({ id: "d1i", slotId: "locacao", type: "contract", name: "Contrato de Locação do Imóvel", validFrom: "01/09/2024", validUntil: "31/08/2027", updatedAt: "01/09/2024", file: "locacao-unidade-teste.pdf", sharedWith: [UNIMED] }),
    doc({ id: "d4", type: "contract", name: "Contrato Social", validFrom: "01/01/2020", validUntil: null, updatedAt: "01/01/2020", file: "contrato-social.pdf" }),
    ...(alerts
      ? [doc({ id: "d4a", type: "contract", name: "Aditivo do contrato de locação", validFrom: "01/09/2026", validUntil: "31/08/2028", updatedAt: "28/07/2026", file: "aditivo-locacao.pdf" })]
      : []),
  ];
}

function santana(alerts: boolean): UnitDocument[] {
  return [
    doc({ id: "d5", slotId: "alvara", type: "license", name: "Alvará de Funcionamento", validFrom: "01/01/2026", validUntil: "31/12/2026", updatedAt: "12/01/2026", file: "alvara-santana.pdf", sharedWith: [BRADESCO] }),
    doc({ id: "d6", slotId: "vigilancia", type: "license", name: "Licença da Vigilância Sanitária", validFrom: "01/04/2025", validUntil: alerts ? "30/09/2026" : "30/09/2027", updatedAt: "02/04/2025", file: "sanitaria-santana.pdf" }),
  ];
}

export function unitDocuments(unitId: UnitId, alerts: boolean): UnitDocument[] {
  return unitId === "u2" ? santana(alerts) : unidadeTeste(alerts);
}

export const UNIT_DOCUMENTS_FIXTURES: Fixture<UnitDocumentsFixture>[] = [
  {
    id: "unit-documents.units",
    label: "Unidade Teste e Santana · documentos do protótipo",
    description:
      "Unidade Teste com os 12 documentos padrão e o contrato social; Santana só com alvará e licença sanitária (10 pendentes). Com alertas: dedetização vencida, potabilidade a vencer e um aditivo aguardando vigência.",
    data: () => ({ units: UNITS }),
  },
];
