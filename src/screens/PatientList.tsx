import { useMemo, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type { Patient, PatientsData } from "../contracts/index.js";
import { ageInYears, isMinor } from "../contracts/index.js";
import { missingRequiredFields } from "../rules/patients.js";
import { AppShell } from "../components/AppShell.js";
import {
  Card,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/primitives.js";
import { Icon } from "../components/Icon.js";

/**
 * Lista de pacientes.
 *
 * A coluna de situação do cadastro existe porque a recepção precisa saber, antes
 * de abrir o cadastro, quem pode ser agendado. Descobrir a pendência só no
 * momento de agendar é o que faz o paciente esperar no balcão.
 */
export function PatientList({ context }: ScreenProps) {
  const { data, isLoading, error, can } = context;
  const patients = (data as PatientsData | null)?.patients ?? [];
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => patients.filter((patient) => patient.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))), [patients, query]);

  if (isLoading) return wrap(context, <LoadingState label="Carregando pacientes" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("patients.list")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso aos pacientes"
        description="Seu perfil não inclui a permissão de leitura de cadastros."
      />,
    );
  }

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
    <Card className="overflow-hidden p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-2xl font-black text-navy">Pacientes</h2>
        {context.can("patients.create") && <Button variant="primary">Novo Paciente <Icon name="fa-plus" /></Button>}
      </div>
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <label className="text-sm font-bold text-navy">Buscar
          <span className="mt-1 flex items-center rounded-lg border border-[var(--border-strong)] bg-white px-3"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, Apelido, Código" className="min-w-0 flex-1 border-0 bg-transparent py-2.5 font-normal outline-none" /><Icon name="fa-search" className="text-[var(--fg-2)]" /></span>
        </label>
        <label className="text-sm font-bold text-navy">Telefone<input disabled placeholder="Telefone" className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 py-2.5 font-normal" /></label>
        <label className="text-sm font-bold text-navy">Mapa de Horas<select disabled className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 py-2.5 font-normal"><option>Selecione o status</option></select></label>
        <label className="text-sm font-bold text-navy">Operadoras<select disabled className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 py-2.5 font-normal"><option>Selecione a operadora</option></select></label>
        <label className="text-sm font-bold text-navy">Status<select disabled className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 py-2.5 font-normal"><option>Selecione o status</option></select></label>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--border-soft)]">
      <table className="w-full border-collapse text-[0.9375rem]">
        <caption className="sr-only">Pacientes da unidade e situação do cadastro</caption>
        <thead>
          <tr className="border-b border-[var(--border-soft)] text-left text-[0.75rem] font-black uppercase tracking-wide text-[var(--fg-2)]">
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
          {filtered.map((patient) => (
            <PatientRow
              key={patient.id}
              patient={patient}
              onOpen={() => context.navigate(`/patients/${patient.id}`)}
            />
          ))}
        </tbody>
      </table>
      </div>
      <p className="m-0 mt-4 text-sm text-[var(--fg-2)]">{filtered.length} {filtered.length === 1 ? "paciente" : "pacientes"}</p>
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
          // 24px de altura mínima: é o alvo principal da linha da lista.
          className="inline-flex min-h-6 items-center font-semibold text-action underline-offset-2 hover:underline"
          onClick={(event) => {
            event.preventDefault();
            onOpen();
          }}
        >
          {patient.name}
        </a>
        <span className="mt-0.5 block text-[0.8125rem] text-[var(--fg-2)]">
          {patient.cpf ?? "CPF não informado"}
        </span>
      </th>

      <td className="px-5 py-4 align-top tabular-nums">
        {ageInYears(patient.birthDate)} anos
        {minor && (
          <span className="mt-0.5 block text-[0.8125rem] font-semibold text-[var(--fg-2)]">
            {patient.guardian ? `resp.: ${patient.guardian.name}` : "sem responsável"}
          </span>
        )}
      </td>

      <td className="px-5 py-4 align-top">
        {patient.insurance ? (
          <>
            {patient.insurance.name}
            <span className="block text-[0.8125rem] text-[var(--fg-2)]">{patient.insurance.plan}</span>
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
            <span className="mt-1 block text-[0.8125rem] text-[var(--fg-2)]">
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
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
