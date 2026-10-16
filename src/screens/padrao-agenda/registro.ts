import type { ControlGroup } from "@brucesantos/design-space";
import type { Feature } from "../../app/features.js";
import { PATH, PadraoAgenda } from "../PadraoAgenda.js";
import { AGENDA_FIXTURES } from "./fixtures.js";
import { SPECS } from "./model.js";

const FLOW = "Mapa de Horas";
const ROUTE = PATH.replace(":id", "1042");

/** Componentes do catálogo que a tela usa. */
const COMPONENTS = [
  "layout.backoffice", "layout.patient", "core.lazy-tabs", "core.card", "core.button", "core.input", "core.switch-card",
  "core.custom-select", "core.radio-selector", "core.dropdown", "core.tag", "core.modal", "core.breadcrumbs",
  "core.notification", "core.loading-card",
];

const CONTROLS: ControlGroup[] = [
  {
    id: "grade",
    title: "Grade semanal",
    note: "As opções do protótipo: o filtro de horários livres, a estrela dos horários preferenciais e a altura das linhas.",
    controls: [
      { id: "lente", label: "Horários livres de", options: [{ value: "none", label: "Nenhuma especialidade" }, ...SPECS.map((s) => ({ value: s.slug, label: s.name }))] },
      { id: "preferencias", label: "Horários preferenciais", options: [{ value: "sim", label: "Mostrar" }, { value: "nao", label: "Esconder" }] },
      { id: "densidade", label: "Densidade", options: [{ value: "compacta", label: "Compacta" }, { value: "confortavel", label: "Confortável" }] },
    ],
  },
  {
    id: "situacao",
    title: "Situação da tela",
    controls: [
      { id: "vigencia", label: "Vigência", options: [{ value: "v1", label: "Em vigência (01/10 – 31/12/2026)" }, { value: "v0", label: "Encerrada (01/07 – 30/09/2026)" }, { value: "v2", label: "Futura (01/01 – 31/03/2027)" }] },
      {
        id: "estado",
        label: "Estado",
        options: [
          { value: "inicial", label: "Nenhum horário selecionado" },
          { value: "novo", label: "Novo agendamento" },
          { value: "varios", label: "Vários horários (Shift)" },
          { value: "editar", label: "Editar agendamento" },
          { value: "alterado", label: "Alterações pendentes" },
          { value: "propagar", label: "Vigência do novo padrão" },
          { value: "nova-vigencia", label: "Nova vigência" },
          { value: "plano", label: "Plano Terapêutico" },
        ],
      },
    ],
  },
];

type S = { id: string; title: string; intent: string; expected: string[]; controls?: Record<string, string>; fixture?: string };
const scenario = (s: S) => ({ route: ROUTE, fixture: "agenda.base", persona: "admin", components: COMPONENTS, ...s });

/** Padrão de Agenda: a semana padrão do paciente e as vigências dela. */
export const feature: Feature = {
  scenarios: [
    scenario({
      id: "agenda.padrao",
      title: "Padrão em vigência",
      intent: "A coordenação abre o Padrão de Agenda de Lucas e vê a semana padrão da vigência atual.",
      expected: [
        "Aba Mapa de Horas › Padrão de Agenda do paciente, dentro do backoffice.",
        "Cabeçalho com o título, o seletor de vigência (período e o selo Em vigência, Futura ou Encerrada) e os botões Plano Terapêutico e Agendamentos.",
        "Pílulas por especialidade com o ícone e as horas da semana (Psicologia 7h, Fonoaudiologia 2h…).",
        "Grade de segunda a sexta, 08:00 a 17:00: cada atendimento com a sigla (PSI, FON, TO, FIS, MUS) na cor da especialidade, o primeiro nome do profissional e o selo AT quando é Acompanhante Terapêutico.",
        "Estrela nos horários preferenciais da família.",
        "Painel à direita: \"Nenhum horário selecionado\".",
      ],
    }),
    scenario({
      id: "agenda.lente",
      title: "Horários livres de uma especialidade",
      controls: { lente: "psychology" },
      intent: "Antes de encaixar uma sessão, ver onde há profissional de Psicologia livre.",
      expected: [
        "A pílula de Psicologia fica marcada e aparece \"Mostrando horários livres de Psicologia\".",
        "Cada horário mostra quantos profissionais estão livres (\"2 livres\"); sem nenhum livre, o horário fica hachurado.",
        "Clicar de novo na pílula limpa o filtro.",
      ],
    }),
    scenario({
      id: "agenda.novo",
      title: "Novo agendamento",
      controls: { estado: "novo" },
      intent: "Clicar num horário vazio (segunda 09:00) abre o painel para criar o atendimento.",
      expected: [
        "O horário fica tracejado em azul.",
        "Paciente ou AT, a nota do horário preferencial e os selects Serviço (agrupado por especialidade), Profissional e Local.",
        "Profissional em dois grupos: Livres e Indisponíveis, com o motivo (ocupado com outro paciente, pré-reservado para um lead, fora da escala).",
        "Trocar o serviço de especialidade sugere o primeiro profissional livre.",
        "Adicionar sem serviço, profissional livre ou local mostra o erro no painel.",
      ],
    }),
    scenario({
      id: "agenda.varios",
      title: "Vários horários com Shift",
      controls: { estado: "varios" },
      intent: "Shift + clique soma horários vazios e cria o mesmo atendimento em todos de uma vez.",
      expected: [
        "Título \"Novos agendamentos · 3 horários\" e botão \"Adicionar 3\".",
        "Cada profissional mostra em quantos dos horários está livre.",
        "Shift + clique num horário já selecionado o remove.",
      ],
    }),
    scenario({
      id: "agenda.editar",
      title: "Editar agendamento",
      controls: { estado: "editar" },
      intent: "Clicar num atendimento abre a edição dele.",
      expected: ["O horário ganha o contorno azul.", "Remover à esquerda e Salvar à direita; o X do painel fecha sem salvar."],
    }),
    scenario({
      id: "agenda.alterado",
      title: "Alterações pendentes",
      controls: { estado: "alterado" },
      intent: "Depois de mexer na grade, a alteração só vale ao salvar o padrão.",
      expected: [
        "Rodapé fixo: \"Padrão de agenda alterado · ao salvar, você define a vigência do novo padrão\", com Descartar alterações e Salvar padrão.",
        "Descartar volta à grade da vigência.",
      ],
    }),
    scenario({
      id: "agenda.propagar",
      title: "Vigência do novo padrão",
      controls: { estado: "propagar" },
      intent: "Salvar um padrão em vigência pede de quando até quando o novo padrão vale, para propagar na agenda.",
      expected: [
        "Início sugerido: amanhã. Término: o fim da vigência atual.",
        "O início pode cair em qualquer data a partir de hoje: a vigência que estiver valendo nesse dia é encerrada na véspera (a quebra).",
        "Se a vigência quebrada ia além do término, volta a valer no dia seguinte; uma vigência futura que começaria dentro do período é adiada para depois dele; a que cabe inteira no período é substituída.",
        "O resumo mostra cada trecho com as datas antes de salvar. Erro só sem datas, com término antes do início ou com início antes de hoje.",
        "Salvar e propagar aplica a quebra e abre a vigência nova.",
      ],
    }),
    scenario({
      id: "agenda.nova-vigencia",
      title: "Nova vigência",
      controls: { estado: "nova-vigencia" },
      intent: "Pelo seletor de vigência, \"Nova vigência\" cria um período depois do último.",
      expected: [
        "Início no dia seguinte ao fim da última vigência e término 90 dias depois.",
        "Renovação Automática ligada por padrão.",
        "A vigência não pode se sobrepor a outra.",
      ],
    }),
    scenario({
      id: "agenda.encerrada",
      title: "Vigência encerrada",
      controls: { vigencia: "v0" },
      intent: "Consultar o padrão de uma vigência que já terminou.",
      expected: ["Selo \"Vigência encerrada · somente leitura\" ao lado do título.", "O seletor mostra o selo Encerrada."],
    }),
    scenario({
      id: "agenda.plano",
      title: "Plano Terapêutico",
      controls: { estado: "plano" },
      intent: "O botão Plano Terapêutico abre o resumo da semana padrão numa folha A4, para envio à operadora, no formato do Exportar PIC.",
      expected: [
        "Modal em tela cheia com a folha à esquerda, com zoom, e as opções à direita (Exibir profissionais, Exibir salas, Observações para a operadora).",
        "Folha: paciente, operadora, unidade, vigência e data de emissão; sessões, carga horária, especialidades e dias com atendimento.",
        "Carga por especialidade com serviços, profissionais, sessões e horas por semana, e a rotina semanal dia a dia.",
        "Desligar profissionais tira a coluna e os nomes; ligar salas mostra a sala em cada sessão; as observações entram na folha.",
        "Baixar PDF imprime só a folha, em uma página A4. Componente novo: não existe no Phoenix.",
      ],
    }),
    scenario({
      id: "agenda.vazio",
      title: "Padrão vazio",
      fixture: "agenda.vazio",
      intent: "Paciente recém-admitido, sem nenhum atendimento no padrão.",
      expected: ["Grade toda vazia, pílulas com 0h, e o painel convidando a clicar num horário."],
    }),
  ],
  fixtures: [...AGENDA_FIXTURES],
  routes: [
    {
      path: PATH,
      params: { id: "1042" },
      screen: PadraoAgenda,
      name: "Padrão de Agenda",
      group: FLOW,
      description: "A semana padrão de atendimentos do paciente, editada na grade, com as vigências do padrão.",
      controls: CONTROLS,
      expected: [
        "Grade semanal com os atendimentos por especialidade e os horários preferenciais da família.",
        "Painel lateral para criar e editar atendimentos, só com profissionais livres.",
        "Salvar um padrão em vigência pede a vigência do novo padrão e o propaga na agenda.",
      ],
      components: COMPONENTS,
    },
  ],
};
