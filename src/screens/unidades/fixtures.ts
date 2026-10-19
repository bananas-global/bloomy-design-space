/**
 * Unidades — dados sintéticos e determinísticos.
 *
 * Cinco unidades fictícias (Santo André já inativa) e os documentos padrão de
 * cada uma. Hoje é `TODAY` (05/08/2026), o mesmo dia das outras telas: "a
 * vencer" vai até 04/10/2026.
 */
import type { Fixture } from "@brucesantos/design-space";
import type { DocsState, Unit, UnitDoc } from "./model.js";

export const TODAY = "2026-08-05";

/** Quem anexa nesta sessão: o usuário do cabeçalho. */
export const ME = "Marina Alves";

export const UNITS: Unit[] = [
  {
    id: "u1", name: "Unidade Teste", cnpj: "12.345.678/0001-90", cnes: "7418529", active: true,
    address: { street: "Av. Paulista", number: "1578", complement: "Conj. 41", neighborhood: "Bela Vista", city: "São Paulo", state: "SP" },
  },
  {
    id: "u2", name: "Santana", cnpj: "12.345.678/0002-70", cnes: "9638527", active: true,
    address: { street: "Rua Voluntários da Pátria", number: "2044", complement: null, neighborhood: "Santana", city: "São Paulo", state: "SP" },
  },
  {
    id: "u3", name: "Moema", cnpj: "12.345.678/0003-51", cnes: "2583691", active: true,
    address: { street: "Av. Ibirapuera", number: "2120", complement: "Sala 302", neighborhood: "Moema", city: "São Paulo", state: "SP" },
  },
  {
    id: "u4", name: "Campinas", cnpj: "12.345.678/0004-32", cnes: "3692581", active: true,
    address: { street: "Av. Norte-Sul", number: "1450", complement: null, neighborhood: "Cambuí", city: "Campinas", state: "SP" },
  },
  {
    id: "u5", name: "Santo André", cnpj: "12.345.678/0005-13", cnes: "1472583", active: false,
    address: { street: "Rua das Figueiras", number: "980", complement: null, neighborhood: "Jardim", city: "Santo André", state: "SP" },
  },
];

const RESP = ["Marina Alves", "Ana Paula Ribeiro", "Coordenação"];

/** Um documento: [padrão, início da vigência, validade, atualizado em, arquivo]. */
type Seed = [slotId: string, validFrom: string | null, validUntil: string | null, updatedAt: string, file: string];

const NAMES: Record<string, string> = {
  cli: "CLI — Certificado de Licenciamento Integrado",
  alvara: "Alvará de Funcionamento",
  avcb: "AVCB — Auto de Vistoria do Corpo de Bombeiros",
  vigilancia: "Licença da Vigilância Sanitária",
  cnes: "CNES — Cadastro Nacional de Estabelecimentos de Saúde",
  crp: "Registro no CRP",
  dedetizacao: "Certificado de Dedetização",
  potabilidade: "Laudo de Potabilidade da Água",
  residuos: "PGRSS — Plano de Gerenciamento de Resíduos",
};

const SEEDS: Record<string, Seed[]> = {
  // Tudo em dia; o CRP vence em 30/09.
  u1: [
    ["alvara", "01/01/2026", "31/12/2026", "10/01/2026", "alvara-2026.pdf"],
    ["cli", "15/01/2026", "14/01/2027", "15/01/2026", "cli-2026.pdf"],
    ["avcb", "01/06/2025", "20/07/2028", "18/06/2025", "avcb.pdf"],
    ["vigilancia", "01/03/2026", "28/02/2027", "05/03/2026", "vigilancia-sanitaria.pdf"],
    ["cnes", "10/02/2024", null, "10/02/2024", "cnes-7418529.pdf"],
    ["crp", "01/10/2025", "30/09/2026", "01/10/2025", "crp-pj.pdf"],
    ["dedetizacao", "01/06/2026", "30/11/2026", "01/06/2026", "dedetizacao-jun26.pdf"],
    ["potabilidade", "01/06/2026", "30/11/2026", "01/06/2026", "potabilidade-jun26.pdf"],
    ["residuos", "01/01/2026", "31/12/2026", "02/01/2026", "pgrss-2026.pdf"],
  ],
  // Sem AVCB, CRP e dedetização vencidos, PGRSS novo ainda sem vigência.
  u2: [
    ["alvara", "01/01/2026", "31/12/2026", "12/01/2026", "alvara-santana.pdf"],
    ["vigilancia", "01/10/2025", "30/09/2026", "02/10/2025", "sanitaria-santana.pdf"],
    ["cnes", "03/08/2024", null, "03/08/2024", "cnes-9638527.pdf"],
    ["crp", "01/08/2025", "31/07/2026", "01/08/2025", "crp-santana.pdf"],
    ["dedetizacao", "15/01/2026", "15/07/2026", "15/01/2026", "dedetizacao-jan26.pdf"],
    ["residuos", "01/09/2026", "31/08/2027", "28/07/2026", "pgrss-2026-2027.pdf"],
  ],
  // Sem alvará: o CLI atende. Potabilidade vence em 25/08.
  u3: [
    ["cli", "01/03/2026", "28/02/2027", "01/03/2026", "cli-moema.pdf"],
    ["avcb", "10/04/2024", "10/04/2027", "12/04/2024", "avcb-moema.pdf"],
    ["vigilancia", "01/05/2026", "30/04/2027", "04/05/2026", "vigilancia-moema.pdf"],
    ["cnes", "20/03/2024", null, "20/03/2024", "cnes-2583691.pdf"],
    ["crp", "01/02/2026", "31/01/2027", "01/02/2026", "crp-moema.pdf"],
    ["dedetizacao", "01/05/2026", "31/10/2026", "01/05/2026", "dedetizacao-mai26.pdf"],
    ["potabilidade", "25/02/2026", "25/08/2026", "25/02/2026", "potabilidade-fev26.pdf"],
    ["residuos", "01/01/2026", "31/12/2026", "05/01/2026", "pgrss-moema.pdf"],
  ],
  // Alvará vencido, sem vigilância e sem PGRSS.
  u4: [
    ["alvara", "01/07/2025", "30/06/2026", "03/07/2025", "alvara-campinas-2025.pdf"],
    ["avcb", "15/09/2024", "15/09/2027", "20/09/2024", "avcb-campinas.pdf"],
    ["cnes", "05/11/2024", null, "05/11/2024", "cnes-3692581.pdf"],
    ["crp", "01/03/2026", "28/02/2027", "01/03/2026", "crp-campinas.pdf"],
    ["dedetizacao", "10/04/2026", "10/10/2026", "10/04/2026", "dedetizacao-abr26.pdf"],
    ["potabilidade", "10/04/2026", "10/10/2026", "10/04/2026", "potabilidade-abr26.pdf"],
  ],
  // Inativa: o que ficou parou de ser renovado.
  u5: [
    ["alvara", "01/01/2025", "31/12/2025", "08/01/2025", "alvara-santo-andre.pdf"],
    ["cnes", "12/05/2023", null, "12/05/2023", "cnes-1472583.pdf"],
    ["crp", "01/03/2025", "28/02/2026", "01/03/2025", "crp-santo-andre.pdf"],
  ],
};

export function buildDocs(): DocsState {
  return Object.fromEntries(
    Object.entries(SEEDS).map(([unitId, seeds]) => [
      unitId,
      seeds.map(([slotId, validFrom, validUntil, updatedAt, file], i): UnitDoc => ({
        id: `${unitId}-${slotId}-${i}`,
        slotId,
        name: NAMES[slotId]!,
        responsible: RESP[i % RESP.length]!,
        updatedAt,
        validFrom,
        validUntil,
        file,
      })),
    ]),
  );
}

/** Qual visão da lista abre. */
export type UnitsView = "list" | "docs";

export type UnitsFixture = {
  view: UnitsView;
  units: Unit[];
  docs: DocsState;
};

const build = (view: UnitsView): UnitsFixture => ({ view, units: UNITS, docs: buildDocs() });

export const UNITS_FIXTURES: Fixture<UnitsFixture>[] = [
  {
    id: "units.list",
    label: "Unidades › Cadastro",
    description: "Cinco unidades: quatro ativas (Unidade Teste, Santana, Moema e Campinas) e Santo André, inativa.",
    data: () => build("list"),
  },
  {
    id: "units.docs",
    label: "Unidades › Documentação",
    description: "As mesmas cinco, com os documentos padrão: Santana e Campinas com vencidos e pendentes, Moema com o Alvará atendido pelo CLI.",
    data: () => build("docs"),
  },
];
