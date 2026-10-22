/**
 * Gestão de Contratos — dados sintéticos. Partes, documentos, processos e
 * valores são fictícios. Datas relativas a `TODAY` (30/07/2026).
 *
 * A carteira cobre um contrato em cada estado do fluxo, para que cada cenário
 * da ficha abra um contrato real da lista. As versões, o histórico de workflow
 * e a auditoria de cada contrato saem do ciclo de vida dele (`completa`), com
 * as regras de versão da RN-010.
 */
import type { Fixture } from "@brucesantos/design-space";
import {
  PAPEL_WORKFLOW, checklistInicial, clausulasDoContrato, dataBase, proximaVersao, valoresDasTags,
  type Aditivo, type CampoCategoria, type Clausula, type Cobranca, type Contrato, type ContratosData, type DossieItem, type Evento,
  type Minuta, type OpcaoTabela, type Parte, type RegistroAuditoria, type RegistroWorkflow, type TabelaId, type Versao,
} from "./model.js";

/* ------------------------------------------------------------------ */
/* Partes                                                              */
/* ------------------------------------------------------------------ */

const PARTES: Parte[] = [
  {
    id: "p1", codigo: "CLI-0001", tipo: "cliente", subtipo: "operadora", pessoa: "PJ", nome: "Vida Plena Saúde S.A.", documento: "11.222.333/0001-44", ativo: true,
    contato: { nome: "Roberta Campos", email: "credenciamento@vidaplena.exemplo", telefone: "(41) 3300-1200" },
    endereco: "Av. Cândido de Abreu, 800, Centro Cívico, Curitiba/PR, CEP 80530-000",
    fluxo: "receita", formaPagamento: "TED / Transferência Bancária", condicaoPagamento: "30 dias após o faturamento",
    banco: "001 · Ag 3344 · CC 10203-4",
    extras: { "Nome fantasia": "Vida Plena", "Registro ANS": "412345", "Dia de corte do lote": "20", "Prazo de retorno": "30 dias", "Inscrição municipal": "0102030405", "Inscrição estadual": "Isento", "E-mail de faturamento": "faturamento@vidaplena.exemplo", "Contato de credenciamento": "Roberta Campos" },
  },
  {
    id: "p2", codigo: "CLI-0002", tipo: "cliente", subtipo: "operadora", pessoa: "PJ", nome: "Amparo Saúde Cooperativa", documento: "22.333.444/0001-55", ativo: true,
    contato: { nome: "Diego Moura", email: "rede@amparo.exemplo", telefone: "(41) 3300-2200" },
    endereco: "Rua XV de Novembro, 1.500, Centro, Curitiba/PR, CEP 80060-000",
    fluxo: "receita", formaPagamento: "Boleto Bancário", condicaoPagamento: "45 dias após o faturamento",
    extras: { "Registro ANS": "398877", "Dia de corte do lote": "25", "Prazo de retorno": "45 dias", "E-mail de faturamento": "contas@amparo.exemplo" },
  },
  {
    id: "p3", codigo: "CLI-0003", tipo: "cliente", subtipo: "particular_pj", pessoa: "PJ", nome: "Instituto Raízes de Educação Ltda.", documento: "33.444.555/0001-66", ativo: true,
    contato: { nome: "Fernanda Lopes", email: "financeiro@raizes.exemplo", telefone: "(41) 3300-3300" },
    endereco: "Rua Mateus Leme, 2.020, São Francisco, Curitiba/PR, CEP 80530-010",
    fluxo: "receita", formaPagamento: "Boleto Bancário", condicaoPagamento: "À vista",
    extras: { "Paciente/beneficiário": "Alunos com laudo TEA (convênio escolar)", "E-mail de faturamento": "financeiro@raizes.exemplo" },
  },
  {
    id: "p4", codigo: "CLI-0004", tipo: "cliente", subtipo: "pf", pessoa: "PF", nome: "Juliana Prado Moreira", documento: "123.456.789-00", ativo: true,
    contato: { nome: "Juliana Prado Moreira", email: "juliana.prado@exemplo.com", telefone: "(41) 99800-1111" },
    endereco: "Rua Itupava, 455, ap. 32, Alto da XV, Curitiba/PR, CEP 80045-140",
    fluxo: "receita", formaPagamento: "PIX", condicaoPagamento: "Mensal antecipado",
    extras: { RG: "12.345.678-9", "Responsável legal": "Juliana Prado Moreira", Parentesco: "Mãe", "Paciente/beneficiário": "Tomás Prado Moreira", "CPF do paciente": "987.654.321-00", "Data de nascimento do paciente": "12/03/2019" },
  },
  {
    id: "p5", codigo: "CLI-0005", tipo: "cliente", subtipo: "liminar", pessoa: "PF", nome: "Pedro Henrique Sales (Liminar)", documento: "234.567.890-11", ativo: true,
    contato: { nome: "Marta Sales", email: "marta.sales@exemplo.com", telefone: "(41) 99800-2222" },
    fluxo: "receita", formaPagamento: "Depósito judicial", condicaoPagamento: "Conforme decisão",
    extras: { Processo: "0001234-56.2026.8.16.0001", Vara: "3ª Vara Cível de Curitiba", "Responsável legal": "Marta Sales", Parentesco: "Mãe", "CPF do responsável": "234.567.890-11" },
  },
  {
    id: "p6", codigo: "FOR-0001", tipo: "fornecedor", subtipo: "fornecedor_pj", pessoa: "PJ", nome: "Clínica Integrar Terapias Ltda.", documento: "12.345.678/0001-90", ativo: true, homologado: true,
    contato: { nome: "Ana Beatriz Lemos", email: "contratos@integrar.exemplo", telefone: "(41) 3300-6600" },
    endereco: "Rua das Acácias, 120, Bacacheri, Curitiba/PR, CEP 82510-000",
    fluxo: "despesa", formaPagamento: "TED / Transferência Bancária", condicaoPagamento: "30 dias após a nota",
    banco: "001 · Ag 1234 · CC 56789-0 (conta corrente)",
    extras: { "Natureza jurídica": "Sociedade Empresária Limitada", "Regime tributário": "Lucro Presumido", CNAE: "8650-0/04", "Responsável técnico": "Ana Beatriz Lemos", Conselho: "CREFITO-8 123456-F", "Retenções aplicáveis": "ISS 5% · IRRF 1,5% · CSRF 4,65%", "E-mail financeiro": "financeiro@integrar.exemplo" },
  },
  {
    id: "p7", codigo: "FOR-0002", tipo: "fornecedor", subtipo: "locador", pessoa: "PJ", nome: "Imobiliária Horizonte Ltda.", documento: "44.555.666/0001-77", ativo: true, homologado: true,
    contato: { nome: "Sérgio Albuquerque", email: "locacao@horizonte.exemplo", telefone: "(41) 3300-7700" },
    endereco: "Av. Sete de Setembro, 3.000, Rebouças, Curitiba/PR, CEP 80230-010",
    fluxo: "despesa", formaPagamento: "Boleto Bancário", condicaoPagamento: "Dia 5 do mês",
    banco: "341 · Ag 4321 · CC 98765-4",
    extras: { "Natureza jurídica": "Sociedade Empresária Limitada", "Regime tributário": "Simples Nacional", CNAE: "6821-8/01" },
  },
  {
    id: "p8", codigo: "FOR-0003", tipo: "fornecedor", subtipo: "pj_corporativo", pessoa: "PJ", nome: "Nuvem Clínica Sistemas Ltda.", documento: "55.666.777/0001-88", ativo: true, homologado: true,
    contato: { nome: "Lucas Viana", email: "comercial@nuvemclinica.exemplo", telefone: "(11) 4000-8800" },
    endereco: "Av. Brigadeiro Faria Lima, 4.400, Itaim Bibi, São Paulo/SP, CEP 04538-132",
    fluxo: "despesa", formaPagamento: "Cartão de Crédito", condicaoPagamento: "Mensal",
    extras: { "Natureza jurídica": "Sociedade Empresária Limitada", "Regime tributário": "Lucro Real", CNAE: "6203-1/00" },
  },
  {
    id: "p9", codigo: "FOR-0004", tipo: "fornecedor", subtipo: "clt", pessoa: "PF", nome: "Camila Rocha Duarte", documento: "345.678.901-22", ativo: true, homologado: true,
    contato: { nome: "Camila Rocha Duarte", email: "camila.duarte@exemplo.com", telefone: "(41) 99800-3333" },
    endereco: "Rua Brasílio Itiberê, 3.100, Água Verde, Curitiba/PR, CEP 80250-160",
    fluxo: "despesa", formaPagamento: "Depósito Conta Salário", condicaoPagamento: "5º dia útil",
    banco: "104 · Ag 0375 · CS 00012345-6 (conta salário)",
    extras: { Cargo: "Psicóloga ABA", CBO: "2515-10", Admissão: "01/06/2026", "Carga horária semanal": "40h (Segunda a Sexta)", "Escala de trabalho": "Segunda a Sexta, 8h às 17h", CTPS: "Digital", "Série CTPS": "—", "PIS/PASEP/NIT": "123.45678.90-1", RG: "9.876.543-2", "Órgão emissor RG": "SESP/PR", Salário: "R$ 6.200,00", "Vale-transporte": "Sim", "Status do vínculo": "Em experiência" },
  },
  {
    id: "p10", codigo: "FOR-0005", tipo: "fornecedor", subtipo: "autonomo", pessoa: "PF", nome: "Rafael Nunes Teixeira", documento: "456.789.012-33", ativo: true, homologado: true,
    contato: { nome: "Rafael Nunes Teixeira", email: "rafael.teixeira@exemplo.com", telefone: "(41) 99800-4444" },
    endereco: "Rua Padre Anchieta, 1.800, Bigorrilho, Curitiba/PR, CEP 80730-000",
    fluxo: "despesa", formaPagamento: "PIX", condicaoPagamento: "15 dias após o RPA",
    banco: "PIX: rafael.teixeira@exemplo.com",
    extras: { Cargo: "Fonoaudiólogo (autônomo)", CBO: "2238-10", Conselho: "CRFa-3 9876", "Retenções aplicáveis": "INSS 11% · IRRF tabela progressiva · ISS 5%" },
  },
  {
    id: "p11", codigo: "FOR-0006", tipo: "fornecedor", subtipo: "pj_corporativo", pessoa: "PJ", nome: "Limpa Bem Serviços Gerais Ltda.", documento: "66.777.888/0001-99", ativo: true, homologado: true,
    contato: { nome: "Paula Ribeiro", email: "contratos@limpabem.exemplo", telefone: "(41) 3300-1111" },
    fluxo: "despesa", formaPagamento: "Boleto Bancário", condicaoPagamento: "30 dias após a nota",
    extras: { "Natureza jurídica": "Sociedade Empresária Limitada", "Regime tributário": "Simples Nacional", CNAE: "8121-4/00", "Retenções aplicáveis": "INSS 11% (cessão de mão de obra)" },
  },
  {
    id: "p12", codigo: "FOR-0007", tipo: "fornecedor", subtipo: "fornecedor_pj", pessoa: "PJ", nome: "Movimento Fisioterapia Ltda.", documento: "77.888.999/0001-00", ativo: true, homologado: true,
    contato: { nome: "Thiago Prates", email: "adm@movimento.exemplo", telefone: "(41) 3300-1212" },
    fluxo: "despesa", formaPagamento: "TED / Transferência Bancária", condicaoPagamento: "30 dias após a nota",
    banco: "237 · Ag 0101 · CC 44556-7",
    extras: { "Regime tributário": "Lucro Presumido", CNAE: "8650-0/04", "Responsável técnico": "Thiago Prates", Conselho: "CREFITO-8 654321-F" },
  },
  {
    id: "p13", codigo: "FOR-0008", tipo: "fornecedor", subtipo: "pj_corporativo", pessoa: "PJ", nome: "Gráfica Pontual Ltda.", documento: "88.999.000/0001-11", ativo: false, homologado: false,
    contato: { nome: "Rita Gomes", email: "rita@pontual.exemplo", telefone: "(41) 3300-1313" },
    fluxo: "despesa", formaPagamento: "Boleto Bancário", condicaoPagamento: "À vista",
    extras: { "Regime tributário": "Simples Nacional" },
  },
];

/* ------------------------------------------------------------------ */
/* Minutas padrão                                                      */
/* ------------------------------------------------------------------ */

const cl = (id: string, titulo: string, texto: string): Clausula => ({ id, titulo, texto });

const PREAMBULO = "Pelo presente instrumento particular, de um lado {{CONTRATANTE_RAZAO_SOCIAL}}, inscrita no CNPJ sob o nº {{CONTRATANTE_CNPJ}}, com sede em {{CONTRATANTE_ENDERECO}}, doravante CONTRATANTE, e de outro {{CONTRATADA_NOME_RAZAO}}, inscrita sob o nº {{CONTRATADA_DOC_FEDERAL}}, com sede em {{CONTRATADA_ENDERECO}}, neste ato representada por {{CONTRATADA_REPRESENTANTE}}, doravante CONTRATADA, têm entre si justo e contratado o que segue.";

const CLAUSULAS_PJA_V2: Clausula[] = [
  cl("c1", "Preâmbulo & Qualificação das Partes", PREAMBULO),
  cl("c2", "Cláusula 1ª — Do Objeto", "O presente contrato tem por objeto a {{OBJETO_DETALHADO}}, conforme o plano terapêutico de cada paciente, sob a gestão de {{GESTOR_CONTRATO}}."),
  cl("c3", "Cláusula 2ª — Da Vigência", "O contrato vigora de {{DATA_INICIO_VIGENCIA}} a {{DATA_FIM_VIGENCIA}}, pelo prazo de {{PRAZO_MESES}}, podendo ser prorrogado por Termo Aditivo."),
  cl("c4", "Cláusula 3ª — Do Preço e do Pagamento", "Pelos serviços, a CONTRATANTE pagará {{VALOR_MENSAL}} ({{VALOR_MENSAL_EXTENSO}}) por mês, por {{FORMA_PAGAMENTO}}, com vencimento no dia {{DIA_PAGAMENTO_VENCIMENTO}}, mediante nota fiscal."),
  cl("c5", "Cláusula 4ª — Do Reajuste", "O valor será reajustado anualmente pelo {{INDICE_REAJUSTE}}, na data-base do aniversário do contrato."),
  cl("c6", "Cláusula 5ª — Da Responsabilidade Técnica", "A CONTRATADA manterá responsável técnico habilitado no conselho de classe competente e apresentará as certidões exigidas no dossiê."),
  cl("c7", "Cláusula 6ª — Da Proteção de Dados", "As partes tratarão os dados pessoais e sensíveis dos pacientes exclusivamente para a execução deste contrato, nos termos da Lei nº 13.709/2018 (LGPD). Canal de privacidade: {{CANAL_DENUNCIA_LGPD}}."),
  cl("c8", "Cláusula 7ª — Da Rescisão", "Qualquer das partes poderá rescindir o contrato mediante aviso prévio de {{DIAS_AVISO_PREVIO}}, sem multa."),
  cl("c9", "Cláusula 8ª — Do Foro", "Fica eleito o foro da comarca de {{CIDADE_FORO}}/{{UF_FORO}}."),
];

const CLAUSULAS_PJA_V21: Clausula[] = [
  ...CLAUSULAS_PJA_V2.slice(0, 5),
  cl("c6", "Cláusula 5ª — Da Responsabilidade Técnica", "A CONTRATADA manterá responsável técnico habilitado no conselho de classe competente e apresentará as certidões exigidas no dossiê, renovando-as antes do vencimento."),
  cl("c7", "Cláusula 6ª — Da Proteção de Dados", "As partes tratarão os dados pessoais e sensíveis dos pacientes exclusivamente para a execução deste contrato, nos termos da Lei nº 13.709/2018 (LGPD), comunicando qualquer incidente de segurança em até 48 horas a {{CANAL_DENUNCIA_LGPD}}."),
  cl("c7b", "Cláusula 7ª — Da Anticorrupção", "As partes declaram conhecer a Lei nº 12.846/2013 e se comprometem a não praticar atos lesivos à administração pública."),
  cl("c8", "Cláusula 8ª — Da Rescisão", "Qualquer das partes poderá rescindir o contrato mediante aviso prévio de {{DIAS_AVISO_PREVIO}}, sem multa."),
  cl("c9", "Cláusula 9ª — Do Foro", "Fica eleito o foro da comarca de {{CIDADE_FORO}}/{{UF_FORO}}."),
];

const CLAUSULAS_CLT: Clausula[] = [
  cl("k1", "Preâmbulo & Qualificação das Partes", "Pelo presente contrato individual de trabalho, {{CONTRATANTE_RAZAO_SOCIAL}}, CNPJ {{CONTRATANTE_CNPJ}}, doravante EMPREGADORA, admite {{CONTRATADA_NOME_RAZAO}}, CPF {{CONTRATADA_DOC_FEDERAL}}, doravante EMPREGADO."),
  cl("k2", "Cláusula 1ª — Da Função", "O EMPREGADO exercerá a função de {{OBJETO_DETALHADO}}, sob a supervisão de {{GESTOR_CONTRATO}}."),
  cl("k3", "Cláusula 2ª — Do Período de Experiência", "Os primeiros 90 dias (45 + 45) constituem período de experiência, a partir de {{DATA_INICIO_VIGENCIA}}."),
  cl("k4", "Cláusula 3ª — Da Remuneração", "O salário mensal é de {{VALOR_MENSAL}} ({{VALOR_MENSAL_EXTENSO}}), pago até o {{DIA_PAGAMENTO_VENCIMENTO}}º dia útil, reajustado pelo {{INDICE_REAJUSTE}}."),
  cl("k5", "Cláusula 4ª — Do Sigilo", "O EMPREGADO manterá sigilo sobre dados de pacientes, nos termos da LGPD e do código de ética profissional."),
];

const CLAUSULAS_REC: Clausula[] = [
  cl("r1", "Preâmbulo & Qualificação das Partes", "Pelo presente instrumento, {{CONTRATADA_NOME_RAZAO}}, CNPJ {{CONTRATADA_DOC_FEDERAL}}, doravante OPERADORA, credencia {{CONTRATANTE_RAZAO_SOCIAL}}, CNPJ {{CONTRATANTE_CNPJ}}, para a prestação de terapias a seus beneficiários."),
  cl("r2", "Cláusula 1ª — Do Objeto", "Credenciamento para {{OBJETO_DETALHADO}}."),
  cl("r3", "Cláusula 2ª — Da Tabela e do Faturamento", "Os atendimentos serão faturados mensalmente pela tabela anexa, por {{FORMA_PAGAMENTO}}, com vencimento no dia {{DIA_PAGAMENTO_VENCIMENTO}}."),
  cl("r4", "Cláusula 3ª — Da Vigência", "Vigência de {{DATA_INICIO_VIGENCIA}} a {{DATA_FIM_VIGENCIA}}, com reajuste anual pelo {{INDICE_REAJUSTE}}."),
  cl("r5", "Cláusula 4ª — Do Foro", "Fica eleito o foro da comarca de {{CIDADE_FORO}}/{{UF_FORO}}."),
];

const MINUTAS: Minuta[] = [
  { id: "m1", codigo: "MIN-PJA", titulo: "Prestação de Serviços Terapêuticos (PJ)", categoria: "PJ Assistencial", grupo: "PJ Assistencial", versao: "v2.1", status: "vigente", revisor: "Dra. Helena Duarte (Jurídico)", data: "2026-06-15", motivo: "Inclusão da cláusula anticorrupção e prazo de 48h para incidente LGPD.", clausulas: CLAUSULAS_PJA_V21 },
  { id: "m2", codigo: "MIN-PJA", titulo: "Prestação de Serviços Terapêuticos (PJ)", categoria: "PJ Assistencial", grupo: "PJ Assistencial", versao: "v2.0", status: "obsoleta", revisor: "Dra. Helena Duarte (Jurídico)", data: "2025-11-03", motivo: "Revisão anual: cláusula de proteção de dados.", clausulas: CLAUSULAS_PJA_V2 },
  { id: "m3", codigo: "MIN-PJA", titulo: "Prestação de Serviços Terapêuticos (PJ)", categoria: "PJ Assistencial", grupo: "PJ Assistencial", versao: "v1.0", status: "obsoleta", revisor: "Dr. Otávio Ramos (Jurídico)", data: "2025-02-10", motivo: "Versão inaugural (v1.0) homologada pelo Jurídico.", clausulas: CLAUSULAS_PJA_V2.filter((c) => c.id !== "c7") },
  { id: "m4", codigo: "MIN-CLT", titulo: "Contrato Individual de Trabalho", categoria: "CLT Trabalho", grupo: "CLT", versao: "v1.2", status: "vigente", revisor: "Dra. Helena Duarte (Jurídico)", data: "2026-03-20", motivo: "Ajuste à CCT 2026.", clausulas: CLAUSULAS_CLT },
  { id: "m5", codigo: "MIN-REC", titulo: "Credenciamento de Operadora", categoria: "Operadora Saúde", grupo: "Receita", versao: "v1.0", status: "vigente", revisor: "Dr. Otávio Ramos (Jurídico)", data: "2025-09-01", motivo: "Versão inaugural (v1.0) homologada pelo Jurídico.", clausulas: CLAUSULAS_REC },
  {
    id: "m6", codigo: "MIN-PAR", titulo: "Atendimento Particular", categoria: "Paciente Particular", grupo: "Receita", versao: "v1.1", status: "vigente", revisor: "Dr. Otávio Ramos (Jurídico)", data: "2026-01-12", motivo: "Inclusão do responsável legal.",
    clausulas: [
      cl("t1", "Preâmbulo & Qualificação das Partes", "{{CONTRATANTE_RAZAO_SOCIAL}}, CNPJ {{CONTRATANTE_CNPJ}}, doravante CLÍNICA, e {{CONTRATADA_NOME_RAZAO}}, inscrito sob o nº {{CONTRATADA_DOC_FEDERAL}}, por seu responsável legal {{CONTRATADA_REPRESENTANTE}}, doravante CONTRATANTE, celebram o presente."),
      ...CLAUSULAS_REC.slice(1, 5).map((c) => ({ ...c, id: c.id.replace("r", "t") })),
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Contratos                                                           */
/* ------------------------------------------------------------------ */

const ev = (id: string, data: string, tipo: Evento["tipo"], titulo: string, autor: string, detalhe?: string): Evento => ({ id, data, tipo, titulo, autor, ...(detalhe && { detalhe }) });
const JARDIM = "Unidade Jardim", GIRASSOL = "Unidade Girassol", CENTRO = "Unidade Centro";

/**
 * Contrato "bruto": os dados e as datas do ciclo de vida. `completa` monta a
 * partir disso as versões (RN-010), o histórico de workflow com o papel de
 * cada evento (RN-071), a auditoria (RN-066) e as cláusulas resolvidas.
 */
type Bruto = Omit<Contrato, "versao" | "versoes" | "workflow" | "auditoria" | "dataBase" | "clausulas" | "avisoPrevioDias" | "prazoSaneamentoDias" | "exigeNf" | "clausulaIndisponibilidade"> &
  Partial<Pick<Contrato, "avisoPrevioDias" | "prazoSaneamentoDias" | "exigeNf" | "clausulaIndisponibilidade">> & {
    criado: { data: string; autor: string };
    submetido?: string;
    /** Revisões formais antes da aprovação (minor). */
    revisoes?: { data: string; revisor: string; motivo: string; resumo: string; clausulas?: Clausula[] }[];
    /** Cláusulas editadas no contrato depois da criação: id → novo texto. */
    edicoes?: Record<string, string>;
    /** Contrato legado sem cláusulas gravadas. */
    semClausulas?: boolean;
  };

let seqAud = 0;
const aud = (data: string, usuario: string, perfil: string, acao: string, detalhes: string): RegistroAuditoria => ({ id: `aud-${++seqAud}`, data, usuario, perfil, acao, detalhes });

function completa(b: Bruto, aditivos: Aditivo[]): Contrato {
  const { criado, submetido, revisoes = [], edicoes = {}, semClausulas, ...dados } = b;
  const minuta = b.minuta && MINUTAS.find((m) => m.codigo === b.minuta!.codigo && m.versao === b.minuta!.versao);
  const base = { avisoPrevioDias: 30, prazoSaneamentoDias: 15, exigeNf: true, clausulaIndisponibilidade: false, ...dados };
  const valores = valoresDasTags(base, PARTES.find((p) => p.id === b.parteId));
  const original = b.modalidade === "adesao" && !semClausulas ? clausulasDoContrato(minuta, valores) : undefined;
  const clausulas = original?.map((c) => (edicoes[c.id] ? { ...c, texto: edicoes[c.id]!, editada: true } : c));

  const versoes: Versao[] = [];
  const workflow: RegistroWorkflow[] = [];
  const auditoria: RegistroAuditoria[] = [];
  let versao = "v1.0";
  let wf = 0;
  const reg = (data: string, w: RegistroWorkflow["workflow"], de: string, para: string, usuario: string, papel: string, parecer?: string) =>
    workflow.push({ id: `${b.id}-wf-${++wf}`, data, workflow: w, de, para, usuario, papel, ...(parecer && { parecer }) });
  const novaVersao = (data: string, tipo: "minor" | "major", fase: string, motivo: string, resumo: string, revisor: string, texto = clausulas) => {
    versao = proximaVersao(versao, tipo);
    versoes.push({ versao, data, fase, motivo, resumo, revisor, ...(texto && { clausulas: texto }) });
  };

  versoes.push({ versao: "v1.0", data: criado.data, fase: "Elaboração Inicial", motivo: "Abertura do Contrato", resumo: minuta ? `Gerado da ${minuta.codigo} ${minuta.versao}.` : b.modalidade === "adesao" ? "Cláusulas padrão." : "Documento externo anexado (Fluxo Invertido).", revisor: criado.autor, ...(original && { clausulas: original }) });
  reg(criado.data, "ciclo", "—", "Em Elaboração", criado.autor, PAPEL_WORKFLOW.submissao);
  auditoria.push(aud(`${criado.data}T09:00`, criado.autor, "Gestor da Área", "CRIACAO_CONTRATO", `Contrato ${b.id} criado (${b.modalidade}) com v1.0 e checklist de dossiê pendente.`));
  for (const r of revisoes) {
    novaVersao(r.data, "minor", "Elaboração", r.motivo, r.resumo, r.revisor, r.clausulas ?? clausulas);
    auditoria.push(aud(`${r.data}T10:00`, r.revisor, "Jurídico", "REVISAO_FORMAL", `Revisão ${versao}: ${r.motivo}`));
  }
  if (submetido) {
    reg(submetido, "aprovacao", "Em Elaboração", "Em Aprovação", criado.autor, PAPEL_WORKFLOW.submissao);
    auditoria.push(aud(`${submetido}T14:00`, criado.autor, "Gestor da Área", "WORKFLOW_SUBMETER", "Em Elaboração → Em Aprovação"));
  }
  if (b.reprovacao) {
    reg(b.reprovacao.data, "aprovacao", "Em Aprovação", "Reprovado (Em Ajuste)", b.reprovacao.aprovador, PAPEL_WORKFLOW.reprovacao, `Reprovado por ${b.reprovacao.aprovador}: ${b.reprovacao.motivo}`);
    auditoria.push(aud(`${b.reprovacao.data}T15:00`, b.reprovacao.aprovador, "Aprovador", "WORKFLOW_REPROVAR", b.reprovacao.motivo));
  }
  if (b.aprovador) {
    reg(b.aprovador.data, "aprovacao", "Em Aprovação", "Aprovado", b.aprovador.nome, PAPEL_WORKFLOW.aprovacao, b.aprovador.parecer);
    reg(b.aprovador.data, "assinatura", "Aguardando Aprovação Prévia", "Pronto para Coleta", "Sistema", PAPEL_WORKFLOW.liberacao);
    novaVersao(b.aprovador.data, "minor", "Aprovação", "Aprovação de Governança", b.aprovador.parecer, b.aprovador.nome);
    auditoria.push(aud(`${b.aprovador.data}T16:00`, b.aprovador.nome, "Aprovador", "WORKFLOW_APROVAR", `Aprovado (${versao}): ${b.aprovador.parecer}`));
  }
  if (b.envelope) {
    reg(b.envelope.data, "assinatura", "Pronto para Coleta", "Em Assinatura", "Bruno Siqueira", PAPEL_WORKFLOW.despacho, `${b.envelope.plataforma} · envelope ${b.envelope.id}`);
    auditoria.push(aud(`${b.envelope.data}T11:00`, "Bruno Siqueira", "Operador de Contratos", "WORKFLOW_DESPACHAR", `${b.envelope.plataforma} ${b.envelope.id}`));
  }
  if (b.assinaturaConcluida) {
    reg(b.assinaturaConcluida, "assinatura", b.envelope ? "Em Assinatura" : "Pronto para Coleta", "Assinado Digitalmente", b.envelope?.plataforma ?? "Assinatura presencial", PAPEL_WORKFLOW.conclusao);
    novaVersao(b.assinaturaConcluida, "minor", "Assinatura", "Conclusão da assinatura", "Contrato Vigente.", "Bruno Siqueira");
    auditoria.push(aud(`${b.assinaturaConcluida}T17:00`, "Bruno Siqueira", "Operador de Contratos", "WORKFLOW_CONCLUIR", `Assinado Digitalmente · Vigente (${versao})`));
  }
  for (const a of aditivos.filter((x) => x.contratoId === b.id).sort((x, y) => x.data.localeCompare(y.data))) {
    novaVersao(a.data, a.origem === "adequacao" ? "major" : "minor", "Aditivos & Reajuste", a.tipo, a.impacto, "Patrícia Gomes");
    reg(a.data, "ciclo", "Vigente", "Vigente Repactuado", "Patrícia Gomes", PAPEL_WORKFLOW.aditivo, a.codigo);
    auditoria.push(aud(`${a.data}T09:30`, "Patrícia Gomes", "Controladoria", a.origem === "reajuste" ? "REAJUSTE_APLICAR" : "ADITIVO_REGISTRAR", `${a.codigo}: ${a.impacto}`));
  }
  if (Object.keys(edicoes).length) {
    auditoria.push(aud(`${criado.data}T11:00`, criado.autor, "Gestor da Área", "CLAUSULA_EDITAR", `Cláusula(s) editada(s): ${Object.keys(edicoes).join(", ")}.`));
  }
  if (b.encerramento) {
    versoes.push({ versao: `${versao}-ENC`, data: b.encerramento.data, fase: "Encerramento", motivo: `[${b.encerramento.tipo}] ${b.encerramento.motivo}`, resumo: "Contrato encerrado. Estado final.", revisor: "Carlos Menezes", ...(clausulas && { clausulas }) });
    reg(b.encerramento.data, "ciclo", b.encerramento.origem, "Encerrado", "Carlos Menezes", PAPEL_WORKFLOW.encerramento, `[${b.encerramento.tipo}] ${b.encerramento.motivo}`);
    auditoria.push(aud(`${b.encerramento.data}T14:00`, "Carlos Menezes", "Diretoria", "ENCERRAMENTO", `[${b.encerramento.tipo}] ${b.encerramento.motivo}`));
  }

  const eventos = [...b.eventos];
  for (const v of versoes.slice(1)) {
    if (!eventos.some((e) => e.tipo === "versao" && e.titulo.includes(v.versao))) {
      eventos.push(ev(`${b.id}-v-${v.versao}`, `${v.data}T18:00`, "versao", `Versão ${v.versao} registrada · ${v.motivo}`, v.revisor, v.resumo));
    }
  }

  return {
    ...base,
    versao,
    versoes,
    workflow,
    auditoria: auditoria.sort((x, y) => x.data.localeCompare(y.data)),
    eventos: eventos.sort((x, y) => x.data.localeCompare(y.data)),
    ...(clausulas && { clausulas }),
    ...(b.status !== "encerrado" && { dataBase: dataBase(b.inicio) }),
  };
}

const BRUTOS: Bruto[] = [
  {
    id: "CTR-2026-0001", modalidade: "adesao", categoria: "PJ Assistencial", fluxo: "despesa", fluxoDetalhe: "Despesa (Contratação)", parteId: "p6",
    objeto: "prestação de serviços de terapia ocupacional e integração sensorial",
    status: "vigente", fase: "vigente", aprovacao: "aprovado", assinatura: "assinado",
    gestor: "Coordenação de Terapias", centroCusto: "101 - Clínica & Terapias", regraRemuneracao: "Valor fixo mensal (pacote de 160h)",
    valor: 18_500, formaPagamento: "TED / Transferência Bancária", condicaoPagamento: "30 dias após a nota", vencimentoDia: 10,
    dadosBancarios: "001 · Ag 1234 · CC 56789-0", criterioGlosa: "Sessões sem check-in no prontuário não são pagas.",
    inicio: "2025-08-18", fim: "2026-08-17", tipoPrazo: "Determinado (12m)", indice: "IPCA (IBGE)", mesBase: "Agosto",
    clausulaIndisponibilidade: true, recesso: { credito: 24, usados: 9.5 }, equipamentosCedidos: "Kit de integração sensorial (patrimônio 0042)",
    unidades: [JARDIM, GIRASSOL],
    minuta: { codigo: "MIN-PJA", versao: "v2.0" },
    camposCategoria: { "Conselho de Classe Profissional": "CREFITO-8 123456-F", "Responsável Técnico Habilitado": "Ana Beatriz Lemos", "Carga Horária Semanal Alocada": "40h / semana", "Prontuário & Check-in Obrigatório?": "Sim (Condição de Pagamento)", "Supervisão Técnica Vinculada": "Coordenação de Terapias Pediátricas", "Seguro de Responsabilidade Civil": "Apólice RC Profissional 2026" },
    criado: { data: "2025-07-20", autor: "Marina Alves" }, submetido: "2025-07-22",
    revisoes: [{ data: "2025-07-28", revisor: "Dra. Helena Duarte", motivo: "Ajuste pedido pelo aprovador", resumo: "Índice substituto na cláusula de reajuste." }],
    edicoes: { "cl-5": "O valor será reajustado anualmente pelo IPCA (IBGE), na data-base do aniversário do contrato. Na falta do índice, aplica-se o INPC." },
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2025-08-01", parecer: "Valores dentro da tabela de PJ assistencial. Aprovado." },
    envelope: { plataforma: "Clicksign", id: "CS-8F2A-1190", data: "2025-08-05" }, assinaturaConcluida: "2025-08-15", assinadoDigital: true,
    eventos: [
      ev("e1", "2025-07-20T09:12", "criacao", "Contrato criado a partir da MIN-PJA v2.0", "Marina Alves"),
      ev("e2", "2025-07-22T14:30", "workflow", "Submetido para aprovação", "Marina Alves"),
      ev("e4", "2025-08-01T16:40", "workflow", "Aprovado com parecer", "Carlos Menezes", "Valores dentro da tabela de PJ assistencial."),
      ev("e5", "2025-08-05T11:00", "workflow", "Despachado para assinatura · Clicksign CS-8F2A-1190", "Bruno Siqueira"),
      ev("e6", "2025-08-15T17:22", "workflow", "Assinatura concluída · contrato Vigente", "Bruno Siqueira"),
      ev("e7", "2026-02-10T08:45", "dossie", "Certidão negativa federal protocolada", "Sofia Lima"),
      ev("e8", "2026-07-08T10:15", "cobranca", "NFS-e 2026/0712 recebida por leitura automática", "Sistema"),
      ev("e9", "2026-07-09T15:02", "erp", "Omie ERP Sincronizado: Título #88412", "Sistema"),
    ],
  },
  {
    id: "CTR-2026-0002", modalidade: "corporativo", categoria: "TI / Software / SaaS", fluxo: "despesa", fluxoDetalhe: "Despesa (Contratação)", parteId: "p8",
    objeto: "licença do software de prontuário e agenda em nuvem",
    status: "vigente", fase: "vigente", aprovacao: "aprovado", assinatura: "assinado",
    gestor: "TI & Sistemas", centroCusto: "301 - Tecnologia", regraRemuneracao: "Assinatura mensal por licença (50 assentos)",
    valor: 9_800, formaPagamento: "Cartão de Crédito", condicaoPagamento: "Mensal", vencimentoDia: 1, exigeNf: true,
    inicio: "2025-09-01", fim: "2027-08-31", tipoPrazo: "Determinado (24m)", indice: "IGP-M (FGV)", mesBase: "Setembro", avisoPrevioDias: 60,
    unidades: [JARDIM, GIRASSOL, CENTRO],
    arquivo: { nome: "contrato-nuvem-clinica-negociado.pdf", tamanho: 1_840_000 },
    camposCategoria: { "Quantidade de Licenças / Assentos": "50", "Tier / Plano Contratado": "Business Professional", "SLA Mínimo Garantido (Uptime)": "99,8%", "Renovação Automática?": "Sim (Requer aviso prévio para cancelamento)", "Prazo de Aviso Não-Renovação": "60 dias de antecedência", "Hospedagem / Conformidade LGPD": "AWS São Paulo (Brasil) · criptografado" },
    criado: { data: "2025-08-10", autor: "Bruno Siqueira" }, submetido: "2025-08-12",
    aprovador: { nome: "Dra. Helena Duarte (Jurídico)", data: "2025-08-20", parecer: "Cláusulas de SLA e LGPD revisadas no documento do fornecedor." },
    envelope: { plataforma: "DocuSign", id: "DS-55C1-7720", data: "2025-08-22" }, assinaturaConcluida: "2025-08-28", assinadoDigital: true,
    eventos: [
      ev("e1", "2025-08-10T10:00", "criacao", "Contrato criado por upload (Fluxo Invertido)", "Bruno Siqueira"),
      ev("e2", "2025-08-20T09:30", "workflow", "Aprovado com parecer", "Dra. Helena Duarte"),
      ev("e3", "2025-08-28T18:10", "workflow", "Assinatura concluída · contrato Vigente", "Bruno Siqueira"),
    ],
  },
  {
    id: "CTR-2026-0003", modalidade: "especifico", categoria: "Locação Imobiliária", fluxo: "despesa", fluxoDetalhe: "Despesa (Contratação)", parteId: "p7",
    objeto: "locação do imóvel da Unidade Girassol, Rua das Palmeiras, 455",
    status: "vigente", fase: "aditivos", aprovacao: "aprovado", assinatura: "assinado",
    gestor: "Facilities & Infraestrutura", centroCusto: "401 - Imóveis", regraRemuneracao: "Aluguel fixo mensal",
    valor: 14_253.8, formaPagamento: "Boleto Bancário", condicaoPagamento: "Dia 5 do mês", vencimentoDia: 5, exigeNf: false,
    inicio: "2023-10-21", fim: "2026-10-20", tipoPrazo: "Determinado (36m)", indice: "IGP-M (FGV)", mesBase: "Outubro", avisoPrevioDias: 90,
    regraReajusteEspecifica: "Reajuste anual pelo IGP-M; na deflação, mantém o valor.",
    ultimoReajuste: { data: "2025-10-21", taxa: 4.5, valorAnterior: 13_640 },
    unidades: [GIRASSOL],
    arquivo: { nome: "locacao-girassol-assinado.pdf", tamanho: 2_310_000 },
    camposCategoria: { "Valor IPTU Mensal (R$)": "780,00", "Valor Condomínio (R$)": "0,00", "Garantia Locatícia / Fiança": "Seguro Fiança (Porto Seguro)", "Matrícula do Imóvel / Cartório": "Matrícula 45.120 - 2º RGI de Curitiba", "Destinação do Imóvel": "Comercial / Atendimento Clínico", "Apólice de Seguro Incêndio": "AP-990812-TOKIO" },
    criado: { data: "2023-09-30", autor: "Bruno Siqueira" }, submetido: "2023-10-02",
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2023-10-10", parecer: "Locação compatível com o plano de expansão." },
    envelope: { plataforma: "Gov.br", id: "GOV-2023-10-0098", data: "2023-10-12" }, assinaturaConcluida: "2023-10-20", assinadoDigital: true,
    eventos: [
      ev("e1", "2023-09-30T09:00", "criacao", "Contrato criado por upload", "Bruno Siqueira"),
      ev("e2", "2023-10-10T15:00", "workflow", "Aprovado com parecer", "Carlos Menezes"),
      ev("e3", "2023-10-20T12:00", "workflow", "Assinatura concluída · contrato Vigente", "Bruno Siqueira"),
      ev("e4", "2025-10-21T09:00", "aditivo", "1º Termo Aditivo (Reajuste Financeiro) · IGP-M 4,50%", "Patrícia Gomes"),
    ],
  },
  {
    id: "CTR-2026-0004", modalidade: "adesao", categoria: "Operadora Saúde", fluxo: "receita", fluxoDetalhe: "Receita (Atendimento)", parteId: "p1",
    objeto: "credenciamento para terapias ABA, fonoaudiologia e terapia ocupacional",
    status: "vigente", fase: "vigente", aprovacao: "aprovado", assinatura: "assinado",
    gestor: "Faturamento & Convênios", centroCusto: "201 - Receitas de Convênio", regraRemuneracao: "Tabela de honorários por sessão (TUSS)",
    valor: 96_000, formaPagamento: "TED / Transferência Bancária", condicaoPagamento: "30 dias após o faturamento", vencimentoDia: 20,
    criterioGlosa: "Glosas contestadas em até 30 dias úteis pelo portal da operadora.",
    inicio: "2026-01-01", fim: "2027-12-31", tipoPrazo: "Determinado (24m)", indice: "IPCA (IBGE)", mesBase: "Janeiro",
    unidades: [JARDIM, GIRASSOL, CENTRO],
    minuta: { codigo: "MIN-REC", versao: "v1.0" },
    camposCategoria: { "Registro ANS da Operadora": "412345", "Código do Prestador Credenciado": "CRED-889900", "Tabela de Honorários Vinculada": "Tabela Própria Negociada", "Dia de Fechamento / Corte TISS": "Dia 20 de cada mês", "Prazo de Pagamento (Glosa / Recurso)": "30 dias úteis", "Canal de Envio XML TISS": "Webservice da operadora" },
    criado: { data: "2025-11-20", autor: "Marina Alves" }, submetido: "2025-11-25",
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2025-12-05", parecer: "Tabela negociada aprovada." },
    envelope: { plataforma: "Clicksign", id: "CS-91DD-3301", data: "2025-12-08" }, assinaturaConcluida: "2025-12-18", assinadoDigital: true,
    eventos: [ev("e1", "2025-11-20T10:00", "criacao", "Contrato criado a partir da MIN-REC v1.0", "Marina Alves"), ev("e2", "2025-12-18T09:00", "workflow", "Assinatura concluída · contrato Vigente", "Bruno Siqueira")],
  },
  {
    id: "CTR-2026-0005", modalidade: "adesao", categoria: "CLT Trabalho", fluxo: "despesa", fluxoDetalhe: "Despesa (Pessoal)", parteId: "p9",
    objeto: "Psicóloga ABA, 40h semanais",
    status: "vigente", fase: "vigente", aprovacao: "aprovado", assinatura: "assinado",
    gestor: "RH / DP", centroCusto: "102 - Equipe Clínica", regraRemuneracao: "Salário mensal CLT",
    valor: 6_200, formaPagamento: "Depósito Conta Salário", condicaoPagamento: "5º dia útil", vencimentoDia: 5, exigeNf: false,
    inicio: "2026-06-01", fim: "2026-08-29", experienciaAte: "2026-08-29", tipoPrazo: "Experiência (45 + 45 dias)", indice: "Dissídio CCT", mesBase: "Maio",
    unidades: [JARDIM],
    minuta: { codigo: "MIN-CLT", versao: "v1.2" },
    camposCategoria: { "Cargo / Função CBO": "Psicóloga ABA - CBO 2515-10", "Jornada Semanal Contratual": "40h semanais", "Regime de Banco de Horas": "Não", "Sindicato / Convenção Coletiva (CCT)": "Sindicato dos Psicólogos do Paraná", "Período de Experiência": "45 + 45 dias", "Opção Vale Transporte": "Sim (Desconto legal 6%)" },
    criado: { data: "2026-05-20", autor: "Renata Freitas" }, submetido: "2026-05-21",
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2026-05-25", parecer: "Vaga aprovada no orçamento." },
    assinaturaConcluida: "2026-05-30", assinadoDigital: false,
    eventos: [ev("e1", "2026-05-20T09:00", "criacao", "Contrato criado a partir da MIN-CLT v1.2", "Renata Freitas"), ev("e2", "2026-05-30T16:00", "workflow", "Assinatura presencial registrada · contrato Vigente", "Renata Freitas")],
  },
  {
    id: "CTR-2026-0006", modalidade: "adesao", categoria: "PJ Assistencial", fluxo: "despesa", fluxoDetalhe: "Despesa (Contratação)", parteId: "p10",
    objeto: "prestação de serviços de fonoaudiologia (linguagem)",
    status: "em_elaboracao", fase: "elaboracao", aprovacao: "elaboracao", assinatura: "bloqueada",
    gestor: "Coordenação de Terapias", centroCusto: "101 - Clínica & Terapias", regraRemuneracao: "Valor hora (R$ 110/h)",
    valor: 7_400, formaPagamento: "PIX", condicaoPagamento: "15 dias após o RPA", vencimentoDia: 15,
    inicio: "2026-08-15", fim: "2027-08-14", tipoPrazo: "Determinado (12m)", indice: "IPCA (IBGE)", mesBase: "Agosto",
    clausulaIndisponibilidade: true, recesso: { credito: 24, usados: 0 },
    unidades: [CENTRO],
    minuta: { codigo: "MIN-PJA", versao: "v2.1" },
    camposCategoria: { "Conselho de Classe Profissional": "CRFa-3 9876", "Carga Horária Semanal Alocada": "16h / semana", "Prontuário & Check-in Obrigatório?": "Sim (Condição de Pagamento)" },
    criado: { data: "2026-07-27", autor: "Marina Alves" },
    eventos: [ev("e1", "2026-07-27T14:10", "criacao", "Contrato criado a partir da MIN-PJA v2.1", "Marina Alves")],
  },
  {
    id: "CTR-2026-0007", modalidade: "adesao", categoria: "Paciente Particular", fluxo: "receita", fluxoDetalhe: "Receita (Atendimento)", parteId: "p3",
    objeto: "atendimento terapêutico a alunos do convênio escolar",
    status: "em_aprovacao", fase: "aprovacao", aprovacao: "em_aprovacao", assinatura: "bloqueada",
    gestor: "Comercial & Parcerias", centroCusto: "202 - Receitas Particulares", regraRemuneracao: "Pacote mensal por aluno atendido",
    valor: 22_000, formaPagamento: "Boleto Bancário", condicaoPagamento: "À vista", vencimentoDia: 10,
    inicio: "2026-08-01", fim: "2027-07-31", tipoPrazo: "Determinado (12m)", indice: "IPCA (IBGE)", mesBase: "Agosto",
    unidades: [JARDIM],
    minuta: { codigo: "MIN-PAR", versao: "v1.1" },
    criado: { data: "2026-07-21", autor: "Marina Alves" }, submetido: "2026-07-24",
    eventos: [ev("e1", "2026-07-21T10:00", "criacao", "Contrato criado a partir da MIN-PAR v1.1", "Marina Alves"), ev("e2", "2026-07-24T17:45", "workflow", "Submetido para aprovação", "Marina Alves")],
  },
  {
    id: "CTR-2026-0008", modalidade: "corporativo", categoria: "Serviços Terceirizados", fluxo: "despesa", fluxoDetalhe: "Despesa (Contratação)", parteId: "p11",
    objeto: "limpeza e conservação das três unidades",
    status: "reprovado", fase: "elaboracao", aprovacao: "reprovado", assinatura: "bloqueada",
    gestor: "Facilities & Infraestrutura", centroCusto: "402 - Serviços Gerais", regraRemuneracao: "Valor fixo mensal por posto",
    valor: 11_300, formaPagamento: "Boleto Bancário", condicaoPagamento: "30 dias após a nota", vencimentoDia: 10,
    criterioGlosa: "Desconto proporcional por posto descoberto, conforme medição.",
    inicio: "2026-09-01", fim: "2027-08-31", tipoPrazo: "Determinado (12m)", indice: "IPCA (IBGE)", mesBase: "Setembro",
    unidades: [JARDIM, GIRASSOL, CENTRO],
    arquivo: { nome: "proposta-limpa-bem-2026.pdf", tamanho: 960_000 },
    criado: { data: "2026-07-14", autor: "Bruno Siqueira" }, submetido: "2026-07-16",
    reprovacao: { aprovador: "Carlos Menezes (Diretoria)", data: "2026-07-23", motivo: "Multa rescisória de 3 mensalidades acima do padrão. Negociar para 1 mensalidade e reenviar." },
    eventos: [
      ev("e1", "2026-07-14T09:00", "criacao", "Contrato criado por upload (Fluxo Invertido)", "Bruno Siqueira"),
      ev("e2", "2026-07-16T11:00", "workflow", "Submetido para aprovação", "Bruno Siqueira"),
      ev("e3", "2026-07-23T15:20", "workflow", "Reprovado", "Carlos Menezes", "Multa rescisória de 3 mensalidades acima do padrão."),
    ],
  },
  {
    id: "CTR-2026-0009", modalidade: "adesao", categoria: "Operadora Saúde", fluxo: "receita", fluxoDetalhe: "Receita (Atendimento)", parteId: "p2",
    objeto: "credenciamento para terapias ABA na Unidade Centro",
    status: "pronto_coleta", fase: "assinatura", aprovacao: "aprovado", assinatura: "pronto_coleta",
    gestor: "Faturamento & Convênios", centroCusto: "201 - Receitas de Convênio", regraRemuneracao: "Tabela de honorários por sessão (TUSS)",
    valor: 48_000, formaPagamento: "Boleto Bancário", condicaoPagamento: "45 dias após o faturamento", vencimentoDia: 25,
    inicio: "2026-09-01", fim: "2028-08-31", tipoPrazo: "Determinado (24m)", indice: "IPCA (IBGE)", mesBase: "Setembro",
    unidades: [CENTRO],
    minuta: { codigo: "MIN-REC", versao: "v1.0" },
    camposCategoria: { "Registro ANS da Operadora": "398877", "Tabela de Honorários Vinculada": "TUSS Padrão ANS", "Dia de Fechamento / Corte TISS": "Dia 25 de cada mês" },
    criado: { data: "2026-07-10", autor: "Marina Alves" }, submetido: "2026-07-15",
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2026-07-28", parecer: "Tabela aprovada. Liberar para coleta de assinaturas." },
    eventos: [
      ev("e1", "2026-07-10T10:00", "criacao", "Contrato criado a partir da MIN-REC v1.0", "Marina Alves"),
      ev("e2", "2026-07-15T09:30", "workflow", "Submetido para aprovação", "Marina Alves"),
      ev("e3", "2026-07-28T16:00", "workflow", "Aprovado com parecer", "Carlos Menezes"),
    ],
  },
  {
    id: "CTR-2026-0010", modalidade: "especifico", categoria: "Paciente Particular", fluxo: "receita", fluxoDetalhe: "Receita (Atendimento)", parteId: "p5",
    objeto: "terapia ABA intensiva determinada por decisão liminar",
    status: "em_assinatura", fase: "assinatura", aprovacao: "aprovado", assinatura: "em_assinatura",
    gestor: "Jurídico", centroCusto: "203 - Receitas Judiciais", regraRemuneracao: "Valor fixo mensal conforme decisão",
    valor: 15_600, formaPagamento: "Depósito judicial", condicaoPagamento: "Conforme decisão", vencimentoDia: 10, exigeNf: false,
    inicio: "2026-08-01", fim: "2027-01-31", tipoPrazo: "Determinado (6m)", indice: "IPCA (IBGE)", mesBase: "Agosto",
    liminar: { processo: "0001234-56.2026.8.16.0001", vara: "3ª Vara Cível de Curitiba" },
    unidades: [JARDIM],
    arquivo: { nome: "termo-liminar-pedro-sales.pdf", tamanho: 640_000 },
    camposCategoria: { "Carga horária determinada": "20h semanais", "Prazo da decisão": "180 dias" },
    criado: { data: "2026-07-18", autor: "Marina Alves" }, submetido: "2026-07-19",
    aprovador: { nome: "Dra. Helena Duarte (Jurídico)", data: "2026-07-22", parecer: "Cumprimento obrigatório da decisão. Aprovado." },
    envelope: { plataforma: "Clicksign", id: "CS-A7B3-5521", data: "2026-07-24" },
    eventos: [
      ev("e1", "2026-07-18T08:30", "criacao", "Contrato criado por upload · origem liminar", "Marina Alves"),
      ev("e2", "2026-07-22T13:00", "workflow", "Aprovado com parecer", "Dra. Helena Duarte"),
      ev("e3", "2026-07-24T10:10", "workflow", "Despachado para assinatura · Clicksign CS-A7B3-5521", "Bruno Siqueira"),
    ],
  },
  {
    id: "CTR-2025-0018", modalidade: "adesao", categoria: "Paciente Particular", fluxo: "receita", fluxoDetalhe: "Receita (Atendimento)", parteId: "p4",
    objeto: "atendimento terapêutico particular de Tomás Prado Moreira",
    status: "vigente", fase: "vigente", aprovacao: "aprovado", assinatura: "assinado",
    gestor: "Comercial & Parcerias", centroCusto: "202 - Receitas Particulares", regraRemuneracao: "Pacote mensal (12 sessões)",
    valor: 4_800, formaPagamento: "PIX", condicaoPagamento: "Mensal antecipado", vencimentoDia: 5, exigeNf: false,
    inicio: "2025-07-26", fim: "2026-07-25", tipoPrazo: "Determinado (12m)", indice: "IPCA (IBGE)", mesBase: "Julho",
    unidades: [GIRASSOL],
    minuta: { codigo: "MIN-PAR", versao: "v1.0" }, codigoManual: true, semClausulas: true,
    criado: { data: "2025-07-10", autor: "Marina Alves" }, submetido: "2025-07-11",
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2025-07-15", parecer: "Aprovado." },
    envelope: { plataforma: "Clicksign", id: "CS-1180-0042", data: "2025-07-18" }, assinaturaConcluida: "2025-07-24", assinadoDigital: true,
    eventos: [ev("e1", "2025-07-10T10:00", "criacao", "Contrato legado cadastrado (código manual)", "Marina Alves")],
  },
  {
    id: "CTR-2025-0040", modalidade: "adesao", categoria: "PJ Assistencial", fluxo: "despesa", fluxoDetalhe: "Despesa (Contratação)", parteId: "p12",
    objeto: "prestação de serviços de fisioterapia motora",
    status: "vigente", fase: "vigente", aprovacao: "aprovado", assinatura: "assinado",
    gestor: "Coordenação de Terapias", centroCusto: "101 - Clínica & Terapias", regraRemuneracao: "Valor por sessão (R$ 115/sessão)",
    valor: 9_200, formaPagamento: "TED / Transferência Bancária", condicaoPagamento: "30 dias após a nota", vencimentoDia: 10,
    inicio: "2025-12-01", fim: "2027-03-31", tipoPrazo: "Determinado (16m)", indice: "INPC", mesBase: "Dezembro",
    clausulaIndisponibilidade: true, recesso: { credito: 24, usados: 12 },
    unidades: [CENTRO],
    minuta: { codigo: "MIN-PJA", versao: "v2.0" },
    criado: { data: "2025-11-10", autor: "Marina Alves" }, submetido: "2025-11-12",
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2025-11-20", parecer: "Aprovado." },
    envelope: { plataforma: "ICP-Brasil", id: "ICP-2025-77120", data: "2025-11-25" }, assinaturaConcluida: "2025-11-28", assinadoDigital: true,
    eventos: [ev("e1", "2025-11-10T10:00", "criacao", "Contrato criado a partir da MIN-PJA v2.0", "Marina Alves")],
  },
  {
    id: "CTR-2025-0031", modalidade: "adesao", categoria: "PJ Assistencial", fluxo: "despesa", fluxoDetalhe: "Despesa (Contratação)", parteId: "p13",
    objeto: "impressão de materiais terapêuticos",
    status: "encerrado", fase: "encerramento", aprovacao: "aprovado", assinatura: "assinado",
    gestor: "Compras & Suprimentos", centroCusto: "403 - Materiais", regraRemuneracao: "Por pedido (tabela anexa)",
    valor: 1_900, formaPagamento: "Boleto Bancário", condicaoPagamento: "À vista", vencimentoDia: 10,
    inicio: "2025-03-01", fim: "2026-02-28", tipoPrazo: "Determinado (12m)", indice: "IPCA (IBGE)", mesBase: "Março",
    unidades: [JARDIM],
    minuta: { codigo: "MIN-PJA", versao: "v1.0" },
    criado: { data: "2025-02-15", autor: "Bruno Siqueira" }, submetido: "2025-02-16",
    aprovador: { nome: "Carlos Menezes (Diretoria)", data: "2025-02-20", parecer: "Aprovado." },
    envelope: { plataforma: "Clicksign", id: "CS-0099-1212", data: "2025-02-22" }, assinaturaConcluida: "2025-02-26", assinadoDigital: true,
    encerramento: { data: "2026-01-15", tipo: "Distrato amigável", motivo: "Fornecedor deixou de atender a região.", distrato: { nome: "distrato-grafica-pontual.pdf", tamanho: 310_000 }, origem: "Vigente" },
    eventos: [
      ev("e1", "2025-02-15T10:00", "criacao", "Contrato criado", "Bruno Siqueira"),
      ev("e2", "2026-01-15T14:00", "encerramento", "Encerramento & Distrato Formal · Distrato amigável", "Carlos Menezes", "Fornecedor deixou de atender a região."),
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Aditivos, dossiê, cobranças                                         */
/* ------------------------------------------------------------------ */

/** Aditivos registrados: nascem Aprovado e Assinado e atualizam o contrato (RN-039; Decisão pendente Q-07). */
const ADITIVOS: Aditivo[] = [
  { id: "a1", contratoId: "CTR-2026-0003", numero: 1, codigo: "TA-01/CTR-2026-0003", origem: "reajuste", tipo: "Reajuste Financeiro", data: "2025-10-21", novoValor: 14_253.8, valorAnterior: 13_640, motivo: "Reajuste anual IGP-M (FGV) na data-base.", impacto: "Valor base ajustado de R$ 13.640,00 para R$ 14.253,80 (+4,50%)", aprovacao: "aprovado", assinatura: "assinado" },
  { id: "a3", contratoId: "CTR-2026-0001", numero: 1, codigo: "TA-01/CTR-2026-0001", origem: "manual", tipo: "Inclusão de unidade", data: "2026-03-02", motivo: "Atendimento passa a incluir a Unidade Girassol.", impacto: "Ajuste de escopo / prazo", aprovacao: "aprovado", assinatura: "assinado", arquivo: { nome: "aditivo-01-ctr-2026-0001.pdf", tamanho: 220_000 } },
  { id: "a4", contratoId: "CTR-2026-0004", numero: 1, codigo: "TA-01/CTR-2026-0004", origem: "manual", tipo: "Alteração de tabela", data: "2026-05-10", novoValor: 96_000, valorAnterior: 92_000, motivo: "Inclusão de códigos de musicoterapia.", impacto: "Novo valor base R$ 96.000,00", aprovacao: "aprovado", assinatura: "assinado" },
];

const CONTRATOS: Contrato[] = BRUTOS.map((b) => completa(b, ADITIVOS));

const PDF = (nome: string, tamanho = 180_000) => ({ nome, tamanho });

/**
 * Dossiê: o checklist inicial de cada contrato (RN-031) com o estado de hoje,
 * mais os documentos fora do checklist (`DOS-{contrato}-NN`).
 */
type EstadoChecklist = Partial<Pick<DossieItem, "conformidade" | "arquivo" | "validade" | "auditor" | "observacoes" | "protocolo">>;
function dossieDoContrato(c: Contrato, estados: EstadoChecklist[], extras: Omit<DossieItem, "id" | "codigo" | "contratoId">[] = []): DossieItem[] {
  const chk = checklistInicial(c.id, !!c.liminar).map((i, n) => ({ ...i, ...estados[n] }));
  const mais = extras.map((e, n) => ({ ...e, id: `${c.id}-extra-${n + 1}`, codigo: `DOS-${c.id}-${String(chk.length + n + 1).padStart(2, "0")}`, contratoId: c.id }));
  return [...chk, ...mais];
}
const ok = (arquivo: string, auditor = "Sofia Lima", validade?: string, protocolo?: string): EstadoChecklist => ({ conformidade: "conforme", arquivo: PDF(arquivo), auditor, ...(validade && { validade }), ...(protocolo && { protocolo }) });
const C = (id: string) => CONTRATOS.find((c) => c.id === id)!;

const DOSSIE: DossieItem[] = [
  ...dossieDoContrato(C("CTR-2026-0001"), [ok("contrato-social-integrar.pdf"), ok("cnd-federal-integrar.pdf", "Sofia Lima", "2026-12-10", "2026-02-10"), ok("crefito-ana-lemos.pdf")], [
    { natureza: "Fiscal / Habilitação", documento: "CRF FGTS", conformidade: "conforme", arquivo: PDF("crf-fgts-integrar.pdf"), validade: "2026-08-30", auditor: "Sofia Lima" },
  ]),
  ...dossieDoContrato(C("CTR-2026-0002"), [ok("contrato-social-nuvem.pdf"), ok("cnd-federal-nuvem.pdf", "Sofia Lima", "2026-11-20"), ok("certidao-tecnica-nuvem.pdf")], [
    { natureza: "Regulatória / Técnica", documento: "Relatório de segurança da informação (SOC 2)", conformidade: "pendente" },
  ]),
  ...dossieDoContrato(C("CTR-2026-0003"), [ok("contrato-social-horizonte.pdf"), ok("cnd-federal-horizonte.pdf", "Sofia Lima", "2027-01-15"), ok("creci-horizonte.pdf")], [
    { natureza: "Imóvel", documento: "Matrícula do imóvel", conformidade: "conforme", arquivo: PDF("matricula-palmeiras-455.pdf", 540_000), auditor: "Sofia Lima" },
    { natureza: "Imóvel", documento: "AVCB", conformidade: "conforme", arquivo: PDF("avcb-girassol.pdf"), validade: "2027-04-01", auditor: "Sofia Lima" },
  ]),
  ...dossieDoContrato(C("CTR-2026-0004"), [ok("estatuto-vida-plena.pdf"), ok("cnd-vida-plena.pdf", "Sofia Lima", "2026-12-01"), ok("registro-ans-vida-plena.pdf")]),
  ...dossieDoContrato(C("CTR-2026-0005"), [ok("rg-cpf-camila.pdf", "Renata Freitas"), ok("cnd-pf-camila.pdf", "Renata Freitas"), { conformidade: "pendente", observacoes: "ASO admissional agendado para 05/08." }], [
    { natureza: "Regulatória / Técnica", documento: "Registro no CRP", conformidade: "conforme", arquivo: PDF("crp-camila-duarte.pdf"), auditor: "Renata Freitas" },
  ]),
  ...dossieDoContrato(C("CTR-2026-0006"), [{}, {}, {}]),
  ...dossieDoContrato(C("CTR-2026-0007"), [ok("contrato-social-raizes.pdf"), {}, ok("alvara-raizes.pdf")]),
  ...dossieDoContrato(C("CTR-2026-0008"), [ok("contrato-social-limpabem.pdf"), {}, {}]),
  ...dossieDoContrato(C("CTR-2026-0009"), [ok("estatuto-amparo.pdf"), ok("cnd-amparo.pdf", "Sofia Lima", "2026-10-30"), ok("registro-ans-amparo.pdf")]),
  ...dossieDoContrato(C("CTR-2026-0010"), [ok("rg-marta-sales.pdf", "Dra. Helena Duarte"), ok("cnd-pf-marta.pdf", "Dra. Helena Duarte"), {}, ok("decisao-liminar-0001234.pdf", "Dra. Helena Duarte")]),
  ...dossieDoContrato(C("CTR-2025-0018"), [ok("rg-juliana-prado.pdf"), ok("cnd-pf-juliana.pdf"), ok("laudo-tomas.pdf")]),
  ...dossieDoContrato(C("CTR-2025-0040"), [ok("contrato-social-movimento.pdf"), ok("cnd-movimento.pdf", "Sofia Lima", "2026-11-02"), ok("crefito-thiago.pdf")], [
    { natureza: "Regulatória / Técnica", documento: "Laudo de vigilância sanitária", conformidade: "nao_conforme", arquivo: PDF("visa-movimento-2025.pdf"), validade: "2026-06-30", auditor: "Sofia Lima", observacoes: "Laudo vencido em 30/06/2026." },
  ]),
  ...dossieDoContrato(C("CTR-2025-0031"), [ok("contrato-social-pontual.pdf"), ok("cnd-pontual.pdf"), ok("alvara-pontual.pdf")]),
];

const COBRANCAS: Cobranca[] = [
  { id: "b1", codigo: "DOC-CTR-2026-0001-01", contratoId: "CTR-2026-0001", fluxo: "despesa", parteId: "p6", competencia: "2026-07", tipo: "NFS-e", numero: "2026/0712", valor: 18_500, vencimento: "2026-08-10", conferencia: "aprovado", conformidade: "conforme", liberado: true, erp: { status: "sincronizado", titulo: "88412", data: "2026-07-09T15:02", comprovante: "{\"codigo_status\":\"0\",\"descricao_status\":\"Conta a Pagar cadastrada com sucesso\",\"codigo_lancamento_omie\":\"88412\"}" }, arquivo: { nome: "nfse-2026-0712.xml", tamanho: 14_000 }, autoDetectado: true },
  { id: "b2", codigo: "DOC-CTR-2026-0003-01", contratoId: "CTR-2026-0003", fluxo: "despesa", parteId: "p7", competencia: "2026-08", tipo: "Fatura de Locação", numero: "LOC-0826", valor: 15_033.8, vencimento: "2026-08-05", conferencia: "pendente", conformidade: "pendente", liberado: false, erp: { status: "travado" }, arquivo: { nome: "fatura-locacao-agosto.pdf", tamanho: 210_000 }, observacao: "Valor inclui IPTU (R$ 780,00)." },
  { id: "b3", codigo: "DOC-CTR-2026-0002-01", contratoId: "CTR-2026-0002", fluxo: "despesa", parteId: "p8", competencia: "2026-07", tipo: "NF-e", numero: "000.451.902", valor: 9_800, vencimento: "2026-08-01", conferencia: "aprovado", conformidade: "conforme", liberado: true, erp: { status: "erro", motivo: "Fornecedor sem conta bancária cadastrada no Omie (código FOR-0003). Cadastre a conta no Omie e sincronize de novo.", data: "2026-07-29T10:12" }, arquivo: { nome: "nfe-451902.xml", tamanho: 18_000 }, autoDetectado: true },
  { id: "b4", codigo: "DOC-CTR-2026-0004-01", contratoId: "CTR-2026-0004", fluxo: "receita", parteId: "p1", competencia: "2026-06", tipo: "Fatura", numero: "FAT-2026-06-VP", valor: 94_310, vencimento: "2026-07-20", conferencia: "aprovado", conformidade: "conforme", liberado: true, erp: { status: "sincronizado", titulo: "77301", data: "2026-07-01T09:00", comprovante: "{\"codigo_status\":\"0\",\"descricao_status\":\"Conta a Receber cadastrada com sucesso\",\"codigo_lancamento_omie\":\"77301\"}" } },
  { id: "b5", codigo: "DOC-CTR-2026-0005-01", contratoId: "CTR-2026-0005", fluxo: "despesa", parteId: "p9", competencia: "2026-07", tipo: "Folha de Pagamento", numero: "FOLHA-07/2026", valor: 6_200, vencimento: "2026-08-07", conferencia: "aprovado", conformidade: "conforme", liberado: true, erp: { status: "pendente" } },
  { id: "b6", codigo: "DOC-CTR-2025-0040-01", contratoId: "CTR-2025-0040", fluxo: "despesa", parteId: "p12", competencia: "2026-07", tipo: "NFS-e", numero: "2026/0233", valor: 9_200, vencimento: "2026-08-10", conferencia: "pendente", conformidade: "nao_conforme", liberado: false, erp: { status: "travado" }, arquivo: { nome: "nfse-2026-0233.xml", tamanho: 12_000 }, autoDetectado: true, observacao: "Dossiê com laudo sanitário vencido." },
  { id: "b7", codigo: "DOC-CTR-2025-0018-01", contratoId: "CTR-2025-0018", fluxo: "receita", parteId: "p4", competencia: "2026-07", tipo: "Boleto Bancário", numero: "BOL-0718", valor: 4_800, vencimento: "2026-07-05", conferencia: "aprovado", conformidade: "conforme", liberado: true, erp: { status: "sincronizado", titulo: "77288", data: "2026-07-01T09:00", comprovante: "{\"codigo_status\":\"0\",\"descricao_status\":\"Conta a Receber cadastrada com sucesso\",\"codigo_lancamento_omie\":\"77288\"}" } },
  { id: "b8", codigo: "DOC-CTR-2026-0002-02", contratoId: "CTR-2026-0002", fluxo: "despesa", parteId: "p8", competencia: "2026-06", tipo: "Recibo / RPA", numero: "RPA-0612", conferencia: "pendente", conformidade: "pendente", liberado: false, erp: { status: "travado" }, observacao: "Pendente de Anexo · valor não informado." },
];

/* ------------------------------------------------------------------ */
/* Tabelas de apoio                                                    */
/* ------------------------------------------------------------------ */

const op = (lista: string, i: number, codigo: string, descricao: string, emUso = 0, ativo = true): OpcaoTabela =>
  ({ id: `${lista}-${i}`, ordem: i * 10, codigo, descricao, ativo, emUso });

const TABELAS: Record<TabelaId, OpcaoTabela[]> = {
  categoria: [
    op("cat", 1, "PJ_ASSISTENCIAL", "PJ Assistencial", 4), op("cat", 2, "CLT_TRABALHO", "CLT Trabalho", 1), op("cat", 3, "CONSULTORIA_PROJETOS", "Consultoria Projetos", 0),
    op("cat", 4, "LOCACAO_IMOBILIARIA", "Locação Imobiliária", 1), op("cat", 5, "BANCARIO_FINANCIAMENTO", "Bancário / Financiamento", 0), op("cat", 6, "OPERADORA_SAUDE", "Operadora Saúde", 2),
    op("cat", 7, "PACIENTE_PARTICULAR", "Paciente Particular", 3), op("cat", 8, "TI_SOFTWARE_SAAS", "TI / Software / SaaS", 1), op("cat", 9, "SERVICOS_TERCEIRIZADOS", "Serviços Terceirizados", 1),
  ],
  fluxo: [op("flx", 1, "RECEITA_ATENDIMENTO", "Receita (Atendimento)", 5), op("flx", 2, "DESPESA_CONTRATACAO", "Despesa (Contratação)", 7), op("flx", 3, "DESPESA_PESSOAL", "Despesa (Pessoal)", 1)],
  forma_pagamento: [
    op("fpg", 1, "PIX", "PIX", 2), op("fpg", 2, "TED", "TED / Transferência Bancária", 3), op("fpg", 3, "BOLETO", "Boleto Bancário", 5),
    op("fpg", 4, "CONTA_SALARIO", "Depósito Conta Salário", 1), op("fpg", 5, "CARTAO", "Cartão de Crédito", 1), op("fpg", 6, "DEBITO", "Débito em Conta Corrente", 0), op("fpg", 7, "DEPOSITO_JUDICIAL", "Depósito judicial", 1),
  ],
  condicao_pagamento: [
    op("cpg", 1, "ATE_DIA_10_NF", "Até dia 10 mediante NF", 0), op("cpg", 2, "30_DIAS_DIRETO", "30 dias direto", 0), op("cpg", 3, "A_VISTA", "À vista", 2),
    op("cpg", 4, "30_DIAS_NF", "30 dias após a nota", 3), op("cpg", 5, "30_DIAS_FAT", "30 dias após o faturamento", 1), op("cpg", 6, "45_DIAS_FAT", "45 dias após o faturamento", 1),
    op("cpg", 7, "DIA_5", "Dia 5 do mês", 1), op("cpg", 8, "MENSAL", "Mensal", 1), op("cpg", 9, "QUINZENAL", "Quinzenal (dias 15 e 30)", 0), op("cpg", 10, "MEDICAO", "Contra apresentação / medição", 0),
  ],
  indice: [op("ind", 1, "IPCA", "IPCA (IBGE)", 9), op("ind", 2, "IGPM", "IGP-M (FGV)", 2), op("ind", 3, "CCT", "Dissídio CCT", 1), op("ind", 4, "INPC", "INPC", 1), op("ind", 5, "FIXO", "Sem Reajuste / Fixo", 0)],
  tipo_cobranca: [
    op("tcb", 1, "NFSE", "NFS-e", 2), op("tcb", 2, "NFE", "NF-e", 1), op("tcb", 3, "BOLETO", "Boleto Bancário", 1), op("tcb", 4, "FOLHA_PAGAMENTO", "Folha de Pagamento", 1),
    op("tcb", 5, "LOCACAO", "Fatura de Locação", 1), op("tcb", 6, "RPA", "Recibo / RPA", 1), op("tcb", 7, "FATURA", "Fatura", 1),
  ],
  natureza_dossie: [
    op("nat", 1, "JURIDICA_SOCIETARIA", "Jurídica / Societária", 13), op("nat", 2, "FISCAL_HABILITACAO", "Fiscal / Habilitação", 14), op("nat", 3, "REGULATORIA_TECNICA", "Regulatória / Técnica", 16),
    op("nat", 4, "JURIDICA_PROCESSUAL", "Jurídica / Processual", 1), op("nat", 5, "ASO_SAUDE", "ASO / Saúde", 0), op("nat", 6, "IMOVEL", "Imóvel", 2),
  ],
  tipo_aditivo: [
    op("tad", 1, "PRORROGACAO", "Prorrogação", 0), op("tad", 2, "REAJUSTE_FINANCEIRO", "Reajuste Financeiro", 1), op("tad", 3, "ALTERACAO_VALOR", "Alteração de valor", 0),
    op("tad", 4, "INCLUSAO_UNIDADE", "Inclusão de unidade", 1), op("tad", 5, "ALTERACAO_TABELA", "Alteração de tabela", 1), op("tad", 6, "ADEQUACAO_MINUTA", "Adequação de Minuta Homologada", 0),
  ],
  tipo_encerramento: [op("tenc", 1, "TERMINO", "Término de vigência", 0), op("tenc", 2, "DISTRATO", "Distrato amigável", 1), op("tenc", 3, "RESCISAO", "Rescisão unilateral", 0), op("tenc", 4, "JUDICIAL", "Encerramento judicial", 0)],
  unidade: [op("uni", 1, "JARDIM", "Unidade Jardim", 8), op("uni", 2, "GIRASSOL", "Unidade Girassol", 5), op("uni", 3, "CENTRO", "Unidade Centro", 6)],
};

/** Campos por categoria: os presets das 7 categorias padrão (FR-093, RN-065). */
const campo = (id: string, nome: string, rotulo: string, tipo: CampoCategoria["tipo"], extra: Partial<CampoCategoria> = {}): CampoCategoria => ({ id, nome, rotulo, tipo, ...extra });
const CAMPOS: Record<string, CampoCategoria[]> = {
  "Locação Imobiliária": [
    campo("f1", "iptu_mensal", "Valor IPTU Mensal (R$)", "numero", { placeholder: "Ex: 1200.00" }),
    campo("f2", "condominio_mensal", "Valor Condomínio (R$)", "numero", { placeholder: "Ex: 800.00" }),
    campo("f3", "tipo_garantia", "Garantia Locatícia / Fiança", "lista", { opcoes: ["Seguro Fiança (Porto Seguro)", "Caução (3 meses de aluguel)", "Fiador com Imóvel Quitado", "Título de Capitalização", "Sem Garantia"] }),
    campo("f4", "matricula_imovel", "Matrícula do Imóvel / Cartório", "texto", { placeholder: "Ex: Matrícula 45.120 - 2º RGI" }),
    campo("f5", "destinacao_imovel", "Destinação do Imóvel", "lista", { opcoes: ["Comercial / Atendimento Clínico", "Administrativo / Backoffice", "Armazém / Logística"] }),
    campo("f6", "apolice_incendio", "Apólice de Seguro Incêndio", "texto", { placeholder: "Ex: AP-990812-TOKIO" }),
  ],
  "TI / Software / SaaS": [
    campo("f7", "qtd_licencas", "Quantidade de Licenças / Assentos", "numero", { placeholder: "Ex: 50" }),
    campo("f8", "plano_tier", "Tier / Plano Contratado", "lista", { opcoes: ["Enterprise / Ilimitado", "Business Professional", "Standard / Básico", "Custom Dedicated"] }),
    campo("f9", "sla_minimo", "SLA Mínimo Garantido (Uptime)", "texto", { placeholder: "Ex: 99.8%" }),
    campo("f10", "renovacao_automatica", "Renovação Automática?", "lista", { opcoes: ["Sim (Requer aviso prévio para cancelamento)", "Não (Encerra no termo final)"] }),
    campo("f11", "aviso_nao_renovacao", "Prazo de Aviso Não-Renovação", "texto", { placeholder: "Ex: 30 dias de antecedência" }),
    campo("f12", "hospedagem_cloud", "Hospedagem / Conformidade LGPD", "texto", { placeholder: "AWS São Paulo (Brasil) - Criptografado" }),
  ],
  "Bancário / Financiamento": [
    campo("f13", "taxa_juros", "Taxa de Juros Pactuada", "texto", { placeholder: "Ex: 1.15% a.m. + CDI" }),
    campo("f14", "cet_anual", "CET (Custo Efetivo Total Anual)", "texto", { placeholder: "Ex: 15.8% a.a." }),
    campo("f15", "carencia_meses", "Carência de Amortização", "texto", { placeholder: "Ex: 6 meses" }),
    campo("f16", "garantia_bancaria", "Garantia Financeira / Aval", "texto", { placeholder: "Ex: Aval Pessoal dos Sócios + FGI" }),
    campo("f17", "instituicao_banco", "Instituição Concedente / Banco", "texto", { placeholder: "Ex: Banco do Brasil" }),
    campo("f18", "numero_ccb", "Número da Cédula / CCB", "texto", { placeholder: "Ex: CCB-2026/8899" }),
  ],
  "PJ Assistencial": [
    campo("f19", "conselho_classe", "Conselho de Classe Profissional", "texto", { placeholder: "Ex: CRFa 2-19880 / CRP 06/12345" }),
    campo("f20", "responsavel_tecnico", "Responsável Técnico Habilitado", "texto", { placeholder: "Ex: Dra. Ana Lemos" }),
    campo("f21", "ch_semanal", "Carga Horária Semanal Alocada", "texto", { placeholder: "Ex: 20h / semana" }),
    campo("f22", "prontuario_obrigatorio", "Prontuário & Check-in Obrigatório?", "lista", { opcoes: ["Sim (Condição de Pagamento)", "Não"] }),
    campo("f23", "supervisao_clinica", "Supervisão Técnica Vinculada", "texto", { placeholder: "Ex: Coordenação de Terapias Pediátricas" }),
    campo("f24", "seguro_rc", "Seguro de Responsabilidade Civil", "texto", { placeholder: "Ex: Apólice RC Profissional 2026" }),
  ],
  "CLT Trabalho": [
    campo("f25", "cargo_funcao_cbo", "Cargo / Função CBO", "texto", { placeholder: "Ex: Terapeuta Ocupacional - CBO 2239-05" }),
    campo("f26", "jornada_semanal", "Jornada Semanal Contratual", "texto", { placeholder: "Ex: 44h semanais" }),
    campo("f27", "banco_horas", "Regime de Banco de Horas", "lista", { opcoes: ["Sim (Acordo Individual / CCT)", "Não"] }),
    campo("f28", "cct_sindicato", "Sindicato / Convenção Coletiva (CCT)", "texto", { placeholder: "Ex: Sindicato da Saúde" }),
    campo("f29", "periodo_experiencia", "Período de Experiência", "texto", { placeholder: "Ex: 45 + 45 dias" }),
    campo("f30", "opcao_vt", "Opção Vale Transporte", "lista", { opcoes: ["Sim (Desconto legal 6%)", "Não (Declaração de não-optante)"] }),
  ],
  "Operadora Saúde": [
    campo("f31", "registro_ans", "Registro ANS da Operadora", "texto", { placeholder: "Ex: 30123-4" }),
    campo("f32", "codigo_prestador", "Código do Prestador Credenciado", "texto", { placeholder: "Ex: CRED-889900" }),
    campo("f33", "tabela_honorarios", "Tabela de Honorários Vinculada", "lista", { opcoes: ["TUSS Padrão ANS", "Tabela Própria Negociada", "CBHPM com Deflator"] }),
    campo("f34", "dia_corte_tiss", "Dia de Fechamento / Corte TISS", "texto", { placeholder: "Ex: Dia 20 de cada mês" }),
    campo("f35", "prazo_recurso_glosa", "Prazo de Pagamento (Glosa / Recurso)", "texto", { placeholder: "Ex: 30 dias úteis" }),
    campo("f36", "canal_tiss", "Canal de Envio XML TISS", "texto", { placeholder: "Ex: Webservice / Portal Operadora" }),
  ],
  "Consultoria Projetos": [
    campo("f37", "milestones", "Entregáveis / Marcos Contratuais (Milestones)", "texto", { placeholder: "Ex: Relatório mensal + homologação técnica" }),
    campo("f38", "fiscal_tecnico", "Fiscal / Gestor Técnico do Contrato", "texto", { placeholder: "Ex: Coordenação de Qualidade" }),
    campo("f39", "sla_chamados", "SLA Máximo de Atendimento / Chamados", "texto", { placeholder: "Ex: 24h úteis" }),
    campo("f40", "termo_nda", "Cláusula de Confidencialidade / NDA Específico", "lista", { opcoes: ["Sim (NDA Vinculado Obrigatório)", "Cláusula Padrão do Contrato"] }),
    campo("f41", "foro_eleicao", "Foro de Eleição Específico", "texto", { placeholder: "Ex: Comarca de Campinas / SP" }),
  ],
};

/** Taxas fixas de reajuste (RN-041). Índice fora desta lista usa 3,80% e é sinalizado. */
const INDICES = [
  { codigo: "IPCA", nome: "IPCA (IBGE)", taxa: 4.2, referencia: "taxa fixa do módulo (Decisão pendente Q-06)" },
  { codigo: "IGP-M", nome: "IGP-M (FGV)", taxa: 4.5, referencia: "taxa fixa do módulo (Decisão pendente Q-06)" },
  { codigo: "CCT", nome: "Dissídio CCT", taxa: 5.1, referencia: "taxa fixa do módulo (Decisão pendente Q-06)" },
];

const BASE: ContratosData = {
  contratos: CONTRATOS,
  partes: PARTES,
  minutas: MINUTAS,
  aditivos: ADITIVOS,
  dossie: DOSSIE,
  cobrancas: COBRANCAS,
  tabelas: TABELAS,
  camposCategoria: CAMPOS,
  indices: INDICES,
  proximoCodigo: "CTR-2026-0011",
  proximoCliente: "CLI-0006",
  proximoFornecedor: "FOR-0009",
  proximaMinuta: "MIN-007",
};

/** Carteira sem contratos: só as tabelas de apoio e as minutas, como numa implantação nova. */
const VAZIO: ContratosData = { ...BASE, contratos: [], aditivos: [], dossie: [], cobrancas: [], proximoCodigo: "CTR-2026-0001" };

export const CONTRATOS_FIXTURES: Fixture<ContratosData>[] = [
  {
    id: "contratos.base",
    label: "Carteira com contratos",
    description: "Treze contratos, um em cada estado do fluxo (elaboração, aprovação, reprovado, pronto para coleta, em assinatura, vigente, encerrado), treze partes, seis minutas, o dossiê com o checklist de cada contrato e as cobranças do mês.",
    data: BASE,
  },
  {
    id: "contratos.vazio",
    label: "Carteira vazia",
    description: "Implantação nova: nenhuma parte com contrato, nenhum contrato, dossiê ou cobrança. Tabelas de apoio e minutas já existem. Health Score 100, \"Base Oficial Pronta\", em azul.",
    data: VAZIO,
  },
];
