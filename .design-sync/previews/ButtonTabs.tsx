import { Button, ButtonTabs } from "bloomy-design-space";

const ABAS = [
  { title: "Programas", content: <p className="text-sm text-neutral-900">Programas estruturados em aquisição.</p> },
  { title: "Protocolos", content: <p className="text-sm text-neutral-900">ABLLS-R e protocolos de avaliação.</p> },
  { title: "Histórico", disabled: true, content: <p className="text-sm text-neutral-900">Alterações registradas no plano.</p> },
];

export const SmallComActions = () => (
  <ButtonTabs
    id="button-tabs-small"
    actions={<Button size="medium" leftIcon="fa-plus">Novo programa</Button>}
    tab={ABAS}
  />
);

export const SizeNormal = () => <ButtonTabs id="button-tabs-normal" size="normal" tab={ABAS} />;
