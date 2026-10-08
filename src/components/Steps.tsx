import { cx } from "./Input.js";

/**
 * `custom_services/components/common_components.ex` → `steps/1`.
 *
 * Fora do `core_components.ex`: é dos componentes do atendimento, usado no
 * carrossel de etapas do programa (`custom_services/update.ex`). Lá todos os
 * itens nascem `data-status="inactive"` e o hook `Carrousel`
 * (`carrousel_controller.js`) marca `active` os do índice atual. Aqui o hook
 * vira `current` (1, 2, …); sem ele, como no HEEx, nenhum fica ativo.
 */
export function Steps({
  stepCount,
  className,
  current,
}: {
  stepCount: number;
  className?: string;
  /** O índice que o hook marcaria como ativo, começando em 1. */
  current?: number;
}) {
  const steps = Array.from({ length: stepCount }, (_, i) => i + 1);
  return (
    <div className={cx("flex items-center justify-center gap-1", className)}>
      {steps.map((i) => {
        const status = i === current ? "active" : "inactive";
        return [
          <div
            key={`pill-${i}`}
            data-index={i}
            data-status={status}
            className="h-6 rounded-full bg-purple text-white font-bold text-xs hidden items-center justify-center uppercase px-3 data-[status=active]:flex"
          >
            Etapa {i}
          </div>,
          <div
            key={`dot-${i}`}
            data-index={i}
            data-status={status}
            className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-500 font-bold text-xs flex items-center justify-center data-[status=active]:hidden"
          >
            {i}
          </div>,
        ];
      })}
    </div>
  );
}
