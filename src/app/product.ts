import type { ProductDefinition } from "@brucesantos/design-space";

import { COMPONENT_PREVIEWS } from "../catalog/components.js";
import { LAYOUT_PREVIEWS } from "../catalog/layouts.js";
import { personas } from "../personas/index.js";
import { OPERATOR_DOCS_PATH, OperatorDocuments } from "../screens/OperatorDocuments.js";
import { OPERATOR_DOCS_FIXTURES } from "../screens/documentos-operadora/fixtures.js";

/**
 * O Bloomy Design Space é a biblioteca de componentes e layouts do Bloomy,
 * espelhados do monólito Phoenix.
 *
 * Telas de feature entram por PR, registradas em `scenarios` e `routes`, e
 * ficam como registro do design combinado no handoff.
 */
export const productDefinition: ProductDefinition = {
  id: "bloomy",
  name: "Bloomy",
  tagline: "Componentes e layouts do Bloomy, espelhados do sistema real.",

  scenarios: [
    {
      id: "operator-docs.professionals",
      title: "Documentos › Profissionais",
      route: OPERATOR_DOCS_PATH,
      fixture: "operator-docs.professionals",
      persona: "admin",
      intent: "A aba Documentos da Unimed abre em Profissionais: quem está credenciado, a formação de cada um e o que falta compartilhar.",
      expected: [
        "Cabeçalho: Unimed, Ativa, Plano de saúde; ANS 339679 · 3 serviços · 3 pacientes · 3 guias vigentes · Unidade Teste; menu ⋮ com Inativar operadora.",
        "Título Documentos com \"3 de 10 profissionais credenciados · 1 de 2 unidades credenciadas\" e os button_tabs Profissionais / Unidades.",
        "Totais: 4 não credenciados, 3 em credenciamento, 3 ativos, 0 descredenciados.",
        "Tânia Abreu Pinho em credenciamento com 3 documentos e \"falta 1\" (currículo); Mariana Palmeira Stein com \"falta 2\" (currículo e registro no conselho vencido).",
        "Sem vínculo: Habilitar, que abre o credenciamento e o drawer Compartilhar com operadora. Com vínculo: Ações › Exportar separados, Exportar consolidado, Compartilhamento.",
        "Compartilhar todos os documentos exigidos (formação, conselho, RG / CPF, currículo) passa o profissional para Ativo.",
      ],
    },
    {
      id: "operator-docs.units",
      title: "Documentos › Unidades",
      route: OPERATOR_DOCS_PATH,
      fixture: "operator-docs.units",
      persona: "admin",
      intent: "Os documentos obrigatórios de cada unidade compartilhados com a operadora.",
      expected: [
        "Totais: 1 não compartilhado, 0 em credenciamento, 1 credenciada.",
        "Unidade Teste: 12 documentos compartilhados, sem pendências, Credenciada. Santana: 0, falta 12, Não compartilhado.",
        "Ações › Gerenciar documentos abre o drawer Documentos da unidade, com os obrigatórios marcados como Padrão e a validade de cada um.",
        "Compartilhar o primeiro documento de Santana a passa para Em credenciamento.",
      ],
    },
    {
      id: "operator-docs.read-only",
      title: "Sem permissão de editar",
      route: OPERATOR_DOCS_PATH,
      fixture: "operator-docs.professionals",
      persona: "clinic_admin",
      intent: "Admin de Clínica vê a ficha da operadora, mas não edita (HealthCarePolicy: editar é só admin e operation).",
      expected: [
        "Sem o menu ⋮ do cabeçalho e sem Habilitar nos profissionais não credenciados.",
        "Nos drawers, os documentos aparecem com o compartilhamento desabilitado; em Unidades a ação vira Ver documentos.",
      ],
    },
  ],
  personas,
  fixtures: [...OPERATOR_DOCS_FIXTURES],
  routes: [
    {
      path: OPERATOR_DOCS_PATH,
      screen: OperatorDocuments,
      name: "Documentos da Operadora",
      description:
        "Nova aba Documentos na ficha da operadora: o credenciamento dos profissionais pelos documentos compartilhados e os documentos obrigatórios das unidades.",
    },
  ],
  components: [...LAYOUT_PREVIEWS, ...COMPONENT_PREVIEWS],

  deploy: {
    env: import.meta.env.VITE_DEPLOY_ENV,
    branch: import.meta.env.VITE_DEPLOY_BRANCH,
    commit: import.meta.env.VITE_DEPLOY_COMMIT,
  },

  theme: { locales: ["pt-BR"] },
  dataSources: { default: "fixtures" },
};
