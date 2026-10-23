import { RadioGroup } from "bloomy-design-space";

export const Presenca = () => (
  <RadioGroup
    label="Presença"
    field={{ id: "presenca", name: "presenca", value: "presente" }}
    radio={[
      { value: "presente", label: "Presente" },
      { value: "ausente", label: "Ausente" },
      { value: "justificada", label: "Falta justificada" },
    ]}
  />
);

export const VariantePurple = () => (
  <RadioGroup
    label="Tipo de registro"
    variant="purple"
    field={{ id: "registro", name: "programa[registro]", value: "abc" }}
    radio={[
      { value: "tentativas", label: "Tentativas" },
      { value: "abc", label: "Registro ABC" },
      { value: "duracao", label: "Duração" },
    ]}
  />
);

export const ComDesabilitada = () => (
  <RadioGroup
    label="Fase do programa"
    field={{ id: "fase", name: "programa[fase]", value: "linha-de-base" }}
    radio={[
      { value: "linha-de-base", label: "Linha de base" },
      { value: "intervencao", label: "Intervenção" },
      { value: "manutencao", label: "Manutenção", disabled: true },
    ]}
  />
);
