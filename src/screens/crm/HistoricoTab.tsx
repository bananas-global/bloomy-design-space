/**
 * CRM de Leads — aba Histórico: registrar contato e a linha do tempo do
 * negócio (contatos, trocas de etapa e perda), com `timeline_list/1`.
 */
import { TimelineList } from "../../components/Layout.js";
import { CHANNELS, fmtBR, type Lead } from "./model.js";
import { QuickContact, type Up } from "./NegocioTab.js";
import { Note, Section, Subhead } from "./parts.js";

export function HistoricoTab({ lead, up }: { lead: Lead; up: Up }) {
  return (
    <div className="mx-auto max-w-3xl">
      <Section>
        <Subhead>Registrar contato</Subhead>
        <QuickContact lead={lead} up={up} primary />
        <Subhead>Histórico</Subhead>
        {lead.timeline.length === 0 ? (
          <Note>Nenhuma interação registrada.</Note>
        ) : (
          <div className="ps-4 pt-2">
            <TimelineList
              item={lead.timeline.map((t) => ({
                icon: t.kind === "contact" ? CHANNELS.find((c) => c.id === t.channel)?.icon ?? "fa-comment" : t.kind === "lost" ? "fa-circle-xmark" : "fa-arrow-right-arrow-left",
                color: t.kind === "contact" ? "blue" : t.kind === "stage" ? "green" : undefined,
                children: (
                  <div className="pt-1">
                    <p className="text-brand-purple-dark">{t.label && <strong>{t.label}: </strong>}{t.text}</p>
                    <p className="text-sm text-brand-purple-dark/60">{fmtBR(t.at)} · {t.by}</p>
                  </div>
                ),
              }))}
            />
          </div>
        )}
      </Section>
    </div>
  );
}
