/**
 * Gestão de Contratos — o PDF do contrato (FR-043), em pré-visualização.
 *
 * Folha A4 com cabeçalho, faixa de fase e status e "Página X de Y"; quadros I
 * a IV (qualificação das partes, resumo comercial, campos da categoria e
 * governança com aditivos); as cláusulas gravadas no contrato, sem tags; e a
 * página de assinaturas, com o selo de validade digital só quando o contrato
 * está "Assinado Digitalmente" e o fecho na data da conclusão. Campos vazios
 * são omitidos. Gerar o PDF não altera o contrato.
 *
 * Feito na tela (componente novo para o dev): a folha A4 e os quadros. O resto
 * é `modal` e `button`.
 */
import type { ReactNode } from "react";
import { showToast } from "../../components/Action.js";
import { Button } from "../../components/Button.js";
import { Modal } from "../../components/Overlay.js";
import {
  ASSINATURA, CONTRATANTE, FLUXO, MODALIDADE, STATUS, aditivosDe, br, brl, faseNumerada, parteDe, rotuloAditivo, tituloDocumento,
  type Contrato, type ContratosData,
} from "./model.js";
import { FolhaA4, paginar } from "./ui.js";

/** Linhas "rótulo: valor" de um quadro, sem as vazias. */
function Quadro({ n, titulo, linhas }: { n: string; titulo: string; linhas: [string, ReactNode | undefined][] }) {
  const cheias = linhas.filter(([, v]) => v !== undefined && v !== "" && v !== null);
  if (!cheias.length) return null;
  return (
    <section className="rounded border border-neutral-300">
      <h3 className="border-b border-neutral-300 bg-neutral-100 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wide">
        Quadro {n} — {titulo}
      </h3>
      <dl className="grid grid-cols-[minmax(0,40%)_1fr] gap-x-3 gap-y-0.5 px-3 py-2 text-[12px]">
        {cheias.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-semibold">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function PaginasContrato({ contrato: c, data }: { contrato: Contrato; data: ContratosData }) {
  const p = parteDe(data, c);
  const assinado = c.assinatura === "assinado";
  const aditivos = aditivosDe(data, c.id);
  const campos = Object.entries(c.camposCategoria ?? {});

  const abertura = (
    <>
      <h2 className="text-center font-sans text-base font-bold">{tituloDocumento(c.categoria)}</h2>
      <p className="text-center font-sans text-xs">
        {c.id} · {c.versao}
      </p>
      <Quadro n="I" titulo="Qualificação das Partes" linhas={[
        ["Contratante", `${CONTRATANTE.razao}, CNPJ ${CONTRATANTE.cnpj}, ${CONTRATANTE.endereco}`],
        ["Contratada", p ? `${p.nome}, ${p.pessoa === "PJ" ? "CNPJ" : "CPF"} ${p.documento}${p.endereco ? `, ${p.endereco}` : ""}` : "Parte Contratada Homologada"],
        ["Representante", p?.contato.nome],
        ["Liminar", c.liminar && `Processo ${c.liminar.processo} · ${c.liminar.vara}`],
      ]} />
      <Quadro n="II" titulo="Resumo Comercial" linhas={[
        ["Modalidade", MODALIDADE[c.modalidade].longo],
        ["Categoria", c.categoria],
        ["Fluxo", c.fluxoDetalhe ?? FLUXO[c.fluxo].longo],
        ["Objeto", c.objeto],
        ["Regra de remuneração", c.regraRemuneracao],
        ["Valor base mensal", c.valor !== undefined ? brl(c.valor) : undefined],
        ["Pagamento", [c.formaPagamento, c.condicaoPagamento, c.vencimentoDia && `vencimento dia ${c.vencimentoDia}`].filter(Boolean).join(" · ") || undefined],
        ["Vigência", `${br(c.inicio)} a ${br(c.fim)}${c.tipoPrazo ? ` · ${c.tipoPrazo}` : ""}`],
        ["Reajuste", c.indice && `${c.indice}${c.mesBase ? `, mês-base ${c.mesBase}` : ""}`],
        ["Aviso prévio", `${c.avisoPrevioDias} dias`],
        ["Unidades", c.unidades.join(", ")],
        ["Centro de custo", c.centroCusto],
        ["Gestor responsável", c.gestor],
      ]} />
      <Quadro n="III" titulo={`Campos Específicos · ${c.categoria}`} linhas={campos} />
      <Quadro n="IV" titulo="Governança & Aditivos" linhas={[
        ["Aprovação", c.aprovador && `${c.aprovador.nome} em ${br(c.aprovador.data)}`],
        ["Assinatura", `${ASSINATURA[c.assinatura].label}${c.envelope ? ` · ${c.envelope.plataforma} ${c.envelope.id}` : ""}`],
        ["Minuta de origem", c.minuta && `${c.minuta.codigo} ${c.minuta.versao}`],
        ...aditivos.map((a): [string, ReactNode] => [rotuloAditivo(a), `${a.codigo} · ${br(a.data)} · ${a.impacto}`]),
      ]} />
    </>
  );

  const clausulas = (c.clausulas ?? []).map((cl) => (
    <div key={cl.id}>
      <h4 className="font-bold">{cl.titulo}</h4>
      <p className="whitespace-pre-line text-justify">{cl.texto}</p>
    </div>
  ));

  const assinaturas = (
    <>
      <p>
        E, por estarem assim justas e contratadas, as partes assinam o presente instrumento
        {assinado && c.assinaturaConcluida ? ` em ${br(c.assinaturaConcluida)}` : ""}.
      </p>
      <div className="grid grid-cols-2 gap-8 pt-10 font-sans text-xs">
        {[CONTRATANTE.razao, p?.nome ?? "Parte Contratada Homologada"].map((n) => (
          <div key={n} className="border-t border-neutral-500 pt-1 text-center">{n}</div>
        ))}
      </div>
      {assinado && c.envelope && (
        <div className="mt-6 rounded border-2 border-green-600 p-3 text-center font-sans text-xs text-green-700">
          <strong>Documento assinado digitalmente</strong> · {c.envelope.plataforma} · envelope {c.envelope.id}
          {c.assinaturaConcluida && ` · concluído em ${br(c.assinaturaConcluida)}`}
        </div>
      )}
    </>
  );

  const paginas: ReactNode[] = [abertura, ...paginar(clausulas, 6).filter((g) => g.length).map((g) => <>{g}</>), assinaturas];
  return (
    <FolhaA4
      paginas={paginas}
      cabecalho={
        <div className="flex justify-between gap-4">
          <span>{CONTRATANTE.razao} · {c.id} {c.versao}</span>
          <span>{faseNumerada(c.fase)} · {STATUS[c.status].label}</span>
        </div>
      }
    />
  );
}

/** "Exportar PDF" pela Ficha ou pela Carteira: abre a pré-visualização e baixa. */
export function ModalPdfContrato({ contrato, data, onClose }: { contrato: Contrato | null; data: ContratosData; onClose: () => void }) {
  return (
    <Modal id="pdf-contrato" show={!!contrato} title={contrato ? `${contrato.id}-${contrato.versao}.pdf` : ""} variant="large" onCancel={onClose}>
      {contrato && (
        <div className="space-y-4">
          <PaginasContrato contrato={contrato} data={data} />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
            <Button
              leftIcon="fa-download"
              onClick={() => {
                showToast({ type: "success", title: "PDF gerado", content: `${contrato.id}-${contrato.versao}.pdf em A4. O contrato não foi alterado.`, closeTime: 4000 });
                onClose();
              }}
            >
              Baixar PDF
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
