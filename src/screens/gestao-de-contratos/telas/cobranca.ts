import type { Feature } from "../../../app/features.js";
import { ContratosCobranca } from "../../ContratosCobranca.js";
import { ROTAS, papelControl } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = ["core.table", "core.input", "core.drawer-modal", "core.file-uploader", "core.tooltip", "core.empty-state-card", "core.toast-wrapper"];
const c = cenario(COMPONENTS);

/** Contratos que têm cobrança na fixture `contratos.base`. */
const CONTRATOS = ["CT-2026-001", "CT-2026-002", "CT-2026-003", "CT-2026-004", "CT-2026-005", "CT-2025-018", "CT-2025-040"];

export const cobranca: Feature = {
  routes: [
    {
      path: ROTAS.cobranca,
      screen: ContratosCobranca,
      name: "Conformidade — Cobrança e ERP",
      group: FLOW,
      description: "Smart Intake, protocolo manual, conferência contra o contrato e envio ao Omie com a Trava de Governança.",
      components: COMPONENTS,
      controls: [
        {
          id: "intake",
          title: "Smart Intake · file_uploader",
          note: "O arquivo enviado e o resultado da leitura.",
          component: "core.file-uploader",
          controls: [
            {
              id: "intake",
              label: "Leitura",
              options: [
                { value: "nenhum", label: "Nenhum arquivo" },
                { value: "xml", label: "XML: NFS-e da Clínica Integrar" },
                { value: "pdf", label: "PDF: Fatura de Locação" },
                { value: "sem-match", label: "CNPJ sem cadastro" },
              ],
            },
          ],
        },
        {
          id: "abertura",
          title: "Abertura da tela",
          note: "A Ficha do contrato leva filtrada pelo contrato.",
          controls: [
            {
              id: "filtro",
              label: "Filtro",
              options: [
                { value: "todos", label: "Todos" },
                { value: "pagar", label: "Pagar" },
                { value: "receber", label: "Receber" },
                { value: "conformes", label: "Conformes" },
                { value: "sincronizados", label: "Sincronizados" },
                { value: "travados", label: "Travados" },
              ],
            },
            { id: "contrato", label: "Contrato", options: [{ value: "todos", label: "Todos" }, ...CONTRATOS.map((id) => ({ value: id, label: id }))] },
            { id: "detalhe", label: "Detalhe do envio", options: [{ value: "nenhum", label: "Fechado" }, { value: "b1", label: "b1 · sincronizado" }, { value: "b3", label: "b3 · erro" }] },
            { id: "modal", label: "Modal", options: [{ value: "nenhum", label: "Nenhum" }, { value: "protocolo", label: "Protocolo manual" }] },
          ],
        },
        papelControl("financeiro"),
      ],
      expected: [
        "Smart Intake: XML (NF-e, NFS-e) ou PDF (Folha, Boleto, Fatura de Locação, RPA, NF); campos lidos e sugestão de contrato e parte com selo Auto-detectado e o critério.",
        "CNPJ sem cadastro ou leitura falha: aviso com motivo e o que fazer, sem sugerir contrato.",
        "Lista com contrato, fluxo, parte, competência, documento, vencimento, valor mascarado, conferência, conformidade, liberação e situação no ERP.",
        "Conferir (Controladoria) libera; só então aparece Sincronizar com o ERP. Não liberado mostra a Trava de Governança no lugar do botão.",
        "Clicar na situação ou no título abre o detalhe do envio.",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.cobranca",
      title: "Cobranças do mês",
      route: ROTAS.cobranca,
      intent: "O Financeiro vê as cobranças, confere as pendentes e sincroniza as liberadas com o Omie.",
      expected: [
        "Área do Smart Intake para enviar XML ou PDF.",
        "Lista com 7 cobranças, valores mascarados (R$ ••••••••) com olho para revelar.",
        "b2 (Fatura de Locação LOC-0826, CT-2026-003) e b6 (NFS-e 2026/0233, CT-2025-040): Pendente Conferência, Trava de Governança com \"Confira o documento contra o contrato para liberar\" e o botão Conferir.",
        "b5 (Folha 07/2026, CT-2026-005): Aprovado 100% Conforme, Liberado, ERP Pendente e o botão Sincronizar com o ERP; sincronizar gera o título 88413.",
        "b1, b4 e b7 Sincronizados com o título; b3 com Erro e Ver erro.",
        "Conferir a b2 mostra o valor divergente (IPTU) e permite aprovar; conferir a b6 recusa porque o dossiê do CT-2025-040 tem o laudo sanitário não conforme, com o atalho para o Dossiê.",
        "Busca à esquerda dos selects Pagar (5) e Receber (2), Conformes (5), Sincronizados (3) e Travados (2); Exportar planilha.",
      ],
    }),
    c({
      id: "contratos.cobranca-intake-xml",
      title: "Leitura de NFS-e (XML)",
      route: ROTAS.cobranca,
      controls: { intake: "xml" },
      intent: "Enviar o XML da NFS-e da Clínica Integrar e confirmar a cobrança sugerida.",
      expected: [
        "Campos lidos: NFS-e 2026/0815, valor mascarado, vencimento 10/09/2026, competência 08/2026, CNPJ 12.345.678/0001-90.",
        "Contrato CT-2026-001 e parte Clínica Integrar Terapias Ltda. (Despesa) com selo Auto-detectado.",
        "Critério: \"CNPJ 12.345.678/0001-90 = Clínica Integrar · contrato Vigente CT-2026-001 · valor igual ao contratado\".",
        "Confirmar cria a cobrança na lista (competência 08/2026) como Pendente Conferência, com Trava de Governança, e mostra toast.",
        "Trocar o contrato tira o selo e mostra o aviso para conferir.",
      ],
    }),
    c({
      id: "contratos.cobranca-intake-pdf",
      title: "Leitura de Fatura de Locação (PDF)",
      route: ROTAS.cobranca,
      controls: { intake: "pdf" },
      intent: "Enviar o PDF da fatura de locação de setembro da Unidade Girassol.",
      expected: [
        "Campos lidos: Fatura de Locação LOC-0926, vencimento 05/09/2026, competência 09/2026, CNPJ 44.555.666/0001-77.",
        "Sugestão CT-2026-003 · Imobiliária Horizonte Ltda. com Auto-detectado e o critério \"CNPJ 44.555.666/0001-77 = Imobiliária Horizonte · contrato Vigente CT-2026-003 · valor igual ao contratado\".",
        "Confirmar cria a cobrança Pendente Conferência.",
      ],
    }),
    c({
      id: "contratos.cobranca-intake-sem-match",
      title: "CNPJ sem cadastro",
      route: ROTAS.cobranca,
      controls: { intake: "sem-match" },
      intent: "Enviar uma NF-e de um CNPJ que não está no Cadastro de Partes.",
      expected: [
        "Campos lidos: NF-e 000.112.233, CNPJ 99.888.777/0001-66.",
        "Nenhum contrato sugerido: aviso \"O CNPJ 99.888.777/0001-66 não está no Cadastro de Partes, então não há contrato para sugerir\" e o que fazer.",
        "Botões Cadastrar a parte (vai para Partes), Protocolo manual e Descartar. Nenhum contrato aparece pré-escolhido.",
      ],
    }),
    c({
      id: "contratos.cobranca-trava",
      title: "Cobranças travadas",
      route: ROTAS.cobranca,
      controls: { filtro: "travados" },
      intent: "Ver o que ainda não pode ir para o ERP e por quê.",
      expected: [
        "Select Situação em Travados: b2 (CT-2026-003) e b6 (CT-2025-040).",
        "Nas duas, Trava de Governança (cadeado) no lugar de Sincronizar, com \"Confira o documento contra o contrato para liberar\", e Situação no ERP \"Não enviado\".",
        "Conferir a b2 libera e troca a trava por Sincronizar com o ERP.",
      ],
    }),
    c({
      id: "contratos.cobranca-sincronizado",
      title: "Detalhe de envio sincronizado",
      route: ROTAS.cobranca,
      controls: { detalhe: "b1" },
      intent: "Abrir o envio da NFS-e 2026/0712 da Clínica Integrar.",
      expected: [
        "Gaveta \"Envio ao ERP · NFS-e 2026/0712\" com Sincronizado e Aprovado 100% Conforme.",
        "Data do envio 09/07/2026 às 15:02 e título no Omie 88412.",
        "Resumo dos dados enviados (contas a pagar, FOR-0001, vencimento 10/08/2026, valor mascarado).",
      ],
    }),
    c({
      id: "contratos.cobranca-erro-erp",
      title: "Erro no envio ao ERP",
      route: ROTAS.cobranca,
      controls: { detalhe: "b3" },
      intent: "Entender por que a NF-e 000.451.902 da Nuvem Clínica não entrou no Omie.",
      expected: [
        "Gaveta com Erro, data 29/07/2026 às 10:12 e sem título.",
        "Aviso \"O Omie recusou o envio\": fornecedor sem conta bancária cadastrada no Omie (FOR-0003); cadastre a conta no Omie e sincronize de novo.",
        "Tentar de novo (Financeiro) sincroniza e gera o título.",
      ],
    }),
  ],
};
