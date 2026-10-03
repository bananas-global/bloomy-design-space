/**
 * Gaveta "Adicionar / Anexar / Editar documento" (`DsAddDocModal` com
 * `asDrawer` e `inlineShare`): tipo, carga horária do curso de ABA, formação
 * especial, validade, arquivo e as operadoras que recebem o documento.
 *
 * - Adicionar: escolhe um dos tipos não padrão.
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
import {
  ABA_QUICK_HOURS,
  FREE_TYPES,
  OPERATORS,
  SPECIAL_TRAININGS,
  brToIso,
  docType,
  isStandard,
  isoToBr,
  requiredBy,
  trainingDocName,
  typeName,
  type DocTypeId,
  type ProfessionalDocument,
} from "./model.js";
import { DRAWER_SIZE, DrawerFooter, FieldBlock, Note } from "./parts.js";
import { useDocuments } from "./store.js";

const MAX_FILE_SIZE = 10_000_000;
const ACCEPT = ".pdf,.jpg,.jpeg,.png";
/** Opção "Todas as operadoras" do multi_select: marca (ou desmarca) todas de uma vez. */
const ALL_OPERATORS = "todas";

type Form = {
  typeId: DocTypeId;
  name: string;
  training: string;
  hours: string;
  hasValidity: boolean;
  /** ISO `AAAA-MM-DD`, ou "". */
  validUntil: string;
  file: string;
  fileSize: number;
  fileTooLarge: boolean;
  sharedWith: string[];
};

function initialForm(doc: ProfessionalDocument | undefined, preset: DocTypeId | undefined): Form {
  if (doc) {
    return {
      typeId: doc.typeId,
      name: doc.name,
      training: doc.training ?? "",
      hours: doc.hours ? String(doc.hours) : "",
      hasValidity: Boolean(doc.validUntil),
      validUntil: doc.validUntil ? brToIso(doc.validUntil) : "",
      file: doc.file,
      fileSize: 0,
      fileTooLarge: false,
      sharedWith: doc.sharedWith,
    };
  }
  const typeId = preset ?? FREE_TYPES[0]!.id;
  const meta = docType(typeId);
  return {
    typeId,
    name: typeId === "other" || typeId === "special_training" ? "" : meta.name,
    training: "",
    hours: "",
    hasValidity: meta.expires,
    validUntil: "",
    file: "",
    fileSize: 0,
    fileTooLarge: false,
    sharedWith: [],
  };
}

export function DocumentDrawer({ doc, preset }: { doc?: ProfessionalDocument; preset?: DocTypeId }) {
  const { closeModal, save } = useDocuments();
  const editing = Boolean(doc);
  const locked = doc ? isStandard(doc.typeId) : Boolean(preset);
  const [f, setF] = useState<Form>(() => initialForm(doc, preset));
  const [touched, setTouched] = useState(false);
  const up = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  const required = requiredBy(f.typeId);
  const err = {
    name: !f.name.trim(),
    file: !f.file || f.fileTooLarge,
    date: f.hasValidity && !f.validUntil,
    training: f.typeId === "special_training" && !f.training,
    hours: f.typeId === "aba_course" && !(Number(f.hours) > 0),
  };
  const invalid = Object.values(err).some(Boolean);

  const title = editing ? "Editar documento" : locked ? `Anexar ${typeName(f.typeId)}` : "Adicionar documento";

  function pickType(id: DocTypeId) {
    const meta = docType(id);
    setF((p) => ({
      ...p,
      typeId: id,
      // A validade fica como a pessoa deixou: trocar o tipo não a altera.
      ...(editing ? {} : { name: id === "other" ? "" : meta.name }),
    }));
  }

  function pickTraining(id: string) {
    setF((p) => {
      const auto = !p.name.trim() || SPECIAL_TRAININGS.some((t) => p.name === trainingDocName(t.id));
      return { ...p, training: id, name: !editing || auto ? trainingDocName(id) : p.name };
    });
  }

  function submit() {
    setTouched(true);
    if (invalid) return;
    const aba = f.typeId === "aba_course";
    save(doc?.id ?? null, {
      typeId: f.typeId,
      name: aba ? `${typeName("aba_course")} — ${Number(f.hours)}h` : f.name.trim(),
      training: f.typeId === "special_training" ? f.training : undefined,
      hours: aba ? Number(f.hours) : undefined,
      validUntil: f.hasValidity ? isoToBr(f.validUntil) : null,
      file: f.file,
      sharedWith: f.sharedWith,
    });
  }

  const entries: UploadEntry[] = f.file
    ? [{ ref: "documento-arquivo-atual", clientName: f.file, clientSize: f.fileSize, progress: 100, done: true, errors: f.fileTooLarge ? ["too_large"] : [] }]
    : [];

  const allOn = f.sharedWith.length === OPERATORS.length;

  return (
    <DrawerModal
      id="documento-gaveta"
      show
      onCancel={closeModal}
      variant="custom"
      customSize={DRAWER_SIZE}
      contentClass="flex flex-col"
      title={title}
    >
      <div className="flex flex-1 flex-col gap-6">
        {locked ? (
          <FakeInput
            label="Tipo de documento"
            labelColor="blue"
            value={
              <span className="flex items-center gap-2.5 font-bold text-brand-purple-dark">
                <Icon name="fa-lock" type="solid" className="text-brand-purple-dark/50" />
                {typeName(f.typeId)}
              </span>
            }
          />
        ) : (
          <RadioGroup
            label="Tipo de documento"
            field={{ id: "documento-tipo", name: "documento[tipo]", value: f.typeId }}
            wrapperClass="flex flex-wrap gap-2 space-x-0!"
            radio={FREE_TYPES.map((t) => ({ value: t.id, label: t.name }))}
            onChange={(event) => pickType(event.target.value as DocTypeId)}
          />
        )}

        {f.typeId === "aba_course" && (
          <FieldBlock label="Carga horária do curso">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                id="documento-horas"
                type="number"
                min={1}
                step={10}
                placeholder="Ex.: 180"
                className="w-32"
                value={f.hours}
                onChange={(event) => up("hours", event.target.value)}
              />
              <span className="text-sm font-bold text-brand-purple-dark/60">horas</span>
              <div className="flex flex-wrap gap-1.5">
                {ABA_QUICK_HOURS.map((h) => (
                  <Button key={h} type="button" size="small" variant={Number(f.hours) === h ? "tint" : "ghost"} onClick={() => up("hours", String(h))}>
                    {`${h}h`}
                  </Button>
                ))}
              </div>
            </div>
            <Note>Soma na carga horária ABA do profissional, usada no painel de documentação da equipe.</Note>
            {touched && err.hours && <FieldError message="Informe a carga horária em horas." />}
          </FieldBlock>
        )}

        {f.typeId === "special_training" && (
          <div>
            <RadioGroup
              label="Tipo de formação"
              field={{ id: "documento-formacao", name: "documento[formacao]", value: f.training }}
              wrapperClass="flex flex-wrap gap-2 space-x-0!"
              radio={SPECIAL_TRAININGS.map((t) => ({ value: t.id, label: t.short }))}
              onChange={(event) => pickTraining(event.target.value)}
            />
            {touched && err.training && <FieldError message="Escolha a formação certificada." />}
          </div>
        )}

        {f.typeId === "other" && (
          <Input
            id="documento-nome"
            label="Nome do documento"
            placeholder="Ex.: Certidão de antecedentes criminais"
            value={f.name}
            errors={touched && err.name ? ["Informe um nome para o documento."] : []}
            onChange={(event) => up("name", event.target.value)}
          />
        )}

        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
          <RadioGroup
            label="Validade"
            field={{ id: "documento-validade", name: "documento[validade]", value: f.hasValidity ? "date" : "none" }}
            wrapperClass="flex flex-wrap gap-2 space-x-0!"
            radio={[
              { value: "none", label: "Sem validade" },
              { value: "date", label: "Definir data" },
            ]}
            onChange={(event) => setF((p) => ({ ...p, hasValidity: event.target.value === "date", validUntil: event.target.value === "date" ? p.validUntil : "" }))}
          />
          {f.hasValidity && (
            <Input
              id="documento-valido-ate"
              type="date"
              label="Válido até"
              value={f.validUntil}
              errors={touched && err.date ? ["Escolha a data de validade."] : []}
              onChange={(event) => up("validUntil", event.target.value)}
            />
          )}
        </div>

        <FieldBlock label="Arquivo" hint="PDF, JPG ou PNG até 10 MB">
          <FileUploader
            upload={{ ref: "documento-arquivo", name: "documento[arquivo]", accept: ACCEPT, maxEntries: 1, maxFileSize: MAX_FILE_SIZE, entries }}
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

        <div>
          <MultiSelect
            id="documento-operadoras"
            label="Compartilhar com operadoras"
            prompt="Nenhuma operadora"
            options={[
              { id: ALL_OPERATORS, label: allOn ? "Remover todas as operadoras" : "Todas as operadoras" },
              ...OPERATORS.map((o) => ({ id: o.id, label: o.name, details: o.required.includes(f.typeId) ? "exige" : undefined })),
            ]}
            field={{ id: "documento-operadoras", name: "documento[operadoras]", value: f.sharedWith }}
            onChange={(ids) => up("sharedWith", ids.includes(ALL_OPERATORS) ? (allOn ? [] : OPERATORS.map((o) => o.id)) : ids)}
          />
          {required.length > 0 && (
            <Note>
              Exigido por <strong>{required.map((o) => o.name).join(", ")}</strong> para credenciar.
            </Note>
          )}
        </div>
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
