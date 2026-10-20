/**
 * Gestão de Contratos — Novo Contrato.
 *
 * Formulário em cinco seções (Modalidade · Partes · Financeiro · Vigência ·
 * Campos da categoria), com o índice de seções à esquerda. Adesão nasce da
 * minuta padrão vigente da categoria; Corporativo e Específico nascem do
 * upload do documento externo ("Fluxo Invertido"). "+ Nova/Novo" cadastra a
 * opção da tabela de apoio num modal pequeno, sem sair do formulário, e
 * "Cadastrar Nova Parte" abre o mesmo cadastro lateral da tela de Partes.
 *
 * Salvar valida campo a campo e resume no topo ("Corrija N campos"). Com
 * sucesso, mostra a confirmação do contrato criado em Elaboração (o protótipo
 * não grava: o atalho abre o CT-2026-006, um contrato real em Elaboração).
 *
 * Feito na tela (componente novo): o índice de seções, o cartão da minuta e o
 * resumo de erros. O resto é `radio_cards`, `radio_selector`, `input`,
 * `form_grid`, `file_uploader`, `modal`, `drawer_modal`, `tag` e `button`.
 */
import { useState, type ChangeEvent, type ReactNode } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { FormGrid } from "../components/BackofficeComponents.js";
import { Button } from "../components/Button.js";
import { RadioCards, RadioGroup } from "../components/Choice.js";
import { ComboboxCriavel, MultiComboboxCriavel } from "./gestao-de-contratos/ComboboxCriavel.js";
import { FileItem, FileUploader } from "../components/FileUploader.js";
import { Icon } from "../components/Icon.js";
import { FieldError, Input, cx } from "../components/Input.js";
import { DrawerModal } from "../components/Overlay.js";
import { Tag } from "../components/Tag.js";
import {
  ASSINATURA, FLUXO, MODALIDADE, STATUS, SUBTIPO, br, kb,
  type Arquivo, type CampoCategoria, type ContratosData, type Modalidade, type Papel, type Parte, type TabelaId,
} from "./gestao-de-contratos/model.js";
import {
  Aviso, Bloco, ContratosShell, Dados, FolhaA4, ROTAS, Selo, TextoComTags, fichaDe, paginar, papelDe,
} from "./gestao-de-contratos/ui.js";
import { DrawerParte, formNovo } from "./ContratosPartes.js";

/* ------------------------------------------------------------------ */
/* Formulário                                                          */
/* ------------------------------------------------------------------ */

type Form = {
  modalidade: Modalidade;
  codigoManual: boolean;
  codigo: string;
  categoria: string;
  objeto: string;
  minutaId: string;
  anexo?: Arquivo;
  liminar: "sim" | "nao";
  processo: string;
  vara: string;
  parteId: string;
  fluxo: string;
  forma: string;
  condicao: string;
  valor: string;
  vencimento: string;
  indice: string;
  unidades: string[];
  inicio: string;
  fim: string;
  campos: Record<string, string>;
};
type Campo = Exclude<keyof Form, "modalidade" | "codigoManual" | "campos" | "minutaId"> | "minuta";
type Erros = Partial<Record<Campo, string>>;

type Secao = { id: string; n: number; label: string; campos: Campo[] };
const SECOES: Secao[] = [
  { id: "sec-modalidade", n: 1, label: "Modalidade", campos: ["codigo", "categoria", "objeto", "minuta", "anexo", "liminar", "processo", "vara"] },
  { id: "sec-partes", n: 2, label: "Partes", campos: ["parteId", "fluxo", "forma", "condicao"] },
  { id: "sec-financeiro", n: 3, label: "Financeiro", campos: ["valor", "vencimento", "indice", "unidades"] },
  { id: "sec-vigencia", n: 4, label: "Vigência", campos: ["inicio", "fim"] },
  { id: "sec-campos", n: 5, label: "Campos da categoria", campos: [] },
];
const ROTULO: Record<Campo, string> = {
  codigo: "Código manual", categoria: "Categoria", objeto: "Objeto", minuta: "Minuta", anexo: "Anexo", liminar: "Origem judicial", processo: "Nº do processo", vara: "Vara",
  parteId: "Parte", fluxo: "Fluxo", forma: "Forma de pagamento", condicao: "Condição de pagamento",
  valor: "Valor mensal", vencimento: "Dia do vencimento", indice: "Índice de reajuste", unidades: "Unidades", inicio: "Início", fim: "Fim",
};

/** As listas com "+ Nova/Novo" no formulário. */
type Lista = Extract<TabelaId, "categoria" | "fluxo" | "forma_pagamento" | "condicao_pagamento" | "unidade" | "indice">;
const LISTA: Record<Lista, { nome: string; novo: string }> = {
  categoria: { nome: "Categoria", novo: "Nova" },
  fluxo: { nome: "Fluxo", novo: "Novo" },
  forma_pagamento: { nome: "Forma de pagamento", novo: "Nova" },
  condicao_pagamento: { nome: "Condição de pagamento", novo: "Nova" },
  unidade: { nome: "Unidade", novo: "Nova" },
  indice: { nome: "Índice", novo: "Novo" },
};

/** Parte que pode assinar contrato: cliente ativo ou fornecedor ativo e homologado. */
const elegivel = (p: Parte) => p.ativo && (p.tipo === "cliente" || Boolean(p.homologado));
const numero = (v: string) => Number(v.replace(/\./g, "").replace(",", "."));
const somaAno = (iso: string) => (iso ? `${Number(iso.slice(0, 4)) + 1}${iso.slice(4)}` : "");
const meses = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / (30.44 * 86_400_000));

const minutaDa = (data: ContratosData, categoria: string) => data.minutas.find((m) => m.status === "vigente" && m.categoria === categoria);

function preencherParte(f: Form, p: Parte): Form {
  return {
    ...f,
    parteId: p.id,
    fluxo: FLUXO[p.fluxo].label,
    forma: p.formaPagamento,
    condicao: p.condicaoPagamento,
    ...(p.subtipo === "liminar" && { liminar: "sim" as const, processo: p.extras.Processo ?? "", vara: p.extras.Vara ?? "" }),
  };
}

/** O estado de abertura de cada cenário (controles `modalidade` e `estado`). */
function inicial(data: ContratosData, modalidade: Modalidade, estado: string): Form {
  const vazio: Form = {
    modalidade, codigoManual: false, codigo: "", categoria: "", objeto: "", minutaId: "", liminar: "nao", processo: "", vara: "",
    parteId: "", fluxo: "", forma: "", condicao: "", valor: "", vencimento: "", indice: "", unidades: [], inicio: "", fim: "", campos: {},
  };
  if (estado === "vazio") return vazio;
  const parte = (id: string) => data.partes.find((p) => p.id === id)!;
  const com = (categoria: string, parteId: string, objeto: string, extra: Partial<Form> = {}) =>
    ({ ...preencherParte({ ...vazio, categoria, objeto, minutaId: minutaDa(data, categoria)?.id ?? "" }, parte(parteId)), ...extra });

  if (estado === "liminar") {
    return com("Particular", "p5", "terapia ABA intensiva determinada por decisão liminar (renovação)", {
      anexo: { nome: "decisao-liminar-renovacao.pdf", tamanho: 412_000 },
      unidades: ["Unidade Jardim"],
    });
  }
  const base =
    modalidade === "adesao"
      ? com("PJ Assistencial", "p10", "prestação de serviços de fonoaudiologia (linguagem) na Unidade Girassol", { campos: { Especialidade: "Fonoaudiologia" } })
      : com("Tecnologia", "p8", "módulo de teleatendimento do prontuário em nuvem");
  if (estado === "erros") {
    return { ...base, valor: "-500,00", vencimento: "35", indice: "IPCA", inicio: "2026-09-01", fim: "2026-08-01", unidades: [] };
  }
  return base;
}

function validar(data: ContratosData, f: Form): Erros {
  const e: Erros = {};
  if (f.codigoManual) {
    if (!/^CT-\d{4}-\d{3}$/.test(f.codigo)) e.codigo = "Use o formato CT-AAAA-NNN.";
    else if (data.contratos.some((c) => c.id === f.codigo)) e.codigo = `${f.codigo} já existe na carteira.`;
  }
  if (!f.categoria) e.categoria = "Escolha a categoria.";
  if (!f.objeto.trim()) e.objeto = "Descreva o objeto do contrato.";
  if (f.modalidade === "adesao" && !f.minutaId) e.minuta = "Escolha a minuta ou mude a modalidade.";
  if (f.modalidade !== "adesao" && !f.anexo) e.anexo = "Envie o documento negociado: no Fluxo Invertido ele é o próprio contrato.";
  if (f.liminar === "sim") {
    if (!f.processo.trim()) e.processo = "Informe o nº do processo.";
    if (!f.vara.trim()) e.vara = "Informe a vara.";
  }
  if (!f.parteId) e.parteId = "Escolha a parte.";
  if (!f.fluxo) e.fluxo = "Escolha o fluxo.";
  if (!f.forma) e.forma = "Escolha a forma de pagamento.";
  if (!f.condicao) e.condicao = "Escolha a condição de pagamento.";
  if (!f.valor.trim()) e.valor = "Informe o valor mensal.";
  else if (Number.isNaN(numero(f.valor))) e.valor = "Use só números, como 7.400,00.";
  else if (numero(f.valor) < 0) e.valor = "O valor não pode ser negativo.";
  const dia = Number(f.vencimento);
  if (!f.vencimento) e.vencimento = "Informe o dia do vencimento.";
  else if (!Number.isInteger(dia) || dia < 1 || dia > 31) e.vencimento = "Use um dia de 1 a 31.";
  if (!f.indice) e.indice = "Escolha o índice de reajuste.";
  if (f.unidades.length === 0) e.unidades = "Informe pelo menos uma unidade.";
  if (!f.inicio) e.inicio = "Informe o início da vigência.";
  if (!f.fim) e.fim = "Informe o fim da vigência.";
  else if (f.inicio && f.fim <= f.inicio) e.fim = `O fim precisa ser depois de ${br(f.inicio)}.`;
  return e;
}

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

const PODE_CRIAR = (papel: Papel) => papel !== "diretoria" && papel !== "financeiro" && papel !== "aprovador";

export function ContratosNovo({ context }: ScreenProps) {
  const papel = papelDe(context, "solicitante");
  return (
    <ContratosShell
      context={context}
      secao="novo"
      titulo="Novo Contrato"
      subtitulo="O contrato nasce em Elaboração, v1.0, e só vai para assinatura depois de aprovado."
      foco={{ voltar: ROTAS.carteira, rotuloVoltar: "Voltar para a carteira" }}
    >
      {(data) =>
        PODE_CRIAR(papel) ? (
          <Novo key={JSON.stringify(context.controls)} data={data} controls={context.controls} papel={papel} navigate={context.navigate} />
        ) : (
          <Aviso tom="neutro" titulo="Seu papel não cria contratos">
            Diretoria, Aprovador e Financeiro acompanham e decidem, mas não elaboram contratos. Peça ao gestor da área (solicitante) para criar o contrato; ele aparece na carteira em Elaboração.
          </Aviso>
        )
      }
    </ContratosShell>
  );
}

function Novo({ data, controls, papel, navigate }: { data: ContratosData; controls: Record<string, string>; papel: Papel; navigate: ScreenProps["context"]["navigate"] }) {
  const modalidadeInicial: Modalidade = controls.modalidade && controls.modalidade in MODALIDADE ? (controls.modalidade as Modalidade) : "adesao";
  const estado = controls.estado ?? "inicial";
  const [f, setF] = useState<Form>(() => inicial(data, modalidadeInicial, estado));
  const [enviado, setEnviado] = useState(estado === "erros");
  const [partes, setPartes] = useState(data.partes);
  const [opcoes, setOpcoes] = useState<Record<Lista, string[]>>(() => {
    const o = {} as Record<Lista, string[]>;
    for (const k of Object.keys(LISTA) as Lista[]) o[k] = data.tabelas[k].filter((x) => x.ativo).map((x) => x.descricao);
    return o;
  });
  const [preview, setPreview] = useState(false);
  const [drawerParte, setDrawerParte] = useState(0);
  const [criado, setCriado] = useState<{ codigo: string; f: Form } | null>(null);

  const erros: Erros = enviado ? validar(data, f) : {};
  const nErros = Object.keys(erros).length;
  const up = (patch: Partial<Form>) => setF((s) => ({ ...s, ...patch }));
  const err = (k: Campo) => (erros[k] ? [erros[k]!] : []);

  const elegiveis = partes.filter(elegivel);
  const foraDaLista = partes.length - elegiveis.length;
  const parte = partes.find((p) => p.id === f.parteId);
  const minuta = data.minutas.find((m) => m.id === f.minutaId);
  const vigentes = data.minutas.filter((m) => m.status === "vigente");
  const camposCat: CampoCategoria[] = f.categoria ? data.camposCategoria[f.categoria] ?? [] : [];
  const codigo = f.codigoManual ? f.codigo || "—" : data.proximoCodigo;
  /** Opções do select, garantindo a que veio da parte mesmo fora da tabela. */

  const trocarCategoria = (categoria: string) => up({ categoria, minutaId: minutaDa(data, categoria)?.id ?? "", campos: {} });

  /** Cadastra a opção na tabela de apoio (estado local) e já a seleciona no campo. */
  const criarOpcao = (lista: Lista, descricao: string) => {
    setOpcoes((o) => ({ ...o, [lista]: [...o[lista], descricao] }));
    if (lista === "categoria") trocarCategoria(descricao);
    else if (lista === "fluxo") up({ fluxo: descricao });
    else if (lista === "forma_pagamento") up({ forma: descricao });
    else if (lista === "condicao_pagamento") up({ condicao: descricao });
    else if (lista === "indice") up({ indice: descricao });
    else up({ unidades: [...f.unidades, descricao] });
    showToast({ type: "success", title: `${LISTA[lista].nome} ${LISTA[lista].novo === "Novo" ? "cadastrado" : "cadastrada"}`, content: `"${descricao}" já está selecionada e aparece em Tabelas de Apoio.`, closeTime: 4000 });
  };
  /** Combobox criável no lugar do select + botão "+ Nova". */
  const combo = (lista: Lista, id: string, label: string, valor: string, onChange: (v: string) => void, erro: string[]) => (
    <ComboboxCriavel id={id} label={label} value={valor} options={opcoes[lista].includes(valor) || !valor ? opcoes[lista] : [...opcoes[lista], valor]} onChange={onChange} onCriar={(d) => criarOpcao(lista, d)} errors={erro} artigo={LISTA[lista].novo === "Novo" ? "o" : "a"} />
  );

  const salvar = () => {
    setEnviado(true);
    const e = validar(data, f);
    if (Object.keys(e).length) {
      const primeira = SECOES.find((s) => s.campos.some((c) => e[c]));
      if (primeira) document.getElementById(primeira.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const cod = f.codigoManual ? f.codigo : data.proximoCodigo;
    setCriado({ codigo: cod, f });
    showToast({ type: "success", title: "Contrato criado em Elaboração", content: `${cod} v1.0 · checklist do dossiê pendente.`, closeTime: 5000 });
  };

  if (criado) {
    const c = criado.f;
    const m = data.minutas.find((x) => x.id === c.minutaId);
    return (
      <Bloco titulo={`${criado.codigo} criado`} icone="fa-circle-check">
        <Aviso tom="ok" titulo="Contrato criado em Elaboração, v1.0">
          O próximo passo é completar o checklist do dossiê e submeter para aprovação. A assinatura fica travada até a aprovação.
        </Aviso>
        <Dados
          itens={[
            ["Código", <span className="inline-flex items-center gap-2"><strong>{criado.codigo}</strong><Tag item={c.codigoManual ? "Manual / Legado" : "Automático"} variant={c.codigoManual ? "orange" : "light-blue"} /></span>],
            ["Modalidade", <Selo s={MODALIDADE[c.modalidade]} />],
            ["Status", <Selo s={STATUS.em_elaboracao} />],
            ["Assinatura", <Selo s={ASSINATURA.bloqueada} />],
            ["Parte", partes.find((p) => p.id === c.parteId)?.nome],
            [c.modalidade === "adesao" ? "Minuta" : "Documento", m ? `${m.codigo} ${m.versao} · ${m.clausulas.length} cláusulas gravadas` : c.anexo ? `${c.anexo.nome} (${kb(c.anexo.tamanho)})` : "—"],
            ["Vigência", `${br(c.inicio)} a ${br(c.fim)}`],
            ["Unidades", c.unidades.join(", ")],
            ...(c.liminar === "sim" ? [["Origem judicial", `${c.processo} · ${c.vara}`] as [string, ReactNode]] : []),
          ]}
        />
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => navigate(ROTAS.carteira)}>Voltar à carteira</Button>
          <Button variant="outline" leftIcon="fa-plus" onClick={() => { setCriado(null); setF(inicial(data, f.modalidade, "vazio")); setEnviado(false); }}>Criar outro</Button>
          <Button leftIcon="fa-arrow-up-right-from-square" onClick={() => navigate(fichaDe("CT-2026-006"))} title="O protótipo não grava: abre um contrato real em Elaboração">
            Abrir a ficha (exemplo CT-2026-006)
          </Button>
        </div>
      </Bloco>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 pb-24 lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Índice das seções */}
      <nav aria-label="Seções do formulário" className="hidden lg:block">
        <ol className="sticky top-28 space-y-1 rounded-2xl bg-white p-3 shadow-main">
          {SECOES.map((s) => {
            const n = s.campos.filter((c) => erros[c]).length;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-brand-purple-dark/70 hover:bg-brand-purple-dark/5 hover:text-brand-blue-dark"
                >
                  <span className={cx("flex h-6 w-6 items-center justify-center rounded-full text-xs", n ? "bg-red-light text-red" : "bg-brand-blue/20 text-brand-blue-dark")}>{s.n}</span>
                  <span className="flex-1">{s.label}</span>
                  {n > 0 && <span className="rounded-full bg-red px-1.5 text-xs text-white tabular-nums">{n}</span>}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="min-w-0 space-y-6">
        {nErros > 0 && (
          <Aviso tom="risco" titulo={`Corrija ${nErros} campo${nErros === 1 ? "" : "s"}`}>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {SECOES.flatMap((s) => s.campos.filter((c) => erros[c]).map((c) => (
                <li key={c}>
                  <button type="button" className="font-bold text-red-dark underline" onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                    {ROTULO[c]}
                  </button>
                  : {erros[c]}
                </li>
              )))}
            </ul>
          </Aviso>
        )}

        {/* 1. Modalidade */}
        <Bloco id="sec-modalidade" titulo="1. Modalidade" icone="fa-file-signature" className="scroll-mt-28">
          {/* `radio_cards` lado a lado e sem o cartão de fora: o wrapper só
              reorganiza o contêiner do componente, as opções ficam iguais. */}
          <div className="[&>#novo-modalidade]:grid [&>#novo-modalidade]:grid-cols-1 md:[&>#novo-modalidade]:grid-cols-3 [&>#novo-modalidade]:gap-3 [&>#novo-modalidade]:rounded-none [&>#novo-modalidade]:border-0 [&>#novo-modalidade]:bg-transparent [&>#novo-modalidade]:p-0 [&>#novo-modalidade>*]:m-0!">
          <RadioCards
            id="novo-modalidade"
            value={f.modalidade}
            onChange={(v) => up({ modalidade: v as Modalidade })}
            option={[
              { id: "adesao", title: "Adesão", icon: "fa-file-lines fa-fw", subtitle: "Nasce da minuta padrão vigente da categoria." },
              { id: "corporativo", title: "Corporativo", icon: "fa-building fa-fw", subtitle: "Documento negociado fora, enviado por upload (Fluxo Invertido)." },
              { id: "especifico", title: "Específico", icon: "fa-file-pen fa-fw", subtitle: "Caso único (locação, liminar…), enviado por upload (Fluxo Invertido)." },
            ]}
          />
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-purple-dark/5 p-4">
            <span className="text-sm font-bold text-brand-purple-dark/60">Código previsto</span>
            <span className="text-lg font-extrabold text-brand-purple-dark">{codigo}</span>
            {f.codigoManual ? <Tag item="Manual / Legado" variant="orange" leftIcon="fa-keyboard" /> : <Tag item="Automático" variant="light-blue" leftIcon="fa-wand-magic-sparkles" />}
            <span className="text-sm font-semibold text-brand-purple-dark/50">v1.0</span>
            <button type="button" className="ml-auto text-sm font-bold text-brand-blue hover:underline" onClick={() => up({ codigoManual: !f.codigoManual, codigo: "" })}>
              {f.codigoManual ? "Usar o código automático" : "Informar código manual / legado"}
            </button>
          </div>

          <FormGrid variant="small" className="mt-0! gap-y-8 pb-3">
            {f.codigoManual && (
              <Input id="novo-codigo" label="Código manual / legado *" placeholder="CT-2024-017" value={f.codigo} onChange={(e) => up({ codigo: e.target.value.toUpperCase() })} errors={err("codigo")} />
            )}
            {combo("categoria", "novo-categoria", "Categoria *", f.categoria, trocarCategoria, err("categoria"))}
          </FormGrid>
          <Input type="textarea" id="novo-objeto" label="Objeto *" rows={2} placeholder="O que é contratado, em uma frase" value={f.objeto} onChange={(e) => up({ objeto: e.target.value })} errors={err("objeto")} />

          {f.modalidade === "adesao" ? (
            <div className="space-y-4">
              <Input
                type="select"
                id="novo-minuta"
                label="Minuta padrão *"
                prompt={f.categoria ? "Selecione a minuta" : "Escolha a categoria primeiro"}
                value={f.minutaId}
                options={vigentes.map((m) => ({ label: `${m.codigo} ${m.versao} · ${m.titulo}`, value: m.id }))}
                onChange={(v) => up({ minutaId: v ?? "" })}
                errors={err("minuta")}
              />
              {f.categoria && !minutaDa(data, f.categoria) && (
                <Aviso tom="atencao" titulo={`Sem minuta vigente para ${f.categoria}`}>
                  Escolha outra minuta vigente, ou mude para Corporativo/Específico e envie o documento. Para ter uma minuta da categoria, peça ao Jurídico em Minutas Padrão.
                </Aviso>
              )}
              {minuta && (
                <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon name="fa-file-lines" className="text-brand-blue-dark" />
                    <span className="font-bold text-brand-purple-dark">{minuta.titulo}</span>
                    {minuta.categoria === f.categoria && <Tag item="Vigente da categoria" variant="green" leftIcon="fa-check" />}
                  </div>
                  <Dados
                    colunas={4}
                    itens={[
                      ["Código", minuta.codigo],
                      ["Versão", minuta.versao],
                      ["Cláusulas", String(minuta.clausulas.length)],
                      ["Revisão", `${minuta.revisor} · ${br(minuta.data)}`],
                    ]}
                  />
                  <div className="flex justify-end">
                    <Button variant="outline" size="medium" leftIcon="fa-eye" onClick={() => setPreview(true)}>Pré-visualizar Cláusulas</Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="flex items-center gap-2 text-sm/4 font-bold text-brand-blue">
                  Fluxo Invertido: documento do contrato * <Tag item={MODALIDADE[f.modalidade].label} variant={MODALIDADE[f.modalidade].variant} />
                </p>
                <p className="mt-1 text-sm text-brand-purple-dark/70">
                  No {MODALIDADE[f.modalidade].label.toLowerCase()} o texto vem negociado de fora: a governança (aprovação, versão, dossiê) incide sobre este arquivo, não sobre uma minuta nossa.
                </p>
              </div>
              <Anexo anexo={f.anexo} onChange={(anexo) => up({ anexo })} erro={erros.anexo} />
            </div>
          )}

          <div className="space-y-4">
            <RadioGroup
              label="Origem judicial (liminar)"
              field={{ id: "novo-liminar", name: "liminar", value: f.liminar }}
              radio={[{ value: "nao", label: "Não" }, { value: "sim", label: "Sim" }]}
              onChange={(e) => up({ liminar: e.target.value as Form["liminar"] })}
            />
            {f.liminar === "sim" && (
              <FormGrid variant="small" className="mt-0! gap-y-8 pb-3">
                <Input id="novo-processo" label="Nº do processo *" placeholder="0000000-00.0000.0.00.0000" value={f.processo} onChange={(e) => up({ processo: e.target.value })} errors={err("processo")} />
                <Input id="novo-vara" label="Vara *" placeholder="Ex.: 3ª Vara Cível de Curitiba" value={f.vara} onChange={(e) => up({ vara: e.target.value })} errors={err("vara")} />
              </FormGrid>
            )}
          </div>
        </Bloco>

        {/* 2. Partes */}
        <Bloco
          id="sec-partes"
          titulo="2. Partes"
          icone="fa-handshake"
          className="scroll-mt-28"
          acoes={<Button variant="tint" size="medium" leftIcon="fa-user-plus" onClick={() => setDrawerParte((k) => k + 1)}>Cadastrar Nova Parte</Button>}
        >
          <Input
            type="select"
            id="novo-parte"
            label="Parte *"
            prompt="Selecione o cliente ou fornecedor"
            value={f.parteId}
            options={[
              { group: "Clientes ativos", items: elegiveis.filter((p) => p.tipo === "cliente").map((p) => ({ label: `${p.codigo} · ${p.nome}`, value: p.id })) },
              { group: "Fornecedores homologados", items: elegiveis.filter((p) => p.tipo === "fornecedor").map((p) => ({ label: `${p.codigo} · ${p.nome}`, value: p.id })) },
            ]}
            onChange={(v) => { const p = partes.find((x) => x.id === v); setF((s) => (p ? preencherParte(s, p) : { ...s, parteId: "" })); }}
            errors={err("parteId")}
          />
          <p className="text-sm text-brand-purple-dark/60">
            Só clientes ativos e fornecedores homologados.{foraDaLista > 0 && ` ${foraDaLista} parte${foraDaLista === 1 ? "" : "s"} fora da lista (inativa ou não homologada): ajuste em Partes.`}
          </p>
          {parte && (
            <div className="rounded-xl bg-brand-purple-dark/5 p-4">
              <Dados
                colunas={4}
                itens={[
                  ["Código", <span className="font-bold">{parte.codigo}</span>],
                  ["Nome", parte.nome],
                  ["Documento", parte.documento],
                  ["Tipo", <span className="inline-flex flex-wrap items-center gap-1">{SUBTIPO[parte.subtipo]}{parte.subtipo === "liminar" && <Tag item="Liminar" variant="red" leftIcon="fa-gavel" />}</span>],
                ]}
              />
            </div>
          )}
          <div>
            {parte && <p className="mb-4 text-sm text-brand-purple-dark/60">Preenchidos pelo cadastro de {parte.codigo}. Mude aqui se este contrato for diferente.</p>}
            <FormGrid className="mt-0! gap-y-8 pb-3">
              {combo("fluxo", "novo-fluxo", "Fluxo *", f.fluxo, (v) => up({ fluxo: v }), err("fluxo"))}
              {combo("forma_pagamento", "novo-forma", "Forma de pagamento *", f.forma, (v) => up({ forma: v }), err("forma"))}
              {combo("condicao_pagamento", "novo-condicao", "Condição de pagamento *", f.condicao, (v) => up({ condicao: v }), err("condicao"))}
            </FormGrid>
          </div>
        </Bloco>

        {/* 3. Financeiro */}
        <Bloco id="sec-financeiro" titulo="3. Financeiro" icone="fa-money-bill-wave" className="scroll-mt-28">
          <FormGrid className="mt-0! gap-y-8 pb-3">
            <Input id="novo-valor" label="Valor mensal *" placeholder="0,00" hint="R$/mês" inputMode="decimal" value={f.valor} onChange={(e) => up({ valor: e.target.value })} errors={err("valor")} />
            <Input type="number" id="novo-vencimento" label="Dia do vencimento *" placeholder="1 a 31" min={1} max={31} value={f.vencimento} onChange={(e) => up({ vencimento: e.target.value })} errors={err("vencimento")} />
            {combo("indice", "novo-indice", "Índice de reajuste *", f.indice, (v) => up({ indice: v }), err("indice"))}
          </FormGrid>
          <div className="pb-3">
            <MultiComboboxCriavel
              id="novo-unidades"
              label="Unidades * (uma ou mais)"
              options={opcoes.unidade}
              value={f.unidades}
              onChange={(v) => up({ unidades: v })}
              onCriar={(d) => criarOpcao("unidade", d)}
              errors={erros.unidades ? [erros.unidades] : []}
            />
          </div>
        </Bloco>

        {/* 4. Vigência */}
        <Bloco id="sec-vigencia" titulo="4. Vigência" icone="fa-calendar-range" className="scroll-mt-28">
          <FormGrid className="mt-0! gap-y-8 pb-3">
            <Input type="date" id="novo-inicio" label="Início *" value={f.inicio} onChange={(e) => up({ inicio: e.target.value })} errors={err("inicio")} />
            <Input type="date" id="novo-fim" label="Fim *" value={f.fim} onChange={(e) => up({ fim: e.target.value })} errors={err("fim")} />
            <div>
              <p className="text-sm/4 font-bold text-brand-blue">Data-base do reajuste</p>
              <p className="mt-2 flex h-12 items-center rounded-lg bg-brand-purple-dark/5 px-4 text-brand-purple-dark/80">
                {f.inicio ? br(somaAno(f.inicio)) : "Calculada do início"}
              </p>
            </div>
          </FormGrid>
          {f.inicio && f.fim && f.fim > f.inicio && (
            <p className="text-sm text-brand-purple-dark/60">Prazo de {meses(f.inicio, f.fim)} meses; reajuste anual pelo {f.indice || "índice escolhido"} a partir de {br(somaAno(f.inicio))}.</p>
          )}
        </Bloco>

        {/* 5. Campos da categoria */}
        <Bloco id="sec-campos" titulo="5. Campos da categoria" icone="fa-list-check" className="scroll-mt-28">
          {!f.categoria ? (
            <p className="text-sm text-brand-purple-dark/60">Escolha a categoria para ver os campos extras dela.</p>
          ) : camposCat.length === 0 ? (
            <p className="text-sm text-brand-purple-dark/60">
              <Icon name="fa-circle-info" className="mr-1" />A categoria {f.categoria} não tem campos extras. O Administrador configura em Tabelas de Apoio.
            </p>
          ) : (
            <FormGrid variant="small" className="mt-0! gap-y-8 pb-3">
              {camposCat.map((c) => {
                const v = f.campos[c.rotulo] ?? "";
                const set = (x: string) => up({ campos: { ...f.campos, [c.rotulo]: x } });
                return (
                  <div key={c.id}>
                    {c.tipo === "lista" ? (
                      <Input type="select" id={`novo-campo-${c.id}`} label={c.rotulo} prompt="Selecione" value={v} options={(c.opcoes ?? []).map((o) => ({ label: o, value: o }))} onChange={(x) => set(x ?? "")} />
                    ) : (
                      <Input type={(c.tipo === "numero" ? "number" : c.tipo === "data" ? "date" : "text") as "text"} id={`novo-campo-${c.id}`} label={c.rotulo} value={v} onChange={(e: ChangeEvent<HTMLInputElement>) => set(e.target.value)} />
                    )}
                    {c.ajuda && <p className="mt-1 text-xs text-brand-purple-dark/60">{c.ajuda}</p>}
                  </div>
                );
              })}
            </FormGrid>
          )}
        </Bloco>

        {/* Rodapé fixo na parte de baixo da tela (página sem menu lateral, então ocupa a largura toda). */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-purple-dark/10 bg-white px-4 lg:px-8 py-4 shadow-main">
          <div className="mx-auto max-w-6xl flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="ghost" onClick={() => navigate(ROTAS.carteira)}>Cancelar</Button>
            <Button leftIcon="fa-floppy-disk" onClick={salvar}>Salvar & Iniciar Elaboração</Button>
          </div>
        </div>
      </div>


      {minuta && (
        <DrawerModal id="modal-clausulas" show={preview} title={`${minuta.codigo} ${minuta.versao} · Cláusulas`} variant="large" onCancel={() => setPreview(false)}>
          <div className="space-y-4">
            <Aviso tom="info">
              Estas {minuta.clausulas.length} cláusulas são gravadas no {codigo} v1.0 exatamente assim. As tags em roxo são preenchidas com os dados do contrato quando o documento é gerado.
            </Aviso>
            <FolhaA4
              cabecalho={`${minuta.titulo} · ${minuta.codigo} ${minuta.versao} · ${codigo}`}
              paginas={paginar(minuta.clausulas, 4).map((pag) =>
                pag.map((cl) => (
                  <section key={cl.id}>
                    <h4 className="font-bold">{cl.titulo}</h4>
                    <p><TextoComTags texto={cl.texto} /></p>
                  </section>
                )),
              )}
            />
          </div>
        </DrawerModal>
      )}

      {drawerParte > 0 && (
        <DrawerParte
          key={drawerParte}
          show
          trocarTipo
          permitido
          partes={partes}
          formas={opcoes.forma_pagamento}
          condicoes={opcoes.condicao_pagamento}
          inicial={formNovo(f.fluxo === "Receita" ? "cliente" : "fornecedor")}
          papel={papel}
          onCancel={() => setDrawerParte(0)}
          onSave={(p, atualizou) => {
            setPartes((ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? p : x)) : [...ps, p]));
            setDrawerParte(0);
            if (elegivel(p)) setF((s) => preencherParte(s, p));
            showToast(
              elegivel(p)
                ? { type: "success", title: atualizou ? "Cadastro atualizado" : "Parte cadastrada", content: `${p.codigo} · ${p.nome} já está selecionada no contrato.`, closeTime: 4000 }
                : { type: "info", title: "Parte cadastrada, mas não selecionada", content: `${p.codigo} está inativa ou não homologada. Ative/homologue em Partes para contratar.`, closeTime: 6000 },
            );
          }}
        />
      )}
    </div>
  );
}

/** Anexo do contrato: PDF, DOC ou DOCX, por clique ou arrasto. */
function Anexo({ anexo, onChange, erro }: { anexo?: Arquivo; onChange: (a?: Arquivo) => void; erro?: string }) {
  const [tipoErrado, setTipoErrado] = useState<string | null>(null);
  if (anexo) return <FileItem variant="simplified" fileName={anexo.nome} size={anexo.tamanho} removeEvent={() => onChange(undefined)} />;
  return (
    <div>
      <FileUploader
        variant="simplified"
        upload={{ ref: "novo-anexo", name: "anexo", accept: ".pdf,.doc,.docx", maxEntries: 1, maxFileSize: 20_000_000 }}
        onChange={(files) => {
          const file = files[0];
          if (!file) return;
          if (!/\.(pdf|docx?)$/i.test(file.name)) return setTipoErrado(file.name);
          setTipoErrado(null);
          onChange({ nome: file.name, tamanho: file.size });
        }}
      />
      <p className="mt-2 text-xs text-brand-purple-dark/60">PDF, DOC ou DOCX, até 20 MB.</p>
      {tipoErrado && <FieldError message={`"${tipoErrado}" não é PDF nem documento de texto. Envie PDF, DOC ou DOCX.`} />}
      {erro && !tipoErrado && <FieldError message={erro} />}
    </div>
  );
}

