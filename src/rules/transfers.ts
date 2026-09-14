import type { Rule } from "@brucesantos/design-space";
import type {
  TransferMap,
  TransferProfessional,
  TransferScope,
  TransferSlot,
  TransferWeekday,
  TransfersData,
} from "../contracts/index.js";
import { formatNumericDate } from "../contracts/index.js";

/**
 * Regras da Central de Transferências.
 *
 * A área é **proposta** — ver o comentário do domínio em `src/contracts`. Estas
 * regras não traduzem policy nem changeset: fixam decisões do desenho que,
 * soltas, a engenharia reinterpretaria — e duas delas decidem se a tela mente
 * ou não.
 *
 * - **A seleção disputa consigo mesma.** Sem isso, mover dez mapas das 08:00
 *   para a mesma pessoa apareceria como dez transferências viáveis.
 * - **A transferência é parcial por natureza.** O que cabe sai da fila, o resto
 *   volta para ela. Uma tela que só sabe aplicar tudo ou nada obriga a
 *   coordenação a refazer a seleção à mão a cada rodada.
 */

/**
 * O mínimo do motivo da exceção, em caracteres.
 *
 * O desenho aceita cinco, e cinco aceitam "urgen". O texto fica no histórico do
 * mapa e é lido meses depois por quem audita a transferência — quem escreve
 * está com pressa, quem lê não tem mais ninguém a quem perguntar.
 */
export const MIN_EXCEPTION_REASON = 10;

export const WEEKDAY_LABEL: Record<TransferWeekday, string> = {
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
};

export const WEEKDAYS: TransferWeekday[] = [1, 2, 3, 4, 5];

export const transferRules: Rule[] = [
  {
    id: "outside-the-schedule-is-not-a-clash",
    statement:
      "Horário fora da escala do destino e horário disputado com um paciente do destino são impedimentos diferentes, e a simulação os separa: o primeiro é “Não cabe”, o segundo é “Não cabe junto”.",
    rationale:
      "As duas frases pedem ações opostas de pessoas diferentes. Fora da escala, quem resolve é quem monta a agenda padrão do profissional — e nenhum outro destino da mesma especialidade vai ajudar se o problema for a terça de manhã inteira. Disputado, quem resolve é a própria coordenação escolhendo outro destino para aquele mapa, o que é uma rodada a mais e não uma conversa. Achatar os dois em “conflito” faria a coordenação procurar destino para o caso em que destino nenhum serve.",
    source: "src/rules/transfers.ts",
  },
  {
    id: "the-selection-competes-with-itself",
    statement:
      "A simulação avalia a seleção acumulando a ocupação que ela própria cria no destino: a ordem inicial é dia, horário e nome; a coordenação pode priorizar um mapa em disputa, preservando os horários que já pertencem ao destino.",
    rationale:
      "É o que separa esta tela de uma lista de verificações independentes. Numa unidade em que trinta e cinco sessões começam às 08:00 de terça, avaliar cada mapa isoladamente contra a agenda de quem recebe diz “cabe” trinta e cinco vezes — e a coordenação aplica, a agenda gera trinta e quatro conflitos, e o erro só aparece depois de os responsáveis já terem sido avisados da troca.",
    source: "src/rules/transfers.ts",
  },
  {
    id: "a-transfer-is-partial-by-nature",
    statement:
      "Aplicar uma rodada move apenas os mapas que cabem no destino. Os que não couberam continuam selecionados, na fila, e a tela pede o próximo destino — até a fila zerar.",
    rationale:
      "Uma pessoa inativada deixa vinte mapas e ninguém os absorve sozinho: a movimentação real é uma sequência de destinos, não uma escolha. Com aplicar-tudo-ou-nada, a coordenação teria de desmarcar à mão o que não coube para tentar o destino seguinte — e é exatamente aí que um mapa é esquecido, porque o que sobra não está em lista nenhuma. Mantendo o resto selecionado, a fila é a lista, e ela só some quando acabou.",
    source: "src/rules/transfers.ts",
  },
  {
    id: "crossing-specialty-requires-a-written-reason",
    statement: `A transferência é entre profissionais da mesma especialidade. Sair dela é exceção: exige a marcação explícita e um motivo escrito de pelo menos ${MIN_EXCEPTION_REASON} caracteres, que fica no histórico do mapa. Sem o motivo, Simular fica indisponível — visível, alcançável por Tab e com a razão associada ao controle.`,
    rationale:
      "Uma criança em fonoaudiologia passar a ser atendida por uma terapeuta ocupacional não é um erro de preenchimento: pode ser a decisão certa numa semana de falta, e é sempre uma decisão clínica que alguém vai ter de justificar para a família e para o convênio. O que não pode é acontecer por deslize de seleção. Marcar a exceção e escrever o motivo custa dois gestos e transforma o desvio em registro; esconder a opção só faria a coordenação transferir uma por uma pela tela do paciente, onde ninguém pergunta nada.",
    source: "src/rules/transfers.ts",
  },
  {
    id: "a-map-without-a-professional-is-listed-with-the-others",
    statement:
      "Mapa sem profissional aparece na mesma lista dos mapas ativos, com o motivo de ter ficado sem e o nome de quem o deixou. O filtro nasce em “todos os mapas”, e permite localizar os mapas sem profissional.",
    rationale:
      "O mapa órfão continua existindo e continua gerando agendamento — o que ele perdeu foi quem atende, não a vigência. Numa tela separada, ele só seria procurado por quem já soubesse que ele existe, e quem sabe é quem inativou o profissional na semana passada. Na mesma lista, ele é encontrado por quem abriu a área para outra coisa, que é como estes mapas de fato aparecem.",
    source: "src/rules/transfers.ts",
  },
];

type Decision = { allowed: boolean; reason?: string };

/* ================================================================ o relógio */

/**
 * Minutos desde a meia-noite, de um `HH:MM`.
 *
 * Sem `Date`, pela mesma razão da gestão de chamadas: as duas pontas são horas
 * da clínica no mesmo dia da semana, e converter para data traria fuso e
 * horário de verão para uma subtração de minutos.
 */
export function toMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

export function slotLabel(slot: TransferSlot): string {
  return `${WEEKDAY_LABEL[slot.weekday]} ${slot.start}–${slot.end}`;
}

/** Horas por semana de um conjunto de faixas. Pode ser fracionário. */
export function weeklyHours(slots: TransferSlot[]): number {
  return slots.reduce((total, slot) => total + (toMinutes(slot.end) - toMinutes(slot.start)) / 60, 0);
}

/** `2h`, `1,5h` — vírgula decimal, que é como a clínica escreve. */
export function formatHours(hours: number): string {
  const arredondado = Math.round(hours * 100) / 100;
  return `${String(arredondado).replace(".", ",")}h`;
}

export const professionalOf = (
  data: TransfersData,
  id: string | null,
): TransferProfessional | undefined =>
  id ? data.professionals.find((professional) => professional.id === id) : undefined;

/* ======================================================== o que cabe onde */

/** A escala do profissional cobre a faixa inteira? */
export function coversSlot(professional: TransferProfessional, slot: TransferSlot): boolean {
  return professional.availability.some(
    (janela) =>
      janela.weekday === slot.weekday &&
      toMinutes(janela.start) <= toMinutes(slot.start) &&
      toMinutes(janela.end) >= toMinutes(slot.end),
  );
}

/**
 * O mapa do destino que já ocupa esta faixa, se houver.
 *
 * `ignoreIds` são os mapas da própria seleção: eles estão saindo de onde
 * estavam, então não podem contar como ocupação de lugar nenhum. Sem isso,
 * reconfirmar um destino que já detém parte da seleção acusaria conflito do
 * mapa com ele mesmo.
 */
export function clashingMap(
  professional: TransferProfessional,
  slot: TransferSlot,
  maps: TransferMap[],
  ignoreIds: string[] = [],
): TransferMap | undefined {
  return maps.find(
    (map) =>
      map.professionalId === professional.id &&
      !ignoreIds.includes(map.id) &&
      map.slots.some(
        (ocupada) =>
          ocupada.weekday === slot.weekday &&
          toMinutes(ocupada.start) < toMinutes(slot.end) &&
          toMinutes(ocupada.end) > toMinutes(slot.start),
      ),
  );
}

/**
 * O veredito de um mapa contra um destino.
 *
 * `same` é o destino que já detém o mapa: não é sucesso nem impedimento, é
 * nada a fazer, e a simulação diz isso em vez de contar como transferência.
 */
export type TransferFit = "same" | "ok" | "warn" | "bad";

/** `availability` não tem outro destino que resolva; `clash` e `batch` têm. */
export type TransferIssueKind = "availability" | "clash" | "batch";

export interface TransferIssue {
  kind: TransferIssueKind;
  text: string;
}

export interface TransferEvaluation {
  map: TransferMap;
  fit: TransferFit;
  issues: TransferIssue[];
}

/**
 * Implementação de `outside-the-schedule-is-not-a-clash`.
 *
 * A ordem das perguntas é parte da regra: fora da escala se pergunta primeiro,
 * e quando a resposta é sim a disputa nem chega a ser consultada. Invertida, um
 * horário em que o destino não trabalha apareceria como "já ocupado por" — o
 * paciente errado, na frase errada, mandando procurar outro destino que também
 * não vai resolver.
 */
export function evaluateMap(
  map: TransferMap,
  professional: TransferProfessional,
  maps: TransferMap[],
  ignoreIds: string[] = [],
): TransferEvaluation {
  if (map.professionalId === professional.id) return { map, fit: "same", issues: [] };

  const issues: TransferIssue[] = [];
  const primeiroNome = professional.name.split(" ")[0];

  for (const slot of map.slots) {
    if (!coversSlot(professional, slot)) {
      issues.push({
        kind: "availability",
        text: `${slotLabel(slot)} fora da escala de ${primeiroNome}`,
      });
      continue;
    }
    const ocupado = clashingMap(professional, slot, maps, ignoreIds);
    if (ocupado) {
      issues.push({
        kind: "clash",
        text: `${slotLabel(slot)} já ocupado por ${ocupado.patient}`,
      });
    }
  }

  return { map, fit: fitOf(issues), issues };
}

function fitOf(issues: TransferIssue[]): TransferFit {
  if (issues.length === 0) return "ok";
  return issues.some((issue) => issue.kind === "availability") ? "bad" : "warn";
}

/**
 * Implementação de `the-selection-competes-with-itself`.
 *
 * A ordem em que os mapas são avaliados **decide qual deles cabe**, então ela é
 * declarada e não pode ser a da seleção: dia da semana, hora de início, nome do
 * paciente. Fosse a ordem dos cliques, dois usuários com a mesma seleção
 * receberiam resultados diferentes, e reordenar a lista mudaria a simulação.
 *
 * Só o mapa que cabe reserva o horário. Um mapa recusado não ocupa nada — ele
 * vai para outro destino na rodada seguinte, e reservar por ele empurraria um
 * terceiro mapa para fora sem motivo.
 */
export function evaluateBatch(
  selection: TransferMap[],
  professional: TransferProfessional,
  maps: TransferMap[],
  priorityId?: string,
): TransferEvaluation[] {
  const selecionados = selection.map((map) => map.id);
  const reservas: { slot: TransferSlot; patient: string }[] = [];

  const reservar = (map: TransferMap) =>
    map.slots.forEach((slot) => reservas.push({ slot, patient: map.patient }));

  const disputas = (slot: TransferSlot) =>
    reservas.filter(
      (reserva) =>
        reserva.slot.weekday === slot.weekday &&
        toMinutes(reserva.slot.start) < toMinutes(slot.end) &&
        toMinutes(reserva.slot.end) > toMinutes(slot.start),
    );

  return [...selection]
    .sort((a, b) => Number(b.professionalId === professional.id) - Number(a.professionalId === professional.id) || Number(b.id === priorityId) - Number(a.id === priorityId) || ordemDeAvaliacao(a, b))
    .map((map) => {
      const base = evaluateMap(map, professional, maps, selecionados);
      if (base.fit === "same") {
        reservar(map);
        return base;
      }

      const internas: TransferIssue[] = [];
      for (const slot of map.slots) {
        const conflitantes = disputas(slot);
        if (conflitantes.length === 0) continue;
        internas.push({
          kind: "batch",
          text: `${slotLabel(slot)} disputado com ${conflitantes.length} mapa${
            conflitantes.length === 1 ? "" : "s"
          } desta seleção`,
        });
      }

      const issues = [...base.issues, ...internas];
      const fit = fitOf(issues);
      if (fit === "ok") reservar(map);
      return { map, fit, issues };
    });
}

function ordemDeAvaliacao(a: TransferMap, b: TransferMap): number {
  const primeiraDe = (map: TransferMap) =>
    [...map.slots].sort(
      (x, y) => x.weekday - y.weekday || toMinutes(x.start) - toMinutes(y.start),
    )[0];
  const sa = primeiraDe(a);
  const sb = primeiraDe(b);
  if (!sa || !sb) return a.patient.localeCompare(b.patient, "pt-BR");
  return (
    sa.weekday - sb.weekday ||
    toMinutes(sa.start) - toMinutes(sb.start) ||
    a.patient.localeCompare(b.patient, "pt-BR")
  );
}

/* ======================================================== a especialidade */

/** As especialidades presentes numa seleção, sem repetição e em ordem. */
export function selectedSpecialties(selection: TransferMap[]): string[] {
  return [...new Set(selection.map((map) => map.specialty))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

/**
 * A transferência sai da especialidade?
 *
 * Seleção com mais de uma especialidade sai por definição: nenhum destino é da
 * mesma que todas. É por isso que a marcação da exceção não pode ser condição
 * suficiente — a seleção mista já é a exceção, com ou sem a caixa marcada.
 */
export function isCrossSpecialty(
  selection: TransferMap[],
  professional: TransferProfessional | undefined,
): boolean {
  const especialidades = selectedSpecialties(selection);
  if (especialidades.length !== 1) return especialidades.length > 1;
  if (!professional) return false;
  return professional.specialty !== especialidades[0];
}

/** Os destinos possíveis, separados entre a mesma especialidade e as outras. */
export function destinationOptions(
  selection: TransferMap[],
  professionals: TransferProfessional[],
): { same: TransferProfessional[]; others: TransferProfessional[] } {
  /* Quem já detém **parte** da seleção continua elegível: esses mapas viram
     `same` na simulação e o resto se move normalmente. Sai da lista só quem já
     detém a seleção inteira, para quem não há transferência nenhuma a fazer. */
  const elegiveis = professionals.filter(
    (professional) =>
      selection.length === 0 ||
      !selection.every((map) => map.professionalId === professional.id),
  );
  const especialidades = selectedSpecialties(selection);
  const same =
    especialidades.length === 1
      ? elegiveis.filter((professional) => professional.specialty === especialidades[0])
      : [];
  return { same, others: elegiveis.filter((professional) => !same.includes(professional)) };
}

/**
 * Implementação de `crossing-specialty-requires-a-written-reason`.
 *
 * A ordem das verificações é parte da regra: seleção, destino, e só então o
 * motivo da exceção. Invertida, a tela pediria a justificativa de um desvio que
 * ainda não se sabe se existe — quem não escolheu destino não sabe se vai sair
 * da especialidade.
 */
export function canSimulate(input: {
  selection: TransferMap[];
  destination: TransferProfessional | undefined;
  crossSpecialty: boolean;
  reason: string;
}): Decision {
  if (input.selection.length === 0) {
    return { allowed: false, reason: "Selecione ao menos um mapa de horas na lista." };
  }
  if (!input.destination) {
    return { allowed: false, reason: "Escolha o profissional de destino." };
  }
  if (!isCrossSpecialty(input.selection, input.destination)) return { allowed: true };
  if (!input.crossSpecialty) {
    return {
      allowed: false,
      reason: "Marque a exceção para transferir para outra especialidade.",
    };
  }
  if (input.reason.trim().length < MIN_EXCEPTION_REASON) {
    return {
      allowed: false,
      reason: `Descreva o motivo da exceção com pelo menos ${MIN_EXCEPTION_REASON} caracteres — ele fica no histórico do mapa.`,
    };
  }
  return { allowed: true };
}

/* ============================================================== a sugestão */

export interface TransferSuggestion {
  professional: TransferProfessional;
  /** Quantos mapas da seleção cabem nele. */
  fits: number;
  /** Horas semanais que ele já carrega, fora a seleção. */
  load: number;
  sameSpecialty: boolean;
}

/**
 * O destino sugerido: mesma especialidade primeiro, mais mapas sem conflito
 * depois, menos carregado como desempate.
 *
 * A carga entra por último de propósito. Ela é o critério justo e o menos
 * urgente: numa movimentação por inativação, a coordenação quer primeiro saber
 * quem absorve mais de uma vez — dividir bem entre quatro pessoas é o problema
 * da segunda rodada, e a sugestão é refeita a cada uma delas.
 */
/**
 * Todos os destinos elegíveis, do melhor para o pior.
 *
 * Isto **já era** o corpo de `suggestDestination`: ele montava a tabela inteira
 * — quantos mapas cabem em cada profissional, quanto cada um já carrega — e
 * devolvia só a primeira linha. A tela pagava o cálculo de todo mundo e mostrava
 * um nome, e quem usava descobria o segundo colocado escolhendo, simulando e
 * recomeçando.
 *
 * A ordem é a mesma de antes, e é ela que define "melhor": mesma especialidade
 * primeiro, depois quem absorve mais mapas, depois quem carrega menos horas, e
 * o nome como desempate para a lista não dançar entre execuções.
 */
export function rankDestinations(
  selection: TransferMap[],
  data: TransfersData,
  allowCrossSpecialty: boolean,
): TransferSuggestion[] {
  if (selection.length === 0) return [];
  const especialidades = selectedSpecialties(selection);
  const selecionados = selection.map((map) => map.id);
  const mesmaEspecialidade = (professional: TransferProfessional) =>
    especialidades.length === 1 && professional.specialty === especialidades[0];

  return data.professionals
    .filter((professional) => !selection.every((map) => map.professionalId === professional.id))
    .filter((professional) => allowCrossSpecialty || mesmaEspecialidade(professional))
    .map((professional) => ({
      professional,
      sameSpecialty: mesmaEspecialidade(professional),
      fits: evaluateBatch(selection, professional, data.maps).filter(
        (avaliacao) => avaliacao.fit === "ok",
      ).length,
      load: weeklyHours(
        data.maps
          .filter((map) => map.professionalId === professional.id && !selecionados.includes(map.id))
          .flatMap((map) => map.slots),
      ),
    }))
    .sort(
      (a, b) =>
        Number(b.sameSpecialty) - Number(a.sameSpecialty) ||
        b.fits - a.fits ||
        a.load - b.load ||
        a.professional.name.localeCompare(b.professional.name, "pt-BR"),
    );
}

/** O primeiro de `rankDestinations`. Assinatura e resultado inalterados. */
export function suggestDestination(
  selection: TransferMap[],
  data: TransfersData,
  allowCrossSpecialty: boolean,
): TransferSuggestion | undefined {
  return rankDestinations(selection, data, allowCrossSpecialty)[0];
}

/* ============================================================== as rodadas */

export interface TransferRound {
  destinationId: string;
  destinationName: string;
  /** Quantos mapas saíram da fila nesta rodada. */
  moved: number;
  /** Quantos continuaram nela. */
  left: number;
  scope: TransferScope;
  fromDate?: string;
  crossSpecialty: boolean;
  reason?: string;
}

export interface AppliedRound {
  maps: TransferMap[];
  movedIds: string[];
  round: TransferRound;
}

/** Aplicar move o que cabe? Nada a aplicar é impedimento, não falha silenciosa. */
export function canApply(evaluations: TransferEvaluation[]): Decision {
  const cabem = evaluations.filter((avaliacao) => avaliacao.fit === "ok").length;
  if (cabem > 0) return { allowed: true };
  return {
    allowed: false,
    reason: "Nenhum mapa desta seleção cabe no destino escolhido. Escolha outro profissional.",
  };
}

/**
 * Implementação de `a-transfer-is-partial-by-nature`.
 *
 * Move só o que cabe, e devolve junto o que a rodada deixou para trás — é esse
 * número que a tela usa para dizer que a fila continua aberta. O que já era do
 * destino (`same`) não é movimento e não entra na contagem: contá-lo faria a
 * barra de progresso avançar sem nada ter mudado de mãos.
 */
export function applyRound(
  data: TransfersData,
  evaluations: TransferEvaluation[],
  options: {
    destination: TransferProfessional;
    scope: TransferScope;
    fromDate?: string;
    crossSpecialty: boolean;
    reason?: string;
  },
): AppliedRound {
  const movedIds = evaluations
    .filter((avaliacao) => avaliacao.fit === "ok")
    .map((avaliacao) => avaliacao.map.id);

  const maps = data.maps.map((map) => {
    if (!movedIds.includes(map.id)) return map;
    const anterior = professionalOf(data, map.professionalId);
    return {
      ...map,
      professionalId: options.destination.id,
      /* Quem entregou o mapa continua registrado. Num mapa que já estava sem
         profissional, quem o deixou não muda: ele não passou por ninguém. */
      leftBy: anterior ? anterior.name : map.leftBy,
      reason: undefined,
      since: options.scope === "from" && options.fromDate ? options.fromDate : data.today,
    } satisfies TransferMap;
  });

  return {
    maps,
    movedIds,
    round: {
      destinationId: options.destination.id,
      destinationName: options.destination.name,
      moved: movedIds.length,
      left: evaluations.filter(
        (avaliacao) => avaliacao.fit !== "ok" && avaliacao.fit !== "same",
      ).length,
      scope: options.scope,
      fromDate: options.scope === "from" ? options.fromDate : data.today,
      crossSpecialty: options.crossSpecialty,
      reason: options.crossSpecialty ? options.reason : undefined,
    },
  };
}

/* ================================================================= as salas */

export interface RoomImpact {
  room: string;
  /** Positivo entra, negativo libera. */
  hours: number;
}

/**
 * Cálculo de referência do saldo de horas; retirado da interface na revisão 0020.
 *
 * Só o que cabe entra na conta: a simulação mostra o impacto do que vai ser
 * aplicado, e somar o que não se move faria a sala de destino parecer mais
 * cheia do que vai ficar. Mapa sem profissional não libera sala nenhuma — ele
 * já não tinha uma —, e é por isso que os dois lados nem sempre se anulam.
 */
export function roomImpact(
  data: TransfersData,
  evaluations: TransferEvaluation[],
  destination: TransferProfessional,
): RoomImpact[] {
  const saldo = new Map<string, number>();
  const somar = (room: string, hours: number) =>
    saldo.set(room, (saldo.get(room) ?? 0) + hours);

  for (const avaliacao of evaluations) {
    if (avaliacao.fit !== "ok") continue;
    const horas = weeklyHours(avaliacao.map.slots);
    const origem = professionalOf(data, avaliacao.map.professionalId);
    if (origem) somar(origem.room, -horas);
    somar(destination.room, horas);
  }

  return [...saldo.entries()]
    .filter(([, hours]) => hours !== 0)
    .map(([room, hours]) => ({ room, hours }))
    .sort((a, b) => b.hours - a.hours || a.room.localeCompare(b.room, "pt-BR"));
}

/* ============================================================== a vigência */

/** A frase que explica o que a vigência escolhida faz com o que já está agendado. */
export function scopeMessage(scope: TransferScope, fromDate: string): string {
  return `A partir de ${formatNumericDate(fromDate)}${scope === "whole" ? " (hoje)" : ""}, os horários passam para o novo profissional. Atendimentos anteriores ou já realizados permanecem com o responsável original.`;
}

/** A vigência parcial não retroage: a primeira data possível é hoje. */
export function canUseFromDate(fromDate: string, today: string): Decision {
  if (fromDate >= today) return { allowed: true };
  return {
    allowed: false,
    reason: `A vigência não retroage: escolha ${formatNumericDate(today)} ou uma data posterior.`,
  };
}

/* ================================================================= a lista */

export type TransferListFilter = {
  term?: string;
  professionalId?: string;
  specialty?: string;
  /** `all` é o padrão — ver `a-map-without-a-professional-is-listed-with-the-others`. */
  status?: "all" | "assigned" | "orphan";
};

/**
 * Implementação de `a-map-without-a-professional-is-listed-with-the-others`.
 *
 * A busca alcança o nome de quem **deixou** o mapa, e não só o de quem o detém.
 * É a consulta que a movimentação por inativação faz de verdade: quem abre a
 * área acabou de inativar alguém e procura pelo nome dessa pessoa — que, nos
 * mapas órfãos, já não está em `professionalId` nenhum.
 */
export function filterMaps(data: TransfersData, filter: TransferListFilter): TransferMap[] {
  const termo = (filter.term ?? "").trim().toLowerCase();
  const status = filter.status ?? "all";

  return data.maps.filter((map) => {
    if (status === "orphan" && map.professionalId) return false;
    if (status === "assigned" && !map.professionalId) return false;
    if (filter.specialty && map.specialty !== filter.specialty) return false;
    if (filter.professionalId && map.professionalId !== filter.professionalId) return false;
    if (!termo) return true;
    const responsavel = professionalOf(data, map.professionalId)?.name ?? map.leftBy ?? "";
    return (
      map.patient.toLowerCase().includes(termo) || responsavel.toLowerCase().includes(termo)
    );
  });
}

/** Quantos mapas da unidade estão sem profissional. Vai no cabeçalho da área. */
export function mapsWithoutProfessional(data: TransfersData): number {
  return data.maps.filter((map) => !map.professionalId).length;
}

/* ============================================== a semana, em blocos */

export interface AgendaBlock {
  kind: "map";
  key: string;
  map: TransferMap;
  slot: TransferSlot;
  /** Faixa e total de faixas simultâneas, para a largura da coluna. */
  lane: number;
  lanes: number;
}

export interface AgendaCluster {
  kind: "cluster";
  key: string;
  weekday: TransferWeekday;
  slot: TransferSlot;
  items: { map: TransferMap; slot: TransferSlot }[];
  /** Contagem por especialidade, da maior para a menor. */
  specialties: { specialty: string; count: number }[];
  orphans: number;
}

export type AgendaEntry = AgendaBlock | AgendaCluster;

/**
 * Acima de quantos mapas simultâneos o grupo vira um bloco-resumo.
 *
 * Três é o que cabe legível na largura de uma coluna de dia. É o limite do
 * desenho, e o volume da clínica o ultrapassa com folga — trinta e cinco
 * sessões às 08:00 de terça é dado real da unidade, não caso extremo.
 */
export const LANE_LIMIT = 3;

/**
 * Os blocos da semana, por dia.
 *
 * Grupos de horários que se sobrepõem viram um bloco só quando passam de
 * `LANE_LIMIT`: um bloco por mapa em trinta e cinco mapas produz trinta e cinco
 * fatias de dois pixels, que não são legíveis nem clicáveis. O bloco-resumo diz
 * quantas sessões são, quantas de cada especialidade e quantas estão sem
 * profissional — e abre a lista completa.
 */
export function agendaBlocks(maps: TransferMap[]): Record<TransferWeekday, AgendaEntry[]> {
  const porDia = {} as Record<TransferWeekday, AgendaEntry[]>;

  for (const weekday of WEEKDAYS) {
    const doDia = maps
      .flatMap((map) =>
        map.slots
          .filter((slot) => slot.weekday === weekday)
          .map((slot, index) => ({ key: `${map.id}-${index}`, map, slot })),
      )
      .sort(
        (a, b) =>
          toMinutes(a.slot.start) - toMinutes(b.slot.start) ||
          toMinutes(a.slot.end) - toMinutes(b.slot.end) ||
          a.map.patient.localeCompare(b.map.patient, "pt-BR"),
      );

    const saida: AgendaEntry[] = [];
    let grupo: typeof doDia = [];
    let fimDoGrupo = -1;

    const fechar = () => {
      if (grupo.length === 0) return;
      if (grupo.length <= LANE_LIMIT) {
        grupo.forEach((item, lane) =>
          saida.push({ kind: "map", ...item, lane, lanes: grupo.length }),
        );
      } else {
        const contagem = new Map<string, number>();
        for (const item of grupo) {
          contagem.set(item.map.specialty, (contagem.get(item.map.specialty) ?? 0) + 1);
        }
        saida.push({
          kind: "cluster",
          key: `cluster-${weekday}-${grupo[0]!.slot.start}`,
          weekday,
          slot: {
            weekday,
            start: minutesToTime(Math.min(...grupo.map((item) => toMinutes(item.slot.start)))),
            end: minutesToTime(Math.max(...grupo.map((item) => toMinutes(item.slot.end)))),
          },
          items: grupo.map((item) => ({ map: item.map, slot: item.slot })),
          specialties: [...contagem.entries()]
            .map(([specialty, count]) => ({ specialty, count }))
            .sort((a, b) => b.count - a.count || a.specialty.localeCompare(b.specialty, "pt-BR")),
          orphans: grupo.filter((item) => !item.map.professionalId).length,
        });
      }
      grupo = [];
      fimDoGrupo = -1;
    };

    for (const item of doDia) {
      if (grupo.length > 0 && toMinutes(item.slot.start) >= fimDoGrupo) fechar();
      grupo.push(item);
      fimDoGrupo = Math.max(fimDoGrupo, toMinutes(item.slot.end));
    }
    fechar();

    porDia[weekday] = saida;
  }

  return porDia;
}

export function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Quantas sessões cada dia da semana tem, para o cabeçalho da grade. */
export function sessionsByWeekday(maps: TransferMap[]): Record<TransferWeekday, number> {
  const contagem = {} as Record<TransferWeekday, number>;
  for (const weekday of WEEKDAYS) contagem[weekday] = 0;
  for (const map of maps) {
    for (const slot of map.slots) contagem[slot.weekday] += 1;
  }
  return contagem;
}
