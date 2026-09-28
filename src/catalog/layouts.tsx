import type { ComponentPreview } from "@brucesantos/design-space";

import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { Table } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { PatientLayout } from "../layouts/PatientLayout.js";
import { PublicLayout } from "../layouts/PublicLayout.js";

/**
 * Layouts: as molduras de página do Bloomy, com conteúdo de exemplo.
 *
 * Uma tela nova começa escolhendo um destes e preenchendo o miolo com
 * componentes. O conteúdo aqui é só amostra.
 */

const PACIENTES = [
  { id: "p1", nome: "Helena Martins", unidade: "Vila Aurora", ativo: true },
  { id: "p2", nome: "Otávio Lima", unidade: "Vila Aurora", ativo: true },
  { id: "p3", nome: "Bruna Souza", unidade: "Girassol", ativo: false },
];

function ListaDePacientes() {
  return (
    <Card>
      <Table
        rows={PACIENTES}
        rowId={(p) => p.id}
        cols={[
          { label: "Nome", render: (p) => p.nome },
          { label: "Unidade", render: (p) => p.unidade },
          { label: "Status", render: (p) => <Tag variant={p.ativo ? "green" : "red"} item={p.ativo ? "Ativo" : "Inativo"} /> },
        ]}
      />
    </Card>
  );
}

function Backoffice() {
  return (
    <BackofficeLayout
      active="Pacientes"
      title="Pacientes"
      breadcrumb={[{ label: "Pacientes" }]}
      actions={<Button leftIcon="fa-plus">Novo paciente</Button>}
    >
      <ListaDePacientes />
    </BackofficeLayout>
  );
}

function Paciente() {
  return (
    <BackofficeLayout
      active="Pacientes"
      title="Helena Martins"
      showPageHeading={false}
      breadcrumb={[{ label: "Pacientes", path: "#" }, { label: "Helena Martins" }]}
    >
      <PatientLayout patientName="Helena Martins" active="Plano Terapêutico" secondary={["Programas", "Protocolos", "Histórico"]}>
        <Card>
          <p className="m-0 text-sm">Conteúdo da aba.</p>
        </Card>
      </PatientLayout>
    </BackofficeLayout>
  );
}

function Publico() {
  return (
    <PublicLayout canReset>
      <h1 className="m-0 text-2xl font-bold">Digite o CPF do paciente</h1>
    </PublicLayout>
  );
}

export const LAYOUT_PREVIEWS: ComponentPreview[] = [
  {
    id: "layout.backoffice",
    name: "Backoffice",
    group: "Layouts",
    description: "Menu lateral, cabeçalho com unidade, perfil e notificações, e o conteúdo da página.",
    preview: Backoffice,
  },
  {
    id: "layout.patient",
    name: "Página do paciente",
    group: "Layouts",
    description: "Cabeçalho do paciente com as abas principais e secundárias, dentro do backoffice.",
    preview: Paciente,
  },
  {
    id: "layout.public",
    name: "Portal público",
    group: "Layouts",
    description: "Página própria, aberta por link ou QR Code, sem o menu da clínica: totem, família e operadora.",
    preview: Publico,
  },
];
