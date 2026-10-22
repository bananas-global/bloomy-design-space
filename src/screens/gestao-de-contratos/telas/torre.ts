import type { Feature } from "../../../app/features.js";
import { ContratosTorre } from "../../ContratosTorre.js";
import { ROTAS, papelControl } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = ["core.drawer-modal", "core.empty-state-card"];
const c = cenario(COMPONENTS);

export const torre: Feature = {
  routes: [
    {
      path: ROTAS.torre,
      screen: ContratosTorre,
      name: "Torre de Controle",
      group: FLOW,
      description: "Painel executivo, somente leitura: Health Score, indicadores, run-rate e gráficos que levam à carteira filtrada.",
      components: COMPONENTS,
      controls: [
        {
          id: "painel",
          title: "Painel",
          controls: [
            { id: "score", label: "Entenda o Score", default: "fechado", options: [{ value: "fechado", label: "Fechado" }, { value: "explicado", label: "Aberto (explicado)" }] },
          ],
        },
        papelControl("solicitante"),
      ],
      expected: [
        "Painel somente leitura (FR-007): nenhum botão age sobre contrato; toda ação acontece no módulo, por drill-down.",
        "Health Score de 10 a 100 (RN-018) com rótulo, selo e cor: ≥85 Excelente Governança · Audit-Ready • Baixo Risco (verde); 65 a 84 Atenção Preventiva · Janela de Repactuação (âmbar); <65 Risco Operacional · Exige Decisão Imediata (vermelho); base vazia 100 Base Oficial Pronta · 100% Pronta para Operação (azul).",
        "\"Entenda o Score\" mostra a parcela real de cada pilar (contratos, peso, pontos com 1 casa), a penalidade −25 × críticos ÷ N e a conta que bate com o score.",
        "Seis KPIs clicáveis (FR-009), run-rate mensal de receitas e despesas dos Vigentes, três gráficos (FR-012) e os indicadores complementares (FR-014).",
        "Drill-down (FR-013): Ativos → Carteira com status Vigente; Críticos/Alerta/Receita/Despesa → Carteira com o monitoramento; Assinados → Carteira com os assinados; Dossiê Completo → Dossiê; Docs de Cobrança → Cobrança & ERP.",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.torre",
      title: "Torre de Controle",
      route: ROTAS.torre,
      controls: { papel: "diretoria" },
      intent: "A Diretoria abre o painel, vê a saúde da carteira e clica num indicador para ir à lista filtrada.",
      expected: [
        "Health Score 50 em vermelho: Risco Operacional, selo Exige Decisão Imediata. Base: 12 contratos não encerrados.",
        "Pilares: Vigência Segura 67% (26,7/40 pts), Dossiê 42% (12,5/30 pts), Formalização Digital 58% (17,5/30 pts); penalidade de −6,3 por 3 contratos críticos.",
        "Linha explicando que Dossiê foi o pilar que mais puxou para baixo: 12,5 de 30 pontos, com 7 de 12 contratos da base com dossiê pendente.",
        "KPIs: Contratos Ativos 7 \"de 13 cadastrados (53,8%)\"; Críticos ≤30d 3; Alerta 31–90d 1; Dossiê Completo 46,2% (6 de 13); Assinados Digital 61,5% (8 de 13); Docs de Cobrança 5 aprovados · 3 pendentes de conferência.",
        "Contratos Ativos abre a Carteira com Status: Vigente (7); Críticos ≤30d abre com Crítico ≤30d (CTR-2025-0018, CTR-2026-0001, CTR-2026-0005); Alerta abre com Alerta 31–90d (CTR-2026-0003); Assinados Digital abre a Carteira com a etiqueta Assinado Digitalmente (8); Dossiê Completo abre o Dossiê; Docs de Cobrança abre Cobrança & ERP.",
        "Run-rate mensal dos 7 Vigentes, mascarado (R$ ••••••••); o olho revela Receitas R$ 100.800,00, Despesas R$ 57.953,80 e Saldo R$ 42.846,20. Receitas e Despesas levam à Carteira com o monitoramento Receita ou Despesa.",
        "Saúde da carteira por prazos: Seguro (> 90d) 8, Alerta (31–90d) 1, Crítico (≤ 30d) 3, CLT em experiência 1.",
        "Carteira por categoria, com quantidade e valor (mascarado): Operadora Saúde 2, Paciente Particular 3, PJ Assistencial 4, Locação Imobiliária 1, Serviços Terceirizados 1, TI / Software / SaaS 1, CLT Trabalho 1, em ordem de valor.",
        "Pipeline: Elaboração 2, Validação 0, Aprovação 1, Assinatura 2, Execução Vigente 6, Gestão de Aditivos & Reajuste 1, Encerramento 1 — as mesmas contagens da esteira da Carteira. Clicar numa fase abre a Carteira filtrada por ela.",
        "Indicadores complementares: saldo de recesso PJ 50,5 dias, 1 CLT em experiência, taxa de aditivos aprovados 100% (3 de 3) e a lista por contrato com a quantidade de aditivos e o último documento de cobrança (ex.: CTR-2026-0001 · 1 aditivo · DOC-CTR-2026-0001-01 Aprovado).",
      ],
    }),
    c({
      id: "contratos.torre-vazia",
      title: "Torre de Controle vazia",
      route: ROTAS.torre,
      fixture: "contratos.vazio",
      controls: { papel: "diretoria" },
      intent: "Implantação nova: o painel abre sem contratos e convida a começar pela carteira.",
      expected: [
        "Estado vazio \"Ainda não há contratos para acompanhar\" com Ir para a Carteira (Novo Contrato aparece só para quem cria contratos; some para a Diretoria).",
        "Health Score 100 em azul (RN-020): Base Oficial Pronta, selo \"100% Pronta para Operação\"; Entenda o Score explica a base vazia.",
        "KPIs: Contratos Ativos 0 \"de 0 cadastrados (100%)\", Críticos 0, Alerta 0, Dossiê Completo 100%, Assinados Digital 100%, Docs de Cobrança 0 (taxas valem 100% com a base vazia, RN-021). Run-rate zerado, mascarado.",
        "Saúde por prazos com as quatro barras em 0; Carteira por categoria com a linha \"Sem Contratos\" e 0; pipeline com as 7 fases em 0.",
        "Indicadores complementares: recesso 0 dias, 0 CLT em experiência, taxa de aditivos 100% (0 de 0); sem lista por contrato.",
      ],
    }),
    c({
      id: "contratos.torre-score-explicado",
      title: "Entenda o Score",
      route: ROTAS.torre,
      controls: { papel: "diretoria", score: "explicado" },
      intent: "Entender de onde vem o 50 e qual pilar atacar primeiro.",
      expected: [
        "Drawer \"Entenda o Score\" com a fórmula 40 × regulares ÷ N + 30 × dossiês ÷ N + 30 × assinados ÷ N − 25 × críticos ÷ N, N = 12.",
        "Tabela: Vigência Segura 8 de 12 (67%) · peso 40 · 26,7 pts; Dossiê 5 de 12 (42%) · peso 30 · 12,5 pts; Formalização Digital 7 de 12 (58%) · peso 30 · 17,5 pts.",
        "Penalidade (críticos): 3 de 12 · −25 · −6,3.",
        "A conta \"26,7 + 12,5 + 17,5 − 6,3 = 50,4\" e \"50,4 arredondado dá 50\", igual ao score do painel; Risco Operacional: Exige Decisão Imediata.",
        "Destaque: Dossiê foi o pilar que mais puxou para baixo (12,5 de 30 pontos).",
      ],
    }),
    c({
      id: "contratos.torre-vazia-score",
      title: "Entenda o Score (base vazia)",
      route: ROTAS.torre,
      fixture: "contratos.vazio",
      controls: { papel: "diretoria", score: "explicado" },
      intent: "Ver por que o score é 100 antes do primeiro contrato.",
      expected: [
        "Drawer com a fórmula e o aviso: sem contratos na base, o score é 100, \"Base Oficial Pronta\", selo \"100% Pronta para Operação\", em azul.",
        "Sem tabela de parcelas nem penalidade.",
      ],
    }),
  ],
};
