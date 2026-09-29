/**
 * Documentos do profissional — dados sintéticos e determinísticos.
 *
 * A profissional é a do protótipo (Helena Martins Costa, psicóloga, CRP),
 * com os documentos de `DS_SEED_DOCS.p1`, as formações especiais do cadastro
 * (IS, PECS e Denver), o curso de ABA de 320h e os compartilhamentos com Unimed
 * e Bradesco Saúde. Hoje é 05/08/2026. Nomes e documentos são fictícios.
 *
 * `withAlerts` acrescenta um comprovante de endereço a vencer e um contrato PJ
 * vencido, para a aba mostrar todos os status.
 */
import type { Fixture } from "@brucesantos/design-space";
import type { ProfessionalHeader } from "../../layouts/ProfessionalLayout.js";
import type { ProfessionalDocument } from "./model.js";

export type DocumentsProfessional = { id: string; name: string; header: ProfessionalHeader };

export type DocumentsFixture = { professional: DocumentsProfessional; documents: ProfessionalDocument[] };

export const HELENA: DocumentsProfessional = {
  id: "p1",
  name: "Helena Martins Costa",
  header: {
    name: "Helena Martins Costa",
    status: "Ativo",
    specialty: "Psicologia",
    healthFormation: "CRP",
    specialtyRegister: "06233962",
    supervisorName: "Rafael Andrade Nunes",
    showInDashboard: true,
    tbd: false,
    phone: "(11) 99873-9084",
    email: "helena.martins@bloomy.com.br",
    contractStart: "06/05/2026",
    uniquePatientsCount: 3,
    weeklyScheduleHours: 30,
    occupancyRate: "10.0",
    absenceCount: 0,
  },
};

const UNIMED = "op1";
const BRADESCO = "op2";

const doc = (d: Omit<ProfessionalDocument, "number" | "sharedWith"> & Partial<ProfessionalDocument>): ProfessionalDocument => ({
  number: "",
  sharedWith: [],
  ...d,
});

export function helenaDocuments(): ProfessionalDocument[] {
  return [
    doc({ id: "p1_d1", typeId: "diploma", name: "Certificado de formação", updatedAt: "01/02/2024", validUntil: null, file: "diploma-p1.pdf", sharedWith: [UNIMED, BRADESCO] }),
    doc({ id: "p1_d2", typeId: "council", name: "Registro no conselho", number: "CR 100137", updatedAt: "10/01/2026", validUntil: "10/01/2027", file: "council-p1.pdf", sharedWith: [UNIMED, BRADESCO] }),
    doc({ id: "p1_d3", typeId: "id", name: "RG / CPF", updatedAt: "01/02/2024", validUntil: null, file: "id-p1.pdf", sharedWith: [UNIMED, BRADESCO] }),
    doc({ id: "p1_d4", typeId: "cv", name: "Currículo", updatedAt: "14/03/2026", validUntil: null, file: "cv-p1.pdf", sharedWith: [UNIMED] }),
    doc({ id: "p1_d5", typeId: "specialization", name: "Certificado de especialização", updatedAt: "20/05/2025", validUntil: null, file: "specialization-p1.pdf" }),
    doc({ id: "p1_ft1", typeId: "special_training", name: "Formação Especial — Integração Sensorial", training: "is", updatedAt: "01/02/2024", validUntil: null, file: "formacao-is-p1.pdf" }),
    doc({ id: "p1_ft2", typeId: "special_training", name: "Formação Especial — PECS — Comunicação por Troca de Figuras", training: "pecs", updatedAt: "01/02/2024", validUntil: null, file: "formacao-pecs-p1.pdf" }),
    doc({ id: "p1_ft3", typeId: "special_training", name: "Formação Especial — Modelo Denver (ESDM)", training: "denver", updatedAt: "01/02/2024", validUntil: null, file: "formacao-denver-p1.pdf" }),
    doc({ id: "p1_aba1", typeId: "aba_course", name: "Curso de formação em ABA — 320h", hours: 320, updatedAt: "01/02/2024", validUntil: null, file: "curso-aba-p1.pdf" }),
  ];
}

/** Os documentos que fazem a aba mostrar "a vencer" e "vencido". */
export function alertDocuments(): ProfessionalDocument[] {
  return [
    doc({ id: "p1_d6", typeId: "address", name: "Comprovante de endereço", updatedAt: "02/03/2026", validUntil: "02/09/2026", file: "address-p1.pdf", sharedWith: [] }),
    doc({ id: "p1_d7", typeId: "contract", name: "Contrato PJ", updatedAt: "01/08/2025", validUntil: "31/07/2026", file: "contract-p1.pdf" }),
  ];
}

export function makeDocumentsFixture(): DocumentsFixture {
  return { professional: HELENA, documents: [...helenaDocuments(), ...alertDocuments()] };
}

export const DOCUMENTS_FIXTURES: Fixture<DocumentsFixture>[] = [
  {
    id: "documents.helena",
    label: "Helena · documentos do protótipo",
    description:
      "4 dos 6 documentos padrão (faltam a carteirinha e a quitação do conselho), 3 formações especiais, curso de ABA de 320h, 4 adicionais — um a vencer e um vencido — e compartilhamentos com Unimed e Bradesco Saúde.",
    data: () => makeDocumentsFixture(),
  },
];
