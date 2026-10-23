/**
 * Fila de Espera — os leads que esperam vaga numa unidade, na ordem de
 * chegada, com o encaixe que o cruzamento encontrou para cada um. Clicar num
 * lead abre o painel com a semana; de lá se edita o pedido, ajusta um encaixe
 * arrastando, e tira o lead da fila (de volta ao funil ou para Perdido).
 *
 * Tudo num `card`: cabeçalho, filtros (`input` texto e select) e a lista
 * (`table` no desktop, linhas no celular). O sino do layout traz os avisos de
 * encaixe do responsável comercial.
 *
 * A entrada de menu Fila de Espera não existe no Phoenix: vai por
 * `extraMenuItems`, como Compras.
 */
import { useState, type ReactNode } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { Icon } from "../components/Icon.js";
import { Input } from "../components/Input.js";
import { Avatar, EmptyStateCard, Header, LoadingCard } from "../components/Layout.js";
import type { UserNotification } from "../components/Notification.js";
import { Table } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import {
  ESPECIALIDADES, PROF, SIGLA, UNIDADES, avisosDeEncaixe, br, curto, diasDesde, etapaFunil, faixaTxt, filaDaUnidade, manterEncaixes, parentesco, quando, resumoTxt,
  type Entrada, type Linha, type Pin,
} from "./fila-de-espera/model.js";
import { EncaixeTag, PainelLead } from "./fila-de-espera/PainelLead.js";
import { PedidoForm, type PedidoData } from "./fila-de-espera/PedidoForm.js";
import { fila, useFila } from "./fila-de-espera/store.js";

export const PATH = "/backoffice/fila-de-espera";
export const DETALHE = `${PATH}/:id`;

const FILTROS_ENCAIXE = [
  { label: "Encaixe completo", value: "full" },
  { label: "Encaixe parcial", value: "partial" },
  { label: "Encaixe previsto", value: "future" },
  { label: "Sem encaixe", value: "none" },
];

/** Os avisos de encaixe, no sino. Os de mais de dois dias já foram lidos. */
const notificacoes = (entradas: Entrada[]): UserNotification[] =>
  avisosDeEncaixe(entradas).map((n) => ({
    id: n.id,
    title: `${n.kind === "now" ? "Encaixe possível" : "Encaixe previsto"} · ${n.child}`,
    content: `${n.text}. ${n.unit} · ${n.owner}.`,
    insertedAt: quando(n.at),
    readAt: diasDesde(n.at) > 2 ? `${br(n.at)}/2026 09:00` : undefined,
    onClickUrl: `${PATH}/${n.entryId}`,
  }));

export function FilaDeEspera({ context, params }: ScreenProps) {
  const base = useFila(context);
  const lead = params.id && base ? base.entradas.find((e) => e.id === params.id) : undefined;
  const unit = lead?.unit ?? (UNIDADES.includes(context.controls.unidade as (typeof UNIDADES)[number]) ? context.controls.unidade! : UNIDADES[0]);
  return (
    <BackofficeLayout
      context={context}
      currentPath={PATH}
      breadcrumbs={[{ label: "Fila de Espera" }]}
      currentUser={{ name: "Carla Nunes", units: [...UNIDADES], roles: ["Admin"] }}
      currentUnit={unit}
      notifications={base ? notificacoes(base.entradas) : []}
      extraMenuItems={[{ to: PATH, title: "Fila de Espera", icon: "fa-hourglass-half" }]}
    >
      {base ? (
        <Fila key={`${unit}|${params.id ?? ""}|${context.controls.estado ?? ""}`} context={context} unit={unit} entradas={base.entradas} openId={lead?.id ?? null} />
      ) : (
        <LoadingCard message={context.error ? "Não foi possível carregar a fila de espera." : "Carregando a fila de espera…"} />
      )}
    </BackofficeLayout>
  );
}

function Fila({ context, unit, entradas, openId: inicial }: { context: ScenarioContext; unit: string; entradas: Entrada[]; openId: string | null }) {
  const estado = context.controls.estado;
  const rows = filaDaUnidade(entradas, unit);
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [fit, setFit] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(inicial);
  const [editId, setEditId] = useState<string | null>(inicial && estado === "editar" ? inicial : null);

  const owners = [...new Set(rows.map((r) => r.owner))].sort();
  const ql = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (!ql || [r.child, r.guardian, r.phone].some((x) => x.toLowerCase().includes(ql))) &&
      (!spec || r.specialties.some((s) => s.spec === spec)) &&
      (!owner || r.owner === owner) &&
      (!fit || r.ev.status === fit),
  );
  const open = rows.find((r) => r.id === openId) ?? null;
  const editing = editId ? fila.get(editId) : null;
  const limpar = () => { setQ(""); setSpec(null); setOwner(null); setFit(null); };
  // Fechar o painel volta à lista: a URL do lead deixa de valer.
  const fechar = () => { setOpenId(null); if (inicial) context.navigate(PATH, { controls: { unidade: unit } }); };

  function release(r: Linha, kind: "lost" | "fit") {
    const lost = kind === "lost";
    const g = r.nowR[0];
    fila.release(r.id);
    setOpenId(null);
    showToast({
      type: "success",
      title: lost ? "Lead retirado da fila" : "Lead voltou ao funil",
      content: lost
        ? `${r.child} foi para Perdido (sem vaga no horário).`
        : `${r.child} voltou para a etapa ${etapaFunil(r.fromStatus || "aguardando")}${g ? `, com encaixe ${faixaTxt(g)} com ${curto(PROF[g.pid]!.name)}` : ""}.`,
    });
  }
  function moveSlot(id: string, from: { spec: string; day: number; h: number }, to: Pin) {
    const e = fila.get(id);
    if (!e) return;
    const pins = (e.pins ?? []).filter((p) => !(p.spec === from.spec && p.day === from.day && p.h === from.h));
    const wasPin = pins.length !== (e.pins ?? []).length;
    let skips = (e.skips ?? []).filter((s) => !(s.spec === to.spec && s.day === to.day && s.h === to.h));
    if (!wasPin) skips = [...skips, { spec: from.spec, day: from.day, h: from.h }];
    fila.update(id, { pins: [...pins, to], skips });
  }
  function saveEdit(data: PedidoData) {
    const e = fila.get(editId!);
    const specs = new Set(data.specialties.map((s) => s.spec));
    fila.update(editId!, { ...data, pins: manterEncaixes(e, data), skips: (e?.skips ?? []).filter((s) => specs.has(s.spec)) });
    setEditId(null);
    showToast({ type: "success", title: "Sucesso!", content: "Pedido atualizado e cruzamento refeito." });
  }

  let conteudo: ReactNode;
  if (rows.length === 0) {
    conteudo = (
      <EmptyStateCard icon="fa-hourglass-half" text="Ninguém na fila desta unidade">
        Os leads que esperam vaga nesta unidade aparecem aqui, em ordem de chegada.
      </EmptyStateCard>
    );
  } else if (shown.length === 0) {
    conteudo = (
      <EmptyStateCard icon="fa-filter" text="Nenhum lead com esses filtros">
        <Button className="mt-4 mx-auto" variant="ghost" leftIcon="fa-xmark" onClick={limpar}>Limpar filtros</Button>
      </EmptyStateCard>
    );
  } else {
    conteudo = <Leads rows={shown} onOpen={(r) => setOpenId(r.id)} />;
  }

  return (
    <>
      <Card className="space-y-6">
        <Header subtitle={`${unit} · em ordem de chegada. Quem tem encaixe recebe aviso no sino do responsável comercial.`}>Fila de Espera</Header>
        {rows.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <Input id="fila-busca" label="Buscar" leftIcon="fa-magnifying-glass" placeholder="Criança, responsável ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
            <Input id="fila-especialidade" type="select" label="Especialidade" prompt="Todas" options={ESPECIALIDADES.map((x) => ({ label: x, value: x }))} value={spec} onChange={setSpec} />
            <Input id="fila-responsavel" type="select" label="Responsável comercial" prompt="Todos" options={owners.map((x) => ({ label: x, value: x }))} value={owner} onChange={setOwner} />
            <Input id="fila-encaixe" type="select" label="Encaixe" prompt="Todos" options={FILTROS_ENCAIXE} value={fit} onChange={setFit} />
          </div>
        )}
        {conteudo}
      </Card>
      <PainelLead
        r={open}
        show={!!open && !editing}
        onClose={fechar}
        onEdit={() => open && setEditId(open.id)}
        onRelease={(k) => open && release(open, k)}
        onMove={(a, b) => open && moveSlot(open.id, a, b)}
        onReset={() => open && fila.update(open.id, { pins: [], skips: [] })}
        onUnitMoves={() => showToast({ type: "info", title: "Mapa da Unidade", content: "As movimentações abrem no Mapa da Unidade, fora deste protótipo." })}
      />
      {editing && <PedidoForm key={editing.id} show entry={editing} onClose={() => setEditId(null)} onConfirm={saveEdit} />}
    </>
  );
}

const Especialidades = ({ r }: { r: Linha }) => (
  <div className="flex flex-wrap gap-1">
    {r.specialties.map((s) => (
      <Tag key={s.spec} item={`${SIGLA[s.spec] ?? s.spec} ${s.hours}h`} variant="dark-purple" title={s.spec} className="text-xs!" />
    ))}
  </div>
);

const Encaixe = ({ r }: { r: Linha }) => {
  const sum = resumoTxt(r.ev);
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <EncaixeTag ev={r.ev} />
      {sum && <span className="text-xs font-bold tabular-nums text-brand-purple-dark/70">{sum}</span>}
    </div>
  );
};

const espera = (r: Linha) => (r.wait === 0 ? "Hoje" : `${r.wait} dia${r.wait === 1 ? "" : "s"}`);

const Posicao = ({ r }: { r: Linha }) => (
  <span title="Posição na fila (ordem de chegada)" className="grid h-9 w-9 place-items-center rounded-lg bg-brand-purple-dark/6 text-sm font-black tabular-nums text-brand-purple-dark">
    {`${r.pos}º`}
  </span>
);

/** Posição, criança, especialidades, encaixe, espera, responsável e a seta. */
const COLUNAS = "[&_table]:table-fixed [&_th:nth-child(1)]:w-24 [&_th:nth-child(2)]:w-[24%] [&_th:nth-child(3)]:w-[16%] [&_th:nth-child(5)]:w-24 [&_th:nth-child(6)]:w-[18%] [&_th:last-child]:w-14";

/** Tabela no desktop, linhas no celular. */
function Leads({ rows, onOpen }: { rows: Linha[]; onOpen: (r: Linha) => void }) {
  return (
    <>
      <ul className="md:hidden -my-4 divide-y divide-brand-purple-dark/10">
        {rows.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => onOpen(r)} className="flex w-full items-start gap-3 py-4 text-left">
              <Posicao r={r} />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-brand-purple-dark">
                      {r.child} <span className="text-sm font-semibold text-brand-purple-dark/60">{`${r.age} anos`}</span>
                    </p>
                    <p className="truncate text-sm text-brand-purple-dark/60">{`${r.guardian}${parentesco(r)}`}</p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-bold tabular-nums text-brand-purple-dark/70">{espera(r)}</span>
                </div>
                <Especialidades r={r} />
                <Encaixe r={r} />
              </div>
              <Icon name="fa-chevron-right" className="mt-2 text-brand-purple-dark/30" />
            </button>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table<Linha>
          id="fila"
          className={COLUNAS}
          rows={rows}
          rowId={(r) => `fila-${r.id}`}
          rowClick={onOpen}
          col={[
            { label: "Posição", render: (r) => <Posicao r={r} /> },
            {
              label: "Criança",
              render: (r) => (
                <div className="min-w-0">
                  <p className="truncate font-bold text-brand-purple-dark">
                    {r.child} <span className="text-sm font-semibold text-brand-purple-dark/60">{`${r.age} anos`}</span>
                  </p>
                  <p className="truncate text-sm">{`${r.guardian}${parentesco(r)}`}</p>
                </div>
              ),
            },
            { label: "Especialidades", render: (r) => <Especialidades r={r} /> },
            { label: "Encaixe", render: (r) => <Encaixe r={r} /> },
            { label: "Na fila", className: "whitespace-nowrap tabular-nums", render: (r) => <span title={`Na fila desde ${br(r.enteredAt)}`}>{espera(r)}</span> },
            {
              label: "Responsável",
              render: (r) => (
                <div className="flex items-center gap-3">
                  <Avatar size="custom" className="h-7 w-7" />
                  <p className="truncate font-bold">{r.owner}</p>
                </div>
              ),
            },
          ]}
          action={[(r) => (
            <button type="button" aria-label={`Abrir ${r.child}`} onClick={() => onOpen(r)}>
              <Icon name="fa-chevron-right" />
            </button>
          )]}
        />
      </div>
    </>
  );
}
