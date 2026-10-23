import type { Feature } from "../../../app/features.js";
import { ContratosCobranca } from "../../ContratosCobranca.js";
import { ROTAS, papelControl } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = ["core.table", "core.input", "core.drawer-modal", "core.file-uploader", "core.button-tabs", "core.tooltip", "core.empty-state-card", "core.toast-wrapper"];
const c = cenario(COMPONENTS);

/** Contratos que têm cobrança na fixture `contratos.base`. */
const CONTRATOS = ["CTR-2026-0001", "CTR-2026-0002", "CTR-2026-0003", "CTR-2026-0004", "CTR-2026-0005", "CTR-2025-0018", "CTR-2025-0040"];

export const cobranca: Feature = {
  routes: [
    {
      path: ROTAS.cobranca,
      screen: ContratosCobranca,
      name: "Conformidade — Cobrança e ERP",
      group: FLOW,
      description: "Aba Cobrança da central de Conformidade: Smart Intake (XML/PDF), protocolo DOC-{contrato}-NN, conferência contra o contrato e envio ao Omie com a Trava de Governança (FR-074 a FR-082).",
      components: COMPONENTS,
      controls: [
        {
          id: "intake",
          title: "Smart Intake · file_uploader",
          note: "O arquivo enviado e o resultado da leitura (simulada no protótipo; o XML enviado de verdade é lido).",
          component: "core.file-uploader",
          controls: [
            {
              id: "intake",
              label: "Leitura",
              options: [
                { value: "nenhum", label: "Nenhum arquivo" },
                { value: "xml", label: "XML NFS-e: CNPJ cadastrado (passo 1)" },
                { value: "razao", label: "XML NFS-e: razão social (passo 2)" },
                { value: "pdf-folha", label: "PDF Folha de Pagamento (passo 3)" },
                { value: "sem-match", label: "XML NF-e sem correspondência (passo 4)" },
                { value: "pdf", label: "PDF Fatura de Locação" },
                { value: "pdf-boleto", label: "PDF Boleto Bancário" },
                { value: "falha", label: "XML inválido" },
                { value: "grande", label: "Arquivo acima de 25 MB" },
              ],
            },
          ],
        },
        {
          id: "erp",
          title: "ERP financeiro",
          note: "Sem credenciais do Omie, o envio roda em SANDBOX / SIMULAÇÃO HOMOLOGADA e gera OMIE-{n} (RN-055).",
          controls: [
            {
              id: "erp",
              label: "Omie",
              options: [
                { value: "sandbox", label: "Sem credenciais (sandbox)" },
                { value: "credenciais", label: "Credenciais configuradas" },
                { value: "falha", label: "API com falha" },
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
            { id: "modal", label: "Modal", options: [{ value: "nenhum", label: "Nenhum" }, { value: "protocolo", label: "Protocolar documento" }] },
          ],
        },
        papelControl("financeiro"),
      ],
      expected: [
        "Smart Intake: XML (NF-e, NFS-e ABRASF) ou PDF classificado na ordem Folha de Pagamento, Boleto Bancário, Fatura de Locação, Recibo / RPA, NF-e, NFS-e; campos lidos (número, valor, vencimento, competência, tipo, CNPJ e razão social do prestador e do tomador) com o texto original normalizado.",
        "Sugestão de contrato nos 4 passos (CNPJ só pelos dígitos em Fornecedores e depois Clientes; razão social; folha → CLT/Pessoal; primeiro Vigente), com selo Auto-detectado e o critério; o passo 4 aparece como baixa confiança.",
        "Protocolo: contrato, fluxo da operação, competência AAAA-MM, parte, tipo, nº, valor, vencimento, observação e arquivo; escolher o contrato preenche parte, valor (se maior que zero) e fluxo. Entra como DOC-{contrato}-NN, Pendente Conferência e não liberado.",
        "Lista com código, contrato, fluxo, parte, competência, documento, vencimento (— sem vencimento), valor (valor não informado), conferência, conformidade, liberação e situação no ERP.",
        "Conferir: Aprovado 100% Conforme, Liberado e registro na auditoria; só então aparece Enviar ao ERP. Não liberado mostra a Trava de Governança com a mensagem exata no tooltip.",
        "Clicar no título abre o detalhe do envio: título, identificador, data e comprovante de transmissão.",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.cobranca",
      title: "Cobranças do mês",
      route: ROTAS.cobranca,
      intent: "O Financeiro vê as cobranças, confere as pendentes e envia as liberadas ao Omie.",
      expected: [
        "Área do Smart Intake para enviar XML ou PDF (até 25 MB) e selo \"Omie: SANDBOX / SIMULAÇÃO HOMOLOGADA\".",
        "Lista com 8 cobranças (DOC-CTR-…-01/02), valores mascarados (R$ ••••••••) com olho para revelar.",
        "DOC-CTR-2026-0002-02 (Recibo / RPA RPA-0612): Pendente de Anexo, vencimento — e valor não informado.",
        "b2 (LOC-0826), b6 (NFS-e 2026/0233) e b8 (RPA-0612): Pendente Conferência, Trava de Governança e o botão Conferir.",
        "b5 (Folha 07/2026, CTR-2026-0005): Aprovado 100% Conforme, Liberado e Enviar ao ERP; enviar gera o título OMIE-849203 em Contas a Pagar (SANDBOX / SIMULAÇÃO HOMOLOGADA).",
        "b1, b4 e b7 Sincronizado no Omie ERP com o título clicável; b3 com Erro, Ver motivo e Tentar de novo.",
        "Conferir a b2 mostra o valor divergente (IPTU) e aprova; conferir a b6 avisa que o dossiê do CTR-2025-0040 está Pendente de Documentos, com o atalho para o Dossiê, e também aprova.",
        "Selects Fluxo: Pagar (6) e Receber (2); Situação: Conformes (5), Sincronizados (3) e Travados (3); Exportar planilha.",
      ],
    }),
    c({
      id: "contratos.cobranca-intake-xml",
      title: "Leitura de NFS-e (XML) pelo CNPJ",
      route: ROTAS.cobranca,
      controls: { intake: "xml" },
      intent: "Enviar o XML da NFS-e da Clínica Integrar e protocolar a cobrança sugerida.",
      expected: [
        "Campos lidos: NFS-e 815, valor lido como \"18500.00\", competência 08/2026 (lida como \"2026-08-01T00:00:00\"), prestador CLINICA INTEGRAR TERAPIAS LTDA (CNPJ 12345678000190) e tomador Bloomy.",
        "Sugestão Auto-detectado: CTR-2026-0001, Clínica Integrar Terapias Ltda., Contas a Pagar (Prestador PJ), vencimento 10/08/2026 estimado pelo dia 10 do contrato.",
        "Critério (passo 1): CNPJ = Clínica Integrar Terapias Ltda. (Fornecedores, comparado só pelos dígitos) · contrato Vigente CTR-2026-0001.",
        "Confirmar e protocolar cria DOC-CTR-2026-0001-02 como Pendente Conferência, com a Trava de Governança e a observação do Smart Intake.",
        "Revisar campos abre o protocolo com o selo Auto-detectado em cada campo; editar um campo tira o selo dele.",
      ],
    }),
    c({
      id: "contratos.cobranca-intake-razao",
      title: "Sugestão pela razão social",
      route: ROTAS.cobranca,
      controls: { intake: "razao" },
      intent: "NFS-e da filial Batel da Movimento Fisioterapia: o CNPJ da filial não está no cadastro.",
      expected: [
        "Valor lido como \"9.200,00\" e normalizado; CNPJ 77888999000272 sem cadastro.",
        "Critério (passo 2): palavra \"movimento\" da razão social está em Movimento Fisioterapia Ltda. · contrato Vigente CTR-2025-0040.",
      ],
    }),
    c({
      id: "contratos.cobranca-intake-folha",
      title: "Leitura de Folha de Pagamento (PDF)",
      route: ROTAS.cobranca,
      controls: { intake: "pdf-folha" },
      intent: "PDF do resumo da folha de julho.",
      expected: [
        "Classificado como Folha de Pagamento; valor 5.518,00 (Líquido a Pagar), competência 07/2026, sem número.",
        "Critério (passo 3): Folha de Pagamento → contrato CLT Trabalho CTR-2026-0005.",
        "Padrões: número NFS-e 0730, fluxo Contas a Pagar (Prestador PJ), vencimento 05/08/2026 estimado pelo dia 5 do contrato.",
      ],
    }),
    c({
      id: "contratos.cobranca-intake-sem-match",
      title: "Sem correspondência (baixa confiança)",
      route: ROTAS.cobranca,
      controls: { intake: "sem-match" },
      intent: "NF-e de um CNPJ que não está no Cadastro de Partes nem casa pela razão social.",
      expected: [
        "Campos lidos: NF-e 112233, vencimento 20/08/2026, competência 07/2026, prestador DISTRIBUIDORA ALFA MATERIAIS LTDA (CNPJ 99888777000166).",
        "Sugestão CTR-2025-0018 (primeiro contrato Vigente) com aviso \"Sugestão de baixa confiança\" e o critério do passo 4.",
        "Sem o botão Confirmar e protocolar: só Revisar campos (troque o contrato) ou Descartar.",
      ],
    }),
    c({
      id: "contratos.cobranca-intake-pdf",
      title: "Leitura de Fatura de Locação (PDF)",
      route: ROTAS.cobranca,
      controls: { intake: "pdf" },
      intent: "Enviar o PDF da fatura de locação de setembro da Unidade Girassol.",
      expected: [
        "Classificado como Fatura de Locação; número LOC-0926 (o \"nº 455\" do endereço não é lido), valor 15.033,80 (Total da Fatura), vencimento 05/09/2026, competência 09/2026, CNPJ 44.555.666/0001-77.",
        "Critério (passo 1): CNPJ = Imobiliária Horizonte Ltda. · contrato Vigente CTR-2026-0003.",
      ],
    }),
    c({
      id: "contratos.cobranca-intake-falha",
      title: "Leitura falha ou arquivo grande",
      route: ROTAS.cobranca,
      controls: { intake: "falha" },
      intent: "XML corrompido: a leitura não traz nenhum campo.",
      expected: [
        "Aviso \"Não foi possível ler o arquivo\" com Enviar outro arquivo e Preencher manualmente.",
        "Com a leitura \"Arquivo acima de 25 MB\": \"Arquivo excede o limite máximo permitido de 25 MB.\".",
      ],
    }),
    c({
      id: "contratos.cobranca-protocolo",
      title: "Protocolo manual",
      route: ROTAS.cobranca,
      controls: { modal: "protocolo", contrato: "CTR-2026-0005" },
      intent: "Protocolar a folha de agosto do CTR-2026-0005 sem o Smart Intake.",
      expected: [
        "Drawer com contrato CTR-2026-0005 e parte, valor 6200,00 e fluxo Contas a Pagar (Folha CLT) vindos do contrato.",
        "Competência AAAA-MM obrigatória; valor e vencimento opcionais.",
        "Protocolar cria DOC-CTR-2026-0005-02 como Pendente Conferência e não liberado.",
      ],
    }),
    c({
      id: "contratos.cobranca-trava",
      title: "Cobranças travadas",
      route: ROTAS.cobranca,
      controls: { filtro: "travados" },
      intent: "Ver o que ainda não pode ir para o ERP e por quê.",
      expected: [
        "Situação em Travados: b2 (CTR-2026-0003), b6 (CTR-2025-0040) e b8 (CTR-2026-0002).",
        "Trava de Governança no lugar do botão de envio, com o tooltip \"Trava de Governança: O documento deve estar 'Aprovado 100% Conforme' e Liberado para ser enviado ao Omie.\" e Situação no ERP \"Não enviado\".",
        "Conferir a b2 libera, registra na auditoria e troca a trava por Enviar ao ERP.",
      ],
    }),
    c({
      id: "contratos.cobranca-sincronizado",
      title: "Detalhe de envio sincronizado",
      route: ROTAS.cobranca,
      controls: { detalhe: "b1" },
      intent: "Abrir o envio da NFS-e 2026/0712 da Clínica Integrar pelo título.",
      expected: [
        "Gaveta \"Envio ao ERP · DOC-CTR-2026-0001-01\" com Sincronizado no Omie ERP e Aprovado 100% Conforme.",
        "Título no Omie 88412, identificador DOC-CTR-2026-0001-01, data 09/07/2026 às 15:02, lançamento Contas a Pagar.",
        "Comprovante de transmissão (\"Conta a Pagar cadastrada com sucesso\") e os dados enviados (IncluirContaPagar, observação \"Integração Módulo de Contratos: CTR-2026-0001 | … | Competência: 2026-07\").",
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
        "Aviso \"O envio ao Omie falhou\" com o motivo (fornecedor sem conta bancária no Omie) e o documento disponível para nova tentativa.",
        "Tentar de novo (Financeiro) envia e gera o título OMIE-849203 (sandbox).",
      ],
    }),
    c({
      id: "contratos.cobranca-erp-falha",
      title: "Falha da API do Omie",
      route: ROTAS.cobranca,
      controls: { erp: "falha" },
      intent: "Enviar a b5 com a API do Omie fora do ar.",
      expected: [
        "Enviar ao ERP na b5 vira Erro com \"Falha de conexão com a API Omie…\", registrado na auditoria, e o botão Tentar de novo continua disponível.",
      ],
    }),
  ],
};
