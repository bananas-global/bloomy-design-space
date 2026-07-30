import type { Fixture } from "@brucesantos/design-space";
import type { Patient, PatientsData } from "../contracts/index.js";

/**
 * Fixtures de pacientes.
 *
 * CPFs são sequências inválidas de propósito — todos com dígito verificador
 * errado — para que nenhum deles possa colidir com uma pessoa real, mesmo por
 * acidente.
 */

const complete: Patient = {
  id: "pt-1",
  name: "Ana Moreira",
  birthDate: "1988-04-12",
  cpf: "000.111.222-00",
  phone: "(11) 90000-0001",
  email: "ana.moreira@exemplo.test",
  insurance: { name: "Unimed", plan: "Nacional Ampliado", cardNumber: "0000 1111 2222 3333" },
  missingFields: [],
  recordRestricted: false,
};

const incomplete: Patient = {
  id: "pt-2",
  name: "Caio Ribeiro",
  birthDate: "1995-11-03",
  phone: "(11) 90000-0002",
  // Sem CPF e sem convênio: é o cadastro feito às pressas no balcão, que é
  // exatamente como o cadastro incompleto aparece na clínica.
  missingFields: ["CPF", "convênio"],
  recordRestricted: false,
};

const minorWithoutGuardian: Patient = {
  id: "pt-4",
  name: "Tiago Ferraz",
  birthDate: "2011-09-08", // 14 anos na data de referência
  cpf: "000.333.444-00",
  phone: "(11) 90000-0004",
  missingFields: [],
  recordRestricted: false,
  // `guardian` ausente é o ponto do cenário. O cadastro está "completo" pela
  // lista de campos e ainda assim não permite agendar — a regra do menor é
  // separada da lista, e a tela precisa explicar as duas coisas.
};

const minorWithGuardian: Patient = {
  id: "pt-7",
  name: "Beatriz Ferraz",
  birthDate: "2014-03-21",
  cpf: "000.555.666-00",
  missingFields: [],
  recordRestricted: false,
  guardian: {
    name: "Renata Ferraz",
    relation: "mãe",
    cpf: "000.777.888-00",
    phone: "(11) 90000-0007",
  },
};

const restrictedRecord: Patient = {
  id: "pt-5",
  name: "Júlia Prado",
  birthDate: "1966-06-30",
  cpf: "000.999.000-00",
  phone: "(11) 90000-0005",
  email: "julia.prado@exemplo.test",
  insurance: { name: "SulAmérica", plan: "Executivo", cardNumber: "0000 4444 5555 6666" },
  missingFields: [],
  recordRestricted: true,
  restrictionNote:
    "Acesso restrito a pedido da paciente. Liberado para a profissional responsável.",
};

const roster: Patient[] = [
  complete,
  incomplete,
  {
    id: "pt-3",
    name: "Marina Lopes",
    birthDate: "1972-01-25",
    cpf: "000.222.333-00",
    phone: "(11) 90000-0003",
    insurance: { name: "Bradesco Saúde", plan: "Top Nacional", cardNumber: "0000 7777 8888 9999" },
    missingFields: [],
    recordRestricted: false,
  },
  minorWithoutGuardian,
  restrictedRecord,
  minorWithGuardian,
];

export const patientFixtures: Fixture<PatientsData>[] = [
  {
    id: "patients-roster",
    label: "Lista de pacientes",
    description:
      "Seis pacientes cobrindo cadastro completo, incompleto, menor com e sem responsável, e prontuário restrito.",
    data: { patients: roster },
  },
  {
    id: "patients-empty",
    label: "Nenhum paciente cadastrado",
    description: "Primeiro acesso da unidade.",
    data: { patients: [] },
  },
];

export const patientsById = {
  complete: complete.id,
  incomplete: incomplete.id,
  minorWithoutGuardian: minorWithoutGuardian.id,
  minorWithGuardian: minorWithGuardian.id,
  restrictedRecord: restrictedRecord.id,
} as const;
