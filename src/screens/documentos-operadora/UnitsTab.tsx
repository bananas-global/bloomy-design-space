/**
 * Documentos › Unidades: os documentos obrigatórios de cada unidade
 * compartilhados com a operadora.
 */
import { useState } from "react";
import { showToast } from "../../components/Action.js";
import { DrawerModal } from "../../components/Overlay.js";
import { Table } from "../../components/Table.js";
import { Tag } from "../../components/Tag.js";
import { UNIT_STATUS, unitDocState, unitRows, unitStatus } from "./model.js";
import { DocCheck, DrawerFooter, FilterBar, FilterCount, Missing, None, RowActions, SearchFilter, SectionLabel, SelectFilter, Subject, SummaryTags, Who } from "./parts.js";
import { useDocs } from "./store.js";

const uniq = (list: string[]) => [...new Set(list)];

export function UnitsTab({ canEdit }: { canEdit: boolean }) {
  const { state } = useDocs();
  const op = state.operator;
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [cred, setCred] = useState("");
  const [drawer, setDrawer] = useState<{ unitId: string; open: boolean } | null>(null);

  const all = state.units.map((unit) => ({ unit, ...unitStatus(unit, op.id) }));
  const q = query.trim().toLowerCase();
  const rows = all.filter(
    (r) => (!q || r.unit.name.toLowerCase().includes(q)) && (!city || r.unit.city === city) && (!cred || UNIT_STATUS[r.key].label === cred),
  );
  const filtering = [q, city, cred].some(Boolean);
  const clear = () => {
    setQuery("");
    setCity("");
    setCred("");
  };
  const count = (key: string) => all.filter((r) => r.key === key).length;

  return (
    <div className="flex flex-col gap-4">
      <SummaryTags
        items={[
          [`${count("none")} não ${count("none") === 1 ? "compartilhado" : "compartilhados"}`, UNIT_STATUS.none.variant],
          [`${count("pending")} em credenciamento`, UNIT_STATUS.pending.variant],
          [`${count("active")} ${count("active") === 1 ? "credenciada" : "credenciadas"}`, "green"],
        ]}
      />

      <FilterBar active={filtering} onClear={clear}>
        <SearchFilter id="unit_query" label="Unidade" placeholder="Buscar por nome" value={query} onChange={setQuery} />
        <SelectFilter id="unit_city" label="Cidade" prompt="Todas" options={uniq(all.map((r) => r.unit.city)).sort()} value={city} onChange={setCity} />
        <SelectFilter id="unit_cred" label="Credenciamento" prompt="Todos" options={uniq(all.map((r) => UNIT_STATUS[r.key].label))} value={cred} onChange={setCred} />
      </FilterBar>
      {filtering && <FilterCount shown={rows.length} total={all.length} noun="unidades" />}

      <Table
        id="operator_units"
        className="[&_thead_th]:whitespace-nowrap"
        rows={rows}
        rowId={(r) => r.unit.id}
        emptyMessage="Nenhuma unidade encontrada."
        col={[
          { label: "Unidade", render: (r) => <Who name={r.unit.name} /> },
          { label: "Cidade", render: (r) => r.unit.city },
          { label: "Documentos compartilhados", render: (r) => <b className="font-bold text-brand-purple-dark">{r.shared.length}</b> },
          { label: "Pendências", render: (r) => (r.missing.length > 0 ? <Missing count={r.missing.length} /> : <None />) },
          { label: "Credenciamento", render: (r) => <Tag item={UNIT_STATUS[r.key].label} variant={UNIT_STATUS[r.key].variant} className="whitespace-nowrap" /> },
        ]}
        action={[
          (r) => (
            <RowActions
              id={`unit_actions_${r.unit.id}`}
              actions={[{ label: canEdit ? "Gerenciar documentos" : "Ver documentos", icon: "fa-solid fa-share-nodes", onClick: () => setDrawer({ unitId: r.unit.id, open: true }) }]}
            />
          ),
        ]}
      />

      {drawer && <UnitDocsDrawer unitId={drawer.unitId} show={drawer.open} canEdit={canEdit} onClose={() => setDrawer({ ...drawer, open: false })} />}
    </div>
  );
}

/** Drawer "Documentos da unidade": os documentos cadastrados, o que é padrão e o que vai para a operadora. */
function UnitDocsDrawer({ unitId, show, canEdit, onClose }: { unitId: string; show: boolean; canEdit: boolean; onClose: () => void }) {
  const { state, setUnitShare } = useDocs();
  const op = state.operator;
  const unit = state.units.find((u) => u.id === unitId)!;
  const rows = unitRows(unit).filter((r) => r.doc);

  function toggle(docId: string, name: string, on: boolean) {
    setUnitShare(unitId, docId, on);
    showToast({ type: "success", title: on ? "Documento compartilhado" : "Compartilhamento revogado", content: `${name} · ${op.name}`, closeTime: 4000 });
  }

  return (
    <DrawerModal id="share_unit_docs" show={show} title="Documentos da unidade" onCancel={onClose}>
      <Subject name={unit.name} meta={`${unit.city} · ${op.name}`} icon="fa-hospital" />
      <SectionLabel>Documentos</SectionLabel>
      <div className="flex flex-col gap-2">
        {rows.length === 0 && <p className="text-sm text-brand-purple-dark/60">Nenhum documento cadastrado.</p>}
        {rows.map(({ key, standard, doc }) => {
          const d = doc!;
          return (
            <DocCheck
              key={key}
              id={`share_${d.id}`}
              name={d.name}
              detail={`${d.validUntil ? `válido até ${d.validUntil}` : "sem validade"} · ${d.attachment ?? "sem arquivo"}`}
              badge={standard && <Tag pill item="Padrão" variant="brand" leftIcon="fa-solid fa-lock" className="px-2 py-0 text-xs" />}
              checked={d.shared.includes(op.id)}
              disabled={!canEdit}
              state={unitDocState(d)}
              onChange={(on) => toggle(d.id, d.name, on)}
            />
          );
        })}
      </div>
      <DrawerFooter onDone={onClose} />
    </DrawerModal>
  );
}
