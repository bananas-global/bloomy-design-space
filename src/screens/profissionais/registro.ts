import type { Feature } from "../../app/features.js";
import { PROFESSIONALS_PATH, Professionals } from "../Professionals.js";
import { PROFESSIONALS_FIXTURES } from "./fixtures.js";

export const feature: Feature = {
  scenarios: [
    {
      id: "professionals.list",
      title: "Profissionais › Cadastro",
      route: PROFESSIONALS_PATH,
      fixture: "professionals.list",
      persona: "admin",
      intent: "A lista de profissionais abre em Cadastro, com o seletor das três visões e o contador de pendências na Documentação.",
      expected: [
        "Título Profissionais; à direita o seletor Cadastro / Documentação / Controle de horas e Novo profissional.",
        "Documentação mostra o contador vermelho 4: profissionais com documento vencido ou padrão pendente.",
        "Filtros Nome/Conselho, Especialidade, Contato, Perfil e Status, com os prompts \"Selecione …\"; Status abre em Ativo, como no sistema.",
        "Colunas Nome, Especialidade, Conselho, Tipo e Formação em Saúde; embaixo, \"Mostrando 1 até 9 de 9 registros\" e a paginação.",
        "Em inativação primeiro: Tânia (sai 12/08/2026 · 7 dias) e Luciana (sai 31/08/2026 · 26 dias), com ponto laranja e fundo laranja na linha. Logo depois, Lívia (TBD).",
        "Status \"Inativo\" ou limpo: Carina por último, com ponto vermelho e \"Inativo\" embaixo do nome. Larissa com Terapeuta, Aplicador e +1.",
        "Clicar numa linha mostra o toast \"Abre a ficha do profissional\", com a rota /backoffice/profissionais/:id.",
      ],
    },
    {
      id: "professionals.docs",
      title: "Profissionais › Documentação",
      route: PROFESSIONALS_PATH,
      fixture: "professionals.docs",
      persona: "admin",
      intent: "A documentação da equipe: completude dos obrigatórios, o resumo por categoria e o credenciamento em cada operadora.",
      expected: [
        "Filtros Nome/Conselho, Especialidade, Status, Situação da documentação e Categoria (Visão geral, Profissional, Interno, Ocupacional, Operadoras).",
        "Visão geral: Completude com a barra (verde em 100%, azul a partir de 70%, vermelha abaixo) e, por categoria, quantos documentos em cada estado, ou \"em dia\".",
        "Estados: Válido, A vencer (até 60 dias), Vencido, Pendente e Dispensado; os seis documentos padrão da aba Documentos do perfil são os obrigatórios.",
        "Clicar num resumo abre a categoria: uma coluna por documento (* padrão), com o estado de cada um; Curso ABA mostra a carga horária e Form. especial até duas tags e \"+N\", numa linha.",
        "Clicar num documento abre o drawer com o estado, a validade e, em Interno e Ocupacional, Anexar/Substituir e Marcar como dispensado.",
        "Operadoras: Apto, Falta N, Não credenciado ou Descredenciado; o drawer lista os exigidos e compartilha o que falta.",
      ],
    },
    {
      id: "professionals.hours",
      title: "Profissionais › Controle de horas",
      route: PROFESSIONALS_PATH,
      fixture: "professionals.hours",
      persona: "admin",
      intent: "O controle de horas do mês, que hoje é uma página à parte, como terceira visão da lista.",
      expected: [
        "Filtros Especialidade, Profissionais (multi_select_search), Mês e Processar.",
        "Psicologia selecionada, agosto de 2026 processado: Tânia primeiro (em inativação, horas só até a saída em 12/08), depois Helena e Larissa, com horas planejadas, trabalhadas, atendimentos e valor.",
        "Trocar a especialidade seleciona os profissionais ativos dela; a tabela só muda ao Processar.",
      ],
    },
    {
      id: "professionals.read-only",
      title: "Sem permissão de criar",
      route: PROFESSIONALS_PATH,
      fixture: "professionals.list",
      persona: "attendant",
      intent: "Recepção lista os profissionais, mas não cria (ProfessionalPolicy: criar é admin, clinic_admin, coordinator e people).",
      expected: ["Sem o botão Novo profissional."],
    },
  ],
  fixtures: [...PROFESSIONALS_FIXTURES],
  routes: [
    {
      path: PROFESSIONALS_PATH,
      screen: Professionals,
      name: "Profissionais",
      description:
        "A lista de profissionais com três visões: Cadastro, Documentação (nova: a matriz de documentos da equipe e o credenciamento por operadora) e Controle de horas.",
    },
  ],
};
