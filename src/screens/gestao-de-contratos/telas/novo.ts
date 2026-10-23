import type { Feature } from "../../../app/features.js";
import { ContratosNovo } from "../../ContratosNovo.js";
import { MODALIDADE } from "../model.js";
import { ROTAS, papelControl } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = ["core.radio-cards", "core.radio-group", "core.input", "core.multi-select-search", "core.form-grid", "core.file-uploader", "core.modal", "core.drawer-modal", "core.toast-wrapper"];
const c = cenario(COMPONENTS);

export const novoContrato: Feature = {
  routes: [
    {
      path: ROTAS.novo,
      screen: ContratosNovo,
      name: "Novo Contrato",
      group: FLOW,
      description: "Formulário em cinco seções: modalidade, partes, financeiro, vigência e reajuste, campos da categoria. Salvar mostra o que o sistema grava.",
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
                { value: "duplicado", label: "Código legado duplicado" },
                { value: "salvo", label: "Salvo (resultado)" },
              ],
            },
            { id: "parte", label: "Cadastrar Nova Parte", default: "fechado", options: [{ value: "fechado", label: "Fechado" }, { value: "rapido", label: "Cadastro rápido aberto" }] },
          ],
        },
        papelControl("solicitante"),
      ],
      expected: [
        "Índice das cinco seções à esquerda (Modalidade, Partes, Financeiro, Vigência e reajuste, Campos da categoria), com a contagem de erros de cada uma.",
        "Em branco, o formulário já traz os padrões da RN-026: valor 0,00, forma PIX, condição \"Até dia 10 mediante NF\", vencimento dia 10, exige NF Sim, índice IPCA (IBGE), mês-base Janeiro, aviso prévio 30 dias, saneamento 15 dias, Cláusula 7ª Não, origem judicial Não. Unidades começa vazia.",
        "Adesão mostra a minuta vigente da categoria (ou \"Nenhuma minuta específica\", que grava as 9 cláusulas padrão); Corporativo e Específico trocam a minuta pela área de upload (Fluxo Invertido), com o anexo opcional (decisão pendente).",
        "Todos os papéis abrem o formulário: a spec não trava a criação por papel.",
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
        "Modalidade Adesão (Minuta Interna) marcada; código previsto CTR-2026-0011 com selo Automático e o botão Atualizar (toast: consultar não consome o número).",
        "Marcar \"Código legado (Migração)\" troca o selo para Manual / Legado e abre o campo do código, que vira maiúsculas ao digitar.",
        "Categoria PJ Assistencial; minuta MIN-PJA v2.1 pré-selecionada, com código, versão, categoria, 10 cláusulas, revisor Dra. Helena Duarte (Jurídico) e data 15/06/2026.",
        "Pré-visualizar Cláusulas abre a folha A4 com as cláusulas exatas que serão gravadas, já com as tags resolvidas (Rafael Nunes Teixeira, R$ 7.400,00, IPCA (IBGE)); as que dependem das datas, ainda vazias, ficam em roxo.",
        "Parte FOR-0005 · Rafael Nunes Teixeira (autônomo) preenche código e nome, fluxo Despesa (Contratação), forma PIX e condição 15 dias após o RPA; a lista não traz a Gráfica Pontual (inativa, não homologada).",
        "Categoria, Fluxo, Forma e Condição de Pagamento, Unidades e Índice têm \"+ Nova/Novo\" ao lado: o modal recusa descrição vazia com \"Descrição obrigatória\" e, ao cadastrar, já seleciona a opção e confirma num toast. O combobox criável (componente novo) também cria digitando.",
        "Financeiro: regra de remuneração, valor base, forma, condição, vencimento, exige NF, centro de custo, unidades (múltiplas), dados bancários de liquidação e critério de glosa.",
        "Vigência e reajuste: datas, tipo de prazo, índice, mês-base, regra de reajuste específica, aviso prévio, saneamento, Cláusula 7ª, equipamentos cedidos e origem judicial.",
        "Campos da categoria PJ Assistencial: Conselho de Classe Profissional = CRFa-3 9876, Carga Horária Semanal Alocada = 16h / semana e os demais do preset.",
      ],
    }),
    c({
      id: "contratos.novo-upload",
      title: "Novo contrato Corporativo (Fluxo Invertido)",
      route: ROTAS.novo,
      controls: { modalidade: "corporativo", estado: "inicial" },
      intent: "Contrato negociado fora: a governança incide sobre o documento enviado.",
      expected: [
        "Modalidade Corporativo (Upload Externo) marcada; no lugar da minuta, a área de upload \"Fluxo Invertido\" com a explicação e a nota de que a modalidade não gera cláusulas.",
        "Upload aceita PDF, DOC ou DOCX por clique ou arrasto e mostra nome e tamanho; outro tipo é recusado com o motivo, e acima de 25 MB com \"Arquivo excede o limite máximo permitido de 25 MB.\"",
        "O anexo é opcional (decisão pendente): salvar sem ele não dá erro.",
        "Categoria TI / Software / SaaS, parte FOR-0003 · Nuvem Clínica Sistemas, fluxo Despesa (Contratação); os seis campos da categoria (licenças, plano, SLA, renovação, aviso, hospedagem).",
      ],
    }),
    c({
      id: "contratos.novo-erros",
      title: "Novo contrato com erros",
      route: ROTAS.novo,
      controls: { modalidade: "adesao", estado: "erros" },
      intent: "Ver a validação depois de Salvar & Iniciar Elaboração.",
      expected: [
        "Resumo no topo \"Corrija 4 campos\" com links para cada um e \"Nada foi gravado e nenhum código foi consumido.\"",
        "Erros por campo: valor \"O valor não pode ser negativo.\", vencimento 35 \"O dia de vencimento deve estar entre 1 e 31.\", unidades \"Informe pelo menos uma unidade.\", fim 01/08/2026 \"A data de fim deve ser igual ou posterior à de início (01/09/2026).\"",
        "O índice das seções marca Financeiro (3) e Vigência e reajuste (1) em vermelho.",
        "Fim igual ao início é aceito. Corrigidos os campos, salvar mostra o resultado do CTR-2026-0011 em Elaboração.",
      ],
    }),
    c({
      id: "contratos.novo-codigo-duplicado",
      title: "Novo contrato com código legado duplicado",
      route: ROTAS.novo,
      controls: { modalidade: "adesao", estado: "duplicado" },
      intent: "Migração de um contrato antigo com um código que já existe.",
      expected: [
        "Código legado (Migração) marcado, selo Manual / Legado, código CTR-2026-0006.",
        "Erro no campo: \"O código de contrato 'CTR-2026-0006' já existe no sistema.\" e o resumo \"Corrija 1 campo\".",
      ],
    }),
    c({
      id: "contratos.novo-liminar",
      title: "Novo contrato Específico de origem judicial",
      route: ROTAS.novo,
      controls: { modalidade: "especifico", estado: "liminar" },
      intent: "Contrato que cumpre uma decisão liminar.",
      expected: [
        "Modalidade Específico (Aluguel/Bancos) com o upload; anexo decisao-liminar-renovacao.pdf (412 KB) já enviado.",
        "Parte CLI-0005 · Pedro Henrique Sales (Liminar), com selo Liminar: escolher a parte preencheu fluxo Receita (Atendimento), forma Depósito judicial, condição Conforme decisão e a origem judicial.",
        "Origem judicial Sim, com Nº do processo 0001234-56.2026.8.16.0001 e Vara 3ª Vara Cível de Curitiba (opcionais) e o aviso de que o checklist ganha o 4º item.",
        "Categoria Paciente Particular, sem campos extras (aviso discreto).",
      ],
    }),
    c({
      id: "contratos.novo-salvo",
      title: "Novo contrato salvo (resultado)",
      route: ROTAS.novo,
      controls: { modalidade: "adesao", estado: "salvo" },
      intent: "Ver o que o sistema grava em Salvar & Iniciar Elaboração.",
      expected: [
        "CTR-2026-0011 criado, selo Automático; resumo dos dados gravados.",
        "Estado inicial (RN-025): status Em Elaboração, workflow de aprovação Em Elaboração, assinatura Aguardando Aprovação Prévia, etapa 1. Elaboração, versão v1.0, checklist Pendente de Documentos.",
        "Versão v1.0, fase Elaboração Inicial, motivo Abertura do Contrato, minuta de origem MIN-PJA v2.1; workflow com a abertura Em Elaboração.",
        "Cláusulas gravadas (10) da MIN-PJA v2.1, obrigatórias, e Ver o texto abre a folha A4 com as tags resolvidas (datas 01/11/2026 a 31/10/2027, 12 (doze) meses).",
        "Checklist do dossiê com 3 itens DOS-CTR-2026-0011-01 a 03, Pendente Regularização (4 com origem liminar). Em Corporativo/Específico: \"Nenhuma cláusula gerada\".",
        "Atalhos: Voltar à carteira, Criar outro e Abrir a ficha (exemplo CTR-2026-0006), porque o protótipo não grava.",
      ],
    }),
    c({
      id: "contratos.novo-parte-rapida",
      title: "Cadastro rápido de parte",
      route: ROTAS.novo,
      controls: { modalidade: "adesao", estado: "vazio", parte: "rapido" },
      intent: "Cadastrar a contraparte sem sair do contrato que está sendo preenchido.",
      expected: [
        "Drawer \"Cadastro rápido de parte\" com o aviso: só os obrigatórios; documentos, dados bancários, endereço e contato se completam depois em Partes.",
        "Escolha Cliente (receita) ou Fornecedor & Pessoal (despesa), o subtipo/categoria, o código (Automático ou manual), nome/razão social e CNPJ/CPF.",
        "Só os obrigatórios da RN-063 do subtipo: CLT pede cargo e admissão; Operadora pede registro ANS, dia de corte e prazo de retorno; Particular PF pede paciente, responsável legal, CPF do responsável e parentesco; Liminar também processo e vara.",
        "Forma e condição de pagamento (ou recebimento); sem dados bancários, endereço nem situação: a parte nasce ativa e, se fornecedor, homologada.",
        "Cadastrar e selecionar fecha o drawer, seleciona a parte no contrato e avisa para completar o cadastro em Partes.",
      ],
    }),
  ],
};
