import type { Persona } from "@brucesantos/design-space";

import { permissionsByRole } from "./permissions.js";

/**
 * Personas do Bloomy — os papéis que existem de verdade no produto.
 *
 * Não são arquétipos inventados para o Design Space. São os dez valores do campo
 * `roles` de `Bloomy.Backoffice.User`, com os rótulos que o produto mostra em
 * `priv/gettext/pt_BR/LC_MESSAGES/enums.po` e as permissões extraídas das 28
 * policies em `lib/**\/*_policy.ex`.
 *
 * Duas propriedades do modelo real valem ser ditas em voz alta, porque mudam o
 * desenho das telas:
 *
 * 1. **`roles` é um campo bitwise.** Uma pessoa acumula papéis; não escolhe um.
 *    Um coordenador que também é terapeuta tem os dois conjuntos somados. Toda
 *    tela que decide o que mostrar precisa perguntar por permissão, nunca por
 *    "qual é o papel desta pessoa".
 *
 * 2. **Há dois escopos de papel.** `admin`, `clinic_admin`, `attendant`, `people`
 *    e `operation` são atribuídos à pessoa e valem em qualquer unidade — é a lista
 *    que a tela de colaboradores filtra. `coordinator`, `therapeutic_companion`,
 *    `supervisor`, `applicator` e `specialist` são atribuídos por unidade, num
 *    modal separado. A mesma pessoa pode ser coordenadora numa unidade e
 *    terapeuta em outra.
 *
 * As permissões não são escritas aqui: vêm de `./permissions.ts`, que é gerado
 * por `scripts/gen-permissions.mjs` a partir da matriz das policies. Escrever
 * cento e dezessete permissões à mão dez vezes é como se erra em silêncio.
 *
 * Derivar em vez de transcrever expôs duas coisas que valem revisão com o time,
 * e que estão descritas na decisão 0002:
 *
 * - Metade das policies concede por lista negativa (`role not in ~W(...)`), o que
 *   libera por omissão para qualquer papel que o autor não considerou. É por isso
 *   que `people` — barrado de listar e de abrir paciente — aparece podendo ver
 *   visão geral, serviços e financeiro do paciente. São permissões mortas, mas
 *   só porque outra policy bloqueia antes.
 * - `patients.see_behavior_intervention_plan` exclui `therapeutic_companion` e
 *   `specialist`, e não exclui `applicator`. Quem conduz a intervenção não vê o
 *   plano; quem aplica, vê.
 */

/* ================================================================== *
 * Papéis globais — atribuídos à pessoa, valem em qualquer unidade
 * ================================================================== */

const admin: Persona = {
  id: "admin",
  name: "Admin",
  goal: "Operar o Bloomy sem limite de escopo, incluindo o que nenhum outro papel alcança.",
  description:
    "Único papel que cria e edita unidades, autorizações TISS e faturas de convênio, e o único que ativa ou desativa um colaborador. Serve para verificar o teto: se uma tela esconde algo do admin, é bug, não permissão.",
  permissions: [...permissionsByRole.admin],
};

const clinicAdmin: Persona = {
  id: "clinic_admin",
  name: "Admin de Clínica",
  goal: "Administrar uma clínica inteira — colaboradores, pacientes, agenda e faturamento — sem tocar na configuração do produto.",
  description:
    "Vê quase tudo do admin dentro do escopo da sua unidade, mas não cancela atendimento e não edita autorização. Nota: no monólito, `UnitPolicy.can?/2` compara com `admin_clinic` em vez de `clinic_admin`, então este papel não consegue listar unidades. Está registrado como divergência, não reproduzido como intenção.",
  permissions: [...permissionsByRole.clinic_admin],
};

const attendant: Persona = {
  id: "attendant",
  name: "Recepção",
  goal: "Manter o dia da unidade funcionando: agendar, remarcar, cancelar, bloquear horário e fazer check-in.",
  description:
    "Trabalha sob interrupção, com o responsável na frente ou no telefone. É um dos três papéis que cancelam atendimento — junto com coordenador e admin — e o único desses três que fica na recepção o dia inteiro. Não vê a visão clínica do paciente.",
  permissions: [...permissionsByRole.attendant],
};

const operation: Persona = {
  id: "operation",
  name: "Operação",
  goal: "Cuidar de convênios, serviços e autorizações — o lado contratual do atendimento.",
  description:
    "Único papel além do admin que cria e edita operadora e serviço. Em compensação é o mais cego do produto no clínico: não vê a visão geral da clínica nem os serviços do paciente, e não cancela atendimento. Serve para testar telas que precisam ser úteis sem contexto clínico.",
  permissions: [...permissionsByRole.operation],
};

const people: Persona = {
  id: "people",
  name: "People",
  goal: "Cuidar do time: contratação, agenda padrão e controle de horas dos profissionais.",
  description:
    "É o papel mais restrito do produto no que toca paciente: `PatientPolicy` exclui `people` de listar e de abrir paciente, e `SchedulePolicy` o exclui de listar agenda. Único papel além do admin que define agenda padrão de profissional. Serve para verificar se uma tela some inteira ou vira uma negativa explicada — e para ver as permissões mortas que a lista negativa concede a quem nunca chega na tela.",
  permissions: [...permissionsByRole.people],
};

/* ================================================================== *
 * Papéis por unidade — atribuídos no vínculo pessoa↔unidade
 * ================================================================== */

const coordinator: Persona = {
  id: "coordinator",
  name: "Coordenador",
  goal: "Responder pelo caso clínico: montar programa, revisar sessão, acompanhar evolução e decidir o que muda.",
  description:
    "O papel mais poderoso do lado clínico. Único que cria avaliação neuropediátrica, e um dos dois — com admin — que reverte um atendimento já finalizado. Também é quem monta mapa de horas e importa programas para o paciente.",
  permissions: [...permissionsByRole.coordinator],
};

const therapeuticCompanion: Persona = {
  id: "therapeutic_companion",
  name: "Terapeuta",
  goal: "Atender o paciente e registrar a sessão: aplicar programa, marcar tentativa, escrever evolução e assinar.",
  description:
    "Quem passa o dia dentro do atendimento. Edita a sessão que conduz, escreve resumo clínico, mas não reverte atendimento finalizado nem cancela agendamento — o erro dele precisa passar por coordenação. É o papel para quem a tela de atendimento é desenhada.",
  permissions: [...permissionsByRole.therapeutic_companion],
};

const supervisor: Persona = {
  id: "supervisor",
  name: "Supervisor",
  goal: "Supervisionar aplicadores e assinar o que a supervisão exige antes de fechar.",
  description:
    "Ligado a aplicadores por estágio (`supervisor_internships`), o que amplia o que enxerga: as sessões dos supervisionados entram no escopo dele. Assinatura de supervisor é um estado próprio no fluxo de fechamento da sessão, não um detalhe de auditoria.",
  permissions: [...permissionsByRole.supervisor],
};

const specialist: Persona = {
  id: "specialist",
  name: "Especialista",
  goal: "Atender dentro da própria especialidade e registrar a sessão como o terapeuta faz.",
  description:
    "Fonoaudiologia, psicologia, terapia ocupacional, fisioterapia, musicoterapia, psicopedagogia, psicomotricidade ou nutrição — cada uma com conselho e registro próprios. Em permissão é quase idêntico ao terapeuta; a diferença aparece no que cada especialidade pode assinar.",
  permissions: [...permissionsByRole.specialist],
};

const applicator: Persona = {
  id: "applicator",
  name: "Aplicador",
  goal: "Aplicar o programa como está desenhado e registrar o que aconteceu na tentativa.",
  description:
    "Aplicador ABA, normalmente sob supervisão formal. A única escrita que as policies lhe dão é o acompanhamento periódico (`PeriodicMonitoringPolicy`): não edita sessão, não escreve resumo clínico, nem sequer cria programa — fora isso, só leitura, chat e mapa da unidade. É a persona que revela ação bloqueada: se uma tela fica inútil para o aplicador, o desenho está assumindo permissão que ele não tem.",
  permissions: [...permissionsByRole.applicator],
};

/**
 * Ordem: papéis globais primeiro, papéis por unidade depois, cada bloco do mais
 * amplo para o mais restrito. O painel do motor lista nesta ordem, e ver
 * `applicator` no fim é um lembrete útil de quem costuma ser esquecido.
 */
export const personas: Persona[] = [
  admin,
  clinicAdmin,
  attendant,
  operation,
  people,
  coordinator,
  supervisor,
  specialist,
  therapeuticCompanion,
  applicator,
];
