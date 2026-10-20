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
const CATEGORIAS = ["PJ Assistencial", "CLT", "Operadora", "Particular", "Locação", "Tecnologia", "Serviços"];

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
            { id: "lista", label: "Tabela", options: LISTAS.map(([value, label]) => ({ value, label })) },
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
        "Tabelas: as dez listas em etiquetas (com a contagem de opções de cada uma), um clique troca a lista; cada opção com ordem, código, descrição, status (switch) e \"em uso em N contratos\".",
        "Nova opção com descrição obrigatória e ordem padrão 10; ativar e desativar; excluir com confirmação. Opção em uso não se exclui: o modal avisa e oferece Desativar.",
        "Campos por categoria: rótulo, tipo (texto, número, lista, data), opções (só lista) e ajuda; adicionar e remover; prévia no Novo Contrato ao lado, no mesmo cartão.",
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
        "Aba Tabelas de apoio aberta, dentro do cartão; etiquetas das dez tabelas com Categoria (8) marcada e o botão Nova opção à direita.",
        "Categoria: 8 opções na ordem (PJ Assistencial, CLT, Operadora, Particular, Locação, Tecnologia, Serviços, Consultoria); Consultoria inativa e sem uso; PJ Assistencial em uso em 4 contratos.",
        "Clicar noutra etiqueta mostra outra lista (Fluxo, Índice, Unidade…).",
        "Switch ativa/desativa com toast; Nova opção abre o drawer com ordem 10 e descrição obrigatória (erro no campo se vazia ou repetida).",
        "Excluir opção sem uso pede confirmação; em uso abre o aviso de opção em uso.",
      ],
    }),
    c({
      id: "contratos.tabela-opcao-em-uso",
      title: "Excluir opção em uso",
      route: ROTAS.tabelas,
      controls: { lista: "categoria", modal: "excluir-em-uso" },
      intent: "Tentar excluir a categoria PJ Assistencial, que está em uso.",
      expected: [
        "Drawer \"Opção em uso\": \"Usada em 4 contratos. Excluir quebraria esses contratos.\"",
        "Sugere desativar: some dos formulários e os contratos existentes continuam com ela.",
        "Botões Cancelar e Desativar (sem Excluir). Desativar fecha, troca o status para Inativo e mostra toast.",
      ],
    }),
    c({
      id: "contratos.campos-categoria",
      title: "Campos da categoria Locação",
      route: ROTAS.tabelas,
      controls: { area: "campos", categoria: "Locação" },
      intent: "Ver e ajustar os campos extras que o Novo Contrato de Locação pede.",
      expected: [
        "Aba Campos por categoria, no mesmo cartão, com Locação escolhida.",
        "Campos IPTU (texto, ajuda \"Valor mensal ou anual e quem paga.\"), Condomínio (texto) e Garantia (lista: Caução, Fiador, Seguro-fiança, Sem garantia), cada um com Remover.",
        "Novo campo: rótulo, tipo, opções (só para lista, mínimo 2) e ajuda, com erro por campo.",
        "Prévia no Novo Contrato ao lado, dentro do mesmo cartão, com os três campos; o campo em edição aparece marcado Novo.",
      ],
    }),
  ],
};
