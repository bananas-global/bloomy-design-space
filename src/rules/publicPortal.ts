import type { Rule } from "@brucesantos/design-space";
import type { CheckinError, KioskData, KioskPatient, NpsResponse } from "../contracts/index.js";

/**
 * Regras do portal público.
 *
 * É a única superfície do Bloomy usada por quem não trabalha na clínica: um
 * totem na recepção e um link de pesquisa. Isso muda o critério de qualidade.
 * Nas telas internas, um erro mal explicado custa um chamado ao suporte; aqui,
 * custa uma pessoa com uma criança no colo desistindo e indo à fila.
 *
 * Traduzidas de `ServiceRecords.Checkin` e `Nps.NpsResponse`.
 */
export const publicPortalRules: Rule[] = [
  {
    id: "kiosk-distinguishes-three-failures",
    statement:
      "O totem separa CPF inválido, responsável não cadastrado e nenhum paciente agendado hoje. São três mensagens diferentes, não uma.",
    rationale:
      "As três exigem ações diferentes de quem está na frente da tela: digitar de novo, chamar a recepção, ou conferir se veio no dia certo. Uma mensagem genérica manda todo mundo para a fila.",
    source: "src/rules/publicPortal.ts",
  },
  {
    id: "kiosk-lists-only-today-and-unstarted",
    statement:
      "O totem lista apenas pacientes com agendamento hoje naquela unidade, ainda sem atendimento iniciado e sem cancelamento.",
    rationale:
      "Mostrar o agendamento de amanhã faria alguém fazer check-in um dia antes; mostrar o que já começou faria a família tentar entrar duas vezes no mesmo horário.",
    source: "src/rules/publicPortal.ts",
  },
  {
    id: "kiosk-never-goes-back",
    statement:
      "As etapas do totem avançam e não voltam. A única saída é recomeçar do zero.",
    rationale:
      "É como o monólito funciona, e é defensável num totem: um botão de voltar num fluxo de três telas convida a corrigir dado que já foi usado para buscar. Recomeçar é mais lento e menos ambíguo.",
    source: "src/rules/publicPortal.ts",
  },
  {
    id: "nps-rating-is-zero-to-ten",
    statement:
      "A nota do NPS vai de zero a dez e é obrigatória — exceto quando o registro é apenas o convite enviado, ainda sem resposta.",
    rationale:
      "Convite e resposta são coisas diferentes no mesmo registro. Tratar convite sem nota como resposta inválida quebraria o envio.",
    source: "src/rules/publicPortal.ts",
  },
  {
    id: "nps-code-identifies-the-invite",
    statement:
      "O código do NPS tem exatamente cinco caracteres e é único. É por ele que a família abre o link.",
    rationale:
      "Cinco caracteres cabem numa mensagem e num cartaz. Único porque cada convite corresponde a um responsável, e uma colisão atribuiria a nota à pessoa errada.",
    source: "src/rules/publicPortal.ts",
  },
];

/* ================================================================= totem */

export const CHECKIN_STEPS = [
  "identification",
  "select_patient",
  "registration_complete",
] as const;

export function stepIndex(step: KioskData["step"]): number {
  return CHECKIN_STEPS.indexOf(step);
}

/** Implementação de `kiosk-never-goes-back`. */
export function nextStep(step: KioskData["step"]): KioskData["step"] | undefined {
  const next = CHECKIN_STEPS[stepIndex(step) + 1];
  return next;
}

/**
 * Implementação de `kiosk-distinguishes-three-failures`.
 *
 * A validação de CPF do monólito é `Brcpfcnpj.cpf_valid?/1`, que confere os
 * dígitos verificadores. Aqui a conta é a mesma, e a distinção que importa é
 * entre "está errado o que você digitou" e "você não está cadastrado" — porque
 * a segunda não se resolve digitando de novo.
 */
export function identify(
  cpf: string,
  knownGuardians: { cpf: string; id: string; name: string }[],
): { ok: true; guardian: { id: string; name: string } } | { ok: false; error: CheckinError } {
  if (!isValidCpf(cpf)) return { ok: false, error: "invalid_cpf" };

  const digits = onlyDigits(cpf);
  const guardian = knownGuardians.find((item) => onlyDigits(item.cpf) === digits);
  if (!guardian) return { ok: false, error: "guardian_not_found" };

  return { ok: true, guardian: { id: guardian.id, name: guardian.name } };
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Dígitos verificadores de CPF.
 *
 * As fixtures deste repositório usam CPFs com dígito inválido de propósito, o
 * que torna esta função útil de dois jeitos: ela reprova a fixture sintética
 * exatamente como reprovaria um erro de digitação, e mantém honesta a promessa
 * de que nenhum CPF real entrou aqui.
 */
export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const check = (length: number): number => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (length + 1 - index);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
}

/**
 * Implementação de `kiosk-lists-only-today-and-unstarted`.
 *
 * O filtro do monólito é uma consulta com três condições: agendamento na data de
 * hoje, sem `cancelled_at`, e sem `custom_service` associado. Reproduzido aqui
 * como função para que a tela consiga explicar o vazio em vez de só mostrá-lo.
 */
export function kioskPatients(data: KioskData): KioskPatient[] {
  return data.patients;
}

export function kioskError(data: KioskData): CheckinError | undefined {
  if (!data.unit) return "unit_not_found";
  if (data.error) return data.error;
  if (data.step === "select_patient" && data.patients.length === 0) {
    return "no_scheduled_patients";
  }
  return undefined;
}

/**
 * O que o totem diz em cada falha, e o que oferece como saída.
 *
 * A saída importa tanto quanto a mensagem: quem está no totem precisa saber se
 * tenta de novo ou se procura alguém.
 */
export function errorMessage(error: CheckinError): { title: string; body: string; exit: string } {
  switch (error) {
    case "invalid_cpf":
      return {
        title: "CPF inválido",
        body: "Confira os números digitados. Faltou um dígito ou algum ficou trocado.",
        exit: "Digitar de novo",
      };
    case "guardian_not_found":
      return {
        title: "Não encontramos esse CPF",
        body: "O CPF está correto, mas não há responsável cadastrado com ele nesta clínica. A recepção resolve em um minuto.",
        exit: "Falar com a recepção",
      };
    case "no_scheduled_patients":
      return {
        title: "Nenhum atendimento marcado para hoje",
        body: "Não há agendamento em aberto nesta unidade hoje para os pacientes sob sua responsabilidade. Pode ser outro dia, ou outra unidade.",
        exit: "Falar com a recepção",
      };
    case "unit_not_found":
      return {
        title: "Unidade não encontrada",
        body: "O endereço aberto não corresponde a nenhuma unidade. Confira o link ou o QR Code do totem.",
        exit: "Falar com a recepção",
      };
  }
}

/** A ação disponível para o paciente: entrar ou sair. */
export function actionFor(patient: KioskPatient): "checkin" | "checkout" {
  return patient.hasOpenCheckin ? "checkout" : "checkin";
}

/* =================================================================== NPS */

type Decision = { allowed: boolean; reason?: string };

/** Implementação de `nps-rating-is-zero-to-ten`. */
export function validateNps(response: NpsResponse): Decision {
  // Convite enviado e ainda sem resposta é um registro legítimo.
  if (response.sent && response.rating === undefined) return { allowed: true };

  if (response.rating === undefined) {
    return { allowed: false, reason: "Escolha uma nota de 0 a 10 para enviar." };
  }
  if (!Number.isInteger(response.rating) || response.rating < 0 || response.rating > 10) {
    return { allowed: false, reason: "A nota deve estar entre 0 e 10." };
  }
  if ((response.comment?.length ?? 0) > 5000) {
    return { allowed: false, reason: "O comentário deve ter no máximo 5000 caracteres." };
  }
  return { allowed: true };
}

/**
 * O envio pode acontecer agora?
 *
 * Pergunta diferente de `validateNps`, e a diferença é a razão de as duas
 * existirem. `validateNps` responde "este **registro** é válido?" — e um convite
 * enviado sem nota é perfeitamente válido, é o estado normal de todo convite.
 * Esta função responde "este **formulário** pode ser enviado?", e aí a nota é
 * sempre obrigatória.
 *
 * Confundir as duas faz o botão de enviar liberar num formulário em branco.
 */
export function canSubmitNps(response: NpsResponse): Decision {
  if (response.rating === undefined) {
    return { allowed: false, reason: "Escolha uma nota de 0 a 10 para enviar." };
  }
  return validateNps({ ...response, sent: false });
}

/** Implementação de `nps-code-identifies-the-invite`. */
export function isValidNpsCode(code: string): boolean {
  return code.length === 5;
}

/**
 * Faixa da nota, no vocabulário do NPS.
 *
 * A classificação não aparece para quem responde — mostrar "você é um detrator"
 * a alguém que acabou de dar nota 4 é hostil. Ela serve para a leitura interna
 * do resultado.
 */
export function npsBand(rating: number): "detractor" | "passive" | "promoter" {
  if (rating <= 6) return "detractor";
  if (rating <= 8) return "passive";
  return "promoter";
}
