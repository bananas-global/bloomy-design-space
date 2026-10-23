/**
 * Gestão de Contratos — Novo Contrato (FR-020 a FR-032).
 *
 * Formulário em cinco seções (Modalidade · Partes · Financeiro · Vigência e
 * reajuste · Campos da categoria), com o índice de seções à esquerda. Adesão
 * nasce da minuta padrão vigente da categoria (ou das 9 cláusulas padrão, sem
 * minuta); Corporativo e Específico nascem do upload do documento externo
 * ("Fluxo Invertido"). Ao lado de Categoria, Fluxo, Forma, Condição, Unidade e
 * Índice, "+ Nova/Novo" cadastra a opção da tabela de apoio num modal pequeno
 * (o combobox criável também cria digitando), e "Cadastrar Nova Parte" abre o
 * mesmo cadastro lateral da tela de Partes.
 *
 * O formulário abre com os valores padrão da RN-026. Salvar valida campo a
 * campo e resume no topo ("Corrija N campos"); nada é gravado e nenhum código
 * é consumido com erro. Com sucesso, mostra o que o sistema grava: estado
 * inicial (RN-025), versão v1.0, cláusulas geradas (RN-029/030) e checklist do
 * dossiê (RN-031). O protótipo não grava: o atalho abre o CTR-2026-0006, um
 * contrato real em Elaboração.
 *
 * Feito na tela (componente novo): o índice de seções, o cartão da minuta e o
 * resumo de erros. O resto é `radio_cards`, `radio_selector`, `input`,
 * `form_grid`, `file_uploader`, `modal`, `drawer_modal`, `tag` e `button`.
 */
import { useState, type ChangeEvent, type ReactNode } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { FormGrid } from "../components/BackofficeComponents.js";
import { Button } from "../components/Button.js";
import { RadioCards, RadioGroup } from "../components/Choice.js";
import { ComboboxCriavel, MultiComboboxCriavel } from "./gestao-de-contratos/ComboboxCriavel.js";
import { FileItem, FileUploader } from "../components/FileUploader.js";
import { Icon } from "../components/Icon.js";
import { FieldError, Input, cx } from "../components/Input.js";
import { DrawerModal, Modal } from "../components/Overlay.js";
import { Tag } from "../components/Tag.js";
import {
  APROVACAO, ASSINATURA, CONFORMIDADE, MESES, MODALIDADE, PADROES_CONTRATO, STATUS, SUBTIPO,
  br, brl, checklistInicial, clausulasDoContrato, faseNumerada, fluxoSugerido, kb, parteElegivel, prazoMeses, validarAnexo, valoresDasTags,
  type Arquivo, type CampoCategoria, type Clausula, type ContratosData, type Modalidade, type Papel, type Parte, type TabelaId,
} from "./gestao-de-contratos/model.js";
import {
  Aviso, Bloco, ContratosShell, Dados, FolhaA4, ROTAS, Selo, TextoComTags, fichaDe, paginar, papelDe,
} from "./gestao-de-contratos/ui.js";
import { DrawerParte, formNovo } from "./ContratosPartes.js";

/* ------------------------------------------------------------------ */
/* Formulário                                                          */
/* ------------------------------------------------------------------ */

type SimNao = "sim" | "nao";
type Form = {
  modalidade: Modalidade;
  codigoManual: boolean;
  codigo: string;
  categoria: string;
  minutaId: string;
  anexo?: Arquivo;
  parteId: string;
  fluxo: string;
  gestor: string;
  objeto: string;
  regraRemuneracao: string;
  valor: string;
  forma: string;
  condicao: string;
  vencimento: string;
  exigeNf: SimNao;
  centroCusto: string;
  unidades: string[];
  dadosBancarios: string;
  criterioGlosa: string;
  inicio: string;
  fim: string;
  tipoPrazo: string;
  indice: string;
  mesBase: string;
  regraReajuste: string;
  avisoPrevio: string;
  saneamento: string;
  clausula7: SimNao;
  equipamentos: string;
  liminar: SimNao;
  processo: string;
  vara: string;
  campos: Record<string, string>;
};
type Campo =
  | "codigo" | "categoria" | "anexo"
  | "parteId" | "fluxo" | "gestor" | "objeto"
  | "regraRemuneracao" | "valor" | "vencimento" | "centroCusto" | "unidades"
  | "inicio" | "fim" | "avisoPrevio" | "saneamento";
type Erros = Partial<Record<Campo, string>>;

type Secao = { id: string; n: number; label: string; campos: Campo[] };
const SECOES: Secao[] = [
  { id: "sec-modalidade", n: 1, label: "Modalidade", campos: ["codigo", "categoria", "anexo"] },
  { id: "sec-partes", n: 2, label: "Partes", campos: ["parteId", "fluxo", "gestor", "objeto"] },
  { id: "sec-financeiro", n: 3, label: "Financeiro", campos: ["regraRemuneracao", "valor", "vencimento", "centroCusto", "unidades"] },
  { id: "sec-vigencia", n: 4, label: "Vigência e reajuste", campos: ["inicio", "fim", "avisoPrevio", "saneamento"] },
  { id: "sec-campos", n: 5, label: "Campos da categoria", campos: [] },
];
const ROTULO: Record<Campo, string> = {
  codigo: "Código do contrato", categoria: "Categoria", anexo: "Anexo",
  parteId: "Parte", fluxo: "Fluxo", gestor: "Gestor responsável", objeto: "Objeto",
  regraRemuneracao: "Regra de remuneração", valor: "Valor base", vencimento: "Dia do vencimento", centroCusto: "Centro de custo", unidades: "Unidades",
  inicio: "Data de início", fim: "Data de fim", avisoPrevio: "Aviso prévio", saneamento: "Prazo de saneamento",
};

/** As listas com "+ Nova/Novo" no formulário (FR-024). */
type Lista = Extract<TabelaId, "categoria" | "fluxo" | "forma_pagamento" | "condicao_pagamento" | "unidade" | "indice">;
const LISTA: Record<Lista, { nome: string; novo: "Nova" | "Novo" }> = {
  categoria: { nome: "Categoria", novo: "Nova" },
  fluxo: { nome: "Fluxo", novo: "Novo" },
  forma_pagamento: { nome: "Forma de pagamento", novo: "Nova" },
  condicao_pagamento: { nome: "Condição de pagamento", novo: "Nova" },
  unidade: { nome: "Unidade", novo: "Nova" },
  indice: { nome: "Índice", novo: "Novo" },
};

const SIM_NAO_NF = [{ label: "Sim (obrigatória para liberação no contas a pagar)", value: "sim" }, { label: "Não (recibo, folha CLT, imóvel)", value: "nao" }];
const SIM_NAO_C7 = [{ label: "Não", value: "nao" }, { label: "Sim (Consultoria PJ: 24 dias/ano)", value: "sim" }];

const numero = (v: string) => Number(v.replace(/\./g, "").replace(",", "."));
const decimal = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const somaAno = (iso: string) => (iso ? `${Number(iso.slice(0, 4)) + 1}${iso.slice(4)}` : "");
const datasOk = (f: Form) => Boolean(f.inicio && f.fim && f.fim >= f.inicio);

const minutaDa = (data: ContratosData, categoria: string) => data.minutas.find((m) => m.status === "vigente" && m.categoria === categoria);

/** Ao escolher a parte: código e nome, fluxo sugerido, forma, condição e liminar (RN-027). */
function preencherParte(f: Form, p: Parte): Form {
  return {
    ...f,
    parteId: p.id,
    fluxo: fluxoSugerido(p).detalhe,
    forma: p.formaPagamento || f.forma,
    condicao: p.condicaoPagamento || f.condicao,
    dadosBancarios: f.dadosBancarios || p.banco || "",
    ...(p.subtipo === "liminar" && { liminar: "sim" as const, processo: p.extras.Processo ?? "", vara: p.extras.Vara ?? "" }),
  };
}

/** O estado de abertura de cada cenário (controles `modalidade` e `estado`). */
function inicial(data: ContratosData, modalidade: Modalidade, estado: string): Form {
  const P = PADROES_CONTRATO;
  // Valores padrão da RN-026: o formulário já abre com eles.
  const vazio: Form = {
    modalidade, codigoManual: false, codigo: "", categoria: "", minutaId: "",
    parteId: "", fluxo: "", gestor: "", objeto: "",
    regraRemuneracao: "", valor: decimal(P.valor), forma: P.formaPagamento, condicao: P.condicaoPagamento, vencimento: String(P.vencimentoDia),
    exigeNf: P.exigeNf ? "sim" : "nao", centroCusto: "", unidades: [], dadosBancarios: "", criterioGlosa: "",
    inicio: "", fim: "", tipoPrazo: "", indice: P.indice, mesBase: P.mesBase, regraReajuste: "",
    avisoPrevio: String(P.avisoPrevioDias), saneamento: String(P.prazoSaneamentoDias), clausula7: P.clausulaIndisponibilidade ? "sim" : "nao", equipamentos: "",
    liminar: P.liminar ? "sim" : "nao", processo: "", vara: "", campos: {},
  };
  if (estado === "vazio") return vazio;
  const parte = (id: string) => data.partes.find((p) => p.id === id)!;
  const com = (categoria: string, parteId: string, extra: Partial<Form>) =>
    ({ ...preencherParte({ ...vazio, categoria, minutaId: minutaDa(data, categoria)?.id ?? "" }, parte(parteId)), ...extra });

  if (estado === "liminar") {
    return com("Paciente Particular", "p5", {
      gestor: "Jurídico", objeto: "terapia ABA intensiva determinada por decisão liminar (renovação)",
      centroCusto: "203 - Receitas Judiciais", regraRemuneracao: "Valor fixo mensal conforme decisão", valor: "15.600,00", exigeNf: "nao",
      anexo: { nome: "decisao-liminar-renovacao.pdf", tamanho: 412_000 },
      unidades: ["Unidade Jardim"], inicio: "2027-02-01", fim: "2027-07-31", mesBase: "Fevereiro",
    });
  }
  const base =
    modalidade === "adesao"
      ? com("PJ Assistencial", "p10", {
          gestor: "Coordenação de Terapias", objeto: "prestação de serviços de fonoaudiologia (linguagem) na Unidade Girassol",
          centroCusto: "101 - Clínica & Terapias", regraRemuneracao: "Valor hora (R$ 110/h)", valor: "7.400,00", vencimento: "15", clausula7: "sim",
          campos: { "Conselho de Classe Profissional": "CRFa-3 9876", "Carga Horária Semanal Alocada": "16h / semana" },
        })
      : com("TI / Software / SaaS", "p8", {
          gestor: "Tecnologia da Informação", objeto: "módulo de teleatendimento do prontuário em nuvem",
          centroCusto: "301 - TI & Sistemas", regraRemuneracao: "Mensalidade fixa por licença", valor: "4.900,00",
        });
  if (estado === "erros") {
    return { ...base, valor: "-500,00", vencimento: "35", inicio: "2026-09-01", fim: "2026-08-01", unidades: [] };
  }
  const completo: Form = { ...base, unidades: ["Unidade Girassol"], inicio: "2026-11-01", fim: "2027-10-31", mesBase: "Novembro", tipoPrazo: "Determinado (12m)" };
  if (estado === "duplicado") return { ...completo, codigoManual: true, codigo: "CTR-2026-0006" };
  if (estado === "salvo") return completo;
  return base;
}

/** RN-026: obrigatórios e validações, com mensagem por campo. */
function validar(data: ContratosData, partes: Parte[], f: Form): Erros {
  const e: Erros = {};
  const cod = f.codigo.trim().toUpperCase();
  if (f.codigoManual && cod && data.contratos.some((c) => c.id === cod)) e.codigo = `O código de contrato '${cod}' já existe no sistema.`;
  if (!f.categoria) e.categoria = "Escolha a categoria.";
  if (f.anexo) {
    const erro = validarAnexo(f.anexo);
    if (erro) e.anexo = erro;
  }
  const parte = partes.find((p) => p.id === f.parteId);
  if (!f.parteId) e.parteId = "Escolha a parte.";
  else if (!parte || !parteElegivel(parte)) e.parteId = "A parte não existe entre os clientes ativos e fornecedores homologados.";
  if (!f.fluxo) e.fluxo = "Escolha o fluxo.";
  if (!f.gestor.trim()) e.gestor = "Informe o gestor responsável.";
  if (!f.objeto.trim()) e.objeto = "Descreva o objeto do contrato.";
  if (!f.regraRemuneracao.trim()) e.regraRemuneracao = "Informe a regra de remuneração.";
  if (f.valor.trim()) {
    if (Number.isNaN(numero(f.valor))) e.valor = "Use só números, como 7.400,00.";
    else if (numero(f.valor) < 0) e.valor = "O valor não pode ser negativo.";
  }
  if (f.vencimento.trim()) {
    const dia = Number(f.vencimento);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) e.vencimento = "O dia de vencimento deve estar entre 1 e 31.";
  }
  if (!f.centroCusto.trim()) e.centroCusto = "Informe o centro de custo.";
  if (f.unidades.length === 0) e.unidades = "Informe pelo menos uma unidade.";
  if (!f.inicio) e.inicio = "Informe a data de início.";
  if (!f.fim) e.fim = "Informe a data de fim.";
  else if (f.inicio && f.fim < f.inicio) e.fim = `A data de fim deve ser igual ou posterior à de início (${br(f.inicio)}).`;
  if (f.avisoPrevio.trim() && !(Number.isInteger(Number(f.avisoPrevio)) && Number(f.avisoPrevio) >= 0)) e.avisoPrevio = "Use um número de dias.";
  if (f.saneamento.trim() && !(Number.isInteger(Number(f.saneamento)) && Number(f.saneamento) >= 0)) e.saneamento = "Use um número de dias.";
  return e;
}

/** O que o formulário vira ao gravar: campos em branco recebem o padrão da RN-026. */
function gravavel(f: Form) {
  const P = PADROES_CONTRATO;
  const valor = f.valor.trim() ? numero(f.valor) : P.valor;
  return {
    valor,
    formaPagamento: f.forma || P.formaPagamento,
    condicaoPagamento: f.condicao || P.condicaoPagamento,
    vencimentoDia: f.vencimento.trim() ? Number(f.vencimento) : P.vencimentoDia,
    indice: f.indice || P.indice,
    mesBase: f.mesBase || P.mesBase,
    avisoPrevioDias: f.avisoPrevio.trim() ? Number(f.avisoPrevio) : P.avisoPrevioDias,
    prazoSaneamentoDias: f.saneamento.trim() ? Number(f.saneamento) : P.prazoSaneamentoDias,
    padroes: [
      !f.valor.trim() && `Valor base ${brl(P.valor)}`,
      !f.forma && `Forma ${P.formaPagamento}`,
      !f.condicao && `Condição "${P.condicaoPagamento}"`,
      !f.vencimento.trim() && `Vencimento dia ${P.vencimentoDia}`,
      !f.indice && `Índice ${P.indice}`,
      !f.avisoPrevio.trim() && `Aviso prévio ${P.avisoPrevioDias} dias`,
      !f.saneamento.trim() && `Saneamento ${P.prazoSaneamentoDias} dias`,
    ].filter(Boolean) as string[],
  };
}

/**
 * Valores das tags (RN-030) com os dados do formulário. O que ainda não foi
 * preenchido (parte, datas, objeto) fica como tag no texto, em roxo.
 */
function valoresDoForm(f: Form, parte?: Parte) {
  const g = gravavel(f);
  const ok = datasOk(f);
  const v = valoresDasTags(
    { inicio: ok ? f.inicio : "2000-01-01", fim: ok ? f.fim : "2000-12-31", valor: g.valor, vencimentoDia: g.vencimentoDia, indice: g.indice, formaPagamento: g.formaPagamento, objeto: f.objeto.trim(), gestor: f.gestor.trim(), avisoPrevioDias: g.avisoPrevioDias },
    parte,
  );
  const sem = [
    ...(ok ? [] : ["DATA_INICIO_VIGENCIA", "DATA_FIM_VIGENCIA", "PRAZO_MESES", "VALOR_GLOBAL", "VALOR_GLOBAL_EXTENSO"]),
    ...(parte ? [] : ["CONTRATADA_NOME_RAZAO", "CONTRATADA_DOC_FEDERAL", "CONTRATADA_ENDERECO", "CONTRATADA_REPRESENTANTE", "CONTRATADA_EMAIL"]),
    ...(f.objeto.trim() ? [] : ["OBJETO_DETALHADO"]),
  ];
  for (const k of sem) delete v[k];
  return v;
}

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

export function ContratosNovo({ context }: ScreenProps) {
  const papel = papelDe(context, "solicitante");
  return (
    <ContratosShell
      context={context}
      secao="novo"
      titulo="Novo Contrato"
      subtitulo="O contrato nasce em Elaboração, v1.0, e só vai para assinatura depois de aprovado."
      foco={{ voltar: ROTAS.carteira, rotuloVoltar: "Voltar para a carteira" }}
    >
      {(data) => <Novo key={JSON.stringify(context.controls)} data={data} controls={context.controls} papel={papel} navigate={context.navigate} />}
    </ContratosShell>
  );
}

type Criado = { codigo: string; f: Form; clausulas: Clausula[]; padroes: string[] };

function Novo({ data, controls, papel, navigate }: { data: ContratosData; controls: Record<string, string>; papel: Papel; navigate: ScreenProps["context"]["navigate"] }) {
  const modalidadeInicial: Modalidade = controls.modalidade && controls.modalidade in MODALIDADE ? (controls.modalidade as Modalidade) : "adesao";
  const estado = controls.estado ?? "inicial";
  const [f, setF] = useState<Form>(() => inicial(data, modalidadeInicial, estado));
  const [enviado, setEnviado] = useState(estado === "erros" || estado === "duplicado");
  const [partes, setPartes] = useState(data.partes);
  const [opcoes, setOpcoes] = useState<Record<Lista, string[]>>(() => {
    const o = {} as Record<Lista, string[]>;
    for (const k of Object.keys(LISTA) as Lista[]) o[k] = data.tabelas[k].filter((x) => x.ativo).map((x) => x.descricao);
    return o;
  });
  const [preview, setPreview] = useState(false);
  // O cenário pode abrir o cadastro rápido de parte já aberto.
  const [drawerParte, setDrawerParte] = useState(controls.parte === "rapido" ? 1 : 0);
  const [nova, setNova] = useState<{ lista: Lista; descricao: string; erro?: string } | null>(null);

  const erros: Erros = enviado ? validar(data, partes, f) : {};
  const nErros = Object.keys(erros).length;
  const up = (patch: Partial<Form>) => setF((s) => ({ ...s, ...patch }));
  const err = (k: Campo) => (erros[k] ? [erros[k]!] : []);

  const elegiveis = partes.filter(parteElegivel);
  const foraDaLista = partes.length - elegiveis.length;
  const parte = partes.find((p) => p.id === f.parteId);
  const minuta = data.minutas.find((m) => m.id === f.minutaId);
  const vigentes = data.minutas.filter((m) => m.status === "vigente");
  const camposCat: CampoCategoria[] = f.categoria ? data.camposCategoria[f.categoria] ?? [] : [];
  const codigoDigitado = f.codigo.trim().toUpperCase();
  const codigo = f.codigoManual && codigoDigitado ? codigoDigitado : data.proximoCodigo;
  /** Exatamente as cláusulas que serão gravadas, já com as tags resolvidas (FR-022). */
  const clausulas = clausulasDoContrato(minuta, valoresDoForm(f, parte));

  const criadoInicial = (): Criado | null => {
    if (estado !== "salvo") return null;
    const p = data.partes.find((x) => x.id === f.parteId);
    const m = data.minutas.find((x) => x.id === f.minutaId);
    return { codigo: data.proximoCodigo, f, clausulas: f.modalidade === "adesao" ? clausulasDoContrato(m, valoresDoForm(f, p)) : [], padroes: gravavel(f).padroes };
  };
  const [criado, setCriado] = useState<Criado | null>(criadoInicial);

  const trocarCategoria = (categoria: string) => up({ categoria, minutaId: minutaDa(data, categoria)?.id ?? "", campos: {} });

  /** Cadastra a opção na tabela de apoio (estado local) e já a seleciona no campo. */
  const criarOpcao = (lista: Lista, descricao: string) => {
    setOpcoes((o) => ({ ...o, [lista]: [...o[lista], descricao] }));
    if (lista === "categoria") trocarCategoria(descricao);
    else if (lista === "fluxo") up({ fluxo: descricao });
    else if (lista === "forma_pagamento") up({ forma: descricao });
    else if (lista === "condicao_pagamento") up({ condicao: descricao });
    else if (lista === "indice") up({ indice: descricao });
    else setF((s) => ({ ...s, unidades: [...s.unidades, descricao] }));
    showToast({ type: "success", title: `${LISTA[lista].nome} ${LISTA[lista].novo === "Novo" ? "cadastrado" : "cadastrada"}`, content: `"${descricao}" já está selecionada e aparece em Tabelas de Apoio.`, closeTime: 4000 });
  };
  const gravarNova = () => {
    if (!nova) return;
    const d = nova.descricao.trim();
    if (!d) return setNova({ ...nova, erro: "Descrição obrigatória" });
    if (opcoes[nova.lista].some((o) => o.toLowerCase() === d.toLowerCase())) return setNova({ ...nova, erro: `"${d}" já existe na lista.` });
    criarOpcao(nova.lista, d);
    setNova(null);
  };
  /** Botão "+ Nova/Novo" ao lado do rótulo do campo (FR-024). */
  const comNova = (lista: Lista, campo: ReactNode) => (
    <div className="relative">
      <button type="button" className="absolute right-0 top-0 z-10 text-sm/4 font-bold text-brand-blue hover:underline" onClick={() => setNova({ lista, descricao: "" })}>
        <Icon name="fa-plus" className="mr-1" />
        {LISTA[lista].novo}
      </button>
      {campo}
    </div>
  );
  /** Combobox criável com o "+ Nova/Novo" ao lado. */
  const combo = (lista: Lista, id: string, label: string, valor: string, onChange: (v: string) => void, erro: string[] = []) =>
    comNova(
      lista,
      <ComboboxCriavel id={id} label={label} value={valor} options={opcoes[lista].includes(valor) || !valor ? opcoes[lista] : [...opcoes[lista], valor]} onChange={onChange} onCriar={(d) => criarOpcao(lista, d)} errors={erro} artigo={LISTA[lista].novo === "Novo" ? "o" : "a"} />,
    );

  const salvar = () => {
    setEnviado(true);
    const e = validar(data, partes, f);
    if (Object.keys(e).length) {
      const primeira = SECOES.find((s) => s.campos.some((c) => e[c]));
      if (primeira) document.getElementById(primeira.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // Só aqui o código é reservado (FR-002): com erro, nenhum número é consumido.
    setCriado({ codigo, f: { ...f, codigo: codigoDigitado }, clausulas: f.modalidade === "adesao" ? clausulas : [], padroes: gravavel(f).padroes });
    showToast({ type: "success", title: "Contrato criado em Elaboração", content: `${codigo} v1.0 · checklist do dossiê pendente.`, closeTime: 5000 });
  };

  if (criado) {
    return (
      <Resultado
        data={data}
        partes={partes}
        criado={criado}
        navigate={navigate}
        outro={() => { setCriado(null); setF(inicial(data, f.modalidade, "vazio")); setEnviado(false); }}
      />
    );
  }

  const g = gravavel(f);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 pb-24 lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Índice das seções */}
      <nav aria-label="Seções do formulário" className="hidden lg:block">
        <ol className="sticky top-28 space-y-1 rounded-2xl bg-white p-3 shadow-main">
          {SECOES.map((s) => {
            const n = s.campos.filter((c) => erros[c]).length;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-brand-purple-dark/70 hover:bg-brand-purple-dark/5 hover:text-brand-blue-dark"
                >
                  <span className={cx("flex h-6 w-6 items-center justify-center rounded-full text-xs", n ? "bg-red-light text-red" : "bg-brand-blue/20 text-brand-blue-dark")}>{s.n}</span>
                  <span className="flex-1">{s.label}</span>
                  {n > 0 && <span className="rounded-full bg-red px-1.5 text-xs text-white tabular-nums">{n}</span>}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="min-w-0 space-y-6">
        {nErros > 0 && (
          <Aviso tom="risco" titulo={`Corrija ${nErros} campo${nErros === 1 ? "" : "s"}`}>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {SECOES.flatMap((s) => s.campos.filter((c) => erros[c]).map((c) => (
                <li key={c}>
                  <button type="button" className="font-bold text-red-dark underline" onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                    {ROTULO[c]}
                  </button>
                  : {erros[c]}
                </li>
              )))}
            </ul>
            <p className="mt-2 text-sm">Nada foi gravado e nenhum código foi consumido.</p>
          </Aviso>
        )}

        {/* 1. Modalidade */}
        <Bloco id="sec-modalidade" titulo="1. Modalidade" icone="fa-file-signature" className="scroll-mt-28">
          {/* `radio_cards` lado a lado e sem o cartão de fora: o wrapper só
              reorganiza o contêiner do componente, as opções ficam iguais. */}
          <div className="[&>#novo-modalidade]:grid [&>#novo-modalidade]:grid-cols-1 md:[&>#novo-modalidade]:grid-cols-3 [&>#novo-modalidade]:gap-3 [&>#novo-modalidade]:rounded-none [&>#novo-modalidade]:border-0 [&>#novo-modalidade]:bg-transparent [&>#novo-modalidade]:p-0 [&>#novo-modalidade>*]:m-0!">
          <RadioCards
            id="novo-modalidade"
            value={f.modalidade}
            onChange={(v) => up({ modalidade: v as Modalidade })}
            option={[
              { id: "adesao", title: "Adesão (Minuta Interna)", icon: "fa-file-lines fa-fw", subtitle: "Nasce da minuta padrão vigente da categoria." },
              { id: "corporativo", title: "Corporativo (Upload Externo)", icon: "fa-building fa-fw", subtitle: "Documento negociado fora, enviado por upload (Fluxo Invertido)." },
              { id: "especifico", title: "Específico (Aluguel/Bancos)", icon: "fa-file-pen fa-fw", subtitle: "Caso único (locação, banco, liminar), enviado por upload (Fluxo Invertido)." },
            ]}
          />
          </div>

          {/* Código previsto (FR-001, FR-003, FR-023): consultar não consome o número. */}
          <div className="space-y-3 rounded-xl bg-brand-purple-dark/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-brand-purple-dark/60">Código previsto</span>
              <span className="text-lg font-extrabold text-brand-purple-dark">{codigo}</span>
              {f.codigoManual ? <Tag item="Manual / Legado" variant="orange" leftIcon="fa-keyboard" /> : <Tag item="Automático" variant="light-blue" leftIcon="fa-wand-magic-sparkles" />}
              <span className="text-sm font-semibold text-brand-purple-dark/50">v1.0</span>
              {!f.codigoManual && (
                <Button
                  variant="ghost"
                  size="medium"
                  leftIcon="fa-rotate"
                  className="ml-auto"
                  onClick={() => showToast({ type: "info", title: "Previsão atualizada", content: `Próximo código: ${data.proximoCodigo}. Consultar não consome o número; ele só é reservado ao gravar.`, closeTime: 4000 })}
                >
                  Atualizar
                </Button>
              )}
            </div>
            <Input type="checkbox" id="novo-codigo-manual" label="Código legado (Migração)" checked={f.codigoManual} onChange={(e: ChangeEvent<HTMLInputElement>) => up({ codigoManual: e.target.checked, codigo: "" })} />
            {f.codigoManual && (
              <Input
                id="novo-codigo"
                label="Código do contrato (manual / legado)"
                placeholder="CTR-2024-0017"
                value={f.codigo}
                onChange={(e) => up({ codigo: e.target.value.toUpperCase() })}
                errors={err("codigo")}
              />
            )}
            {f.codigoManual && !erros.codigo && (
              <p className="text-xs text-brand-purple-dark/60">Gravado em maiúsculas e sem espaços nas pontas. Em branco, vale o código automático. Se o número for maior que o último sequencial, a numeração automática continua a partir dele.</p>
            )}
          </div>

          <FormGrid variant="small" className="mt-0! gap-y-8 pb-3">
            {combo("categoria", "novo-categoria", "Categoria *", f.categoria, trocarCategoria, err("categoria"))}
          </FormGrid>

          {f.modalidade === "adesao" ? (
            <div className="space-y-4">
              <Input
                type="select"
                id="novo-minuta"
                label="Minuta padrão de origem"
                value={f.minutaId}
                options={[
                  { label: "Nenhuma minuta específica (9 cláusulas padrão)", value: "" },
                  ...vigentes.map((m) => ({ label: `${m.codigo} ${m.versao} · ${m.titulo} (${m.categoria})`, value: m.id })),
                ]}
                onChange={(v) => up({ minutaId: v ?? "" })}
              />
              {f.categoria && !minutaDa(data, f.categoria) && (
                <Aviso tom="atencao" titulo={`Sem minuta vigente para ${f.categoria}`}>
                  Sem minuta, o contrato nasce com as 9 cláusulas padrão preenchidas com os dados do contrato. Você também pode escolher outra minuta vigente ou mudar para Corporativo/Específico e enviar o documento.
                </Aviso>
              )}
              <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Icon name="fa-file-lines" className="text-brand-blue-dark" />
                  <span className="font-bold text-brand-purple-dark">{minuta ? minuta.titulo : "Cláusulas padrão (sem minuta)"}</span>
                  {minuta && minuta.categoria === f.categoria && <Tag item="Vigente da categoria" variant="green" leftIcon="fa-check" />}
                </div>
                {minuta ? (
                  <Dados
                    colunas={3}
                    itens={[
                      ["Código", minuta.codigo],
                      ["Versão", minuta.versao],
                      ["Categoria", minuta.categoria],
                      ["Cláusulas", String(minuta.clausulas.length)],
                      ["Revisor", minuta.revisor],
                      ["Data", br(minuta.data)],
                    ]}
                  />
                ) : (
                  <p className="text-sm text-brand-purple-dark/70">{clausulas.length} cláusulas padrão: preâmbulo, objeto, vigência, preço, reajuste, obrigações, proteção de dados, rescisão e foro.</p>
                )}
                <div className="flex justify-end">
                  <Button variant="outline" size="medium" leftIcon="fa-eye" onClick={() => setPreview(true)}>Pré-visualizar Cláusulas</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="flex items-center gap-2 text-sm/4 font-bold text-brand-blue">
                  Fluxo Invertido: documento do contrato <Tag item={MODALIDADE[f.modalidade].label} variant={MODALIDADE[f.modalidade].variant} />
                </p>
                <p className="mt-1 text-sm text-brand-purple-dark/70">
                  No {MODALIDADE[f.modalidade].label.toLowerCase()} o texto vem negociado de fora: a governança (aprovação, versão, dossiê) incide sobre este arquivo, não sobre uma minuta nossa. Esta modalidade não gera cláusulas.
                </p>
              </div>
              <Anexo anexo={f.anexo} onChange={(anexo) => up({ anexo })} erro={erros.anexo} />
              <p className="text-xs text-brand-purple-dark/60">
                <Icon name="fa-circle-info" className="mr-1" />O anexo é opcional por enquanto (decisão pendente: se passa a ser obrigatório no Corporativo e no Específico).
              </p>
            </div>
          )}
        </Bloco>

        {/* 2. Partes */}
        <Bloco
          id="sec-partes"
          titulo="2. Partes"
          icone="fa-handshake"
          className="scroll-mt-28"
          acoes={<Button variant="tint" size="medium" leftIcon="fa-user-plus" onClick={() => setDrawerParte((k) => k + 1)}>Cadastrar Nova Parte</Button>}
        >
          <Input
            type="select"
            id="novo-parte"
            label="Parte homologada *"
            prompt="Selecione o cliente ou fornecedor"
            value={f.parteId}
            options={[
              { group: "Clientes ativos", items: elegiveis.filter((p) => p.tipo === "cliente").map((p) => ({ label: `${p.codigo} · ${p.nome}`, value: p.id })) },
              { group: "Fornecedores homologados", items: elegiveis.filter((p) => p.tipo === "fornecedor").map((p) => ({ label: `${p.codigo} · ${p.nome}`, value: p.id })) },
            ]}
            onChange={(v) => { const p = partes.find((x) => x.id === v); setF((s) => (p ? preencherParte(s, p) : { ...s, parteId: "" })); }}
            errors={err("parteId")}
          />
          <p className="text-sm text-brand-purple-dark/60">
            Só clientes ativos e fornecedores homologados.{foraDaLista > 0 && ` ${foraDaLista} parte${foraDaLista === 1 ? "" : "s"} fora da lista (inativa ou não homologada): ajuste em Partes.`}
          </p>
          {parte && (
            <div className="rounded-xl bg-brand-purple-dark/5 p-4">
              <Dados
                colunas={4}
                itens={[
                  ["Código da parte", <span className="font-bold">{parte.codigo}</span>],
                  ["Nome / razão social", parte.nome],
                  ["Documento", parte.documento],
                  ["Tipo", <span className="inline-flex flex-wrap items-center gap-1">{SUBTIPO[parte.subtipo]}{parte.subtipo === "liminar" && <Tag item="Liminar" variant="red" leftIcon="fa-gavel" />}</span>],
                ]}
              />
            </div>
          )}
          <div>
            {parte && <p className="mb-4 text-sm text-brand-purple-dark/60">Fluxo, forma e condição de pagamento{parte.subtipo === "liminar" ? " e dados da liminar" : ""} vieram do cadastro de {parte.codigo}. Mude aqui se este contrato for diferente.</p>}
            <FormGrid className="mt-0! gap-y-8 pb-3">
              {combo("fluxo", "novo-fluxo", "Fluxo da operação *", f.fluxo, (v) => up({ fluxo: v }), err("fluxo"))}
              <Input id="novo-gestor" label="Gestor interno responsável *" placeholder="Ex.: Supervisão Clínica" value={f.gestor} onChange={(e) => up({ gestor: e.target.value })} errors={err("gestor")} />
            </FormGrid>
          </div>
          <Input type="textarea" id="novo-objeto" label="Objeto e escopo do contrato *" rows={2} placeholder="Descreva as obrigações, finalidade e escopo contratual" value={f.objeto} onChange={(e) => up({ objeto: e.target.value })} errors={err("objeto")} />
        </Bloco>

        {/* 3. Financeiro */}
        <Bloco id="sec-financeiro" titulo="3. Financeiro" icone="fa-money-bill-wave" className="scroll-mt-28">
          <FormGrid className="mt-0! gap-y-8 pb-3">
            <Input id="novo-regra" label="Regra de remuneração *" placeholder="Ex.: R$ 100/h (medição) ou mensalidade fixa" value={f.regraRemuneracao} onChange={(e) => up({ regraRemuneracao: e.target.value })} errors={err("regraRemuneracao")} />
            <Input id="novo-valor" label="Valor base (R$)" placeholder="0,00" hint="R$/mês" inputMode="decimal" value={f.valor} onChange={(e) => up({ valor: e.target.value })} errors={err("valor")} />
            {combo("forma_pagamento", "novo-forma", "Forma de pagamento", f.forma, (v) => up({ forma: v }))}
            {combo("condicao_pagamento", "novo-condicao", "Condição de pagamento", f.condicao, (v) => up({ condicao: v }))}
            <Input type="number" id="novo-vencimento" label="Dia do vencimento" placeholder="1 a 31" min={1} max={31} value={f.vencimento} onChange={(e) => up({ vencimento: e.target.value })} errors={err("vencimento")} />
            <Input type="select" id="novo-nf" label="Exige nota fiscal (NFS-e)?" value={f.exigeNf} options={SIM_NAO_NF} onChange={(v) => up({ exigeNf: (v as SimNao) ?? "sim" })} />
            <Input id="novo-centro" label="Centro de custo *" placeholder="Ex.: 101 - Clínica & Terapias" value={f.centroCusto} onChange={(e) => up({ centroCusto: e.target.value })} errors={err("centroCusto")} />
          </FormGrid>
          <div className="pb-3">
            {comNova(
              "unidade",
              <MultiComboboxCriavel
                id="novo-unidades"
                label="Unidades alocadas * (uma ou mais)"
                options={opcoes.unidade}
                value={f.unidades}
                onChange={(v) => up({ unidades: v })}
                onCriar={(d) => criarOpcao("unidade", d)}
                errors={erros.unidades ? [erros.unidades] : []}
              />,
            )}
          </div>
          <FormGrid className="mt-0! gap-y-8 pb-3">
            <Input id="novo-banco" label="Dados bancários de liquidação" placeholder="Banco · agência · conta ou chave PIX" value={f.dadosBancarios} onChange={(e) => up({ dadosBancarios: e.target.value })} />
            <Input id="novo-glosa" label="Critério de glosa / desconto" placeholder="Ex.: falta sem reposição desconta a sessão" value={f.criterioGlosa} onChange={(e) => up({ criterioGlosa: e.target.value })} />
          </FormGrid>
        </Bloco>

        {/* 4. Vigência e reajuste */}
        <Bloco id="sec-vigencia" titulo="4. Vigência e reajuste" icone="fa-calendar-range" className="scroll-mt-28">
          <FormGrid className="mt-0! gap-y-8 pb-3">
            <Input type="date" id="novo-inicio" label="Data de início *" value={f.inicio} onChange={(e) => up({ inicio: e.target.value })} errors={err("inicio")} />
            <Input type="date" id="novo-fim" label="Data de fim *" value={f.fim} onChange={(e) => up({ fim: e.target.value })} errors={err("fim")} />
            <Input id="novo-tipo-prazo" label="Tipo de prazo" placeholder={datasOk(f) ? `Determinado (${prazoMeses(f.inicio, f.fim)}m)` : "Ex.: Determinado (12m)"} value={f.tipoPrazo} onChange={(e) => up({ tipoPrazo: e.target.value })} />
            {combo("indice", "novo-indice", "Índice de reajuste", f.indice, (v) => up({ indice: v }))}
            <Input type="select" id="novo-mes-base" label="Mês-base do reajuste" value={f.mesBase} options={MESES.map((m) => ({ label: m, value: m }))} onChange={(v) => up({ mesBase: v ?? PADROES_CONTRATO.mesBase })} />
            <div>
              <p className="text-sm/4 font-bold text-brand-blue">Próxima data-base</p>
              <p className="mt-2 flex h-12 items-center rounded-lg bg-brand-purple-dark/5 px-4 text-brand-purple-dark/80">
                {f.inicio ? br(somaAno(f.inicio)) : "Calculada do início"}
              </p>
            </div>
          </FormGrid>
          {datasOk(f) && (
            <p className="text-sm text-brand-purple-dark/60">Prazo de {prazoMeses(f.inicio, f.fim)} meses; reajuste anual pelo {g.indice} a partir de {br(somaAno(f.inicio))}.</p>
          )}
          <Input type="textarea" id="novo-regra-reajuste" label="Regra de reajuste específica" rows={2} placeholder="Só se o contrato fugir do índice anual (ex.: repactuação pela CCT da categoria)" value={f.regraReajuste} onChange={(e) => up({ regraReajuste: e.target.value })} />
          <FormGrid className="mt-0! gap-y-8 pb-3">
            <Input type="number" id="novo-aviso" label="Aviso prévio (dias)" min={0} value={f.avisoPrevio} onChange={(e) => up({ avisoPrevio: e.target.value })} errors={err("avisoPrevio")} />
            <Input type="number" id="novo-saneamento" label="Prazo de saneamento de inadimplemento (dias)" min={0} value={f.saneamento} onChange={(e) => up({ saneamento: e.target.value })} errors={err("saneamento")} />
            <Input type="select" id="novo-clausula7" label="Cláusula 7ª (indisponibilidade / recesso)" value={f.clausula7} options={SIM_NAO_C7} onChange={(v) => up({ clausula7: (v as SimNao) ?? "nao" })} />
          </FormGrid>
          <Input type="textarea" id="novo-equipamentos" label="Equipamentos cedidos" rows={2} placeholder="Ex.: notebook patrimônio 0412 e kit de materiais ABA" value={f.equipamentos} onChange={(e) => up({ equipamentos: e.target.value })} />

          {/* Origem judicial (FR-026): processo e vara opcionais; a liminar acrescenta um item ao dossiê. */}
          <div className="space-y-4">
            <RadioGroup
              label="Origem judicial / liminar"
              field={{ id: "novo-liminar", name: "liminar", value: f.liminar }}
              radio={[{ value: "nao", label: "Não (contratação regular)" }, { value: "sim", label: "Sim (decisão liminar / mandado)" }]}
              onChange={(e) => up({ liminar: e.target.value as SimNao })}
            />
            {f.liminar === "sim" && (
              <>
                <FormGrid variant="small" className="mt-0! gap-y-8 pb-3">
                  <Input id="novo-processo" label="Nº do processo" placeholder="0000000-00.0000.0.00.0000" value={f.processo} onChange={(e) => up({ processo: e.target.value })} />
                  <Input id="novo-vara" label="Vara / juízo" placeholder="Ex.: 2ª Vara da Fazenda Pública" value={f.vara} onChange={(e) => up({ vara: e.target.value })} />
                </FormGrid>
                <p className="text-sm text-brand-purple-dark/60">
                  <Icon name="fa-gavel" className="mr-1" />O checklist do dossiê ganha o 4º item: Cópia da Decisão Judicial Liminar.
                </p>
              </>
            )}
          </div>
        </Bloco>

        {/* 5. Campos da categoria */}
        <Bloco id="sec-campos" titulo="5. Campos da categoria" icone="fa-list-check" className="scroll-mt-28">
          {!f.categoria ? (
            <p className="text-sm text-brand-purple-dark/60">Escolha a categoria para ver os campos extras dela.</p>
          ) : camposCat.length === 0 ? (
            <p className="text-sm text-brand-purple-dark/60">
              <Icon name="fa-circle-info" className="mr-1" />A categoria {f.categoria} não tem campos extras. O Administrador configura em Tabelas de Apoio.
            </p>
          ) : (
            <FormGrid variant="small" className="mt-0! gap-y-8 pb-3">
              {camposCat.map((c) => {
                const v = f.campos[c.rotulo] ?? "";
                const set = (x: string) => up({ campos: { ...f.campos, [c.rotulo]: x } });
                return (
                  <div key={c.id}>
                    {c.tipo === "lista" ? (
                      <Input type="select" id={`novo-campo-${c.id}`} label={c.rotulo} prompt="Selecione" value={v} options={(c.opcoes ?? []).map((o) => ({ label: o, value: o }))} onChange={(x) => set(x ?? "")} />
                    ) : (
                      <Input type={(c.tipo === "numero" ? "number" : c.tipo === "data" ? "date" : "text") as "text"} id={`novo-campo-${c.id}`} label={c.rotulo} placeholder={c.placeholder} value={v} onChange={(e: ChangeEvent<HTMLInputElement>) => set(e.target.value)} />
                    )}
                    {c.ajuda && <p className="mt-1 text-xs text-brand-purple-dark/60">{c.ajuda}</p>}
                  </div>
                );
              })}
            </FormGrid>
          )}
        </Bloco>

        {/* Rodapé fixo na parte de baixo da tela (página sem menu lateral, então ocupa a largura toda). */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-purple-dark/10 bg-white px-4 lg:px-8 py-4 shadow-main">
          <div className="mx-auto max-w-6xl flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="ghost" onClick={() => navigate(ROTAS.carteira, { controls: {} })}>Cancelar</Button>
            <Button leftIcon="fa-floppy-disk" onClick={salvar}>Salvar & Iniciar Elaboração</Button>
          </div>
        </div>
      </div>

      <PreviaClausulas
        show={preview && f.modalidade === "adesao"}
        titulo={minuta ? `${minuta.codigo} ${minuta.versao} · Cláusulas` : "Cláusulas padrão"}
        cabecalho={`${minuta ? `${minuta.titulo} · ${minuta.codigo} ${minuta.versao}` : "Cláusulas padrão"} · ${codigo}`}
        clausulas={clausulas}
        onClose={() => setPreview(false)}
      >
        Estas {clausulas.length} cláusulas são gravadas no {codigo} v1.0 exatamente assim, com as tags já resolvidas pelos dados do contrato e da parte. O que ainda não foi preenchido aparece como tag em roxo.
      </PreviaClausulas>

      <Modal
        id="modal-nova-opcao"
        show={!!nova}
        onCancel={() => setNova(null)}
        title={nova ? `${LISTA[nova.lista].novo} ${LISTA[nova.lista].nome.toLowerCase()}` : ""}
        variant="extra_small"
      >
        {nova && (
          <div className="space-y-6">
            <Input
              id="nova-opcao-descricao"
              label="Descrição *"
              placeholder={`Nome d${LISTA[nova.lista].novo === "Novo" ? "o" : "a"} ${LISTA[nova.lista].nome.toLowerCase()}`}
              value={nova.descricao}
              onChange={(e) => setNova({ ...nova, descricao: e.target.value, erro: undefined })}
              errors={nova.erro ? [nova.erro] : []}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setNova(null)}>Cancelar</Button>
              <Button leftIcon="fa-floppy-disk" onClick={gravarNova}>Cadastrar</Button>
            </div>
          </div>
        )}
      </Modal>

      {drawerParte > 0 && (
        <DrawerParte
          key={drawerParte}
          show
          modo="rapido"
          trocarTipo
          permitido
          partes={partes}
          formas={opcoes.forma_pagamento}
          condicoes={opcoes.condicao_pagamento}
          inicial={formNovo(f.fluxo.startsWith("Receita") ? "cliente" : "fornecedor")}
          proximo={{ cliente: data.proximoCliente, fornecedor: data.proximoFornecedor }}
          papel={papel}
          onCancel={() => setDrawerParte(0)}
          onSave={(p, atualizou) => {
            setPartes((ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? p : x)) : [...ps, p]));
            setDrawerParte(0);
            if (parteElegivel(p)) setF((s) => preencherParte(s, p));
            showToast(
              parteElegivel(p)
                ? { type: "success", title: atualizou ? "Cadastro atualizado" : "Parte cadastrada", content: `${p.codigo} · ${p.nome} já está selecionada no contrato. Complete o cadastro depois em Partes.`, closeTime: 4000 }
                : { type: "info", title: "Parte cadastrada, mas não selecionada", content: `${p.codigo} está inativa ou não homologada. Ative/homologue em Partes para contratar.`, closeTime: 6000 },
            );
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resultado da gravação                                               */
/* ------------------------------------------------------------------ */

/**
 * O que o sistema grava em "Salvar & Iniciar Elaboração": estado inicial
 * (RN-025), versão v1.0 e marco de abertura (FR-030), cláusulas (FR-031) e
 * checklist do dossiê (FR-032).
 */
function Resultado({ data, partes, criado, navigate, outro }: { data: ContratosData; partes: Parte[]; criado: Criado; navigate: ScreenProps["context"]["navigate"]; outro: () => void }) {
  const [verClausulas, setVerClausulas] = useState(false);
  const c = criado.f;
  const m = data.minutas.find((x) => x.id === c.minutaId);
  const g = gravavel(c);
  const parte = partes.find((p) => p.id === c.parteId);
  const checklist = checklistInicial(criado.codigo, c.liminar === "sim");
  const adesao = c.modalidade === "adesao";
  const origem = adesao ? (m ? `${m.codigo} ${m.versao}` : "cláusulas padrão (sem minuta)") : c.anexo ? `upload ${c.anexo.nome}` : "upload (sem anexo)";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Bloco titulo={`${criado.codigo} criado`} icone="fa-circle-check">
        <Aviso tom="ok" titulo="Contrato criado em Elaboração, v1.0">
          O próximo passo é completar o checklist do dossiê e submeter para aprovação. A assinatura fica travada até a aprovação.
        </Aviso>
        <Dados
          itens={[
            ["Código", <span className="inline-flex items-center gap-2"><strong>{criado.codigo}</strong><Tag item={c.codigoManual && c.codigo ? "Manual / Legado" : "Automático"} variant={c.codigoManual && c.codigo ? "orange" : "light-blue"} /></span>],
            ["Modalidade", <Selo s={MODALIDADE[c.modalidade]} />],
            ["Categoria", c.categoria],
            ["Parte", parte ? `${parte.codigo} · ${parte.nome}` : "—"],
            ["Fluxo", c.fluxo],
            ["Gestor responsável", c.gestor],
            ["Valor base", `${brl(g.valor)} · ${c.regraRemuneracao}`],
            ["Pagamento", `${g.formaPagamento} · ${g.condicaoPagamento} · dia ${g.vencimentoDia}${c.exigeNf === "sim" ? " · exige NF" : ""}`],
            ["Centro de custo", c.centroCusto],
            ["Vigência", `${br(c.inicio)} a ${br(c.fim)} (${prazoMeses(c.inicio, c.fim)} meses)`],
            ["Reajuste", `${g.indice} · mês-base ${g.mesBase}`],
            ["Unidades", c.unidades.join(", ")],
            [adesao ? "Origem" : "Documento", adesao ? origem : c.anexo ? `${c.anexo.nome} (${kb(c.anexo.tamanho)})` : "Sem anexo"],
            ...(c.liminar === "sim" ? [["Origem judicial", [c.processo, c.vara].filter(Boolean).join(" · ") || "Liminar (processo e vara não informados)"] as [string, ReactNode]] : []),
          ]}
        />
        {criado.padroes.length > 0 && (
          <p className="text-sm text-brand-purple-dark/60">
            <Icon name="fa-circle-info" className="mr-1" />Valores padrão aplicados (RN-026): {criado.padroes.join(" · ")}.
          </p>
        )}
      </Bloco>

      <Bloco titulo="Estado inicial" icone="fa-flag">
        <Dados
          itens={[
            ["Status do contrato", <Selo s={STATUS.em_elaboracao} />],
            ["Workflow de aprovação", <Selo s={APROVACAO.elaboracao} />],
            ["Workflow de assinatura", <Selo s={ASSINATURA.bloqueada} />],
            ["Etapa BPM", faseNumerada("elaboracao")],
            ["Versão", "v1.0"],
            ["Checklist do dossiê", "Pendente de Documentos"],
          ]}
        />
      </Bloco>

      <Bloco titulo="Versão inicial e histórico" icone="fa-code-branch">
        <Dados
          itens={[
            ["Versão", "v1.0"],
            ["Fase", "Elaboração Inicial"],
            ["Motivo", "Abertura do Contrato"],
            ["Minuta de origem", adesao && m ? `${m.codigo} ${m.versao}` : "—"],
            ["Workflow", "Abertura · Em Elaboração"],
          ]}
        />
      </Bloco>

      <Bloco
        titulo={adesao ? `Cláusulas gravadas (${criado.clausulas.length})` : "Cláusulas"}
        icone="fa-list-ol"
        acoes={adesao ? <Button variant="outline" size="medium" leftIcon="fa-eye" onClick={() => setVerClausulas(true)}>Ver o texto</Button> : undefined}
      >
        {adesao ? (
          <ol className="grid gap-x-6 gap-y-1 text-sm text-brand-purple-dark md:grid-cols-2">
            {criado.clausulas.map((cl) => (
              <li key={cl.id} className="flex items-center gap-2" title="Obrigatória e não editada">
                <Icon name="fa-lock" className="text-brand-purple-dark/40" />
                {cl.titulo}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-brand-purple-dark/70">Nenhuma cláusula gerada: no {MODALIDADE[c.modalidade].label} o contrato é o documento enviado (Fluxo Invertido).</p>
        )}
      </Bloco>

      <Bloco titulo={`Checklist do dossiê (${checklist.length} itens)`} icone="fa-folder-open">
        <ul className="divide-y divide-brand-purple-dark/10">
          {checklist.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <span className="font-bold text-brand-purple-dark/60 tabular-nums">{i.codigo}</span>
              <span className="flex-1 font-semibold text-brand-purple-dark">{i.documento}</span>
              <span className="text-brand-purple-dark/60">{i.natureza}</span>
              <Selo s={CONFORMIDADE.pendente} />
            </li>
          ))}
        </ul>
      </Bloco>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="ghost" onClick={() => navigate(ROTAS.carteira, { controls: {} })}>Voltar à carteira</Button>
        <Button variant="outline" leftIcon="fa-plus" onClick={outro}>Criar outro</Button>
        <Button leftIcon="fa-arrow-up-right-from-square" onClick={() => navigate(fichaDe("CTR-2026-0006"), { controls: {} })} title="O protótipo não grava: abre um contrato real em Elaboração">
          Abrir a ficha (exemplo CTR-2026-0006)
        </Button>
      </div>

      {adesao && (
        <PreviaClausulas
          show={verClausulas}
          titulo={`${criado.codigo} v1.0 · Cláusulas`}
          cabecalho={`${criado.codigo} v1.0 · ${origem}`}
          clausulas={criado.clausulas}
          onClose={() => setVerClausulas(false)}
        >
          Cópia própria do contrato: as tags foram resolvidas na criação e as cláusulas não mudam se a minuta for revisada depois.
        </PreviaClausulas>
      )}
    </div>
  );
}

/** Folha A4 com as cláusulas (pré-visualização e resultado). */
function PreviaClausulas({ show, titulo, cabecalho, clausulas, onClose, children }: { show: boolean; titulo: string; cabecalho: string; clausulas: Clausula[]; onClose: () => void; children: ReactNode }) {
  return (
    <DrawerModal id="modal-clausulas" show={show} title={titulo} variant="large" onCancel={onClose}>
      <div className="space-y-4">
        <Aviso tom="info">{children}</Aviso>
        <FolhaA4
          cabecalho={cabecalho}
          paginas={paginar(clausulas, 4).map((pag) =>
            pag.map((cl) => (
              <section key={cl.id}>
                <h4 className="font-bold">{cl.titulo}</h4>
                <p><TextoComTags texto={cl.texto} /></p>
              </section>
            )),
          )}
        />
      </div>
    </DrawerModal>
  );
}

/** Anexo do contrato: PDF ou documento de texto, por clique ou arrasto (FR-028, RN-008). */
function Anexo({ anexo, onChange, erro }: { anexo?: Arquivo; onChange: (a?: Arquivo) => void; erro?: string }) {
  const [recusa, setRecusa] = useState<string | null>(null);
  if (anexo && !erro) return <FileItem variant="simplified" fileName={anexo.nome} size={anexo.tamanho} removeEvent={() => onChange(undefined)} />;
  return (
    <div>
      <FileUploader
        variant="simplified"
        upload={{ ref: "novo-anexo", name: "anexo", maxEntries: 1 }}
        onChange={(files) => {
          const file = files[0];
          if (!file) return;
          const a = { nome: file.name, tamanho: file.size };
          // O contrato é PDF ou documento de texto; o resto da RN-008 (25 MB) vem de validarAnexo.
          const motivo = !/\.(pdf|docx?)$/i.test(file.name) ? `"${file.name}" não é PDF nem documento de texto. Envie PDF, DOC ou DOCX.` : validarAnexo(a);
          setRecusa(motivo);
          if (!motivo) onChange(a);
        }}
      />
      <p className="mt-2 text-xs text-brand-purple-dark/60">PDF, DOC ou DOCX, até 25 MB. O nome e o tamanho aparecem aqui depois do envio.</p>
      {recusa && <FieldError message={recusa} />}
      {erro && !recusa && <FieldError message={erro} />}
    </div>
  );
}
