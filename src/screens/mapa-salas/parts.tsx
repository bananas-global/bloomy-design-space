/**
 * Mapa de Salas — peças locais da feature.
 * Novo — não existe no Phoenix: cada peça abaixo é da tela, montada sobre
 * componentes do catálogo e com tokens do monólito.
 */
import type { ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { CheckboxGroup } from "../../components/Choice.js";
import { Icon } from "../../components/Icon.js";
import { dayShort, type DayKey } from "./model.js";

/**
 * Tamanho das gavetas do mapa: o `extra_small` (`max-w-md`) um pouco mais
 * largo, sem os cantos arredondados. No Phoenix:
 * `variant="custom" custom_size="max-w-lg rounded-none!"`.
 */
export const DRAWER_SIZE = "max-w-lg rounded-none!";

/**
 * Rodapé fixo das gavetas (botões à direita), sempre no pé da gaveta. Pede
 * `contentClass="flex flex-col"` no `DrawerModal` e o corpo com `flex-1`.
 * Novo — não existe no Phoenix (o mesmo da aba Documentos).
 */
export function DrawerFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky -bottom-6 z-10 -mx-6 -mb-6 mt-8 flex shrink-0 justify-end gap-3 border-t border-neutral-100 bg-white px-6 py-4">{children}</div>
  );
}

/** Aviso de validação dentro da gaveta (`oc-dp__warn`). Novo — não existe no Phoenix. */
export function Warn({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-baseline gap-1.5 text-sm font-extrabold text-red-dark text-pretty">
      <Icon name="fa-triangle-exclamation" type="solid" className="flex-none" />
      <span>{children}</span>
    </p>
  );
}

/** Nota explicativa discreta. Novo — não existe no Phoenix. */
export function Note({ children, icon = "fa-circle-info" }: { children: ReactNode; icon?: string }) {
  return (
    <p className="flex items-baseline gap-1.5 text-sm font-semibold text-brand-purple-dark/60 text-pretty">
      <Icon name={icon} type="solid" className="flex-none" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Dias da semana de um padrão ou de uma alocação: os dias da unidade como
 * `checkbox_group` e o atalho "Todos". Novo — não existe no Phoenix.
 */
export function DayPicker({ id, value, unitDays, onChange }: { id: string; value: DayKey[]; unitDays: DayKey[]; onChange: (days: DayKey[]) => void }) {
  const all = value.length === unitDays.length;
  return (
    <div>
      <CheckboxGroup
        label="Dias da semana"
        field={{ id, name: `${id}[]`, value }}
        wrapperClass="flex flex-wrap gap-2 space-x-0!"
        checkbox={unitDays.map((k) => ({ value: k, label: dayShort(k) }))}
        onChange={(event) => {
          const k = event.target.value as DayKey;
          onChange(event.target.checked ? unitDays.filter((d) => value.includes(d) || d === k) : value.filter((d) => d !== k));
        }}
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="button" size="small" variant={all ? "tint" : "ghost"} disabled={all} onClick={() => onChange([...unitDays])}>
          Todos os dias
        </Button>
        {value.length === 0 && <Warn>Nenhum dia: este período não vale em dia nenhum.</Warn>}
      </div>
    </div>
  );
}
