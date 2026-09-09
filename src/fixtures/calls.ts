import type { Fixture } from "@brucesantos/design-space";
import type {
  CallAutomationRule,
  CallDevice,
  CallEvent,
  CallLogEntry,
  CallTemplate,
  CallsData,
} from "../contracts/index.js";

/**
 * Fixtures da gestão de chamadas.
 *
 * **A hora é declarada, e é ela que faz a fila.** `NOW` às 10:40 posiciona os
 * quatro eventos em aberto em quatro esperas diferentes — 40, 35, 10 e 2
 * minutos —, que é o que exercita as três temperaturas do cartão numa tela só.
 * Trocar `NOW` reordena a fila e muda as cores: é dado de cenário, não detalhe.
 *
 * O elenco é o do resto do Design Space — as mesmas crianças, os mesmos
 * profissionais, as mesmas salas. Uma clínica com dois elencos faria a
 * especificação parecer dois produtos.
 *
 * Duas unidades porque dispositivo é por unidade: sem a segunda, o recorte da
 * fila e do seletor passaria sem nunca ser exercido.
 */

const NOW = "10:40";
/**
 * A unidade ativa é a do cabeçalho do `AppShell` — ele espelha o sistema e diz
 * "Unidade · Vila Aurora" em toda tela do backoffice. Uma fixture com outro
 * nome faria a tela contradizer o próprio cabeçalho, e o texto que nomeia a
 * unidade ("Nenhum dispositivo em…") é justamente o de um impedimento, que é o
 * pior lugar para a pessoa ler um nome que não reconhece.
 */
const UNIDADE = "Vila Aurora";
const OUTRA_UNIDADE = "Unidade Centro";

/** Quem está na recepção. Aparece como autor das chamadas manuais. */
const RECEPCAO = "Sílvia Nogueira";

/* ========================================================= dispositivos */

const DISPOSITIVOS: CallDevice[] = [
  {
    id: "dev-prof-sala",
    name: "Echo — Sala dos profissionais",
    room: "Sala dos profissionais",
    audience: "prof",
    unit: UNIDADE,
    online: true,
    volume: 6,
  },
  {
    id: "dev-prof-copa",
    name: "Echo — Copa da equipe",
    room: "Copa da equipe",
    audience: "prof",
    unit: UNIDADE,
    online: true,
    volume: 5,
  },
  {
    id: "dev-fam-recepcao",
    name: "Echo — Recepção",
    room: "Recepção",
    audience: "family",
    unit: UNIDADE,
    online: true,
    volume: 7,
  },
  {
    id: "dev-fam-espera",
    name: "Echo — Sala de espera das famílias",
    room: "Sala de espera das famílias",
    audience: "family",
    unit: UNIDADE,
    online: true,
    volume: 7,
  },
  // A caixa offline é do público dos profissionais, e há outras duas online no
  // mesmo público: é o que exercita `one-device-online-is-enough-to-announce`
  // sem tornar o público inteiro inalcançável.
  {
    id: "dev-prof-corredor",
    name: "Echo Dot — Corredor das salas",
    room: "Corredor das salas",
    audience: "prof",
    unit: UNIDADE,
    online: false,
    volume: 4,
  },
  {
    id: "dev-centro-espera",
    name: "Echo — Sala de espera",
    room: "Sala de espera",
    audience: "family",
    unit: OUTRA_UNIDADE,
    online: true,
    volume: 6,
  },
  {
    id: "dev-centro-prof",
    name: "Echo — Sala dos profissionais",
    room: "Sala dos profissionais",
    audience: "prof",
    unit: OUTRA_UNIDADE,
    online: true,
    volume: 6,
  },
];

/* ============================================================== modelos */

export const CALL_TEMPLATES: CallTemplate[] = [
  {
    id: "arrival",
    kind: "professional",
    label: "Criança chegou",
    text: "{profissional}, {paciente} chegou e está aguardando na recepção.",
  },
  {
    id: "room_ready",
    kind: "professional",
    label: "Sala liberada",
    text: "{profissional}, a {sala} está liberada para o atendimento de {paciente}.",
  },
  {
    id: "prof_late",
    kind: "professional",
    label: "Atendimento atrasado",
    text: "{profissional}, o atendimento de {paciente} estava previsto para {hora}. Favor comparecer à recepção.",
  },
  {
    id: "session_end",
    kind: "guardian",
    label: "Terapia encerrada",
    text: "{responsavel}, responsável por {paciente}, o atendimento foi encerrado. Favor comparecer à recepção.",
  },
  {
    id: "feedback",
    kind: "guardian",
    label: "Devolutiva com a equipe",
    text: "{responsavel}, responsável por {paciente}, a equipe aguarda você para a devolutiva.",
  },
  {
    id: "guardian_call",
    kind: "guardian",
    label: "Chamado da recepção",
    text: "{responsavel}, responsável por {paciente}, favor comparecer à recepção.",
  },
  { id: "free", kind: "general", label: "Texto livre", text: "" },
];

/* =============================================================== regras */

const REGRAS: CallAutomationRule[] = [
  {
    id: "on_checkin",
    label: "Chamar o profissional no check-in da criança",
    desc: "Assim que a criança faz check-in, o sistema busca o próximo atendimento na agenda e chama o profissional responsável.",
    kind: "professional",
    templateId: "arrival",
    on: true,
    delay: 0,
    repeat: 1,
  },
  {
    id: "on_session_end",
    label: "Chamar o responsável no fim do atendimento",
    desc: "Ao encerrar o último atendimento do dia da criança, chama o responsável que fez o check-in.",
    kind: "guardian",
    templateId: "session_end",
    on: true,
    delay: 0,
    repeat: 1,
  },
  // Desligada de propósito: é a regra que a clínica precisa e ainda não
  // confia, e a tela precisa mostrar uma regra desligada com configuração
  // preservada.
  {
    id: "on_late",
    label: "Repetir a chamada quando o profissional não comparece",
    desc: "Se o atendimento não iniciar depois do horário previsto, repete a chamada do profissional.",
    kind: "professional",
    templateId: "prof_late",
    on: false,
    delay: 5,
    repeat: 2,
  },
];

/* ============================================================== elenco */

const CRIANCAS = [
  { id: "pt-7", name: "Beatriz Ferraz", guardian: "Renata Ferraz" },
  { id: "pt-9", name: "Júlia Prado", guardian: "Sônia Prado" },
  { id: "pt-11", name: "Pedro Antunes", guardian: "Vicente Antunes" },
  { id: "pt-2", name: "Caio Ribeiro", guardian: "Eliane Ribeiro" },
];

const PROFISSIONAIS = [
  { id: "prof-marina", name: "Marina Okabe" },
  { id: "prof-clara", name: "Clara Vidigal" },
  { id: "prof-helena", name: "Helena Braga" },
  { id: "prof-denise", name: "Denise Portela" },
];

/* ============================================================== eventos */

/**
 * O dia da unidade até as 10:40.
 *
 * Os três primeiros já foram anunciados e atendidos — é o que dá lastro ao
 * histórico. Os quatro últimos estão em aberto, e são a fila.
 */
const EVENTOS: CallEvent[] = [
  {
    id: "ev-1",
    type: "checkin",
    at: "07:52",
    patient: "Beatriz Ferraz",
    guardian: "Renata Ferraz",
    professional: "Marina Okabe",
    room: "Sala Girassol - 2",
    start: "08:00",
    done: true,
  },
  {
    id: "ev-2",
    type: "checkin",
    at: "08:41",
    patient: "Júlia Prado",
    guardian: "Sônia Prado",
    professional: "Clara Vidigal",
    room: "Sala Ipê - 4",
    start: "09:00",
    done: true,
  },
  {
    id: "ev-3",
    type: "session_end",
    at: "09:00",
    patient: "Beatriz Ferraz",
    guardian: "Renata Ferraz",
    professional: "Marina Okabe",
    room: "Sala Girassol - 2",
    done: true,
  },
  {
    id: "ev-4",
    type: "checkin",
    at: "09:35",
    patient: "Pedro Antunes",
    guardian: "Vicente Antunes",
    professional: "Helena Braga",
    room: "Sala de motricidade",
    start: "09:45",
    done: true,
  },
  // Daqui para baixo, a fila. 40, 35, 10 e 2 minutos de espera às 10:40.
  {
    id: "ev-5",
    type: "session_end",
    at: "10:00",
    patient: "Júlia Prado",
    guardian: "Sônia Prado",
    professional: "Clara Vidigal",
    room: "Sala Ipê - 4",
    done: false,
  },
  {
    id: "ev-6",
    type: "checkin",
    at: "10:05",
    patient: "Caio Ribeiro",
    guardian: "Eliane Ribeiro",
    professional: "Denise Portela",
    room: "Sala de intervenção",
    start: "10:15",
    done: false,
  },
  {
    id: "ev-7",
    type: "session_end",
    at: "10:30",
    patient: "Pedro Antunes",
    guardian: "Vicente Antunes",
    professional: "Helena Braga",
    room: "Sala de motricidade",
    done: false,
  },
  {
    id: "ev-8",
    type: "checkin",
    at: "10:38",
    patient: "Beatriz Ferraz",
    guardian: "Renata Ferraz",
    professional: "Marina Okabe",
    room: "Sala Girassol - 2",
    start: "10:45",
    done: false,
  },
];

/* ============================================================ histórico */

const HISTORICO: CallLogEntry[] = [
  {
    id: "cl-1",
    at: "07:52",
    kind: "professional",
    auto: true,
    eventId: "ev-1",
    status: "acked",
    patient: "Beatriz Ferraz",
    guardian: "Renata Ferraz",
    target: "Marina Okabe",
    deviceIds: ["dev-prof-sala", "dev-prof-copa"],
    text: "Marina Okabe, Beatriz Ferraz chegou e está aguardando na recepção.",
    by: "Automático",
    ackAt: "07:53",
  },
  {
    id: "cl-2",
    at: "08:41",
    kind: "professional",
    auto: true,
    eventId: "ev-2",
    status: "acked",
    patient: "Júlia Prado",
    guardian: "Sônia Prado",
    target: "Clara Vidigal",
    deviceIds: ["dev-prof-sala", "dev-prof-copa"],
    text: "Clara Vidigal, Júlia Prado chegou e está aguardando na recepção.",
    by: "Automático",
    ackAt: "08:44",
  },
  // Anunciada e não atendida: é a distinção que a área existe para manter.
  {
    id: "cl-3",
    at: "09:00",
    kind: "guardian",
    auto: true,
    eventId: "ev-3",
    status: "played",
    patient: "Beatriz Ferraz",
    guardian: "Renata Ferraz",
    target: "Renata Ferraz",
    deviceIds: ["dev-fam-recepcao", "dev-fam-espera"],
    text: "Renata Ferraz, responsável por Beatriz Ferraz, o atendimento foi encerrado. Favor comparecer à recepção.",
    by: "Automático",
  },
  {
    id: "cl-4",
    at: "09:12",
    kind: "general",
    auto: false,
    status: "played",
    target: "Sala de espera",
    deviceIds: ["dev-fam-espera"],
    text: "Atenção: o estacionamento da unidade está com uma vaga bloqueada para manutenção.",
    by: RECEPCAO,
  },
  // Sem resposta e depois resolvida à mão: o par que mostra por que a regra
  // `on_late` existe e por que ela ainda está desligada.
  {
    id: "cl-5",
    at: "09:35",
    kind: "professional",
    auto: true,
    eventId: "ev-4",
    status: "no_answer",
    patient: "Pedro Antunes",
    guardian: "Vicente Antunes",
    target: "Helena Braga",
    deviceIds: ["dev-prof-sala", "dev-prof-copa"],
    text: "Helena Braga, Pedro Antunes chegou e está aguardando na recepção.",
    by: "Automático",
  },
  {
    id: "cl-6",
    at: "09:41",
    kind: "professional",
    auto: false,
    eventId: "ev-4",
    status: "acked",
    patient: "Pedro Antunes",
    guardian: "Vicente Antunes",
    target: "Helena Braga",
    deviceIds: ["dev-prof-sala", "dev-prof-copa"],
    text: "Helena Braga, a Sala de motricidade está liberada para o atendimento de Pedro Antunes.",
    by: RECEPCAO,
    ackAt: "09:42",
  },
  // Falhou porque o único dispositivo escolhido estava offline.
  {
    id: "cl-7",
    at: "09:58",
    kind: "guardian",
    auto: false,
    status: "failed",
    patient: "Caio Ribeiro",
    guardian: "Eliane Ribeiro",
    target: "Eliane Ribeiro",
    deviceIds: ["dev-prof-corredor"],
    text: "Eliane Ribeiro, responsável por Caio Ribeiro, favor comparecer à recepção.",
    by: RECEPCAO,
    error: "Dispositivo offline",
  },
];

const base: CallsData = {
  now: NOW,
  unit: UNIDADE,
  autoMode: true,
  rules: REGRAS,
  devices: DISPOSITIVOS,
  events: EVENTOS,
  log: HISTORICO,
  patients: CRIANCAS,
  professionals: PROFISSIONAIS,
};

/**
 * Uma fixture, porque sobrou um cenário.
 *
 * As outras três — fila vazia, automação geral desligada e público dos
 * profissionais offline — saíram na revisão de 04/09/2026 junto com os cenários
 * que as consumiam. Fixture que nenhum cenário carrega é dado sintético que
 * ninguém abre. Ver decisão 0017.
 */
export const callFixtures: Fixture[] = [
  {
    id: "calls-day",
    label: "A fila da recepção às 10:40",
    description:
      "Quatro eventos em aberto em quatro esperas — 40, 35, 10 e 2 minutos — e um histórico com anunciada, atendida, sem resposta e falhou.",
    data: base satisfies CallsData,
  },
];
