/**
 * Solicitações de melhoria — dados sintéticos. Nomes, e-mails e arquivos são
 * fictícios. As treze SMs do protótipo, uma ou mais por etapa do fluxo, com as
 * datas relativas ao TODAY do ambiente (o "hoje" do protótipo era 29/09/2026).
 */
import type { Fixture } from "@brucesantos/design-space";
import {
  ORDER, blankSm, dateBR, dateISO, daysFromToday, fmt, prioOf, PRIO, routeText, scoreOf,
  type HistoryEntry, type Role, type Sm, type SmFile, type SmRequired,
} from "./model.js";

export type SmNotification = { id: string; at: string; forRole: Role; smId: string; title: string; text: string; read: boolean };

export type SmFixture = { sms: Sm[]; notifications: SmNotification[] };

const PMO = "Manoel Alberto";
const TECH = "Diego Martins";

/** Carimbo `dd/mm/aaaa hh:mm` a `days` dias de TODAY. */
const at = (days: number, time: string) => `${dateBR(days)} ${time}`;

const file = (name: string, size: number): SmFile => ({ id: `seed_${name}`, name, size });

type Seed = Partial<Sm> & Pick<Sm, SmRequired>;

const sm = (seed: Seed): Sm => ({ ...blankSm(), ...seed });

const BASE: Seed[] = [
  {
    id: "SM-001", createdAt: at(-25, "09:12"), requester: "Fernanda Rocha", area: "Faturamento", unit: "Santana", title: "Guias de autorização vencidas não são sinalizadas antes do atendimento",
    need: "Saber, antes de agendar a sessão, se a guia de autorização da operadora está vencida ou sem saldo.", asIs: "O faturamento só descobre a guia vencida no fechamento do mês, quando o atendimento já foi realizado.", workaround: "Planilha paralela com a validade de cada guia, conferida manualmente toda segunda-feira.", expected: "Nenhum atendimento realizado com guia vencida e fim das glosas por esse motivo.",
    audience: "Múltiplas unidades", frequency: "Diariamente", impactType: "Impacto financeiro / glosa", consequence: "Glosas recorrentes e perda de receita.", contact: "fernanda.rocha@bloomy.com.br",
    status: "concluida", rootCause: "A agenda não consulta a validade da guia vinculada ao paciente no momento do agendamento.", macro: "Faturamento / Contas Médicas", type: "Alteração de funcionalidade", effort: "M", eligibility: "elegivel",
    scores: { impact: 5, risk: 4, urgency: 4, reach: 4, alignment: 3 }, meetingDate: dateISO(-20), participants: ["Solicitante", "Áreas de interface", "Tech"],
    rules: "RN-01 — Guias com validade inferior a 7 dias exibem alerta.\nRN-02 — Guia vencida bloqueia a confirmação do agendamento.", reqs: "RF-01 — Exibir validade da guia no agendamento.\nRF-02 — Relatório semanal de guias a vencer por unidade.",
    routes: ["dev"], homologTech: true, homologReq: true, homologatedBy: "Diego Martins e Fernanda Rocha", homologatedAt: dateBR(-5), gainType: "Redução de glosas", gainHours: "32", gainDesc: "Eliminou a conferência manual semanal e zerou glosas por guia vencida no mês.", closedAt: dateBR(-4), votes: 14,
    files: [file("glosas-agosto-santana.xlsx", 48200), file("print-agendamento-guia-vencida.png", 312000)],
  },
  {
    id: "SM-002", createdAt: at(-24, "14:30"), requester: "Carla Mendes", area: "Recepção", unit: "Santana", title: "Abertura da recepção sem roteiro padrão entre turnos",
    need: "Ter um roteiro único de abertura e troca de turno da recepção.", asIs: "Cada recepcionista abre a unidade de um jeito; itens como a conferência da lista de presença ficam esquecidos.", workaround: "Lembretes no grupo de mensagens da equipe.", expected: "Todas as aberturas seguem o mesmo padrão, sem esquecimentos.",
    audience: "Minha equipe de trabalho", frequency: "Diariamente", impactType: "Erro operacional", consequence: "Falhas na lista de presença e atrasos no check-in.", contact: "carla.mendes@bloomy.com.br",
    status: "concluida", rootCause: "Ausência de POP de abertura e passagem de turno.", macro: "Atendimento / Recepção", type: "Melhoria de processo", effort: "PP", eligibility: "elegivel",
    scores: { impact: 3, risk: 3, urgency: 2, reach: 3, alignment: 2 }, meetingDate: dateISO(-19), participants: ["Solicitante", "Áreas de interface"],
    rules: "RN-01 — Checklist de abertura obrigatório até 07:30.", routes: ["processo"], procFlow: true, procPop: true, procTraining: true, subpath: "sem",
    gainType: "Horas economizadas", gainHours: "6", gainDesc: "POP publicado e treinamento aplicado nas cinco unidades, sem demanda para TI.", closedAt: dateBR(-10), votes: 8,
  },
  {
    id: "SM-003", createdAt: at(-21, "10:05"), requester: "Juliana Prado", area: "Assistencial / Clínico", unit: "Tatuapé", title: "Alerta de vencimento de laudo exigido pelas operadoras",
    need: "Ser avisada quando o laudo médico exigido pela operadora estiver perto de vencer.", asIs: "Operadoras suspendem a autorização quando o laudo vence e a clínica só percebe na negativa.", workaround: "Controle em papel na sala da coordenação.", expected: "Renovação do laudo antes do vencimento, sem interrupção de terapia.",
    audience: "Múltiplas unidades", frequency: "Semanalmente", impactType: "Risco assistencial / paciente", hasDeadline: "Sim", deadline: `Nova exigência contratual a partir de ${dateBR(33)}`, consequence: "Suspensão de autorizações e interrupção de terapias.",
    status: "execucao", rootCause: "O cadastro não registra a validade do laudo exigido em contrato.", macro: "Credenciamento", type: "Nova funcionalidade", effort: "M", eligibility: "elegivel", dependency: "Outro desenvolvimento",
    scores: { impact: 4, risk: 4, urgency: 4, reach: 3, alignment: 3 }, p0: true, p0Reason: "Obrigação regulatória / legal (ANS, CFM, LGPD)", p0Just: `Cláusula contratual com vigência em ${dateBR(33)}.`,
    meetingDate: dateISO(-14), participants: ["Solicitante", "Áreas de interface", "Tech"], rules: "RN-01 — Alerta 30 dias antes do vencimento.\nRN-02 — Coordenação recebe resumo semanal.", reqs: "RF-01 — Campo de validade no laudo.\nRF-02 — Notificação ao coordenador da unidade.", routes: ["dev"], votes: 11,
    files: [file("clausula-contratual-laudos.pdf", 184000)],
  },
  {
    id: "SM-004", createdAt: at(-19, "16:48"), requester: "Marcos Lima", area: "Operações", unit: "Campinas", title: "Relatório de faltas por operadora",
    need: "Visualizar a taxa de faltas por operadora e por período.", asIs: "Os dados existem na lista de presença, mas não há consolidado.", workaround: "Exportação mensal para planilha e tabela dinâmica.", expected: "Relatório pronto para a reunião mensal com operadoras.",
    audience: "Uma área inteira", frequency: "Semanalmente", impactType: "Falta de informação / indicador", consequence: "Negociação com operadoras sem dados.",
    status: "backlog", rootCause: "Falta de indicador consolidado de absenteísmo por operadora.", macro: "Atendimento / Recepção", type: "Relatório / Indicador", effort: "P", eligibility: "elegivel",
    scores: { impact: 3, risk: 3, urgency: 2, reach: 3, alignment: 4 }, votes: 6,
  },
  {
    id: "SM-005", createdAt: at(-18, "08:20"), requester: "Paula Siqueira", area: "Suprimentos / Farmácia", unit: "Itu", title: "Controle de estoque de materiais terapêuticos",
    need: "Saber quantos materiais terapêuticos cada sala tem e quando repor.", asIs: "Pedidos de reposição chegam por mensagem e sem histórico.", workaround: "Caderno de requisições na recepção.", expected: "Reposição planejada e sem falta de material em sessão.",
    audience: "Uma unidade inteira", frequency: "Semanalmente", impactType: "Dificuldade de controle / compliance", consequence: "Sessões adaptadas por falta de material.",
    status: "cenarios", rootCause: "Não existe fluxo formal de requisição e inventário por sala.", macro: "Suprimentos / Farmácia", type: "Melhoria de processo", effort: "P", eligibility: "elegivel",
    scores: { impact: 3, risk: 3, urgency: 3, reach: 3, alignment: 3 }, meetingDate: dateISO(-7), participants: ["Solicitante", "Áreas de interface"],
    rules: "RN-01 — Requisição semanal por sala até quinta-feira.\nRN-02 — Inventário mensal pela coordenação.", votes: 4,
  },
  {
    id: "SM-006", createdAt: at(-17, "11:02"), requester: "Renata Pires", area: "Comercial", unit: "Salto", title: "Lembrete automático de sessão para responsáveis",
    need: "Responsáveis serem lembrados da sessão no dia anterior.", asIs: "A recepção liga ou manda mensagem manualmente para cada família.", workaround: "Lista impressa de ligações do dia seguinte.", expected: "Menos faltas e recepção livre para o atendimento presencial.",
    audience: "Pacientes / Clientes externos", frequency: "Diariamente", impactType: "Retrabalho manual", consequence: "Faltas e horários ociosos.",
    status: "homologacao", rootCause: "A integração de WhatsApp não usa os dados da agenda para lembretes.", macro: "Atendimento / Recepção", type: "Integração entre sistemas", effort: "G", eligibility: "elegivel",
    scores: { impact: 4, risk: 3, urgency: 3, reach: 5, alignment: 4 }, meetingDate: dateISO(-15), participants: ["Solicitante", "Áreas de interface", "Tech"],
    rules: "RN-01 — Lembrete às 18h do dia anterior.\nRN-02 — Resposta \"não vou\" libera o horário.", reqs: "RF-01 — Disparo pela integração de WhatsApp.\nRF-02 — Registro da resposta no agendamento.", routes: ["processo", "dev"], procFlow: true, procPop: true, subpath: "com", homologTech: true, homologatedBy: TECH, votes: 19,
    files: [file("lista-ligacoes-recepcao.jpg", 540000)],
    comments: [{ at: at(-2, "09:30"), who: TECH, text: "Liberado em produção para Salto. Segue vídeo do disparo para validação.", files: [file("demo-lembrete-whatsapp.mp4", 9600000)] }],
  },
  {
    id: "SM-007", createdAt: at(-14, "13:15"), requester: "Tiago Nunes", area: "Financeiro", unit: "Corporativo", title: "Não encontro a exportação do fechamento",
    need: "Exportar o fechamento mensal em planilha.", asIs: "Não localizei a opção de exportação.", workaround: "Copio os valores da tela para uma planilha.", expected: "Exportar em um clique.",
    audience: "Eu / Minha atividade individual", frequency: "Eventualmente (raro)", impactType: "Perda de tempo / lentidão", consequence: "Atraso no relatório mensal.",
    status: "rejeitada", rootCause: "A funcionalidade já existe em Fechamentos > Exportar.", macro: "Financeiro / Controladoria", type: "Outro", effort: "PP", eligibility: "inelegivel", rejectCriterion: "Dúvida operacional simples",
    rejection: "A exportação já existe em Fechamentos > Exportar. Material de treinamento enviado ao solicitante.",
  },
  {
    id: "SM-008", createdAt: at(-10, "09:40"), requester: "Beatriz Nogueira", area: "Recepção", unit: "Tatuapé", title: "Reagendamento em lote após bloqueio de sala",
    need: "Reagendar de uma vez todos os atendimentos de uma sala bloqueada.", asIs: "Cada atendimento precisa ser reagendado individualmente.", workaround: "Lista em papel com os atendimentos afetados.", expected: "Reagendar tudo em poucos minutos.",
    audience: "Uma unidade inteira", frequency: "Semanalmente", impactType: "Retrabalho manual", consequence: "Horas de retrabalho a cada bloqueio.",
    status: "triagem", rootCause: "Bloqueio de sala não oferece ação sobre os agendamentos impactados.", macro: "Atendimento / Recepção", type: "Nova funcionalidade", votes: 9,
    files: [file("gravacao-reagendamento-manual.mov", 18400000), file("print-bloqueio-sala-3.png", 268000)],
    comments: [
      { at: at(-7, "10:15"), who: PMO, text: "Beatriz, quantos bloqueios de sala acontecem por semana em média na unidade?" },
      { at: at(-7, "14:02"), who: "Beatriz Nogueira", text: "Entre dois e três, geralmente por manutenção ou falta de profissional. Segue a planilha do mês.", files: [file("bloqueios-setembro.xlsx", 22000)] },
    ],
  },
  {
    id: "SM-009", createdAt: at(-6, "15:22"), requester: "Carla Mendes", area: "Recepção", unit: "Santana", title: "Cadastro de novo convênio exige três telas",
    need: "Cadastrar o convênio do paciente em um único passo.", asIs: "É preciso passar por operadora, plano e carteirinha em telas diferentes.", workaround: "Anoto os dados num papel e cadastro depois do atendimento.", expected: "Cadastro rápido no momento do check-in.",
    audience: "Minha equipe de trabalho", frequency: "Diariamente", impactType: "Perda de tempo / lentidão", consequence: "Fila na recepção em horário de pico.", contact: "carla.mendes@bloomy.com.br",
    status: "triagem", votes: 5,
    files: [file("telas-cadastro-convenio.png", 402000)],
  },
  {
    id: "SM-010", createdAt: at(-3, "10:10"), requester: "Aline Dias", area: "Assistencial / Clínico", unit: "Campinas", title: "Assinatura do responsável ao fim do atendimento",
    need: "Coletar a assinatura do responsável confirmando o atendimento.", asIs: "A assinatura é coletada em papel e digitalizada no fim do mês.", workaround: "Folhas assinadas escaneadas e arquivadas em pasta de rede.", expected: "Comprovação digital do atendimento para as operadoras.",
    audience: "Múltiplas unidades", frequency: "Várias vezes ao dia", impactType: "Impacto financeiro / glosa", consequence: "Glosas por falta de comprovação.",
    status: "triagem", votes: 12,
    files: [file("folha-assinaturas-modelo.pdf", 96000)],
  },
  {
    id: "SM-011", createdAt: at(-13, "17:35"), requester: "Camila Duarte", area: "Assistencial / Clínico", unit: "Itu", title: "Horas de supervisão sem controle por profissional",
    need: "Acompanhar as horas de supervisão realizadas por profissional.", asIs: "As horas são somadas manualmente a partir da agenda.", workaround: "Planilha mensal preenchida pela coordenação.", expected: "Visão mensal das horas de supervisão.",
    audience: "Uma área inteira", frequency: "Semanalmente", impactType: "Falta de informação / indicador", consequence: "Descumprimento da carga mínima de supervisão.",
    status: "modelagem", rootCause: "Não há rotina definida de registro das supervisões.", macro: "Gestão de Pessoas (RH)", type: "Melhoria de processo", effort: "P", eligibility: "elegivel",
    scores: { impact: 3, risk: 3, urgency: 1, reach: 2, alignment: 3 }, meetingDate: dateISO(-5), participants: ["Solicitante", "Áreas de interface"], rules: "RN-01 — Toda supervisão registrada na agenda com o tipo \"Supervisão\".", routes: ["processo"], procFlow: true, votes: 3,
  },
  {
    id: "SM-012", createdAt: at(-12, "12:00"), requester: "Rafael Tavares", area: "Operações", unit: "Salto", title: "Coordenação editar bloqueios de agenda",
    need: "Coordenadores ajustarem bloqueios sem abrir chamado.", asIs: "Somente administradores editam bloqueios.", workaround: "Pedido por mensagem ao administrador da unidade.", expected: "Ajustes feitos pela própria coordenação.",
    audience: "Minha equipe de trabalho", frequency: "Eventualmente (raro)", impactType: "Perda de tempo / lentidão", consequence: "Atraso em ajustes de agenda.",
    status: "priorizacao", rootCause: "Perfil de coordenação sem permissão de edição de bloqueios.", macro: "Atendimento / Recepção", type: "Acesso / Permissão", effort: "PP", eligibility: "elegivel",
    scores: { impact: 3, risk: 3, urgency: 1, reach: 1, alignment: 1 }, votes: 2,
  },
  {
    id: "SM-013", createdAt: at(-20, "11:45"), requester: "Luana Freitas", area: "People (RH)", unit: "Corporativo", title: "Onboarding de aplicadores sem trilha padrão",
    need: "Ter uma trilha padrão de integração para novos aplicadores.", asIs: "Cada unidade integra do seu jeito e o tempo até o primeiro atendimento varia muito.", workaround: "Documentos soltos enviados por e-mail.", expected: "Aplicador pronto para atender na primeira semana.",
    audience: "Múltiplas unidades", frequency: "Semanalmente", impactType: "Retrabalho manual", consequence: "Atraso na alocação de novos profissionais.",
    status: "encerramento", rootCause: "Ausência de processo e material padronizado de integração.", macro: "Gestão de Pessoas (RH)", type: "Melhoria de processo", effort: "P", eligibility: "elegivel",
    scores: { impact: 3, risk: 3, urgency: 3, reach: 4, alignment: 4 }, meetingDate: dateISO(-13), participants: ["Solicitante", "Áreas de interface"], rules: "RN-01 — Integração em 5 dias com checklist assinado.", routes: ["processo"], procFlow: true, procPop: true, procTraining: true, subpath: "sem", votes: 7,
  },
];

/** O histórico que a SM teria acumulado até a etapa em que está, como o `seed()` do protótipo. */
function historyOf(s: Sm): HistoryEntry[] {
  const h: HistoryEntry[] = [{ at: s.createdAt, who: s.requester, kind: "recebida", text: "Solicitação registrada na base de SMs. PMO notificado." }];
  const add = (kind: HistoryEntry["kind"], who: string, text: string) => h.push({ at: "", who, kind, text });
  const i = ORDER.indexOf(s.status as (typeof ORDER)[number]);
  if (s.status === "rejeitada") add("rejeitada", PMO, "Demanda inelegível. Solicitante notificado com motivo de recusa.");
  else {
    if (i >= 1) add("priorizacao", PMO, "Triagem preliminar concluída. Demanda elegível para avaliação.");
    if (i >= 2) add("backlog", PMO, `Aprovada para o backlog com ${PRIO[prioOf(s)!].full} (${fmt(scoreOf(s))} pts). KPIs recalculados.`);
    if (i >= 3) add("cenarios", PMO, `Reunião de desenho de cenários realizada com ${s.participants.join(", ")}.`);
    if (i >= 4) add(s.routes.includes("processo") ? "modelagem" : "execucao", PMO, `Demanda direcionada: ${routeText(s.routes)}.`);
    if (i >= 5 && s.routes.includes("processo"))
      add(s.subpath === "sem" ? "encerramento" : "execucao", PMO, s.subpath === "sem" ? "Processo implementado sem desenvolvimento." : "Processo implementado com desenvolvimento. Encaminhado à Tech.");
    if (i >= 6 && s.subpath !== "sem") add("homologacao", TECH, "Funcionalidade implementada em homologação.");
    if (i >= 7 && s.subpath !== "sem") {
      add("homologacao", TECH, "Entrega validada pela Tech em produção.");
      add("encerramento", s.requester, "Aceite do solicitante registrado. Entrega homologada.");
    }
    if (i >= 8) add("concluida", PMO, "Status atualizado e ganhos registrados. Ciclo de SM encerrado.");
  }
  // Um evento a cada dia e meio depois da abertura, até a véspera de hoje.
  const d0 = daysFromToday(s.createdAt);
  h.forEach((x, j) => {
    if (j === 0) return;
    const days = Math.min(Math.floor(d0 + j * 1.5), -1);
    x.at = at(days, `${String(9 + j).padStart(2, "0")}:30`);
  });
  return h;
}

/** Evidências anexadas na etapa de modelagem. */
const EVIDENCE: Record<string, HistoryEntry> = {
  "SM-013": { at: at(-9, "15:10"), who: PMO, kind: "modelagem", text: "Anexou evidência da etapa Modelar processo, POP e treinamento.", files: [file("POP-integracao-aplicadores-v1.pdf", 210000), file("fluxo-onboarding-aris.png", 350000)] },
  "SM-002": { at: at(-14, "11:00"), who: PMO, kind: "modelagem", text: "Anexou evidência da etapa Modelar processo, POP e treinamento.", files: [file("POP-abertura-recepcao.pdf", 150000)] },
};

export const SMS: Sm[] = BASE.map((seed) => {
  const s = sm(seed);
  const extra = EVIDENCE[s.id];
  return { ...s, history: extra ? [...historyOf(s), extra] : historyOf(s) };
});

export const NOTIFICATIONS: SmNotification[] = [
  { id: "n1", at: at(-3, "10:11"), forRole: "pmo", smId: "SM-010", title: "Nova solicitação registrada", text: "Aline Dias · Assinatura do responsável ao fim do atendimento", read: false },
  { id: "n2", at: at(-6, "15:23"), forRole: "pmo", smId: "SM-009", title: "Nova solicitação registrada", text: "Carla Mendes · Cadastro de novo convênio exige três telas", read: false },
  { id: "n3", at: at(-2, "09:31"), forRole: "solicitante", smId: "SM-006", title: "Aceite pendente", text: "A Tech validou a entrega em produção. Confirme o aceite.", read: false },
  { id: "n4", at: at(-7, "10:16"), forRole: "solicitante", smId: "SM-008", title: "PMO pediu esclarecimento", text: "Responda nos comentários da SM-008.", read: true },
  { id: "n5", at: at(-4, "14:00"), forRole: "tech", smId: "SM-003", title: "Demanda P0 na fila de desenvolvimento", text: "Alerta de vencimento de laudo exigido pelas operadoras", read: false },
];

export const SM_FIXTURES: Fixture[] = [
  {
    id: "sm.base",
    label: "Treze SMs em todas as etapas",
    description: "Uma ou mais SMs por etapa do fluxo, uma recusada na triagem e uma P0 por exigência contratual; notificações para PMO, solicitante e Tech.",
    data: (): SmFixture => ({ sms: SMS, notifications: NOTIFICATIONS }),
  },
  {
    id: "sm.empty",
    label: "Sem solicitações",
    description: "A base de SMs ainda está vazia.",
    data: (): SmFixture => ({ sms: [], notifications: [] }),
  },
];
