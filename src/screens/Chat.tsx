import { useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type { ChatData, ChatMessage } from "../contracts/index.js";
import { formatDateTime } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { PatientPageFrame } from "../components/PatientPageFrame.js";
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
  canReadChat,
  canSend,
  inOrder,
  mentionsOfCurrentUser,
  mentionsWithoutAccess,
  participatingRoles,
} from "../rules/chat.js";

/**
 * Chat multidisciplinar.
 *
 * A tentação é tratá-lo como recurso secundário — um mensageiro embutido. Ele
 * não é: é o único lugar em que profissionais de especialidades diferentes
 * coordenam um caso por escrito, e o schema deixa isso claro. Mensagem tem
 * conteúdo, autor e paciente, e nenhum campo de edição ou exclusão.
 *
 * Duas decisões seguem daí:
 *
 * 1. **O aviso de permanência vem antes do envio.** Descobrir depois que não dá
 *    para corrigir é a pior hora de descobrir. Não é um pedido de confirmação —
 *    é uma frase ao lado do campo.
 *
 * 2. **A tela avisa quando uma menção não vai chegar a lugar nenhum.** O sistema
 *    real notifica e a tela da pessoa não abre. Quem escreveu delega uma tarefa
 *    para alguém que não consegue lê-la, e só descobre quando cobra.
 */
export function Chat({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;
  const [draft, setDraft] = useState("");

  if (isLoading) return wrap(context, <LoadingState label="Carregando a conversa" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const chat = data as ChatData | null;
  if (!chat) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const access = canReadChat(chat.currentUser.role);
  if (!access.allowed) {
    return wrap(
      context,
      <EmptyState title="Você não alcança o chat deste caso" description={access.reason!} />,
      chat,
    );
  }

  const messages = inOrder(chat);
  const mine = mentionsOfCurrentUser(chat);
  const roles = participatingRoles(chat);
  const unreachable = mentionsWithoutAccess(draft, chat.directory);
  const send = canSend(draft);

  return wrap(
    context,
    <div className="mx-auto max-w-[52rem] space-y-4">
      {chat.currentUser.role === "applicator" && (
        <Notice tone="info" title="Este é o seu canal escrito deste caso">
          Seu perfil não alcança programa, protocolo nem prontuário. O que você observa na aplicação
          entra no caso por aqui — e é essa observação que costuma antecipar a mudança de conduta.
        </Notice>
      )}

      {mine.length > 0 && (
        <Notice tone="pending" title={`Você foi mencionado em ${mine.length === 1 ? "uma mensagem" : `${mine.length} mensagens`}`}>
          Menção notifica, e é só isso: quem menciona não te dá acesso a nada além do que você já
          alcança.
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title={`Conversa sobre ${chat.patient.name}`}
          hint={
            roles.length > 0
              ? `${roles.length} ${roles.length === 1 ? "especialidade" : "especialidades"} participando`
              : undefined
          }
        />
        <div className="px-5 py-5">
          {messages.length === 0 ? (
            <p className="m-0 max-w-[60ch] text-[0.9375rem] text-navy">
              Nenhuma mensagem ainda. É aqui que a equipe registra o que observa e combina conduta —
              e é consultável meses depois, quando alguém pergunta por que algo mudou.
            </p>
          ) : (
            <ol className="m-0 list-none space-y-4 p-0">
              {messages.map((message) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  currentUsername={chat.currentUser.username}
                  locale={locale}
                />
              ))}
            </ol>
          )}
        </div>
      </Card>

      {/* -------------------------------------------------------- escrever */}
      <Card as="section">
        <CardHeader title="Escrever" />
        <div className="px-5 py-5">
          <label htmlFor="mensagem" className="block text-[0.9375rem] font-semibold text-navy">
            Nova mensagem
          </label>
          <textarea
            id="mensagem"
            rows={4}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-describedby="mensagem-permanencia"
            className="mt-2 w-full rounded-field border border-[var(--border-strong)] bg-surface px-4 py-3 text-[0.9375rem] text-navy"
          />

          {/* Antes do envio, não depois: descobrir que não dá para corrigir
              quando já não dá é a pior hora de descobrir. */}
          <p id="mensagem-permanencia" className="m-0 mt-1.5 max-w-[60ch] text-[0.8125rem] text-[var(--fg-2)]">
            O que for enviado não pode ser editado nem apagado. É registro de coordenação clínica, e
            alguém vai consultá-lo meses depois.
          </p>

          {unreachable.length > 0 && (
            <div className="mt-3">
              <Notice tone="warn" title="Menção que não vai chegar" level={3}>
                <ul className="m-0 list-disc space-y-0.5 pl-5">
                  {unreachable.map((item) => (
                    <li key={item.username}>
                      <span className="font-mono">@{item.username}</span> — {item.reason}. A
                      notificação sai e a tela não abre para essa pessoa.
                    </li>
                  ))}
                </ul>
              </Notice>
            </div>
          )}

          <div className="mt-3">
            <Button
              id="enviar-mensagem"
              variant="primary"
              unavailableReason={send.allowed ? undefined : send.reason}
            >
              Enviar
            </Button>
          </div>
        </div>
      </Card>
    </div>,
    chat,
  );
}

function MessageRow({
  message,
  currentUsername,
  locale,
}: {
  message: ChatMessage;
  currentUsername: string;
  locale: string | undefined;
}) {
  const mentionsMe = message.mentions.includes(currentUsername);

  return (
    <li
      className={`rounded-card border px-4 py-3 ${
        mentionsMe ? "border-pending-fg/35 bg-pending-bg" : "border-[var(--border-soft)]"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-bold text-navy">{message.authorName}</span>
        {/* O papel do autor aparece porque a mesma frase pesa diferente vinda
            de quem supervisiona e de quem aplica. */}
        <Chip tone="neutral">{message.authorRole}</Chip>
        <span className="text-[0.8125rem] text-[var(--fg-2)]">
          {formatDateTime(message.at, locale)}
        </span>
        {mentionsMe && <Chip tone="pending">Mencionou você</Chip>}
      </div>
      <p className="m-0 mt-1.5 max-w-[64ch] text-[0.9375rem] leading-relaxed text-navy">
        {message.content}
      </p>
    </li>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode, chat?: ChatData) {
  return (
    <AppShell
      context={context}
      title="Chat multidisciplinar"
      subtitle={chat?.patient.name}
      breadcrumb={[{ label: "Pacientes", path: "/patients" }, { label: "Chat" }]}
      showPageHeading={false}
    >
      {chat ? <PatientPageFrame patientName={chat.patient.name} active="Conteúdos" secondary={["Conteúdos","Feed"]}>{children}</PatientPageFrame> : children}
    </AppShell>
  );
}
