import { BackofficeLayout, Button, Card, Header, Pagination, Table, Tag } from "bloomy-design-space";

const PACIENTES = [
  { id: "p1", nome: "Helena Martins", unidade: "Unidade Jardim", ativo: true },
  { id: "p2", nome: "Otávio Lima", unidade: "Unidade Jardim", ativo: true },
  { id: "p3", nome: "Bruna Souza", unidade: "Unidade Girassol", ativo: false },
  { id: "p4", nome: "Davi Carvalho", unidade: "Unidade Girassol", ativo: true },
  { id: "p5", nome: "Lívia Rocha", unidade: "Unidade Jardim", ativo: true },
];

const NOTIFICACOES = [
  { id: "n1", title: "Plano de intervenção aprovado", content: "O PIC de Helena Martins foi aprovado pela supervisão.", insertedAt: "há 2 horas" },
  { id: "n2", title: "Autorização parcial", content: "A guia de Otávio Lima foi autorizada parcialmente.", insertedAt: "há 1 dia", readAt: "29/07/2026 10:12" },
];

const USUARIO = { name: "Marina Alves", units: ["Unidade Jardim", "Unidade Girassol"], roles: ["Admin", "Coordenador"], professional: true };

const ListaDePacientes = () => (
  <Card>
    <Table
      id="pacientes"
      rows={PACIENTES}
      rowId={(p) => p.id}
      col={[
        { label: "Nome", render: (p) => p.nome },
        { label: "Unidade", render: (p) => p.unidade },
        { label: "Status", render: (p) => <Tag variant={p.ativo ? "green" : "red"} item={p.ativo ? "Ativo" : "Inativo"} /> },
      ]}
    />
    <div className="mt-6 flex justify-end">
      <Pagination meta={{ currentPage: 1, totalPages: 8 }} onPaginate={() => {}} />
    </div>
  </Card>
);

export const ListaDePacientesNoBackoffice = () => (
  <BackofficeLayout currentPath="/backoffice/pacientes" breadcrumbs={[{ label: "Pacientes" }]} currentUser={USUARIO} notifications={NOTIFICACOES}>
    <Header className="mb-6" actions={<Button leftIcon="fa-plus">Novo paciente</Button>}>
      Pacientes
    </Header>
    <ListaDePacientes />
  </BackofficeLayout>
);

export const SemMenu = () => (
  <BackofficeLayout hideMenu currentPath="/backoffice/pacientes" breadcrumbs={[{ label: "Pacientes" }]} currentUser={USUARIO} notifications={NOTIFICACOES}>
    <Header className="mb-6">Pacientes</Header>
    <ListaDePacientes />
  </BackofficeLayout>
);
