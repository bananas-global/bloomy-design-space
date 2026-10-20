/**
 * Gestão de Contratos — Conformidade: Dossiê.
 *
 * Os itens de dossiê de todos os contratos, com o resumo por contrato ("100%
 * Conforme" ou "N pendente(s)") e o protocolo de documento. Protocolar um
 * documento que já tem item pendente preenche esse item em vez de criar outro:
 * um item duplicado deixaria o pendente aberto para sempre e o checklist do
 * contrato nunca fecharia.
 *
 * Feito na tela (componente novo): os cartões de resumo por contrato e a
 * escolha rápida de item pendente no protocolo. O resto é `table`, `input`,
 * `modal`, `file_uploader`, `tag`, `button` e `empty_state_card`.
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
  CONFORMIDADE, br, diasAte, kb, parteDe,
  type Arquivo, type Conformidade, type ContratosData, type DossieItem, type Papel,
} from "./gestao-de-contratos/model.js";
import { Aviso, Bloco, ContratosShell, Selo, exportarPlanilha, papelDe, irFicha, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";

/** Quem protocola documento no dossiê. Os demais papéis só consultam. */
const PROTOCOLA: Papel[] = ["juridico", "operador", "compras", "administrador"];

type FiltroStatus = "conformes" | "pendentes";
type FiltroNatureza = "aso" | "certidoes";
const STATUS_F: { id: FiltroStatus; label: string; icon: string }[] = [
  { id: "conformes", label: "Conformes", icon: "fa-circle-check" },
  { id: "pendentes", label: "Pendentes", icon: "fa-clock" },
];
const NATUREZA_F: { id: FiltroNatureza; label: string; natureza: string; icon: string }[] = [
  { id: "aso", label: "ASO/Saúde", natureza: "ASO/Saúde", icon: "fa-stethoscope" },
  { id: "certidoes", label: "Certidões", natureza: "Certidões", icon: "fa-file-certificate" },
];

const pendente = (i: DossieItem) => i.conformidade !== "conforme";
const mesmoDoc = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Validade: vencida em vermelho, até 30 dias em âmbar. */
function Validade({ iso }: { iso?: string }) {
  if (!iso) return <span className="text-brand-purple-dark/40">Sem validade</span>;
  const d = diasAte(iso);
  if (d < 0) return <span className="flex flex-col"><span className="font-bold text-red">{br(iso)}</span><span className="text-xs font-bold text-red">Vencida há {-d} dia{d === -1 ? "" : "s"}</span></span>;
  if (d <= 30) return <span className="flex flex-col"><span className="font-bold text-yellow-dark">{br(iso)}</span><span className="text-xs font-bold text-yellow-dark">Vence em {d} dia{d === 1 ? "" : "s"}</span></span>;
  return <span>{br(iso)}</span>;
}

function SeloContrato({ itens }: { itens: DossieItem[] }) {
  const n = itens.filter(pendente).length;
  return n === 0 ? (
    <Tag item="100% Conforme" variant="green" leftIcon="fa-check" className="whitespace-nowrap" />
  ) : (
    <Tag item={`${n} pendente${n === 1 ? "" : "s"}`} variant="yellow" leftIcon="fa-clock" className="whitespace-nowrap" />
  );
}

export function ContratosDossie({ context }: ScreenProps) {
  const papel = papelDe(context, "juridico");
  return (
    <ContratosShell
      context={context}
      secao="dossie"
      titulo="Conformidade — Dossiê"
      subtitulo="Os documentos exigidos de cada contrato. O contrato fica 100% Conforme quando todos os itens estão conformes."
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

  const atual: ContratosData = { ...data, dossie: itens };
  const nomeParte = (contratoId: string) => {
    const c = data.contratos.find((x) => x.id === contratoId);
    return c ? parteDe(data, c)?.nome ?? "" : "";
  };

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const nat = NATUREZA_F.find((n) => n.id === natureza)?.natureza;
    return itens
      .filter((i) => !contrato || i.contratoId === contrato)
      .filter((i) => !status || (status === "conformes" ? !pendente(i) : pendente(i)))
      .filter((i) => !nat || i.natureza === nat)
      .filter((i) => !q || [i.contratoId, i.documento, i.natureza, nomeParte(i.contratoId), i.arquivo?.nome ?? "", i.auditor ?? ""].some((s) => s.toLowerCase().includes(q)))
      .sort((a, b) => a.contratoId.localeCompare(b.contratoId) || Number(pendente(b)) - Number(pendente(a)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, contrato, status, natureza, busca]);

  /** Contratos com checklist, para o resumo. */
  const contratosComItens = [...new Set(itens.map((i) => i.contratoId))].sort();

  const limpar = () => { setStatus(""); setNatureza(""); setContrato(""); setBusca(""); };
  const exportar = () =>
    exportarPlanilha(
      "dossie-de-conformidade",
      ["Contrato", "Parte", "Natureza", "Documento", "Arquivo", "Validade", "Conformidade", "Auditor", "Observações"],
      lista.map((i) => [i.contratoId, nomeParte(i.contratoId), i.natureza, i.documento, i.arquivo?.nome ?? "Pendente de Anexo", br(i.validade), CONFORMIDADE[i.conformidade].label, i.auditor ?? "", i.observacoes ?? ""]),
    );

  const salvar = (novo: DossieItem, preencheId?: string) => {
    const proximos = preencheId ? itens.map((i) => (i.id === preencheId ? { ...novo, id: preencheId } : i)) : [...itens, novo];
    setItens(proximos);
    setProtocolar(false);
    const ficou100 = proximos.filter((i) => i.contratoId === novo.contratoId).every((i) => !pendente(i));
    const antes100 = itens.filter((i) => i.contratoId === novo.contratoId).every((i) => !pendente(i));
    showToast({
      type: "success",
      title: preencheId ? "Item pendente preenchido" : "Documento protocolado",
      content: ficou100 && !antes100
        ? `${novo.documento} protocolado. ${novo.contratoId} agora está 100% Conforme.`
        : `${novo.documento} protocolado no dossiê do ${novo.contratoId}.`,
      closeTime: 5000,
    });
  };

  if (itens.length === 0) {
    return (
      <Bloco>
        <EmptyStateCard icon="fa-folder-check" text="Nenhum documento no dossiê">
          <p>Os itens do dossiê nascem com o contrato: cada categoria traz o checklist dos documentos exigidos.</p>
          <p>Quando houver contratos, os documentos pendentes e protocolados aparecem aqui.</p>
        </EmptyStateCard>
      </Bloco>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo por contrato: clicar filtra a lista. */}
      <section aria-label="Resumo por contrato" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {contratosComItens.map((id) => {
          const doContrato = itens.filter((i) => i.contratoId === id);
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
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-brand-purple-dark">{id}</span>
                <SeloContrato itens={doContrato} />
              </div>
              <span className="text-sm text-brand-purple-dark/70 truncate">{nomeParte(id)}</span>
              <span className="text-xs text-brand-purple-dark/50">
                {doContrato.filter((i) => !pendente(i)).length} de {doContrato.length} conforme(s)
              </span>
            </button>
          );
        })}
      </section>

      <Bloco>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Input type="search" id="dossie-busca" placeholder="Buscar contrato, parte ou documento" leftIcon="fa-magnifying-glass" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full sm:w-72" inputClass="text-ellipsis" />
            <Input type="select" id="dossie-status" label="Status" prompt="Todos os status" value={status} options={STATUS_F.map((s) => ({ label: `${s.label} (${itens.filter((i) => (!contrato || i.contratoId === contrato) && (s.id === "conformes" ? !pendente(i) : pendente(i))).length})`, value: s.id }))} onChange={(v) => setStatus((v ?? "") as FiltroStatus | "")} className="w-full sm:w-48" />
            <Input type="select" id="dossie-natureza" label="Natureza" prompt="Todas as naturezas" value={natureza} options={NATUREZA_F.map((n) => ({ label: n.label, value: n.id }))} onChange={(v) => setNatureza((v ?? "") as FiltroNatureza | "")} className="w-full sm:w-52" />
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <Button variant="tint" leftIcon="fa-file-spreadsheet" onClick={exportar}>Exportar planilha</Button>
              {podeProtocolar && <Button leftIcon="fa-file-circle-plus" onClick={() => setProtocolar(true)}>Protocolar documento</Button>}
            </div>
          </div>
        </div>

        {lista.length === 0 ? (
          <EmptyStateCard icon="fa-filter-circle-xmark" text="Nenhum documento com esses filtros">
            <p>Remova uma etiqueta ou limpe os filtros para ver o dossiê todo.</p>
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
                    <SeloContrato itens={atual.dossie.filter((x) => x.contratoId === i.contratoId)} />
                  </div>
                ),
              },
              { label: "Parte", className: "min-w-48", render: (i) => <span className="text-sm">{nomeParte(i.contratoId)}</span> },
              { label: "Natureza", render: (i) => <span className="text-sm whitespace-nowrap">{i.natureza}</span> },
              {
                label: "Documento",
                className: "min-w-48",
                render: (i) => (
                  <div>
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
/* Protocolar documento                                                */
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
  // Com um único pendente no contrato, o protocolo já abre nele (ex.: o ASO do CT-2026-005).
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
  const naturezas = data.tabelas.natureza_dossie.filter((o) => o.ativo);
  const existente = form.contrato && form.documento.trim() ? itens.find((i) => i.contratoId === form.contrato && pendente(i) && mesmoDoc(i.documento, form.documento)) : undefined;
  const pendentes = form.contrato ? pendentesDe(form.contrato) : [];

  const entries: UploadEntry[] = form.arquivo ? [{ ref: "arquivo", clientName: form.arquivo.nome, clientSize: form.arquivo.tamanho, progress: 100, done: false }] : [];

  const salvar = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.contrato) e.contrato = "Escolha o contrato do documento.";
    if (!form.natureza) e.natureza = "Escolha a natureza do documento.";
    if (!form.documento.trim()) e.documento = "Informe qual documento exigido está sendo protocolado.";
    if (form.conformidade === "conforme" && !form.arquivo) e.arquivo = "Anexe o arquivo: sem ele o item não pode ser Conforme. Sem o arquivo, marque Pendente.";
    if (form.conformidade === "conforme" && form.validade && diasAte(form.validade) < 0)
      e.validade = "Documento vencido não pode ser Conforme. Anexe um documento válido ou marque Não conforme.";
    setErros(e);
    if (Object.keys(e).length) return;
    onSalvar(
      {
        id: `d${Date.now()}`,
        contratoId: form.contrato,
        natureza: form.natureza,
        documento: existente?.documento ?? form.documento.trim(),
        conformidade: form.conformidade,
        ...(form.arquivo && { arquivo: form.arquivo }),
        ...(form.validade && { validade: form.validade }),
        ...(form.observacoes.trim() && { observacoes: form.observacoes.trim() }),
        auditor: "Marina Alves",
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
            value={pendentes.find((p) => mesmoDoc(p.documento, form.documento))?.id ?? ""}
            options={pendentes.map((p) => ({ label: `${p.documento} · ${p.natureza}`, value: p.id }))}
            onChange={(v) => {
              const p = pendentes.find((x) => x.id === v);
              if (p) { set("documento", p.documento); set("natureza", p.natureza); } else set("documento", "");
            }}
          />
        )}

        <Input
          id="prot-documento"
          label="Documento exigido"
          placeholder="Ex.: CND Federal, ASO admissional"
          value={form.documento}
          onChange={(e) => set("documento", e.target.value)}
          errors={erros.documento ? [erros.documento] : []}
        />

        {existente && (
          <Aviso tom="info" titulo="Já existe um item pendente para este documento: o protocolo vai preencher esse item">
            {existente.documento} do {existente.contratoId} está {CONFORMIDADE[existente.conformidade].label.toLowerCase()}
            {existente.observacoes ? ` (${existente.observacoes.replace(/\.$/, "")})` : ""}. Nenhum item novo será criado.
          </Aviso>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            type="date"
            id="prot-validade"
            label="Validade"
            value={form.validade}
            onChange={(e) => set("validade", e.target.value)}
            errors={erros.validade ? [erros.validade] : []}
          />
          <Input
            type="select"
            id="prot-conformidade"
            label="Conformidade"
            value={form.conformidade}
            options={(Object.keys(CONFORMIDADE) as Conformidade[]).map((k) => ({ value: k, label: CONFORMIDADE[k].label }))}
            onChange={(v) => set("conformidade", (v ?? "conforme") as Conformidade)}
          />
        </div>

        <div>
          <Label>Arquivo</Label>
          <div className="mt-1">
            <FileUploader
              variant="simplified"
              upload={{ ref: "prot-arquivo", accept: ".pdf,.jpg,.jpeg,.png", maxEntries: 1, maxFileSize: 10_000_000, entries }}
              onChange={(files) => files[0] && set("arquivo", { nome: files[0].name, tamanho: files[0].size })}
              onCancel={() => set("arquivo", undefined)}
            />
          </div>
          {erros.arquivo && <p className="mt-1 text-sm text-red"><Icon name="fa-circle-exclamation" className="mr-1" />{erros.arquivo}</p>}
        </div>

        <Input type="textarea" id="prot-obs" label="Observações" rows={3} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />

        <div className={RODAPE_DRAWER}>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button leftIcon="fa-check" onClick={salvar}>{existente ? "Preencher item pendente" : "Protocolar"}</Button>
        </div>
      </div>
    </DrawerModal>
  );
}
