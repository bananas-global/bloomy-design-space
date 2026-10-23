import type { Feature } from "../../app/features.js";
import { DRAWER_OPTIONS, OPERATOR_DOCS_PATH, OperatorDocuments, TAB_OPTIONS } from "../OperatorDocuments.js";
import { OPERATOR_DOCS_FIXTURES } from "./fixtures.js";

/** Registro da feature Documentos da Operadora: rotas, cenários e fixtures. */
export const feature: Feature = {
  scenarios: [
    {
      id: "operator-docs.professionals",
      title: "Profissionais a revisar",
      route: OPERATOR_DOCS_PATH,
      fixture: "operator-docs.unimed",
      persona: "admin",
      intent:
        "A aba Documentos da Unimed abre em Profissionais: quem está credenciado, a situação de cada um no Bloomy, a formação e os documentos compartilhados. Credenciar e descredenciar são manuais; documento vencido não muda o status.",
      expected: [
        "Cabeçalho da ficha (CardHeader): Unimed, tag ANS: 999901, 3 planos ativos, telefone e e-mail; Observações com o ponto de aviso; menu ⋮ com Voltar para lista e Excluir Operadora.",
        "Abas da ficha: Dados da Operadora, Endereço, Tipos de Planos, Contratos, Documentos (aberta), Financeiro, Auditoria e Usuários.",
        "Título Documentos com \"7 de 10 profissionais credenciados · 1 de 2 unidades credenciadas\" e os button_tabs Profissionais / Unidades.",
        "Totais: 7 credenciados (verde), 3 não credenciados (azul), 0 descredenciados (vermelho).",
        "Aviso laranja: 2 profissionais seguem credenciados na Unimed, mas estão inativos ou em desligamento no Bloomy (Tânia em desligamento em 12/08, Carina inativa). Ver só esses filtra a lista para os dois.",
        "Na coluna Profissional, a situação no Bloomy com o ponto colorido: Ativo (verde), Inativo (vermelho), Desligamento em dd/mm (laranja). Filtro Status na Bloomy.",
        "Formação junta o tempo de formado e a carga de ABA (\"320h ABA · Intermediária\").",
        "Carina e Tânia com Credenciado e \"revisar\"; Carina e Mariana com \"1 vencido\" em Documentos, sem mudar o status.",
        "Ordem: credenciados, depois não credenciados, depois descredenciados; por nome em cada grupo.",
        "Não credenciado: Credenciar, que credencia na hora e abre o drawer Compartilhar com operadora.",
        "Credenciado: Ações › Exportar separados, Exportar consolidado, Compartilhamento e Descredenciar (vermelho).",
        "Descredenciar abre o drawer com o motivo e Descompartilhar N documentos (marcado); ao confirmar, a linha vai para o fim como Descredenciado, com 0 documentos, e o aviso e os totais se atualizam. Descredenciado: Ações › Credenciar novamente.",
      ],
    },
    {
      id: "operator-docs.first",
      title: "Nenhum profissional credenciado",
      route: OPERATOR_DOCS_PATH,
      fixture: "operator-docs.first",
      persona: "admin",
      intent: "O começo do credenciamento na Unimed: ninguém credenciado e nada compartilhado.",
      expected: [
        "Título com \"0 de 10 profissionais credenciados\"; totais: 0 credenciados, 10 não credenciados, 0 descredenciados.",
        "Sem o aviso de revisão.",
        "Todos com Credenciar; credenciar um abre o drawer Compartilhar com operadora, com todos os documentos desligados.",
      ],
    },
    {
      id: "operator-docs.reviewed",
      title: "Revisão concluída",
      route: OPERATOR_DOCS_PATH,
      fixture: "operator-docs.reviewed",
      persona: "admin",
      intent: "Depois da revisão: quem estava inativo ou em desligamento no Bloomy já foi descredenciado da Unimed.",
      expected: [
        "Totais: 5 credenciados, 3 não credenciados, 2 descredenciados; sem o aviso de revisão.",
        "Carina e Tânia no fim da lista, Descredenciado, com 0 documentos.",
        "No menu Ações dos descredenciados, Credenciar novamente no lugar de Descredenciar.",
      ],
    },
    {
      id: "operator-docs.units",
      title: "Unidade sem documentos compartilhados",
      route: OPERATOR_DOCS_PATH,
      controls: { aba: "unidades" },
      fixture: "operator-docs.unimed",
      persona: "admin",
      intent: "Os documentos obrigatórios de cada unidade compartilhados com a operadora.",
      expected: [
        "A aba Documentos abre em Unidades (a tela põe a aba na URL, no tracker documents_tab).",
        "Totais: 1 não compartilhado (cinza), 0 em credenciamento, 1 credenciada.",
        "Unidade Teste: 12 documentos compartilhados, sem pendências, Credenciada. Santana: 0, falta 12, Não compartilhado.",
        "Ações › Gerenciar documentos abre o drawer Documentos da unidade, com os obrigatórios marcados como Padrão e a validade de cada um.",
        "Compartilhar o primeiro documento de Santana a passa para Em credenciamento.",
      ],
    },
    {
      id: "operator-docs.share-drawer",
      title: "Drawer: compartilhar documentos",
      route: OPERATOR_DOCS_PATH,
      fixture: "operator-docs.unimed",
      persona: "admin",
      controls: { drawer: "compartilhar" },
      intent: "Os documentos de um profissional credenciado e o que já vai para a Unimed.",
      expected: [
        "Abre o drawer Compartilhar com operadora da Mariana Palmeira Stein.",
        "Cada documento é um cartão com chave: ligado (azul) é compartilhado; a tag mostra a validade (Registro no conselho Vencido, em vermelho).",
        "Clicar no cartão ou na chave liga ou desliga o compartilhamento, com toast; os totais da tabela acompanham.",
      ],
    },
    {
      id: "operator-docs.first-share-drawer",
      title: "Drawer: primeiro compartilhamento",
      route: OPERATOR_DOCS_PATH,
      fixture: "operator-docs.first",
      persona: "admin",
      controls: { drawer: "compartilhar" },
      intent: "O drawer logo depois de Credenciar: nada compartilhado ainda.",
      expected: ["Abre o drawer Compartilhar com operadora da Mariana com todas as chaves desligadas."],
    },
    {
      id: "operator-docs.unlink-drawer",
      title: "Drawer: descredenciar profissional inativo",
      route: OPERATOR_DOCS_PATH,
      fixture: "operator-docs.unimed",
      persona: "admin",
      controls: { drawer: "descredenciar" },
      intent: "Tirar da Unimed quem está inativo no Bloomy, com o motivo e os documentos.",
      expected: [
        "Abre o drawer Descredenciar da Unimed da Carina Ferreira de Araújo, com Bloomy: Inativo.",
        "Motivo já em \"Desligado ou em desligamento da Bloomy\"; Descompartilhar 3 documentos ligado, com os nomes.",
        "Descredenciar fecha o drawer, mostra o toast e leva a Carina para o fim da lista, Descredenciado, com 0 documentos.",
      ],
    },
    {
      id: "operator-docs.unit-drawer",
      title: "Drawer: documentos da unidade",
      route: OPERATOR_DOCS_PATH,
      fixture: "operator-docs.unimed",
      persona: "admin",
      controls: { drawer: "unidade" },
      intent: "Os documentos de uma unidade e o que vai para a operadora.",
      expected: [
        "Abre a aba Unidades e o drawer Documentos da unidade de Santana, com os documentos desligados.",
        "Os obrigatórios aparecem com o selo Padrão; compartilhar o primeiro passa Santana para Em credenciamento.",
      ],
    },
    {
      id: "operator-docs.read-only-drawer",
      title: "Drawer: somente leitura (proposta)",
      route: OPERATOR_DOCS_PATH,
      fixture: "operator-docs.unimed",
      persona: "clinic_admin",
      controls: { drawer: "compartilhar" },
      intent: "Quem vê a ficha sem editar abre os documentos do profissional só para consulta.",
      expected: ["Abre o drawer Compartilhar com operadora da Mariana com as chaves desativadas; clicar no cartão não muda nada."],
    },
    {
      id: "operator-docs.read-only",
      title: "Somente leitura (proposta)",
      route: OPERATOR_DOCS_PATH,
      fixture: "operator-docs.unimed",
      persona: "clinic_admin",
      intent:
        "Proposta: um papel que vê a ficha da operadora sem editar. No monólito atual, HealthCarePolicy dá ver e editar só a admin e operation; Admin de Clínica não abre a ficha (a matriz daqui já reflete isso: ele não tem health_cares.list/show e o menu não mostra Operadoras). O cenário usa o Admin de Clínica só como exemplo de quem vê sem editar; a tela não bloqueia pelo show.",
      expected: [
        "No menu ⋮ do cabeçalho, só Voltar para lista (sem Excluir Operadora); sem as abas Auditoria e Usuários.",
        "Sem Credenciar nos não credenciados e sem Descredenciar no menu Ações.",
        "Nos drawers, os documentos aparecem com o compartilhamento desabilitado; em Unidades a ação vira Ver documentos.",
      ],
    },
  ],
  fixtures: [...OPERATOR_DOCS_FIXTURES],
  routes: [
    {
      path: OPERATOR_DOCS_PATH,
      screen: OperatorDocuments,
      name: "Documentos da Operadora",
      controls: [
        {
          id: "documentos",
          title: "Estado de abertura",
          note: "O drawer de unidade abre na aba Unidades. Descredenciar só abre para quem pode editar.",
          controls: [
            { id: "aba", label: "Aba", default: "profissionais", options: TAB_OPTIONS },
            { id: "drawer", label: "Drawer", default: "nenhum", options: DRAWER_OPTIONS },
          ],
        },
      ],
      description:
        "Nova aba Documentos na ficha da operadora: o credenciamento dos profissionais pelos documentos compartilhados e os documentos obrigatórios das unidades.",
    },
  ],
};
