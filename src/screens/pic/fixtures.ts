/**
 * PIC — dados sintéticos e determinísticos.
 *
 * Três vigências do PIC do paciente fictício Lucas e as Áreas → Objetivos →
 * Programas, como `Goals.list` devolve com `objectives: [:programs]`. Cada
 * programa traz quantos alvos estão em cada fase
 * (`Enum.frequencies_by(steps, & &1.phase)`). Hoje é `TODAY`: a vigência do
 * 1º semestre está em vigor e as outras duas são futuras.
 *
 * Novo — não existe no Phoenix: a especialidade da área (`specialties`). Uma
 * área pode atender mais de uma especialidade.
 */
import type { Fixture } from "@brucesantos/design-space";
import type { PatientHeader } from "../../layouts/PatientLayout.js";

export const TODAY = "02/06/2026";

export type SpecialtyId = "fono" | "psico" | "to" | "aba" | "psicoped";
export type SpecialtyTone = "blue" | "purple" | "orange" | "green" | "red";
export type Specialty = { id: SpecialtyId; label: string; short: string; icon: string; tone: SpecialtyTone };

export const SPECIALTIES: Specialty[] = [
  { id: "fono", label: "Fonoaudiologia", short: "Fono", icon: "fa-comment-dots", tone: "blue" },
  { id: "psico", label: "Psicologia", short: "Psico", icon: "fa-brain", tone: "purple" },
  { id: "to", label: "Terapia Ocupacional", short: "T.O.", icon: "fa-hands", tone: "orange" },
  { id: "aba", label: "Análise do Comportamento", short: "ABA", icon: "fa-chart-line", tone: "green" },
  { id: "psicoped", label: "Psicopedagogia", short: "Psicoped.", icon: "fa-book-open-reader", tone: "red" },
];

/** A especialidade do profissional logado (Marcus, Psicologia). */
export const MY_SPECIALTY: SpecialtyId = "psico";

/** `Bloomy.Programs.Step.phase`, na ordem em que o alvo avança. */
export type Phase = "baseline" | "intervention" | "generalization" | "maintenance" | "acquired";
export const PHASE_ORDER: Phase[] = ["baseline", "intervention", "generalization", "maintenance", "acquired"];

/** `Program.status`. */
export type ProgramStatus = "active" | "acquired" | "interrupted" | "hidden";
/** `Goal.status`. */
export type GoalStatus = "active" | "acquired" | "hidden";

export type Program = {
  id: string;
  name: string;
  /** Saída de `format_pattern_type/1`. */
  pattern: string;
  status: ProgramStatus;
  phases: Partial<Record<Phase, number>>;
};

export type Objective = { id: string; name: string; description?: string; programs: Program[] };

export type Goal = {
  id: string;
  name: string;
  description?: string;
  protocol?: string;
  /** dd/mm/aaaa */
  endDate?: string;
  status: GoalStatus;
  specialties: SpecialtyId[];
  objectives: Objective[];
};

export type Plan = {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  createdBy: { name: string; specialty: string };
  legalGuardian?: { name: string; phone: string };
  observation?: string;
};

export type PicFixture = {
  patient: PatientHeader;
  plans: Plan[];
  goals: Goal[];
  /** Abre a tela com o modal Exportar PIC aberto. */
  exportOpen?: boolean;
};

const DISCRETE = "Treinamento Habilidades / Tentativas discretas";
const FREQUENCY = "Treinamento Habilidades / Frequência";
const DURATION = "Treinamento Habilidades / Duração";

export const PATIENT: PatientHeader = {
  name: "Lucas Almeida Ferreira",
  status: "Ativo",
  supportLevel: 2,
  restrictions: true,
  age: 8,
  unitName: "Santana",
  missedCancelledCount: 2,
  activeWeeklyHours: 24,
  observation: "Paciente sensível a sons altos.",
};

export const PLANS: Plan[] = [
  {
    id: "tp1",
    name: "Plano Terapêutico 2026 · 1º Semestre",
    startAt: "01/01/2026",
    endAt: "30/06/2026",
    createdBy: { name: "Marcus Vinícius Gimenes", specialty: "Psicologia" },
    legalGuardian: { name: "Fernanda Lima", phone: "(11) 90000-0000" },
  },
  {
    id: "tp2",
    name: "Plano Terapêutico 2026 · 2º Semestre",
    startAt: "01/07/2026",
    endAt: "31/12/2026",
    createdBy: { name: "Ana Paula Ribeiro", specialty: "Fonoaudiologia" },
  },
  {
    id: "tp3",
    name: "Plano de Transição Escolar",
    startAt: "01/09/2026",
    endAt: "31/12/2026",
    createdBy: { name: "Carla Mendes", specialty: "Terapia Ocupacional" },
    legalGuardian: { name: "Fernanda Lima", phone: "(11) 90000-0000" },
  },
];

export const GOALS: Goal[] = [
  {
    id: "g1",
    name: "Comunicação e Linguagem",
    protocol: "VB-MAPP",
    description: "Ampliar repertório de mandos e tatos funcionais.",
    status: "active",
    specialties: ["fono", "aba"],
    endDate: "15/12/2026",
    objectives: [
      {
        id: "o1",
        name: "Ampliar mandos espontâneos",
        description: "Pedidos funcionais sem apoio.",
        programs: [
          { id: "p1", name: "Mando por itens preferidos", pattern: DISCRETE, status: "active", phases: { baseline: 1, intervention: 3 } },
          { id: "p2", name: "Mando por ações", pattern: FREQUENCY, status: "active", phases: { intervention: 2 } },
        ],
      },
      {
        id: "o2",
        name: "Desenvolver tato",
        description: "Nomear objetos e figuras.",
        programs: [{ id: "p3", name: "Tato de figuras e objetos", pattern: FREQUENCY, status: "active", phases: { intervention: 2, generalization: 1 } }],
      },
    ],
  },
  {
    id: "g2",
    name: "Habilidades Sociais",
    description: "Desenvolver atenção compartilhada e interação com pares.",
    status: "active",
    specialties: ["psico", "aba"],
    endDate: "30/11/2026",
    objectives: [
      {
        id: "o3",
        name: "Atenção compartilhada",
        description: "Sustentar contato visual em atividades.",
        programs: [{ id: "p4", name: "Contato visual sob demanda", pattern: DURATION, status: "active", phases: { maintenance: 2 } }],
      },
      {
        id: "o4",
        name: "Interação com pares",
        programs: [{ id: "p5", name: "Espera da vez em jogos", pattern: DISCRETE, status: "active", phases: { baseline: 2, intervention: 1 } }],
      },
    ],
  },
  {
    id: "g3",
    name: "Autonomia e AVDs",
    protocol: "AFLS",
    description: "Independência em atividades de vida diária.",
    status: "acquired",
    specialties: ["to"],
    endDate: "10/05/2026",
    objectives: [
      {
        id: "o5",
        name: "Higiene pessoal",
        description: "Rotinas de autocuidado.",
        programs: [{ id: "p6", name: "Lavar as mãos com sequência", pattern: DURATION, status: "acquired", phases: { acquired: 3 } }],
      },
    ],
  },
  {
    id: "g4",
    name: "Regulação Sensorial",
    description: "Tolerância a estímulos e autorregulação em ambiente com ruído.",
    status: "active",
    specialties: ["to", "psico"],
    endDate: "20/10/2026",
    objectives: [
      {
        id: "o6",
        name: "Tolerar ambientes ruidosos",
        description: "Permanecer na sala coletiva sem esquiva.",
        programs: [{ id: "p7", name: "Permanência em sala coletiva", pattern: DURATION, status: "active", phases: { intervention: 2 } }],
      },
    ],
  },
  {
    id: "g5",
    name: "Pré-acadêmicos",
    protocol: "ABLLS-R",
    description: "Pré-requisitos para alfabetização e rotina escolar.",
    status: "active",
    specialties: ["psicoped"],
    endDate: "18/12/2026",
    objectives: [
      {
        id: "o7",
        name: "Discriminação de letras",
        programs: [
          { id: "p8", name: "Pareamento de letras", pattern: DISCRETE, status: "active", phases: { baseline: 2, intervention: 1 } },
          { id: "p9", name: "Traçado de vogais", pattern: FREQUENCY, status: "acquired", phases: { acquired: 2 } },
        ],
      },
    ],
  },
];

/** Mais áreas e programas: o texto precisa encolher para caber numa folha. */
const EXTRA_GOALS: Goal[] = [
  {
    id: "g6",
    name: "Imitação",
    protocol: "VB-MAPP",
    description: "Imitar ações motoras e com objetos a partir de modelo do terapeuta.",
    status: "active",
    specialties: ["fono", "aba"],
    endDate: "15/12/2026",
    objectives: [
      {
        id: "o8",
        name: "Imitação motora grossa",
        description: "Reproduzir movimentos amplos logo após o modelo.",
        programs: [
          { id: "p10", name: "Imitação de movimentos com o corpo", pattern: DISCRETE, status: "active", phases: { intervention: 4, generalization: 2 } },
          { id: "p11", name: "Imitação com objetos", pattern: DISCRETE, status: "active", phases: { baseline: 3 } },
        ],
      },
      {
        id: "o9",
        name: "Imitação vocal",
        description: "Ecoar sílabas e palavras simples.",
        programs: [{ id: "p12", name: "Ecoico de sílabas", pattern: FREQUENCY, status: "active", phases: { intervention: 3 } }],
      },
    ],
  },
  {
    id: "g7",
    name: "Comportamento de Ouvinte",
    protocol: "VB-MAPP",
    description: "Seguir instruções e identificar itens nomeados pelo interlocutor.",
    status: "active",
    specialties: ["fono"],
    endDate: "30/11/2026",
    objectives: [
      {
        id: "o10",
        name: "Seguir instruções de um passo",
        description: "Executar comandos simples no contexto da sessão e em casa.",
        programs: [
          { id: "p13", name: "Instruções com gesto", pattern: DISCRETE, status: "acquired", phases: { acquired: 4 } },
          { id: "p14", name: "Instruções sem gesto", pattern: DISCRETE, status: "active", phases: { intervention: 3, maintenance: 1 } },
        ],
      },
      {
        id: "o11",
        name: "Identificar figuras",
        description: "Apontar a figura nomeada entre três opções.",
        programs: [{ id: "p15", name: "Identificação de animais", pattern: DISCRETE, status: "active", phases: { generalization: 2 } }],
      },
    ],
  },
  {
    id: "g8",
    name: "Brincar",
    description: "Ampliar o repertório de brincadeiras funcionais e simbólicas, sozinho e com pares.",
    status: "active",
    specialties: ["psico", "to"],
    endDate: "18/12/2026",
    objectives: [
      {
        id: "o12",
        name: "Brincar funcional",
        description: "Usar brinquedos conforme a função, por pelo menos dois minutos.",
        programs: [
          { id: "p16", name: "Encaixe e empilhamento", pattern: DURATION, status: "active", phases: { maintenance: 2 } },
          { id: "p17", name: "Brincadeira de faz de conta", pattern: DURATION, status: "active", phases: { baseline: 2 } },
        ],
      },
      {
        id: "o13",
        name: "Brincar com pares",
        description: "Compartilhar materiais e seguir regras simples de jogo.",
        programs: [{ id: "p18", name: "Jogo de turnos com bola", pattern: FREQUENCY, status: "active", phases: { intervention: 2 } }],
      },
    ],
  },
  {
    id: "g9",
    name: "Alimentação",
    protocol: "AFLS",
    description: "Aceitação de novos alimentos e autonomia nas refeições.",
    status: "active",
    specialties: ["to"],
    endDate: "20/12/2026",
    objectives: [
      {
        id: "o14",
        name: "Ampliar seletividade alimentar",
        description: "Tocar, cheirar e provar alimentos novos de forma gradual.",
        programs: [
          { id: "p19", name: "Dessensibilização com frutas", pattern: FREQUENCY, status: "active", phases: { intervention: 3 } },
          { id: "p20", name: "Uso de talheres", pattern: DISCRETE, status: "interrupted", phases: { baseline: 2 } },
        ],
      },
    ],
  },
];

export const PIC_FIXTURES: Fixture<PicFixture>[] = [
  {
    id: "pic.plan",
    label: "PIC em vigência",
    description: "Cinco áreas, uma delas adquirida.",
    data: { patient: PATIENT, plans: PLANS, goals: GOALS },
  },
  {
    id: "pic.export",
    label: "Exportar PIC aberto",
    description: "O mesmo PIC, com o modal de exportação aberto.",
    data: { patient: PATIENT, plans: PLANS, goals: GOALS, exportOpen: true },
  },
  {
    id: "pic.export-dense",
    label: "Exportar PIC com muitas áreas",
    description: "Nove áreas: o texto é reduzido para caber numa página.",
    data: { patient: PATIENT, plans: PLANS, goals: [...GOALS, ...EXTRA_GOALS], exportOpen: true },
  },
];
