import { StatusTag } from "bloomy-design-space";

export const AtivoEInativo = () => (
  <div className="flex items-center gap-4 text-sm text-brand-purple-dark">
    <span className="flex items-center gap-2">
      <StatusTag status title="Ativo" /> Ativo
    </span>
    <span className="flex items-center gap-2">
      <StatusTag status={false} title="Inativo" /> Inativo
    </span>
  </div>
);

export const EmLista = () => (
  <div className="space-y-2 text-sm text-brand-purple-dark">
    <span className="flex items-center gap-2">
      <StatusTag status title="Ativo" /> Helena M. · Terapia ocupacional
    </span>
    <span className="flex items-center gap-2">
      <StatusTag status={false} title="Inativo" /> Otávio L. · Fonoaudiologia
    </span>
    <span className="flex items-center gap-2">
      <StatusTag status title="Ativo" /> Bruna S. · Psicologia ABA
    </span>
  </div>
);
