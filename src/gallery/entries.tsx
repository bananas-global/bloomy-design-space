import type { ReactNode } from "react";
import { Button } from "../components/bloomy/Button.js";

/**
 * Índice dos componentes do sistema.
 *
 * Os **47** componentes de `lib/bloomy_web/components/core_components.ex`, na
 * ordem em que aparecem lá. Cada entrada carrega o arquivo e a linha de origem,
 * conferidos pelo mesmo script que valida as citações do log.
 *
 * Os pendentes ficam na lista de propósito, como os itens de menu ainda não
 * portados: um índice que só mostra o que já existe não serve para planejar.
 */

export type GalleryEntry = {
  /** Nome da função no monólito. */
  name: string;
  origem: string;
  /** O que ele resolve, em uma frase, para quem não vai ler o código. */
  descricao: string;
  /** Demonstrações, quando portado. */
  demos?: { titulo: string; nota?: string; render: () => ReactNode }[];
};

const CORES = ["blue", "red", "green", "purple", "yellow"] as const;
const VARIANTES = ["default", "outline", "tint", "ghost"] as const;
const TAMANHOS = ["small", "medium", "normal"] as const;

export const GALLERY: GalleryEntry[] = [
  {
    name: "button",
    origem: "lib/bloomy_web/components/core_components.ex:457",
    descricao: "O botão de ação. Quatro variantes, cinco cores, três tamanhos.",
    demos: [
      {
        titulo: "As quatro variantes, nas cinco cores",
        nota: "Sessenta combinações ao todo; aqui no tamanho normal.",
        render: () => (
          <div className="space-y-3">
            {VARIANTES.map((variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-2">
                <span className="w-16 shrink-0 text-[0.75rem] font-black uppercase tracking-wide text-[var(--fg-3)]">
                  {variant}
                </span>
                {CORES.map((color) => (
                  <Button key={color} variant={variant} color={color}>
                    Salvar
                  </Button>
                ))}
              </div>
            ))}
          </div>
        ),
      },
      {
        titulo: "Os três tamanhos",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            {TAMANHOS.map((size) => (
              <Button key={size} size={size}>
                {size}
              </Button>
            ))}
          </div>
        ),
      },
      {
        titulo: "Com ícone e com aviso",
        nota: "`left_icon`, `right_icon` e `notification_badge` do original.",
        render: () => (
          <div className="flex flex-wrap items-center gap-3">
            <Button leftIcon="fa-plus">Novo agendamento</Button>
            <Button rightIcon="fa-arrow-right" variant="outline">
              Avançar
            </Button>
            <Button notificationBadge variant="tint" color="purple">
              Pendências
            </Button>
            <Button disabled>Desabilitado</Button>
          </div>
        ),
      },
    ],
  },
  { name: "modal", origem: "lib/bloomy_web/components/core_components.ex:66", descricao: "Diálogo sobreposto, com foco preso e fechamento por Esc." },
  { name: "drawer_modal", origem: "lib/bloomy_web/components/core_components.ex:182", descricao: "Painel que entra pela lateral, para formulários longos." },
  { name: "modal_content", origem: "lib/bloomy_web/components/core_components.ex:286", descricao: "O miolo do diálogo, separado para reuso." },
  { name: "flash", origem: "lib/bloomy_web/components/core_components.ex:321", descricao: "Aviso temporário de resultado de ação." },
  { name: "flash_group", origem: "lib/bloomy_web/components/core_components.ex:360", descricao: "A pilha de avisos temporários da página." },
  { name: "simple_form", origem: "lib/bloomy_web/components/core_components.ex:416", descricao: "Formulário com espaçamento e ações padronizados." },
  { name: "link_button", origem: "lib/bloomy_web/components/core_components.ex:523", descricao: "Link com aparência de botão, para navegação." },
  { name: "copy_button", origem: "lib/bloomy_web/components/core_components.ex:570", descricao: "Botão que copia um valor para a área de transferência." },
  { name: "input", origem: "lib/bloomy_web/components/core_components.ex:1148", descricao: "O campo de formulário, com vinte tipos num componente só." },
  { name: "input_with_select", origem: "lib/bloomy_web/components/core_components.ex:1217", descricao: "Campo com seletor acoplado, para valor com unidade." },
  { name: "checkgroup", origem: "lib/bloomy_web/components/core_components.ex:1253", descricao: "Grupo de caixas de seleção com rótulo comum." },
  { name: "fake_input", origem: "lib/bloomy_web/components/core_components.ex:1269", descricao: "Campo somente-leitura com aparência de campo." },
  { name: "input_switch_card", origem: "lib/bloomy_web/components/core_components.ex:1301", descricao: "Cartão com chave liga-desliga e descrição." },
  { name: "fake_radio_group", origem: "lib/bloomy_web/components/core_components.ex:1332", descricao: "Grupo de opções não editável, para exibição." },
  { name: "radio_group", origem: "lib/bloomy_web/components/core_components.ex:1379", descricao: "Escolha única entre opções, navegável por setas." },
  { name: "radio_selector", origem: "lib/bloomy_web/components/core_components.ex:1429", descricao: "Escolha única em formato de cartões clicáveis." },
  { name: "checkbox_group", origem: "lib/bloomy_web/components/core_components.ex:1493", descricao: "Escolha múltipla em grupo." },
  { name: "label", origem: "lib/bloomy_web/components/core_components.ex:1536", descricao: "Rótulo de campo." },
  { name: "error", origem: "lib/bloomy_web/components/core_components.ex:1559", descricao: "Mensagem de erro de campo." },
  { name: "header", origem: "lib/bloomy_web/components/core_components.ex:1583", descricao: "Cabeçalho de seção, com título e ações." },
  { name: "table", origem: "lib/bloomy_web/components/core_components.ex:1638", descricao: "Tabela de listagem, com colunas e ações por linha." },
  { name: "simple_table", origem: "lib/bloomy_web/components/core_components.ex:1703", descricao: "Tabela sem ações, para leitura." },
  { name: "list", origem: "lib/bloomy_web/components/core_components.ex:1740", descricao: "Lista de descrição, termo e valor." },
  { name: "back", origem: "lib/bloomy_web/components/core_components.ex:1763", descricao: "Link de voltar." },
  { name: "card", origem: "lib/bloomy_web/components/core_components.ex:1792", descricao: "Cartão de conteúdo." },
  { name: "info_card", origem: "lib/bloomy_web/components/core_components.ex:1830", descricao: "Cartão de destaque com ícone e número." },
  { name: "inside_card", origem: "lib/bloomy_web/components/core_components.ex:1870", descricao: "Cartão aninhado, sem sombra própria." },
  { name: "dropdown", origem: "lib/bloomy_web/components/core_components.ex:2030", descricao: "Menu suspenso ancorado num gatilho." },
  { name: "dropdown_menu", origem: "lib/bloomy_web/components/core_components.ex:2054", descricao: "A lista de itens do menu suspenso." },
  { name: "meta_info", origem: "lib/bloomy_web/components/core_components.ex:2090", descricao: "Par de rótulo e valor, para metadados." },
  { name: "image_upload", origem: "lib/bloomy_web/components/core_components.ex:2114", descricao: "Envio de imagem com pré-visualização." },
  { name: "avatar", origem: "lib/bloomy_web/components/core_components.ex:2163", descricao: "Foto ou iniciais de uma pessoa." },
  { name: "progress", origem: "lib/bloomy_web/components/core_components.ex:2201", descricao: "Barra de progresso." },
  { name: "tag", origem: "lib/bloomy_web/components/core_components.ex:2237", descricao: "Etiqueta de categoria." },
  { name: "tag_list", origem: "lib/bloomy_web/components/core_components.ex:2271", descricao: "Conjunto de etiquetas, com transbordo." },
  { name: "status_tag", origem: "lib/bloomy_web/components/core_components.ex:2302", descricao: "Etiqueta de situação, com cor por estado." },
  { name: "empty_state_card", origem: "lib/bloomy_web/components/core_components.ex:2322", descricao: "Cartão de lista vazia." },
  { name: "range_datepicker", origem: "lib/bloomy_web/components/core_components.ex:2348", descricao: "Seleção de intervalo de datas." },
  { name: "range_monthpicker", origem: "lib/bloomy_web/components/core_components.ex:2394", descricao: "Seleção de intervalo de meses." },
  { name: "monthpicker", origem: "lib/bloomy_web/components/core_components.ex:2420", descricao: "Seleção de um mês." },
  { name: "week_selector", origem: "lib/bloomy_web/components/core_components.ex:2450", descricao: "Navegação por semana." },
  { name: "tooltip", origem: "lib/bloomy_web/components/core_components.ex:2498", descricao: "Dica de contexto ancorada num elemento." },
  { name: "timeline_list", origem: "lib/bloomy_web/components/core_components.ex:2528", descricao: "Linha do tempo de eventos." },
  { name: "loading_card", origem: "lib/bloomy_web/components/core_components.ex:2550", descricao: "Cartão de carregamento." },
  { name: "switch_card", origem: "lib/bloomy_web/components/core_components.ex:2570", descricao: "Cartão com chave liga-desliga." },
  { name: "date_navigator", origem: "lib/bloomy_web/components/core_components.ex:2603", descricao: "Navegação por dia, com setas e calendário." },
];

export const portados = () => GALLERY.filter((e) => e.demos !== undefined);
export const pendentes = () => GALLERY.filter((e) => e.demos === undefined);
