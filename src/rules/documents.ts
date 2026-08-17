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
