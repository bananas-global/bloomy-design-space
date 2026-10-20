/**
 * Gestão de Contratos — Carteira & Esteira.
 *
 * A esteira das sete fases (um cartão por fase, com a contagem; clicar filtra,
 * clicar de novo desfaz) e a lista da carteira com filtros que se somam. As
 * contagens são as mesmas do painel: ambos leem `indicadores()`.
 *
 * Feito na tela (componente novo): a esteira de fases e as etiquetas de filtro.
 * O resto é `table`, `input`, `tag`, `button` e `empty_state_card`.
 */
import { useMemo, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import { Button } from "../components/Button.js";
import { Icon } from "../components/Icon.js";
import { Input, cx } from "../components/Input.js";
import { EmptyStateCard } from "../components/Layout.js";
import { Table } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import {
  APROVACAO, ASSINATURA, FAIXA, FASES, MODALIDADE, br, diasAte, diasLabel, dossieOk, dossiePendentes, faixa, faseLabel, indicadores, parteDe,
  FLUXO, type Contrato, type ContratosData, type Fase, type Fluxo, type Modalidade,
} from "./gestao-de-contratos/model.js";
import { ACOES_COMPACTAS, Bloco, ContratosShell, ROTAS, Selo, exportarPdf, exportarPlanilha, papelDe, irFicha } from "./gestao-de-contratos/ui.js";

type Situacao = "vigentes" | "critico" | "alerta";
const SITUACAO: Record<Situacao, string> = { vigentes: "Vigentes", critico: "Crítico ≤30d", alerta: "Alerta 31–90d" };

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
 * Crítico e alerta olham só os Vigentes, como os indicadores do painel.
 * "Vigentes" é o KPI Contratos Ativos: status Vigente, em qualquer fase.
 */
function passaSituacao(c: Contrato, s: Situacao | "") {
  if (!s) return true;
  if (c.status !== "vigente") return false;
  const f = faixa(c.fim);
  return s === "vigentes" || (s === "critico" ? f === "critico" || f === "vencido" : f === "alerta");
}

export function ContratosCarteira({ context }: ScreenProps) {
  const papel = papelDe(context);
  const podeCriar = papel !== "diretoria" && papel !== "financeiro" && papel !== "aprovador";
  return (
    <ContratosShell
      context={context}
      secao="carteira"
      titulo="Carteira & Esteira"
      subtitulo="Todos os contratos, por fase do ciclo de vida. Clique numa fase para filtrar."
      acoes={
        podeCriar && (
          <Button leftIcon="fa-plus" onClick={() => context.navigate(ROTAS.novo)}>
            Novo Contrato
          </Button>
        )
      }
    >
      {(data) => <Carteira key={JSON.stringify(context.controls)} data={data} controls={context.controls} abrir={(id) => irFicha(context, id, "carteira")} novo={podeCriar ? () => context.navigate(ROTAS.novo) : undefined} />}
    </ContratosShell>
  );
}

function Carteira({ data, controls, abrir, novo }: { data: ContratosData; controls: Record<string, string>; abrir: (id: string) => void; novo?: () => void }) {
  // Controles com valor sentinela ("nenhum", "todas", "vazia") abrem sem filtro.
  // O controle `monitoramento` (vindo da Torre) pode trazer situação e fluxo juntos: "critico,despesa".
  const mon = (controls.monitoramento ?? "").split(",");
  const [situacao, setSituacao] = useState<Situacao | "">((mon.find((m) => m in SITUACAO) as Situacao | undefined) ?? "");
  const [fluxo, setFluxo] = useState<Fluxo | "">((mon.find((m) => m in FLUXO) as Fluxo | undefined) ?? "");
  const [modalidade, setModalidade] = useState<Modalidade | "">(controls.modalidade && controls.modalidade in MODALIDADE ? (controls.modalidade as Modalidade) : "");
  const [fase, setFase] = useState<Fase | "">(FASES.some((f) => f.id === controls.fase) ? (controls.fase as Fase) : "");
  const [busca, setBusca] = useState(controls.busca && controls.busca !== "vazia" ? controls.busca : "");

  const ind = indicadores(data);
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return data.contratos
      .filter((c) => passaSituacao(c, situacao))
      .filter((c) => !fluxo || c.fluxo === fluxo)
      .filter((c) => !modalidade || c.modalidade === modalidade)
      .filter((c) => !fase || c.fase === fase)
      .filter((c) => !q || [c.id, c.objeto, c.categoria, parteDe(data, c)?.nome ?? ""].some((s) => s.toLowerCase().includes(q)))
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [data, situacao, fluxo, modalidade, fase, busca]);

  const limpar = () => { setSituacao(""); setFluxo(""); setModalidade(""); setFase(""); setBusca(""); };

  const exportar = () =>
    exportarPlanilha(
      "carteira-de-contratos",
      ["Código", "Versão", "Modalidade", "Categoria", "Fase", "Parte", "Objeto", "Aprovação", "Assinatura", "Término", "Dias restantes", "Dossiê"],
      lista.map((c) => [c.id, c.versao, MODALIDADE[c.modalidade].label, c.categoria, faseLabel(c.fase), parteDe(data, c)?.nome ?? "", c.objeto, APROVACAO[c.aprovacao].label, ASSINATURA[c.assinatura].label, br(c.fim), c.status === "encerrado" ? "—" : diasAte(c.fim), dossieOk(data, c.id) ? "100% OK" : `${dossiePendentes(data, c.id)} pendente(s)`]),
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
                id="filtro-situacao"
                prompt="Todas as situações"
                value={situacao}
                options={Object.entries(SITUACAO).map(([value, label]) => ({ label, value }))}
                onChange={(v) => setSituacao((v ?? "") as Situacao | "")}
                className="w-52"
              />
              <Input
                type="select"
                id="filtro-fluxo"
                prompt="Receitas e despesas"
                value={fluxo}
                options={Object.entries(FLUXO).map(([value, f]) => ({ label: f.label, value }))}
                onChange={(v) => setFluxo((v ?? "") as Fluxo | "")}
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
        </div>

        {lista.length === 0 ? (
          <EmptyStateCard icon="fa-filter-circle-xmark" text="Nenhum contrato com esses filtros">
            <p>Mude a busca, os selects ou a fase da esteira, ou limpe os filtros para ver a carteira toda.</p>
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={limpar}>Limpar filtros</Button>
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
                      {c.status === "vigente" ? <Selo s={{ ...FAIXA[faixa(c.fim)], label: diasLabel(c.fim) }} /> : <span className="text-xs text-brand-purple-dark/50">{c.status === "encerrado" ? "Encerrado" : "—"}</span>}
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
                    <Button size="small" variant="ghost" title="Exportar PDF" aria-label={`Exportar PDF de ${c.id}`} onClick={(e) => { e.stopPropagation(); exportarPdf(c.id); }}>
                      <Icon name="fa-file-pdf" />
                    </Button>
                  </span>
                ),
              ]}
              />
          </>
        )}
      </Bloco>
    </div>
  );
}
