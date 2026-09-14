import type { Rule } from "@brucesantos/design-space";
import type {
  SurveyBand,
  SurveyResponse,
  NpsSurvey,
  PushAudience,
  PushData,
  PushGuardian,
  PushMessage,
  PushSegment,
  PushValues,
  PushVariable,
} from "../contracts/index.js";

/**
 * Regras da Central de PUSH.
 *
 * A área é **proposta** — ver o comentário do domínio em `src/contracts`. Estas
 * regras não traduzem policy nem changeset de lugar nenhum: elas fixam decisões
 * do desenho que, soltas, a engenharia reinterpretaria de um jeito que parece
 * inofensivo e não é.
 *
 * Duas merecem ser lidas antes das outras:
 *
 * - **Variável sem valor barra o envio.** É o único bloqueio duro da área, e
 *   existe porque o custo do erro é público: sai no telefone de quarenta
 *   famílias, com o nome da criança do lado.
 * - **O público do agendado é recalculado no disparo.** É o que separa um
 *   comunicado de um e-mail com lista de destinatários colada.
 */

/* ============================================================== variáveis */

/**
 * As variáveis do texto, e de onde sai cada uma.
 *
 * A divisão em duas fontes é o que sustenta o bloqueio: `roster` o cadastro
 * responde sozinho, para cada destinatário, e por isso nunca falta; `typed`
 * alguém precisa digitar, e é aí que a frase sai pela metade.
 */
export const PUSH_VARIABLES: {
  key: PushVariable;
  token: string;
  description: string;
  source: "roster" | "typed";
}[] = [
  { key: "responsavel", token: "{responsavel}", description: "Nome do responsável", source: "roster" },
  { key: "paciente", token: "{paciente}", description: "Nome da criança", source: "roster" },
  { key: "unidade", token: "{unidade}", description: "Unidade do paciente", source: "roster" },
  { key: "profissional", token: "{profissional}", description: "Terapeuta de referência", source: "roster" },
  { key: "data", token: "{data}", description: "Data do evento — você digita", source: "typed" },
  { key: "hora", token: "{hora}", description: "Hora do evento — você digita", source: "typed" },
  { key: "documento", token: "{documento}", description: "Documento pendente — você escolhe", source: "typed" },
];

const POR_CHAVE = new Map(PUSH_VARIABLES.map((variavel) => [variavel.key, variavel]));

/** As variáveis que aparecem no texto, na ordem de `PUSH_VARIABLES`. */
export function usedVariables(...texts: string[]): PushVariable[] {
  const juntos = texts.join(" ");
  return PUSH_VARIABLES.filter((variavel) => juntos.includes(variavel.token)).map(
    (variavel) => variavel.key,
  );
}

/**
 * As variáveis digitáveis que o texto usa e ninguém preencheu.
 *
 * Implementação de `a-variable-left-unfilled-cannot-be-sent`.
 */
export function missingValues(title: string, body: string, values: PushValues): PushVariable[] {
  return usedVariables(title, body)
    .filter((chave) => POR_CHAVE.get(chave)?.source === "typed")
    .filter((chave) => !(values[chave] ?? "").trim());
}

/**
 * Aplica o texto a um destinatário.
 *
 * O que o cadastro sabe é resolvido por pessoa — é isso que faz cada família
 * ler o próprio nome. O que ficou por digitar **continua visível como
 * `{data}`**, com as chaves, em vez de virar vazio: uma frase mutilada em
 * silêncio é pior do que uma frase com um buraco nomeado, porque ninguém
 * consegue apontar o que faltou. É o mesmo princípio do `[profissional]` da
 * gestão de chamadas, com a marca do desenho daqui.
 */
export function renderMessage(
  text: string,
  guardian: PushGuardian | undefined,
  values: PushValues = {},
): string {
  if (!text) return "";
  const primeiroNome = (nome: string) => nome.split(" ")[0] ?? nome;

  return text
    .replaceAll("{responsavel}", guardian ? primeiroNome(guardian.name) : "{responsavel}")
    .replaceAll("{paciente}", guardian ? primeiroNome(guardian.patient) : "{paciente}")
    .replaceAll("{unidade}", guardian ? guardian.unit : "{unidade}")
    .replaceAll("{profissional}", guardian ? guardian.professional : "{profissional}")
    .replaceAll("{data}", values.data?.trim() || "{data}")
    .replaceAll("{hora}", values.hora?.trim() || "{hora}")
    .replaceAll("{documento}", values.documento?.trim() || "{documento}");
}

/* ================================================================ público */

/** Resolve um público em pessoas. `manual` é lista; o resto é filtro. */
export function resolveAudience(
  guardians: PushGuardian[],
  audience: PushAudience,
  segments: PushSegment[] = [],
): PushGuardian[] {
  if (audience.mode === "manual") {
    const escolhidos = new Set(audience.ids ?? []);
    return guardians.filter((pessoa) => escolhidos.has(pessoa.id));
  }

  const filtro =
    audience.mode === "segment"
      ? segments.find((segmento) => segmento.id === audience.segmentId)?.filter ?? audience.filter
      : audience.filter;

  return guardians.filter((pessoa) => {
    if (filtro.units.length > 0 && !filtro.units.includes(pessoa.unit)) return false;
    if (filtro.shifts.length > 0 && !filtro.shifts.includes(pessoa.shift)) return false;
    if (filtro.insurers.length > 0 && !filtro.insurers.includes(pessoa.insurer)) return false;
    if (filtro.professionals.length > 0 && !filtro.professionals.includes(pessoa.professional))
      return false;
    return true;
  });
}

/** O público em uma linha, como o cartão e o detalhe o escrevem. */
export function audienceLabel(audience: PushAudience, segments: PushSegment[] = []): string {
  // A seleção manual não descreve um recorte: descreve o fato de não haver
  // recorte nenhum. Repetir a contagem aqui duplicaria o número que o cartão já
  // mostra do lado, e o que muda de verdade é a natureza do público — esta é a
  // única forma que **não** será recalculada no disparo.
  if (audience.mode === "manual") return "seleção manual, nome a nome";

  if (audience.mode === "segment") {
    const segmento = segments.find((item) => item.id === audience.segmentId);
    return segmento ? `Segmento: ${segmento.name}` : "Segmento";
  }

  const filtro = audience.filter;
  const partes: string[] = [];
  partes.push(filtro.units.length > 0 ? filtro.units.join(", ") : "todas as unidades");
  if (filtro.shifts.length > 0) partes.push(`turno ${filtro.shifts.join(" e ").toLowerCase()}`);
  if (filtro.insurers.length > 0) partes.push(filtro.insurers.join(", "));
  if (filtro.professionals.length > 0) partes.push(filtro.professionals.join(", "));
  return partes.join(" · ");
}

/**
 * Quem, dentro do público, não vai ser alcançado do jeito que a equipe supõe.
 *
 * Implementação de `who-cannot-receive-is-named-before-and-after-sending`. São
 * dois grupos e não um só porque a saída é diferente: sem aplicativo é ligação
 * da recepção, push desligado é esperar a família abrir o app.
 */
export function unreachable(people: PushGuardian[]): {
  noApp: PushGuardian[];
  pushOff: PushGuardian[];
} {
  return {
    noApp: people.filter((pessoa) => !pessoa.appInstalled),
    pushOff: people.filter((pessoa) => pessoa.appInstalled && !pessoa.pushEnabled),
  };
}

/* ================================================================= envio */

export type Decision = { allowed: boolean; reason?: string };

const LISTA = (itens: string[]) =>
  itens.length <= 1 ? itens.join("") : `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`;

/**
 * O envio pode sair?
 *
 * **A ordem das verificações é parte da regra.** Texto, público, variável:
 * escrever vem antes de escolher para quem, e conferir a variável só faz
 * sentido quando já existe frase para conferir. Invertida, a tela manda a
 * pessoa escolher o público de um comunicado que ela ainda não escreveu — e
 * depois reclama do texto que ela acabou de terminar.
 */
export function canSend(rascunho: {
  title: string;
  body: string;
  values: PushValues;
  audienceSize: number;
}): Decision {
  if (!rascunho.title.trim() || !rascunho.body.trim()) {
    return { allowed: false, reason: "O comunicado precisa de título e texto." };
  }

  if (rascunho.audienceSize === 0) {
    return {
      allowed: false,
      reason: "Nenhum responsável no público selecionado. Ajuste o filtro na aba Público.",
    };
  }

  const faltando = missingValues(rascunho.title, rascunho.body, rascunho.values);
  if (faltando.length > 0) {
    const tokens = faltando.map((chave) => POR_CHAVE.get(chave)?.token ?? `{${chave}}`);
    return {
      allowed: false,
      reason: `${LISTA(tokens)} ${faltando.length === 1 ? "ainda não tem valor" : "ainda não têm valor"} e ${faltando.length === 1 ? "sairia" : "sairiam"} assim mesmo no aplicativo da família.`,
    };
  }

  return { allowed: true };
}

/* ============================================================== entregas */

export type DeliveryStats = {
  total: number;
  delivered: number;
  failed: number;
  viewed: number;
  acked: number;
  /** Percentual sobre o total enviado, arredondado. */
  percent: (parte: number) => number;
};

export function deliveryStats(message: PushMessage): DeliveryStats {
  const total = message.deliveries.length;
  const entregues = message.deliveries.filter((item) => item.status === "delivered");
  return {
    total,
    delivered: entregues.length,
    failed: message.deliveries.filter((item) => item.status === "failed").length,
    viewed: message.deliveries.filter((item) => Boolean(item.viewedAt)).length,
    acked: message.deliveries.filter((item) => Boolean(item.ackAt)).length,
    percent: (parte) => (total === 0 ? 0 : Math.round((parte / total) * 100)),
  };
}

/**
 * Quem um reenvio alcança.
 *
 * Implementação de `a-resend-reaches-only-who-has-not-seen-it`. Duas exclusões,
 * e as duas custam caro se caírem: quem já viu não é incomodado de novo, e quem
 * falhou **não** entra — o reenvio para um aparelho sem app falha igual, e
 * contaria como tentativa feita para uma família que continua sem saber de nada.
 */
export function resendTargets(message: PushMessage, only: "unviewed" | "unacked"): string[] {
  return message.deliveries
    .filter((entrega) => entrega.status === "delivered")
    .filter((entrega) => (only === "unviewed" ? !entrega.viewedAt : !entrega.ackAt))
    .map((entrega) => entrega.guardianId);
}

export function canResend(message: PushMessage, only: "unviewed" | "unacked"): Decision {
  if (message.status !== "sent") {
    return { allowed: false, reason: "O comunicado ainda não foi disparado." };
  }
  if (only === "unacked" && !message.ack) {
    return { allowed: false, reason: "Este comunicado não pediu ciência." };
  }
  if (resendTargets(message, only).length === 0) {
    return {
      allowed: false,
      reason:
        only === "unviewed"
          ? "Todo mundo que recebeu já visualizou."
          : "Todo mundo que recebeu já deu ciência.",
    };
  }
  return { allowed: true };
}

/**
 * A ordem da lista: a fila antes do histórico.
 *
 * O agendado está no futuro e ainda pode ser cancelado — é a única linha da
 * tela em que ainda cabe uma decisão. Misturado por data com o que já saiu, ele
 * cairia no topo hoje e no meio amanhã, e a pessoa passaria a procurar o que
 * pode mudar em vez de encontrar.
 */
export function messageOrder(messages: PushMessage[]): PushMessage[] {
  const peso = (message: PushMessage) => (message.status === "scheduled" ? 0 : 1);
  return [...messages].sort((a, b) => {
    if (peso(a) !== peso(b)) return peso(a) - peso(b);
    // Dentro do grupo, o carimbo `DD/MM/AAAA HH:MM` vira comparável sem `Date`.
    const chave = (item: PushMessage) => {
      const [dia, hora = ""] = item.at.split(" ");
      const [d = "", m = "", a = ""] = (dia ?? "").split("/");
      return `${a}${m}${d}${hora}`;
    };
    // Agendado sobe pelo que dispara primeiro; enviado sobe pelo mais recente.
    return a.status === "scheduled" ? chave(a).localeCompare(chave(b)) : chave(b).localeCompare(chave(a));
  });
}

/** O carimbo de um envio feito aqui, a partir do relógio declarado da fixture. */
export function stampNow(data: Pick<PushData, "today" | "now">): string {
  return `${data.today} ${data.now}`;
}

/**
 * A pesquisa pode sair?
 *
 * Mesma ordem do comunicado, e pela mesma razão: o que se escreve vem antes de
 * para quem se manda. A pergunta extra sem enunciado entra aqui porque ela sai
 * no aplicativo do mesmo jeito que a variável vazia sairia — um campo de
 * resposta sem pergunta, que a família não sabe o que fazer com.
 */
export function canSendSurvey(rascunho: {
  name: string;
  question: string;
  extras: { text: string }[];
  audienceSize: number;
}): Decision {
  if (!rascunho.name.trim()) {
    return { allowed: false, reason: "Dê um nome à pesquisa — é por ele que a evolução é lida." };
  }
  if (!rascunho.question.trim()) {
    return { allowed: false, reason: "Escreva a pergunta principal, a de 0 a 10." };
  }
  if (rascunho.extras.some((pergunta) => !pergunta.text.trim())) {
    return { allowed: false, reason: "Toda pergunta extra precisa de enunciado." };
  }
  if (rascunho.audienceSize === 0) {
    return { allowed: false, reason: "Nenhum responsável no público selecionado." };
  }
  return { allowed: true };
}

/* ================================================================== NPS */

export const NPS_BANDS: Record<SurveyBand, { label: string; one: string; range: string }> = {
  promoter: { label: "Promotores", one: "Promotor", range: "9 a 10" },
  passive: { label: "Neutros", one: "Neutro", range: "7 a 8" },
  detractor: { label: "Detratores", one: "Detrator", range: "0 a 6" },
};

/** Implementação de `the-nps-band-is-said-in-words`: a faixa sai da nota. */
export function npsBand(score: number): SurveyBand {
  if (score >= 9) return "promoter";
  if (score >= 7) return "passive";
  return "detractor";
}

export type NpsScore = {
  n: number;
  promoters: number;
  passives: number;
  detractors: number;
  promoterPct: number;
  passivePct: number;
  detractorPct: number;
  nps: number;
};

/**
 * O NPS de um conjunto de respostas.
 *
 * A conta é a padrão — promotores menos detratores, em pontos percentuais —, e
 * é arredondada **nos dois percentuais antes da subtração**, que é como a
 * metodologia manda e como qualquer planilha da coordenação vai refazer.
 * Subtrair primeiro e arredondar depois daria um número diferente do que a
 * clínica calcula, e uma divergência de um ponto num indicador de diretoria
 * custa mais explicação do que vale.
 */
export function npsScore(responses: SurveyResponse[]): NpsScore {
  const n = responses.length;
  if (n === 0) {
    return {
      n: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      promoterPct: 0,
      passivePct: 0,
      detractorPct: 0,
      nps: 0,
    };
  }

  const promoters = responses.filter((resposta) => npsBand(resposta.score) === "promoter").length;
  const detractors = responses.filter((resposta) => npsBand(resposta.score) === "detractor").length;
  const passives = n - promoters - detractors;
  const pct = (parte: number) => Math.round((parte / n) * 100);

  return {
    n,
    promoters,
    passives,
    detractors,
    promoterPct: pct(promoters),
    passivePct: pct(passives),
    detractorPct: pct(detractors),
    nps: pct(promoters) - pct(detractors),
  };
}

/** A zona do indicador, em palavras. Parte de `the-nps-band-is-said-in-words`. */
export function npsZone(nps: number): string {
  if (nps >= 75) return "Zona de excelência";
  if (nps >= 50) return "Zona de qualidade";
  if (nps >= 0) return "Zona de aperfeiçoamento";
  return "Zona crítica";
}

/** Quantos responderam, sobre quantos receberam. */
export function responseRate(survey: NpsSurvey): number {
  if (survey.recipients.length === 0) return 0;
  return Math.round((survey.responses.length / survey.recipients.length) * 100);
}

/**
 * Os detratores que continuam na fila.
 *
 * Implementação de `a-detractor-leaves-the-queue-only-by-a-recorded-treatment`.
 * Só `resolved` sai. `contact` continua contando: alguém assumiu e ainda não
 * terminou, e uma fila que zera no "assumi" mede boa vontade, não tratativa.
 */
export function openDetractors(responses: SurveyResponse[]): SurveyResponse[] {
  return responses.filter(
    (resposta) => npsBand(resposta.score) === "detractor" && resposta.treatment !== "resolved",
  );
}

/**
 * A ordem do feed: detrator pendente primeiro, depois pela nota.
 *
 * Ordenado por data, o feed é um extrato e a nota 4 de terça fica embaixo de
 * três elogios de quinta. Quem abre esta aba abre para trabalhar a fila.
 */
export function feedOrder(responses: SurveyResponse[]): SurveyResponse[] {
  const naFila = (resposta: SurveyResponse) =>
    npsBand(resposta.score) === "detractor" && resposta.treatment !== "resolved" ? 0 : 1;

  return [...responses].sort((a, b) => {
    if (naFila(a) !== naFila(b)) return naFila(a) - naFila(b);
    return a.score - b.score;
  });
}

/** O recorte por unidade, para achar de onde vem a queda. */
export function npsByUnit(
  responses: SurveyResponse[],
  guardians: PushGuardian[],
): { unit: string; score: NpsScore }[] {
  const porId = new Map(guardians.map((pessoa) => [pessoa.id, pessoa]));
  const unidades: string[] = [];
  for (const pessoa of guardians) if (!unidades.includes(pessoa.unit)) unidades.push(pessoa.unit);

  return unidades
    .map((unit) => ({
      unit,
      score: npsScore(responses.filter((resposta) => porId.get(resposta.guardianId)?.unit === unit)),
    }))
    .filter((linha) => linha.score.n > 0);
}

/* ============================================================== as regras */

/**
 * As regras **declaradas** da área — seis, e todas citadas por um dos dois
 * cenários. `tests/product.test.ts` exige isso: regra que nenhum cenário cita
 * não é verificável por jornada e vira texto.
 *
 * O comportamento que não virou regra continua sendo função testada aqui —
 * `messageOrder`, `audienceLabel`, `npsByUnit`, `canResend` —, com teste de
 * unidade em `tests/rules.test.ts`.
 */
export const pushRules: Rule[] = [
  {
    id: "a-variable-left-unfilled-cannot-be-sent",
    statement:
      "Enquanto o texto tiver uma variável digitável sem valor — `{data}`, `{hora}` ou `{documento}` —, o envio fica indisponível, com o motivo associado ao próprio botão. A variável continua visível entre chaves na prévia, e não vira espaço em branco.",
    rationale:
      "O erro aqui não é um formulário salvo torto: é a notificação chegando em quarenta telefones dizendo “a autorização de Beatriz vence em chave-data”, com o nome da criança do lado. Um campo silenciosamente vazio seria pior — a frase sairia mutilada e ninguém saberia o que faltou. Manter a variável entre chaves e barrar o envio transforma um erro público num impedimento legível antes de disparar. Diferente de tudo o mais na área, isto não tem desfazer: a notificação já está no aparelho.",
    source: "src/rules/push.ts",
  },
  {
    id: "the-audience-is-recalculated-at-send-time",
    statement:
      "O comunicado agendado guarda a definição do público — o filtro ou o segmento —, e não a lista de quem estava dentro dela quando foi criado. Quem entrar no recorte até o disparo recebe; quem sair, não. A seleção manual é a exceção: ali a lista é a definição.",
    rationale:
      "O aviso de que a unidade não abre amanhã é exatamente o que a família que fez a matrícula hoje à tarde precisa receber. Uma lista congelada na criação deixa essa família de fora sem que ninguém perceba — e o sintoma aparece no dia seguinte, na porta fechada. O inverso também: quem foi inativado não deve receber cobrança de documento de um tratamento que acabou.",
    source: "src/rules/push.ts",
  },
  {
    id: "who-cannot-receive-is-named-before-and-after-sending",
    statement:
      "Antes do envio, o público mostra quantos estão sem aplicativo e quantos estão com o push desligado. Depois, a lista de entrega nomeia quem falhou e por quê. Os dois grupos são contados separados, porque a saída de cada um é diferente.",
    rationale:
      "Sem isso a Central vira uma máquina de tranquilizar: “enviado para 40” com 6 telefones que nunca vão tocar. Sem aplicativo é ligação da recepção, e é trabalho que alguém precisa fazer hoje; push desligado é entrega que só será lida quando a família abrir o app, e é motivo para não esperar confirmação no mesmo dia. Somados num número só, os dois viram “deu erro” e ninguém liga para ninguém.",
    source: "src/rules/push.ts",
  },
  {
    id: "a-resend-reaches-only-who-has-not-seen-it",
    statement:
      "Reenviar alcança só quem recebeu e não visualizou — ou, na cobrança de ciência, quem visualizou e não confirmou. Quem já viu não é notificado de novo, e a entrega que falhou não é reenviada pelo mesmo caminho que já falhou.",
    rationale:
      "Reenvio para todos é o que ensina a família a ignorar a notificação da clínica: chega duas vezes a mesma coisa, e na terceira ninguém abre — inclusive o aviso que importava. E reenviar para quem está sem aplicativo é tentativa que falha igual, com o efeito colateral de marcar como “já cobramos” uma família que continua sem saber de nada. Ela precisa de telefone, não de outro push.",
    source: "src/rules/push.ts",
  },
  {
    id: "a-detractor-leaves-the-queue-only-by-a-recorded-treatment",
    statement:
      "Uma resposta de 0 a 6 entra na fila de tratativa e só sai quando alguém a marca como resolvida. Assumir o contato move o estado e mantém a resposta na fila. O tempo não tira nada da fila.",
    rationale:
      "A pesquisa que ninguém trabalha é um slide: mede a insatisfação com precisão e não muda nada. A fila é o que transforma nota em tarefa com dono. Sair no “assumi” mediria boa vontade — e o caso mais comum de perda de paciente é justamente aquele em que alguém ligou uma vez, não conseguiu falar, e o assunto morreu ali.",
    source: "src/rules/push.ts",
  },
  {
    id: "the-nps-band-is-said-in-words",
    statement:
      "Promotor, neutro e detrator aparecem com a palavra e com a faixa de nota — “Detrator · 0 a 6” — junto da cor, na barra de composição, na legenda e em cada resposta. A zona do indicador também tem nome: excelência, qualidade, aperfeiçoamento, crítica.",
    rationale:
      "A composição do NPS é uma barra verde-cinza-vermelha, e é a informação mais citada da tela — vai para reunião, para diretoria, para o grupo da equipe. Só na cor, ela não chega a quem usa leitor de tela nem a quem não distingue o verde do vermelho. E “+11” sozinho não diz nada para quem não conhece a escala: a palavra é o que torna o número uma leitura, e não um placar.",
    source: "src/rules/push.ts",
  },
];
