/**
 * Solicitações de melhoria — modal Nova solicitação: as 16 perguntas em quatro
 * passos (Identificação, Necessidade e contorno, Impacto e urgência, Evidências
 * e envio). "Próximo" só avança com o passo completo; "Enviar" volta ao
 * primeiro passo com pendência.
 *
 * `modal/1` com `steps/1`, `input/1`, `radio_group/1` e `file_uploader/1`.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { RadioGroup } from "../../components/Choice.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Modal } from "../../components/Overlay.js";
import { Steps } from "../../components/Steps.js";
import { FORM_STEPS, L, formFor, opts, stepErrors, validateForm, type Role, type SmForm } from "./model.js";
import { SmUploader } from "./parts.js";

export function NovaSolicitacao({ show, role, onClose, onSubmit }: { show: boolean; role: Role; onClose: () => void; onSubmit: (form: SmForm) => void }) {
  return (
    <Modal id="modal-nova-sm" show={show} title="Nova solicitação de melhoria" variant="small" onCancel={onClose}>
      {/* Monta só aberto, para o formulário começar limpo. */}
      {show && <Wizard key={role} role={role} onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}

function Wizard({ role, onClose, onSubmit }: { role: Role; onClose: () => void; onSubmit: (form: SmForm) => void }) {
  const [form, setForm] = useState<SmForm>(() => formFor(role));
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);

  const all = validateForm(form);
  const shown = tried ? all : {};
  const err = (k: keyof SmForm) => (shown[k] ? [shown[k]!] : []);
  const set = (patch: Partial<SmForm>) => setForm((f) => ({ ...f, ...patch }));
  const text = (k: keyof SmForm) => ({
    id: `nf_${k}`,
    name: k,
    value: form[k] as string,
    errors: err(k),
    onChange: (e: { target: { value: string } }) => set({ [k]: e.target.value } as Partial<SmForm>),
  });
  const select = (k: keyof SmForm, list: readonly string[], label: string) => (
    <Input type="select" id={`nf_${k}`} label={label} prompt="Selecionar" options={opts(list)} value={form[k]} errors={err(k)} onChange={(v) => set({ [k]: v ?? "" } as Partial<SmForm>)} />
  );

  const pending = FORM_STEPS[step]!.keys.filter((k) => shown[k]).length;
  const last = step === FORM_STEPS.length - 1;

  function next() {
    if (stepErrors(form, step).length) return setTried(true);
    setStep(step + 1);
    setTried(false);
  }

  function submit() {
    if (Object.keys(all).length) {
      const first = FORM_STEPS.findIndex((_, i) => stepErrors(form, i).length > 0);
      setTried(true);
      setStep(first < 0 ? step : first);
      return;
    }
    onSubmit(form);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <Steps stepCount={FORM_STEPS.length} current={step + 1} />
        <p className="font-bold text-brand-purple-dark">{FORM_STEPS[step]!.label}</p>
      </div>

      {step === 0 && (
        <div className="space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            <Input label="Nome do solicitante *" {...text("requester")} />
            <Input label="E-mail ou ramal *" {...text("contact")} />
            {select("area", L.areas, "Área solicitante *")}
            {select("unit", L.units, "Unidade *")}
          </div>
          <Input label="Título resumido *" placeholder="Ex.: Guias de autorização vencidas não são sinalizadas" {...text("title")} />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-8">
          <Input type="textarea" rows={3} label="O que você precisa? *" placeholder="Descreva a necessidade, dor ou oportunidade de melhoria." {...text("need")} />
          <Input type="textarea" rows={3} label="O que acontece hoje? *" placeholder="Como o processo funciona hoje e qual a falha ou dificuldade." {...text("asIs")} />
          <Input type="textarea" rows={3} label="Como você contorna essa situação hoje? *" placeholder="Controle paralelo, planilha, papel, retrabalho manual ou dependência de terceiros." {...text("workaround")} />
          <Input type="textarea" rows={3} label="O que você espera que aconteça? *" placeholder="O resultado prático esperado, sem termos técnicos." {...text("expected")} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8">
          <div className="grid gap-8 md:grid-cols-3">
            {select("audience", L.audience, "Quem é impactado? *")}
            {select("frequency", L.freq, "Frequência *")}
            {select("impactType", L.impacts, "Principal impacto *")}
          </div>
          <RadioGroup
            label="Existe prazo regulatório, contratual ou data limite? *"
            field={{ id: "nf_has_deadline", name: "hasDeadline", value: form.hasDeadline }}
            radio={[{ value: "Não", label: "Não" }, { value: "Sim", label: "Sim" }]}
            onChange={(e) => set({ hasDeadline: e.target.value as SmForm["hasDeadline"] })}
          />
          {form.hasDeadline === "Sim" && <Input label="Detalhes da data limite *" placeholder="Ex.: Exigência ANS a partir de 01/12/2026" {...text("deadline")} />}
          <Input type="textarea" rows={2} label="Consequência de não atender *" {...text("consequence")} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="block text-sm/4 font-bold text-brand-blue">Anexos e evidências</p>
            <p className="text-sm text-brand-purple-dark/60">Imagens, vídeos, PDF e planilhas. Anonimize prints com dados de pacientes.</p>
            <SmUploader id="nf_files" files={form.files} onChange={(files) => set({ files })} />
          </div>
          <Input label="Links de apoio" placeholder="Pastas de rede, planilhas compartilhadas ou documentos" {...text("attachments")} />
          <Input
            type="checkbox"
            id="nf_lgpd"
            name="lgpd"
            className="pb-6"
            checked={form.lgpd}
            label="Confirmo que os anexos e descrições não contêm dados de pacientes. *"
            errors={err("lgpd")}
            onChange={(e) => set({ lgpd: e.target.checked })}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-4">
        {pending > 0 && (
          <p className="text-sm font-bold text-red-dark">
            <Icon name="fa-circle-exclamation" type="solid" /> {pending} campo(s) obrigatório(s) pendente(s)
          </p>
        )}
        <div className="ml-auto flex gap-3">
          {step === 0 ? (
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          ) : (
            <Button type="button" variant="outline" leftIcon="fa-arrow-left" onClick={() => setStep(step - 1)}>Voltar</Button>
          )}
          {last ? (
            <Button type="button" leftIcon="fa-paper-plane" onClick={submit}>Enviar solicitação</Button>
          ) : (
            <Button type="button" rightIcon="fa-arrow-right" onClick={next}>Próximo</Button>
          )}
        </div>
      </div>
    </div>
  );
}
