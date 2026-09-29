import { useEffect, useRef } from "react";
import { Button, Tooltip } from "bloomy-design-space";

/** Mostra a dica ao montar, como o mouse entrando no gatilho. */
function useHover(id: string) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    document
      .querySelector(`#${id} [data-tooltip-trigger]`)
      ?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, relatedTarget: null }));
  }, [id]);
}

export const DicaRight = () => {
  useHover("tip-right");
  return (
    <div className="flex justify-center pt-16">
      <Tooltip id="tip-right" tooltipTrigger={<Button variant="tint" size="medium">Mapa</Button>} tooltipContent="Mapa da Unidade" />
    </div>
  );
};

export const DicaTop = () => {
  useHover("tip-top");
  return (
    <div className="flex justify-center pt-16">
      <Tooltip id="tip-top" placement="top" tooltipTrigger={<Button variant="outline" size="medium">Programa</Button>} tooltipContent="Programa estruturado" />
    </div>
  );
};

export const Gatilhos = () => (
  <div className="flex gap-4">
    <Tooltip id="tip-g1" tooltipTrigger={<Button variant="tint" size="medium">Passe o mouse</Button>} tooltipContent="Mapa da Unidade" />
    <Tooltip id="tip-g2" placement="top" tooltipTrigger={<Button variant="outline" size="medium">Acima</Button>} tooltipContent="Programa estruturado" />
  </div>
);
