/**
 * Gaveta "Nova solicitação de relatório" (`RelNewRequestModal` com paciente
 * travado), aberta pelo "Solicitar relatório" da aba.
 */
import { useRef, useState } from "react";
import { Button } from "../../components/Button.js";
import { RadioCards } from "../../components/Choice.js";
import { RangeDatePicker } from "../../components/DatePickers.js";
import { FileUploader, formatByte, type UploadEntry } from "../../components/FileUploader.js";
import { Icon } from "../../components/Icon.js";
import { FakeInput, Input } from "../../components/Input.js";
import { DrawerModal } from "../../components/Overlay.js";
import { protoAppsFor } from "./fixtures.js";
import {
  REL_PROFS,
  REL_REQUESTED_BY_SHORT,
  REL_REQUESTERS,
  REL_TYPES,
  isoToBR,
  relType,
  vbTotal,
  type ReportTypeId,
  type Requester,
  type SupportFile,
} from "./model.js";
import { Callout, DrawerFooter, FieldBlock, TitleWithSub } from "./parts.js";
import { useReports } from "./store.js";

type Form = {
  typeId: ReportTypeId | "";
  customName: string;
  requester: Requester | "";
  profId: string;
  noProf: boolean;
  due: string;
  /** `AAAA-MM-DD#AAAA-MM-DD`. */
  range: string;
  obs: string;
  protocolAppId: string;
};

const BLANK: Form = { typeId: "", customName: "", requester: "", profId: "", noProf: false, due: "", range: "", obs: "", protocolAppId: "" };

const kindOf = (name: string) => (/\.pdf$/i.test(name) ? "PDF" : /\.(jpe?g|png|gif|webp)$/i.test(name) ? "Imagem" : "Documento");

export function NewRequestDrawer({ show }: { show: boolean }) {
  const { patient, closeModal, createRequest } = useReports();
  const [f, setF] = useState<Form>(BLANK);
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [support, setSupport] = useState<(SupportFile & { ref: string })[]>([]);
  const counter = useRef(0);
  const up = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  const type = f.typeId ? relType(f.typeId) : null;
  const needsCustom = type?.kind === "custom";
  const isExternal = type?.kind === "external";
  const isProtocol = type?.kind === "protocol";
  const apps = isProtocol ? protoAppsFor(patient.name) : [];
  const valid = Boolean(f.typeId && f.requester && (f.noProf || f.profId) && (!needsCustom || f.customName.trim()) && (!isProtocol || f.protocolAppId));

  function addFiles(files: File[]) {
    const added = files.map((file) => ({ ref: `apoio-${counter.current++}`, file }));
    setEntries((list) => [...list, ...added.map(({ ref, file }) => ({ ref, clientName: file.name, clientSize: file.size, progress: 100, done: true }))]);
    setSupport((list) => [
      ...list,
      ...added.map(({ ref, file }) => ({ ref, name: file.name, kind: kindOf(file.name), size: formatByte(file.size), at: "Hoje", by: REL_REQUESTED_BY_SHORT })),
    ]);
  }
  function removeFile(ref: string) {
    setEntries((list) => list.filter((e) => e.ref !== ref));
    setSupport((list) => list.filter((s) => s.ref !== ref));
  }

  function submit() {
    if (!valid || !f.typeId || !f.requester) return;
    const [start, end] = f.range ? f.range.split("#") : [];
    createRequest({
      typeId: f.typeId,
      customName: needsCustom ? f.customName.trim() : "",
      requester: f.requester,
      due: f.due,
      prof: f.noProf ? null : (REL_PROFS.find((p) => p.id === f.profId) ?? null),
      period: start && end ? `${isoToBR(start)} – ${isoToBR(end)}` : "",
      obs: f.obs,
      support: support.map(({ ref: _ref, ...s }) => s),
      protocolAppId: f.protocolAppId,
    });
  }

  return (
    <DrawerModal
      id="relatorio-nova-solicitacao"
      show={show}
      onCancel={closeModal}
      variant="medium"
      customTitle={{ children: <TitleWithSub title="Nova solicitação de relatório" sub="Solicitação a partir do prontuário" /> }}
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FakeInput
            label="Paciente *"
            labelColor="blue"
            value={
              <span className="flex items-center gap-2.5 font-bold text-brand-purple-dark">
                <Icon name="fa-user" type="solid" className="text-brand-blue-dark" />
                {patient.name}
              </span>
            }
          />
          <Input
            id="nova-tipo"
            type="select"
            label="Tipo de relatório *"
            prompt="Selecionar tipo"
            value={f.typeId}
            options={REL_TYPES.map((t) => [t.name, t.id] as const)}
            onChange={(v) => setF((p) => ({ ...p, typeId: (v ?? "") as ReportTypeId | "", protocolAppId: "" }))}
          />
        </div>

        {type && (
          <Callout
            tone={isExternal ? "info" : needsCustom ? "warn" : "green"}
            icon={isExternal ? "fa-file-pdf" : needsCustom ? "fa-file-pen" : isProtocol ? "fa-clipboard-check" : "fa-file-lines"}
          >
            {isExternal ? (
              <>Sem modelo interno. O profissional deverá <strong>anexar o PDF final</strong> para concluir.</>
            ) : needsCustom ? (
              <>Sem modelo interno. Informe abaixo o nome do relatório; a produção será por <strong>documento anexo</strong>.</>
            ) : isProtocol ? (
              <>Nasce de uma <strong>aplicação de protocolo finalizada</strong>. O editor carrega a grade e os gráficos da avaliação e permite gerar os textos com IA.</>
            ) : (
              <>Este tipo possui <strong>modelo interno</strong> — o profissional abrirá o modelo direto para preencher.</>
            )}
          </Callout>
        )}

        {isProtocol && (
          <FieldBlock label="Aplicação de protocolo *">
            {apps.length === 0 ? (
              <p className="rounded-lg bg-brand-purple-dark/5 px-4 py-3 text-sm text-brand-purple-dark/60">Este paciente não tem aplicações de protocolo finalizadas.</p>
            ) : (
              <RadioCards
                id="nova-aplicacao"
                value={f.protocolAppId}
                onChange={(id) => up("protocolAppId", id)}
                option={apps.map((a) => ({
                  id: a.id,
                  title: `${a.protocol} — ${a.instrument}`,
                  subtitle: `Finalizada em ${a.finishedAt} · ${a.by.name}`,
                  badge: `${vbTotal(a.cells).pct}%`,
                  icon: "fa-clipboard-check",
                }))}
              />
            )}
          </FieldBlock>
        )}

        {needsCustom && (
          <Input
            id="nova-nome"
            label="Nome / descrição do relatório *"
            placeholder="Ex.: Relatório para a escola"
            value={f.customName}
            onChange={(event) => up("customName", event.target.value)}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="nova-solicitante"
            type="select"
            label="Solicitante *"
            prompt="Quem pediu"
            value={f.requester}
            options={REL_REQUESTERS.map((r) => [r, r] as const)}
            onChange={(v) => up("requester", (v ?? "") as Requester | "")}
          />
          <Input id="nova-prazo" type="date" label="Data limite" value={f.due} onChange={(event) => up("due", event.target.value)} />
        </div>

        <div>
          <Input
            id="nova-profissional"
            type="select"
            label={f.noProf ? "Profissional responsável" : "Profissional responsável *"}
            prompt="Quem vai elaborar"
            value={f.noProf ? "" : f.profId}
            disabled={f.noProf}
            options={REL_PROFS.map((p) => [`${p.name} · ${p.specialty}`, p.id] as const)}
            onChange={(v) => up("profId", v ?? "")}
          />
          <Input
            id="nova-sem-responsavel"
            type="checkbox"
            label="Deixar sem responsável por enquanto (a coordenação atribui depois)"
            checked={f.noProf}
            onChange={(event) => up("noProf", event.target.checked)}
          />
        </div>

        <FieldBlock label="Período de referência" hint="Opcional">
          <RangeDatePicker field={{ id: "nova-periodo", name: "solicitacao[periodo]", value: f.range }} onChange={(v) => up("range", v)} />
        </FieldBlock>

        <Input
          id="nova-observacoes"
          type="textarea"
          label="Observações"
          placeholder="Instruções, contexto ou informações complementares para o profissional."
          rows={3}
          value={f.obs}
          onChange={(event) => up("obs", event.target.value)}
        />

        <FieldBlock label="Anexos / arquivos de apoio" hint="materiais que ajudam na elaboração — não são o relatório final">
          <FileUploader
            upload={{ ref: "nova-apoio", name: "solicitacao[apoio]", maxEntries: 10, entries }}
            variant="simplified"
            validateEntryDone={false}
            entriesFirst={false}
            onChange={addFiles}
            onCancel={removeFile}
          />
        </FieldBlock>
      </div>

      <DrawerFooter>
        <Button type="button" variant="tint" onClick={closeModal}>
          Cancelar
        </Button>
        <Button type="button" rightIcon="fa-plus" iconType="solid" disabled={!valid} className="disabled:opacity-50" onClick={submit}>
          Criar solicitação
        </Button>
      </DrawerFooter>
    </DrawerModal>
  );
}
