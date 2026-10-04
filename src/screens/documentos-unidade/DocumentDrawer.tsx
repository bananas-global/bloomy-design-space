/**
 * Gaveta "Adicionar / Anexar / Editar documento" da unidade
 * (`UnitDocumentDrawer`): nome, tipo, vigência, arquivo e as operadoras que
 * recebem o documento. Mesma gaveta da aba do profissional, com a vigência
 * de/até que o documento da unidade tem (`valid_from` e `valid_until`).
 *
 * - Adicionar: escolhe o tipo e dá o nome.
 * - Anexar: aberta pela lacuna de um documento padrão, com o tipo travado.
 * - Editar: o tipo fica travado quando o documento é padrão.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { RadioGroup } from "../../components/Choice.js";
import { FileUploader, type UploadEntry } from "../../components/FileUploader.js";
import { Icon } from "../../components/Icon.js";
import { FakeInput, FieldError, Input } from "../../components/Input.js";
import { MultiSelect } from "../../components/MultiSelect.js";
import { DrawerModal } from "../../components/Overlay.js";
import { OPERATORS, UNIT_DOC_TYPES, brToIso, isoToBr, slotOf, typeName, type StandardSlot, type UnitDocTypeId, type UnitDocument } from "./model.js";
import { DRAWER_SIZE, DrawerFooter, FieldBlock } from "./parts.js";
import { useUnitDocuments } from "./store.js";

const MAX_FILE_SIZE = 10_000_000;
const ACCEPT = ".pdf,.jpg,.jpeg,.png";
/** Opção "Todas as operadoras" do multi_select: marca (ou desmarca) todas de uma vez. */
const ALL_OPERATORS = "todas";

type Form = {
  name: string;
  type: UnitDocTypeId | "";
  hasValidity: boolean;
  /** ISO `AAAA-MM-DD`, ou "". */
  validFrom: string;
  validUntil: string;
  file: string;
  fileSize: number;
  fileTooLarge: boolean;
  sharedWith: string[];
};

function initialForm(doc: UnitDocument | undefined, slot: StandardSlot | undefined): Form {
  if (doc) {
    return {
      name: doc.name,
      type: doc.type,
      hasValidity: Boolean(doc.validUntil),
      validFrom: doc.validFrom ? brToIso(doc.validFrom) : "",
      validUntil: doc.validUntil ? brToIso(doc.validUntil) : "",
      file: doc.file,
      fileSize: 0,
      fileTooLarge: false,
      sharedWith: doc.sharedWith,
    };
  }
  return {
    name: slot?.name ?? "",
    type: slot?.type ?? "",
    hasValidity: slot?.renewal !== "sem validade",
    validFrom: "",
    validUntil: "",
    file: "",
    fileSize: 0,
    fileTooLarge: false,
    sharedWith: [],
  };
}

/** O documento padrão que a gaveta preenche (`und-stdnote`). Novo — não existe no Phoenix. */
function SlotNote({ slot }: { slot: StandardSlot }) {
  return (
    <div className="flex gap-3 rounded-xl bg-blue-light px-4 py-3 text-blue-dark">
      <Icon name={slot.icon} type="solid" className="mt-1 flex-none" />
      <div>
        <p className="font-extrabold">{slot.name}</p>
        <p className="text-sm leading-normal">{`${slot.hint} · renovação ${slot.renewal}`}</p>
      </div>
    </div>
  );
}

export function DocumentDrawer({ doc, preset }: { doc?: UnitDocument; preset?: string }) {
  const { closeModal, save } = useUnitDocuments();
  const editing = Boolean(doc);
  const slot = slotOf(doc ? doc.slotId : preset);
  const locked = Boolean(slot);
  const [f, setF] = useState<Form>(() => initialForm(doc, slot));
  const [touched, setTouched] = useState(false);
  const up = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  const err = {
    name: !f.name.trim(),
    type: !f.type,
    file: !f.file || f.fileTooLarge,
    date: f.hasValidity && !f.validUntil,
    range: f.hasValidity && Boolean(f.validFrom && f.validUntil) && f.validFrom > f.validUntil,
  };
  const invalid = Object.values(err).some(Boolean);

  const title = editing ? "Editar documento" : slot ? `Anexar ${slot.short}` : "Adicionar documento";

  function submit() {
    setTouched(true);
    if (invalid || !f.type) return;
    save(doc?.id ?? null, {
      slotId: slot?.id,
      type: f.type,
      name: f.name.trim(),
      validFrom: f.hasValidity && f.validFrom ? isoToBr(f.validFrom) : null,
      validUntil: f.hasValidity ? isoToBr(f.validUntil) : null,
      file: f.file,
      sharedWith: f.sharedWith,
    });
  }

  const entries: UploadEntry[] = f.file
    ? [{ ref: "documento-unidade-arquivo-atual", clientName: f.file, clientSize: f.fileSize, progress: 100, done: true, errors: f.fileTooLarge ? ["too_large"] : [] }]
    : [];

  const allOn = f.sharedWith.length === OPERATORS.length;

  return (
    <DrawerModal
      id="documento-unidade-gaveta"
      show
      onCancel={closeModal}
      variant="custom"
      customSize={DRAWER_SIZE}
      contentClass="flex flex-col"
      title={title}
    >
      <div className="flex flex-1 flex-col gap-6">
        {slot && <SlotNote slot={slot} />}

        <Input
          id="documento-unidade-nome"
          label="Nome do documento"
          placeholder="Ex.: Alvará de Funcionamento 2026"
          value={f.name}
          errors={touched && err.name ? ["Informe o nome do documento."] : []}
          onChange={(event) => up("name", event.target.value)}
        />

        {locked ? (
          <FakeInput
            label="Tipo"
            labelColor="blue"
            value={
              <span className="flex items-center gap-2.5 font-bold text-brand-purple-dark">
                <Icon name="fa-lock" type="solid" className="text-brand-purple-dark/50" />
                {typeName(f.type || "other")}
              </span>
            }
          />
        ) : (
          <div>
            <RadioGroup
              label="Tipo"
              field={{ id: "documento-unidade-tipo", name: "documento[tipo]", value: f.type }}
              wrapperClass="flex flex-wrap gap-2 space-x-0!"
              radio={UNIT_DOC_TYPES.map((t) => ({ value: t.id, label: t.name }))}
              onChange={(event) => up("type", event.target.value as UnitDocTypeId)}
            />
            {touched && err.type && <FieldError message="Selecione o tipo." />}
          </div>
        )}

        <div>
          <RadioGroup
            label="Validade"
            field={{ id: "documento-unidade-validade", name: "documento[validade]", value: f.hasValidity ? "range" : "none" }}
            wrapperClass="flex flex-wrap gap-2 space-x-0!"
            radio={[
              { value: "none", label: "Sem validade" },
              { value: "range", label: "Definir vigência" },
            ]}
            onChange={(event) => setF((p) => ({ ...p, hasValidity: event.target.value === "range" }))}
          />
          {f.hasValidity && (
            <div className="mt-4 grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              <Input id="documento-unidade-vigencia" type="date" label="Vigência (de)" value={f.validFrom} onChange={(event) => up("validFrom", event.target.value)} />
              <Input
                id="documento-unidade-expira"
                type="date"
                label="Expira em"
                value={f.validUntil}
                errors={touched && err.date ? ["Informe a data de expiração."] : touched && err.range ? ["A vigência precisa começar antes de expirar."] : []}
                onChange={(event) => up("validUntil", event.target.value)}
              />
            </div>
          )}
        </div>

        <FieldBlock label="Arquivo" hint="PDF, JPG ou PNG até 10 MB">
          <FileUploader
            upload={{ ref: "documento-unidade-arquivo", name: "documento[arquivo]", accept: ACCEPT, maxEntries: 1, maxFileSize: MAX_FILE_SIZE, entries }}
            variant="simplified"
            validateEntryDone={false}
            onChange={(files) => {
              const file = files[0];
              if (file) setF((p) => ({ ...p, file: file.name, fileSize: file.size, fileTooLarge: file.size > MAX_FILE_SIZE }));
            }}
            onCancel={() => setF((p) => ({ ...p, file: "", fileSize: 0, fileTooLarge: false }))}
          />
          {touched && !f.file && <FieldError message="Anexe o arquivo do documento." />}
        </FieldBlock>

        <MultiSelect
          id="documento-unidade-operadoras"
          label="Compartilhar com operadoras"
          prompt="Nenhuma operadora"
          options={[
            { id: ALL_OPERATORS, label: allOn ? "Remover todas as operadoras" : "Todas as operadoras" },
            ...OPERATORS.map((o) => ({ id: o.id, label: o.name })),
          ]}
          field={{ id: "documento-unidade-operadoras", name: "documento[operadoras]", value: f.sharedWith }}
          onChange={(ids) => up("sharedWith", ids.includes(ALL_OPERATORS) ? (allOn ? [] : OPERATORS.map((o) => o.id)) : ids)}
        />
      </div>

      <DrawerFooter>
        <Button type="button" variant="tint" onClick={closeModal}>
          Cancelar
        </Button>
        <Button type="button" rightIcon="fa-check" iconType="solid" onClick={submit}>
          {editing ? "Salvar alterações" : "Adicionar documento"}
        </Button>
      </DrawerFooter>
    </DrawerModal>
  );
}
