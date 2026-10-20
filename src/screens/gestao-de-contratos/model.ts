/**
 * Gestão de Contratos — tipos, rótulos e regras compartilhadas pelas telas.
 *
 * Os quatro estados do contrato (aprovação, assinatura, status e fase) andam
 * juntos; as telas leem daqui o rótulo e a cor de cada um, para que o mesmo
 * status tenha a mesma cor em todo o módulo.
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

export type Clausula = { id: string; titulo: string; texto: string; editada?: boolean };

export type Versao = { versao: string; data: string; fase: string; motivo: string; resumo: string; revisor: string };

export type EventoTipo = "criacao" | "workflow" | "versao" | "aditivo" | "dossie" | "cobranca" | "erp" | "encerramento";
export type Evento = { id: string; data: string; tipo: EventoTipo; titulo: string; autor: string; detalhe?: string };

export type Aditivo = {
  id: string;
  contratoId: string;
  codigo: string;
  tipo: string;
  data: string;
  novaVigencia?: string;
  novoValor?: number;
  motivo: string;
  impacto: string;
  aprovacao: Aprovacao;
  assinatura: Assinatura;
  arquivo?: Arquivo;
};

export type Contrato = {
  id: string;
  versao: string;
  modalidade: Modalidade;
  categoria: string;
  fluxo: Fluxo;
  parteId: string;
  objeto: string;
  status: Status;
  fase: Fase;
  aprovacao: Aprovacao;
  assinatura: Assinatura;
  /** Valor mensal. Ausente: "valor não informado". */
  valor?: number;
  formaPagamento?: string;
  condicaoPagamento?: string;
  vencimentoDia?: number;
  inicio: string;
  fim: string;
  indice?: string;
  /** Próxima data-base de reajuste. */
  dataBase?: string;
  ultimoReajuste?: { data: string; taxa: number; valorAnterior: number; manual?: boolean };
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
  aprovador?: { nome: string; data: string; parecer: string };
  reprovacao?: { aprovador: string; data: string; motivo: string };
  envelope?: { plataforma: Plataforma; id: string; data: string };
  assinadoDigital?: boolean;
  /** CLT: fim do contrato de experiência. */
  experienciaAte?: string;
  encerramento?: { data: string; tipo: string; motivo: string; distrato: Arquivo };
};

export type ParteTipo = "cliente" | "fornecedor";
export type ParteSubtipo = "operadora" | "particular_pj" | "pf" | "liminar" | "fornecedor_pj" | "fornecedor_pf" | "clt";

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
  fluxo: Fluxo;
  formaPagamento: string;
  condicaoPagamento: string;
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
  contratoId: string;
  natureza: string;
  documento: string;
  arquivo?: Arquivo;
  validade?: string;
  conformidade: Conformidade;
  auditor?: string;
  observacoes?: string;
};

export type ErpStatus = "pendente" | "sincronizado" | "erro" | "travado";
export type Cobranca = {
  id: string;
  contratoId: string;
  fluxo: Fluxo;
  parteId: string;
  competencia: string;
  tipo: string;
  numero: string;
  valor: number;
  vencimento: string;
  conferencia: "pendente" | "aprovado";
  conformidade: Conformidade;
  liberado: boolean;
  erp: { status: ErpStatus; titulo?: string; motivo?: string; data?: string };
  arquivo?: Arquivo;
  observacao?: string;
  /** Veio da leitura automática (Smart Intake). */
  autoDetectado?: boolean;
};

export type OpcaoTabela = { id: string; ordem: number; codigo: string; descricao: string; ativo: boolean; emUso: number };
export type TabelaId =
  | "categoria" | "fluxo" | "forma_pagamento" | "condicao_pagamento" | "indice"
  | "tipo_cobranca" | "natureza_dossie" | "tipo_aditivo" | "tipo_encerramento" | "unidade";

export type CampoCategoria = { id: string; rotulo: string; tipo: "texto" | "numero" | "lista" | "data"; opcoes?: string[]; ajuda?: string };

export type Indice = { codigo: string; taxa: number; referencia: string };

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
  /** Próximo código do sequencial, para o selo "Automático". */
  proximoCodigo: string;
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
  { id: "aditivos", n: 6, label: "Aditivos & Reajuste", icon: "fa-file-plus" },
  { id: "encerramento", n: 7, label: "Encerramento", icon: "fa-box-archive" },
];
export const faseLabel = (f: Fase) => FASES.find((x) => x.id === f)!.label;

export const MODALIDADE: Record<Modalidade, { label: string; variant: TagVariant }> = {
  adesao: { label: "Adesão", variant: "dark-blue" },
  corporativo: { label: "Corporativo", variant: "light-accent" },
  especifico: { label: "Específico", variant: "cyan" },
};

export const FLUXO: Record<Fluxo, { label: string; variant: TagVariant; icon: string }> = {
  receita: { label: "Receita", variant: "green", icon: "fa-arrow-down-left" },
  despesa: { label: "Despesa", variant: "orange", icon: "fa-arrow-up-right" },
};

/**
 * Cor fixa de cada status (não funcionais do card): Em Aprovação âmbar,
 * Reprovado vermelho, Vigente verde, Encerrado cinza.
 */
export const STATUS: Record<Status, { label: string; variant: TagVariant; icon?: string }> = {
  em_elaboracao: { label: "Em Elaboração", variant: "light-blue", icon: "fa-pen-line" },
  em_aprovacao: { label: "Em Aprovação", variant: "yellow", icon: "fa-hourglass-half" },
  reprovado: { label: "Reprovado", variant: "red", icon: "fa-circle-xmark" },
  pronto_coleta: { label: "Pronto para Coleta", variant: "dark-blue", icon: "fa-signature" },
  em_assinatura: { label: "Em Assinatura", variant: "dark-blue", icon: "fa-paper-plane" },
  vigente: { label: "Vigente", variant: "green", icon: "fa-circle-check" },
  encerrado: { label: "Encerrado", variant: "dark-purple", icon: "fa-box-archive" },
};

export const APROVACAO: Record<Aprovacao, { label: string; variant: TagVariant; icon?: string }> = {
  elaboracao: { label: "Em Elaboração", variant: "light-blue", icon: "fa-pen-line" },
  em_aprovacao: { label: "Em Aprovação", variant: "yellow", icon: "fa-hourglass-half" },
  reprovado: { label: "Reprovado", variant: "red", icon: "fa-circle-xmark" },
  aprovado: { label: "Aprovado", variant: "green", icon: "fa-check" },
};

/** "Aguardando aprovação" é cinza com cadeado: a trava central do produto. */
export const ASSINATURA: Record<Assinatura, { label: string; variant: TagVariant; icon?: string }> = {
  bloqueada: { label: "Aguardando aprovação", variant: "dark-purple", icon: "fa-lock" },
  pronto_coleta: { label: "Pronto para Coleta", variant: "dark-blue", icon: "fa-signature" },
  em_assinatura: { label: "Em Assinatura", variant: "dark-blue", icon: "fa-paper-plane" },
  assinado: { label: "Assinado", variant: "green", icon: "fa-check" },
};

export const ERP: Record<ErpStatus, { label: string; variant: TagVariant; icon: string }> = {
  pendente: { label: "Pendente", variant: "dark-purple", icon: "fa-clock" },
  sincronizado: { label: "Sincronizado", variant: "green", icon: "fa-check" },
  erro: { label: "Erro", variant: "red", icon: "fa-triangle-exclamation" },
  travado: { label: "Trava de Governança", variant: "dark-purple", icon: "fa-lock" },
};

export const CONFORMIDADE: Record<Conformidade, { label: string; variant: TagVariant; icon: string }> = {
  conforme: { label: "Conforme", variant: "green", icon: "fa-check" },
  pendente: { label: "Pendente", variant: "yellow", icon: "fa-clock" },
  nao_conforme: { label: "Não conforme", variant: "red", icon: "fa-xmark" },
};

export const FAIXA: Record<Faixa, { label: string; variant: TagVariant }> = {
  vencido: { label: "Vencido", variant: "red" },
  critico: { label: "Crítico", variant: "red" },
  alerta: { label: "Atenção", variant: "yellow" },
  regular: { label: "Regular", variant: "green" },
};

export const PLATAFORMAS: Plataforma[] = ["Clicksign", "DocuSign", "Gov.br", "ICP-Brasil"];

export const SUBTIPO: Record<ParteSubtipo, string> = {
  operadora: "Operadora ANS",
  particular_pj: "Particular PJ",
  pf: "Pessoa Física",
  liminar: "Liminar Judicial",
  fornecedor_pj: "Fornecedor PJ",
  fornecedor_pf: "Fornecedor PF",
  clt: "CLT",
};

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

/** Faixa de vigência: crítico até 30 dias, atenção de 31 a 90, "Vencido" quando chega a zero. */
export function faixa(fim: string): Faixa {
  const d = diasAte(fim);
  if (d <= 0) return "vencido";
  if (d <= 30) return "critico";
  if (d <= 90) return "alerta";
  return "regular";
}

export const diasLabel = (fim: string) => {
  const d = diasAte(fim);
  return d <= 0 ? "Vencido" : `${d} dia${d === 1 ? "" : "s"}`;
};

/** v1.0 → v1.1 (minor) ou v2.0 (major). Sempre calculado, nunca digitado. */
export function proximaVersao(versao: string, tipo: "minor" | "major") {
  const [maj, min] = versao.replace("v", "").split(".").map(Number) as [number, number];
  return tipo === "major" ? `v${maj + 1}.0` : `v${maj}.${min + 1}`;
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export const parteDe = (data: ContratosData, c: { parteId: string }) => data.partes.find((p) => p.id === c.parteId);
export const dossieDe = (data: ContratosData, contratoId: string) => data.dossie.filter((d) => d.contratoId === contratoId);
/** "100% OK" quando todos os itens do dossiê estão conformes (e há ao menos um). */
export function dossieOk(data: ContratosData, contratoId: string) {
  const itens = dossieDe(data, contratoId);
  return itens.length > 0 && itens.every((i) => i.conformidade === "conforme");
}
export const dossiePendentes = (data: ContratosData, contratoId: string) =>
  dossieDe(data, contratoId).filter((i) => i.conformidade !== "conforme").length;

export const vigentes = (data: ContratosData) => data.contratos.filter((c) => c.status === "vigente");

/* ------------------------------------------------------------------ */
/* Health Score                                                        */
/* ------------------------------------------------------------------ */

/** Pesos dos pilares e a penalidade por contrato vencido. */
export const SCORE_PESOS = { vigencia: 40, dossie: 35, digital: 25, penalidadeVencido: 3 };

export type Pilar = { id: "vigencia" | "dossie" | "digital"; label: string; pct: number; peso: number; pontos: number };
export type Score = { score: number; label: string; variant: "green" | "yellow" | "red"; pilares: Pilar[]; vencidos: number; penalidade: number; bruto: number; total: number };

/**
 * Health Score da carteira, de 10 a 100: soma das parcelas dos três pilares
 * (percentual dos Vigentes × peso) menos a penalidade por contrato vencido.
 * A soma exibida em "Entenda o Score" bate com o score.
 */
export function healthScore(data: ContratosData): Score | null {
  const vs = vigentes(data);
  if (vs.length === 0) return null;
  const pct = (n: number) => Math.round((n / vs.length) * 100);
  const seguros = vs.filter((c) => faixa(c.fim) === "regular" || faixa(c.fim) === "alerta").length;
  const completos = vs.filter((c) => dossieOk(data, c.id)).length;
  const digitais = vs.filter((c) => c.assinadoDigital).length;
  const mk = (id: Pilar["id"], label: string, n: number, peso: number): Pilar => ({ id, label, pct: pct(n), peso, pontos: Math.round((n / vs.length) * peso) });
  const pilares = [
    mk("vigencia", "Vigência Segura", seguros, SCORE_PESOS.vigencia),
    mk("dossie", "Dossiê", completos, SCORE_PESOS.dossie),
    mk("digital", "Formalização Digital", digitais, SCORE_PESOS.digital),
  ];
  const vencidos = vs.filter((c) => faixa(c.fim) === "vencido").length;
  const penalidade = vencidos * SCORE_PESOS.penalidadeVencido;
  const bruto = pilares.reduce((s, p) => s + p.pontos, 0);
  const score = Math.max(10, Math.min(100, bruto - penalidade));
  const [label, variant] = score >= 85 ? ["Saudável", "green"] as const : score >= 65 ? ["Atenção", "yellow"] as const : ["Risco", "red"] as const;
  return { score, label, variant, pilares, vencidos, penalidade, bruto, total: vs.length };
}

/** Os indicadores do painel e da esteira, calculados do mesmo jeito nos dois lugares. */
export function indicadores(data: ContratosData) {
  const vs = vigentes(data);
  const pct = (n: number) => (vs.length ? Math.round((n / vs.length) * 100) : 0);
  const criticos = vs.filter((c) => ["vencido", "critico"].includes(faixa(c.fim))).length;
  const alerta = vs.filter((c) => faixa(c.fim) === "alerta").length;
  const runRate = (f: Fluxo) => vs.filter((c) => c.fluxo === f).reduce((s, c) => s + (c.valor ?? 0), 0);
  return {
    ativos: vs.length,
    criticos,
    alerta,
    dossiePct: pct(vs.filter((c) => dossieOk(data, c.id)).length),
    digitalPct: pct(vs.filter((c) => c.assinadoDigital).length),
    docsCobranca: data.cobrancas.length,
    docsPendentes: data.cobrancas.filter((c) => c.conferencia === "pendente").length,
    receitas: runRate("receita"),
    despesas: runRate("despesa"),
    porFase: Object.fromEntries(FASES.map((f) => [f.id, data.contratos.filter((c) => c.fase === f.id).length])) as Record<Fase, number>,
  };
}

/* ------------------------------------------------------------------ */
/* Dicionário de tags e blocos jurídicos das minutas                   */
/* ------------------------------------------------------------------ */

export type TagMinuta = { tag: string; descricao: string; exemplo?: string };
export const TAGS_MINUTA: { categoria: string; tags: TagMinuta[] }[] = [
  {
    categoria: "Parte",
    tags: [
      { tag: "parte.nome", descricao: "Razão social ou nome", exemplo: "Clínica Integrar Terapias Ltda." },
      { tag: "parte.documento", descricao: "CNPJ ou CPF", exemplo: "12.345.678/0001-90" },
      { tag: "parte.endereco", descricao: "Endereço completo", exemplo: "Rua das Acácias, 120, Curitiba/PR" },
      { tag: "parte.representante", descricao: "Representante legal", exemplo: "Ana Beatriz Lemos" },
      { tag: "parte.email", descricao: "E-mail de contato", exemplo: "contratos@integrar.exemplo" },
      { tag: "parte.conselho", descricao: "Conselho e registro do responsável técnico" },
    ],
  },
  {
    categoria: "Contrato",
    tags: [
      { tag: "contrato.codigo", descricao: "Código do contrato", exemplo: "CT-2026-013" },
      { tag: "contrato.objeto", descricao: "Objeto do contrato", exemplo: "prestação de serviços de terapia ocupacional" },
      { tag: "contrato.categoria", descricao: "Categoria", exemplo: "PJ Assistencial" },
      { tag: "contrato.unidades", descricao: "Unidades atendidas", exemplo: "Unidade Jardim e Unidade Girassol" },
      { tag: "contrato.foro", descricao: "Comarca do foro", exemplo: "Curitiba/PR" },
      { tag: "contrato.data_assinatura", descricao: "Data da assinatura" },
    ],
  },
  {
    categoria: "Financeiro",
    tags: [
      { tag: "financeiro.valor", descricao: "Valor mensal", exemplo: "R$ 18.500,00" },
      { tag: "financeiro.valor_extenso", descricao: "Valor por extenso", exemplo: "dezoito mil e quinhentos reais" },
      { tag: "financeiro.forma", descricao: "Forma de pagamento", exemplo: "Transferência bancária" },
      { tag: "financeiro.condicao", descricao: "Condição de pagamento", exemplo: "30 dias após a nota" },
      { tag: "financeiro.vencimento", descricao: "Dia do vencimento", exemplo: "10" },
      { tag: "financeiro.banco", descricao: "Dados bancários da parte" },
    ],
  },
  {
    categoria: "Vigência",
    tags: [
      { tag: "vigencia.inicio", descricao: "Início da vigência", exemplo: "01/08/2026" },
      { tag: "vigencia.fim", descricao: "Fim da vigência", exemplo: "31/07/2027" },
      { tag: "vigencia.prazo", descricao: "Prazo em meses", exemplo: "12 (doze) meses" },
      { tag: "vigencia.indice", descricao: "Índice de reajuste", exemplo: "IPCA" },
      { tag: "vigencia.data_base", descricao: "Data-base do reajuste", exemplo: "01/08/2027" },
      { tag: "vigencia.aviso_previo", descricao: "Dias de aviso prévio", exemplo: "30 (trinta)" },
    ],
  },
];

export const BLOCOS_JURIDICOS: { id: string; label: string; texto: string }[] = [
  { id: "preambulo", label: "Preâmbulo", texto: "Pelo presente instrumento particular, de um lado {{parte.nome}}, inscrita sob o nº {{parte.documento}}, doravante CONTRATADA, e de outro a CONTRATANTE, têm entre si justo e contratado o que segue." },
  { id: "clausula", label: "Cláusula", texto: "CLÁUSULA Xª — TÍTULO\nTexto da cláusula." },
  { id: "paragrafo", label: "Parágrafo §", texto: "§ 1º Texto do parágrafo." },
  { id: "unico", label: "Parágrafo Único", texto: "Parágrafo único. Texto do parágrafo." },
  { id: "alineas", label: "Alíneas", texto: "a) primeira hipótese;\nb) segunda hipótese;\nc) terceira hipótese." },
  { id: "lgpd", label: "LGPD", texto: "As partes tratarão os dados pessoais a que tiverem acesso exclusivamente para a execução deste contrato, nos termos da Lei nº 13.709/2018 (LGPD), adotando medidas de segurança adequadas." },
  { id: "anticorrupcao", label: "Anticorrupção", texto: "As partes declaram conhecer a Lei nº 12.846/2013 e se comprometem a não praticar atos lesivos à administração pública, nacional ou estrangeira." },
  { id: "foro", label: "Foro", texto: "Fica eleito o foro da comarca de {{contrato.foro}} para dirimir as questões oriundas deste contrato, com renúncia a qualquer outro." },
];

/** Troca as tags `{{x.y}}` pelo exemplo; sem exemplo, devolve `null` na posição (variável não preenchida). */
export function simular(texto: string): { trecho: string; tag?: string; valor?: string | null }[] {
  const exemplos = new Map(TAGS_MINUTA.flatMap((c) => c.tags).map((t) => [t.tag, t.exemplo ?? null]));
  const partes: { trecho: string; tag?: string; valor?: string | null }[] = [];
  let last = 0;
  for (const m of texto.matchAll(/\{\{([a-z_.]+)\}\}/g)) {
    if (m.index! > last) partes.push({ trecho: texto.slice(last, m.index) });
    partes.push({ trecho: m[0], tag: m[1], valor: exemplos.get(m[1]!) ?? null });
    last = m.index! + m[0].length;
  }
  if (last < texto.length) partes.push({ trecho: texto.slice(last) });
  return partes;
}

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
