import type { ScreenProps } from "@brucesantos/design-space";
import type { TeamData, TeamMember } from "../contracts/index.js";
import { formatMoney } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  DetailList,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  canDeactivate,
  contractTypeLabel,
  downstreamEffects,
  isContractActiveOn,
  missingContractRates,
  missingProfessionalFields,
  requiresSupervisorSignature,
  TBD_REQUIRED,
} from "../rules/team.js";

/**
 * Equipe.
 *
 * Esta tela tem uma função que as outras não têm: **explicar as outras**. Duas
 * decisões que parecem do atendimento e do pagamento nascem aqui, e quem for
 * desenhar aqueles módulos sem saber disso vai procurar a configuração no lugar
 * errado.
 *
 * - A exigência de assinatura do supervisor vem do vínculo de estágio.
 * - A exigência de nota fiscal no fechamento vem do contrato do mês.
 *
 * Por isso cada profissional traz uma seção de "o que este cadastro decide",
 * ligando o registro às consequências que ele produz longe daqui.
 */
export function Team({ context }: ScreenProps) {
  const { data, isLoading, error, locale, can, permissions } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a equipe" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("professionals.list")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso à equipe"
        description="A lista de profissionais é de admin, admin de clínica, recepção, coordenação e People. Fale com quem administra os acessos."
      />,
    );
  }

  const team = data as TeamData | null;
  const members = team?.members ?? [];

  if (members.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhum profissional vinculado"
        description="Assim que alguém for vinculado a esta unidade, aparece aqui com especialidade, contrato e supervisão."
      />,
      team,
    );
  }

  return wrap(
    context,
    <ul className="m-0 list-none space-y-3 p-0">
      {members.map((member) => (
        <li key={member.id}>
          <MemberCard
            member={member}
            now={team!.now}
            locale={locale}
            permissions={permissions}
          />
        </li>
      ))}
    </ul>,
    team,
  );
}

function MemberCard({
  member,
  now,
  locale,
  permissions,
}: {
  member: TeamMember;
  now: string;
  locale: string | undefined;
  permissions: string[];
}) {
  const missing = missingProfessionalFields(member);
  const effects = downstreamEffects(member, now);
  const deactivation = canDeactivate(member, permissions);
  const contract = member.contract;
  const missingRates = contract ? missingContractRates(contract) : [];
  const contractActive = contract ? isContractActiveOn(contract, now) : false;

  return (
    <Card as="article">
      <CardHeader
        title={member.name}
        hint={`${member.specialty}${member.specialtyRegister ? ` · ${member.specialtyRegister}` : ""}`}
      />
      <div className="space-y-4 px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          {member.tbd && <Chip tone="warn">A definir</Chip>}
          <Chip tone={member.active ? "ok" : "neutral"}>
            {member.active ? "Ativo" : "Desativado"}
          </Chip>
          {member.isAt && <Chip tone="info">Acompanhante terapêutico</Chip>}
          {requiresSupervisorSignature(member) && <Chip tone="pending">Em supervisão</Chip>}
        </div>

        {/* -------------------------------------- o cadastro a definir */}
        {member.tbd && (
          <Notice tone="info" title="Espaço reservado na agenda" level={3}>
            Um profissional a definir exige apenas {TBD_REQUIRED.join(" e ")} — contra dez campos de
            um cadastro comum. Ele existe para a clínica montar a grade da semana antes de saber
            quem vai atender.
          </Notice>
        )}

        {!member.tbd && missing.length > 0 && (
          <Notice
            tone="warn"
            title={`Cadastro incompleto: ${missing.length} ${missing.length === 1 ? "campo faltando" : "campos faltando"}`}
            level={3}
          >
            Falta {missing.join(", ")}.
          </Notice>
        )}

        {/* ------------------------------------------------- supervisão */}
        {member.supervisedBy.length > 0 && (
          <div>
            <h3 className="m-0 text-[0.875rem] font-bold text-navy">Supervisão</h3>
            <ul className="m-0 mt-1.5 list-none space-y-1 p-0">
              {member.supervisedBy.map((link) => (
                <li key={link.id} className="text-[0.875rem] text-navy">
                  {link.supervisorName}
                  {link.needsSupervisorSignature ? (
                    <span className="text-[0.8125rem] font-semibold text-pending-fg">
                      {" "}
                      — exige assinatura nas sessões
                    </span>
                  ) : (
                    <span className="text-[0.8125rem] text-[var(--fg-2)]">
                      {" "}
                      — sem exigência de assinatura
                    </span>
                  )}
                  {link.observation && (
                    <span className="block text-[0.8125rem] text-[var(--fg-2)]">{link.observation}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {member.supervises.length > 0 && (
          <p className="m-0 text-[0.875rem] text-navy">
            Supervisiona {member.supervises.length}{" "}
            {member.supervises.length === 1 ? "profissional" : "profissionais"}.
          </p>
        )}

        {/* --------------------------------------------------- contrato */}
        {contract && (
          <div>
            <h3 className="m-0 text-[0.875rem] font-bold text-navy">
              Contrato · {contractTypeLabel(contract.type)}
            </h3>

            {missingRates.length > 0 && (
              <div className="mt-2">
                <Notice tone="danger" title="Contrato incompleto" level={3}>
                  Falta {missingRates.join(", ")}. Cada tipo de contrato tem uma base de cálculo
                  diferente, e um valor faltando produz um fechamento errado — descoberto pelo
                  profissional, no aceite.
                </Notice>
              </div>
            )}

            <div className="mt-2">
              <DetailList
                items={[
                  {
                    label: "Vigência",
                    value: `desde ${br(contract.startDate)}${contract.endDate ? ` até ${br(contract.endDate)}` : ""}${contractActive ? "" : " — fora de vigência hoje"}`,
                  },
                  ...(contract.weeklyPeriod
                    ? [{ label: "Carga semanal", value: `${contract.weeklyPeriod} horas` }]
                    : []),
                  ...(contract.type === "fixed_compensation"
                    ? [
                        {
                          label: "Valor mensal",
                          value: money(contract.monthlyRateCents, locale),
                        },
                        {
                          label: "Hora administrativa",
                          value:
                            contract.administrativeHourlyRateCents === 0 ? (
                              <span>
                                {formatMoney(0, locale)}{" "}
                                <span className="text-[0.8125rem] text-[var(--fg-2)]">
                                  — zero é válido aqui: quem tem mensalidade não cobra hora
                                  administrativa à parte
                                </span>
                              </span>
                            ) : (
                              money(contract.administrativeHourlyRateCents, locale)
                            ),
                        },
                      ]
                    : [
                        {
                          label: "Por atendimento",
                          value: money(contract.serviceRateCents, locale),
                        },
                        {
                          label: "Hora administrativa",
                          value: money(contract.administrativeHourlyRateCents, locale),
                        },
                        {
                          label: "Hora administrativa especial",
                          value: money(contract.specialAdministrativeHourlyRateCents, locale),
                        },
                      ]),
                ]}
              />
            </div>
          </div>
        )}

        {/* ------------------------------- o que este cadastro decide */}
        {effects.length > 0 && (
          <div className="rounded-field bg-ink-50 px-4 py-3">
            <h3 className="m-0 text-[0.875rem] font-bold text-navy">O que este cadastro decide</h3>
            <ul className="m-0 mt-1.5 list-disc space-y-1 pl-5 text-[0.875rem] text-navy">
              {effects.map((effect) => (
                <li key={effect}>{effect}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <Button
            id={`desativar-${member.id}`}
            variant="danger"
            unavailableReason={deactivation.allowed ? undefined : deactivation.reason}
          >
            Desativar profissional
          </Button>
        </div>
      </div>
    </Card>
  );
}

function money(cents: number | undefined, locale: string | undefined) {
  if (cents === undefined) {
    return <span className="font-semibold text-danger-fg">não informado</span>;
  }
  return formatMoney(cents, locale);
}

function br(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function wrap(context: ScreenProps["context"], children: React.ReactNode, team?: TeamData | null) {
  return (
    <AppShell
      context={context}
      title="Equipe"
      subtitle={
        team && team.members.length > 0
          ? `${team.members.length} ${team.members.length === 1 ? "profissional" : "profissionais"}`
          : undefined
      }
      breadcrumb={[{ label: "Equipe" }]}
    >
      {children}
    </AppShell>
  );
}
