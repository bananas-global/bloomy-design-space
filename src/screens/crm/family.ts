/**
 * CRM de Leads — o pedido para a família preencher pelo link: as seções, o que
 * conta como completo no cadastro, como as respostas entram no lead e como
 * aparecem resumidas para a equipe. A resposta é simulada no protótipo.
 */
import { TODAY } from "../../components/today.js";
import {
  BEHAVIORS, MEDICAL_VALIDITY_MONTHS, OPERATOR_OTHER, WEEKDAYS, addMonths, blankDoc, fmtBR, guardianOf, hoursOf,
  type Address, type Availability, type Lead,
} from "./model.js";
import { DAY_SHORT, hh } from "./week.js";

export type FamSection = { id: string; title: string; min: number; why: string; done: (l: Lead) => boolean };

export const FAM_SECTIONS: FamSection[] = [
  { id: "resp", title: "Responsáveis", min: 1, why: "Quem acompanha a criança e recebe nossos avisos.", done: (l) => !!(guardianOf(l).name.trim() && guardianOf(l).phone.trim()) },
  { id: "crianca", title: "Dados da criança", min: 1, why: "Nome, nascimento e turno da escola.", done: (l) => !!l.child.trim() && Number(l.age) > 0 },
  { id: "plano", title: "Plano de saúde", min: 1, why: "Usamos para pedir a autorização das terapias ao plano.", done: (l) => l.operator === "Particular" || !!(l.operator && l.cardNumber) },
  { id: "carga", title: "Carga horária indicada", min: 2, why: "Horas por semana de cada terapia, como está no pedido médico.", done: (l) => hoursOf(l) > 0 },
  { id: "disp", title: "Dias e horários preferidos", min: 1, why: "Quando a criança pode vir à clínica.", done: (l) => l.availability.length > 0 },
  { id: "agenda", title: "Agenda anterior", min: 2, why: "Terapias que a criança já faz em outra clínica.", done: (l) => !!l.currentWeek?.blocks.length },
  { id: "laudo", title: "Laudo ou pedido médico", min: 1, why: "Documento do médico exigido pelo plano.", done: (l) => l.medicalDocs.length > 0 },
  { id: "endereco", title: "Endereço", min: 1, why: "Para indicar a unidade mais perto.", done: (l) => !!(l.addr.street.trim() && l.addr.number.trim() && l.addr.city.trim()) },
  { id: "anamnese", title: "Pré-anamnese", min: 5, why: "Rotina, comportamento e desenvolvimento da criança.", done: (l) => l.cidMain.length > 0 && !!l.support },
];
export const famSection = (id: string) => FAM_SECTIONS.find((s) => s.id === id)!;

/* ---------- as respostas, por seção ---------- */

type Resp = { name: string; relation: string; phone: string; email: string; second: "" | "Sim" | "Não"; name2: string; rel2: string; phone2: string };
type Crianca = { name: string; birth: string; shift: string };
type Plano = { operator: string; other: string; card: string; file: string };
type Carga = { hours: Record<string, number>; unknown: boolean };
/** Por dia (1 = segunda): manhã e tarde. */
type Disp = { cells: Record<string, boolean>; note: string };
/** Cada linha: dia (1 = segunda), das `from` às `to` horas, especialidade. */
type Agenda = { has: "" | "Sim" | "Não"; rows: { id: string; weekday: number; from: number; to: number; spec: string }[] };
type Laudo = { file: string; doctor: string; date: string };
type Endereco = Address & { unit: string };
type Anamnese = { diag: string[]; diagOther: string; support: string; priorTherapy: string; behaviors: Record<string, boolean>; comm: Record<string, boolean>; sensory: Record<string, boolean>; locomotion: string; reinforcers: string[]; notes: string };

export type FamAnswers = Partial<{
  resp: Resp; crianca: Crianca; plano: Plano; carga: Carga; disp: Disp; agenda: Agenda; laudo: Laudo; endereco: Endereco; anamnese: Anamnese;
}>;

export const DIAG_CID: Record<string, string | null> = {
  "Autismo (TEA)": "F84.0 - Autismo Infantil",
  TDAH: "F90.0 - TDAH",
  "Atraso / transtorno de fala": "F80.0 - Transtorno de Fala",
  "Deficiência intelectual": null,
  "Ainda sem diagnóstico": null,
};
export const PERIODS = [{ id: "m", label: "manhã", from: "08:00", to: "12:00" }, { id: "t", label: "tarde", from: "13:00", to: "18:00" }];

/** A idade em anos completos, de hoje. */
const ageOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const [ty, tm, td] = TODAY.split("-").map(Number);
  return ty! - y! - (tm! < m! || (tm === m && td! < d!) ? 1 : 0);
};

/** Protótipo: o que a família responderia, com os nomes do lead. */
export function simulatedAnswers(l: Lead): FamAnswers {
  const g = guardianOf(l);
  const surname = (g.name || l.child).trim().split(/\s+/).slice(-1)[0] ?? "";
  return {
    resp: { name: g.name || `Juliana ${surname}`, relation: g.relation || "Mãe", phone: g.phone || "(11) 96320-1145", email: g.email || `${(g.name || "familia").split(" ")[0]!.toLowerCase()}@email.com`, second: "Sim", name2: `Ricardo ${surname}`, rel2: "Pai", phone2: "(11) 97788-2201" },
    crianca: { name: "", birth: `${Number(TODAY.slice(0, 4)) - (l.age || 4)}-03-14`, shift: "Manhã" },
    plano: { operator: l.operator && l.operator !== OPERATOR_OTHER ? l.operator : "Bradesco", other: "", card: l.cardNumber || "8873 4412 0091 2231", file: "carteirinha-frente.jpg" },
    carga: { hours: { "Análise do Comportamento": 10, Fonoaudiologia: 2, "Terapia Ocupacional": 2 }, unknown: false },
    disp: { cells: { "1-t": true, "2-t": true, "3-t": true, "4-t": true, "5-t": true, "6-m": true }, note: "Sai da escola às 12h30." },
    agenda: { has: "Sim", rows: [{ id: "a1", weekday: 2, from: 14, to: 15, spec: "Fonoaudiologia" }, { id: "a2", weekday: 4, from: 14, to: 15, spec: "Fonoaudiologia" }] },
    laudo: { file: "laudo-neuropediatra.pdf", doctor: "Dra. Renata Salgado", date: TODAY },
    endereco: { cep: "02012-000", street: "Rua Voluntários da Pátria", number: "1450", comp: "Apto 32", district: "Santana", city: "São Paulo", uf: "SP", unit: "Santana" },
    anamnese: {
      diag: ["Autismo (TEA)"], diagOther: "", support: "Nível 2", priorTherapy: "Sim", behaviors: { fuga: true, estereotipias: true }, comm: { semi_vocal: true }, sensory: { auditiva: true },
      locomotion: "Independente", reinforcers: ["Carrinho", "Música", "Bolha"], notes: "Fica muito agitado em lugares com barulho. Gosta de rotina e de avisos antes das mudanças.",
    },
  };
}

/**
 * O formulário como a família abre: o que já está no cadastro vem preenchido
 * para ela só conferir, e o que ela já respondeu antes volta como estava.
 */
export function initAnswers(l: Lead, prev?: Record<string, unknown>): Required<FamAnswers> {
  const g0 = l.guardians[0], g1 = l.guardians[1];
  const cells: Record<string, boolean> = {};
  l.availability.forEach((av) => {
    const wd = WEEKDAYS.indexOf(av.day) + 1;
    if (wd < 1) return;
    if (av.from < "12:00") cells[`${wd}-m`] = true;
    if (av.to > "13:00") cells[`${wd}-t`] = true;
  });
  const base: Required<FamAnswers> = {
    resp: { name: g0?.name ?? "", relation: g0?.relation || "Mãe", phone: g0?.phone ?? "", email: g0?.email ?? "", second: g1 ? "Sim" : "", name2: g1?.name ?? "", rel2: g1?.relation || "Pai", phone2: g1?.phone ?? "" },
    crianca: { name: l.child, birth: "", shift: l.schoolShift },
    plano: { operator: l.operator, other: l.operatorOther, card: l.cardNumber, file: l.cardFile },
    carga: { hours: Object.fromEntries(l.specialties.filter((x) => Number(x.hours) > 0).map((x) => [x.spec, Number(x.hours)])), unknown: false },
    disp: { cells, note: "" },
    agenda: { has: l.currentWeek?.blocks.length ? "Sim" : "", rows: (l.currentWeek?.blocks ?? []).map((b) => ({ id: b.id, weekday: b.weekday, from: b.hour, to: b.hour + 1, spec: b.spec })) },
    laudo: { file: "", doctor: "", date: "" },
    endereco: { ...l.addr, unit: l.prefUnit },
    anamnese: { diag: [], diagOther: "", support: "", priorTherapy: "", behaviors: {}, comm: {}, sensory: {}, locomotion: "", reinforcers: [], notes: "" },
  };
  return structuredClone({ ...base, ...(prev as FamAnswers | undefined) });
}

/** A seção tem resposta que dá para usar. */
export function hasAnswer(id: string, a: FamAnswers): boolean {
  switch (id) {
    case "resp": return !!(a.resp?.name && a.resp.phone);
    case "crianca": return !!(a.crianca?.name || a.crianca?.birth || a.crianca?.shift);
    case "plano": return !!a.plano?.operator;
    case "carga": return !!a.carga && (a.carga.unknown || Object.values(a.carga.hours).some((h) => h > 0));
    case "disp": return !!a.disp && Object.values(a.disp.cells).some(Boolean);
    case "agenda": return !!a.agenda && (a.agenda.has === "Não" || (a.agenda.has === "Sim" && a.agenda.rows.length > 0));
    case "laudo": return !!a.laudo?.file;
    case "endereco": return !!(a.endereco?.street && a.endereco.city);
    case "anamnese": return !!(a.anamnese?.diag.length || a.anamnese?.diagOther || a.anamnese?.support);
    default: return false;
  }
}

/** As respostas das seções `ids` aplicadas ao lead. */
export function applyAnswers(l: Lead, a: FamAnswers, ids: string[], meta: { by: string; at: string }): Partial<Lead> {
  const p: Partial<Lead> = {};
  for (const id of ids.filter((x) => hasAnswer(x, a))) {
    if (id === "resp" && a.resp) {
      const r = a.resp;
      const g0 = l.guardians[0] ?? { id: "g1", name: "", relation: "", phone: "", email: "" };
      const g1 = r.second === "Sim" && r.name2 ? [{ ...(l.guardians[1] ?? { id: `g-${Date.now()}`, email: "" }), name: r.name2, relation: r.rel2 ?? "Pai", phone: r.phone2 ?? "" }] : l.guardians.slice(1, 2);
      p.guardians = [{ ...g0, name: r.name, relation: r.relation, phone: r.phone, email: r.email }, ...g1, ...l.guardians.slice(2)];
    }
    if (id === "crianca" && a.crianca) {
      if (a.crianca.name.trim()) p.child = a.crianca.name.trim();
      if (a.crianca.birth) p.age = ageOf(a.crianca.birth);
      if (a.crianca.shift) p.schoolShift = a.crianca.shift;
    }
    if (id === "plano" && a.plano) Object.assign(p, { operator: a.plano.operator, operatorOther: a.plano.other, cardNumber: a.plano.card, ...(a.plano.file ? { cardFile: a.plano.file } : {}) });
    if (id === "carga" && a.carga && !a.carga.unknown) p.specialties = Object.entries(a.carga.hours).filter(([, h]) => h > 0).map(([spec, hours]) => ({ spec, hours }));
    if (id === "disp" && a.disp) {
      const av: Availability[] = [];
      WEEKDAYS.slice(0, 6).forEach((day, i) => {
        const m = a.disp!.cells[`${i + 1}-m`], t = a.disp!.cells[`${i + 1}-t`];
        if (m || t) av.push({ day, from: m ? "08:00" : "13:00", to: t ? "18:00" : "12:00" });
      });
      p.availability = av;
    }
    if (id === "agenda" && a.agenda?.has === "Sim") {
      const blocks = a.agenda.rows.flatMap((r) => Array.from({ length: Math.max(0, r.to - r.from) }, (_, i) => ({ id: `fr${r.id}-${i}`, weekday: r.weekday, hour: r.from + i, spec: r.spec })));
      p.currentWeek = { blocks: blocks.filter((b, i) => blocks.findIndex((x) => x.weekday === b.weekday && x.hour === b.hour) === i), src: "familia", by: meta.by, at: meta.at, reviewed: false };
    }
    if (id === "laudo" && a.laudo) {
      const iso = a.laudo.date || TODAY;
      p.medicalDocs = [...l.medicalDocs, { ...blankDoc(), id: `lmf-${Date.now()}`, doctor: a.laudo.doctor, issuedAt: iso, expiresAt: addMonths(iso, MEDICAL_VALIDITY_MONTHS), file: a.laudo.file }];
    }
    if (id === "endereco" && a.endereco) {
      const { unit, ...addr } = a.endereco;
      p.addr = { ...l.addr, ...addr };
      if (unit && unit !== "Tanto faz") p.prefUnit = unit;
    }
    if (id === "anamnese" && a.anamnese) {
      const x = a.anamnese;
      const cids = x.diag.map((d) => DIAG_CID[d]).filter((c): c is string => !!c);
      Object.assign(p, {
        cidMain: [...new Set([...l.cidMain, ...cids])],
        priorTherapy: x.priorTherapy || l.priorTherapy,
        ...(x.support && x.support !== "Não sei" ? { support: x.support } : {}),
        behaviors: { ...l.behaviors, ...x.behaviors },
        comm: { ...l.comm, ...x.comm },
        sensory: { ...l.sensory, ...x.sensory },
        ...(x.locomotion ? { locomotion: x.locomotion } : {}),
        reinforcers: [...new Set([...l.reinforcers, ...x.reinforcers])],
      });
    }
  }
  return p;
}

/** O que a família respondeu, em linhas de leitura. */
export function summarize(id: string, a: FamAnswers): [string, string][] {
  const rows: ([string, string] | null)[] = [];
  if (id === "resp" && a.resp) {
    const r = a.resp;
    rows.push(["Principal", [r.name, r.relation, r.phone].filter(Boolean).join(" · ")]);
    if (r.second === "Sim" && r.name2) rows.push(["Outro responsável", [r.name2, r.rel2, r.phone2].filter(Boolean).join(" · ")]);
  }
  if (id === "crianca" && a.crianca) rows.push(...(a.crianca.name ? [["Nome", a.crianca.name] as [string, string]] : []), ["Nascimento", a.crianca.birth ? `${fmtBR(a.crianca.birth)} (${ageOf(a.crianca.birth)} anos)` : "—"], ["Turno escolar", a.crianca.shift || "—"]);
  if (id === "plano" && a.plano) rows.push(["Plano", a.plano.operator === OPERATOR_OTHER ? a.plano.other || "Outros" : a.plano.operator], ["Carteirinha", a.plano.card || "—"], ["Foto", a.plano.file || "Não enviou"]);
  if (id === "carga" && a.carga) rows.push(["Horas por semana", a.carga.unknown ? "Não soube informar" : Object.entries(a.carga.hours).filter(([, h]) => h > 0).map(([s, h]) => `${s} ${h}h`).join(", ")]);
  if (id === "disp" && a.disp) {
    const days = DAY_SHORT.map((d, i) => {
      const ps = PERIODS.filter((x) => a.disp!.cells[`${i + 1}-${x.id}`]).map((x) => x.label);
      return ps.length ? `${d} ${ps.join(" e ")}` : null;
    }).filter(Boolean);
    rows.push(["Pode vir", days.join(" · ")]);
    if (a.disp.note) rows.push(["Observação", `“${a.disp.note}”`]);
  }
  if (id === "agenda" && a.agenda) rows.push(["Outra clínica", a.agenda.has === "Não" ? "Não faz terapia hoje" : a.agenda.rows.map((r) => `${DAY_SHORT[r.weekday - 1]} ${hh(r.from)}–${hh(r.to)} ${r.spec}`).join(" · ")]);
  if (id === "laudo" && a.laudo) rows.push(["Arquivo", a.laudo.file], ["Médico", a.laudo.doctor || "—"], ["Data", a.laudo.date ? fmtBR(a.laudo.date) : "—"]);
  if (id === "endereco" && a.endereco) {
    const e = a.endereco;
    rows.push(["Endereço", [e.street, e.number, e.comp, e.district, e.city].filter(Boolean).join(", ")], ["Unidade preferida", e.unit || "—"]);
  }
  if (id === "anamnese" && a.anamnese) {
    const x = a.anamnese;
    rows.push(["Diagnóstico", [...x.diag, x.diagOther].filter(Boolean).join(", ") || "—"], ["Nível de suporte", x.support || "—"], ["Comportamentos", BEHAVIORS.filter((b) => x.behaviors[b.id]).map((b) => b.title).join(", ") || "Nenhum marcado"]);
    if (x.notes) rows.push(["Observações", `“${x.notes}”`]);
  }
  return rows.filter((r): r is [string, string] => !!r);
}
