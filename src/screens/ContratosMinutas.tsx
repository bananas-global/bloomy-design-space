/**
 * Gestão de Contratos — Minutas Padrão (catálogo e editor).
 *
 * Catálogo com todas as versões (mais recentes primeiro), o editor visual da
 * minuta com o dicionário de tags e os blocos jurídicos, a simulação com dados
 * de exemplo em folha A4 e a publicação da revisão (só uma versão vigente por
 * código). Só o Jurídico edita; os outros papéis veem o catálogo em leitura.
 *
 * Feito na tela (componente novo para o dev): a lista de cláusulas, o painel
 * do dicionário de tags, a barra de blocos jurídicos, o modo tela cheia do
 * editor e o destaque de valores na simulação. O resto é `rich_text`, `table`,
 * `input`, `modal`, `radio_cards`, `tag`, `button` e `empty_state_card`.
 *
 * "Inserir" põe a tag no cursor do editor: o `RichText` não expõe a instância
 * do Quill, então a tela a encontra pelo contêiner (`Quill.find`). Se não
 * achar, a tag vai para o fim da cláusula ativa.
 */
import { useMemo, useState, type ReactNode } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { RadioCards } from "../components/Choice.js";
import { Icon } from "../components/Icon.js";
import { Input, cx } from "../components/Input.js";
import { EmptyStateCard } from "../components/Layout.js";
import { DrawerModal } from "../components/Overlay.js";
import { RichText } from "../components/RichText.js";
import { Table } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import {
  BLOCOS_JURIDICOS, TAGS_MINUTA, TODAY, br, proximaVersao, simular,
  type Clausula, type ContratosData, type Minuta,
} from "./gestao-de-contratos/model.js";
import { ACOES_COMPACTAS, Aviso, Bloco, ContratosShell, Etiquetas, FolhaA4, ROTAS, TagMinuta, TextoComTags, exportarPlanilha, paginar, papelDe, SeloLeitura, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";

type Modo = "catalogo" | "editor" | "simulacao";
type ModalId = "nenhum" | "nova" | "revisao" | "clonar";
type FiltroId = "pja" | "clt" | "corporativo" | "vigentes" | "obsoletas";

const FILTROS: { id: FiltroId; label: string; icon: string }[] = [
  { id: "pja", label: "PJ Assistencial", icon: "fa-user-doctor" },
  { id: "clt", label: "CLT", icon: "fa-id-badge" },
  { id: "corporativo", label: "Corporativo", icon: "fa-building" },
  { id: "vigentes", label: "Vigentes", icon: "fa-circle-check" },
  { id: "obsoletas", label: "Obsoletas", icon: "fa-box-archive" },
];

const STATUS_MINUTA = {
  vigente: { label: "Vigente", variant: "green" as const, icon: "fa-circle-check" },
  obsoleta: { label: "Obsoleta / Arquivada", variant: "dark-purple" as const, icon: "fa-box-archive" },
};

/** Grupo do catálogo a partir da categoria da tabela de apoio. */
function grupoDe(categoria: string): Minuta["grupo"] {
  if (categoria === "PJ Assistencial") return "PJ Assistencial";
  if (categoria === "CLT") return "CLT";
  if (categoria === "Operadora" || categoria === "Particular") return "Receita";
  if (categoria === "Locação") return "Locação";
  return "Corporativo";
}

const ordenar = (ms: Minuta[]) => [...ms].sort((a, b) => b.data.localeCompare(a.data) || b.versao.localeCompare(a.versao, undefined, { numeric: true }));
const vigenteDe = (ms: Minuta[], codigo: string) => ms.find((m) => m.codigo === codigo && m.status === "vigente");

/** Contratos vigentes numa versão diferente da vigente da minuta. */
function emVersaoAntiga(data: ContratosData, ms: Minuta[], codigo: string) {
  const vig = vigenteDe(ms, codigo);
  if (!vig) return [];
  return data.contratos.filter((c) => c.status === "vigente" && c.minuta?.codigo === codigo && c.minuta.versao !== vig.versao);
}

/* ------------------------------------------------------------------ */
/* Texto ⇄ HTML do editor                                              */
/* ------------------------------------------------------------------ */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const paraHtml = (texto: string) => texto.split("\n").map((l) => `<p>${esc(l) || "<br>"}</p>`).join("");
function paraTexto(html: string) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const blocos = Array.from(doc.body.firstElementChild!.children);
  const linhas = blocos.length ? blocos.map((b) => b.textContent ?? "") : [doc.body.textContent ?? ""];
  return linhas.join("\n").replace(/ /g, " ").trim();
}

type Rascunho = Clausula & { html?: string };

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

export function ContratosMinutas({ context }: ScreenProps) {
  const papel = papelDe(context, "juridico");
  const podeEditar = papel === "juridico";
  return (
    <ContratosShell
      context={context}
      secao="minutas"
      titulo="Minutas Padrão"
      subtitulo="Modelos de contrato versionados. Só uma versão de cada código fica vigente; contratos de Adesão nascem dela."
    >
      {(data) => <Minutas key={JSON.stringify(context.controls)} data={data} context={context} podeEditar={podeEditar} />}
    </ContratosShell>
  );
}

function Minutas({ data, context, podeEditar }: { data: ContratosData; context: ScenarioContext; podeEditar: boolean }) {
  const controls = context.controls as Record<string, string>;
  const [minutas, setMinutas] = useState<Minuta[]>(data.minutas);
  const modoInicial = (["catalogo", "editor", "simulacao"].includes(controls.modo ?? "") ? controls.modo : "catalogo") as Modo;
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [modal, setModal] = useState<ModalId>((["nova", "revisao", "clonar"].includes(controls.modal ?? "") ? controls.modal : "nenhum") as ModalId);
  const [abertaId, setAbertaId] = useState<string | undefined>(data.minutas.some((m) => m.id === controls.minuta) ? controls.minuta : modoInicial !== "catalogo" || controls.modal === "revisao" || controls.modal === "clonar" ? "m1" : undefined);
  const aberta = minutas.find((m) => m.id === abertaId);
  const [rascunho, setRascunho] = useState<Rascunho[]>(() => aberta?.clausulas.map((c) => ({ ...c })) ?? []);

  const abrirEditor = (m: Minuta) => {
    setAbertaId(m.id);
    setRascunho(m.clausulas.map((c) => ({ ...c })));
    setModo("editor");
  };
  const voltarCatalogo = () => { setModo("catalogo"); setModal("nenhum"); };
  const comparar = (codigo: string, base: string, nova: string, foco?: string) =>
    context.navigate(ROTAS.diff, { controls: { minuta: codigo, base, nova, ...(foco && { foco }), ...(controls.papel && { papel: controls.papel }) } });

  const publicar = (tipo: "minor" | "major", justificativa: string, revisor: string) => {
    if (!aberta) return;
    const versao = proximaVersao(aberta.versao, tipo);
    const nova: Minuta = {
      ...aberta,
      id: `m${minutas.length + 1}`,
      versao,
      status: "vigente",
      revisor,
      data: TODAY,
      motivo: justificativa,
      clausulas: rascunho.map(({ html: _html, ...c }) => c),
    };
    setMinutas((ms) => [nova, ...ms.map((m) => (m.codigo === aberta.codigo ? { ...m, status: "obsoleta" as const } : m))]);
    setModal("nenhum");
    setModo("catalogo");
    setAbertaId(undefined);
    showToast({ type: "success", title: `${aberta.codigo} ${versao} publicada`, content: `A ${versao} é a vigente; ${aberta.versao} e anteriores ficaram "Obsoleta / Arquivada".`, closeTime: 5000 });
  };

  const criar = (m: Omit<Minuta, "id" | "versao" | "status" | "data">, toast: string) => {
    const nova: Minuta = { ...m, id: `m${minutas.length + 1}`, versao: "v1.0", status: "vigente", data: TODAY };
    setMinutas((ms) => [nova, ...ms]);
    setModal("nenhum");
    showToast({ type: "success", title: `${nova.codigo} v1.0 criada`, content: toast, closeTime: 5000 });
  };

  let corpo: ReactNode;
  if (modo !== "catalogo" && !podeEditar) {
    corpo = (
      <Aviso tom="neutro" titulo="Só o Jurídico edita minutas" acoes={<Button size="small" variant="outline" onClick={voltarCatalogo}>Voltar ao catálogo</Button>}>
        Seu papel vê o catálogo em leitura e pode comparar versões. Para mudar uma minuta, peça a revisão ao Jurídico / Compliance.
      </Aviso>
    );
  } else if (modo !== "catalogo" && !aberta) {
    corpo = (
      <Aviso tom="info" titulo="Nenhuma minuta aberta" acoes={<Button size="small" variant="outline" onClick={voltarCatalogo}>Ir ao catálogo</Button>}>
        Escolha uma minuta vigente no catálogo e clique em Revisar.
      </Aviso>
    );
  } else if (modo === "editor" && aberta) {
    corpo = <Editor minuta={aberta} rascunho={rascunho} setRascunho={setRascunho} voltar={voltarCatalogo} simular={() => setModo("simulacao")} publicar={() => setModal("revisao")} />;
  } else if (modo === "simulacao" && aberta) {
    corpo = <Simulacao minuta={aberta} clausulas={rascunho} voltar={() => setModo("editor")} publicar={() => setModal("revisao")} />;
  } else {
    corpo = (
      <Catalogo
        data={data}
        minutas={minutas}
        podeEditar={podeEditar}
        controls={controls}
        novo={() => setModal("nova")}
        revisar={abrirEditor}
        clonar={(m) => { setAbertaId(m.id); setModal("clonar"); }}
        comparar={comparar}
      />
    );
  }

  return (
    <>
      {corpo}
      {podeEditar && (
        <>
          <ModalNova show={modal === "nova"} minutas={minutas} data={data} fechar={() => setModal("nenhum")} criar={criar} />
          {aberta && <ModalRevisao show={modal === "revisao"} minuta={aberta} fechar={() => setModal("nenhum")} publicar={publicar} />}
          {aberta && <ModalClonar show={modal === "clonar"} origem={aberta} minutas={minutas} data={data} fechar={() => setModal("nenhum")} criar={criar} />}
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Catálogo                                                            */
/* ------------------------------------------------------------------ */

function Catalogo({
  data, minutas, podeEditar, controls, novo, revisar, clonar, comparar,
}: {
  data: ContratosData;
  minutas: Minuta[];
  podeEditar: boolean;
  controls: Record<string, string>;
  novo: () => void;
  revisar: (m: Minuta) => void;
  clonar: (m: Minuta) => void;
  comparar: (codigo: string, base: string, nova: string, foco?: string) => void;
}) {
  const [filtros, setFiltros] = useState(() => {
    const ids = (controls.filtro ?? "").split(",").filter((f): f is FiltroId => FILTROS.some((x) => x.id === f));
    return new Set<FiltroId>([
      ids.find((f) => f === "pja" || f === "clt" || f === "corporativo"),
      ids.find((f) => f === "vigentes" || f === "obsoletas"),
    ].filter((f): f is FiltroId => f !== undefined));
  });
  const [busca, setBusca] = useState("");
  const toggle = (f: FiltroId) => setFiltros((s) => { const n = new Set(s); if (n.has(f)) n.delete(f); else n.add(f); return n; });
  const grupo = [...filtros].find((f) => f === "pja" || f === "clt" || f === "corporativo") ?? "";
  const status = [...filtros].find((f) => f === "vigentes" || f === "obsoletas") ?? "";
  const selecionar = (tipo: "grupo" | "status", value?: string) => setFiltros((atuais) => {
    const proximos = new Set([...atuais].filter((f) => tipo === "grupo" ? !["pja", "clt", "corporativo"].includes(f) : !["vigentes", "obsoletas"].includes(f)));
    if (value) proximos.add(value as FiltroId);
    return proximos;
  });

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const grupos = [...filtros].filter((f) => f === "pja" || f === "clt" || f === "corporativo");
    const status = [...filtros].filter((f) => f === "vigentes" || f === "obsoletas");
    const grupoDoFiltro = { pja: "PJ Assistencial", clt: "CLT", corporativo: "Corporativo" } as const;
    return ordenar(minutas)
      .filter((m) => !grupos.length || grupos.some((g) => m.grupo === grupoDoFiltro[g as keyof typeof grupoDoFiltro]))
      .filter((m) => !status.length || status.some((s) => (s === "vigentes" ? m.status === "vigente" : m.status === "obsoleta")))
      .filter((m) => !q || [m.codigo, m.titulo, m.categoria, m.revisor].some((s) => s.toLowerCase().includes(q)));
  }, [minutas, filtros, busca]);

  const limpar = () => { setFiltros(new Set()); setBusca(""); };
  const etiquetas = [
    ...[...filtros].map((f) => ({ id: f, label: FILTROS.find((x) => x.id === f)!.label, onRemove: () => toggle(f) })),
    ...(busca.trim() ? [{ id: "busca", label: `Busca: "${busca.trim()}"`, onRemove: () => setBusca("") }] : []),
  ];

  /** Os destaques de versão antiga, um por código com vigente. */
  const antigas = [...new Set(minutas.map((m) => m.codigo))]
    .map((codigo) => ({ codigo, vigente: vigenteDe(minutas, codigo), contratos: emVersaoAntiga(data, minutas, codigo) }))
    .filter((x) => x.contratos.length > 0 && x.vigente);

  /** A versão base mais comum dos contratos antigos; só leva ao Diff se ela estiver no catálogo. */
  const baseDe = (codigo: string) => {
    const cs = emVersaoAntiga(data, minutas, codigo);
    const versoes = [...new Set(cs.map((c) => c.minuta!.versao))].sort((a, b) => cs.filter((c) => c.minuta!.versao === b).length - cs.filter((c) => c.minuta!.versao === a).length);
    return versoes.find((v) => minutas.some((m) => m.codigo === codigo && m.versao === v));
  };

  const exportar = () =>
    exportarPlanilha(
      "minutas-padrao",
      ["Código", "Título", "Categoria", "Versão", "Status", "Revisor", "Data", "Cláusulas"],
      lista.map((m) => [m.codigo, m.titulo, m.categoria, m.versao, STATUS_MINUTA[m.status].label, m.revisor, br(m.data), m.clausulas.length]),
    );

  return (
    <div className="space-y-6">
      <Bloco
        avisos={
          <>
          {antigas.length > 0 && (
            <Aviso tom="atencao" titulo="Contratos vigentes em versão antiga da minuta">
              <ul className="space-y-1">
                {antigas.map((a) => {
                  const base = baseDe(a.codigo);
                  return (
                    <li key={a.codigo} className="flex flex-wrap items-center gap-x-2">
                      <span>
                        <strong>{a.codigo}</strong>: {a.contratos.length} contrato{a.contratos.length === 1 ? "" : "s"} vigente{a.contratos.length === 1 ? "" : "s"} em versão anterior à {a.vigente!.versao} ({a.contratos.map((c) => `${c.id} na ${c.minuta!.versao}`).join(", ")}).
                      </span>
                      {base ? (
                        <button type="button" className="font-bold text-brand-blue hover:underline" onClick={() => comparar(a.codigo, base, a.vigente!.versao, "impactados")}>
                          Ver diferenças e impactados
                        </button>
                      ) : (
                        <span className="text-brand-purple-dark/60">A versão de origem não está no catálogo (contrato legado): revise o contrato pela ficha.</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Aviso>
          )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Input type="search" id="minutas-busca" placeholder="Buscar código, título ou revisor" leftIcon="fa-magnifying-glass" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full sm:w-72" inputClass="text-ellipsis" />
            <Input type="select" id="minutas-grupo" label="Grupo" prompt="Todos os grupos" value={grupo} options={FILTROS.filter((f) => ["pja", "clt", "corporativo"].includes(f.id)).map((f) => ({ label: f.label, value: f.id }))} onChange={(v) => selecionar("grupo", v ?? undefined)} className="w-full sm:w-52" />
            <Input type="select" id="minutas-status" label="Status" prompt="Todos os status" value={status} options={FILTROS.filter((f) => f.id === "vigentes" || f.id === "obsoletas").map((f) => ({ label: f.label, value: f.id }))} onChange={(v) => selecionar("status", v ?? undefined)} className="w-full sm:w-48" />
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {!podeEditar && <SeloLeitura motivo="Só o Jurídico / Compliance cria, revisa e clona minutas. Você pode comparar versões no Diff Jurídico." />}
              <Button variant="tint" leftIcon="fa-file-spreadsheet" onClick={exportar}>Exportar planilha</Button>
              {podeEditar && <Button leftIcon="fa-plus" onClick={novo}>Novo modelo</Button>}
            </div>
          </div>
          <Etiquetas itens={etiquetas} onLimpar={limpar} />
        </div>

        {lista.length === 0 ? (
          <EmptyStateCard icon="fa-filter-circle-xmark" text="Nenhuma minuta com esses filtros">
            <p>Remova uma etiqueta ou limpe os filtros para ver o catálogo todo.</p>
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={limpar}>Limpar Todos</Button>
            </div>
          </EmptyStateCard>
        ) : (
          <Table
            className={ACOES_COMPACTAS}
            id="minutas"
            rows={lista}
            rowId={(m) => m.id}
            col={[
              {
                label: "Minuta",
                className: "min-w-64",
                render: (m) => (
                  <div>
                    <p className="font-bold text-brand-purple-dark whitespace-nowrap">{m.codigo} <span className="font-semibold text-brand-purple-dark/50">{m.versao}</span></p>
                    <p className="text-sm">{m.titulo}</p>
                  </div>
                ),
              },
              { label: "Categoria", render: (m) => <span className="text-sm whitespace-nowrap">{m.categoria}</span> },
              {
                label: "Status",
                render: (m) => {
                  const antigos = m.status === "vigente" ? emVersaoAntiga(data, minutas, m.codigo) : [];
                  const base = antigos.length ? baseDe(m.codigo) : undefined;
                  return (
                    <div className="flex flex-col items-start gap-1">
                      <Tag item={STATUS_MINUTA[m.status].label} variant={STATUS_MINUTA[m.status].variant} leftIcon={STATUS_MINUTA[m.status].icon} className="whitespace-nowrap" />
                      {antigos.length > 0 && (
                        <button
                          type="button"
                          disabled={!base}
                          onClick={() => base && comparar(m.codigo, base, m.versao, "impactados")}
                          title={base ? "Ver contratos impactados no Diff Jurídico" : "A versão de origem não está no catálogo"}
                          className={cx("text-left text-xs font-bold text-yellow-dark", base && "hover:underline")}
                        >
                          <Icon name="fa-triangle-exclamation" className="mr-1" />
                          {antigos.length} contrato{antigos.length === 1 ? "" : "s"} vigente{antigos.length === 1 ? "" : "s"} em versão antiga
                        </button>
                      )}
                    </div>
                  );
                },
              },
              { label: "Revisor", render: (m) => <span className="text-sm">{m.revisor}</span> },
              { label: "Data", render: (m) => <span className="whitespace-nowrap">{br(m.data)}</span> },
              { label: "Cláusulas", render: (m) => <span className="tabular-nums">{m.clausulas.length}</span> },
            ]}
            action={[
              (m) => {
                const anterior = ordenar(minutas.filter((x) => x.codigo === m.codigo && x.id !== m.id && x.data <= m.data))[0];
                const vig = vigenteDe(minutas, m.codigo);
                const cmp = m.status === "vigente" ? (anterior ? { base: anterior.versao, nova: m.versao } : undefined) : vig ? { base: m.versao, nova: vig.versao } : undefined;
                return (
                  <span className="inline-flex gap-1 pr-3">
                    {podeEditar && m.status === "vigente" && (
                      <Button size="small" variant="ghost" leftIcon="fa-pen-to-square" onClick={() => revisar(m)} aria-label={`Revisar ${m.codigo} ${m.versao}`}>Revisar</Button>
                    )}
                    {podeEditar && (
                      <Button size="small" variant="ghost" leftIcon="fa-clone" onClick={() => clonar(m)} aria-label={`Clonar ${m.codigo} ${m.versao}`}>Clonar</Button>
                    )}
                    {cmp && (
                      <Button size="small" variant="ghost" leftIcon="fa-code-compare" onClick={() => comparar(m.codigo, cmp.base, cmp.nova)} title={`Comparar ${cmp.base} → ${cmp.nova}`}>Comparar</Button>
                    )}
                  </span>
                );
              },
            ]}
          />
        )}
      </Bloco>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

const EDITOR_ID = "minuta-clausula";
/** Blocos que entram no cursor da cláusula ativa; os outros viram cláusula nova. */
const BLOCOS_NO_CURSOR = new Set(["paragrafo", "unico", "alineas"]);

function Editor({
  minuta, rascunho, setRascunho, voltar, simular: irSimular, publicar,
}: {
  minuta: Minuta;
  rascunho: Rascunho[];
  setRascunho: (f: (r: Rascunho[]) => Rascunho[]) => void;
  voltar: () => void;
  simular: () => void;
  publicar: () => void;
}) {
  const [ativaId, setAtivaId] = useState(rascunho[0]?.id);
  const [telaCheia, setTelaCheia] = useState(false);
  const [buscaTag, setBuscaTag] = useState("");
  /** Muda quando o texto da cláusula é trocado por fora do editor (remonta o RichText). */
  const [versaoEditor, setVersaoEditor] = useState(0);
  const ativa = rascunho.find((c) => c.id === ativaId) ?? rascunho[0];
  const alteradas = rascunho.filter((c) => { const o = minuta.clausulas.find((x) => x.id === c.id); return !o || o.texto !== c.texto || o.titulo !== c.titulo; }).length + minuta.clausulas.filter((o) => !rascunho.some((c) => c.id === o.id)).length;

  const atualizar = (id: string, patch: Partial<Rascunho>) => setRascunho((r) => r.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  /** Põe o texto no cursor do Quill; sem cursor, no fim da cláusula ativa. */
  const inserirNoCursor = async (texto: string) => {
    if (!ativa) return;
    const el = document.getElementById(`${EDITOR_ID}-editor-container`);
    try {
      const { default: Quill } = await import("quill");
      const q = el ? Quill.find(el) : null;
      if (q instanceof Quill) {
        const r = q.getSelection(true) ?? { index: Math.max(0, q.getLength() - 1) };
        q.insertText(r.index, texto, "user");
        q.setSelection(r.index + texto.length, 0, "user");
        return;
      }
    } catch {
      /* cai no fim da cláusula */
    }
    atualizar(ativa.id, { texto: `${ativa.texto} ${texto}`.trim(), html: undefined });
    setVersaoEditor((v) => v + 1);
  };

  const inserirBloco = (b: (typeof BLOCOS_JURIDICOS)[number]) => {
    if (BLOCOS_NO_CURSOR.has(b.id) && ativa) {
      void inserirNoCursor(`\n${b.texto}`);
      return;
    }
    const id = `n${Date.now().toString(36)}`;
    const linhas = b.texto.split("\n");
    const titulo = b.id === "clausula" ? linhas[0]! : b.label;
    const texto = b.id === "clausula" ? linhas.slice(1).join("\n") : b.texto;
    setRascunho((r) => {
      const i = r.findIndex((c) => c.id === ativa?.id);
      const n = [...r];
      n.splice(b.id === "preambulo" ? 0 : i + 1, 0, { id, titulo, texto });
      return n;
    });
    setAtivaId(id);
  };

  const remover = (id: string) => {
    setRascunho((r) => r.filter((c) => c.id !== id));
    if (id === ativaId) setAtivaId(rascunho.find((c) => c.id !== id)?.id);
  };

  const q = buscaTag.trim().toLowerCase();
  const categorias = TAGS_MINUTA.map((c) => ({ ...c, tags: c.tags.filter((t) => !q || t.tag.includes(q) || t.descricao.toLowerCase().includes(q)) })).filter((c) => c.tags.length > 0);

  return (
    <div className={cx(telaCheia && "fixed inset-0 z-40 overflow-y-auto bg-neutral-100 p-4 md:p-6")}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-main">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="small" leftIcon="fa-arrow-left" onClick={voltar}>Catálogo</Button>
            <div>
              <p className="font-bold text-brand-purple-dark">{minuta.codigo} {minuta.versao} · {minuta.titulo}</p>
              <p className="text-sm text-brand-purple-dark/60">
                Revisando a versão vigente · {alteradas ? `${alteradas} cláusula(s) alterada(s)` : "nenhuma alteração ainda"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" leftIcon={telaCheia ? "fa-compress" : "fa-expand"} onClick={() => setTelaCheia((v) => !v)}>
              {telaCheia ? "Sair da tela cheia" : "Tela cheia"}
            </Button>
            <Button variant="outline" leftIcon="fa-file-magnifying-glass" onClick={irSimular}>Simular com Dados Reais</Button>
            <Button leftIcon="fa-paper-plane" onClick={publicar} disabled={alteradas === 0} title={alteradas === 0 ? "Altere ao menos uma cláusula para publicar" : undefined}>Publicar revisão</Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px]">
          {/* Cláusulas */}
          <nav aria-label="Cláusulas" className="rounded-2xl bg-white p-3 shadow-main self-start">
            <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Cláusulas ({rascunho.length})</p>
            <ol className="space-y-1">
              {rascunho.map((c) => {
                const original = minuta.clausulas.find((x) => x.id === c.id);
                const mudou = !original || original.texto !== c.texto || original.titulo !== c.titulo;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setAtivaId(c.id)}
                      aria-current={c.id === ativa?.id}
                      className={cx(
                        "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold",
                        c.id === ativa?.id ? "bg-brand-blue/20 text-brand-blue-dark" : "text-brand-purple-dark/80 hover:bg-brand-purple-dark/5",
                      )}
                    >
                      <span className="flex-1">{c.titulo}</span>
                      {mudou && <Tag item={original ? "Alterada" : "Nova"} variant={original ? "yellow" : "green"} className="shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Editor da cláusula ativa */}
          <div className="space-y-4 min-w-0">
            <div className="rounded-2xl bg-white p-4 shadow-main space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Blocos jurídicos</p>
              <div className="flex flex-wrap gap-2">
                {BLOCOS_JURIDICOS.map((b) => (
                  <Button
                    key={b.id}
                    size="small"
                    variant="tint"
                    leftIcon={BLOCOS_NO_CURSOR.has(b.id) ? "fa-i-cursor" : "fa-plus"}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => inserirBloco(b)}
                    title={BLOCOS_NO_CURSOR.has(b.id) ? "Insere no cursor da cláusula ativa" : "Acrescenta como cláusula nova"}
                  >
                    {b.label}
                  </Button>
                ))}
              </div>
            </div>

            {ativa ? (
              <div className="rounded-2xl bg-white p-4 shadow-main space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <Input id="clausula-titulo" label="Título da cláusula" value={ativa.titulo} onChange={(e) => atualizar(ativa.id, { titulo: e.target.value })} className="flex-1 min-w-60" />
                  <Button variant="outline" color="red" size="medium" leftIcon="fa-trash" onClick={() => remover(ativa.id)} disabled={rascunho.length <= 1} title={rascunho.length <= 1 ? "A minuta precisa de ao menos uma cláusula" : undefined}>
                    Remover cláusula
                  </Button>
                </div>
                <RichText
                  key={`${ativa.id}-${versaoEditor}`}
                  id={EDITOR_ID}
                  value={ativa.html ?? paraHtml(ativa.texto)}
                  onChange={(html) => atualizar(ativa.id, { html, texto: paraTexto(html) })}
                />
                <div className="rounded-xl border border-brand-purple-dark/10 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Prévia (tags em roxo)</p>
                  <div className="whitespace-pre-line font-serif text-sm leading-relaxed text-neutral-900">
                    <TextoComTags texto={ativa.texto} />
                  </div>
                </div>
              </div>
            ) : (
              <EmptyStateCard icon="fa-file-circle-plus" text="Nenhuma cláusula">
                <p>Use um bloco jurídico acima para começar a minuta.</p>
              </EmptyStateCard>
            )}
          </div>

          {/* Dicionário de tags */}
          <aside aria-label="Dicionário de tags" className="rounded-2xl bg-white p-4 shadow-main space-y-3 self-start lg:col-span-2 xl:col-span-1 xl:sticky xl:top-4">
            <div>
              <p className="font-bold text-brand-purple-dark"><Icon name="fa-brackets-curly" className="mr-2 text-purple" />Dicionário de tags</p>
              <p className="text-sm text-brand-purple-dark/60">{TAGS_MINUTA.reduce((s, c) => s + c.tags.length, 0)} tags em {TAGS_MINUTA.length} categorias. "Inserir" põe a tag no cursor.</p>
            </div>
            <Input type="search" id="tags-busca" placeholder="Buscar tag" leftIcon="fa-magnifying-glass" value={buscaTag} onChange={(e) => setBuscaTag(e.target.value)} />
            {categorias.length === 0 ? (
              <p className="text-sm text-brand-purple-dark/60">Nenhuma tag com "{buscaTag.trim()}". Tente parte do nome, como "valor" ou "vigencia".</p>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto thin-scrollbar pr-1">
                {categorias.map((c) => (
                  <section key={c.categoria}>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">{c.categoria}</p>
                    <ul className="divide-y divide-brand-purple-dark/5">
                      {c.tags.map((t) => (
                        <li key={t.tag} className="flex items-center justify-between gap-2 py-2">
                          <div className="min-w-0">
                            <TagMinuta tag={t.tag} />
                            <p className="mt-0.5 text-xs text-brand-purple-dark/60">{t.descricao}</p>
                          </div>
                          <Button size="small" variant="tint" color="purple" onMouseDown={(e) => e.preventDefault()} onClick={() => void inserirNoCursor(`{{${t.tag}}}`)} disabled={!ativa}>
                            Inserir
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Simulação                                                           */
/* ------------------------------------------------------------------ */

function TextoSimulado({ texto }: { texto: string }) {
  return (
    <>
      {simular(texto).map((p, i) =>
        p.tag == null ? (
          <span key={i}>{p.trecho}</span>
        ) : p.valor ? (
          <mark key={i} title={`{{${p.tag}}}`} className="rounded bg-brand-blue/20 px-0.5 text-blue-dark">{p.valor}</mark>
        ) : (
          <mark key={i} title={`{{${p.tag}}} sem valor de exemplo`} className="rounded bg-yellow/20 px-0.5 font-sans text-[0.85em] font-bold text-yellow-dark">
            Variável não preenchida ({p.tag})
          </mark>
        ),
      )}
    </>
  );
}

function Simulacao({ minuta, clausulas, voltar, publicar }: { minuta: Minuta; clausulas: Clausula[]; voltar: () => void; publicar: () => void }) {
  const faltando = [...new Set(clausulas.flatMap((c) => simular(c.texto).filter((p) => p.tag && !p.valor).map((p) => p.tag!)))];
  const preenchidas = new Set(clausulas.flatMap((c) => simular(c.texto).filter((p) => p.tag && p.valor).map((p) => p.tag!))).size;
  const paginas = paginar(clausulas, 5).map((grupo, i) => (
    <>
      {i === 0 && <h1 className="text-center font-bold uppercase">{minuta.titulo}</h1>}
      {grupo.map((c) => (
        <section key={c.id}>
          <h2 className="font-bold">{c.titulo}</h2>
          <p className="whitespace-pre-line text-justify"><TextoSimulado texto={c.texto} /></p>
        </section>
      ))}
    </>
  ));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-main">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="small" leftIcon="fa-arrow-left" onClick={voltar}>Voltar ao editor</Button>
          <div>
            <p className="font-bold text-brand-purple-dark">Simulação · {minuta.codigo} {minuta.versao} (rascunho)</p>
            <p className="text-sm text-brand-purple-dark/60">Tags trocadas pelos dados de exemplo. Nenhum contrato é criado.</p>
          </div>
        </div>
        <Button leftIcon="fa-paper-plane" onClick={publicar}>Publicar revisão</Button>
      </div>
      {faltando.length > 0 ? (
        <Aviso tom="atencao" titulo={`${faltando.length} variável(is) não preenchida(s) no exemplo`}>
          <span className="inline-flex flex-wrap items-center gap-1">
            {faltando.map((t) => <TagMinuta key={t} tag={t} />)}
          </span>{" "}
          No contrato real, o valor vem do cadastro da parte e do contrato; confira se esses campos estão preenchidos antes de gerar o documento.
        </Aviso>
      ) : (
        <Aviso tom="ok" titulo="Todas as variáveis têm valor">{preenchidas} tag(s) trocada(s) por dado de exemplo.</Aviso>
      )}
      <FolhaA4 paginas={paginas} cabecalho={`${minuta.codigo} ${minuta.versao} · simulação com dados de exemplo`} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modais                                                              */
/* ------------------------------------------------------------------ */

function Rodape({ cancelar, confirmar, label, icone }: { cancelar: () => void; confirmar: () => void; label: string; icone: string }) {
  return (
    <div className={RODAPE_DRAWER}>
      <Button variant="outline" onClick={cancelar}>Cancelar</Button>
      <Button leftIcon={icone} onClick={confirmar}>{label}</Button>
    </div>
  );
}

function opcoesCategoria(data: ContratosData) {
  return data.tabelas.categoria.filter((o) => o.ativo).map((o) => ({ label: o.descricao, value: o.descricao }));
}

function ModalRevisao({ show, minuta, fechar, publicar }: { show: boolean; minuta: Minuta; fechar: () => void; publicar: (t: "minor" | "major", j: string, r: string) => void }) {
  const [tipo, setTipo] = useState<"minor" | "major">("minor");
  const [justificativa, setJustificativa] = useState("");
  const [revisor, setRevisor] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const confirmar = () => {
    const e: Record<string, string> = {};
    if (!justificativa.trim()) e.justificativa = "Diga o que mudou e por quê: o motivo vai para os contratos impactados.";
    if (!revisor.trim()) e.revisor = "Informe o revisor responsável pela revisão.";
    setErros(e);
    if (Object.keys(e).length === 0) publicar(tipo, justificativa.trim(), revisor.trim());
  };
  return (
    <DrawerModal id="modal-revisao" show={show} onCancel={fechar} title="Publicar revisão" variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-4">
        <Aviso tom="info">
          Ao publicar, a nova versão fica <strong>Vigente</strong> e {minuta.codigo} {minuta.versao} e anteriores ficam <strong>Obsoleta / Arquivada</strong>. Contratos assinados não mudam: a adequação é por Termo Aditivo, no Diff Jurídico.
        </Aviso>
        <RadioCards
          id="revisao-tipo"
          title="Tipo de revisão"
          value={tipo}
          onChange={(v) => setTipo(v as "minor" | "major")}
          option={[
            { id: "minor", title: "Minor", subtitle: `${minuta.versao} → ${proximaVersao(minuta.versao, "minor")} · ajuste de redação ou cláusula pontual`, icon: "fa-pen" },
            { id: "major", title: "Major", subtitle: `${minuta.versao} → ${proximaVersao(minuta.versao, "major")} · mudança de obrigação, preço ou estrutura`, icon: "fa-layer-group" },
          ]}
        />
        <Input type="textarea" id="revisao-justificativa" label="Justificativa *" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} errors={erros.justificativa ? [erros.justificativa] : []} placeholder="Ex.: Inclusão da cláusula de anticorrupção." />
        <Input id="revisao-revisor" label="Revisor *" value={revisor} onChange={(e) => setRevisor(e.target.value)} errors={erros.revisor ? [erros.revisor] : []} placeholder="Ex.: Dra. Helena Duarte (Jurídico)" />
        <Rodape cancelar={fechar} confirmar={confirmar} label={`Publicar ${proximaVersao(minuta.versao, tipo)}`} icone="fa-paper-plane" />
      </div>
    </DrawerModal>
  );
}

type NovaMinuta = Omit<Minuta, "id" | "versao" | "status" | "data">;

function ModalNova({ show, minutas, data, fechar, criar }: { show: boolean; minutas: Minuta[]; data: ContratosData; fechar: () => void; criar: (m: NovaMinuta, toast: string) => void }) {
  const [f, setF] = useState({ codigo: "", titulo: "", categoria: "", revisor: "", conteudo: "" });
  const [erros, setErros] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const confirmar = () => {
    const e: Record<string, string> = {};
    const codigo = f.codigo.trim().toUpperCase();
    if (!codigo) e.codigo = "Informe o código, como MIN-LOC.";
    else if (minutas.some((m) => m.codigo === codigo)) e.codigo = `${codigo} já existe. Para mudar essa minuta, use Revisar; para outra, escolha um código novo.`;
    if (!f.titulo.trim()) e.titulo = "Informe o título da minuta.";
    if (!f.categoria) e.categoria = "Escolha a categoria.";
    if (!f.revisor.trim()) e.revisor = "Informe o revisor responsável.";
    if (!f.conteudo.trim()) e.conteudo = "Escreva o conteúdo. Separe as cláusulas com uma linha em branco.";
    setErros(e);
    if (Object.keys(e).length) return;
    const clausulas: Clausula[] = f.conteudo.trim().split(/\n\s*\n/).map((t, i) => ({ id: `c${i + 1}`, titulo: i === 0 ? "Preâmbulo" : `Cláusula ${i}ª`, texto: t.trim() }));
    criar({ codigo, titulo: f.titulo.trim(), categoria: f.categoria, grupo: grupoDe(f.categoria), revisor: f.revisor.trim(), motivo: "Versão inicial.", clausulas }, `${clausulas.length} cláusula(s), já disponível para contratos de Adesão.`);
  };
  return (
    <DrawerModal id="modal-nova-minuta" show={show} onCancel={fechar} title="Novo modelo de minuta" variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-4">
        <p className="text-sm text-brand-purple-dark/70">A minuta nasce como <strong>v1.0 Vigente</strong>. Use tags como {"{{parte.nome}}"} para os dados que vêm do contrato.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="nova-codigo" label="Código *" value={f.codigo} onChange={(e) => set("codigo")(e.target.value)} errors={erros.codigo ? [erros.codigo] : []} placeholder="Ex.: MIN-LOC" />
          <Input type="select" id="nova-categoria" label="Categoria *" prompt="Escolha" value={f.categoria} options={opcoesCategoria(data)} onChange={(v) => set("categoria")(v ?? "")} errors={erros.categoria ? [erros.categoria] : []} />
          <Input id="nova-titulo" label="Título *" value={f.titulo} onChange={(e) => set("titulo")(e.target.value)} errors={erros.titulo ? [erros.titulo] : []} placeholder="Ex.: Locação de Imóvel" />
          <Input id="nova-revisor" label="Revisor *" value={f.revisor} onChange={(e) => set("revisor")(e.target.value)} errors={erros.revisor ? [erros.revisor] : []} placeholder="Ex.: Dra. Helena Duarte (Jurídico)" />
        </div>
        <Input type="textarea" id="nova-conteudo" label="Conteúdo *" rows={8} value={f.conteudo} onChange={(e) => set("conteudo")(e.target.value)} errors={erros.conteudo ? [erros.conteudo] : []} placeholder="Preâmbulo. Linha em branco separa uma cláusula da outra." />
        <Rodape cancelar={fechar} confirmar={confirmar} label="Criar v1.0" icone="fa-plus" />
      </div>
    </DrawerModal>
  );
}

function ModalClonar({ show, origem, minutas, data, fechar, criar }: { show: boolean; origem: Minuta; minutas: Minuta[]; data: ContratosData; fechar: () => void; criar: (m: NovaMinuta, toast: string) => void }) {
  const [codigo, setCodigo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [titulo, setTitulo] = useState(`${origem.titulo} (cópia)`);
  const [erros, setErros] = useState<Record<string, string>>({});
  const confirmar = () => {
    const e: Record<string, string> = {};
    const c = codigo.trim().toUpperCase();
    if (!c) e.codigo = "Informe o código novo.";
    else if (minutas.some((m) => m.codigo === c)) e.codigo = `${c} já existe. Escolha um código que não esteja no catálogo.`;
    if (!categoria) e.categoria = "Escolha a categoria da cópia.";
    setErros(e);
    if (Object.keys(e).length) return;
    criar(
      { codigo: c, titulo: titulo.trim() || origem.titulo, categoria, grupo: grupoDe(categoria), revisor: origem.revisor, motivo: `Clonada de ${origem.codigo} ${origem.versao}.`, clausulas: origem.clausulas.map((x) => ({ ...x })) },
      `Cópia de ${origem.codigo} ${origem.versao} com ${origem.clausulas.length} cláusula(s).`,
    );
  };
  return (
    <DrawerModal id="modal-clonar-minuta" show={show} onCancel={fechar} title={`Clonar ${origem.codigo} ${origem.versao}`} variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-4">
        <p className="text-sm text-brand-purple-dark/70">A cópia leva as {origem.clausulas.length} cláusulas e nasce como <strong>v1.0 Vigente</strong>, com histórico próprio. A original não muda.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="clonar-codigo" label="Novo código *" value={codigo} onChange={(e) => setCodigo(e.target.value)} errors={erros.codigo ? [erros.codigo] : []} placeholder="Ex.: MIN-PJF" />
          <Input type="select" id="clonar-categoria" label="Categoria *" prompt="Escolha" value={categoria} options={opcoesCategoria(data)} onChange={(v) => setCategoria(v ?? "")} errors={erros.categoria ? [erros.categoria] : []} />
        </div>
        <Input id="clonar-titulo" label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <Rodape cancelar={fechar} confirmar={confirmar} label="Clonar como v1.0" icone="fa-clone" />
      </div>
    </DrawerModal>
  );
}
