import { StatusTag, Table } from "bloomy-design-space";

const LINHAS = [
  { horario: "08:00", paciente: "Helena M.", servico: "Terapia ocupacional", situacao: true },
  { horario: "09:30", paciente: "Otávio L.", servico: "Fonoaudiologia", situacao: false },
  { horario: "11:00", paciente: "Bruna S.", servico: "Psicologia ABA", situacao: true },
];

export const ComColunasEAcoes = () => (
  <Table
    id="agenda"
    rows={LINHAS}
    rowId={(l) => `agenda-${l.horario}`}
    col={[
      { label: "Horário", render: (l) => l.horario },
      { label: "Paciente", render: (l) => l.paciente },
      { label: "Serviço", render: (l) => l.servico },
      { label: "Situação", render: (l) => <StatusTag status={l.situacao} title={l.situacao ? "Ativo" : "Inativo"} /> },
    ]}
    action={[() => <a href="#">Editar</a>, () => <a href="#">Excluir</a>]}
  />
);

export const Vazia = () => (
  <Table
    id="agenda-vazia"
    rows={[] as typeof LINHAS}
    col={[
      { label: "Horário", render: (l) => l.horario },
      { label: "Paciente", render: (l) => l.paciente },
    ]}
  />
);
