import type { ProductDefinition } from "@brucesantos/design-space";

import { COMPONENT_PREVIEWS } from "../catalog/components.js";
import { LAYOUT_PREVIEWS } from "../catalog/layouts.js";
import { personas } from "../personas/index.js";
import { ProfessionalDocuments } from "../screens/ProfessionalDocuments.js";
import { DOCUMENTS_FIXTURES } from "../screens/documentos/fixtures.js";
import { DOCUMENTS_CONTROLS, FLOW as DOCUMENTS_FLOW, PATH as DOCUMENTS_PATH, PROFESSIONAL_ID, documentsPath } from "../screens/documentos/flow.js";

/** Componentes do catálogo que a aba Documentos do profissional usa. */
const DOCUMENTS_COMPONENTS = [
  "layout.backoffice", "layout.professional", "core.lazy-tabs", "core.header", "core.button", "core.input",
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

  // Atalhos do fluxo Documentos do profissional: combinações de controles que
  // valem um link direto no PR. O resto se monta no painel Variações.
  scenarios: [
    {
      id: "documents.cards",
      title: "Documentos em cards, com pendentes e alertas",
      route: documentsPath(),
      fixture: "documents.helena",
      persona: "admin",
      intent: "A aba única: os seis documentos padrão, mesmo sem arquivo, e depois os adicionais, em cards.",
      expected: [
        "Contadores: 2 pendentes, 9 ativos, 1 a vencer, 1 vencido.",
        "Carteirinha e quitação do conselho aparecem como lacunas \"Pendente\", com a dica do que anexar e o botão Anexar.",
        "Formação especial mostra \"+2 outros documentos deste tipo\".",
      ],
    },
    {
      id: "documents.table",
      title: "Documentos em tabela",
      route: documentsPath(),
      fixture: "documents.helena",
      persona: "admin",
      controls: { view: "table" },
      intent: "A mesma lista em tabela, com número, datas, status e operadoras.",
      expected: ["Lacunas padrão aparecem esmaecidas, com \"sem arquivo anexado\" e o botão Anexar."],
    },
    {
      id: "documents.add",
      title: "Adicionar documento",
      route: documentsPath(),
      fixture: "documents.helena",
      persona: "admin",
      controls: { overlay: "add" },
      intent: "A gaveta para um documento adicional: escolher o tipo, validade, arquivo e operadoras.",
      expected: [
        "Só os tipos não padrão são oferecidos; \"Outro documento\" pede o nome.",
        "Salvar sem arquivo mostra \"Anexe o arquivo do documento.\"",
        "Ao salvar, o documento entra na lista e aparece o toast \"Documento adicionado\".",
      ],
    },
    {
      id: "documents.attach",
      title: "Anexar a carteirinha do conselho",
      route: documentsPath(),
      fixture: "documents.helena",
      persona: "admin",
      controls: { overlay: "attach" },
      intent: "A gaveta aberta pela lacuna padrão, com o tipo travado.",
      expected: ["O tipo aparece com cadeado, sem escolha.", "A validade já vem em \"Definir data\", porque a carteirinha vence."],
    },
    {
      id: "documents.edit-aba",
      title: "Editar curso de ABA",
      route: documentsPath(),
      fixture: "documents.helena",
      persona: "admin",
      controls: { overlay: "edit-aba" },
      intent: "O curso de ABA de 320h, com a carga horária e os atalhos de horas.",
      expected: ["A carga horária é obrigatória; os atalhos 40h a 360h preenchem o campo.", "O nome do documento acompanha as horas."],
    },
    {
      id: "documents.bundle",
      title: "Exportar agrupado",
      route: documentsPath(),
      fixture: "documents.helena",
      persona: "admin",
      controls: { overlay: "bundle" },
      intent: "Juntar os documentos escolhidos num PDF só, na ordem da lista.",
      expected: [
        "Os documentos vêm na ordem da aba: Formação, Conselho, Curso ABA e as formações especiais, depois os adicionais.",
        "Todos os documentos com arquivo vêm marcados (checkbox do sistema); o rodapé avisa quantos estão vencidos ou a vencer.",
        "Desmarcar todos desabilita Exportar PDF.",
      ],
    },
    {
      id: "documents.empty",
      title: "Profissional sem documentos",
      route: documentsPath(),
      fixture: "documents.helena",
      persona: "admin",
      controls: { rows: "empty" },
      intent: "Ficha nova: só as lacunas dos seis documentos padrão.",
      expected: ["Contadores: 6 pendentes, 0 ativos, 0 a vencer, 0 vencidos."],
    },
    {
      id: "documents.readonly",
      title: "Só leitura (Atendente)",
      route: documentsPath(),
      fixture: "documents.helena",
      persona: "attendant",
      intent: "Quem vê profissionais mas não edita.",
      expected: ["Sem \"Adicionar documento\"; Editar e Anexar ficam desabilitados.", "Exportar agrupado continua disponível."],
    },
  ],
  personas,
  defaultPersona: "admin",
  fixtures: [...DOCUMENTS_FIXTURES],
  routes: [
    {
      path: DOCUMENTS_PATH,
      params: { id: PROFESSIONAL_ID },
      screen: ProfessionalDocuments,
      name: "Documentos",
      group: DOCUMENTS_FLOW,
      description: "A aba Documentos da ficha do profissional: documentos padrão e adicionais, em cards ou tabela, com o compartilhamento com as operadoras.",
      controls: DOCUMENTS_CONTROLS,
      expected: [
        "Os seis documentos padrão aparecem sempre, com o selo \"Padrão\"; sem arquivo, ficam \"Pendente\" com o botão Anexar.",
        "Depois vêm os documentos adicionais.",
        "Status: Pendente (amarelo), Sem validade (roxo-escuro claro, `dark-purple`), Válido (verde), Vence em N dias até 60 dias antes (laranja) e Vencido (vermelho).",
        "Filtros por nome, tipo, status e operadora; sem resultado: \"Nenhum documento corresponde aos filtros\" e Limpar filtros.",
        "Adicionar, Anexar e Editar abrem a gaveta; documento padrão tem o tipo travado.",
        "Curso de ABA pede a carga horária; Formação especial pede a formação (IS, Bobath, PECS…).",
        "Compartilhar com operadoras marca quem exige o tipo para credenciar.",
        "Exportar agrupado junta num PDF os documentos com arquivo.",
        "Sem professionals.edit: sem Adicionar documento, e Editar/Anexar desabilitados.",
      ],
      components: DOCUMENTS_COMPONENTS,
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
