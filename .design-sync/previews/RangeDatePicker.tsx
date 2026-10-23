import { useState } from "react";
import { Button, RangeDatePicker } from "bloomy-design-space";

export const ComMinEMax = () => {
  const [valor, setValor] = useState("2026-08-03#2026-08-09");
  return (
    <div className="space-y-3">
      <RangeDatePicker label="Período" field={{ id: "periodo-dias", name: "filtro[periodo]", value: valor }} onChange={setValor} minDate="2026-08-01" maxDate="2026-09-30" className="max-w-sm" />
      <Button size="small" variant="outline" onClick={() => setValor("2026-09-07#2026-09-13")}>Carregar período externo</Button>
    </div>
  );
};

export const Vazio = () => (
  <RangeDatePicker label="Período dos atendimentos" field={{ id: "periodo-vazio", name: "filtro[atendimentos]", value: "" }} className="max-w-sm" />
);

export const ComErro = () => (
  <div className="pb-6">
    <RangeDatePicker label="Período" field={{ id: "periodo-erro", name: "relatorio[periodo]", value: "", errors: ["Informe o período"] }} className="max-w-sm" />
  </div>
);

export const Desabilitado = () => (
  <RangeDatePicker label="Período" field={{ id: "periodo-bloq", name: "relatorio[bloq]", value: "2026-07-27#2026-07-31" }} disabled className="max-w-sm" />
);
