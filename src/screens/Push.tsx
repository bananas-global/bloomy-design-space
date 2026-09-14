import "./Push.css";
import { useEffect, useRef, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  SurveyExtraQuestion,
  SurveyResponse,
  NpsSurvey,
  SurveyTreatment,
  PushAudience,
  PushData,
  PushDelivery,
  PushFilter,
  PushGuardian,
  PushKind,
  PushMessage,
  PushSegment,
  PushStatus,
  PushTemplate,
  PushValues,
} from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import { ErrorState, LoadingState } from "../components/primitives.js";
import { Button } from "../components/bloomy/Button.js";
import { Card, InfoCard, type InfoCardVariant } from "../components/bloomy/Card.js";
import { EmptyStateCard, InsideCard, Progress, SectionHeader } from "../components/bloomy/Layout.js";
import { Input, Select, SwitchCard, Textarea } from "../components/bloomy/Input.js";
import { DrawerModal } from "../components/bloomy/Overlay.js";
import { Table, type Coluna } from "../components/bloomy/Table.js";
import { ButtonTabs } from "../components/bloomy/Tabs.js";
import { Tag, type TagVariant } from "../components/bloomy/Tag.js";
import { PUSH_DOCUMENTS } from "../fixtures/push.js";
import {
  PUSH_VARIABLES,
  NPS_BANDS,
  audienceLabel,
  canResend,
  canSend,
  canSendSurvey,
  deliveryStats,
  feedOrder,
  messageOrder,
  missingValues,
  npsBand,
  npsByUnit,
  npsScore,
  npsZone,
  openDetractors,
  renderMessage,
  resendTargets,
  resolveAudience,
  responseRate,
  stampNow,
  unreachable,
  type Decision,
} from "../rules/push.js";

/**
 * Central de PUSH.
 *
 * Porte de "Bloomy — Central de PUSH" do projeto de design. A área é
 * **proposta**: o monólito notifica para dentro — quatro remetentes, todos
 * internos — e não tem nada que fale com o aplicativo da família. O que existe
 * hoje é o WhatsApp da recepção, e é dele que vem a lacuna que esta tela
 * resolve: lá, entrega e leitura são o mesmo tique.
 *
 * **A tela usa os componentes do sistema, não peças próprias.** `button/1`,
 * `button_tabs/1`, `card/1`, `info_card/1`, `inside_card/1`, `empty_state_card/1`,
 * `input/1`, `textarea/1`, `select/1`, `switch/1`, `switch_card/1`, `table/1`,
 * `tag/1`, `progress/1` e `drawer_modal/1`. Três peças do desenho não têm
 * espelho e estão nomeadas onde aparecem: a pílula de recorte de público, a
 * barra de composição do NPS e as colunas de evolução — as três são
 * visualização de dado, e nenhuma existe no `core_components.ex`.
 *
 * Quatro coisas mudaram do desenho, e as quatro são obrigação deste repositório:
 *
 * 1. **O relógio é declarado.** O desenho carimba envio com `new Date()` e
 *    semeia entregas com um PRNG. Aqui a hora sai de `data.now` e as entregas
 *    são escritas na fixture, porque `pnpm test` roda a qualquer hora e uma taxa
 *    de visualização que muda sozinha não tem critério de aceite.
 *
 * 2. **Ação bloqueada continua alcançável.** Ver `AcaoBloqueavel` abaixo.
 *
 * 3. **A faixa do NPS tem palavra**, e não só a cor da barra. Ver a regra
 *    `the-nps-band-is-said-in-words`.
 *
 * 4. **A prévia no telefone saiu.** O desenho tem um aparelho desenhado ao lado
 *    do composer, e ele é bonito: mostra a notificação, o cartão no app e o
 *    botão de ciência. Mas o que ele prova — o texto renderizado com os dados de
 *    uma família de verdade — passou a ser dito no próprio campo, com a frase
 *    montada logo abaixo da caixa de texto. O aparelho ficaria certo numa tela
 *    de 1440px e empurraria o formulário para 300px no telefone, que é a largura
 *    em que a recepção realmente abre isto.
 *
 * O que **não** mudou é a ordem do painel: texto, público, entrega. É a decisão
 * de UX do desenho, e é ela que deixa o comunicado sair em três cliques quando
 * o modelo já resolve o texto.
 */

/* =========================================================== vocabulário */

const KIND_META: Record<
  PushKind,
  { label: string; short: string; icon: string; tag: TagVariant; card: InfoCardVariant; desc: string }
> = {
  operational: {
    label: "Aviso operacional",
    short: "Operacional",
    icon: "fa-triangle-exclamation",
    tag: "orange",
    card: "orange",
    desc: "Feriado, obra, chuva, mudança de horário da unidade.",
  },
  reminder: {
    label: "Lembrete de agendamento",
    short: "Lembrete",
    icon: "fa-calendar-day",
    tag: "light-blue",
    card: "blue",
    desc: "Confirmação e antecedência do próximo atendimento.",
  },
  document: {
    label: "Cobrança de documento",
    short: "Documento",
    icon: "fa-file-circle-exclamation",
    tag: "red",
    card: "accent",
    desc: "Pendência de laudo, autorização, guia ou carteirinha.",
  },
  campaign: {
    label: "Campanha ou evento",
    short: "Campanha",
    icon: "fa-bullhorn",
    /* `purple` e não `light-purple`: a variante clara do `tag/1` é
       `--color-purple` sobre `--color-purple-light`, 4,2:1, e reprova AA em
       14px. A cheia é branco sobre o mesmo roxo, 4,89:1. */
    tag: "purple",
    card: "info",
    desc: "Palestra, grupo de pais, comunicado institucional.",
  },
  individual: {
    label: "Mensagem individual",
    short: "Individual",
    icon: "fa-user",
    tag: "green",
    card: "green",
    desc: "Aviso para um único responsável.",
  },
};

const STATUS_META: Record<PushStatus, { label: string; tag: TagVariant; icon: string }> = {
  scheduled: { label: "Agendado", tag: "orange", icon: "fa-clock" },
  sent: { label: "Enviado", tag: "green", icon: "fa-check" },
  cancelled: { label: "Cancelado", tag: "brand", icon: "fa-ban" },
};

const TREAT_META: Record<SurveyTreatment, { label: string; tag: TagVariant; icon: string }> = {
  pending: { label: "Sem tratativa", tag: "red", icon: "fa-circle-exclamation" },
  contact: { label: "Em contato", tag: "orange", icon: "fa-phone" },
  resolved: { label: "Tratativa concluída", tag: "green", icon: "fa-check-double" },
};

/**
 * A moldura dos cartões de lista.
 *
 * Branco com contorno a 10% do texto, sem sombra — a mesma decisão da gestão de
 * chamadas: `card/1` traz `shadow-main`, que é a sombra de quem flutua sobre o
 * fundo da página, e estes estão dentro do cartão branco da área. Sombra sobre
 * branco vira sujeira cinza em volta de cada item de uma lista de sete.
 */
const CARTAO_DE_LISTA =
  "rounded-2xl border border-[var(--color-brand-purple-dark)]/10 bg-white p-4 sm:p-5";

/**
 * O par de cores da ação indisponível.
 *
 * `rgba(43,35,91,0.72)` sobre `#f4f6f7`, 5,56:1, declarado em
 * `src/tokens/contrast.ts`. Não é `opacity`: o controle continua na ordem de
 * foco, então a isenção da WCAG 1.4.3 para componente inativo não vale — ele
 * precisa passar por mérito.
 */
const ACAO_BLOQUEADA =
  "cursor-not-allowed bg-[#f4f6f7] text-[rgba(43,35,91,0.72)] hover:bg-[#f4f6f7]";

/**
 * A marca de espelho, e o que ela custa.
 *
 * O azul do `button/1` — branco sobre `--color-brand-blue` — dá 2,22:1, e o
 * rótulo azul do `input/1` sobre branco dá o mesmo. Os dois reprovam AA e os
 * dois são o produto: o azul de marca fazendo trabalho de hierarquia, decidido
 * lá e copiado aqui de propósito. É o mesmo caso do verde do cabeçalho, achado
 * 99, e do amarelo do `button/1`, achado 101.
 *
 * `espelho-do-sistema` é como este repositório trata isso: a varredura de axe
 * exclui a subárvore, e `tests/e2e/contraste.spec.ts` prende os números medidos
 * para que a exclusão não vire esquecimento. A conta que a marca cobra está na
 * decisão 0018 — o campo marcado sai inteiro da varredura, rótulo e controle
 * junto. Por isso `tests/e2e/active-journey.spec.ts` roda, nesta área, uma
 * segunda passagem de axe **sem** a exclusão e com `color-contrast` desligado:
 * o que a marca esconde é a cor do produto, e não a semântica da tela.
 */
const ESPELHO = "espelho-do-sistema";

const SECAO = "text-xs font-black uppercase tracking-wider text-[var(--color-brand-purple-dark)]/72";
const MINI = "text-sm text-[rgba(43,35,91,0.72)]";

type Aba = "msgs" | "nps" | "lib";

const ABAS: { id: Aba; label: string; icon: string }[] = [
  { id: "msgs", label: "Comunicados", icon: "fa-paper-plane" },
  { id: "nps", label: "NPS", icon: "fa-face-smile" },
  { id: "lib", label: "Modelos e segmentos", icon: "fa-layer-group" },
];

const PUBLICO_VAZIO: PushFilter = { units: [], shifts: [], insurers: [], professionals: [] };

type RascunhoDePesquisa = {
  name: string;
  question: string;
  commentLabel: string;
  commentRequired: boolean;
  extras: SurveyExtraQuestion[];
  audience: PushAudience;
  quando: "now" | "sched";
  date: string;
  time: string;
};

type Rascunho = {
  kind: PushKind;
  templateId: string;
  title: string;
  body: string;
  values: PushValues;
  ack: boolean;
  push: boolean;
  audience: PushAudience;
  quando: "now" | "sched";
  date: string;
  time: string;
};

/* ================================================================= tela */

export function Push({ context }: ScreenProps) {
  const { data, isLoading, error } = context;

  const [aba, setAba] = useState<Aba>("msgs");
  const [mensagens, setMensagens] = useState<PushMessage[] | null>(null);
  const [pesquisas, setPesquisas] = useState<NpsSurvey[] | null>(null);
  const [modelos, setModelos] = useState<PushTemplate[] | null>(null);
  const [segmentos, setSegmentos] = useState<PushSegment[] | null>(null);
  const [aviso, setAviso] = useState("");
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [pesquisaAberta, setPesquisaAberta] = useState<string | null>(null);
  const [pesquisaNova, setPesquisaNova] = useState<RascunhoDePesquisa | null>(null);
  const [modeloEmEdicao, setModeloEmEdicao] = useState<PushTemplate | null>(null);
  const [segmentoEmEdicao, setSegmentoEmEdicao] = useState<PushSegment | null>(null);

  if (isLoading) return wrap(context, <LoadingState label="Carregando a Central de PUSH" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const dados = data as PushData | null;
  if (!dados) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const lista = mensagens ?? dados.messages;
  const surveys = pesquisas ?? dados.surveys;
  const templates = modelos ?? dados.templates;
  const segments = segmentos ?? dados.segments;

  const agendados = lista.filter((item) => item.status === "scheduled");
  const enviados = lista.filter((item) => item.status === "sent");
  const ultimaPesquisa = surveys.filter((item) => item.status === "sent").at(-1);

  const aberta = abertoId ? lista.find((item) => item.id === abertoId) : undefined;

  /** Um envio feito aqui: quem tem aplicativo recebe, quem não tem falha. */
  const entregasDe = (pessoas: PushGuardian[]): PushDelivery[] =>
    pessoas.map((pessoa) =>
      pessoa.appInstalled
        ? { guardianId: pessoa.id, status: "delivered" as const }
        : { guardianId: pessoa.id, status: "failed" as const, reason: "App não instalado" },
    );

  const enviar = (draft: Rascunho) => {
    const pessoas = resolveAudience(dados.guardians, draft.audience, segments);
    const agendado = draft.quando === "sched";
    const novo: PushMessage = {
      id: `m-${draft.kind}-${lista.length + 1}`,
      kind: draft.kind,
      templateId: draft.templateId || undefined,
      title: draft.title,
      body: draft.body,
      values: draft.values,
      ack: draft.ack,
      push: draft.push,
      audience: draft.audience,
      by: dados.author,
      at: agendado ? `${draft.date} ${draft.time}` : stampNow(dados),
      status: agendado ? "scheduled" : "sent",
      deliveries: agendado ? [] : entregasDe(pessoas),
    };

    setMensagens([novo, ...lista]);
    setRascunho(null);
    setAviso(
      agendado
        ? `Comunicado agendado para ${novo.at}. O público será recalculado no disparo.`
        : `Comunicado enviado para ${pessoas.length} ${pessoas.length === 1 ? "responsável" : "responsáveis"}.`,
    );
  }

  const trocarMensagem = (id: string, mudanca: (item: PushMessage) => PushMessage) => {
    setMensagens(lista.map((item) => (item.id === id ? mudanca(item) : item)));
  }

  const cancelarAgendamento = (message: PushMessage) => {
    trocarMensagem(message.id, (item) => ({ ...item, status: "cancelled" }));
    setAbertoId(null);
    setAviso("Agendamento cancelado. O comunicado não será disparado.");
  }

  const dispararAgora = (message: PushMessage) => {
    const pessoas = resolveAudience(dados.guardians, message.audience, segments);
    trocarMensagem(message.id, (item) => ({
      ...item,
      status: "sent",
      at: stampNow(dados),
      deliveries: entregasDe(pessoas),
    }));
    setAviso(
      `Comunicado enviado para ${pessoas.length} ${pessoas.length === 1 ? "responsável" : "responsáveis"}.`,
    );
  }

  const reenviar = (message: PushMessage, only: "unviewed" | "unacked") => {
    const alvos = new Set(resendTargets(message, only));
    trocarMensagem(message.id, (item) => ({
      ...item,
      resends: (item.resends ?? 0) + 1,
      lastResendAt: stampNow(dados),
      deliveries: item.deliveries.map((entrega) =>
        alvos.has(entrega.guardianId) ? { ...entrega, resentAt: dados.now } : entrega,
      ),
    }));
    setAviso(
      only === "unviewed"
        ? `Reenviado para ${alvos.size} ${alvos.size === 1 ? "responsável que ainda não visualizou" : "responsáveis que ainda não visualizaram"}.`
        : `Ciência cobrada de ${alvos.size} ${alvos.size === 1 ? "responsável" : "responsáveis"} que visualizaram e não confirmaram.`,
    );
  }

  const registrarTratativa = (
    surveyId: string,
    responseId: string,
    treatment: SurveyTreatment,
    note: string,
  ) => {
    const pesquisa = surveys.find((item) => item.id === surveyId);
    const resposta = pesquisa?.responses.find((item) => item.id === responseId);
    const pessoa = dados.guardians.find((item) => item.id === resposta?.guardianId);

    setPesquisas(
      surveys.map((item) =>
        item.id !== surveyId
          ? item
          : {
              ...item,
              responses: item.responses.map((linha) =>
                linha.id === responseId
                  ? {
                      ...linha,
                      treatment,
                      treatmentNote: note || linha.treatmentNote,
                      treatmentBy: dados.author,
                    }
                  : linha,
              ),
            },
      ),
    );

    setAviso(
      treatment === "resolved"
        ? `Tratativa de ${pessoa?.name ?? "responsável"} concluída. A resposta sai da fila de detratores.`
        : `Contato assumido com ${pessoa?.name ?? "responsável"}. A resposta continua na fila até a tratativa ser concluída.`,
    );
  }

  const enviarPesquisa = (draft: RascunhoDePesquisa) => {
    const pessoas = resolveAudience(dados.guardians, draft.audience, segments);
    const agendada = draft.quando === "sched";
    const nova: NpsSurvey = {
      id: `n-${surveys.length + 1}`,
      name: draft.name,
      question: draft.question,
      commentLabel: draft.commentLabel,
      commentRequired: draft.commentRequired,
      extras: draft.extras,
      audience: draft.audience,
      // Aqui a lista **é** congelada, e é a diferença entre pesquisa e
      // comunicado: a resposta pertence a quem recebeu o convite. Recalcular o
      // público depois mudaria o denominador da taxa de resposta de uma
      // pesquisa que já está no ar.
      recipients: pessoas.map((pessoa) => pessoa.id),
      responses: [],
      status: agendada ? "scheduled" : "sent",
      at: agendada ? `${draft.date} ${draft.time}` : stampNow(dados),
      by: dados.author,
    };

    setPesquisas([...surveys, nova]);
    setPesquisaNova(null);
    if (!agendada) setPesquisaAberta(nova.id);
    setAviso(
      agendada
        ? `Pesquisa agendada para ${nova.at}.`
        : `Pesquisa enviada para ${pessoas.length} ${pessoas.length === 1 ? "responsável" : "responsáveis"}. A leitura começa vazia até a primeira resposta.`,
    );
  };

  const usarModelo = (template: PushTemplate) => {
    setAba("msgs");
    setRascunho(rascunhoInicial(template, dados.today));
  }

  return wrap(
    context,
    <div className="space-y-4">
      <Card className="space-y-6">
        <ButtonTabs
          id="push-abas"
          label="Central de PUSH"
          tabs={ABAS.map((item) => ({
            id: item.id,
            label: item.label,
            icon: item.icon,
          }))}
          value={aba}
          onChange={setAba}
          header={
            <SectionHeader
              variant="default"
              subtitle="Avisos e pesquisas disparados no aplicativo dos responsáveis. Mão única: a família lê, visualiza e dá ciência — não responde."
            >
              Central de PUSH
            </SectionHeader>
          }
          actions={
            aba === "msgs" ? (
              <Botao
                className="w-52 shrink-0"
                leftIcon="fa-plus"
                onClick={() => setRascunho(rascunhoInicial(templates[0], dados.today))}
              >
                Novo comunicado
              </Botao>
            ) : aba === "nps" ? (
              <Botao
                className="w-52 shrink-0"
                leftIcon="fa-plus"
                onClick={() => setPesquisaNova(pesquisaInicial(dados.today))}
              >
                Nova pesquisa
              </Botao>
            ) : (
              <NovoNaBiblioteca
                onModelo={() => setModeloEmEdicao({
                  id: `modelo-${templates.length + 1}`, kind: "operational",
                  label: "", title: "", body: "", ack: false,
                })}
                onSegmento={() => setSegmentoEmEdicao({
                  id: `segmento-${segments.length + 1}`, name: "",
                  description: "", filter: PUBLICO_VAZIO,
                })}
              />
            )
          }
        >
          {/* A região viva da tela. Fica sempre montada — uma região que só
              aparece depois da ação não é anunciada por leitor de tela nenhum,
              porque ela chega junto com o texto. */}
          <p
            role="status"
            aria-live="polite"
            className="sr-only"
          >
            {aviso}
          </p>

          {aba === "msgs" && (
            <AbaComunicados
              dados={dados}
              mensagens={lista}
              segmentos={segments}
              agendados={agendados.length}
              enviados={enviados}
              onAbrir={setAbertoId}
            />
          )}

          {aba === "nps" && (
            <AbaNps
              dados={dados}
              pesquisas={surveys}
              escolhida={pesquisaAberta ?? ultimaPesquisa?.id ?? ""}
              onEscolher={setPesquisaAberta}
              onTratativa={registrarTratativa}
              onNovaPesquisa={() => setPesquisaNova(pesquisaInicial(dados.today))}
            />
          )}

          {aba === "lib" && (
            <AbaBiblioteca
              dados={dados}
              modelos={templates}
              segmentos={segments}
              onUsar={usarModelo}
              onEditarModelo={setModeloEmEdicao}
              onExcluirModelo={(template) => {
                setModelos(templates.filter((item) => item.id !== template.id));
                setAviso(`Modelo “${template.label}” removido.`);
              }}
              onEditarSegmento={setSegmentoEmEdicao}
              onExcluirSegmento={(segmento) => {
                setSegmentos(segments.filter((item) => item.id !== segmento.id));
                setAviso(`Segmento “${segmento.name}” removido.`);
              }}
            />
          )}
        </ButtonTabs>
      </Card>

      {aberta && (
        <GavetaDoComunicado
          dados={dados}
          message={aberta}
          segmentos={segments}
          onFechar={() => setAbertoId(null)}
          onCancelar={cancelarAgendamento}
          onDispararAgora={dispararAgora}
          onReenviar={reenviar}
        />
      )}

      {rascunho && (
        <GavetaDeComposicao
          dados={dados}
          modelos={templates}
          segmentos={segments}
          rascunho={rascunho}
          onMudar={setRascunho}
          onFechar={() => setRascunho(null)}
          onEnviar={enviar}
        />
      )}

      {pesquisaNova && (
        <GavetaDePesquisa
          dados={dados}
          segmentos={segments}
          rascunho={pesquisaNova}
          onMudar={setPesquisaNova}
          onFechar={() => setPesquisaNova(null)}
          onEnviar={enviarPesquisa}
        />
      )}

      {modeloEmEdicao && (
        <GavetaDeModelo
          modelo={modeloEmEdicao}
          onFechar={() => setModeloEmEdicao(null)}
          onSalvar={(template) => {
            const existe = templates.some((item) => item.id === template.id);
            setModelos(
              existe
                ? templates.map((item) => (item.id === template.id ? template : item))
                : [...templates, template],
            );
            setModeloEmEdicao(null);
            setAviso(`Modelo “${template.label}” salvo.`);
          }}
        />
      )}

      {segmentoEmEdicao && (
        <GavetaDeSegmento
          dados={dados}
          segmento={segmentoEmEdicao}
          onFechar={() => setSegmentoEmEdicao(null)}
          onSalvar={(segmento) => {
            const existe = segments.some((item) => item.id === segmento.id);
            setSegmentos(
              existe
                ? segments.map((item) => (item.id === segmento.id ? segmento : item))
                : [...segments, segmento],
            );
            setSegmentoEmEdicao(null);
            setAviso(`Segmento “${segmento.name}” salvo.`);
          }}
        />
      )}
    </div>,
  );
}

/* ================================================== aba dos comunicados */

function AbaComunicados({
  dados,
  mensagens,
  segmentos,
  agendados,
  enviados,
  onAbrir,
}: {
  dados: PushData;
  mensagens: PushMessage[];
  segmentos: PushSegment[];
  agendados: number;
  enviados: PushMessage[];
  onAbrir: (id: string) => void;
}) {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");

  const totais = enviados.reduce(
    (soma, message) => {
      const stats = deliveryStats(message);
      return {
        entregas: soma.entregas + stats.total,
        vistos: soma.vistos + stats.viewed,
        cienciaPedida: soma.cienciaPedida + (message.ack ? stats.total : 0),
        ciencia: soma.ciencia + stats.acked,
      };
    },
    { entregas: 0, vistos: 0, cienciaPedida: 0, ciencia: 0 },
  );

  const taxaVisualizacao =
    totais.entregas === 0 ? 0 : Math.round((totais.vistos / totais.entregas) * 100);
  const taxaCiencia =
    totais.cienciaPedida === 0 ? 0 : Math.round((totais.ciencia / totais.cienciaPedida) * 100);
  const proximo = messageOrder(mensagens).find((item) => item.status === "scheduled");

  const filtradas = messageOrder(mensagens).filter((message) => {
    if (tipo && message.kind !== tipo) return false;
    if (estado && message.status !== estado) return false;
    if (busca) {
      const palheiro = `${message.title} ${message.body} ${message.by}`.toLowerCase();
      if (!palheiro.includes(busca.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* `info_card/1`, os quatro números da área. O rodapé de cada um diz de
          onde o número saiu: uma taxa sem denominador é um número que ninguém
          consegue conferir. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <NumeroDoTopo
          icon="fa-paper-plane"
          variant="blue"
          info={String(enviados.length)}
          title="comunicados enviados"
          hint="no período carregado"
        />
        <NumeroDoTopo
          icon="fa-eye"
          variant="accent"
          info={`${taxaVisualizacao}%`}
          title="taxa de visualização"
          hint={`${totais.vistos} de ${totais.entregas} entregas`}
        />
        <NumeroDoTopo
          icon="fa-hand"
          // `info` e não `green`: o verde de `info_card/1` é
          // `--color-brand-green-dark` sobre branco, 2,83:1, e reprova AA até
          // como texto grande. A cor aqui não carrega informação que o rótulo
          // não diga, então trocar de família custa nada e o número fica legível.
          variant="info"
          info={`${taxaCiencia}%`}
          title="ciência confirmada"
          hint={`${totais.ciencia} de ${totais.cienciaPedida} onde a ciência foi pedida`}
        />
        <NumeroDoTopo
          icon="fa-clock"
          variant="orange"
          info={String(agendados)}
          title="agendados"
          hint={proximo ? `próximo em ${proximo.at}` : "nada na fila"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Input
          className={ESPELHO}
          id="push-busca"
          label="Buscar"
          placeholder="Título, texto ou autor"
          leftIcon="fa-magnifying-glass"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
        <Select
          className={ESPELHO}
          id="push-tipo"
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
          className={ESPELHO}
          id="push-estado"
          label="Estado"
          prompt="Todos os estados"
          value={estado}
          onChange={setEstado}
          options={Object.entries(STATUS_META).map(([value, meta]) => ({
            value,
            label: meta.label,
          }))}
        />
      </div>

      {filtradas.length === 0 ? (
        <EmptyStateCard icon="fa-magnifying-glass" text="Nenhum comunicado neste recorte">
          <p className="m-0">
            Ajuste a busca, o tipo ou o estado. A Central continua com {mensagens.length} comunicados
            registrados.
          </p>
        </EmptyStateCard>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {filtradas.map((message) => (
            <li key={message.id}>
              <CartaoDeComunicado
                dados={dados}
                message={message}
                segmentos={segmentos}
                onAbrir={() => onAbrir(message.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NumeroDoTopo({
  icon,
  variant,
  info,
  title,
  hint,
}: {
  icon: string;
  variant: InfoCardVariant;
  info: string;
  title: string;
  hint: string;
}) {
  return (
    <div className={CARTAO_DE_LISTA}>
      <InfoCard icon={icon} variant={variant} info={info} title={title} />
      <p className="m-0 mt-2 text-xs text-[rgba(43,35,91,0.72)]">{hint}</p>
    </div>
  );
}

/**
 * O cartão de um comunicado.
 *
 * **O título é o botão.** No desenho o cartão inteiro é clicável e não há
 * controle nenhum dentro dele — o que funciona com o mouse e desaparece no
 * teclado. Aqui quem abre é o título: é o nome do destino, é o que o leitor de
 * tela anuncia, e o cartão em volta continua clicável para quem usa o ponteiro.
 */
function CartaoDeComunicado({
  dados,
  message,
  segmentos,
  onAbrir,
}: {
  dados: PushData;
  message: PushMessage;
  segmentos: PushSegment[];
  onAbrir: () => void;
}) {
  const kind = KIND_META[message.kind];
  const status = STATUS_META[message.status];
  const stats = deliveryStats(message);
  const pessoas = resolveAudience(dados.guardians, message.audience, segmentos);
  const exemplo = pessoas[0];
  const enviado = message.status === "sent";

  return (
    <article
      className={`${CARTAO_DE_LISTA} flex flex-col gap-4 lg:flex-row lg:items-start`}
      onClick={(evento) => {
        if (evento.target instanceof Element && evento.target.closest("button,a")) return;
        onAbrir();
      }}
    >
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-purple-dark)]/5 text-lg text-[var(--color-brand-purple-dark)]"
      >
        <Icon name={kind.icon} type="solid" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 text-base font-extrabold text-[var(--color-brand-purple-dark)]">
            <button
              type="button"
              onClick={onAbrir}
              className="rounded text-left underline-offset-4 hover:underline"
            >
              {renderMessage(message.title, exemplo, message.values)}
            </button>
          </h2>
          <Tag item={kind.short} variant={kind.tag} icon={kind.icon} />
          <Tag item={status.label} variant={status.tag} icon={status.icon} />
          {message.ack && <Tag item="Pede ciência" variant="brand" icon="fa-hand" />}
          {!message.push && <Tag item="Sem notificação" variant="brand" icon="fa-bell-slash" />}
        </div>

        <p className="m-0 mt-1 line-clamp-2 max-w-[76ch] text-sm text-[rgba(43,35,91,0.72)]">
          {renderMessage(message.body, exemplo, message.values)}
        </p>

        <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-[rgba(43,35,91,0.72)]">
          <li>
            <Icon name="fa-users" /> {pessoas.length}{" "}
            {pessoas.length === 1 ? "responsável" : "responsáveis"}
          </li>
          <li>
            <Icon name="fa-filter" /> {audienceLabel(message.audience, segmentos)}
          </li>
          <li>
            <Icon name="fa-user-tie" /> {message.by}
          </li>
          <li>
            <Icon name="fa-clock" />{" "}
            {message.status === "scheduled" ? `dispara em ${message.at}` : message.at}
          </li>
        </ul>
      </div>

      <div className="w-full shrink-0 space-y-3 lg:w-64">
        {enviado ? (
          <>
            <Medidor
              label="visualizado"
              value={stats.percent(stats.viewed)}
              detail={`${stats.viewed} de ${stats.total}`}
            />
            {message.ack && (
              <Medidor
                label="deram ciência"
                value={stats.percent(stats.acked)}
                variant="green"
                detail={`${stats.acked} de ${stats.total}`}
              />
            )}
            {stats.failed > 0 && (
              <p className="m-0 text-xs font-bold text-[var(--color-red-dark)]">
                <Icon name="fa-triangle-exclamation" /> {stats.failed}{" "}
                {stats.failed === 1 ? "não recebeu" : "não receberam"}
              </p>
            )}
          </>
        ) : (
          <p className={`m-0 ${MINI}`}>
            {message.status === "scheduled"
              ? "Aguardando disparo. O público é recalculado na hora do envio."
              : "Cancelado antes do disparo."}
          </p>
        )}
      </div>
    </article>
  );
}

/** `progress/1` com o rótulo por extenso — a barra sozinha não é lida. */
function Medidor({
  label,
  value,
  detail,
  variant = "default",
}: {
  label: string;
  value: number;
  detail: string;
  variant?: "default" | "green";
}) {
  return (
    <div>
      <p className="m-0 text-xs font-bold uppercase tracking-wide text-[rgba(43,35,91,0.72)]">
        {value}% {label} <span className="font-normal normal-case">· {detail}</span>
      </p>
      <Progress value={value} variant={variant} showPercentage={false} className="mt-1" />
    </div>
  );
}

/* ======================================================= gaveta do detalhe */

type FiltroDeEntrega = "all" | "unviewed" | "unacked" | "failed";

const FILTROS: { id: FiltroDeEntrega; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "unviewed", label: "Não visualizaram" },
  { id: "unacked", label: "Sem ciência" },
  { id: "failed", label: "Não entregues" },
];

function GavetaDoComunicado({
  dados,
  message,
  segmentos,
  onFechar,
  onCancelar,
  onDispararAgora,
  onReenviar,
}: {
  dados: PushData;
  message: PushMessage;
  segmentos: PushSegment[];
  onFechar: () => void;
  onCancelar: (message: PushMessage) => void;
  onDispararAgora: (message: PushMessage) => void;
  onReenviar: (message: PushMessage, only: "unviewed" | "unacked") => void;
}) {
  const [filtro, setFiltro] = useState<FiltroDeEntrega>("all");
  const kind = KIND_META[message.kind];
  const status = STATUS_META[message.status];
  const stats = deliveryStats(message);
  const pessoas = resolveAudience(dados.guardians, message.audience, segmentos);
  const exemplo = pessoas[0];
  const porId = new Map(dados.guardians.map((pessoa) => [pessoa.id, pessoa]));

  const linhas = message.deliveries
    .map((entrega) => ({ entrega, pessoa: porId.get(entrega.guardianId) }))
    .filter((linha): linha is { entrega: PushDelivery; pessoa: PushGuardian } =>
      Boolean(linha.pessoa),
    )
    .filter(({ entrega }) => {
      if (filtro === "unviewed") return entrega.status === "delivered" && !entrega.viewedAt;
      if (filtro === "unacked") return entrega.status === "delivered" && !entrega.ackAt;
      if (filtro === "failed") return entrega.status === "failed";
      return true;
    });

  const naoVisto = canResend(message, "unviewed");
  const semCiencia = canResend(message, "unacked");

  const colunas: Coluna<{ entrega: PushDelivery; pessoa: PushGuardian }>[] = [
    {
      label: "Responsável",
      render: ({ pessoa }) => (
        <div>
          <p className="m-0 font-bold text-[var(--color-brand-purple-dark)]">{pessoa.name}</p>
          <p className="m-0 text-xs text-[rgba(43,35,91,0.72)]">
            {pessoa.patient} · {pessoa.insurer}
          </p>
        </div>
      ),
    },
    {
      label: "Unidade",
      render: ({ pessoa }) => (
        <div>
          <p className="m-0">{pessoa.unit}</p>
          <p className="m-0 text-xs text-[rgba(43,35,91,0.72)]">turno {pessoa.shift.toLowerCase()}</p>
        </div>
      ),
    },
    {
      label: "Entrega",
      render: ({ entrega }) =>
        entrega.status === "delivered" ? (
          <Tag item="Entregue" variant="green" icon="fa-check" />
        ) : (
          <div className="space-y-1">
            <Tag item="Falhou" variant="red" icon="fa-triangle-exclamation" />
            {entrega.reason && (
              <p className="m-0 text-xs text-[rgba(43,35,91,0.72)]">{entrega.reason}</p>
            )}
          </div>
        ),
    },
    {
      label: "Visualizado",
      render: ({ entrega }) => (
        <div>
          <p className="m-0">{entrega.viewedAt ?? "—"}</p>
          {entrega.resentAt && (
            <p className="m-0 text-xs text-[rgba(43,35,91,0.72)]">reenviado {entrega.resentAt}</p>
          )}
        </div>
      ),
    },
    {
      label: "Ciência",
      render: ({ entrega }) => {
        if (!message.ack) return <span className={MINI}>não pedida</span>;
        // Entrega que falhou não tem ciência pendente: não há o que cobrar de
        // quem não recebeu. "Pendente" aqui poria essa família na mesma lista
        // de quem viu e não confirmou, que é o oposto do que fazer com ela.
        if (entrega.status === "failed") return <span className={MINI}>—</span>;
        return entrega.ackAt ? (
          <Tag item={entrega.ackAt} variant="green" icon="fa-hand" />
        ) : (
          <span className={MINI}>pendente</span>
        );
      },
    },
  ];

  return (
    <DrawerModal
      id="push-detalhe"
      show
      onCancel={onFechar}
      title={renderMessage(message.title, exemplo, message.values)}
      variant="custom"
      customSize="min-w-[min(64rem,100vw)] max-w-[min(64rem,100vw)]"
      footer={
        <div className="flex flex-wrap items-start justify-end gap-3">
          {message.status === "scheduled" && (
            <>
              <Botao variant="outline" color="red" onClick={() => onCancelar(message)}>
                Cancelar agendamento
              </Botao>
              <Botao leftIcon="fa-paper-plane" onClick={() => onDispararAgora(message)}>
                Enviar agora
              </Botao>
            </>
          )}
          {message.status === "sent" && (
            <>
              <AcaoBloqueavel
                id="push-reenviar"
                decision={naoVisto}
                onClick={() => onReenviar(message, "unviewed")}
                variant="outline"
                leftIcon="fa-rotate-right"
              >
                Reenviar a quem não viu ({resendTargets(message, "unviewed").length})
              </AcaoBloqueavel>
              <AcaoBloqueavel
                id="push-cobrar-ciencia"
                decision={semCiencia}
                onClick={() => onReenviar(message, "unacked")}
                variant="tint"
                leftIcon="fa-hand"
              >
                Cobrar ciência ({resendTargets(message, "unacked").length})
              </AcaoBloqueavel>
            </>
          )}
          <Botao variant="ghost" onClick={onFechar}>
            Fechar
          </Botao>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Tag item={kind.label} variant={kind.tag} icon={kind.icon} />
          <Tag item={status.label} variant={status.tag} icon={status.icon} />
          {message.ack && <Tag item="Ciência pedida" variant="brand" icon="fa-hand" />}
          {!message.push && <Tag item="Sem notificação" variant="brand" icon="fa-bell-slash" />}
        </div>

        <div className="rounded-2xl bg-[var(--color-brand-purple-dark)]/5 p-4">
          <h2 className="m-0 text-base font-extrabold text-[var(--color-brand-purple-dark)]">
            {renderMessage(message.title, exemplo, message.values)}
          </h2>
          <p className="m-0 mt-1 max-w-[70ch] text-sm text-[rgba(43,35,91,0.72)]">
            {renderMessage(message.body, exemplo, message.values)}
          </p>
          {exemplo && (
            <p className={`m-0 mt-3 text-xs ${MINI}`}>
              Prévia com os dados de {exemplo.name}. Cada responsável recebe o texto com o próprio
              nome e o da criança.
            </p>
          )}
        </div>

        <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-1 p-0 text-sm text-[rgba(43,35,91,0.72)]">
          <li>
            <Icon name="fa-filter" /> {audienceLabel(message.audience, segmentos)}
          </li>
          <li>
            <Icon name="fa-user-tie" /> {message.by}
          </li>
          <li>
            <Icon name="fa-clock" />{" "}
            {message.status === "scheduled" ? `dispara em ${message.at}` : message.at}
          </li>
          {message.lastResendAt && (
            <li>
              <Icon name="fa-rotate-right" /> reenviado em {message.lastResendAt}
            </li>
          )}
        </ul>

        {message.status === "sent" ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InsideCard icon="fa-paper-plane" title="Enviados" value={String(stats.total)} />
            <InsideCard
              icon="fa-mobile-screen"
              title="Entregues"
              subtitle="chegaram ao aplicativo"
              value={String(stats.delivered)}
            />
            <InsideCard
              icon="fa-eye"
              title="Visualizados"
              subtitle={`${stats.percent(stats.viewed)}% do total`}
              value={String(stats.viewed)}
            />
            <InsideCard
              icon="fa-hand"
              title={message.ack ? "Deram ciência" : "Ciência não pedida"}
              subtitle={message.ack ? `${stats.percent(stats.acked)}% do total` : undefined}
              value={message.ack ? String(stats.acked) : "—"}
            />
          </div>
        ) : (
          <Aviso tone="orange" icon="fa-clock">
            Este comunicado ainda não foi disparado. O público é a definição, e não uma lista: quem
            entrar em {audienceLabel(message.audience, segmentos)} até {message.at} também recebe.
          </Aviso>
        )}

        {stats.failed > 0 && (
          <Aviso tone="red" icon="fa-triangle-exclamation">
            {stats.failed} {stats.failed === 1 ? "responsável não recebeu" : "responsáveis não receberam"}:
            aplicativo não instalado ou token de notificação expirado. Estes casos precisam de
            contato da recepção — reenviar por aqui falharia de novo.
          </Aviso>
        )}

        {message.deliveries.length > 0 && (
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="m-0 text-base font-extrabold text-[var(--color-brand-purple-dark)]">
                  Responsáveis
                </h2>
                <p className={`m-0 ${MINI}`}>
                  {linhas.length} de {stats.total}
                </p>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar entregas">
                {FILTROS.map((item) => (
                  <Pilula
                    key={item.id}
                    ativa={filtro === item.id}
                    onClick={() => setFiltro(item.id)}
                  >
                    {item.label}
                  </Pilula>
                ))}
              </div>
            </div>

            <div className="mt-3">
              {linhas.length === 0 ? (
                <EmptyStateCard icon="fa-check-double" text="Ninguém neste filtro">
                  <p className="m-0">Todos os responsáveis já estão em dia neste recorte.</p>
                </EmptyStateCard>
              ) : (
                <Table
                  id="push-entregas"
                  rows={linhas}
                  rowId={(linha) => linha.pessoa.id}
                  cols={colunas}
                />
              )}
            </div>
          </section>
        )}
      </div>
    </DrawerModal>
  );
}

/* ==================================================== gaveta de composição */

function rascunhoInicial(template: PushTemplate | undefined, hoje: string): Rascunho {
  return {
    kind: template?.kind ?? "operational",
    templateId: template?.id ?? "",
    title: template?.title ?? "",
    body: template?.body ?? "",
    values: {},
    ack: template?.ack ?? false,
    push: true,
    audience: { mode: "filter", filter: PUBLICO_VAZIO },
    quando: "now",
    date: hoje,
    time: "08:00",
  };
}

type AbaDoPainel = "texto" | "publico" | "entrega";

function GavetaDeComposicao({
  dados,
  modelos,
  segmentos,
  rascunho,
  onMudar,
  onFechar,
  onEnviar,
}: {
  dados: PushData;
  modelos: PushTemplate[];
  segmentos: PushSegment[];
  rascunho: Rascunho;
  onMudar: (rascunho: Rascunho) => void;
  onFechar: () => void;
  onEnviar: (rascunho: Rascunho) => void;
}) {
  const [aba, setAba] = useState<AbaDoPainel>("texto");
  const pessoas = resolveAudience(dados.guardians, rascunho.audience, segmentos);
  const faltando = missingValues(rascunho.title, rascunho.body, rascunho.values);
  const decisao = canSend({ ...rascunho, audienceSize: pessoas.length });
  const usadas = new Set(missingValuesTokens(rascunho));
  const doTipo = modelos.filter((item) => item.kind === rascunho.kind);

  const mudar = (parte: Partial<Rascunho>) => onMudar({ ...rascunho, ...parte });

  function trocarTipo(kind: PushKind) {
    const primeiro = modelos.find((item) => item.kind === kind && item.id !== "texto-livre");
    mudar({
      kind,
      templateId: primeiro?.id ?? "",
      title: primeiro?.title ?? "",
      body: primeiro?.body ?? "",
      ack: primeiro?.ack ?? false,
      audience:
        kind === "individual"
          ? { mode: "manual", ids: [], filter: PUBLICO_VAZIO }
          : rascunho.audience,
    });
  }

  function aplicarModelo(id: string) {
    const modelo = modelos.find((item) => item.id === id);
    mudar({
      templateId: id,
      title: modelo?.title ?? rascunho.title,
      body: modelo?.body ?? rascunho.body,
      ack: modelo ? modelo.ack : rascunho.ack,
    });
  }

  return (
    <DrawerModal
      id="push-composer"
      show
      onCancel={onFechar}
      title="Novo comunicado"
      variant="custom"
      customSize="min-w-[min(48rem,100vw)] max-w-[min(48rem,100vw)]"
      footer={
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Botao variant="ghost" onClick={onFechar}>
            Cancelar
          </Botao>
          <AcaoBloqueavel
            id="push-enviar"
            decision={decisao}
            onClick={() => onEnviar(rascunho)}
            leftIcon={rascunho.quando === "sched" ? "fa-clock" : "fa-paper-plane"}
          >
            {rascunho.quando === "sched"
              ? "Agendar comunicado"
              : `Enviar para ${pessoas.length} ${pessoas.length === 1 ? "responsável" : "responsáveis"}`}
          </AcaoBloqueavel>
        </div>
      }
    >
      <ButtonTabs
        id="push-composer-abas"
        panelClassName="pt-4"
        label="Etapas do comunicado"
        value={aba}
        onChange={setAba}
        tabs={[
          { id: "texto", label: "Texto" },
          { id: "publico", label: "Público" },
          { id: "entrega", label: "Entrega" },
        ]}
      >
        {aba === "texto" && (
          <div className="grid gap-8">
            <fieldset className="m-0 border-0 p-0">
              <legend className={`${SECAO} mb-2`}>Tipo de comunicado</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(KIND_META) as PushKind[]).map((kind) => {
                  const meta = KIND_META[kind];
                  const ativo = rascunho.kind === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => trocarTipo(kind)}
                      className={[
                        "rounded-xl border p-3 text-left transition-colors",
                        ativo
                          ? "border-[var(--color-brand-blue)] bg-[var(--color-brand-blue)]/10"
                          : "border-[var(--color-brand-purple-dark)]/10 bg-white",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-2 text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
                        <Icon name={meta.icon} type="solid" />
                        {meta.label}
                      </span>
                      <span className="mt-1 block text-xs text-[rgba(43,35,91,0.72)]">
                        {meta.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-6">
              <p className={SECAO}>Texto</p>
              <Select
                className={ESPELHO}
                id="push-modelo"
                label="Modelo"
                prompt="Escrever do zero"
                value={rascunho.templateId}
                onChange={aplicarModelo}
                options={doTipo.map((item) => ({ value: item.id, label: item.label }))}
              />
              <Input
                className={ESPELHO}
                id="push-titulo"
                label="Título"
                placeholder="Aparece em negrito na notificação"
                value={rascunho.title}
                onChange={(evento) => mudar({ title: evento.target.value })}
              />
              <Textarea
                className={ESPELHO}
                id="push-texto"
                label="Mensagem"
                rows={5}
                placeholder="Aviso curto, sem resposta. A família lê no aplicativo e, se você pedir, confirma a ciência."
                value={rascunho.body}
                onChange={(evento) => mudar({ body: evento.target.value })}
              />
              <p className={`m-0 ${MINI}`}>
                {rascunho.body.length} caracteres — o aplicativo corta a prévia da notificação em
                duas linhas.
              </p>

              {/* As variáveis. Botão e não etiqueta: elas se inserem no texto,
                  e o desenho já as tratava como controle. */}
              <div>
                <p className={`${SECAO} mb-2`}>Variáveis</p>
                <div className="flex flex-wrap gap-2">
                  {PUSH_VARIABLES.map((variavel) => (
                    <button
                      key={variavel.key}
                      type="button"
                      title={variavel.description}
                      onClick={() => mudar({ body: `${rascunho.body}${variavel.token}` })}
                      className="rounded-full border border-dashed border-[var(--color-brand-purple-dark)]/25 px-3 py-1 text-xs font-semibold text-[var(--color-purple-dark)] hover:border-[var(--color-brand-blue)]"
                    >
                      {variavel.token}
                    </button>
                  ))}
                </div>
              </div>

              {usadas.size > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {usadas.has("{data}") && (
                    <Input
                      className={ESPELHO}
                      id="push-valor-data"
                      label="Valor de {data}"
                      placeholder="04/08/2026"
                      value={rascunho.values.data ?? ""}
                      onChange={(evento) =>
                        mudar({ values: { ...rascunho.values, data: evento.target.value } })
                      }
                      errors={faltando.includes("data") ? ["Sem valor, a chave sai no texto"] : []}
                    />
                  )}
                  {usadas.has("{hora}") && (
                    <Input
                      className={ESPELHO}
                      id="push-valor-hora"
                      label="Valor de {hora}"
                      placeholder="19:00"
                      value={rascunho.values.hora ?? ""}
                      onChange={(evento) =>
                        mudar({ values: { ...rascunho.values, hora: evento.target.value } })
                      }
                      errors={faltando.includes("hora") ? ["Sem valor, a chave sai no texto"] : []}
                    />
                  )}
                  {usadas.has("{documento}") && (
                    <Select
                      className={ESPELHO}
                      id="push-valor-documento"
                      label="Valor de {documento}"
                      prompt="Escolher o documento"
                      value={rascunho.values.documento ?? ""}
                      onChange={(valor) =>
                        mudar({ values: { ...rascunho.values, documento: valor } })
                      }
                      options={PUSH_DOCUMENTS.map((item) => ({ value: item, label: item }))}
                      errors={
                        faltando.includes("documento") ? ["Sem valor, a chave sai no texto"] : []
                      }
                    />
                  )}
                </div>
              )}


            </div>
          </div>
        )}

        {aba === "publico" && (
          <EditorDePublico
            dados={dados}
            segmentos={segmentos}
            audience={rascunho.audience}
            onMudar={(audience) => mudar({ audience })}
          />
        )}

        {aba === "entrega" && (
          <div className="grid gap-6">
            <p className={SECAO}>Entrega</p>
            <SwitchCard
              className={ESPELHO}
              id="push-ack"
              name="ack"
              title="Pedir confirmação de ciência"
              description="O aplicativo mostra o botão “Estou ciente”. Você vê quem confirmou e cobra quem não confirmou."
              checked={rascunho.ack}
              onChange={(valor) => mudar({ ack: valor })}
            />
            <SwitchCard
              className={ESPELHO}
              id="push-notificacao"
              name="push"
              title="Enviar notificação"
              description="Sem notificação o aviso só aparece quando o responsável abre o aplicativo por conta própria."
              checked={rascunho.push}
              onChange={(valor) => mudar({ push: valor })}
            />

            <fieldset className="m-0 border-0 p-0">
              <legend className={`${SECAO} mb-2`}>Quando</legend>
              <div className="flex flex-wrap gap-2">
                <Pilula ativa={rascunho.quando === "now"} onClick={() => mudar({ quando: "now" })}>
                  Enviar agora
                </Pilula>
                <Pilula
                  ativa={rascunho.quando === "sched"}
                  onClick={() => mudar({ quando: "sched" })}
                >
                  Agendar
                </Pilula>
              </div>
            </fieldset>

            {rascunho.quando === "sched" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  className={ESPELHO}
                  id="push-data"
                  label="Data"
                  placeholder="DD/MM/AAAA"
                  value={rascunho.date}
                  onChange={(evento) => mudar({ date: evento.target.value })}
                />
                <Input
                  className={ESPELHO}
                  id="push-hora"
                  label="Hora"
                  placeholder="08:00"
                  value={rascunho.time}
                  onChange={(evento) => mudar({ time: evento.target.value })}
                />
              </div>
            )}

            <p className={`m-0 ${MINI}`}>
              {rascunho.quando === "sched"
                ? "O público será recalculado no disparo: quem entrar no recorte até lá também recebe."
                : `A hora de referência da clínica é ${dados.now}.`}
            </p>
          </div>
        )}
      </ButtonTabs>
    </DrawerModal>
  );
}

/** As variáveis digitáveis que o texto usa — preenchidas ou não. */
function missingValuesTokens(rascunho: Pick<Rascunho, "title" | "body">): string[] {
  const texto = `${rascunho.title} ${rascunho.body}`;
  return ["{data}", "{hora}", "{documento}"].filter((token) => texto.includes(token));
}

/* ===================================================== gaveta da pesquisa */

function pesquisaInicial(hoje: string): RascunhoDePesquisa {
  return {
    name: "",
    question: "De 0 a 10, quanto você recomendaria a Bloomy para outra família?",
    commentLabel: "O que motivou sua nota?",
    commentRequired: false,
    extras: [],
    audience: { mode: "filter", filter: PUBLICO_VAZIO },
    quando: "now",
    date: hoje,
    time: "09:00",
  };
}

const TIPOS_DE_PERGUNTA: { id: SurveyExtraQuestion["type"]; label: string; icon: string }[] = [
  { id: "scale5", label: "Escala de 1 a 5", icon: "fa-star-half-stroke" },
  { id: "yesno", label: "Sim ou não", icon: "fa-toggle-on" },
  { id: "choice", label: "Múltipla escolha", icon: "fa-list-ul" },
  { id: "text", label: "Texto aberto", icon: "fa-align-left" },
];

/**
 * Nova pesquisa NPS.
 *
 * Mesma anatomia do composer de comunicado — pesquisa, público, entrega — e é de
 * propósito: as duas coisas que a área dispara têm a mesma pergunta no meio
 * ("para quem?") e a mesma no fim ("agora ou depois?"). Duas formas diferentes
 * para o mesmo par fariam a segunda parecer outro produto.
 *
 * **A pergunta de 0 a 10 é editável e o comentário é opcional.** Trocar a
 * pergunta principal descaracteriza o NPS — e é o produto que decide isso, não
 * a tela: a clínica que quiser perguntar outra coisa vai perguntar de qualquer
 * jeito, e é melhor que a pergunta apareça escrita no cabeçalho da pesquisa do
 * que fora do sistema, num formulário de terceiros.
 */
function GavetaDePesquisa({
  dados,
  segmentos,
  rascunho,
  onMudar,
  onFechar,
  onEnviar,
}: {
  dados: PushData;
  segmentos: PushSegment[];
  rascunho: RascunhoDePesquisa;
  onMudar: (rascunho: RascunhoDePesquisa) => void;
  onFechar: () => void;
  onEnviar: (rascunho: RascunhoDePesquisa) => void;
}) {
  const [aba, setAba] = useState<AbaDoPainel>("texto");
  const pessoas = resolveAudience(dados.guardians, rascunho.audience, segmentos);
  const decisao = canSendSurvey({ ...rascunho, audienceSize: pessoas.length });
  const mudar = (parte: Partial<RascunhoDePesquisa>) => onMudar({ ...rascunho, ...parte });

  const trocarPergunta = (id: string, parte: Partial<SurveyExtraQuestion>) =>
    mudar({
      extras: rascunho.extras.map((pergunta) =>
        pergunta.id === id ? { ...pergunta, ...parte } : pergunta,
      ),
    });

  return (
    <DrawerModal
      id="push-pesquisa"
      show
      onCancel={onFechar}
      title="Nova pesquisa NPS"
      variant="custom"
      customSize="min-w-[min(48rem,100vw)] max-w-[min(48rem,100vw)]"
      footer={
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Botao variant="ghost" onClick={onFechar}>
            Cancelar
          </Botao>
          <AcaoBloqueavel
            id="push-enviar-pesquisa"
            decision={decisao}
            onClick={() => onEnviar(rascunho)}
            leftIcon={rascunho.quando === "sched" ? "fa-clock" : "fa-paper-plane"}
          >
            {rascunho.quando === "sched"
              ? "Agendar pesquisa"
              : `Enviar para ${pessoas.length} ${pessoas.length === 1 ? "responsável" : "responsáveis"}`}
          </AcaoBloqueavel>
        </div>
      }
    >
      <ButtonTabs
        id="push-pesquisa-abas"
        panelClassName="pt-4"
        label="Etapas da pesquisa"
        value={aba}
        onChange={setAba}
        tabs={[
          { id: "texto", label: "Pesquisa" },
          { id: "publico", label: "Público" },
          { id: "entrega", label: "Entrega" },
        ]}
      >
        {aba === "texto" && (
          <div className="grid gap-8">
            <div className="grid gap-6">
              <p className={SECAO}>Pesquisa</p>
              <Input
                className={ESPELHO}
                id="push-pesquisa-nome"
                label="Nome interno"
                placeholder="NPS trimestral — setembro"
                value={rascunho.name}
                onChange={(evento) => mudar({ name: evento.target.value })}
              />
              <Input
                className={ESPELHO}
                id="push-pesquisa-pergunta"
                label="Pergunta principal, de 0 a 10"
                value={rascunho.question}
                onChange={(evento) => mudar({ question: evento.target.value })}
              />
              <Input
                className={ESPELHO}
                id="push-pesquisa-comentario"
                label="Rótulo do comentário"
                value={rascunho.commentLabel}
                onChange={(evento) => mudar({ commentLabel: evento.target.value })}
              />
              <SwitchCard
                className={ESPELHO}
                id="push-pesquisa-obrigatorio"
                name="comentario-obrigatorio"
                title="Comentário obrigatório"
                description="Sem comentário o responsável não conclui a pesquisa. Melhora a qualidade da resposta e derruba a taxa."
                checked={rascunho.commentRequired}
                onChange={(valor) => mudar({ commentRequired: valor })}
              />
            </div>

            <div className="grid gap-4">
              <p className={SECAO}>Perguntas extras</p>
              {rascunho.extras.length === 0 && (
                <p className={`m-0 ${MINI}`}>
                  A pesquisa funciona só com a nota e o comentário. As extras entram depois da nota,
                  no mesmo fluxo.
                </p>
              )}

              <ul className="m-0 list-none space-y-3 p-0">
                {rascunho.extras.map((pergunta) => {
                  const tipo = TIPOS_DE_PERGUNTA.find((item) => item.id === pergunta.type);
                  return (
                    <li
                      key={pergunta.id}
                      className="rounded-xl border border-[var(--color-brand-purple-dark)]/10 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          <Tag item={tipo?.label ?? ""} variant="brand" icon={tipo?.icon} />
                          <Input
                            className={ESPELHO}
                            id={`push-pergunta-${pergunta.id}`}
                            label="Enunciado"
                            placeholder="O que você quer perguntar?"
                            value={pergunta.text}
                            onChange={(evento) =>
                              trocarPergunta(pergunta.id, { text: evento.target.value })
                            }
                          />
                          {pergunta.type === "choice" && (
                            <div className="flex flex-wrap items-center gap-2">
                              {(pergunta.options ?? []).map((opcao) => (
                                <Tag key={opcao} item={opcao} variant="light-blue" />
                              ))}
                              <Input
                                className={ESPELHO}
                                id={`push-opcao-${pergunta.id}`}
                                label="Nova opção"
                                placeholder="Escreva e tecle Enter"
                                onKeyDown={(evento) => {
                                  if (evento.key !== "Enter") return;
                                  evento.preventDefault();
                                  const alvo = evento.currentTarget;
                                  const valor = alvo.value.trim();
                                  if (!valor) return;
                                  trocarPergunta(pergunta.id, {
                                    options: [...(pergunta.options ?? []), valor],
                                  });
                                  alvo.value = "";
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <Botao
                          size="small"
                          variant="ghost"
                          aria-label={`Remover a pergunta ${pergunta.text || tipo?.label}`}
                          onClick={() =>
                            mudar({
                              extras: rascunho.extras.filter((item) => item.id !== pergunta.id),
                            })
                          }
                        >
                          <Icon name="fa-trash" className="self-center" />
                        </Botao>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-wrap gap-2">
                {TIPOS_DE_PERGUNTA.map((tipo) => (
                  <Pilula
                    key={tipo.id}
                    ativa={false}
                    onClick={() =>
                      mudar({
                        extras: [
                          ...rascunho.extras,
                          {
                            id: `q-${tipo.id}-${rascunho.extras.length + 1}`,
                            type: tipo.id,
                            text: "",
                            options:
                              tipo.id === "choice"
                                ? ["Horários", "Comunicação", "Estrutura da unidade"]
                                : undefined,
                          },
                        ],
                      })
                    }
                  >
                    <Icon name="fa-plus" /> {tipo.label}
                  </Pilula>
                ))}
              </div>
            </div>
          </div>
        )}

        {aba === "publico" && (
          <EditorDePublico
            dados={dados}
            segmentos={segmentos}
            audience={rascunho.audience}
            onMudar={(audience) => mudar({ audience })}
          />
        )}

        {aba === "entrega" && (
          <div className="grid gap-6">
            <p className={SECAO}>Envio</p>
            <fieldset className="m-0 border-0 p-0">
              <legend className={`${SECAO} mb-2`}>Quando</legend>
              <div className="flex flex-wrap gap-2">
                <Pilula ativa={rascunho.quando === "now"} onClick={() => mudar({ quando: "now" })}>
                  Enviar agora
                </Pilula>
                <Pilula
                  ativa={rascunho.quando === "sched"}
                  onClick={() => mudar({ quando: "sched" })}
                >
                  Agendar
                </Pilula>
              </div>
            </fieldset>

            {rascunho.quando === "sched" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  className={ESPELHO}
                  id="push-pesquisa-data"
                  label="Data"
                  placeholder="DD/MM/AAAA"
                  value={rascunho.date}
                  onChange={(evento) => mudar({ date: evento.target.value })}
                />
                <Input
                  className={ESPELHO}
                  id="push-pesquisa-hora"
                  label="Hora"
                  placeholder="09:00"
                  value={rascunho.time}
                  onChange={(evento) => mudar({ time: evento.target.value })}
                />
              </div>
            )}

            <p className={`m-0 ${MINI}`}>
              Quem recebe a pesquisa fica registrado no disparo: é o denominador da taxa de
              resposta, e ele não muda depois que a pesquisa está no ar.
            </p>
          </div>
        )}
      </ButtonTabs>
    </DrawerModal>
  );
}

/* ======================================================= editor de público */

/**
 * O recorte de público.
 *
 * Três modos, e eles não são preferência de quem monta: por filtro o público é
 * uma definição que continua valendo depois; por segmento é a mesma coisa com
 * nome salvo; manual é uma lista de pessoas. A diferença aparece no agendamento
 * — ver `the-audience-is-recalculated-at-send-time` — e é por isso que o modo
 * fica visível no cartão e no detalhe, e não só aqui dentro.
 */
function EditorDePublico({
  dados,
  segmentos,
  audience,
  onMudar,
}: {
  dados: PushData;
  segmentos: PushSegment[];
  audience: PushAudience;
  onMudar: (audience: PushAudience) => void;
}) {
  const [buscaManual, setBuscaManual] = useState("");
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visiveis = dados.guardians.filter((pessoa) => normalizar(`${pessoa.name} ${pessoa.patient}`).includes(normalizar(buscaManual)));
  const selecionarVisiveis = (selecionar: boolean) => onMudar({
    mode: "manual", filter: PUBLICO_VAZIO,
    ids: selecionar
      ? [...new Set([...(audience.ids ?? []), ...visiveis.map((pessoa) => pessoa.id)])]
      : (audience.ids ?? []).filter((id) => !visiveis.some((pessoa) => pessoa.id === id)),
  });
  const pessoas = resolveAudience(dados.guardians, audience, segmentos);
  const { noApp, pushOff } = unreachable(pessoas);

  const opcoes = useMemo(() => {
    const unico = (valores: string[]) => [...new Set(valores)];
    return {
      units: unico(dados.guardians.map((pessoa) => pessoa.unit)),
      shifts: unico(dados.guardians.map((pessoa) => pessoa.shift)),
      insurers: unico(dados.guardians.map((pessoa) => pessoa.insurer)),
      professionals: unico(dados.guardians.map((pessoa) => pessoa.professional)),
    };
  }, [dados.guardians]);

  function alternar(chave: keyof PushFilter, valor: string) {
    const atual = audience.filter[chave];
    const proximo = atual.includes(valor)
      ? atual.filter((item) => item !== valor)
      : [...atual, valor];
    onMudar({ mode: "filter", filter: { ...audience.filter, [chave]: proximo } });
  }

  const grupo = (chave: keyof PushFilter, rotulo: string, valores: string[]) => (
    <fieldset className="m-0 border-0 p-0">
      <legend className={`${SECAO} mb-2`}>{rotulo}</legend>
      <div className="flex flex-wrap gap-2">
        {valores.map((valor) => (
          <Pilula
            key={valor}
            ativa={audience.filter[chave].includes(valor)}
            onClick={() => alternar(chave, valor)}
          >
            {valor}
          </Pilula>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="grid gap-6">
      <fieldset className="m-0 border-0 p-0">
        <legend className={`${SECAO} mb-2`}>Como escolher o público</legend>
        <div className="flex flex-wrap gap-2">
          <Pilula
            ativa={audience.mode === "filter"}
            onClick={() => onMudar({ mode: "filter", filter: audience.filter })}
          >
            Por filtro
          </Pilula>
          <Pilula
            ativa={audience.mode === "segment"}
            onClick={() =>
              onMudar({
                mode: "segment",
                segmentId: segmentos[0]?.id,
                filter: segmentos[0]?.filter ?? PUBLICO_VAZIO,
              })
            }
          >
            Segmento salvo
          </Pilula>
          <Pilula
            ativa={audience.mode === "manual"}
            onClick={() =>
              onMudar({ mode: "manual", ids: audience.ids ?? [], filter: PUBLICO_VAZIO })
            }
          >
            Seleção manual
          </Pilula>
        </div>
      </fieldset>

      {audience.mode === "filter" && (
        <div className="grid gap-6">
          {grupo("units", "Unidade", opcoes.units)}
          {grupo("shifts", "Turno", opcoes.shifts)}
          {grupo("insurers", "Operadora", opcoes.insurers)}
          {grupo("professionals", "Terapeuta de referência", opcoes.professionals)}
          <p className={`m-0 ${MINI}`}>
            Sem nenhum filtro marcado, o comunicado vai para todos os responsáveis com paciente
            ativo.
          </p>
        </div>
      )}

      {audience.mode === "segment" && (
        <ul className="m-0 list-none space-y-2 p-0">
          {segmentos.map((segmento) => {
            const ativo = audience.segmentId === segmento.id;
            return (
              <li key={segmento.id}>
                <button
                  type="button"
                  aria-pressed={ativo}
                  onClick={() =>
                    onMudar({ mode: "segment", segmentId: segmento.id, filter: segmento.filter })
                  }
                  className={[
                    "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left",
                    ativo
                      ? "border-[var(--color-brand-blue)] bg-[var(--color-brand-blue)]/10"
                      : "border-[var(--color-brand-purple-dark)]/10",
                  ].join(" ")}
                >
                  <span>
                    <span className="block font-bold text-[var(--color-brand-purple-dark)]">
                      {segmento.name}
                    </span>
                    <span className="block text-xs text-[rgba(43,35,91,0.72)]">
                      {segmento.description}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-[rgba(43,35,91,0.72)]">
                    {resolveAudience(dados.guardians, { mode: "filter", filter: segmento.filter })
                      .length}{" "}
                    responsáveis
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {audience.mode === "manual" && (
        <div className="grid gap-4">
          <Input id="push-manual-busca" label="Buscar por nome" placeholder="Responsável ou paciente" value={buscaManual} onChange={(event) => setBuscaManual(event.target.value)} />
          <div className="flex flex-wrap items-center gap-3">
            <Botao variant="tint" size="small" onClick={() => selecionarVisiveis(true)}>Selecionar todos{buscaManual ? " os resultados" : ""}</Botao>
            <Botao variant="ghost" size="small" onClick={() => selecionarVisiveis(false)}>Desmarcar{buscaManual ? " resultados" : " todos"}</Botao>
            <span role="status" className="text-sm">{(audience.ids ?? []).length} selecionados · {visiveis.length} resultados</span>
          </div>
          {visiveis.length === 0 && <p className="m-0 text-sm">Nenhum responsável encontrado.</p>}
        <ul className="m-0 max-h-72 list-none space-y-2 overflow-y-auto p-0">
          {visiveis.map((pessoa) => {
            const marcado = (audience.ids ?? []).includes(pessoa.id);
            return (
              <li key={pessoa.id} className="flex items-center justify-between gap-3">
                <input
                  type="checkbox"
                  className="h-6 w-6 shrink-0 accent-[var(--color-brand-blue)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]"
                  id={`push-manual-${pessoa.id}`}
                  checked={marcado}
                  aria-label={`${pessoa.name}, responsável por ${pessoa.patient}`}
                  onChange={() =>
                    onMudar({
                      mode: "manual",
                      ids: marcado
                        ? (audience.ids ?? []).filter((item) => item !== pessoa.id)
                        : [...(audience.ids ?? []), pessoa.id],
                      filter: PUBLICO_VAZIO,
                    })
                  }
                />
                <label
                  htmlFor={`push-manual-${pessoa.id}`}
                  className="flex-1 cursor-pointer text-sm"
                >
                  <span className="block font-bold text-[var(--color-brand-purple-dark)]">
                    {pessoa.name}
                  </span>
                  <span className="block text-xs text-[rgba(43,35,91,0.72)]">
                    responsável por {pessoa.patient} · {pessoa.unit} · {pessoa.insurer}
                  </span>
                </label>
                {!pessoa.appInstalled && <Tag item="sem aplicativo" variant="red" />}
              </li>
            );
          })}
        </ul>
        </div>
      )}

      {/* A contagem, e as duas exceções nomeadas separadas. Ver a regra
          `who-cannot-receive-is-named-before-and-after-sending`. */}
      <div className="rounded-2xl bg-[var(--color-brand-blue)]/10 p-4">
        <p className="m-0 text-lg font-extrabold text-[var(--color-brand-blue-dark)]">
          {pessoas.length} {pessoas.length === 1 ? "responsável vai receber" : "responsáveis vão receber"}
        </p>
        <p className={`m-0 ${MINI}`}>{audienceLabel(audience, segmentos)}</p>
        {(noApp.length > 0 || pushOff.length > 0) && (
          <ul className="m-0 mt-2 list-none space-y-1 p-0 text-sm font-semibold text-[var(--color-warn-fg)]">
            {noApp.length > 0 && (
              <li>
                <Icon name="fa-mobile-screen" /> {noApp.length} sem aplicativo instalado — só a
                recepção alcança, por telefone.
              </li>
            )}
            {pushOff.length > 0 && (
              <li>
                <Icon name="fa-bell-slash" /> {pushOff.length} com a notificação desligada no
                aparelho — recebem, e só veem ao abrir o aplicativo.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

/* =============================================================== aba NPS */

function AbaNps({
  dados,
  pesquisas,
  escolhida,
  onEscolher,
  onTratativa,
  onNovaPesquisa,
}: {
  dados: PushData;
  pesquisas: NpsSurvey[];
  /* A pesquisa aberta é estado do pai, e não desta aba: criar uma pesquisa
     acontece fora daqui, e quem cria espera cair nela. Com o estado aqui
     dentro, a nova entraria na lista e a tela continuaria mostrando a de
     julho. */
  escolhida: string;
  onEscolher: (id: string) => void;
  onTratativa: (
    surveyId: string,
    responseId: string,
    treatment: SurveyTreatment,
    note: string,
  ) => void;
  onNovaPesquisa: () => void;
}) {
  const enviadas = pesquisas.filter((item) => item.status === "sent");
  const [faixa, setFaixa] = useState("");
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");

  const atual = enviadas.find((item) => item.id === escolhida) ?? enviadas.at(-1);

  if (!atual) {
    return (
      <EmptyStateCard icon="fa-face-smile" text="Nenhuma pesquisa enviada">
        <p className="m-0">
          A primeira pesquisa cria a linha de base. Sem ela, a evolução do NPS não tem de onde
          partir.
        </p>
        <p className="mt-4">
          <Botao leftIcon="fa-plus" onClick={onNovaPesquisa}>
            Nova pesquisa
          </Botao>
        </p>
      </EmptyStateCard>
    );
  }

  const score = npsScore(atual.responses);
  const taxa = responseRate(atual);
  const emAberto = openDetractors(atual.responses);
  const porUnidade = npsByUnit(atual.responses, dados.guardians);
  const evolucao = enviadas.map((survey) => ({ survey, score: npsScore(survey.responses) }));
  const maiorNaEvolucao = Math.max(60, ...evolucao.map((item) => Math.abs(item.score.nps)));
  const porId = new Map(dados.guardians.map((pessoa) => [pessoa.id, pessoa]));

  const feed = feedOrder(atual.responses)
    .filter((resposta) => Boolean(resposta.comment) || npsBand(resposta.score) === "detractor")
    .filter((resposta) => (faixa ? npsBand(resposta.score) === faixa : true))
    .filter((resposta) => !status || (npsBand(resposta.score) === "detractor" && (resposta.treatment ?? "pending") === status))
    .filter((resposta) => {
      if (!busca) return true;
      const pessoa = porId.get(resposta.guardianId);
      return `${resposta.comment ?? ""} ${pessoa?.name ?? ""} ${pessoa?.patient ?? ""}`
        .toLowerCase()
        .includes(busca.toLowerCase());
    });

  return (
    <div className="space-y-6">
      <Select
        className={ESPELHO}
        id="push-campanha"
        label="Pesquisa"
        value={atual.id}
        onChange={onEscolher}
        clear={false}
        options={enviadas.map((item) => ({ value: item.id, label: `${item.name} · ${item.at}` }))}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <section className={CARTAO_DE_LISTA} aria-label="Indicador da pesquisa">
          <p className="m-0 text-center text-6xl font-black text-[var(--color-brand-purple-dark)]">
            {score.nps > 0 ? `+${score.nps}` : score.nps}
          </p>
          <p className="m-0 mt-2 text-center text-sm font-bold text-[rgba(43,35,91,0.72)]">
            NPS · {score.n} respostas de {atual.recipients.length} enviadas · taxa de resposta{" "}
            {taxa}%
          </p>
          <p className="mt-3 text-center">
            <Tag
              item={npsZone(score.nps)}
              variant={score.nps >= 50 ? "green" : score.nps >= 0 ? "orange" : "red"}
            />
          </p>

          {/* A barra de composição. Decorativa por definição: tudo o que ela
              mostra está escrito na legenda logo abaixo, com a palavra e a
              faixa de nota. Ver `the-nps-band-is-said-in-words`. */}
          <div aria-hidden="true" className="mt-4 flex h-2.5 overflow-hidden rounded-full">
            <span
              className="block bg-[var(--color-green)]"
              style={{ width: `${score.promoterPct}%` }}
            />
            <span
              className="block bg-[var(--color-brand-purple-dark)]/20"
              style={{ width: `${score.passivePct}%` }}
            />
            <span className="block bg-[var(--color-red)]" style={{ width: `${score.detractorPct}%` }} />
          </div>

          <dl className="m-0 mt-3 space-y-1 text-sm">
            <LinhaDaLegenda
              label={`${NPS_BANDS.promoter.label} (${NPS_BANDS.promoter.range})`}
              value={`${score.promoters} · ${score.promoterPct}%`}
            />
            <LinhaDaLegenda
              label={`${NPS_BANDS.passive.label} (${NPS_BANDS.passive.range})`}
              value={`${score.passives} · ${score.passivePct}%`}
            />
            <LinhaDaLegenda
              label={`${NPS_BANDS.detractor.label} (${NPS_BANDS.detractor.range})`}
              value={`${score.detractors} · ${score.detractorPct}%`}
            />
          </dl>
        </section>

        <div className="space-y-4">
          <section className={CARTAO_DE_LISTA} aria-label="Evolução do NPS">
            <p className={SECAO}>Evolução do NPS</p>
            <ul className="m-0 mt-3 flex list-none items-end gap-4 p-0" style={{ height: 150 }}>
              {evolucao.map((item, indice) => (
                <li
                  key={item.survey.id}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
                    {item.score.nps > 0 ? `+${item.score.nps}` : item.score.nps}
                  </span>
                  <span
                    aria-hidden="true"
                    className={[
                      "w-full max-w-16 rounded-t-lg",
                      indice === evolucao.length - 1
                        ? "bg-[var(--color-brand-purple-dark)]"
                        : "bg-[var(--color-brand-blue)]",
                    ].join(" ")}
                    style={{
                      height: `${Math.max(4, (Math.abs(item.score.nps) / maiorNaEvolucao) * 100)}%`,
                    }}
                  />
                  <span className="text-center text-xs font-bold text-[rgba(43,35,91,0.72)]">
                    {item.survey.name.replace("NPS ", "")}
                    <span className="block font-normal">{item.score.n} respostas</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={CARTAO_DE_LISTA} aria-label="NPS por unidade">
            <p className={SECAO}>NPS por unidade</p>
            <ul className="m-0 mt-2 list-none space-y-2 p-0">
              {porUnidade.map((linha) => (
                <li key={linha.unit} className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block font-bold text-[var(--color-brand-purple-dark)]">
                      {linha.unit}
                    </span>
                    <span className="block text-xs text-[rgba(43,35,91,0.72)]">
                      {linha.score.n} respostas · {plural(linha.score.promoters, "promotor", "promotores")},{" "}
                      {plural(linha.score.passives, "neutro", "neutros")},{" "}
                      {plural(linha.score.detractors, "detrator", "detratores")}
                    </span>
                  </span>
                  <span className="text-lg font-extrabold text-[var(--color-brand-purple-dark)]">
                    {linha.score.nps > 0 ? `+${linha.score.nps}` : linha.score.nps}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section aria-label="Fila de detratores e comentários" className="space-y-4">
        <div className="space-y-3">
          <div>
            <h2 className="m-0 text-base font-extrabold text-[var(--color-brand-purple-dark)]">
              Detratores e comentários
            </h2>
            <p className={`m-0 ${MINI}`}>
              {emAberto.length}{" "}
              {emAberto.length === 1 ? "detrator na fila" : "detratores na fila"} · {feed.length}{" "}
              respostas com texto
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <Input
              className={ESPELHO}
              id="push-nps-busca"
              label="Buscar"
              placeholder="Comentário ou nome"
              leftIcon="fa-magnifying-glass"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
            <Select
              className={ESPELHO}
              id="push-nps-faixa"
              label="Faixa"
              prompt="Todas as faixas"
              value={faixa}
              onChange={setFaixa}
              options={[
                { value: "detractor", label: `${NPS_BANDS.detractor.label} (0 a 6)` },
                { value: "passive", label: `${NPS_BANDS.passive.label} (7 a 8)` },
                { value: "promoter", label: `${NPS_BANDS.promoter.label} (9 a 10)` },
              ]}
            />
            <Select
              className={ESPELHO}
              id="push-nps-status"
              label="Status"
              value={status}
              onChange={setStatus}
              clear={false}
              options={[
                { value: "", label: "Todos" },
                { value: "pending", label: "Sem tratativa" },
                { value: "contact", label: "Em contato" },
                { value: "resolved", label: "Resolvido" },
              ]}
            />
          </div>
        </div>

        {feed.length === 0 ? (
          <EmptyStateCard icon="fa-comment-slash" text="Nenhuma resposta neste recorte">
            <p className="m-0">Ajuste a busca, a faixa de nota ou o status.</p>
          </EmptyStateCard>
        ) : (
          <ul className="m-0 list-none space-y-3 p-0">
            {feed.map((resposta) => (
              <li key={resposta.id}>
                <LinhaDeResposta
                  resposta={resposta}
                  pessoa={porId.get(resposta.guardianId)}
                  extras={atual.extras}
                  onTratativa={(treatment, note) =>
                    onTratativa(atual.id, resposta.id, treatment, note)
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LinhaDaLegenda({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="m-0 text-[rgba(43,35,91,0.72)]">{label}</dt>
      <dd className="m-0 font-extrabold text-[var(--color-brand-purple-dark)]">{value}</dd>
    </div>
  );
}

/**
 * Uma resposta no feed.
 *
 * A nota aparece no quadrado; a faixa permanece disponível para leitores de
 * tela, sem uma etiqueta visual adicional.
 */
function LinhaDeResposta({
  resposta,
  pessoa,
  extras,
  onTratativa,
}: {
  resposta: SurveyResponse;
  pessoa: PushGuardian | undefined;
  extras: NpsSurvey["extras"];
  onTratativa: (treatment: SurveyTreatment, note: string) => void;
}) {
  const [nota, setNota] = useState(resposta.treatmentNote ?? "");
  const [anotando, setAnotando] = useState(false);
  const banda = npsBand(resposta.score);
  const detrator = banda === "detractor";
  const tratativa = TREAT_META[resposta.treatment ?? "pending"];

  const cor =
    banda === "promoter"
      ? "bg-[var(--color-green-light)] text-[var(--color-green-dark)]"
      : banda === "passive"
        ? "bg-[var(--color-brand-purple-dark)]/8 text-[var(--color-brand-purple-dark)]"
        : "bg-[var(--color-red-light)] text-[var(--color-red-dark)]";

  return (
    <article className={`${CARTAO_DE_LISTA} flex flex-col gap-4 sm:flex-row`}>
      <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl ${cor}`}>
        <span className="text-xl font-black">{resposta.score}</span>
        <span className="sr-only">{NPS_BANDS[banda].one}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="m-0 text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
            {pessoa?.name ?? "Responsável"}
          </h3>
          <span className="text-xs text-[rgba(43,35,91,0.72)]">
            {pessoa ? `${pessoa.patient} · ${pessoa.unit} · ${pessoa.professional}` : ""}
          </span>
          {detrator && (
            <Tag item={tratativa.label} variant={tratativa.tag} icon={tratativa.icon} />
          )}
        </div>

        {resposta.comment && (
          <p className="m-0 mt-1 max-w-[72ch] text-sm text-[rgba(43,35,91,0.72)]">
            “{resposta.comment}”
          </p>
        )}

        <ul className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0 text-xs text-[rgba(43,35,91,0.72)]">
          <li className="rounded-full bg-[var(--color-brand-purple-dark)]/5 px-2 py-0.5">
            respondido em {resposta.at}
          </li>
          {extras
            .filter((pergunta) => resposta.extras?.[pergunta.id] !== undefined)
            .map((pergunta) => (
              <li
                key={pergunta.id}
                className="rounded-full bg-[var(--color-brand-purple-dark)]/5 px-2 py-0.5"
              >
                {pergunta.text}:{" "}
                <b className="font-bold">{String(resposta.extras?.[pergunta.id])}</b>
              </li>
            ))}
        </ul>

        {resposta.treatmentNote && !anotando && (
          <p className="m-0 mt-2 border-t border-dashed border-[var(--color-brand-purple-dark)]/15 pt-2 text-sm text-[rgba(43,35,91,0.72)]">
            <Icon name="fa-note-sticky" /> {resposta.treatmentNote}
            {resposta.treatmentBy ? ` — ${resposta.treatmentBy}` : ""}
          </p>
        )}

        {anotando && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Input
              className={`${ESPELHO} min-w-56 flex-1`}
              id={`push-nota-${resposta.id}`}
              label="O que foi combinado com a família"
              value={nota}
              onChange={(evento) => setNota(evento.target.value)}
            />
            <Botao
              size="normal"
              onClick={() => {
                onTratativa(resposta.treatment === "resolved" ? "resolved" : "contact", nota);
                setAnotando(false);
              }}
            >
              Salvar
            </Botao>
          </div>
        )}
      </div>

      {detrator && (
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-48">
          {resposta.treatment !== "contact" && resposta.treatment !== "resolved" && (
            <Botao
              size="normal"
              variant="tint"
              leftIcon="fa-phone"
              onClick={() => onTratativa("contact", nota)}
            >
              Assumir contato
            </Botao>
          )}
          {resposta.treatment !== "resolved" && (
            <Botao
              size="normal"
              variant="tint"
              color="blue"
              leftIcon="fa-check"
              onClick={() => onTratativa("resolved", nota)}
            >
              Concluir tratativa
            </Botao>
          )}
          <Botao size="normal" variant="tint" onClick={() => setAnotando((antes) => !antes)}>
            {resposta.treatmentNote ? "Editar nota" : "Anotar"}
          </Botao>
        </div>
      )}
    </article>
  );
}

/* ====================================================== modelos e segmentos */

function NovoNaBiblioteca({ onModelo, onSegmento }: { onModelo: () => void; onSegmento: () => void }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fecharFora = (event: PointerEvent) => {
      if (!raiz.current?.contains(event.target as Node)) setAberto(false);
    };
    document.addEventListener("pointerdown", fecharFora);
    return () => document.removeEventListener("pointerdown", fecharFora);
  }, [aberto]);
  return (
    <div ref={raiz} className="relative w-52 shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setAberto(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && aberto) {
          event.preventDefault();
          setAberto(false);
          raiz.current?.querySelector<HTMLButtonElement>("button")?.focus();
        }
      }}
    >
      <Botao className="w-52" leftIcon="fa-plus" rightIcon="fa-chevron-down"
        aria-expanded={aberto} aria-controls="push-novo-opcoes"
        onClick={() => setAberto((valor) => !valor)}>
        Novo
      </Botao>
      {aberto && (
        <div id="push-novo-opcoes" className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-[var(--color-brand-purple-dark)]/10 bg-white p-1 shadow-md">
          <Botao variant="ghost" className="w-full" onClick={() => { setAberto(false); onModelo(); }}>Novo modelo</Botao>
          <Botao variant="ghost" className="w-full" onClick={() => { setAberto(false); onSegmento(); }}>Novo segmento</Botao>
        </div>
      )}
    </div>
  );
}

function AbaBiblioteca({
  dados,
  modelos,
  segmentos,
  onUsar,
  onEditarModelo,
  onExcluirModelo,
  onEditarSegmento,
  onExcluirSegmento,
}: {
  dados: PushData;
  modelos: PushTemplate[];
  segmentos: PushSegment[];
  onUsar: (modelo: PushTemplate) => void;
  onEditarModelo: (modelo: PushTemplate) => void;
  onExcluirModelo: (modelo: PushTemplate) => void;
  onEditarSegmento: (segmento: PushSegment) => void;
  onExcluirSegmento: (segmento: PushSegment) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section aria-label="Modelos de comunicado" className="space-y-3 rounded-2xl border border-[var(--color-brand-purple-dark)]/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-extrabold text-[var(--color-brand-purple-dark)]">
              Modelos de comunicado
            </h2>
            <p className={`m-0 ${MINI}`}>
              Texto pronto com variáveis. A equipe escolhe o modelo e ajusta só o que muda.
            </p>
          </div>

        </div>

        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {modelos
            .filter((modelo) => modelo.id !== "texto-livre")
            .map((modelo) => {
              const kind = KIND_META[modelo.kind];
              return (
                <li key={modelo.id} className={`${CARTAO_DE_LISTA} flex flex-col gap-2`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag item={kind.short} variant={kind.tag} icon={kind.icon} />
                    {modelo.ack && <Tag item="Pede ciência" variant="brand" icon="fa-hand" />}
                  </div>
                  <h3 className="m-0 text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
                    {modelo.label}
                  </h3>
                  <p className="m-0 text-sm font-bold text-[var(--color-brand-purple-dark)]">
                    {modelo.title}
                  </p>
                  <p className="m-0 text-xs text-[rgba(43,35,91,0.72)]">{modelo.body}</p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <Botao size="small" variant="tint" leftIcon="fa-paper-plane" onClick={() => onUsar(modelo)}>
                      Usar
                    </Botao>
                    <Botao size="small" variant="ghost" onClick={() => onEditarModelo(modelo)}>
                      Editar
                    </Botao>
                    <Botao size="small" variant="ghost" onClick={() => onExcluirModelo(modelo)}>
                      Excluir
                    </Botao>
                  </div>
                </li>
              );
            })}
        </ul>
      </section>

      <section aria-label="Segmentos salvos" className="space-y-3 rounded-2xl border border-[var(--color-brand-purple-dark)]/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-extrabold text-[var(--color-brand-purple-dark)]">
              Segmentos salvos
            </h2>
            <p className={`m-0 ${MINI}`}>
              Recortes de público reutilizáveis nos comunicados e nas pesquisas.
            </p>
          </div>

        </div>

        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {segmentos.map((segmento) => {
            const alcance = resolveAudience(dados.guardians, {
              mode: "filter",
              filter: segmento.filter,
            });
            return (
              <li key={segmento.id} className={`${CARTAO_DE_LISTA} flex flex-col gap-2`}>
                <Tag className="self-start" item={`${alcance.length} responsáveis`} variant="brand" icon="fa-users" />
                <h3 className="m-0 text-sm font-extrabold text-[var(--color-brand-purple-dark)]">
                  {segmento.name}
                </h3>
                <p className="m-0 text-xs text-[rgba(43,35,91,0.72)]">{segmento.description}</p>
                <p className={`m-0 text-xs ${MINI}`}>
                  {audienceLabel({ mode: "filter", filter: segmento.filter })}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Botao size="small" variant="ghost" onClick={() => onEditarSegmento(segmento)}>
                    Editar
                  </Botao>
                  <Botao size="small" variant="ghost" onClick={() => onExcluirSegmento(segmento)}>
                    Excluir
                  </Botao>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function GavetaDeModelo({
  modelo,
  onFechar,
  onSalvar,
}: {
  modelo: PushTemplate;
  onFechar: () => void;
  onSalvar: (modelo: PushTemplate) => void;
}) {
  const [rascunho, setRascunho] = useState(modelo);
  const decisao: Decision = rascunho.label.trim()
    ? rascunho.body.trim()
      ? { allowed: true }
      : { allowed: false, reason: "Escreva o texto do modelo." }
    : { allowed: false, reason: "Dê um nome ao modelo — é por ele que a equipe procura." };

  return (
    <DrawerModal
      id="push-modelo"
      show
      onCancel={onFechar}
      title={modelo.label ? "Editar modelo" : "Novo modelo"}
      variant="custom"
      customSize="min-w-[min(36rem,100vw)] max-w-[min(36rem,100vw)]"
      footer={
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Botao variant="ghost" onClick={onFechar}>
            Cancelar
          </Botao>
          <AcaoBloqueavel
            id="push-salvar-modelo"
            decision={decisao}
            onClick={() => onSalvar(rascunho)}
          >
            Salvar modelo
          </AcaoBloqueavel>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          className={ESPELHO}
          id="push-modelo-nome"
          label="Nome do modelo"
          placeholder="Feriado — unidade fechada"
          value={rascunho.label}
          onChange={(evento) => setRascunho({ ...rascunho, label: evento.target.value })}
        />
        <Select
          className={ESPELHO}
          id="push-modelo-tipo"
          label="Tipo"
          value={rascunho.kind}
          clear={false}
          onChange={(valor) => setRascunho({ ...rascunho, kind: valor as PushKind })}
          options={Object.entries(KIND_META).map(([value, meta]) => ({
            value,
            label: meta.label,
          }))}
        />
        <Input
          className={ESPELHO}
          id="push-modelo-titulo"
          label="Título"
          placeholder="Aparece na notificação"
          value={rascunho.title}
          onChange={(evento) => setRascunho({ ...rascunho, title: evento.target.value })}
        />
        <Textarea
          className={ESPELHO}
          id="push-modelo-texto"
          label="Mensagem"
          rows={4}
          placeholder="Use {responsavel}, {paciente}, {unidade}, {data}…"
          value={rascunho.body}
          onChange={(evento) => setRascunho({ ...rascunho, body: evento.target.value })}
        />
        <SwitchCard
          className={ESPELHO}
          id="push-modelo-ack"
          name="modelo-ack"
          title="Pedir ciência por padrão"
          description="Comunicados criados a partir deste modelo já vêm com a confirmação ligada."
          checked={rascunho.ack}
          onChange={(valor) => setRascunho({ ...rascunho, ack: valor })}
        />
      </div>
    </DrawerModal>
  );
}

function GavetaDeSegmento({
  dados,
  segmento,
  onFechar,
  onSalvar,
}: {
  dados: PushData;
  segmento: PushSegment;
  onFechar: () => void;
  onSalvar: (segmento: PushSegment) => void;
}) {
  const [rascunho, setRascunho] = useState(segmento);
  const alcance = resolveAudience(dados.guardians, { mode: "filter", filter: rascunho.filter });
  const decisao: Decision = rascunho.name.trim()
    ? { allowed: true }
    : { allowed: false, reason: "Dê um nome ao segmento." };

  return (
    <DrawerModal
      id="push-segmento"
      show
      onCancel={onFechar}
      title={segmento.name ? "Editar segmento" : "Novo segmento"}
      variant="custom"
      customSize="min-w-[min(48rem,100vw)] max-w-[min(48rem,100vw)]"
      footer={
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Botao variant="ghost" onClick={onFechar}>
            Cancelar
          </Botao>
          <AcaoBloqueavel
            id="push-salvar-segmento"
            decision={decisao}
            onClick={() => onSalvar(rascunho)}
          >
            Salvar segmento ({alcance.length})
          </AcaoBloqueavel>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          className={ESPELHO}
          id="push-segmento-nome"
          label="Nome"
          placeholder="Convênio Bradesco"
          value={rascunho.name}
          onChange={(evento) => setRascunho({ ...rascunho, name: evento.target.value })}
        />
        <Input
          className={ESPELHO}
          id="push-segmento-descricao"
          label="Descrição"
          placeholder="Onde este segmento costuma ser usado"
          value={rascunho.description}
          onChange={(evento) => setRascunho({ ...rascunho, description: evento.target.value })}
        />
        <EditorDePublico
          dados={dados}
          segmentos={[]}
          audience={{ mode: "filter", filter: rascunho.filter }}
          onMudar={(audience) => setRascunho({ ...rascunho, filter: audience.filter })}
        />
      </div>
    </DrawerModal>
  );
}

/* ============================================================= utilitários */

/**
 * A ação que a regra bloqueia.
 *
 * `disabled` sairia da ordem de foco, e quem navega por teclado descobriria o
 * impedimento por eliminação. É a decisão 0006 do motor: o controle continua
 * visível e alcançável, com `aria-disabled` e o motivo associado por
 * `aria-describedby`. O motivo aparece embaixo do botão, e — no composer —
 * também junto da prévia, que é onde os olhos estão quando o texto tem buraco.
 */
function AcaoBloqueavel({
  id,
  decision,
  onClick,
  children,
  variant = "default",
  leftIcon,
}: {
  id: string;
  decision: Decision;
  onClick: () => void;
  children: ReactNode;
  variant?: "default" | "outline" | "tint";
  leftIcon?: string;
}) {
  const bloqueado = !decision.allowed;
  const motivoId = `${id}-motivo`;

  return (
    <span className="flex max-w-full flex-col items-start gap-1">
      <Botao
        id={id}
        variant={variant}
        leftIcon={leftIcon}
        aria-disabled={bloqueado || undefined}
        aria-describedby={bloqueado ? motivoId : undefined}
        className={bloqueado ? ACAO_BLOQUEADA : undefined}
        onClick={bloqueado ? undefined : onClick}
      >
        {children}
      </Botao>
      {bloqueado && decision.reason && (
        <span id={motivoId} className="sr-only">
          {decision.reason}
        </span>
      )}
    </span>
  );
}

/**
 * `button/1` com a marca de espelho.
 *
 * É o `Button` da pasta `bloomy/`, sem nada acrescentado além da classe — o
 * componente é o do sistema, e o embrulho existe só para não repetir a marca em
 * quinze pontos de uso e para que o motivo dela fique escrito uma vez só, em
 * `ESPELHO`, acima.
 */
function Botao({ className, ...resto }: ComponentProps<typeof Button>) {
  return <Button className={[ESPELHO, className].filter(Boolean).join(" ")} {...resto} />;
}

/** "1 detrator" e "3 detratores": a contagem no singular certo. */
function plural(quantos: number, singular: string, plural: string): string {
  return `${quantos} ${quantos === 1 ? singular : plural}`;
}

/** A pílula de recorte. Não existe em `core_components.ex` — peça desta tela. */
function Pilula({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativa}
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1 text-sm font-semibold transition-colors",
        ativa
          ? "border-[var(--color-blue)] bg-[var(--color-blue-light)] text-[var(--color-blue-dark)]"
          : "border-[var(--color-brand-purple-dark)]/15 bg-white text-[rgba(43,35,91,0.72)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Aviso({
  tone,
  icon,
  children,
}: {
  tone: "orange" | "red";
  icon: string;
  children: ReactNode;
}) {
  const cor =
    tone === "orange"
      ? "bg-[var(--color-orange-light)] text-[var(--color-warn-fg)]"
      : "bg-[var(--color-red-light)] text-[var(--color-red-dark)]";

  return (
    <p className={`m-0 flex gap-3 rounded-2xl p-4 text-sm ${cor}`}>
      <Icon name={icon} type="solid" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function wrap(context: ScreenProps["context"], children: ReactNode) {
  return (
    <div className="push-space">
    <AppShell
      context={context}
      title="Central de PUSH"
      breadcrumb={[{ label: "Central de PUSH" }]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
    </div>
  );
}
