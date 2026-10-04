import type { Fixture, RouteDefinition, Rule, Scenario } from "@brucesantos/design-space";

/**
 * O que uma tela de feature registra no produto: rotas, cenários, fixtures e,
 * se houver, regras.
 *
 * Cada feature tem o seu `src/screens/<pasta>/registro.ts` com
 * `export const feature: Feature`, e o `product.ts` junta todas sozinho. Assim
 * um PR de tela não mexe em arquivo compartilhado, e PRs abertos ao mesmo tempo
 * não conflitam no registro.
 */
export type Feature = {
  scenarios?: Scenario[];
  fixtures?: Fixture[];
  routes?: RouteDefinition[];
  rules?: Rule[];
};

const modules = import.meta.glob<{ feature: Feature }>("../screens/*/registro.ts", { eager: true });

/** As features registradas, na ordem alfabética da pasta. */
export const FEATURES: Feature[] = Object.keys(modules)
  .sort()
  .map((path) => modules[path]!.feature);
