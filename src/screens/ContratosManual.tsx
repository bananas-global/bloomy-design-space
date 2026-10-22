/**
 * Gestão de Contratos — Manual do Usuário (FR-100) e Direitos & Licença (FR-102).
 *
 * Os 13 módulos do produto, cada um com o que faz, quem usa, os procedimentos
 * (POPs) passo a passo, o fluxograma e as travas de governança. Busca a partir
 * de 2 letras com sugestões e o termo destacado, "Limpar busca", expandir ou
 * recolher todos e filtro pela fase do ciclo de vida (as 7 fases da esteira).
 * O botão "Direitos & Licença" abre a certidão de titularidade do software,
 * com copiar texto e imprimir.
 *
 * Feito na tela (componente novo, sem equivalente no Phoenix): o acordeão dos
 * módulos, a lista de sugestões da busca, o destaque do termo encontrado
 * (`mark`) e o fluxograma em passos ligados por setas. O resto é `input`,
 * `button`, `copy_button`, `tag`, `card`, `modal` e `empty_state_card`.
 */
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "../components/Button.js";
import { CopyButton } from "../components/Action.js";
import { Icon } from "../components/Icon.js";
import { Input } from "../components/Input.js";
import { EmptyStateCard } from "../components/Layout.js";
import { Modal } from "../components/Overlay.js";
import { Tag } from "../components/Tag.js";
import { FASES, type Fase } from "./gestao-de-contratos/model.js";
import { Aviso, Bloco, ContratosShell, Etiquetas, Filtro, ROTAS } from "./gestao-de-contratos/ui.js";

/* ------------------------------------------------------------------ */
/* Conteúdo                                                            */
/* ------------------------------------------------------------------ */

type Pop = { titulo: string; passos: string[] };
type Modulo = {
  id: string;
  titulo: string;
  icone: string;
  /** Fases do ciclo de vida em que o módulo atua (filtro por fase). */
  fases: Fase[];
  quem: string;
  resumo: string;
  pops: Pop[];
  /** Fluxograma: passos em sequência; `desvios` são os caminhos alternativos. */
  fluxo: string[];
  desvios?: string[];
  travas?: string[];
  /** Tela do módulo, para o atalho "Abrir a tela". */
  rota?: string;
};

const TODAS: Fase[] = FASES.map((f) => f.id);

export const MODULOS: Modulo[] = [
  {
    id: "torre",
    titulo: "Torre de Controle",
    icone: "fa-tower-observation",
    fases: TODAS,
    quem: "Diretoria / Gestor Master",
    resumo: "Painel executivo somente leitura: Health Score, seis indicadores, run-rate mensal e gráficos da carteira. Nenhuma ação acontece aqui; cada indicador leva à lista já filtrada.",
    pops: [
      {
        titulo: "Ler a saúde da carteira",
        passos: [
          "Abra a Torre de Controle. O Health Score vai de 10 a 100: verde Saudável (85 ou mais), âmbar Atenção (65 a 84), vermelho Risco (abaixo de 65).",
          "Clique em \"Entenda o Score\" para ver a parcela de cada pilar (Vigência Segura, Dossiê e Formalização Digital) e a penalidade por contrato vencido.",
          "Confira o run-rate: soma mensal dos Vigentes, separada em receitas e despesas. O valor aparece mascarado; o olho revela.",
        ],
      },
      {
        titulo: "Ir do indicador à ação (drill-down)",
        passos: [
          "Clique em \"Críticos ≤30d\" ou \"Alerta 31–90d\": a Carteira abre já filtrada.",
          "Clique em \"Dossiê Completo\" ou \"Docs de Cobrança\": abre a Conformidade na aba correspondente.",
          "Clique numa fase do pipeline: a Carteira abre filtrada por ela. As contagens batem com a esteira.",
        ],
      },
    ],
    fluxo: ["Abrir a Torre", "Ler score e indicadores", "Clicar no indicador", "Lista filtrada no módulo", "Agir no módulo"],
    travas: ["Contratos encerrados ficam fora da base do painel.", "Sem contratos Vigentes, o score não é calculado: o cartão fica azul, sem número."],
    rota: ROTAS.torre,
  },
  {
    id: "carteira",
    titulo: "Carteira & Esteira BPM",
    icone: "fa-folder-open",
    fases: TODAS,
    quem: "Todos os perfis",
    resumo: "Lista de todos os contratos, com a esteira das 7 fases clicável, filtros que se somam e exportação para planilha.",
    pops: [
      {
        titulo: "Encontrar contratos",
        passos: [
          "Clique num cartão da esteira para filtrar pela fase; clique de novo para desfazer.",
          "Combine monitoramento (crítico ≤30d, alerta ≤90d, receita, despesa), modalidade, fase e busca. Os filtros se somam.",
          "Cada filtro ativo vira uma etiqueta removível; \"Limpar Todos\" volta à carteira inteira e o contador \"N listado(s)\" se atualiza.",
        ],
      },
      {
        titulo: "Exportar a lista",
        passos: [
          "Aplique os filtros desejados.",
          "Clique em Exportar planilha: o arquivo \"<nome>_<AAAA-MM-DD>\" sai com separador \";\", acentos corretos e só as linhas listadas, sem a coluna de ações.",
        ],
      },
    ],
    fluxo: ["Abrir a Carteira", "Filtrar pela esteira ou pelos filtros", "Conferir a lista", "Abrir a Ficha ou exportar o PDF"],
    rota: ROTAS.carteira,
  },
  {
    id: "partes",
    titulo: "Cadastro de Partes",
    icone: "fa-address-book",
    fases: ["elaboracao"],
    quem: "Comercial / Faturamento (clientes); Compras, Suprimentos e RH-DP (fornecedores)",
    resumo: "Clientes de receita (CLI-0000) e fornecedores de despesa (FOR-0000), PJ ou PF. É o primeiro passo do ciclo: só parte cadastrada e habilitada entra num contrato.",
    pops: [
      {
        titulo: "Cadastrar um cliente",
        passos: [
          "Em Partes, clique em Novo Cliente e escolha o subtipo: Particular PJ, Operadora ANS, Empresa Corporativa, Particular PF ou Liminar Judicial.",
          "Preencha os campos do subtipo (registro ANS e dia de corte para operadora; CPF e responsável legal para PF; processo e vara para liminar).",
          "Deixe o código automático ou marque \"Código legado (Migração)\" e digite o código. Salve.",
        ],
      },
      {
        titulo: "Cadastrar um fornecedor",
        passos: [
          "Clique em Novo Fornecedor e escolha a categoria (PJ Assistencial, PJ Corporativo, Locador, CLT, Autônomo/RPA ou Consultor PF).",
          "Preencha os dados fiscais (PJ) ou trabalhistas (CLT: cargo, CBO, admissão, salário) e os dados bancários.",
          "Salve. CNPJ ou CPF já cadastrado atualiza o cadastro existente em vez de duplicar.",
        ],
      },
    ],
    fluxo: ["Escolher Cliente ou Fornecedor", "Escolher subtipo ou categoria", "Preencher dados e pagamento", "Salvar (código CLI/FOR)", "Parte disponível no Novo Contrato"],
    travas: ["Código manual já usado por outra parte é recusado: \"Código já utilizado\".", "Subtipo Liminar Judicial marca a origem liminar automaticamente."],
    rota: ROTAS.partes,
  },
  {
    id: "tabelas",
    titulo: "Tabelas de Apoio & Campos por Categoria",
    icone: "fa-table-list",
    fases: ["elaboracao"],
    quem: "Administrador",
    resumo: "As 10 listas de opções usadas nos formulários (categoria, fluxo, forma e condição de pagamento, índice, tipos de cobrança, aditivo e encerramento, natureza do dossiê e unidade) e os campos extras de cada categoria de contrato.",
    pops: [
      {
        titulo: "Manter uma lista de opções",
        passos: [
          "Em Tabelas de Apoio, filtre pela lista ou use \"Mostrar Todas\".",
          "Adicione uma opção com descrição, código opcional e ordem (padrão 10). Ela nasce ativa.",
          "Para tirar uma opção de uso, desative-a. A exclusão de opção em uso é desaconselhada pelo sistema.",
        ],
      },
      {
        titulo: "Configurar os campos de uma categoria",
        passos: [
          "Abra Campos por Categoria e escolha a categoria.",
          "Adicione campos com rótulo, tipo (texto, número, lista ou data), opções e texto de ajuda.",
          "Salve. O Novo Contrato passa a pedir esses campos para a categoria.",
        ],
      },
    ],
    fluxo: ["Escolher a lista", "Adicionar, ativar ou desativar", "Formulários mostram só opções ativas, na ordem definida"],
    travas: ["Descrição vazia é recusada: \"Descrição obrigatória\".", "Código repetido na mesma lista recebe um sufixo de desempate."],
    rota: ROTAS.tabelas,
  },
  {
    id: "minutas",
    titulo: "Minutas Padrão",
    icone: "fa-file-lines",
    fases: ["elaboracao", "validacao"],
    quem: "Jurídico / Compliance",
    resumo: "Catálogo de modelos versionados, editor visual com 24 tags contratuais em roxo e 8 blocos jurídicos, simulação em folha A4, revisões e clonagem. Cada minuta tem uma única versão Vigente.",
    pops: [
      {
        titulo: "Criar um modelo de minuta",
        passos: [
          "Em Minutas, clique em Nova Minuta. Use o código automático ou um mnemônico manual.",
          "Informe título, categoria e revisor e redija no editor; insira tags pelo dicionário ({{CONTRATADA_NOME_RAZAO}}, {{VALOR_GLOBAL}}…) e blocos como LGPD ou Foro.",
          "Clique em \"Simular com Dados Reais\" para ver a folha A4 com as tags trocadas por valores de exemplo.",
          "Salve. O modelo nasce v1.0 Vigente.",
        ],
      },
      {
        titulo: "Publicar uma nova revisão",
        passos: [
          "No catálogo, clique em Revisar na minuta. O editor abre com o texto vigente.",
          "Escolha minor (+0.1) ou major (+1.0) e informe justificativa e revisor.",
          "Publique. A nova versão fica Vigente e as anteriores passam a Obsoleta / Arquivada.",
          "Confira no Diff Jurídico os contratos impactados.",
        ],
      },
    ],
    fluxo: ["Nova Minuta ou Revisar", "Redigir com tags e blocos", "Simular em A4", "Publicar versão Vigente", "Anteriores arquivadas"],
    travas: ["Conteúdo vazio é recusado; código repetido: \"Código de minuta já existe\".", "Na revisão, os blocos Preâmbulo e Foro não são oferecidos."],
    rota: ROTAS.minutas,
  },
  {
    id: "novo",
    titulo: "Novo Contrato (Elaboração)",
    icone: "fa-file-circle-plus",
    fases: ["elaboracao"],
    quem: "Gestor Solicitante / Gestor da Área",
    resumo: "Elaboração em 5 seções: modalidade, partes, financeiro, vigência e campos da categoria. Na Adesão o contrato nasce da minuta; no Corporativo e no Específico o documento externo vem primeiro (fluxo invertido).",
    pops: [
      {
        titulo: "Elaborar um contrato de Adesão",
        passos: [
          "Clique em Novo Contrato e escolha \"Adesão (Minuta Interna)\".",
          "Selecione a parte: código, nome, fluxo e forma de pagamento são preenchidos pelo cadastro.",
          "Escolha a categoria: a minuta vigente compatível é sugerida. Use \"Pré-visualizar Cláusulas\" para ver o texto que será gravado.",
          "Preencha financeiro, vigência, unidades (ao menos uma) e os campos da categoria.",
          "Clique em \"Salvar & Iniciar Elaboração\".",
        ],
      },
      {
        titulo: "Elaborar um contrato Corporativo ou Específico",
        passos: [
          "Escolha \"Corporativo (Upload Externo)\" ou \"Específico (Aluguel/Bancos)\".",
          "Anexe o documento externo (PDF ou texto), por clique ou arrastando.",
          "Complete os dados (no Específico, IPTU, condomínio e garantia) e salve.",
        ],
      },
    ],
    fluxo: ["Escolher a modalidade", "Selecionar a parte", "Categoria e minuta (ou upload)", "Financeiro, vigência e campos", "Salvar: Em Elaboração, v1.0"],
    desvios: ["Origem judicial = Sim: aparecem nº do processo e vara, e o dossiê ganha um 4º item.", "Faltou uma opção numa lista: use o botão Nova/Novo ao lado do campo, sem sair do formulário."],
    travas: [
      "A gravação é recusada se a data de fim for anterior à de início, o valor for negativo ou o dia de vencimento estiver fora de 1 a 31. Nada é gravado e nenhum código é consumido.",
      "Ao salvar: status Em Elaboração, fase 1, versão v1.0, checklist do dossiê com 3 itens pendentes.",
    ],
    rota: ROTAS.novo,
  },
  {
    id: "workflows",
    titulo: "Workflows de Aprovação & Assinatura",
    icone: "fa-stamp",
    fases: ["validacao", "aprovacao", "assinatura"],
    quem: "Gestor Solicitante, Aprovador (Diretoria / Jurídico) e Operador de Contratos",
    resumo: "Dois workflows em sequência, na Ficha: primeiro a aprovação, depois a assinatura. A tela mostra só a próxima ação válida para o estado.",
    pops: [
      {
        titulo: "Submeter e aprovar",
        passos: [
          "Na Ficha, o solicitante clica em Submeter: o contrato vai a Em Aprovação, fase 3.",
          "O aprovador informa nome e parecer e clica em Aprovar: Aprovado, assinatura liberada (Pronto para Coleta), fase 4 e versão incrementada.",
          "Para reprovar, o aprovador informa nome e motivo: o contrato volta à fase 1 como Reprovado (Em Ajuste) e pode ser ressubmetido.",
        ],
      },
      {
        titulo: "Despachar e concluir a assinatura",
        passos: [
          "Com Pronto para Coleta, o operador escolhe a plataforma (Clicksign, DocuSign, Gov.br ou ICP-Brasil) e informa o envelope: Em Assinatura.",
          "No retorno da plataforma, clica em Concluir Assinatura: Assinado Digitalmente, Vigente, fase 5, versão incrementada.",
        ],
      },
    ],
    fluxo: ["Em Elaboração", "Submeter", "Em Aprovação", "Aprovar (parecer)", "Pronto para Coleta", "Despachar (envelope)", "Em Assinatura", "Concluir", "Vigente"],
    desvios: ["Reprovar (motivo) → Reprovado (Em Ajuste) → Ressubmeter → Em Aprovação."],
    travas: ["Despachar sem aprovação é recusado: \"Bloqueio de Governança: O contrato NÃO pode ser enviado para assinatura sem prévia aprovação!\"", "Ação fora do estado válido é recusada com mensagem e nada muda."],
    rota: ROTAS.carteira,
  },
  {
    id: "ficha",
    titulo: "Ficha do Contrato",
    icone: "fa-file-contract",
    fases: TODAS,
    quem: "Todos os perfis",
    resumo: "O hub do contrato: qualificação, condições financeiras, cláusulas, versões, aditivos, dossiê, Linha do Tempo Forense, auditoria e PDF A4 em qualquer fase.",
    pops: [
      {
        titulo: "Editar cláusulas (Adesão, antes da assinatura)",
        passos: [
          "Na seção Cláusulas, edite título e texto: a cláusula fica marcada como \"Editada\" e a minuta de origem não muda.",
          "Adicione uma cláusula ao final ou exclua uma, após confirmar. A auditoria guarda o texto removido.",
        ],
      },
      {
        titulo: "Registrar uma revisão formal",
        passos: [
          "Clique em Nova Versão, escolha minor (padrão) ou major e veja a prévia do número.",
          "Informe fase, motivo, resumo e revisor. O número é calculado pelo sistema e a versão guarda uma cópia das cláusulas.",
        ],
      },
      {
        titulo: "Exportar o PDF",
        passos: [
          "Clique em PDF: folha A4 com a faixa de fase e status, quadros I a IV, as cláusulas e a página de assinaturas, numerada \"Página X de Y\".",
          "O selo de validade digital só aparece em contrato Assinado Digitalmente. Gerar o PDF não altera o contrato.",
        ],
      },
    ],
    fluxo: ["Abrir a Ficha", "Conferir dados e estado", "Executar a ação válida", "Versão, evento e auditoria registrados"],
    travas: ["Depois da assinatura, as cláusulas ficam travadas: \"Cláusulas de contrato assinado só podem ser alteradas por Termo Aditivo\".", "O valor contratado aparece mascarado (R$ ••••••••)."],
    rota: ROTAS.carteira,
  },
  {
    id: "diff",
    titulo: "Diff Jurídico & Aditivo de Adequação",
    icone: "fa-code-compare",
    fases: ["validacao", "aditivos"],
    quem: "Jurídico / Compliance",
    resumo: "Compara duas versões de uma minuta, linha a linha ou lado a lado em A4, e lista os contratos Vigentes que ainda estão na versão antiga.",
    pops: [
      {
        titulo: "Comparar versões e alinhar a carteira",
        passos: [
          "Em Diff Jurídico, escolha a minuta, a versão base e a nova.",
          "Leia as linhas incluídas (verde) e removidas (vermelho), com as contagens, ou alterne para Lado a Lado.",
          "Na lista de contratos impactados, clique em Gerar Termo Aditivo para cada um.",
          "O aditivo \"Adequação de Minuta Homologada\" é criado, as cláusulas não editadas são atualizadas e o contrato sai da lista.",
        ],
      },
    ],
    fluxo: ["Escolher minuta e versões", "Ler o diff", "Ver contratos impactados", "Gerar aditivo de adequação", "Contrato alinhado à nova versão"],
    travas: ["Sem minuta escolhida, abre a primeira que tenha ao menos 2 versões; com uma só versão, mostra a versão e um aviso."],
    rota: ROTAS.diff,
  },
  {
    id: "vigencia",
    titulo: "Vigência, Reajustes & Termos Aditivos",
    icone: "fa-calendar-clock",
    fases: ["vigente", "aditivos"],
    quem: "Controladoria, Financeiro e Jurídico",
    resumo: "Central com três abas: Radar de vencimentos, Reajustes anuais na data-base e o Livro de termos aditivos. Pode abrir filtrada por um contrato.",
    pops: [
      {
        titulo: "Acompanhar vencimentos (Radar)",
        passos: [
          "Na aba Radar, os contratos aparecem do fim mais próximo ao mais distante, com faixa e dias restantes.",
          "Filtre por Crítico (até 30 dias), Atenção (31 a 90), Regular (mais de 90) ou CLT em experiência.",
        ],
      },
      {
        titulo: "Aplicar o reajuste anual",
        passos: [
          "Na aba Reajustes, filtre \"Janela Aberta (< 60d)\".",
          "Confira a taxa do índice (IPCA 4,20%, IGP-M 4,50%, CCT 5,10%; índice não reconhecido usa 3,80% e aparece sinalizado) e o novo valor.",
          "Clique em Aplicar reajuste. Se mudar o valor calculado, a justificativa é obrigatória e o termo registra \"ajuste manual\".",
          "O sistema gera o termo aditivo de Reajuste Financeiro e atualiza valor e versão do contrato.",
        ],
      },
      {
        titulo: "Registrar um termo aditivo",
        passos: [
          "Pela Ficha (+ Aditivo) ou pela aba Aditivos, abra o formulário (é o mesmo nos dois lugares).",
          "Informe tipo, data de celebração, nova vigência, novo valor, motivo, impacto e, se houver, o anexo.",
          "Salve. O aditivo recebe o código TA-NN/{contrato}, nasce Aprovado e Assinado e atualiza vigência, valor e versão do contrato, sem mudar a fase.",
        ],
      },
    ],
    fluxo: ["Radar ou data-base", "Janela aberta (< 60 dias)", "Conferir taxa e valor", "Aplicar / registrar aditivo", "TA-NN gerado; valor e versão atualizados"],
    travas: ["Só contratos Vigentes recebem reajuste ou aditivo.", "A numeração do aditivo continua do maior número já usado no contrato."],
    rota: ROTAS.vigencia,
  },
  {
    id: "dossie",
    titulo: "Conformidade: Dossiê Documental",
    icone: "fa-folder-check",
    fases: ["elaboracao", "vigente"],
    quem: "Jurídico / Compliance",
    resumo: "Checklist dos documentos de habilitação de cada contrato (3 itens, ou 4 com liminar), criado na elaboração. A situação vira \"100% Conforme\" quando todos os itens estão conformes.",
    pops: [
      {
        titulo: "Protocolar um documento",
        passos: [
          "Em Conformidade › Dossiê, filtre Pendentes para ver o que falta.",
          "Clique em Protocolar e informe contrato, natureza, documento, validade, conformidade, arquivo e observações.",
          "Se já existe item pendente com a mesma natureza e documento, ele é preenchido; documento fora do checklist cria item novo.",
          "O checklist do contrato é recalculado na hora.",
        ],
      },
    ],
    fluxo: ["Contrato criado: checklist pendente", "Protocolar documento", "Item conforme", "Todos conformes: 100% Conforme"],
    travas: ["Arquivo fora dos tipos permitidos ou acima do tamanho máximo é recusado e nada fica gravado.", "Item sem arquivo aparece como \"Pendente de Anexo\"."],
    rota: ROTAS.dossie,
  },
  {
    id: "cobranca",
    titulo: "Cobrança, Smart Intake & ERP",
    icone: "fa-file-invoice-dollar",
    fases: ["vigente"],
    quem: "Financeiro (Contas a Pagar e a Receber) e Controladoria",
    resumo: "Protocolo dos documentos de cobrança (NF, boleto, fatura, RPA, folha), leitura automática de XML ou PDF e envio ao ERP financeiro depois da conferência.",
    pops: [
      {
        titulo: "Liquidar uma NFS-e do mês",
        passos: [
          "Em Conformidade › Cobrança, envie o XML ou o PDF. O Smart Intake lê número, valor, vencimento, competência e CNPJ e sugere o contrato (selo \"Auto-detectado\").",
          "Confira os campos e protocole: o documento entra como \"Pendente Conferência\".",
          "A Controladoria confere com o contrato: \"Aprovado 100% Conforme\" e liberado.",
          "Clique em Sincronizar com o ERP: despesa vira título em Contas a Pagar, receita em Contas a Receber. A tela mostra o nº do título.",
        ],
      },
    ],
    fluxo: ["Enviar XML/PDF", "Leitura e sugestão do contrato", "Protocolar (Pendente Conferência)", "Conferir e liberar", "Sincronizar com o ERP", "Título criado"],
    desvios: ["CNPJ sem cadastro ou leitura com baixa confiança: o sistema avisa e não sugere um contrato qualquer."],
    travas: ["Documento não conferido ou não liberado mostra \"Trava de Governança\" no lugar do envio.", "Reenviar o mesmo documento não duplica o título. Sem credenciais do ERP, o envio falha com mensagem clara."],
    rota: ROTAS.cobranca,
  },
  {
    id: "encerramento",
    titulo: "Encerramento & Distrato",
    icone: "fa-box-archive",
    fases: ["encerramento"],
    quem: "Diretoria / Gestor Master",
    resumo: "Encerra um contrato Vigente com data, tipo, motivo e, se houver, o distrato anexado. Encerrado é estado final.",
    pops: [
      {
        titulo: "Encerrar um contrato",
        passos: [
          "Na Ficha de um contrato Vigente, clique em Encerrar.",
          "Informe a data (padrão hoje), o tipo de encerramento e o motivo; anexe o distrato, se houver.",
          "Confirme: o contrato passa a Encerrado, fase 7. O histórico registra o estado de origem.",
          "A Ficha passa a mostrar o aviso com data, motivo e link do distrato; \"+ Aditivo\" e \"Encerrar\" somem.",
        ],
      },
    ],
    fluxo: ["Vigente", "Encerrar (data, tipo, motivo)", "Anexar distrato", "Encerrado · fase 7"],
    travas: ["Contrato que não está Vigente não pode ser encerrado.", "Contratos encerrados saem da base da Torre de Controle."],
    rota: ROTAS.carteira,
  },
];

/* ------------------------------------------------------------------ */
/* Direitos & Licença (FR-102)                                         */
/* ------------------------------------------------------------------ */

/**
 * Titular e autor ficam em aberto até o Jurídico confirmar: os nomes abaixo são
 * fictícios (protótipo). O texto é resumido; a íntegra é a do termo assinado.
 */
const TITULAR = { razao: "Exemplo Consultoria Empresarial Ltda.", autor: "Autor(a) do software (nome fictício)" };
const SOFTWARE = "Módulo de Gestão de Contratos";

const CLAUSULAS_LICENCA: { titulo: string; texto: string }[] = [
  {
    titulo: "1. Titularidade",
    texto: `O ${SOFTWARE}, incluindo código-fonte, modelagem de dados, fluxos das 7 fases, regras de cálculo e parametrização, pertence a ${TITULAR.razao}, que detém os direitos autorais e patrimoniais.`,
  },
  {
    titulo: "2. Base legal",
    texto: "A proteção segue a Lei nº 9.609/1998 (programa de computador) e a Lei nº 9.279/1996 (propriedade industrial e segredo empresarial).",
  },
  {
    titulo: "3. Licença de uso",
    texto: "A empresa usuária recebe licença de uso interno, não exclusiva e intransferível, limitada às suas próprias rotinas contratuais. Não pode comercializar, sublicenciar, ceder a terceiros nem fazer engenharia reversa.",
  },
  {
    titulo: "4. Direitos reservados ao titular",
    texto: "O titular pode continuar mantendo, evoluindo e licenciando o software a outros clientes, sem direito de preferência ou participação da empresa usuária.",
  },
];

export const TEXTO_LICENCA = [
  "DIREITOS & LICENÇA — CERTIDÃO DE TITULARIDADE",
  "",
  `Software: ${SOFTWARE}`,
  `Titular dos direitos patrimoniais: ${TITULAR.razao}`,
  `Autoria: ${TITULAR.autor}`,
  "",
  ...CLAUSULAS_LICENCA.flatMap((c) => [c.titulo, c.texto, ""]),
].join("\n");

function ModalLicenca({ show, onCancel }: { show: boolean; onCancel: () => void }) {
  const imprimir = () => {
    // Imprime só a certidão; se o navegador bloquear a janela, imprime a página.
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return window.print();
    w.document.title = "Direitos & Licença";
    const pre = w.document.createElement("pre");
    pre.style.cssText = "white-space:pre-wrap;font-family:serif;font-size:13px;line-height:1.6;padding:32px";
    pre.textContent = TEXTO_LICENCA;
    w.document.body.appendChild(pre);
    w.focus();
    w.print();
  };
  return (
    <Modal id="manual-licenca" show={show} title="Direitos & Licença" onCancel={onCancel}>
      <div className="space-y-5 text-brand-purple-dark">
        <div className="rounded-xl border border-brand-purple-dark/10 bg-brand-purple-dark/5 p-4 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Certidão de titularidade</p>
          <p className="text-lg font-bold">{SOFTWARE}</p>
          <p className="text-sm">
            Titular dos direitos patrimoniais: <strong>{TITULAR.razao}</strong>
          </p>
          <p className="text-sm">Autoria: {TITULAR.autor}</p>
        </div>
        <div className="space-y-4">
          {CLAUSULAS_LICENCA.map((c) => (
            <section key={c.titulo}>
              <h3 className="font-bold">{c.titulo}</h3>
              <p className="mt-1 text-sm text-brand-purple-dark/80">{c.texto}</p>
            </section>
          ))}
        </div>
        <Aviso tom="neutro" icone="fa-circle-info">
          Titular e autor são fictícios neste protótipo; o Jurídico confirma os dados do termo.
        </Aviso>
        <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" leftIcon="fa-print" onClick={imprimir}>Imprimir</Button>
          <CopyButton id="manual-licenca-copiar" variant="outline" leftIcon="fa-copy" textToCopy={TEXTO_LICENCA}>Copiar texto</CopyButton>
          <Button onClick={onCancel}>Fechar</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Busca                                                               */
/* ------------------------------------------------------------------ */

const MIN_BUSCA = 2;
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Trechos onde o termo aparece, sem diferenciar acento nem caixa: [início, fim) no texto original. */
function ocorrencias(texto: string, termo: string): [number, number][] {
  const t = norm(termo);
  if (!t) return [];
  let plano = "";
  const mapa: number[] = [];
  for (let i = 0; i < texto.length; i++) {
    for (const ch of norm(texto[i]!)) {
      plano += ch;
      mapa.push(i);
    }
  }
  const out: [number, number][] = [];
  let p = plano.indexOf(t);
  while (p >= 0) {
    out.push([mapa[p]!, mapa[p + t.length - 1]! + 1]);
    p = plano.indexOf(t, p + t.length);
  }
  return out;
}

/** Texto com o termo da busca destacado. */
function Destaque({ texto, termo }: { texto: string; termo: string }) {
  const oc = termo.length >= MIN_BUSCA ? ocorrencias(texto, termo) : [];
  if (!oc.length) return <>{texto}</>;
  const partes: ReactNode[] = [];
  let i = 0;
  oc.forEach(([a, b], k) => {
    if (a > i) partes.push(texto.slice(i, a));
    partes.push(<mark key={k} className="rounded bg-yellow/30 px-0.5 text-brand-purple-dark">{texto.slice(a, b)}</mark>);
    i = b;
  });
  if (i < texto.length) partes.push(texto.slice(i));
  return <>{partes}</>;
}

/** Todos os textos pesquisáveis de um módulo, com o rótulo do tópico (para as sugestões). */
function textos(m: Modulo): { topico: string; texto: string }[] {
  return [
    { topico: "Módulo", texto: m.titulo },
    { topico: "Resumo", texto: m.resumo },
    { topico: "Quem usa", texto: m.quem },
    ...m.pops.flatMap((p) => [{ topico: `POP: ${p.titulo}`, texto: p.titulo }, ...p.passos.map((s) => ({ topico: `POP: ${p.titulo}`, texto: s }))]),
    ...m.fluxo.map((s) => ({ topico: "Fluxograma", texto: s })),
    ...(m.desvios ?? []).map((s) => ({ topico: "Fluxograma", texto: s })),
    ...(m.travas ?? []).map((s) => ({ topico: "Travas de governança", texto: s })),
  ];
}

type Sugestao = { modulo: Modulo; topico: string; texto: string };

/** Recorte do texto em volta da primeira ocorrência, para a lista de sugestões. */
function recorte(texto: string, termo: string) {
  const [a] = ocorrencias(texto, termo)[0] ?? [0];
  if (texto.length <= 90) return texto;
  const ini = Math.max(0, a - 30);
  return `${ini > 0 ? "…" : ""}${texto.slice(ini, ini + 90)}${ini + 90 < texto.length ? "…" : ""}`;
}

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

export function ContratosManual({ context }: ScreenProps) {
  const [licenca, setLicenca] = useState(context.controls.licenca === "aberta");
  return (
    <ContratosShell
      context={context}
      secao="manual"
      titulo="Manual do Usuário"
      subtitulo="Procedimentos (POPs) e fluxogramas dos 13 módulos, do cadastro da parte ao encerramento."
      acoes={<Button variant="outline" leftIcon="fa-certificate" onClick={() => setLicenca(true)}>Direitos & Licença</Button>}
    >
      {() => (
        <>
          <Manual key={JSON.stringify(context.controls)} context={context} />
          <ModalLicenca show={licenca} onCancel={() => setLicenca(false)} />
        </>
      )}
    </ContratosShell>
  );
}

function Manual({ context }: { context: ScenarioContext }) {
  const { controls } = context;
  const [busca, setBusca] = useState(controls.busca && controls.busca !== "vazia" ? controls.busca : "");
  const [fase, setFase] = useState<Fase | null>(FASES.some((f) => f.id === controls.fase) ? (controls.fase as Fase) : null);
  const [sugestoesAbertas, setSugestoesAbertas] = useState(busca.length >= MIN_BUSCA);
  const termo = busca.trim();
  const buscando = termo.length >= MIN_BUSCA;

  /** Módulos visíveis: fase e busca se somam. */
  const visiveis = useMemo(
    () => MODULOS.filter((m) => (!fase || m.fases.includes(fase)) && (!buscando || textos(m).some((t) => norm(t.texto).includes(norm(termo))))),
    [fase, buscando, termo],
  );
  const sugestoes: Sugestao[] = useMemo(
    () => (buscando ? visiveis.flatMap((m) => textos(m).filter((t) => norm(t.texto).includes(norm(termo))).map((t) => ({ modulo: m, ...t }))) : []),
    [visiveis, buscando, termo],
  );

  // Buscando, os módulos encontrados abrem sozinhos; sem busca, começam recolhidos.
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set(buscando ? visiveis.map((m) => m.id) : []));
  const alternar = (id: string) => setAbertos((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const buscar = (valor: string) => {
    setBusca(valor);
    const t = valor.trim();
    setSugestoesAbertas(t.length >= MIN_BUSCA);
    if (t.length >= MIN_BUSCA) setAbertos(new Set(MODULOS.filter((m) => textos(m).some((x) => norm(x.texto).includes(norm(t)))).map((m) => m.id)));
  };
  const limparBusca = () => { setBusca(""); setSugestoesAbertas(false); setAbertos(new Set()); };
  const irPara = (id: string) => {
    setSugestoesAbertas(false);
    setAbertos((s) => new Set(s).add(id));
    // Espera o acordeão abrir para rolar até o módulo.
    setTimeout(() => document.getElementById(`manual-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const todosAbertos = visiveis.length > 0 && visiveis.every((m) => abertos.has(m.id));
  const ocorrenciasTotal = sugestoes.length;

  return (
    <div className="space-y-6">
      <Bloco>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="relative w-full sm:w-96">
              <Input
                type="search"
                id="manual-busca"
                placeholder="Buscar no manual (ex.: aditivo, reajuste, ERP)"
                leftIcon="fa-magnifying-glass"
                value={busca}
                onChange={(e) => buscar(e.target.value)}
                onFocus={() => setSugestoesAbertas(buscando)}
                onKeyDown={(e) => { if (e.key === "Escape") setSugestoesAbertas(false); }}
                inputClass="text-ellipsis"
                aria-expanded={sugestoesAbertas && sugestoes.length > 0}
                aria-controls="manual-sugestoes"
              />
              {sugestoesAbertas && sugestoes.length > 0 && (
                <ul id="manual-sugestoes" role="listbox" aria-label="Sugestões" className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl bg-white p-2 shadow-main thin-scrollbar">
                  {sugestoes.slice(0, 8).map((s, i) => (
                    <li key={i} role="option" aria-selected={false}>
                      <button type="button" onClick={() => irPara(s.modulo.id)} className="flex w-full gap-3 rounded-lg px-3 py-2 text-left hover:bg-brand-blue/10 focus-visible:bg-brand-blue/10 outline-none">
                        <Icon name={s.modulo.icone} className="mt-1 text-brand-blue" />
                        <span className="min-w-0">
                          <span className="block text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">{s.modulo.titulo} · {s.topico}</span>
                          <span className="block text-sm text-brand-purple-dark"><Destaque texto={recorte(s.texto, termo)} termo={termo} /></span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {sugestoes.length > 8 && <li className="px-3 py-2 text-xs text-brand-purple-dark/60">e mais {sugestoes.length - 8} trecho(s) nos módulos abaixo</li>}
                </ul>
              )}
            </div>
            {busca && <Button variant="ghost" leftIcon="fa-xmark" onClick={limparBusca}>Limpar busca</Button>}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" leftIcon={todosAbertos ? "fa-angles-up" : "fa-angles-down"} onClick={() => setAbertos(todosAbertos ? new Set() : new Set(visiveis.map((m) => m.id)))} disabled={visiveis.length === 0}>
                {todosAbertos ? "Recolher todos" : "Expandir todos"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-brand-purple-dark/60" aria-live="polite">
            {termo.length === 1
              ? `Digite pelo menos ${MIN_BUSCA} letras para buscar.`
              : buscando
                ? `${ocorrenciasTotal} trecho(s) com "${termo}" em ${visiveis.length} módulo(s).`
                : "Busque por um termo ou filtre pela fase do ciclo de vida."}
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por fase do ciclo de vida">
            <Filtro ativo={!fase} onClick={() => setFase(null)} contagem={MODULOS.length}>Todas as fases</Filtro>
            {FASES.map((f) => (
              <Filtro key={f.id} ativo={fase === f.id} icone={f.icon} onClick={() => setFase(fase === f.id ? null : f.id)} contagem={MODULOS.filter((m) => m.fases.includes(f.id)).length}>
                {f.n}. {f.label}
              </Filtro>
            ))}
          </div>
          <Etiquetas
            itens={[
              ...(fase ? [{ id: "fase", label: `Fase: ${FASES.find((f) => f.id === fase)!.label}`, onRemove: () => setFase(null) }] : []),
              ...(buscando ? [{ id: "busca", label: `Busca: "${termo}"`, onRemove: limparBusca }] : []),
            ]}
            total={visiveis.length}
            singular="módulo"
            onLimpar={() => { setFase(null); limparBusca(); }}
          />
        </div>
      </Bloco>

      {visiveis.length === 0 ? (
        <Bloco>
          <EmptyStateCard icon="fa-book-open" text={buscando ? `Nada encontrado para "${termo}"` : "Nenhum módulo nesta fase"}>
            <p>Tente outro termo ou outra fase do ciclo de vida.</p>
            <div className="mt-6 flex justify-center">
              <Button variant="outline" leftIcon="fa-xmark" onClick={() => { setFase(null); limparBusca(); }}>Limpar busca e filtro</Button>
            </div>
          </EmptyStateCard>
        </Bloco>
      ) : (
        <div className="space-y-4">
          {visiveis.map((m) => (
            <CartaoModulo key={m.id} modulo={m} numero={MODULOS.indexOf(m) + 1} aberto={abertos.has(m.id)} onAlternar={() => alternar(m.id)} termo={buscando ? termo : ""} context={context} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Módulo (acordeão)                                                   */
/* ------------------------------------------------------------------ */

function CartaoModulo({ modulo: m, numero, aberto, onAlternar, termo, context }: { modulo: Modulo; numero: number; aberto: boolean; onAlternar: () => void; termo: string; context: ScenarioContext }) {
  const D = ({ t }: { t: string }) => <Destaque texto={t} termo={termo} />;
  const corpo = `manual-${m.id}-corpo`;
  return (
    <section id={`manual-${m.id}`} className="scroll-mt-24 rounded-2xl bg-white shadow-main">
      <button type="button" onClick={onAlternar} aria-expanded={aberto} aria-controls={corpo} className="flex w-full items-start gap-4 p-6 text-left">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-brand-blue/20 text-brand-blue-dark">
          <Icon name={m.icone} type="solid" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">Módulo {numero}</span>
          <span className="block text-lg font-bold text-brand-purple-dark"><D t={m.titulo} /></span>
          <span className="mt-1 block text-sm text-brand-purple-dark/70"><D t={m.resumo} /></span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            {m.fases.length === FASES.length ? (
              <Tag item="Todas as fases" variant="dark-purple" />
            ) : (
              m.fases.map((f) => { const x = FASES.find((y) => y.id === f)!; return <Tag key={f} item={`${x.n}. ${x.label}`} variant="dark-blue" leftIcon={x.icon} />; })
            )}
          </span>
        </span>
        <Icon name={aberto ? "fa-chevron-up" : "fa-chevron-down"} className="mt-2 text-brand-purple-dark/40" />
      </button>

      {aberto && (
        <div id={corpo} className="space-y-6 border-t border-neutral-100 p-6">
          <p className="text-sm text-brand-purple-dark/80">
            <strong className="text-brand-purple-dark">Quem usa:</strong> <D t={m.quem} />
          </p>

          <div>
            <h3 className="mb-3 flex items-center gap-2 font-bold text-brand-purple-dark"><Icon name="fa-diagram-next" className="text-brand-blue" />Fluxograma</h3>
            <ol className="flex flex-wrap items-center gap-2">
              {m.fluxo.map((p, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="rounded-lg border border-brand-blue/30 bg-blue-light px-3 py-1.5 text-sm font-semibold text-blue-dark">
                    <span className="mr-1.5 tabular-nums text-blue">{i + 1}</span>
                    <D t={p} />
                  </span>
                  {i < m.fluxo.length - 1 && <Icon name="fa-arrow-right" className="text-brand-purple-dark/30" aria-hidden="true" />}
                </li>
              ))}
            </ol>
            {m.desvios && (
              <ul className="mt-3 space-y-1">
                {m.desvios.map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm text-brand-purple-dark/80">
                    <Icon name="fa-arrow-turn-down-right" className="mt-1 text-yellow-dark" />
                    <span><D t={d} /></span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {m.pops.map((p) => (
              <div key={p.titulo} className="rounded-xl border border-brand-purple-dark/10 p-4">
                <h3 className="font-bold text-brand-purple-dark">
                  <span className="mr-2 text-xs font-bold uppercase tracking-wide text-brand-purple-dark/50">POP</span>
                  <D t={p.titulo} />
                </h3>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-brand-purple-dark/80 marker:font-bold marker:text-brand-blue">
                  {p.passos.map((s, i) => <li key={i}><D t={s} /></li>)}
                </ol>
              </div>
            ))}
          </div>

          {m.travas && (
            <Aviso tom="atencao" titulo="Travas de governança e regras">
              <ul className="list-disc space-y-1 pl-5">
                {m.travas.map((t, i) => <li key={i}><D t={t} /></li>)}
              </ul>
            </Aviso>
          )}

          {m.rota && m.rota !== ROTAS.manual && (
            <div className="flex justify-end">
              <Button variant="ghost" rightIcon="fa-arrow-right" onClick={() => context.navigate(m.rota!, { controls: {} })}>
                Abrir a tela
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
