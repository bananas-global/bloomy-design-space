import { BackofficeLayout, List, PatientLayout } from "bloomy-design-space";

const DADOS = [
  { title: "Data de nascimento", children: "14/03/2020" },
  { title: "Responsável legal", children: "Carla Martins (mãe)" },
  { title: "Convênio", children: "Saúde Integral — plano Essencial" },
  { title: "Diagnóstico", children: "TEA nível 2 de suporte" },
  { title: "Supervisora", children: "Marina Alves" },
];

const USUARIO = { name: "Marina Alves", units: ["Unidade Jardim", "Unidade Girassol"], roles: ["Admin", "Coordenador"], professional: true };

const NOTIFICACOES = [
  { id: "n1", title: "Plano de intervenção aprovado", content: "O PIC de Helena Martins foi aprovado pela supervisão.", insertedAt: "há 2 horas" },
];

export const PaginaDoPaciente = () => (
  <BackofficeLayout
    currentPath="/backoffice/pacientes/p1"
    breadcrumbs={[{ label: "Pacientes", to: "/backoffice/pacientes" }, { label: "Helena Martins" }]}
    currentUser={USUARIO}
    notifications={NOTIFICACOES}
  >
    <PatientLayout
      patient={{
        name: "Helena Martins",
        status: "Ativo",
        supportLevel: 2,
        restrictions: true,
        age: 6,
        unitName: "Unidade Jardim",
        missedCancelledCount: 3,
        activeWeeklyHours: 12,
        observation: "Prefere atividades com blocos no início da sessão.",
      }}
      renderTab={(tab) =>
        tab === "personal_info" ? (
          <List item={DADOS} />
        ) : (
          <p>
            Conteúdo da aba <span>{tab}</span>.
          </p>
        )
      }
    />
  </BackofficeLayout>
);
