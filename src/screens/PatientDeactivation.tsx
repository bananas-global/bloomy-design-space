import type { ScreenProps } from "@brucesantos/design-space";
import type { DeactivationImpact } from "../contracts/index.js";
import { formatDate, formatDateTime } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  bondsDeletedBy,
  bondsWithNotes,
  caughtOnTheEve,
  pathDifference,
  deactivationSummary,
  realCutoff,
  stillActiveAfterScheduling,
} from "../rules/patients.js";

/**
 * Inativar um paciente.
 *
 * A ação mais destrutiva do produto, e no sistema real ela mora atrás de um
 * seletor de status. `ChangePatientStatus` cancela num `update_all` todos os
 * agendamentos a partir do corte, encerra os mapas de horas em vigor e desliga
 * a renovação automática de todos eles.
 *
 * Três decisões seguem daí:
 *
 * 1. **O que vai acontecer está escrito antes, com os números.** Não "isto pode
 *    afetar agendamentos": nove agendamentos, estes; dois mapas, estes. Nada
 *    disso se desfaz voltando o status para ativo.
 *
 * 2. **A data futura não adia a destruição, e a tela diz isso.** Com data
 *    futura o paciente continua ativo e a cascata roda imediatamente. Quem
 *    escolhe uma data futura está pedindo para adiar, e é a parte irreversível
 *    que não adia.
 *
 * 3. **O corte real aparece com hora.** `~T[00:00:00]` em UTC é 21h da véspera
 *    em Brasília. O atendimento das 21h30 do dia anterior é cancelado com
 *    motivo "paciente inativado" num dia em que o paciente ainda estava ativo.
 */
export function PatientDeactivation({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Calculando o impacto" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const impact = data as DeactivationImpact | null;
  if (!impact) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const resumo = deactivationSummary(impact);
  const vespera = caughtOnTheEve(impact);
  const corte = realCutoff(impact.deactivationDate);
  const aindaAtivo = stillActiveAfterScheduling(impact);
  const vinculosApagados = bondsDeletedBy(impact);
  const comAnotacao = bondsWithNotes(impact);
  const diferenca = pathDifference(impact);

  return wrap(
    context,
    <div className="mx-auto max-w-[52rem] space-y-4">
      {/* Os números antes da confirmação, e não depois dela. */}
      <Notice tone="danger" title="O que esta ação vai fazer">
        <ul className="m-0 list-disc space-y-1 pl-5">
          {resumo.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="m-0 mt-2 font-semibold">
          Nada disso volta ao trocar o status de volta para ativo. Os agendamentos ficam cancelados
          e os mapas, encerrados.
        </p>
      </Notice>

      {/* A metade que adia é a que não destrói. */}
      {aindaAtivo && (
        <Notice tone="warn" title="A data é futura, e a destruição não espera por ela">
          <p className="m-0">
            Com data de {formatDate(`${impact.deactivationDate}T12:00:00.000-03:00`, locale)}, o
            paciente <span className="font-semibold">continua ativo</span> — e o cancelamento dos
            agendamentos e o encerramento dos mapas acontecem agora, ao confirmar.
          </p>
          <p className="m-0 mt-2">
            As duas metades da operação correm em tempos diferentes: o status espera, a parte
            irreversível não.
          </p>
        </Notice>
      )}

      {/* O corte com hora, porque o efeito começa antes da data escolhida. */}
      {vespera.length > 0 && (
        <Notice tone="danger" title="O corte começa na véspera, às 21h">
          <p className="m-0">
            A data escolhida vira <span className="font-mono">00:00 UTC</span>, que em Brasília são
            21h do dia anterior. O corte real é {corte.slice(8, 10)}/{corte.slice(5, 7)} às{" "}
            {corte.slice(11)}.
          </p>
          <ul className="m-0 mt-2 list-disc space-y-1 pl-5">
            {vespera.map((entry) => (
              <li key={entry.id}>
                {formatDateTime(entry.start, locale)} — {entry.serviceName} com{" "}
                {entry.professionalName}
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2">
            {vespera.length === 1 ? "Este atendimento é cancelado" : "Estes atendimentos são cancelados"}{" "}
            com motivo “paciente inativado”, num dia em que o paciente ainda estava ativo.
          </p>
        </Notice>
      )}

      {/* Dois caminhos para o mesmo resultado, e o desatendido destrói mais.
          A frase aparece nos dois lados: quem inativa pela tela precisa saber
          que a rota automática é diferente. */}
      {diferenca && (
        <Notice
          tone={impact.path === "worker" ? "danger" : "info"}
          title={
            impact.path === "worker"
              ? "Este caminho apaga os vínculos com os profissionais"
              : "Este caminho preserva os vínculos com os profissionais"
          }
        >
          <p className="m-0">{diferenca}</p>
          {vinculosApagados.length > 0 && (
            <ul className="m-0 mt-2 list-disc space-y-1 pl-5">
              {vinculosApagados.map((bond) => (
                <li key={bond.id}>
                  {bond.professionalName}
                  {bond.observation && <> — “{bond.observation}”</>}
                </li>
              ))}
            </ul>
          )}
          {comAnotacao.length > 0 && (
            <p className="m-0 mt-2">
              {comAnotacao.length === 1
                ? "Um desses vínculos tem observação escrita"
                : `${comAnotacao.length} desses vínculos têm observação escrita`}
              . Famílias em terapia ABA pausam e voltam, e é exatamente isso que se procura no
              retorno: quem atendia, e o que se anotou sobre a relação.
            </p>
          )}
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title="Agendamentos que serão cancelados"
          hint={`${impact.schedulesToCancel.length} no total`}
        />
        <div className="px-5 py-5">
          <ul className="m-0 list-none space-y-2 p-0">
            {impact.schedulesToCancel.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-3 text-[0.9375rem] text-navy"
              >
                <span className="font-semibold">{formatDateTime(entry.start, locale)}</span>
                <span>{entry.serviceName}</span>
                <span className="text-[0.8125rem] text-[var(--fg-2)]">{entry.professionalName}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card as="section">
        <CardHeader title="Mapas de horas" hint={`${impact.hourMapsToClose.length} em vigor`} />
        <div className="space-y-2 px-5 py-5">
          <ul className="m-0 list-none space-y-1 p-0">
            {impact.hourMapsToClose.map((entry) => (
              <li key={entry.id} className="text-[0.9375rem] text-navy">
                Encerrado no corte — a vigência ia até{" "}
                {formatDate(`${entry.durationEnd}T12:00:00.000-03:00`, locale)}.
              </li>
            ))}
          </ul>
          <p className="m-0 text-[0.8125rem] text-[var(--fg-2)]">
            A renovação automática é desligada em {impact.hourMapsLosingAutoRenew} mapas — a
            consulta não filtra por data, então inclui os que já terminaram.
          </p>
        </div>
      </Card>

      {/* Variante de perigo, e não primária. A tela inteira é sobre uma ação
          irreversível; vesti-la com a cor da ação afirmativa faria o botão
          dizer o contrário do que a tela acabou de explicar. */}
      <Button id="inativar" variant="danger">
        Inativar {impact.patient.name}
      </Button>
    </div>,
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Inativar paciente"
      breadcrumb={[{ label: "Pacientes", path: "/patients" }, { label: "Inativar" }]}
    >
      {children}
    </AppShell>
  );
}
