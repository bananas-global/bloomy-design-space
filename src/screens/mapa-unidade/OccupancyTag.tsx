/**
 * A taxa de ocupação das grades semanais, no `tag/1` do catálogo.
 *
 * Cada grade mantém a escala de cor do original:
 * - profissional (`occupancy_color/1`): verde abaixo de 50%, laranja até 79%,
 *   vermelho a partir de 80%;
 * - sala (`percentage_color/1`): verde até 25%, amarelo até 50%, laranja até
 *   75%, vermelho acima.
 * Sem taxa (com filtro aplicado na sala), mostra "-" em cinza.
 */
import { Tag, type TagVariant } from "../../components/Tag.js";

export type OccupancyScale = "professional" | "room";

function variantOf(value: number, scale: OccupancyScale): TagVariant {
  if (scale === "professional") return value >= 80 ? "red" : value >= 50 ? "orange" : "green";
  if (value <= 25) return "green";
  if (value <= 50) return "yellow";
  if (value <= 75) return "orange";
  return "red";
}

export function OccupancyTag({ value, scale, className }: { value: number | null; scale: OccupancyScale; className?: string }) {
  if (value == null) return <Tag item="-" variant="dark-purple" className={className} />;
  return <Tag item={`${value}%`} variant={variantOf(value, scale)} className={className} />;
}
