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
        papelControl("diretoria"),
      ],
      expected: [
        "Health Score de 10 a 100 com rótulo e cor (verde Saudável ≥85, âmbar Atenção ≥65, vermelho Risco) e as barras dos três pilares.",
        "\"Entenda o Score\" mostra pilar, % dos Vigentes, peso e pontos, a penalidade e a conta que bate com o score.",
        "Seis indicadores clicáveis, run-rate mensal mascarado e três gráficos; nenhum botão de ação sobre contrato.",
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
        "Health Score 61, Risco, em vermelho. Pilares: Vigência Segura 57% (23/40 pts), Dossiê 57% (20/35 pts), Formalização Digital 86% (21/25 pts); penalidade de −3 por 1 contrato vencido.",
        "Linha explicando que Vigência Segura foi o pilar que mais puxou para baixo: 23 de 40 pontos, com 3 de 7 Vigentes vencidos ou a até 30 dias do fim.",
        "Indicadores: Contratos Ativos 7, Críticos ≤30d 3, Alerta 31–90d 1, Dossiê Completo 57%, Assinados Digital 86%, Docs de Cobrança 7 (2 aguardando conferência).",
        "Clicar em Críticos ≤30d abre a Carteira com Situação em Crítico ≤30d (3 contratos); Alerta 31–90d abre com Alerta (CT-2026-003); Dossiê Completo abre o Dossiê nos pendentes; Docs de Cobrança abre Cobrança & ERP.",
        "Run-rate mensal dos 7 Vigentes: Receitas, Despesas e Saldo mascarados (R$ ••••••••); o olho revela R$ 100.800,00, R$ 57.900,00 e R$ 42.900,00.",
        "Saúde por prazo: Vencido 1, Crítico 2, Atenção 1, Regular 3. Carteira por categoria: PJ Assistencial 4, Particular 3, Operadora 2, CLT 1, Locação 1, Serviços 1, Tecnologia 1.",
        "Pipeline: Elaboração 2, Validação 0, Aprovação 1, Assinatura 2, Execução Vigente 6, Aditivos & Reajuste 1, Encerramento 1 — as mesmas contagens da esteira da Carteira. Clicar numa fase abre a Carteira filtrada por ela.",
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
        "Health Score em azul: \"Sem contratos vigentes para calcular o score\", sem número inventado e sem o botão Entenda o Score.",
        "Os seis indicadores com 0 (ou 0%) e o run-rate com valores zerados, mascarados.",
        "Os três gráficos mostram \"Sem Contratos\".",
      ],
    }),
    c({
      id: "contratos.torre-score-explicado",
      title: "Entenda o Score",
      route: ROTAS.torre,
      controls: { papel: "diretoria", score: "explicado" },
      intent: "Entender de onde vem o 61 e qual pilar atacar primeiro.",
      expected: [
        "Drawer \"Entenda o Score\" com a tabela: Vigência Segura 57% · peso 40 · 23 pts; Dossiê 57% · peso 35 · 20 pts; Formalização Digital 86% · peso 25 · 21 pts.",
        "Linha de penalidade: 1 vencido × 3 = −3.",
        "A conta \"23 + 20 + 21 − 3 = 61\" bate com o score exibido no painel.",
        "Destaque: Vigência Segura foi o pilar que mais puxou para baixo (perdeu 17 dos 40 pontos).",
      ],
    }),
  ],
};
