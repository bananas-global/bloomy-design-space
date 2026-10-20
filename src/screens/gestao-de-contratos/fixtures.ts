/**
 * Gestão de Contratos — dados sintéticos. Partes, documentos, processos e
 * valores são fictícios. Datas relativas a `TODAY` (30/07/2026).
 *
 * A carteira cobre um contrato em cada estado do fluxo, para que cada cenário
 * da ficha abra um contrato real da lista.
 */
import type { Fixture } from "@brucesantos/design-space";
import type {
  Aditivo, CampoCategoria, Clausula, Cobranca, Contrato, ContratosData, DossieItem, Evento, Minuta, OpcaoTabela, Parte, TabelaId,
} from "./model.js";

/* ------------------------------------------------------------------ */
/* Partes                                                              */
/* ------------------------------------------------------------------ */

const PARTES: Parte[] = [
  {
    id: "p1", codigo: "CLI-0001", tipo: "cliente", subtipo: "operadora", pessoa: "PJ", nome: "Vida Plena Saúde S.A.", documento: "11.222.333/0001-44", ativo: true,
    contato: { nome: "Roberta Campos", email: "credenciamento@vidaplena.exemplo", telefone: "(41) 3300-1200" },
    fluxo: "receita", formaPagamento: "Transferência bancária", condicaoPagamento: "30 dias após o faturamento",
    extras: { "Registro ANS": "412345", "Dia de corte": "20", "Prazo de retorno": "30 dias" },
  },
  {
    id: "p2", codigo: "CLI-0002", tipo: "cliente", subtipo: "operadora", pessoa: "PJ", nome: "Amparo Saúde Cooperativa", documento: "22.333.444/0001-55", ativo: true,
    contato: { nome: "Diego Moura", email: "rede@amparo.exemplo", telefone: "(41) 3300-2200" },
    fluxo: "receita", formaPagamento: "Boleto", condicaoPagamento: "45 dias após o faturamento",
    extras: { "Registro ANS": "398877", "Dia de corte": "25", "Prazo de retorno": "45 dias" },
  },
  {
    id: "p3", codigo: "CLI-0003", tipo: "cliente", subtipo: "particular_pj", pessoa: "PJ", nome: "Instituto Raízes de Educação Ltda.", documento: "33.444.555/0001-66", ativo: true,
    contato: { nome: "Fernanda Lopes", email: "financeiro@raizes.exemplo", telefone: "(41) 3300-3300" },
    fluxo: "receita", formaPagamento: "Boleto", condicaoPagamento: "À vista",
    extras: { "Paciente/beneficiário": "Alunos com laudo TEA (convênio escolar)" },
  },
  {
    id: "p4", codigo: "CLI-0004", tipo: "cliente", subtipo: "pf", pessoa: "PF", nome: "Juliana Prado Moreira", documento: "123.456.789-00", ativo: true,
    contato: { nome: "Juliana Prado Moreira", email: "juliana.prado@exemplo.com", telefone: "(41) 99800-1111" },
    fluxo: "receita", formaPagamento: "Pix", condicaoPagamento: "Mensal antecipado",
    extras: { RG: "12.345.678-9", "Responsável legal": "Juliana Prado Moreira", Parentesco: "Mãe", "Paciente/beneficiário": "Tomás Prado Moreira" },
  },
  {
    id: "p5", codigo: "CLI-0005", tipo: "cliente", subtipo: "liminar", pessoa: "PF", nome: "Pedro Henrique Sales (Liminar)", documento: "234.567.890-11", ativo: true,
    contato: { nome: "Marta Sales", email: "marta.sales@exemplo.com", telefone: "(41) 99800-2222" },
    fluxo: "receita", formaPagamento: "Depósito judicial", condicaoPagamento: "Conforme decisão",
    extras: { Processo: "0001234-56.2026.8.16.0001", Vara: "3ª Vara Cível de Curitiba" },
  },
  {
    id: "p6", codigo: "FOR-0001", tipo: "fornecedor", subtipo: "fornecedor_pj", pessoa: "PJ", nome: "Clínica Integrar Terapias Ltda.", documento: "12.345.678/0001-90", ativo: true, homologado: true,
    contato: { nome: "Ana Beatriz Lemos", email: "contratos@integrar.exemplo", telefone: "(41) 3300-6600" },
    fluxo: "despesa", formaPagamento: "Transferência bancária", condicaoPagamento: "30 dias após a nota",
    extras: { "Regime tributário": "Lucro Presumido", CNAE: "8650-0/04", "Responsável técnico": "Ana Beatriz Lemos", Conselho: "CREFITO-8 123456-F", Banco: "001 · Ag 1234 · CC 56789-0" },
  },
  {
    id: "p7", codigo: "FOR-0002", tipo: "fornecedor", subtipo: "fornecedor_pj", pessoa: "PJ", nome: "Imobiliária Horizonte Ltda.", documento: "44.555.666/0001-77", ativo: true, homologado: true,
    contato: { nome: "Sérgio Albuquerque", email: "locacao@horizonte.exemplo", telefone: "(41) 3300-7700" },
    fluxo: "despesa", formaPagamento: "Boleto", condicaoPagamento: "Dia 5 do mês",
    extras: { "Regime tributário": "Simples Nacional", CNAE: "6821-8/01", Banco: "341 · Ag 4321 · CC 98765-4" },
  },
  {
    id: "p8", codigo: "FOR-0003", tipo: "fornecedor", subtipo: "fornecedor_pj", pessoa: "PJ", nome: "Nuvem Clínica Sistemas Ltda.", documento: "55.666.777/0001-88", ativo: true, homologado: true,
    contato: { nome: "Lucas Viana", email: "comercial@nuvemclinica.exemplo", telefone: "(11) 4000-8800" },
    fluxo: "despesa", formaPagamento: "Cartão corporativo", condicaoPagamento: "Mensal",
    extras: { "Regime tributário": "Lucro Real", CNAE: "6203-1/00", Banco: "260 · Ag 0001 · CC 1122334-5" },
  },
  {
    id: "p9", codigo: "FOR-0004", tipo: "fornecedor", subtipo: "clt", pessoa: "PF", nome: "Camila Rocha Duarte", documento: "345.678.901-22", ativo: true, homologado: true,
    contato: { nome: "Camila Rocha Duarte", email: "camila.duarte@exemplo.com", telefone: "(41) 99800-3333" },
    fluxo: "despesa", formaPagamento: "Folha de pagamento", condicaoPagamento: "5º dia útil",
    extras: { Cargo: "Psicóloga ABA", CBO: "2515-10", Admissão: "01/06/2026", "Carga horária": "40h semanais", CTPS: "Digital", Salário: "R$ 6.200,00" },
  },
  {
    id: "p10", codigo: "FOR-0005", tipo: "fornecedor", subtipo: "fornecedor_pf", pessoa: "PF", nome: "Rafael Nunes Teixeira", documento: "456.789.012-33", ativo: true, homologado: true,
    contato: { nome: "Rafael Nunes Teixeira", email: "rafael.teixeira@exemplo.com", telefone: "(41) 99800-4444" },
    fluxo: "despesa", formaPagamento: "Pix", condicaoPagamento: "15 dias após o RPA",
    extras: { Cargo: "Fonoaudiólogo (PJ)", CBO: "2238-10", Conselho: "CRFa-3 9876" },
  },
  {
    id: "p11", codigo: "FOR-0006", tipo: "fornecedor", subtipo: "fornecedor_pj", pessoa: "PJ", nome: "Limpa Bem Serviços Gerais Ltda.", documento: "66.777.888/0001-99", ativo: true, homologado: true,
    contato: { nome: "Paula Ribeiro", email: "contratos@limpabem.exemplo", telefone: "(41) 3300-1111" },
    fluxo: "despesa", formaPagamento: "Boleto", condicaoPagamento: "30 dias após a nota",
    extras: { "Regime tributário": "Simples Nacional", CNAE: "8121-4/00" },
  },
  {
    id: "p12", codigo: "FOR-0007", tipo: "fornecedor", subtipo: "fornecedor_pj", pessoa: "PJ", nome: "Movimento Fisioterapia Ltda.", documento: "77.888.999/0001-00", ativo: true, homologado: true,
    contato: { nome: "Thiago Prates", email: "adm@movimento.exemplo", telefone: "(41) 3300-1212" },
    fluxo: "despesa", formaPagamento: "Transferência bancária", condicaoPagamento: "30 dias após a nota",
    extras: { "Regime tributário": "Lucro Presumido", CNAE: "8650-0/04", "Responsável técnico": "Thiago Prates", Conselho: "CREFITO-8 654321-F" },
  },
  {
    id: "p13", codigo: "FOR-0008", tipo: "fornecedor", subtipo: "fornecedor_pj", pessoa: "PJ", nome: "Gráfica Pontual Ltda.", documento: "88.999.000/0001-11", ativo: false, homologado: false,
    contato: { nome: "Rita Gomes", email: "rita@pontual.exemplo", telefone: "(41) 3300-1313" },
    fluxo: "despesa", formaPagamento: "Boleto", condicaoPagamento: "À vista",
    extras: { "Regime tributário": "Simples Nacional" },
  },
];

/* ------------------------------------------------------------------ */
/* Minutas padrão                                                      */
/* ------------------------------------------------------------------ */

const cl = (id: string, titulo: string, texto: string, editada?: boolean): Clausula => ({ id, titulo, texto, ...(editada && { editada }) });

const CLAUSULAS_PJA_V2: Clausula[] = [
  cl("c1", "Preâmbulo", "Pelo presente instrumento particular, de um lado {{parte.nome}}, inscrita no CNPJ sob o nº {{parte.documento}}, com sede em {{parte.endereco}}, neste ato representada por {{parte.representante}}, doravante CONTRATADA, e de outro a CLÍNICA, doravante CONTRATANTE, têm entre si justo e contratado o que segue."),
  cl("c2", "Cláusula 1ª — Do Objeto", "O presente contrato tem por objeto a {{contrato.objeto}}, a ser executada nas unidades {{contrato.unidades}}, conforme o plano terapêutico de cada paciente."),
  cl("c3", "Cláusula 2ª — Da Vigência", "O contrato vigora de {{vigencia.inicio}} a {{vigencia.fim}}, pelo prazo de {{vigencia.prazo}}, podendo ser prorrogado por Termo Aditivo."),
  cl("c4", "Cláusula 3ª — Do Preço e do Pagamento", "Pelos serviços, a CONTRATANTE pagará {{financeiro.valor}} ({{financeiro.valor_extenso}}) por mês, por {{financeiro.forma}}, {{financeiro.condicao}}, com vencimento no dia {{financeiro.vencimento}}."),
  cl("c5", "Cláusula 4ª — Do Reajuste", "O valor será reajustado anualmente pelo {{vigencia.indice}}, na data-base de {{vigencia.data_base}}."),
  cl("c6", "Cláusula 5ª — Da Responsabilidade Técnica", "A CONTRATADA manterá responsável técnico habilitado, com registro em {{parte.conselho}}, e apresentará as certidões exigidas no dossiê."),
  cl("c7", "Cláusula 6ª — Da Proteção de Dados", "As partes tratarão os dados pessoais e sensíveis dos pacientes exclusivamente para a execução deste contrato, nos termos da Lei nº 13.709/2018 (LGPD)."),
  cl("c8", "Cláusula 7ª — Da Rescisão", "Qualquer das partes poderá rescindir o contrato mediante aviso prévio de {{vigencia.aviso_previo}} dias, sem multa."),
  cl("c9", "Cláusula 8ª — Do Foro", "Fica eleito o foro da comarca de {{contrato.foro}}."),
];

const CLAUSULAS_PJA_V21: Clausula[] = [
  ...CLAUSULAS_PJA_V2.slice(0, 5),
  cl("c6", "Cláusula 5ª — Da Responsabilidade Técnica", "A CONTRATADA manterá responsável técnico habilitado, com registro em {{parte.conselho}}, e apresentará as certidões exigidas no dossiê, renovando-as antes do vencimento."),
  cl("c7", "Cláusula 6ª — Da Proteção de Dados", "As partes tratarão os dados pessoais e sensíveis dos pacientes exclusivamente para a execução deste contrato, nos termos da Lei nº 13.709/2018 (LGPD), comunicando qualquer incidente de segurança em até 48 horas."),
  cl("c7b", "Cláusula 7ª — Da Anticorrupção", "As partes declaram conhecer a Lei nº 12.846/2013 e se comprometem a não praticar atos lesivos à administração pública."),
  cl("c8", "Cláusula 8ª — Da Rescisão", "Qualquer das partes poderá rescindir o contrato mediante aviso prévio de {{vigencia.aviso_previo}} dias, sem multa."),
  cl("c9", "Cláusula 9ª — Do Foro", "Fica eleito o foro da comarca de {{contrato.foro}}."),
];

const CLAUSULAS_CLT: Clausula[] = [
  cl("k1", "Preâmbulo", "Pelo presente contrato individual de trabalho, a CLÍNICA admite {{parte.nome}}, CPF {{parte.documento}}, para a função descrita abaixo."),
  cl("k2", "Cláusula 1ª — Da Função", "O EMPREGADO exercerá a função de {{contrato.objeto}}, nas unidades {{contrato.unidades}}."),
  cl("k3", "Cláusula 2ª — Do Período de Experiência", "Os primeiros 90 dias constituem período de experiência, a partir de {{vigencia.inicio}}."),
  cl("k4", "Cláusula 3ª — Da Remuneração", "O salário mensal é de {{financeiro.valor}}, pago até o {{financeiro.vencimento}}º dia útil, reajustado pela {{vigencia.indice}}."),
  cl("k5", "Cláusula 4ª — Do Sigilo", "O EMPREGADO manterá sigilo sobre dados de pacientes, nos termos da LGPD e do código de ética profissional."),
];

const CLAUSULAS_REC: Clausula[] = [
  cl("r1", "Preâmbulo", "Pelo presente instrumento, {{parte.nome}}, registro ANS e CNPJ {{parte.documento}}, doravante OPERADORA, credencia a CLÍNICA para a prestação de terapias a seus beneficiários."),
  cl("r2", "Cláusula 1ª — Do Objeto", "Credenciamento para {{contrato.objeto}}, nas unidades {{contrato.unidades}}."),
  cl("r3", "Cláusula 2ª — Da Tabela e do Faturamento", "Os atendimentos serão faturados mensalmente pela tabela anexa, com pagamento {{financeiro.condicao}}."),
  cl("r4", "Cláusula 3ª — Da Vigência", "Vigência de {{vigencia.inicio}} a {{vigencia.fim}}, com reajuste anual pelo {{vigencia.indice}}."),
  cl("r5", "Cláusula 4ª — Do Foro", "Fica eleito o foro da comarca de {{contrato.foro}}."),
];

const MINUTAS: Minuta[] = [
  { id: "m1", codigo: "MIN-PJA", titulo: "Prestação de Serviços Terapêuticos (PJ)", categoria: "PJ Assistencial", grupo: "PJ Assistencial", versao: "v2.1", status: "vigente", revisor: "Dra. Helena Duarte (Jurídico)", data: "2026-06-15", motivo: "Inclusão da cláusula anticorrupção e prazo de 48h para incidente LGPD.", clausulas: CLAUSULAS_PJA_V21 },
  { id: "m2", codigo: "MIN-PJA", titulo: "Prestação de Serviços Terapêuticos (PJ)", categoria: "PJ Assistencial", grupo: "PJ Assistencial", versao: "v2.0", status: "obsoleta", revisor: "Dra. Helena Duarte (Jurídico)", data: "2025-11-03", motivo: "Revisão anual: cláusula de proteção de dados.", clausulas: CLAUSULAS_PJA_V2 },
  { id: "m3", codigo: "MIN-PJA", titulo: "Prestação de Serviços Terapêuticos (PJ)", categoria: "PJ Assistencial", grupo: "PJ Assistencial", versao: "v1.0", status: "obsoleta", revisor: "Dr. Otávio Ramos (Jurídico)", data: "2025-02-10", motivo: "Versão inicial.", clausulas: CLAUSULAS_PJA_V2.filter((c) => c.id !== "c7") },
  { id: "m4", codigo: "MIN-CLT", titulo: "Contrato Individual de Trabalho", categoria: "CLT", grupo: "CLT", versao: "v1.2", status: "vigente", revisor: "Dra. Helena Duarte (Jurídico)", data: "2026-03-20", motivo: "Ajuste à CCT 2026.", clausulas: CLAUSULAS_CLT },
  { id: "m5", codigo: "MIN-REC", titulo: "Credenciamento de Operadora", categoria: "Operadora", grupo: "Receita", versao: "v1.0", status: "vigente", revisor: "Dr. Otávio Ramos (Jurídico)", data: "2025-09-01", motivo: "Versão inicial.", clausulas: CLAUSULAS_REC },
  { id: "m6", codigo: "MIN-PAR", titulo: "Atendimento Particular", categoria: "Particular", grupo: "Receita", versao: "v1.1", status: "vigente", revisor: "Dr. Otávio Ramos (Jurídico)", data: "2026-01-12", motivo: "Inclusão do responsável legal.", clausulas: CLAUSULAS_REC.map((c) => ({ ...c, texto: c.texto.replace("OPERADORA", "CONTRATANTE").replace("registro ANS e CNPJ", "inscrito sob o nº") })) },
];

/* ------------------------------------------------------------------ */
/* Contratos                                                           */
/* ------------------------------------------------------------------ */

const v10 = (data: string, revisor: string) => ({ versao: "v1.0", data, fase: "Elaboração", motivo: "Criação do contrato", resumo: "Versão inicial.", revisor });
const ev = (id: string, data: string, tipo: Evento["tipo"], titulo: string, autor: string, detalhe?: string): Evento => ({ id, data, tipo, titulo, autor, ...(detalhe && { detalhe }) });
const JARDIM = "Unidade Jardim", GIRASSOL = "Unidade Girassol", CENTRO = "Unidade Centro";

const CONTRATOS: Contrato[] = [
  {
    id: "CT-2026-001", versao: "v1.1", modalidade: "adesao", categoria: "PJ Assistencial", fluxo: "despesa", parteId: "p6",
    objeto: "prestação de serviços de terapia ocupacional e integração sensorial",
    status: "vigente", fase: "vigente", aprovacao: "aprovado", assinatura: "assinado",
    valor: 18_500, formaPagamento: "Transferência bancária", condicaoPagamento: "30 dias após a nota", vencimentoDia: 10,
    inicio: "2025-08-18", fim: "2026-08-17", indice: "IPCA", dataBase: "2026-08-18", unidades: [JARDIM, GIRASSOL],
    minuta: { codigo: "MIN-PJA", versao: "v2.0" },
    clausulas: CLAUSULAS_PJA_V2.map((c) => (c.id === "c5" ? { ...c, texto: c.texto + " Na falta do índice, aplica-se o INPC.", editada: true } : c)),
    versoes: [
      v10("2025-07-20", "Marina Alves"),
      { versao: "v1.1", data: "2025-07-28", fase: "Aprovação", motivo: "Ajuste pedido pelo aprovador", resumo: "Índice substituto na cláusula de reajuste.", revisor: "Dra. Helena Duarte" },
    ],
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2025-08-01", parecer: "Valores dentro da tabela de PJ assistencial. Aprovado." },
    envelope: { plataforma: "Clicksign", id: "CS-8F2A-1190", data: "2025-08-05" }, assinadoDigital: true,
    eventos: [
      ev("e1", "2025-07-20T09:12", "criacao", "Contrato criado a partir da MIN-PJA v2.0", "Marina Alves"),
      ev("e2", "2025-07-22T14:30", "workflow", "Submetido para aprovação", "Marina Alves"),
      ev("e3", "2025-07-28T10:05", "versao", "Revisão minor v1.1", "Dra. Helena Duarte", "Índice substituto na cláusula de reajuste."),
      ev("e4", "2025-08-01T16:40", "workflow", "Aprovado com parecer", "Carlos Menezes", "Valores dentro da tabela de PJ assistencial."),
      ev("e5", "2025-08-05T11:00", "workflow", "Despachado para assinatura · Clicksign CS-8F2A-1190", "Bruno Siqueira"),
      ev("e6", "2025-08-15T17:22", "workflow", "Assinatura concluída · contrato Vigente", "Bruno Siqueira"),
      ev("e7", "2026-02-10T08:45", "dossie", "Certidão negativa federal protocolada", "Sofia Lima"),
      ev("e8", "2026-07-08T10:15", "cobranca", "NFS-e 2026/0712 recebida por leitura automática", "Sistema"),
      ev("e9", "2026-07-09T15:02", "erp", "Título 88412 criado no Omie", "Sistema"),
    ],
  },
  {
    id: "CT-2026-002", versao: "v1.0", modalidade: "corporativo", categoria: "Tecnologia", fluxo: "despesa", parteId: "p8",
    objeto: "licença do software de prontuário e agenda em nuvem",
    status: "vigente", fase: "vigente", aprovacao: "aprovado", assinatura: "assinado",
    valor: 9_800, formaPagamento: "Cartão corporativo", condicaoPagamento: "Mensal", vencimentoDia: 1,
    inicio: "2025-09-01", fim: "2027-08-31", indice: "IGP-M", dataBase: "2026-09-01", unidades: [JARDIM, GIRASSOL, CENTRO],
    arquivo: { nome: "contrato-nuvem-clinica-negociado.pdf", tamanho: 1_840_000 },
    versoes: [v10("2025-08-10", "Bruno Siqueira")],
    aprovador: { nome: "Dra. Helena Duarte (Jurídico)", data: "2025-08-20", parecer: "Cláusulas de SLA e LGPD revisadas no documento do fornecedor." },
    envelope: { plataforma: "DocuSign", id: "DS-55C1-7720", data: "2025-08-22" }, assinadoDigital: true,
    eventos: [
      ev("e1", "2025-08-10T10:00", "criacao", "Contrato criado por upload (Fluxo Invertido)", "Bruno Siqueira"),
      ev("e2", "2025-08-20T09:30", "workflow", "Aprovado com parecer", "Dra. Helena Duarte"),
      ev("e3", "2025-08-28T18:10", "workflow", "Assinatura concluída · contrato Vigente", "Bruno Siqueira"),
    ],
  },
  {
    id: "CT-2026-003", versao: "v1.0", modalidade: "especifico", categoria: "Locação", fluxo: "despesa", parteId: "p7",
    objeto: "locação do imóvel da Unidade Girassol, Rua das Palmeiras, 455",
    status: "vigente", fase: "aditivos", aprovacao: "aprovado", assinatura: "assinado",
    valor: 14_200, formaPagamento: "Boleto", condicaoPagamento: "Dia 5 do mês", vencimentoDia: 5,
    inicio: "2023-10-21", fim: "2026-10-20", indice: "IGP-M", dataBase: "2026-10-21", unidades: [GIRASSOL],
    ultimoReajuste: { data: "2025-10-21", taxa: 4.1, valorAnterior: 13_640 },
    arquivo: { nome: "locacao-girassol-assinado.pdf", tamanho: 2_310_000 },
    camposCategoria: { IPTU: "R$ 780,00 / mês", Condomínio: "Não se aplica", Garantia: "Seguro-fiança · Apólice 7781-22" },
    versoes: [v10("2023-09-30", "Bruno Siqueira")],
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2023-10-10", parecer: "Locação compatível com o plano de expansão." },
    envelope: { plataforma: "Gov.br", id: "GOV-2023-10-0098", data: "2023-10-12" }, assinadoDigital: true,
    eventos: [
      ev("e1", "2023-09-30T09:00", "criacao", "Contrato criado por upload", "Bruno Siqueira"),
      ev("e2", "2023-10-10T15:00", "workflow", "Aprovado com parecer", "Carlos Menezes"),
      ev("e3", "2023-10-20T12:00", "workflow", "Assinatura concluída · contrato Vigente", "Bruno Siqueira"),
      ev("e4", "2025-10-21T09:00", "aditivo", "Reajuste IGP-M 4,10% aplicado", "Patrícia Gomes"),
      ev("e5", "2026-07-15T11:30", "aditivo", "Aditivo de prorrogação AD-003-02 em elaboração", "Bruno Siqueira"),
    ],
  },
  {
    id: "CT-2026-004", versao: "v1.0", modalidade: "adesao", categoria: "Operadora", fluxo: "receita", parteId: "p1",
    objeto: "credenciamento para terapias ABA, fonoaudiologia e terapia ocupacional",
    status: "vigente", fase: "vigente", aprovacao: "aprovado", assinatura: "assinado",
    valor: 96_000, formaPagamento: "Transferência bancária", condicaoPagamento: "30 dias após o faturamento", vencimentoDia: 20,
    inicio: "2026-01-01", fim: "2027-12-31", indice: "IPCA", dataBase: "2027-01-01", unidades: [JARDIM, GIRASSOL, CENTRO],
    minuta: { codigo: "MIN-REC", versao: "v1.0" }, clausulas: CLAUSULAS_REC,
    versoes: [v10("2025-11-20", "Marina Alves")],
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2025-12-05", parecer: "Tabela negociada aprovada." },
    envelope: { plataforma: "Clicksign", id: "CS-91DD-3301", data: "2025-12-08" }, assinadoDigital: true,
    eventos: [ev("e1", "2025-11-20T10:00", "criacao", "Contrato criado a partir da MIN-REC v1.0", "Marina Alves"), ev("e2", "2025-12-18T09:00", "workflow", "Assinatura concluída · contrato Vigente", "Bruno Siqueira")],
  },
  {
    id: "CT-2026-005", versao: "v1.0", modalidade: "adesao", categoria: "CLT", fluxo: "despesa", parteId: "p9",
    objeto: "Psicóloga ABA, 40h semanais",
    status: "vigente", fase: "vigente", aprovacao: "aprovado", assinatura: "assinado",
    valor: 6_200, formaPagamento: "Folha de pagamento", condicaoPagamento: "5º dia útil", vencimentoDia: 5,
    inicio: "2026-06-01", fim: "2026-08-29", experienciaAte: "2026-08-29", indice: "CCT", dataBase: "2027-05-01", unidades: [JARDIM],
    minuta: { codigo: "MIN-CLT", versao: "v1.2" }, clausulas: CLAUSULAS_CLT,
    versoes: [v10("2026-05-20", "Renata Freitas")],
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2026-05-25", parecer: "Vaga aprovada no orçamento." },
    assinadoDigital: false,
    eventos: [ev("e1", "2026-05-20T09:00", "criacao", "Contrato criado a partir da MIN-CLT v1.2", "Renata Freitas"), ev("e2", "2026-05-30T16:00", "workflow", "Assinatura presencial registrada · contrato Vigente", "Renata Freitas")],
  },
  {
    id: "CT-2026-006", versao: "v1.0", modalidade: "adesao", categoria: "PJ Assistencial", fluxo: "despesa", parteId: "p10",
    objeto: "prestação de serviços de fonoaudiologia (linguagem)",
    status: "em_elaboracao", fase: "elaboracao", aprovacao: "elaboracao", assinatura: "bloqueada",
    valor: 7_400, formaPagamento: "Pix", condicaoPagamento: "15 dias após o RPA", vencimentoDia: 15,
    inicio: "2026-08-15", fim: "2027-08-14", indice: "IPCA", dataBase: "2027-08-15", unidades: [CENTRO],
    minuta: { codigo: "MIN-PJA", versao: "v2.1" }, clausulas: CLAUSULAS_PJA_V21,
    versoes: [v10("2026-07-27", "Marina Alves")],
    eventos: [ev("e1", "2026-07-27T14:10", "criacao", "Contrato criado a partir da MIN-PJA v2.1", "Marina Alves")],
  },
  {
    id: "CT-2026-007", versao: "v1.0", modalidade: "adesao", categoria: "Particular", fluxo: "receita", parteId: "p3",
    objeto: "atendimento terapêutico a alunos do convênio escolar",
    status: "em_aprovacao", fase: "aprovacao", aprovacao: "em_aprovacao", assinatura: "bloqueada",
    valor: 22_000, formaPagamento: "Boleto", condicaoPagamento: "À vista", vencimentoDia: 10,
    inicio: "2026-08-01", fim: "2027-07-31", indice: "IPCA", dataBase: "2027-08-01", unidades: [JARDIM],
    minuta: { codigo: "MIN-PAR", versao: "v1.1" }, clausulas: MINUTAS[5]!.clausulas,
    versoes: [v10("2026-07-21", "Marina Alves")],
    eventos: [ev("e1", "2026-07-21T10:00", "criacao", "Contrato criado a partir da MIN-PAR v1.1", "Marina Alves"), ev("e2", "2026-07-24T17:45", "workflow", "Submetido para aprovação", "Marina Alves")],
  },
  {
    id: "CT-2026-008", versao: "v1.0", modalidade: "corporativo", categoria: "Serviços", fluxo: "despesa", parteId: "p11",
    objeto: "limpeza e conservação das três unidades",
    status: "reprovado", fase: "elaboracao", aprovacao: "reprovado", assinatura: "bloqueada",
    valor: 11_300, formaPagamento: "Boleto", condicaoPagamento: "30 dias após a nota", vencimentoDia: 10,
    inicio: "2026-09-01", fim: "2027-08-31", indice: "IPCA", dataBase: "2027-09-01", unidades: [JARDIM, GIRASSOL, CENTRO],
    arquivo: { nome: "proposta-limpa-bem-2026.pdf", tamanho: 960_000 },
    versoes: [v10("2026-07-14", "Bruno Siqueira")],
    reprovacao: { aprovador: "Carlos Menezes (Diretoria)", data: "2026-07-23", motivo: "Multa rescisória de 3 mensalidades acima do padrão. Negociar para 1 mensalidade e reenviar." },
    eventos: [
      ev("e1", "2026-07-14T09:00", "criacao", "Contrato criado por upload (Fluxo Invertido)", "Bruno Siqueira"),
      ev("e2", "2026-07-16T11:00", "workflow", "Submetido para aprovação", "Bruno Siqueira"),
      ev("e3", "2026-07-23T15:20", "workflow", "Reprovado", "Carlos Menezes", "Multa rescisória de 3 mensalidades acima do padrão."),
    ],
  },
  {
    id: "CT-2026-009", versao: "v1.0", modalidade: "adesao", categoria: "Operadora", fluxo: "receita", parteId: "p2",
    objeto: "credenciamento para terapias ABA na Unidade Centro",
    status: "pronto_coleta", fase: "assinatura", aprovacao: "aprovado", assinatura: "pronto_coleta",
    valor: 48_000, formaPagamento: "Boleto", condicaoPagamento: "45 dias após o faturamento", vencimentoDia: 25,
    inicio: "2026-09-01", fim: "2028-08-31", indice: "IPCA", dataBase: "2027-09-01", unidades: [CENTRO],
    minuta: { codigo: "MIN-REC", versao: "v1.0" }, clausulas: CLAUSULAS_REC,
    versoes: [v10("2026-07-10", "Marina Alves")],
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2026-07-28", parecer: "Tabela aprovada. Liberar para coleta de assinaturas." },
    eventos: [
      ev("e1", "2026-07-10T10:00", "criacao", "Contrato criado a partir da MIN-REC v1.0", "Marina Alves"),
      ev("e2", "2026-07-15T09:30", "workflow", "Submetido para aprovação", "Marina Alves"),
      ev("e3", "2026-07-28T16:00", "workflow", "Aprovado com parecer", "Carlos Menezes"),
    ],
  },
  {
    id: "CT-2026-010", versao: "v1.0", modalidade: "especifico", categoria: "Particular", fluxo: "receita", parteId: "p5",
    objeto: "terapia ABA intensiva determinada por decisão liminar",
    status: "em_assinatura", fase: "assinatura", aprovacao: "aprovado", assinatura: "em_assinatura",
    valor: 15_600, formaPagamento: "Depósito judicial", condicaoPagamento: "Conforme decisão", vencimentoDia: 10,
    inicio: "2026-08-01", fim: "2027-01-31", indice: "IPCA", dataBase: "2027-08-01", unidades: [JARDIM],
    liminar: { processo: "0001234-56.2026.8.16.0001", vara: "3ª Vara Cível de Curitiba" },
    arquivo: { nome: "termo-liminar-pedro-sales.pdf", tamanho: 640_000 },
    camposCategoria: { "Carga horária determinada": "20h semanais", "Prazo da decisão": "180 dias" },
    versoes: [v10("2026-07-18", "Marina Alves")],
    aprovador: { nome: "Dra. Helena Duarte (Jurídico)", data: "2026-07-22", parecer: "Cumprimento obrigatório da decisão. Aprovado." },
    envelope: { plataforma: "Clicksign", id: "CS-A7B3-5521", data: "2026-07-24" },
    eventos: [
      ev("e1", "2026-07-18T08:30", "criacao", "Contrato criado por upload · origem liminar", "Marina Alves"),
      ev("e2", "2026-07-22T13:00", "workflow", "Aprovado com parecer", "Dra. Helena Duarte"),
      ev("e3", "2026-07-24T10:10", "workflow", "Despachado para assinatura · Clicksign CS-A7B3-5521", "Bruno Siqueira"),
    ],
  },
  {
    id: "CT-2025-018", versao: "v1.0", modalidade: "adesao", categoria: "Particular", fluxo: "receita", parteId: "p4",
    objeto: "atendimento terapêutico particular de Tomás Prado Moreira",
    status: "vigente", fase: "vigente", aprovacao: "aprovado", assinatura: "assinado",
    valor: 4_800, formaPagamento: "Pix", condicaoPagamento: "Mensal antecipado", vencimentoDia: 5,
    inicio: "2025-07-26", fim: "2026-07-25", indice: "IPCA", dataBase: "2026-07-26", unidades: [GIRASSOL],
    minuta: { codigo: "MIN-PAR", versao: "v1.0" }, codigoManual: true,
    versoes: [v10("2025-07-10", "Marina Alves")],
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2025-07-15", parecer: "Aprovado." },
    envelope: { plataforma: "Clicksign", id: "CS-1180-0042", data: "2025-07-18" }, assinadoDigital: true,
    eventos: [ev("e1", "2025-07-10T10:00", "criacao", "Contrato legado cadastrado (código manual)", "Marina Alves")],
  },
  {
    id: "CT-2025-040", versao: "v1.0", modalidade: "adesao", categoria: "PJ Assistencial", fluxo: "despesa", parteId: "p12",
    objeto: "prestação de serviços de fisioterapia motora",
    status: "vigente", fase: "vigente", aprovacao: "aprovado", assinatura: "assinado",
    valor: 9_200, formaPagamento: "Transferência bancária", condicaoPagamento: "30 dias após a nota", vencimentoDia: 10,
    inicio: "2025-12-01", fim: "2027-03-31", indice: "IPCA", dataBase: "2026-12-01", unidades: [CENTRO],
    minuta: { codigo: "MIN-PJA", versao: "v2.0" }, clausulas: CLAUSULAS_PJA_V2,
    versoes: [v10("2025-11-10", "Marina Alves")],
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2025-11-20", parecer: "Aprovado." },
    envelope: { plataforma: "ICP-Brasil", id: "ICP-2025-77120", data: "2025-11-25" }, assinadoDigital: true,
    eventos: [ev("e1", "2025-11-10T10:00", "criacao", "Contrato criado a partir da MIN-PJA v2.0", "Marina Alves")],
  },
  {
    id: "CT-2025-031", versao: "v1.2", modalidade: "adesao", categoria: "PJ Assistencial", fluxo: "despesa", parteId: "p13",
    objeto: "impressão de materiais terapêuticos",
    status: "encerrado", fase: "encerramento", aprovacao: "aprovado", assinatura: "assinado",
    valor: 1_900, formaPagamento: "Boleto", condicaoPagamento: "À vista", vencimentoDia: 10,
    inicio: "2025-03-01", fim: "2026-02-28", indice: "IPCA", unidades: [JARDIM],
    minuta: { codigo: "MIN-PJA", versao: "v1.0" }, clausulas: CLAUSULAS_PJA_V2.slice(0, 4),
    versoes: [v10("2025-02-15", "Bruno Siqueira")],
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2025-02-20", parecer: "Aprovado." },
    envelope: { plataforma: "Clicksign", id: "CS-0099-1212", data: "2025-02-22" }, assinadoDigital: true,
    encerramento: { data: "2026-01-15", tipo: "Distrato amigável", motivo: "Fornecedor deixou de atender a região.", distrato: { nome: "distrato-grafica-pontual.pdf", tamanho: 310_000 } },
    eventos: [
      ev("e1", "2025-02-15T10:00", "criacao", "Contrato criado", "Bruno Siqueira"),
      ev("e2", "2026-01-15T14:00", "encerramento", "Contrato encerrado · Distrato amigável", "Carlos Menezes", "Fornecedor deixou de atender a região."),
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Aditivos, dossiê, cobranças                                         */
/* ------------------------------------------------------------------ */

const ADITIVOS: Aditivo[] = [
  { id: "a1", contratoId: "CT-2026-003", codigo: "AD-003-01", tipo: "Reajuste", data: "2025-10-21", novoValor: 14_200, motivo: "Reajuste anual IGP-M 4,10%.", impacto: "Valor mensal de R$ 13.640,00 para R$ 14.200,00.", aprovacao: "aprovado", assinatura: "assinado" },
  { id: "a2", contratoId: "CT-2026-003", codigo: "AD-003-02", tipo: "Prorrogação", data: "2026-07-15", novaVigencia: "2029-10-20", motivo: "Renovação da locação por mais 36 meses.", impacto: "Vigência até 20/10/2029.", aprovacao: "em_aprovacao", assinatura: "bloqueada" },
  { id: "a3", contratoId: "CT-2026-001", codigo: "AD-001-01", tipo: "Inclusão de unidade", data: "2026-03-02", motivo: "Atendimento passa a incluir a Unidade Girassol.", impacto: "Unidades: Jardim e Girassol.", aprovacao: "aprovado", assinatura: "assinado", arquivo: { nome: "aditivo-001-01.pdf", tamanho: 220_000 } },
  { id: "a4", contratoId: "CT-2026-004", codigo: "AD-004-01", tipo: "Alteração de tabela", data: "2026-05-10", novoValor: 96_000, motivo: "Inclusão de códigos de musicoterapia.", impacto: "Tabela anexa revisada.", aprovacao: "aprovado", assinatura: "assinado" },
];

const d = (id: string, contratoId: string, natureza: string, documento: string, conformidade: DossieItem["conformidade"], extra: Partial<DossieItem> = {}): DossieItem =>
  ({ id, contratoId, natureza, documento, conformidade, ...extra });
const PDF = (nome: string, tamanho = 180_000) => ({ nome, tamanho });

const DOSSIE: DossieItem[] = [
  d("d1", "CT-2026-001", "Certidões", "CND Federal", "conforme", { arquivo: PDF("cnd-federal-integrar.pdf"), validade: "2026-12-10", auditor: "Sofia Lima" }),
  d("d2", "CT-2026-001", "Certidões", "CRF FGTS", "conforme", { arquivo: PDF("crf-fgts-integrar.pdf"), validade: "2026-08-30", auditor: "Sofia Lima" }),
  d("d3", "CT-2026-001", "Técnico", "Registro do responsável técnico", "conforme", { arquivo: PDF("crefito-ana-lemos.pdf"), auditor: "Sofia Lima" }),
  d("d4", "CT-2026-002", "Societário", "Contrato social", "conforme", { arquivo: PDF("contrato-social-nuvem.pdf", 820_000), auditor: "Sofia Lima" }),
  d("d5", "CT-2026-002", "Técnico", "Relatório de segurança da informação (SOC 2)", "pendente"),
  d("d6", "CT-2026-003", "Imóvel", "Matrícula do imóvel", "conforme", { arquivo: PDF("matricula-palmeiras-455.pdf", 540_000), auditor: "Sofia Lima" }),
  d("d7", "CT-2026-003", "Imóvel", "AVCB", "conforme", { arquivo: PDF("avcb-girassol.pdf"), validade: "2027-04-01", auditor: "Sofia Lima" }),
  d("d8", "CT-2026-004", "Certidões", "Registro ANS", "conforme", { arquivo: PDF("ans-vida-plena.pdf"), auditor: "Sofia Lima" }),
  d("d9", "CT-2026-005", "ASO/Saúde", "ASO admissional", "pendente", { observacoes: "Exame agendado para 05/08." }),
  d("d10", "CT-2026-005", "Técnico", "Registro no CRP", "conforme", { arquivo: PDF("crp-camila-duarte.pdf"), auditor: "Renata Freitas" }),
  d("d11", "CT-2026-006", "Certidões", "CND Federal", "pendente"),
  d("d12", "CT-2026-006", "Técnico", "Registro no CRFa", "pendente"),
  d("d13", "CT-2026-007", "Societário", "Contrato social", "conforme", { arquivo: PDF("contrato-social-raizes.pdf"), auditor: "Sofia Lima" }),
  d("d14", "CT-2025-018", "Pessoal", "Documento do responsável legal", "conforme", { arquivo: PDF("rg-juliana-prado.pdf"), auditor: "Sofia Lima" }),
  d("d15", "CT-2025-040", "Certidões", "CND Federal", "conforme", { arquivo: PDF("cnd-movimento.pdf"), validade: "2026-11-02", auditor: "Sofia Lima" }),
  d("d16", "CT-2025-040", "ASO/Saúde", "Laudo de vigilância sanitária", "nao_conforme", { arquivo: PDF("visa-movimento-2025.pdf"), validade: "2026-06-30", auditor: "Sofia Lima", observacoes: "Laudo vencido em 30/06/2026." }),
  d("d17", "CT-2026-010", "Pessoal", "Decisão liminar", "conforme", { arquivo: PDF("decisao-liminar-0001234.pdf"), auditor: "Dra. Helena Duarte" }),
];

const COBRANCAS: Cobranca[] = [
  { id: "b1", contratoId: "CT-2026-001", fluxo: "despesa", parteId: "p6", competencia: "2026-07", tipo: "NFS-e", numero: "2026/0712", valor: 18_500, vencimento: "2026-08-10", conferencia: "aprovado", conformidade: "conforme", liberado: true, erp: { status: "sincronizado", titulo: "88412", data: "2026-07-09T15:02" }, arquivo: { nome: "nfse-2026-0712.xml", tamanho: 14_000 }, autoDetectado: true },
  { id: "b2", contratoId: "CT-2026-003", fluxo: "despesa", parteId: "p7", competencia: "2026-08", tipo: "Fatura de Locação", numero: "LOC-0826", valor: 14_980, vencimento: "2026-08-05", conferencia: "pendente", conformidade: "pendente", liberado: false, erp: { status: "travado" }, arquivo: { nome: "fatura-locacao-agosto.pdf", tamanho: 210_000 }, observacao: "Valor inclui IPTU (R$ 780,00)." },
  { id: "b3", contratoId: "CT-2026-002", fluxo: "despesa", parteId: "p8", competencia: "2026-07", tipo: "NF-e", numero: "000.451.902", valor: 9_800, vencimento: "2026-08-01", conferencia: "aprovado", conformidade: "conforme", liberado: true, erp: { status: "erro", motivo: "Fornecedor sem conta bancária cadastrada no Omie (código FOR-0003). Cadastre a conta no Omie e sincronize de novo.", data: "2026-07-29T10:12" }, arquivo: { nome: "nfe-451902.xml", tamanho: 18_000 }, autoDetectado: true },
  { id: "b4", contratoId: "CT-2026-004", fluxo: "receita", parteId: "p1", competencia: "2026-06", tipo: "Fatura", numero: "FAT-2026-06-VP", valor: 94_310, vencimento: "2026-07-20", conferencia: "aprovado", conformidade: "conforme", liberado: true, erp: { status: "sincronizado", titulo: "77301", data: "2026-07-01T09:00" } },
  { id: "b5", contratoId: "CT-2026-005", fluxo: "despesa", parteId: "p9", competencia: "2026-07", tipo: "Folha", numero: "FOLHA-07/2026", valor: 6_200, vencimento: "2026-08-07", conferencia: "aprovado", conformidade: "conforme", liberado: true, erp: { status: "pendente" } },
  { id: "b6", contratoId: "CT-2025-040", fluxo: "despesa", parteId: "p12", competencia: "2026-07", tipo: "NFS-e", numero: "2026/0233", valor: 9_200, vencimento: "2026-08-10", conferencia: "pendente", conformidade: "nao_conforme", liberado: false, erp: { status: "travado" }, arquivo: { nome: "nfse-2026-0233.xml", tamanho: 12_000 }, autoDetectado: true, observacao: "Dossiê com laudo sanitário vencido." },
  { id: "b7", contratoId: "CT-2025-018", fluxo: "receita", parteId: "p4", competencia: "2026-07", tipo: "Boleto", numero: "BOL-0718", valor: 4_800, vencimento: "2026-07-05", conferencia: "aprovado", conformidade: "conforme", liberado: true, erp: { status: "sincronizado", titulo: "77288", data: "2026-07-01T09:00" } },
];

/* ------------------------------------------------------------------ */
/* Tabelas de apoio                                                    */
/* ------------------------------------------------------------------ */

const op = (lista: string, i: number, codigo: string, descricao: string, emUso = 0, ativo = true): OpcaoTabela =>
  ({ id: `${lista}-${i}`, ordem: i * 10, codigo, descricao, ativo, emUso });

const TABELAS: Record<TabelaId, OpcaoTabela[]> = {
  categoria: [op("cat", 1, "PJA", "PJ Assistencial", 4), op("cat", 2, "CLT", "CLT", 1), op("cat", 3, "OPE", "Operadora", 2), op("cat", 4, "PAR", "Particular", 3), op("cat", 5, "LOC", "Locação", 1), op("cat", 6, "TEC", "Tecnologia", 1), op("cat", 7, "SRV", "Serviços", 1), op("cat", 8, "CON", "Consultoria", 0, false)],
  fluxo: [op("flx", 1, "REC", "Receita", 5), op("flx", 2, "DES", "Despesa", 8)],
  forma_pagamento: [op("fpg", 1, "TED", "Transferência bancária", 4), op("fpg", 2, "BOL", "Boleto", 5), op("fpg", 3, "PIX", "Pix", 2), op("fpg", 4, "CAR", "Cartão corporativo", 1), op("fpg", 5, "FOL", "Folha de pagamento", 1), op("fpg", 6, "DEP", "Depósito judicial", 1)],
  condicao_pagamento: [op("cpg", 1, "AV", "À vista", 2), op("cpg", 2, "30N", "30 dias após a nota", 4), op("cpg", 3, "30F", "30 dias após o faturamento", 1), op("cpg", 4, "45F", "45 dias após o faturamento", 1), op("cpg", 5, "D5", "Dia 5 do mês", 1), op("cpg", 6, "MEN", "Mensal", 1)],
  indice: [op("ind", 1, "IPCA", "IPCA", 9), op("ind", 2, "IGPM", "IGP-M", 2), op("ind", 3, "CCT", "CCT (convenção coletiva)", 1), op("ind", 4, "INPC", "INPC", 0)],
  tipo_cobranca: [op("tcb", 1, "NFSE", "NFS-e", 2), op("tcb", 2, "NFE", "NF-e", 1), op("tcb", 3, "BOL", "Boleto", 1), op("tcb", 4, "FOL", "Folha", 1), op("tcb", 5, "LOC", "Fatura de Locação", 1), op("tcb", 6, "RPA", "RPA", 0), op("tcb", 7, "FAT", "Fatura", 1)],
  natureza_dossie: [op("nat", 1, "CERT", "Certidões", 5), op("nat", 2, "ASO", "ASO/Saúde", 2), op("nat", 3, "SOC", "Societário", 2), op("nat", 4, "TEC", "Técnico", 4), op("nat", 5, "IMO", "Imóvel", 2), op("nat", 6, "PES", "Pessoal", 2)],
  tipo_aditivo: [op("tad", 1, "PRO", "Prorrogação", 1), op("tad", 2, "REA", "Reajuste", 1), op("tad", 3, "VAL", "Alteração de valor", 0), op("tad", 4, "UNI", "Inclusão de unidade", 1), op("tad", 5, "TAB", "Alteração de tabela", 1), op("tad", 6, "ADQ", "Adequação de minuta", 0)],
  tipo_encerramento: [op("tenc", 1, "TER", "Término de vigência", 0), op("tenc", 2, "DIS", "Distrato amigável", 1), op("tenc", 3, "RES", "Rescisão unilateral", 0), op("tenc", 4, "JUD", "Encerramento judicial", 0)],
  unidade: [op("uni", 1, "JAR", "Unidade Jardim", 8), op("uni", 2, "GIR", "Unidade Girassol", 5), op("uni", 3, "CEN", "Unidade Centro", 6)],
};

const CAMPOS: Record<string, CampoCategoria[]> = {
  Locação: [
    { id: "f1", rotulo: "IPTU", tipo: "texto", ajuda: "Valor mensal ou anual e quem paga." },
    { id: "f2", rotulo: "Condomínio", tipo: "texto" },
    { id: "f3", rotulo: "Garantia", tipo: "lista", opcoes: ["Caução", "Fiador", "Seguro-fiança", "Sem garantia"] },
  ],
  CLT: [
    { id: "f4", rotulo: "Fim do período de experiência", tipo: "data" },
    { id: "f5", rotulo: "Carga horária semanal", tipo: "numero", ajuda: "Em horas." },
  ],
  Particular: [{ id: "f6", rotulo: "Paciente/beneficiário", tipo: "texto" }],
  "PJ Assistencial": [{ id: "f7", rotulo: "Especialidade", tipo: "lista", opcoes: ["Fonoaudiologia", "Terapia ocupacional", "Fisioterapia", "Psicologia"] }],
};

const BASE: ContratosData = {
  contratos: CONTRATOS,
  partes: PARTES,
  minutas: MINUTAS,
  aditivos: ADITIVOS,
  dossie: DOSSIE,
  cobrancas: COBRANCAS,
  tabelas: TABELAS,
  camposCategoria: CAMPOS,
  indices: [
    { codigo: "IPCA", taxa: 4.23, referencia: "acumulado 12 meses até 06/2026" },
    { codigo: "IGP-M", taxa: 3.87, referencia: "acumulado 12 meses até 06/2026" },
    { codigo: "CCT", taxa: 5.5, referencia: "CCT 2026/2027 da categoria" },
  ],
  proximoCodigo: "CT-2026-013",
};

/** Carteira sem contratos: só as tabelas de apoio e as minutas, como numa implantação nova. */
const VAZIO: ContratosData = { ...BASE, contratos: [], aditivos: [], dossie: [], cobrancas: [], proximoCodigo: "CT-2026-001" };

export const CONTRATOS_FIXTURES: Fixture<ContratosData>[] = [
  {
    id: "contratos.base",
    label: "Carteira com contratos",
    description: "Treze contratos, um em cada estado do fluxo (elaboração, aprovação, reprovado, pronto para coleta, em assinatura, vigente, encerrado), treze partes, seis minutas e as cobranças do mês.",
    data: BASE,
  },
  {
    id: "contratos.vazio",
    label: "Carteira vazia",
    description: "Implantação nova: nenhuma parte com contrato, nenhum contrato, dossiê ou cobrança. Tabelas de apoio e minutas já existem.",
    data: VAZIO,
  },
];
