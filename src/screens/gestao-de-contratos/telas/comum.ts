/**
 * O que os registros das telas de contratos compartilham: o fluxo (grupo na
 * aba Telas), a persona e o atalho para declarar cenários.
 */
import type { Scenario } from "@brucesantos/design-space";

/** Grupo das telas do módulo na lista do Design Space. */
export const FLOW = "Gestão de Contratos";

/** Componentes do catálogo usados por todas as telas do módulo. */
export const BASE_COMPONENTS = ["layout.backoffice", "core.card", "core.button", "core.tag", "core.header", "core.breadcrumbs"];

type S = Omit<Scenario, "route" | "fixture" | "persona"> & { route: string; fixture?: string; persona?: string };

/**
 * Cenário do módulo. Persona `admin`: os papéis do módulo (Diretoria, Jurídico,
 * Financeiro…) ainda não existem no Bloomy e entram pelo controle "Visão por papel".
 */
export const cenario = (components: string[]) => (s: S): Scenario => ({
  fixture: "contratos.base",
  persona: "admin",
  components: [...BASE_COMPONENTS, ...components],
  ...s,
});
