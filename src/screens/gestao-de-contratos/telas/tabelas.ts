import type { Feature } from "../../../app/features.js";
import { ContratosTabelas } from "../../ContratosTabelas.js";
import { ROTAS, papelControl } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = ["core.button-tabs", "core.card", "core.table", "core.input", "core.drawer-modal", "core.modal", "core.empty-state-card", "core.toast-wrapper"];
const c = cenario(COMPONENTS);

const LISTAS = [
  ["categoria", "Categoria"], ["fluxo", "Fluxo"], ["forma_pagamento", "Forma de pagamento"], ["condicao_pagamento", "Condição de pagamento"],
  ["indice", "Índice"], ["tipo_cobranca", "Tipo de cobrança"], ["natureza_dossie", "Natureza do dossiê"], ["tipo_aditivo", "Tipo de aditivo"],
  ["tipo_encerramento", "Tipo de encerramento"], ["unidade", "Unidade"],
] as const;
/** As categorias de `data.tabelas.categoria` (fixtures). */
const CATEGORIAS = [
  "PJ Assistencial", "CLT Trabalho", "Consultoria Projetos", "Locação Imobiliária", "Bancário / Financiamento",
  "Operadora Saúde", "Paciente Particular", "TI / Software / SaaS", "Serviços Terceirizados",
];

export const tabelas: Feature = {
  routes: [
    {
      path: ROTAS.tabelas,
      screen: ContratosTabelas,
      name: "Tabelas de Apoio e Campos",
      group: FLOW,
      description: "As dez listas dos formulários do módulo (ordem, código, descrição, status, uso) e os campos extras de cada categoria.",
      components: COMPONENTS,
      controls: [
        {
          id: "abertura",
          title: "Abertura da tela",
          controls: [
            { id: "area", label: "Área", options: [{ value: "tabelas", label: "Tabelas de apoio" }, { value: "campos", label: "Campos por categoria" }] },
            { id: "lista", label: "Tabela", description: "É assim que os links das outras telas abrem a lista já filtrada.", options: [{ value: "todas", label: "Mostrar Todas" }, ...LISTAS.map(([value, label]) => ({ value, label }))] },
            {
              id: "modal",
              label: "Modal",
              description: "Excluir em uso abre para a primeira opção em uso da tabela escolhida.",
              options: [{ value: "nenhum", label: "Nenhum" }, { value: "nova-opcao", label: "Nova opção" }, { value: "excluir-em-uso", label: "Excluir opção em uso" }],
            },
            { id: "categoria", label: "Categoria (campos)", options: CATEGORIAS.map((v) => ({ value: v, label: v })) },
          ],
        },
        papelControl("administrador"),
      ],
      expected: [
        "Um cartão só, com o button_tabs no topo: Tabelas de apoio e Campos por categoria.",
        "Tabelas: select Tabela com as dez listas (com a contagem de opções de cada uma) mais Mostrar Todas; escolher troca a lista; cada opção com ordem, código, descrição, status (switch) e \"em uso em N contratos\".",
        "Nova opção: tipo (lista), descrição obrigatória, código opcional (vazio = descrição em MAIÚSCULAS com \"_\"; repetido ganha sufixo _2) e ordem 10; nasce ativa, com toast.",
        "Adição rápida: só tipo e descrição; vazia é recusada com \"Descrição obrigatória\".",
        "Ativar e desativar sem sair da lista; excluir com confirmação. Opção em uso não se exclui: o modal avisa e oferece Desativar.",
        "Campos por categoria (só categorias ativas): rótulo, nome gerado do rótulo, tipo (texto, número, lista, data), opções (só lista) e ajuda; adicionar e remover; prévia no Novo Contrato ao lado, no mesmo cartão.",
        "Outros papéis: somente leitura, com aviso.",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.tabelas",
      title: "Tabelas de apoio",
      route: ROTAS.tabelas,
      intent: "O Administrador mantém as opções que aparecem nos formulários do módulo.",
      expected: [
        "Aba Tabelas de apoio aberta, dentro do cartão; etiquetas Mostrar Todas (60) e das dez tabelas, com Categoria (9) marcada e o botão Nova opção à direita.",
        "Categoria: 9 opções na ordem PJ Assistencial, CLT Trabalho, Consultoria Projetos, Locação Imobiliária, Bancário / Financiamento, Operadora Saúde, Paciente Particular, TI / Software / SaaS, Serviços Terceirizados; códigos PJ_ASSISTENCIAL, CLT_TRABALHO…; PJ Assistencial em uso em 4 contratos.",
        "Clicar noutra etiqueta mostra outra lista (Fluxo, Índice, Unidade…); Mostrar Todas junta as dez, com a coluna Lista.",
        "Adição rápida: escolher o tipo, digitar a descrição e Adicionar inclui a opção ativa, ordem 10; descrição vazia mostra \"Descrição obrigatória\".",
        "Switch ativa/desativa com toast; excluir opção sem uso pede confirmação; em uso abre o aviso de opção em uso.",
      ],
    }),
    c({
      id: "contratos.tabela-todas",
      title: "Mostrar Todas",
      route: ROTAS.tabelas,
      controls: { lista: "todas" },
      intent: "Ver as opções das dez listas de uma vez.",
      expected: [
        "Etiqueta Mostrar Todas marcada; a tabela ganha a coluna Lista e traz as opções agrupadas por lista, cada grupo pela ordem e descrição.",
        "Ativar/desativar e excluir continuam na visão Todas.",
      ],
    }),
    c({
      id: "contratos.tabela-filtrada",
      title: "Aberta por link: Índice",
      route: ROTAS.tabelas,
      controls: { lista: "indice" },
      intent: "Outra tela (ex.: Novo Contrato) leva para a lista de índices já filtrada.",
      expected: [
        "Etiqueta Índice (5) marcada: IPCA (IBGE), IGP-M (FGV), Dissídio CCT, INPC e Sem Reajuste / Fixo.",
        "A Adição rápida já vem com o tipo Índice.",
      ],
    }),
    c({
      id: "contratos.tabela-nova-opcao",
      title: "Nova opção",
      route: ROTAS.tabelas,
      controls: { lista: "forma_pagamento", modal: "nova-opcao" },
      intent: "Incluir uma forma de pagamento.",
      expected: [
        "Drawer Nova opção com Tipo (lista) = Forma de pagamento, Descrição, Código (opcional) e Ordem 10.",
        "Descrição \"Boleto Bancário\" sem código: o código BOLETO_BANCÁRIO é mostrado; com o código PIX digitado, a dica avisa que já existe e fica PIX_2.",
        "Descrição vazia: \"Descrição obrigatória\". Incluir mostra o toast e a opção nasce ativa.",
      ],
    }),
    c({
      id: "contratos.tabela-opcao-em-uso",
      title: "Excluir opção em uso",
      route: ROTAS.tabelas,
      controls: { lista: "categoria", modal: "excluir-em-uso" },
      intent: "Tentar excluir a categoria PJ Assistencial, que está em uso.",
      expected: [
        "Modal \"Opção em uso\": \"Usada em 4 contratos. Excluir quebraria esses contratos.\"",
        "Sugere desativar: some dos formulários e os contratos existentes continuam com ela.",
        "Botões Cancelar e Desativar (sem Excluir). Desativar fecha, troca o status para Inativo e mostra toast.",
      ],
    }),
    c({
      id: "contratos.campos-categoria",
      title: "Campos da categoria Locação Imobiliária",
      route: ROTAS.tabelas,
      controls: { area: "campos", categoria: "Locação Imobiliária" },
      intent: "Ver e ajustar os campos extras que o Novo Contrato de Locação pede.",
      expected: [
        "Aba Campos por categoria, no mesmo cartão, com Locação Imobiliária escolhida e a nota de categoria padrão (campos predefinidos).",
        "Seis campos com rótulo, nome e tipo: Valor IPTU Mensal (R$) (iptu_mensal, número), Valor Condomínio (R$) (número), Garantia Locatícia / Fiança (lista), Matrícula do Imóvel / Cartório, Destinação do Imóvel (lista) e Apólice de Seguro Incêndio, cada um com Remover.",
        "Novo campo: rótulo (com o nome gerado embaixo), tipo, opções (só para lista, mínimo 2) e ajuda, com erro por campo.",
        "Prévia no Novo Contrato ao lado, dentro do mesmo cartão; o campo em edição aparece marcado Novo.",
      ],
    }),
    c({
      id: "contratos.campos-sem-padrao",
      title: "Categoria sem campos extras",
      route: ROTAS.tabelas,
      controls: { area: "campos", categoria: "Paciente Particular" },
      intent: "Categoria ativa fora das 7 padrão: começa sem campos.",
      expected: [
        "Estado vazio \"Paciente Particular não tem campos extras\" e o formulário Novo campo; a prévia diz que a seção não aparece.",
      ],
    }),
  ],
};
