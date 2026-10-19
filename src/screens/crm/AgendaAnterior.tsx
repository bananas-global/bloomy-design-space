/**
 * CRM de Leads — Agenda anterior, na aba Negócio.
 * Novo — não existe no Phoenix.
 *
 * A semana de terapias que a criança faz hoje em outra clínica (dia, hora e
 * especialidade, sem profissional). Serve de referência para a Proposta de
 * grade. A equipe registra na grade; a família preenche pelo
 * pedido do cartão Preenchimento pela família.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { DrawerModal } from "../../components/Overlay.js";
import { TODAY } from "../../components/today.js";
import { fmtBR, type CurrentWeek, type Lead, type WeekBlock } from "./model.js";
import type { Up } from "./NegocioTab.js";
import { byFamily } from "./FamilyRequest.js";
import { SQUARE_DRAWER, Banner, Note, Section } from "./parts.js";
import { tone, totals } from "./week.js";
import { BlockEditor, HoursSummary, SpecPills, WeekGrid, WeekLayout, useWeekEditor } from "./WeekGrid.js";

export function AgendaAnterior({ lead, up }: { lead: Lead; up: Up }) {
  const [open, setOpen] = useState(false);
  const cw = lead.currentWeek;
  const blocks = cw?.blocks ?? [];
  const fromFam = cw?.src === "familia";

  return (
    <Section
      anchor="agenda-anterior"
      title="Agenda anterior"
      desc="O que a criança já faz hoje em outra clínica: dia, horário e especialidade. Serve de referência para a proposta de grade."
      tag={blocks.length ? `${blocks.length}h semanais` : null}
      fam={byFamily(lead, "agenda")}
      action={
        <Button type="button" variant={blocks.length ? "tint" : "default"} rightIcon="fa-pen" onClick={() => setOpen(true)}>
          {blocks.length ? (fromFam && !cw!.reviewed ? "Revisar agenda" : "Editar agenda") : "Registrar agenda"}
        </Button>
      }
    >
      <Note>
        {!cw || !blocks.length
          ? "Nenhuma agenda registrada."
          : fromFam ? `Preenchida por ${cw.by} em ${fmtBR(cw.at)}${cw.reviewed ? " · revisada pela equipe" : " · aguardando revisão da equipe"}.` : `Registrada pela equipe em ${fmtBR(cw.at)}.`}
      </Note>
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
    </Section>
  );
}

function AgendaDrawer({ lead, onClose, onSave }: { lead: Lead; onClose: () => void; onSave: (patch: Partial<Lead>) => void }) {
  const init = lead.currentWeek;
  const [blocks, setBlocks] = useState<WeekBlock[]>(() => (init?.blocks ?? []).map((b) => ({ ...b })));
  const editor = useWeekEditor({ blocks, setBlocks, defaultSpec: lead.specialties[0]?.spec ?? "Análise do Comportamento" });
  const fromFam = init?.src === "familia";

  function save() {
    const currentWeek: CurrentWeek | null = blocks.length
      ? fromFam ? { ...init!, blocks, reviewed: true } : { blocks, src: "equipe", at: TODAY }
      : null;
    onSave({ currentWeek });
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
