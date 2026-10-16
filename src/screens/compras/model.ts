/**
 * Sistema de compras — o modelo do protótipo: papéis, etapas, alçadas e a
 * solicitação que atravessa o fluxo da unidade até a chegada do material.
 */

/* ================================================================== *
 * Papéis
 * ================================================================== */

export type Papel = "requisitante" | "aprovador" | "comprador" | "financeiro" | "cfo";

/**
 * Compras, Financeiro e CFO não são papéis do Phoenix. Cada papel usa a persona
 * mais próxima, para o menu, e soma as permissões `purchases.*`, que são novas.
 */
export const PAPEIS: Record<Papel, { label: string; persona: string; permissions: string[] }> = {
  requisitante: { label: "Requisitante", persona: "therapeutic_companion", permissions: ["purchases.request", "purchases.confirm_arrival"] },
  aprovador: {
    label: "Aprovador da unidade",
    persona: "coordinator",
    permissions: ["purchases.request", "purchases.approve_unit", "purchases.confirm_arrival"],
  },
  comprador: {
    label: "Compras",
    persona: "operation",
    permissions: ["purchases.queue", "purchases.quote", "purchases.issue_order", "purchases.register", "purchases.link_invoice", "purchases.confirm_arrival"],
  },
  financeiro: {
    label: "Financeiro",
    persona: "operation",
    permissions: ["purchases.approve_finance", "purchases.register", "purchases.link_invoice", "purchases.configure_limits"],
  },
  cfo: { label: "CFO", persona: "admin", permissions: ["purchases.approve_cfo", "purchases.configure_limits"] },
};

export type Pessoa = { nome: string; cargo: string };

export const PESSOAS = {
  juliana: { nome: "Juliana Prado", cargo: "Terapeuta" },
  bruno: { nome: "Bruno Lacerda", cargo: "Fonoaudiólogo" },
  camila: { nome: "Camila Rezende", cargo: "Terapeuta" },
  marina: { nome: "Marina Alves", cargo: "Coordenação" },
  renato: { nome: "Renato Dias", cargo: "Supervisão" },
  livia: { nome: "Lívia Campos", cargo: "Coordenação" },
  paulo: { nome: "Paulo Siqueira", cargo: "Supervisão" },
  ana: { nome: "Ana Basdadjian", cargo: "Compras" },
  rodrigo: { nome: "Rodrigo Kubo", cargo: "Financeiro" },
  rafael: { nome: "Rafael Morgado", cargo: "CFO" },
} satisfies Record<string, Pessoa>;

/**
 * Coordenação e supervisão de cada unidade, nessa ordem. Quem aprova é a
 * primeira pessoa da lista que não fez o pedido (proposta P-01): ninguém
 * aprova o próprio pedido.
 */
export const APROVADORES: Record<string, Pessoa[]> = {
  "Unidade Jardim": [PESSOAS.marina, PESSOAS.renato],
  "Unidade Girassol": [PESSOAS.livia, PESSOAS.paulo],
};

export function aprovadorPara(unidade: string, requisitante: Pessoa): Pessoa {
  const lista = APROVADORES[unidade] ?? [PESSOAS.marina];
  return lista.find((p) => p.nome !== requisitante.nome) ?? lista[0]!;
}

/** Quem está logado em cada visão. */
export const USUARIO: Record<Papel, Pessoa & { unidades: string[] }> = {
  requisitante: { ...PESSOAS.juliana, unidades: ["Unidade Jardim"] },
  aprovador: { ...PESSOAS.marina, unidades: ["Unidade Jardim"] },
  comprador: { ...PESSOAS.ana, unidades: ["Corporativo"] },
  financeiro: { ...PESSOAS.rodrigo, unidades: ["Corporativo"] },
  cfo: { ...PESSOAS.rafael, unidades: ["Corporativo"] },
};

/* ================================================================== *
 * Etapas
 * ================================================================== */

export type Etapa =
  | "aprovacao_unidade"
  | "ajuste"
  | "reprovada"
  | "cotacao"
  | "alcada_financeiro"
  | "alcada_cfo"
  | "pedido_reprovado"
  | "pedido_aprovado"
  | "aguardando_nota"
  | "chegada"
  | "divergencia"
  | "cancelada"
  | "concluida";

/** Os passos do cabeçalho de etapa, na ordem do fluxo. */
export const PASSOS = ["Solicitação", "Aprovação da unidade", "Cotação", "Pedido", "Nota fiscal", "Chegada"] as const;

type TagTone = "light-blue" | "yellow" | "red" | "orange" | "green" | "light-purple" | "dark-purple";

export const ETAPAS: Record<Etapa, { label: string; passo: number; tone: TagTone; encerrada?: boolean }> = {
  ajuste: { label: "Devolvida para ajuste", passo: 0, tone: "orange" },
  aprovacao_unidade: { label: "Aprovação da unidade", passo: 1, tone: "yellow" },
  reprovada: { label: "Reprovada", passo: 1, tone: "red", encerrada: true },
  cotacao: { label: "Em cotação", passo: 2, tone: "light-blue" },
  alcada_financeiro: { label: "Aprovação do Financeiro", passo: 3, tone: "yellow" },
  alcada_cfo: { label: "Aprovação do CFO", passo: 3, tone: "yellow" },
  pedido_reprovado: { label: "Pedido reprovado", passo: 3, tone: "red", encerrada: true },
  pedido_aprovado: { label: "Pedido aprovado", passo: 3, tone: "light-purple" },
  aguardando_nota: { label: "Aguardando nota", passo: 4, tone: "light-blue" },
  chegada: { label: "Chegada a confirmar", passo: 5, tone: "yellow" },
  divergencia: { label: "Divergência registrada", passo: 5, tone: "red" },
  cancelada: { label: "Cancelada", passo: 1, tone: "dark-purple", encerrada: true },
  concluida: { label: "Concluída", passo: 6, tone: "green", encerrada: true },
};

/** Grupos da fila do comprador (RF-04). */
export const GRUPOS_FILA: { id: string; title: string; etapas: Etapa[]; vazio: string }[] = [
  { id: "cotar", title: "Cotar", etapas: ["cotacao"], vazio: "Nenhuma solicitação para cotar." },
  { id: "alcada", title: "Aguardando aprovação de alçada", etapas: ["alcada_financeiro", "alcada_cfo"], vazio: "Nenhum pedido esperando alçada." },
  { id: "nota", title: "Aguardando nota", etapas: ["pedido_aprovado", "aguardando_nota"], vazio: "Nenhum pedido esperando nota." },
  { id: "chegada", title: "Aguardando confirmação de chegada", etapas: ["chegada", "divergencia"], vazio: "Nenhuma chegada pendente." },
];

/* ================================================================== *
 * Cadastros
 * ================================================================== */

export type Fornecedor = { id: string; razao: string; cnpj: string; contato?: string; telefone?: string };

export type Item = { id: string; nome: string; unidade: string };

/* ================================================================== *
 * Solicitação, cotação, pedido, nota
 * ================================================================== */

export type Cotacao = {
  fornecedorId: string;
  /** Fornecedor cotado sem cadastro (RN-05): o cadastro vem depois, pela nota. */
  semCadastro?: string;
  /** Preço unitário cotado. */
  unitario: number;
  /** Preço unitário depois da negociação, quando houve. */
  negociado?: number;
  frete: number;
  prazoDias: number;
  pagamento: string;
  obs?: string;
};

export type Nivel = "compras" | "financeiro" | "cfo";

export type Pedido = {
  numero: string;
  fornecedorId: string;
  valor: number;
  emitidoEm: string;
  /** Nível que precisa aprovar, calculado na emissão. */
  nivel: Nivel;
  motivoNivel: string;
  previsao?: string;
};

export type Nota = {
  numero: string;
  serie: string;
  cnpj: string;
  razao: string;
  valor: number;
  emitidaEm: string;
  itens: { descricao: string; quantidade: number; unitario: number; itemId?: string }[];
  /** O fornecedor da nota não tem cadastro. */
  fornecedorNovo?: boolean;
  arquivo: string;
};

export type Evento = {
  quando: string;
  quem: Pessoa;
  acao: string;
  motivo?: string;
  icon: string;
  color?: "blue" | "green";
};

export type Solicitacao = {
  id: string;
  item: string;
  /** O item do catálogo; sem ele, o item ainda não tem cadastro. */
  itemId?: string;
  quantidade: number;
  unidadeMedida: string;
  dataDesejada: string;
  unidade: string;
  requisitante: Pessoa;
  aprovador: Pessoa;
  criadaEm: string;
  orcamento?: { nome: string; tamanho: number };
  etapa: Etapa;
  /** Desde quando a solicitação está na etapa atual. */
  desde: string;
  motivo?: string;
  cotacoes?: Cotacao[];
  vencedor?: string;
  justificativa?: string;
  pedido?: Pedido;
  nota?: Nota;
  chegada?: { ok: boolean; tipos?: string[]; descricao?: string; quem: Pessoa; quando: string };
  /** Entrega parcial (proposta P-03): quanto já chegou, até chegar o resto. */
  recebido?: number;
  /** Por que a nota foi vinculada com valor diferente do pedido (proposta P-02). */
  notaJustificativa?: string;
  historico: Evento[];
};

/** As unidades de medida que a solicitação aceita. */
export const UNIDADES_MEDIDA = ["unidade", "kit", "pote", "frasco", "caixa", "pacote", "resma", "placa", "metro"];

/** Plural simples das unidades de medida: "12 potes", "1 resma". */
export const comUnidade = (quantidade: number, unidade: string) => `${quantidade} ${unidade}${quantidade > 1 ? "s" : ""}`;

/**
 * Proposta P-02: diferença entre a nota e o pedido que vincula sem justificativa
 * (arredondamento, centavos de frete). Acima disso, pede justificativa.
 */
export const TOLERANCIA_NOTA = 10;

/** Proposta P-05: a entrega prevista pelo prazo do fornecedor passa da data desejada? */
export function entregaEm(prazoDias: number, de = TODAY): string {
  const d = new Date(`${de}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + prazoDias);
  return d.toISOString().slice(0, 10);
}

/** Etapas antes de a solicitação chegar a Compras (proposta P-06: Compras não as vê). */
export const ANTES_DE_COMPRAS: Etapa[] = ["aprovacao_unidade", "ajuste", "reprovada", "cancelada"];

/**
 * A nota chegou mas não dá para vincular sem alguém agir: fornecedor ou item
 * sem cadastro (RN-05) ou valor diferente do pedido (P-02). É a fila de notas
 * do Financeiro e de Compras.
 */
export function notaPendente(s: Solicitacao): boolean {
  if (s.etapa !== "aguardando_nota" || !s.nota || !s.pedido) return false;
  return Boolean(s.nota.fornecedorNovo) || s.nota.itens.some((i) => !i.itemId) || Math.abs(s.nota.valor - s.pedido.valor) > TOLERANCIA_NOTA;
}

/* ================================================================== *
 * Alçadas
 * ================================================================== */

export type Limite = { pedido: number; mes: number; ano: number };

export type Alcadas = {
  compras: Limite;
  financeiro: Limite;
  /** Quanto cada nível já aprovou no mês e no ano. */
  consumo: Record<"compras" | "financeiro", { mes: number; ano: number }>;
  historico: Evento[];
};

export const NIVEIS: Record<Nivel, { label: string; quem: Pessoa; etapa?: Etapa }> = {
  compras: { label: "Compras", quem: PESSOAS.ana },
  financeiro: { label: "Financeiro", quem: PESSOAS.rodrigo, etapa: "alcada_financeiro" },
  cfo: { label: "CFO", quem: PESSOAS.rafael, etapa: "alcada_cfo" },
};

/**
 * RN-06 e RN-07: o primeiro nível cujo limite por pedido, do mês e do ano
 * comporta o valor. O CFO não tem limite.
 */
export function nivelDoPedido(valor: number, a: Alcadas): { nivel: Nivel; motivo: string } {
  const estouro = (n: "compras" | "financeiro") => {
    const l = a[n];
    const c = a.consumo[n];
    const de = n === "compras" ? "de Compras" : "do Financeiro";
    if (valor > l.pedido) return `Acima do limite por pedido ${de} (${brl(l.pedido)}).`;
    if (c.mes + valor > l.mes) return `Somaria ${brl(c.mes + valor)} no mês, acima do limite mensal ${de} (${brl(l.mes)}).`;
    if (c.ano + valor > l.ano) return `Somaria ${brl(c.ano + valor)} no ano, acima do limite anual ${de} (${brl(l.ano)}).`;
    return null;
  };
  const compras = estouro("compras");
  if (!compras) return { nivel: "compras", motivo: "Dentro do limite de Compras: o pedido já sai aprovado." };
  const financeiro = estouro("financeiro");
  if (!financeiro) return { nivel: "financeiro", motivo: compras };
  return { nivel: "cfo", motivo: financeiro };
}

/* ================================================================== *
 * Formatação
 * ================================================================== */

export const TODAY = "2026-10-15";

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** `2026-10-15` → `15/10/2026`; com hora, `15/10/2026 às 09:12`. */
export function br(iso: string): string {
  const [date, time] = iso.split("T");
  const [y, m, d] = date!.split("-");
  return time ? `${d}/${m}/${y} às ${time.slice(0, 5)}` : `${d}/${m}/${y}`;
}

/** "há 3 dias", contado de `TODAY`. */
export function ha(iso: string): string {
  const days = Math.round((Date.parse(TODAY) - Date.parse(iso.slice(0, 10))) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

export const totalCotacao = (c: Cotacao, quantidade: number) => (c.negociado ?? c.unitario) * quantidade + c.frete;

/** Quem está com a solicitação agora. */
export function responsavel(s: Solicitacao): Pessoa | null {
  switch (s.etapa) {
    case "ajuste":
    case "chegada":
      return s.requisitante;
    case "aprovacao_unidade":
      return s.aprovador;
    case "cotacao":
    case "pedido_aprovado":
    case "aguardando_nota":
    case "divergencia":
      return PESSOAS.ana;
    case "alcada_financeiro":
      return PESSOAS.rodrigo;
    case "alcada_cfo":
      return PESSOAS.rafael;
    default:
      return null;
  }
}
