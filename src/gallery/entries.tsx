import { useState, type ReactNode } from "react";
import { Button } from "../components/bloomy/Button.js";
import { Card, InfoCard } from "../components/bloomy/Card.js";
import { StatusTag, Tag, TagList, type TagVariant } from "../components/bloomy/Tag.js";
import { Table } from "../components/bloomy/Table.js";
import { Checkbox, FieldError, Input, Label, Switch, Textarea } from "../components/bloomy/Input.js";
import {
  Avatar, Back, DescriptionList, EmptyStateCard, InsideCard,
  LoadingCard, MetaInfo, Progress, SectionHeader,
} from "../components/bloomy/Layout.js";
import { Dropdown, DropdownMenu, Modal } from "../components/bloomy/Overlay.js";
import { CheckboxGroup, RadioGroup, RadioSelector, Tooltip } from "../components/bloomy/Choice.js";

/**
 * Índice dos componentes do sistema.
 *
 * Os **47** componentes de `lib/bloomy_web/components/core_components.ex`, na
 * ordem em que aparecem lá. Cada entrada carrega o arquivo e a linha de origem,
 * conferidos pelo mesmo script que valida as citações do log.
 *
 * Os pendentes ficam na lista de propósito, como os itens de menu ainda não
 * portados: um índice que só mostra o que já existe não serve para planejar.
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

const CORES = ["blue", "red", "green", "purple", "yellow"] as const;
const VARIANTES = ["default", "outline", "tint", "ghost"] as const;
const TAMANHOS = ["small", "medium", "normal"] as const;
const TAGS: TagVariant[] = [
  "light-blue", "blue", "cyan", "purple", "light-purple",
  "red", "orange", "brand", "green", "yellow",
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
  { name: "modal", origem: "lib/bloomy_web/components/core_components.ex:66", descricao: "Diálogo sobreposto, com foco preso e fechamento por Esc.",
    demos: [
      {
        titulo: "Diálogo com foco preso",
        nota: "Esc fecha, clique no fundo fecha, e o Tab circula dentro — como o `focus_wrap` do original.",
        render: () => <DemoModal />,
      },
    ],
  },
  { name: "drawer_modal", origem: "lib/bloomy_web/components/core_components.ex:182", descricao: "Painel que entra pela lateral, para formulários longos." },
  { name: "modal_content", origem: "lib/bloomy_web/components/core_components.ex:286", descricao: "O miolo do diálogo, separado para reuso." },
  { name: "flash", origem: "lib/bloomy_web/components/core_components.ex:321", descricao: "Aviso temporário de resultado de ação." },
  { name: "flash_group", origem: "lib/bloomy_web/components/core_components.ex:360", descricao: "A pilha de avisos temporários da página." },
  { name: "simple_form", origem: "lib/bloomy_web/components/core_components.ex:416", descricao: "Formulário com espaçamento e ações padronizados." },
  { name: "link_button", origem: "lib/bloomy_web/components/core_components.ex:523", descricao: "Link com aparência de botão, para navegação." },
  { name: "copy_button", origem: "lib/bloomy_web/components/core_components.ex:570", descricao: "Botão que copia um valor para a área de transferência." },
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
  { name: "input_with_select", origem: "lib/bloomy_web/components/core_components.ex:1217", descricao: "Campo com seletor acoplado, para valor com unidade." },
  { name: "checkgroup", origem: "lib/bloomy_web/components/core_components.ex:1253", descricao: "Grupo de caixas de seleção com rótulo comum." },
  { name: "fake_input", origem: "lib/bloomy_web/components/core_components.ex:1269", descricao: "Campo somente-leitura com aparência de campo." },
  { name: "input_switch_card", origem: "lib/bloomy_web/components/core_components.ex:1301", descricao: "Cartão com chave liga-desliga e descrição." },
  { name: "fake_radio_group", origem: "lib/bloomy_web/components/core_components.ex:1332", descricao: "Grupo de opções não editável, para exibição." },
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
  { name: "simple_table", origem: "lib/bloomy_web/components/core_components.ex:1703", descricao: "Tabela sem ações, para leitura." },
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
  { name: "image_upload", origem: "lib/bloomy_web/components/core_components.ex:2114", descricao: "Envio de imagem com pré-visualização." },
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
        nota: "`blue` é a única invertida: fundo forte e texto claro, onde as outras fazem o oposto.",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            {TAGS.map((v) => (
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
  { name: "range_datepicker", origem: "lib/bloomy_web/components/core_components.ex:2348", descricao: "Seleção de intervalo de datas." },
  { name: "range_monthpicker", origem: "lib/bloomy_web/components/core_components.ex:2394", descricao: "Seleção de intervalo de meses." },
  { name: "monthpicker", origem: "lib/bloomy_web/components/core_components.ex:2420", descricao: "Seleção de um mês." },
  { name: "week_selector", origem: "lib/bloomy_web/components/core_components.ex:2450", descricao: "Navegação por semana." },
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
  { name: "timeline_list", origem: "lib/bloomy_web/components/core_components.ex:2528", descricao: "Linha do tempo de eventos." },
  { name: "loading_card", origem: "lib/bloomy_web/components/core_components.ex:2550", descricao: "Cartão de carregamento.",
    demos: [{ titulo: "Mensagem e roda", render: () => <LoadingCard message="Carregando os fechamentos" /> }],
  },
  { name: "switch_card", origem: "lib/bloomy_web/components/core_components.ex:2570", descricao: "Cartão com chave liga-desliga." },
  { name: "date_navigator", origem: "lib/bloomy_web/components/core_components.ex:2603", descricao: "Navegação por dia, com setas e calendário." },
];

export const portados = () => GALLERY.filter((e) => e.demos !== undefined);
export const pendentes = () => GALLERY.filter((e) => e.demos === undefined);
