import type { Feature } from "../../../app/features.js";
import { ContratosNovo } from "../../ContratosNovo.js";
import { MODALIDADE } from "../model.js";
import { ROTAS, papelControl } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = ["core.radio-cards", "core.radio-group", "core.input", "core.multi-select-search", "core.form-grid", "core.file-uploader", "core.drawer-modal", "core.drawer-modal", "core.toast-wrapper"];
const c = cenario(COMPONENTS);

export const novoContrato: Feature = {
  routes: [
    {
      path: ROTAS.novo,
      screen: ContratosNovo,
      name: "Novo Contrato",
      group: FLOW,
      description: "Formulário em cinco seções: modalidade, partes, financeiro, vigência e campos da categoria.",
      components: COMPONENTS,
      controls: [
        {
          id: "formulario",
          title: "Formulário",
          controls: [
            { id: "modalidade", label: "Modalidade", default: "adesao", options: Object.entries(MODALIDADE).map(([value, m]) => ({ value, label: m.label })) },
            {
              id: "estado",
              label: "Estado",
              default: "inicial",
              options: [
                { value: "vazio", label: "Em branco" },
                { value: "inicial", label: "Categoria e parte escolhidas" },
                { value: "erros", label: "Salvo com erros" },
                { value: "liminar", label: "Origem judicial (liminar)" },
              ],
            },
          ],
        },
        papelControl("solicitante"),
      ],
      expected: [
        "Índice das cinco seções à esquerda, com a contagem de erros de cada uma.",
        "Adesão mostra a minuta vigente da categoria; Corporativo e Específico trocam a minuta pela área de upload (Fluxo Invertido).",
        "Diretoria, Aprovador e Financeiro não criam contratos: aviso com o motivo e quem cria.",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.novo-adesao",
      title: "Novo contrato por Adesão",
      route: ROTAS.novo,
      controls: { modalidade: "adesao", estado: "inicial" },
      intent: "O gestor da área cria um contrato de PJ assistencial a partir da minuta padrão.",
      expected: [
        "Modalidade Adesão marcada; código previsto CT-2026-013 com selo Automático e o link Informar código manual / legado (selo vira Manual / Legado).",
        "Categoria PJ Assistencial; minuta MIN-PJA v2.1 pré-selecionada: 10 cláusulas, Dra. Helena Duarte (Jurídico) · 15/06/2026.",
        "Pré-visualizar Cláusulas abre a folha A4 com as 10 cláusulas e as tags em roxo, com \"Página X de Y\".",
        "Parte FOR-0005 · Rafael Nunes Teixeira preenche fluxo Despesa, forma Pix e condição 15 dias após o RPA; a lista não traz a Gráfica Pontual (inativa).",
        "Categoria, Fluxo, Forma e Condição de Pagamento e Índice são um combobox criável (componente novo): digitar filtra a lista (sem acento e sem caixa) e, sem opção igual, aparece \"Criar nova/novo “texto”\", que cadastra e já seleciona sem sair do formulário.",
        "Unidades é a versão múltipla do combobox criável (componente novo, no estilo do multi_select_search): as escolhidas viram etiquetas no campo, a lista fica aberta para marcar várias e só oferece \"Criar nova\" quando nenhuma unidade existente é igual ao digitado (sem acento e sem caixa), para ninguém cadastrar a mesma unidade com outro nome.",
        "Campos da categoria: Especialidade = Fonoaudiologia.",
      ],
    }),
    c({
      id: "contratos.novo-upload",
      title: "Novo contrato Corporativo (Fluxo Invertido)",
      route: ROTAS.novo,
      controls: { modalidade: "corporativo", estado: "inicial" },
      intent: "Contrato negociado fora: a governança incide sobre o documento enviado.",
      expected: [
        "Modalidade Corporativo marcada; no lugar da minuta, a área de upload \"Fluxo Invertido\" com a explicação do porquê.",
        "Upload aceita PDF, DOC ou DOCX por clique ou arrasto e mostra nome e tamanho; outro tipo é recusado com o motivo.",
        "Categoria Tecnologia, parte FOR-0003 · Nuvem Clínica Sistemas; a categoria não tem campos extras (aviso discreto).",
        "Salvar sem o anexo mostra o erro no anexo: no Fluxo Invertido ele é obrigatório.",
      ],
    }),
    c({
      id: "contratos.novo-erros",
      title: "Novo contrato com erros",
      route: ROTAS.novo,
      controls: { modalidade: "adesao", estado: "erros" },
      intent: "Ver a validação depois de Salvar & Iniciar Elaboração.",
      expected: [
        "Resumo no topo \"Corrija 4 campos\" com links para cada um.",
        "Erros por campo: valor \"O valor não pode ser negativo.\", vencimento 35 \"Use um dia de 1 a 31.\", unidades \"Informe pelo menos uma unidade.\", fim 01/08/2026 \"O fim precisa ser depois de 01/09/2026.\"",
        "O índice das seções marca Financeiro (3) e Vigência (1) em vermelho.",
        "Corrigidos os campos, salvar mostra a confirmação do CT-2026-013 em Elaboração (toast) com o atalho para a ficha de exemplo CT-2026-006.",
      ],
    }),
    c({
      id: "contratos.novo-liminar",
      title: "Novo contrato Específico de origem judicial",
      route: ROTAS.novo,
      controls: { modalidade: "especifico", estado: "liminar" },
      intent: "Contrato que cumpre uma decisão liminar.",
      expected: [
        "Modalidade Específico com o upload; anexo decisao-liminar-renovacao.pdf (412.0 KB) já enviado.",
        "Origem judicial Sim, com Nº do processo 0001234-56.2026.8.16.0001 e Vara 3ª Vara Cível de Curitiba (obrigatórios).",
        "Parte CLI-0005 · Pedro Henrique Sales (Liminar), com selo Liminar; escolher uma parte Liminar Judicial marca a origem judicial sozinho.",
        "Categoria Particular, com o campo extra Paciente/beneficiário.",
      ],
    }),
  ],
};
