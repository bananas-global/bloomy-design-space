/**
 * Gestão de Contratos — Cadastro de Partes.
 *
 * A lista de clientes (receita) e fornecedores & pessoal (despesa), com visões,
 * filtros PJ/PF, busca e exportação, e o cadastro lateral (`drawer_modal`) com
 * campos por subtipo. CNPJ/CPF já cadastrado não cria uma segunda parte: o
 * formulário avisa e salvar atualiza o cadastro existente, só com os campos
 * preenchidos (a mesma clínica em dois cadastros divide contratos e cobranças).
 *
 * O cadastro (`DrawerParte`) também abre do Novo Contrato, em "Cadastrar Nova
 * Parte", para não sair do formulário do contrato.
 *
 * Feito na tela (componente novo): as pílulas de visão/filtro e as seções do
 * cadastro. O resto é `drawer_modal`, `table`, `input`, `radio_selector`,
 * `tag`, `button` e `empty_state_card`.
 */
import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { FormGrid } from "../components/BackofficeComponents.js";
import { Button } from "../components/Button.js";
import { RadioGroup } from "../components/Choice.js";
import { Input } from "../components/Input.js";
import { EmptyStateCard } from "../components/Layout.js";
import { DrawerModal } from "../components/Overlay.js";
import { Table } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import { FLUXO, SUBTIPO, type ContratosData, type Papel, type Parte, type ParteSubtipo, type ParteTipo } from "./gestao-de-contratos/model.js";
import { Aviso, Bloco, ContratosShell, AbasBotao, Etiquetas, Selo, exportarPlanilha, papelDe, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";

/* ------------------------------------------------------------------ */
/* Regras do cadastro                                                  */
/* ------------------------------------------------------------------ */

/** Comercial cadastra clientes; Compras/RH-DP cadastra fornecedores; o Administrador, os dois. */
export const podeCadastrar = (papel: Papel, tipo: ParteTipo) =>
  papel === "administrador" || (tipo === "cliente" && papel === "comercial") || (tipo === "fornecedor" && papel === "compras");

const SUBTIPOS: Record<ParteTipo, ParteSubtipo[]> = {
  cliente: ["operadora", "particular_pj", "pf", "liminar"],
  fornecedor: ["fornecedor_pj", "fornecedor_pf", "clt"],
};
const PESSOA: Record<ParteSubtipo, "PJ" | "PF"> = {
  operadora: "PJ", particular_pj: "PJ", pf: "PF", liminar: "PF", fornecedor_pj: "PJ", fornecedor_pf: "PF", clt: "PF",
};

type Campo = { k: string; tipo?: "text" | "number" | "date" | "select"; opcoes?: string[]; obrigatorio?: boolean; placeholder?: string; hint?: string };

/** Campos de cada subtipo. A chave é o rótulo, o mesmo dos `extras` da parte. */
const CAMPOS: Record<ParteSubtipo, { titulo: string; campos: Campo[] }> = {
  operadora: {
    titulo: "Operadora ANS",
    campos: [
      { k: "Registro ANS", obrigatorio: true, placeholder: "000000" },
      { k: "Dia de corte", tipo: "number", obrigatorio: true, placeholder: "1 a 31" },
      { k: "Prazo de retorno", tipo: "select", opcoes: ["15 dias", "30 dias", "45 dias", "60 dias"], obrigatorio: true },
    ],
  },
  particular_pj: { titulo: "Particular PJ", campos: [{ k: "Paciente/beneficiário", obrigatorio: true, placeholder: "Quem recebe o atendimento" }] },
  pf: {
    titulo: "Pessoa Física",
    campos: [
      { k: "RG", obrigatorio: true },
      { k: "Responsável legal", obrigatorio: true },
      { k: "Parentesco", tipo: "select", opcoes: ["Mãe", "Pai", "Tutor(a)", "Avó/Avô", "Próprio paciente", "Outro"], obrigatorio: true },
      { k: "Paciente/beneficiário" },
    ],
  },
  liminar: {
    titulo: "Liminar Judicial",
    campos: [
      { k: "Processo", obrigatorio: true, placeholder: "0000000-00.0000.0.00.0000" },
      { k: "Vara", obrigatorio: true, placeholder: "Ex.: 3ª Vara Cível de Curitiba" },
    ],
  },
  fornecedor_pj: {
    titulo: "Fornecedor PJ",
    campos: [
      { k: "Regime tributário", tipo: "select", opcoes: ["MEI", "Simples Nacional", "Lucro Presumido", "Lucro Real"], obrigatorio: true },
      { k: "CNAE", placeholder: "0000-0/00" },
      { k: "Responsável técnico" },
      { k: "Conselho", placeholder: "Conselho e registro" },
    ],
  },
  fornecedor_pf: {
    titulo: "Fornecedor PF",
    campos: [
      { k: "Cargo", obrigatorio: true, placeholder: "Função contratada" },
      { k: "CBO", placeholder: "0000-00" },
      { k: "Conselho", placeholder: "Conselho e registro" },
    ],
  },
  clt: {
    titulo: "CLT",
    campos: [
      { k: "Cargo", obrigatorio: true },
      { k: "CBO", obrigatorio: true, placeholder: "0000-00" },
      { k: "Admissão", tipo: "date", obrigatorio: true },
      { k: "Carga horária", obrigatorio: true, placeholder: "Ex.: 40h semanais" },
      { k: "CTPS", placeholder: "Digital ou número/série" },
      { k: "Salário", obrigatorio: true, placeholder: "0,00", hint: "R$" },
    ],
  },
};
const BANCARIOS: Campo[] = [{ k: "Banco", placeholder: "Código e nome" }, { k: "Agência" }, { k: "Conta" }, { k: "Chave Pix" }];

/** Máscara de CNPJ (PJ) ou CPF (PF). */
export function mascaraDoc(v: string, pessoa: "PJ" | "PF") {
  const d = v.replace(/\D/g, "").slice(0, pessoa === "PJ" ? 14 : 11);
  if (pessoa === "PF") return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}
const docCompleto = (doc: string, pessoa: "PJ" | "PF") => doc.replace(/\D/g, "").length === (pessoa === "PJ" ? 14 : 11);

/** Próximo código do sequencial: CLI-0006, FOR-0009… */
export function proximoCodigoParte(partes: Parte[], tipo: ParteTipo) {
  const pre = tipo === "cliente" ? "CLI" : "FOR";
  const n = Math.max(0, ...partes.filter((p) => p.codigo.startsWith(pre)).map((p) => Number(p.codigo.slice(4)) || 0));
  return `${pre}-${String(n + 1).padStart(4, "0")}`;
}

const isoDeBr = (v: string) => (/^\d{2}\/\d{2}\/\d{4}$/.test(v) ? v.split("/").reverse().join("-") : v);
const brDeIso = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split("-").reverse().join("/") : v);

/* ------------------------------------------------------------------ */
/* Formulário                                                          */
/* ------------------------------------------------------------------ */

export type FormParte = {
  id?: string;
  tipo: ParteTipo;
  subtipo: ParteSubtipo;
  codigoManual: boolean;
  codigo: string;
  nome: string;
  documento: string;
  contatoNome: string;
  email: string;
  telefone: string;
  forma: string;
  condicao: string;
  ativo: boolean;
  homologado: boolean;
  extras: Record<string, string>;
};

export const formNovo = (tipo: ParteTipo, subtipo: ParteSubtipo = SUBTIPOS[tipo][0]!, extra: Partial<FormParte> = {}): FormParte => ({
  tipo, subtipo, codigoManual: false, codigo: "", nome: "", documento: "", contatoNome: "", email: "", telefone: "", forma: "", condicao: "",
  ativo: true, homologado: tipo === "fornecedor", extras: {}, ...extra,
});

const formDe = (p: Parte): FormParte => ({
  id: p.id, tipo: p.tipo, subtipo: p.subtipo, codigoManual: false, codigo: p.codigo, nome: p.nome, documento: p.documento,
  contatoNome: p.contato.nome, email: p.contato.email, telefone: p.contato.telefone, forma: p.formaPagamento, condicao: p.condicaoPagamento,
  ativo: p.ativo, homologado: p.homologado ?? false, extras: Object.fromEntries(Object.entries(p.extras).map(([k, v]) => [k, k === "Admissão" ? isoDeBr(v) : v])),
});

type Erros = Record<string, string>;

/**
 * Cadastro lateral de cliente ou fornecedor. `onSave` recebe a parte salva e
 * se ela atualizou um cadastro existente (CNPJ/CPF repetido).
 */
export function DrawerParte({
  show,
  partes,
  formas,
  condicoes,
  inicial,
  papel,
  permitido,
  trocarTipo = false,
  onCancel,
  onSave,
}: {
  show: boolean;
  /** Força a permissão (atalho do Novo Contrato); sem ele, vale o papel. */
  permitido?: boolean;
  /** Mostra a escolha cliente/fornecedor (atalho do Novo Contrato). */
  trocarTipo?: boolean;
  partes: Parte[];
  formas: string[];
  condicoes: string[];
  inicial: FormParte;
  papel: Papel;
  onCancel: () => void;
  onSave: (parte: Parte, atualizou: boolean) => void;
}) {
  const [f, setF] = useState<FormParte>(inicial);
  const [erros, setErros] = useState<Erros>({});
  const up = (patch: Partial<FormParte>) => { setF((s) => ({ ...s, ...patch })); setErros({}); };
  const upExtra = (k: string, v: string) => { setF((s) => ({ ...s, extras: { ...s.extras, [k]: v } })); setErros({}); };

  const pessoa = PESSOA[f.subtipo];
  const editando = Boolean(f.id);
  const existente = docCompleto(f.documento, pessoa) ? partes.find((p) => p.documento === f.documento && p.id !== f.id) : undefined;
  const pode = permitido ?? podeCadastrar(papel, f.tipo);
  const codigoAuto = editando ? f.codigo : proximoCodigoParte(partes, f.tipo);
  const cliente = f.tipo === "cliente";
  const docLabel = pessoa === "PJ" ? "CNPJ" : "CPF";

  const salvar = () => {
    const e: Erros = {};
    if (!existente && !f.nome.trim()) e.nome = pessoa === "PJ" ? "Informe a razão social." : "Informe o nome completo.";
    if (!f.documento) e.documento = `Informe o ${docLabel}.`;
    else if (!docCompleto(f.documento, pessoa)) e.documento = `${docLabel} incompleto: confira os ${pessoa === "PJ" ? 14 : 11} dígitos.`;
    if (!editando && f.codigoManual && !existente) {
      const pre = cliente ? "CLI" : "FOR";
      if (!new RegExp(`^${pre}-\\d{4}$`).test(f.codigo)) e.codigo = `Use o formato ${pre}-0000.`;
      else if (partes.some((p) => p.codigo === f.codigo)) e.codigo = `${f.codigo} já existe. Use outro código ou o automático.`;
    }
    for (const c of CAMPOS[f.subtipo].campos) if (c.obrigatorio && !existente && !(f.extras[c.k] ?? "").trim()) e[c.k] = `Informe ${c.k.toLowerCase()}.`;
    const corte = f.extras["Dia de corte"];
    if (f.subtipo === "operadora" && corte && (Number(corte) < 1 || Number(corte) > 31)) e["Dia de corte"] = "O dia de corte vai de 1 a 31.";
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "E-mail inválido.";
    if (!existente) {
      if (!f.forma) e.forma = `Escolha a forma de ${cliente ? "recebimento" : "pagamento"}.`;
      if (!f.condicao) e.condicao = "Escolha a condição.";
    }
    if (Object.keys(e).length) return setErros(e);

    const extras = Object.fromEntries(
      Object.entries(f.extras).filter(([, v]) => v.trim()).map(([k, v]) => [k, k === "Admissão" ? brDeIso(v) : v]),
    );
    if (existente) {
      // Atualiza só com o que foi preenchido; o resto do cadastro existente fica.
      const keep = (novo: string, antigo: string) => (novo.trim() ? novo : antigo);
      onSave(
        {
          ...existente,
          nome: keep(f.nome, existente.nome),
          contato: { nome: keep(f.contatoNome, existente.contato.nome), email: keep(f.email, existente.contato.email), telefone: keep(f.telefone, existente.contato.telefone) },
          formaPagamento: keep(f.forma, existente.formaPagamento),
          condicaoPagamento: keep(f.condicao, existente.condicaoPagamento),
          extras: { ...existente.extras, ...extras },
        },
        true,
      );
      return;
    }
    onSave(
      {
        id: f.id ?? `p_${Date.now()}`,
        codigo: editando ? f.codigo : f.codigoManual ? f.codigo : codigoAuto,
        tipo: f.tipo,
        subtipo: f.subtipo,
        pessoa,
        nome: f.nome.trim(),
        documento: f.documento,
        ativo: f.ativo,
        ...(f.tipo === "fornecedor" && { homologado: f.homologado }),
        contato: { nome: f.contatoNome || f.nome, email: f.email, telefone: f.telefone },
        fluxo: cliente ? "receita" : "despesa",
        formaPagamento: f.forma,
        condicaoPagamento: f.condicao,
        extras,
      },
      false,
    );
  };

  const err = (k: string) => (erros[k] ? [erros[k]!] : []);
  const campo = (c: Campo) =>
    c.tipo === "select" ? (
      <Input key={c.k} type="select" id={`parte-${c.k}`} label={`${c.k}${c.obrigatorio && !existente ? " *" : ""}`} prompt="Selecione" value={f.extras[c.k] ?? ""} options={(c.opcoes ?? []).map((o) => ({ label: o, value: o }))} onChange={(v) => upExtra(c.k, v ?? "")} errors={err(c.k)} />
    ) : (
      <Input key={c.k} type={(c.tipo ?? "text") as "text"} id={`parte-${c.k}`} label={`${c.k}${c.obrigatorio && !existente ? " *" : ""}`} placeholder={c.placeholder} hint={c.hint} value={f.extras[c.k] ?? ""} onChange={(e: ChangeEvent<HTMLInputElement>) => upExtra(c.k, e.target.value)} errors={err(c.k)} />
    );
  const nErros = Object.keys(erros).length;
  const titulo = editando ? `${f.codigo} · ${f.nome}` : cliente ? "Novo cliente" : "Novo fornecedor";

  return (
    <DrawerModal id="drawer-parte" show={show} title={titulo} onCancel={onCancel} variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-6">
        {!pode && (
          <Aviso tom="neutro" titulo={`Só leitura para ${cliente ? "clientes" : "fornecedores"}`}>
            {cliente ? "Clientes são cadastrados pelo Comercial / Faturamento." : "Fornecedores e pessoal são cadastrados por Compras / RH-DP."} Peça a alteração a eles ou ao Administrador.
          </Aviso>
        )}
        {nErros > 0 && (
          <Aviso tom="risco" titulo={`Corrija ${nErros} campo${nErros === 1 ? "" : "s"}`}>Os campos com erro estão marcados em vermelho.</Aviso>
        )}
        {existente && (
          <Aviso tom="atencao" titulo={`${docLabel} já cadastrado`}>
            Este {docLabel} já é de <strong>{existente.nome}</strong> ({existente.codigo}). Salvar vai atualizar o cadastro existente, só com os campos preenchidos.
          </Aviso>
        )}

        <fieldset disabled={!pode} className="space-y-8">
          <Secao titulo="Identificação">
            {!editando && trocarTipo && (
              <RadioGroup
                label="Parte"
                field={{ id: "parte-tipo", name: "tipo", value: f.tipo }}
                radio={[{ value: "cliente", label: "Cliente (receita)" }, { value: "fornecedor", label: "Fornecedor & Pessoal (despesa)" }]}
                wrapperClass="flex flex-wrap gap-x-2 space-x-0!"
                onChange={(e) => { const t = e.target.value as ParteTipo; setF(formNovo(t)); setErros({}); }}
              />
            )}
            {!editando && (
              <RadioGroup
                label="Tipo"
                field={{ id: "parte-subtipo", name: "subtipo", value: f.subtipo }}
                radio={SUBTIPOS[f.tipo].map((s) => ({ value: s, label: SUBTIPO[s] }))}
                wrapperClass="flex flex-wrap gap-x-2 space-x-0!"
                onChange={(e) => up({ subtipo: e.target.value as ParteSubtipo, documento: "" })}
              />
            )}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold text-brand-purple-dark">Código</span>
              {existente ? (
                <>
                  <span className="font-bold text-brand-purple-dark">{existente.codigo}</span>
                  <Tag item="Cadastro existente" variant="yellow" leftIcon="fa-rotate" />
                </>
              ) : editando ? (
                <span className="font-bold text-brand-purple-dark">{f.codigo}</span>
              ) : f.codigoManual ? (
                <Tag item="Manual / Legado" variant="orange" leftIcon="fa-keyboard" />
              ) : (
                <>
                  <span className="font-bold text-brand-purple-dark">{codigoAuto}</span>
                  <Tag item="Automático" variant="light-blue" leftIcon="fa-wand-magic-sparkles" />
                </>
              )}
              {f.subtipo === "liminar" && <Tag item="Origem liminar" variant="red" leftIcon="fa-gavel" title="Contratos desta parte já nascem com origem judicial marcada." />}
              {!editando && !existente && (
                <button type="button" className="ml-auto text-sm font-bold text-brand-blue hover:underline" onClick={() => up({ codigoManual: !f.codigoManual, codigo: "" })}>
                  {f.codigoManual ? "Usar código automático" : "Informar código manual / legado"}
                </button>
              )}
            </div>
            {f.subtipo === "liminar" && (
              <p className="text-sm text-brand-purple-dark/70">A origem liminar é marcada sozinha: todo contrato desta parte nasce com o processo e a vara preenchidos.</p>
            )}
            <FormGrid variant="small" className="mt-0! gap-y-8">
              {f.codigoManual && !editando && !existente && (
                <Input id="parte-codigo" label="Código manual / legado *" placeholder={cliente ? "CLI-0000" : "FOR-0000"} value={f.codigo} onChange={(e) => up({ codigo: e.target.value.toUpperCase() })} errors={err("codigo")} />
              )}
              <Input id="parte-nome" label={`${pessoa === "PJ" ? "Razão social" : "Nome completo"}${existente ? "" : " *"}`} value={f.nome} onChange={(e) => up({ nome: e.target.value })} errors={err("nome")} />
              <Input id="parte-doc" label={`${docLabel} *`} placeholder={pessoa === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"} value={f.documento} onChange={(e) => up({ documento: mascaraDoc(e.target.value, pessoa) })} errors={err("documento")} />
            </FormGrid>
          </Secao>

          <Secao titulo={CAMPOS[f.subtipo].titulo}>
            <FormGrid variant="small" className="mt-0! gap-y-8">{CAMPOS[f.subtipo].campos.map(campo)}</FormGrid>
          </Secao>

          <Secao titulo={cliente ? "Recebimento" : "Pagamento e dados bancários"}>
            <FormGrid variant="small" className="mt-0! gap-y-8">
              <Input type="select" id="parte-forma" label={`Forma de ${cliente ? "recebimento" : "pagamento"}${existente ? "" : " *"}`} prompt="Selecione" value={f.forma} options={formas.map((o) => ({ label: o, value: o }))} onChange={(v) => up({ forma: v ?? "" })} errors={err("forma")} />
              <Input type="select" id="parte-condicao" label={existente ? "Condição" : "Condição *"} prompt="Selecione" value={f.condicao} options={condicoes.map((o) => ({ label: o, value: o }))} onChange={(v) => up({ condicao: v ?? "" })} errors={err("condicao")} />
              {!cliente && BANCARIOS.map(campo)}
            </FormGrid>
          </Secao>

          <Secao titulo="Contato">
            <FormGrid variant="small" className="mt-0! gap-y-8">
              <Input id="parte-contato" label="Nome do contato" value={f.contatoNome} onChange={(e) => up({ contatoNome: e.target.value })} />
              <Input type="email" id="parte-email" label="E-mail" value={f.email} onChange={(e) => up({ email: e.target.value })} errors={err("email")} />
              <Input type="tel" id="parte-telefone" label="Telefone" placeholder="(00) 00000-0000" value={f.telefone} onChange={(e) => up({ telefone: e.target.value })} />
            </FormGrid>
          </Secao>

          {!existente && (
            <Secao titulo="Situação">
              <div className="flex flex-wrap gap-x-10 gap-y-4">
                <label className="flex items-center gap-3">
                  <Input type="switch" id="parte-ativo" value={f.ativo} onChange={(e) => up({ ativo: e.target.checked })} />
                  <span className="text-brand-purple-dark/80">Ativo</span>
                </label>
                {!cliente && (
                  <label className="flex items-center gap-3">
                    <Input type="switch" id="parte-homologado" value={f.homologado} onChange={(e) => up({ homologado: e.target.checked })} />
                    <span className="text-brand-purple-dark/80">Homologado para contratar</span>
                  </label>
                )}
              </div>
              <p className="text-sm text-brand-purple-dark/60">
                {cliente ? "Só clientes ativos aparecem no Novo Contrato." : "Só fornecedores ativos e homologados aparecem no Novo Contrato."}
              </p>
            </Secao>
          )}
        </fieldset>

        <div className={RODAPE_DRAWER}>
          <Button variant="ghost" onClick={onCancel}>{pode ? "Cancelar" : "Fechar"}</Button>
          {pode && (
            <Button leftIcon={existente ? "fa-rotate" : "fa-floppy-disk"} onClick={salvar}>
              {existente ? "Atualizar cadastro" : editando ? "Salvar alterações" : cliente ? "Cadastrar cliente" : "Cadastrar fornecedor"}
            </Button>
          )}
        </div>
      </div>
    </DrawerModal>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-extrabold uppercase tracking-wide text-brand-purple-dark/60">{titulo}</h3>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

type Visao = "todas" | "clientes" | "fornecedores";
const VISOES: { id: Visao; label: string; tipo?: ParteTipo }[] = [
  { id: "todas", label: "Todas" },
  { id: "clientes", label: "Clientes (receita)", tipo: "cliente" },
  { id: "fornecedores", label: "Fornecedores & Pessoal (despesa)", tipo: "fornecedor" },
];

/** O formulário aberto em cada valor do controle `form`. */
function formDoControle(form: string | undefined): FormParte | null {
  switch (form) {
    case "cliente": return formNovo("cliente", "operadora");
    case "fornecedor-pj": return formNovo("fornecedor", "fornecedor_pj");
    case "fornecedor-clt": return formNovo("fornecedor", "clt");
    case "duplicada": return formNovo("fornecedor", "fornecedor_pj", { documento: "12.345.678/0001-90" });
    default: return null;
  }
}

export function ContratosPartes({ context }: ScreenProps) {
  const papel = papelDe(context, "comercial");
  return (
    <ContratosShell context={context} secao="partes" titulo="Cadastro de Partes" subtitulo="Clientes (receita) e fornecedores & pessoal (despesa) que podem assinar contratos.">
      {(data) => <Partes key={JSON.stringify(context.controls)} data={data} controls={context.controls} papel={papel} />}
    </ContratosShell>
  );
}

function Partes({ data, controls, papel }: { data: ContratosData; controls: Record<string, string>; papel: Papel }) {
  const [partes, setPartes] = useState(data.partes);
  const [visao, setVisao] = useState<Visao>(VISOES.some((v) => v.id === controls.visao) ? (controls.visao as Visao) : "todas");
  const [pessoa, setPessoa] = useState<"PJ" | "PF" | null>(null);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<FormParte | null>(formDoControle(controls.form));
  const [formKey, setFormKey] = useState(0);
  const abrir = (f: FormParte) => { setForm(f); setFormKey((k) => k + 1); };

  const formas = data.tabelas.forma_pagamento.filter((o) => o.ativo).map((o) => o.descricao);
  const condicoes = data.tabelas.condicao_pagamento.filter((o) => o.ativo).map((o) => o.descricao);

  const tipoDaVisao = VISOES.find((v) => v.id === visao)!.tipo;
  const daVisao = (v: Visao) => partes.filter((p) => { const t = VISOES.find((x) => x.id === v)!.tipo; return !t || p.tipo === t; });
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return partes
      .filter((p) => !tipoDaVisao || p.tipo === tipoDaVisao)
      .filter((p) => !pessoa || p.pessoa === pessoa)
      .filter((p) => !q || [p.codigo, p.nome, p.documento, p.contato.nome].some((s) => s.toLowerCase().includes(q)))
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [partes, tipoDaVisao, pessoa, busca]);

  const limpar = () => { setPessoa(null); setBusca(""); setVisao("todas"); };
  const etiquetas = [
    ...(visao !== "todas" ? [{ id: "visao", label: VISOES.find((v) => v.id === visao)!.label, onRemove: () => setVisao("todas") }] : []),
    ...(pessoa ? [{ id: "pessoa", label: pessoa, onRemove: () => setPessoa(null) }] : []),
    ...(busca.trim() ? [{ id: "busca", label: `Busca: "${busca.trim()}"`, onRemove: () => setBusca("") }] : []),
  ];

  const exportar = () =>
    exportarPlanilha(
      "partes",
      ["Código", "Nome", "Documento", "Subtipo", "Fluxo", "Contato", "E-mail", "Telefone", "Status", "Homologado"],
      lista.map((p) => [p.codigo, p.nome, p.documento, SUBTIPO[p.subtipo], FLUXO[p.fluxo].label, p.contato.nome, p.contato.email, p.contato.telefone, p.ativo ? "Ativo" : "Inativo", p.tipo === "fornecedor" ? (p.homologado ? "Sim" : "Não") : "—"]),
    );

  const salvar = (p: Parte, atualizou: boolean) => {
    setPartes((ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? p : x)) : [...ps, p]));
    setForm(null);
    showToast({
      type: "success",
      title: atualizou ? "Cadastro atualizado" : form?.id ? "Alterações salvas" : p.tipo === "cliente" ? "Cliente cadastrado" : "Fornecedor cadastrado",
      content: atualizou ? `${p.codigo} · ${p.nome}: só os campos preenchidos foram atualizados.` : `${p.codigo} · ${p.nome}.`,
      closeTime: 4000,
    });
  };

  const botoes = (
    <>
      {podeCadastrar(papel, "cliente") && <Button leftIcon="fa-plus" onClick={() => abrir(formNovo("cliente"))}>Novo cliente</Button>}
      {podeCadastrar(papel, "fornecedor") && <Button leftIcon="fa-plus" onClick={() => abrir(formNovo("fornecedor"))}>Novo fornecedor</Button>}
    </>
  );

  return (
    <div className="space-y-6">
      <Bloco>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <AbasBotao id="partes-visao" abas={VISOES.map((v) => ({ id: v.id, titulo: `${v.label} (${daVisao(v.id).length})` }))} ativa={visao} onChange={setVisao} />
            <div className="ml-auto flex flex-wrap items-center gap-3">{botoes}</div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Input type="search" id="partes-busca" placeholder="Buscar nome, código ou documento" leftIcon="fa-magnifying-glass" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full sm:w-72" inputClass="text-ellipsis" />
            <Input
              type="select"
              id="partes-pessoa"
              label="Pessoa"
              prompt="PJ e PF"
              value={pessoa ?? ""}
              options={(["PJ", "PF"] as const).map((x) => ({ label: `${x} (${daVisao(visao).filter((p) => p.pessoa === x).length})`, value: x }))}
              onChange={(v) => setPessoa((v || null) as "PJ" | "PF" | null)}
              className="w-full sm:w-48"
            />
            <Button variant="tint" leftIcon="fa-file-spreadsheet" onClick={exportar} className="ml-auto">Exportar planilha</Button>
          </div>
          <Etiquetas itens={etiquetas} onLimpar={limpar} />
        </div>

        {partes.length === 0 ? (
          <EmptyStateCard icon="fa-handshake" text="Nenhuma parte cadastrada">
            <p>Cadastre o cliente ou o fornecedor antes de criar o contrato.</p>
          </EmptyStateCard>
        ) : lista.length === 0 ? (
          <EmptyStateCard icon="fa-filter-circle-xmark" text="Nenhuma parte com esses filtros">
            <p>Remova uma etiqueta ou limpe os filtros para ver todas as partes.</p>
            <div className="mt-6 flex justify-center"><Button variant="outline" onClick={limpar}>Limpar Todos</Button></div>
          </EmptyStateCard>
        ) : (
          <Table
            id="partes"
            rows={lista}
            rowId={(p) => p.id}
            rowClick={(p) => abrir(formDe(p))}
            col={[
              { label: "Código", render: (p) => <span className="font-bold text-brand-purple-dark whitespace-nowrap">{p.codigo}</span> },
              {
                label: "Nome",
                className: "min-w-56",
                render: (p) => (
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-brand-purple-dark">{p.nome}</span>
                    {p.subtipo === "liminar" && <Tag item="Liminar" variant="red" leftIcon="fa-gavel" />}
                  </div>
                ),
              },
              { label: "Documento", render: (p) => <span className="whitespace-nowrap tabular-nums">{p.documento}</span> },
              { label: "Subtipo", render: (p) => <span className="text-sm whitespace-nowrap">{SUBTIPO[p.subtipo]} · {p.pessoa}</span> },
              { label: "Fluxo", render: (p) => <Selo s={{ label: FLUXO[p.fluxo].label, variant: FLUXO[p.fluxo].variant, icon: FLUXO[p.fluxo].icon }} /> },
              {
                label: "Contato",
                render: (p) => (
                  <div className="text-sm">
                    <p className="font-semibold">{p.contato.nome}</p>
                    <p className="text-brand-purple-dark/60">{p.contato.email}</p>
                    <p className="text-brand-purple-dark/60 whitespace-nowrap">{p.contato.telefone}</p>
                  </div>
                ),
              },
              {
                label: "Status",
                render: (p) => (
                  <div className="flex flex-col items-start gap-1">
                    {p.ativo ? <Tag item="Ativo" variant="green" leftIcon="fa-check" /> : <Tag item="Inativo" variant="dark-purple" leftIcon="fa-ban" />}
                    {p.tipo === "fornecedor" && (p.homologado ? <Tag item="Homologado" variant="green" leftIcon="fa-badge-check" /> : <Tag item="Não homologado" variant="yellow" leftIcon="fa-clock" className="whitespace-nowrap" />)}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Bloco>

      {form && (
        <DrawerParte key={formKey} show partes={partes} formas={formas} condicoes={condicoes} inicial={form} papel={papel} onCancel={() => setForm(null)} onSave={salvar} />
      )}
    </div>
  );
}
