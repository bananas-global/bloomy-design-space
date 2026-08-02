import type { Handover as Troca, HandoverData } from "../contracts/index.js";
import type { ScreenProps } from "@brucesantos/design-space";
import { formatTime } from "../contracts/index.js";
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
  UNREACHABLE_MESSAGE,
  previousProfessionalNotTold,
  previousProfessionalTold,
  takesTheRefusalBranch,
  whatTheScreenShows,
} from "../rules/handover.js";

/**
 * Assumir o agendamento de outro profissional.
 *
 * A troca roda dentro de uma transação. O ramo que recusa devolve erro **sem**
 * desfazer nada, então a troca acontece de qualquer jeito — e como não há
 * `Repo.rollback`, a transação sempre devolve sucesso e o erro nunca chega à
 * tela.
 *
 * Três decisões desta tela:
 *
 * 1. **O que a tela diz hoje aparece junto do que aconteceu.** “Atendimento
 *    assumido” é verdade nos dois ramos; o que muda é se alguém foi avisado. É
 *    a comparação que revela o que falta na mensagem.
 *
 * 2. **A pessoa que não está olhando a tela é nomeada.** O silêncio cai sobre
 *    quem perdeu o atendimento, e o produto inteiro conversa com quem assumiu.
 *
 * 3. **A mensagem morta aparece entre aspas, marcada como inalcançável.** Ela
 *    existe no código, é boa, e não tem caminho até ninguém.
 */
export function Handover({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as trocas" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const dados = data as HandoverData | null;
  if (!dados) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (dados.handovers.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhuma troca de responsável"
        description="Quando alguém assume o atendimento de outro profissional, a troca aparece aqui com o que foi avisado."
      />,
    );
  }

  const semAviso = previousProfessionalNotTold(dados);
  const comAviso = previousProfessionalTold(dados);

  return wrap(
    context,
    <div className="space-y-4">
      {semAviso.length > 0 && (
        <Notice
          tone="danger"
          title={`${semAviso.length} ${semAviso.length === 1 ? "profissional perdeu um atendimento e não foi avisado" : "profissionais perderam atendimentos e não foram avisados"}`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {semAviso.map((troca) => (
              <li key={troca.id}>
                {troca.previousProfessional} — {troca.patientName}, às{" "}
                {formatTime(troca.scheduleStart, locale)}, agora é de {troca.newProfessional}.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2 max-w-[68ch]">
            {/* O efeito que uma pessoa sente, e não o mecanismo. */}
            Quem perdeu o atendimento pode estar a caminho, pode ter preparado material, tem o
            paciente na cabeça. A informação que faltou não é sobre o sistema: é que outro
            profissional está com o atendimento dele daqui a pouco.
          </p>
          <p className="m-0 mt-2 max-w-[68ch]">
            E quem assumiu recebeu{" "}
            <span className="font-semibold">“{whatTheScreenShows(semAviso[0]!)}”</span>, igual às
            outras trocas. Nada distingue as duas situações na tela.
          </p>
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title="Trocas de responsável"
          hint={`${dados.handovers.length} no total · ${comAviso.length} com aviso`}
        />
        <div className="px-5 py-5">
          <ul className="m-0 list-none space-y-2 p-0">
            {dados.handovers.map((troca) => (
              <li key={troca.id}>
                <Row handover={troca} locale={locale} />
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {semAviso.length > 0 && (
        <Notice tone="warn" title="A frase que explicaria isso existe e não tem caminho">
          <p className="m-0 max-w-[68ch]">
            O código escreve <span className="font-semibold">“{UNREACHABLE_MESSAGE}”</span> para
            este caso, e a tela tem um tratamento pronto para mostrá-la. Nenhum dos dois roda: a
            troca comita, o resultado é sucesso, e a frase fica onde está.
          </p>
          <p className="m-0 mt-2 max-w-[68ch]">
            São duas mortes na mesma linha — a mensagem que não chega e o tratamento que não
            executa. Vale dizer junto, porque consertar só um lado piora: fazer o erro chegar à tela
            avisaria que a troca falhou, e ela não falhou.
          </p>
        </Notice>
      )}
    </div>,
  );
}

function Row({ handover, locale }: { handover: Troca; locale: string | undefined }) {
  const semAviso = takesTheRefusalBranch(handover);

  return (
    <article className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">{handover.patientName}</span>
        <span className="text-[0.875rem] text-navy">{handover.serviceName}</span>
        <span className="text-[0.8125rem] text-[var(--fg-2)]">
          {formatTime(handover.scheduleStart, locale)}
        </span>
        {/* A troca é dita como fato nos dois casos: é o eixo do achado. */}
        <Chip tone="info">troca feita</Chip>
        <Chip tone={semAviso ? "danger" : "ok"}>
          {semAviso ? "o anterior não foi avisado" : "o anterior foi avisado"}
        </Chip>
      </div>
      <p className="m-0 mt-1.5 text-[0.8125rem] text-[var(--fg-2)]">
        de {handover.previousProfessional} para {handover.newProfessional}
      </p>
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Trocas de responsável"
      subtitle="A troca acontece nos dois ramos; o aviso, não"
      breadcrumb={[{ label: "Agenda", path: "/agenda" }, { label: "Trocas de responsável" }]}
    >
      {children}
    </AppShell>
  );
}
