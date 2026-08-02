import type { Rule } from "@brucesantos/design-space";
import type {
  Protocol,
  ProtocolArea,
  ProtocolExecution,
  ProtocolQuestion,
} from "../contracts/index.js";

/**
 * Regras da aplicação de protocolo.
 *
 * Um protocolo é a avaliação de onde o plano nasce: aplicado o instrumento, as
 * áreas viram metas e os itens viram objetivos. São dezenas — às vezes centenas
 * — de itens, aplicados ao longo de várias sessões, e é isso que faz a navegação
 * ser regra de negócio e não detalhe de interface.
 *
 * Traduzidas de `ProtocolNavigation`, `ProtocolNextQuestion`,
 * `ProtocolAreaProgress` e `CalculateProtocolExecution`.
 */
export const protocolRules: Rule[] = [
  {
    id: "protocol-resumes-at-first-unanswered",
    statement:
      "Retomar uma aplicação vai para a primeira questão ainda sem resposta: dentro da área atual primeiro, depois na próxima área, e só então volta ao começo do protocolo.",
    rationale:
      "Um protocolo é aplicado em várias sessões. Retomar do início obrigaria a rolar por dezenas de itens já respondidos toda vez, e é assim que se pula item sem perceber.",
    source: "src/rules/protocols.ts",
  },
  {
    id: "protocol-progress-is-completion-not-score",
    statement:
      "O percentual da aplicação mede quanto do instrumento foi respondido, não como o paciente pontuou.",
    rationale:
      "São duas leituras opostas do mesmo número. Uma tela que mostre '38%' sem dizer qual das duas é convida a interpretar preenchimento como desempenho — e a conversar com a família sobre isso.",
    source: "src/rules/protocols.ts",
  },
  {
    id: "protocol-area-progress-is-independent",
    statement:
      "Cada área tem progresso próprio, contado sobre as questões dela. Uma área concluída não adianta nada nas outras.",
    rationale:
      "É por área que a aplicação é dividida entre sessões e, às vezes, entre profissionais. O total do protocolo não diz onde parar hoje.",
    source: "src/rules/protocols.ts",
  },
  {
    id: "answer-scale-depends-on-format",
    statement:
      "No formato padrão, a escala de respostas é a mesma para todo o protocolo. No formato ABLLS-R, cada questão tem faixa numérica própria.",
    rationale:
      "Muda o controle na tela item a item. Assumir escala única quebra o ABLLS-R em silêncio: a resposta cabe no campo e significa outra coisa.",
    source: "src/rules/protocols.ts",
  },
  {
    id: "reassessment-follows-the-instrument",
    statement:
      "A data da próxima reavaliação vem do intervalo declarado no protocolo, contado a partir do fim da aplicação.",
    rationale:
      "O intervalo é propriedade do instrumento, não escolha de quem aplica. Deixar a data em aberto é como uma reavaliação atrasa um ano sem ninguém notar.",
    source: "src/rules/protocols.ts",
  },
];

/* ============================================================= navegação */

/** Todas as questões do protocolo, em ordem de área e de posição. */
export function orderedQuestions(protocol: Protocol): ProtocolQuestion[] {
  return [...protocol.areas]
    .sort((a, b) => a.position - b.position)
    .flatMap((area) => [...area.questions].sort((a, b) => a.position - b.position));
}

export function isAnswered(question: ProtocolQuestion): boolean {
  return question.answer !== undefined;
}

/**
 * Implementação de `protocol-resumes-at-first-unanswered`, espelhando
 * `ProtocolNextQuestion.get_next_unanswered_question/1`.
 *
 * A ordem de busca do monólito é: resto da área atual, depois as áreas
 * seguintes, e só então o protocolo inteiro desde o começo. A terceira etapa é o
 * que recupera itens pulados lá atrás — sem ela, quem voltou uma área para
 * corrigir algo ficaria preso ali.
 */
export function nextUnanswered(
  protocol: Protocol,
  fromQuestionId?: string,
): ProtocolQuestion | undefined {
  const areas = [...protocol.areas].sort((a, b) => a.position - b.position);
  const current = fromQuestionId ? locate(protocol, fromQuestionId) : undefined;

  if (current) {
    const rest = sorted(current.area).filter(
      (question) => question.position > current.question.position && !isAnswered(question),
    );
    if (rest[0]) return rest[0];

    const later = areas.filter((area) => area.position > current.area.position);
    for (const area of later) {
      const found = sorted(area).find((question) => !isAnswered(question));
      if (found) return found;
    }
  }

  // Volta ao começo: recupera o que ficou para trás.
  return orderedQuestions(protocol).find((question) => !isAnswered(question));
}

/**
 * Implementação de `ProtocolNavigation.next/2` e `previous/2`.
 *
 * Diferente de `nextUnanswered`, esta navegação não pula respondidas: é o avanço
 * manual, que precisa passar por tudo para quem quer revisar.
 */
export function neighbour(
  protocol: Protocol,
  questionId: string,
  direction: "next" | "previous",
): ProtocolQuestion | undefined {
  const all = orderedQuestions(protocol);
  const index = all.findIndex((question) => question.id === questionId);
  if (index === -1) return undefined;
  return direction === "next" ? all[index + 1] : all[index - 1];
}

function sorted(area: ProtocolArea): ProtocolQuestion[] {
  return [...area.questions].sort((a, b) => a.position - b.position);
}

function locate(
  protocol: Protocol,
  questionId: string,
): { area: ProtocolArea; question: ProtocolQuestion } | undefined {
  for (const area of protocol.areas) {
    const question = area.questions.find((item) => item.id === questionId);
    if (question) return { area, question };
  }
  return undefined;
}

/* ============================================================== progresso */

/**
 * Implementação de `protocol-progress-is-completion-not-score`, espelhando
 * `CalculateProtocolExecution.calculate/1`.
 *
 * Vale registrar a armadilha de nome no monólito: a variável que guarda as
 * respondidas se chama `unanswered_count`. A conta está certa e o nome diz o
 * contrário — mais um motivo para o enunciado da regra estar aqui, e não numa
 * leitura do código.
 */
export function completion(protocol: Protocol): { answered: number; total: number; percent: number } {
  const all = orderedQuestions(protocol);
  const answered = all.filter(isAnswered).length;
  return {
    answered,
    total: all.length,
    percent: all.length > 0 ? Math.round((answered * 100) / all.length) : 0,
  };
}

/** Implementação de `protocol-area-progress-is-independent`. */
export function areaProgress(
  area: ProtocolArea,
): { answered: number; total: number; percent: number } {
  const answered = area.questions.filter(isAnswered).length;
  const total = area.questions.length;
  return {
    answered,
    total,
    percent: total > 0 ? Math.round((answered * 100) / total) : 0,
  };
}

export function isComplete(protocol: Protocol): boolean {
  const { answered, total } = completion(protocol);
  return total > 0 && answered === total;
}

/* ================================================================ escala */

/**
 * Implementação de `answer-scale-depends-on-format`.
 *
 * Devolve o que a tela precisa para desenhar o controle da questão: uma lista de
 * opções no formato padrão, uma faixa numérica no ABLLS-R. Devolver `undefined`
 * quando o instrumento está mal configurado é melhor que devolver uma lista
 * vazia, porque força a tela a dizer que não sabe o que perguntar.
 */
export function answerControl(
  protocol: Protocol,
  question: ProtocolQuestion,
): { kind: "scale"; options: Protocol["answers"] } | { kind: "range"; min: number; max: number } | undefined {
  if (protocol.format === "abllsr") {
    return question.range ? { kind: "range", ...question.range } : undefined;
  }
  return protocol.answers.length > 0 ? { kind: "scale", options: protocol.answers } : undefined;
}

/* =========================================================== reavaliação */

/**
 * Implementação de `reassessment-follows-the-instrument`.
 *
 * Soma meses à data de conclusão sem tocar no relógio: recebe a data de fim e
 * devolve a data alvo. Meses somados com `setMonth` estouram para o mês
 * seguinte quando o dia não existe no destino — 31 de janeiro mais um mês daria
 * 2 ou 3 de março. O grampo no último dia do mês evita isso.
 */
export function reassessmentDate(finishedAt: string, months: number): string {
  const [year, month, day] = finishedAt.slice(0, 10).split("-").map(Number);
  const targetMonthIndex = month! - 1 + months;
  const targetYear = year! + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day!, lastDay);

  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

/** Quanto falta para a reavaliação, em dias. Negativo significa atrasada. */
export function daysUntilReassessment(execution: ProtocolExecution): number | undefined {
  if (!execution.reassessmentDate) return undefined;
  const target = Date.parse(`${execution.reassessmentDate}T00:00:00.000-03:00`);
  const now = Date.parse(execution.now.slice(0, 10) + "T00:00:00.000-03:00");
  return Math.round((target - now) / 86_400_000);
}

/* ============================================================== permissão */

type Decision = { allowed: boolean; reason?: string };

export function canApplyProtocol(permissions: string[]): Decision {
  if (!permissions.includes("protocols.list")) {
    return {
      allowed: false,
      reason: "Seu perfil não alcança protocolos.",
    };
  }
  return { allowed: true };
}

export function canEditProtocol(permissions: string[]): Decision {
  if (!permissions.includes("protocols.edit")) {
    return {
      allowed: false,
      reason: "Só coordenação, admin de clínica e admin editam protocolos.",
    };
  }
  return { allowed: true };
}
