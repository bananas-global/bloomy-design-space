import type { Fixture } from "@brucesantos/design-space";
import type { PatientScopeData, ScopeRule } from "../contracts/index.js";

/**
 * Fixtures do escopo de pacientes.
 *
 * As seis formas de escopo que `PatientPolicy.scope/2` produz, na ordem em que
 * as cláusulas são casadas.
 */

const regras: ScopeRule[] = [
  {
    id: "e1",
    role: "Administração, coordenação, recepção e operação",
    effective: "A cláusula devolve a tabela inteira, sem filtro.",
    shape: "all",
    source: "lib/bloomy/patients/patient_policy.ex:43-45",
  },
  {
    id: "e2",
    role: "Pessoas",
    effective: "A busca pede identificador nulo, e nenhum paciente tem.",
    shape: "empty",
    source: "lib/bloomy/patients/patient_policy.ex:47",
  },
  {
    id: "e3",
    role: "Supervisão",
    effective: "A primeira cláusula filtra pelas unidades de quem entrou.",
    shadowed:
      "Uma cláusula depois lista o mesmo papel e filtraria pelas agendas em que a pessoa está.",
    shape: "by-unit",
    source: "lib/bloomy/patients/patient_policy.ex:49-57",
  },
  {
    id: "e4",
    role: "Acompanhante terapêutico, aplicador e especialista",
    effective: "Filtra pelos agendamentos em que a pessoa aparece como profissional.",
    shape: "by-own-schedules",
    source: "lib/bloomy/patients/patient_policy.ex:59-67",
  },
  {
    id: "e5",
    role: "Responsável legal",
    effective: "Filtra pelo vínculo entre o responsável e o paciente.",
    shape: "by-link",
    source: "lib/bloomy/patients/patient_policy.ex:69-77",
  },
  {
    id: "e6",
    role: "Operadora",
    effective: "Filtra pelos planos daquela operadora.",
    shape: "by-link",
    source: "lib/bloomy/patients/patient_policy.ex:79-84",
  },
  {
    id: "e7",
    role: "Um papel novo, ainda não previsto",
    effective: "Nenhuma cláusula casa, e a chamada derruba.",
    shape: "raises",
    source: "lib/bloomy/patients/patient_policy.ex:43-84",
  },
];

export const patientScopeFixtures: Fixture[] = [
  {
    id: "patient-scope-all-roles",
    label: "As seis formas de escopo, e o papel sem cláusula",
    description:
      "Quem vê a base inteira, quem vê a unidade, quem vê só as próprias agendas, quem vê por vínculo, quem não vê ninguém — e o papel novo, que derruba a tela em vez de ver tudo.",
    data: { rules: regras } satisfies PatientScopeData,
  },
  {
    id: "patient-scope-no-contradiction",
    label: "Se a cláusula morta fosse removida",
    description:
      "A mesma tabela sem a segunda menção ao papel de supervisão. Serve para ver o que muda no documento — e o que não muda no comportamento.",
    data: {
      rules: regras.map(({ shadowed: _shadowed, ...resto }) => resto),
    } satisfies PatientScopeData,
  },
];
