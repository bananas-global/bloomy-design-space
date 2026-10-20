import type { Feature } from "../../../app/features.js";
import { ContratosCarteira } from "../../ContratosCarteira.js";
import { FASES, MODALIDADE } from "../model.js";
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
      description: "A esteira das sete fases e a lista de contratos com filtros que se somam.",
      components: COMPONENTS,
      controls: [
        {
          id: "filtros",
          title: "Filtros de abertura",
          note: "Os mesmos filtros que a Torre de Controle aplica ao levar para a carteira.",
          controls: [
            { id: "monitoramento", label: "Monitoramento", options: [{ value: "nenhum", label: "Nenhum" }, { value: "vigentes", label: "Vigentes" }, { value: "critico", label: "Crítico ≤30d" }, { value: "alerta", label: "Alerta 31–90d" }, { value: "receita", label: "Receita" }, { value: "despesa", label: "Despesa" }, { value: "critico,despesa", label: "Crítico + Despesa" }] },
            { id: "modalidade", label: "Modalidade", options: [{ value: "todas", label: "Todas" }, ...Object.entries(MODALIDADE).map(([value, m]) => ({ value, label: m.label }))] },
            { id: "fase", label: "Fase", options: [{ value: "todas", label: "Todas" }, ...FASES.map((f) => ({ value: f.id, label: `${f.n}. ${f.label}` }))] },
            { id: "busca", label: "Busca", options: [{ value: "vazia", label: "Vazia" }, { value: "integrar", label: "\"integrar\"" }] },
          ],
        },
        papelControl("solicitante"),
      ],
      expected: [
        "Esteira com um cartão por fase e a contagem; clicar filtra, clicar de novo desfaz.",
        "Lista com código e versão, modalidade e categoria, fase, parte e objeto, aprovação, assinatura, término e dias, dossiê.",
        "Esteira das fases dentro do cartão da lista, no visual do pipeline da Torre; busca e selects de filtro que se somam.",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.carteira",
      title: "Carteira completa",
      route: ROTAS.carteira,
      intent: "Ver a carteira inteira, em todas as fases, e abrir um contrato.",
      expected: [
        "Esteira com as 7 fases e a contagem de cada uma: Elaboração 2, Validação 0, Aprovação 1, Assinatura 2, Execução Vigente 6, Aditivos & Reajuste 1, Encerramento 1. Fase sem contrato fica com o número apagado.",
        "As contagens batem com o pipeline da Torre de Controle.",
        "Lista com 13 contratos, mais recente primeiro: código e versão (selo Liminar no CT-2026-010), modalidade e categoria, fase, parte e objeto, status da aprovação, status da assinatura (Aguardando aprovação em cinza com cadeado), término e dias restantes (Vencido no CT-2025-018), dossiê (100% OK ou N pendentes).",
        "Clicar na linha ou no ícone abre a ficha; o ícone de PDF exporta em qualquer fase.",
        "Exportar planilha exporta as linhas listadas.",
      ],
    }),
    c({
      id: "contratos.carteira-filtrada",
      title: "Carteira filtrada",
      route: ROTAS.carteira,
      controls: { monitoramento: "critico,despesa", fase: "vigente" },
      intent: "Chegar pela Torre (Críticos ≤30d) e somar filtros: só despesas, só Execução Vigente.",
      expected: [
        "Selects de filtro: Situação em Crítico ≤30d e Fluxo em Despesa (além de Modalidade e a busca); cartão Execução Vigente destacado na esteira.",
                "Lista com CT-2026-001 (Clínica Integrar, 18 dias) e CT-2026-005 (CLT, 30 dias).",
        "Exportar planilha exporta só as linhas listadas.",
        "Filtros que não deixam nenhum contrato mostram \"Nenhum contrato com esses filtros\" com Limpar filtros.",
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
