/**
 * Fila de Espera: os leads na fila, sintéticos. Nomes e telefones são
 * fictícios. As datas são relativas a `TODAY`.
 */
import type { Fixture } from "@brucesantos/design-space";
import { DIAS_SEMANA, MOTIVOS, off, type Entrada, type Janela, type Pedido } from "./model.js";

export type FilaFixture = { entradas: Entrada[] };

const av = (days: number[], from: string, to: string): Janela[] => days.map((d) => ({ day: DIAS_SEMANA[d]!, from, to }));

type Seed = {
  n: number; unit: string; child: string; age: number; guardian: string; relation: string; phone: string; owner: string;
  origin: string; support: string; in: number; from: string; reason: string; notes?: string; specs: Pedido[]; avail: Janela[];
};

const entrada = (o: Seed): Entrada => ({
  id: `wq${o.n}`, leadId: `lw${o.n}`, unit: o.unit, child: o.child, age: o.age, guardian: o.guardian, relation: o.relation, phone: o.phone,
  owner: o.owner, origin: o.origin, support: o.support, enteredAt: off(o.in), fromStatus: o.from, reason: o.reason, notes: o.notes ?? "",
  specialties: o.specs, availability: o.avail,
});

const SEED: Seed[] = [
  { n: 1, unit: "Unidade Jardim", child: "Heitor Campos", age: 5, guardian: "Renata Campos", relation: "Mãe", phone: "(11) 98231-4410", owner: "Carla Nunes", origin: "Indicação", support: "Nível 2", in: -68, from: "aguardando", reason: MOTIVOS[2]!, specs: [{ spec: "Fonoaudiologia", hours: 6 }], avail: av([0, 2, 4], "08:00", "12:00") },
  { n: 2, unit: "Unidade Jardim", child: "Lívia Moraes", age: 4, guardian: "Tatiane Moraes", relation: "Mãe", phone: "(11) 99410-2287", owner: "Ana Beatriz Lopes", origin: "Instagram", support: "Nível 2", in: -55, from: "proposta", reason: MOTIVOS[0]!, specs: [{ spec: "Análise do Comportamento", hours: 8 }], avail: av([1, 3], "13:00", "18:00") },
  { n: 3, unit: "Unidade Jardim", child: "Pedro Lacerda", age: 6, guardian: "Gustavo Lacerda", relation: "Pai", phone: "(11) 97652-0193", owner: "Rodrigo Alves", origin: "Google", support: "Nível 1", in: -47, from: "aguardando", reason: MOTIVOS[1]!, specs: [{ spec: "Terapia Ocupacional", hours: 4 }], avail: av([0, 2], "13:00", "17:00") },
  { n: 4, unit: "Unidade Jardim", child: "Alice Fontes", age: 3, guardian: "Débora Fontes", relation: "Mãe", phone: "(11) 98877-3521", owner: "Carla Nunes", origin: "Site", support: "Nível 2", in: -40, from: "proposta", reason: MOTIVOS[0]!, specs: [{ spec: "Fonoaudiologia", hours: 4 }, { spec: "Psicopedagogia", hours: 2 }], avail: [...av([0, 2], "08:00", "10:00"), ...av([0], "14:00", "16:00")] },
  { n: 5, unit: "Unidade Jardim", child: "Benício Prado", age: 4, guardian: "Aline Prado", relation: "Mãe", phone: "(11) 96543-7788", owner: "Ana Beatriz Lopes", origin: "WhatsApp", support: "Nível 3", in: -33, from: "aguardando", reason: MOTIVOS[1]!, specs: [{ spec: "Fisioterapia", hours: 2 }], avail: av([2], "09:00", "11:00") },
  { n: 6, unit: "Unidade Jardim", child: "Cecília Duarte", age: 5, guardian: "Mônica Duarte", relation: "Mãe", phone: "(11) 99120-6634", owner: "Rodrigo Alves", origin: "Indicação", support: "Nível 2", in: -26, from: "proposta", reason: MOTIVOS[0]!, specs: [{ spec: "Fonoaudiologia", hours: 8 }], avail: av([1, 3], "07:00", "12:00") },
  { n: 7, unit: "Unidade Jardim", child: "Gael Ribeiro", age: 3, guardian: "Sabrina Ribeiro", relation: "Mãe", phone: "(11) 98004-5192", owner: "Carla Nunes", origin: "Instagram", support: "Nível 3", in: -19, from: "aguardando", reason: MOTIVOS[0]!, notes: "Mãe trabalha até 16h30 e só consegue levar no fim da tarde.", specs: [{ spec: "Análise do Comportamento", hours: 12 }], avail: av([0, 2], "17:00", "19:00") },
  { n: 8, unit: "Unidade Jardim", child: "Manuela Brito", age: 6, guardian: "Fernanda Brito", relation: "Mãe", phone: "(11) 97321-8846", owner: "Ana Beatriz Lopes", origin: "Site", support: "Nível 1", in: -12, from: "proposta", reason: MOTIVOS[0]!, specs: [{ spec: "Psicopedagogia", hours: 2 }], avail: av([0], "14:00", "16:00") },
  { n: 9, unit: "Unidade Jardim", child: "Bento Albuquerque", age: 5, guardian: "Leonardo Albuquerque", relation: "Pai", phone: "(11) 96210-4473", owner: "Rodrigo Alves", origin: "Google", support: "Nível 2", in: -5, from: "avaliacao", reason: MOTIVOS[1]!, specs: [{ spec: "Fonoaudiologia", hours: 4 }, { spec: "Terapia Ocupacional", hours: 4 }], avail: av([0, 2, 4], "13:00", "17:00") },
  { n: 10, unit: "Unidade Girassol", child: "Olívia Mattos", age: 4, guardian: "Priscila Mattos", relation: "Mãe", phone: "(11) 98540-3319", owner: "Carla Nunes", origin: "Indicação", support: "Nível 2", in: -30, from: "aguardando", reason: MOTIVOS[1]!, specs: [{ spec: "Análise do Comportamento", hours: 8 }], avail: av([0, 1], "08:00", "12:00") },
  { n: 11, unit: "Unidade Girassol", child: "Joaquim Bastos", age: 5, guardian: "Elaine Bastos", relation: "Mãe", phone: "(11) 99652-1108", owner: "Rodrigo Alves", origin: "WhatsApp", support: "Nível 1", in: -21, from: "proposta", reason: MOTIVOS[1]!, specs: [{ spec: "Terapia Ocupacional", hours: 6 }], avail: av([0, 2], "13:00", "17:00") },
  { n: 12, unit: "Unidade Girassol", child: "Isadora Leme", age: 3, guardian: "Carolina Leme", relation: "Mãe", phone: "(11) 97781-2290", owner: "Ana Beatriz Lopes", origin: "Instagram", support: "Nível 2", in: -9, from: "aguardando", reason: MOTIVOS[0]!, specs: [{ spec: "Fonoaudiologia", hours: 4 }], avail: av([1], "14:00", "18:00") },
];

const base: FilaFixture = { entradas: SEED.map(entrada) };


export const FILA_FIXTURES: Fixture<FilaFixture>[] = [
  { id: "fila.base", label: "Fila com leads", description: "Nove leads na Unidade Jardim e três na Unidade Girassol, com encaixe completo, parcial, previsto e sem encaixe.", data: base },
  { id: "fila.vazia", label: "Fila vazia", description: "Ninguém na fila de nenhuma unidade.", data: { entradas: [] } },
];
