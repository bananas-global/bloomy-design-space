import { useState, type ReactNode } from "react";
import type { ComponentPreview, ComponentPreviewProps } from "@brucesantos/design-space";
import { Button, type ButtonColor, type ButtonSize, type ButtonVariant } from "../components/Button.js";
import { Card, InfoCard } from "../components/Card.js";
import { StatusTag, Tag, TagList, type TagListVariant, type TagVariant } from "../components/Tag.js";
import { SimpleTable, Table } from "../components/Table.js";
import { Checkgroup, FakeInput, FieldError, Input, InputSwitchCard, InputWithSelect, Label, SwitchCard } from "../components/Input.js";
import { MultiSelect } from "../components/MultiSelect.js";
import { BrandButton, BrandInput } from "../components/Brand.js";
import { FileItem, FileUploader } from "../components/FileUploader.js";
import {
  Avatar, Back, EmptyStateCard, Header, InsideCard, Kbd, List,
  LoadingCard, MetaInfo, Progress, TimelineList,
} from "../components/Layout.js";
import { DrawerModal, Dropdown, DropdownMenu, Modal, ModalContent } from "../components/Overlay.js";
import { CheckboxGroup, FakeRadioGroup, RadioCards, RadioGroup, RadioSelector, Tooltip } from "../components/Choice.js";
import {
  DateNavigator, MonthPicker, RangeDatePicker, RangeMonthPicker, WeekSelector,
} from "../components/DatePickers.js";
import { Flash, FlashGroup, SimpleForm } from "../components/Feedback.js";
import { ImageUpload } from "../components/ImageUpload.js";
import { CopyButton, LinkButton, showToast, ToastWrapper } from "../components/Action.js";
import { ButtonTabs, CardTabs, DropdownTabs, LazyTabs, Tabs } from "../components/Tabs.js";
import { Breadcrumbs, Drawer, FormGrid, Timer } from "../components/BackofficeComponents.js";
import { Pagination } from "../components/Pagination.js";
import { NotificationComponent } from "../components/Notification.js";

/**
 * Índice dos componentes do sistema.
 *
 * Os **47** componentes de `lib/bloomy_web/components/core_components.ex`, na
 * ordem em que aparecem lá, mais os componentes compartilhados que vivem em
 * arquivos próprios no monólito. Cada entrada carrega o arquivo e a linha de
 * origem, conferidos pelo mesmo script que valida as citações do log.
 *
 * Apenas entradas com demonstração entram no catálogo visual do motor. Hoje as
 * Todos têm preview; se uma futura entrada ainda não tiver, permanece nesta fonte
 * até existir algo real para o motor renderizar.
 */

export type GalleryEntry = {
  /** Nome da função no monólito. */
  name: string;
  origem: string;
  /** O que ele resolve, em uma frase, para quem não vai ler o código. */
  descricao: string;
  /** Demonstrações, quando portado. */
  demos?: { titulo: string; nota?: string; render: () => ReactNode }[];
};

type GalleryEntryPreviewProps = {
  entry: GalleryEntry;
  demoId?: string;
};

/**
 * Demonstrações de uma entrada da galeria.
 *
 * Cada demonstração vira uma fixture do catálogo do motor. O preview recebe o
 * id resolvido, mas o conteúdo continua pertencendo ao produto.
 */
function GalleryEntryPreview({ entry, demoId }: GalleryEntryPreviewProps) {
  const demos = demoId
    ? entry.demos?.filter((demo, index) => fixtureIdFor(demo.titulo, index) === demoId)
    : entry.demos;

  return (
    <div className="space-y-6">
      {demos?.map((demo) => (
        <div key={demo.titulo}>
          <h3 className="m-0 mb-1 text-[0.9375rem] font-bold text-neutral-900">{demo.titulo}</h3>
          {demo.nota && (
            <p className="m-0 mb-3 text-[0.8125rem] text-neutral-600">{demo.nota}</p>
          )}
          <div className="rounded-lg border border-neutral-100 bg-background px-4 py-4">
            {demo.render()}
          </div>
        </div>
      ))}
    </div>
  );
}

const CORES: ButtonColor[] = ["blue", "red", "green", "purple", "yellow"];
const VARIANTES: ButtonVariant[] = ["default", "outline", "tint", "ghost"];
const TAMANHOS: ButtonSize[] = ["normal", "medium", "small"];
const TAGS: TagVariant[] = [
  "light-blue", "blue", "dark-blue", "cyan", "light-accent", "purple", "light-purple",
  "dark-purple", "light-red", "red", "brand", "green", "yellow", "orange",
];
const TAG_LIST_VARIANTS: TagListVariant[] = ["light-blue", "blue", "red", "light-purple", "orange"];

/** Linhas sintéticas para a tabela da galeria. */
const LINHAS = [
  { horario: "08:00", paciente: "Helena M.", servico: "Terapia ocupacional", situacao: true },
  { horario: "09:30", paciente: "Otávio L.", servico: "Fonoaudiologia", situacao: false },
  { horario: "11:00", paciente: "Bruna S.", servico: "Psicologia ABA", situacao: true },
];

function DemoModal({ variant = "small", title = "Inativar paciente" }: { variant?: "extra_small" | "small" | "medium" | "large"; title?: string }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <Button onClick={() => setShow(true)}>Abrir modal {variant}</Button>
      <Modal id={`demo-modal-${variant}`} show={show} onCancel={() => setShow(false)} title={title} variant={variant}>
        <p className="text-sm text-neutral-900">
          Fecha com Esc, com clique no fundo e pelo botão. Os atendimentos futuros de Helena Martins serão desmarcados.
        </p>
      </Modal>
    </>
  );
}

function DemoTabs() {
  return (
    <Tabs
      id="g-tabs"
      tab={[
        { title: "Programas", content: <p>Programas estruturados em aquisição.</p> },
        { title: "Protocolos", mobileTitle: "Prot.", content: <p>ABLLS-R e protocolos de avaliação.</p> },
        { title: "Histórico", content: <p>Alterações registradas no plano.</p> },
      ]}
    />
  );
}

function DemoCardTabs() {
  return (
    <CardTabs
      id="g-card-tabs"
      header={<Header>Programa: Imitação motora</Header>}
      tab={[
        { title: "Configuração", content: <p>Critério de domínio consecutivo: 3 sessões com 80%.</p> },
        { title: "Alvos", content: <p>Bater palmas, tocar a cabeça, levantar os braços.</p> },
        { title: "Histórico", noCard: true, content: <p>Sem alterações registradas.</p> },
      ]}
    />
  );
}

function DemoButtonTabs() {
  return (
    <ButtonTabs
      id="g-button-tabs"
      actions={<Button size="medium" leftIcon="fa-plus">Novo programa</Button>}
      tab={[
        { title: "Programas", content: <p>Programas estruturados em aquisição.</p> },
        { title: "Protocolos", content: <p>ABLLS-R e protocolos de avaliação.</p> },
        { title: "Histórico", disabled: true, content: <p>Alterações registradas no plano.</p> },
      ]}
    />
  );
}

function DemoDropdownTabs() {
  return (
    <DropdownTabs
      id="g-dropdown-tabs"
      headers={[["cadastro", "Cadastro"], ["clinico", "Clínico"], ["financeiro", "Financeiro"]]}
      header={<Header>Otávio Lima</Header>}
      tab={[
        { title: "Dados Pessoais", parentId: "cadastro", content: <p>Nome, nascimento e responsáveis legais.</p> },
        { title: "Documentos", parentId: "cadastro", content: <p>Laudos e relatórios anexados.</p> },
        { title: "Anamnese", parentId: "clinico", content: <p>Anamnese geral preenchida pela família.</p> },
        { title: "Faturamento", parentId: "financeiro", content: <p>Guias e fechamentos do paciente.</p> },
      ]}
    />
  );
}

function DemoLazyTabs() {
  const content = (text: string) => () => <p>{text}</p>;
  return (
    <LazyTabs
      id="g-lazy-tabs"
      activeTab="clinical_summary"
      header={<Header subtitle="Ativo · 5 anos · 0 faltas · 0h semanais">Raul Tavares Rodrigues</Header>}
      tabs={[
        { title: "Dados Pessoais", tabs: [
          { id: "personal_info", title: "Dados Pessoais", component: content("Dados pessoais do paciente.") },
          { id: "legal_guardian_info", title: "Dados dos Responsáveis", component: content("Responsáveis legais.") },
        ] },
        { title: "Anamneses", tabs: [
          { id: "clinical_summary", title: "Resumo Clínico", component: content("O conteúdo só é montado quando a aba é aberta.") },
          { id: "anamnese_general", title: "Anamnese Geral", component: content("Anamnese geral.") },
        ] },
        { id: "patient_evolution", title: "Evolução", component: content("Evolução do paciente.") },
        { id: "no_show", title: "Faltas" },
        false,
      ]}
    />
  );
}

function DemoDrawer() {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div className="flex h-96 overflow-hidden rounded-lg border border-neutral-100 [&_#drawer]:relative! [&_#drawer]:h-full [&_#drawer-overlay]:hidden!">
      <Drawer
        currentPath="/backoffice/pacientes"
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        item={[
          { to: "/backoffice", title: "Dashboard", icon: "fa-chart-pie", exact: true },
          { to: "/backoffice/agendamentos", title: "Agendamentos", icon: "fa-calendar-day" },
          { to: "/backoffice/pacientes", title: "Pacientes", icon: "fa-users" },
          { to: "/backoffice/programas", title: "Biblioteca", icon: "fa-memo-circle-check" },
        ]}
      />
      <div className="p-4">
        <Button size="medium" variant="tint" onClick={() => setCollapsed((value) => !value)}>
          {collapsed ? "Expandir" : "Recolher"}
        </Button>
      </div>
    </div>
  );
}

function DemoPagination() {
  const [page, setPage] = useState(1);
  return (
    <div className="space-y-3">
      <Pagination meta={{ currentPage: page, totalPages: 12 }} onPaginate={setPage} />
      <Pagination meta={{ currentPage: 6, totalPages: 12 }} onPaginate={() => {}} />
      <Pagination meta={{ currentPage: 12, totalPages: 12 }} onPaginate={() => {}} />
    </div>
  );
}

function DemoSelect() {
  const [specialty, setSpecialty] = useState("");
  const [status, setStatus] = useState("active");
  const specialties = [
    { label: "Aplicador ABA", value: "aba" },
    { label: "Fisioterapia", value: "physiotherapy" },
    { label: "Fonoaudiologia", value: "speech-therapy" },
    { label: "Psicologia", value: "psychology" },
    { label: "Terapia Ocupacional", value: "occupational-therapy" },
  ];
  return (
    <div id="g-select-wrapper" className="grid max-w-3xl gap-6 md:grid-cols-2">
      <Input type="select" id="g-specialty" name="professional[specialty]" label="Especialidade" prompt="Selecione a especialidade" value={specialty} options={specialties} onChange={(value) => setSpecialty(value ?? "")} />
      <Input type="select" id="g-status" name="professional[status]" label="Status profissional" prompt="Selecione o status" value={status} options={[["Ativo", "active"], ["Inativo", "inactive"]]} onChange={(value) => setStatus(value ?? "")} />
      <Input type="select" id="g-select-error" label="Especialidade com erro" prompt="Selecione a especialidade" value="" options={specialties} errors={["selecione uma especialidade"]} />
      <Input type="select" id="g-select-disabled" label="Especialidade indisponível" prompt="Selecione a especialidade" value="psychology" options={specialties} disabled />
    </div>
  );
}

function DemoDrawerModal({ placement = "right" }: { placement?: "left" | "right" }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <Button onClick={() => setShow(true)}>Abrir drawer à {placement === "right" ? "direita" : "esquerda"}</Button>
      <DrawerModal id={`g-drawer-${placement}`} show={show} onCancel={() => setShow(false)} title="Inativar Paciente" placement={placement} variant="medium">
        <p>Revise o impacto na agenda antes de confirmar.</p>
        <Button className="mt-4" color="red">Confirmar Inativação</Button>
      </DrawerModal>
    </>
  );
}

function DemoModalContent() {
  const [show, setShow] = useState(false);
  const [secondary, setSecondary] = useState(false);
  return (
    <>
      <Button onClick={() => { setSecondary(false); setShow(true); }}>Abrir modal</Button>
      <Modal id="g-modal-content-modal" show={show} onCancel={() => setShow(false)} title="Mapa de horas" withPadding={!secondary}>
        {secondary ? (
          <ModalContent title="Detalhes do período" onClose={() => setSecondary(false)}>
            <p>Horas planejadas e disponíveis do aplicador.</p>
          </ModalContent>
        ) : (
          <div>
            <p>Tela principal do mapa de horas.</p>
            <Button className="mt-4" onClick={() => setSecondary(true)}>Ver detalhes</Button>
          </div>
        )}
      </Modal>
    </>
  );
}

const SIMPLE_ROWS = [
  { id: 31, date: "04/08/2026", planned: 8, available: 6 },
  { id: 32, date: "05/08/2026", planned: 7, available: 7 },
];

function DemoSimpleTable() {
  return <SimpleTable><thead><tr><th>Data</th><th>Horas planejadas</th><th>Horas disponíveis</th></tr></thead><tbody>{SIMPLE_ROWS.map((row) => <tr key={row.id}><td>{row.date}</td><td>{row.planned} h</td><td>{row.available} h</td></tr>)}</tbody></SimpleTable>;
}

function DemoFlash() {
  const [shown, setShown] = useState(0);
  return <div className="flex flex-wrap gap-2"><Button size="small" onClick={() => setShown((n) => n + 1)}>Mostrar flash</Button>{shown > 0 && <Flash key={shown} kind={shown % 2 ? "info" : "error"} title={shown % 2 ? "Sucesso!" : "Erro!"}>{shown % 2 ? "Programa estruturado salvo." : "Não foi possível salvar o programa."}</Flash>}</div>;
}

function DemoFlashGroup() {
  const [shown, setShown] = useState(0);
  return <div><Button size="small" onClick={() => setShown((n) => n + 1)}>Mostrar flash_group</Button>{shown > 0 && <FlashGroup key={shown} flash={{ info: "Programa estruturado salvo." }} />}</div>;
}

function DemoSimpleForm() {
  const [disabled, setDisabled] = useState(false);
  return <div className="space-y-4"><SimpleForm disabled={disabled} onSubmit={(event) => event.preventDefault()} actions={[<><Button type="button" variant="outline">Cancelar</Button><Button type="submit">Salvar</Button></>]}><Input id="g-form-name" name="programa[nome]" label="Nome do programa" value="Imitação motora" /><Input type="textarea" id="g-form-objective" name="programa[objetivo]" label="Objetivo" value="Generalizar a imitação em contexto natural." /></SimpleForm><Button size="small" variant="outline" onClick={() => setDisabled((value) => !value)}>{disabled ? "disabled={false}" : "disabled"}</Button></div>;
}

function DemoEscolhas() {
  return (
    <div className="space-y-4">
      <RadioGroup
        label="Presença"
        field={{ id: "g-presenca", name: "presenca", value: "presente" }}
        radio={[
          { value: "presente", label: "Presente" },
          { value: "ausente", label: "Ausente" },
          { value: "justificada", label: "Falta justificada" },
        ]}
      />
      <RadioSelector
        label="Período"
        field={{ id: "g-periodo", name: "periodo", value: "dia" }}
        radio={[
          { value: "dia", label: "Dia" },
          { value: "semana", label: "Semana" },
          { value: "mes", label: "Mês", warningNumber: 3 },
        ]}
      />
      <CheckboxGroup
        label="Especialidades"
        field={{ id: "g-esp", name: "especialidades", value: ["fono"] }}
        checkbox={[
          { value: "fono", label: "Fonoaudiologia" },
          { value: "to", label: "Terapia ocupacional" },
          { value: "psico", label: "Psicologia" },
        ]}
      />
    </div>
  );
}

function DemoCincoCampos({ kind }: { kind: "input" | "checkgroup" | "fake-input" | "switch-card" | "fake-radio" }) {
  const [mostrarHorario, setMostrarHorario] = useState(false);
  if (kind === "input") return <div id="g-input-with-select-wrapper" className="max-w-3xl space-y-8">
      <InputWithSelect label="Critério de Avanço" textField={{ id: "g-criterio-frequencia", name: "programa[mastery_frequency]", value: "3" }} selectField={{ id: "g-criterio-tipo", name: "programa[mastery_criteria]", value: "consecutive" }} options={[["Sessões Cumulativas", "cumulative"], ["Sessões Consecutivas", "consecutive"]]} />
      <InputWithSelect label="Critério indisponível" textField={{ id: "g-criterio-bloqueado-frequencia", name: "programa[blocked_frequency]", value: "2" }} selectField={{ id: "g-criterio-bloqueado-tipo", name: "programa[blocked_criteria]", value: "cumulative" }} options={[["Sessões Cumulativas", "cumulative"]]} disabled />
    </div>;
  if (kind === "checkgroup") return <div id="g-checkgroup-wrapper" className="max-w-3xl">
      <Checkgroup label="Atende nos dias da semana" field={{ id: "g-dias", name: "unit_service_hour[service_hour][weekdays]", value: ["monday", "wednesday"] }} innerClass="flex-row flex-wrap" options={[["Segunda", "monday"], ["Quarta", "wednesday"], ["Sexta", "friday"], ["Domingo", "sunday"]]} />
    </div>;
  if (kind === "fake-input") return <div id="g-fake-input-wrapper" className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <FakeInput label="Paciente" value="Helena M." />
      <FakeInput label="Unidade" labelColor="blue" value="Unidade Girassol" rightIcon="fa-lock" />
    </div>;
  if (kind === "switch-card") return <form id="g-input-switch-card-wrapper" className="max-w-3xl">
      <InputSwitchCard label="Mostrar horário" active={{ id: "g-mostrar-horario", name: "relatorio[show_hours]", value: mostrarHorario }} className="max-w-48 px-3">
        <Input type="switch" field={{ id: "g-mostrar-horario", name: "relatorio[show_hours]", value: mostrarHorario }} onChange={(event) => setMostrarHorario(event.target.checked)} />
      </InputSwitchCard>
    </form>;
  return <div id="g-fake-radio-group-wrapper" className="max-w-3xl">
      <FakeRadioGroup label="Qual foi o Foco da Terapia na Sessão" selectedValue="habilidades-sociais" radio={[{ name: "therapy_focus", value: "comunicacao", label: "Comunicação" }, { name: "therapy_focus", value: "habilidades-sociais", label: "Habilidades sociais" }, { name: "therapy_focus", value: "autonomia", label: "Autonomia" }]} />
    </div>;
}

function DemoRangeDatePicker() {
  const [valor, setValor] = useState("2026-08-03#2026-08-09");
  return <div className="space-y-3"><RangeDatePicker label="Período" field={{ id: "g-periodo-dias", name: "filtro[periodo]", value: valor }} onChange={setValor} minDate="2026-08-01" maxDate="2026-09-30" className="max-w-sm" /><Button size="small" variant="outline" onClick={() => setValor("2026-09-07#2026-09-13")}>Carregar período externo</Button></div>;
}

function DemoRangeMonthPicker() {
  return <RangeMonthPicker label="Período dos programas" field={{ id: "g-periodo-meses", name: "filtro[meses]", value: "2026-01-01#2026-06-30" }} className="max-w-sm" />;
}

function DemoMonthPicker() {
  const [valor, setValor] = useState("2026-08-01");
  return <div className="space-y-3 pb-6"><MonthPicker label="Mês da avaliação" field={{ id: "g-mes-avaliacao", name: "avaliacao[mes]", value: valor, errors: ["Informe o mês da avaliação"] }} onChange={setValor} className="max-w-sm" /><Button size="small" variant="outline" onClick={() => setValor("2027-02-01")}>Carregar mês externo</Button></div>;
}

function DemoWeekSelector() {
  const [range, setRange] = useState({ first: "2025-12-29", last: "2026-01-04" });
  return <WeekSelector event={setRange} range={range} />;
}

function DemoSwitchCard() {
  return <div className="space-y-3"><SwitchCard field={{ id: "g-registro-abc", name: "programa[is_abc]", value: false }} title="Registro Tipo ABC" description="Ativa o formato ABC para detalhar o comportamento com antecedentes e consequências." /><SwitchCard field={{ id: "g-fase-manutencao", name: "programa[maintenance]", value: true }} title="Fase de manutenção" description="Mantém o programa em manutenção depois de adquirido." /></div>;
}

function DemoDateNavigator() {
  return <div className="space-y-3"><DateNavigator id="g-navegador-data" field={{ id: "filtro_data", name: "filtro[data]" }} date="2026-07-30" /><DateNavigator id="g-navegador-bloqueado" field={{ id: "filtro_data_bloqueada", name: "filtro[data_bloqueada]" }} date="2026-08-15" disable /></div>;
}

const EXISTING_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23dbf3fb'/%3E%3Ccircle cx='40' cy='30' r='13' fill='%232b235b'/%3E%3Cpath d='M16 76c2-19 12-29 24-29s22 10 24 29' fill='%232b235b'/%3E%3C/svg%3E";

function DemoImageUpload() {
  return <ImageUpload upload={{ ref: "phx-avatar-upload", name: "avatar", accept: ".jpg,.jpeg,.png" }} previousUrl={EXISTING_IMAGE} />;
}

const ESPECIALIDADES = [
  { label: "Aplicador ABA", value: "aba" },
  { label: "Fisioterapia", value: "physiotherapy" },
  { label: "Fonoaudiologia", value: "speech-therapy" },
  { label: "Psicologia", value: "psychology" },
  { label: "Terapia Ocupacional", value: "occupational-therapy" },
];

const buscarEspecialidades = (search: string) =>
  ESPECIALIDADES.filter((option) => option.label.toLowerCase().includes(search.toLowerCase()));

const PROGRAMAS_AGRUPADOS = [
  { group: "Aquisição", items: [{ label: "Imitação motora", value: "imitacao" }, { label: "Contato visual", value: "contato-visual" }] },
  { group: "Manutenção", color: "orange", items: [{ label: "Seguir instruções", value: "instrucoes" }] },
];

export const GALLERY: GalleryEntry[] = [
  {
    name: "button",
    origem: "core_components.ex → button/1",
    descricao: "O botão de ação. Quatro variantes, cinco cores, três tamanhos.",
    demos: [
      ...TAMANHOS.map((size) => ({
        titulo: `size="${size}": variant × color`,
        render: () => (
          <div className="space-y-3">
            {VARIANTES.map((variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-2">
                <span className="w-16 shrink-0 text-xs font-bold text-neutral-500">{variant}</span>
                {CORES.map((color) => (
                  <Button key={color} variant={variant} color={color} size={size}>
                    {color}
                  </Button>
                ))}
              </div>
            ))}
          </div>
        ),
      })),
      {
        titulo: "left_icon, right_icon, icon_type, notification_badge e disabled",
        render: () => (
          <div className="flex flex-wrap items-center gap-3">
            <Button leftIcon="fa-plus">Novo agendamento</Button>
            <Button rightIcon="fa-arrow-right" variant="outline">Avançar</Button>
            <Button leftIcon="fa-star" iconType="solid" variant="tint">Favorito</Button>
            <Button notificationBadge variant="tint" color="purple">Pendências</Button>
            <Button disabled>Desabilitado</Button>
          </div>
        ),
      },
    ],
  },
  { name: "tabs", origem: "tab_components.ex → wrapper/1", descricao: "Abas de texto com a linha azul sob a aba ativa.",
    demos: [{ titulo: "Com mobile_title", nota: "Abaixo de `md`, a segunda aba mostra o `mobile_title`.", render: () => <DemoTabs /> }] },
  { name: "card_tabs", origem: "tab_components.ex → card_wrapper/1", descricao: "Abas dentro de um cartão com cabeçalho; o conteúdo vem em cartão próprio.",
    demos: [{ titulo: "Com header e no_card", nota: "A terceira aba usa `no_card` e aparece sem cartão.", render: () => <DemoCardTabs /> }] },
  { name: "button_tabs", origem: "button_tab_components.ex → wrapper/1", descricao: "Abas em trilho, com um marcador que acompanha a seleção.",
    demos: [{ titulo: "size small, com actions e aba disabled", render: () => <DemoButtonTabs /> }] },
  { name: "dropdown_tabs", origem: "dropdown_tabs_components.ex → wrapper/1", descricao: "Abas de topo que abrem um menu com as abas filhas (`parent_id`).",
    demos: [{ titulo: "Headers com uma e com várias abas", nota: "Header com uma só aba seleciona direto, sem menu.", render: () => <DemoDropdownTabs /> }] },
  { name: "lazy_tabs", origem: "lazy_tab_component.ex → wrapper/1", descricao: "Abas com grupos em dropdown e conteúdo montado só quando a aba é aberta.",
    demos: [{ titulo: "Grupos, aba solta e aba sem component", nota: "“Faltas” não tem `component` e fica desabilitada; `false` na lista é ignorado.", render: () => <DemoLazyTabs /> }] },
  { name: "breadcrumbs", origem: "backoffice_components.ex → breadcrumbs/1", descricao: "Trilha do cabeçalho do backoffice (`@page_breadcrumbs`).",
    demos: [{ titulo: "Com e sem `to`", nota: "Escondida abaixo de `md`.", render: () => <Breadcrumbs items={[{ label: "Pacientes", to: "/backoffice/pacientes" }, { label: "Helena Martins", to: "/backoffice/pacientes/p1" }, { label: "Plano de Intervenção" }]} /> }] },
  { name: "drawer", origem: "backoffice_components.ex → drawer/1", descricao: "Menu lateral azul do backoffice e do portal da operadora.",
    demos: [{ titulo: "Recolhido e expandido", nota: "Recolhido, o nome do item aparece no tooltip. O layout Backoffice mostra o drawer no lugar.", render: () => <DemoDrawer /> }] },
  { name: "form_grid", origem: "backoffice_components.ex → form_grid/1", descricao: "Grade de campos de formulário.",
    demos: [{ titulo: "variant medium e small", render: () => <div>{(["medium", "small"] as const).map((variant) => <FormGrid key={variant} variant={variant}>{["Nome", "Nascimento", "CPF"].map((label) => <div key={label} className="rounded-lg bg-brand-blue/10 p-3 text-sm">{label}</div>)}</FormGrid>)}</div> }] },
  { name: "timer", origem: "backoffice_components.ex → timer/1", descricao: "Cronômetro do atendimento em curso, no cabeçalho.",
    demos: [{ titulo: "Atendimento de paciente", nota: "Conta a partir de `now`, sem ler o relógio do sistema.", render: () => <Timer now="2026-07-30T14:25:10" customService={{ id: "cs1", startedAt: "2026-07-30T14:00:00", title: "Helena Martins", scheduleType: "Paciente" }} /> }] },
  { name: "pagination", origem: "pagination_components.ex → render/1", descricao: "Paginação com três páginas em volta da atual.",
    demos: [{ titulo: "Início, meio e fim", render: () => <DemoPagination /> }] },
  { name: "notification", origem: "notification_component.ex → render/1", descricao: "O sino do cabeçalho, com a contagem e a lista de notificações.",
    demos: [{ titulo: "Com não lidas e vazio", render: () => <div className="flex gap-8 pl-80"><NotificationComponent notifications={[{ id: "n1", title: "Plano de intervenção aprovado", content: "O PIC de Helena Martins foi aprovado pela supervisão.", insertedAt: "há 2 horas" }, { id: "n2", title: "Autorização parcial", content: "A guia de Otávio Lima foi autorizada parcialmente.", insertedAt: "há 1 dia", readAt: "29/07/2026 10:12" }]} /><NotificationComponent /></div> }] },
  { name: "modal", origem: "core_components.ex → modal/1", descricao: "Diálogo sobreposto, fechado por Esc, pelo fundo ou pelo botão.",
    demos: [{ titulo: "variant", nota: "Sem `title`, o botão de fechar fica escondido e o slot `custom_title` ocupa o lugar.", render: () => <div className="flex flex-wrap gap-2">{(["extra_small", "small", "medium", "large"] as const).map((variant) => <DemoModal key={variant} variant={variant} />)}</div> }] },
  { name: "drawer_modal", origem: "core_components.ex → drawer_modal/1", descricao: "Painel que entra pela lateral, para formulários longos.",
    demos: [{ titulo: "placement right e left", render: () => <div className="flex flex-wrap gap-2"><DemoDrawerModal /><DemoDrawerModal placement="left" /></div> }] },
  { name: "modal_content", origem: "core_components.ex → modal_content/1", descricao: "Tela secundária de um modal de várias telas, com botão de voltar.",
    demos: [{ titulo: "Tela secundária do mapa de horas", render: () => <DemoModalContent /> }] },
  { name: "flash", origem: "core_components.ex → flash/1", descricao: "Aviso temporário de resultado de ação.", demos: [{ titulo: "kind info e error", nota: "Fixo no canto inferior direito; clicar em qualquer ponto do aviso o fecha.", render: () => <DemoFlash /> }] },
  { name: "flash_group", origem: "core_components.ex → flash_group/1", descricao: "A pilha de avisos temporários da página.", demos: [{ titulo: "Com flash de info", nota: "Os avisos de conexão (`client-error`, `server-error`) ficam escondidos.", render: () => <DemoFlashGroup /> }] },
  { name: "simple_form", origem: "core_components.ex → simple_form/1", descricao: "Formulário com espaçamento e ações padronizados.", demos: [{ titulo: "Com ações e disabled", render: () => <DemoSimpleForm /> }] },
  { name: "link_button", origem: "core_components.ex → link_button/1", descricao: "Link com aparência de botão, para navegação.", demos: [{ titulo: "variant × color", nota: "`color=\"purple\"` aplica `bg-brand-accent text-white` em qualquer variante, como no original.", render: () => <div className="space-y-3">{VARIANTES.map((variant) => <div key={variant} className="flex flex-wrap items-center gap-2"><span className="w-16 shrink-0 text-xs font-bold text-neutral-500">{variant}</span>{(["blue", "red", "purple"] as const).map((color) => <LinkButton key={color} navigate="#" variant={variant} color={color}>{color}</LinkButton>)}</div>)}<div className="flex flex-wrap gap-2"><LinkButton navigate="#" variant="outline" leftIcon="fa-arrow-left">Voltar</LinkButton><LinkButton navigate="#" rightIcon="fa-arrow-right">Avançar</LinkButton></div></div> }] },
  { name: "copy_button", origem: "core_components.ex → copy_button/1", descricao: "Botão que copia um valor para a área de transferência.", demos: [{ titulo: "variant × color, e size small", nota: "Cada clique copia `text_to_copy` e publica o toast “Copiado!” no `toast_wrapper`.", render: () => <div className="space-y-3">{VARIANTES.map((variant) => <div key={variant} className="flex flex-wrap items-center gap-2"><span className="w-16 shrink-0 text-xs font-bold text-neutral-500">{variant}</span>{(["blue", "red", "green", "purple"] as const).map((color) => <CopyButton key={color} id={`g-copy-${variant}-${color}`} textToCopy="https://exemplo.invalid/auto-checkin/unidade-girassol" variant={variant} color={color}>{color}</CopyButton>)}</div>)}<div className="flex flex-wrap items-center gap-2"><CopyButton id="g-copy-small" textToCopy="GUIA-SINTETICA-2026" size="small" variant="tint" rightIcon="fa-link">Link de Checkin</CopyButton></div><ToastWrapper /></div> }] },
  { name: "toast_wrapper", origem: "backoffice_components.ex → toast_wrapper/1", descricao: "Pilha de toasts do backoffice, alimentada pelo evento `phx:show-toast`.", demos: [{ titulo: "type success, error e info, com e sem closeTime", render: () => <div className="flex flex-wrap gap-2"><Button size="small" variant="tint" onClick={() => showToast({ title: "Copiado!", content: "Texto copiado para area de transferência", type: "success" })}>success</Button><Button size="small" variant="tint" color="red" onClick={() => showToast({ title: "Erro!", content: "Não foi possível salvar o programa.", type: "error", closeTime: 5000 })}>error, closeTime 5000</Button><Button size="small" variant="tint" color="purple" onClick={() => showToast({ title: "Atualizado", content: "O plano de intervenção foi atualizado.", type: "info", closeTime: 5000 })}>info, closeTime 5000</Button><ToastWrapper /></div> }] },
  {
    name: "input",
    origem: "core_components.ex → input/1",
    descricao: "O campo de formulário: uma cláusula por `type`, mais a que atende os tipos nativos.",
    demos: [
      {
        titulo: "Tipos nativos, com rótulo, ícone e hint",
        nota: "O `hint` cola à direita, com o canto reto.",
        render: () => (
          <div className="grid max-w-xl gap-4 md:grid-cols-2">
            <Input id="g-nome" label="Nome do paciente" placeholder="Nome completo" />
            <Input id="g-busca" label="Buscar" leftIcon="fa-magnifying-glass" placeholder="Paciente" />
            <Input id="g-horas" type="number" label="Carga semanal" hint="horas" value="20" />
            <Input id="g-data" type="date" label="Data de nascimento" value="2020-03-14" />
            <Input id="g-desab" label="Somente leitura" value="Não editável" disabled />
            <Input id="g-senha" type="password" label="Senha" rightIcon="fa-eye" value="segredo" />
          </div>
        ),
      },
      {
        titulo: "Com erro",
        nota: "O erro fica em `absolute -bottom-6`: o campo não muda de altura.",
        render: () => (
          <div className="max-w-sm pb-6">
            <Input id="g-cep" label="CEP" value="04567" errors={["CEP inválido"]} />
          </div>
        ),
      },
      {
        titulo: "type=\"select\"",
        nota: "Renderiza o `CustomSelectComponent`: opções flutuantes, destaque por teclado, limpar e check.",
        render: () => <DemoSelect />,
      },
      {
        titulo: "textarea, checkbox, switch e value_switch",
        render: () => (
          <div className="max-w-xl space-y-3">
            <Input type="textarea" id="g-obs" label="Observação" placeholder="Como foi o atendimento" />
            <Input type="checkbox" id="g-check" name="programa[supervisao]" label="Exige supervisão" value />
            <Input type="switch" id="g-switch" name="programa[renovacao]" label="Renovação automática" value />
            <Input type="value_switch" name="programa[dias]" label="Segunda" inputValue="monday" value={["monday"]} />
          </div>
        ),
      },
      {
        titulo: "counter e slider",
        render: () => (
          <div className="max-w-xl space-y-6">
            <Input type="counter" id="g-tentativas" name="programa[tentativas]" label="Tentativas por sessão" value="3" max={10} />
            <Input type="slider" name="avaliacao[nivel]" label="Nível de ajuda" options={[["Independente", "0"], ["Verbal", "1"], ["Gestual", "2"], ["Física", "3"]]} value="1" />
          </div>
        ),
      },
      {
        titulo: "select_search, multi_select_search, tags e rich_text",
        render: () => (
          <div className="max-w-xl space-y-6">
            <Input type="select_search" id="g-select-search" name="profissional[especialidade]" label="Especialidade" prompt="Buscar especialidade" options={ESPECIALIDADES} callback={buscarEspecialidades} />
            <Input type="multi_select_search" id="g-multi-select-search" name="programa[especialidades]" label="Especialidades" prompt="Selecione" options={ESPECIALIDADES} value={["aba", "psychology"]} callback={buscarEspecialidades} />
            <Input type="tags" id="g-tags" name="programa[palavras]" label="Palavras-chave" value={["imitação", "contato visual"]} />
            <Input type="rich_text" id="g-rich-text" name="evolucao[texto]" label="Evolução" value="<p>Sessão com boa adesão às tentativas.</p>" />
          </div>
        ),
      },
    ],
  },
  { name: "input_with_select", origem: "core_components.ex → input_with_select/1", descricao: "Campo de texto e seleção colados sob o mesmo rótulo.", demos: [{ titulo: "Frequência e critério", render: () => <DemoCincoCampos kind="input" /> }] },
  { name: "checkgroup", origem: "core_components.ex → checkgroup/1", descricao: "Grupo de caixas de seleção com rótulo comum.", demos: [{ titulo: "Dias de atendimento", nota: "`variant` é repassado, mas a cláusula lê `color`: no original ele não tem efeito.", render: () => <DemoCincoCampos kind="checkgroup" /> }] },
  { name: "fake_input", origem: "core_components.ex → fake_input/1", descricao: "Valor somente-leitura com aparência de campo.", demos: [{ titulo: "label_color default e blue", render: () => <DemoCincoCampos kind="fake-input" /> }] },
  { name: "input_switch_card", origem: "core_components.ex → input_switch_card/1", descricao: "Cartão cuja cor acompanha o campo `active`.", demos: [{ titulo: "Estado colore o cartão", render: () => <DemoCincoCampos kind="switch-card" /> }] },
  { name: "fake_radio_group", origem: "core_components.ex → fake_radio_group/1", descricao: "Grupo de opções não editável, para exibição.", demos: [{ titulo: "Resposta registrada", nota: "Só a opção selecionada fica habilitada.", render: () => <DemoCincoCampos kind="fake-radio" /> }] },
  { name: "radio_group", origem: "core_components.ex → radio_group/1", descricao: "Escolha única entre opções soltas.",
    demos: [{ titulo: "radio_group, radio_selector e checkbox_group", render: () => <DemoEscolhas /> }],
  },
  { name: "radio_selector", origem: "core_components.ex → radio_selector/1", descricao: "Escolha única em barra segmentada.",
    demos: [
      {
        titulo: "Com label, ícone e warning_number",
        render: () => (
          <RadioSelector
            field={{ id: "g-sel", name: "visao", value: "semana" }}
            radio={[
              { value: "dia", label: "Dia" },
              { value: "semana", label: "Semana" },
              { value: "lista", icon: "fa-list", title: "Lista", warningNumber: 2 },
            ]}
          />
        ),
      },
    ],
  },
  { name: "checkbox_group", origem: "core_components.ex → checkbox_group/1", descricao: "Escolha múltipla em grupo.",
    demos: [
      {
        titulo: "Escolha múltipla",
        render: () => (
          <CheckboxGroup
            label="Documentos entregues"
            field={{ id: "g-doc", name: "documentos", value: ["rg"] }}
            checkbox={[
              { value: "rg", label: "Identidade" },
              { value: "cpf", label: "CPF" },
              { value: "laudo", label: "Laudo", disable: true },
            ]}
          />
        ),
      },
    ],
  },
  {
    name: "label",
    origem: "core_components.ex → label/1",
    descricao: "Rótulo de campo.",
    demos: [
      {
        titulo: "color default e purple",
        render: () => (
          <div className="space-y-2">
            <Label>Nome do paciente</Label>
            <Label color="purple">Perfil de acesso</Label>
          </div>
        ),
      },
    ],
  },
  {
    name: "error",
    origem: "core_components.ex → error/1",
    descricao: "Mensagem de erro de campo.",
    demos: [
      {
        titulo: "Com ícone, e cortada em duas linhas",
        nota: "`line-clamp-2` com o texto inteiro no `title`.",
        render: () => (
          <div className="max-w-sm space-y-2">
            <FieldError message="CEP inválido">CEP inválido</FieldError>
            <FieldError message="O profissional já tem um atendimento em aberto neste horário, e a agenda não permite dois ao mesmo tempo para a mesma pessoa.">
              O profissional já tem um atendimento em aberto neste horário, e a agenda não permite dois ao mesmo tempo para a mesma pessoa.
            </FieldError>
          </div>
        ),
      },
    ],
  },
  { name: "custom_select", origem: "custom_select_component.ex → BloomyWeb.CustomSelectComponent", descricao: "Seleção com painel próprio; é o que `input/1` usa em `type=\"select\"` e `\"custom_select\"`.",
    demos: [{ titulo: "Opções agrupadas, com cor por grupo", render: () => <div className="max-w-sm"><Input type="custom_select" id="g-custom-select" name="programa[id]" label="Programa" prompt="Selecione o programa" options={PROGRAMAS_AGRUPADOS} value="instrucoes" /></div> }],
  },
  { name: "select_search", origem: "select_search_component.ex → BloomyWeb.SelectSearchComponent", descricao: "Seleção com busca no painel.",
    demos: [{ titulo: "Busca, limpar busca e busca avançada", render: () => <div className="max-w-sm"><Input type="select_search" id="g-select-search-2" name="agenda[profissional]" label="Profissional" prompt="Buscar" leftIcon="fa-user" options={ESPECIALIDADES} callback={buscarEspecialidades} searchAction={() => undefined} value="speech-therapy" /></div> }],
  },
  { name: "multi_select_search", origem: "multi_select_search_component.ex → BloomyWeb.MultiSelectSearchComponent", descricao: "Seleção múltipla com busca; as escolhidas viram etiquetas.",
    demos: [{ titulo: "Grupos e \"Selecionados\"", nota: "Com opções agrupadas, as escolhidas sobem para o grupo \"Selecionados\".", render: () => <div className="max-w-sm"><Input type="multi_select_search" id="g-multi-grupos" name="plano[programas]" label="Programas" prompt="Selecione" options={PROGRAMAS_AGRUPADOS} value={["imitacao"]} /></div> }],
  },
  { name: "multi_select", origem: "multi_select_component.ex → BloomyWeb.MultiSelectComponent", descricao: "Seleção múltipla sem busca; a escolhida aparece em vermelho com \"Remover\".",
    demos: [{ titulo: "Etiquetas e +N", render: () => <div className="max-w-xs"><MultiSelect id="g-multi-select" label="Serviços" prompt="Selecione" field={{ id: "servico_ids", name: "servico[ids]", value: ["1", "2", "3"] }} options={[{ id: "1", label: "Psicologia ABA" }, { id: "2", label: "Fonoaudiologia" }, { id: "3", label: "Terapia ocupacional", details: "TO" }, { id: "4", label: "Fisioterapia" }]} /></div> }],
  },
  { name: "multi_tag_select", origem: "multi_tag_select_component.ex → BloomyWeb.MultiTagSelectComponent", descricao: "Etiquetas digitadas; é o `input/1` com `type=\"tags\"`.",
    demos: [{ titulo: "Enter adiciona, Backspace remove", render: () => <div className="max-w-sm"><Input type="tags" id="g-tags-2" name="paciente[apelidos]" label="Apelidos" value={["Lelê"]} /></div> }],
  },
  { name: "rich_text", origem: "rich_text_components.ex → BloomyWeb.RichTextComponents", descricao: "Editor Quill com barra própria; é o `input/1` com `type=\"rich_text\"`.",
    demos: [{ titulo: "Títulos, texto padrão e IA", render: () => <Input type="rich_text" id="g-rich-text-2" name="plano[descricao]" label="Plano de intervenção" showHeadings patternModule="intervention_plan" patterns={[{ name: "Abertura", text: "Paciente chegou acompanhado do responsável legal." }]} aiGenerate={(update, complete) => { update("Sessão com 8 tentativas, 6 independentes."); complete("Sessão com 8 tentativas, 6 independentes."); }} value="<p>Objetivo: generalizar a imitação motora.</p>" /> }],
  },
  { name: "brand_button", origem: "brand_components.ex → brand_button/1", descricao: "Botão das telas de marca (login, portais).",
    demos: [{ titulo: "color, variant e size", render: () => <div className="flex flex-wrap items-center gap-3"><BrandButton>Entrar</BrandButton><BrandButton color="light-purple">Continuar</BrandButton><BrandButton color="red" rightIcon="fa-arrow-right">Sair</BrandButton><BrandButton variant="tint" size="small">Voltar</BrandButton><BrandButton disabled>Indisponível</BrandButton></div> }],
  },
  { name: "brand_input", origem: "brand_components.ex → brand_input/1", descricao: "Campo das telas de marca.",
    demos: [{ titulo: "color white e dark-purple", render: () => <div className="max-w-sm space-y-8 pb-6"><BrandInput name="user[email]" type="email" placeholder="E-mail" /><BrandInput name="user[password]" type="password" color="dark-purple" placeholder="Senha" errors={["senha incorreta"]} /></div> }],
  },
  { name: "file_uploader", origem: "file_uploader_components.ex → BloomyWeb.FileUploaderComponents", descricao: "Área de arraste com a lista de arquivos escolhidos.",
    demos: [
      { titulo: "variant default", render: () => <FileUploader upload={{ ref: "phx-documentos", name: "documentos", accept: ".pdf,.jpg,.jpeg,.png", maxEntries: 6, maxFileSize: 10_000_000 }} /> },
      { titulo: "variant simplified", render: () => <FileUploader variant="simplified" upload={{ ref: "phx-documento", name: "documento", accept: ".pdf", maxFileSize: 5_000_000, entries: [{ ref: "0", clientName: "laudo-sintetico.pdf", clientSize: 245_000, progress: 40, done: false }, { ref: "1", clientName: "planilha.xlsx", clientSize: 12_000_000, progress: 0, done: false, errors: ["too_large", "not_accepted"] }] }} /> },
    ],
  },
  { name: "item", origem: "file_uploader_components.ex → item/1", descricao: "Arquivo já anexado, com link e remoção.",
    demos: [{ titulo: "variant default e simplified", render: () => <div className="max-w-xl space-y-3"><FileItem fileName="relatorio-sintetico.pdf" size={1_500_000} category="clinical" removeEvent={() => undefined} /><FileItem variant="simplified" fileName="contrato.docx" size={0} category="administrative" removeEvent={() => undefined} /></div> }],
  },
  { name: "radio_cards", origem: "core_components.ex → radio_cards/1", descricao: "Opções em cartões; a escolhida abre o próprio conteúdo.",
    demos: [{ titulo: "Com badge e conteúdo", render: () => <div className="max-w-xl"><RadioCards id="g-radio-cards" title="Tipo de atendimento" value="clinica" option={[{ id: "clinica", title: "Na clínica", subtitle: "Sessão presencial na unidade", icon: "fa-house", children: <p className="text-sm">Check-in pelo totem.</p> }, { id: "domiciliar", title: "Domiciliar", subtitle: "Sessão na casa do paciente", badge: "Novo", icon: "fa-car" }]} /></div> }],
  },
  { name: "header", origem: "core_components.ex → header/1", descricao: "Cabeçalho de seção, com título e ações.",
    demos: [
      {
        titulo: "variant small, default e large, com subtitle e actions",
        render: () => (
          <div className="space-y-6">
            <Header variant="small">Título pequeno</Header>
            <Header subtitle="Com subtítulo abaixo">Título padrão</Header>
            <Header variant="large" actions={<Button size="medium">Nova</Button>}>
              Título grande
            </Header>
          </div>
        ),
      },
    ],
  },
  {
    name: "table",
    origem: "core_components.ex → table/1",
    descricao: "Tabela de listagem, com colunas e ações por linha.",
    demos: [
      {
        titulo: "Com col e action",
        render: () => (
          <Table
            id="g-table"
            rows={LINHAS}
            rowId={(l) => `g-table-${l.horario}`}
            col={[
              { label: "Horário", render: (l) => l.horario },
              { label: "Paciente", render: (l) => l.paciente },
              { label: "Serviço", render: (l) => l.servico },
              { label: "Situação", render: (l) => <StatusTag status={l.situacao} title={l.situacao ? "Ativo" : "Inativo"} /> },
            ]}
            action={[() => <a href="#">Editar</a>, () => <a href="#">Excluir</a>]}
          />
        ),
      },
      {
        titulo: "Vazia",
        nota: "A linha de `empty_message` existe sempre, escondida; `first:table-row` a revela.",
        render: () => (
          <Table
            id="g-table-empty"
            rows={[] as typeof LINHAS}
            col={[
              { label: "Horário", render: (l) => l.horario },
              { label: "Paciente", render: (l) => l.paciente },
            ]}
          />
        ),
      },
    ],
  },
  { name: "simple_table", origem: "core_components.ex → simple_table/1", descricao: "Tabela simples: só o invólucro e os estilos, com a marcação escrita por quem usa.", demos: [{ titulo: "Horas do profissional", render: () => <DemoSimpleTable /> }] },
  { name: "list", origem: "core_components.ex → list/1", descricao: "Lista de descrição, termo e valor.",
    demos: [
      {
        titulo: "Slot item com title",
        render: () => (
          <List
            item={[
              { title: "Paciente", children: "Helena M." },
              { title: "Convênio", children: "Unimed" },
              { title: "Responsável", children: "Renata Alencar" },
            ]}
          />
        ),
      },
    ],
  },
  { name: "back", origem: "core_components.ex → back/1", descricao: "Link de voltar.",
    demos: [{ titulo: "Link de voltar", render: () => <Back navigate="#">Voltar para pacientes</Back> }],
  },
  {
    name: "card",
    origem: "core_components.ex → card/1",
    descricao: "Cartão de conteúdo.",
    demos: [
      {
        titulo: "Branco por padrão, e colorido quando a classe já traz fundo",
        nota: "`extract_bg_class/1`: o branco só entra se a classe não tiver `bg-*`.",
        render: () => (
          <div className="flex flex-wrap gap-4">
            <Card className="w-64">
              <p className="text-sm text-brand-purple-dark">Cartão padrão, fundo branco.</p>
            </Card>
            <Card className="w-64 bg-brand-blue/20">
              <p className="text-sm text-brand-purple-dark">class=&quot;bg-brand-blue/20&quot;</p>
            </Card>
          </div>
        ),
      },
    ],
  },
  {
    name: "info_card",
    origem: "core_components.ex → info_card/1",
    descricao: "Cartão de destaque com ícone e número.",
    demos: [
      {
        titulo: "As cinco variantes",
        render: () => (
          <div className="flex flex-wrap gap-6">
            <InfoCard variant="blue" icon="fa-calendar-day" info="34" title="Atendimentos hoje" />
            <InfoCard variant="orange" icon="fa-clock" info="6" title="Em atraso" />
            <InfoCard variant="accent" icon="fa-users" info="128" title="Pacientes ativos" />
            <InfoCard variant="green" icon="fa-check" info="92%" title="Presença" />
            <InfoCard variant="info" icon="fa-bullhorn" info="3" title="Autorizações" />
          </div>
        ),
      },
      {
        titulo: "Sem info",
        nota: "Sem `info`, o original mostra uma barra pulsando no lugar do número.",
        render: () => <InfoCard variant="blue" icon="fa-calendar-day" title="Atendimentos hoje" />,
      },
    ],
  },
  { name: "inside_card", origem: "core_components.ex → inside_card/1", descricao: "Cartão aninhado, sem sombra própria.",
    demos: [
      {
        titulo: "Ícone, título, subtítulo e valor",
        render: () => (
          <div className="max-w-md space-y-2">
            <InsideCard icon="fa-clock" title="Horas previstas" subtitle="No mês" value="128h" />
            <InsideCard icon="fa-user-md" title="Profissionais" subtitle="Ativos na unidade" value="14" />
          </div>
        ),
      },
    ],
  },
  { name: "dropdown", origem: "core_components.ex → dropdown/1", descricao: "Menu suspenso ancorado num gatilho livre.",
    demos: [{ titulo: "placement bottom-end, bottom-start e bottom", nota: "Qualquer clique fora do gatilho fecha o menu, inclusive num item.", render: () => <div className="flex flex-wrap gap-6">{(["bottom-end", "bottom-start", "bottom"] as const).map((placement) => <Dropdown key={placement} id={`g-drop-${placement}`} placement={placement} items={<div>{["Unidade Jardim", "Unidade Girassol"].map((unit) => <a key={unit} href="#" onClick={(event) => event.preventDefault()} className="relative flex cursor-pointer select-none hover:bg-neutral-100/40 items-center rounded px-2 py-1.5 text-sm">{unit}</a>)}</div>}><Button variant="outline" size="medium">{placement}</Button></Dropdown>)}</div> }] },
  { name: "dropdown_menu", origem: "core_components.ex → dropdown_menu/1", descricao: "Os três pontinhos e uma lista de ações.",
    demos: [{ titulo: "Ações de um paciente", render: () => <DropdownMenu id="g-menu" items={[<Button type="button" variant="ghost" leftIcon="fa-scale-balanced">Liminar</Button>, <Button type="button" variant="ghost" leftIcon="fa-list-check">Acompanhamento</Button>, <Button type="button" className="text-red" variant="ghost" leftIcon="fa-power-off">Inativar</Button>]} /> }] },
  { name: "meta_info", origem: "core_components.ex → meta_info/1", descricao: "Contagem de registros da página, abaixo de uma listagem paginada.",
    demos: [
      {
        titulo: "Com registros e sem",
        nota: "O início é `current_offset + 1`, exceto quando o total é zero.",
        render: () => (
          <div className="space-y-1">
            <MetaInfo meta={{ currentOffset: 0, pageSize: 20, totalCount: 128 }} />
            <MetaInfo meta={{ currentOffset: 120, pageSize: 20, totalCount: 128 }} />
            <MetaInfo meta={{ currentOffset: 0, pageSize: 20, totalCount: 0 }} />
          </div>
        ),
      },
    ],
  },
  { name: "image_upload", origem: "core_components.ex → image_upload/1", descricao: "Envio de imagem com pré-visualização.",
    demos: [{ titulo: "Com previous_url", nota: "A última escolha substitui a imagem existente.", render: () => <DemoImageUpload /> }],
  },
  { name: "avatar", origem: "core_components.ex → avatar/1", descricao: "Foto de uma pessoa, ou o fundo azul quando não há foto.",
    demos: [
      {
        titulo: "size e shape",
        nota: "`custom` não aplica tamanho: quem usa passa a altura e a largura em `class`.",
        render: () => (
          <div className="flex flex-wrap items-end gap-3">
            {(["extra_small", "small", "medium", "extra_medium", "large", "extra_large"] as const).map((size) => (
              <Avatar key={size} size={size} title={size} />
            ))}
            <Avatar size="custom" className="h-8 w-8" title="custom" />
            <Avatar shape="square" size="large" title="square" />
          </div>
        ),
      },
    ],
  },
  { name: "progress", origem: "core_components.ex → progress/1", descricao: "Barra de progresso.",
    demos: [
      {
        titulo: "As quatro variantes e show_percentage",
        nota: "`purple` não tem cor de trilho própria no original: fica com o `bg-blue/20` da classe base.",
        render: () => (
          <div className="max-w-md space-y-3">
            <Progress value={72} />
            <Progress value={45} variant="accent" />
            <Progress value={18} variant="error" />
            <Progress value={90} variant="purple" />
            <Progress value={60} showPercentage={false} />
          </div>
        ),
      },
    ],
  },
  {
    name: "tag",
    origem: "core_components.ex → tag/1",
    descricao: "Etiqueta de categoria.",
    demos: [
      {
        titulo: "As catorze variantes",
        nota: "`light-red` está nos valores do attr, mas não tem classe no original.",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            {TAGS.map((v) => (
              <Tag key={v} item={v} variant={v} />
            ))}
          </div>
        ),
      },
      {
        titulo: "pill, left_icon e icon",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            {TAGS.map((v) => (
              <Tag key={v} item={v} variant={v} pill />
            ))}
            <Tag item="Padrão" variant="brand" leftIcon="fa-lock" />
            <Tag item="13" variant="orange" icon="fa-triangle-exclamation" />
          </div>
        ),
      },
    ],
  },
  {
    name: "tag_list",
    origem: "core_components.ex → tag_list/1",
    descricao: "Conjunto de etiquetas, com transbordo.",
    demos: [
      {
        titulo: "As cinco variantes, com limit",
        nota: "Acima de `limit`, o excedente vira `+N` e os nomes ficam no `title`.",
        render: () => (
          <div className="space-y-2">
            <TagList items={["Fonoaudiologia", "Terapia ocupacional", "Psicologia"]} />
            {TAG_LIST_VARIANTS.map((variant) => (
              <TagList
                key={variant}
                variant={variant}
                items={["Fonoaudiologia", "Terapia ocupacional", "Psicologia", "Psicomotricidade"]}
                limit={2}
              />
            ))}
          </div>
        ),
      },
    ],
  },
  {
    name: "status_tag",
    origem: "core_components.ex → status_tag/1",
    descricao: "Ponto de situação, verde ou vermelho.",
    demos: [
      {
        titulo: "status true e false",
        render: () => (
          <div className="flex items-center gap-4 text-sm text-brand-purple-dark">
            <span className="flex items-center gap-2">
              <StatusTag status title="Ativo" /> Ativo
            </span>
            <span className="flex items-center gap-2">
              <StatusTag status={false} title="Inativo" /> Inativo
            </span>
          </div>
        ),
      },
    ],
  },
  { name: "empty_state_card", origem: "core_components.ex → empty_state_card/1", descricao: "Cartão de lista vazia.",
    demos: [
      {
        titulo: "Com e sem inner_block",
        render: () => (
          <div className="space-y-4">
            <EmptyStateCard icon="fa-calendar-day" text="Nenhum atendimento para hoje">
              Os agendamentos criados na recepção aparecem aqui.
            </EmptyStateCard>
            <EmptyStateCard icon="fa-folder-open" text="Nenhum documento" />
          </div>
        ),
      },
    ],
  },
  { name: "range_datepicker", origem: "core_components.ex → range_datepicker/1", descricao: "Seleção de intervalo de datas.", demos: [{ titulo: "Com min_date e max_date", nota: "O valor só muda quando as duas pontas foram escolhidas.", render: () => <DemoRangeDatePicker /> }] },
  { name: "range_monthpicker", origem: "core_components.ex → range_monthpicker/1", descricao: "Seleção de intervalo de meses.", demos: [{ titulo: "Intervalo mensal", nota: "A segunda ponta é gravada como o último dia do mês.", render: () => <DemoRangeMonthPicker /> }] },
  { name: "monthpicker", origem: "core_components.ex → monthpicker/1", descricao: "Seleção de um mês.", demos: [{ titulo: "Mês único", nota: "A visão usa “Ago 2026”; o valor enviado é `2026-08-01`.", render: () => <DemoMonthPicker /> }] },
  { name: "week_selector", origem: "core_components.ex → week_selector/1", descricao: "Navegação por semana.", demos: [{ titulo: "Navegação por semana", nota: "As duas setas deslocam início e fim por exatamente sete dias.", render: () => <DemoWeekSelector /> }] },
  { name: "tooltip", origem: "core_components.ex → tooltip/1", descricao: "Dica de contexto ancorada num elemento.",
    demos: [
      {
        titulo: "placement right e top",
        render: () => (
          <div className="flex gap-4">
            <Tooltip id="g-tip" tooltipTrigger={<Button variant="tint" size="medium">Passe o mouse</Button>} tooltipContent="Mapa da Unidade" />
            <Tooltip id="g-tip-top" placement="top" tooltipTrigger={<Button variant="outline" size="medium">Acima</Button>} tooltipContent="Programa estruturado" />
          </div>
        ),
      },
    ],
  },
  { name: "timeline_list", origem: "core_components.ex → timeline_list/1", descricao: "Linha do tempo de eventos.", demos: [{ titulo: "Slot item com icon e color", render: () => <TimelineList item={[{ icon: "fa-pencil", color: "green", children: <><div className="mb-2"><Tag item="Criado" variant="green" className="mr-1.5" /> por <span className="font-bold text-brand-blue underline">Marina Alves</span></div><p className="mb-1 text-sm text-brand-purple-dark/80">Documento inicial anexado à unidade.</p><time className="text-sm text-brand-purple-dark/80">30/07/2026 às 09:15</time></> }, { icon: "fa-rotate", color: "blue", children: <><div className="mb-2"><Tag item="Editado" variant="light-blue" className="mr-1.5" /> por <span className="font-bold text-brand-blue underline">Caio Nunes</span></div><p className="mb-1 text-sm text-brand-purple-dark/80">Validade do documento atualizada.</p><time className="text-sm text-brand-purple-dark/80">01/08/2026 às 14:40</time></> }]} /> }] },
  { name: "loading_card", origem: "core_components.ex → loading_card/1", descricao: "Cartão de carregamento.",
    demos: [{ titulo: "Mensagem e roda", render: () => <LoadingCard message="Carregando os fechamentos" /> }],
  },
  { name: "switch_card", origem: "core_components.ex → switch_card/1", descricao: "Cartão com título, descrição e chave liga-desliga.", demos: [{ titulo: "Desligado e ligado", render: () => <DemoSwitchCard /> }] },
  { name: "date_navigator", origem: "core_components.ex → date_navigator/1", descricao: "Navegação por dia, com setas e calendário.", demos: [{ titulo: "Hoje e com disable", nota: "Como no original, `disable` só desliga as setas; o calendário continua abrindo.", render: () => <DemoDateNavigator /> }] },
  { name: "kbd", origem: "core_components.ex → kbd/1", descricao: "Tecla de atalho, para indicar o teclado ao lado de uma ação.", demos: [{ titulo: "Atalhos", render: () => <div className="flex items-center gap-2 text-sm text-brand-purple-dark"><Kbd>Ctrl</Kbd><Kbd>K</Kbd><span>Buscar paciente</span></div> }] },
];

export const portados = () => GALLERY.filter((e) => e.demos !== undefined);

type GalleryFixtureData = {
  demoId: string;
};

function fixtureIdFor(title: string, index: number) {
  return (
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `exemplo-${index + 1}`
  );
}

/**
 * Catálogo que alimenta a aba `Componentes` do motor.
 *
 * Só uma entrada com demonstração pode ser aberta como preview. Os pendentes
 * continuam visíveis na página completa, mas não fingem ser uma composição
 * navegável. Hoje os 47 componentes de `core_components.ex` estão portados, e
 * `button_tabs` e `lazy_tabs` também entram a partir dos arquivos próprios do sistema.
 */
/** Grupo de navegação de cada componente no catálogo. */
const GROUP_OF: Record<string, string> = {
  button: "Ações",
  link_button: "Ações",
  copy_button: "Ações",
  brand_button: "Ações",
  kbd: "Ações",
  input: "Formulários",
  label: "Formulários",
  error: "Formulários",
  fake_input: "Formulários",
  input_with_select: "Formulários",
  input_switch_card: "Formulários",
  switch_card: "Formulários",
  checkgroup: "Formulários",
  checkbox_group: "Formulários",
  radio_group: "Formulários",
  fake_radio_group: "Formulários",
  radio_selector: "Formulários",
  radio_cards: "Formulários",
  simple_form: "Formulários",
  form_grid: "Formulários",
  brand_input: "Formulários",
  rich_text: "Formulários",
  custom_select: "Seleção",
  select_search: "Seleção",
  multi_select: "Seleção",
  multi_select_search: "Seleção",
  multi_tag_select: "Seleção",
  dropdown: "Seleção",
  dropdown_menu: "Seleção",
  range_datepicker: "Datas",
  range_monthpicker: "Datas",
  monthpicker: "Datas",
  week_selector: "Datas",
  date_navigator: "Datas",
  timer: "Datas",
  file_uploader: "Arquivos",
  item: "Arquivos",
  image_upload: "Arquivos",
  table: "Dados",
  simple_table: "Dados",
  list: "Dados",
  meta_info: "Dados",
  pagination: "Dados",
  timeline_list: "Dados",
  progress: "Dados",
  avatar: "Dados",
  tag: "Dados",
  tag_list: "Dados",
  status_tag: "Dados",
  card: "Estrutura",
  info_card: "Estrutura",
  inside_card: "Estrutura",
  header: "Estrutura",
  back: "Estrutura",
  empty_state_card: "Estrutura",
  loading_card: "Estrutura",
  breadcrumbs: "Estrutura",
  drawer: "Estrutura",
  tabs: "Abas",
  card_tabs: "Abas",
  button_tabs: "Abas",
  dropdown_tabs: "Abas",
  lazy_tabs: "Abas",
  modal: "Sobreposição",
  modal_content: "Sobreposição",
  drawer_modal: "Sobreposição",
  tooltip: "Sobreposição",
  flash: "Feedback",
  flash_group: "Feedback",
  toast_wrapper: "Feedback",
  notification: "Feedback",
};

const GROUP_ORDER = [...new Set(Object.values(GROUP_OF)), "Outros"];

function sortByGroup(previews: ComponentPreview[]) {
  return [...previews].sort((a, b) => GROUP_ORDER.indexOf(a.group!) - GROUP_ORDER.indexOf(b.group!));
}

export const COMPONENT_PREVIEWS: ComponentPreview[] = sortByGroup( portados().map((entry) => {
  const fixtures = (entry.demos ?? []).map((demo, index) => {
    const demoId = fixtureIdFor(demo.titulo, index);
    return {
      id: demoId,
      label: demo.titulo,
      description: demo.nota,
      data: { demoId },
    };
  });

  function Preview({ data }: ComponentPreviewProps) {
    const demoId = (data as GalleryFixtureData | undefined)?.demoId ?? fixtures[0]?.id;

    return (
      <main className="min-h-full bg-background px-6 py-8 text-neutral-900">
        <div className="mx-auto max-w-[64rem]">
          <header className="mb-5">
            <p className="m-0 mb-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-neutral-500">
              {entry.origem}
            </p>
            <h1 className="m-0 text-[1.5rem] font-bold">{entry.name}</h1>
            <p className="m-0 mt-1 text-[0.875rem] text-neutral-600">{entry.descricao}</p>
          </header>
          <section
            aria-label={`Demonstrações de ${entry.name}`}
            className="rounded-2xl bg-white px-5 py-5 shadow-main"
          >
            <GalleryEntryPreview entry={entry} demoId={demoId} />
          </section>
        </div>
      </main>
    );
  }

  return {
    id: `core.${entry.name.replaceAll("_", "-")}`,
    name: entry.name,
    group: GROUP_OF[entry.name] ?? "Outros",
    description: entry.descricao,
    source: entry.origem,
    preview: Preview,
    fixtures,
    defaultFixture: fixtures[0]?.id,
  };
}));
