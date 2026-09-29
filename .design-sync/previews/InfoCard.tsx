import { InfoCard } from "bloomy-design-space";

export const Variantes = () => (
  <div className="flex flex-wrap gap-6">
    <InfoCard variant="blue" icon="fa-calendar-day" info="34" title="Atendimentos hoje" />
    <InfoCard variant="orange" icon="fa-clock" info="6" title="Em atraso" />
    <InfoCard variant="accent" icon="fa-users" info="128" title="Pacientes ativos" />
    <InfoCard variant="green" icon="fa-check" info="92%" title="Presença" />
    <InfoCard variant="info" icon="fa-bullhorn" info="3" title="Autorizações" />
  </div>
);

export const SemInfo = () => (
  <InfoCard variant="blue" icon="fa-calendar-day" title="Atendimentos hoje" />
);
