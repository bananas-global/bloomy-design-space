/**
 * Central de Transferências — tipos e regras puras.
 *
 * Unidade de movimentação: o mapa de horas do paciente, com um ou mais
 * horários semanais (`Slot`). Em Mapas de horas cada horário recebe o próprio
 * destino e o mapa é fatiado ao aplicar; em Sessões do período, troca-se o
 * responsável de sessões concretas sem tocar no mapa.
 */

export type Weekday = 1 | 2 | 3 | 4 | 5;

export type Slot = { wd: Weekday; start: string; end: string };

export type Professional = {
  id: string;
  name: string;
  specialty: string;
  room: string;
  /** A escala semanal na unidade. */
  avail: Slot[];
};

export type HoursMap = {
  id: string;
  patient: string;
  specialty: string;
  /** `null`: mapa inativo, sem profissional associado. */
  profId: string | null;
  since: string;
  /** Quem deixou o mapa, quando ficou sem profissional. */
  left?: string | null;
  reason?: string | null;
  slots: Slot[];
};

/** Um horário de um mapa indo para um destino. */
export type MoveItem = { mapId: string; patient: string; specialty: string; s: Slot; pid: string };

export type ScheduledTransfer = {
  id: string;
  /** Data de início (ISO). */
  date: string;
  originId: string;
  originName: string;
  createdAt: string;
  /** Motivo da exceção de especialidade; vazio quando não houve. */
  why: string;
  items: MoveItem[];
};

/** Uma sessão concreta do período, expandida de um mapa. */
export type Session = {
  id: string;
  profId: string;
  date: string;
  wd: Weekday;
  start: string;
  end: string;
  patient: string;
  specialty: string;
};

/** Origem "Sem profissional (inativos)". */
export const NO_PROF = "__none";
/** Valor do seletor "Personalizado por horário" (um mapa com destinos diferentes). */
export const MIXED = "__mixed";
/** Destino "Sem cobertura — cancelar sessão". */
export const CANCEL = "cancel";

export const WD: Record<number, string> = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" };

export const ABSENCE_REASONS = ["Férias", "Atestado médico", "Licença", "Folga", "Treinamento / congresso", "Outro"];

/* ------------------------------------------------------------
   Horas e datas
   ------------------------------------------------------------ */

export const toMin = (t: string) => {
  const [h, m] = String(t).split(":");
  return (parseInt(h ?? "", 10) || 0) * 60 + (parseInt(m ?? "0", 10) || 0);
};
export const hours = (slots: Slot[]) => slots.reduce((s, x) => s + (toMin(x.end) - toMin(x.start)) / 60, 0);
export const overlap = (a: Slot, b: Slot) => a.wd === b.wd && toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);
export const covers = (p: Professional, s: Pick<Slot, "wd" | "start" | "end">) =>
  p.avail.some((a) => a.wd === s.wd && toMin(a.start) <= toMin(s.start) && toMin(a.end) >= toMin(s.end));
export const slotKey = (m: HoursMap, s: Slot) => `${m.id}|${s.wd}|${s.start}`;
export const slotLabel = (s: Slot) => `${WD[s.wd]} ${s.start}–${s.end}`;

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
export const daysBetween = (a: string, b: string) => Math.round((+new Date(`${b}T12:00:00`) - +new Date(`${a}T12:00:00`)) / 86400000);
export const weekdayOf = (iso: string) => new Date(`${iso}T12:00:00`).getDay();
/** "aaaa-mm-dd" → "dd/mm/aaaa". */
export const br = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
/** "aaaa-mm-dd" → "dd/mm". */
export const brShort = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");

/** Os dias úteis entre `from` e `to`, inclusive. */
export function weekdaysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  if (!from || !to || from > to) return out;
  for (let d = from, guard = 0; d <= to && guard < 120; d = addDays(d, 1), guard++) {
    const w = weekdayOf(d);
    if (w >= 1 && w <= 5) out.push(d);
  }
  return out;
}

export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
export const sessionsWord = (n: number) => plural(n, "sessão", "sessões");
export const hoursLabel = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1).replace(".", ",")}h`;

/* ------------------------------------------------------------
   Mapas de horas: quem pode assumir um horário
   ------------------------------------------------------------ */

export type Claims = Record<string, Slot[]>;

/**
 * Quem pode assumir UM horário: a escala cobre, sem paciente próprio no mesmo
 * horário, sem transferência programada para ele no horário e sem outro
 * horário já prometido nesta leva.
 */
export function candidates(
  profs: Professional[],
  maps: HoursMap[],
  scheduled: ScheduledTransfer[],
  map: HoursMap,
  slot: Slot,
  claims: Claims,
  cross: boolean,
): Professional[] {
  return profs.filter((p) => {
    if (p.id === map.profId) return false;
    if (!cross && p.specialty !== map.specialty) return false;
    if (!covers(p, slot)) return false;
    if (maps.some((m) => m.profId === p.id && m.id !== map.id && m.slots.some((x) => overlap(x, slot)))) return false;
    if (scheduled.some((sc) => sc.items.some((it) => it.pid === p.id && overlap(it.s, slot)))) return false;
    return !(claims[p.id] ?? []).some((c) => overlap(c, slot));
  });
}

/** Horários já comprometidos com uma transferência programada. */
export function lockedSlots(scheduled: ScheduledTransfer[]) {
  const o: Record<string, { date: string; pid: string }> = {};
  scheduled.forEach((sc) => sc.items.forEach((it) => (o[`${it.mapId}|${it.s.wd}|${it.s.start}`] = { date: sc.date, pid: it.pid })));
  return o;
}

/** As origens possíveis: quem tem mapa, com a contagem. */
export function originsOf(profs: Professional[], maps: HoursMap[]) {
  const ids = new Set(maps.map((m) => m.profId));
  return profs
    .filter((p) => ids.has(p.id))
    .map((p) => ({ id: p.id, label: `${p.name} · ${p.specialty}`, n: maps.filter((m) => m.profId === p.id).length }));
}

/**
 * A origem quando nenhuma foi escolhida: os mapas sem profissional, se algum
 * tiver destino possível; senão o primeiro profissional com destino possível.
 */
export function fallbackOrigin(profs: Professional[], maps: HoursMap[], scheduled: ScheduledTransfer[]) {
  const has = (list: HoursMap[]) => list.some((m) => m.slots.some((s) => candidates(profs, maps, scheduled, m, s, {}, false).length > 0));
  const orphans = maps.filter((m) => !m.profId);
  if (orphans.length > 0 && has(orphans)) return NO_PROF;
  const origins = originsOf(profs, maps);
  const good = origins.find((o) => has(maps.filter((m) => m.profId === o.id)));
  return (good ?? origins[0])?.id ?? (orphans.length > 0 ? NO_PROF : "");
}

/** A origem em tela: a escolhida, se ainda válida, ou a de `fallbackOrigin`. */
export function resolveOrigin(origin: string, profs: Professional[], maps: HoursMap[], scheduled: ScheduledTransfer[]) {
  const valid = origin === NO_PROF ? maps.some((m) => !m.profId) : originsOf(profs, maps).some((o) => o.id === origin);
  return valid ? origin : fallbackOrigin(profs, maps, scheduled);
}

export const originRows = (maps: HoursMap[], originId: string) =>
  maps.filter((m) => (originId === NO_PROF ? !m.profId : m.profId === originId));

/** Os horários livres (não programados) dos mapas da origem. */
export function freeSlots(rows: HoursMap[], locked: Record<string, unknown>) {
  return rows.flatMap((m) => m.slots.map((s) => ({ m, s, k: slotKey(m, s) }))).filter((x) => !locked[x.k]);
}

/** Distribuição automática: cada horário livre vai para quem recebeu menos. */
export function distributeMaps(
  profs: Professional[],
  maps: HoursMap[],
  scheduled: ScheduledTransfer[],
  rows: HoursMap[],
  assign: Record<string, string>,
  cross: boolean,
) {
  const all = freeSlots(rows, lockedSlots(scheduled));
  const claims: Claims = {};
  const load: Record<string, number> = {};
  const next = { ...assign };
  let ok = 0;
  all.forEach(({ m, s, k }) => {
    const current = next[k];
    if (current) {
      (claims[current] ??= []).push(s);
      return;
    }
    const cands = candidates(profs, maps, scheduled, m, s, claims, cross);
    if (!cands.length) return;
    const pick = [...cands].sort((a, b) => (load[a.id] ?? 0) - (load[b.id] ?? 0))[0]!;
    next[k] = pick.id;
    load[pick.id] = (load[pick.id] ?? 0) + 1;
    (claims[pick.id] ??= []).push(s);
    ok++;
  });
  return { assign: next, ok, total: all.length };
}

/**
 * Aplica as movimentações sobre os mapas: os horários que saem viram (ou
 * entram em) um mapa do destino; o resto fica com a origem.
 */
export function executeMoves(prev: HoursMap[], items: MoveItem[], stamp: string): HoursMap[] {
  const byMap: Record<string, MoveItem[]> = {};
  items.forEach((it) => (byMap[it.mapId] ??= []).push(it));
  let out = prev.slice();
  Object.keys(byMap).forEach((mapId) => {
    const m = out.find((x) => x.id === mapId);
    if (!m) return;
    const groups: Record<string, Slot[]> = {};
    const moving = (s: Slot) => byMap[mapId]!.find((it) => it.s.wd === s.wd && it.s.start === s.start);
    m.slots.forEach((s) => {
      const it = moving(s);
      if (it) (groups[it.pid] ??= []).push(s);
    });
    const rest = m.slots.filter((s) => !moving(s));
    const pids = Object.keys(groups);
    if (!pids.length) return;
    if (rest.length === 0 && pids.length === 1) {
      out = out.map((x) => (x.id === m.id ? { ...x, profId: pids[0]!, reason: "" } : x));
      return;
    }
    out = rest.length ? out.map((x) => (x.id === m.id ? { ...x, slots: rest } : x)) : out.filter((x) => x.id !== m.id);
    pids.forEach((pid) => {
      const ex = out.find((x) => x.profId === pid && x.patient === m.patient && x.specialty === m.specialty);
      if (ex) out = out.map((x) => (x.id === ex.id ? { ...x, slots: [...x.slots, ...groups[pid]!] } : x));
      else out = [...out, { ...m, id: `${m.id}-${pid}-${stamp}`, profId: pid, slots: groups[pid]!, reason: "" }];
    });
  });
  return out;
}

/* ------------------------------------------------------------
   Sessões do período
   ------------------------------------------------------------ */

export type SessionFilters = { from: string; to: string; spec: string; prof: string };

/** As sessões concretas do período, expandidas dos mapas com profissional. */
export function sessionsOf(profs: Professional[], maps: HoursMap[], f: SessionFilters): Session[] {
  const days = weekdaysBetween(f.from, f.to);
  const out: Session[] = [];
  maps.forEach((m) => {
    if (!m.profId) return;
    const p = profs.find((x) => x.id === m.profId);
    if (!p || (f.spec && p.specialty !== f.spec) || (f.prof && p.id !== f.prof)) return;
    m.slots.forEach((sl) =>
      days
        .filter((d) => weekdayOf(d) === sl.wd)
        .forEach((d) => out.push({ id: `${m.id}|${d}|${sl.start}`, profId: p.id, date: d, wd: sl.wd, start: sl.start, end: sl.end, patient: m.patient, specialty: m.specialty })),
    );
  });
  return out.sort((x, y) => x.date.localeCompare(y.date) || toMin(x.start) - toMin(y.start));
}

/** Chave "profissional|data|início" de quem já recebeu uma sessão. */
export const takenKey = (pid: string, s: Pick<Session, "date" | "start">) => `${pid}|${s.date}|${s.start}`;

/**
 * Substituto elegível: a escala cobre, sem paciente próprio no horário, não é
 * o titular e não recebeu outra sessão no mesmo dia e horário nesta leva.
 */
export function eligible(profs: Professional[], maps: HoursMap[], s: Session, taken: Record<string, unknown>, cross: boolean) {
  return profs.filter((p) => {
    if (p.id === s.profId) return false;
    if (!cross && p.specialty !== s.specialty) return false;
    if (!covers(p, s)) return false;
    if (maps.some((m) => m.profId === p.id && m.slots.some((x) => x.wd === s.wd && toMin(x.start) < toMin(s.end) && toMin(x.end) > toMin(s.start)))) return false;
    return !taken[takenKey(p.id, s)];
  });
}

/** Distribui as sessões pendentes, priorizando quem recebeu menos. */
export function distributeSessions(
  profs: Professional[],
  maps: HoursMap[],
  sessions: Session[],
  applied: Record<string, string>,
  assign: Record<string, string>,
  cross: boolean,
) {
  const pending = sessions.filter((s) => !applied[s.id]);
  const taken: Record<string, true> = {};
  const load: Record<string, number> = {};
  const next = { ...assign };
  sessions.forEach((s) => {
    const pid = applied[s.id];
    if (pid) taken[takenKey(pid, s)] = true;
  });
  let ok = 0;
  pending.forEach((s) => {
    const cands = eligible(profs, maps, s, taken, cross);
    if (!cands.length) {
      // Sem substituto: fica para escolher, ou cancelada se já estava.
      if (next[s.id] !== CANCEL) delete next[s.id];
      return;
    }
    const pick = [...cands].sort((x, y) => (load[x.id] ?? 0) - (load[y.id] ?? 0))[0]!;
    next[s.id] = pick.id;
    load[pick.id] = (load[pick.id] ?? 0) + 1;
    taken[takenKey(pick.id, s)] = true;
    ok++;
  });
  return { assign: next, ok, total: pending.length };
}
