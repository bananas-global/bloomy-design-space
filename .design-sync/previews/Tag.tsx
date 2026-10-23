import { Tag } from "bloomy-design-space";

const TAGS = [
  "light-blue", "blue", "dark-blue", "cyan", "light-accent", "purple", "light-purple",
  "dark-purple", "light-red", "red", "brand", "green", "yellow", "orange",
] as const;

export const Variantes = () => (
  <div className="flex max-w-xl flex-wrap items-center gap-2">
    {TAGS.map((v) => (
      <Tag key={v} item={v} variant={v} />
    ))}
  </div>
);

export const Pill = () => (
  <div className="flex max-w-xl flex-wrap items-center gap-2">
    {TAGS.map((v) => (
      <Tag key={v} item={v} variant={v} pill />
    ))}
  </div>
);

export const ComIcones = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Tag item="Padrão" variant="brand" leftIcon="fa-lock" />
    <Tag item="13" variant="orange" icon="fa-triangle-exclamation" />
    <Tag item="Criado" variant="green" />
    <Tag item="Editado" variant="light-blue" />
  </div>
);
