import type { Feature } from "../../../app/features.js";
import { ContratosCarteira, ContratosEsteiraAntiga, ROTA_ESTEIRA_ANTIGA } from "../../ContratosCarteira.js";
import { FASES, MODALIDADE, STATUS } from "../model.js";
import { ROTAS, papelControl } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = ["core.table", "core.input", "core.empty-state-card"];
const c = cenario(COMPONENTS);

export const carteira: Feature = {
  routes: [
    {
      path: ROTAS.carteira,
      screen: ContratosCarteira,
      name: "Carteira & Esteira",
      group: FLOW,
      description: "A esteira das sete fases e a lista de contratos, por código, com filtros que se somam, etiquetas removíveis e exportação.",
      components: COMPONENTS,
      controls: [
        {
          id: "filtros",
          title: "Filtros de abertura",
          note: "Os mesmos filtros que a Torre de Controle aplica ao levar para a carteira (FR-018).",
          controls: [
            { id: "monitoramento", label: "Monitoramento", options: [{ value: "nenhum", label: "Todos" }, { value: "critico", label: "Crítico ≤30d" }, { value: "alerta", label: "Alerta 31–90d" }, { value: "despesa", label: "Despesa" }, { value: "receita", label: "Receita" }] },
            { id: "status", label: "Status", options: [{ value: "todos", label: "Todos" }, ...Object.entries(STATUS).map(([value, st]) => ({ value, label: st.label }))] },
            { id: "assinatura", label: "Assinatura", options: [{ value: "todas", label: "Todas" }, { value: "assinado", label: "Assinados (KPI Assinados Digital)" }] },
            { id: "modalidade", label: "Modalidade", options: [{ value: "todas", label: "Todas" }, ...Object.entries(MODALIDADE).map(([value, m]) => ({ value, label: m.label }))] },
            { id: "fase", label: "Fase", options: [{ value: "todas", label: "Todas" }, ...FASES.map((f) => ({ value: f.id, label: `${f.n}. ${f.label}` }))] },
            { id: "busca", label: "Busca", options: [{ value: "vazia", label: "Vazia" }, { value: "integrar", label: "\"integrar\"" }] },
          ],
        },
        papelControl("solicitante"),
      ],
      expected: [
        "Esteira com um cartão por fase e a contagem (RN-024); clicar filtra, clicar de novo desfaz (FR-016).",
        "Lista ordenada por código (FR-015): código e versão (selo Liminar), modalidade e categoria, fase, parte e objeto, aprovação, assinatura, término e dias (selo com as faixas da RN-014), dossiê (100% OK ou pendente). Ações: abrir a ficha e exportar o PDF.",
        "Filtros que se somam (FR-017): monitoramento (crítico ≤30d, alerta 31–90d, despesa, receita; encerrados nunca entram em crítico ou alerta, RN-070), status, modalidade, fase e busca; cada filtro ativo vira etiqueta removível, com \"Limpar Todos\" e \"N listado(s)\".",
        "Exportar planilha (FR-103): separador \";\", arquivo carteira-de-contratos_AAAA-MM-DD, só as linhas listadas, sem a coluna de ações.",
      ],
    },
    {
      path: ROTA_ESTEIRA_ANTIGA,
      screen: ContratosEsteiraAntiga,
      name: "Esteira (endereço antigo)",
      group: FLOW,
      description: "O endereço antigo da esteira do ciclo de vida leva à Carteira & Esteira (FR-019).",
      expected: ["Abrir o endereço antigo leva à Carteira & Esteira, com os mesmos filtros recebidos."],
    },
  ],
  scenarios: [
    c({
      id: "contratos.carteira",
      title: "Carteira completa",
      route: ROTAS.carteira,
      intent: "Ver a carteira inteira, em todas as fases, e abrir um contrato.",
      expected: [
        "Esteira com as 7 fases e a contagem de cada uma: Elaboração 2, Validação 0, Aprovação 1, Assinatura 2, Execução Vigente 6, Gestão de Aditivos & Reajuste 1, Encerramento 1. Fase sem contrato fica com o número apagado.",
        "As contagens batem com o pipeline da Torre de Controle.",
        "Lista com 13 contratos, por código: de CTR-2025-0018 a CTR-2026-0010. Selo Liminar no CTR-2026-0010; Aguardando Aprovação Prévia em cinza com cadeado na assinatura; Vencido no CTR-2025-0018; o CTR-2026-0006, ainda em elaboração, já mostra a faixa Regular; o CTR-2025-0031 mostra Encerrado.",
        "Contador \"13 listado(s)\", sem etiquetas.",
        "Clicar na linha ou no ícone abre a ficha; o ícone de PDF abre a pré-visualização do contrato em A4 (Baixar PDF) em qualquer fase.",
        "Exportar planilha exporta as 13 linhas, sem a coluna de ações.",
      ],
    }),
    c({
      id: "contratos.carteira-filtrada",
      title: "Carteira filtrada",
      route: ROTAS.carteira,
      controls: { monitoramento: "critico", fase: "vigente" },
      intent: "Chegar pela Torre (Críticos ≤30d) e somar a fase Execução Vigente na esteira.",
      expected: [
        "Select Monitoramento em Crítico ≤30d; cartão Execução Vigente destacado na esteira.",
        "Etiquetas \"Crítico ≤30d\" e \"Fase: 5. Execução Vigente\", cada uma com o x para remover, \"Limpar Todos\" e \"3 listado(s)\".",
        "Lista com CTR-2025-0018 (Vencido), CTR-2026-0001 (18 dias) e CTR-2026-0005 (CLT, 30 dias). O CTR-2025-0031, vencido mas encerrado, não entra (RN-070).",
        "Remover a etiqueta da fase (ou clicar de novo no cartão) mantém só o monitoramento; Limpar Todos volta aos 13.",
        "Filtros que não deixam nenhum contrato mostram \"Nenhum contrato com esses filtros\" com Limpar Todos.",
      ],
    }),
    c({
      id: "contratos.carteira-ativos",
      title: "Carteira: contratos ativos",
      route: ROTAS.carteira,
      controls: { status: "vigente" },
      intent: "Chegar pelo KPI Contratos Ativos da Torre.",
      expected: [
        "Select Status em Vigente e a etiqueta \"Status: Vigente\"; \"7 listado(s)\", o mesmo número do KPI.",
      ],
    }),
    c({
      id: "contratos.carteira-assinados",
      title: "Carteira: assinados",
      route: ROTAS.carteira,
      controls: { assinatura: "assinado" },
      intent: "Chegar pelo KPI Assinados Digital da Torre.",
      expected: [
        "Etiqueta removível \"Assinado Digitalmente\" e \"8 listado(s)\": os 8 contratos com a assinatura concluída, inclusive o encerrado CTR-2025-0031 (a taxa é sobre o total cadastrado, RN-021).",
      ],
    }),
    c({
      id: "contratos.carteira-vazia",
      title: "Carteira vazia",
      route: ROTAS.carteira,
      fixture: "contratos.vazio",
      intent: "Implantação nova: ainda não há contratos.",
      expected: [
        "Estado vazio \"Nenhum contrato na carteira\", explicando que o contrato aparece já na Elaboração.",
        "Botão Novo Contrato no vazio e no cabeçalho (some para a Diretoria, que só lê).",
      ],
    }),
  ],
};
