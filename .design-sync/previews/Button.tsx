import { Button } from "bloomy-design-space";

const CORES = ["blue", "red", "green", "purple", "yellow"] as const;
const VARIANTES = ["default", "outline", "tint", "ghost"] as const;

function Grade({ size }: { size: "normal" | "medium" | "small" }) {
  return (
    <div className="space-y-3">
      {VARIANTES.map((variant) => (
        <div key={variant} className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-bold text-neutral-500">{variant}</span>
          {CORES.map((color) => (
            <Button key={color} variant={variant} color={color} size={size}>
              {color}
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}

export const VariantesECores = () => <Grade size="normal" />;

export const TamanhoSmall = () => <Grade size="small" />;

export const IconesEEstados = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button leftIcon="fa-plus">Novo agendamento</Button>
    <Button rightIcon="fa-arrow-right" variant="outline">Avançar</Button>
    <Button leftIcon="fa-star" iconType="solid" variant="tint">Favorito</Button>
    <Button notificationBadge variant="tint" color="purple">Pendências</Button>
    <Button disabled>Desabilitado</Button>
  </div>
);
