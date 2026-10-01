/**
 * Profissionais — os drawers da Documentação: um documento e o credenciamento
 * numa operadora. Os dois são `drawer_modal` com o título no slot
 * `custom_title`.
 */
import { showToast } from "../../components/Action.js";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { DrawerModal } from "../../components/Overlay.js";
import { abaBand, OPERATORS, PROFILE, TODAY, trainingName } from "./fixtures.js";
import { brToIso, daysBetween, docCell, docTypeName, DOC_STATES, opCell, type DocCell, type OpCell, type Professional } from "./model.js";
import { DrawerTitle, Highlight, Meta, Note, StateBanner } from "./parts.js";
import { useDocs } from "./store.js";

const toast = (type: "success" | "info" | "error", title: string, content: string) => showToast({ type, title, content, closeTime: 4000 });

/** Um documento de um profissional: estado, dados e o que dá para fazer. */
export function DocDrawer({ prof, cell, onClose }: { prof: Professional; cell: DocCell | null; onClose: () => void }) {
  const { state, attach, setWaived } = useDocs();
  const live = cell ? docCell(state, prof.id, cell.type, TODAY) : null;

  return (
    <DrawerModal
      id="professional-doc-drawer"
      show={live != null}
      onCancel={onClose}
      headerClass="items-start"
      contentClass="flex flex-col gap-4"
      customTitle={{ children: live && <DrawerTitle crumb={`${prof.name} · ${prof.specialty}`} title={live.type.name} /> }}
    >
      {live && <DocDrawerBody prof={prof} cell={live} attach={attach} setWaived={setWaived} />}
    </DrawerModal>
  );
}

function DocDrawerBody({
  prof,
  cell,
  attach,
  setWaived,
}: {
  prof: Professional;
  cell: DocCell;
  attach: (profId: string, typeId: string) => void;
  setWaived: (profId: string, typeId: string, on: boolean) => void;
}) {
  const { state } = useDocs();
  const { type, doc } = cell;
  const st = DOC_STATES[cell.state];
  const days = doc?.validUntil ? daysBetween(TODAY, brToIso(doc.validUntil)) : null;
  const editable = type.cat !== "prof";
  const hours = PROFILE[prof.id]?.abaHours ?? 0;
  const trainings = (state.docs[prof.id] ?? []).filter((d) => d.typeId === "special_training" && d.training);

  function onAttach() {
    attach(prof.id, type.id);
    toast("success", "Documento anexado", `${type.name} · ${prof.name}`);
  }
  function onWaive(on: boolean) {
    setWaived(prof.id, type.id, on);
    toast("success", on ? "Marcado como dispensado" : "Dispensa removida", `${type.name} · ${prof.name}`);
  }

  return (
    <>
      <StateBanner state={cell.state} icon={st.icon} title={st.label}>
        {cell.state === "missing"
          ? "Nenhum arquivo anexado para este tipo."
          : cell.state === "waived"
            ? "Dispensado para este profissional — não conta na completude."
            : doc!.validUntil
              ? days! < 0
                ? `Venceu há ${Math.abs(days!)} dias (${doc!.validUntil}).`
                : `Válido até ${doc!.validUntil} · ${days} dias.`
              : "Documento sem data de validade."}
      </StateBanner>

      {doc && cell.state !== "missing" && (
        <Meta
          items={[
            ["Atualizado em", doc.updatedAt],
            ["Validade", doc.validUntil ?? "sem validade"],
            ["Responsável", doc.by ?? "Cadastro do profissional"],
            ["Obrigatório", type.required ? "Sim" : "Não"],
          ]}
        />
      )}

      {type.id === "aba_course" && (
        <Highlight icon="fa-clock" title={`${hours}h de cursos ABA`}>
          Carga horária acumulada · {abaBand(hours)}
        </Highlight>
      )}

      {type.id === "special_training" && trainings.length > 0 && (
        <Highlight icon="fa-certificate" title={trainings.length === 1 ? "1 formação certificada" : `${trainings.length} formações certificadas`}>
          {trainings.map((d) => trainingName(d.training!)).join(" · ")}
        </Highlight>
      )}

      {type.cat === "prof" && <Note>Documentos do escopo profissional são mantidos na aba Documentos do perfil, junto do compartilhamento com operadoras.</Note>}

      <div className="flex flex-wrap gap-2">
        {editable && (
          <Button type="button" variant="tint" leftIcon="fa-paperclip" onClick={onAttach}>
            {cell.state === "missing" ? "Anexar documento" : "Substituir arquivo"}
          </Button>
        )}
        {editable && (
          <Button type="button" variant="outline" color="purple" leftIcon="fa-ban" onClick={() => onWaive(cell.state !== "waived")}>
            {cell.state === "waived" ? "Remover dispensa" : "Marcar como dispensado"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          leftIcon="fa-arrow-up-right-from-square"
          onClick={() => toast("info", "Perfil do profissional", `Abrindo a aba Documentos de ${prof.name}.`)}
        >
          Abrir no perfil
        </Button>
      </div>
    </>
  );
}

/** O credenciamento de um profissional numa operadora: o que ela exige e o que falta. */
export function OpDrawer({ prof, cell, onClose }: { prof: Professional; cell: OpCell | null; onClose: () => void }) {
  const { state, share } = useDocs();
  const op = cell && OPERATORS.find((o) => o.id === cell.op.id)!;
  const live = op ? opCell(state, op, prof.id, TODAY) : null;
  const docs = state.docs[prof.id] ?? [];

  function onShare(typeId: string) {
    const doc = docs.find((d) => d.typeId === typeId);
    if (!doc || !op) {
      toast("error", "Documento ausente", `${docTypeName(typeId)} não está no cadastro do profissional.`);
      return;
    }
    share(prof.id, doc.id, op.id);
    toast("success", "Documento compartilhado", `${doc.name} · ${op.name}`);
  }

  return (
    <DrawerModal
      id="professional-op-drawer"
      show={live != null}
      onCancel={onClose}
      headerClass="items-start"
      contentClass="flex flex-col gap-4"
      customTitle={{ children: live && <DrawerTitle crumb={`${prof.name} · ${prof.specialty}`} title={`Credenciamento · ${live.op.name}`} /> }}
    >
      {live && (
        <>
          <StateBanner state={live.state} icon={DOC_STATES[live.state].icon} title={live.label}>
            {live.missing.length
              ? `${live.missing.length} documento(s) exigido(s) ainda não compartilhado(s) ou vencido(s).`
              : "Todos os documentos exigidos estão compartilhados e válidos."}
          </StateBanner>

          <h4 className="text-[13px] font-extrabold tracking-[.02em] text-brand-purple-dark/50 uppercase">Documentos exigidos ({live.op.required.length})</h4>
          <div className="flex flex-col gap-1.5">
            {live.op.required.length === 0 && <Note>Esta operadora não exige documentos para credenciar.</Note>}
            {live.op.required.map((typeId) => {
              const missing = live.missing.includes(typeId);
              const has = docs.some((d) => d.typeId === typeId);
              return (
                <div key={typeId} className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-[10px] border border-brand-purple-dark/10 px-3 py-2.5 text-[13px] text-brand-purple-dark">
                  <Icon name={missing ? "fa-circle-exclamation" : "fa-circle-check"} type="solid" className={missing ? "text-brand-red-dark" : "text-brand-green-dark"} />
                  <span>{docTypeName(typeId)}</span>
                  {missing ? (
                    has ? (
                      <Button type="button" size="small" onClick={() => onShare(typeId)}>
                        Compartilhar
                      </Button>
                    ) : (
                      <em className="text-xs not-italic text-brand-purple-dark/45">sem arquivo no cadastro</em>
                    )
                  ) : (
                    <em className="text-xs not-italic text-brand-purple-dark/50">compartilhado</em>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </DrawerModal>
  );
}
