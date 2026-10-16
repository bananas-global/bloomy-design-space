/**
 * CRM de Leads — Preenchimento pela família, no topo da aba Negócio (e, só com
 * a pré-anamnese, na aba Visita).
 * Novo — não existe no Phoenix.
 *
 * A equipe escolhe as seções e manda o link pelo WhatsApp; as respostas
 * entram direto nos cards, marcados com "Família", e ficam resumidas aqui até
 * a equipe marcar como revisadas. "Ver formulário" mostra o que a família vê
 * no celular (`FamilyForm.tsx`); enviar por lá, ou simular, faz o papel dela.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Tag, type TagVariant } from "../../components/Tag.js";
import { TODAY } from "../../components/today.js";
import { fmtBR, guardianOf, type FamRequest, type Lead } from "./model.js";
import type { Up } from "./NegocioTab.js";
import { DISABLED, cx } from "./parts.js";
import { FamilyFormPage } from "./FamilyForm.js";
import { FAM_SECTIONS, applyAnswers, famSection, hasAnswer, simulatedAnswers, summarize, type FamAnswers } from "./family.js";
import { Entry, SendStatus, SimButton, WhatsDrawer, fakeLink } from "./Send.js";
import { first } from "./week.js";

const STATUS: Record<FamRequest["status"], [string, TagVariant]> = {
  enviado: ["Aguardando resposta", "yellow"],
  respondida: ["Respondida · revisar", "orange"],
  revisada: ["Revisada", "green"],
};

/** A seção foi respondida pela família (o selo "Família" no card). */
export const byFamily = (l: Lead, ...ids: string[]) => ids.some((id) => !!l.famReq?.answers[id]);

export function FamilyRequest({ lead, up, compact = false }: { lead: Lead; up: Up; compact?: boolean }) {
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState<string[] | null>(null);
  const [open, setOpen] = useState(false);
  const req = lead.famReq;
  const ans = (req?.answers ?? {}) as FamAnswers;
  const answered = Object.keys(ans);
  const pend = req ? req.sections.filter((id) => !(id in ans)) : [];
  const g = guardianOf(lead);

  /** A família responde as seções `ids`: pelo formulário ou, no protótipo, simulado. */
  function receive(ids: string[], answers: FamAnswers = simulatedAnswers(lead)) {
    const got = Object.fromEntries(ids.filter((id) => hasAnswer(id, answers)).map((id) => [id, answers[id as keyof FamAnswers]]));
    const meta = { by: req?.to || g.name || "Responsável", at: TODAY };
    const base: FamRequest = req ?? { to: g.name, phone: g.phone, link: fakeLink("cadastro", lead.id), message: "", sentAt: TODAY, sends: 0, sections: ids, status: "enviado", answers: {}, answeredAt: "" };
    up({ ...applyAnswers(lead, answers, ids, meta), famReq: { ...base, answers: { ...ans, ...got }, answeredAt: TODAY, status: "respondida" } });
    setForm(null);
    setDrawer(false);
  }

  const askAnamnese = compact && !req?.sections.includes("anamnese");

  return (
    <div className="space-y-3">
      {(!compact || askAnamnese) && (
        <Entry
          icon="fa-paper-plane"
          title={!req || askAnamnese ? (compact ? "Pedir a pré-anamnese para a família" : "Pedir para a família preencher") : req.status === "enviado" ? `Link enviado para ${req.to || "responsável"} em ${fmtBR(req.sentAt)}` : `Respondido por ${req.to || "responsável"} em ${fmtBR(req.answeredAt)}`}
          desc={
            !req || askAnamnese
              ? compact ? "A família responde pelo celular e as respostas entram aqui para a coordenação conferir." : "Escolha o que a família preenche pelo celular: cadastro, plano, carga horária, horários, agenda anterior, laudo, endereço e pré-anamnese."
              : req.status === "enviado" ? req.sections.map((id) => famSection(id).title).join(", ")
              : req.status === "revisada" ? "Respostas conferidas pela equipe." : "As respostas já estão nos cards. Confira e marque como revisada."
          }
          actions={<Button type="button" variant={req && !askAnamnese ? "tint" : "default"} color="green" rightIcon="fa-brands fa-whatsapp" onClick={() => setDrawer(true)}>{req && !askAnamnese ? "Novo pedido" : "Pedir para a família"}</Button>}
        />
      )}

      {req && (!compact || req.sections.includes("anamnese")) && (
        <SendStatus
          send={req}
          label={compact ? "Pré-anamnese no pedido para" : `${req.sections.length} ${req.sections.length > 1 ? "seções pedidas" : "seção pedida"} para`}
          status={[compact && !ans.anamnese ? STATUS.enviado : STATUS[req.status]]}
          actions={
            <>
              {(compact ? !ans.anamnese : req.status === "enviado") && (
                <Button type="button" size="small" variant="tint" rightIcon="fa-mobile-screen" onClick={() => setForm(compact ? ["anamnese"] : req.sections)}>Ver formulário</Button>
              )}
              {(compact ? !ans.anamnese : req.status === "enviado") && <SimButton onClick={() => receive(compact ? ["anamnese"] : req.sections)}>Simular resposta da família</SimButton>}
              {!compact && req.status === "respondida" && <Button type="button" size="small" variant="tint" rightIcon="fa-check" onClick={() => up({ famReq: { ...req, status: "revisada" } })}>Marcar como revisada</Button>}
            </>
          }
        />
      )}

      {!compact && answered.length > 0 && (
        <div className="rounded-xl border border-brand-purple-dark/10">
          <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full cursor-pointer flex-wrap items-center gap-2 px-4 py-3 text-left">
            <span className="mr-2 flex items-center gap-2 text-sm font-bold text-brand-purple-dark"><Icon name="fa-comment-dots" />O que {first(req!.to) || "a família"} respondeu</span>
            {answered.map((id) => <Tag key={id} item={famSection(id).title} variant="green" leftIcon="fa-check" pill />)}
            {pend.map((id) => <Tag key={id} item={famSection(id).title} variant="dark-purple" pill />)}
            <Icon name={open ? "fa-chevron-up" : "fa-chevron-down"} className="ml-auto text-brand-purple-dark/50" />
          </button>
          {open && (
            <div className="grid grid-cols-1 gap-4 border-t border-brand-purple-dark/10 px-4 py-4 md:grid-cols-2">
              {answered.map((id) => (
                <div key={id} className="space-y-1">
                  <p className="m-0 text-xs font-bold uppercase tracking-widest text-brand-purple-dark/60">{famSection(id).title}</p>
                  <dl className="m-0 space-y-1.5 text-sm">
                    {summarize(id, ans).map(([k, v]) => (
                      <div key={k}><dt className="text-xs text-brand-purple-dark/60">{k}</dt><dd className="m-0 font-semibold text-brand-purple-dark">{v || "—"}</dd></div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {drawer && <RequestDrawer lead={lead} preset={compact ? ["anamnese"] : undefined} hidden={!!form} onPreview={setForm} onClose={() => setDrawer(false)} onSend={(r) => { up({ famReq: compact && req ? { ...r, sections: [...new Set([...req.sections, ...r.sections])] } : r }); setDrawer(false); }} />}
      {form && <FamilyFormPage lead={lead} ids={form} prev={req?.answers} onClose={() => setForm(null)} onSubmit={(a) => receive(form, a)} />}
    </div>
  );
}

function RequestDrawer({ lead, preset, hidden, onPreview, onClose, onSend }: { lead: Lead; preset?: string[]; hidden: boolean; onPreview: (ids: string[]) => void; onClose: () => void; onSend: (r: FamRequest) => void }) {
  const req = lead.famReq;
  const g = guardianOf(lead);
  const [sel, setSel] = useState<string[]>(() => preset ?? FAM_SECTIONS.filter((s) => s.id !== "anamnese" && !s.done(lead)).map((s) => s.id));
  const ids = FAM_SECTIONS.map((s) => s.id).filter((id) => sel.includes(id));
  const mins = Math.max(2, ids.reduce((n, id) => n + famSection(id).min, 0));
  const child = first(lead.child) || "a criança";
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const picker = (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-xs font-bold uppercase tracking-widest text-brand-purple-dark/60">O que a família vai preencher · {ids.length} de {FAM_SECTIONS.length}</p>
      {FAM_SECTIONS.map((s) => {
        const on = sel.includes(s.id);
        const fam = !!req?.answers[s.id];
        const done = s.done(lead);
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(s.id)}
            className={cx(
              "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
              on ? "border-brand-blue/40 bg-brand-blue/10" : "border-brand-purple-dark/10 hover:bg-brand-purple-dark/5",
            )}
          >
            <span className={cx("grid h-5 w-5 place-items-center rounded text-[10px]", on ? "bg-brand-blue text-white" : "border border-brand-purple-dark/20 text-transparent")}><Icon name="fa-check" type="solid" /></span>
            <span className="min-w-0">
              <b className="block text-sm text-brand-purple-dark">{s.title}</b>
              <span className="block text-xs text-brand-purple-dark/60">{s.why}</span>
            </span>
            <Tag item={fam ? "Família já respondeu" : done ? "Completo" : "Pendente"} variant={fam ? "green" : done ? "light-blue" : "dark-purple"} pill />
          </button>
        );
      })}
    </div>
  );

  return (
    <WhatsDrawer
      id="family_request"
      show={!hidden}
      title="Pedir para a família preencher"
      subtitle="Escolha as seções. A família recebe um link no WhatsApp e as respostas entram direto nos cards."
      guardian={g.name}
      phone={g.phone}
      message={`Olá${g.name ? `, ${first(g.name)}` : ""}! Aqui é da Bloomy. Para adiantar o atendimento de ${child}, pedimos que você preencha pelo link${ids.length ? `: ${ids.map((id) => famSection(id).title.toLowerCase()).join(", ")}` : ""}. Leva cerca de ${mins} minutos e cada pergunta explica por que pedimos.`}
      link={req?.link ?? fakeLink("cadastro", lead.id)}
      note="O link vale por 7 dias. O que já temos no cadastro aparece preenchido para a família só conferir."
      prev={req}
      aside={picker}
      canSend={ids.length > 0}
      extraActions={<Button type="button" variant="tint" rightIcon="fa-mobile-screen" disabled={!ids.length} className={DISABLED} onClick={() => onPreview(ids)}>Ver formulário</Button>}
      onClose={onClose}
      onSend={(w) => onSend({ ...w, sections: ids, status: "enviado", answers: req?.answers ?? {}, answeredAt: req?.answeredAt ?? "" })}
    />
  );
}
