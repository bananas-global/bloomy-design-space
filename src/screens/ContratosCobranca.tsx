/**
 * Gestão de Contratos — Conformidade: Cobrança e envio ao ERP (Omie).
 *
 * Smart Intake (leitura do XML ou PDF com sugestão de contrato e parte e o
 * critério da sugestão), protocolo manual, a lista de cobranças e o envio ao
 * ERP. Nada vai para o contas a pagar sem alguém conferir contra o contrato:
 * enquanto a Controladoria não confere, a cobrança mostra a Trava de
 * Governança no lugar do botão de sincronizar.
 *
 * A leitura nunca sugere "um contrato qualquer": CNPJ sem cadastro, parte sem
 * contrato Vigente ou leitura falha viram aviso com o motivo e o que fazer,
 * porque sugerir o contrato errado e confirmar no automático vira pagamento
 * errado.
 *
 * Feito na tela (componente novo): o painel de leitura do Smart Intake, a
 * comparação da conferência e o detalhe do envio ao ERP. O resto é `table`,
 * `input`, `modal`, `drawer_modal`, `file_uploader`, `tag`, `button`,
 * `tooltip` e `empty_state_card`.
 */
import { useMemo, useState, type ReactNode } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Tooltip } from "../components/Choice.js";
import { FileUploader, type UploadEntry } from "../components/FileUploader.js";
import { Icon } from "../components/Icon.js";
import { Input, Label, cx } from "../components/Input.js";
import { EmptyStateCard } from "../components/Layout.js";
import { DrawerModal } from "../components/Overlay.js";
import { Table } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import {
  CONFORMIDADE, ERP, FLUXO, MASCARA, br, brl, competencia, dossieDe, kb, parteDe,
  type Arquivo, type Cobranca, type Contrato, type ContratosData, type Fluxo, type Parte,
} from "./gestao-de-contratos/model.js";
import { Aviso, Bloco, ContratosShell, Dados, Etiquetas, ROTAS, Selo, Valor, exportarPlanilha, papelDe, SeloLeitura, irFicha, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";

/* ------------------------------------------------------------------ */
/* Filtros                                                             */
/* ------------------------------------------------------------------ */

type FiltroFluxo = "pagar" | "receber";
type FiltroSituacao = "conformes" | "sincronizados" | "travados";
const FLUXO_F: { id: FiltroFluxo; label: string; fluxo: Fluxo; icon: string }[] = [
  { id: "pagar", label: "Pagar", fluxo: "despesa", icon: FLUXO.despesa.icon },
  { id: "receber", label: "Receber", fluxo: "receita", icon: FLUXO.receita.icon },
];
const SITUACAO_F: { id: FiltroSituacao; label: string; icon: string; passa: (c: Cobranca) => boolean }[] = [
  { id: "conformes", label: "Conformes", icon: "fa-circle-check", passa: (c) => c.conformidade === "conforme" },
  { id: "sincronizados", label: "Sincronizados", icon: "fa-arrows-rotate", passa: (c) => c.erp.status === "sincronizado" },
  { id: "travados", label: "Travados", icon: "fa-lock", passa: (c) => !c.liberado },
];

const CONFERENCIA = {
  pendente: { label: "Pendente Conferência", variant: "yellow", icon: "fa-hourglass-half" },
  aprovado: { label: "Aprovado 100% Conforme", variant: "green", icon: "fa-check-double" },
} as const;
const LIBERADO = { label: "Liberado", variant: "green", icon: "fa-lock-open" } as const;
const MOTIVO_TRAVA = "Confira o documento contra o contrato para liberar.";

/** Data e hora do envio: "2026-07-09T15:02" → "09/07/2026 às 15:02". */
const quando = (iso?: string) => (iso ? `${br(iso.slice(0, 10))}${iso.length > 10 ? ` às ${iso.slice(11, 16)}` : ""}` : "—");

/* ------------------------------------------------------------------ */
/* Smart Intake: leitura simulada                                      */
/* ------------------------------------------------------------------ */

type Intake = "xml" | "pdf" | "sem-match" | "falha";
type Leitura = {
  arquivo: Arquivo;
  formato: "XML" | "PDF";
  tipo: string;
  numero: string;
  valor: number;
  vencimento: string;
  competencia: string;
  cnpj: string;
};

/** O que a leitura devolve para cada arquivo de exemplo (dados fictícios). */
const LEITURAS: Record<Exclude<Intake, "falha">, Leitura> = {
  xml: { arquivo: { nome: "nfse-2026-0815.xml", tamanho: 15_000 }, formato: "XML", tipo: "NFS-e", numero: "2026/0815", valor: 18_500, vencimento: "2026-09-10", competencia: "2026-08", cnpj: "12.345.678/0001-90" },
  pdf: { arquivo: { nome: "fatura-locacao-setembro.pdf", tamanho: 205_000 }, formato: "PDF", tipo: "Fatura de Locação", numero: "LOC-0926", valor: 14_200, vencimento: "2026-09-05", competencia: "2026-09", cnpj: "44.555.666/0001-77" },
  "sem-match": { arquivo: { nome: "nfe-000112233.xml", tamanho: 17_000 }, formato: "XML", tipo: "NF-e", numero: "000.112.233", valor: 3_450, vencimento: "2026-08-20", competencia: "2026-07", cnpj: "99.888.777/0001-66" },
};

/** Arquivo escolhido → leitura. No protótipo, XML lê a NFS-e e PDF lê a fatura; outro formato falha. */
function lerArquivo(nome: string): { intake: Intake; nome: string } {
  const n = nome.toLowerCase();
  if (n.endsWith(".xml")) return { intake: n.includes("sem") ? "sem-match" : "xml", nome };
  if (n.endsWith(".pdf")) return { intake: "pdf", nome };
  return { intake: "falha", nome };
}

type Sugestao =
  | { ok: true; parte: Parte; contrato: Contrato; criterio: string }
  | { ok: false; motivo: string; oQueFazer: string; parte?: Parte };

/** Sugere contrato e parte só quando o CNPJ casa com uma parte e com um único contrato Vigente dela. */
function sugerir(data: ContratosData, l: Leitura): Sugestao {
  const parte = data.partes.find((p) => p.documento === l.cnpj);
  if (!parte) {
    return {
      ok: false,
      motivo: `O CNPJ ${l.cnpj} não está no Cadastro de Partes, então não há contrato para sugerir.`,
      oQueFazer: "Cadastre a parte (fornecedor ou cliente) e envie o arquivo de novo, ou registre a cobrança pelo protocolo manual.",
    };
  }
  const vigentes = data.contratos.filter((c) => c.parteId === parte.id && c.status === "vigente");
  const mesmoValor = vigentes.filter((c) => c.valor === l.valor);
  const escolhido = vigentes.length === 1 ? vigentes[0] : mesmoValor.length === 1 ? mesmoValor[0] : undefined;
  if (!escolhido) {
    return {
      ok: false,
      parte,
      motivo: vigentes.length === 0
        ? `${parte.nome} não tem contrato Vigente: cobrança só entra em contrato Vigente.`
        : `${parte.nome} tem ${vigentes.length} contratos Vigentes e o valor não distingue qual é.`,
      oQueFazer: "Registre pelo protocolo manual escolhendo o contrato.",
    };
  }
  const valorIgual = escolhido.valor === l.valor;
  return {
    ok: true,
    parte,
    contrato: escolhido,
    criterio: `CNPJ ${l.cnpj} = ${parte.nome.replace(/ (Terapias )?Ltda\.$/, "")} · contrato Vigente ${escolhido.id} · ${valorIgual ? "valor igual ao contratado" : "valor diferente do contratado: confira na conferência"}`,
  };
}

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

export function ContratosCobranca({ context }: ScreenProps) {
  return (
    <ContratosShell
      context={context}
      secao="cobranca"
      titulo="Conformidade — Cobrança e envio ao ERP"
      subtitulo="Notas, faturas e folhas conferidas contra o contrato antes de irem para o Omie."
    >
      {(data) => <CobrancaTela key={JSON.stringify(context.controls)} data={data} context={context} />}
    </ContratosShell>
  );
}

function CobrancaTela({ data, context }: { data: ContratosData; context: ScenarioContext }) {
  const controls = context.controls as Record<string, string>;
  const papel = papelDe(context, "financeiro");
  const opera = papel === "financeiro";

  const [cobrancas, setCobrancas] = useState<Cobranca[]>(data.cobrancas);
  const fi = controls.filtro;
  const [fluxo, setFluxo] = useState<FiltroFluxo | "">(fi === "pagar" || fi === "receber" ? fi : "");
  const [situacao, setSituacao] = useState<FiltroSituacao | "">(fi === "conformes" || fi === "sincronizados" || fi === "travados" ? fi : "");
  const [contrato, setContrato] = useState(data.contratos.some((c) => c.id === controls.contrato) ? controls.contrato! : "");
  const [busca, setBusca] = useState("");
  const ci = controls.intake;
  const [intake, setIntake] = useState<{ intake: Intake; nome?: string } | null>(opera && (ci === "xml" || ci === "pdf" || ci === "sem-match") ? { intake: ci } : null);
  const [detalhe, setDetalhe] = useState(data.cobrancas.some((b) => b.id === controls.detalhe) ? controls.detalhe! : "");
  const [protocolo, setProtocolo] = useState(opera && controls.modal === "protocolo");
  const [conferir, setConferir] = useState("");
  const [proximoTitulo, setProximoTitulo] = useState(88413);

  const parteNome = (id: string) => data.partes.find((p) => p.id === id)?.nome ?? "";
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const fl = FLUXO_F.find((f) => f.id === fluxo)?.fluxo;
    const st = SITUACAO_F.find((s) => s.id === situacao);
    return cobrancas
      .filter((c) => !contrato || c.contratoId === contrato)
      .filter((c) => !fl || c.fluxo === fl)
      .filter((c) => !st || st.passa(c))
      .filter((c) => !q || [c.contratoId, c.numero, c.tipo, parteNome(c.parteId), c.erp.titulo ?? ""].some((s) => s.toLowerCase().includes(q)))
      .sort((a, b) => b.competencia.localeCompare(a.competencia) || a.vencimento.localeCompare(b.vencimento));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cobrancas, fluxo, situacao, contrato, busca]);

  const limpar = () => { setFluxo(""); setSituacao(""); setContrato(""); setBusca(""); };
  const etiquetas = [
    ...(contrato ? [{ id: "contrato", label: `Contrato: ${contrato}`, onRemove: () => setContrato("") }] : []),
    ...(fluxo ? [{ id: "fluxo", label: FLUXO_F.find((f) => f.id === fluxo)!.label, onRemove: () => setFluxo("") }] : []),
    ...(situacao ? [{ id: "situacao", label: SITUACAO_F.find((s) => s.id === situacao)!.label, onRemove: () => setSituacao("") }] : []),
    ...(busca.trim() ? [{ id: "busca", label: `Busca: "${busca.trim()}"`, onRemove: () => setBusca("") }] : []),
  ];

  const exportar = () =>
    exportarPlanilha(
      "cobrancas-e-envio-ao-erp",
      ["Contrato", "Fluxo", "Parte", "Competência", "Tipo", "Número", "Vencimento", "Valor", "Conferência", "Conformidade", "Liberação", "Situação no ERP", "Título"],
      lista.map((c) => [c.contratoId, FLUXO[c.fluxo].label, parteNome(c.parteId), competencia(c.competencia), c.tipo, c.numero, br(c.vencimento), brl(c.valor), CONFERENCIA[c.conferencia].label, CONFORMIDADE[c.conformidade].label, c.liberado ? "Liberado" : "Trava de Governança", ERP[c.erp.status].label, c.erp.titulo ?? ""]),
    );

  const criar = (nova: Cobranca, origem: string) => {
    setCobrancas((l) => [nova, ...l]);
    showToast({ type: "success", title: "Cobrança criada", content: `${nova.tipo} ${nova.numero} do ${nova.contratoId} entrou como Pendente Conferência (${origem}).`, closeTime: 5000 });
  };

  const aprovar = (id: string) => {
    setCobrancas((l) => l.map((c) => (c.id === id ? { ...c, conferencia: "aprovado", conformidade: "conforme", liberado: true, erp: { status: "pendente" } } : c)));
    setConferir("");
    const c = cobrancas.find((x) => x.id === id)!;
    showToast({ type: "success", title: "Aprovado 100% Conforme", content: `${c.tipo} ${c.numero} liberado. Já pode sincronizar com o ERP.`, closeTime: 5000 });
  };

  const sincronizar = (id: string) => {
    const titulo = String(proximoTitulo);
    setProximoTitulo((n) => n + 1);
    setCobrancas((l) => l.map((c) => (c.id === id ? { ...c, erp: { status: "sincronizado", titulo, data: "2026-07-30T10:30" } } : c)));
    const c = cobrancas.find((x) => x.id === id)!;
    showToast({ type: "success", title: "Sincronizado com o Omie", content: `${c.tipo} ${c.numero} virou o título ${titulo} no ${c.fluxo === "despesa" ? "contas a pagar" : "contas a receber"}.`, closeTime: 5000 });
  };

  const aberta = cobrancas.find((c) => c.id === detalhe);
  const emConferencia = cobrancas.find((c) => c.id === conferir);

  return (
    <div className="space-y-6">
      {opera && (
        <SmartIntake
          data={data}
          intake={intake}
          setIntake={setIntake}
          onManual={() => setProtocolo(true)}
          onCadastrarParte={() => context.navigate(ROTAS.partes)}
          onConfirmar={(nova) => { criar(nova, "leitura automática"); setIntake(null); }}
        />
      )}

      <Bloco>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Input type="search" id="cobranca-busca" placeholder="Buscar contrato, parte, nº ou título" leftIcon="fa-magnifying-glass" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full sm:w-72" inputClass="text-ellipsis" />
            <Input type="select" id="cobranca-fluxo" label="Fluxo" prompt="Pagar e receber" value={fluxo} options={FLUXO_F.map((f) => ({ label: `${f.label} (${cobrancas.filter((c) => (!contrato || c.contratoId === contrato) && c.fluxo === f.fluxo).length})`, value: f.id }))} onChange={(v) => setFluxo((v ?? "") as FiltroFluxo | "")} className="w-full sm:w-44" />
            <Input type="select" id="cobranca-situacao" label="Situação" prompt="Todas as situações" value={situacao} options={SITUACAO_F.map((s) => ({ label: `${s.label} (${cobrancas.filter((c) => (!contrato || c.contratoId === contrato) && s.passa(c)).length})`, value: s.id }))} onChange={(v) => setSituacao((v ?? "") as FiltroSituacao | "")} className="w-full sm:w-52" />
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {!opera && <SeloLeitura motivo="Cobrança, conferência e envio ao ERP são do Financeiro / Controladoria. Para registrar ou conferir um documento, peça a quem tem esse papel." />}
              <Button variant="tint" leftIcon="fa-file-spreadsheet" onClick={exportar}>Exportar planilha</Button>
              {opera && <Button variant="outline" leftIcon="fa-file-circle-plus" onClick={() => setProtocolo(true)}>Protocolo manual</Button>}
            </div>
          </div>
          <Etiquetas itens={etiquetas} onLimpar={limpar} />
        </div>

        {cobrancas.length === 0 ? (
          <EmptyStateCard icon="fa-file-invoice-dollar" text="Nenhuma cobrança registrada">
            <p>Envie o XML ou PDF no Smart Intake ou use o protocolo manual. Cobrança só entra em contrato Vigente.</p>
          </EmptyStateCard>
        ) : lista.length === 0 ? (
          <EmptyStateCard icon="fa-filter-circle-xmark" text="Nenhuma cobrança com esses filtros">
            <p>Remova uma etiqueta ou limpe os filtros para ver todas as cobranças.</p>
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={limpar}>Limpar Todos</Button>
            </div>
          </EmptyStateCard>
        ) : (
          <Table
            id="cobrancas"
            rows={lista}
            rowId={(c) => c.id}
            col={[
              {
                label: "Contrato e parte",
                render: (c) => (
                  <div className="flex flex-col items-start gap-1">
                    <span className="flex items-center gap-2">
                      <button type="button" onClick={() => irFicha(context, c.contratoId, "cobranca")} className="font-bold text-brand-purple-dark hover:text-brand-blue hover:underline whitespace-nowrap">{c.contratoId}</button>
                      <Selo s={FLUXO[c.fluxo]} />
                    </span>
                    <span className="text-sm">{parteNome(c.parteId)}</span>
                  </div>
                ),
              },
              {
                label: "Documento",
                render: (c) => (
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-brand-purple-dark">{c.tipo} <span className="whitespace-nowrap">{c.numero}</span></span>
                    <span className="text-xs whitespace-nowrap">Competência {competencia(c.competencia)}</span>
                    {c.autoDetectado && <Tag item="Auto-detectado" variant="light-purple" leftIcon="fa-wand-magic-sparkles" className="whitespace-nowrap" />}
                  </div>
                ),
              },
              { label: "Vencimento", render: (c) => <span className="tabular-nums whitespace-nowrap">{br(c.vencimento)}</span> },
              { label: "Valor", render: (c) => <Valor valor={c.valor} /> },
              {
                label: "Conferência e conformidade",
                render: (c) => (
                  <div className="flex flex-col items-start gap-1">
                    <Selo s={CONFERENCIA[c.conferencia]} />
                    <Selo s={CONFORMIDADE[c.conformidade]} />
                  </div>
                ),
              },
              {
                label: "Situação no ERP",
                render: (c) =>
                  c.liberado ? (
                    <button type="button" onClick={() => setDetalhe(c.id)} className="flex flex-col items-start gap-1 text-left" aria-label={`Detalhes do envio de ${c.numero}`}>
                      <Selo s={ERP[c.erp.status]} className="cursor-pointer" />
                      {c.erp.titulo && <span className="text-xs font-bold text-brand-blue hover:underline whitespace-nowrap">Título {c.erp.titulo}</span>}
                      {c.erp.status === "erro" && <span className="text-xs font-bold text-red hover:underline whitespace-nowrap">Ver motivo</span>}
                    </button>
                  ) : (
                    <span className="text-sm text-brand-purple-dark/50 whitespace-nowrap">Não enviado</span>
                  ),
              },
              {
                label: "Liberação",
                className: "min-w-48",
                render: (c) =>
                  !c.liberado ? (
                    <div className="flex flex-col items-start gap-1">
                      <Tooltip id={`trava-${c.id}`} placement="top" tooltipClass="max-w-60" tooltipTrigger={<Selo s={ERP.travado} />} tooltipContent={MOTIVO_TRAVA} />
                      <span className="text-xs text-brand-purple-dark/60">{MOTIVO_TRAVA}</span>
                      {opera && c.conferencia === "pendente" && (
                        <Button size="small" leftIcon="fa-list-check" onClick={() => setConferir(c.id)}>Conferir</Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-1">
                      <Selo s={LIBERADO} />
                      {opera && c.erp.status === "pendente" && (
                        <Button size="small" leftIcon="fa-arrows-rotate" className="whitespace-nowrap" onClick={() => sincronizar(c.id)}>Sincronizar com o ERP</Button>
                      )}
                      {opera && c.erp.status === "erro" && (
                        <Button size="small" variant="outline" color="red" leftIcon="fa-rotate-right" onClick={() => setDetalhe(c.id)}>Ver erro</Button>
                      )}
                    </div>
                  ),
              },
            ]}
          />
        )}
      </Bloco>

      {protocolo && (
        <ModalProtocolo
          data={data}
          cobrancas={cobrancas}
          contratoInicial={contrato}
          onCancel={() => setProtocolo(false)}
          onSalvar={(nova) => { criar(nova, "protocolo manual"); setProtocolo(false); }}
        />
      )}

      {emConferencia && (
        <ModalConferencia data={data} c={emConferencia} onCancel={() => setConferir("")} onAprovar={() => aprovar(emConferencia.id)} abrirDossie={() => context.navigate(ROTAS.dossie, { controls: { contrato: emConferencia.contratoId } })} />
      )}

      <DrawerModal id="detalhe-envio" show={!!aberta} title={aberta ? `Envio ao ERP · ${aberta.tipo} ${aberta.numero}` : ""} variant="small" onCancel={() => setDetalhe("")}>
        {aberta && <DetalheEnvio c={aberta} parte={parteNome(aberta.parteId)} codigoParte={data.partes.find((p) => p.id === aberta.parteId)?.codigo ?? ""} opera={opera} onTentar={() => sincronizar(aberta.id)} />}
      </DrawerModal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Smart Intake                                                        */
/* ------------------------------------------------------------------ */

function AutoDetectado() {
  return <Tag item="Auto-detectado" variant="light-purple" leftIcon="fa-wand-magic-sparkles" className="whitespace-nowrap" />;
}

function SmartIntake({
  data, intake, setIntake, onManual, onCadastrarParte, onConfirmar,
}: {
  data: ContratosData;
  intake: { intake: Intake; nome?: string } | null;
  setIntake: (v: { intake: Intake; nome?: string } | null) => void;
  onManual: () => void;
  onCadastrarParte: () => void;
  onConfirmar: (c: Cobranca) => void;
}) {
  const leitura = intake && intake.intake !== "falha" ? LEITURAS[intake.intake] : undefined;
  const sugestao = leitura ? sugerir(data, leitura) : undefined;
  const vigentes = data.contratos.filter((c) => c.status === "vigente");
  const [escolhido, setEscolhido] = useState(sugestao?.ok ? sugestao.contrato.id : "");
  const contrato = vigentes.find((c) => c.id === escolhido);
  const autoContrato = sugestao?.ok && escolhido === sugestao.contrato.id;

  const confirmar = () => {
    if (!leitura || !contrato) return;
    onConfirmar({
      id: `b${Date.now()}`,
      contratoId: contrato.id,
      fluxo: contrato.fluxo,
      parteId: contrato.parteId,
      competencia: leitura.competencia,
      tipo: leitura.tipo,
      numero: leitura.numero,
      valor: leitura.valor,
      vencimento: leitura.vencimento,
      conferencia: "pendente",
      conformidade: "pendente",
      liberado: false,
      erp: { status: "travado" },
      arquivo: leitura.arquivo,
      autoDetectado: true,
    });
  };

  return (
    <Bloco titulo="Smart Intake" icone="fa-wand-magic-sparkles">
      <p className="-mt-2 text-sm text-brand-purple-dark/70">
        Envie o XML (NF-e, NFS-e) ou o PDF (Folha, Boleto, Fatura de Locação, RPA, NF). A leitura traz número, valor, vencimento, competência e CNPJ e sugere o contrato e a parte.
      </p>

      {!intake && (
        <FileUploader
          variant="simplified"
          upload={{ ref: "intake-arquivo", accept: ".xml,.pdf", maxEntries: 1, maxFileSize: 10_000_000, entries: [] }}
          onChange={(files) => files[0] && setIntake(lerArquivo(files[0].name))}
        />
      )}

      {intake?.intake === "falha" && (
        <Aviso
          tom="risco"
          titulo="Não foi possível ler o arquivo"
          acoes={<><Button size="small" variant="outline" onClick={() => setIntake(null)}>Enviar outro arquivo</Button><Button size="small" onClick={onManual}>Protocolo manual</Button></>}
        >
          {intake.nome ?? "O arquivo"} não é um XML de nota nem um PDF legível. Envie o XML da NF-e/NFS-e ou o PDF original, ou registre pelo protocolo manual.
        </Aviso>
      )}

      {leitura && (
        <div className="flex flex-col gap-4 rounded-xl border border-brand-purple-dark/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-bold text-brand-purple-dark">
              <Icon name={leitura.formato === "XML" ? "fa-file-code" : "fa-file-pdf"} className="text-brand-blue" />
              {leitura.arquivo.nome}
              <span className="text-xs font-normal text-brand-purple-dark/50">{kb(leitura.arquivo.tamanho)} · {leitura.formato}</span>
            </span>
            <Tag item="Leitura concluída" variant="green" leftIcon="fa-check" />
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Campos lidos</p>
            <Dados
              colunas={3}
              itens={[
                ["Documento", `${leitura.tipo} ${leitura.numero}`],
                ["Valor", <Valor valor={leitura.valor} />],
                ["Vencimento", br(leitura.vencimento)],
                ["Competência", competencia(leitura.competencia)],
                ["CNPJ do emitente", leitura.cnpj],
              ]}
            />
          </div>

          {sugestao?.ok ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="intake-contrato">Contrato</Label>
                    {autoContrato && <AutoDetectado />}
                  </div>
                  <Input
                    type="select"
                    id="intake-contrato"
                    clear={false}
                    value={escolhido}
                    options={vigentes.map((c) => ({ value: c.id, label: `${c.id} · ${parteDe(data, c)?.nome ?? ""}` }))}
                    onChange={(v) => setEscolhido(v ?? "")}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Parte e fluxo</Label>
                    {autoContrato && <AutoDetectado />}
                  </div>
                  <p className="mt-3 font-semibold text-brand-purple-dark">
                    {contrato ? parteDe(data, contrato)?.nome : "—"} {contrato && <Selo s={FLUXO[contrato.fluxo]} className="ml-1" />}
                  </p>
                </div>
              </div>
              {autoContrato ? (
                <p className="flex items-start gap-2 text-sm text-brand-purple-dark/70">
                  <Icon name="fa-circle-info" className="mt-0.5 text-brand-blue" />
                  <span><b>Critério:</b> {sugestao.criterio}</span>
                </p>
              ) : (
                <Aviso tom="atencao" titulo="Contrato trocado manualmente">
                  O CNPJ do documento é de {sugestao.parte.nome}. Confira se o contrato escolhido é mesmo o desta cobrança antes de confirmar.
                </Aviso>
              )}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button variant="outline" onClick={() => setIntake(null)}>Descartar</Button>
                <Button leftIcon="fa-check" onClick={confirmar}>Confirmar e criar cobrança</Button>
              </div>
            </>
          ) : sugestao ? (
            <Aviso
              tom="atencao"
              titulo="Nenhum contrato sugerido"
              acoes={
                <>
                  {!sugestao.parte && <Button size="small" leftIcon="fa-handshake" onClick={onCadastrarParte}>Cadastrar a parte</Button>}
                  <Button size="small" variant="outline" onClick={onManual}>Protocolo manual</Button>
                  <Button size="small" variant="ghost" onClick={() => setIntake(null)}>Descartar</Button>
                </>
              }
            >
              {sugestao.motivo} {sugestao.oQueFazer}
            </Aviso>
          ) : null}
        </div>
      )}
    </Bloco>
  );
}

/* ------------------------------------------------------------------ */
/* Conferência                                                         */
/* ------------------------------------------------------------------ */

function Linha({ rotulo, documento, contrato, ok, nota }: { rotulo: string; documento: ReactNode; contrato: ReactNode; ok: boolean; nota?: string }) {
  return (
    <tr>
      <td className="font-semibold">{rotulo}</td>
      <td>{documento}</td>
      <td>{contrato}</td>
      <td>
        <span className={cx("inline-flex items-center gap-1 text-sm font-bold", ok ? "text-brand-green-dark" : "text-yellow-dark")}>
          <Icon name={ok ? "fa-check" : "fa-triangle-exclamation"} /> {ok ? "Confere" : nota ?? "Diverge"}
        </span>
      </td>
    </tr>
  );
}

/** A Controladoria confere o documento contra o contrato antes de liberar. */
function ModalConferencia({ data, c, onCancel, onAprovar, abrirDossie }: { data: ContratosData; c: Cobranca; onCancel: () => void; onAprovar: () => void; abrirDossie: () => void }) {
  const contrato = data.contratos.find((x) => x.id === c.contratoId)!;
  const naoConformes = dossieDe(data, c.contratoId).filter((i) => i.conformidade === "nao_conforme");
  const diferenca = contrato.valor != null ? c.valor - contrato.valor : 0;
  return (
    <DrawerModal id="conferir-cobranca" show title={`Conferir ${c.tipo} ${c.numero}`} variant="medium" onCancel={onCancel} contentClass={CONTEUDO_DRAWER}>
      <div className="flex flex-col gap-5">
        <div className="w-full rounded-lg border border-brand-purple-dark/10 overflow-x-auto [&_table]:w-full [&_th]:bg-brand-blue/20 [&_th]:px-3 [&_th]:py-3 [&_th]:text-left [&_th]:text-brand-purple-dark [&_td]:px-3 [&_td]:py-3 [&_td]:text-brand-purple-dark/80 [&_tbody]:divide-y [&_tbody]:divide-brand-purple-dark/10">
          <table>
            <thead><tr><th>Item</th><th>Documento</th><th>Contrato {contrato.id}</th><th></th></tr></thead>
            <tbody>
              <Linha rotulo="Parte" documento={data.partes.find((p) => p.id === c.parteId)?.nome} contrato={parteDe(data, contrato)?.nome} ok={c.parteId === contrato.parteId} />
              <Linha rotulo="Valor" documento={<Valor valor={c.valor} />} contrato={<Valor valor={contrato.valor} />} ok={diferenca === 0} nota={`Diverge em ${brl(Math.abs(diferenca))}`} />
              <Linha rotulo="Vencimento" documento={br(c.vencimento)} contrato={contrato.vencimentoDia ? `Dia ${contrato.vencimentoDia}` : "—"} ok={!contrato.vencimentoDia || Number(c.vencimento.slice(8, 10)) === contrato.vencimentoDia} />
              <Linha rotulo="Vigência" documento={competencia(c.competencia)} contrato={`${br(contrato.inicio)} a ${br(contrato.fim)}`} ok={contrato.status === "vigente"} nota="Fora da vigência" />
            </tbody>
          </table>
        </div>

        {c.observacao && <p className="text-sm text-brand-purple-dark/70"><b>Observação do documento:</b> {c.observacao}</p>}

        {naoConformes.length > 0 ? (
          <Aviso
            tom="risco"
            titulo="Não dá para aprovar: o dossiê do contrato tem item não conforme"
            acoes={<Button size="small" variant="outline" leftIcon="fa-folder-check" onClick={abrirDossie}>Abrir o dossiê do {c.contratoId}</Button>}
          >
            {naoConformes.map((i) => `${i.documento}${i.observacoes ? ` (${i.observacoes.replace(/\.$/, "")})` : ""}`).join("; ")}. Regularize o item no Dossiê; depois confira de novo para liberar o envio.
          </Aviso>
        ) : diferenca !== 0 ? (
          <Aviso tom="atencao" titulo="Valor diferente do contratado">
            Aprove só se a diferença estiver justificada no documento ou num aditivo. Se não estiver, recuse a nota com o fornecedor e mantenha a trava.
          </Aviso>
        ) : (
          <Aviso tom="ok" titulo="Documento confere com o contrato">Ao aprovar, a cobrança fica Aprovado 100% Conforme e liberada para o ERP.</Aviso>
        )}

        <div className={RODAPE_DRAWER}>
          <Button variant="outline" onClick={onCancel}>{naoConformes.length ? "Fechar" : "Cancelar"}</Button>
          {naoConformes.length === 0 && <Button color="green" leftIcon="fa-check-double" onClick={onAprovar}>Aprovar 100% Conforme</Button>}
        </div>
      </div>
    </DrawerModal>
  );
}

/* ------------------------------------------------------------------ */
/* Detalhe do envio                                                    */
/* ------------------------------------------------------------------ */

function DetalheEnvio({ c, parte, codigoParte, opera, onTentar }: { c: Cobranca; parte: string; codigoParte: string; opera: boolean; onTentar: () => void }) {
  const payload = {
    codigo_lancamento_integracao: c.id.toUpperCase(),
    codigo_cliente_fornecedor_integracao: codigoParte,
    tipo: c.fluxo === "despesa" ? "conta_pagar" : "conta_receber",
    numero_documento: c.numero,
    data_vencimento: br(c.vencimento),
    valor_documento: MASCARA,
    observacao: `Contrato ${c.contratoId} · competência ${competencia(c.competencia)}`,
  };
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Selo s={ERP[c.erp.status]} />
        <Selo s={CONFERENCIA[c.conferencia]} />
      </div>

      <Dados
        colunas={2}
        itens={[
          ["Contrato", c.contratoId],
          ["Parte", parte],
          ["Documento", `${c.tipo} ${c.numero}`],
          ["Valor", <Valor valor={c.valor} />],
          ["Data do envio", quando(c.erp.data)],
          ["Título no Omie", c.erp.titulo ?? "—"],
        ]}
      />

      {c.erp.status === "sincronizado" && (
        <Aviso tom="ok" titulo={`Título ${c.erp.titulo} criado no Omie`}>
          Lançado no {c.fluxo === "despesa" ? "contas a pagar" : "contas a receber"} em {quando(c.erp.data)}.
        </Aviso>
      )}
      {c.erp.status === "erro" && (
        <Aviso tom="risco" titulo="O Omie recusou o envio" acoes={opera && <Button size="small" leftIcon="fa-rotate-right" onClick={onTentar}>Tentar de novo</Button>}>
          {c.erp.motivo}
        </Aviso>
      )}
      {c.erp.status === "pendente" && <Aviso tom="info" titulo="Ainda não enviado">Liberado para o ERP. Use Sincronizar com o ERP na lista.</Aviso>}

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Dados enviados (resumo)</p>
        <pre className="overflow-x-auto rounded-xl font-sans bg-brand-purple-dark/5 p-4 text-xs leading-relaxed text-brand-purple-dark/80">{JSON.stringify(payload, null, 2)}</pre>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Protocolo manual                                                    */
/* ------------------------------------------------------------------ */

type FormP = { contrato: string; fluxo: Fluxo | ""; competencia: string; parte: string; tipo: string; numero: string; valor: string; vencimento: string; observacao: string; arquivo?: Arquivo };

function ModalProtocolo({ data, cobrancas, contratoInicial, onCancel, onSalvar }: { data: ContratosData; cobrancas: Cobranca[]; contratoInicial: string; onCancel: () => void; onSalvar: (c: Cobranca) => void }) {
  const vigentes = data.contratos.filter((c) => c.status === "vigente");
  const preencher = (id: string): Partial<FormP> => {
    const c = vigentes.find((x) => x.id === id);
    if (!c) return { contrato: id };
    return {
      contrato: id,
      parte: c.parteId,
      fluxo: c.fluxo,
      valor: c.valor != null ? String(c.valor) : "",
      ...(c.vencimentoDia && { vencimento: `2026-08-${String(c.vencimentoDia).padStart(2, "0")}` }),
    };
  };
  const [form, setForm] = useState<FormP>({ contrato: "", fluxo: "", competencia: "2026-07", parte: "", tipo: "", numero: "", valor: "", vencimento: "", observacao: "", ...preencher(vigentes.some((c) => c.id === contratoInicial) ? contratoInicial : "") });
  const [auto, setAuto] = useState(vigentes.some((c) => c.id === contratoInicial));
  const [erros, setErros] = useState<Partial<Record<keyof FormP, string>>>({});
  const set = <K extends keyof FormP>(k: K, v: FormP[K]) => { setForm((f) => ({ ...f, [k]: v })); setErros((e) => ({ ...e, [k]: undefined })); };
  const entries: UploadEntry[] = form.arquivo ? [{ ref: "arquivo", clientName: form.arquivo.nome, clientSize: form.arquivo.tamanho, progress: 100, done: false }] : [];
  const tipos = data.tabelas.tipo_cobranca.filter((o) => o.ativo);
  const err = (k: keyof FormP) => (erros[k] ? [erros[k]!] : []);

  const salvar = () => {
    const e: Partial<Record<keyof FormP, string>> = {};
    if (!form.contrato) e.contrato = "Escolha o contrato Vigente da cobrança.";
    if (!form.fluxo) e.fluxo = "Informe se é a pagar (despesa) ou a receber (receita).";
    if (!form.competencia) e.competencia = "Informe o mês de competência.";
    if (!form.parte) e.parte = "Informe a parte.";
    if (!form.tipo) e.tipo = "Escolha o tipo do documento.";
    if (!form.numero.trim()) e.numero = "Informe o número do documento.";
    else if (cobrancas.some((b) => b.contratoId === form.contrato && b.numero === form.numero.trim()))
      e.numero = `Já existe o documento ${form.numero.trim()} neste contrato. Confira se não é a mesma cobrança.`;
    if (!(Number(form.valor) > 0)) e.valor = "Informe um valor maior que zero.";
    if (!form.vencimento) e.vencimento = "Informe o vencimento.";
    setErros(e);
    if (Object.keys(e).length) return;
    onSalvar({
      id: `b${Date.now()}`,
      contratoId: form.contrato,
      fluxo: form.fluxo as Fluxo,
      parteId: form.parte,
      competencia: form.competencia,
      tipo: form.tipo,
      numero: form.numero.trim(),
      valor: Number(form.valor),
      vencimento: form.vencimento,
      conferencia: "pendente",
      conformidade: "pendente",
      liberado: false,
      erp: { status: "travado" },
      ...(form.arquivo && { arquivo: form.arquivo }),
      ...(form.observacao.trim() && { observacao: form.observacao.trim() }),
    });
  };

  return (
    <DrawerModal id="protocolo-manual" show title="Protocolo manual de cobrança" variant="medium" onCancel={onCancel} contentClass={CONTEUDO_DRAWER}>
      <div className="flex flex-col gap-6">
        <Aviso tom="info">A cobrança entra como Pendente Conferência e fica com a Trava de Governança até a Controladoria conferir.</Aviso>
        <Input
          type="select"
          id="pm-contrato"
          label="Contrato"
          prompt="Escolha o contrato Vigente"
          value={form.contrato}
          options={vigentes.map((c) => ({ value: c.id, label: `${c.id} · ${parteDe(data, c)?.nome ?? ""}` }))}
          onChange={(v) => { setForm((f) => ({ ...f, ...preencher(v ?? "") })); setErros({}); setAuto(!!v); }}
          errors={err("contrato")}
        />
        {auto && <p className="-mt-4 text-sm text-brand-purple-dark/60"><Icon name="fa-circle-info" className="mr-1 text-brand-blue" />Parte, fluxo, valor e vencimento vieram do contrato. Ajuste se o documento for diferente.</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            type="select"
            id="pm-parte"
            label="Parte"
            prompt="Escolha a parte"
            value={form.parte}
            options={data.partes.filter((p) => p.ativo).map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nome}` }))}
            onChange={(v) => set("parte", v ?? "")}
            errors={err("parte")}
          />
          <Input
            type="select"
            id="pm-fluxo"
            label="Fluxo"
            prompt="Pagar ou receber"
            value={form.fluxo}
            options={[{ value: "despesa", label: "Despesa (a pagar)" }, { value: "receita", label: "Receita (a receber)" }]}
            onChange={(v) => set("fluxo", (v ?? "") as Fluxo | "")}
            errors={err("fluxo")}
          />
          <Input type="month" id="pm-competencia" label="Competência" value={form.competencia} onChange={(e) => set("competencia", e.target.value)} errors={err("competencia")} />
          <Input
            type="select"
            id="pm-tipo"
            label="Tipo"
            prompt="Escolha o tipo"
            value={form.tipo}
            options={tipos.map((o) => ({ value: o.descricao, label: o.descricao }))}
            onChange={(v) => set("tipo", v ?? "")}
            errors={err("tipo")}
          />
          <Input id="pm-numero" label="Nº do documento" placeholder="Ex.: 2026/0815" value={form.numero} onChange={(e) => set("numero", e.target.value)} errors={err("numero")} />
          <Input type="number" id="pm-valor" label="Valor" hint="R$" min={0} step="0.01" value={form.valor} onChange={(e) => set("valor", e.target.value)} errors={err("valor")} />
          <Input type="date" id="pm-vencimento" label="Vencimento" value={form.vencimento} onChange={(e) => set("vencimento", e.target.value)} errors={err("vencimento")} />
        </div>
        <Input type="textarea" id="pm-obs" label="Observação" rows={2} value={form.observacao} onChange={(e) => set("observacao", e.target.value)} />
        <div>
          <Label>Arquivo</Label>
          <div className="mt-1">
            <FileUploader
              variant="simplified"
              upload={{ ref: "pm-arquivo", accept: ".xml,.pdf", maxEntries: 1, maxFileSize: 10_000_000, entries }}
              onChange={(files) => files[0] && set("arquivo", { nome: files[0].name, tamanho: files[0].size })}
              onCancel={() => set("arquivo", undefined)}
            />
          </div>
        </div>
        <div className={RODAPE_DRAWER}>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button leftIcon="fa-check" onClick={salvar}>Registrar cobrança</Button>
        </div>
      </div>
    </DrawerModal>
  );
}
