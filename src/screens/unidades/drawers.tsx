/**
 * Unidades — o drawer da Documentação: um documento padrão de uma unidade. É
 * `drawer_modal` com o título no slot `custom_title`, como o de Profissionais.
 */
import { showToast } from "../../components/Action.js";
import { Button } from "../../components/Button.js";
import { DrawerModal } from "../../components/Overlay.js";
import { TODAY } from "./fixtures.js";
import { brToIso, daysBetween, docCell, DOC_STATES, type DocCell, type Unit } from "./model.js";
import { DrawerTitle, Meta, Note, StateBanner } from "./parts.js";
import { useDocs } from "./store.js";

const toast = (type: "success" | "info", title: string, content: string) => showToast({ type, title, content, closeTime: 4000 });

export function DocDrawer({ unit, cell, onClose }: { unit: Unit; cell: DocCell | null; onClose: () => void }) {
  const { state } = useDocs();
  // Relido do store: depois de anexar, o drawer mostra o documento novo.
  const live = cell ? docCell(state, unit.id, cell.slot, TODAY) : null;

  return (
    // Novo — diverge do Phoenix: o `drawer_modal` tem `rounded-l-2xl`; aqui o painel fica sem canto arredondado.
    <div className="[&_#unit-doc-drawer-container]:rounded-none">
      <DrawerModal
        id="unit-doc-drawer"
        show={live != null}
        onCancel={onClose}
        headerClass="items-start"
        contentClass="flex flex-col gap-4"
        customTitle={{ children: live && <DrawerTitle crumb={`${unit.name} · CNES ${unit.cnes}`} title={live.slot.name} /> }}
      >
        {live && <DocDrawerBody unit={unit} cell={live} />}
      </DrawerModal>
    </div>
  );
}

function banner(cell: DocCell): string {
  const { doc } = cell;
  if (!doc) return "Nenhum arquivo anexado para este documento.";
  if (cell.state === "pending") return `Começa a valer em ${doc.validFrom}.`;
  if (!doc.validUntil) return "Documento sem data de validade.";
  const days = daysBetween(TODAY, brToIso(doc.validUntil));
  return days < 0 ? `Venceu há ${Math.abs(days)} dias (${doc.validUntil}).` : `Válido até ${doc.validUntil} · ${days} dias.`;
}

function DocDrawerBody({ unit, cell }: { unit: Unit; cell: DocCell }) {
  const { attach } = useDocs();
  const { slot, doc } = cell;
  const st = DOC_STATES[cell.state];

  function onAttach() {
    attach(unit.id, slot.id);
    toast("success", "Documento anexado", `${slot.name} · ${unit.name}`);
  }

  return (
    <>
      <StateBanner state={cell.state} icon={st.icon} title={cell.viaCli ? `${st.label} · via CLI` : st.label}>
        {banner(cell)}
      </StateBanner>

      {doc && (
        <Meta
          items={[
            ["Arquivo", doc.file],
            ["Atualizado em", doc.updatedAt],
            ["Vigência", doc.validFrom ?? "—"],
            ["Validade", doc.validUntil ?? "sem validade"],
            ["Responsável", doc.responsible],
            ["Renovação", slot.renewal],
          ]}
        />
      )}

      <Note>
        {cell.viaCli ? `${doc!.name}: atende o Alvará nos municípios com licenciamento integrado.` : slot.hint}
        {slot.group === "ess" ? " Essencial: conta na completude." : " Renovação periódica: não conta na completude."}
      </Note>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="tint" leftIcon="fa-paperclip" onClick={onAttach}>
          {doc ? "Substituir arquivo" : "Anexar documento"}
        </Button>
        <Button
          type="button"
          variant="outline"
          leftIcon="fa-arrow-up-right-from-square"
          onClick={() => toast("info", "Ficha da unidade", `Abrindo a aba Documentos de ${unit.name}.`)}
        >
          Abrir na unidade
        </Button>
      </div>
    </>
  );
}
