/**
 * CRM de Leads — aba Visita, a camada da Coordenação.
 * Novo — não existe no Phoenix.
 *
 * O relatório da visita em seis blocos (só o último é texto livre), a
 * pré-anamnese e o envio para autorização, que move o negócio para Validação
 * Técnica.
 */
import type { ChangeEvent } from "react";
import { Button } from "../../components/Button.js";
import { CheckboxGroup, RadioGroup } from "../../components/Choice.js";
import { Input, SwitchCard } from "../../components/Input.js";
import { TODAY } from "../../components/today.js";
import {
  BEHAVIORS, CID_OPTIONS, COMMUNICATION, MOBILITY, MOBILITY_AIDS, MOBILITY_LOCOMOTION, REINFORCER_OPTIONS, REPORT_HAPPENED, REPORT_OBJECTIONS,
  REPORT_OUTCOMES, REPORT_PRESENTED, REPORT_WHO, SENSORY, SUPPORT_LEVELS, checkItem, currentVisit, fmtBR, guardianOf, operatorName,
  type Lead, type Report, type StageId, type ToggleOption,
} from "./model.js";
import { Banner, Checklist, DISABLED, Facts, Note, Section, fld, opts } from "./parts.js";
import type { Up } from "./NegocioTab.js";

const toOptions = (list: readonly string[]) => list.map((o) => ({ label: o, value: o }));
/** As opções em linha (ou em grade), com borda enquanto não estão marcadas. */
const OUTLINE = "[&>label]:border [&>label]:border-brand-purple-dark/10 [&>label:has(input:checked)]:border-transparent";
const CHIPS = `flex flex-wrap gap-2 space-x-0! ${OUTLINE}`;
const CHIPS_GRID = `grid grid-cols-1 gap-2 space-x-0! sm:grid-cols-2 ${OUTLINE}`;

export function VisitaTab({ lead, up, move }: { lead: Lead; up: Up; move: (to: StageId, extra?: Partial<Lead>) => void }) {
  const v = currentVisit(lead);
  const r = lead.report;
  const upReport = (patch: Partial<Report>) => up({ report: { ...r, ...patch } });
  const toggleIn = (k: "who" | "presented" | "objections") => (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    upReport({ [k]: e.target.checked ? [...r[k], val] : r[k].filter((x) => x !== val) });
  };
  const ready = ["realizada", "relatorio", "anamnese", "interesse"].every((id) => checkItem(id).test(lead));

  function send() {
    const report = { ...r, sentAt: TODAY };
    if (lead.status === "agendada") move("proposta", { report });
    else upReport({ sentAt: TODAY });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_340px]">
      <aside className="lg:sticky lg:top-24">
        <Checklist roleId="coordenacao" lead={lead} />
      </aside>

      <div className="min-w-0 space-y-4">
        <Section anchor="relatorio" title="Relatório da visita" desc="Seis blocos. Só o último é texto livre.">
          <div className="space-y-6">
            <RadioGroup label="1 · A visita aconteceu?" wrapperClass={CHIPS} field={fld("report-happened", r.happened)} radio={REPORT_HAPPENED.map((o) => ({ value: o.id, label: o.label }))} onChange={(e) => upReport({ happened: e.target.value })} />
            <CheckboxGroup label="2 · Quem veio" wrapperClass={CHIPS} field={fld("report-who", r.who)} checkbox={toOptions(REPORT_WHO)} onChange={toggleIn("who")} />
            <CheckboxGroup label="3 · O que foi apresentado" wrapperClass={CHIPS_GRID} field={fld("report-presented", r.presented)} checkbox={toOptions(REPORT_PRESENTED)} onChange={toggleIn("presented")} />
            <CheckboxGroup label="4 · Dúvidas ou objeções que apareceram" wrapperClass={CHIPS_GRID} field={fld("report-objections", r.objections)} checkbox={toOptions(REPORT_OBJECTIONS)} onChange={toggleIn("objections")} />
            <RadioGroup label="5 · Como a família saiu da visita" wrapperClass={CHIPS} field={fld("report-outcome", r.outcome)} radio={REPORT_OUTCOMES.map((o) => ({ value: o.id, label: o.label }))} onChange={(e) => upReport({ outcome: e.target.value })} />
            <Input id="report-note" name="report[note_for_sales]" type="textarea" rows={3} label="6 · Algo que o comercial precisa saber" placeholder="Opcional. Só o que não coube nos blocos acima." value={r.noteForSales} onChange={(e) => upReport({ noteForSales: e.target.value })} />
          </div>
        </Section>

        <Section anchor="anamnese" title="Pré-anamnese"><Anamnesis lead={lead} up={up} /></Section>

        {r.sentAt ? (
          <Banner tone="green" icon="fa-circle-check" action={<Button type="button" variant="tint" className="flex-none" onClick={() => upReport({ sentAt: "" })}>Desfazer envio</Button>}>
            Enviado para autorização em {fmtBR(r.sentAt)}. O orçamentista já vê este negócio na fila.
          </Banner>
        ) : (
          <Banner action={<Button type="button" rightIcon="fa-paper-plane" disabled={!ready} className={`flex-none ${DISABLED}`} onClick={send}>Enviar para autorização</Button>}>
            {ready ? "Tudo pronto. Ao enviar, o negócio segue para o orçamentista solicitar a autorização." : "Para enviar: visita realizada, relatório, pré-anamnese e família decidida."}
          </Banner>
        )}
      </div>

      <aside className="min-w-0 space-y-4 lg:col-span-2 xl:sticky xl:top-24 xl:col-span-1">
        <Section title="Visita agendada" tag={v ? `${fmtBR(v.date)}${v.time ? ` · ${v.time}` : ""}` : null}>
          {v ? (
            <Facts
              items={[
                ["Unidade", v.unit],
                ["Coordenador", v.coord],
                ["Agendado por", v.scheduledBy || lead.owner || "—"],
                ...(lead.visits.length > 1 ? [["Remarcações", lead.visits.slice(0, -1).map((x) => fmtBR(x.date)).join(", ")] as [string, string]] : []),
              ]}
            />
          ) : (
            <Note>O comercial ainda não agendou a visita. O relatório pode ser preenchido mesmo assim.</Note>
          )}
        </Section>
        <Section title="Contexto do comercial" desc="Somente leitura neste perfil.">
          <Facts
            items={[
              ["Responsável", guardianOf(lead).name || "—"],
              ["Telefone", guardianOf(lead).phone || "—"],
              ["Plano", operatorName(lead)],
              ["Carga pedida", lead.specialties.length ? lead.specialties.map((s) => `${s.spec} ${s.hours}h`).join(" · ") : "—"],
              ["Disponibilidade", lead.availability.length ? lead.availability.map((a) => `${a.day.replace("-Feira", "")} ${a.from}–${a.to}`).join(" · ") : "—"],
              ["Comercial", lead.owner || "—"],
              ...(lead.notes ? [["Recado", lead.notes] as [string, string]] : []),
            ]}
          />
        </Section>
      </aside>
    </div>
  );
}

function Toggles({ group, items, lead, up }: { group: "behaviors" | "comm" | "mobility" | "sensory"; items: ToggleOption[]; lead: Lead; up: Up }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((b) => (
        <SwitchCard
          key={b.id}
          field={fld(`anamnesis-${group}-${b.id}`, !!lead[group][b.id])}
          title={b.title}
          description={b.desc}
          onChange={(e) => up({ [group]: { ...lead[group], [b.id]: e.target.checked } })}
        />
      ))}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 border-t border-brand-purple-dark/10 pt-6">
      <h4 className="font-extrabold text-brand-purple-dark">{title}</h4>
      {children}
    </div>
  );
}

function Anamnesis({ lead, up }: { lead: Lead; up: Up }) {
  return (
    <div className="space-y-6">
      <Input type="multi_select_search" id="anamnesis-cid-main" name="cid_main" label="Diagnósticos Saúde Mental e Neuro" prompt="Buscar por CID-10, Nome do CID..." options={toOptions(CID_OPTIONS)} value={lead.cidMain} onChange={(cidMain) => up({ cidMain })} />
      <Input type="multi_select_search" id="anamnesis-cid-assoc" name="cid_assoc" label="Diagnósticos Associados" prompt="Buscar por CID-10, Nome do CID..." options={toOptions(CID_OPTIONS)} value={lead.cidAssoc} onChange={(cidAssoc) => up({ cidAssoc })} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <RadioGroup label="Nível de Suporte" wrapperClass={CHIPS} field={fld("anamnesis-support", lead.support)} radio={toOptions(SUPPORT_LEVELS)} onChange={(e) => up({ support: e.target.value })} />
        <Input type="select" id="anamnesis-prior-therapy" name="prior_therapy" label="Já realizou terapia antes?" clear={false} options={opts(["Sim", "Não"])} value={lead.priorTherapy} onChange={(v) => up({ priorTherapy: v ?? lead.priorTherapy })} />
      </div>

      <Block title="Comportamentos Interferentes"><Toggles group="behaviors" items={BEHAVIORS} lead={lead} up={up} /></Block>
      <Block title="Comunicação"><Toggles group="comm" items={COMMUNICATION} lead={lead} up={up} /></Block>
      <Block title="Mobilidade">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <RadioGroup label="Locomoção" wrapperClass={CHIPS} field={fld("anamnesis-locomotion", lead.locomotion)} radio={toOptions(MOBILITY_LOCOMOTION)} onChange={(e) => up({ locomotion: e.target.value })} />
          <Input type="multi_select_search" id="anamnesis-aids" name="mobility_aids" label="Dispositivos de auxílio" prompt="Buscar por dispositivo…" options={toOptions(MOBILITY_AIDS)} value={lead.mobilityAids} onChange={(mobilityAids) => up({ mobilityAids })} />
        </div>
        <Toggles group="mobility" items={MOBILITY} lead={lead} up={up} />
        <Input id="anamnesis-mobility-notes" name="mobility_notes" type="textarea" rows={3} label="Observações de acessibilidade" placeholder="Salas, banheiro, transferências, cuidados no deslocamento…" value={lead.mobilityNotes} onChange={(e) => up({ mobilityNotes: e.target.value })} />
      </Block>
      <Block title="Perfil Sensorial"><Toggles group="sensory" items={SENSORY} lead={lead} up={up} /></Block>
      <Block title="Reforçadores">
        <Input type="multi_select_search" id="anamnesis-reinforcers" name="reinforcers" label="Reforçadores" prompt="Buscar por reforçadores" options={toOptions(REINFORCER_OPTIONS)} value={lead.reinforcers} onChange={(reinforcers) => up({ reinforcers })} />
      </Block>
    </div>
  );
}
