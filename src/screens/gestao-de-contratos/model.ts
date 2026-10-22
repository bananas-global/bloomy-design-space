/**
 * Gestão de Contratos — tipos, rótulos e regras compartilhadas pelas telas.
 *
 * Os quatro estados do contrato (aprovação, assinatura, status e fase) andam
 * juntos; as telas leem daqui o rótulo e a cor de cada um, para que o mesmo
 * status tenha a mesma cor em todo o módulo. As regras citam os IDs (FR-xxx,
 * RN-xxx) da especificação "Regras de Negócio e Funcionalidades".
 */
import { TODAY } from "../../components/today.js";
import type { TagVariant } from "../../components/Tag.js";

export { TODAY };

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type Modalidade = "adesao" | "corporativo" | "especifico";
export type Fluxo = "receita" | "despesa";
export type Fase = "elaboracao" | "validacao" | "aprovacao" | "assinatura" | "vigente" | "aditivos" | "encerramento";
export type Aprovacao = "elaboracao" | "em_aprovacao" | "reprovado" | "aprovado";
export type Assinatura = "bloqueada" | "pronto_coleta" | "em_assinatura" | "assinado";
export type Status = "em_elaboracao" | "em_aprovacao" | "reprovado" | "pronto_coleta" | "em_assinatura" | "vigente" | "encerrado";
export type Plataforma = "Clicksign" | "DocuSign" | "Gov.br" | "ICP-Brasil";
export type Faixa = "vencido" | "critico" | "alerta" | "regular";

export type Arquivo = { nome: string; tamanho: number };

/** Cláusula do contrato ou da minuta. `obrigatoria`: veio da minuta (RN-029). `editada`: alterada pelo usuário. */
export type Clausula = { id: string; titulo: string; texto: string; editada?: boolean; obrigatoria?: boolean };

/** Versão do contrato. `clausulas`: cópia integral do texto naquele momento (RN-011). */
export type Versao = { versao: string; data: string; fase: string; motivo: string; resumo: string; revisor: string; clausulas?: Clausula[] };

export type EventoTipo = "criacao" | "workflow" | "versao" | "aditivo" | "dossie" | "cobranca" | "erp" | "encerramento";
export type Evento = { id: string; data: string; tipo: EventoTipo; titulo: string; autor: string; detalhe?: string };

/** Registro do histórico de workflow: estado anterior, estado novo, parecer, usuário e papel (RN-071). */
export type RegistroWorkflow = { id: string; data: string; workflow: "aprovacao" | "assinatura" | "ciclo"; de: string; para: string; parecer?: string; usuario: string; papel: string };

/** Registro de auditoria: só inclusões, nunca alterado nem apagado (RN-066). */
export type RegistroAuditoria = { id: string; data: string; usuario: string; perfil: string; acao: string; detalhes: string };

export type OrigemAditivo = "manual" | "reajuste" | "adequacao";
export type Aditivo = {
  id: string;
  contratoId: string;
  /** `TA-NN/{contrato}` (RN-001, RN-006). */
  codigo: string;
  /** Ordinal dentro do contrato: o "Nº" de "Nº Termo Aditivo". */
  numero: number;
  origem: OrigemAditivo;
  tipo: string;
  data: string;
  novaVigencia?: string;
  novoValor?: number;
  valorAnterior?: number;
  motivo: string;
  impacto: string;
  aprovacao: Aprovacao;
  assinatura: Assinatura;
  /** Reajuste com valor diferente do calculado (RN-042). */
  ajusteManual?: { calculado: number; justificativa: string };
  arquivo?: Arquivo;
};

export type Contrato = {
  id: string;
  versao: string;
  modalidade: Modalidade;
  categoria: string;
  fluxo: Fluxo;
  /** "Despesa (Pessoal)" para CLT; senão o rótulo do fluxo (RN-027). */
  fluxoDetalhe?: string;
  parteId: string;
  objeto: string;
  status: Status;
  fase: Fase;
  aprovacao: Aprovacao;
  assinatura: Assinatura;
  /** Gestor interno responsável (obrigatório, RN-026). */
  gestor: string;
  centroCusto: string;
  /** Regra de remuneração, livre: "Valor fixo mensal", "Valor hora (R$ 110/h)" (RN-026). */
  regraRemuneracao: string;
  /** Valor base mensal. Ausente: "valor não informado". */
  valor?: number;
  formaPagamento?: string;
  condicaoPagamento?: string;
  vencimentoDia?: number;
  exigeNf: boolean;
  dadosBancarios?: string;
  criterioGlosa?: string;
  inicio: string;
  fim: string;
  tipoPrazo?: string;
  indice?: string;
  mesBase?: string;
  regraReajusteEspecifica?: string;
  /** Próxima data-base de reajuste (aniversário do início, RN-040). */
  dataBase?: string;
  ultimoReajuste?: { data: string; taxa: number; valorAnterior: number; manual?: boolean };
  avisoPrevioDias: number;
  prazoSaneamentoDias: number;
  /** Cláusula 7ª: recesso de PJ de até 24 dias por ano. */
  clausulaIndisponibilidade: boolean;
  /** Saldo de recesso do PJ: créditos e dias usados no ano (RN-023). */
  recesso?: { credito: number; usados: number };
  equipamentosCedidos?: string;
  unidades: string[];
  liminar?: { processo: string; vara: string };
  /** Código "Manual / Legado" quando veio de fora do sequencial. */
  codigoManual?: boolean;
  minuta?: { codigo: string; versao: string };
  arquivo?: Arquivo;
  camposCategoria?: Record<string, string>;
  clausulas?: Clausula[];
  versoes: Versao[];
  eventos: Evento[];
  workflow: RegistroWorkflow[];
  auditoria: RegistroAuditoria[];
  aprovador?: { nome: string; data: string; parecer: string };
  reprovacao?: { aprovador: string; data: string; motivo: string };
  envelope?: { plataforma: Plataforma; id: string; data: string };
  /** Data da conclusão da assinatura: fecho do PDF (FR-043). */
  assinaturaConcluida?: string;
  assinadoDigital?: boolean;
  /** CLT: fim do contrato de experiência. */
  experienciaAte?: string;
  encerramento?: { data: string; tipo: string; motivo: string; distrato?: Arquivo; origem: string };
};

export type ParteTipo = "cliente" | "fornecedor";
export type ParteSubtipo =
  | "operadora" | "particular_pj" | "corporativa" | "pf" | "liminar"
  | "fornecedor_pj" | "pj_corporativo" | "locador" | "clt" | "autonomo" | "fornecedor_pf";

export type Parte = {
  id: string;
  codigo: string;
  tipo: ParteTipo;
  subtipo: ParteSubtipo;
  pessoa: "PJ" | "PF";
  nome: string;
  documento: string;
  ativo: boolean;
  /** Fornecedor: homologado para contratar. */
  homologado?: boolean;
  contato: { nome: string; email: string; telefone: string };
  endereco?: string;
  fluxo: Fluxo;
  formaPagamento: string;
  condicaoPagamento: string;
  /** Dados bancários de pagamento ou recebimento. */
  banco?: string;
  extras: Record<string, string>;
};

export type MinutaStatus = "vigente" | "obsoleta";
export type Minuta = {
  id: string;
  codigo: string;
  titulo: string;
  categoria: string;
  grupo: "PJ Assistencial" | "CLT" | "Corporativo" | "Receita" | "Locação";
  versao: string;
  status: MinutaStatus;
  revisor: string;
  data: string;
  motivo: string;
  clausulas: Clausula[];
};

export type Conformidade = "conforme" | "pendente" | "nao_conforme";
export type DossieItem = {
  id: string;
  /** `DOS-{contrato}-NN` (RN-007). */
  codigo: string;
  contratoId: string;
  natureza: string;
  documento: string;
  /** Item do checklist inicial (RN-031). */
  obrigatorio?: boolean;
  arquivo?: Arquivo;
  /** Sem data: "Indeterminada" (RN-050). */
  validade?: string;
  conformidade: Conformidade;
  auditor?: string;
  observacoes?: string;
  protocolo?: string;
};

export type ErpStatus = "pendente" | "sincronizado" | "erro" | "travado";
export type Cobranca = {
  id: string;
  /** `DOC-{contrato}-NN` (RN-007). */
  codigo: string;
  contratoId: string;
  fluxo: Fluxo;
  parteId: string;
  competencia: string;
  tipo: string;
  numero: string;
  /** Ausente: "valor não informado". */
  valor?: number;
  vencimento?: string;
  conferencia: "pendente" | "aprovado";
  conformidade: Conformidade;
  liberado: boolean;
  erp: { status: ErpStatus; titulo?: string; motivo?: string; data?: string; comprovante?: string };
  arquivo?: Arquivo;
  observacao?: string;
  /** Veio da leitura automática (Smart Intake). */
  autoDetectado?: boolean;
};

export type OpcaoTabela = { id: string; ordem: number; codigo: string; descricao: string; ativo: boolean; emUso: number };
export type TabelaId =
  | "categoria" | "fluxo" | "forma_pagamento" | "condicao_pagamento" | "indice"
  | "tipo_cobranca" | "natureza_dossie" | "tipo_aditivo" | "tipo_encerramento" | "unidade";

/** Campo extra de uma categoria (RN-065). `nome` é gerado a partir do rótulo. */
export type CampoCategoria = { id: string; nome?: string; rotulo: string; tipo: "texto" | "numero" | "lista" | "data"; opcoes?: string[]; ajuda?: string; placeholder?: string };

export type Indice = { codigo: string; nome: string; taxa: number; referencia: string };

export type ContratosData = {
  contratos: Contrato[];
  partes: Parte[];
  minutas: Minuta[];
  aditivos: Aditivo[];
  dossie: DossieItem[];
  cobrancas: Cobranca[];
  tabelas: Record<TabelaId, OpcaoTabela[]>;
  camposCategoria: Record<string, CampoCategoria[]>;
  indices: Indice[];
  /** Próximo código de cada sequencial, para o selo "Automático" (FR-001). */
  proximoCodigo: string;
  proximoCliente: string;
  proximoFornecedor: string;
  proximaMinuta: string;
};

/* ------------------------------------------------------------------ */
/* Rótulos e cores                                                     */
/* ------------------------------------------------------------------ */

/** As sete fases do ciclo de vida, na ordem da esteira. */
export const FASES: { id: Fase; n: number; label: string; icon: string }[] = [
  { id: "elaboracao", n: 1, label: "Elaboração", icon: "fa-pen-line" },
  { id: "validacao", n: 2, label: "Validação", icon: "fa-scale-balanced" },
  { id: "aprovacao", n: 3, label: "Aprovação", icon: "fa-stamp" },
  { id: "assinatura", n: 4, label: "Assinatura", icon: "fa-signature" },
  { id: "vigente", n: 5, label: "Execução Vigente", icon: "fa-circle-check" },
  { id: "aditivos", n: 6, label: "Gestão de Aditivos & Reajuste", icon: "fa-file-plus" },
  { id: "encerramento", n: 7, label: "Encerramento", icon: "fa-box-archive" },
];
export const faseLabel = (f: Fase) => FASES.find((x) => x.id === f)!.label;
/** "5. Execução Vigente": o rótulo numerado usado no histórico e no PDF. */
export const faseNumerada = (f: Fase) => { const x = FASES.find((y) => y.id === f)!; return `${x.n}. ${x.label}`; };

export const MODALIDADE: Record<Modalidade, { label: string; longo: string; variant: TagVariant }> = {
  adesao: { label: "Adesão", longo: "Adesão (Minuta Interna)", variant: "dark-blue" },
  corporativo: { label: "Corporativo", longo: "Corporativo (Upload Externo)", variant: "light-accent" },
  especifico: { label: "Específico", longo: "Específico (Aluguel/Bancos)", variant: "cyan" },
};

export const FLUXO: Record<Fluxo, { label: string; longo: string; variant: TagVariant; icon: string }> = {
  receita: { label: "Receita", longo: "Receita (Atendimento)", variant: "green", icon: "fa-arrow-down-left" },
  despesa: { label: "Despesa", longo: "Despesa (Contratação)", variant: "orange", icon: "fa-arrow-up-right" },
};

/**
 * Cor fixa de cada status (tabela "Status × cor do badge" da especificação):
 * Em Elaboração azul neutro, Em Aprovação âmbar, Reprovado vermelho, Pronto para
 * Coleta azul, Em Assinatura âmbar, Vigente verde, Encerrado cinza.
 */
export const STATUS: Record<Status, { label: string; variant: TagVariant; icon?: string }> = {
  em_elaboracao: { label: "Em Elaboração", variant: "light-blue", icon: "fa-pen-line" },
  em_aprovacao: { label: "Em Aprovação", variant: "yellow", icon: "fa-hourglass-half" },
  reprovado: { label: "Reprovado (Em Ajuste)", variant: "red", icon: "fa-circle-xmark" },
  pronto_coleta: { label: "Pronto para Coleta", variant: "dark-blue", icon: "fa-signature" },
  em_assinatura: { label: "Em Assinatura", variant: "yellow", icon: "fa-paper-plane" },
  vigente: { label: "Vigente", variant: "green", icon: "fa-circle-check" },
  encerrado: { label: "Encerrado", variant: "dark-purple", icon: "fa-box-archive" },
};

export const APROVACAO: Record<Aprovacao, { label: string; variant: TagVariant; icon?: string }> = {
  elaboracao: { label: "Em Elaboração", variant: "light-blue", icon: "fa-pen-line" },
  em_aprovacao: { label: "Em Aprovação", variant: "yellow", icon: "fa-hourglass-half" },
  reprovado: { label: "Reprovado (Em Ajuste)", variant: "red", icon: "fa-circle-xmark" },
  aprovado: { label: "Aprovado", variant: "green", icon: "fa-check" },
};

/** "Aguardando Aprovação Prévia" é cinza com cadeado: a trava central do produto. */
export const ASSINATURA: Record<Assinatura, { label: string; variant: TagVariant; icon?: string }> = {
  bloqueada: { label: "Aguardando Aprovação Prévia", variant: "dark-purple", icon: "fa-lock" },
  pronto_coleta: { label: "Pronto para Coleta", variant: "dark-blue", icon: "fa-signature" },
  em_assinatura: { label: "Em Assinatura", variant: "yellow", icon: "fa-paper-plane" },
  assinado: { label: "Assinado Digitalmente", variant: "green", icon: "fa-check" },
};

export const ERP: Record<ErpStatus, { label: string; variant: TagVariant; icon: string }> = {
  pendente: { label: "Pendente", variant: "dark-purple", icon: "fa-clock" },
  sincronizado: { label: "Sincronizado no Omie ERP", variant: "green", icon: "fa-check" },
  erro: { label: "Erro", variant: "red", icon: "fa-triangle-exclamation" },
  travado: { label: "Trava de Governança", variant: "dark-purple", icon: "fa-lock" },
};

/** Lista fechada do protocolo de dossiê (RN-050) e o estado da cobrança (RN-051). */
export const CONFORMIDADE: Record<Conformidade, { label: string; variant: TagVariant; icon: string }> = {
  conforme: { label: "Conforme / Aprovado", variant: "green", icon: "fa-check" },
  pendente: { label: "Pendente Regularização", variant: "yellow", icon: "fa-clock" },
  nao_conforme: { label: "Não conforme", variant: "red", icon: "fa-xmark" },
};

/** Faixas de vigência (RN-014): "Vencido" é o Crítico com dias ≤ 0. */
export const FAIXA: Record<Faixa, { label: string; longo: string; variant: TagVariant }> = {
  vencido: { label: "Vencido", longo: "Crítico (≤ 30d)", variant: "red" },
  critico: { label: "Crítico", longo: "Crítico (≤ 30d)", variant: "red" },
  alerta: { label: "Atenção", longo: "Atenção (31 a 90d)", variant: "yellow" },
  regular: { label: "Regular", longo: "Regular (> 90d)", variant: "green" },
};

export const PLATAFORMAS: Plataforma[] = ["Clicksign", "DocuSign", "Gov.br", "ICP-Brasil"];

/** Subtipos de cliente e categorias de fornecedor (glossário). */
export const SUBTIPO: Record<ParteSubtipo, string> = {
  particular_pj: "Particular PJ",
  operadora: "Operadora ANS",
  corporativa: "Empresa Corporativa",
  pf: "Particular PF",
  liminar: "Liminar Judicial",
  fornecedor_pj: "PJ Assistencial",
  pj_corporativo: "PJ Corporativo",
  locador: "PJ Específico (Locador)",
  clt: "Colaborador CLT",
  autonomo: "Autônomo / RPA",
  fornecedor_pf: "Consultor PF",
};
export const SUBTIPOS_CLIENTE: ParteSubtipo[] = ["particular_pj", "operadora", "corporativa", "pf", "liminar"];
export const SUBTIPOS_FORNECEDOR: ParteSubtipo[] = ["fornecedor_pj", "pj_corporativo", "locador", "clt", "autonomo", "fornecedor_pf"];

/** Papel registrado em cada evento do histórico de workflow (RN-071). */
export const PAPEL_WORKFLOW = {
  submissao: "Gestor da Área / Solicitante",
  aprovacao: "Aprovador / Diretoria",
  liberacao: "Sistema Automático",
  reprovacao: "Aprovador / Jurídico",
  despacho: "Operador de Contratos / Jurídico",
  conclusao: "Plataforma de assinatura",
  encerramento: "Ciclo de Vida",
  aditivo: "Aditamento",
} as const;

/* ------------------------------------------------------------------ */
/* Datas e valores                                                     */
/* ------------------------------------------------------------------ */

const DAY = 86_400_000;
const parse = (iso: string) => new Date(`${iso}T12:00:00Z`).getTime();

/** "2026-07-30" → "30/07/2026". */
export const br = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
/** "2026-07" → "07/2026". */
export const competencia = (ym: string) => ym.split("-").reverse().join("/");
export const addDays = (iso: string, n: number) => new Date(parse(iso) + n * DAY).toISOString().slice(0, 10);
export const diasAte = (iso: string, from = TODAY) => Math.round((parse(iso) - parse(from)) / DAY);

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const MASCARA = "R$ ••••••••";
export const kb = (bytes: number) => (bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1).replace(".", ",")} MB` : `${Math.round(bytes / 1000)} KB`);

export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const UNIDADES = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
function ate999(n: number): string {
  if (n < 20) return UNIDADES[n]!;
  if (n < 100) return DEZENAS[Math.floor(n / 10)]! + (n % 10 ? ` e ${UNIDADES[n % 10]}` : "");
  if (n === 100) return "cem";
  return CENTENAS[Math.floor(n / 100)]! + (n % 100 ? ` e ${ate999(n % 100)}` : "");
}
/** Número inteiro por extenso, até 999.999.999: 18 → "dezoito". */
export function extenso(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n < 1000) return ate999(n);
  const partes: string[] = [];
  const mi = Math.floor(n / 1_000_000), mil = Math.floor((n % 1_000_000) / 1000), resto = n % 1000;
  if (mi) partes.push(mi === 1 ? "um milhão" : `${ate999(mi)} milhões`);
  if (mil) partes.push(mil === 1 ? "mil" : `${ate999(mil)} mil`);
  if (resto) partes.push(ate999(resto));
  return partes.length > 1 && (resto < 100 || resto % 100 === 0) && resto ? partes.slice(0, -1).join(" ") + " e " + partes.at(-1) : partes.join(" ");
}
/** Valor em reais por extenso: 18500 → "dezoito mil e quinhentos reais". */
export function reaisExtenso(v: number): string {
  const inteiro = Math.floor(v), centavos = Math.round((v - inteiro) * 100);
  const r = inteiro ? `${extenso(inteiro)} ${inteiro === 1 ? "real" : "reais"}` : "";
  const c = centavos ? `${extenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}` : "";
  return [r, c].filter(Boolean).join(" e ") || "zero reais";
}
/** "18 (dezoito) meses" — prazo e aviso prévio por extenso (RN-030). */
export const porExtenso = (n: number, unidade: string) => `${n} (${extenso(n)}) ${unidade}`;
/** Prazo em meses entre duas datas: 01/08/2026 a 31/07/2027 são 12 meses. */
export function prazoMeses(inicio: string, fim: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) return 0;
  const [ai, mi, di] = inicio.split("-").map(Number) as [number, number, number];
  const [af, mf, df] = addDays(fim, 1).split("-").map(Number) as [number, number, number];
  return Math.max(1, (af - ai) * 12 + (mf - mi) + (df >= di ? 0 : -1));
}

/** Faixa de vigência (RN-014): crítico até 30 dias (inclui vencidos), atenção de 31 a 90, regular acima. */
export function faixa(fim: string): Faixa {
  const d = diasAte(fim);
  if (d <= 0) return "vencido";
  if (d <= 30) return "critico";
  if (d <= 90) return "alerta";
  return "regular";
}
export const ehCritico = (fim: string) => ["vencido", "critico"].includes(faixa(fim));

export const diasLabel = (fim: string) => {
  const d = diasAte(fim);
  return d <= 0 ? "Vencido" : `${d} dia${d === 1 ? "" : "s"}`;
};

/**
 * Próxima versão (RN-009): minor v{M}.{m+1}, major v{M+1}.0. O sufixo (ex.:
 * "-ENC") é ignorado no cálculo. Sempre calculado, nunca digitado.
 */
export function proximaVersao(versao: string | undefined, tipo: "minor" | "major") {
  if (!versao) return "v1.0";
  const [maj, min] = versao.replace("v", "").split("-")[0]!.split(".").map(Number) as [number, number];
  return tipo === "major" ? `v${maj + 1}.0` : `v${maj}.${min + 1}`;
}

/* ------------------------------------------------------------------ */
/* Códigos                                                             */
/* ------------------------------------------------------------------ */

/** `TA-NN/{contrato}`: número = maior já usado + 1, nunca reaproveitado (RN-006). */
export function proximoAditivo(aditivos: Aditivo[], contratoId: string) {
  const n = Math.max(0, ...aditivos.filter((a) => a.contratoId === contratoId).map((a) => a.numero)) + 1;
  return { numero: n, codigo: `TA-${String(n).padStart(2, "0")}/${contratoId}` };
}
/** "2º Termo Aditivo (Reajuste Financeiro)" (RN-006). */
export function rotuloAditivo(a: Pick<Aditivo, "numero" | "origem">) {
  const sufixo = a.origem === "reajuste" ? " (Reajuste Financeiro)" : a.origem === "adequacao" ? " (Adequação de Minuta)" : "";
  return `${a.numero}º Termo Aditivo${sufixo}`;
}
/** `DOS-{contrato}-NN` e `DOC-{contrato}-NN`: sequência por contrato (RN-007). */
export function proximoCodigoItem(prefixo: "DOS" | "DOC", itens: { codigo: string; contratoId: string }[], contratoId: string) {
  const n = Math.max(0, ...itens.filter((i) => i.contratoId === contratoId).map((i) => Number(i.codigo.split("-").at(-1)) || 0)) + 1;
  return `${prefixo}-${contratoId}-${String(n).padStart(2, "0")}`;
}

/** Anexos aceitos e tamanho máximo (RN-008). */
export const ANEXO_TIPOS = ["pdf", "doc", "docx", "png", "jpg", "jpeg", "xml"];
export const ANEXO_MAX = 25_000_000;
export const ANEXO_ERRO_TAMANHO = "Arquivo excede o limite máximo permitido de 25 MB.";
export function validarAnexo(a: Arquivo): string | null {
  const ext = a.nome.split(".").at(-1)?.toLowerCase() ?? "";
  if (!ANEXO_TIPOS.includes(ext)) return `Tipo de arquivo não permitido. Use ${ANEXO_TIPOS.map((t) => t.toUpperCase()).join(", ")}.`;
  if (a.tamanho > ANEXO_MAX) return ANEXO_ERRO_TAMANHO;
  return null;
}

/* ------------------------------------------------------------------ */
/* Criação de contrato                                                 */
/* ------------------------------------------------------------------ */

/** Valores padrão do formulário (RN-026). */
export const PADROES_CONTRATO = {
  valor: 0,
  formaPagamento: "PIX",
  condicaoPagamento: "Até dia 10 mediante NF",
  vencimentoDia: 10,
  exigeNf: true,
  indice: "IPCA (IBGE)",
  mesBase: "Janeiro",
  avisoPrevioDias: 30,
  prazoSaneamentoDias: 15,
  clausulaIndisponibilidade: false,
  liminar: false,
};

/** Fluxo sugerido pela parte (RN-027). */
export function fluxoSugerido(p: Parte): { fluxo: Fluxo; detalhe: string } {
  if (p.tipo === "cliente") return { fluxo: "receita", detalhe: "Receita (Atendimento)" };
  if (p.subtipo === "clt") return { fluxo: "despesa", detalhe: "Despesa (Pessoal)" };
  return { fluxo: "despesa", detalhe: "Despesa (Contratação)" };
}
/** Partes elegíveis: clientes ativos e fornecedores homologados (RN-027). */
export const parteElegivel = (p: Parte) => (p.tipo === "cliente" ? p.ativo : p.ativo && !!p.homologado);

/** Checklist inicial do dossiê: 3 itens, ou 4 com liminar (RN-031). */
export const CHECKLIST_INICIAL: { documento: string; natureza: string; soLiminar?: boolean }[] = [
  { documento: "Contrato Social Consolidado & Cartão CNPJ", natureza: "Jurídica / Societária" },
  { documento: "Certidão Conjunta RFB/PGFN (CND Federal)", natureza: "Fiscal / Habilitação" },
  { documento: "Certidão de Regularidade Profissional / ASO Admissional", natureza: "Regulatória / Técnica" },
  { documento: "Cópia da Decisão Judicial Liminar (Vara da Fazenda Pública)", natureza: "Jurídica / Processual", soLiminar: true },
];
export function checklistInicial(contratoId: string, liminar: boolean): DossieItem[] {
  return CHECKLIST_INICIAL.filter((i) => liminar || !i.soLiminar).map((i, n) => ({
    id: `${contratoId}-chk-${n + 1}`,
    codigo: `DOS-${contratoId}-${String(n + 1).padStart(2, "0")}`,
    contratoId,
    natureza: i.natureza,
    documento: i.documento,
    obrigatorio: true,
    conformidade: "pendente",
  }));
}

/** Contratante nos documentos (RN-030; razão social e CNPJ em Decisão pendente Q-16). */
export const CONTRATANTE = {
  razao: "Bloomy Saúde Integrada S/A",
  cnpj: "45.987.654/0001-32",
  endereco: "Av. Paulista, nº 1.200, 10º andar, Bela Vista, São Paulo/SP, CEP 01310-100",
  representante: "Diretoria Executiva & Jurídica",
  email: "contato@bloomy.com.br",
  dpo: "privacidade@bloomy.com.br",
  foroCidade: "São Paulo",
  foroUf: "SP",
};

/** Título do documento pela categoria (RN-073). */
export function tituloDocumento(categoria: string) {
  const c = categoria.toLowerCase();
  if (c.includes("clt")) return "CONTRATO INDIVIDUAL DE TRABALHO";
  if (c.includes("locação")) return "CONTRATO DE LOCAÇÃO DE IMÓVEL NÃO RESIDENCIAL";
  if (c.includes("consultoria")) return "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA";
  if (c.includes("operadora") || c.includes("saúde")) return "CONTRATO DE CREDENCIAMENTO DE PRESTADOR DE SERVIÇOS DE SAÚDE";
  if (c.includes("particular")) return "CONTRATO DE PRESTAÇÃO DE SERVIÇOS TERAPÊUTICOS PARTICULARES";
  return `INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS (${categoria.toUpperCase()})`;
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export const parteDe = (data: ContratosData, c: { parteId: string }) => data.partes.find((p) => p.id === c.parteId);
export const dossieDe = (data: ContratosData, contratoId: string) => data.dossie.filter((d) => d.contratoId === contratoId);
/** "100% Conforme" quando todos os itens do dossiê estão conformes (e há ao menos um) (RN-050). */
export function dossieOk(data: ContratosData, contratoId: string) {
  const itens = dossieDe(data, contratoId);
  return itens.length > 0 && itens.every((i) => i.conformidade === "conforme");
}
export const dossieSituacao = (data: ContratosData, contratoId: string) => (dossieOk(data, contratoId) ? "100% Conforme" : "Pendente de Documentos");
export const dossiePendentes = (data: ContratosData, contratoId: string) =>
  dossieDe(data, contratoId).filter((i) => i.conformidade !== "conforme").length;

export const vigentes = (data: ContratosData) => data.contratos.filter((c) => c.status === "vigente");
/** Base do painel: todo contrato não encerrado, inclusive em elaboração (RN-015). */
export const basePainel = (data: ContratosData) => data.contratos.filter((c) => c.status !== "encerrado");
export const aditivosDe = (data: ContratosData, contratoId: string) => data.aditivos.filter((a) => a.contratoId === contratoId);
/** Último documento de cobrança do contrato (FR-014). */
export const ultimaCobranca = (data: ContratosData, contratoId: string) =>
  data.cobrancas.filter((b) => b.contratoId === contratoId).sort((a, b) => b.competencia.localeCompare(a.competencia))[0];

/** CLT em período de experiência: categoria ou fluxo CLT, vigência total ≤ 90 dias, Vigente ou Em Assinatura (RN-022). */
export const emExperiencia = (c: Contrato) =>
  (c.categoria.includes("CLT") || c.fluxoDetalhe === "Despesa (Pessoal)") && diasAte(c.fim, c.inicio) <= 90 && ["vigente", "em_assinatura"].includes(c.status);

/* ------------------------------------------------------------------ */
/* Reajuste                                                            */
/* ------------------------------------------------------------------ */

/** Taxas fixas por índice e a padrão do índice não reconhecido (RN-041). */
export const TAXA_PADRAO = 3.8;
export const JANELA_REAJUSTE_DIAS = 60;

/** Índice pelo nome principal: "IPCA" e "IPCA (IBGE)" são o mesmo (RN-041). */
export function indiceDe(data: ContratosData, nome?: string): { indice?: Indice; taxa: number; reconhecido: boolean } {
  const nomeNorm = (nome ?? "").toUpperCase();
  const indice = data.indices.find((i) => new RegExp(`(^|[^A-Z-])${i.codigo.toUpperCase()}($|[^A-Z-])`).test(nomeNorm));
  return indice ? { indice, taxa: indice.taxa, reconhecido: true } : { taxa: TAXA_PADRAO, reconhecido: false };
}
/** Data-base: aniversário do início no ano corrente; se já passou, no seguinte; 29/02 vira 28/02 (RN-040). */
export function dataBase(inicio: string, hoje = TODAY) {
  const [, m, d] = inicio.split("-");
  const dia = m === "02" && d === "29" ? "28" : d;
  const ano = Number(hoje.slice(0, 4));
  const esteAno = `${ano}-${m}-${dia}`;
  return diasAte(esteAno, hoje) >= 0 ? esteAno : `${ano + 1}-${m}-${dia}`;
}
/** "Janela Aberta (< 60d)" quando faltam até 60 dias para a data-base (RN-040). */
export const janelaAberta = (inicio: string) => diasAte(dataBase(inicio)) <= JANELA_REAJUSTE_DIAS;
/** Novo valor = valor × (1 + taxa), em 2 casas (RN-041). */
export const valorReajustado = (valor: number, taxa: number) => Math.round(valor * (1 + taxa / 100) * 100) / 100;

/* ------------------------------------------------------------------ */
/* Health Score e indicadores do painel                                */
/* ------------------------------------------------------------------ */

/** Pesos (RN-018): 40 regulares, 30 dossiês conformes, 30 assinados, −25 críticos. */
export const SCORE_PESOS = { vigencia: 40, dossie: 30, digital: 30, penalidadeCriticos: 25 };

export type Pilar = { id: "vigencia" | "dossie" | "digital"; label: string; pct: number; peso: number; pontos: number; n: number };
export type Score = {
  score: number; label: string; selo: string; variant: "green" | "yellow" | "red" | "blue";
  pilares: Pilar[]; criticos: number; penalidade: number; bruto: number; total: number; vazio: boolean;
};

/**
 * Health Score de 10 a 100 (RN-018 a RN-020): 40 × regulares/N + 30 ×
 * dossiês conformes/N + 30 × assinados/N − 25 × críticos/N, N = base do painel.
 * Base vazia: 100, "Base Oficial Pronta", azul. A soma exibida em "Entenda o
 * Score" bate com o score (os pontos de cada parcela usam 1 casa).
 */
export function healthScore(data: ContratosData): Score {
  const base = basePainel(data);
  const N = base.length;
  if (N === 0) {
    return { score: 100, label: "Base Oficial Pronta", selo: "100% Pronta para Operação", variant: "blue", pilares: [], criticos: 0, penalidade: 0, bruto: 100, total: 0, vazio: true };
  }
  const um = (x: number) => Math.round(x * 10) / 10;
  const regulares = base.filter((c) => faixa(c.fim) === "regular").length;
  const conformes = base.filter((c) => dossieOk(data, c.id)).length;
  const assinados = base.filter((c) => c.assinatura === "assinado").length;
  const criticos = base.filter((c) => ehCritico(c.fim)).length;
  const mk = (id: Pilar["id"], label: string, n: number, peso: number): Pilar => ({ id, label, n, pct: Math.round((n / N) * 100), peso, pontos: um((n / N) * peso) });
  const pilares = [
    mk("vigencia", "Vigência Segura", regulares, SCORE_PESOS.vigencia),
    mk("dossie", "Dossiê", conformes, SCORE_PESOS.dossie),
    mk("digital", "Formalização Digital", assinados, SCORE_PESOS.digital),
  ];
  const penalidade = um((criticos / N) * SCORE_PESOS.penalidadeCriticos);
  const bruto = um(pilares.reduce((s, p) => s + p.pontos, 0));
  const score = Math.max(10, Math.min(100, Math.round(bruto - penalidade)));
  const [label, selo, variant] =
    score >= 85 ? ["Excelente Governança", "Audit-Ready • Baixo Risco", "green"] as const
    : score >= 65 ? ["Atenção Preventiva", "Janela de Repactuação", "yellow"] as const
    : ["Risco Operacional", "Exige Decisão Imediata", "red"] as const;
  return { score, label, selo, variant, pilares, criticos, penalidade, bruto, total: N, vazio: false };
}

/** Os indicadores do painel e da esteira, calculados do mesmo jeito nos dois lugares (RN-015 a RN-024, RN-072). */
export function indicadores(data: ContratosData) {
  const base = basePainel(data);
  const vs = vigentes(data);
  const total = data.contratos.length;
  /** Taxas sobre o total cadastrado; base vazia vale 100% (RN-021). */
  const taxa = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 100);
  const runRate = (f: Fluxo) => vs.filter((c) => c.fluxo === f).reduce((s, c) => s + (c.valor ?? 0), 0);
  const assinados = data.contratos.filter((c) => c.assinatura === "assinado").length;
  const conformes = data.contratos.filter((c) => dossieOk(data, c.id)).length;
  const seguros = data.contratos.filter((c) => c.status !== "encerrado" && diasAte(c.fim) > 30).length;
  const aditivosAprovados = data.aditivos.filter((a) => a.aprovacao === "aprovado").length;
  const porCategoria = new Map<string, { qtd: number; valor: number }>();
  for (const c of data.contratos) {
    const k = c.categoria || "Geral";
    const atual = porCategoria.get(k) ?? { qtd: 0, valor: 0 };
    porCategoria.set(k, { qtd: atual.qtd + 1, valor: atual.valor + (c.valor ?? 0) });
  }
  const recesso = data.contratos.filter((c) => c.recesso).reduce((s, c) => s + c.recesso!.credito - c.recesso!.usados, 0);
  return {
    ativos: vs.length,
    total,
    ativosPct: taxa(vs.length),
    criticos: base.filter((c) => ehCritico(c.fim)).length,
    alerta: base.filter((c) => faixa(c.fim) === "alerta").length,
    regulares: base.filter((c) => faixa(c.fim) === "regular").length,
    cltExperiencia: data.contratos.filter(emExperiencia).length,
    dossiePct: taxa(conformes),
    dossieConformes: conformes,
    digitalPct: taxa(assinados),
    assinados,
    vigenciaSeguraPct: taxa(seguros),
    docsAprovados: data.cobrancas.filter((c) => c.conferencia === "aprovado").length,
    docsPendentes: data.cobrancas.filter((c) => c.conferencia === "pendente").length,
    docsCobranca: data.cobrancas.length,
    receitas: runRate("receita"),
    despesas: runRate("despesa"),
    totalAditivos: data.aditivos.length,
    aditivosAprovados,
    taxaAditivos: data.aditivos.length ? Math.round((aditivosAprovados / data.aditivos.length) * 1000) / 10 : 100,
    saldoRecesso: Math.round(recesso * 10) / 10,
    porCategoria: [...porCategoria.entries()].map(([categoria, v]) => ({ categoria, ...v })).sort((a, b) => b.valor - a.valor),
    porFase: Object.fromEntries(FASES.map((f) => [f.id, data.contratos.filter((c) => c.fase === f.id).length])) as Record<Fase, number>,
  };
}

/* ------------------------------------------------------------------ */
/* Dicionário de tags e blocos jurídicos das minutas                   */
/* ------------------------------------------------------------------ */

/** 24 tags em 4 categorias (FR-062). `exemplo`: o dado fictício do simulador (FR-064). */
export type TagMinuta = { tag: string; label: string; descricao: string; exemplo: string };
export const TAGS_MINUTA: { categoria: string; icone: string; tags: TagMinuta[] }[] = [
  {
    categoria: "Partes & Qualificação",
    icone: "fa-users",
    tags: [
      { tag: "CONTRATANTE_RAZAO_SOCIAL", label: "Contratante - Razão Social", descricao: "Razão social completa da empresa contratante matriz", exemplo: CONTRATANTE.razao },
      { tag: "CONTRATANTE_CNPJ", label: "Contratante - CNPJ", descricao: "Número oficial de inscrição no CNPJ da contratante", exemplo: CONTRATANTE.cnpj },
      { tag: "CONTRATANTE_ENDERECO", label: "Contratante - Endereço Completo", descricao: "Logradouro, número, bairro, cidade, UF e CEP da sede", exemplo: CONTRATANTE.endereco },
      { tag: "CONTRATADA_NOME_RAZAO", label: "Contratada - Razão Social / Nome", descricao: "Razão social da pessoa jurídica ou nome civil da contratada", exemplo: "Clínica Integrar Terapias Ltda." },
      { tag: "CONTRATADA_DOC_FEDERAL", label: "Contratada - CNPJ ou CPF", descricao: "Inscrição no CNPJ ou CPF da parte contratada", exemplo: "12.345.678/0001-90" },
      { tag: "CONTRATADA_ENDERECO", label: "Contratada - Domicílio / Sede", descricao: "Endereço comercial ou residencial completo da contratada", exemplo: "Rua das Acácias, 120, Curitiba/PR" },
      { tag: "CONTRATADA_REPRESENTANTE", label: "Contratada - Representante Legal", descricao: "Nome completo e qualificação do administrador / procurador", exemplo: "Ana Beatriz Lemos (CREFITO-8 123456-F)" },
      { tag: "CONTRATADA_EMAIL", label: "Contratada - E-mail Notificações", descricao: "E-mail oficial cadastrado para envio de notificações e faturamento", exemplo: "contratos@integrar.exemplo" },
    ],
  },
  {
    categoria: "Vigência & Prazos",
    icone: "fa-calendar-days",
    tags: [
      { tag: "DATA_INICIO_VIGENCIA", label: "Início da Vigência", descricao: "Data formal de início da vigência pactuada", exemplo: "01/08/2026" },
      { tag: "DATA_FIM_VIGENCIA", label: "Término da Vigência", descricao: "Data prevista de encerramento contratual", exemplo: "31/07/2027" },
      { tag: "PRAZO_MESES", label: "Duração em Meses", descricao: "Prazo de duração expresso em meses (ex: 12 meses)", exemplo: "12 (doze) meses" },
      { tag: "DIAS_AVISO_PREVIO", label: "Dias de Aviso Prévio", descricao: "Prazo prévio para notificação de denúncia ou rescisão (ex: 30 dias)", exemplo: "30 (trinta) dias" },
    ],
  },
  {
    categoria: "Remuneração & Financeiro",
    icone: "fa-sack-dollar",
    tags: [
      { tag: "VALOR_GLOBAL", label: "Valor Global do Contrato", descricao: "Valor total estimado pactuado (ex: R$ 180.000,00)", exemplo: "R$ 222.000,00" },
      { tag: "VALOR_GLOBAL_EXTENSO", label: "Valor Global por Extenso", descricao: "Montante global expresso por extenso", exemplo: "duzentos e vinte e dois mil reais" },
      { tag: "VALOR_MENSAL", label: "Honorário / Parcela Mensal", descricao: "Valor nominal da contraprestação mensal (ex: R$ 15.000,00)", exemplo: "R$ 18.500,00" },
      { tag: "VALOR_MENSAL_EXTENSO", label: "Valor Mensal por Extenso", descricao: "Valor da contraprestação mensal por extenso", exemplo: "dezoito mil e quinhentos reais" },
      { tag: "DIA_PAGAMENTO_VENCIMENTO", label: "Dia de Pagamento", descricao: "Dia de vencimento da fatura mensal (ex: dia 10)", exemplo: "10 (dez)" },
      { tag: "INDICE_REAJUSTE", label: "Índice de Reajuste Anual", descricao: "Índice econômico oficial aplicável (IPCA/IBGE ou IGP-M)", exemplo: "IPCA (IBGE)" },
      { tag: "FORMA_PAGAMENTO", label: "Forma de Liquidação", descricao: "Modalidade pactuada (PIX, Boleto Bancário ou TED)", exemplo: "Transferência Bancária / PIX" },
    ],
  },
  {
    categoria: "Operacional, SLA & Compliance",
    icone: "fa-shield-halved",
    tags: [
      { tag: "OBJETO_DETALHADO", label: "Objeto e Escopo Detalhado", descricao: "Especificação integral do escopo, entregáveis e serviços", exemplo: "prestação de serviços de terapia ocupacional e integração sensorial" },
      { tag: "CIDADE_FORO", label: "Comarca do Foro", descricao: "Município eleito para solução de controvérsias", exemplo: CONTRATANTE.foroCidade },
      { tag: "UF_FORO", label: "UF da Comarca do Foro", descricao: "Sigla da Unidade Federativa da comarca eleita (ex: SP)", exemplo: CONTRATANTE.foroUf },
      { tag: "GESTOR_CONTRATO", label: "Gestor Técnico do Contrato", descricao: "Nome, cargo ou setor responsável pelo ateste das entregas", exemplo: "Coordenação de Terapias" },
      { tag: "CANAL_DENUNCIA_LGPD", label: "Canal de Privacidade (DPO)", descricao: "Endereço eletrônico oficial para demandas da Lei nº 13.709/2018", exemplo: CONTRATANTE.dpo },
    ],
  },
];
export const TODAS_AS_TAGS = TAGS_MINUTA.flatMap((c) => c.tags);
const TAG_RE = /\{\{([A-Z_]+)\}\}/g;

export const BLOCOS_JURIDICOS: { id: string; label: string; texto: string }[] = [
  { id: "preambulo", label: "Preâmbulo", texto: "Pelo presente instrumento particular, de um lado {{CONTRATANTE_RAZAO_SOCIAL}}, inscrita no CNPJ sob o nº {{CONTRATANTE_CNPJ}}, com sede em {{CONTRATANTE_ENDERECO}}, doravante CONTRATANTE, e de outro {{CONTRATADA_NOME_RAZAO}}, inscrita sob o nº {{CONTRATADA_DOC_FEDERAL}}, com sede em {{CONTRATADA_ENDERECO}}, neste ato representada por {{CONTRATADA_REPRESENTANTE}}, doravante CONTRATADA, têm entre si justo e contratado o que segue." },
  { id: "clausula", label: "Cláusula", texto: "CLÁUSULA Xª — TÍTULO\nTexto da cláusula." },
  { id: "paragrafo", label: "Parágrafo §", texto: "§ 1º Texto do parágrafo." },
  { id: "unico", label: "Parágrafo Único", texto: "Parágrafo único. Texto do parágrafo." },
  { id: "alineas", label: "Alíneas", texto: "a) primeira hipótese;\nb) segunda hipótese;\nc) terceira hipótese." },
  { id: "lgpd", label: "LGPD", texto: "As partes tratarão os dados pessoais a que tiverem acesso exclusivamente para a execução deste contrato, nos termos da Lei nº 13.709/2018 (LGPD), adotando medidas de segurança adequadas. Demandas de titulares devem ser enviadas a {{CANAL_DENUNCIA_LGPD}}." },
  { id: "anticorrupcao", label: "Anticorrupção", texto: "As partes declaram conhecer a Lei nº 12.846/2013 e se comprometem a não praticar atos lesivos à administração pública, nacional ou estrangeira." },
  { id: "foro", label: "Foro", texto: "Fica eleito o foro da comarca de {{CIDADE_FORO}}/{{UF_FORO}} para dirimir as questões oriundas deste contrato, com renúncia a qualquer outro." },
];

/** Troca as tags `{{TAG}}` pelo exemplo do simulador; tag fora do dicionário devolve `null` ("Variável não preenchida") (FR-064). */
export function simular(texto: string): { trecho: string; tag?: string; valor?: string | null }[] {
  const exemplos = new Map(TODAS_AS_TAGS.map((t) => [t.tag, t.exemplo]));
  const partes: { trecho: string; tag?: string; valor?: string | null }[] = [];
  let last = 0;
  for (const m of texto.matchAll(TAG_RE)) {
    if (m.index! > last) partes.push({ trecho: texto.slice(last, m.index) });
    partes.push({ trecho: m[0], tag: m[1], valor: exemplos.get(m[1]!) ?? null });
    last = m.index! + m[0].length;
  }
  if (last < texto.length) partes.push({ trecho: texto.slice(last) });
  return partes;
}

/**
 * Valores das tags para um contrato real (RN-030): a contratada vem do
 * cadastro oficial de partes; datas dd/mm/aaaa, moeda "R$ 1.234,56", prazo e
 * aviso prévio por extenso. Padrões: e-mail contato@bloomy.com.br e foro São Paulo/SP.
 */
export function valoresDasTags(c: Pick<Contrato, "inicio" | "fim" | "valor" | "vencimentoDia" | "indice" | "formaPagamento" | "objeto" | "gestor" | "avisoPrevioDias">, p?: Parte): Record<string, string> {
  const valor = c.valor ?? 0;
  const meses = prazoMeses(c.inicio, c.fim);
  const dia = c.vencimentoDia ?? 10;
  return {
    CONTRATANTE_RAZAO_SOCIAL: CONTRATANTE.razao,
    CONTRATANTE_CNPJ: CONTRATANTE.cnpj,
    CONTRATANTE_ENDERECO: CONTRATANTE.endereco,
    CONTRATADA_NOME_RAZAO: p?.nome ?? "Parte Contratada Homologada",
    CONTRATADA_DOC_FEDERAL: p?.documento ?? "CNPJ/CPF não informado",
    CONTRATADA_ENDERECO: p?.endereco ?? "Endereço cadastrado no sistema",
    CONTRATADA_REPRESENTANTE: p?.contato.nome ?? p?.nome ?? "Representante Legal",
    CONTRATADA_EMAIL: p?.contato.email ?? CONTRATANTE.email,
    ...(c.inicio && { DATA_INICIO_VIGENCIA: br(c.inicio) }),
    ...(c.fim && { DATA_FIM_VIGENCIA: br(c.fim) }),
    // Sem datas, as tags de vigência ficam no texto (tag desconhecida permanece, RN-030).
    ...(meses ? { PRAZO_MESES: porExtenso(meses, "meses"), VALOR_GLOBAL: brl(valor * meses), VALOR_GLOBAL_EXTENSO: reaisExtenso(valor * meses) } : {}),
    DIAS_AVISO_PREVIO: porExtenso(c.avisoPrevioDias, "dias"),
    VALOR_MENSAL: brl(valor),
    VALOR_MENSAL_EXTENSO: reaisExtenso(valor),
    DIA_PAGAMENTO_VENCIMENTO: `${dia} (${extenso(dia)})`,
    INDICE_REAJUSTE: c.indice ?? "IPCA (IBGE)",
    FORMA_PAGAMENTO: c.formaPagamento ?? "Transferência Bancária / PIX",
    OBJETO_DETALHADO: c.objeto,
    CIDADE_FORO: CONTRATANTE.foroCidade,
    UF_FORO: CONTRATANTE.foroUf,
    GESTOR_CONTRATO: c.gestor || "Gestão de Contratos & Compliance",
    CANAL_DENUNCIA_LGPD: CONTRATANTE.dpo,
  };
}
/** Resolve as tags; tags desconhecidas permanecem no texto (RN-030). */
export const resolverTags = (texto: string, valores: Record<string, string>) => texto.replace(TAG_RE, (m, tag: string) => valores[tag] ?? m);

/**
 * Cláusulas do contrato de adesão a partir da minuta (RN-029, RN-030): cópia
 * própria, com as tags resolvidas, marcadas como obrigatórias e não editadas.
 * Sem minuta, as 9 cláusulas padrão preenchidas com os dados do contrato.
 */
export function clausulasDoContrato(minuta: Minuta | undefined, valores: Record<string, string>): Clausula[] {
  const fonte = minuta?.clausulas.length ? minuta.clausulas : CLAUSULAS_PADRAO;
  return fonte.map((c, i) => ({
    id: `cl-${i + 1}`,
    titulo: c.titulo.trim() || `Cláusula ${i}ª`,
    texto: resolverTags(c.texto.trim() || "Conforme disposto no caput desta cláusula.", valores),
    obrigatoria: true,
  }));
}

/** As 9 cláusulas padrão do contrato sem minuta (FR-031). */
export const CLAUSULAS_PADRAO: Clausula[] = [
  { id: "p0", titulo: "Preâmbulo & Qualificação das Partes", texto: "{{CONTRATANTE_RAZAO_SOCIAL}}, CNPJ {{CONTRATANTE_CNPJ}}, doravante CONTRATANTE, e {{CONTRATADA_NOME_RAZAO}}, inscrita sob o nº {{CONTRATADA_DOC_FEDERAL}}, doravante CONTRATADA, celebram o presente instrumento." },
  { id: "p1", titulo: "Cláusula 1ª — Do Objeto", texto: "Constitui objeto deste contrato a {{OBJETO_DETALHADO}}." },
  { id: "p2", titulo: "Cláusula 2ª — Da Vigência", texto: "O contrato vigora de {{DATA_INICIO_VIGENCIA}} a {{DATA_FIM_VIGENCIA}}, pelo prazo de {{PRAZO_MESES}}." },
  { id: "p3", titulo: "Cláusula 3ª — Do Preço", texto: "A CONTRATANTE pagará {{VALOR_MENSAL}} ({{VALOR_MENSAL_EXTENSO}}) por mês, por {{FORMA_PAGAMENTO}}, com vencimento no dia {{DIA_PAGAMENTO_VENCIMENTO}}." },
  { id: "p4", titulo: "Cláusula 4ª — Do Reajuste", texto: "O valor será reajustado anualmente pelo {{INDICE_REAJUSTE}}, na data-base." },
  { id: "p5", titulo: "Cláusula 5ª — Das Obrigações", texto: "A CONTRATADA executará o objeto com zelo técnico, sob a gestão de {{GESTOR_CONTRATO}}." },
  { id: "p6", titulo: "Cláusula 6ª — Da Proteção de Dados", texto: "As partes cumprirão a Lei nº 13.709/2018 (LGPD). Canal de privacidade: {{CANAL_DENUNCIA_LGPD}}." },
  { id: "p7", titulo: "Cláusula 7ª — Da Rescisão", texto: "Qualquer das partes poderá rescindir o contrato mediante aviso prévio de {{DIAS_AVISO_PREVIO}}." },
  { id: "p8", titulo: "Cláusula 8ª — Do Foro", texto: "Fica eleito o foro da comarca de {{CIDADE_FORO}}/{{UF_FORO}}." },
];

/** Papéis do módulo (visões por papel). Não são personas do Bloomy: o módulo é novo. */
export type Papel = "diretoria" | "solicitante" | "aprovador" | "operador" | "juridico" | "financeiro" | "comercial" | "compras" | "administrador";
export const PAPEIS: { id: Papel; label: string }[] = [
  { id: "diretoria", label: "Diretoria / Gestor Master" },
  { id: "solicitante", label: "Gestor da área (solicitante)" },
  { id: "aprovador", label: "Aprovador (Diretoria / Jurídico)" },
  { id: "operador", label: "Operador de contratos" },
  { id: "juridico", label: "Jurídico / Compliance" },
  { id: "financeiro", label: "Financeiro / Controladoria" },
  { id: "comercial", label: "Comercial / Faturamento" },
  { id: "compras", label: "Compras / RH-DP" },
  { id: "administrador", label: "Administrador" },
];
