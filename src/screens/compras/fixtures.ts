/**
 * Sistema de compras — dados sintéticos. Itens, fornecedores, CNPJs, valores e
 * profissionais das unidades são fictícios. Os nomes de Compras, Financeiro e
 * CFO são os de quem ocupa o papel hoje, para a validação com cada um.
 */
import type { Fixture } from "@brucesantos/design-space";
import {
  PESSOAS, type Alcadas, type Cotacao, type Etapa, type Evento, type Fornecedor, type Item, type Nota, type Pedido, type Pessoa, type Solicitacao,
} from "./model.js";

export type ComprasFixture = {
  solicitacoes: Solicitacao[];
  fornecedores: Fornecedor[];
  itens: Item[];
  alcadas: Alcadas;
};

export const FORNECEDORES: Fornecedor[] = [
  { id: "f1", razao: "Lúdica Materiais Pedagógicos Ltda", cnpj: "12.345.678/0001-90", contato: "Renata", telefone: "(11) 3456-7890" },
  { id: "f2", razao: "Casa do Educador Distribuidora Ltda", cnpj: "23.456.789/0001-01", contato: "Márcio", telefone: "(11) 2345-6789" },
  { id: "f3", razao: "Sensorial Brasil Comércio de Brinquedos Ltda", cnpj: "34.567.890/0001-12", contato: "Patrícia", telefone: "(19) 3234-5678" },
  { id: "f4", razao: "EVA Forte Indústria e Comércio Ltda", cnpj: "45.678.901/0001-23", contato: "Leandro", telefone: "(11) 4567-8901" },
  { id: "f5", razao: "Escritório Prime Papelaria Ltda", cnpj: "56.789.012/0001-34", contato: "Sílvia", telefone: "(11) 3567-8012" },
  { id: "f6", razao: "Movimento Kids Equipamentos Ltda", cnpj: "67.890.123/0001-45", contato: "Diego", telefone: "(41) 3678-9012" },
];

export const ITENS: Item[] = [
  { id: "i1", nome: "Massinha de modelar atóxica 150 g", unidade: "pote" },
  { id: "i2", nome: "Cronômetro visual 20 cm", unidade: "unidade" },
  { id: "i3", nome: "Cadeira infantil regulável", unidade: "unidade" },
  { id: "i4", nome: "Kit de comunicação alternativa (PECS)", unidade: "kit" },
  { id: "i5", nome: "Tatame EVA 1 x 1 m, 20 mm", unidade: "placa" },
  { id: "i6", nome: "Balanço de integração sensorial com suporte", unidade: "unidade" },
  { id: "i7", nome: "Mesa de atividades infantil redonda", unidade: "unidade" },
  { id: "i8", nome: "Kit de circuito psicomotor", unidade: "kit" },
  { id: "i9", nome: "Papel sulfite A4 75 g", unidade: "resma" },
  { id: "i10", nome: "Fone abafador de ruído infantil", unidade: "unidade" },
  { id: "i11", nome: "Blocos de encaixe grandes", unidade: "kit" },
  { id: "i12", nome: "Jogo da memória de emoções", unidade: "unidade" },
  { id: "i13", nome: "Tinta guache atóxica, kit 6 cores", unidade: "kit" },
  { id: "i14", nome: "Bambolê colorido 60 cm", unidade: "unidade" },
];

const JARDIM = { unidade: "Unidade Jardim", aprovador: PESSOAS.marina };
const GIRASSOL = { unidade: "Unidade Girassol", aprovador: PESSOAS.paulo };

const ev = (quando: string, quem: Pessoa, acao: string, icon: string, extra: Partial<Evento> = {}): Evento => ({ quando, quem, acao, icon, ...extra });

/** Soma dias a uma data-hora ISO, mantendo a hora. */
const plus = (iso: string, days: number, time = "10:00") => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.toISOString().slice(0, 10)}T${time}`;
};

type Base = Omit<Solicitacao, "historico" | "desde"> & { historico?: Evento[] };

/**
 * O histórico de cada solicitação, gerado do caminho que ela percorreu até a
 * etapa atual, e a data em que entrou nela.
 */
function comHistorico(s: Base): Solicitacao {
  const h: Evento[] = [ev(s.criadaEm, s.requisitante, "Criou a solicitação", "fa-plus", { color: "blue" })];
  let t = s.criadaEm;
  const step = (days: number, quem: Pessoa, acao: string, icon: string, extra: Partial<Evento> = {}) => {
    t = plus(t, days, ["09:12", "10:40", "14:05", "16:30"][h.length % 4]);
    h.push(ev(t, quem, acao, icon, extra));
  };
  const ordem: Etapa[] = ["aprovacao_unidade", "cotacao", "alcada_financeiro", "pedido_aprovado", "aguardando_nota", "chegada", "concluida"];
  const ate = (e: Etapa) => ordem.indexOf(e);
  const alvo: Etapa =
    s.etapa === "ajuste" || s.etapa === "reprovada" ? "aprovacao_unidade"
    : s.etapa === "alcada_cfo" || s.etapa === "pedido_reprovado" ? "alcada_financeiro"
    : s.etapa === "divergencia" ? "concluida"
    : s.etapa;

  if (s.etapa === "ajuste") step(1, s.aprovador, "Devolveu para ajuste", "fa-arrow-rotate-left", { motivo: s.motivo });
  if (s.etapa === "reprovada") step(1, s.aprovador, "Reprovou a solicitação", "fa-xmark", { motivo: s.motivo });
  if (ate(alvo) >= 1) step(1, s.aprovador, "Aprovou a solicitação", "fa-check", { color: "green" });
  if (ate(alvo) >= 2 && s.pedido) {
    t = s.pedido.emitidoEm;
    h.push(ev(t, PESSOAS.ana, `Emitiu o pedido ${s.pedido.numero} com ${s.cotacoes?.length ?? 3} cotações`, "fa-file-invoice"));
    if (s.pedido.nivel !== "compras") step(0, PESSOAS.ana, `Pedido enviado para aprovação do ${s.pedido.nivel === "cfo" ? "CFO" : "Financeiro"}`, "fa-arrow-up", { motivo: s.pedido.motivoNivel });
  }
  if (ate(alvo) >= 3 && s.pedido) {
    if (s.pedido.nivel === "compras") step(0, PESSOAS.ana, "Pedido aprovado na alçada de Compras", "fa-check", { color: "green" });
    else step(1, s.pedido.nivel === "cfo" ? PESSOAS.rafael : PESSOAS.rodrigo, "Aprovou o pedido", "fa-check", { color: "green" });
  }
  if (ate(alvo) >= 4) step(1, PESSOAS.ana, "Confirmou a compra com o fornecedor", "fa-handshake");
  if (s.etapa === "pedido_reprovado" && s.pedido) {
    const quem = s.pedido.nivel === "cfo" ? PESSOAS.rafael : PESSOAS.rodrigo;
    step(2, quem, `Reprovou o pedido ${s.pedido.numero}`, "fa-xmark", { motivo: s.motivo });
  }
  if (ate(alvo) >= 5 && s.nota) {
    t = plus(s.nota.emitidaEm, 1, "09:12");
    h.push(ev(t, PESSOAS.ana, `Vinculou a nota ${s.nota.numero} ao pedido`, "fa-file-lines"));
  }
  if (s.recebido !== undefined) {
    t = plus(t, 2, "15:20");
    h.push(ev(t, s.requisitante, `Registrou entrega parcial: chegaram ${s.recebido} de ${s.quantidade}`, "fa-box-open"));
  }
  if (s.chegada) {
    t = s.chegada.quando;
    h.push(s.chegada.ok
      ? ev(t, s.chegada.quem, "Confirmou a chegada: chegou tudo certo", "fa-box-check", { color: "green" })
      : ev(t, s.chegada.quem, "Registrou divergência na chegada", "fa-triangle-exclamation", { motivo: s.chegada.descricao }));
  }

  return { ...s, historico: [...h, ...(s.historico ?? [])].reverse(), desde: t };
}

const cot = (fornecedorId: string, unitario: number, frete: number, prazoDias: number, pagamento: string, extra: Partial<Cotacao> = {}): Cotacao =>
  ({ fornecedorId, unitario, frete, prazoDias, pagamento, ...extra });

const pedido = (numero: string, fornecedorId: string, valor: number, nivel: Pedido["nivel"], motivoNivel: string, emitidoEm: string, previsao?: string): Pedido =>
  ({ numero, fornecedorId, valor, nivel, motivoNivel, emitidoEm, previsao });

const nota = (numero: string, f: Fornecedor | { razao: string; cnpj: string }, valor: number, emitidaEm: string, itens: Nota["itens"], extra: Partial<Nota> = {}): Nota =>
  ({ numero, serie: "1", cnpj: f.cnpj, razao: f.razao, valor, emitidaEm, itens, arquivo: `NFe-${numero.replace(".", "")}.xml`, ...extra });

const F = Object.fromEntries(FORNECEDORES.map((f) => [f.id, f])) as Record<string, Fornecedor>;

const MOTIVO_COMPRAS = "Acima do limite por pedido de Compras (R$ 2.000,00).";
const MOTIVO_FIN = "Acima do limite por pedido do Financeiro (R$ 10.000,00).";

const BASES: Base[] = [
  // Aprovação da unidade
  {
    id: "SC-0156", item: "Massinha de modelar atóxica 150 g", itemId: "i1", quantidade: 12, unidadeMedida: "pote", dataDesejada: "2026-10-24",
    ...JARDIM, requisitante: PESSOAS.juliana, criadaEm: "2026-10-14T13:48", orcamento: { nome: "orcamento-papelaria-centro.pdf", tamanho: 184_000 },
    etapa: "aprovacao_unidade",
  },
  {
    id: "SC-0155", item: "Cronômetro visual 20 cm", itemId: "i2", quantidade: 2, unidadeMedida: "unidade", dataDesejada: "2026-10-31",
    ...JARDIM, requisitante: PESSOAS.bruno, criadaEm: "2026-10-13T17:20", etapa: "aprovacao_unidade",
  },
  // O próprio aprovador pede: quem aprova é a supervisão (proposta P-01)
  {
    id: "SC-0151", item: "Fichário A4 com 4 argolas", quantidade: 10, unidadeMedida: "unidade", dataDesejada: "2026-10-29",
    unidade: "Unidade Jardim", aprovador: PESSOAS.renato, requisitante: PESSOAS.marina, criadaEm: "2026-10-14T09:30", etapa: "aprovacao_unidade",
  },
  // Devolvida e reprovada
  {
    id: "SC-0154", item: "Cadeira infantil", itemId: "i3", quantidade: 4, unidadeMedida: "unidade", dataDesejada: "2026-11-05",
    ...JARDIM, requisitante: PESSOAS.juliana, criadaEm: "2026-10-10T09:05", etapa: "ajuste",
    motivo: "Informe o modelo: precisamos da cadeira com altura regulável, igual às da sala 3, para as crianças de 3 a 6 anos.",
  },
  {
    id: "SC-0153", item: "Tablet para comunicação alternativa", quantidade: 1, unidadeMedida: "unidade", dataDesejada: "2026-10-20",
    ...JARDIM, requisitante: PESSOAS.juliana, criadaEm: "2026-10-08T11:30", etapa: "reprovada",
    motivo: "A unidade recebeu dois tablets em setembro, que ficam na sala de CAA. Reserve a sala pela agenda; se faltar horário, me procure.",
  },
  // Cotação
  {
    id: "SC-0150", item: "Kit de comunicação alternativa (PECS)", itemId: "i4", quantidade: 3, unidadeMedida: "kit", dataDesejada: "2026-10-30",
    ...JARDIM, requisitante: PESSOAS.juliana, criadaEm: "2026-10-09T10:15", etapa: "cotacao",
    cotacoes: [
      cot("f1", 389.9, 0, 7, "28 dias", { negociado: 365, obs: "Baixou de R$ 389,90 para R$ 365,00 com frete grátis acima de R$ 1.000." }),
      cot("f2", 412, 25, 5, "À vista"),
      cot("f3", 398, 40, 10, "30/60 dias"),
    ],
    vencedor: "f1",
  },
  {
    id: "SC-0148", item: "Tatame EVA 1 x 1 m, 20 mm", itemId: "i5", quantidade: 40, unidadeMedida: "placa", dataDesejada: "2026-11-10",
    ...JARDIM, requisitante: PESSOAS.bruno, criadaEm: "2026-10-07T15:00", etapa: "cotacao",
    cotacoes: [
      cot("f4", 162, 120, 12, "28 dias", { negociado: 155, obs: "Desconto de 4% para 40 placas." }),
      cot("f6", 171, 0, 30, "30 dias"),
      cot("f2", 168, 90, 8, "À vista"),
    ],
    vencedor: "f4",
  },
  {
    id: "SC-0152", item: "Balanço de integração sensorial com suporte", itemId: "i6", quantidade: 2, unidadeMedida: "unidade", dataDesejada: "2026-11-30",
    ...GIRASSOL, requisitante: PESSOAS.camila, criadaEm: "2026-10-06T08:40", etapa: "cotacao",
    cotacoes: [cot("f6", 9_200, 480, 30, "30/60/90 dias", { obs: "Inclui instalação." }), cot("f3", 9_850, 0, 45, "30 dias")],
    vencedor: "f6",
    justificativa: "Fornecedor único: só dois fabricantes vendem o balanço com suporte certificado para uso clínico.",
  },
  {
    id: "SC-0157", item: "Bolhas de sabão, refil 1 L", quantidade: 6, unidadeMedida: "frasco", dataDesejada: "2026-10-28",
    ...GIRASSOL, requisitante: PESSOAS.camila, criadaEm: "2026-10-12T14:10", etapa: "cotacao",
    cotacoes: [cot("f1", 24.9, 18, 5, "28 dias")],
  },
  // Alçada
  {
    id: "SC-0147", item: "Mesa de atividades infantil redonda", itemId: "i7", quantidade: 6, unidadeMedida: "unidade", dataDesejada: "2026-11-15",
    ...JARDIM, requisitante: PESSOAS.juliana, criadaEm: "2026-10-01T09:30", etapa: "alcada_financeiro",
    cotacoes: [cot("f6", 790, 150, 20, "30 dias", { negociado: 790 }), cot("f2", 845, 0, 15, "28 dias"), cot("f1", 820, 120, 18, "À vista")],
    vencedor: "f6", pedido: pedido("PC-000322", "f6", 4_890, "financeiro", MOTIVO_COMPRAS, "2026-10-08T14:05"),
  },
  {
    id: "SC-0146", item: "Kit de circuito psicomotor", itemId: "i8", quantidade: 3, unidadeMedida: "kit", dataDesejada: "2026-12-01",
    ...GIRASSOL, requisitante: PESSOAS.camila, criadaEm: "2026-09-29T10:00", etapa: "alcada_cfo",
    cotacoes: [cot("f6", 4_250, 0, 25, "30/60/90 dias"), cot("f3", 4_480, 200, 30, "30/60 dias"), cot("f4", 4_390, 350, 20, "28 dias")],
    vencedor: "f6", pedido: pedido("PC-000320", "f6", 12_750, "cfo", MOTIVO_FIN, "2026-10-06T16:30"),
  },
  // Pedido aprovado e nota
  {
    id: "SC-0145", item: "Papel sulfite A4 75 g", itemId: "i9", quantidade: 20, unidadeMedida: "resma", dataDesejada: "2026-10-22",
    ...GIRASSOL, requisitante: PESSOAS.camila, criadaEm: "2026-10-09T08:15", etapa: "pedido_aprovado",
    cotacoes: [cot("f5", 27.99, 0, 3, "28 dias"), cot("f2", 29.5, 15, 4, "À vista"), cot("f1", 31, 0, 7, "28 dias")],
    vencedor: "f5", pedido: pedido("PC-000321", "f5", 559.8, "compras", "Dentro do limite de Compras: o pedido já sai aprovado.", "2026-10-13T09:12"),
  },
  {
    id: "SC-0144", item: "Fone abafador de ruído infantil", itemId: "i10", quantidade: 5, unidadeMedida: "unidade", dataDesejada: "2026-10-20",
    ...JARDIM, requisitante: PESSOAS.bruno, criadaEm: "2026-09-30T16:00", etapa: "aguardando_nota",
    cotacoes: [cot("f3", 249, 0, 7, "28 dias"), cot("f1", 265, 20, 5, "À vista"), cot("f2", 259, 30, 6, "28 dias")],
    vencedor: "f3", pedido: pedido("PC-000318", "f3", 1_245, "compras", "Dentro do limite de Compras: o pedido já sai aprovado.", "2026-10-03T10:40", "2026-10-14"),
    nota: nota("45.902", F.f3!, 1_245, "2026-10-14", [{ descricao: "FONE ABAFADOR RUIDO INFANTIL AZUL", quantidade: 5, unitario: 249, itemId: "i10" }]),
  },
  {
    id: "SC-0143", item: "Pincel atóxico cerdas macias, kit com 6", quantidade: 10, unidadeMedida: "kit", dataDesejada: "2026-10-25",
    ...GIRASSOL, requisitante: PESSOAS.camila, criadaEm: "2026-10-01T11:00", etapa: "aguardando_nota",
    cotacoes: [cot("f1", 42, 25, 5, "28 dias"), cot("x1", 37.5, 0, 3, "À vista", { semCadastro: "Arte & Cia Suprimentos Escolares Ltda", obs: "Cotado por telefone." })],
    justificativa: "Fornecedor único: só dois fornecedores entregam na região esta semana, e a oficina de artes começa dia 20.",
    vencedor: "x1", pedido: pedido("PC-000319", "x1", 375, "compras", "Dentro do limite de Compras: o pedido já sai aprovado.", "2026-10-05T14:05", "2026-10-13"),
    nota: nota("1.187", { razao: "Arte & Cia Suprimentos Escolares Ltda", cnpj: "78.901.234/0001-56" }, 375, "2026-10-13",
      [{ descricao: "KIT PINCEL ATOXICO C/6 CERDAS MACIAS", quantidade: 10, unitario: 37.5 }], { fornecedorNovo: true }),
  },
  // Nota com valor diferente do pedido (proposta P-02)
  {
    id: "SC-0142", item: "Tinta guache atóxica, kit 6 cores", itemId: "i13", quantidade: 15, unidadeMedida: "kit", dataDesejada: "2026-10-21",
    ...JARDIM, requisitante: PESSOAS.bruno, criadaEm: "2026-09-29T10:00", etapa: "aguardando_nota",
    cotacoes: [cot("f1", 38, 0, 5, "28 dias"), cot("f5", 41.5, 0, 3, "À vista"), cot("f2", 39.9, 20, 6, "28 dias")],
    vencedor: "f1", pedido: pedido("PC-000317", "f1", 570, "compras", "Dentro do limite de Compras: o pedido já sai aprovado.", "2026-10-02T16:30", "2026-10-13"),
    nota: nota("45.871", F.f1!, 615, "2026-10-13", [{ descricao: "GUACHE ATOXICO 6 CORES 15ML", quantidade: 15, unitario: 38, itemId: "i13" }]),
  },
  // Pedido reprovado na alçada
  {
    id: "SC-0135", item: "Cama elástica 1,40 m com rede", quantidade: 1, unidadeMedida: "unidade", dataDesejada: "2026-10-30",
    ...GIRASSOL, requisitante: PESSOAS.camila, criadaEm: "2026-09-18T10:00", etapa: "pedido_reprovado",
    cotacoes: [cot("f6", 11_900, 500, 20, "30/60/90 dias"), cot("f3", 12_800, 0, 25, "30 dias"), cot("f4", 12_350, 300, 30, "28 dias")],
    vencedor: "f6", pedido: pedido("PC-000312", "f6", 12_400, "cfo", MOTIVO_FIN, "2026-09-24T14:05"),
    motivo: "A sala de integração da Girassol não tem pé-direito para a cama elástica com rede. Vamos rever o projeto da sala antes de comprar.",
  },
  // Chegada
  {
    id: "SC-0140", item: "Bambolê colorido 60 cm", itemId: "i14", quantidade: 6, unidadeMedida: "unidade", dataDesejada: "2026-10-10",
    ...JARDIM, requisitante: PESSOAS.juliana, criadaEm: "2026-09-19T09:00", etapa: "chegada", recebido: 3,
    cotacoes: [cot("f6", 29.9, 0, 7, "28 dias"), cot("f3", 32, 15, 5, "28 dias"), cot("f1", 31.5, 0, 10, "À vista")],
    vencedor: "f6", pedido: pedido("PC-000313", "f6", 179.4, "compras", "Dentro do limite de Compras: o pedido já sai aprovado.", "2026-09-23T10:40", "2026-10-06"),
    nota: nota("45.044", F.f6!, 179.4, "2026-10-03", [{ descricao: "BAMBOLE COLORIDO 60CM", quantidade: 6, unitario: 29.9, itemId: "i14" }]),
  },
  {
    id: "SC-0141", item: "Blocos de encaixe grandes", itemId: "i11", quantidade: 4, unidadeMedida: "kit", dataDesejada: "2026-10-15",
    ...JARDIM, requisitante: PESSOAS.juliana, criadaEm: "2026-09-22T09:00", etapa: "chegada",
    cotacoes: [cot("f1", 189, 0, 7, "28 dias"), cot("f3", 199, 25, 5, "28 dias"), cot("f2", 205, 0, 10, "À vista")],
    vencedor: "f1", pedido: pedido("PC-000315", "f1", 756, "compras", "Dentro do limite de Compras: o pedido já sai aprovado.", "2026-09-26T10:40", "2026-10-10"),
    nota: nota("45.218", F.f1!, 756, "2026-10-08", [{ descricao: "BLOCOS ENCAIXE GRANDES 60PCS", quantidade: 4, unitario: 189, itemId: "i11" }]),
  },
  {
    id: "SC-0139", item: "Massinha de modelar atóxica 150 g", itemId: "i1", quantidade: 12, unidadeMedida: "pote", dataDesejada: "2026-10-05",
    ...GIRASSOL, requisitante: PESSOAS.camila, criadaEm: "2026-09-15T09:00", etapa: "divergencia",
    cotacoes: [cot("f1", 8.9, 15, 5, "28 dias"), cot("f5", 9.5, 0, 3, "À vista"), cot("f2", 9.2, 10, 4, "28 dias")],
    vencedor: "f1", pedido: pedido("PC-000311", "f1", 121.8, "compras", "Dentro do limite de Compras: o pedido já sai aprovado.", "2026-09-19T14:05", "2026-10-01"),
    nota: nota("44.871", F.f1!, 121.8, "2026-09-29", [{ descricao: "MASSA MODELAR ATOXICA 150G", quantidade: 12, unitario: 8.9, itemId: "i1" }]),
    chegada: { ok: false, tipos: ["Quantidade diferente"], descricao: "Chegaram 8 potes, não 12. A nota cobra os 12.", quem: PESSOAS.camila, quando: "2026-10-09T10:40" },
  },
  {
    id: "SC-0138", item: "Jogo da memória de emoções", itemId: "i12", quantidade: 3, unidadeMedida: "unidade", dataDesejada: "2026-10-01",
    ...JARDIM, requisitante: PESSOAS.juliana, criadaEm: "2026-09-10T14:00", etapa: "concluida",
    cotacoes: [cot("f1", 59.9, 0, 5, "28 dias"), cot("f2", 64, 15, 4, "À vista"), cot("f3", 62.5, 20, 6, "28 dias")],
    vencedor: "f1", pedido: pedido("PC-000309", "f1", 179.7, "compras", "Dentro do limite de Compras: o pedido já sai aprovado.", "2026-09-14T10:40", "2026-09-25"),
    nota: nota("44.502", F.f1!, 179.7, "2026-09-22", [{ descricao: "JOGO MEMORIA EMOCOES 40 PCS", quantidade: 3, unitario: 59.9, itemId: "i12" }]),
    chegada: { ok: true, quem: PESSOAS.marina, quando: "2026-09-26T16:30" },
  },
];

export const SOLICITACOES: Solicitacao[] = BASES.map(comHistorico);

export const ALCADAS: Alcadas = {
  compras: { pedido: 2_000, mes: 15_000, ano: 150_000 },
  financeiro: { pedido: 10_000, mes: 60_000, ano: 600_000 },
  consumo: { compras: { mes: 8_240.5, ano: 96_310 }, financeiro: { mes: 21_500, ano: 248_900 } },
  historico: [
    { quando: "2026-07-01T09:12", quem: PESSOAS.rafael, acao: "Subiu o limite mensal de Compras de R$ 10.000,00 para R$ 15.000,00", motivo: "Volume de material das duas unidades novas.", icon: "fa-pen" },
    { quando: "2026-01-05T10:40", quem: PESSOAS.rafael, acao: "Definiu os limites de Compras e Financeiro para 2026", icon: "fa-plus", color: "blue" },
  ],
};

const data: ComprasFixture = { solicitacoes: SOLICITACOES, fornecedores: FORNECEDORES, itens: ITENS, alcadas: ALCADAS };

export const COMPRAS_FIXTURES: Fixture<ComprasFixture>[] = [
  { id: "compras.base", label: "Compras em andamento", description: "Vinte solicitações, uma ou mais em cada etapa, nas unidades Jardim e Girassol.", data },
  { id: "compras.vazio", label: "Nenhuma compra", description: "Ninguém pediu nada ainda: listas e fila vazias.", data: { ...data, solicitacoes: [] } },
];
