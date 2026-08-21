import type { ReactNode } from "react";

/**
 * Tabela e tabela simples — espelho de `table/1`, `simple_table/1` e
 * `table_class/1`.
 *
 * O invólucro carrega o estilo inteiro em seletores descendentes: cabeçalho com
 * fundo `brand-blue/20`, divisórias em `brand-purple-dark/10`, células com
 * `text-brand-purple-dark/80`. Portado como está, num lugar só, para que as duas
 * tabelas continuem iguais como são lá.
 *
 * **A linha de vazio é a parte que mais ensina.** No original ela existe sempre,
 * escondida, e só aparece quando é a primeira do corpo:
 *
 * ```heex
 * <tr class="hidden first:table-row">
 *   <td colspan={length(@col)}>Nenhum dado encontrado para a pesquisa</td>
 * </tr>
 * ```
 *
 * É CSS resolvendo o estado vazio, sem condicional no servidor. Aqui a mesma
 * coisa: a linha é renderizada sempre, com as mesmas classes, e quem decide se
 * ela aparece é o navegador.
 */

const CLASSE_TABELA = [
  "w-full rounded-lg border border-[var(--color-brand-purple-dark)]/10 overflow-y-auto overflow-x-auto",
  "[&_table]:w-full [&_table]:border-collapse [&_table]:rounded-lg",
  "[&_thead]:border-b [&_thead]:border-[var(--color-brand-purple-dark)]/10",
  "[&_thead_th]:bg-[var(--color-brand-blue)]/20 [&_thead_th]:px-3 [&_thead_th]:py-4 [&_thead_th]:text-left [&_thead_th]:text-[var(--color-brand-purple-dark)]",
  "[&_tbody]:relative [&_tbody]:divide-y [&_tbody]:divide-[var(--color-brand-purple-dark)]/10 [&_tbody]:border-t [&_tbody]:border-[var(--color-brand-purple-dark)]/10",
  // `color-mix` no lugar de `/5`: a cor pintada é a mesma sobre o branco do
  // cartão, e opaca ela não deixa passar a coluna que rola por baixo da coluna
  // fixa. Ver decisão 0015.
  "[&_tbody_tr]:group [&_tbody_tr]:hover:bg-[color-mix(in_srgb,var(--color-brand-purple-dark)_5%,var(--color-white))]",
  "[&_tbody_tr_td]:relative [&_tbody_tr_td]:px-3 [&_tbody_tr_td]:py-4 [&_tbody_tr_td]:text-left [&_tbody_tr_td]:text-[var(--color-brand-purple-dark)]/80",
].join(" ");

export const MENSAGEM_VAZIO = "Nenhum dado encontrado para a pesquisa";

/**
 * Classes da coluna fixa na rolagem horizontal.
 *
 * **Extensão sobre `table/1`**, registrada na decisão 0015. O original não tem
 * coluna fixa porque nenhuma tabela dele passa de sete colunas; a matriz de
 * documentação por categoria chega a onze, e sem o nome ancorado a pessoa rola
 * até a coluna certa e já não sabe de quem é a linha.
 *
 * O fundo é obrigatório e precisa ser **opaco**: `position: sticky` não cria
 * contexto de pintura, e uma célula translúcida deixa passar a coluna que rola
 * por baixo. Ele vem por herança do `tr`, que é quem sabe se a linha está
 * destacada — por isso o `tr` sempre tem fundo declarado.
 */
// `sticky!` e não `sticky`: o invólucro declara `[&_tbody_tr_td]:relative`, que
// é seletor descendente e ganha de uma utilidade solta na célula. Sem a
// importância, a célula continua `relative` e a coluna rola junto com o resto.
const COLUNA_FIXA = "sticky! left-0 z-10 bg-inherit";

/** Fundo padrão do `tr`, para a coluna fixa ter o que herdar. */
const LINHA_PADRAO = "bg-[var(--color-white)]";

/**
 * O azul do cabeçalho, já achatado sobre o branco.
 *
 * O invólucro pinta `th` com `bg-brand-blue/20`, que é translúcido — e célula
 * translúcida fixa deixa passar a coluna que rola por baixo. `color-mix` deriva
 * a mesma cor opaca do mesmo token, em vez de repetir um hexadecimal que
 * silenciosamente descolaria se o token mudasse.
 */
// A importância aqui é pelo mesmo motivo do `sticky!` abaixo: o invólucro pinta
// `[&_thead_th]:bg-brand-blue/20` por seletor descendente, e sem o `!` o
// cabeçalho fixo continua translúcido — a coluna que rola passa por dentro dele.
const CABECALHO_FIXO =
  "sticky left-0 z-20 bg-[color-mix(in_srgb,var(--color-brand-blue)_20%,var(--color-white))]!";

export type Coluna<T> = {
  /**
   * Rótulo do cabeçalho. Aceita nó para o cabeçalho de duas linhas da matriz —
   * o HEEx aceita só string, ver decisão 0015.
   */
  label: ReactNode;
  /** Chave e identidade da coluna. Obrigatório quando `label` não é texto. */
  id?: string;
  className?: string;
  /** Mantém a coluna visível na rolagem horizontal. Extensão. */
  sticky?: boolean;
  render: (linha: T) => ReactNode;
};

/** Chave estável da coluna: `id` quando existe, o rótulo quando ele é texto. */
function chaveDaColuna<T>(col: Coluna<T>, indice: number): string {
  return col.id ?? (typeof col.label === "string" ? col.label : `col-${indice}`);
}

/**
 * O clique na linha não engole o clique no controle que está dentro dela.
 *
 * `row_click` no original é `phx-click` em cada célula, e uma célula com link ou
 * botão dispara os dois. Aqui o controle ganha: quem clicou num link quis o
 * destino do link, não o da linha — e quando os dois destinos coincidem, deixar
 * passar produz duas navegações para o mesmo lugar.
 */
function dentroDeControle(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof Element)) return false;
  return Boolean(alvo.closest("a,button,input,select,textarea,label,[role='button']"));
}

export function Table<T>({
  id,
  rows,
  rowId,
  rowClassName,
  cols,
  actions,
  onRowClick,
  className,
}: {
  id?: string;
  rows: T[];
  rowId?: (linha: T) => string;
  /**
   * Classe por linha. Extensão da decisão 0015: é ela que carrega o destaque de
   * quem está em inativação. O original não tem estado de linha nenhum.
   */
  rowClassName?: (linha: T) => string | undefined;
  cols: Coluna<T>[];
  actions?: (linha: T) => ReactNode;
  onRowClick?: (linha: T) => void;
  className?: string;
}) {
  return (
    <div className={[CLASSE_TABELA, className].filter(Boolean).join(" ")}>
      <table>
        <thead>
          <tr>
            {cols.map((col, indice) => (
              <th
                key={chaveDaColuna(col, indice)}
                className={[col.sticky && CABECALHO_FIXO, col.className]
                  .filter(Boolean)
                  .join(" ")}
              >
                {col.label}
              </th>
            ))}
            {actions && (
              <th className="relative p-0 pb-4">
                <span className="sr-only">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody id={id}>
          {rows.map((linha, i) => (
            <tr
              key={rowId?.(linha) ?? i}
              id={rowId?.(linha)}
              // Um ou o outro, nunca os dois: duas classes de fundo no mesmo
              // elemento empatam em especificidade e quem ganha passa a ser a
              // ordem no CSS gerado.
              className={rowClassName?.(linha) ?? LINHA_PADRAO}
            >
              {cols.map((col, indice) => (
                <td
                  key={chaveDaColuna(col, indice)}
                  onClick={
                    onRowClick
                      ? (evento) => {
                          if (dentroDeControle(evento.target)) return;
                          onRowClick(linha);
                        }
                      : undefined
                  }
                  className={[
                    onRowClick && "hover:cursor-pointer",
                    col.sticky && COLUNA_FIXA,
                    col.className,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {col.render(linha)}
                </td>
              ))}
              {actions && (
                // `p-0!`, e não `p-0` como no original: o `p-0` de lá perde para
                // o `[&_tbody_tr_td]:py-4` do invólucro, que é seletor
                // descendente e tem especificidade maior. Com os dois paddings
                // valendo, a coluna de ação empilha 16px do `td` mais 16px do
                // `div` de dentro em cima e embaixo, e é ela que define a altura
                // da linha inteira. Correção intencional: a intenção do original
                // é padding zero no `td`.
                <td className="relative w-14 p-0!">
                  {/* `flex justify-end` no lugar de `text-right`: o original
                      alinha texto, e texto numa caixa de linha com `leading-6`
                      soma o vão da linha à altura de qualquer controle que não
                      seja texto. Com botão na ação, esse vão virava 24px de
                      altura por linha da tabela. O resultado visual é o mesmo
                      para o conteúdo que o original coloca aqui.

                      `pr-3` é divergência, e vem do mesmo motivo. O original não
                      tem vão à direita — `p-0` no `td` e nada no `div` —, e com
                      as ações de texto de lá o resultado é aceitável. Com botão,
                      a pastilha encosta na borda da tabela: ela tem fundo, e o
                      fundo que toca a borda parece corte, não alinhamento. Os
                      12px são os mesmos `px-3` das outras células, então a ação
                      passa a alinhar com o conteúdo das colunas. */}
                  <div className="relative flex justify-end whitespace-nowrap py-4 pr-3">
                    <span className="relative ml-4 font-semibold leading-6 text-[var(--color-brand-purple-dark)]/80 hover:text-[var(--color-brand-purple-dark)]">
                      {actions(linha)}
                    </span>
                  </div>
                </td>
              )}
            </tr>
          ))}

          {/* Sempre renderizada, escondida por padrão: `first:table-row` a
              revela só quando ela é a primeira linha do corpo — ou seja, quando
              não há dado nenhum. */}
          <tr className="hidden first:table-row">
            <td
              colSpan={cols.length + (actions ? 1 : 0)}
              className="px-3 py-4 text-center! text-[var(--color-brand-purple-dark)]/40"
            >
              {MENSAGEM_VAZIO}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Tabela simples: `emptyMessage` existe no HEEx, mas é intencionalmente inerte. */
export function SimpleTable({
  children,
  className,
  emptyMessage = MENSAGEM_VAZIO,
}: {
  children: ReactNode;
  className?: string;
  emptyMessage?: string;
}) {
  void emptyMessage;
  return (
    <div className={[CLASSE_TABELA, className].filter(Boolean).join(" ")}>
      <table>{children}</table>
    </div>
  );
}
