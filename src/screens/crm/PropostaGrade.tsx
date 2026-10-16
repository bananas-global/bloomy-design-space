/**
 * CRM de Leads — Proposta de grade, na aba Visita.
 * Novo — não existe no Phoenix.
 *
 * A grade semanal possível na Bloomy (dia, hora, especialidade e
 * profissional) que a coordenação alinha com a família. Montada na mesma
 * grade do Padrão de Agenda, com os profissionais livres da unidade em cada
 * horário; pode partir da Agenda anterior. Vai para a família em PDF ou por
 * WhatsApp, e a resposta (aceite ou pedido de ajuste) volta para cá.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { DrawerModal } from "../../components/Overlay.js";
import { TODAY } from "../../components/today.js";
import { UNITS, fmtBR, guardianOf, operatorName, type Grade, type GradeWa, type Lead, type WeekBlock } from "./model.js";
import type { Up } from "./NegocioTab.js";
import { SQUARE_DRAWER, Banner, Note, Subhead, cx, opts } from "./parts.js";
import { Entry, SendStatus, SimButton, WhatsDrawer, fakeLink } from "./Send.js";
import { DAYS, DAY_SHORT, SPEC_NAMES, first, hh, importWeek, profState, profsOf, runLabel, runs, shortName, suggest, tone } from "./week.js";
import { BlockEditor, HoursSummary, SpecPills, WeekGrid, WeekLayout, useWeekEditor } from "./WeekGrid.js";

const WA_STATUS: Record<GradeWa["status"], [string, "yellow" | "green" | "orange"]> = {
  enviado: ["Aguardando resposta", "yellow"],
  aceita: ["Família aceitou", "green"],
  ajustes: ["Pediu ajustes", "orange"],
};

/** Proposto × pedido, por especialidade: o pedido vem da carga horária do comercial. */
const summaryOf = (lead: Lead, blocks: WeekBlock[]) => {
  const requested = lead.specialties.filter((s) => s.spec && Number(s.hours) > 0);
  const specs = SPEC_NAMES.filter((s) => requested.some((r) => r.spec === s) || blocks.some((b) => b.spec === s));
  return specs.map((spec) => ({ spec, got: blocks.filter((b) => b.spec === spec).length, need: Number(requested.find((r) => r.spec === spec)?.hours ?? 0) }));
};

export function PropostaGrade({ lead, up }: { lead: Lead; up: Up }) {
  const [open, setOpen] = useState<false | "edit" | "import">(false);
  const [wa, setWa] = useState(false);
  const [exp, setExp] = useState(false);
  const grade = lead.grade;
  const blocks = grade?.blocks ?? [];
  const cur = lead.currentWeek?.blocks ?? [];
  const w = grade?.wa ?? null;
  const g = guardianOf(lead);
  const child = first(lead.child) || "a criança";
  const changed = !!w && w.hours !== blocks.length;
  const sessions = runs(blocks).length;
  const setGradeWa = (next: GradeWa | null) => grade && up({ grade: { ...grade, wa: next } });

  return (
    <div className="space-y-3">
      <Entry
        icon="fa-table-cells"
        title="Proposta de grade"
        desc={blocks.length ? `${grade!.unit} · ${blocks.length}h por semana · ${sessions} sess${sessions > 1 ? "ões" : "ão"}` : "Monte a grade semanal possível na Bloomy para alinhar com a família."}
        actions={
          <>
            {blocks.length > 0 && <Button type="button" variant="tint" color="purple" rightIcon="fa-file-pdf" onClick={() => setExp(true)}>Exportar PDF</Button>}
            {blocks.length > 0 && <Button type="button" variant="tint" color="green" rightIcon="fa-brands fa-whatsapp" onClick={() => setWa(true)}>{w ? "Reenviar" : "Enviar"} por WhatsApp</Button>}
            {cur.length > 0 && <Button type="button" variant="tint" rightIcon="fa-file-import" onClick={() => setOpen("import")}>Importar da clínica atual</Button>}
            <Button type="button" variant={blocks.length ? "tint" : "default"} rightIcon="fa-table-cells" onClick={() => setOpen("edit")}>{blocks.length ? "Editar proposta" : "Montar proposta"}</Button>
          </>
        }
      />
      {w && (
        <SendStatus
          send={w}
          label="Proposta enviada para"
          status={[WA_STATUS[w.status], ...(changed ? [["Grade alterada depois do envio", "yellow"] as [string, "yellow"]] : [])]}
          actions={
            w.status === "enviado" ? (
              <>
                <SimButton onClick={() => setGradeWa({ ...w, status: "aceita", reply: "", repliedAt: TODAY })}>Simular aceite</SimButton>
                <SimButton onClick={() => setGradeWa({ ...w, status: "ajustes", reply: "Terça não conseguimos. Dá para passar a fono para quinta no mesmo horário?", repliedAt: TODAY })}>Simular pedido de ajuste</SimButton>
              </>
            ) : (
              <Button type="button" size="small" variant="ghost" onClick={() => setGradeWa({ ...w, status: "enviado", reply: "", repliedAt: "" })}>Desfazer resposta</Button>
            )
          }
        >
          {w.reply && <p className="m-0 flex gap-2 text-sm italic text-brand-purple-dark/80"><Icon name="fa-comment" className="mt-0.5" />“{w.reply}” · {fmtBR(w.repliedAt)}</p>}
        </SendStatus>
      )}
      {cur.length === 0 && <Note><Icon name="fa-lightbulb" className="mr-1.5" />Registre a Agenda anterior (aba Negócio) para importar os mesmos dias, horários e especialidades para esta proposta.</Note>}
      {blocks.length > 0 && (
        <>
          <Subhead>Horários propostos</Subhead>
          <ul className="m-0 list-none divide-y divide-brand-purple-dark/10 p-0">
            {runs(blocks).map((r) => (
              <li key={r.id} className="grid grid-cols-[auto_120px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 py-2 text-sm">
                <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: tone(r.spec) }} />
                <b className="tabular-nums text-brand-purple-dark">{runLabel(r)}</b>
                <span className="truncate text-brand-purple-dark">{r.spec}</span>
                <span className={cx("truncate", r.professional ? "text-brand-purple-dark/70" : "font-semibold text-orange-dark")}>{r.professional ? shortName(r.professional) : "Sem profissional"}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {open && (
        <GradeDrawer
          lead={lead}
          autoImport={open === "import"}
          onClose={() => setOpen(false)}
          onSave={(next) => { up({ grade: next }); setOpen(false); }}
        />
      )}
      {exp && grade && <ExportDrawer lead={lead} grade={grade} onClose={() => setExp(false)} />}
      {wa && grade && (
        <WhatsDrawer
          id="grade_whatsapp"
          show
          title={w ? "Reenviar proposta" : "Enviar proposta por WhatsApp"}
          subtitle="O responsável vê a grade pelo link e responde se aceita ou se quer ajustes."
          guardian={g.name}
          phone={g.phone}
          message={`Olá${g.name ? `, ${first(g.name)}` : ""}! Aqui é da Bloomy. Montamos a proposta de grade semanal de ${child}: ${blocks.length}h por semana, na unidade ${grade.unit}. Pelo link você vê os dias e horários e nos conta se está tudo certo ou se prefere ajustar algum horário.`}
          link={w?.link ?? fakeLink("grade", lead.id)}
          note="O link fica válido por 7 dias. A resposta da família aparece aqui, no card da proposta."
          prev={w}
          onClose={() => setWa(false)}
          onSend={(s) => { setGradeWa({ ...s, status: "enviado", reply: "", repliedAt: "", hours: blocks.length }); setWa(false); }}
        />
      )}
    </div>
  );
}

function GradeDrawer({ lead, autoImport, onClose, onSave }: { lead: Lead; autoImport: boolean; onClose: () => void; onSave: (g: Grade) => void }) {
  const saved = lead.grade;
  const cur = lead.currentWeek?.blocks ?? [];
  const [unit, setUnit] = useState(saved?.unit || lead.prefUnit || UNITS[0]!);
  const [imp, setImp] = useState<ReturnType<typeof importWeek> | null>(() => (autoImport ? importWeek(saved?.blocks ?? [], cur, saved?.unit || lead.prefUnit || UNITS[0]!) : null));
  const [blocks, setBlocks] = useState<WeekBlock[]>(() => imp?.blocks ?? (saved?.blocks ?? []).map((b) => ({ ...b })));
  const [lens, setLens] = useState("");
  const editor = useWeekEditor({ blocks, setBlocks, unit, lens, defaultSpec: lead.specialties[0]?.spec ?? "Análise do Comportamento" });
  const freeCount = (wd: number, h: number) => profsOf(unit, lens).filter((p) => profState(p, wd, h, blocks, null).s === "free").length;
  const noProf = blocks.filter((b) => !b.professional).length;

  const doImport = () => { const r = importWeek(blocks, cur, unit); setBlocks(r.blocks); setImp(r); };
  const suggestAll = () => {
    let acc = [...blocks];
    acc = acc.map((b) => (b.professional ? b : { ...b, professional: suggest(unit, b.spec, b.weekday, b.hour, acc, b.id) }));
    setBlocks(acc);
  };
  const changeUnit = (u: string) => { setUnit(u); setBlocks((l) => l.map((b) => ({ ...b, professional: "" }))); editor.close(); setImp(null); };

  return (
    <DrawerModal id="grade_proposal" className={SQUARE_DRAWER} show title="Proposta de grade" variant="custom" customSize="max-w-7xl" contentClass="flex flex-col" onCancel={onClose}>
      <div className="flex flex-1 flex-col gap-5">
        <p className="m-0 text-sm font-semibold text-brand-purple-dark/70">{lead.child || "Criança"} · a grade semanal na Bloomy, com profissional, para alinhar com a família.</p>
        <div className="flex flex-wrap items-end gap-3">
          <Input type="select" id="grade_unit" label="Unidade" clear={false} options={opts(UNITS)} value={unit} className="min-w-56" onChange={(v) => v && changeUnit(v)} />
          <span className="flex-1" />
          {cur.length > 0 && <Button type="button" variant="tint" rightIcon="fa-file-import" onClick={doImport}>Importar agenda da clínica atual</Button>}
          {noProf > 0 && <Button type="button" variant="tint" rightIcon="fa-wand-magic-sparkles" onClick={suggestAll}>Sugerir profissionais</Button>}
        </div>
        {imp && (
          <Banner tone={imp.noProf ? "orange" : "green"} icon="fa-file-import">
            {imp.added} horário{imp.added === 1 ? "" : "s"} importado{imp.added === 1 ? "" : "s"} da agenda anterior
            {imp.skipped ? `, ${imp.skipped} já ocupado${imp.skipped === 1 ? "" : "s"} na proposta` : ""}
            {imp.noProf ? `. ${imp.noProf} sem profissional livre em ${unit}: troque o horário ou a unidade.` : ", todos com profissional livre."}
          </Banner>
        )}
        <WeekLayout
          aside={
            <>
              <BlockEditor editor={editor} blocks={blocks} availability={lead.availability} unit={unit} />
              <HoursSummary title="Proposto × pedido" rows={summaryOf(lead, blocks)} />
            </>
          }
        >
          <SpecPills blocks={blocks} lens={lens} onLens={setLens} />
          <WeekGrid blocks={blocks} editor={editor} availability={lead.availability} lens={lens} freeCount={lens ? freeCount : undefined} label="Proposta de grade" />
        </WeekLayout>
        <div className="sticky -bottom-6 -mx-6 -mb-6 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 bg-white px-6 py-4">
          <Button type="button" variant="tint" rightIcon="fa-xmark" onClick={onClose}>Cancelar</Button>
          <Button type="button" rightIcon="fa-check" onClick={() => onSave({ unit, blocks, updatedAt: TODAY, wa: saved?.wa ?? null })}>Salvar proposta</Button>
        </div>
      </div>
    </DrawerModal>
  );
}

/** O documento para a família: resumo por especialidade e a rotina da semana. */
function ExportDrawer({ lead, grade, onClose }: { lead: Lead; grade: Grade; onClose: () => void }) {
  const [obs, setObs] = useState("");
  const rs = runs(grade.blocks);
  const sum = summaryOf(lead, grade.blocks).filter((s) => s.got > 0);
  const byDay = DAYS.map((wd) => ({ wd, items: rs.filter((r) => r.weekday === wd) })).filter((d) => d.items.length);

  function download() {
    const win = window.open("", "_blank");
    if (!win) return;
    const doc = document.getElementById("grade_export_doc")?.outerHTML ?? "";
    const css = [...document.querySelectorAll("style, link[rel=stylesheet]")].map((n) => n.outerHTML).join("");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Proposta de grade · ${lead.child}</title>${css}</head><body style="background:#fff;padding:32px">${doc}</body></html>`);
    win.document.close();
    win.onload = () => win.print();
  }

  return (
    <DrawerModal id="grade_export" className={SQUARE_DRAWER} show title="Exportar proposta de grade" variant="large" onCancel={onClose}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <p className="m-0 text-sm font-semibold text-brand-purple-dark/70">Resumo da grade semanal proposta para {first(lead.child) || "a criança"}, para enviar à família.</p>
          <Input id="grade_export_obs" type="textarea" rows={4} label="Observações para a família" placeholder="Opcional. Ex.: horários podem ser ajustados após a primeira semana." value={obs} onChange={(e) => setObs(e.target.value)} />
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="tint" onClick={onClose}>Fechar</Button>
            <Button type="button" rightIcon="fa-file-pdf" onClick={download}>Baixar PDF</Button>
          </div>
        </div>

        <article id="grade_export_doc" className="flex flex-col gap-5 rounded-xl border border-neutral-100 p-6 text-brand-purple-dark">
          <header className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-widest text-brand-blue-dark">Proposta de grade</p>
              <h2 className="m-0 text-2xl font-extrabold">{lead.child || "Criança"}</h2>
              <p className="m-0 text-sm text-brand-purple-dark/70">{grade.unit} · {operatorName(lead)} · emitida em {fmtBR(TODAY)}</p>
            </div>
            <span className="text-xl font-black text-brand-blue">bloomy</span>
          </header>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-neutral-50 p-3"><b className="block text-2xl font-extrabold">{rs.length}</b><span className="text-sm text-brand-purple-dark/70">sessões por semana</span></div>
            <div className="rounded-lg bg-neutral-50 p-3"><b className="block text-2xl font-extrabold">{grade.blocks.length}h</b><span className="text-sm text-brand-purple-dark/70">carga horária semanal</span></div>
          </div>
          <section className="flex flex-col gap-2">
            <h3 className="m-0 text-sm font-bold uppercase tracking-widest text-brand-purple-dark/60">Carga por especialidade</h3>
            {sum.map((s) => (
              <p key={s.spec} className="m-0 flex items-center gap-2.5 text-sm"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: tone(s.spec) }} /><span className="flex-1">{s.spec}</span><b>{s.got}h</b></p>
            ))}
          </section>
          <section className="flex flex-col gap-3">
            <h3 className="m-0 text-sm font-bold uppercase tracking-widest text-brand-purple-dark/60">Rotina semanal</h3>
            {byDay.map((d) => (
              <div key={d.wd} className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 text-sm">
                <b>{DAY_SHORT[d.wd - 1]}</b>
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                  {d.items.map((r) => (
                    <li key={r.id} className="flex flex-wrap gap-x-2"><span className="tabular-nums font-semibold">{hh(r.hour)}–{hh(r.to)}</span><span>{r.spec}</span><span className="text-brand-purple-dark/60">{r.professional ? `com ${shortName(r.professional)}` : "profissional a definir"}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
          {obs.trim() && (
            <section className="flex flex-col gap-1">
              <h3 className="m-0 text-sm font-bold uppercase tracking-widest text-brand-purple-dark/60">Observações</h3>
              <p className="m-0 whitespace-pre-line text-sm">{obs}</p>
            </section>
          )}
          <p className="m-0 text-xs text-brand-purple-dark/60">Proposta sujeita a confirmação e à autorização do plano de saúde. Os horários dependem da disponibilidade da equipe.</p>
        </article>
      </div>
    </DrawerModal>
  );
}
