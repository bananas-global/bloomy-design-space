import { Button, Header } from "bloomy-design-space";

export const Small = () => <Header variant="small">Título pequeno</Header>;

export const ComSubtitle = () => (
  <Header subtitle="Ativo · 5 anos · 0 faltas · 0h semanais">Raul Tavares Rodrigues</Header>
);

export const LargeComActions = () => (
  <div className="max-w-2xl">
    <Header variant="large" actions={<Button size="medium" leftIcon="fa-plus">Novo programa</Button>}>
      Programas
    </Header>
  </div>
);
