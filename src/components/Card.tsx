import type { ReactNode } from "react";
import { Icon } from "./Icon.js";

/**
 * Cartão, cartão de destaque e cartão aninhado — espelho de `card/1`,
 * `info_card/1` e `inside_card/1`.
 *
 * ```elixir
 * <div class={["rounded-2xl #{@bg_class} p-6 shadow-main flex-col md:flex-row gap-4", @class]}>
 * ```
 *
 * O `bg_class` vem de `extract_bg_class/1`: o cartão é branco **a menos que**
 * quem o usa já tenha passado uma classe de fundo. É uma regra pequena e vale
 * portar em vez de simplificar, porque ela é o que permite os cartões coloridos
 * do produto sem uma propriedade a mais.
 */

/**
 * Reproduz `extract_bg_class/1`: sem `bg-*` na classe, o cartão é branco.
 *
 * ```elixir
 * if String.match?(class, ~r/\bbg-[a-z0-9_-]+(?:\/[0-9]+)?\b/), do: "", else: "bg-white"
 * ```
 *
 * **A regex do original não alcança o vocabulário deste repositório.** Lá as
 * cores são utilitários de tema — `bg-brand-blue/10` —, e a classe casa. Aqui
 * elas são valores arbitrários sobre variável CSS — `bg-[var(--color-brand-blue)]/10`,
 * 111 ocorrências —, e o colchete faz a regex falhar: o cartão recebia
 * `bg-white` **junto** com o fundo que quem chamou pediu, e o branco ganhava.
 *
 * O segundo ramo estende a regex a essa forma. Não é mudança de comportamento —
 * é a mesma pergunta do original ("quem chamou já deu um fundo?") feita sobre as
 * classes que existem aqui. Sem ele, todo cartão colorido desta pasta sai branco
 * sem erro nenhum para investigar, que foi como este apareceu.
 */
function fundoPadrao(className: string | undefined): string {
  if (!className) return "bg-white";
  const doOriginal = /\bbg-[a-z0-9_-]+(?:\/[0-9]+)?\b/;
  const arbitrario = /\bbg-\[[^\]]+\](?:\/[0-9]+)?/;
  return doOriginal.test(className) || arbitrario.test(className) ? "" : "bg-white";
}

export function Card({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className={[
        /* `@max-phone:p-4` é extensão sobre o original, que tem `p-6` fixo.
           24px de recuo em cada lado num palco de 375px deixam 295px de cartão
           e 247px de conteúdo — e o cartão da fila põe ali nome, etiqueta, duas
           linhas de meta, a frase entre aspas e três botões. Sobra recuo e
           falta linha. 16px devolvem 16px de conteúdo por cartão, e é a mesma
           escala do sistema, não um valor novo.

           Vale para todo `card/1` do repositório — é o cartão da área, e o
           aperto é o mesmo em qualquer tela de telefone. Registrado na decisão
           0017. */
        "rounded-2xl p-6 @max-phone:p-4 shadow-[var(--shadow-main)] flex-col md:flex-row gap-4",
        fundoPadrao(className),
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export type InfoCardVariant = "blue" | "orange" | "accent" | "green" | "info";

const INFO: Record<InfoCardVariant, { fundo: string; texto: string }> = {
  blue: { fundo: "bg-[var(--color-brand-blue)]/20", texto: "text-[var(--color-brand-blue-dark)]" },
  orange: {
    fundo: "bg-[var(--color-brand-orange)]/20",
    texto: "text-[var(--color-brand-orange-dark)]",
  },
  accent: {
    fundo: "bg-[var(--color-brand-accent)]/20",
    texto: "text-[var(--color-brand-accent-dark)]",
  },
  green: { fundo: "bg-[var(--color-brand-green)]/20", texto: "text-[var(--color-brand-green-dark)]" },
  info: { fundo: "bg-[var(--color-brand-info)]/20", texto: "text-[var(--color-brand-info-dark)]" },
};

/**
 * Cartão de destaque: ícone, número e rótulo.
 *
 * Sem `info`, o original mostra uma barra pulsando no lugar do número — estado
 * de carregamento embutido no componente, e não uma tela separada. Portado
 * assim de propósito: é o que a pessoa vê enquanto o painel carrega.
 */
export function InfoCard({
  title,
  info,
  variant,
  icon,
}: {
  title: string;
  info?: string;
  variant: InfoCardVariant;
  icon: string;
}) {
  const { fundo, texto } = INFO[variant];

  return (
    /* No telefone o ícone sobe e o texto desce.

       Lado a lado, a caixa de 32px mais o `gap-4` levam 48px dos 247px de
       conteúdo de um cartão de telefone, e sobram 199 para o número e o
       rótulo. "precisam de atenção" não cabe em uma linha nesse espaço e
       quebra em três, e os quatro números do dia — que ficam em duas colunas —
       saem de alturas diferentes. Empilhado, o rótulo tem a largura inteira.

       `items-start` porque a coluna alinha pela esquerda, e `gap-2` porque
       vertical não pede o mesmo respiro que horizontal. Extensão sobre
       `info_card/1`, que é uma linha só — decisão 0017. */
    <div className="flex items-center gap-4 @max-phone:flex-col @max-phone:items-start @max-phone:gap-2">
      {/* `shrink-0`: a caixa do ícone é item de flex, e sem isto ela cedia
          largura para o número e o rótulo do lado. Media 32 de altura por 17,
          22 ou 25 de largura — quadrado no código, retângulo na tela, e o
          quanto variava com o tamanho do rótulo. Aparecia em qualquer lugar
          apertado: quatro `info_card/1` em duas colunas num telefone, por
          exemplo. */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${fundo}`}>
        <Icon name={icon} type="solid" className={texto} />
      </div>

      <div>
        {info ? (
          <p className={`m-0 text-xl/4 font-extrabold ${texto}`}>{info}</p>
        ) : (
          <div className="mb-1 h-4 w-16 animate-pulse rounded bg-[var(--color-brand-purple-dark)]/20" />
        )}
        <p className="m-0 text-sm text-[var(--color-brand-purple-dark)]">{title}</p>
      </div>
    </div>
  );
}
