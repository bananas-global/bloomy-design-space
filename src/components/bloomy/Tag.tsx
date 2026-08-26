import { Icon } from "../Icon.js";

/**
 * Etiqueta, lista de etiquetas e ponto de situação — espelho de `tag/1`,
 * `tag_list/1` e `status_tag/1`.
 *
 * Três coisas que valem ser ditas.
 *
 * A variante `blue` inverte o par das outras: onde as demais são fundo claro
 * com texto forte, ela é `bg-blue text-blue-light`. Não é engano meu na cópia —
 * está assim no arquivo, e é o único caso. As cinco `solid-*` são extensão
 * daqui: a mesma inversão para as cores de sinal que o original não tem.
 *
 * **O fundo é o do produto; o texto foi escurecido.** Das dez variantes do
 * original, oito reprovavam AA — a etiqueta é 14px em negrito, e `light-blue`
 * ficava em 2,14:1. Aqui cada variante de sinal mantém o fundo do `tag/1` e troca
 * o texto pelo tom escuro da mesma família, que é a decisão 0001 aplicada onde a
 * decisão 0016 tinha apontado: escurecer o token em vez de escolher variante por
 * variante, ou pintar cada tela com uma régua diferente.
 *
 * Para o laranja e o amarelo o `-dark` da própria família não basta — param em
 * 2,93 e 2,05 —, e os dois usam `--color-warn-fg`. Não é invenção: `tokens.css`
 * já carrega o valor corrigido dessas duas famílias no par de chip, com a nota
 * "laranja e amarelo foram escurecidos".
 *
 * **Sem borda, como no original.** As variantes claras chegaram a ganhar um fio de
 * 1px, porque em cima da linha da coluna da Supervisão — que era o navy a 10% — o
 * selo separava 1,05:1 do fundo. O que resolveu de verdade foi tirar o
 * preenchimento da linha: contra o branco o selo separa sozinho, e o fio virou
 * contorno de um problema que não existe mais. Fica registrado porque a medida
 * vale de novo no dia em que alguém puser um selo destes em cima de uma faixa
 * tingida.
 *
 * E `status_tag/1` é **só um ponto colorido**, verde ou vermelho, sem texto
 * nenhum. O `title` é opcional. Quando ele não vem, a situação existe só na
 * cor — quem não distingue verde de vermelho não recebe a informação. Está
 * registrado no achado 103.
 */

/**
 * As dez do original, mais quatro invertidas — extensão da decisão 0015.
 *
 * O original só tem **uma** etiqueta de fundo forte com texto claro: `blue`. As
 * outras nove são fundo claro com texto forte, e três delas — `cyan`, `purple`,
 * `brand` — já são fundo cheio com texto branco. Faltava a inversão das cores de
 * sinal, que é o que faz um número de fila ser visto de longe sem depender de a
 * pessoa distinguir dois tons claros.
 *
 * O prefixo é `solid-`, e não a simetria do par `blue`/`light-blue`. Ali a
 * convenção do original é "o claro leva o prefixo", e seguir isso aqui pediria
 * renomear `red`, `green`, `orange` e `yellow` para `light-*` — quatro variantes
 * usadas em outras telas, trocando de significado em silêncio.
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
  | "yellow"
  | "solid-red"
  | "solid-green"
  | "solid-orange"
  | "solid-yellow"
  | "solid-brand";

const VARIANTE: Record<TagVariant, string> = {
  "light-blue": "bg-[var(--color-blue-light)] text-[var(--color-blue-dark)]",
  // O único invertido do conjunto: fundo forte, texto claro.
  blue: "bg-[var(--color-blue)] text-[var(--color-blue-light)]",
  cyan: "bg-[var(--color-cyan)] text-white",
  purple: "bg-[var(--color-purple)] text-white",
  "light-purple": "bg-[var(--color-purple-light)] text-[var(--color-purple)]",
  red: "bg-[var(--color-red-light)] text-[var(--color-red-dark)]",
  orange: "bg-[var(--color-brand-orange)]/20 text-[var(--color-warn-fg)]",
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
  green: "bg-[var(--color-brand-green)]/20 text-[var(--color-green-dark)]",
  yellow: "bg-[var(--color-yellow)]/20 text-[var(--color-warn-fg)]",

  /*
   * As cinco invertidas, montadas como o `blue` do original: fundo cheio e texto
   * no tom claro da mesma família. **O fundo é o tom escuro, não o cheio** — pela
   * mesma razão das claras, e porque "fundo escuro" era o pedido: `--color-red`
   * (#f04646) não é escuro, `--color-red-dark` (#902a2a) é.
   *
   * | Variante       | Par                                | Razão |
   * | -------------- | ---------------------------------- | ----- |
   * | `solid-brand`  | branco sobre o navy                | 14,05 ✓ |
   * | `solid-yellow` | preto sobre `--color-yellow`       | 13,15 ✓ |
   * | `solid-orange` | branco sobre `--color-warn-fg`     | 6,85 ✓ |
   * | `solid-red`    | `red-light` sobre `red-dark`       | 6,77 ✓ |
   * | `solid-green`  | `green-light` sobre `green-dark`   | 5,73 ✓ |
   *
   * `solid-orange` não tem tom claro na paleta — não existe
   * `--color-orange-light` —, então o texto é branco. `solid-yellow` é preto
   * porque o amarelo cheio é claro: é o mesmo par do `button/1` na variante
   * `default` amarela, e o único caso em que o fundo não escurece.
   */
  "solid-red": "bg-[var(--color-red-dark)] text-[var(--color-red-light)]",
  "solid-green": "bg-[var(--color-green-dark)] text-[var(--color-green-light)]",
  "solid-orange": "bg-[var(--color-warn-fg)] text-white",
  "solid-yellow": "bg-[var(--color-yellow)] text-black",
  "solid-brand": "bg-[var(--color-brand-purple-dark)] text-white",
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
