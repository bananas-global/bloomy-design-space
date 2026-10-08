/**
 * Solicitações de melhoria — o detalhe de uma SM: a etapa atual (o que fazer
 * agora), a governança registrada até aqui, as 16 respostas do formulário, o
 * fluxo oficial com o caminho que a SM tomou, e o histórico com os
 * comentários.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Header, TimelineList, type TimelineListItem } from "../../components/Layout.js";
import { Tag } from "../../components/Tag.js";
import { Etapa } from "./Etapa.js";
import {
  CRITS, ORDER, STATUS, USERS, effortOf, isoToBR, prioOf, routeText, sortKey, stageIndex,
  type Role, type Sm, type SmFile,
} from "./model.js";
import { Answer, Fact, FileList, PrioTag, SmUploader, StageTag } from "./parts.js";
import { sm as actions } from "./store.js";

export function Detalhe({ s, role, onBack }: { s: Sm; role: Role; onBack: () => void }) {
  const idx = stageIndex(s);
  const canCancel = role === "solicitante" && s.requester === USERS.solicitante.name && ["triagem", "priorizacao"].includes(s.status);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="ghost" size="medium" leftIcon="fa-arrow-left" onClick={onBack}>Voltar</Button>
          {canCancel && (
            <Button type="button" variant="tint" color="red" size="medium" leftIcon="fa-xmark" onClick={() => actions.cancel(s.id, role)}>
              Cancelar minha solicitação
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="tabular-nums text-lg font-bold text-brand-purple-dark/60">{s.id}</span>
          <StageTag status={s.status} />
          {prioOf(s) && <PrioTag sm={s} full />}
          {s.p0 && <Tag item="Exceção mandatória" variant="red" leftIcon="fa-triangle-exclamation" />}
        </div>
        <Header variant="large" subtitle={`${s.requester} · ${s.area} · ${s.unit} · aberta em ${s.createdAt}`}>{s.title}</Header>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <Etapa s={s} role={role} />
          <Desfecho s={s} />
          {(idx >= 2 || s.status === "rejeitada") && <Governanca s={s} />}
          <Respostas s={s} />
        </div>

        <aside className="space-y-6">
          <Card className="space-y-4">
            <Header variant="small">Fluxo da SM</Header>
            <div className="pl-4">
              <TimelineList item={flowOf(s)} />
            </div>
          </Card>
          <Historico s={s} role={role} />
        </aside>
      </div>
    </div>
  );
}

/** O fim do ciclo: concluída, cancelada ou recusada. */
function Desfecho({ s }: { s: Sm }) {
  const gain = [s.gainType, s.gainHours ? `${s.gainHours} h/mês` : "", s.gainDesc].filter(Boolean).join(" · ");
  const banner = {
    concluida: { cls: "bg-green-light text-green-dark", icon: "fa-flag-checkered", title: `Ciclo de SM encerrado em ${s.closedAt} · valor capturado no KPI executivo`, text: gain },
    cancelada: { cls: "bg-brand-purple-dark/6 text-brand-purple-dark", icon: "fa-circle-xmark", title: `Cancelada pelo solicitante em ${s.closedAt}`, text: "A solicitação foi retirada do fluxo antes da aprovação para o backlog." },
    rejeitada: { cls: "bg-red-light text-red-dark", icon: "fa-ban", title: `Demanda inelegível · ${s.rejectCriterion}`, text: s.rejection },
  }[s.status as "concluida" | "cancelada" | "rejeitada"];
  if (!banner) return null;
  return (
    <div className={`flex items-start gap-4 rounded-2xl px-6 py-5 ${banner.cls}`}>
      <Icon name={banner.icon} type="solid" className="mt-0.5 text-2xl" />
      <div className="space-y-1">
        <p className="font-bold">{banner.title}</p>
        <p className="text-sm">{banner.text}</p>
      </div>
    </div>
  );
}

function Governanca({ s }: { s: Sm }) {
  const idx = stageIndex(s);
  const eff = effortOf(s.effort);
  const dir = s.routes.length
    ? routeText(s.routes) + (s.routes.includes("processo") && s.subpath ? (s.subpath === "sem" ? " · sem desenvolvimento" : " · com desenvolvimento") : "")
    : "—";
  const facts: [string, string][] = [
    ["Macroprocesso", s.macro || "—"],
    ["Tipo", s.type || "—"],
    ["Esforço", s.effort ? `${s.effort}${eff ? ` · ${eff[1]}` : ""}` : "—"],
    ["Dependências", s.dependency || "—"],
    ["Direcionamento", dir],
    ["Áreas de interface", s.interfaceAreas.length ? s.interfaceAreas.join(", ") : "—"],
    ...(s.p0 ? ([["Exceção P0", `${s.p0Reason} — ${s.p0Just}`]] as [string, string][]) : []),
    ...(s.meetingDate ? ([["Reunião de cenários", isoToBR(s.meetingDate)]] as [string, string][]) : []),
  ];

  return (
    <Card className="space-y-6">
      <Header variant="small">Governança</Header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(([k, v]) => <Fact key={k} label={k}>{v}</Fact>)}
      </div>
      <Answer label="Causa raiz">{s.rootCause || "—"}</Answer>
      {idx >= 2 && s.scores && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {CRITS.map((c) => (
            <div key={c.key} className="rounded-lg bg-brand-purple-dark/5 px-3 py-2.5">
              <p className="text-xs font-bold text-brand-purple-dark/60">{c.label} · {Math.round(c.w * 100)}%</p>
              <p className="tabular-nums font-bold text-brand-purple-dark">{s.scores![c.key]}/5</p>
            </div>
          ))}
        </div>
      )}
      {idx >= 3 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Answer label="Regras de negócio">{s.rules || "—"}</Answer>
          <Answer label="Requisitos funcionais">{s.reqs || "—"}</Answer>
        </div>
      )}
    </Card>
  );
}

function Respostas({ s }: { s: Sm }) {
  const answers: [string, string][] = [
    ["O que você precisa?", s.need],
    ["O que acontece hoje?", s.asIs],
    ["Como você contorna hoje?", s.workaround],
    ["O que você espera que aconteça?", s.expected],
    ["Consequência de não atender", s.consequence],
  ];
  const facts: [string, string][] = [
    ["Quem é impactado", s.audience],
    ["Frequência", s.frequency],
    ["Principal impacto", s.impactType],
    ["Prazo limite", s.hasDeadline === "Sim" ? s.deadline : "Não"],
    ["Contato", s.contact || "—"],
    ["Links de apoio", s.attachments || "—"],
    ["Apoios", String(s.votes)],
  ];

  return (
    <Card className="space-y-6">
      <Header variant="small">Solicitação · 16 perguntas</Header>
      {answers.map(([k, v]) => <Answer key={k} label={k}>{v}</Answer>)}
      <div className="space-y-2">
        <p className="text-xs font-black text-brand-purple-dark/60">Anexos da solicitação · {s.files.length}</p>
        {s.files.length ? <FileList files={s.files} /> : <p className="text-sm text-brand-purple-dark/60">Nenhum arquivo anexado.</p>}
      </div>
      <div className="grid gap-4 border-t border-brand-purple-dark/10 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(([k, v]) => <Fact key={k} label={k}>{v}</Fact>)}
      </div>
    </Card>
  );
}

/* ============================================================
   Fluxo oficial (EPC "Gerenciar e Implementar SM")
   ============================================================ */

/** Cada passo do fluxo, com a posição em `ORDER` em que ele acontece (`at`). */
const FLOW = [
  { key: "f1", at: -1, label: "Preencher solicitação de SM", raci: "R Solicitante · 16 perguntas", event: "Solicitação recebida pela governança", icon: "fa-pen-to-square" },
  { key: "f2", at: -1, label: "Registrar na base de SMs", raci: "Automático · PMO notificado", event: "Dados registrados na base", icon: "fa-database" },
  { key: "f3", at: 0, label: "Realizar análise de triagem preliminar", raci: "R PMO · C Solicitante", event: "Análise de triagem preliminar concluída", icon: "fa-magnifying-glass" },
  { key: "rej", at: 0, label: "Registrar recusa com justificativa", raci: "R PMO · Critérios de inelegibilidade", event: "Solicitante notificado com motivo de recusa", icon: "fa-ban" },
  { key: "f4", at: 1, label: "Atribuir notas na matriz de critérios", raci: "R PMO · C Solicitante · C Tech", event: "Score 0–100 e prioridade P0–P4 gerados", icon: "fa-ranking-star" },
  { key: "f5", at: 1.5, label: "Aprovar para o backlog", raci: "R PMO", event: "Backlog ativo · KPIs recalculados", icon: "fa-floppy-disk" },
  { key: "f6", at: 2, label: "Realizar reunião de desenho de cenários", raci: "R PMO · C Solicitante · C Áreas de interface · C Tech", event: "Regras e/ou requisitos mapeados", icon: "fa-diagram-project" },
  { key: "f7", at: 3, label: "Direcionar demanda conforme tipo", raci: "R PMO", event: "", icon: "fa-signs-post" },
  { key: "f8", at: 4, label: "Modelar processo, POP e treinamento", raci: "R PMO · R Solicitante · C Áreas de interface", event: "", icon: "fa-sitemap" },
  { key: "f9", at: 5, label: "Parametrizar e desenvolver sistema", raci: "R Tech", event: "Funcionalidade implementada em homologação", icon: "fa-code" },
  { key: "f10", at: 6, label: "Homologar resultado prático em produção", raci: "R Tech · Aceite do Solicitante", event: "Entrega homologada em produção", icon: "fa-clipboard-check" },
  { key: "f11", at: 7, label: "Atualizar status da SM e registrar ganhos", raci: "R PMO", event: "Ciclo encerrado · valor capturado no KPI", icon: "fa-chart-line" },
];

/**
 * Os passos com o estado de cada um: feito (verde, com o evento que gerou),
 * atual (azul), por fazer e "não se aplica neste caminho" (riscado).
 */
function flowOf(s: Sm): TimelineListItem[] {
  const rej = s.status === "rejeitada";
  const idx = stageIndex(s);
  const decided = idx > ORDER.indexOf("cenarios");
  const proc = s.routes.includes("processo");
  const dev = s.routes.includes("dev");
  const noDev = decided && proc && !dev && s.subpath === "sem" && idx > ORDER.indexOf("modelagem");
  const events: Record<string, string> = {
    f7: s.routes.length ? routeText(s.routes) : "Processo/POP/Treinamento e/ou Parametrização/Desenvolvimento",
    f8: s.subpath === "sem" ? "Processo implementado sem desenvolvimento" : s.subpath === "com" ? "Processo implementado com desenvolvimento" : "Processo implementado sem ou com desenvolvimento",
  };

  return FLOW.filter((f) => (rej ? ["f1", "f2", "f3", "rej"].includes(f.key) : f.key !== "rej")).map((f) => {
    let state: "done" | "cur" | "todo" | "rej" = f.at < idx ? "done" : f.at === idx ? "cur" : "todo";
    if (f.key === "f5") state = idx > 1 ? "done" : "todo";
    if (f.key === "rej") state = "rej";
    if (rej && f.key === "f3") state = "done";
    const skip = (decided && f.key === "f8" && !proc) || ((f.key === "f9" || f.key === "f10") && noDev);
    if (s.status === "concluida" && !skip) state = "done";
    const event = events[f.key] || f.event;
    const showEvent = !skip && (state === "done" || state === "rej") && !!event;

    return {
      icon: skip ? f.icon : state === "done" ? "fa-check" : f.icon,
      color: skip ? undefined : state === "done" ? "green" : state === "cur" ? "blue" : undefined,
      children: (
        <div className={skip || state === "todo" ? "opacity-60" : undefined}>
          <p className={`text-sm font-bold leading-tight ${state === "rej" ? "text-red-dark" : "text-brand-purple-dark"} ${skip ? "line-through" : ""}`}>{f.label}</p>
          <p className="mt-0.5 text-xs font-bold text-brand-purple-dark/60">{skip ? "Não se aplica neste caminho" : f.raci}</p>
          {showEvent && <Tag item={event} variant="orange" leftIcon="fa-bolt" className="mt-1.5 text-xs" />}
        </div>
      ),
    };
  });
}

/* ============================================================
   Histórico e comentários
   ============================================================ */

function Historico({ s, role }: { s: Sm; role: Role }) {
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<SmFile[]>([]);
  const empty = !draft.trim() && !files.length;

  const entries = [
    ...s.history.map((h, i) => ({ ...h, comment: false, key: sortKey(h.at, i) })),
    ...s.comments.map((c, i) => ({ ...c, kind: "comment" as const, comment: true, key: sortKey(c.at, i) })),
  ].sort((a, b) => b.key - a.key);

  const items: TimelineListItem[] = entries.map((h) => ({
    icon: h.comment ? "fa-comment" : h.files?.length ? "fa-paperclip" : STATUS[h.kind as keyof typeof STATUS].icon,
    color: h.comment ? undefined : "blue",
    children: (
      <div className="space-y-1.5">
        <div className="flex justify-between gap-2 text-xs font-bold text-brand-purple-dark/60">
          <span>{h.who}</span>
          <span>{h.at}</span>
        </div>
        {h.text && <p className={h.comment ? "rounded-lg bg-brand-purple-dark/5 px-2.5 py-2 text-sm" : "text-sm font-semibold text-brand-purple-dark"}>{h.text}</p>}
        {h.files && <FileList files={h.files} />}
      </div>
    ),
  }));

  function send() {
    if (empty) return;
    actions.comment(s.id, role, draft.trim(), files);
    setDraft("");
    setFiles([]);
  }

  return (
    <Card className="space-y-4">
      <Header variant="small">Histórico e comentários</Header>
      <Input type="textarea" id="sm_comment" name="comment" rows={3} placeholder="Escreva um comentário ou resposta" value={draft} onChange={(e) => setDraft(e.target.value)} />
      <SmUploader id="sm_comment_files" variant="simplified" files={files} onChange={setFiles} />
      <div className="flex justify-end">
        <Button type="button" variant="tint" size="medium" disabled={empty} onClick={send}>Comentar</Button>
      </div>
      <div className="pt-4 pl-4">
        <TimelineList item={items} />
      </div>
    </Card>
  );
}
