import type { Fixture } from "@brucesantos/design-space";
import type {
  CredentialLink,
  DocumentInsurer,
  DocumentSubject,
  DocumentType,
  ProfessionalDocument,
  ProfessionalDocumentsData,
  ProfessionalHours,
  InsurerListData,
  InsurerProfile,
  UnitListData,
  TeamDocumentationData,
  UnitDocument,
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
  /**
   * O tipo aberto, e por que ele existe.
   *
   * Sem ele, a pasta só aceita o que este catálogo nomeia — e a clínica que
   * recebe um comprovante que ninguém previu não tem onde guardá-lo. É o único
   * tipo em que o nome do documento é digitado, porque é o único em que o nome
   * não vem do tipo.
   */
  {
    id: "other",
    scope: "professional",
    name: "Outro documento",
    short: "Outro",
    standard: false,
    required: false,
    expires: false,
    icon: "fa-file",
    hint: "Qualquer comprovante que os tipos acima não nomeiam",
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
 *
 * `renewal` é a cadência de renovação, e existe como campo porque é dado, não
 * prosa: o cartão do documento mostra "renovação anual" ao lado da validade, e
 * antes disso a cadência vivia dentro da frase de `hint` — onde nenhuma tela
 * conseguia ler.
 */
export const UNIT_DOCUMENT_TYPES: DocumentType[] = [
  {
    id: "cli",
    renewal: "anual",
    scope: "unit",
    name: "CLI — Certificado de Licenciamento Integrado",
    short: "CLI",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-file-shield",
    hint: "Licenciamento integrado da prefeitura",
  },
  {
    id: "alvara",
    renewal: "anual",
    scope: "unit",
    name: "Alvará de Funcionamento",
    short: "Alvará",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-building-circle-check",
    hint: "Autorização municipal para operar no endereço",
  },
  {
    id: "avcb",
    renewal: "a cada três anos",
    scope: "unit",
    name: "AVCB — Auto de Vistoria do Corpo de Bombeiros",
    short: "AVCB",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-fire-extinguisher",
    hint: "Vistoria do Corpo de Bombeiros",
  },
  {
    id: "vigilancia",
    renewal: "anual",
    scope: "unit",
    name: "Licença da Vigilância Sanitária",
    short: "Vigilância",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-microscope",
    hint: "Licença sanitária do estabelecimento de saúde",
  },
  {
    id: "cnes",
    renewal: "sem validade",
    scope: "unit",
    name: "CNES — Cadastro Nacional de Estabelecimentos de Saúde",
    short: "CNES",
    standard: true,
    required: true,
    expires: false,
    icon: "fa-hospital",
    hint: "Comprovante de cadastro no CNES",
  },
  {
    id: "crp",
    renewal: "anual",
    scope: "unit",
    name: "Registro no CRP",
    short: "CRP",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-brain",
    hint: "Registro da pessoa jurídica no conselho de psicologia",
  },
  {
    id: "crefito",
    renewal: "anual",
    scope: "unit",
    name: "Registro no CREFITO",
    short: "CREFITO",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-person-walking",
    hint: "Registro da pessoa jurídica no conselho de fisioterapia e terapia ocupacional",
  },
  {
    id: "crefono",
    renewal: "anual",
    scope: "unit",
    name: "Registro no CREFONO",
    short: "CREFONO",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-comment-medical",
    hint: "Registro da pessoa jurídica no conselho de fonoaudiologia",
  },
  {
    id: "dedetizacao",
    renewal: "a cada seis meses",
    scope: "unit",
    name: "Certificado de Dedetização",
    short: "Dedetização",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-bug-slash",
    hint: "Controle de pragas com certificado da empresa aplicadora",
  },
  {
    id: "potabilidade",
    renewal: "a cada seis meses",
    scope: "unit",
    name: "Laudo de Potabilidade da Água",
    short: "Potabilidade",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-droplet",
    hint: "Análise laboratorial exigida pela vigilância",
  },
  {
    id: "residuos",
    renewal: "anual",
    scope: "unit",
    name: "PGRSS — Plano de Gerenciamento de Resíduos",
    short: "PGRSS",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-recycle",
    hint: "Plano e comprovante de coleta de resíduos de serviços de saúde",
  },
  {
    id: "locacao",
    renewal: "conforme contrato",
    scope: "unit",
    name: "Contrato de Locação do Imóvel",
    short: "Locação",
    standard: true,
    required: true,
    expires: true,
    icon: "fa-file-signature",
    hint: "Contrato vigente do imóvel onde a unidade funciona",
  },
];

/**
 * Os doze tipos da unidade em três categorias.
 *
 * O enum do monólito é outro — `Units.Document.type` tem `regulatory`, `general`
 * e `others` —, e ele classifica o documento que alguém anexou, não o slot que a
 * unidade precisa preencher. Esta agrupação é do resumo da lista: ela existe para
 * a coluna dizer **onde** está a pendência, e não só quantas são.
 *
 * O corte é por quem cobra o papel:
 *
 * - **Licenças** são autorização para operar naquele endereço. Faltando uma, a
 *   unidade não deveria estar atendendo.
 * - **Certificados** são comprovação técnica e cadastral — laudo, plano, registro
 *   de conselho. Faltando um, a operadora não credencia; a porta continua aberta.
 * - **Contratos** é a relação com o imóvel. Um só, e é o único que não tem
 *   cadência fixa: vence quando o contrato vencer.
 */
export const UNIT_DOCUMENT_GROUPS = [
  { id: "licencas", label: "Licenças", ids: ["alvara", "avcb", "vigilancia"] },
  {
    id: "certificados",
    label: "Certificados",
    ids: [
      "cli",
      "cnes",
      "crp",
      "crefito",
      "crefono",
      "dedetizacao",
      "potabilidade",
      "residuos",
    ],
  },
  { id: "contratos", label: "Contratos", ids: ["locacao"] },
] as const;

/** Os tipos de um grupo, na ordem do catálogo. */
export function unitTypesOfGroup(groupId: string): DocumentType[] {
  const grupo = UNIT_DOCUMENT_GROUPS.find((item) => item.id === groupId);
  if (!grupo) return UNIT_DOCUMENT_TYPES;
  return UNIT_DOCUMENT_TYPES.filter((tipo) => grupo.ids.includes(tipo.id as never));
}

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
  types: ["Terapeuta", "Aplicador"],
  formation: "Psicologia (CRP)",
  phone: "(11) 99873-9084",
  email: "marina.okabe@bloomy.com.br",
  patients: 3,
  weeklyHours: 30,
  occupancy: "10.0",
  absences: 0,
  id: "prof-marina",
  name: "Marina Okabe",
  specialty: "Aplicador ABA",
  council: "CRP 06/000000",
  active: true,
};

const clara: DocumentSubject = {
  types: ["Supervisor", "Especialista"],
  formation: "Psicologia (CRP)",
  phone: "(11) 99873-1120",
  email: "clara.vidigal@bloomy.com.br",
  patients: 6,
  weeklyHours: 24,
  occupancy: "62.0",
  absences: 1,
  id: "prof-clara",
  name: "Clara Vidigal",
  specialty: "Psicologia",
  council: "CRP 06/000001",
  active: true,
};

const rui: DocumentSubject = {
  types: ["Especialista"],
  formation: "Fonoaudiologia (CRF)",
  phone: "(11) 99873-4471",
  email: "rui.sampaio@bloomy.com.br",
  patients: 4,
  weeklyHours: 20,
  occupancy: "48.0",
  absences: 0,
  id: "prof-rui",
  name: "Rui Sampaio Neto",
  specialty: "Fonoaudiologia",
  council: "CRFa 2-00000",
  active: true,
};

const helena: DocumentSubject = {
  types: ["Terapeuta"],
  formation: "Terapia Ocupacional (CREFITO)",
  phone: "(11) 99873-2205",
  email: "helena.braga@bloomy.com.br",
  patients: 2,
  weeklyHours: 16,
  occupancy: "33.0",
  absences: 2,
  id: "prof-incompleto",
  name: "Helena Braga",
  specialty: "Terapia Ocupacional",
  council: "CREFITO 3-00000",
  active: true,
};

const denise: DocumentSubject = {
  types: ["Terapeuta"],
  formation: "Outros",
  phone: "(11) 99873-7788",
  email: "denise.portela@bloomy.com.br",
  patients: 3,
  weeklyHours: 12,
  occupancy: "25.0",
  absences: 0,
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

/**
 * O mês apurado de cada pessoa, para a aba Controle de horas.
 *
 * As horas planejadas são a carga semanal vezes quatro. As trabalhadas
 * divergem nas duas direções de propósito: a Clara e a Helena passaram da
 * escala, o Rui e a Marina ficaram abaixo, e a Denise — em inativação — fez
 * pouco mais da metade. Uma apuração em que todos batem a escala não mostra
 * nada, e é justamente a diferença que a clínica vai olhar.
 */
const HORAS: Record<string, ProfessionalHours> = {
  "prof-clara": {
    plannedHours: 96,
    workedHours: 100,
    appointments: 38,
    compensationCents: 532_000,
  },
  "prof-marina": {
    plannedHours: 120,
    workedHours: 114,
    appointments: 46,
    compensationCents: 342_000,
  },
  "prof-rui": {
    plannedHours: 80,
    workedHours: 76,
    appointments: 29,
    compensationCents: 261_000,
  },
  "prof-incompleto": {
    plannedHours: 64,
    workedHours: 68,
    appointments: 26,
    compensationCents: 234_000,
  },
  "prof-saindo": {
    plannedHours: 48,
    workedHours: 30,
    appointments: 11,
    compensationCents: 99_000,
  },
};

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
          hours: HORAS["prof-rui"],
        },
        {
          professional: helena,
          documents: documentosHelena,
          links: [],
          hours: HORAS["prof-incompleto"],
        },
        {
          professional: clara,
          documents: documentosClara,
          links: [
            ...vinculos.filter((link) => link.professionalId === "prof-clara"),
            descredenciada,
          ],
          hours: HORAS["prof-clara"],
        },
        {
          professional: marina,
          documents: documentosMarina,
          links: vinculos.filter((link) => link.professionalId === "prof-marina"),
          hours: HORAS["prof-marina"],
        },
        {
          professional: denise,
          documents: documentosDenise,
          links: [],
          hours: HORAS["prof-saindo"],
        },
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
          hours: HORAS["prof-marina"],
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

/**
 * As cinco unidades da lista, com os dados que a tabela mostra.
 *
 * CNPJ e CNES são sintéticos.
 */
export const unitListFixtures: Fixture<UnitListData>[] = [
  {
    id: "docs-unit-list",
    label: "Unidades da clínica",
    description: "Cinco unidades, uma inativa. Clicar numa linha abre a pasta de documentos dela.",
    data: {
      now: NOW,
      insurers: INSURERS,
      units: [
        {
          id: "unit-girassol",
          name: "Unidade Girassol",
          cnpj: "20.384.928/0001-24",
          cnes: "4931777",
          phone: "(11) 3555-1200",
          street: "Rua Antônio de Barros",
          number: "2080",
          neighborhood: "Vila Formosa",
          city: "São Paulo",
          state: "SP",
          rooms: 12,
          professionals: 18,
          active: true,
          documents: documentosUnidade,
        },
        {
          id: "unit-santana",
          name: "Santana",
          cnpj: "20.384.928/0002-05",
          cnes: "4931777",
          phone: "(11) 3555-1201",
          street: "Rua Salete",
          number: "15",
          neighborhood: "Santana",
          city: "São Paulo",
          state: "SP",
          rooms: 8,
          professionals: 11,
          active: true,
          documents: documentosUnidade.filter((doc) => doc.typeId !== "avcb"),
        },
        {
          id: "unit-itu",
          name: "Itu",
          cnpj: "20.384.928/0003-96",
          cnes: "8164061",
          phone: "(11) 4022-3300",
          street: "Avenida Doutor Ermelindo Maffei",
          number: "218",
          neighborhood: "Centro",
          city: "Itu",
          state: "SP",
          rooms: 6,
          professionals: 7,
          active: true,
          documents: documentosUnidade,
        },
        {
          id: "unit-salto",
          name: "Salto",
          cnpj: "20.384.928/0005-58",
          cnes: "8061416",
          phone: "(11) 4028-9100",
          street: "Rua 9 de Julho",
          number: "872",
          neighborhood: "Vila Nova",
          city: "Salto",
          state: "SP",
          rooms: 4,
          professionals: 5,
          active: true,
          documents: [],
        },
        {
          // A unidade recém-cadastrada e ainda inativa: CNPJ e CNES de
          // preenchimento, nenhuma sala, nenhum profissional. É ela que mostra o
          // cabeçalho no estado em que quase nada foi informado.
          id: "unit-aurora",
          name: "Unidade Aurora",
          cnpj: "00.000.000/0000-00",
          cnes: "0000000",
          phone: "(19) 3255-4400",
          street: "Rua Teste",
          number: "000",
          neighborhood: "Jardim Aurora",
          city: "Campinas",
          state: "SP",
          rooms: 0,
          professionals: 0,
          active: false,
          documents: [],
        },
      ],
    },
  },
];

/**
 * O cabeçalho de cada operadora.
 *
 * O ANS vai no formato que o changeset do monólito exige — `~r/\d{5}-\d/`, cinco
 * dígitos e o verificador. Antes estava como seis dígitos corridos ("339679"), que
 * é como o número se escreve em prosa e é o que o próprio sistema recusaria no
 * cadastro.
 *
 * Só a Porto tem observação: é o caso que acende o sino no botão, e um sino em
 * todas as cinco não mostraria a diferença entre ter e não ter texto escrito.
 */
const PERFIS_DE_OPERADORA: Record<string, InsurerProfile> = {
  unimed: {
    ansRegister: "33967-9",
    planCount: 4,
    phone: "(11) 3265-9000",
    email: "credenciamento@unimed.com.br",
  },
  bradesco: {
    ansRegister: "00571-1",
    planCount: 3,
    phone: "(11) 4004-2700",
    email: "rede@bradescosaude.com.br",
  },
  sulamerica: {
    ansRegister: "00624-6",
    planCount: 2,
    phone: "(11) 4004-4400",
    email: "credenciados@sulamerica.com.br",
  },
  cassi: {
    ansRegister: "34665-9",
    planCount: 1,
    phone: "(11) 3382-6600",
    email: "rede.sp@cassi.com.br",
  },
  porto: {
    ansRegister: "41753-0",
    planCount: 1,
    phone: "(11) 3333-7686",
    email: "financeiro@portoseguro.com.br",
    observation:
      "Credenciamento suspenso para novos profissionais até a renovação do contrato, em março. Habilitação individual só com autorização da diretoria.",
  },
};

/**
 * Os cinco profissionais e as duas unidades que toda operadora vê.
 *
 * A clínica é a mesma vista de qualquer convênio — o que muda de operadora para
 * operadora é o `requires`, e é ele que decide quem está credenciado. Uma cópia
 * desta lista por operadora faria a lista e a ficha divergirem no primeiro
 * documento que alguém mexesse.
 */
const CLINICA_VISTA_PELA_OPERADORA = {
  professionals: [
    { professional: rui, documents: documentosRui, links: vinculos.filter((l) => l.professionalId === "prof-rui") },
    { professional: helena, documents: documentosHelena, links: [] },
    {
      professional: clara,
      documents: documentosClaraCompletosPorto,
      links: [...vinculos.filter((l) => l.professionalId === "prof-clara"), descredenciada],
    },
    { professional: marina, documents: documentosMarina, links: vinculos.filter((l) => l.professionalId === "prof-marina") },
    { professional: denise, documents: documentosDenise, links: [] },
  ],
  units: [
    { unit: unidade, city: "São Paulo", documents: documentosUnidade },
    { unit: { id: "unit-aurora", name: "Unidade Aurora" }, city: "Campinas", documents: [] },
  ],
};

/**
 * O endereço de cada operadora.
 *
 * Não é enfeite: são duas das quatro colunas da lista real — Endereço e Cidade —,
 * e no monólito o endereço é associação com `cast_assoc(:address, required: true)`,
 * então operadora sem endereço não existe.
 *
 * Cidades diferentes de propósito: o filtro por cidade só se mostra útil quando
 * filtrar muda a lista.
 */
const ENDERECOS_DE_OPERADORA: Record<
  string,
  { street: string; number: string; complement?: string; city: string }
> = {
  unimed: { street: "Alameda Ministro Rocha Azevedo", number: "366", complement: "12º andar", city: "São Paulo" },
  bradesco: { street: "Rua Barão de Itapagipe", number: "225", city: "Rio de Janeiro" },
  sulamerica: { street: "Rua Beatriz Larragoiti Lucas", number: "121", city: "Rio de Janeiro" },
  cassi: { street: "Avenida Paulista", number: "1842", complement: "Conjunto 61", city: "São Paulo" },
  porto: { street: "Avenida Rio Branco", number: "1489", city: "São Paulo" },
};

const OPERADORAS = INSURERS.filter((insurer) => insurer.kind !== "particular");

/**
 * A lista de operadoras — e, por ela, a ficha de cada uma.
 *
 * **Havia cinco fixtures aqui, uma por operadora, e elas saíram.** A ficha lê da
 * lista pelo id da rota (`comoFicha`, em `InsurerDocuments`), que é o que a pasta
 * da unidade já fazia; com as duas formas registradas, escolher a fixture da
 * Unimed enquanto a lista está aberta entregava à lista um dado sem `insurers` e a
 * tela quebrava. Uma fixture por frente, servindo lista e ficha, é a regra das
 * outras duas frentes de Documentos.
 *
 * Uma fixture, e não uma por operadora, também porque a lista é sobre o conjunto:
 * o caso que interessa é a diferença entre as cinco — a Unimed exige quatro
 * documentos e a SulAmérica dois, então a mesma clínica está credenciada numa e
 * não na outra.
 *
 * A variação sem nenhuma operadora fica na fixture vazia, que é o estado de uma
 * clínica que só atende particular.
 */
export const insurerListFixtures: Fixture<InsurerListData>[] = [
  {
    id: "docs-insurer-list",
    label: "Operadoras · cinco convênios",
    description:
      "A lista de operadoras: registro ANS, endereço e, na aba nova, quanto da clínica cada convênio já aceita.",
    data: {
      now: NOW,
      insurers: OPERADORAS.map((insurer) => ({
        insurer,
        profile: PERFIS_DE_OPERADORA[insurer.id] ?? { planCount: 0 },
        ...ENDERECOS_DE_OPERADORA[insurer.id]!,
        ...CLINICA_VISTA_PELA_OPERADORA,
      })),
    },
  },
  {
    id: "docs-insurer-list-empty",
    label: "Operadoras · nenhuma cadastrada",
    description:
      "Clínica que só atende particular. A lista existe e não tem linha nenhuma — é o primeiro dia de uso.",
    data: { now: NOW, insurers: [] },
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
