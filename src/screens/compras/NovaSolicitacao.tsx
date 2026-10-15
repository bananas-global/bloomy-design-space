/**
 * Nova solicitação — o pedido de material feito na unidade, num `drawer_modal`
 * aberto a partir da lista de Compras. No celular o drawer ocupa a tela toda:
 * três campos e o envio, em menos de 30 segundos. A unidade não aparece: vem
 * do vínculo de quem pede.
 *
 * Só componentes do sistema: `drawer_modal`, `input` (texto, `counter`, `date`),
 * `file_uploader` e `button`.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { FileUploader } from "../../components/FileUploader.js";
import { Input } from "../../components/Input.js";
import { TODAY, UNIDADES_MEDIDA, USUARIO, aprovadorPara, type Papel, type Solicitacao } from "./model.js";
import { Aviso, FormDrawer } from "./shared.js";

type Form = { item: string; quantidade: string; medida: string; data: string };
type Errors = Partial<Record<keyof Form, string[]>>;

const val = (e: unknown) => (e && typeof e === "object" && "target" in e ? (e as { target: { value: string } }).target.value : String(e ?? ""));

const VAZIO: Form = { item: "", quantidade: "1", medida: "unidade", data: "" };
const COM_ERRO: Form = { item: "", quantidade: "0", medida: "unidade", data: "2026-10-10" };
const MEDIDAS = UNIDADES_MEDIDA.map((u) => ({ label: u, value: u }));

function validate(f: Form): Errors {
  const e: Errors = {};
  if (!f.item.trim()) e.item = ["Diga o que você precisa"];
  if (!Number(f.quantidade)) e.quantidade = ["Mínimo 1"];
  if (!f.data) e.data = ["Informe a data"];
  else if (f.data < TODAY) e.data = ["Data já passou"];
  return e;
}

export function NovaSolicitacao({
  show,
  papel,
  numero,
  comErro = false,
  onCancel,
  onEnviar,
}: {
  show: boolean;
  papel: Papel;
  /** O número que a solicitação recebe ao ser enviada. */
  numero: string;
  /** Abre com os erros de validação (cenário). */
  comErro?: boolean;
  onCancel: () => void;
  onEnviar: (s: Solicitacao) => void;
}) {
  const user = USUARIO[papel];
  const unidade = user.unidades[0]!;
  // P-01: quem aprova é a coordenação da unidade; se foi ela quem pediu, a supervisão.
  const aprovador = aprovadorPara(unidade, user);

  const [f, setF] = useState<Form>(comErro ? COM_ERRO : VAZIO);
  const [errors, setErrors] = useState<Errors>(() => (comErro ? validate(COM_ERRO) : {}));

  const set = (k: keyof Form) => (e: unknown) => {
    setF((s) => ({ ...s, [k]: val(e) }));
    setErrors((s) => ({ ...s, [k]: undefined }));
  };

  const fechar = () => {
    setF(VAZIO);
    setErrors({});
    onCancel();
  };

  const enviar = () => {
    const e = validate(f);
    setErrors(e);
    if (Object.keys(e).length) return;
    const quando = `${TODAY}T11:00`;
    const pessoa = { nome: user.nome, cargo: user.cargo };
    onEnviar({
      id: numero,
      item: f.item.trim(),
      quantidade: Number(f.quantidade),
      unidadeMedida: f.medida,
      dataDesejada: f.data,
      unidade,
      requisitante: pessoa,
      aprovador,
      criadaEm: quando,
      etapa: "aprovacao_unidade",
      desde: quando,
      historico: [{ quando, quem: pessoa, acao: "Criou a solicitação", icon: "fa-plus", color: "blue" }],
    });
    setF(VAZIO);
  };

  return (
    <FormDrawer
      id="nova-solicitacao"
      show={show}
      title="Nova solicitação"
      onCancel={fechar}
      actions={
        <Button onClick={enviar} rightIcon="fa-paper-plane">
          Enviar para aprovação
        </Button>
      }
    >
        {Object.values(errors).some(Boolean) && (
          <Aviso tone="red" icon="fa-circle-exclamation" title="Faltam informações">
            Corrija os campos marcados para enviar.
          </Aviso>
        )}

        <Input id="item" label="O que você precisa?" placeholder="Ex.: massinha de modelar atóxica" value={f.item} errors={errors.item} onChange={set("item")} autoFocus />
        <div className="grid grid-cols-2 gap-4">
          <Input id="quantidade" type="counter" label="Quantidade" value={f.quantidade} errors={errors.quantidade} onChange={set("quantidade")} />
          <Input id="medida" type="select" label="Unidade de medida" options={MEDIDAS} value={f.medida} clear={false} onChange={(v) => setF((x) => ({ ...x, medida: v ?? "unidade" }))} />
        </div>
        <Input id="data" type="date" label="Preciso até" value={f.data} min={TODAY} errors={errors.data} onChange={set("data")} />
        <div>
          <p className="block text-sm/4 font-bold text-brand-purple-dark mb-2">
            Orçamento <span className="font-normal text-brand-purple-dark/50">(opcional)</span>
          </p>
          <FileUploader variant="simplified" upload={{ ref: "orcamento", accept: ".pdf,.jpg,.jpeg,.png", maxEntries: 1, maxFileSize: 10_000_000 }} />
        </div>

    </FormDrawer>
  );
}
