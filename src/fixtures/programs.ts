import type { Fixture } from "@brucesantos/design-space";
import type {
  Criteria,
  Goal,
  InterventionPlanData,
  PhaseConfiguration,
  PlanProgram,
  PlanStep,
  StepSessionResult,
} from "../contracts/index.js";

/**
 * Fixtures do plano de intervenção do Théo.
 *
 * O mesmo paciente das fixtures de atendimento, um nível acima: o que é ensinado
 * a ele, e quanto falta para cada coisa estar aprendida. Ver o plano e depois a
 * sessão — ou o contrário — é o que torna visível a relação entre o critério
 * combinado e a tentativa marcada.
 *
 * Os números do histórico são escolhidos para deixar cada situação inequívoca:
 * um passo a uma sessão do domínio, um que oscila, um que regrediu. Histórico
 * plausível esconderia justamente a fronteira que a regra existe para marcar.
 */

const PACIENTE = {
  id: "pac-theo",
  name: "Théo Andrade Lins",
  birthDate: "2019-11-04",
};

/** 80% em 3 sessões consecutivas — o critério mais comum na clínica. */
const dominio = (performance: number, frequency: number, criteria: Criteria["criteria"] = "consecutive"): Criteria => ({
  criteria,
  frequency,
  performance,
});

/**
 * Configuração padrão de fases.
 *
 * A linha de base tem `performance` zero porque o monólito força isso: medir
 * antes de ensinar encerra por número de sessões, não por desempenho.
 */
function fases(overrides: Partial<PhaseConfiguration> = {}): PhaseConfiguration {
  return {
    baseline: { mastery: dominio(0, 3) },
    intervention: {
      mastery: dominio(80, 3),
      regression: dominio(50, 2),
    },
    generalization: {
      mastery: dominio(80, 2),
      regression: dominio(60, 2),
    },
    maintenance: {
      mastery: dominio(90, 2),
      regression: dominio(70, 2),
    },
    autoControl: true,
    hasPromptFading: false,
    ...overrides,
  };
}

const sessoes = (...performances: number[]): StepSessionResult[] =>
  performances.map((performance, index) => ({
    // Sessões semanais, terminando na semana da data de referência.
    date: `2026-0${index < 2 ? 6 : 7}-${String(3 + index * 7).padStart(2, "0")}`,
    performance,
  }));

function passo(overrides: Partial<PlanStep> & { id: string; name: string }): PlanStep {
  return {
    position: 1,
    status: "active",
    phase: "intervention",
    history: [],
    ...overrides,
  };
}

/* ============================================================= programas */

const mandoFigura: PlanProgram = {
  id: "prog-mando-figura",
  name: "Mando com apoio de figura",
  shortDescription: "Pedir item preferido apontando a figura correspondente.",
  programType: "structured",
  answerType: "task_training",
  status: "active",
  phaseConfiguration: fases(),
  specialties: ["Aplicador ABA", "Fonoaudiologia"],
  steps: [
    passo({
      id: "passo-mando-1",
      name: "Apontar figura na presença do item",
      position: 1,
      status: "acquired",
      phase: "acquired",
      acquiredAt: "2026-07-09T10:00:00.000-03:00",
      history: sessoes(60, 80, 90, 100),
    }),
    passo({
      id: "passo-mando-2",
      name: "Apontar figura sem o item à vista",
      position: 2,
      phase: "intervention",
      phaseStartedAt: "2026-07-09T10:00:00.000-03:00",
      // Duas sessões seguidas no alvo. Falta uma para fechar a intervenção.
      history: sessoes(50, 70, 85, 90),
    }),
  ],
};

const mandoVocal: PlanProgram = {
  id: "prog-mando-vocal",
  name: "Mando vocal",
  shortDescription: "Pedir item preferido por fala, sem apoio de figura.",
  programType: "structured",
  answerType: "task_training",
  status: "active",
  phaseConfiguration: fases({ hasPromptFading: true }),
  specialties: ["Fonoaudiologia"],
  steps: [
    passo({
      id: "passo-vocal-1",
      name: "Emitir aproximação vocal do nome do item",
      position: 1,
      phase: "baseline",
      phaseStartedAt: "2026-07-23T10:00:00.000-03:00",
      // Linha de base não tem meta de acerto: conta sessões, não desempenho.
      history: sessoes(20, 10),
    }),
  ],
};

const tatoAnimais: PlanProgram = {
  id: "prog-tato",
  name: "Tato de figuras — animais",
  shortDescription: "Nomear a figura apresentada, sem apoio.",
  programType: "structured",
  answerType: "task_training",
  status: "acquired",
  acquiredAt: "2026-07-16T10:00:00.000-03:00",
  phaseConfiguration: fases(),
  specialties: ["Aplicador ABA"],
  steps: [
    passo({
      id: "passo-tato-1",
      name: "Nomear figura apresentada",
      position: 1,
      status: "acquired",
      phase: "acquired",
      acquiredAt: "2026-07-16T10:00:00.000-03:00",
      history: sessoes(70, 90, 95, 100),
    }),
  ],
};

const espera: PlanProgram = {
  id: "prog-espera",
  name: "Tolerância à espera",
  shortDescription: "Registro incidental de espera por item preferido.",
  programType: "incidental",
  answerType: "duration",
  status: "active",
  // Programa incidental não tem configuração de fase: é registro solto, sem
  // critério de domínio. O monólito só exige `phase_configuration` no estruturado.
  specialties: ["Aplicador ABA"],
  steps: [
    passo({
      id: "passo-espera-1",
      name: "Aguardar item preferido",
      position: 1,
      phase: "intervention",
      history: sessoes(40, 60, 55),
    }),
  ],
};

/** Versão antiga, substituída. Continua existindo porque as tentativas são dela. */
const imitacaoV1: PlanProgram = {
  id: "prog-imitacao-v1",
  name: "Imitação motora grossa",
  shortDescription: "Reproduzir movimento apresentado pelo modelo.",
  programType: "structured",
  answerType: "task_training",
  status: "active",
  nextVersionId: "prog-imitacao-v2",
  phaseConfiguration: fases({ intervention: { mastery: dominio(70, 3) } }),
  specialties: ["Aplicador ABA"],
  steps: [
    passo({
      id: "passo-imitacao-v1-1",
      name: "Bater palmas após modelo",
      position: 1,
      history: sessoes(50, 70, 75),
    }),
  ],
};

const imitacaoV2: PlanProgram = {
  id: "prog-imitacao-v2",
  name: "Imitação motora grossa",
  shortDescription: "Reproduzir movimento apresentado pelo modelo. Critério revisado para 80%.",
  programType: "structured",
  answerType: "task_training",
  status: "active",
  phaseConfiguration: fases(),
  specialties: ["Aplicador ABA"],
  steps: [
    passo({
      id: "passo-imitacao-v2-1",
      name: "Bater palmas após modelo",
      position: 1,
      history: sessoes(80, 85, 90),
    }),
    passo({
      id: "passo-imitacao-v2-2",
      name: "Levantar os braços após modelo",
      position: 2,
      phase: "generalization",
      phaseStartedAt: "2026-07-16T10:00:00.000-03:00",
      history: sessoes(90, 85),
    }),
  ],
};

/** Passo em manutenção que caiu duas sessões seguidas: a regressão dispara. */
const contatoVisual: PlanProgram = {
  id: "prog-contato",
  name: "Contato visual sob chamada",
  shortDescription: "Olhar para o interlocutor ao ouvir o próprio nome.",
  programType: "structured",
  answerType: "task_training",
  status: "active",
  phaseConfiguration: fases(),
  specialties: ["Aplicador ABA"],
  steps: [
    passo({
      id: "passo-contato-1",
      name: "Olhar ao ouvir o próprio nome",
      position: 1,
      phase: "maintenance",
      phaseStartedAt: "2026-07-02T10:00:00.000-03:00",
      // Estava em 95 e caiu para 60 e 55: abaixo de 70 em duas seguidas.
      history: sessoes(95, 90, 60, 55),
    }),
  ],
};

/* ================================================================= metas */

const comunicacao: Goal = {
  id: "meta-comunicacao",
  name: "Comunicação funcional",
  status: "active",
  protocolName: "ABLLS-R",
  objectives: [
    {
      id: "obj-pedir",
      name: "Pedir itens preferidos",
      status: "active",
      programs: [mandoFigura, mandoVocal],
    },
    {
      id: "obj-nomear",
      name: "Nomear objetos do cotidiano",
      status: "acquired",
      acquiredAt: "2026-07-16T10:00:00.000-03:00",
      programs: [tatoAnimais],
    },
  ],
};

const autonomia: Goal = {
  id: "meta-autonomia",
  name: "Autonomia e regulação",
  status: "active",
  objectives: [
    {
      id: "obj-espera",
      name: "Tolerar espera por item preferido",
      status: "active",
      programs: [espera],
    },
    {
      id: "obj-imitacao",
      name: "Imitar movimentos do modelo",
      status: "active",
      programs: [imitacaoV1, imitacaoV2],
    },
  ],
};

/**
 * Meta montada para a cascata: um objetivo, um programa, dois passos, e um deles
 * já adquirido. Marcar o que falta fecha programa, objetivo e meta de uma vez.
 */
const reciprocidade: Goal = {
  id: "meta-reciprocidade",
  name: "Reciprocidade social",
  status: "active",
  objectives: [
    {
      id: "obj-contato",
      name: "Responder à chamada pelo nome",
      status: "active",
      programs: [
        {
          id: "prog-reciprocidade",
          name: "Resposta à chamada",
          programType: "structured",
          answerType: "task_training",
          status: "active",
          phaseConfiguration: fases(),
          specialties: ["Aplicador ABA"],
          steps: [
            passo({
              id: "passo-recip-1",
              name: "Responder na primeira chamada",
              position: 1,
              status: "acquired",
              phase: "acquired",
              acquiredAt: "2026-07-23T10:00:00.000-03:00",
              history: sessoes(85, 90, 95),
            }),
            passo({
              id: "passo-recip-2",
              name: "Responder em ambiente com ruído",
              position: 2,
              phase: "maintenance",
              // Uma sessão no alvo. Falta uma para fechar tudo.
              history: sessoes(70, 95),
            }),
          ],
        },
      ],
    },
  ],
};

const regressao: Goal = {
  id: "meta-regressao",
  name: "Reciprocidade social",
  status: "active",
  objectives: [
    {
      id: "obj-contato-visual",
      name: "Manter contato visual",
      status: "active",
      programs: [contatoVisual],
    },
  ],
};

const NOW = "2026-07-30T09:00:00.000-03:00";

export const programFixtures: Fixture<InterventionPlanData>[] = [
  {
    id: "plan-full",
    label: "Plano de intervenção completo",
    description:
      "Duas metas do Théo, com programa em linha de base, em intervenção, adquirido, incidental e uma versão substituída.",
    data: { plan: { patient: PACIENTE, now: NOW, goals: [comunicacao, autonomia] } },
  },
  {
    id: "plan-empty",
    label: "Paciente sem plano",
    description: "Cadastro feito, avaliação ainda não aplicada. Nenhuma meta montada.",
    data: { plan: { patient: PACIENTE, now: NOW, goals: [] } },
  },
  {
    id: "plan-cascade",
    label: "Uma sessão de fechar a meta inteira",
    description:
      "O último passo do último programa do único objetivo da meta, a uma sessão do domínio. Marcar fecha os três níveis.",
    data: { plan: { patient: PACIENTE, now: NOW, goals: [reciprocidade] } },
  },
  {
    id: "plan-regression",
    label: "Regressão em manutenção",
    description:
      "Passo que estava em 95% caiu para 60% e 55%. Abaixo de 70% em duas seguidas dispara a volta para generalização.",
    data: { plan: { patient: PACIENTE, now: NOW, goals: [regressao] } },
  },
  {
    id: "plan-superseded",
    label: "Programa substituído por nova versão",
    description:
      "Imitação motora grossa em duas versões: a antiga com critério de 70%, a vigente com 80%. A antiga guarda as tentativas.",
    data: {
      plan: {
        patient: PACIENTE,
        now: NOW,
        goals: [
          {
            ...autonomia,
            objectives: autonomia.objectives.filter((item) => item.id === "obj-imitacao"),
          },
        ],
      },
    },
  },
];

export const programIds = {
  mandoFigura: mandoFigura.id,
  mandoVocal: mandoVocal.id,
  imitacaoV1: imitacaoV1.id,
  imitacaoV2: imitacaoV2.id,
} as const;
