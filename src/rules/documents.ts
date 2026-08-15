import type { Rule } from "@brucesantos/design-space";
import type {
  CredentialLink,
  CredentialStatus,
  DocumentInsurer,
  DocumentState,
  DocumentType,
  ProfessionalDocument,
  UnitDocument,
} from "../contracts/index.js";

/**
 * Regras da documentação.
 *
 * Este módulo governa duas pastas que parecem a mesma coisa e não são: a do
 * profissional, que a operadora enxerga, e a da unidade, que a vigilância
 * sanitária enxerga. O que as une é o mecanismo — situação derivada da validade,
 * nunca armazenada — e o que as separa é quem cobra o papel.
 *
 * A regra que mais decide comportamento aqui é `credentialing-is-derived`:
 * ninguém digita "credenciado". O vínculo com a operadora é uma consequência de
 * quais documentos estão compartilhados e válidos, recalculada a cada mudança.
 * Isso tem um efeito que assusta quando aparece pela primeira vez e é o
 * comportamento certo: **um documento que vence derruba o credenciamento sozinho,
 * de madrugada, sem ninguém tocar em nada**. É exatamente o que a operadora faz
 * do lado dela.
 *
 * A única exceção é o descredenciamento manual, e ela existe porque a assimetria
 * é real: anexar um papel novo não desfaz uma decisão que a operadora tomou.
 */
export const documentRules: Rule[] = [
  {
    id: "document-state-comes-from-validity",
    statement:
      "A situação de um documento é sempre calculada da validade contra a data de referência, e nunca gravada. Documento sem data de validade não vence; documento dispensado sai da conta antes de a data ser olhada.",
    rationale:
      "Situação gravada é situação que envelhece errado: o papel vence e a tela continua dizendo válido porque ninguém rodou o recálculo. Numa pasta de documentos esse é o defeito mais caro possível — a clínica descobre pela glosa da operadora.",
    source: "src/rules/documents.ts",
  },
  {
    id: "warning-window-is-thirty-days",
    statement:
      "Um documento entra em “a vencer” trinta dias antes da data de validade, no escopo do profissional e no da unidade.",
    rationale:
      "Trinta dias é o menor prazo em que dá para pedir segunda via de conselho, agendar dedetização ou renovar alvará. Duas janelas diferentes para o mesmo conceito fariam a mesma pessoa ver o mesmo documento como urgente numa tela e tranquilo na outra.",
    source: "src/rules/documents.ts",
  },
  {
    id: "mandatory-documents-decide-completeness",
    statement:
      "A completude conta apenas os documentos obrigatórios não dispensados. Um obrigatório a vencer ainda conta como cumprido; só ausente e vencido derrubam o percentual.",
    rationale:
      "O percentual responde “esta pessoa pode atender hoje”, e não “esta pasta está bonita”. Um documento que vence em três semanas ainda autoriza o atendimento de amanhã — tratá-lo como falta faria a coordenação perseguir o percentual em vez da pendência.",
    source: "src/rules/documents.ts",
  },
  {
    id: "credentialing-is-derived",
    statement:
      "O credenciamento de um profissional numa operadora é derivado dos documentos exigidos que estão compartilhados e válidos. Compartilhar o primeiro documento cria o vínculo em credenciamento; completar as exigências o torna credenciado; perder qualquer uma o devolve a credenciamento.",
    rationale:
      "É o mesmo cálculo que a operadora faz do lado dela. Deixar o status ser digitado criaria a divergência que ninguém percebe até a glosa: a clínica marcando “credenciado” enquanto o convênio recusa a guia por documento vencido.",
    source: "src/rules/documents.ts",
  },
  {
    id: "expired-document-does-not-credential",
    statement:
      "Um documento exigido que existe mas está vencido conta como faltante para a operadora. Um documento a vencer ainda satisfaz a exigência.",
    rationale:
      "Vencido e ausente têm a mesma consequência do lado do convênio — a guia é recusada nos dois casos. Separá-los na tela ajuda a clínica a saber o que fazer; somá-los no cálculo é o que mantém o status honesto.",
    source: "src/rules/documents.ts",
  },
  {
    id: "manual-decredentialing-does-not-self-revert",
    statement:
      "Descredenciar é decisão registrada por uma pessoa, e o recálculo não a desfaz. Nenhum documento novo reativa sozinho um vínculo descredenciado: só a reabertura explícita, que o devolve a em credenciamento.",
    rationale:
      "A operadora descredencia por auditoria, por fim de contrato, por decisão comercial — nada disso é consertado anexando um papel. Um vínculo que voltasse a “credenciado” porque alguém subiu um currículo faria a clínica agendar em cima de um convênio que já disse não.",
    source: "src/rules/documents.ts",
  },
  {
    id: "document-requires-a-file",
    statement:
      "Um documento sem arquivo anexado não satisfaz exigência de operadora, não pode ser compartilhado e não entra em exportação — mesmo que tipo, nome e validade estejam preenchidos.",
    rationale:
      "O que a operadora audita é o papel, não o registro. Uma linha preenchida sem anexo é a pior forma de pendência porque parece resolvida na tela e falha no único momento em que importa.",
    source: "src/rules/documents.ts",
  },
  {
    id: "standard-slot-comes-from-the-type",
    statement:
      "O encaixe de um documento no slot padrão vem do tipo declarado no cadastro. Documento de tipo padrão tem o tipo travado na edição, e renomear um documento nunca muda o slot que ele ocupa.",
    rationale:
      "A alternativa — reconhecer o slot pelo nome — faz um documento sair do lugar quando alguém corrige uma palavra do título, reabrindo uma pendência que estava resolvida. O nome é do usuário; a classificação é do sistema.",
    source: "src/rules/documents.ts",
  },
  {
    id: "aba-hours-come-from-certificates",
    statement:
      "A carga horária em ABA de um profissional é a soma das horas dos certificados anexados. O valor do cadastro só vale enquanto não houver nenhum certificado.",
    rationale:
      "É a única das duas fontes que tem comprovação atrás. Deixar o número do cadastro prevalecer permitiria declarar formação avançada sem um certificado sequer — exatamente o que a supervisão precisa distinguir ao montar a escala.",
    source: "src/rules/documents.ts",
  },
  {
    id: "unit-credentialing-needs-every-standard-document",
    statement:
      "Uma unidade só fica credenciada numa operadora quando todos os documentos padrão da unidade existem, estão válidos e estão compartilhados com ela. Documento adicional compartilhado não reduz pendência.",
    rationale:
      "A operadora credencia o endereço, não a papelada avulsa: faltando o AVCB, não importa quantos outros laudos foram enviados. A conta é diferente da do profissional porque ali a exigência varia por convênio, e aqui o conjunto é o mesmo para todos.",
    source: "src/rules/documents.ts",
  },
];

/* ============================================================= o relógio */

/**
 * Janela de aviso, em dias.
 *
 * Um número só, para os dois escopos. A proposta recebida trazia sessenta dias
 * no perfil do profissional e trinta no painel e na unidade — a mesma pessoa
 * veria o mesmo certificado como urgente numa tela e tranquilo na outra.
 */
export const WARNING_DAYS = 30;

/** Dias inteiros entre duas datas, sem hora e sem fuso. */
export function daysUntil(date: string, now: string): number {
  const dia = (iso: string) =>
    Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  return Math.round((dia(date) - dia(now)) / 86_400_000);
}

/* ========================================================= o documento */

/**
 * Implementação de `document-state-comes-from-validity`.
 *
 * A ordem das três primeiras verificações é parte da regra. Dispensa vem antes
 * da validade porque um documento dispensado com data vencida não é um problema
 * — é um documento que a clínica decidiu não exigir desta pessoa. Invertido, a
 * dispensa vira decorativa e a pendência volta sozinha.
 */
export function documentState(
  doc: Pick<ProfessionalDocument, "validUntil" | "waived"> | undefined,
  now: string,
): DocumentState {
  if (!doc) return "missing";
  if (doc.waived) return "waived";
  if (!doc.validUntil) return "no_expiry";

  const dias = daysUntil(doc.validUntil, now);
  if (dias < 0) return "expired";
  if (dias <= WARNING_DAYS) return "expiring";
  return "valid";
}

/**
 * Situação de um documento da unidade.
 *
 * Igual à do profissional, com um estado a mais: alvará e licença são emitidos
 * antes de passarem a valer, e um documento cuja vigência começa no mês que vem
 * não está válido nem vencido. Sem esse estado, ele apareceria como válido e a
 * unidade acharia que já pode usá-lo.
 */
export function unitDocumentState(
  doc: UnitDocument | undefined,
  now: string,
): DocumentState | "not_in_force" {
  if (!doc) return "missing";
  if (doc.validFrom && daysUntil(doc.validFrom, now) > 0) return "not_in_force";
  return documentState(doc, now);
}

/** Rótulos do produto. `expiring` conta os dias porque o número é a ação. */
export function documentStateLabel(
  state: DocumentState | "not_in_force",
  daysLeft?: number,
): string {
  if (state === "expiring" && daysLeft !== undefined) {
    return daysLeft === 0 ? "Vence hoje" : `Vence em ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}`;
  }
  return {
    valid: "Válido",
    no_expiry: "Sem validade",
    expiring: "A vencer",
    expired: "Vencido",
    missing: "Pendente",
    waived: "Dispensado",
    not_in_force: "Aguardando vigência",
  }[state];
}

/**
 * Ordem de severidade, e não a de leitura.
 *
 * É ela que decide quem aparece primeiro na fila de trabalho e a ordem da
 * legenda. Vencido antes de ausente porque um vencido já esteve certo: existe
 * alguém que confiou nele.
 */
export const STATE_SEVERITY: Record<DocumentState | "not_in_force", number> = {
  expired: 0,
  missing: 1,
  expiring: 2,
  not_in_force: 3,
  waived: 4,
  no_expiry: 5,
  valid: 5,
};

/** Implementação de `document-requires-a-file`. */
export function hasFile(doc: Pick<ProfessionalDocument, "file"> | undefined): boolean {
  return Boolean(doc?.file?.trim());
}

/** Implementação de `standard-slot-comes-from-the-type`. */
export function isTypeLocked(type: DocumentType | undefined): boolean {
  return Boolean(type?.standard);
}

/* ========================================================= completude */

export interface Completeness {
  /** Obrigatórios aplicáveis, já sem os dispensados. */
  required: number;
  /** Quantos deles estão cumpridos. */
  met: number;
  percent: number;
}

/**
 * Implementação de `mandatory-documents-decide-completeness`.
 *
 * Sem obrigatório aplicável, a completude é 100%. Não é arredondamento
 * conveniente: uma pessoa de quem a clínica não exige nada não tem pendência, e
 * mostrar 0% ali colocaria no topo da fila justamente quem não precisa de nada.
 */
export function completeness(
  documents: ProfessionalDocument[],
  types: DocumentType[],
  now: string,
): Completeness {
  const obrigatorios = types.filter((type) => type.required);

  const aplicaveis = obrigatorios.filter((type) => {
    const doc = documents.find((item) => item.typeId === type.id);
    return documentState(doc, now) !== "waived";
  });

  const cumpridos = aplicaveis.filter((type) => {
    const doc = documents.find((item) => item.typeId === type.id);
    if (!hasFile(doc)) return false;
    const estado = documentState(doc, now);
    return estado === "valid" || estado === "no_expiry" || estado === "expiring";
  });

  return {
    required: aplicaveis.length,
    met: cumpridos.length,
    percent: aplicaveis.length === 0 ? 100 : Math.round((cumpridos.length / aplicaveis.length) * 100),
  };
}

/* ====================================================== credenciamento */

/**
 * Implementação de `expired-document-does-not-credential`.
 *
 * Três condições, e faltar qualquer uma é falta: o documento precisa existir com
 * arquivo, estar compartilhado **com aquela operadora** e não estar vencido.
 * A segunda é a que surpreende — ter o papel no cadastro não basta, porque o
 * convênio não enxerga o cadastro.
 */
export function missingForInsurer(
  documents: ProfessionalDocument[],
  insurer: DocumentInsurer,
  now: string,
): string[] {
  return insurer.requires.filter((typeId) => {
    const doc = documents.find(
      (item) =>
        item.typeId === typeId &&
        hasFile(item) &&
        item.sharedWith.some((share) => share.insurerId === insurer.id),
    );
    if (!doc) return true;
    return documentState(doc, now) === "expired";
  });
}

/**
 * Implementação de `credentialing-is-derived` e de
 * `manual-decredentialing-does-not-self-revert`.
 *
 * A saída antecipada do vínculo manual é a regra inteira. Ela vem primeiro
 * porque, uma vez descredenciado, nenhuma quantidade de documento correto
 * importa — e é justamente o caso em que o recálculo pareceria estar ajudando.
 */
export function credentialStatus(
  link: CredentialLink | undefined,
  documents: ProfessionalDocument[],
  insurer: DocumentInsurer,
  now: string,
): CredentialStatus {
  if (!link) return "not_credentialed";
  if (link.manual || link.status === "decredentialed") return link.status;
  return missingForInsurer(documents, insurer, now).length > 0
    ? "in_credentialing"
    : "credentialed";
}

export function credentialStatusLabel(status: CredentialStatus): string {
  return {
    not_credentialed: "Não credenciado",
    in_credentialing: "Em credenciamento",
    credentialed: "Credenciado",
    decredentialed: "Descredenciado",
  }[status];
}

type Decision = { allowed: boolean; reason?: string };

/**
 * Compartilhar um documento com uma operadora.
 *
 * Duas recusas, e as duas dizem o que fazer. A do particular não é técnica: ele
 * não credencia ninguém, então não há para quem mandar.
 */
export function canShare(
  doc: ProfessionalDocument | undefined,
  insurer: DocumentInsurer,
  permissions: string[],
): Decision {
  if (!permissions.includes("professionals.edit")) {
    return { allowed: false, reason: "Seu perfil não edita a documentação de profissionais." };
  }
  if (insurer.kind === "particular") {
    return {
      allowed: false,
      reason: "Particular não credencia profissional — não há operadora para receber o documento.",
    };
  }
  if (!hasFile(doc)) {
    return {
      allowed: false,
      reason:
        "Anexe o arquivo antes de compartilhar. A operadora audita o papel, e um registro sem anexo é recusado como se não existisse.",
    };
  }
  return { allowed: true };
}

/** Implementação de `document-requires-a-file` no caminho da exportação. */
export function canExport(documents: ProfessionalDocument[]): Decision {
  if (documents.filter(hasFile).length === 0) {
    return {
      allowed: false,
      reason: "Nenhum documento com arquivo anexado. Um PDF agrupado vazio não é entregável.",
    };
  }
  return { allowed: true };
}

/* ============================================================ formação */

/** Implementação de `aba-hours-come-from-certificates`. */
export function abaHours(documents: ProfessionalDocument[], registered = 0): number {
  const certificados = documents.filter(
    (doc) => doc.typeId === "aba_course" && hasFile(doc) && doc.hours !== undefined,
  );
  if (certificados.length === 0) return registered;
  return certificados.reduce((soma, doc) => soma + (doc.hours ?? 0), 0);
}

export function abaBand(hours: number): "Inicial" | "Intermediária" | "Avançada" {
  if (hours >= 400) return "Avançada";
  if (hours >= 160) return "Intermediária";
  return "Inicial";
}

/* ============================================================= unidade */

/**
 * Implementação de `unit-credentialing-needs-every-standard-document`.
 *
 * Devolve os tipos que faltam. Vencido conta como falta aqui pelo mesmo motivo
 * que conta no profissional: a vistoria da operadora não distingue um AVCB
 * vencido de um AVCB inexistente.
 */
export function unitMissingForInsurer(
  documents: UnitDocument[],
  types: DocumentType[],
  insurerId: string,
  now: string,
): string[] {
  return types
    .filter((type) => type.standard)
    .filter((type) => {
      const doc = documents.find(
        (item) =>
          item.typeId === type.id && hasFile(item) && item.sharedWith.includes(insurerId),
      );
      if (!doc) return true;
      return unitDocumentState(doc, now) === "expired";
    })
    .map((type) => type.id);
}

export function unitCredentialStatus(
  documents: UnitDocument[],
  types: DocumentType[],
  insurerId: string,
  now: string,
): CredentialStatus {
  const compartilhados = documents.filter((doc) => doc.sharedWith.includes(insurerId));
  if (compartilhados.length === 0) return "not_credentialed";
  return unitMissingForInsurer(documents, types, insurerId, now).length > 0
    ? "in_credentialing"
    : "credentialed";
}
