/**
 * CRM de Leads — aba Autorização, a camada do Orçamentista.
 * Novo — não existe no Phoenix.
 *
 * A carga solicitada (do comercial) contra a autorizada (do convênio), a
 * solicitação com protocolo e retorno, e os documentos que o convênio exige.
 * Concluir leva o negócio para Aceite; Negado oferece marcar como perdido.
 */
import { Button } from "../../components/Button.js";
import { RadioGroup } from "../../components/Choice.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Tag } from "../../components/Tag.js";
import { TODAY } from "../../components/today.js";
import {
  AUTH_RESULTS, checkItem, currentVisit, hoursOf, operatorName, requiredDocs,
  type Auth, type Lead, type StageId, type TabId,
} from "./model.js";
import { Banner, Checklist, DISABLED, Facts, Note, Section, cx, fld } from "./parts.js";
import type { Up } from "./NegocioTab.js";

export function AutorizacaoTab({ lead, up, move, goTab }: { lead: Lead; up: Up; move: (to: StageId, extra?: Partial<Lead>) => void; goTab: (t: TabId) => void }) {
  const a = lead.auth;
  const docs = requiredDocs(lead);
  const requested = hoursOf(lead);
  const authorizedTotal = lead.specialties.reduce((s, _, i) => s + (Number(a.authorized[i]) || 0), 0);
  const upAuth = (patch: Partial<Auth>) => up({ auth: { ...a, ...patch } });
  const canFinish = ["docs", "solicitacao", "retorno", "autorizada"].every((id) => checkItem(id).test(lead));

  /** Integral preenche o autorizado com o solicitado; Negado zera; o retorno é hoje se ainda não tiver data. */
  function setResult(id: string) {
    const patch: Partial<Auth> = { result: id };
    if (id === "integral") patch.authorized = Object.fromEntries(lead.specialties.map((s, i) => [i, String(s.hours)]));
    if (id === "negado") patch.authorized = Object.fromEntries(lead.specialties.map((_, i) => [i, "0"]));
    if (!a.returnAt) patch.returnAt = TODAY;
    upAuth(patch);
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_340px]">
      <aside className="lg:sticky lg:top-24">
        <Checklist roleId="orcamento" lead={lead} />
      </aside>

      <div className="min-w-0 space-y-4">
        {!lead.report.sentAt && <Banner>A coordenação ainda não enviou este negócio para autorização. Dá para adiantar a conferência de documentos.</Banner>}

        <Section anchor="autorizada" title="Carga horária semanal por especialidade" desc="Solicitado vem do comercial. Autorizado é o que o convênio liberou." tag={`${requested}h solicitadas`}>
          {lead.specialties.length === 0 ? (
            <Note>Nenhuma especialidade solicitada pelo comercial.</Note>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)_80px_120px_100px] items-center gap-x-4 gap-y-3">
              {["Especialidade", "Solicitado", "Autorizado", ""].map((h) => <span key={h} className="text-sm font-bold text-brand-blue">{h}</span>)}
              {lead.specialties.map((s, i) => {
                const v = a.authorized[i];
                const has = v !== undefined && v !== "";
                const cut = has && Number(v) < Number(s.hours);
                return [
                  <span key={`s${i}`} className="font-semibold text-brand-purple-dark">{s.spec}</span>,
                  <span key={`r${i}`} className="font-bold text-brand-purple-dark">{s.hours}h</span>,
                  <Input key={`a${i}`} id={`auth-${i}`} name={`auth[authorized][${i}]`} type="number" min={0} placeholder="—" value={has ? v : ""} onChange={(e) => upAuth({ authorized: { ...a.authorized, [i]: e.target.value } })} />,
                  <Tag key={`d${i}`} item={!has ? "Aguardando" : cut ? `−${Number(s.hours) - Number(v)}h` : "Integral"} variant={!has ? "dark-purple" : cut ? "orange" : "green"} pill />,
                ];
              })}
            </div>
          )}
          <div className="flex justify-end gap-6 border-t border-brand-purple-dark/10 pt-3 text-sm text-brand-purple-dark/70">
            <span>Total solicitado <b className="text-brand-purple-dark">{requested}h</b></span>
            <span>Total autorizado <b className="text-brand-purple-dark">{authorizedTotal}h</b></span>
          </div>
        </Section>

        <Section anchor="solicitacao" title="Solicitação ao convênio" desc={`Portal da operadora · ${operatorName(lead)}`}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Input id="auth-sent-at" name="auth[sent_at]" type="date" label="Data de envio" value={a.sentAt} onChange={(e) => upAuth({ sentAt: e.target.value })} />
            <Input id="auth-protocol" name="auth[protocol]" label="Protocolo" placeholder="Nº do protocolo" value={a.protocol} onChange={(e) => upAuth({ protocol: e.target.value })} />
            <Input id="auth-return-at" name="auth[return_at]" type="date" label="Data de retorno" value={a.returnAt} onChange={(e) => upAuth({ returnAt: e.target.value })} />
          </div>
          <RadioGroup
            label="Resultado"
            wrapperClass="flex flex-wrap gap-2 space-x-0! [&>label]:border [&>label]:border-brand-purple-dark/10 [&>label:has(input:checked)]:border-transparent"
            field={fld("auth-result", a.result)}
            radio={AUTH_RESULTS.map((o) => ({ value: o.id, label: o.label }))}
            onChange={(e) => setResult(e.target.value)}
          />
          <Input id="auth-note" name="auth[note]" label="Observação" placeholder="Nº da guia, retorno da operadora..." value={a.note} onChange={(e) => upAuth({ note: e.target.value })} />
          {a.result === "negado" && (
            <Banner tone="orange" action={<Button type="button" variant="tint" color="red" className="flex-none" onClick={() => move("perdido", { lostReason: "Plano não autorizou" })}>Marcar como perdido</Button>}>
              Negado pelo convênio. O negócio pode ir para Perdido com o motivo “Plano não autorizou”.
            </Banner>
          )}
        </Section>

        {lead.status === "aguardando" ? (
          <Banner tone="green" icon="fa-circle-check">Autorização concluída. Falta efetivar como paciente.</Banner>
        ) : a.result !== "negado" && (
          <Banner action={<Button type="button" rightIcon="fa-check" disabled={!canFinish || lead.status !== "proposta"} className={`flex-none ${DISABLED}`} onClick={() => move("aguardando")}>Concluir autorização</Button>}>
            {canFinish ? "Autorização completa. Ao concluir, o negócio vai para Aceite." : "Para concluir: documentos, protocolo, resultado e carga autorizada por especialidade."}
          </Banner>
        )}
      </div>

      <aside className="min-w-0 space-y-4 lg:col-span-2 xl:sticky xl:top-24 xl:col-span-1">
        <Section anchor="docs" title="Documentos exigidos" desc="O convênio não analisa sem eles.">
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id} className={cx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold", d.ok ? "bg-brand-green/10 text-brand-green-dark" : "bg-brand-orange/20 text-brand-orange-dark")}>
                <Icon name={d.ok ? "fa-circle-check" : "fa-triangle-exclamation"} type="solid" />
                <span className="flex-1">{d.label}</span>
                {!d.ok && (
                  <button type="button" className="text-xs font-bold text-brand-blue-dark hover:underline" onClick={() => goTab(d.tab)}>
                    Ver em {d.tab === "negocio" ? "Negócio" : "Visita"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Dados para o portal">
          <Facts
            items={[
              ["Criança", `${lead.child || "—"}${lead.age ? `, ${lead.age} anos` : ""}`],
              ["Plano", operatorName(lead)],
              ["Carteirinha", lead.cardNumber || "—"],
              ["Diagnóstico", lead.cidMain.length ? lead.cidMain.join(", ") : "—"],
              ["Suporte", lead.support || "—"],
              ["Unidade", currentVisit(lead)?.unit || lead.prefUnit || "—"],
            ]}
          />
        </Section>
      </aside>
    </div>
  );
}
