import { SelectSearch } from "bloomy-design-space";

const ESPECIALIDADES = [
  { label: "Aplicador ABA", value: "aba" },
  { label: "Fisioterapia", value: "physiotherapy" },
  { label: "Fonoaudiologia", value: "speech-therapy" },
  { label: "Psicologia", value: "psychology" },
  { label: "Terapia Ocupacional", value: "occupational-therapy" },
];

const buscar = (search: string) =>
  ESPECIALIDADES.filter((option) => option.label.toLowerCase().includes(search.toLowerCase()));

export const Vazio = () => (
  <div className="max-w-sm">
    <SelectSearch id="especialidade" name="profissional[especialidade]" label="Especialidade" prompt="Buscar especialidade" options={ESPECIALIDADES} callback={buscar} />
  </div>
);

export const ComValorEIcone = () => (
  <div className="max-w-sm">
    <SelectSearch id="profissional" name="agenda[profissional]" label="Profissional" prompt="Buscar" leftIcon="fa-user" options={ESPECIALIDADES} callback={buscar} searchAction={() => undefined} value="speech-therapy" />
  </div>
);

export const Desabilitado = () => (
  <div className="max-w-sm">
    <SelectSearch id="especialidade-bloqueada" name="profissional[especialidade]" label="Especialidade indisponível" prompt="Buscar especialidade" options={ESPECIALIDADES} value="psychology" disabled />
  </div>
);
