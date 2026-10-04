import type { ProductDefinition } from "@brucesantos/design-space";

import { COMPONENT_PREVIEWS } from "../catalog/components.js";
import { LAYOUT_PREVIEWS } from "../catalog/layouts.js";
import { personas } from "../personas/index.js";
import { FEATURES } from "./features.js";

/**
 * O Bloomy Design Space é a biblioteca de componentes e layouts do Bloomy,
 * espelhados do monólito Phoenix.
 *
 * Telas de feature entram por PR, cada uma com o seu
 * `src/screens/<pasta>/registro.ts` (ver `features.ts`), e ficam como registro
 * do design combinado no handoff.
 */
export const productDefinition: ProductDefinition = {
  id: "bloomy",
  name: "Bloomy",
  tagline: "Componentes e layouts do Bloomy, espelhados do sistema real.",

  scenarios: FEATURES.flatMap((f) => f.scenarios ?? []),
  personas,
  defaultPersona: "admin",
  fixtures: FEATURES.flatMap((f) => f.fixtures ?? []),
  rules: FEATURES.flatMap((f) => f.rules ?? []),
  routes: FEATURES.flatMap((f) => f.routes ?? []),
  components: [...LAYOUT_PREVIEWS, ...COMPONENT_PREVIEWS],

  deploy: {
    env: import.meta.env.VITE_DEPLOY_ENV,
    branch: import.meta.env.VITE_DEPLOY_BRANCH,
    commit: import.meta.env.VITE_DEPLOY_COMMIT,
  },

  theme: { locales: ["pt-BR"] },
  dataSources: { default: "fixtures" },
};
