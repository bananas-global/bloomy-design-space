import type { ProductDefinition } from "@brucesantos/design-space";

import { COMPONENT_PREVIEWS } from "../catalog/components.js";
import { LAYOUT_PREVIEWS } from "../catalog/layouts.js";
import { personas } from "../personas/index.js";
import { UnitDocuments } from "../screens/UnitDocuments.js";
import { UNIT_DOCUMENTS_FIXTURES } from "../screens/documentos-unidade/fixtures.js";
import {
  FLOW as UNIT_DOCUMENTS_FLOW,
  PATH as UNIT_DOCUMENTS_PATH,
  UNIT_DOCUMENTS_CONTROLS,
  UNIT_ID,
  unitDocumentsPath,
} from "../screens/documentos-unidade/flow.js";

/** Componentes do catálogo que a aba Documentos da unidade usa. */
const UNIT_DOCUMENTS_COMPONENTS = [
  "layout.backoffice", "layout.unit", "core.card-tabs", "core.header", "core.button", "core.input",
  "core.custom-select", "core.radio-selector", "core.table", "core.tag", "core.avatar", "core.dropdown-menu",
  "core.empty-state-card", "core.toast-wrapper", "core.drawer-modal", "core.fake-input",
  "core.radio-group", "core.multi-select", "core.file-uploader", "core.error",
];

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

  // Atalhos do fluxo Documentos da unidade: combinações de controles que
  // valem um link direto no PR. O resto se monta no painel Variações.
  scenarios: [
    {
      id: "unit-documents.cards",
      title: "Documentos da unidade em cards, com alertas",
      route: unitDocumentsPath(),
      fixture: "unit-documents.units",
      persona: "admin",
      intent: "A aba da Unidade Teste: os doze documentos padrão preenchidos e os adicionais, em cards.",
      expected: [
        "Contadores: 0 pendentes, 12 ativos, 1 a vencer, 1 vencido.",
        "Dedetização \"Vencido\", potabilidade \"Vence em 25 dias\" e o aditivo de locação \"Aguardando vigência\".",
        "Cada card padrão mostra a validade ou a vigência, a renovação, a data de atualização e o responsável.",
      ],
    },
    {
      id: "unit-documents.pending",
      title: "Unidade com documentos pendentes (Santana)",
      route: unitDocumentsPath(),
      fixture: "unit-documents.units",
      persona: "admin",
      controls: { unit: "u2" },
      intent: "Uma unidade só com alvará e licença sanitária: os outros dez documentos padrão aparecem como lacunas.",
      expected: [
        "Contadores: 10 pendentes, 1 ativo, 1 a vencer, 0 vencidos.",
        "Cada lacuna mostra a dica do que anexar, a renovação e o botão Anexar.",
      ],
    },
    {
      id: "unit-documents.table",
      title: "Documentos da unidade em tabela",
      route: unitDocumentsPath(),
      fixture: "unit-documents.units",
      persona: "admin",
      controls: { unit: "u2", view: "table" },
      intent: "A mesma lista em tabela, com responsável, datas, status e operadoras.",
      expected: ["Lacunas padrão aparecem esmaecidas, com \"sem arquivo anexado\" e o botão Anexar."],
    },
    {
      id: "unit-documents.add",
      title: "Adicionar documento à unidade",
      route: unitDocumentsPath(),
      fixture: "unit-documents.units",
      persona: "admin",
      controls: { overlay: "add" },
      intent: "A gaveta para um documento adicional: nome, tipo, vigência, arquivo e operadoras.",
      expected: [
        "Tipos: Alvará / Licença, Certificado, Contrato e Outro.",
        "Salvar vazio pede o nome, o tipo, a data de expiração e o arquivo.",
        "Ao salvar, o documento entra na lista e aparece o toast \"Documento adicionado\".",
      ],
    },
    {
      id: "unit-documents.attach",
      title: "Anexar o CLI (Santana)",
      route: unitDocumentsPath(),
      fixture: "unit-documents.units",
      persona: "admin",
      controls: { unit: "u2", overlay: "attach" },
      intent: "A gaveta aberta pela lacuna padrão, com a nota do documento e o tipo travado.",
      expected: ["A nota mostra o que é o CLI e a renovação anual.", "O nome já vem preenchido e o tipo aparece com cadeado."],
    },
    {
      id: "unit-documents.edit",
      title: "Editar o alvará",
      route: unitDocumentsPath(),
      fixture: "unit-documents.units",
      persona: "admin",
      controls: { overlay: "edit" },
      intent: "Um documento padrão já anexado: vigência de/até, arquivo atual e operadoras.",
      expected: ["Vigência de 01/01/2026 a 31/12/2026, compartilhado com Unimed e Bradesco Saúde."],
    },
    {
      id: "unit-documents.bundle",
      title: "Exportar agrupado da unidade",
      route: unitDocumentsPath(),
      fixture: "unit-documents.units",
      persona: "admin",
      controls: { overlay: "bundle" },
      intent: "Juntar os documentos escolhidos da unidade num PDF só, na ordem da lista.",
      expected: ["Todos os documentos com arquivo vêm marcados; o rodapé avisa quantos estão vencidos ou a vencer."],
    },
    {
      id: "unit-documents.empty",
      title: "Unidade sem documentos",
      route: unitDocumentsPath(),
      fixture: "unit-documents.units",
      persona: "admin",
      controls: { rows: "empty" },
      intent: "Unidade nova: só as lacunas dos doze documentos padrão.",
      expected: ["Contadores: 12 pendentes, 0 ativos, 0 a vencer, 0 vencidos."],
    },
    {
      id: "unit-documents.readonly",
      title: "Documentos da unidade só leitura (Admin de Clínica)",
      route: unitDocumentsPath(),
      fixture: "unit-documents.units",
      persona: "clinic_admin",
      intent: "Quem vê a unidade mas não tem units.edit.",
      expected: ["Sem \"Adicionar documento\"; Editar e Anexar ficam desabilitados.", "Exportar agrupado continua disponível."],
    },
  ],
  personas,
  defaultPersona: "admin",
  fixtures: [...UNIT_DOCUMENTS_FIXTURES],
  routes: [
    {
      path: UNIT_DOCUMENTS_PATH,
      params: { id: UNIT_ID },
      screen: UnitDocuments,
      name: "Documentos",
      group: UNIT_DOCUMENTS_FLOW,
      description: "A aba Documentos da unidade: documentos padrão e adicionais, em cards ou tabela, com o compartilhamento com as operadoras.",
      controls: UNIT_DOCUMENTS_CONTROLS,
      expected: [
        "Os doze documentos padrão (CLI, alvará, AVCB, vigilância sanitária, CNES, CRP, CREFITO, CREFONO, dedetização, potabilidade, PGRSS e locação) aparecem sempre, com o selo \"Padrão\"; sem arquivo, ficam \"Pendente\" com a dica e o botão Anexar.",
        "Depois vêm os documentos adicionais.",
        "Status: Pendente (amarelo), Aguardando vigência (azul-claro), Sem validade (neutro), Válido (verde), Vence em N dias até 60 dias antes (laranja) e Vencido (vermelho).",
        "Filtros por nome, tipo, status, operadora e padrão/adicional; sem resultado: \"Nenhum documento corresponde aos filtros\" e Limpar filtros.",
        "Adicionar, Anexar e Editar abrem a gaveta; documento padrão tem o tipo travado e a nota do que é.",
        "Validade: \"Sem validade\" ou \"Definir vigência\" (de / expira em).",
        "Exportar agrupado junta num PDF os documentos com arquivo.",
        "Sem units.edit: sem Adicionar documento, e Editar/Anexar desabilitados.",
      ],
      components: UNIT_DOCUMENTS_COMPONENTS,
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
