import { Icon } from "../Icon.js";

/**
 * Etiqueta, lista de etiquetas e ponto de situação — espelho de `tag/1`,
 * `tag_list/1` e `status_tag/1`.
 *
 * Duas coisas do original que valem ser ditas.
 *
 * A variante `blue` inverte o par das outras: onde as demais são fundo claro
 * com texto forte, ela é `bg-blue text-blue-light`. Não é engano meu na cópia —
 * está assim no arquivo, e é o único caso.
 *
 * E `status_tag/1` é **só um ponto colorido**, verde ou vermelho, sem texto
 * nenhum. O `title` é opcional. Quando ele não vem, a situação existe só na
 * cor — quem não distingue verde de vermelho não recebe a informação. Está
 * registrado no achado 103.
 */

export type TagVariant =
  | "light-blue"
  | "blue"
  | "cyan"
  | "purple"
  | "light-purple"
  | "red"
  | "orange"
  | "brand"
  | "green"
  | "yellow";

const VARIANTE: Record<TagVariant, string> = {
  "light-blue": "bg-[var(--color-blue-light)] text-[var(--color-blue)]",
  // O único invertido do conjunto: fundo forte, texto claro.
  blue: "bg-[var(--color-blue)] text-[var(--color-blue-light)]",
  cyan: "bg-[var(--color-cyan)] text-white",
  purple: "bg-[var(--color-purple)] text-white",
  "light-purple": "bg-[var(--color-purple-light)] text-[var(--color-purple)]",
  red: "bg-[var(--color-red-light)] text-[var(--color-red)]",
  orange: "bg-[var(--color-brand-orange)]/20 text-[var(--color-orange-dark)]",
  /**
   * A única variante com opacidade divergente do original.
   *
   * `tag/1` traz `bg-brand-purple-dark/20 text-brand-purple-dark/80` — a única do
   * conjunto construída por opacidade em vez de dois tokens. Aqui ela usa **8% no
   * fundo e o texto cheio**, que é o par do `tint`/`brand` do `Button`. A etiqueta
   * neutra e o botão neutro aparecem lado a lado no mesmo cartão — "Padrão" ao
   * lado de "Editar" —, e dois cinzas do mesmo token em opacidades diferentes
   * leem como dois tons por engano, não como hierarquia.
   *
   * De passagem, o contraste sobe: o texto cheio sobre o fundo de 8% dá 12,07:1,
   * contra 5,08:1 do par original. É a decisão 0001 na direção de sempre.
   */
  brand: "bg-[var(--color-brand-purple-dark)]/8 text-[var(--color-brand-purple-dark)]",
  green: "bg-[var(--color-brand-green)]/20 text-[var(--color-brand-green-dark)]",
  yellow: "bg-[var(--color-yellow)]/20 text-[var(--color-yellow-dark)]",
};

export function Tag({
  item,
  variant = "light-blue",
  icon,
  title,
  className,
}: {
  item: string;
  variant?: TagVariant;
  /**
   * O ícone vem **antes** do texto, sempre, e no peso `regular`.
   *
   * Nos dois pontos é divergência deliberada de `tag/1`, decidida pelo design:
   *
   * - **Posição.** No HEEx o `<.icon>` vem literalmente depois do `<%= @item %>`,
   *   e não há como pedir o contrário. O ícone de uma etiqueta qualifica o
   *   rótulo — o cadeado diz que "Padrão" não se escolhe, o triângulo diz que o
   *   "13" é pendência —, e qualificador depois do substantivo é lido por último.
   * - **Peso.** `regular`, o padrão de `CoreComponents.icon/1`. O que existia era
   *   um par desencontrado: o cadeado de "Padrão" em `solid`, o triângulo de
   *   pendência em `regular`, um de cada lado do texto.
   *
   * Não é opção configurável de propósito. Uma etiqueta com o ícone de um lado e
   * outra com o de outro é exatamente o que esta padronização existe para acabar,
   * e um parâmetro com dois valores é um convite a reabrir a divergência.
   *
   * Um nome com o estilo embutido — `"fa-solid fa-circle-check"` — continua
   * mandando, porque `Icon` respeita o estilo que já veio no nome. É como o
   * monólito escreve alguns ícones, e este componente não reescreve o nome que
   * recebe.
   */
  icon?: string;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={["rounded px-1.5 py-0.5 text-sm font-semibold", VARIANTE[variant], className]
        .filter(Boolean)
        .join(" ")}
    >
      {/* O espaço separa o ícone do texto. No HEEX ele vem da quebra de linha
          entre as duas tags, que o HTML colapsa em espaço; em JSX a quebra
          desaparece, e sem isto a etiqueta sai colada — "⚠13". */}
      {icon && <><Icon name={icon} /> </>}
      {item}
    </span>
  );
}

/**
 * Lista com transbordo: acima do limite, o excedente vira `+N` e os nomes ficam
 * no `title`.
 */
export function TagList({
  items,
  limit = 0,
  variant = "light-blue",
  className,
}: {
  items: string[];
  limit?: number;
  variant?: TagVariant;
  className?: string;
}) {
  const visiveis = limit > 0 ? items.slice(0, limit) : items;
  const escondidos = limit > 0 ? items.slice(limit) : [];

  return (
    <div className={["flex gap-1.5", className].filter(Boolean).join(" ")}>
      {visiveis.map((item) => (
        <Tag key={item} item={item} variant={variant} />
      ))}
      {escondidos.length > 0 && (
        <Tag item={`+${escondidos.length}`} title={escondidos.join(", ")} variant={variant} />
      )}
    </div>
  );
}

/**
 * Ponto de situação: verde ou vermelho, sem texto.
 *
 * O `title` é a única saída para quem não lê a cor, e ele é opcional no
 * original — ver achado 103.
 */
export function StatusTag({
  status,
  title,
  className,
}: {
  status: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={[
        "inline-block h-2.5 w-2.5 rounded-full",
        status ? "bg-[var(--color-green)]" : "bg-[var(--color-red)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
