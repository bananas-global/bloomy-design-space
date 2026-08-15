import type { Fixture } from "@brucesantos/design-space";
import type {
  CredentialLink,
  DocumentInsurer,
  DocumentSubject,
  DocumentType,
  ProfessionalDocument,
  ProfessionalDocumentsData,
  TeamDocumentationData,
  UnitDocument,
  UnitDocumentsData,
} from "../contracts/index.js";

/**
 * Fixtures da documentação.
 *
 * As pessoas são as mesmas do cadastro da equipe e do atendimento — Marina,
 * Clara, Rui, Helena e Denise. É de propósito: a Marina exige assinatura de
 * supervisor por causa do vínculo de estágio, e é a mesma Marina que aqui está
 * com a quitação do conselho vencida. Ver os dois lados fecha o raciocínio de
 * quem vai desenhar a escala.
 *
 * Datas ancoradas em `TODAY` (30/07/2026). Nenhuma olha o relógio.
 */

const NOW = "2026-07-30T09:00:00.000-03:00";
const HOJE = "2026-07-30";

/* =============================================================== catálogo */

/**
 * Catálogo de tipos do escopo profissional.
 *
 * Sete são padrão — aparecem como lacuna mesmo sem arquivo — e apenas três são
 * obrigatórios. A diferença é deliberada: a carteirinha do conselho aparece
 * vazia porque a clínica quer vê-la, e não derruba a completude porque a
 * ausência dela não impede ninguém de atender.
 */
export const PROFESSIONAL_DOCUMENT_TYPES: DocumentType[] = [
  {
    id: "diploma",
    scope: "professional",
    name: "Certificado de formação",
    short: "Formação",
    standard: true,
    required: true,
    expires: false,
    icon: "fa-graduation-cap",
    hint: "Diploma ou certificado de conclusão do curso superior",
  },
  {
    id: "council",
    scope: "professional",
    name: "Registro no conselho",
    short: "Conselho",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-id-badge",
    hint: "Número de inscrição ativo no conselho de classe",
  },
  {
    id: "council_card",
    scope: "professional",
    name: "Carteirinha do conselho",
    short: "Carteirinha",
    standard: true,
    required: false,
    expires: true,
    icon: "fa-address-card",
    hint: "Carteirinha emitida pelo conselho, frente e verso",
  },
  {
    id: "council_quit",
    scope: "professional",
    name: "Declaração de quitação do conselho",
    short: "Quitação",
    standard: true,
    required: false,
    expires: true,
    icon: "fa-file-circle-check",
    hint: "Comprova que a anuidade do conselho está quitada",
  },
  {
    id: "aba_course",
    scope: "professional",
    name: "Curso de formação em ABA",
    short: "Curso ABA",
    standard: true,
    required: false,
    expires: false,
    icon: "fa-brain",
    hint: "Formação, supervisão ou curso de ABA com carga horária",
  },
  {
    id: "special_training",
    scope: "professional",
    name: "Formação especial",
    short: "Form. especial",
    standard: true,
    required: false,
    expires: false,
    icon: "fa-certificate",
    hint: "Certificado de abordagem específica — Integração Sensorial, Bobath, PECS, Denver",
  },
  {
    id: "criminal",
    scope: "professional",
    name: "Certidão negativa criminal",
    short: "Cert. criminal",
    standard: true,
    required: false,
    expires: true,
    icon: "fa-shield-halved",
    hint: "Certidão negativa exigida por parte das operadoras",
  },
  {
    id: "id",
    scope: "professional",
    name: "RG / CPF",
    short: "RG/CPF",
    standard: false,
    required: true,
    expires: false,
    icon: "fa-id-card",
    hint: "Documento de identidade com CPF",
  },
  {
    id: "address",
    scope: "professional",
    name: "Comprovante de endereço",
    short: "Endereço",
    standard: false,
    required: false,
    expires: true,
    icon: "fa-house",
    hint: "Conta de consumo dos últimos três meses",
  },
  {
    id: "cv",
    scope: "professional",
    name: "Currículo",
    short: "Currículo",
    standard: false,
    required: false,
    expires: false,
    icon: "fa-file-lines",
    hint: "Currículo atualizado, exigido por parte das operadoras",
  },
  {
    id: "specialization",
    scope: "professional",
    name: "Certificado de especialização",
    short: "Especialização",
    standard: false,
    required: false,
    expires: false,
    icon: "fa-award",
    hint: "Pós-graduação ou especialização concluída",
  },
];

/**
 * Tipos internos e ocupacionais.
 *
 * Nenhum deles é compartilhável com operadora, e é essa a razão de existirem
 * como escopos separados em vez de mais sete linhas na mesma lista: contrato,
 * termo de LGPD e ASO são da relação da clínica com a pessoa, não da relação da
 * clínica com o convênio.
 */
export const INTERNAL_DOCUMENT_TYPES: DocumentType[] = [
  {
    id: "contract",
    scope: "internal",
    name: "Contrato PJ",
    short: "Contrato",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-file-signature",
    hint: "Contrato de prestação de serviço vigente",
  },
  {
    id: "nda",
    scope: "internal",
    name: "Termo de confidencialidade",
    short: "Confidencial.",
    standard: true,
    required: true,
    expires: false,
    icon: "fa-user-secret",
    hint: "Assinado na admissão, sem renovação",
  },
  {
    id: "lgpd",
    scope: "internal",
    name: "Termo LGPD",
    short: "LGPD",
    standard: true,
    required: true,
    expires: false,
    icon: "fa-shield",
    hint: "Tratamento de dados de paciente e de responsável legal",
  },
  {
    id: "train_aba",
    scope: "internal",
    name: "Treinamento ABA interno",
    short: "Treino ABA",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-chalkboard-user",
    hint: "Trilha interna de ABA, renovada a cada dois anos",
  },
  {
    id: "train_crisis",
    scope: "internal",
    name: "Treinamento de manejo de crise",
    short: "Manejo crise",
    standard: true,
    required: false,
    expires: true,
    icon: "fa-hand-holding-heart",
    hint: "Protocolo de manejo de comportamento em crise",
  },
  {
    id: "aso",
    scope: "occupational",
    name: "ASO periódico",
    short: "ASO",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-stethoscope",
    hint: "Atestado de saúde ocupacional em dia",
  },
  {
    id: "vaccine",
    scope: "occupational",
    name: "Carteira de vacinação",
    short: "Vacinação",
    standard: true,
    required: false,
    expires: true,
    icon: "fa-syringe",
    hint: "Comprovante das vacinas exigidas para saúde",
  },
];

/**
 * Documentos padrão da unidade.
 *
 * Doze, todos obrigatórios e iguais para todas as operadoras — ao contrário do
 * escopo profissional, onde cada convênio exige o seu conjunto. A diferença tem
 * uma razão concreta: aqui quem cobra é a vigilância sanitária, e ela não
 * negocia por convênio.
 */
export const UNIT_DOCUMENT_TYPES: DocumentType[] = [
  {
    id: "cli",
    scope: "unit",
    name: "CLI — Certificado de Licenciamento Integrado",
    short: "CLI",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-file-shield",
    hint: "Licenciamento integrado da prefeitura · renovação anual",
  },
  {
    id: "alvara",
    scope: "unit",
    name: "Alvará de Funcionamento",
    short: "Alvará",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-building-circle-check",
    hint: "Autorização municipal para operar no endereço · renovação anual",
  },
  {
    id: "avcb",
    scope: "unit",
    name: "AVCB — Auto de Vistoria do Corpo de Bombeiros",
    short: "AVCB",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-fire-extinguisher",
    hint: "Vistoria do Corpo de Bombeiros · renovação a cada três anos",
  },
  {
    id: "vigilancia",
    scope: "unit",
    name: "Licença da Vigilância Sanitária",
    short: "Vigilância",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-microscope",
    hint: "Licença sanitária do estabelecimento de saúde · renovação anual",
  },
  {
    id: "cnes",
    scope: "unit",
    name: "CNES — Cadastro Nacional de Estabelecimentos de Saúde",
    short: "CNES",
    standard: true,
    required: true,
    expires: false,
    icon: "fa-hospital",
    hint: "Comprovante de cadastro no CNES · sem validade",
  },
  {
    id: "crp",
    scope: "unit",
    name: "Registro no CRP",
    short: "CRP",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-brain",
    hint: "Registro da pessoa jurídica no conselho de psicologia · renovação anual",
  },
  {
    id: "crefito",
    scope: "unit",
    name: "Registro no CREFITO",
    short: "CREFITO",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-person-walking",
    hint: "Registro da pessoa jurídica no conselho de fisioterapia e terapia ocupacional · renovação anual",
  },
  {
    id: "crefono",
    scope: "unit",
    name: "Registro no CREFONO",
    short: "CREFONO",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-comment-medical",
    hint: "Registro da pessoa jurídica no conselho de fonoaudiologia · renovação anual",
  },
  {
    id: "dedetizacao",
    scope: "unit",
    name: "Certificado de Dedetização",
    short: "Dedetização",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-bug-slash",
    hint: "Controle de pragas com certificado da empresa aplicadora · renovação a cada seis meses",
  },
  {
    id: "potabilidade",
    scope: "unit",
    name: "Laudo de Potabilidade da Água",
    short: "Potabilidade",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-droplet",
    hint: "Análise laboratorial exigida pela vigilância · renovação a cada seis meses",
  },
  {
    id: "residuos",
    scope: "unit",
    name: "PGRSS — Plano de Gerenciamento de Resíduos",
    short: "PGRSS",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-recycle",
    hint: "Plano e comprovante de coleta de resíduos de serviços de saúde · renovação anual",
  },
  {
    id: "locacao",
    scope: "unit",
    name: "Contrato de Locação do Imóvel",
    short: "Locação",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-file-signature",
    hint: "Contrato vigente do imóvel onde a unidade funciona · conforme contrato",
  },
];

/**
 * Operadoras, com o que cada uma exige para credenciar.
 *
 * O particular está na lista de propósito, e com exigência vazia. Ele não
 * credencia ninguém — e é justamente por aparecer que a tela consegue dizer
 * isso, em vez de deixar a pessoa procurando a operadora que sumiu.
 */
export const INSURERS: DocumentInsurer[] = [
  {
    id: "unimed",
    name: "Unimed",
    kind: "health_care",
    requires: ["diploma", "council", "id", "cv"],
  },
  { id: "bradesco", name: "Bradesco Saúde", kind: "health_care", requires: ["diploma", "council", "id"] },
  { id: "sulamerica", name: "SulAmérica", kind: "health_care", requires: ["diploma", "council"] },
  {
    id: "cassi",
    name: "Cassi",
    kind: "health_care",
    requires: ["diploma", "council", "id", "address"],
  },
  {
    id: "porto",
    name: "Porto Seguro Saúde",
    kind: "health_care",
    requires: ["diploma", "council", "criminal"],
  },
  { id: "particular", name: "Particular", kind: "particular", requires: [] },
];

/* ============================================================== pessoas */

const marina: DocumentSubject = {
  id: "prof-marina",
  name: "Marina Okabe",
  specialty: "Aplicador ABA",
  council: "CRP 06/000000",
  active: true,
};

const clara: DocumentSubject = {
  id: "prof-clara",
  name: "Clara Vidigal",
  specialty: "Psicologia",
  council: "CRP 06/000001",
  active: true,
};

const rui: DocumentSubject = {
  id: "prof-rui",
  name: "Rui Sampaio Neto",
  specialty: "Fonoaudiologia",
  council: "CRFa 2-00000",
  active: true,
};

const helena: DocumentSubject = {
  id: "prof-incompleto",
  name: "Helena Braga",
  specialty: "Terapia Ocupacional",
  council: "CREFITO 3-00000",
  active: true,
};

const denise: DocumentSubject = {
  id: "prof-saindo",
  name: "Denise Portela",
  specialty: "Musicoterapia",
  council: "UBAM 0000",
  active: true,
  deactivationDate: "2026-08-28",
};

/* =========================================================== documentos */

function doc(entrada: ProfessionalDocument): ProfessionalDocument {
  return entrada;
}


/**
 * Documentos internos e ocupacionais.
 *
 * Nenhum deles é compartilhável, e é por isso que aparecem aqui separados: eles
 * não entram em conta de credenciamento nenhuma. O ASO vencido da Marina não
 * atrapalha convênio algum — atrapalha a clínica, numa fiscalização trabalhista.
 */
function internos(prefixo: string, ajustes: Partial<Record<string, Partial<ProfessionalDocument>>> = {}): ProfessionalDocument[] {
  const padrao: [string, string, string | undefined][] = [
    ["contract", "Contrato PJ", "2027-03-31"],
    ["nda", "Termo de confidencialidade", undefined],
    ["lgpd", "Termo LGPD", undefined],
    ["train_aba", "Treinamento ABA interno", "2027-05-31"],
    ["aso", "ASO periódico", "2027-01-31"],
  ];

  return padrao.map(([typeId, name, validUntil]) => ({
    id: `doc-${prefixo}-${typeId}`,
    typeId,
    name,
    file: `${typeId}-${prefixo}.pdf`,
    updatedAt: "2026-01-12",
    validUntil,
    sharedWith: [],
    ...(ajustes[typeId] ?? {}),
  }));
}

/**
 * A pasta da Marina: completa, com uma quitação vencida.
 *
 * É a fixture que mostra o mecanismo inteiro numa pessoa só. A quitação do
 * conselho não é exigida por nenhuma operadora, então ela vence sem derrubar
 * credenciamento nenhum — e mesmo assim aparece em vermelho, porque continua
 * sendo um papel que a clínica precisa renovar.
 */
const documentosMarina: ProfessionalDocument[] = [
  doc({
    id: "doc-marina-diploma",
    typeId: "diploma",
    name: "Certificado de formação",
    file: "diploma-psicologia.pdf",
    updatedAt: "2026-02-10",
    sharedWith: [
      { insurerId: "unimed", at: "2026-02-11" },
      { insurerId: "bradesco", at: "2026-03-02" },
    ],
  }),
  doc({
    id: "doc-marina-council",
    typeId: "council",
    name: "Registro no conselho",
    number: "CRP 06/000000",
    file: "registro-crp.pdf",
    updatedAt: "2026-02-10",
    validUntil: "2027-01-31",
    sharedWith: [
      { insurerId: "unimed", at: "2026-02-11" },
      { insurerId: "bradesco", at: "2026-03-02" },
    ],
  }),
  doc({
    id: "doc-marina-id",
    typeId: "id",
    name: "RG / CPF",
    file: "identidade.pdf",
    updatedAt: "2026-02-10",
    sharedWith: [
      { insurerId: "unimed", at: "2026-02-11" },
      { insurerId: "bradesco", at: "2026-03-02" },
    ],
  }),
  doc({
    id: "doc-marina-cv",
    typeId: "cv",
    name: "Currículo",
    file: "curriculo-2026.pdf",
    updatedAt: "2026-05-04",
    sharedWith: [{ insurerId: "unimed", at: "2026-05-04" }],
  }),
  doc({
    id: "doc-marina-quit",
    typeId: "council_quit",
    name: "Declaração de quitação do conselho",
    file: "quitacao-2025.pdf",
    updatedAt: "2025-03-18",
    // Venceu em março. Nenhuma operadora a exige, e mesmo assim ela pesa.
    validUntil: "2026-03-31",
    sharedWith: [],
  }),
  doc({
    id: "doc-marina-aba-1",
    typeId: "aba_course",
    name: "Curso de formação em ABA — 180h",
    file: "aba-180h.pdf",
    updatedAt: "2025-11-20",
    hours: 180,
    sharedWith: [],
  }),
  doc({
    id: "doc-marina-aba-2",
    typeId: "aba_course",
    name: "Supervisão em ABA — 60h",
    file: "aba-supervisao-60h.pdf",
    updatedAt: "2026-04-02",
    hours: 60,
    sharedWith: [],
  }),
  ...internos("marina", { aso: { validUntil: "2026-05-31" } }),
  doc({
    id: "doc-marina-especial",
    typeId: "special_training",
    name: "Formação Especial — PECS",
    file: "pecs.pdf",
    updatedAt: "2026-01-15",
    training: "PECS",
    sharedWith: [],
  }),
];

/** A pasta da Clara: o certificado que está para vencer dentro da janela. */
const documentosClara: ProfessionalDocument[] = [
  doc({
    id: "doc-clara-diploma",
    typeId: "diploma",
    name: "Certificado de formação",
    file: "diploma-clara.pdf",
    updatedAt: "2025-08-01",
    sharedWith: [{ insurerId: "sulamerica", at: "2025-08-02" }],
  }),
  doc({
    id: "doc-clara-council",
    typeId: "council",
    name: "Registro no conselho",
    number: "CRP 06/000001",
    file: "registro-crp-clara.pdf",
    updatedAt: "2025-08-01",
    // Dentro dos trinta dias: a operadora ainda aceita, e a clínica já precisa agir.
    validUntil: "2026-08-20",
    sharedWith: [{ insurerId: "sulamerica", at: "2025-08-02" }],
  }),
  ...internos("clara"),
  doc({
    id: "doc-clara-id",
    typeId: "id",
    name: "RG / CPF",
    file: "identidade-clara.pdf",
    updatedAt: "2025-08-01",
    sharedWith: [],
  }),
];

/**
 * A pasta do Rui: o registro vencido que derruba o credenciamento sozinho.
 *
 * Esta é a fixture que existe para o cenário mais importante do módulo. Ninguém
 * mexeu em nada: o papel venceu e o vínculo com a Unimed caiu de credenciado
 * para em credenciamento.
 */
const documentosRui: ProfessionalDocument[] = [
  doc({
    id: "doc-rui-diploma",
    typeId: "diploma",
    name: "Certificado de formação",
    file: "diploma-rui.pdf",
    updatedAt: "2024-09-12",
    sharedWith: [{ insurerId: "unimed", at: "2024-09-13" }],
  }),
  doc({
    id: "doc-rui-council",
    typeId: "council",
    name: "Registro no conselho",
    number: "CRFa 2-00000",
    file: "registro-crfa.pdf",
    updatedAt: "2024-09-12",
    validUntil: "2026-06-30",
    sharedWith: [{ insurerId: "unimed", at: "2024-09-13" }],
  }),
  doc({
    id: "doc-rui-id",
    typeId: "id",
    name: "RG / CPF",
    file: "identidade-rui.pdf",
    updatedAt: "2024-09-12",
    sharedWith: [{ insurerId: "unimed", at: "2024-09-13" }],
  }),
  ...internos("rui", { contract: { validUntil: "2026-04-30" } }),
  doc({
    id: "doc-rui-cv",
    typeId: "cv",
    name: "Currículo",
    file: "curriculo-rui.pdf",
    updatedAt: "2025-02-20",
    sharedWith: [{ insurerId: "unimed", at: "2025-02-20" }],
  }),
];

/**
 * A pasta da Helena: a linha preenchida sem arquivo.
 *
 * O estado que mais engana da especificação inteira. Tipo escolhido, nome
 * escrito, validade em dia — e nenhum papel atrás. Na tela ele precisa parecer
 * pendência, porque é o que ele é.
 */
const documentosHelena: ProfessionalDocument[] = [
  doc({
    id: "doc-helena-diploma",
    typeId: "diploma",
    name: "Certificado de formação",
    // Sem `file`: o registro existe, o documento não.
    updatedAt: "2026-07-02",
    sharedWith: [],
  }),
  doc({
    id: "doc-helena-council",
    typeId: "council",
    name: "Registro no conselho",
    number: "CREFITO 3-00000",
    file: "registro-crefito.pdf",
    updatedAt: "2026-07-02",
    validUntil: "2027-06-30",
    sharedWith: [],
  }),
];

/** A pasta da Denise: dispensa registrada num obrigatório do escopo interno. */
const documentosDenise: ProfessionalDocument[] = [
  doc({
    id: "doc-denise-diploma",
    typeId: "diploma",
    name: "Certificado de formação",
    file: "diploma-denise.pdf",
    updatedAt: "2025-04-10",
    sharedWith: [],
  }),
  doc({
    id: "doc-denise-council",
    typeId: "council",
    name: "Registro no conselho",
    number: "UBAM 0000",
    file: "registro-ubam.pdf",
    updatedAt: "2025-04-10",
    validUntil: "2027-04-30",
    sharedWith: [],
  }),
  doc({
    id: "doc-denise-id",
    typeId: "id",
    name: "RG / CPF",
    file: "identidade-denise.pdf",
    updatedAt: "2025-04-10",
    waived: false,
    sharedWith: [],
  }),
  ...internos("denise").filter((item) => item.typeId !== "contract"),
  doc({
    id: "doc-denise-contrato",
    typeId: "contract",
    name: "Contrato PJ",
    // Dispensada: musicoterapia é contratada por RPA nesta unidade.
    waived: true,
    updatedAt: "2025-04-10",
    validUntil: "2026-04-30",
    sharedWith: [],
  }),
];

/* ============================================================= vínculos */

const vinculos: CredentialLink[] = [
  {
    professionalId: "prof-marina",
    insurerId: "unimed",
    status: "credentialed",
    since: "2026-02-11",
    manual: false,
  },
  {
    professionalId: "prof-marina",
    insurerId: "bradesco",
    status: "credentialed",
    since: "2026-03-02",
    manual: false,
  },
  {
    professionalId: "prof-clara",
    insurerId: "sulamerica",
    status: "credentialed",
    since: "2025-08-02",
    manual: false,
  },
  {
    professionalId: "prof-rui",
    insurerId: "unimed",
    status: "credentialed",
    since: "2024-09-13",
    manual: false,
  },
];

/**
 * O vínculo descredenciado à mão.
 *
 * A Clara tem todos os documentos que a Porto Seguro exige, compartilhados e
 * válidos — e continua descredenciada. É o cenário que prova que o recálculo
 * não reabre o que uma pessoa fechou.
 */
const descredenciada: CredentialLink = {
  professionalId: "prof-clara",
  insurerId: "porto",
  status: "decredentialed",
  since: "2025-01-20",
  manual: true,
};

const documentosClaraCompletosPorto: ProfessionalDocument[] = documentosClara.map((item) =>
  item.typeId === "diploma" || item.typeId === "council"
    ? { ...item, sharedWith: [...item.sharedWith, { insurerId: "porto", at: "2025-01-20" }] }
    : item,
).concat(
  doc({
    id: "doc-clara-criminal",
    typeId: "criminal",
    name: "Certidão negativa criminal",
    file: "certidao-criminal-clara.pdf",
    updatedAt: "2026-06-01",
    validUntil: "2026-12-01",
    sharedWith: [{ insurerId: "porto", at: "2026-06-01" }],
  }),
);

/* =========================================================== documentos da unidade */

const unidade = { id: "unit-girassol", name: "Unidade Girassol" };

const documentosUnidade: UnitDocument[] = [
  {
    id: "udoc-cli",
    typeId: "cli",
    name: "CLI 2026 — Certificado de Licenciamento Integrado",
    responsible: "Marcos Vinícius Salles",
    validUntil: "2027-01-31",
    updatedAt: "2026-01-20",
    file: "cli-2026.pdf",
    sharedWith: ["unimed", "bradesco"],
  },
  {
    id: "udoc-alvara",
    typeId: "alvara",
    name: "Alvará de Funcionamento 2026",
    responsible: "Marcos Vinícius Salles",
    validUntil: "2027-02-28",
    updatedAt: "2026-02-05",
    file: "alvara-2026.pdf",
    sharedWith: ["unimed", "bradesco"],
  },
  {
    id: "udoc-avcb",
    typeId: "avcb",
    name: "AVCB — Auto de Vistoria do Corpo de Bombeiros",
    responsible: "Marcos Vinícius Salles",
    // Venceu: é o que segura o credenciamento da unidade inteira.
    validUntil: "2026-07-10",
    updatedAt: "2023-07-11",
    file: "avcb-2023.pdf",
    sharedWith: ["unimed", "bradesco"],
  },
  {
    id: "udoc-vigilancia",
    typeId: "vigilancia",
    name: "Licença da Vigilância Sanitária 2026",
    responsible: "Ana Paula Ribeiro",
    // Emitida e ainda sem vigência: começa em agosto.
    validFrom: "2026-08-01",
    validUntil: "2027-07-31",
    updatedAt: "2026-07-18",
    file: "vigilancia-2026.pdf",
    sharedWith: ["unimed", "bradesco"],
  },
  {
    id: "udoc-cnes",
    typeId: "cnes",
    name: "CNES — Cadastro Nacional de Estabelecimentos de Saúde",
    responsible: "Ana Paula Ribeiro",
    updatedAt: "2024-03-11",
    file: "cnes.pdf",
    sharedWith: ["unimed", "bradesco"],
  },
  {
    id: "udoc-crp",
    typeId: "crp",
    name: "Registro no CRP",
    responsible: "Ana Paula Ribeiro",
    validUntil: "2027-01-31",
    updatedAt: "2026-01-15",
    file: "crp-pj.pdf",
    sharedWith: ["unimed", "bradesco"],
  },
  {
    id: "udoc-crefito",
    typeId: "crefito",
    name: "Registro no CREFITO",
    responsible: "Ana Paula Ribeiro",
    validUntil: "2027-01-31",
    updatedAt: "2026-01-15",
    file: "crefito-pj.pdf",
    sharedWith: ["unimed", "bradesco"],
  },
  {
    id: "udoc-crefono",
    typeId: "crefono",
    name: "Registro no CREFONO",
    responsible: "Ana Paula Ribeiro",
    validUntil: "2027-01-31",
    updatedAt: "2026-01-15",
    file: "crefono-pj.pdf",
    sharedWith: ["unimed", "bradesco"],
  },
  {
    id: "udoc-dedetizacao",
    typeId: "dedetizacao",
    name: "Certificado de Dedetização",
    responsible: "Marcos Vinícius Salles",
    // Dentro da janela de trinta dias.
    validUntil: "2026-08-18",
    updatedAt: "2026-02-18",
    file: "dedetizacao.pdf",
    sharedWith: ["unimed", "bradesco"],
  },
  {
    id: "udoc-potabilidade",
    typeId: "potabilidade",
    name: "Laudo de Potabilidade da Água",
    responsible: "Marcos Vinícius Salles",
    validUntil: "2026-12-20",
    updatedAt: "2026-06-20",
    file: "potabilidade.pdf",
    sharedWith: ["unimed", "bradesco"],
  },
  {
    id: "udoc-residuos",
    typeId: "residuos",
    name: "PGRSS — Plano de Gerenciamento de Resíduos",
    responsible: "Marcos Vinícius Salles",
    validUntil: "2027-03-31",
    updatedAt: "2026-03-30",
    file: "pgrss-2026.pdf",
    sharedWith: ["unimed"],
  },
  {
    id: "udoc-contrato-social",
    typeId: "other",
    name: "Contrato Social",
    responsible: "Ana Paula Ribeiro",
    updatedAt: "2023-01-10",
    file: "contrato-social.pdf",
    sharedWith: ["unimed", "bradesco"],
  },
];

/* ============================================================= fixtures */

function pastaDe(
  professional: DocumentSubject,
  documents: ProfessionalDocument[],
  links: CredentialLink[] = [],
): ProfessionalDocumentsData {
  return { now: NOW, professional, documents, insurers: INSURERS, links };
}

export const professionalDocumentFixtures: Fixture<ProfessionalDocumentsData>[] = [
  {
    id: "docs-professional-complete",
    label: "Pasta completa, com um vencido que não bloqueia",
    description:
      "A Marina tem os três obrigatórios e está credenciada em duas operadoras. A quitação do conselho venceu e nenhuma operadora a exige.",
    data: pastaDe(
      marina,
      documentosMarina,
      vinculos.filter((link) => link.professionalId === "prof-marina"),
    ),
  },
  {
    id: "docs-professional-expired-blocks",
    label: "Registro vencido derruba o credenciamento",
    description:
      "O registro no conselho do Rui venceu em 30/06. Ninguém mexeu em nada e a Unimed voltou para em credenciamento.",
    data: pastaDe(
      rui,
      documentosRui,
      vinculos.filter((link) => link.professionalId === "prof-rui"),
    ),
  },
  {
    id: "docs-professional-expiring",
    label: "Certificado dentro da janela de aviso",
    description:
      "O registro da Clara vence em 20/08, dentro dos trinta dias. A operadora ainda aceita, e a clínica já precisa agir.",
    data: pastaDe(
      clara,
      documentosClara,
      vinculos.filter((link) => link.professionalId === "prof-clara"),
    ),
  },
  {
    id: "docs-professional-no-file",
    label: "Registro sem arquivo anexado",
    description:
      "A Helena tem a linha do diploma preenchida e sem papel atrás. Nenhuma operadora a aceita, e a tela precisa dizer isso.",
    data: pastaDe(helena, documentosHelena),
  },
  {
    id: "docs-professional-decredentialed",
    label: "Descredenciada com a documentação completa",
    description:
      "A Clara cumpre tudo que a Porto Seguro exige e continua descredenciada. O recálculo não reabre o que uma pessoa fechou.",
    data: pastaDe(clara, documentosClaraCompletosPorto, [
      ...vinculos.filter((link) => link.professionalId === "prof-clara"),
      descredenciada,
    ]),
  },
  {
    id: "docs-professional-empty",
    label: "Pasta vazia",
    description: "Profissional recém-cadastrado: sete lacunas padrão e nenhum arquivo.",
    data: pastaDe({ ...helena, id: "prof-novo", name: "Bruno Sadao Kishi" }, []),
  },
];

export const teamDocumentationFixtures: Fixture<TeamDocumentationData>[] = [
  {
    id: "docs-team-matrix",
    label: "Matriz de documentação da equipe",
    description:
      "Cinco profissionais, com uma pendência de cada tipo: vencido, ausente, a vencer, sem arquivo e dispensado.",
    data: {
      now: NOW,
      insurers: INSURERS,
      rows: [
        {
          professional: rui,
          documents: documentosRui,
          links: vinculos.filter((link) => link.professionalId === "prof-rui"),
        },
        {
          professional: helena,
          documents: documentosHelena,
          links: [],
        },
        {
          professional: clara,
          documents: documentosClara,
          links: [
            ...vinculos.filter((link) => link.professionalId === "prof-clara"),
            descredenciada,
          ],
        },
        {
          professional: marina,
          documents: documentosMarina,
          links: vinculos.filter((link) => link.professionalId === "prof-marina"),
        },
        { professional: denise, documents: documentosDenise, links: [] },
      ],
    },
  },
  {
    id: "docs-team-all-clear",
    label: "Equipe sem pendência",
    description: "Só a Marina e o que ela cumpre. Existe para fixar o que a tela mostra quando não há fila.",
    data: {
      now: NOW,
      insurers: INSURERS,
      rows: [
        {
          professional: marina,
          documents: documentosMarina.filter((item) => item.typeId !== "council_quit"),
          links: vinculos.filter((link) => link.professionalId === "prof-marina"),
        },
      ],
    },
  },
  {
    id: "docs-team-empty",
    label: "Unidade sem profissionais",
    description: "Unidade recém-aberta, antes do primeiro vínculo.",
    data: { now: NOW, insurers: INSURERS, rows: [] },
  },
];

export const unitDocumentFixtures: Fixture<UnitDocumentsData>[] = [
  {
    id: "docs-unit-blocked",
    label: "AVCB vencido segura o credenciamento",
    description:
      "Onze dos doze documentos padrão em ordem. O AVCB venceu em 10/07 e a unidade sai de credenciada nas duas operadoras.",
    data: {
      now: NOW,
      unit: unidade,
      city: "São Paulo",
      documents: documentosUnidade,
      insurers: INSURERS,
    },
  },
  {
    id: "docs-unit-missing-slot",
    label: "Locação nunca anexada",
    description:
      "O contrato de locação nunca entrou. A lacuna aparece na pasta mesmo sem nenhum registro criado.",
    data: {
      now: NOW,
      unit: unidade,
      city: "São Paulo",
      documents: documentosUnidade
        .filter((item) => item.typeId !== "avcb")
        .concat({
          id: "udoc-avcb-novo",
          typeId: "avcb",
          name: "AVCB 2026 — Auto de Vistoria do Corpo de Bombeiros",
          responsible: "Marcos Vinícius Salles",
          validUntil: "2029-07-15",
          updatedAt: "2026-07-16",
          file: "avcb-2026.pdf",
          sharedWith: ["unimed", "bradesco"],
        }),
      insurers: INSURERS,
    },
  },
  {
    id: "docs-unit-empty",
    label: "Unidade sem documentos",
    description: "Unidade recém-aberta: doze lacunas padrão e nenhum arquivo.",
    data: {
      now: NOW,
      unit: { id: "unit-nova", name: "Unidade Aurora" },
      city: "Campinas",
      documents: [],
      insurers: INSURERS,
    },
  },
];

export const documentIds = {
  hoje: HOJE,
  marina: marina.id,
  clara: clara.id,
  rui: rui.id,
  helena: helena.id,
  denise: denise.id,
  unidade: unidade.id,
} as const;
