/**
 * CRM de Leads — a prévia do formulário que a família abre pelo link do
 * WhatsApp ("Ver formulário").
 * Novo — não existe no Phoenix: no sistema, é uma página pública do portal
 * (sem o menu da clínica). Aqui abre por cima do negócio, como a página que a
 * família vê, só com o formulário e o Voltar; enviar as respostas faz o papel
 * da família no protótipo.
 *
 * O que já está no cadastro vem preenchido, para a família só conferir. As
 * perguntas menos óbvias trazem uma dica do porquê.
 */
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import logo from "../../assets/bloomy-logo.svg";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import {
  BEHAVIORS, COMMUNICATION, MOBILITY_LOCOMOTION, OPERATORS_IN, OPERATORS_OUT, OPERATOR_OTHER, REINFORCER_OPTIONS, RELATIONS, SCHOOL_SHIFTS, SENSORY,
  SPECIALTIES, SUPPORT_LEVELS, UNITS, guardianOf, type Lead, type ToggleOption,
} from "./model.js";
import { DIAG_CID, PERIODS, famSection, hasAnswer, initAnswers, type FamAnswers } from "./family.js";
import { cx, opts } from "./parts.js";
import { DAY_SHORT, first, hh } from "./week.js";

type Answers = Required<FamAnswers>;

function Q({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-[15px] font-bold text-brand-purple-dark">{label}</p>
      {hint && (
        <p className="m-0 flex gap-2 rounded-lg bg-brand-blue/10 px-3 py-2 text-[13px] leading-snug text-brand-blue-dark">
          <Icon name="fa-circle-info" type="solid" className="mt-0.5" /><span>{hint}</span>
        </p>
      )}
      {children}
    </div>
  );
}

function Pills({ options, value, onChange }: { options: readonly string[]; value: string | string[]; onChange: (v: string) => void }) {
  const on = (o: string) => (Array.isArray(value) ? value.includes(o) : value === o);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={on(o)}
          onClick={() => onChange(o)}
          className={cx(
            "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
            on(o) ? "border-brand-blue bg-brand-blue/10 text-brand-blue-dark" : "border-brand-purple-dark/15 text-brand-purple-dark/80 hover:bg-brand-purple-dark/5",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Check({ on, title, desc, onClick }: { on: boolean; title: string; desc?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        on ? "border-brand-blue/40 bg-brand-blue/10" : "border-brand-purple-dark/10",
      )}
    >
      <span className={cx("mt-0.5 grid h-5 w-5 place-items-center rounded text-[10px]", on ? "bg-brand-blue text-white" : "border border-brand-purple-dark/20 text-transparent")}><Icon name="fa-check" type="solid" /></span>
      <span>
        <b className="block text-sm text-brand-purple-dark">{title}</b>
        {desc && <span className="block text-xs text-brand-purple-dark/60">{desc}</span>}
      </span>
    </button>
  );
}

function Toggles({ items, value, onToggle }: { items: ToggleOption[]; value: Record<string, boolean>; onToggle: (id: string) => void }) {
  return <div className="flex flex-col gap-2">{items.map((b) => <Check key={b.id} on={!!value[b.id]} title={b.title} desc={b.desc} onClick={() => onToggle(b.id)} />)}</div>;
}

function FilePick({ id, value, onPick }: { id: string; value: string; onPick: (v: string) => void }) {
  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-purple-dark/10 px-3 py-2.5 text-sm text-brand-purple-dark">
        <Icon name="fa-paperclip" /><span className="min-w-0 flex-1 truncate font-semibold">{value}</span>
        <button type="button" aria-label="Remover arquivo" className="cursor-pointer text-red" onClick={() => onPick("")}><Icon name="fa-trash" /></button>
      </div>
    );
  }
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-brand-purple-dark/20 px-3 py-4 text-sm font-bold text-brand-blue-dark">
      <Icon name="fa-camera" type="solid" />Tirar foto ou escolher arquivo
      <input id={id} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f.name); e.target.value = ""; }} />
    </label>
  );
}

const HOUR_OPTS = Array.from({ length: 14 }, (_, i) => 7 + i).map((h) => [hh(h), String(h)] as const);
const DAY_OPTS = DAY_SHORT.map((d, i) => [d, String(i + 1)] as const);

export function FamilyFormPage({ lead, ids, prev, onClose, onSubmit }: {
  lead: Lead;
  ids: string[];
  prev?: Record<string, unknown>;
  onClose: () => void;
  onSubmit: (a: FamAnswers) => void;
}) {
  const [a, setA] = useState<Answers>(() => initAnswers(lead, prev));
  const set = <K extends keyof Answers>(sec: K, patch: Partial<Answers[K]>) => setA((s) => ({ ...s, [sec]: { ...s[sec], ...patch } }));
  const child = first(lead.child) || "a criança";
  const g = guardianOf(lead);
  const done = ids.filter((id) => hasAnswer(id, a)).length;
  const { resp: r, crianca: c, plano: p, carga: h, disp: d, agenda: ag, laudo: l, endereco: e, anamnese: an } = a;
  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const tgAn = (k: "behaviors" | "comm" | "sensory", id: string) => set("anamnese", { [k]: { ...an[k], [id]: !an[k][id] } });
  const upRow = (i: number, patch: Partial<Answers["agenda"]["rows"][number]>) => set("agenda", { rows: ag.rows.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  const body: Record<string, ReactNode> = {
    resp: (
      <>
        <Q label="Seu nome completo"><Input id="ff-resp-name" value={r.name} onChange={(x) => set("resp", { name: x.target.value })} /></Q>
        <Q label={`Parentesco com ${child}`}><Pills options={RELATIONS.slice(0, 5)} value={r.relation} onChange={(relation) => set("resp", { relation })} /></Q>
        <Q label="WhatsApp"><Input id="ff-resp-phone" placeholder="(11) 90000-0000" value={r.phone} onChange={(x) => set("resp", { phone: x.target.value })} /></Q>
        <Q label="E-mail"><Input id="ff-resp-email" type="email" value={r.email} onChange={(x) => set("resp", { email: x.target.value })} /></Q>
        <Q label="Quer cadastrar outro responsável?" hint="Pode ser o pai, a mãe, avós ou outra pessoa que leve a criança às sessões. Também avisamos essa pessoa sobre horários e mudanças.">
          <Pills options={["Sim", "Não"]} value={r.second} onChange={(v) => set("resp", { second: v as "Sim" | "Não" })} />
        </Q>
        {r.second === "Sim" && (
          <div className="flex flex-col gap-3 rounded-xl bg-neutral-50 p-3">
            <Input id="ff-resp-name2" placeholder="Nome" value={r.name2} onChange={(x) => set("resp", { name2: x.target.value })} />
            <Input type="select" id="ff-resp-rel2" clear={false} options={opts(RELATIONS)} value={r.rel2} onChange={(v) => v && set("resp", { rel2: v })} />
            <Input id="ff-resp-phone2" placeholder="WhatsApp" value={r.phone2} onChange={(x) => set("resp", { phone2: x.target.value })} />
          </div>
        )}
      </>
    ),
    crianca: (
      <>
        <Q label={`Nome completo de ${child}`}><Input id="ff-child-name" value={c.name} onChange={(x) => set("crianca", { name: x.target.value })} /></Q>
        <Q label="Data de nascimento"><Input id="ff-child-birth" type="date" value={c.birth} onChange={(x) => set("crianca", { birth: x.target.value })} /></Q>
        <Q label="Em qual turno estuda?" hint="Usamos para montar os horários das terapias fora do horário da escola."><Pills options={SCHOOL_SHIFTS} value={c.shift} onChange={(shift) => set("crianca", { shift })} /></Q>
      </>
    ),
    plano: (
      <>
        <Q label="Qual é o plano de saúde?">
          <Input
            type="select"
            id="ff-plan"
            prompt="Selecione"
            options={[...opts([...OPERATORS_IN, ...OPERATORS_OUT]), ["Não tenho plano (particular)", "Particular"], ["Outro", OPERATOR_OTHER]]}
            value={p.operator}
            onChange={(v) => set("plano", { operator: v ?? "" })}
          />
          {p.operator === OPERATOR_OTHER && <Input id="ff-plan-other" placeholder="Nome do plano" value={p.other} onChange={(x) => set("plano", { other: x.target.value })} />}
        </Q>
        {p.operator !== "Particular" && (
          <>
            <Q label="Número da carteirinha" hint={`É o número grande na frente da carteirinha de ${child} (não a do titular). Se for digital, aparece no app do plano.`}>
              <Input id="ff-plan-card" placeholder="Somente números" value={p.card} onChange={(x) => set("plano", { card: x.target.value })} />
            </Q>
            <Q label="Foto da carteirinha" hint="Com a foto, a gente confere os dados e agiliza o pedido de autorização ao plano."><FilePick id="ff-plan-file" value={p.file} onPick={(file) => set("plano", { file })} /></Q>
          </>
        )}
      </>
    ),
    carga: (
      <Q label="Quantas horas por semana o médico indicou?" hint="Essa informação fica no pedido médico ou laudo, geralmente escrita como “X horas semanais” para cada terapia. Preencha só as que aparecem no documento.">
        <div className="flex flex-col gap-2">
          {SPECIALTIES.map((s) => (
            <label key={s} className="grid grid-cols-[minmax(0,1fr)_88px_auto] items-center gap-2 text-sm font-semibold text-brand-purple-dark">
              <span>{s}</span>
              <Input id={`ff-hours-${s}`} type="number" min={0} max={40} placeholder="0" disabled={h.unknown} value={h.hours[s] || ""} onChange={(x) => set("carga", { hours: { ...h.hours, [s]: Number(x.target.value) || 0 } })} />
              <em className="not-italic text-xs text-brand-purple-dark/60">h/sem</em>
            </label>
          ))}
        </div>
        <Check on={h.unknown} title="Não sei / ainda não tenho o pedido" desc="Sem problema. A equipe confere com você depois." onClick={() => set("carga", { unknown: !h.unknown })} />
      </Q>
    ),
    disp: (
      <>
        <Q label={`Em quais dias e períodos ${child} pode vir à clínica?`} hint="Marque todas as opções possíveis, não só as preferidas. Quanto mais opções, mais rápido conseguimos encaixar as terapias.">
          <div className="grid grid-cols-[48px_1fr_1fr] gap-1.5 text-sm">
            <span />
            {PERIODS.map((x) => <span key={x.id} className="text-center text-xs font-bold uppercase tracking-widest text-brand-purple-dark/60">{x.label}</span>)}
            {DAY_SHORT.map((dn, i) => (
              <div key={dn} className="contents">
                <span className="self-center font-bold text-brand-purple-dark">{dn}</span>
                {PERIODS.map((x) => {
                  const k = `${i + 1}-${x.id}`;
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={!!d.cells[k]}
                      aria-label={`${dn} ${x.label}`}
                      onClick={() => set("disp", { cells: { ...d.cells, [k]: !d.cells[k] } })}
                      className={cx("grid h-10 cursor-pointer place-items-center rounded-lg", d.cells[k] ? "bg-brand-blue text-white" : "bg-brand-purple-dark/5 text-transparent")}
                    >
                      <Icon name="fa-check" type="solid" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </Q>
        <Q label="Alguma observação sobre horários?"><Input id="ff-disp-note" placeholder="Ex.: sai da escola às 12h30" value={d.note} onChange={(x) => set("disp", { note: x.target.value })} /></Q>
      </>
    ),
    agenda: (
      <Q label={`${child[0]!.toUpperCase()}${child.slice(1)} faz terapia hoje em outra clínica?`} hint="Se sim, conte os dias, horários e terapias. Assim planejamos a transição sem interromper o que já está funcionando.">
        <Pills options={["Sim", "Não"]} value={ag.has} onChange={(v) => set("agenda", { has: v as "Sim" | "Não" })} />
        {ag.has === "Sim" && (
          <div className="flex flex-col gap-3">
            {ag.rows.map((row, i) => (
              <div key={row.id} className="flex flex-col gap-2 rounded-xl bg-neutral-50 p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
                  <Input type="select" id={`ff-ag-${row.id}-day`} label="Dia" clear={false} options={DAY_OPTS} value={String(row.weekday)} onChange={(v) => v && upRow(i, { weekday: Number(v) })} />
                  <Input type="select" id={`ff-ag-${row.id}-from`} label="Das" clear={false} options={HOUR_OPTS} value={String(row.from)} onChange={(v) => v && upRow(i, { from: Number(v) })} />
                  <Input type="select" id={`ff-ag-${row.id}-to`} label="Até" clear={false} options={HOUR_OPTS} value={String(row.to)} onChange={(v) => v && upRow(i, { to: Number(v) })} />
                  <Button type="button" variant="tint" color="red" aria-label="Remover horário" onClick={() => set("agenda", { rows: ag.rows.filter((_, j) => j !== i) })}><Icon name="fa-trash" /></Button>
                </div>
                <Input type="select" id={`ff-ag-${row.id}-spec`} clear={false} options={opts(SPECIALTIES)} value={row.spec} onChange={(v) => v && upRow(i, { spec: v })} />
              </div>
            ))}
            <Button type="button" variant="tint" rightIcon="fa-plus" onClick={() => set("agenda", { rows: [...ag.rows, { id: `n${Date.now()}`, weekday: 1, from: 14, to: 15, spec: SPECIALTIES[0]! }] })}>Adicionar horário</Button>
          </div>
        )}
      </Q>
    ),
    laudo: (
      <>
        <Q label="Envie o laudo ou pedido médico" hint="Documento assinado pelo médico (neuropediatra, psiquiatra ou pediatra) com o diagnóstico e as terapias indicadas. O plano exige esse documento para autorizar. Pode ser foto, desde que esteja legível.">
          <FilePick id="ff-laudo-file" value={l.file} onPick={(file) => set("laudo", { file })} />
        </Q>
        <Q label="Nome do médico"><Input id="ff-laudo-doctor" value={l.doctor} onChange={(x) => set("laudo", { doctor: x.target.value })} /></Q>
        <Q label="Data do documento" hint="Fica perto da assinatura. Documentos com mais de 6 meses geralmente não são aceitos pelo plano."><Input id="ff-laudo-date" type="date" value={l.date} onChange={(x) => set("laudo", { date: x.target.value })} /></Q>
      </>
    ),
    endereco: (
      <>
        <Q label="CEP"><Input id="ff-addr-cep" placeholder="00000-000" value={e.cep} onChange={(x) => set("endereco", { cep: x.target.value })} /></Q>
        <Q label="Rua e número">
          <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2">
            <Input id="ff-addr-street" placeholder="Rua" value={e.street} onChange={(x) => set("endereco", { street: x.target.value })} />
            <Input id="ff-addr-number" placeholder="Nº" value={e.number} onChange={(x) => set("endereco", { number: x.target.value })} />
          </div>
        </Q>
        <Q label="Complemento"><Input id="ff-addr-comp" placeholder="Apto, bloco" value={e.comp} onChange={(x) => set("endereco", { comp: x.target.value })} /></Q>
        <Q label="Bairro e cidade">
          <div className="grid grid-cols-2 gap-2">
            <Input id="ff-addr-district" placeholder="Bairro" value={e.district} onChange={(x) => set("endereco", { district: x.target.value })} />
            <Input id="ff-addr-city" placeholder="Cidade" value={e.city} onChange={(x) => set("endereco", { city: x.target.value })} />
          </div>
        </Q>
        <Q label="Qual unidade fica melhor para vocês?" hint="Pense no trajeto da escola ou do trabalho até a clínica, não só na distância de casa.">
          <Pills options={[...UNITS, "Tanto faz"]} value={e.unit} onChange={(unit) => set("endereco", { unit })} />
        </Q>
      </>
    ),
    anamnese: (
      <>
        <Q label={`${child[0]!.toUpperCase()}${child.slice(1)} já tem algum diagnóstico?`}>
          <Pills options={Object.keys(DIAG_CID)} value={an.diag} onChange={(v) => set("anamnese", { diag: toggleIn(an.diag, v) })} />
          <Input id="ff-an-diag-other" placeholder="Outro diagnóstico (opcional)" value={an.diagOther} onChange={(x) => set("anamnese", { diagOther: x.target.value })} />
        </Q>
        <Q label="Qual o nível de suporte informado no laudo?" hint="No autismo, o laudo costuma indicar nível 1, 2 ou 3, conforme quanto apoio a criança precisa no dia a dia. Se não estiver escrito, marque “Não sei”.">
          <Pills options={[...SUPPORT_LEVELS, "Não sei"]} value={an.support} onChange={(support) => set("anamnese", { support })} />
        </Q>
        <Q label="Já fez alguma terapia antes?"><Pills options={["Sim", "Não"]} value={an.priorTherapy} onChange={(priorTherapy) => set("anamnese", { priorTherapy })} /></Q>
        <Q label="Marque o que acontece com frequência" hint="Ajuda a equipe a preparar a sala e o primeiro contato. Não existe resposta errada.">
          <Toggles items={BEHAVIORS} value={an.behaviors} onToggle={(id) => tgAn("behaviors", id)} />
        </Q>
        <Q label={`Como ${child} se comunica hoje?`}><Toggles items={COMMUNICATION} value={an.comm} onToggle={(id) => tgAn("comm", id)} /></Q>
        <Q label="Sentidos e movimento" hint="Reações a sons, luzes, toque ou necessidade de se mexer muito. Isso orienta a escolha da sala e dos materiais.">
          <Toggles items={SENSORY} value={an.sensory} onToggle={(id) => tgAn("sensory", id)} />
        </Q>
        <Q label="Como se locomove?"><Pills options={MOBILITY_LOCOMOTION} value={an.locomotion} onChange={(locomotion) => set("anamnese", { locomotion })} /></Q>
        <Q label="Do que gosta?" hint="Brinquedos, atividades, músicas ou comidas que deixam a criança motivada. Usamos nas sessões como recompensa.">
          <Pills options={REINFORCER_OPTIONS} value={an.reinforcers} onChange={(v) => set("anamnese", { reinforcers: toggleIn(an.reinforcers, v) })} />
        </Q>
        <Q label="Quer contar mais alguma coisa?"><Input id="ff-an-notes" type="textarea" rows={3} placeholder="Opcional" value={an.notes} onChange={(x) => set("anamnese", { notes: x.target.value })} /></Q>
      </>
    ),
  };

  // Esc volta para o negócio, como o botão Voltar.
  useEffect(() => {
    const h = (ev: KeyboardEvent) => { if (ev.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return createPortal(
    <div id="family_form" role="dialog" aria-modal="true" aria-label={`Cadastro de ${child}`} className="fixed inset-0 z-50 overflow-y-auto bg-neutral-50">
      <div className="sticky top-0 z-10 px-4 py-4 lg:px-8">
        <Button type="button" variant="tint" leftIcon="fa-arrow-left" onClick={onClose}>Voltar</Button>
      </div>
      <main className="mx-auto mb-12 flex max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-main">
        <header className="border-b border-neutral-100 px-6 py-5 md:px-10"><img src={logo} alt="bloomy" className="h-8" /></header>
        <div className="flex flex-col gap-3 bg-brand-blue/10 px-6 py-8 md:px-10">
          <h1 className="m-0 text-3xl font-extrabold text-brand-purple-dark">Cadastro de {child}</h1>
          <p className="m-0 text-brand-purple-dark/80">
            Olá{g.name ? `, ${first(g.name)}` : ""}! Algumas informações já estão preenchidas: é só conferir. Onde aparece o ícone de informação, explicamos por que perguntamos.
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-white"><span className="block h-full rounded-full bg-brand-blue transition-all" style={{ width: `${(100 * done) / Math.max(1, ids.length)}%` }} /></div>
          <p className="m-0 text-xs font-bold text-brand-blue-dark">{done} de {ids.length} seções preenchidas</p>
        </div>
        {ids.map((id, i) => (
          <section key={id} className="flex flex-col gap-5 border-b border-neutral-100 px-6 py-8 md:px-10">
            <div>
              <h2 className="m-0 flex items-center gap-2.5 text-xl font-extrabold text-brand-purple-dark">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-blue text-sm text-white">{i + 1}</span>{famSection(id).title}
              </h2>
              <p className="m-0 mt-1 text-sm text-brand-purple-dark/60">{famSection(id).why}</p>
            </div>
            {body[id]}
          </section>
        ))}
        <div className="flex flex-col items-center gap-2 px-6 py-8 md:px-10">
          <Button type="button" rightIcon="fa-paper-plane" disabled={!done} className="disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onSubmit(a)}>Enviar respostas</Button>
          <p className="m-0 text-center text-xs text-brand-purple-dark/60">{done < ids.length ? "Pode enviar mesmo sem preencher tudo. A equipe completa o restante com você." : "Tudo pronto. Obrigado!"}</p>
        </div>
      </main>
    </div>,
    document.body,
  );
}
