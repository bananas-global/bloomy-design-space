import { SwitchCard } from "bloomy-design-space";

export const Desligado = () => (
  <div className="max-w-xl">
    <SwitchCard
      field={{ id: "registro-abc", name: "programa[is_abc]", value: false }}
      title="Registro Tipo ABC"
      description="Ativa o formato ABC para detalhar o comportamento com antecedentes e consequências."
    />
  </div>
);

export const Ligado = () => (
  <div className="max-w-xl">
    <SwitchCard
      field={{ id: "fase-manutencao", name: "programa[maintenance]", value: true }}
      title="Fase de manutenção"
      description="Mantém o programa em manutenção depois de adquirido."
    />
  </div>
);
