/**
 * Gestão de Contratos — Conformidade: Cobrança e envio ao ERP (Omie)
 * (FR-070, FR-074 a FR-082).
 *
 * Aba Cobrança da central de Conformidade (a outra é o Dossiê), que pode abrir
 * filtrada por um contrato. Smart Intake (leitura do XML NF-e/NFS-e ou do PDF
 * com sugestão de contrato e o critério usado), protocolo, a lista de
 * cobranças, a conferência e o envio ao ERP. Todo documento protocolado entra
 * "Pendente Conferência" e não liberado (`DOC-{contrato}-NN`, RN-007, RN-051):
 * enquanto ninguém confere contra o contrato, a cobrança mostra a Trava de
 * Governança no lugar do botão de envio (RN-052).
 *
 * A leitura é simulada no protótipo: o XML enviado é lido de verdade (NF-e e
 * NFS-e ABRASF); o PDF usa um texto de exemplo pelo nome do arquivo (folha,
 * boleto ou fatura de locação). A classificação (RN-057), a normalização
 * (RN-056), a sugestão de contrato nos 4 passos (RN-058), o vencimento
 * estimado (RN-059) e os padrões (RN-060) seguem a regra atual. O passo 4
 * (primeiro contrato Vigente) é uma sugestão de baixa confiança e a tela
 * avisa isso (decisão pendente na especificação).
 *
 * Sem credenciais do ERP, o envio roda em "SANDBOX / SIMULAÇÃO HOMOLOGADA" e
 * gera um título fictício `OMIE-{n}` (RN-055); o controle "ERP financeiro"
 * troca para credenciais configuradas ou para uma falha da API.
 *
 * Feito na tela (componente novo): o painel de leitura do Smart Intake, a
 * comparação da conferência e o detalhe do envio ao ERP. O resto é `table`,
 * `input`, `drawer_modal`, `file_uploader`, `tag`, `button`, `button_tabs`,
 * `tooltip` e `empty_state_card`.
 */
import { useMemo, useState, type ReactNode } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Tooltip } from "../components/Choice.js";
import { FileUploader, type UploadEntry } from "../components/FileUploader.js";
import { Icon } from "../components/Icon.js";
import { Input, Label, cx } from "../components/Input.js";
import { EmptyStateCard } from "../components/Layout.js";
import { DrawerModal } from "../components/Overlay.js";
import { Table } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import {
  CONFORMIDADE, CONTRATANTE, ERP, FLUXO, MASCARA, TODAY, br, brl, competencia, dossieDe, kb, parteDe, proximoCodigoItem, validarAnexo,
  type Arquivo, type Cobranca, type Contrato, type ContratosData, type Fluxo, type Parte, type RegistroAuditoria,
} from "./gestao-de-contratos/model.js";
import { Aviso, Bloco, ContratosShell, Dados, Etiquetas, ROTAS, Selo, Valor, exportarPlanilha, papelDe, SeloLeitura, irFicha, CONTEUDO_DRAWER, RODAPE_DRAWER } from "./gestao-de-contratos/ui.js";

/**
 * Cobrança da tela: guarda o fluxo da operação escolhido no protocolo
 * ("Contas a Pagar (Folha CLT)"…). Deveria subir para `Cobranca` na base.
 */
type Cob = Cobranca & { fluxoOperacao?: string };

/* ------------------------------------------------------------------ */
/* Fluxo da operação, travas e rótulos                                 */
/* ------------------------------------------------------------------ */

/** Opções do fluxo da operação no protocolo (FR-074). */
const FLUXOS_OPERACAO = ["Contas a Pagar (Prestador PJ)", "Contas a Pagar (Folha CLT)", "Contas a Pagar (Locação)", "Contas a Receber (Cliente)"] as const;
const RECEBER = "Contas a Receber (Cliente)";
const PAGAR_PJ = "Contas a Pagar (Prestador PJ)";
/** Despesa ou contas a pagar → Contas a Pagar; o resto → Contas a Receber (RN-053). */
const fluxoDe = (operacao: string): Fluxo => (/pagar|despesa/i.test(operacao) ? "despesa" : "receita");
const lancamento = (f: Fluxo) => (f === "despesa" ? "Contas a Pagar" : "Contas a Receber");

/** Fluxo preenchido ao escolher o contrato: sempre uma das opções existentes (FR-075). */
function fluxoDoContrato(c: Contrato) {
  if (c.fluxo === "receita") return RECEBER;
  if (c.fluxoDetalhe?.includes("Pessoal") || c.categoria.includes("CLT")) return "Contas a Pagar (Folha CLT)";
  return PAGAR_PJ;
}
/** Rótulo do fluxo na lista: o escolhido no protocolo; nos registros antigos, o do contrato. */
function rotuloFluxo(c: Cob, contrato?: Contrato) {
  if (c.fluxoOperacao) return c.fluxoOperacao;
  if (c.fluxo === "receita") return RECEBER;
  if (contrato?.categoria.includes("Locação")) return "Contas a Pagar (Locação)";
  return contrato ? fluxoDoContrato(contrato) : PAGAR_PJ;
}

type FiltroFluxo = "pagar" | "receber";
type FiltroSituacao = "conformes" | "sincronizados" | "travados";
const FLUXO_F: { id: FiltroFluxo; label: string; fluxo: Fluxo; icon: string }[] = [
  { id: "pagar", label: "Pagar", fluxo: "despesa", icon: FLUXO.despesa.icon },
  { id: "receber", label: "Receber", fluxo: "receita", icon: FLUXO.receita.icon },
];
const SITUACAO_F: { id: FiltroSituacao; label: string; icon: string; passa: (c: Cob) => boolean }[] = [
  { id: "conformes", label: "Conformes", icon: "fa-circle-check", passa: (c) => c.conformidade === "conforme" },
  { id: "sincronizados", label: "Sincronizados", icon: "fa-arrows-rotate", passa: (c) => c.erp.status === "sincronizado" },
  { id: "travados", label: "Travados", icon: "fa-lock", passa: (c) => !c.liberado },
];

const CONFERENCIA = {
  pendente: { label: "Pendente Conferência", variant: "yellow", icon: "fa-hourglass-half" },
  aprovado: { label: "Aprovado 100% Conforme", variant: "green", icon: "fa-check-double" },
} as const;
const LIBERADO = { label: "Liberado", variant: "green", icon: "fa-lock-open" } as const;
/** Mensagem exata da trava de envio (RN-052). */
const TRAVA = "Trava de Governança: O documento deve estar 'Aprovado 100% Conforme' e Liberado para ser enviado ao Omie.";
const podeEnviar = (c: Cob) => c.conferencia === "aprovado" && c.conformidade === "conforme" && c.liberado && c.erp.status !== "sincronizado";

/** Data e hora do envio: "2026-07-09T15:02" → "09/07/2026 às 15:02". */
const quando = (iso?: string) => (iso ? `${br(iso.slice(0, 10))}${iso.length > 10 ? ` às ${iso.slice(11, 16)}` : ""}` : "—");
/** "Tipo número", sem repetir o tipo quando o número já começa com ele ("NFS-e 815"). */
const docLabel = (c: { tipo: string; numero: string }) => (c.numero.toLowerCase().startsWith(c.tipo.toLowerCase()) ? c.numero : `${c.tipo} ${c.numero}`);
const AGORA = `${TODAY}T10:30`;

/* ------------------------------------------------------------------ */
/* Smart Intake: leitura (RN-056, RN-057)                              */
/* ------------------------------------------------------------------ */

const digitos = (s: string) => s.replace(/\D/g, "");
/** Valor no campo do formulário: "15033,80". */
const campoValor = (v?: number) => (v != null ? v.toFixed(2).replace(".", ",") : "");
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Valor: "12.500,00", "12500,00" e "12500.00" viram 12500 (RN-056). */
function normalizarValor(s?: string): number | undefined {
  if (!s) return undefined;
  let v = s.replace(/R\$|\s/g, "");
  if (v.includes(".") && v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  else if (v.includes(",")) v = v.replace(",", ".");
  const n = Math.round(Number(v) * 100) / 100;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
/** Data: dd/mm/aaaa ou aaaa-mm-dd (RN-056). */
function normalizarData(s?: string): string | undefined {
  if (!s) return undefined;
  const a = s.match(/(\d{2})[/.-](\d{2})[/.-](\d{4})/);
  if (a) return `${a[3]}-${a[2]}-${a[1]}`;
  const b = s.match(/(\d{4})[/.-](\d{2})[/.-](\d{2})/);
  return b ? `${b[1]}-${b[2]}-${b[3]}` : undefined;
}
/** Competência: MM/AAAA ou AAAA-MM viram AAAA-MM (RN-056). */
function normalizarCompetencia(s?: string): string | undefined {
  if (!s) return undefined;
  const a = s.match(/(\d{2})[/.-](\d{4})/);
  if (a) return `${a[2]}-${a[1]}`;
  const b = s.match(/(\d{4})[/.-](\d{2})/);
  return b ? `${b[1]}-${b[2]}` : undefined;
}

type Lido<T> = { bruto: string; valor: T };
type Leitura = {
  formato: "XML" | "PDF";
  tipo: string;
  numero?: string;
  valor?: Lido<number>;
  /** Sem rótulo de valor, o maior R$ do texto (RN-057). */
  valorPeloMaior?: boolean;
  vencimento?: Lido<string>;
  competencia?: Lido<string>;
  /** Sem competência, derivada do vencimento (RN-057). */
  competenciaDoVencimento?: boolean;
  prestador: { cnpj?: string; razao?: string };
  tomador: { cnpj?: string; razao?: string };
};
const vazia = (l: Leitura) => !l.numero && !l.valor && !l.vencimento && !l.competencia && !l.prestador.cnpj && !l.tomador.cnpj && !l.prestador.razao;

/** XML de NF-e ou NFS-e (ABRASF): só lê, não grava nada. XML inválido deixa os campos vazios (FR-076). */
function lerXml(xml: string): Leitura {
  const base: Leitura = { formato: "XML", tipo: "NFS-e", prestador: {}, tomador: {} };
  if (typeof DOMParser === "undefined") return base;
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) return base;
  const todos = Array.from(doc.getElementsByTagName("*"));
  const em = (raiz: Element[], nomes: string[]) => {
    for (const n of nomes) {
      const t = raiz.find((e) => e.localName === n)?.textContent?.trim();
      if (t) return t;
    }
    return undefined;
  };
  const bloco = (nomes: string[]) => {
    const e = todos.find((x) => nomes.includes(x.localName));
    return e ? Array.from(e.getElementsByTagName("*")) : [];
  };
  const tipo = todos.some((e) => e.localName === "infNFe") ? "NF-e" : "NFS-e";
  const numero = em(todos, ["nNF", "Numero", "NumeroNfse", "nDoc"]);
  const valor = em(todos, ["vLiq", "vNF", "ValorLiquidoNfse", "ValorServicos", "vServ"]);
  const venc = em(todos, ["dVenc", "DataVencimento"]);
  const comp = em(todos, ["Competencia", "dEmi", "DataEmissao", "dhEmi"]);
  const prest = bloco(["PrestadorServico", "Prestador", "emit"]);
  const tom = bloco(["TomadorServico", "Tomador", "dest"]);
  const v = normalizarValor(valor), d = normalizarData(venc), c = normalizarCompetencia(comp);
  return {
    formato: "XML",
    tipo,
    ...(numero && { numero: `${tipo} ${numero}` }),
    ...(valor && v != null && { valor: { bruto: valor, valor: v } }),
    ...(venc && d && { vencimento: { bruto: venc, valor: d } }),
    ...(comp && c && { competencia: { bruto: comp, valor: c } }),
    prestador: { cnpj: em(prest, ["Cnpj", "CNPJ", "Cpf", "CPF"]), razao: em(prest, ["RazaoSocial", "xNome"]) },
    tomador: { cnpj: em(tom, ["Cnpj", "CNPJ", "Cpf", "CPF"]), razao: em(tom, ["RazaoSocial", "xNome"]) },
  };
}

/** Classificação do PDF: primeira palavra-chave encontrada, como palavra inteira, nesta ordem (RN-057). */
const CLASSES_PDF: [string, RegExp][] = [
  ["Folha de Pagamento", /\bfolha de pagamento\b/i],
  ["Boleto Bancário", /\bboleto banc[áa]rio\b/i],
  ["Fatura de Locação", /\bfatura de loca[çc][ãa]o\b/i],
  ["Recibo / RPA", /\bRPA\b|\brecibo de pagamento a aut[ôo]nomo\b/i],
  ["NF-e", /\bNF-e\b|\bDANFE\b/i],
];
const classificarPdf = (texto: string) => CLASSES_PDF.find(([, re]) => re.test(texto))?.[0] ?? "NFS-e";

/** Texto do PDF → campos. O número só é lido depois de um rótulo de documento: "nº 455" de endereço não conta (RN-057). */
function lerPdf(texto: string): Leitura {
  const tipo = classificarPdf(texto);
  const num = texto.match(/(?:N[úu]mero\s+do\s+Documento|N[ºo°]\s*Documento|Fatura\s+de\s+Loca[çc][ãa]o\s+N[ºo°]|NFS-e\s+N[ºo°]|Nota\s+Fiscal\s+N[ºo°])\s*:?\s*([A-Z0-9][A-Z0-9/.-]*)/i)?.[1];
  const rotulado = texto.match(/(?:Valor\s*L[íi]quido|Valor\s*Total|Total\s*L[íi]quido|L[íi]quido\s*a\s*Pagar|Valor\s*do\s*Documento|Total\s*da\s*Fatura|Valor\s*Cobrado|Total\s*Geral)\s*:?\s*R?\$?\s*([\d.]*,\d{2})/i)?.[1];
  const todos = [...texto.matchAll(/R\$\s*([\d.]*,\d{2})/g)].map((m) => m[1]!);
  const maior = todos.sort((a, b) => (normalizarValor(b) ?? 0) - (normalizarValor(a) ?? 0))[0];
  const valor = rotulado ?? maior;
  const venc = texto.match(/(?:Data\s*de\s*Vencimento|Vencimento|Vencto|Venc\.)\s*:?\s*(\d{2}[/.-]\d{2}[/.-]\d{4})/i)?.[1];
  const comp = texto.match(/(?:Compet[êe]ncia|M[êe]s\s*de\s*Refer[êe]ncia|Per[íi]odo\s*de\s*Apura[çc][ãa]o)\s*:?\s*(\d{2}[/.-]\d{4})/i)?.[1];
  const cnpj = texto.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)?.[0];
  const razao = texto.match(/(?:Benefici[áa]rio|Prestador|Emitente|Locador)\s*:\s*(.+?)\s*(?:CNPJ|$)/im)?.[1] ?? texto.match(/^(?:[^:\n]+:\s*)?(.+?)\s*-\s*CNPJ/m)?.[1];
  const v = normalizarValor(valor), d = normalizarData(venc), c = normalizarCompetencia(comp);
  return {
    formato: "PDF",
    tipo,
    ...(num && { numero: num }),
    ...(valor && v != null && { valor: { bruto: valor, valor: v }, valorPeloMaior: !rotulado }),
    ...(venc && d && { vencimento: { bruto: venc, valor: d } }),
    ...(comp && c ? { competencia: { bruto: comp, valor: c } } : d ? { competencia: { bruto: venc!, valor: d.slice(0, 7) }, competenciaDoVencimento: true } : {}),
    prestador: { cnpj, razao: razao?.trim() },
    tomador: {},
  };
}

/** Arquivos de exemplo (dados fictícios). */
const XML_NFSE = `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd"><Nfse><InfNfse>
  <Numero>815</Numero><Competencia>2026-08-01T00:00:00</Competencia>
  <ValoresNfse><ValorLiquidoNfse>18500.00</ValorLiquidoNfse></ValoresNfse>
  <PrestadorServico><IdentificacaoPrestador><CpfCnpj><Cnpj>12345678000190</Cnpj></CpfCnpj></IdentificacaoPrestador><RazaoSocial>CLINICA INTEGRAR TERAPIAS LTDA</RazaoSocial></PrestadorServico>
  <TomadorServico><IdentificacaoTomador><CpfCnpj><Cnpj>45987654000132</Cnpj></CpfCnpj></IdentificacaoTomador><RazaoSocial>BLOOMY SAUDE INTEGRADA S/A</RazaoSocial></TomadorServico>
</InfNfse></Nfse></CompNfse>`;
const XML_RAZAO = `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd"><Nfse><InfNfse>
  <Numero>241</Numero><Competencia>2026-07-01T00:00:00</Competencia>
  <ValoresNfse><ValorLiquidoNfse>9.200,00</ValorLiquidoNfse></ValoresNfse>
  <PrestadorServico><IdentificacaoPrestador><CpfCnpj><Cnpj>77888999000272</Cnpj></CpfCnpj></IdentificacaoPrestador><RazaoSocial>MOVIMENTO FISIOTERAPIA LTDA - FILIAL BATEL</RazaoSocial></PrestadorServico>
  <TomadorServico><IdentificacaoTomador><CpfCnpj><Cnpj>45987654000132</Cnpj></CpfCnpj></IdentificacaoTomador><RazaoSocial>BLOOMY SAUDE INTEGRADA S/A</RazaoSocial></TomadorServico>
</InfNfse></Nfse></CompNfse>`;
const XML_NFE = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe41260799888777000166550010001122331000112233">
  <ide><nNF>112233</nNF><dhEmi>2026-07-22T10:00:00-03:00</dhEmi></ide>
  <emit><CNPJ>99888777000166</CNPJ><xNome>DISTRIBUIDORA ALFA MATERIAIS LTDA</xNome></emit>
  <dest><CNPJ>45987654000132</CNPJ><xNome>BLOOMY SAUDE INTEGRADA S/A</xNome></dest>
  <total><ICMSTot><vNF>3450.00</vNF></ICMSTot></total>
  <cobr><dup><dVenc>2026-08-20</dVenc></dup></cobr>
</infNFe></NFe></nfeProc>`;
const XML_INVALIDO = `<CompNfse><Nfse><InfNfse><Numero>9`;
const PDF_LOCACAO = `IMOBILIÁRIA HORIZONTE LTDA - CNPJ 44.555.666/0001-77
Rua das Palmeiras, nº 455 - Curitiba/PR
FATURA DE LOCAÇÃO Nº LOC-0926
Locatário: ${CONTRATANTE.razao}
Competência: 09/2026
Vencimento: 05/09/2026
Aluguel R$ 14.253,80
IPTU R$ 780,00
Total da Fatura: R$ 15.033,80`;
const PDF_FOLHA = `DOMÍNIO SISTEMAS - RESUMO DA FOLHA
FOLHA DE PAGAMENTO - Mensalistas
Empregador: ${CONTRATANTE.razao} - CNPJ ${CONTRATANTE.cnpj}
Colaboradora: Camila Rocha Duarte
Período de Apuração: 07/2026
Proventos R$ 6.200,00
Descontos R$ 682,00
Líquido a Pagar: R$ 5.518,00`;
const PDF_BOLETO = `BANCO EXEMPLO S.A. | Boleto Bancário
Beneficiário: NUVEM CLINICA SISTEMAS LTDA CNPJ 55.666.777/0001-88
Pagador: ${CONTRATANTE.razao}
Número do Documento: BOL-0826
Vencimento: 10/08/2026
Mensalidade R$ 9.800,00
Multa após vencimento R$ 196,00`;

/** PDF no protótipo: o texto de exemplo pelo nome do arquivo. */
const pdfSimulado = (nome: string) => (/folha/i.test(nome) ? PDF_FOLHA : /boleto/i.test(nome) ? PDF_BOLETO : PDF_LOCACAO);

type Intake =
  | { arquivo: Arquivo; formato: "XML" | "PDF"; conteudo: string }
  | { arquivo: Arquivo; erro: string };

/** Arquivos dos cenários (controle "Leitura"). */
const EXEMPLOS: Record<string, Intake> = {
  xml: { arquivo: { nome: "nfse-815-integrar.xml", tamanho: 15_000 }, formato: "XML", conteudo: XML_NFSE },
  razao: { arquivo: { nome: "nfse-241-movimento-batel.xml", tamanho: 14_000 }, formato: "XML", conteudo: XML_RAZAO },
  "sem-match": { arquivo: { nome: "nfe-112233.xml", tamanho: 17_000 }, formato: "XML", conteudo: XML_NFE },
  pdf: { arquivo: { nome: "fatura-locacao-setembro.pdf", tamanho: 205_000 }, formato: "PDF", conteudo: PDF_LOCACAO },
  "pdf-folha": { arquivo: { nome: "folha-pagamento-07-2026.pdf", tamanho: 320_000 }, formato: "PDF", conteudo: PDF_FOLHA },
  "pdf-boleto": { arquivo: { nome: "boleto-nuvem-agosto.pdf", tamanho: 98_000 }, formato: "PDF", conteudo: PDF_BOLETO },
  falha: { arquivo: { nome: "nfse-corrompida.xml", tamanho: 2_000 }, formato: "XML", conteudo: XML_INVALIDO },
  grande: { arquivo: { nome: "notas-julho-lote.pdf", tamanho: 31_400_000 }, erro: validarAnexo({ nome: "x.pdf", tamanho: 31_400_000 })! },
};

/* ------------------------------------------------------------------ */
/* Smart Intake: sugestão (RN-058 a RN-060)                            */
/* ------------------------------------------------------------------ */

const PALAVRAS_IGNORADAS = ["ltda", "eireli", "servicos", "clinica", "medica", "saude", "brasil", "grupo"];
const OBS_INTAKE = "Documento lido e interpretado via Inteligência Fiscal (Smart Intake). Valide os campos e confirme.";

type Sugestao = { contrato: Contrato; parte?: Parte; passo: 1 | 2 | 3 | 4; criterio: string };

/** Procura entre os contratos Vigentes, nos 4 passos da regra atual (RN-058). */
function sugerir(data: ContratosData, l: Leitura): Sugestao | undefined {
  const vigentes = data.contratos.filter((c) => c.status === "vigente").sort((a, b) => a.id.localeCompare(b.id));
  if (vigentes.length === 0) return undefined;
  const doc = l.prestador.cnpj ?? l.tomador.cnpj;
  // 1. CNPJ do emitente nos fornecedores e depois nos clientes, só pelos dígitos.
  if (doc && digitos(doc)) {
    for (const tipo of ["fornecedor", "cliente"] as const) {
      const parte = data.partes.find((p) => p.tipo === tipo && digitos(p.documento) === digitos(doc));
      const c = parte && vigentes.find((x) => x.parteId === parte.id);
      if (parte && c) return { contrato: c, parte, passo: 1, criterio: `CNPJ ${doc} = ${parte.nome} (${tipo === "fornecedor" ? "Fornecedores" : "Clientes"}, comparado só pelos dígitos) · contrato Vigente ${c.id}` };
    }
  }
  // 2. Palavras da razão social com mais de 3 letras, menos as genéricas.
  const razao = l.prestador.razao ?? l.tomador.razao;
  if (razao) {
    const palavras = semAcento(razao).split(/[\s\-&/,.]+/).filter((p) => p.length > 3 && !PALAVRAS_IGNORADAS.includes(p));
    for (const c of vigentes) {
      const nome = semAcento(parteDe(data, c)?.nome ?? "");
      const p = palavras.find((w) => nome.includes(w));
      if (p) return { contrato: c, parte: parteDe(data, c), passo: 2, criterio: `Palavra "${p}" da razão social "${razao}" está em ${parteDe(data, c)?.nome} · contrato Vigente ${c.id}` };
    }
  }
  // 3. Folha de pagamento: contrato CLT ou de fluxo Pessoal.
  if (l.tipo === "Folha de Pagamento") {
    const c = vigentes.find((x) => x.categoria.includes("CLT") || x.fluxoDetalhe?.includes("Pessoal"));
    if (c) return { contrato: c, parte: parteDe(data, c), passo: 3, criterio: `Folha de Pagamento → contrato ${c.categoria} (${c.fluxoDetalhe ?? "Pessoal"}) ${c.id}` };
  }
  // 4. Sem correspondência: o primeiro contrato Vigente (baixa confiança).
  const c = vigentes[0]!;
  return { contrato: c, parte: parteDe(data, c), passo: 4, criterio: `Sem correspondência por CNPJ, razão social ou tipo: primeiro contrato Vigente (${c.id})` };
}

/** Vencimento estimado: dia do contrato (padrão 10) no mês corrente, ou no seguinte se já passou; dia inexistente vira o último do mês (RN-059). */
function vencimentoEstimado(c: Contrato, hoje = TODAY) {
  const dia = c.vencimentoDia ?? 10;
  let [ano, mes] = [Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7))];
  if (Number(hoje.slice(8, 10)) > dia) { mes += 1; if (mes > 12) { mes = 1; ano += 1; } }
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return `${ano}-${String(mes).padStart(2, "0")}-${String(Math.min(dia, ultimo)).padStart(2, "0")}`;
}

/** Formulário pré-preenchido pela leitura, com o que foi auto-detectado (FR-078, RN-060). */
function preencherDaLeitura(l: Leitura, s?: Sugestao): { form: Partial<FormP>; auto: Auto; vencimentoEstimado: boolean } {
  const c = s?.contrato;
  const venc = l.vencimento?.valor ?? (c ? vencimentoEstimado(c) : "");
  const form: Partial<FormP> = {
    contrato: c?.id ?? "",
    parte: c?.parteId ?? "",
    fluxo: c?.fluxo === "receita" ? RECEBER : PAGAR_PJ,
    competencia: l.competencia?.valor ?? TODAY.slice(0, 7),
    tipo: l.tipo,
    numero: l.numero ?? `NFS-e ${TODAY.slice(5, 7)}${TODAY.slice(8, 10)}`,
    valor: campoValor(l.valor?.valor ?? c?.valor),
    vencimento: venc,
    observacao: OBS_INTAKE,
  };
  const auto: Auto = { contrato: !!c, parte: !!c, fluxo: !!c, competencia: true, tipo: true, numero: true, valor: !!form.valor, vencimento: !!venc };
  return { form, auto, vencimentoEstimado: !l.vencimento?.valor && !!venc };
}

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

type ModoErp = "sandbox" | "credenciais" | "falha";

export function ContratosCobranca({ context }: ScreenProps) {
  return (
    <ContratosShell
      context={context}
      secao="cobranca"
      titulo="Conformidade — Cobrança e envio ao ERP"
      subtitulo="Notas, faturas, boletos e folhas conferidos contra o contrato antes de irem para o Omie."
    >
      {(data) => <CobrancaTela key={JSON.stringify(context.controls)} data={data} context={context} />}
    </ContratosShell>
  );
}

function CobrancaTela({ data, context }: { data: ContratosData; context: ScenarioContext }) {
  const controls = context.controls as Record<string, string>;
  const papel = papelDe(context, "financeiro");
  const opera = papel === "financeiro" || papel === "administrador";
  const modoErp: ModoErp = controls.erp === "credenciais" || controls.erp === "falha" ? controls.erp : "sandbox";

  const [cobrancas, setCobrancas] = useState<Cob[]>(data.cobrancas);
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>([]);
  const fi = controls.filtro;
  const [fluxo, setFluxo] = useState<FiltroFluxo | "">(fi === "pagar" || fi === "receber" ? fi : "");
  const [situacao, setSituacao] = useState<FiltroSituacao | "">(fi === "conformes" || fi === "sincronizados" || fi === "travados" ? fi : "");
  const [contrato, setContrato] = useState(data.contratos.some((c) => c.id === controls.contrato) ? controls.contrato! : "");
  const [busca, setBusca] = useState("");
  const [intake, setIntake] = useState<Intake | null>(opera && controls.intake ? EXEMPLOS[controls.intake] ?? null : null);
  const [detalhe, setDetalhe] = useState(data.cobrancas.some((b) => b.id === controls.detalhe) ? controls.detalhe! : "");
  const [protocolo, setProtocolo] = useState<{ form: Partial<FormP>; auto: Auto; criterio?: Sugestao; vencimentoEstimado?: boolean } | null>(opera && controls.modal === "protocolo" ? { form: {}, auto: {} } : null);
  const [conferir, setConferir] = useState("");
  const [proximoTitulo, setProximoTitulo] = useState(modoErp === "sandbox" ? 849203 : 88413);

  const parteNome = (id: string) => data.partes.find((p) => p.id === id)?.nome ?? "";
  const contratoDe = (id: string) => data.contratos.find((c) => c.id === id);
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const fl = FLUXO_F.find((f) => f.id === fluxo)?.fluxo;
    const st = SITUACAO_F.find((s) => s.id === situacao);
    return cobrancas
      .filter((c) => !contrato || c.contratoId === contrato)
      .filter((c) => !fl || c.fluxo === fl)
      .filter((c) => !st || st.passa(c))
      .filter((c) => !q || [c.codigo, c.contratoId, c.numero, c.tipo, parteNome(c.parteId), c.erp.titulo ?? ""].some((s) => s.toLowerCase().includes(q)))
      .sort((a, b) => b.competencia.localeCompare(a.competencia) || (a.vencimento ?? "9").localeCompare(b.vencimento ?? "9"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cobrancas, fluxo, situacao, contrato, busca]);

  const limpar = () => { setFluxo(""); setSituacao(""); setContrato(""); setBusca(""); };
  const etiquetas = [
    ...(contrato ? [{ id: "contrato", label: `Contrato: ${contrato}`, onRemove: () => setContrato("") }] : []),
    ...(fluxo ? [{ id: "fluxo", label: FLUXO_F.find((f) => f.id === fluxo)!.label, onRemove: () => setFluxo("") }] : []),
    ...(situacao ? [{ id: "situacao", label: SITUACAO_F.find((s) => s.id === situacao)!.label, onRemove: () => setSituacao("") }] : []),
    ...(busca.trim() ? [{ id: "busca", label: `Busca: "${busca.trim()}"`, onRemove: () => setBusca("") }] : []),
  ];

  const exportar = () =>
    exportarPlanilha(
      "cobrancas-e-envio-ao-erp",
      ["Código", "Contrato", "Fluxo", "Parte", "Competência", "Tipo", "Número", "Vencimento", "Valor", "Conferência", "Conformidade", "Liberação", "Situação no ERP", "Título"],
      lista.map((c) => [c.codigo, c.contratoId, rotuloFluxo(c, contratoDe(c.contratoId)), parteNome(c.parteId), competencia(c.competencia), c.tipo, c.numero, c.vencimento ? br(c.vencimento) : "—", c.valor != null ? brl(c.valor) : "valor não informado", CONFERENCIA[c.conferencia].label, CONFORMIDADE[c.conformidade].label, c.liberado ? "Liberado" : "Trava de Governança", ERP[c.erp.status].label, c.erp.titulo ?? ""]),
    );

  const auditar = (acao: string, detalhes: string, usuario = "Marina Alves", perfil = "Financeiro") =>
    setAuditoria((a) => [...a, { id: `aud-cob-${Date.now()}-${a.length}`, data: AGORA, usuario, perfil, acao, detalhes }]);

  const criar = (nova: Cob, origem: string) => {
    setCobrancas((l) => [nova, ...l]);
    auditar("PROTOCOLO_COBRANCA", `${nova.codigo} protocolado (${origem}): Pendente Conferência, não liberado.`);
    showToast({ type: "success", title: "Documento protocolado", content: `${nova.codigo} · ${docLabel(nova)} entrou como Pendente Conferência, com a Trava de Governança.`, closeTime: 5000 });
  };

  /** Conferência (RN-051): Aprovado 100% Conforme, liberado e registrado na auditoria. */
  const aprovar = (id: string) => {
    const c = cobrancas.find((x) => x.id === id)!;
    setCobrancas((l) => l.map((x) => (x.id === id ? { ...x, conferencia: "aprovado", conformidade: "conforme", liberado: true, erp: { status: "pendente" } } : x)));
    setConferir("");
    auditar("CONFERENCIA_APROVADA", `${c.codigo}: Aprovado 100% Conforme e liberado.`, "Patrícia Gomes", "Controladoria");
    showToast({ type: "success", title: "Aprovado 100% Conforme", content: `${c.codigo} liberado e registrado na auditoria. Já pode enviar ao ERP.`, closeTime: 5000 });
  };

  /** Envio ao ERP (RN-052 a RN-055). */
  const enviar = (id: string) => {
    const c = cobrancas.find((x) => x.id === id)!;
    if (!podeEnviar(c)) {
      showToast({ type: "error", title: "Envio bloqueado", content: TRAVA, closeTime: 6000 });
      return;
    }
    const metodo = c.fluxo === "despesa" ? "IncluirContaPagar" : "IncluirContaReceber";
    if (modoErp === "falha") {
      const motivo = "Falha de conexão com a API Omie: tempo de resposta esgotado (15 s). Tente de novo em alguns minutos.";
      setCobrancas((l) => l.map((x) => (x.id === id ? { ...x, erp: { status: "erro", motivo, data: AGORA } } : x)));
      auditar("INTEGRACAO_OMIE_ERRO", `${c.codigo}: ${motivo}`);
      showToast({ type: "error", title: "O Omie não recebeu o documento", content: `${c.codigo}: ${motivo}`, closeTime: 6000 });
      return;
    }
    const titulo = modoErp === "sandbox" ? `OMIE-${proximoTitulo}` : String(proximoTitulo);
    setProximoTitulo((n) => n + 1);
    const conta = c.fluxo === "despesa" ? "Conta a Pagar" : "Conta a Receber";
    const comprovante = JSON.stringify({
      codigo_status: "0",
      descricao_status: `${conta} cadastrada com sucesso${modoErp === "sandbox" ? " no ERP Omie." : ""}`,
      codigo_lancamento_omie: titulo,
      numero_documento_fiscal: c.numero,
      ...(modoErp === "sandbox" && { modo: "SANDBOX / SIMULAÇÃO HOMOLOGADA" }),
      timestamp: `${AGORA}:00`,
    });
    setCobrancas((l) => l.map((x) => (x.id === id ? { ...x, erp: { status: "sincronizado", titulo, data: AGORA, comprovante } } : x)));
    auditar("INTEGRACAO_OMIE_SUCESSO", `Título ${titulo} sincronizado com ERP Omie (${metodo}).`);
    showToast({ type: "success", title: "Sincronizado no Omie ERP", content: `${c.codigo} virou o título ${titulo} em ${lancamento(c.fluxo)}${modoErp === "sandbox" ? " (SANDBOX / SIMULAÇÃO HOMOLOGADA)" : ""}.`, closeTime: 5000 });
  };

  const aberta = cobrancas.find((c) => c.id === detalhe);
  const emConferencia = cobrancas.find((c) => c.id === conferir);

  return (
    <div className="space-y-6">
      {opera && (
        <SmartIntake
          key={intake?.arquivo.nome ?? "vazio"}
          data={data}
          intake={intake}
          setIntake={setIntake}
          onManual={() => setProtocolo({ form: {}, auto: {} })}
          onRevisar={(p) => setProtocolo(p)}
          onConfirmar={(nova) => { criar(nova, "leitura automática"); setIntake(null); }}
          codigoDe={(id) => proximoCodigoItem("DOC", cobrancas, id)}
        />
      )}

      <Bloco>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Input type="search" id="cobranca-busca" placeholder="Buscar código, contrato, parte, nº ou título" leftIcon="fa-magnifying-glass" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full sm:w-72" inputClass="text-ellipsis" />
            <Input type="select" id="cobranca-fluxo" label="Fluxo" prompt="Todos" value={fluxo} options={FLUXO_F.map((f) => ({ label: `${f.label} (${cobrancas.filter((c) => (!contrato || c.contratoId === contrato) && c.fluxo === f.fluxo).length})`, value: f.id }))} onChange={(v) => setFluxo((v ?? "") as FiltroFluxo | "")} className="w-full sm:w-44" />
            <Input type="select" id="cobranca-situacao" label="Situação" prompt="Todos" value={situacao} options={SITUACAO_F.map((s) => ({ label: `${s.label} (${cobrancas.filter((c) => (!contrato || c.contratoId === contrato) && s.passa(c)).length})`, value: s.id }))} onChange={(v) => setSituacao((v ?? "") as FiltroSituacao | "")} className="w-full sm:w-52" />
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {modoErp === "sandbox" && <Tag item="Omie: SANDBOX / SIMULAÇÃO HOMOLOGADA" variant="dark-purple" leftIcon="fa-flask" title="Sem credenciais do ERP configuradas: o envio gera um título fictício OMIE-{n}." className="whitespace-nowrap" />}
              {!opera && <SeloLeitura motivo="Cobrança, conferência e envio ao ERP são do Financeiro / Controladoria. Para protocolar ou conferir um documento, peça a quem tem esse papel." />}
              <Button variant="tint" leftIcon="fa-file-spreadsheet" onClick={exportar}>Exportar planilha</Button>
              {opera && <Button leftIcon="fa-file-circle-plus" onClick={() => setProtocolo({ form: {}, auto: {} })}>Protocolar documento</Button>}
            </div>
          </div>
          <Etiquetas itens={etiquetas} onLimpar={limpar} />
        </div>

        {cobrancas.length === 0 ? (
          <EmptyStateCard icon="fa-file-invoice-dollar" text="Nenhuma cobrança registrada">
            <p>Envie o XML ou PDF no Smart Intake ou protocole o documento manualmente.</p>
          </EmptyStateCard>
        ) : lista.length === 0 ? (
          <EmptyStateCard icon="fa-filter-circle-xmark" text="Nenhuma cobrança com esses filtros">
            <p>Remova uma etiqueta ou limpe os filtros para ver todas as cobranças.</p>
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={limpar}>Limpar Todos</Button>
            </div>
          </EmptyStateCard>
        ) : (
          <Table
            id="cobrancas"
            rows={lista}
            rowId={(c) => c.id}
            col={[
              {
                label: "Contrato e parte",
                render: (c) => (
                  <div className="flex flex-col items-start gap-1">
                    <button type="button" onClick={() => irFicha(context, c.contratoId, "cobranca")} className="font-bold text-brand-purple-dark hover:text-brand-blue hover:underline whitespace-nowrap">{c.contratoId}</button>
                    <Selo s={{ ...FLUXO[c.fluxo], label: rotuloFluxo(c, contratoDe(c.contratoId)) }} className="whitespace-nowrap" />
                    <span className="text-sm">{parteNome(c.parteId)}</span>
                  </div>
                ),
              },
              {
                label: "Documento",
                render: (c) => (
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-xs font-bold text-brand-purple-dark/50 whitespace-nowrap">{c.codigo}</span>
                    <span className="font-semibold text-brand-purple-dark">{docLabel(c)}</span>
                    <span className="text-xs whitespace-nowrap">Competência {competencia(c.competencia)}</span>
                    {!c.arquivo && <span className="text-xs text-yellow-dark whitespace-nowrap"><Icon name="fa-paperclip" className="mr-1" />Pendente de Anexo</span>}
                    {c.autoDetectado && <AutoDetectado />}
                  </div>
                ),
              },
              { label: "Vencimento", render: (c) => <span className="tabular-nums whitespace-nowrap">{c.vencimento ? br(c.vencimento) : "—"}</span> },
              { label: "Valor", render: (c) => <Valor valor={c.valor} /> },
              {
                label: "Conferência e conformidade",
                render: (c) => (
                  <div className="flex flex-col items-start gap-1">
                    <Selo s={CONFERENCIA[c.conferencia]} />
                    <Selo s={CONFORMIDADE[c.conformidade]} />
                  </div>
                ),
              },
              {
                label: "Liberação",
                className: "min-w-56",
                render: (c) =>
                  !c.liberado ? (
                    <div className="flex flex-col items-start gap-1">
                      {/* Não liberado: a Trava de Governança no lugar do botão de envio (FR-080). */}
                      <Tooltip id={`trava-${c.id}`} placement="top" tooltipClass="max-w-72" tooltipTrigger={<Selo s={ERP.travado} />} tooltipContent={TRAVA} />
                      <span className="text-xs text-brand-purple-dark/60 max-w-56">Confira o documento contra o contrato para liberar.</span>
                      {opera && c.conferencia === "pendente" && (
                        <Button size="small" leftIcon="fa-list-check" onClick={() => setConferir(c.id)}>Conferir</Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-1">
                      <Selo s={LIBERADO} />
                      {opera && podeEnviar(c) && (
                        <Button size="small" leftIcon="fa-arrows-rotate" className="whitespace-nowrap" onClick={() => enviar(c.id)}>{c.erp.status === "erro" ? "Tentar de novo" : "Enviar ao ERP"}</Button>
                      )}
                    </div>
                  ),
              },
              {
                label: "Situação no ERP",
                render: (c) =>
                  c.liberado ? (
                    <div className="flex flex-col items-start gap-1">
                      <Selo s={ERP[c.erp.status]} />
                      {/* Clicar no título abre os detalhes do envio (FR-082). */}
                      {c.erp.titulo && (
                        <button type="button" onClick={() => setDetalhe(c.id)} className="text-xs font-bold text-brand-blue hover:underline whitespace-nowrap" aria-label={`Detalhes do título ${c.erp.titulo}`}>Título {c.erp.titulo}</button>
                      )}
                      {c.erp.status === "erro" && (
                        <button type="button" onClick={() => setDetalhe(c.id)} className="text-xs font-bold text-red hover:underline whitespace-nowrap">Ver motivo</button>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-brand-purple-dark/50 whitespace-nowrap">Não enviado</span>
                  ),
              },
            ]}
          />
        )}
      </Bloco>

      {protocolo && (
        <ModalProtocolo
          data={data}
          cobrancas={cobrancas}
          contratoInicial={contrato}
          inicial={protocolo}
          onCancel={() => setProtocolo(null)}
          onSalvar={(nova) => { criar(nova, protocolo.criterio ? "leitura automática" : "protocolo manual"); setProtocolo(null); if (protocolo.criterio) setIntake(null); }}
        />
      )}

      {emConferencia && (
        <ModalConferencia data={data} c={emConferencia} onCancel={() => setConferir("")} onAprovar={() => aprovar(emConferencia.id)} abrirDossie={() => context.navigate(ROTAS.dossie, { controls: { contrato: emConferencia.contratoId } })} />
      )}

      <DrawerModal id="detalhe-envio" show={!!aberta} title={aberta ? `Envio ao ERP · ${aberta.codigo}` : ""} variant="small" onCancel={() => setDetalhe("")}>
        {aberta && (
          <DetalheEnvio
            c={aberta}
            contrato={contratoDe(aberta.contratoId)}
            parte={parteNome(aberta.parteId)}
            codigoParte={data.partes.find((p) => p.id === aberta.parteId)?.codigo ?? ""}
            trilha={auditoria.filter((a) => a.detalhes.includes(aberta.codigo) || (aberta.erp.titulo && a.detalhes.includes(aberta.erp.titulo)))}
            opera={opera}
            onTentar={() => enviar(aberta.id)}
          />
        )}
      </DrawerModal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Smart Intake                                                        */
/* ------------------------------------------------------------------ */

function AutoDetectado() {
  return <Tag item="Auto-detectado" variant="light-purple" leftIcon="fa-wand-magic-sparkles" className="whitespace-nowrap" />;
}

/** Valor lido com o texto original, para conferir a normalização (RN-056). */
function ComBruto({ children, bruto, nota }: { children: ReactNode; bruto?: string; nota?: string }) {
  return (
    <span className="flex flex-col">
      <span>{children}</span>
      {bruto && <span className="text-xs text-brand-purple-dark/50">lido como "{bruto}"{nota ? ` · ${nota}` : ""}</span>}
    </span>
  );
}

function SmartIntake({
  data, intake, setIntake, onManual, onRevisar, onConfirmar, codigoDe,
}: {
  data: ContratosData;
  intake: Intake | null;
  setIntake: (v: Intake | null) => void;
  onManual: () => void;
  onRevisar: (p: { form: Partial<FormP>; auto: Auto; criterio?: Sugestao; vencimentoEstimado?: boolean }) => void;
  onConfirmar: (c: Cob) => void;
  codigoDe: (contratoId: string) => string;
}) {
  const leitura = intake && "conteudo" in intake ? (intake.formato === "XML" ? lerXml(intake.conteudo) : lerPdf(intake.conteudo)) : undefined;
  const falhou = !!leitura && vazia(leitura);
  const sugestao = leitura && !falhou ? sugerir(data, leitura) : undefined;
  const pre = leitura && !falhou ? preencherDaLeitura(leitura, sugestao) : undefined;
  const contrato = sugestao?.contrato;

  /** Arquivo escolhido: XML ou PDF, até 25 MB (RN-056, RN-008). */
  const receber = async (file: File) => {
    const arquivo = { nome: file.name, tamanho: file.size };
    const ext = file.name.split(".").at(-1)?.toLowerCase();
    if (ext !== "xml" && ext !== "pdf") return setIntake({ arquivo, erro: "Envie o XML da NF-e/NFS-e ou o PDF do documento." });
    const erro = validarAnexo(arquivo);
    if (erro) return setIntake({ arquivo, erro });
    if (ext === "xml") setIntake({ arquivo, formato: "XML", conteudo: await file.text() });
    else setIntake({ arquivo, formato: "PDF", conteudo: pdfSimulado(file.name) });
  };

  const confirmar = () => {
    if (!pre || !contrato || !intake) return;
    const f = pre.form;
    onConfirmar({
      id: `b${Date.now()}`,
      codigo: codigoDe(contrato.id),
      contratoId: contrato.id,
      fluxo: fluxoDe(f.fluxo!),
      fluxoOperacao: f.fluxo,
      parteId: contrato.parteId,
      competencia: f.competencia!,
      tipo: f.tipo!,
      numero: f.numero!,
      ...(normalizarValor(f.valor) != null && { valor: normalizarValor(f.valor) }),
      ...(f.vencimento && { vencimento: f.vencimento }),
      conferencia: "pendente",
      conformidade: "pendente",
      liberado: false,
      erp: { status: "travado" },
      arquivo: intake.arquivo,
      observacao: f.observacao,
      autoDetectado: true,
    });
  };

  return (
    <Bloco titulo="Smart Intake" icone="fa-wand-magic-sparkles">
      <p className="-mt-2 text-sm text-brand-purple-dark/70">
        Envie o XML (NF-e ou NFS-e padrão ABRASF) ou o PDF (Folha de Pagamento, Boleto Bancário, Fatura de Locação, Recibo / RPA, NF-e ou NFS-e), até 25 MB. A leitura traz número, valor, vencimento, competência, tipo e CNPJ e razão social do prestador e do tomador, e sugere o contrato. Nada é gravado até você protocolar.
      </p>

      {!intake && (
        <FileUploader
          variant="simplified"
          upload={{ ref: "intake-arquivo", accept: ".xml,.pdf", maxEntries: 1, entries: [] }}
          onChange={(files) => files[0] && void receber(files[0])}
        />
      )}

      {intake && "erro" in intake && (
        <Aviso
          tom="risco"
          titulo="Arquivo recusado"
          acoes={<><Button size="small" variant="outline" onClick={() => setIntake(null)}>Enviar outro arquivo</Button><Button size="small" onClick={onManual}>Preencher manualmente</Button></>}
        >
          {intake.arquivo.nome} ({kb(intake.arquivo.tamanho)}): {intake.erro}
        </Aviso>
      )}

      {intake && "conteudo" in intake && falhou && (
        <Aviso
          tom="risco"
          titulo="Não foi possível ler o arquivo"
          acoes={<><Button size="small" variant="outline" onClick={() => setIntake(null)}>Enviar outro arquivo</Button><Button size="small" onClick={onManual}>Preencher manualmente</Button></>}
        >
          {intake.arquivo.nome} não trouxe nenhum campo (XML inválido ou PDF sem texto). Preencha os campos manualmente no protocolo.
        </Aviso>
      )}

      {intake && "conteudo" in intake && leitura && !falhou && pre && (
        <div className="flex flex-col gap-4 rounded-xl border border-brand-purple-dark/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-bold text-brand-purple-dark">
              <Icon name={leitura.formato === "XML" ? "fa-file-code" : "fa-file-pdf"} className="text-brand-blue" />
              {intake.arquivo.nome}
              <span className="text-xs font-normal text-brand-purple-dark/50">{kb(intake.arquivo.tamanho)} · {leitura.formato}</span>
            </span>
            <Tag item={leitura.formato === "PDF" ? `Classificado como ${leitura.tipo}` : `${leitura.tipo} lida`} variant="green" leftIcon="fa-check" />
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Campos lidos</p>
            <Dados
              colunas={3}
              itens={[
                ["Tipo", leitura.tipo],
                ["Número", leitura.numero ?? <span className="text-brand-purple-dark/50">não encontrado</span>],
                ["Valor", leitura.valor ? <ComBruto bruto={leitura.valor.bruto} nota={leitura.valorPeloMaior ? "sem rótulo: maior valor em R$" : undefined}><Valor valor={leitura.valor.valor} /></ComBruto> : <span className="text-brand-purple-dark/50">não encontrado</span>],
                ["Vencimento", leitura.vencimento ? <ComBruto bruto={leitura.vencimento.bruto}>{br(leitura.vencimento.valor)}</ComBruto> : <span className="text-brand-purple-dark/50">não encontrado</span>],
                ["Competência", leitura.competencia ? <ComBruto bruto={leitura.competencia.bruto} nota={leitura.competenciaDoVencimento ? "derivada do vencimento" : undefined}>{competencia(leitura.competencia.valor)}</ComBruto> : <span className="text-brand-purple-dark/50">não encontrada</span>],
                ["Prestador / emitente", <span className="flex flex-col"><span>{leitura.prestador.razao ?? "—"}</span><span className="text-xs text-brand-purple-dark/60">{leitura.prestador.cnpj ? `CNPJ ${leitura.prestador.cnpj}` : "CNPJ não encontrado"}</span></span>],
                ["Tomador", <span className="flex flex-col"><span>{leitura.tomador.razao ?? "—"}</span><span className="text-xs text-brand-purple-dark/60">{leitura.tomador.cnpj ? `CNPJ ${leitura.tomador.cnpj}` : "—"}</span></span>],
              ]}
            />
          </div>

          {sugestao && contrato ? (
            <>
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Sugestão <AutoDetectado /></p>
                <Dados
                  colunas={3}
                  itens={[
                    ["Contrato", contrato.id],
                    ["Parte", sugestao.parte?.nome ?? "—"],
                    ["Fluxo", pre.form.fluxo!],
                    ["Número", pre.form.numero!],
                    ["Valor", <Valor valor={normalizarValor(pre.form.valor)} />],
                    ["Vencimento", pre.form.vencimento ? <span className="flex flex-col"><span>{br(pre.form.vencimento)}</span>{pre.vencimentoEstimado && <span className="text-xs text-brand-purple-dark/50">estimado: dia {contrato.vencimentoDia ?? 10} do contrato</span>}</span> : "—"],
                  ]}
                />
              </div>
              {sugestao.passo === 4 ? (
                <Aviso tom="atencao" titulo="Sugestão de baixa confiança">
                  <b>Critério:</b> {sugestao.criterio}. Nada no documento aponta para este contrato: confira e troque o contrato antes de protocolar.
                </Aviso>
              ) : (
                <p className="flex items-start gap-2 text-sm text-brand-purple-dark/70">
                  <Icon name="fa-circle-info" className="mt-0.5 text-brand-blue" />
                  <span><b>Critério (passo {sugestao.passo}):</b> {sugestao.criterio}</span>
                </p>
              )}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button variant="outline" onClick={() => setIntake(null)}>Descartar</Button>
                <Button variant="outline" leftIcon="fa-pen" onClick={() => onRevisar({ form: { ...pre.form, arquivo: intake.arquivo }, auto: pre.auto, criterio: sugestao, vencimentoEstimado: pre.vencimentoEstimado })}>Revisar campos</Button>
                {sugestao.passo !== 4 && <Button leftIcon="fa-check" onClick={confirmar}>Confirmar e protocolar</Button>}
              </div>
            </>
          ) : (
            <Aviso
              tom="atencao"
              titulo="Nenhum contrato Vigente para sugerir"
              acoes={<><Button size="small" onClick={() => onRevisar({ form: { ...pre.form, arquivo: intake.arquivo }, auto: pre.auto, vencimentoEstimado: pre.vencimentoEstimado })}>Preencher o protocolo</Button><Button size="small" variant="ghost" onClick={() => setIntake(null)}>Descartar</Button></>}
            >
              A carteira não tem contrato Vigente. Escolha o contrato no protocolo.
            </Aviso>
          )}
        </div>
      )}
    </Bloco>
  );
}

/* ------------------------------------------------------------------ */
/* Conferência (RN-051)                                                */
/* ------------------------------------------------------------------ */

function Linha({ rotulo, documento, contrato, ok, nota }: { rotulo: string; documento: ReactNode; contrato: ReactNode; ok: boolean; nota?: string }) {
  return (
    <tr>
      <td className="font-semibold">{rotulo}</td>
      <td>{documento}</td>
      <td>{contrato}</td>
      <td>
        <span className={cx("inline-flex items-center gap-1 text-sm font-bold", ok ? "text-brand-green-dark" : "text-yellow-dark")}>
          <Icon name={ok ? "fa-check" : "fa-triangle-exclamation"} /> {ok ? "Confere" : nota ?? "Diverge"}
        </span>
      </td>
    </tr>
  );
}

/** A Controladoria confere o documento contra o contrato antes de liberar. */
function ModalConferencia({ data, c, onCancel, onAprovar, abrirDossie }: { data: ContratosData; c: Cob; onCancel: () => void; onAprovar: () => void; abrirDossie: () => void }) {
  const contrato = data.contratos.find((x) => x.id === c.contratoId)!;
  const naoConformes = dossieDe(data, c.contratoId).filter((i) => i.conformidade !== "conforme");
  const diferenca = contrato.valor != null && c.valor != null ? c.valor - contrato.valor : 0;
  return (
    <DrawerModal id="conferir-cobranca" show title={`Conferir ${c.codigo}`} variant="medium" onCancel={onCancel} contentClass={CONTEUDO_DRAWER}>
      <div className="flex flex-col gap-5">
        <div className="w-full rounded-lg border border-brand-purple-dark/10 overflow-x-auto [&_table]:w-full [&_th]:bg-brand-blue/20 [&_th]:px-3 [&_th]:py-3 [&_th]:text-left [&_th]:text-brand-purple-dark [&_td]:px-3 [&_td]:py-3 [&_td]:text-brand-purple-dark/80 [&_tbody]:divide-y [&_tbody]:divide-brand-purple-dark/10">
          <table>
            <thead><tr><th>Item</th><th>{docLabel(c)}</th><th>Contrato {contrato.id}</th><th></th></tr></thead>
            <tbody>
              <Linha rotulo="Parte" documento={data.partes.find((p) => p.id === c.parteId)?.nome} contrato={parteDe(data, contrato)?.nome} ok={c.parteId === contrato.parteId} />
              <Linha rotulo="Valor" documento={<Valor valor={c.valor} />} contrato={<Valor valor={contrato.valor} />} ok={diferenca === 0} nota={`Diverge em ${brl(Math.abs(diferenca))}`} />
              <Linha rotulo="Vencimento" documento={c.vencimento ? br(c.vencimento) : "—"} contrato={contrato.vencimentoDia ? `Dia ${contrato.vencimentoDia}` : "—"} ok={!contrato.vencimentoDia || !c.vencimento || Number(c.vencimento.slice(8, 10)) === contrato.vencimentoDia} />
              <Linha rotulo="Vigência" documento={competencia(c.competencia)} contrato={`${br(contrato.inicio)} a ${br(contrato.fim)}`} ok={contrato.status === "vigente"} nota="Contrato não Vigente" />
            </tbody>
          </table>
        </div>

        {c.observacao && <p className="text-sm text-brand-purple-dark/70"><b>Observação do documento:</b> {c.observacao}</p>}

        {naoConformes.length > 0 && (
          <Aviso
            tom="atencao"
            titulo={`Dossiê do ${c.contratoId}: Pendente de Documentos`}
            acoes={<Button size="small" variant="outline" leftIcon="fa-folder-check" onClick={abrirDossie}>Abrir o dossiê do {c.contratoId}</Button>}
          >
            {naoConformes.map((i) => `${i.documento} (${CONFORMIDADE[i.conformidade].label})`).join("; ")}. Considere isso na conferência.
          </Aviso>
        )}
        {diferenca !== 0 ? (
          <Aviso tom="atencao" titulo="Valor diferente do contratado">
            Aprove só se a diferença estiver justificada no documento ou num aditivo.
          </Aviso>
        ) : (
          <Aviso tom="ok" titulo="Ao aprovar">O documento fica Aprovado 100% Conforme e liberado, com registro na auditoria; só então o envio ao ERP fica disponível.</Aviso>
        )}

        <div className={RODAPE_DRAWER}>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button color="green" leftIcon="fa-check-double" onClick={onAprovar}>Aprovar 100% Conforme</Button>
        </div>
      </div>
    </DrawerModal>
  );
}

/* ------------------------------------------------------------------ */
/* Detalhe do envio (FR-082)                                           */
/* ------------------------------------------------------------------ */

function DetalheEnvio({ c, contrato, parte, codigoParte, trilha, opera, onTentar }: { c: Cob; contrato?: Contrato; parte: string; codigoParte: string; trilha: RegistroAuditoria[]; opera: boolean; onTentar: () => void }) {
  const venc = br(c.vencimento ?? TODAY);
  // Dados do lançamento (RN-054): o código do documento é o identificador de integração, então um reenvio atualiza o mesmo título.
  const payload = {
    call: c.fluxo === "despesa" ? "IncluirContaPagar" : "IncluirContaReceber",
    param: [{
      codigo_lancamento_integracao: c.codigo,
      codigo_cliente_fornecedor_integracao: codigoParte,
      data_vencimento: venc,
      data_previsao: venc,
      valor_documento: c.valor != null || contrato?.valor != null ? MASCARA : 0,
      numero_documento_fiscal: c.numero || "NFS-E",
      id_origem: c.contratoId,
      observacao: `Integração Módulo de Contratos: ${c.contratoId} | ${parte} | Competência: ${c.competencia}`,
    }],
  };
  const comprovante = (() => {
    if (!c.erp.comprovante) return undefined;
    try { return JSON.stringify(JSON.parse(c.erp.comprovante), null, 2); } catch { return c.erp.comprovante; }
  })();
  const sandbox = c.erp.comprovante?.includes("SANDBOX");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Selo s={ERP[c.erp.status]} />
        <Selo s={CONFERENCIA[c.conferencia]} />
        {sandbox && <Tag item="SANDBOX / SIMULAÇÃO HOMOLOGADA" variant="dark-purple" leftIcon="fa-flask" />}
      </div>

      <Dados
        colunas={2}
        itens={[
          ["Título no Omie", c.erp.titulo ?? "—"],
          ["Identificador", c.codigo],
          ["Data do envio", quando(c.erp.data)],
          ["Lançamento", lancamento(c.fluxo)],
          ["Contrato", c.contratoId],
          ["Parte", parte],
          ["Documento", docLabel(c)],
          ["Valor", <Valor valor={c.valor ?? contrato?.valor} />],
        ]}
      />

      {c.erp.status === "sincronizado" && (
        <Aviso tom="ok" titulo={`Título ${c.erp.titulo} em ${lancamento(c.fluxo)}`}>
          Sincronizado no Omie ERP em {quando(c.erp.data)}. Um novo envio usa o mesmo identificador ({c.codigo}) e não duplica o título.
        </Aviso>
      )}
      {c.erp.status === "erro" && (
        <Aviso tom="risco" titulo="O envio ao Omie falhou" acoes={opera && <Button size="small" leftIcon="fa-rotate-right" onClick={onTentar}>Tentar de novo</Button>}>
          {c.erp.motivo} O documento continua disponível para nova tentativa.
        </Aviso>
      )}
      {c.erp.status === "pendente" && <Aviso tom="info" titulo="Ainda não enviado">Liberado para o ERP. Use Enviar ao ERP na lista.</Aviso>}

      {comprovante && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Comprovante de transmissão</p>
          <pre className="overflow-x-auto rounded-xl font-sans bg-brand-purple-dark/5 p-4 text-xs leading-relaxed text-brand-purple-dark/80">{comprovante}</pre>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Dados enviados (resumo)</p>
        <pre className="overflow-x-auto rounded-xl font-sans bg-brand-purple-dark/5 p-4 text-xs leading-relaxed text-brand-purple-dark/80">{JSON.stringify(payload, null, 2)}</pre>
      </div>

      {trilha.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Auditoria</p>
          <ul className="flex flex-col gap-2 text-sm text-brand-purple-dark/80">
            {trilha.map((a) => (
              <li key={a.id}><b>{a.acao}</b> · {quando(a.data)} · {a.usuario} ({a.perfil}): {a.detalhes}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Protocolo (FR-074, FR-075)                                          */
/* ------------------------------------------------------------------ */

type FormP = { contrato: string; fluxo: string; competencia: string; parte: string; tipo: string; numero: string; valor: string; vencimento: string; observacao: string; arquivo?: Arquivo };
type Auto = Partial<Record<keyof FormP, boolean>>;

/** Rótulo com o selo "Auto-detectado" enquanto o campo guarda o valor sugerido. */
function Rotulo({ htmlFor, children, auto }: { htmlFor: string; children: ReactNode; auto?: boolean }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <Label htmlFor={htmlFor}>{children}</Label>
      {auto && <AutoDetectado />}
    </div>
  );
}

function ModalProtocolo({
  data, cobrancas, contratoInicial, inicial, onCancel, onSalvar,
}: {
  data: ContratosData;
  cobrancas: Cob[];
  contratoInicial: string;
  inicial: { form: Partial<FormP>; auto: Auto; criterio?: Sugestao; vencimentoEstimado?: boolean };
  onCancel: () => void;
  onSalvar: (c: Cob) => void;
}) {
  const contratos = data.contratos;
  /** Ao escolher o contrato: parte, valor (se maior que zero) e fluxo (FR-075). */
  const preencher = (id: string): Partial<FormP> => {
    const c = contratos.find((x) => x.id === id);
    if (!c) return { contrato: id };
    return { contrato: id, parte: c.parteId, fluxo: fluxoDoContrato(c), ...(c.valor && c.valor > 0 && { valor: campoValor(c.valor) }) };
  };
  const doLeitor = !!inicial.criterio || Object.keys(inicial.form).length > 0;
  const [form, setForm] = useState<FormP>({
    contrato: "", fluxo: "", competencia: TODAY.slice(0, 7), parte: "", tipo: "", numero: "", valor: "", vencimento: "", observacao: "",
    ...(!doLeitor && contratos.some((c) => c.id === contratoInicial) ? preencher(contratoInicial) : {}),
    ...inicial.form,
  });
  const [auto, setAuto] = useState<Auto>(inicial.auto);
  const [doContrato, setDoContrato] = useState(!doLeitor && contratos.some((c) => c.id === contratoInicial));
  const [erros, setErros] = useState<Partial<Record<keyof FormP, string>>>({});
  const set = <K extends keyof FormP>(k: K, v: FormP[K]) => { setForm((f) => ({ ...f, [k]: v })); setAuto((a) => ({ ...a, [k]: false })); setErros((e) => ({ ...e, [k]: undefined })); };
  const entries: UploadEntry[] = form.arquivo ? [{ ref: "arquivo", clientName: form.arquivo.nome, clientSize: form.arquivo.tamanho, progress: 100, done: false }] : [];
  const tipos = [...new Set([...data.tabelas.tipo_cobranca.filter((o) => o.ativo).sort((a, b) => a.ordem - b.ordem).map((o) => o.descricao), ...(form.tipo ? [form.tipo] : [])])];
  const err = (k: keyof FormP) => (erros[k] ? [erros[k]!] : []);
  const codigo = form.contrato ? proximoCodigoItem("DOC", cobrancas, form.contrato) : "";

  const anexar = (file: File) => {
    const a = { nome: file.name, tamanho: file.size };
    const erro = validarAnexo(a);
    if (erro) { setForm((f) => ({ ...f, arquivo: undefined })); setErros((e) => ({ ...e, arquivo: erro })); return; }
    set("arquivo", a);
  };

  const salvar = () => {
    const e: Partial<Record<keyof FormP, string>> = {};
    if (!form.contrato) e.contrato = "Escolha o contrato do documento.";
    if (!form.fluxo) e.fluxo = "Escolha o fluxo da operação.";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.competencia)) e.competencia = "Informe a competência no formato AAAA-MM.";
    if (!form.parte) e.parte = "Informe a parte.";
    if (!form.tipo) e.tipo = "Escolha o tipo do documento.";
    if (!form.numero.trim()) e.numero = "Informe o nº de referência do documento.";
    if (form.valor && normalizarValor(form.valor) == null) e.valor = "Informe um valor maior que zero ou deixe em branco.";
    setErros(e);
    if (Object.keys(e).length) return;
    const valor = normalizarValor(form.valor);
    onSalvar({
      id: `b${Date.now()}`,
      codigo,
      contratoId: form.contrato,
      fluxo: fluxoDe(form.fluxo),
      fluxoOperacao: form.fluxo,
      parteId: form.parte,
      competencia: form.competencia,
      tipo: form.tipo,
      numero: form.numero.trim(),
      ...(valor != null && { valor }),
      ...(form.vencimento && { vencimento: form.vencimento }),
      conferencia: "pendente",
      conformidade: "pendente",
      liberado: false,
      erp: { status: "travado" },
      ...(form.arquivo && { arquivo: form.arquivo }),
      ...(form.observacao.trim() && { observacao: form.observacao.trim() }),
      ...(inicial.criterio && { autoDetectado: true }),
    });
  };

  return (
    <DrawerModal id="protocolo-cobranca" show title="Protocolar documento de cobrança" variant="medium" onCancel={onCancel} contentClass={CONTEUDO_DRAWER}>
      <div className="flex flex-col gap-6">
        <Aviso tom="info">
          O documento entra como Pendente Conferência e não liberado{codigo ? ` (${codigo})` : ""}: fica com a Trava de Governança até alguém conferir contra o contrato.
        </Aviso>
        {inicial.criterio && (
          <p className={cx("flex items-start gap-2 text-sm", inicial.criterio.passo === 4 ? "text-yellow-dark" : "text-brand-purple-dark/70")}>
            <Icon name={inicial.criterio.passo === 4 ? "fa-triangle-exclamation" : "fa-circle-info"} className="mt-0.5" />
            <span><b>Critério (passo {inicial.criterio.passo}{inicial.criterio.passo === 4 ? ", baixa confiança" : ""}):</b> {inicial.criterio.criterio}</span>
          </p>
        )}
        <div>
          <Rotulo htmlFor="pc-contrato" auto={auto.contrato}>Contrato</Rotulo>
          <Input
            type="select"
            id="pc-contrato"
            prompt="Escolha o contrato"
            value={form.contrato}
            options={contratos.map((c) => ({ value: c.id, label: `${c.id} · ${parteDe(data, c)?.nome ?? ""}${c.status === "vigente" ? "" : ` (${c.status === "encerrado" ? "Encerrado" : "não Vigente"})`}` }))}
            onChange={(v) => { setForm((f) => ({ ...f, ...preencher(v ?? "") })); setAuto((a) => ({ ...a, contrato: false, parte: false, fluxo: false, valor: false })); setErros({}); setDoContrato(!!v); }}
            errors={err("contrato")}
          />
          {doContrato && <p className="mt-1 text-sm text-brand-purple-dark/60"><Icon name="fa-circle-info" className="mr-1 text-brand-blue" />Parte, fluxo e valor vieram do contrato. Ajuste se o documento for diferente.</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Rotulo htmlFor="pc-fluxo" auto={auto.fluxo}>Fluxo da operação</Rotulo>
            <Input type="select" id="pc-fluxo" prompt="Escolha o fluxo" value={form.fluxo} options={FLUXOS_OPERACAO.map((f) => ({ value: f, label: f }))} onChange={(v) => set("fluxo", v ?? "")} errors={err("fluxo")} />
          </div>
          <div>
            <Rotulo htmlFor="pc-competencia" auto={auto.competencia}>Competência (AAAA-MM)</Rotulo>
            <Input type="month" id="pc-competencia" value={form.competencia} onChange={(e) => set("competencia", e.target.value)} errors={err("competencia")} />
          </div>
          <div>
            <Rotulo htmlFor="pc-parte" auto={auto.parte}>Parte</Rotulo>
            <Input type="select" id="pc-parte" prompt="Escolha a parte" value={form.parte} options={data.partes.map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nome}` }))} onChange={(v) => set("parte", v ?? "")} errors={err("parte")} />
          </div>
          <div>
            <Rotulo htmlFor="pc-tipo" auto={auto.tipo}>Tipo de documento</Rotulo>
            <Input type="select" id="pc-tipo" prompt="Escolha o tipo" value={form.tipo} options={tipos.map((t) => ({ value: t, label: t }))} onChange={(v) => set("tipo", v ?? "")} errors={err("tipo")} />
          </div>
          <div>
            <Rotulo htmlFor="pc-numero" auto={auto.numero}>Nº de referência</Rotulo>
            <Input id="pc-numero" placeholder="Ex.: NFS-e 815" value={form.numero} onChange={(e) => set("numero", e.target.value)} errors={err("numero")} />
          </div>
          <div>
            <Rotulo htmlFor="pc-valor" auto={auto.valor}>Valor</Rotulo>
            <Input id="pc-valor" hint="R$" placeholder="Ex.: 12.500,00" value={form.valor} onChange={(e) => set("valor", e.target.value)} errors={err("valor")} />
          </div>
          <div>
            <Rotulo htmlFor="pc-vencimento" auto={auto.vencimento}>Vencimento</Rotulo>
            <Input type="date" id="pc-vencimento" value={form.vencimento} onChange={(e) => set("vencimento", e.target.value)} />
            {auto.vencimento && inicial.vencimentoEstimado && <p className="mt-1 text-xs text-brand-purple-dark/60">Estimado pelo dia de vencimento do contrato.</p>}
          </div>
        </div>
        <Input type="textarea" id="pc-obs" label="Observação" rows={2} value={form.observacao} onChange={(e) => set("observacao", e.target.value)} />
        <div>
          <Label>Arquivo</Label>
          <div className="mt-1">
            <FileUploader
              variant="simplified"
              upload={{ ref: "pc-arquivo", accept: ".pdf,.doc,.docx,.png,.jpg,.jpeg,.xml", maxEntries: 1, entries }}
              onChange={(files) => files[0] && anexar(files[0])}
              onCancel={() => set("arquivo", undefined)}
            />
          </div>
          {erros.arquivo && <p className="mt-1 text-sm text-red"><Icon name="fa-circle-exclamation" className="mr-1" />{erros.arquivo}</p>}
        </div>
        <div className={RODAPE_DRAWER}>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button leftIcon="fa-check" onClick={salvar}>Protocolar</Button>
        </div>
      </div>
    </DrawerModal>
  );
}
