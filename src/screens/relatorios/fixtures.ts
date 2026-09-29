/**
 * Relatórios do paciente — dados sintéticos e determinísticos.
 *
 * O paciente é o do protótipo (Lucas Almeida Ferreira), com as solicitações de
 * `REL_SEED` que são dele e a rotina de `RR_SEED`. Hoje é 16/07/2026. Nomes e
 * documentos são fictícios.
 *
 * `makeReportsFixture` monta variações: outras telas podem acrescentar
 * relatórios (`reports`), abrir direto uma view (`initialView`) ou um modal
 * (`initialModal`).
 */
import type { Fixture } from "@brucesantos/design-space";
import type { PatientHeader } from "../../layouts/PatientLayout.js";
import type { ListFilters, PatientRef, ProtocolApplication, Report, RoutineState } from "./model.js";
import type { ReportsModal, ReportsView } from "./store.js";

export type ReportsPatient = PatientRef & {
  /** Operadora de onde vêm as regras herdadas da rotina. */
  operator: string;
  header: PatientHeader;
};

export type ReportsFixture = {
  patient: ReportsPatient;
  reports: Report[];
  routine: RoutineState;
  initialView?: ReportsView;
  initialModal?: ReportsModal;
  initialFilters?: Partial<ListFilters>;
};

export const LUCAS: ReportsPatient = {
  id: "pt1",
  name: "Lucas Almeida Ferreira",
  age: 8,
  operator: "Unimed",
  header: {
    name: "Lucas Almeida Ferreira",
    status: "Ativo",
    supportLevel: 2,
    restrictions: true,
    age: 8,
    unitName: "Santana",
    missedCancelledCount: 2,
    activeWeeklyHours: 24,
    observation: "Paciente sensível a sons altos.",
  },
};

const PT: PatientRef = { id: "pt1", name: "Lucas Almeida Ferreira", age: 8 };
const HELENA = { id: "s2", name: "Helena Martins Costa", specialty: "Psicologia" };
const FABIO = { id: "s4", name: "Fábio Stoll Pereira", specialty: "Fonoaudiologia" };
const MARCUS = "Marcus Vinícius Gimenes";

/** As solicitações do Lucas em `REL_SEED`, na ordem do protótipo. */
export function seedReports(): Report[] {
  return [
    {
      id: "r-111", patient: PT, typeId: "protocolo", period: "1º Semestre 2026", protocolAppId: "pa1",
      requester: "Equipe", requestedBy: MARCUS, requestedAt: "23/06/2026", due: "10/07/2026", prof: HELENA,
      status: "solicitado", hasDraft: false, updatedAt: "23/06/2026 09:40",
      obs: "Relatório da reavaliação do VB-MAPP concluída em 22/06.", extra: "", support: [], finalDoc: null, cancelReason: "",
      history: [{ at: "23/06/2026 09:40", who: "Marcus V. Gimenes", text: "Solicitação criada e atribuída a Helena Martins Costa", icon: "fa-inbox" }],
    },
    {
      id: "r-103", patient: PT, typeId: "alta", period: "Julho 2026",
      requester: "Família", requestedBy: MARCUS, requestedAt: "12/07/2026", due: "30/07/2026", prof: HELENA,
      status: "solicitado", hasDraft: false, updatedAt: "12/07/2026 08:15",
      obs: "Família solicitou relatório de alta para transição escolar.",
      extra: "Encaminhar cópia também para a coordenação pedagógica da escola.",
      support: [], finalDoc: null, cancelReason: "",
      history: [{ at: "12/07/2026 08:15", who: "Marcus V. Gimenes", text: "Solicitação criada", icon: "fa-inbox" }],
    },
    {
      id: "r-105", patient: PT, typeId: "evolucao_mensal", period: "Junho 2026",
      requester: "Operadora", requestedBy: MARCUS, requestedAt: "28/06/2026", due: "05/07/2026", prof: HELENA,
      status: "assinaturas", hasDraft: false, updatedAt: "15/07/2026 18:20",
      coauthors: [FABIO], signatures: { s2: "15/07/2026 18:20" },
      obs: "Evolução mensal de junho para a operadora.", extra: "",
      support: [{ name: "grafico-metas-junho.png", kind: "Imagem", size: "310 KB", at: "28/06/2026", by: "Marcus V. Gimenes" }],
      finalDoc: null, cancelReason: "",
      draft: { updatedAt: "09/07/2026 14:02", by: "Helena Martins Costa" },
      history: [
        { at: "28/06/2026 09:00", who: "Marcus V. Gimenes", text: "Solicitação criada", icon: "fa-inbox" },
        { at: "01/07/2026 10:20", who: "Helena Martins Costa", text: "Relatório iniciado", icon: "fa-play" },
        { at: "09/07/2026 14:02", who: "Helena Martins Costa", text: "Rascunho salvo", icon: "fa-floppy-disk" },
        { at: "10/07/2026 08:30", who: "Marcus V. Gimenes", text: "Fábio Stoll Pereira adicionado(a) como coautor(a)", icon: "fa-user-plus" },
        { at: "14/07/2026 16:05", who: "Fábio Stoll Pereira", text: "Rascunho salvo", icon: "fa-floppy-disk" },
        { at: "15/07/2026 18:10", who: "Helena Martins Costa", text: "Enviado para assinaturas de 2 autores", icon: "fa-signature" },
        { at: "15/07/2026 18:20", who: "Helena Martins Costa", text: "Assinado por Helena Martins Costa", icon: "fa-signature" },
      ],
    },
    {
      id: "r-120", patient: PT, typeId: "evolucao_mensal", period: "Maio 2026",
      requester: "Operadora", requestedBy: MARCUS, requestedAt: "28/05/2026", due: "10/06/2026", prof: HELENA,
      status: "finalizado", hasDraft: false, updatedAt: "06/06/2026 16:00", obs: "", extra: "", support: [],
      finalDoc: { name: "evolucao-lucas-mai2026.pdf", size: "1,1 MB", at: "06/06/2026" }, cancelReason: "",
      share: {
        sharedAt: "06/06/2026 17:00", sharedBy: MARCUS, revokedAt: null, note: "",
        recipients: [{ id: "g1", name: "Patrícia Almeida Ferreira", relation: "Mãe", viewedAt: "06/06/2026 20:14", viewCount: 2 }],
      },
      history: [
        { at: "28/05/2026 09:00", who: "Marcus V. Gimenes", text: "Solicitação criada", icon: "fa-inbox" },
        { at: "06/06/2026 16:00", who: "Helena Martins Costa", text: "Relatório finalizado", icon: "fa-circle-check" },
      ],
    },
    {
      id: "r-121", patient: PT, typeId: "evolucao_mensal", period: "Abril 2026",
      requester: "Operadora", requestedBy: MARCUS, requestedAt: "28/04/2026", due: "10/05/2026", prof: HELENA,
      status: "finalizado", hasDraft: false, updatedAt: "09/05/2026 16:00", obs: "", extra: "", support: [],
      finalDoc: { name: "evolucao-lucas-abr2026.pdf", size: "1,1 MB", at: "09/05/2026" }, cancelReason: "",
      share: {
        sharedAt: "09/05/2026 17:00", sharedBy: MARCUS, revokedAt: null, note: "",
        recipients: [{ id: "g1", name: "Patrícia Almeida Ferreira", relation: "Mãe", viewedAt: null, viewCount: 0 }],
      },
      history: [
        { at: "28/04/2026 09:00", who: "Marcus V. Gimenes", text: "Solicitação criada", icon: "fa-inbox" },
        { at: "09/05/2026 16:00", who: "Helena Martins Costa", text: "Relatório finalizado", icon: "fa-circle-check" },
      ],
    },
    {
      id: "r-122", patient: PT, typeId: "trimestral", period: "1º Tri 2026",
      coauthors: [FABIO], signatures: { s2: "17/04/2026 15:40", s4: "17/04/2026 16:00" },
      requester: "Operadora", requestedBy: MARCUS, requestedAt: "01/04/2026", due: "20/04/2026", prof: HELENA,
      status: "finalizado", hasDraft: false, updatedAt: "17/04/2026 16:00", obs: "", extra: "", support: [],
      finalDoc: { name: "trimestral-lucas-1tri2026.pdf", size: "1,1 MB", at: "17/04/2026" }, cancelReason: "",
      share: {
        sharedAt: "17/04/2026 17:00", sharedBy: MARCUS, revokedAt: null, note: "",
        recipients: [{ id: "g1", name: "Patrícia Almeida Ferreira", relation: "Mãe", viewedAt: "17/04/2026 20:14", viewCount: 2 }],
      },
      history: [
        { at: "01/04/2026 09:00", who: "Marcus V. Gimenes", text: "Solicitação criada", icon: "fa-inbox" },
        { at: "17/04/2026 16:00", who: "Helena Martins Costa", text: "Relatório finalizado", icon: "fa-circle-check" },
      ],
    },
    {
      id: "r-123", patient: PT, typeId: "avaliacao", period: "Fonoaudiologia",
      requester: "Equipe", requestedBy: MARCUS, requestedAt: "03/03/2026", due: "20/03/2026", prof: FABIO,
      status: "finalizado", hasDraft: false, updatedAt: "18/03/2026 16:00", obs: "", extra: "", support: [],
      finalDoc: { name: "avaliacao-fono-lucas.pdf", size: "1,1 MB", at: "18/03/2026" }, cancelReason: "",
      history: [
        { at: "03/03/2026 09:00", who: "Marcus V. Gimenes", text: "Solicitação criada", icon: "fa-inbox" },
        { at: "18/03/2026 16:00", who: "Helena Martins Costa", text: "Relatório finalizado", icon: "fa-circle-check" },
      ],
    },
    {
      id: "r-124", patient: PT, typeId: "admissao", period: "Admissão",
      requester: "Equipe", requestedBy: MARCUS, requestedAt: "04/09/2025", due: "20/09/2025", prof: HELENA,
      status: "finalizado", hasDraft: false, updatedAt: "15/09/2025 16:00", obs: "", extra: "", support: [],
      finalDoc: { name: "admissao-lucas-2025.pdf", size: "1,1 MB", at: "15/09/2025" }, cancelReason: "",
      history: [
        { at: "04/09/2025 09:00", who: "Marcus V. Gimenes", text: "Solicitação criada", icon: "fa-inbox" },
        { at: "15/09/2025 16:00", who: "Helena Martins Costa", text: "Relatório finalizado", icon: "fa-circle-check" },
      ],
    },
    {
      id: "r-125", patient: PT, typeId: "outro", customName: "Relatório para a escola", period: "Março 2026",
      requester: "Família", requestedBy: MARCUS, requestedAt: "10/03/2026", due: "25/03/2026", prof: HELENA,
      status: "cancelado", hasDraft: false, updatedAt: "14/03/2026 10:20", obs: "", extra: "", support: [], finalDoc: null,
      cancelReason: "Família informou que a escola dispensou o relatório.",
      history: [
        { at: "10/03/2026 09:00", who: "Marcus V. Gimenes", text: "Solicitação criada", icon: "fa-inbox" },
        { at: "14/03/2026 10:20", who: "Marcus V. Gimenes", text: "Solicitação cancelada", icon: "fa-ban" },
      ],
    },
  ];
}

/** Aplicações de protocolo finalizadas (fonte do Relatório de Protocolo). */
export const PROTOCOL_APPS: ProtocolApplication[] = [
  {
    id: "pa1", protocol: "VB-MAPP", instrument: "Avaliação de Marcos", patientName: "Lucas Almeida Ferreira",
    appliedAt: "18/06/2026", finishedAt: "22/06/2026", by: { name: "Helena Martins Costa", specialty: "Psicologia" },
    previousAt: "12/01/2026",
    cells: {
      mand: [5, 3, 0], tact: [5, 2, 0], listener: [5, 3, 0], vpmts: [5, 4, 1],
      play: [5, 3, 0], social: [4, 2, 0], imitation: [5, 3, null], echoic: [4, 2, null],
      vocal: [3, null, null], lrffc: [null, 2, 0], intraverbal: [null, 1, 0],
      group: [null, 2, 0], linguistic: [null, 3, 1], reading: [null, null, 0],
      writing: [null, null, 0], math: [null, null, 0],
    },
    previous: {
      mand: [4, 1, 0], tact: [3, 0, 0], listener: [4, 1, 0], vpmts: [5, 2, 0],
      play: [4, 1, 0], social: [3, 0, 0], imitation: [4, 1, null], echoic: [3, 0, null],
      vocal: [2, null, null], lrffc: [null, 0, 0], intraverbal: [null, 0, 0],
      group: [null, 0, 0], linguistic: [null, 1, 0], reading: [null, null, 0],
      writing: [null, null, 0], math: [null, null, 0],
    },
  },
];
export const protoAppsFor = (patientName: string) => PROTOCOL_APPS.filter((a) => a.patientName === patientName);
export const protoApp = (id: string | null | undefined) => PROTOCOL_APPS.find((a) => a.id === id) ?? null;

/** `RR_SEED`: duas regras da Unimed e uma regra própria do Lucas. */
export function seedRoutine(): RoutineState {
  return {
    operators: {
      Unimed: [
        { id: "op-1", typeId: "evolucao_mensal", freq: "mensal", dueMode: "day_next", dueValue: 10, requester: "Operadora", profId: "", start: "2025-01", end: "", action: "notify", autoDays: 10 },
        { id: "op-2", typeId: "trimestral", freq: "trimestral", dueMode: "day_next", dueValue: 20, requester: "Operadora", profId: "", start: "2025-01", end: "", action: "auto", autoDays: 15 },
      ],
    },
    patients: {
      pt1: {
        paused: {},
        own: [
          { id: "pr-1", typeId: "outro", customName: "Relatório para a escola", freq: "semestral", dueMode: "days_after", dueValue: 15, requester: "Família", profId: "s2", start: "2026-01", end: "2026-12", action: "notify", autoDays: 10 },
        ],
      },
    },
  };
}

export function makeReportsFixture(overrides: Partial<ReportsFixture> = {}): ReportsFixture {
  return { patient: LUCAS, reports: seedReports(), routine: seedRoutine(), ...overrides };
}

/**
 * Estados extras de compartilhamento: o trimestral (r-122) enviado ao pai e à
 * mãe, com mensagem, lido só pela mãe; a evolução de abril (r-121) com acesso
 * revogado.
 */
function sharedReports(): Report[] {
  return seedReports().map((r) => {
    if (r.id === "r-122" && r.share) {
      return {
        ...r,
        share: {
          ...r.share,
          note: "Relatório do 1º trimestre. Qualquer dúvida, falem com a Helena na próxima sessão.",
          recipients: [
            ...r.share.recipients,
            { id: "g2", name: "Rogério Ferreira Pinto", relation: "Pai", viewedAt: null, viewCount: 0 },
          ],
        },
      };
    }
    if (r.id === "r-121" && r.share) return { ...r, share: { ...r.share, revokedAt: "12/05/2026 10:30" } };
    return r;
  });
}

/**
 * A alta de julho (r-103) já em produção: rascunho salvo pela Helena com 1 de 3
 * seções preenchidas e o Fábio como coautor.
 */
function inProgressReports(): Report[] {
  return seedReports().map((r) =>
    r.id === "r-103"
      ? {
          ...r,
          status: "em_andamento",
          hasDraft: true,
          updatedAt: "15/07/2026 17:40",
          coauthors: [FABIO],
          draft: { updatedAt: "15/07/2026 17:40", by: "Helena Martins Costa" },
          draftContent: {
            trajetoria: "Lucas foi acompanhado de setembro de 2025 a julho de 2026, com 24 horas semanais de intervenção ABA e evolução consistente em comunicação e autonomia.",
          },
          history: [
            ...r.history,
            { at: "13/07/2026 10:05", who: "Helena Martins Costa", text: "Relatório iniciado", icon: "fa-play" },
            { at: "14/07/2026 09:30", who: "Marcus V. Gimenes", text: "Fábio Stoll Pereira adicionado(a) como coautor(a)", icon: "fa-user-plus" },
            { at: "15/07/2026 17:40", who: "Helena Martins Costa", text: "Rascunho salvo", icon: "fa-floppy-disk" },
          ],
        }
      : r,
  );
}

/** Sem solicitações e sem rotina (operadora sem regras). */
const EMPTY_ROUTINE: RoutineState = { operators: { Unimed: [] }, patients: { pt1: { paused: {}, own: [] } } };

export const REPORTS_FIXTURES: Fixture<ReportsFixture>[] = [
  {
    id: "reports.lucas",
    label: "Lucas · relatórios do protótipo",
    description: "3 em atraso (1 aguardando assinatura, 1 solicitado, 1 previsto), previstos da rotina, 5 emitidos e 1 cancelado.",
    data: () => makeReportsFixture(),
  },
  {
    id: "reports.lucas-late",
    label: "Lucas · filtro Em atraso",
    description: "O mesmo prontuário com o Status em \"Em atraso\".",
    data: () => makeReportsFixture({ initialFilters: { late: true } }),
  },
  {
    id: "reports.lucas-no-match",
    label: "Lucas · busca sem resultado",
    description: "A busca não encontra nenhum relatório.",
    data: () => makeReportsFixture({ initialFilters: { q: "laudo neurológico" } }),
  },
  {
    id: "reports.empty",
    label: "Lucas · sem relatórios",
    description: "Nenhuma solicitação e nenhuma regra de rotina.",
    data: () => makeReportsFixture({ reports: [], routine: EMPTY_ROUTINE }),
  },
  {
    id: "reports.new-request",
    label: "Lucas · nova solicitação aberta",
    data: () => makeReportsFixture({ initialModal: { kind: "new" } }),
  },
  {
    id: "reports.routine",
    label: "Lucas · rotina de relatórios aberta",
    data: () => makeReportsFixture({ initialModal: { kind: "routine" } }),
  },
  {
    id: "reports.reassign",
    label: "Lucas · reatribuir profissional",
    data: () => makeReportsFixture({ initialModal: { kind: "reassign", id: "r-103" } }),
  },
  {
    id: "reports.cancel",
    label: "Lucas · cancelar solicitação",
    data: () => makeReportsFixture({ initialModal: { kind: "cancel", id: "r-103" } }),
  },
  {
    id: "reports.view-requested",
    label: "Lucas · visualizar solicitado",
    description: "Alta / Desligamento solicitada, ainda não iniciada, em modo foco.",
    data: () => makeReportsFixture({ initialView: { kind: "report", id: "r-103" } }),
  },
  {
    id: "reports.view-in-progress",
    label: "Lucas · visualizar em produção",
    description: "Alta / Desligamento em produção: rascunho com 1 de 3 seções e um coautor.",
    data: () => makeReportsFixture({ reports: inProgressReports(), initialView: { kind: "report", id: "r-103" } }),
  },
  {
    id: "reports.view-signing",
    label: "Lucas · aguardando assinaturas (1 de 2)",
    description: "Evolução de junho em atraso, texto bloqueado, Helena assinou e Fábio está pendente.",
    data: () => makeReportsFixture({ initialView: { kind: "report", id: "r-105" } }),
  },
  {
    id: "reports.view-final",
    label: "Lucas · visualizar emitido",
    description: "Trimestral finalizado com 2 de 2 assinaturas e lido pela família.",
    data: () => makeReportsFixture({ initialView: { kind: "report", id: "r-122" } }),
  },
  {
    id: "reports.view-cancelled",
    label: "Lucas · visualizar cancelado",
    description: "Relatório para a escola cancelado, com o motivo.",
    data: () => makeReportsFixture({ initialView: { kind: "report", id: "r-125" } }),
  },
  {
    id: "reports.edit-request",
    label: "Lucas · editar solicitação",
    description: "Alta / Desligamento em modo foco com a gaveta Editar solicitação aberta.",
    data: () => makeReportsFixture({ initialView: { kind: "report", id: "r-103" }, initialModal: { kind: "edit", id: "r-103" } }),
  },
  {
    id: "reports.share-new",
    label: "Lucas · compartilhar com a família",
    description: "Avaliação de fonoaudiologia emitida e ainda não compartilhada, com a gaveta aberta.",
    data: () => makeReportsFixture({ initialModal: { kind: "share", id: "r-123" } }),
  },
  {
    id: "reports.share-edit",
    label: "Lucas · editar compartilhamento",
    description: "Trimestral compartilhado com mãe e pai, lido só pela mãe, com a gaveta de edição aberta.",
    data: () => makeReportsFixture({ reports: sharedReports(), initialModal: { kind: "share", id: "r-122" } }),
  },
  {
    id: "reports.share-partial",
    label: "Lucas · relatório lido em parte",
    description: "Visualização do trimestral: mãe leu, pai ainda não abriu (Lembrar), com mensagem.",
    data: () => makeReportsFixture({ reports: sharedReports(), initialView: { kind: "report", id: "r-122" } }),
  },
  {
    id: "reports.share-revoked",
    label: "Lucas · acesso revogado",
    description: "Visualização da evolução de abril com o acesso da família revogado.",
    data: () => makeReportsFixture({ reports: sharedReports(), initialView: { kind: "report", id: "r-121" } }),
  },
];
