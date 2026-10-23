/**
 * Alçadas — os limites de Compras e do Financeiro por pedido, por mês e por ano
 * (RF-11), num `drawer_modal` aberto pelo botão Alçadas da lista. O CFO não tem
 * limite. Mudar um limite vale para os pedidos novos e fica no histórico; os
 * pedidos já aprovados não mudam.
 *
 * Só componentes do sistema: `drawer_modal`, `input`, `progress`, `button`,
 * `modal` e `timeline_list`. Como no drawer de nova solicitação, os cantos
 * retos e o rodapé fixo são ajustes desta tela.
 */
import { useState } from "react";
import { showToast } from "../../components/Action.js";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Progress } from "../../components/Layout.js";
import { Modal } from "../../components/Overlay.js";
import { NIVEIS, PAPEIS, TODAY, USUARIO, brl, type Alcadas, type Limite, type Papel } from "./model.js";
import { Aviso, FormDrawer, Historico } from "./shared.js";

const val = (e: unknown) => (e && typeof e === "object" && "target" in e ? (e as { target: { value: string } }).target.value : String(e ?? ""));
const num = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;
const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Nivel = "compras" | "financeiro";
type Campos = Record<Nivel, Record<keyof Limite, string>>;
type Erros = Partial<Record<`${Nivel}.${keyof Limite}`, string>>;

const CAMPOS: { id: keyof Limite; label: string }[] = [
  { id: "pedido", label: "Por pedido" },
  { id: "mes", label: "Por mês" },
  { id: "ano", label: "Por ano" },
];

function validar(c: Campos): Erros {
  const e: Erros = {};
  for (const n of ["compras", "financeiro"] as const) {
    for (const { id } of CAMPOS) if (num(c[n][id]) <= 0) e[`${n}.${id}`] = "Maior que zero";
    if (num(c[n].mes) < num(c[n].pedido)) e[`${n}.mes`] = "Abaixo do por pedido";
    if (num(c[n].ano) < num(c[n].mes)) e[`${n}.ano`] = "Abaixo do mensal";
  }
  for (const { id } of CAMPOS) {
    if (!e[`financeiro.${id}`] && num(c.financeiro[id]) <= num(c.compras[id])) e[`financeiro.${id}`] = "Abaixo do de Compras";
  }
  return e;
}

const paraCampos = (a: Alcadas): Campos => ({
  compras: { pedido: fmt(a.compras.pedido), mes: fmt(a.compras.mes), ano: fmt(a.compras.ano) },
  financeiro: { pedido: fmt(a.financeiro.pedido), mes: fmt(a.financeiro.mes), ano: fmt(a.financeiro.ano) },
});

export function AlcadasDrawer({
  show,
  papel,
  alcadas: a,
  estado,
  onCancel,
}: {
  show: boolean;
  papel: Papel;
  alcadas: Alcadas;
  /** `erro` abre com um limite inválido; `confirmar`, com o modal de motivo. */
  estado?: string;
  onCancel: () => void;
}) {
  const editavel = PAPEIS[papel].permissions.includes("purchases.configure_limits");
  const inicial = paraCampos(a);
  const comErro: Campos = { ...inicial, financeiro: { ...inicial.financeiro, pedido: "1.500,00" } };

  const [campos, setCampos] = useState<Campos>(estado === "erro" ? comErro : inicial);
  const [erros, setErros] = useState<Erros>(() => (estado === "erro" ? validar(comErro) : {}));
  const [confirmar, setConfirmar] = useState(estado === "confirmar");
  const [motivo, setMotivo] = useState("");
  const [motivoErro, setMotivoErro] = useState(false);
  const [historico, setHistorico] = useState(a.historico);

  const mudou = JSON.stringify(campos) !== JSON.stringify(inicial) || estado === "confirmar";
  const set = (n: Nivel, id: keyof Limite) => (e: unknown) => {
    setCampos((c) => ({ ...c, [n]: { ...c[n], [id]: val(e) } }));
    setErros((x) => ({ ...x, [`${n}.${id}`]: undefined }));
  };

  const fechar = () => {
    setCampos(inicial);
    setErros({});
    onCancel();
  };

  const salvar = () => {
    const e = validar(campos);
    setErros(e);
    if (Object.keys(e).length === 0) setConfirmar(true);
  };

  const nivel = (n: Nivel) => {
    const c = a.consumo[n];
    const l = { pedido: num(campos[n].pedido), mes: num(campos[n].mes), ano: num(campos[n].ano) };
    return (
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-brand-purple-dark">{NIVEIS[n].label}</h2>
          <p className="text-sm text-brand-purple-dark/60">
            {NIVEIS[n].quem.nome} · {n === "compras" ? "1º nível: dentro destes limites, o pedido sai aprovado" : "2º nível: aprova o que passa do limite de Compras"}
          </p>
        </div>
        <div className="grid gap-x-4 gap-y-8 md:grid-cols-3">
          {CAMPOS.map(({ id, label }) => (
            <Input
              key={id}
              id={`${n}-${id}`}
              label={label}
              hint="R$"
              inputMode="decimal"
              value={campos[n][id]}
              disabled={!editavel}
              errors={erros[`${n}.${id}`] ? [erros[`${n}.${id}`]!] : []}
              onChange={set(n, id)}
            />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 pt-6">
          {([["Consumo no mês", c.mes, l.mes], ["Consumo no ano", c.ano, l.ano]] as const).map(([label, usado, limite]) => {
            const pct = limite ? Math.min(100, Math.round((usado / limite) * 100)) : 0;
            return (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold text-brand-purple-dark">{label}</span>
                  <span className="text-brand-purple-dark/70">{brl(usado)} de {brl(limite)}</span>
                </div>
                <Progress value={pct} variant={pct >= 90 ? "error" : "default"} />
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <>
      <FormDrawer
        id="alcadas"
        show={show}
        title="Alçadas de compra"
        size="max-w-3xl"
        cancelLabel={editavel ? "Cancelar" : "Fechar"}
        onCancel={fechar}
        actions={
          editavel && (
            <Button leftIcon="fa-floppy-disk" disabled={!mudou} onClick={salvar}>
              Salvar limites
            </Button>
          )
        }
      >
          <p className="text-sm text-brand-purple-dark/70">Quanto cada nível aprova sozinho. Acima do limite, o pedido sobe para o nível seguinte.</p>

          {!editavel && (
            <Aviso tone="blue" icon="fa-lock" title="Somente leitura">
              Os limites são definidos pelo Financeiro e pelo CFO.
            </Aviso>
          )}
          {Object.keys(erros).length > 0 && (
            <Aviso tone="red" icon="fa-circle-exclamation" title="Os limites não foram salvos">
              Corrija os campos marcados.
            </Aviso>
          )}

          {nivel("compras")}
          <hr className="border-neutral-100" />
          {nivel("financeiro")}
          <hr className="border-neutral-100" />

          <section className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 shrink-0 rounded-xl bg-brand-blue/20 text-brand-blue-dark">
              <Icon name="fa-infinity" type="solid" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-purple-dark">CFO · sem limite</h2>
              <p className="text-sm text-brand-purple-dark/60">{NIVEIS.cfo.quem.nome} · 3º nível: aprova o que passa do limite do Financeiro. Todo pedido tem quem possa aprová-lo.</p>
            </div>
          </section>
          <hr className="border-neutral-100" />

          <section>
            <h2 className="text-lg font-bold text-brand-purple-dark mb-6">Alterações de limite</h2>
            <Historico eventos={historico} />
          </section>
      </FormDrawer>

      <Modal id="confirmar-alcadas" show={confirmar} title="Salvar novos limites" variant="extra_small" onCancel={() => setConfirmar(false)}>
        <p className="text-sm text-brand-purple-dark/70 mb-6">
          Os novos limites valem para os pedidos emitidos a partir de agora. Pedidos já aprovados não mudam.
        </p>
        <Input
          id="motivo-alcada"
          type="textarea"
          label="Motivo da alteração"
          placeholder="Fica no histórico de alterações"
          rows={3}
          value={motivo}
          errors={motivoErro ? ["O motivo é obrigatório"] : []}
          onChange={(e) => { setMotivo(val(e)); setMotivoErro(false); }}
        />
        <div className="flex flex-col-reverse md:flex-row md:justify-end gap-3 mt-8">
          <Button variant="ghost" onClick={() => setConfirmar(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              if (!motivo.trim()) return setMotivoErro(true);
              setConfirmar(false);
              setHistorico((h) => [{ quando: `${TODAY}T11:00`, quem: USUARIO[papel], acao: "Alterou os limites de alçada", motivo: motivo.trim(), icon: "fa-pen" }, ...h]);
              showToast({ title: "Limites salvos", content: "Valem para os próximos pedidos.", type: "success", closeTime: 6000 });
            }}
          >
            Salvar limites
          </Button>
        </div>
      </Modal>
    </>
  );
}
