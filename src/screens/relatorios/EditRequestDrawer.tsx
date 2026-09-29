/**
 * Gaveta "Editar solicitação" (`RelEditRequestDrawer` de `relatorios-foco.jsx`),
 * aberta pela coordenação na visualização em modo foco:
 * `openModal({ kind: "edit", id })`. Mesmo formulário da criação, com paciente
 * travado, novo prazo, informações complementares e status. As alterações
 * ficam no histórico.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { RangeDatePicker } from "../../components/DatePickers.js";
import { FileUploader, formatByte } from "../../components/FileUploader.js";
import { Icon } from "../../components/Icon.js";
import { FakeInput, Input } from "../../components/Input.js";
import { DrawerModal } from "../../components/Overlay.js";
import {
  REL_PROFS,
  REL_REQUESTED_BY_SHORT,
  REL_REQUESTERS,
  REL_STATUS,
  REL_TYPES,
  isoToBR,
  relType,
  relTypeName,
  type Report,
  type ReportStatus,
  type ReportTypeId,
  type Requester,
  type SupportFile,
} from "./model.js";
import { FileRow } from "./Focus.js";
import { Callout, DrawerFooter, FieldBlock, TitleWithSub } from "./parts.js";
import { useReports } from "./store.js";

type Form = {
  typeId: ReportTypeId;
  customName: string;
  requester: Requester;
  profId: string;
  noProf: boolean;
  /** Novo prazo ISO, ou "" para manter. */
  due: string;
  /** Período atual (texto) ou o do intervalo escolhido. */
  period: string;
  /** `AAAA-MM-DD#AAAA-MM-DD` do seletor. */
  range: string;
  obs: string;
  extra: string;
  status: ReportStatus;
};

const kindOf = (name: string) => (/\.pdf$/i.test(name) ? "PDF" : /\.(jpe?g|png|gif|webp)$/i.test(name) ? "Imagem" : "Documento");

export function EditRequestDrawer({ report: r }: { report: Report }) {
  const { closeModal, updateRequest } = useReports();
  const [f, setF] = useState<Form>(() => ({
    typeId: r.typeId, customName: r.customName ?? "", requester: r.requester, profId: r.prof?.id ?? "", noProf: !r.prof,
    due: "", period: r.period ?? "", range: "", obs: r.obs ?? "", extra: r.extra ?? "", status: r.status,
  }));
  const [support, setSupport] = useState<SupportFile[]>(() => [...r.support]);
  const up = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  const needsCustom = relType(f.typeId).kind === "custom";
  const hasContent = r.hasDraft || !!r.finalDoc || r.status === "em_andamento" || r.status === "finalizado";
  const typeChanged = f.typeId !== r.typeId;
  const valid = Boolean(f.typeId && f.requester && (f.noProf || f.profId) && (!needsCustom || f.customName.trim()));

  function addFiles(files: File[]) {
    // O arquivo escolhido entra direto na lista de apoio (com remover), como no protótipo.
    setSupport((list) => [...list, ...files.map((file) => ({ name: file.name, kind: kindOf(file.name), size: formatByte(file.size), at: "Hoje", by: REL_REQUESTED_BY_SHORT }))]);
  }

  function save() {
    if (!valid) return;
    updateRequest(r.id, {
      typeId: f.typeId,
      customName: needsCustom ? f.customName.trim() : "",
      requester: f.requester,
      due: f.due,
      prof: f.noProf ? null : (REL_PROFS.find((p) => p.id === f.profId) ?? null),
      period: f.period,
      obs: f.obs,
      extra: f.extra,
      status: f.status,
      support,
    });
  }

  return (
    <DrawerModal
      id="relatorio-editar-solicitacao"
      show
      onCancel={closeModal}
      variant="medium"
      customTitle={{ children: <TitleWithSub title="Editar solicitação" sub={`${relTypeName(r)} · alterações ficam registradas no histórico`} /> }}
    >
      <div className="flex flex-col gap-5">
        {hasContent && typeChanged && (
          <Callout tone="warn" icon="fa-triangle-exclamation">
            <strong>Atenção:</strong> esta solicitação já possui {r.finalDoc ? "documento final" : "conteúdo em produção"}. Alterar o tipo de relatório pode invalidar o que já foi preenchido.
          </Callout>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FakeInput
            label="Paciente *"
            labelColor="blue"
            value={
              <span className="flex items-center gap-2.5 font-bold text-brand-purple-dark">
                <Icon name="fa-user" type="solid" className="text-brand-blue-dark" />
                {r.patient.name}
              </span>
            }
          />
          <Input
            id="editar-tipo"
            type="select"
            label="Tipo de relatório *"
            value={f.typeId}
            options={REL_TYPES.map((t) => [t.name, t.id] as const)}
            onChange={(v) => v && up("typeId", v as ReportTypeId)}
          />
        </div>

        {needsCustom && (
          <Input id="editar-nome" label="Nome / descrição do relatório *" value={f.customName} onChange={(event) => up("customName", event.target.value)} />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="editar-solicitante"
            type="select"
            label="Solicitante *"
            value={f.requester}
            options={REL_REQUESTERS.map((x) => [x, x] as const)}
            onChange={(v) => v && up("requester", v as Requester)}
          />
          <div>
            <Input id="editar-prazo" type="date" label="Novo prazo" value={f.due} onChange={(event) => up("due", event.target.value)} />
            <p className="mt-1.5 text-xs text-brand-purple-dark/55">{r.due ? `Prazo atual: ${r.due}` : "Sem prazo definido"}</p>
          </div>
        </div>

        <div>
          <Input
            id="editar-profissional"
            type="select"
            label={f.noProf ? "Profissional responsável" : "Profissional responsável *"}
            prompt="Quem vai elaborar"
            value={f.noProf ? "" : f.profId}
            disabled={f.noProf}
            options={REL_PROFS.map((p) => [`${p.name} · ${p.specialty}`, p.id] as const)}
            onChange={(v) => up("profId", v ?? "")}
          />
          <Input
            id="editar-sem-responsavel"
            type="checkbox"
            label="Deixar sem responsável por enquanto (a coordenação atribui depois)"
            checked={f.noProf}
            onChange={(event) => up("noProf", event.target.checked)}
          />
        </div>

        <FieldBlock label="Período de referência" hint={f.period && !f.range ? `Atual: ${f.period}` : "Opcional"}>
          <RangeDatePicker
            field={{ id: "editar-periodo", name: "solicitacao[periodo]", value: f.range }}
            onChange={(v) => {
              const [s, e] = v ? v.split("#") : [];
              setF((p) => ({ ...p, range: v, period: s && e ? `${isoToBR(s)} – ${isoToBR(e)}` : p.period }));
            }}
          />
        </FieldBlock>

        <Input id="editar-observacoes" type="textarea" label="Observações" rows={3} value={f.obs} onChange={(event) => up("obs", event.target.value)} />
        <Input id="editar-complemento" type="textarea" label="Informações complementares" rows={2} value={f.extra} onChange={(event) => up("extra", event.target.value)} />

        <Input
          id="editar-status"
          type="select"
          label="Status"
          value={f.status}
          options={(Object.keys(REL_STATUS) as ReportStatus[]).map((k) => [REL_STATUS[k].label, k] as const)}
          onChange={(v) => v && up("status", v as ReportStatus)}
        />

        <FieldBlock label="Anexos / arquivos de apoio" hint="materiais que ajudam na elaboração — não são o relatório final">
          <FileUploader
            upload={{ ref: "editar-apoio", name: "solicitacao[apoio]", maxEntries: 10, entries: [] }}
            variant="simplified"
            validateEntryDone={false}
            entriesFirst={false}
            onChange={addFiles}
          />
          {support.length > 0 && (
            <div className="mt-3 flex flex-col gap-2.5">
              {support.map((file, i) => (
                <FileRow key={`${file.name}-${i}`} file={file} onRemove={() => setSupport((list) => list.filter((_, idx) => idx !== i))} />
              ))}
            </div>
          )}
        </FieldBlock>
      </div>

      <DrawerFooter>
        <Button type="button" variant="tint" onClick={closeModal}>
          Cancelar
        </Button>
        <Button type="button" rightIcon="fa-floppy-disk" iconType="solid" disabled={!valid} className="disabled:opacity-50" onClick={save}>
          Salvar alterações
        </Button>
      </DrawerFooter>
    </DrawerModal>
  );
}
