import { MultiSelectSearch } from "bloomy-design-space";

const ESPECIALIDADES = [
  { label: "Aplicador ABA", value: "aba" },
  { label: "Fisioterapia", value: "physiotherapy" },
  { label: "Fonoaudiologia", value: "speech-therapy" },
  { label: "Psicologia", value: "psychology" },
  { label: "Terapia Ocupacional", value: "occupational-therapy" },
];

const buscar = (search: string) =>
  ESPECIALIDADES.filter((option) => option.label.toLowerCase().includes(search.toLowerCase()));

const PROGRAMAS_AGRUPADOS = [
  { group: "Aquisição", items: [{ label: "Imitação motora", value: "imitacao" }, { label: "Contato visual", value: "contato-visual" }] },
  { group: "Manutenção", color: "orange", items: [{ label: "Seguir instruções", value: "instrucoes" }] },
];

export const ComSelecionadas = () => (
  <div className="max-w-sm">
    <MultiSelectSearch id="especialidades" name="programa[especialidades]" label="Especialidades" prompt="Selecione" options={ESPECIALIDADES} value={["aba", "psychology"]} callback={buscar} />
  </div>
);

export const Vazio = () => (
  <div className="max-w-sm">
    <MultiSelectSearch id="especialidades-vazio" name="programa[especialidades]" label="Especialidades" prompt="Selecione" options={ESPECIALIDADES} callback={buscar} />
  </div>
);

export const Agrupadas = () => (
  <div className="max-w-sm">
    <MultiSelectSearch id="programas" name="plano[programas]" label="Programas" prompt="Selecione" options={PROGRAMAS_AGRUPADOS} value={["imitacao"]} />
  </div>
);

export const MuitasSelecionadas = () => (
  <div className="max-w-sm">
    <MultiSelectSearch id="especialidades-equipe" name="equipe[especialidades]" label="Especialidades da equipe" prompt="Selecione" options={ESPECIALIDADES} value={["aba", "speech-therapy", "psychology", "occupational-therapy"]} callback={buscar} />
  </div>
);
