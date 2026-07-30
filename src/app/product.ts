import type { ProductDefinition } from "@brucesantos/design-space";

import { fixtures, modules, personas, rules, scenarios } from "./catalog.js";
import { contrastPairs } from "../tokens/contrast.js";
import { AgendaDay } from "../screens/AgendaDay.js";
import { AppointmentDetail } from "../screens/AppointmentDetail.js";
import { PatientList } from "../screens/PatientList.js";
import { PatientDetail } from "../screens/PatientDetail.js";
import { ClaimList } from "../screens/ClaimList.js";
import { ClaimDetail } from "../screens/ClaimDetail.js";

/**
 * A única coisa que o Bloomy Design Space entrega ao motor.
 *
 * A especificação — módulos, jornadas, cenários, personas, fixtures e regras —
 * vive em `catalog.ts`, livre de React. Aqui ela é combinada com as telas que a
 * materializam. Ver o comentário de `catalog.ts` para o porquê da separação.
 */
export const productDefinition: ProductDefinition = {
  id: "bloomy",
  name: "Bloomy",
  tagline: "Gestão de clínicas — especificação executável",

  modules,
  scenarios,
  personas,
  fixtures,
  rules,

  // Sem rota para `/`: a raiz é o mapa de situações do motor, que é a entrada
  // certa para quem recebe o link sem contexto.
  routes: [
    { path: "/agenda", screen: AgendaDay },
    { path: "/agenda/:id", screen: AppointmentDetail },
    { path: "/patients", screen: PatientList },
    { path: "/patients/:id", screen: PatientDetail },
    { path: "/finance", screen: ClaimList },
    { path: "/finance/claims/:id", screen: ClaimDetail },
  ],

  theme: {
    contrastPairs,
    locales: ["pt-BR"],
  },

  // O Bloomy é um monólito Phoenix sem API pública, então não há adapter remoto a
  // oferecer — e não deveria haver antes de um problema concreto de fixture.
  dataSources: { default: "fixtures" },
};
