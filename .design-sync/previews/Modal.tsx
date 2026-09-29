import type { ReactNode } from "react";
import { Button, Modal } from "bloomy-design-space";

/**
 * O card isola overlays `fixed` num bloco com transform; sem altura, o
 * `fixed` do componente se ancora num bloco de 0px. O palco dá a altura da tela.
 */
function Palco({ children }: { children: ReactNode }) {
  return <div className="h-screen">{children}</div>;
}


export const AbertoInativarPaciente = () => (
  <Palco>
  <Modal id="modal-inativar" show title="Inativar paciente" variant="small">
    <p className="text-sm text-neutral-900">
      Os atendimentos futuros de Helena Martins serão desmarcados e o plano de intervenção ficará suspenso.
    </p>
    <div className="mt-6 flex justify-end gap-2">
      <Button variant="outline">Cancelar</Button>
      <Button color="red">Inativar</Button>
    </div>
  </Modal>
  </Palco>
);

export const ExtraSmall = () => (
  <Palco>
  <Modal id="modal-xs" show title="Excluir alvo" variant="extra_small">
    <p className="text-sm text-neutral-900">O alvo “Bater palmas” será removido do programa Imitação motora.</p>
    <div className="mt-6 flex justify-end gap-2">
      <Button variant="outline">Cancelar</Button>
      <Button color="red">Excluir</Button>
    </div>
  </Modal>
  </Palco>
);

export const Medium = () => (
  <Palco>
  <Modal id="modal-medium" show title="Mapa de horas" variant="medium">
    <p className="text-sm text-neutral-900">Horas planejadas e disponíveis de Caio Nunes na semana de 03/08/2026.</p>
  </Modal>
  </Palco>
);

export const CustomTitle = () => (
  <Palco>
  <Modal
    id="modal-custom-title"
    show
    customTitle={{ className: "p-6", children: <h1 className="font-bold text-2xl text-blue-dark">Otávio Lima</h1> }}
  >
    <p className="text-sm text-neutral-900">Paciente em atendimento desde 03/08/2026, com Caio Nunes como aplicador.</p>
  </Modal>
  </Palco>
);
