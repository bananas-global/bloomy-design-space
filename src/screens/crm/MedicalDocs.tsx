/**
 * CRM de Leads — laudos e relatórios médicos do lead.
 * Novo — não existe no Phoenix.
 *
 * Consulta semestral com Pediatra, Neuropediatra ou Psiquiatra Infantil: o
 * PDF, a emissão, a validade (sugerida em 6 meses), a carga prescrita (ou
 * indeterminada) e se a renovação é obrigatória. O formulário abre no lugar
 * da lista.
 */
import { useMemo, useState } from "react";
import { Button } from "../../components/Button.js";
import { RadioGroup } from "../../components/Choice.js";
import { FileItem, FileUploader } from "../../components/FileUploader.js";
import { Icon } from "../../components/Icon.js";
import { Input, Label, SwitchCard } from "../../components/Input.js";
import { showToast } from "../../components/Action.js";
import { Tag } from "../../components/Tag.js";
import {
  MEDICAL_SPECIALTIES, MEDICAL_STATUS, MEDICAL_VALIDITY_MONTHS, addMonths, blankDoc, docHoursLabel, docLabel, docTone, fmtBR,
  type MedicalDoc,
} from "./model.js";
import { DISABLED, cx, fld, opts } from "./parts.js";

const TONE_TAG = { ok: "green", soon: "orange", late: "red", none: "dark-purple" } as const;

export function MedicalDocs({ docs, onChange }: { docs: MedicalDoc[]; onChange: (docs: MedicalDoc[]) => void }) {
  const [form, setForm] = useState<MedicalDoc | null>(null);
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [status, setStatus] = useState("");

  const sorted = useMemo(() => [...docs].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)), [docs]);
  const filtered = sorted.filter((d) => {
    if (specialty && d.specialty !== specialty) return false;
    if (status && docTone(d) !== status) return false;
    if (q.trim() && !`${d.doctor} ${d.crm} ${d.specialty}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });

  function save() {
    if (!form) return;
    const saved = form.id ? form : { ...form, id: `lm-${Date.now()}` };
    onChange(form.id ? docs.map((d) => (d.id === form.id ? saved : d)) : [...docs, saved]);
    showToast({ type: "success", title: "Laudo salvo", content: `${saved.specialty} · válido até ${fmtBR(saved.expiresAt)} · ${docHoursLabel(saved)}`, closeTime: 3000 });
    setForm(null);
  }

  function remove(id: string) {
    onChange(docs.filter((d) => d.id !== id));
    showToast({ type: "success", title: "Laudo removido", content: "O documento saiu do histórico.", closeTime: 3000 });
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-brand-purple-dark">Laudos e relatórios médicos</h3>
          <p className="text-sm text-brand-purple-dark/60">
            Consulta semestral com Pediatra, Neuropediatra ou Psiquiatra Infantil. Guarde o PDF, a data de emissão, a validade, a carga horária prescrita e se a renovação é obrigatória.
          </p>
        </div>
        {!form && <Button type="button" rightIcon="fa-plus" className="flex-none" onClick={() => setForm(blankDoc())}>Adicionar laudo</Button>}
      </header>

      {form ? (
        <DocForm form={form} setForm={setForm} onCancel={() => setForm(null)} onSave={save} />
      ) : (
        <>
          {docs.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_200px_180px]">
              <Input id="lm-search" name="lm_search" placeholder="Buscar por médico, CRM ou especialidade" rightIcon="fa-search" value={q} onChange={(e) => setQ(e.target.value)} />
              <Input type="select" id="lm-specialty" name="lm_specialty" prompt="Todas as especialidades" options={opts(MEDICAL_SPECIALTIES)} value={specialty} onChange={(v) => setSpecialty(v ?? "")} />
              <Input type="select" id="lm-status" name="lm_status" prompt="Todos os status" options={MEDICAL_STATUS.map((s) => [s.label, s.id] as const)} value={status} onChange={(v) => setStatus(v ?? "")} />
            </div>
          )}

          {sorted.length === 0 || filtered.length === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-brand-purple-dark/20 p-6 text-sm text-brand-purple-dark/60">
              <Icon name="fa-file-pdf" />
              {sorted.length === 0 ? "Nenhum documento anexado ainda." : "Nenhum laudo encontrado com esses filtros."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {filtered.map((d) => <DocCard key={d.id} doc={d} onEdit={() => setForm({ ...d })} onRemove={() => remove(d.id)} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DocCard({ doc: d, onEdit, onRemove }: { doc: MedicalDoc; onEdit: () => void; onRemove: () => void }) {
  const tone = docTone(d);
  return (
    <div className={cx("space-y-3 rounded-xl border p-4", tone === "late" ? "border-red/40 bg-red-light/40" : tone === "soon" ? "border-brand-orange/40 bg-brand-orange/5" : "border-brand-purple-dark/10")}>
      <div className="flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue/20 text-brand-blue-dark"><Icon name="fa-file-pdf" /></span>
        <div className="flex gap-1">
          {d.file && (
            <Button type="button" variant="ghost" size="small" title={d.file} onClick={() => showToast({ type: "info", title: "Abrir documento", content: d.file, closeTime: 3000 })}>
              <Icon name="fa-eye" />
            </Button>
          )}
          <Button type="button" variant="ghost" size="small" title="Editar" onClick={onEdit}><Icon name="fa-pen" /></Button>
          <Button type="button" variant="ghost" size="small" title="Remover" className="text-red!" onClick={onRemove}><Icon name="fa-trash" /></Button>
        </div>
      </div>
      <div>
        <p className="font-bold text-brand-purple-dark">{d.specialty}</p>
        <p className="text-sm text-brand-purple-dark/60">{d.doctor}{d.crm ? ` · ${d.crm}` : ""}</p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-purple-dark/70">
        <span>Emitido em <b>{fmtBR(d.issuedAt)}</b></span>
        <span>Válido até <b>{fmtBR(d.expiresAt)}</b></span>
        <span>Carga prescrita <b>{d.hoursMode === "undetermined" ? "Indeterminada" : d.hours ? `${Number(d.hours).toLocaleString("pt-BR")}h/semana` : "—"}</b></span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Tag item={docLabel(d)} variant={TONE_TAG[tone]} pill />
        {d.mandatory && <Tag item="Renovação obrigatória" variant="dark-purple" pill />}
      </div>
    </div>
  );
}

function DocForm({ form, setForm, onCancel, onSave }: { form: MedicalDoc; setForm: (f: MedicalDoc) => void; onCancel: () => void; onSave: () => void }) {
  const up = <K extends keyof MedicalDoc>(k: K, v: MedicalDoc[K]) => {
    const next = { ...form, [k]: v };
    if (k === "issuedAt" && v) next.expiresAt = addMonths(String(v), MEDICAL_VALIDITY_MONTHS);
    setForm(next);
  };
  const canSave = !!(form.doctor.trim() && form.issuedAt && !(form.hoursMode === "weekly" && !Number(form.hours)));

  return (
    <div className="space-y-6 rounded-xl border border-brand-blue/40 bg-brand-blue/5 p-4">
      <h4 className="font-bold text-brand-purple-dark">{form.id ? "Editar laudo" : "Novo laudo"}</h4>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Input type="select" id="lm-form-specialty" name="specialty" label="Especialidade" clear={false} options={opts(MEDICAL_SPECIALTIES)} value={form.specialty} onChange={(v) => up("specialty", v ?? form.specialty)} />
        <Input id="lm-form-doctor" name="doctor" label="Médico responsável" placeholder="Dra. Renata Salgado" value={form.doctor} onChange={(e) => up("doctor", e.target.value)} />
        <Input id="lm-form-crm" name="crm" label="CRM" placeholder="CRM-SP 000.000" value={form.crm} onChange={(e) => up("crm", e.target.value)} />
        <Input id="lm-form-issued" name="issued_at" type="date" label="Data de emissão" value={form.issuedAt} onChange={(e) => up("issuedAt", e.target.value)} />
        <div className="md:col-span-2">
          <Input id="lm-form-expires" name="expires_at" type="date" label="Válido até" value={form.expiresAt} onChange={(e) => up("expiresAt", e.target.value)} />
          <p className="mt-1 text-sm text-brand-purple-dark/60">Sugerido: 6 meses após a emissão. Ajuste se o médico definiu outro prazo.</p>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-end gap-4">
          <RadioGroup
            label="Carga horária prescrita"
            field={fld("lm-form-hours-mode", form.hoursMode)}
            radio={[{ value: "weekly", label: "Horas semanais" }, { value: "undetermined", label: "Indeterminado" }]}
            onChange={(e) => up("hoursMode", e.target.value as MedicalDoc["hoursMode"])}
          />
          {form.hoursMode === "weekly" && (
            <Input id="lm-form-hours" name="hours" type="number" min={1} max={60} placeholder="20" hint="horas por semana" className="w-64" value={form.hours} onChange={(e) => up("hours", e.target.value)} />
          )}
        </div>
        {form.hoursMode === "undetermined" && (
          <p className="mt-2 text-sm text-brand-purple-dark/60">O laudo não define carga horária. O plano terapêutico segue pela indicação da equipe, sem número prescrito para conferir.</p>
        )}
      </div>

      <div>
        <Label>Documento (PDF)</Label>
        <div className="mt-2">
          {form.file ? (
            <FileItem fileName={form.file} size={0} variant="simplified" removeEvent={() => up("file", "")} />
          ) : (
            <FileUploader upload={{ ref: "lm-form-file", accept: ".pdf", maxEntries: 1 }} variant="simplified" onChange={(files) => files[0] && up("file", files[0].name)} />
          )}
        </div>
      </div>

      <SwitchCard
        field={fld("lm-form-mandatory", form.mandatory)}
        title="Renovação obrigatória"
        description="Quando ativo, o vencimento entra nos alertas e bloqueia o fechamento da documentação."
        onChange={(e) => up("mandatory", e.target.checked)}
      />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="tint" onClick={onCancel}>Cancelar</Button>
        <Button type="button" rightIcon="fa-check" disabled={!canSave} className={DISABLED} onClick={onSave}>Salvar laudo</Button>
      </div>
    </div>
  );
}
