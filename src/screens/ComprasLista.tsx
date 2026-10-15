/**
 * Compras — as listas de cada papel: minhas solicitações, as que esperam a
 * aprovação da unidade, a fila do comprador por pendência e os pedidos que
 * esperam a alçada do Financeiro ou do CFO.
 *
 * Tudo num `card` só: cabeçalho, filtros e a lista. Os filtros são só
 * selects (`input` select): Mostrar (quando o papel tem mais de uma visão),
 * Pendência (Compras), Etapa e, para Compras, Financeiro e CFO, Unidade.
 * Só componentes do sistema: `backoffice`, `card`, `input`, `header`, `table`,
 * `tag`, `button`, `empty_state_card` e o `drawer_modal` da nova solicitação. No celular, a tabela vira uma lista de
 * cartões (`card`), porque o requisitante acompanha pelo telefone.
 */
import { useEffect, useState, type ReactNode } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { Icon } from "../components/Icon.js";
import { EmptyStateCard, Header } from "../components/Layout.js";
import { Table } from "../components/Table.js";
import { Tooltip } from "../components/Choice.js";
import { Input } from "../components/Input.js";
import type { ComprasFixture } from "./compras/fixtures.js";
import { AlcadasDrawer } from "./compras/AlcadasDrawer.js";
import { NovaSolicitacao } from "./compras/NovaSolicitacao.js";
import { compras, useCompras } from "./compras/store.js";
import { ANTES_DE_COMPRAS, ETAPAS, GRUPOS_FILA, USUARIO, notaPendente, br, brl, ha, type Etapa, type Alcadas, type Papel, type Solicitacao } from "./compras/model.js";
import { BASE, ComprasShell, EtapaTag, Responsavel, papelDe } from "./compras/shared.js";

export const PATH = BASE;

export function ComprasLista({ context }: ScreenProps) {
  const papel = papelDe(context, "comprador");
  const base = useCompras(context);
  return (
    <ComprasShell context={context} papel={papel} breadcrumbs={[{ label: "Compras" }]}>
      {(data) => <Lista key={JSON.stringify(context.controls)} context={context} papel={papel} data={data} all={base?.solicitacoes ?? []} alcadasVivas={base?.alcadas ?? null} />}
    </ComprasShell>
  );
}

/** O que a lista mostra quando o requisitante envia a solicitação do drawer. */
const ENVIADA: Solicitacao = {
  id: "SC-0158", item: "Bolas de cravo sensoriais", quantidade: 6, unidadeMedida: "unidade", dataDesejada: "2026-10-30",
  unidade: "Unidade Jardim", requisitante: { nome: "Juliana Prado", cargo: "Terapeuta" }, aprovador: { nome: "Marina Alves", cargo: "Coordenação" },
  criadaEm: "2026-10-15T11:00", desde: "2026-10-15T11:00", etapa: "aprovacao_unidade",
  historico: [{ quando: "2026-10-15T11:00", quem: { nome: "Juliana Prado", cargo: "Terapeuta" }, acao: "Criou a solicitação", icon: "fa-plus", color: "blue" }],
};

type Vista = {
  id: string;
  label: string;
  rows: Solicitacao[];
  /** Mostra o filtro de pendência (RF-04). */
  pendencias?: boolean;
  empty: { icon: string; text: string; hint?: string };
  valor?: boolean;
};

const avisarEnvio = (s: Solicitacao) =>
  showToast({ title: `Solicitação ${s.id} enviada`, content: `Está com ${s.aprovador.nome} (${s.aprovador.cargo}) para aprovar. Você recebe um aviso a cada mudança de etapa.`, type: "success", closeTime: 6000 });

function Lista({ context, papel, data, all, alcadasVivas }: { context: ScenarioContext; papel: Papel; data: ComprasFixture; all: Solicitacao[]; alcadasVivas: Alcadas | null }) {
  const estado = context.controls.estado;
  const [drawer, setDrawer] = useState(estado === "nova" || estado === "nova-erro");
  const [alcadasAberto, setAlcadasAberto] = useState(estado?.startsWith("alcadas") ?? false);
  useEffect(() => {
    // O toast sai só quando a solicitação entra: remontar a lista (ou o efeito
    // rodar duas vezes no modo estrito) não repete o aviso.
    if (estado === "enviada" && compras.add(ENVIADA)) avisarEnvio(ENVIADA);
  }, [estado]);
  const proximo = `SC-${String(Math.max(157, ...all.map((s) => Number(s.id.slice(3)))) + 1).padStart(4, "0")}`;
  const user = USUARIO[papel];
  const open = (s: Solicitacao) => context.navigate(`${BASE}/${s.id}`, { controls: { papel } });
  const minhas = all.filter((s) => s.requisitante.nome === user.nome);
  const daUnidade = all.filter((s) => user.unidades.includes(s.unidade));

  const nova = (
    <Button onClick={() => setDrawer(true)} leftIcon="fa-plus">
      Nova solicitação
    </Button>
  );
  const alcadas = (
    <Button variant="outline" onClick={() => setAlcadasAberto(true)} leftIcon="fa-sliders">
      Alçadas
    </Button>
  );

  /** O que cada papel pode ver; o filtro Mostrar troca entre eles. */
  let vistas: Vista[];
  let subtitle: string;
  let actions = nova;

  switch (papel) {
    case "requisitante":
      subtitle = "Acompanhe o que você pediu: em que etapa está e com quem.";
      vistas = [
        { id: "minhas", label: "Minhas solicitações", rows: minhas, empty: { icon: "fa-cart-shopping", text: "Você ainda não pediu nenhum material", hint: "Quando faltar algo na unidade, peça por aqui: leva menos de um minuto." } },
      ];
      break;
    case "aprovador": {
      // P-01: o pedido da própria coordenadora vai para a supervisão; ela não o vê para aprovar.
      const pendentes = daUnidade.filter((s) => s.etapa === "aprovacao_unidade" && s.aprovador.nome === user.nome);
      subtitle = `Solicitações da ${user.unidades[0]}. Você aprova, devolve para ajuste ou reprova.`;
      vistas = [
        { id: "para-aprovar", label: `Para aprovar (${pendentes.length})`, rows: pendentes, empty: { icon: "fa-check-double", text: "Nada para aprovar", hint: "Você recebe um aviso quando alguém da unidade pedir material." } },
        { id: "da-unidade", label: "Da unidade", rows: daUnidade, empty: { icon: "fa-cart-shopping", text: "A unidade ainda não pediu nada" } },
        { id: "minhas", label: "Minhas solicitações", rows: minhas, empty: { icon: "fa-cart-shopping", text: "Você ainda não pediu nenhum material" } },
      ];
      break;
    }
    case "comprador": {
      // P-06: Compras vê a solicitação a partir da aprovação da unidade.
      const daCompra = all.filter((s) => !ANTES_DE_COMPRAS.includes(s.etapa));
      const notas = all.filter(notaPendente);
      subtitle = "As compras aprovadas pelas unidades. Filtre pela pendência para ver o que falta fazer.";
      actions = alcadas;
      vistas = [
        { id: "todas", label: "Todas as compras", rows: daCompra, valor: true, pendencias: true, empty: { icon: "fa-inbox", text: "Nenhuma compra ainda", hint: "Quando a unidade aprovar uma solicitação, ela entra aqui para você cotar." } },
        { id: "notas", label: `Notas com pendência (${notas.length})`, rows: notas, valor: true, empty: { icon: "fa-file-circle-check", text: "Nenhuma nota com pendência" } },
      ];
      break;
    }
    case "financeiro":
    case "cfo": {
      const etapa = papel === "cfo" ? "alcada_cfo" : "alcada_financeiro";
      const pendentes = all.filter((s) => s.etapa === etapa);
      subtitle = papel === "cfo" ? "Pedidos acima do limite do Financeiro. O CFO não tem limite." : "Pedidos acima do limite de Compras e dentro do seu.";
      actions = alcadas;
      // RN-05: o Financeiro também cadastra a partir da nota; precisa achar as notas pendentes.
      const notas = all.filter(notaPendente);
      vistas = [
        { id: "para-aprovar", label: `Para aprovar (${pendentes.length})`, rows: pendentes, valor: true, empty: { icon: "fa-check-double", text: "Nenhum pedido esperando você" } },
        ...(papel === "financeiro"
          ? [{ id: "notas", label: `Notas com pendência (${notas.length})`, rows: notas, valor: true, empty: { icon: "fa-file-circle-check", text: "Nenhuma nota com pendência" } }]
          : []),
        { id: "pedidos", label: "Todos os pedidos", rows: all.filter((s) => s.pedido), valor: true, empty: { icon: "fa-file-invoice", text: "Nenhum pedido emitido" } },
      ];
      break;
    }
  }

  const [vistaId, setVistaId] = useState(vistas.some((v) => v.id === estado) ? estado! : vistas[0]!.id);
  const [pendencia, setPendencia] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<string | null>(null);
  const [unidade, setUnidade] = useState<string | null>(null);
  const vista = vistas.find((v) => v.id === vistaId) ?? vistas[0]!;
  const corporativo = papel === "comprador" || papel === "financeiro" || papel === "cfo";

  const rows = vista.rows.filter(
    (s) =>
      (!etapa || s.etapa === etapa) &&
      (!pendencia || GRUPOS_FILA.find((g) => g.id === pendencia)!.etapas.includes(s.etapa)) &&
      (!unidade || s.unidade === unidade),
  );
  const limpar = () => { setEtapa(null); setUnidade(null); setPendencia(null); };
  const pendencias = GRUPOS_FILA.map((g) => ({ label: `${g.title} (${vista.rows.filter((s) => g.etapas.includes(s.etapa)).length})`, value: g.id }));

  const etapas = (Object.keys(ETAPAS) as Etapa[]).filter((e) => vista.rows.some((s) => s.etapa === e)).map((e) => ({ label: ETAPAS[e].label, value: e }));
  const unidades = [...new Set(all.map((s) => s.unidade))].sort().map((u) => ({ label: u, value: u }));

  let conteudo: ReactNode;
  if (vista.rows.length === 0) {
    conteudo = <EmptyStateCard icon={vista.empty.icon} text={vista.empty.text}>{vista.empty.hint}</EmptyStateCard>;
  } else if (rows.length === 0) {
    conteudo = (
      <EmptyStateCard icon="fa-filter" text="Nenhuma solicitação com esses filtros">
        <Button className="mt-4 mx-auto" variant="ghost" leftIcon="fa-xmark" onClick={limpar}>Limpar filtros</Button>
      </EmptyStateCard>
    );
  } else {
    conteudo = <Solicitacoes id={vista.id} rows={rows} onOpen={open} valor={vista.valor} />;
  }

  return (
    <>
      <Card className="space-y-6">
        <Header subtitle={subtitle} actions={actions}>Compras</Header>
        {/* Só selects, na mesma grade de quatro colunas em todas as visões. */}
        {vista.rows.length > 0 || vistas.length > 1 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {vistas.length > 1 && (
              <Input id="mostrar" type="select" label="Mostrar" options={vistas.map((v) => ({ label: v.label, value: v.id }))} value={vistaId} clear={false} onChange={(v) => { setVistaId(v ?? vistas[0]!.id); setEtapa(null); setPendencia(null); }} />
            )}
            {/* RF-04, meio-termo: a lista é uma só, e a pendência agrupa pelo que falta fazer. */}
            {vista.pendencias && (
              <Input id="pendencia" type="select" label="Pendência" prompt="Todas as pendências" options={pendencias} value={pendencia} onChange={(v) => { setPendencia(v); setEtapa(null); }} />
            )}
            <Input id="etapa" type="select" label="Etapa" prompt="Todas as etapas" options={etapas} value={etapa} onChange={(v) => { setEtapa(v); setPendencia(null); }} />
            {corporativo && <Input id="unidade" type="select" label="Unidade" prompt="Todas as unidades" options={unidades} value={unidade} onChange={(v) => setUnidade(v)} />}
          </div>
        ) : null}
        {conteudo}
      </Card>
      {(papel === "comprador" || papel === "financeiro" || papel === "cfo") && (
        <AlcadasDrawer
          show={alcadasAberto}
          papel={papel}
          alcadas={alcadasVivas ?? data.alcadas}
          estado={estado === "alcadas-erro" ? "erro" : estado === "alcadas-confirmar" ? "confirmar" : undefined}
          onCancel={() => setAlcadasAberto(false)}
        />
      )}
      {(papel === "requisitante" || papel === "aprovador") && (
        <NovaSolicitacao
          show={drawer}
          papel={papel}
          numero={proximo}
          comErro={estado === "nova-erro"}
          onCancel={() => setDrawer(false)}
          onEnviar={(s) => {
            setDrawer(false);
            if (compras.add(s)) {
              avisarEnvio(s);
              // RF-12: o aprovador é avisado da nova solicitação.
              if (s.aprovador.nome === USUARIO.aprovador.nome && papel !== "aprovador") {
                compras.avisar("aprovador", "Nova solicitação para aprovar", `${s.requisitante.nome} pediu ${s.item}, ${s.quantidade} ${s.unidadeMedida}${s.quantidade > 1 ? "s" : ""} (${s.id}).`, `${BASE}/${s.id}`);
              }
            }
          }}
        />
      )}
    </>
  );
}

const FIXA = "[&_table]:table-fixed [&_th:last-child]:w-14";
/** Solicitação, Unidade, Etapa, Com quem e a seta. */
const COLUNAS = `${FIXA} [&_th:nth-child(1)]:w-[36%] [&_th:nth-child(2)]:w-[16%] [&_th:nth-child(3)]:w-[24%]`;
/** Solicitação, Unidade, Etapa, Com quem, Valor e a seta. */
const COLUNAS_COM_VALOR = `${FIXA} [&_th:nth-child(1)]:w-[32%] [&_th:nth-child(2)]:w-[14%] [&_th:nth-child(3)]:w-[22%] [&_th:nth-child(5)]:w-[12%]`;

/**
 * RF-02, meio-termo: o motivo de reprovação, devolução ou cancelamento não ocupa
 * a lista, mas está a um passar de mouse, no ícone ao lado da etapa. O texto
 * inteiro fica no detalhe.
 */
function MotivoTip({ s }: { s: Solicitacao }) {
  if (!s.motivo || !["reprovada", "ajuste", "pedido_reprovado", "cancelada"].includes(s.etapa)) return null;
  return (
    <Tooltip
      id={`motivo-${s.id}`}
      placement="top"
      tooltipClass="max-w-xs whitespace-normal"
      triggerClass="text-brand-purple-dark/50 hover:text-brand-purple-dark"
      tooltipTrigger={<span aria-label={`Motivo: ${s.motivo}`}><Icon name="fa-comment-lines" /></span>}
      tooltipContent={<><strong>Motivo:</strong> {s.motivo}</>}
    />
  );
}

/** Há quanto tempo está na etapa, ou quando encerrou. */
const naEtapa = (s: Solicitacao) => {
  if (ETAPAS[s.etapa].encerrada) return `Encerrada em ${br(s.desde.slice(0, 10))}`;
  const quando = ha(s.desde);
  return `Nesta etapa ${quando === "hoje" || quando === "ontem" ? `desde ${quando}` : quando}`;
};

/** Tabela no desktop, linhas no celular. */
function Solicitacoes({ id, rows, onOpen, valor = false }: { id: string; rows: Solicitacao[]; onOpen: (s: Solicitacao) => void; valor?: boolean }) {
  return (
    <>
      <ul className="md:hidden -my-4 divide-y divide-brand-purple-dark/10">
        {rows.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onOpen(s)} className="w-full text-left py-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-brand-purple-dark">{s.item}</p>
                  <p className="text-sm text-brand-purple-dark/60">
                    {s.id} · {s.quantidade} {s.unidadeMedida}{s.quantidade > 1 ? "s" : ""} · até {br(s.dataDesejada).slice(0, 5)}
                  </p>
                </div>
                <Icon name="fa-chevron-right" className="text-brand-purple-dark/30 mt-1" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5"><EtapaTag s={s} /><MotivoTip s={s} /></div>
                <p className="text-xs text-brand-purple-dark/60">{naEtapa(s)}</p>
              </div>
              <div className="text-sm text-brand-purple-dark/80">
                <Responsavel s={s} />
              </div>
            </button>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        {/* Larguras fixas: filtrar não pode mudar o tamanho das colunas. */}
        <Table<Solicitacao>
          id={id}
          className={valor ? COLUNAS_COM_VALOR : COLUNAS}
          rows={rows}
          rowId={(s) => `${id}-${s.id}`}
          rowClick={onOpen}
          col={[
            {
              label: "Solicitação",
              render: (s) => (
                <div>
                  <p className="font-bold text-brand-purple-dark">{s.item}</p>
                  <p className="text-sm">
                    {s.id} · {s.quantidade} {s.unidadeMedida}{s.quantidade > 1 ? "s" : ""}{s.pedido ? ` · ${s.pedido.numero}` : ""}
                  </p>
                </div>
              ),
            },
            { label: "Unidade", render: (s) => s.unidade },
            {
              label: "Etapa",
              render: (s) => (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5"><EtapaTag s={s} /><MotivoTip s={s} /></div>
                  <p className="text-xs text-brand-purple-dark/60">
                    {naEtapa(s)}
                  </p>
                </div>
              ),
            },
            { label: "Com quem", render: (s) => <Responsavel s={s} /> },
            ...(valor ? [{ label: "Valor", className: "whitespace-nowrap", render: (s: Solicitacao) => (s.pedido ? brl(s.pedido.valor) : "—") }] : []),
          ]}
          action={[() => <Icon name="fa-chevron-right" />]}
        />
      </div>
    </>
  );
}
