import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do quadro da unidade.
 *
 * É a única tela do Bloomy que se atualiza sozinha — assina o canal de check-in
 * e recarrega a cada minuto. Painel de parede da recepção, não relatório: o que
 * importa precisa estar visível sem clique.
 */
export const inClinicScenarios: Scenario[] = [
  {
    id: "in-clinic.morning",
    title: "Manhã na unidade",
    intent:
      "Definir o quadro que a recepção olha de relance: quem está, desde quando, e o que cada um tem pela frente.",
    route: "/in-clinic",
    persona: "attendant",
    fixture: "in-clinic-morning",
    rules: ["checkin-marks-later-schedules-ready", "checkin-marks-earlier-schedules-delayed", "one-active-checkin-per-patient"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada paciente é um heading de nível 3, para navegação por estrutura. A situação de cada agendamento tem rótulo textual.",
    },
    status: "in-review",
    preconditions: [
      "Relógio da situação em 09:40, entre o agendamento das 09:00 e o das 10:00.",
      "O Théo chegou antes do horário; a Isadora, depois.",
    ],
    expected: [
      "Quem chegou antes do horário tem os atendimentos seguintes em Pronto.",
      "Quem chegou depois tem o horário vencido marcado como Atrasado, não como falta.",
      "Quem já saiu aparece em seção própria, com a hora da saída.",
      "A origem do check-in — recepção, totem ou aplicativo — está dita em cada linha.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "in-clinic.nothing-ready",
    title: "Presente sem atendimento pronto",
    intent:
      "Tornar impossível não ver a combinação que exige alguém agir: paciente na unidade e nada que possa começar.",
    route: "/in-clinic",
    persona: "attendant",
    fixture: "in-clinic-nothing-ready",
    rules: ["checkout-returns-schedules-to-scheduled"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Paciente com check-in às 09:30 e nenhum agendamento no dia."],
    expected: [
      "A tela destaca o paciente presente sem atendimento pronto, com aviso próprio.",
      "O aviso diz o que está acontecendo, não apenas que algo está errado.",
      "Quem chegou atrasado recebe um aviso diferente, que nomeia os horários vencidos.",
    ],
    tags: ["exceção", "decisão"],
  },
  {
    id: "in-clinic.empty",
    title: "Unidade vazia",
    intent: "Definir o estado das sete da manhã — que é o que a recepção vê ao abrir a tela.",
    route: "/in-clinic",
    persona: "attendant",
    fixture: "in-clinic-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A tela explica que o paciente aparece assim que a recepção registrar o check-in.",
      "A seção de profissionais diz que ninguém tem entrada registrada, em vez de sumir.",
    ],
    tags: ["vazio"],
  },
  {
    id: "in-clinic.therapist-view",
    title: "O quadro visto por quem atende",
    intent:
      "Verificar a regra de abas do monólito: quem atende não vê a presença dos colegas.",
    route: "/in-clinic",
    persona: "therapeutic_companion",
    fixture: "in-clinic-morning",
    rules: ["in-clinic-tabs-follow-role"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "A aba de profissionais é escondida de especialista, supervisor e terapeuta no `InClinicLive`.",
    ],
    expected: [
      "A seção de pacientes aparece completa.",
      "A seção de profissionais não aparece.",
      "A tela não mostra uma aba vazia, que ensinaria a clicar em algo que nunca serve.",
    ],
    tags: ["permissão"],
  },
  {
    id: "in-clinic.people-view",
    title: "O quadro visto pelo People",
    intent:
      "Definir o que sobra do quadro para o único papel barrado de paciente em todo o produto.",
    route: "/in-clinic",
    persona: "people",
    fixture: "in-clinic-morning",
    rules: ["in-clinic-tabs-follow-role"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["`InClinicLive` esconde a aba de pacientes de `people`."],
    expected: [
      "A seção de pacientes não aparece.",
      "A seção de profissionais aparece, com quem está na unidade e há quanto tempo.",
      "Atendimento em aberto do profissional fica visível: é o que trava o próximo início.",
    ],
    tags: ["permissão"],
  },
];
