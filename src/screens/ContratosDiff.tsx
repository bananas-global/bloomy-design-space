/**
 * Gestão de Contratos — Diff Jurídico (FR-067, FR-068, FR-069).
 *
 * Compara duas versões da mesma minuta linha a linha sobre o texto, sem a
 * formatação (RN-046): cada título de cláusula e cada parágrafo é uma linha,
 * contada como adicionada, removida ou inalterada, com o total. No modo lado a
 * lado, as duas versões formatadas em folha A4. Sem minuta escolhida, abre a
 * primeira com pelo menos 2 versões (RN-047). Lista os contratos vigentes na
 * versão base, com o motivo da revisão, e gera o Termo Aditivo de adequação
 * (RN-049): minuta nova não muda contrato assinado sozinha.
 *
 * Feito na tela (componente novo para o dev): o diff por linha (com as
 * palavras que mudaram dentro da linha alterada), as contagens e o realce em
 * A4. O resto é `input`, `table`, `modal`, `tag`, `button` e
 * `empty_state_card`.
 *
 * `gerarAdequacao` e `ModalAdequacao` também servem ao catálogo de minutas
 * (painel de contratos impactados, RN-048).
 */
import { useEffect, useMemo, useState } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Icon } from "../components/Icon.js";
import { Input, cx } from "../components/Input.js";
import { EmptyStateCard } from "../components/Layout.js";
import { Modal } from "../components/Overlay.js";
import { Table } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import {
  FAIXA, PAPEL_WORKFLOW, TODAY, br, clausulasDoContrato, diasLabel, faixa, parteDe, proximaVersao, proximoAditivo, rotuloAditivo, valoresDasTags,
  type Aditivo, type Contrato, type ContratosData, type Minuta,
} from "./gestao-de-contratos/model.js";
import { ACOES_COMPACTAS, Aviso, Bloco, ContratosShell, AbasBotao, Dados, FolhaA4, Selo, TextoComTags, paginar, papelDe, irFicha } from "./gestao-de-contratos/ui.js";

type Modo = "linhas" | "lado-a-lado";

/* ------------------------------------------------------------------ */
/* Diff                                                                */
/* ------------------------------------------------------------------ */

type Trecho = { tipo: "igual" | "add" | "rem"; texto: string };

/** LCS genérico: devolve a sequência de igual / rem / add, com a remoção antes da adição. */
function lcs<T>(a: T[], b: T[], igual: (x: T, y: T) => boolean): { tipo: Trecho["tipo"]; item: T }[] {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i]![j] = igual(a[i]!, b[j]!) ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
  const out: { tipo: Trecho["tipo"]; item: T }[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (igual(a[i]!, b[j]!)) { out.push({ tipo: "igual", item: b[j]! }); i++; j++; }
    else if (L[i + 1]![j]! >= L[i]![j + 1]!) out.push({ tipo: "rem", item: a[i++]! });
    else out.push({ tipo: "add", item: b[j++]! });
  }
  while (i < n) out.push({ tipo: "rem", item: a[i++]! });
  while (j < m) out.push({ tipo: "add", item: b[j++]! });
  return out;
}

/** Diff por palavra, mantendo os espaços: realça o que mudou dentro de uma linha alterada. */
function diffPalavras(a: string, b: string): Trecho[] {
  const out: Trecho[] = [];
  for (const { tipo, item } of lcs(a.split(/(\s+)/).filter(Boolean), b.split(/(\s+)/).filter(Boolean), (x, y) => x === y)) {
    const ult = out[out.length - 1];
    if (ult && ult.tipo === tipo) ult.texto += item;
    else out.push({ tipo, texto: item });
  }
  return out;
}

/** Linha do texto da minuta: o título da cláusula ou um parágrafo dela. */
type LinhaTexto = { texto: string; titulo: boolean };
/** Linha do diff. `par`: a linha do outro lado quando a linha foi alterada (remoção seguida de adição). */
type LinhaDiff = { tipo: Trecho["tipo"]; linha: LinhaTexto; par?: string };

/** O texto da minuta em linhas, sem formatação (RN-046). */
function linhasDe(m: Minuta): LinhaTexto[] {
  return m.clausulas.flatMap((c) => [
    { texto: c.titulo.trim(), titulo: true },
    ...c.texto.split("\n").map((l) => l.trim()).filter(Boolean).map((texto) => ({ texto, titulo: false })),
  ]).filter((l) => l.texto);
}

function diffLinhas(base: Minuta, nova: Minuta): LinhaDiff[] {
  const out: LinhaDiff[] = lcs(linhasDe(base), linhasDe(nova), (x, y) => x.texto === y.texto).map(({ tipo, item }) => ({ tipo, linha: item }));
  /* Pareia cada bloco de remoções com as adições que vêm logo depois: a linha alterada mostra as palavras que mudaram. */
  for (let i = 0; i < out.length; ) {
    if (out[i]!.tipo !== "rem") { i++; continue; }
    let r = i; while (r < out.length && out[r]!.tipo === "rem") r++;
    let a = r; while (a < out.length && out[a]!.tipo === "add") a++;
    for (let k = 0; k < Math.min(r - i, a - r); k++) {
      out[i + k]!.par = out[r + k]!.linha.texto;
      out[r + k]!.par = out[i + k]!.linha.texto;
    }
    i = a;
  }
  return out;
}

/** Contagens do RN-046: adicionadas, removidas, inalteradas e o total de linhas. */
function contar(linhas: LinhaDiff[]) {
  const adicionadas = linhas.filter((l) => l.tipo === "add").length;
  const removidas = linhas.filter((l) => l.tipo === "rem").length;
  const inalteradas = linhas.filter((l) => l.tipo === "igual").length;
  return { adicionadas, removidas, inalteradas, total: adicionadas + removidas + inalteradas };
}

function Trechos({ trechos, mostrar }: { trechos: Trecho[]; mostrar: "add" | "rem" }) {
  return (
    <>
      {trechos.map((t, i) =>
        t.tipo === "igual" ? (
          <TextoComTags key={i} texto={t.texto} />
        ) : t.tipo === mostrar ? (
          mostrar === "add" ? (
            <ins key={i} className="rounded bg-brand-green/20 px-0.5 text-brand-green-dark no-underline"><TextoComTags texto={t.texto} /></ins>
          ) : (
            <del key={i} className="rounded bg-red-light px-0.5 text-red-dark line-through"><TextoComTags texto={t.texto} /></del>
          )
        ) : null,
      )}
    </>
  );
}

/** O texto da linha, com as palavras alteradas realçadas quando ela tem par. */
function TextoLinha({ l }: { l: LinhaDiff }) {
  if (l.tipo === "igual" || l.par == null) return <TextoComTags texto={l.linha.texto} />;
  const trechos = l.tipo === "rem" ? diffPalavras(l.linha.texto, l.par) : diffPalavras(l.par, l.linha.texto);
  return <Trechos trechos={trechos} mostrar={l.tipo} />;
}

/* ------------------------------------------------------------------ */
/* Aditivo de adequação (RN-049)                                       */
/* ------------------------------------------------------------------ */

export const ADEQUACAO = {
  tipo: "Adequação de Minuta Homologada",
  impacto: "Sem alteração de valor nominal. Alinhamento de compliance.",
};
const AUTOR = "Marina Alves (Jurídico)";

/** Contrato impactado (RN-048): Vigente, originado de versão da minuta anterior à vigente. */
export const anteriorA = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }) < 0;
export function impactadosPor(contratos: Contrato[], vigente: Minuta) {
  return contratos.filter((c) => c.status === "vigente" && c.minuta?.codigo === vigente.codigo && anteriorA(c.minuta.versao, vigente.versao));
}

/**
 * Gera o "Termo Aditivo" de adequação (RN-049): só para contrato Vigente e
 * versão de minuta existente. Código TA-NN/{contrato}, tipo e impacto fixos,
 * nasce Aprovado e Assinado (regra atual dos aditivos), versão MAJOR do
 * contrato, origem passa à nova versão e as cláusulas não editadas são
 * trocadas pelas da nova versão, já resolvidas com os dados do contrato.
 */
export function gerarAdequacao(data: ContratosData, aditivos: Aditivo[], c: Contrato, m: Minuta): { contrato: Contrato; aditivo: Aditivo } | { erro: string } {
  if (c.status !== "vigente") return { erro: "Só contratos Vigentes recebem o aditivo de adequação." };
  if (!data.minutas.some((x) => x.codigo === m.codigo && x.versao === m.versao)) return { erro: `A ${m.codigo} ${m.versao} não existe no catálogo.` };
  const { numero, codigo } = proximoAditivo(aditivos, c.id);
  const atuais = c.clausulas ?? [];
  const novas = clausulasDoContrato(m, valoresDasTags(c, parteDe(data, c)));
  const clausulas = [...novas.map((n, i) => (atuais[i]?.editada ? atuais[i]! : n)), ...atuais.slice(novas.length).filter((x) => x.editada)];
  const mantidas = clausulas.filter((x) => x.editada).length;
  const versao = proximaVersao(c.versao, "major");
  const origem = c.minuta ? `${c.minuta.codigo} ${c.minuta.versao}` : "sem minuta";
  const motivo = `Alinhamento à versão ${m.versao} homologada da minuta ${m.codigo}. ${m.motivo}`;
  const aditivo: Aditivo = {
    id: `ad-${c.id}-${numero}`, contratoId: c.id, codigo, numero, origem: "adequacao", tipo: ADEQUACAO.tipo, data: TODAY,
    novaVigencia: c.fim, motivo, impacto: ADEQUACAO.impacto, aprovacao: "aprovado", assinatura: "assinado",
  };
  const resumo = `Contrato aditado de ${c.versao} para ${versao} (${codigo}): da ${origem} para a ${m.codigo} ${m.versao}.${mantidas ? ` ${mantidas} cláusula(s) editada(s) mantida(s).` : ""}`;
  const contrato: Contrato = {
    ...c,
    versao,
    minuta: { codigo: m.codigo, versao: m.versao },
    clausulas,
    versoes: [...c.versoes, { versao, data: TODAY, fase: "Aditivos & Reajuste", motivo: ADEQUACAO.tipo, resumo, revisor: AUTOR, clausulas }],
    eventos: [...c.eventos, { id: `${c.id}-ad-${numero}`, data: `${TODAY}T12:00`, tipo: "aditivo", titulo: `${rotuloAditivo(aditivo)} · ${codigo}`, autor: AUTOR, detalhe: ADEQUACAO.impacto }],
    workflow: [...c.workflow, { id: `${c.id}-wf-ad-${numero}`, data: TODAY, workflow: "ciclo", de: "Vigente", para: "Vigente Repactuado", usuario: AUTOR, papel: PAPEL_WORKFLOW.aditivo, parecer: codigo }],
    auditoria: [...c.auditoria, { id: `${c.id}-aud-ad-${numero}`, data: `${TODAY}T12:00`, usuario: AUTOR, perfil: "Jurídico", acao: "GERACAO_ADITIVO_MINUTA", detalhes: `Contrato ${c.id} atualizado para ${versao} via ${codigo} (${m.codigo} ${m.versao}).` }],
  };
  return { contrato, aditivo };
}

/** Confirmação do aditivo de adequação, com o que vai mudar no contrato. */
export function ModalAdequacao({
  show, contrato, minuta, data, aditivos, fechar, confirmar,
}: {
  show: boolean;
  contrato?: Contrato;
  minuta?: Minuta;
  data: ContratosData;
  aditivos: Aditivo[];
  fechar: () => void;
  confirmar: (c: Contrato) => void;
}) {
  /** Mantém o conteúdo durante a animação de saída. */
  const [alvo, setAlvo] = useState<{ c: Contrato; m: Minuta } | undefined>();
  useEffect(() => { if (show && contrato && minuta) setAlvo({ c: contrato, m: minuta }); }, [show, contrato, minuta]);
  const prox = alvo && proximoAditivo(aditivos, alvo.c.id);
  const editadas = alvo?.c.clausulas?.filter((x) => x.editada).length ?? 0;
  return (
    <Modal id="modal-aditivo-adequacao" show={show} onCancel={fechar} title="Gerar Termo Aditivo de adequação" variant="small">
      {alvo && prox && (
        <div className="space-y-4">
          <p className="text-brand-purple-dark/80">
            <strong>{prox.codigo}</strong> · {rotuloAditivo({ numero: prox.numero, origem: "adequacao" })} para <strong>{alvo.c.id}</strong> ({parteDe(data, alvo.c)?.nome}).
          </p>
          <Dados
            colunas={2}
            itens={[
              ["Tipo", ADEQUACAO.tipo],
              ["Impacto", ADEQUACAO.impacto],
              ["Versão do contrato", `${alvo.c.versao} → ${proximaVersao(alvo.c.versao, "major")}`],
              ["Minuta de origem", `${alvo.c.minuta ? `${alvo.c.minuta.codigo} ${alvo.c.minuta.versao}` : "—"} → ${alvo.m.codigo} ${alvo.m.versao}`],
            ]}
          />
          <p className="text-sm text-brand-purple-dark/70">Motivo da revisão: {alvo.m.motivo}</p>
          <p className="text-sm text-brand-purple-dark/70">
            As cláusulas não editadas passam ao texto da {alvo.m.versao}, com as tags já resolvidas.
            {editadas > 0 && ` ${editadas} cláusula(s) editada(s) no contrato ficam como estão.`} O aditivo nasce Aprovado e Assinado e o contrato deixa de aparecer como impactado.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={fechar}>Cancelar</Button>
            <Button leftIcon="fa-file-plus" onClick={() => confirmar(alvo.c)}>Gerar aditivo</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

export function ContratosDiff({ context }: ScreenProps) {
  const papel = papelDe(context, "juridico");
  return (
    <ContratosShell
      context={context}
      secao="diff"
      titulo="Diff Jurídico"
      subtitulo="O que mudou entre duas versões da minuta e quais contratos vigentes precisam de aditivo de adequação."
    >
      {(data) => <Diff key={JSON.stringify(context.controls)} data={data} context={context} podeGerar={papel === "juridico" || papel === "administrador"} />}
    </ContratosShell>
  );
}

const ordemVersao = (a: Minuta, b: Minuta) => b.versao.localeCompare(a.versao, undefined, { numeric: true });

function Diff({ data: dadosIniciais, context, podeGerar }: { data: ContratosData; context: ScenarioContext; podeGerar: boolean }) {
  const controls = context.controls as Record<string, string>;
  /** Controle "Catálogo vazio": simula a implantação sem nenhuma minuta (RN-047). */
  const minutas = controls.catalogo === "vazio" ? [] : dadosIniciais.minutas;
  const [contratos, setContratos] = useState(dadosIniciais.contratos);
  const [aditivos, setAditivos] = useState(dadosIniciais.aditivos);
  const data: ContratosData = { ...dadosIniciais, minutas, contratos, aditivos };

  const codigos = [...new Set(minutas.map((m) => m.codigo))].sort();
  /** Sem minuta escolhida: a primeira com pelo menos 2 versões; sem nenhuma, a primeira (RN-047). */
  const codigoPadrao = codigos.find((c) => minutas.filter((m) => m.codigo === c).length >= 2) ?? codigos[0] ?? "";
  const [modo, setModo] = useState<Modo>(controls.modo === "lado-a-lado" ? "lado-a-lado" : "linhas");
  const [codigo, setCodigo] = useState(codigos.includes(controls.minuta ?? "") ? controls.minuta! : codigoPadrao);
  const versoes = minutas.filter((m) => m.codigo === codigo).sort(ordemVersao);
  const padraoNova = (vs: Minuta[]) => (vs.find((m) => m.status === "vigente") ?? vs[0])?.versao ?? "";
  const padraoBase = (vs: Minuta[], nova: string) => vs.find((m) => anteriorA(m.versao, nova))?.versao ?? nova;
  const [nova, setNova] = useState(() => (versoes.some((m) => m.versao === controls.nova) ? controls.nova! : padraoNova(versoes)));
  const [base, setBase] = useState(() => (versoes.some((m) => m.versao === controls.base) ? controls.base! : padraoBase(versoes, nova)));
  const [confirmar, setConfirmar] = useState<Contrato | undefined>();

  const trocarMinuta = (c: string) => {
    const vs = minutas.filter((m) => m.codigo === c).sort(ordemVersao);
    const n = padraoNova(vs);
    setCodigo(c);
    setNova(n);
    setBase(padraoBase(vs, n));
  };

  const mBase = versoes.find((m) => m.versao === base);
  const mNova = versoes.find((m) => m.versao === nova);
  const unica = versoes.length === 1 ? versoes[0] : undefined;
  const linhas = useMemo(
    () => (unica ? linhasDe(unica).map((linha) => ({ tipo: "igual" as const, linha })) : mBase && mNova ? diffLinhas(mBase, mNova) : []),
    [unica, mBase, mNova],
  );
  const n = contar(linhas);
  const invertida = !!mBase && !!mNova && anteriorA(nova, base);

  /** Contratos vigentes na versão base (FR-068). */
  const naBase = contratos
    .filter((c) => c.status === "vigente" && c.minuta?.codigo === codigo && c.minuta.versao === base && base !== nova)
    .sort((a, b) => a.fim.localeCompare(b.fim));

  const focoImpactados = controls.foco === "impactados";
  useEffect(() => {
    if (focoImpactados) document.getElementById("diff-impactados")?.scrollIntoView({ block: "start" });
  }, [focoImpactados]);

  const gerar = (c: Contrato) => {
    if (!mNova) return;
    const r = gerarAdequacao(data, aditivos, c, mNova);
    setConfirmar(undefined);
    if ("erro" in r) {
      showToast({ type: "error", title: "Aditivo não gerado", content: r.erro, closeTime: 5000 });
      return;
    }
    setAditivos((as) => [...as, r.aditivo]);
    setContratos((cs) => cs.map((x) => (x.id === c.id ? r.contrato : x)));
    showToast({
      type: "success",
      title: `${r.aditivo.codigo} gerado`,
      content: `${rotuloAditivo(r.aditivo)}: ${c.id} passa à ${r.contrato.versao}, originado da ${codigo} ${nova}. Aprovado e Assinado.`,
      closeTime: 5000,
    });
  };

  if (codigos.length === 0) {
    return (
      <Bloco>
        <EmptyStateCard icon="fa-file-circle-question" text="Nenhum modelo cadastrado">
          <p>Cadastre a primeira minuta no catálogo de Minutas Padrão para comparar versões.</p>
        </EmptyStateCard>
      </Bloco>
    );
  }

  const opcoesVersao = versoes.map((m) => ({ label: `${m.versao} · ${m.status === "vigente" ? "Vigente" : "Obsoleta"} · ${br(m.data)}`, value: m.versao }));

  return (
    <div className="space-y-6">
      <Bloco>
        <div className="flex flex-wrap items-end gap-3">
          <Input type="select" id="diff-minuta" label="Minuta" value={codigo} options={codigos.map((c) => ({ label: `${c} · ${minutas.find((m) => m.codigo === c)!.titulo}`, value: c }))} onChange={(v) => v && trocarMinuta(v)} className="w-full sm:w-80" />
          <Input type="select" id="diff-base" label="Versão base" value={base} options={opcoesVersao} onChange={(v) => v && setBase(v)} className="w-full sm:w-64" />
          <Input type="select" id="diff-nova" label="Versão nova" value={nova} options={opcoesVersao} onChange={(v) => v && setNova(v)} className="w-full sm:w-64" />
          <AbasBotao
            id="diff-modo"
            className="ml-auto"
            abas={[{ id: "linhas", titulo: "Linha a linha", icone: "fa-list" }, { id: "lado-a-lado", titulo: "Lado a lado", icone: "fa-columns-3" }]}
            ativa={modo}
            onChange={setModo}
          />
        </div>
        {unica ? (
          <Aviso tom="info" titulo={`${codigo} tem uma versão só (${unica.versao})`}>Não há o que comparar ainda: abaixo, o texto da {unica.versao}. A comparação aparece quando o Jurídico publicar uma revisão desta minuta.</Aviso>
        ) : base === nova ? (
          <Aviso tom="atencao" titulo="Versão base e nova são a mesma">Escolha versões diferentes para ver as diferenças e os contratos impactados.</Aviso>
        ) : null}
        {(unica || base !== nova) && (
          <div className="flex flex-wrap items-center gap-2">
            <Tag item={`+${n.adicionadas} adicionada${n.adicionadas === 1 ? "" : "s"}`} variant="green" leftIcon="fa-plus" />
            <Tag item={`−${n.removidas} removida${n.removidas === 1 ? "" : "s"}`} variant="red" leftIcon="fa-minus" />
            <Tag item={`${n.inalteradas} inalterada${n.inalteradas === 1 ? "" : "s"}`} variant="dark-purple" leftIcon="fa-equals" />
            <Tag item={`${n.total} linha${n.total === 1 ? "" : "s"} no total`} variant="blue" leftIcon="fa-list-ol" />
            {!unica && mNova && <span className="text-sm text-brand-purple-dark/70">Motivo da {nova}: {mNova.motivo}</span>}
            {invertida && <span className="text-sm font-bold text-yellow-dark"><Icon name="fa-triangle-exclamation" className="mr-1" />A base é mais recente que a nova: adições e remoções aparecem invertidas.</span>}
          </div>
        )}

        {/* Comparação e contratos impactados no mesmo cartão da escolha das versões. */}
        {unica
          ? (modo === "linhas" ? <LinhaALinha linhas={linhas} /> : <LadoALado linhas={linhas} base={unica} nova={unica} />)
          : mBase && mNova && base !== nova && (modo === "linhas" ? <LinhaALinha linhas={linhas} /> : <LadoALado linhas={linhas} base={mBase} nova={mNova} />)}

        {!unica && (
          <section
            id="diff-impactados"
            aria-labelledby="diff-impactados-titulo"
            className={cx("mt-4 flex scroll-mt-28 flex-col gap-4", focoImpactados && "rounded-xl ring-2 ring-brand-blue ring-offset-8")}
          >
            <h2 id="diff-impactados-titulo" className="flex items-center gap-2 text-lg font-bold text-brand-purple-dark">
              <Icon name="fa-file-circle-exclamation" className="text-brand-blue" />
              Contratos impactados (vigentes na {codigo} {base})
            </h2>
            {base === nova ? (
              <p className="text-sm text-brand-purple-dark/60">Escolha versões diferentes para ver os contratos impactados.</p>
            ) : naBase.length === 0 ? (
              <EmptyStateCard icon="fa-circle-check" text="Nenhum contrato vigente na versão base">
                <p>{aditivos.length > dadosIniciais.aditivos.length ? `Os aditivos de adequação já foram gerados (${aditivos.slice(dadosIniciais.aditivos.length).map((a) => a.codigo).join(", ")}).` : `Nenhum contrato vigente foi originado da ${codigo} ${base}.`}</p>
              </EmptyStateCard>
            ) : (
              <>
                <p className="text-sm text-brand-purple-dark/70">
                  Minuta nova não muda contrato assinado. Para adequar cada um à {nova}, gere o Termo Aditivo de adequação: o contrato ganha uma versão major, passa à {nova} e as cláusulas não editadas são atualizadas.
                </p>
                {!podeGerar && <Aviso tom="neutro" titulo="Só o Jurídico gera aditivo de adequação">Avise o Jurídico / Compliance sobre os contratos abaixo.</Aviso>}
                {podeGerar && invertida && <Aviso tom="atencao" titulo="Adequação só para uma versão mais nova">A versão nova escolhida é anterior à base: troque as versões para gerar o aditivo.</Aviso>}
                <Table
                  className={ACOES_COMPACTAS}
                  id="diff-impactados-tabela"
                  rows={naBase}
                  rowId={(c) => c.id}
                  rowClick={(c) => irFicha(context, c.id, "diff")}
                  col={[
                    {
                      label: "Contrato",
                      render: (c) => (
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-bold text-brand-purple-dark whitespace-nowrap">{c.id} <span className="font-semibold text-brand-purple-dark/50">{c.versao}</span></span>
                          {c.clausulas?.some((x) => x.editada) && <Tag item="Cláusula personalizada" variant="yellow" leftIcon="fa-pen" title="O contrato tem cláusula editada: ela não é trocada na adequação" />}
                        </div>
                      ),
                    },
                    { label: "Parte", className: "min-w-48", render: (c) => <span className="font-semibold text-brand-purple-dark">{parteDe(data, c)?.nome}</span> },
                    {
                      label: "Término",
                      render: (c) => (
                        <div className="whitespace-nowrap">
                          <p>{br(c.fim)}</p>
                          <Selo s={{ ...FAIXA[faixa(c.fim)], label: diasLabel(c.fim) }} />
                        </div>
                      ),
                    },
                    { label: "Motivo da revisão", className: "min-w-64", render: () => <span className="text-sm">{mNova?.motivo}</span> },
                  ]}
                  action={
                    podeGerar && !invertida
                      ? [
                          (c) => (
                            <span className="inline-flex pr-3">
                              <Button size="small" variant="outline" leftIcon="fa-file-plus" onClick={(e) => { e.stopPropagation(); setConfirmar(c); }}>
                                Gerar Termo Aditivo
                              </Button>
                            </span>
                          ),
                        ]
                      : []
                  }
                />
              </>
            )}
          </section>
        )}
      </Bloco>

      <ModalAdequacao show={!!confirmar} contrato={confirmar} minuta={mNova} data={data} aditivos={aditivos} fechar={() => setConfirmar(undefined)} confirmar={gerar} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modos                                                               */
/* ------------------------------------------------------------------ */

const GUTTER = {
  add: "bg-brand-green/10 border-l-4 border-brand-green",
  rem: "bg-red-light border-l-4 border-red",
  igual: "border-l-4 border-transparent",
};

function LinhaALinha({ linhas }: { linhas: LinhaDiff[] }) {
  return (
    <ol className="overflow-hidden rounded-xl border border-brand-purple-dark/10 divide-y divide-brand-purple-dark/5">
      {linhas.map((l, i) => (
        <li key={i} className={cx("flex gap-3 px-4 py-2", GUTTER[l.tipo], l.linha.titulo && "pt-3")}>
          <span className="w-8 shrink-0 text-right font-mono text-xs leading-6 text-brand-purple-dark/40 tabular-nums" aria-hidden>{i + 1}</span>
          <span className={cx("w-4 shrink-0 font-mono font-bold leading-6", l.tipo === "add" ? "text-brand-green-dark" : l.tipo === "rem" ? "text-red-dark" : "text-brand-purple-dark/30")} aria-hidden>
            {l.tipo === "add" ? "+" : l.tipo === "rem" ? "−" : " "}
          </span>
          <p
            className={cx(
              "min-w-0 flex-1 text-sm leading-6",
              l.linha.titulo && "font-bold",
              l.tipo === "igual" ? "text-brand-purple-dark/60" : l.tipo === "rem" ? "text-red-dark" : "text-brand-purple-dark/90",
              l.tipo === "rem" && l.par == null && "line-through",
            )}
          >
            <TextoLinha l={l} />
          </p>
          <span className="sr-only">{l.tipo === "add" ? "adicionada" : l.tipo === "rem" ? "removida" : "inalterada"}</span>
        </li>
      ))}
    </ol>
  );
}

function LadoALado({ linhas, base, nova }: { linhas: LinhaDiff[]; base: Minuta; nova: Minuta }) {
  const lado = (qual: "base" | "nova") =>
    linhas
      .filter((l) => (qual === "base" ? l.tipo !== "add" : l.tipo !== "rem"))
      .map((l, i) => {
        const Tagname = l.linha.titulo ? "h2" : "p";
        return (
          <Tagname
            key={i}
            className={cx(
              l.linha.titulo ? "pt-1 font-bold" : "text-justify",
              l.tipo === "add" && "rounded bg-brand-green/10 px-1",
              l.tipo === "rem" && "rounded bg-red-light px-1 text-red-dark",
              l.tipo === "rem" && l.par == null && "line-through",
            )}
          >
            <TextoLinha l={l} />
          </Tagname>
        );
      });
  const folha = (m: Minuta, qual: "base" | "nova") => (
    <div className="min-w-0 space-y-2">
      <p className="flex items-center gap-2 font-bold text-brand-purple-dark">
        {m.codigo} {m.versao}
        {base !== nova && <Tag item={qual === "base" ? "Base" : "Nova"} variant={qual === "base" ? "red" : "green"} />}
        <span className="text-sm font-normal text-brand-purple-dark/60">{br(m.data)} · {m.revisor}</span>
      </p>
      <FolhaA4 paginas={paginar(lado(qual), 14)} cabecalho={`${m.codigo} ${m.versao} · ${m.titulo}`} className="p-3! md:p-4!" />
    </div>
  );
  if (base === nova) return folha(nova, "nova");
  return (
    <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
      {folha(base, "base")}
      {folha(nova, "nova")}
    </div>
  );
}
