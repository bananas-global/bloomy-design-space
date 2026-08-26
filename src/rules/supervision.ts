import type { Rule } from "@brucesantos/design-space";
import type {
  ProgramTrend,
  SupervisedSchedule,
  SupervisionApplicator,
  SupervisionData,
  SupervisionSession,
  SupervisionTeamData,
  SupervisorRow,
} from "../contracts/index.js";
import { TODAY } from "../contracts/index.js";

/**
 * Regras da supervisão.
 *
 * A tela se chama "Supervisão" e a leitura óbvia é que ela serve ao supervisor.
 * Não serve: `ProfessionalPolicy.can?(role, :list_supervisor)` lista
 * `admin`, `clinic_admin` e `coordinator` — e o papel `supervisor` não está
 * lá. Quem supervisiona nunca abre esta tela.
 *
 * Uma vez visto isso, o resto do desenho fica coerente: é uma tela **sobre**
 * supervisores, para quem coordena. O período padrão olha 30 dias para trás,
 * porque auditoria olha para trás. E a tabela lista agendamento, não estado de
 * supervisão.
 *
 * Traduzido de `BloomyWeb.Backoffice.Supervisor.Index` e
 * `Bloomy.Professionals.ProfessionalPolicy`.
 */
export const supervisionRules: Rule[] = [
  {
    id: "supervision-screen-is-not-for-the-supervisor",
    statement:
      "`list_supervisor` é de admin, admin de clínica e coordenação. O papel `supervisor` não alcança a tela de Supervisão.",
    rationale:
      "Não é necessariamente errado — é uma visão de coordenação, e o supervisor acompanha os casos dele por outro caminho. Mas o nome promete o contrário, e quem lê a lista de papéis assume que supervisor supervisiona por ali. A tela precisa dizer para quem ela é, e para onde vai quem ela não atende.",
    source: "src/rules/supervision.ts",
  },
  {
    id: "supervision-defaults-to-the-past",
    statement:
      "O período abre em [hoje − 30 dias, hoje]. A tela nasce mostrando o que já aconteceu, e nada do que vem.",
    rationale:
      "Auditoria e acompanhamento pedem janelas opostas. Conferir o que passou é legítimo; ser o único padrão significa que ninguém abre a tela para decidir onde estar amanhã — e é justamente aí que a supervisão muda o resultado.",
    source: "src/rules/supervision.ts",
  },
  {
    id: "supervision-table-omits-supervision",
    statement:
      "A tabela mostra serviço, profissional, paciente, sala, horário e situação do agendamento. Não mostra se a assinatura do supervisor está pendente — que é a razão de o vínculo existir.",
    rationale:
      "A segunda assinatura é o único efeito mecânico do vínculo de supervisão em todo o sistema. Deixá-la de fora da tela de supervisão significa que a pendência só aparece atendimento a atendimento, e quem coordena descobre pelo atraso.",
    source: "src/rules/supervision.ts",
  },
  {
    id: "supervisor-is-derived-from-links",
    statement:
      "A lista filtra por `has_supervisor_internships`. Quem tem o papel de supervisor e nenhum vínculo não aparece — e quem tem vínculo aparece, tendo o papel ou não.",
    rationale:
      "Derivar do vínculo é mais honesto que derivar do papel: supervisão é uma relação, não um cargo. O efeito colateral é que um supervisor recém-designado fica invisível exatamente no momento em que alguém precisaria lhe atribuir alguém.",
    source: "src/rules/supervision.ts",
  },
  {
    id: "today-is-measured-in-utc",
    statement:
      "O período padrão é calculado com `Date.utc_today()`. Entre 21h e a meia-noite em Brasília, “hoje” já é o dia seguinte em UTC, e a janela inteira anda um dia.",
    rationale:
      "Ninguém percebe, porque o intervalo tem 30 dias e um dia a mais no fim não chama atenção. Percebe-se no dia em que alguém confere um número da tela contra um relatório e eles não batem.",
    source: "src/rules/supervision.ts",
  },
];

type Decision = { allowed: boolean; reason?: string };

/* ============================================================== acesso */

/** Implementação de `supervision-screen-is-not-for-the-supervisor`. */
export function canOpenSupervision(permissions: string[], role: string): Decision {
  if (permissions.includes("professionals.list_supervisor")) return { allowed: true };

  if (role === "supervisor") {
    return {
      allowed: false,
      reason:
        "A tela de Supervisão é da coordenação: ela lista supervisores e o que os supervisionados atenderam. Os seus casos você acompanha pelo atendimento, onde a sua assinatura é pedida.",
    };
  }

  return {
    allowed: false,
    reason: "Só admin, admin de clínica e coordenação abrem a tela de Supervisão.",
  };
}

/* ============================================================== período */

/**
 * Implementação de `supervision-defaults-to-the-past`.
 *
 * Reproduz `Date.shift(today, day: -30)`. A referência é {@link TODAY} e não o
 * relógio — o cenário do período padrão precisa dar o mesmo intervalo em
 * qualquer dia em que alguém o abrir.
 */
export function defaultPeriod(today = TODAY): { start: string; end: string } {
  const end = new Date(`${today}T12:00:00.000Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);
  return { start: start.toISOString().slice(0, 10), end: today };
}

/** O período padrão não alcança nada do que vem — é a constatação, medida. */
export function looksForward(period: { start: string; end: string }, today = TODAY): boolean {
  return period.end > today;
}

/* ========================================================= supervisores */

/** Implementação de `supervisor-is-derived-from-links`. */
export function listedSupervisors(all: SupervisorRow[]): SupervisorRow[] {
  return all.filter((supervisor) => supervisor.internCount > 0);
}

/**
 * Quem some da tela por não ter vínculo nenhum.
 *
 * Existe para ser dito, e não para ser corrigido em silêncio: é exatamente
 * quem alguém precisaria encontrar para lhe atribuir o primeiro supervisionado.
 */
export function hiddenForHavingNoLinks(all: SupervisorRow[]): SupervisorRow[] {
  return all.filter((supervisor) => supervisor.internCount === 0);
}

/* ====================================================== estado do caso */

export type SupervisionState =
  | "awaiting-supervisor"
  | "awaiting-professional"
  | "signed"
  | "not-supervised"
  | "not-yet"
  | "will-not-happen";

/**
 * Implementação de `supervision-table-omits-supervision`.
 *
 * É a coluna que falta na tela real, e ela é derivada da situação do
 * agendamento — que já distingue `pending_signature` de
 * `pending_supervisor_signature`. Deduzir só das datas de assinatura daria o
 * mesmo resultado na maior parte dos casos e divergiria justamente nos que
 * importam.
 *
 * A ordem das perguntas importa: um atendimento que ainda não aconteceu não
 * está pendente de assinatura, e tratá-lo como pendente encheria a tela de
 * atrasos falsos.
 */
export function supervisionState(schedule: SupervisedSchedule): SupervisionState {
  if (schedule.status === "cancelled" || schedule.status === "missed") return "will-not-happen";
  if (!schedule.needsSupervisorSignature) return "not-supervised";

  switch (schedule.status) {
    case "pending_supervisor_signature":
      return "awaiting-supervisor";
    case "pending_signature":
    case "pending_register":
      return "awaiting-professional";
    case "finished":
      return "signed";
    default:
      return "not-yet";
  }
}

export function supervisionStateLabel(state: SupervisionState): string {
  switch (state) {
    case "awaiting-supervisor":
      return "Aguardando a assinatura do supervisor";
    case "awaiting-professional":
      return "Aguardando quem atendeu assinar";
    case "signed":
      return "Assinado pelos dois";
    case "not-supervised":
      return "Não exige segunda assinatura";
    case "not-yet":
      return "Ainda não atendido";
    case "will-not-happen":
      return "Cancelado ou sem comparecimento — não haverá assinatura";
  }
}

/** Os atendimentos parados esperando o supervisor — o número que a tela deve abrir. */
export function awaitingSupervisor(data: SupervisionData): SupervisedSchedule[] {
  return data.schedules.filter(
    (schedule) => supervisionState(schedule) === "awaiting-supervisor",
  );
}

/** Os que esperam quem atendeu: a cobrança tem outro destinatário. */
export function awaitingProfessional(data: SupervisionData): SupervisedSchedule[] {
  return data.schedules.filter(
    (schedule) => supervisionState(schedule) === "awaiting-professional",
  );
}

/**
 * Quantos dias um atendimento está parado esperando assinatura.
 *
 * Medido contra a data do atendimento, e não contra a da primeira assinatura:
 * o que interessa a quem coordena é há quanto tempo o atendimento aconteceu
 * sem fechar.
 */
export function daysWaiting(schedule: SupervisedSchedule, today = TODAY): number {
  const day = schedule.start.slice(0, 10);
  const from = new Date(`${day}T12:00:00.000Z`).getTime();
  const to = new Date(`${today}T12:00:00.000Z`).getTime();
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/* ================================================================== *
 * A equipe de supervisão — a proposta
 * ================================================================== */

/**
 * Regras da supervisão como relação, e não como lista.
 *
 * A tela portada resolve uma pergunta: o que os supervisionados **deste**
 * supervisor atenderam. As perguntas que chegam à coordenação são três, e duas
 * delas entram pelo outro lado — "quem supervisiona quem atende esta criança?" e
 * "de quem é a assinatura que está travando o fechamento?". Uma lista de
 * supervisores com um painel ao lado só responde a primeira.
 *
 * Daí a proposta: supervisor, aplicador e paciente como três entradas para a
 * mesma relação. As regras abaixo são o que essa forma obriga a decidir.
 */
export const supervisionTeamRules: Rule[] = [
  {
    id: "supervision-is-a-three-sided-relation",
    statement:
      "Selecionar em qualquer uma das três colunas filtra as outras duas, nos dois sentidos: supervisor mostra seus aplicadores e os pacientes deles; aplicador mostra seu supervisor e seus pacientes; paciente mostra quem o atende e quem supervisiona quem o atende.",
    rationale:
      "Sem o sentido inverso, a pergunta que chega pelo paciente não tem por onde entrar — e é a que mais chega, porque é a família que liga. Quem coordena teria de abrir supervisor por supervisor até achar quem atende a criança, e o caminho mais curto passa a ser perguntar no corredor.",
    source: "src/rules/supervision.ts",
  },
  {
    id: "supervision-selection-drops-what-stopped-holding",
    statement:
      "Uma seleção nova apaga as seleções que deixaram de valer com ela. Escolher um paciente que o aplicador selecionado não atende limpa o aplicador; escolher um aplicador revela o supervisor dele em vez de manter o anterior.",
    rationale:
      "Manter as duas produziria interseção vazia, e a tela diria “nenhum resultado” quando o que houve foi filtro incompatível. É a pior forma de vazio: ela descreve os dados quando o problema está na pergunta, e quem lê conclui que a clínica não tem o que procura.",
    source: "src/rules/supervision.ts",
  },
  {
    id: "supervision-queue-follows-the-selected-scope",
    statement:
      "A fila de assinaturas conta dentro do escopo selecionado: com um supervisor escolhido, só o dele; sem nada escolhido, a equipe inteira. Os indicadores do topo seguem o mesmo escopo.",
    rationale:
      "Um número da equipe inteira ao lado de uma coluna já filtrada é lido como sendo do filtro. Quem coordena decide a partir dele — abre o lote esperando três atendimentos e encontra trinta, ou pior, dá o mês por fechado.",
    source: "src/rules/supervision.ts",
  },
  {
    id: "supervision-signature-is-reviewed-one-at-a-time",
    statement:
      "O lote não assina em bloco. Ele abre um atendimento por vez, com as tentativas de cada programa, a observação de quem aplicou e os registros ABC, e cada assinatura é um ato. Pular deixa o atendimento na fila.",
    rationale:
      "A segunda assinatura é a afirmação de que alguém leu o registro. Um botão que assine trinta de uma vez transforma essa afirmação em carimbo, e o efeito aparece meses depois — quando o convênio glosa e ninguém sabe dizer o que foi conferido.",
    source: "src/rules/supervision.ts",
  },
  {
    id: "supervision-scope-is-locked-for-who-supervises",
    statement:
      "Quem abre a tela supervisionando não escolhe supervisor: a coluna não existe e o escopo nasce travado nele. As outras duas colunas nascem filtradas pelos vínculos dele.",
    rationale:
      "Oferecer a escolha para quem tem uma opção só é oferecer um filtro que não filtra. E é a única forma de a tela servir a quem supervisiona sem virar uma visão da clínica inteira — que é o que a permissão de listar supervisores concede, e que este papel não tem.",
    source: "src/rules/supervision.ts",
  },
  {
    id: "supervision-column-has-its-own-permission",
    statement:
      "Não existe uma permissão da tela: existe uma por coluna. Supervisores é de `list_supervisor`, Aplicadores é de `professionals.list` ou do próprio vínculo de supervisão, e Pacientes é de `patients.list`. Quem não alcança pelo menos Aplicadores e Pacientes não abre a tela.",
    rationale:
      "Uma permissão só para a tela inteira obrigaria a escolher entre dar a clínica a quem só devia ver a própria carteira e não dar nada a quem tem uma pergunta legítima — a recepção alcança profissional e paciente, e “quem atende esta criança?” é a pergunta dela. Derivar coluna por coluna também é o que faz o supervisor que também é terapeuta funcionar sem que a tela pergunte pelo papel dele.",
    source: "src/rules/supervision.ts",
  },
  {
    id: "supervision-needs-two-of-the-three-columns",
    statement:
      "Com uma coluna só, a tela não abre. People alcança profissionais e não alcança pacientes; Operação e quem é supervisionado alcançam pacientes e não alcançam profissionais. Nos dois casos a tela vira uma lista que já existe em outro lugar, e é para lá que ela manda.",
    rationale:
      "Supervisão é uma relação, e relação de uma ponta só não é relação — a coluna sozinha repete a lista de Profissionais ou a de Pacientes com menos recurso. Mandar para onde funciona é mais útil que uma negativa seca, e é o que a tela portada já faz com quem supervisiona.",
    source: "src/rules/supervision.ts",
  },
];

/* --------------------------------------------------- alcance da tela */

/**
 * Quais colunas esta pessoa alcança, e em que escopo.
 *
 * **A pergunta é por permissão, nunca pelo papel.** Papéis são acumuláveis no
 * monólito, então "é supervisor" não é uma pergunta que a tela possa fazer: a
 * mesma pessoa pode ser terapeuta e supervisora, e uma coisa não anula a outra.
 * O que a tela pergunta é o que cada coluna exige.
 *
 * O escopo travado vem do **vínculo**, e não do cargo — a mesma escolha da regra
 * `supervisor-is-derived-from-links`. E ele só trava quem **não** pode escolher:
 * quem lista supervisores e ainda por cima supervisiona alguém continua
 * escolhendo, porque para ela a coluna existe.
 */
export type SupervisionReach = {
  supervisors: boolean;
  applicators: boolean;
  patients: boolean;
  /** Supervisor em que o escopo nasce travado, quando não há o que escolher. */
  lockedTo?: string;
};

/**
 * O único lugar em que esta tela pergunta pelo papel, e o motivo.
 *
 * Ter um vínculo de supervisão não é permissão, é **cadastro**: no monólito é uma
 * linha de `supervisor_internships` apontando para a sua ficha de profissional, e
 * nenhuma das vinte e seis policies a expressa. Nenhuma permissão separa quem
 * supervisiona de quem é supervisionado — supervisor, especialista, terapeuta e
 * aplicador dividem as mesmas três que interessam aqui.
 *
 * Então a pergunta é de identidade, não de autorização, e neste ambiente a
 * identidade de quem abre é a persona. É a mesma exceção de `visibleTabs/1` em
 * `src/rules/inClinic.ts`: o produto decide por papel, e o porte reproduz isso
 * isolado numa função, com nota, em vez de espalhar pela tela.
 *
 * Usar uma permissão só do supervisor como proxy — `patients.see_hour_maps`, por
 * exemplo — seria pior: ela existe por outro motivo, e no dia em que o mapa de
 * horas mudar de dono a Supervisão muda de comportamento sem ninguém entender
 * por quê.
 */
const PAPEL_QUE_SUPERVISIONA = "supervisor";

/** Implementação de `supervision-column-has-its-own-permission`. */
export function supervisionReach(
  permissions: readonly string[],
  data: SupervisionTeamData,
  personaId: string | undefined,
): SupervisionReach {
  const supervisors = permissions.includes("professionals.list_supervisor");
  // O vínculo é de quem supervisiona. Quem lista supervisores escolhe entre
  // todos, então o próprio vínculo dela não estreita nada.
  const vinculo =
    !supervisors && personaId === PAPEL_QUE_SUPERVISIONA ? data.viewerSupervisorId : undefined;

  return {
    supervisors,
    // O vínculo alcança os aplicadores mesmo sem `professionals.list`: é o
    // `supervisor_internships` do monólito ampliando o escopo de quem
    // supervisiona, que é o que a própria persona descreve.
    applicators: permissions.includes("professionals.list") || vinculo !== undefined,
    patients: permissions.includes("patients.list"),
    ...(vinculo !== undefined ? { lockedTo: vinculo } : {}),
  };
}

/** O escopo em que a tela navega: onde ela trava, e se dá para escolher. */
export type SupervisionScope = {
  lockedTo?: string;
  /** A coluna de supervisores existe para esta pessoa. */
  picksSupervisor: boolean;
};

export function scopeOf(reach: SupervisionReach): SupervisionScope {
  return {
    ...(reach.lockedTo !== undefined ? { lockedTo: reach.lockedTo } : {}),
    picksSupervisor: reach.supervisors,
  };
}

/** Implementação de `supervision-needs-two-of-the-three-columns`. */
export function reachesSupervision(reach: SupervisionReach): boolean {
  return reach.applicators && reach.patients;
}

/**
 * Para onde vai quem a tela não atende.
 *
 * Cada negativa aponta a tela que responde a pergunta que sobrou. Um "sem
 * permissão" seco deixaria a pessoa procurando — é a mesma correção que a tela
 * portada faz com quem supervisiona.
 */
export function supervisionDetour(reach: SupervisionReach): string {
  if (reach.applicators && !reach.patients) {
    return "Você alcança profissionais e não alcança pacientes, e supervisão é uma relação entre os dois. O lado de contrato e de horas da equipe está em Profissionais.";
  }
  if (reach.patients && !reach.applicators) {
    return "Você alcança pacientes, e não a lista de profissionais nem um vínculo de supervisão — não há de quem falar. Se é você que é supervisionado, a assinatura do seu supervisor é pedida no próprio atendimento; se você acabou de ser designado supervisor e ainda não tem ninguém, a tela abre quando o primeiro vínculo existir.";
  }
  return "Esta tela é de quem coordena e de quem supervisiona. Ela cruza supervisores, aplicadores e pacientes, e nenhuma das três listas está no seu alcance.";
}

/**
 * O que está selecionado nas três colunas.
 *
 * `undefined` é "nada escolhido aqui", e não "escolhido vazio": sem nada
 * escolhido as três colunas mostram tudo, que é o estado em que a tela abre.
 */
export type SupervisionSelection = {
  supervisorId?: string;
  applicatorId?: string;
  patientId?: string;
};

/* ------------------------------------------------------- os vínculos */

/** Os aplicadores ligados a um supervisor pelo vínculo de estágio. */
export function applicatorsOfSupervisor(data: SupervisionTeamData, supervisorId: string): string[] {
  return data.applicators
    .filter((applicator) => applicator.supervisorId === supervisorId)
    .map((applicator) => applicator.id);
}

/** Quem atende um paciente — pode ser mais de um, de especialidades diferentes. */
export function applicatorsOfPatient(data: SupervisionTeamData, patientId: string): string[] {
  return unique(
    data.sessions
      .filter((session) => session.patientId === patientId)
      .map((session) => session.applicatorId),
  );
}

export function patientsOfApplicator(data: SupervisionTeamData, applicatorId: string): string[] {
  return unique(
    data.sessions
      .filter((session) => session.applicatorId === applicatorId)
      .map((session) => session.patientId),
  );
}

export function patientsOfSupervisor(data: SupervisionTeamData, supervisorId: string): string[] {
  const applicators = applicatorsOfSupervisor(data, supervisorId);
  return unique(
    data.sessions
      .filter((session) => applicators.includes(session.applicatorId))
      .map((session) => session.patientId),
  );
}

/**
 * Quem supervisiona quem atende um paciente.
 *
 * É o sentido que a tela portada não tem, e o que faz a pergunta da família ter
 * resposta em um clique: um paciente com fonoaudiologia e ABA tem dois
 * supervisores, e nenhum dos dois responde pelo trabalho do outro.
 */
export function supervisorsOfPatient(data: SupervisionTeamData, patientId: string): string[] {
  return unique(
    applicatorsOfPatient(data, patientId)
      .map((id) => data.applicators.find((applicator) => applicator.id === id)?.supervisorId)
      .filter((id): id is string => id !== undefined),
  );
}

/* ------------------------------------------- as três colunas visíveis */

/** Implementação de `supervision-is-a-three-sided-relation`, coluna a coluna. */
export function visibleSupervisors(
  data: SupervisionTeamData,
  selection: SupervisionSelection,
): string[] {
  let ids = data.supervisors.map((supervisor) => supervisor.id);
  if (selection.applicatorId) {
    const applicator = data.applicators.find((item) => item.id === selection.applicatorId);
    ids = ids.filter((id) => id === applicator?.supervisorId);
  }
  if (selection.patientId) {
    const donos = supervisorsOfPatient(data, selection.patientId);
    ids = ids.filter((id) => donos.includes(id));
  }
  return ids;
}

export function visibleApplicators(
  data: SupervisionTeamData,
  selection: SupervisionSelection,
): string[] {
  let ids = data.applicators.map((applicator) => applicator.id);
  const escopo = selection.supervisorId;
  if (escopo) {
    const doEscopo = applicatorsOfSupervisor(data, escopo);
    ids = ids.filter((id) => doEscopo.includes(id));
  }
  if (selection.patientId) {
    const atendem = applicatorsOfPatient(data, selection.patientId);
    ids = ids.filter((id) => atendem.includes(id));
  }
  return ids;
}

export function visiblePatients(
  data: SupervisionTeamData,
  selection: SupervisionSelection,
): string[] {
  let ids = data.patients.map((patient) => patient.id);
  const escopo = selection.supervisorId;
  if (escopo) {
    const doEscopo = patientsOfSupervisor(data, escopo);
    ids = ids.filter((id) => doEscopo.includes(id));
  }
  if (selection.applicatorId) {
    const doAplicador = patientsOfApplicator(data, selection.applicatorId);
    ids = ids.filter((id) => doAplicador.includes(id));
  }
  return ids;
}

/* --------------------------------------------------- escolher e limpar */

/**
 * Implementação de `supervision-selection-drops-what-stopped-holding`.
 *
 * As três funções são separadas porque cada uma derruba coisas diferentes, e
 * uma função só com três ramos esconderia justamente a assimetria: escolher
 * aplicador **revela** o supervisor, escolher paciente pode **apagá-lo**.
 *
 * Clicar no que já está selecionado desmarca — é o que faz a coluna servir de
 * filtro e não de radio irreversível.
 */
export function pickSupervisor(
  data: SupervisionTeamData,
  selection: SupervisionSelection,
  supervisorId: string,
  scope: SupervisionScope,
): SupervisionSelection {
  if (selection.supervisorId === supervisorId) return clearSelection(scope);

  const proximo: SupervisionSelection = { ...selection, supervisorId };
  const applicator = data.applicators.find((item) => item.id === selection.applicatorId);
  if (applicator && applicator.supervisorId !== supervisorId) delete proximo.applicatorId;
  if (selection.patientId && !patientsOfSupervisor(data, supervisorId).includes(selection.patientId)) {
    delete proximo.patientId;
  }
  return proximo;
}

export function pickApplicator(
  data: SupervisionTeamData,
  selection: SupervisionSelection,
  applicatorId: string,
  scope: SupervisionScope,
): SupervisionSelection {
  if (selection.applicatorId === applicatorId) {
    const proximo = { ...selection };
    delete proximo.applicatorId;
    return proximo;
  }

  const applicator = data.applicators.find((item) => item.id === applicatorId);
  const proximo: SupervisionSelection = { ...selection, applicatorId };
  // O supervisor do aplicador escolhido, e não o que estava antes: a coluna da
  // esquerda passa a mostrar de quem é a responsabilidade.
  // Só para quem tem a coluna. Sem isso, a recepção — que alcança aplicador e
  // paciente mas não supervisor — ganharia um filtro invisível de supervisor e
  // veria a coluna de pacientes encolher sem nada na tela explicando por quê.
  if (scope.picksSupervisor && applicator) proximo.supervisorId = applicator.supervisorId;
  if (selection.patientId && !patientsOfApplicator(data, applicatorId).includes(selection.patientId)) {
    delete proximo.patientId;
  }
  return proximo;
}

export function pickPatient(
  data: SupervisionTeamData,
  selection: SupervisionSelection,
  patientId: string,
  scope: SupervisionScope,
): SupervisionSelection {
  if (selection.patientId === patientId) {
    const proximo = { ...selection };
    delete proximo.patientId;
    return proximo;
  }

  const proximo: SupervisionSelection = { ...selection, patientId };
  if (
    selection.applicatorId &&
    !patientsOfApplicator(data, selection.applicatorId).includes(patientId)
  ) {
    delete proximo.applicatorId;
  }
  if (
    scope.picksSupervisor &&
    selection.supervisorId &&
    !supervisorsOfPatient(data, patientId).includes(selection.supervisorId)
  ) {
    delete proximo.supervisorId;
  }
  return proximo;
}

/**
 * Implementação de `supervision-scope-is-locked-for-who-supervises`.
 *
 * Limpar não devolve a clínica inteira a quem só tem os próprios vínculos: o
 * escopo travado é o piso, e é ele que sobra.
 */
export function clearSelection(scope: SupervisionScope): SupervisionSelection {
  return scope.lockedTo !== undefined ? { supervisorId: scope.lockedTo } : {};
}

/* ------------------------------------------------- fila de assinaturas */

/**
 * Um atendimento ainda esperando a segunda assinatura.
 *
 * `signed` são as assinaturas dadas nesta sessão de uso. Elas não voltam para a
 * fixture — a tela é uma especificação, não um banco — mas precisam sair da fila
 * na hora, senão assinar não muda nada visível e a pessoa assina de novo.
 */
export function isPendingSignature(session: SupervisionSession, signed: ReadonlySet<string>): boolean {
  return session.status === "pending_supervisor_signature" && !signed.has(session.id);
}

export function pendingOfApplicator(
  data: SupervisionTeamData,
  applicatorId: string,
  signed: ReadonlySet<string>,
): number {
  return data.sessions.filter(
    (session) => session.applicatorId === applicatorId && isPendingSignature(session, signed),
  ).length;
}

export function pendingOfPatient(
  data: SupervisionTeamData,
  patientId: string,
  signed: ReadonlySet<string>,
): number {
  return data.sessions.filter(
    (session) => session.patientId === patientId && isPendingSignature(session, signed),
  ).length;
}

export function pendingOfSupervisor(
  data: SupervisionTeamData,
  supervisorId: string,
  signed: ReadonlySet<string>,
): number {
  const applicators = applicatorsOfSupervisor(data, supervisorId);
  return data.sessions.filter(
    (session) =>
      applicators.includes(session.applicatorId) && isPendingSignature(session, signed),
  ).length;
}

export function pendingOfPair(
  data: SupervisionTeamData,
  applicatorId: string,
  patientId: string,
  signed: ReadonlySet<string>,
): number {
  return data.sessions.filter(
    (session) =>
      session.applicatorId === applicatorId &&
      session.patientId === patientId &&
      isPendingSignature(session, signed),
  ).length;
}

/**
 * Implementação de `supervision-queue-follows-the-selected-scope`.
 *
 * O escopo é o supervisor, e não o aplicador nem o paciente. É deliberado: a
 * fila e os indicadores respondem por uma carteira de supervisão, e trocá-los a
 * cada clique nas outras duas colunas faria três números piscarem a cada
 * refinamento de pergunta — sem que nenhum deles fosse a resposta.
 */
export function pendingInScope(
  data: SupervisionTeamData,
  selection: SupervisionSelection,
  signed: ReadonlySet<string>,
): number {
  const escopo = selection.supervisorId;
  if (escopo) return pendingOfSupervisor(data, escopo, signed);
  return data.sessions.filter((session) => isPendingSignature(session, signed)).length;
}

/** Os três indicadores do topo, no mesmo escopo da fila. */
export function scopeCounters(
  data: SupervisionTeamData,
  selection: SupervisionSelection,
  signed: ReadonlySet<string>,
): { appointments: number; toSign: number; absences: number } {
  const escopo = selection.supervisorId;
  const noEscopo = escopo
    ? data.sessions.filter((session) =>
        applicatorsOfSupervisor(data, escopo).includes(session.applicatorId),
      )
    : data.sessions;

  return {
    appointments: noEscopo.length,
    toSign: pendingInScope(data, selection, signed),
    absences: noEscopo.filter((session) => session.status === "missed").length,
  };
}

/**
 * A fila de revisão, do mais recente para o mais antigo.
 *
 * Do mais recente de propósito: o atendimento de ontem ainda está na memória de
 * quem supervisiona, e é o que ela consegue conferir de fato. Começar pelo mais
 * antigo põe na frente exatamente o que ninguém lembra.
 */
export function sessionsToSign(
  data: SupervisionTeamData,
  scope: { applicatorIds?: string[]; patientId?: string },
  signed: ReadonlySet<string>,
): SupervisionSession[] {
  return data.sessions
    .filter((session) => isPendingSignature(session, signed))
    .filter(
      (session) =>
        scope.applicatorIds === undefined || scope.applicatorIds.includes(session.applicatorId),
    )
    .filter((session) => scope.patientId === undefined || session.patientId === scope.patientId)
    .slice()
    .sort((a, b) => b.start.localeCompare(a.start));
}

/**
 * O próximo atendimento não resolvido da fila.
 *
 * Procura para a frente primeiro e só depois dá a volta. A volta importa: quem
 * pulou três no meio e assinou o resto espera voltar a eles, e não sair do lote
 * como se tivesse acabado.
 *
 * `-1` quando não sobrou nenhum — é o fim do lote, e é o que o resumo usa.
 */
export function nextUnresolved(
  ids: readonly string[],
  current: number,
  resolved: ReadonlySet<string>,
): number {
  for (let i = current + 1; i < ids.length; i += 1) {
    if (!resolved.has(ids[i]!)) return i;
  }
  for (let i = 0; i < ids.length; i += 1) {
    if (!resolved.has(ids[i]!)) return i;
  }
  return -1;
}

/* ------------------------------------------------ pontos de atenção */

const TREND_LABEL: Record<ProgramTrend, string> = {
  up: "Avançando",
  flat: "Estável",
  stalled: "Estagnado",
  down: "Regressão",
};

export function programTrendLabel(trend: ProgramTrend): string {
  return TREND_LABEL[trend];
}

/** Estagnado e regressão pedem decisão de quem supervisiona; os outros dois não. */
export function trendNeedsAttention(trend: ProgramTrend): boolean {
  return trend === "stalled" || trend === "down";
}

/**
 * Os pontos de atenção de um paciente, na ordem em que a coordenação age.
 *
 * Programa antes de guia antes de falta: o primeiro muda o desenho da
 * intervenção, o segundo trava o faturamento, o terceiro é conversa com a
 * família. Sessão sem registro fica no fim porque é a única que se resolve
 * cobrando uma pessoa só.
 */
export function patientAlerts(data: SupervisionTeamData, patientId: string): string[] {
  const patient = data.patients.find((item) => item.id === patientId);
  if (!patient) return [];

  const alerts: string[] = [];
  for (const program of patient.programs) {
    if (trendNeedsAttention(program.trend)) {
      alerts.push(`${programTrendLabel(program.trend)}: ${program.name}`);
    }
  }
  if (patient.expiringGuide) alerts.push("Guia vencendo");

  const sessions = data.sessions.filter((session) => session.patientId === patientId);
  const faltas = sessions.filter((session) => session.status === "missed").length;
  if (faltas >= 2) alerts.push(`${faltas} faltas no período`);
  if (sessions.some((session) => session.status === "finished" && !session.hasRecord)) {
    alerts.push("Atendimento sem registro");
  }
  return alerts;
}

/**
 * Os pontos de atenção de um aplicador: os dos pacientes dele, mais os dele.
 *
 * **Cada ponto carrega o nome de quem ele é, e nada é somado.** Duas guias
 * vencendo em dois pacientes são dois problemas, com dois convênios e dois
 * prazos; juntá-las numa linha "Guia vencendo" faria a contagem cair pela
 * metade e o aplicador parecer mais em ordem do que está.
 *
 * "Nunca supervisionado" e "sem supervisão há mais de 30 dias" são a pendência
 * que só aparece aqui — a supervisão que não aconteceu não deixa registro em
 * nenhuma outra tela do sistema, e por isso ninguém a cobra.
 */
export function applicatorAlerts(data: SupervisionTeamData, applicatorId: string): string[] {
  const alerts = patientsOfApplicator(data, applicatorId).flatMap((patientId) => {
    const patient = data.patients.find((item) => item.id === patientId);
    const quem = patient ? patient.name.split(" ")[0] : "";
    return patientAlerts(data, patientId).map((alert) => `${alert} · ${quem}`);
  });

  const applicator = data.applicators.find((item) => item.id === applicatorId);
  if (!applicator) return alerts;

  if (!applicator.lastSupervisionOn) alerts.push("Nunca supervisionado");
  else {
    const dias = daysBetween(applicator.lastSupervisionOn, data.now);
    if (dias > 30) alerts.push(`${dias} dias sem supervisão`);
  }
  return alerts;
}

/** Dias desde a última supervisão. `undefined` quando nunca houve uma. */
export function daysSinceSupervision(
  applicator: SupervisionApplicator,
  now: string,
): number | undefined {
  if (!applicator.lastSupervisionOn) return undefined;
  return daysBetween(applicator.lastSupervisionOn, now);
}

/* ------------------------------------------------------------ auxílio */

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function daysBetween(from: string, to: string): number {
  const inicio = new Date(`${from.slice(0, 10)}T12:00:00.000Z`).getTime();
  const fim = new Date(`${to.slice(0, 10)}T12:00:00.000Z`).getTime();
  return Math.max(0, Math.round((fim - inicio) / 86_400_000));
}
