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
    rules: ["document-state-comes-from-validity", "warning-window-is-thirty-days"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "A situação de cada documento é texto, e não só cor. Alternar entre cartões e tabela não muda o conteúdo lido, só o arranjo.",
    },
    status: "in-review",
    preconditions: [
      "Sete tipos padrão aparecem sempre, com ou sem arquivo.",
      "A quitação do conselho da Marina venceu em 31/03 e nenhuma operadora a exige.",
    ],
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
    rules: ["credentialing-is-derived", "expired-document-does-not-credential"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "O registro no conselho do Rui venceu em 30/06.",
      "A Unimed exige formação, conselho, identidade e currículo. Os quatro estão compartilhados.",
    ],
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
    rules: ["warning-window-is-thirty-days", "mandatory-documents-decide-completeness"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["O registro da Clara vence em 20/08, dentro dos trinta dias."],
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
    rules: ["document-requires-a-file"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["O diploma da Helena tem registro e não tem anexo."],
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
    rules: ["manual-decredentialing-does-not-self-revert", "credentialing-is-derived"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "A Porto Seguro exige formação, conselho e certidão criminal. Os três estão compartilhados e válidos.",
      "O vínculo foi descredenciado à mão em 20/01.",
    ],
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
    rules: ["credentialing-is-derived"],
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
    rules: ["aba-hours-come-from-certificates"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Dois certificados anexados: 180h e 60h."],
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
    rules: ["mandatory-documents-decide-completeness", "document-state-comes-from-validity"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada célula da matriz é um botão com nome acessível que diz tipo e situação. A matriz rola na horizontal dentro da própria região.",
    },
    status: "in-review",
    preconditions: [
      "Cinco profissionais, com uma pendência de cada tipo.",
      "A ordem de severidade é vencido, ausente, a vencer, aguardando vigência, dispensado, em dia.",
    ],
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
    rules: ["mandatory-documents-decide-completeness", "document-state-comes-from-validity"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "O contrato PJ da Denise está dispensado: musicoterapia é contratada por RPA nesta unidade.",
      "O documento dispensado tem data de validade vencida.",
    ],
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
    preconditions: [
      "A documentação usa `professionals.edit` — a policy do cadastro a que a pasta pertence, e não uma permissão nova.",
    ],
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
    rules: [
      "professional-deactivation-is-scheduled",
      "caseload-needs-a-destination",
      "substitute-must-outlast-the-transfer",
    ],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "A recusa da confirmação é lida no foco do botão, por `aria-describedby` — convenção da decisão 0003. Não há região viva: o motivo já está associado ao controle.",
    },
    status: "in-review",
    preconditions: [
      "Três pacientes em atendimento com a Denise.",
      "Um dos substitutos da mesma especialidade já tem saída marcada.",
    ],
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
    rules: ["caseload-needs-a-destination"],
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
    rules: ["deactivation-reason-is-required-once", "professional-deactivation-is-scheduled"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["A saída da Denise já está marcada para 28/08."],
    expected: [
      "A tela abre no modo de edição, dizendo quantos dias faltam.",
      "O motivo não é pedido de novo.",
      "Cancelar a inativação é uma ação disponível, e devolve o cadastro a ativo.",
    ],
    tags: ["exceção"],
  },
  {
    id: "structure.docs-unit-folder",
    title: "A pasta de documentos da unidade",
    intent:
      "Tornar visíveis os doze documentos que a vigilância cobra, incluindo os que ainda não existem.",
    route: "/structure/documents",
    persona: "operation",
    fixture: "docs-unit-blocked",
    rules: [
      "document-state-comes-from-validity",
      "warning-window-is-thirty-days",
      "standard-slot-comes-from-the-type",
    ],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "Doze documentos padrão, iguais para todas as operadoras.",
      "A licença sanitária foi emitida e começa a valer em 01/08.",
    ],
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
    rules: [
      "unit-credentialing-needs-every-standard-document",
      "expired-document-does-not-credential",
    ],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["O AVCB venceu em 10/07 e está compartilhado com as duas operadoras."],
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
    rules: ["standard-slot-comes-from-the-type", "unit-credentialing-needs-every-standard-document"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["O contrato de locação nunca foi anexado."],
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
