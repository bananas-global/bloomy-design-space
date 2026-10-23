import type { Feature } from "../../app/features.js";
import { UNITS_PATH, Units } from "../Units.js";
import { UNITS_FIXTURES } from "./fixtures.js";

export const feature: Feature = {
  scenarios: [
    {
      id: "units.list",
      title: "Unidades › Cadastro",
      route: UNITS_PATH,
      fixture: "units.list",
      persona: "admin",
      intent: "A lista de unidades abre em Cadastro, com as duas visões no button_tabs, como a lista de Profissionais.",
      expected: [
        "Título Unidades e, à direita, Nova unidade; embaixo, o button_tabs Cadastro / Documentação, em Cadastro.",
        "Filtros Nome, CNPJ, CNES e Cidade, como no index.ex; CNPJ e CNES buscam com ou sem a máscara.",
        "Colunas Nome, CNPJ, CNES, Endereço, Cidade e Ativa?; embaixo, \"Mostrando 1 até 5 de 5 registros\" e a paginação.",
        "O nome tem o ponto de status e, embaixo, CNES e cidade. Santo André, inativa, por último, com ponto vermelho, \"Inativa\" e a tag Não.",
        "Clicar numa linha mostra o toast \"Abre a ficha da unidade\", com a rota /backoffice/unidades/:id/editar.",
      ],
    },
    {
      id: "units.docs",
      title: "Unidades › Documentação",
      route: UNITS_PATH,
      fixture: "units.docs",
      persona: "admin",
      intent: "A documentação das unidades: completude dos essenciais e o resumo por grupo, com o mesmo comportamento da Documentação de Profissionais.",
      expected: [
        "Filtros Nome/CNES, Cidade, Status (abre em Ativa), Situação da documentação e Categoria (Visão geral, Essenciais, Renovação periódica).",
        "Visão geral: Completude dos essenciais com a barra (Unidade Teste e Moema 100%, Santana e Campinas 60%) e, por grupo, quantos documentos em cada estado, ou \"em dia\".",
        "Estados: Válido, A vencer (até 60 dias), Vencido, Pendente e Aguardando vigência; Santana tem o PGRSS novo aguardando vigência (01/09/2026).",
        "Clicar num resumo, no cabeçalho do grupo ou escolher a Categoria abre o grupo: uma coluna por documento (* essencial). Em Moema, Alvará / CLI aparece válido com o rótulo CLI.",
        "Clicar num documento abre o drawer com o estado, arquivo, vigência, validade, responsável e renovação, e Anexar documento / Substituir arquivo. Anexar atualiza a célula e a completude.",
        "Status Todos traz Santo André, inativa, com Alvará e CRP vencidos.",
      ],
    },
  ],
  fixtures: [...UNITS_FIXTURES],
  routes: [
    {
      path: UNITS_PATH,
      screen: Units,
      name: "Unidades",
      description:
        "A lista de unidades com duas visões: Cadastro (o index.ex) e Documentação (nova: a matriz dos documentos padrão de cada unidade, como a de Profissionais).",
    },
  ],
};
