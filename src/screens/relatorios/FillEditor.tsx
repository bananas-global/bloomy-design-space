/**
 * Preencher relatório em modo foco (telas Editor de modelo e Editor de protocolo): editor de modelo interno
 * (`RfModelEditor`) e de protocolo (`RfProtocolEditor`), sobre a casca comum
 * `EditorPage` (`RfEditorPage` de `relatorios-foco.jsx`) e a lateral
 * `ProduceSide` (`RelProduceSide` de `relatorios-fill.jsx`).
 *
 * Salvamento é manual, como no protótipo: a barra mostra "Alterações não
 * salvas" e, ao sair com alterações, o modal "Sair sem salvar?" oferece salvar
 * o rascunho. "Pré-visualizar" abre a folha (`ReportSheet`) com o conteúdo
 * atual. O envio usa `submitForSignature` (2+ autores → assinaturas; 1 autor →
 * assina e finaliza).
 *
 * O texto de cada seção é editado no `RichText` do catálogo e guardado em
 * `draftContent` como texto simples (parágrafos por quebra de linha), que é o
 * que a folha e o progresso de seções leem.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Label } from "../../components/Input.js";
import { Card } from "../../components/Card.js";
import { Icon } from "../../components/Icon.js";
import { Modal } from "../../components/Overlay.js";
import { RichText, type AiGenerate } from "../../components/RichText.js";
import { CollabBar } from "./Authors.js";
import { FileRow, FocusBody, FocusCard, FocusFootStatus, FocusPage, ReportSheet, SaveState, focusDueText } from "./Focus.js";
import { protoApp, protoAppsFor, PROTOCOL_APPS } from "./fixtures.js";
import {
  REL_PROTO_SECTIONS,
  dueSub,
  isLate,
  relAuthors,
  relIsProtocol,
  relStamp,
  relTypeName,
  sectionsFor,
  vbLocalText,
  type DraftContent,
  type Report,
} from "./model.js";
import { ImageField, type ReportImage } from "./ImageField.js";
import { ProtocolSource, VbBlock, VbDomainTable, VbLevelBars, VbMilestoneGrid } from "./ProtocolCharts.js";
import { useReports } from "./store.js";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ============================================================
   Texto simples ↔ HTML do RichText
   ============================================================ */

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Texto do `draftContent` → HTML inicial do editor (um `<p>` por linha). */
export function textToHtml(text: unknown): string {
  const s = String(text ?? "");
  if (!s.trim()) return "";
  return s
    .split("\n")
    .map((line) => `<p>${line ? escapeHtml(line) : "<br>"}</p>`)
    .join("");
}
/** HTML do editor (`getSemanticHTML`) → texto simples do `draftContent`. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|li|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ============================================================
   Rascunho (salvamento manual)
   ============================================================ */

export type DraftState = { dirty: boolean; at: string | null; saveNow: () => void };

/**
 * Estado do rascunho de um editor (`useRfDraft`): `dirty` compara com o último
 * salvo; `saveNow` grava no store e passa a mostrar "Rascunho salvo às HH:MM".
 */
export function useDraft(r: Report, content: DraftContent): DraftState {
  const { saveDraft } = useReports();
  const [at, setAt] = useState<string | null>(r.draft ? r.draft.updatedAt : null);
  const [base, setBase] = useState(() => JSON.stringify(content));
  const serialized = JSON.stringify(content);
  return {
    dirty: serialized !== base,
    at,
    saveNow() {
      saveDraft(r.id, content);
      setBase(serialized);
      setAt(relStamp().split(" ")[1] ?? null);
    },
  };
}

/** Abre o editor: "Solicitado" vira "Em andamento" uma vez, com `text` no histórico. */
export function useStartReport(r: Report, text: string) {
  const { startReport } = useReports();
  useEffect(() => {
    startReport(r.id, text);
    // só na abertura do editor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ============================================================
   Casca comum dos editores
   ============================================================ */

/** Rótulo e valor do cartão "Solicitação" (`rel-ctx__row`). Novo — não existe no Phoenix. */
function CtxRow({ label, children, late }: { label: string; children: ReactNode; late?: boolean }) {
  return (
    <div className="flex flex-col gap-[3px]">
      <span className="text-[11px] font-extrabold tracking-[0.03em] text-brand-purple-dark/50 uppercase">{label}</span>
      <span className={cx("text-sm font-semibold", late ? "text-red" : "text-brand-purple-dark")}>{children}</span>
    </div>
  );
}

/** Lateral do editor: solicitação, observações e arquivos de apoio (`RelProduceSide`). Novo — não existe no Phoenix. */
export function ProduceSide({ report: r }: { report: Report }) {
  const late = isLate(r);
  return (
    <>
      <FocusCard title="Solicitação">
        <div className="flex flex-col gap-3.5">
          <CtxRow label="Paciente">{`${r.patient.name}${r.patient.age != null ? ` · ${r.patient.age} anos` : ""}`}</CtxRow>
          <CtxRow label="Tipo">{relTypeName(r)}</CtxRow>
          <CtxRow label="Solicitante">{r.requester}</CtxRow>
          <CtxRow label="Prazo" late={late}>{`${r.due || "Sem prazo"}${late ? ` · ${dueSub(r)}` : ""}`}</CtxRow>
        </div>
      </FocusCard>
      {r.obs && (
        <FocusCard title="Observações da solicitação">
          <p className="rounded-xl bg-brand-purple-dark/3 p-4 text-[13px]/[1.55] whitespace-pre-line text-brand-purple-dark">
            {r.obs}
            {r.extra && `\n\n${r.extra}`}
          </p>
        </FocusCard>
      )}
      <FocusCard title="Arquivos de apoio">
        {r.support.length === 0 ? (
          <p className="text-[13px] font-medium text-brand-purple-dark/45 italic">Nenhum arquivo de apoio.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {r.support.map((f, i) => (
              <FileRow key={`${f.name}-${i}`} file={f} />
            ))}
          </div>
        )}
      </FocusCard>
    </>
  );
}

export type EditorPageProps = {
  report: Report;
  save: DraftState;
  /** Volta para a visualização do relatório. */
  onBack: () => void;
  /** Rodapé fixo: status à esquerda e botões à direita. */
  foot: ReactNode;
  /** Conteúdo da pré-visualização; sem ele, sem o botão "Pré-visualizar". */
  preview?: ReactNode;
  children: ReactNode;
};

/**
 * Casca dos editores (`RfEditorPage`). Novo — não existe no Phoenix: barra com
 * estado do rascunho e "Pré-visualizar", corpo com a lateral da solicitação,
 * rodapé fixo, e os modais "Pré-visualização" e "Sair sem salvar?".
 */
export function EditorPage({ report: r, save, onBack, foot, preview, children }: EditorPageProps) {
  const { toast } = useReports();
  const [leave, setLeave] = useState(false);
  const [showPrev, setShowPrev] = useState(false);
  const back = () => (save.dirty ? setLeave(true) : onBack());

  return (
    <FocusPage
      onBack={back}
      eyebrow={`${r.patient.name}${r.period ? ` · ${r.period}` : ""} · Prazo ${focusDueText(r)}`}
      title={relTypeName(r)}
      right={
        <>
          <SaveState state={save} />
          {preview && (
            <Button type="button" variant="tint" rightIcon="fa-eye" iconType="solid" onClick={() => setShowPrev(true)}>
              Pré-visualizar
            </Button>
          )}
        </>
      }
      foot={foot}
    >
      <FocusBody side={<ProduceSide report={r} />}>
        <Card>
          <div className="flex flex-col gap-[22px] sm:px-2 sm:pt-1 sm:pb-2">{children}</div>
        </Card>
      </FocusBody>

      <Modal
        id={`relatorio-previa-${r.id}`}
        show={showPrev}
        onCancel={() => setShowPrev(false)}
        title="Pré-visualização"
        variant="custom"
        customSize="max-w-[860px]"
      >
        <p className="mb-5 text-sm text-brand-purple-dark/60">Como o documento vai ficar com o conteúdo atual — inclui alterações ainda não salvas.</p>
        <div className="rounded-xl bg-brand-purple-dark/3 px-6 py-8">{preview}</div>
        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={() => setShowPrev(false)}>
            Voltar para a edição
          </Button>
        </div>
      </Modal>

      <Modal id={`relatorio-sair-${r.id}`} show={leave} onCancel={() => setLeave(false)} title="Sair sem salvar?" variant="extra_small">
        <p className="text-sm/[1.55] text-brand-purple-dark">Você fez alterações que ainda não foram salvas. Se sair agora, elas serão perdidas.</p>
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="tint"
            color="red"
            onClick={() => {
              setLeave(false);
              onBack();
            }}
          >
            Sair sem salvar
          </Button>
          <Button
            type="button"
            rightIcon="fa-floppy-disk"
            iconType="solid"
            onClick={() => {
              save.saveNow();
              setLeave(false);
              toast("success", "Rascunho salvo", "Você pode continuar depois.");
              onBack();
            }}
          >
            Salvar rascunho e sair
          </Button>
        </div>
      </Modal>
    </FocusPage>
  );
}

/** Botão "Salvar rascunho" do rodapé. */
export function SaveDraftButton({ save, toastText = "Você pode continuar depois.", title = "Rascunho salvo" }: { save: DraftState; toastText?: string; title?: string }) {
  const { toast } = useReports();
  return (
    <Button
      type="button"
      variant="tint"
      rightIcon="fa-floppy-disk"
      iconType="solid"
      onClick={() => {
        save.saveNow();
        toast("success", title, toastText);
      }}
    >
      Salvar rascunho
    </Button>
  );
}

/**
 * Seção de texto do modelo: rótulo, orientação do modelo e o `RichText` do
 * catálogo. Novo — não existe no Phoenix (a composição; o editor é o espelho).
 */
function SectionText({
  id,
  title,
  hint,
  value,
  onChange,
  aiGenerate,
}: {
  id: string;
  title: string;
  hint?: string;
  value: unknown;
  onChange: (text: string) => void;
  aiGenerate?: AiGenerate;
}) {
  return (
    <div className="relative">
      <Label htmlFor={id}>{title}</Label>
      {hint && <p className="mt-1.5 text-[13px] text-brand-purple-dark/55">{hint}</p>}
      <div className="mt-2">
        <RichText id={id} name={id} value={textToHtml(value)} aiGenerate={aiGenerate} className="min-h-40!" onChange={(html) => onChange(htmlToText(html))} />
      </div>
    </div>
  );
}

const sectionFilled = (v: unknown) => String(v ?? "").trim().length > 0;

/* ============================================================
   Modelo interno
   ============================================================ */

type ExtraImage = { id: string; title: string };

/** Editor de modelo interno (`RfModelEditor`). Novo — não existe no Phoenix. */
function ModelEditor({ report: r, onBack }: { report: Report; onBack: () => void }) {
  const { submitForSignature } = useReports();
  const sections = sectionsFor(r.typeId);
  const [vals, setVals] = useState<DraftContent>(() => r.draftContent ?? {});
  const up = (id: string, v: unknown) => setVals((p) => ({ ...p, [id]: v }));
  const save = useDraft(r, vals);
  useStartReport(r, "Relatório iniciado");
  const extras = (vals.__extraImages as ExtraImage[] | undefined) ?? [];
  const seq = useRef(extras.length);
  const texts = sections.filter((s) => s.kind !== "image");
  const filled = texts.filter((s) => sectionFilled(vals[s.id])).length;
  const multi = relAuthors(r).length > 1;

  return (
    <EditorPage
      report={r}
      save={save}
      onBack={onBack}
      preview={<ReportSheet report={r} content={vals} />}
      foot={
        <>
          <FocusFootStatus icon="fa-list-check">{`${filled} de ${texts.length} seções preenchidas`}</FocusFootStatus>
          <div className="flex flex-wrap gap-3">
            <SaveDraftButton save={save} />
            <Button
              type="button"
              color="green"
              rightIcon="fa-signature"
              iconType="solid"
              onClick={() => {
                submitForSignature(r.id, { draftContent: vals });
                onBack();
              }}
            >
              {multi ? "Enviar para assinaturas" : "Assinar e finalizar"}
            </Button>
          </div>
        </>
      }
    >
      <CollabBar report={r} />
      {sections.map((s) =>
        s.kind === "image" ? (
          <ImageField key={s.id} field={{ id: `${r.id}-${s.id}`, title: s.title, hint: s.hint, max: s.max }} value={vals[s.id] as ReportImage[] | undefined} onChange={(v) => up(s.id, v)} />
        ) : (
          <SectionText key={s.id} id={`${r.id}-${s.id}`} title={s.title} hint={s.ph} value={vals[s.id]} onChange={(t) => up(s.id, t || undefined)} />
        ),
      )}
      {extras.map((x) => (
        <ImageField
          key={x.id}
          field={{ id: `${r.id}-${x.id}`, title: x.title, max: 6 }}
          value={vals[x.id] as ReportImage[] | undefined}
          onChange={(v) => up(x.id, v)}
          titleEditable
          onTitle={(t) => up("__extraImages", extras.map((y) => (y.id === x.id ? { ...y, title: t } : y)))}
          onRemoveField={() =>
            setVals((p) => {
              const next: DraftContent = { ...p, __extraImages: extras.filter((y) => y.id !== x.id) };
              delete next[x.id];
              return next;
            })
          }
        />
      ))}
      <Button
        type="button"
        variant="ghost"
        leftIcon="fa-plus"
        iconType="solid"
        className="w-full items-center! justify-start! gap-2 border border-dashed border-neutral-100 text-brand-blue-dark!"
        onClick={() => up("__extraImages", [...extras, { id: `xi-${++seq.current}`, title: "" }])}
      >
        Adicionar campo de imagem <span className="text-[13px] font-semibold text-brand-purple-dark/55">para gráficos que não estão no modelo</span>
      </Button>
    </EditorPage>
  );
}

/* ============================================================
   Relatório de protocolo (VB-MAPP)
   ============================================================ */

/** Escreve o texto base aos poucos, como o fluxo de IA do `RichText`. */
function streamText(text: string): AiGenerate {
  return (update, complete) =>
    new Promise<void>((resolve) => {
      const words = text.split(" ");
      let i = 0;
      const tick = () => {
        if (i >= words.length) {
          complete(text);
          resolve();
          return;
        }
        update(`${i ? " " : ""}${words[i++]}`);
        setTimeout(tick, 18);
      };
      tick();
    });
}

/** Editor do Relatório de protocolo (`RfProtocolEditor`). Novo — não existe no Phoenix. */
function ProtocolEditor({ report: r, onBack }: { report: Report; onBack: () => void }) {
  const { submitForSignature, toast } = useReports();
  const app = protoApp(r.protocolAppId) ?? protoAppsFor(r.patient.name)[0] ?? PROTOCOL_APPS[0]!;
  const [vals, setVals] = useState<DraftContent>(() => r.draftContent ?? {});
  const [busy, setBusy] = useState(false);
  /** Troca a chave dos editores quando "Gerar todo o relatório" reescreve as seções. */
  const [gen, setGen] = useState(0);
  const up = (id: string, v: unknown) => setVals((p) => ({ ...p, [id]: v }));
  const save = useDraft(r, vals);
  useStartReport(r, "Relatório iniciado");
  const filled = REL_PROTO_SECTIONS.filter((s) => sectionFilled(vals[s.id])).length;
  const multi = relAuthors(r).length > 1;

  function genAll() {
    setBusy(true);
    setTimeout(() => {
      setVals((p) => {
        const next = { ...p };
        REL_PROTO_SECTIONS.forEach((s) => (next[s.id] = vbLocalText(s.id, app, r.patient.name)));
        return next;
      });
      setGen((g) => g + 1);
      setBusy(false);
      toast("success", "Relatório gerado", "Todas as seções foram preenchidas pela IA. Revise antes de finalizar.");
    }, 900);
  }

  return (
    <EditorPage
      report={r}
      save={save}
      onBack={onBack}
      preview={<ReportSheet report={r} content={vals} />}
      foot={
        <>
          <FocusFootStatus icon="fa-list-check">{`${filled} de ${REL_PROTO_SECTIONS.length} seções preenchidas`}</FocusFootStatus>
          <div className="flex flex-wrap gap-3">
            <SaveDraftButton save={save} />
            <Button
              type="button"
              color="green"
              rightIcon={multi ? "fa-signature" : "fa-circle-check"}
              iconType="solid"
              disabled={filled === 0}
              className="disabled:opacity-50"
              onClick={() => {
                submitForSignature(r.id, { draftContent: vals });
                onBack();
              }}
            >
              {multi ? "Enviar para assinaturas" : "Finalizar relatório"}
            </Button>
          </div>
        </>
      }
    >
      <CollabBar report={r} />
      <ProtocolSource app={app} />
      <VbBlock title="Grade de marcos por nível">
        <VbMilestoneGrid app={app} />
      </VbBlock>
      <VbBlock title="Aproveitamento por nível">
        <VbLevelBars app={app} />
      </VbBlock>
      <VbBlock title="Pontuação por domínio">
        <VbDomainTable app={app} />
      </VbBlock>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-brand-purple/10 p-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-extrabold text-brand-accent-dark">
            <Icon name="fa-wand-magic-sparkles" type="solid" />
            Redação assistida por IA
          </p>
          <p className="mt-1 max-w-[460px] text-xs font-semibold text-pretty text-brand-purple-dark/60">
            A IA lê a grade e os gráficos acima e escreve cada seção. Todo texto gerado precisa de revisão clínica antes de finalizar.
          </p>
        </div>
        <Button type="button" color="purple" disabled={busy} className="disabled:opacity-60" rightIcon={busy ? undefined : "fa-wand-magic-sparkles"} iconType="solid" onClick={genAll}>
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <Icon name="fa-arrows-rotate" type="solid" className="fa-spin" />
              Gerando…
            </span>
          ) : (
            "Gerar todo o relatório"
          )}
        </Button>
      </div>

      {REL_PROTO_SECTIONS.map((s) => (
        <SectionText
          key={`${s.id}-${gen}`}
          id={`${r.id}-${s.id}`}
          title={s.title}
          hint={s.ph}
          value={vals[s.id]}
          onChange={(t) => up(s.id, t || undefined)}
          aiGenerate={streamText(vbLocalText(s.id, app, r.patient.name))}
        />
      ))}
    </EditorPage>
  );
}

/** Editor pelo tipo do relatório; Voltar e o envio levam de volta à tela Relatório. */
export function FillEditor({ report: r }: { report: Report }) {
  const { toReport } = useReports();
  const back = () => toReport(r.id);
  return relIsProtocol(r) ? <ProtocolEditor report={r} onBack={back} /> : <ModelEditor report={r} onBack={back} />;
}
