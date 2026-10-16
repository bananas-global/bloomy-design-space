/**
 * CRM de Leads — Agenda anterior, na aba Negócio.
 * Novo — não existe no Phoenix.
 *
 * A semana de terapias que a criança faz hoje em outra clínica (dia, hora e
 * especialidade, sem profissional). Serve de base para a carga horária e para
 * a Proposta de grade. A equipe registra na grade ou manda o link para o
 * responsável preencher pelo WhatsApp.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { DrawerModal } from "../../components/Overlay.js";
import { SwitchCard } from "../../components/Input.js";
import { TODAY } from "../../components/today.js";
import { fmtBR, guardianOf, type CurrentWeek, type Lead, type WeekBlock } from "./model.js";
import type { Up } from "./NegocioTab.js";
import { SQUARE_DRAWER, Banner, fld } from "./parts.js";
import { Entry, SendStatus, SimButton, WhatsDrawer, fakeLink } from "./Send.js";
import { first, toAvailability, toSpecialties, tone, totals } from "./week.js";
import { BlockEditor, HoursSummary, SpecPills, WeekGrid, WeekLayout, useWeekEditor } from "./WeekGrid.js";

/** Protótipo: a resposta do responsável pelo link. */
const simulated = (l: Lead): CurrentWeek => ({
  blocks: [
    ...[1, 3, 5].flatMap((wd) => [14, 15].map((h) => ({ id: `f${wd}${h}`, weekday: wd, hour: h, spec: "Análise do Comportamento" }))),
    { id: "f215", weekday: 2, hour: 15, spec: "Fonoaudiologia" },
    { id: "f415", weekday: 4, hour: 15, spec: "Terapia Ocupacional" },
  ],
  src: "familia", by: guardianOf(l).name || "Responsável", at: TODAY, reviewed: false,
});

export function AgendaAnterior({ lead, up }: { lead: Lead; up: Up }) {
  const [open, setOpen] = useState(false);
  const [wa, setWa] = useState(false);
  const cw = lead.currentWeek;
  const blocks = cw?.blocks ?? [];
  const req = lead.currentWeekReq;
  const fromFam = cw?.src === "familia";
  const g = guardianOf(lead);
  const child = first(lead.child) || "a criança";

  return (
    <div className="space-y-3">
      <Entry
        icon="fa-calendar-week"
        title={blocks.length ? `${blocks.length} horário${blocks.length > 1 ? "s" : ""} por semana · ${blocks.length}h` : "Nenhuma agenda registrada"}
        desc={
          blocks.length
            ? fromFam ? `Preenchida por ${cw!.by} em ${fmtBR(cw!.at)}${cw!.reviewed ? " · revisada pela equipe" : " · aguardando revisão da equipe"}` : `Registrada pela equipe em ${fmtBR(cw!.at)}`
            : "Registre você mesmo ou envie o link para o responsável preencher pelo WhatsApp."
        }
        actions={
          <>
            <Button type="button" variant="tint" color="green" rightIcon="fa-brands fa-whatsapp" onClick={() => setWa(true)}>{req ? "Reenviar" : "Enviar"} por WhatsApp</Button>
            <Button type="button" variant={blocks.length ? "tint" : "default"} rightIcon="fa-pen" onClick={() => setOpen(true)}>
              {blocks.length ? (fromFam && !cw!.reviewed ? "Revisar agenda" : "Editar agenda") : "Registrar agenda"}
            </Button>
          </>
        }
      />
      {req && (
        <SendStatus
          send={req}
          label="Link enviado para"
          status={[fromFam ? (cw!.reviewed ? ["Revisada", "green"] : ["Respondida · revisar", "orange"]) : ["Aguardando resposta", "yellow"]]}
          actions={!fromFam && <SimButton onClick={() => up({ currentWeek: simulated(lead) })}>Simular resposta da família</SimButton>}
        />
      )}
      {blocks.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0">
          {totals(blocks).map((t) => (
            <li key={t.spec} className="flex items-center gap-2 text-sm font-semibold text-brand-purple-dark">
              <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: tone(t.spec) }} />{t.spec}<b className="font-extrabold">{t.hours}h</b>
            </li>
          ))}
        </ul>
      )}

      {open && <AgendaDrawer lead={lead} onClose={() => setOpen(false)} onSave={(patch) => { up(patch); setOpen(false); }} />}
      {wa && (
        <WhatsDrawer
          id="current_week_whatsapp"
          show
          title={req ? "Reenviar por WhatsApp" : "Enviar por WhatsApp"}
          subtitle="O responsável preenche a agenda na clínica atual pelo link, sem precisar do app."
          guardian={g.name}
          phone={g.phone}
          message={`Olá${g.name ? `, ${first(g.name)}` : ""}! Aqui é da Bloomy. Para montarmos a grade de ${child}, conte pra gente como é a agenda semanal de terapias que ${child} faz hoje: dia, horário e especialidade. É rápido e não precisa de cadastro.`}
          link={req?.link ?? fakeLink("agenda", lead.id)}
          note="O link fica válido por 7 dias. Quando o responsável enviar, a agenda aparece aqui marcada como preenchida por ele, e a equipe revisa antes de usar."
          prev={req}
          onClose={() => setWa(false)}
          onSend={(w) => { up({ currentWeekReq: w }); setWa(false); }}
        />
      )}
    </div>
  );
}

function AgendaDrawer({ lead, onClose, onSave }: { lead: Lead; onClose: () => void; onSave: (patch: Partial<Lead>) => void }) {
  const init = lead.currentWeek;
  const [blocks, setBlocks] = useState<WeekBlock[]>(() => (init?.blocks ?? []).map((b) => ({ ...b })));
  const [useHours, setUseHours] = useState(false);
  const [useAvail, setUseAvail] = useState(false);
  const editor = useWeekEditor({ blocks, setBlocks, defaultSpec: lead.specialties[0]?.spec ?? "Análise do Comportamento" });
  const fromFam = init?.src === "familia";

  function save() {
    const currentWeek: CurrentWeek | null = blocks.length
      ? fromFam ? { ...init!, blocks, reviewed: true } : { blocks, src: "equipe", at: TODAY }
      : null;
    onSave({
      currentWeek,
      ...(useHours && blocks.length ? { specialties: toSpecialties(blocks) } : {}),
      ...(useAvail && blocks.length ? { availability: toAvailability(blocks) } : {}),
    });
  }

  return (
    <DrawerModal id="current_week" className={SQUARE_DRAWER} show title="Agenda na clínica atual" variant="custom" customSize="max-w-7xl" contentClass="flex flex-col" onCancel={onClose}>
      <div className="flex flex-1 flex-col gap-5">
        <p className="m-0 text-sm font-semibold text-brand-purple-dark/70">{lead.child || "Criança"} · a semana que a criança faz hoje em outra clínica. Dia, horário e especialidade, sem profissional.</p>
        {fromFam && (
          <Banner tone="green" icon="fa-brands fa-whatsapp">
            Preenchida por {init!.by} pelo link do WhatsApp em {fmtBR(init!.at)}. Ao salvar, a agenda fica marcada como revisada pela equipe.
          </Banner>
        )}
        <WeekLayout
          aside={
            <>
              <BlockEditor editor={editor} blocks={blocks} availability={lead.availability} />
              <HoursSummary title="Resumo da semana" rows={totals(blocks).map((t) => ({ spec: t.spec, got: t.hours }))} />
              <div className="flex flex-col gap-2">
                <p className="m-0 text-xs font-bold uppercase tracking-widest text-brand-purple-dark/60">Replicar na Bloomy</p>
                <SwitchCard field={fld("current_week_use_hours", useHours)} title="Usar como carga horária" description="Horas por especialidade no lead" onChange={(e) => setUseHours(e.target.checked)} />
                <SwitchCard field={fld("current_week_use_avail", useAvail)} title="Usar como disponibilidade" description="Estes horários viram a disponibilidade da família" onChange={(e) => setUseAvail(e.target.checked)} />
              </div>
            </>
          }
        >
          <SpecPills blocks={blocks} />
          <WeekGrid blocks={blocks} editor={editor} availability={lead.availability} label="Agenda na clínica atual" />
        </WeekLayout>
        <div className="sticky -bottom-6 -mx-6 -mb-6 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 bg-white px-6 py-4">
          <Button type="button" variant="tint" rightIcon="fa-xmark" onClick={onClose}>Cancelar</Button>
          <Button type="button" rightIcon="fa-check" onClick={save}>Salvar semana</Button>
        </div>
      </div>
    </DrawerModal>
  );
}
