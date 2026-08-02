import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do plano de intervenção.
 *
 * A pergunta que este módulo responde é "como o Bloomy decide que o paciente
 * aprendeu". A resposta está espalhada por quatro módulos do monólito e não é
 * enunciada em português em lugar nenhum — nem na interface. Cada cenário aqui
 * fixa uma parte desse enunciado.
 *
 * Vale notar quem **não** aparece nesta lista como persona autorizada: o
 * aplicador. `ProgramPolicy` não o inclui em nenhuma das oito ações, nem em
 * `list`. Quem aplica o programa não alcança o programa, e o cenário
 * `programs.applicator-blocked` existe para tornar isso discutível.
 */
export const programScenarios: Scenario[] = [
  {
    id: "programs.plan",
    title: "Plano de intervenção do paciente",
    intent:
      "Tornar legível a hierarquia de quatro níveis e o quanto falta em cada programa, sem abrir um a um.",
    route: "/patients/pac-theo/plan",
    persona: "coordinator",
    fixture: "plan-full",
    rules: ["mastery-closes-phase", "acquisition-cascades-upward"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Meta, objetivo e programa são headings de níveis distintos, para navegação por estrutura. O histórico de sessões tem rótulo textual completo.",
    },
    status: "in-review",
    preconditions: [
      "Duas metas ativas, com programa em linha de base, em intervenção, adquirido, incidental e uma versão substituída.",
    ],
    expected: [
      "Cada nível mostra quantos filhos já foram adquiridos.",
      "Cada passo mostra a fase, o critério por extenso e quantas sessões faltam.",
      "Objetivo adquirido aparece marcado, com a data.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "programs.empty",
    title: "Paciente sem plano",
    intent: "Definir o vazio de quem foi cadastrado mas ainda não teve avaliação aplicada.",
    route: "/patients/pac-theo/plan",
    persona: "coordinator",
    fixture: "plan-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A tela explica que o plano nasce de uma avaliação, em vez de dizer apenas que está vazio.",
    ],
    tags: ["vazio"],
  },
  {
    id: "programs.mastery-criteria",
    title: "Critério de domínio por extenso",
    intent:
      "Verificar se dá para prever a próxima sessão, e não apenas constatar a atual — que é o trabalho de quem coordena.",
    route: "/patients/pac-theo/plan",
    persona: "therapeutic_companion",
    fixture: "plan-full",
    rules: ["mastery-closes-phase", "consecutive-differs-from-cumulative"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "Passo em intervenção com critério de 80% em 3 sessões consecutivas, e duas seguidas já no alvo.",
    ],
    expected: [
      "O critério aparece escrito: 80% de acerto em 3 sessões consecutivas.",
      "O progresso mostra 2 de 3 e diz que falta 1 sessão.",
      "A tela avisa que uma sessão abaixo do alvo zera a contagem consecutiva.",
      "O histórico marca cada sessão como no alvo ou abaixo dele, sem depender de cor.",
    ],
    tags: ["regra", "sucesso"],
  },
  {
    id: "programs.baseline",
    title: "Linha de base não tem meta de acerto",
    intent:
      "Impedir que a linha de base seja lida como um passo fácil: ela é um passo sem nota, não com nota zero.",
    route: "/patients/pac-theo/plan",
    persona: "therapeutic_companion",
    fixture: "plan-full",
    rules: ["baseline-has-no-performance-target"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`Bloomy.Programs.PhaseConfiguration` força `mastery_performance` a zero na linha de base.",
    ],
    expected: [
      "O critério da linha de base é escrito como número de sessões, sem percentual.",
      "A tela não exibe “0% exigido” como se fosse uma meta.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "programs.cascade",
    title: "Uma sessão de fechar a meta inteira",
    intent:
      "Avisar da cascata antes de ela acontecer, enquanto ainda dá para conferir — e não no relatório do mês seguinte.",
    route: "/patients/pac-theo/plan",
    persona: "coordinator",
    fixture: "plan-cascade",
    rules: ["acquisition-cascades-upward"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "O último passo do único programa do único objetivo da meta, a uma sessão do domínio.",
    ],
    expected: [
      "A tela avisa que adquirir este passo encerra o programa, o objetivo e a meta.",
      "O aviso aparece no passo, onde a decisão é tomada, e não no topo da página.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "programs.regression",
    title: "Regressão em manutenção",
    intent:
      "Tornar visível que manutenção existe para detectar perda, e que a perda tem consequência automática.",
    route: "/patients/pac-theo/plan",
    persona: "supervisor",
    fixture: "plan-regression",
    rules: ["regression-returns-to-previous-phase"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "Passo que estava em 95% caiu para 60% e 55%. O critério de regressão é abaixo de 70% em duas seguidas.",
    ],
    expected: [
      "A tela avisa que o passo volta para generalização, nomeando a fase de destino.",
      "O aviso diz qual foi o critério atingido, com percentual e número de sessões.",
      "As duas sessões abaixo do alvo aparecem marcadas no histórico.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "programs.incidental",
    title: "Programa incidental não tem critério",
    intent:
      "Distinguir contagem de aquisição — o incidental registra, não mede domínio, e a tela precisa dizer isso.",
    route: "/patients/pac-theo/plan",
    persona: "therapeutic_companion",
    fixture: "plan-full",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "O monólito só exige `phase_configuration` em programa estruturado; o incidental não tem.",
    ],
    expected: [
      "O programa incidental aparece identificado como tal.",
      "A tela diz que é contagem e não aquisição, em vez de exibir “0 de 0 sessões”.",
    ],
    tags: ["regra", "vazio"],
  },
  {
    id: "programs.superseded",
    title: "Versão de programa substituída",
    intent:
      "Explicar por que uma versão antiga continua na tela, para ninguém tentar limpá-la achando que é lixo.",
    route: "/patients/pac-theo/plan",
    persona: "coordinator",
    fixture: "plan-superseded",
    rules: ["superseded-version-keeps-its-history"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "Imitação motora grossa em duas versões: a antiga com critério de 70%, a vigente com 80%.",
    ],
    expected: [
      "A versão substituída aparece marcada, visualmente recuada, e explicada.",
      "A explicação diz que as tentativas registradas pertencem a ela.",
      "As duas versões mostram o próprio critério, que é diferente entre elas.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "programs.applicator-blocked",
    title: "Aplicador não alcança os programas",
    intent:
      "Tornar discutível uma consequência da policy real: quem aplica o programa não tem permissão de vê-lo.",
    route: "/patients/pac-theo/plan",
    persona: "applicator",
    fixture: "plan-full",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    preconditions: [
      "`ProgramPolicy` não inclui `applicator` em nenhuma das oito ações, nem em `list`.",
    ],
    expected: [
      "A tela explica quem alcança o plano, em vez de devolver erro.",
      "O bloqueio é de permissão, não de dado: o plano existe e está montado.",
    ],
    tags: ["permissão", "exceção"],
  },
];
