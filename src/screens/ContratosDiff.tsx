/**
 * Gestão de Contratos — Diff Jurídico.
 *
 * Compara duas versões da mesma minuta, linha a linha (cada cláusula é uma
 * linha; dentro da cláusula alterada, as palavras que mudaram) ou lado a lado
 * em folha A4, e lista os contratos vigentes na versão base: minuta nova não
 * muda contrato assinado sozinha, a adequação é por Termo Aditivo.
 *
 * Feito na tela (componente novo para o dev): o diff por cláusula e por
 * palavra, as contagens e o realce em A4. O resto é `input`,
 * `table`, `modal`, `tag`, `button` e `empty_state_card`.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Icon } from "../components/Icon.js";
import { Input, cx } from "../components/Input.js";
import { EmptyStateCard } from "../components/Layout.js";
import { Modal } from "../components/Overlay.js";
import { Table } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import { FAIXA, br, diasLabel, faixa, parteDe, type Clausula, type Contrato, type ContratosData, type Minuta } from "./gestao-de-contratos/model.js";
import { ACOES_COMPACTAS, Aviso, Bloco, ContratosShell, AbasBotao, FolhaA4, Selo, TextoComTags, paginar, papelDe, irFicha } from "./gestao-de-contratos/ui.js";

type Modo = "linhas" | "lado-a-lado";

/* ------------------------------------------------------------------ */
/* Diff                                                                */
/* ------------------------------------------------------------------ */

type Trecho = { tipo: "igual" | "add" | "rem"; texto: string };

/** Diff por palavra (LCS), mantendo os espaços. */
function diffPalavras(a: string, b: string): Trecho[] {
  const ta = a.split(/(\s+)/).filter(Boolean);
  const tb = b.split(/(\s+)/).filter(Boolean);
  const n = ta.length, m = tb.length;
  const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i]![j] = ta[i] === tb[j] ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
  const out: Trecho[] = [];
  const push = (tipo: Trecho["tipo"], texto: string) => {
    const ult = out[out.length - 1];
    if (ult && ult.tipo === tipo) ult.texto += texto;
    else out.push({ tipo, texto });
  };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (ta[i] === tb[j]) { push("igual", ta[i]!); i++; j++; }
    else if (L[i + 1]![j]! >= L[i]![j + 1]!) push("rem", ta[i++]!);
    else push("add", tb[j++]!);
  }
  while (i < n) push("rem", ta[i++]!);
  while (j < m) push("add", tb[j++]!);
  return out;
}

type Linha =
  | { tipo: "igual"; base: Clausula; nova: Clausula }
  | { tipo: "alterada"; base: Clausula; nova: Clausula }
  | { tipo: "add"; nova: Clausula }
  | { tipo: "rem"; base: Clausula };

/** Alinha as cláusulas pelo id, na ordem da nova, com as removidas no lugar em que estavam. */
function diffClausulas(base: Clausula[], nova: Clausula[]): Linha[] {
  const out: Linha[] = [];
  const idsNova = new Set(nova.map((c) => c.id));
  let bi = 0;
  for (const n of nova) {
    const b = base.find((x) => x.id === n.id);
    if (b) {
      while (bi < base.length && base[bi]!.id !== n.id) {
        if (!idsNova.has(base[bi]!.id)) out.push({ tipo: "rem", base: base[bi]! });
        bi++;
      }
      bi++;
      out.push({ tipo: b.texto === n.texto && b.titulo === n.titulo ? "igual" : "alterada", base: b, nova: n });
    } else out.push({ tipo: "add", nova: n });
  }
  for (; bi < base.length; bi++) if (!idsNova.has(base[bi]!.id)) out.push({ tipo: "rem", base: base[bi]! });
  return out;
}

/** Contagem por linha: a cláusula alterada conta uma remoção (texto antigo) e uma adição (texto novo). */
function contar(linhas: Linha[]) {
  return {
    adicoes: linhas.filter((l) => l.tipo === "add" || l.tipo === "alterada").length,
    remocoes: linhas.filter((l) => l.tipo === "rem" || l.tipo === "alterada").length,
    iguais: linhas.filter((l) => l.tipo === "igual").length,
  };
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
      {(data) => <Diff key={JSON.stringify(context.controls)} data={data} context={context} podeGerar={papel === "juridico"} />}
    </ContratosShell>
  );
}

const ordemVersao = (a: Minuta, b: Minuta) => b.versao.localeCompare(a.versao, undefined, { numeric: true });

function Diff({ data, context, podeGerar }: { data: ContratosData; context: ScenarioContext; podeGerar: boolean }) {
  const controls = context.controls as Record<string, string>;
  const codigos = [...new Set(data.minutas.map((m) => m.codigo))];
  const [modo, setModo] = useState<Modo>(controls.modo === "lado-a-lado" ? "lado-a-lado" : "linhas");
  const [codigo, setCodigo] = useState(codigos.includes(controls.minuta ?? "") ? controls.minuta! : codigos.includes("MIN-PJA") ? "MIN-PJA" : codigos[0] ?? "");
  const versoes = data.minutas.filter((m) => m.codigo === codigo).sort(ordemVersao);
  const padraoNova = (vs: Minuta[]) => (vs.find((m) => m.status === "vigente") ?? vs[0])?.versao ?? "";
  const padraoBase = (vs: Minuta[], nova: string) => vs.find((m) => m.versao !== nova && m.versao.localeCompare(nova, undefined, { numeric: true }) < 0)?.versao ?? nova;
  const [nova, setNova] = useState(() => (versoes.some((m) => m.versao === controls.nova) ? controls.nova! : padraoNova(versoes)));
  const [base, setBase] = useState(() => (versoes.some((m) => m.versao === controls.base) ? controls.base! : padraoBase(versoes, nova)));
  const [gerados, setGerados] = useState<string[]>([]);
  const [confirmar, setConfirmar] = useState<Contrato | undefined>();
  /** Mantém o conteúdo do modal durante a animação de saída. */
  const [alvo, setAlvo] = useState<Contrato | undefined>();
  useEffect(() => { if (confirmar) setAlvo(confirmar); }, [confirmar]);

  const trocarMinuta = (c: string) => {
    const vs = data.minutas.filter((m) => m.codigo === c).sort(ordemVersao);
    const n = padraoNova(vs);
    setCodigo(c);
    setNova(n);
    setBase(padraoBase(vs, n));
  };

  const mBase = versoes.find((m) => m.versao === base);
  const mNova = versoes.find((m) => m.versao === nova);
  const linhas = useMemo(() => (mBase && mNova ? diffClausulas(mBase.clausulas, mNova.clausulas) : []), [mBase, mNova]);
  const n = contar(linhas);

  const impactados = data.contratos
    .filter((c) => c.status === "vigente" && c.minuta?.codigo === codigo && c.minuta.versao === base && base !== nova && !gerados.includes(c.id))
    .sort((a, b) => a.fim.localeCompare(b.fim));

  const focoImpactados = controls.foco === "impactados";
  useEffect(() => {
    if (focoImpactados) document.getElementById("diff-impactados")?.scrollIntoView({ block: "start" });
  }, [focoImpactados]);

  const proximoAditivo = (c: Contrato) => {
    const seq = data.aditivos.filter((a) => a.contratoId === c.id).length + 1;
    return `AD-${c.id.slice(-3)}-${String(seq).padStart(2, "0")}`;
  };
  const gerar = (c: Contrato) => {
    setGerados((g) => [...g, c.id]);
    setConfirmar(undefined);
    showToast({ type: "success", title: "Termo Aditivo criado", content: `${proximoAditivo(c)} de adequação criado em Elaboração para ${c.id}, adequando à ${codigo} ${nova}.`, closeTime: 5000 });
  };

  const opcoesVersao = versoes.map((m) => ({ label: `${m.versao} · ${m.status === "vigente" ? "Vigente" : "Obsoleta"} · ${br(m.data)}`, value: m.versao }));
  const invertida = mBase && mNova && base.localeCompare(nova, undefined, { numeric: true }) > 0;

  return (
    <div className="space-y-6">
      <Bloco>
        <div className="flex flex-wrap items-end gap-3">
          <Input type="select" id="diff-minuta" label="Minuta" value={codigo} options={codigos.map((c) => ({ label: `${c} · ${data.minutas.find((m) => m.codigo === c)!.titulo}`, value: c }))} onChange={(v) => v && trocarMinuta(v)} className="w-full sm:w-80" />
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
        {versoes.length < 2 ? (
          <Aviso tom="info" titulo={`${codigo} tem uma versão só`}>Não há o que comparar ainda. A comparação aparece quando o Jurídico publicar uma revisão desta minuta.</Aviso>
        ) : base === nova ? (
          <Aviso tom="atencao" titulo="Versão base e nova são a mesma">Escolha versões diferentes para ver as diferenças e os contratos impactados.</Aviso>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Tag item={`+${n.adicoes} adiç${n.adicoes === 1 ? "ão" : "ões"}`} variant="green" leftIcon="fa-plus" />
            <Tag item={`−${n.remocoes} remoç${n.remocoes === 1 ? "ão" : "ões"}`} variant="red" leftIcon="fa-minus" />
            <Tag item={`${n.iguais} igua${n.iguais === 1 ? "l" : "is"}`} variant="dark-purple" leftIcon="fa-equals" />
            {mNova && <span className="text-sm text-brand-purple-dark/70">Motivo da {nova}: {mNova.motivo}</span>}
            {invertida && <span className="text-sm font-bold text-yellow-dark"><Icon name="fa-triangle-exclamation" className="mr-1" />A base é mais recente que a nova: adições e remoções aparecem invertidas.</span>}
          </div>
        )}

        {/* Comparação e contratos impactados no mesmo cartão da escolha das versões. */}
        {mBase && mNova && base !== nova && (modo === "linhas" ? <LinhaALinha linhas={linhas} /> : <LadoALado linhas={linhas} base={mBase} nova={mNova} />)}

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
        ) : impactados.length === 0 ? (
          <EmptyStateCard icon="fa-circle-check" text="Nenhum contrato vigente na versão base">
            <p>{gerados.length ? `Os aditivos de adequação já foram gerados (${gerados.join(", ")}).` : `Nenhum contrato vigente foi assinado na ${codigo} ${base}.`}</p>
          </EmptyStateCard>
        ) : (
          <>
            <p className="text-sm text-brand-purple-dark/70">
              Minuta nova não muda contrato assinado. Para adequar cada um à {nova}, gere o Termo Aditivo de adequação: ele nasce em Elaboração e segue a aprovação normal.
            </p>
            {!podeGerar && <Aviso tom="neutro" titulo="Só o Jurídico gera aditivo de adequação">Avise o Jurídico / Compliance sobre os contratos abaixo.</Aviso>}
            <Table
              className={ACOES_COMPACTAS}
              id="diff-impactados-tabela"
              rows={impactados}
              rowId={(c) => c.id}
              rowClick={(c) => irFicha(context, c.id, "diff")}
              col={[
                {
                  label: "Contrato",
                  render: (c) => (
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-bold text-brand-purple-dark whitespace-nowrap">{c.id} <span className="font-semibold text-brand-purple-dark/50">{c.versao}</span></span>
                      {c.clausulas?.some((x) => x.editada) && <Tag item="Cláusula personalizada" variant="yellow" leftIcon="fa-pen" title="O contrato tem cláusula editada em relação à minuta" />}
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
                podeGerar
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
      </Bloco>

      <Modal id="modal-aditivo-adequacao" show={!!confirmar} onCancel={() => setConfirmar(undefined)} title="Gerar Termo Aditivo de adequação" variant="extra_small">
        {alvo && (
          <div className="space-y-4">
            <p className="text-brand-purple-dark/80">
              Criar o <strong>{proximoAditivo(alvo)}</strong> para <strong>{alvo.id}</strong> ({parteDe(data, alvo)?.nome}), adequando o contrato da {codigo} {base} à {nova}.
            </p>
            <p className="text-sm text-brand-purple-dark/70">Motivo: {mNova?.motivo}</p>
            <p className="text-sm text-brand-purple-dark/70">O aditivo nasce em Elaboração e só vai para assinatura depois de aprovado. O contrato sai desta lista.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmar(undefined)}>Cancelar</Button>
              <Button leftIcon="fa-file-plus" onClick={() => gerar(alvo)}>Gerar aditivo</Button>
            </div>
          </div>
        )}
      </Modal>
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

function LinhaDiff({ tipo, titulo, children }: { tipo: "add" | "rem" | "igual"; titulo: ReactNode; children: ReactNode }) {
  return (
    <div className={cx("flex gap-3 px-4 py-3", GUTTER[tipo])}>
      <span className={cx("w-4 shrink-0 font-mono font-bold", tipo === "add" ? "text-brand-green-dark" : tipo === "rem" ? "text-red-dark" : "text-brand-purple-dark/30")} aria-hidden>
        {tipo === "add" ? "+" : tipo === "rem" ? "−" : " "}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cx("font-bold", tipo === "rem" ? "text-red-dark" : "text-brand-purple-dark")}>{titulo}</p>
        <p className={cx("text-sm leading-relaxed", tipo === "igual" ? "text-brand-purple-dark/60" : "text-brand-purple-dark/90")}>{children}</p>
      </div>
      <span className="sr-only">{tipo === "add" ? "adicionada" : tipo === "rem" ? "removida" : "igual"}</span>
    </div>
  );
}

function tituloDiff(a: string, b: string, mostrar: "add" | "rem") {
  return a === b ? a : <Trechos trechos={diffPalavras(a, b)} mostrar={mostrar} />;
}

function LinhaALinha({ linhas }: { linhas: Linha[] }) {
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-brand-purple-dark/10 divide-y divide-brand-purple-dark/10">
        {linhas.map((l, i) => {
          if (l.tipo === "igual") return <LinhaDiff key={i} tipo="igual" titulo={l.nova.titulo}><TextoComTags texto={l.nova.texto} /></LinhaDiff>;
          if (l.tipo === "add") return <LinhaDiff key={i} tipo="add" titulo={l.nova.titulo}><TextoComTags texto={l.nova.texto} /></LinhaDiff>;
          if (l.tipo === "rem") return <LinhaDiff key={i} tipo="rem" titulo={<del>{l.base.titulo}</del>}><del><TextoComTags texto={l.base.texto} /></del></LinhaDiff>;
          const d = diffPalavras(l.base.texto, l.nova.texto);
          return (
            <div key={i} className="divide-y divide-brand-purple-dark/5">
              <LinhaDiff tipo="rem" titulo={tituloDiff(l.base.titulo, l.nova.titulo, "rem")}><Trechos trechos={d} mostrar="rem" /></LinhaDiff>
              <LinhaDiff tipo="add" titulo={tituloDiff(l.base.titulo, l.nova.titulo, "add")}><Trechos trechos={d} mostrar="add" /></LinhaDiff>
            </div>
          );
        })}
      </div>
    </>
  );
}

function LadoALado({ linhas, base, nova }: { linhas: Linha[]; base: Minuta; nova: Minuta }) {
  const lado = (qual: "base" | "nova") =>
    linhas
      .filter((l) => (qual === "base" ? l.tipo !== "add" : l.tipo !== "rem"))
      .map((l, i) => {
        const mostrar = qual === "base" ? "rem" : "add";
        if (l.tipo === "igual") return <section key={i}><h2 className="font-bold">{l.nova.titulo}</h2><p className="text-justify"><TextoComTags texto={l.nova.texto} /></p></section>;
        if (l.tipo === "add") return <section key={i} className="rounded bg-brand-green/10 p-1"><h2 className="font-bold text-brand-green-dark">{l.nova.titulo}</h2><p className="text-justify"><ins className="no-underline"><TextoComTags texto={l.nova.texto} /></ins></p></section>;
        if (l.tipo === "rem") return <section key={i} className="rounded bg-red-light p-1"><h2 className="font-bold text-red-dark line-through">{l.base.titulo}</h2><p className="text-justify line-through text-red-dark"><TextoComTags texto={l.base.texto} /></p></section>;
        return (
          <section key={i}>
            <h2 className="font-bold">{tituloDiff(l.base.titulo, l.nova.titulo, mostrar)}</h2>
            <p className="text-justify"><Trechos trechos={diffPalavras(l.base.texto, l.nova.texto)} mostrar={mostrar} /></p>
          </section>
        );
      });
  const folha = (m: Minuta, qual: "base" | "nova") => (
    <div className="min-w-0 space-y-2">
      <p className="flex items-center gap-2 font-bold text-brand-purple-dark">
        {m.codigo} {m.versao}
        <Tag item={qual === "base" ? "Base" : "Nova"} variant={qual === "base" ? "red" : "green"} />
        <span className="text-sm font-normal text-brand-purple-dark/60">{br(m.data)} · {m.revisor}</span>
      </p>
      <FolhaA4 paginas={paginar(lado(qual), 6)} cabecalho={`${m.codigo} ${m.versao} · ${m.titulo}`} className="p-3! md:p-4!" />
    </div>
  );
  return (
    <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
      {folha(base, "base")}
      {folha(nova, "nova")}
    </div>
  );
}
