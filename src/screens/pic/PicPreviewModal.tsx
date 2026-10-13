/**
 * Pré-visualizar PIC — novo, não existe no Phoenix.
 *
 * Modal em tela cheia que simula o atendimento com o
 * plano inteiro: à esquerda a fila de
 * alvos (todos os programas das áreas da especialidade selecionada), à direita
 * a aplicação do alvo atual, como o aplicador vê. Nada é gravado: o resultado
 * mostra o que aconteceria com a fase ou o nível de ajuda pelas regras do
 * programa.
 *
 * Componentes usados: `modal/1` (variant custom, sem `title`: o cabeçalho e o
 * fechar ficam no corpo) e `button/1`. O tipo de registro sai do
 * `format_pattern_type/1` do programa: tentativas discretas, duração ou
 * frequência.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Modal } from "../../components/Overlay.js";
import { PHASE_ORDER, type Goal, type Phase, type Program } from "./fixtures.js";
import { currentPhase, PHASES } from "./parts.js";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type RecordType = "td" | "dur" | "freq";
type Answer = "error" | "help" | "success";
type Tone = "success" | "fail" | "neutral";

type Target = {
  id: string;
  name: string;
  area: string;
  objective: string;
  type: RecordType;
  typeLabel: string;
  phase: Phase;
};

/** Escada de ajuda, do maior apoio ao independente. */
const LADDER = [
  { acr: "AV", title: "Ajuda verbal" },
  { acr: "AG", title: "Ajuda gestual" },
  { acr: "AFP", title: "Ajuda física parcial" },
  { acr: "AFT", title: "Ajuda física total" },
  { acr: "I", title: "Independente" },
];

const NEXT: Partial<Record<Phase, Phase>> = { baseline: "intervention", intervention: "generalization", generalization: "maintenance", maintenance: "acquired" };
const PREV: Partial<Record<Phase, Phase>> = { generalization: "intervention", maintenance: "generalization" };

const TRIES = 10;
const DUR_TRIES = 3;
const DUR_TARGET = 60;
const FREQ_TRIES = 1;
const NEED = 80;
const LOW = 60;

const typeOf = (pattern: string): RecordType => (/Duração/.test(pattern) ? "dur" : /Frequência/.test(pattern) ? "freq" : "td");

/** Os programas das áreas, na ordem da grade. */
export function targetsOf(goals: Goal[]): Target[] {
  return goals.flatMap((goal) =>
    goal.objectives.flatMap((objective) =>
      objective.programs.map((program: Program) => ({
        id: program.id,
        name: program.name,
        area: goal.name,
        objective: objective.name,
        type: typeOf(program.pattern),
        typeLabel: program.pattern.split(" / ").pop() ?? program.pattern,
        phase: program.status === "acquired" ? "acquired" : (currentPhase(program) ?? "baseline"),
      })),
    ),
  );
}

const mmss = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.max(0, t) % 60).padStart(2, "0")}`;

const TONES: Record<Tone, { box: string; icon: string; trend: string }> = {
  success: { box: "border-brand-green/50 bg-brand-green/8", icon: "bg-brand-green/18 text-brand-green-dark", trend: "fa-arrow-trend-up" },
  fail: { box: "border-red/40 bg-red-light/60", icon: "bg-red-light text-red-dark", trend: "fa-arrow-trend-down" },
  neutral: { box: "border-neutral-100 bg-white", icon: "bg-brand-purple-dark/6 text-brand-purple-dark/60", trend: "fa-equals" },
};

const ANSWER: Record<Answer, { pill: string; bar: string }> = {
  error: { pill: "bg-red-light text-red-dark", bar: "bg-red" },
  help: { pill: "bg-yellow/20 text-yellow-dark", bar: "bg-yellow" },
  success: { pill: "bg-green-light text-green-dark", bar: "bg-green" },
};

/** O mesmo estilo das abas de especialidade da aba PIC. */
const pill = (selected: boolean) =>
  cx(
    "inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm font-bold transition-colors",
    selected ? "bg-brand-blue border-brand-blue text-white" : "bg-white border-neutral-100 text-brand-purple-dark/65 hover:border-brand-blue",
  );

const EYEBROW = "text-xs font-black tracking-wide uppercase text-brand-purple-dark/50";

type Outcome = { tone: Tone; title: string; text: string; icon?: string };

type Props = { onCancel: () => void; planName: string; subtitle: string; goals: Goal[] };

export function PicPreviewModal({ show, ...props }: Props & { show: boolean }) {
  return (
    <Modal
      id="pic_preview_modal"
      show={show}
      onCancel={props.onCancel}
      aria-label="Pré-visualização do atendimento"
      variant="custom"
      customSize="h-full max-h-full! rounded-none! m-0! flex flex-col [&>div:last-child]:flex-1 [&>div:last-child]:min-h-0 [&>div:last-child]:flex [&>div:last-child]:flex-col"
      withPadding={false}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 p-6 border-b border-neutral-100">
        <div className="min-w-0">
          <p className="text-xs font-black tracking-wider uppercase text-brand-blue-dark">Pré-visualização do atendimento</p>
          <h1 className="mt-1 text-2xl font-extrabold text-brand-purple-dark">{props.planName}</h1>
          <p className="mt-1 text-[13px] font-bold text-brand-purple-dark/50">{props.subtitle}</p>
        </div>
        <Button type="button" variant="tint" aria-label="Fechar" onClick={props.onCancel}>
          <Icon name="fa-times" className="block w-4 h-4 self-center" />
        </Button>
      </header>
      <PreviewBody {...props} />
    </Modal>
  );
}

/** Montado junto com o modal: a simulação recomeça a cada abertura. */
function PreviewBody({ onCancel, goals }: Props) {
  const list = targetsOf(goals);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<Record<string, true>>({});
  const [ready, setReady] = useState(false);
  const cur = list[idx];

  if (!cur) {
    return <p className="px-6 py-12 text-center text-sm font-semibold text-brand-purple-dark/50">Este plano ainda não tem programas para simular.</p>;
  }

  const last = idx >= list.length - 1;
  const doneCount = Object.keys(done).length;
  const mark = () => setDone((d) => ({ ...d, [cur.id]: true }));

  return (
    <>
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] overflow-hidden">
        <div className="h-full overflow-y-auto p-6 border-r border-neutral-100 flex flex-col gap-2.5 max-md:hidden">
          <span className={EYEBROW}>Fila de alvos</span>
          <ol className="flex flex-col gap-1.5">
            {list.map((t, i) => {
              const isCur = i === idx;
              const isDone = !!done[t.id];
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setIdx(i)}
                    aria-current={isCur ? "step" : undefined}
                    className={cx(
                      "flex items-start gap-2.5 w-full text-left p-2.5 rounded-lg border transition-colors",
                      isCur ? "border-brand-blue bg-brand-blue/12" : "border-transparent hover:bg-neutral-100/40",
                    )}
                  >
                    <span
                      className={cx(
                        "shrink-0 w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-extrabold",
                        isDone ? "bg-brand-green/20 text-brand-green-dark" : "bg-brand-purple-dark/7 text-brand-purple-dark/55",
                      )}
                    >
                      {isDone ? <Icon type="solid" name="fa-check" /> : i + 1}
                    </span>
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[13px] font-extrabold leading-tight text-brand-purple-dark">{t.name}</span>
                      <span className="text-[11px] font-bold text-brand-purple-dark/55">
                        {t.area} · {PHASES[t.phase].title}
                      </span>
                      <span className="text-[11px] font-semibold text-brand-purple-dark/40">{t.typeLabel}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <Simulation key={cur.id} target={cur} onReady={setReady} />
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-4 px-6 py-3.5 border-t border-neutral-100">
        <div className="flex flex-col gap-1.5 min-w-35">
          <span className="text-[13px] font-extrabold text-brand-purple-dark/60">
            Alvo {idx + 1} de {list.length}
          </span>
          <div className="w-35 h-1.5 rounded-full bg-brand-purple-dark/8 overflow-hidden">
            <span className="block h-full rounded-full bg-brand-blue transition-[width] duration-200" style={{ width: `${Math.round((doneCount / list.length) * 100)}%` }} />
          </div>
        </div>
        <div className="flex gap-2.5">
          <Button type="button" variant="outline" leftIcon="fa-arrow-left" iconType="solid" disabled={idx === 0} className="disabled:opacity-50" onClick={() => setIdx(idx - 1)}>
            Anterior
          </Button>
          {last ? (
            <Button
              type="button"
              rightIcon="fa-flag-checkered"
              iconType="solid"
              onClick={() => {
                mark();
                onCancel();
              }}
            >
              Encerrar simulação
            </Button>
          ) : (
            <Button
              type="button"
              variant={ready ? "default" : "tint"}
              rightIcon="fa-arrow-right"
              iconType="solid"
              onClick={() => {
                mark();
                setIdx(idx + 1);
              }}
            >
              Próximo alvo
            </Button>
          )}
        </div>
      </footer>
    </>
  );
}

/**
 * A aplicação de um alvo. Remontada a cada alvo: a simulação começa do zero.
 * `onReady` avisa quando há resultado, e o Próximo alvo ganha destaque.
 */
function Simulation({ target, onReady }: { target: Target; onReady: (ready: boolean) => void }) {
  const progAcq = target.phase === "acquired";
  const [phase, setPhase] = useState<Phase>(progAcq ? "intervention" : target.phase);
  const [lvl, setLvl] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [sec, setSec] = useState(0);
  const [runs, setRuns] = useState<number[]>([]);
  const [count, setCount] = useState(0);
  const [closed, setClosed] = useState<number[]>([]);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const isTD = target.type === "td";
  const showTD = !progAcq && isTD && phase !== "acquired";
  const showAcq = progAcq || (isTD && phase === "acquired");
  const showDur = !progAcq && target.type === "dur";
  const showFreq = !progAcq && target.type === "freq";
  const isInt = phase === "intervention";
  const strict = phase === "generalization" || phase === "maintenance";
  const atIndep = lvl >= LADDER.length - 1;
  const succ = answers.filter((a) => (strict ? a === "success" : a !== "error")).length;
  const pct = answers.length ? Math.round((succ / TRIES) * 100) : 0;
  const tdDone = answers.length >= TRIES;
  const durDone = runs.length >= DUR_TRIES;
  const freqDone = closed.length >= FREQ_TRIES;

  const reset = () => {
    window.clearInterval(timer.current);
    setAnswers([]);
    setRunning(false);
    setSec(0);
    setRuns([]);
    setCount(0);
    setClosed([]);
  };
  const add = (a: Answer) => setAnswers((list) => (list.length >= TRIES ? list : [...list, a]));
  const start = () => {
    const t0 = Date.now();
    setSec(0);
    setRunning(true);
    timer.current = window.setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 250);
  };
  const stop = () => {
    window.clearInterval(timer.current);
    setRunning(false);
    setRuns((list) => (list.length >= DUR_TRIES ? list : [...list, sec]));
  };

  let outcome: Outcome | null = null;
  let rules: string[] = [];
  const title = (phase: Phase | undefined) => (phase ? PHASES[phase].title : "");

  if (showTD) {
    if (tdDone) {
      const met = pct >= NEED;
      if (phase === "baseline")
        outcome = {
          tone: "neutral",
          title: `Sondagem registrada · ${pct}%`,
          text: "Nesta fase o resultado não aprova nem reprova: contam as sessões. Faltando completar 2 sessões consecutivas, o alvo segue em Linha de Base.",
        };
      else if (isInt) {
        const up = LADDER[lvl + 1];
        const down = LADDER[lvl - 1];
        outcome = met
          ? { tone: "success", title: `Critério atingido · ${pct}%`, text: up && !atIndep ? `A ajuda desvanece para ${up.acr} — ${up.title}.` : "No nível Independente, o alvo avança para Generalização." }
          : pct <= LOW
            ? { tone: "fail", title: `Abaixo do critério · ${pct}%`, text: down ? `A ajuda volta para ${down.acr} — ${down.title}.` : `Permanece em ${LADDER[0]!.acr}: já é o maior nível de ajuda. A fase não regride.` }
            : { tone: "neutral", title: `Sem mudança · ${pct}%`, text: `Entre ${LOW}% e ${NEED}%: mantém o nível ${LADDER[lvl]!.acr} na próxima sessão.` };
      } else
        outcome = met
          ? { tone: "success", title: `Critério atingido · ${pct}%`, text: `O alvo avança para ${title(NEXT[phase])}.` }
          : pct <= LOW
            ? { tone: "fail", title: `Abaixo do critério · ${pct}%`, text: `O alvo regride para ${title(PREV[phase])}.` }
            : { tone: "neutral", title: `Sem mudança · ${pct}%`, text: `Entre ${LOW}% e ${NEED}%: permanece em ${title(phase)}.` };
    }
    if (phase === "baseline") rules = ["Avança para Intervenção após 2 sessões consecutivas — e não volta mais para esta fase.", "Toda ajuda registrada aqui conta como acerto."];
    else if (isInt)
      rules = [
        `Com ${NEED}% ou mais de acertos em 3 sessões consecutivas, a ajuda desvanece um nível.`,
        `Abaixo de ${LOW}% em 3 sessões consecutivas, a ajuda volta um nível. A fase não regride.`,
        `Escada de ajuda: ${LADDER.map((l) => l.acr).join(" → ")}. No nível Independente, o alvo avança para Generalização.`,
      ];
    else
      rules = [
        `Avança para ${title(NEXT[phase])} com ${NEED}% ou mais em 3 sessões consecutivas.`,
        `Regride para ${title(PREV[phase])} abaixo de ${LOW}% em 3 sessões consecutivas.`,
        "Toda ajuda registrada aqui conta como erro.",
      ];
  } else if (isTD && !progAcq && phase === "acquired") {
    rules = ["O alvo sai da lista de aplicação. Só volta se for retomado manualmente no PIC."];
  } else if (showDur) {
    if (durDone) {
      const ok = runs.filter((r) => r >= DUR_TARGET).length;
      outcome = {
        tone: ok >= DUR_TRIES ? "success" : "neutral",
        icon: "fa-stopwatch",
        title: `${ok} de ${DUR_TRIES} tentativas atingiram ${mmss(DUR_TARGET)}`,
        text: "Sem limitação de aplicação configurada — o terapeuta pode repetir à vontade.",
      };
    }
    rules = ["O terapeuta cronometra cada tentativa: Iniciar corre o tempo, Parar registra a duração.", `A tentativa é êxito quando alcança a meta de tempo; o alvo fecha depois de ${DUR_TRIES} tentativas.`];
  } else if (showFreq) {
    if (freqDone) outcome = { tone: "neutral", icon: "fa-hashtag", title: `Registros por intervalo: ${closed.join(" · ")}`, text: "Sem limitação de aplicação configurada." };
    rules = ["O terapeuta conta as ocorrências no intervalo e fecha o registro.", `Configurado para ${FREQ_TRIES} intervalo por aplicação.`];
  }

  const ready = showAcq || (showTD && tdDone) || (showDur && durDone) || (showFreq && freqDone);
  useEffect(() => onReady(ready), [ready, onReady]);

  const answerLabel = (a: Answer) => (a === "error" ? "Erro" : a === "success" ? "Independente" : `Ajuda · ${LADDER[lvl]!.acr}`);
  const bigButton = "flex-1 h-14! justify-center items-center! text-base disabled:opacity-45";

  return (
    <div className="h-full overflow-y-auto p-6 flex flex-col gap-4 min-w-0">
      <div className="flex flex-col gap-2.5">
        <p className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-brand-blue/12 text-[13px] font-bold text-brand-blue-dark">
          <Icon type="solid" name="fa-circle-info" /> Simulação do plano inteiro: nada aqui é gravado no atendimento do paciente.
        </p>
        <div className="flex items-center gap-2 mt-2.5 text-xs font-extrabold text-brand-purple-dark/55">
          <span>{target.area}</span>
          <Icon type="solid" name="fa-chevron-right" className="text-[9px] text-brand-purple-dark/30" />
          <span>{target.objective}</span>
        </div>
      </div>

      {isTD && !progAcq && (
        <div role="tablist" aria-label="Fase simulada" className="flex flex-wrap gap-2">
          {PHASE_ORDER.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={p === phase}
              className={pill(p === phase)}
              onClick={() => {
                setPhase(p);
                setAnswers([]);
                setLvl(0);
              }}
            >
              <Icon type="solid" name={PHASES[p].icon} />
              {PHASES[p].title}
            </button>
          ))}
        </div>
      )}

      {showTD && isInt && (
        <div className="flex flex-wrap items-center gap-3">
          <span className={EYEBROW}>Nível de ajuda simulado</span>
          <div className="flex gap-1.5">
            {LADDER.map((l, i) => (
              <button
                key={l.acr}
                type="button"
                title={l.title}
                aria-pressed={i === lvl}
                className={cx(pill(i === lvl), "min-w-10.5 justify-center h-8.5 py-0")}
                onClick={() => {
                  setLvl(i);
                  setAnswers([]);
                }}
              >
                {l.acr}
              </button>
            ))}
          </div>
        </div>
      )}

      {showAcq && (
        <div className="flex items-center gap-3.5 p-5 rounded-2xl border border-brand-green/50 bg-brand-green/8">
          <span className="shrink-0 w-12 h-12 rounded-xl inline-flex items-center justify-center text-[22px] bg-brand-green/18 text-brand-green-dark">
            <Icon type="solid" name="fa-trophy" />
          </span>
          <div>
            <p className="text-base font-extrabold text-brand-purple-dark">{target.name} — Adquirido</p>
            <p className="mt-1 text-[13px] text-brand-purple-dark/70">
              {progAcq ? "Habilidade aprendida, generalizada e mantida. Não entra mais na aplicação." : "Habilidade aprendida, generalizada e mantida. Fluxo encerrado."}
            </p>
          </div>
        </div>
      )}

      {showTD && (
        <div className="flex flex-col gap-4 p-5 rounded-2xl border border-neutral-100 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-extrabold text-brand-purple-dark">{target.name}</span>
              <span className={cx("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold", PHASES[phase].className)}>
                {PHASES[phase].title} <Icon type="solid" name={PHASES[phase].icon} />
              </span>
              {isInt && <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow/20 text-yellow-dark">Nível {atIndep ? "Independente" : LADDER[lvl]!.acr}</span>}
            </div>
            <span className="text-[13px] text-brand-purple-dark/60">
              <b className="font-extrabold text-brand-purple-dark">
                {answers.length}/{TRIES}
              </b>{" "}
              tentativas · {pct}%
            </span>
          </div>

          <div className="flex gap-1.5">
            {Array.from({ length: TRIES }, (_, i) => (
              <span key={i} className={cx("flex-1 h-2 rounded-full", answers[i] ? ANSWER[answers[i]].bar : "bg-brand-purple-dark/8")} />
            ))}
          </div>

          <div className="rounded-lg border border-neutral-100 bg-brand-purple-dark/2 overflow-hidden">
            <button type="button" aria-expanded={logOpen} className="w-full flex items-center justify-between px-4 py-3.5" onClick={() => setLogOpen((o) => !o)}>
              <span className="inline-flex items-center gap-2 text-[13px] font-extrabold tracking-wide uppercase text-brand-purple-dark/55">
                Tentativas registradas
                <span className="min-w-5.5 px-1.5 rounded-full bg-brand-purple-dark/10 text-xs tracking-normal text-brand-purple-dark">{answers.length}</span>
              </span>
              <Icon type="solid" name={logOpen ? "fa-chevron-up" : "fa-chevron-down"} className="text-xs text-brand-purple-dark/50" />
            </button>
            {logOpen && answers.length > 0 && (
              <div className="flex flex-col border-t border-neutral-100">
                {answers.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-brand-purple-dark/6 last:border-b-0">
                    <span className="w-7 text-xs font-extrabold text-brand-purple-dark/50">#{i + 1}</span>
                    <span className={cx("px-2.5 py-0.5 rounded-full text-xs font-bold", ANSWER[a].pill)}>{answerLabel(a)}</span>
                    <span className="ml-auto text-xs text-brand-purple-dark/45">simulado</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      title="Excluir"
                      className="text-red! hover:bg-red-light!"
                      onClick={() => setAnswers((list) => list.filter((_, j) => j !== i))}
                    >
                      <Icon type="solid" name="fa-trash" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2.5">
            <Button type="button" variant="tint" color="red" leftIcon="fa-xmark" iconType="solid" disabled={tdDone} className={bigButton} onClick={() => add("error")}>
              Erro
            </Button>
            {isInt && !atIndep && (
              <Button type="button" variant="tint" color="yellow" leftIcon="fa-hand" iconType="solid" disabled={tdDone} className={bigButton} onClick={() => add("help")}>
                Ajuda · {LADDER[lvl]!.acr}
              </Button>
            )}
            <Button type="button" variant="tint" color="green" leftIcon="fa-check" iconType="solid" disabled={tdDone} className={bigButton} onClick={() => add("success")}>
              Independente
            </Button>
          </div>

          {!isInt && (
            <p className="text-xs font-semibold text-brand-purple-dark/55">
              {phase === "baseline"
                ? "Nesta fase a ajuda não é oferecida; o que for registrado como acerto vale como acerto."
                : "A ajuda não aparece como resposta nesta fase — qualquer apoio deve ser registrado como erro."}
            </p>
          )}
        </div>
      )}

      {showDur && (
        <div className="flex flex-col gap-4 p-5 rounded-2xl border border-neutral-100 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-brand-purple-dark">{target.name}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-blue/16 text-brand-blue-dark">Duração</span>
            </div>
            <span className="text-[13px] text-brand-purple-dark/60">
              <b className="font-extrabold text-brand-purple-dark">
                {runs.length}/{DUR_TRIES}
              </b>{" "}
              tentativas
            </span>
          </div>
          <div className="flex items-baseline justify-center gap-3 pt-3.5 pb-1">
            <span className={cx("font-mono text-[42px] font-extrabold tabular-nums", running ? "text-brand-blue-dark" : "text-brand-purple-dark")}>{mmss(running ? sec : 0)}</span>
            <span className="text-[13px] font-bold text-brand-purple-dark/50">meta {mmss(DUR_TARGET)}</span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: DUR_TRIES }, (_, i) => (
              <span key={i} className={cx("flex-1 h-2 rounded-full", runs[i] == null ? "bg-brand-purple-dark/8" : runs[i] >= DUR_TARGET ? "bg-green" : "bg-red")} />
            ))}
          </div>
          {running ? (
            <Button type="button" variant="tint" color="red" leftIcon="fa-stop" iconType="solid" className={bigButton} onClick={stop}>
              Parar
            </Button>
          ) : (
            <Button type="button" variant="tint" color="green" leftIcon="fa-play" iconType="solid" disabled={durDone} className={bigButton} onClick={start}>
              Iniciar
            </Button>
          )}
        </div>
      )}

      {showFreq && (
        <div className="flex flex-col gap-4 p-5 rounded-2xl border border-neutral-100 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-brand-purple-dark">{target.name}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-blue/16 text-brand-blue-dark">Frequência</span>
            </div>
            <span className="text-[13px] text-brand-purple-dark/60">
              <b className="font-extrabold text-brand-purple-dark">
                {closed.length}/{FREQ_TRIES}
              </b>{" "}
              intervalos
            </span>
          </div>
          <div className="flex items-center justify-center gap-4.5 pt-3 pb-1.5">
            <Button type="button" variant="outline" aria-label="Diminuir" disabled={freqDone} className="w-11 h-11! justify-center items-center! disabled:opacity-45" onClick={() => setCount((c) => Math.max(0, c - 1))}>
              <Icon type="solid" name="fa-minus" />
            </Button>
            <span className="min-w-16 text-center text-[38px] font-extrabold tabular-nums text-brand-purple-dark">{count}</span>
            <Button type="button" variant="outline" aria-label="Aumentar" disabled={freqDone} className="w-11 h-11! justify-center items-center! disabled:opacity-45" onClick={() => setCount((c) => c + 1)}>
              <Icon type="solid" name="fa-plus" />
            </Button>
          </div>
          <Button
            type="button"
            variant="tint"
            color="green"
            leftIcon="fa-flag-checkered"
            iconType="solid"
            disabled={freqDone}
            className={bigButton}
            onClick={() => {
              setClosed((list) => (list.length >= FREQ_TRIES ? list : [...list, count]));
              setCount(0);
            }}
          >
            Finalizar intervalo
          </Button>
        </div>
      )}

      {outcome && (
        <div className={cx("flex items-start gap-3 p-4 rounded-2xl border", TONES[outcome.tone].box)}>
          <span className={cx("shrink-0 w-9 h-9 rounded-lg inline-flex items-center justify-center", TONES[outcome.tone].icon)}>
            <Icon type="solid" name={outcome.icon ?? TONES[outcome.tone].trend} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-extrabold text-brand-purple-dark">{outcome.title}</p>
            <p className="mt-1 text-[13px] text-brand-purple-dark/70 text-pretty">{outcome.text}</p>
            <p className="mt-1.5 text-xs font-bold text-brand-purple-dark/45">Aplicação contínua: o terapeuta pode reaplicar o alvo na mesma sessão.</p>
          </div>
          <Button type="button" variant="ghost" size="medium" rightIcon="fa-rotate-right" iconType="solid" className="shrink-0 text-blue!" onClick={reset}>
            Simular de novo
          </Button>
        </div>
      )}

      {rules.length > 0 && (
        <ul className="flex flex-col gap-2.5 p-4 rounded-2xl bg-brand-blue/20">
          {rules.map((rule) => (
            <li key={rule} className="flex items-start gap-2.5 text-[13px] leading-snug text-brand-purple-dark/75 text-pretty">
              <Icon type="solid" name="fa-circle-check" className="shrink-0 mt-0.5 text-xs text-brand-blue" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
