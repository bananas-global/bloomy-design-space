import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  TransferMap,
  TransferProfessional,
  TransferScope,
  TransfersData,
} from "../contracts/index.js";
import { formatNumericDate } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import { ErrorState, LoadingState } from "../components/primitives.js";
import { Button } from "../components/bloomy/Button.js";
import { Card } from "../components/bloomy/Card.js";
import { RadioGroup } from "../components/bloomy/Choice.js";
import { EmptyStateCard } from "../components/bloomy/Layout.js";
import { Input, Select, Switch, Textarea } from "../components/bloomy/Input.js";
import { Tag, type TagVariant } from "../components/bloomy/Tag.js";
import {
  MIN_EXCEPTION_REASON,
  applyRound,
  canApply,
  canSimulate,
  canUseFromDate,
  destinationOptions,
  evaluateBatch,
  filterMaps,
  formatHours,
  isCrossSpecialty,
  professionalOf,
  rankDestinations,
  scopeMessage,
  selectedSpecialties,
  slotLabel,
  weeklyHours,
  type TransferEvaluation,
  type TransferFit,
  type TransferListFilter,
  type TransferRound,
  type TransferSuggestion,
} from "../rules/transfers.js";

/**
 * Central de Transferências.
 *
 * Porte de "Bloomy — Central de Transferências" do projeto de design. A área é
 * **proposta**: o monólito transfere um agendamento por vez e notifica; a
 * movimentação em bloco de mapas de horas não existe lá.
 *
 * **A tela usa os componentes do sistema.** `card/1`, `input/1`, `select/1`,
 * `radio_selector/1` nas duas formas, `button/1`, `tag/1` e
 * `empty_state_card/1` — e nenhuma peça fora deles. O que sobra são duas
 * composições de utilitários, não componentes concorrentes: as linhas da lista,
 * que são uma grade de cinco colunas, e a barra de progresso das rodadas.
 *
 * Quatro coisas mudaram do desenho, e as quatro são obrigação deste repositório:
 *
 * 1. **A data de referência é declarada.** O desenho fixa `2026-08-21` numa
 *    constante do módulo; aqui ela vem de `data.today`, porque é ela que decide
 *    a primeira vigência aceita e uma tela que lê o relógio da máquina não tem
 *    critério de aceite.
 *
 * 2. **Não há botão de "volume real".** O desenho traz um interruptor que gera
 *    uma semana cheia para demonstração — com nomes montados em laço e uma
 *    fração de mapas órfãos escolhida por resto de divisão. Volume é dado de
 *    cenário: a fixture já traz o horário lotado, e ele é o mesmo em toda
 *    execução.
 *
 * 3. **A cor não identifica o profissional.** O desenho gera um matiz por
 *    pessoa a partir do índice dela na lista. Cor gerada não passa por
 *    `src/tokens/contrast.ts`, que é onde os pares deste produto são medidos, e
 *    nove matizes gerados seriam nove pares que ninguém declarou. O bloco já
 *    traz o nome do profissional escrito; o que a cor distingue aqui é o que
 *    ela precisa distinguir — mapa com responsável, mapa sem, mapa selecionado.
 *
 * 4. **Ação bloqueada continua alcançável.** Ver `AcaoIndisponivel` abaixo.
 *
 * O que **não** mudou é a espinha da área: a movimentação em rodadas, com o que
 * não coube voltando para a fila. É a decisão que separa esta tela de um
 * formulário de troca, e é o que a torna utilizável numa inativação de verdade.
 */

const VEREDITO: Record<TransferFit, { label: string; variant: TagVariant }> = {
  same: { label: "Sem mudança", variant: "brand" },
  ok: { label: "Cabe", variant: "green" },
  warn: { label: "Não cabe junto", variant: "orange" },
  bad: { label: "Não cabe", variant: "red" },
};

/**
 * Ação bloqueada: o botão do sistema, com o comportamento da decisão 0003.
 *
 * Um botão `disabled` sai da ordem de foco: quem navega por teclado nunca chega
 * nele e nunca ouve por que está bloqueado. Aqui o `Button` recebe
 * `aria-disabled` e `aria-describedby`, o clique é barrado no manipulador, e o
 * motivo fica num alvo `sr-only` — que some da vista e continua sendo lido no
 * foco, porque o mesmo motivo já aparece em vermelho junto do campo que falta.
 *
 * `Calls.tsx` tem o mesmo auxiliar, e a duplicação é deliberada por enquanto: o
 * que os dois compartilham são quatro atributos de `<button>`, não um
 * componente do sistema, e `components/bloomy/` é espelho do monólito. Quando
 * uma terceira tela precisar disto, é hora de decidir onde ele mora.
 */
function AcaoIndisponivel({
  id,
  motivo,
  onClick,
  className,
  children,
  ...resto
}: {
  id: string;
  /** Ausente, o botão funciona. Presente, ele bloqueia e explica. */
  motivo?: string;
  onClick: () => void;
  children: ReactNode;
} & Omit<React.ComponentProps<typeof Button>, "onClick" | "children" | "id">) {
  const bloqueado = Boolean(motivo);
  const idDoMotivo = bloqueado ? `${id}-motivo` : undefined;

  return (
    <span className="inline-flex max-w-full flex-col items-start gap-1">
      <Button
        id={id}
        aria-disabled={bloqueado || undefined}
        aria-describedby={idDoMotivo}
        onClick={bloqueado ? (event) => event.stopPropagation() : onClick}
        className={[className, bloqueado && "opacity-60"].filter(Boolean).join(" ") || undefined}
        {...resto}
      >
        {children}
      </Button>
      {motivo && (
        <span id={idDoMotivo} className="sr-only">
          {motivo}
        </span>
      )}
    </span>
  );
}

export function TransferCenter({ context }: ScreenProps) {
  const { data, isLoading, error } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando os mapas de horas" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const transfers = data as TransfersData | null;
  if (!transfers) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  return <TransferCenterScreen context={context} transfers={transfers} />;
}

interface Simulacao {
  destinationId: string;
  scope: TransferScope;
  fromDate: string;
  crossSpecialty: boolean;
  reason: string;
  evaluations: TransferEvaluation[];
}

function TransferCenterScreen({
  context,
  transfers,
}: {
  context: ScreenProps["context"];
  transfers: TransfersData;
}) {
  /* O estado local é semeado pela fixture e volta a ela quando a situação muda —
     é o padrão das telas que mexem no que receberam. */
  const reviewPanel = useRef<HTMLElement>(null);
  const [maps, setMaps] = useState<TransferMap[]>(transfers.maps);
  useEffect(() => setMaps(transfers.maps), [transfers.maps]);

  const [term, setTerm] = useState("");
  /* `all` é valor, e não a ausência de um. O `select/1` mostra a frase do
     `prompt` num cinza de placeholder — que é o certo para "ainda não escolhi"
     e errado aqui: "Todos os mapas" **é** o filtro em vigor, e um filtro em
     vigor não se lê como campo vazio. Com uma opção de verdade selecionada, ele
     sai no tom do dado. */
  const [professionalFilter, setProfessionalFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<NonNullable<TransferListFilter["status"]>>("all");

  const [selected, setSelected] = useState<string[]>([]);
  /* Os mapas que já mudaram de dono nesta sessão.

     `applyRound` altera `maps` na hora de cada "Aplicar" — a linha passa a
     mostrar o profissional novo e é desmarcada, e é só isso que acontece na
     tela. Quem estava olhando a lista não distingue "transferi" de "desmarquei
     sem querer", e a pergunta "eles somem da lista?" apareceu três vezes na
     revisão. Guardar os ids custa uma linha e deixa a linha dizer o que
     aconteceu com ela. */
  const [transferidos, setTransferidos] = useState<string[]>([]);
  /* Pedidas pelo "Sugerir", e não permanentes: o painel já é denso. Some
     sozinho quando a seleção muda, porque toda mudança de seleção limpa o
     destino — e a lista só é desenhada com destino escolhido. */
  const [mostrarOpcoes, setMostrarOpcoes] = useState(false);
  const [paused, setPaused] = useState(false);
  const [destinationId, setDestinationId] = useState("");
  const [scope, setScope] = useState<TransferScope>("whole");
  const [fromDate, setFromDate] = useState(transfers.today);
  useEffect(() => setFromDate(transfers.today), [transfers.today]);
  const [crossSpecialty, setCrossSpecialty] = useState(false);
  const [reason, setReason] = useState("");
  const [simulation, setSimulation] = useState<Simulacao | null>(null);
  const [rounds, setRounds] = useState<TransferRound[]>([]);
  /** O que a tela acabou de fazer, para o leitor de tela e para os olhos. */
  const [aviso, setAviso] = useState("");

  const estado: TransfersData = useMemo(() => ({ ...transfers, maps }), [transfers, maps]);

  const specialties = useMemo(
    () =>
      [...new Set(transfers.maps.map((map) => map.specialty))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [transfers.maps],
  );

  const rows = useMemo(
    () =>
      filterMaps(estado, {
        term,
        professionalId: professionalFilter === "all" ? undefined : professionalFilter,
        specialty: specialtyFilter === "all" ? undefined : specialtyFilter,
        status: statusFilter,
      }),
    [estado, term, professionalFilter, specialtyFilter, statusFilter],
  );

  const selection = useMemo(() => maps.filter((map) => selected.includes(map.id)), [maps, selected]);
  const destination = professionalOf(estado, destinationId || null);
  const specialtiesOfSelection = selectedSpecialties(selection);
  const roundSelection = selection.filter((map) => specialtyFilter === "all" || map.specialty === specialtyFilter);
  const options = destinationOptions(roundSelection, transfers.professionals);
  const exceptionInPlay = crossSpecialty;

  const simulateDecision = canSimulate({
    selection: roundSelection,
    destination,
    crossSpecialty,
    reason,
  });
  const fromDateDecision = canUseFromDate(fromDate, transfers.today);

  const moved = rounds.reduce((total, round) => total + round.moved, 0);
  const queueTotal = moved + selection.length;

  const allChecked = rows.length > 0 && rows.every((row) => selected.includes(row.id));

  /* ------------------------------------------------------------- ações */

  function alternar(id: string) {
    setDestinationId("");
    setCrossSpecialty(false);
    setReason("");
    setSimulation(null);
    setSelected((antes) =>
      antes.includes(id) ? antes.filter((item) => item !== id) : [...antes, id],
    );
  }

  function alternarVarios(ids: string[], ligado: boolean) {
    setDestinationId("");
    setCrossSpecialty(false);
    setReason("");
    setSimulation(null);
    setSelected((antes) =>
      ligado ? [...new Set([...antes, ...ids])] : antes.filter((item) => !ids.includes(item)),
    );
  }

  function alternarTodos() {
    const ids = rows.map((row) => row.id);
    alternarVarios(ids, !allChecked);
  }

  function escolherDestino(id: string) {
    setDestinationId(id);
    setSimulation(null);
  }

  function sugerir() {
    const [sugestao] = rankDestinations(roundSelection, estado, exceptionInPlay);
    if (!sugestao) {
      setAviso(
        exceptionInPlay
          ? "Nenhum profissional elegível para esta seleção."
          : `Nenhum outro profissional de ${specialtiesOfSelection[0]} disponível. Marque a exceção para ver outras especialidades.`,
      );
      return;
    }
    escolherDestino(sugestao.professional.id);
    setMostrarOpcoes(true);
    setAviso(
      `Sugestão aplicada: ${sugestao.professional.name}, com ${sugestao.fits} de ${roundSelection.length} mapas sem conflito.`,
    );
  }

  function simular() {
    if (!destination || !simulateDecision.allowed || (scope === "from" && !fromDateDecision.allowed)) return;
    setSimulation({
      destinationId: destination.id,
      scope,
      fromDate: scope === "whole" ? transfers.today : fromDate,
      crossSpecialty: isCrossSpecialty(roundSelection, destination),
      reason: reason.trim(),
      evaluations: evaluateBatch(roundSelection, destination, maps),
    });
  }

  function aplicar() {
    if (!simulation) return;
    const destino = professionalOf(estado, simulation.destinationId);
    if (!destino) return;
    const decisao = canApply(simulation.evaluations);
    if (!decisao.allowed) return;

    const resultado = applyRound(estado, simulation.evaluations, {
      destination: destino,
      scope: simulation.scope,
      fromDate: simulation.fromDate,
      crossSpecialty: simulation.crossSpecialty,
      reason: simulation.reason,
    });

    setMaps(resultado.maps);
    setTransferidos((antes) => [...new Set([...antes, ...resultado.movedIds])]);
    setRounds((antes) => [...antes, { ...resultado.round, left: selection.length - resultado.movedIds.length - simulation.evaluations.filter((item) => item.fit === "same").length }]);
    const resolved = [...resultado.movedIds, ...simulation.evaluations.filter((item) => item.fit === "same").map((item) => item.map.id)];
    const pending = selected.filter((id) => !resolved.includes(id));
    setSelected(pending);
    setSimulation(null);
    setDestinationId("");
    setCrossSpecialty(false);
    setReason("");

    const movidos = resultado.round.moved;
    const restantes = pending.length;
    setAviso(
      restantes > 0
        ? `${movidos} mapa${movidos === 1 ? "" : "s"} transferido${movidos === 1 ? "" : "s"} para ${destino.name}. ${restantes} continua${restantes === 1 ? "" : "m"} na fila — escolha o próximo destino.`
        : `Movimentação concluída: ${movidos + moved} mapa${movidos + moved === 1 ? "" : "s"} transferido${movidos + moved === 1 ? "" : "s"} em ${rounds.length + 1} rodada${rounds.length === 0 ? "" : "s"}.`,
    );
  }

  function reiniciar() {
    setPaused(false);
    setSelected([]);
    setTransferidos([]);
    setSimulation(null);
    setDestinationId("");
    setRounds([]);
    setCrossSpecialty(false);
    setReason("");
    setAviso("");
  }

  /* ------------------------------------------------------------ desenho */

  return wrap(
    context,
    <div className="space-y-4">
      <p role="status" aria-live="polite" className="sr-only">
        {aviso}
      </p>

      <div className="grid items-start gap-4 @desktop:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card id="transfers-card" className="overflow-hidden">
          <header className="mb-6">
            <p aria-hidden="true" className="m-0 text-2xl font-bold text-navy">Central de transferências</p>
            <p className="m-0 mt-2 text-sm text-[var(--fg-2)]">Movimente mapas de horas entre profissionais. Mapas sem profissional aparecem aqui também.</p>
          </header>
          <Filtros
            term={term}
            onTerm={setTerm}
            professionalFilter={professionalFilter}
            onProfessional={setProfessionalFilter}
            professionals={transfers.professionals}
            specialtyFilter={specialtyFilter}
            onSpecialty={(value) => { setSpecialtyFilter(value); setDestinationId(""); setSimulation(null); setCrossSpecialty(false); setReason(""); }}
            specialties={specialties}
            statusFilter={statusFilter}
            onStatus={setStatusFilter}
          />

          {/* A lista é uma peça fechada: moldura própria, cabeçalho de seleção
              colado no topo dela e as linhas dentro. No desenho anterior os
              filtros e a lista eram faixas soltas separadas por `border-b`, e
              não dava para ver onde a seleção começava a valer. A moldura
              responde essa pergunta sem texto. */}
          <div className="overflow-hidden rounded-xl border border-[var(--color-brand-purple-dark)]/10">
            <div className="flex flex-wrap items-center gap-3 bg-[var(--color-brand-blue)]/20 px-4 py-1">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[var(--color-neutral-900)]">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={alternarTodos}
                  disabled={rows.length === 0}
                  className="h-4 w-4 shrink-0 rounded border-2 border-[var(--color-brand-purple-dark)]/60 accent-[var(--color-brand-blue-dark)]"
                />
                Selecionar todos
              </label>
              <span className="text-sm text-[var(--color-neutral-700)]">
                {rows.length} mapa{rows.length === 1 ? "" : "s"} · {selected.length} selecionado
                {selected.length === 1 ? "" : "s"}
              </span>
              {selection.length > 0 && (
                <Button className="@desktop:hidden" variant="outline" onClick={() => { reviewPanel.current?.scrollIntoView({ block: "start" }); reviewPanel.current?.focus({ preventScroll: true }); }}>
                  Revisar {selection.length} mapas
                </Button>
              )}
            </div>

            {rows.length === 0 ? (
              <EmptyStateCard
                icon="fa-filter-circle-xmark"
                text="Nenhum mapa com esses filtros"
              >
                <p className="m-0 text-sm">
                  A lista mostra todos os mapas da unidade, com e sem profissional.
                </p>
              </EmptyStateCard>
            ) : (
              <ul className="m-0 list-none p-0" data-transfer-view="list">
                {rows.map((map) => (
                  <LinhaDoMapa
                    key={map.id}
                    map={map}
                    professional={professionalOf(estado, map.professionalId)}
                    checked={selected.includes(map.id)}
                    transferido={transferidos.includes(map.id)}
                    onToggle={() => alternar(map.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </Card>

        <aside ref={reviewPanel} tabIndex={-1} aria-label="Revisão da transferência" className="min-w-0 scroll-mt-24 @desktop:sticky @desktop:top-4">
          <Card className="p-0! flex-col">
            {paused ? (
              <div className="flex flex-col gap-4 p-6">
                <p className="m-0 font-extrabold">Movimentação pausada · {selection.length} {selection.length === 1 ? "mapa pendente" : "mapas pendentes"}</p>
                <p className="m-0 text-sm">A seleção fica nesta página. Retome antes de sair.</p>
                <Button onClick={() => setPaused(false)}>Retomar {selection.length} {selection.length === 1 ? "mapa pendente" : "mapas pendentes"}</Button>
              </div>
            ) : selection.length === 0 && rounds.length > 0 ? (
              <FilaZerada moved={moved} rounds={rounds} onRestart={reiniciar} />
            ) : selection.length === 0 ? (
              <EmptyStateCard icon="fa-hand-pointer" text="Selecione os mapas a movimentar">
                <p className="m-0 text-sm">
                  Cada rodada leva o que cabe num profissional e devolve o resto à
                  fila.
                </p>
              </EmptyStateCard>
            ) : (
              <>
                <div className="space-y-2 border-b border-[var(--color-brand-purple-dark)]/10 p-6">
                  <p className="m-0 text-base font-extrabold text-[var(--color-brand-purple-dark)]">
                    {rounds.length > 0
                      ? `Na fila: ${selection.length} de ${queueTotal} mapas`
                      : `${selection.length} mapa${selection.length === 1 ? "" : "s"} selecionado${selection.length === 1 ? "" : "s"}`}
                  </p>
                  {rounds.length > 0 && (
                    <div className="mt-3">
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-brand-purple-dark)]/10"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={queueTotal}
                        aria-valuenow={moved}
                        aria-label="Mapas já transferidos nesta movimentação"
                      >
                        <span
                          className="block h-full rounded-full bg-[var(--color-brand-green-dark)]"
                          style={{ width: `${(moved / Math.max(1, queueTotal)) * 100}%` }}
                        />
                      </div>
                      <p className="m-0 mt-1 text-xs font-bold text-[var(--color-neutral-700)]">
                        {moved} transferido{moved === 1 ? "" : "s"} · rodada {rounds.length + 1}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-col gap-6 p-6">
                  {rounds.length > 0 && !simulation && (
                    <RodadasAnteriores rounds={rounds} left={selection.length} />
                  )}

                  {selection.length > roundSelection.length && (
                    <p className="m-0 text-sm">{roundSelection.length} mapas nesta rodada · {selection.length - roundSelection.length} de outras especialidades na fila.</p>
                  )}
                  {roundSelection.length > 0 && <Destino
                    selection={roundSelection}
                    specialtiesOfSelection={selectedSpecialties(roundSelection)}
                    options={options}
                    professionals={transfers.professionals}
                    exceptionInPlay={exceptionInPlay}
                    destinationId={destinationId}
                    crossSpecialty={crossSpecialty}
                    reason={reason}
                    onPick={escolherDestino}
                    onSuggest={sugerir}
                    ranking={rankDestinations(roundSelection, estado, exceptionInPlay)}
                    mostrarOpcoes={mostrarOpcoes}
                    onCross={(valor) => {
                      setCrossSpecialty(valor);
                      setDestinationId("");
                      setSimulation(null);
                    }}
                    onReason={(valor) => {
                      setReason(valor);
                      setSimulation(null);
                    }}
                  />}

                  <Vigencia
                    scope={scope}
                    fromDate={fromDate}
                    today={transfers.today}
                    erro={fromDateDecision.allowed ? undefined : fromDateDecision.reason}
                    destino={destination?.name}
                    onScope={(valor) => {
                      setScope(valor);
                      setSimulation(null);
                    }}
                    onFromDate={(valor) => {
                      setFromDate(valor);
                      setSimulation(null);
                    }}
                  />

                  {simulation && (
                    <Resultado
                      simulation={simulation}
                      data={estado}
                      onPrioritize={(id) => {
                        if (!destination) return;
                        setSimulation({ ...simulation, evaluations: evaluateBatch(roundSelection, destination, maps, id) });
                        setAviso("Prioridade alterada. Confira os novos resultados antes de aplicar.");
                        requestAnimationFrame(() => document.getElementById(`transfer-evaluation-${id}`)?.focus({ preventScroll: true }));
                      }}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-start justify-end gap-3 border-t border-[var(--color-brand-purple-dark)]/10 p-6">
                  <Button variant="ghost" color="brand" onClick={rounds.length > 0 ? () => setPaused(true) : reiniciar}>
                    {rounds.length > 0 ? `Pausar com ${selection.length} ${selection.length === 1 ? "pendente" : "pendentes"}` : "Limpar seleção"}
                  </Button>
                  {simulation ? (
                    <AcaoIndisponivel
                      id="transfers-aplicar"
                      className="espelho-do-sistema"
                      motivo={canApply(simulation.evaluations).reason}
                      leftIcon="fa-check"
                      onClick={aplicar}
                    >
                      {rotuloDeAplicar(simulation.evaluations, selection.length - roundSelection.length)}
                    </AcaoIndisponivel>
                  ) : (
                    <AcaoIndisponivel
                      id="transfers-simular"
                      className="espelho-do-sistema"
                      motivo={roundSelection.length === 0 ? "Selecione mapas da especialidade filtrada ou altere o filtro na lista." : scope === "from" && !fromDateDecision.allowed ? fromDateDecision.reason : simulateDecision.reason}
                      leftIcon="fa-flask"
                      onClick={simular}
                    >
                      Simular
                    </AcaoIndisponivel>
                  )}
                </div>
              </>
            )}
          </Card>
        </aside>
      </div>

    </div>,
  );
}

function rotuloDeAplicar(evaluations: TransferEvaluation[], otherPending = 0): string {
  const cabem = evaluations.filter((avaliacao) => avaliacao.fit === "ok").length;
  const restam = otherPending + evaluations.filter(
    (avaliacao) => avaliacao.fit !== "ok" && avaliacao.fit !== "same",
  ).length;
  return restam > 0
    ? `Transferir ${cabem} e manter ${restam} na fila`
    : `Aplicar em ${cabem} mapa${cabem === 1 ? "" : "s"}`;
}

/* ================================================================ filtros */

function Filtros({
  term,
  onTerm,
  professionalFilter,
  onProfessional,
  professionals,
  specialtyFilter,
  onSpecialty,
  specialties,
  statusFilter,
  onStatus,
}: {
  term: string;
  onTerm: (valor: string) => void;
  professionalFilter: string;
  onProfessional: (valor: string) => void;
  professionals: TransferProfessional[];
  specialtyFilter: string;
  onSpecialty: (valor: string) => void;
  specialties: string[];
  statusFilter: NonNullable<TransferListFilter["status"]>;
  onStatus: (valor: NonNullable<TransferListFilter["status"]>) => void;
}) {
  return (
    <div className="mb-6 grid gap-4 @tablet:grid-cols-2 @wide:grid-cols-4">
      <Input
        id="transfers-busca"
        label="Buscar"
        placeholder="Paciente ou profissional"
        leftIcon="fa-magnifying-glass"
        value={term}
        onChange={(evento) => onTerm(evento.target.value)}
      />
      <Select
        id="transfers-profissional"
        label="Profissional atual"
        prompt="Todos"
        clear={false}
        value={professionalFilter}
        options={[
          { value: "all", label: "Todos" },
          ...professionals.map((professional) => ({
            value: professional.id,
            label: professional.name,
          })),
        ]}
        onChange={(valor) => onProfessional(valor || "all")}
      />
      <Select
        id="transfers-especialidade"
        label="Especialidade"
        prompt="Todas"
        clear={false}
        value={specialtyFilter}
        options={[
          { value: "all", label: "Todas" },
          ...specialties.map((specialty) => ({ value: specialty, label: specialty })),
        ]}
        onChange={(valor) => onSpecialty(valor || "all")}
      />
      <Select
        id="transfers-situacao"
        label="Situação do mapa"
        prompt="Todos os mapas"
        clear={false}
        value={statusFilter}
        options={[
          { value: "all", label: "Todos os mapas" },
          { value: "assigned", label: "Com profissional" },
          { value: "orphan", label: "Sem profissional" },
        ]}
        onChange={(valor) =>
          onStatus((valor || "all") as NonNullable<TransferListFilter["status"]>)
        }
      />
    </div>
  );
}

/* ============================================================ lista */

function LinhaDoMapa({
  map,
  professional,
  checked,
  transferido,
  onToggle,
}: {
  map: TransferMap;
  professional: TransferProfessional | undefined;
  checked: boolean;
  /** Mudou de dono nesta sessão. */
  transferido: boolean;
  onToggle: () => void;
}) {
  const responsavel = professional
    ? `${professional.name}, ${professional.room}`
    : "sem profissional";

  return (
    <li
      data-transfer-map={map.id}
      data-transfer-orphan={professional ? undefined : "true"}
      className={[
        "border-b border-[var(--color-brand-purple-dark)]/10 last:border-b-0",
        checked ? "bg-[var(--color-brand-purple-dark)]/5 shadow-[inset_3px_0_0_var(--color-brand-blue-dark)]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <label className="grid cursor-pointer grid-cols-[1rem_minmax(0,1fr)] items-start gap-3 p-4 @tablet:grid-cols-[1rem_minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_auto]">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`${map.patient}, ${map.specialty}, ${responsavel}`}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-[var(--color-brand-purple-dark)]/60 accent-[var(--color-brand-blue-dark)]"
        />

        <div className="min-w-0">
          <p className="m-0 break-words text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
            {map.patient}
          </p>
          <p className="m-0 text-xs text-[var(--color-neutral-700)]">
            {map.specialty} · desde {formatNumericDate(map.since)}
          </p>
        </div>

        <div className="min-w-0">
          {professional ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="m-0 break-words text-sm font-bold text-[var(--color-brand-purple-dark)]">
                  {professional.name}
                </p>
                {/* O único sinal de que a rodada mexeu nesta linha. Fica até
                    "Nova movimentação", porque a pergunta que ele responde —
                    "o que eu acabei de transferir?" — continua valendo depois
                    de a fila zerar. */}
                {transferido && <Tag item="Transferido" variant="green" />}
              </div>
              <p className="m-0 text-xs text-[var(--color-neutral-700)]">{professional.room}</p>
            </>
          ) : (
            <>
              <Tag variant="orange" icon="fa-user-slash" item="Sem profissional" />
              {map.reason && (
                <p className="m-0 mt-1 text-xs text-[var(--color-neutral-700)]">
                  {/* Quem deixou o mapa vem junto do motivo. Sem o nome, "escala
                      alterada" não diz de quem, e é o nome que a coordenação
                      procura na busca. */}
                  {map.leftBy ? `${map.reason} · ${map.leftBy}` : map.reason}
                </p>
              )}
            </>
          )}
        </div>

        {/* `tag/1` na variante neutra, e não um `span` pintado à mão.
            A linha já mostra "Sem profissional" como etiqueta do sistema; o
            horário ao lado era outra etiqueta com outra régua — 12px em negrito
            sobre 10% de navy, contra os 14px semibold sobre 8% da variante
            `brand`. Duas etiquetas lado a lado com dois tamanhos e dois cinzas
            leem como dois significados, e aqui só há um. */}
        <div className="flex flex-wrap gap-1">
          {map.slots.map((slot) => (
            <Tag key={`${slot.weekday}-${slot.start}`} variant="brand" item={slotLabel(slot)} />
          ))}
        </div>

        <div className="text-sm font-extrabold text-[var(--color-brand-purple-dark)] @tablet:text-right">
          {formatHours(weeklyHours(map.slots))}
          <span className="block text-xs font-normal text-[var(--color-neutral-700)]">
            por semana
          </span>
        </div>
      </label>
    </li>
  );
}

function RodadasAnteriores({ rounds, left }: { rounds: TransferRound[]; left: number }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 rounded-xl bg-[var(--color-brand-orange)]/15 p-3">
      <Icon name="fa-arrow-rotate-right" className="mt-0.5 text-[var(--color-warn-fg)]" />
      <div>
        <p className="m-0 text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
          {left} mapa{left === 1 ? "" : "s"} ainda na fila
        </p>
        <p className="m-0 mt-1 text-sm text-[var(--color-neutral-700)]">
          Escolha outro profissional para a próxima rodada. O que couber sai da fila; o resto
          continua aqui.
        </p>
        <ListaDeRodadas rounds={rounds} />
      </div>
    </div>
  );
}

function ListaDeRodadas({ rounds }: { rounds: TransferRound[] }) {
  return (
    <ol className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
      {rounds.map((round, indice) => (
        <li
          key={`${round.destinationId}-${indice}`}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg bg-white p-2"
        >
          <span className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full bg-[var(--color-brand-purple-dark)]/8 text-xs font-extrabold text-[var(--color-neutral-700)]">
            {indice + 1}
          </span>
          <span className="min-w-0">
            <span className="block break-words text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
              {round.destinationName}
            </span>
            <span className="block text-xs text-[var(--color-neutral-700)]">
              {round.moved} mapa{round.moved === 1 ? "" : "s"}
              {round.fromDate
                ? ` · a partir de ${formatNumericDate(round.fromDate)}`
                : ""}
              {round.crossSpecialty ? " · exceção de especialidade" : ""}
              {round.reason && <span className="block mt-1">Motivo: {round.reason}</span>}
            </span>
          </span>
          <Icon name="fa-circle-check" className="text-[var(--color-green-dark)]" />
        </li>
      ))}
    </ol>
  );
}

function FilaZerada({
  moved,
  rounds,
  onRestart,
}: {
  moved: number;
  rounds: TransferRound[];
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col items-center p-6 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-brand-green)]/20 text-lg text-[var(--color-green-dark)]">
        <Icon name="fa-flag-checkered" />
      </span>
      {/* "Fila zerada" mais "movimentados" descrevia o fim de uma conta, não o
          estado do mundo, e quem chegava aqui perguntava se era prévia. Cada
          "Aplicar" já gravou — `applyRound` reescreve os mapas na hora —, então
          o texto está no passado e diz onde os mapas foram parar. */}
      <p className="m-0 mt-3 text-base font-extrabold text-[var(--color-brand-purple-dark)]">
        Transferências aplicadas
      </p>
      <p className="m-0 text-sm text-[var(--color-neutral-700)]">
        {moved} mapa{moved === 1 ? "" : "s"} já {moved === 1 ? "está" : "estão"} com{" "}
        {rounds.length === 1 ? "o novo profissional" : "os novos profissionais"}, em {rounds.length}{" "}
        rodada{rounds.length === 1 ? "" : "s"}. A lista continua mostrando todos os mapas da
        unidade, agora com os responsáveis atualizados.
      </p>
      <div className="w-full text-left">
        <ListaDeRodadas rounds={rounds} />
      </div>
      <Button className="espelho-do-sistema mt-4" leftIcon="fa-rotate-right" onClick={onRestart}>
        Nova movimentação
      </Button>
    </div>
  );
}

function Destino({
  selection,
  specialtiesOfSelection,
  options,
  professionals,
  exceptionInPlay,
  destinationId,
  crossSpecialty,
  reason,
  onPick,
  onSuggest,
  ranking,
  mostrarOpcoes,
  onCross,
  onReason,
}: {
  selection: TransferMap[];
  specialtiesOfSelection: string[];
  options: { same: TransferProfessional[]; others: TransferProfessional[] };
  professionals: TransferProfessional[];
  exceptionInPlay: boolean;
  destinationId: string;
  crossSpecialty: boolean;
  reason: string;
  onPick: (id: string) => void;
  onSuggest: () => void;
  ranking: TransferSuggestion[];
  mostrarOpcoes: boolean;
  onCross: (valor: boolean) => void;
  onReason: (valor: string) => void;
}) {
  const elegiveis = professionals.filter(
    (professional) => !selection.every((map) => map.professionalId === professional.id),
  );
  const lista = exceptionInPlay ? elegiveis : options.same;
  const faltaMotivo = exceptionInPlay && reason.trim().length < MIN_EXCEPTION_REASON;
  const especialidadesMisturadas = specialtiesOfSelection.length > 1;
  const semDestinoNaEspecialidade = !exceptionInPlay && options.same.length === 0;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* O bloco da exceção: título, o porquê, a chave e — ligada — o motivo,
          tudo numa moldura só.

          A chave é o `switch/1` do sistema (`Switch`, em `bloomy/Input.tsx`),
          não uma caixa de marcar. **Eu havia dito que o sistema não tinha
          interruptor; tinha** — `Switch`, `SwitchCard` e `InputSwitchCard`
          moram no `Input.tsx`, junto das outras cláusulas de `input/1`, e não
          no `Choice.tsx` onde procurei.

          Não é `SwitchCard` porque ele não tem lugar para o campo: o desenho põe
          o motivo dentro da mesma moldura, e `switch_card/1` é título,
          descrição e chave, e só. A moldura aqui é composta como a do desenho,
          em volta do controle do sistema.

          O tingido acompanha a chave, como em `switch_card/1` — ligada, azul de
          marca a 10% com fio a 50%; desligada, navy a 5% e **sem fio**. Os dois
          estados vieram desenhados, e o desligado é o mesmo par que
          `switch_card/1` já usava: fundo neutro, borda transparente.

          A borda continua declarada quando desligada, só que transparente. Sem
          isso a caixa perde 2px de cada lado ao alternar, e o conteúdo abaixo
          pula na hora de ligar a exceção.

          Vem **antes** da escolha do profissional porque é ela que decide quais
          profissionais a lista oferece — `lista`, acima, lê `exceptionInPlay`. */}
      <div
        className={[
          "flex flex-col gap-4 rounded-2xl border p-5 transition-colors",
          exceptionInPlay
            ? "border-[var(--color-brand-blue)]/50 bg-[var(--color-brand-blue)]/10"
            : "border-transparent bg-[var(--color-brand-purple-dark)]/5",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {/* `htmlFor` e não um `<label>` em volta de tudo: o `Switch` já traz
                o rótulo implícito dele, e rótulo dentro de rótulo é HTML
                inválido. Assim o título continua clicando a chave. */}
            <label
              htmlFor="transfers-excecao"
              className="m-0 block cursor-pointer text-base font-bold text-[var(--color-brand-purple-dark)]"
            >
              Exceção: permitir profissional de outra especialidade
            </label>
            <p className="m-0 mt-0.5 text-sm text-[var(--fg-2)]">
              {semDestinoNaEspecialidade
                ? especialidadesMisturadas
                  ? "A seleção reúne especialidades diferentes. Sem a exceção, filtre por especialidade na lista."
                  : `Nenhum outro profissional de ${specialtiesOfSelection[0]} disponível para esta seleção.`
                : "Fora do padrão da clínica. O motivo fica no histórico do mapa."}
            </p>
          </div>
          <Switch id="transfers-excecao" checked={crossSpecialty} onChange={onCross} />
        </div>

        {exceptionInPlay && (
          <Textarea
            className="[&>p]:static [&>p_span]:line-clamp-none"
            id="transfers-motivo"
            label="Motivo da exceção"
            placeholder="Por que esta transferência sai da especialidade"
            rows={3}
            value={reason}
            onChange={(evento) => onReason(evento.target.value)}
            /* Vazio é "ainda não escrevi", e não "escrevi errado". A contagem só
               aparece depois da primeira tecla; antes dela, quem explica o
               bloqueio é o botão de simular. */
            errors={
              faltaMotivo && reason.trim().length > 0
                ? [
                    `Faltam ${MIN_EXCEPTION_REASON - reason.trim().length} caractere${
                      MIN_EXCEPTION_REASON - reason.trim().length === 1 ? "" : "s"
                    } para o motivo valer.`,
                  ]
                : []
            }
          />
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          className="min-w-0 flex-[1_1_14rem]"
          id="transfers-destino"
          label={
            exceptionInPlay
              ? "Transferir para (qualquer especialidade)"
              : specialtiesOfSelection.length > 1 ? "Transferir para" : `Transferir para — ${specialtiesOfSelection[0]}`
          }
          prompt="Escolher profissional…"
          value={destinationId}
          options={lista.map((professional) => ({
            value: professional.id,
            label: exceptionInPlay
              ? `${professional.name} · ${professional.specialty}`
              : `${professional.name} · ${professional.room}`,
          }))}
          onChange={onPick}
        />
        {/* Sem `espelho-do-sistema`. A marcação existe para tirar da varredura
            de acessibilidade o que copia um par reprovado do produto, e este
            botão deixou de copiar um: em `outline` ele era o azul de marca sobre
            branco, 2,47:1; em `tint` é `blue-dark` sobre `blue-light`, 5,25:1.
            Passou AA, então sai da exclusão e volta a ser varrido como o
            resto da tela. Medido em `tests/e2e/contraste.spec.ts`. */}
        <Button
          id="transfers-sugerir"
          className="shrink-0"
          variant="tint"
          leftIcon="fa-wand-magic-sparkles"
          onClick={onSuggest}
        >
          Sugerir
        </Button>
      </div>

      {/* A tabela que o cálculo já produzia e a tela jogava fora.

          `rankDestinations` pontua todos os elegíveis — quantos mapas cabem,
          quanto cada um já carrega — e antes disto só o primeiro colocado
          chegava à tela. Quem quisesse saber do segundo escolhia, simulava e
          recomeçava; era o "testar um a um".

          "Sugerir" continua fazendo o que fazia: escolhe o melhor. A diferença
          é que agora ele **mostra o resto junto**, e trocar de destino é um
          clique em vez de outra rodada. Aparece só quando pedido, e some quando
          a seleção muda — toda mudança de seleção limpa o destino.

          Com um candidato só não há o que comparar, e a frase de sempre serve
          melhor que uma lista de um item. */}
      {mostrarOpcoes && destinationId && ranking.length > 1 ? (
        <div>
          <p className="m-0 mb-2 text-sm font-bold text-[var(--color-brand-purple-dark)]">
            Quem absorve mais desta seleção
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {ranking.slice(0, 5).map((opcao) => {
              const escolhido = opcao.professional.id === destinationId;
              return (
                <li key={opcao.professional.id}>
                  <button
                    type="button"
                    aria-pressed={escolhido}
                    onClick={() => onPick(opcao.professional.id)}
                    className={[
                      "flex min-h-11 w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-left",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]",
                      escolhido
                        ? "border-[var(--color-brand-blue)]/50 bg-[var(--color-brand-blue)]/10"
                        : "border-[var(--color-brand-purple-dark)]/15 bg-white hover:bg-[var(--color-brand-purple-dark)]/4",
                    ].join(" ")}
                  >
                    <span className="min-w-0">
                      <span className="block break-words text-sm font-bold text-[var(--color-brand-purple-dark)]">
                        {opcao.professional.name}
                      </span>
                      <span className="block text-xs text-[var(--color-neutral-700)]">
                        {opcao.professional.specialty}
                        {!opcao.sameSpecialty && " · exceção"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
                        {opcao.fits} de {selection.length} {opcao.fits === 1 ? "cabe" : "cabem"}
                      </span>
                      <span className="block text-xs text-[var(--color-neutral-700)]">
                        {formatHours(opcao.load)} já agendadas
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        ranking[0] && destinationId === ranking[0].professional.id && (
          <p className="m-0 text-sm text-[var(--color-neutral-700)]">
            {ranking[0].professional.name} recebe {ranking[0].fits} de {selection.length} mapas sem conflito.
          </p>
        )
      )}

    </div>
  );
}

function Vigencia({
  scope,
  fromDate,
  today,
  erro,
  destino,
  onScope,
  onFromDate,
}: {
  scope: TransferScope;
  fromDate: string;
  today: string;
  erro?: string;
  /** Nome do destino escolhido, quando já há um. */
  destino?: string;
  onScope: (valor: TransferScope) => void;
  onFromDate: (valor: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 border-t border-[var(--color-brand-purple-dark)]/10 pt-6">
      <RadioGroup
        label="Vigência"
        name="transfers[scope]"
        value={scope}
        options={[
          { value: "whole", label: "Desde hoje" },
          { value: "from", label: "A partir de" },
        ]}
        onChange={(valor) => onScope(valor as TransferScope)}
      />
      {scope === "from" && (
        <Input
          className="[&>p]:static [&>p_span]:line-clamp-none"
          id="transfers-vigencia"
          label="Primeiro dia com o novo profissional"
          type="date"
          min={today}
          value={fromDate}
          errors={erro ? [erro] : []}
          onChange={(evento) => onFromDate(evento.target.value)}
        />
      )}
      {/* O destino entra nesta frase em vez de ter um parágrafo só dele no
          resultado. É a mesma sentença — "para quem" e "a partir de quando" são
          a mesma decisão —, e escrita uma vez ela para de aparecer duas. */}
      <p className="m-0 text-sm text-[var(--color-neutral-700)]">
        {destino && <span className="font-bold text-[var(--color-brand-purple-dark)]">Para {destino} · </span>}
        {scopeMessage(scope, scope === "whole" ? today : fromDate)}
      </p>
    </div>
  );
}

function Resultado({
  simulation,
  data,
  onPrioritize,
}: {
  onPrioritize: (id: string) => void;
  simulation: Simulacao;
  data: TransfersData;
}) {
  const [filter, setFilter] = useState<"all" | TransferFit | "exception">("all");
  useEffect(() => setFilter("all"), [simulation]);
  const destino = professionalOf(data, simulation.destinationId);
  const isException = (item: TransferEvaluation) =>
    simulation.crossSpecialty && item.fit !== "same" && destino !== undefined && item.map.specialty !== destino.specialty;
  const filters: { value: typeof filter; label: string; count: number }[] = [
    { value: "all", label: "Todos", count: simulation.evaluations.length },
    ...(["ok", "warn", "bad", "same"] as TransferFit[]).map((fit) => ({
      value: fit, label: VEREDITO[fit].label,
      count: simulation.evaluations.filter((item) => item.fit === fit).length,
    })),
    ...(simulation.crossSpecialty ? [{ value: "exception" as const, label: "Exceção", count: simulation.evaluations.filter(isException).length }] : []),
  ];
  const visible = simulation.evaluations.filter((item) =>
    filter === "all" || (filter === "exception" ? isException(item) : item.fit === filter),
  );

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="m-0 text-sm font-extrabold">Resumo da simulação</p>
        <div role="group" aria-label="Filtrar resultados da simulação" className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              aria-controls="transfers-resultados"
              onClick={() => setFilter(item.value)}
              className={`min-h-9 rounded-full border px-3 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)] ${filter === item.value
                ? "border-[var(--color-brand-purple-dark)] bg-[var(--color-brand-purple-dark)] text-white"
                : "border-[var(--color-brand-purple-dark)]/15 bg-[var(--color-brand-purple-dark)]/4 text-[var(--color-brand-purple-dark)]"}`}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>
      </div>
      <ul id="transfers-resultados" className="m-0 flex list-none flex-col gap-2 p-0">
        {visible.map((item) => {
          const { map, fit, issues } = item;
          const veredito = VEREDITO[fit];
          return (
            <li
              key={map.id}
              id={`transfer-evaluation-${map.id}`}
              tabIndex={-1}
              data-transfer-fit={fit}
              data-transfer-evaluation={map.id}
              className="rounded-xl border border-[var(--color-brand-purple-dark)]/15 bg-white p-3 focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-action)]"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <div className="min-w-0 flex-[1_1_12rem]">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="m-0 text-sm font-extrabold text-[var(--color-brand-purple-dark)]">{map.patient}</p>
                    <Tag item={veredito.label} variant={veredito.variant} />
                    {isException(item) && <Tag item="Exceção" variant="orange" />}
                  </div>
                  <p className="m-0 mt-1 text-xs text-[var(--color-neutral-700)]">
                    {fit === "same"
                      ? "Já é o responsável — nada muda neste mapa"
                      : issues.length === 0
                        ? `${formatHours(weeklyHours(map.slots))} mantidas nos mesmos horários`
                        : issues.map((issue) => issue.text).join(" · ")}
                  </p>
                </div>
                {fit === "warn" && issues.every((issue) => issue.kind === "batch") && (
                  <Button className="ml-auto shrink-0" variant="tint" onClick={() => { setFilter("all"); onPrioritize(map.id); }} aria-label={`Priorizar ${map.patient}`}>Priorizar</Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && <p className="m-0 text-sm">Nenhum mapa com este status. Escolha outro filtro para ver os resultados.</p>}
    </>
  );
}

/* ================================================================== moldura */

function wrap(
  context: ScreenProps["context"],
  children: ReactNode,
) {
  return (
    <AppShell
      context={context}
      title="Central de transferências"
      showPageHeading={false}
      breadcrumb={[{ label: "Central de transferências" }]}
    >
      {children}
    </AppShell>
  );
}
