import { RadioSelector } from "bloomy-design-space";

export const ComLabel = () => (
  <RadioSelector
    label="Período"
    field={{ id: "periodo", name: "periodo", value: "dia" }}
    radio={[
      { value: "dia", label: "Dia" },
      { value: "semana", label: "Semana" },
      { value: "mes", label: "Mês", warningNumber: 3 },
    ]}
  />
);

export const IconeEWarning = () => (
  <RadioSelector
    field={{ id: "visao", name: "visao", value: "semana" }}
    radio={[
      { value: "dia", label: "Dia" },
      { value: "semana", label: "Semana" },
      { value: "lista", icon: "fa-list", title: "Lista", warningNumber: 2 },
    ]}
  />
);

export const VariantePurple = () => (
  <RadioSelector
    label="Visualização"
    variant="purple"
    field={{ id: "visualizacao", name: "visualizacao", value: "grafico" }}
    radio={[
      { value: "tabela", label: "Tabela" },
      { value: "grafico", label: "Gráfico" },
    ]}
  />
);
