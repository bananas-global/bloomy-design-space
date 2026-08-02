/**
 * Ícone — espelho de `CoreComponents.icon/1`.
 *
 * ```elixir
 * attr :type, :string, default: "regular", values: ~w(regular solid)
 *
 * def icon(%{name: "fa-" <> _} = assigns) do
 *   ~H"""
 *   <span class={["fa-#{@type}", @name, @class]} {@rest} />
 *   """
 * end
 * ```
 *
 * Os arquivos vêm de `priv/static/fonts/fontawesome/` do próprio monólito —
 * Font Awesome **Pro** 6.5.2, licença comercial. Não são um pacote novo baixado
 * do npm: são exatamente os mesmos bytes que o sistema serve, com os mesmos dois
 * estilos que o layout carrega (`regular` e `solid`).
 *
 * Antes disto a navegação usava dezenove SVGs que eu desenhei de memória. Eram
 * aproximações honestas e ainda assim invenção: num espelho, um ícone parecido é
 * um ícone errado.
 */

type Props = {
  /** O nome como está no monólito: `fa-users`, ou `fa-solid fa-bullhorn`. */
  name: string;
  /** `regular` é o padrão do sistema. Ignorado quando o nome já traz o estilo. */
  type?: "regular" | "solid";
  className?: string;
};

export function Icon({ name, type = "regular", className }: Props) {
  // Alguns itens do layout já trazem o estilo dentro do nome — por exemplo
  // `icon="fa-solid fa-bullhorn"`. Repetir `fa-regular` nesse caso brigaria com
  // o estilo pedido, e o ícone sairia no peso errado.
  const jaTemEstilo = /\bfa-(regular|solid|light|thin|duotone|brands)\b/.test(name);

  return (
    <span
      aria-hidden="true"
      className={[jaTemEstilo ? "" : `fa-${type}`, name, className].filter(Boolean).join(" ")}
    />
  );
}
