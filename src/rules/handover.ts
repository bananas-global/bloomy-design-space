import type { Handover, HandoverData } from "../contracts/index.js";
import type { Rule } from "@brucesantos/design-space";

/**
 * Regras de assumir o agendamento de outro profissional.
 *
 * A troca inteira roda dentro de uma transação:
 *
 * ```elixir
 * Bloomy.Repo.transaction(fn ->
 *   Schedules.create_schedule_log(%{event: :assumed, ...})
 *   maybe_create_schedule_participant(existing_participant, schedule, user)
 *   Notify.notify("Agendamento assumido", ..., [user])
 *
 *   if can_notify?(schedule.notified_at) do
 *     # ... avisa o profissional anterior, e carimba notified_at
 *   else
 *     {:error, "O profissional responsável já recebeu uma notificação no dia de hoje"}
 *   end
 * end)
 * ```
 *
 * Não há `Repo.rollback` em lugar nenhum do módulo. `Repo.transaction` devolve
 * `{:ok, valor}`, e o valor é o `{:error, ...}` — que o chamador nunca vê,
 * porque ele casa `{:ok, _result}` e mostra “Atendimento assumido”.
 */
export const handoverRules: Rule[] = [
  {
    id: "the-refusal-branch-commits-anyway",
    statement:
      "O ramo que recusa devolve erro sem desfazer a transação. A troca de responsável já aconteceu, o registro já foi gravado, e o erro é só um valor de retorno.",
    rationale:
      "A intenção do ramo é limitar notificações, não impedir a troca — e nisso ele está certo. O que ninguém decidiu é que ele se apresente como erro. Um `{:error, ...}` dentro de uma transação que comita é a forma mais fácil de alguém, mais tarde, ler o código e concluir que a operação foi barrada.",
    source: "src/rules/handover.ts",
  },
  {
    id: "the-error-branch-of-the-caller-is-unreachable",
    statement:
      "A tela tem um caso para tratar erro e ele nunca roda. Sem `Repo.rollback`, a transação sempre devolve sucesso, e a mensagem escrita para o usuário não tem caminho até ele.",
    rationale:
      "São duas mortes na mesma linha: a mensagem existe e não chega, e o tratamento existe e não executa. Vale registrar junto porque uma revisão que conserte só um dos lados deixa o outro — devolver o erro de verdade faria a tela finalmente mostrar “já foi notificado hoje” como se a troca tivesse falhado, quando ela deu certo.",
    source: "src/rules/handover.ts",
  },
  {
    id: "who-lost-the-appointment-is-not-told",
    statement:
      "Quando o aviso é suprimido, quem perdeu o atendimento não fica sabendo — e quem assumiu recebe “Atendimento assumido” como se tudo tivesse corrido bem. O silêncio cai sobre a pessoa que não está olhando a tela.",
    rationale:
      "É o efeito que importa, e o único que uma pessoa sente. O profissional anterior tem o paciente na cabeça, pode estar a caminho, pode ter preparado material. A informação que faltou não é sobre o sistema: é que outro profissional está com o atendimento dele daqui a pouco.",
    source: "src/rules/handover.ts",
  },
];

/**
 * Implementação de `the-refusal-branch-commits-anyway`.
 *
 * O ramo do erro é exatamente `can_notify?` dando falso.
 */
export function takesTheRefusalBranch(handover: Handover): boolean {
  return handover.alreadyNotifiedToday;
}

/** A troca acontece nos dois ramos. É o eixo do achado. */
export function handoverHappens(_handover: Handover): boolean {
  return true;
}

/**
 * Implementação de `who-lost-the-appointment-is-not-told`.
 */
export function previousProfessionalNotTold(data: HandoverData): Handover[] {
  return data.handovers.filter(takesTheRefusalBranch);
}

/** Quem foi avisado normalmente. */
export function previousProfessionalTold(data: HandoverData): Handover[] {
  return data.handovers.filter((h) => !takesTheRefusalBranch(h));
}

/** O que a tela mostra hoje, em qualquer um dos dois ramos. */
export function whatTheScreenShows(_handover: Handover): string {
  return "Atendimento assumido";
}

/**
 * Implementação de `the-error-branch-of-the-caller-is-unreachable`.
 *
 * A mensagem existe no código e não tem caminho até a tela.
 */
export const UNREACHABLE_MESSAGE =
  "O profissional responsável já recebeu uma notificação no dia de hoje";

export function messageReachesTheScreen(): boolean {
  return false;
}

/** Quantos minutos faltam para o atendimento que trocou de mãos. */
export function minutesUntilStart(handover: Handover, now: string): number {
  const t = (iso: string) => new Date(iso.slice(0, 19) + "Z").getTime();
  return Math.round((t(handover.scheduleStart) - t(now)) / 60_000);
}
