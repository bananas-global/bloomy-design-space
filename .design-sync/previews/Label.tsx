import { Label } from "bloomy-design-space";

export const Cores = () => (
  <div className="space-y-2">
    <Label>Nome do paciente</Label>
    <Label color="purple">Perfil de acesso</Label>
  </div>
);

export const ComCampo = () => (
  <div className="max-w-sm space-y-2">
    <Label htmlFor="responsavel">Responsável legal</Label>
    <p className="text-sm text-neutral-500">Mariana Albuquerque</p>
  </div>
);
