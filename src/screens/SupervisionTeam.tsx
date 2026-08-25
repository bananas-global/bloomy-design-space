import { useMemo, useState, type ReactNode } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  ProgramTrend,
  SupervisionSession,
  SupervisionTeamData,
} from "../contracts/index.js";
import { ageInYears, formatDate, formatTime } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import {
  Button as AcaoLocal,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  ScheduleStatusChip,
} from "../components/primitives.js";
import { Button } from "../components/bloomy/Button.js";
// `Card` do sistema, com nome próprio: `Card` de `primitives` já é o das colunas
// e do painel de detalhe, e as duas anatomias convivem durante a troca.
import {
  Card as CartaoDoSistema,
  InfoCard,
  type InfoCardVariant,
} from "../components/bloomy/Card.js";
import { Input } from "../components/bloomy/Input.js";
import { Progress } from "../components/bloomy/Layout.js";
import { DrawerModal } from "../components/bloomy/Overlay.js";
import { Tag } from "../components/bloomy/Tag.js";
import {
  applicatorAlerts,
  applicatorsOfSupervisor,
  clearSelection,
  isPendingSignature,
  nextUnresolved,
  patientAlerts,
  patientsOfApplicator,
  pendingInScope,
  pendingOfApplicator,
  pendingOfPair,
  pendingOfPatient,
  pendingOfSupervisor,
  pickApplicator,
  pickPatient,
  pickSupervisor,
  programTrendLabel,
  reachesSupervision,
  scopeCounters,
  scopeOf,
  sessionsToSign,
  supervisionDetour,
  supervisionReach,
  supervisorsOfPatient,
  trendNeedsAttention,
  visibleApplicators,
  visiblePatients,
  visibleSupervisors,
  type SupervisionReach,
  type SupervisionSelection,
} from "../rules/supervision.js";

/**
 * Supervisão — a equipe, por relação.
 *
 * A tela portada em `/supervision` responde uma pergunta: o que os
 * supervisionados **deste** supervisor atenderam. Esta responde três, porque são
 * três as que chegam à coordenação, e duas delas entram pelo outro lado:
 *
 * - de quem é a assinatura que está travando o fechamento?
 * - quem supervisiona quem atende esta criança?
 * - este aplicador foi supervisionado alguma vez?
 *
 * Daí a forma: supervisor, aplicador e paciente como três colunas que se filtram
 * umas às outras, com um painel que reflete o item mais específico selecionado e
 * concentra a única ação que o vínculo de supervisão produz no sistema — a
 * segunda assinatura.
 *
 * **O que esta tela não faz.** Ela não assina em lote. O botão abre uma fila de
 * revisão, um atendimento por vez, com as tentativas, a observação de quem
 * aplicou e os registros de comportamento à vista. Assinar trinta com um clique
 * transformaria a afirmação "eu li o registro" em carimbo, e é a única coisa que
 * a segunda assinatura afirma.
 *
 * A tela portada continua onde estava, servindo as cinco situações do porte. É o
 * mesmo arranjo de Profissionais e de Unidades.
 */
export function SupervisionTeam({ context }: ScreenProps) {
  const { data, isLoading, error } = context;

  if (isLoading) return moldura(context, <LoadingState label="Carregando a equipe de supervisão" />);
  if (error) return moldura(context, <ErrorState message={error.message} />);

  const equipe = data as SupervisionTeamData | null;
  if (!equipe) return moldura(context, <ErrorState message="Não foi possível carregar." />);

  /**
   * O alcance é por coluna, e a persona escolhida é o que o decide.
   *
   * Não há uma permissão da tela: `list_supervisor` dá a coluna de supervisores,
   * `professionals.list` — ou o próprio vínculo de supervisão — dá a de
   * aplicadores, e `patients.list` dá a de pacientes. Com menos de duas não há
   * relação a navegar, e a tela manda para onde a pergunta que sobrou é
   * respondida.
   */
  const alcance = supervisionReach(context.permissions, equipe, context.persona?.id);
  if (!reachesSupervision(alcance)) {
    return moldura(
      context,
      <EmptyState
        title="Esta tela cruza três listas, e você alcança uma"
        description={supervisionDetour(alcance)}
      />,
    );
  }

  return <Conteudo context={context} equipe={equipe} alcance={alcance} />;
}

/* ================================================================ peças */

function inicial(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return (partes[0]?.[0] ?? "").toUpperCase();
  return `${partes[0]?.[0] ?? ""}${partes[partes.length - 1]?.[0] ?? ""}`.toUpperCase();
}

type Tipo = "supervisor" | "aplicador" | "paciente";

/**
 * As iniciais num quadrado colorido, uma cor por tipo.
 *
 * As três cores são de pares declarados em `src/tokens/contrast.ts`: branco
 * sobre ação, sobre acento e sobre o roxo do drawer. O azul de marca, que seria
 * a escolha óbvia, dá 2,22:1 — e aqui ele carregaria texto, não decoração.
 */
const FUNDO: Record<Tipo, string> = {
  supervisor: "bg-action",
  aplicador: "bg-accent",
  paciente: "bg-navy",
};

function Iniciais({ nome, tipo }: { nome: string; tipo: Tipo }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-field text-[0.8125rem] font-bold text-white ${FUNDO[tipo]}`}
    >
      {inicial(nome)}
    </span>
  );
}

/**
 * Os dois selos de contagem são `tag/1`, o componente do sistema.
 *
 * A primeira versão desta tela os desenhava à mão — dois `span` com raio,
 * padding e paleta próprios — e o resultado era duas implementações de etiqueta
 * na mesma tela, porque a tendência do programa já usava a do repositório. É a
 * mesma correção da decisão 0001: o componente do sistema no lugar do que eu
 * tinha desenhado.
 *
 * **A variante é a da cor de sinal, e ela reprova o contraste.** `light-blue` na
 * fila e `yellow` nos pontos de atenção: 2,14:1 e 2,03:1, medidos no navegador
 * com a transparência achatada sobre o branco. Das dez variantes de `tag/1` só
 * duas atingem AA — `brand` com 12,15 e `purple` com 4,89 —, e nenhuma das duas
 * é cor de sinal: uma é cinza-roxo e a outra é roxo cheio, e um selo de fila que
 * parece um selo neutro não é lido como fila.
 *
 * É escolha de design, registrada na decisão 0016, e o preço é explícito: **quem
 * depende do contraste não lê o número na cor.** O que sustenta a escolha é que a
 * cor não é o único canal — o ícone distingue os dois selos, e o `title` mais o
 * rótulo `sr-only` entregam a frase inteira ("3 atendimentos aguardando
 * assinatura"), que é o requisito de 1.4.1. O que não se resolve é 1.4.3, e é
 * isso que os dois pares em `knownProductionFailures` afirmam.
 *
 * Daí o `espelho-do-sistema`: com a variante do produto, o selo **é** espelho, e
 * a classe é o que diz ao axe que a reprovação é a do `tag/1`, não uma invenção
 * daqui. Ela não vale para o selo que eu desenhar — vale para o que eu copiar.
 */
function Fila({ quantas }: { quantas: number }) {
  if (quantas === 0) return null;
  const rotulo = `${quantas} ${quantas === 1 ? "atendimento aguardando assinatura" : "atendimentos aguardando assinatura"}`;

  return (
    <span className="inline-flex shrink-0 items-center">
      <Tag
        className="espelho-do-sistema"
        item={String(quantas)}
        variant="light-blue"
        icon="fa-signature"
        title={rotulo}
      />
      <span className="sr-only">{rotulo}</span>
    </span>
  );
}

/** Pontos de atenção, em número. O detalhe lista quais são. */
function Atencao({ quantos }: { quantos: number }) {
  if (quantos === 0) return null;
  const rotulo = `${quantos} ${quantos === 1 ? "ponto de atenção" : "pontos de atenção"}`;

  return (
    <span className="inline-flex shrink-0 items-center">
      <Tag
        className="espelho-do-sistema"
        item={String(quantos)}
        variant="yellow"
        icon="fa-triangle-exclamation"
        title={rotulo}
      />
      <span className="sr-only">{rotulo}</span>
    </span>
  );
}

const TREND_TONE: Record<ProgramTrend, "ok" | "info" | "warn" | "danger"> = {
  up: "ok",
  flat: "info",
  stalled: "warn",
  down: "danger",
};

function Tendencia({ trend }: { trend: ProgramTrend }) {
  return <Chip tone={TREND_TONE[trend]}>{programTrendLabel(trend)}</Chip>;
}

/**
 * Um item de coluna.
 *
 * `aria-pressed` e não `aria-current`: o nó é um filtro que liga e desliga, e
 * clicar no que já está ligado desliga. `aria-current` diria "você está aqui",
 * que é outra coisa — e não teria como dizer que dá para sair.
 */
function No({
  nome,
  detalhe,
  tipo,
  selecionado,
  fila,
  atencao,
  onClick,
}: {
  nome: string;
  detalhe: string;
  tipo: Tipo;
  selecionado: boolean;
  fila: number;
  atencao?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selecionado}
      onClick={onClick}
      className={[
        "flex w-full items-start gap-2.5 rounded-field border px-3 py-2.5 text-left transition-colors",
        selecionado
          ? "border-action bg-info-bg"
          : "border-[var(--border-soft)] bg-surface hover:bg-ink-50",
      ].join(" ")}
    >
      <Iniciais nome={nome} tipo={tipo} />
      {/* O nome tem a largura toda, e os números dividem a segunda linha com o
          detalhe. Ao lado do nome, dois selos deixavam "Rafael Andrade Nunes"
          com 86px numa coluna de 238 — e um nome cortado num filtro de nomes
          obriga a clicar para saber em quem se está clicando. */}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold text-navy">{nome}</span>
        <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-[var(--fg-2)]">
            {detalhe}
          </span>
          <Fila quantas={fila} />
          {atencao !== undefined && <Atencao quantos={atencao} />}
        </span>
      </span>
    </button>
  );
}

/**
 * Uma coluna do filtro.
 *
 * `<section>` com `aria-labelledby` no próprio título, e não um `<div>`: são
 * três listas de nomes lado a lado, e sem a região quem navega por marcos não
 * tem como saber em qual delas está — os nomes sozinhos não dizem se aquele
 * "Rafael" é supervisor ou aplicador.
 */
function Coluna({
  titulo,
  quantos,
  busca,
  rotuloDaBusca,
  onBusca,
  children,
}: {
  titulo: string;
  quantos: number;
  busca: string;
  rotuloDaBusca: string;
  onBusca: (valor: string) => void;
  children: ReactNode;
}) {
  const id = `coluna-${titulo.toLowerCase()}`;

  return (
    <section
      aria-labelledby={id}
      className="flex min-w-0 flex-col rounded-2xl bg-surface shadow-main"
    >
      <div className="flex items-baseline justify-between gap-2 border-b border-[var(--border-soft)] px-4 py-3">
        <h2 id={id} className="m-0 text-[0.8125rem] font-bold uppercase tracking-wide text-navy">
          {titulo}
        </h2>
        {/* `tag/1`, variante sem sinal: é uma contagem, não um estado. `brand`
            dá 12,15:1 e é a única das dez que serve para número sem cor. */}
        <Tag item={String(quantos)} variant="brand" />
      </div>
      <div className="space-y-2 p-3">
        <Input
          leftIcon="fa-magnifying-glass"
          aria-label={rotuloDaBusca}
          placeholder={rotuloDaBusca}
          value={busca}
          onChange={(evento) => onBusca(evento.target.value)}
        />
        {children}
      </div>
    </section>
  );
}

function SemResultado() {
  return (
    <p className="m-0 break-words px-1 py-3 text-[0.875rem] text-[var(--fg-2)]">
      Nenhum resultado para esta busca.
    </p>
  );
}

/** Cabeçalho do painel de detalhe: quem é, e o que ele é. */
function Cabecalho({
  nome,
  detalhe,
  tipo,
  icone,
}: {
  nome: string;
  detalhe: string;
  tipo?: Tipo;
  icone?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {tipo ? (
        <Iniciais nome={nome} tipo={tipo} />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-field bg-action text-white"
        >
          <Icon name={icone ?? "fa-people-group"} />
        </span>
      )}
      <div className="min-w-0">
        <h2 className="m-0 break-words text-[1.0625rem] font-bold text-navy">{nome}</h2>
        <p className="m-0 break-words text-[0.875rem] text-[var(--fg-2)]">{detalhe}</p>
      </div>
    </div>
  );
}

/** A barra que concentra a ação, ou a frase de que não há nada a fazer. */
function BarraDeAssinatura({
  quantas,
  frase,
  onRevisar,
}: {
  quantas: number;
  frase: string;
  onRevisar: () => void;
}) {
  if (quantas === 0) {
    return (
      <div className="flex items-start gap-2 rounded-card border border-ok-fg/25 bg-ok-bg px-4 py-3.5">
        <Icon name="fa-circle-check" className="mt-0.5 shrink-0 text-ok-fg" />
        <p className="m-0 break-words text-[0.9375rem] text-navy">
          Nenhuma assinatura pendente neste escopo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-info-fg/25 bg-info-bg px-4 py-3.5">
      <p className="m-0 min-w-0 break-words text-[0.9375rem] text-navy">
        <strong className="font-bold">{quantas}</strong>{" "}
        {quantas === 1 ? "atendimento" : "atendimentos"} {frase}
      </p>
      <Button className="espelho-do-sistema shrink-0" rightIcon="fa-signature" onClick={onRevisar}>
        Revisar e assinar
      </Button>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="m-0 mb-2 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--fg-2)]">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

/** Pista de que a próxima coluna refina o que este painel mostra. */
function Pista({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 flex items-start gap-2 break-words text-[0.875rem] text-[var(--fg-2)]">
      <Icon name="fa-arrow-left" className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

/* ============================================================ conteúdo */

function Conteudo({
  context,
  equipe,
  alcance,
}: {
  context: ScreenProps["context"];
  equipe: SupervisionTeamData;
  alcance: SupervisionReach;
}) {
  const { locale } = context;
  const escopo = scopeOf(alcance);

  const [selecao, setSelecao] = useState<SupervisionSelection>(() => clearSelection(escopo));
  /**
   * As assinaturas dadas nesta sessão de uso.
   *
   * Não voltam para a fixture — isto é especificação, não banco. Mas precisam
   * sair da fila na hora: assinar sem que nada mude na tela faz a pessoa assinar
   * de novo, e é o defeito mais fácil de produzir numa fila de revisão.
   */
  const [assinados, setAssinados] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [busca, setBusca] = useState({ supervisor: "", aplicador: "", paciente: "" });
  const [lote, setLote] = useState<{ titulo: string; sessoes: SupervisionSession[] } | null>(null);
  const [aviso, setAviso] = useState("");

  const comColunaDeSupervisores = alcance.supervisors;
  const supervisor = equipe.supervisors.find((item) => item.id === selecao.supervisorId);
  const aplicador = equipe.applicators.find((item) => item.id === selecao.applicatorId);
  const paciente = equipe.patients.find((item) => item.id === selecao.patientId);

  const indicadores = scopeCounters(equipe, selecao, assinados);

  const supervisores = useMemo(() => {
    const ids = visibleSupervisors(equipe, selecao);
    return equipe.supervisors
      .filter((item) => ids.includes(item.id))
      .filter((item) => contem(item.name, busca.supervisor));
  }, [equipe, selecao, busca.supervisor]);

  const aplicadores = useMemo(() => {
    const ids = visibleApplicators(equipe, selecao);
    return equipe.applicators
      .filter((item) => ids.includes(item.id))
      .filter((item) => contem(item.name, busca.aplicador));
  }, [equipe, selecao, busca.aplicador]);

  const pacientes = useMemo(() => {
    const ids = visiblePatients(equipe, selecao);
    return equipe.patients
      .filter((item) => ids.includes(item.id))
      .filter((item) => contem(item.name, busca.paciente));
  }, [equipe, selecao, busca.paciente]);

  function abrirLote(titulo: string, sessoes: SupervisionSession[]) {
    if (sessoes.length === 0) return;
    setLote({ titulo, sessoes });
  }

  function assinar(id: string) {
    setAssinados((antes) => new Set(antes).add(id));
  }

  function fecharLote(quantas: number) {
    setLote(null);
    setAviso(
      quantas === 0
        ? "Nenhuma assinatura foi dada. Os atendimentos seguem na fila."
        : quantas === 1
          ? "1 atendimento assinado."
          : `${quantas} atendimentos assinados.`,
    );
  }

  function remover(campo: keyof SupervisionSelection) {
    setSelecao((antes) => {
      const proximo = { ...antes };
      delete proximo[campo];
      return proximo;
    });
  }

  /** As marcas do filtro em vigor. A travada não entra: ela não sai. */
  type Marca = { chave: string; rotulo: string; limpar: () => void };
  const marcas: Marca[] = [
    supervisor && comColunaDeSupervisores
      ? {
          chave: "supervisor",
          rotulo: supervisor.name,
          limpar: () => remover("supervisorId"),
        }
      : undefined,
    aplicador
      ? { chave: "aplicador", rotulo: aplicador.name, limpar: () => remover("applicatorId") }
      : undefined,
    paciente
      ? { chave: "paciente", rotulo: paciente.name, limpar: () => remover("patientId") }
      : undefined,
  ].filter((marca): marca is Marca => marca !== undefined);

  return moldura(
    context,
    <div className="space-y-4">
      {/* Sem aviso de escopo.
          A carteira travada se explica sozinha: não há coluna de supervisores, o
          cabeçalho do painel diz o nome de quem é a carteira, e os números são os
          dela. O aviso repetia isso em três linhas e empurrava a tela para baixo
          em todo carregamento. O custo — que esta visão depende de estender a
          permissão que lista supervisores — é fato de especificação, não recado
          de tela: mora na decisão 0016 e no `rationale` da regra. */}

      {/* ------------------------------------------------------ filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {marcas.length === 0 ? (
            <p className="m-0 flex items-start gap-2 break-words text-[0.875rem] text-[var(--fg-2)]">
              <Icon name="fa-arrow-pointer" className="mt-0.5 shrink-0" />
              Selecione em qualquer coluna para filtrar — as outras duas se ajustam.
            </p>
          ) : (
            <>
              <span className="text-[0.875rem] font-semibold text-navy">Filtros:</span>
              {marcas.map((marca) => (
                <span
                  key={marca.chave}
                  className="inline-flex items-center gap-1 rounded-full bg-info-bg py-0.5 pl-3 pr-1 text-[0.875rem] font-semibold text-info-fg"
                >
                  {marca.rotulo}
                  <button
                    type="button"
                    onClick={marca.limpar}
                    aria-label={`Remover o filtro ${marca.rotulo}`}
                    className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-info-fg/10"
                  >
                    <Icon name="fa-xmark" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setSelecao(clearSelection(escopo))}
                className="rounded px-2 py-1 text-[0.875rem] font-semibold text-action underline underline-offset-2"
              >
                Limpar
              </button>
            </>
          )}
        </div>

      </div>

      {/* A única região viva da tela. Nasce vazia: uma frase no primeiro quadro
          seria lida na chegada, sobre uma ação que ninguém praticou. */}
      <p
        role="status"
        className="m-0 flex items-start gap-2 break-words text-[0.875rem] font-semibold text-ok-fg empty:hidden"
      >
        {aviso && (
          <>
            <Icon name="fa-circle-check" className="mt-0.5 shrink-0" />
            {aviso}
          </>
        )}
      </p>

      {/* --------------------------------------------------- indicadores */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Os três cartões são brancos, e quem carrega o sinal é a cor do número
            e do ícone — que é o que `info_card/1` tinge. O fundo colorido era
            adição do desenho, e ele custava contraste: o azul de `A assinar` dá
            3,40:1 sobre branco e passa, e sobre o azul-claro do cartão caía para
            2,95. Trocar três fundos por um número legível é troca boa. */}
        <Indicador
          id="atendimentos"
          icone="fa-calendar-check"
          valor={indicadores.appointments}
          rotulo="Atendimentos"
          variante="accent"
        />
        <Indicador
          id="a-assinar"
          icone="fa-signature"
          valor={indicadores.toSign}
          rotulo="A assinar"
          variante="blue"
        />
        <Indicador
          id="faltas"
          icone="fa-user-xmark"
          valor={indicadores.absences}
          rotulo="Faltas"
          variante="orange"
        />
      </div>

      {/* ------------------------------------------- colunas e detalhe
          As colunas e o detalhe só ficam lado a lado quando há largura para os
          dois. Numa tela de 1280 as quatro faixas dão 238px cada, e a coluna do
          meio deixa de servir de filtro — o detalhe desce para baixo e as três
          colunas ficam com 371px. Acima de 1536 a leitura volta a ser lateral,
          que é como o desenho foi feito. */}
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] 2xl:items-start">
        <div
          className={[
            "grid gap-4 md:grid-cols-2",
            comColunaDeSupervisores ? "lg:grid-cols-3" : "",
          ].join(" ")}
        >
          {comColunaDeSupervisores && (
          <Coluna
            titulo="Supervisores"
            quantos={supervisores.length}
            busca={busca.supervisor}
            rotuloDaBusca="Buscar supervisor"
            onBusca={(valor) => setBusca((antes) => ({ ...antes, supervisor: valor }))}
          >
            {supervisores.length === 0 ? (
              <SemResultado />
            ) : (
              supervisores.map((item) => (
                <No
                  key={item.id}
                  nome={item.name}
                  detalhe={`${item.specialtyName} · ${quantia(applicatorsOfSupervisor(equipe, item.id).length, "aplicador", "aplicadores")}`}
                  tipo="supervisor"
                  selecionado={selecao.supervisorId === item.id}
                  fila={pendingOfSupervisor(equipe, item.id, assinados)}
                  onClick={() => setSelecao(pickSupervisor(equipe, selecao, item.id, escopo))}
                />
              ))
            )}
          </Coluna>
        )}

        <Coluna
          titulo="Aplicadores"
          quantos={aplicadores.length}
          busca={busca.aplicador}
          rotuloDaBusca="Buscar aplicador"
          onBusca={(valor) => setBusca((antes) => ({ ...antes, aplicador: valor }))}
        >
          {aplicadores.length === 0 ? (
            <SemResultado />
          ) : (
            aplicadores.map((item) => (
              <No
                key={item.id}
                nome={item.name}
                detalhe={`${item.roleName} · ${quantia(patientsOfApplicator(equipe, item.id).length, "paciente", "pacientes")}`}
                tipo="aplicador"
                selecionado={selecao.applicatorId === item.id}
                fila={pendingOfApplicator(equipe, item.id, assinados)}
                atencao={applicatorAlerts(equipe, item.id).length}
                onClick={() => setSelecao(pickApplicator(equipe, selecao, item.id, escopo))}
              />
            ))
          )}
        </Coluna>

        <Coluna
          titulo="Pacientes"
          quantos={pacientes.length}
          busca={busca.paciente}
          rotuloDaBusca="Buscar paciente"
          onBusca={(valor) => setBusca((antes) => ({ ...antes, paciente: valor }))}
        >
          {pacientes.length === 0 ? (
            <SemResultado />
          ) : (
            pacientes.map((item) => (
              <No
                key={item.id}
                nome={item.name}
                detalhe={`${ageInYears(item.birthDate, equipe.now)} anos · ${quantia(
                  applicatorsDoPaciente(equipe, item.id),
                  "aplicador",
                  "aplicadores",
                )}`}
                tipo="paciente"
                selecionado={selecao.patientId === item.id}
                fila={pendingOfPatient(equipe, item.id, assinados)}
                atencao={patientAlerts(equipe, item.id).length}
                onClick={() => setSelecao(pickPatient(equipe, selecao, item.id, escopo))}
              />
            ))
          )}
        </Coluna>
        </div>

        {/* Sem contorno, como as três colunas: `card/1` do sistema não tem
            borda — quem separa o cartão do fundo é a sombra. */}
        <section className="min-w-0 rounded-2xl bg-surface p-4 shadow-main">
          {paciente ? (
            <DetalheDoPaciente
              equipe={equipe}
              pacienteId={paciente.id}
              aplicadorId={selecao.applicatorId}
              assinados={assinados}
              locale={locale}
              onEscolherAplicador={(id) => setSelecao(pickApplicator(equipe, selecao, id, escopo))}
              onAbrirLote={abrirLote}
            />
          ) : aplicador ? (
            <DetalheDoAplicador
              equipe={equipe}
              aplicadorId={aplicador.id}
              assinados={assinados}
              locale={locale}
              mostraSupervisor={comColunaDeSupervisores}
              onEscolherSupervisor={(id) => setSelecao(pickSupervisor(equipe, selecao, id, escopo))}
              onRevisar={() =>
                abrirLote(
                  aplicador.name,
                  sessionsToSign(equipe, { applicatorIds: [aplicador.id] }, assinados),
                )
              }
            />
          ) : supervisor ? (
            <DetalheDoSupervisor
              equipe={equipe}
              supervisorId={supervisor.id}
              assinados={assinados}
              onRevisar={() =>
                abrirLote(
                  supervisor.name,
                  sessionsToSign(
                    equipe,
                    { applicatorIds: applicatorsOfSupervisor(equipe, supervisor.id) },
                    assinados,
                  ),
                )
              }
            />
          ) : (
            <VisaoGeral
              equipe={equipe}
              assinados={assinados}
              onRevisar={() =>
                abrirLote("Sua equipe de supervisão", sessionsToSign(equipe, {}, assinados))
              }
            />
          )}
        </section>
      </div>

      {lote && (
        <LoteDeAssinaturas
          equipe={equipe}
          titulo={lote.titulo}
          sessoes={lote.sessoes}
          locale={locale}
          onAssinar={assinar}
          onFechar={fecharLote}
        />
      )}
    </div>,
  );
}

function contem(nome: string, busca: string): boolean {
  const termo = busca.trim().toLowerCase();
  return termo.length === 0 || nome.toLowerCase().includes(termo);
}

function quantia(quantos: number, singular: string, plural: string): string {
  return `${quantos} ${quantos === 1 ? singular : plural}`;
}

function applicatorsDoPaciente(equipe: SupervisionTeamData, pacienteId: string): number {
  return new Set(
    equipe.sessions.filter((s) => s.patientId === pacienteId).map((s) => s.applicatorId),
  ).size;
}

/**
 * Os três indicadores do topo são `card/1` com `info_card/1` dentro.
 *
 * A primeira versão desta tela desenhava o cartão à mão — quadrado de ícone,
 * número e rótulo, com padding e paleta próprios. `info_card/1` é exatamente
 * isso, e vinha com duas coisas que eu não tinha: o número no peso e no tamanho
 * do sistema, e **o estado de carregamento embutido** — sem `info`, o componente
 * mostra uma barra pulsando no lugar do número, que é o que a pessoa vê enquanto
 * o painel carrega.
 *
 * O fundo colorido é o do próprio `card/1`: `extract_bg_class/1` deixa o cartão
 * branco a menos que quem o usa passe uma classe de fundo. É a regra pequena que
 * permite os cartões coloridos do produto sem uma propriedade a mais, e é o que
 * reproduz o azul da fila e o amarelo das faltas do desenho.
 *
 * **A cor do número é a do produto, e ela reprova.** O número é 20px extrabold,
 * então o limiar AA é 3:1 e não 4,5 — mesmo assim `orange` fica em 2,94 sobre
 * branco, e menos que isso sobre o creme do cartão. `accent` (6,68) e `info`
 * (4,74) passariam, e nenhum dos dois é a cor que o desenho pede para "Faltas".
 * Mesma escolha das etiquetas de contagem, registrada na decisão 0016: os pares
 * ficam em `knownProductionFailures` e o cartão leva `espelho-do-sistema`.
 */
function Indicador({
  id,
  icone,
  valor,
  rotulo,
  variante,
}: {
  id: string;
  icone: string;
  valor: number;
  rotulo: string;
  variante: InfoCardVariant;
}) {
  /*
   * Só a variante que reprova sai da varredura.
   *
   * Sobre branco, `accent` dá 6,68 e `blue` dá 3,40 — os dois passam, porque o
   * número é 20px extrabold e o limiar de texto grande é 3:1. `orange` fica em
   * 2,94 e perde por 0,06; é ele, e só ele, que leva `espelho-do-sistema`.
   * Marcar os três tiraria do axe duas cores que ele deveria conferir.
   */
  const reprova = variante === "orange";

  return (
    <CartaoDoSistema
      id={`indicador-${id}`}
      {...(reprova ? { className: "espelho-do-sistema" } : {})}
    >
      <InfoCard title={rotulo} info={String(valor)} variant={variante} icon={icone} />
    </CartaoDoSistema>
  );
}

/* ================================================== painéis de detalhe */

function VisaoGeral({
  equipe,
  assinados,
  onRevisar,
}: {
  equipe: SupervisionTeamData;
  assinados: ReadonlySet<string>;
  onRevisar: () => void;
}) {
  const fila = pendingInScope(equipe, {}, assinados);

  return (
    <div className="space-y-4">
      <Cabecalho
        nome="Sua equipe de supervisão"
        detalhe={`${quantia(equipe.supervisors.length, "supervisor", "supervisores")} · ${quantia(equipe.applicators.length, "aplicador", "aplicadores")} · ${quantia(equipe.patients.length, "paciente", "pacientes")}`}
        icone="fa-people-group"
      />
      <BarraDeAssinatura
        quantas={fila}
        frase="aguardando assinatura na equipe."
        onRevisar={onRevisar}
      />
      <Pista>Selecione um supervisor, um aplicador ou um paciente em qualquer coluna.</Pista>
    </div>
  );
}

function DetalheDoSupervisor({
  equipe,
  supervisorId,
  assinados,
  onRevisar,
}: {
  equipe: SupervisionTeamData;
  supervisorId: string;
  assinados: ReadonlySet<string>;
  onRevisar: () => void;
}) {
  const supervisor = equipe.supervisors.find((item) => item.id === supervisorId)!;
  const fila = pendingOfSupervisor(equipe, supervisorId, assinados);
  const aplicadores = applicatorsOfSupervisor(equipe, supervisorId);
  const nunca = aplicadores.filter(
    (id) => !equipe.applicators.find((item) => item.id === id)?.lastSupervisionOn,
  );

  return (
    <div className="space-y-4">
      <Cabecalho
        nome={supervisor.name}
        detalhe={`${supervisor.specialtyName} · Supervisor`}
        tipo="supervisor"
      />
      <BarraDeAssinatura
        quantas={fila}
        frase="aguardando a assinatura dele."
        onRevisar={onRevisar}
      />

      {/* A supervisão que não aconteceu não deixa registro em nenhuma outra tela
          do sistema. Se ela não for dita aqui, não é dita em lugar nenhum. */}
      {nunca.length > 0 && (
        <Notice
          tone="warn"
          title={
            nunca.length === 1
              ? "Um aplicador desta carteira nunca foi supervisionado"
              : `${nunca.length} aplicadores desta carteira nunca foram supervisionados`
          }
          level={3}
        >
          <p className="m-0 break-words">
            {nunca
              .map((id) => equipe.applicators.find((item) => item.id === id)?.name)
              .filter(Boolean)
              .join(", ")}
            . A ausência de supervisão não gera pendência em nenhuma fila — ela só aparece quando
            alguém pergunta.
          </p>
        </Notice>
      )}

      <Pista>Selecione um aplicador ou um paciente para detalhar.</Pista>
    </div>
  );
}

function DetalheDoAplicador({
  equipe,
  aplicadorId,
  assinados,
  locale,
  mostraSupervisor,
  onEscolherSupervisor,
  onRevisar,
}: {
  equipe: SupervisionTeamData;
  aplicadorId: string;
  assinados: ReadonlySet<string>;
  locale: string | undefined;
  mostraSupervisor: boolean;
  onEscolherSupervisor: (id: string) => void;
  onRevisar: () => void;
}) {
  const aplicador = equipe.applicators.find((item) => item.id === aplicadorId)!;
  const supervisor = equipe.supervisors.find((item) => item.id === aplicador.supervisorId);
  const fila = pendingOfApplicator(equipe, aplicadorId, assinados);
  const faltas = equipe.sessions.filter(
    (sessao) => sessao.applicatorId === aplicadorId && sessao.status === "missed",
  ).length;
  const atencao = applicatorAlerts(equipe, aplicadorId);

  return (
    <div className="space-y-4">
      <Cabecalho
        nome={aplicador.name}
        detalhe={`${aplicador.roleName} · ${aplicador.specialtyName}`}
        tipo="aplicador"
      />
      <BarraDeAssinatura quantas={fila} frase="aguardando assinatura." onRevisar={onRevisar} />

      {mostraSupervisor && supervisor && (
        <Bloco titulo="Supervisor">
          <button
            type="button"
            onClick={() => onEscolherSupervisor(supervisor.id)}
            className="flex w-full items-center gap-3 rounded-field border border-[var(--border-soft)] px-3 py-2.5 text-left hover:bg-ink-50"
          >
            <Iniciais nome={supervisor.name} tipo="supervisor" />
            <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold text-navy">
              {supervisor.name}
            </span>
            <Icon name="fa-chevron-right" className="shrink-0 text-[var(--fg-2)]" />
          </button>
        </Bloco>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Medida
          valor={String(patientsOfApplicator(equipe, aplicadorId).length)}
          rotulo="Pacientes"
        />
        <Medida valor={String(faltas)} rotulo="Faltas no período" alerta={faltas > 0} />
        <Medida
          valor={
            aplicador.lastSupervisionOn
              ? formatDate(`${aplicador.lastSupervisionOn}T12:00:00.000-03:00`, locale)
              : "Nunca"
          }
          rotulo="Última supervisão"
          alerta={!aplicador.lastSupervisionOn}
        />
      </div>

      {/* O número na coluna precisa ter onde ser lido. Um "4" sem lista é um
          alarme sem endereço, e quem coordena não age em cima dele. */}
      {atencao.length > 0 && (
        <Bloco
          titulo={
            atencao.length === 1
              ? "1 ponto de atenção"
              : `${atencao.length} pontos de atenção`
          }
        >
          <ul className="m-0 list-none space-y-1.5 p-0">
            {atencao.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 break-words text-[0.875rem] text-navy"
              >
                <Icon name="fa-circle-exclamation" className="mt-0.5 shrink-0 text-warn-fg" />
                {item}
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      <Pista>Selecione um paciente para ver programas e atendimentos.</Pista>
    </div>
  );
}

function Medida({
  valor,
  rotulo,
  alerta = false,
}: {
  valor: string;
  rotulo: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-card border px-3 py-2.5 text-center",
        alerta ? "border-warn-fg/25 bg-warn-bg" : "border-[var(--border-soft)] bg-surface",
      ].join(" ")}
    >
      <p className="m-0 break-words text-[0.9375rem] font-bold text-navy">{valor}</p>
      <p className="m-0 break-words text-[0.8125rem] text-[var(--fg-2)]">{rotulo}</p>
    </div>
  );
}

function DetalheDoPaciente({
  equipe,
  pacienteId,
  aplicadorId,
  assinados,
  locale,
  onEscolherAplicador,
  onAbrirLote,
}: {
  equipe: SupervisionTeamData;
  pacienteId: string;
  aplicadorId: string | undefined;
  assinados: ReadonlySet<string>;
  locale: string | undefined;
  onEscolherAplicador: (id: string) => void;
  onAbrirLote: (titulo: string, sessoes: SupervisionSession[]) => void;
}) {
  const paciente = equipe.patients.find((item) => item.id === pacienteId)!;
  const fila = pendingOfPatient(equipe, pacienteId, assinados);
  const atencao = patientAlerts(equipe, pacienteId);

  const quemAtende = equipe.applicators.filter((item) =>
    equipe.sessions.some(
      (sessao) => sessao.patientId === pacienteId && sessao.applicatorId === item.id,
    ),
  );

  const atendimentos = equipe.sessions
    .filter((sessao) => sessao.patientId === pacienteId)
    .filter((sessao) => aplicadorId === undefined || sessao.applicatorId === aplicadorId)
    .slice()
    .sort((a, b) => b.start.localeCompare(a.start));

  const supervisores = supervisorsOfPatient(equipe, pacienteId);

  return (
    <div className="space-y-4">
      <Cabecalho
        nome={paciente.name}
        detalhe={`${ageInYears(paciente.birthDate, equipe.now)} anos · ${quantia(supervisores.length, "supervisor", "supervisores")}`}
        tipo="paciente"
      />
      <BarraDeAssinatura
        quantas={fila}
        frase="aguardando assinatura."
        onRevisar={() =>
          onAbrirLote(
            paciente.name,
            sessionsToSign(
              equipe,
              {
                patientId: pacienteId,
                ...(aplicadorId ? { applicatorIds: [aplicadorId] } : {}),
              },
              assinados,
            ),
          )
        }
      />

      <Bloco titulo="Atendido por">
        <ul className="m-0 list-none space-y-2 p-0">
          {quemAtende.map((item) => {
            const dele = equipe.supervisors.find((sup) => sup.id === item.supervisorId);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={aplicadorId === item.id}
                  onClick={() => onEscolherAplicador(item.id)}
                  className={[
                    "flex w-full items-center gap-3 rounded-field border px-3 py-2.5 text-left",
                    aplicadorId === item.id
                      ? "border-action bg-info-bg"
                      : "border-[var(--border-soft)] hover:bg-ink-50",
                  ].join(" ")}
                >
                  <Iniciais nome={item.name} tipo="aplicador" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-semibold text-navy">
                      {item.name}
                    </span>
                    {/* De quem é a assinatura: é a resposta que a pergunta da
                        família precisa, e ela some se ficar só na coluna. */}
                    <span className="block truncate text-[0.8125rem] text-[var(--fg-2)]">
                      {item.roleName} · supervisão de {dele?.name ?? "—"}
                    </span>
                  </span>
                  <Fila quantas={pendingOfPair(equipe, item.id, pacienteId, assinados)} />
                </button>
              </li>
            );
          })}
        </ul>
      </Bloco>

      <Bloco titulo="Programas">
        <ul className="m-0 list-none space-y-1.5 p-0">
          {paciente.programs.map((programa) => (
            <li
              key={programa.name}
              className={[
                "flex flex-wrap items-center justify-between gap-2 rounded-field px-3 py-2",
                trendNeedsAttention(programa.trend) ? "bg-warn-bg" : "bg-ink-50",
              ].join(" ")}
            >
              <span className="min-w-0 break-words text-[0.9375rem] text-navy">
                {programa.name}
              </span>
              <Tendencia trend={programa.trend} />
            </li>
          ))}
        </ul>
      </Bloco>

      {atencao.length > 0 && (
        <Bloco
          titulo={atencao.length === 1 ? "1 ponto de atenção" : `${atencao.length} pontos de atenção`}
        >
          <ul className="m-0 list-none space-y-1.5 p-0">
            {atencao.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 break-words text-[0.875rem] text-navy"
              >
                <Icon name="fa-circle-exclamation" className="mt-0.5 shrink-0 text-warn-fg" />
                {item}
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      <Bloco titulo="Atendimentos">
        {atendimentos.length === 0 ? (
          <p className="m-0 break-words text-[0.875rem] text-[var(--fg-2)]">
            Nenhum atendimento deste paciente no período.
          </p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {atendimentos.map((sessao) => (
              <li key={sessao.id}>
                <LinhaDeAtendimento
                  equipe={equipe}
                  sessao={sessao}
                  assinados={assinados}
                  locale={locale}
                  onRevisar={() => onAbrirLote(paciente.name, [sessao])}
                />
              </li>
            ))}
          </ul>
        )}
      </Bloco>
    </div>
  );
}

function LinhaDeAtendimento({
  equipe,
  sessao,
  assinados,
  locale,
  onRevisar,
}: {
  equipe: SupervisionTeamData;
  sessao: SupervisionSession;
  assinados: ReadonlySet<string>;
  locale: string | undefined;
  onRevisar: () => void;
}) {
  const quem = equipe.applicators.find((item) => item.id === sessao.applicatorId);
  const assinado = sessao.status === "pending_supervisor_signature" && assinados.has(sessao.id);
  const pendente = isPendingSignature(sessao, assinados);

  return (
    <article
      className={[
        "rounded-field border px-3 py-2.5",
        isPendingSignature(sessao, assinados)
          ? "border-info-fg/35 bg-info-bg"
          : "border-[var(--border-soft)]",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-bold text-navy">
          {formatDate(sessao.start, locale)}
        </span>
        <span className="text-[0.8125rem] text-[var(--fg-2)]">
          {formatTime(sessao.start, locale)} às {formatTime(sessao.end, locale)}
        </span>
        <ScheduleStatusChip status={assinado ? "finished" : sessao.status} />
      </div>

      <p className="m-0 mt-1 break-words text-[0.9375rem] text-navy">
        {sessao.serviceName} · {quem?.name ?? "—"}
      </p>

      <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 break-words text-[0.8125rem] text-[var(--fg-2)]">
        <span>{sessao.hasRecord ? "Registro feito" : "Sem registro"}</span>
        <span>{sessao.placeName}</span>
        {sessao.abc.length > 0 && (
          <span>
            {quantia(sessao.abc.length, "registro de comportamento", "registros de comportamento")}
          </span>
        )}
        {assinado && <span className="font-semibold text-ok-fg">Assinado por você agora</span>}
      </p>

      {/* A ação da linha **abre a revisão** deste atendimento; ela não assina.
          Um botão "Assinar" aqui seria assinar sem ver o registro, que é o que a
          fila de revisão existe para não deixar acontecer. */}
      {pendente && (
        <div className="mt-2">
          <Button
            className="espelho-do-sistema"
            size="medium"
            variant="tint"
            rightIcon="fa-signature"
            onClick={onRevisar}
          >
            Revisar e assinar
          </Button>
        </div>
      )}
    </article>
  );
}

/* ==================================================== lote de revisão */

/**
 * A fila de revisão: um atendimento por vez, com o registro à vista.
 *
 * **É `drawer_modal/1`, e não `modal/1`.** O registro de um atendimento tem
 * quatro campos de cabeçalho, um programa por cartão, a observação e os registros
 * de comportamento — conteúdo que rola. Num diálogo centrado as ações rolavam com
 * ele: quem chegava ao fim do ABC não tinha mais "Assinar e avançar" à vista, e
 * quem parava no meio não sabia que existia. O drawer prende cabeçalho e rodapé
 * nas bordas e rola só o miolo, que é a moldura da decisão 0014 e o motivo dela.
 *
 * O andamento — "3 de 7 · 2 assinados" — mudou de lugar junto: saiu do topo e foi
 * para o rodapé, ao lado das ações. É a informação que decide se vale continuar, e
 * ela precisa estar onde a decisão é tomada.
 *
 * Duas divergências do desenho, as duas por causa do dedo:
 *
 * - **O trilho tem alvos de 24px**, e não os pontos de 8px do desenho. Um ponto
 *   de 8px é inalcançável no toque e some para quem tem tremor — e o trilho é o
 *   único jeito de voltar a um atendimento pulado.
 * - **Assinar e deixar na fila ficam lado a lado**, na ordem em que a decisão
 *   acontece: primeiro se lê, depois se decide.
 */
function LoteDeAssinaturas({
  equipe,
  titulo,
  sessoes,
  locale,
  onAssinar,
  onFechar,
}: {
  equipe: SupervisionTeamData;
  titulo: string;
  sessoes: SupervisionSession[];
  locale: string | undefined;
  onAssinar: (id: string) => void;
  onFechar: (quantas: number) => void;
}) {
  const [atual, setAtual] = useState(0);
  const [dadas, setDadas] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [puladas, setPuladas] = useState<ReadonlySet<string>>(() => new Set<string>());

  const ids = sessoes.map((sessao) => sessao.id);
  const resolvidas = new Set([...dadas, ...puladas]);
  const acabou = resolvidas.size >= sessoes.length;
  const sessao = sessoes[atual];

  function avancar() {
    const proxima = nextUnresolved(ids, atual, resolvidas);
    if (proxima >= 0) setAtual(proxima);
  }

  /**
   * Os dois conjuntos são disjuntos por construção.
   *
   * Sem esta guarda, dois cliques dentro do mesmo lote de atualizações do React
   * — um duplo-clique impaciente, ou o segundo botão antes de a tela repintar —
   * põem o **mesmo** atendimento em `dadas` e em `puladas`. Nada quebra, e o
   * resumo passa a mentir: "6 assinados · 2 na fila" numa fila de sete. Foi assim
   * que apareceu, clicando rápido.
   */
  function assinarEsta() {
    if (!sessao || resolvidas.has(sessao.id)) return;
    onAssinar(sessao.id);
    setDadas((antes) => new Set(antes).add(sessao.id));
    avancar();
  }

  function pularEsta() {
    if (!sessao || resolvidas.has(sessao.id)) return;
    setPuladas((antes) => new Set(antes).add(sessao.id));
    avancar();
  }

  const terminou = acabou || !sessao;

  return (
    <DrawerModal
      id="lote-de-assinaturas"
      show
      title="Assinar atendimentos"
      titleClassName="text-[var(--color-brand-purple-dark)]"
      variant="medium"
      onCancel={() => onFechar(dadas.size)}
      footer={
        terminou ? (
          <div className="flex justify-end">
            <Button
              className="espelho-do-sistema"
              rightIcon="fa-check"
              onClick={() => onFechar(dadas.size)}
            >
              Concluir
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* O andamento fica junto das ações, e não no topo: é a informação
                que decide se vale continuar. */}
            <p className="m-0 break-words text-[0.875rem] text-[var(--fg-2)]">
              <strong className="font-bold text-navy">{atual + 1}</strong> de {sessoes.length}
              {dadas.size > 0 && ` · ${quantia(dadas.size, "assinado", "assinados")}`}
              {puladas.size > 0 && ` · ${quantia(puladas.size, "na fila", "na fila")}`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <AcaoLocal variant="ghost" onClick={pularEsta}>
                Deixar na fila
              </AcaoLocal>
              <Button
                className="espelho-do-sistema"
                rightIcon="fa-signature"
                onClick={assinarEsta}
              >
                Assinar e avançar
              </Button>
            </div>
          </div>
        )
      }
    >
      {terminou ? (
        <div className="space-y-4 text-center">
          <p className="m-0 text-[1.0625rem] font-bold text-navy" role="status">
            {dadas.size === 0
              ? "Nenhum atendimento assinado"
              : quantia(dadas.size, "atendimento assinado", "atendimentos assinados")}
          </p>
          <p className="m-0 break-words text-[0.9375rem] text-[var(--fg-2)]">
            {puladas.size > 0
              ? `${quantia(puladas.size, "atendimento continua", "atendimentos continuam")} na fila — pular não assina, e não é a mesma coisa que recusar.`
              : "Não há mais nada esperando assinatura neste escopo."}
          </p>
        </div>
      ) : (
        <RevisaoDeAtendimento
          equipe={equipe}
          titulo={titulo}
          sessao={sessao!}
          posicao={atual}
          total={sessoes.length}
          sessoes={sessoes}
          dadas={dadas}
          puladas={puladas}
          locale={locale}
          onIr={setAtual}
        />
      )}
    </DrawerModal>
  );
}

function RevisaoDeAtendimento({
  equipe,
  titulo,
  sessao,
  posicao,
  total,
  sessoes,
  dadas,
  puladas,
  locale,
  onIr,
}: {
  equipe: SupervisionTeamData;
  titulo: string;
  sessao: SupervisionSession;
  posicao: number;
  total: number;
  sessoes: SupervisionSession[];
  dadas: ReadonlySet<string>;
  puladas: ReadonlySet<string>;
  locale: string | undefined;
  onIr: (indice: number) => void;
}) {
  const quem = equipe.applicators.find((item) => item.id === sessao.applicatorId);
  const paciente = equipe.patients.find((item) => item.id === sessao.patientId);
  const supervisor = equipe.supervisors.find((item) => item.id === quem?.supervisorId);

  return (
    <div className="space-y-4">
      <div>
        {/* O escopo do lote só é dito quando ele não é o próprio paciente.
            "Lucas Almeida Ferreira" duas vezes seguidas não informa nada. */}
        {titulo !== paciente?.name && (
          <p className="m-0 break-words text-[0.8125rem] font-bold uppercase tracking-wide text-action">
            {titulo}
          </p>
        )}
        <h2 className="m-0 break-words text-[1.0625rem] font-bold text-navy">
          {paciente?.name ?? "—"}
        </h2>
        <p className="m-0 break-words text-[0.875rem] text-[var(--fg-2)]">
          {sessao.serviceName} · {quem?.name ?? "—"} ({quem?.roleName ?? "—"})
        </p>
      </div>

      {/* O trilho: onde estou, o que já assinei, o que pulei. */}
      <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
        {sessoes.map((item, indice) => {
          const estado = dadas.has(item.id)
            ? "assinado"
            : puladas.has(item.id)
              ? "pulado"
              : "pendente";
          return (
            <li key={item.id}>
              {/* Resolvido continua alcançável pelo Tab e anuncia o estado, mas
                  não navega: voltar a um atendimento já assinado abriria a tela
                  com o botão de assinar ativo de novo. */}
              <button
                type="button"
                aria-disabled={estado !== "pendente" || undefined}
                onClick={() => {
                  if (estado === "pendente") onIr(indice);
                }}
                aria-current={indice === posicao ? "step" : undefined}
                aria-label={`Atendimento ${indice + 1} de ${total} — ${
                  estado === "assinado"
                    ? "assinado"
                    : estado === "pulado"
                      ? "deixado na fila"
                      : "aguardando revisão"
                }`}
                className="flex h-6 w-6 items-center justify-center rounded-full"
              >
                <span
                  aria-hidden="true"
                  className={[
                    "block rounded-full",
                    indice === posicao ? "h-3 w-3" : "h-2 w-2",
                    estado === "assinado"
                      ? "bg-ok-fg"
                      : estado === "pulado"
                        ? "bg-warn-fg"
                        : indice === posicao
                          ? "bg-action"
                          : "bg-ink-200",
                  ].join(" ")}
                />
              </button>
            </li>
          );
        })}
      </ul>

      <dl className="m-0 grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Data" valor={formatDate(sessao.start, locale)} />
        <Campo
          rotulo="Horário"
          valor={`${formatTime(sessao.start, locale)} às ${formatTime(sessao.end, locale)}`}
        />
        <Campo rotulo="Local" valor={sessao.placeName} />
        <Campo rotulo="Supervisor" valor={supervisor?.name ?? "—"} />
      </dl>

      <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 break-words text-[0.875rem] text-navy">
        <span>{sessao.hasRecord ? "Registro completo" : "Sem registro"}</span>
        {sessao.checkinAt && <span>Entrada às {formatTime(sessao.checkinAt, locale)}</span>}
        {sessao.checkoutAt && <span>Saída às {formatTime(sessao.checkoutAt, locale)}</span>}
      </p>

      <section>
        <h3 className="m-0 mb-2 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--fg-2)]">
          Programas trabalhados
        </h3>
        {sessao.programs.length === 0 ? (
          <p className="m-0 break-words text-[0.875rem] text-[var(--fg-2)]">
            Nenhum programa registrado neste atendimento.
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            {sessao.programs.map((programa) => {
              const percentual = Math.round((programa.correct / programa.trials) * 100);
              return (
                <li
                  key={programa.name}
                  className="rounded-card border border-[var(--border-soft)] px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 break-words text-[0.9375rem] font-semibold text-navy">
                      {programa.name}
                    </span>
                    <Tendencia trend={programa.trend} />
                  </div>
                  <Progress
                    className="espelho-do-sistema mt-2"
                    value={percentual}
                    showPercentage={false}
                    variant={percentual >= 70 ? "green" : percentual >= 50 ? "default" : "error"}
                  />
                  <p className="m-0 mt-1 break-words text-[0.8125rem] text-[var(--fg-2)]">
                    {programa.correct} de {programa.trials} tentativas corretas · {percentual}%
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="m-0 mb-2 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--fg-2)]">
          Observação de quem aplicou
        </h3>
        <p className="m-0 break-words rounded-card bg-ink-50 px-3 py-2.5 text-[0.9375rem] text-navy">
          {sessao.note ?? "Nenhuma observação foi escrita neste atendimento."}
        </p>
      </section>

      {sessao.abc.length > 0 && (
        <section>
          <h3 className="m-0 mb-2 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--fg-2)]">
            Registros de comportamento
          </h3>
          <ul className="m-0 list-none space-y-2 p-0">
            {sessao.abc.map((registro) => (
              <li
                key={registro.behavior}
                className="rounded-card border border-warn-fg/25 bg-warn-bg px-3 py-2.5"
              >
                <p className="m-0 break-words text-[0.8125rem] font-semibold text-warn-fg">
                  Duração de {registro.minutes} minutos
                </p>
                <dl className="m-0 mt-1.5 grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-3 gap-y-1">
                  <Par rotulo="Antecedente" valor={registro.antecedent} />
                  <Par rotulo="Comportamento" valor={registro.behavior} />
                  <Par rotulo="Consequência" valor={registro.consequence} />
                </dl>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-card border border-[var(--border-soft)] px-3 py-2">
      <dt className="text-[0.8125rem] text-[var(--fg-2)]">{rotulo}</dt>
      <dd className="m-0 break-words text-[0.9375rem] font-semibold text-navy">{valor}</dd>
    </div>
  );
}

function Par({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="contents">
      <dt className="text-[0.8125rem] text-[var(--fg-2)]">{rotulo}</dt>
      <dd className="m-0 break-words text-[0.875rem] text-navy">{valor}</dd>
    </div>
  );
}

/* =============================================================== moldura */

function moldura(context: ScreenProps["context"], children: ReactNode) {
  return (
    <AppShell
      context={context}
      title="Supervisão"
      subtitle="Supervisores, aplicadores e pacientes — três entradas para a mesma relação"
      breadcrumb={[{ label: "Supervisão" }]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
