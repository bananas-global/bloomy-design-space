/**
 * Solicitações de melhoria — o cartão "Etapa atual" do detalhe: o que a etapa
 * pede, para quem executa. Quem não executa vê os campos desabilitados e o
 * aviso de quem executa.
 *
 * Triagem e priorização são do PMO; reunião de cenários, direcionamento,
 * modelagem e encerramento também; desenvolvimento é da Tech; a homologação
 * fecha com a validação da Tech e o aceite do solicitante.
 */
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { CheckboxGroup, RadioCards, RadioGroup, RadioSelector } from "../../components/Choice.js";
import { FileUploader } from "../../components/FileUploader.js";
import { Icon } from "../../components/Icon.js";
import { Input, SwitchCard } from "../../components/Input.js";
import { Header } from "../../components/Layout.js";
import { Tag } from "../../components/Tag.js";
import {
  CRITS, CUR_LABEL, L, OWNER, PRIO, RACI, STATUS, TAG_OF, TONE_BORDER,
  effortOf, fmt, hasWorkaround, minScore, opts, prioOf, roleLabel, routeText, scoreOf,
  type Role, type Route, type Sm,
} from "./model.js";
import { Fact, Pending, cx } from "./parts.js";
import { filesOf, sm as actions } from "./store.js";

type Props = { s: Sm; role: Role };

export function Etapa({ s, role }: Props) {
  const label = CUR_LABEL[s.status];
  if (!label) return null;
  const st = STATUS[s.status];
  const owner = OWNER[s.status];
  const waiting = owner !== "both" && owner !== role;

  return (
    <Card className={cx("space-y-6 border-t-4", TONE_BORDER[st.tone])}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-brand-purple-dark/60">Etapa atual</p>
          <Header variant="small">{label}</Header>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(RACI[s.status] ?? []).map(([k, who]) => (
            <Tag key={`${k}-${who}`} item={`${k} · ${who}`} variant={k === "R" ? "light-blue" : "dark-purple"} />
          ))}
        </div>
      </div>

      {s.status === "triagem" && <Triagem s={s} role={role} />}
      {s.status === "priorizacao" && <Priorizacao s={s} role={role} />}
      {s.status === "backlog" && <Cenarios s={s} role={role} />}
      {s.status === "cenarios" && <Direcionar s={s} role={role} />}
      {s.status === "modelagem" && <Modelagem s={s} role={role} />}
      {s.status === "execucao" && <Execucao s={s} role={role} />}
      {s.status === "homologacao" && <Homologacao s={s} role={role} />}
      {s.status === "encerramento" && <Encerramento s={s} role={role} />}

      <div className="space-y-2 border-t border-brand-purple-dark/10 pt-4">
        <p className="text-sm font-bold text-brand-purple-dark">Anexar evidência desta etapa</p>
        <p className="text-sm text-brand-purple-dark/60">Prints, vídeos, POPs, planilhas ou atas. Ficam registrados no histórico.</p>
        <FileUploader
          variant="simplified"
          upload={{ ref: "sm_stage_files", maxEntries: 10, entries: [] }}
          onChange={(files) => actions.evidence(s.id, role, filesOf(files))}
        />
      </div>

      {waiting && (
        <p className="text-sm font-bold text-brand-purple-dark/60">
          <Icon name="fa-eye" /> Você está visualizando como {roleLabel(role)}. Esta etapa é executada por {owner === "tech" ? "Tech" : "PMO"}.
        </p>
      )}
    </Card>
  );
}

const patch = (s: Sm) => (p: Partial<Sm>) => actions.patch(s.id, p);

function Triagem({ s, role }: Props) {
  const pmo = role === "pmo";
  const set = patch(s);
  const eff = effortOf(s.effort);
  const missing = [!s.rootCause.trim() && "causa raiz", !s.macro && "macroprocesso", !s.effort && "esforço"].filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      <Input type="textarea" id="sm_root_cause" rows={3} label="Causa raiz — problema real identificado *" placeholder="Distinta da solução sugerida pelo solicitante." value={s.rootCause} disabled={!pmo} onChange={(e) => set({ rootCause: e.target.value })} />
      <div className="grid gap-8 md:grid-cols-3">
        <Input type="select" id="sm_macro" label="Macroprocesso *" prompt="Selecionar" options={opts(L.macros)} value={s.macro} disabled={!pmo} onChange={(v) => set({ macro: v ?? "" })} />
        <Input type="select" id="sm_type" label="Tipo da solicitação" prompt="Selecionar" options={opts(L.types)} value={s.type} disabled={!pmo} onChange={(v) => set({ type: v ?? "" })} />
        <Input type="select" id="sm_dependency" label="Dependências" options={opts(L.deps)} value={s.dependency} disabled={!pmo} clear={false} onChange={(v) => set({ dependency: v ?? "Nenhuma" })} />
      </div>
      <div className="space-y-2">
        <RadioSelector
          label="Esforço estimado *"
          field={{ id: "sm_effort", name: "effort", value: s.effort }}
          radio={L.efforts.map(([v]) => ({ value: v, label: v, disabled: !pmo }))}
          className="inline-block"
          onChange={(e) => set({ effort: e.target.value })}
        />
        <p className="text-sm text-brand-purple-dark/60">{eff ? `Estratégia recomendada: ${eff[1]}` : "PP a GG — estimativa preliminar"}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-purple-dark/5 p-3.5">
        <Icon name="fa-comments" type="solid" className="text-purple" />
        <p className="min-w-48 flex-1 text-sm"><b>Solicitante consultado.</b> Use os comentários para esclarecer a dor antes de concluir a triagem.</p>
        {pmo && <Button type="button" variant="tint" color="purple" size="medium" onClick={() => actions.consult(s.id)}>Pedir esclarecimento</Button>}
      </div>

      {pmo ? (
        <RadioCards
          id="sm_eligibility"
          title="Resultado da triagem *"
          value={s.eligibility}
          onChange={(v) => set({ eligibility: v as Sm["eligibility"] })}
          option={[
            { id: "elegivel", title: "Demanda elegível para avaliação", subtitle: "Segue para a matriz de critérios", icon: "fa-circle-check" },
            {
              id: "inelegivel",
              title: "Demanda considerada inelegível",
              subtitle: "Registrar recusa com justificativa",
              icon: "fa-ban",
              children: (
                <div className="space-y-8">
                  <Input type="select" id="sm_reject_criterion" label="Critério de inelegibilidade *" prompt="Selecionar" options={opts(L.inelig)} value={s.rejectCriterion} onChange={(v) => set({ rejectCriterion: v ?? "" })} />
                  <Input type="textarea" id="sm_rejection" rows={3} label="Justificativa detalhada *" placeholder="Será enviada ao solicitante." value={s.rejection} onChange={(e) => set({ rejection: e.target.value })} />
                  <Button type="button" color="red" leftIcon="fa-ban" disabled={!s.rejectCriterion || !s.rejection.trim()} onClick={() => actions.reject(s.id, role)}>
                    Registrar recusa e notificar solicitante
                  </Button>
                </div>
              ),
            },
          ]}
        />
      ) : (
        <Fact label="Resultado da triagem">{s.eligibility === "elegivel" ? "Elegível" : s.eligibility === "inelegivel" ? "Inelegível" : "Em análise pelo PMO"}</Fact>
      )}

      {s.eligibility === "elegivel" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Pending missing={missing} ready="Triagem pronta." />
          {pmo && (
            <Button type="button" rightIcon="fa-arrow-right" disabled={missing.length > 0} onClick={() => actions.finishTriage(s.id, role)}>
              Concluir triagem · seguir para a matriz
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Priorizacao({ s, role }: Props) {
  const pmo = role === "pmo";
  const set = patch(s);
  const p = prioOf(s);
  const missing = s.p0 && (!s.p0Reason || !s.p0Just.trim()) ? ["motivo e justificativa P0"] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-brand-purple-dark/5 p-4">
        <p className="max-w-sm text-sm font-bold text-brand-purple-dark/60">Notas de 0 a 5 com consulta ao solicitante e à Tech. Score e prioridade são gerados juntos.</p>
        <div className="flex items-center gap-3">
          <span className="tabular-nums text-3xl font-black leading-none text-brand-purple-dark">{fmt(scoreOf(s))}</span>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-brand-purple-dark/60">de 100 pontos</span>
            {p && <Tag item={PRIO[p].full} variant={TAG_OF[PRIO[p].tone]} />}
          </div>
        </div>
      </div>

      {hasWorkaround(s) && (
        <p className="flex gap-2 text-sm font-bold text-orange-dark">
          <Icon name="fa-circle-info" type="solid" className="mt-0.5" />
          Há contorno operacional relatado: Impacto e Risco têm nota mínima 3.
        </p>
      )}

      <div className="divide-y divide-brand-purple-dark/10">
        {CRITS.map((c) => {
          const v = s.scores?.[c.key] ?? 0;
          const min = minScore(s, c.key);
          return (
            <div key={c.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
              <div className="min-w-48">
                <p className="text-sm font-bold text-brand-purple-dark">
                  {c.label} <span className="text-xs font-extrabold text-brand-purple-dark/60">· peso {Math.round(c.w * 100)}%</span>
                </p>
                <p className="text-xs text-brand-purple-dark/60">{v} — {c.rub[v]}</p>
              </div>
              <div className="flex items-center gap-3">
                <RadioSelector
                  field={{ id: `sm_score_${c.key}`, name: `score_${c.key}`, value: String(v) }}
                  radio={[0, 1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n), disabled: !pmo || n < min }))}
                  onChange={(e) => set({ scores: { ...(s.scores ?? { impact: 0, risk: 0, urgency: 0, reach: 0, alignment: 0 }), [c.key]: Number(e.target.value) } })}
                />
                <span className="w-11 text-right tabular-nums text-sm font-bold text-brand-purple-dark">{fmt(v * c.w * 20)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {pmo ? (
        <div className="space-y-4">
          <SwitchCard
            field={{ id: "sm_p0", name: "p0", value: s.p0 }}
            title="Exceção mandatória P0"
            description="Sobrepõe o score. Exige motivo e justificativa para auditoria."
            onChange={(e) => set({ p0: e.target.checked })}
          />
          {s.p0 && (
            <div className="grid gap-8 md:grid-cols-2">
              <Input type="select" id="sm_p0_reason" label="Motivo *" prompt="Selecionar" options={opts(L.p0Reasons)} value={s.p0Reason} onChange={(v) => set({ p0Reason: v ?? "" })} />
              <Input id="sm_p0_just" label="Justificativa *" value={s.p0Just} onChange={(e) => set({ p0Just: e.target.value })} />
            </div>
          )}
        </div>
      ) : (
        s.p0 && <Fact label="Exceção mandatória P0">{s.p0Reason} — {s.p0Just}</Fact>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Pending missing={missing} ready="Score e prioridade gerados." />
        {pmo && (
          <Button type="button" leftIcon="fa-floppy-disk" disabled={missing.length > 0} onClick={() => actions.saveBacklog(s.id, role)}>
            Salvar na base de backlog
          </Button>
        )}
      </div>
    </div>
  );
}

/** Backlog ativo: a reunião de desenho de cenários. */
function Cenarios({ s, role }: Props) {
  const pmo = role === "pmo";
  const set = patch(s);
  const missing = [!s.participants.length && "participantes", !s.rules.trim() && !s.reqs.trim() && "regras de negócio ou requisitos funcionais"].filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      <p className="text-sm text-brand-purple-dark/70">Demanda formalizada no backlog ativo. A reunião de desenho de cenários gera regras de negócio e/ou requisitos funcionais.</p>
      <div className="grid gap-8 md:grid-cols-2">
        <Input type="date" id="sm_meeting_date" label="Data da reunião" value={s.meetingDate} disabled={!pmo} onChange={(e) => set({ meetingDate: e.target.value })} />
        <CheckboxGroup
          label="Participantes consultados *"
          field={{ id: "sm_participants", name: "participants", value: s.participants }}
          checkbox={L.participants.map((v) => ({ value: v, label: v, disable: !pmo }))}
          wrapperClass="flex flex-wrap gap-2 space-x-0!"
          onChange={(e) => actions.toggle(s.id, "participants", e.target.value)}
        />
      </div>
      <CheckboxGroup
        label="Áreas de interface consultadas"
        field={{ id: "sm_interface_areas", name: "interfaceAreas", value: s.interfaceAreas }}
        checkbox={L.areas.filter((a) => a !== s.area).map((v) => ({ value: v, label: v, disable: !pmo }))}
        wrapperClass="flex flex-wrap gap-1 space-x-0!"
        onChange={(e) => actions.toggle(s.id, "interfaceAreas", e.target.value)}
      />
      <Input type="textarea" id="sm_rules" rows={4} label="Regras de negócio mapeadas" placeholder="RN-01 — ..." value={s.rules} disabled={!pmo} onChange={(e) => set({ rules: e.target.value })} />
      <Input type="textarea" id="sm_reqs" rows={4} label="Requisitos funcionais mapeados" placeholder="RF-01 — ..." value={s.reqs} disabled={!pmo} onChange={(e) => set({ reqs: e.target.value })} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Pending missing={missing} ready="Pronto para direcionamento." joiner=" e " />
        {pmo && (
          <Button type="button" leftIcon="fa-diagram-project" disabled={missing.length > 0} onClick={() => actions.finishScenarios(s.id, role)}>
            Concluir reunião de cenários
          </Button>
        )}
      </div>
    </div>
  );
}

const ROUTES: { v: Route; title: string; description: string }[] = [
  { v: "processo", title: "Processo, POP ou treinamento", description: "Modelar o processo aqui: fluxo, POP e capacitação, com evidências anexadas." },
  { v: "dev", title: "Parametrização ou desenvolvimento", description: "Parametrizar e desenvolver sistema pela Tech." },
];

/** Cenários mapeados: direcionar a demanda por um caminho ou pelos dois. */
function Direcionar({ s, role }: Props) {
  const pmo = role === "pmo";
  const proc = s.routes.includes("processo");
  const dev = s.routes.includes("dev");
  const result = !s.routes.length
    ? "Selecione um ou os dois caminhos."
    : proc
      ? dev ? "Modelagem de processo e depois desenvolvimento pela Tech." : "Segue para modelagem de processos no Aris."
      : "Segue para a Tech.";

  return (
    <div className="space-y-6">
      <p className="text-sm text-brand-purple-dark/70">Direcione conforme o tipo de solicitação. É possível seguir pelos dois caminhos ao mesmo tempo.</p>
      {pmo ? (
        <div className="grid gap-3 md:grid-cols-2">
          {ROUTES.map((r) => (
            <SwitchCard
              key={r.v}
              field={{ id: `sm_route_${r.v}`, name: "routes[]", value: s.routes.includes(r.v) }}
              title={r.title}
              description={r.description}
              onChange={() => actions.toggle(s.id, "routes", r.v)}
            />
          ))}
        </div>
      ) : (
        <Fact label="Direcionamento">{s.routes.length ? routeText(s.routes) : "Aguardando o PMO"}</Fact>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-brand-purple-dark/60">{result}</p>
        {pmo && (
          <Button type="button" leftIcon="fa-signs-post" disabled={!s.routes.length} onClick={() => actions.confirmRouting(s.id, role)}>
            Direcionar demanda
          </Button>
        )}
      </div>
    </div>
  );
}

const PROC_CHECKS: { name: "procFlow" | "procPop" | "procTraining"; title: string; description: string }[] = [
  { name: "procFlow", title: "Modelar fluxo", description: "Desenho do processo anexado como evidência" },
  { name: "procPop", title: "Construir ou atualizar POP", description: "Procedimento operacional padrão" },
  { name: "procTraining", title: "Capacitar usuários", description: "Treinamento das áreas impactadas" },
];

function Modelagem({ s, role }: Props) {
  const pmo = role === "pmo";
  const set = patch(s);
  const devToo = s.routes.includes("dev");
  const evidence = s.history.filter((h) => h.kind === s.status).reduce((a, h) => a + (h.files?.length ?? 0), 0);
  const missing = [!s.procFlow && !s.procPop && !s.procTraining && "ao menos uma entrega de processo", !s.subpath && "resultado da modelagem"].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <p className="text-sm text-brand-purple-dark/70">
        Modelagem do processo com o solicitante e as áreas de interface. Anexe o fluxo, o POP e o material de treinamento como evidências desta etapa —{" "}
        {evidence ? `${evidence} arquivo(s) anexado(s) nesta etapa` : "nenhum arquivo anexado ainda"}.
      </p>
      {pmo ? (
        <div className="grid gap-3">
          {PROC_CHECKS.map((p) => (
            <SwitchCard key={p.name} field={{ id: `sm_${p.name}`, name: p.name, value: s[p.name] }} title={p.title} description={p.description} onChange={(e) => set({ [p.name]: e.target.checked })} />
          ))}
        </div>
      ) : (
        <Fact label="Entregas de processo">{PROC_CHECKS.filter((p) => s[p.name]).map((p) => p.title).join(", ") || "Nenhuma ainda"}</Fact>
      )}
      <div className="space-y-2">
        <RadioGroup
          label="Resultado da modelagem *"
          field={{ id: "sm_subpath", name: "subpath", value: s.subpath }}
          radio={[
            { value: "sem", label: "Processo implementado sem desenvolvimento", disabled: !pmo || devToo },
            { value: "com", label: "Processo implementado com desenvolvimento", disabled: !pmo },
          ]}
          onChange={(e) => set({ subpath: e.target.value as Sm["subpath"] })}
        />
        <p className="text-sm text-brand-purple-dark/60">
          {devToo
            ? "A demanda também foi direcionada para desenvolvimento, então segue para a Tech."
            : "Sem desenvolvimento vai direto para o registro de ganhos. Com desenvolvimento segue para a Tech."}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Pending missing={missing} ready="Modelagem pronta." joiner=" e " />
        {pmo && (
          <Button type="button" leftIcon="fa-sitemap" disabled={missing.length > 0} onClick={() => actions.finishModeling(s.id, role)}>
            Concluir modelagem
          </Button>
        )}
      </div>
    </div>
  );
}

function Execucao({ s, role }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-brand-purple-dark/70">
        {s.routes.includes("processo")
          ? "Processo implementado com desenvolvimento. Parametrizar e desenvolver o sistema com base nas regras e requisitos mapeados."
          : "Parametrizar e desenvolver o sistema com base nas regras e requisitos mapeados no desenho de cenários."}
      </p>
      {role === "tech" ? (
        <Button type="button" leftIcon="fa-rocket" onClick={() => actions.markDeployed(s.id, role)}>
          Funcionalidade implementada em homologação
        </Button>
      ) : (
        <p className="font-bold text-brand-purple-dark"><Icon name="fa-hourglass-half" /> Aguardando a Tech.</p>
      )}
    </div>
  );
}

function Homologacao({ s, role }: Props) {
  const steps = [
    { field: "homologTech" as const, title: "Validação da Tech", sub: "Resultado prático verificado em produção.", cta: "Validar entrega", done: s.homologTech, can: role === "tech" },
    { field: "homologReq" as const, title: "Aceite do solicitante", sub: "Teste assistido com o solicitante confirma que a dor foi resolvida.", cta: "Confirmar aceite", done: s.homologReq, can: role === "solicitante" || role === "pmo" },
  ];
  return (
    <div className="space-y-4">
      <p className="text-brand-purple-dark/70">Teste assistido em produção. A etapa fecha quando a Tech valida a entrega e o solicitante confirma o aceite.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {steps.map((h) => (
          <div key={h.field} className={cx("space-y-2.5 rounded-xl border-2 p-4", h.done ? "border-green bg-green-light" : "border-neutral-100 bg-white")}>
            <p className="flex items-center gap-2.5 font-bold text-brand-purple-dark">
              <Icon name={h.done ? "fa-circle-check" : "fa-circle"} type="solid" className={h.done ? "text-green" : "text-neutral-300"} />
              {h.title}
            </p>
            <p className="text-sm text-brand-purple-dark/60">{h.done ? "Confirmado." : h.sub}</p>
            {!h.done && h.can && (
              <Button type="button" color="green" size="medium" leftIcon="fa-check" onClick={() => actions.homolog(s.id, role, h.field)}>
                {h.cta}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Encerramento({ s, role }: Props) {
  const pmo = role === "pmo";
  const set = patch(s);
  const devToo = s.routes.includes("dev");
  const intro =
    s.subpath === "sem" && !devToo
      ? "Processo implementado sem desenvolvimento"
      : `Entrega homologada em produção por ${s.homologatedBy || "Tech e solicitante"}${s.homologatedAt ? ` em ${s.homologatedAt}` : ""}`;

  return (
    <div className="space-y-8">
      <p className="flex items-center gap-2.5 rounded-xl bg-green-light p-3.5 text-sm font-bold text-green-dark">
        <Icon name="fa-circle-check" type="solid" />
        {intro}
      </p>
      <div className="grid gap-8 md:grid-cols-2">
        <Input type="select" id="sm_gain_type" label="Tipo de ganho *" prompt="Selecionar" options={opts(L.gains)} value={s.gainType} disabled={!pmo} onChange={(v) => set({ gainType: v ?? "" })} />
        <Input type="number" id="sm_gain_hours" label="Horas economizadas por mês" min={0} value={s.gainHours} disabled={!pmo} onChange={(e) => set({ gainHours: e.target.value })} />
      </div>
      <Input type="textarea" id="sm_gain_desc" rows={2} label="Descrição do valor gerado *" placeholder="Ex.: Eliminou a conferência manual de guias na recepção." value={s.gainDesc} disabled={!pmo} onChange={(e) => set({ gainDesc: e.target.value })} />
      {pmo && (
        <Button type="button" leftIcon="fa-flag-checkered" disabled={!s.gainType || !s.gainDesc.trim()} onClick={() => actions.close(s.id, role)}>
          Atualizar status e encerrar ciclo
        </Button>
      )}
    </div>
  );
}
