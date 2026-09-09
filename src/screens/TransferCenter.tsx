import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  TransferMap,
  TransferProfessional,
  TransferScope,
  TransferWeekday,
  TransfersData,
} from "../contracts/index.js";
import { formatNumericDate } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import { ErrorState, LoadingState } from "../components/primitives.js";
import { Button } from "../components/bloomy/Button.js";
import { Card } from "../components/bloomy/Card.js";
import { RadioGroup, RadioSelector } from "../components/bloomy/Choice.js";
import { EmptyStateCard } from "../components/bloomy/Layout.js";
import { Input, Select } from "../components/bloomy/Input.js";
import { Modal } from "../components/bloomy/Overlay.js";
import { Tag, type TagVariant } from "../components/bloomy/Tag.js";
import {
  MIN_EXCEPTION_REASON,
  WEEKDAYS,
  WEEKDAY_LABEL,
  agendaBlocks,
  applyRound,
  canApply,
  canSimulate,
  canUseFromDate,
  destinationOptions,
  evaluateBatch,
  filterMaps,
  formatHours,
  isCrossSpecialty,
  mapsWithoutProfessional,
  professionalOf,
  roomImpact,
  scopeMessage,
  selectedSpecialties,
  sessionsByWeekday,
  slotLabel,
  suggestDestination,
  toMinutes,
  weeklyHours,
  type AgendaCluster,
  type TransferEvaluation,
  type TransferFit,
  type TransferListFilter,
  type TransferRound,
} from "../rules/transfers.js";

/**
 * Central de Transferências.
 *
 * Porte de "Bloomy — Central de Transferências" do projeto de design. A área é
 * **proposta**: o monólito transfere um agendamento por vez e notifica; a
 * movimentação em bloco de mapas de horas não existe lá.
 *
 * **A tela usa os componentes do sistema.** `card/1`, `input/1`, `select/1`,
 * `radio_selector/1` nas duas formas, `button/1`, `tag/1`, `modal/1` e
 * `empty_state_card/1`. Sobra uma peça, e ela está nomeada onde aparece: a
 * grade da semana, que é desenho desta área e não tem espelho no monólito.
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

/** A faixa da grade. A unidade abre às 8h e fecha às 18h30. */
const HORA_INICIAL = 8;
const HORA_FINAL = 18;
/**
 * Altura de uma hora, em pixels.
 *
 * O desenho usa 54, e nele o bloco-resumo de uma faixa de uma hora corta as
 * próprias etiquetas: contagem, horário e a contagem por especialidade não
 * cabem em 54px com recuo. 72 é o que faz as três linhas caberem — e a maior
 * parte dos mapas da clínica é de uma hora, então é o caso comum que decide.
 */
const ALTURA_DA_HORA = 72;

const topoDe = (time: string) => ((toMinutes(time) - HORA_INICIAL * 60) / 60) * ALTURA_DA_HORA;
const alturaDe = (start: string, end: string) =>
  Math.max(26, ((toMinutes(end) - toMinutes(start)) / 60) * ALTURA_DA_HORA);

const VEREDITO: Record<TransferFit, { label: string; variant: TagVariant; icon: string }> = {
  same: { label: "Sem mudança", variant: "brand", icon: "fa-equals" },
  ok: { label: "Cabe", variant: "green", icon: "fa-circle-check" },
  warn: { label: "Não cabe junto", variant: "orange", icon: "fa-triangle-exclamation" },
  bad: { label: "Não cabe", variant: "red", icon: "fa-circle-xmark" },
};

const MOLDURA_DO_VEREDITO: Record<TransferFit, string> = {
  same: "border-[var(--color-brand-purple-dark)]/15 bg-[var(--color-brand-purple-dark)]/4",
  ok: "border-[var(--color-brand-green)]/50 bg-[var(--color-brand-green)]/8",
  warn: "border-[var(--color-brand-orange)]/55 bg-[var(--color-brand-orange)]/10",
  bad: "border-[var(--color-red)]/45 bg-[var(--color-red)]/8",
};

const PASSOS = ["Selecionar", "Destino", "Simular", "Aplicar"] as const;

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
  const [view, setView] = useState<"list" | "agenda">("list");

  const [selected, setSelected] = useState<string[]>([]);
  const [destinationId, setDestinationId] = useState("");
  const [scope, setScope] = useState<TransferScope>("whole");
  const [fromDate, setFromDate] = useState(transfers.today);
  useEffect(() => setFromDate(transfers.today), [transfers.today]);
  const [crossSpecialty, setCrossSpecialty] = useState(false);
  const [reason, setReason] = useState("");
  const [simulation, setSimulation] = useState<Simulacao | null>(null);
  const [rounds, setRounds] = useState<TransferRound[]>([]);
  const [cluster, setCluster] = useState<AgendaCluster | null>(null);
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

  const blocks = useMemo(() => agendaBlocks(rows), [rows]);
  const sessions = useMemo(() => sessionsByWeekday(rows), [rows]);

  const selection = useMemo(() => maps.filter((map) => selected.includes(map.id)), [maps, selected]);
  const destination = professionalOf(estado, destinationId || null);
  const orphans = mapsWithoutProfessional(estado);
  const specialtiesOfSelection = selectedSpecialties(selection);
  const options = useMemo(
    () => destinationOptions(selection, transfers.professionals),
    [selection, transfers.professionals],
  );
  const mixed = specialtiesOfSelection.length > 1;
  /* A exceção está em jogo quando alguém a marcou ou quando a seleção é mista —
     e **não** quando simplesmente não há outro profissional da especialidade.
     Esse terceiro caso é o mais comum e foi o mais tentador de automatizar: a
     única psicopedagoga da unidade não tem par, então por que pedir um clique?
     Porque sair da especialidade é decisão clínica, e a tela que a toma sozinha
     transforma um desvio em consequência de um filtro. Sem par, a tela **diz**
     que não há par; abrir as outras especialidades continua sendo um ato. */
  const exceptionInPlay = crossSpecialty || mixed;

  const simulateDecision = canSimulate({
    selection,
    destination,
    crossSpecialty,
    reason,
  });
  const fromDateDecision = canUseFromDate(fromDate, transfers.today);

  const moved = rounds.reduce((total, round) => total + round.moved, 0);
  const queueTotal = moved + selection.length;
  const step =
    selection.length === 0 ? 1 : !destination ? 2 : !simulation ? 3 : 4;

  const impact = useMemo(() => {
    if (!simulation) return [];
    const destino = professionalOf(estado, simulation.destinationId);
    if (!destino) return [];
    return roomImpact(estado, simulation.evaluations, destino);
  }, [estado, simulation]);

  const allChecked = rows.length > 0 && rows.every((row) => selected.includes(row.id));

  /* ------------------------------------------------------------- ações */

  function alternar(id: string) {
    setSimulation(null);
    setSelected((antes) =>
      antes.includes(id) ? antes.filter((item) => item !== id) : [...antes, id],
    );
  }

  function alternarVarios(ids: string[], ligado: boolean) {
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
    const sugestao = suggestDestination(selection, estado, exceptionInPlay);
    if (!sugestao) {
      setAviso(
        exceptionInPlay
          ? "Nenhum profissional elegível para esta seleção."
          : `Nenhum outro profissional de ${specialtiesOfSelection[0]} disponível. Marque a exceção para ver outras especialidades.`,
      );
      return;
    }
    escolherDestino(sugestao.professional.id);
    setAviso(
      `Sugestão aplicada: ${sugestao.professional.name}, com ${sugestao.fits} de ${selection.length} mapas sem conflito.`,
    );
  }

  function simular() {
    if (!destination || !simulateDecision.allowed) return;
    setSimulation({
      destinationId: destination.id,
      scope,
      fromDate,
      crossSpecialty: isCrossSpecialty(selection, destination),
      reason: reason.trim(),
      evaluations: evaluateBatch(selection, destination, maps),
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
    });

    setMaps(resultado.maps);
    setRounds((antes) => [...antes, resultado.round]);
    setSelected((antes) => antes.filter((id) => !resultado.movedIds.includes(id)));
    setSimulation(null);
    setDestinationId("");
    setCrossSpecialty(false);
    setReason("");

    const { moved: movidos, left: restantes } = resultado.round;
    setAviso(
      restantes > 0
        ? `${movidos} mapa${movidos === 1 ? "" : "s"} transferido${movidos === 1 ? "" : "s"} para ${destino.name}. ${restantes} continua${restantes === 1 ? "" : "m"} na fila — escolha o próximo destino.`
        : `Movimentação concluída: ${movidos + moved} mapa${movidos + moved === 1 ? "" : "s"} transferido${movidos + moved === 1 ? "" : "s"} em ${rounds.length + 1} rodada${rounds.length === 0 ? "" : "s"}.`,
    );
  }

  function reiniciar() {
    setSelected([]);
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
        <Card className="p-0! overflow-hidden">
          <Filtros
            term={term}
            onTerm={setTerm}
            professionalFilter={professionalFilter}
            onProfessional={setProfessionalFilter}
            professionals={transfers.professionals}
            specialtyFilter={specialtyFilter}
            onSpecialty={setSpecialtyFilter}
            specialties={specialties}
            statusFilter={statusFilter}
            onStatus={setStatusFilter}
          />

          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-brand-purple-dark)]/10 px-4 py-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--color-neutral-900)]">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={alternarTodos}
                disabled={rows.length === 0}
                className="h-6 w-6 shrink-0 rounded border-2 border-[var(--color-brand-purple-dark)]/20 text-[var(--color-brand-blue-dark)] focus:ring-0"
              />
              Selecionar todos
            </label>
            <span className="text-sm text-[var(--color-neutral-700)]">
              {rows.length} mapa{rows.length === 1 ? "" : "s"} · {selected.length} selecionado
              {selected.length === 1 ? "" : "s"}
            </span>
            <RadioSelector
              className="ml-auto"
              name="transfers[view]"
              layout="pills"
              value={view}
              options={[
                { value: "list", label: "Em lista" },
                { value: "agenda", label: "Agenda" },
              ]}
              onChange={(valor) => setView(valor as "list" | "agenda")}
            />
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
          ) : view === "list" ? (
            <ul className="m-0 list-none p-0" data-transfer-view="list">
              {rows.map((map) => (
                <LinhaDoMapa
                  key={map.id}
                  map={map}
                  professional={professionalOf(estado, map.professionalId)}
                  checked={selected.includes(map.id)}
                  onToggle={() => alternar(map.id)}
                />
              ))}
            </ul>
          ) : (
            <GradeDaSemana
              blocks={blocks}
              sessions={sessions}
              data={estado}
              selected={selected}
              onToggle={alternar}
              onOpenCluster={setCluster}
            />
          )}
        </Card>

        <aside className="@desktop:sticky @desktop:top-4">
          <Card className="p-0! flex-col">
            {selection.length === 0 && rounds.length > 0 ? (
              <FilaZerada moved={moved} rounds={rounds} onRestart={reiniciar} />
            ) : selection.length === 0 ? (
              <EmptyStateCard icon="fa-hand-pointer" text="Selecione os mapas a movimentar">
                <p className="m-0 text-sm">
                  A movimentação é feita em rodadas: cada rodada leva o que cabe num
                  profissional e devolve o resto à fila, até transferir tudo.
                </p>
              </EmptyStateCard>
            ) : (
              <>
                <div className="border-b border-[var(--color-brand-purple-dark)]/10 p-4">
                  <p className="m-0 text-base font-extrabold text-[var(--color-brand-purple-dark)]">
                    {rounds.length > 0
                      ? `Na fila: ${selection.length} de ${queueTotal} mapas`
                      : `${selection.length} mapa${selection.length === 1 ? "" : "s"} selecionado${selection.length === 1 ? "" : "s"}`}
                  </p>
                  <p className="m-0 text-sm text-[var(--color-neutral-700)]">
                    {formatHours(weeklyHours(selection.flatMap((map) => map.slots)))} por semana ·{" "}
                    {specialtiesOfSelection.join(" · ")}
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

                  <Passos step={step} />
                </div>

                <div className="flex flex-col gap-4 p-4">
                  {rounds.length > 0 && !simulation && (
                    <RodadasAnteriores rounds={rounds} left={selection.length} />
                  )}

                  <Destino
                    selection={selection}
                    specialtiesOfSelection={specialtiesOfSelection}
                    options={options}
                    professionals={transfers.professionals}
                    exceptionInPlay={exceptionInPlay}
                    mixed={mixed}
                    destinationId={destinationId}
                    destination={destination}
                    crossSpecialty={crossSpecialty}
                    reason={reason}
                    onPick={escolherDestino}
                    onSuggest={sugerir}
                    onCross={(valor) => {
                      setCrossSpecialty(valor);
                      setDestinationId("");
                      setSimulation(null);
                    }}
                    onReason={(valor) => {
                      setReason(valor);
                      setSimulation(null);
                    }}
                  />

                  <Vigencia
                    scope={scope}
                    fromDate={fromDate}
                    today={transfers.today}
                    erro={fromDateDecision.allowed ? undefined : fromDateDecision.reason}
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
                      impact={impact}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-start justify-end gap-2 border-t border-[var(--color-brand-purple-dark)]/10 p-4">
                  <Button variant="ghost" color="brand" onClick={reiniciar}>
                    {rounds.length > 0 ? "Encerrar movimentação" : "Limpar seleção"}
                  </Button>
                  {simulation ? (
                    <AcaoIndisponivel
                      id="transfers-aplicar"
                      className="espelho-do-sistema"
                      motivo={canApply(simulation.evaluations).reason}
                      leftIcon="fa-check"
                      onClick={aplicar}
                    >
                      {rotuloDeAplicar(simulation.evaluations)}
                    </AcaoIndisponivel>
                  ) : (
                    <AcaoIndisponivel
                      id="transfers-simular"
                      className="espelho-do-sistema"
                      motivo={simulateDecision.reason}
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

      <ModalDoHorario
        cluster={cluster}
        data={estado}
        selected={selected}
        onToggle={alternar}
        onToggleMany={alternarVarios}
        onClose={() => setCluster(null)}
      />
    </div>,
    transfers,
    orphans,
  );
}

function rotuloDeAplicar(evaluations: TransferEvaluation[]): string {
  const cabem = evaluations.filter((avaliacao) => avaliacao.fit === "ok").length;
  const restam = evaluations.filter(
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
    <div className="grid gap-3 border-b border-[var(--color-brand-purple-dark)]/10 p-4 @tablet:grid-cols-2 @wide:grid-cols-4">
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
  onToggle,
}: {
  map: TransferMap;
  professional: TransferProfessional | undefined;
  checked: boolean;
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
        checked ? "bg-[var(--color-brand-blue)]/10 shadow-[inset_3px_0_0_var(--color-brand-blue-dark)]" : "",
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
          className="mt-0.5 h-6 w-6 shrink-0 rounded border-2 border-[var(--color-brand-purple-dark)]/20 text-[var(--color-brand-blue-dark)] focus:ring-0"
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
              <p className="m-0 break-words text-sm font-bold text-[var(--color-brand-purple-dark)]">
                {professional.name}
              </p>
              <p className="m-0 text-xs text-[var(--color-neutral-700)]">{professional.room}</p>
            </>
          ) : (
            <>
              <Tag pill variant="orange" icon="fa-user-slash" item="Sem profissional" />
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

        <div className="flex flex-wrap gap-1">
          {map.slots.map((slot) => (
            <span
              key={`${slot.weekday}-${slot.start}`}
              className="rounded bg-[var(--color-brand-purple-dark)]/8 px-1.5 py-0.5 text-xs font-bold text-[var(--color-neutral-900)]"
            >
              {slotLabel(slot)}
            </span>
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

/* ======================================================== grade da semana */

function GradeDaSemana({
  blocks,
  sessions,
  data,
  selected,
  onToggle,
  onOpenCluster,
}: {
  blocks: ReturnType<typeof agendaBlocks>;
  sessions: Record<TransferWeekday, number>;
  data: TransfersData;
  selected: string[];
  onToggle: (id: string) => void;
  onOpenCluster: (cluster: AgendaCluster) => void;
}) {
  const horas = Array.from({ length: HORA_FINAL - HORA_INICIAL }, (_, i) => HORA_INICIAL + i);

  return (
    <div className="overflow-x-auto p-4" data-transfer-view="agenda">
      <div className="min-w-[36rem]">
        <div className="mb-1.5 grid grid-cols-[3.25rem_repeat(5,minmax(0,1fr))] gap-1.5">
          <span />
          {WEEKDAYS.map((weekday) => (
            <span key={weekday} className="text-center">
              <span className="block text-xs font-black tracking-wide text-[var(--color-brand-purple-dark)]">
                {WEEKDAY_LABEL[weekday]}
              </span>
              <span className="block text-xs text-[var(--color-neutral-700)]">
                {sessions[weekday]} sess{sessions[weekday] === 1 ? "ão" : "ões"}
              </span>
            </span>
          ))}
        </div>

        <div
          className="relative grid grid-cols-[3.25rem_repeat(5,minmax(0,1fr))] gap-1.5"
          style={{ height: (HORA_FINAL - HORA_INICIAL) * ALTURA_DA_HORA }}
        >
          <div className="relative">
            {horas.map((hora, i) => (
              <span
                key={hora}
                className="absolute right-1.5 -translate-y-1.5 text-xs font-bold text-[var(--color-neutral-600)]"
                style={{ top: i * ALTURA_DA_HORA }}
              >
                {String(hora).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="relative overflow-hidden rounded-xl bg-[var(--color-brand-purple-dark)]/4"
            >
              {horas.map((hora, i) => (
                <span
                  key={hora}
                  className="absolute inset-x-0 h-px bg-[var(--color-brand-purple-dark)]/8"
                  style={{ top: i * ALTURA_DA_HORA }}
                />
              ))}

              {blocks[weekday].map((entry) => {
                if (entry.kind === "cluster") {
                  const marcados = entry.items.filter((item) =>
                    selected.includes(item.map.id),
                  ).length;
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      data-transfer-cluster={entry.key}
                      onClick={() => onOpenCluster(entry)}
                      /* A coluna de um dia é estreita, e a contagem por
                         especialidade não cabe inteira nela em toda largura. As
                         etiquetas ficam numa linha só que corta: numa tela larga
                         aparecem as três, numa estreita aparece a primeira, e o
                         detalhe inteiro está no `title` e a um clique de
                         distância, na lista. Deixá-las quebrar linha faria o
                         bloco crescer para dentro do horário seguinte. */
                      title={[
                        `${entry.items.length} sessões em ${WEEKDAY_LABEL[entry.weekday]} ${entry.slot.start}–${entry.slot.end}`,
                        ...entry.specialties.map(
                          ({ specialty, count }) => `${count} de ${specialty}`,
                        ),
                        ...(entry.orphans > 0 ? [`${entry.orphans} sem profissional`] : []),
                      ].join(" · ")}
                      style={{
                        top: topoDe(entry.slot.start),
                        height: alturaDe(entry.slot.start, entry.slot.end) - 3,
                        left: 3,
                        width: "calc(100% - 6px)",
                      }}
                      className={[
                        "absolute flex flex-col items-start gap-0.5 overflow-hidden rounded-lg border border-l-[3px] px-2 py-1.5 text-left transition-colors",
                        "border-[var(--color-brand-purple-dark)]/20 border-l-[var(--color-brand-purple-dark)] bg-[var(--color-brand-purple-dark)]/6",
                        "hover:bg-[var(--color-brand-blue)]/20",
                        marcados > 0 ? "ring-2 ring-inset ring-[var(--color-brand-blue-dark)]" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="text-sm font-black text-[var(--color-brand-purple-dark)]">
                        {entry.items.length} sessões
                        {marcados > 0 && (
                          <span className="ml-1 font-bold text-[var(--color-blue-dark)]">
                            · {marcados} sel.
                          </span>
                        )}
                      </span>
                      <span className="text-xs font-bold text-[var(--color-neutral-700)]">
                        {entry.slot.start}–{entry.slot.end}
                      </span>
                      {/* As etiquetas quebram linha e o bloco corta o que não
                          couber — cortar **dentro** de uma etiqueta deixaria um
                          número solto, que não diz nada. Numa faixa de uma hora
                          cabe a primeira, e a primeira é a que decide se este
                          horário é trabalho: quantos mapas estão sem
                          profissional. O resto está no `title` e na lista. */}
                      <span className="flex w-full flex-wrap gap-1">
                        {entry.orphans > 0 && (
                          <span className="rounded bg-[var(--color-brand-orange)]/25 px-1 text-xs font-bold text-[var(--color-warn-fg)]">
                            {entry.orphans} sem prof.
                          </span>
                        )}
                        {entry.specialties.slice(0, 3).map(({ specialty, count }) => (
                          <span
                            key={specialty}
                            className="rounded bg-[var(--color-brand-purple-dark)]/8 px-1 text-xs font-bold text-[var(--color-neutral-900)]"
                          >
                            {count} {specialty.split(" ")[0]}
                          </span>
                        ))}
                      </span>
                    </button>
                  );
                }

                const professional = professionalOf(data, entry.map.professionalId);
                const marcado = selected.includes(entry.map.id);
                return (
                  <button
                    key={entry.key}
                    type="button"
                    data-transfer-block={entry.map.id}
                    aria-pressed={marcado}
                    /* O bloco tem a altura da faixa e não pode crescer, então
                       aqui o texto é cortado — com reticências, e com o nome
                       inteiro no `title` e no nome acessível. Na lista ele
                       quebra; é a mesma informação em duas leituras, e só uma
                       delas tem espaço. */
                    title={`${entry.map.patient} · ${entry.map.specialty} · ${
                      professional ? `${professional.name}, ${professional.room}` : "sem profissional"
                    }`}
                    aria-label={`${entry.map.patient}, ${entry.map.specialty}, ${slotLabel(entry.slot)}, ${
                      professional ? professional.name : "sem profissional"
                    }`}
                    onClick={() => onToggle(entry.map.id)}
                    style={{
                      top: topoDe(entry.slot.start),
                      height: alturaDe(entry.slot.start, entry.slot.end) - 3,
                      left: `calc(3px + ${(entry.lane / entry.lanes) * 100}% - ${(entry.lane / entry.lanes) * 6}px)`,
                      width: `calc(${100 / entry.lanes}% - 6px)`,
                    }}
                    className={[
                      "absolute flex flex-col justify-center overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left transition-colors",
                      professional
                        ? "border-l-[var(--color-brand-blue-dark)] bg-[var(--color-brand-blue)]/15 hover:bg-[var(--color-brand-blue)]/25"
                        : "border-l-[var(--color-brand-orange-dark)] bg-[var(--color-brand-orange)]/20 hover:bg-[var(--color-brand-orange)]/30",
                      marcado ? "ring-2 ring-inset ring-[var(--color-brand-blue-dark)]" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="truncate text-xs font-extrabold text-[var(--color-brand-purple-dark)]">
                      {entry.map.patient}
                    </span>
                    <span className="truncate text-xs text-[var(--color-neutral-700)]">
                      {entry.slot.start}–{entry.slot.end} ·{" "}
                      {professional ? professional.name : "sem profissional"}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* A legenda diz o que a cor significa, e é só isto que ela significa.
            Quem é o profissional está escrito dentro do bloco — ver a nota 3 no
            topo do arquivo. */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--color-brand-purple-dark)]/10 pt-3 text-xs font-bold text-[var(--color-neutral-700)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--color-brand-blue-dark)]" />
            Com profissional
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--color-brand-orange-dark)]" />
            Sem profissional
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--color-brand-purple-dark)]" />
            Horário lotado — abre a lista
          </span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================== o painel */

function Passos({ step }: { step: number }) {
  return (
    <ol className="m-0 mt-3 flex list-none items-center gap-1.5 p-0">
      {PASSOS.map((passo, indice) => {
        const feito = step > indice + 1;
        const agora = step === indice + 1;
        return (
          <li
            key={passo}
            aria-current={agora ? "step" : undefined}
            className={[
              "flex min-w-0 flex-1 items-center gap-1.5 text-xs font-bold whitespace-nowrap",
              agora
                ? "text-[var(--color-brand-purple-dark)]"
                : feito
                  ? "text-[var(--color-neutral-700)]"
                  : "text-[var(--color-neutral-600)]",
            ].join(" ")}
          >
            <span
              className={[
                "inline-flex h-[1.125rem] w-[1.125rem] flex-none items-center justify-center rounded-full text-xs font-extrabold",
                agora
                  ? "bg-[var(--color-action)] text-white"
                  : feito
                    ? "bg-[var(--color-brand-green)]/25 text-[var(--color-green-dark)]"
                    : "bg-[var(--color-brand-purple-dark)]/8 text-[var(--color-neutral-700)]",
              ].join(" ")}
            >
              {feito ? <Icon name="fa-check" /> : indice + 1}
            </span>
            {passo}
          </li>
        );
      })}
    </ol>
  );
}

function RodadasAnteriores({ rounds, left }: { rounds: TransferRound[]; left: number }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 rounded-xl bg-[var(--color-brand-orange)]/15 p-3">
      <Icon name="fa-arrow-rotate-right" className="mt-0.5 text-[var(--color-warn-fg)]" />
      <div>
        <p className="m-0 text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
          {left} mapa{left === 1 ? "" : "s"} {left === 1 ? "não coube" : "não couberam"} nas rodadas
          anteriores
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
              {round.scope === "from" && round.fromDate
                ? ` · a partir de ${formatNumericDate(round.fromDate)}`
                : ""}
              {round.crossSpecialty ? " · exceção de especialidade" : ""}
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
      <p className="m-0 mt-3 text-base font-extrabold text-[var(--color-brand-purple-dark)]">
        Fila zerada
      </p>
      <p className="m-0 text-sm text-[var(--color-neutral-700)]">
        {moved} mapa{moved === 1 ? "" : "s"} movimentado{moved === 1 ? "" : "s"} em {rounds.length}{" "}
        rodada{rounds.length === 1 ? "" : "s"}.
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
  mixed,
  destinationId,
  destination,
  crossSpecialty,
  reason,
  onPick,
  onSuggest,
  onCross,
  onReason,
}: {
  selection: TransferMap[];
  specialtiesOfSelection: string[];
  options: { same: TransferProfessional[]; others: TransferProfessional[] };
  professionals: TransferProfessional[];
  exceptionInPlay: boolean;
  mixed: boolean;
  destinationId: string;
  destination: TransferProfessional | undefined;
  crossSpecialty: boolean;
  reason: string;
  onPick: (id: string) => void;
  onSuggest: () => void;
  onCross: (valor: boolean) => void;
  onReason: (valor: string) => void;
}) {
  const elegiveis = professionals.filter(
    (professional) => !selection.every((map) => map.professionalId === professional.id),
  );
  const lista = exceptionInPlay ? elegiveis : options.same;
  const faltaMotivo = exceptionInPlay && reason.trim().length < MIN_EXCEPTION_REASON;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <Select
          className="min-w-0 flex-1"
          id="transfers-destino"
          label={
            exceptionInPlay
              ? "Transferir para (qualquer especialidade)"
              : `Transferir para — ${specialtiesOfSelection[0]}`
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
        <Button
          className="espelho-do-sistema"
          variant="outline"
          leftIcon="fa-wand-magic-sparkles"
          onClick={onSuggest}
        >
          Sugerir
        </Button>
      </div>

      {!exceptionInPlay && options.same.length === 0 && (
        <p className="m-0 text-sm font-bold text-[var(--color-warn-fg)]">
          <Icon name="fa-circle-exclamation" className="mr-1.5" />
          Nenhum outro profissional de {specialtiesOfSelection[0]} disponível para esta seleção.
          Marque a exceção abaixo para ver as outras especialidades.
        </p>
      )}

      {destination && (
        <p className="m-0 text-sm text-[var(--color-neutral-700)]">
          {destination.specialty} · {destination.room} · disponível{" "}
          {[...new Set(destination.availability.map((janela) => WEEKDAY_LABEL[janela.weekday]))].join(
            ", ",
          )}
        </p>
      )}

      {mixed && (
        <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl border border-[var(--color-brand-purple-dark)]/15 bg-[var(--color-brand-purple-dark)]/4 p-3">
          <Icon name="fa-layer-group" className="mt-0.5 text-[var(--color-brand-purple-dark)]" />
          <div>
            <p className="m-0 text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
              Seleção com {specialtiesOfSelection.length} especialidades
            </p>
            <p className="m-0 mt-1 text-sm text-[var(--color-neutral-700)]">
              {specialtiesOfSelection.join(", ")}. A troca é feita entre profissionais da mesma
              especialidade — filtre por uma especialidade e transfira por vez, ou registre a
              exceção abaixo.
            </p>
          </div>
        </div>
      )}

      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--color-neutral-900)]">
        <input
          type="checkbox"
          checked={crossSpecialty}
          onChange={(evento) => onCross(evento.target.checked)}
          className="h-6 w-6 shrink-0 rounded border-2 border-[var(--color-brand-purple-dark)]/20 text-[var(--color-brand-orange-dark)] focus:ring-0"
        />
        Exceção: permitir profissional de outra especialidade
      </label>

      {exceptionInPlay && (
        <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-xl border border-[var(--color-brand-orange)]/55 bg-[var(--color-brand-orange)]/10 p-3">
          <Icon name="fa-triangle-exclamation" className="mt-0.5 text-[var(--color-warn-fg)]" />
          <div className="min-w-0">
            <p className="m-0 text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
              Transferência fora da especialidade
            </p>
            <p className="m-0 mt-1 text-sm text-[var(--color-neutral-700)]">
              Fora do padrão da clínica. Registre o motivo — ele fica no histórico do mapa.
            </p>
            <Input
              className="mt-2"
              id="transfers-motivo"
              label="Motivo da exceção"
              placeholder="Por que esta transferência sai da especialidade"
              value={reason}
              onChange={(evento) => onReason(evento.target.value)}
              errors={
                faltaMotivo
                  ? [
                      `Faltam ${MIN_EXCEPTION_REASON - reason.trim().length} caractere${
                        MIN_EXCEPTION_REASON - reason.trim().length === 1 ? "" : "s"
                      } para o motivo valer.`,
                    ]
                  : []
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Vigencia({
  scope,
  fromDate,
  today,
  erro,
  onScope,
  onFromDate,
}: {
  scope: TransferScope;
  fromDate: string;
  today: string;
  erro?: string;
  onScope: (valor: TransferScope) => void;
  onFromDate: (valor: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <RadioGroup
        label="Vigência"
        name="transfers[scope]"
        value={scope}
        options={[
          { value: "whole", label: "Mapa inteiro" },
          { value: "from", label: "A partir de" },
        ]}
        onChange={(valor) => onScope(valor as TransferScope)}
      />
      {scope === "from" && (
        <Input
          id="transfers-vigencia"
          label="Primeiro dia com o novo profissional"
          type="date"
          min={today}
          value={fromDate}
          errors={erro ? [erro] : []}
          onChange={(evento) => onFromDate(evento.target.value)}
        />
      )}
      <p className="m-0 text-sm text-[var(--color-neutral-700)]">{scopeMessage(scope, fromDate)}</p>
    </div>
  );
}

function Resultado({
  simulation,
  data,
  impact,
}: {
  simulation: Simulacao;
  data: TransfersData;
  impact: { room: string; hours: number }[];
}) {
  const destino = professionalOf(data, simulation.destinationId);
  const conta = (fit: TransferFit) =>
    simulation.evaluations.filter((avaliacao) => avaliacao.fit === fit).length;

  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {simulation.evaluations.map(({ map, fit, issues }) => {
          const veredito = VEREDITO[fit];
          const excecao =
            simulation.crossSpecialty &&
            fit !== "same" &&
            destino !== undefined &&
            map.specialty !== destino.specialty;
          return (
            <li
              key={map.id}
              data-transfer-fit={fit}
              data-transfer-evaluation={map.id}
              className={[
                "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-xl border p-2.5",
                MOLDURA_DO_VEREDITO[fit],
              ].join(" ")}
            >
              <Icon
                name={veredito.icon}
                className={
                  fit === "ok"
                    ? "mt-0.5 text-[var(--color-green-dark)]"
                    : fit === "warn"
                      ? "mt-0.5 text-[var(--color-warn-fg)]"
                      : fit === "bad"
                        ? "mt-0.5 text-[var(--color-red-dark)]"
                        : "mt-0.5 text-[var(--color-neutral-700)]"
                }
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="m-0 text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
                    {map.patient}
                  </p>
                  <Tag item={veredito.label} variant={veredito.variant} />
                  {excecao && <Tag item="exceção" variant="orange" pill />}
                </div>
                <p className="m-0 text-xs text-[var(--color-neutral-700)]">
                  {fit === "same"
                    ? "Já é o responsável — nada muda neste mapa"
                    : issues.length === 0
                      ? `${formatHours(weeklyHours(map.slots))} mantidas nos mesmos horários`
                      : issues.map((issue) => issue.text).join(" · ")}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {impact.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--color-brand-purple-dark)]/10 p-3">
          <p className="m-0 flex items-center gap-2 text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
            <Icon name="fa-door-open" className="text-[var(--color-brand-blue-dark)]" />
            Impacto na escala de salas
          </p>
          {impact.map(({ room, hours }) => (
            <p
              key={room}
              className="m-0 flex justify-between gap-3 text-sm text-[var(--color-neutral-700)]"
            >
              <span>{room}</span>
              <strong
                className={
                  hours < 0
                    ? "text-[var(--color-green-dark)]"
                    : "text-[var(--color-brand-purple-dark)]"
                }
              >
                {hours > 0
                  ? `+${formatHours(hours)} ocupadas`
                  : `${formatHours(Math.abs(hours))} liberadas`}
              </strong>
            </p>
          ))}
          <p className="m-0 text-xs text-[var(--color-neutral-700)]">
            A alocação em salas é recalculada ao aplicar; períodos sem sala disponível voltam para o
            Mapa da Unidade.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-xl bg-[var(--color-brand-purple-dark)]/4 p-3">
        <p className="m-0 text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
          Resumo da simulação
        </p>
        <Linha rotulo="Mapas que cabem no destino" valor={conta("ok")} />
        {conta("same") > 0 && <Linha rotulo="Já eram do destino" valor={conta("same")} />}
        <Linha rotulo="Com sobreposição — precisam de outro destino" valor={conta("warn")} />
        <Linha rotulo="Fora da escala do destino" valor={conta("bad")} />
        {simulation.crossSpecialty && destino && (
          <Linha
            rotulo="Fora da especialidade (exceção)"
            valor={
              simulation.evaluations.filter(
                (avaliacao) =>
                  avaliacao.fit !== "same" && avaliacao.map.specialty !== destino.specialty,
              ).length
            }
          />
        )}
        {simulation.crossSpecialty && simulation.reason && (
          <p className="m-0 text-xs text-[var(--color-neutral-700)]">
            Motivo registrado: “{simulation.reason}”
          </p>
        )}
      </div>
    </>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <p className="m-0 flex justify-between gap-3 text-sm text-[var(--color-neutral-700)]">
      <span>{rotulo}</span>
      <strong className="text-[var(--color-brand-purple-dark)]">{valor}</strong>
    </p>
  );
}

/* ================================================ o horário lotado, aberto */

function ModalDoHorario({
  cluster,
  data,
  selected,
  onToggle,
  onToggleMany,
  onClose,
}: {
  cluster: AgendaCluster | null;
  data: TransfersData;
  selected: string[];
  onToggle: (id: string) => void;
  onToggleMany: (ids: string[], ligado: boolean) => void;
  onClose: () => void;
}) {
  if (!cluster) return null;
  const todos = cluster.items.map((item) => item.map.id);

  return (
    <Modal
      id="transfers-horario"
      open
      onClose={onClose}
      variant="medium"
      title={`${WEEKDAY_LABEL[cluster.weekday]} · ${cluster.slot.start}–${cluster.slot.end} · ${cluster.items.length} sessões`}
    >
      <div className="flex flex-col gap-3">
        {/* Selecionar por especialidade é o gesto real: quem movimenta uma
            inativação quer as três crianças de Psicologia daquele horário, não
            as oito. */}
        <div className="flex flex-wrap gap-1.5">
          {cluster.specialties.map(({ specialty, count }) => (
            <Button
              key={specialty}
              size="small"
              variant="outline"
              color="brand"
              rightIcon="fa-plus"
              onClick={() =>
                onToggleMany(
                  cluster.items
                    .filter((item) => item.map.specialty === specialty)
                    .map((item) => item.map.id),
                  true,
                )
              }
            >
              {count} {specialty}
            </Button>
          ))}
          {cluster.orphans > 0 && (
            <Button
              size="small"
              variant="outline"
              color="brand"
              leftIcon="fa-user-slash"
              rightIcon="fa-plus"
              onClick={() =>
                onToggleMany(
                  cluster.items.filter((item) => !item.map.professionalId).map((item) => item.map.id),
                  true,
                )
              }
            >
              {cluster.orphans} sem profissional
            </Button>
          )}
        </div>

        <ul className="m-0 flex max-h-[46vh] list-none flex-col gap-1.5 overflow-auto p-0">
          {cluster.items.map(({ map }) => {
            const professional = professionalOf(data, map.professionalId);
            const marcado = selected.includes(map.id);
            return (
              <li key={map.id}>
                <label
                  className={[
                    "grid cursor-pointer grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)] items-center gap-3 rounded-xl border p-2.5",
                    marcado
                      ? "border-[var(--color-brand-blue-dark)] bg-[var(--color-brand-blue)]/10"
                      : "border-[var(--color-brand-purple-dark)]/10",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => onToggle(map.id)}
                    aria-label={`${map.patient}, ${map.specialty}`}
                    className="h-6 w-6 shrink-0 rounded border-2 border-[var(--color-brand-purple-dark)]/20 text-[var(--color-brand-blue-dark)] focus:ring-0"
                  />
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
                      {map.patient}
                    </span>
                    <span className="block text-xs text-[var(--color-neutral-700)]">
                      {map.specialty}
                    </span>
                  </span>
                  {professional ? (
                    <span className="min-w-0 break-words text-sm font-bold text-[var(--color-neutral-700)]">
                      {professional.name} · {professional.room}
                    </span>
                  ) : (
                    /* `justify-self-start`: item de grade nasce esticado, e
                       a etiqueta atravessava a coluna inteira. */
                    <Tag
                      className="justify-self-start"
                      pill
                      variant="orange"
                      icon="fa-user-slash"
                      item="Sem profissional"
                    />
                  )}
                </label>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" color="brand" onClick={() => onToggleMany(todos, false)}>
            Desmarcar todos
          </Button>
          <Button className="espelho-do-sistema" variant="tint" onClick={() => onToggleMany(todos, true)}>
            Selecionar as {cluster.items.length}
          </Button>
          <Button className="espelho-do-sistema" rightIcon="fa-check" onClick={onClose}>
            Concluir
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================== moldura */

function wrap(
  context: ScreenProps["context"],
  children: ReactNode,
  transfers?: TransfersData,
  orphans = 0,
) {
  return (
    <AppShell
      context={context}
      title="Central de transferências"
      subtitle="Movimente os mapas de horas dos pacientes entre profissionais antes de inativar alguém ou alterar uma escala. Mapas sem profissional associado ficam nesta mesma lista."
      breadcrumb={[{ label: "Central de transferências" }]}
      actions={
        transfers ? (
          <Tag
            pill
            variant="orange"
            icon="fa-user-slash"
            item={`${orphans} mapas sem profissional · ${transfers.unit}`}
          />
        ) : undefined
      }
    >
      {children}
    </AppShell>
  );
}
