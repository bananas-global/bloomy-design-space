import { Breadcrumbs } from "bloomy-design-space";

export const ComESemTo = () => (
  <Breadcrumbs
    items={[
      { label: "Pacientes", to: "/backoffice/pacientes" },
      { label: "Helena Martins", to: "/backoffice/pacientes/p1" },
      { label: "Plano de Intervenção" },
    ]}
  />
);

export const DoisNiveis = () => (
  <Breadcrumbs items={[{ label: "Programas", to: "/backoffice/programas" }, { label: "Imitação motora" }]} />
);

export const ItemUnico = () => <Breadcrumbs items={[{ label: "Agenda" }]} />;
