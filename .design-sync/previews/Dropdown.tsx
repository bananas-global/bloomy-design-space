import { useEffect, useRef } from "react";
import { Button, Dropdown } from "bloomy-design-space";

const UNIDADES = ["Unidade Jardim", "Unidade Girassol", "Unidade Primavera"];

function Itens() {
  return (
    <div>
      {UNIDADES.map((unit) => (
        <a key={unit} href="#" onClick={(event) => event.preventDefault()} className="relative flex cursor-pointer select-none hover:bg-neutral-100/40 items-center rounded px-2 py-1.5 text-sm">
          {unit}
        </a>
      ))}
    </div>
  );
}

/** Abre o menu ao montar, como um clique no gatilho. */
function Aberto({ id, placement }: { id: string; placement: "bottom-end" | "bottom-start" | "bottom" }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    document.querySelector<HTMLElement>(`#${id} [data-button]`)?.click();
  }, [id]);
  return (
    <div className="flex justify-center pt-8">
      <Dropdown id={id} placement={placement} items={<Itens />}>
        <Button variant="outline" size="medium" rightIcon="fa-chevron-down">Unidade Jardim</Button>
      </Dropdown>
    </div>
  );
}

export const AbertoBottomStart = () => <Aberto id="drop-aberto-start" placement="bottom-start" />;

export const AbertoBottomEnd = () => <Aberto id="drop-aberto-end" placement="bottom-end" />;

export const Fechado = () => (
  <Dropdown id="drop-fechado" items={<Itens />}>
    <Button variant="outline" size="medium">Selecionar unidade</Button>
  </Dropdown>
);
