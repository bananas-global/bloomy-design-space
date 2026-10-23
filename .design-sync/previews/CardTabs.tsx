import { useEffect, useRef } from "react";
import { CardTabs, Header } from "bloomy-design-space";

const ABAS = [
  { title: "Configuração", content: <p>Critério de domínio consecutivo: 3 sessões com 80%.</p> },
  { title: "Alvos", content: <p>Bater palmas, tocar a cabeça, levantar os braços.</p> },
  { title: "Histórico", noCard: true, content: <p>Sem alterações registradas.</p> },
];

function useAbaInicial(selector: string) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    document.querySelector<HTMLElement>(selector)?.click();
  }, [selector]);
}

export const ComHeader = () => (
  <CardTabs id="card-tabs-programa" header={<Header>Programa: Imitação motora</Header>} tab={ABAS} />
);

export const AbaSemCartao = () => {
  useAbaInicial("#card-tabs-programa-2-tab-2");
  return <CardTabs id="card-tabs-programa-2" header={<Header>Programa: Imitação motora</Header>} tab={ABAS} />;
};
