import type { Fixture } from "@brucesantos/design-space";
import type {
  CaseloadEntry,
  DeactivationSubstitute,
  ProfessionalDeactivationData,
} from "../contracts/index.js";

/**
 * Fixtures da inativação de profissional.
 *
 * A Denise é a mesma pessoa que, no cadastro da equipe, aparece como desativação
 * sem data. Aqui ela tem a data e tem caseload — que é o que transforma a
 * inativação de um campo num processo.
 *
 * Datas ancoradas em `TODAY` (30/07/2026). Nenhuma olha o relógio.
 */

const NOW = "2026-07-30T09:00:00.000-03:00";

const caseload: CaseloadEntry[] = [
  {
    patientId: "pac-helena",
    patientName: "Helena Marques",
    specialty: "Musicoterapia",
    weeklyHours: 2,
    monthlySessions: 8,
    unitName: "Unidade Girassol",
  },
  {
    patientId: "pac-otavio",
    patientName: "Otávio Lins",
    specialty: "Musicoterapia",
    weeklyHours: 1,
    monthlySessions: 4,
    unitName: "Unidade Girassol",
  },
  {
    patientId: "pac-bruna",
    patientName: "Bruna Sartori",
    specialty: "Musicoterapia",
    weeklyHours: 2,
    monthlySessions: 8,
    unitName: "Unidade Aurora",
  },
];

/**
 * Os substitutos, com dois que não servem.
 *
 * O Rui está ativo e é de outra especialidade — aparece, depois dos da mesma.
 * A Vitória já tem saída marcada e não pode receber ninguém: transferir para
 * ela apenas adiaria o problema para uma semana em que ninguém vai olhar.
 */
const substitutes: DeactivationSubstitute[] = [
  { id: "prof-noel", name: "Noel Ferrari", specialty: "Musicoterapia", active: true },
  { id: "prof-rui", name: "Rui Sampaio Neto", specialty: "Fonoaudiologia", active: true },
  {
    id: "prof-vitoria",
    name: "Vitória Camargo",
    specialty: "Musicoterapia",
    active: true,
    deactivationDate: "2026-09-15",
  },
  { id: "prof-antigo", name: "Ismael Trindade", specialty: "Musicoterapia", active: false },
];

const denise = {
  id: "prof-saindo",
  name: "Denise Portela",
  specialty: "Musicoterapia",
  council: "UBAM 0000",
  active: true,
};

export const professionalDeactivationFixtures: Fixture<ProfessionalDeactivationData>[] = [
  {
    id: "professional-deactivation-caseload",
    label: "Saída com três pacientes em atendimento",
    description:
      "A Denise sai em 28/08. Três pacientes precisam de destino, e um dos substitutos da mesma especialidade também está de saída.",
    data: {
      now: NOW,
      professional: denise,
      caseload,
      substitutes,
      scheduledUntil: 32,
      scheduledAfter: 20,
      roomPeriods: 5,
    },
  },
  {
    id: "professional-deactivation-scheduled",
    label: "Inativação já marcada",
    description:
      "A saída da Denise está marcada para 28/08 e dois dos três pacientes já têm destino. Editar a data não pede o motivo de novo.",
    data: {
      now: NOW,
      professional: { ...denise, deactivationDate: "2026-08-28" },
      caseload,
      substitutes,
      scheduledUntil: 32,
      scheduledAfter: 20,
      roomPeriods: 5,
    },
  },
  {
    id: "professional-deactivation-no-caseload",
    label: "Saída sem pacientes em atendimento",
    description:
      "Profissional administrativa, sem caseload. A etapa de destino não aparece — não há nada a transferir.",
    data: {
      now: NOW,
      professional: {
        id: "prof-people",
        name: "Aline Fontenele",
        specialty: "Psicopedagogia",
        council: "CRP 06/000009",
        active: true,
      },
      caseload: [],
      substitutes,
      scheduledUntil: 0,
      scheduledAfter: 0,
      roomPeriods: 0,
    },
  },
];
