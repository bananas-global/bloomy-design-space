/**
 * Formulário de Termo Aditivo (FR-057, RN-039) — o mesmo na Ficha do Contrato
 * e na aba Aditivos de Vigência & Aditivos. Só para contratos Vigentes.
 *
 * Regra atual (decisão pendente na especificação): o aditivo nasce "Aprovado"
 * e "Assinado Digitalmente", atualiza a vigência e o valor do contrato, sobe a
 * versão (minor) e não muda a fase. `aditarContrato` aplica esses efeitos no
 * contrato, para as duas telas fazerem igual.
 *
 * `modal`, `form_grid`, `input`, `file_uploader` e `button` do sistema.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { FormGrid } from "../../components/BackofficeComponents.js";
import { FileUploader } from "../../components/FileUploader.js";
import { Input } from "../../components/Input.js";
import { DrawerModal } from "../../components/Overlay.js";
import {
  ANEXO_MAX, ANEXO_TIPOS, PAPEL_WORKFLOW, TODAY, br, brl, proximaVersao, proximoAditivo, rotuloAditivo, validarAnexo,
  type Aditivo, type Arquivo, type Contrato, type ContratosData,
} from "./model.js";
import { Aviso, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./ui.js";

type Form = { contratoId: string; tipo: string; data: string; novaVigencia: string; novoValor: string; motivo: string; impacto: string; arquivo?: Arquivo };
type Erros = Partial<Record<keyof Form, string>>;

/** "1.234,56" ou "1234.56" → 1234.56; vazio → undefined. */
function numero(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Efeitos do aditivo no contrato (RN-039): nova vigência (a informada ou o fim
 * atual), valor só quando o novo valor é maior que zero, versão minor com a
 * cópia das cláusulas (RN-010/011), histórico "Aditamento: Vigente → Vigente
 * Repactuado" e auditoria. A fase do contrato não muda.
 */
export function aditarContrato(c: Contrato, a: Aditivo, usuario: string, perfil = "Jurídico"): Contrato {
  const versao = proximaVersao(c.versao, a.origem === "adequacao" ? "major" : "minor");
  const quando = `${a.data}T${new Date().toTimeString().slice(0, 5)}`;
  return {
    ...c,
    fim: a.novaVigencia ?? c.fim,
    ...(a.novoValor != null && a.novoValor > 0 && { valor: a.novoValor }),
    versao,
    versoes: [...c.versoes, { versao, data: a.data, fase: "Aditivos & Reajuste", motivo: `${rotuloAditivo(a)} · ${a.tipo}`, resumo: a.impacto, revisor: usuario, ...(c.clausulas && { clausulas: c.clausulas }) }],
    workflow: [...c.workflow, { id: `${c.id}-wf-${Date.now()}`, data: quando, workflow: "ciclo", de: "Vigente", para: "Vigente Repactuado", parecer: `Aditamento ${a.codigo}: ${a.impacto}`, usuario, papel: PAPEL_WORKFLOW.aditivo }],
    auditoria: [...c.auditoria, { id: `${c.id}-aud-${Date.now()}`, data: quando, usuario, perfil, acao: "ADITIVO_REGISTRAR", detalhes: `${a.codigo} (${a.tipo}): ${a.impacto}. Vigência ${br(a.novaVigencia ?? c.fim)}.` }],
  };
}

/**
 * `contrato` fixa o contrato (vindo da ficha); sem ele, o formulário pede o
 * contrato entre os Vigentes (vindo da aba Aditivos).
 */
export function ModalAditivo({
  show,
  data,
  contrato,
  onCancel,
  onSave,
}: {
  show: boolean;
  data: ContratosData;
  contrato?: Contrato;
  onCancel: () => void;
  /** Recebe o aditivo já Aprovado/Assinado; use `aditarContrato` para os efeitos no contrato. */
  onSave: (aditivo: Aditivo) => void;
}) {
  const vigentes = data.contratos.filter((c) => c.status === "vigente");
  const tipos = data.tabelas.tipo_aditivo.filter((o) => o.ativo).map((o) => o.descricao);
  const [f, setF] = useState<Form>({ contratoId: contrato?.id ?? "", tipo: "", data: TODAY, novaVigencia: "", novoValor: "", motivo: "", impacto: "" });
  const [erros, setErros] = useState<Erros>({});
  const up = (patch: Partial<Form>) => { setF((s) => ({ ...s, ...patch })); setErros({}); };
  const alvo = contrato ?? data.contratos.find((c) => c.id === f.contratoId);
  const naoVigente = contrato && contrato.status !== "vigente";
  const prox = alvo ? proximoAditivo(data.aditivos, alvo.id) : undefined;

  const salvar = () => {
    const e: Erros = {};
    const valor = numero(f.novoValor);
    if (!f.contratoId) e.contratoId = "Escolha o contrato.";
    else if (alvo && alvo.status !== "vigente") e.contratoId = "Só contratos Vigentes recebem aditivo.";
    if (!f.tipo) e.tipo = "Escolha o tipo de aditivo.";
    if (!f.data) e.data = "Informe a data de celebração.";
    if (f.novaVigencia && alvo && f.novaVigencia < alvo.inicio) e.novaVigencia = `A nova vigência não pode ser anterior ao início (${br(alvo.inicio)}).`;
    if (valor !== undefined && (Number.isNaN(valor) || valor < 0)) e.novoValor = Number.isNaN(valor) ? "Informe um valor válido." : "O valor não pode ser negativo.";
    if (!f.motivo.trim()) e.motivo = "A justificativa é obrigatória.";
    if (f.arquivo) { const x = validarAnexo(f.arquivo); if (x) e.arquivo = x; }
    if (Object.keys(e).length || !alvo || !prox) return setErros(e);
    const muda = valor != null && valor > 0;
    onSave({
      id: `a_${Date.now()}`,
      contratoId: alvo.id,
      numero: prox.numero,
      codigo: prox.codigo,
      origem: "manual",
      tipo: f.tipo,
      data: f.data,
      novaVigencia: f.novaVigencia || alvo.fim,
      ...(muda && { novoValor: valor, ...(alvo.valor != null && { valorAnterior: alvo.valor }) }),
      motivo: f.motivo.trim(),
      impacto: f.impacto.trim() || (muda ? `Novo valor base ${brl(valor!)}` : "Ajuste de escopo / prazo"),
      aprovacao: "aprovado",
      assinatura: "assinado",
      ...(f.arquivo && { arquivo: f.arquivo }),
    });
  };

  return (
    <DrawerModal id="modal-aditivo" show={show} title={prox ? `Novo Termo Aditivo · ${prox.codigo}` : "Novo Termo Aditivo"} onCancel={onCancel} variant="medium" contentClass={CONTEUDO_DRAWER}>
      {naoVigente ? (
        <Aviso tom="neutro" titulo="Aditivo só para contrato Vigente">
          Este contrato está {contrato.status === "encerrado" ? "encerrado" : "em elaboração ou assinatura"}: contratos encerrados ou em elaboração não recebem aditivo.
        </Aviso>
      ) : (
        <div className="space-y-6">
          {contrato ? (
            <p className="text-brand-purple-dark/80">
              Contrato <strong>{contrato.id}</strong> · {contrato.objeto}
            </p>
          ) : (
            <Input
              type="select"
              id="aditivo-contrato"
              label="Contrato (só Vigentes)"
              prompt="Selecione o contrato"
              value={f.contratoId}
              options={vigentes.map((c) => ({ label: `${c.id} · ${data.partes.find((p) => p.id === c.parteId)?.nome ?? ""}`, value: c.id }))}
              onChange={(v) => up({ contratoId: v ?? "" })}
              errors={erros.contratoId ? [erros.contratoId] : []}
            />
          )}
          {prox && (
            <p className="text-sm text-brand-purple-dark/70">
              Será registrado como <strong>{rotuloAditivo({ numero: prox.numero, origem: "manual" })}</strong> ({prox.codigo}).
            </p>
          )}
          <FormGrid variant="small" className="mt-0!">
            <Input type="select" id="aditivo-tipo" label="Tipo" prompt="Selecione o tipo" value={f.tipo} options={tipos.map((t) => ({ label: t, value: t }))} onChange={(v) => up({ tipo: v ?? "" })} errors={erros.tipo ? [erros.tipo] : []} />
            <Input type="date" id="aditivo-data" label="Data de celebração" value={f.data} onChange={(e) => up({ data: e.target.value })} errors={erros.data ? [erros.data] : []} />
            <Input type="date" id="aditivo-vigencia" label={alvo ? `Nova vigência (vazio mantém ${br(alvo.fim)})` : "Nova vigência (opcional)"} value={f.novaVigencia} onChange={(e) => up({ novaVigencia: e.target.value })} errors={erros.novaVigencia ? [erros.novaVigencia] : []} />
            <Input type="text" id="aditivo-valor" label="Novo valor base (opcional)" placeholder="0,00" hint="R$/mês · só muda o valor se for maior que zero" value={f.novoValor} onChange={(e) => up({ novoValor: e.target.value })} errors={erros.novoValor ? [erros.novoValor] : []} />
          </FormGrid>
          <Input type="textarea" id="aditivo-motivo" label="Justificativa" value={f.motivo} onChange={(e) => up({ motivo: e.target.value })} errors={erros.motivo ? [erros.motivo] : []} />
          <Input
            type="textarea"
            id="aditivo-impacto"
            label="Impacto (opcional)"
            placeholder={numero(f.novoValor) ? `Vazio: "Novo valor base ${brl(numero(f.novoValor) || 0)}"` : 'Vazio: "Ajuste de escopo / prazo"'}
            value={f.impacto}
            onChange={(e) => up({ impacto: e.target.value })}
          />
          <div>
            <p className="mb-2 text-sm/4 font-bold text-brand-blue">Anexo (opcional)</p>
            <FileUploader
              variant="simplified"
              upload={{ ref: "aditivo-anexo", name: "anexo", accept: ANEXO_TIPOS.map((t) => `.${t}`).join(","), maxEntries: 1, maxFileSize: ANEXO_MAX }}
              onChange={(files) => up({ arquivo: files[0] && { nome: files[0].name, tamanho: files[0].size } })}
            />
            {erros.arquivo && <p className="mt-2 text-sm font-semibold text-red">{erros.arquivo}</p>}
          </div>
          <Aviso tom="info">O aditivo nasce Aprovado e Assinado, atualiza a vigência e o valor do contrato e sobe a versão. A fase do contrato não muda.</Aviso>
          <div className={RODAPE_DRAWER}>
            <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
            <Button leftIcon="fa-file-plus" onClick={salvar}>Salvar aditivo</Button>
          </div>
        </div>
      )}
    </DrawerModal>
  );
}
