import type { ScreenProps } from "@brucesantos/design-space";
import type { PatientDocument, PatientRecord as Record } from "../contracts/index.js";
import { formatDate, formatDateTime } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  absenceAlerts,
  canFinishAnamnese,
  canViewDocument,
  currentMonolithBehaviour,
  documentTypeLabel,
  documentValidity,
  documentsNeedingAttention,
  hasCriteria,
  missingBehaviors,
} from "../rules/record.js";

/**
 * Prontuário do paciente.
 *
 * Substitui o modelo de "prontuário restrito" que este repositório tinha e que
 * era invenção — um booleano no paciente e uma permissão inexistente. O real é
 * mais rígido: a restrição é por **tipo de documento**, e dois dos três tipos
 * não são abertos por ninguém, em papel nenhum.
 *
 * Duas decisões de desenho:
 *
 * 1. **Documento que não pode ser aberto continua listado.** Esconder a
 *    existência faria a recepção pedir de novo o que a família já entregou. O
 *    que some é o conteúdo, não o registro.
 *
 * 2. **A anamnese mostra os dois comportamentos lado a lado.** O proposto, que
 *    recusa a finalização com motivo, e o atual do monólito, que devolve
 *    sucesso e reabre a anamnese em silêncio. Sem o contraste, a engenharia
 *    leria a regra como descrição do que já existe.
 */
export function PatientRecordScreen({ context }: ScreenProps) {
  const { data, isLoading, error, locale, persona, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando o prontuário" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("patients.see_clinic_overview")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso ao prontuário"
        description="A visão clínica do paciente não alcança recepção nem operação. Fale com quem administra os acessos da unidade."
      />,
    );
  }

  const record = data as Record | null;
  if (!record) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const role = persona?.id ?? "";
  const attention = documentsNeedingAttention(record);
  const alerts = absenceAlerts(record);
  const finish = canFinishAnamnese(record.anamnese);
  const missing = missingBehaviors(record.anamnese);

  return wrap(
    context,
    <div className="space-y-4">
      {alerts.length > 0 && (
        <Notice tone="warn" title="Critérios de falta deste paciente foram atingidos">
          <ul className="m-0 list-disc space-y-1 pl-5">
            {alerts.map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </Notice>
      )}

      {attention.length > 0 && (
        <Notice
          tone="danger"
          title={`${attention.length} ${attention.length === 1 ? "documento exige" : "documentos exigem"} atenção`}
        >
          {attention.map((document) => document.name).join(", ")}. Documento vencido interrompe
          autorização e para o atendimento.
        </Notice>
      )}

      {/* ---------------------------------------------------- documentos */}
      <Card as="section">
        <CardHeader
          title="Documentos"
          hint={`${record.documents.length} no prontuário`}
        />
        <div className="px-5 py-5">
          <ul className="m-0 list-none space-y-3 p-0">
            {record.documents.map((document) => (
              <DocumentRow
                key={document.id}
                document={document}
                role={role}
                now={record.now}
                locale={locale}
              />
            ))}
          </ul>
        </div>
      </Card>

      {/* ------------------------------------------------------ anamnese */}
      <Card as="section">
        <CardHeader
          title="Anamnese"
          hint={
            record.anamnese.updatedAt
              ? `Atualizada em ${formatDateTime(record.anamnese.updatedAt, locale)}`
              : undefined
          }
        />
        <div className="space-y-4 px-5 py-5">
          <Chip tone={record.anamnese.status === "finished" ? "ok" : "pending"}>
            {record.anamnese.status === "finished" ? "Finalizada" : "Pendente"}
          </Chip>

          {missing.length > 0 && (
            <>
              <Notice tone="pending" title="Faltam campos de comportamento" level={3}>
                Não foi respondido: {missing.join(", ")}. São os campos que orientam a primeira
                sessão.
              </Notice>

              {/* O contraste entre o proposto e o atual. Sem ele, a regra seria
                  lida como descrição do que já existe. */}
              <Notice tone="warn" title="O sistema atual se comporta diferente aqui" level={3}>
                <p className="m-0">
                  Hoje, clicar em finalizar devolve <strong>sucesso</strong> e a anamnese continua{" "}
                  <strong>{currentMonolithBehaviour(record.anamnese).resultingStatus === "pending" ? "pendente" : "finalizada"}</strong>
                  , sem nada na tela explicando. O status é revertido dentro do changeset, em vez de
                  a operação ser recusada.
                </p>
                <p className="m-0 mt-2">
                  O que esta especificação propõe é recusar com motivo — o que está no botão abaixo.
                </p>
              </Notice>
            </>
          )}

          <div>
            <Button
              id="finalizar-anamnese"
              variant="primary"
              unavailableReason={finish.allowed ? undefined : finish.reason}
            >
              Finalizar anamnese
            </Button>
          </div>
        </div>
      </Card>

      {/* -------------------------------------------------- critérios */}
      <Card as="section">
        <CardHeader
          title="Critérios de alerta"
          hint="Configurados por paciente, não pela clínica"
        />
        <div className="px-5 py-5">
          {!hasCriteria(record) ? (
            <p className="m-0 max-w-[68ch] text-[0.9375rem] text-navy">
              Nenhum critério configurado para este paciente. Sem eles, nenhum limite de falta é
              aplicado — nem um padrão da clínica, porque não existe padrão.
            </p>
          ) : (
            <dl className="m-0 grid grid-cols-[minmax(200px,auto)_1fr] gap-x-6 gap-y-2 text-[0.9375rem]">
              <dt className="text-[var(--fg-2)]">Faltas seguidas</dt>
              <dd className="m-0 text-navy">
                limite {record.alertCriteria!.maximumConsecutiveAbsences} ·{" "}
                {record.attendance.consecutiveAbsences} agora
              </dd>
              <dt className="text-[var(--fg-2)]">Faltas no período</dt>
              <dd className="m-0 text-navy">
                limite {record.alertCriteria!.maximumAbsences} · {record.attendance.absences} agora
              </dd>
              <dt className="text-[var(--fg-2)]">Sessões previstas</dt>
              <dd className="m-0 text-navy">
                {record.alertCriteria!.requiredSessionCount} · {record.attendance.sessions}{" "}
                realizadas
              </dd>
            </dl>
          )}
        </div>
      </Card>
    </div>,
    record,
  );
}

function DocumentRow({
  document,
  role,
  now,
  locale,
}: {
  document: PatientDocument;
  role: string;
  now: string;
  locale: string | undefined;
}) {
  const access = canViewDocument(document, role);
  const validity = documentValidity(document, now);

  return (
    <li className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">{document.name}</span>
        <Chip tone={document.type === "clinical" ? "info" : "neutral"}>
          {capitalize(documentTypeLabel(document.type))}
        </Chip>
        {validity.state === "expired" && (
          <Chip tone="danger">Vencido há {Math.abs(validity.daysLeft!)} dias</Chip>
        )}
        {validity.state === "warning" && (
          <Chip tone="warn">Vence em {validity.daysLeft} dias</Chip>
        )}
      </div>

      {document.validUntil && (
        <p className="m-0 mt-1 text-[0.8125rem] text-[var(--fg-2)]">
          Válido até {formatDate(`${document.validUntil}T12:00:00.000-03:00`, locale)}
          {document.alertLeadDays !== undefined &&
            ` · avisa ${document.alertLeadDays} dias antes`}
        </p>
      )}

      <div className="mt-2">
        <Button
          id={`abrir-${document.id}`}
          unavailableReason={access.allowed ? undefined : access.reason}
        >
          Abrir documento
        </Button>
      </div>
    </li>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function wrap(context: ScreenProps["context"], children: React.ReactNode, record?: Record) {
  return (
    <AppShell
      context={context}
      title={record?.patient.name ?? "Prontuário"}
      subtitle="Prontuário"
      breadcrumb={[{ label: "Pacientes", path: "/patients" }, { label: "Prontuário" }]}
    >
      {children}
    </AppShell>
  );
}
