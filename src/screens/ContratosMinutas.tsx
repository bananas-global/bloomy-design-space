/**
 * Gestão de Contratos — Minutas Padrão (catálogo e editor), FR-059 a FR-069.
 *
 * Catálogo com todas as versões (mais recentes primeiro), filtros Todas / PJ
 * Assistencial / CLT / Corporativo / Vigentes / Obsoletas e busca; o painel de
 * contratos impactados por minuta desatualizada, com o motivo da revisão e o
 * "Gerar Termo Aditivo" de adequação (RN-048, RN-049); o editor visual da
 * minuta com o dicionário de 24 tags e os 8 blocos jurídicos, usado tanto na
 * revisão quanto no novo modelo; a simulação com dados de exemplo em folha A4;
 * a publicação da revisão (só uma versão vigente por código, RN-043/045) e a
 * criação e o clone de modelos, que nascem v1.0 Vigente (RN-044). Só o
 * Jurídico edita; os outros papéis veem o catálogo em leitura.
 *
 * Feito na tela (componente novo para o dev): a lista de cláusulas, o painel
 * do dicionário de tags, a barra de blocos jurídicos, o modo tela cheia do
 * editor, o destaque de valores na simulação e o campo de código
 * automático / manual. O resto é `rich_text`, `table`, `input`, `modal`,
 * `radio_cards`, `tag`, `button` e `empty_state_card`.
 *
 * "Inserir" põe a tag no cursor do editor, em roxo: o `RichText` não expõe a
 * instância do Quill, então a tela a encontra pelo contêiner (`Quill.find`).
 * Se não achar, a tag vai para o fim da cláusula ativa. O `rich_text` do
 * Phoenix só tem títulos, negrito, itálico, alinhamento e recuo; sublinhado,
 * tachado, cores, listas e citação (FR-061) pedem novos botões no componente.
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
  BLOCOS_JURIDICOS, TAGS_MINUTA, TODAY, br, parteDe, proximaVersao, rotuloAditivo, simular,
  type Clausula, type Contrato, type ContratosData, type Minuta,
} from "./gestao-de-contratos/model.js";
import { ACOES_COMPACTAS, AbasBotao, Aviso, Bloco, ContratosShell, Etiquetas, FolhaA4, ROTAS, TagMinuta, TextoComTags, exportarPlanilha, irFicha, paginar, papelDe, SeloLeitura, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";
import { ModalAdequacao, anteriorA, gerarAdequacao, impactadosPor } from "./ContratosDiff.js";

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
const GRUPOS: FiltroId[] = ["pja", "clt", "corporativo"];
const ehGrupo = (f: FiltroId) => GRUPOS.includes(f);

const STATUS_MINUTA = {
  vigente: { label: "Vigente", variant: "green" as const, icon: "fa-circle-check" },
  obsoleta: { label: "Obsoleta / Arquivada", variant: "dark-purple" as const, icon: "fa-box-archive" },
};

/** Grupo do catálogo a partir da categoria da tabela de apoio. */
function grupoDe(categoria: string): Minuta["grupo"] {
  if (categoria === "PJ Assistencial") return "PJ Assistencial";
  if (categoria === "CLT Trabalho") return "CLT";
  if (categoria === "Operadora Saúde" || categoria === "Paciente Particular") return "Receita";
  if (categoria === "Locação Imobiliária") return "Locação";
  return "Corporativo";
}

const ordenar = (ms: Minuta[]) => [...ms].sort((a, b) => b.data.localeCompare(a.data) || b.versao.localeCompare(a.versao, undefined, { numeric: true }));
const vigenteDe = (ms: Minuta[], codigo: string) => ms.find((m) => m.codigo === codigo && m.status === "vigente");

/** Contratos Vigentes originados de versão anterior à vigente da minuta (RN-048). */
function emVersaoAntiga(contratos: Contrato[], ms: Minuta[], codigo: string) {
  const vig = vigenteDe(ms, codigo);
  return vig ? impactadosPor(contratos, vig) : [];
}

/** Próximo código automático `MIN-NNN`, a partir do sequencial e sem repetir os do catálogo (FR-060). */
function proximoCodigoMinuta(ms: Minuta[], sequencial: string) {
  let n = Number(sequencial.replace(/\D/g, "")) || 1;
  const codigo = (i: number) => `MIN-${String(i).padStart(3, "0")}`;
  while (ms.some((m) => m.codigo === codigo(n))) n++;
  return codigo(n);
}

const CODIGO_REPETIDO = "Código de minuta já existe";
const DESCRICAO_NOVA = "Versão inaugural (v1.0) homologada pelo Jurídico.";
const CLAUSULA_PADRAO_CLONE = "CLÁUSULA 1ª - OBJETO PADRÃO HOMOLOGADO.";

/** Texto inicial do novo modelo (FR-061): preâmbulo, objeto e remuneração, com as tags do dicionário. */
const TEXTO_INICIAL: Clausula[] = [
  { id: "n1", titulo: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS", texto: BLOCOS_JURIDICOS.find((b) => b.id === "preambulo")!.texto },
  { id: "n2", titulo: "CLÁUSULA PRIMEIRA — DO OBJETO", texto: "O presente contrato tem por objeto a {{OBJETO_DETALHADO}}, a ser executada em estrita conformidade com as diretrizes e os prazos acordados." },
  { id: "n3", titulo: "CLÁUSULA SEGUNDA — DA REMUNERAÇÃO E DO PAGAMENTO", texto: "Pelos serviços, a CONTRATANTE pagará à CONTRATADA {{VALOR_MENSAL}} ({{VALOR_MENSAL_EXTENSO}}) por mês, por {{FORMA_PAGAMENTO}}, com vencimento no dia {{DIA_PAGAMENTO_VENCIMENTO}}, mediante documento fiscal válido." },
];

/* ------------------------------------------------------------------ */
/* Texto ⇄ HTML do editor                                              */
/* ------------------------------------------------------------------ */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const paraHtml = (texto: string) => texto.split("\n").map((l) => `<p>${esc(l) || "<br>"}</p>`).join("");
function paraTexto(html: string) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const blocos = Array.from(doc.body.firstElementChild!.children);
  const linhas = blocos.length ? blocos.map((b) => b.textContent ?? "") : [doc.body.textContent ?? ""];
  return linhas.join("\n").replace(/ /g, " ").trim();
}

type Rascunho = Clausula & { html?: string };
const semHtml = (r: Rascunho[]): Clausula[] => r.map(({ html: _html, ...c }) => c);

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

export function ContratosMinutas({ context }: ScreenProps) {
  const papel = papelDe(context, "juridico");
  const podeEditar = papel === "juridico" || papel === "administrador";
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

function Minutas({ data: dadosIniciais, context, podeEditar }: { data: ContratosData; context: ScenarioContext; podeEditar: boolean }) {
  const controls = context.controls as Record<string, string>;
  const [minutas, setMinutas] = useState<Minuta[]>(dadosIniciais.minutas);
  const [contratos, setContratos] = useState(dadosIniciais.contratos);
  const [aditivos, setAditivos] = useState(dadosIniciais.aditivos);
  const data: ContratosData = { ...dadosIniciais, minutas, contratos, aditivos };

  /** Novo modelo: o mesmo editor da revisão, sobre um rascunho com o texto inicial (FR-060, FR-061). */
  const [novo, setNovo] = useState(controls.modal === "nova" || controls.modo === "novo");
  const modoInicial = (["editor", "simulacao"].includes(controls.modo ?? "") ? controls.modo : controls.modo === "novo" || controls.modal === "nova" ? "editor" : "catalogo") as Modo;
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [modal, setModal] = useState<ModalId>((["nova", "revisao", "clonar"].includes(controls.modal ?? "") ? controls.modal : "nenhum") as ModalId);
  const [abertaId, setAbertaId] = useState<string | undefined>(data.minutas.some((m) => m.id === controls.minuta) ? controls.minuta : modoInicial !== "catalogo" || controls.modal === "revisao" || controls.modal === "clonar" ? "m1" : undefined);
  const codigoNovo = proximoCodigoMinuta(minutas, dadosIniciais.proximaMinuta);
  const rascunhoNovo: Minuta = { id: "novo", codigo: codigoNovo, titulo: "Novo modelo de minuta", categoria: "", grupo: "Corporativo", versao: "v1.0", status: "vigente", revisor: "", data: TODAY, motivo: DESCRICAO_NOVA, clausulas: [] };
  const aberta = novo ? rascunhoNovo : minutas.find((m) => m.id === abertaId);
  const [rascunho, setRascunho] = useState<Rascunho[]>(() => (novo ? TEXTO_INICIAL : aberta?.clausulas ?? []).map((c) => ({ ...c })));
  const [adequar, setAdequar] = useState<Contrato | undefined>();

  const abrirEditor = (m: Minuta) => {
    setNovo(false);
    setAbertaId(m.id);
    setRascunho(m.clausulas.map((c) => ({ ...c })));
    setModo("editor");
  };
  const abrirNovo = () => {
    setNovo(true);
    setRascunho(TEXTO_INICIAL.map((c) => ({ ...c })));
    setModo("editor");
  };
  const voltarCatalogo = () => { setModo("catalogo"); setModal("nenhum"); setNovo(false); };
  const comparar = (codigo: string, base: string, nova: string, foco?: string) =>
    context.navigate(ROTAS.diff, { controls: { minuta: codigo, base, nova, ...(foco && { foco }) } });

  /** Publica a revisão (FR-066): nova Vigente, todas as anteriores "Obsoleta / Arquivada" (RN-043, RN-045). */
  const publicar = (tipo: "minor" | "major", justificativa: string, revisor: string): string | undefined => {
    if (!aberta || novo) return "Revise uma minuta existente.";
    const vigente = vigenteDe(minutas, aberta.codigo);
    if (!vigente) return `${aberta.codigo} não tem versão vigente para revisar.`;
    const versao = proximaVersao(vigente.versao, tipo);
    if (minutas.some((m) => m.codigo === aberta.codigo && m.versao === versao)) return `A ${aberta.codigo} ${versao} já existe: uma versão publicada não pode ser publicada de novo.`;
    const nova: Minuta = {
      ...vigente,
      id: `m${minutas.length + 1}`,
      titulo: vigente.titulo || `Minuta Padrão ${vigente.codigo}`,
      categoria: vigente.categoria || "Geral",
      versao,
      status: "vigente",
      revisor,
      data: TODAY,
      motivo: justificativa,
      clausulas: rascunho.length ? semHtml(rascunho) : vigente.clausulas,
    };
    setMinutas((ms) => [nova, ...ms.map((m) => (m.codigo === aberta.codigo ? { ...m, status: "obsoleta" as const } : m))]);
    setModal("nenhum");
    setModo("catalogo");
    setAbertaId(undefined);
    showToast({ type: "success", title: `${aberta.codigo} ${versao} publicada`, content: `A ${versao} é a vigente; ${vigente.versao} e anteriores ficaram "Obsoleta / Arquivada".`, closeTime: 5000 });
    return undefined;
  };

  /** Minuta nova ou clonada: v1.0 Vigente com a data do dia (RN-044). */
  const criar = (m: Omit<Minuta, "id" | "versao" | "status" | "data">, toast: string): string | undefined => {
    if (minutas.some((x) => x.codigo === m.codigo)) return CODIGO_REPETIDO;
    const nova: Minuta = { ...m, id: `m${minutas.length + 1}`, versao: "v1.0", status: "vigente", data: TODAY };
    setMinutas((ms) => [nova, ...ms]);
    setModal("nenhum");
    setModo("catalogo");
    setNovo(false);
    showToast({ type: "success", title: `${nova.codigo} v1.0 criada`, content: toast, closeTime: 5000 });
    return undefined;
  };

  const gerar = (c: Contrato) => {
    setAdequar(undefined);
    const vig = c.minuta && vigenteDe(minutas, c.minuta.codigo);
    if (!vig) return;
    const r = gerarAdequacao(data, aditivos, c, vig);
    if ("erro" in r) {
      showToast({ type: "error", title: "Aditivo não gerado", content: r.erro, closeTime: 5000 });
      return;
    }
    setAditivos((as) => [...as, r.aditivo]);
    setContratos((cs) => cs.map((x) => (x.id === c.id ? r.contrato : x)));
    showToast({ type: "success", title: `${r.aditivo.codigo} gerado`, content: `${rotuloAditivo(r.aditivo)}: ${c.id} passa à ${r.contrato.versao}, originado da ${vig.codigo} ${vig.versao}. Aprovado e Assinado.`, closeTime: 5000 });
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
    corpo = <Editor minuta={aberta} novo={novo} rascunho={rascunho} setRascunho={setRascunho} voltar={voltarCatalogo} simular={() => setModo("simulacao")} publicar={() => setModal(novo ? "nova" : "revisao")} />;
  } else if (modo === "simulacao" && aberta) {
    corpo = <Simulacao minuta={aberta} novo={novo} clausulas={rascunho} voltar={() => setModo("editor")} publicar={() => setModal(novo ? "nova" : "revisao")} />;
  } else {
    corpo = (
      <Catalogo
        data={data}
        context={context}
        podeEditar={podeEditar}
        controls={controls}
        novo={abrirNovo}
        revisar={abrirEditor}
        clonar={(m) => { setAbertaId(m.id); setModal("clonar"); }}
        comparar={comparar}
        adequar={setAdequar}
      />
    );
  }

  const vigenteDoAlvo = adequar?.minuta ? vigenteDe(minutas, adequar.minuta.codigo) : undefined;

  return (
    <>
      {corpo}
      {podeEditar && (
        <>
          <ModalNova show={modal === "nova" && novo} codigoAuto={codigoNovo} clausulas={rascunho} data={data} fechar={() => setModal("nenhum")} criar={criar} />
          {aberta && !novo && <ModalRevisao show={modal === "revisao"} minuta={vigenteDe(minutas, aberta.codigo) ?? aberta} alterada={alteracoes(aberta, rascunho) > 0} fechar={() => setModal("nenhum")} publicar={publicar} />}
          {aberta && !novo && <ModalClonar show={modal === "clonar"} origem={vigenteDe(minutas, aberta.codigo) ?? aberta} codigoAuto={codigoNovo} data={data} fechar={() => setModal("nenhum")} criar={criar} />}
          <ModalAdequacao show={!!adequar} contrato={adequar} minuta={vigenteDoAlvo} data={data} aditivos={aditivos} fechar={() => setAdequar(undefined)} confirmar={gerar} />
        </>
      )}
    </>
  );
}

/** Quantas cláusulas do rascunho diferem da minuta (alteradas, novas ou removidas). */
function alteracoes(minuta: Minuta, rascunho: Rascunho[]) {
  return rascunho.filter((c) => { const o = minuta.clausulas.find((x) => x.id === c.id); return !o || o.texto !== c.texto || o.titulo !== c.titulo; }).length + minuta.clausulas.filter((o) => !rascunho.some((c) => c.id === o.id)).length;
}

/* ------------------------------------------------------------------ */
/* Catálogo                                                            */
/* ------------------------------------------------------------------ */

function Catalogo({
  data, context, podeEditar, controls, novo, revisar, clonar, comparar, adequar,
}: {
  data: ContratosData;
  context: ScenarioContext;
  podeEditar: boolean;
  controls: Record<string, string>;
  novo: () => void;
  revisar: (m: Minuta) => void;
  clonar: (m: Minuta) => void;
  comparar: (codigo: string, base: string, nova: string, foco?: string) => void;
  adequar: (c: Contrato) => void;
}) {
  const { minutas, contratos } = data;
  const [filtros, setFiltros] = useState(() => {
    const ids = (controls.filtro ?? "").split(",").filter((f): f is FiltroId => FILTROS.some((x) => x.id === f));
    return new Set<FiltroId>([ids.find(ehGrupo), ids.find((f) => !ehGrupo(f))].filter((f): f is FiltroId => f !== undefined));
  });
  const [busca, setBusca] = useState("");
  /** Um filtro de grupo e um de status por vez; clicar no ativo desliga. */
  const alternar = (f: FiltroId) => setFiltros((atuais) => {
    if (atuais.has(f)) return new Set([...atuais].filter((x) => x !== f));
    return new Set([...[...atuais].filter((x) => ehGrupo(x) !== ehGrupo(f)), f]);
  });

  /** Corporativo: tudo que não é PJ Assistencial nem CLT (receita, locação, corporativo). */
  const doGrupo = (m: Minuta, g: FiltroId) => (g === "pja" ? m.grupo === "PJ Assistencial" : g === "clt" ? m.grupo === "CLT" : m.grupo !== "PJ Assistencial" && m.grupo !== "CLT");
  const passa = (m: Minuta, fs: Set<FiltroId>) => {
    const grupo = [...fs].find(ehGrupo);
    const status = [...fs].find((f) => !ehGrupo(f));
    return (!grupo || doGrupo(m, grupo)) && (!status || (status === "vigentes" ? m.status === "vigente" : m.status === "obsoleta"));
  };
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return ordenar(minutas)
      .filter((m) => passa(m, filtros))
      .filter((m) => !q || [m.codigo, m.titulo, m.categoria, m.revisor].some((s) => s.toLowerCase().includes(q)));
  }, [minutas, filtros, busca]);

  const limpar = () => { setFiltros(new Set()); setBusca(""); };
  const etiquetas = [
    ...[...filtros].map((f) => ({ id: f, label: FILTROS.find((x) => x.id === f)!.label, onRemove: () => alternar(f) })),
    ...(busca.trim() ? [{ id: "busca", label: `Busca: "${busca.trim()}"`, onRemove: () => setBusca("") }] : []),
  ];

  /** Os contratos impactados, um grupo por código com vigente (RN-048). */
  const antigas = [...new Set(minutas.map((m) => m.codigo))]
    .map((codigo) => ({ codigo, vigente: vigenteDe(minutas, codigo), contratos: emVersaoAntiga(contratos, minutas, codigo) }))
    .filter((x) => x.contratos.length > 0 && x.vigente);

  /** A versão base mais comum dos contratos antigos; só leva ao Diff se ela estiver no catálogo. */
  const baseDe = (codigo: string) => {
    const cs = emVersaoAntiga(contratos, minutas, codigo);
    const versoes = [...new Set(cs.map((c) => c.minuta!.versao))].sort((a, b) => cs.filter((c) => c.minuta!.versao === b).length - cs.filter((c) => c.minuta!.versao === a).length);
    return versoes.find((v) => minutas.some((m) => m.codigo === codigo && m.versao === v));
  };

  const exportar = () =>
    exportarPlanilha(
      "minutas-padrao",
      ["Código", "Título", "Categoria", "Versão", "Status", "Revisor", "Data", "Descrição", "Cláusulas"],
      lista.map((m) => [m.codigo, m.titulo, m.categoria, m.versao, STATUS_MINUTA[m.status].label, m.revisor, br(m.data), m.motivo, m.clausulas.length]),
    );

  return (
    <div className="space-y-6">
      {antigas.length > 0 && (
        <Bloco
          titulo="Contratos impactados por minuta desatualizada"
          icone="fa-file-circle-exclamation"
          acoes={!podeEditar && <SeloLeitura motivo="Só o Jurídico / Compliance gera o aditivo de adequação." />}
        >
          <p className="text-sm text-brand-purple-dark/70">
            Contratos Vigentes originados de uma versão anterior à vigente da minuta. Minuta nova não muda contrato assinado: a adequação é pelo Termo Aditivo, que atualiza as cláusulas não editadas.
          </p>
          {antigas.map((a) => {
            const base = baseDe(a.codigo);
            return (
              <section key={a.codigo} className="space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-bold text-brand-purple-dark">{a.codigo} {a.vigente!.versao} <span className="font-semibold text-brand-purple-dark/60">· {a.contratos.length} contrato{a.contratos.length === 1 ? "" : "s"}</span></p>
                  <p className="text-sm text-brand-purple-dark/70">Motivo da revisão: {a.vigente!.motivo}</p>
                  {base && (
                    <button type="button" className="text-sm font-bold text-brand-blue hover:underline sm:ml-auto" onClick={() => comparar(a.codigo, base, a.vigente!.versao, "impactados")}>
                      Ver diferenças ({base} → {a.vigente!.versao})
                    </button>
                  )}
                </div>
                <Table
                  className={ACOES_COMPACTAS}
                  id={`impactados-${a.codigo}`}
                  rows={a.contratos}
                  rowId={(c) => c.id}
                  rowClick={(c) => irFicha(context, c.id, "minutas")}
                  col={[
                    {
                      label: "Contrato",
                      render: (c) => (
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-bold text-brand-purple-dark whitespace-nowrap">{c.id} <span className="font-semibold text-brand-purple-dark/50">{c.versao}</span></span>
                          {c.clausulas?.some((x) => x.editada) && <Tag item="Cláusula personalizada" variant="yellow" leftIcon="fa-pen" title="A cláusula editada não é trocada na adequação" />}
                        </div>
                      ),
                    },
                    { label: "Parte", className: "min-w-48", render: (c) => <span className="font-semibold text-brand-purple-dark">{parteDe(data, c)?.nome}</span> },
                    {
                      label: "Versão de origem",
                      render: (c) => (
                        <span className="whitespace-nowrap text-sm">
                          {c.minuta!.versao} → {a.vigente!.versao}
                          {!minutas.some((m) => m.codigo === a.codigo && m.versao === c.minuta!.versao) && <span className="block text-xs text-brand-purple-dark/60">Fora do catálogo (legado)</span>}
                        </span>
                      ),
                    },
                    { label: "Término", render: (c) => <span className="whitespace-nowrap">{br(c.fim)}</span> },
                  ]}
                  action={
                    podeEditar
                      ? [
                          (c) => (
                            <span className="inline-flex pr-3">
                              <Button size="small" variant="outline" leftIcon="fa-file-plus" onClick={(e) => { e.stopPropagation(); adequar(c); }}>Gerar Termo Aditivo</Button>
                            </span>
                          ),
                        ]
                      : []
                  }
                />
              </section>
            );
          })}
        </Bloco>
      )}

      <Bloco>
        <div className="flex flex-col gap-4">
          {/* `button_tabs`: um filtro por vez (FR-059), com a contagem no título. */}
          <AbasBotao<FiltroId | "todas">
            id="minutas-filtro"
            className="self-start"
            ativa={filtros.size === 1 ? [...filtros][0]! : "todas"}
            onChange={(id) => setFiltros(id === "todas" ? new Set() : new Set([id]))}
            abas={[
              { id: "todas", titulo: `Todas (${minutas.length})` },
              ...FILTROS.map((f) => ({ id: f.id, titulo: `${f.label} (${minutas.filter((m) => passa(m, new Set([f.id]))).length})` })),
            ]}
          />
          <div className="flex flex-wrap items-end gap-3">
            <Input type="search" id="minutas-busca" placeholder="Buscar código, título ou revisor" leftIcon="fa-magnifying-glass" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full sm:w-72" inputClass="text-ellipsis" />
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
                    <p className="text-xs text-brand-purple-dark/60">{m.motivo}</p>
                  </div>
                ),
              },
              { label: "Categoria", render: (m) => <span className="text-sm whitespace-nowrap">{m.categoria}</span> },
              {
                label: "Status",
                render: (m) => {
                  const antigos = m.status === "vigente" ? emVersaoAntiga(contratos, minutas, m.codigo) : [];
                  return (
                    <div className="flex flex-col items-start gap-1">
                      <Tag item={STATUS_MINUTA[m.status].label} variant={STATUS_MINUTA[m.status].variant} leftIcon={STATUS_MINUTA[m.status].icon} className="whitespace-nowrap" />
                      {antigos.length > 0 && (
                        <span className="text-left text-xs font-bold text-yellow-dark">
                          <Icon name="fa-triangle-exclamation" className="mr-1" />
                          {antigos.length} contrato{antigos.length === 1 ? "" : "s"} impactado{antigos.length === 1 ? "" : "s"}
                        </span>
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
                const anterior = ordenar(minutas.filter((x) => x.codigo === m.codigo && x.id !== m.id && anteriorA(x.versao, m.versao)))[0];
                const vig = vigenteDe(minutas, m.codigo);
                const cmp = m.status === "vigente" ? (anterior ? { base: anterior.versao, nova: m.versao } : undefined) : vig ? { base: m.versao, nova: vig.versao } : undefined;
                return (
                  <span className="inline-flex gap-1 pr-3">
                    {podeEditar && m.status === "vigente" && (
                      <Button size="small" variant="ghost" leftIcon="fa-pen-to-square" onClick={() => revisar(m)} aria-label={`Revisar ${m.codigo} ${m.versao}`}>Revisar</Button>
                    )}
                    {podeEditar && (
                      <Button size="small" variant="ghost" leftIcon="fa-clone" onClick={() => clonar(m)} aria-label={`Clonar ${m.codigo}`}>Clonar</Button>
                    )}
                    <Button
                      size="small"
                      variant="ghost"
                      leftIcon="fa-code-compare"
                      onClick={() => comparar(m.codigo, cmp?.base ?? m.versao, cmp?.nova ?? m.versao)}
                      title={cmp ? `Comparar ${cmp.base} → ${cmp.nova}` : "Versão única: abre o texto no Diff Jurídico"}
                    >
                      Comparar
                    </Button>
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
/** Na revisão de minuta existente, Preâmbulo e Foro não são oferecidos (FR-063). */
const SO_NO_NOVO = new Set(["preambulo", "foro"]);
/** A tag inserida fica em roxo (cor das tags) e o texto seguinte volta ao normal (FR-062). */
const COR_TAG = "var(--color-purple)";

function Editor({
  minuta, novo, rascunho, setRascunho, voltar, simular: irSimular, publicar,
}: {
  minuta: Minuta;
  novo: boolean;
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
  const alteradas = alteracoes(minuta, rascunho);
  const blocos = BLOCOS_JURIDICOS.filter((b) => novo || !SO_NO_NOVO.has(b.id));

  const atualizar = (id: string, patch: Partial<Rascunho>) => setRascunho((r) => r.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  /** Põe o texto no cursor do Quill; sem cursor, no fim da cláusula ativa. `tag`: em roxo. */
  const inserirNoCursor = async (texto: string, tag = false) => {
    if (!ativa) return;
    const el = document.getElementById(`${EDITOR_ID}-editor-container`);
    try {
      const { default: Quill } = await import("quill");
      const q = el ? Quill.find(el) : null;
      if (q instanceof Quill) {
        const r = q.getSelection(true) ?? { index: Math.max(0, q.getLength() - 1) };
        if (tag) {
          q.insertText(r.index, texto, { color: COR_TAG, bold: true }, "user");
          q.insertText(r.index + texto.length, " ", { color: false, bold: false }, "user");
          q.setSelection(r.index + texto.length + 1, 0, "user");
        } else {
          q.insertText(r.index, texto, "user");
          q.setSelection(r.index + texto.length, 0, "user");
        }
        return;
      }
    } catch {
      /* cai no fim da cláusula */
    }
    atualizar(ativa.id, { texto: `${ativa.texto} ${texto}`.trim(), html: undefined });
    setVersaoEditor((v) => v + 1);
  };

  const novaClausula = () => {
    const id = `n${Date.now().toString(36)}`;
    setRascunho((r) => {
      const i = r.findIndex((c) => c.id === ativa?.id);
      const n = [...r];
      n.splice(i + 1, 0, { id, titulo: `Cláusula ${r.length}ª`, texto: "" });
      return n;
    });
    setAtivaId(id);
  };

  const remover = (id: string) => {
    setRascunho((r) => r.filter((c) => c.id !== id));
    if (id === ativaId) setAtivaId(rascunho.find((c) => c.id !== id)?.id);
  };

  const q = buscaTag.trim().toLowerCase();
  const categorias = TAGS_MINUTA.map((c) => ({ ...c, tags: c.tags.filter((t) => !q || [t.tag, t.label, t.descricao].some((s) => s.toLowerCase().includes(q))) })).filter((c) => c.tags.length > 0);

  return (
    <div className={cx(telaCheia && "fixed inset-0 z-40 overflow-y-auto bg-neutral-100 p-4 md:p-6")}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-main">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="small" leftIcon="fa-arrow-left" onClick={voltar}>Catálogo</Button>
            <div>
              <p className="font-bold text-brand-purple-dark">{novo ? `Novo modelo · ${minuta.codigo} v1.0 (código previsto)` : `${minuta.codigo} ${minuta.versao} · ${minuta.titulo}`}</p>
              <p className="text-sm text-brand-purple-dark/60">
                {novo
                  ? "Comece pelo texto inicial: tags e blocos jurídicos entram no cursor."
                  : `Revisando a versão vigente · ${alteradas ? `${alteradas} cláusula(s) alterada(s)` : "nenhuma alteração ainda: sem texto novo, a revisão herda as cláusulas vigentes"}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" leftIcon={telaCheia ? "fa-compress" : "fa-expand"} onClick={() => setTelaCheia((v) => !v)}>
              {telaCheia ? "Sair da tela cheia" : "Tela cheia"}
            </Button>
            <Button variant="outline" leftIcon="fa-file-magnifying-glass" onClick={irSimular}>Simular com Dados Reais</Button>
            <Button leftIcon={novo ? "fa-plus" : "fa-paper-plane"} onClick={publicar}>{novo ? "Criar modelo" : "Publicar revisão"}</Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px]">
          {/* Cláusulas */}
          <nav aria-label="Cláusulas" className="rounded-2xl bg-white p-3 shadow-main self-start space-y-2">
            <p className="px-2 text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Cláusulas ({rascunho.length})</p>
            <ol className="space-y-1">
              {rascunho.map((c) => {
                const original = minuta.clausulas.find((x) => x.id === c.id);
                const mudou = !novo && (!original || original.texto !== c.texto || original.titulo !== c.titulo);
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
                      <span className="flex-1">{c.titulo || "Sem título"}</span>
                      {mudou && <Tag item={original ? "Alterada" : "Nova"} variant={original ? "yellow" : "green"} className="shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ol>
            <Button size="small" variant="ghost" leftIcon="fa-plus" onClick={novaClausula} className="w-full">Nova cláusula</Button>
          </nav>

          {/* Editor da cláusula ativa */}
          <div className="space-y-4 min-w-0">
            <div className="rounded-2xl bg-white p-4 shadow-main space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Blocos jurídicos ({blocos.length})</p>
              <div className="flex flex-wrap gap-2">
                {blocos.map((b) => (
                  <Button
                    key={b.id}
                    size="small"
                    variant="tint"
                    leftIcon="fa-i-cursor"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void inserirNoCursor(b.texto)}
                    disabled={!ativa}
                    title="Insere no cursor da cláusula ativa"
                  >
                    {b.label}
                  </Button>
                ))}
              </div>
              {!novo && <p className="text-xs text-brand-purple-dark/60">Preâmbulo e Foro só aparecem no novo modelo: na revisão, eles já estão na minuta.</p>}
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
                  showHeadings
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
                <p>Use "Nova cláusula" para começar a minuta.</p>
              </EmptyStateCard>
            )}
          </div>

          {/* Dicionário de tags */}
          <aside aria-label="Dicionário de tags" className="rounded-2xl bg-white p-4 shadow-main space-y-3 self-start lg:col-span-2 xl:col-span-1 xl:sticky xl:top-4">
            <div>
              <p className="font-bold text-brand-purple-dark"><Icon name="fa-brackets-curly" className="mr-2 text-purple" />Dicionário de tags</p>
              <p className="text-sm text-brand-purple-dark/60">{TAGS_MINUTA.reduce((s, c) => s + c.tags.length, 0)} tags em {TAGS_MINUTA.length} categorias. "Inserir" põe a tag no cursor, em roxo; ela só é resolvida na criação do contrato.</p>
            </div>
            <Input type="search" id="tags-busca" placeholder="Buscar tag, rótulo ou descrição" leftIcon="fa-magnifying-glass" value={buscaTag} onChange={(e) => setBuscaTag(e.target.value)} />
            {categorias.length === 0 ? (
              <p className="text-sm text-brand-purple-dark/60">Nenhuma tag com "{buscaTag.trim()}". Tente parte do nome, como "valor" ou "vigência".</p>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto thin-scrollbar pr-1">
                {categorias.map((c) => (
                  <section key={c.categoria}>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50"><Icon name={c.icone} className="mr-1" />{c.categoria}</p>
                    <ul className="divide-y divide-brand-purple-dark/5">
                      {c.tags.map((t) => (
                        <li key={t.tag} className="flex items-center justify-between gap-2 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-brand-purple-dark">{t.label}</p>
                            <TagMinuta tag={t.tag} />
                            <p className="mt-0.5 text-xs text-brand-purple-dark/60">{t.descricao}</p>
                            <p className="text-xs text-brand-purple-dark/50">Ex.: {t.exemplo}</p>
                          </div>
                          <Button size="small" variant="tint" color="purple" onMouseDown={(e) => e.preventDefault()} onClick={() => void inserirNoCursor(`{{${t.tag}}}`, true)} disabled={!ativa}>
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
          <mark key={i} title={`{{${p.tag}}} fora do dicionário: sem valor de exemplo`} className="rounded bg-yellow/20 px-0.5 font-sans text-[0.85em] font-bold text-yellow-dark">
            Variável não preenchida
          </mark>
        ),
      )}
    </>
  );
}

function Simulacao({ minuta, novo, clausulas, voltar, publicar }: { minuta: Minuta; novo: boolean; clausulas: Clausula[]; voltar: () => void; publicar: () => void }) {
  const faltando = [...new Set(clausulas.flatMap((c) => simular(c.texto).filter((p) => p.tag && !p.valor).map((p) => p.tag!)))];
  const preenchidas = new Set(clausulas.flatMap((c) => simular(c.texto).filter((p) => p.tag && p.valor).map((p) => p.tag!))).size;
  const titulo = novo ? "Novo modelo de minuta" : minuta.titulo;
  const paginas = paginar(clausulas, 5).map((grupo, i) => (
    <>
      {i === 0 && <h1 className="text-center font-bold uppercase">{titulo}</h1>}
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
            <p className="font-bold text-brand-purple-dark">Simular com Dados Reais · {minuta.codigo} {novo ? "v1.0" : minuta.versao} (rascunho)</p>
            <p className="text-sm text-brand-purple-dark/60">Tags trocadas pelos dados de exemplo do dicionário. Nenhum contrato é criado.</p>
          </div>
        </div>
        <Button leftIcon={novo ? "fa-plus" : "fa-paper-plane"} onClick={publicar}>{novo ? "Criar modelo" : "Publicar revisão"}</Button>
      </div>
      {faltando.length > 0 ? (
        <Aviso tom="atencao" titulo={`${faltando.length} variável(is) não preenchida(s)`}>
          <span className="inline-flex flex-wrap items-center gap-1">
            {faltando.map((t) => <TagMinuta key={t} tag={t} />)}
          </span>{" "}
          Essas tags não estão no dicionário e ficam sem valor no contrato. Troque pela tag certa no editor.
        </Aviso>
      ) : (
        <Aviso tom="ok" titulo="Todas as variáveis têm valor">{preenchidas} tag(s) trocada(s) por dado de exemplo.</Aviso>
      )}
      <FolhaA4 paginas={paginas} cabecalho={`${minuta.codigo} ${novo ? "v1.0" : minuta.versao} · simulação com dados de exemplo`} />
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

/** Código automático (`MIN-NNN`) ou mnemônico manual (FR-060, FR-065). */
function CampoCodigo({ id, codigoAuto, manual, setManual, codigo, setCodigo, erro }: { id: string; codigoAuto: string; manual: boolean; setManual: (v: boolean) => void; codigo: string; setCodigo: (v: string) => void; erro?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-purple-dark/5 p-4">
        <span className="text-sm font-bold text-brand-purple-dark/60">Código</span>
        <span className="text-lg font-extrabold text-brand-purple-dark">{manual ? codigo.trim().toUpperCase() || "—" : codigoAuto}</span>
        {manual ? <Tag item="Mnemônico manual" variant="orange" leftIcon="fa-keyboard" /> : <Tag item="Automático" variant="light-blue" leftIcon="fa-wand-magic-sparkles" />}
        <span className="text-sm font-semibold text-brand-purple-dark/50">v1.0</span>
        <button type="button" className="ml-auto text-sm font-bold text-brand-blue hover:underline" onClick={() => { setManual(!manual); setCodigo(""); }}>
          {manual ? "Usar o código automático" : "Informar mnemônico manual"}
        </button>
      </div>
      {manual && <Input id={id} label="Mnemônico *" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} errors={erro ? [erro] : []} placeholder="Ex.: MIN-LOC" />}
      {!manual && erro && <p className="text-sm font-semibold text-red-dark">{erro}</p>}
    </div>
  );
}

function ModalRevisao({ show, minuta, alterada, fechar, publicar }: { show: boolean; minuta: Minuta; alterada: boolean; fechar: () => void; publicar: (t: "minor" | "major", j: string, r: string) => string | undefined }) {
  const [tipo, setTipo] = useState<"minor" | "major">("minor");
  const [justificativa, setJustificativa] = useState("");
  const [revisor, setRevisor] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const confirmar = () => {
    const e: Record<string, string> = {};
    if (!justificativa.trim()) e.justificativa = "Diga o que mudou e por quê: o motivo vai para os contratos impactados.";
    if (!revisor.trim()) e.revisor = "Informe o revisor responsável pela revisão.";
    if (Object.keys(e).length === 0) {
      const erro = publicar(tipo, justificativa.trim(), revisor.trim());
      if (erro) e.geral = erro;
    }
    setErros(e);
  };
  return (
    <DrawerModal id="modal-revisao" show={show} onCancel={fechar} title={`Publicar revisão · ${minuta.codigo}`} variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-4">
        <Aviso tom="info">
          Ao publicar, a nova versão fica <strong>Vigente</strong> e {minuta.codigo} {minuta.versao} e anteriores ficam <strong>Obsoleta / Arquivada</strong>. Título ({minuta.titulo}) e categoria ({minuta.categoria}) vêm da vigente. Contratos assinados não mudam: a adequação é por Termo Aditivo.
        </Aviso>
        {!alterada && <Aviso tom="atencao">Nenhuma cláusula foi alterada: a nova versão herda as cláusulas vigentes.</Aviso>}
        {erros.geral && <Aviso tom="risco">{erros.geral}</Aviso>}
        <RadioCards
          id="revisao-tipo"
          title="Tipo de revisão"
          value={tipo}
          onChange={(v) => setTipo(v as "minor" | "major")}
          option={[
            { id: "minor", title: "Minor (+0.1)", subtitle: `${minuta.versao} → ${proximaVersao(minuta.versao, "minor")} · ajuste de redação ou cláusula pontual`, icon: "fa-pen" },
            { id: "major", title: "Major (+1.0)", subtitle: `${minuta.versao} → ${proximaVersao(minuta.versao, "major")} · mudança de obrigação, preço ou estrutura`, icon: "fa-layer-group" },
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

/** Metadados do novo modelo; o conteúdo vem do editor (FR-060). */
function ModalNova({ show, codigoAuto, clausulas, data, fechar, criar }: { show: boolean; codigoAuto: string; clausulas: Rascunho[]; data: ContratosData; fechar: () => void; criar: (m: NovaMinuta, toast: string) => string | undefined }) {
  const [manual, setManual] = useState(false);
  const [f, setF] = useState({ codigo: "", titulo: "", categoria: "", revisor: "" });
  const [erros, setErros] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const conteudo = semHtml(clausulas).filter((c) => c.texto.trim() || c.titulo.trim());
  const confirmar = () => {
    const e: Record<string, string> = {};
    const codigo = manual ? f.codigo.trim().toUpperCase() : codigoAuto;
    if (manual && !codigo) e.codigo = "Informe o mnemônico, como MIN-LOC.";
    if (!f.titulo.trim()) e.titulo = "Informe o título da minuta.";
    if (!f.categoria) e.categoria = "Escolha a categoria.";
    if (!f.revisor.trim()) e.revisor = "Informe o revisor responsável.";
    if (!conteudo.some((c) => c.texto.trim())) e.conteudo = "O conteúdo está vazio. Volte ao editor e escreva ao menos uma cláusula.";
    if (Object.keys(e).length === 0) {
      const erro = criar(
        { codigo, titulo: f.titulo.trim(), categoria: f.categoria, grupo: grupoDe(f.categoria), revisor: f.revisor.trim(), motivo: DESCRICAO_NOVA, clausulas: conteudo },
        `${conteudo.length} cláusula(s), já disponível para contratos de Adesão.`,
      );
      if (erro) e.codigo = erro;
    }
    setErros(e);
  };
  return (
    <DrawerModal id="modal-nova-minuta" show={show} onCancel={fechar} title="Criar novo modelo de minuta" variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-4">
        <p className="text-sm text-brand-purple-dark/70">O modelo nasce <strong>v1.0 Vigente</strong>, com a descrição "{DESCRICAO_NOVA}" O conteúdo é o do editor ({conteudo.length} cláusula{conteudo.length === 1 ? "" : "s"}).</p>
        {erros.conteudo && <Aviso tom="risco">{erros.conteudo}</Aviso>}
        <CampoCodigo id="nova-codigo" codigoAuto={codigoAuto} manual={manual} setManual={setManual} codigo={f.codigo} setCodigo={set("codigo")} erro={erros.codigo} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="nova-titulo" label="Título *" value={f.titulo} onChange={(e) => set("titulo")(e.target.value)} errors={erros.titulo ? [erros.titulo] : []} placeholder="Ex.: Locação de Imóvel" />
          <Input type="select" id="nova-categoria" label="Categoria *" prompt="Escolha" value={f.categoria} options={opcoesCategoria(data)} onChange={(v) => set("categoria")(v ?? "")} errors={erros.categoria ? [erros.categoria] : []} />
        </div>
        <Input id="nova-revisor" label="Revisor *" value={f.revisor} onChange={(e) => set("revisor")(e.target.value)} errors={erros.revisor ? [erros.revisor] : []} placeholder="Ex.: Dra. Helena Duarte (Jurídico)" />
        <Rodape cancelar={fechar} confirmar={confirmar} label="Criar v1.0" icone="fa-plus" />
      </div>
    </DrawerModal>
  );
}

/** Clone (FR-065, RN-044): novo código e categoria, cláusulas vigentes da origem, v1.0 Vigente. */
function ModalClonar({ show, origem, codigoAuto, data, fechar, criar }: { show: boolean; origem: Minuta; codigoAuto: string; data: ContratosData; fechar: () => void; criar: (m: NovaMinuta, toast: string) => string | undefined }) {
  const [manual, setManual] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [titulo, setTitulo] = useState(`${origem.titulo} (Cópia Especializada)`);
  const [revisor, setRevisor] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const clausulas: Clausula[] = origem.clausulas.length ? origem.clausulas.map((x) => ({ ...x })) : [{ id: "c1", titulo: "Cláusula 1ª", texto: CLAUSULA_PADRAO_CLONE }];
  const confirmar = () => {
    const e: Record<string, string> = {};
    const c = manual ? codigo.trim().toUpperCase() : codigoAuto;
    if (manual && !c) e.codigo = "Informe o mnemônico do clone.";
    if (!categoria) e.categoria = "Escolha a categoria do clone.";
    if (!revisor.trim()) e.revisor = "Informe o revisor responsável.";
    if (Object.keys(e).length === 0) {
      const erro = criar(
        { codigo: c, titulo: titulo.trim() || `${origem.titulo} (Cópia Especializada)`, categoria, grupo: grupoDe(categoria), revisor: revisor.trim(), motivo: `Modelo clonado a partir de ${origem.codigo}. Versão inaugural (v1.0) homologada.`, clausulas },
        `Clone de ${origem.codigo} ${origem.versao} com ${clausulas.length} cláusula(s).`,
      );
      if (erro) e.codigo = erro;
    }
    setErros(e);
  };
  return (
    <DrawerModal id="modal-clonar-minuta" show={show} onCancel={fechar} title={`Clonar ${origem.codigo} ${origem.versao}`} variant="medium" contentClass={CONTEUDO_DRAWER}>
      <div className="space-y-4">
        <p className="text-sm text-brand-purple-dark/70">
          {origem.clausulas.length
            ? <>O clone leva as {origem.clausulas.length} cláusulas vigentes e nasce como <strong>v1.0 Vigente</strong>, com histórico próprio. A original não muda.</>
            : <>A origem não tem cláusulas: o clone nasce <strong>v1.0 Vigente</strong> com "{CLAUSULA_PADRAO_CLONE}"</>}
        </p>
        <CampoCodigo id="clonar-codigo" codigoAuto={codigoAuto} manual={manual} setManual={setManual} codigo={codigo} setCodigo={setCodigo} erro={erros.codigo} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input type="select" id="clonar-categoria" label="Categoria *" prompt="Escolha" value={categoria} options={opcoesCategoria(data)} onChange={(v) => setCategoria(v ?? "")} errors={erros.categoria ? [erros.categoria] : []} />
          <Input id="clonar-revisor" label="Revisor *" value={revisor} onChange={(e) => setRevisor(e.target.value)} errors={erros.revisor ? [erros.revisor] : []} placeholder="Ex.: Dra. Helena Duarte (Jurídico)" />
        </div>
        <Input id="clonar-titulo" label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <Rodape cancelar={fechar} confirmar={confirmar} label="Clonar como v1.0" icone="fa-clone" />
      </div>
    </DrawerModal>
  );
}
