/**
 * Relatórios do paciente — compartilhamento com a família (`relatorios-share-v2.jsx`).
 *
 * Um relatório finalizado com documento final pode ser compartilhado com os
 * responsáveis legais, que o leem no app da família. O estado (`none`,
 * `pending`, `partial`, `viewed`, `revoked`) é derivado por `shareState()`.
 * Cores: verde = lido, azul = enviado aguardando leitura, laranja = lido em
 * parte, vermelho = revogado, neutro = não compartilhado.
 */
import { useState, type ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input, Label, SwitchCard } from "../../components/Input.js";
import { DrawerModal } from "../../components/Overlay.js";
import { Tag } from "../../components/Tag.js";
import { SHARE_META, guardiansOf, relTypeName, shareState, shareable, type Report, type ShareState } from "./model.js";
import { Callout, Dash, DrawerFooter, TitleWithSub } from "./parts.js";
import { useReports } from "./store.js";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const BADGE_TONE: Record<ShareState, { box: string; icon: string; label: string }> = {
  none: { box: "border-transparent bg-transparent", icon: "text-brand-purple-dark/40", label: "font-bold text-brand-purple-dark/40" },
  pending: { box: "border-blue/35 bg-blue/5", icon: "text-blue-dark", label: "font-extrabold text-brand-purple-dark" },
  partial: { box: "border-orange/40 bg-orange/5", icon: "text-orange-dark", label: "font-extrabold text-brand-purple-dark" },
  viewed: { box: "border-green/40 bg-green/5", icon: "text-green-dark", label: "font-extrabold text-green-dark" },
  revoked: { box: "border-red/35 bg-red/5", icon: "text-red-dark", label: "font-extrabold text-brand-purple-dark" },
};

/**
 * Selo de compartilhamento (`RelShareBadge`): estado curto e, abaixo, envio ou
 * leitura. Novo — não existe no Phoenix.
 */
export function ShareBadge({ report }: { report: Report }) {
  const st = shareState(report);
  if (st === "none" && !shareable(report)) return <Dash />;
  const m = SHARE_META[st];
  const s = report.share;
  const total = s?.recipients.length ?? 0;
  const seen = s?.recipients.filter((x) => x.viewedAt).length ?? 0;
  const firstView = s?.recipients.find((x) => x.viewedAt)?.viewedAt ?? "";
  const tone = BADGE_TONE[st];
  return (
    <span
      className={cx("inline-flex items-center gap-2 rounded-lg border px-2.5 py-1", tone.box)}
      title={st === "none" ? "Ainda não compartilhado com a família" : `${m.label} · ${seen}/${total} responsáveis`}
    >
      <Icon name={m.icon} type="solid" className={cx("flex-none text-[11px]", tone.icon)} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={cx("text-xs whitespace-nowrap", tone.label)}>{m.short}</span>
        {st === "pending" && s && (
          <span className="text-[10px] font-bold whitespace-nowrap text-brand-purple-dark/45">{`enviado ${s.sharedAt.split(" ")[0]}`}</span>
        )}
        {(st === "viewed" || st === "partial") && (
          <span className="text-[10px] font-bold whitespace-nowrap text-brand-purple-dark/45">{`${seen}/${total} · ${firstView.split(" ")[0]}`}</span>
        )}
      </span>
    </span>
  );
}

/** Moldura do painel com título e ações (`rel-shpanel`). Novo — não existe no Phoenix. */
function PanelFrame({ actions, off, children }: { actions?: ReactNode; off?: boolean; children: ReactNode }) {
  return (
    <section className={cx("overflow-hidden rounded-xl border border-neutral-100 bg-white", off && "opacity-85")}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3.5">
        <h3 className="inline-flex items-center gap-2 text-base font-black text-brand-purple-dark">
          <Icon name="fa-share-nodes" type="solid" className="text-[13px] text-brand-blue-dark" />
          Compartilhamento com a família
        </h3>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

/** Texto de painel sem compartilhamento ativo (`rel-shpanel__empty`). Novo — não existe no Phoenix. */
function PanelEmpty({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 px-4 py-4.5 text-[13px] font-semibold text-pretty text-brand-purple-dark/55">
      <Icon name={icon} type="solid" className="mt-0.5 flex-none text-brand-purple-dark/35" />
      {children}
    </p>
  );
}

/**
 * Painel "Compartilhamento com a família" na visualização do relatório
 * (`RelSharePanel`): quem recebeu, quem abriu, lembrar e revogar.
 * Novo — não existe no Phoenix.
 */
export function SharePanel({ report, onShare }: { report: Report; onShare: () => void }) {
  const { revoke, remindGuardian } = useReports();
  const st = shareState(report);
  const s = report.share;

  if (!shareable(report)) {
    return (
      <PanelFrame off>
        <PanelEmpty icon="fa-lock">
          Só é possível compartilhar depois que o relatório for finalizado e tiver o documento final anexado.
        </PanelEmpty>
      </PanelFrame>
    );
  }

  if (st === "none" || st === "revoked" || !s) {
    return (
      <PanelFrame
        actions={
          <Button type="button" rightIcon="fa-share-nodes" iconType="solid" onClick={onShare}>
            Compartilhar
          </Button>
        }
      >
        <PanelEmpty icon={st === "revoked" ? "fa-ban" : "fa-mobile-screen"}>
          {st === "revoked" && s
            ? `Acesso revogado em ${s.revokedAt}. Os responsáveis não veem mais este documento no app.`
            : "Este documento ainda não foi compartilhado. Os responsáveis legais o veriam no app da família."}
        </PanelEmpty>
      </PanelFrame>
    );
  }

  const seen = s.recipients.filter((x) => x.viewedAt).length;

  return (
    <PanelFrame
      actions={
        <>
          <Button type="button" variant="tint" rightIcon="fa-pen" iconType="solid" onClick={onShare}>
            Editar
          </Button>
          <Button type="button" variant="outline" color="red" rightIcon="fa-ban" iconType="solid" onClick={() => revoke(report)}>
            Revogar acesso
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <ShareBadge report={report} />
        <span aria-hidden className="h-4.5 w-px bg-neutral-100" />
        <span className="text-[13px] font-semibold text-brand-purple-dark/60">
          Compartilhado por <strong className="font-extrabold text-brand-purple-dark">{s.sharedBy}</strong> em {s.sharedAt} ·{" "}
          {seen === 0 ? "ninguém abriu ainda" : `${seen} de ${s.recipients.length} já abri${seen === 1 ? "u" : "ram"}`}
        </span>
      </div>

      {s.note && (
        <p className="mx-4 mb-3 flex items-start gap-2.5 rounded-[10px] bg-brand-purple-dark/3 px-3.5 py-3 text-[13px] font-semibold text-pretty text-brand-purple-dark">
          <Icon name="fa-quote-left" type="solid" className="mt-0.5 flex-none text-[11px] text-brand-purple-dark/30" />
          {s.note}
        </p>
      )}

      <ul className="border-t border-neutral-100">
        {s.recipients.map((g) => (
          <li
            key={g.id}
            className="grid grid-cols-[1fr_auto] items-center gap-x-3.5 gap-y-1.5 border-t border-brand-purple-dark/5 px-4 py-3 first:border-t-0 md:grid-cols-[minmax(0,1fr)_auto_auto]"
          >
            <span className="flex min-w-0 flex-col">
              <strong className="truncate text-sm font-extrabold text-brand-purple-dark">{g.name}</strong>
              <span className="text-xs font-bold text-brand-purple-dark/45">{g.relation}</span>
            </span>
            <span
              className={cx(
                "inline-flex items-center gap-1.5 text-[13px] font-bold whitespace-nowrap",
                g.viewedAt ? "text-green-dark" : "text-brand-purple-dark/50",
              )}
            >
              {g.viewedAt ? (
                <>
                  <Icon name="fa-circle-check" type="solid" className="text-xs" /> Visualizado em {g.viewedAt}
                  {g.viewCount > 1 && <Tag item={`${g.viewCount}×`} variant="green" className="ml-1.5 text-[11px] font-black" />}
                </>
              ) : (
                <>
                  <Icon name="fa-clock" className="text-xs" /> Ainda não abriu
                </>
              )}
            </span>
            {!g.viewedAt && (
              <Button type="button" variant="tint" size="small" rightIcon="fa-bell" iconType="solid" onClick={() => remindGuardian(g)}>
                Lembrar
              </Button>
            )}
          </li>
        ))}
      </ul>
    </PanelFrame>
  );
}

/**
 * Gaveta "Compartilhar com a família" / "Editar compartilhamento"
 * (`RelShareModal`, que na v2 abre em drawer lateral). Novo — não existe no Phoenix.
 */
export function ShareModal({ report, onClose }: { report: Report; onClose: () => void }) {
  const { share } = useReports();
  const guardians = guardiansOf(report.patient.name);
  const already = report.share && !report.share.revokedAt ? report.share : null;
  const [sel, setSel] = useState<string[]>(() => (already ? already.recipients.map((g) => g.id) : guardians.map((g) => g.id)));
  const [note, setNote] = useState(already ? already.note : "");
  const toggle = (id: string, on: boolean) => setSel((p) => (on ? [...p.filter((x) => x !== id), id] : p.filter((x) => x !== id)));

  return (
    <DrawerModal
      id="relatorio-compartilhar"
      show
      onCancel={onClose}
      variant="medium"
      customTitle={{
        children: (
          <TitleWithSub
            title={already ? "Editar compartilhamento" : "Compartilhar com a família"}
            sub={`${report.patient.name} · ${relTypeName(report)}`}
          />
        ),
      }}
    >
      <div className="flex flex-col gap-4">
        {report.finalDoc && (
          <div className="flex items-center gap-3 rounded-[10px] border border-neutral-100 bg-brand-purple-dark/2 px-3.5 py-3">
            <Icon name="fa-file-pdf" type="solid" className="flex-none text-xl text-red-dark" />
            <div>
              <p className="text-sm font-extrabold text-brand-purple-dark">{report.finalDoc.name}</p>
              <p className="text-xs font-bold text-brand-purple-dark/45">{`${report.finalDoc.size} · finalizado em ${report.finalDoc.at}`}</p>
            </div>
          </div>
        )}

        <div>
          <Label>Responsáveis legais</Label>
          <div className="mt-2 flex flex-col gap-2">
            {guardians.map((g) => (
              <SwitchCard
                key={g.id}
                field={{ id: `compartilhar-${g.id}`, name: `recipients[${g.id}]`, value: sel.includes(g.id) }}
                title={g.name}
                description={g.relation}
                onChange={(event) => toggle(g.id, event.target.checked)}
              />
            ))}
          </div>
        </div>

        <Input
          id="compartilhar-mensagem"
          type="textarea"
          label="Mensagem (opcional)"
          rows={3}
          value={note}
          placeholder="Aparece junto ao documento no app da família."
          onChange={(event) => setNote(event.target.value)}
        />

        <Callout tone="info" icon="fa-mobile-screen">
          O documento fica disponível somente para leitura no app da família. Você poderá acompanhar quem abriu e revogar o acesso a qualquer momento.
        </Callout>
      </div>

      <DrawerFooter>
        <Button type="button" variant="tint" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          rightIcon="fa-share-nodes"
          iconType="solid"
          disabled={sel.length === 0}
          className="disabled:opacity-50"
          onClick={() => share(report.id, sel, note)}
        >
          {already ? "Salvar" : "Compartilhar"}
        </Button>
      </DrawerFooter>
    </DrawerModal>
  );
}
