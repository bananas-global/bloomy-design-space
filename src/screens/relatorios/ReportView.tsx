/**
 * Visualizar relatório em modo foco (`RelViewPage` de `relatorios-foco.jsx`).
 * Tela Relatório do fluxo (`/relatorios/:reportId`). Documento, autores, compartilhamento,
 * dados da solicitação e arquivos à esquerda; resumo, ações e histórico fixos
 * à direita.
 */
import type { ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Progress, TimelineList } from "../../components/Layout.js";
import { AuthorsPanel } from "./Authors.js";
import { DocEmpty, FileRow, FocusBody, FocusCard, FocusPage, ReportSheet, focusDueText } from "./Focus.js";
import { dueSub, filledSections, isLate, relIsModel, relIsProtocol, relOrigin, relTypeName, shareState, shareable, type Report } from "./model.js";
import { Callout, ReportStatusBadge } from "./parts.js";
import { SharePanel } from "./Share.js";
import { useReports } from "./store.js";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const DOC_ID = (r: Report) => `relatorio-documento-${r.id}`;

/** Par rótulo/valor dos dados da solicitação (`RelDefRow`). Novo — não existe no Phoenix. */
function DefRow({ label, value, muted }: { label: string; value: ReactNode; muted?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold tracking-[0.02em] text-brand-purple-dark/50 uppercase">{label}</p>
      <p className={cx("text-[15px]", muted ? "font-medium text-brand-purple-dark/45 italic" : "font-semibold text-brand-purple-dark")}>{value}</p>
    </div>
  );
}

/** O cartão do documento, conforme o status (`RfDocument`). Novo — não existe no Phoenix. */
function DocumentCard({ report: r }: { report: Report }) {
  const model = relIsModel(r);
  const st = r.status;
  if (st === "cancelado") return null;

  if (st === "solicitado") {
    return (
      <FocusCard id={DOC_ID(r)} title="Documento" icon="fa-file-lines">
        <DocEmpty
          icon="fa-file-circle-plus"
          title="Ainda não iniciado"
          text={model ? `O modelo ${relIsProtocol(r) ? "de protocolo" : relTypeName(r)} abre pronto para preencher.` : "O documento final será anexado em PDF."}
        />
      </FocusCard>
    );
  }

  if (st === "em_andamento") {
    if (!model) {
      const f = r.draftContent?.file as { name: string; size?: string; at?: string; by?: string; kind?: string } | undefined;
      return (
        <FocusCard id={DOC_ID(r)} title="Documento" icon="fa-file-lines">
          {f ? (
            <FileRow file={f} tone="final" />
          ) : (
            <DocEmpty icon="fa-file-arrow-up" title="Aguardando o PDF final" text="Sem modelo interno — o documento é produzido fora do sistema e anexado aqui." />
          )}
        </FocusCard>
      );
    }
    const p = filledSections(r);
    return (
      <FocusCard id={DOC_ID(r)} title="Documento" icon="fa-file-lines">
        <DocEmpty
          icon="fa-pen-ruler"
          title="Em produção"
          text={r.draft ? `Última alteração por ${r.draft.by} em ${r.draft.updatedAt}` : "Nenhum rascunho salvo ainda."}
        />
        <div className="mt-4 flex items-center gap-2.5">
          <Progress value={p.total ? Math.round((p.done / p.total) * 100) : 0} showPercentage={false} className="flex-1 items-center" />
          <span className="text-[12.5px] font-bold whitespace-nowrap text-brand-purple-dark/60">{`${p.done} de ${p.total} seções preenchidas`}</span>
        </div>
      </FocusCard>
    );
  }

  /* assinaturas / finalizado */
  if (!model) {
    return (
      <FocusCard id={DOC_ID(r)} title="Documento final" icon="fa-file-circle-check">
        {r.finalDoc && <FileRow file={{ ...r.finalDoc, kind: "PDF anexado" }} tone="final" />}
      </FocusCard>
    );
  }
  return (
    <FocusCard id={DOC_ID(r)} flush>
      <div className="flex items-center justify-between gap-3 border-b border-brand-purple-dark/10 bg-brand-purple-dark/3 px-4.5 py-3.5">
        <span className="flex items-center gap-2.5 text-sm font-bold text-brand-purple-dark">
          <Icon name="fa-file-pdf" type="solid" className="text-lg text-red" />
          {r.finalDoc ? r.finalDoc.name : "Prévia · texto bloqueado para assinaturas"}
        </span>
        {r.finalDoc && <span className="text-xs text-brand-purple-dark/55">{`${r.finalDoc.size} · emitido em ${r.finalDoc.at}`}</span>}
      </div>
      <div className="min-h-105 bg-brand-purple-dark/3 px-4 py-10 sm:px-8">
        <ReportSheet report={r} />
      </div>
    </FocusCard>
  );
}

type SideAction = { label: string; icon: string; danger?: boolean; run: () => void };

/** Resumo, ação principal e ações secundárias (`RfActions`). Novo — não existe no Phoenix. */
function ActionsCard({ report: r }: { report: Report }) {
  const { viewAs, toEditor, openModal, reopen, download, backToEdit } = useReports();
  const model = relIsModel(r);
  const isCoord = viewAs === "coord";
  const st = r.status;
  const produce = () => toEditor(r.id);
  const late = isLate(r);
  const readDoc = () => document.getElementById(DOC_ID(r))?.scrollIntoView({ behavior: "smooth", block: "start" });

  const sec: SideAction[] = [];
  if (st === "finalizado" && shareable(r) && ["none", "revoked"].includes(shareState(r)))
    sec.push({ label: "Compartilhar com a família", icon: "fa-share-nodes", run: () => openModal({ kind: "share", id: r.id }) });
  if (isCoord && (st === "solicitado" || st === "em_andamento")) {
    sec.push({ label: "Editar solicitação", icon: "fa-pen-to-square", run: () => openModal({ kind: "edit", id: r.id }) });
    sec.push({ label: "Reatribuir profissional", icon: "fa-user-pen", run: () => openModal({ kind: "reassign", id: r.id }) });
  }
  if (isCoord && st === "assinaturas") sec.push({ label: "Voltar para edição", icon: "fa-rotate-left", run: () => backToEdit(r.id) });
  if (isCoord && (st === "finalizado" || st === "cancelado"))
    sec.push({ label: st === "cancelado" ? "Reabrir solicitação" : "Reabrir relatório", icon: "fa-rotate-left", run: () => reopen(r.id) });
  if (isCoord && (st === "solicitado" || st === "em_andamento"))
    sec.push({ label: "Cancelar solicitação", icon: "fa-ban", danger: true, run: () => openModal({ kind: "cancel", id: r.id }) });

  const primary =
    st === "solicitado" ? (
      <Button type="button" rightIcon="fa-play" iconType="solid" className="w-full" onClick={produce}>
        {model ? "Iniciar relatório" : "Iniciar / anexar documento"}
      </Button>
    ) : st === "em_andamento" ? (
      <Button type="button" rightIcon="fa-pen" iconType="solid" className="w-full" onClick={produce}>
        {model ? "Continuar edição" : "Continuar / anexar"}
      </Button>
    ) : st === "assinaturas" ? (
      <Button type="button" rightIcon="fa-file-lines" iconType="solid" className="w-full" onClick={readDoc}>
        Ler documento
      </Button>
    ) : st === "finalizado" ? (
      <Button type="button" rightIcon="fa-download" iconType="solid" className="w-full" onClick={() => download(r)}>
        Baixar PDF
      </Button>
    ) : null;

  const rows: [string, string, boolean?][] = [
    ["Prazo", focusDueText(r), late],
    ["Responsável", r.prof ? r.prof.name : "Sem responsável"],
    ["Solicitante", r.requester],
  ];

  return (
    <FocusCard>
      <div className="mb-4 flex flex-col gap-3 border-b border-brand-purple-dark/10 pb-4">
        {rows.map(([label, value, danger]) => (
          <div key={label} className="flex justify-between gap-3 text-[13px]">
            <span className="font-semibold text-brand-purple-dark/55">{label}</span>
            <span className={cx("text-right font-bold", danger ? "text-red-dark" : "text-brand-purple-dark")}>{value}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {primary}
        {sec.length > 0 && (
          <div className={cx("flex flex-col gap-0.5", primary && "mt-2 border-t border-brand-purple-dark/10 pt-2")}>
            {sec.map((a) => (
              <Button
                key={a.label}
                type="button"
                variant="ghost"
                leftIcon={a.icon}
                iconType="solid"
                className={cx("w-full justify-start text-left", a.danger && "text-red")}
                onClick={a.run}
              >
                {a.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </FocusCard>
  );
}

export function ReportView({ report: r }: { report: Report }) {
  const { toList, openModal } = useReports();
  const late = isLate(r);

  return (
    <FocusPage
      onBack={toList}
      eyebrow={`Relatórios · ${r.patient.name}${r.period ? ` · ${r.period}` : ""}`}
      title={relTypeName(r)}
      badge={<ReportStatusBadge status={r.status} />}
    >
      <FocusBody
        side={
          <>
            <ActionsCard report={r} />
            <FocusCard title="Histórico" icon="fa-clock-rotate-left">
              <div className="max-h-[360px] overflow-y-auto pt-1 pl-4 [&>ol>li:last-child]:mb-0">
                <TimelineList
                  item={[...r.history].reverse().map((h) => ({
                    icon: `fa-solid ${h.icon || "fa-circle"}`,
                    color: "blue" as const,
                    children: (
                      <div className="pt-1">
                        <p className="text-sm font-bold text-brand-purple-dark">{h.text}</p>
                        <p className="mt-0.5 text-xs text-brand-purple-dark/50">{`${h.who} · ${h.at}`}</p>
                      </div>
                    ),
                  }))}
                />
              </div>
            </FocusCard>
          </>
        }
      >
        {late && (
          <Callout tone="danger" icon="fa-triangle-exclamation">
            <strong>{`${dueSub(r)}.`}</strong> {`Prazo era ${r.due}.`}
          </Callout>
        )}
        {r.status === "cancelado" && (
          <Callout tone="danger" icon="fa-ban">
            <strong>Solicitação cancelada.</strong> {r.cancelReason}
          </Callout>
        )}

        <DocumentCard report={r} />

        {relIsModel(r) && r.status !== "cancelado" && (
          <FocusCard>
            <AuthorsPanel report={r} />
          </FocusCard>
        )}

        {r.status === "finalizado" && (
          <FocusCard flush>
            <SharePanel report={r} onShare={() => openModal({ kind: "share", id: r.id })} />
          </FocusCard>
        )}

        <FocusCard title="Dados da solicitação" icon="fa-clipboard-list">
          <div className="grid grid-cols-1 gap-x-8 gap-y-4.5 sm:grid-cols-2">
            <DefRow label="Paciente" value={`${r.patient.name}${r.patient.age != null ? ` · ${r.patient.age} anos` : ""}`} />
            <DefRow label="Tipo de relatório" value={relTypeName(r)} />
            <DefRow label="Origem do documento" value={relOrigin(r)} />
            <DefRow label="Período de referência" value={r.period || "Não informado"} muted={!r.period} />
            <DefRow label="Solicitante" value={r.requester} />
            <DefRow label="Criada por" value={`${r.requestedBy} · ${r.requestedAt}`} />
          </div>
          {(r.obs || r.extra) && (
            <div className="mt-5 rounded-xl bg-brand-purple-dark/3 p-4 text-sm/[1.55] text-brand-purple-dark">
              {r.obs}
              {r.extra && (
                <>
                  {r.obs && (
                    <>
                      <br />
                      <br />
                    </>
                  )}
                  <strong className="font-extrabold">Complemento:</strong> {r.extra}
                </>
              )}
            </div>
          )}
        </FocusCard>

        {r.support.length > 0 && (
          <FocusCard title="Arquivos de apoio" icon="fa-paperclip">
            <div className="flex flex-col gap-2.5">
              {r.support.map((f, i) => (
                <FileRow key={`${f.name}-${i}`} file={f} />
              ))}
            </div>
          </FocusCard>
        )}
      </FocusBody>
    </FocusPage>
  );
}
