import { describe, expect, it } from "vitest";
import type { Appointment, Claim, Patient } from "../src/contracts/index.js";
import { ageInYears, isMinor, TODAY } from "../src/contracts/index.js";
import {
  canCancel,
  canMarkNoShow,
  findConflicts,
  NO_SHOW_TOLERANCE_MINUTES,
  wouldConflict,
} from "../src/rules/agenda.js";
import { canReadRecord, canSchedule, missingRequiredFields } from "../src/rules/patients.js";
import { canResubmit, documentProgress, missingDocuments } from "../src/rules/finance.js";

/**
 * Testes das regras de negócio.
 *
 * Regra sem teste é frase que a engenharia vai reinterpretar. Estes testes são o
 * que o handoff pode citar: cada um deles é um critério de aceite executável.
 */

const professional = { id: "p-1", name: "Dra. Helena Braga", specialty: "Clínica geral" };
const at = (time: string) => `${TODAY}T${time}:00.000-03:00`;

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "ap-1",
    patient: { id: "pt-1", name: "Ana Moreira", birthDate: "1988-04-12" },
    professional,
    procedure: "Consulta",
    start: at("09:30"),
    end: at("10:00"),
    status: "scheduled",
    ...overrides,
  };
}

/* ================================================================== agenda */

describe("cancel-requires-permission", () => {
  it("bloqueia quem não tem agenda.cancel, dizendo a quem pedir", () => {
    const result = canCancel(appointment(), ["agenda.read", "agenda.reschedule"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/recepção líder/);
  });

  it("permite quem tem a permissão", () => {
    expect(canCancel(appointment(), ["agenda.cancel"]).allowed).toBe(true);
  });

  it("não cancela o que já está cancelado nem o que já foi finalizado", () => {
    expect(canCancel(appointment({ status: "cancelled" }), ["agenda.cancel"]).allowed).toBe(false);
    expect(canCancel(appointment({ status: "finished" }), ["agenda.cancel"]).allowed).toBe(false);
  });
});

describe("no-show-after-tolerance", () => {
  const permissions = ["agenda.no_show"];

  it("bloqueia antes da tolerância, informando quantos minutos faltam", () => {
    const result = canMarkNoShow(appointment(), permissions, at("09:38"));
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Faltam 7/);
  });

  it("libera exatamente na fronteira da tolerância", () => {
    expect(canMarkNoShow(appointment(), permissions, at("09:45")).allowed).toBe(true);
    expect(NO_SHOW_TOLERANCE_MINUTES).toBe(15);
  });

  it("bloqueia por permissão antes de olhar o relógio", () => {
    const result = canMarkNoShow(appointment(), ["agenda.read"], at("11:00"));
    expect(result.reason).toMatch(/não registra ausência/);
  });

  it("não transforma em ausência o que já foi finalizado", () => {
    expect(
      canMarkNoShow(appointment({ status: "finished" }), permissions, at("11:00")).allowed,
    ).toBe(false);
  });
});

describe("no-double-booking", () => {
  const confirmed = appointment({ id: "ap-a", start: at("10:00"), end: at("10:45"), status: "confirmed" });
  const overlapping = appointment({ id: "ap-b", start: at("10:15"), end: at("11:00") });
  const adjacent = appointment({ id: "ap-c", start: at("10:45"), end: at("11:15") });

  it("detecta sobreposição real entre dois atendimentos da mesma profissional", () => {
    const conflicts = findConflicts([confirmed, overlapping]);
    expect(conflicts.get("ap-a")).toEqual(["ap-b"]);
    expect(conflicts.get("ap-b")).toEqual(["ap-a"]);
  });

  it("não considera conflito horário que só encosta na borda", () => {
    expect(findConflicts([confirmed, adjacent]).size).toBe(0);
  });

  it("ignora cancelado e ausente: o horário voltou a estar livre", () => {
    const cancelled = { ...overlapping, status: "cancelled" as const };
    expect(findConflicts([confirmed, cancelled]).size).toBe(0);
    expect(findConflicts([confirmed, { ...overlapping, status: "no_show" as const }]).size).toBe(0);
  });

  it("não considera conflito entre profissionais diferentes", () => {
    const other = {
      ...overlapping,
      professional: { id: "p-2", name: "Dr. Rui Alencar", specialty: "Ortopedia" },
    };
    expect(findConflicts([confirmed, other]).size).toBe(0);
  });

  it("avalia o horário pretendido antes de confirmar o reagendamento", () => {
    expect(
      wouldConflict(overlapping, { start: at("10:15"), end: at("11:00") }, [confirmed, overlapping]),
    ).toBe(true);
    expect(
      wouldConflict(overlapping, { start: at("11:45"), end: at("12:30") }, [confirmed, overlapping]),
    ).toBe(false);
  });
});

/* =============================================================== pacientes */

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: "pt-1",
    name: "Ana Moreira",
    birthDate: "1988-04-12",
    cpf: "000.111.222-00",
    missingFields: [],
    recordRestricted: false,
    ...overrides,
  };
}

describe("idade e menoridade", () => {
  it("mede contra a data de referência do ambiente, não contra o relógio", () => {
    expect(ageInYears("1988-04-12")).toBe(38);
    // Aniversário depois da data de referência: ainda não completou.
    expect(ageInYears("1988-08-12")).toBe(37);
    expect(ageInYears("2011-09-08")).toBe(14);
  });

  it("classifica menoridade pela mesma referência", () => {
    expect(isMinor({ id: "x", name: "x", birthDate: "2011-09-08" })).toBe(true);
    expect(isMinor({ id: "x", name: "x", birthDate: "2008-07-29" })).toBe(false);
  });
});

describe("incomplete-registration-blocks-scheduling", () => {
  it("bloqueia nomeando os campos que faltam", () => {
    const result = canSchedule(patient({ missingFields: ["CPF", "convênio"] }), ["agenda.create"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Cadastro incompleto. Falta: CPF, convênio.");
  });

  it("permite quando o cadastro está completo", () => {
    expect(canSchedule(patient(), ["agenda.create"]).allowed).toBe(true);
  });

  it("bloqueia por permissão antes de olhar o cadastro", () => {
    expect(canSchedule(patient(), ["patients.read"]).reason).toMatch(/não cria agendamentos/);
  });
});

describe("minor-requires-guardian", () => {
  const minor = patient({ id: "pt-4", birthDate: "2011-09-08" });

  it("bloqueia menor sem responsável, mesmo com todos os campos preenchidos", () => {
    expect(minor.missingFields).toEqual([]);
    const result = canSchedule(minor, ["agenda.create"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/menor de idade sem responsável/);
  });

  it("acrescenta o responsável à lista de pendências do cadastro", () => {
    expect(missingRequiredFields(minor)).toEqual(["responsável legal"]);
  });

  it("permite menor com responsável cadastrado", () => {
    const withGuardian = {
      ...minor,
      guardian: { name: "Renata", relation: "mãe", cpf: "000.777.888-00", phone: "(11) 90000-0007" },
    };
    expect(canSchedule(withGuardian, ["agenda.create"]).allowed).toBe(true);
    expect(missingRequiredFields(withGuardian)).toEqual([]);
  });
});

describe("restricted-record-requires-permission", () => {
  const restricted = patient({ recordRestricted: true });

  it("bloqueia prontuário restrito para quem só tem leitura comum", () => {
    const result = canReadRecord(restricted, ["patients.read", "patients.record.read"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/acesso restrito/);
  });

  it("libera para quem tem a permissão específica", () => {
    expect(
      canReadRecord(restricted, ["patients.record.read", "patients.record.restricted"]).allowed,
    ).toBe(true);
  });

  it("prontuário não restrito segue a permissão comum", () => {
    expect(canReadRecord(patient(), ["patients.record.read"]).allowed).toBe(true);
    expect(canReadRecord(patient(), ["patients.read"]).allowed).toBe(false);
  });
});

/* ============================================================== financeiro */

function claim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: "GUI-1",
    patient: { id: "pt-5", name: "Júlia Prado", birthDate: "1966-06-30" },
    procedure: "Ressonância",
    amountCents: 142_500,
    insurer: "SulAmérica",
    status: "denied",
    submittedAt: "2026-07-21T09:05:00.000-03:00",
    documents: [
      { id: "d-1", name: "Guia de atendimento", received: true },
      { id: "d-2", name: "Relatório clínico assinado", received: false },
    ],
    history: [],
    ...overrides,
  };
}

describe("retry-after-document-review", () => {
  const analyst = ["claims.read", "claims.retry"];

  it("bloqueia reenvio nomeando os documentos que faltam", () => {
    const result = canResubmit(claim(), analyst);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Falta anexar: Relatório clínico assinado.");
  });

  it("libera quando toda a documentação está anexada", () => {
    const complete = claim({
      documents: claim().documents.map((d) => ({ ...d, received: true })),
    });
    expect(canResubmit(complete, analyst).allowed).toBe(true);
  });

  it("vale também para pendência de documento, não só para recusa", () => {
    const pending = claim({ status: "pending_documents" });
    expect(canResubmit(pending, analyst).reason).toMatch(/Falta anexar/);
  });

  it("não reenvia guia em análise nem autorizada", () => {
    expect(canResubmit(claim({ status: "under_review" }), analyst).reason).toMatch(
      /recusada ou com pendência/,
    );
    expect(canResubmit(claim({ status: "approved" }), analyst).allowed).toBe(false);
  });
});

describe("resubmit-requires-permission", () => {
  it("bloqueia por permissão antes de olhar a documentação", () => {
    const complete = claim({ documents: claim().documents.map((d) => ({ ...d, received: true })) });
    expect(canResubmit(complete, ["claims.read"]).reason).toMatch(/não reenvia guias/);
  });
});

describe("progresso de documentação", () => {
  it("conta recebidos e total", () => {
    expect(documentProgress(claim())).toEqual({ received: 1, total: 2 });
  });

  it("lista só o que falta", () => {
    expect(missingDocuments(claim()).map((d) => d.name)).toEqual(["Relatório clínico assinado"]);
  });
});
