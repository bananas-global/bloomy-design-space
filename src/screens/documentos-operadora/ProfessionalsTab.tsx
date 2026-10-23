/**
 * Documentos › Profissionais: quem está credenciado na operadora, com a
 * formação, a situação no Bloomy e os documentos compartilhados de cada um.
 */
import { useState } from "react";
import { showToast } from "../../components/Action.js";
import { Button } from "../../components/Button.js";
import { Input } from "../../components/Input.js";
import { DrawerModal } from "../../components/Overlay.js";
import { Table } from "../../components/Table.js";
import { Tag } from "../../components/Tag.js";
import {
  BLOOMY_FILTERS,
  DOC_SITUATIONS,
  LINK_STATUS,
  NOT_LINKED,
  NOT_LINKED_VARIANT,
  UNLINK_REASONS,
  abaBand,
  bloomyFilter,
  bloomyLabel,
  isShared,
  needsReview,
  profDocState,
  yearsLabel,
  type DocSituation,
} from "./model.js";
import {
  BloomyWho,
  DocCheck,
  DocCount,
  DRAWER_CONTENT,
  DrawerFooter,
  FilterBar,
  FilterCount,
  None,
  ReviewFlag,
  ReviewNotice,
  RowActions,
  SearchFilter,
  SectionLabel,
  SelectFilter,
  Subject,
  SummaryTags,
  Value,
} from "./parts.js";
import type { DocsDrawer } from "../OperatorDocuments.js";
import { profRows, useDocs, type ProfRow } from "./store.js";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const credLabel = (r: ProfRow) => (r.link ? LINK_STATUS[r.link.status].label : NOT_LINKED);

const situationOf = (r: ProfRow): DocSituation => (r.shared.length === 0 ? "Sem documentos" : r.expired.length > 0 ? "Com vencido" : "Em dia");

const isReview = (r: ProfRow) => needsReview(r.link, r.prof);

const uniq = (list: string[]) => [...new Set(list)];

/** Quem cada drawer do controle abre: Mariana tem um documento vencido; Carina está inativa no Bloomy. */
const DRAWER_PROF = { compartilhar: "p3", descredenciar: "p10" } as const;

export function ProfessionalsTab({ canEdit, drawer: initialDrawer = "nenhum" }: { canEdit: boolean; drawer?: DocsDrawer }) {
  const { state, setLinkStatus } = useDocs();
  const op = state.operator;
  const [query, setQuery] = useState("");
  const [spec, setSpec] = useState("");
  const [unit, setUnit] = useState("");
  const [cred, setCred] = useState("");
  const [situation, setSituation] = useState("");
  const [bloomy, setBloomy] = useState("");
  const [onlyReview, setOnlyReview] = useState(false);
  const [drawer, setDrawer] = useState<{ profId: string; open: boolean } | null>(initialDrawer === "compartilhar" ? { profId: DRAWER_PROF.compartilhar, open: true } : null);
  const [unlink, setUnlink] = useState<{ profId: string; open: boolean } | null>(
    initialDrawer === "descredenciar" && canEdit ? { profId: DRAWER_PROF.descredenciar, open: true } : null,
  );

  const all = profRows(state);
  const q = query.trim().toLowerCase();
  const rows = all.filter(
    (r) =>
      (!q || r.prof.name.toLowerCase().includes(q) || r.prof.council.toLowerCase().includes(q)) &&
      (!spec || r.prof.specialty === spec) &&
      (!unit || r.prof.units.includes(unit)) &&
      (!cred || credLabel(r) === cred) &&
      (!situation || situationOf(r) === situation) &&
      (!bloomy || bloomyFilter(r.prof.bloomy) === bloomy) &&
      (!onlyReview || isReview(r)),
  );
  const filtering = [q, spec, unit, cred, situation, bloomy, onlyReview].some(Boolean);
  const clear = () => {
    setQuery("");
    setSpec("");
    setUnit("");
    setCred("");
    setSituation("");
    setBloomy("");
    setOnlyReview(false);
  };

  const count = (status: string) => all.filter((r) => r.link?.status === status).length;
  const none = all.filter((r) => !r.link).length;
  const review = all.filter(isReview);

  function exportDocs(r: ProfRow, merged: boolean) {
    const n = r.shared.length;
    showToast({
      type: "success",
      title: merged ? "Exportando consolidado" : "Exportando separados",
      content: merged ? `${r.prof.name} · 1 PDF com ${plural(n, "documento", "documentos")}.` : `${r.prof.name} · ${plural(n, "arquivo", "arquivos")} em .zip.`,
      closeTime: 4000,
    });
  }

  function link(r: ProfRow) {
    setLinkStatus(r.prof.id, "active");
    showToast({ type: "success", title: "Profissional credenciado", content: `${r.prof.name} · ${op.name}. Compartilhe os documentos com a operadora.`, closeTime: 4000 });
    setDrawer({ profId: r.prof.id, open: true });
  }

  const reviewNames = review.map((r) =>
    r.prof.bloomy.key === "leaving" ? `${r.prof.name} (desligamento em ${r.prof.bloomy.on})` : `${r.prof.name} (inativo)`,
  );

  return (
    <div className="flex flex-col gap-4">
      <SummaryTags
        items={[
          [plural(count("active"), "credenciado", "credenciados"), LINK_STATUS.active.variant],
          [`${none} não ${none === 1 ? "credenciado" : "credenciados"}`, NOT_LINKED_VARIANT],
          [plural(count("inactive"), "descredenciado", "descredenciados"), LINK_STATUS.inactive.variant],
        ]}
      />

      {review.length > 0 && (
        <ReviewNotice
          title={
            review.length === 1
              ? `1 profissional segue credenciado na ${op.name}, mas está inativo ou em desligamento no Bloomy`
              : `${review.length} profissionais seguem credenciados na ${op.name}, mas estão inativos ou em desligamento no Bloomy`
          }
          detail={reviewNames.join(" · ")}
          action="Ver só esses"
          onAction={() => setOnlyReview(true)}
        />
      )}

      <FilterBar active={filtering} onClear={clear}>
        <SearchFilter id="prof_query" label="Nome / Conselho" placeholder="Buscar nome ou nº do conselho" value={query} onChange={setQuery} />
        <SelectFilter id="prof_specialty" label="Especialidade" prompt="Todas" options={uniq(all.map((r) => r.prof.specialty)).sort()} value={spec} onChange={setSpec} />
        <SelectFilter id="prof_unit" label="Unidade" prompt="Todas" options={uniq(all.flatMap((r) => r.prof.units)).sort()} value={unit} onChange={setUnit} />
        <SelectFilter id="prof_cred" label="Credenciamento" prompt="Todos" options={[LINK_STATUS.active.label, NOT_LINKED, LINK_STATUS.inactive.label]} value={cred} onChange={setCred} />
        <SelectFilter id="prof_situation" label="Documentação" prompt="Todas" options={DOC_SITUATIONS} value={situation} onChange={setSituation} />
        <SelectFilter id="prof_bloomy" label="Status na Bloomy" prompt="Todos" options={[...BLOOMY_FILTERS]} value={bloomy} onChange={setBloomy} />
      </FilterBar>
      {filtering && <FilterCount shown={rows.length} total={all.length} noun="profissionais" />}

      <Table
        id="operator_professionals"
        className="[&_thead_th]:whitespace-nowrap"
        rows={rows}
        rowId={(r) => r.prof.id}
        emptyMessage="Nenhum profissional encontrado."
        col={[
          { label: "Profissional", render: (r) => <BloomyWho name={r.prof.name} status={bloomyLabel(r.prof.bloomy)} detail={r.prof.units.join(" · ")} /> },
          { label: "Especialidade", render: (r) => r.prof.specialty },
          {
            label: "Formação",
            render: (r) => <Value value={yearsLabel(r.prof.graduation)} detail={`${r.prof.abaHours}h ABA · ${abaBand(r.prof.abaHours)}`} />,
          },
          {
            label: "Formações especiais",
            render: (r) =>
              r.prof.badges.length === 0 ? (
                <None />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {r.prof.badges.slice(0, 2).map((b) => (
                    <Tag key={b} item={b} variant="light-purple" className="whitespace-nowrap text-xs" />
                  ))}
                  {r.prof.badges.length > 2 && <Tag item={`+${r.prof.badges.length - 2}`} title={r.prof.badges.slice(2).join(", ")} variant="dark-purple" className="text-xs" />}
                </div>
              ),
          },
          {
            label: "Credenciamento",
            render: (r) =>
              r.link ? (
                <div className="flex flex-col items-start gap-1">
                  <Tag item={LINK_STATUS[r.link.status].label} variant={LINK_STATUS[r.link.status].variant} className="whitespace-nowrap" />
                  {isReview(r) && <ReviewFlag />}
                </div>
              ) : (
                <None>{NOT_LINKED}</None>
              ),
          },
          { label: "Documentos", render: (r) => (r.link ? <DocCount shared={r.shared.length} expired={r.expired.length} /> : <None />) },
        ]}
        action={[
          (r) =>
            r.link ? (
              <RowActions
                id={`prof_actions_${r.prof.id}`}
                actions={[
                  { label: "Exportar separados", icon: "fa-copy", disabled: r.shared.length === 0, onClick: () => exportDocs(r, false) },
                  { label: "Exportar consolidado", icon: "fa-file-pdf", disabled: r.shared.length === 0, onClick: () => exportDocs(r, true) },
                  { label: "Compartilhamento", icon: "fa-solid fa-share-nodes", separated: true, onClick: () => setDrawer({ profId: r.prof.id, open: true }) },
                  ...(!canEdit
                    ? []
                    : r.link.status === "active"
                      ? [{ label: "Descredenciar", icon: "fa-user-xmark", separated: true, danger: true, onClick: () => setUnlink({ profId: r.prof.id, open: true }) }]
                      : [{ label: "Credenciar novamente", icon: "fa-user-plus", separated: true, onClick: () => link(r) }]),
                ]}
              />
            ) : canEdit ? (
              <Button type="button" variant="tint" size="small" leftIcon="fa-user-plus" iconType="solid" className="px-3" onClick={() => link(r)}>
                Credenciar
              </Button>
            ) : null,
        ]}
      />

      {drawer && <ShareDrawer profId={drawer.profId} show={drawer.open} canEdit={canEdit} onClose={() => setDrawer({ ...drawer, open: false })} />}
      {unlink && <UnlinkModal key={unlink.profId} profId={unlink.profId} show={unlink.open} onClose={() => setUnlink({ ...unlink, open: false })} />}
    </div>
  );
}

/** Drawer "Compartilhar com operadora": os documentos do profissional, um a um. */
function ShareDrawer({ profId, show, canEdit, onClose }: { profId: string; show: boolean; canEdit: boolean; onClose: () => void }) {
  const { state, setShare } = useDocs();
  const op = state.operator;
  const prof = state.professionals.find((p) => p.id === profId)!;
  const docs = state.docs[profId] ?? [];

  function toggle(docId: string, name: string, on: boolean) {
    setShare(profId, docId, on);
    showToast({ type: "success", title: on ? "Documento compartilhado" : "Compartilhamento revogado", content: `${name} · ${op.name}`, closeTime: 4000 });
  }

  return (
    <DrawerModal id="share_professional_docs" show={show} title="Compartilhar com operadora" contentClass={DRAWER_CONTENT} onCancel={onClose}>
      <Subject name={prof.name} meta={`${prof.specialty}${prof.council ? ` · conselho ${prof.council}` : ""}`} />
      <SectionLabel>Documentos do profissional</SectionLabel>
      <div className="flex flex-col gap-2">
        {docs.map((d) => (
          <DocCheck
            key={d.id}
            id={`share_${d.id}`}
            name={d.name}
            detail={`${d.validUntil ? `válido até ${d.validUntil}` : "sem validade"} · ${d.file}`}
            checked={isShared(d, op.id)}
            disabled={!canEdit}
            state={profDocState(d)}
            onChange={(on) => toggle(d.id, d.name, on)}
          />
        ))}
      </div>
      <DrawerFooter onDone={onClose} />
    </DrawerModal>
  );
}

/** Drawer "Descredenciar da operadora": o motivo e, por padrão, descompartilhar os documentos. */
function UnlinkModal({ profId, show, onClose }: { profId: string; show: boolean; onClose: () => void }) {
  const { state, setLinkStatus } = useDocs();
  const op = state.operator;
  const prof = state.professionals.find((p) => p.id === profId)!;
  const shared = (state.docs[profId] ?? []).filter((d) => isShared(d, op.id));
  const status = bloomyLabel(prof.bloomy);
  const [reason, setReason] = useState(prof.bloomy.key === "active" ? "" : UNLINK_REASONS[0]!);
  const [unshare, setUnshare] = useState(true);

  function confirm() {
    const n = unshare ? shared.length : 0;
    setLinkStatus(profId, "inactive", { reason, unshare });
    showToast({
      type: "info",
      title: "Profissional descredenciado",
      content: `${prof.name} · ${op.name}${n > 0 ? ` · ${plural(n, "documento descompartilhado", "documentos descompartilhados")}` : ""}`,
      closeTime: 4000,
    });
    onClose();
  }

  return (
    <DrawerModal id="unlink_professional" show={show} title={`Descredenciar da ${op.name}`} contentClass={DRAWER_CONTENT} onCancel={onClose}>
      <div className="rounded-xl bg-brand-purple-dark/5 px-4 py-3">
        <p className="font-extrabold text-brand-purple-dark">{prof.name}</p>
        <p className="text-sm text-brand-purple-dark/60">{prof.specialty}</p>
        <p className={["mt-1 inline-flex items-center gap-1.5 text-xs font-bold", status.text].join(" ")}>
          <span className={["h-1.5 w-1.5 rounded-full", status.dot].join(" ")} />
          {status.label}
        </p>
      </div>
      <p className="mt-4 text-sm text-brand-purple-dark/80">
        O profissional deixa de constar como credenciado nesta operadora. O histórico fica registrado e ele pode ser credenciado novamente depois.
      </p>
      <div className="mt-4">
        <Input
          type="select"
          id="unlink_reason"
          name="unlink_reason"
          label="Motivo"
          prompt="Selecione o motivo"
          options={UNLINK_REASONS.map((o) => [o, o] as const)}
          value={reason}
          onChange={(v) => setReason(v ?? "")}
        />
      </div>
      {shared.length > 0 && (
        <div className="mt-4">
          <DocCheck
            id="unlink_unshare"
            name={`Descompartilhar ${plural(shared.length, "documento", "documentos")}`}
            detail={shared.map((d) => d.name).join(" · ")}
            checked={unshare}
            onChange={setUnshare}
          />
        </div>
      )}
      <DrawerFooter>
        <Button type="button" variant="tint" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" color="red" leftIcon="fa-user-xmark" disabled={!reason} onClick={confirm}>
          Descredenciar
        </Button>
      </DrawerFooter>
    </DrawerModal>
  );
}
