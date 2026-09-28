import type { ComponentPreview } from "@brucesantos/design-space";

import logo from "../assets/bloomy-logo.svg";
import logoNegative from "../assets/bloomy-logo-negative.svg";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { Icon } from "../components/Icon.js";
import { Header } from "../components/Layout.js";
import { Pagination } from "../components/Pagination.js";
import { Table } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import type { UserNotification } from "../components/Notification.js";
import { AuthLayout } from "../layouts/AuthLayout.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { HealthCareLayout } from "../layouts/HealthCareLayout.js";
import { PatientLayout } from "../layouts/PatientLayout.js";
import { PublicLayout } from "../layouts/PublicLayout.js";

/**
 * Layouts: as molduras de página do Bloomy, com conteúdo de exemplo. Os dados
 * são fictícios.
 */

const PACIENTES = [
  { id: "p1", nome: "Helena Martins", unidade: "Unidade Jardim", ativo: true },
  { id: "p2", nome: "Otávio Lima", unidade: "Unidade Jardim", ativo: true },
  { id: "p3", nome: "Bruna Souza", unidade: "Unidade Girassol", ativo: false },
];

const NOTIFICACOES: UserNotification[] = [
  { id: "n1", title: "Plano de intervenção aprovado", content: "O PIC de Helena Martins foi aprovado pela supervisão.", insertedAt: "há 2 horas" },
  { id: "n2", title: "Autorização parcial", content: "A guia de Otávio Lima foi autorizada parcialmente.", insertedAt: "há 1 dia", readAt: "29/07/2026 10:12" },
];

const USUARIO = { name: "Marina Alves", units: ["Unidade Jardim", "Unidade Girassol"], roles: ["Admin", "Coordenador"], professional: true };

function ListaDePacientes() {
  return (
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
}

function Backoffice() {
  return (
    <BackofficeLayout currentPath="/backoffice/pacientes" breadcrumbs={[{ label: "Pacientes" }]} currentUser={USUARIO} notifications={NOTIFICACOES}>
      <Header className="mb-6" actions={<Button leftIcon="fa-plus">Novo paciente</Button>}>
        Pacientes
      </Header>
      <ListaDePacientes />
    </BackofficeLayout>
  );
}

function Paciente() {
  return (
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
        renderTab={(tab) => <p>Conteúdo da aba <span>{tab}</span>.</p>}
      />
    </BackofficeLayout>
  );
}

function Operadora() {
  return (
    <HealthCareLayout currentPath="/operadora/pacientes" currentHealthCareUser={{ name: "Renata Duarte", units: ["Unidade Jardim"] }}>
      <Header className="mb-6">Pacientes</Header>
      <ListaDePacientes />
    </HealthCareLayout>
  );
}

/** O cabeçalho vem de `Public.AutoCheckinLive.Show`; o layout é só o fundo. */
function Publico() {
  return (
    <PublicLayout>
      <div>
        <header className="top-0 sticky z-30 w-full p-4 shadow-main">
          <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
            <img src={logo} alt="Logo da Bloomy" />

            <Button variant="tint" color="red">
              <Icon name="fa-times" className="block w-4 h-4 self-center text-red" />
            </Button>
          </div>
        </header>

        <div className="px-6 p-12">
          <div className="max-w-5xl w-full mx-auto">
            <Header subtitle="Informe o CPF do responsável legal para registrar a chegada.">Check-in na Unidade Jardim</Header>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

/** O miolo vem de `Backoffice.UserLoginLive`, com o markup de `brand_input/1` e `brand_button/1`. */
function Login() {
  const input =
    "block w-full p-6 h-12 rounded-2xl font-normal disabled:bg-purple-dark/[0.02] focus:ring-0 focus:border-solid focus:border transition-colors duration-200 bg-white text-brand-purple-dark placeholder:text-brand-purple-dark/45 focus:border-brand-purple-light shadow-[0_14px_14px_0] shadow-brand-purple-dark/10 outline-hidden border border-transparent";
  return (
    <AuthLayout>
      <div className="max-w-[480px] w-full">
        <img src={logoNegative} className="mb-32 mx-auto" />

        <div className="flex items-center w-full bg-brand-purple-dark/10 rounded-2xl p-2 gap-x-2 mb-6">
          <button className="p-4 rounded-xl w-full hover:text-brand-purple">Família</button>
          <button className="p-4 rounded-xl w-full hover:text-brand-purple">Operadora</button>
          <button className="p-4 rounded-xl w-full bg-white shadow-[0_14px_14px_0] shadow-brand-purple-dark/10">Equipe</button>
        </div>

        <form className="space-y-8" onSubmit={(event) => event.preventDefault()}>
          <div className="flex flex-col gap-6">
            <div className="relative">
              <input type="email" placeholder="Login" className={input} />
            </div>
            <div className="relative">
              <input type="password" placeholder="Senha" className={input} />
            </div>
          </div>

          <div className="flex justify-end">
            <a href="#" className="self-end font-bold text-brand-neutral hover:text-brand-blue">
              Esqueceu sua senha?
            </a>
          </div>

          <button className="rounded-xl font-bold transition duration-200 ease-in-out active:scale-95 flex justify-center h-12 px-4 py-3 items-baseline bg-brand-purple-light text-white w-full shadow-[0_4px_8px_0] shadow-brand-purple-dark/10">
            Entrar
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}

export const LAYOUT_PREVIEWS: ComponentPreview[] = [
  {
    id: "layout.backoffice",
    name: "Backoffice",
    group: "Layouts",
    description: "Menu lateral filtrado por permissão, breadcrumbs, unidade, perfil, pessoa e notificações.",
    source: "layouts/backoffice.html.heex",
    preview: Backoffice,
  },
  {
    id: "layout.patient",
    name: "Página do paciente",
    group: "Layouts",
    description: "Cabeçalho do paciente (CardHeader) e as abas agrupadas de lazy_tabs, dentro do backoffice.",
    source: "patient_live/show.ex",
    preview: Paciente,
  },
  {
    id: "layout.health-care",
    name: "Portal da operadora",
    group: "Layouts",
    description: "O mesmo menu lateral, com os quatro itens da operadora.",
    source: "layouts/health_care.html.heex",
    preview: Operadora,
  },
  {
    id: "layout.public",
    name: "Portal público",
    group: "Layouts",
    description: "Página aberta por link ou QR Code (check-in, anamnese), sem o menu da clínica.",
    source: "layouts/public.html.heex",
    preview: Publico,
  },
  {
    id: "layout.auth",
    name: "Login",
    group: "Layouts",
    description: "Login da equipe, da família e da operadora, com a ilustração à direita.",
    source: "layouts/auth.html.heex",
    preview: Login,
  },
];
