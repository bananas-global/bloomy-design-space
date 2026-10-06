/**
 * CRM de Leads — Efetivar Lead como Paciente.
 *
 * O Phoenix já tem o drawer (`convert_patient_drawer.ex`, `drawer_modal`
 * medium); aqui ele traz o resumo do lead e só o que falta para virar
 * paciente: data de nascimento (estimada pela idade), operadora e unidade.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { Input, type SelectItem } from "../../components/Input.js";
import { DrawerModal } from "../../components/Overlay.js";
import { TODAY } from "../../components/today.js";
import { OPERATOR_OPTIONS, UNITS, guardianOf, operatorName, type Lead } from "./model.js";
import { Initials, opts } from "./parts.js";

const OPERATOR_ITEMS: SelectItem[] = OPERATOR_OPTIONS.map((g) => ({
  group: g.label,
  items: g.options.map((o) => ({ label: o, value: o })),
}));

export function ConvertDrawer({ lead, onClose, onConfirm }: { lead: Lead | null; onClose: () => void; onConfirm: (l: Lead) => void }) {
  return (
    <DrawerModal id="convert_patient_drawer" show={!!lead} title="Efetivar Lead como Paciente" variant="medium" onCancel={onClose} contentClass="flex flex-col">
      {lead && <ConvertForm key={lead.id} lead={lead} onClose={onClose} onConfirm={() => onConfirm(lead)} />}
    </DrawerModal>
  );
}

function ConvertForm({ lead, onClose, onConfirm }: { lead: Lead; onClose: () => void; onConfirm: () => void }) {
  const birthYear = Number(TODAY.slice(0, 4)) - (lead.age || 0);
  const [birth, setBirth] = useState(`${birthYear}-01-01`);
  const [operator, setOperator] = useState(lead.operator);
  const [unit, setUnit] = useState(lead.prefUnit);
  const g = guardianOf(lead);

  return (
    <>
      <div className="flex-1 space-y-6">
        <div className="grid grid-cols-1 gap-4 rounded-xl bg-brand-purple-dark/5 p-4 sm:grid-cols-2">
          {[[lead.child, `${lead.age} anos`], [g.name, g.phone]].map(([name, sub]) => (
            <div key={name} className="flex items-center gap-3">
              <Initials name={name ?? ""} size="medium" />
              <div>
                <p className="font-bold text-brand-purple-dark">{name}</p>
                <p className="text-sm text-brand-purple-dark/60">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div>
          <Input id="convert-birthdate" name="patient_birthdate" type="date" label="Data de Nascimento" value={birth} onChange={(e) => setBirth(e.target.value)} />
          <p className="mt-1 text-sm text-brand-purple-dark/60">Estimada com base na idade. Ajuste se souber a data exata.</p>
        </div>

        <Input
          id="convert-operator"
          name="health_care"
          type="select"
          label="Operadora / Plano de Saúde"
          prompt="Selecionar"
          options={OPERATOR_ITEMS}
          value={operator}
          onChange={(v) => setOperator(v ?? "")}
        />
        {lead.operator && operator !== lead.operator && <p className="-mt-4 text-sm text-brand-purple-dark/60">No lead: {operatorName(lead)}.</p>}

        <Input id="convert-unit" name="unit_id" type="select" label="Unidade" prompt="Selecionar" options={opts(UNITS)} value={unit} onChange={(v) => setUnit(v ?? "")} />
      </div>

      <div className="sticky -bottom-6 -mx-6 -mb-6 mt-8 flex items-center justify-between gap-3 border-t border-neutral-100 bg-white px-6 py-4">
        <Button type="button" variant="tint" rightIcon="fa-xmark" onClick={onClose}>Cancelar</Button>
        <Button type="button" rightIcon="fa-user-check" onClick={onConfirm}>Efetivar Paciente</Button>
      </div>
    </>
  );
}
