/**
 * Relatórios do paciente — moldura do modo foco (`relatorios-foco.jsx`).
 * Novo — não existe no Phoenix: página cheia, sem o menu da clínica, com barra
 * superior fixa (voltar, título, status, ações) e rodapé fixo opcional.
 *
 * Exportado para as views de página cheia (visualizar, preencher, anexar):
 *
 * - `FocusPage` (`RfPage`)
 *     - `onBack: () => void` — o botão "Voltar" da barra superior.
 *     - `backLabel?: string` — texto do botão (padrão "Voltar").
 *     - `eyebrow: string` — linha pequena acima do título (paciente · período…).
 *     - `title: string` — nome do relatório.
 *     - `badge?: ReactNode` — ao lado do título (ex.: `<ReportStatusBadge>`).
 *     - `right?: ReactNode` — à direita da barra (ex.: `<SaveState>`, botões).
 *     - `foot?: ReactNode` — rodapé fixo das telas de edição; o conteúdo vai
 *       direto no flex (ex.: `<FocusFootStatus>` à esquerda e botões à direita).
 *     - `children` — normalmente um `<FocusBody>`.
 * - `FocusBody` (`rf-body`): `side?: ReactNode` vira a coluna lateral fixa
 *   (320px); sem `side`, uma coluna só e mais estreita. `children` é a principal.
 * - `FocusCard` (`rf-card`, sobre `Card`): `title?`, `icon?` (FA, estilo solid),
 *   `chip?: ReactNode` ao lado do título, `flush?` sem padding (conteúdo
 *   encostado nas bordas), `id?`, `children`.
 * - `FocusFootStatus`: texto de status do rodapé; `icon`, `iconClass?`, `children`.
 * - `SaveState` (`RfSaveState`): `state: { dirty: boolean; at: string | null }`.
 *   `dirty` → "Alterações não salvas"; senão `at` → "Rascunho salvo às 12:00"
 *   (hora) ou "Rascunho salvo em 16/07/2026 09:00" (carimbo); nada se ambos vazios.
 * - `ReportSheet` (`RfSheet`): `report: Report`, `content?: DraftContent`
 *   (padrão `report.draftContent`). A folha do documento com as seções do
 *   modelo (ou do protocolo) e as linhas de assinatura.
 * - `DocEmpty` (`rf-doc-empty`): `icon`, `title`, `text` — bloco "ainda não há documento".
 * - `FileRow` (`RelFileRow`): `file: { name; kind?; size?; at?; by? }`,
 *   `tone?: "support" | "final"`, `onRemove?`.
 * - `focusDueText(r)` (`rfDueText`): "30/07/2026 · faltam 14 dias", "Sem prazo"…
 */
import type { ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { Icon } from "../../components/Icon.js";
import { dueSub, relAuthors, relCouncil, relTypeName, sheetSections, type DraftContent, type Report } from "./model.js";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** "30/07/2026 · faltam 14 dias"; finalizado/cancelado só a data. */
export function focusDueText(r: Report): string {
  if (!r.due) return "Sem prazo";
  if (r.status === "finalizado" || r.status === "cancelado") return r.due;
  return `${r.due} · ${dueSub(r).toLowerCase()}`;
}

export type FocusPageProps = {
  onBack: () => void;
  backLabel?: string;
  eyebrow: string;
  title: string;
  badge?: ReactNode;
  right?: ReactNode;
  foot?: ReactNode;
  children: ReactNode;
};

/** Página do modo foco (`RfPage`). Novo — não existe no Phoenix. */
export function FocusPage({ onBack, backLabel = "Voltar", eyebrow, title, badge, right, foot, children }: FocusPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 flex min-h-18 items-center gap-4 bg-white px-5 py-3 shadow-main lg:px-8">
        <Button type="button" variant="ghost" size="medium" leftIcon="fa-arrow-left" iconType="solid" className="flex-none whitespace-nowrap" onClick={onBack}>
          {backLabel}
        </Button>
        <span aria-hidden className="h-8 w-px flex-none bg-brand-purple-dark/10" />
        <div className="min-w-0 flex-auto">
          <p className="truncate text-xs font-bold text-brand-purple-dark/55">{eyebrow}</p>
          <h1 className="mt-0.5 flex flex-wrap items-center gap-2.5 text-xl font-extrabold text-brand-purple-dark">
            {title}
            {badge}
          </h1>
        </div>
        {right && <div className="flex flex-none items-center gap-3">{right}</div>}
      </header>
      {children}
      {foot && (
        <footer className="sticky bottom-0 z-20 border-t border-brand-purple-dark/10 bg-white shadow-main">
          <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-5 py-3.5 lg:px-8">{foot}</div>
        </footer>
      )}
    </div>
  );
}

/** Corpo do modo foco: coluna principal e lateral fixa (`rf-body`). Novo — não existe no Phoenix. */
export function FocusBody({ side, children }: { side?: ReactNode; children: ReactNode }) {
  return (
    <div
      className={cx(
        "mx-auto grid w-full flex-auto items-start gap-6 px-5 pt-5 pb-8 lg:px-8 lg:pt-6 lg:pb-10",
        side ? "max-w-[1320px] grid-cols-1 min-[860px]:grid-cols-[minmax(0,1fr)_320px]" : "max-w-[980px] grid-cols-1",
      )}
    >
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
      {side && (
        <aside className="flex flex-col gap-4 min-[860px]:sticky min-[860px]:top-24 min-[860px]:max-h-[calc(100vh-120px)] min-[860px]:overflow-y-auto">
          {side}
        </aside>
      )}
    </div>
  );
}

/** Título de cartão em caixa alta com ícone (`rf-card__title`). Novo — não existe no Phoenix. */
export function FocusCardTitle({ icon, chip, children }: { icon?: string; chip?: ReactNode; children: ReactNode }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-[13px] font-black tracking-[0.04em] text-brand-purple-dark/55 uppercase">
      {icon && <Icon name={icon} type="solid" className="text-brand-blue" />}
      {children}
      {chip && <span className="normal-case tracking-normal">{chip}</span>}
    </h3>
  );
}

/** Cartão do modo foco (`rf-card`), sobre o `Card` do catálogo. Novo — não existe no Phoenix. */
export function FocusCard({
  id,
  title,
  icon,
  chip,
  flush,
  children,
}: {
  id?: string;
  title?: string;
  icon?: string;
  chip?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  if (flush) {
    // `Card` já traz `p-6`; o cartão encostado nas bordas usa a mesma casca sem padding.
    return (
      <div id={id} className="scroll-mt-24 overflow-hidden rounded-2xl bg-white shadow-main">
        {children}
      </div>
    );
  }
  return (
    <Card id={id} className="scroll-mt-24">
      {title && (
        <FocusCardTitle icon={icon} chip={chip}>
          {title}
        </FocusCardTitle>
      )}
      {children}
    </Card>
  );
}

/** Status à esquerda do rodapé fixo (`rf-foot__status`). Novo — não existe no Phoenix. */
export function FocusFootStatus({ icon, iconClass, children }: { icon: string; iconClass?: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-brand-purple-dark/60">
      <Icon name={icon} type="solid" className={iconClass} />
      {children}
    </span>
  );
}

export type SaveStateValue = { dirty: boolean; at: string | null };

/** Estado do rascunho na barra superior (`RfSaveState`). Novo — não existe no Phoenix. */
export function SaveState({ state }: { state: SaveStateValue }) {
  const cls = "inline-flex items-center gap-2 text-[13px] font-bold whitespace-nowrap text-brand-purple-dark/55";
  if (state.dirty) return <span className={cls}>Alterações não salvas</span>;
  if (state.at) return <span className={cls}>{`Rascunho salvo ${state.at.length > 5 ? "em" : "às"} ${state.at}`}</span>;
  return null;
}

/** Bloco "sem documento ainda" (`rf-doc-empty`). Novo — não existe no Phoenix. */
export function DocEmpty({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="flex items-center gap-4 py-1">
      <span className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-brand-purple-dark/5 text-xl text-brand-purple-dark/45">
        <Icon name={icon} type="solid" />
      </span>
      <div>
        <p className="text-[15px] font-extrabold text-brand-purple-dark">{title}</p>
        <p className="mt-0.5 text-[13px] text-brand-purple-dark/60">{text}</p>
      </div>
    </div>
  );
}

export type FileLike = { name: string; kind?: string; size?: string; at?: string; by?: string };

const fileIcon = (name: string) => {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  if (ext === "pdf") return "fa-file-pdf";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "fa-file-image";
  if (["doc", "docx"].includes(ext)) return "fa-file-word";
  return "fa-file";
};

/** Linha de arquivo, de apoio ou documento final (`RelFileRow`). Novo — não existe no Phoenix. */
export function FileRow({ file, tone = "support", onRemove }: { file: FileLike; tone?: "support" | "final"; onRemove?: () => void }) {
  const final = tone === "final";
  return (
    <div className={cx("flex items-center gap-3 rounded-xl border px-3.5 py-3", final ? "border-transparent bg-green-light" : "border-brand-purple-dark/10")}>
      <span
        className={cx(
          "inline-flex h-10 w-10 flex-none items-center justify-center rounded-[10px] text-lg",
          final ? "bg-green/20 text-green-dark" : "bg-brand-purple-dark/6 text-brand-purple-dark",
        )}
      >
        <Icon name={fileIcon(file.name)} type="solid" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-brand-purple-dark">{file.name}</p>
        <p className="mt-0.5 text-xs text-brand-purple-dark/55">{[file.kind, file.size, file.at && `enviado ${file.at}`, file.by].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="flex flex-none gap-1.5">
        <Button type="button" size="medium" variant="ghost" aria-label="Baixar" title="Baixar">
          <Icon name="fa-download" type="solid" />
        </Button>
        {onRemove && (
          <Button type="button" size="medium" variant="tint" color="red" aria-label="Remover" title="Remover" onClick={onRemove}>
            <Icon name="fa-trash-alt" type="solid" />
          </Button>
        )}
      </div>
    </div>
  );
}

/** Folha do documento: prévia do relatório com as seções e assinaturas (`RfSheet`). Novo — não existe no Phoenix. */
export function ReportSheet({ report: r, content }: { report: Report; content?: DraftContent }) {
  const c = content ?? r.draftContent ?? {};
  const sig = r.signatures ?? {};
  return (
    <div className="mx-auto max-w-[620px] rounded-md bg-white px-6 py-8 shadow-[0_4px_24px_rgba(43,35,91,0.14)] sm:px-12 sm:py-11">
      <h1 className="mb-1 text-xl font-extrabold text-brand-purple-dark">{relTypeName(r)}</h1>
      <p className="mb-6 text-[13px] text-brand-purple-dark/55">{[r.patient.name, r.period].filter(Boolean).join(" · ")}</p>
      {sheetSections(r).map((s) => {
        const v = c[s.id];
        return (
          <section key={s.id}>
            <h2 className="mt-5.5 mb-2 text-sm font-extrabold tracking-[0.03em] text-brand-blue-dark uppercase">{s.title}</h2>
            {s.kind === "image" ? (
              <p className="mb-2.5 text-[13px] text-brand-purple-dark/40 italic">
                {Array.isArray(v) && v.length ? `${v.length} imagem(ns) anexada(s)` : "Sem imagens anexadas."}
              </p>
            ) : String(v ?? "").trim() ? (
              <p className="mb-2.5 text-sm/[1.65] whitespace-pre-line text-brand-purple-dark/90">{String(v)}</p>
            ) : (
              <>
                <div className="mb-2.5 h-2.5 w-full rounded-full bg-brand-purple-dark/7" />
                <div className="mb-2.5 h-2.5 w-[92%] rounded-full bg-brand-purple-dark/7" />
                <div className="mb-2.5 h-2.5 w-[64%] rounded-full bg-brand-purple-dark/7" />
              </>
            )}
          </section>
        );
      })}
      <div className="mt-10 border-t border-brand-purple-dark/20 pt-3">
        {relAuthors(r).map((a) => (
          <p key={a.id} className="mb-1 text-[13px] text-brand-purple-dark/60">
            {`${a.name} · ${relCouncil(a.id)} — ${sig[a.id] ? `assinado em ${sig[a.id]}` : "aguardando assinatura"}`}
          </p>
        ))}
      </div>
    </div>
  );
}
