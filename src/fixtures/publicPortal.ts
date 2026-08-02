import type { Fixture } from "@brucesantos/design-space";
import type { KioskData, NpsData } from "../contracts/index.js";

/**
 * Fixtures do portal público.
 *
 * O totem da unidade Pinheiros numa terça de manhã, e o link de pesquisa que a
 * família recebe depois. As duas superfícies que quem não trabalha na clínica
 * encontra.
 *
 * Os CPFs têm dígito verificador inválido de propósito, como em todo o
 * repositório. Isso é convenientemente honesto aqui: o cenário de CPF inválido
 * usa um CPF que é de fato inválido, e não um número marcado como inválido por
 * convenção.
 */

const NOW = "2026-07-30T09:24:00.000-03:00";
const UNIDADE = { id: "un-pinheiros", name: "Pinheiros" };

function kiosk(overrides: Partial<KioskData> = {}): KioskData {
  return {
    unit: UNIDADE,
    step: "identification",
    patients: [],
    now: NOW,
    ...overrides,
  };
}

export const publicPortalFixtures: Fixture<KioskData | NpsData>[] = [
  {
    id: "kiosk-identification",
    label: "Totem na primeira etapa",
    description: "A tela que fica aberta o dia inteiro na recepção, esperando um CPF.",
    data: kiosk(),
  },
  {
    id: "kiosk-invalid-cpf",
    label: "CPF digitado errado",
    description: "Dígito verificador não fecha. Resolve digitando de novo.",
    data: kiosk({ error: "invalid_cpf" }),
  },
  {
    id: "kiosk-guardian-not-found",
    label: "CPF válido, responsável não cadastrado",
    description:
      "O número está certo e não existe responsável com ele. Digitar de novo não resolve.",
    data: kiosk({ error: "guardian_not_found" }),
  },
  {
    id: "kiosk-select-patient",
    label: "Escolher quem vai entrar",
    description:
      "Uma responsável com dois pacientes agendados hoje, um deles já dentro da unidade.",
    data: kiosk({
      step: "select_patient",
      guardian: { id: "resp-1", name: "Renata Andrade Lins" },
      patients: [
        {
          id: "pac-theo",
          name: "Théo Andrade Lins",
          times: ["10:00", "11:00"],
          hasOpenCheckin: false,
        },
        {
          id: "pac-noah",
          name: "Noah Andrade Lins",
          times: ["09:00"],
          hasOpenCheckin: true,
        },
      ],
    }),
  },
  {
    id: "kiosk-no-patients",
    label: "Nenhum atendimento hoje",
    description:
      "Responsável reconhecida, e nenhum agendamento em aberto hoje nesta unidade. Pode ser dia ou unidade errada.",
    data: kiosk({
      step: "select_patient",
      guardian: { id: "resp-2", name: "Alceu Menendes Pinto" },
      patients: [],
    }),
  },
  {
    id: "kiosk-complete",
    label: "Check-in registrado",
    description: "A confirmação, com o horário e o que acontece em seguida.",
    data: kiosk({
      step: "registration_complete",
      guardian: { id: "resp-1", name: "Renata Andrade Lins" },
      selectedPatientId: "pac-theo",
      action: "checkin",
      patients: [
        {
          id: "pac-theo",
          name: "Théo Andrade Lins",
          times: ["10:00", "11:00"],
          hasOpenCheckin: true,
        },
      ],
    }),
  },
  {
    id: "kiosk-unit-not-found",
    label: "Link de unidade inexistente",
    description: "O slug da URL não corresponde a nenhuma unidade. É o QR Code errado ou antigo.",
    data: kiosk({ unit: undefined, error: "unit_not_found" }),
  },
];

export const npsFixtures: Fixture<NpsData>[] = [
  {
    id: "nps-invite",
    label: "Convite enviado, sem resposta",
    description: "O registro existe e a nota ainda não. É o estado de todo convite recém-enviado.",
    data: {
      unit: UNIDADE,
      now: NOW,
      response: { code: "K7M2Q", sent: true, guardianName: "Renata Andrade Lins" },
    },
  },
  {
    id: "nps-answered",
    label: "Pesquisa respondida",
    description: "Nota 9 com comentário. A faixa fica na leitura interna, não na tela da família.",
    data: {
      unit: UNIDADE,
      now: NOW,
      response: {
        code: "K7M2Q",
        sent: true,
        rating: 9,
        comment:
          "A Marina tem muita paciência com o Théo e sempre explica o que foi feito na sessão.",
        guardianName: "Renata Andrade Lins",
      },
    },
  },
  {
    id: "nps-low-rating",
    label: "Nota baixa",
    description:
      "Nota 4. A tela agradece do mesmo jeito — classificar quem acabou de reclamar é hostil.",
    data: {
      unit: UNIDADE,
      now: NOW,
      response: {
        code: "P4X8B",
        sent: true,
        rating: 4,
        comment: "Difícil conseguir horário na parte da tarde.",
        guardianName: "Alceu Menendes Pinto",
      },
    },
  },
];
