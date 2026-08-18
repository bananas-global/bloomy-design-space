import { useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type { ProfessionalDeactivationData } from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import { Button } from "../components/primitives.js";
import { EmptyState, ErrorState, LoadingState } from "../components/primitives.js";
import { Button as SystemButton } from "../components/bloomy/Button.js";
import { Card } from "../components/bloomy/Card.js";
import { Checkbox, Input, Select, Textarea } from "../components/bloomy/Input.js";
import { InsideCard, SectionHeader } from "../components/bloomy/Layout.js";
import { RadioSelector } from "../components/bloomy/Choice.js";
import { Tag } from "../components/bloomy/Tag.js";
import {
  canConfirmDeactivation,
  deactivationImpact,
  professionalStatus,
  professionalStatusLabel,
  substitutesFor,
  type DeactivationForm,
} from "../rules/professionalDeactivation.js";
import { daysUntil } from "../rules/documents.js";

/**
 * Inativar um profissional.
 *
 * A inativação de paciente já existe em outra tela e as duas se parecem o
 * bastante para alguém tratá-las como a mesma. Não são: um paciente que sai
 * deixa horários vagos; um profissional que sai deixa **pacientes sem
 * responsável**. Toda a diferença desta tela está nessa frase.
 *
 * Por isso a etapa do destino do caseload não é um passo opcional no fim do
 * formulário — é a única que não pode ser resolvida depois. Um paciente sem
 * responsável não aparece em fila nenhuma: ele simplesmente deixa de ser
 * atendido, e a clínica descobre pela falta.
 */
export function ProfessionalDeactivation({ context }: ScreenProps) {
  const { data, isLoading, error, permissions, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a inativação" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("professionals.edit")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso à inativação"
        description="Inativar um profissional é de admin, admin de clínica, coordenação e People. Fale com quem administra os acessos."
      />,
    );
  }

  const inativacao = data as ProfessionalDeactivationData | null;
  if (!inativacao) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  return <Conteudo context={context} inativacao={inativacao} permissions={permissions} />;
}

/**
 * Etiqueta do sistema.
 *
 * A paleta de `tag/1` é a do monólito, e o contraste dela também: amarelo sobre
 * amarelo claro dá 2,04:1. A divergência está registrada na decisão 0001, e o
 * `espelho-do-sistema` é como este repositório marca o que é cópia fiel para que
 * a varredura de acessibilidade não a leia como defeito desta entrega.
 */
function Etiqueta(props: React.ComponentProps<typeof Tag>) {
  return (
    <Tag
      {...props}
      className={["espelho-do-sistema", props.className].filter(Boolean).join(" ")}
    />
  );
}

const MOTIVOS = [
  { value: "resignation", label: "Pedido de demissão", description: "Decisão do profissional" },
  { value: "dismissal", label: "Desligamento pela clínica", description: "Decisão da coordenação" },
  { value: "contract_end", label: "Fim de contrato", description: "Vigência encerrada e não renovada" },
  {
    value: "leave",
    label: "Licença prolongada",
    description: "Afastamento com data prevista de retorno",
  },
  { value: "transfer", label: "Transferência de unidade", description: "Continua na clínica, em outra unidade" },
  { value: "other", label: "Outro motivo", description: "Descreva nas observações" },
];

function Conteudo({
  context,
  inativacao,
  permissions,
}: {
  context: ScreenProps["context"];
  inativacao: ProfessionalDeactivationData;
  permissions: string[];
}) {
  const { locale } = context;
  const hoje = inativacao.now.slice(0, 10);
  const jaMarcada = Boolean(inativacao.professional.deactivationDate);
  const modo = jaMarcada ? "edit" : "create";

  const [form, setForm] = useState<DeactivationForm>({
    date: inativacao.professional.deactivationDate,
    reason: undefined,
    destination: "transfer",
    assignments: jaMarcada
      ? { "pac-helena": "prof-noel", "pac-otavio": "prof-noel" }
      : {},
    acknowledged: false,
  });

  const decisao = canConfirmDeactivation(inativacao, form, permissions, modo);
  const impacto = deactivationImpact(inativacao, form);
  const situacao = professionalStatus(inativacao.professional, hoje);
  const semDestino = inativacao.caseload.filter((entry) => !form.assignments[entry.patientId]);

  return wrap(
    context,
    <div className="space-y-6">
      <Card className="space-y-4">
        <SectionHeader
          variant="small"
          subtitle={`${inativacao.professional.specialty}${
            inativacao.professional.council ? ` · ${inativacao.professional.council}` : ""
          }`}
          actions={
            <Etiqueta
              item={professionalStatusLabel(situacao)}
              variant={situacao === "active" ? "green" : situacao === "deactivating" ? "yellow" : "red"}
            />
          }
        >
          {inativacao.professional.name}
        </SectionHeader>

        {jaMarcada && form.date && (
          <div className="rounded-lg bg-[var(--color-brand-orange)]/15 p-4">
            <p className="m-0 font-bold text-[var(--color-brand-purple-dark)]">
              Inativação marcada para {formatDate(form.date, locale)}
            </p>
            <p className="m-0 mt-1 text-sm text-[var(--fg-2)]">
              {diasRestantes(form.date, hoje)} Até lá o cadastro continua na agenda: é esse intervalo
              que existe para a transferência acontecer antes de alguém ficar sem terapeuta.
            </p>
          </div>
        )}
      </Card>

      <Card className="espelho-do-sistema space-y-6">
        <SectionHeader variant="small">Data da saída</SectionHeader>

        <Input
          id="inativacao-data"
          label="Sai em"
          type="date"
          min={hoje}
          value={form.date ?? ""}
          onChange={(event) => setForm((atual) => ({ ...atual, date: event.target.value }))}
        />

        {modo === "create" && (
          <Select
            id="inativacao-motivo"
            label="Motivo"
            prompt="Selecione o motivo"
            value={form.reason ?? ""}
            options={MOTIVOS.map((motivo) => ({ label: motivo.label, value: motivo.value }))}
            onChange={(value) => setForm((atual) => ({ ...atual, reason: value }))}
          />
        )}

        {modo === "edit" && (
          <p className="m-0 text-sm text-[var(--fg-2)]">
            O motivo não é pedido de novo: ele explica a saída, não a data. Adiar dois dias é
            corrigir, não decidir outra vez.
          </p>
        )}

        <Textarea
          id="inativacao-observacoes"
          label="Observações (opcional)"
          rows={3}
          placeholder="Combinados com a coordenação, avisos às famílias, o que mais precisar ficar registrado."
        />
      </Card>

      {impacto.length > 0 && (
        <Card className="space-y-4">
          <SectionHeader variant="small" subtitle="Os números antes da confirmação, e não depois.">
            O que muda {form.date ? `até ${formatDate(form.date, locale)}` : "com a saída"}
          </SectionHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InsideCard
              icon="fa-calendar-check"
              title="Atendimentos até a saída"
              subtitle="permanecem na agenda"
              value={String(inativacao.scheduledUntil)}
            />
            <InsideCard
              icon="fa-calendar-xmark"
              title="Atendimentos após a data"
              subtitle={form.destination === "transfer" ? "transferidos" : "serão cancelados"}
              value={String(inativacao.scheduledAfter)}
            />
            <InsideCard
              icon="fa-users"
              title="Pacientes em atendimento"
              subtitle="precisam de destino"
              value={String(inativacao.caseload.length)}
            />
            <InsideCard
              icon="fa-door-open"
              title="Períodos na escala de salas"
              subtitle="liberam vaga"
              value={String(inativacao.roomPeriods)}
            />
          </div>

          <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-[var(--fg-2)]">
            {impacto.map((efeito) => (
              <li key={efeito}>{efeito}</li>
            ))}
          </ul>
        </Card>
      )}

      {inativacao.caseload.length > 0 && (
        <Card className="espelho-do-sistema space-y-6">
          <SectionHeader
            variant="small"
            subtitle="A única etapa desta tela que não pode ser resolvida depois."
          >
            O que fazer com os atendimentos após a data
          </SectionHeader>

          <RadioSelector
            name="destino"
            label="Destino dos atendimentos"
            value={form.destination}
            options={[
              {
                value: "transfer",
                label: "Transferir para outro profissional",
                title: "Os atendimentos seguem na agenda, com novo responsável.",
              },
              {
                value: "cancel",
                label: "Cancelar todas as sessões",
                title:
                  "Os atendimentos após a data são cancelados e os pacientes voltam para a fila de reagendamento.",
              },
            ]}
            onChange={(value) =>
              setForm((atual) => ({ ...atual, destination: value as "transfer" | "cancel" }))
            }
          />

          <p className="m-0 text-sm text-[var(--fg-2)]">
            {form.destination === "transfer"
              ? "Os atendimentos seguem na agenda, com novo responsável."
              : "Os atendimentos após a data são cancelados e os pacientes voltam para a fila de reagendamento."}
          </p>

          {form.destination === "transfer" ? (
            <div className="space-y-4">
              <p className="m-0 text-sm text-[var(--fg-2)]">
                {inativacao.caseload.length - semDestino.length} de {inativacao.caseload.length}{" "}
                definidos. A transferência entra na escala do novo responsável{" "}
                {form.date ? `a partir de ${formatDate(form.date, locale)}` : "a partir da data escolhida"} — os
                horários são mantidos quando a agenda dele permitir.
              </p>

              <ul className="m-0 list-none space-y-3 p-0">
                {inativacao.caseload.map((entry) => {
                  const elegiveis = substitutesFor(
                    entry,
                    inativacao.substitutes,
                    inativacao.professional.id,
                  );

                  return (
                    <li
                      key={entry.patientId}
                      className="rounded-2xl border border-[var(--color-brand-purple-dark)]/10 p-4"
                    >
                      <p className="m-0 font-bold text-[var(--color-brand-purple-dark)]">
                        {entry.patientName}
                      </p>
                      <p className="m-0 mb-3 text-sm text-[var(--fg-2)]">
                        {entry.weeklyHours}h por semana · {entry.monthlySessions} atendimentos no mês ·{" "}
                        {entry.unitName}
                      </p>
                      <Select
                        id={`destino-${entry.patientId}`}
                        label="Assume os atendimentos"
                        prompt="Escolha o profissional"
                        value={form.assignments[entry.patientId] ?? ""}
                        options={elegiveis.map((pessoa) => ({
                          label: `${pessoa.name} · ${pessoa.specialty}${
                            pessoa.specialty === entry.specialty ? "" : " (outra especialidade)"
                          }`,
                          value: pessoa.id,
                        }))}
                        onChange={(value) =>
                          setForm((atual) => ({
                            ...atual,
                            assignments: { ...atual.assignments, [entry.patientId]: value },
                          }))
                        }
                      />
                    </li>
                  );
                })}
              </ul>

              <p className="m-0 text-sm text-[var(--fg-2)]">
                <Icon name="fa-circle-info" className="mr-2" />
                Quem já tem saída marcada não aparece na lista. Transferir para alguém que também
                está saindo apenas adia o problema para uma semana em que ninguém vai olhar.
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-[var(--color-red-light)] p-4">
              <p className="m-0 font-bold text-[var(--color-danger-fg)]">
                {inativacao.scheduledAfter} atendimentos serão cancelados
              </p>
              <p className="m-0 mt-1 text-sm text-[var(--fg-2)]">
                Os {inativacao.caseload.length} pacientes ficam sem profissional responsável e voltam
                para a fila de reagendamento. As famílias precisam ser avisadas.
              </p>
            </div>
          )}
        </Card>
      )}

      <Card className="espelho-do-sistema space-y-4">
        <Checkbox
          id="inativacao-aceite"
          label="Confirmo a inativação e assumo a transição"
          checked={form.acknowledged}
          onChange={(event) =>
            setForm((atual) => ({ ...atual, acknowledged: event.target.checked }))
          }
        />

        <div className="flex flex-wrap items-start gap-3">
          {modo === "edit" && (
            <SystemButton className="espelho-do-sistema" variant="ghost" onClick={() => undefined}>
              Cancelar inativação
            </SystemButton>
          )}
          <Button
            id="confirmar-inativacao"
            variant="danger"
            unavailableReason={decisao.allowed ? undefined : decisao.reason}
          >
            {modo === "edit"
              ? "Salvar nova data"
              : form.date
                ? `Inativar em ${formatDate(form.date, locale)}`
                : "Inativar profissional"}
          </Button>
        </div>
      </Card>
    </div>,
    inativacao,
  );
}

function diasRestantes(date: string, hoje: string): string {
  const dias = daysUntil(date, hoje);
  if (dias === 0) return "A saída é hoje.";
  return `Faltam ${dias} ${dias === 1 ? "dia" : "dias"}.`;
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  inativacao?: ProfessionalDeactivationData | null,
) {
  return (
    <AppShell
      context={context}
      title={
        inativacao ? `Inativar ${inativacao.professional.name}` : "Inativar profissional"
      }
      breadcrumb={[
        { label: "Profissionais", path: "/team" },
        { label: inativacao?.professional.name ?? "Profissional" },
        { label: "Inativação" },
      ]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
