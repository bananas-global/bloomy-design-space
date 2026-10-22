/**
 * Gestão de Contratos — a moldura do módulo e as peças que as telas repetem.
 *
 * Feito na tela, sem equivalente no Phoenix (componente novo para o dev): a
 * navegação do módulo, a folha A4, as etiquetas de filtro, o valor mascarado,
 * o cartão de indicador e o aviso de governança. O resto é `backoffice`,
 * `card`, `tag`, `button` e `header`.
 */
import { useState, type ReactNode } from "react";
import type { ControlGroup, ScenarioContext } from "@brucesantos/design-space";
import { showToast } from "../../components/Action.js";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { Icon } from "../../components/Icon.js";
import { cx } from "../../components/Input.js";
import { Header, LoadingCard } from "../../components/Layout.js";
import { Tag, type TagVariant } from "../../components/Tag.js";
import type { BreadcrumbItem } from "../../components/BackofficeComponents.js";
import { BackofficeLayout } from "../../layouts/BackofficeLayout.js";
import { CONTRATOS_FIXTURES } from "./fixtures.js";
import { MASCARA, PAPEIS, TODAY, brl, type ContratosData, type Papel } from "./model.js";

const CARTEIRA_EXEMPLO = CONTRATOS_FIXTURES[0]!.data as ContratosData;

/* ------------------------------------------------------------------ */
/* Rotas                                                               */
/* ------------------------------------------------------------------ */

const BASE = "/backoffice/contratos";
export const ROTAS = {
  torre: BASE,
  carteira: `${BASE}/carteira`,
  novo: `${BASE}/novo`,
  ficha: `${BASE}/ficha/:id`,
  minutas: `${BASE}/minutas`,
  diff: `${BASE}/minutas/diff`,
  vigencia: `${BASE}/vigencia`,
  dossie: `${BASE}/dossie`,
  cobranca: `${BASE}/cobranca`,
  partes: `${BASE}/partes`,
  tabelas: `${BASE}/tabelas`,
  manual: `${BASE}/manual`,
} as const;
export const fichaDe = (id: string) => ROTAS.ficha.replace(":id", id);

export type Secao = "torre" | "carteira" | "minutas" | "diff" | "vigencia" | "dossie" | "cobranca" | "partes" | "tabelas" | "manual" | "novo" | "ficha";

const NAV: { id: Secao; label: string; icon: string; to: string }[] = [
  { id: "torre", label: "Torre de Controle", icon: "fa-tower-observation", to: ROTAS.torre },
  { id: "carteira", label: "Carteira & Esteira", icon: "fa-folder-open", to: ROTAS.carteira },
  { id: "minutas", label: "Minutas Padrão", icon: "fa-file-lines", to: ROTAS.minutas },
  { id: "diff", label: "Diff Jurídico", icon: "fa-code-compare", to: ROTAS.diff },
  { id: "vigencia", label: "Vigência & Aditivos", icon: "fa-calendar-clock", to: ROTAS.vigencia },
  { id: "dossie", label: "Dossiê", icon: "fa-folder-check", to: ROTAS.dossie },
  { id: "cobranca", label: "Cobrança & ERP", icon: "fa-file-invoice-dollar", to: ROTAS.cobranca },
  { id: "partes", label: "Partes", icon: "fa-handshake", to: ROTAS.partes },
  { id: "tabelas", label: "Tabelas de Apoio", icon: "fa-table-list", to: ROTAS.tabelas },
  { id: "manual", label: "Manual", icon: "fa-book-open", to: ROTAS.manual },
];

/** Rótulo e rota de uma tela do módulo, para o breadcrumb de quem abre a Ficha. */
export const secaoInfo = (secao: string) => NAV.find((n) => n.id === secao);
/** Telas que abrem a Ficha: o controle `origem` da Ficha aceita estes valores. */
export const ORIGENS = NAV.filter((n) => ["torre", "carteira", "diff", "vigencia", "dossie", "cobranca"].includes(n.id)).map((n) => ({ value: n.id, label: n.label }));

/**
 * Abre a Ficha do contrato lembrando de onde veio: o breadcrumb da Ficha volta
 * para essa tela (ex.: Cobrança & ERP › CTR-2026-0003).
 */
export function irFicha(context: ScenarioContext, id: string, origem: Secao) {
  context.navigate(fichaDe(id), { controls: { origem } });
}

/* ------------------------------------------------------------------ */
/* Visão por papel                                                     */
/* ------------------------------------------------------------------ */

/** Controle "Visão por papel", comum às telas do módulo. */
export const papelControl = (padrao: Papel = "diretoria"): ControlGroup => ({
  id: "papel",
  title: "Visão por papel",
  note: "Os papéis do módulo de contratos ainda não existem no Bloomy (ver perguntas abertas: perfis). A visão muda só as ações oferecidas.",
  controls: [{ id: "papel", label: "Papel", default: padrao, options: PAPEIS.map((p) => ({ value: p.id, label: p.label })) }],
});

export const papelDe = (context: ScenarioContext, padrao: Papel = "diretoria") => (context.controls.papel as Papel | undefined) ?? padrao;

/**
 * Menu lateral do protótipo: só o módulo. No Phoenix, "Gestão de Contratos"
 * será um item novo do `backoffice.html.heex` (ver PR).
 */
const MENU_MODULO = [{ to: ROTAS.torre, title: "Gestão de Contratos", icon: "fa-file-contract" }];

const CURRENT_USER = { name: "Marina Alves", units: ["Unidade Jardim", "Unidade Girassol", "Unidade Centro"], roles: ["Admin"], professional: false };
const NOTIFICATIONS = [
  { id: "n1", title: "Contrato aguardando aprovação", content: "CTR-2026-0007 · Instituto Raízes de Educação foi submetido para aprovação.", insertedAt: "há 2 horas" },
  { id: "n2", title: "Erro de envio ao ERP", content: "A NF-e 000.451.902 da Nuvem Clínica não foi sincronizada com o Omie.", insertedAt: "há 1 dia" },
];

/* ------------------------------------------------------------------ */
/* Moldura                                                             */
/* ------------------------------------------------------------------ */

/**
 * Backoffice + cabeçalho do módulo + navegação entre as telas do módulo.
 * O menu lateral do Bloomy ainda não tem o item "Gestão de Contratos": a
 * entrada do módulo é componente novo (ver PR).
 */
export function ContratosShell({
  context,
  secao,
  titulo,
  subtitulo,
  acoes,
  breadcrumbs = [],
  semNav = false,
  foco,
  children,
}: {
  context: ScenarioContext;
  secao: Secao;
  titulo: ReactNode;
  subtitulo?: ReactNode;
  acoes?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  /**
   * Telas de detalhe (Ficha): sem a navegação do módulo nem o cartão de título;
   * o cabeçalho é o da própria tela e a volta é pelo breadcrumb.
   */
  semNav?: boolean;
  /**
   * Página em modo foco (formulários longos): sem o menu lateral nem o
   * cabeçalho do backoffice, só uma barra com o voltar e o título.
   */
  foco?: { voltar: string; rotuloVoltar: string; /** Volta sem trocar de rota (formulário aberto na própria tela). */ onVoltar?: () => void };
  children: (data: ContratosData) => ReactNode;
}) {
  // Tela aberta pela lista, sem cenário, não tem fixture: usa a carteira de exemplo.
  const data = (context.data as ContratosData | undefined) ?? (context.isLoading || context.error ? undefined : CARTEIRA_EXEMPLO);
  const atual = NAV.find((n) => n.id === secao);
  const corpo = data ? (
    children(data)
  ) : (
    <LoadingCard message={context.error ? "Não foi possível carregar os contratos. Tente de novo em instantes." : "Carregando os contratos…"} />
  );
  if (foco) {
    return (
      <BackofficeLayout context={context} hideMenu currentUser={CURRENT_USER}>
        {/* A barra ocupa a largura toda: desfaz o padding do `main` do layout. */}
        <div className="sticky top-0 z-40 -mx-4 -mt-4 mb-6 lg:-mx-8 lg:-mt-8 bg-white shadow-main px-4 lg:px-8 py-4">
          <div className="mx-auto max-w-6xl flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button variant="ghost" leftIcon="fa-arrow-left" onClick={() => (foco.onVoltar ? foco.onVoltar() : context.navigate(foco.voltar, { controls: {} }))}>
              {foco.rotuloVoltar}
            </Button>
            <span className="hidden h-8 w-px bg-brand-purple-dark/10 sm:block" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-brand-purple-dark">{titulo}</h1>
              {subtitulo && <p className="text-sm text-brand-purple-dark/70">{subtitulo}</p>}
            </div>
            {acoes && <div className="flex items-center gap-2">{acoes}</div>}
          </div>
        </div>
        {corpo}
      </BackofficeLayout>
    );
  }
  return (
    <BackofficeLayout
      context={context}
      currentPath={ROTAS.torre}
      menu={MENU_MODULO}
      breadcrumbs={[{ label: "Gestão de Contratos", to: ROTAS.torre }, ...(atual && secao !== "torre" ? [{ label: atual.label, to: atual.to }] : []), ...breadcrumbs]}
      currentUser={CURRENT_USER}
      notifications={NOTIFICATIONS}
    >
      {/* Cabeçalho do backoffice fixo no topo (mesma solução do Padrão de Agenda): o
          `sticky` do layout fica no `div` de dentro do `<header>`, que tem a mesma
          altura e por isso não gruda. */}
      <style>{"#main-content > header{position:sticky;top:0;z-index:45}"}</style>
      <div className="space-y-6">
        {/* Cabeçalho e abas do módulo num cartão só, como o `lazy_tabs` do
            profissional e da unidade: título em cima, abas embaixo. */}
        {!semNav && (
          <Card className="p-0!">
            <div className="p-6">
              <Header subtitle={subtitulo} actions={acoes} className="items-start! md:items-center!">
                {titulo}
              </Header>
            </div>
            <ModuloNav context={context} secao={secao} />
          </Card>
        )}
        {corpo}
      </div>
    </BackofficeLayout>
  );
}

/** As telas do módulo, com a atual destacada. "Novo Contrato" fica no botão. */
function ModuloNav({ context, secao }: { context: ScenarioContext; secao: Secao }) {
  return (
    <nav aria-label="Gestão de Contratos" className="relative w-full flex gap-4 border-t border-brand-purple-dark/10 overflow-y-hidden overflow-x-auto thin-scrollbar pb-1 px-6 select-none">
      {NAV.map((n) => {
        const ativo = n.id === secao || (secao === "ficha" && n.id === "carteira") || (secao === "novo" && n.id === "carteira");
        return (
          <a
            key={n.id}
            href={n.to}
            onClick={(e) => {
              e.preventDefault();
              context.navigate(n.to, { controls: {} });
            }}
            data-active={ativo ? "true" : "false"}
            aria-current={ativo ? "page" : undefined}
            className={cx(
              // As classes do botão de `lazy_tabs`, com o marcador fixo sob a aba ativa.
              "relative font-bold transition-all rounded-md cursor-pointer whitespace-nowrap py-4",
              "data-[active=true]:text-blue-dark text-neutral-400 hover:text-brand-purple-dark/60",
              "data-[active=true]:after:absolute data-[active=true]:after:inset-x-0 data-[active=true]:after:-bottom-1 data-[active=true]:after:h-1 data-[active=true]:after:bg-blue",
            )}
          >
            {n.label}
          </a>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

/** Selo de estado: rótulo, cor e ícone vêm dos mapas de `model.ts`. */
export function Selo({ s, className, title }: { s: { label: string; variant: TagVariant; icon?: string }; className?: string; title?: string }) {
  return <Tag item={s.label} variant={s.variant} leftIcon={s.icon} className={cx("whitespace-nowrap", className)} title={title} />;
}

/**
 * Valor contratado mascarado por padrão (R$ ••••••••). Quem pode revelar ainda
 * está em aberto; no protótipo, o olho revela para qualquer papel.
 */
export function Valor({ valor, revelado: inicial = false, className }: { valor?: number; revelado?: boolean; className?: string }) {
  const [revelado, setRevelado] = useState(inicial);
  if (valor == null) return <span className={cx("italic text-brand-purple-dark/50", className)}>valor não informado</span>;
  return (
    <span className={cx("inline-flex items-center gap-2 whitespace-nowrap", className)}>
      {/* Os dois textos ocupam a mesma célula da grade: a largura é a do maior,
          então revelar ou ocultar não mexe na largura da coluna. */}
      <span className="grid tabular-nums [&>*]:col-start-1 [&>*]:row-start-1">
        <span className={revelado ? "invisible" : undefined} aria-hidden={revelado}>{MASCARA}</span>
        {/* Mascarado, o valor real não vai para a página: só a forma dele, com zeros (mesma largura em tabular-nums). */}
        <span className={revelado ? undefined : "invisible"} aria-hidden={!revelado}>{revelado ? brl(valor) : brl(valor).replace(/\d/g, "0")}</span>
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setRevelado((v) => !v);
        }}
        title={revelado ? "Ocultar valor" : "Revelar valor"}
        aria-label={revelado ? "Ocultar valor" : "Revelar valor"}
        className="text-brand-purple-dark/40 hover:text-brand-blue"
      >
        <Icon name={revelado ? "fa-eye-slash fa-fw" : "fa-eye fa-fw"} />
      </button>
    </span>
  );
}

/**
 * Selo "Somente leitura": no lugar de um aviso grande, diz que o papel só
 * consulta. O motivo e quem faz a ação ficam no `title` (passar o mouse).
 */
export function SeloLeitura({ motivo, label = "Somente leitura" }: { motivo: string; label?: string }) {
  return <Tag item={label} variant="dark-purple" leftIcon="fa-lock" title={motivo} className="whitespace-nowrap font-semibold" />;
}

/** Cartão com título, para as seções das telas; `avisos` aparecem antes do título. */
export function Bloco({ titulo, icone, acoes, avisos, className, children, id }: { titulo?: ReactNode; icone?: string; acoes?: ReactNode; avisos?: ReactNode; className?: string; children: ReactNode; id?: string }) {
  return (
    <Card id={id} className={className}>
      <div className="flex flex-col gap-4">
      {/* Avisos do cartão ficam acima do título. */}
      {avisos}
      {(titulo || acoes) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {titulo && (
            <h2 className="flex items-center gap-2 text-lg font-bold text-brand-purple-dark">
              {icone && <Icon name={icone} className="text-brand-blue" />}
              {titulo}
            </h2>
          )}
          {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
        </div>
      )}
      {children}
      </div>
    </Card>
  );
}

/**
 * Classe para o `table` do sistema com coluna de ações: a célula de ações já
 * tem o espaçamento vertical da célula, e o contêiner dos botões repete o
 * `py-4` (a linha ficava 32px mais alta). Tira o do contêiner.
 */
export const ACOES_COMPACTAS = "[&_tbody_tr_td:last-child>div]:py-0";

/**
 * Drawers do módulo: o conteúdo vira uma coluna que ocupa a altura toda
 * (`CONTEUDO_DRAWER`, no `contentClass` do `drawer_modal`) e o rodapé com as
 * ações fica sempre fixo no fim do drawer (`RODAPE_DRAWER`), mesmo com o
 * formulário rolando ou curto.
 */
export const CONTEUDO_DRAWER = "flex flex-col pb-0! [&>*]:flex-1 [&>*]:flex [&>*]:flex-col";
export const RODAPE_DRAWER = "sticky bottom-0 z-10 -mx-6 mt-auto flex flex-col-reverse gap-3 border-t border-neutral-100 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-end";

/** Pares rótulo/valor em grade, para qualificação e dados financeiros. */
export function Dados({ itens, colunas = 3 }: { itens: [string, ReactNode][]; colunas?: 2 | 3 | 4 }) {
  return (
    <dl className={cx("grid gap-x-6 gap-y-4 grid-cols-1 sm:grid-cols-2", colunas === 3 && "lg:grid-cols-3", colunas === 4 && "lg:grid-cols-4")}>
      {itens.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">{k}</dt>
          <dd className="mt-1 text-brand-purple-dark/90 break-words">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export type Tom = "ok" | "atencao" | "risco" | "info" | "neutro";
const TOM: Record<Tom, string> = {
  ok: "bg-brand-green/10 border-brand-green/30 text-brand-green-dark",
  atencao: "bg-yellow/10 border-yellow/40 text-yellow-dark",
  risco: "bg-red-light border-red/30 text-red-dark",
  info: "bg-blue-light border-blue/20 text-blue-dark",
  neutro: "bg-brand-purple-dark/5 border-brand-purple-dark/10 text-brand-purple-dark/80",
};
const TOM_ICONE: Record<Tom, string> = { ok: "fa-circle-check", atencao: "fa-triangle-exclamation", risco: "fa-octagon-exclamation", info: "fa-circle-info", neutro: "fa-lock" };

/** Aviso com motivo e o que fazer: toda recusa do módulo usa este formato. */
export function Aviso({ tom = "info", titulo, icone, acoes, children, className }: { tom?: Tom; titulo?: ReactNode; icone?: string; acoes?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div role={tom === "risco" ? "alert" : "status"} className={cx("flex gap-3 rounded-xl border p-4", TOM[tom], className)}>
      <Icon name={icone ?? TOM_ICONE[tom]} type="solid" className="mt-0.5 text-lg" />
      <div className="flex-1 min-w-0 space-y-1">
        {titulo && <p className="font-bold">{titulo}</p>}
        {children && <div className="text-sm text-brand-purple-dark/80">{children}</div>}
        {acoes && <div className="flex flex-wrap gap-2 pt-2">{acoes}</div>}
      </div>
    </div>
  );
}

const KPI_TOM: Record<Tom, string> = {
  ok: "text-brand-green-dark bg-brand-green/20",
  atencao: "text-yellow-dark bg-yellow/20",
  risco: "text-red bg-red-light",
  info: "text-brand-blue-dark bg-brand-blue/20",
  neutro: "text-brand-purple-dark/70 bg-brand-purple-dark/10",
};

/** Indicador clicável do painel: leva à carteira ou à conformidade já filtrada. */
export function Kpi({ titulo, valor, detalhe, icone, tom = "info", onClick }: { titulo: string; valor: ReactNode; detalhe?: ReactNode; icone: string; tom?: Tom; onClick?: () => void }) {
  const Tag_ = onClick ? "button" : "div";
  return (
    <Tag_
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cx(
        "group flex flex-col gap-3 rounded-2xl bg-white p-5 text-left shadow-main transition",
        onClick && "cursor-pointer hover:ring-2 hover:ring-brand-blue/40 focus-visible:ring-2 focus-visible:ring-brand-blue outline-none",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cx("flex h-9 w-9 items-center justify-center rounded-lg", KPI_TOM[tom])}>
          <Icon name={icone} type="solid" />
        </span>
        {onClick && <Icon name="fa-arrow-right" className="text-brand-purple-dark/20 group-hover:text-brand-blue transition-colors" />}
      </div>
      <div>
        <p className="text-3xl font-extrabold text-brand-purple-dark tabular-nums">{valor}</p>
        <p className="text-sm font-bold text-brand-purple-dark/80">{titulo}</p>
        {detalhe && <p className="mt-1 text-xs text-brand-purple-dark/60">{detalhe}</p>}
      </div>
    </Tag_>
  );
}

/**
 * Etiquetas dos filtros ativos, removíveis, com "Limpar Todos" e, quando
 * `total` vem, o contador "N listado(s)". Sem filtro e sem contador, não ocupa espaço.
 */
export function Etiquetas({ itens, total, onLimpar, singular = "listado" }: { itens: { id: string; label: string; onRemove: () => void }[]; total?: number; onLimpar: () => void; singular?: string }) {
  if (itens.length === 0 && total == null) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 min-h-8">
      {itens.map((i) => (
        <span key={i.id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/16 pl-3 pr-1.5 py-1 text-sm font-bold text-brand-blue-dark">
          {i.label}
          <button type="button" onClick={i.onRemove} aria-label={`Remover filtro ${i.label}`} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-brand-blue/20">
            <Icon name="fa-xmark" className="text-xs" />
          </button>
        </span>
      ))}
      {itens.length > 0 && (
        <button type="button" onClick={onLimpar} className="text-sm font-bold text-brand-blue hover:underline">
          Limpar Todos
        </button>
      )}
      {total != null && (
        <span className="ml-auto text-sm text-brand-purple-dark/60 tabular-nums">
          {total} {singular}(s)
        </span>
      )}
    </div>
  );
}

/**
 * `button_tabs` controlado: mesmo markup e classes de `ButtonTabs`
 * (`button_tab_components.ex`), mas a aba ativa vem de fora. O `ButtonTabs` do
 * sistema guarda a aba no próprio estado e só lê a inicial da URL; aqui a tela
 * precisa trocar o modo pelo controle do cenário.
 */
export function AbasBotao<T extends string>({ id, abas, ativa, onChange, className }: { id: string; abas: { id: T; titulo: string; icone?: string }[]; ativa: T; onChange: (id: T) => void; className?: string }) {
  return (
    <div id={id} role="tablist" className={cx("relative text-neutral-900 p-2 rounded-xl bg-brand-purple-dark/5 inline-flex gap-2 overflow-auto thin-scrollbar", className)}>
      {abas.map((a) => (
        <button
          key={a.id}
          type="button"
          role="tab"
          aria-selected={a.id === ativa}
          data-active={a.id === ativa ? "true" : "false"}
          onClick={() => onChange(a.id)}
          // Com `icone`, a aba mostra só o ícone; o título vai para o `title` e o leitor de tela.
          aria-label={a.icone ? a.titulo : undefined}
          title={a.icone ? a.titulo : undefined}
          className={cx(
            "relative h-10 rounded-md py-1.5 text-lg font-bold whitespace-nowrap transition-all cursor-pointer text-brand-purple-dark/60",
            a.icone ? "w-10 px-0" : "px-2",
          )}
        >
          {/* O marcador do `button_tabs`: fundo azul e sombra interna na cor do texto dele (azul). */}
          {a.id === ativa && <span aria-hidden="true" className="absolute inset-0 rounded-lg bg-brand-blue/30 shadow-top-inset text-brand-blue/40" />}
          <span className="relative">{a.icone ? <Icon name={a.icone} /> : a.titulo}</span>
        </button>
      ))}
    </div>
  );
}

/** Botão de filtro rápido (pílula liga/desliga). */
export function Filtro({ ativo, onClick, children, contagem, icone }: { ativo: boolean; onClick: () => void; children: ReactNode; contagem?: number; icone?: string }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-lg px-3 h-9 text-sm font-bold transition-colors whitespace-nowrap",
        ativo ? "bg-brand-blue/30 text-brand-blue-dark shadow-top-inset" : "bg-brand-purple-dark/5 text-brand-purple-dark/60 hover:bg-brand-purple-dark/10",
      )}
    >
      {icone && <Icon name={icone} />}
      {children}
      {contagem != null && <span className={cx("rounded-full px-1.5 text-xs tabular-nums", ativo ? "bg-white/70" : "bg-white")}>{contagem}</span>}
    </button>
  );
}

/**
 * Documento como folha A4, com "Página X de Y" no rodapé. Usado em minutas,
 * simulação, comparação e PDF: o Jurídico revisa vendo o que vai ser assinado.
 */
export function FolhaA4({ paginas, cabecalho, className }: { paginas: ReactNode[]; cabecalho?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col items-center gap-6 rounded-2xl bg-neutral-100 p-4 md:p-8", className)}>
      {paginas.map((p, i) => (
        <article
          key={i}
          className="relative w-full max-w-[794px] aspect-[210/297] bg-white shadow-main rounded-sm px-[8%] pt-[7%] pb-[10%] font-serif text-[13px] leading-relaxed text-neutral-900 overflow-hidden"
        >
          {cabecalho && <header className="mb-6 border-b border-neutral-200 pb-3 font-sans text-xs text-neutral-500">{cabecalho}</header>}
          <div className="space-y-3">{p}</div>
          <footer className="absolute inset-x-[8%] bottom-[4%] flex justify-between border-t border-neutral-200 pt-2 font-sans text-[11px] text-neutral-500">
            <span>Documento gerado pelo Bloomy · Gestão de Contratos</span>
            <span>
              Página {i + 1} de {paginas.length}
            </span>
          </footer>
        </article>
      ))}
    </div>
  );
}

/** Divide uma lista de blocos em páginas de `porPagina`. */
export function paginar<T>(itens: T[], porPagina: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < itens.length; i += porPagina) out.push(itens.slice(i, i + porPagina));
  return out.length ? out : [[]];
}

/** Tag de minuta, em roxo (cor reservada às tags). */
export function TagMinuta({ tag }: { tag: string }) {
  return <span className="rounded bg-purple-light px-1 font-mono text-[0.85em] font-semibold text-purple">{`{{${tag}}}`}</span>;
}

/** Texto de cláusula com as tags `{{x}}` em roxo. */
export function TextoComTags({ texto }: { texto: string }) {
  const partes = texto.split(/(\{\{[A-Z_]+\}\})/g);
  return (
    <>
      {partes.map((p, i) => {
        const m = /^\{\{([A-Z_]+)\}\}$/.exec(p);
        return m ? <TagMinuta key={i} tag={m[1]!} /> : <span key={i}>{p}</span>;
      })}
    </>
  );
}

/**
 * Exporta as linhas visíveis para planilha (FR-103): separador ";", BOM para a
 * acentuação no Excel e nome "<nome>_<AAAA-MM-DD>". Quem chama já passa só as
 * linhas filtradas e sem a coluna de ações.
 */
export function exportarPlanilha(nome: string, cabecalho: string[], linhas: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [cabecalho, ...linhas].map((l) => l.map(esc).join(";")).join("\n");
  try {
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nome}_${TODAY}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    /* no preview sem download, fica só o aviso */
  }
  showToast({ type: "success", title: "Planilha exportada", content: `${linhas.length} linha(s), com os filtros aplicados.`, closeTime: 4000 });
}

/** "Exportar PDF": no protótipo, só confirma. */
export function exportarPdf(codigo: string) {
  showToast({ type: "success", title: "PDF gerado", content: `${codigo}.pdf, em folha A4 com "Página X de Y".`, closeTime: 4000 });
}

/** Barra de progresso simples (pilares do score, gráficos de barra). */
export function Barra({ pct, tom = "info", className }: { pct: number; tom?: Tom; className?: string }) {
  const cor = { ok: "bg-brand-green", atencao: "bg-yellow", risco: "bg-red", info: "bg-brand-blue", neutro: "bg-brand-purple-dark/30" }[tom];
  return (
    <div className={cx("h-2 w-full rounded-full bg-brand-purple-dark/10", className)}>
      <div className={cx("h-2 rounded-full", cor)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}
