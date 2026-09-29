import { MultiTagSelect } from "bloomy-design-space";

export const ComEtiquetas = () => (
  <div className="max-w-sm">
    <MultiTagSelect id="apelidos" name="paciente[apelidos]" value={["Lelê", "Nena"]} />
  </div>
);

export const Vazio = () => (
  <div className="max-w-sm">
    <MultiTagSelect id="palavras" name="programa[palavras]" value={[]} />
  </div>
);

export const SomenteLeitura = () => (
  <div className="max-w-sm">
    <MultiTagSelect id="palavras-ro" name="programa[palavras_ro]" value={["imitação", "contato visual"]} readonly />
  </div>
);
