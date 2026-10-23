/**
 * Gestão de Contratos — Ficha do Contrato.
 *
 * O hub de ações sobre um contrato: cabeçalho com os selos, abas com a ficha
 * consolidada (FR-040), o conteúdo por modalidade (FR-048), o dossiê, as
 * versões com o texto de cada uma (RN-011) e os aditivos, o histórico de
 * workflow (RN-071), a Linha do Tempo Forense (RN-067) e a trilha de auditoria
 * do contrato (RN-068); ao lado, o painel de workflows com SÓ a próxima ação
 * válida (FR-036: submeter, aprovar/reprovar, ressubmeter, despachar,
 * concluir). A assinatura fica travada com cadeado até a aprovação: é a regra
 * central do produto, e quem tenta despachar antes vê o "Bloqueio de
 * Governança" (FR-037). Toda ação fora do estado válido é recusada com
 * mensagem e não muda nada; toda gravação entra na auditoria (RN-066).
 *
 * Feito na tela (componente novo para o dev): o painel de workflows, o cabeçalho
 * da ficha com os selos, a lista de cláusulas com o selo "Editada", os cartões
 * de destaque do Específico e a legenda de cores da Linha do Tempo. O resto é
 * `lazy_tabs`, `modal`, `input`, `radio_selector`, `radio_cards`,
 * `file_uploader`, `table`, `timeline_list`, `tag`, `button` e
 * `empty_state_card`.
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
import { ModalAditivo, aditarContrato } from "./gestao-de-contratos/FormAditivo.js";
import { ModalPdfContrato } from "./gestao-de-contratos/PdfContrato.js";
import {
  ANEXO_MAX, ANEXO_TIPOS, APROVACAO, ASSINATURA, CONFORMIDADE, ERP, FAIXA, FASES, FLUXO, MODALIDADE, PAPEIS, PAPEL_WORKFLOW, PLATAFORMAS, STATUS, SUBTIPO, TODAY,
  br, competencia, diasLabel, dossieDe, dossieOk, faixa, faseLabel, faseNumerada, kb, parteDe, proximaVersao, rotuloAditivo, validarAnexo,
  type Aditivo, type Arquivo, type Clausula, type Contrato, type ContratosData, type Evento, type EventoTipo, type Papel, type Plataforma,
  type RegistroAuditoria, type RegistroWorkflow,
} from "./gestao-de-contratos/model.js";
import { Aviso, Bloco, ContratosShell, Dados, ROTAS, Selo, TextoComTags, Valor, papelDe, secaoInfo, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";

/* ------------------------------------------------------------------ */
/* Controles: modal e aba                                              */
/* ------------------------------------------------------------------ */

export const MODAIS = ["aprovar", "reprovar", "despachar", "bloqueio", "concluir", "revisao", "encerrar", "aditivo", "clausula", "pdf"] as const;
export type ModalId = (typeof MODAIS)[number] | "excluir-clausula";

export const ABAS = [
  { id: "resumo", label: "Resumo" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "dossie", label: "Dossiê" },
  { id: "versoes", label: "Versões & Aditivos" },
  { id: "workflow", label: "Histórico de workflow" },
  { id: "linha-do-tempo", label: "Linha do Tempo" },
  { id: "auditoria", label: "Auditoria" },
] as const;
type AbaId = (typeof ABAS)[number]["id"];

/* ------------------------------------------------------------------ */
/* Papéis: quem faz o quê na ficha                                     */
/* ------------------------------------------------------------------ */

const ELABORA: Papel[] = ["solicitante", "operador", "juridico", "administrador"];
const APROVA: Papel[] = ["aprovador", "diretoria", "administrador"];
const DESPACHA: Papel[] = ["operador", "juridico", "administrador"];
const ENCERRA: Papel[] = ["diretoria", "operador", "juridico", "administrador"];
const ADITA: Papel[] = ["juridico", "operador", "solicitante", "administrador"];

/**
 * Cor e ícone de cada tipo de evento da Linha do Tempo Forense (RN-067), só
 * com as variantes de `tag` existentes: criação azul, versão roxo, dossiê
 * ciano, cobrança âmbar, ERP verde, distrato vermelho. Aditivo é rosa na
 * especificação, mas o `tag` não tem rosa: usa laranja até o Phoenix ganhar
 * a variante. Workflow varia pelo evento (`corEvento`).
 */
const EVENTO: Record<EventoTipo, { label: string; variant: TagVariant; icon: string }> = {
  criacao: { label: "Criação", variant: "light-blue", icon: "fa-sparkles" },
  workflow: { label: "Workflow", variant: "yellow", icon: "fa-diagram-project" },
  versao: { label: "Versão", variant: "light-purple", icon: "fa-code-branch" },
  aditivo: { label: "Aditivo", variant: "orange", icon: "fa-file-plus" },
  dossie: { label: "Dossiê", variant: "cyan", icon: "fa-folder-check" },
  cobranca: { label: "Cobrança", variant: "yellow", icon: "fa-file-invoice-dollar" },
  erp: { label: "ERP", variant: "green", icon: "fa-arrows-rotate" },
  encerramento: { label: "Distrato", variant: "red", icon: "fa-box-archive" },
};
/** Workflow aprovado ou assinado é verde, reprovado vermelho, os demais âmbar (RN-067). */
function corEvento(e: Evento): TagVariant {
  if (e.tipo !== "workflow") return EVENTO[e.tipo].variant;
  if (/reprova/i.test(e.titulo)) return "red";
  if (/aprovado|assinatura conclu|assinado/i.test(e.titulo)) return "green";
  return "yellow";
}

/** Quem está usando o protótipo (o mesmo usuário do cabeçalho). */
const USUARIO = "Marina Alves";
const perfilDe = (p: Papel) => PAPEIS.find((x) => x.id === p)?.label ?? p;

const agora = () => `${TODAY}T${new Date().toTimeString().slice(0, 5)}`;
const dataHora = (iso: string) => (iso.length > 10 ? `${br(iso)} às ${iso.slice(11, 16)}` : br(iso));
const uid = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

/** Mensagem exata do FR-037. */
export const BLOQUEIO_GOVERNANCA = "Bloqueio de Governança: O contrato NÃO pode ser enviado para assinatura sem prévia aprovação!";
/** Mensagem das cláusulas travadas (RN-069, FR-048). */
export const CLAUSULAS_TRAVADAS = "Cláusulas de contrato assinado só podem ser alteradas por Termo Aditivo";

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
  const papel = papelDe(context, "administrador");
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
                  <Button leftIcon="fa-arrow-left" onClick={() => context.navigate(ROTAS.carteira, { controls: {} })}>Voltar à carteira</Button>
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
  const ok: Record<(typeof MODAIS)[number], boolean> = {
    aprovar: c.aprovacao === "em_aprovacao" && APROVA.includes(papel),
    reprovar: c.aprovacao === "em_aprovacao" && APROVA.includes(papel),
    despachar: c.assinatura === "pronto_coleta" && DESPACHA.includes(papel),
    bloqueio: c.aprovacao !== "aprovado",
    concluir: c.assinatura === "em_assinatura" && DESPACHA.includes(papel),
    revisao: revisavel(c) && ELABORA.includes(papel),
    encerrar: encerravel(c) && ENCERRA.includes(papel),
    aditivo: c.status === "vigente" && ADITA.includes(papel),
    clausula: c.modalidade === "adesao" && clausulasEditaveis(c) && ELABORA.includes(papel),
    pdf: true,
  };
  return ok[m as (typeof MODAIS)[number]] ? (m as ModalId) : null;
}

/** Cláusulas mudam enquanto o contrato não está assinado nem encerrado (RN-069). */
const clausulasEditaveis = (c: Contrato) => c.assinatura !== "assinado" && c.status !== "encerrado";
/** Revisão formal em qualquer fase até o encerramento (FR-044). */
const revisavel = (c: Contrato) => c.status !== "encerrado";
/** Só Vigente ou Em Assinatura podem ser encerrados; Encerrado é final (RN-038). */
const encerravel = (c: Contrato) => c.status === "vigente" || c.status === "em_assinatura";

/** O que a ação grava além do patch: evento, histórico de workflow e auditoria (RN-066, RN-071). */
type Registro = {
  evento?: Omit<Evento, "id" | "data" | "autor"> & { autor?: string };
  workflow?: Omit<RegistroWorkflow, "id" | "data">[];
  auditoria: { acao: string; detalhes: string; usuario?: string; perfil?: string };
  toast: { title: string; content: string };
};

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
  const [clausulaAlvo, setClausulaAlvo] = useState<Clausula | null>(null);
  const aba = (ABAS.find((a) => a.id === controls.aba)?.id ?? "resumo") as AbaId;

  const parte = parteDe(data, c);
  const fechar = () => { setModal(null); setClausulaAlvo(null); };

  /** Grava o patch com o evento, o histórico e a auditoria, no mesmo momento. */
  const aplicar = (patch: Partial<Contrato> | ((s: Contrato) => Partial<Contrato>), r: Registro) => {
    const quando = agora();
    setC((s) => {
      const p = typeof patch === "function" ? patch(s) : patch;
      return {
        ...s,
        ...p,
        eventos: r.evento ? [...s.eventos, { id: uid("ev"), data: quando, autor: USUARIO, ...r.evento }] : s.eventos,
        workflow: [...s.workflow, ...(r.workflow ?? []).map((w) => ({ ...w, id: uid("wf"), data: quando }))],
        auditoria: [...s.auditoria, { id: uid("aud"), data: quando, usuario: r.auditoria.usuario ?? USUARIO, perfil: r.auditoria.perfil ?? perfilDe(papel), acao: r.auditoria.acao, detalhes: r.auditoria.detalhes }],
      };
    });
    fechar();
    showToast({ type: "success", ...r.toast, closeTime: 4000 });
  };
  /** Transição fora do estado válido: recusada com mensagem, nada muda (FR-036). */
  const recusar = (content: string) => { fechar(); showToast({ type: "error", title: "Ação não permitida", content, closeTime: 5000 }); };

  const encerrado = c.status === "encerrado";
  const vigente = c.status === "vigente";
  /** Nova versão com a cópia das cláusulas naquele momento (RN-010, RN-011). */
  const versaoNova = (tipo: "minor" | "major", fase: string, motivo: string, resumo: string, revisor: string) => {
    const versao = proximaVersao(c.versao, tipo);
    return { versao, versoes: [...c.versoes, { versao, data: TODAY, fase, motivo, resumo, revisor, ...(c.clausulas && { clausulas: c.clausulas }) }] };
  };

  /* Ações do painel (RN-032 a RN-037) ------------------------------------ */
  const submeter = () => {
    if (c.aprovacao !== "elaboracao" && c.aprovacao !== "reprovado") return recusar(`A submissão só é aceita a partir de "Em Elaboração" ou "Reprovado (Em Ajuste)". ${c.id} está ${APROVACAO[c.aprovacao].label}.`);
    const re = c.aprovacao === "reprovado";
    aplicar(
      { status: "em_aprovacao", aprovacao: "em_aprovacao", fase: "aprovacao", reprovacao: undefined },
      {
        evento: { tipo: "workflow", titulo: re ? "Ressubmetido para aprovação" : "Submetido para aprovação" },
        workflow: [{ workflow: "aprovacao", de: APROVACAO[c.aprovacao].label, para: "Em Aprovação", usuario: USUARIO, papel: PAPEL_WORKFLOW.submissao }],
        auditoria: { acao: "WORKFLOW_SUBMETER", detalhes: `${APROVACAO[c.aprovacao].label} → Em Aprovação · ${faseNumerada("aprovacao")}` },
        toast: { title: re ? "Contrato ressubmetido" : "Contrato submetido", content: `${c.id} ${c.versao} foi para aprovação da Diretoria / Jurídico.` },
      },
    );
  };
  const aprovar = (nome: string, parecer: string) => {
    if (c.aprovacao !== "em_aprovacao") return recusar(`Só é possível aprovar um contrato Em Aprovação. ${c.id} está ${APROVACAO[c.aprovacao].label}.`);
    const v = versaoNova("minor", faseNumerada("aprovacao"), "Aprovação de Governança", parecer, nome);
    aplicar(
      { aprovacao: "aprovado", status: "pronto_coleta", fase: "assinatura", assinatura: "pronto_coleta", aprovador: { nome, data: TODAY, parecer }, ...v },
      {
        evento: { tipo: "workflow", titulo: "Aprovado com parecer", detalhe: parecer, autor: nome },
        workflow: [
          { workflow: "aprovacao", de: "Em Aprovação", para: "Aprovado", parecer, usuario: nome, papel: PAPEL_WORKFLOW.aprovacao },
          { workflow: "assinatura", de: ASSINATURA.bloqueada.label, para: ASSINATURA.pronto_coleta.label, usuario: "Sistema", papel: PAPEL_WORKFLOW.liberacao },
        ],
        auditoria: { acao: "WORKFLOW_APROVAR", detalhes: `Aprovado (${v.versao}): ${parecer}`, usuario: nome },
        toast: { title: "Contrato aprovado", content: `${c.id} ${v.versao} está Pronto para Coleta: a assinatura foi liberada.` },
      },
    );
  };
  const reprovar = (nome: string, motivo: string) => {
    if (c.aprovacao !== "em_aprovacao") return recusar(`Só é possível reprovar um contrato Em Aprovação. ${c.id} está ${APROVACAO[c.aprovacao].label}.`);
    const parecer = `Reprovado por ${nome}: ${motivo}`;
    aplicar(
      { aprovacao: "reprovado", status: "reprovado", fase: "elaboracao", assinatura: "bloqueada", reprovacao: { aprovador: nome, data: TODAY, motivo } },
      {
        evento: { tipo: "workflow", titulo: "Reprovado", detalhe: parecer, autor: nome },
        workflow: [{ workflow: "aprovacao", de: "Em Aprovação", para: "Reprovado (Em Ajuste)", parecer, usuario: nome, papel: PAPEL_WORKFLOW.reprovacao }],
        auditoria: { acao: "WORKFLOW_REPROVAR", detalhes: parecer, usuario: nome },
        toast: { title: "Contrato reprovado", content: `${c.id} voltou para ${faseNumerada("elaboracao")} com o motivo registrado.` },
      },
    );
  };
  /** Despachar sem aprovação abre o Bloqueio de Governança (RN-035); Vigente não é despachado de novo (RN-036). */
  const pedirDespacho = () => {
    if (c.status === "vigente" || c.assinatura === "assinado") return recusar(`${c.id} já está Vigente e não pode ser despachado de novo.`);
    if (c.aprovacao !== "aprovado") return setModal("bloqueio");
    if (c.assinatura !== "pronto_coleta") return recusar(`O despacho só é aceito a partir de "Pronto para Coleta". ${c.id} está ${ASSINATURA[c.assinatura].label}.`);
    setModal("despachar");
  };
  const despachar = (plataforma: Plataforma, envelope: string) => {
    if (c.aprovacao !== "aprovado") return setModal("bloqueio");
    if (c.assinatura !== "pronto_coleta") return recusar(`O despacho só é aceito a partir de "Pronto para Coleta".`);
    aplicar(
      { assinatura: "em_assinatura", status: "em_assinatura", envelope: { plataforma, id: envelope, data: TODAY } },
      {
        evento: { tipo: "workflow", titulo: `Despachado para assinatura · ${plataforma} ${envelope}` },
        workflow: [{ workflow: "assinatura", de: "Pronto para Coleta", para: "Em Assinatura", parecer: `${plataforma} · envelope ${envelope}`, usuario: USUARIO, papel: PAPEL_WORKFLOW.despacho }],
        auditoria: { acao: "WORKFLOW_DESPACHAR", detalhes: `${plataforma} ${envelope}` },
        toast: { title: "Despachado para assinatura", content: `Envelope ${envelope} registrado na ${plataforma} em ${br(TODAY)}.` },
      },
    );
  };
  const concluir = () => {
    if (c.assinatura !== "em_assinatura") return recusar(`A conclusão só é aceita a partir de "Em Assinatura". ${c.id} está ${ASSINATURA[c.assinatura].label}.`);
    const v = versaoNova("minor", faseNumerada("assinatura"), "Conclusão da assinatura", "Contrato Vigente.", USUARIO);
    aplicar(
      { assinatura: "assinado", status: "vigente", fase: "vigente", assinadoDigital: true, assinaturaConcluida: TODAY, ...v },
      {
        evento: { tipo: "workflow", titulo: "Assinatura concluída · contrato Vigente" },
        workflow: [{ workflow: "assinatura", de: "Em Assinatura", para: "Assinado Digitalmente", usuario: c.envelope?.plataforma ?? USUARIO, papel: PAPEL_WORKFLOW.conclusao }],
        auditoria: { acao: "WORKFLOW_CONCLUIR", detalhes: `Assinado Digitalmente · Vigente (${v.versao})` },
        toast: { title: "Assinatura concluída", content: `${c.id} ${v.versao} agora está Vigente. As cláusulas só mudam por Termo Aditivo.` },
      },
    );
  };

  /* Cláusulas (RN-069) --------------------------------------------------- */
  const salvarClausula = (titulo: string, texto: string) => {
    if (!clausulasEditaveis(c)) return recusar(CLAUSULAS_TRAVADAS);
    const lista = c.clausulas ?? [];
    if (clausulaAlvo) {
      aplicar(
        { clausulas: lista.map((x) => (x.id === clausulaAlvo.id ? { ...x, titulo, texto, editada: true } : x)) },
        { auditoria: { acao: "EDICAO_CLAUSULA", detalhes: `Cláusula "${clausulaAlvo.titulo}" alterada${clausulaAlvo.titulo !== titulo ? ` para "${titulo}"` : ""}.` }, toast: { title: "Cláusula editada", content: `${titulo} ganhou o selo "Editada".` } },
      );
    } else {
      aplicar(
        { clausulas: [...lista, { id: uid("cl"), titulo, texto, editada: true, obrigatoria: false }] },
        { auditoria: { acao: "INCLUSAO_CLAUSULA", detalhes: `Cláusula "${titulo}" incluída no fim do contrato.` }, toast: { title: "Cláusula adicionada", content: `${titulo} entrou no fim do contrato.` } },
      );
    }
  };
  const excluirClausula = (cl: Clausula) => {
    if (!clausulasEditaveis(c)) return recusar(CLAUSULAS_TRAVADAS);
    aplicar(
      { clausulas: (c.clausulas ?? []).filter((x) => x.id !== cl.id) },
      { auditoria: { acao: "EXCLUSAO_CLAUSULA", detalhes: `Cláusula removida. Título: "${cl.titulo}". Texto: "${cl.texto}"` }, toast: { title: "Cláusula excluída", content: `${cl.titulo} saiu do contrato ${c.id}.` } },
    );
  };

  return (
    <div className="space-y-6">
      {/* FR-051: aviso do encerrado com data, motivo e distrato. */}
      {encerrado && c.encerramento && (
        <Aviso tom="neutro" icone="fa-box-archive" titulo={`Contrato encerrado em ${br(c.encerramento.data)} · ${c.encerramento.tipo}`}>
          <p>Motivo: [{c.encerramento.tipo}] {c.encerramento.motivo}</p>
          <p className="mt-1">
            Distrato: {c.encerramento.distrato ? <ArquivoLink arquivo={c.encerramento.distrato} /> : <span className="italic">não anexado</span>}
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
                    {encerravel(c) && ENCERRA.includes(papel) && (
                      <Button variant="tint" color="red" leftIcon="fa-box-archive" onClick={() => setModal("encerrar")}>Encerrar</Button>
                    )}
                    {vigente && ADITA.includes(papel) && (
                      <Button leftIcon="fa-plus" onClick={() => setModal("aditivo")}>Aditivo</Button>
                    )}
                    {/* Consultas e atalhos (FR-043, FR-049) ficam no menu ⋯; à vista, só as ações sobre o contrato. */}
                    <MaisAcoes
                      itens={[
                        { label: "Exportar PDF", icon: "fa-file-pdf", onClick: () => setModal("pdf") },
                        { label: "Ver cobranças", icon: "fa-file-invoice-dollar", onClick: () => ir(ROTAS.cobranca, { contrato: c.id }) },
                        { label: "Ver vigência e aditivos", icon: "fa-calendar-clock", onClick: () => ir(ROTAS.vigencia, { contrato: c.id }) },
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
                    data={data}
                    c={c}
                    pode={ELABORA.includes(papel)}
                    podeAditivo={vigente && ADITA.includes(papel)}
                    onAditivo={() => setModal("aditivo")}
                    onNova={() => { setClausulaAlvo(null); setModal("clausula"); }}
                    onEditar={(cl) => { setClausulaAlvo(cl); setModal("clausula"); }}
                    onExcluir={(cl) => { setClausulaAlvo(cl); setModal("excluir-clausula"); }}
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
              { id: "workflow", title: "Histórico de workflow", component: () => <AbaWorkflow registros={c.workflow} /> },
              { id: "linha-do-tempo", title: "Linha do Tempo", component: () => <AbaLinhaDoTempo eventos={linhaDoTempo(data, c, aditivos)} /> },
              { id: "auditoria", title: "Auditoria", component: () => <AbaAuditoria c={c} /> },
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
            onDespachar={pedirDespacho}
            onConcluir={() => setModal("concluir")}
            onRevisao={() => setModal("revisao")}
          />
        </aside>
      </div>

      {/* Modais ----------------------------------------------------------- */}
      <ModalAprovar key={`aprovar-${modal}`} show={modal === "aprovar"} c={c} onCancel={fechar} onSave={aprovar} />
      <ModalReprovar key={`reprovar-${modal}`} show={modal === "reprovar"} c={c} onCancel={fechar} onSave={reprovar} />
      <ModalDespachar key={`despachar-${modal}`} show={modal === "despachar"} c={c} onCancel={fechar} onSave={despachar} />
      <ModalBloqueio key={`bloqueio-${modal}`} show={modal === "bloqueio"} c={c} papel={papel} onCancel={fechar} />
      <ModalConcluir key={`concluir-${modal}`} show={modal === "concluir"} c={c} onCancel={fechar} onSave={concluir} />
      <ModalRevisao
        key={`revisao-${modal}`}
        show={modal === "revisao"}
        c={c}
        onCancel={fechar}
        onSave={(tipo, fase, motivo, resumo, revisor) => {
          if (!revisavel(c)) return recusar("Contrato encerrado não recebe revisão formal.");
          const v = versaoNova(tipo, fase, motivo, resumo, revisor);
          aplicar(v, {
            auditoria: { acao: "REVISAO_FORMAL", detalhes: `Revisão ${tipo} ${c.versao} → ${v.versao}: ${motivo}`, usuario: revisor },
            toast: { title: `Versão ${v.versao} registrada`, content: `${c.id}: ${c.versao} → ${v.versao}, com a cópia das cláusulas.` },
          });
        }}
      />
      <ModalEncerrar
        key={`encerrar-${modal}`}
        show={modal === "encerrar"}
        c={c}
        tipos={data.tabelas.tipo_encerramento.filter((t) => t.ativo).map((t) => t.descricao)}
        onCancel={fechar}
        onSave={(dataEnc, tipo, motivo, distrato) => {
          if (!encerravel(c)) return recusar(`Só contratos Vigentes ou Em Assinatura podem ser encerrados. ${c.id} está ${STATUS[c.status].label}.`);
          const origem = STATUS[c.status].label;
          const registrado = `[${tipo}] ${motivo}`;
          aplicar(
            (s) => ({
              status: "encerrado",
              fase: "encerramento",
              // O novo distrato substitui o anterior; sem arquivo novo, o anterior é mantido (RN-038).
              encerramento: { data: dataEnc, tipo, motivo, origem, ...((distrato ?? s.encerramento?.distrato) && { distrato: distrato ?? s.encerramento?.distrato }) },
              // "{versão}-ENC" entra no histórico sem mudar a versão atual (RN-010).
              versoes: [...s.versoes, { versao: `${s.versao}-ENC`, data: dataEnc, fase: faseNumerada("encerramento"), motivo: registrado, resumo: "Contrato encerrado. Estado final.", revisor: USUARIO, ...(s.clausulas && { clausulas: s.clausulas }) }],
            }),
            {
              evento: { tipo: "encerramento", titulo: "Encerramento & Distrato Formal", detalhe: registrado },
              workflow: [{ workflow: "ciclo", de: origem, para: "Encerrado", parecer: registrado, usuario: USUARIO, papel: PAPEL_WORKFLOW.encerramento }],
              auditoria: { acao: "ENCERRAMENTO", detalhes: `${registrado}${distrato ? ` · distrato ${distrato.nome}` : ""}` },
              toast: { title: "Contrato encerrado", content: `${c.id} foi encerrado em ${br(dataEnc)}. Estado final.` },
            },
          );
        }}
      />
      <ModalClausula key={`clausula-${modal}-${clausulaAlvo?.id ?? "nova"}`} show={modal === "clausula"} clausula={clausulaAlvo} onCancel={fechar} onSave={salvarClausula} />
      <Modal id="modal-excluir-clausula" show={modal === "excluir-clausula" && !!clausulaAlvo} title="Excluir cláusula" onCancel={fechar} variant="extra_small">
        <div className="space-y-6">
          <p className="text-brand-purple-dark/80">
            Excluir <strong>{clausulaAlvo?.titulo}</strong> do contrato {c.id}? O título e o texto removidos ficam guardados na auditoria.
          </p>
          <Rodape onCancel={fechar}>
            <Button color="red" leftIcon="fa-trash" onClick={() => clausulaAlvo && excluirClausula(clausulaAlvo)}>Excluir cláusula</Button>
          </Rodape>
        </div>
      </Modal>
      {modal === "aditivo" && (
        <ModalAditivo
          show
          data={{ ...data, contratos: data.contratos.map((x) => (x.id === c.id ? c : x)), aditivos: [...data.aditivos.filter((a) => a.contratoId !== c.id), ...aditivos] }}
          contrato={c}
          onCancel={fechar}
          onSave={(a) => {
            if (c.status !== "vigente") return recusar("Só contratos Vigentes recebem aditivo.");
            setAditivos((s) => [...s, a]);
            setC((s) => aditarContrato(s, a, USUARIO, perfilDe(papel)));
            fechar();
            showToast({ type: "success", title: `${rotuloAditivo(a)} registrado`, content: `${a.codigo}: vigência até ${br(a.novaVigencia ?? c.fim)}${a.novoValor ? ", novo valor base" : ""}. Versão ${proximaVersao(c.versao, "minor")}.`, closeTime: 4000 });
          }}
        />
      )}
      <ModalPdfContrato contrato={modal === "pdf" ? c : null} data={{ ...data, contratos: data.contratos.map((x) => (x.id === c.id ? c : x)), aditivos: [...data.aditivos.filter((a) => a.contratoId !== c.id), ...aditivos] }} onClose={fechar} />
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
            <Aviso tom="risco" titulo={`Reprovado (Em Ajuste) em ${br(c.reprovacao.data)}`}>
              <p>Reprovado por {c.reprovacao.aprovador}: {c.reprovacao.motivo}</p>
              <p className="mt-1">Fase {faseNumerada("elaboracao")}. Ajuste o contrato (revisão formal ou cláusulas) e ressubmeta.</p>
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
              <p>Aguardando Aprovação Prévia: nenhum contrato vai para assinatura sem aprovação. A assinatura é liberada quando o aprovador aprovar com parecer.</p>
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

const vazio = (t = "não informado") => <span className="italic text-brand-purple-dark/50">{t}</span>;
const linhas = (itens: [string, ReactNode | undefined][]) => itens.map(([k, v]) => [k, v ?? vazio()] as [string, ReactNode]);

/** Ficha consolidada (FR-040): qualificação, objeto, condições financeiras, vigência, execução e campos da categoria. */
function AbaResumo({ data, c }: { data: ContratosData; c: Contrato }) {
  const p = parteDe(data, c);
  const campos = data.camposCategoria[c.categoria] ?? [];
  const valores = c.camposCategoria ?? {};
  const rotulos = [...new Set([...campos.map((f) => f.rotulo), ...Object.keys(valores)])];
  const saldo = c.recesso ? Math.round((c.recesso.credito - c.recesso.usados) * 10) / 10 : undefined;
  return (
    <div className="space-y-8">
      <Secao titulo="Qualificação da parte" icone="fa-handshake">
        {p ? (
          <Dados
            itens={linhas([
              ["Parte", <span className="font-bold">{p.nome}</span>],
              ["Código", p.codigo],
              ["Tipo", `${p.tipo === "cliente" ? "Cliente" : "Fornecedor"} · ${SUBTIPO[p.subtipo]}`],
              [p.pessoa === "PJ" ? "CNPJ" : "CPF", p.documento],
              ["Contato", p.contato.nome],
              ["E-mail", p.contato.email],
              ["Telefone", p.contato.telefone],
              ["Endereço", p.endereco],
              ...Object.entries(p.extras),
            ])}
          />
        ) : (
          <Aviso tom="atencao" titulo="Parte não encontrada">O cadastro da parte não foi localizado. Confira em Partes antes de submeter.</Aviso>
        )}
      </Secao>

      <Secao titulo="Objeto e gestão" icone="fa-bullseye">
        <p className="text-brand-purple-dark/90">{c.objeto}</p>
        <Dados
          itens={linhas([
            ["Gestor do contrato", c.gestor || undefined],
            ["Centro de custo", c.centroCusto || undefined],
            ["Fluxo", c.fluxoDetalhe ?? FLUXO[c.fluxo].longo],
            ["Origem do código", c.codigoManual ? "Manual / Legado" : "Sequencial automático"],
            ...(c.minuta ? ([["Minuta de origem", `${c.minuta.codigo} ${c.minuta.versao}`]] as [string, ReactNode][]) : []),
            ...(c.liminar ? ([["Liminar", `Processo ${c.liminar.processo} · ${c.liminar.vara}`]] as [string, ReactNode][]) : []),
          ])}
        />
      </Secao>

      <Secao titulo="Condições financeiras" icone="fa-sack-dollar">
        <Dados
          itens={linhas([
            ["Valor base mensal", <Valor valor={c.valor} />],
            ["Regra de remuneração", c.regraRemuneracao || undefined],
            ["Forma de pagamento", c.formaPagamento],
            ["Condição de pagamento", c.condicaoPagamento],
            ["Dia do vencimento", c.vencimentoDia ? `Dia ${c.vencimentoDia}` : undefined],
            ["Exige nota fiscal", c.exigeNf ? "Sim" : "Não"],
            ["Dados bancários", c.dadosBancarios],
            ["Critério de glosa", c.criterioGlosa],
          ])}
        />
      </Secao>

      <Secao titulo="Vigência e reajuste" icone="fa-calendar-clock">
        <Dados
          itens={linhas([
            ["Início", br(c.inicio)],
            ["Término", br(c.fim)],
            ["Tipo de prazo", c.tipoPrazo],
            [
              "Dias restantes",
              c.status === "vigente" ? <Selo s={{ ...FAIXA[faixa(c.fim)], label: `${diasLabel(c.fim)} · ${FAIXA[faixa(c.fim)].label}` }} /> : <span className="text-brand-purple-dark/50">{c.status === "encerrado" ? "Encerrado" : "Conta a partir da assinatura"}</span>,
            ],
            ["Índice de reajuste", c.indice],
            ["Mês-base", c.mesBase],
            ["Regra de reajuste específica", c.regraReajusteEspecifica],
            ["Próxima data-base", c.dataBase ? br(c.dataBase) : undefined],
            ["Último reajuste", c.ultimoReajuste ? `${br(c.ultimoReajuste.data)} · ${c.ultimoReajuste.taxa.toLocaleString("pt-BR")}%${c.ultimoReajuste.manual ? " (ajuste manual)" : ""}` : "nenhum"],
            ["Aviso prévio", `${c.avisoPrevioDias} dias`],
            ["Prazo de saneamento", `${c.prazoSaneamentoDias} dias`],
            ...(c.experienciaAte ? ([["Fim da experiência", br(c.experienciaAte)]] as [string, ReactNode][]) : []),
          ])}
        />
      </Secao>

      <Secao titulo="Execução" icone="fa-briefcase">
        <Dados
          itens={linhas([
            ["Cláusula 7ª (indisponibilidade / recesso)", c.clausulaIndisponibilidade ? "Sim · recesso de até 24 dias por ano" : "Não"],
            ...(c.clausulaIndisponibilidade || c.recesso
              ? ([["Saldo de recesso", c.recesso ? `${saldo!.toLocaleString("pt-BR")} dia(s) · ${c.recesso.usados.toLocaleString("pt-BR")} de ${c.recesso.credito} usados` : undefined]] as [string, ReactNode | undefined][])
              : []),
            ["Equipamentos cedidos", c.equipamentosCedidos ?? "nenhum"],
          ])}
        />
        <div className="flex flex-wrap gap-2">
          {c.unidades.length ? c.unidades.map((u) => <Tag key={u} item={u} variant="dark-blue" leftIcon="fa-location-dot" />) : vazio("nenhuma unidade informada")}
        </div>
      </Secao>

      <Secao titulo={`Campos da categoria ${c.categoria}`} icone="fa-list-check">
        {rotulos.length ? (
          <Dados itens={rotulos.map((r) => [r, valores[r] || vazio()] as [string, ReactNode])} />
        ) : (
          <p className="text-sm text-brand-purple-dark/60">A categoria {c.categoria} não tem campos próprios.</p>
        )}
      </Secao>
    </div>
  );
}

/** Destaques do Específico / Locação (FR-048, RN-065): IPTU, condomínio e garantia. */
const DESTAQUES = [
  { rotulo: "IPTU", re: /iptu/i },
  { rotulo: "Condomínio", re: /condom/i },
  { rotulo: "Garantia", re: /garantia|fian/i },
];

function AbaConteudo({
  data,
  c,
  pode,
  podeAditivo,
  onAditivo,
  onNova,
  onEditar,
  onExcluir,
}: {
  data: ContratosData;
  c: Contrato;
  pode: boolean;
  podeAditivo: boolean;
  onAditivo: () => void;
  onNova: () => void;
  onEditar: (c: Clausula) => void;
  onExcluir: (c: Clausula) => void;
}) {
  const campos = c.camposCategoria ?? {};
  const rotulos = [...new Set([...(data.camposCategoria[c.categoria] ?? []).map((f) => f.rotulo), ...Object.keys(campos)])];

  if (c.modalidade === "corporativo") {
    return (
      <div className="space-y-8">
        <Secao titulo="Documento negociado" icone="fa-file-contract">
          <p className="text-sm text-brand-purple-dark/70">Contrato Corporativo nasce do documento da contraparte (Fluxo Invertido): o texto vale como está no arquivo.</p>
          {c.arquivo ? <ArquivoCartao arquivo={c.arquivo} /> : <Aviso tom="atencao" titulo="Arquivo não anexado">Anexe o documento negociado antes de submeter.</Aviso>}
        </Secao>
        <Secao titulo="Campos específicos" icone="fa-list-check">
          {rotulos.length ? <Dados itens={rotulos.map((r) => [r, campos[r] || vazio()] as [string, ReactNode])} /> : <p className="text-sm text-brand-purple-dark/60">Nenhum campo da categoria.</p>}
        </Secao>
      </div>
    );
  }

  if (c.modalidade === "especifico") {
    const destaques = DESTAQUES.map((d) => ({ ...d, chave: rotulos.find((r) => d.re.test(r)) })).filter((d) => d.chave);
    const outros = rotulos.filter((r) => !destaques.some((d) => d.chave === r));
    return (
      <div className="space-y-8">
        {destaques.length > 0 && (
          <Secao titulo="Pontos de atenção da locação" icone="fa-star">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {destaques.map((d) => {
                const v = campos[d.chave!];
                return (
                  <div key={d.rotulo} className="rounded-xl border border-brand-blue/20 bg-blue-light p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-dark">{d.rotulo}</p>
                    <p className="mt-0.5 text-xs text-blue-dark/70">{d.chave}</p>
                    <p className={cx("mt-1 font-bold", v ? "text-brand-purple-dark" : "italic font-normal text-brand-purple-dark/50")}>{v || "não informado"}</p>
                  </div>
                );
              })}
            </div>
          </Secao>
        )}
        <Secao titulo="Campos específicos" icone="fa-list-check">
          {outros.length ? <Dados itens={outros.map((r) => [r, campos[r] || vazio()] as [string, ReactNode])} /> : <p className="text-sm text-brand-purple-dark/60">Nenhum outro campo da categoria.</p>}
        </Secao>
        <Secao titulo="Documento" icone="fa-file-contract">
          {c.arquivo ? <ArquivoCartao arquivo={c.arquivo} /> : <p className="italic text-brand-purple-dark/50">Arquivo não anexado.</p>}
        </Secao>
      </div>
    );
  }

  // Adesão: cláusulas próprias do contrato (RN-069)
  const clausulas = c.clausulas ?? [];
  const travado = !clausulasEditaveis(c);
  const editavel = pode && !travado;
  return (
    <Secao titulo="Cláusulas" icone="fa-file-lines">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-purple-dark/70">
          {c.minuta ? <>Gerado da minuta <strong>{c.minuta.codigo} {c.minuta.versao}</strong>; editar aqui não muda a minuta. </> : null}
          {clausulas.length} cláusula{clausulas.length === 1 ? "" : "s"}
          {clausulas.some((x) => x.editada) && ` · ${clausulas.filter((x) => x.editada).length} editada(s)`}
        </p>
        {editavel && <Button variant="tint" leftIcon="fa-plus" onClick={onNova}>Adicionar cláusula</Button>}
      </div>

      {travado && (
        <Aviso tom="neutro" icone="fa-lock" titulo={CLAUSULAS_TRAVADAS} acoes={podeAditivo && <Button size="small" leftIcon="fa-plus" onClick={onAditivo}>Aditivo</Button>}>
          {c.status === "encerrado" ? "Contrato encerrado: o texto fica só para consulta." : "Mudar o texto sem aditivo invalidaria o que foi assinado."}
        </Aviso>
      )}

      {clausulas.length === 0 ? (
        <EmptyStateCard icon="fa-file-lines" text="Sem cláusulas registradas">
          <p>{c.codigoManual ? "Contrato legado: o texto assinado está fora do sistema." : "Adicione as cláusulas do contrato."}</p>
        </EmptyStateCard>
      ) : (
        <ListaClausulas clausulas={clausulas} acoes={editavel ? (cl) => (
          <span className="flex gap-1">
            <Button size="small" variant="ghost" title="Editar cláusula" aria-label={`Editar ${cl.titulo}`} onClick={() => onEditar(cl)}>
              <Icon name="fa-pen" />
            </Button>
            <Button size="small" variant="ghost" color="red" title="Excluir cláusula" aria-label={`Excluir ${cl.titulo}`} onClick={() => onExcluir(cl)}>
              <Icon name="fa-trash" />
            </Button>
          </span>
        ) : travado ? () => <Icon name="fa-lock" className="text-brand-purple-dark/30" /> : undefined} />
      )}
    </Secao>
  );
}

/** Lista de cláusulas com o selo "Editada"; usada no conteúdo e no texto de cada versão. */
function ListaClausulas({ clausulas, acoes }: { clausulas: Clausula[]; acoes?: (cl: Clausula) => ReactNode }) {
  return (
    <ol className="space-y-3">
      {clausulas.map((cl) => (
        <li key={cl.id} className={cx("rounded-xl border p-4", cl.editada ? "border-yellow/40 bg-yellow/5" : "border-brand-purple-dark/10")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="flex flex-wrap items-center gap-2 font-bold text-brand-purple-dark">
              {cl.titulo}
              {cl.editada && <Tag item="Editada" variant="yellow" leftIcon="fa-pen" />}
            </p>
            {acoes?.(cl)}
          </div>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-brand-purple-dark/80">
            <TextoComTags texto={cl.texto} />
          </p>
        </li>
      ))}
    </ol>
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
          {ok ? <Tag item="100% Conforme" variant="green" leftIcon="fa-check" /> : <Tag item="Pendente de Documentos" variant="yellow" leftIcon="fa-clock" />}
          <span className="text-sm text-brand-purple-dark/60">{itens.length} documento(s){pendentes ? ` · ${pendentes} pendente${pendentes === 1 ? "" : "s"}` : ""}</span>
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
              { label: "Código", render: (i) => <span className="whitespace-nowrap font-mono text-sm">{i.codigo}</span> },
              { label: "Natureza", render: (i) => i.natureza },
              { label: "Documento", render: (i) => <span className="font-semibold text-brand-purple-dark">{i.documento}</span> },
              { label: "Arquivo", render: (i) => (i.arquivo ? <ArquivoLink arquivo={i.arquivo} /> : <span className="italic text-brand-purple-dark/50">não enviado</span>) },
              { label: "Validade", render: (i) => (i.validade ? br(i.validade) : "Indeterminada") },
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
  const [texto, setTexto] = useState<Contrato["versoes"][number] | null>(null);
  return (
    <div className="space-y-8">
      <Secao titulo="Versões" icone="fa-code-branch">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-brand-purple-dark/70">Versão atual <strong>{c.versao}</strong>. Cada evento gera um número novo, calculado pelo sistema; cada versão guarda a cópia das cláusulas daquele momento.</p>
          {podeRevisar && <Button variant="tint" leftIcon="fa-code-branch" onClick={onRevisao}>Revisão formal</Button>}
        </div>
        <div className="overflow-x-auto">
          <Table
            id="ficha-versoes"
            rows={versoes}
            rowId={(v) => v.versao}
            col={[
              { label: "Versão", render: (v) => <span className="whitespace-nowrap font-bold text-brand-purple-dark">{v.versao}</span> },
              { label: "Data", render: (v) => br(v.data) },
              { label: "Fase", render: (v) => v.fase },
              { label: "Motivo", render: (v) => v.motivo },
              { label: "Resumo", className: "min-w-56", render: (v) => <span className="text-sm">{v.resumo}</span> },
              { label: "Revisor", render: (v) => v.revisor },
              {
                label: "Texto",
                render: (v) =>
                  v.clausulas?.length ? (
                    <Button size="small" variant="ghost" leftIcon="fa-file-lines" onClick={() => setTexto(v)}>Ver texto</Button>
                  ) : (
                    <span className="text-sm italic text-brand-purple-dark/50">{c.modalidade === "adesao" ? "sem cópia" : "arquivo externo"}</span>
                  ),
              },
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
              rows={[...aditivos].sort((a, b) => b.numero - a.numero)}
              rowId={(a) => a.id}
              col={[
                { label: "Aditivo", render: (a) => <div className="whitespace-nowrap"><p className="font-bold text-brand-purple-dark">{a.codigo}</p><p className="text-sm text-brand-purple-dark/60">{rotuloAditivo(a)}</p></div> },
                { label: "Tipo", render: (a) => a.tipo },
                { label: "Celebração", render: (a) => br(a.data) },
                { label: "Nova vigência", render: (a) => (a.novaVigencia ? br(a.novaVigencia) : "—") },
                { label: "Novo valor", render: (a) => (a.novoValor != null ? <Valor valor={a.novoValor} /> : "—") },
                { label: "Justificativa e impacto", className: "min-w-56", render: (a) => <div className="text-sm"><p>{a.motivo}</p><p className="text-brand-purple-dark/60">{a.impacto}</p>{a.arquivo && <ArquivoLink arquivo={a.arquivo} />}</div> },
                { label: "Aprovação", render: (a) => <Selo s={APROVACAO[a.aprovacao]} /> },
                { label: "Assinatura", render: (a) => <Selo s={ASSINATURA[a.assinatura]} /> },
              ]}
            />
          </div>
        )}
      </Secao>

      <Modal id="modal-texto-versao" show={!!texto} title={texto ? `Texto de ${c.id} ${texto.versao}` : ""} onCancel={() => setTexto(null)} variant="large">
        {texto && (
          <div className="space-y-4">
            <p className="text-sm text-brand-purple-dark/70">Cópia integral das cláusulas em {br(texto.data)} ({texto.fase} · {texto.motivo}).</p>
            <ListaClausulas clausulas={texto.clausulas ?? []} />
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Histórico de workflow (RN-071): de → para, parecer, usuário e papel. */
function AbaWorkflow({ registros }: { registros: RegistroWorkflow[] }) {
  const lista = [...registros].reverse().sort((a, b) => b.data.slice(0, 10).localeCompare(a.data.slice(0, 10)));
  const NOME: Record<RegistroWorkflow["workflow"], string> = { aprovacao: "Aprovação", assinatura: "Assinatura", ciclo: "Ciclo de vida" };
  return (
    <Secao titulo="Histórico de workflow" icone="fa-diagram-project">
      <p className="text-sm text-brand-purple-dark/70">Cada transição de aprovação, assinatura e ciclo de vida, do mais recente ao mais antigo.</p>
      {lista.length === 0 ? (
        <EmptyStateCard icon="fa-diagram-project" text="Sem transições registradas" />
      ) : (
        <div className="overflow-x-auto">
          <Table
            id="ficha-workflow"
            rows={lista}
            rowId={(w) => w.id}
            col={[
              { label: "Data", render: (w) => <span className="whitespace-nowrap">{dataHora(w.data)}</span> },
              { label: "Workflow", render: (w) => NOME[w.workflow] },
              { label: "Transição", render: (w) => <span className="whitespace-nowrap">{w.de} <Icon name="fa-arrow-right" className="mx-1 text-brand-purple-dark/40" /> <strong>{w.para}</strong></span> },
              { label: "Parecer", className: "min-w-56", render: (w) => <span className="text-sm">{w.parecer ?? "—"}</span> },
              { label: "Usuário", render: (w) => w.usuario },
              { label: "Papel", render: (w) => <span className="text-sm">{w.papel}</span> },
            ]}
          />
        </div>
      )}
    </Secao>
  );
}

/**
 * Eventos da Linha do Tempo (RN-067): os do contrato mais versões, aditivos,
 * documentos do dossiê já anexados, cobranças e sincronizações com o ERP,
 * sem repetir o que já está em `contrato.eventos`.
 */
function linhaDoTempo(data: ContratosData, c: Contrato, aditivos: Aditivo[]): Evento[] {
  const lista = [...c.eventos];
  const tem = (tipo: EventoTipo, trecho: string) => lista.some((e) => e.tipo === tipo && e.titulo.includes(trecho));
  for (const v of c.versoes.slice(1)) {
    if (!tem("versao", v.versao)) lista.push({ id: `dv-${v.versao}`, data: v.data === TODAY ? agora() : `${v.data}T18:00`, tipo: "versao", titulo: `Versão ${v.versao} registrada · ${v.motivo}`, autor: v.revisor, detalhe: v.resumo });
  }
  for (const a of aditivos) {
    // Os eventos de aditivo das fixtures nem sempre citam o código: o mesmo dia já conta como registrado.
    if (!tem("aditivo", a.codigo) && !lista.some((e) => e.tipo === "aditivo" && e.data.startsWith(a.data))) {
      lista.push({ id: `da-${a.id}`, data: a.data === TODAY ? agora() : `${a.data}T09:30`, tipo: "aditivo", titulo: `${rotuloAditivo(a)} · ${a.codigo}`, autor: "Gestão de Contratos", detalhe: `${a.tipo}: ${a.impacto}` });
    }
  }
  const criado = c.versoes[0]?.data ?? c.inicio;
  for (const d of dossieDe(data, c.id).filter((i) => i.arquivo)) {
    const dia = d.protocolo ?? criado;
    if (!lista.some((e) => e.tipo === "dossie" && e.data.startsWith(dia)) && !tem("dossie", d.documento)) {
      lista.push({ id: `dd-${d.id}`, data: `${dia}T08:00`, tipo: "dossie", titulo: `${d.documento} anexado ao dossiê · ${d.codigo}`, autor: d.auditor ?? "Conformidade", detalhe: CONFORMIDADE[d.conformidade].label });
    }
  }
  for (const b of data.cobrancas.filter((x) => x.contratoId === c.id)) {
    if (!tem("cobranca", b.numero)) lista.push({ id: `db-${b.id}`, data: `${b.competencia}-01` > TODAY ? agora() : `${b.competencia}-01T08:00`, tipo: "cobranca", titulo: `${b.tipo} ${b.numero} recebida · ${b.codigo}`, autor: b.autoDetectado ? "Sistema" : "Financeiro", detalhe: `Competência ${competencia(b.competencia)}` });
    if (b.erp.status === "sincronizado" && b.erp.titulo && !tem("erp", `#${b.erp.titulo}`)) {
      lista.push({ id: `de-${b.id}`, data: b.erp.data ?? `${b.competencia}-01T09:00`, tipo: "erp", titulo: `Omie ERP Sincronizado: Título #${b.erp.titulo}`, autor: "Sistema", detalhe: ERP.sincronizado.label });
    }
  }
  if (c.encerramento && !lista.some((e) => e.tipo === "encerramento")) {
    lista.push({ id: "denc", data: `${c.encerramento.data}T14:00`, tipo: "encerramento", titulo: "Encerramento & Distrato Formal", autor: "Ciclo de Vida", detalhe: `[${c.encerramento.tipo}] ${c.encerramento.motivo}` });
  }
  return lista;
}

function AbaLinhaDoTempo({ eventos }: { eventos: Evento[] }) {
  const [tipo, setTipo] = useState<EventoTipo | null>(null);
  const ordenados = useMemo(() => [...eventos].sort((a, b) => b.data.localeCompare(a.data)), [eventos]);
  const presentes = (Object.keys(EVENTO) as EventoTipo[]).filter((t) => ordenados.some((e) => e.tipo === t));
  const lista = tipo ? ordenados.filter((e) => e.tipo === tipo) : ordenados;
  return (
    <Secao titulo="Linha do Tempo Forense" icone="fa-timeline">
      <p className="text-sm text-brand-purple-dark/70">Criação, workflow, versões, aditivos, dossiê, cobranças, ERP e encerramento, do mais recente ao mais antigo. Nenhum evento é apagado ou editado.</p>
      {/* Filtro por tipo num `select`, como os filtros das listas; a cor de cada tipo fica no selo do evento. */}
      <Input
        type="select"
        id="linha-do-tempo-tipo"
        label="Tipo de evento"
        prompt={`Todos (${ordenados.length})`}
        value={tipo ?? ""}
        options={presentes.map((t) => ({ label: `${EVENTO[t].label} (${ordenados.filter((e) => e.tipo === t).length})`, value: t }))}
        onChange={(v) => setTipo((v || null) as EventoTipo | null)}
        className="w-full sm:w-64"
      />
      <div className="pl-4 pt-2">
        <TimelineList
          item={lista.map((e) => ({
            icon: EVENTO[e.tipo].icon,
            color: corEvento(e) === "green" ? "green" : "blue",
            children: (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag item={EVENTO[e.tipo].label} variant={corEvento(e)} />
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

/** Trilha de auditoria do contrato (FR-042, RN-068): só inclusões, só deste contrato. */
function AbaAuditoria({ c }: { c: Contrato }) {
  const lista: RegistroAuditoria[] = [...c.auditoria].reverse().sort((a, b) => b.data.localeCompare(a.data));
  return (
    <Secao titulo="Trilha de auditoria" icone="fa-shield-halved">
      <p className="text-sm text-brand-purple-dark/70">Toda gravação deste contrato, com usuário, perfil, ação e detalhes. A auditoria só recebe inclusões: nada é alterado nem apagado.</p>
      {lista.length === 0 ? (
        <EmptyStateCard icon="fa-shield-halved" text="Sem registros de auditoria" />
      ) : (
        <div className="overflow-x-auto">
          <Table
            id="ficha-auditoria"
            rows={lista}
            rowId={(a) => a.id}
            col={[
              { label: "Data", render: (a) => <span className="whitespace-nowrap">{dataHora(a.data)}</span> },
              { label: "Usuário", render: (a) => a.usuario },
              { label: "Perfil", render: (a) => <span className="text-sm">{a.perfil}</span> },
              { label: "Ação", render: (a) => <span className="whitespace-nowrap font-mono text-sm">{a.acao}</span> },
              { label: "Detalhes", className: "min-w-64", render: (a) => <span className="whitespace-pre-line break-words text-sm">{a.detalhes}</span> },
            ]}
          />
        </div>
      )}
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
        <Aviso tom="risco" icone="fa-lock" titulo={BLOQUEIO_GOVERNANCA}>
          <p>
            {c.id} {c.versao}. 
Motivo: a aprovação está <strong>{APROVACAO[c.aprovacao].label}</strong> e a assinatura, <strong>{ASSINATURA[c.assinatura].label}</strong>.
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
        <p className="text-sm text-brand-purple-dark/60">Minor (padrão) para ajustes de texto; major quando muda objeto, valor ou partes. O número é calculado, nunca digitado, e a versão guarda a cópia das cláusulas de agora.</p>
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
  onSave: (data: string, tipo: string, motivo: string, distrato?: Arquivo) => void;
}) {
  const [dataEnc, setDataEnc] = useState(TODAY);
  const [tipo, setTipo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [distrato, setDistrato] = useState<Arquivo>();
  const [e, setE] = useState<Record<string, string | undefined>>({});
  const salvar = () => {
    const x = {
      data: dataEnc ? undefined : "Informe a data do encerramento.",
      tipo: tipo ? undefined : "Escolha o tipo de encerramento.",
      motivo: motivo.trim() ? undefined : "Explique o motivo do encerramento.",
      distrato: distrato ? validarAnexo(distrato) ?? undefined : undefined,
    };
    if (Object.values(x).some(Boolean)) return setE(x);
    onSave(dataEnc, tipo, motivo.trim(), distrato);
  };
  return (
    <DrawerModal id="modal-encerrar" show={show} title={`Encerrar ${c.id}`} onCancel={onCancel} variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-6">
        <Aviso tom="atencao" titulo="Encerramento é o estado final">
          {c.id} está {STATUS[c.status].label}. Depois de encerrado, nada o reabre: o contrato vai para {faseNumerada("encerramento")} e não recebe aditivos, reajustes nem cobranças novas.
        </Aviso>
        <Input type="date" id="encerrar-data" label="Data do encerramento" value={dataEnc} onChange={(ev) => { setDataEnc(ev.target.value); setE({}); }} errors={err(e.data)} />
        <Input type="select" id="encerrar-tipo" label="Tipo" prompt="Selecione o tipo" value={tipo} options={tipos.map((t) => ({ label: t, value: t }))} onChange={(v) => { setTipo(v ?? ""); setE({}); }} errors={err(e.tipo)} />
        <Input type="textarea" id="encerrar-motivo" label="Motivo" hint={tipo && motivo.trim() ? `Registrado como "[${tipo}] ${motivo.trim()}"` : undefined} value={motivo} onChange={(ev) => { setMotivo(ev.target.value); setE({}); }} errors={err(e.motivo)} />
        <div>
          <p className="mb-2 text-sm/4 font-bold text-brand-blue">Distrato (opcional)</p>
          <FileUploader
            variant="simplified"
            upload={{ ref: "encerrar-distrato", name: "distrato", accept: ANEXO_TIPOS.map((t) => `.${t}`).join(","), maxEntries: 1, maxFileSize: ANEXO_MAX }}
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
        <Aviso tom="info">{clausula ? 'A cláusula alterada ganha o selo "Editada"; a minuta de origem não muda.' : 'A cláusula nova entra no fim da lista, marcada como "Editada" e não obrigatória.'}</Aviso>
        <Rodape onCancel={onCancel}>
          <Button leftIcon="fa-check" onClick={salvar}>{clausula ? "Salvar cláusula" : "Adicionar"}</Button>
        </Rodape>
      </div>
    </DrawerModal>
  );
}
