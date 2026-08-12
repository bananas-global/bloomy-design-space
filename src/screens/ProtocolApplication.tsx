import { useMemo, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type { Protocol, ProtocolArea, ProtocolExecutionData, ProtocolQuestion } from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Button, EmptyState, ErrorState, LoadingState, Notice } from "../components/primitives.js";
import { Icon } from "../components/Icon.js";
import { answerControl, areaProgress, canApplyProtocol, completion, daysUntilReassessment, isAnswered, isComplete, nextUnanswered } from "../rules/protocols.js";

/** Espelho da aplicação de protocolo do monólito: navegador de áreas à
 * esquerda e uma questão por vez à direita. A regra continua sendo local; a
 * anatomia vem de `ProtocolsLive.Components.PatientProtocol`. */
export function ProtocolApplication({ context }: ScreenProps) {
  const { data, isLoading, error, locale, permissions } = context;
  if (isLoading) return wrap(context, <LoadingState label="Carregando a aplicação" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);
  if (!canApplyProtocol(permissions).allowed) return wrap(context, <EmptyState title="Você não tem acesso a protocolos" description="A aplicação de protocolo é visível para coordenação, admin de clínica, admin, terapeuta e especialista. Fale com quem administra os acessos da unidade." />);
  const executionData = data as ProtocolExecutionData | null;
  if (!executionData) return wrap(context, <EmptyState title="Aplicação não encontrada" description="A avaliação pode ter sido descartada. Volte ao paciente para ver as aplicações registradas." />);
  return wrap(context, <Workspace executionData={executionData} locale={locale} />, executionData);
}

function Workspace({ executionData, locale }: { executionData: ProtocolExecutionData; locale?: string }) {
  const { execution } = executionData;
  const { protocol } = execution;
  const questions = useMemo(() => [...protocol.areas].sort((a,b) => a.position-b.position).flatMap((area) => [...area.questions].sort((a,b) => a.position-b.position)), [protocol]);
  const initial = questions.find((item) => item.id === execution.currentQuestionId) ?? questions[0];
  const [questionId, setQuestionId] = useState(initial?.id);
  const [view, setView] = useState<"question" | "list">("question");
  const current = questions.find((item) => item.id === questionId) ?? questions[0];
  const currentArea = protocol.areas.find((area) => area.questions.some((item) => item.id === current?.id));
  const total = completion(protocol);
  const resume = nextUnanswered(protocol, execution.currentQuestionId);
  const finished = isComplete(protocol);
  const days = daysUntilReassessment(execution);
  const index = Math.max(0, questions.findIndex((item) => item.id === current?.id));
  const move = (by: number) => setQuestionId(questions[Math.max(0, Math.min(questions.length - 1, index + by))]?.id);

  return <div className="pb-20">
    {execution.finishedAt && days !== undefined && <Notice tone={days < 0 ? "danger" : "info"} title={days < 0 ? `Reavaliação atrasada em ${Math.abs(days)} ${Math.abs(days) === 1 ? "dia" : "dias"}` : "Próxima reavaliação"}>O instrumento pede reavaliação a cada {protocol.nextReassessmentInMonths} meses. Esta aplicação fechou em {formatDate(execution.finishedAt, locale)}, então a próxima cai em {formatDate(`${execution.reassessmentDate}T00:00:00.000-03:00`, locale)}. O intervalo é do instrumento, não escolha de quem aplica.</Notice>}
    <div className="mt-4 flex flex-wrap items-start gap-6 lg:h-[calc(100dvh-12rem)] lg:flex-nowrap lg:items-stretch">
      <aside className="w-full rounded-2xl bg-white shadow-main lg:flex lg:h-full lg:max-w-sm lg:flex-col" aria-label="Áreas do protocolo">
        <div className="border-b border-[var(--border-soft)] px-6 py-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-blue)]/20 text-[var(--color-brand-blue-dark)]"><Icon name="fa-clipboard-check" /></span><h1 className="m-0 truncate text-base font-black text-navy">{protocol.name}</h1></div>
            <div className="flex rounded-lg bg-[var(--color-ink-50)] p-1" aria-label="Modo de visualização"><ViewButton active={view === "question"} label="Questão" icon="fa-grid" onClick={() => setView("question")} /><ViewButton active={view === "list"} label="Lista" icon="fa-list" onClick={() => setView("list")} /></div>
          </div>
          <div className="mb-2 flex items-baseline justify-between"><p className="m-0 text-xs font-bold uppercase text-[var(--fg-2)]">Progresso</p><p className="m-0 text-sm font-extrabold text-navy">{total.percent}%</p></div>
          <div className="h-2 overflow-hidden rounded bg-blue-light"><div className="h-full rounded bg-blue" style={{ width: `${total.percent}%` }} /></div>
          <p className="m-0 mt-3 text-xs text-[var(--fg-2)]">{total.answered} de {total.total} itens respondidos — {total.percent}% do instrumento preenchido</p>
          <p className="m-0 mt-1 text-xs text-[var(--fg-2)]">É medida de preenchimento, não de desempenho do paciente.</p>
          {resume && !finished && <><Button id="retomar" variant="primary" className="mt-4" onClick={() => setQuestionId(resume.id)}>Retomar em {resume.code}</Button><p className="m-0 mt-1.5 text-xs text-[var(--fg-2)]">Retomar busca a área atual primeiro, depois nas seguintes.</p></>}
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-5">{[...protocol.areas].sort((a,b) => a.position-b.position).map((area) => <AreaItem key={area.id} area={area} selected={area.id === currentArea?.id} onSelect={() => setQuestionId(area.questions[0]?.id)} />)}</div>
      </aside>
      <section className="min-h-[28rem] flex-1 overflow-y-auto rounded-2xl bg-white px-6 py-6 shadow-main" aria-label={view === "question" ? "Questão em foco" : "Questões da área"}>
        {finished && <Notice tone="ok" title="Aplicação concluída" level={2}>Todos os itens foram respondidos.</Notice>}
        {currentArea && current && view === "question" ? <QuestionFocus question={current} protocol={protocol} onPrevious={() => move(-1)} onNext={() => move(1)} previousDisabled={index === 0} nextDisabled={index === questions.length - 1} /> : currentArea ? <AreaOverview area={currentArea} onSelect={(id) => { setQuestionId(id); setView("question"); }} /> : <EmptyState title="Protocolo sem questões" description="Este instrumento ainda não possui itens configurados." />}
      </section>
    </div>
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-soft)] bg-white/95 px-4 py-3 lg:px-8"><Button variant="secondary" onClick={() => history.back()}><Icon name="fa-arrow-left" /> Voltar</Button></footer>
  </div>;
}

function ViewButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: string; onClick: () => void }) {
  return <button type="button" aria-label={label} aria-pressed={active} onClick={onClick} className={`flex h-8 w-8 items-center justify-center rounded-md ${active ? "bg-white text-action shadow-sm" : "text-[var(--fg-2)]"}`}><Icon name={icon} /></button>;
}

function AreaItem({ area, selected, onSelect }: { area: ProtocolArea; selected: boolean; onSelect: () => void }) {
  const progress = areaProgress(area);
  const match = area.orientation.match(/^([A-Z])\s*[—-]\s*(.+)$/);
  const code = match?.[1] ?? area.questions[0]?.code.replace(/\d+$/, "") ?? "—";
  return <button type="button" onClick={onSelect} aria-current={selected ? "true" : undefined} className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left hover:bg-[var(--color-ink-50)] ${selected ? "border-[var(--color-brand-blue)] bg-[var(--color-brand-blue)]/10" : "border-transparent"}`}><span className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-[var(--color-brand-blue)]/20 font-bold text-[var(--color-brand-blue-dark)]">{code}</span><span className="min-w-0 flex-1"><span className="block truncate text-base font-extrabold text-navy">{match?.[2] ?? area.orientation}</span><span className="block text-sm text-[var(--fg-2)]">{progress.answered}/{progress.total} respondidas</span><span className="sr-only">{progress.answered} de {progress.total} respondidos nesta área — {progress.percent}%</span></span></button>;
}

function QuestionFocus({ question, protocol, onPrevious, onNext, previousDisabled, nextDisabled }: { question: ProtocolQuestion; protocol: Protocol; onPrevious: () => void; onNext: () => void; previousDisabled: boolean; nextDisabled: boolean }) {
  const control = answerControl(protocol, question);
  const options = control?.kind === "scale" ? control.options.map((item) => ({ value: item.value, label: item.name })) : control?.kind === "range" ? Array.from({ length: control.max-control.min+1 }, (_, i) => ({ value: control.min+i, label: question.criteria })) : [];
  return <div><div className="mb-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-2"><span className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-[var(--color-ink-50)] px-2 font-bold text-[var(--fg-2)]">{question.code}</span><h2 className="m-0 text-lg font-extrabold text-navy lg:text-base">{question.name}</h2><div className="ml-auto flex items-center gap-2"><Button variant="secondary" aria-label="Observação"><Icon name="fa-messages" /></Button><Button variant="secondary" aria-label="Questão anterior" disabled={previousDisabled} onClick={onPrevious}><Icon name="fa-chevron-up" /></Button><Button variant="secondary" aria-label="Próxima questão" disabled={nextDisabled} onClick={onNext}><Icon name="fa-chevron-down" /></Button></div></div><div className="w-full overflow-hidden lg:pl-12"><p className="m-0 mb-4 text-lg text-[var(--fg-2)]">{question.question}</p>{question.objective && <p className="m-0 mb-4 text-sm text-[var(--fg-2)]">{question.objective}</p>}{question.example && <p className="m-0 mb-4 rounded-lg bg-[var(--color-ink-50)] p-1.5 text-sm text-[var(--fg-2)]">{question.example}</p>}{!control ? <p role="alert" className="text-danger-fg">Este item não tem escala nem faixa configurada.</p> : <fieldset className="m-0 space-y-2 border-0 p-0"><legend className="sr-only">{control.kind === "scale" ? "Resposta — escala do protocolo" : `Resposta — faixa de ${control.min} a ${control.max}, própria deste item`}</legend>{options.map((option) => { const chosen = question.answer?.value === option.value; return <button type="button" key={option.value} className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left ${chosen ? "border-[var(--color-brand-purple-dark)] bg-[var(--color-brand-purple-dark)] text-white" : "border-[var(--color-brand-blue)]/40 bg-[var(--color-brand-blue)]/10 text-navy"}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold ${chosen ? "bg-white text-[var(--color-brand-purple-dark)]" : "bg-[var(--color-brand-purple-dark)] text-white"}`}>{option.value}</span><span className="text-sm md:text-base">{option.label}</span></button>; })}{!question.answer && control.kind === "range" && <p className="m-0 text-sm text-[var(--fg-2)]">sem pontuação registrada</p>}</fieldset>}</div></div>;
}

function AreaOverview({ area, onSelect }: { area: ProtocolArea; onSelect: (id: string) => void }) {
  const progress = areaProgress(area);
  return <div><div className="mb-4 flex items-center gap-2"><span className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-[var(--color-brand-blue)]/20 font-bold text-[var(--color-brand-blue-dark)]">{area.questions[0]?.code.replace(/\d+$/, "")}</span><div><h2 className="m-0 text-base font-extrabold text-navy">{area.orientation}</h2><p className="m-0 text-sm text-[var(--fg-2)]">{progress.answered}/{progress.total} respondidas</p></div></div><div className="flex flex-wrap gap-2 lg:pl-12">{area.questions.map((question) => <button type="button" key={question.id} onClick={() => onSelect(question.id)} className={`flex h-14 min-w-24 items-center justify-between gap-2 rounded-xl border px-2 ${isAnswered(question) ? "border-[var(--border-soft)] opacity-60" : "border-[var(--color-brand-blue)]"}`}><span className="rounded-lg bg-[var(--color-ink-50)] px-2 py-2 font-bold text-[var(--fg-2)]">{question.code}</span>{question.answer && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-blue)] font-bold text-white">{question.answer.value}</span>}</button>)}</div></div>;
}

function wrap(context: ScreenProps["context"], children: React.ReactNode, executionData?: ProtocolExecutionData | null) {
  return <AppShell context={context} title={executionData?.execution.patient.name ?? "Aplicação de protocolo"} subtitle={executionData?.execution.protocol.name} breadcrumb={[{ label: "Pacientes", path: "/patients" }, { label: executionData?.execution.patient.name ?? "Paciente" }, { label: executionData?.execution.protocol.name ?? "Protocolo" }]} showPageHeading={false}>{children}</AppShell>;
}
