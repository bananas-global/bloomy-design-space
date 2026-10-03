import type { ProductDefinition } from "@brucesantos/design-space";

import { COMPONENT_PREVIEWS } from "../catalog/components.js";
import { LAYOUT_PREVIEWS } from "../catalog/layouts.js";
import { personas } from "../personas/index.js";
import { DOCUMENTS_TABS_ID, DOCUMENTS_TRACKER, OPERATOR_DOCS_PATH, OperatorDocuments } from "../screens/OperatorDocuments.js";
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
      fixture: "operator-docs.unimed",
      persona: "admin",
      intent: "A aba Documentos da Unimed abre em Profissionais: quem está credenciado, a formação de cada um e o que falta compartilhar.",
      expected: [
        "Cabeçalho da ficha (CardHeader): Unimed, tag ANS: 999901, 3 planos ativos, telefone e e-mail; Observações com o ponto de aviso; menu ⋮ com Voltar para lista e Excluir Operadora.",
        "Abas da ficha: Dados da Operadora, Endereço, Tipos de Planos, Contratos, Documentos (aberta), Financeiro, Auditoria e Usuários.",
        "Título Documentos com \"3 de 10 profissionais credenciados · 1 de 2 unidades credenciadas\" e os button_tabs Profissionais / Unidades.",
        "Totais: 4 não credenciados, 3 em credenciamento, 3 ativos, 0 descredenciados (não credenciados em cinza, em credenciamento em azul).",
        "Tânia Abreu Pinho em credenciamento com 3 documentos e \"falta 1\" (currículo); Mariana Palmeira Stein com \"falta 2\" (currículo e registro no conselho vencido).",
        "Sem vínculo: Habilitar, que abre o credenciamento e o drawer Compartilhar com operadora. Com vínculo: Ações › Exportar separados, Exportar consolidado, Compartilhamento.",
        "Compartilhar todos os documentos exigidos (formação, conselho, RG / CPF, currículo) passa o profissional para Ativo.",
        "Quem não tem um exigido no cadastro (Tiago, Raiane e Luciana não têm currículo) vê no drawer o aviso de que fica Em credenciamento até anexar o documento.",
      ],
    },
    {
      id: "operator-docs.units",
      title: "Documentos › Unidades",
      route: `${OPERATOR_DOCS_PATH}?${DOCUMENTS_TRACKER}=${DOCUMENTS_TABS_ID}%7Cunidades`,
      fixture: "operator-docs.unimed",
      persona: "admin",
      intent: "Os documentos obrigatórios de cada unidade compartilhados com a operadora.",
      expected: [
        "A aba Documentos abre em Unidades (a aba vai na URL, no tracker documents_tab).",
        "Totais: 1 não compartilhado (cinza), 0 em credenciamento, 1 credenciada.",
        "Unidade Teste: 12 documentos compartilhados, sem pendências, Credenciada. Santana: 0, falta 12, Não compartilhado.",
        "Ações › Gerenciar documentos abre o drawer Documentos da unidade, com os obrigatórios marcados como Padrão e a validade de cada um.",
        "Compartilhar o primeiro documento de Santana a passa para Em credenciamento.",
      ],
    },
    {
      id: "operator-docs.read-only",
      title: "Sem permissão de editar (proposta)",
      route: OPERATOR_DOCS_PATH,
      fixture: "operator-docs.unimed",
      persona: "clinic_admin",
      intent:
        "Proposta: um papel que vê a ficha da operadora sem editar. No monólito atual, HealthCarePolicy dá ver e editar só a admin e operation; Admin de Clínica não abre a ficha. A matriz de permissões daqui ainda é a antiga e mostra a ficha para ele.",
      expected: [
        "No menu ⋮ do cabeçalho, só Voltar para lista (sem Excluir Operadora); sem as abas Auditoria e Usuários.",
        "Sem Habilitar nos profissionais não credenciados.",
        "Nos drawers, os documentos aparecem com o compartilhamento desabilitado; em Unidades a ação vira Ver documentos.",
      ],
    },
  ],
  personas,
  defaultPersona: "admin",
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
