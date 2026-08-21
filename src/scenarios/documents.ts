import type { Scenario } from "@brucesantos/design-space";

/**
 * Documentos — três frentes da mesma tarefa.
 *
 * Cada uma é um fluxo, e não uma tela: o profissional começa na lista e abre a
 * pasta de quem for clicado. As variações — vencido, a vencer, sem arquivo,
 * descredenciado, vazio — ficam no seletor de dados do rodapé.
 */
export const documentScenarios: Scenario[] = [
  {
    id: "documents.professional",
    title: "Profissional",
    intent:
      "Da lista da equipe à pasta de uma pessoa: o que existe, o que falta, o que está prestes a vencer e o que a operadora já enxerga.",
    route: "/team/documentation",
    persona: "people",
    fixture: "docs-team-matrix",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A lista alterna entre Cadastro, Documentação e Controle de horas sem trocar de página.",
      "A aba Documentação abre em Visão geral e troca de categoria por filtro — Profissional, Interno, Ocupacional, Operadoras.",
      "Nas categorias, a coluna do nome fica fixa na rolagem horizontal.",
      "Quem está em inativação aparece destacado, com a data de saída e os dias restantes.",
      "O controle de horas só apura quando a pessoa processa; escolher a especialidade seleciona todos os profissionais dela.",
      "Clicar em qualquer lugar da linha abre a pasta do profissional.",
      "Na pasta, os sete tipos padrão aparecem — os sem arquivo, como lacuna, com fundo e a dica do tipo em itálico.",
      "A pasta filtra por nome, tipo, status, operadora e padrão, e as opções saem do que a pasta tem.",
      "Abrir um documento já compartilhado traz as operadoras marcadas no formulário.",
    ],
    tags: ["lista", "regra", "permissão"],
  },
  {
    id: "documents.insurer",
    title: "Operadora",
    intent:
      "Da lista de convênios à ficha de um deles: a clínica vista pelo outro lado — quem está credenciado, o que falta e quais unidades ele aceita.",
    route: "/insurers/documents",
    persona: "admin",
    fixture: "docs-insurer-list",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A lista alterna entre Cadastro e Documentação sem trocar de página.",
      "Cadastro traz nome, registro ANS, endereço e cidade, e filtra pelos três campos do sistema.",
      "Documentação mostra quantos documentos cada convênio exige e quanto da clínica ele já aceita.",
      "Clicar em qualquer lugar da linha abre a ficha da operadora.",
      "A ficha abre no cartão do cadastro, com as abas do sistema e Documentos ativa.",
      "A tabela traz carga em ABA, formações especiais e credenciamento por profissional.",
      "O escopo alterna entre Profissionais e Unidades sem sair da aba.",
      "Quem não tem vínculo aparece como não credenciado, com a ação de habilitar.",
    ],
    tags: ["lista", "exceção"],
  },
  {
    id: "documents.unit",
    title: "Unidade",
    intent:
      "Da lista de unidades à pasta de uma delas: os doze documentos que a vigilância cobra, incluindo os que ainda não existem.",
    route: "/structure/documents",
    /**
     * Admin, e não Operação.
     *
     * `UnitPolicy.can?(role, :edit)` do monólito responde `true` só para `admin`,
     * e `:list` só para `admin` e `"admin_clinic"` — string que não existe na
     * lista de papéis, divergência registrada na decisão 0002. Operação não edita
     * unidade e no sistema não chega nem a listar.
     *
     * Com ela, a situação se contradizia: a expectativa diz que o documento nunca
     * anexado aparece "com a ação de anexar", e todo Anexar e Editar da pasta
     * chegava desabilitado — a tela estava certa e a situação estava com a persona
     * errada. É a mesma persona da pasta da operadora, pelo mesmo motivo.
     */
    persona: "admin",
    fixture: "docs-unit-list",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A lista alterna entre Cadastro e Documentação sem trocar de página.",
      "Cadastro traz nome, CNPJ, CNES, endereço, cidade e se está ativa.",
      "Documentação resume por categoria — Licenças, Certificados, Contratos — e abre coluna por documento quando a categoria é escolhida.",
      "Clicar em qualquer lugar da linha abre a pasta de documentos da unidade.",
      "A pasta abre no cabeçalho da unidade, com as abas do cadastro e Documentos ativa.",
      "A pasta alterna entre Cards e Tabela, e filtra por nome, tipo, status, operadora e padrão.",
      "A licença que ainda não entrou em vigência aparece como Aguardando vigência.",
      "O documento que nunca foi anexado aparece como lacuna, com a ação de anexar.",
    ],
    tags: ["lista", "regra", "exceção"],
  },
];
