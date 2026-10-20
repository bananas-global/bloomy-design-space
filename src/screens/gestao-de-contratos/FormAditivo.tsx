/**
 * Formulário de Termo Aditivo — o mesmo na Ficha do Contrato e na aba
 * Aditivos de Vigência & Aditivos. Só para contratos Vigentes.
 *
 * `modal`, `form_grid`, `input`, `file_uploader` e `button` do sistema.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { FormGrid } from "../../components/BackofficeComponents.js";
import { FileUploader } from "../../components/FileUploader.js";
import { Input } from "../../components/Input.js";
import { DrawerModal } from "../../components/Overlay.js";
import { TODAY, br, type Aditivo, type Contrato, type ContratosData } from "./model.js";
import { Aviso, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./ui.js";

type Form = { contratoId: string; tipo: string; data: string; novaVigencia: string; novoValor: string; motivo: string; impacto: string; arquivo?: { nome: string; tamanho: number } };
type Erros = Partial<Record<keyof Form, string>>;

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
  onSave: (aditivo: Aditivo) => void;
}) {
  const vigentes = data.contratos.filter((c) => c.status === "vigente");
  const tipos = data.tabelas.tipo_aditivo.filter((o) => o.ativo).map((o) => o.descricao);
  const [f, setF] = useState<Form>({ contratoId: contrato?.id ?? "", tipo: "", data: TODAY, novaVigencia: "", novoValor: "", motivo: "", impacto: "" });
  const [erros, setErros] = useState<Erros>({});
  const up = (patch: Partial<Form>) => { setF((s) => ({ ...s, ...patch })); setErros({}); };
  const alvo = data.contratos.find((c) => c.id === f.contratoId);
  const naoVigente = contrato && contrato.status !== "vigente";

  const salvar = () => {
    const e: Erros = {};
    if (!f.contratoId) e.contratoId = "Escolha o contrato.";
    if (!f.tipo) e.tipo = "Escolha o tipo de aditivo.";
    if (!f.data) e.data = "Informe a data do aditivo.";
    if (f.novaVigencia && alvo && f.novaVigencia <= alvo.fim) e.novaVigencia = `A nova vigência precisa ser depois do término atual (${br(alvo.fim)}).`;
    if (f.novoValor && Number(f.novoValor.replace(",", ".")) < 0) e.novoValor = "O valor não pode ser negativo.";
    if (!f.motivo.trim()) e.motivo = "Explique o motivo do aditivo.";
    if (!f.impacto.trim()) e.impacto = "Descreva o impacto no contrato.";
    if (Object.keys(e).length) return setErros(e);
    const seq = data.aditivos.filter((a) => a.contratoId === f.contratoId).length + 1;
    onSave({
      id: `a_${Date.now()}`,
      contratoId: f.contratoId,
      codigo: `AD-${f.contratoId.slice(-3)}-${String(seq).padStart(2, "0")}`,
      tipo: f.tipo,
      data: f.data,
      ...(f.novaVigencia && { novaVigencia: f.novaVigencia }),
      ...(f.novoValor && { novoValor: Number(f.novoValor.replace(",", ".")) }),
      motivo: f.motivo,
      impacto: f.impacto,
      aprovacao: "elaboracao",
      assinatura: "bloqueada",
      ...(f.arquivo && { arquivo: f.arquivo }),
    });
  };

  return (
    <DrawerModal id="modal-aditivo" show={show} title="Novo Termo Aditivo" onCancel={onCancel} variant="medium" contentClass={CONTEUDO_DRAWER}>
      {naoVigente ? (
        <Aviso tom="neutro" titulo="Aditivo só para contrato Vigente">
          Este contrato está {contrato.status === "encerrado" ? "encerrado" : "fora da vigência"}. Ajustes antes da assinatura são feitos por revisão formal na própria ficha.
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
          <FormGrid variant="small" className="mt-0!">
            <Input type="select" id="aditivo-tipo" label="Tipo" prompt="Selecione o tipo" value={f.tipo} options={tipos.map((t) => ({ label: t, value: t }))} onChange={(v) => up({ tipo: v ?? "" })} errors={erros.tipo ? [erros.tipo] : []} />
            <Input type="date" id="aditivo-data" label="Data do aditivo" value={f.data} onChange={(e) => up({ data: e.target.value })} errors={erros.data ? [erros.data] : []} />
            <Input type="date" id="aditivo-vigencia" label={alvo ? `Nova vigência (término atual ${br(alvo.fim)})` : "Nova vigência (opcional)"} value={f.novaVigencia} onChange={(e) => up({ novaVigencia: e.target.value })} errors={erros.novaVigencia ? [erros.novaVigencia] : []} />
            <Input type="text" id="aditivo-valor" label="Novo valor mensal (opcional)" placeholder="0,00" hint="R$/mês" value={f.novoValor} onChange={(e) => up({ novoValor: e.target.value })} errors={erros.novoValor ? [erros.novoValor] : []} />
          </FormGrid>
          <Input type="textarea" id="aditivo-motivo" label="Motivo" value={f.motivo} onChange={(e) => up({ motivo: e.target.value })} errors={erros.motivo ? [erros.motivo] : []} />
          <Input type="textarea" id="aditivo-impacto" label="Impacto no contrato" placeholder="O que muda: vigência, valor, unidades, cláusulas…" value={f.impacto} onChange={(e) => up({ impacto: e.target.value })} errors={erros.impacto ? [erros.impacto] : []} />
          <div>
            <p className="mb-2 text-sm/4 font-bold text-brand-blue">Anexo (opcional)</p>
            <FileUploader
              variant="simplified"
              upload={{ ref: "aditivo-anexo", name: "anexo", accept: ".pdf,.doc,.docx", maxEntries: 1, maxFileSize: 10_000_000 }}
              onChange={(files) => up({ arquivo: files[0] && { nome: files[0].name, tamanho: files[0].size } })}
            />
          </div>
          <Aviso tom="info">O aditivo nasce Em Elaboração e passa pela mesma trava: só vai para assinatura depois de aprovado.</Aviso>
          <div className={RODAPE_DRAWER}>
            <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
            <Button leftIcon="fa-file-plus" onClick={salvar}>Salvar aditivo</Button>
          </div>
        </div>
      )}
    </DrawerModal>
  );
}
