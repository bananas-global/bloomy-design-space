/**
 * Acompanhamento periódico — o drawer da ficha do paciente
 * (`periodic_monitorings/periodic_monitoring_drawer.ex` e vizinhos), no design
 * novo: a lista mostra pontuação e classificação de cada avaliação, e o
 * formulário vira o checklist de dez perguntas com a escala de 1 a 4.
 *
 * Os estados são os do drawer do monólito: `list`, `new`, `view` e `edit`.
 * As permissões são as da `PeriodicMonitoringPolicy`.
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
  LEVELS,
  MAX_POINTS,
  OPTIONS,
  QUESTIONS,
  ROLE_LABELS,
  optionOf,
  scoreOf,
  type Answers,
  type Level,
  type Monitoring,
  type Result,
  type Score,
} from "./model.js";

export type DrawerView = { kind: "list" } | { kind: "new" } | { kind: "view"; id: string } | { kind: "edit"; id: string };

export type MonitoringPolicy = { create: boolean; edit: boolean; delete: boolean };

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

/** Responsável e data, como no item da lista do monólito. */
function Who({ item, trailing }: { item: Monitoring; trailing?: ReactNode }) {
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
          <p className="text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Data</p>
          <p className="font-bold text-brand-purple-dark">{item.date}</p>
        </div>
        {trailing}
      </div>
    </div>
  );
}

function Edited({ item }: { item: Monitoring }) {
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

/* ------------------------------------------------------------------ */
/* Lista                                                               */
/* ------------------------------------------------------------------ */

function List({ items, canCreate, onOpen, onNew }: { items: Monitoring[]; canCreate: boolean; onOpen: (id: string) => void; onNew: () => void }) {
  return (
    <>
      <div className="space-y-3 flex-1">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-brand-purple-dark/10 bg-brand-purple-dark/5 p-4">
            <p className="text-sm font-semibold text-brand-purple-dark/70">Acompanhamentos</p>
            <p className="mt-2 text-sm text-brand-purple-dark/80">Nenhum acompanhamento periódico cadastrado.</p>
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
/* Resultado e cabeçalho do checklist                                  */
/* ------------------------------------------------------------------ */

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
      {result.critical && (
        <div className="flex gap-3 rounded-xl bg-red-light p-4 text-red-dark">
          <Icon name="fa-triangle-exclamation" type="solid" className="mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold">Classificado como Prioritário por resposta crítica</p>
            <p className="text-sm">
              <span className="font-bold">Pergunta {result.critical.number}.</span> {result.critical.question.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Intro() {
  const [rules, setRules] = useState(false);
  return (
    <div className="space-y-3 rounded-2xl border border-brand-purple-dark/10 bg-brand-purple-dark/5 p-4">
      <div>
        <p className="font-bold text-brand-purple-dark">Checklist de acompanhamento mensal dos clientes</p>
        <p className="mt-1 text-sm text-brand-purple-dark/70">
          A ser preenchido mensalmente pela coordenação da unidade a respeito do cliente durante encontro de discussão de caso com a
          terapeuta ou supervisora responsável.
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
          <p>Pontuação total (10 perguntas): mínimo 10 pontos, máximo 40 pontos.</p>
          <div className="flex flex-wrap gap-1.5">
            <Tag item="31 a 40 · Estável" variant="green" pill />
            <Tag item="21 a 30 · Atenção" variant="yellow" pill />
            <Tag item="10 a 20 · Prioritário" variant="red" pill />
          </div>
          <p>
            <span className="font-bold">Regras de exceção.</span> As perguntas com <Icon name="fa-star" type="solid" className="text-brand-orange" /> são
            críticas: evolução do cliente, comportamentos interferentes, segurança do cliente e da equipe e risco para a continuidade do
            atendimento. Nota 1 ou 2 em qualquer uma delas leva o caso a Prioritário, qualquer que seja a pontuação total.
          </p>
        </div>
      )}
    </div>
  );
}

function QuestionTitle({ index }: { index: number }) {
  const q = QUESTIONS[index]!;
  return (
    <div>
      <Label color="none" className="text-brand-purple-dark">
        {index + 1}. {q.text}
        {q.critical && <Icon name="fa-star" type="solid" className="ml-1.5 text-brand-orange" />}
      </Label>
      <p className="mt-1 text-sm text-brand-purple-dark/60">{q.hint}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Checklist (nova avaliação e edição)                                 */
/* ------------------------------------------------------------------ */

function Checklist({
  item,
  current,
  onCancel,
  onSave,
}: {
  item: Monitoring;
  current: string;
  onCancel: () => void;
  onSave: (answers: Answers) => void;
}) {
  const [answers, setAnswers] = useState<Answers>(item.answers);
  const [errors, setErrors] = useState(false);
  const form = useRef<HTMLDivElement>(null);
  const result = scoreOf(answers);

  function save() {
    if (!result.complete) {
      setErrors(true);
      const first = QUESTIONS.find((q) => !answers[q.id]);
      // Rola só o conteúdo do drawer: `scrollIntoView` rolaria também os
      // ancestrais com `overflow-hidden` e tiraria o drawer da tela.
      const target = form.current?.querySelector<HTMLElement>(`[data-question="${first?.id}"]`);
      const scroller = form.current?.parentElement;
      if (target && scroller) {
        const offset = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        scroller.scrollBy({ top: offset - scroller.clientHeight / 3, behavior: "smooth" });
      }
      return;
    }
    onSave(answers);
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
              {result.answered} de {QUESTIONS.length} respondidas
            </p>
            {errors && !result.complete && <FieldError className="mt-0">Responda todas as perguntas</FieldError>}
          </div>
          <Progress value={(result.answered / QUESTIONS.length) * 100} showPercentage={false} />
        </div>

        {QUESTIONS.map((q, i) => (
          <div key={q.id} data-question={q.id} className="space-y-2">
            <QuestionTitle index={i} />
            <Input
              type="select"
              field={{
                id: `periodic_monitoring_${q.id}`,
                name: `periodic_monitoring[${q.id}]`,
                value: answers[q.id] === undefined ? "" : String(answers[q.id]),
                errors: errors && !answers[q.id] ? ["Selecione uma opção"] : [],
              }}
              prompt="Selecione"
              options={OPTIONS.map((o) => [`${o.score} · ${o.label}`, String(o.score)] as const)}
              onChange={(value) => setAnswers((a) => ({ ...a, [q.id]: value ? (Number(value) as Score) : undefined }))}
            />
          </div>
        ))}

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
  item: Monitoring;
  policy: MonitoringPolicy;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const result = scoreOf(item.answers);
  return (
    <>
      <div className="space-y-6 flex-1">
        <Breadcrumbs items={[{ label: "Todas avaliações", to: "list" }, { label: item.date }]} onNavigate={onBack} />
        <div className="rounded-2xl border border-brand-purple-dark/10 p-3">
          <Who item={item} />
          <Edited item={item} />
        </div>

        <ResultCard result={result} />

        {QUESTIONS.map((q, i) => {
          const o = optionOf(item.answers[q.id]);
          return (
            <div key={q.id} className="space-y-2">
              <Label color="none" className="text-brand-purple-dark">
                {i + 1}. {q.text}
                {q.critical && <Icon name="fa-star" type="solid" className="ml-1.5 text-brand-orange" />}
              </Label>
              {o ? <Tag item={`${o.score} · ${o.label}`} variant={o.tag} /> : <Tag item="Não respondido" variant="brand" />}
            </div>
          );
        })}
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

export function MonitoringDrawer({
  show,
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
  view: DrawerView;
  items: Monitoring[];
  /** A avaliação nova: responsável e data de hoje, sem respostas. */
  draft: Monitoring;
  policy: MonitoringPolicy;
  onClose: () => void;
  onNavigate: (view: DrawerView) => void;
  onCreate: (answers: Answers) => void;
  onUpdate: (id: string, answers: Answers) => void;
  onDelete: (id: string) => void;
}) {
  const selected = "id" in view ? items.find((i) => i.id === view.id) : undefined;
  const toList = () => onNavigate({ kind: "list" });

  let content: ReactNode;
  if (view.kind === "new") {
    content = <Checklist key="new" item={draft} current="Nova avaliação" onCancel={toList} onSave={onCreate} />;
  } else if (view.kind === "edit" && selected) {
    content = (
      <Checklist
        key={`edit-${selected.id}`}
        item={selected}
        current={`Editando · ${selected.date}`}
        onCancel={() => onNavigate({ kind: "view", id: selected.id })}
        onSave={(answers) => onUpdate(selected.id, answers)}
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
      id="periodic_monitoring_drawer"
      show={show}
      title="Acompanhamento periódico"
      placement="right"
      variant="custom"
      // O `small` (max-w-xl), sem o arredondamento do lado esquerdo no cabeçalho e no rodapé.
      customSize="max-w-xl rounded-l-none!"
      onCancel={onClose}
      contentClass="flex flex-col"
    >
      {content}
    </DrawerModal>
  );
}
