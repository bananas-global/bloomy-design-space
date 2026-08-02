import type { ProductDefinition } from "@brucesantos/design-space";

import { fixtures, modules, personas, rules, scenarios } from "./catalog.js";
import { contrastPairs } from "../tokens/contrast.js";
import { AgendaDay } from "../screens/AgendaDay.js";
import { AppointmentDetail } from "../screens/AppointmentDetail.js";
import { SessionDetail } from "../screens/SessionDetail.js";
import { InterventionPlanScreen } from "../screens/InterventionPlan.js";
import { ProtocolApplication } from "../screens/ProtocolApplication.js";
import { InClinic } from "../screens/InClinic.js";
import { PatientList } from "../screens/PatientList.js";
import { PatientDetail } from "../screens/PatientDetail.js";
import { AuthorizationHub } from "../screens/AuthorizationHub.js";
import { Closures } from "../screens/Closures.js";
import { HealthcareInvoiceScreen } from "../screens/HealthcareInvoice.js";
import { Team } from "../screens/Team.js";
import { Kiosk } from "../screens/Kiosk.js";
import { Nps } from "../screens/Nps.js";

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
    { path: "/in-clinic", screen: InClinic },
    { path: "/agenda/:id", screen: AppointmentDetail },
    { path: "/sessions/:id", screen: SessionDetail },
    { path: "/patients", screen: PatientList },
    { path: "/patients/:id", screen: PatientDetail },
    { path: "/patients/:id/plan", screen: InterventionPlanScreen },
    { path: "/patients/:id/protocols/:executionId", screen: ProtocolApplication },
    { path: "/authorizations", screen: AuthorizationHub },
    { path: "/closures", screen: Closures },
    { path: "/invoices/:id", screen: HealthcareInvoiceScreen },
    { path: "/team", screen: Team },
    { path: "/kiosk", screen: Kiosk },
    { path: "/nps", screen: Nps },
  ],

  // O motor é uma biblioteca já compilada e não consegue ler o ambiente de build
  // deste repositório — o `import.meta.env` dele foi resolvido quando o pacote foi
  // publicado. Quem tem acesso ao próprio build é o produto, então o contexto vem
  // daqui. Sem isso o cabeçalho da revisão mostra "development", sem branch nem
  // commit, e a URL de commit deixa de tornar a aprovação rastreável.
  deploy: {
    env: import.meta.env.VITE_VERCEL_ENV,
    branch: import.meta.env.VITE_VERCEL_GIT_COMMIT_REF,
    commit: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA,
  },

  theme: {
    contrastPairs,
    locales: ["pt-BR"],
  },

  // O Bloomy é um monólito Phoenix sem API pública, então não há adapter remoto a
  // oferecer — e não deveria haver antes de um problema concreto de fixture.
  dataSources: { default: "fixtures" },
};
