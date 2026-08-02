import type { ScreenProps } from "@brucesantos/design-space";
import type { NewAppointmentData } from "../contracts/index.js";
import { formatDate, formatTime } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  allImpediments,
  canSchedule,
  firstImpediment,
  impedimentLabel,
  impedimentOwner,
  roomHeadroom,
  roomVerificationSkipped,
  savesToSeeEverything,
} from "../rules/agenda.js";

/**
 * Marcar um atendimento.
 *
 * `ScheduleVerification.verify/2` roda sete verificadores em ordem fixa com
 * `Enum.find_value`, que para no primeiro que falha. Um horário com quatro
 * problemas exige **quatro tentativas de salvar** para que todos apareçam — e
 * cada tentativa custa uma conversa, porque a recepção está com a família na
 * frente ou no telefone.
 *
 * Três decisões seguem daí:
 *
 * 1. **Todos os impedimentos aparecem de uma vez.** É a única diferença de
 *    comportamento que esta tela propõe em relação ao sistema real, e a
 *    proposta fica declarada ao lado do que acontece hoje — em vez de a
 *    especificação fingir que o produto já faz isso.
 *
 * 2. **Cada impedimento diz de quem é resolver.** Profissional desativado é do
 *    People; sala lotada é da recepção; bloqueio da unidade é de quem o criou.
 *    Uma lista que só informa devolve o problema para quem não pode agir.
 *
 * 3. **A verificação que não rodou também é dita.** Acompanhamento terapêutico
 *    não passa pela checagem de sala. Sem essa frase, um horário de AT sem sala
 *    parece cadastro incompleto e alguém vai "corrigi-lo".
 */
export function NewAppointment({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Verificando o horário" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const appointment = data as NewAppointmentData | null;
  if (!appointment) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const { attempt } = appointment;
  const decision = canSchedule(attempt);
  const todos = allImpediments(attempt);
  const primeiro = firstImpediment(attempt);
  const tentativas = savesToSeeEverything(attempt);
  const semSala = roomVerificationSkipped(attempt);
  const folga = roomHeadroom(attempt);

  return wrap(
    context,
    <div className="mx-auto max-w-[52rem] space-y-4">
      {/* ------------------------------------------------------ o horário */}
      <Card as="section">
        <CardHeader
          title={attempt.serviceName}
          hint={`${formatDate(attempt.start, locale)}, ${formatTime(attempt.start, locale)} às ${formatTime(attempt.end, locale)}`}
        />
        <div className="px-5 py-5">
          <dl className="m-0 grid grid-cols-[minmax(130px,auto)_1fr] gap-x-6 gap-y-1.5 text-[15px]">
            {attempt.patientName && (
              <>
                <dt className="text-[var(--fg-2)]">Paciente</dt>
                <dd className="m-0 text-navy">{attempt.patientName}</dd>
              </>
            )}
            <dt className="text-[var(--fg-2)]">Profissional</dt>
            <dd className="m-0 text-navy">{attempt.professionalName ?? "a definir"}</dd>
            <dt className="text-[var(--fg-2)]">Unidade</dt>
            <dd className="m-0 text-navy">{attempt.unitName}</dd>
            <dt className="text-[var(--fg-2)]">Sala</dt>
            <dd className="m-0 text-navy">
              {attempt.roomName ?? <span className="text-[var(--fg-2)]">não se aplica</span>}
              {folga !== undefined && (
                <>
                  {" "}
                  <span className="text-[13px] text-[var(--fg-2)]">
                    · {attempt.roomOccupancy} de {attempt.roomCapacity} lugares ocupados
                  </span>
                </>
              )}
            </dd>
          </dl>

          {/* "Ocupada" só quer dizer cheia. Sem isso, alguém recusa um horário
              que caberia. */}
          {folga !== undefined && folga > 0 && attempt.roomOccupancy! > 0 && (
            <p className="m-0 mt-3 max-w-[64ch] text-[13px] text-[var(--fg-2)]">
              A sala já tem atendimento e ainda cabe {folga}{" "}
              {folga === 1 ? "atendimento" : "atendimentos"}. A verificação compara ocupação com
              capacidade — uma sala com gente dentro não está indisponível, está usada.
            </p>
          )}

          {semSala && (
            <div className="mt-3">
              <Notice tone="info" title="A verificação de sala não rodou" level={3}>
                {semSala}
              </Notice>
            </div>
          )}
        </div>
      </Card>

      {/* -------------------------------------------------- impedimentos */}
      {todos.length === 0 ? (
        <Notice tone="ok" title="As sete verificações passaram">
          Profissional ativo, sem bloqueio dele, da unidade, da sala nem geral, sem atendimento
          duplicado e com lugar na sala. É o horário inteiro conferido, e não só o que couber numa
          primeira tentativa.
        </Notice>
      ) : (
        <Card as="section">
          <CardHeader
            title={`${todos.length} ${todos.length === 1 ? "impedimento" : "impedimentos"}`}
            hint="Todos de uma vez, na ordem em que o sistema os verifica"
          />
          <div className="space-y-3 px-5 py-5">
            {tentativas > 1 && (
              <Notice tone="warn" title={`Hoje isso seriam ${tentativas} tentativas de salvar`}>
                <p className="m-0">
                  As sete verificações rodam em sequência e param na primeira que falha. Quem tenta
                  marcar recebe uma frase por vez, corrige, salva de novo e descobre a próxima —{" "}
                  {tentativas} vezes, com a família na frente ou no telefone.
                </p>
                <p className="m-0 mt-2">
                  A primeira que apareceria é{" "}
                  <span className="font-semibold">
                    {primeiro && impedimentLabel(primeiro.kind).toLowerCase()}
                  </span>
                  , porque é a ordem do código — não a ordem de gravidade nem a de facilidade de
                  resolver.
                </p>
              </Notice>
            )}

            <ol className="m-0 list-none space-y-3 p-0">
              {todos.map((impediment, index) => (
                <li
                  key={impediment.kind}
                  className="rounded-field border border-[var(--border-soft)] px-4 py-3"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Chip tone={index === 0 ? "warn" : "neutral"}>
                      {impedimentLabel(impediment.kind)}
                    </Chip>
                    {index === 0 && todos.length > 1 && (
                      <span className="text-[13px] text-[var(--fg-2)]">
                        a única que o sistema atual mostraria
                      </span>
                    )}
                  </div>
                  {/* A frase do sistema real, com os nomes e horários dentro. */}
                  <p className="m-0 mt-1.5 max-w-[64ch] text-[15px] text-navy">
                    {impediment.message}
                  </p>
                  {/* Uma lista que só informa devolve o problema a quem não age. */}
                  <p className="m-0 mt-1 text-[13px] text-[var(--fg-2)]">
                    Resolver: {impedimentOwner(impediment.kind)}.
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      )}

      <Button
        id="marcar"
        variant="primary"
        unavailableReason={decision.allowed ? undefined : decision.reason}
      >
        Marcar atendimento
      </Button>
    </div>,
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Marcar atendimento"
      breadcrumb={[{ label: "Agenda", path: "/agenda" }, { label: "Marcar" }]}
    >
      {children}
    </AppShell>
  );
}
