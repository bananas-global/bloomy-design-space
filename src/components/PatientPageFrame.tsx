import type { ReactNode } from "react";
import { Card } from "./primitives.js";

const PATIENT_TABS = ["Dados Pessoais", "Anamneses", "Plano Terapêutico", "Mapa de Horas", "Atendimentos", "Evolução", "Financeiro", "Conteúdos", "Faltas"];

export function PatientPageFrame({
  patientName,
  active,
  secondary,
  children,
}: {
  patientName: string;
  active: string;
  secondary?: string[];
  children: ReactNode;
}) {
  return <div className="space-y-5">
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-4 px-5 py-5"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand-blue)]/20 text-xl font-black text-[var(--color-brand-blue-dark)]">{patientName.slice(0,1)}</span><div><h1 className="m-0 text-xl font-black text-navy">{patientName}</h1><p className="m-0 text-sm text-[var(--fg-2)]">Informações do Paciente</p></div></div>
      <div className="flex overflow-x-auto border-t border-[var(--border-soft)] px-3 pt-2" role="tablist" aria-label="Paciente" tabIndex={0}>{PATIENT_TABS.map((tab) => <button key={tab} type="button" role="tab" aria-selected={tab === active} className={`whitespace-nowrap border-b-2 px-4 py-3 font-extrabold ${tab === active ? "border-action text-action" : "border-transparent text-[var(--fg-2)]"}`}>{tab}</button>)}</div>
      {secondary && <div className="flex overflow-x-auto bg-[var(--color-ink-50)] px-4" aria-label={`Opções de ${active}`} tabIndex={0}>{secondary.map((tab, index) => <span key={tab} className={`whitespace-nowrap px-4 py-2.5 text-sm font-bold ${index === 0 ? "text-action" : "text-[var(--fg-2)]"}`}>{tab}</span>)}</div>}
    </Card>
    {children}
  </div>;
}
