import type { ScreenProps } from "@brucesantos/design-space";
import type { InClinicData, PatientPresence, ProfessionalPresence } from "../contracts/index.js";
import { formatTime } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  ScheduleStatusChip,
} from "../components/primitives.js";
import {
  isPresent,
  minutesInClinic,
  presenceAlert,
  presentPatients,
  presentProfessionals,
  visibleTabs,
} from "../rules/inClinic.js";

/**
 * Na Clínica — o quadro da unidade.
 *
 * No Bloomy real esta tela se atualiza sozinha: assina o canal de check-in e
 * recarrega a cada sessenta segundos. É um painel de parede da recepção, não um
 * relatório, e isso decide o desenho: nada que a recepção precise saber pode
 * ficar atrás de um clique.
 *
 * Duas decisões que valem estar escritas:
 *
 * 1. **Presente e sem nada pronto é o alerta.** Paciente na unidade com todos os
 *    horários em Agendado significa que alguém precisa agir — e é o caso que um
 *    quadro só de nomes esconde.
 *
 * 2. **Quem já saiu continua na página, separado.** Sumir com quem fez check-out
 *    faz o quadro parecer que o dia não aconteceu; misturar faz a recepção
 *    chamar quem foi embora.
 */
export function InClinic({ context }: ScreenProps) {
  const { data, isLoading, error, locale, persona } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando o quadro da unidade" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  // Este é o único lugar do porte em que a decisão é por papel, e não por
  // permissão nomeada — porque é assim no monólito. Nenhuma outra tela deve
  // copiar o padrão.
  const tabs = visibleTabs(persona?.id ?? "");

  if (!tabs.patients && !tabs.professionals) {
    return wrap(
      context,
      <EmptyState
        title="Nada para ver aqui no seu perfil"
        description="O quadro da unidade mostra presença de pacientes e de profissionais, e seu perfil não alcança nenhum dos dois."
      />,
    );
  }

  const clinic = data as InClinicData | null;
  if (!clinic) {
    return wrap(
      context,
      <ErrorState message="Não foi possível carregar quem está na unidade." />,
    );
  }

  const here = presentPatients(clinic);
  const gone = clinic.patients.filter((presence) => !isPresent(presence));
  const staff = presentProfessionals(clinic);

  return wrap(
    context,
    <div className="space-y-4">
      {tabs.patients && (
        <>
          {here.length === 0 ? (
            <EmptyState
              title="Ninguém na unidade agora"
              description="Assim que a recepção registrar um check-in, o paciente aparece aqui com os atendimentos do dia."
            />
          ) : (
            <Card as="section">
              <CardHeader
                title="Pacientes na unidade"
                hint={`${here.length} ${here.length === 1 ? "pessoa presente" : "pessoas presentes"} · quadro em ${formatTime(clinic.now, locale)}`}
              />
              <ul className="m-0 list-none space-y-3 p-5">
                {here.map((presence) => (
                  <PatientRow
                    key={presence.id}
                    presence={presence}
                    now={clinic.now}
                    locale={locale}
                  />
                ))}
              </ul>
            </Card>
          )}

          {gone.length > 0 && (
            <Card as="section">
              <CardHeader
                title="Já saíram hoje"
                hint="Continuam na página porque o dia da unidade não termina no check-out"
              />
              <ul className="m-0 list-none space-y-3 p-5">
                {gone.map((presence) => (
                  <PatientRow
                    key={presence.id}
                    presence={presence}
                    now={clinic.now}
                    locale={locale}
                  />
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {tabs.professionals && (
        <Card as="section">
          <CardHeader
            title="Profissionais na unidade"
            hint={`${staff.length} ${staff.length === 1 ? "profissional presente" : "profissionais presentes"}`}
          />
          <div className="px-5 py-5">
            {staff.length === 0 ? (
              <p className="m-0 text-[15px] text-[var(--fg-2)]">
                Nenhum profissional com entrada registrada agora.
              </p>
            ) : (
              <ul className="m-0 list-none space-y-3 p-0">
                {staff.map((presence) => (
                  <ProfessionalRow
                    key={presence.id}
                    presence={presence}
                    now={clinic.now}
                    locale={locale}
                  />
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}
    </div>,
    clinic,
  );
}

/* ================================================================ linhas */

function PatientRow({
  presence,
  now,
  locale,
}: {
  presence: PatientPresence;
  now: string;
  locale: string | undefined;
}) {
  const alert = presenceAlert(presence);
  const here = isPresent(presence);
  const minutes = minutesInClinic(presence, now);

  return (
    <li className="rounded-card border border-[var(--border-soft)] px-4 py-3.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="m-0 text-[15px] font-bold text-navy">{presence.patient.name}</h3>
        {here ? (
          <Chip tone="ok">Na unidade</Chip>
        ) : (
          <Chip tone="neutral">Saiu às {formatTime(presence.checkoutAt!, locale)}</Chip>
        )}
        <span className="text-[13px] text-[var(--fg-2)]">
          Entrada às {formatTime(presence.checkinAt, locale)} ·{" "}
          {sourceLabel(presence.checkinBy)}
          {here && ` · há ${minutes} min na unidade`}
        </span>
      </div>

      {alert && (
        <div className="mt-2">
          <Notice tone="warn" title="Precisa de alguém agora" level={3}>
            {alert}
          </Notice>
        </div>
      )}

      {presence.observation && (
        <p className="m-0 mt-2 max-w-[68ch] rounded-field bg-ink-50 px-3 py-2 text-[13px] text-navy">
          <span className="font-semibold">Observação da recepção:</span> {presence.observation}
        </p>
      )}

      {presence.schedules.length === 0 ? (
        <p className="m-0 mt-2 text-[13px] text-[var(--fg-2)]">
          Nenhum atendimento marcado para hoje.
        </p>
      ) : (
        <ul className="m-0 mt-2.5 list-none space-y-1.5 p-0">
          {presence.schedules.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-[14px] font-semibold text-navy">
                {formatTime(item.start, locale)}
              </span>
              <span className="text-[14px] text-navy">{item.serviceName}</span>
              <span className="text-[13px] text-[var(--fg-2)]">{item.professionalName}</span>
              <ScheduleStatusChip status={item.status} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function ProfessionalRow({
  presence,
  now,
  locale,
}: {
  presence: ProfessionalPresence;
  now: string;
  locale: string | undefined;
}) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-[15px] font-semibold text-navy">{presence.professional.name}</span>
      <span className="text-[13px] text-[var(--fg-2)]">{presence.professional.specialty}</span>
      <span className="text-[13px] text-[var(--fg-2)]">
        Entrada às {formatTime(presence.checkinAt, locale)} · há{" "}
        {minutesInClinic(presence, now)} min
      </span>
      {presence.openSessions > 0 && (
        <Chip tone="pending">
          {presence.openSessions === 1
            ? "1 atendimento em aberto"
            : `${presence.openSessions} atendimentos em aberto`}
        </Chip>
      )}
    </li>
  );
}

function sourceLabel(source: "admin" | "web" | "app" | "system"): string {
  return {
    admin: "registrado na recepção",
    web: "registrado no totem",
    app: "registrado pelo aplicativo",
    system: "fechado pelo sistema",
  }[source];
}

function wrap(context: ScreenProps["context"], children: React.ReactNode, clinic?: InClinicData) {
  return (
    <AppShell
      context={context}
      title="Na Clínica"
      subtitle={clinic ? `Unidade ${clinic.unit.name}` : undefined}
      breadcrumb={[{ label: "Na Clínica" }]}
    >
      {children}
    </AppShell>
  );
}
