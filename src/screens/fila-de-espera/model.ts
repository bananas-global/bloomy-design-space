/**
 * Fila de Espera: o modelo e o cruzamento.
 *
 * Um lead na fila pede horas por especialidade numa unidade e informa a
 * disponibilidade da família (dia × horário). O cruzamento procura horas livres
 * dos profissionais da unidade dentro dessa disponibilidade, em três fontes:
 * a escala atual (livre hoje), as vagas futuras (alta ou desligamento de
 * paciente) e uma nova vigência de escala ou contratação. O resultado é encaixe
 * completo ou parcial (hoje), previsto (a partir de uma data) ou nenhum.
 * A fila segue a ordem de chegada.
 */
import { TODAY } from "../../components/today.js";

export const UNIDADES = ["Unidade Jardim", "Unidade Girassol"] as const;
export const DIAS_SEMANA = ["Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira"];
export const DIA_IDX: Record<string, number> = Object.fromEntries(DIAS_SEMANA.map((d, i) => [d, i]));
export const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
/** A grade da semana vai das 7h às 19h. */
export const H0 = 7;
export const H1 = 19;

export const ESPECIALIDADES = ["Análise do Comportamento", "Psicologia", "Fonoaudiologia", "Terapia Ocupacional", "Psicopedagogia", "Fisioterapia"];
export const SIGLA: Record<string, string> = {
  "Análise do Comportamento": "ABA", Psicologia: "PSI", Fonoaudiologia: "FON", "Terapia Ocupacional": "TO", Psicopedagogia: "PSP", Fisioterapia: "FIS",
};
/** Cor de cada especialidade na grade, a mesma da Proposta de Grade. */
export const COR: Record<string, string> = {
  "Análise do Comportamento": "var(--color-purple)", Psicologia: "var(--color-green)", Fonoaudiologia: "var(--color-blue)",
  "Terapia Ocupacional": "var(--color-orange)", Psicopedagogia: "var(--color-pink)", Fisioterapia: "var(--color-brand-blue-dark)",
};
export const MOTIVOS = ["Sem horário compatível com a família", "Sem profissional na especialidade", "Carga horária maior que a vaga disponível"];

export type Fonte = "escala" | "alta" | "desligamento" | "vigencia" | "contratacao";
export const FONTES: Record<Fonte, { label: string; icon: string }> = {
  escala: { label: "Escala atual", icon: "fa-calendar-check" },
  alta: { label: "Alta de paciente", icon: "fa-person-walking-arrow-right" },
  desligamento: { label: "Desligamento de paciente", icon: "fa-user-minus" },
  vigencia: { label: "Nova vigência de escala", icon: "fa-calendar-plus" },
  contratacao: { label: "Contratação", icon: "fa-user-plus" },
};

/** As etapas do funil de Leads de onde o lead pode ter vindo. */
export const ETAPAS_FUNIL: Record<string, string> = { aguardando: "Aguardando", proposta: "Proposta", avaliacao: "Avaliação", perdido: "Perdido" };

/* ---------- tipos ---------- */

export type Pedido = { spec: string; hours: number };
export type Janela = { day: string; from: string; to: string };
/** Um horário escolhido à mão (arrastado na grade). */
export type Pin = { spec: string; pid: string; day: number; h: number };
/** Um horário que a sugestão do sistema não pode usar. */
export type Skip = { spec: string; day: number; h: number };

export type Entrada = {
  id: string;
  leadId: string;
  unit: string;
  child: string;
  age: number;
  guardian: string;
  relation?: string;
  phone: string;
  owner: string;
  origin?: string;
  support?: string;
  enteredAt: string;
  fromStatus: string;
  reason: string;
  notes: string;
  specialties: Pedido[];
  availability: Janela[];
  pins?: Pin[];
  skips?: Skip[];
};

export type Profissional = { id: string; unit: string; name: string; specs: string[] };
/** Hora livre de um profissional: dia 0–4, horas inteiras [from, to). `at` = vale a partir de (null = hoje). */
export type Livre = { prof: string; unit: string; day: number; from: number; to: number; source: Fonte; at: string | null; known: string };

type Slot = { k: string; day: number; h: number; pid: string; win: Livre; spec?: string; pin?: boolean; outside?: boolean };
export type Alocacao = { spec: string; need: number; slots: Slot[] }[];
export type Faixa = {
  spec: string; pid: string; day: number; from: number; to: number; hs: number[];
  at: string | null; source: Fonte; known: string; ahead: number; pin: boolean; outside: boolean;
};
export type Status = "full" | "partial" | "future" | "none";
export type Avaliacao = {
  need: number; momH: number; now: Alocacao; nowGot: number;
  next: { at: string; alloc: Alocacao; got: number } | null;
  full: { at: string; alloc: Alocacao; got: number } | null;
  fut: { at: string; alloc: Alocacao; got: number } | null;
  status: Status;
};
export type Linha = Entrada & { pos: number; wait: number; ev: Avaliacao; nowR: Faixa[]; futR: Faixa[]; fitNow: boolean; notifiedAt: string | null };

/* ---------- datas e horas ---------- */

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** A data `n` dias depois de hoje. */
export const off = (n: number) => {
  const d = new Date(`${TODAY}T00:00:00`);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const br = (s: string | null | undefined) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : "—");
export const diasDesde = (s: string | null | undefined) =>
  s ? Math.round((new Date(`${TODAY}T00:00:00`).getTime() - new Date(`${s}T00:00:00`).getTime()) / 86400000) : 0;
export const quando = (s: string) => {
  const d = diasDesde(s);
  return d <= 0 ? "hoje" : d === 1 ? "ontem" : d < 7 ? `há ${d} dias` : `em ${br(s)}`;
};
export const min = (t: string) => {
  const [h, m] = String(t || "").split(":");
  return (parseInt(h ?? "", 10) || 0) * 60 + (parseInt(m ?? "", 10) || 0);
};
export const hh = (h: number) => `${String(h).padStart(2, "0")}h`;
const hm = (t: string) => {
  const m = min(t), mm = m % 60;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}h${mm ? String(mm).padStart(2, "0") : ""}`;
};
export const curto = (n: string) => {
  const p = String(n || "").trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0] || "";
};
export const primeiro = (n: string) => String(n || "").split(" ")[0];
export const juntar = (a: string[]) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} e ${a[a.length - 1]}` : a[0] || "");
export const horasPedidas = (e: Pick<Entrada, "specialties">) => (e.specialties || []).reduce((s, x) => s + (Number(x.hours) || 0), 0);
export const faixaTxt = (g: Pick<Faixa, "day" | "from" | "to">) => `${DIAS[g.day]} ${hh(g.from)}–${hh(g.to)}`;
export const parentesco = (r: Pick<Entrada, "relation">) => (r.relation ? ` (${r.relation.toLowerCase()})` : "");
export const etapaFunil = (id: string) => ETAPAS_FUNIL[id] ?? id;

/** "Seg, Qua e Sex · 08h–12h; Seg · 14h–16h". */
export function disponibilidadeTxt(av: Janela[]) {
  const groups: { key: string; from: string; to: string; days: string[] }[] = [];
  (av || [])
    .filter((w) => DIA_IDX[w.day] != null)
    .slice()
    .sort((a, b) => DIA_IDX[a.day]! - DIA_IDX[b.day]! || min(a.from) - min(b.from))
    .forEach((w) => {
      const key = `${w.from}-${w.to}`;
      let g = groups.find((x) => x.key === key);
      if (!g) groups.push((g = { key, from: w.from, to: w.to, days: [] }));
      const d = DIAS[DIA_IDX[w.day]!]!;
      if (!g.days.includes(d)) g.days.push(d);
    });
  return groups.length ? groups.map((g) => `${juntar(g.days)} · ${hm(g.from)}–${hm(g.to)}`).join("; ") : "Não informada";
}

/* ---------- profissionais e horas livres por unidade (sintéticos) ---------- */

export const PROFISSIONAIS: Profissional[] = [
  { id: "wp1", unit: "Unidade Jardim", name: "Larissa de Sousa Santos", specs: ["Fonoaudiologia"] },
  { id: "wp2", unit: "Unidade Jardim", name: "Helena Martins Costa", specs: ["Psicologia", "Análise do Comportamento"] },
  { id: "wp3", unit: "Unidade Jardim", name: "Rafael Tavares", specs: ["Psicologia", "Análise do Comportamento"] },
  { id: "wp4", unit: "Unidade Jardim", name: "Bruna Oliveira Lima", specs: ["Terapia Ocupacional"] },
  { id: "wp5", unit: "Unidade Jardim", name: "Camila Nogueira", specs: ["Psicopedagogia"] },
  { id: "wp6", unit: "Unidade Jardim", name: "Fábio Stoll Pereira", specs: ["Fisioterapia"] },
  { id: "wp7", unit: "Unidade Jardim", name: "Juliana Prado Reis", specs: ["Fonoaudiologia"] },
  { id: "wp8", unit: "Unidade Girassol", name: "Vanessa Duarte", specs: ["Psicologia", "Análise do Comportamento"] },
  { id: "wp9", unit: "Unidade Girassol", name: "Thiago Rezende", specs: ["Fonoaudiologia"] },
  { id: "wp10", unit: "Unidade Girassol", name: "Gabriel Ramos", specs: ["Terapia Ocupacional"] },
];
export const PROF: Record<string, Profissional> = Object.fromEntries(PROFISSIONAIS.map((p) => [p.id, p]));

const livre = (prof: string, day: number, from: number, to: number, source: Fonte, at: number | null, known: number): Livre => ({
  prof, unit: PROF[prof]!.unit, day, from, to, source, at: at == null ? null : off(at), known: off(known),
});

export const LIVRES: Livre[] = [
  livre("wp1", 0, 8, 10, "escala", null, -4),
  livre("wp1", 2, 8, 10, "escala", null, -4),
  livre("wp1", 4, 8, 11, "alta", 12, -2),
  livre("wp2", 1, 14, 16, "escala", null, -9),
  livre("wp2", 3, 14, 17, "escala", null, -9),
  livre("wp3", 4, 13, 15, "escala", null, -15),
  livre("wp3", 1, 16, 18, "vigencia", 20, -1),
  livre("wp3", 3, 16, 18, "vigencia", 20, -1),
  livre("wp4", 0, 13, 15, "desligamento", 8, -3),
  livre("wp4", 2, 13, 15, "desligamento", 8, -3),
  livre("wp5", 0, 14, 16, "escala", null, -6),
  livre("wp6", 2, 9, 11, "escala", null, -1),
  ...[0, 1, 2, 3, 4].map((d) => livre("wp7", d, 7, 12, "contratacao", 25, -5)),
  livre("wp8", 0, 8, 12, "escala", null, -2),
  livre("wp8", 1, 8, 12, "escala", null, -2),
  livre("wp9", 3, 14, 16, "escala", null, -20),
  livre("wp10", 0, 13, 17, "contratacao", 15, -4),
  livre("wp10", 2, 13, 17, "contratacao", 15, -4),
  // Horas livres fora das janelas dos leads (as mesmas do Mapa da Unidade › Movimentações).
  ...[0, 1, 3, 4].map((d) => livre("wp1", d, 12, 13, "escala", null, -3)),
  livre("wp2", 0, 11, 12, "escala", null, -3),
  livre("wp2", 0, 13, 14, "escala", null, -3),
  livre("wp2", 1, 12, 13, "escala", null, -3),
  livre("wp2", 1, 18, 19, "escala", null, -3),
  livre("wp2", 3, 18, 19, "escala", null, -3),
  livre("wp2", 4, 17, 19, "escala", null, -3),
  livre("wp3", 2, 11, 12, "escala", null, -3),
  livre("wp4", 0, 17, 18, "escala", null, -3),
  livre("wp4", 2, 11, 12, "escala", null, -3),
  livre("wp4", 3, 9, 11, "escala", null, -3),
  livre("wp4", 4, 12, 13, "escala", null, -3),
];

/* ---------- cruzamento ---------- */

/** As horas inteiras (`dia-hora`) da disponibilidade da família. */
export function horasDaFamilia(entry: Pick<Entrada, "availability">) {
  const s = new Set<string>();
  (entry.availability || []).forEach((w) => {
    const d = DIA_IDX[w.day];
    if (d == null) return;
    const a = Math.ceil(min(w.from) / 60), b = Math.floor(min(w.to) / 60);
    for (let h = Math.max(a, H0); h < Math.min(b, H1); h++) s.add(`${d}-${h}`);
  });
  return s;
}

type Rascunho = Pick<Entrada, "unit" | "specialties" | "availability" | "pins" | "skips">;

/**
 * Distribui as horas pedidas nas horas livres que valem até `asOf`. A criança
 * não faz duas terapias na mesma hora; prefere o mesmo profissional e as horas
 * que já estão livres hoje; a especialidade mais escassa escolhe primeiro.
 */
function alocar(entry: Rascunho, asOf: string): Alocacao {
  const mom = horasDaFamilia(entry);
  const wins = LIVRES.filter((w) => w.unit === entry.unit && (!w.at || w.at <= asOf));
  const skips = new Set((entry.skips || []).map((s) => `${s.spec}|${s.day}-${s.h}`));
  const cand = (entry.specialties || [])
    .filter((s) => s.spec && Number(s.hours) > 0)
    .map((s) => {
      const byProf: Record<string, Record<string, Slot>> = {};
      wins.forEach((w) => {
        if (!PROF[w.prof]!.specs.includes(s.spec)) return;
        for (let h = w.from; h < w.to; h++) {
          const k = `${w.day}-${h}`;
          if (mom.has(k) && !skips.has(`${s.spec}|${k}`)) (byProf[w.prof] ??= {})[k] = { k, day: w.day, h, pid: w.prof, win: w };
        }
      });
      const profs = Object.values(byProf).map((m) => Object.values(m));
      return { spec: s.spec, need: Number(s.hours), profs, total: new Set(profs.flat().map((x) => x.k)).size };
    });
  const used = new Set<string>();
  const out: Alocacao = cand.map((c) => ({ spec: c.spec, need: c.need, slots: [] }));
  // Horários ajustados à mão entram primeiro, mesmo fora da disponibilidade da família.
  const reserved = cand.map(() => 0);
  (entry.pins || []).forEach((p) => {
    const i = cand.findIndex((c) => c.spec === p.spec), k = `${p.day}-${p.h}`;
    if (i < 0 || used.has(k) || out[i]!.slots.length + reserved[i]! >= cand[i]!.need) return;
    const w = wins.find((x) => x.prof === p.pid && x.day === p.day && x.from <= p.h && p.h < x.to);
    // Horário escolhido que só libera depois: guarda a hora até a data chegar.
    if (!w) {
      if (LIVRES.some((x) => x.unit === entry.unit && x.prof === p.pid && x.day === p.day && x.from <= p.h && p.h < x.to)) {
        used.add(k);
        reserved[i]!++;
      }
      return;
    }
    used.add(k);
    out[i]!.slots.push({ k, day: p.day, h: p.h, pid: p.pid, win: w, spec: p.spec, pin: true, outside: !mom.has(k) });
  });
  const nowN = (p: Slot[]) => p.filter((x) => !x.win.at).length;
  cand
    .map((_, i) => i)
    .sort((a, b) => cand[a]!.total - cand[b]!.total)
    .forEach((i) => {
      const c = cand[i]!;
      // Espalha pelos dias da família: a cada hora, o dia com menos horas marcadas.
      const perDay: Record<number, number> = {};
      used.forEach((k) => {
        const d = Number(k.split("-")[0]);
        perDay[d] = (perDay[d] || 0) + 1;
      });
      c.profs
        .slice()
        .sort((a, b) => nowN(b) - nowN(a) || b.length - a.length)
        .forEach((p) => {
          const pool = p.filter((x) => !used.has(x.k));
          while (out[i]!.slots.length + reserved[i]! < c.need && pool.length) {
            pool.sort((a, b) => (a.win.at || "").localeCompare(b.win.at || "") || (perDay[a.day] || 0) - (perDay[b.day] || 0) || a.day - b.day || a.h - b.h);
            const x = pool.shift()!;
            if (used.has(x.k)) continue;
            used.add(x.k);
            perDay[x.day] = (perDay[x.day] || 0) + 1;
            out[i]!.slots.push({ ...x, spec: c.spec });
          }
        });
    });
  return out;
}

export function avaliar(entry: Rascunho): Avaliacao {
  const need = horasPedidas(entry);
  const momH = horasDaFamilia(entry).size;
  const got = (al: Alocacao) => al.reduce((s, x) => s + x.slots.length, 0);
  const now = alocar(entry, TODAY);
  const nowGot = got(now);
  let next: Avaliacao["next"] = null;
  let best = nowGot;
  let full: Avaliacao["full"] = need > 0 && nowGot >= need ? { at: TODAY, alloc: now, got: nowGot } : null;
  if (!full && need > 0) {
    const dates = [...new Set(LIVRES.filter((w) => w.unit === entry.unit && w.at && w.at > TODAY).map((w) => w.at!))].sort();
    for (const d of dates) {
      const al = alocar(entry, d), g = got(al);
      if (g > best) {
        best = g;
        if (!next) next = { at: d, alloc: al, got: g };
      }
      if (g >= need) {
        full = { at: d, alloc: al, got: g };
        break;
      }
    }
  }
  const fut = full && full.at !== TODAY ? full : next;
  const status: Status = !need ? "none" : nowGot >= need ? "full" : nowGot > 0 ? "partial" : fut ? "future" : "none";
  return { need, momH, now, nowGot, next, full, fut, status };
}

/** Junta horas seguidas do mesmo profissional, dia e fonte em faixas. */
export function faixas(alloc: Alocacao): Faixa[] {
  const out: Faixa[] = [];
  alloc.forEach((a) => {
    a.slots
      .slice()
      .sort((x, y) => x.pid.localeCompare(y.pid) || x.day - y.day || x.h - y.h)
      .forEach((x) => {
        const at = x.win.at || null, last = out[out.length - 1];
        const pin = !!x.pin, outside = !!x.outside;
        if (last && last.spec === a.spec && last.pid === x.pid && last.day === x.day && last.to === x.h && last.at === at && last.pin === pin && last.outside === outside) {
          last.to = x.h + 1;
          last.hs.push(x.h);
        } else out.push({ spec: a.spec, pid: x.pid, day: x.day, from: x.h, to: x.h + 1, hs: [x.h], at, source: x.win.source, known: x.win.known, ahead: 0, pin, outside });
      });
  });
  return out.sort((a, b) => (a.at || "").localeCompare(b.at || "") || a.day - b.day || a.from - b.from);
}
export const faixasFuturas = (ev: Avaliacao) => (ev.fut ? faixas(ev.fut.alloc).filter((g) => g.at) : []);

export const fontesEm = (alloc: Alocacao, d: string) =>
  [...new Set(alloc.flatMap((a) => a.slots.filter((x) => x.win.at === d).map((x) => FONTES[x.win.source].label.toLowerCase())))].join(" e ");

/** A fila de uma unidade: posição por chegada, encaixe e quem está à frente no mesmo horário. */
export function filaDaUnidade(entries: Entrada[], unit: string): Linha[] {
  const list = entries
    .filter((e) => e.unit === unit)
    .slice()
    .sort((a, b) => a.enteredAt.localeCompare(b.enteredAt) || a.id.localeCompare(b.id));
  const rows: Linha[] = list.map((e, i) => {
    const ev = avaliar(e);
    return { ...e, pos: i + 1, wait: diasDesde(e.enteredAt), ev, nowR: faixas(ev.now), futR: faixasFuturas(ev), fitNow: false, notifiedAt: null };
  });
  const claims: Record<string, Set<number>> = {};
  const keys = (g: Faixa) => g.hs.map((h) => `${g.pid}|${g.day}|${h}`);
  rows.forEach((r) => [...r.nowR, ...r.futR].forEach((g) => keys(g).forEach((k) => (claims[k] ??= new Set()).add(r.pos))));
  rows.forEach((r) => {
    [...r.nowR, ...r.futR].forEach((g) => {
      const a = new Set<number>();
      keys(g).forEach((k) => claims[k]!.forEach((p) => p < r.pos && a.add(p)));
      g.ahead = a.size;
    });
    r.fitNow = r.ev.status === "full" || r.ev.status === "partial";
    const used = r.fitNow ? r.nowR : r.ev.status === "future" ? r.futR : [];
    r.notifiedAt = used.length ? [r.enteredAt, ...used.map((g) => g.known)].sort().pop()! : null;
  });
  return rows;
}

/** Os avisos de encaixe para o responsável comercial (sino e Home). */
export type AvisoEncaixe = { id: string; kind: "now" | "future"; entryId: string; unit: string; child: string; owner: string; at: string; text: string };
export function avisosDeEncaixe(entries: Entrada[]): AvisoEncaixe[] {
  const out: AvisoEncaixe[] = [];
  UNIDADES.forEach((u) =>
    filaDaUnidade(entries, u).forEach((r) => {
      if (!r.notifiedAt) return;
      const list = r.fitNow ? r.nowR : r.futR, g = list[0]!, more = list.length - 1;
      const text = r.fitNow
        ? `${g.spec} · ${faixaTxt(g)} com ${curto(PROF[g.pid]!.name)}${more > 0 ? ` e mais ${more} horário${more > 1 ? "s" : ""}` : ""}`
        : `${g.spec} a partir de ${br(r.ev.fut!.at)} (${fontesEm(r.ev.fut!.alloc, r.ev.fut!.at)})`;
      out.push({ id: `${r.id}:${r.fitNow ? `now${r.ev.nowGot}` : `fut${r.ev.fut!.at}`}`, kind: r.fitNow ? "now" : "future", entryId: r.id, unit: u, child: r.child, owner: r.owner, at: r.notifiedAt, text });
    }),
  );
  return out.sort((a, b) => b.at.localeCompare(a.at) || (a.kind === "now" ? -1 : 1));
}

/** Horas livres da especialidade que não tocam a disponibilidade da família. */
export function livresForaDaFamilia(entry: Rascunho, spec: string) {
  const mom = horasDaFamilia(entry);
  return LIVRES.filter((w) => w.unit === entry.unit && PROF[w.prof]!.specs.includes(spec)).filter((w) => {
    for (let h = w.from; h < w.to; h++) if (mom.has(`${w.day}-${h}`)) return false;
    return true;
  });
}

/**
 * Ao editar o pedido, os encaixes que continuam valendo ficam; só as horas que
 * perderam o horário são redistribuídas.
 */
export function manterEncaixes(entry: Entrada | null, data: Rascunho): Pin[] {
  if (!entry) return [];
  const ev = avaliar(entry), mom = horasDaFamilia(data), specs = new Set(data.specialties.map((s) => s.spec));
  const gs = [...faixas(ev.now), ...faixasFuturas(ev)];
  const seen = new Set<string>();
  return [
    ...(entry.pins || []).map((p) => ({ ...p, pin: true })),
    ...gs.flatMap((g) => g.hs.map((h) => ({ spec: g.spec, pid: g.pid, day: g.day, h, pin: g.pin }))),
  ]
    .filter((p) => specs.has(p.spec) && (p.pin || mom.has(`${p.day}-${p.h}`)))
    .filter((p) => {
      const k = `${p.day}-${p.h}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map(({ pin: _pin, ...p }) => p);
}

/* ---------- textos do encaixe ---------- */

export const STATUS: Record<Status, { label: string; icon: string; tag: "green" | "orange" | "light-blue" | "dark-purple" }> = {
  full: { label: "Encaixe completo", icon: "fa-circle-check", tag: "green" },
  partial: { label: "Encaixe parcial", icon: "fa-circle-half-stroke", tag: "orange" },
  future: { label: "Encaixe previsto", icon: "fa-calendar-days", tag: "light-blue" },
  none: { label: "Sem encaixe", icon: "fa-circle-minus", tag: "dark-purple" },
};

export function statusTxt(ev: Avaliacao) {
  if (ev.status === "full") return `Encaixe completo · ${ev.need}h`;
  if (ev.status === "partial") return `Encaixe parcial · ${ev.nowGot} de ${ev.need}h`;
  if (ev.status === "future") return `${ev.full ? "Encaixe previsto" : "Parcial previsto"} · ${br(ev.fut!.at)}`;
  return "Sem encaixe";
}

/** O resumo curto ao lado do selo, na lista. */
export function resumoTxt(ev: Avaliacao) {
  if (ev.status !== "partial") return "";
  return ev.full ? `completo ${br(ev.full.at)}` : ev.next ? `+${ev.next.got - ev.nowGot}h ${br(ev.next.at)}` : "";
}

/** A frase do cruzamento, no formulário do pedido. */
export function fraseTxt(ev: Avaliacao) {
  const src = ev.fut ? fontesEm(ev.fut.alloc, ev.fut.at) : "";
  let s: string;
  if (ev.status === "full") s = `As ${ev.need}h pedidas cabem hoje na disponibilidade da família.`;
  else if (ev.status === "partial")
    s = `${ev.nowGot} das ${ev.need}h cabem hoje.` +
      (ev.full ? ` Completo a partir de ${br(ev.full.at)} (${src}).` : ev.next ? ` Mais ${ev.next.got - ev.nowGot}h a partir de ${br(ev.next.at)} (${src}).` : ` Faltam ${ev.need - ev.nowGot}h sem previsão de vaga.`);
  else if (ev.status === "future")
    s = "Nenhum horário cabe hoje. " + (ev.full ? `Completo a partir de ${br(ev.full.at)} (${src}).` : `${ev.next!.got} de ${ev.need}h a partir de ${br(ev.next!.at)} (${src}).`);
  else s = ev.need ? "Nenhum horário livre dos profissionais da unidade cai na disponibilidade da família." : "Pedido sem especialidade ou carga horária.";
  if (ev.need && ev.momH < ev.need) s += ` A família informou ${ev.momH}h por semana, menos que as ${ev.need}h pedidas.`;
  return s;
}
