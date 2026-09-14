import type { Fixture } from "@brucesantos/design-space";
import type {
  NpsSurvey,
  PushDelivery,
  PushGuardian,
  PushMessage,
  PushSegment,
  PushTemplate,
  PushData,
} from "../contracts/index.js";

/**
 * Fixtures da Central de PUSH.
 *
 * **O relógio é declarado**, como na fixture da gestão de chamadas: `TODAY` e
 * `NOW` carimbam o que for disparado dentro da tela, e nenhum dado aqui nasce
 * do relógio da máquina — o teste de determinismo proíbe até a menção ao
 * construtor de data dentro desta pasta. A data de referência é a mesma do
 * resto do Design Space — 30/07/2026, `TODAY` em `src/contracts` — para que
 * "amanhã" na agenda e "amanhã" no comunicado sejam o mesmo dia.
 *
 * **Doze responsáveis, e não vinte e oito.** O desenho gera o elenco por
 * sorteio semeado; aqui ele é escrito à mão, porque o teste de determinismo
 * proíbe gerador na pasta de fixtures e porque doze é o menor número que ainda
 * dá recorte: duas unidades, dois turnos, cinco operadoras, quatro terapeutas,
 * dois sem aplicativo e dois com push desligado. Um público de vinte e oito
 * sorteados dá números mais bonitos e nenhuma pergunta a mais.
 *
 * As duas famílias sem aplicativo e as duas com push desligado são o ponto da
 * área, não ruído: é o que a recepção precisa saber **antes** de considerar o
 * aviso entregue. Ver `who-cannot-receive-is-named-before-and-after-sending`.
 *
 * O elenco é o do resto do Design Space — as mesmas crianças, as mesmas
 * terapeutas, as mesmas operadoras. Uma clínica com dois elencos faria a
 * especificação parecer dois produtos.
 */

const TODAY = "30/07/2026";
const NOW = "10:40";

/**
 * A unidade é a do cabeçalho do `AppShell`, que diz "Unidade · Vila Aurora" em
 * toda tela do backoffice. O texto dos comunicados nomeia a unidade, e um
 * comunicado que fala de uma unidade que o cabeçalho não conhece faria a
 * própria prévia contradizer a tela em volta.
 */
const UNIDADE = "Vila Aurora";
const OUTRA_UNIDADE = "Unidade Centro";

/** Quem está com a tela aberta — o mesmo nome que o cabeçalho mostra em Perfil. */
const AUTOR = "Marcos Vinícius Gimenes";
/** Quem assinou os comunicados que já saíram. */
const COORDENACAO = "Adriana Belmonte";
const RECEPCAO = "Sílvia Nogueira";

/* ========================================================= responsáveis */

const RESPONSAVEIS: PushGuardian[] = [
  {
    id: "g1",
    name: "Renata Ferraz",
    patient: "Beatriz Ferraz",
    unit: UNIDADE,
    shift: "Manhã",
    insurer: "Bradesco Saúde",
    professional: "Marina Okabe",
    appInstalled: true,
    pushEnabled: true,
  },
  {
    id: "g2",
    // Push desligado no aparelho: recebe, e só vê quando abre o app por conta
    // própria. É o caso que estica a hora de visualização para a tarde.
    name: "Paulo Nunes Ferreira",
    patient: "Lucas Almeida Ferreira",
    unit: UNIDADE,
    shift: "Manhã",
    insurer: "Unimed",
    professional: "Clara Vidigal",
    appInstalled: true,
    pushEnabled: false,
  },
  {
    id: "g3",
    name: "Iara Monteiro Sales",
    patient: "Noah Andrade Lins",
    unit: UNIDADE,
    shift: "Tarde",
    insurer: "Bradesco Saúde",
    professional: "Marina Okabe",
    appInstalled: true,
    pushEnabled: true,
  },
  {
    id: "g4",
    // Sem aplicativo. Nenhum comunicado alcança esta família por aqui — quem
    // alcança é o telefone da recepção, e a tela tem de dizer isso.
    name: "Camila Duarte",
    patient: "Helena Martins Costa",
    unit: UNIDADE,
    shift: "Tarde",
    insurer: "SulAmérica",
    professional: "Otávio Ferrandini",
    appInstalled: false,
    pushEnabled: false,
  },
  {
    id: "g5",
    name: "Bruno Farias",
    patient: "Enzo Tavares",
    unit: UNIDADE,
    shift: "Manhã",
    insurer: "Amil",
    professional: "Helena Braga",
    appInstalled: true,
    pushEnabled: true,
  },
  {
    id: "g6",
    name: "Larissa Gomes",
    patient: "Manuela Castro Dias",
    unit: UNIDADE,
    shift: "Tarde",
    insurer: "Bradesco Saúde",
    professional: "Clara Vidigal",
    appInstalled: true,
    pushEnabled: true,
  },
  {
    id: "g7",
    name: "Gustavo Pires",
    patient: "Laura Mendes Pires",
    unit: UNIDADE,
    shift: "Manhã",
    insurer: "Particular",
    professional: "Marina Okabe",
    appInstalled: true,
    pushEnabled: true,
  },
  {
    id: "g8",
    name: "Beatriz Lima Rocha",
    patient: "Miguel Andrade Rocha",
    unit: OUTRA_UNIDADE,
    shift: "Manhã",
    insurer: "Unimed",
    professional: "Helena Braga",
    appInstalled: true,
    pushEnabled: true,
  },
  {
    id: "g9",
    name: "Bruna Kishimoto",
    patient: "Bruno Sadao Kishi",
    unit: OUTRA_UNIDADE,
    shift: "Tarde",
    insurer: "SulAmérica",
    professional: "Otávio Ferrandini",
    appInstalled: true,
    pushEnabled: false,
  },
  {
    id: "g10",
    name: "Paula Antunes",
    patient: "Pedro Antunes",
    unit: OUTRA_UNIDADE,
    shift: "Manhã",
    insurer: "Amil",
    professional: "Clara Vidigal",
    appInstalled: true,
    pushEnabled: true,
  },
  {
    id: "g11",
    name: "Iara Machado",
    patient: "Isadora Bueno Ramalho",
    unit: UNIDADE,
    shift: "Tarde",
    insurer: "Bradesco Saúde",
    professional: "Marina Okabe",
    appInstalled: true,
    pushEnabled: true,
  },
  {
    id: "g12",
    name: "Marina Costa",
    patient: "Benício Tavares Rocha",
    unit: UNIDADE,
    shift: "Manhã",
    insurer: "Unimed",
    professional: "Helena Braga",
    appInstalled: false,
    pushEnabled: false,
  },
];

/* =============================================================== modelos */

/**
 * Os modelos, na ordem em que a equipe os procura.
 *
 * `texto-livre` é o último e não tem texto: é o modelo que declara que não há
 * modelo. Sem ele, escrever do zero pareceria um caminho fora da tela.
 */
export const PUSH_TEMPLATES: PushTemplate[] = [
  {
    id: "feriado",
    kind: "operational",
    label: "Feriado — unidade fechada",
    ack: true,
    title: "Não haverá atendimento em {data}",
    body: "A unidade {unidade} não abrirá em {data} por causa do feriado. Os atendimentos de {paciente} voltam ao normal no dia seguinte.",
  },
  {
    id: "chuva",
    kind: "operational",
    label: "Chuva forte / alagamento",
    ack: true,
    title: "Atendimentos de hoje na {unidade}",
    body: "{responsavel}, por causa da chuva forte a unidade {unidade} está com acesso difícil. Se preferir remarcar o atendimento de {paciente}, fale com a recepção.",
  },
  {
    id: "obra",
    kind: "operational",
    label: "Obra / mudança de sala",
    ack: false,
    title: "Mudança temporária de sala",
    body: "A partir de {data} os atendimentos de {paciente} acontecerão em outra sala da unidade {unidade}. A recepção orienta na chegada.",
  },
  {
    id: "proximo",
    kind: "reminder",
    label: "Próximo atendimento",
    ack: false,
    title: "Atendimento de {paciente} em {data}",
    body: "{responsavel}, o atendimento de {paciente} com {profissional} está marcado para {data} às {hora} na unidade {unidade}.",
  },
  {
    id: "confirmacao",
    kind: "reminder",
    label: "Confirmação de presença",
    ack: true,
    title: "Confirme a presença de {paciente}",
    body: "{responsavel}, confirme se {paciente} vem ao atendimento de {data} às {hora}. Sem confirmação o horário pode ser liberado.",
  },
  {
    id: "documento",
    kind: "document",
    label: "Documento pendente",
    ack: true,
    title: "Pendência de documento de {paciente}",
    body: "{responsavel}, ainda falta {documento} de {paciente}. Sem o documento a operadora pode recusar as próximas sessões. Envie pelo app ou entregue na recepção.",
  },
  {
    id: "autorizacao",
    kind: "document",
    label: "Autorização vencendo",
    ack: true,
    title: "Autorização de {paciente} vence em {data}",
    body: "{responsavel}, a autorização de {paciente} vence em {data}. Precisamos do pedido médico atualizado para dar continuidade ao plano terapêutico.",
  },
  {
    id: "grupo-de-pais",
    kind: "campaign",
    label: "Grupo de pais",
    ack: false,
    title: "Grupo de pais em {data}",
    body: "{responsavel}, teremos encontro do grupo de pais em {data} às {hora} na unidade {unidade}. A participação é aberta e não substitui o atendimento de {paciente}.",
  },
  {
    id: "palestra",
    kind: "campaign",
    label: "Palestra / evento",
    ack: false,
    title: "Convite: palestra na {unidade}",
    body: "{responsavel}, a equipe da {unidade} convida você para a palestra do dia {data} às {hora}. Vagas limitadas.",
  },
  { id: "texto-livre", kind: "individual", label: "Texto livre", ack: false, title: "", body: "" },
];

/** Os documentos que a cobrança pede, na palavra da recepção. */
export const PUSH_DOCUMENTS = [
  "o laudo médico atualizado",
  "a guia da operadora",
  "a cópia da carteirinha",
  "o pedido médico de continuidade",
];

/* ============================================================= segmentos */

const SEGMENTOS: PushSegment[] = [
  {
    id: "s-unidade",
    name: `Todos — ${UNIDADE}`,
    description: "Responsáveis com paciente ativo na unidade Vila Aurora.",
    filter: { units: [UNIDADE], shifts: [], insurers: [], professionals: [] },
  },
  {
    id: "s-tarde",
    name: "Turno da tarde",
    description: "Quem atende à tarde, nas duas unidades. Usado no aviso de chuva.",
    filter: { units: [], shifts: ["Tarde"], insurers: [], professionals: [] },
  },
  {
    id: "s-bradesco",
    name: "Convênio Bradesco",
    description: "Usado nas cobranças de guia e de autorização.",
    filter: { units: [], shifts: [], insurers: ["Bradesco Saúde"], professionals: [] },
  },
  {
    id: "s-marina",
    name: "Equipe da Marina",
    description: "Famílias atendidas por Marina Okabe.",
    filter: { units: [], shifts: [], insurers: [], professionals: ["Marina Okabe"] },
  },
];

/* ============================================================== entregas */

const SEM_APP = "App não instalado";
const TOKEN_VENCIDO = "Token de push expirado";

function entregue(
  guardianId: string,
  viewedAt?: string,
  ackAt?: string,
): PushDelivery {
  return { guardianId, status: "delivered", viewedAt, ackAt };
}

function falhou(guardianId: string, reason: string): PushDelivery {
  return { guardianId, status: "failed", reason };
}

const VAZIO = { units: [], shifts: [], insurers: [], professionals: [] };

/* =========================================================== comunicados */

/**
 * Sete comunicados: cinco enviados e dois na fila.
 *
 * Os cinco enviados existem para exercitar leituras diferentes do mesmo painel
 * — o aviso para todos com boa leitura, a cobrança de documento que ninguém
 * abriu, a campanha sem ciência, o lembrete do turno e a mensagem para uma
 * família só. Os dois agendados existem porque a fila é metade da área: é lá
 * que o público ainda vai ser recalculado.
 */
const COMUNICADOS: PushMessage[] = [
  {
    id: "m-feriado",
    kind: "operational",
    templateId: "feriado",
    title: "Não haverá atendimento em 04/08",
    body: "A unidade {unidade} não abrirá em {data} por causa do feriado. Os atendimentos de {paciente} voltam ao normal no dia seguinte.",
    values: { data: "04/08/2026" },
    ack: true,
    push: true,
    audience: { mode: "filter", filter: VAZIO },
    by: COORDENACAO,
    at: "27/07/2026 09:12",
    status: "sent",
    deliveries: [
      entregue("g1", "07:58", "08:04"),
      // Push desligado: viu ao abrir o app no meio do dia, e não na chegada.
      entregue("g2", "12:10", "12:11"),
      entregue("g3", "08:12", "08:20"),
      falhou("g4", SEM_APP),
      entregue("g5", "07:51"),
      entregue("g6", "09:30", "09:31"),
      entregue("g7", "08:02", "08:03"),
      entregue("g8", "08:40", "08:45"),
      entregue("g9", "13:22"),
      entregue("g10", "09:05", "09:06"),
      entregue("g11"),
      falhou("g12", SEM_APP),
    ],
  },
  {
    id: "m-guia",
    kind: "document",
    templateId: "documento",
    title: "Pendência de documento de {paciente}",
    body: "{responsavel}, ainda falta {documento} de {paciente}. Sem o documento a operadora pode recusar as próximas sessões. Envie pelo app ou entregue na recepção.",
    values: { documento: "a guia da operadora" },
    ack: true,
    push: true,
    audience: {
      mode: "segment",
      segmentId: "s-bradesco",
      filter: { units: [], shifts: [], insurers: ["Bradesco Saúde"], professionals: [] },
    },
    by: COORDENACAO,
    at: "28/07/2026 14:40",
    status: "sent",
    deliveries: [
      entregue("g1", "15:02", "15:03"),
      entregue("g3"),
      // A falha que não é falta de app: o aparelho trocou e o token morreu.
      // Some da lista de entregues sem que ninguém perceba, e é por isso que a
      // tela conta as duas razões separadas.
      falhou("g6", TOKEN_VENCIDO),
      entregue("g11", "18:40"),
    ],
  },
  {
    id: "m-grupo",
    kind: "campaign",
    templateId: "grupo-de-pais",
    title: "Grupo de pais em 12/08",
    body: "{responsavel}, teremos encontro do grupo de pais em {data} às {hora} na unidade {unidade}. A participação é aberta e não substitui o atendimento de {paciente}.",
    values: { data: "12/08/2026", hora: "19:00" },
    ack: false,
    push: true,
    audience: { mode: "filter", filter: { ...VAZIO, units: [UNIDADE] } },
    by: "Marina Okabe",
    at: "29/07/2026 11:05",
    status: "sent",
    deliveries: [
      entregue("g1", "11:20"),
      entregue("g2"),
      entregue("g3", "12:02"),
      falhou("g4", SEM_APP),
      entregue("g5", "11:41"),
      entregue("g6", "19:12"),
      entregue("g7"),
      entregue("g11", "13:05"),
      falhou("g12", SEM_APP),
    ],
  },
  {
    id: "m-confirmacao",
    kind: "reminder",
    templateId: "confirmacao",
    title: "Confirme a presença de {paciente}",
    body: "{responsavel}, confirme se {paciente} vem ao atendimento de {data} às {hora}. Sem confirmação o horário pode ser liberado.",
    values: { data: "30/07/2026", hora: "14:00" },
    ack: true,
    push: true,
    audience: { mode: "filter", filter: { ...VAZIO, shifts: ["Tarde"] } },
    by: RECEPCAO,
    at: "30/07/2026 08:00",
    status: "sent",
    deliveries: [
      entregue("g3", "08:14", "08:15"),
      falhou("g4", SEM_APP),
      entregue("g6", "08:31"),
      entregue("g9"),
      entregue("g11", "09:02", "09:40"),
    ],
  },
  {
    id: "m-troca",
    kind: "individual",
    templateId: "texto-livre",
    title: "Troca de terapeuta de Enzo",
    body: "{responsavel}, a partir da próxima semana o atendimento de {paciente} passa a ser com a Clara Vidigal. A Helena continua acompanhando o plano como supervisora.",
    values: {},
    ack: false,
    push: true,
    audience: { mode: "manual", ids: ["g5"], filter: VAZIO },
    by: "Helena Braga",
    at: "30/07/2026 10:12",
    status: "sent",
    deliveries: [entregue("g5", "10:12")],
  },
  {
    id: "m-chuva",
    kind: "operational",
    templateId: "chuva",
    title: "Atendimentos de amanhã na Vila Aurora",
    body: "{responsavel}, por causa da chuva forte a unidade {unidade} está com acesso difícil. Se preferir remarcar o atendimento de {paciente}, fale com a recepção.",
    values: {},
    ack: true,
    push: true,
    audience: { mode: "filter", filter: { ...VAZIO, units: [UNIDADE] } },
    by: RECEPCAO,
    at: "31/07/2026 07:30",
    status: "scheduled",
    deliveries: [],
  },
  {
    id: "m-autorizacao",
    kind: "document",
    templateId: "autorizacao",
    title: "Autorização de {paciente} vence em {data}",
    body: "{responsavel}, a autorização de {paciente} vence em {data}. Precisamos do pedido médico atualizado para dar continuidade ao plano terapêutico.",
    values: { data: "31/08/2026" },
    ack: true,
    push: true,
    audience: { mode: "manual", ids: ["g1", "g7", "g10"], filter: VAZIO },
    by: COORDENACAO,
    at: "03/08/2026 09:00",
    status: "scheduled",
    deliveries: [],
  },
];

/* ================================================================== NPS */

const PERGUNTA = "De 0 a 10, quanto você recomendaria a Bloomy para outra família?";
const ROTULO_COMENTARIO = "O que motivou sua nota?";

const EXTRAS_PADRAO = [
  { id: "q-comunicacao", type: "scale5" as const, text: "Como você avalia a comunicação da equipe com a família?" },
  { id: "q-evolucao", type: "yesno" as const, text: "Você percebeu evolução da criança nos últimos 3 meses?" },
  {
    id: "q-melhorar",
    type: "choice" as const,
    text: "Qual ponto devemos melhorar primeiro?",
    options: ["Horários", "Comunicação", "Estrutura da unidade", "Faturamento e guias", "Nada a melhorar"],
  },
  { id: "q-aberta", type: "text" as const, text: "Algo mais que você queira contar para a coordenação?" },
];

/**
 * Três pesquisas, e a última é a que está aberta na tela.
 *
 * O desenho da evolução só existe com três pontos: com um, a barra é um número
 * grande; com dois, uma seta. Os números caem de +43 para +11 de propósito — a
 * fila de detratores só é uma tela quando existe uma queda para explicar, e a
 * queda mora na unidade Centro, que responde -33 contra +34 da Vila Aurora.
 *
 * **Quem não tem aplicativo não responde.** Camila Duarte e Marina Costa estão
 * na lista de destinatários e não aparecem em resposta nenhuma: é o que faz a
 * taxa de resposta ser 9 de 12, e não 9 de 10.
 */
const PESQUISAS: NpsSurvey[] = [
  {
    id: "n-semestre",
    name: "NPS 1º semestre",
    question: PERGUNTA,
    commentLabel: ROTULO_COMENTARIO,
    commentRequired: false,
    extras: EXTRAS_PADRAO.slice(0, 2),
    audience: { mode: "filter", filter: VAZIO },
    recipients: RESPONSAVEIS.map((pessoa) => pessoa.id),
    status: "sent",
    at: "12/02/2026 09:00",
    by: COORDENACAO,
    responses: [
      { id: "r-sem-g1", guardianId: "g1", score: 10, comment: "A evolução da fala em casa é visível.", at: "12/02/2026 19:40" },
      { id: "r-sem-g3", guardianId: "g3", score: 9, comment: "A terapeuta conhece o Noah de verdade.", at: "13/02/2026 08:12" },
      { id: "r-sem-g5", guardianId: "g5", score: 8, at: "13/02/2026 21:03" },
      { id: "r-sem-g7", guardianId: "g7", score: 9, comment: "Devolutiva mensal muito clara.", at: "14/02/2026 10:20" },
      {
        id: "r-sem-g8",
        guardianId: "g8",
        score: 6,
        comment: "A guia atrasou e perdemos duas semanas de atendimento.",
        at: "14/02/2026 18:55",
        treatment: "resolved",
        treatmentNote: "Guia reemitida e sessões repostas em março.",
        treatmentBy: COORDENACAO,
      },
      { id: "r-sem-g10", guardianId: "g10", score: 7, at: "15/02/2026 09:31" },
      {
        id: "r-sem-g11",
        guardianId: "g11",
        score: 4,
        comment: "Trocaram a terapeuta sem falar comigo antes.",
        at: "15/02/2026 20:14",
        treatment: "resolved",
        treatmentNote: "Coordenação explicou a troca e combinou aviso prévio.",
        treatmentBy: COORDENACAO,
      },
    ],
  },
  {
    id: "n-abril",
    name: "NPS trimestral — abril",
    question: PERGUNTA,
    commentLabel: ROTULO_COMENTARIO,
    commentRequired: false,
    extras: EXTRAS_PADRAO.slice(0, 3),
    audience: { mode: "filter", filter: VAZIO },
    recipients: RESPONSAVEIS.map((pessoa) => pessoa.id),
    status: "sent",
    at: "16/04/2026 09:00",
    by: COORDENACAO,
    responses: [
      { id: "r-abr-g1", guardianId: "g1", score: 10, comment: "Ganhamos autonomia em casa com as orientações.", at: "16/04/2026 12:40" },
      { id: "r-abr-g2", guardianId: "g2", score: 9, at: "16/04/2026 20:05" },
      { id: "r-abr-g3", guardianId: "g3", score: 9, comment: "O app ajudou: vejo o que foi feito em cada sessão.", at: "17/04/2026 07:58" },
      { id: "r-abr-g6", guardianId: "g6", score: 8, at: "17/04/2026 19:22" },
      { id: "r-abr-g7", guardianId: "g7", score: 10, comment: "Ele pede para vir.", at: "18/04/2026 09:10" },
      {
        id: "r-abr-g8",
        guardianId: "g8",
        score: 6,
        comment: "Não consigo contato com a coordenação, só pelo WhatsApp da recepção.",
        at: "18/04/2026 21:47",
        treatment: "resolved",
        treatmentNote: "Agendada devolutiva mensal com a coordenação da unidade.",
        treatmentBy: COORDENACAO,
      },
      { id: "r-abr-g11", guardianId: "g11", score: 7, at: "19/04/2026 11:05" },
    ],
  },
  {
    id: "n-julho",
    name: "NPS trimestral — julho",
    question: PERGUNTA,
    commentLabel: ROTULO_COMENTARIO,
    commentRequired: true,
    extras: EXTRAS_PADRAO,
    audience: { mode: "filter", filter: VAZIO },
    recipients: RESPONSAVEIS.map((pessoa) => pessoa.id),
    status: "sent",
    at: "20/07/2026 09:00",
    by: COORDENACAO,
    responses: [
      {
        id: "r-jul-g1",
        guardianId: "g1",
        score: 10,
        comment: "A equipe manda relatório toda semana e a Bia adora vir.",
        extras: { "q-comunicacao": 5, "q-evolucao": "Sim", "q-melhorar": "Nada a melhorar" },
        at: "20/07/2026 19:12",
      },
      {
        id: "r-jul-g3",
        guardianId: "g3",
        score: 9,
        comment: "A supervisão orienta a gente em casa, e isso mudou a rotina.",
        extras: { "q-comunicacao": 5, "q-evolucao": "Sim", "q-melhorar": "Horários" },
        at: "20/07/2026 21:30",
      },
      {
        id: "r-jul-g5",
        guardianId: "g5",
        score: 10,
        comment: "Melhor clínica por onde passamos.",
        extras: { "q-comunicacao": 4, "q-evolucao": "Sim", "q-melhorar": "Nada a melhorar" },
        at: "21/07/2026 08:02",
      },
      {
        id: "r-jul-g7",
        guardianId: "g7",
        score: 9,
        comment: "Atendimento pontual e a recepção sempre resolve.",
        extras: { "q-comunicacao": 5, "q-evolucao": "Sim", "q-melhorar": "Estrutura da unidade" },
        at: "21/07/2026 10:44",
      },
      {
        id: "r-jul-g8",
        guardianId: "g8",
        score: 8,
        comment: "Vai bem. O estacionamento da unidade é o ponto fraco.",
        extras: { "q-comunicacao": 4, "q-evolucao": "Sim", "q-melhorar": "Estrutura da unidade" },
        at: "22/07/2026 18:20",
      },
      {
        id: "r-jul-g10",
        guardianId: "g10",
        score: 7,
        comment: "Sem reclamações, só gostaria de falar mais com a supervisora.",
        extras: { "q-comunicacao": 3, "q-evolucao": "Sim", "q-melhorar": "Comunicação" },
        at: "22/07/2026 20:05",
      },
      /* -------------------------------------------------- os três detratores */
      {
        id: "r-jul-g6",
        guardianId: "g6",
        score: 6,
        comment: "Cobrança de coparticipação veio errada duas vezes.",
        extras: { "q-comunicacao": 3, "q-evolucao": "Sim", "q-melhorar": "Faturamento e guias" },
        at: "23/07/2026 09:15",
        treatment: "resolved",
        treatmentNote: "Faturamento corrigiu as duas cobranças e o crédito entrou na próxima fatura.",
        treatmentBy: COORDENACAO,
      },
      {
        id: "r-jul-g2",
        guardianId: "g2",
        score: 4,
        comment: "Três cancelamentos no mês e ninguém avisou com antecedência.",
        extras: { "q-comunicacao": 1, "q-evolucao": "Não", "q-melhorar": "Comunicação" },
        at: "23/07/2026 21:48",
        treatment: "contact",
        treatmentNote: "Ligação feita em 27/07. Ficou de retornar depois de conversar com a esposa.",
        treatmentBy: COORDENACAO,
      },
      {
        // O que a fila existe para não deixar passar: nota baixa, comentário
        // específico, e ninguém assumiu.
        id: "r-jul-g9",
        guardianId: "g9",
        score: 5,
        comment: "A sala estava sempre cheia e meu filho ficou desregulado.",
        extras: { "q-comunicacao": 2, "q-evolucao": "Não", "q-melhorar": "Estrutura da unidade" },
        at: "24/07/2026 07:36",
        treatment: "pending",
      },
    ],
  },
];

const DIA: PushData = {
  now: NOW,
  today: TODAY,
  unit: UNIDADE,
  author: AUTOR,
  guardians: RESPONSAVEIS,
  messages: COMUNICADOS,
  templates: PUSH_TEMPLATES,
  segments: SEGMENTOS,
  surveys: PESQUISAS,
};

export const pushFixtures: Fixture[] = [
  {
    id: "push-day",
    label: "Um dia da Central de PUSH",
    description:
      "Cinco comunicados enviados, dois na fila e três pesquisas NPS — a última com nove respostas e três detratores, um deles sem tratativa. Doze responsáveis, dois sem aplicativo e dois com push desligado.",
    data: DIA,
  },
];
