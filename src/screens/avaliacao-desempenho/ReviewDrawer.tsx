/**
 * Avaliação de desempenho — o drawer da ficha do profissional. Novo, ainda não
 * existe no Phoenix: segue o drawer de acompanhamento periódico do paciente
 * (`periodic_monitorings/periodic_monitoring_drawer.ex`), com os mesmos estados
 * `list`, `new`, `view` e `edit`.
 *
 * A avaliação tem 12 itens em dois eixos (técnico e comportamental) na escala
 * de 1 a 4, e uma devolutiva: pontos fortes, pontos a desenvolver, plano de
 * ação (obrigatório em Em desenvolvimento e Plano de ação) e se ela já foi
 * conversada com o profissional.
 */
import { useRef, useState, type ReactNode } from "react";
import { Breadcrumbs } from "../../components/BackofficeComponents.js";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { FieldError, Input, Label } from "../../components/Input.js";
import { Avatar, InsideCard, Progress } from "../../components/Layout.js";
import { DrawerModal } from "../../components/Overlay.js";
import { Tag } from "../../components/Tag.js";
import {
  DIMENSIONS,
  LEVELS,
  MAX_POINTS,
  OPTIONS,
  QUESTIONS,
  ROLE_LABELS,
  optionOf,
  planRequired,
  scoreOf,
  type Answers,
  type Dimension,
  type Feedback,
  type Level,
  type Result,
  type Review,
  type ReviewPolicy,
  type Score,
} from "./model.js";

export type DrawerView = { kind: "list" } | { kind: "new" } | { kind: "view"; id: string } | { kind: "edit"; id: string };

export type ReviewInput = { answers: Answers; feedback: Feedback };

export function LevelTag({ level, prefix = "" }: { level: Level; prefix?: string }) {
  const m = LEVELS[level];
  return <Tag item={`${prefix}${m.label}`} variant={m.tag} pill icon="fa-solid fa-clipboard-check" />;
}

/** Rodapé fixo no fim do conteúdo do drawer. */
function Footer({ children, between = false }: { children: ReactNode; between?: boolean }) {
  return (
    <div
      className={[
        // O sticky respeita o `p-6` do conteúdo do drawer: `-bottom-6` cola no fundo.
        "sticky -bottom-6 -mx-6 -mb-6 mt-auto flex items-center gap-3 border-t border-neutral-100 bg-white px-6 py-4",
        between ? "justify-between" : "justify-end",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/** Avaliador e ciclo, como no item da lista do acompanhamento periódico. */
function Who({ item, trailing }: { item: Review; trailing?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar imageUrl={item.author.avatarUrl} size="medium" />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">{ROLE_LABELS[item.author.role] ?? "-"}</p>
          <p className="truncate font-bold text-brand-purple-dark">{item.author.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-right shrink-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Ciclo</p>
          <p className="font-bold text-brand-purple-dark">{item.cycle}</p>
        </div>
        {trailing}
      </div>
    </div>
  );
}

function Edited({ item }: { item: Review }) {
  if (!item.edited) return null;
  return (
    <div className="mt-2 border-t border-dashed border-brand-purple-dark/20 pt-2">
      <p className="text-sm text-brand-purple-dark/70">
        <Icon name="fa-pen" className="mr-1" /> Editado por <span className="font-semibold">{item.edited.by}</span> em{" "}
        <span className="font-semibold">{item.edited.at}</span>
      </p>
    </div>
  );
}

function PendingFeedback() {
  return <Tag item="Devolutiva pendente" variant="orange" pill icon="fa-solid fa-triangle-exclamation" />;
}

/* ------------------------------------------------------------------ */
/* Lista                                                               */
/* ------------------------------------------------------------------ */

function List({ items, canCreate, onOpen, onNew }: { items: Review[]; canCreate: boolean; onOpen: (id: string) => void; onNew: () => void }) {
  return (
    <>
      <div className="space-y-3 flex-1">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-brand-purple-dark/10 bg-brand-purple-dark/5 p-4">
            <p className="text-sm font-semibold text-brand-purple-dark/70">Avaliações</p>
            <p className="mt-2 text-sm text-brand-purple-dark/80">Nenhuma avaliação de desempenho cadastrada.</p>
          </div>
        ) : (
          items.map((item) => {
            const result = scoreOf(item.answers);
            return (
              <button
                key={item.id}
                type="button"
                className="w-full rounded-2xl border border-brand-purple-dark/10 bg-white p-3 text-left transition-colors hover:bg-brand-purple-dark/5"
                onClick={() => onOpen(item.id)}
              >
                <Who item={item} trailing={<Icon name="fa-chevron-right" className="text-brand-purple-dark/70" />} />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-brand-purple-dark">
                    <span className="text-xl font-extrabold">{result.total}</span>
                    <span className="text-sm text-brand-purple-dark/60">/{MAX_POINTS} pts</span>
                  </p>
                  {result.level && <LevelTag level={result.level} />}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {result.dimensions.map((d) => (
                    <Tag key={d.id} item={`${d.label} ${d.total}/${d.max}`} variant="dark-purple" leftIcon={`fa-solid ${d.icon}`} />
                  ))}
                  {!item.feedback.shared && <PendingFeedback />}
                </div>
                <Edited item={item} />
              </button>
            );
          })
        )}
      </div>

      {canCreate && (
        <Footer>
          <Button type="button" variant="tint" color="blue" rightIcon="fa-plus" onClick={onNew}>
            Nova avaliação
          </Button>
        </Footer>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Resultado                                                           */
/* ------------------------------------------------------------------ */

function Dimensions({ result }: { result: Result }) {
  return (
    <div className="space-y-3">
      {result.dimensions.map((d) => (
        <div key={d.id} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <p className="font-bold text-brand-purple-dark/70">
              <Icon name={d.icon} type="solid" className="mr-1.5" />
              {d.label}
            </p>
            <p className="text-brand-purple-dark/60">
              <span className="font-bold text-brand-purple-dark">{d.total}</span>/{d.max}
            </p>
          </div>
          <Progress value={(d.total / d.max) * 100} showPercentage={false} />
        </div>
      ))}
    </div>
  );
}

function ResultCard({ result }: { result: Result }) {
  if (!result.level) return null;
  const m = LEVELS[result.level];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-brand-purple-dark">Classificação</p>
        <LevelTag level={result.level} />
      </div>
      <InsideCard icon="fa-clipboard-check" title="Pontuação total" subtitle={m.message} value={`${result.total}/${MAX_POINTS}`} />
      <Dimensions result={result} />
      {result.critical && (
        <div className="flex gap-3 rounded-xl bg-red-light p-4 text-red-dark">
          <Icon name="fa-triangle-exclamation" type="solid" className="mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold">Classificado como Plano de ação por item crítico</p>
            <p className="text-sm">
              <span className="font-bold">Item {result.critical.number}.</span> {result.critical.question.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formulário (nova avaliação e edição)                                */
/* ------------------------------------------------------------------ */

function SectionTitle({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/16 text-brand-blue-dark">
        <Icon name={icon} type="solid" />
      </span>
      <div>
        <p className="font-bold text-brand-purple-dark">{title}</p>
        <p className="text-sm text-brand-purple-dark/60">{description}</p>
      </div>
    </div>
  );
}

function DimensionTitle({ dimension }: { dimension: Dimension }) {
  return <SectionTitle icon={dimension.icon} title={dimension.label} description={dimension.description} />;
}

function QuestionLabel({ index }: { index: number }) {
  const q = QUESTIONS[index]!;
  return (
    <Label color="none" className="text-brand-purple-dark">
      {index + 1}. {q.text}
      {q.critical && <Icon name="fa-star" type="solid" className="ml-1.5 text-brand-orange" />}
    </Label>
  );
}

function Intro() {
  const [rules, setRules] = useState(false);
  return (
    <div className="space-y-3 rounded-2xl border border-brand-purple-dark/10 bg-brand-purple-dark/5 p-4">
      <div>
        <p className="font-bold text-brand-purple-dark">Avaliação trimestral de desempenho do profissional</p>
        <p className="mt-1 text-sm text-brand-purple-dark/70">
          Preenchida a cada ciclo pela supervisão ou coordenação, a partir da observação em sessão, dos registros e das reuniões de caso.
          A devolutiva é conversada com o profissional.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map((o) => (
          <Tag key={o.score} item={`${o.score} · ${o.label}`} variant={o.tag} />
        ))}
      </div>

      <Button type="button" variant="ghost" size="small" rightIcon={rules ? "fa-chevron-up" : "fa-chevron-down"} onClick={() => setRules((r) => !r)}>
        Cálculo da classificação
      </Button>

      {rules && (
        <div className="space-y-2 border-t border-brand-purple-dark/10 pt-3 text-sm text-brand-purple-dark">
          <p>Pontuação total (12 itens, seis por eixo): mínimo 12 pontos, máximo 48 pontos.</p>
          <div className="flex flex-wrap gap-1.5">
            <Tag item="38 a 48 · Consolidado" variant="green" pill />
            <Tag item="26 a 37 · Em desenvolvimento" variant="yellow" pill />
            <Tag item="12 a 25 · Plano de ação" variant="red" pill />
          </div>
          <p>
            <span className="font-bold">Regras de exceção.</span> Os itens com <Icon name="fa-star" type="solid" className="text-brand-orange" /> são
            críticos: procedimentos ABA, manejo de comportamentos interferentes e postura ética. Nota 1 ou 2 em qualquer um deles leva a Plano de
            ação, qualquer que seja a pontuação total.
          </p>
          <p>Em desenvolvimento e Plano de ação pedem o plano de ação combinado com o profissional.</p>
        </div>
      )}
    </div>
  );
}

function ReviewForm({
  item,
  current,
  onCancel,
  onSave,
}: {
  item: Review;
  current: string;
  onCancel: () => void;
  onSave: (input: ReviewInput) => void;
}) {
  const [answers, setAnswers] = useState<Answers>(item.answers);
  const [feedback, setFeedback] = useState<Feedback>(item.feedback);
  const [errors, setErrors] = useState(false);
  const form = useRef<HTMLDivElement>(null);
  const result = scoreOf(answers);
  const needsPlan = planRequired(result.level);
  const planMissing = needsPlan && feedback.actionPlan.trim().length === 0;

  const set = <K extends keyof Feedback>(key: K, value: Feedback[K]) => setFeedback((f) => ({ ...f, [key]: value }));

  function save() {
    if (!result.complete || planMissing) {
      setErrors(true);
      const first = QUESTIONS.find((q) => !answers[q.id]);
      const selector = first ? `[data-question="${first.id}"]` : "[data-action-plan]";
      // Rola só o conteúdo do drawer: `scrollIntoView` rolaria também os
      // ancestrais com `overflow-hidden` e tiraria o drawer da tela.
      const target = form.current?.querySelector<HTMLElement>(selector);
      const scroller = form.current?.parentElement;
      if (target && scroller) {
        const offset = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        scroller.scrollBy({ top: offset - scroller.clientHeight / 3, behavior: "smooth" });
      }
      return;
    }
    onSave({
      answers,
      feedback: { ...feedback, strengths: feedback.strengths.trim(), improvements: feedback.improvements.trim(), actionPlan: feedback.actionPlan.trim() },
    });
  }

  return (
    <>
      <div ref={form} className="space-y-6 flex-1">
        <Breadcrumbs items={[{ label: "Todas avaliações", to: "list" }, { label: current }]} onNavigate={onCancel} />
        <div className="rounded-2xl border border-brand-purple-dark/10 p-3">
          <Who item={item} />
        </div>

        <Intro />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="font-bold text-brand-purple-dark">
              {result.answered} de {QUESTIONS.length} respondidos
            </p>
            {errors && !result.complete && <FieldError className="mt-0">Responda todos os itens</FieldError>}
          </div>
          <Progress value={(result.answered / QUESTIONS.length) * 100} showPercentage={false} />
        </div>

        {DIMENSIONS.map((d) => (
          <div key={d.id} className="space-y-6">
            <DimensionTitle dimension={d} />
            {QUESTIONS.map((q, i) =>
              q.dimension !== d.id ? null : (
                <div key={q.id} data-question={q.id} className="space-y-2">
                  <div>
                    <QuestionLabel index={i} />
                    <p className="mt-1 text-sm text-brand-purple-dark/60">{q.hint}</p>
                  </div>
                  <Input
                    type="select"
                    field={{
                      id: `performance_review_${q.id}`,
                      name: `performance_review[${q.id}]`,
                      value: answers[q.id] === undefined ? "" : String(answers[q.id]),
                      errors: errors && !answers[q.id] ? ["Selecione uma opção"] : [],
                    }}
                    prompt="Selecione"
                    options={OPTIONS.map((o) => [`${o.score} · ${o.label}`, String(o.score)] as const)}
                    onChange={(value) => setAnswers((a) => ({ ...a, [q.id]: value ? (Number(value) as Score) : undefined }))}
                  />
                </div>
              ),
            )}
          </div>
        ))}

        <SectionTitle icon="fa-comments" title="Devolutiva" description="O que será conversado com o profissional" />

        <Input
          type="textarea"
          label="Pontos fortes"
          field={{ id: "performance_review_strengths", name: "performance_review[strengths]", value: feedback.strengths }}
          placeholder="O que deve ser reconhecido e mantido."
          rows={3}
          onChange={(e) => set("strengths", e.target.value)}
        />
        <Input
          type="textarea"
          label="Pontos a desenvolver"
          field={{ id: "performance_review_improvements", name: "performance_review[improvements]", value: feedback.improvements }}
          placeholder="Competências que precisam evoluir até o próximo ciclo."
          rows={3}
          onChange={(e) => set("improvements", e.target.value)}
        />
        <div data-action-plan className={errors && planMissing ? "pb-6" : undefined}>
          <Input
            type="textarea"
            label={needsPlan ? "Plano de ação combinado · obrigatório nesta classificação" : "Plano de ação combinado"}
            field={{
              id: "performance_review_action_plan",
              name: "performance_review[action_plan]",
              value: feedback.actionPlan,
              errors: errors && planMissing ? ["Descreva o plano de ação combinado"] : [],
            }}
            placeholder="Ações, responsáveis e prazo de reavaliação."
            rows={3}
            onChange={(e) => set("actionPlan", e.target.value)}
          />
        </div>
        <Input
          type="checkbox"
          label="Devolutiva já realizada com o profissional"
          field={{ id: "performance_review_shared", name: "performance_review[shared]", value: feedback.shared }}
          checked={feedback.shared}
          onChange={(e) => set("shared", e.target.checked)}
        />

        {result.complete && <ResultCard result={result} />}
      </div>

      <Footer>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" variant="default" color="blue" rightIcon="fa-floppy-disk" onClick={save}>
          Salvar
        </Button>
      </Footer>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Avaliação registrada (leitura)                                      */
/* ------------------------------------------------------------------ */

function View({
  item,
  policy,
  onBack,
  onEdit,
  onDelete,
}: {
  item: Review;
  policy: ReviewPolicy;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const result = scoreOf(item.answers);
  const notes = [
    { label: "Pontos fortes", value: item.feedback.strengths },
    { label: "Pontos a desenvolver", value: item.feedback.improvements },
    { label: "Plano de ação combinado", value: item.feedback.actionPlan },
  ].filter((n) => n.value);

  return (
    <>
      <div className="space-y-6 flex-1">
        <Breadcrumbs items={[{ label: "Todas avaliações", to: "list" }, { label: item.cycle }]} onNavigate={onBack} />
        <div className="rounded-2xl border border-brand-purple-dark/10 p-3">
          <Who item={item} />
          <p className="mt-2 text-sm text-brand-purple-dark/70">
            <Icon name="fa-calendar-day" className="mr-1" /> Registrada em <span className="font-semibold">{item.date}</span>
          </p>
          <Edited item={item} />
        </div>

        <ResultCard result={result} />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-brand-purple-dark">Devolutiva</p>
            {item.feedback.shared ? <Tag item="Realizada" variant="green" pill icon="fa-solid fa-circle-check" /> : <PendingFeedback />}
          </div>
          {notes.length > 0 && (
            <div className="space-y-4 rounded-2xl bg-brand-purple-dark/5 p-4">
              {notes.map((n) => (
                <div key={n.label}>
                  <Label color="none" className="text-brand-purple-dark">
                    {n.label}
                  </Label>
                  <p className="mt-1 text-brand-purple-dark/80">{n.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {DIMENSIONS.map((d) => (
          <div key={d.id} className="space-y-6">
            <DimensionTitle dimension={d} />
            {QUESTIONS.map((q, i) => {
              if (q.dimension !== d.id) return null;
              const o = optionOf(item.answers[q.id]);
              return (
                <div key={q.id} className="space-y-2">
                  <QuestionLabel index={i} />
                  {o ? <Tag item={`${o.score} · ${o.label}`} variant={o.tag} /> : <Tag item="Não respondido" variant="brand" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {(policy.delete || policy.edit) && (
        <Footer between>
          {policy.delete ? (
            <Button type="button" variant="tint" color="red" rightIcon="fa-trash" onClick={onDelete}>
              Excluir
            </Button>
          ) : (
            <span />
          )}
          {policy.edit && (
            <Button type="button" variant="tint" color="blue" rightIcon="fa-pen" onClick={onEdit}>
              Editar
            </Button>
          )}
        </Footer>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Drawer                                                              */
/* ------------------------------------------------------------------ */

export function ReviewDrawer({
  show,
  professionalName,
  view,
  items,
  draft,
  policy,
  onClose,
  onNavigate,
  onCreate,
  onUpdate,
  onDelete,
}: {
  show: boolean;
  professionalName: string;
  view: DrawerView;
  items: Review[];
  /** A avaliação nova: avaliador, data e ciclo de hoje, sem respostas. */
  draft: Review;
  policy: ReviewPolicy;
  onClose: () => void;
  onNavigate: (view: DrawerView) => void;
  onCreate: (input: ReviewInput) => void;
  onUpdate: (id: string, input: ReviewInput) => void;
  onDelete: (id: string) => void;
}) {
  const selected = "id" in view ? items.find((i) => i.id === view.id) : undefined;
  const toList = () => onNavigate({ kind: "list" });

  let content: ReactNode;
  if (view.kind === "new") {
    content = <ReviewForm key="new" item={draft} current="Nova avaliação" onCancel={toList} onSave={onCreate} />;
  } else if (view.kind === "edit" && selected) {
    content = (
      <ReviewForm
        key={`edit-${selected.id}`}
        item={selected}
        current={`Editando · ${selected.cycle}`}
        onCancel={() => onNavigate({ kind: "view", id: selected.id })}
        onSave={(input) => onUpdate(selected.id, input)}
      />
    );
  } else if (view.kind === "view" && selected) {
    content = (
      <View
        item={selected}
        policy={policy}
        onBack={toList}
        onEdit={() => onNavigate({ kind: "edit", id: selected.id })}
        onDelete={() => onDelete(selected.id)}
      />
    );
  } else {
    content = <List items={items} canCreate={policy.create} onOpen={(id) => onNavigate({ kind: "view", id })} onNew={() => onNavigate({ kind: "new" })} />;
  }

  return (
    <DrawerModal
      id="performance_review_drawer"
      show={show}
      placement="right"
      variant="custom"
      // O `small` (max-w-xl), sem o arredondamento do lado esquerdo no cabeçalho e no rodapé.
      customSize="max-w-xl rounded-l-none!"
      onCancel={onClose}
      contentClass="flex flex-col"
      customTitle={{
        className: "min-w-0",
        children: (
          <>
            <h1 id="performance_review_drawer-title" className="font-bold text-2xl truncate text-blue-dark">
              Avaliação de desempenho
            </h1>
            <p className="truncate text-sm font-semibold text-brand-purple-dark/60">{professionalName} · supervisão e coordenação</p>
          </>
        ),
      }}
    >
      {content}
    </DrawerModal>
  );
}
