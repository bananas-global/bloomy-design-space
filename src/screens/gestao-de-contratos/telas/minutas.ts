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
      description: "Catálogo versionado das minutas, editor com dicionário de tags e blocos jurídicos, simulação em A4 e publicação de revisão.",
      components: COMPONENTS,
      controls: [
        {
          id: "estado",
          title: "Estado de abertura",
          note: "Modo da tela, drawer aberto e a minuta aberta no editor.",
          controls: [
            { id: "modo", label: "Modo", default: "catalogo", options: [{ value: "catalogo", label: "Catálogo" }, { value: "editor", label: "Editor" }, { value: "simulacao", label: "Simulação" }] },
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
        "Catálogo com todas as versões, mais recentes primeiro, com status Vigente (verde) ou Obsoleta / Arquivada (cinza).",
        "Busca e selects Grupo (PJ Assistencial, CLT, Corporativo) e Status (Vigentes, Obsoletas), com etiquetas removíveis.",
        "Revisar só na vigente; Clonar e Novo modelo só para o Jurídico; Comparar leva ao Diff Jurídico.",
        "Contratos vigentes em versão antiga aparecem por minuta, com link para o Diff e os impactados.",
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
        "Aviso âmbar: MIN-PJA com 2 contratos vigentes em versão anterior à v2.1 (CT-2026-001 e CT-2025-040 na v2.0), com \"Ver diferenças e impactados\"; MIN-PAR com 1 (CT-2025-018 na v1.0, versão fora do catálogo: revisar pela ficha).",
        "Tabela com 6 versões, mais recentes primeiro: MIN-PJA v2.1 (15/06/2026, Vigente, 10 cláusulas), MIN-CLT v1.2, MIN-PAR v1.1, MIN-PJA v2.0 (Obsoleta / Arquivada), MIN-REC v1.0, MIN-PJA v1.0 (Obsoleta / Arquivada).",
        "Na linha da MIN-PJA v2.1, \"2 contratos vigentes em versão antiga\" leva ao Diff v2.0 → v2.1 com os impactados.",
        "Ações: Revisar só nas vigentes; Clonar em todas; Comparar leva ao Diff (obsoleta → vigente). Exportar planilha e Novo modelo no cabeçalho do bloco.",
        "Selects de grupo e status somam com a busca.",
        "Em outro papel (ex.: Diretoria), o catálogo fica em leitura: sem Novo modelo, Revisar e Clonar; Comparar continua.",
      ],
    }),
    c({
      id: "contratos.minuta-nova",
      title: "Novo modelo de minuta",
      route: ROTAS.minutas,
      controls: { modal: "nova" },
      intent: "Cadastrar uma minuta nova, que nasce v1.0 Vigente.",
      expected: [
        "Drawer com código, categoria (da tabela de apoio), título, revisor e conteúdo, todos obrigatórios.",
        "Criar sem preencher mostra o erro em cada campo; código repetido (ex.: MIN-PJA) é recusado dizendo para usar Revisar.",
        "Ao criar, a minuta aparece no topo do catálogo como v1.0 Vigente, com toast de confirmação.",
      ],
    }),
    c({
      id: "contratos.minuta-editor",
      title: "Editor da minuta (MIN-PJA v2.1)",
      route: ROTAS.minutas,
      controls: { modo: "editor", minuta: "m1" },
      intent: "Revisar a MIN-PJA v2.1 no editor visual, com tags e blocos jurídicos.",
      expected: [
        "Barra com MIN-PJA v2.1, Tela cheia, Simular com Dados Reais e Publicar revisão (desabilitado até alterar uma cláusula).",
        "Lista das 10 cláusulas à esquerda (Preâmbulo à Cláusula 9ª — Do Foro); a ativa abre no editor de texto com a barra de formatação.",
        "8 blocos jurídicos: Parágrafo §, Parágrafo Único e Alíneas entram no cursor; Preâmbulo, Cláusula, LGPD, Anticorrupção e Foro viram cláusula nova (selo Nova).",
        "Dicionário de tags: 24 tags em 4 categorias (Parte, Contrato, Financeiro, Vigência), com busca; Inserir põe {{tag}} no cursor e a prévia mostra as tags em roxo.",
        "Cláusula alterada ganha o selo Alterada na lista.",
      ],
    }),
    c({
      id: "contratos.minuta-simulacao",
      title: "Simular com Dados Reais",
      route: ROTAS.minutas,
      controls: { modo: "simulacao", minuta: "m1" },
      intent: "Ver a MIN-PJA v2.1 pronta, com as tags trocadas por dados de exemplo, antes de publicar.",
      expected: [
        "Folha A4 com \"Página X de Y\", título da minuta e as cláusulas com os valores de exemplo destacados (ex.: Clínica Integrar Terapias Ltda., R$ 18.500,00).",
        "{{parte.conselho}} não tem exemplo: aparece \"Variável não preenchida\" em âmbar, e o aviso no topo lista a tag.",
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
        "Drawer com Minor (v2.1 → v2.2) e Major (v2.1 → v3.0); o botão mostra a versão que será publicada.",
        "Justificativa e revisor obrigatórios: publicar vazio mostra o erro em cada campo.",
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
        "Drawer \"Clonar MIN-PJA v2.1\" com novo código e categoria obrigatórios e título sugerido \"(cópia)\".",
        "Código que já existe (ex.: MIN-CLT) é recusado com o motivo.",
        "A cópia nasce v1.0 Vigente com as 10 cláusulas e aparece no topo do catálogo, com toast.",
      ],
    }),
  ],
};
