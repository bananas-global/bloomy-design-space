import { EmptyStateCard } from "bloomy-design-space";

export const ComInnerBlock = () => (
  <EmptyStateCard icon="fa-calendar-day" text="Nenhum atendimento para hoje">
    Os agendamentos criados na recepção aparecem aqui.
  </EmptyStateCard>
);

export const SemInnerBlock = () => <EmptyStateCard icon="fa-folder-open" text="Nenhum documento" />;
