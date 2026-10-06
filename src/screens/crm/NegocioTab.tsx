/**
 * CRM de Leads — aba Negócio, a camada do Comercial.
 *
 * Os campos do modal de Leads do Phoenix (abas Responsável, Criança,
 * Especialidade e Visitas) em cartões numa página só, mais o que é novo:
 * vários responsáveis, contatos, follow-up, plano e carteirinha, laudos e
 * endereço.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { FileItem, FileUploader } from "../../components/FileUploader.js";
import { Input, Label, type SelectItem } from "../../components/Input.js";
import { TODAY } from "../../components/today.js";
import { MedicalDocs } from "./MedicalDocs.js";
import {
  CHANNELS, COORDINATORS, OPERATOR_OPTIONS, OPERATOR_OTHER, ORIGINS, RELATIONS, SCHOOL_SHIFTS, SPECIALTIES, UFS, UNITS, WEEKDAYS,
  fmtBR, hoursOf, type Lead, type TabId,
} from "./model.js";
import { ChannelPicker, Checklist, DISABLED, Note, RemoveButton, Section, Subhead, cx, opts } from "./parts.js";

export type Up = (patch: Partial<Lead>) => void;

const OPERATOR_ITEMS: SelectItem[] = OPERATOR_OPTIONS.map((g) => ({ group: g.label, items: g.options.map((o) => ({ label: o, value: o })) }));

export function NegocioTab({ lead, up, goTab }: { lead: Lead; up: Up; goTab: (t: TabId) => void }) {
  const contacts = lead.timeline.filter((t) => t.kind === "contact").slice(0, 3);
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_340px]">
      <aside className="lg:sticky lg:top-24">
        <Checklist roleId="comercial" lead={lead} />
      </aside>

      <div className="min-w-0 space-y-4 lg:col-start-2 xl:col-start-auto">
        <Section anchor="resp" title="Responsáveis"><Guardians lead={lead} up={up} /></Section>
        <Section title="Contato e follow-up">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Input type="select" id="deal-origin" name="source" label="Origem" clear={false} options={opts(ORIGINS)} value={lead.origin} onChange={(v) => up({ origin: v ?? lead.origin })} />
            <Input id="deal-follow-up" name="next_follow_up" type="date" label="Próximo follow-up" value={lead.nextFollowUp} onChange={(e) => up({ nextFollowUp: e.target.value })} />
          </div>
          <Input id="deal-notes" name="notes" type="textarea" rows={3} label="Recado para a coordenação" placeholder="O que a coordenação precisa saber antes da visita" value={lead.notes} onChange={(e) => up({ notes: e.target.value })} />
        </Section>
        <Section anchor="crianca" title="Criança e plano de saúde"><Child lead={lead} up={up} /></Section>
        <Section anchor="carga" title="Carga horária e disponibilidade" desc="Solicitação inicial da família. A coordenação e o orçamento partem daqui." tag={`${hoursOf(lead)}h semanais`}>
          <Workload lead={lead} up={up} />
        </Section>
        <Section anchor="laudo"><MedicalDocs docs={lead.medicalDocs} onChange={(medicalDocs) => up({ medicalDocs })} /></Section>
        <Section anchor="endereco" title="Unidade e endereço"><AddressFields lead={lead} up={up} /></Section>
        <Section anchor="agenda" title="Agendamento da visita" desc="Quando a visita é marcada, o negócio passa para a coordenação da unidade.">
          <Schedule lead={lead} up={up} />
        </Section>
      </div>

      <aside className="min-w-0 lg:col-span-2 xl:sticky xl:top-24 xl:col-span-1">
        <Section anchor="contato" title="Contatos" desc={contacts.length ? "Últimos registros" : "Nenhum contato registrado."}>
          <QuickContact lead={lead} up={up} />
          {contacts.length > 0 && (
            <ul className="divide-y divide-brand-purple-dark/10">
              {contacts.map((t) => (
                <li key={t.id} className="py-2 text-sm">
                  <p className="text-brand-purple-dark"><strong>{t.label}: </strong>{t.text}</p>
                  <span className="text-xs text-brand-purple-dark/60">{fmtBR(t.at)} · {t.by}</span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="text-sm font-bold text-brand-blue-dark hover:underline" onClick={() => goTab("historico")}>Ver histórico completo</button>
        </Section>
      </aside>
    </div>
  );
}

/** Registrar um contato: canal e o que foi tratado. Entra no topo do histórico. */
export function QuickContact({ lead, up, primary = false }: { lead: Lead; up: Up; primary?: boolean }) {
  const [channel, setChannel] = useState("whatsapp");
  const [note, setNote] = useState("");
  function add() {
    if (!note.trim()) return;
    const c = CHANNELS.find((x) => x.id === channel);
    up({ timeline: [{ id: `t-${Date.now()}`, kind: "contact", channel, label: c?.label ?? "Contato", text: note.trim(), at: TODAY, by: lead.owner || "Você" }, ...lead.timeline] });
    setNote("");
  }
  return (
    <div className="space-y-3">
      <ChannelPicker value={channel} onChange={setChannel} />
      <Input id={`contact-note-${primary ? "history" : "deal"}`} name="contact_note" type="textarea" rows={2} placeholder="O que foi tratado?" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button type="button" variant={primary ? "default" : "tint"} rightIcon="fa-check" disabled={!note.trim()} className={DISABLED} onClick={add}>Registrar contato</Button>
    </div>
  );
}

/** Um responsável principal (o primeiro, que alimenta o card) e quantos secundários forem precisos. */
function Guardians({ lead, up }: { lead: Lead; up: Up }) {
  const gs = lead.guardians;
  const set = (i: number, k: string, v: string) => up({ guardians: gs.map((g, idx) => (idx === i ? { ...g, [k]: v } : g)) });
  const add = () => up({ guardians: [...gs, { id: `g-${Date.now()}`, name: "", relation: "Pai", phone: "", email: "" }] });
  const remove = (i: number) => up({ guardians: gs.filter((_, idx) => idx !== i) });
  const makePrimary = (i: number) => up({ guardians: [gs[i]!, ...gs.filter((_, idx) => idx !== i)] });
  return (
    <div className="space-y-4">
      {gs.map((g, i) => (
        <div key={g.id} className="space-y-4 rounded-xl border border-brand-purple-dark/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Input
                type="checkbox"
                id={`guardian-${g.id}-primary`}
                name={`guardians[${i}][primary]`}
                label="Responsável principal"
                checked={i === 0}
                className="[&_label]:p-2 [&_label]:text-sm [&_label]:font-bold"
                onChange={() => i !== 0 && makePrimary(i)}
              />
              <span className="truncate text-sm text-brand-purple-dark/60">{g.name || "Sem nome"}{g.relation ? ` · ${g.relation}` : ""}</span>
            </div>
            {gs.length > 1 && <RemoveButton title="Remover responsável" onClick={() => remove(i)} />}
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Input id={`guardian-${g.id}-name`} name={`guardians[${i}][name]`} label="Nome" value={g.name} onChange={(e) => set(i, "name", e.target.value)} />
            <Input type="select" id={`guardian-${g.id}-relation`} name={`guardians[${i}][relation]`} label="Parentesco" clear={false} options={opts(RELATIONS)} value={g.relation} onChange={(v) => set(i, "relation", v ?? g.relation)} />
            <Input id={`guardian-${g.id}-phone`} name={`guardians[${i}][phone]`} label="Telefone" placeholder="(11) 90000-0000" value={g.phone} onChange={(e) => set(i, "phone", e.target.value)} />
            <Input id={`guardian-${g.id}-email`} name={`guardians[${i}][email]`} type="email" label="Email" value={g.email} onChange={(e) => set(i, "email", e.target.value)} />
          </div>
        </div>
      ))}
      <Button type="button" variant="tint" rightIcon="fa-user-plus" onClick={add}>Adicionar responsável</Button>
    </div>
  );
}

function Child({ lead, up }: { lead: Lead; up: Up }) {
  const other = lead.operator === OPERATOR_OTHER;
  const card = <Input id="deal-card-number" name="card_number" label="Número da carteirinha" placeholder="Somente números" value={lead.cardNumber} onChange={(e) => up({ cardNumber: e.target.value })} />;
  return (
    <div className="space-y-6">
      <Input id="deal-child-name" name="patient[name]" label="Nome" value={lead.child} onChange={(e) => up({ child: e.target.value })} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Input id="deal-child-age" name="patient[age]" type="counter" label="Idade" max={18} value={lead.age} onChange={(e) => up({ age: Number(e.target.value) || 0 })} />
        <Input type="select" id="deal-school-shift" name="patient[school_shift]" label="Turno Escolar" clear={false} options={opts(SCHOOL_SHIFTS)} value={lead.schoolShift} onChange={(v) => up({ schoolShift: v ?? lead.schoolShift })} />
      </div>
      <Subhead>Plano de saúde</Subhead>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Input type="select" id="deal-operator" name="health_care" label="Plano de Saúde" prompt="Selecione" options={OPERATOR_ITEMS} value={lead.operator} onChange={(v) => up({ operator: v ?? "" })} />
        {other ? <Input id="deal-operator-other" name="health_care_other" label="Qual plano?" placeholder="Nome do plano" value={lead.operatorOther} onChange={(e) => up({ operatorOther: e.target.value })} /> : card}
      </div>
      {other && card}
      <div>
        <Label>Carteirinha (foto ou PDF)</Label>
        <div className="mt-2">
          {lead.cardFile ? (
            <FileItem fileName={lead.cardFile} size={0} variant="simplified" removeEvent={() => up({ cardFile: "" })} />
          ) : (
            <FileUploader upload={{ ref: "deal-card-file", accept: "image/*,.pdf", maxEntries: 1 }} variant="simplified" onChange={(files) => files[0] && up({ cardFile: files[0].name })} />
          )}
        </div>
      </div>
    </div>
  );
}

function Workload({ lead, up }: { lead: Lead; up: Up }) {
  const specs = lead.specialties;
  const avail = lead.availability;
  const setSpec = (i: number, patch: Partial<Lead["specialties"][number]>) => up({ specialties: specs.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  const setAvail = (i: number, patch: Partial<Lead["availability"][number]>) => up({ availability: avail.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) });
  return (
    <div className="space-y-4">
      <Subhead>Carga horária semanal por especialidade</Subhead>
      {specs.map((s, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_160px_auto] items-end gap-3">
          <Input type="select" id={`spec-${i}`} name={`specialties[${i}][specialty]`} label={i === 0 ? "Especialidade" : undefined} clear={false} options={opts(SPECIALTIES)} value={s.spec} onChange={(v) => setSpec(i, { spec: v ?? s.spec })} />
          <Input id={`spec-${i}-hours`} name={`specialties[${i}][hours]`} type="counter" label={i === 0 ? "Horas/semana" : undefined} max={40} value={s.hours} onChange={(e) => setSpec(i, { hours: Number(e.target.value) || 0 })} />
          <RemoveButton title="Remover" onClick={() => up({ specialties: specs.filter((_, idx) => idx !== i) })} />
        </div>
      ))}
      <Button type="button" variant="tint" rightIcon="fa-plus" onClick={() => up({ specialties: [...specs, { spec: "Psicologia", hours: 2 }] })}>Adicionar Especialidade</Button>

      <Subhead>Disponibilidade da família</Subhead>
      {avail.map((a, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_120px_120px_auto] items-end gap-3">
          <Input type="select" id={`avail-${i}-day`} name={`availabilities[${i}][weekday]`} label={i === 0 ? "Dia" : undefined} clear={false} options={opts(WEEKDAYS)} value={a.day} onChange={(v) => setAvail(i, { day: v ?? a.day })} />
          <Input id={`avail-${i}-from`} name={`availabilities[${i}][from]`} type="time" label={i === 0 ? "Das" : undefined} value={a.from} onChange={(e) => setAvail(i, { from: e.target.value })} />
          <Input id={`avail-${i}-to`} name={`availabilities[${i}][to]`} type="time" label={i === 0 ? "Até" : undefined} value={a.to} onChange={(e) => setAvail(i, { to: e.target.value })} />
          <RemoveButton title="Remover período" onClick={() => up({ availability: avail.filter((_, idx) => idx !== i) })} />
        </div>
      ))}
      <Button type="button" variant="tint" onClick={() => up({ availability: [...avail, { day: "Quarta-Feira", from: "08:00", to: "12:00" }] })}>Adicionar Período</Button>
    </div>
  );
}

function AddressFields({ lead, up }: { lead: Lead; up: Up }) {
  const a = lead.addr;
  const set = (k: keyof Lead["addr"], v: string) => up({ addr: { ...a, [k]: v } });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Input type="select" id="deal-pref-unit" name="unit_of_interest" label="Unidade preferencial" prompt="Selecionar" options={opts(UNITS)} value={lead.prefUnit} onChange={(v) => up({ prefUnit: v ?? "" })} />
        <Input id="deal-cep" name="address[cep]" label="CEP" placeholder="00000-000" value={a.cep} onChange={(e) => set("cep", e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,2fr)_120px_minmax(0,1fr)]">
        <Input id="deal-street" name="address[street]" label="Endereço" placeholder="Rua, avenida..." value={a.street} onChange={(e) => set("street", e.target.value)} />
        <Input id="deal-number" name="address[number]" label="Número" value={a.number} onChange={(e) => set("number", e.target.value)} />
        <Input id="deal-comp" name="address[complement]" label="Complemento" placeholder="Apto, bloco" value={a.comp} onChange={(e) => set("comp", e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
        <Input id="deal-district" name="address[district]" label="Bairro" value={a.district} onChange={(e) => set("district", e.target.value)} />
        <Input id="deal-city" name="address[city]" label="Cidade" value={a.city} onChange={(e) => set("city", e.target.value)} />
        <Input type="select" id="deal-uf" name="address[uf]" label="UF" clear={false} options={opts(UFS)} value={a.uf} onChange={(v) => set("uf", v ?? a.uf)} />
      </div>
    </div>
  );
}

/** A visita vigente (a última) é editável; as anteriores ficam como remarcadas. */
function Schedule({ lead, up }: { lead: Lead; up: Up }) {
  const vs = lead.visits;
  const last = vs.length - 1;
  const set = (i: number, patch: Partial<Lead["visits"][number]>) => up({ visits: vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) });
  const add = () => up({ visits: [...vs, { id: `v-${Date.now()}`, date: TODAY, time: "10:00", unit: lead.prefUnit, coord: "", scheduledBy: lead.owner }] });
  return (
    <div className="space-y-4">
      {vs.map((v, i) => (
        <div key={v.id} className="space-y-4 rounded-xl border border-brand-purple-dark/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className={cx("rounded-full px-3 py-1 text-xs font-bold", i === last ? "bg-brand-blue/20 text-brand-blue-dark" : "bg-brand-purple-dark/6 text-brand-purple-dark/60")}>{i === last ? "Vigente" : "Remarcada"}</span>
              <span className="truncate text-sm text-brand-purple-dark/70">{fmtBR(v.date)}{v.time ? ` · ${v.time}` : ""}{v.unit ? ` · ${v.unit}` : ""}</span>
            </div>
            <RemoveButton title="Remover" onClick={() => up({ visits: vs.filter((_, idx) => idx !== i) })} />
          </div>
          {i === last && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              <Input id={`visit-${v.id}-date`} name={`visits[${i}][date]`} type="date" label="Data" value={v.date} onChange={(e) => set(i, { date: e.target.value })} />
              <Input id={`visit-${v.id}-time`} name={`visits[${i}][time]`} type="time" label="Horário" value={v.time} onChange={(e) => set(i, { time: e.target.value })} />
              <Input type="select" id={`visit-${v.id}-unit`} name={`visits[${i}][unit_id]`} label="Unidade" prompt="Selecionar" options={opts(UNITS)} value={v.unit} onChange={(val) => set(i, { unit: val ?? "" })} />
              <Input type="select" id={`visit-${v.id}-coord`} name={`visits[${i}][coordinator_id]`} label="Coordenador" prompt="Selecionar" options={opts(COORDINATORS)} value={v.coord} onChange={(val) => set(i, { coord: val ?? "" })} />
            </div>
          )}
        </div>
      ))}
      {vs.length === 0 && <Note>Nenhuma visita agendada.</Note>}
      <Button type="button" variant="tint" rightIcon="fa-calendar-plus" onClick={add}>{vs.length ? "Remarcar visita" : "Agendar visita"}</Button>
    </div>
  );
}
