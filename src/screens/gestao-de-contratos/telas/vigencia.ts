import type { Feature } from "../../../app/features.js";
import { ContratosVigencia } from "../../ContratosVigencia.js";
import { ROTAS, papelControl } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = ["core.lazy-tabs", "core.table", "core.drawer-modal", "core.input", "core.form-grid", "core.file-uploader", "core.empty-state-card", "core.toast-wrapper"];
const c = cenario(COMPONENTS);

/** Os Vigentes da fixture base, para o controle "Contrato". Valor desconhecido = sem filtro. */
const VIGENTES = ["CTR-2026-0001", "CTR-2026-0002", "CTR-2026-0003", "CTR-2026-0004", "CTR-2026-0005", "CTR-2025-0018", "CTR-2025-0040"];

export const aditivosVigencia: Feature = {
  routes: [
    {
      path: ROTAS.vigencia,
      screen: ContratosVigencia,
      name: "Vigência & Aditivos",
      group: FLOW,
      description: "Radar de vencimentos, reajustes pela data-base e o livro de termos aditivos, só dos contratos Vigentes.",
      components: COMPONENTS,
      controls: [
        {
          id: "abertura",
          title: "Abertura",
          note: "A Ficha do Contrato abre esta tela com o contrato filtrado; a Torre de Controle abre o Radar já filtrado.",
          controls: [
            { id: "aba", label: "Aba", default: "radar", options: [{ value: "radar", label: "Radar" }, { value: "reajustes", label: "Reajustes" }, { value: "aditivos", label: "Aditivos" }] },
            { id: "contrato", label: "Contrato", default: "todos", options: [{ value: "todos", label: "Todos os Vigentes" }, ...VIGENTES.map((id) => ({ value: id, label: id }))] },
            { id: "faixa", label: "Filtro do Radar", default: "todas", options: [{ value: "todas", label: "Nenhum" }, { value: "critico", label: "Crítico" }, { value: "alerta", label: "Atenção" }, { value: "regular", label: "Regular" }, { value: "experiencia", label: "CLT em experiência" }] },
            { id: "modal", label: "Modal", default: "nenhum", options: [{ value: "nenhum", label: "Nenhum" }, { value: "aplicar-reajuste", label: "Aplicar reajuste" }, { value: "aditivo", label: "Novo aditivo" }] },
          ],
        },
        papelControl("administrador"),
      ],
      expected: [
        "Três abas: Radar (Vigentes pelo fim mais próximo), Reajustes (data-base, janela de 60 dias, índice e sugestão) e Aditivos (livro).",
        "Com um contrato na abertura, etiqueta \"Contrato: CTR-…\" removível e as três abas filtradas.",
        "Aplicar reajuste é do Financeiro / Controladoria; Novo aditivo, do Jurídico e do operador; a Diretoria só lê.",
        "Exportar planilha em cada aba: separador \";\", nome \"<lista>_AAAA-MM-DD\", só as linhas filtradas e sem a coluna de ações.",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.vigencia-radar",
      title: "Radar de vigência",
      route: ROTAS.vigencia,
      controls: { aba: "radar", papel: "financeiro" },
      intent: "Ver quais contratos Vigentes terminam primeiro e o que já venceu.",
      expected: [
        "Aba Radar com os 7 Vigentes pelo fim mais próximo: CTR-2025-0018 (25/07/2026, Crítico (≤ 30d), \"Vencido\"), CTR-2026-0001 (17/08/2026, Crítico (≤ 30d), 18 dias), CTR-2026-0005 (29/08/2026, Crítico (≤ 30d), 30 dias), CTR-2026-0003 (20/10/2026, Atenção (31 a 90d), 82 dias), CTR-2025-0040, CTR-2026-0002 e CTR-2026-0004 (Regular (> 90d)).",
        "Select Filtro: Todos (7), Crítico 3 (inclui o vencido), Atenção 1, Regular 3 e CLT em experiência 1 (CTR-2026-0005, Camila Rocha Duarte, vigência de 89 dias até 29/08/2026).",
        "Coluna \"Regra de renovação / reajuste\" com a regra específica quando o contrato tem: CTR-2026-0003 \"Reajuste anual pelo IGP-M; na deflação, mantém o valor.\"; nos demais, \"—\".",
        "Clicar na linha ou no ícone abre a ficha. Exportar planilha com o filtro aplicado.",
      ],
    }),
    c({
      id: "contratos.vigencia-reajustes",
      title: "Reajustes",
      route: ROTAS.vigencia,
      controls: { aba: "reajustes", papel: "financeiro" },
      intent: "O Financeiro vê as data-bases que se aproximam e quanto cada contrato deve subir.",
      expected: [
        "Data-base = aniversário do início (29/02 vira 28/02). Lista pela próxima data-base: CTR-2026-0001 (18/08/2026, em 19 dias) e CTR-2026-0002 (01/09/2026, em 33 dias) com \"Janela Aberta (< 60d)\"; CTR-2026-0003 (21/10/2026), CTR-2025-0040 (01/12/2026), CTR-2026-0004 (01/01/2027), CTR-2026-0005 (01/06/2027) e CTR-2025-0018 (26/07/2027) com \"Aguardando Data-Base\".",
        "Taxas: IPCA 4,20%, IGP-M 4,50%, CCT 5,10%; outro índice 3,80%. CTR-2025-0040 (INPC) aparece sinalizado como índice não reconhecido, com aviso no topo e taxa 3,80%.",
        "Coluna \"Último Reajuste\": 21/10/2025 em CTR-2026-0003 (TA-01/CTR-2026-0003); \"—\" nos demais.",
        "Valor atual e novo valor sugerido mascarados (R$ ••••••••); revelados, CTR-2026-0001 vai de R$ 18.500,00 para R$ 19.277,00 e CTR-2025-0040 de R$ 9.200,00 para R$ 9.549,60.",
        "Selects Janela (Janela Aberta 2) e Índice (IPCA 3, IGP-M 2, CCT 1), com etiquetas removíveis.",
        "Aplicar reajuste só nas linhas Vigentes com janela aberta e para o Financeiro (CTR-2026-0001, CTR-2026-0002). Para outros papéis, selo de leitura.",
      ],
    }),
    c({
      id: "contratos.vigencia-aplicar-reajuste",
      title: "Aplicar reajuste",
      route: ROTAS.vigencia,
      controls: { aba: "reajustes", contrato: "CTR-2026-0001", modal: "aplicar-reajuste", papel: "financeiro" },
      intent: "Aplicar o reajuste IPCA do CTR-2026-0001 (PJ Assistencial), com a janela aberta.",
      expected: [
        "Etiqueta \"Contrato: CTR-2026-0001\" e drawer \"Aplicar reajuste · CTR-2026-0001\": valor atual R$ 18.500,00, taxa IPCA 4,20%, valor calculado R$ 19.277,00, data-base 18/08/2026 e vigência até 17/08/2026 (não muda).",
        "Campo Novo valor pré-preenchido com 19.277,00 e Justificativa opcional; aviso de que gera o 2º Termo Aditivo (Reajuste Financeiro), TA-02/CTR-2026-0001, Aprovado e Assinado.",
        "Mudar o valor (ex.: 19.300,00) mostra o aviso \"Ajuste manual\" e torna a justificativa obrigatória; sem ela, erro no campo.",
        "Aplicar fecha o drawer e mostra o toast. No livro, TA-02/CTR-2026-0001 \"2º Termo Aditivo (Reajuste Financeiro)\" com impacto \"Valor base ajustado de R$ 18.500,00 para R$ 19.277,00 (+4,20%)\" e selo Ajuste manual quando for o caso; o contrato muda de valor, sobe uma versão minor e ganha evento no histórico; \"Último Reajuste\" passa a 30/07/2026.",
        "Contrato fora da janela ou não Vigente não oferece o reajuste: o drawer, se aberto nele, mostra \"Reajuste indisponível\" com o motivo.",
      ],
    }),
    c({
      id: "contratos.vigencia-indice-nao-reconhecido",
      title: "Índice não reconhecido",
      route: ROTAS.vigencia,
      controls: { aba: "reajustes", contrato: "CTR-2025-0040", papel: "financeiro" },
      intent: "Ver como a tela trata um contrato com índice fora da tabela (INPC).",
      expected: [
        "Só CTR-2025-0040: índice \"INPC · 3,80%\" em amarelo, com aviso \"Índice não reconhecido\" acima da tabela (taxa padrão 3,80%).",
        "Janela \"Aguardando Data-Base\" (01/12/2026): sem botão Aplicar reajuste.",
      ],
    }),
    c({
      id: "contratos.vigencia-aditivos",
      title: "Livro de aditivos",
      route: ROTAS.vigencia,
      controls: { aba: "aditivos", papel: "juridico" },
      intent: "O Jurídico consulta os aditivos da carteira e filtra por tipo.",
      expected: [
        "Livro com todos os aditivos, mais recente primeiro: código TA-NN/{contrato} e rótulo (\"1º Termo Aditivo\", \"1º Termo Aditivo (Reajuste Financeiro)\"), contrato, tipo, celebração, nova vigência / novo valor, impacto, aprovação e assinatura (Aprovado / Assinado).",
        "Novo valor mascarado; aprovação e assinatura com as cores do módulo.",
        "Busca e select Tipo (tipos da tabela de apoio \"Tipo de aditivo\") viram etiquetas removíveis; Exportar planilha.",
        "Botão Novo aditivo para o Jurídico e o operador; some para Financeiro e Diretoria.",
      ],
    }),
    c({
      id: "contratos.aditivo-novo",
      title: "Novo aditivo",
      route: ROTAS.vigencia,
      controls: { aba: "aditivos", modal: "aditivo", papel: "juridico" },
      intent: "Registrar um termo aditivo escolhendo o contrato entre os Vigentes.",
      expected: [
        "Drawer \"Novo Termo Aditivo\" (o mesmo formulário da ficha) com Contrato (só os 7 Vigentes), tipo, data de celebração, nova vigência, novo valor, motivo, impacto e anexo opcional.",
        "Salvar sem os obrigatórios mostra o erro em cada campo.",
        "Salvar fecha o drawer, põe o aditivo no topo do livro com o próximo TA-NN/{contrato}, Aprovado e Assinado, e mostra o toast; o contrato recebe a nova vigência e o novo valor (quando informados), sobe uma versão minor e registra \"Aditamento: Vigente → Vigente Repactuado\".",
        "Vindo da ficha (controle Contrato), o contrato já vem fixo no formulário.",
      ],
    }),
  ],
};
