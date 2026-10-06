import { CheckboxGroup } from "bloomy-design-space";

export const Especialidades = () => (
  <CheckboxGroup
    label="Especialidades"
    field={{ id: "especialidades", name: "especialidades", value: ["fono"] }}
    checkbox={[
      { value: "fono", label: "Fonoaudiologia" },
      { value: "to", label: "Terapia ocupacional" },
      { value: "psico", label: "Psicologia" },
    ]}
  />
);

export const ComDesabilitada = () => (
  <CheckboxGroup
    label="Documentos entregues"
    field={{ id: "documentos", name: "documentos", value: ["rg", "cpf"] }}
    checkbox={[
      { value: "rg", label: "Identidade" },
      { value: "cpf", label: "CPF" },
      { value: "laudo", label: "Laudo", disable: true },
    ]}
  />
);
