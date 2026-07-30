import type { ScreenProps } from "@brucesantos/design-space";
import type { Patient, PatientsData } from "../contracts/index.js";
import { ageInYears, isMinor } from "../contracts/index.js";
import { missingRequiredFields } from "../rules/patients.js";
import { AppShell } from "../components/AppShell.js";
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/primitives.js";

/**
 * Lista de pacientes.
 *
 * A coluna de situação do cadastro existe porque a recepção precisa saber, antes
 * de abrir o cadastro, quem pode ser agendado. Descobrir a pendência só no
 * momento de agendar é o que faz o paciente esperar no balcão.
 */
export function PatientList({ context }: ScreenProps) {
  const { data, isLoading, error, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando pacientes" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("patients.read")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso aos pacientes"
        description="Seu perfil não inclui a permissão de leitura de cadastros."
      />,
    );
  }

  const patients = (data as PatientsData | null)?.patients ?? [];

  if (patients.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhum paciente cadastrado"
        description="Os cadastros criados na recepção aparecem aqui, em ordem alfabética."
      />,
    );
  }

  return wrap(
    context,
    <Card className="overflow-hidden p-0">
      <table className="w-full border-collapse text-[15px]">
        <caption className="sr-only">Pacientes da unidade e situação do cadastro</caption>
        <thead>
          <tr className="border-b border-[var(--border-soft)] text-left text-[12px] font-black uppercase tracking-wide text-[var(--fg-2)]">
            <th scope="col" className="px-5 py-3">
              Paciente
            </th>
            <th scope="col" className="px-5 py-3">
              Idade
            </th>
            <th scope="col" className="px-5 py-3">
              Convênio
            </th>
            <th scope="col" className="px-5 py-3">
              Cadastro
            </th>
            <th scope="col" className="px-5 py-3">
              Prontuário
            </th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <PatientRow
              key={patient.id}
              patient={patient}
              onOpen={() => context.navigate(`/patients/${patient.id}`)}
            />
          ))}
        </tbody>
      </table>
    </Card>,
  );
}

function PatientRow({ patient, onOpen }: { patient: Patient; onOpen: () => void }) {
  const missing = missingRequiredFields(patient);
  const minor = isMinor(patient);

  return (
    <tr className="border-b border-ink-50 last:border-0">
      <th scope="row" className="px-5 py-4 text-left align-top font-normal">
        <a
          href={`/patients/${patient.id}`}
          className="font-semibold text-action underline-offset-2 hover:underline"
          onClick={(event) => {
            event.preventDefault();
            onOpen();
          }}
        >
          {patient.name}
        </a>
        <span className="mt-0.5 block text-[13px] text-[var(--fg-2)]">
          {patient.cpf ?? "CPF não informado"}
        </span>
      </th>

      <td className="px-5 py-4 align-top tabular-nums">
        {ageInYears(patient.birthDate)} anos
        {minor && (
          <span className="mt-0.5 block text-[13px] font-semibold text-[var(--fg-2)]">
            {patient.guardian ? `resp.: ${patient.guardian.name}` : "sem responsável"}
          </span>
        )}
      </td>

      <td className="px-5 py-4 align-top">
        {patient.insurance ? (
          <>
            {patient.insurance.name}
            <span className="block text-[13px] text-[var(--fg-2)]">{patient.insurance.plan}</span>
          </>
        ) : (
          <span className="text-[var(--fg-2)]">Particular</span>
        )}
      </td>

      <td className="px-5 py-4 align-top">
        {missing.length === 0 ? (
          <Chip tone="ok">Completo</Chip>
        ) : (
          <>
            <Chip tone="pending">Incompleto</Chip>
            <span className="mt-1 block text-[13px] text-[var(--fg-2)]">
              falta {missing.join(", ")}
            </span>
          </>
        )}
      </td>

      <td className="px-5 py-4 align-top">
        {patient.recordRestricted ? (
          <Chip tone="warn">Restrito</Chip>
        ) : (
          <span className="text-[var(--fg-2)]">Padrão</span>
        )}
      </td>
    </tr>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Pacientes"
      subtitle="Cadastros da unidade e o que falta em cada um"
    >
      {children}
    </AppShell>
  );
}
