import { useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type { Patient, PatientsData } from "../contracts/index.js";
import { ageInYears, formatDate, isMinor } from "../contracts/index.js";
import { canReadRecord, canSchedule, missingRequiredFields } from "../rules/patients.js";
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

/**
 * Cadastro do paciente.
 *
 * Duas decisões de conteúdo governam esta tela:
 *
 * 1. **A pendência é nomeada.** "Cadastro incompleto" sem dizer o que falta
 *    obriga a recepção a caçar campo por campo. A lista de campos ausentes é a
 *    informação, o rótulo é só o resumo.
 *
 * 2. **A restrição de prontuário é visível mesmo para quem não pode ler.**
 *    Esconder a existência da restrição seria pior: a recepção precisa saber que
 *    há informação clínica sensível para não insistir em perguntar ao paciente
 *    no balcão.
 */
export function PatientDetail({ params, context }: ScreenProps) {
  const { data, isLoading, error, permissions, locale } = context;
  const [outcome, setOutcome] = useState<string | undefined>();

  if (isLoading) return wrap(context, <LoadingState label="Carregando o cadastro" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const patients = (data as PatientsData | null)?.patients ?? [];
  const patient = patients.find((item) => item.id === params.id);

  if (!patient) {
    return wrap(
      context,
      <EmptyState
        title="Cadastro não encontrado"
        description={`Nenhum paciente com o identificador ${params.id ?? "informado"} nesta unidade.`}
      />,
    );
  }

  const missing = missingRequiredFields(patient);
  const scheduling = canSchedule(patient, permissions);
  const record = canReadRecord(patient, permissions);
  const minor = isMinor(patient);

  return wrap(
    context,
    <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <div className="space-y-4">
        {missing.length > 0 && (
          <Notice tone="pending" title="Cadastro incompleto">
            <p className="m-0">
              Falta preencher: <strong className="font-bold">{missing.join(", ")}</strong>.
            </p>
            <p className="m-0 mt-1.5">
              Enquanto houver campo obrigatório em falta, agendar fica bloqueado pela regra{" "}
              <code>incomplete-registration-blocks-scheduling</code>.
            </p>
          </Notice>
        )}

        {minor && !patient.guardian && (
          <Notice tone="danger" title="Paciente menor de idade sem responsável legal">
            <p className="m-0">
              {ageInYears(patient.birthDate)} anos. Consentimento e cobrança dependem de um
              responsável com nome, relação, CPF e telefone.
            </p>
            <p className="m-0 mt-1.5">
              Regra <code>minor-requires-guardian</code>.
            </p>
          </Notice>
        )}

        <Card as="section">
          <CardHeader title="Dados do paciente" />
          <div className="px-5 py-5">
            <div className="mb-4 flex flex-wrap items-center gap-2.5">
              <h3 className="m-0 text-xl font-bold text-navy">{patient.name}</h3>
              {missing.length === 0 ? (
                <Chip tone="ok">Cadastro completo</Chip>
              ) : (
                <Chip tone="pending">Cadastro incompleto</Chip>
              )}
              {patient.recordRestricted && <Chip tone="warn">Prontuário restrito</Chip>}
            </div>

            <DetailList
              items={[
                {
                  label: "Nascimento",
                  value: `${formatDate(patient.birthDate, locale)} · ${ageInYears(patient.birthDate)} anos`,
                },
                { label: "CPF", value: patient.cpf ?? notInformed() },
                { label: "Telefone", value: patient.phone ?? notInformed() },
                { label: "E-mail", value: patient.email ?? notInformed() },
                {
                  label: "Convênio",
                  value: patient.insurance ? (
                    <>
                      {patient.insurance.name} — {patient.insurance.plan}
                      <span className="block text-[13px] text-[var(--fg-2)]">
                        carteirinha {patient.insurance.cardNumber}
                      </span>
                    </>
                  ) : (
                    notInformed()
                  ),
                },
              ]}
            />
          </div>
        </Card>

        {minor && (
          <Card as="section">
            <CardHeader
              title="Responsável legal"
              hint="Obrigatório para paciente menor de 18 anos"
            />
            <div className="px-5 py-5">
              {patient.guardian ? (
                <DetailList
                  items={[
                    { label: "Nome", value: patient.guardian.name },
                    { label: "Relação", value: patient.guardian.relation },
                    { label: "CPF", value: patient.guardian.cpf },
                    { label: "Telefone", value: patient.guardian.phone },
                  ]}
                />
              ) : (
                <p className="m-0 text-[15px] text-[var(--fg-2)]">
                  Nenhum responsável cadastrado. Cadastre antes de agendar.
                </p>
              )}
            </div>
          </Card>
        )}

        <Card as="section">
          <CardHeader title="Prontuário" />
          <div className="px-5 py-5">
            {patient.recordRestricted && (
              <p className="m-0 mb-3 text-[15px] text-navy">
                {patient.restrictionNote ??
                  "Este prontuário tem acesso restrito por decisão clínica."}
              </p>
            )}

            {record.allowed ? (
              <div className="rounded-field bg-ink-50 px-4 py-4">
                <p className="m-0 text-[15px] text-navy">
                  Conteúdo clínico disponível para este perfil. No Design Space o prontuário é
                  representado, não reproduzido: o que importa aqui é <em>quem</em> alcança a
                  informação, não a informação em si.
                </p>
              </div>
            ) : (
              <Notice tone="warn" title="Conteúdo não disponível para o seu perfil">
                {record.reason}
              </Notice>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card as="section">
          <CardHeader title="Ações" />
          <div className="px-5 py-5">
            <p role="status" aria-live="polite" className="m-0 min-h-6 text-[15px] text-navy">
              {outcome}
            </p>

            <div className="mt-3 flex flex-col items-start gap-3">
              <Button
                id="agendar"
                variant="primary"
                unavailableReason={scheduling.allowed ? undefined : scheduling.reason}
                onClick={() => setOutcome("Agendamento iniciado para este paciente.")}
              >
                Agendar atendimento
              </Button>

              <Button variant="ghost" onClick={() => context.navigate("/patients")}>
                Voltar para a lista
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>,
    patient,
  );
}

function notInformed() {
  // Campo vazio precisa dizer que está vazio. Um traço solto obriga a interpretar
  // se o dado não existe ou se a tela não carregou.
  return <span className="text-[var(--fg-2)]">não informado</span>;
}

function wrap(context: ScreenProps["context"], children: React.ReactNode, patient?: Patient) {
  return (
    <AppShell
      context={context}
      title={patient?.name ?? "Paciente"}
      subtitle={patient ? `Cadastro · ${patient.id}` : undefined}
      breadcrumb={[{ label: "Pacientes", path: "/patients" }, { label: "Cadastro" }]}
    >
      {children}
    </AppShell>
  );
}
