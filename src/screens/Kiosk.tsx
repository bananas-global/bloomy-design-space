import type { ScreenProps } from "@brucesantos/design-space";
import type { KioskData } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { PublicPageFrame } from "../components/PublicPageFrame.js";
import { Button, Card, ErrorState, LoadingState, Notice } from "../components/primitives.js";
import {
  CHECKIN_STEPS,
  actionFor,
  errorMessage,
  kioskError,
  stepIndex,
} from "../rules/publicPortal.js";

/**
 * Totem de auto check-in.
 *
 * A única superfície do Bloomy operada por quem não trabalha na clínica, num
 * tablet fixado na parede da recepção. Isso muda o critério de qualidade: nas
 * telas internas, um erro mal explicado custa um chamado ao suporte; aqui custa
 * uma pessoa com uma criança no colo desistindo e indo para a fila.
 *
 * Três decisões seguem daí:
 *
 * 1. **Cada falha tem mensagem e saída próprias.** CPF errado se resolve
 *    digitando de novo; CPF não cadastrado, não. Uma mensagem genérica manda
 *    todo mundo para a recepção e anula o totem.
 *
 * 2. **Alvos grandes e texto grande.** Quem opera está de pé, segurando alguém,
 *    às vezes sem óculos. O corpo desta tela é maior que o das telas internas de
 *    propósito.
 *
 * 3. **A etapa atual é anunciada.** Três telas sem indicação de progresso, num
 *    fluxo que não volta, deixam quem usa sem saber quanto falta.
 */
export function Kiosk({ context }: ScreenProps) {
  const { data, isLoading, error } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando o totem" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const kiosk = data as KioskData | null;
  if (!kiosk) return wrap(context, <ErrorState message="Não foi possível abrir o totem." />);

  const failure = kioskError(kiosk);
  const index = stepIndex(kiosk.step);

  return wrap(
    context,
    <PublicPageFrame canReset={index > 0}>
    <div className="space-y-6">
      {/* Progresso: três telas num fluxo que não volta precisam dizer onde se está. */}
      {kiosk.unit && (
        <ol className="m-0 flex list-none gap-2 p-0" aria-label="Etapas do check-in">
          {CHECKIN_STEPS.map((step, position) => (
            <li key={step} className="flex-1">
              <span
                {...(position === index ? { "aria-current": "step" as const } : {})}
                className={`block rounded-field px-3 py-2 text-center text-[0.9375rem] ${
                  position === index
                    ? "bg-action font-semibold text-white"
                    : position < index
                      ? "bg-ok-bg text-ok-fg"
                      : "bg-ink-50 text-[var(--fg-2)]"
                }`}
              >
                <span className="sr-only">
                  Etapa {position + 1} de {CHECKIN_STEPS.length}
                  {position === index ? ", atual" : position < index ? ", concluída" : ""}:{" "}
                </span>
                {stepLabel(step)}
              </span>
            </li>
          ))}
        </ol>
      )}

      {failure ? (
        <Failure error={failure} />
      ) : kiosk.step === "identification" ? (
        <Identification />
      ) : kiosk.step === "select_patient" ? (
        <SelectPatient kiosk={kiosk} />
      ) : (
        <Complete kiosk={kiosk} />
      )}
    </div>
    </PublicPageFrame>,
    kiosk,
  );
}

function Identification() {
  return (
    <div>
      <h2 className="m-0 mb-6 text-2xl font-extrabold text-[var(--color-brand-purple-dark)] md:text-3xl">Digite seu CPF</h2>

      <div className="mt-6">
        <label htmlFor="cpf" className="block text-[1.0625rem] font-semibold text-navy">
          <span className="sr-only">CPF do responsável</span>
        </label>
        <input
          id="cpf"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          // Campo grande de propósito: quem digita está de pé, muitas vezes com
          // uma criança no colo.
          className="w-full rounded-xl border-2 border-[var(--color-brand-purple-dark)] bg-white px-4 py-4 text-[1.125rem] tracking-wide text-navy"
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 bg-white px-8 py-6 shadow-[0_-4px_16px_rgba(43,35,91,.08)]">
        <div className="mx-auto flex w-full max-w-5xl justify-end">
        <Button id="continuar" variant="primary" className="px-8 py-3 text-[1.125rem]">
          Próximo <span aria-hidden="true">→</span>
        </Button>
        </div>
      </div>
    </div>
  );
}

function SelectPatient({ kiosk }: { kiosk: KioskData }) {
  return (
    <Card className="px-8 py-8">
      <h2 className="m-0 text-[1.625rem] font-bold text-navy">
        Olá, {kiosk.guardian?.name.split(" ")[0]}
      </h2>
      <p className="m-0 mt-2 text-[1.1875rem] text-navy">Quem está chegando agora?</p>

      <ul className="m-0 mt-6 list-none space-y-3 p-0">
        {kiosk.patients.map((patient) => {
          const action = actionFor(patient);
          return (
            <li key={patient.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 rounded-card border border-[var(--border-strong)] bg-surface px-5 py-4 text-left hover:bg-ink-50"
              >
                <span>
                  <span className="block text-[1.25rem] font-semibold text-navy">{patient.name}</span>
                  <span className="block text-[1rem] text-[var(--fg-2)]">
                    {patient.times.length === 1
                      ? `Atendimento às ${patient.times[0]}`
                      : `Atendimentos às ${patient.times.join(" e ")}`}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-field px-4 py-2 text-[1rem] font-semibold ${
                    action === "checkin" ? "bg-action text-white" : "bg-ink-50 text-navy"
                  }`}
                >
                  {action === "checkin" ? "Registrar chegada" : "Registrar saída"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Complete({ kiosk }: { kiosk: KioskData }) {
  const patient = kiosk.patients.find((item) => item.id === kiosk.selectedPatientId);
  const entering = kiosk.action !== "checkout";

  return (
    <Card className="px-8 py-8">
      {/* `role="status"` e não `alert`: é a confirmação de algo que a pessoa
          acabou de fazer, não uma interrupção. */}
      <div role="status">
        <h2 className="m-0 text-[1.625rem] font-bold text-navy">
          {entering ? "Chegada registrada" : "Saída registrada"}
        </h2>
        <p className="m-0 mt-2 max-w-[44ch] text-[1.1875rem] text-navy">
          {entering ? (
            <>
              A equipe já sabe que {patient?.name ?? "o paciente"} chegou. Podem aguardar aqui na
              recepção — alguém vem buscar no horário.
            </>
          ) : (
            <>Registramos a saída de {patient?.name ?? "o paciente"}. Até a próxima.</>
          )}
        </p>
      </div>

      <div className="mt-6">
        <Button id="recomecar" className="px-8 py-3 text-[1.125rem]">
          Registrar outra pessoa
        </Button>
      </div>
    </Card>
  );
}

function Failure({ error }: { error: KioskData["error"] | "unit_not_found" }) {
  const message = errorMessage(error!);

  /**
   * `role="alert"` interrompe a leitura. Isso é certo quando a falha responde a
   * algo que a pessoa acabou de fazer — digitou um CPF, mandou. É errado quando
   * a falha **é o estado de chegada**: unidade não encontrada acontece porque o
   * endereço aberto está errado, e ninguém fez nada para provocá-la. Anunciar
   * assertivamente aí atropela a leitura do título da própria página.
   */
  const segueUmaAcao = error !== "unit_not_found";

  return (
    <Card className="px-8 py-8">
      <Notice
        tone={error === "invalid_cpf" ? "warn" : "info"}
        title={message.title}
        live={segueUmaAcao}
      >
        <p className="m-0 max-w-[46ch] text-[1.125rem]">{message.body}</p>
      </Notice>

      <div className="mt-6">
        <Button
          id="saida"
          variant={error === "invalid_cpf" ? "primary" : "secondary"}
          className="px-8 py-3 text-[1.125rem]"
        >
          {message.exit}
        </Button>
      </div>
    </Card>
  );
}

function stepLabel(step: KioskData["step"]): string {
  return {
    identification: "Identificação",
    select_patient: "Quem chegou",
    registration_complete: "Pronto",
  }[step];
}

function wrap(context: ScreenProps["context"], children: React.ReactNode, kiosk?: KioskData) {
  return (
    <AppShell
      context={context}
      title={kiosk?.unit ? `Bloomy ${kiosk.unit.name}` : "Bloomy"}
      subtitle="Registro de chegada"
      surface="standalone"
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
