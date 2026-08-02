import type { Fixture } from "@brucesantos/design-space";
import type { PlanSignature, PlanSignatureData } from "../contracts/index.js";

/**
 * Fixtures da assinatura do plano de intervenção comportamental.
 *
 * Cinco aceites de responsáveis, todos em 30/07. As horas são o assunto:
 * concentram-se à noite, porque é quando a família lê documento de filho.
 *
 * Nomes sintéticos.
 */

function assinatura(overrides: Partial<PlanSignature> & { id: string }): PlanSignature {
  return {
    patientName: "Helena M.",
    guardianName: "Renata Alencar",
    signedAt: "2026-07-30T19:10:00.000-03:00",
    planStart: "2026-07-01",
    planEnd: "2026-12-31",
    ...overrides,
  };
}

const assinaturas: PlanSignature[] = [
  assinatura({ id: "p1" }),
  assinatura({
    id: "p2",
    patientName: "Otávio L.",
    guardianName: "Tiago Barreto",
    signedAt: "2026-07-30T21:35:00.000-03:00",
  }),
  assinatura({
    id: "p3",
    patientName: "Bruna S.",
    guardianName: "Cláudia Ferrez",
    signedAt: "2026-07-30T22:50:00.000-03:00",
  }),
  // O plano acaba hoje, e o carimbo cai depois do fim.
  assinatura({
    id: "p4",
    patientName: "Ivo P.",
    guardianName: "Marcos Itaparica",
    signedAt: "2026-07-30T23:20:00.000-03:00",
    planEnd: "2026-07-30",
  }),
  assinatura({
    id: "p5",
    patientName: "Nina C.",
    guardianName: "Sônia Vasques",
    signedAt: "2026-07-30T14:05:00.000-03:00",
  }),
];

export const planSignatureFixtures: Fixture[] = [
  {
    id: "plan-signature-evening",
    label: "Três aceites depois das 21h, e um deles vence o plano",
    description:
      "Cinco responsáveis assinaram em 30/07. Três carimbaram 31/07 sem saber, e um deles ficou registrado como tendo aceito um plano que terminou no dia anterior.",
    data: { signatures: assinaturas } satisfies PlanSignatureData,
  },
  {
    id: "plan-signature-daytime",
    label: "Todos assinaram durante o dia",
    description:
      "Os mesmos aceites, entre 14h e 19h. Nenhum carimbo erra — e é por isso que o problema só aparece na proporção, nunca num caso isolado.",
    data: {
      signatures: assinaturas.map((a) => ({
        ...a,
        signedAt: "2026-07-30T14:05:00.000-03:00",
      })),
    } satisfies PlanSignatureData,
  },
];
