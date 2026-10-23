/**
 * Gestão de Contratos — Conformidade: Dossiê (FR-070 a FR-073).
 *
 * A central de Conformidade tem duas abas, Dossiê e Cobrança, e pode abrir
 * filtrada por um contrato (FR-070). Aqui ficam os itens de dossiê de todos os
 * contratos: o checklist inicial de cada um (RN-031, `DOS-{contrato}-01..03`,
 * ou 04 com liminar) e os documentos fora do checklist (`DOS-{contrato}-NN`,
 * RN-007), com o resumo por contrato ("100% Conforme" ou "Pendente de
 * Documentos") e o protocolo de documento.
 *
 * Protocolar um documento com a mesma natureza e o mesmo documento de um item
 * pendente preenche esse item em vez de criar outro (RN-050): um item
 * duplicado deixaria o pendente aberto para sempre e o checklist do contrato
 * nunca fecharia. O status vem de uma lista fechada ("Conforme / Aprovado" ou
 * "Pendente Regularização"); validade vazia é "Indeterminada".
 *
 * Feito na tela (componente novo): os cartões de resumo por contrato e a
 * escolha rápida de item pendente no protocolo. O resto é `table`, `input`,
 * `drawer_modal`, `file_uploader`, `tag`, `button`, `button_tabs` e
 * `empty_state_card`.
 */
import { useMemo, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { FileUploader, type UploadEntry } from "../components/FileUploader.js";
import { Icon } from "../components/Icon.js";
import { Input, Label, cx } from "../components/Input.js";
import { EmptyStateCard } from "../components/Layout.js";
import { DrawerModal } from "../components/Overlay.js";
import { Table } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import {
  ANEXO_TIPOS, CONFORMIDADE, TODAY, br, diasAte, kb, parteDe, proximoCodigoItem, validarAnexo,
  type Arquivo, type Conformidade, type ContratosData, type DossieItem, type Papel,
} from "./gestao-de-contratos/model.js";
import { Aviso, Bloco, ContratosShell, Selo, exportarPlanilha, papelDe, irFicha, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";

/** Quem protocola documento no dossiê (Compliance). Os demais papéis só consultam. */
const PROTOCOLA: Papel[] = ["juridico", "operador", "compras", "administrador"];

/** Padrões do protocolo (RN-050). */
const PADRAO_OBSERVACAO = "Documento homologado";
const PADRAO_AUDITOR = "Compliance / Jurídico";
/** Lista fechada do status do protocolo (RN-050). */
const STATUS_PROTOCOLO: Conformidade[] = ["conforme", "pendente"];

type FiltroStatus = "conformes" | "pendentes";
type FiltroNatureza = "aso" | "certidoes";
const STATUS_F: { id: FiltroStatus; label: string; icon: string }[] = [
  { id: "conformes", label: "Conformes", icon: "fa-circle-check" },
  { id: "pendentes", label: "Pendentes", icon: "fa-clock" },
];
/**
 * ASO/Saúde: documentos com ASO ou de saúde (ex.: o item 3 do checklist,
 * "Certidão de Regularidade Profissional / ASO Admissional"). Certidões: CND e
 * certidões. Um mesmo item pode estar nos dois.
 */
const NATUREZA_F: { id: FiltroNatureza; label: string; icon: string; passa: (i: DossieItem) => boolean }[] = [
  { id: "aso", label: "ASO/Saúde", icon: "fa-stethoscope", passa: (i) => /\bASO\b|saúde/i.test(`${i.documento} ${i.natureza}`) },
  { id: "certidoes", label: "Certidões", icon: "fa-file-certificate", passa: (i) => /\bCND\b|certid/i.test(i.documento) },
];

const pendente = (i: DossieItem) => i.conformidade !== "conforme";
const mesmo = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Validade: vazia é "Indeterminada" (RN-050); vencida em vermelho, até 30 dias em âmbar. */
function Validade({ iso }: { iso?: string }) {
  if (!iso) return <span className="text-brand-purple-dark/60">Indeterminada</span>;
  const d = diasAte(iso);
  if (d < 0) return <span className="flex flex-col"><span className="font-bold text-red">{br(iso)}</span><span className="text-xs font-bold text-red">Vencida há {-d} dia{d === -1 ? "" : "s"}</span></span>;
  if (d <= 30) return <span className="flex flex-col"><span className="font-bold text-yellow-dark">{br(iso)}</span><span className="text-xs font-bold text-yellow-dark">Vence em {d} dia{d === 1 ? "" : "s"}</span></span>;
  return <span>{br(iso)}</span>;
}

/** Situação do dossiê do contrato (RN-050): "100% Conforme" ou "Pendente de Documentos". */
const situacao = (itens: DossieItem[]) => (itens.length > 0 && itens.every((i) => !pendente(i)) ? "100% Conforme" : "Pendente de Documentos");

function SeloContrato({ itens }: { itens: DossieItem[] }) {
  const n = itens.filter(pendente).length;
  return n === 0 ? (
    <Tag item="100% Conforme" variant="green" leftIcon="fa-check" className="whitespace-nowrap" />
  ) : (
    <Tag item={`Pendente de Documentos (${n})`} variant="yellow" leftIcon="fa-clock" className="whitespace-nowrap" />
  );
}

export function ContratosDossie({ context }: ScreenProps) {
  const papel = papelDe(context, "juridico");
  return (
    <ContratosShell
      context={context}
      secao="dossie"
      titulo="Conformidade — Dossiê"
      subtitulo="Os documentos exigidos de cada contrato. O contrato fica 100% Conforme quando todos os itens estão Conforme / Aprovado."
    >
      {(data) => (
        <Dossie
          key={JSON.stringify(context.controls)}
          data={data}
          controls={context.controls as Record<string, string>}
          podeProtocolar={PROTOCOLA.includes(papel)}
          abrir={(id) => irFicha(context, id, "dossie")}
        />
      )}
    </ContratosShell>
  );
}

function Dossie({ data, controls, podeProtocolar, abrir }: { data: ContratosData; controls: Record<string, string>; podeProtocolar: boolean; abrir: (id: string) => void }) {
  const [itens, setItens] = useState<DossieItem[]>(data.dossie);
  const f = controls.filtro;
  const [status, setStatus] = useState<FiltroStatus | "">(f === "conformes" || f === "pendentes" ? f : "");
  const [natureza, setNatureza] = useState<FiltroNatureza | "">(f === "aso" || f === "certidoes" ? f : "");
  const [contrato, setContrato] = useState(data.contratos.some((c) => c.id === controls.contrato) ? controls.contrato! : "");
  const [busca, setBusca] = useState("");
  const [protocolar, setProtocolar] = useState(podeProtocolar && controls.modal === "protocolar");

  const nomeParte = (contratoId: string) => {
    const c = data.contratos.find((x) => x.id === contratoId);
    return c ? parteDe(data, c)?.nome ?? "" : "";
  };

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const nat = NATUREZA_F.find((n) => n.id === natureza);
    return itens
      .filter((i) => !contrato || i.contratoId === contrato)
      .filter((i) => !status || (status === "conformes" ? !pendente(i) : pendente(i)))
      .filter((i) => !nat || nat.passa(i))
      .filter((i) => !q || [i.codigo, i.contratoId, i.documento, i.natureza, nomeParte(i.contratoId), i.arquivo?.nome ?? "", i.auditor ?? ""].some((s) => s.toLowerCase().includes(q)))
      .sort((a, b) => a.contratoId.localeCompare(b.contratoId) || a.codigo.localeCompare(b.codigo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, contrato, status, natureza, busca]);

  /** Contratos com checklist, para o resumo. */
  const contratosComItens = [...new Set(itens.map((i) => i.contratoId))].sort();
  const doContrato = (id: string) => itens.filter((i) => i.contratoId === id);
  const noContrato = (i: DossieItem) => !contrato || i.contratoId === contrato;

  const limpar = () => { setStatus(""); setNatureza(""); setContrato(""); setBusca(""); };
  const exportar = () =>
    exportarPlanilha(
      "dossie-de-conformidade",
      ["Código", "Contrato", "Parte", "Natureza", "Documento", "Arquivo", "Validade", "Conformidade", "Auditor", "Observações"],
      lista.map((i) => [i.codigo, i.contratoId, nomeParte(i.contratoId), i.natureza, i.documento, i.arquivo?.nome ?? "Pendente de Anexo", i.validade ? br(i.validade) : "Indeterminada", CONFORMIDADE[i.conformidade].label, i.auditor ?? "", i.observacoes ?? ""]),
    );

  const salvar = (novo: DossieItem, preencheId?: string) => {
    const proximos = preencheId ? itens.map((i) => (i.id === preencheId ? { ...i, ...novo, id: i.id, codigo: i.codigo, obrigatorio: i.obrigatorio } : i)) : [...itens, novo];
    const codigo = preencheId ? itens.find((i) => i.id === preencheId)!.codigo : novo.codigo;
    setItens(proximos);
    setProtocolar(false);
    // Recalcula o checklist do contrato depois do protocolo (FR-073).
    const agora = situacao(proximos.filter((i) => i.contratoId === novo.contratoId));
    showToast({
      type: "success",
      title: preencheId ? "Item do checklist preenchido" : "Documento protocolado",
      content: `${codigo} · ${novo.documento}. Dossiê do ${novo.contratoId}: ${agora}.`,
      closeTime: 5000,
    });
  };

  if (itens.length === 0) {
    return (
      <div className="space-y-6">
        <Bloco>
          <EmptyStateCard icon="fa-folder-check" text="Nenhum documento no dossiê">
            <p>Os itens do dossiê nascem com o contrato: todo contrato traz o checklist inicial (contrato social e cartão CNPJ, CND Federal e regularidade profissional / ASO, mais a decisão liminar quando houver).</p>
            <p>Quando houver contratos, os documentos pendentes e protocolados aparecem aqui.</p>
          </EmptyStateCard>
        </Bloco>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Resumo por contrato: clicar filtra a lista. */}
      <section aria-label="Resumo por contrato" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {contratosComItens.map((id) => {
          const doC = doContrato(id);
          const ativo = contrato === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={ativo}
              onClick={() => setContrato(ativo ? "" : id)}
              className={cx(
                "flex flex-col gap-2 rounded-2xl bg-white p-4 text-left shadow-main transition",
                ativo ? "ring-2 ring-brand-blue" : "hover:ring-2 hover:ring-brand-blue/30",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-brand-purple-dark">{id}</span>
                <SeloContrato itens={doC} />
              </div>
              <span className="text-sm text-brand-purple-dark/70 truncate">{nomeParte(id)}</span>
              <span className="text-xs text-brand-purple-dark/50">
                {doC.filter((i) => !pendente(i)).length} de {doC.length} Conforme / Aprovado
              </span>
            </button>
          );
        })}
      </section>

      <Bloco>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Input type="search" id="dossie-busca" placeholder="Buscar código, contrato, parte ou documento" leftIcon="fa-magnifying-glass" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full sm:w-72" inputClass="text-ellipsis" />
            <Input type="select" id="dossie-status" label="Status" prompt="Todos" value={status} options={STATUS_F.map((s) => ({ label: `${s.label} (${itens.filter((i) => noContrato(i) && (s.id === "conformes" ? !pendente(i) : pendente(i))).length})`, value: s.id }))} onChange={(v) => setStatus((v ?? "") as FiltroStatus | "")} className="w-full sm:w-48" />
            <Input type="select" id="dossie-natureza" label="Tipo de documento" prompt="Todos" value={natureza} options={NATUREZA_F.map((n) => ({ label: `${n.label} (${itens.filter((i) => noContrato(i) && n.passa(i)).length})`, value: n.id }))} onChange={(v) => setNatureza((v ?? "") as FiltroNatureza | "")} className="w-full sm:w-52" />
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <Button variant="tint" leftIcon="fa-file-spreadsheet" onClick={exportar}>Exportar planilha</Button>
              {podeProtocolar && <Button leftIcon="fa-file-circle-plus" onClick={() => setProtocolar(true)}>Protocolar documento</Button>}
            </div>
          </div>
        </div>

        {lista.length === 0 ? (
          <EmptyStateCard icon="fa-filter-circle-xmark" text="Nenhum documento com esses filtros">
            <p>Limpe os filtros para ver o dossiê todo.</p>
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={limpar}>Limpar Todos</Button>
            </div>
          </EmptyStateCard>
        ) : (
          <Table
            id="dossie"
            rows={lista}
            rowId={(i) => i.id}
            col={[
              {
                label: "Contrato",
                render: (i) => (
                  <div className="flex flex-col items-start gap-1">
                    <button type="button" onClick={() => abrir(i.contratoId)} className="font-bold text-brand-purple-dark hover:text-brand-blue hover:underline whitespace-nowrap">{i.contratoId}</button>
                    <SeloContrato itens={doContrato(i.contratoId)} />
                  </div>
                ),
              },
              { label: "Parte", className: "min-w-48", render: (i) => <span className="text-sm">{nomeParte(i.contratoId)}</span> },
              { label: "Natureza", render: (i) => <span className="text-sm whitespace-nowrap">{i.natureza}</span> },
              {
                label: "Documento",
                className: "min-w-56",
                render: (i) => (
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-xs font-bold text-brand-purple-dark/50 whitespace-nowrap">{i.codigo}{i.obrigatorio ? " · Obrigatório" : ""}</span>
                    <p className="font-semibold text-brand-purple-dark">{i.documento}</p>
                    {i.observacoes && <p className="text-xs text-brand-purple-dark/60">{i.observacoes}</p>}
                  </div>
                ),
              },
              {
                label: "Arquivo",
                render: (i) =>
                  i.arquivo ? (
                    <span className="flex items-center gap-2 text-sm">
                      <Icon name="fa-file-pdf" className="text-brand-purple-dark/50" />
                      <span className="flex flex-col">
                        <span className="font-semibold">{i.arquivo.nome}</span>
                        <span className="text-xs text-brand-purple-dark/50">{kb(i.arquivo.tamanho)}</span>
                      </span>
                    </span>
                  ) : (
                    <Tag item="Pendente de Anexo" variant="yellow" leftIcon="fa-paperclip" className="whitespace-nowrap" />
                  ),
              },
              { label: "Validade", render: (i) => <span className="text-sm whitespace-nowrap"><Validade iso={i.validade} /></span> },
              { label: "Conformidade", render: (i) => <Selo s={CONFORMIDADE[i.conformidade]} /> },
              { label: "Auditor", render: (i) => <span className="text-sm whitespace-nowrap">{i.auditor ?? "—"}</span> },
            ]}
          />
        )}
      </Bloco>

      {protocolar && (
        <ModalProtocolo
          data={data}
          itens={itens}
          contratoInicial={contrato || (data.contratos.some((c) => c.id === controls.contrato) ? controls.contrato! : "")}
          onCancel={() => setProtocolar(false)}
          onSalvar={salvar}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Protocolar documento (FR-072, RN-050)                               */
/* ------------------------------------------------------------------ */

type Form = { contrato: string; natureza: string; documento: string; validade: string; conformidade: Conformidade; arquivo?: Arquivo; observacoes: string };

function ModalProtocolo({
  data, itens, contratoInicial, onCancel, onSalvar,
}: {
  data: ContratosData;
  itens: DossieItem[];
  contratoInicial: string;
  onCancel: () => void;
  onSalvar: (item: DossieItem, preencheId?: string) => void;
}) {
  const pendentesDe = (contratoId: string) => itens.filter((i) => i.contratoId === contratoId && pendente(i));
  // Com um único pendente no contrato, o protocolo já abre nele (ex.: o ASO admissional do CTR-2026-0005).
  const unico = contratoInicial && pendentesDe(contratoInicial).length === 1 ? pendentesDe(contratoInicial)[0] : undefined;
  const [form, setForm] = useState<Form>({
    contrato: contratoInicial,
    natureza: unico?.natureza ?? "",
    documento: unico?.documento ?? "",
    validade: "",
    conformidade: "conforme",
    observacoes: "",
  });
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f) => ({ ...f, [k]: v })); setErros((e) => ({ ...e, [k]: undefined })); };

  const contratos = data.contratos.filter((c) => c.status !== "encerrado");
  const naturezas = data.tabelas.natureza_dossie.filter((o) => o.ativo).sort((a, b) => a.ordem - b.ordem);
  // Item pendente com a mesma natureza e o mesmo documento: o protocolo preenche esse item (RN-050).
  const existente = form.contrato && form.natureza && form.documento.trim()
    ? itens.find((i) => i.contratoId === form.contrato && pendente(i) && mesmo(i.natureza, form.natureza) && mesmo(i.documento, form.documento))
    : undefined;
  const pendentes = form.contrato ? pendentesDe(form.contrato) : [];
  const codigoNovo = form.contrato ? proximoCodigoItem("DOS", itens, form.contrato) : "";

  const entries: UploadEntry[] = form.arquivo ? [{ ref: "arquivo", clientName: form.arquivo.nome, clientSize: form.arquivo.tamanho, progress: 100, done: false }] : [];

  /** Anexo: tipos e tamanho do RN-008; recusado, nada fica gravado. */
  const anexar = (file: File) => {
    const a = { nome: file.name, tamanho: file.size };
    const erro = validarAnexo(a);
    if (erro) { setForm((f) => ({ ...f, arquivo: undefined })); setErros((e) => ({ ...e, arquivo: erro })); return; }
    set("arquivo", a);
  };

  const salvar = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.contrato) e.contrato = "Escolha o contrato do documento.";
    if (!form.natureza) e.natureza = "Escolha a natureza do documento.";
    if (!form.documento.trim()) e.documento = "Informe qual documento exigido está sendo protocolado.";
    setErros(e);
    if (Object.keys(e).length) return;
    onSalvar(
      {
        id: `d${Date.now()}`,
        codigo: existente?.codigo ?? codigoNovo,
        contratoId: form.contrato,
        natureza: existente?.natureza ?? form.natureza,
        documento: existente?.documento ?? form.documento.trim(),
        conformidade: form.conformidade,
        ...(form.arquivo && { arquivo: form.arquivo }),
        ...(form.validade && { validade: form.validade }),
        observacoes: form.observacoes.trim() || PADRAO_OBSERVACAO,
        auditor: PADRAO_AUDITOR,
        protocolo: TODAY,
      },
      existente?.id,
    );
  };

  return (
    <DrawerModal id="protocolar-documento" show title="Protocolar documento" variant="medium" onCancel={onCancel} contentClass={CONTEUDO_DRAWER}>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            type="select"
            id="prot-contrato"
            label="Contrato"
            prompt="Escolha o contrato"
            value={form.contrato}
            options={contratos.map((c) => ({ value: c.id, label: `${c.id} · ${parteDe(data, c)?.nome ?? ""}` }))}
            onChange={(v) => set("contrato", v ?? "")}
            errors={erros.contrato ? [erros.contrato] : []}
          />
          <Input
            type="select"
            id="prot-natureza"
            label="Natureza"
            prompt="Escolha a natureza"
            value={form.natureza}
            options={naturezas.map((o) => ({ value: o.descricao, label: o.descricao }))}
            onChange={(v) => set("natureza", v ?? "")}
            errors={erros.natureza ? [erros.natureza] : []}
          />
        </div>

        {/* Escolher um item pendente do checklist preenche documento e natureza: o protocolo completa esse item. */}
        {pendentes.length > 0 && (
          <Input
            type="select"
            id="prot-pendente"
            label="Item pendente deste contrato"
            prompt="Nenhum: documento fora do checklist"
            value={pendentes.find((p) => mesmo(p.documento, form.documento) && mesmo(p.natureza, form.natureza))?.id ?? ""}
            options={pendentes.map((p) => ({ label: `${p.codigo} · ${p.documento} (${p.natureza})`, value: p.id }))}
            onChange={(v) => {
              const p = pendentes.find((x) => x.id === v);
              if (p) { set("documento", p.documento); set("natureza", p.natureza); } else set("documento", "");
            }}
          />
        )}

        <Input
          id="prot-documento"
          label="Documento exigido"
          placeholder="Ex.: Certidão Conjunta RFB/PGFN (CND Federal)"
          value={form.documento}
          onChange={(e) => set("documento", e.target.value)}
          errors={erros.documento ? [erros.documento] : []}
        />

        {existente ? (
          <Aviso tom="info" titulo={`O protocolo vai preencher o item ${existente.codigo}`}>
            {existente.documento} ({existente.natureza}) do {existente.contratoId} está {CONFORMIDADE[existente.conformidade].label}
            {existente.observacoes ? ` (${existente.observacoes.replace(/\.$/, "")})` : ""}. Nenhum item novo será criado.
          </Aviso>
        ) : form.contrato && form.documento.trim() ? (
          <Aviso tom="neutro" titulo={`Documento fora do checklist: cria o item ${codigoNovo}`}>
            Nenhum item pendente do {form.contrato} tem esta natureza e este documento.
          </Aviso>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            type="date"
            id="prot-validade"
            label="Validade (vazia: Indeterminada)"
            value={form.validade}
            onChange={(e) => set("validade", e.target.value)}
          />
          <Input
            type="select"
            id="prot-conformidade"
            label="Status de conformidade"
            clear={false}
            value={form.conformidade}
            options={STATUS_PROTOCOLO.map((k) => ({ value: k, label: CONFORMIDADE[k].label }))}
            onChange={(v) => set("conformidade", (v ?? "conforme") as Conformidade)}
          />
        </div>

        <div>
          <Label>Arquivo</Label>
          <div className="mt-1">
            <FileUploader
              variant="simplified"
              upload={{ ref: "prot-arquivo", accept: ANEXO_TIPOS.map((t) => `.${t}`).join(","), maxEntries: 1, entries }}
              onChange={(files) => files[0] && anexar(files[0])}
              onCancel={() => set("arquivo", undefined)}
            />
          </div>
          <p className="mt-1 text-xs text-brand-purple-dark/60">PDF, DOC, DOCX, PNG, JPG, JPEG ou XML, até 25 MB. Sem arquivo, a lista mostra Pendente de Anexo.</p>
          {erros.arquivo && <p className="mt-1 text-sm text-red"><Icon name="fa-circle-exclamation" className="mr-1" />{erros.arquivo}</p>}
        </div>

        <Input type="textarea" id="prot-obs" label="Observações" rows={3} placeholder={PADRAO_OBSERVACAO} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />

        <p className="-mt-4 text-sm text-brand-purple-dark/60"><Icon name="fa-user-shield" className="mr-1" />Sem observação, grava "{PADRAO_OBSERVACAO}". Auditor: {PADRAO_AUDITOR}.</p>

        <div className={RODAPE_DRAWER}>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button leftIcon="fa-check" onClick={salvar}>{existente ? "Preencher item pendente" : "Protocolar"}</Button>
        </div>
      </div>
    </DrawerModal>
  );
}
