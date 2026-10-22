import type { Feature } from "../../../app/features.js";
import { ContratosPartes } from "../../ContratosPartes.js";
import { ROTAS, papelControl } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = ["core.table", "core.input", "core.drawer-modal", "core.radio-group", "core.form-grid", "core.empty-state-card", "core.toast-wrapper"];
const c = cenario(COMPONENTS);

export const partes: Feature = {
  routes: [
    {
      path: ROTAS.partes,
      screen: ContratosPartes,
      name: "Cadastro de Partes",
      group: FLOW,
      description: "Clientes e fornecedores & pessoal, com cadastro por subtipo/categoria, código automático ou manual, valores padrão da RN-062 e deduplicação por documento (RN-061/RN-063).",
      components: COMPONENTS,
      controls: [
        {
          id: "abertura",
          title: "Abertura",
          controls: [
            { id: "visao", label: "Visão", default: "todas", options: [{ value: "todas", label: "Todas" }, { value: "clientes", label: "Clientes (receita)" }, { value: "fornecedores", label: "Fornecedores & Pessoal (despesa)" }] },
            {
              id: "form",
              label: "Cadastro aberto",
              default: "nenhum",
              options: [
                { value: "nenhum", label: "Nenhum" },
                { value: "cliente", label: "Novo cliente (padrão: Particular PJ)" },
                { value: "cliente-operadora", label: "Novo cliente Operadora ANS" },
                { value: "cliente-pf", label: "Novo cliente Particular PF" },
                { value: "cliente-liminar", label: "Novo cliente Liminar Judicial" },
                { value: "fornecedor-pj", label: "Novo fornecedor PJ Assistencial" },
                { value: "fornecedor-clt", label: "Novo Colaborador CLT" },
                { value: "duplicada", label: "CNPJ já cadastrado (sem máscara)" },
                { value: "codigo-repetido", label: "Código manual já utilizado" },
              ],
            },
          ],
        },
        papelControl("administrador"),
      ],
      expected: [
        "Visões Todas, Clientes (receita) e Fornecedores & Pessoal (despesa) com contagem; filtro Pessoa PJ/PF com contagem; busca; etiquetas e Exportar planilha.",
        "Comercial vê só Novo cliente; Compras / RH-DP vê só Novo fornecedor; Administrador vê os dois; os demais papéis só consultam.",
        "Clicar na linha abre o cadastro para edição no painel lateral.",
        "Código automático do sequencial (CLI-0006, FOR-0009) ou manual / legado; código manual já usado é recusado com \"Código já utilizado\".",
        "CNPJ/CPF comparado só pelos dígitos: documento repetido atualiza o cadastro existente só com os campos preenchidos e mostra o aviso Cadastro atualizado.",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.partes",
      title: "Lista de partes",
      route: ROTAS.partes,
      intent: "Consultar clientes e fornecedores e abrir um cadastro.",
      expected: [
        "Visões em button_tabs: Todas (13), Clientes (receita) (5), Fornecedores & Pessoal (despesa) (8); busca à esquerda e select Pessoa: PJ (9) e PF (4).",
        "Tabela por código: CLI-0001 Vida Plena Saúde S.A. … FOR-0008 Gráfica Pontual Ltda.; colunas código, nome, documento, subtipo · pessoa, fluxo, contato e status.",
        "Subtipos do glossário: Operadora ANS, Particular PJ, Particular PF, Liminar Judicial; PJ Assistencial, PJ Específico (Locador), PJ Corporativo, Colaborador CLT, Autônomo / RPA.",
        "CLI-0005 Pedro Henrique Sales com selo Liminar; FOR-0008 Gráfica Pontual Inativo e Não homologado; demais fornecedores Homologado.",
        "Botão Novo cliente (papel Comercial); sem Novo fornecedor.",
        "Exportar planilha com as linhas filtradas.",
      ],
    }),
    c({
      id: "contratos.parte-cliente",
      title: "Novo cliente — valores padrão",
      route: ROTAS.partes,
      controls: { form: "cliente", visao: "clientes" },
      intent: "Comercial abre o cadastro de cliente com os valores padrão da RN-062.",
      expected: [
        "Painel lateral Novo cliente, subtipo Particular PJ · PJ marcado entre Particular PJ, Operadora ANS, Empresa Corporativa (PJ), Particular PF e Liminar Judicial (PF).",
        "Código CLI-0006 com selo Automático e o link Informar código manual / legado (selo muda para Manual / Legado).",
        "Seções: Identificação (Razão social, CNPJ), Dados empresariais (Nome fantasia, Inscrição municipal, Inscrição estadual), Paciente vinculado (Paciente/beneficiário *, CPF do paciente), Faturamento e recebimento, Endereço e contato, Situação.",
        "Recebimento já vem Boleto Bancário e condição 30 dias direto; Situação Ativo.",
        "Faturamento e recebimento: E-mail de faturamento, Banco, Agência, Conta e Chave Pix do pagador; Endereço e contato: CEP, Endereço completo, contato, e-mail e Telefone / WhatsApp.",
        "Cadastrar cliente vazio mostra \"Corrija N campos\" e o erro em cada obrigatório.",
      ],
    }),
    c({
      id: "contratos.parte-operadora",
      title: "Novo cliente — Operadora ANS",
      route: ROTAS.partes,
      controls: { form: "cliente-operadora", visao: "clientes" },
      intent: "Comercial cadastra uma operadora para depois credenciar a clínica.",
      expected: [
        "Subtipo Operadora ANS · PJ marcado; seção Operadora ANS com Registro ANS *, Dia de corte do lote * (20), Prazo de retorno * (30 dias) e Contato de credenciamento.",
        "Dia de corte fora de 1–31 é recusado.",
        "Digitar o registro ANS 412345 (da Vida Plena) acusa \"Cadastro já existente\": salvar atualiza CLI-0001 (RN-063).",
      ],
    }),
    c({
      id: "contratos.parte-pf",
      title: "Novo cliente — Particular PF",
      route: ROTAS.partes,
      controls: { form: "cliente-pf", visao: "clientes" },
      intent: "Atendimento cadastra o paciente particular e o responsável legal.",
      expected: [
        "Subtipo Particular PF · PF; Nome completo e CPF (máscara 000.000.000-00).",
        "Seção Paciente e responsável legal: Paciente/beneficiário *, CPF do paciente, Data de nascimento do paciente, RG, Responsável legal *, CPF do responsável *, Parentesco * e Origem liminar (Não).",
        "Origem liminar Sim troca o subtipo para Liminar Judicial e pede Processo e Vara.",
        "Mesmo CPF do responsável e mesmo paciente de um cadastro existente acusam \"Cadastro já existente\" (RN-063).",
      ],
    }),
    c({
      id: "contratos.parte-liminar",
      title: "Novo cliente — Liminar Judicial",
      route: ROTAS.partes,
      controls: { form: "cliente-liminar", visao: "clientes" },
      intent: "Cadastrar um paciente atendido por decisão judicial.",
      expected: [
        "Subtipo Liminar Judicial marcado, selo Origem liminar e Origem liminar = Sim automaticamente.",
        "Seção Liminar judicial com Processo * e Vara *, além de paciente e responsável legal.",
      ],
    }),
    c({
      id: "contratos.parte-fornecedor-pj",
      title: "Novo fornecedor PJ",
      route: ROTAS.partes,
      controls: { form: "fornecedor-pj", visao: "fornecedores", papel: "compras" },
      intent: "Compras cadastra uma clínica parceira como fornecedor PJ Assistencial.",
      expected: [
        "Painel lateral Novo fornecedor, categoria PJ Assistencial · PJ entre PJ Assistencial, PJ Corporativo, PJ Específico (Locador), Colaborador CLT, Autônomo / RPA e Consultor PF; código FOR-0009 Automático.",
        "Dados empresariais: Nome fantasia, inscrições, Natureza jurídica, Regime tributário (Simples Nacional), CNAE, Retenções aplicáveis, E-mail financeiro; Habilitação técnica: Responsável técnico e Conselho.",
        "Pagamento e dados bancários: PIX, condição 30 dias direto, Banco, Agência, Conta, Tipo de conta (Corrente) e Chave Pix; Situação Ativo e Homologado para contratar ligados.",
        "Na lista, o papel Compras vê só Novo fornecedor.",
      ],
    }),
    c({
      id: "contratos.parte-fornecedor-clt",
      title: "Novo Colaborador CLT",
      route: ROTAS.partes,
      controls: { form: "fornecedor-clt", visao: "fornecedores", papel: "compras" },
      intent: "RH-DP cadastra uma pessoa contratada pela CLT.",
      expected: [
        "Categoria Colaborador CLT marcada; Nome completo e CPF (máscara 000.000.000-00).",
        "Documentos pessoais: RG, Órgão emissor RG, Data de nascimento, PIS/PASEP/NIT, CTPS e Série CTPS.",
        "Vínculo e jornada: Cargo *, CBO, Admissão *, Carga horária semanal (44), Escala de trabalho (Segunda a Sexta), Salário (0,00), Vale-transporte (Sim), Status do vínculo (Ativo).",
        "Cadastrar sem CPF, nome, cargo ou admissão mostra o erro em cada um (RN-063).",
      ],
    }),
    c({
      id: "contratos.parte-duplicada",
      title: "CNPJ já cadastrado",
      route: ROTAS.partes,
      controls: { form: "duplicada", visao: "fornecedores", papel: "compras" },
      intent: "Evitar a mesma clínica em dois cadastros, que dividiria contratos e cobranças.",
      expected: [
        "Novo fornecedor com o CNPJ 12345678000190 digitado sem máscara: é o mesmo de 12.345.678/0001-90 (comparação só pelos dígitos).",
        "Aviso âmbar \"Cadastro já existente\": \"Este CNPJ já é de Clínica Integrar Terapias Ltda. (FOR-0001). Salvar vai atualizar o cadastro existente só com os campos preenchidos…\"",
        "Código mostra FOR-0001 com selo Cadastro existente; o botão vira Atualizar cadastro.",
        "Atualizar mantém os dados de FOR-0001 que ficaram em branco (inclusive os bancários e o regime, mesmo com os padrões no formulário) e mostra o aviso e o toast Cadastro atualizado.",
      ],
    }),
    c({
      id: "contratos.parte-codigo-repetido",
      title: "Código manual já utilizado",
      route: ROTAS.partes,
      controls: { form: "codigo-repetido", visao: "clientes" },
      intent: "Migrar um cliente legado com um código que já existe.",
      expected: [
        "Novo cliente com o código manual CLI-0001 e o selo Manual / Legado.",
        "Cadastrar recusa com \"Código já utilizado\" no campo do código.",
      ],
    }),
  ],
};
