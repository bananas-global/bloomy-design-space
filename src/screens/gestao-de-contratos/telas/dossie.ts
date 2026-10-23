import type { Feature } from "../../../app/features.js";
import { ContratosDossie } from "../../ContratosDossie.js";
import { ROTAS, papelControl } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = ["core.table", "core.input", "core.drawer-modal", "core.file-uploader", "core.button-tabs", "core.empty-state-card", "core.toast-wrapper"];
const c = cenario(COMPONENTS);

/** Contratos que têm itens de dossiê na fixture `contratos.base` (todos: o checklist inicial nasce com o contrato, RN-031). */
const CONTRATOS = [
  "CTR-2026-0001", "CTR-2026-0002", "CTR-2026-0003", "CTR-2026-0004", "CTR-2026-0005", "CTR-2026-0006", "CTR-2026-0007",
  "CTR-2026-0008", "CTR-2026-0009", "CTR-2026-0010", "CTR-2025-0018", "CTR-2025-0031", "CTR-2025-0040",
];

export const dossie: Feature = {
  routes: [
    {
      path: ROTAS.dossie,
      screen: ContratosDossie,
      name: "Conformidade — Dossiê",
      group: FLOW,
      description: "Aba Dossiê da central de Conformidade: o checklist e os documentos de todos os contratos, a situação 100% Conforme ou Pendente de Documentos e o protocolo de documento (FR-070 a FR-073, RN-050).",
      components: COMPONENTS,
      controls: [
        {
          id: "abertura",
          title: "Abertura da tela",
          note: "A Torre leva com o filtro Pendentes; a Ficha do contrato leva filtrada pelo contrato.",
          controls: [
            {
              id: "filtro",
              label: "Filtro",
              options: [
                { value: "todos", label: "Todos" },
                { value: "conformes", label: "Conformes" },
                { value: "pendentes", label: "Pendentes" },
                { value: "aso", label: "ASO/Saúde" },
                { value: "certidoes", label: "Certidões" },
              ],
            },
            { id: "contrato", label: "Contrato", options: [{ value: "todos", label: "Todos" }, ...CONTRATOS.map((id) => ({ value: id, label: id }))] },
            { id: "modal", label: "Modal", options: [{ value: "nenhum", label: "Nenhum" }, { value: "protocolar", label: "Protocolar documento" }] },
          ],
        },
        papelControl("juridico"),
      ],
      expected: [
        "Resumo por contrato com o selo 100% Conforme ou Pendente de Documentos (N); clicar filtra a lista.",
        "Lista com código DOS-{contrato}-NN, contrato, parte, natureza, documento, arquivo ou Pendente de Anexo, validade (vazia: Indeterminada), conformidade e auditor.",
        "Filtros Todos, Conformes e Pendentes; ASO/Saúde (documentos com ASO ou de saúde) e Certidões (CND e certidões); busca e Exportar planilha.",
        "Protocolar documento: status só Conforme / Aprovado ou Pendente Regularização; item pendente com a mesma natureza e o mesmo documento é preenchido; fora do checklist cria DOS-{contrato}-NN.",
        "Padrões do protocolo: validade Indeterminada, observação \"Documento homologado\", auditor Compliance / Jurídico. Anexo PDF, DOC, DOCX, PNG, JPG, JPEG ou XML até 25 MB.",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.dossie",
      title: "Dossiê de todos os contratos",
      route: ROTAS.dossie,
      intent: "O Compliance confere o dossiê da carteira e vê o que falta para cada contrato ficar 100% Conforme.",
      expected: [
        "Resumo com 13 contratos: CTR-2026-0001, 0003, 0004, 0009, CTR-2025-0018 e CTR-2025-0031 com 100% Conforme; CTR-2026-0006 Pendente de Documentos (3), CTR-2026-0008 (2), CTR-2026-0002, 0005, 0007, 0010 e CTR-2025-0040 (1).",
        "Lista com 46 itens: o checklist inicial de cada contrato (Contrato Social Consolidado & Cartão CNPJ, Certidão Conjunta RFB/PGFN (CND Federal), Certidão de Regularidade Profissional / ASO Admissional e, no CTR-2026-0010, a Cópia da Decisão Judicial Liminar) e os documentos fora do checklist (CRF FGTS, SOC 2, Matrícula, AVCB, Registro no CRP, Laudo de vigilância sanitária).",
        "Os pendentes sem arquivo mostram Pendente de Anexo; validade vazia mostra Indeterminada.",
        "Laudo de vigilância sanitária (DOS-CTR-2025-0040-04) com validade 30/06/2026 em vermelho e Não conforme.",
        "Status: Conformes (36) e Pendentes (10); Tipo de documento: ASO/Saúde (13) e Certidões (26). Exportar planilha exporta só as linhas listadas.",
        "Botão Protocolar documento (some para quem só consulta: Diretoria, Financeiro).",
      ],
    }),
    c({
      id: "contratos.dossie-protocolar",
      title: "Protocolar o ASO pendente",
      route: ROTAS.dossie,
      controls: { contrato: "CTR-2026-0005", modal: "protocolar" },
      intent: "Protocolar o ASO admissional da Camila Rocha Duarte (CTR-2026-0005), que preenche o item pendente do checklist em vez de criar outro.",
      expected: [
        "Lista filtrada no CTR-2026-0005 com 4 itens; só o DOS-CTR-2026-0005-03 (Certidão de Regularidade Profissional / ASO Admissional) pendente.",
        "Drawer com contrato CTR-2026-0005, natureza Regulatória / Técnica e documento já preenchidos (é o único pendente) e status Conforme / Aprovado.",
        "Aviso \"O protocolo vai preencher o item DOS-CTR-2026-0005-03\". Anexo acima de 25 MB mostra \"Arquivo excede o limite máximo permitido de 25 MB.\".",
        "Protocolar preenche o item (arquivo, validade Indeterminada, observação Documento homologado, auditor Compliance / Jurídico), fecha o drawer e o toast diz \"Dossiê do CTR-2026-0005: 100% Conforme\".",
      ],
    }),
    c({
      id: "contratos.dossie-fora-do-checklist",
      title: "Documento fora do checklist",
      route: ROTAS.dossie,
      controls: { contrato: "CTR-2026-0001", modal: "protocolar" },
      intent: "Protocolar um alvará sanitário no CTR-2026-0001, que não está no checklist.",
      expected: [
        "Drawer com o CTR-2026-0001 e sem item pendente (contrato 100% Conforme).",
        "Natureza Regulatória / Técnica e documento \"Alvará sanitário\": aviso \"Documento fora do checklist: cria o item DOS-CTR-2026-0001-05\".",
        "Com status Pendente Regularização, o item novo entra na lista e o toast diz \"Dossiê do CTR-2026-0001: Pendente de Documentos\".",
      ],
    }),
    c({
      id: "contratos.dossie-vazio",
      title: "Dossiê vazio",
      route: ROTAS.dossie,
      fixture: "contratos.vazio",
      intent: "Implantação nova: ainda não há contrato, então não há documento no dossiê.",
      expected: ["Estado vazio \"Nenhum documento no dossiê\", explicando que os itens nascem com o contrato (checklist inicial)."],
    }),
  ],
};
