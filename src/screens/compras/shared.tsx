/**
 * Peças comuns às telas de compras: a moldura do backoffice com o item Compras,
 * o cabeçalho de etapa e o histórico.
 *
 * Feito na tela, sem equivalente no Phoenix (componente novo para o dev): o
 * cabeçalho de etapa, com os seis passos e quem está com a solicitação agora.
 */
import type { ReactNode } from "react";
import type { ScenarioContext } from "@brucesantos/design-space";
import { Icon } from "../../components/Icon.js";
import { Avatar, LoadingCard, TimelineList } from "../../components/Layout.js";
import type { UserNotification } from "../../components/Notification.js";
import type { BreadcrumbItem } from "../../components/BackofficeComponents.js";
import { Button } from "../../components/Button.js";
import { DrawerModal } from "../../components/Overlay.js";
import { Tag } from "../../components/Tag.js";
import { BackofficeLayout } from "../../layouts/BackofficeLayout.js";
import type { ComprasFixture } from "./fixtures.js";
import { dadosDe, useCompras } from "./store.js";
import { ETAPAS, PAPEIS, PASSOS, USUARIO, br, ha, responsavel, type Evento, type Papel, type Solicitacao } from "./model.js";

export const BASE = "/backoffice/compras";

/** A visão do protótipo vem do controle `papel`. */
export function papelDe(context: ScenarioContext, fallback: Papel = "requisitante"): Papel {
  const p = context.controls.papel as Papel | undefined;
  return p && p in PAPEIS ? p : fallback;
}

/**
 * O `context` com a navegação que leva a visão junto. O motor não carrega os
 * controles de uma tela para a outra: sem isso, a terapeuta que abre a própria
 * solicitação passaria a ver a tela como Compras.
 */
export function comVisao(context: ScenarioContext, papel: Papel): ScenarioContext {
  return {
    ...context,
    navigate: (to, options) => context.navigate(to, { ...options, controls: { papel, ...options?.controls } }),
  };
}

/** O controle de papel, comum às telas. */
export const PAPEL_CONTROL = (defaultValue: Papel) => ({
  id: "papel",
  label: "Visão de",
  default: defaultValue,
  options: (Object.keys(PAPEIS) as Papel[]).map((p) => ({ value: p, label: `${PAPEIS[p].label} · ${USUARIO[p].nome}` })),
});

/** RF-12: o que cada papel recebe no sino. */
const NOTIFICACOES: Record<Papel, UserNotification[]> = {
  requisitante: [
    { id: "r1", title: "Confirme a chegada", content: "Blocos de encaixe grandes (SC-0141) foram entregues na Unidade Jardim. Chegou tudo certo?", insertedAt: "há 1 hora", onClickUrl: `${BASE}/SC-0141` },
    { id: "r2", title: "Solicitação devolvida para ajuste", content: "Marina Alves devolveu Cadeira infantil (SC-0154): informe o modelo.", insertedAt: "há 4 dias", onClickUrl: `${BASE}/SC-0154` },
    { id: "r3", title: "Pedido em aprovação", content: "Mesa de atividades infantil (SC-0147) está com o Financeiro.", insertedAt: "há 7 dias", readAt: "08/10/2026 14:10" },
  ],
  aprovador: [
    { id: "a1", title: "Nova solicitação para aprovar", content: "Juliana Prado pediu Massinha de modelar atóxica, 12 potes (SC-0156).", insertedAt: "há 20 horas", onClickUrl: `${BASE}/SC-0156` },
    { id: "a2", title: "Nova solicitação para aprovar", content: "Bruno Lacerda pediu Cronômetro visual 20 cm, 2 unidades (SC-0155).", insertedAt: "há 2 dias", onClickUrl: `${BASE}/SC-0155` },
  ],
  comprador: [
    { id: "c1", title: "Nota recebida", content: "Nota 45.902 de Sensorial Brasil para o pedido PC-000318.", insertedAt: "ontem", onClickUrl: `${BASE}/SC-0144` },
    { id: "c2", title: "Pedido aprovado", content: "PC-000321 (Papel sulfite A4) saiu aprovado na sua alçada. Confirme com o fornecedor.", insertedAt: "há 2 dias", onClickUrl: `${BASE}/SC-0145` },
    { id: "c3", title: "Nova solicitação na fila", content: "Bolhas de sabão, refil 1 L (SC-0157) foi aprovada pela Unidade Girassol.", insertedAt: "há 3 dias", readAt: "12/10/2026 15:02" },
  ],
  financeiro: [
    { id: "f1", title: "Pedido aguarda sua aprovação", content: "PC-000322 · Mesa de atividades infantil · R$ 4.890,00, acima do limite de Compras.", insertedAt: "há 7 dias", onClickUrl: `${BASE}/SC-0147` },
  ],
  cfo: [
    { id: "o1", title: "Pedido aguarda sua aprovação", content: "PC-000320 · Kit de circuito psicomotor · R$ 12.750,00, acima do limite do Financeiro.", insertedAt: "há 9 dias", onClickUrl: `${BASE}/SC-0146` },
  ],
};

export function ComprasShell({
  context,
  papel,
  breadcrumbs,
  children,
}: {
  context: ScenarioContext;
  papel: Papel;
  breadcrumbs: BreadcrumbItem[];
  children: (data: ComprasFixture) => ReactNode;
}) {
  const data = dadosDe(context);
  const base = useCompras(context);
  const user = USUARIO[papel];
  // Os avisos da sessão (RF-12) vêm antes dos da fixture.
  const avisos = [...(base?.avisos.filter((a) => a.para === papel) ?? []), ...NOTIFICACOES[papel]];
  return (
    <BackofficeLayout
      context={comVisao(context, papel)}
      currentPath={BASE}
      breadcrumbs={breadcrumbs}
      currentUser={{ name: user.nome, units: user.unidades, roles: [PAPEIS[papel].label] }}
      notifications={avisos}
      extraMenuItems={[{ to: BASE, title: "Compras", icon: "fa-cart-shopping" }]}
    >
      {/* Cabeçalho do backoffice fixo: o `sticky` do layout fica no `div` de dentro
          do `<header>`, que tem a mesma altura e não deixa grudar. O espaço da barra de
          rolagem fica reservado, para filtrar não mudar a largura da tabela. */}
      <style>{"#main-content > header{position:sticky;top:0;z-index:45} html{scrollbar-gutter:stable}"}</style>
      {data ? children(data) : <LoadingCard message={context.error ? "Não foi possível carregar as compras." : "Carregando as compras…"} />}
    </BackofficeLayout>
  );
}

export function EtapaTag({ s }: { s: Solicitacao }) {
  const e = ETAPAS[s.etapa];
  return <Tag item={e.label} variant={e.tone} pill />;
}

/** "Com Marina Alves (Coordenação) há 2 dias", ou "Encerrada em …". */
export function ComQuem({ s, compact = false }: { s: Solicitacao; compact?: boolean }) {
  const r = responsavel(s);
  if (!r) return <span className="text-brand-purple-dark/60">{compact ? "—" : `Encerrada em ${br(s.desde)}`}</span>;
  return (
    <span>
      <span className="font-bold text-brand-purple-dark">{r.nome}</span>
      <span className="text-brand-purple-dark/60"> · {r.cargo}{compact ? "" : `, ${ha(s.desde)}`}</span>
    </span>
  );
}

/**
 * Profissional responsável como o Bloomy mostra em tabela (`render_responsible`
 * em `management/index.ex` e vizinhos): `avatar` de 28px, nome em negrito e o
 * cargo embaixo. No monólito é markup repetido em cada tela, não componente.
 */
export function Responsavel({ s }: { s: Solicitacao }) {
  const r = responsavel(s);
  if (!r) return <span>-</span>;
  return (
    <div className="flex items-center gap-3">
      <Avatar size="custom" className="h-7 w-7" />
      <div>
        <p className="font-bold">{r.nome}</p>
        <p>{r.cargo}</p>
      </div>
    </div>
  );
}

/**
 * O cabeçalho de etapa: os seis passos do fluxo, o atual em destaque, e quem
 * está com a solicitação agora. Toda tela da solicitação mostra os dois.
 */
export function EtapaHeader({ s }: { s: Solicitacao }) {
  const e = ETAPAS[s.etapa];
  const fim = s.etapa === "concluida";
  const parada = e.encerrada && !fim;
  return (
    <div>
      <p className="md:hidden mb-2 text-sm font-bold text-brand-purple-dark">
        {fim ? "Concluída" : `Passo ${e.passo + 1} de ${PASSOS.length} · ${PASSOS[e.passo]}`}
      </p>
      <ol className="flex items-start gap-1">
        {PASSOS.map((passo, i) => {
          const done = i < e.passo || fim;
          const current = i === e.passo && !fim;
          return (
            <li key={passo} className="flex-1 min-w-0">
              <div
                className={[
                  "h-1.5 rounded-full",
                  done ? "bg-green" : current ? (parada ? "bg-red" : "bg-brand-blue") : "bg-brand-purple-dark/10",
                ].join(" ")}
              />
              <p
                className={[
                  "mt-2 text-xs hidden md:flex items-center gap-1",
                  current ? "font-bold text-brand-purple-dark" : done ? "text-brand-purple-dark/80" : "text-brand-purple-dark/40",
                ].join(" ")}
              >
                {done && <Icon name="fa-check" className="text-green" />}
                {current && parada && <Icon name="fa-xmark" className="text-red" />}
                {passo}
              </p>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <EtapaTag s={s} />
        {responsavel(s) ? (
          <span className="flex items-center gap-1.5 text-brand-purple-dark/80">
            <Icon name="fa-user-clock" className="text-brand-purple-dark/40" />
            Com <ComQuem s={s} />
          </span>
        ) : (
          <span className="text-brand-purple-dark/60">Encerrada em {br(s.desde)}</span>
        )}
      </div>
    </div>
  );
}

/** RN-11: quem, quando e motivo de cada decisão, do mais novo ao mais antigo. */
export function Historico({ eventos }: { eventos: Evento[] }) {
  return (
    <TimelineList
      item={eventos.map((e) => ({
        icon: e.icon,
        color: e.color ?? "blue",
        children: (
          <div className="-mt-0.5">
            <p className="text-sm font-bold text-brand-purple-dark">{e.acao}</p>
            <p className="text-xs text-brand-purple-dark/60">
              {e.quem.nome} · {e.quem.cargo} · {br(e.quando)}
            </p>
            {e.motivo && (
              <p className="mt-2 text-sm text-brand-purple-dark/80 bg-brand-purple-dark/5 rounded-lg px-3 py-2">“{e.motivo}”</p>
            )}
          </div>
        ),
      }))}
    />
  );
}

/** Uma linha rótulo · valor dos resumos. */
export function Dado({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold text-brand-purple-dark/50">{label}</dt>
      <dd className="mt-0.5 text-brand-purple-dark">{children}</dd>
    </div>
  );
}

/** Aviso dentro de um cartão: motivo de reprovação, devolução, alçada. */
export function Aviso({
  tone,
  icon,
  title,
  children,
}: {
  tone: "red" | "orange" | "blue" | "green" | "yellow";
  icon: string;
  title: string;
  children?: ReactNode;
}) {
  const cls = {
    red: "bg-red-light text-red-dark",
    orange: "bg-brand-orange/20 text-orange-dark",
    blue: "bg-blue-light text-blue-dark",
    green: "bg-brand-green/20 text-brand-green-dark",
    // Amarelo só no contorno e no ícone: preenchido, o aviso pesa demais.
    yellow: "bg-white border border-yellow text-brand-purple-dark",
  }[tone];
  return (
    <div className={`rounded-xl p-4 flex gap-3 ${cls}`}>
      <Icon name={icon} type="solid" className={tone === "yellow" ? "mt-0.5 text-yellow-dark" : "mt-0.5"} />
      <div className="text-sm">
        <p className="font-bold">{title}</p>
        {children && <div className={tone === "yellow" ? "mt-1 text-brand-purple-dark/80" : "mt-1"}>{children}</div>}
      </div>
    </div>
  );
}

/**
 * O drawer de formulário das telas de compras: cadastrar, devolver, reprovar,
 * pedir nova cotação. `drawer_modal` com os cantos retos e o rodapé fixo
 * (Cancelar à esquerda, a ação à direita), ajustes desta feature.
 */
export function FormDrawer({
  id,
  title,
  show = true,
  size = "max-w-xl",
  cancelLabel = "Cancelar",
  actions,
  onCancel,
  children,
}: {
  id: string;
  title: string;
  show?: boolean;
  /** Largura máxima do drawer (classe `max-w-*`). */
  size?: string;
  cancelLabel?: string;
  /** Os botões à direita do rodapé. */
  actions?: ReactNode;
  onCancel: () => void;
  children: ReactNode;
}) {
  return (
    <DrawerModal id={id} show={show} title={title} variant="custom" customSize={`${size} rounded-l-none!`} contentClass="flex flex-col p-0!" onCancel={onCancel}>
      <div className="flex-1 space-y-8 p-6">{children}</div>
      <div className="sticky bottom-0 border-t border-neutral-100 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </div>
    </DrawerModal>
  );
}
