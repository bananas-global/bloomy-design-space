import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  CallAutomationRule,
  CallDevice,
  CallEvent,
  CallKind,
  CallLogEntry,
  CallStatus,
  CallsData,
} from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import { ErrorState, LoadingState } from "../components/primitives.js";
import { Button } from "../components/bloomy/Button.js";
import { Card, InfoCard, type InfoCardVariant } from "../components/bloomy/Card.js";
import { Checkgroup, RadioGroup, type Opcao } from "../components/bloomy/Choice.js";
import { EmptyStateCard, InsideCard, SectionHeader } from "../components/bloomy/Layout.js";
import { Input, Label, Select, Switch, Textarea } from "../components/bloomy/Input.js";
import { DrawerModal } from "../components/bloomy/Overlay.js";
import { ButtonTabs } from "../components/bloomy/Tabs.js";
import { Tag, type TagVariant } from "../components/bloomy/Tag.js";
import { CALL_TEMPLATES } from "../fixtures/calls.js";
import {
  audienceOfKind,
  callOutcome,
  canAnnounce,
  canQueue,
  canToggleRule,
  devicesForKind,
  fillTemplate,
  humanWait,
  pendingCalls,
  resolveTarget,
  waitingToneLabel,
  type PendingCall,
  type WaitingTone,
} from "../rules/calls.js";

/**
 * Gestão de chamadas — V2.
 *
 * Porte de "Bloomy — Gestão de Chamadas V2" do projeto de design. A área é
 * **proposta**: o monólito não tem integração de voz nenhuma, e hoje a recepção
 * atravessa o corredor a pé duas vezes por atendimento.
 *
 * **A tela usa os componentes do sistema, não peças próprias.** `button/1`,
 * `radio_selector/1` nas duas formas — barra segmentada e pílulas —,
 * `checkgroup/1`, `select/1`, `input/1`, `switch/1`, `card/1`, `info_card/1`,
 * `inside_card/1`, `empty_state_card/1`, `tag/1`, `button_tabs/1` e
 * `drawer_modal/1`. Sobrou uma peça e ela está nomeada onde aparece: o controle
 * de volume, porque `input type="slider"` existe no monólito
 * (`core_components.ex:792`) e ainda não foi portado para cá.
 *
 * Três coisas mudaram do desenho, e as três são obrigação deste repositório:
 *
 * 1. **O relógio é declarado.** O desenho recalcula a espera a cada segundo com
 *    a hora da máquina. Aqui a espera sai de `data.now`, porque `pnpm test` roda
 *    a qualquer hora e uma fila que muda de cor conforme o horário não tem
 *    critério de aceite.
 *
 * 2. **Ação bloqueada continua alcançável.** Ver `AcaoIndisponivel` abaixo.
 *
 * 3. **A temperatura do cartão tem palavra.** O desenho distingue as três faixas
 *    de espera só pela cor da borda.
 *
 * O que **não** mudou é a ordem do painel de nova chamada — quem chamar, qual
 * criança, motivo, mensagem, onde anunciar. É a decisão de UX da V2 sobre a V1,
 * e é ela que torna o anúncio de dois cliques possível.
 */

/**
 * Três abas, e o histórico fora delas.
 *
 * O desenho tinha quatro. As três que sobraram são configurações do agora — a
 * fila que espera, as caixas de som que vão falar, as regras que disparam
 * sozinhas —, e a recepção fica em uma delas o dia inteiro. O histórico não é
 * um quarto lugar para ficar: é uma consulta, aberta para responder a uma
 * pergunta ("a chamada dela saiu?") e fechada logo em seguida.
 *
 * Como aba, ele cobrava o preço de sair da fila para consultar e ter de voltar.
 * Como gaveta, abre por cima, responde e fecha no Escape, e a fila continua
 * atrás — que é a diferença entre consultar e navegar.
 */
type Aba = "live" | "devices" | "rules";

const ABAS: { id: Aba; label: string; icon: string }[] = [
  { id: "live", label: "Ao vivo", icon: "fa-tower-broadcast" },
  { id: "devices", label: "Dispositivos", icon: "fa-volume-high" },
  { id: "rules", label: "Automação", icon: "fa-robot" },
];

/**
 * As situações do histórico, nas variantes do `tag/1`.
 *
 * Sem `solid-*`: as cinco invertidas são extensão da decisão 0015, e o pedido
 * da revisão de 04/09 é que esta área use as dez do sistema. `Atendida` e
 * `Falhou` desceram de `solid-green` e `solid-red` para `green` e `red` — fundo
 * claro com texto forte, como as outras.
 *
 * A distinção entre `Anunciada` e `Atendida` passa a morar só no ícone e na
 * palavra, que é onde ela já morava para quem não vê cor: `fa-check` contra
 * `fa-check-double`.
 */
const STATUS_META: Record<CallStatus, { label: string; variant: TagVariant; icon: string }> = {
  playing: { label: "Tocando", variant: "blue", icon: "fa-volume-high" },
  played: { label: "Anunciada", variant: "light-blue", icon: "fa-check" },
  acked: { label: "Atendida", variant: "green", icon: "fa-check-double" },
  no_answer: { label: "Sem resposta", variant: "orange", icon: "fa-clock" },
  failed: { label: "Falhou", variant: "red", icon: "fa-triangle-exclamation" },
  cancelled: { label: "Cancelada", variant: "brand", icon: "fa-ban" },
};

const KIND_META: Record<CallKind, { label: string; icon: string; publico: string }> = {
  professional: { label: "Profissional", icon: "fa-user-doctor", publico: "Profissionais" },
  guardian: { label: "Responsável", icon: "fa-users", publico: "Famílias" },
  general: { label: "Aviso geral", icon: "fa-bullhorn", publico: "Toda a unidade" },
};

const AUDIENCE_LABEL = { prof: "Profissionais", family: "Famílias" } as const;

/**
 * A moldura dos cartões de estado.
 *
 * **Quem carrega a cor do estado é a etiqueta, não o cartão.** O cartão fica
 * branco com contorno a 10% da cor do texto, em todas as temperaturas. Quatro
 * cartões tingidos de rosa e amarelo lado a lado competiam com a etiqueta que
 * já dizia a mesma coisa — e a etiqueta é quem diz a palavra.
 *
 * A regra de acessibilidade continua satisfeita porque nunca dependeu do fundo:
 * `waitingToneLabel` põe "Atenção" e "Urgente" por extenso dentro da etiqueta,
 * então a cor nunca foi o único sinal.
 *
 * Sem classe de fundo aqui, `card/1` acrescenta `bg-white` sozinho — é
 * `extract_bg_class/1`, e é de propósito que este contorno não traga `bg-*`.
 *
 * **E sem sombra.** `card/1` traz `shadow-main`, que é a sombra do cartão que
 * flutua sobre o fundo da página. Estes não flutuam sobre nada: estão dentro do
 * cartão branco da área, sobre branco, onde a sombra vira uma sujeira cinza em
 * volta de cada item de uma lista de quatro. O contorno já separa. `shadow-none`
 * é da tela, e não do espelho — o `card/1` do produto continua com a dele. */
const CARD_DE_ESTADO = "border border-[var(--color-brand-purple-dark)]/10 shadow-none";

/**
 * A temperatura da espera, nas variantes do `tag/1`.
 *
 * Eram `solid-orange` e `solid-red` — fundo cheio, texto claro. As invertidas
 * são extensão desta pasta, e a revisão de 04/09 pediu o padrão do sistema:
 * fundo claro com texto forte, como toda etiqueta do produto.
 *
 * O que sustentava as cheias era "ser vista de longe", e isso não se perdeu:
 * quem ordena a fila é a ordem da fila, e a palavra — "Atenção", "Urgente" —
 * continua dentro da etiqueta. Ver a regra `waiting-temperature-is-said-in-words`.
 */
/**
 * A chave-geral pinta o cartão dela, e as duas cores são de `switch_card/1`.
 *
 * ```elixir
 * @activated && "bg-brand-blue/10 border-brand-blue/40",
 * !@activated && "bg-brand-purple-dark/5 border-transparent"
 * ```
 *
 * É o único cartão da área que muda de cor, e é o único que devia: os outros
 * mostram uma situação que a pessoa lê, este mostra um estado que ela controla e
 * que **silencia a tela inteira**. Ligada, o cartão fica azul e diz que o
 * sistema está anunciando sozinho; desligada, ele apaga para o cinza de fundo e
 * some do primeiro plano — que é a leitura certa, porque nada vai disparar.
 *
 * Ligado não tem contorno de 10% como os cartões de estado: tem o contorno azul
 * do próprio componente. Desligado não tem contorno nenhum — `border-transparent`
 * mantém a largura da borda para a transição não deslocar o conteúdo, e é assim
 * no original.
 *
 * **Não é `SwitchCard` inteiro** — o espelho de `switch_card/1` existe em
 * `Input.tsx` e traz junto `p-3`, `rounded-xl`, título `font-extrabold` e
 * descrição a 60%. Aqui o cartão precisa da moldura dos vizinhos, que são
 * `card/1` a 24px e raio 16. O que veio do sistema é o par de cores, que é a
 * parte que o desenho pediu.
 */
const CARTAO_DA_CHAVE_GERAL = {
  on: "border border-[var(--color-brand-blue)]/40 bg-[var(--color-brand-blue)]/10 shadow-none transition-colors delay-100",
  off: "border border-transparent bg-[var(--color-brand-purple-dark)]/5 shadow-none transition-colors delay-100",
} as const;

/**
 * O cartão de cada regra, e por que ele é o **inverso** do cartão da chave.
 *
 * A chave-geral fica azul quando ligada: é um controle, e ligado é destaque. A
 * regra faz o contrário — branca com contorno quando dispara, cinza chapado e
 * sem contorno quando não. É a mesma pergunta em papéis diferentes: o cartão
 * da chave anuncia um estado do sistema, o da regra é um item de lista que
 * recua quando não vai fazer nada.
 *
 * **O que decide é `dispara`, e não `rule.on`.** Regra marcada sob chave-geral
 * desligada não vai disparar, então recua junto — e é o mesmo predicado que já
 * desabilita os três campos da configuração. A distinção entre marcada e
 * desmarcada não se perde: continua no interruptor, e continua dita por extenso
 * na linha de estado ("marcada, mas a automação geral está desligada").
 */
/**
 * O cartão do dispositivo, pelo mesmo critério do cartão da regra.
 *
 * Caixa online é branca com contorno; offline recua para o cinza chapado. É a
 * mesma ideia: item de lista que apaga quando não vai fazer nada — e uma caixa
 * fora do ar não vai falar.
 */
const CARTAO_DO_DISPOSITIVO = {
  online: `${CARD_DE_ESTADO} bg-white transition-colors delay-100`,
  offline:
    "border border-transparent bg-[var(--color-brand-purple-dark)]/5 shadow-none transition-colors delay-100",
} as const;

const CARTAO_DA_REGRA = {
  dispara: `${CARD_DE_ESTADO} bg-white transition-colors delay-100`,
  quieta:
    "border border-transparent bg-[var(--color-brand-purple-dark)]/5 shadow-none transition-colors delay-100",
} as const;

const TONE_TAG: Record<WaitingTone, TagVariant> = {
  calm: "light-blue",
  warm: "orange",
  hot: "red",
};

/**
 * Ação bloqueada: o botão do sistema, com o comportamento da decisão 0003.
 *
 * `button/1` não tem `unavailableReason` — o botão que tinha era invenção
 * anterior desta pasta, e está em `primitives.tsx` até as telas antigas serem
 * convertidas. As telas já convertidas resolvem bloqueio com `disabled` mais
 * `title`, e isso **perde** o que a decisão 0003 garante: um botão `disabled`
 * sai da ordem de foco, então quem navega por teclado nunca chega nele e nunca
 * ouve o motivo, e `title` não é anunciado de forma confiável.
 *
 * Aqui as duas coisas convivem sem componente novo: o `Button` do sistema
 * recebe `aria-disabled` e `aria-describedby` — que ele repassa, porque aceita
 * os atributos de `<button>` —, o clique é barrado no manipulador, e o motivo
 * fica em texto ao lado. Nenhuma classe do espelho muda.
 *
 * O caso desta tela é o que mais pede isso: o botão bloqueado é o Anunciar, e o
 * erro que ele evita sai pelo alto-falante da sala de espera.
 */
function AcaoIndisponivel({
  id,
  motivo,
  onClick,
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
        className={bloqueado ? "opacity-60" : undefined}
        {...resto}
      >
        {children}
      </Button>
      {/* O motivo sai da vista, e **não** do alcance.

          O pedido foi remover este texto, e ele era duplicado de fato: o mesmo
          motivo já aparece em vermelho junto do campo que falta preencher, que
          é onde a pessoa está olhando. O que não pode sair é o alvo do
          `aria-describedby`: sem ele o botão volta a ser um controle que anuncia
          "indisponível" sem dizer por quê, e a decisão 0003 existe justamente
          contra isso.

          `sr-only` resolve as duas coisas — some da tela, continua sendo lido no
          foco. */}
      {motivo && (
        <span id={idDoMotivo} className="sr-only">
          {motivo}
        </span>
      )}
    </span>
  );
}

export function Calls({ context }: ScreenProps) {
  const { data, isLoading, error } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as chamadas" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const calls = data as CallsData | null;
  if (!calls) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  return <CallsScreen context={context} calls={calls} />;
}

function CallsScreen({
  context,
  calls,
}: {
  context: ScreenProps["context"];
  calls: CallsData;
}) {
  /* O estado local é semeado pela fixture e volta a ela quando a situação muda —
     é o padrão das telas que mexem no que receberam. */
  const [log, setLog] = useState<CallLogEntry[]>(calls.log);
  useEffect(() => setLog(calls.log), [calls.log]);
  const [eventos, setEventos] = useState(calls.events);
  useEffect(() => setEventos(calls.events), [calls.events]);
  const [devices, setDevices] = useState(calls.devices);
  useEffect(() => setDevices(calls.devices), [calls.devices]);
  const [rules, setRules] = useState(calls.rules);
  useEffect(() => setRules(calls.rules), [calls.rules]);
  const [autoMode, setAutoMode] = useState(calls.autoMode);
  useEffect(() => setAutoMode(calls.autoMode), [calls.autoMode]);

  const [dispensados, setDispensados] = useState<string[]>([]);
  const [aba, setAba] = useState<Aba>("live");
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [drawer, setDrawer] = useState<Partial<PendingCall> | null>(null);
  /** O que a tela acabou de fazer, para o leitor de tela e para os olhos. */
  const [aviso, setAviso] = useState("");

  const estado: CallsData = { ...calls, log, events: eventos, devices, rules, autoMode };

  const fila = pendingCalls(estado, CALL_TEMPLATES, dispensados);
  const daUnidade = devices.filter((device) => device.unit === calls.unit);

  const historico = useMemo(() => [...log].sort((a, b) => b.at.localeCompare(a.at)), [log]);
  const tocando = historico.find((entry) => entry.status === "playing");

  const numeros = {
    fila: fila.length,
    total: historico.length,
    atencao: historico.filter(
      (entry) => entry.status === "failed" || entry.status === "no_answer",
    ).length,
    atendidas: historico.filter((entry) => entry.status === "acked").length,
  };

  /* ------------------------------------------------------------- anunciar */

  function anunciar(entrada: {
    kind: CallKind;
    patient?: string;
    guardian?: string;
    target: string;
    deviceIds: string[];
    text: string;
    by: string;
    eventId?: string;
  }) {
    const { status, error: falha } = callOutcome(devices, entrada.deviceIds);
    const nova: CallLogEntry = {
      id: `cl-nova-${log.length + 1}`,
      at: calls.now,
      auto: false,
      status,
      ...(falha ? { error: falha } : {}),
      ...entrada,
    };
    setLog([nova, ...log]);
    if (entrada.eventId) {
      const alvo = entrada.eventId;
      setEventos((antes) =>
        antes.map((evento) => (evento.id === alvo ? { ...evento, done: true } : evento)),
      );
    }
    setDrawer(null);
    setAviso(
      status === "failed"
        ? `A chamada de ${entrada.target} falhou: ${falha}.`
        : `Chamada anunciada para ${entrada.target} em ${entrada.deviceIds.length} ${
            entrada.deviceIds.length === 1 ? "dispositivo" : "dispositivos"
          }.`,
    );
  }

  /**
   * Criar o chamado sem anunciar: ele entra na fila e espera a vez.
   *
   * O chamado criado é um `CallEvent` como os da agenda, com duas diferenças
   * que o contrato guarda: ele carrega o motivo e a frase que a pessoa
   * escolheu, porque não há regra de automação atrás dele de onde derivá-los.
   *
   * `at` é `calls.now` — a espera do cartão começa em zero e sobe com o
   * relógio declarado, como a de qualquer outro. A tela volta para Ao vivo
   * porque é lá que o resultado da ação aparece; deixar o painel fechar sobre a
   * aba de Automação esconderia o que acabou de ser feito.
   */
  function criarChamado(entrada: {
    kind: CallKind;
    patient: string;
    guardian: string;
    professional: string;
    room: string;
    start?: string;
    templateId: string;
    text: string;
  }) {
    const alvo = entrada.kind === "professional" ? entrada.professional : entrada.guardian;
    const novo: CallEvent = {
      id: `ce-nova-${eventos.length + 1}`,
      type: entrada.kind === "professional" ? "checkin" : "session_end",
      at: calls.now,
      patient: entrada.patient,
      guardian: entrada.guardian,
      professional: entrada.professional,
      room: entrada.room,
      ...(entrada.start ? { start: entrada.start } : {}),
      done: false,
      templateId: entrada.templateId,
      text: entrada.text,
    };
    setEventos([...eventos, novo]);
    setDrawer(null);
    setAba("live");
    setAviso(
      `Chamado de ${alvo} criado. Ele entra na fila e ainda não foi anunciado — a caixa de som não falou.`,
    );
  }

  /** Anúncio direto do cartão da fila, sem abrir o painel. */
  function anunciarDaFila(pendente: PendingCall) {
    const alcance = devicesForKind(pendente.kind, estado).filter((device) => device.online);
    if (alcance.length === 0) {
      setAviso(
        `Nenhum dispositivo de ${AUDIENCE_LABEL[
          audienceOfKind(pendente.kind)
        ].toLowerCase()} está online em ${calls.unit}. A chamada não foi anunciada.`,
      );
      return;
    }
    anunciar({
      kind: pendente.kind,
      patient: pendente.patient,
      guardian: pendente.guardian,
      target: pendente.target,
      deviceIds: alcance.map((device) => device.id),
      text: pendente.text,
      by: "Recepção",
      eventId: pendente.id,
    });
  }

  return wrap(
    context,
    <div className="space-y-4">
      {/* A tela fala o que fez. `role="status"` porque é confirmação, não
          interrupção — o erro que precisa cortar a leitura é o de anúncio
          falhado, e ele chega junto com a linha vermelha no histórico. */}
      <p role="status" aria-live="polite" className="sr-only">
        {aviso}
      </p>

      {/* A tela é **um** cartão branco: título à esquerda, trilho de abas e
          ação à direita, e tudo o mais dentro. É o `header` de `button_tabs/1`
          que produz esse arranjo — sem ele o trilho volta ao `justify-between`
          do original e a ação vai para a outra ponta da linha.

          O trilho vai marcado como espelho: as cores de `button_tabs/1` são as
          do monólito, e o rótulo inativo dá 3,74:1 sobre o próprio fundo —
          reprova AA e é o valor do produto, como o verde do cabeçalho. Mesma
          marcação de Profissionais, Unidades e Operadoras.

          Vale saber o que essa marcação custa, porque não é óbvio: o axe da
          suíte usa `.exclude(".espelho-do-sistema")`, que remove a **subárvore
          inteira** — e o `ButtonTabs` envolve o painel, não só o trilho. Ou
          seja, todo o conteúdo das quatro abas sai da varredura junto. É
          pré-existente (as três telas de Documentos têm o mesmo efeito) e está
          registrado em `docs/decisions/0017`. */}
      <Card>
        <div className="w-full">
          <ButtonTabs
            className="espelho-do-sistema"
            id="chamadas"
            label="Gestão de chamadas"
            header={<SectionHeader variant="large">Gestão de Chamadas</SectionHeader>}
            tabs={ABAS}
            value={aba}
            onChange={setAba}
            panelClassName="mt-6 space-y-4"
            actions={
              <>
                {/* Só o ícone, e o nome vai no `aria-label`: é o padrão de
                    ação secundária já usado em Documentos do profissional.

                    `self-center` no ícone é a convenção do próprio sistema para
                    botão sem texto — `button/1` no tamanho `normal` alinha por
                    `items-baseline`, e sem texto para dar a linha de base o
                    ícone subia quatro pixels acima do centro. O monólito
                    resolve assim em toda parte, e `drawer_modal/1` aqui já
                    fazia o mesmo no botão de fechar.
                    O contador não vem para cá — o número que a recepção
                    precisa ver de longe é o da fila, e ele está na aba e no
                    cartão "chamadas hoje". */}
                <Button
                  className="espelho-do-sistema"
                  variant="tint"
                  color="brand"
                  aria-label="Histórico de chamadas"
                  onClick={() => setHistoricoAberto(true)}
                >
                  <Icon name="fa-clock-rotate-left" className="block self-center" />
                </Button>
                <Button
                  className="espelho-do-sistema"
                  rightIcon="fa-bullhorn"
                  onClick={() => setDrawer({})}
                >
                  Nova chamada
                </Button>
              </>
            }
          >
            {/* `info_card/1`, os quatro números do dia. Ficam acima do painel e
                valem para as quatro abas: são o resumo do dia, não de uma aba. */}
            <div className="grid grid-cols-2 gap-4 @tablet:grid-cols-4">
              <Numero valor={numeros.fila} rotulo="na fila" variante="orange" icone="fa-clock" />
              <Numero
                valor={numeros.total}
                rotulo="chamadas hoje"
                variante="info"
                icone="fa-tower-broadcast"
              />
              <Numero
                valor={numeros.atencao}
                rotulo="precisam de atenção"
                variante="accent"
                icone="fa-triangle-exclamation"
              />
              <Numero
                valor={numeros.atendidas}
                rotulo="atendidas"
                variante="green"
                icone="fa-check-double"
              />
            </div>

            {/* `inside_card/1`: a chamada em curso é um estado, não um aviso. */}
            {tocando && (
              <InsideCard
                icon="fa-volume-high"
                title="Tocando agora"
                subtitle={`“${tocando.text}”`}
                value={tocando.at}
              />
            )}

          {aba === "live" && (
            <Fila
              fila={fila}
              onAnunciar={anunciarDaFila}
              onEditar={(pendente) => setDrawer(pendente)}
              onDispensar={(pendente) => {
                setDispensados([...dispensados, pendente.id]);
                setAviso(
                  `Pendência de ${pendente.target} dispensada. Ela sai da fila e não será anunciada.`,
                );
              }}
            />
          )}

          {aba === "devices" && (
            <Dispositivos
              devices={daUnidade}
              unidade={calls.unit}
              onMudar={(id, patch) =>
                setDevices(
                  devices.map((device) => (device.id === id ? { ...device, ...patch } : device)),
                )
              }
              onTestar={(device) =>
                setAviso(`Teste de som enviado para ${device.room}: “Teste de som da Bloomy”.`)
              }
            />
          )}

          {aba === "rules" && (
            <Automacao
              rules={rules}
              autoMode={autoMode}
              onAuto={(ligado) => {
                setAutoMode(ligado);
                setAviso(
                  ligado
                    ? "Automação de chamadas ligada. As regras marcadas voltam a disparar."
                    : "Automação de chamadas desligada. Nenhuma regra dispara, e a configuração de cada uma é preservada.",
                );
              }}
              onMudar={(id, patch) =>
                setRules(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)))
              }
            />
          )}
          </ButtonTabs>
        </div>
      </Card>

      {/* A gaveta fica montada com `show`, e não atrás de um `&&`: é o
          `DrawerModal` que devolve `null` enquanto está fechado, e é ele que
          precisa do ciclo aberto→fechado para tocar a saída e devolver o foco
          ao botão que a abriu. */}
      <DrawerModal
        id="chamadas-historico"
        show={historicoAberto}
        onCancel={() => setHistoricoAberto(false)}
        title="Histórico de chamadas"
        variant="medium"
      >
        <Historico
          historico={historico}
          onAtendida={(entrada) => {
            setLog(
              log.map((linha) =>
                linha.id === entrada.id
                  ? { ...linha, status: "acked", ackAt: calls.now }
                  : linha,
              ),
            );
            setAviso(`Chamada de ${entrada.target} marcada como atendida.`);
          }}
          onRepetir={(entrada) =>
            anunciar({
              kind: entrada.kind,
              patient: entrada.patient,
              guardian: entrada.guardian,
              target: entrada.target,
              deviceIds: entrada.deviceIds,
              text: entrada.text,
              by: "Recepção",
              ...(entrada.eventId ? { eventId: entrada.eventId } : {}),
            })
          }
        />
      </DrawerModal>

      {drawer && (
        <NovaChamada
          preset={drawer}
          data={estado}
          onFechar={() => setDrawer(null)}
          onAnunciar={anunciar}
          onCriar={criarChamado}
        />
      )}
    </div>,
  );
}

/* ================================================================ números */

function Numero({
  valor,
  rotulo,
  variante,
  icone,
}: {
  valor: number;
  rotulo: string;
  variante: InfoCardVariant;
  icone: string;
}) {
  /* `info_card/1` não traz moldura: é ícone, número e rótulo soltos, e é assim
     que o espelho tem de continuar. O desenho põe os quatro números em caixas
     de 5% da cor do texto sobre contorno de 10% — a moldura é composição desta
     tela, então mora aqui e não em `Card.tsx`.

     Não é o `card/1` que Supervisão usa em volta do mesmo componente: lá o
     indicador é cartão branco com sombra no meio de uma tela de cartões
     brancos; aqui os quatro estão **dentro** do cartão branco da área, e
     branco sobre branco não tem contorno para ser lido.

     A moldura é só o contorno: o preenchimento de 5% do desenho saiu. Ele
     pintava de cinza a faixa mais alta da tela, logo abaixo do título, e os
     quatro números — que são o resumo do dia, não um formulário — apareciam
     rebaixados em relação aos cartões de trabalho, que são brancos. Sem o
     fundo, a faixa toda fica no mesmo branco e o contorno faz o agrupamento
     sozinho. */
  return (
    <div className="rounded-xl border border-[var(--color-brand-purple-dark)]/10 p-4">
      <InfoCard title={rotulo} info={String(valor)} variant={variante} icon={icone} />
    </div>
  );
}

/**
 * O rótulo de Chamar, que muda quando a chamada já foi anunciada.
 *
 * Vira função porque agora aparece três vezes no mesmo botão — texto visível,
 * `aria-label` e `title` —, e as três têm de dizer a mesma coisa.
 */
function rotuloDeChamar(pendente: PendingCall): string {
  return pendente.already > 0 ? "Chamar novamente" : "Chamar";
}

/* =================================================================== fila */

function Fila({
  fila,
  onAnunciar,
  onEditar,
  onDispensar,
}: {
  fila: PendingCall[];
  onAnunciar: (pendente: PendingCall) => void;
  onEditar: (pendente: PendingCall) => void;
  onDispensar: (pendente: PendingCall) => void;
}) {
  const [profissional, setProfissional] = useState("");
  const [crianca, setCrianca] = useState("");
  const [situacao, setSituacao] = useState("");

  /* As opções saem da fila que existe, e não de um catálogo: um filtro que
     oferece um nome sem cartão nenhum atrás dele é um beco. Elas são calculadas
     sobre `fila` inteira — antes de filtrar —, para que escolher um profissional
     não apague os outros da lista e prenda quem escolheu. */
  const nomesDe = (pegar: (p: PendingCall) => string) =>
    [...new Set(fila.map(pegar).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((nome) => ({ value: nome, label: nome }));

  const filtrada = fila
    .filter((p) => !profissional || p.professional === profissional)
    .filter((p) => !crianca || p.patient === crianca)
    .filter((p) => !situacao || p.tone === situacao);

  const filtrando = Boolean(profissional || crianca || situacao);
  const quantosFiltros = [profissional, crianca, situacao].filter(Boolean).length;
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  if (fila.length === 0) {
    return (
      <EmptyStateCard icon="fa-circle-check" text="Nenhuma chamada pendente">
        Todos os check-ins e encerramentos do dia já foram anunciados.
      </EmptyStateCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Três `select/1`, separados, como no histórico. A fila da recepção passa
          de uma tela cheia quando a unidade tem trinta crianças em atendimento,
          e a pergunta que se faz nela é sempre uma destas três: "a Beatriz já
          foi chamada?", "sobrou alguma coisa da Sônia?", "o que está urgente?".

          Sem busca por texto livre, ao contrário do histórico: aqui os nomes são
          poucos e conhecidos, e um campo de texto convidaria a digitar um nome
          que a fila não tem para receber "nenhum resultado" sem saber por quê. */}
      {/* No telefone os três seletores empilhados gastam 248px — mais que a
          altura de um cartão — e empurram a primeira pendência para baixo da
          dobra. Quem abre esta tela no corredor quer ver quem está esperando,
          não filtrar: o filtro é refinamento, e refinamento recolhe.

          A partir de `md` o botão some e a grade fica aberta, que é o pedido
          original — três seletores separados, sempre à vista.

          **O contador no rótulo é obrigatório.** Filtro escondido que altera a
          lista é a armadilha desta tela: a fila filtrada parece o dia
          resolvido. Com "Filtros · 2" no botão, e com a linha "3 de 5 chamadas"
          logo abaixo, o estado nunca fica mudo. */}
      <button
        type="button"
        onClick={() => setFiltrosAbertos((antes) => !antes)}
        aria-expanded={filtrosAbertos}
        aria-controls="fila-filtros"
        className="flex h-12 w-full items-center justify-between rounded-lg border border-[var(--color-brand-purple-dark)]/10 px-4 font-bold text-[var(--color-brand-purple-dark)] @tablet:hidden"
      >
        <span>
          <Icon name="fa-filter" className="mr-2" />
          Filtros
          {quantosFiltros > 0 && ` · ${quantosFiltros}`}
        </span>
        <Icon name={filtrosAbertos ? "fa-chevron-up" : "fa-chevron-down"} />
      </button>

      <div
        id="fila-filtros"
        className={`grid gap-4 @tablet:grid-cols-3 ${filtrosAbertos ? "grid" : "hidden @tablet:grid"}`}
      >
        <Select
          id="fila-profissional"
          label="Profissional"
          prompt="Todos os profissionais"
          value={profissional}
          onChange={setProfissional}
          options={nomesDe((p) => p.professional)}
        />
        <Select
          id="fila-crianca"
          label="Criança"
          prompt="Todas as crianças"
          value={crianca}
          onChange={setCrianca}
          options={nomesDe((p) => p.patient)}
        />
        <Select
          id="fila-situacao"
          label="Situação"
          prompt="Todas as situações"
          value={situacao}
          onChange={setSituacao}
          options={[
            { value: "hot", label: "Urgente" },
            { value: "warm", label: "Atenção" },
            { value: "calm", label: "No prazo" },
          ]}
        />
      </div>

      {/* O filtro que não encontra nada diz o que está filtrando e como sair.
          Sem isto, três selects mal notados no alto produzem uma fila vazia que
          parece o dia resolvido — a leitura mais perigosa desta tela. */}
      {filtrada.length === 0 ? (
        <EmptyStateCard icon="fa-filter" text="Nenhuma chamada com esses filtros">
          A fila tem {fila.length}{" "}
          {fila.length === 1 ? "chamada pendente" : "chamadas pendentes"}, e nenhuma delas
          atende ao que está selecionado acima.
        </EmptyStateCard>
      ) : (
        <>
          {filtrando && (
            <p role="status" className="m-0 text-sm text-[var(--color-brand-purple-dark)]/72">
              {filtrada.length} de {fila.length}{" "}
              {fila.length === 1 ? "chamada" : "chamadas"} na fila.
            </p>
          )}
          <Lista
            fila={filtrada}
            onAnunciar={onAnunciar}
            onEditar={onEditar}
            onDispensar={onDispensar}
          />
        </>
      )}
    </div>
  );
}

function Lista({
  fila,
  onAnunciar,
  onEditar,
  onDispensar,
}: {
  fila: PendingCall[];
  onAnunciar: (pendente: PendingCall) => void;
  onEditar: (pendente: PendingCall) => void;
  onDispensar: (pendente: PendingCall) => void;
}) {
  return (
    <ul className="m-0 grid list-none gap-4 p-0 @desktop:grid-cols-2">
      {fila.map((pendente) => {
        const palavra = waitingToneLabel(pendente.tone);
        const motivo = pendente.type === "checkin" ? "Chegada" : "Atendimento encerrado";
        return (
          /* O item estica na linha da grade — `align-items: stretch` é o
             padrão — e o cartão preenche o item. É o que iguala a altura dos
             dois cartões de uma linha quando um subtítulo quebra e o outro
             não. */
          <li key={pendente.id} className="flex">
            <Card className={`${CARD_DE_ESTADO} h-full w-full`}>
              {/* O ritmo do desenho: 8px entre as linhas de texto, 20px antes
                  da fileira de ações. O que estava aqui — 4, 12 e 16 — colava o
                  nome no subtítulo e afastava a frase das ações, invertendo a
                  leitura. O bloco de texto é uma coisa só; a separação que
                  importa é a que antecede o que se pode fazer. */}
              <div className="flex h-full w-full flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="m-0 text-lg font-bold text-[var(--color-brand-purple-dark)]">
                      {pendente.target}
                    </p>
                    {/* A espera traz a palavra junto do número: a cor do
                        cartão nunca é o único sinal da temperatura. */}
                    <Tag
                      item={
                        palavra
                          ? `${palavra} · ${humanWait(pendente.waiting)}`
                          : humanWait(pendente.waiting)
                      }
                      variant={TONE_TAG[pendente.tone]}
                      icon="fa-clock"
                    />
                  </div>

                  <p className="m-0 text-sm text-[var(--color-brand-purple-dark)]/72">
                    {pendente.kind === "professional" ? "Profissional de" : "Responsável por"}{" "}
                    {pendente.patient} · {motivo} às {pendente.at}
                  </p>

                  {/* Duas linhas, e o resto em reticência — como o desenho.
                      `line-clamp` corta na **pintura**: a frase inteira continua
                      no DOM, continua sendo lida por leitor de tela e vai no
                      `title` para quem usa ponteiro. É o que separa isto de
                      truncar de verdade, e é o que mantém de pé o critério de
                      aceite do cenário — o cartão mostra a frase pronta antes de
                      qualquer ação. Quem precisa conferir palavra por palavra
                      antes de a caixa falar tem o painel de edição a um clique,
                      com o texto inteiro num campo. */}
                  <p
                    title={pendente.text}
                    className="m-0 line-clamp-2 text-base text-[var(--color-brand-purple-dark)]"
                  >
                    “{pendente.text}”
                  </p>

                  {pendente.already > 0 && (
                    <p className="m-0 text-sm text-[var(--color-brand-purple-dark)]/72">
                      Já anunciada{" "}
                      {pendente.already === 1 ? "uma vez" : `${pendente.already} vezes`} — sem
                      resposta até agora.
                    </p>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-2">
                  {/* `button/1` no tamanho padrão do sistema — `normal`, 48px de
                      altura — e com o ícone à direita, como o produto usa. O
                      `medium` que estava aqui era encolhimento meu.

                      **No telefone, Chamar e Editar ficam só com o ícone.** Os
                      três botões com texto pedem 245px e o cartão dá 247 (263
                      depois do recuo novo): eles couberam por um fio numa linha
                      e quebravam em duas na frase mais longa, que é
                      "Chamar novamente". Dois quadrados de 48px e uma palavra
                      cabem sempre.

                      Os dois que perdem o texto são os que têm ícone falante —
                      megafone e lápis — e são as duas ações que a recepção
                      repete o dia inteiro. Dispensar continua escrita: é a
                      ação que tira o cartão da fila, não tem ícone no sistema,
                      e não é a que se aprende de cor.

                      O nome vai em `aria-label`, e não sai do DOM como nas
                      abas: aqui o rótulo do botão *é* o texto, e um `sr-only`
                      deixaria "Chamar novamente" ocupando altura de linha
                      dentro de um quadrado. `title` junto para quem passa o
                      ponteiro no tablet. */}
                  <Button
                    className="espelho-do-sistema @max-phone:size-12 @max-phone:px-0 @max-phone:py-0"
                    aria-label={rotuloDeChamar(pendente)}
                    title={rotuloDeChamar(pendente)}
                    onClick={() => onAnunciar(pendente)}
                  >
                    <span className="@max-phone:hidden">{rotuloDeChamar(pendente)}</span>
                    <Icon
                      name="fa-bullhorn"
                      className="ml-2 @max-phone:ml-0 @max-phone:self-center"
                    />
                  </Button>
                  <Button
                    className="espelho-do-sistema @max-phone:size-12 @max-phone:px-0 @max-phone:py-0"
                    variant="tint"
                    color="brand"
                    aria-label="Editar"
                    title="Editar"
                    onClick={() => onEditar(pendente)}
                  >
                    <span className="@max-phone:hidden">Editar</span>
                    <Icon name="fa-pen" className="ml-2 @max-phone:ml-0 @max-phone:self-center" />
                  </Button>
                  <Button variant="ghost" onClick={() => onDispensar(pendente)}>
                    Dispensar
                  </Button>
                </div>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

/* ============================================================== histórico */

function Historico({
  historico,
  onAtendida,
  onRepetir,
}: {
  historico: CallLogEntry[];
  onAtendida: (entrada: CallLogEntry) => void;
  onRepetir: (entrada: CallLogEntry) => void;
}) {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const [situacao, setSituacao] = useState("");

  const linhas = historico
    .filter((entrada) => !tipo || entrada.kind === tipo)
    .filter((entrada) => !situacao || entrada.status === situacao)
    .filter(
      (entrada) =>
        !busca ||
        [entrada.target, entrada.patient, entrada.text]
          .filter(Boolean)
          .some((campo) => campo!.toLowerCase().includes(busca.toLowerCase())),
    );

  return (
    <div className="space-y-4">
      {/* `input/1` e `select/1` do sistema. */}
      <div className="grid gap-4 @tablet:grid-cols-[minmax(0,1fr)_13rem_13rem]">
        <Input
          id="chamadas-busca"
          label="Buscar"
          leftIcon="fa-magnifying-glass"
          placeholder="Criança, profissional ou texto do anúncio"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
        <Select
          id="chamadas-tipo"
          label="Tipo"
          prompt="Todos os tipos"
          value={tipo}
          onChange={setTipo}
          options={Object.entries(KIND_META).map(([value, meta]) => ({
            value,
            label: meta.label,
          }))}
        />
        <Select
          id="chamadas-situacao"
          label="Situação"
          prompt="Todas as situações"
          value={situacao}
          onChange={setSituacao}
          options={Object.entries(STATUS_META).map(([value, meta]) => ({
            value,
            label: meta.label,
          }))}
        />
      </div>

      {linhas.length === 0 ? (
        <EmptyStateCard icon="fa-magnifying-glass" text="Nenhuma chamada encontrada">
          Ajuste a busca ou os filtros para ver o histórico do dia.
        </EmptyStateCard>
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {linhas.map((entrada) => {
            const meta = STATUS_META[entrada.status];
            return (
              <li key={entrada.id}>
                <Card className={CARD_DE_ESTADO}>
                  <div className="w-full">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="m-0 text-base font-bold text-[var(--color-brand-purple-dark)]">
                          <span className="tabular-nums text-[var(--color-brand-purple-dark)]/72">
                            {entrada.at}
                          </span>{" "}
                          {entrada.target}
                        </p>
                        <p className="m-0 mt-0.5 text-sm text-[var(--color-brand-purple-dark)]/72">
                          {KIND_META[entrada.kind].label}
                          {entrada.patient && <> · {entrada.patient}</>} ·{" "}
                          {entrada.auto ? "Automático" : entrada.by}
                          {entrada.ackAt && <> · atendida às {entrada.ackAt}</>}
                        </p>
                      </div>
                      <Tag item={meta.label} variant={meta.variant} icon={meta.icon} />
                    </div>

                    <p className="m-0 mt-2 text-base text-[var(--color-brand-purple-dark)]">
                      “{entrada.text}”
                    </p>

                    {entrada.error && (
                      <p className="m-0 mt-1 text-sm font-bold text-[var(--color-red-dark)]">
                        {entrada.error}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {entrada.status === "played" && (
                        <Button
                          className="espelho-do-sistema"
                          variant="tint"
                          color="brand"
                          rightIcon="fa-check-double"
                          onClick={() => onAtendida(entrada)}
                        >
                          Marcar atendida
                        </Button>
                      )}
                      {(entrada.status === "no_answer" || entrada.status === "failed") && (
                        <Button
                          className="espelho-do-sistema"
                          rightIcon="fa-rotate-right"
                          onClick={() => onRepetir(entrada)}
                        >
                          Chamar novamente
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* =========================================================== dispositivos */

function Dispositivos({
  devices,
  unidade,
  onMudar,
  onTestar,
}: {
  devices: CallDevice[];
  unidade: string;
  onMudar: (id: string, patch: Partial<CallDevice>) => void;
  onTestar: (device: CallDevice) => void;
}) {
  if (devices.length === 0) {
    return (
      <EmptyStateCard icon="fa-plug-circle-xmark" text={`Nenhum dispositivo em ${unidade}`}>
        Sem uma caixa cadastrada, nenhuma chamada desta unidade tem para onde ir.
      </EmptyStateCard>
    );
  }

  /* Ligadas primeiro.

     A ordem que vinha era a do cadastro, e ela punha caixa desligada no meio
     das ligadas. Isso custa nas duas leituras que a aba tem: quem procura onde
     a chamada vai sair varre a lista inteira porque a resposta está espalhada,
     e quem procura o que está quebrado também. Offline no fim junta as duas —
     e o que sobra no rodapé é exatamente a lista de caixas para consertar.

     Copia antes de ordenar: `devices` é a lista do estado, e `sort` ordena no
     lugar — mexeria no array que o React guarda. (`toSorted` faria a cópia
     sozinho, mas a `lib` deste `tsconfig` não o declara ainda.) E `sort` é
     estável por especificação desde ES2019, então dentro de cada grupo a ordem
     do cadastro se mantém — a lista não se embaralha a cada render.

     O preço, e é real: desligar a chave manda o cartão para o fim da lista,
     debaixo do dedo de quem acabou de tocá-la. É consequência direta de querer
     as ligadas em primeiro, e some se um dia a aba separar em dois blocos com
     título em vez de ordenar num só. */
  const ordenados = [...devices].sort(
    (uma, outra) => Number(outra.online) - Number(uma.online),
  );

  return (
    <ul className="m-0 grid list-none gap-4 p-0 @tablet:grid-cols-2 @wide:grid-cols-3">
      {ordenados.map((device) => (
        <li key={device.id}>
          <Card
            className={device.online ? CARTAO_DO_DISPOSITIVO.online : CARTAO_DO_DISPOSITIVO.offline}
          >
            <div className="w-full">
              {/* Etiqueta e chave no alto, à direita, lado a lado. A chave
                  estava lá embaixo, ao lado de "Testar som" — longe da palavra
                  que diz o estado que ela controla, e no meio das ações. Aqui
                  ela fica onde a informação está: quem lê "Offline" tem o
                  controle de religar no mesmo canto do olho.

                  E a chave **não** some quando a caixa está offline, ao
                  contrário do resto: é o único controle que muda esse estado. */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="m-0 text-base font-bold text-[var(--color-brand-purple-dark)]">
                  {device.room}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <Tag
                    item={device.online ? "Online" : "Offline"}
                    variant={device.online ? "green" : "red"}
                    icon={device.online ? "fa-circle-check" : "fa-plug-circle-xmark"}
                  />
                  <Switch
                    id={`${device.id}-online`}
                    checked={device.online}
                    onChange={(ligado) => onMudar(device.id, { online: ligado })}
                    aria-label={`${device.room} online`}
                  />
                </div>
              </div>

              <p className="m-0 mt-0.5 text-sm text-[var(--color-brand-purple-dark)]/72">
                Echo · Público: {AUDIENCE_LABEL[device.audience]}
              </p>

              {/* A única peça desta tela que não é componente do sistema.
                  `input type="slider"` existe em `core_components.ex:792` — um
                  range com pontos e rótulo por parada — e não foi portado para
                  cá ainda. As classes abaixo são as de lá (`h-3`,
                  `bg-brand-blue/10`, `rounded-lg`, `appearance-none`), para que
                  o dia do porte seja uma troca de componente e não um
                  redesenho. */}
              {/* Offline, o cartão fica só com o nome, a etiqueta e a chave.
                  Volume e teste de som saem da vista: os dois só fazem sentido
                  contra uma caixa que está ligada, e o volume continua guardado
                  — ele volta com o mesmo valor quando a caixa volta. */}
              {device.online && (
                <>
                  <div className="mt-3">
                    <Label htmlFor={`${device.id}-volume`}>Volume: {device.volume} de 10</Label>
                    <input
                      id={`${device.id}-volume`}
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={device.volume}
                      onChange={(event) =>
                        onMudar(device.id, { volume: Number(event.target.value) })
                      }
                      className="mt-2 h-3 w-full appearance-none rounded-lg bg-[var(--color-brand-blue)]/10"
                    />
                  </div>

                  <div className="mt-3">
                    <Button
                      id={`${device.id}-testar`}
                      className="espelho-do-sistema"
                      variant="tint"
                      rightIcon="fa-volume-high"
                      onClick={() => onTestar(device)}
                    >
                      Testar som
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

/* =============================================================== automação */

function Automacao({
  rules,
  autoMode,
  onAuto,
  onMudar,
}: {
  rules: CallAutomationRule[];
  autoMode: boolean;
  onAuto: (ligado: boolean) => void;
  onMudar: (id: string, patch: Partial<CallAutomationRule>) => void;
}) {
  const [aberta, setAberta] = useState<string | null>(null);
  const trava = canToggleRule(autoMode);

  return (
    <div className="space-y-4">
      <Card className={autoMode ? CARTAO_DA_CHAVE_GERAL.on : CARTAO_DA_CHAVE_GERAL.off}>
        <div className="flex w-full flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 text-base font-bold text-[var(--color-brand-purple-dark)]">
              Automação de chamadas
            </p>
            <p className="m-0 mt-0.5 max-w-[68ch] text-sm text-[var(--color-brand-purple-dark)]/72">
              Ligada, o sistema anuncia sozinho as regras marcadas abaixo. Desligada, nenhuma
              dispara — e cada uma preserva a configuração que tinha.
            </p>
          </div>
          <Switch
            id="chamadas-auto"
            checked={autoMode}
            onChange={onAuto}
            aria-label="Automação de chamadas"
          />
        </div>
      </Card>

      <ul className="m-0 list-none space-y-3 p-0">
        {rules.map((rule) => {
          const modelo = CALL_TEMPLATES.find((item) => item.id === rule.templateId);
          const dispara = autoMode && rule.on;
          const fluxo =
            rule.kind === "professional"
              ? "Criança chegou → Profissional"
              : "Atendimento encerrado → Responsável";
          const expandida = aberta === rule.id;

          return (
            <li key={rule.id}>
              <Card className={dispara ? CARTAO_DA_REGRA.dispara : CARTAO_DA_REGRA.quieta}>
                <div className="w-full">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      {/* O nome da regra é o título do cartão, em texto — como
                          o nome da pessoa na fila e o da sala no dispositivo.
                          Era uma `tag/1`, e etiqueta é para dizer situação ao
                          lado de um título, não para ser o título: a situação
                          desta regra já está dita por extenso duas linhas
                          abaixo, com a mesma cor, e a etiqueta a repetia sem
                          acrescentar palavra. */}
                      <p className="m-0 text-base font-bold text-[var(--color-brand-purple-dark)]">
                        {rule.label}
                      </p>
                      <p className="m-0 mt-2 text-sm text-[var(--color-brand-purple-dark)]/72">
                        {fluxo}
                      </p>
                      <p className="m-0 text-sm text-[var(--color-brand-purple-dark)]/72">
                        {rule.delay === 0 ? "Imediato" : `Após ${rule.delay} min`} ·{" "}
                        {rule.repeat <= 1 ? "sem repetição" : `repetir até ${rule.repeat}x`} ·{" "}
                        {/* O estado efetivo é dito por extenso: uma regra
                            marcada sob chave-geral desligada não dispara, e o
                            interruptor sozinho não conta essa história. */}
                        <strong
                          className={
                            dispara
                              ? "text-[var(--color-green-dark)]"
                              : "text-[var(--color-brand-purple-dark)]/72"
                          }
                        >
                          {dispara
                            ? "dispara sozinha"
                            : rule.on
                              ? "marcada, mas a automação geral está desligada"
                              : "desligada"}
                        </strong>
                      </p>
                    </div>
                    {/* Duas ações distintas, dois controles distintos: o
                        interruptor liga a regra, o chevron abre a configuração.
                        Estavam somados no título, e clicar no nome para ver o
                        texto que a caixa de som vai falar é descoberta por
                        tentativa. O botão fantasma só com o ícone é o padrão de
                        ação secundária do sistema, e o `aria-label` diz o que
                        ele abre — "Configuração de …" —, porque `aria-expanded`
                        sem nome anuncia "expandido" e mais nada.

                        A chave vem antes do chevron: ela é o controle do
                        estado, e é ela que se alinha com a chave-geral da linha
                        de cima. */}
                    <div className="flex shrink-0 items-center gap-2">
                      {/* A chave mostra o estado **efetivo**, não o guardado.
                          Com a chave-geral desligada nenhuma regra dispara, e
                          uma fileira de interruptores azuis embaixo de uma
                          chave-geral cinza dizia o contrário do que a tela
                          estava fazendo.

                          O que a regra tem guardado não se perde nem some: a
                          chave fica indisponível enquanto a geral está
                          desligada, e a linha de estado continua dizendo
                          "marcada, mas a automação geral está desligada" — que
                          é onde essa informação passou a morar. Religada a
                          geral, as mesmas voltam sozinhas. */}
                      <Switch
                        id={`${rule.id}-on`}
                        checked={dispara}
                        disabled={!trava.allowed}
                        onChange={(ligado) => onMudar(rule.id, { on: ligado })}
                        aria-label={rule.label}
                      />
                      <Button
                        className="espelho-do-sistema"
                        variant="ghost"
                        aria-expanded={expandida}
                        aria-controls={`${rule.id}-config`}
                        aria-label={`Configuração de ${rule.label}`}
                        onClick={() => setAberta(expandida ? null : rule.id)}
                      >
                        <Icon
                          name={expandida ? "fa-chevron-up" : "fa-chevron-down"}
                          className="block self-center"
                        />
                      </Button>
                    </div>
                  </div>

                  {!trava.allowed && (
                    <p className="m-0 mt-2 text-sm text-[var(--color-brand-purple-dark)]/72">
                      {trava.reason}
                    </p>
                  )}

                  {expandida && (
                    <div id={`${rule.id}-config`} className="mt-4 space-y-4">
                      <p className="m-0 max-w-[68ch] text-base text-[var(--color-brand-purple-dark)]">
                        {rule.desc}
                      </p>
                      {/* Os três campos apagam junto com o cartão. São os
                          mesmos que já vinham desabilitados por `dispara`, e a
                          opacidade é o que torna isso visível antes de alguém
                          tentar clicar. Fica na grade, e não no bloco inteiro:
                          a descrição da regra e o texto do anúncio continuam
                          legíveis, porque são o que se lê para decidir ligar. */}
                      <div
                        className={`grid gap-4 @tablet:grid-cols-3 ${dispara ? "" : "opacity-60"}`}
                      >
                        <Select
                          id={`${rule.id}-modelo`}
                          label="Texto usado"
                          value={rule.templateId}
                          disabled={!trava.allowed || !rule.on}
                          onChange={(value) =>
                            onMudar(rule.id, { templateId: value, text: undefined })
                          }
                          clear={false}
                          options={CALL_TEMPLATES.filter((item) => item.kind === rule.kind).map(
                            (item) => ({ value: item.id, label: item.label }),
                          )}
                        />
                        <Select
                          id={`${rule.id}-espera`}
                          label="Esperar antes de anunciar"
                          value={String(rule.delay)}
                          disabled={!trava.allowed || !rule.on}
                          onChange={(value) => onMudar(rule.id, { delay: Number(value) })}
                          clear={false}
                          options={[0, 1, 2, 5, 10].map((minutos) => ({
                            value: String(minutos),
                            label: minutos === 0 ? "Imediato" : `${minutos} min`,
                          }))}
                        />
                        <Select
                          id={`${rule.id}-repeticoes`}
                          label="Repetições sem resposta"
                          value={String(rule.repeat)}
                          disabled={!trava.allowed || !rule.on}
                          onChange={(value) => onMudar(rule.id, { repeat: Number(value) })}
                          clear={false}
                          options={[1, 2, 3].map((vezes) => ({
                            value: String(vezes),
                            label: vezes === 1 ? "Não repetir" : `${vezes} vezes`,
                          }))}
                        />
                      </div>
                      {/* Campo aberto, e não `inside_card/1`.

                          O cartão aninhado é para dado que veio de outro lugar
                          e não se muda. Esta frase é a que a caixa de som vai
                          falar sozinha, sem ninguém conferindo na hora — é o
                          texto mais editável da área, não o menos. Era só de
                          leitura, e trocar o modelo era a única forma de mexer
                          nele.

                          Escolher outro modelo devolve o texto dele: o patch
                          zera `text` junto, e a frase reescrita não sobrevive a
                          uma troca de modelo que a pessoa fez de propósito. */}
                      <Textarea
                        id={`${rule.id}-texto`}
                        label="Texto do anúncio"
                        rows={2}
                        value={rule.text ?? modelo?.text ?? ""}
                        disabled={!trava.allowed || !rule.on}
                        onChange={(event) => onMudar(rule.id, { text: event.target.value })}
                        className={dispara ? undefined : "opacity-60"}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* =========================================================== nova chamada */

/**
 * O painel de nova chamada.
 *
 * A ordem das seções é a decisão de UX da V2 e não deve ser reorganizada por
 * conveniência de layout: quem chamar → qual criança → motivo → mensagem → onde
 * anunciar. Cada passo estreita o seguinte, e é isso que permite anunciar em
 * dois cliques a partir do cartão da fila.
 *
 * Os três primeiros passos são `radio_selector/1`: barra segmentada para quem
 * será chamado, pílulas para o motivo. O quarto é `input/1` na forma de área de
 * texto, e o quinto é `checkgroup/1`.
 */
function NovaChamada({
  preset,
  data,
  onFechar,
  onAnunciar,
  onCriar,
}: {
  preset: Partial<PendingCall>;
  data: CallsData;
  onFechar: () => void;
  onCriar: (entrada: {
    kind: CallKind;
    patient: string;
    guardian: string;
    professional: string;
    room: string;
    start?: string;
    templateId: string;
    text: string;
  }) => void;
  onAnunciar: (entrada: {
    kind: CallKind;
    patient?: string;
    guardian?: string;
    target: string;
    deviceIds: string[];
    text: string;
    by: string;
    eventId?: string;
  }) => void;
}) {
  const [kind, setKind] = useState<CallKind>(preset.kind ?? "professional");
  const [patient, setPatient] = useState(preset.patient ?? "");
  const [profManual, setProfManual] = useState("");
  const [guardianManual, setGuardianManual] = useState("");
  const [templateId, setTemplateId] = useState(
    preset.rule?.templateId ?? (kind === "professional" ? "arrival" : "session_end"),
  );
  const [textoGeral, setTextoGeral] = useState("");
  const [textoEditado, setTextoEditado] = useState<string | null>(null);
  const [escolhaDeDispositivos, setEscolhaDeDispositivos] = useState<string[] | null>(null);

  function trocarTipo(novo: string) {
    const tipo = novo as CallKind;
    setKind(tipo);
    setPatient("");
    setProfManual("");
    setGuardianManual("");
    setTextoEditado(null);
    setEscolhaDeDispositivos(null);
    const primeiro = CALL_TEMPLATES.find((item) => item.kind === tipo);
    setTemplateId(primeiro ? primeiro.id : "free");
  }

  /* --------------------------------------------- quem, vindo da agenda */
  const resolvido = resolveTarget(kind, patient, data);
  /* Os dois nomes têm padrão e continuam trocáveis. O `*Manual` só existe
     depois que alguém escolhe outro, e volta a vazio quando a criança muda —
     senão o nome escolhido para uma criança seguiria para a próxima. */
  const professional = profManual || resolvido.professional || "";
  const guardian = guardianManual || resolvido.guardian || "";
  const target =
    kind === "general"
      ? "Sala de espera"
      : kind === "professional"
        ? (professional ?? "")
        : (guardian ?? "");

  /* ------------------------------------------------------- a mensagem */
  const modelo = CALL_TEMPLATES.find((item) => item.id === templateId) ?? CALL_TEMPLATES[0]!;
  const composta =
    kind === "general"
      ? textoGeral
      : (textoEditado ??
        fillTemplate(
          modelo.text,
          {
            ...(professional ? { professional } : {}),
            ...(patient ? { patient } : {}),
            ...(guardian ? { guardian } : {}),
            ...(resolvido.room ? { room: resolvido.room } : {}),
            ...(resolvido.start ? { start: resolvido.start } : {}),
          },
          true,
        ));

  /* Os nomes de cada seletor, sem repetição e em ordem. Em ambos entra também o
     nome que vem da agenda mesmo que não esteja no cadastro — é ele que vem
     selecionado, e uma opção selecionada que não está na lista não aparece. */
  const profissionais = [
    ...new Set(
      [
        ...data.professionals.map((pessoa) => pessoa.name),
        ...data.events.map((evento) => evento.professional),
      ].filter(Boolean),
    ),
  ]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((nome) => ({ value: nome, label: nome }));

  const responsaveis = [
    ...new Set(
      [
        ...data.patients.map((crianca) => crianca.guardian),
        ...data.events.map((evento) => evento.guardian),
      ].filter(Boolean),
    ),
  ]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((nome) => ({ value: nome, label: nome }));

  /* ------------------------------------------------------ onde anunciar */
  const alcance = devicesForKind(kind, data);
  const automaticos = alcance.filter((device) => device.online).map((device) => device.id);
  const escolhidos = escolhaDeDispositivos ?? automaticos;
  const bloqueio = canAnnounce({ kind, patient, target, text: composta, deviceIds: escolhidos });
  const bloqueioDeFila = canQueue({ kind, patient, target, text: composta });

  /* As opções do `checkgroup/1`. O rótulo carrega o público e o volume porque a
     opção do componente é uma linha só — e as duas coisas decidem a escolha. */
  const opcoesDeDispositivo: Opcao[] = alcance.map((device) => ({
    value: device.id,
    label: device.online
      ? `${device.room} — ${AUDIENCE_LABEL[device.audience]}, volume ${device.volume}`
      : `${device.room} — offline`,
    disabled: !device.online,
  }));

  return (
    <DrawerModal
      id="nova-chamada"
      show
      onCancel={onFechar}
      title="Nova chamada"
      /* A largura é declarada, e não herdada do conteúdo.
     
         `drawer_modal/1` põe `w-full` no painel dentro de um container
         `fixed flex` sem largura — então o container encolhe para o conteúdo e o
         `w-full` do painel resolve contra esse encolhimento. O resultado é uma
         gaveta que muda de largura conforme o formulário: trocar Profissional
         por Responsável troca um `select` por um `input` e a moldura inteira
         anda 20px. `w-screen` dá largura definida, `max-w-xl` devolve o teto do
         `small`, e em tela estreita o teto vira a largura da tela. */
      variant="custom"
      customSize="w-screen max-w-xl"
      footer={
        /* No telefone o rodapé virava três linhas de botão — 161px fixos no pé
           de uma tela de 812px, com o formulário rolando no que sobrava.

           Aqui ele tem duas: as duas ações de confirmar dividem a primeira, e
           Cancelar ocupa a segunda inteira. `flex-col-reverse` põe Cancelar por
           baixo sem tirá-lo da ordem de leitura nem da de foco — ele continua
           sendo o primeiro no DOM, que é onde a saída deve estar para quem
           navega por teclado. A partir de `sm` volta a linha única do desenho. */
        <div className="flex flex-col-reverse gap-2 @phone:flex-row @phone:flex-wrap @phone:items-start @phone:justify-between @phone:gap-4">
          <Button
            className="espelho-do-sistema w-full @phone:w-auto"
            variant="outline"
            onClick={onFechar}
          >
            Cancelar
          </Button>
          {/* Duas saídas, e a diferença entre elas é falar agora ou não falar.

              "Criar chamado" é `tint`/`brand` — a cor de nenhum sinal —, porque
              o primário da linha continua sendo o que faz a caixa de som tocar.
              E vem antes de Anunciar na ordem de leitura e de foco: a ação que
              não é pública primeiro, a que fala na frente das famílias depois. */}
          <div className="grid grid-cols-2 gap-2 @phone:flex @phone:flex-wrap @phone:items-start">
            <AcaoIndisponivel
              id="criar-chamado"
              className="espelho-do-sistema w-full @phone:w-auto"
              variant="tint"
              color="brand"
              rightIcon="fa-list-check"
              {...(bloqueioDeFila.allowed ? {} : { motivo: bloqueioDeFila.reason })}
              onClick={() =>
                onCriar({
                  kind,
                  patient,
                  guardian: guardian ?? "",
                  professional: professional ?? "",
                  room: resolvido.room ?? "",
                  ...(resolvido.start ? { start: resolvido.start } : {}),
                  templateId,
                  text: composta.trim(),
                })
              }
            >
              Criar chamado
            </AcaoIndisponivel>
            <AcaoIndisponivel
              id="anunciar"
              className="espelho-do-sistema w-full @phone:w-auto"
              rightIcon="fa-bullhorn"
              {...(bloqueio.allowed ? {} : { motivo: bloqueio.reason })}
              onClick={() =>
                onAnunciar({
                  kind,
                  ...(patient ? { patient } : {}),
                  ...(guardian ? { guardian } : {}),
                  target,
                  deviceIds: escolhidos,
                  text: composta.trim(),
                  by: "Recepção",
                  ...(preset.id ? { eventId: preset.id } : {}),
                })
              }
            >
              Anunciar
            </AcaoIndisponivel>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ------------------------------------------------- quem chamar */}
        {/* `radio_group/1`, o rádio padrão do sistema: opções soltas, a
            marcada ganha fundo. Era `radio_selector/1` em barra segmentada, que
            é o componente de trocar de aba — não o de escolher um valor num
            formulário. O ícone sai junto: `radio_group/1` renderiza só o
            rótulo, e o público de cada tipo já é dito em "Onde anunciar". */}
        <RadioGroup
          label="Quem será chamado"
          name="chamada-tipo"
          value={kind}
          onChange={trocarTipo}
          options={Object.entries(KIND_META).map(([value, meta]) => ({
            value,
            label: meta.label,
            title: `Anuncia nas caixas de ${meta.publico.toLowerCase()}`,
          }))}
        />

        {/* ----------------------------------------------------- criança */}
        {kind !== "general" && (
          <Select
            id="chamada-crianca"
            label="Criança"
            prompt="Selecionar criança"
            value={patient}
            onChange={(value) => {
              setPatient(value);
              setProfManual("");
              setGuardianManual("");
              setTextoEditado(null);
              setEscolhaDeDispositivos(null);
            }}
            options={data.patients.map((crianca) => ({
              value: crianca.name,
              label: crianca.name,
            }))}
          />
        )}

        {/* -------------------------------- quem, resolvido pela agenda */}
        {/* `select/1` com padrão, pelo mesmo motivo do responsável: o campo
            resolvido pela agenda deixou de ser `inside_card/1`.

            A agenda continua respondendo primeiro — o padrão é o profissional
            do próximo atendimento da criança —, mas a recepção pode trocar. O
            caso é comum e não era atendido: a terapeuta do horário faltou e
            quem está com a criança é outra pessoa, e o painel obrigava a mudar
            a agenda para poder chamar quem está na sala.

            **O contexto da agenda não se perde com o cartão.** Ele vira a linha
            de apoio abaixo do campo, e some quando alguém escolhe outro nome —
            "do próximo atendimento" seria mentira sobre um nome escolhido à
            mão. */}
        {kind === "professional" && patient && (
          <div>
            <Select
              id="chamada-profissional"
              label="Profissional"
              prompt="Selecionar profissional"
              value={professional}
              onChange={(value) => {
                setProfManual(value);
                setTextoEditado(null);
              }}
              clear={false}
              options={profissionais}
            />
            {resolvido.fromAgenda && professional === resolvido.professional && (
              <p className="m-0 mt-2 text-sm text-[var(--color-brand-purple-dark)]/72">
                Do próximo atendimento
                {resolvido.start ? ` às ${resolvido.start}` : ""}
                {resolvido.room ? ` · ${resolvido.room}` : ""}
              </p>
            )}
          </div>
        )}

        {/* `select/1` com padrão, e não `inside_card/1`.

            O cartão aninhado dizia "responsável cadastrado" e não deixava
            trocar. É a decisão certa para o profissional, que sai do próximo
            atendimento da agenda; é a errada para o responsável, que é **quem
            está na sala de espera**. Numa família em que a avó traz na terça e a
            mãe na quinta, o cadastro faz a recepção anunciar em voz alta o nome
            de quem não está lá.

            O padrão agora vem do check-in — ver `resolveTarget` —, e o campo
            aceita trocar sem apagar nada. As opções são os responsáveis da
            unidade, como o seletor de profissional. */}
        {kind === "guardian" && patient && (
          <Select
            id="chamada-responsavel"
            label="Responsável"
            prompt="Selecionar responsável"
            value={guardian}
            onChange={(value) => {
              setGuardianManual(value);
              setTextoEditado(null);
            }}
            clear={false}
            options={responsaveis}
          />
        )}

        {/* ------------------------------------------------------ motivo */}
        {/* `radio_group/1`, o rádio padrão — e não a barra segmentada.

            Mesma razão de "Quem será chamado", uma seção acima: a barra é o
            componente de trocar de aba, e usá-la num formulário faz três opções
            de valor parecerem navegação. As duas escolhas do painel passam a ter
            a mesma forma. */}
        {kind !== "general" && (
          <RadioGroup
            label="Motivo"
            name="chamada-motivo"
            value={templateId}
            onChange={(value) => {
              setTemplateId(value);
              setTextoEditado(null);
            }}
            options={CALL_TEMPLATES.filter((item) => item.kind === kind).map((item) => ({
              value: item.id,
              label: item.label,
            }))}
          />
        )}

        {/* --------------------------------------------------- mensagem */}
        <div>
          <Label htmlFor={kind === "general" ? "chamada-texto-geral" : undefined}>Mensagem</Label>

          {/* A caixa de texto é o campo, e não a recompensa de clicar em
              "Editar mensagem".

              Era `inside_card/1` com o texto entre aspas e um botão ao lado. O
              cartão aninhado é para dado que veio de outro lugar e não se
              muda — o nome que a agenda resolveu —, e esta frase é justamente a
              que a pessoa mais quer conferir e ajustar antes de a caixa falar em
              voz alta. Escondê-la atrás de um clique punha uma porta na frente
              do campo mais importante do painel.

              O texto continua sendo gerado pelo modelo e recalculado quando a
              criança ou o motivo mudam: `textoEditado` só existe depois que
              alguém digita, e volta a `null` a cada troca acima. */}
          {kind === "general" ? (
            <Textarea
              id="chamada-texto-geral"
              rows={3}
              value={textoGeral}
              onChange={(event) => setTextoGeral(event.target.value)}
              placeholder="Escreva o anúncio que será convertido em voz."
              className="mt-2"
            />
          ) : (
            <Textarea
              id="chamada-texto"
              aria-label="Texto do anúncio"
              rows={3}
              value={composta}
              onChange={(event) => setTextoEditado(event.target.value)}
              placeholder="Escolha a criança para gerar a mensagem."
              className="mt-2"
            />
          )}

          {/* O impedimento aparece junto da mensagem também, porque é ali que a
              pessoa está olhando quando ele acontece — e no botão, para quem
              chega por teclado. */}
          {!bloqueio.allowed && (
            <p className="m-0 mt-2 text-sm font-bold text-[var(--color-red-dark)]">
              {bloqueio.reason}
            </p>
          )}
        </div>

        {/* ----------------------------------------------- onde anunciar */}
        <div>
          {alcance.length === 0 ? (
            <>
              <Label>Onde anunciar</Label>
              <div className="mt-2">
                <InsideCard
                  icon="fa-plug-circle-xmark"
                  title={`Nenhum dispositivo em ${data.unit}`}
                  subtitle="Cadastre uma caixa para este público na aba Dispositivos antes de usar este tipo de chamada."
                />
              </div>
            </>
          ) : (
            /* `checkgroup/1`, a escolha múltipla do sistema, sempre à vista.

               Era um `inside_card/1` com os nomes somados — "Recepção + Sala de
               espera das famílias" — e um botão "Alterar" que revelava este
               mesmo componente. Três problemas de uma vez: o resumo não dizia o
               que **não** estava marcado, o botão escondia a única decisão de
               alcance do painel, e uma caixa offline só aparecia depois de
               alguém desconfiar e clicar.

               Com o grupo aberto, marcado e desmarcado ficam na mesma lista, o
               volume e o público de cada caixa aparecem no rótulo, e a caixa
               fora do ar chega desabilitada com a palavra "offline". O padrão
               continua sendo tudo que está online — `escolhaDeDispositivos`
               começa nulo e cai em `automaticos`. */
            <>
              <Checkgroup
                id="chamada-dispositivos"
                label="Onde anunciar"
                name="dispositivos"
                values={escolhidos}
                options={opcoesDeDispositivo}
                onChange={setEscolhaDeDispositivos}
              />
              <p className="m-0 mt-2 text-sm text-[var(--color-brand-purple-dark)]/72">
                Caixas de {AUDIENCE_LABEL[audienceOfKind(kind)].toLowerCase()} em {data.unit}.
              </p>
            </>
          )}
        </div>
      </div>
    </DrawerModal>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Gestão de chamadas"
      subtitle="Os anúncios por voz da unidade — quem chamar, por quê, e onde a caixa fala"
      breadcrumb={[{ label: "Gestão de chamadas" }]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
