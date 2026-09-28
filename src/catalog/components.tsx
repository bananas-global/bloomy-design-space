import { useState, type ReactNode } from "react";
import type { ComponentPreview, ComponentPreviewProps } from "@brucesantos/design-space";
import { Button } from "../components/Button.js";
import { Card, InfoCard } from "../components/Card.js";
import { StatusTag, Tag, TagList, type TagVariant } from "../components/Tag.js";
import { SimpleTable, Table } from "../components/Table.js";
import { Checkbox, FakeInput, FieldError, Input, InputSwitchCard, InputWithSelect, Label, Select, Switch, SwitchCard, Textarea } from "../components/Input.js";
import {
  Avatar, Back, DescriptionList, EmptyStateCard, InsideCard,
  LoadingCard, MetaInfo, Progress, SectionHeader, TimelineList,
} from "../components/Layout.js";
import { DrawerModal, Dropdown, DropdownMenu, Modal, ModalContent } from "../components/Overlay.js";
import { CheckboxGroup, Checkgroup, FakeRadioGroup, RadioGroup, RadioSelector, Tooltip } from "../components/Choice.js";
import {
  DateNavigator, MonthPicker, RangeDatePicker, RangeMonthPicker, WeekSelector,
} from "../components/DatePickers.js";
import { Flash, FlashGroup, SimpleForm } from "../components/Feedback.js";
import { ImageUpload } from "../components/ImageUpload.js";
import { CopyButton, LinkButton, ToastHost } from "../components/Action.js";
import { ButtonTabs, LazyTabs } from "../components/Tabs.js";

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
          <h3 className="m-0 mb-1 text-[0.9375rem] font-bold text-navy">{demo.titulo}</h3>
          {demo.nota && (
            <p className="m-0 mb-3 text-[0.8125rem] text-[var(--fg-2)]">{demo.nota}</p>
          )}
          <div className="rounded-field border border-[var(--border-soft)] bg-app px-4 py-4">
            {demo.render()}
          </div>
        </div>
      ))}
      <p className="m-0 text-[0.75rem] text-[var(--fg-3)]">
        Origem: <span className="font-mono">{entry.origem}</span>
      </p>
    </div>
  );
}

const CORES = ["blue", "red", "green", "purple", "yellow"] as const;
const VARIANTES = ["default", "outline", "tint", "ghost"] as const;
const TAMANHOS = ["small", "medium", "normal"] as const;
const TAGS: TagVariant[] = [
  "light-blue", "blue", "cyan", "purple", "light-purple",
  "red", "orange", "brand", "green", "yellow",
];

/** As invertidas que este produto acrescentou; não existem no `tag/1`. */
const TAGS_INVERTIDAS: TagVariant[] = [
  "solid-red", "solid-green", "solid-orange", "solid-yellow", "solid-brand",
];

/** Linhas sintéticas para a tabela da galeria. */
const LINHAS = [
  { horario: "08:00", paciente: "Helena M.", servico: "Terapia ocupacional", situacao: true },
  { horario: "09:30", paciente: "Otávio L.", servico: "Fonoaudiologia", situacao: false },
  { horario: "11:00", paciente: "Bruna S.", servico: "Psicologia ABA", situacao: true },
];

/** Demonstração do diálogo: precisa de estado, então vive num componente. */
function DemoModal() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button onClick={() => setAberto(true)}>Abrir diálogo</Button>
      <Modal id="demo-modal" open={aberto} onClose={() => setAberto(false)} title="Inativar paciente">
        <p className="m-0 max-w-[60ch] text-sm text-navy">
          Fecha com Esc, com clique no fundo e pelo botão. O Tab circula aqui dentro e não escapa
          para a página atrás.
        </p>
      </Modal>
    </>
  );
}

function DemoButtonTabs() {
  const [active, setActive] = useState<"programas" | "protocolos" | "historico">("programas");
  const labels = {
    programas: "Programas estruturados em aquisição.",
    protocolos: "ABLLS-R e protocolos de avaliação.",
    historico: "Alterações registradas no plano.",
  };
  return (
    <ButtonTabs
      id="g-button-tabs"
      label="Conteúdo clínico"
      value={active}
      onChange={setActive}
      tabs={[
        { id: "programas", label: "Programas" },
        { id: "protocolos", label: "Protocolos" },
        { id: "historico", label: "Histórico" },
      ]}
      panelClassName="rounded-lg bg-white p-4 text-sm text-[var(--color-brand-purple-dark)]/80"
    >
      {labels[active]}
    </ButtonTabs>
  );
}

type PatientLazyTab =
  | "personal-summary"
  | "personal-record"
  | "clinical-summary"
  | "general-anamnesis"
  | "clinical-anamnesis"
  | "external-anamnesis"
  | "pic-active"
  | "pic-history"
  | "hours-map"
  | "appointments"
  | "evolution"
  | "financial"
  | "contents"
  | "absences"
  | "nps";

function DemoLazyTabs() {
  const [active, setActive] = useState<PatientLazyTab>("clinical-summary");
  const labels: Record<PatientLazyTab, string> = {
    "personal-summary": "Resumo cadastral",
    "personal-record": "Cadastro completo",
    "clinical-summary": "Resumo Clínico",
    "general-anamnesis": "Anamnese Geral",
    "clinical-anamnesis": "Anamnese Clínica",
    "external-anamnesis": "Externo",
    "pic-active": "Plano atual",
    "pic-history": "Histórico de planos",
    "hours-map": "Mapa de Horas",
    appointments: "Atendimentos",
    evolution: "Evolução",
    financial: "Financeiro",
    contents: "Conteúdos",
    absences: "Faltas",
    nps: "NPS",
  };

  return (
    <LazyTabs<PatientLazyTab>
      id="g-lazy-tabs"
      label="Perfil do paciente"
      value={active}
      onChange={setActive}
      tabs={[
        { id: "personal", label: "Dados Pessoais", tabs: [
          { id: "personal-summary", label: "Resumo cadastral" },
          { id: "personal-record", label: "Cadastro completo" },
        ] },
        { id: "anamneses", label: "Anamneses", tabs: [
          { id: "clinical-summary", label: "Resumo Clínico" },
          { id: "general-anamnesis", label: "Anamnese Geral" },
          { id: "clinical-anamnesis", label: "Anamnese Clínica" },
          { id: "external-anamnesis", label: "Externo" },
        ] },
        { id: "pic", label: "PIC", tabs: [
          { id: "pic-active", label: "Plano atual" },
          { id: "pic-history", label: "Histórico de planos" },
        ] },
        { id: "hours", label: "Mapa de Horas", tabs: [{ id: "hours-map", label: "Mapa de Horas" }] },
        { id: "care", label: "Atendimentos", tabs: [{ id: "appointments", label: "Atendimentos" }] },
        { id: "evolution", label: "Evolução" },
        { id: "financial", label: "Financeiro" },
        { id: "contents", label: "Conteúdos" },
        { id: "absences", label: "Faltas" },
        { id: "nps", label: "NPS" },
      ]}
      header={(
        <div>
          <h2 className="m-0 text-2xl font-bold text-[var(--color-brand-purple-dark)]">Raul Tavares Rodrigues</h2>
          <p className="mb-0 mt-2 text-sm text-[var(--color-brand-purple-dark)]/70">Ativo · 5 anos · 0 faltas · 0h semanais</p>
        </div>
      )}
    >
      {(selected) => (
        <Card>
          <h3 className="m-0 text-xl font-bold text-[var(--color-brand-purple-dark)]">{labels[selected]}</h3>
          <p className="mb-0 mt-2 text-[var(--color-brand-purple-dark)]/70">
            O conteúdo desta opção é avaliado somente quando ela é selecionada.
          </p>
        </Card>
      )}
    </LazyTabs>
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
      <Select id="g-specialty" name="professional[specialty]" label="Especialidade" prompt="Selecione a especialidade" value={specialty} options={specialties} onChange={setSpecialty} />
      <Select id="g-status" name="professional[status]" label="Status profissional" prompt="Selecione o status" value={status} options={[{ label: "Ativo", value: "active" }, { label: "Inativo", value: "inactive" }]} onChange={setStatus} />
      <Select id="g-select-error" label="Especialidade com erro" prompt="Selecione a especialidade" value="" options={specialties} errors={["selecione uma especialidade"]} onChange={() => undefined} />
      <Select id="g-select-disabled" label="Especialidade indisponível" prompt="Selecione a especialidade" value="psychology" options={specialties} disabled />
    </div>
  );
}

function DemoDrawerModal() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return <><Button id="g-drawer-trigger" onClick={() => setOpen(true)}>Abrir drawer</Button><DrawerModal id="g-drawer" show={open} onCancel={() => setOpen(false)} title="Inativar Paciente" target="#g-drawer-owner" triggerShow="show-drawer" placement="right" variant="medium" contentClassName="demo-drawer-content" data-demo="drawer-modal"><p id="g-drawer-description" className="mt-0">Revise o impacto na agenda antes de confirmar.</p><label htmlFor="g-drawer-reason">Motivo</label><input id="g-drawer-reason" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 block rounded-lg border p-2" /><Button id="g-drawer-confirm" className="mt-4">Confirmar Inativação</Button></DrawerModal></>;
}

function DemoModalContent() {
  const [open, setOpen] = useState(false);
  const [secondary, setSecondary] = useState(true);
  return <><Button id="g-modal-content-trigger" onClick={() => { setSecondary(true); setOpen(true); }}>Abrir conteúdo modal</Button><Modal id="g-modal-content-modal" open={open} onClose={() => setOpen(false)} title="Mapa de horas"><div id="g-modal-content-modal-description">{secondary ? <ModalContent id="g-modal-content" title="Detalhes do período" className="demo-modal-body" data-demo="modal-content" onClose={() => setSecondary(false)}><p>Horas planejadas e disponíveis do aplicador.</p><Button id="g-modal-content-action">Exportar período</Button></ModalContent> : <div><p>Tela principal do mapa de horas.</p><Button onClick={() => setSecondary(true)}>Ver detalhes</Button></div>}</div></Modal></>;
}

const SIMPLE_ROWS = [
  { id: 31, date: "04/08/2026", planned: 8, available: 6 },
  { id: 32, date: "05/08/2026", planned: 7, available: 7 },
];

function DemoSimpleTable() {
  return <div data-demo="simple-table"><SimpleTable className="demo-simple-table" emptyMessage="Nenhum período"><thead><tr><th>Data</th><th>Horas planejadas</th><th>Horas disponíveis</th></tr></thead><tbody>{SIMPLE_ROWS.map((row) => <tr key={row.id} id={`g-hours-${row.id}`}><td className="date-cell">{row.date}</td><td>{row.planned} h</td><td>{row.available} h</td></tr>)}</tbody></SimpleTable></div>;
}

function DemoFlash() {
  const [visible, setVisible] = useState(false);
  return <div><Button onClick={() => setVisible(true)}>Registrar resultado</Button>{visible && <Flash id="g-flash" kind="info" title="Sucesso!" onDismiss={() => setVisible(false)}>Programa estruturado salvo.</Flash>}</div>;
}

function DemoFlashGroup() {
  const [connection, setConnection] = useState<"connected" | "client-error" | "server-error">("connected");
  const [info, setInfo] = useState<ReactNode>("Programa estruturado salvo.");
  const [error, setError] = useState<ReactNode>("Não foi possível salvar o programa.");
  return <div className="flex flex-wrap gap-2"><Button size="small" variant="outline" onClick={() => setConnection("client-error")}>Simular internet indisponível</Button><Button size="small" variant="outline" onClick={() => setConnection("server-error")}>Simular falha do servidor</Button><FlashGroup id="g-flash-group" info={info} error={error} connection={connection} onDismiss={(kind) => { if (kind === "info") setInfo(undefined); else if (kind === "error") setError(undefined); else setConnection("connected"); }} /></div>;
}

function DemoSimpleForm() {
  const [disabled, setDisabled] = useState(false);
  const [changes, setChanges] = useState(0);
  const [submits, setSubmits] = useState(0);
  return <div className="space-y-4"><SimpleForm id="g-simple-form" name="programa" autoComplete="off" data-demo="simple-form" disabled={disabled} onChange={() => setChanges((value) => value + 1)} onSubmit={(event) => { event.preventDefault(); setSubmits((value) => value + 1); }} actions={<><Button type="button" variant="outline">Cancelar</Button><Button type="submit">Salvar</Button></>}><Input id="g-form-name" name="programa[nome]" label="Nome do programa" defaultValue="Imitação motora" /><Textarea id="g-form-objective" name="programa[objetivo]" label="Objetivo" defaultValue="Generalizar a imitação em contexto natural." /></SimpleForm><div className="flex flex-wrap items-center gap-3"><Button size="small" variant="outline" onClick={() => setDisabled((value) => !value)}>{disabled ? "Habilitar formulário" : "Desabilitar formulário"}</Button><p role="status" className="m-0 text-sm text-[var(--fg-2)]">Mudanças: {changes}. Envios: {submits}.</p></div></div>;
}

function DemoEscolhas() {
  const [radio, setRadio] = useState("presente");
  const [aba, setAba] = useState("dia");
  const [marcados, setMarcados] = useState<string[]>(["fono"]);
  return (
    <div className="space-y-4">
      <RadioGroup
        label="Presença"
        name="g-presenca"
        value={radio}
        onChange={setRadio}
        options={[
          { value: "presente", label: "Presente" },
          { value: "ausente", label: "Ausente" },
          { value: "justificada", label: "Falta justificada" },
        ]}
      />
      <RadioSelector
        label="Período"
        name="g-periodo"
        value={aba}
        onChange={setAba}
        options={[
          { value: "dia", label: "Dia" },
          { value: "semana", label: "Semana" },
          { value: "mes", label: "Mês", warningNumber: 3 },
        ]}
      />
      <CheckboxGroup
        label="Especialidades"
        name="g-esp"
        values={marcados}
        onChange={setMarcados}
        options={[
          { value: "fono", label: "Fonoaudiologia" },
          { value: "to", label: "Terapia ocupacional" },
          { value: "psico", label: "Psicologia" },
        ]}
      />
    </div>
  );
}

function DemoCincoCampos({ kind }: { kind: "input" | "checkgroup" | "fake-input" | "switch-card" | "fake-radio" }) {
  const [frequencia, setFrequencia] = useState("3");
  const [criterio, setCriterio] = useState("consecutive");
  const [dias, setDias] = useState(["monday", "wednesday"]);
  const [mostrarHorario, setMostrarHorario] = useState(false);
  if (kind === "input") return <div id="g-input-with-select-wrapper" className="max-w-3xl space-y-8">
      <InputWithSelect label="Critério de Avanço" textId="g-criterio-frequencia" textName="programa[mastery_frequency]" textValue={frequencia} selectId="g-criterio-tipo" selectName="programa[mastery_criteria]" selectValue={criterio} options={[{ label: "Sessões Cumulativas", value: "cumulative" }, { label: "Sessões Consecutivas", value: "consecutive" }]} onTextChange={setFrequencia} onSelectChange={setCriterio} />
      <InputWithSelect label="Critério indisponível" textId="g-criterio-bloqueado-frequencia" textName="programa[blocked_frequency]" textValue="2" selectId="g-criterio-bloqueado-tipo" selectName="programa[blocked_criteria]" selectValue="cumulative" options={[{ label: "Sessões Cumulativas", value: "cumulative" }]} disabled textErrors={["não pode ser alterado"]} />
    </div>;
  if (kind === "checkgroup") return <div id="g-checkgroup-wrapper" className="max-w-3xl">
      <Checkgroup id="g-dias" label="Atende nos dias da semana" name="unit_service_hour[service_hour][weekdays]" values={dias} onChange={setDias} innerClassName="flex-row flex-wrap" options={[{ label: "Segunda", value: "monday" }, { label: "Quarta", value: "wednesday" }, { label: "Sexta", value: "friday" }, { label: "Domingo", value: "sunday", disabled: true }]} />
    </div>;
  if (kind === "fake-input") return <div id="g-fake-input-wrapper" className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <FakeInput label="Paciente" value="Helena M." />
      <FakeInput label="Unidade" labelColor="blue" value="Unidade Girassol" />
    </div>;
  if (kind === "switch-card") return <form id="g-input-switch-card-wrapper" className="max-w-3xl">
      <InputSwitchCard label="Mostrar horário" active={mostrarHorario} className="max-w-48 px-3">
        <Switch id="g-mostrar-horario" name="relatorio[show_hours]" value="true" checked={mostrarHorario} onChange={setMostrarHorario} />
      </InputSwitchCard>
    </form>;
  return <div id="g-fake-radio-group-wrapper" className="max-w-3xl">
      <FakeRadioGroup id="g-foco-terapia" label="Qual foi o Foco da Terapia na Sessão" selectedValue="habilidades-sociais" options={[{ name: "therapy_focus", value: "comunicacao", label: "Comunicação" }, { name: "therapy_focus", value: "habilidades-sociais", label: "Habilidades sociais" }, { name: "therapy_focus", value: "autonomia", label: "Autonomia" }]} />
    </div>;
}

function DemoRangeDatePicker() {
  const [valor, setValor] = useState({ inicio: "2026-08-03", fim: "2026-08-09" });
  return <div className="space-y-3"><RangeDatePicker id="g-periodo-dias" label="Período" value={valor} onChange={setValor} minDate="2026-08-01" maxDate="2026-09-30" disable={["2026-08-15"]} static className="max-w-sm" /><Button size="small" variant="outline" onClick={() => setValor({ inicio: "2026-09-07", fim: "2026-09-13" })}>Carregar período externo</Button></div>;
}

function DemoRangeMonthPicker() {
  const [valor, setValor] = useState({ inicio: "2026-01-01", fim: "2026-06-30" });
  return <div className="space-y-3"><RangeMonthPicker id="g-periodo-meses" label="Período dos programas" value={valor} onChange={setValor} disable={["2026-02-01"]} className="max-w-sm" /><Button size="small" variant="outline" onClick={() => setValor({ inicio: "2024-01-01", fim: "2024-02-29" })}>Carregar intervalo bissexto</Button></div>;
}

function DemoMonthPicker() {
  const [valor, setValor] = useState("2026-08-01");
  return <div className="space-y-3"><MonthPicker id="g-mes-avaliacao" label="Mês da avaliação" value={valor} onChange={setValor} errors={["Informe o mês da avaliação"]} className="max-w-sm" /><Button size="small" variant="outline" onClick={() => setValor("2027-02-01")}>Carregar mês externo</Button></div>;
}

function DemoWeekSelector() {
  const [valor, setValor] = useState({ inicio: "2025-12-29", fim: "2026-01-04" });
  return <WeekSelector first={valor.inicio} last={valor.fim} onChange={setValor} />;
}

function DemoSwitchCard() {
  const [ativo, setAtivo] = useState(false);
  return <div className="space-y-3"><SwitchCard id="g-registro-abc" name="programa[is_abc]" title="Registro Tipo ABC" description="Ativa o formato ABC para detalhar o comportamento com antecedentes e consequências." checked={ativo} onChange={setAtivo} /><SwitchCard id="g-programa-bloqueado" name="programa[fases]" inputValue="manutencao" multiple title="Fase de manutenção" description="Configuração indisponível durante a aplicação." checked disabled /></div>;
}

function DemoDateNavigator() {
  const [data, setData] = useState("2026-07-30");
  return <div className="space-y-3"><DateNavigator id="g-navegador-data" name="filtro[data]" date={data} onChange={setData} /><div className="flex flex-wrap gap-2"><Button size="small" variant="outline" onClick={() => setData("2024-02-28")}>Carregar limite bissexto</Button><Button size="small" variant="outline" onClick={() => setData("2025-12-31")}>Carregar fim do ano</Button><Button size="small" variant="outline" onClick={() => setData("2026-09-14")}>Carregar valor externo</Button></div><DateNavigator id="g-navegador-bloqueado" name="filtro[data_bloqueada]" date="2026-08-15" disable /></div>;
}

const EXISTING_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23dbf3fb'/%3E%3Ccircle cx='40' cy='30' r='13' fill='%232b235b'/%3E%3Cpath d='M16 76c2-19 12-29 24-29s22 10 24 29' fill='%232b235b'/%3E%3C/svg%3E";

function DemoImageUpload() {
  const [selected, setSelected] = useState("Nenhum arquivo novo.");
  return (
    <div className="space-y-4">
      <ImageUpload id="g-image-upload" name="profissional[avatar_url]" previousUrl={EXISTING_IMAGE} onFileChange={(file) => setSelected(`${file.name} pronto para envio.`)} />
      <p className="m-0 text-sm text-[var(--fg-2)]">{selected}</p>
    </div>
  );
}

export const GALLERY: GalleryEntry[] = [
  {
    name: "button",
    origem: "lib/bloomy_web/components/core_components.ex:457",
    descricao: "O botão de ação. Quatro variantes, cinco cores, três tamanhos.",
    demos: [
      {
        titulo: "As quatro variantes, nas cinco cores",
        nota: "Sessenta combinações ao todo; aqui no tamanho normal.",
        render: () => (
          <div className="space-y-3">
            {VARIANTES.map((variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-2">
                <span className="w-16 shrink-0 text-[0.75rem] font-black uppercase tracking-wide text-[var(--fg-3)]">
                  {variant}
                </span>
                {CORES.map((color) => (
                  <Button key={color} variant={variant} color={color}>
                    Salvar
                  </Button>
                ))}
              </div>
            ))}
          </div>
        ),
      },
      {
        titulo: "Os três tamanhos",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            {TAMANHOS.map((size) => (
              <Button key={size} size={size}>
                {size}
              </Button>
            ))}
          </div>
        ),
      },
      {
        titulo: "Com ícone e com aviso",
        nota: "`left_icon`, `right_icon` e `notification_badge` do original.",
        render: () => (
          <div className="flex flex-wrap items-center gap-3">
            <Button leftIcon="fa-plus">Novo agendamento</Button>
            <Button rightIcon="fa-arrow-right" variant="outline">
              Avançar
            </Button>
            <Button notificationBadge variant="tint" color="purple">
              Pendências
            </Button>
            <Button disabled>Desabilitado</Button>
          </div>
        ),
      },
    ],
  },
  {
    name: "button_tabs",
    origem: "lib/bloomy_web/components/button_tab_components.ex:18",
    descricao: "Abas em trilho, com um marcador que acompanha a seleção.",
    demos: [
      {
        titulo: "Marcador móvel entre abas",
        nota: "O marcador mede cada rótulo; setas, Home e End movem a seleção sem perder o foco.",
        render: () => <DemoButtonTabs />,
      },
    ],
  },
  {
    name: "lazy_tabs",
    origem: "lib/bloomy_web/components/lazy_tab_component.ex:28",
    descricao: "Abas com grupos em dropdown e conteúdo carregado sob demanda.",
    demos: [
      {
        titulo: "Abas agrupadas do perfil do paciente",
        nota: "A linha azul acompanha o grupo ativo; o menu preserva seleção, check e navegação por teclado.",
        render: () => <DemoLazyTabs />,
      },
    ],
  },
  { name: "modal", origem: "lib/bloomy_web/components/core_components.ex:66", descricao: "Diálogo sobreposto, com foco preso e fechamento por Esc.",
    demos: [
      {
        titulo: "Diálogo com foco preso",
        nota: "Esc fecha, clique no fundo fecha, e o Tab circula dentro — como o `focus_wrap` do original.",
        render: () => <DemoModal />,
      },
    ],
  },
  { name: "drawer_modal", origem: "lib/bloomy_web/components/core_components.ex:182", descricao: "Painel que entra pela lateral, para formulários longos.", demos: [{ titulo: "Inativação com impacto na agenda", nota: "Preserva ids, largura média, posição à direita e o ciclo de foco do `focus_wrap`.", render: () => <DemoDrawerModal /> }] },
  { name: "modal_content", origem: "lib/bloomy_web/components/core_components.ex:286", descricao: "O miolo do diálogo, separado para reuso.", demos: [{ titulo: "Tela secundária do mapa de horas", nota: "A seta retorna à tela principal; abertura e cancelamento pertencem ao Modal que o envolve.", render: () => <DemoModalContent /> }] },
  { name: "flash", origem: "lib/bloomy_web/components/core_components.ex:321", descricao: "Aviso temporário de resultado de ação.", demos: [{ titulo: "Resultado de uma ação", nota: "O aviso é anunciado e o botão Fechar é alcançável por teclado.", render: () => <DemoFlash /> }] },
  { name: "flash_group", origem: "lib/bloomy_web/components/core_components.ex:360", descricao: "A pilha de avisos temporários da página.", demos: [{ titulo: "Estados globais de conexão", nota: "Reproduz os avisos de cliente e servidor, normalmente controlados pela conexão do LiveView.", render: () => <DemoFlashGroup /> }] },
  { name: "simple_form", origem: "lib/bloomy_web/components/core_components.ex:416", descricao: "Formulário com espaçamento e ações padronizados.", demos: [{ titulo: "Programa com ações e bloqueio", nota: "Desabilitar aplica o `fieldset` nativo e impede envio e mudança, como `filter_form_events/2` no original.", render: () => <DemoSimpleForm /> }] },
  { name: "link_button", origem: "lib/bloomy_web/components/core_components.ex:523", descricao: "Link com aparência de botão, para navegação.", demos: [{ titulo: "Navegação e atributos nativos", nota: "A versão React degrada a navegação LiveView para anchor nativo: `navigate` opcional vira `href`, preservando semântica e teclado. Todos os 27 usos reais atuais fornecem `navigate`.", render: () => <div id="g-link-buttons" className="flex flex-wrap gap-3"><LinkButton navigate="#destino-link-button" variant="outline" leftIcon="fa-arrow-left" className="max-w-fit" target="_self" rel="bookmark" type="text/html" hrefLang="pt-BR" referrerPolicy="no-referrer">Voltar para programas</LinkButton><LinkButton navigate="data:text/plain,guia-sintetica" download="guia-sintetica.txt" color="purple" rightIcon="fa-arrow-right">Baixar guia sintética</LinkButton><LinkButton id="g-link-sem-navigate">Link sem destino</LinkButton><span id="destino-link-button" tabIndex={-1}>Destino sintético</span></div> }] },
  { name: "copy_button", origem: "lib/bloomy_web/components/core_components.ex:570", descricao: "Botão que copia um valor para a área de transferência.", demos: [{ titulo: "Links de check-in", nota: "Dois botões publicam no único ToastHost global; os avisos são persistentes e fechados individualmente.", render: () => <div id="g-copy-demo"><form id="g-copy-form"><div id="g-copy-buttons" className="flex flex-wrap items-center gap-3"><CopyButton id="g-copy-checkin" textToCopy="https://exemplo.invalid/auto-checkin/unidade-girassol" variant="tint" rightIcon="fa-link" className="block" name="link_checkin" value="unidade-girassol">Link de Checkin</CopyButton><CopyButton id="g-copy-guia" textToCopy="GUIA-SINTETICA-2026" variant="outline" form="g-copy-form">Código da guia</CopyButton><CopyButton id="g-copy-small-disabled" textToCopy="não deve copiar" size="small" color="green" disabled title="Cópia indisponível">Copiar desabilitado</CopyButton></div></form><ToastHost /></div> }] },
  {
    name: "input",
    origem: "lib/bloomy_web/components/core_components.ex:1148",
    descricao: "O campo de formulário, com treze cláusulas por tipo mais a nativa.",
    demos: [
      {
        titulo: "Texto, com rótulo, ícone e apêndice",
        nota: "O `hint` cola à direita, com o canto reto — é como o sistema mostra unidade sem um segundo campo.",
        render: () => (
          <div className="grid max-w-xl gap-4 md:grid-cols-2">
            <Input id="g-nome" label="Nome do paciente" placeholder="Nome completo" />
            <Input id="g-busca" label="Buscar" leftIcon="fa-magnifying-glass" placeholder="Paciente" />
            <Input id="g-horas" label="Carga semanal" hint="horas" defaultValue="20" />
            <Input id="g-desab" label="Somente leitura" defaultValue="Não editável" disabled />
          </div>
        ),
      },
      {
        titulo: "Seleção com menu próprio",
        nota: "O sistema não abre o menu nativo do navegador: opções, destaque, limpeza e check pertencem ao componente.",
        render: () => <DemoSelect />,
      },
      {
        titulo: "Com erro",
        nota: "O erro é posicionado por fora do fluxo: o campo não muda de altura, e a página não pula.",
        render: () => (
          <div className="max-w-sm pb-6">
            <Input id="g-cep" label="CEP" defaultValue="04567" errors={["CEP inválido"]} />
          </div>
        ),
      },
      {
        titulo: "Área de texto, caixa de seleção e chave",
        render: () => (
          <div className="max-w-xl space-y-3">
            <Textarea id="g-obs" label="Observação" placeholder="Como foi o atendimento" />
            <Checkbox id="g-check" label="Exige supervisão" defaultChecked />
            <Switch id="g-switch" label="Renovação automática" checked onChange={() => {}} />
          </div>
        ),
      },
    ],
  },
  { name: "input_with_select", origem: "lib/bloomy_web/components/core_components.ex:1217", descricao: "Campo com seletor acoplado, para valor com unidade.", demos: [{ titulo: "Frequência e critério unidos", nota: "Os dois campos mantêm nomes e valores independentes.", render: () => <DemoCincoCampos kind="input" /> }] },
  { name: "checkgroup", origem: "lib/bloomy_web/components/core_components.ex:1253", descricao: "Grupo de caixas de seleção com rótulo comum.", demos: [{ titulo: "Dias de atendimento", nota: "O nome-base recebe `[][]`, preservando o sufixo duplo efetivo do monólito; a correção intencional limita-se a `fieldset` e `legend`.", render: () => <DemoCincoCampos kind="checkgroup" /> }] },
  { name: "fake_input", origem: "lib/bloomy_web/components/core_components.ex:1269", descricao: "Campo somente-leitura com aparência de campo.", demos: [{ titulo: "Dados somente para leitura", render: () => <DemoCincoCampos kind="fake-input" /> }] },
  { name: "input_switch_card", origem: "lib/bloomy_web/components/core_components.ex:1301", descricao: "Cartão com chave liga-desliga e descrição.", demos: [{ titulo: "Estado colore o cartão", render: () => <DemoCincoCampos kind="switch-card" /> }] },
  { name: "fake_radio_group", origem: "lib/bloomy_web/components/core_components.ex:1332", descricao: "Grupo de opções não editável, para exibição.", demos: [{ titulo: "Resposta registrada", nota: "Só a opção selecionada permanece habilitada, como no sistema.", render: () => <DemoCincoCampos kind="fake-radio" /> }] },
  { name: "radio_group", origem: "lib/bloomy_web/components/core_components.ex:1379", descricao: "Escolha única entre opções, navegável por setas.",
    demos: [{ titulo: "Opções soltas, a marcada ganha fundo", render: () => <DemoEscolhas /> }],
  },
  { name: "radio_selector", origem: "lib/bloomy_web/components/core_components.ex:1429", descricao: "Escolha única em formato de cartões clicáveis.",
    demos: [
      {
        titulo: "Barra segmentada",
        nota: "A marcada ganha fundo e a linha superior por dentro — ver o exemplo em `radio_group`.",
        render: () => (
          <RadioSelector
            name="g-sel"
            value="semana"
            options={[
              { value: "dia", label: "Dia" },
              { value: "semana", label: "Semana" },
              { value: "mes", label: "Mês" },
            ]}
          />
        ),
      },
    ],
  },
  { name: "checkbox_group", origem: "lib/bloomy_web/components/core_components.ex:1493", descricao: "Escolha múltipla em grupo.",
    demos: [
      {
        titulo: "Escolha múltipla",
        nota: "Mesma anatomia do rádio — ver o exemplo em `radio_group`.",
        render: () => (
          <CheckboxGroup
            label="Documentos entregues"
            name="g-doc"
            values={["rg"]}
            options={[
              { value: "rg", label: "Identidade" },
              { value: "cpf", label: "CPF" },
            ]}
          />
        ),
      },
    ],
  },
  {
    name: "label",
    origem: "lib/bloomy_web/components/core_components.ex:1536",
    descricao: "Rótulo de campo.",
    demos: [
      {
        titulo: "As duas cores",
        nota: "Azul de marca por padrão, em negrito — cor de marca fazendo trabalho de hierarquia.",
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
    origem: "lib/bloomy_web/components/core_components.ex:1559",
    descricao: "Mensagem de erro de campo.",
    demos: [
      {
        titulo: "Com ícone, e cortada em duas linhas",
        nota: "`line-clamp-2` com o texto inteiro no `title`: mensagem longa não empurra o formulário.",
        render: () => (
          <div className="max-w-sm space-y-2">
            <FieldError message="CEP inválido" />
            <FieldError message="O profissional já tem um atendimento em aberto neste horário, e a agenda não permite dois ao mesmo tempo para a mesma pessoa." />
          </div>
        ),
      },
    ],
  },
  { name: "header", origem: "lib/bloomy_web/components/core_components.ex:1583", descricao: "Cabeçalho de seção, com título e ações.",
    demos: [
      {
        titulo: "Os três tamanhos, com subtítulo e ações",
        render: () => (
          <div className="space-y-6">
            <SectionHeader variant="small">Título pequeno</SectionHeader>
            <SectionHeader variant="default" subtitle="Com subtítulo abaixo">Título padrão</SectionHeader>
            <SectionHeader variant="large" actions={<Button size="medium">Nova</Button>}>
              Título grande
            </SectionHeader>
          </div>
        ),
      },
    ],
  },
  {
    name: "table",
    origem: "lib/bloomy_web/components/core_components.ex:1638",
    descricao: "Tabela de listagem, com colunas e ações por linha.",
    demos: [
      {
        titulo: "Com dados e com ação",
        render: () => (
          <Table
            rows={LINHAS}
            rowId={(l) => l.horario}
            cols={[
              { label: "Horário", render: (l) => l.horario },
              { label: "Paciente", render: (l) => l.paciente },
              { label: "Serviço", render: (l) => l.servico },
              {
                label: "Situação",
                render: (l) => <StatusTag status={l.situacao} title={l.situacao ? "Ativo" : "Inativo"} />,
              },
            ]}
            actions={() => "Abrir"}
          />
        ),
      },
      {
        titulo: "Vazia",
        nota: "A linha de vazio existe sempre, escondida; quem a revela é `first:table-row`, no navegador.",
        render: () => (
          <Table
            rows={[] as typeof LINHAS}
            cols={[
              { label: "Horário", render: (l) => l.horario },
              { label: "Paciente", render: (l) => l.paciente },
            ]}
          />
        ),
      },
    ],
  },
  { name: "simple_table", origem: "lib/bloomy_web/components/core_components.ex:1703", descricao: "Tabela simples com marcação e estilos do relatório.", demos: [{ titulo: "Horas do profissional", render: () => <DemoSimpleTable /> }] },
  { name: "list", origem: "lib/bloomy_web/components/core_components.ex:1740", descricao: "Lista de descrição, termo e valor.",
    demos: [
      {
        titulo: "Termo à esquerda, em um quarto da largura",
        render: () => (
          <DescriptionList
            items={[
              { title: "Paciente", content: "Helena M." },
              { title: "Convênio", content: "Unimed" },
              { title: "Responsável", content: "Renata Alencar" },
            ]}
          />
        ),
      },
    ],
  },
  { name: "back", origem: "lib/bloomy_web/components/core_components.ex:1763", descricao: "Link de voltar.",
    demos: [{ titulo: "Link de voltar", render: () => <Back href="/patients">Voltar para pacientes</Back> }],
  },
  {
    name: "card",
    origem: "lib/bloomy_web/components/core_components.ex:1792",
    descricao: "Cartão de conteúdo.",
    demos: [
      {
        titulo: "Branco por padrão, e colorido quando a classe já traz fundo",
        nota: "`extract_bg_class/1`: o branco só entra se ninguém tiver pedido outro fundo.",
        render: () => (
          <div className="flex flex-wrap gap-4">
            <Card className="w-64">
              <p className="m-0 text-sm text-navy">Cartão padrão, fundo branco.</p>
            </Card>
            <Card className="w-64 bg-[var(--color-brand-blue)]/20">
              <p className="m-0 text-sm text-navy">Com `bg-*` na classe, o branco não entra.</p>
            </Card>
          </div>
        ),
      },
    ],
  },
  {
    name: "info_card",
    origem: "lib/bloomy_web/components/core_components.ex:1830",
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
        titulo: "Sem número, o próprio cartão carrega o carregamento",
        nota: "Está no original: sem `info`, entra uma barra pulsando no lugar.",
        render: () => <InfoCard variant="blue" icon="fa-calendar-day" title="Atendimentos hoje" />,
      },
    ],
  },
  { name: "inside_card", origem: "lib/bloomy_web/components/core_components.ex:1870", descricao: "Cartão aninhado, sem sombra própria.",
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
  { name: "dropdown", origem: "lib/bloomy_web/components/core_components.ex:2030", descricao: "Menu suspenso ancorado num gatilho.",
    demos: [
      {
        titulo: "Painel ancorado num gatilho livre",
        render: () => (
          <Dropdown id="g-drop" trigger={<Button variant="outline" size="medium">Unidade</Button>}>
            <p className="m-0 px-2 py-1.5 text-sm">Vila Aurora</p>
            <p className="m-0 px-2 py-1.5 text-sm">Centro</p>
          </Dropdown>
        ),
      },
    ],
  },
  { name: "dropdown_menu", origem: "lib/bloomy_web/components/core_components.ex:2054", descricao: "A lista de itens do menu suspenso.",
    demos: [
      {
        titulo: "Os três pontinhos",
        render: () => (
          <DropdownMenu
            id="g-menu"
            items={[<button key="a">Editar</button>, <button key="b">Inativar</button>]}
          />
        ),
      },
    ],
  },
  { name: "meta_info", origem: "lib/bloomy_web/components/core_components.ex:2090", descricao: "Par de rótulo e valor, para metadados.",
    demos: [
      {
        titulo: "Com registros e sem",
        nota: "O início é `offset + 1`, exceto quando o total é zero — sem isso a lista vazia diria “1 até 0 de 0”.",
        render: () => (
          <div className="space-y-1">
            <MetaInfo currentOffset={0} pageSize={20} totalCount={128} />
            <MetaInfo currentOffset={40} pageSize={20} totalCount={128} />
            <MetaInfo currentOffset={0} pageSize={20} totalCount={0} />
          </div>
        ),
      },
    ],
  },
  { name: "image_upload", origem: "lib/bloomy_web/components/core_components.ex:2114", descricao: "Envio de imagem com pré-visualização.",
    demos: [
      {
        titulo: "Imagem existente e substituição",
        nota: "Aceita JPG, JPEG e PNG como os usos reais. A última escolha substitui a imagem existente.",
        render: () => <DemoImageUpload />,
      },
    ],
  },
  { name: "avatar", origem: "lib/bloomy_web/components/core_components.ex:2163", descricao: "Foto ou iniciais de uma pessoa.",
    demos: [
      {
        titulo: "Dois formatos, seis tamanhos",
        nota: "Sem foto, fica o quadrado azul — o original não gera iniciais.",
        render: () => (
          <div className="flex flex-wrap items-end gap-3">
            {(["extra_small", "small", "medium", "extra_medium", "large", "extra_large"] as const).map((size) => (
              <Avatar key={size} size={size} title={size} />
            ))}
            <Avatar shape="square" size="large" title="quadrado" />
          </div>
        ),
      },
    ],
  },
  { name: "progress", origem: "lib/bloomy_web/components/core_components.ex:2201", descricao: "Barra de progresso.",
    demos: [
      {
        titulo: "As quatro variantes",
        nota: "`purple` não tem cor de trilho própria no original: fica com o azul da classe base — achado 105.",
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
    origem: "lib/bloomy_web/components/core_components.ex:2237",
    descricao: "Etiqueta de categoria.",
    demos: [
      {
        titulo: "As dez variantes",
        nota: "`blue` é a única invertida: fundo forte e texto claro, onde as outras fazem o oposto. O fundo é o do produto; o texto das cinco variantes de sinal foi escurecido para o tom da própria família, porque as originais reprovavam AA — `light-blue` ficava em 2,14:1 num texto de 14px em negrito. É a decisão 0001, e os pares corrigidos estão em `contrastPairs`.",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            {TAGS.map((v) => (
              <Tag key={v} item={v} variant={v} />
            ))}
          </div>
        ),
      },
      {
        titulo: "As cinco invertidas — extensão deste produto",
        nota: "Não existem no `tag/1`: o original só inverte `blue`. O fundo é o tom **escuro** da família, não o cheio — `--color-red` (#f04646) não é escuro, `--color-red-dark` (#902a2a) é —, e as cinco atingem AA: `solid-brand` 14,05, `solid-yellow` 13,15, `solid-orange` 6,85, `solid-red` 6,77 e `solid-green` 5,73.",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            {TAGS_INVERTIDAS.map((v) => (
              <Tag key={v} item={v} variant={v} />
            ))}
          </div>
        ),
      },
    ],
  },
  {
    name: "tag_list",
    origem: "lib/bloomy_web/components/core_components.ex:2271",
    descricao: "Conjunto de etiquetas, com transbordo.",
    demos: [
      {
        titulo: "Com e sem limite",
        nota: "Acima do limite, o excedente vira `+N` e os nomes ficam no `title`.",
        render: () => (
          <div className="space-y-2">
            <TagList items={["Fonoaudiologia", "Terapia ocupacional", "Psicologia"]} />
            <TagList
              items={["Fonoaudiologia", "Terapia ocupacional", "Psicologia", "Psicomotricidade"]}
              limit={2}
            />
          </div>
        ),
      },
    ],
  },
  {
    name: "status_tag",
    origem: "lib/bloomy_web/components/core_components.ex:2302",
    descricao: "Etiqueta de situação, com cor por estado.",
    demos: [
      {
        titulo: "Ativo e inativo",
        nota: "É só um ponto colorido: sem `title`, a informação existe apenas na cor — achado 103.",
        render: () => (
          <div className="flex items-center gap-4 text-sm text-navy">
            <span className="flex items-center gap-2">
              <StatusTag status title="Ativo" /> com título
            </span>
            <span className="flex items-center gap-2">
              <StatusTag status={false} title="Inativo" /> com título
            </span>
            <span className="flex items-center gap-2">
              <StatusTag status /> sem título
            </span>
          </div>
        ),
      },
    ],
  },
  { name: "empty_state_card", origem: "lib/bloomy_web/components/core_components.ex:2322", descricao: "Cartão de lista vazia.",
    demos: [
      {
        titulo: "Ícone em círculo e frase forte",
        render: () => (
          <EmptyStateCard icon="fa-calendar-day" text="Nenhum atendimento para hoje">
            Os agendamentos criados na recepção aparecem aqui.
          </EmptyStateCard>
        ),
      },
    ],
  },
  { name: "range_datepicker", origem: "lib/bloomy_web/components/core_components.ex:2348", descricao: "Seleção de intervalo de datas.", demos: [{ titulo: "Intervalo diário", nota: "Só publica o valor escondido quando as duas pontas foram escolhidas; 15 de agosto está desabilitado.", render: () => <DemoRangeDatePicker /> }] },
  { name: "range_monthpicker", origem: "lib/bloomy_web/components/core_components.ex:2394", descricao: "Seleção de intervalo de meses.", demos: [{ titulo: "Intervalo mensal", nota: "A segunda ponta é gravada como o último dia do mês, como no hook do original.", render: () => <DemoRangeMonthPicker /> }] },
  { name: "monthpicker", origem: "lib/bloomy_web/components/core_components.ex:2420", descricao: "Seleção de um mês.", demos: [{ titulo: "Mês único", nota: "A visão usa “Ago 2026”; o valor enviado é `2026-08-01`.", render: () => <DemoMonthPicker /> }] },
  { name: "week_selector", origem: "lib/bloomy_web/components/core_components.ex:2450", descricao: "Navegação por semana.", demos: [{ titulo: "Navegação por semana", nota: "As duas setas deslocam início e fim por exatamente sete dias.", render: () => <DemoWeekSelector /> }] },
  { name: "tooltip", origem: "lib/bloomy_web/components/core_components.ex:2498", descricao: "Dica de contexto ancorada num elemento.",
    demos: [
      {
        titulo: "Aparece no mouse e no foco",
        nota: "O foco entra junto de propósito: é o que o menu recolhido usa para dizer o nome do item.",
        render: () => (
          <Tooltip id="g-tip" content="Mapa da Unidade">
            <Button variant="tint" size="medium">Passe o mouse ou dê Tab</Button>
          </Tooltip>
        ),
      },
    ],
  },
  { name: "timeline_list", origem: "lib/bloomy_web/components/core_components.ex:2528", descricao: "Linha do tempo de eventos.", demos: [{ titulo: "Histórico de documento", render: () => <TimelineList items={[{ icon: "fa-pencil", color: "green", content: <><div className="mb-2"><Tag item="Criado" variant="green" className="mr-1.5" /> por <span className="font-bold text-[var(--color-brand-blue)] underline">Marina Alves</span></div><p className="mb-1 text-sm text-[var(--color-brand-purple-dark)]/80">Documento inicial anexado à unidade.</p><time className="text-sm text-[var(--color-brand-purple-dark)]/80">30/07/2026 às 09:15</time></> }, { icon: "fa-rotate", color: "blue", content: <><div className="mb-2"><Tag item="Editado" variant="light-blue" className="mr-1.5" /> por <span className="font-bold text-[var(--color-brand-blue)] underline">Caio Nunes</span></div><p className="mb-1 text-sm text-[var(--color-brand-purple-dark)]/80">Validade do documento atualizada.</p><time className="text-sm text-[var(--color-brand-purple-dark)]/80">01/08/2026 às 14:40</time></> }]} /> }] },
  { name: "loading_card", origem: "lib/bloomy_web/components/core_components.ex:2550", descricao: "Cartão de carregamento.",
    demos: [{ titulo: "Mensagem e roda", render: () => <LoadingCard message="Carregando os fechamentos" /> }],
  },
  { name: "switch_card", origem: "lib/bloomy_web/components/core_components.ex:2570", descricao: "Cartão com chave liga-desliga.", demos: [{ titulo: "Configuração de programa", nota: "Correção intencional do Design Space: preserva `[]` e o valor customizado no checkbox, com título e descrição associados por ARIA; o original perde esses assigns e aninha labels.", render: () => <DemoSwitchCard /> }] },
  { name: "date_navigator", origem: "lib/bloomy_web/components/core_components.ex:2603", descricao: "Navegação por dia, com setas e calendário.", demos: [{ titulo: "Dia da execução da guia", nota: "Correção intencional do Design Space: os três controles ficam realmente desabilitados; no original, `disable` bloqueia apenas as setas e deixa o calendário central ativo.", render: () => <DemoDateNavigator /> }] },
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
export const COMPONENT_PREVIEWS: ComponentPreview[] = portados().map((entry) => {
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
      <main className="min-h-full bg-app px-6 py-8 text-navy">
        <div className="mx-auto max-w-[64rem]">
          <header className="mb-5">
            <p className="m-0 mb-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--fg-3)]">
              Core components
            </p>
            <h1 className="m-0 text-[1.5rem] font-bold">{entry.name}</h1>
            <p className="m-0 mt-1 text-[0.875rem] text-[var(--fg-2)]">{entry.descricao}</p>
          </header>
          <section
            aria-label={`Demonstrações de ${entry.name}`}
            className="rounded-card border border-[var(--border-soft)] bg-white px-5 py-5 shadow-card"
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
    group: "Core components",
    description: entry.descricao,
    preview: Preview,
    fixtures,
    defaultFixture: fixtures[0]?.id,
  };
});
