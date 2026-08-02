import type { ScreenProps } from "@brucesantos/design-space";
import type { Blocking, Service, StructureData } from "../contracts/index.js";
import { formatDateTime } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  blockingMessage,
  blockingTypeLabel,
  isImpossibleToSchedule,
  roomTypeLabel,
  roomsFor,
  serviceEffects,
  skipsCheckin,
} from "../rules/structure.js";

/**
 * Estrutura da unidade.
 *
 * A camada física que a agenda esbarra: sala do tipo certo, com capacidade,
 * numa unidade e num horário não bloqueados. Nenhuma dessas restrições aparece
 * na tela de agendamento — e é por isso que esta tela existe.
 *
 * Como o módulo de Equipe, este cadastro decide coisas em outros lugares, e a
 * tela diz quais: `not_chargeable` do serviço é o mesmo campo que dispensa o
 * check-in no módulo de Atendimento.
 *
 * Uma decisão específica: **cada bloqueio traz a saída, não só o motivo.** As
 * três origens exigem ações diferentes de quem tenta agendar — procurar outro
 * dia, outro profissional ou outra unidade —, e uma mensagem única de "horário
 * indisponível" não distingue nenhuma delas.
 */
export function Structure({ context }: ScreenProps) {
  const { data, isLoading, error, locale, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a estrutura" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("services.list")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso aos serviços da unidade"
        description="A lista de serviços é de admin, admin de clínica, recepção, coordenação e operação. Fale com quem administra os acessos."
      />,
    );
  }

  const structure = data as StructureData | null;
  if (!structure) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const impossible = structure.services.filter(isImpossibleToSchedule);
  const orphaned = structure.services.filter(
    (service) =>
      service.needsRoom &&
      !isImpossibleToSchedule(service) &&
      roomsFor(structure, service).length === 0,
  );

  if (structure.rooms.length === 0 && structure.services.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Unidade sem estrutura cadastrada"
        description="Sala e serviço são o que a agenda precisa para marcar alguma coisa. Enquanto não houver os dois, nenhum horário pode ser aberto aqui."
      />,
      structure,
    );
  }

  return wrap(
    context,
    <div className="space-y-4">
      {impossible.length > 0 && (
        <Notice
          tone="danger"
          title={`${impossible.length} ${impossible.length === 1 ? "serviço não pode" : "serviços não podem"} ser agendado em lugar nenhum`}
        >
          {impossible.map((service) => service.name).join(", ")} exige sala e não declara nenhum
          tipo aceito. O cadastro aceita a combinação, e quem descobre é a recepção, na hora de
          marcar.
        </Notice>
      )}

      {orphaned.length > 0 && (
        <Notice
          tone="warn"
          title={`${orphaned.length} ${orphaned.length === 1 ? "serviço sem sala" : "serviços sem sala"} disponível nesta unidade`}
        >
          {orphaned.map((service) => service.name).join(", ")} precisa de um tipo de sala que
          nenhuma sala ativa daqui oferece. É falta de sala, não erro de cadastro.
        </Notice>
      )}

      {/* --------------------------------------------------------- salas */}
      <Card as="section">
        <CardHeader
          title="Salas"
          hint={`${structure.rooms.filter((room) => room.active).length} de ${structure.rooms.length} ativas`}
        />
        <div className="px-5 py-5">
          {structure.rooms.length === 0 ? (
            <p className="m-0 text-[0.9375rem] text-navy">Nenhuma sala cadastrada nesta unidade.</p>
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
              {structure.rooms.map((room) => (
                <li key={room.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[0.9375rem] font-semibold text-navy">{room.name}</span>
                  <Chip tone={room.roomType === "motricity" ? "info" : "neutral"}>
                    {capitalize(roomTypeLabel(room.roomType))}
                  </Chip>
                  <span className="text-[0.875rem] text-navy">
                    {room.capacity} {room.capacity === 1 ? "lugar" : "lugares"}
                  </span>
                  {room.areaName && (
                    <span className="text-[0.8125rem] text-[var(--fg-2)]">{room.areaName}</span>
                  )}
                  {!room.active && (
                    <Chip tone="danger">
                      Inativa{room.deactivationDate ? ` desde ${br(room.deactivationDate)}` : ""}
                    </Chip>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* ------------------------------------------------------ serviços */}
      <Card as="section">
        <CardHeader title="Serviços" hint={`${structure.services.length} cadastrados`} />
        <div className="space-y-3 px-5 py-5">
          {structure.services.map((service) => (
            <ServiceRow key={service.id} service={service} structure={structure} />
          ))}
        </div>
      </Card>

      {/* ----------------------------------------------------- bloqueios */}
      <Card as="section">
        <CardHeader
          title="Bloqueios de agenda"
          hint="Três origens, três saídas diferentes para quem tenta marcar"
        />
        <div className="px-5 py-5">
          {structure.blockings.length === 0 ? (
            <p className="m-0 text-[0.9375rem] text-navy">Nenhum bloqueio cadastrado.</p>
          ) : (
            <ul className="m-0 list-none space-y-3 p-0">
              {structure.blockings.map((blocking) => (
                <BlockingRow key={blocking.id} blocking={blocking} locale={locale} />
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>,
    structure,
  );
}

function ServiceRow({ service, structure }: { service: Service; structure: StructureData }) {
  const effects = serviceEffects(service, structure);
  const impossible = isImpossibleToSchedule(service);

  return (
    <article
      className={`rounded-field border px-4 py-3.5 ${
        impossible ? "border-danger-fg/35 bg-danger-bg" : "border-[var(--border-soft)]"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="m-0 text-[0.9375rem] font-semibold text-navy">{service.name}</h3>
        <span className="text-[0.8125rem] text-[var(--fg-2)]">{service.durationInMinutes} minutos</span>
        {service.tussCode && (
          <span className="font-mono text-[0.8125rem] text-[var(--fg-2)]">TUSS {service.tussCode}</span>
        )}
        {skipsCheckin(service) && <Chip tone="info">Não cobrável</Chip>}
      </div>

      {service.needsRoom && service.roomTypes.length > 0 && (
        <p className="m-0 mt-1 text-[0.875rem] text-navy">
          Precisa de sala {service.roomTypes.map(roomTypeLabel).join(" ou ")}.
        </p>
      )}

      <ul className="m-0 mt-2 list-disc space-y-0.5 pl-5 text-[0.875rem] text-navy">
        {effects.map((effect) => (
          <li key={effect}>{effect}</li>
        ))}
      </ul>
    </article>
  );
}

function BlockingRow({
  blocking,
  locale,
}: {
  blocking: Blocking;
  locale: string | undefined;
}) {
  const message = blockingMessage(blocking);

  return (
    <li className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">{message.title}</span>
        <Chip tone={scopeTone(blocking.scope)}>{scopeLabel(blocking.scope)}</Chip>
        <Chip tone="neutral">{blockingTypeLabel(blocking.blockingType)}</Chip>
      </div>
      <p className="m-0 mt-1 text-[0.8125rem] text-[var(--fg-2)]">
        De {formatDateTime(blocking.start, locale)} a {formatDateTime(blocking.end, locale)}
      </p>
      {/* A saída, e não só o motivo: é o que distingue as três origens. */}
      <p className="m-0 mt-1 text-[0.875rem] font-semibold text-navy">{message.exit}</p>
    </li>
  );
}

function scopeLabel(scope: Blocking["scope"]): string {
  return { unit: "Unidade", professional: "Profissional", general: "Calendário" }[scope];
}

function scopeTone(scope: Blocking["scope"]) {
  return ({ unit: "warn", professional: "pending", general: "info" } as const)[scope];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function br(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  structure?: StructureData,
) {
  return (
    <AppShell
      context={context}
      title="Estrutura da unidade"
      subtitle={structure ? structure.unit.name : undefined}
      breadcrumb={[{ label: "Estrutura" }]}
    >
      {children}
    </AppShell>
  );
}
