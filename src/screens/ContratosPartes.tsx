/**
 * Gestão de Contratos — Cadastro de Partes (FR-083 a FR-087).
 *
 * A lista de clientes (receita) e fornecedores & pessoal (despesa), com visões,
 * filtros PJ/PF, contagens, busca e exportação, e o cadastro lateral
 * (`drawer_modal`) com campos por subtipo (cliente) ou categoria (fornecedor).
 *
 * Código automático (CLI-0000 / FOR-0000, do sequencial) ou manual / legado;
 * código manual já usado é recusado com "Código já utilizado". Os valores
 * padrão de cada cadastro seguem a RN-062.
 *
 * Deduplicação (RN-061/RN-063): o CNPJ/CPF é comparado só pelos dígitos; a
 * operadora também pelo registro ANS; o paciente particular pelo CPF do
 * responsável junto com o paciente. Achado o cadastro, o formulário avisa e
 * salvar atualiza o existente só com os campos preenchidos pelo usuário: os
 * demais (como os dados bancários) ficam como estavam.
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
import { FLUXO, SUBTIPO, SUBTIPOS_CLIENTE, SUBTIPOS_FORNECEDOR, type ContratosData, type Papel, type Parte, type ParteSubtipo, type ParteTipo } from "./gestao-de-contratos/model.js";
import { opcoesAtivas } from "./ContratosTabelas.js";
import { Aviso, Bloco, ContratosShell, AbasBotao, Etiquetas, Selo, exportarPlanilha, papelDe, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";

/* ------------------------------------------------------------------ */
/* Regras do cadastro                                                  */
/* ------------------------------------------------------------------ */

/** Comercial cadastra clientes; Compras/RH-DP cadastra fornecedores; o Administrador, os dois. */
export const podeCadastrar = (papel: Papel, tipo: ParteTipo) =>
  papel === "administrador" || (tipo === "cliente" && papel === "comercial") || (tipo === "fornecedor" && papel === "compras");

const SUBTIPOS: Record<ParteTipo, ParteSubtipo[]> = { cliente: SUBTIPOS_CLIENTE, fornecedor: SUBTIPOS_FORNECEDOR };
const PESSOA: Record<ParteSubtipo, "PJ" | "PF"> = {
  particular_pj: "PJ", operadora: "PJ", corporativa: "PJ", pf: "PF", liminar: "PF",
  fornecedor_pj: "PJ", pj_corporativo: "PJ", locador: "PJ", clt: "PF", autonomo: "PF", fornecedor_pf: "PF",
};

type Campo = { k: string; tipo?: "text" | "number" | "date" | "select" | "email"; opcoes?: string[]; obrigatorio?: boolean; placeholder?: string; hint?: string; cpf?: boolean };
type Secao = { titulo: string; campos: Campo[] };

/* Campos por subtipo. A chave é o rótulo, o mesmo dos `extras` da parte. */
const EMPRESA: Campo[] = [
  { k: "Nome fantasia", placeholder: "Nome comercial ou de marca" },
  { k: "Inscrição municipal", placeholder: "Isento ou nº" },
  { k: "Inscrição estadual", placeholder: "Isento ou nº" },
];
const PACIENTE_RESPONSAVEL: Campo[] = [
  { k: "Paciente/beneficiário", obrigatorio: true, placeholder: "Quem recebe o atendimento" },
  { k: "CPF do paciente", cpf: true, placeholder: "000.000.000-00" },
  { k: "Data de nascimento do paciente", tipo: "date" },
  { k: "RG", placeholder: "Do contratante" },
  { k: "Responsável legal", obrigatorio: true, placeholder: "Pai, mãe, tutor ou curador" },
  { k: "CPF do responsável", obrigatorio: true, cpf: true, placeholder: "000.000.000-00" },
  { k: "Parentesco", tipo: "select", opcoes: ["Mãe", "Pai", "Tutor(a)", "Curador(a)", "Avó/Avô", "Próprio paciente", "Outro"], obrigatorio: true },
  { k: "Origem liminar", tipo: "select", opcoes: ["Não", "Sim"], hint: "Sim troca o subtipo para Liminar Judicial." },
];
const EMPRESA_FORNECEDOR: Campo[] = [
  ...EMPRESA,
  { k: "Natureza jurídica", placeholder: "Ex.: Sociedade Empresária Limitada" },
  { k: "Regime tributário", tipo: "select", opcoes: ["MEI", "Simples Nacional", "Lucro Presumido", "Lucro Real"] },
  { k: "CNAE", placeholder: "0000-0/00" },
  { k: "Retenções aplicáveis", placeholder: "Ex.: ISS 5% · IRRF 1,5%" },
  { k: "E-mail financeiro", tipo: "email" },
];
const HABILITACAO: Campo[] = [{ k: "Responsável técnico" }, { k: "Conselho", placeholder: "Conselho e registro" }];
const DOCUMENTOS_PF: Campo[] = [
  { k: "RG" },
  { k: "Órgão emissor RG", placeholder: "Ex.: SESP/PR" },
  { k: "Data de nascimento", tipo: "date" },
  { k: "PIS/PASEP/NIT", placeholder: "000.00000.00-0" },
  { k: "CTPS", placeholder: "Digital ou número" },
  { k: "Série CTPS" },
];
const vinculo = (clt: boolean): Campo[] => [
  { k: "Cargo", obrigatorio: clt, placeholder: "Função contratada" },
  { k: "CBO", placeholder: "0000-00" },
  { k: "Admissão", tipo: "date", obrigatorio: clt },
  { k: "Carga horária semanal", hint: "horas" },
  { k: "Escala de trabalho", placeholder: "Ex.: Segunda a Sexta" },
  { k: "Salário", hint: "R$", placeholder: "0,00" },
  { k: "Vale-transporte", tipo: "select", opcoes: ["Sim", "Não"] },
  { k: "Status do vínculo", tipo: "select", opcoes: ["Ativo", "Em experiência", "Afastado", "Desligado"] },
  ...(clt ? [] : [{ k: "Conselho", placeholder: "Conselho e registro" }, { k: "Retenções aplicáveis", placeholder: "Ex.: INSS 11% · ISS 5%" }]),
];

const SECOES: Record<ParteSubtipo, Secao[]> = {
  particular_pj: [
    { titulo: "Dados empresariais", campos: EMPRESA },
    { titulo: "Paciente vinculado", campos: [{ k: "Paciente/beneficiário", obrigatorio: true, placeholder: "Colaborador ou dependente atendido" }, { k: "CPF do paciente", cpf: true, placeholder: "000.000.000-00" }] },
  ],
  operadora: [
    { titulo: "Dados empresariais", campos: EMPRESA },
    {
      titulo: "Operadora ANS",
      campos: [
        { k: "Registro ANS", obrigatorio: true, placeholder: "000000" },
        { k: "Dia de corte do lote", tipo: "number", obrigatorio: true, placeholder: "1 a 31" },
        { k: "Prazo de retorno", tipo: "select", opcoes: ["15 dias", "30 dias", "45 dias", "60 dias"], obrigatorio: true },
        { k: "Contato de credenciamento" },
      ],
    },
  ],
  corporativa: [{ titulo: "Dados empresariais", campos: EMPRESA }],
  pf: [{ titulo: "Paciente e responsável legal", campos: PACIENTE_RESPONSAVEL }],
  liminar: [
    { titulo: "Paciente e responsável legal", campos: PACIENTE_RESPONSAVEL },
    {
      titulo: "Liminar judicial",
      campos: [
        { k: "Processo", obrigatorio: true, placeholder: "0000000-00.0000.0.00.0000" },
        { k: "Vara", obrigatorio: true, placeholder: "Ex.: 3ª Vara Cível de Curitiba" },
      ],
    },
  ],
  fornecedor_pj: [{ titulo: "Dados empresariais", campos: EMPRESA_FORNECEDOR }, { titulo: "Habilitação técnica", campos: HABILITACAO }],
  pj_corporativo: [{ titulo: "Dados empresariais", campos: EMPRESA_FORNECEDOR }, { titulo: "Habilitação técnica", campos: HABILITACAO }],
  locador: [{ titulo: "Dados empresariais", campos: EMPRESA_FORNECEDOR }, { titulo: "Habilitação técnica", campos: HABILITACAO }],
  clt: [{ titulo: "Documentos pessoais", campos: DOCUMENTOS_PF }, { titulo: "Vínculo e jornada", campos: vinculo(true) }],
  autonomo: [{ titulo: "Documentos pessoais", campos: DOCUMENTOS_PF }, { titulo: "Vínculo e jornada", campos: vinculo(false) }],
  fornecedor_pf: [{ titulo: "Documentos pessoais", campos: DOCUMENTOS_PF }, { titulo: "Vínculo e jornada", campos: vinculo(false) }],
};

/** Dados bancários: de recebimento (cliente) ou de pagamento, com tipo de conta (fornecedor). */
const bancarios = (cliente: boolean): Campo[] => [
  { k: "Banco", placeholder: "Código e nome" },
  { k: "Agência" },
  { k: "Conta" },
  ...(cliente ? [] : [{ k: "Tipo de conta", tipo: "select" as const, opcoes: ["Corrente", "Poupança", "Salário", "Pagamento"] }]),
  { k: cliente ? "Chave Pix do pagador" : "Chave Pix" },
];
/** Todos os campos extras que o formulário mostra para o subtipo. */
const camposDe = (s: ParteSubtipo, tipo: ParteTipo): Campo[] => [
  ...SECOES[s].flatMap((x) => x.campos),
  ...(tipo === "cliente" ? [{ k: "E-mail de faturamento", tipo: "email" as const }] : []),
  ...bancarios(tipo === "cliente"),
  { k: "CEP" },
];
const DATAS = ["Admissão", "Data de nascimento", "Data de nascimento do paciente"];
const EMAILS = ["E-mail de faturamento", "E-mail financeiro"];

/** Valores padrão do cadastro (RN-062). A condição "30 dias" casa com a primeira opção da tabela que começa assim. */
const PADRAO: Record<ParteTipo, { subtipo: ParteSubtipo; forma: string; condicao: string; extras: Record<string, string> }> = {
  cliente: { subtipo: "particular_pj", forma: "Boleto Bancário", condicao: "30 dias", extras: { "Dia de corte do lote": "20", "Prazo de retorno": "30 dias", "Origem liminar": "Não" } },
  fornecedor: {
    subtipo: "pj_corporativo",
    forma: "PIX",
    condicao: "30 dias",
    extras: { "Regime tributário": "Simples Nacional", "Carga horária semanal": "44", "Escala de trabalho": "Segunda a Sexta", Salário: "0,00", "Vale-transporte": "Sim", "Tipo de conta": "Corrente", "Status do vínculo": "Ativo" },
  },
};

/** Máscara de CNPJ (PJ) ou CPF (PF). */
export function mascaraDoc(v: string, pessoa: "PJ" | "PF") {
  const d = v.replace(/\D/g, "").slice(0, pessoa === "PJ" ? 14 : 11);
  if (pessoa === "PF") return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}
/** Só os dígitos: "12.345.678/0001-90" e "12345678000190" são o mesmo documento (RN-061). */
const digitos = (v?: string) => (v ?? "").replace(/\D/g, "");
const docCompleto = (doc: string, pessoa: "PJ" | "PF") => digitos(doc).length === (pessoa === "PJ" ? 14 : 11);
const mesmoTexto = (a?: string, b?: string) => !!a?.trim() && a.trim().toLowerCase() === (b ?? "").trim().toLowerCase();

/**
 * Próximo código do sequencial: CLI-0006, FOR-0009… `sugerido` é o próximo
 * código da base (`data.proximoCliente`/`proximoFornecedor`); vale o maior.
 */
export function proximoCodigoParte(partes: Parte[], tipo: ParteTipo, sugerido?: string) {
  const pre = tipo === "cliente" ? "CLI" : "FOR";
  const n = Math.max(0, ...partes.filter((p) => p.codigo.startsWith(`${pre}-`)).map((p) => Number(p.codigo.slice(4)) || 0));
  const s = sugerido?.startsWith(`${pre}-`) ? Number(sugerido.slice(4)) || 0 : 0;
  return `${pre}-${String(Math.max(n + 1, s)).padStart(4, "0")}`;
}

/**
 * Cadastro já existente para os dados do formulário (RN-061/RN-063), do mesmo
 * tipo (cliente ou fornecedor): CNPJ/CPF pelos dígitos; operadora também pelo
 * registro ANS; paciente particular pelo CPF do responsável **e** o paciente.
 */
function cadastroExistente(partes: Parte[], f: FormParte): { parte: Parte; motivo: string } | undefined {
  const pessoa = PESSOA[f.subtipo];
  const outras = partes.filter((p) => p.id !== f.id && p.tipo === f.tipo);
  const doc = digitos(f.documento);
  if (docCompleto(f.documento, pessoa)) {
    const p = outras.find((x) => digitos(x.documento) === doc);
    if (p) return { parte: p, motivo: `Este ${pessoa === "PJ" ? "CNPJ" : "CPF"} já é de` };
  }
  const ans = digitos(f.extras["Registro ANS"]);
  if (f.subtipo === "operadora" && ans.length >= 6) {
    const p = outras.find((x) => x.subtipo === "operadora" && digitos(x.extras["Registro ANS"]) === ans);
    if (p) return { parte: p, motivo: "Este registro ANS já é de" };
  }
  const cpfResp = digitos(f.extras["CPF do responsável"]);
  if (f.tipo === "cliente" && pessoa === "PF" && cpfResp.length === 11 && f.extras["Paciente/beneficiário"]?.trim()) {
    const p = outras.find((x) => x.pessoa === "PF" && digitos(x.extras["CPF do responsável"]) === cpfResp && mesmoTexto(x.extras["Paciente/beneficiário"], f.extras["Paciente/beneficiário"]));
    if (p) return { parte: p, motivo: "Este responsável legal (CPF) e este paciente já são de" };
  }
  return undefined;
}

/** Linha dos dados bancários (`Parte.banco`): "001 · Ag 1234 · CC 56789-0 (conta corrente) · PIX: …". */
function linhaBanco(x: Record<string, string>) {
  const tipo = x["Tipo de conta"] ? ` (conta ${x["Tipo de conta"].toLowerCase()})` : "";
  const conta = [x.Banco, x["Agência"] && `Ag ${x["Agência"]}`, x.Conta && `CC ${x.Conta}${tipo}`].filter(Boolean).join(" · ");
  const pix = x["Chave Pix"] || x["Chave Pix do pagador"];
  return [conta, pix && `PIX: ${pix}`].filter(Boolean).join(" · ");
}
const CHAVES_BANCO = ["Banco", "Agência", "Conta", "Tipo de conta", "Chave Pix", "Chave Pix do pagador"];

const isoDeBr = (v: string) => (/^\d{2}\/\d{2}\/\d{4}$/.test(v) ? v.split("/").reverse().join("-") : v);
const brDeIso = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split("-").reverse().join("/") : v);
/** Inclui o valor atual nas opções (cadastro antigo com opção que saiu da tabela). */
const comAtual = (opcoes: string[], atual: string) => (atual && !opcoes.includes(atual) ? [atual, ...opcoes] : opcoes);

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
  endereco: string;
  forma: string;
  condicao: string;
  ativo: boolean;
  homologado: boolean;
  extras: Record<string, string>;
};

/** Formulário novo com os valores padrão da RN-062. */
export const formNovo = (tipo: ParteTipo, subtipo: ParteSubtipo = PADRAO[tipo].subtipo, extra: Partial<FormParte> = {}): FormParte => ({
  tipo, subtipo, codigoManual: false, codigo: "", nome: "", documento: "", contatoNome: "", email: "", telefone: "", endereco: "",
  forma: PADRAO[tipo].forma, condicao: PADRAO[tipo].condicao, ativo: true, homologado: tipo === "fornecedor",
  ...extra,
  extras: { ...PADRAO[tipo].extras, ...(subtipo === "liminar" && { "Origem liminar": "Sim" }), ...extra.extras },
});

const formDe = (p: Parte): FormParte => ({
  id: p.id, tipo: p.tipo, subtipo: p.subtipo, codigoManual: false, codigo: p.codigo, nome: p.nome, documento: p.documento,
  contatoNome: p.contato.nome, email: p.contato.email, telefone: p.contato.telefone, endereco: p.endereco ?? "", forma: p.formaPagamento, condicao: p.condicaoPagamento,
  ativo: p.ativo, homologado: p.homologado ?? false, extras: Object.fromEntries(Object.entries(p.extras).map(([k, v]) => [k, DATAS.includes(k) ? isoDeBr(v) : v])),
});

type Erros = Record<string, string>;

/**
 * Cadastro lateral de cliente ou fornecedor. `onSave` recebe a parte salva e
 * se ela atualizou um cadastro existente (RN-061).
 */
export function DrawerParte({
  show,
  partes,
  formas,
  condicoes,
  inicial,
  papel,
  permitido,
  proximo,
  trocarTipo = false,
  onCancel,
  onSave,
}: {
  show: boolean;
  /** Força a permissão (atalho do Novo Contrato); sem ele, vale o papel. */
  permitido?: boolean;
  /** Mostra a escolha cliente/fornecedor (atalho do Novo Contrato). */
  trocarTipo?: boolean;
  /** Próximo código da base (`data.proximoCliente`/`proximoFornecedor`). */
  proximo?: Partial<Record<ParteTipo, string>>;
  partes: Parte[];
  formas: string[];
  condicoes: string[];
  inicial: FormParte;
  papel: Papel;
  onCancel: () => void;
  onSave: (parte: Parte, atualizou: boolean) => void;
}) {
  // "30 dias" (RN-062) vira a primeira condição da tabela que começa assim.
  const condicaoPadrao = (c: string) => (c === "30 dias" && !condicoes.includes(c) ? condicoes.find((x) => x.startsWith("30 dias")) ?? c : c);
  const [f, setF] = useState<FormParte>({ ...inicial, condicao: condicaoPadrao(inicial.condicao) });
  const [erros, setErros] = useState<Erros>({});
  /** Campos que o usuário mexeu: na atualização de um cadastro existente, só eles valem (os padrões não sobrescrevem). */
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const tocar = (...ks: string[]) => setTocados((t) => new Set([...t, ...ks]));
  const up = (patch: Partial<FormParte>) => { setF((s) => ({ ...s, ...patch })); tocar(...Object.keys(patch)); setErros({}); };
  const upExtra = (k: string, v: string) => {
    // Origem liminar e subtipo andam juntos (FR-084).
    if (k === "Origem liminar" && f.tipo === "cliente") setF((s) => ({ ...s, subtipo: v === "Sim" ? "liminar" : "pf", extras: { ...s.extras, [k]: v } }));
    else setF((s) => ({ ...s, extras: { ...s.extras, [k]: v } }));
    tocar(`x:${k}`);
    setErros({});
  };
  const trocarSubtipo = (s: ParteSubtipo) => {
    setF((x) => ({
      ...x,
      subtipo: s,
      documento: PESSOA[s] === PESSOA[x.subtipo] ? x.documento : "",
      extras: x.tipo === "cliente" ? { ...x.extras, "Origem liminar": s === "liminar" ? "Sim" : "Não" } : x.extras,
    }));
    setErros({});
  };

  const pessoa = PESSOA[f.subtipo];
  const editando = Boolean(f.id);
  const dup = cadastroExistente(partes, f);
  const existente = dup?.parte;
  const pode = permitido ?? podeCadastrar(papel, f.tipo);
  const codigoAuto = editando ? f.codigo : proximoCodigoParte(partes, f.tipo, proximo?.[f.tipo]);
  const cliente = f.tipo === "cliente";
  const docLabel = pessoa === "PJ" ? "CNPJ" : "CPF";
  const visiveis = camposDe(f.subtipo, f.tipo);
  const original = editando ? partes.find((p) => p.id === f.id) : undefined;

  const salvar = () => {
    const e: Erros = {};
    if (!existente && !f.nome.trim()) e.nome = pessoa === "PJ" ? "Informe a razão social." : "Informe o nome completo.";
    if (!f.documento && !existente) e.documento = `Informe o ${docLabel}.`;
    else if (f.documento && !docCompleto(f.documento, pessoa)) e.documento = `${docLabel} incompleto: confira os ${pessoa === "PJ" ? 14 : 11} dígitos.`;
    if (!editando && f.codigoManual && !existente) {
      if (!f.codigo.trim()) e.codigo = "Informe o código manual / legado.";
      else if (partes.some((p) => p.codigo.toUpperCase() === f.codigo.trim().toUpperCase())) e.codigo = "Código já utilizado";
    }
    if (!existente) for (const c of visiveis) if (c.obrigatorio && !(f.extras[c.k] ?? "").trim()) e[c.k] = `Informe ${c.k.toLowerCase()}.`;
    const corte = f.extras["Dia de corte do lote"];
    if (f.subtipo === "operadora" && corte && (Number(corte) < 1 || Number(corte) > 31)) e["Dia de corte do lote"] = "O dia de corte vai de 1 a 31.";
    for (const c of visiveis) if (c.cpf && f.extras[c.k] && digitos(f.extras[c.k]).length !== 11) e[c.k] = "CPF incompleto: confira os 11 dígitos.";
    for (const k of ["email", ...EMAILS]) {
      const v = k === "email" ? f.email : f.extras[k];
      if (v && !/^\S+@\S+\.\S+$/.test(v)) e[k] = "E-mail inválido.";
    }
    if (!existente) {
      if (!f.forma) e.forma = `Escolha a forma de ${cliente ? "recebimento" : "pagamento"}.`;
      if (!f.condicao) e.condicao = "Escolha a condição.";
    }
    if (Object.keys(e).length) return setErros(e);

    const conv = ([k, v]: [string, string]): [string, string] => [k, DATAS.includes(k) ? brDeIso(v.trim()) : v.trim()];
    if (existente) {
      // Atualiza só com o que o usuário preencheu; o resto do cadastro existente fica (RN-061).
      const tocado = (k: string, v: string) => tocados.has(k) && v.trim();
      const keep = (k: keyof FormParte, antigo: string) => { const v = String(f[k] ?? ""); return tocado(k, v) ? v.trim() : antigo; };
      const novos = Object.fromEntries(Object.entries(f.extras).filter(([k, v]) => tocado(`x:${k}`, v)).map(conv));
      const extras = { ...existente.extras, ...novos };
      const mexeuBanco = CHAVES_BANCO.some((k) => k in novos);
      onSave(
        {
          ...existente,
          nome: keep("nome", existente.nome),
          contato: { nome: keep("contatoNome", existente.contato.nome), email: keep("email", existente.contato.email), telefone: keep("telefone", existente.contato.telefone) },
          endereco: keep("endereco", existente.endereco ?? "") || undefined,
          formaPagamento: keep("forma", existente.formaPagamento),
          condicaoPagamento: keep("condicao", existente.condicaoPagamento),
          banco: mexeuBanco ? linhaBanco(extras) : existente.banco,
          extras,
        },
        true,
      );
      return;
    }
    // Novo: só os campos do subtipo escolhido. Edição: mantém os extras que a tela não mostra.
    const extras: Record<string, string> = { ...(original?.extras ?? {}) };
    for (const c of visiveis) {
      const v = (f.extras[c.k] ?? "").trim();
      if (v) extras[c.k] = conv([c.k, v])[1];
      else delete extras[c.k];
    }
    const banco = linhaBanco(extras) || original?.banco;
    onSave(
      {
        id: f.id ?? `p_${Date.now()}`,
        codigo: editando ? f.codigo : f.codigoManual ? f.codigo.trim().toUpperCase() : codigoAuto,
        tipo: f.tipo,
        subtipo: f.subtipo,
        pessoa,
        nome: f.nome.trim(),
        documento: f.documento,
        ativo: f.ativo,
        ...(f.tipo === "fornecedor" && { homologado: f.homologado }),
        contato: { nome: f.contatoNome || f.nome, email: f.email, telefone: f.telefone },
        ...(f.endereco.trim() && { endereco: f.endereco.trim() }),
        fluxo: cliente ? "receita" : "despesa",
        formaPagamento: f.forma,
        condicaoPagamento: f.condicao,
        ...(banco && { banco }),
        extras,
      },
      false,
    );
  };

  const err = (k: string) => (erros[k] ? [erros[k]!] : []);
  const rotulo = (c: Campo) => `${c.k}${c.obrigatorio && !existente ? " *" : ""}`;
  const campo = (c: Campo) =>
    c.tipo === "select" ? (
      <Input key={c.k} type="select" id={`parte-${c.k}`} label={rotulo(c)} prompt="Selecione" hint={c.hint} value={f.extras[c.k] ?? ""} options={(c.opcoes ?? []).map((o) => ({ label: o, value: o }))} onChange={(v) => upExtra(c.k, v ?? "")} errors={err(c.k)} />
    ) : (
      <Input
        key={c.k}
        type={(c.tipo ?? "text") as "text"}
        id={`parte-${c.k}`}
        label={rotulo(c)}
        placeholder={c.placeholder}
        hint={c.hint}
        value={f.extras[c.k] ?? ""}
        onChange={(e: ChangeEvent<HTMLInputElement>) => upExtra(c.k, c.cpf ? mascaraDoc(e.target.value, "PF") : e.target.value)}
        errors={err(c.k)}
      />
    );
  const nErros = Object.keys(erros).length;
  const titulo = editando ? `${f.codigo} · ${f.nome}` : cliente ? "Novo cliente" : "Novo fornecedor";
  const liminar = f.subtipo === "liminar";

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
        {dup && (
          <Aviso tom="atencao" titulo="Cadastro já existente">
            {dup.motivo} <strong>{dup.parte.nome}</strong> ({dup.parte.codigo}). Salvar vai atualizar o cadastro existente só com os campos preenchidos; os demais, como os dados bancários, ficam como estão.
          </Aviso>
        )}

        <fieldset disabled={!pode} className="space-y-8">
          <SecaoForm titulo="Identificação">
            {!editando && trocarTipo && (
              <RadioGroup
                label="Parte"
                field={{ id: "parte-tipo", name: "tipo", value: f.tipo }}
                radio={[{ value: "cliente", label: "Cliente (receita)" }, { value: "fornecedor", label: "Fornecedor & Pessoal (despesa)" }]}
                wrapperClass="flex flex-wrap gap-x-2 space-x-0!"
                onChange={(e) => { const t = e.target.value as ParteTipo; setF({ ...formNovo(t), condicao: condicaoPadrao(PADRAO[t].condicao) }); setTocados(new Set()); setErros({}); }}
              />
            )}
            {!editando && (
              <RadioGroup
                label={cliente ? "Subtipo" : "Categoria"}
                field={{ id: "parte-subtipo", name: "subtipo", value: f.subtipo }}
                radio={SUBTIPOS[f.tipo].map((s) => ({ value: s, label: `${SUBTIPO[s]} · ${PESSOA[s]}` }))}
                wrapperClass="flex flex-wrap gap-x-2 space-x-0!"
                onChange={(e) => trocarSubtipo(e.target.value as ParteSubtipo)}
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
              {liminar && <Tag item="Origem liminar" variant="red" leftIcon="fa-gavel" title="Contratos desta parte já nascem com origem judicial marcada." />}
              {!editando && !existente && (
                <button type="button" className="ml-auto text-sm font-bold text-brand-blue hover:underline" onClick={() => up({ codigoManual: !f.codigoManual, codigo: "" })}>
                  {f.codigoManual ? "Usar código automático" : "Informar código manual / legado"}
                </button>
              )}
            </div>
            {liminar && (
              <p className="text-sm text-brand-purple-dark/70">O subtipo Liminar Judicial marca a origem liminar sozinho: todo contrato desta parte nasce com o processo e a vara preenchidos.</p>
            )}
            <FormGrid variant="small" className="mt-0! gap-y-8">
              {f.codigoManual && !editando && !existente && (
                <Input id="parte-codigo" label="Código manual / legado *" placeholder={cliente ? "CLI-0000" : "FOR-0000"} value={f.codigo} onChange={(e) => up({ codigo: e.target.value.toUpperCase() })} errors={err("codigo")} />
              )}
              <Input id="parte-nome" label={`${pessoa === "PJ" ? "Razão social" : "Nome completo"}${existente ? "" : " *"}`} value={f.nome} onChange={(e) => up({ nome: e.target.value })} errors={err("nome")} />
              <Input id="parte-doc" label={`${docLabel}${existente ? "" : " *"}`} placeholder={pessoa === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"} value={f.documento} onChange={(e) => up({ documento: mascaraDoc(e.target.value, pessoa) })} errors={err("documento")} />
            </FormGrid>
          </SecaoForm>

          {SECOES[f.subtipo].map((s) => (
            <SecaoForm key={s.titulo} titulo={s.titulo}>
              <FormGrid variant="small" className="mt-0! gap-y-8">{s.campos.map(campo)}</FormGrid>
            </SecaoForm>
          ))}

          <SecaoForm titulo={cliente ? "Faturamento e recebimento" : "Pagamento e dados bancários"}>
            <FormGrid variant="small" className="mt-0! gap-y-8">
              <Input type="select" id="parte-forma" label={`Forma de ${cliente ? "recebimento" : "pagamento"}${existente ? "" : " *"}`} prompt="Selecione" value={f.forma} options={comAtual(formas, f.forma).map((o) => ({ label: o, value: o }))} onChange={(v) => up({ forma: v ?? "" })} errors={err("forma")} />
              <Input type="select" id="parte-condicao" label={existente ? "Condição" : "Condição *"} prompt="Selecione" value={f.condicao} options={comAtual(condicoes, f.condicao).map((o) => ({ label: o, value: o }))} onChange={(v) => up({ condicao: v ?? "" })} errors={err("condicao")} />
              {cliente && campo({ k: "E-mail de faturamento", tipo: "email" })}
              {bancarios(cliente).map(campo)}
            </FormGrid>
            {original?.banco && !CHAVES_BANCO.some((k) => original.extras[k]) && (
              <p className="text-sm text-brand-purple-dark/60">Dados bancários atuais: {original.banco}. Deixe em branco para manter.</p>
            )}
          </SecaoForm>

          <SecaoForm titulo="Endereço e contato">
            <FormGrid variant="small" className="mt-0! gap-y-8">
              {campo({ k: "CEP", placeholder: "00000-000" })}
              <Input id="parte-endereco" label="Endereço completo" placeholder="Logradouro, número, bairro, cidade/UF" value={f.endereco} onChange={(e) => up({ endereco: e.target.value })} />
              <Input id="parte-contato" label="Nome do contato" value={f.contatoNome} onChange={(e) => up({ contatoNome: e.target.value })} />
              <Input type="email" id="parte-email" label="E-mail" value={f.email} onChange={(e) => up({ email: e.target.value })} errors={err("email")} />
              <Input type="tel" id="parte-telefone" label={cliente ? "Telefone / WhatsApp" : "Telefone"} placeholder="(00) 00000-0000" value={f.telefone} onChange={(e) => up({ telefone: e.target.value })} />
            </FormGrid>
          </SecaoForm>

          {!existente && (
            <SecaoForm titulo="Situação">
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
            </SecaoForm>
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

function SecaoForm({ titulo, children }: { titulo: string; children: ReactNode }) {
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
    case "cliente": return formNovo("cliente");
    case "cliente-operadora": return formNovo("cliente", "operadora");
    case "cliente-pf": return formNovo("cliente", "pf");
    case "cliente-liminar": return formNovo("cliente", "liminar");
    case "fornecedor-pj": return formNovo("fornecedor", "fornecedor_pj");
    case "fornecedor-clt": return formNovo("fornecedor", "clt");
    case "duplicada": return formNovo("fornecedor", "fornecedor_pj", { documento: "12345678000190" });
    case "codigo-repetido": return formNovo("cliente", undefined, { codigoManual: true, codigo: "CLI-0001" });
    default: return null;
  }
}

export function ContratosPartes({ context }: ScreenProps) {
  const papel = papelDe(context, "administrador");
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
  /** Último cadastro atualizado por documento repetido (RN-061): aviso acima da lista. */
  const [atualizada, setAtualizada] = useState<Parte | null>(null);
  const abrir = (f: FormParte) => { setForm(f); setFormKey((k) => k + 1); };

  // Só opções ativas, pela ordem e pela descrição (FR-095).
  const formas = opcoesAtivas(data.tabelas, "forma_pagamento");
  const condicoes = opcoesAtivas(data.tabelas, "condicao_pagamento");

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
    setAtualizada(atualizou ? p : null);
    showToast({
      type: "success",
      title: atualizou ? "Cadastro atualizado" : form?.id ? "Alterações salvas" : p.tipo === "cliente" ? "Cliente cadastrado" : "Fornecedor cadastrado",
      content: atualizou ? `${p.codigo} · ${p.nome}: só os campos preenchidos foram atualizados; os demais foram preservados.` : `${p.codigo} · ${p.nome}.`,
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
      {atualizada && (
        <Aviso tom="ok" titulo="Cadastro atualizado">
          {atualizada.codigo} · {atualizada.nome} já existia com este documento: só os campos preenchidos foram atualizados; os demais, como os dados bancários, foram preservados.
        </Aviso>
      )}
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
                    {(p.subtipo === "liminar" || p.extras["Origem liminar"] === "Sim") && <Tag item="Liminar" variant="red" leftIcon="fa-gavel" />}
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
        <DrawerParte key={formKey} show partes={partes} proximo={{ cliente: data.proximoCliente, fornecedor: data.proximoFornecedor }} formas={formas} condicoes={condicoes} inicial={form} papel={papel} onCancel={() => setForm(null)} onSave={salvar} />
      )}
    </div>
  );
}
