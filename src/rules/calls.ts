import type { Rule } from "@brucesantos/design-space";
import type {
  CallAudience,
  CallAutomationRule,
  CallDevice,
  CallEvent,
  CallKind,
  CallStatus,
  CallTemplate,
  CallsData,
} from "../contracts/index.js";

/**
 * Regras da gestão de chamadas.
 *
 * A área é **proposta** — ver o comentário do domínio em `src/contracts`. Por
 * isso estas regras não traduzem policy nem changeset de lugar nenhum: elas
 * fixam decisões do desenho que, soltas, a engenharia reinterpretaria.
 *
 * Duas merecem ser lidas antes das outras, porque decidem o desenho e não só o
 * comportamento:
 *
 * - **A fila é ordenada por espera, não por chegada.** É o que torna a aba Ao
 *   vivo uma fila de trabalho em vez de um log.
 * - **Campo não preenchido barra o anúncio.** É o único bloqueio duro da tela, e
 *   existe porque o custo do erro é público: a caixa fala em voz alta.
 */

/** A escala de temperatura da espera, em minutos. */
export const WAITING_WARM = 5;
export const WAITING_HOT = 15;

/** Os campos que a agenda preenche, e como aparecem quando ainda faltam. */
export const CALL_FIELD_LABEL: Record<string, string> = {
  profissional: "[profissional]",
  paciente: "[criança]",
  responsavel: "[responsável]",
  sala: "[sala]",
  hora: "[horário]",
};

/**
 * As regras **declaradas** da área — quatro, e não oito.
 *
 * `tests/product.test.ts` exige que toda regra seja citada por pelo menos um
 * cenário: regra sem cenário não é verificável por jornada, e vira texto. Com a
 * área reduzida a dois cenários na revisão de 04/09/2026, quatro declarações
 * perderam quem as citasse e saíram — um dispositivo online basta, o público do
 * dispositivo decide onde toca, a chave-geral silencia todas, e quem chamar vem
 * da agenda.
 *
 * **O comportamento não saiu com elas.** As funções abaixo continuam inteiras,
 * continuam sendo o que a tela usa, e continuam com teste de unidade em
 * `tests/rules.test.ts` — `callOutcome`, `devicesForKind`, `canToggleRule` e
 * `resolveTarget`. O que se perdeu é a declaração: hoje esses quatro acertos são
 * lógica testada, e não regra especificada. Voltam a ser regra
 * quando voltar o cenário que os exercita. Ver decisão 0017.
 */
export const callRules: Rule[] = [
  {
    id: "an-unfilled-field-cannot-be-announced",
    statement:
      "Enquanto o texto ainda tiver um campo por preencher — `[profissional]`, `[criança]`, `[responsável]`, `[sala]` ou `[horário]` —, o botão Anunciar fica indisponível, com o motivo associado ao próprio controle.",
    rationale:
      "O erro aqui não é um formulário que salva torto: é a caixa da sala de espera dizendo “colchete responsável, responsável por Lucas, compareça à recepção” na frente das famílias. Um campo vazio silencioso seria pior ainda — a frase sairia mutilada e ninguém saberia quem foi chamado. Manter o campo visível entre colchetes e barrar o anúncio transforma um erro público num impedimento legível antes de falar.",
    source: "src/rules/calls.ts",
  },
  {
    id: "the-queue-is-ordered-by-waiting-not-arrival",
    statement:
      "A aba Ao vivo ordena por tempo de espera decrescente, e não pela hora do evento. Quem espera há mais tempo fica no topo, mesmo que tenha chegado depois de alguém já anunciado.",
    rationale:
      "Ordenada por chegada, a tela vira um extrato: a recepcionista lê de cima para baixo e trabalha na ordem errada, deixando por último exatamente quem já está há vinte minutos numa sala de espera com uma criança. A espera é o único dado da fila que piora sozinho com o tempo, e por isso é ela que ordena.",
    source: "src/rules/calls.ts",
  },
  {
    id: "an-event-leaves-the-queue-only-when-announced-or-dismissed",
    statement:
      "Um evento sai da fila por dois caminhos: a chamada foi anunciada, ou alguém a dispensou explicitamente. O tempo passar não tira nada da fila.",
    rationale:
      "É o que impede a fila de se limpar sozinha e mentir. Sem isso, o check-in de quem ninguém chamou desapareceria por decurso de prazo — e o sintoma no fim do dia seria uma fila vazia com duas famílias ainda sentadas. Dispensar é uma ação registrada porque é uma decisão: alguém foi buscar a pessoa a pé.",
    source: "src/rules/calls.ts",
  },
  {
    id: "waiting-temperature-is-said-in-words",
    statement:
      `A partir de ${WAITING_WARM} minutos a espera é “atenção” e a partir de ${WAITING_HOT} é “urgente”, e as duas faixas trazem a palavra junto do número. A cor do cartão acompanha, e nunca é o único sinal.`,
    rationale:
      "O cartão quente é o que reordena o trabalho da recepção, e um cartão que só muda de cor não chega a quem usa leitor de tela nem a quem não distingue o laranja do vermelho — que é dizer que a informação mais operacional da tela seria a menos acessível dela.",
    source: "src/rules/calls.ts",
  },
];

type Decision = { allowed: boolean; reason?: string };

/* ============================================================ o relógio */

/**
 * Minutos entre duas horas `HH:MM`.
 *
 * Sem `Date`: as duas pontas são horas da clínica no mesmo dia, e converter
 * para data traria fuso e horário de verão para uma subtração de minutos.
 * Negativo quando o evento é futuro — a fila trata como zero.
 */
export function minutesBetween(from: string, to: string): number {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  return (th ?? 0) * 60 + (tm ?? 0) - ((fh ?? 0) * 60 + (fm ?? 0));
}

/** A espera em palavra curta, como o cartão a escreve. */
export function humanWait(minutes: number): string {
  if (minutes <= 0) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/* ======================================================== temperatura */

export type WaitingTone = "calm" | "warm" | "hot";

/** Implementação de `waiting-temperature-is-said-in-words`. */
export function waitingTone(minutes: number): WaitingTone {
  if (minutes >= WAITING_HOT) return "hot";
  if (minutes >= WAITING_WARM) return "warm";
  return "calm";
}

/** A palavra que acompanha a cor. `calm` não tem: não há o que dizer. */
export function waitingToneLabel(tone: WaitingTone): string | undefined {
  if (tone === "hot") return "Urgente";
  if (tone === "warm") return "Atenção";
  return undefined;
}

/* ============================================================== o texto */

/**
 * Preenche o modelo com o que a agenda sabe.
 *
 * Com `keepFields`, o que ainda não foi escolhido fica visível como
 * `[profissional]` em vez de virar vazio. É o que permite mostrar a frase em
 * construção sem exibir uma frase mutilada — e é o que
 * `an-unfilled-field-cannot-be-announced` detecta depois.
 */
export function fillTemplate(
  text: string,
  ctx: {
    professional?: string;
    patient?: string;
    guardian?: string;
    room?: string;
    start?: string;
  },
  keepFields = false,
): string {
  const sub = (key: string, value?: string) =>
    value || (keepFields ? (CALL_FIELD_LABEL[key] ?? "") : "");
  return (text || "")
    .replace(/\{profissional\}/g, sub("profissional", ctx.professional))
    .replace(/\{paciente\}/g, sub("paciente", ctx.patient))
    .replace(/\{responsavel\}/g, sub("responsavel", ctx.guardian))
    .replace(/\{sala\}/g, sub("sala", ctx.room))
    .replace(/\{hora\}/g, sub("hora", ctx.start));
}

/** Implementação de `an-unfilled-field-cannot-be-announced`. */
export function hasUnfilledFields(text: string): boolean {
  return /\[(profissional|criança|responsável|sala|horário)\]/.test(text || "");
}

/* ========================================================= dispositivos */

const AUDIENCE_OF: Record<CallKind, CallAudience> = {
  professional: "prof",
  guardian: "family",
  general: "family",
};

/**
 * Implementação de `the-device-audience-decides-where-a-call-plays`.
 *
 * O aviso geral é o caso à parte, e a exceção está no desenho, não aqui:
 * `CALL_KIND.general` declara público `family`, e o painel de nova chamada
 * oferece **todos** os dispositivos da unidade. Reproduzo o painel, que é o que
 * decide o comportamento observável, e mantenho o público declarado para a
 * etiqueta. Quem for implementar precisa saber que são duas afirmações
 * diferentes sobre a mesma coisa — um aviso de estacionamento na copa da equipe
 * é inofensivo, e é isso que o painel assume.
 */
export function devicesForKind(kind: CallKind, data: CallsData): CallDevice[] {
  const doUnit = data.devices.filter((device) => device.unit === data.unit);
  if (kind === "general") return doUnit;
  return doUnit.filter((device) => device.audience === AUDIENCE_OF[kind]);
}

/** O público declarado do tipo de chamada — o que a etiqueta mostra. */
export function audienceOfKind(kind: CallKind): CallAudience {
  return AUDIENCE_OF[kind];
}

/**
 * Implementação de `one-device-online-is-enough-to-announce`.
 *
 * Nenhum dispositivo escolhido não é falha, é impedimento: quem chamou não
 * escolheu onde anunciar, e `canAnnounce` barra antes.
 */
export function callOutcome(
  devices: CallDevice[],
  chosenIds: string[],
): { status: CallStatus; error?: string } {
  const chosen = devices.filter((device) => chosenIds.includes(device.id));
  if (chosen.length === 0) return { status: "playing" };
  const todosOffline = chosen.every((device) => !device.online);
  return todosOffline
    ? { status: "failed", error: "Dispositivo offline" }
    : { status: "playing" };
}

/* ================================================================ a fila */

export interface PendingCall extends CallEvent {
  kind: CallKind;
  /** Minutos de espera, nunca negativo. */
  waiting: number;
  tone: WaitingTone;
  /** Quem a chamada procura, já resolvido. */
  target: string;
  /** O texto pronto, com o que a agenda preencheu. */
  text: string;
  /** A regra que responde por este evento, quando existe. */
  rule?: CallAutomationRule;
  /** Anúncios já feitos para este evento. */
  already: number;
  /** A regra dispararia sozinha — a chave-geral e o interruptor estão ligados. */
  auto: boolean;
}

const RULE_OF_EVENT: Record<CallEvent["type"], string> = {
  checkin: "on_checkin",
  session_end: "on_session_end",
};

const TEMPLATE_FALLBACK: Record<CallEvent["type"], string> = {
  checkin: "arrival",
  session_end: "session_end",
};

/**
 * Implementação de `the-queue-is-ordered-by-waiting-not-arrival` e de
 * `an-event-leaves-the-queue-only-when-announced-or-dismissed`.
 */
export function pendingCalls(
  data: CallsData,
  templates: CallTemplate[],
  dismissed: string[] = [],
): PendingCall[] {
  return data.events
    .filter((event) => !event.done && !dismissed.includes(event.id))
    .map((event) => {
      const rule = data.rules.find((r) => r.id === RULE_OF_EVENT[event.type]);
      const kind: CallKind = event.type === "checkin" ? "professional" : "guardian";
      /* O que a pessoa escolheu ganha do que a regra derivaria. Só o chamado
         criado à mão traz `templateId` e `text`; o da agenda não traz nenhum dos
         dois e continua saindo da regra do tipo, como sempre saiu. */
      const templateId = event.templateId ?? (rule ? rule.templateId : TEMPLATE_FALLBACK[event.type]);
      const template =
        templates.find((t) => t.id === templateId) ?? templates[0] ?? { text: "" };
      /* Três origens para a frase, nesta ordem: o que a pessoa escreveu ao criar
         o chamado, o que reescreveram na regra, o modelo. Cada uma é mais
         específica que a seguinte. */
      const molde = rule?.text ?? template.text;
      const waiting = Math.max(0, minutesBetween(event.at, data.now));
      return {
        ...event,
        kind,
        rule,
        waiting,
        tone: waitingTone(waiting),
        already: data.log.filter((entry) => entry.eventId === event.id).length,
        target: kind === "professional" ? event.professional : event.guardian,
        text: event.text ?? fillTemplate(molde, event),
        auto: Boolean(data.autoMode && rule && rule.on),
      };
    })
    .sort((a, b) => b.waiting - a.waiting);
}

/* =========================================================== automação */

/** Implementação de `the-master-switch-silences-every-rule`. */
export function ruleFires(rule: CallAutomationRule, autoMode: boolean): boolean {
  return autoMode && rule.on;
}

/**
 * O interruptor individual está alcançável?
 *
 * Devolve motivo em vez de esconder o controle: a chave-geral desligada é um
 * estado que a pessoa pode mudar, e o interruptor apagado sem explicação
 * parece defeito.
 */
export function canToggleRule(autoMode: boolean): Decision {
  return autoMode
    ? { allowed: true }
    : {
        allowed: false,
        reason: "A automação geral está desligada. Ligue-a para configurar as regras.",
      };
}

/* ============================================================== o alvo */

export interface ResolvedTarget {
  target: string;
  professional?: string;
  guardian?: string;
  room?: string;
  start?: string;
  /** Veio da agenda ou do cadastro, e não de digitação. */
  fromAgenda: boolean;
}

/**
 * Implementação de `who-to-call-comes-from-the-agenda-not-from-typing`.
 *
 * O próximo atendimento é o primeiro check-in em aberto da criança; sem nenhum
 * em aberto, o mais recente serve para nomear o profissional — é a diferença
 * entre "chegou agora" e "chame quem a atendeu".
 */
export function resolveTarget(
  kind: CallKind,
  patientName: string,
  data: CallsData,
): ResolvedTarget {
  if (kind === "general") return { target: "Sala de espera", fromAgenda: false };

  if (kind === "professional") {
    const checkins = data.events.filter(
      (event) => event.type === "checkin" && event.patient === patientName,
    );
    const next = checkins.find((event) => !event.done) ?? checkins[0];
    if (!next) return { target: "", fromAgenda: false };
    return {
      target: next.professional,
      professional: next.professional,
      room: next.room,
      start: next.start,
      fromAgenda: true,
    };
  }

  /* O responsável a chamar é **quem trouxe a criança**, e o check-in é quem
     sabe disso. O cadastro é o segundo lugar a olhar, não o primeiro: numa
     família em que a avó traz na terça e a mãe na quinta, chamar o cadastro faz
     a recepção anunciar em voz alta o nome de quem não está na sala. */
  const checkin = [...data.events]
    .filter((event) => event.type === "checkin" && event.patient === patientName)
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  if (checkin?.guardian) {
    return { target: checkin.guardian, guardian: checkin.guardian, fromAgenda: true };
  }

  const cadastro = data.patients.find((patient) => patient.name === patientName);
  if (!cadastro?.guardian) return { target: "", fromAgenda: false };
  return { target: cadastro.guardian, guardian: cadastro.guardian, fromAgenda: true };
}

/* ========================================================== o bloqueio */

/**
 * Pode anunciar?
 *
 * A ordem das verificações é parte da regra. O texto vem primeiro porque é o
 * que a caixa vai falar: sem criança escolhida a frase está incompleta **e**
 * sem destinatário, e mandar escolher o dispositivo antes faria a pessoa
 * configurar onde anunciar uma frase que não existe.
 */
export function canAnnounce(input: {
  kind: CallKind;
  patient: string;
  target: string;
  text: string;
  deviceIds: string[];
}): Decision {
  const pronta = messageIsReady(input);
  if (!pronta.allowed) return pronta;
  if (input.deviceIds.length === 0) {
    return { allowed: false, reason: "Escolha pelo menos um dispositivo online." };
  }
  return { allowed: true };
}

/**
 * A frase está pronta para ser dita — por quem quer que a diga, e quando.
 *
 * Sai de dentro de `canAnnounce` porque passou a ter dois chamadores. A ordem
 * das verificações é parte dela: criança, depois quem será chamado, depois
 * texto vazio, e só então campo por preencher. Invertida, a tela pede para
 * completar uma frase de que ainda não se sabe o destinatário.
 */
function messageIsReady(input: {
  kind: CallKind;
  patient: string;
  target: string;
  text: string;
}): Decision {
  const precisaDeCrianca = input.kind !== "general";

  if (precisaDeCrianca && !input.patient) {
    return { allowed: false, reason: "Escolha a criança da chamada." };
  }
  if (precisaDeCrianca && !input.target) {
    return {
      allowed: false,
      reason:
        input.kind === "professional"
          ? "Escolha o profissional que será chamado."
          : "Informe o responsável que será chamado.",
    };
  }
  if (!input.text.trim()) {
    return { allowed: false, reason: "Escreva o texto do anúncio." };
  }
  if (hasUnfilledFields(input.text)) {
    return {
      allowed: false,
      reason: "Complete os dados acima para a mensagem ficar pronta.",
    };
  }
  return { allowed: true };
}

/**
 * O chamado pode entrar na fila sem ser anunciado agora?
 *
 * É o "Criar chamado" do painel: a recepção monta a chamada com a criança em
 * pé na frente dela e deixa na fila para chamar quando a sala estiver livre.
 * Sem isto, o painel só sabia falar imediatamente, e quem quisesse preparar
 * uma chamada tinha de guardar a informação na cabeça até a hora.
 *
 * **Duas diferenças de `canAnnounce`, e as duas têm razão.**
 *
 * Não pede dispositivo: nada vai tocar agora, e o alcance é decidido no
 * momento de chamar — a caixa que está offline às 10:40 pode estar de volta às
 * 11:00. Exigir aqui bloquearia o preparo por um problema do futuro.
 *
 * E recusa o aviso geral, que é o único tipo sem ninguém esperando. Um aviso à
 * unidade — "o estacionamento está em manutenção" — não é uma pendência que
 * alguém atende: é dito na hora ou não é dito. Enfileirá-lo criaria um cartão
 * que ninguém sabe quando dispensar.
 *
 * O resto é idêntico, e de propósito: um chamado enfileirado com `[criança]` no
 * texto é o mesmo erro público de `an-unfilled-field-cannot-be-announced`,
 * apenas adiado para quem clicar em "Chamar" mais tarde e confiar que a frase
 * estava pronta.
 */
export function canQueue(input: {
  kind: CallKind;
  patient: string;
  target: string;
  text: string;
}): Decision {
  if (input.kind === "general") {
    return {
      allowed: false,
      reason: "Um aviso geral não tem quem espere na fila: é anunciado na hora ou não é.",
    };
  }
  return messageIsReady(input);
}
