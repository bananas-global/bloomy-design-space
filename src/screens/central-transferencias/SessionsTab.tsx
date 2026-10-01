/**
 * Central de Transferências — sub-aba Sessões do período.
 *
 * Cobertura pontual: lista as sessões concretas de um período (de todos os
 * profissionais, filtráveis por especialidade e profissional) e troca o
 * responsável sem tocar no mapa de horas. O motivo da ausência é informado só
 * na hora de transferir.
 */
import { Button } from "../../components/Button.js";
import { Input } from "../../components/Input.js";
import { ABSENCE_REASONS, CANCEL, WD, brShort, sessionsWord, weekdayOf, type Session } from "./model.js";
import { CrossException, Empty, ItemCard, ListActions, SidePanel, SlotTag, StatusTag, Summary, Who } from "./parts.js";
import { useTransferCenter } from "./store.js";

function SessionRow({ s }: { s: Session }) {
  const { state, profById, sessionCandidates, setSessionDest } = useTransferCenter();
  const done = state.sApplied[s.id];
  const pid = done || state.sAssign[s.id] || "";
  const cands = done ? [] : sessionCandidates(s);
  return (
    <div className="flex min-h-10 items-center gap-2.5">
      <SlotTag className="tabular-nums">{`${s.start}–${s.end}`}</SlotTag>
      <b className={["flex-1 truncate text-sm font-bold", done ? "text-brand-purple-dark/55" : "text-brand-purple-dark"].join(" ")}>{s.patient}</b>
      {done ? (
        <StatusTag status="ok" icon="fa-user-check">{profById(done)?.name ?? "—"}</StatusTag>
      ) : cands.length === 0 && pid !== CANCEL ? (
        <StatusTag status="soft" icon="fa-user-slash">{state.sCross ? "Sem substituto disponível" : "Só fora da especialidade"}</StatusTag>
      ) : (
        <Input
          type="select"
          id={`substituto-${s.id}`}
          name={`substituto[${s.id}]`}
          prompt="Escolher substituto…"
          value={pid}
          options={[
            ...cands.map((p): [string, string] => [`${p.name}${p.specialty !== s.specialty ? ` · ${p.specialty}` : ""} · ${p.room}`, p.id]),
            ["Sem cobertura — cancelar sessão", CANCEL],
          ]}
          className="w-[260px] shrink-0"
          onChange={(v) => setSessionDest(s.id, v ?? "")}
        />
      )}
    </div>
  );
}

/** A coluna da lista: período, filtros e as sessões por dia e titular. */
export function SessionsList() {
  const { state, sessions, pending, groups, specialties, profOptions, profById, setPeriod, setSpec, setProf, setSCross, setSWhy, distributeS } = useTransferCenter();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <Input
          type="date"
          id="sessoes-de"
          name="sessoes[de]"
          label="De"
          value={state.sFrom}
          className="max-w-[220px] flex-[1_1_140px]"
          onChange={(e) => setPeriod(e.target.value, e.target.value > state.sTo ? e.target.value : state.sTo)}
        />
        <Input type="date" id="sessoes-ate" name="sessoes[ate]" label="Até" value={state.sTo} min={state.sFrom} className="max-w-[220px] flex-[1_1_140px]" onChange={(e) => setPeriod(state.sFrom, e.target.value)} />
        <Input
          type="select"
          id="sessoes-especialidade"
          name="sessoes[especialidade]"
          label="Especialidade"
          prompt="Todas"
          value={state.sSpec}
          options={specialties.map((x): [string, string] => [x, x])}
          className="max-w-[220px] flex-[1_1_140px]"
          onChange={(v) => setSpec(v ?? "")}
        />
        <Input
          type="select"
          id="sessoes-profissional"
          name="sessoes[profissional]"
          label="Profissional"
          prompt="Todos"
          value={state.sProf}
          options={profOptions.map((p): [string, string] => [p.name, p.id])}
          className="max-w-[220px] flex-[1_1_140px]"
          onChange={(v) => setProf(v ?? "")}
        />
        <ListActions id="sessoes-outra-especialidade" cross={state.sCross} onCross={setSCross} disabled={pending.length === 0} onDistribute={distributeS} />
      </div>

      {state.sCross && <CrossException id="sessoes-motivo-excecao" why={state.sWhy} onWhy={setSWhy} record="da sessão" />}

      {pending.length === 0 ? (
        <Empty icon="fa-calendar-xmark">{sessions.length ? "Todas as sessões destes filtros já foram transferidas." : "Nenhuma sessão com estes filtros."}</Empty>
      ) : (
        groups.map((g) => (
          <div key={g.date} className="flex flex-col gap-2.5">
            <div className="flex items-baseline gap-2.5">
              <b className="text-sm font-black text-brand-purple-dark">{`${WD[weekdayOf(g.date)]}, ${brShort(g.date)}`}</b>
              <span className="text-xs font-bold text-brand-purple-dark/45">{`${g.total} ${sessionsWord(g.total)}`}</span>
            </div>
            {g.profs.map(({ pid, list }) => {
              const prof = profById(pid);
              const withSub = list.filter((s) => state.sApplied[s.id] || (state.sAssign[s.id] && state.sAssign[s.id] !== CANCEL)).length;
              return (
                <ItemCard key={pid}>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <Who name={prof?.name ?? "—"} detail={`${prof?.specialty ?? ""} · ${list.length} ${sessionsWord(list.length)}`} />
                    <span className="shrink-0 text-xs font-extrabold text-brand-purple-dark/45">{`${withSub} de ${list.length} com substituto`}</span>
                  </div>
                  <div className="flex flex-col">
                    {list.map((s) => (
                      <SessionRow key={s.id} s={s} />
                    ))}
                  </div>
                </ItemCard>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

/** A coluna lateral: a cobertura, o motivo da ausência e a observação. */
export function SessionsSide() {
  const { state, selected, covered, cancelled, sCrossReady, setReason, setNote, resetS, applyS } = useTransferCenter();
  const canApply = covered.length > 0 && Boolean(state.sReason) && sCrossReady;

  return (
    <SidePanel
      title="Cobertura do período"
      subtitle={`${brShort(state.sFrom)}${state.sTo !== state.sFrom ? ` a ${brShort(state.sTo)}` : ""} · os mapas de horas não mudam`}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={resetS}>
            Limpar
          </Button>
          <Button type="button" leftIcon="fa-check" iconType="solid" className="gap-2" disabled={!canApply} title={covered.length && !state.sReason ? "Informe o motivo" : !sCrossReady ? "Descreva o motivo da exceção" : undefined} onClick={applyS}>
            {`Transferir ${covered.length} ${sessionsWord(covered.length)}`}
          </Button>
        </>
      }
    >
      <Summary
        lines={[
          ["Sessões com destino definido", selected.length],
          ["Com substituto", covered.length],
          ["Canceladas", cancelled.length],
          ["Sem definição", selected.length - covered.length - cancelled.length],
        ]}
      />
      <Input
        type="select"
        id="sessoes-motivo"
        name="sessoes[motivo]"
        label="Motivo da ausência"
        prompt="Selecione o motivo…"
        value={state.sReason}
        options={ABSENCE_REASONS.map((r): [string, string] => [r, r])}
        onChange={(v) => setReason(v ?? "")}
      />
      <Input type="textarea" id="sessoes-observacao" name="sessoes[observacao]" label="Observação" rows={4} placeholder="Ex.: avisar as famílias por WhatsApp" value={state.sNote} onChange={(e) => setNote(e.target.value)} />
    </SidePanel>
  );
}
