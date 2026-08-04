import type { ReactNode } from "react";
import type { ScenarioContext } from "@brucesantos/design-space";
import type { Lead, LeadStep } from "../contracts/index.js";
import { AppShell } from "./AppShell.js";
import { Chip } from "./primitives.js";
import {
  LEAD_FUNNEL_LINE,
  NEXT_ACTION,
  breachesFirstContactSla,
  daysInStep,
  healthLabel,
  isTerminal,
  leadHealth,
  leadSourceLabel,
  leadStepLabel,
  leadStepPosition,
  lostReasonLabel,
  openTasks,
  timeInStepLabel,
} from "../rules/leads.js";

/**
 * Peças compartilhadas pelas telas do CRM de leads.
 *
 * Elas moram aqui e não numa das telas porque o cartão do lead aparece em três
 * lugares — quadro, lista e fila de tarefas — e a saúde do follow-up precisa
 * dizer a mesma coisa nos três. Duplicar a regra de cor é a forma mais barata
 * de a lista discordar do quadro sobre quem está atrasado.
 */

/* ================================================================= casca */

export function LeadShell({
  context,
  title,
  subtitle,
  breadcrumb,
  children,
}: {
  context: ScenarioContext;
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; path?: string }[];
  children: ReactNode;
}) {
  return (
    <AppShell
      context={context}
      title={title}
      subtitle={subtitle}
      breadcrumb={breadcrumb ?? [{ label: "Leads" }]}
    >
      {children}
    </AppShell>
  );
}

/**
 * Aviso fixo de que estas telas não descrevem o sistema que roda hoje.
 *
 * Sem ele, alguém abre o link do quadro, vê o funil de oito etapas e vai
 * procurar no monólito uma tela que não existe.
 */
export function ProposalBanner() {
  return (
    <p className="m-0 rounded-card border border-[var(--border-soft)] bg-neutral-bg px-4 py-2.5 text-[0.8125rem] text-navy/85">
      <strong className="font-semibold">Proposta.</strong> O funil que roda hoje tem oito etapas em
      linha e vive em <span className="whitespace-nowrap">/backoffice/visitas</span>. Estas telas
      descrevem a extensão desenhada para aposentar o CRM externo e as planilhas do Drive — e ainda
      não existem no sistema.
    </p>
  );
}

/* ================================================================ chips */

export function StepChip({ step }: { step: LeadStep }) {
  const tone =
    step === "converted" ? "ok" : step === "lost" ? "danger" : step === "new" ? "info" : "neutral";
  return <Chip tone={tone}>{leadStepLabel(step)}</Chip>;
}

/**
 * A saúde do follow-up, com rótulo textual.
 *
 * Sem o texto, o único sinal seria a cor — e o estado mais importante dos três
 * (nenhuma próxima ação) é justamente o que ninguém procura.
 */
export function HealthChip({ lead, now }: { lead: Lead; now: string }) {
  if (isTerminal(lead.step)) return null;
  const health = leadHealth(lead, now);
  const tone = health === "green" ? "ok" : health === "amber" ? "warn" : "danger";
  return <Chip tone={tone}>{healthLabel(health)}</Chip>;
}

export function SourceLine({ lead }: { lead: Lead }) {
  return (
    <span className="text-[0.8125rem] text-[var(--fg-2)]">
      {leadSourceLabel(lead.source)}
      {lead.campaign && ` · ${lead.campaign}`}
      {" · "}
      {lead.operator ?? "Operadora não informada"}
      {" · "}
      unidade {lead.unitOfInterest}
    </span>
  );
}

/* ============================================================== cartão */

/**
 * O cartão do lead.
 *
 * Mostra o primeiro nome da criança e nada mais sobre ela: a LGPD pede
 * minimização no topo de funil, e um quadro aberto na recepção é a superfície
 * mais exposta do produto.
 */
export function LeadCard({ lead, now }: { lead: Lead; now: string }) {
  const days = daysInStep(lead, now);
  const pending = openTasks(lead);
  const action = NEXT_ACTION[lead.step];
  const slaBreach = breachesFirstContactSla(lead, now);

  return (
    <article className="rounded-card border border-[var(--border-soft)] bg-surface px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h3 className="m-0 text-[0.9375rem] font-bold text-navy">
          <a href={`/leads/${lead.id}`} className="inline-block py-1 text-navy underline-offset-2 hover:underline">
            {lead.contactName}
          </a>
        </h3>
        <HealthChip lead={lead} now={now} />
      </div>

      <p className="m-0 mt-0.5 text-[0.875rem] text-navy">
        {lead.childName ? `${lead.childName}, ${lead.childAgeYears} anos` : "Criança não informada"}
      </p>
      <p className="m-0 mt-0.5">
        <SourceLine lead={lead} />
      </p>

      <p className="m-0 mt-1.5 text-[0.8125rem] text-[var(--fg-2)]">
        {lead.owner ?? "Sem dono"} · {timeInStepLabel(days)} nesta etapa
      </p>

      {slaBreach && (
        <p className="m-0 mt-1.5 text-[0.8125rem] font-semibold text-danger-fg">
          Fora do SLA de primeiro contato: {days} {days === 1 ? "dia" : "dias"} sem ninguém falar
          com esta família.
        </p>
      )}

      {!isTerminal(lead.step) && (
        <p className="m-0 mt-1.5 text-[0.8125rem] text-navy">
          {pending.length > 0 ? (
            <>
              <span className="text-[var(--fg-2)]">Próxima ação:</span> {pending[0]!.title}
            </>
          ) : (
            <span className="font-semibold text-danger-fg">
              Sem próxima ação. {action ? `A etapa pede: ${action.text.toLowerCase()}.` : ""}
            </span>
          )}
        </p>
      )}

      {lead.step === "lost" && (
        <p className="m-0 mt-1.5 text-[0.8125rem] text-navy">
          {lostReasonLabel(lead.lostReason)}
          {lead.lostNote && ` — ${lead.lostNote}`}
        </p>
      )}
    </article>
  );
}

/* ============================================================== stepper */

/**
 * Onde o lead está na linha, e quanto falta.
 *
 * Renderizado como lista ordenada com o estado por extenso em cada item: a
 * posição visual sozinha não sobrevive a um leitor de tela nem a um zoom de
 * 400%.
 */
export function FunnelStepper({ step }: { step: LeadStep }) {
  const position = leadStepPosition(step);

  if (position === undefined) {
    return (
      <p className="m-0 text-[0.875rem] text-navy">
        Fora da linha do funil: <strong className="font-semibold">{leadStepLabel(step)}</strong>.
        Perdido é uma saída lateral, não a última etapa.
      </p>
    );
  }

  return (
    <ol className="m-0 flex list-none flex-wrap gap-x-2 gap-y-1 p-0">
      {LEAD_FUNNEL_LINE.map((item, index) => {
        const state =
          index < position ? "concluída" : index === position ? "etapa atual" : "a fazer";
        return (
          <li key={item} className="flex items-center gap-2">
            <span
              className={`text-[0.8125rem] ${
                index === position ? "font-bold text-navy" : "text-[var(--fg-2)]"
              }`}
            >
              {index + 1}. {leadStepLabel(item)}
              <span className="sr-only"> — {state}</span>
            </span>
            {index < LEAD_FUNNEL_LINE.length - 1 && (
              <span aria-hidden="true" className="text-[var(--fg-2)]">
                ›
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ================================================================ barra */

/** Barra horizontal com o número por extenso — o desenho é o acessório. */
export function ValueBar({
  label,
  value,
  max,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  hint?: string;
}) {
  const percent = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="grid grid-cols-[minmax(140px,auto)_1fr_auto] items-center gap-x-3 gap-y-1">
      <span className="text-[0.875rem] text-navy">{label}</span>
      <span aria-hidden="true" className="h-2 rounded-full bg-neutral-bg">
        <span className="block h-2 rounded-full bg-action" style={{ width: `${percent}%` }} />
      </span>
      <span className="text-[0.875rem] font-semibold text-navy">
        {value}
        {hint && <span className="ml-2 font-normal text-[var(--fg-2)]">{hint}</span>}
      </span>
    </div>
  );
}
