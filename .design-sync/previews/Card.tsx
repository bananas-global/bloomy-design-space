import { Card } from "bloomy-design-space";

export const Padrao = () => (
  <Card className="w-64">
    <p className="text-sm text-brand-purple-dark">Cartão padrão, fundo branco.</p>
  </Card>
);

export const ComFundo = () => (
  <Card className="w-64 bg-brand-blue/20">
    <p className="text-sm text-brand-purple-dark">class=&quot;bg-brand-blue/20&quot;</p>
  </Card>
);
