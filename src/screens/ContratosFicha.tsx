/**
 * Gestão de Contratos — Ficha do Contrato.
 *
 * O hub de ações sobre um contrato: cabeçalho com os selos, abas com a
 * qualificação, o conteúdo por modalidade, o dossiê, as versões e aditivos e a
 * Linha do Tempo Forense; ao lado, o painel de workflows com SÓ a próxima ação
 * válida (submeter, aprovar/reprovar, ressubmeter, despachar, concluir). A
 * assinatura fica travada com cadeado até a aprovação: é a regra central do
 * produto, e quem tenta despachar antes vê o "Bloqueio de Governança".
 *
 * Feito na tela (componente novo para o dev): o painel de workflows, o cabeçalho
 * da ficha com os selos, a lista de cláusulas com o selo "Editada" e a legenda de
 * cores da Linha do Tempo. O resto é `lazy_tabs`, `modal`, `input`,
 * `radio_selector`, `radio_cards`, `file_uploader`, `table`, `timeline_list`,
 * `tag`, `button` e `empty_state_card`.
 */
import { useMemo, useState, type ReactNode } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { RadioCards, RadioGroup } from "../components/Choice.js";
import { FileUploader } from "../components/FileUploader.js";
import { Icon } from "../components/Icon.js";
import { Input, cx } from "../components/Input.js";
import { EmptyStateCard, TimelineList } from "../components/Layout.js";
import { Dropdown, DrawerModal, Modal } from "../components/Overlay.js";
import { Table } from "../components/Table.js";
import { LazyTabs } from "../components/Tabs.js";
import { Tag, type TagVariant } from "../components/Tag.js";
import { ModalAditivo } from "./gestao-de-contratos/FormAditivo.js";
import {
  APROVACAO, ASSINATURA, CONFORMIDADE, FAIXA, FASES, FLUXO, MODALIDADE, PLATAFORMAS, STATUS, SUBTIPO, TODAY,
  br, diasLabel, dossieDe, dossieOk, faixa, faseLabel, kb, parteDe, proximaVersao,
  type Aditivo, type Arquivo, type Clausula, type Contrato, type ContratosData, type Evento, type EventoTipo, type Papel, type Plataforma,
} from "./gestao-de-contratos/model.js";
import { Aviso, Bloco, ContratosShell, Dados, ROTAS, Selo, TextoComTags, Valor, exportarPdf, papelDe, secaoInfo, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";

/* ------------------------------------------------------------------ */
/* Controles: modal e aba                                              */
/* ------------------------------------------------------------------ */

export const MODAIS = ["aprovar", "reprovar", "despachar", "bloqueio", "concluir", "revisao", "encerrar", "aditivo", "clausula"] as const;
export type ModalId = (typeof MODAIS)[number];

export const ABAS = [
  { id: "resumo", label: "Resumo" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "dossie", label: "Dossiê" },
  { id: "versoes", label: "Versões & Aditivos" },
  { id: "linha-do-tempo", label: "Linha do Tempo" },
] as const;
type AbaId = (typeof ABAS)[number]["id"];

/* ------------------------------------------------------------------ */
/* Papéis: quem faz o quê na ficha                                     */
/* ------------------------------------------------------------------ */

const ELABORA: Papel[] = ["solicitante", "operador", "juridico", "administrador"];
const APROVA: Papel[] = ["aprovador", "diretoria"];
const DESPACHA: Papel[] = ["operador", "juridico", "administrador"];
const ENCERRA: Papel[] = ["diretoria", "operador", "juridico", "administrador"];
const ADITA: Papel[] = ["juridico", "operador", "solicitante", "administrador"];

/** Cor e ícone de cada tipo de evento da Linha do Tempo Forense. */
const EVENTO: Record<EventoTipo, { label: string; variant: TagVariant; icon: string }> = {
  criacao: { label: "Criação", variant: "light-blue", icon: "fa-sparkles" },
  workflow: { label: "Workflow", variant: "brand", icon: "fa-diagram-project" },
  versao: { label: "Versão", variant: "cyan", icon: "fa-code-branch" },
  aditivo: { label: "Aditivo", variant: "orange", icon: "fa-file-plus" },
  dossie: { label: "Dossiê", variant: "light-accent", icon: "fa-folder-check" },
  cobranca: { label: "Cobrança", variant: "green", icon: "fa-file-invoice-dollar" },
  erp: { label: "ERP", variant: "dark-blue", icon: "fa-arrows-rotate" },
  encerramento: { label: "Encerramento", variant: "dark-purple", icon: "fa-box-archive" },
};

/** Quem está usando o protótipo (o mesmo usuário do cabeçalho). */
const USUARIO = "Marina Alves";

const agora = () => `${TODAY}T${new Date().toTimeString().slice(0, 5)}`;
const dataHora = (iso: string) => (iso.length > 10 ? `${br(iso)} às ${iso.slice(11, 16)}` : br(iso));

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/**
 * Menu "Mais ações" (⋯) com o `dropdown` do sistema: as consultas e atalhos da
 * ficha, que não mudam o contrato. Os itens seguem o estilo dos menus do
 * cabeçalho do backoffice.
 */
function MaisAcoes({ itens }: { itens: { label: string; icon: string; onClick: () => void }[] }) {
  return (
    <Dropdown
      id="ficha-mais-acoes"
      items={
        <div className="flex flex-col">
          {itens.map((i) => (
            <button
              key={i.label}
              type="button"
              onClick={i.onClick}
              className="flex items-center rounded px-2 py-1.5 text-left text-sm text-brand-purple-dark outline-none transition-colors hover:bg-neutral-100/40 focus:bg-neutral-100/40"
            >
              <Icon name={i.icon} className="mr-2 w-4" />
              {i.label}
            </button>
          ))}
        </div>
      }
    >
      <Button variant="ghost" aria-label="Mais ações" title="Mais ações" className="w-12 items-center! px-0!">
        <Icon name="fa-ellipsis-vertical" />
      </Button>
    </Dropdown>
  );
}

/* ------------------------------------------------------------------ */

export function ContratosFicha({ context, params }: ScreenProps) {
  const id = params.id ?? "";
  const papel = papelDe(context, "operador");
  // O breadcrumb volta para a tela de onde a ficha foi aberta (controle `origem`); sem origem, a Carteira.
  const origem = secaoInfo(context.controls.origem ?? "") ?? secaoInfo("carteira")!;
  return (
    <ContratosShell context={context} secao="ficha" titulo="Ficha do Contrato" semNav breadcrumbs={[{ label: origem.label, to: origem.to }, { label: id }]}>
      {(data) => {
        const contrato = data.contratos.find((c) => c.id === id);
        if (!contrato) {
          return (
            <Bloco>
              <EmptyStateCard icon="fa-file-circle-question" text="Contrato não encontrado">
                <p>Não há contrato com o código {id} na carteira. Confira o código ou volte à carteira para buscar pela parte ou pelo objeto.</p>
                <div className="mt-6 flex justify-center">
                  <Button leftIcon="fa-arrow-left" onClick={() => context.navigate(ROTAS.carteira)}>Voltar à carteira</Button>
                </div>
              </EmptyStateCard>
            </Bloco>
          );
        }
        return (
          <Ficha
            key={`${id}|${JSON.stringify(context.controls)}`}
            data={data}
            inicial={contrato}
            papel={papel}
            controls={context.controls}
            ir={(rota, controls) => context.navigate(rota, { controls: { ...controls, papel } })}
          />
        );
      }}
    </ContratosShell>
  );
}

/** O modal pedido pelo controle só abre se a ação vale para o estado e o papel. */
function modalValido(m: string | undefined, c: Contrato, papel: Papel): ModalId | null {
  if (!m || !(MODAIS as readonly string[]).includes(m)) return null;
  const ok: Record<ModalId, boolean> = {
    aprovar: c.aprovacao === "em_aprovacao" && APROVA.includes(papel),
    reprovar: c.aprovacao === "em_aprovacao" && APROVA.includes(papel),
    despachar: c.assinatura === "pronto_coleta" && DESPACHA.includes(papel),
    bloqueio: c.assinatura === "bloqueada",
    concluir: c.assinatura === "em_assinatura" && DESPACHA.includes(papel),
    revisao: revisavel(c) && ELABORA.includes(papel),
    encerrar: c.status === "vigente" && ENCERRA.includes(papel),
    aditivo: c.status === "vigente" && ADITA.includes(papel),
    clausula: c.modalidade === "adesao" && clausulasEditaveis(c) && ELABORA.includes(papel),
  };
  return ok[m as ModalId] ? (m as ModalId) : null;
}

/** Cláusulas só mudam enquanto o contrato está em elaboração (ou voltou reprovado). */
const clausulasEditaveis = (c: Contrato) => c.aprovacao === "elaboracao" || c.aprovacao === "reprovado";
/** Revisão formal antes da assinatura; depois de assinado, só Termo Aditivo. */
const revisavel = (c: Contrato) => c.assinatura !== "assinado" && c.status !== "encerrado";

function Ficha({
  data,
  inicial,
  papel,
  controls,
  ir,
}: {
  data: ContratosData;
  inicial: Contrato;
  papel: Papel;
  controls: Record<string, string>;
  ir: (rota: string, controls?: Record<string, string>) => void;
}) {
  const [c, setC] = useState<Contrato>(inicial);
  const [aditivos, setAditivos] = useState<Aditivo[]>(() => data.aditivos.filter((a) => a.contratoId === inicial.id));
  const [modal, setModal] = useState<ModalId | null>(() => modalValido(controls.modal, inicial, papel));
  const [clausulaEditando, setClausulaEditando] = useState<Clausula | null>(null);
  const aba = (ABAS.find((a) => a.id === controls.aba)?.id ?? "resumo") as AbaId;

  const parte = parteDe(data, c);
  const fechar = () => { setModal(null); setClausulaEditando(null); };
  const evento = (tipo: EventoTipo, titulo: string, detalhe?: string): Evento => ({ id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, data: agora(), tipo, titulo, autor: USUARIO, ...(detalhe && { detalhe }) });
  const aplicar = (patch: Partial<Contrato>, ev: Evento, toast: { title: string; content: string }) => {
    setC((s) => ({ ...s, ...patch, eventos: [...s.eventos, ev] }));
    fechar();
    showToast({ type: "success", ...toast, closeTime: 4000 });
  };

  const encerrado = c.status === "encerrado";
  const vigente = c.status === "vigente";

  /* Ações diretas do painel ------------------------------------------ */
  const submeter = () =>
    aplicar(
      { status: "em_aprovacao", aprovacao: "em_aprovacao", fase: "aprovacao", reprovacao: undefined },
      evento("workflow", c.aprovacao === "reprovado" ? "Ressubmetido para aprovação" : "Submetido para aprovação"),
      { title: c.aprovacao === "reprovado" ? "Contrato ressubmetido" : "Contrato submetido", content: `${c.id} ${c.versao} foi para aprovação da Diretoria / Jurídico.` },
    );

  return (
    <div className="space-y-6">
      {encerrado && c.encerramento && (
        <Aviso tom="neutro" icone="fa-box-archive" titulo={`Contrato encerrado em ${br(c.encerramento.data)} · ${c.encerramento.tipo}`}>
          <p>Motivo: {c.encerramento.motivo}</p>
          <p className="mt-1">
            Distrato:{" "}
            <ArquivoLink arquivo={c.encerramento.distrato} />
          </p>
          <p className="mt-1">Estado final: a ficha fica só para consulta. Aditivos e encerramento não se aplicam mais.</p>
        </Aviso>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <LazyTabs
            id="ficha-abas"
            activeTab={aba}
            header={
              <Cabecalho
                c={c}
                parte={parte?.nome}
                acoes={
                  <>
                    {vigente && ENCERRA.includes(papel) && (
                      <Button variant="tint" color="red" leftIcon="fa-box-archive" onClick={() => setModal("encerrar")}>Encerrar</Button>
                    )}
                    {vigente && ADITA.includes(papel) && (
                      <Button leftIcon="fa-plus" onClick={() => setModal("aditivo")}>Aditivo</Button>
                    )}
                    {/* Consultas e atalhos ficam no menu ⋯; à vista, só as ações sobre o contrato. */}
                    <MaisAcoes
                      itens={[
                        { label: "Exportar PDF", icon: "fa-file-pdf", onClick: () => exportarPdf(`${c.id}-${c.versao}`) },
                        ...(vigente || encerrado ? [{ label: "Ver cobranças", icon: "fa-file-invoice-dollar", onClick: () => ir(ROTAS.cobranca, { contrato: c.id }) }] : []),
                        ...(vigente ? [{ label: "Ver vigência e reajustes", icon: "fa-calendar-clock", onClick: () => ir(ROTAS.vigencia, { contrato: c.id }) }] : []),
                      ]}
                    />
                  </>
                }
              />
            }
            tabs={[
              { id: "resumo", title: "Resumo", component: () => <AbaResumo data={data} c={c} /> },
              {
                id: "conteudo",
                title: "Conteúdo",
                component: () => (
                  <AbaConteudo
                    c={c}
                    pode={ELABORA.includes(papel)}
                    podeAditivo={vigente && ADITA.includes(papel)}
                    onAditivo={() => setModal("aditivo")}
                    onNova={() => { setClausulaEditando(null); setModal("clausula"); }}
                    onEditar={(cl) => { setClausulaEditando(cl); setModal("clausula"); }}
                    onExcluir={(cl) =>
                      aplicar(
                        { clausulas: (c.clausulas ?? []).filter((x) => x.id !== cl.id) },
                        evento("versao", `Cláusula excluída: ${cl.titulo}`),
                        { title: "Cláusula excluída", content: `${cl.titulo} saiu do contrato ${c.id}.` },
                      )
                    }
                  />
                ),
              },
              { id: "dossie", title: "Dossiê", component: () => <AbaDossie data={data} c={c} abrir={() => ir(ROTAS.dossie, { contrato: c.id })} /> },
              {
                id: "versoes",
                title: "Versões & Aditivos",
                component: () => (
                  <AbaVersoes
                    c={c}
                    aditivos={aditivos}
                    podeRevisar={revisavel(c) && ELABORA.includes(papel)}
                    podeAditivo={vigente && ADITA.includes(papel)}
                    onRevisao={() => setModal("revisao")}
                    onAditivo={() => setModal("aditivo")}
                  />
                ),
              },
              { id: "linha-do-tempo", title: "Linha do Tempo", component: () => <AbaLinhaDoTempo eventos={c.eventos} /> },
            ]}
          />
        </div>

        {/* Workflows fixos ao rolar: a próxima ação fica sempre à vista (abaixo do cabeçalho do backoffice). */}
        <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <PainelWorkflow
            c={c}
            papel={papel}
            onSubmeter={submeter}
            onAprovar={() => setModal("aprovar")}
            onReprovar={() => setModal("reprovar")}
            onDespachar={() => setModal(c.assinatura === "pronto_coleta" ? "despachar" : "bloqueio")}
            onConcluir={() => setModal("concluir")}
            onRevisao={() => setModal("revisao")}
          />
        </aside>
      </div>

      {/* Modais ----------------------------------------------------------- */}
      <ModalAprovar
        key={`aprovar-${modal}`}
        show={modal === "aprovar"}
        c={c}
        onCancel={fechar}
        onSave={(nome, parecer) =>
          aplicar(
            { aprovacao: "aprovado", status: "pronto_coleta", fase: "assinatura", assinatura: "pronto_coleta", aprovador: { nome, data: TODAY, parecer } },
            { ...evento("workflow", "Aprovado com parecer", parecer), autor: nome },
            { title: "Contrato aprovado", content: `${c.id} está Pronto para Coleta: a assinatura foi liberada.` },
          )
        }
      />
      <ModalReprovar
        key={`reprovar-${modal}`}
        show={modal === "reprovar"}
        c={c}
        onCancel={fechar}
        onSave={(nome, motivo) =>
          aplicar(
            { aprovacao: "reprovado", status: "reprovado", fase: "elaboracao", reprovacao: { aprovador: nome, data: TODAY, motivo } },
            { ...evento("workflow", "Reprovado", motivo), autor: nome },
            { title: "Contrato reprovado", content: `${c.id} voltou para ajuste com o motivo registrado.` },
          )
        }
      />
      <ModalDespachar
        key={`despachar-${modal}`}
        show={modal === "despachar"}
        c={c}
        onCancel={fechar}
        onSave={(plataforma, envelope) =>
          aplicar(
            { assinatura: "em_assinatura", status: "em_assinatura", envelope: { plataforma, id: envelope, data: TODAY } },
            evento("workflow", `Despachado para assinatura · ${plataforma} ${envelope}`),
            { title: "Despachado para assinatura", content: `Envelope ${envelope} registrado na ${plataforma}.` },
          )
        }
      />
      <ModalBloqueio key={`bloqueio-${modal}`} show={modal === "bloqueio"} c={c} papel={papel} onCancel={fechar} />
      <ModalConcluir
        key={`concluir-${modal}`}
        show={modal === "concluir"}
        c={c}
        onCancel={fechar}
        onSave={() =>
          aplicar(
            { assinatura: "assinado", status: "vigente", fase: "vigente", assinadoDigital: true },
            evento("workflow", "Assinatura concluída · contrato Vigente"),
            { title: "Assinatura concluída", content: `${c.id} agora está Vigente. As cláusulas só mudam por Termo Aditivo.` },
          )
        }
      />
      <ModalRevisao
        key={`revisao-${modal}`}
        show={modal === "revisao"}
        c={c}
        onCancel={fechar}
        onSave={(tipo, fase, motivo, resumo, revisor) => {
          const nova = proximaVersao(c.versao, tipo);
          aplicar(
            {
              versao: nova,
              versoes: [...c.versoes, { versao: nova, data: TODAY, fase, motivo, resumo, revisor }],
              // Texto aprovado mudou: a aprovação anterior deixa de valer.
              ...(c.aprovacao === "aprovado" && { aprovacao: "elaboracao", status: "em_elaboracao", fase: "elaboracao", assinatura: "bloqueada", aprovador: undefined, envelope: undefined }),
            },
            { ...evento("versao", `Revisão ${tipo} ${nova}`, resumo), autor: revisor },
            { title: `Versão ${nova} registrada`, content: c.aprovacao === "aprovado" ? `${c.id}: ${c.versao} → ${nova}. A aprovação anterior deixou de valer: submeta de novo.` : `${c.id}: ${c.versao} → ${nova}.` },
          );
        }}
      />
      <ModalEncerrar
        key={`encerrar-${modal}`}
        show={modal === "encerrar"}
        c={c}
        tipos={data.tabelas.tipo_encerramento.filter((t) => t.ativo).map((t) => t.descricao)}
        onCancel={fechar}
        onSave={(tipo, motivo, distrato) =>
          aplicar(
            { status: "encerrado", fase: "encerramento", encerramento: { data: TODAY, tipo, motivo, distrato } },
            evento("encerramento", `Contrato encerrado · ${tipo}`, motivo),
            { title: "Contrato encerrado", content: `${c.id} foi encerrado em ${br(TODAY)}. Estado final.` },
          )
        }
      />
      <ModalClausula
        key={`clausula-${modal}-${clausulaEditando?.id ?? "nova"}`}
        show={modal === "clausula"}
        clausula={clausulaEditando}
        onCancel={fechar}
        onSave={(titulo, texto) => {
          const lista = c.clausulas ?? [];
          if (clausulaEditando) {
            aplicar(
              { clausulas: lista.map((x) => (x.id === clausulaEditando.id ? { ...x, titulo, texto, editada: true } : x)) },
              evento("versao", `Cláusula editada: ${titulo}`),
              { title: "Cláusula editada", content: `${titulo} ganhou o selo "Editada".` },
            );
          } else {
            aplicar(
              { clausulas: [...lista, { id: `cl_${Date.now()}`, titulo, texto, editada: true }] },
              evento("versao", `Cláusula adicionada: ${titulo}`),
              { title: "Cláusula adicionada", content: `${titulo} entrou no fim do contrato.` },
            );
          }
        }}
      />
      {modal === "aditivo" && (
        <ModalAditivo
          show
          data={{ ...data, aditivos: [...data.aditivos.filter((a) => a.contratoId !== c.id), ...aditivos] }}
          contrato={c}
          onCancel={fechar}
          onSave={(a) => {
            setAditivos((s) => [...s, a]);
            aplicar({}, evento("aditivo", `Aditivo ${a.codigo} (${a.tipo}) em elaboração`, a.motivo), { title: "Aditivo criado", content: `${a.codigo} nasceu Em Elaboração e segue a mesma trava de aprovação.` });
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cabeçalho                                                           */
/* ------------------------------------------------------------------ */

function Cabecalho({ c, parte, acoes }: { c: Contrato; parte?: string; acoes: ReactNode }) {
  const fase = FASES.find((f) => f.id === c.fase)!;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-extrabold text-brand-purple-dark">{c.id}</span>
            <span className="text-lg font-bold text-brand-purple-dark/50">{c.versao}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Selo s={STATUS[c.status]} />
            <Selo s={MODALIDADE[c.modalidade]} />
            <Tag item={c.categoria} variant="light-blue" />
            <Selo s={FLUXO[c.fluxo]} />
            {c.codigoManual && <Tag item="Manual / Legado" variant="dark-purple" leftIcon="fa-keyboard" />}
            {c.liminar && <Tag item="Liminar" variant="red" leftIcon="fa-gavel" title={`Processo ${c.liminar.processo} · ${c.liminar.vara}`} />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">{acoes}</div>
      </div>
      <div className="space-y-1">
        <p className="font-bold text-brand-purple-dark">{parte ?? "Parte não cadastrada"}</p>
        <p className="text-brand-purple-dark/80">{c.objeto}</p>
      </div>
      {c.liminar && (
        <p className="text-sm font-semibold text-red-dark">
          <Icon name="fa-gavel" className="mr-1" /> Processo {c.liminar.processo} · {c.liminar.vara}
        </p>
      )}
      <p className="text-sm text-brand-purple-dark/60">
        <Icon name={fase.icon} className="mr-1 text-brand-blue" /> Fase {fase.n} de 7 · {fase.label}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Painel de workflows: só a próxima ação                              */
/* ------------------------------------------------------------------ */

function PainelWorkflow({
  c,
  papel,
  onSubmeter,
  onAprovar,
  onReprovar,
  onDespachar,
  onConcluir,
  onRevisao,
}: {
  c: Contrato;
  papel: Papel;
  onSubmeter: () => void;
  onAprovar: () => void;
  onReprovar: () => void;
  onDespachar: () => void;
  onConcluir: () => void;
  onRevisao: () => void;
}) {
  const ultimoEnvio = [...c.eventos].reverse().find((e) => e.tipo === "workflow" && /ubmetido/.test(e.titulo));
  const elabora = ELABORA.includes(papel);
  const despacha = DESPACHA.includes(papel);
  return (
    <Bloco titulo="Workflows" icone="fa-diagram-project">
      {/* Aprovação */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-brand-purple-dark">Aprovação</h3>
          <Selo s={APROVACAO[c.aprovacao]} />
        </div>

        {c.aprovacao === "elaboracao" &&
          (elabora ? (
            <>
              <p className="text-sm text-brand-purple-dark/70">Quando o texto e os dados estiverem prontos, submeta para a Diretoria / Jurídico aprovar.</p>
              <Button className="w-full" leftIcon="fa-paper-plane" onClick={onSubmeter}>Submeter para aprovação</Button>
              <Button className="w-full" variant="outline" leftIcon="fa-code-branch" onClick={onRevisao}>Revisão formal</Button>
            </>
          ) : (
            <Aviso tom="info">Em elaboração pelo gestor da área. A aprovação começa quando ele submeter.</Aviso>
          ))}

        {c.aprovacao === "em_aprovacao" &&
          (APROVA.includes(papel) ? (
            <>
              <p className="text-sm text-brand-purple-dark/70">
                {ultimoEnvio ? `Submetido por ${ultimoEnvio.autor} em ${dataHora(ultimoEnvio.data)}.` : "Submetido para aprovação."} Leia o conteúdo e registre o parecer.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button color="green" leftIcon="fa-check" onClick={onAprovar}>Aprovar</Button>
                <Button variant="outline" color="red" leftIcon="fa-xmark" onClick={onReprovar}>Reprovar</Button>
              </div>
            </>
          ) : (
            <Aviso tom="atencao" icone="fa-hourglass-half" titulo="Aguardando aprovação de Diretoria / Jurídico">
              {ultimoEnvio ? `Submetido por ${ultimoEnvio.autor} em ${dataHora(ultimoEnvio.data)}. ` : ""}Você é avisado quando o aprovador registrar o parecer.
            </Aviso>
          ))}

        {c.aprovacao === "reprovado" && c.reprovacao && (
          <>
            <Aviso tom="risco" titulo={`Reprovado por ${c.reprovacao.aprovador} em ${br(c.reprovacao.data)}`}>
              <p>{c.reprovacao.motivo}</p>
              <p className="mt-1">Ajuste o contrato (revisão formal ou cláusulas) e ressubmeta.</p>
            </Aviso>
            {elabora && (
              <>
                <Button className="w-full" leftIcon="fa-rotate-right" onClick={onSubmeter}>Ressubmeter para aprovação</Button>
                <Button className="w-full" variant="outline" leftIcon="fa-code-branch" onClick={onRevisao}>Revisão formal</Button>
              </>
            )}
          </>
        )}

        {c.aprovacao === "aprovado" && c.aprovador && (
          <Dados
            colunas={2}
            itens={[
              ["Aprovador", c.aprovador.nome],
              ["Data", br(c.aprovador.data)],
            ]}
          />
        )}
        {c.aprovacao === "aprovado" && c.aprovador && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Parecer</p>
            <p className="mt-1 text-brand-purple-dark/90">{c.aprovador.parecer}</p>
          </div>
        )}
      </section>

      <hr className="border-brand-purple-dark/10" />

      {/* Assinatura */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-brand-purple-dark">Assinatura</h3>
          <Selo s={ASSINATURA[c.assinatura]} />
        </div>

        {c.assinatura === "bloqueada" && (
          <>
            <div className="flex items-start gap-3 rounded-xl bg-brand-purple-dark/5 p-4 text-sm text-brand-purple-dark/80">
              <Icon name="fa-lock" type="solid" className="mt-0.5 text-lg text-brand-purple-dark/50" />
              <p>Nenhum contrato vai para assinatura sem aprovação. A assinatura é liberada quando o aprovador aprovar com parecer.</p>
            </div>
            {despacha && (
              <Button className="w-full" variant="outline" leftIcon="fa-lock" onClick={onDespachar}>Despachar para assinatura</Button>
            )}
          </>
        )}

        {c.assinatura === "pronto_coleta" &&
          (despacha ? (
            <>
              <p className="text-sm text-brand-purple-dark/70">Aprovado. Envie para a plataforma de assinatura e registre o envelope.</p>
              <Button className="w-full" leftIcon="fa-signature" onClick={onDespachar}>Despachar para assinatura</Button>
            </>
          ) : (
            <Aviso tom="info">Pronto para Coleta: o operador de contratos despacha para assinatura.</Aviso>
          ))}

        {c.assinatura === "em_assinatura" && c.envelope && (
          <>
            <Dados colunas={2} itens={[["Plataforma", c.envelope.plataforma], ["Envelope", <span className="font-mono text-sm">{c.envelope.id}</span>], ["Despachado em", br(c.envelope.data)]]} />
            {despacha ? (
              <Button className="w-full" color="green" leftIcon="fa-circle-check" onClick={onConcluir}>Concluir assinatura</Button>
            ) : (
              <Aviso tom="info">Aguardando os signatários na {c.envelope.plataforma}. O operador registra a conclusão.</Aviso>
            )}
          </>
        )}

        {c.assinatura === "assinado" &&
          (c.envelope ? (
            <Dados
              colunas={2}
              itens={[
                ["Plataforma", c.envelope.plataforma],
                ["Envelope", <span className="font-mono text-sm">{c.envelope.id}</span>],
                ["Despachado em", br(c.envelope.data)],
                ["Formalização", c.assinadoDigital ? "Digital" : "Presencial"],
              ]}
            />
          ) : (
            <p className="text-sm text-brand-purple-dark/70">Assinatura presencial, sem envelope digital.</p>
          ))}
      </section>
    </Bloco>
  );
}

/* ------------------------------------------------------------------ */
/* Abas                                                                */
/* ------------------------------------------------------------------ */

function Secao({ titulo, icone, children }: { titulo: string; icone: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-brand-purple-dark">
        <Icon name={icone} className="text-brand-blue" /> {titulo}
      </h2>
      {children}
    </section>
  );
}

function AbaResumo({ data, c }: { data: ContratosData; c: Contrato }) {
  const p = parteDe(data, c);
  const campos = data.camposCategoria[c.categoria] ?? [];
  const valores = c.camposCategoria ?? {};
  const rotulos = [...new Set([...campos.map((f) => f.rotulo), ...Object.keys(valores)])];
  return (
    <div className="space-y-8">
      <Secao titulo="Qualificação da parte" icone="fa-handshake">
        {p ? (
          <Dados
            itens={[
              ["Parte", <span className="font-bold">{p.nome}</span>],
              ["Código", p.codigo],
              ["Tipo", `${p.tipo === "cliente" ? "Cliente" : "Fornecedor"} · ${SUBTIPO[p.subtipo]}`],
              [p.pessoa === "PJ" ? "CNPJ" : "CPF", p.documento],
              ["Contato", p.contato.nome],
              ["E-mail", p.contato.email],
              ["Telefone", p.contato.telefone],
              ...Object.entries(p.extras),
            ]}
          />
        ) : (
          <Aviso tom="atencao" titulo="Parte não encontrada">O cadastro da parte não foi localizado. Confira em Partes antes de submeter.</Aviso>
        )}
      </Secao>

      <Secao titulo="Objeto" icone="fa-bullseye">
        <p className="text-brand-purple-dark/90">{c.objeto}</p>
      </Secao>

      <Secao titulo="Condições financeiras" icone="fa-sack-dollar">
        <Dados
          itens={[
            ["Valor mensal", <Valor valor={c.valor} />],
            ["Fluxo", FLUXO[c.fluxo].label],
            ["Forma de pagamento", c.formaPagamento ?? "não informada"],
            ["Condição de pagamento", c.condicaoPagamento ?? "não informada"],
            ["Dia do vencimento", c.vencimentoDia ? `Dia ${c.vencimentoDia}` : "não informado"],
          ]}
        />
      </Secao>

      <Secao titulo="Vigência e índice" icone="fa-calendar-clock">
        <Dados
          itens={[
            ["Início", br(c.inicio)],
            ["Término", br(c.fim)],
            [
              "Dias restantes",
              c.status === "vigente" ? <Selo s={{ ...FAIXA[faixa(c.fim)], label: `${diasLabel(c.fim)} · ${FAIXA[faixa(c.fim)].label}` }} /> : <span className="text-brand-purple-dark/50">{c.status === "encerrado" ? "Encerrado" : "Conta a partir da assinatura"}</span>,
            ],
            ["Índice de reajuste", c.indice ?? "não informado"],
            ["Próxima data-base", br(c.dataBase)],
            ["Último reajuste", c.ultimoReajuste ? `${br(c.ultimoReajuste.data)} · ${c.ultimoReajuste.taxa.toLocaleString("pt-BR")}%` : "nenhum"],
            ...(c.experienciaAte ? ([["Fim da experiência", br(c.experienciaAte)]] as [string, ReactNode][]) : []),
          ]}
        />
      </Secao>

      <Secao titulo="Unidades" icone="fa-building">
        <div className="flex flex-wrap gap-2">
          {c.unidades.length ? c.unidades.map((u) => <Tag key={u} item={u} variant="dark-blue" leftIcon="fa-location-dot" />) : <span className="italic text-brand-purple-dark/50">nenhuma unidade informada</span>}
        </div>
      </Secao>

      <Secao titulo={`Campos da categoria ${c.categoria}`} icone="fa-list-check">
        {rotulos.length ? (
          <Dados itens={rotulos.map((r) => [r, valores[r] ?? <span className="italic text-brand-purple-dark/50">não informado</span>] as [string, ReactNode])} />
        ) : (
          <p className="text-sm text-brand-purple-dark/60">A categoria {c.categoria} não tem campos próprios.</p>
        )}
      </Secao>
    </div>
  );
}

function AbaConteudo({
  c,
  pode,
  podeAditivo,
  onAditivo,
  onNova,
  onEditar,
  onExcluir,
}: {
  c: Contrato;
  pode: boolean;
  podeAditivo: boolean;
  onAditivo: () => void;
  onNova: () => void;
  onEditar: (c: Clausula) => void;
  onExcluir: (c: Clausula) => void;
}) {
  if (c.modalidade === "corporativo") {
    return (
      <Secao titulo="Documento negociado" icone="fa-file-contract">
        <p className="text-sm text-brand-purple-dark/70">Contrato Corporativo nasce do documento da contraparte (Fluxo Invertido): o texto vale como está no arquivo.</p>
        {c.arquivo ? <ArquivoCartao arquivo={c.arquivo} /> : <Aviso tom="atencao" titulo="Arquivo não anexado">Anexe o documento negociado por revisão formal antes de submeter.</Aviso>}
      </Secao>
    );
  }

  if (c.modalidade === "especifico") {
    const campos = c.camposCategoria ?? {};
    const chave = ["IPTU", "Condomínio", "Garantia"];
    const destaques = chave.some((k) => k in campos) ? chave.map((k) => [k, campos[k]] as const) : Object.entries(campos);
    return (
      <div className="space-y-8">
        <Secao titulo="Pontos de atenção do contrato" icone="fa-star">
          {destaques.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {destaques.map(([k, v]) => (
                <div key={k} className="rounded-xl border border-brand-blue/20 bg-blue-light p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-dark">{k}</p>
                  <p className={cx("mt-1 font-bold", v ? "text-brand-purple-dark" : "italic font-normal text-brand-purple-dark/50")}>{v ?? "não informado"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-purple-dark/60">Nenhum campo da categoria preenchido.</p>
          )}
        </Secao>
        <Secao titulo="Documento" icone="fa-file-contract">
          {c.arquivo ? <ArquivoCartao arquivo={c.arquivo} /> : <p className="italic text-brand-purple-dark/50">Arquivo não anexado.</p>}
        </Secao>
      </div>
    );
  }

  // Adesão: cláusulas da minuta
  const clausulas = c.clausulas ?? [];
  const assinado = c.assinatura === "assinado";
  const editavel = pode && clausulasEditaveis(c);
  return (
    <Secao titulo="Cláusulas" icone="fa-file-lines">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-purple-dark/70">
          {c.minuta ? <>Gerado da minuta <strong>{c.minuta.codigo} {c.minuta.versao}</strong>. </> : null}
          {clausulas.length} cláusula{clausulas.length === 1 ? "" : "s"}
          {clausulas.some((x) => x.editada) && ` · ${clausulas.filter((x) => x.editada).length} editada(s)`}
        </p>
        {editavel && <Button variant="tint" leftIcon="fa-plus" onClick={onNova}>Adicionar cláusula</Button>}
      </div>

      {assinado || c.status === "encerrado" ? (
        <Aviso tom="neutro" titulo="Cláusulas travadas: contrato assinado" acoes={podeAditivo && <Button size="small" leftIcon="fa-plus" onClick={onAditivo}>Aditivo</Button>}>
          Depois de assinadas, as cláusulas só podem ser alteradas por Termo Aditivo. Mudar o texto sem aditivo invalidaria o que foi assinado.
        </Aviso>
      ) : !clausulasEditaveis(c) ? (
        <Aviso tom="info" titulo="Texto congelado para aprovação e assinatura">
          {c.aprovacao === "em_aprovacao" ? "O aprovador está analisando este texto. Se precisar mudar, peça a reprovação com o motivo." : "O texto aprovado é o que vai para assinatura. Para mudar, registre uma revisão formal: ela volta o contrato para aprovação."}
        </Aviso>
      ) : null}

      {clausulas.length === 0 ? (
        <EmptyStateCard icon="fa-file-lines" text="Sem cláusulas registradas">
          <p>{c.codigoManual ? "Contrato legado: o texto assinado está fora do sistema." : "Adicione as cláusulas do contrato."}</p>
        </EmptyStateCard>
      ) : (
        <ol className="space-y-3">
          {clausulas.map((cl) => (
            <li key={cl.id} className={cx("rounded-xl border p-4", cl.editada ? "border-yellow/40 bg-yellow/5" : "border-brand-purple-dark/10")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="flex flex-wrap items-center gap-2 font-bold text-brand-purple-dark">
                  {cl.titulo}
                  {cl.editada && <Tag item="Editada" variant="yellow" leftIcon="fa-pen" />}
                </p>
                {editavel && (
                  <span className="flex gap-1">
                    <Button size="small" variant="ghost" title="Editar cláusula" aria-label={`Editar ${cl.titulo}`} onClick={() => onEditar(cl)}>
                      <Icon name="fa-pen" />
                    </Button>
                    <Button size="small" variant="ghost" color="red" title="Excluir cláusula" aria-label={`Excluir ${cl.titulo}`} onClick={() => onExcluir(cl)}>
                      <Icon name="fa-trash" />
                    </Button>
                  </span>
                )}
                {!editavel && (assinado || c.status === "encerrado") && <Icon name="fa-lock" className="text-brand-purple-dark/30" />}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-brand-purple-dark/80">
                <TextoComTags texto={cl.texto} />
              </p>
            </li>
          ))}
        </ol>
      )}
    </Secao>
  );
}

function AbaDossie({ data, c, abrir }: { data: ContratosData; c: Contrato; abrir: () => void }) {
  const itens = dossieDe(data, c.id);
  const ok = dossieOk(data, c.id);
  const pendentes = itens.filter((i) => i.conformidade !== "conforme").length;
  return (
    <Secao titulo="Dossiê do contrato" icone="fa-folder-check">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {ok ? <Tag item="100% Conforme" variant="green" leftIcon="fa-check" /> : itens.length ? <Tag item={`${pendentes} pendente${pendentes === 1 ? "" : "s"}`} variant="yellow" leftIcon="fa-clock" /> : null}
          <span className="text-sm text-brand-purple-dark/60">{itens.length} documento(s)</span>
        </div>
        <Button variant="tint" leftIcon="fa-arrow-up-right-from-square" onClick={abrir}>Abrir em Conformidade</Button>
      </div>
      {itens.length === 0 ? (
        <EmptyStateCard icon="fa-folder-open" text="Sem checklist de dossiê">
          <p>Os documentos exigidos para este contrato ainda não foram listados. Monte o checklist em Conformidade — Dossiê.</p>
        </EmptyStateCard>
      ) : (
        <div className="overflow-x-auto">
          <Table
            id="ficha-dossie"
            rows={itens}
            rowId={(i) => i.id}
            col={[
              { label: "Natureza", render: (i) => i.natureza },
              { label: "Documento", render: (i) => <span className="font-semibold text-brand-purple-dark">{i.documento}</span> },
              { label: "Arquivo", render: (i) => (i.arquivo ? <ArquivoLink arquivo={i.arquivo} /> : <span className="italic text-brand-purple-dark/50">não enviado</span>) },
              { label: "Validade", render: (i) => br(i.validade) },
              { label: "Conformidade", render: (i) => <Selo s={CONFORMIDADE[i.conformidade]} /> },
              { label: "Auditor", render: (i) => i.auditor ?? "—" },
              { label: "Observações", className: "min-w-48", render: (i) => <span className="text-sm">{i.observacoes ?? "—"}</span> },
            ]}
          />
        </div>
      )}
    </Secao>
  );
}

function AbaVersoes({
  c,
  aditivos,
  podeRevisar,
  podeAditivo,
  onRevisao,
  onAditivo,
}: {
  c: Contrato;
  aditivos: Aditivo[];
  podeRevisar: boolean;
  podeAditivo: boolean;
  onRevisao: () => void;
  onAditivo: () => void;
}) {
  const versoes = [...c.versoes].reverse();
  return (
    <div className="space-y-8">
      <Secao titulo="Versões" icone="fa-code-branch">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-brand-purple-dark/70">Versão atual <strong>{c.versao}</strong>. O número é calculado na revisão formal, nunca digitado.</p>
          {podeRevisar && <Button variant="tint" leftIcon="fa-code-branch" onClick={onRevisao}>Revisão formal</Button>}
        </div>
        <div className="overflow-x-auto">
          <Table
            id="ficha-versoes"
            rows={versoes}
            rowId={(v) => v.versao}
            col={[
              { label: "Versão", render: (v) => <span className="font-bold text-brand-purple-dark">{v.versao}</span> },
              { label: "Data", render: (v) => br(v.data) },
              { label: "Fase", render: (v) => v.fase },
              { label: "Motivo", render: (v) => v.motivo },
              { label: "Resumo", className: "min-w-56", render: (v) => <span className="text-sm">{v.resumo}</span> },
              { label: "Revisor", render: (v) => v.revisor },
            ]}
          />
        </div>
      </Secao>

      <Secao titulo="Termos aditivos" icone="fa-file-plus">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-brand-purple-dark/70">{aditivos.length ? `${aditivos.length} aditivo(s).` : "Nenhum aditivo."} {c.status === "vigente" ? "Depois de assinado, toda mudança passa por Termo Aditivo." : c.status === "encerrado" ? "Contrato encerrado: não recebe aditivos." : "Aditivos só depois que o contrato estiver Vigente."}</p>
          {podeAditivo && <Button variant="tint" leftIcon="fa-plus" onClick={onAditivo}>Aditivo</Button>}
        </div>
        {aditivos.length > 0 && (
          <div className="overflow-x-auto">
            <Table
              id="ficha-aditivos"
              rows={[...aditivos].sort((a, b) => b.data.localeCompare(a.data))}
              rowId={(a) => a.id}
              col={[
                { label: "Aditivo", render: (a) => <span className="font-bold text-brand-purple-dark whitespace-nowrap">{a.codigo}</span> },
                { label: "Tipo", render: (a) => a.tipo },
                { label: "Data", render: (a) => br(a.data) },
                { label: "Nova vigência", render: (a) => (a.novaVigencia ? br(a.novaVigencia) : "—") },
                { label: "Novo valor", render: (a) => (a.novoValor != null ? <Valor valor={a.novoValor} /> : "—") },
                { label: "Motivo e impacto", className: "min-w-56", render: (a) => <div className="text-sm"><p>{a.motivo}</p><p className="text-brand-purple-dark/60">{a.impacto}</p></div> },
                { label: "Aprovação", render: (a) => <Selo s={APROVACAO[a.aprovacao]} /> },
                { label: "Assinatura", render: (a) => <Selo s={ASSINATURA[a.assinatura]} /> },
              ]}
            />
          </div>
        )}
      </Secao>
    </div>
  );
}

function AbaLinhaDoTempo({ eventos }: { eventos: Evento[] }) {
  const [tipo, setTipo] = useState<EventoTipo | null>(null);
  const ordenados = useMemo(() => [...eventos].sort((a, b) => b.data.localeCompare(a.data)), [eventos]);
  const presentes = (Object.keys(EVENTO) as EventoTipo[]).filter((t) => ordenados.some((e) => e.tipo === t));
  const lista = tipo ? ordenados.filter((e) => e.tipo === tipo) : ordenados;
  return (
    <Secao titulo="Linha do Tempo Forense" icone="fa-timeline">
      <p className="text-sm text-brand-purple-dark/70">Trilha de auditoria do contrato, do mais recente ao mais antigo. Nenhum evento é apagado ou editado.</p>
      <div className="flex flex-wrap items-center gap-2" aria-label="Filtrar por tipo">
        <button type="button" onClick={() => setTipo(null)} aria-pressed={tipo == null} className={cx("rounded-full px-3 py-1 text-sm font-bold", tipo == null ? "bg-brand-blue/30 text-brand-blue-dark" : "bg-brand-purple-dark/5 text-brand-purple-dark/60")}>
          Todos {ordenados.length}
        </button>
        {presentes.map((t) => (
          <button key={t} type="button" onClick={() => setTipo(tipo === t ? null : t)} aria-pressed={tipo === t} className={cx("rounded-full transition-opacity", tipo && tipo !== t && "opacity-40")}>
            <Tag item={`${EVENTO[t].label} ${ordenados.filter((e) => e.tipo === t).length}`} variant={EVENTO[t].variant} leftIcon={EVENTO[t].icon} pill />
          </button>
        ))}
      </div>
      <div className="pl-4 pt-2">
        <TimelineList
          item={lista.map((e) => ({
            icon: EVENTO[e.tipo].icon,
            color: e.tipo === "encerramento" || e.tipo === "cobranca" || e.tipo === "erp" ? "green" : "blue",
            children: (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag item={EVENTO[e.tipo].label} variant={EVENTO[e.tipo].variant} />
                  <time className="text-sm text-brand-purple-dark/60">{dataHora(e.data)}</time>
                </div>
                <p className="font-bold text-brand-purple-dark">{e.titulo}</p>
                {e.detalhe && <p className="text-sm text-brand-purple-dark/80">{e.detalhe}</p>}
                <p className="text-xs text-brand-purple-dark/50">por {e.autor}</p>
              </div>
            ),
          }))}
        />
      </div>
    </Secao>
  );
}

/* ------------------------------------------------------------------ */
/* Arquivos                                                            */
/* ------------------------------------------------------------------ */

const abrirArquivo = (a: Arquivo) => showToast({ type: "info", title: "Abrindo arquivo", content: `${a.nome} (${kb(a.tamanho)})`, closeTime: 3000 });

function ArquivoLink({ arquivo }: { arquivo: Arquivo }) {
  return (
    <button type="button" onClick={() => abrirArquivo(arquivo)} className="inline-flex items-center gap-1 font-bold text-brand-blue hover:underline">
      <Icon name="fa-file-pdf" /> {arquivo.nome}
    </button>
  );
}

function ArquivoCartao({ arquivo }: { arquivo: Arquivo }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-purple-dark/10 p-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-light text-red">
        <Icon name="fa-file-pdf" type="solid" className="text-2xl" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-all font-bold text-brand-purple-dark">{arquivo.nome}</p>
        <p className="text-sm text-brand-purple-dark/60">{kb(arquivo.tamanho)}</p>
      </div>
      <Button variant="outline" leftIcon="fa-eye" onClick={() => abrirArquivo(arquivo)}>Visualizar</Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modais                                                              */
/* ------------------------------------------------------------------ */

const err = (m?: string) => (m ? [m] : []);

function Rodape({ onCancel, children }: { onCancel: () => void; children: ReactNode }) {
  return (
    <div className={RODAPE_DRAWER}>
      <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
      {children}
    </div>
  );
}

function ModalAprovar({ show, c, onCancel, onSave }: { show: boolean; c: Contrato; onCancel: () => void; onSave: (nome: string, parecer: string) => void }) {
  const [nome, setNome] = useState("");
  const [parecer, setParecer] = useState("");
  const [e, setE] = useState<{ nome?: string; parecer?: string }>({});
  const salvar = () => {
    const x = { nome: nome.trim() ? undefined : "Informe o nome do aprovador.", parecer: parecer.trim() ? undefined : "O parecer é obrigatório: ele fica na trilha de auditoria." };
    if (x.nome || x.parecer) return setE(x);
    onSave(nome.trim(), parecer.trim());
  };
  return (
    <DrawerModal id="modal-aprovar" show={show} title={`Aprovar ${c.id} ${c.versao}`} onCancel={onCancel} variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-6">
        <p className="text-brand-purple-dark/80">Ao aprovar, a assinatura é liberada e o contrato fica Pronto para Coleta.</p>
        <Input id="aprovar-nome" label="Aprovador" placeholder="Nome e área (ex.: Carlos Menezes, Diretoria)" value={nome} onChange={(ev) => { setNome(ev.target.value); setE({}); }} errors={err(e.nome)} />
        <Input type="textarea" id="aprovar-parecer" label="Parecer" value={parecer} onChange={(ev) => { setParecer(ev.target.value); setE({}); }} errors={err(e.parecer)} />
        <Rodape onCancel={onCancel}>
          <Button color="green" leftIcon="fa-check" onClick={salvar}>Aprovar</Button>
        </Rodape>
      </div>
    </DrawerModal>
  );
}

function ModalReprovar({ show, c, onCancel, onSave }: { show: boolean; c: Contrato; onCancel: () => void; onSave: (nome: string, motivo: string) => void }) {
  const [nome, setNome] = useState("");
  const [motivo, setMotivo] = useState("");
  const [e, setE] = useState<{ nome?: string; motivo?: string }>({});
  const salvar = () => {
    const x = { nome: nome.trim() ? undefined : "Informe o nome do aprovador.", motivo: motivo.trim() ? undefined : "Explique o motivo: é o que o solicitante vai ajustar." };
    if (x.nome || x.motivo) return setE(x);
    onSave(nome.trim(), motivo.trim());
  };
  return (
    <DrawerModal id="modal-reprovar" show={show} title={`Reprovar ${c.id} ${c.versao}`} onCancel={onCancel} variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-6">
        <p className="text-brand-purple-dark/80">O contrato volta para ajuste com o seu motivo e pode ser ressubmetido.</p>
        <Input id="reprovar-nome" label="Aprovador" placeholder="Nome e área" value={nome} onChange={(ev) => { setNome(ev.target.value); setE({}); }} errors={err(e.nome)} />
        <Input type="textarea" id="reprovar-motivo" label="Motivo da reprovação" placeholder="O que precisa mudar para aprovar" value={motivo} onChange={(ev) => { setMotivo(ev.target.value); setE({}); }} errors={err(e.motivo)} />
        <Rodape onCancel={onCancel}>
          <Button color="red" leftIcon="fa-xmark" onClick={salvar}>Reprovar</Button>
        </Rodape>
      </div>
    </DrawerModal>
  );
}

function ModalDespachar({ show, c, onCancel, onSave }: { show: boolean; c: Contrato; onCancel: () => void; onSave: (p: Plataforma, envelope: string) => void }) {
  const [plataforma, setPlataforma] = useState<Plataforma>("Clicksign");
  const [envelope, setEnvelope] = useState("");
  const [e, setE] = useState<string>();
  const SUB: Record<Plataforma, string> = {
    Clicksign: "Padrão da clínica",
    DocuSign: "Quando a contraparte exige",
    "Gov.br": "Assinatura gov.br da pessoa física",
    "ICP-Brasil": "Certificado digital A1/A3",
  };
  const salvar = () => {
    if (!envelope.trim()) return setE("Informe o identificador do envelope criado na plataforma.");
    onSave(plataforma, envelope.trim());
  };
  return (
    <DrawerModal id="modal-despachar" show={show} title={`Despachar ${c.id} para assinatura`} onCancel={onCancel} variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-6">
        <p className="text-brand-purple-dark/80">Os signatários assinam na plataforma; aqui fica só o registro do envelope.</p>
        <RadioCards
          id="despachar-plataforma"
          title="Plataforma"
          value={plataforma}
          option={PLATAFORMAS.map((p) => ({ id: p, title: p, subtitle: SUB[p], icon: "fa-signature", ...(p === "Clicksign" && { badge: "Padrão" }) }))}
          onChange={(v) => setPlataforma(v as Plataforma)}
        />
        <Input id="despachar-envelope" label="Identificador do envelope" placeholder="ex.: CS-1A2B-3344" value={envelope} onChange={(ev) => { setEnvelope(ev.target.value); setE(undefined); }} errors={err(e)} />
        <Rodape onCancel={onCancel}>
          <Button leftIcon="fa-paper-plane" onClick={salvar}>Despachar</Button>
        </Rodape>
      </div>
    </DrawerModal>
  );
}

function ModalBloqueio({ show, c, papel, onCancel }: { show: boolean; c: Contrato; papel: Papel; onCancel: () => void }) {
  const fazer =
    c.aprovacao === "em_aprovacao"
      ? "Aguarde o parecer do aprovador (Diretoria / Jurídico). Quando ele aprovar, o botão Despachar é liberado aqui no painel."
      : c.aprovacao === "reprovado"
        ? "O contrato foi reprovado. Ajuste o que o aprovador pediu e ressubmeta para aprovação."
        : "O contrato ainda está em elaboração. Submeta para aprovação; depois de aprovado, despache.";
  return (
    <Modal id="modal-bloqueio" show={show} title="Bloqueio de Governança" onCancel={onCancel} variant="small">
      <div className="space-y-6">
        <Aviso tom="risco" icone="fa-lock" titulo={`${c.id} não pode ir para assinatura`}>
          <p>
            Motivo: a aprovação está <strong>{APROVACAO[c.aprovacao].label}</strong>. Nenhum contrato vai para assinatura sem aprovação com parecer.
          </p>
          <p className="mt-2">O que fazer: {fazer}</p>
        </Aviso>
        {APROVA.includes(papel) && c.aprovacao === "em_aprovacao" && <p className="text-sm text-brand-purple-dark/70">Você é aprovador: use Aprovar ou Reprovar no painel de workflows.</p>}
        <div className="flex justify-end">
          <Button onClick={onCancel}>Entendi</Button>
        </div>
      </div>
    </Modal>
  );
}

function ModalConcluir({ show, c, onCancel, onSave }: { show: boolean; c: Contrato; onCancel: () => void; onSave: () => void }) {
  return (
    <Modal id="modal-concluir" show={show} title="Concluir assinatura" onCancel={onCancel} variant="extra_small">
      <div className="space-y-6">
        <p className="text-brand-purple-dark/80">
          Confirme que todos os signatários assinaram o envelope <strong>{c.envelope?.id}</strong> na {c.envelope?.plataforma}.
        </p>
        <Aviso tom="info">O contrato passa a Vigente e as cláusulas travam: a partir daí, mudanças só por Termo Aditivo.</Aviso>
        <Rodape onCancel={onCancel}>
          <Button color="green" leftIcon="fa-circle-check" onClick={onSave}>Concluir assinatura</Button>
        </Rodape>
      </div>
    </Modal>
  );
}

function ModalRevisao({
  show,
  c,
  onCancel,
  onSave,
}: {
  show: boolean;
  c: Contrato;
  onCancel: () => void;
  onSave: (tipo: "minor" | "major", fase: string, motivo: string, resumo: string, revisor: string) => void;
}) {
  const [tipo, setTipo] = useState<"minor" | "major">("minor");
  const [fase, setFase] = useState(faseLabel(c.fase));
  const [motivo, setMotivo] = useState("");
  const [resumo, setResumo] = useState("");
  const [revisor, setRevisor] = useState("");
  const [e, setE] = useState<Record<string, string | undefined>>({});
  const limpa = () => setE({});
  const salvar = () => {
    const x = {
      fase: fase ? undefined : "Escolha a fase.",
      motivo: motivo.trim() ? undefined : "Informe o motivo da revisão.",
      resumo: resumo.trim() ? undefined : "Resuma o que mudou.",
      revisor: revisor.trim() ? undefined : "Informe o revisor.",
    };
    if (Object.values(x).some(Boolean)) return setE(x);
    onSave(tipo, fase, motivo.trim(), resumo.trim(), revisor.trim());
  };
  return (
    <DrawerModal id="modal-revisao" show={show} title="Revisão formal" onCancel={onCancel} variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <RadioGroup
            label="Tipo de revisão"
            field={{ id: "revisao-tipo", name: "tipo", value: tipo }}
            radio={[
              { value: "minor", label: "Minor" },
              { value: "major", label: "Major" },
            ]}
            onChange={(ev) => setTipo(ev.target.value as "minor" | "major")}
          />
          <div className="rounded-xl bg-blue-light px-4 py-2 text-blue-dark" aria-live="polite">
            <p className="text-xs font-bold uppercase tracking-wide">Prévia da versão</p>
            <p className="text-xl font-extrabold tabular-nums">
              {c.versao} <Icon name="fa-arrow-right" className="mx-1 text-base" /> {proximaVersao(c.versao, tipo)}
            </p>
          </div>
        </div>
        {c.aprovacao === "aprovado" && <Aviso tom="atencao" titulo="A aprovação volta para o início">O texto aprovado vai mudar: o contrato volta para Em Elaboração e precisa ser submetido de novo antes da assinatura.</Aviso>}
        <p className="text-sm text-brand-purple-dark/60">Minor para ajustes de texto; major quando muda objeto, valor ou partes. O número é calculado, nunca digitado.</p>
        <Input type="select" id="revisao-fase" label="Fase" prompt="Selecione a fase" value={fase} options={FASES.map((f) => ({ label: f.label, value: f.label }))} onChange={(v) => { setFase(v ?? ""); limpa(); }} errors={err(e.fase)} />
        <Input id="revisao-motivo" label="Motivo" placeholder="ex.: Ajuste pedido pelo aprovador" value={motivo} onChange={(ev) => { setMotivo(ev.target.value); limpa(); }} errors={err(e.motivo)} />
        <Input type="textarea" id="revisao-resumo" label="Resumo da mudança" value={resumo} onChange={(ev) => { setResumo(ev.target.value); limpa(); }} errors={err(e.resumo)} />
        <Input id="revisao-revisor" label="Revisor" placeholder="Nome e área" value={revisor} onChange={(ev) => { setRevisor(ev.target.value); limpa(); }} errors={err(e.revisor)} />
        <Rodape onCancel={onCancel}>
          <Button leftIcon="fa-code-branch" onClick={salvar}>Registrar {proximaVersao(c.versao, tipo)}</Button>
        </Rodape>
      </div>
    </DrawerModal>
  );
}

function ModalEncerrar({
  show,
  c,
  tipos,
  onCancel,
  onSave,
}: {
  show: boolean;
  c: Contrato;
  tipos: string[];
  onCancel: () => void;
  onSave: (tipo: string, motivo: string, distrato: Arquivo) => void;
}) {
  const [tipo, setTipo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [distrato, setDistrato] = useState<Arquivo>();
  const [e, setE] = useState<Record<string, string | undefined>>({});
  const salvar = () => {
    const x = {
      tipo: tipo ? undefined : "Escolha o tipo de encerramento.",
      motivo: motivo.trim() ? undefined : "Explique o motivo do encerramento.",
      distrato: distrato ? undefined : "Anexe o distrato ou termo de encerramento assinado.",
    };
    if (Object.values(x).some(Boolean)) return setE(x);
    onSave(tipo, motivo.trim(), distrato!);
  };
  return (
    <DrawerModal id="modal-encerrar" show={show} title={`Encerrar ${c.id}`} onCancel={onCancel} variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-6">
        <Aviso tom="atencao" titulo="Encerramento é o estado final">Depois de encerrado, o contrato não recebe aditivos, reajustes nem cobranças novas.</Aviso>
        <Input type="date" id="encerrar-data" label="Data do encerramento (hoje)" value={TODAY} readOnly disabled />
        <Input type="select" id="encerrar-tipo" label="Tipo" prompt="Selecione o tipo" value={tipo} options={tipos.map((t) => ({ label: t, value: t }))} onChange={(v) => { setTipo(v ?? ""); setE({}); }} errors={err(e.tipo)} />
        <Input type="textarea" id="encerrar-motivo" label="Motivo" value={motivo} onChange={(ev) => { setMotivo(ev.target.value); setE({}); }} errors={err(e.motivo)} />
        <div>
          <p className="mb-2 text-sm/4 font-bold text-brand-blue">Distrato anexo</p>
          <FileUploader
            variant="simplified"
            upload={{ ref: "encerrar-distrato", name: "distrato", accept: ".pdf", maxEntries: 1, maxFileSize: 10_000_000 }}
            onChange={(files) => { setDistrato(files[0] ? { nome: files[0].name, tamanho: files[0].size } : undefined); setE({}); }}
          />
          {e.distrato && <p className="mt-2 text-sm font-semibold text-red">{e.distrato}</p>}
        </div>
        <Rodape onCancel={onCancel}>
          <Button color="red" leftIcon="fa-box-archive" onClick={salvar}>Encerrar contrato</Button>
        </Rodape>
      </div>
    </DrawerModal>
  );
}

function ModalClausula({ show, clausula, onCancel, onSave }: { show: boolean; clausula: Clausula | null; onCancel: () => void; onSave: (titulo: string, texto: string) => void }) {
  const [titulo, setTitulo] = useState(clausula?.titulo ?? "");
  const [texto, setTexto] = useState(clausula?.texto ?? "");
  const [e, setE] = useState<{ titulo?: string; texto?: string }>({});
  const salvar = () => {
    const x = { titulo: titulo.trim() ? undefined : "Dê um título à cláusula.", texto: texto.trim() ? undefined : "Escreva o texto da cláusula." };
    if (x.titulo || x.texto) return setE(x);
    onSave(titulo.trim(), texto.trim());
  };
  return (
    <DrawerModal id="modal-clausula" show={show} title={clausula ? "Editar cláusula" : "Adicionar cláusula"} onCancel={onCancel} variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-6">
        <Input id="clausula-titulo" label="Título" placeholder="ex.: Cláusula 10ª — Da Confidencialidade" value={titulo} onChange={(ev) => { setTitulo(ev.target.value); setE({}); }} errors={err(e.titulo)} />
        <Input type="textarea" id="clausula-texto" label="Texto" value={texto} onChange={(ev) => { setTexto(ev.target.value); setE({}); }} errors={err(e.texto)} />
        <Aviso tom="info">A cláusula alterada ganha o selo "Editada", para o aprovador ver o que saiu da minuta padrão.</Aviso>
        <Rodape onCancel={onCancel}>
          <Button leftIcon="fa-check" onClick={salvar}>{clausula ? "Salvar cláusula" : "Adicionar"}</Button>
        </Rodape>
      </div>
    </DrawerModal>
  );
}
