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
      description: "Clientes e fornecedores & pessoal, com cadastro por subtipo e aviso de CNPJ/CPF já cadastrado.",
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
                { value: "cliente", label: "Novo cliente (Operadora ANS)" },
                { value: "fornecedor-pj", label: "Novo fornecedor PJ" },
                { value: "fornecedor-clt", label: "Novo fornecedor CLT" },
                { value: "duplicada", label: "CNPJ já cadastrado" },
              ],
            },
          ],
        },
        papelControl("comercial"),
      ],
      expected: [
        "Visões Todas, Clientes (receita) e Fornecedores & Pessoal (despesa) com contagem; filtros PJ/PF; busca; etiquetas e Exportar planilha.",
        "Comercial vê só Novo cliente; Compras / RH-DP vê só Novo fornecedor; Administrador vê os dois; os demais papéis só consultam.",
        "Clicar na linha abre o cadastro para edição no painel lateral.",
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
        "Tabela por código: CLI-0001 Vida Plena Saúde S.A. … FOR-0008 Gráfica Pontual Ltda.; colunas código, nome, documento, subtipo, fluxo, contato e status.",
        "CLI-0005 Pedro Henrique Sales com selo Liminar; FOR-0008 Gráfica Pontual Inativo e Não homologado; demais fornecedores Homologado.",
        "Botão Novo cliente (papel Comercial); sem Novo fornecedor.",
        "Exportar planilha com as linhas filtradas.",
      ],
    }),
    c({
      id: "contratos.parte-cliente",
      title: "Novo cliente — Operadora ANS",
      route: ROTAS.partes,
      controls: { form: "cliente", visao: "clientes" },
      intent: "Comercial cadastra uma operadora para depois credenciar a clínica.",
      expected: [
        "Painel lateral Novo cliente, tipo Operadora ANS marcado entre Operadora ANS, Particular PJ, Pessoa Física e Liminar Judicial.",
        "Código CLI-0006 com selo Automático e o link Informar código manual / legado (selo muda para Manual / Legado).",
        "Campos Razão social, CNPJ, Registro ANS, Dia de corte, Prazo de retorno, Recebimento (forma e condição) e Contato.",
        "Cadastrar cliente vazio mostra \"Corrija N campos\" e o erro em cada obrigatório; dia de corte fora de 1–31 é recusado.",
        "Trocar para Liminar Judicial pede processo e vara e mostra o selo Origem liminar.",
      ],
    }),
    c({
      id: "contratos.parte-fornecedor-pj",
      title: "Novo fornecedor PJ",
      route: ROTAS.partes,
      controls: { form: "fornecedor-pj", visao: "fornecedores", papel: "compras" },
      intent: "Compras cadastra uma clínica parceira como fornecedor PJ.",
      expected: [
        "Painel lateral Novo fornecedor, tipo Fornecedor PJ; código FOR-0009 Automático.",
        "Campos Razão social, CNPJ, Regime tributário, CNAE, Responsável técnico, Conselho; Pagamento e dados bancários (forma, condição, banco, agência, conta, chave Pix); Contato; Ativo e Homologado para contratar.",
        "Na lista, o papel Compras vê só Novo fornecedor.",
      ],
    }),
    c({
      id: "contratos.parte-fornecedor-clt",
      title: "Novo fornecedor CLT",
      route: ROTAS.partes,
      controls: { form: "fornecedor-clt", visao: "fornecedores", papel: "compras" },
      intent: "RH-DP cadastra uma pessoa contratada pela CLT.",
      expected: [
        "Tipo CLT marcado; Nome completo e CPF (máscara 000.000.000-00).",
        "Campos Cargo, CBO, Admissão, Carga horária, CTPS e Salário (R$); dados bancários para o pagamento.",
      ],
    }),
    c({
      id: "contratos.parte-duplicada",
      title: "CNPJ já cadastrado",
      route: ROTAS.partes,
      controls: { form: "duplicada", visao: "fornecedores", papel: "compras" },
      intent: "Evitar a mesma clínica em dois cadastros, que dividiria contratos e cobranças.",
      expected: [
        "Novo fornecedor com CNPJ 12.345.678/0001-90 digitado.",
        "Aviso âmbar: \"Este CNPJ já é de Clínica Integrar Terapias Ltda. (FOR-0001). Salvar vai atualizar o cadastro existente, só com os campos preenchidos.\"",
        "Código mostra FOR-0001 com selo Cadastro existente; o botão vira Atualizar cadastro.",
        "Atualizar mantém os dados de FOR-0001 que ficaram em branco e mostra o toast Cadastro atualizado.",
      ],
    }),
  ],
};
