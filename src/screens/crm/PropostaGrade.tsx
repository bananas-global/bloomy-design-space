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
import { useRef, useState } from "react";
import logo from "../../assets/bloomy-logo.svg";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input, SwitchCard } from "../../components/Input.js";
import { DrawerModal, Modal } from "../../components/Overlay.js";
import { TODAY } from "../../components/today.js";
import { UNITS, fmtBR, guardianOf, operatorName, type Grade, type GradeWa, type Lead, type WeekBlock } from "./model.js";
import type { Up } from "./NegocioTab.js";
import { SQUARE_DRAWER, Banner, Note, Subhead, cx, opts } from "./parts.js";
import { Entry, SendStatus, SimButton, WhatsDrawer, fakeLink } from "./Send.js";
import { DAYS, SPEC_NAMES, first, hh, importWeek, mix, profState, profsOf, runLabel, runs, shortName, suggest, tone } from "./week.js";
import { BlockEditor, HoursSummary, SpecPills, WeekGrid, WeekLayout, useWeekEditor } from "./WeekGrid.js";
import "./print.css";

const WA_STATUS: Record<GradeWa["status"], [string, "yellow" | "green" | "orange"]> = {
  enviado: ["Aguardando resposta", "yellow"],
  aceita: ["Família aceitou", "green"],
  ajustes: ["Pediu ajustes", "orange"],
};

const DAY_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const TO_DEFINE = "A definir";
const uniq = (list: string[]) => [...new Set(list)];
/** Cada bloco da grade é uma hora. */
const hours = (n: number) => `${n}h`;

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
      {exp && grade && <ExportModal lead={lead} grade={grade} onClose={() => setExp(false)} />}
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

/**
 * O documento para a família, no formato do Plano Terapêutico (Padrão de
 * Agenda): modal em tela cheia com a folha A4 à esquerda e as opções à
 * direita. A folha cresce com o conteúdo; "Baixar PDF" imprime só a folha.
 */
function ExportModal({ lead, grade, onClose }: { lead: Lead; grade: Grade; onClose: () => void }) {
  return (
    <Modal
      id="grade_export"
      show
      onCancel={onClose}
      aria-label="Exportar proposta de grade"
      variant="custom"
      customSize="h-full max-h-full! rounded-none! m-0! flex flex-col [&>div:last-child]:flex-1 [&>div:last-child]:min-h-0"
      withPadding={false}
    >
      <ExportBody lead={lead} grade={grade} onClose={onClose} />
    </Modal>
  );
}

function ExportBody({ lead, grade, onClose }: { lead: Lead; grade: Grade; onClose: () => void }) {
  const [showProfs, setShowProfs] = useState(true);
  const [showNeed, setShowNeed] = useState(true);
  const [obs, setObs] = useState("");
  const [zoom, setZoom] = useState(1);
  const doc = useRef<HTMLElement>(null);

  const rs = runs(grade.blocks);
  const g = guardianOf(lead);
  const child = lead.child || "Criança";
  const sum = summaryOf(lead, grade.blocks);
  const bySpec = sum
    .filter((s) => s.got > 0 || (showNeed && s.need > 0))
    .map((s) => {
      const its = rs.filter((r) => r.spec === s.spec);
      const profs = uniq(its.map((r) => r.professional ?? "").filter(Boolean).map(shortName));
      return { ...s, profs: [...profs, ...(its.some((r) => !r.professional) ? [TO_DEFINE] : [])] };
    });
  const needTotal = sum.reduce((t, s) => t + s.need, 0);
  // Sábado só entra quando a proposta usa.
  const days = DAYS.filter((wd) => wd < 6 || rs.some((r) => r.weekday === wd)).map((wd) => ({ wd, items: rs.filter((r) => r.weekday === wd) }));
  const activeDays = days.filter((d) => d.items.length > 0);
  const withoutProf = rs.filter((r) => !r.professional).length;
  const sessionLines = 3 + (showProfs ? 1 : 0);

  const zoomBy = (delta: number) => setZoom((z) => Math.min(2, Math.max(0.5, Math.round((z + delta) * 10) / 10)));

  // Imprime uma cópia da folha, direto no `body`: o resto da página sai do
  // layout (`display: none`) e não sobra página em branco depois da folha.
  function download() {
    if (!doc.current) return;
    const previous = document.title;
    const root = document.createElement("div");
    root.className = "pg-print-root";
    root.appendChild(doc.current.cloneNode(true));
    document.body.appendChild(root);
    document.title = `Proposta de grade - ${child}`;
    document.body.classList.add("pg-printing");
    const done = () => {
      document.body.classList.remove("pg-printing");
      root.remove();
      document.title = previous;
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.setTimeout(() => window.print(), 50);
  }

  const th = "pb-[0.6em] text-[0.82em] font-black uppercase tracking-wider text-brand-purple-dark/55";
  const td = "py-[0.7em] align-top border-t border-brand-purple-dark/10";
  const sectionTitle = "text-[1.15em] font-black uppercase tracking-wider text-brand-blue-dark";

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="relative bg-background overflow-auto p-7 max-lg:order-2">
        <div className="sticky top-0 z-10 float-right -mt-3 -mr-3 flex items-center gap-0.5 p-1 bg-white rounded-lg shadow-main print:hidden">
          <Button type="button" variant="ghost" size="small" aria-label="Diminuir zoom" disabled={zoom <= 0.5} onClick={() => zoomBy(-0.1)}>
            <Icon name="fa-minus" />
          </Button>
          <Button type="button" variant="ghost" size="small" title="Redefinir zoom" className="min-w-13" onClick={() => setZoom(1)}>
            {`${Math.round(zoom * 100)}%`}
          </Button>
          <Button type="button" variant="ghost" size="small" aria-label="Aumentar zoom" disabled={zoom >= 2} onClick={() => zoomBy(0.1)}>
            <Icon name="fa-plus" />
          </Button>
        </div>

        <article
          ref={doc}
          className="pg-doc mx-auto w-[210mm] min-h-[297mm] bg-white shadow-main box-border px-[14mm] pt-[14mm] pb-[10mm] flex flex-col gap-[1.4em] text-[11px] text-brand-purple-dark"
          style={{ zoom }}
        >
          <header className="flex items-center justify-between gap-4 pb-[1em] border-b-2 border-brand-blue">
            <img src={logo} alt="bloomy" className="h-[34px]" />
            <div className="text-right">
              <h1 className="font-black text-[1.9em] leading-tight">Proposta de grade</h1>
              <p className="text-brand-purple-dark/60">Grade semanal de atendimentos proposta para a família</p>
            </div>
          </header>

          <dl className="grid grid-cols-[1.4fr_1.2fr_1fr_1fr_0.8fr] gap-2.5">
            {[
              ["Criança", child],
              ["Responsável", g.name || "—"],
              ["Operadora", operatorName(lead, "—")],
              ["Unidade", grade.unit],
              ["Emitido em", fmtBR(TODAY)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[0.82em] font-black uppercase tracking-wider text-brand-purple-dark/55">{label}</dt>
                <dd className="mt-0.5 text-[1.1em] font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-4 gap-[0.75em]">
            {[
              [rs.length, "sessões por semana"],
              [hours(grade.blocks.length), "carga horária semanal"],
              [bySpec.filter((s) => s.got > 0).length, "especialidades"],
              [activeDays.length, "dias com atendimento"],
            ].map(([value, label]) => (
              <div key={label} className="px-[1.1em] py-[0.9em] rounded-xl bg-brand-blue/10">
                <b className="block text-[1.8em] leading-tight font-black text-brand-blue-dark">{value}</b>
                <span className="block mt-[0.15em] font-bold text-brand-purple-dark/65">{label}</span>
              </div>
            ))}
          </div>

          <section className="flex flex-col gap-[0.6em]">
            <h2 className={sectionTitle}>Carga por especialidade</h2>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className={th}>Especialidade</th>
                  {showProfs && <th className={th}>Profissionais</th>}
                  {showNeed && <th className={cx(th, "pl-[1.2em] text-right whitespace-nowrap")}>Pedido</th>}
                  <th className={cx(th, "pl-[1.2em] text-right whitespace-nowrap")}>Proposto</th>
                </tr>
              </thead>
              <tbody>
                {bySpec.map((s) => (
                  <tr key={s.spec}>
                    <td className={cx(td, "pr-[1em] font-extrabold whitespace-nowrap")}>
                      <span className="inline-block size-[0.6em] mr-[0.5em] rounded-full" style={{ background: tone(s.spec) }} />
                      {s.spec}
                    </td>
                    {showProfs && <td className={cx(td, "pr-[1em]")}>{s.profs.join(", ") || "—"}</td>}
                    {showNeed && <td className={cx(td, "text-right text-brand-purple-dark/60")}>{s.need ? hours(s.need) : "—"}</td>}
                    <td className={cx(td, "text-right", showNeed && s.need > 0 && s.got < s.need && "font-bold text-orange-dark")}>{hours(s.got)}</td>
                  </tr>
                ))}
                <tr className="font-black">
                  <td className={td} colSpan={showProfs ? 2 : 1}>Total</td>
                  {showNeed && <td className={cx(td, "text-right")}>{needTotal ? hours(needTotal) : "—"}</td>}
                  <td className={cx(td, "text-right")}>{hours(grade.blocks.length)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="flex flex-col gap-[0.6em]">
            <h2 className={sectionTitle}>Rotina semanal</h2>
            <div className="grid gap-[0.6em]" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
              {days.map((d) => (
                <div key={d.wd} className="flex flex-col gap-[0.5em]">
                  <div className="flex items-center justify-between px-[0.8em] py-[0.5em] rounded-lg bg-brand-purple-dark text-white font-extrabold">
                    <span>{DAY_FULL[d.wd - 1]}</span>
                    <span>{hours(d.items.reduce((t, r) => t + r.to - r.hour, 0))}</span>
                  </div>
                  {d.items.length === 0 && <p className="px-[0.8em] text-[0.9em] text-brand-purple-dark/50">Sem atendimentos</p>}
                  {d.items.map((r) => (
                    <div
                      key={r.id}
                      className="box-border overflow-hidden break-inside-avoid px-[0.7em] py-[0.55em] rounded-md flex flex-col leading-[1.3em]"
                      style={{ height: `${sessionLines * 1.3 + 1.1}em`, background: mix(tone(r.spec), 12) }}
                    >
                      <span className="text-[0.9em] font-bold text-brand-purple-dark/60">{`${hh(r.hour)}–${hh(r.to)}`}</span>
                      <span className="font-black">{r.spec}</span>
                      <span className="text-[0.9em] text-brand-purple-dark/60">{hours(r.to - r.hour)}</span>
                      {showProfs && <span className={cx("truncate text-[0.95em] font-bold", !r.professional && "text-orange-dark italic")}>{r.professional ? shortName(r.professional) : TO_DEFINE}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {obs.trim() && (
            <section className="flex flex-col gap-[0.5em]">
              <h2 className={sectionTitle}>Observações</h2>
              <p className="whitespace-pre-wrap text-[1.05em]">{obs.trim()}</p>
            </section>
          )}

          <p className="text-[0.95em] text-brand-purple-dark/60">Proposta sujeita a confirmação e à autorização do plano de saúde. Os horários dependem da disponibilidade da equipe.</p>

          <footer className="mt-auto pt-[1.8em] grid grid-cols-2 gap-10">
            {["Coordenação da unidade", "Responsável legal"].map((label) => (
              <div key={label}>
                <span className="block border-t border-brand-purple-dark" />
                <p className="mt-1.5 text-[11px] font-bold text-center text-brand-purple-dark/70">{label}</p>
              </div>
            ))}
          </footer>
        </article>
      </div>
      <aside className="flex flex-col gap-4 p-6 border-l border-neutral-100 overflow-auto max-lg:border-l-0 max-lg:border-b max-lg:order-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-bold text-2xl text-blue-dark">Proposta de grade</h1>
          <Button type="button" variant="tint" aria-label="close" onClick={onClose}>
            <Icon name="fa-times" className="block w-4 h-4 self-center" />
          </Button>
        </div>
        <p className="-mt-2 text-sm text-brand-purple-dark/60">Resumo da grade semanal proposta para {first(lead.child) || "a criança"}, para enviar à família.</p>

        <div className="flex flex-col gap-2">
          <SwitchCard
            field={{ id: "grade_export_profissionais", name: "grade[professionals]", value: showProfs }}
            title="Exibir profissionais"
            description={showProfs ? "Nome do profissional em cada sessão" : "Só a especialidade e o horário aparecem"}
            onChange={(event) => setShowProfs(event.target.checked)}
          />
          {showProfs && withoutProf > 0 && (
            <p className="flex gap-2 items-start text-sm font-bold text-orange-dark">
              <Icon type="solid" name="fa-triangle-exclamation" className="mt-0.5" />
              {withoutProf === 1 ? `1 sessão sem profissional aparece como "${TO_DEFINE}".` : `${withoutProf} sessões sem profissional aparecem como "${TO_DEFINE}".`}
            </p>
          )}
        </div>
        <SwitchCard
          field={{ id: "grade_export_pedido", name: "grade[requested]", value: showNeed }}
          title="Comparar com o pedido"
          description="Horas pedidas por especialidade ao lado das propostas"
          onChange={(event) => setShowNeed(event.target.checked)}
        />

        <Input
          type="textarea"
          id="grade_export_obs"
          name="grade[notes]"
          label="Observações para a família"
          placeholder="Opcional. Ex.: horários podem ser ajustados após a primeira semana."
          value={obs}
          onChange={(event) => setObs(event.target.value)}
        />

        <div className="mt-auto flex justify-between gap-2.5">
          <Button type="button" variant="tint" onClick={onClose}>Fechar</Button>
          <Button type="button" rightIcon="fa-file-pdf" disabled={rs.length === 0} onClick={download}>Baixar PDF</Button>
        </div>
      </aside>
    </div>
  );
}
