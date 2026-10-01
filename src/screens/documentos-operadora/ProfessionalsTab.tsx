/**
 * Documentos › Profissionais: quem está credenciado na operadora, com a
 * formação e os documentos compartilhados de cada um.
 */
import { useState } from "react";
import { showToast } from "../../components/Action.js";
import { Button } from "../../components/Button.js";
import { DrawerModal } from "../../components/Overlay.js";
import { Table } from "../../components/Table.js";
import { Tag } from "../../components/Tag.js";
import { DOC_SITUATIONS, LINK_STATUS, NOT_LINKED, abaBand, isShared, profDocState, yearsLabel, type DocSituation } from "./model.js";
import {
  DocCheck,
  DocCount,
  DrawerFooter,
  FilterBar,
  FilterCount,
  None,
  RowActions,
  SearchFilter,
  SectionLabel,
  SelectFilter,
  Subject,
  SummaryTags,
  Value,
  Who,
} from "./parts.js";
import { profRows, useDocs, type ProfRow } from "./store.js";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const credLabel = (r: ProfRow) => (r.link ? LINK_STATUS[r.link.status].label : NOT_LINKED);

const situationOf = (r: ProfRow): DocSituation => (!r.link ? "Não iniciado" : r.missing.length === 0 ? "Completo" : "Pendente");

const uniq = (list: string[]) => [...new Set(list)];

export function ProfessionalsTab({ canEdit }: { canEdit: boolean }) {
  const { state, setLinkStatus } = useDocs();
  const op = state.operator;
  const [query, setQuery] = useState("");
  const [spec, setSpec] = useState("");
  const [unit, setUnit] = useState("");
  const [cred, setCred] = useState("");
  const [situation, setSituation] = useState("");
  const [drawer, setDrawer] = useState<{ profId: string; open: boolean } | null>(null);

  const all = profRows(state);
  const q = query.trim().toLowerCase();
  const rows = all.filter(
    (r) =>
      (!q || r.prof.name.toLowerCase().includes(q) || r.prof.council.toLowerCase().includes(q)) &&
      (!spec || r.prof.specialty === spec) &&
      (!unit || r.prof.units.includes(unit)) &&
      (!cred || credLabel(r) === cred) &&
      (!situation || situationOf(r) === situation),
  );
  const filtering = [q, spec, unit, cred, situation].some(Boolean);
  const clear = () => {
    setQuery("");
    setSpec("");
    setUnit("");
    setCred("");
    setSituation("");
  };

  const count = (status: string) => all.filter((r) => r.link?.status === status).length;
  const none = all.filter((r) => !r.link).length;

  function exportDocs(r: ProfRow, merged: boolean) {
    const n = r.shared.length;
    showToast({
      type: "success",
      title: merged ? "Exportando consolidado" : "Exportando separados",
      content: merged ? `${r.prof.name} · 1 PDF com ${plural(n, "documento", "documentos")}.` : `${r.prof.name} · ${plural(n, "arquivo", "arquivos")} em .zip.`,
      closeTime: 4000,
    });
  }

  function enable(r: ProfRow) {
    setLinkStatus(r.prof.id, "pending");
    showToast({ type: "success", title: "Profissional habilitado", content: `${r.prof.name} · ${op.name}. Compartilhe os documentos exigidos.`, closeTime: 4000 });
    setDrawer({ profId: r.prof.id, open: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <SummaryTags
        items={[
          [`${none} não ${none === 1 ? "credenciado" : "credenciados"}`, "light-blue"],
          [`${count("pending")} em credenciamento`, "light-blue"],
          [plural(count("active"), "ativo", "ativos"), "green"],
          [plural(count("inactive"), "descredenciado", "descredenciados"), "red"],
        ]}
      />

      <FilterBar active={filtering} onClear={clear}>
        <SearchFilter id="prof_query" label="Nome / Conselho" placeholder="Buscar nome ou nº do conselho" value={query} onChange={setQuery} />
        <SelectFilter id="prof_specialty" label="Especialidade" prompt="Todas" options={uniq(all.map((r) => r.prof.specialty)).sort()} value={spec} onChange={setSpec} />
        <SelectFilter id="prof_unit" label="Unidade" prompt="Todas" options={uniq(all.flatMap((r) => r.prof.units)).sort()} value={unit} onChange={setUnit} />
        <SelectFilter id="prof_cred" label="Credenciamento" prompt="Todos" options={uniq(all.map(credLabel))} value={cred} onChange={setCred} />
        <SelectFilter id="prof_situation" label="Situação da documentação" prompt="Todas" options={DOC_SITUATIONS} value={situation} onChange={setSituation} />
      </FilterBar>
      {filtering && <FilterCount shown={rows.length} total={all.length} noun="profissionais" />}

      <Table
        id="operator_professionals"
        className="[&_thead_th]:whitespace-nowrap"
        rows={rows}
        rowId={(r) => r.prof.id}
        emptyMessage="Nenhum profissional encontrado."
        col={[
          { label: "Profissional", render: (r) => <Who name={r.prof.name} detail={`${r.prof.units.join(" · ")}${r.prof.active ? "" : " · inativo na clínica"}`} /> },
          { label: "Especialidade", render: (r) => r.prof.specialty },
          { label: "Tempo de formado", render: (r) => <Value value={yearsLabel(r.prof.graduation)} detail={r.prof.graduation && `desde ${r.prof.graduation}`} /> },
          { label: "Carga ABA", render: (r) => <Value value={`${r.prof.abaHours}h`} detail={abaBand(r.prof.abaHours)} /> },
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
            render: (r) => (r.link ? <Tag item={LINK_STATUS[r.link.status].label} variant={LINK_STATUS[r.link.status].variant} className="whitespace-nowrap" /> : <None>{NOT_LINKED}</None>),
          },
          { label: "Documentos", render: (r) => (r.link ? <DocCount shared={r.shared.length} missing={r.missing.length} /> : <None />) },
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
                ]}
              />
            ) : canEdit ? (
              <Button type="button" variant="tint" size="small" leftIcon="fa-user-plus" iconType="solid" className="px-3" onClick={() => enable(r)}>
                Habilitar
              </Button>
            ) : null,
        ]}
      />

      {drawer && <ShareDrawer profId={drawer.profId} show={drawer.open} canEdit={canEdit} onClose={() => setDrawer({ ...drawer, open: false })} />}
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
    <DrawerModal id="share_professional_docs" show={show} title="Compartilhar com operadora" onCancel={onClose}>
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
