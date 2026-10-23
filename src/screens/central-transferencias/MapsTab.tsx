/**
 * Central de Transferências — sub-aba Mapas de horas.
 *
 * Trabalha de um profissional para outros: escolhe-se a origem e cada horário
 * do mapa recebe o próprio destino. Um paciente pode acabar dividido entre
 * vários profissionais — o mapa é fatiado ao aplicar. A transferência é
 * imediata ou programada para uma data; as programadas ficam listadas ao lado,
 * com Cancelar e Antecipar.
 */
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { RadioGroup } from "../../components/Choice.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { EmptyStateCard } from "../../components/Layout.js";
import { Tag } from "../../components/Tag.js";
import { TODAY } from "./fixtures.js";
import { MIXED, NO_PROF, WD, addDays, br, brShort, daysBetween, hours, hoursLabel, plural, slotKey, slotLabel, type HoursMap, type ScheduledTransfer } from "./model.js";
import { CrossException, DEST_WIDTH, Hint, ItemCard, ListActions, SidePanel, SlotTag, StatusTag, Summary, Who } from "./parts.js";
import { MIN_START, useTransferCenter } from "./store.js";

const slotsWord = (n: number) => plural(n, "horário", "horários");
const mapsWord = (n: number) => plural(n, "mapa", "mapas");

/** O seletor de destino de um mapa inteiro ou de um horário. */
function DestSelect({ id, value, options, className, onChange }: { id: string; value: string; options: [string, string][]; className?: string; onChange: (pid: string) => void }) {
  return (
    <Input
      type="select"
      id={id}
      name={id}
      prompt="Manter com a origem"
      value={value}
      options={options}
      className={[DEST_WIDTH, className].filter(Boolean).join(" ")}
      onChange={(v) => onChange(v ?? "")}
    />
  );
}

function MapCard({ m }: { m: HoursMap }) {
  const { state, locked, professionals, profById, crossWouldHelp, slotCandidates, mapCandidates, toggleOpen, setMapDest, setSlotDest } = useTransferCenter();
  const isOpen = Boolean(state.open[m.id]);
  const done = m.slots.filter((s) => state.assign[slotKey(m, s)]).length;
  const lk = m.slots.filter((s) => locked[slotKey(m, s)]).length;
  const free = m.slots.filter((s) => !locked[slotKey(m, s)]);
  const pids = [...new Set(free.map((s) => state.assign[slotKey(m, s)] ?? ""))];
  const mixed = pids.length > 1;
  const allPid = mixed ? MIXED : (pids[0] ?? "");
  const all = mapCandidates(m);
  const option = (pid: string): [string, string] => {
    const p = profById(pid);
    return [p ? `${p.name} · ${p.room}` : pid, pid];
  };
  const allOptions: [string, string][] = [
    ...(mixed ? ([["Personalizado por horário", MIXED]] as [string, string][]) : []),
    ...all.map((p) => option(p.id)),
    ...(allPid && allPid !== MIXED && !all.some((p) => p.id === allPid) ? [[profById(allPid)?.name ?? allPid, allPid] as [string, string]] : []),
  ];
  const count = m.slots.length - lk;

  return (
    <ItemCard>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Who name={m.patient} detail={`${m.specialty} · ${hoursLabel(hours(m.slots))}/sem`} />
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="text-xs font-extrabold text-brand-purple-dark/45">
            {`${done} de ${count} ${slotsWord(count)} com destino${lk > 0 ? ` · ${lk} ${plural(lk, "programado", "programados")}` : ""}`}
          </span>
          <Button type="button" size="medium" variant="ghost" leftIcon={isOpen ? "fa-chevron-up" : "fa-list"} iconType="solid" className="gap-1.5" onClick={() => toggleOpen(m.id)}>
            {isOpen ? "Recolher" : "Detalhar"}
          </Button>
        </div>
      </div>

      {!isOpen && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {m.slots.map((s) => (
              <SlotTag key={slotKey(m, s)}>{slotLabel(s)}</SlotTag>
            ))}
          </div>
          {free.length > 0 &&
            (all.length === 0 && !mixed && !allPid ? (
              <StatusTag status="soft" icon="fa-user-slash">Ninguém cobre todos os horários</StatusTag>
            ) : (
              <DestSelect id={`destino-${m.id}`} className="ml-auto" value={allPid} options={allOptions} onChange={(pid) => setMapDest(m, pid)} />
            ))}
        </div>
      )}

      {isOpen &&
        m.slots.map((s) => {
          const k = slotKey(m, s);
          const lock = locked[k];
          if (lock)
            return (
              <div key={k} className="flex items-center justify-end gap-2.5">
                <SlotTag className="opacity-60">{slotLabel(s)}</SlotTag>
                <Icon name="fa-arrow-right" type="solid" className="text-[10px] text-brand-purple-dark/30" />
                <StatusTag status="prog" icon="fa-calendar-check">{`${profById(lock.pid)?.name ?? "—"} a partir de ${brShort(lock.date)}`}</StatusTag>
              </div>
            );
          const cands = slotCandidates(m, s);
          const pid = state.assign[k] ?? "";
          const options: [string, string][] = [...cands.map((p) => option(p.id)), ...(pid && !cands.some((p) => p.id === pid) ? [[professionals.find((p) => p.id === pid)?.name ?? pid, pid] as [string, string]] : [])];
          return (
            <div key={k} className="flex items-center justify-end gap-2.5">
              <SlotTag>{slotLabel(s)}</SlotTag>
              <Icon name="fa-arrow-right" type="solid" className={["text-[10px]", pid ? "text-brand-blue" : "text-brand-purple-dark/30"].join(" ")} />
              {cands.length === 0 && !pid ? (
                <StatusTag status={crossWouldHelp ? "soft" : "bad"} icon="fa-user-slash">
                  {crossWouldHelp ? "Só fora da especialidade" : "Sem destino neste horário"}
                </StatusTag>
              ) : (
                <DestSelect id={`destino-${k}`} value={pid} options={options} onChange={(v) => setSlotDest(k, v)} />
              )}
            </div>
          );
        })}
    </ItemCard>
  );
}

/** A coluna da lista: origem, exceção, contagem e os mapas da origem. */
export function MapsList() {
  const { state, origins, orphanCount, originId, rows, allSlots, assigned, lockedCount, crossWouldHelp, setOrigin, setCross, setWhy, distribute } = useTransferCenter();
  const originOptions: [string, string][] = [
    ...origins.map((o): [string, string] => [`${o.label} · ${o.n} ${mapsWord(o.n)}`, o.id]),
    ...(orphanCount > 0 ? [[`Sem profissional (inativos) · ${orphanCount} ${mapsWord(orphanCount)}`, NO_PROF] as [string, string]] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <Input
          type="select"
          id="transferencia-origem"
          name="transferencia[origem]"
          label="Profissional de origem"
          value={originId}
          options={originOptions}
          clear={false}
          className="min-w-[280px] max-w-[420px] flex-1"
          onChange={(v) => v && setOrigin(v)}
        />
        <ListActions id="transferencia-outra-especialidade" cross={state.cross} onCross={setCross} disabled={allSlots.length === 0} onDistribute={distribute} />
      </div>

      {state.cross && <CrossException id="transferencia-motivo" why={state.why} onWhy={setWhy} />}

      <p className="text-sm text-brand-purple-dark/60">
        {`${allSlots.length} ${slotsWord(allSlots.length)} em ${rows.length} ${mapsWord(rows.length)} · ${assigned.length} com destino${lockedCount > 0 ? ` · ${lockedCount} ${plural(lockedCount, "programado", "programados")}` : ""}`}
      </p>

      {crossWouldHelp && (
        <Hint warn icon="fa-circle-exclamation">
          Nenhum profissional da mesma especialidade cobre estes horários.
          <button type="button" className="ml-2 cursor-pointer font-extrabold text-brand-blue-dark underline" onClick={() => setCross(true)}>
            Ver outras especialidades
          </button>
        </Hint>
      )}

      {rows.length === 0 ? (
        <EmptyStateCard icon="fa-circle-check" text={originId === NO_PROF ? "Nenhum mapa sem profissional — fila zerada." : "Este profissional não tem mais mapas — pronto para inativar."} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((m) => (
            <MapCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduledCard({ sc }: { sc: ScheduledTransfer }) {
  const { profById, runNow, cancelScheduled } = useTransferCenter();
  const d = daysBetween(TODAY, sc.date);
  const byPatient: { patient: string; items: ScheduledTransfer["items"] }[] = [];
  sc.items.forEach((i) => {
    let g = byPatient.find((x) => x.patient === i.patient);
    if (!g) byPatient.push((g = { patient: i.patient, items: [] }));
    g.items.push(i);
  });

  return (
    <ItemCard>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <Icon name="fa-calendar" className="self-center text-sm text-brand-blue" />
          <b className="text-sm font-extrabold text-brand-purple-dark">{brShort(sc.date)}</b>
          <span className="text-xs font-bold text-brand-purple-dark/50">{d <= 0 ? "hoje" : `em ${d} ${plural(d, "dia", "dias")}`}</span>
        </div>
        <div className="flex gap-1.5">
          <Button type="button" size="small" variant="tint" color="red" onClick={() => cancelScheduled(sc)}>
            Cancelar
          </Button>
          <Button type="button" size="small" variant="tint" title="Aplicar hoje" onClick={() => runNow(sc)}>
            Antecipar
          </Button>
        </div>
      </div>
      {sc.why && <Tag pill item="Outra especialidade" variant="orange" className="self-start text-xs" />}
      <p className="flex items-baseline gap-1.5 text-sm">
        <span className="font-bold text-brand-purple-dark/50">Origem</span>
        <b className="font-extrabold text-brand-purple-dark">{sc.originName}</b>
      </p>
      <div className="flex flex-col gap-2.5">
        {byPatient.map((g) => (
          <div key={g.patient} className="flex flex-col gap-1">
            <b className="text-sm font-extrabold text-brand-purple-dark">{g.patient}</b>
            {g.items.map((i, n) => (
              <div key={n} className="flex items-center gap-2">
                <SlotTag>{`${WD[i.s.wd]} ${i.s.start}–${i.s.end}`}</SlotTag>
                <Icon name="fa-arrow-right" type="solid" className="text-[10px] text-brand-purple-dark/35" />
                <Tag item={profById(i.pid)?.name ?? "—"} variant="dark-blue" className="truncate" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </ItemCard>
  );
}

/** A coluna lateral: início, resumo, para quem vai e as programadas. */
export function MapsSide() {
  const { state, originId, originProf, rows, allSlots, assigned, crossReady, dateReady, scheduledSorted, profById, setWhen, setStartDate, reset, apply } = useTransferCenter();
  const destIds = [...new Set(assigned.map((x) => state.assign[x.k]!))];
  const prog = state.when === "prog";
  const n = assigned.length;
  const ahead = daysBetween(TODAY, state.startDate);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SidePanel
        title={originId === NO_PROF ? "Mapas sem profissional" : (originProf?.name ?? "—")}
        subtitle={`${rows.length} ${mapsWord(rows.length)} · ${hoursLabel(hours(rows.flatMap((m) => m.slots)))} por semana${originProf ? ` · ${originProf.room}` : ""}`}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={reset}>
              Limpar
            </Button>
            <Button
              type="button"
              leftIcon={prog ? "fa-calendar-check" : "fa-check"}
              iconType="solid"
              className="gap-2"
              disabled={n === 0 || !crossReady || !dateReady}
              title={!crossReady ? "Descreva o motivo da exceção" : !dateReady ? "Escolha a data de início" : undefined}
              onClick={apply}
            >
              {prog ? `Programar ${n} para ${brShort(state.startDate)}` : `Transferir ${n} ${slotsWord(n)}`}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <RadioGroup
            label="Início da transferência"
            field={{ id: "transferencia-inicio", name: "transferencia[inicio]", value: state.when }}
            radio={[
              { value: "now", label: "Imediata" },
              { value: "prog", label: "Programada" },
            ]}
            onChange={(e) => setWhen(e.target.value === "prog" ? "prog" : "now")}
          />
          {prog && <Input type="date" id="transferencia-data" name="transferencia[data]" value={state.startDate} min={MIN_START} onChange={(e) => setStartDate(e.target.value)} />}
          <Hint>
            {!prog
              ? "Os horários passam hoje para o destino, incluindo os atendimentos já agendados."
              : dateReady
                ? `Até ${br(addDays(state.startDate, -1))} os atendimentos seguem com a origem. A partir de ${br(state.startDate)} (em ${ahead} ${plural(ahead, "dia", "dias")}) passam para o destino. Os horários ficam reservados até lá.`
                : "Escolha uma data a partir de amanhã."}
          </Hint>
        </div>

        <Summary
          title="Resumo"
          lines={[
            ["Horários com destino", `${n} de ${allSlots.length}`],
            ["Horas a transferir", hoursLabel(hours(assigned.map((x) => x.s)))],
            ["Profissionais de destino", destIds.length],
            ["Permanecem na origem", hoursLabel(hours(allSlots.filter((x) => !state.assign[x.k]).map((x) => x.s)))],
            ["Início", prog ? br(state.startDate) : "Hoje"],
          ]}
        />
        {n > 0 && (
          <Summary
            title="Para quem vai"
            lines={destIds.map((pid): [string, string] => [profById(pid)?.name ?? pid, hoursLabel(hours(assigned.filter((x) => state.assign[x.k] === pid).map((x) => x.s)))])}
          />
        )}
      </SidePanel>

      {scheduledSorted.length > 0 && (
        <Card>
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-brand-purple-dark">Transferências programadas</h3>
              <p className="text-sm text-brand-purple-dark/60">{`${scheduledSorted.length} ${plural(scheduledSorted.length, "agendada", "agendadas")} · aplicadas na data de início`}</p>
            </div>
            {scheduledSorted.map((sc) => (
              <ScheduledCard key={sc.id} sc={sc} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
