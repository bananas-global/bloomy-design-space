import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da documentação.
 *
 * Proposta de design, e não baseline portado: o material de origem foi
 * construído no Claude Design, fora do vocabulário e dos componentes do
 * produto. O que entra aqui é o comportamento, reconstruído com os componentes
 * do monólito e com as regras escritas de forma testável.
 *
 * O eixo dos cenários é uma pergunta só: **o que faz uma pessoa deixar de poder
 * atender por um convênio?** Quatro respostas diferentes, e três delas não
 * parecem documentação — um papel que venceu sozinho, um arquivo que nunca foi
 * anexado, e uma decisão da operadora que nenhum documento novo desfaz.
 */
export const documentScenarios: Scenario[] = [
  {
    id: "team.docs-folder",
    title: "A pasta de documentos do profissional",
    intent:
      "Tornar legível, numa tela só, o que existe, o que falta, o que está prestes a vencer e o que a operadora já enxerga.",
    route: "/team/prof-marina/documents",
    persona: "people",
    fixture: "docs-professional-complete",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "Os sete tipos padrão aparecem, e os que não têm arquivo aparecem como lacuna.",
      "A quitação vencida aparece em vermelho mesmo sem derrubar credenciamento nenhum.",
      "Os contadores separam pendente, válido, a vencer e vencido.",
      "Cada documento diz com quais operadoras foi compartilhado, e desde quando.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "team.docs-expired-drops-credentialing",
    title: "O documento que venceu derruba o credenciamento sozinho",
    intent:
      "Mostrar a consequência que ninguém dispara: o vínculo com a operadora cai sem que exista ação humana entre a validade e a queda.",
    route: "/team/prof-rui/documents",
    persona: "people",
    fixture: "docs-professional-expired-blocks",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A Unimed aparece como Em credenciamento, e não como Credenciado.",
      "A tela nomeia o documento que causou a queda, e não apenas que há pendência.",
      "O texto deixa explícito que a queda não teve autor: foi a data.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "team.docs-expiring-still-counts",
    title: "A vencer ainda vale, e já pede ação",
    intent:
      "Separar duas situações que a cor junta: um documento dentro da janela de aviso continua autorizando o atendimento de amanhã.",
    route: "/team/prof-clara/documents",
    persona: "coordinator",
    fixture: "docs-professional-expiring",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "O documento aparece como a vencer, com a contagem de dias.",
      "A SulAmérica continua credenciada: a exigência está satisfeita.",
      "A completude não cai por causa dele.",
    ],
    tags: ["regra"],
  },
  {
    id: "team.docs-registered-without-file",
    title: "O registro sem arquivo anexado",
    intent:
      "Impedir a pendência que parece resolvida: tipo escolhido, nome escrito, validade em dia e nenhum papel atrás.",
    route: "/team/prof-incompleto/documents",
    persona: "people",
    fixture: "docs-professional-no-file",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A linha diz “sem arquivo anexado”, e não aparece como cumprida.",
      "Compartilhar fica visível e indisponível, com o motivo por extenso.",
      "A completude trata a linha como falta.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "team.docs-decredentialed-stays-closed",
    title: "Descredenciada com a documentação completa",
    intent:
      "Fixar a assimetria que o recálculo não pode apagar: anexar papel não desfaz uma decisão da operadora.",
    route: "/team/prof-clara/documents",
    persona: "people",
    fixture: "docs-professional-decredentialed",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A Porto Seguro aparece como Descredenciada, sem pendência de documento.",
      "A tela explica que reabrir é uma ação, e não uma consequência.",
      "Reabrir devolve o vínculo a Em credenciamento, e não direto a Credenciado.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "team.docs-particular-has-no-credentialing",
    title: "Particular não credencia ninguém",
    intent:
      "Explicar uma ausência em vez de escondê-la: a operadora que não aparece na lista de compartilhamento parece um defeito.",
    route: "/team/prof-marina/documents",
    persona: "people",
    fixture: "docs-professional-complete",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "Particular aparece na lista, indisponível, com o motivo dito.",
      "O motivo é de negócio — não há convênio para receber o documento — e não técnico.",
    ],
    tags: ["exceção"],
  },
  {
    id: "team.docs-aba-hours-from-certificates",
    title: "A carga em ABA vem dos certificados",
    intent:
      "Tornar visível de onde sai um número que a supervisão usa para montar escala.",
    route: "/team/prof-marina/documents",
    persona: "coordinator",
    fixture: "docs-professional-complete",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A tela mostra 240h, somadas dos certificados.",
      "A faixa aparece como Intermediária, com o limiar dito.",
      "O valor do cadastro não é usado enquanto houver certificado.",
    ],
    tags: ["regra"],
  },
  {
    id: "team.docs-empty",
    title: "Pasta vazia",
    intent: "Definir o que a pessoa encontra no primeiro dia de um cadastro novo.",
    route: "/team/prof-novo/documents",
    persona: "people",
    fixture: "docs-professional-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "As sete lacunas padrão aparecem, cada uma com o que se espera dela.",
      "A tela não finge que está tudo certo: a completude mostra o que falta.",
    ],
    tags: ["vazio"],
  },
  {
    id: "team.docs-team-matrix",
    title: "A documentação da equipe inteira",
    intent:
      "Transformar uma pasta por pessoa numa fila de trabalho: quem precisa de atenção primeiro, e por quê.",
    route: "/team/documentation",
    persona: "people",
    fixture: "docs-team-matrix",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "Quem tem documento vencido aparece primeiro.",
      "A completude conta só os obrigatórios não dispensados.",
      "Os três escopos aparecem separados: profissional, interno e ocupacional.",
      "O escopo profissional é somente leitura aqui, e a tela diz onde ele é mantido.",
    ],
    tags: ["lista", "regra"],
  },
  {
    id: "team.docs-waived-leaves-the-count",
    title: "O documento dispensado sai da conta",
    intent:
      "Impedir que uma dispensa registrada volte a aparecer como pendência na semana seguinte.",
    route: "/team/documentation",
    persona: "people",
    fixture: "docs-team-matrix",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A célula aparece como Dispensado, e não como Vencido.",
      "A completude dela não considera esse obrigatório.",
      "A tela diz que dispensados saem do cálculo.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "team.docs-no-access",
    title: "Quem atende não vê a documentação da equipe",
    intent: "Definir o que a terapeuta encontra ao abrir o link da matriz.",
    route: "/team/documentation",
    persona: "therapeutic_companion",
    fixture: "docs-team-matrix",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A tela nomeia quem alcança a matriz: admin, admin de clínica, coordenação e People.",
      "O bloqueio é de permissão, não de dado.",
      "A recepção também não alcança, embora veja a lista de profissionais.",
    ],
    tags: ["permissão", "exceção"],
  },
  {
    id: "team.deactivation-needs-a-destination",
    title: "Inativar quem tem pacientes em atendimento",
    intent:
      "Impedir a saída que deixa paciente sem responsável — a única etapa desta tela que não pode ser resolvida depois.",
    route: "/team/prof-saindo/deactivate",
    persona: "people",
    fixture: "professional-deactivation-caseload",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "Confirmar fica visível e indisponível enquanto houver paciente sem destino.",
      "O motivo diz quantos faltam e o que acontece se ficarem assim.",
      "Quem já tem saída marcada não aparece como substituto.",
      "O impacto é mostrado antes da confirmação, com números.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "team.deactivation-cancels-instead",
    title: "Cancelar as sessões em vez de transferir",
    intent:
      "Manter as duas saídas visíveis: cancelar é uma decisão legítima, e precisa dizer o que produz.",
    route: "/team/prof-saindo/deactivate",
    persona: "people",
    fixture: "professional-deactivation-caseload",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "Escolher cancelar dispensa a escolha de substituto por paciente.",
      "O aviso diz quantos atendimentos caem e que os pacientes ficam sem responsável.",
      "O aceite continua obrigatório.",
    ],
    tags: ["regra"],
  },
  {
    id: "team.deactivation-edit-keeps-the-reason",
    title: "Mudar a data não pergunta o motivo de novo",
    intent:
      "Distinguir corrigir de decidir: adiar dois dias não é uma nova inativação.",
    route: "/team/prof-saindo/deactivate",
    persona: "people",
    fixture: "professional-deactivation-scheduled",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A tela abre no modo de edição, dizendo quantos dias faltam.",
      "O motivo não é pedido de novo.",
      "Cancelar a inativação é uma ação disponível, e devolve o cadastro a ativo.",
    ],
    tags: ["exceção"],
  },
  {
    id: "health-cares.docs-professionals",
    title: "A clínica vista pela operadora",
    intent:
      "Mostrar quem a operadora aceita hoje, quem falta documento e quais unidades ela credencia.",
    route: "/insurers/unimed/documents",
    persona: "admin",
    fixture: "docs-insurer-unimed",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A tabela traz carga em ABA, formações especiais e credenciamento por profissional.",
      "O escopo alterna entre Profissionais e Unidades sem sair da aba.",
    ],
    tags: ["lista"],
  },
  {
    id: "health-cares.docs-units",
    title: "As unidades que a operadora credencia",
    intent: "Ver o credenciamento pelo endereço, e não pela pessoa.",
    route: "/insurers/bradesco/documents",
    persona: "admin",
    fixture: "docs-insurer-bradesco",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "Cada unidade mostra documentos compartilhados, pendências e credenciamento.",
      "Unidade sem nenhum documento compartilhado aparece como não credenciada, e não como pendente.",
    ],
    tags: ["lista", "exceção"],
  },
  {
    id: "structure.docs-unit-folder",
    title: "A pasta de documentos da unidade",
    intent:
      "Tornar visíveis os doze documentos que a vigilância cobra, incluindo os que ainda não existem.",
    route: "/structure/documents",
    persona: "operation",
    fixture: "docs-unit-blocked",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A licença que ainda não entrou em vigência aparece como Aguardando vigência, e não como válida.",
      "O CNES aparece como sem validade, e não como pendente.",
      "O contrato social aparece como documento adicional, fora dos doze padrão.",
      "O encaixe no slot vem do tipo declarado: renomear um documento não muda o slot.",
    ],
    tags: ["lista", "regra"],
  },
  {
    id: "structure.docs-unit-credentialing-blocked",
    title: "Um documento vencido segura o credenciamento da unidade",
    intent:
      "Mostrar que a conta da unidade é do conjunto: onze documentos em ordem não compensam o décimo segundo.",
    route: "/structure/documents",
    persona: "operation",
    fixture: "docs-unit-blocked",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "As duas operadoras aparecem como Em credenciamento.",
      "A tela nomeia o AVCB como a pendência, e não mostra apenas um contador.",
      "O contrato social compartilhado não reduz a pendência: documento adicional não conta.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "structure.docs-unit-missing-slot",
    title: "A lacuna que nunca teve registro",
    intent:
      "Preservar o que uma lista de documentos anexados esconderia: o papel que ninguém anexou não aparece em lista nenhuma.",
    route: "/structure/documents",
    persona: "operation",
    fixture: "docs-unit-missing-slot",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A locação aparece como lacuna, com o que se espera dela.",
      "A ação disponível ali é anexar, e não editar.",
      "A pendência de credenciamento nomeia a locação.",
    ],
    tags: ["vazio", "regra"],
  },
  {
    id: "structure.docs-unit-empty",
    title: "Unidade recém-aberta",
    intent: "Definir a pasta antes do primeiro documento.",
    route: "/structure/documents",
    persona: "operation",
    fixture: "docs-unit-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "As doze lacunas aparecem, cada uma com o que se espera dela.",
      "Nenhuma operadora aparece como credenciada.",
    ],
    tags: ["vazio"],
  },
];
