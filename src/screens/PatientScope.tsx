import type { PatientScopeData, ScopeRule } from "../contracts/index.js";
import type { ScreenProps } from "@brucesantos/design-space";
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
  contradictory,
  raises,
  reachLabel,
  rolesCovered,
  seesEverything,
  seesNobody,
} from "../rules/patientScope.js";

/**
 * Escopo de pacientes por papel.
 *
 * Quem vê quais pacientes é a decisão de maior consequência do sistema, e ela
 * mora em `PatientPolicy.scope/2` — cláusulas casadas na ordem em que estão
 * escritas.
 *
 * Três decisões desta tela:
 *
 * 1. **O alcance é dito em pessoas, não em consulta.** “Filtra por
 *    `patient_units`” não diz a ninguém quem aparece. “Todos os pacientes da
 *    unidade” diz, e é o que permite alguém discordar.
 *
 * 2. **As duas leituras do papel contraditório ficam lado a lado.** O problema
 *    não é qual regra vale, é que o código afirma as duas — e isso só aparece
 *    quando as duas estão visíveis juntas.
 *
 * 3. **O comportamento seguro é marcado como acerto.** Um papel sem cláusula
 *    derruba a tela em vez de mostrar tudo. Sem dizer que isso é proposital, a
 *    correção intuitiva transformaria um erro barulhento num vazamento.
 */
export function PatientScope({ context }: ScreenProps) {
  const { data, isLoading, error } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando os escopos" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const escopo = data as PatientScopeData | null;
  if (!escopo) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (escopo.rules.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhum escopo definido"
        description="Esta tela mostra quais pacientes cada papel enxerga, e como essa decisão está escrita."
      />,
    );
  }

  const contraditorios = contradictory(escopo);
  const veTudo = seesEverything(escopo);
  const veNada = seesNobody(escopo);
  const derruba = raises(escopo);

  return wrap(
    context,
    <div className="space-y-4">
      {contraditorios.length > 0 && (
        <Notice tone="danger" title="O código afirma duas regras diferentes para o mesmo papel">
          {contraditorios.map((regra) => (
            <div key={regra.id}>
              <p className="m-0 max-w-[68ch]">
                <span className="font-semibold">{regra.role}</span> — o que acontece:{" "}
                {reachLabel(regra)}. {regra.effective}
              </p>
              <p className="m-0 mt-1 max-w-[68ch]">
                O que o código também diz, numa parte que não chega a rodar: {regra.shadowed}
              </p>
            </div>
          ))}
          <p className="m-0 mt-2 max-w-[68ch]">
            As duas regras são defensáveis, e a diferença entre elas é grande. O problema não é qual
            foi escolhida — é que quem for conferir o alcance de acesso, numa auditoria ou numa
            dúvida sobre sigilo, pode ler a parte errada e concluir o oposto.
          </p>
        </Notice>
      )}

      {veNada.length > 0 && (
        <Notice tone="warn" title="“Nenhum paciente” está escrito como uma condição impossível">
          <p className="m-0 max-w-[68ch]">
            {veNada.map((r) => r.role).join(", ")} não enxerga paciente nenhum, e essa é a decisão
            certa. Ela está escrita como uma busca por identificador nulo — o resultado é o
            esperado, e a intenção precisa ser deduzida.
          </p>
          <p className="m-0 mt-2 max-w-[68ch]">
            A diferença importa: “quisemos zero” é para manter, “a condição está errada” é para
            consertar. Na dúvida ninguém mexe, e a regra sobrevive sem nunca ter sido confirmada.
          </p>
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title="Quem enxerga quais pacientes"
          hint={`${rolesCovered(escopo)} papéis com regra própria`}
        />
        <div className="px-5 py-5">
          <ul className="m-0 list-none space-y-2 p-0">
            {escopo.rules.map((regra) => (
              <li key={regra.id}>
                <Row rule={regra} />
              </li>
            ))}
          </ul>
          {veTudo.length > 0 && (
            <p className="m-0 mt-3 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
              {veTudo.length === 1 ? "Um grupo enxerga" : `${veTudo.length} grupos enxergam`} a base
              inteira, sem filtro nenhum. É uma decisão, e vale ser revista de tempos em tempos —
              não porque esteja errada, mas porque foi tomada uma vez e vale a cada papel novo que
              entra na lista.
            </p>
          )}
        </div>
      </Card>

      {derruba.length > 0 && (
        <Notice tone="ok" title="Um papel sem regra derruba a tela, e isso está certo">
          <p className="m-0 max-w-[68ch]">
            Não há um caso final que devolva todos os pacientes. Um papel novo, ainda não previsto,
            faz a tela não abrir — o que é barulhento, visível e imediato.
          </p>
          <p className="m-0 mt-2 max-w-[68ch]">
            {/* Dito como acerto de propósito: a correção intuitiva é a perigosa. */}
            A correção intuitiva seria acrescentar um caso final. Ela transformaria este erro
            barulhento num vazamento silencioso: o papel novo passaria a ver a base inteira sem que
            ninguém tivesse decidido isso. Vale manter como está.
          </p>
        </Notice>
      )}
    </div>,
  );
}

function Row({ rule }: { rule: ScopeRule }) {
  return (
    <article className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">{rule.role}</span>
        {/* O alcance em pessoas, que é o que permite alguém discordar. */}
        <Chip
          tone={
            rule.shape === "all"
              ? "warn"
              : rule.shape === "raises"
                ? "ok"
                : rule.shape === "empty"
                  ? "neutral"
                  : "info"
          }
        >
          {reachLabel(rule)}
        </Chip>
        {rule.shadowed && <Chip tone="danger">o código diz outra coisa em outro ponto</Chip>}
      </div>
      <p className="m-0 mt-1.5 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
        {rule.effective}
      </p>
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Quem enxerga quais pacientes"
      subtitle="A decisão de maior consequência, e onde ela se contradiz"
      breadcrumb={[{ label: "Equipe", path: "/team" }, { label: "Escopo de pacientes" }]}
    >
      {children}
    </AppShell>
  );
}
