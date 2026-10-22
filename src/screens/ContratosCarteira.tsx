/**
 * Gestão de Contratos — Carteira & Esteira (FR-015 a FR-019).
 *
 * A esteira das sete fases (um cartão por fase, com a contagem; clicar filtra,
 * clicar de novo desfaz) e a lista da carteira, ordenada por código, com
 * filtros que se somam (E lógico): monitoramento, status, modalidade, fase e
 * busca. Cada filtro ativo vira etiqueta removível, com "Limpar Todos" e o
 * contador "N listado(s)". As contagens são as mesmas do painel: ambos leem
 * `indicadores()`. A carteira abre já filtrada pelos controles que a Torre
 * manda (monitoramento, status, fase, modalidade, busca e, no KPI Assinados,
 * assinatura). O endereço antigo da esteira (`/esteira`) leva para cá.
 *
 * Feito na tela (componente novo): a esteira de fases.
 * O resto é `table`, `input`, `tag`, `button`, `modal` (PDF) e `empty_state_card`.
 */
import { useEffect, useMemo, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import { Button } from "../components/Button.js";
import { Icon } from "../components/Icon.js";
import { Input, cx } from "../components/Input.js";
import { EmptyStateCard } from "../components/Layout.js";
import { Table } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import {
  APROVACAO, ASSINATURA, FAIXA, FASES, FLUXO, MODALIDADE, STATUS, br, diasAte, diasLabel, dossieOk, dossiePendentes, ehCritico, faixa, faseLabel, indicadores, parteDe,
  type Assinatura, type Contrato, type ContratosData, type Fase, type Modalidade, type Status,
} from "./gestao-de-contratos/model.js";
import { ModalPdfContrato } from "./gestao-de-contratos/PdfContrato.js";
import { ACOES_COMPACTAS, Bloco, ContratosShell, Etiquetas, ROTAS, Selo, exportarPlanilha, papelDe, irFicha } from "./gestao-de-contratos/ui.js";

/** Monitoramento (FR-017, RN-070): risco pela faixa de vigência ou fluxo financeiro. */
type Monitoramento = "critico" | "alerta" | "despesa" | "receita";
const MONITORAMENTO: Record<Monitoramento, string> = { critico: "Crítico ≤30d", alerta: "Alerta 31–90d", despesa: "Despesa", receita: "Receita" };

/** Endereço antigo da esteira do ciclo de vida (FR-019). */
export const ROTA_ESTEIRA_ANTIGA = ROTAS.carteira.replace(/carteira$/, "esteira");

/**
 * Larguras das colunas em percentual (`table-fixed`): filtrar não muda o
 * layout, e a tabela sempre cabe no cartão, sem rolagem horizontal. "Parte e
 * objeto" fica com o que sobra; selos longos quebram linha dentro da célula.
 */
const LARGURAS = [
  "overflow-x-hidden! [&_table]:table-fixed [&_thead_th]:px-2! [&_tbody_tr_td]:px-2!",
  // Em tela larga os selos ficam numa linha só; abaixo de 1536px podem quebrar para caber.
  "[&_th]:break-words [&_td]:break-words max-2xl:[&_td_span]:whitespace-normal",
  "[&_th:nth-child(1)]:w-[10%]", // Contrato
  "[&_th:nth-child(2)]:w-[9%]", // Modalidade
  "[&_th:nth-child(3)]:w-[10%]", // Fase
  "[&_th:nth-child(5)]:w-[11%]", // Aprovação
  "[&_th:nth-child(6)]:w-[14%]", // Assinatura
  "[&_th:nth-child(7)]:w-[9%]", // Término
  "[&_th:nth-child(8)]:w-[11%]", // Dossiê
  "[&_th:nth-child(9)]:w-32", // Ações (largura fixa: dois botões)
].join(" ");

/**
 * Filtro de risco (RN-070): crítico até 30 dias (inclui vencidos), alerta de 31
 * a 90, iguais à RN-014. Encerrados contam como regulares, então nunca entram em
 * crítico ou alerta: a contagem bate com os KPIs da Torre (base RN-015).
 */
function passaMonitoramento(c: Contrato, m: Monitoramento | "") {
  if (!m) return true;
  if (m === "receita" || m === "despesa") return c.fluxo === m;
  if (c.status === "encerrado") return false;
  return m === "critico" ? ehCritico(c.fim) : faixa(c.fim) === "alerta";
}

/** Valor de controle por chave ou rótulo ("vigente" ou "Vigente"), sem diferenciar maiúsculas. */
function chaveDe<K extends string>(mapa: Record<K, { label: string } | string>, valor?: string): K | "" {
  if (!valor) return "";
  const v = valor.trim().toLowerCase();
  const achada = (Object.keys(mapa) as K[]).find((k) => {
    const item = mapa[k];
    return k.toLowerCase() === v || (typeof item === "string" ? item : item.label).toLowerCase() === v;
  });
  return achada ?? "";
}

export function ContratosCarteira({ context }: ScreenProps) {
  const papel = papelDe(context, "solicitante");
  const podeCriar = papel !== "diretoria" && papel !== "financeiro" && papel !== "aprovador";
  return (
    <ContratosShell
      context={context}
      secao="carteira"
      titulo="Carteira & Esteira"
      subtitulo="Todos os contratos, por fase do ciclo de vida. Clique numa fase para filtrar."
      acoes={
        podeCriar && (
          <Button leftIcon="fa-plus" onClick={() => context.navigate(ROTAS.novo, { controls: {} })}>
            Novo Contrato
          </Button>
        )
      }
    >
      {(data) => <Carteira key={JSON.stringify(context.controls)} data={data} controls={context.controls} abrir={(id) => irFicha(context, id, "carteira")} novo={podeCriar ? () => context.navigate(ROTAS.novo, { controls: {} }) : undefined} />}
    </ContratosShell>
  );
}

/** Endereço antigo da esteira (FR-019): leva à Carteira, mantendo os filtros recebidos. */
export function ContratosEsteiraAntiga({ context }: ScreenProps) {
  useEffect(() => {
    context.navigate(ROTAS.carteira, { controls: context.controls });
  }, [context]);
  return null;
}

function Carteira({ data, controls, abrir, novo }: { data: ContratosData; controls: Record<string, string>; abrir: (id: string) => void; novo?: () => void }) {
  // Controles com valor sentinela ("nenhum", "todas", "todos", "vazia") abrem sem filtro (FR-018).
  // Links antigos: `monitoramento=vigentes` é o status Vigente; "critico,despesa" usa o primeiro valor reconhecido.
  const mon = (controls.monitoramento ?? "").split(",");
  const [monitoramento, setMonitoramento] = useState<Monitoramento | "">((mon.find((m) => m in MONITORAMENTO) as Monitoramento | undefined) ?? "");
  const [status, setStatus] = useState<Status | "">(chaveDe(STATUS, controls.status) || (mon.includes("vigentes") ? "vigente" : ""));
  // Só chega por link (KPI Assinados Digital da Torre); aparece como etiqueta removível.
  const [assinatura, setAssinatura] = useState<Assinatura | "">(chaveDe(ASSINATURA, controls.assinatura));
  const [modalidade, setModalidade] = useState<Modalidade | "">(chaveDe(MODALIDADE, controls.modalidade));
  const [fase, setFase] = useState<Fase | "">(FASES.find((f) => f.id === controls.fase || `${f.n}. ${f.label}` === controls.fase)?.id ?? "");
  const [busca, setBusca] = useState(controls.busca && controls.busca !== "vazia" ? controls.busca : "");
  const [pdf, setPdf] = useState<Contrato | null>(null);

  const ind = indicadores(data);
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return data.contratos
      .filter((c) => passaMonitoramento(c, monitoramento))
      .filter((c) => !status || c.status === status)
      .filter((c) => !assinatura || c.assinatura === assinatura)
      .filter((c) => !modalidade || c.modalidade === modalidade)
      .filter((c) => !fase || c.fase === fase)
      .filter((c) => !q || [c.id, c.objeto, c.categoria, parteDe(data, c)?.nome ?? ""].some((s) => s.toLowerCase().includes(q)))
      // Ordenada por código (FR-015).
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [data, monitoramento, status, assinatura, modalidade, fase, busca]);

  const limpar = () => { setMonitoramento(""); setStatus(""); setAssinatura(""); setModalidade(""); setFase(""); setBusca(""); };

  /** Etiquetas dos filtros ativos (FR-017). */
  const etiquetas = [
    monitoramento && { id: "monitoramento", label: MONITORAMENTO[monitoramento], onRemove: () => setMonitoramento("") },
    status && { id: "status", label: `Status: ${STATUS[status].label}`, onRemove: () => setStatus("") },
    assinatura && { id: "assinatura", label: ASSINATURA[assinatura].label, onRemove: () => setAssinatura("") },
    modalidade && { id: "modalidade", label: MODALIDADE[modalidade].longo, onRemove: () => setModalidade("") },
    fase && { id: "fase", label: `Fase: ${FASES.find((f) => f.id === fase)!.n}. ${faseLabel(fase)}`, onRemove: () => setFase("") },
    busca.trim() && { id: "busca", label: `Busca: "${busca.trim()}"`, onRemove: () => setBusca("") },
  ].filter((e): e is { id: string; label: string; onRemove: () => void } => !!e);

  // FR-103: só as linhas listadas, sem a coluna de ações.
  const exportar = () =>
    exportarPlanilha(
      "carteira-de-contratos",
      ["Código", "Versão", "Liminar", "Modalidade", "Categoria", "Fase", "Parte", "Objeto", "Fluxo", "Status", "Aprovação", "Assinatura", "Término", "Dias restantes", "Dossiê"],
      lista.map((c) => [
        c.id, c.versao, c.liminar ? "Sim" : "Não", MODALIDADE[c.modalidade].label, c.categoria, faseLabel(c.fase), parteDe(data, c)?.nome ?? "", c.objeto, FLUXO[c.fluxo].label, STATUS[c.status].label,
        APROVACAO[c.aprovacao].label, ASSINATURA[c.assinatura].label, br(c.fim), c.status === "encerrado" ? "—" : diasAte(c.fim),
        dossieOk(data, c.id) ? "100% OK" : `${dossiePendentes(data, c.id)} pendente(s)`,
      ]),
    );

  if (data.contratos.length === 0) {
    return (
      <Bloco>
        <EmptyStateCard icon="fa-folder-open" text="Nenhum contrato na carteira">
          <p>Os contratos aparecem aqui assim que são criados, já na fase de Elaboração.</p>
          {novo && (
            <div className="mt-6 flex justify-center">
              <Button leftIcon="fa-plus" onClick={novo}>Novo Contrato</Button>
            </div>
          )}
        </EmptyStateCard>
      </Bloco>
    );
  }

  return (
    <div className="space-y-6">
      <Bloco>
        {/* Esteira das sete fases, dentro do cartão e no visual do pipeline da Torre. */}
        <section aria-label="Esteira de fases" className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
          {FASES.map((f) => {
            const ativo = fase === f.id;
            const n = ind.porFase[f.id];
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={ativo}
                onClick={() => setFase(ativo ? "" : f.id)}
                title={ativo ? "Clique de novo para desfazer o filtro" : `Filtrar por ${f.label}`}
                className={cx(
                  "flex items-center justify-between gap-3 rounded-2xl p-4 text-left transition",
                  ativo ? "bg-brand-blue/20 ring-2 ring-brand-blue" : "bg-brand-purple-dark/5 hover:ring-2 hover:ring-brand-blue/30",
                )}
              >
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-brand-purple-dark/50">
                    <Icon name={f.icon} className="mr-1" /> Fase {f.n}
                  </span>
                  <span className="mt-1 block font-bold leading-tight text-brand-purple-dark">{f.label}</span>
                </span>
                <span className={cx("shrink-0 text-3xl font-extrabold tabular-nums", n ? "text-brand-blue-dark" : "text-brand-purple-dark/20")}>{n}</span>
              </button>
            );
          })}
        </section>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-1 flex-wrap items-end gap-3">
              <Input type="search" id="filtro-busca" placeholder="Buscar código, parte ou objeto" leftIcon="fa-magnifying-glass" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-72" inputClass="text-ellipsis" />
              <Input
                type="select"
                id="filtro-monitoramento"
                prompt="Monitoramento: todos"
                value={monitoramento}
                options={Object.entries(MONITORAMENTO).map(([value, label]) => ({ label, value }))}
                onChange={(v) => setMonitoramento((v ?? "") as Monitoramento | "")}
                className="w-52"
              />
              <Input
                type="select"
                id="filtro-status"
                prompt="Todos os status"
                value={status}
                options={Object.entries(STATUS).map(([value, st]) => ({ label: st.label, value }))}
                onChange={(v) => setStatus((v ?? "") as Status | "")}
                className="w-52"
              />
              <Input
                type="select"
                id="filtro-modalidade"
                prompt="Todas as modalidades"
                value={modalidade}
                options={Object.entries(MODALIDADE).map(([value, m]) => ({ label: m.label, value }))}
                onChange={(v) => setModalidade((v ?? "") as Modalidade | "")}
                className="w-52"
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Button variant="tint" leftIcon="fa-file-spreadsheet" onClick={exportar}>
                Exportar planilha
              </Button>
            </div>
          </div>
          <Etiquetas itens={etiquetas} total={etiquetas.length ? lista.length : undefined} onLimpar={limpar} />
        </div>

        {lista.length === 0 ? (
          <EmptyStateCard icon="fa-filter-circle-xmark" text="Nenhum contrato com esses filtros">
            <p>Remova uma etiqueta, mude a busca, os selects ou a fase da esteira, ou limpe os filtros para ver a carteira toda.</p>
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={limpar}>Limpar Todos</Button>
            </div>
          </EmptyStateCard>
        ) : (
          <>
            <style>{`
              /* Em tablet e celular, algumas colunas saem para a tabela caber sem rolagem. */
              @media (max-width: 1023px) {
                .carteira-sem-scroll tr > :nth-child(2),
                .carteira-sem-scroll tr > :nth-child(3),
                .carteira-sem-scroll tr > :nth-child(6),
                .carteira-sem-scroll tr > :nth-child(7),
                .carteira-sem-scroll tr > :nth-child(8) { display: none; }
              }
              @media (max-width: 639px) {
                .carteira-sem-scroll tr > :nth-child(9) { display: none; }
                .carteira-sem-scroll tr > :nth-child(1) { width: 130px; }
              }
            `}</style>
            <Table
              id="carteira"
              className={`${LARGURAS} carteira-sem-scroll ${ACOES_COMPACTAS}`}
              rows={lista}
              rowId={(c) => c.id}
              rowClick={(c) => abrir(c.id)}
              col={[
                {
                  label: "Contrato",
                  render: (c) => (
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-bold text-brand-purple-dark whitespace-nowrap">
                        {c.id} <span className="font-semibold text-brand-purple-dark/50">{c.versao}</span>
                      </span>
                      {c.liminar && <Tag item="Liminar" variant="red" leftIcon="fa-gavel" />}
                    </div>
                  ),
                },
                {
                  label: "Modalidade",
                  render: (c) => (
                    <div className="flex flex-col items-start gap-1">
                      <Selo s={MODALIDADE[c.modalidade]} />
                      <span className="text-sm">{c.categoria}</span>
                    </div>
                  ),
                },
                { label: "Fase", render: (c) => <span className="text-sm font-semibold whitespace-nowrap">{FASES.find((f) => f.id === c.fase)!.n}. {faseLabel(c.fase)}</span> },
                {
                  label: "Parte e objeto",
                  render: (c) => (
                    <div>
                      <p className="font-semibold text-brand-purple-dark">{parteDe(data, c)?.nome}</p>
                      <p className="text-sm line-clamp-2">{c.objeto}</p>
                    </div>
                  ),
                },
                { label: "Aprovação", render: (c) => <Selo s={APROVACAO[c.aprovacao]} /> },
                { label: "Assinatura", render: (c) => <Selo s={ASSINATURA[c.assinatura]} /> },
                {
                  label: "Término",
                  render: (c) => (
                    <div className="whitespace-nowrap">
                      <p>{br(c.fim)}</p>
                      {/* Mesmos limites do filtro de risco (RN-014, RN-070); encerrado não tem faixa. */}
                      {c.status !== "encerrado" ? <Selo s={{ ...FAIXA[faixa(c.fim)], label: diasLabel(c.fim) }} title={FAIXA[faixa(c.fim)].longo} /> : <span className="text-xs text-brand-purple-dark/50">Encerrado</span>}
                    </div>
                  ),
                },
                {
                  label: "Dossiê",
                  render: (c) =>
                    dossieOk(data, c.id) ? (
                      <Tag item="100% OK" variant="green" leftIcon="fa-check" />
                    ) : dossiePendentes(data, c.id) ? (
                      <Tag item={`${dossiePendentes(data, c.id)} pendente${dossiePendentes(data, c.id) === 1 ? "" : "s"}`} variant="yellow" leftIcon="fa-clock" className="whitespace-nowrap" />
                    ) : (
                      <Tag item="Sem checklist" variant="dark-purple" />
                    ),
                },
              ]}
              action={[
                (c) => (
                  <span className="inline-flex gap-1 pr-3">
                    <Button size="small" variant="ghost" title="Abrir ficha" aria-label={`Abrir ficha de ${c.id}`} onClick={(e) => { e.stopPropagation(); abrir(c.id); }}>
                      <Icon name="fa-arrow-up-right-from-square" />
                    </Button>
                    <Button size="small" variant="ghost" title="Exportar PDF" aria-label={`Exportar PDF de ${c.id}`} onClick={(e) => { e.stopPropagation(); setPdf(c); }}>
                      <Icon name="fa-file-pdf" />
                    </Button>
                  </span>
                ),
              ]}
            />
          </>
        )}
      </Bloco>
      <ModalPdfContrato contrato={pdf} data={data} onClose={() => setPdf(null)} />
    </div>
  );
}
