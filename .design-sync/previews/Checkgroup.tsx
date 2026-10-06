import { Checkgroup } from "bloomy-design-space";

const DIAS = [["Segunda", "monday"], ["Quarta", "wednesday"], ["Sexta", "friday"], ["Domingo", "sunday"]] as const;

export const DiasDeAtendimento = () => (
  <div className="max-w-3xl">
    <Checkgroup
      label="Atende nos dias da semana"
      field={{ id: "dias", name: "unit_service_hour[service_hour][weekdays]", value: ["monday", "wednesday"] }}
      innerClass="flex-row flex-wrap"
      options={DIAS}
    />
  </div>
);

export const EmColuna = () => (
  <div className="max-w-sm">
    <Checkgroup
      label="Documentos entregues"
      field={{ id: "documentos", name: "paciente[documentos]", value: ["rg"] }}
      options={[["Identidade", "rg"], ["CPF", "cpf"], ["Laudo médico", "laudo"]]}
    />
  </div>
);

export const CorPurple = () => (
  <div className="max-w-3xl">
    <Checkgroup
      color="purple"
      label="Turnos de atendimento"
      field={{ id: "turnos", name: "unidade[turnos]", value: ["manha"] }}
      innerClass="flex-row flex-wrap"
      options={[["Manhã", "manha"], ["Tarde", "tarde"], ["Noite", "noite"]]}
    />
  </div>
);
