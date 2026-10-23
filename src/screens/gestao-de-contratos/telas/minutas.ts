import type { Feature } from "../../../app/features.js";
import { ContratosMinutas } from "../../ContratosMinutas.js";
import { ROTAS, papelControl } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = ["core.table", "core.input", "core.drawer-modal", "core.rich-text", "core.radio-cards", "core.empty-state-card", "core.toast-wrapper"];
const c = cenario(COMPONENTS);

export const minutas: Feature = {
  routes: [
    {
      path: ROTAS.minutas,
      screen: ContratosMinutas,
      name: "Minutas Padrão",
      group: FLOW,
      description: "Catálogo versionado das minutas (FR-059), contratos impactados com aditivo de adequação (FR-068/069), editor visual com dicionário de 24 tags e 8 blocos jurídicos (FR-061 a 063), simulação em A4 (FR-064), novo modelo, clone e publicação de revisão (FR-060, 065, 066).",
      components: COMPONENTS,
      controls: [
        {
          id: "estado",
          title: "Estado de abertura",
          note: "Modo da tela, drawer aberto e a minuta aberta no editor. \"Novo modelo\" abre o editor com o texto inicial.",
          controls: [
            { id: "modo", label: "Modo", default: "catalogo", options: [{ value: "catalogo", label: "Catálogo" }, { value: "editor", label: "Editor (revisão)" }, { value: "novo", label: "Editor (novo modelo)" }, { value: "simulacao", label: "Simulação" }] },
            { id: "modal", label: "Modal", default: "nenhum", options: [{ value: "nenhum", label: "Nenhum" }, { value: "nova", label: "Novo modelo" }, { value: "revisao", label: "Publicar revisão" }, { value: "clonar", label: "Clonar" }] },
            {
              id: "minuta",
              label: "Minuta aberta",
              default: "nenhuma",
              options: [
                { value: "nenhuma", label: "Nenhuma" },
                { value: "m1", label: "MIN-PJA v2.1 (vigente)" },
                { value: "m4", label: "MIN-CLT v1.2 (vigente)" },
                { value: "m5", label: "MIN-REC v1.0 (vigente)" },
                { value: "m6", label: "MIN-PAR v1.1 (vigente)" },
              ],
            },
          ],
        },
        papelControl("juridico"),
      ],
      expected: [
        "Catálogo com todas as versões, mais recentes primeiro, com status Vigente (verde) ou Obsoleta / Arquivada (cinza) e a descrição da versão.",
        "Filtros Todas, PJ Assistencial, CLT, Corporativo, Vigentes e Obsoletas (um de grupo e um de status por vez) e busca, com etiquetas removíveis.",
        "Revisar só na vigente; Clonar e Novo modelo só para o Jurídico; Comparar leva ao Diff Jurídico.",
        "Painel de contratos impactados (Vigentes em versão anterior à vigente), com o motivo da revisão e Gerar Termo Aditivo.",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.minutas",
      title: "Catálogo de minutas",
      route: ROTAS.minutas,
      intent: "Ver todas as versões das minutas e quais contratos vigentes ficaram em versão antiga.",
      expected: [
        "Bloco \"Contratos impactados por minuta desatualizada\": MIN-PJA v2.1 com CTR-2026-0001 (selo Cláusula personalizada) e CTR-2025-0040, ambos v2.0 → v2.1, o motivo da revisão (anticorrupção e 48h para incidente LGPD) e \"Ver diferenças (v2.0 → v2.1)\"; MIN-PAR v1.1 com CTR-2025-0018 na v1.0 (fora do catálogo, legado).",
        "Gerar Termo Aditivo pede confirmação com TA-02/CTR-2026-0001 · 2º Termo Aditivo (Adequação de Minuta), tipo \"Adequação de Minuta Homologada\", impacto \"Sem alteração de valor nominal. Alinhamento de compliance.\", versão do contrato v1.4 → v2.0 e origem MIN-PJA v2.0 → v2.1; ao confirmar, o contrato sai do painel.",
        "Tabela com 6 versões, mais recentes primeiro: MIN-PJA v2.1 (15/06/2026, Vigente, 10 cláusulas, \"2 contratos impactados\"), MIN-CLT v1.2, MIN-PAR v1.1, MIN-PJA v2.0 (Obsoleta / Arquivada), MIN-REC v1.0, MIN-PJA v1.0 (Obsoleta / Arquivada).",
        "Ações: Revisar só nas vigentes; Clonar em todas; Comparar em todas (obsoleta → vigente; versão única abre o texto no Diff). Exportar planilha e Novo modelo no cabeçalho do bloco.",
        "Filtros: Todas (6), PJ Assistencial (3), CLT (1), Corporativo (2: MIN-REC e MIN-PAR, tudo que não é PJ Assistencial nem CLT), Vigentes (4), Obsoletas (2); grupo e status somam com a busca.",
        "Em outro papel (ex.: Diretoria), o catálogo fica em leitura: sem Novo modelo, Revisar, Clonar e Gerar Termo Aditivo; Comparar continua.",
      ],
    }),
    c({
      id: "contratos.minuta-nova",
      title: "Novo modelo de minuta",
      route: ROTAS.minutas,
      controls: { modal: "nova" },
      intent: "Cadastrar uma minuta nova no mesmo editor visual da revisão; ela nasce v1.0 Vigente.",
      expected: [
        "Atrás do drawer, o editor do novo modelo com o texto inicial (contrato de prestação de serviços: preâmbulo, objeto e remuneração) e os 8 blocos jurídicos, Preâmbulo e Foro inclusive.",
        "Drawer \"Criar novo modelo de minuta\": código automático MIN-007 (selo Automático) ou \"Informar mnemônico manual\"; título, categoria (da tabela de apoio) e revisor obrigatórios; o conteúdo é o do editor.",
        "Mnemônico repetido (ex.: MIN-PJA) é recusado com \"Código de minuta já existe\"; editor sem texto é recusado com \"O conteúdo está vazio\".",
        "Ao criar, a minuta aparece no topo do catálogo como v1.0 Vigente, descrição \"Versão inaugural (v1.0) homologada pelo Jurídico.\", com toast.",
      ],
    }),
    c({
      id: "contratos.minuta-editor",
      title: "Editor da minuta (MIN-PJA v2.1)",
      route: ROTAS.minutas,
      controls: { modo: "editor", minuta: "m1" },
      intent: "Revisar a MIN-PJA v2.1 no editor visual, com tags e blocos jurídicos.",
      expected: [
        "Barra com MIN-PJA v2.1, Tela cheia, Simular com Dados Reais e Publicar revisão.",
        "Lista das 10 cláusulas à esquerda (Preâmbulo à Cláusula 9ª — Do Foro) e \"Nova cláusula\"; a ativa abre no editor de texto com títulos, negrito, itálico, alinhamento e recuo.",
        "6 blocos jurídicos na revisão (Cláusula, Parágrafo §, Parágrafo Único, Alíneas, LGPD, Anticorrupção), todos inseridos no cursor; Preâmbulo e Foro só no novo modelo.",
        "Dicionário de tags: 24 tags em 4 categorias (Partes & Qualificação, Vigência & Prazos, Remuneração & Financeiro, Operacional, SLA & Compliance) com rótulo, descrição e exemplo, e busca; Inserir põe {{TAG}} no cursor em roxo, e a prévia mostra as tags em roxo.",
        "Cláusula alterada ganha o selo Alterada na lista; a nova, o selo Nova.",
      ],
    }),
    c({
      id: "contratos.minuta-simulacao",
      title: "Simular com Dados Reais",
      route: ROTAS.minutas,
      controls: { modo: "simulacao", minuta: "m1" },
      intent: "Ver a MIN-PJA v2.1 pronta, com as tags trocadas por dados de exemplo, antes de publicar.",
      expected: [
        "Folha A4 com \"Página X de Y\", título da minuta e as cláusulas com os valores de exemplo destacados (ex.: Clínica Integrar Terapias Ltda., R$ 18.500,00, IPCA (IBGE)).",
        "Todas as tags da MIN-PJA estão no dicionário: aviso verde \"Todas as variáveis têm valor\".",
        "Tag fora do dicionário digitada no editor (ex.: {{CONTRATANTE_REPRESENTANTE}}) aparece como \"Variável não preenchida\" em âmbar, e o aviso no topo lista a tag.",
        "Voltar ao editor e Publicar revisão na barra.",
      ],
    }),
    c({
      id: "contratos.minuta-revisao",
      title: "Publicar revisão",
      route: ROTAS.minutas,
      controls: { modo: "editor", minuta: "m1", modal: "revisao" },
      intent: "Publicar a revisão da MIN-PJA: minor ou major, com justificativa e revisor.",
      expected: [
        "Drawer com Minor (+0.1, v2.1 → v2.2) e Major (+1.0, v2.1 → v3.0); o botão mostra a versão que será publicada.",
        "Título e categoria herdados da vigente; sem cláusula alterada, aviso de que a nova versão herda as cláusulas vigentes.",
        "Justificativa e revisor obrigatórios: publicar vazio mostra o erro em cada campo. Versão que já existe é recusada.",
        "Ao publicar, a nova versão aparece no topo como Vigente, a v2.1 e anteriores viram Obsoleta / Arquivada e um toast confirma.",
      ],
    }),
    c({
      id: "contratos.minuta-clonar",
      title: "Clonar minuta",
      route: ROTAS.minutas,
      controls: { modal: "clonar", minuta: "m1" },
      intent: "Clonar a MIN-PJA v2.1 para um código e categoria novos.",
      expected: [
        "Drawer \"Clonar MIN-PJA v2.1\": código automático MIN-007 ou mnemônico manual, categoria e revisor obrigatórios e título sugerido \"Prestação de Serviços Terapêuticos (PJ) (Cópia Especializada)\".",
        "Mnemônico que já existe (ex.: MIN-CLT) é recusado com \"Código de minuta já existe\".",
        "O clone nasce v1.0 Vigente com as 10 cláusulas vigentes e a descrição \"Modelo clonado a partir de MIN-PJA. Versão inaugural (v1.0) homologada.\", no topo do catálogo, com toast.",
        "Clonar uma versão obsoleta leva as cláusulas da vigente do mesmo código.",
      ],
    }),
  ],
};
