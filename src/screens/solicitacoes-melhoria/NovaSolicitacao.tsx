/**
 * Solicitações de melhoria — página Nova solicitação: as 16 perguntas em quatro
 * cards, um abaixo do outro (Identificação, Necessidade e contorno, Impacto e
 * urgência, Evidências e envio). O cabeçalho com o progresso e o rodapé com as
 * ações ficam fixos na rolagem. "Enviar" marca os campos pendentes e rola até o
 * primeiro card com pendência.
 *
 * Enquanto o título é digitado, sugere SMs em andamento parecidas: se for o
 * mesmo problema, a pessoa diz "Também me afeta" em vez de abrir outra.
 *
 * `card/1` com `input/1`, `radio_group/1`, `file_uploader/1` e `progress/1`. O
 * cabeçalho e o rodapé fixos são novos: não há uma página de formulário assim no
 * sistema.
 */
import { useState, type ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { RadioGroup } from "../../components/Choice.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Progress } from "../../components/Layout.js";
import { AffectButton, reachText } from "./Afetados.js";
import { FORM_STEPS, L, formFor, opts, similarTo, stepErrors, validateForm, type Role, type Sm, type SmForm } from "./model.js";
import { SmUploader, StageTag, cx } from "./parts.js";

/** O título de cada card, na ordem de `FORM_STEPS`. */
const TITLES = ["Identificação", "Necessidade e contorno", "Impacto e urgência", "Evidências e envio"];

const cardId = (i: number) => `nf_step_${i}`;

export function NovaSolicitacao({ role, sms, onCancel, onSubmit }: { role: Role; sms: Sm[]; onCancel: () => void; onSubmit: (form: SmForm) => void }) {
  const [form, setForm] = useState<SmForm>(() => formFor(role));
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

  const complete = FORM_STEPS.filter((_, i) => stepErrors(form, i).length === 0).length;
  const pending = Object.keys(shown).length;

  function submit() {
    const first = FORM_STEPS.findIndex((_, i) => stepErrors(form, i).length > 0);
    if (first >= 0) {
      setTried(true);
      document.getElementById(cardId(first))?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    onSubmit(form);
  }

  const step = (i: number, children: ReactNode) => (
    <StepCard index={i} done={stepErrors(form, i).length === 0} bad={FORM_STEPS[i]!.keys.filter((k) => shown[k]).length}>
      {children}
    </StepCard>
  );

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-30 -mx-4 -mt-4 bg-white px-4 py-4 shadow-main lg:-mx-8 lg:-mt-8 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-4">
          <Button type="button" variant="ghost" size="medium" leftIcon="fa-arrow-left" onClick={onCancel}>Voltar</Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold text-brand-purple-dark">Nova solicitação de melhoria</h1>
            <p className="text-sm text-neutral-900">
              {role === "pmo" ? "Registre em nome de quem pediu por outro canal." : "Responda as quatro seções; os campos com * são obrigatórios."}
            </p>
          </div>
          <div className="w-full sm:w-56">
            <p className="mb-1 text-xs font-bold text-brand-purple-dark/60">{complete} de {FORM_STEPS.length} seções completas</p>
            <Progress value={Math.round((complete / FORM_STEPS.length) * 100)} showPercentage={false} />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl space-y-6 py-6">
        {step(
          0,
          <div className="space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
              <Input label="Nome do solicitante *" {...text("requester")} />
              <Input label="E-mail ou ramal *" {...text("contact")} />
              {select("area", L.areas, "Área solicitante *")}
              {select("unit", L.units, "Unidade *")}
            </div>
            <Input label="Título resumido *" placeholder="Ex.: Guias de autorização vencidas não são sinalizadas" {...text("title")} />
            <Similar title={form.title} sms={sms} role={role} />
          </div>,
        )}

        {step(
          1,
          <div className="space-y-8">
            <Input type="textarea" rows={3} label="O que você precisa? *" placeholder="Descreva a necessidade, dor ou oportunidade de melhoria." {...text("need")} />
            <Input type="textarea" rows={3} label="O que acontece hoje? *" placeholder="Como o processo funciona hoje e qual a falha ou dificuldade." {...text("asIs")} />
            <Input type="textarea" rows={3} label="Como você contorna essa situação hoje? *" placeholder="Controle paralelo, planilha, papel, retrabalho manual ou dependência de terceiros." {...text("workaround")} />
            <Input type="textarea" rows={3} label="O que você espera que aconteça? *" placeholder="O resultado prático esperado, sem termos técnicos." {...text("expected")} />
          </div>,
        )}

        {step(
          2,
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
          </div>,
        )}

        {step(
          3,
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
              checked={form.lgpd}
              label="Confirmo que os anexos e descrições não contêm dados de pacientes. *"
              errors={err("lgpd")}
              onChange={(e) => set({ lgpd: e.target.checked })}
            />
          </div>,
        )}
      </div>

      <div className="sticky bottom-0 z-30 -mx-4 -mb-4 border-t border-neutral-100 bg-white px-4 py-4 shadow-main lg:-mx-8 lg:-mb-8 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
          {pending > 0 && (
            <p className="text-sm font-bold text-red-dark">
              <Icon name="fa-circle-exclamation" type="solid" /> {pending} campo(s) obrigatório(s) pendente(s)
            </p>
          )}
          <div className="ml-auto flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="button" leftIcon="fa-paper-plane" onClick={submit}>Enviar solicitação</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Um passo do formulário num `card/1`: número, título e o estado do passo. */
function StepCard({ index, done, bad, children }: { index: number; done: boolean; bad: number; children: ReactNode }) {
  return (
    <section id={cardId(index)} className="scroll-mt-32">
      <Card className={cx("space-y-6", bad > 0 && "ring-2 ring-red")}>
        <div className="flex items-center gap-3">
          <span
            className={cx(
              "inline-flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-black",
              bad > 0 ? "bg-red-light text-red-dark" : done ? "bg-blue-light text-blue-dark" : "bg-brand-blue text-white",
            )}
          >
            {done && !bad ? <Icon name="fa-check" type="solid" /> : index + 1}
          </span>
          <h2 className="flex-1 text-lg font-bold text-brand-purple-dark">{TITLES[index]}</h2>
          {bad > 0 && <span className="text-sm font-bold text-red-dark">{bad} pendente(s)</span>}
        </div>
        {children}
      </Card>
    </section>
  );
}

/** As SMs em andamento parecidas com o título digitado. */
function Similar({ title, sms, role }: { title: string; sms: Sm[]; role: Role }) {
  const found = similarTo(title, sms);
  if (!found.length) return null;
  return (
    <div className="space-y-3 rounded-xl bg-blue-light p-4">
      <div>
        <p className="font-bold text-blue-dark"><Icon name="fa-lightbulb" type="solid" /> Parece com o que já foi pedido</p>
        <p className="text-sm text-brand-purple-dark/70">
          {role === "solicitante"
            ? "Se for o mesmo problema, diga que também te afeta em vez de abrir outra: o PMO vê quantas pessoas e unidades ele alcança."
            : "Confira antes de registrar: pode ser o mesmo problema de uma SM em andamento."}
        </p>
      </div>
      <ul className="space-y-2">
        {found.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tabular-nums text-sm font-bold text-brand-purple-dark/60">{s.id}</span>
                <StageTag status={s.status} />
              </div>
              <p className="font-bold leading-snug text-brand-purple-dark">{s.title}</p>
              <p className="text-xs font-bold text-brand-purple-dark/60">{reachText(s)}</p>
            </div>
            {role === "solicitante" && <AffectButton s={s} role={role} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
