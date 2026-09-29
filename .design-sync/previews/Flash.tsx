import type { ReactNode } from "react";
import { Flash } from "bloomy-design-space";

/**
 * O card isola overlays `fixed` num bloco com transform; sem altura, o
 * `fixed` do componente se ancora num bloco de 0px. O palco dá a altura da tela.
 */
function Palco({ children }: { children: ReactNode }) {
  return <div className="h-screen">{children}</div>;
}


export const ComTituloInfo = () => (
  <Palco>
  <Flash kind="info" title="Sucesso!">Programa estruturado salvo.</Flash>
  </Palco>
);

export const ErroComTitulo = () => (
  <Palco>
  <Flash kind="error" title="Erro!">Não foi possível salvar o programa.</Flash>
  </Palco>
);

export const SemTitulo = () => (
  <Palco>
    <Flash kind="info">Plano de intervenção enviado para a supervisão.</Flash>
  </Palco>
);
