import { useMemo, useState, type ReactNode } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  ProgramTrend,
  ScheduleStatus,
  SupervisionSession,
  SupervisionTeamData,
} from "../contracts/index.js";
import {
  ageInYears,
  formatDate,
  formatDayMonth,
  formatNumericDate,
  formatTime,
} from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  scheduleStatusLabel,
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
import { DrawerModal, Modal } from "../components/bloomy/Overlay.js";
import { Tag, type TagVariant } from "../components/bloomy/Tag.js";
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

/**
 * As iniciais num círculo, **uma cor só para as três pontas**.
 *
 * A primeira versão pintava supervisor, aplicador e paciente de três cores
 * diferentes, e o círculo passava a dizer o tipo. Só que o tipo já está dito
 * pela coluna em que o nome mora, e a mesma pessoa aparece nas duas — o
 * supervisor no painel do aplicador, o aplicador na lista de quem atende o
 * paciente — trocando de cor no caminho. Uma cor: o círculo é âncora do nome, e
 * não um segundo canal de informação que contradiz o primeiro.
 *
 * **A cor é o texto rebaixado: fundo em navy a 10%, iniciais em navy a 80%.** O
 * azul cheio do `avatar/1` esteve aqui, e ele punha a cor mais saturada da tela
 * em doze círculos que não carregam informação nenhuma — a coluna virava um
 * mostruário de azul, e o que precisa ser visto de longe é o selo de fila.
 *
 * As duas opacidades se compõem a favor. O fundo é translúcido, então dentro de
 * uma linha que já é navy a 10% ele chega a 19% e o círculo aparece; sobre o
 * branco do painel de detalhe fica em 10% e continua aparecendo. Uma cor só,
 * dois contextos, sem variante.
 *
 * De passagem o contraste deixou de ser divergência: as iniciais dão 5,84:1
 * dentro da linha e 6,61:1 sobre o branco, contra os 2,47 do azul cheio. O
 * círculo continua sendo decoração `aria-hidden` com o nome inteiro ao lado — só
 * que agora quem o vê, lê.
 */
function Iniciais({ nome, tamanho = "normal" }: { nome: string; tamanho?: "normal" | "grande" }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "flex shrink-0 items-center justify-center rounded-full",
        "bg-navy/10 font-bold text-navy/80",
        tamanho === "grande" ? "h-12 w-12 text-[1.0625rem]" : "h-9 w-9 text-[0.8125rem]",
      ].join(" ")}
    >
      {inicial(nome)}
    </span>
  );
}

/**
 * Os selos são `tag/1`, o componente do sistema.
 *
 * A primeira versão desta tela os desenhava à mão — dois `span` com raio,
 * padding e paleta próprios — e o resultado era duas implementações de etiqueta
 * na mesma tela, porque a tendência do programa já usava a do repositório. É a
 * mesma correção da decisão 0001: o componente do sistema no lugar do que eu
 * tinha desenhado.
 *
 * **As duas são claras: `light-blue` na fila e `red` nos pontos de atenção.** As
 * invertidas — fundo cheio, texto claro — estiveram aqui e foram desfeitas: numa
 * coluna de doze linhas, dois retângulos de cor cheia por linha viram o assunto da
 * tela, e o assunto da tela são os nomes. O selo claro pede um segundo de atenção
 * a mais e devolve uma coluna que se lê de cima a baixo.
 *
 * **E o selo claro passou a ser legível.** Ele ficou muito tempo em 2,14:1, com o
 * argumento de que a cor de sinal do produto valia mais que a razão de contraste —
 * o ícone distingue os dois selos, e o `title` mais o rótulo `sr-only` entregam a
 * frase inteira ("3 atendimentos aguardando assinatura"), que é o requisito de
 * 1.4.1. O que não se resolvia era 1.4.3: quem depende do contraste não lia o
 * número.
 *
 * O argumento caiu quando ficou claro que só o **texto** carregava a divergência.
 * O `tag/1` deste repositório mantém o fundo do produto e escurece o texto para o
 * tom da própria família, e as cinco variantes de sinal passam AA sem trocar de
 * cor: `light-blue` em 5,25 e `red` em 6,77. É a decisão 0001 aplicada onde a
 * decisão 0016 tinha apontado.
 *
 * Por isso o `espelho-do-sistema` saiu dos selos, aqui e nas etiquetas de situação
 * e de tendência: não há mais reprovação do `tag/1` para o axe deixar passar, e a
 * varredura volta a conferi-los como confere o resto da tela.
 */
function Fila({ quantas }: { quantas: number }) {
  if (quantas === 0) return null;
  const rotulo = `${quantas} ${quantas === 1 ? "atendimento aguardando assinatura" : "atendimentos aguardando assinatura"}`;

  return (
    <span className="inline-flex shrink-0 items-center">
      <Tag
        item={String(quantas)}
        variant="light-blue"
        icon="fa-signature"
        title={rotulo}
      />
      <span className="sr-only">{rotulo}</span>
    </span>
  );
}

/**
 * Pontos de atenção, em número. O detalhe lista quais são.
 *
 * `red` e não `yellow`: os pontos são guia vencendo, programa estagnado, faltas
 * e supervisão que nunca aconteceu — nenhum deles é "atenção", todos são coisa
 * parada.
 */
function Atencao({ quantos }: { quantos: number }) {
  if (quantos === 0) return null;
  const rotulo = `${quantos} ${quantos === 1 ? "ponto de atenção" : "pontos de atenção"}`;

  return (
    <span className="inline-flex shrink-0 items-center">
      <Tag
        item={String(quantos)}
        variant="red"
        icon="fa-triangle-exclamation"
        title={rotulo}
      />
      <span className="sr-only">{rotulo}</span>
    </span>
  );
}

/**
 * Tendência do programa, em `tag/1` — não mais no `Chip` local.
 *
 * A tela tinha duas anatomias de etiqueta e duas réguas de contraste: `Tag` na
 * contagem e `Chip` na tendência e na situação. A decisão 0016 registrou a
 * inconsistência e apontou o caminho — usar o componente do sistema e cobrar a
 * dívida de contraste na origem, escurecendo os tokens do `tag/1`, em vez de
 * escolher variante por variante. As duas metades estão feitas: uma etiqueta só, e
 * o texto dela escurecido no espelho.
 *
 * O ícone é o segundo canal, e ele é o que faz a etiqueta funcionar em preto e
 * branco: seta para cima, seta para baixo, dois sentidos, pausa.
 */
const TENDENCIA: Record<ProgramTrend, { variant: TagVariant; icon: string }> = {
  up: { variant: "green", icon: "fa-arrow-trend-up" },
  flat: { variant: "light-blue", icon: "fa-arrows-left-right" },
  stalled: { variant: "orange", icon: "fa-pause" },
  down: { variant: "red", icon: "fa-arrow-trend-down" },
};

function Tendencia({ trend }: { trend: ProgramTrend }) {
  const { variant, icon } = TENDENCIA[trend];
  return (
    <Tag
      className="shrink-0"
      item={programTrendLabel(trend)}
      variant={variant}
      icon={icon}
    />
  );
}

/**
 * Situação do atendimento, em `tag/1`.
 *
 * **Os rótulos continuam os do produto**, e não os do desenho. O desenho escreve
 * "Concluído" e "Assinar"; `priv/gettext/pt_BR/LC_MESSAGES/enums.po` escreve
 * "Finalizado" e "Assinatura Supervisor", e é a palavra que a clínica usa em voz
 * alta. Trocar por uma mais curta faria a especificação divergir do produto num
 * lugar em que ninguém iria conferir.
 *
 * `pending_supervisor_signature` é a única que sai do mapa de tons do `Chip`:
 * ela vai em `purple` em vez do laranja de pendência, porque é a situação sobre
 * a qual esta tela inteira existe. `purple` já atingia AA antes da correção do
 * espelho (4,89:1), e continua.
 */
const SITUACAO: Partial<Record<ScheduleStatus, { variant: TagVariant; icon?: string }>> = {
  scheduled: { variant: "light-blue" },
  incomplete: { variant: "yellow", icon: "fa-circle-exclamation" },
  ready_for_service: { variant: "green" },
  not_started: { variant: "orange" },
  delayed: { variant: "yellow", icon: "fa-clock" },
  ongoing: { variant: "brand" },
  pending_register: { variant: "orange", icon: "fa-clipboard" },
  pending_signature: { variant: "orange", icon: "fa-signature" },
  pending_supervisor_signature: { variant: "purple", icon: "fa-signature" },
  finished: { variant: "green", icon: "fa-circle-check" },
  cancelled: { variant: "red" },
  missed: { variant: "red", icon: "fa-user-xmark" },
};

function Situacao({ status }: { status: ScheduleStatus }) {
  const { variant, icon } = SITUACAO[status] ?? { variant: "brand" as TagVariant };
  return (
    <Tag
      className="shrink-0"
      item={scheduleStatusLabel(status)}
      variant={variant}
      {...(icon ? { icon } : {})}
    />
  );
}

/**
 * Um item de coluna.
 *
 * `aria-pressed` e não `aria-current`: o nó é um filtro que liga e desliga, e
 * clicar no que já está ligado desliga. `aria-current` diria "você está aqui",
 * que é outra coisa — e não teria como dizer que dá para sair.
 *
 * **Selecionado é o azul a 10% com contorno azul cheio; o resto é só contorno, no
 * navy a 10%.** A linha não selecionada já foi preenchida — `ink-50` primeiro,
 * depois o navy a 10% — e o preenchimento cinza num alvo clicável lê como
 * desabilitado: doze linhas apagadas com uma acesa, quando as doze são clicáveis.
 * Sem preenchimento, o branco do cartão é o fundo, o contorno delimita, e quem
 * ganha peso é só o que está selecionado.
 *
 * De passagem resolveu o selo: em cima do preenchimento tingido ele separava
 * 1,05:1 do fundo e precisou de um fio de 1px para aparecer. Contra o branco ele
 * separa sozinho, e o fio saiu.
 *
 * O contorno do selecionado é `--color-blue` cheio, e dá 2,47:1 sobre o branco do
 * cartão — abaixo dos 3:1 que a 1.4.11 pede para indicador de estado. É a mesma
 * escolha do círculo de iniciais, do backlog de 26/08, e o que a segura é que o
 * estado não está só na borda: o preenchimento aparece junto, e o `aria-pressed`
 * diz o que a cor diz.
 *
 * **Três colunas, e os selos são a terceira.** Eles dividiam a linha do nome, e
 * numa coluna de 273px "Rafael Andrade Nunes" ficava com o que sobrava de dois
 * selos — enquanto a linha de baixo tinha a largura toda para "Psicologia · 3
 * aplicadores". Como coluna própria, os selos ficam sempre no mesmo lugar,
 * centrados nas duas linhas, e as duas linhas de texto cortam na mesma medida.
 */
function No({
  nome,
  detalhe,
  selecionado,
  fila,
  atencao,
  onClick,
}: {
  nome: string;
  detalhe: string;
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
        "flex w-full items-center gap-2.5 rounded-card border px-3 py-2.5 text-left transition-colors",
        selecionado
          ? "border-[var(--color-blue)] bg-[var(--color-blue)]/10"
          : "border-[var(--border-soft)] hover:bg-navy/5",
      ].join(" ")}
    >
      <Iniciais nome={nome} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold text-navy">{nome}</span>
        <span className="mt-0.5 block truncate text-[0.8125rem] text-[var(--fg-2)]">
          {detalhe}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <Fila quantas={fila} />
        {atencao !== undefined && <Atencao quantos={atencao} />}
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
            dá 12,07:1 e é a única das dez que serve para número sem cor. */}
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

/**
 * Cabeçalho do painel de detalhe: quem é, e o que ele é.
 *
 * Sem `nome` de pessoa não há círculo — a visão geral é a equipe, e um quadrado
 * com as iniciais de "Sua equipe de supervisão" seria decoração fingindo ser
 * âncora.
 */
function Cabecalho({
  nome,
  detalhe,
  comIniciais = true,
}: {
  nome: string;
  detalhe: string;
  comIniciais?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {comIniciais && <Iniciais nome={nome} tamanho="grande" />}
      <div className="min-w-0">
        <h2 className="m-0 break-words text-[1.25rem] font-bold text-navy">{nome}</h2>
        <p className="m-0 break-words text-[0.875rem] text-[var(--fg-2)]">{detalhe}</p>
      </div>
    </div>
  );
}

/**
 * A barra que concentra a ação, ou a frase de que não há nada a fazer.
 *
 * O botão fica **abaixo** da frase, e não ao lado dela. Ao lado, ele dividia a
 * largura com um texto que muda de tamanho a cada escopo — "aguardando
 * assinatura na equipe" contra "aguardando assinatura" — e a ação principal da
 * tela mudava de posição a cada clique numa coluna.
 *
 * A cor é o azul a 10% com contorno cheio, o mesmo par da linha selecionada e da
 * sessão que espera assinatura. Era `info-bg` com o contorno em `info-fg/25` —
 * dois tons de azul separados por um passo pequeno, num lugar em que o par de
 * sinal já estava definido. Fila e "está selecionado" são a mesma família nesta
 * tela, e o verde da barra vazia é o que se separa das duas.
 */
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
    <div className="rounded-card border border-[var(--color-blue)] bg-[var(--color-blue)]/10 px-4 py-3.5">
      <p className="m-0 break-words text-[0.9375rem] text-navy">
        <strong className="font-bold">{quantas}</strong>{" "}
        {quantas === 1 ? "atendimento" : "atendimentos"} {frase}
      </p>
      <div className="mt-3">
        <Button className="espelho-do-sistema" rightIcon="fa-signature" onClick={onRevisar}>
          Revisar e assinar
        </Button>
      </div>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <section>
      <h3 className="m-0 mb-3 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--fg-2)]">
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
  const [lote, setLote] = useState<SupervisionSession[] | null>(null);
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

  function abrirLote(sessoes: SupervisionSession[]) {
    if (sessoes.length === 0) return;
    setLote(sessoes);
  }

  function assinar(id: string) {
    setAssinados((antes) => new Set(antes).add(id));
  }

  /**
   * O aviso só fala quando alguma coisa aconteceu.
   *
   * Fechar a fila sem assinar nada dizia "Nenhuma assinatura foi dada. Os
   * atendimentos seguem na fila." — em verde, com um ícone de confirmação, sobre
   * o resumo que acabou de dizer a mesma coisa em duas linhas. Nada mudou na
   * tela, então não há resultado a anunciar: a região volta a ficar vazia, e a
   * fila continua onde estava, com os mesmos números.
   */
  function fecharLote(quantas: number) {
    setLote(null);
    setAviso(
      quantas === 0
        ? ""
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
    /*
     * `flex flex-col gap-4`, e não `space-y-4`.
     *
     * `space-y-*` põe a margem no próprio filho, e todo filho que precisa zerar a
     * margem do navegador — `<p className="m-0">`, que aqui é a região viva —
     * apagava o espaçamento junto com ela. O espaço sumia sem erro nenhum para
     * investigar, e o `gap` do flex não passa por margem: nada do filho o desliga.
     */
    <div className="flex flex-col gap-4">
      {/* Sem aviso de escopo.
          A carteira travada se explica sozinha: não há coluna de supervisores, o
          cabeçalho do painel diz o nome de quem é a carteira, e os números são os
          dela. O aviso repetia isso em três linhas e empurrava a tela para baixo
          em todo carregamento. O custo — que esta visão depende de estender a
          permissão que lista supervisores — é fato de especificação, não recado
          de tela: mora na decisão 0016 e no `rationale` da regra. */}

      {/* ------------------------------------------------------ filtros
          `min-h-8` é a altura da marca de filtro — 24px do botão de fechar mais o
          padding —, e a linha a reserva mesmo quando o que está ali é a frase de
          uma linha só. Sem isso, o primeiro clique numa coluna crescia esta faixa
          em 7px e empurrava os indicadores e as três colunas para baixo, no mesmo
          quadro em que a pessoa procura o que mudou na coluna. */}
      <div className="flex min-h-8 min-w-0 flex-wrap items-center gap-2">
        {marcas.length === 0 ? (
          <p className="m-0 flex items-center gap-2 break-words text-[0.875rem] text-[var(--fg-2)]">
            <Icon name="fa-arrow-pointer" className="shrink-0" />
            Selecione em qualquer coluna para filtrar — os demais se ajustam automaticamente.
          </p>
        ) : (
          <>
            <span className="text-[0.875rem] font-semibold text-navy">Filtros:</span>
            {marcas.map((marca) => (
              <span
                key={marca.chave}
                className="inline-flex items-center gap-1 rounded-lg bg-info-bg py-0.5 pl-3 pr-1 text-[0.875rem] font-semibold text-info-fg"
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

      {/* --------------------------------------------------- indicadores
          Três cartões de largura fixa, encostados à esquerda, e não uma faixa de
          três colunas ocupando a tela toda. Um número de dois dígitos centrado
          num cartão de 480px é o número mais longe possível do rótulo dele. */}
      <div className="grid gap-3 sm:max-w-[43rem] sm:grid-cols-3">
        <Indicador
          id="atendimentos"
          icone="fa-calendar-check"
          valor={indicadores.appointments}
          rotulo="Atendimentos"
          variante="info"
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
          As quatro faixas só ficam lado a lado quando cada uma passa dos 270px,
          que é onde o desenho foi feito: a 1440 as colunas dão 273px e o painel
          419. A 1280 dariam 238px e a coluna do meio deixaria de servir de
          filtro — abaixo do corte o detalhe desce para baixo e as três colunas
          ficam com 371px. */}
      <div className="grid gap-4 min-[1440px]:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] min-[1440px]:items-start">
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
                  "terapeuta",
                  "terapeutas",
                )}`}
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
                abrirLote(sessionsToSign(equipe, { applicatorIds: [aplicador.id] }, assinados))
              }
            />
          ) : supervisor ? (
            <DetalheDoSupervisor
              equipe={equipe}
              supervisorId={supervisor.id}
              assinados={assinados}
              onRevisar={() =>
                abrirLote(
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
              onRevisar={() => abrirLote(sessionsToSign(equipe, {}, assinados))}
            />
          )}
        </section>
      </div>

      {lote && (
        <LoteDeAssinaturas
          equipe={equipe}
          sessoes={lote}
          locale={locale}
          assinados={assinados}
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
 * **O número é navy, e quem carrega o sinal é o quadrado do ícone.** No espelho
 * do sistema a variante tinge os dois, e era isso que a tela fazia: `orange`
 * ficava em 2,94:1 sobre branco — reprovado mesmo no limiar de texto grande, que
 * é 3:1 — e `blue` em 3,40, aprovado por 0,40. Três números de dois dígitos, que
 * são a primeira coisa que se lê na tela, dependendo de uma folga dessa. Com o
 * navy os três dão 14,05:1 e o quadrado continua dizendo qual é qual.
 *
 * O `[&_p]:` alcança os dois parágrafos do `info_card/1` — o número e o rótulo —
 * e o rótulo já é navy no original, então a classe muda um só. É override de
 * fora, e não uma propriedade nova no espelho: `info_card/1` continua sendo o
 * que o sistema tem, e a galeria continua mostrando as cinco variantes como
 * elas são.
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
  return (
    <CartaoDoSistema
      id={`indicador-${id}`}
      className="[&_p]:text-[var(--color-brand-purple-dark)]"
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
        detalhe={`${quantia(equipe.supervisors.length, "supervisor", "supervisores")} · ${quantia(equipe.applicators.length, "supervisionado", "supervisionados")} · ${quantia(equipe.patients.length, "paciente", "pacientes")}`}
        comIniciais={false}
      />
      <BarraDeAssinatura
        quantas={fila}
        frase="aguardando assinatura na equipe."
        onRevisar={onRevisar}
      />
      <Pista>Selecione um supervisor, aplicador ou paciente em qualquer coluna.</Pista>
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
      <Cabecalho nome={supervisor.name} detalhe={`${supervisor.specialtyName} · Supervisor`} />
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

      <Pista>Selecione um aplicador ou paciente para detalhar.</Pista>
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
      />
      <BarraDeAssinatura quantas={fila} frase="aguardando assinatura." onRevisar={onRevisar} />

      {mostraSupervisor && supervisor && (
        <Bloco titulo="Supervisor">
          <button
            type="button"
            onClick={() => onEscolherSupervisor(supervisor.id)}
            className="flex w-full items-center gap-3 rounded-card border border-[var(--border-soft)] px-3 py-2.5 text-left hover:bg-navy/10"
          >
            <Iniciais nome={supervisor.name} />
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
              ? formatDayMonth(`${aplicador.lastSupervisionOn}T12:00:00.000-03:00`, locale)
              : "Nunca"
          }
          rotulo="Últ. supervisão"
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

      <Pista>Selecione um paciente para ver programas e sessões.</Pista>
    </div>
  );
}

/** Número e rótulo, sem contorno: o preenchimento é o que separa do cartão. */
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
        "rounded-card px-3 py-2.5 text-center",
        alerta ? "bg-warn-bg" : "bg-navy/10",
      ].join(" ")}
    >
      <p className="m-0 break-words text-[1.0625rem] font-bold text-navy">{valor}</p>
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
  onAbrirLote: (sessoes: SupervisionSession[]) => void;
}) {
  const paciente = equipe.patients.find((item) => item.id === pacienteId)!;
  const fila = pendingOfPatient(equipe, pacienteId, assinados);
  const atencao = patientAlerts(equipe, pacienteId);
  const aplicador = equipe.applicators.find((item) => item.id === aplicadorId);

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
        detalhe={`${ageInYears(paciente.birthDate, equipe.now)} anos`}
      />
      <BarraDeAssinatura
        quantas={fila}
        frase="aguardando assinatura."
        onRevisar={() =>
          onAbrirLote(
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

      {/* "Atendido por" só existe sem aplicador escolhido.
          Com um escolhido a coluna do meio já ficou com um nome, a marca de
          filtro repete esse nome e o título das sessões repete de novo — quatro
          lugares dizendo "Marina Costa". Sem nenhum escolhido, esta lista é a
          resposta que a tela portada não tem por onde receber: de quem é a
          assinatura de cada um de quem atende esta criança. */}
      {aplicador === undefined && (
        <Bloco
          titulo={
            <>
              Atendido por
              <span className="normal-case text-[var(--fg-2)]">
                {" "}
                · {quantia(supervisores.length, "supervisor", "supervisores")}
              </span>
            </>
          }
        >
          <ul className="m-0 list-none space-y-2 p-0">
            {quemAtende.map((item) => {
              const dele = equipe.supervisors.find((sup) => sup.id === item.supervisorId);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onEscolherAplicador(item.id)}
                    className="flex w-full items-center gap-3 rounded-card border border-[var(--border-soft)] px-3 py-2.5 text-left hover:bg-navy/5"
                  >
                    <Iniciais nome={item.name} />
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
      )}

      <Bloco titulo="Programas">
        <ul className="m-0 list-none space-y-1.5 p-0">
          {paciente.programs.map((programa) => (
            <li
              key={programa.name}
              /* Contorno, como as linhas das colunas: é uma lista, e linha de
                 lista se delimita, não se preenche. O preenchimento fica para o
                 programa que pede atenção — ali ele é sinal, e não ambiente. */
              className={[
                "flex flex-wrap items-center justify-between gap-2 rounded-card border px-3 py-2.5",
                trendNeedsAttention(programa.trend)
                  ? "border-warn-fg/25 bg-warn-bg"
                  : "border-[var(--border-soft)]",
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

      <Bloco
        titulo={
          <>
            Sessões
            {aplicador && (
              <span className="normal-case text-action"> · {aplicador.name}</span>
            )}
          </>
        }
      >
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
                  onAbrir={() => onAbrirLote([sessao])}
                />
              </li>
            ))}
          </ul>
        )}
      </Bloco>
    </div>
  );
}

/**
 * Uma sessão do paciente: data à esquerda, o que aconteceu no meio, as ações à
 * direita.
 *
 * **Uma ação só, e o ícone diz qual é.** A linha teve dois botões — "Registro" e
 * "Assinar" — com o mesmo `onClick`, e dois controles que levam ao mesmo lugar
 * pedem que a pessoa escolha entre sinônimos. O destino é o mesmo porque o
 * registro do atendimento **é** a tela de revisão: as tentativas de cada programa,
 * a observação de quem aplicou, os registros de comportamento. O que a pendência
 * muda é o que ela vai fazer lá, e isso cabe no ícone: assinatura quando há o que
 * assinar, folha de registro quando é só leitura.
 *
 * A decisão 0016 tinha tirado o link "Registro" por não haver destino; o destino
 * apareceu quando a revisão passou a abrir uma sessão qualquer, e não só as da
 * fila. O que **não** existe é assinar de fora: um botão que assinasse na linha
 * afirmaria "eu li o registro" sem abrir o registro, que é a única coisa que a
 * segunda assinatura afirma.
 */
function LinhaDeAtendimento({
  equipe,
  sessao,
  assinados,
  locale,
  onAbrir,
}: {
  equipe: SupervisionTeamData;
  sessao: SupervisionSession;
  assinados: ReadonlySet<string>;
  locale: string | undefined;
  onAbrir: () => void;
}) {
  const quem = equipe.applicators.find((item) => item.id === sessao.applicatorId);
  const assinado = sessao.status === "pending_supervisor_signature" && assinados.has(sessao.id);
  const pendente = isPendingSignature(sessao, assinados);
  const rotuloDaAcao = pendente
    ? `Assinar o atendimento de ${formatDate(sessao.start, locale)}`
    : `Ver o registro do atendimento de ${formatDate(sessao.start, locale)}`;

  return (
    <article
      className={[
        "flex items-stretch rounded-card border",
        pendente
          ? "border-[var(--color-blue)] bg-[var(--color-blue)]/10"
          : "border-[var(--border-soft)]",
      ].join(" ")}
    >
      <div className="w-[5.5rem] shrink-0 self-center border-r border-[var(--border-soft)] px-3 py-2.5">
        <p className="m-0 text-[0.9375rem] font-bold text-navy">
          {formatDayMonth(sessao.start, locale)}
        </p>
        <p className="m-0 text-[0.75rem] text-[var(--fg-2)]">
          {formatTime(sessao.start, locale)}–{formatTime(sessao.end, locale)}
        </p>
      </div>

      <div className="min-w-0 flex-1 px-3 py-2.5">
        <p className="m-0 flex flex-wrap items-center gap-2">
          <span className="min-w-0 break-words text-[0.9375rem] font-bold text-navy">
            {sessao.serviceName}
          </span>
          <Situacao status={assinado ? "finished" : sessao.status} />
        </p>
        <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 break-words text-[0.8125rem] text-[var(--fg-2)]">
          <span>
            <Icon name="fa-user" /> {quem?.name ?? "—"}
          </span>
          <span>
            <Icon name={sessao.hasRecord ? "fa-clipboard-check" : "fa-clipboard"} />{" "}
            {sessao.hasRecord ? "Registro feito" : "Sem registro"}
          </span>
          {sessao.abc.length > 0 && (
            <span className="font-semibold text-[var(--color-red-dark)]">
              <Icon name="fa-clipboard-list" />{" "}
              {quantia(sessao.abc.length, "registro ABC", "registros ABC")}
            </span>
          )}
          {assinado && <span className="font-semibold text-ok-fg">Assinado por você agora</span>}
        </p>
      </div>

      {/*
        Uma ação, e ela é só ícone.
        Eram dois botões com o mesmo `onClick` — "Registro" e "Assinar" —, e dois
        controles que levam ao mesmo lugar pedem que a pessoa escolha entre
        sinônimos. O que muda com a pendência não é o destino, é o que ela vai
        fazer lá: assinar ou só ler. Então o que muda é o ícone e o peso do botão,
        e o rótulo inteiro vai no `aria-label` e no `title`.

        Só ícone exige as duas coisas juntas. `aria-label` porque o botão não tem
        texto e sem ele o leitor de tela anuncia "botão" e mais nada; `title`
        porque quem vê o ícone e não o reconhece precisa de um caminho — e o
        `title` é o mesmo texto, não uma versão curta dele. O alvo é o `medium` do
        `button/1`, 36px, acima dos 24 que a varredura de toque cobra.
      */}
      <div className="flex shrink-0 items-center justify-center px-3 py-2.5">
        <Button
          {...(pendente ? { className: "espelho-do-sistema" } : { variant: "tint" as const, color: "brand" as const })}
          size="medium"
          onClick={onAbrir}
          aria-label={rotuloDaAcao}
          title={rotuloDaAcao}
        >
          <Icon name={pendente ? "fa-signature" : "fa-file-alt"} />
        </Button>
      </div>
    </article>
  );
}

/* ==================================================== lote de revisão */

const TRILHO: Record<"assinado" | "pulado" | "atual" | "pendente", string> = {
  assinado: "bg-[var(--color-brand-green-dark)]",
  pulado: "bg-[var(--color-brand-orange)]",
  atual: "bg-[var(--color-brand-blue)]",
  pendente: "bg-navy/15",
};

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
 * **Nada disso aparece quando a fila tem um atendimento só.** Aberto pelo ícone da
 * linha, o painel mostra o registro e uma ação: assinar, ou fechar. Trilho, "1 de
 * 1", setas as duas desabilitadas, contagem de assinados e "Pular" são cinco
 * controles a explicar num painel que precisa de um — e "Pular" ainda ofereceria
 * pular para lugar nenhum. O rótulo também encurta: "Assinar", não "Assinar e
 * avançar", porque não há para onde avançar.
 *
 * **O andamento virou um trilho de barras, e ele não é clicável.** Os pontos de
 * 8px do primeiro desenho eram inalcançáveis no toque; a correção anterior tinha
 * sido dar-lhes alvo de 24px, e sobrava um trilho de botões que quase todos
 * recusavam o clique. Agora o trilho é leitura — quantos ficaram, quantos foram,
 * onde estou — e quem navega são as duas setas do rodapé, que são alvo de 36px e
 * dizem o que fazem. "4 de 7" fica ao lado do trilho, em texto.
 *
 * **O fim da fila é um `modal/1` centrado, não a última tela do drawer.** O
 * resumo não tem nada a rolar e não continua a leitura: ele fecha o assunto. Um
 * painel de 612px encostado na direita, com uma frase no meio, faz parecer que
 * ainda há um atendimento embaixo.
 */
function LoteDeAssinaturas({
  equipe,
  sessoes,
  locale,
  assinados,
  onAssinar,
  onFechar,
}: {
  equipe: SupervisionTeamData;
  sessoes: SupervisionSession[];
  locale: string | undefined;
  assinados: ReadonlySet<string>;
  onAssinar: (id: string) => void;
  onFechar: (quantas: number) => void;
}) {
  const [atual, setAtual] = useState(0);
  const [dadas, setDadas] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [puladas, setPuladas] = useState<ReadonlySet<string>>(() => new Set<string>());

  /**
   * Quem podia receber assinatura **quando a fila abriu**.
   *
   * Abrir "Registro" de um atendimento finalizado traz uma sessão que não é da
   * fila — e sem esta distinção o drawer abriria com "Assinar e avançar" ativo
   * sobre um atendimento que não espera assinatura de ninguém.
   *
   * Fixado no primeiro quadro, e não recalculado. `assinados` é o conjunto da
   * página, e assinar aqui o faz crescer: recalculado, o atendimento que acabou
   * de ser assinado deixava de ser assinável, a lista esvaziava e a fila **nunca
   * terminava** — duas assinaturas numa fila de dois deixavam o painel aberto no
   * último registro, sem resumo. Foi assim que apareceu.
   */
  const [assinaveis] = useState<readonly string[]>(() =>
    sessoes.filter((sessao) => isPendingSignature(sessao, assinados)).map((sessao) => sessao.id),
  );

  const ids = sessoes.map((sessao) => sessao.id);
  const resolvidas = new Set([...dadas, ...puladas]);
  const acabou = assinaveis.length > 0 && assinaveis.every((id) => resolvidas.has(id));
  const sessao = sessoes[atual];
  /**
   * Isto é uma fila, ou é um atendimento só?
   *
   * Aberto pelo ícone da linha, o painel tem uma sessão — e aí o trilho é uma
   * barra, "1 de 1" é uma frase que não informa, as setas nascem as duas
   * desabilitadas, "0 assinados" conta o que ainda não foi feito e "Pular" oferece
   * pular para lugar nenhum. Cinco controles a explicar num painel que só precisa
   * de um: assinar, ou fechar.
   */
  const emFila = sessoes.length > 1;
  const podeAssinar =
    sessao !== undefined && assinaveis.includes(sessao.id) && !resolvidas.has(sessao.id);

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
   * resumo passa a mentir: "6 assinados · 2 pulados" numa fila de sete. Foi assim
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

  return (
    <>
      <DrawerModal
        id="lote-de-assinaturas"
        show={!acabou}
        // Sem nada a assinar o painel é só o registro, e o título diz isso: ele
        // abre também pelo link da linha, sobre um atendimento finalizado.
        title={assinaveis.length > 0 ? "Revisar e Assinar" : "Registro do atendimento"}
        titleClassName="text-[var(--color-brand-purple-dark)]"
        /*
         * Largura declarada, e não uma das quatro do `drawer_modal/1`.
         *
         * O conteúdo tem duas medidas que decidem: quatro campos de cabeçalho
         * numa linha e dois cartões de programa numa linha. A 768 (`medium`) o
         * cartão de programa fica com 354px para uma barra e duas linhas de
         * texto; a 576 (`small`) o campo do supervisor quebra em três linhas.
         * 608 é onde os dois caem certos — 132px por campo, 276px por programa.
         */
        variant="custom"
        customSize="max-w-[38rem]"
        onCancel={() => onFechar(dadas.size)}
        footer={
          <div
            className={[
              "flex flex-wrap items-center gap-3",
              emFila ? "justify-between" : "justify-end",
            ].join(" ")}
          >
            {emFila && (
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  variant="tint"
                  color="brand"
                  size="medium"
                  className="rounded-full disabled:opacity-40"
                  aria-label="Atendimento anterior"
                  disabled={atual === 0}
                  onClick={() => setAtual((antes) => Math.max(0, antes - 1))}
                >
                  <Icon name="fa-chevron-left" />
                </Button>
                <Button
                  variant="tint"
                  color="brand"
                  size="medium"
                  className="rounded-full disabled:opacity-40"
                  aria-label="Próximo atendimento"
                  disabled={atual >= sessoes.length - 1}
                  onClick={() => setAtual((antes) => Math.min(sessoes.length - 1, antes + 1))}
                >
                  <Icon name="fa-chevron-right" />
                </Button>
                <p className="m-0 ml-1 break-words text-[0.875rem] text-[var(--fg-2)]">
                  <strong className="font-bold text-navy">{dadas.size}</strong>{" "}
                  {dadas.size === 1 ? "assinado" : "assinados"}
                  {puladas.size > 0 && ` · ${quantia(puladas.size, "pulado", "pulados")}`}
                </p>
              </div>
            )}
            {podeAssinar ? (
              <div className="flex flex-wrap items-center gap-2">
                {/* "Pular" é avançar sem assinar. Sem fila não há para onde
                    avançar, e quem não quer assinar fecha o painel. */}
                {emFila && (
                  <Button variant="ghost" onClick={pularEsta}>
                    Pular
                  </Button>
                )}
                <Button
                  className="espelho-do-sistema"
                  rightIcon="fa-signature"
                  onClick={assinarEsta}
                >
                  {emFila ? "Assinar e avançar" : "Assinar"}
                </Button>
              </div>
            ) : (
              <p className="m-0 break-words text-[0.875rem] font-semibold text-[var(--fg-2)]">
                {sessao === undefined
                  ? ""
                  : dadas.has(sessao.id)
                    ? "Assinado nesta revisão."
                    : puladas.has(sessao.id)
                      ? "Pulado — segue na fila."
                      : "Este atendimento não espera a sua assinatura."}
              </p>
            )}
          </div>
        }
      >
        {/* O trilho: quantos ficaram, quantos foram, onde estou. Com um
            atendimento só ele não tem nada a dizer. */}
        {emFila && (
        <div className="mb-6 flex items-center justify-between gap-4">
          <ol aria-hidden="true" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {sessoes.map((item, indice) => (
              <li
                key={item.id}
                className={[
                  "h-1.5 w-7 rounded-full",
                  TRILHO[
                    dadas.has(item.id)
                      ? "assinado"
                      : puladas.has(item.id)
                        ? "pulado"
                        : indice === atual
                          ? "atual"
                          : "pendente"
                  ],
                ].join(" ")}
              />
            ))}
          </ol>
          <p className="m-0 shrink-0 break-words text-[0.875rem] text-[var(--fg-2)]">
            <strong className="font-bold text-navy">{atual + 1}</strong> de {sessoes.length}
          </p>
        </div>
        )}

        {sessao && (
          <RevisaoDeAtendimento equipe={equipe} sessao={sessao} locale={locale} />
        )}
      </DrawerModal>

      {/* O fim da fila. `role="status"` no número: é o resultado da ação, e é o
          que o cenário declara em `a11y.announces`. */}
      <Modal
        id="lote-concluido"
        open={acabou}
        variant="extra_small"
        onClose={() => onFechar(dadas.size)}
      >
        {/* Sem padding próprio: o `modal/1` já envolve o conteúdo em `p-6`, e o
            `px-8 pb-10` daqui somava a ele — 40px de nada embaixo de um botão,
            num diálogo de três linhas. */}
        <div className="flex flex-col gap-2 text-center">
          <Icon
            name="fa-circle-check"
            type="solid"
            className="text-[2.5rem] text-[var(--color-green)]"
          />
          <p className="m-0 text-[1.25rem] font-bold text-navy" role="status">
            {dadas.size === 0
              ? "Nenhum atendimento assinado"
              : quantia(dadas.size, "atendimento assinado", "atendimentos assinados")}
          </p>
          <p className="m-0 break-words text-[0.9375rem] text-[var(--fg-2)]">
            {puladas.size > 0
              ? `${quantia(puladas.size, "atendimento ficou pendente", "atendimentos ficaram pendentes")} e ${puladas.size === 1 ? "segue" : "seguem"} na sua fila.`
              : "Não há mais nada esperando assinatura neste escopo."}
          </p>
          <div className="flex justify-center pt-1">
            <Button
              variant="tint"
              color="blue"
              rightIcon="fa-check"
              onClick={() => onFechar(dadas.size)}
            >
              Concluir
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function RevisaoDeAtendimento({
  equipe,
  sessao,
  locale,
}: {
  equipe: SupervisionTeamData;
  sessao: SupervisionSession;
  locale: string | undefined;
}) {
  const quem = equipe.applicators.find((item) => item.id === sessao.applicatorId);
  const paciente = equipe.patients.find((item) => item.id === sessao.patientId);
  const supervisor = equipe.supervisors.find((item) => item.id === quem?.supervisorId);

  return (
    /*
     * `space-y-6`, e não `space-y-4`.
     *
     * O miolo da revisão é seis blocos empilhados — nome, campos, a linha de
     * check-in, programas, observação e ABC —, e a 16px a linha de "Registro
     * completo · Check-in · Check-out" encostava nos cartões de cima e no título
     * de baixo ao mesmo tempo. Ela é a única linha solta da tela, sem
     * preenchimento nem contorno para se separar sozinha, e é o que a assinatura
     * confere primeiro: se o atendimento aconteceu, e quando.
     */
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="m-0 break-words text-[1.25rem] font-bold text-navy">
          {paciente?.name ?? "—"}
        </h2>
        <p className="m-0 break-words text-[0.875rem] text-[var(--fg-2)]">
          {sessao.serviceName} · {quem?.name ?? "—"} ({quem?.roleName ?? "—"})
        </p>
      </div>

      {/* Duas colunas, e não quatro: data e horário na primeira linha, local e
          supervisor na segunda. A quatro, cada campo ficava com 131px — "Unidade
          Pinheiros" e "Beatriz Lima Rocha" quebravam em duas e três linhas, e as
          quatro caixas ficavam com a altura da pior delas. */}
      <dl className="m-0 grid grid-cols-2 gap-3">
        <Campo rotulo="Data" valor={formatNumericDate(sessao.start, locale)} />
        <Campo
          rotulo="Horário"
          valor={`${formatTime(sessao.start, locale)}–${formatTime(sessao.end, locale)}`}
        />
        <Campo rotulo="Local" valor={sessao.placeName} />
        <Campo rotulo="Supervisor" valor={supervisor?.name ?? "—"} />
      </dl>

      <p className="m-0 flex flex-wrap items-center gap-x-5 gap-y-2 break-words text-[0.8125rem] font-semibold">
        <span className={sessao.hasRecord ? "text-ok-fg" : "text-warn-fg"}>
          <Icon name={sessao.hasRecord ? "fa-circle-check" : "fa-circle-exclamation"} />{" "}
          {sessao.hasRecord ? "Registro completo" : "Sem registro"}
        </span>
        {sessao.checkinAt && (
          <span className="text-[var(--fg-2)]">
            <Icon name="fa-right-to-bracket" /> Check-in {formatTime(sessao.checkinAt, locale)}
          </span>
        )}
        {sessao.checkoutAt && (
          <span className="text-[var(--fg-2)]">
            <Icon name="fa-right-from-bracket" /> Check-out {formatTime(sessao.checkoutAt, locale)}
          </span>
        )}
        {sessao.abc.length > 0 && (
          <span className="text-[var(--color-red-dark)]">
            <Icon name="fa-clipboard-list" />{" "}
            {quantia(sessao.abc.length, "registro ABC", "registros ABC")}
          </span>
        )}
      </p>

      <section>
        <h3 className="m-0 mb-3 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--fg-2)]">
          Programas trabalhados
        </h3>
        {sessao.programs.length === 0 ? (
          <p className="m-0 break-words text-[0.875rem] text-[var(--fg-2)]">
            Nenhum programa registrado neste atendimento.
          </p>
        ) : (
          /* Um embaixo do outro, sempre. Lado a lado, cada cartão ficava com
             276px para o nome do programa, a etiqueta de tendência, a barra e a
             linha de tentativas — e o nome quebrava em duas linhas enquanto a
             barra encolhia até não mostrar mais diferença entre 62% e 85%. */
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {sessao.programs.map((programa) => {
              const percentual = Math.round((programa.correct / programa.trials) * 100);
              return (
                <li
                  key={programa.name}
                  className="rounded-card border border-[var(--border-soft)] px-4 py-3"
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
                    {programa.correct}/{programa.trials} tentativas corretas ·{" "}
                    <strong className="font-bold text-navy">{percentual}%</strong>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="m-0 mb-3 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--fg-2)]">
          Observações do aplicador
        </h3>
        <p className="m-0 break-words rounded-card bg-navy/10 px-4 py-3 text-[0.9375rem] text-navy">
          {sessao.note ?? "Nenhuma observação foi escrita neste atendimento."}
        </p>
      </section>

      {sessao.abc.length > 0 && (
        <section>
          <h3 className="m-0 mb-3 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--fg-2)]">
            Registros ABC
          </h3>
          <ul className="m-0 list-none space-y-2 p-0">
            {sessao.abc.map((registro) => (
              <li
                key={registro.behavior}
                className="flex items-start gap-4 rounded-card bg-warn-bg px-4 py-3"
              >
                <dl className="m-0 grid min-w-0 flex-1 grid-cols-[minmax(6.5rem,auto)_1fr] gap-x-3 gap-y-1">
                  <Par rotulo="Antecedente" valor={registro.antecedent} />
                  <Par rotulo="Comportamento" valor={registro.behavior} />
                  <Par rotulo="Consequência" valor={registro.consequence} />
                </dl>
                {/* A duração fica na primeira linha, à direita, e não numa faixa
                    própria em cima: ela qualifica o episódio, e três linhas de
                    ABC com um cabeçalho de uma palavra em cima viravam quatro
                    linhas para dizer três coisas. */}
                <p className="m-0 shrink-0 whitespace-nowrap text-[0.8125rem] font-semibold text-warn-fg">
                  <Icon name="fa-stopwatch" /> {registro.minutes} min
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * Um campo do cabeçalho da revisão.
 *
 * Preenchimento em vez de contorno, como as linhas das colunas: são quatro
 * caixas lado a lado, e quatro contornos de 1px numa linha desenham uma grade
 * que compete com o conteúdo dela. O valor vai em `font-bold`, e não
 * `font-semibold` — é o dado que a assinatura confere, e o rótulo acima dele já
 * é negrito em caixa alta.
 */
function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-card bg-navy/10 px-3 py-2.5">
      <dt className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--fg-2)]">
        {rotulo}
      </dt>
      <dd className="m-0 break-words text-[0.9375rem] font-bold text-navy">{valor}</dd>
    </div>
  );
}

/** Um par do ABC: o rótulo na primeira faixa da grade, o valor na segunda. */
function Par({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="contents">
      <dt className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--fg-2)]">
        {rotulo}
      </dt>
      <dd className="m-0 break-words text-[0.875rem] font-semibold text-navy">{valor}</dd>
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
