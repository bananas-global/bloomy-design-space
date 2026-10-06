import { LinkButton } from "bloomy-design-space";

const VARIANTES = ["default", "outline", "tint", "ghost"] as const;
const CORES = ["blue", "red", "purple"] as const;

export const VariantesECores = () => (
  <div className="space-y-3">
    {VARIANTES.map((variant) => (
      <div key={variant} className="flex flex-wrap items-center gap-2">
        <span className="w-16 shrink-0 text-xs font-bold text-neutral-500">{variant}</span>
        {CORES.map((color) => (
          <LinkButton key={color} navigate="#" variant={variant} color={color}>
            {color}
          </LinkButton>
        ))}
      </div>
    ))}
  </div>
);

export const ComIcones = () => (
  <div className="flex flex-wrap gap-2">
    <LinkButton navigate="#" variant="outline" leftIcon="fa-arrow-left">Voltar</LinkButton>
    <LinkButton navigate="#" rightIcon="fa-arrow-right">Avançar</LinkButton>
    <LinkButton navigate="#" variant="tint" leftIcon="fa-calendar">Ver agenda</LinkButton>
  </div>
);
