import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { pathFor } from "@brucesantos/design-space/testing";
// Importa o catálogo, não a `ProductDefinition`: o Playwright carrega os testes
// com esbuild puro, sem os plugins do Vite, e um import de SVG na cadeia derruba
// a suíte antes do primeiro teste. Ver `src/app/catalog.ts`.
import { scenarios as catalogScenarios } from "../../src/app/catalog.js";

/**
 * Jornadas do Bloomy contra o preview, com axe na mesma passagem.
 *
 * Duas escolhas de desenho valem explicitar:
 *
 * - **Axe roda por cenário, não uma vez na home.** Violação de acessibilidade
 *   costuma ser específica de estado — o vazio, o erro, o aviso de recusa. Rodar
 *   só na primeira tela produz o "falso verde de ferramenta" que o documento de
 *   arquitetura lista como risco.
 *
 * - **Violação crítica ou séria quebra o build, igual typecheck.** `moderate` e
 *   `minor` não, para não transformar exploração em manutenção de teste.
 */

const scenarios = catalogScenarios;

/**
 * `chrome: false` porque o axe precisa medir a UI do Bloomy, não o painel do
 * motor. Sem isso, uma violação do ambiente reprovaria um produto que não a
 * causou — e um problema real do produto ficaria escondido no ruído.
 */
function urlFor(scenarioId: string): string {
  const scenario = scenarios.find((item) => item.id === scenarioId);
  if (!scenario) throw new Error(`Cenário inexistente no teste: ${scenarioId}`);
  return pathFor(scenario, { chrome: false });
}

test.describe("deep link", () => {
  for (const scenario of scenarios) {
    test(`abre "${scenario.title}" direto pela URL`, async ({ page }) => {
      // Recarga direta em rota profunda é o que o rewrite de SPA do vercel.json
      // garante. Sem ele, este é o primeiro teste a falhar em preview.
      await page.goto(urlFor(scenario.id));
      await expect(page.locator("#conteudo")).toBeVisible();
    });
  }
});

test.describe("acessibilidade por cenário", () => {
  for (const scenario of scenarios) {
    test(`axe sem violação bloqueante em "${scenario.title}"`, async ({ page }) => {
      await page.goto(urlFor(scenario.id));
      await page.locator("#conteudo").waitFor();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      const blocking = results.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      );

      expect(
        blocking.map((violation) => `${violation.id}: ${violation.help}`),
        `Violações bloqueantes em ${scenario.id}`,
      ).toEqual([]);
    });
  }
});

/* ================================================================== agenda */

test.describe("Agenda", () => {
  test("o dia normal lista os atendimentos em ordem de horário", async ({ page }) => {
    await page.goto(urlFor("agenda.day"));

    await expect(page.getByRole("heading", { name: "Agenda", level: 1 })).toBeVisible();
    await expect(page.getByRole("row")).toHaveCount(7); // cabeçalho + 6 atendimentos
    await expect(page.getByText("sem autorização")).toBeVisible();
  });

  test("o conflito de horário é anunciado por texto, não só por cor", async ({ page }) => {
    await page.goto(urlFor("agenda.double-booking"));

    await expect(page.getByRole("heading", { name: /2 horários em conflito/ })).toBeVisible();
    // Duas linhas conflitantes, cada uma com o rótulo textual: se a sinalização
    // fosse só o fundo vermelho, este teste passaria por acidente.
    await expect(page.getByText("Conflito de horário")).toHaveCount(2);
  });

  test("reagendar verifica o conflito na escolha do horário, não no envio", async ({ page }) => {
    await page.goto(urlFor("agenda.reschedule-conflict"));

    const field = page.getByLabel("Novo horário");
    const confirm = page.getByRole("button", { name: "Confirmar reagendamento" });

    await expect(confirm).toBeDisabled();

    await field.fill("10:15");
    await expect(page.getByText(/colide com outro atendimento/)).toBeVisible();
    await expect(confirm).toBeDisabled();

    await field.fill("11:45");
    await expect(page.getByText("11:45 está livre.")).toBeVisible();
    await expect(confirm).toBeEnabled();
  });

  test("cancelar exige justificativa e anuncia o resultado", async ({ page }) => {
    await page.goto(urlFor("agenda.cancel-requires-reason"));

    await page.getByRole("button", { name: "Cancelar atendimento" }).click();

    const confirm = page.getByRole("button", { name: "Confirmar cancelamento" });
    await expect(confirm).toBeDisabled();
    await expect(page.getByText("Escreva a justificativa para confirmar.")).toBeVisible();

    await page.getByLabel("Justificativa do cancelamento").fill("Paciente remarcou.");
    await expect(confirm).toBeEnabled();
    await confirm.click();

    await expect(page.getByRole("status").first()).toContainText("Atendimento cancelado");
  });

  test("quem atende não cancela nem remarca, e a tela diz a quem pedir", async ({ page }) => {
    await page.goto(urlFor("agenda.cancel-no-permission"));

    const cancel = page.getByRole("button", { name: "Cancelar atendimento" });
    await expect(cancel).toBeVisible();
    await expect(cancel).toBeDisabled();
    await expect(page.locator("#cancelar-motivo")).toHaveText(
      /não cancela atendimentos\. Peça à recepção ou à coordenação/,
    );

    // No Bloomy real, `schedules.cancel` e `schedules.edit` têm exatamente a
    // mesma lista — coordenador, admin e recepção. Então a terapeuta perde as
    // duas ações juntas, e o desenho não pode sugerir que remarcar é a saída.
    await expect(page.getByLabel("Novo horário")).toBeDisabled();
    await expect(page.locator("#reagendar-motivo")).toHaveText(/não reagenda atendimentos/);

    // O motivo aparece uma vez por ação, não duas: a região viva do
    // reagendamento fica calada quando a negativa é de permissão.
    await expect(page.locator("#novo-horario-aviso")).toBeEmpty();

    // O que não pode acontecer é a tela virar inútil: ler o atendimento
    // continua liberado, e é para isso que ela abre esse link.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("a tolerância de ausência informa quantos minutos faltam", async ({ page }) => {
    await page.goto(urlFor("agenda.no-show-too-early"));

    const button = page.getByRole("button", { name: "Registrar ausência" });
    await expect(button).toBeDisabled();
    await expect(page.getByText(/Faltam 7 para poder registrar ausência/)).toBeVisible();
  });

  test("a agenda vazia explica o vazio", async ({ page }) => {
    await page.goto(urlFor("agenda.empty"));
    await expect(
      page.getByRole("heading", { name: "Nenhum atendimento marcado para hoje" }),
    ).toBeVisible();
  });
});

/* ============================================================= atendimento */

test.describe("Atendimento", () => {
  test("as três guardas de início disparam na ordem do sistema real", async ({ page }) => {
    // Pronto: nada bloqueia.
    await page.goto(urlFor("session.ready"));
    await expect(page.getByRole("button", { name: "Iniciar atendimento" })).toBeEnabled();

    // Sem check-in: o bloqueio nomeia o paciente, porque quem resolve é a recepção.
    await page.goto(urlFor("session.no-checkin"));
    await expect(page.getByRole("button", { name: "Iniciar atendimento" })).toBeDisabled();
    await expect(page.locator("#iniciar-motivo")).toHaveText(/Théo Andrade Lins ainda não fez check-in/);

    // Atendimento aberto: o bloqueio nomeia o outro atendimento, porque quem
    // resolve é a própria profissional — e esta guarda vem antes do check-in.
    await page.goto(urlFor("session.professional-busy"));
    await expect(page.locator("#iniciar-motivo")).toHaveText(/Isadora Bueno, das 13:00/);
  });

  test("serviço não cobrável dispensa o check-in em vez de acusar falta", async ({ page }) => {
    await page.goto(urlFor("session.not-chargeable"));

    await expect(page.getByRole("button", { name: "Iniciar atendimento" })).toBeEnabled();
    await expect(page.getByText("não exigido neste serviço")).toBeVisible();
  });

  test("cada tentativa é legível sem depender de cor", async ({ page }) => {
    await page.goto(urlFor("session.running"));

    // O rótulo textual carrega acerto/erro e se houve ajuda. Uma captura em
    // preto e branco, ou um leitor de tela, precisa distinguir os três casos.
    await expect(page.getByText("Tentativa 1: acerto, com ajuda motora.")).toBeAttached();
    await expect(page.getByText("Tentativa 3: erro, independente.")).toBeAttached();

    // O programa incidental fica identificado, separado dos estruturados.
    await expect(page.getByText("Incidental")).toBeVisible();
    await expect(page.getByText("6 tentativas registradas")).toBeVisible();
  });

  test("evolução vazia leva a pendente de registro, e a tela explica por quê", async ({ page }) => {
    await page.goto(urlFor("session.pending-register"));

    await expect(page.getByRole("heading", { name: "Falta registrar" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evolução ainda não escrita" })).toBeVisible();
    await expect(page.getByText(/Assinar é declarar que o registro está correto/)).toBeVisible();
  });

  test("a cadeia de assinatura respeita a ordem e nomeia quem falta", async ({ page }) => {
    await page.goto(urlFor("session.pending-signature"));

    // A responsável pode; a supervisora ainda não.
    await expect(page.getByRole("button", { name: "Assinar como Marina Okabe" })).toBeEnabled();
    const supervisora = page.getByRole("button", { name: "Assinar como Clara Vidigal" });
    await expect(supervisora).toBeDisabled();
    await expect(page.locator("#assinar-supervisor-motivo")).toHaveText(
      /primeiro por Marina Okabe/,
    );

    // Assinar anuncia o resultado e a próxima situação, não só "assinado".
    await page.getByRole("button", { name: "Assinar como Marina Okabe" }).click();
    await expect(page.getByRole("status").first()).toContainText("Assinatura Supervisor");
  });

  test("na etapa do supervisor, quem atendeu já não assina", async ({ page }) => {
    await page.goto(urlFor("session.pending-supervisor"));

    await expect(page.getByRole("button", { name: "Assinar como Clara Vidigal" })).toBeEnabled();
    await expect(page.locator("#assinar-responsavel-motivo")).toHaveText(
      /deve ser feita por Clara Vidigal/,
    );
    // A assinatura já feita fica visível com autoria e horário.
    await expect(page.getByText("responsável pelo atendimento")).toBeVisible();
  });

  test("reverter conta o que seria apagado antes de bloquear", async ({ page }) => {
    await page.goto(urlFor("session.revert-blocked"));

    const reverter = page.getByRole("button", { name: "Reverter atendimento" });
    await expect(reverter).toBeDisabled();
    await expect(page.locator("#reverter-motivo")).toHaveText(
      /6 tentativas de programa já foram registradas.*apagaria o registro/,
    );
  });

  test("reverter diz para onde o agendamento volta, antes de reverter", async ({ page }) => {
    await page.goto(urlFor("session.revert-allowed"));

    await expect(page.getByText(/Reverter devolve o agendamento para/)).toBeVisible();
    await expect(page.getByText(/depende de o agendamento ser de hoje/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Reverter atendimento" })).toBeEnabled();
  });

  test("quem atendeu não reverte o próprio atendimento", async ({ page }) => {
    await page.goto(urlFor("session.revert-no-permission"));

    await expect(page.getByRole("button", { name: "Reverter atendimento" })).toBeDisabled();
    await expect(page.locator("#reverter-motivo")).toHaveText(/Peça à coordenação/);
  });

  test("o aplicador lê tudo e não escreve nada", async ({ page }) => {
    await page.goto(urlFor("session.applicator-cannot-register"));

    // A tela não pode virar um vazio: ler é o uso legítimo deste perfil.
    await expect(page.getByText("Théo Andrade Lins").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar atendimento" })).toBeDisabled();
    await expect(page.locator("#iniciar-motivo")).toHaveText(/não registra atendimento/);
  });

  test("atendimento entre profissionais pula registro e assinatura", async ({ page }) => {
    await page.goto(urlFor("session.professional-meeting"));

    await expect(page.getByText("sem paciente — atendimento entre profissionais")).toBeVisible();
    await expect(page.getByText("não exigido neste serviço")).toBeVisible();
    // As duas seções não existem para este tipo: ele finaliza direto.
    await expect(page.getByRole("heading", { name: "Evolução" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Assinatura" })).toHaveCount(0);
  });
});

/* =============================================================== programas */

test.describe("Programas", () => {
  test("o critério aparece por extenso, e não só como contagem", async ({ page }) => {
    await page.goto(urlFor("programs.mastery-criteria"));

    // "2 de 3" não permite prever a próxima sessão; o critério escrito, sim.
    await expect(page.getByText("80% de acerto em 3 sessões consecutivas").first()).toBeVisible();
    await expect(page.getByText(/2 de 3 — falta 1 sessão/).first()).toBeVisible();
    await expect(
      page.getByText("Consecutivas: uma sessão abaixo do alvo zera a contagem.").first(),
    ).toBeVisible();
  });

  test("cada sessão do histórico é legível sem depender de cor", async ({ page }) => {
    await page.goto(urlFor("programs.mastery-criteria"));

    await expect(
      page.getByText("Sessão de 03/06: 50 por cento, abaixo do alvo do critério.").first(),
    ).toBeAttached();
    await expect(
      page.getByText("Sessão de 17/07: 85 por cento, no alvo do critério.").first(),
    ).toBeAttached();
  });

  test("a linha de base é dita sem percentual", async ({ page }) => {
    await page.goto(urlFor("programs.baseline"));

    await expect(page.getByText("3 sessões registradas, sem meta de acerto").first()).toBeVisible();
    // O que não pode aparecer: um alvo de zero por cento lido como meta. O
    // olhar-para-trás evita casar com o "80%" dos outros programas na página.
    await expect(page.getByText(/(?<!\d)0% de acerto/)).toHaveCount(0);
  });

  test("a cascata é avisada no passo, antes de marcar", async ({ page }) => {
    await page.goto(urlFor("programs.cascade"));

    await expect(
      page.getByRole("heading", { name: "Marcar este passo fecha mais que o passo" }),
    ).toBeVisible();
    await expect(page.getByText(/encerra o programa, o objetivo, a meta inteira/)).toBeVisible();
  });

  test("a regressão nomeia a fase de destino e o critério atingido", async ({ page }) => {
    await page.goto(urlFor("programs.regression"));

    await expect(
      page.getByRole("heading", { name: "Regressão para Generalização" }),
    ).toBeVisible();
    await expect(page.getByText(/caiu abaixo de 70% em 2 sessões consecutivas/)).toBeVisible();
  });

  test("o incidental diz que é contagem, não aquisição", async ({ page }) => {
    await page.goto(urlFor("programs.incidental"));

    await expect(page.getByText(/É contagem, não aquisição/)).toBeVisible();
    // Sem critério, a tela não pode fingir um progresso de "0 de 0".
    await expect(page.getByText("Sem critério de domínio.").first()).toBeVisible();
  });

  test("a versão substituída é explicada, não escondida", async ({ page }) => {
    await page.goto(urlFor("programs.superseded"));

    await expect(page.getByText("Versão substituída")).toBeVisible();
    await expect(page.getByText(/tentativas já registradas pertencem a ela/)).toBeVisible();
    // As duas versões mostram critérios diferentes: é o motivo de existirem duas.
    await expect(page.getByText("70% de acerto em 3 sessões consecutivas").first()).toBeVisible();
    await expect(page.getByText("80% de acerto em 3 sessões consecutivas").first()).toBeVisible();
  });

  test("o aplicador não alcança o plano, e a tela explica quem alcança", async ({ page }) => {
    await page.goto(urlFor("programs.applicator-blocked"));

    await expect(
      page.getByRole("heading", { name: "Você não tem acesso aos programas" }),
    ).toBeVisible();
    await expect(page.getByText(/coordenação, supervisão e quem atende/)).toBeVisible();
  });

  test("o plano vazio explica de onde nasce um plano", async ({ page }) => {
    await page.goto(urlFor("programs.empty"));

    await expect(page.getByRole("heading", { name: "Nenhuma meta montada ainda" })).toBeVisible();
    await expect(page.getByText(/O plano nasce de uma avaliação/)).toBeVisible();
  });
});

/* ============================================================== protocolos */

test.describe("Protocolos", () => {
  test("o percentual nunca aparece sozinho: diz que é preenchimento", async ({ page }) => {
    await page.goto(urlFor("protocols.in-progress"));

    await expect(
      page.getByText("3 de 8 itens respondidos — 38% do instrumento preenchido"),
    ).toBeVisible();
    await expect(
      page.getByText("É medida de preenchimento, não de desempenho do paciente."),
    ).toBeVisible();
  });

  test("cada área tem progresso próprio", async ({ page }) => {
    await page.goto(urlFor("protocols.in-progress"));

    await expect(page.getByText("2 de 3 respondidos nesta área — 67%")).toBeVisible();
    await expect(page.getByText("1 de 3 respondidos nesta área — 33%")).toBeVisible();
    // A área ainda intocada aparece, em vez de sumir por estar vazia.
    await expect(page.getByText("0 de 2 respondidos nesta área — 0%")).toBeVisible();
  });

  test("retomar aponta o primeiro em branco, não o próximo da lista", async ({ page }) => {
    await page.goto(urlFor("protocols.resume"));

    // Posicionado em B1, que já está respondido: retomar vai para B2.
    await expect(page.getByRole("button", { name: "Retomar em B2" })).toBeVisible();
    await expect(page.getByText(/área atual primeiro, depois nas seguintes/)).toBeVisible();
  });

  test("no ABLLS-R cada item tem faixa própria, e elas diferem", async ({ page }) => {
    await page.goto(urlFor("protocols.abllsr"));

    await expect(page.getByText("Resposta — faixa de 0 a 4, própria deste item").first()).toBeVisible();
    await expect(page.getByText("Resposta — faixa de 0 a 2, própria deste item")).toBeVisible();

    // A escala compartilhada não existe neste formato e não pode aparecer.
    await expect(page.getByText("Resposta — escala do protocolo")).toHaveCount(0);
    // Item sem pontuação diz isso, em vez de mostrar zero.
    await expect(page.getByText("sem pontuação registrada")).toBeVisible();
  });

  test("a reavaliação sai do intervalo do instrumento", async ({ page }) => {
    await page.goto(urlFor("protocols.finished"));

    await expect(page.getByRole("heading", { name: "Próxima reavaliação" })).toBeVisible();
    await expect(page.getByText(/reavaliação a cada 6 meses/)).toBeVisible();
    await expect(page.getByText(/O intervalo é do instrumento, não escolha de quem aplica/)).toBeVisible();
  });

  test("a reavaliação vencida diz há quantos dias, não só que venceu", async ({ page }) => {
    await page.goto(urlFor("protocols.reassessment-overdue"));

    await expect(
      page.getByRole("heading", { name: "Reavaliação atrasada em 10 dias" }),
    ).toBeVisible();
  });

  test("a aplicação recém-aberta mostra zero sem esconder área nenhuma", async ({ page }) => {
    await page.goto(urlFor("protocols.empty"));

    await expect(
      page.getByText("0 de 8 itens respondidos — 0% do instrumento preenchido"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Retomar em A1" })).toBeVisible();
    await expect(page.getByText(/respondidos nesta área/)).toHaveCount(3);
  });

  test("a recepção não alcança protocolos, e a tela diz quem alcança", async ({ page }) => {
    await page.goto(urlFor("protocols.no-access"));

    await expect(
      page.getByRole("heading", { name: "Você não tem acesso a protocolos" }),
    ).toBeVisible();
  });
});

/* ============================================================== na clínica */

test.describe("Na Clínica", () => {
  test("o quadro distingue quem chegou antes de quem chegou depois", async ({ page }) => {
    await page.goto(urlFor("in-clinic.morning"));

    // Chegou antes do horário: os atendimentos seguintes ficaram prontos.
    const theo = page.getByRole("listitem").filter({ hasText: "Théo Andrade Lins" });
    await expect(theo.getByText("Pronto").first()).toBeVisible();

    // Chegou depois: o horário vencido é atraso, não falta.
    const isadora = page.getByRole("listitem").filter({ hasText: "Isadora Bueno Ramalho" });
    await expect(isadora.getByText("Atrasado").first()).toBeVisible();
    await expect(isadora.getByText(/o atendimento das 09:00 está atrasado/)).toBeVisible();
  });

  test("quem já saiu fica na página, em seção própria", async ({ page }) => {
    await page.goto(urlFor("in-clinic.morning"));

    await expect(page.getByRole("heading", { name: "Já saíram hoje" })).toBeVisible();
    const saiu = page.getByRole("listitem").filter({ hasText: "Laura Menendes Pinto" });
    await expect(saiu.getByText(/Saiu às 09:05/)).toBeVisible();
  });

  test("a origem do check-in é dita em cada linha", async ({ page }) => {
    await page.goto(urlFor("in-clinic.morning"));

    await expect(page.getByText(/registrado no totem/).first()).toBeVisible();
    await expect(page.getByText(/registrado na recepção/).first()).toBeVisible();
    await expect(page.getByText(/registrado pelo aplicativo/).first()).toBeVisible();
  });

  test("presente sem nada pronto é destacado como caso que exige ação", async ({ page }) => {
    await page.goto(urlFor("in-clinic.nothing-ready"));

    const noah = page.getByRole("listitem").filter({ hasText: "Noah Rivas Camargo" });
    await expect(noah.getByRole("heading", { name: "Precisa de alguém agora" })).toBeVisible();
    await expect(noah.getByText(/não há atendimento pronto para começar/)).toBeVisible();
  });

  test("quem atende não vê a presença dos colegas", async ({ page }) => {
    await page.goto(urlFor("in-clinic.therapist-view"));

    await expect(page.getByRole("heading", { name: "Pacientes na unidade" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Profissionais na unidade" })).toHaveCount(0);
  });

  test("o People vê só profissionais, com o que trava o próximo atendimento", async ({ page }) => {
    await page.goto(urlFor("in-clinic.people-view"));

    await expect(page.getByRole("heading", { name: "Pacientes na unidade" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Profissionais na unidade" })).toBeVisible();
    await expect(page.getByText("1 atendimento em aberto")).toBeVisible();
  });

  test("a unidade vazia explica o que aparece aqui", async ({ page }) => {
    await page.goto(urlFor("in-clinic.empty"));

    await expect(page.getByRole("heading", { name: "Ninguém na unidade agora" })).toBeVisible();
    await expect(
      page.getByText("Nenhum profissional com entrada registrada agora."),
    ).toBeVisible();
  });
});

/* =============================================================== pacientes */

test.describe("Pacientes", () => {
  test("o cadastro incompleto nomeia os campos que faltam", async ({ page }) => {
    await page.goto(urlFor("patients.incomplete"));

    await expect(page.getByRole("heading", { name: "Cadastro incompleto" })).toBeVisible();
    // Os campos que faltam aparecem em dois lugares de propósito: no aviso, em
    // destaque, e no motivo do botão bloqueado. `exact` distingue os dois.
    await expect(page.getByText("CPF, convênio", { exact: true })).toBeVisible();

    const schedule = page.getByRole("button", { name: "Agendar atendimento" });
    await expect(schedule).toBeDisabled();
    await expect(page.getByText(/Cadastro incompleto\. Falta: CPF, convênio\./)).toBeVisible();

    // Campo vazio diz que está vazio, em vez de exibir um traço ambíguo.
    await expect(page.getByText("não informado").first()).toBeVisible();
  });

  test("menor sem responsável bloqueia mesmo com o cadastro completo", async ({ page }) => {
    await page.goto(urlFor("patients.minor-without-guardian"));

    await expect(
      page.getByRole("heading", { name: "Paciente menor de idade sem responsável legal" }),
    ).toBeVisible();
    // `.first()` porque a idade aparece de propósito em dois lugares: no aviso e
    // no bloco de dados. Duplicar aqui é informação, não redundância.
    await expect(page.getByText("14 anos").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Agendar atendimento" })).toBeDisabled();
  });

  test("menor com responsável não mostra alarme e libera o agendamento", async ({ page }) => {
    await page.goto(urlFor("patients.minor-with-guardian"));

    await expect(page.getByRole("heading", { name: "Responsável legal" })).toBeVisible();
    await expect(page.getByText("Renata Ferraz")).toBeVisible();
    await expect(page.getByRole("button", { name: "Agendar atendimento" })).toBeEnabled();
  });

  test("prontuário restrito: a recepção vê a restrição, não o conteúdo", async ({ page }) => {
    await page.goto(urlFor("patients.restricted-record"));

    await expect(page.getByText(/Acesso restrito a pedido da paciente/)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Conteúdo não disponível para o seu perfil" }),
    ).toBeVisible();
    // Os dados cadastrais continuam legíveis: a restrição é do prontuário.
    await expect(page.getByText("SulAmérica").first()).toBeVisible();
  });

  test("prontuário restrito: a profissional lê o conteúdo", async ({ page }) => {
    await page.goto(urlFor("patients.restricted-record-professional"));

    await expect(page.getByText(/Conteúdo clínico disponível para este perfil/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Agendar atendimento" })).toBeDisabled();
  });
});

/* =========================================================== autorizações */

test.describe("Autorizações", () => {
  test("a fila ordena por quem age em seguida, não por data", async ({ page }) => {
    await page.goto(urlFor("authorizations.queue"));

    await expect(
      page.getByRole("heading", { name: /autorizações esperam ação da clínica/ }),
    ).toBeVisible();

    // O primeiro cartão precisa ser de ação da clínica, e o mais antigo deles.
    const first = page.getByRole("article").first();
    await expect(first.getByText("Ação da clínica")).toBeVisible();
    await expect(first).toContainText("G-7015");
  });

  test("cada situação diz qual é a próxima ação", async ({ page }) => {
    await page.goto(urlFor("authorizations.queue"));

    await expect(page.getByText(/o convênio está avaliando. Nada é esperado da clínica/)).toBeVisible();
    await expect(page.getByText(/falta documento da clínica. A ação é da operação/)).toBeVisible();
    await expect(page.getByText(/falta a justificativa de quem pediu/)).toBeVisible();
  });

  test("um pacote esgotado trava a autorização inteira, e a tela nomeia qual", async ({ page }) => {
    await page.goto(urlFor("authorizations.one-package-exhausted"));

    await expect(page.getByText(/Sem saldo em Psicologia — 2 sessões semanais/)).toBeVisible();
    await expect(
      page.getByText(/A autorização inteira fica indisponível.*mesmo que os outros tenham saldo/),
    ).toBeVisible();
    // O pacote com saldo continua mostrando quanto sobra: ele não é o problema.
    await expect(page.getByText("2 sessões livres")).toBeVisible();
  });

  test("capitation não multiplica a quantidade", async ({ page }) => {
    await page.goto(urlFor("authorizations.capitation"));

    await expect(page.getByText("7 de 12 usadas")).toBeVisible();
    await expect(page.getByText(/sem multiplicar pela quantidade de 3/)).toBeVisible();
  });

  test("validade vencida bloqueia mesmo com saldo", async ({ page }) => {
    await page.goto(urlFor("authorizations.expired"));

    await expect(page.getByText("vencida há 30 dias")).toBeVisible();
    await expect(page.getByText(/vale de 01\/06\/2026 a 30\/06\/2026/)).toBeVisible();
    // O saldo continua visível porque não é ele que trava.
    await expect(page.getByText("13 sessões livres")).toBeVisible();
  });

  test("a parcial dá o número que falta, não só um aviso", async ({ page }) => {
    await page.goto(urlFor("authorizations.partial"));

    await expect(page.getByRole("heading", { name: "8 sessões a menos que o pedido" })).toBeVisible();
    await expect(page.getByText(/Foram pedidas 16 e o convênio liberou 8/)).toBeVisible();
    await expect(page.getByText("Autorizada parcialmente")).toBeVisible();
  });

  test("erro de sincronização não é apresentado como recusa", async ({ page }) => {
    await page.goto(urlFor("authorizations.sync-error"));

    await expect(page.getByText(/a integração falhou. Reenviar resolve/)).toBeVisible();
    await expect(
      page.getByText("Certificado do prestador expirado na comunicação com o convênio."),
    ).toBeVisible();
    // Classificada junto com as outras que a clínica precisa resolver.
    await expect(page.getByRole("article").getByText("Ação da clínica")).toBeVisible();
  });

  test("a recepção não alcança a central de autorizações", async ({ page }) => {
    await page.goto(urlFor("authorizations.no-access"));

    await expect(
      page.getByRole("heading", { name: "Você não tem acesso à central de autorizações" }),
    ).toBeVisible();
    await expect(page.getByText(/recebe a ligação do convênio/)).toBeVisible();
  });

  test("a fila vazia explica o que aparece aqui, e em que ordem", async ({ page }) => {
    await page.goto(urlFor("authorizations.empty"));

    await expect(page.getByRole("heading", { name: "Nenhuma autorização na fila" })).toBeVisible();
    await expect(page.getByText(/em ordem de quem precisa agir primeiro/)).toBeVisible();
  });
});

test.describe("Fechamentos", () => {
  test("de quem é a bola vem antes do valor", async ({ page }) => {
    await page.goto(urlFor("closures.all-stages"));

    const primeiro = page.getByRole("article").first();
    await expect(primeiro.getByText("Com a clínica")).toBeVisible();
    await expect(primeiro.getByText(/A clínica está conferindo os valores/)).toBeVisible();
  });

  test("a trilha das sete etapas marca onde o fechamento está", async ({ page }) => {
    await page.goto(urlFor("closures.wait-accept"));

    // `aria-current="step"` é o que permite saber onde se está sem contar.
    await expect(page.locator('[aria-current="step"]')).toHaveText(/Aguardando aceite/);
    await expect(page.getByText("Etapa 2 de 7, atual:")).toBeAttached();
  });

  test("o profissional não vê o fechamento que ainda está em conferência", async ({ page }) => {
    await page.goto(urlFor("closures.invisible-until-sent"));

    await expect(
      page.getByRole("heading", { name: "Nenhum fechamento para ver aqui" }),
    ).toBeVisible();
    await expect(page.getByText(/só depois de enviados para aceite/)).toBeVisible();
  });

  test("o dono anexa a própria nota fiscal", async ({ page }) => {
    await page.goto(urlFor("closures.invoice-is-the-professionals"));

    await expect(page.getByRole("button", { name: "Anexar nota fiscal" })).toBeEnabled();
    await expect(page.getByText(/Marina Okabe precisa anexar a nota fiscal/)).toBeVisible();
  });

  test("nem o admin anexa nota no lugar do profissional", async ({ page }) => {
    await page.goto(urlFor("closures.invoice-blocked-for-others"));

    await expect(page.getByRole("button", { name: "Anexar nota fiscal" })).toBeDisabled();
    await expect(page.locator("#anexar-nf-motivo")).toHaveText(
      /documento fiscal de Marina Okabe/,
    );
  });

  test("contrato sem nota risca as etapas em vez de escondê-las", async ({ page }) => {
    await page.goto(urlFor("closures.no-invoice-contract"));

    // A etapa 5 é a validação da nota: fora do contrato e não é a atual, então
    // aparece riscada. A 4 é a atual — o fechamento está parado nela mesmo sem
    // exigir nota — e por isso é anunciada como atual, não como fora.
    await expect(page.getByText("Etapa 5 de 7, fora deste contrato:")).toBeAttached();
    await expect(page.getByText("Etapa 4 de 7, atual:")).toBeAttached();
    await expect(
      page.getByRole("heading", { name: "Contrato sem emissão de nota fiscal" }),
    ).toBeVisible();
    // A seção de nota não aparece quando o contrato não a exige.
    await expect(page.getByRole("heading", { name: "Nota fiscal", exact: true })).toHaveCount(0);
  });

  test("confirmar pagamento sem comprovante explica a consequência", async ({ page }) => {
    await page.goto(urlFor("closures.pay-without-proof"));

    await expect(page.getByRole("button", { name: "Confirmar pagamento" })).toBeDisabled();
    await expect(page.locator("#confirmar-pagamento-motivo")).toHaveText(
      /sem nada para cobrar se o valor não cair/,
    );
    await expect(page.getByRole("button", { name: "Anexar comprovante" })).toBeEnabled();
  });

  test("com comprovante, a confirmação libera", async ({ page }) => {
    await page.goto(urlFor("closures.pay-with-proof"));

    await expect(page.getByRole("button", { name: "Confirmar pagamento" })).toBeEnabled();
    await expect(page.getByText("comprovante-2026-07-marina.pdf")).toBeVisible();
  });

  test("fechamento pago está congelado, inclusive para o admin", async ({ page }) => {
    await page.goto(urlFor("closures.paid-is-frozen"));

    await expect(page.getByRole("button", { name: "Anexar comprovante" })).toBeDisabled();
    await expect(page.locator("#anexar-comprovante-motivo")).toHaveText(
      /não troca de comprovante/,
    );
    // Congelar é sobre escrita: o histórico continua legível.
    await expect(page.getByText("Pagamento confirmado")).toBeVisible();
  });

  test("a lista vazia explica de onde vêm os fechamentos", async ({ page }) => {
    await page.goto(urlFor("closures.empty"));

    await expect(page.getByText(/gerados na virada do mês, um por profissional/)).toBeVisible();
  });
});

test.describe("Faturas", () => {
  test("as duas perdas silenciosas aparecem antes do total", async ({ page }) => {
    await page.goto(urlFor("invoices.silent-losses"));

    await expect(
      page.getByRole("heading", { name: "8 sessões atendidas vão para a fatura valendo zero" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "1 autorização ficou de fora" }),
    ).toBeVisible();

    // O aviso admite o que não dá para afirmar, em vez de estimar um valor.
    await expect(page.getByText(/estimar um seria inventar um número/)).toBeVisible();
  });

  test("a linha sem acordo é destacada dentro da lista faturada", async ({ page }) => {
    await page.goto(urlFor("invoices.silent-losses"));

    await expect(page.getByText(/sem acordo ativo — entra valendo R\$\s*0,00/)).toBeVisible();
  });

  test("as autorizações fora do lote são nomeadas, não só contadas", async ({ page }) => {
    await page.goto(urlFor("invoices.silent-losses"));

    await expect(page.getByRole("heading", { name: "Fora do lote" })).toBeVisible();
    await expect(page.getByText(/G-7003.*Benício Tavares Rocha/)).toBeVisible();
  });

  test("faltando identificadores, o fechamento explica para que servem", async ({ page }) => {
    await page.goto(urlFor("invoices.missing-fields"));

    await expect(page.getByRole("button", { name: "Gerar lote e fechar" })).toBeDisabled();
    await expect(page.locator("#fechar-fatura-motivo")).toHaveText(
      /Falta preencher: protocolo, IGDR/,
    );
    await expect(page.getByText(/ninguém consegue rastreá-lo depois/)).toBeVisible();
  });

  test("sem atendimento no período não há o que faturar", async ({ page }) => {
    await page.goto(urlFor("invoices.nothing-executed"));

    await expect(
      page.getByText(/Nenhuma linha entrou no lote/),
    ).toBeVisible();
    await expect(page.locator("#fechar-fatura-motivo")).toHaveText(/Não há o que faturar/);
  });

  test("lote já gerado não fecha de novo", async ({ page }) => {
    await page.goto(urlFor("invoices.generated"));

    await expect(page.getByText("Lote gerado")).toBeVisible();
    await expect(page.locator("#fechar-fatura-motivo")).toHaveText(
      /divergir do que a operadora recebeu/,
    );
    // Travar é sobre escrita: as linhas continuam legíveis.
    await expect(page.getByText("G-7001")).toBeVisible();
  });

  test("operadora sem códigos TISS é avisada antes do envio", async ({ page }) => {
    await page.goto(urlFor("invoices.health-care-incomplete"));

    await expect(
      page.getByRole("heading", { name: "Operadora sem cadastro completo para o TISS" }),
    ).toBeVisible();
    await expect(page.getByText(/opcionais no cadastro e obrigatórios no lote/)).toBeVisible();
    await expect(page.getByText("não cadastrado").first()).toBeVisible();
  });

  test("a operação cuida do contrato e não vê a fatura", async ({ page }) => {
    await page.goto(urlFor("invoices.no-access"));

    await expect(
      page.getByRole("heading", { name: "Você não tem acesso às faturas de convênio" }),
    ).toBeVisible();
    await expect(page.getByText(/cuida do contrato com a operadora/)).toBeVisible();
  });
});

test.describe("jornada por teclado", () => {
  test("da sessão até a assinatura sem usar o mouse", async ({ page }) => {
    await page.goto(urlFor("session.pending-signature"));

    const sign = page.getByRole("button", { name: "Assinar como Marina Okabe" });
    await sign.focus();
    await expect(sign).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("status").first()).toContainText("Assinatura Supervisor");
  });

  test("o link de pulo é o primeiro elemento focável", async ({ page }) => {
    await page.goto(urlFor("agenda.day"));

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused();
  });
});

test.describe("determinismo", () => {
  for (const scenarioId of ["agenda.day", "patients.list", "authorizations.queue"]) {
    test(`a mesma URL produz a mesma situação em "${scenarioId}"`, async ({ page }) => {
      const url = urlFor(scenarioId);

      // Lê a região de conteúdo inteira, e não uma `tbody`: nem toda situação
      // é uma tabela, e o determinismo vale para a tela toda — inclusive para
      // saldos, contagens e datas calculadas.
      await page.goto(url);
      const first = await page.locator("#conteudo").innerText();

      await page.goto("about:blank");
      await page.goto(url);
      const second = await page.locator("#conteudo").innerText();

      expect(second).toBe(first);
    });
  }
});

test.describe("navegação por permissão", () => {
  test("o menu esconde a central de autorizações de quem atende", async ({ page }) => {
    await page.goto(urlFor("agenda.cancel-no-permission"));

    // A terapeuta tem `schedules.list` e `patients.list`, e não tem
    // `authorizations.hub`. Um item visível e sem acesso ensina a pessoa a
    // clicar em algo que sempre falha.
    const nav = page.getByLabel("Navegação principal");
    await expect(nav.getByRole("link", { name: "Agenda" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Pacientes" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Autorizações" })).toHaveCount(0);
  });

  test("a recepção alcança agenda e pacientes, e não a central de autorizações", async ({
    page,
  }) => {
    await page.goto(urlFor("agenda.day"));

    // `authorizations.hub` é de admin, admin de clínica e operação. A recepção
    // opera a agenda o dia inteiro e nunca vê a central — o que vale conferir,
    // porque é ela quem recebe a ligação do convênio.
    const nav = page.getByLabel("Navegação principal");
    await expect(nav.getByRole("link", { name: "Agenda" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Pacientes" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Autorizações" })).toHaveCount(0);
  });

  test("a operação alcança a central de autorizações", async ({ page }) => {
    await page.goto(urlFor("authorizations.queue"));

    await expect(page.getByRole("link", { name: "Autorizações" })).toBeVisible();
  });
});
