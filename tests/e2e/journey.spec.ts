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

test.describe("Equipe", () => {
  test("o cadastro diz o que decide em outros módulos", async ({ page }) => {
    await page.goto(urlFor("team.supervision-defines-signature"));

    await expect(page.getByRole("heading", { name: "O que este cadastro decide" })).toBeVisible();
    await expect(
      page.getByText(/segunda assinatura, de Clara Vidigal.*vem do vínculo de estágio/),
    ).toBeVisible();
    await expect(page.getByText("— exige assinatura nas sessões")).toBeVisible();
  });

  test("o profissional a definir não é um cadastro incompleto", async ({ page }) => {
    await page.goto(urlFor("team.tbd"));

    await expect(page.getByRole("heading", { name: "Espaço reservado na agenda" })).toBeVisible();
    await expect(page.getByText(/exige apenas nome e especialidade/)).toBeVisible();
    // O aviso de cadastro incompleto não pode aparecer: é outro tipo de cadastro.
    await expect(page.getByText(/Cadastro incompleto/)).toHaveCount(0);
  });

  test("o cadastro comum incompleto conta e nomeia os campos", async ({ page }) => {
    await page.goto(urlFor("team.incomplete"));

    await expect(
      page.getByRole("heading", { name: "Cadastro incompleto: 6 campos faltando" }),
    ).toBeVisible();
    await expect(page.getByText(/Falta CPF, data de nascimento/)).toBeVisible();
  });

  test("o contrato por hora acusa a taxa que falta e a consequência", async ({ page }) => {
    await page.goto(urlFor("team.contract-incomplete"));

    await expect(page.getByRole("heading", { name: "Contrato incompleto" })).toBeVisible();
    await expect(page.getByText(/Falta hora administrativa especial/)).toBeVisible();
    await expect(page.getByText(/descoberto pelo profissional, no aceite/)).toBeVisible();
    await expect(page.getByText("não informado")).toBeVisible();
  });

  test("hora administrativa zerada é válida no contrato fixo", async ({ page }) => {
    await page.goto(urlFor("team.fixed-contract-allows-zero"));

    const clara = page.getByRole("article").filter({ hasText: "Clara Vidigal" });
    await expect(clara.getByText(/quem tem mensalidade não cobra hora administrativa à parte/)).toBeVisible();
    await expect(clara.getByRole("heading", { name: "Contrato incompleto" })).toHaveCount(0);
  });

  test("o contrato sem nota explica o fechamento curto do outro módulo", async ({ page }) => {
    await page.goto(urlFor("team.no-invoice-contract"));

    await expect(
      page.getByText(/fechamento mensal pula as etapas de nota fiscal/),
    ).toBeVisible();
  });

  test("desativar sem data explica o que a data separa", async ({ page }) => {
    await page.goto(urlFor("team.deactivation-without-date"));

    const botao = page.getByRole("button", { name: "Desativar profissional" });
    await expect(botao).toBeDisabled();
    await expect(page.getByText(/separa o histórico do que ainda vale/)).toBeVisible();
  });

  test("quem atende não alcança a lista de profissionais", async ({ page }) => {
    await page.goto(urlFor("team.no-access"));

    await expect(page.getByRole("heading", { name: "Você não tem acesso à equipe" })).toBeVisible();
  });

  test("a unidade sem profissionais explica o vazio", async ({ page }) => {
    await page.goto(urlFor("team.empty"));

    await expect(
      page.getByRole("heading", { name: "Nenhum profissional vinculado" }),
    ).toBeVisible();
  });
});

test.describe("Portal público", () => {
  test("o totem anuncia a etapa e usa alvos grandes", async ({ page }) => {
    await page.goto(urlFor("public.kiosk-identification"));

    await expect(page.getByText("Etapa 1 de 3, atual:")).toBeAttached();
    await expect(page.locator('[aria-current="step"]')).toHaveText(/Identificação/);
    await expect(page.getByLabel("CPF do responsável")).toBeVisible();
  });

  test("CPF errado e CPF sem cadastro dão saídas opostas", async ({ page }) => {
    await page.goto(urlFor("public.kiosk-invalid-cpf"));
    await expect(page.getByRole("heading", { name: "CPF inválido" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Digitar de novo" })).toBeVisible();

    await page.goto(urlFor("public.kiosk-guardian-not-found"));
    await expect(page.getByRole("heading", { name: "Não encontramos esse CPF" })).toBeVisible();
    await expect(page.getByText(/O CPF está correto/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Falar com a recepção" })).toBeVisible();
  });

  test("quem já está dentro recebe registrar saída", async ({ page }) => {
    await page.goto(urlFor("public.kiosk-select-patient"));

    await expect(page.getByText("Registrar chegada")).toBeVisible();
    await expect(page.getByText("Registrar saída")).toBeVisible();
    await expect(page.getByText("Atendimentos às 10:00 e 11:00")).toBeVisible();
  });

  test("nenhum agendamento levanta as duas hipóteses", async ({ page }) => {
    await page.goto(urlFor("public.kiosk-no-patients"));

    await expect(page.getByText(/Pode ser outro dia, ou outra unidade/)).toBeVisible();
  });

  test("a confirmação diz o que fazer agora", async ({ page }) => {
    await page.goto(urlFor("public.kiosk-complete"));

    await expect(page.getByRole("heading", { name: "Chegada registrada" })).toBeVisible();
    await expect(page.getByText(/Podem aguardar aqui na recepção/)).toBeVisible();
    // Confirmação é status, não alerta: não interrompe.
    await expect(page.getByRole("status")).toContainText("Chegada registrada");
  });

  test("sem unidade, o totem não mostra etapas a percorrer", async ({ page }) => {
    await page.goto(urlFor("public.kiosk-unit-not-found"));

    await expect(page.getByRole("heading", { name: "Unidade não encontrada" })).toBeVisible();
    await expect(page.getByLabel("Etapas do check-in")).toHaveCount(0);
  });

  test("a escala do NPS é um grupo de rádio com extremos nomeados", async ({ page }) => {
    await page.goto(urlFor("public.nps-form"));

    await expect(page.getByRole("group", { name: "Nota de 0 a 10" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Nota 0, de jeito nenhum" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Nota 10, com certeza" })).toBeVisible();

    // Enviar fica bloqueado até haver nota.
    await expect(page.getByRole("button", { name: "Enviar" })).toBeDisabled();
    await expect(page.getByText(/nada foi contabilizado/)).toBeVisible();
  });

  test("nota baixa recebe o mesmo agradecimento, sem classificação", async ({ page }) => {
    await page.goto(urlFor("public.nps-low-rating"));

    await expect(page.getByRole("heading", { name: "Obrigado pela resposta" })).toBeVisible();
    await expect(page.getByText("4 de 10")).toBeVisible();
    // A faixa do NPS é leitura interna e não pode vazar para a família.
    await expect(page.getByText(/detrator|neutro|promotor/i)).toHaveCount(0);
  });
});

test.describe("Portal da família", () => {
  test("o horário cancelado continua na lista, marcado", async ({ page }) => {
    await page.goto(urlFor("guardian.home"));

    await expect(page.getByText("Cancelado")).toBeVisible();
    // Sumir com ele faria a família descobrir o cancelamento na clínica.
    await expect(page.getByText("06 de ago. de 2026 às 10:00")).toBeVisible();
  });

  test("o plano é mostrado por inteiro antes do aceite", async ({ page }) => {
    await page.goto(urlFor("guardian.plan-pending"));

    await expect(page.getByRole("heading", { name: "O que vai ser trabalhado" })).toBeVisible();
    await expect(page.getByText("Comunicação funcional")).toBeVisible();
    await expect(page.getByText("Pedir itens preferidos")).toBeVisible();

    // Assinatura é campo, não caixa de seleção.
    await expect(page.getByLabel("Assine com seu nome completo")).toBeEnabled();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Aceitar o plano" })).toBeEnabled();
  });

  test("o aceite registrado aparece para quem consentiu", async ({ page }) => {
    await page.goto(urlFor("guardian.plan-accepted"));

    await expect(page.getByText(/Assinado por Renata Andrade Lins/)).toBeVisible();
    await expect(page.getByText(/08 de jan\. de 2026/)).toBeVisible();
    // Não há o que assinar duas vezes.
    await expect(page.getByLabel("Assine com seu nome completo")).toHaveCount(0);
  });

  test("plano vencido não recebe aceite, e diz a quem recorrer", async ({ page }) => {
    await page.goto(urlFor("guardian.plan-expired"));

    await expect(page.getByRole("button", { name: "Aceitar o plano" })).toBeDisabled();
    await expect(page.getByLabel("Assine com seu nome completo")).toBeDisabled();
    await expect(page.getByText(/Fale com a coordenação/)).toBeVisible();
  });

  test("plano de outra família não revela nada da criança", async ({ page }) => {
    await page.goto(urlFor("guardian.plan-other-family"));

    await expect(page.getByRole("heading", { name: "Este plano não é seu" })).toBeVisible();
    // Nem o nome da criança nem as metas podem aparecer.
    await expect(page.getByText("Laura Menendes Pinto")).toHaveCount(0);
    await expect(page.getByText("Comunicação funcional")).toHaveCount(0);
  });

  test("os termos explicam o que é guardado, e para quê", async ({ page }) => {
    await page.goto(urlFor("guardian.terms-missing"));

    await expect(page.getByText(/instante, o endereço de rede e o aparelho usado/)).toBeVisible();
    await expect(page.getByText(/não para acompanhar você/)).toBeVisible();
  });

  test("a família sem agenda sabe o que esperar", async ({ page }) => {
    await page.goto(urlFor("guardian.empty"));

    await expect(page.getByText(/A clínica entra em contato/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nenhum plano montado ainda" })).toBeVisible();
  });
});

test.describe("Portal da operadora", () => {
  test("o total separa o que fechou do que apenas aconteceu", async ({ page }) => {
    await page.goto(urlFor("insurer.attendance"));

    // Os quatro números do resumo são um `dl`: o rótulo é `dt`, não texto solto.
    await expect(page.getByRole("term").filter({ hasText: "Atendimentos prestados" })).toBeVisible();
    await expect(page.getByRole("term").filter({ hasText: "Aguardando fechamento" })).toBeVisible();
    await expect(
      page.getByText(/aguardando fechamento aconteceram e ainda não têm assinatura completa/),
    ).toBeVisible();
  });

  test("cada linha não prestada diz por quê", async ({ page }) => {
    await page.goto(urlFor("insurer.attendance"));

    await expect(page.getByText("Paciente faltou")).toBeVisible();
    await expect(page.getByText("Realizado, aguardando assinatura de quem atendeu")).toBeVisible();
    await expect(page.getByText("Realizado, aguardando assinatura do supervisor")).toBeVisible();
  });

  test("a tabela tem legenda e cabeçalhos de coluna", async ({ page }) => {
    await page.goto(urlFor("insurer.attendance"));

    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Profissional" })).toBeVisible();
    await expect(page.getByText(/Atendimentos de beneficiários da Bradesco Saúde entre/)).toBeAttached();
  });

  test("a omissão do escopo é declarada, não silenciosa", async ({ page }) => {
    await page.goto(urlFor("insurer.hidden-incomplete"));

    await expect(
      page.getByRole("heading", { name: "2 agendamentos do período não aparecem nesta lista" }),
    ).toBeVisible();
    await expect(page.getByText(/No sistema atual esse filtro é silencioso/)).toBeVisible();
    await expect(page.getByText(/discutida em vez de herdada/)).toBeVisible();
  });

  test("o que a operadora não vê é dito em voz alta", async ({ page }) => {
    await page.goto(urlFor("insurer.not-shared"));

    await expect(page.getByRole("heading", { name: "O que não aparece aqui" })).toBeVisible();
    await expect(page.getByText("a evolução escrita da sessão")).toBeVisible();
    await expect(page.getByText("as tentativas registradas nos programas")).toBeVisible();
    await expect(page.getByText(/conteúdo clínico é do paciente e da clínica/)).toBeVisible();
  });

  test("competência sem movimento mostra zeros, sem sumir com a seção", async ({ page }) => {
    await page.goto(urlFor("insurer.empty"));

    await expect(
      page.getByText("Nenhum atendimento de beneficiário desta operadora no período."),
    ).toBeVisible();
    await expect(page.getByRole("term").filter({ hasText: "Atendimentos prestados" })).toBeVisible();
  });
});

test.describe("Estrutura", () => {
  test("cada serviço diz de que sala precisa e quantas atendem", async ({ page }) => {
    await page.goto(urlFor("structure.unit"));

    await expect(page.getByText("Precisa de sala individual.")).toBeVisible();
    await expect(page.getByText("2 salas atendem a este serviço nesta unidade.")).toBeVisible();
  });

  test("falta de sala e erro de cadastro são avisos separados", async ({ page }) => {
    await page.goto(urlFor("structure.unit"));

    await expect(
      page.getByRole("heading", { name: /não pode ser agendado em lugar nenhum/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /serviço sem sala disponível nesta unidade/ }),
    ).toBeVisible();
    // A distinção é o ponto: uma pede sala, a outra pede corrigir o cadastro.
    await expect(page.getByText(/É falta de sala, não erro de cadastro/)).toBeVisible();
  });

  test("a sala inativa fica na lista, marcada e datada", async ({ page }) => {
    await page.goto(urlFor("structure.no-room-for-service"));

    await expect(page.getByText("Inativa desde 14/07/2026")).toBeVisible();
    await expect(page.getByText("Sala de motricidade").first()).toBeVisible();
  });

  test("cada bloqueio traz a saída, não só o motivo", async ({ page }) => {
    await page.goto(urlFor("structure.blockings"));

    await expect(page.getByText("Escolha outro dia.")).toBeVisible();
    await expect(page.getByText("Escolha outro horário ou outra unidade.")).toBeVisible();
    await expect(page.getByText("Escolha outro profissional ou outro horário.").first()).toBeVisible();

    // Feriado nomeado, e janela distinguida de período.
    await expect(
      page.getByText("Revolução Constitucionalista — a clínica não abre"),
    ).toBeVisible();
    await expect(page.getByText("Janela").first()).toBeVisible();
    await expect(page.getByText("Período").first()).toBeVisible();
  });

  test("o serviço não cobrável declara que dispensa o check-in", async ({ page }) => {
    await page.goto(urlFor("structure.not-chargeable-skips-checkin"));

    await expect(page.getByText("Não cobrável")).toBeVisible();
    await expect(
      page.getByText(/dispensa o check-in do paciente — a guarda de início do atendimento não se aplica/),
    ).toBeVisible();
  });

  test("a unidade sem estrutura explica o que falta para abrir horário", async ({ page }) => {
    await page.goto(urlFor("structure.empty"));

    await expect(
      page.getByRole("heading", { name: "Unidade sem estrutura cadastrada" }),
    ).toBeVisible();
    await expect(page.getByText(/Sala e serviço são o que a agenda precisa/)).toBeVisible();
  });
});

test.describe("superfícies", () => {
  const portais = [
    ["public.kiosk-identification", "totem"],
    ["public.nps-form", "pesquisa"],
    ["guardian.home", "portal da família"],
    ["insurer.attendance", "portal da operadora"],
  ] as const;

  for (const [scenarioId, nome] of portais) {
    test(`o ${nome} não mostra a navegação do backoffice`, async ({ page }) => {
      await page.goto(urlFor(scenarioId));

      // O erro contrário é silencioso e embaraçoso: uma família no totem vendo
      // "Agenda · Pacientes · Autorizações" no canto da tela.
      await expect(page.getByLabel("Navegação principal")).toHaveCount(0);
      await expect(page.locator("#conteudo")).toBeVisible();
    });
  }

  test("as telas do backoffice mostram a navegação", async ({ page }) => {
    await page.goto(urlFor("agenda.day"));
    await expect(page.getByLabel("Navegação principal")).toBeVisible();
  });

  test("o menu do backoffice cobre os módulos com tela de lista", async ({ page }) => {
    await page.goto(urlFor("in-clinic.morning"));

    const nav = page.getByLabel("Navegação principal");
    for (const item of ["Agenda", "Na Clínica", "Pacientes", "Equipe", "Estrutura"]) {
      await expect(nav.getByRole("link", { name: item })).toBeVisible();
    }
  });
});

test.describe("Prontuário", () => {
  test("documento que ninguém abre continua listado", async ({ page }) => {
    await page.goto(urlFor("record.complete"));

    // O registro fica; o conteúdo é que não abre. Esconder faria a recepção
    // pedir de novo o que a família já entregou.
    await expect(page.getByText("Documento de identidade do responsável")).toBeVisible();
    await expect(page.locator("#abrir-doc-3-motivo")).toHaveText(/em nenhum perfil/);
    await expect(page.locator("#abrir-doc-2-motivo")).toHaveText(/em nenhum perfil/);

    // Clínico abre para a coordenação.
    await expect(page.getByRole("button", { name: "Abrir documento" }).first()).toBeEnabled();
  });

  test("a negativa distingue nenhum-perfil de seu-perfil", async ({ page }) => {
    await page.goto(urlFor("record.document-not-openable"));

    await expect(page.locator("#abrir-doc-3-motivo")).toHaveText(/em nenhum perfil/);
    // A terapeuta abre clínico, então o motivo do clínico não aparece para ela.
    await expect(page.locator("#abrir-doc-1-motivo")).toHaveCount(0);
  });

  test("o vencimento é acionável antes de parar o atendimento", async ({ page }) => {
    await page.goto(urlFor("record.documents-expiring"));

    await expect(page.getByRole("heading", { name: /documentos exigem atenção/ })).toBeVisible();
    await expect(page.getByText("Vence em 13 dias")).toBeVisible();
    await expect(page.getByText("Vence em 6 dias")).toBeVisible();
    await expect(page.getByText("Vencido há 59 dias")).toBeVisible();
    // O prazo de aviso configurado fica visível junto da validade.
    await expect(page.getByText(/avisa 60 dias antes/)).toBeVisible();
  });

  test("a anamnese mostra o comportamento atual ao lado do proposto", async ({ page }) => {
    await page.goto(urlFor("record.anamnese-incomplete"));

    await expect(page.getByText(/Não foi respondido: chupa o dedo, uso de telas/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Finalizar anamnese" })).toBeDisabled();

    // O contraste: sem ele, a regra seria lida como descrição do que já existe.
    await expect(
      page.getByRole("heading", { name: "O sistema atual se comporta diferente aqui" }),
    ).toBeVisible();
    await expect(page.getByText(/devolve sucesso e a anamnese continua pendente/)).toBeVisible();
  });

  test("os alertas de falta citam o número e o limite do paciente", async ({ page }) => {
    await page.goto(urlFor("record.absence-alerts"));

    await expect(page.getByText("4 faltas seguidas, e o limite deste paciente é 3.")).toBeVisible();
    await expect(page.getByText("7 faltas no período, e o limite deste paciente é 6.")).toBeVisible();
    await expect(page.getByText(/9 sessões realizadas, abaixo das 12/)).toBeVisible();
  });

  test("sem critérios, a tela diz que não há padrão da clínica", async ({ page }) => {
    await page.goto(urlFor("record.no-criteria"));

    await expect(page.getByText(/não existe padrão/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Critérios de falta/ })).toHaveCount(0);
  });

  test("a recepção não alcança a visão clínica", async ({ page }) => {
    await page.goto(urlFor("record.no-access"));

    await expect(
      page.getByRole("heading", { name: "Você não tem acesso ao prontuário" }),
    ).toBeVisible();
  });
});

test.describe("Gerência", () => {
  test("cada frente diz de quem é", async ({ page }) => {
    await page.goto(urlFor("management.monday"));

    // Nove listas numa tela viram ruído se não estiver dito de quem é cada uma.
    await expect(page.getByText("Relatórios atrasados")).toBeVisible();
    await expect(page.getByText("Coordenação, com quem escreve")).toBeVisible();
    await expect(page.getByText("Cadastros de profissional incompletos").first()).toBeVisible();
    // "People" aparece como dono da frente e como responsável da seção: as duas
    // são a mesma afirmação, dita onde cada uma é útil.
    await expect(page.getByText("People", { exact: true })).toBeVisible();
  });

  test("o mais antigo não é o mais urgente, e a tela diz por quê", async ({ page }) => {
    await page.goto(urlFor("management.reports-by-consequence"));

    // O da operadora (9 dias) vem antes do da família (14 dias).
    const primeiro = page.getByRole("listitem").filter({ hasText: "Atrasado 9 dias" });
    await expect(primeiro).toBeVisible();
    await expect(page.getByText(/segura a próxima autorização e o faturamento/)).toBeVisible();
    await expect(page.getByText(/faz uma família procurar outra clínica/)).toBeVisible();
  });

  test("quem pediu aparece em cada relatório", async ({ page }) => {
    await page.goto(urlFor("management.reports-by-consequence"));

    await expect(page.getByText("Pedido por: Operadora").first()).toBeVisible();
    await expect(page.getByText("Pedido por: Família").first()).toBeVisible();
  });

  test("só a lacuna que trava sessão é alarmada", async ({ page }) => {
    await page.goto(urlFor("management.mentorship-gap"));

    await expect(page.getByText("Trava fechamento de sessão")).toHaveCount(1);
    await expect(page.getByText(/não terão quem as assine/)).toBeVisible();
    await expect(page.getByText(/Não é um problema por si/)).toBeVisible();
  });

  test("o paciente sem responsável é enquadrado como deriva, não como bloqueio", async ({ page }) => {
    await page.goto(urlFor("management.monday"));

    await expect(
      page.getByRole("heading", { name: "O atendimento continua sem ninguém respondendo pelo caso" }),
    ).toBeVisible();
    await expect(page.getByText(/há 46 dias/)).toBeVisible();
  });

  test("sem pendência, o vazio é uma frase e não quatro zeros", async ({ page }) => {
    await page.goto(urlFor("management.clear"));

    await expect(
      page.getByRole("heading", { name: "Nenhuma pendência nas frentes acompanhadas" }),
    ).toBeVisible();
    await expect(page.getByText(/dá para fechar esta tela/)).toBeVisible();
  });

  test("quem atende não alcança a gerência", async ({ page }) => {
    await page.goto(urlFor("management.no-access"));

    await expect(
      page.getByRole("heading", { name: "Você não tem acesso à gerência" }),
    ).toBeVisible();
  });
});

test.describe("Mapa de horas", () => {
  test("o resumo vem antes da grade, com as duas perdas separadas", async ({ page }) => {
    await page.goto(urlFor("hour-map.with-conflicts"));

    await expect(
      page.getByRole("heading", { name: "3 de 6 horários vão nascer incompletos" }),
    ).toBeVisible();
    await expect(page.getByText(/2 sem profissional definido — resolver é da coordenação/)).toBeVisible();
    await expect(page.getByText(/2 sem sala definida — resolver é da administração/)).toBeVisible();

    // Aplicar continua disponível: a decisão é informada, não bloqueada.
    await expect(page.getByRole("button", { name: "Aplicar o mapa" })).toBeEnabled();
  });

  test("sem agenda é cadastro faltando, e o dono é outro", async ({ page }) => {
    await page.goto(urlFor("hour-map.no-agenda-is-not-a-clash"));

    await expect(
      page.getByText(/é cadastro faltando, não horário ocupado/),
    ).toBeVisible();
    await expect(page.getByText(/Resolver: People, que define agenda padrão/)).toBeVisible();
  });

  test("o horário que perde os dois diz que vira agendamento assim mesmo", async ({ page }) => {
    await page.goto(urlFor("hour-map.loses-both"));

    await expect(
      page.getByText("Este horário perdeu profissional e sala, e mesmo assim vai virar agendamento."),
    ).toBeVisible();
    await expect(page.getByText(/Resolver: Coordenação\./).first()).toBeVisible();
    await expect(page.getByText(/Resolver: Administração da unidade\./).first()).toBeVisible();
  });

  test("as horas por semana contam o desenho, não o que sobrou", async ({ page }) => {
    await page.goto(urlFor("hour-map.with-conflicts"));

    await expect(page.getByText(/7 horas por semana/)).toBeVisible();
    await expect(page.getByText(/não muda porque uma sala estava ocupada/)).toBeVisible();
  });

  test("o mapa limpo não alarma nada", async ({ page }) => {
    await page.goto(urlFor("hour-map.clean"));

    await expect(page.getByText(/vão nascer incompletos/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Aplicar o mapa" })).toBeEnabled();
  });

  test("o mapa aplicado não é redesenhado", async ({ page }) => {
    await page.goto(urlFor("hour-map.applied"));

    await expect(page.getByRole("button", { name: "Editar o desenho" })).toBeDisabled();
    await expect(page.locator("#editar-motivo")).toHaveText(/já viraram atendimento/);
    await expect(page.locator("#aplicar-motivo")).toHaveText(/já foi aplicado/);

    // O aviso muda de tempo verbal: agora é fato, não risco.
    await expect(
      page.getByRole("heading", { name: "3 de 6 horários nasceram incompletos" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Avisos gerados na aplicação" })).toBeVisible();
  });

  test("o mapa em branco explica o que é um mapa de horas", async ({ page }) => {
    await page.goto(urlFor("hour-map.empty"));

    await expect(page.getByRole("heading", { name: "Nenhum horário desenhado" })).toBeVisible();
    await expect(page.getByText(/dia, horário, especialidade/)).toBeVisible();
  });
});

test.describe("Chat do caso", () => {
  test("cada mensagem mostra o papel de quem escreveu", async ({ page }) => {
    await page.goto(urlFor("chat.week"));

    // A mesma frase pesa diferente vinda de quem supervisiona e de quem aplica.
    await expect(page.getByText("Aplicador").first()).toBeVisible();
    await expect(page.getByText("Supervisor").first()).toBeVisible();
    await expect(page.getByText("4 especialidades participando")).toBeVisible();
  });

  test("a conversa é lida de cima para baixo", async ({ page }) => {
    await page.goto(urlFor("chat.week"));

    // A trilha de navegação também é uma lista: escopo na conversa.
    const conversa = page.getByRole("list").filter({ hasText: "cobriu os ouvidos" });
    const primeira = conversa.getByRole("listitem").first();
    await expect(primeira).toContainText("Otávio Ferrandini");
    await expect(primeira).toContainText("cobriu os ouvidos");
  });

  test("o aviso de permanência fica ao lado do campo, antes do envio", async ({ page }) => {
    await page.goto(urlFor("chat.permanence-before-sending"));

    const campo = page.getByLabel("Nova mensagem");
    await expect(campo).toBeVisible();
    await expect(page.locator("#mensagem-permanencia")).toHaveText(
      /não pode ser editado nem apagado.*consultá-lo meses depois/,
    );
    // Não é confirmação: é informação antes da ação.
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("a menção que não vai chegar é avisada ao digitar", async ({ page }) => {
    await page.goto(urlFor("chat.mention-without-access"));

    await page.getByLabel("Nova mensagem").fill("@helena consegue reservar a sala?");
    await expect(page.getByRole("heading", { name: "Menção que não vai chegar" })).toBeVisible();
    await expect(page.getByText(/o perfil dessa pessoa não alcança o chat do caso/)).toBeVisible();
    await expect(page.getByText(/A notificação sai e a tela não abre/)).toBeVisible();
  });

  test("menção a quem não existe tem motivo diferente", async ({ page }) => {
    await page.goto(urlFor("chat.mention-without-access"));

    await page.getByLabel("Nova mensagem").fill("@fulano dá uma olhada");
    await expect(page.getByText(/não existe um usuário com esse nome/)).toBeVisible();
  });

  test("menção válida não gera aviso", async ({ page }) => {
    await page.goto(urlFor("chat.mention-without-access"));

    await page.getByLabel("Nova mensagem").fill("@otavio consegue observar isso amanhã?");
    await expect(page.getByRole("heading", { name: "Menção que não vai chegar" })).toHaveCount(0);
  });

  test("o aplicador vê que este é o canal escrito dele", async ({ page }) => {
    await page.goto(urlFor("chat.applicators-only-channel"));

    await expect(
      page.getByRole("heading", { name: "Este é o seu canal escrito deste caso" }),
    ).toBeVisible();
    await expect(page.getByText(/antecipar a mudança de conduta/)).toBeVisible();
    // Ele escreve normalmente.
    await expect(page.getByLabel("Nova mensagem")).toBeEnabled();
  });

  test("o chat vazio explica para que serve", async ({ page }) => {
    await page.goto(urlFor("chat.empty"));

    await expect(page.getByText(/registra o que observa e combina conduta/)).toBeVisible();
  });
});

test.describe("Visitas", () => {
  test("as perdas aparecem pelo passo em que aconteceram", async ({ page }) => {
    await page.goto(urlFor("prospects.funnel"));

    await expect(page.getByRole("heading", { name: "Onde o funil perde gente" })).toBeVisible();
    await expect(page.getByText("em Em avaliação")).toBeVisible();
    await expect(page.getByText("em Proposta enviada")).toBeVisible();
    await expect(page.getByText(/funil de oito estágios em linha esconde/)).toBeVisible();
  });

  test("os perdidos continuam registrados, com o motivo", async ({ page }) => {
    await page.goto(urlFor("prospects.funnel"));

    await expect(page.getByRole("heading", { name: "Perdidos" })).toBeVisible();
    await expect(page.getByText("Família optou por clínica mais perto de casa.")).toBeVisible();
    await expect(page.getByText("Convênio não cobria a frequência proposta.")).toBeVisible();
  });

  test("o tempo parado vem junto do passo", async ({ page }) => {
    await page.goto(urlFor("prospects.stalled"));

    await expect(
      page.getByRole("heading", { name: "1 contato parado há mais de 30 dias" }),
    ).toBeVisible();
    await expect(page.getByText("há 71 dias neste passo")).toBeVisible();
    await expect(page.getByText(/idêntico a quem chegou ontem/)).toBeVisible();
  });

  test("a conversão lista os cinco campos antes de tentar", async ({ page }) => {
    await page.goto(urlFor("prospects.conversion-needs-more"));

    await expect(
      page.getByRole("heading", { name: "A conversão pede o que a visita não coleta" }),
    ).toBeVisible();
    // Aparece na lista do aviso e no motivo do botão: são as duas leituras que
    // a regra pede — a antecipada e a do bloqueio.
    await expect(page.getByText("estado civil do responsável")).toHaveCount(2);
    await expect(page.getByText(/Vale coletar na visita/)).toBeVisible();

    await expect(page.getByRole("button", { name: "Converter em paciente" })).toBeDisabled();
    await expect(page.locator("#converter-pr-4-motivo")).toHaveText(
      /5 informações que a visita não coleta/,
    );
  });

  test("sem janela declarada, marcar a primeira sessão trava", async ({ page }) => {
    await page.goto(urlFor("prospects.no-availability"));

    await expect(page.getByText("Nenhuma janela de disponibilidade declarada.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Marcar primeira sessão" })).toBeDisabled();
    await expect(page.locator("#agendar-pr-1-motivo")).toHaveText(
      /mais barata de coletar na visita e a mais cara de perseguir depois/,
    );
  });

  test("a tela vazia explica o que entra nela", async ({ page }) => {
    await page.goto(urlFor("prospects.empty"));

    await expect(page.getByRole("heading", { name: "Nenhuma visita registrada" })).toBeVisible();
    await expect(page.getByText(/ainda não viraram paciente/)).toBeVisible();
  });
});

test.describe("Relatórios", () => {
  test("cada tipo diz para onde o documento vai", async ({ page }) => {
    await page.goto(urlFor("reports.list"));

    // O destinatário não está no schema — é o que decide o cuidado com o
    // conteúdo, e sem ele o handoff produz sete telas iguais.
    await expect(page.getByText(/empregador de quem trouxe a criança/).first()).toBeVisible();
    await expect(page.getByText(/a operadora, junto da autorização/)).toBeVisible();
    await expect(page.getByText("Sem conteúdo clínico").first()).toBeVisible();
    await expect(page.getByText("Leva conteúdo clínico").first()).toBeVisible();
  });

  test("a declaração incompleta não gera PDF", async ({ page }) => {
    await page.goto(urlFor("reports.declaration-incomplete"));

    await expect(page.getByRole("heading", { name: "Declaração incompleta" })).toBeVisible();
    await expect(page.getByText(/horário de saída, nome do responsável/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Gerar PDF" })).toBeDisabled();
    await expect(page.locator("#pdf-rel-2-motivo")).toHaveText(
      /esteve na clínica naquele horário/,
    );
  });

  test("conteúdo clínico numa declaração é avisado antes de gerar", async ({ page }) => {
    await page.goto(urlFor("reports.declaration-with-clinical"));

    await expect(
      page.getByRole("heading", { name: "Conteúdo clínico numa declaração de comparecimento" }),
    ).toBeVisible();
    await expect(page.getByText(/único tipo que sai do circuito da saúde/)).toBeVisible();
    // A escolha continua de quem emite: informada, não bloqueada.
    await expect(page.getByRole("button", { name: "Gerar PDF" })).toBeEnabled();
  });

  test("o descompasso de permissão é declarado, não corrigido", async ({ page }) => {
    await page.goto(urlFor("reports.issuing-without-reading"));

    await expect(
      page.getByRole("heading", { name: "A permissão de emitir não verifica a de ler" }),
    ).toBeVisible();
    await expect(page.getByText(/não alcança a visão clínica do paciente/).first()).toBeVisible();
    await expect(page.getByText(/tomada de propósito, em vez de herdada/)).toBeVisible();
  });

  test("relatório com PDF gerado não é editado", async ({ page }) => {
    await page.goto(urlFor("reports.generated"));

    await expect(page.getByRole("button", { name: "Editar" })).toBeDisabled();
    await expect(page.locator("#editar-rel-4-motivo")).toHaveText(
      /papel que está na mão de alguém/,
    );
    // O conteúdo continua legível.
    await expect(page.getByText(/Evolução consistente em imitação motora/)).toBeVisible();
  });

  test("sem relatório, a tela nomeia os tipos possíveis", async ({ page }) => {
    await page.goto(urlFor("reports.empty"));

    await expect(page.getByText(/declaração de comparecimento, relatório evolutivo/)).toBeVisible();
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

test.describe("notificações", () => {
  test("a lista diz quantas estão não lidas e que a marca é de quem lê", async ({ page }) => {
    await page.goto(urlFor("notifications.unread-list"));

    await expect(page.getByText("3 não lidas")).toBeVisible();
    await expect(page.getByText("4 no total")).toBeVisible();
    // Lido mora no vínculo, não na notificação. Sem essa frase, o contador se
    // lê como estado do sistema, e não da pessoa.
    await expect(
      page.getByText(/continua não lida para as outras pessoas que a receberam/),
    ).toBeVisible();
  });

  test("não lida tem rótulo textual, e não só cor de fundo", async ({ page }) => {
    await page.goto(urlFor("notifications.unread-list"));

    await expect(page.getByText("Não lida", { exact: true })).toHaveCount(3);
    await expect(page.getByText("Lida", { exact: true })).toHaveCount(1);
  });

  test("a data de recebimento fica junto do texto, porque o texto é cópia congelada", async ({
    page,
  }) => {
    await page.goto(urlFor("notifications.unread-list"));

    await expect(page.getByText(/Recebida em/).first()).toBeVisible();
    await expect(page.getByText(/lida por você em/)).toBeVisible();
  });

  test("o destino vazio é distinguido da ausência de destino", async ({ page }) => {
    await page.goto(urlFor("notifications.leads-nowhere"));

    // Três dos quatro remetentes gravam `""`. Em Elixir a string vazia é
    // truthy: renderizada sem cuidado, vira um link clicável para lugar nenhum.
    const abrir = page.getByRole("button", { name: "Abrir" }).first();
    await expect(abrir).toBeVisible();
    await expect(abrir).toBeDisabled();
    await expect(page.getByText(/foi gravado como texto vazio, e não como ausência/).first()).toBeVisible();
  });

  test("a notificação de transferência é apontada como não identificada", async ({ page }) => {
    await page.goto(urlFor("notifications.leads-nowhere"));

    await expect(page.getByText("Esta notificação não diz sobre o que é")).toBeVisible();
    await expect(
      page.getByText(/comunica a perda de algo, e a menos identificada/),
    ).toBeVisible();
  });

  test("a menção chega para quem não abre a tela de destino", async ({ page }) => {
    await page.goto(urlFor("notifications.target-does-not-open"));

    // Notificar não é dar acesso — é o mesmo aviso que o chat dá antes do
    // envio, visto agora do lado de quem recebeu.
    const abrir = page.getByRole("button", { name: "Abrir" });
    await expect(abrir).toBeDisabled();
    // A frase diz o que a tela de destino é, e não o nome da permissão: o
    // identificador vive na regra e no cenário, onde quem implementa o lê.
    await expect(page.getByText(/ela é o cadastro do paciente, que o seu perfil não edita/)).toBeVisible();
  });

  test("o texto que nomeia o paciente é apontado na própria notificação", async ({ page }) => {
    await page.goto(urlFor("notifications.clinical-text-without-check"));

    await expect(page.getByText(/nomeia Théo Andrade Lins e a especialidade/)).toBeVisible();
    await expect(page.getByText(/o sino entrega direto/).first()).toBeVisible();
  });

  test("com tudo lido, marcar todas fica visível e desabilitada, com o motivo", async ({ page }) => {
    await page.goto(urlFor("notifications.all-read"));

    await expect(page.getByText("Tudo lido")).toBeVisible();
    const marcar = page.getByRole("button", { name: "Marcar todas como lidas" });
    await expect(marcar).toBeVisible();
    await expect(marcar).toBeDisabled();
  });

  test("o vazio explica o alcance do recurso", async ({ page }) => {
    await page.goto(urlFor("notifications.empty"));

    await expect(page.getByText("Nenhuma notificação")).toBeVisible();
    await expect(page.getByText(/o resto do produto ainda não avisa nada/)).toBeVisible();
  });
});

test.describe("supervisão", () => {
  test("o período padrão diz que está olhando só para trás", async ({ page }) => {
    await page.goto(urlFor("supervision.default-period"));

    await expect(page.getByText(/Este período olha só para trás/)).toBeVisible();
    // A frase sobre o padrão importa mais que as datas: ela diz que a janela
    // não foi escolhida por quem abriu.
    await expect(page.getByText(/É o padrão do sistema: 30 dias para trás/)).toBeVisible();
  });

  test("o que está parado esperando o supervisor vem antes da lista", async ({ page }) => {
    await page.goto(urlFor("supervision.awaiting-signature"));

    await expect(
      page.getByText("3 atendimentos parados esperando a assinatura do supervisor"),
    ).toBeVisible();
    await expect(page.getByText(/único efeito mecânico do vínculo/)).toBeVisible();
  });

  test("o estado da supervisão tem rótulo textual em cada linha", async ({ page }) => {
    await page.goto(urlFor("supervision.awaiting-signature"));

    await expect(page.getByText("Aguardando a assinatura do supervisor")).toHaveCount(3);
    await expect(page.getByText("Aguardando quem atendeu assinar")).toHaveCount(1);
    await expect(page.getByText("Assinado pelos dois")).toHaveCount(1);
  });

  test("os parados mostram há quantos dias estão parados", async ({ page }) => {
    await page.goto(urlFor("supervision.awaiting-signature"));

    // 13/07 contra a referência de 30/07.
    await expect(page.getByText("há 17 dias")).toBeVisible();
  });

  test("quem espera quem atendeu é separado, porque a cobrança tem outro destinatário", async ({
    page,
  }) => {
    await page.goto(urlFor("supervision.awaiting-signature"));

    await expect(page.getByText("1 espera quem atendeu assinar")).toBeVisible();
    await expect(page.getByText(/a assinatura do supervisor nem foi pedida ainda/)).toBeVisible();
  });

  test("o supervisor não abre a tela que leva o nome dele, e é mandado para onde funciona", async ({
    page,
  }) => {
    await page.goto(urlFor("supervision.not-for-the-supervisor"));

    await expect(page.getByText("Esta tela é da coordenação")).toBeVisible();
    await expect(page.getByText(/pelo atendimento, onde a sua assinatura é pedida/)).toBeVisible();
  });

  test("o menu esconde Supervisão de quem supervisiona", async ({ page }) => {
    await page.goto(urlFor("supervision.not-for-the-supervisor"));

    // `list_supervisor` é de admin, clinic_admin e coordinator. O item some
    // para o supervisor — o que é coerente, e é a coerência que vale fixar.
    const nav = page.getByLabel("Navegação principal");
    await expect(nav.getByRole("link", { name: "Supervisão" })).toHaveCount(0);
  });

  test("a coordenação alcança Supervisão pelo menu", async ({ page }) => {
    await page.goto(urlFor("supervision.default-period"));

    const nav = page.getByLabel("Navegação principal");
    await expect(nav.getByRole("link", { name: "Supervisão" })).toBeVisible();
  });

  test("a supervisora sem vínculo é nomeada, com o motivo de ter sumido", async ({ page }) => {
    await page.goto(urlFor("supervision.supervisor-without-links"));

    await expect(page.getByText("Quem não aparece nesta lista")).toBeVisible();
    await expect(page.getByText(/Iara Monteiro Sales/)).toBeVisible();
    await expect(page.getByText(/supervisão é uma relação, não um cargo/)).toBeVisible();
  });

  test("com a janela virada, a tela passa a servir para decidir onde estar", async ({ page }) => {
    await page.goto(urlFor("supervision.forward-period"));

    await expect(page.getByText(/alcança o que ainda vai acontecer/)).toBeVisible();
    await expect(page.getByText("Ainda não atendido")).toHaveCount(2);
    await expect(page.getByText("Não exige segunda assinatura")).toHaveCount(1);
  });

  test("o vazio sugere o próximo passo em vez de encerrar a conversa", async ({ page }) => {
    await page.goto(urlFor("supervision.empty-period"));

    await expect(page.getByText("Nenhum atendimento no período")).toBeVisible();
    await expect(page.getByText(/Ampliar o período ou olhar para a frente/)).toBeVisible();
  });
});

test.describe("mapa da unidade", () => {
  test("o eixo aparece junto da pergunta que ele responde", async ({ page }) => {
    await page.goto(urlFor("unit-map.week"));

    await expect(page.getByText("Onde cabe mais um atendimento na agenda de alguém?")).toBeVisible();
  });

  test("a tela diz o que a ocupação de fato mede", async ({ page }) => {
    await page.goto(urlFor("unit-map.week"));

    // Sem essa frase, alguém decide contratação com ocupação de sala.
    await expect(
      page.getByText(/não para medir aproveitamento de capacidade/).first(),
    ).toBeVisible();
  });

  test("a célula sem agenda tem banda própria, e não o glifo mais apagado", async ({ page }) => {
    await page.goto(urlFor("unit-map.week"));

    // O ponto médio era o glifo mais invisível disponível para o estado que
    // este módulo inteiro existe para separar de "livre". Travessão mais banda.
    // O nome acessível da célula vem do rótulo, e não do glifo — o que já
    // prova as duas metades: quem lê a tela ouve a frase, quem a enxerga vê a
    // banda.
    const marca = page.getByLabel("fora da agenda padrão").first();
    await expect(marca).toHaveText("—");
    const celula = page.getByRole("cell").filter({ has: marca }).first();
    await expect(celula).toHaveCSS("background-color", "rgb(240, 238, 245)");
  });

  test("o eixo em uso é dito em palavra, e não só em cor", async ({ page }) => {
    await page.goto(urlFor("unit-map.week"));

    await expect(page.getByText("Por profissional · em uso")).toBeVisible();
  });

  test("sem agenda definida não vira zero por cento", async ({ page }) => {
    await page.goto(urlFor("unit-map.no-agenda-is-not-zero"));

    await expect(page.getByText("Sem agenda padrão — ocupação não se calcula")).toBeVisible();
    await expect(page.getByText("Sem agenda padrão definida").first()).toBeVisible();
    // O outro zero, que pede a ação oposta.
    await expect(page.getByText("Nenhuma hora ocupada").first()).toBeVisible();
  });

  test("o aviso de agenda faltando nomeia o People, que não abre esta tela", async ({ page }) => {
    await page.goto(urlFor("unit-map.no-agenda-is-not-zero"));

    await expect(page.getByText("Uma linha não tem agenda padrão definida")).toBeVisible();
    await expect(page.getByText(/Definir agenda padrão é do/)).toBeVisible();
  });

  test("a faixa que o mapa perde é dita, com quem está nela", async ({ page }) => {
    await page.goto(urlFor("unit-map.lost-hour"));

    await expect(page.getByText("O mapa vai até as 17h e a unidade fecha às 18:30")).toBeVisible();
    await expect(page.getByText(/2 atendimentos existem nessa faixa/)).toBeVisible();
    await expect(page.getByText(/justamente na faixa mais disputada do dia/)).toBeVisible();
  });

  test("uma hora com três atendimentos mostra três e conta uma", async ({ page }) => {
    await page.goto(urlFor("unit-map.crowded-hour"));

    await expect(page.getByText("3×")).toBeVisible();
    await expect(page.getByText(/14h com mais de um/)).toBeVisible();
    // Quatro dias de oito horas cada mais um de oito: 2 horas tomadas de 40.
    await expect(page.getByText("5% das horas definidas estão ocupadas")).toBeVisible();
  });

  test("no eixo do paciente a granularidade travada é explicada", async ({ page }) => {
    await page.goto(urlFor("unit-map.granularity-locked"));

    await expect(page.getByText("Neste eixo não se escolhe entre semana e dia")).toBeVisible();
    await expect(page.getByText(/um dia isolado não mostra distribuição/)).toBeVisible();
  });

  test("a terapeuta lê o mapa e não mexe nele", async ({ page }) => {
    await page.goto(urlFor("unit-map.granularity-locked"));

    const mexer = page.getByRole("button", { name: "Mexer no mapa" });
    await expect(mexer).toBeVisible();
    await expect(mexer).toBeDisabled();
  });

  test("o People não abre o mapa, e a recusa diz por que isso é estranho", async ({ page }) => {
    await page.goto(urlFor("unit-map.people-cannot-see"));

    await expect(page.getByText("Você não alcança o mapa da unidade")).toBeVisible();
    await expect(page.getByText(/define a agenda padrão dos profissionais/)).toBeVisible();
  });

  test("a grade é uma tabela com cabeçalhos de linha e coluna", async ({ page }) => {
    await page.goto(urlFor("unit-map.crowded-hour"));

    const tabela = page.getByRole("table").first();
    await expect(tabela.getByRole("columnheader", { name: "Dia" })).toBeVisible();
    await expect(tabela.getByRole("columnheader", { name: "14h" })).toBeVisible();
    await expect(tabela.getByRole("rowheader", { name: "Quarta" })).toBeVisible();
  });
});

test.describe("controle de horas", () => {
  test("cada faixa diz quem a registrou", async ({ page }) => {
    await page.goto(urlFor("clinical-hours.week"));

    await expect(page.getByText("Marcado pelo profissional, no app").first()).toBeVisible();
    await expect(page.getByText("Preenchido no escritório").first()).toBeVisible();
    // O caso que mais interessa numa conferência, e que hoje não aparece.
    await expect(page.getByText("Aberto pelo profissional e fechado no escritório")).toBeVisible();
  });

  test("o previsto aparece como é e como está gravado", async ({ page }) => {
    await page.goto(urlFor("clinical-hours.truncation"));

    // Escopado no termo "Previsto": o mesmo 7h30 também aparece como total
    // trabalhado, e a asserção precisa dizer qual dos dois interessa.
    const previsto = page.getByRole("definition").first();
    await expect(previsto).toContainText("7h30");
    await expect(previsto).toContainText("gravado como 7h");
  });

  test("a perda do truncamento é projetada no mês", async ({ page }) => {
    await page.goto(urlFor("clinical-hours.truncation"));

    await expect(page.getByText("30min somem no arredondamento")).toBeVisible();
    await expect(page.getByText("11 horas")).toBeVisible();
    await expect(page.getByText(/arredondamento vai sempre para o mesmo lado/)).toBeVisible();
  });

  test("um dia sem localização diz que não sabe, em vez de parecer verificado", async ({ page }) => {
    await page.goto(urlFor("clinical-hours.unverified"));

    await expect(page.getByText("Nenhuma marca tem localização registrada")).toBeVisible();
    await expect(page.getByText(/GPS desligado, permissão negada ou falha na inserção/)).toBeVisible();
  });

  test("a faixa invertida é apontada e a duração negativa tem sinal", async ({ page }) => {
    await page.goto(urlFor("clinical-hours.reversed"));

    await expect(page.getByText("Saída anterior à entrada")).toBeVisible();
    await expect(page.getByText("das 17:00 às 13:00")).toBeVisible();
    // Sinal e não só cor: quem não distingue vermelho ainda lê o menos.
    await expect(page.getByText("−4h")).toBeVisible();
  });

  test("o total do dia invertido fica menor que a primeira faixa sozinha", async ({ page }) => {
    await page.goto(urlFor("clinical-hours.reversed"));

    await expect(page.getByText(/menor que a primeira faixa sozinha/)).toBeVisible();
  });

  test("a previsão sem fim é apontada, e a jornada aberta separadamente", async ({ page }) => {
    await page.goto(urlFor("clinical-hours.incomplete-expected"));

    await expect(page.getByText("Faixa prevista sem hora de fim")).toBeVisible();
    await expect(page.getByText(/o erro aparece na hora de recalcular/)).toBeVisible();
    // São problemas diferentes e ganham avisos diferentes.
    await expect(page.getByText("Jornada em aberto")).toBeVisible();
  });

  test("quem não corrige vê o botão desabilitado com o motivo", async ({ page }) => {
    await page.goto(urlFor("clinical-hours.no-permission"));

    const corrigir = page.getByRole("button", { name: "Corrigir um registro" });
    await expect(corrigir).toBeVisible();
    await expect(corrigir).toBeDisabled();
  });

  test("o vazio explica de onde vêm os registros", async ({ page }) => {
    await page.goto(urlFor("clinical-hours.empty"));

    await expect(page.getByText("Nenhum registro no período")).toBeVisible();
    await expect(page.getByText(/depois do primeiro check-in/)).toBeVisible();
  });
});

test.describe("marcar atendimento", () => {
  test("os quatro impedimentos aparecem de uma vez, na ordem do código", async ({ page }) => {
    await page.goto(urlFor("agenda.new-four-impediments"));

    await expect(page.getByText("4 impedimentos")).toBeVisible();
    const itens = page.getByRole("listitem");
    // A ordem é informação: é a ordem em que o sistema real os verificaria.
    await expect(itens.filter({ hasText: "Bloqueio na agenda do profissional" })).toHaveCount(1);
    await expect(itens.filter({ hasText: "Sala lotada" })).toHaveCount(1);
  });

  test("a tela diz quantas tentativas de salvar isso seria hoje", async ({ page }) => {
    await page.goto(urlFor("agenda.new-four-impediments"));

    await expect(page.getByText("Hoje isso seriam 4 tentativas de salvar")).toBeVisible();
    await expect(page.getByText(/com a família na frente ou no telefone/)).toBeVisible();
  });

  test("o primeiro impedimento é marcado como o único que o sistema atual mostraria", async ({
    page,
  }) => {
    await page.goto(urlFor("agenda.new-four-impediments"));

    await expect(page.getByText("a única que o sistema atual mostraria")).toBeVisible();
  });

  test("cada impedimento diz de quem é resolver", async ({ page }) => {
    await page.goto(urlFor("agenda.new-four-impediments"));

    await expect(page.getByText(/Resolver: Recepção, trocando de sala/)).toBeVisible();
    await expect(page.getByText(/Resolver: Administração da unidade/)).toBeVisible();
  });

  test("o profissional desativado é encaminhado ao People", async ({ page }) => {
    await page.goto(urlFor("agenda.new-inactive-professional"));

    // A mesma frase aparece na lista e no motivo do botão desabilitado — que é
    // o comportamento certo, e obriga a asserção a dizer qual das duas mede.
    await expect(page.getByText(/está desativado e não pode ser agendado/)).toHaveCount(2);
    await expect(page.getByText(/Resolver: People, que reativa o cadastro/)).toBeVisible();

    const marcar = page.getByRole("button", { name: "Marcar atendimento" });
    await expect(marcar).toBeVisible();
    await expect(marcar).toBeDisabled();
  });

  test("a sala com atendimento mostra ocupação contra capacidade", async ({ page }) => {
    await page.goto(urlFor("agenda.new-room-has-room"));

    await expect(page.getByText("· 2 de 3 lugares ocupados")).toBeVisible();
    await expect(page.getByText(/ainda cabe 1 atendimento/)).toBeVisible();
    await expect(page.getByText(/está usada/)).toBeVisible();
  });

  test("o acompanhamento terapêutico diz que a verificação de sala não rodou", async ({ page }) => {
    await page.goto(urlFor("agenda.new-therapeutic-companion"));

    await expect(page.getByText("A verificação de sala não rodou")).toBeVisible();
    await expect(page.getByText(/não é cadastro incompleto/)).toBeVisible();
    await expect(page.getByText("não se aplica")).toBeVisible();
  });

  test("o sucesso nomeia o que foi conferido, em vez de um ok mudo", async ({ page }) => {
    await page.goto(urlFor("agenda.new-clear"));

    await expect(page.getByText("As sete verificações passaram")).toBeVisible();
    const marcar = page.getByRole("button", { name: "Marcar atendimento" });
    await expect(marcar).toBeEnabled();
  });
});

test.describe("fase terapêutica", () => {
  test("cada especialidade tem o próprio percurso", async ({ page }) => {
    await page.goto(urlFor("patients.phases-uneven"));

    await expect(page.getByRole("heading", { name: "Fonoaudiologia" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Psicologia" })).toBeVisible();
    await expect(page.getByText("etapa 4 de 6")).toBeVisible();
    await expect(page.getByText("etapa 1 de 6")).toBeVisible();
  });

  test("a tela afirma que o percurso não caminhar junto é o normal", async ({ page }) => {
    await page.goto(urlFor("patients.phases-uneven"));

    await expect(page.getByText("O percurso não caminha junto, e não deveria")).toBeVisible();
    await expect(page.getByText(/obrigaria a escolher qual delas mente/)).toBeVisible();
  });

  test("a fase sem especialidade é apontada", async ({ page }) => {
    await page.goto(urlFor("patients.phases-uneven"));

    await expect(page.getByText("Uma fase não tem especialidade")).toBeVisible();
    await expect(page.getByText(/some da leitura/)).toBeVisible();
    // Nome de módulo Elixir entre crases é jargão de código, e os crases
    // apareciam literalmente: JSX não interpreta markdown.
    await expect(page.getByText(/TherapyPhase\.changeset/)).toHaveCount(0);
  });

  test("ambientação é marcada como ambígua", async ({ page }) => {
    await page.goto(urlFor("patients.phases-all-beginning"));

    // Três especialidades no valor padrão, e a ressalva em cada uma.
    await expect(page.getByText(/Ambientação é o valor padrão do campo/)).toHaveCount(3);
  });

  test("sem fase registrada é diferente de estar em ambientação", async ({ page }) => {
    await page.goto(urlFor("patients.phases-empty"));

    await expect(page.getByText("Nenhuma fase registrada")).toBeVisible();
    await expect(page.getByText(/cada uma tem o percurso dela/)).toBeVisible();
  });
});

test.describe("inativar paciente", () => {
  test("o resumo traz os números antes do botão", async ({ page }) => {
    await page.goto(urlFor("patients.deactivation-impact"));

    await expect(page.getByText("O que esta ação vai fazer")).toBeVisible();
    await expect(page.getByText(/5 agendamentos serão cancelados/)).toBeVisible();
    await expect(page.getByText(/2 mapas de horas em vigor serão encerrados/)).toBeVisible();
    await expect(page.getByText(/Nada disso volta ao trocar o status/)).toBeVisible();
  });

  test("o corte real aparece com hora, e pega a véspera", async ({ page }) => {
    await page.goto(urlFor("patients.deactivation-eve"));

    await expect(page.getByText("O corte começa na véspera, às 21h")).toBeVisible();
    await expect(page.getByText(/O corte real é 29\/07 às 21:00/)).toBeVisible();
    await expect(
      page.getByText(/num dia em que o paciente ainda estava ativo/),
    ).toBeVisible();
  });

  test("a data futura mantém o paciente ativo e não adia a destruição", async ({ page }) => {
    await page.goto(urlFor("patients.deactivation-scheduled"));

    await expect(page.getByText("A data é futura, e a destruição não espera por ela")).toBeVisible();
    await expect(page.getByText(/o status espera, a parte irreversível não/)).toBeVisible();
  });

  test("com data de hoje, o aviso de adiamento não aparece", async ({ page }) => {
    await page.goto(urlFor("patients.deactivation-impact"));

    await expect(
      page.getByText("A data é futura, e a destruição não espera por ela"),
    ).toHaveCount(0);
  });
});

test.describe("ação indisponível alcança o teclado", () => {
  test("o botão bloqueado continua na ordem de foco", async ({ page }) => {
    await page.goto(urlFor("agenda.new-inactive-professional"));

    // Com o atributo `disabled` o botão sairia do Tab: quem navega por teclado
    // nunca chegaria nele e nunca ouviria o motivo. É o oposto do que a
    // convenção "manter visível e explicar" se propõe a fazer.
    const marcar = page.getByRole("button", { name: "Marcar atendimento" });
    await marcar.focus();
    await expect(marcar).toBeFocused();
  });

  test("é anunciado como indisponível, e não removido", async ({ page }) => {
    await page.goto(urlFor("agenda.new-inactive-professional"));

    const marcar = page.getByRole("button", { name: "Marcar atendimento" });
    await expect(marcar).toHaveAttribute("aria-disabled", "true");
    // Sem o atributo nativo: é ele que tiraria o botão do Tab.
    await expect(marcar).not.toHaveAttribute("disabled", /.*/);
  });

  test("o motivo é associado ao botão, e não só desenhado ao lado", async ({ page }) => {
    await page.goto(urlFor("agenda.new-inactive-professional"));

    const marcar = page.getByRole("button", { name: "Marcar atendimento" });
    const id = await marcar.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    await expect(page.locator(`#${id}`)).toContainText("está desativado");
  });

  test("o rótulo indisponível tem cor própria, e não opacidade", async ({ page }) => {
    await page.goto(urlFor("agenda.new-inactive-professional"));

    // Opacidade sobre o primário dava 2,35:1. Alcançável pelo Tab, o botão
    // perde a isenção da WCAG 1.4.3 para componentes inativos e precisa passar
    // por mérito — este par mede 5,56:1.
    const estilo = await page
      .getByRole("button", { name: "Marcar atendimento" })
      .evaluate((el) => {
        const cs = getComputedStyle(el);
        return { cor: cs.color, fundo: cs.backgroundColor, opacidade: cs.opacity };
      });

    expect(estilo.opacidade).toBe("1");
    expect(estilo.cor).toBe("rgba(43, 35, 91, 0.72)");
    expect(estilo.fundo).toBe("rgb(244, 246, 247)");
  });
});

test.describe("anel de foco", () => {
  test("o foco por teclado é visível, e não branco sobre branco", async ({ page }) => {
    await page.goto(urlFor("notifications.unread-list"));

    // O anel chegou ao navegador em branco por muito tempo: `:where()` tem
    // especificidade zero e `outline-color` caía em `currentColor`, que num
    // botão de texto branco é branco — sobre um cartão branco.
    // Um Tab antes: no Chromium, `:focus-visible` só vale se a última
    // modalidade de entrada foi o teclado, e `.focus()` sozinho não a define.
    await page.keyboard.press("Tab");
    const botao = page.getByRole("button", { name: "Marcar todas como lidas" });
    await botao.focus();

    // Medido sem espera nenhuma, de propósito: o `transition-colors` do
    // Tailwind v4 inclui `outline-color`, e o anel nascia branco e só chegava
    // ao roxo no fim da transição. Quem tabula rápido nunca via o anel
    // completo — e é quem mais depende dele.
    const anel = await botao.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { estilo: cs.outlineStyle, largura: cs.outlineWidth, cor: cs.outlineColor, offset: cs.outlineOffset };
    });

    expect(anel.estilo).toBe("solid");
    expect(anel.largura).toBe("2px");
    expect(anel.cor).toBe("rgb(97, 68, 197)");
    expect(anel.offset).toBe("2px");
  });

  test("no drawer o anel muda de cor, porque o roxo sumiria no navy", async ({ page }) => {
    await page.goto(urlFor("agenda.day"));

    await page.keyboard.press("Tab");
    const link = page.getByLabel("Navegação principal").getByRole("link", { name: "Pacientes" });
    await link.focus();

    const cor = await link.evaluate((el) => getComputedStyle(el).outlineColor);
    expect(cor).toBe("rgb(88, 186, 218)");
  });
});

test.describe("plurais", () => {
  test("um registro é “1 dia”, e não “1 dias”", async ({ page }) => {
    await page.goto(urlFor("clinical-hours.truncation"));

    // Erro pequeno, efeito grande: uma especificação que erra a concordância
    // perde a autoridade para exigir precisão de quem a implementa.
    await expect(page.getByText("1 dia", { exact: true })).toBeVisible();
    await expect(page.getByText("1 dias")).toHaveCount(0);
  });
});

test.describe("supervisão e inativação, revisão visual", () => {
  test("o supervisor em exibição diz que está, e não só muda de cor", async ({ page }) => {
    await page.goto(urlFor("supervision.awaiting-signature"));

    await expect(page.getByText("· em exibição ao lado")).toBeVisible();
  });

  test("o aviso dentro do cartão fica um nível abaixo do título dele", async ({ page }) => {
    await page.goto(urlFor("supervision.awaiting-signature"));

    // Como conteúdo do cartão, o aviso não é irmão do título do cartão. Não é
    // salto de nível — nenhuma regra automática pega —, é hierarquia errada.
    await expect(
      page.getByRole("heading", { level: 3, name: /atendimentos parados esperando/ }),
    ).toBeVisible();
  });

  test("inativar usa a variante de perigo, e não a de ação afirmativa", async ({ page }) => {
    await page.goto(urlFor("patients.deactivation-impact"));

    const botao = page.getByRole("button", { name: /^Inativar / });
    await expect(botao).toHaveCSS("color", "rgb(144, 42, 42)");
  });
});

test.describe("cancelar atendimento", () => {
  test("o botão que executa o cancelamento também é de perigo", async ({ page }) => {
    await page.goto(urlFor("agenda.cancel-requires-reason"));

    // Quem chega aqui já clicou num botão de perigo, e é este que executa.
    // Vestir o passo irreversível com a cor da ação afirmativa inverte a
    // leitura justo onde ela mais custa.
    await page.getByRole("button", { name: "Cancelar atendimento" }).click();
    const confirmar = page.getByRole("button", { name: "Confirmar cancelamento" });

    // Ele nasce indisponível por falta de justificativa, e o estilo de
    // indisponível vence a variante — que é o comportamento certo. A cor de
    // perigo só se verifica depois que a ação passa a ser possível.
    await expect(confirmar).toHaveCSS("color", "rgba(43, 35, 91, 0.72)");
    await page.getByLabel("Justificativa do cancelamento").fill("Paciente remarcou.");
    await expect(confirmar).toHaveCSS("color", "rgb(144, 42, 42)");
  });
});

test.describe("paginação do controle de horas", () => {
  test("o aviso diz quantas páginas e o que elas escondem", async ({ page }) => {
    await page.goto(urlFor("clinical-hours.month-does-not-fit"));

    await expect(page.getByText("O mês não cabe numa página")).toBeVisible();
    await expect(page.getByText(/22 dias no período/)).toBeVisible();
    await expect(page.getByText(/só aparece somado/)).toBeVisible();
  });

  test("sem paginação relevante o aviso não aparece", async ({ page }) => {
    await page.goto(urlFor("clinical-hours.week"));

    // O contraponto: um aviso que aparece sempre é um aviso que ninguém lê.
    await expect(page.getByText("O mês não cabe numa página")).toHaveCount(0);
  });
});

test.describe("pendências de cadastro", () => {
  test("a lista abre pela lacuna clínica, e não por nome", async ({ page }) => {
    await page.goto(urlFor("patients.gaps-by-consequence"));

    const primeiro = page.getByRole("article").first();
    await expect(primeiro).toContainText("Nina Corrêa Bastos");
    await expect(primeiro).toContainText("Sem nível de suporte");
  });

  test("cada lacuna diz o efeito e de quem é resolver", async ({ page }) => {
    await page.goto(urlFor("patients.gaps-by-consequence"));

    await expect(page.getByText(/dimensiona a intensidade da intervenção/).first()).toBeVisible();
    await expect(page.getByText(/Resolve: Especialista, na avaliação/).first()).toBeVisible();
    await expect(page.getByText(/não aparece no mapa de nenhuma unidade/)).toBeVisible();
  });

  test("o tempo em atendimento aparece junto da lacuna", async ({ page }) => {
    await page.goto(urlFor("patients.gaps-by-consequence"));

    // Duas semanas é tarefa; dez meses é processo que não fecha.
    await expect(page.getByText("há 10 meses em atendimento")).toBeVisible();
    await expect(page.getByText("há 15 dias em atendimento")).toBeVisible();
  });

  test("a tela diz que nada disso bloqueia atendimento, e por que isso é caro", async ({ page }) => {
    await page.goto(urlFor("patients.gaps-block-nothing"));

    await expect(page.getByText("Nenhuma destas ausências impede atendimento")).toBeVisible();
    await expect(page.getByText(/um bloqueio se resolve porque incomoda hoje/)).toBeVisible();
  });

  test("o total ganha proporção sobre os ativos", async ({ page }) => {
    await page.goto(urlFor("patients.gaps-block-nothing"));

    await expect(page.getByText("6 pacientes com pendência")).toBeVisible();
    await expect(page.getByText("13% dos 48 ativos")).toBeVisible();
  });

  test("a tela aponta que a consulta já existe no sistema", async ({ page }) => {
    await page.goto(urlFor("patients.gaps-by-consequence"));

    await expect(page.getByText(/uma consulta que só existe como parâmetro de endereço/)).toBeVisible();
  });

  test("o vazio não vira elogio", async ({ page }) => {
    await page.goto(urlFor("patients.gaps-none"));

    await expect(page.getByText("Nenhuma pendência de cadastro")).toBeVisible();
    await expect(page.getByText(/vale conferir mesmo quando ninguém reclamou/)).toBeVisible();
  });
});

test.describe("vencimento do mapa de horas", () => {
  test("o aviso de interrupção vem antes da grade e diz a consequência clínica", async ({ page }) => {
    await page.goto(urlFor("hour-map.expiring-without-successor"));

    await expect(
      page.getByRole("heading", { name: "A semana do paciente deixa de existir" }),
    ).toBeVisible();
    // O corpo traz o prazo e a razão, sem repetir o título.
    await expect(page.getByText(/Programa em aquisição interrompido regride/)).toBeVisible();
    await expect(page.getByText(/Termina em 5 dias/)).toBeVisible();
  });

  test("com sucessor, a tela diz que a semana continua em vez de calar", async ({ page }) => {
    await page.goto(urlFor("hour-map.expiring-with-successor"));

    // Ausência de aviso não distingue "está resolvido" de "ninguém olhou".
    await expect(page.getByText("Vencimento do mapa")).toBeVisible();
    await expect(page.getByText(/já existe outro começando depois. A semana continua/)).toBeVisible();
  });

  test("um mapa que renova sozinho não recebe aviso nenhum", async ({ page }) => {
    await page.goto(urlFor("hour-map.applied"));

    await expect(page.getByText("A semana do paciente deixa de existir")).toHaveCount(0);
    await expect(page.getByText("Vencimento do mapa")).toHaveCount(0);
  });
});

test.describe("ausência e cancelamento", () => {
  test("a tela separa as duas contagens e diz o que o sistema responderia", async ({ page }) => {
    await page.goto(urlFor("agenda.absence-and-cancellation"));

    await expect(page.getByText("Ausência e cancelamento não são a mesma coisa")).toBeVisible();
    await expect(page.getByText(/1 ausência e 2 cancelamentos/)).toBeVisible();
    await expect(page.getByText(/soma os dois e responde 3/)).toBeVisible();
  });

  test("diz a proporção que era aviso prévio, porque é ela que muda a conversa", async ({ page }) => {
    await page.goto(urlFor("agenda.absence-and-cancellation"));

    await expect(page.getByText(/67% desse número é família que avisou antes/)).toBeVisible();
    await expect(page.getByText(/Cancelar é comunicar; faltar é não comunicar/)).toBeVisible();
  });

  test("com só um dos dois, o recorte não aparece", async ({ page }) => {
    await page.goto(urlFor("agenda.no-show"));

    // Sem os dois não há o que separar, e o aviso viraria ruído.
    await expect(page.getByText("Ausência e cancelamento não são a mesma coisa")).toHaveCount(0);
  });
});

test.describe("atendimentos em atraso", () => {
  test("a tela diz qual das duas definições está aplicando", async ({ page }) => {
    await page.goto(urlFor("agenda.overdue-as-coordinator"));

    await expect(page.getByText("Definição da coordenação")).toBeVisible();
    await expect(page.getByText(/atrasado assim que passa do horário/)).toBeVisible();
    await expect(page.getByText(/o que não se defende é não dizer qual está em vigor/)).toBeVisible();
  });

  test("a faixa de divergência é apontada, com as horas", async ({ page }) => {
    await page.goto(urlFor("agenda.overdue-as-coordinator"));

    await expect(page.getByText(/aparecem numa lista e não na outra/)).toBeVisible();
    await expect(page.getByText(/dentro da folga de 48/).first()).toBeVisible();
  });

  test("a etapa do supervisor é nomeada como ponto cego das duas listas", async ({ page }) => {
    await page.goto(urlFor("agenda.overdue-as-coordinator"));

    await expect(page.getByText("A etapa do supervisor não entra em lista nenhuma")).toBeVisible();
    await expect(page.getByText(/É a única que some das duas/)).toBeVisible();
  });

  test("a mesma fixture produz outra lista pela conta geral", async ({ page }) => {
    await page.goto(urlFor("agenda.overdue-as-everyone-else"));

    await expect(page.getByText("Definição geral")).toBeVisible();
    await expect(page.getByText("Atrasados há mais de 48 horas")).toBeVisible();
    // O ponto cego é da coordenação: aqui o aviso não aparece.
    await expect(page.getByText("A etapa do supervisor não entra em lista nenhuma")).toHaveCount(0);
  });

  test("cada linha traz as duas contas lado a lado, em texto", async ({ page }) => {
    await page.goto(urlFor("agenda.overdue-as-coordinator"));

    await expect(page.getByText("atrasado para a coordenação").first()).toBeVisible();
    await expect(page.getByText("dentro da folga de 48h").first()).toBeVisible();
  });

  test("quando as duas concordam, nenhuma divergência é apontada", async ({ page }) => {
    await page.goto(urlFor("agenda.overdue-in-agreement"));

    await expect(page.getByText(/aparecem numa lista e não na outra/)).toHaveCount(0);
    // A definição em vigor continua declarada: isso não depende de haver conflito.
    await expect(page.getByText("Definição da coordenação")).toBeVisible();
  });
});

test.describe("a conta do supervisor", () => {
  test("a tela nomeia as duas janelas e afirma que a escolha é boa", async ({ page }) => {
    await page.goto(urlFor("agenda.overdue-supervisor-query"));

    await expect(page.getByText("Você se cobra antes de cobrar os outros")).toBeVisible();
    await expect(page.getByText(/Um de colega da unidade só aparece depois de 48 horas/)).toBeVisible();
    await expect(page.getByText(/quem cobra começa por si/)).toBeVisible();
  });

  test("aponta o que aparece só por ser de quem está olhando", async ({ page }) => {
    await page.goto(urlFor("agenda.overdue-supervisor-query"));

    await expect(page.getByText(/agendamento seu aparece por ser seu|agendamentos seus aparecem por serem seus/)).toBeVisible();
    await expect(page.getByText(/Fosse de colega, ainda não estaria aqui/)).toBeVisible();
  });

  test("distingue esta lista da de atendimentos pendentes", async ({ page }) => {
    await page.goto(urlFor("agenda.overdue-supervisor-query"));

    await expect(page.getByText("Esta lista não é a de atendimentos pendentes")).toBeVisible();
    await expect(page.getByText(/Uma não é subconjunto da outra/)).toBeVisible();
  });

  test("a coordenação continua vendo a lista dela, e não esta", async ({ page }) => {
    await page.goto(urlFor("agenda.overdue-as-coordinator"));

    await expect(page.getByText("Você se cobra antes de cobrar os outros")).toHaveCount(0);
    await expect(page.getByText("Definição da coordenação")).toBeVisible();
  });
});

test.describe("vigência dos planos", () => {
  test("os planos com meia vigência são apontados como invisíveis", async ({ page }) => {
    await page.goto(urlFor("authorizations.coverage-half-filled"));

    await expect(page.getByText(/2 planos somem de qualquer consulta por operadora/)).toBeVisible();
    await expect(page.getByText(/a entrada de dado mais provável produz o pior resultado/)).toBeVisible();
  });

  test("cada estado tem etiqueta em texto, e não só cor", async ({ page }) => {
    await page.goto(urlFor("authorizations.coverage-half-filled"));

    await expect(page.getByText("Coberto nesta data")).toBeVisible();
    await expect(page.getByText("Fora da vigência nesta data")).toBeVisible();
    await expect(page.getByText("Só uma das datas preenchida — não cobre data nenhuma").first()).toBeVisible();
  });

  test("a assimetria é declarada, mesmo não sendo defeito", async ({ page }) => {
    await page.goto(urlFor("authorizations.coverage-half-filled"));

    await expect(page.getByText("Sem nenhuma data, o filtro cobre sempre")).toBeVisible();
    await expect(page.getByText(/nenhuma data cobre tudo, uma data cobre nada/)).toBeVisible();
  });

  test("a correção sugerida diz qual das duas datas falta", async ({ page }) => {
    await page.goto(urlFor("authorizations.coverage-half-filled"));

    await expect(page.getByText(/Preencha o fim da vigência, ou apague o início/)).toBeVisible();
    await expect(page.getByText(/Preencha o início da vigência, ou apague o fim/)).toBeVisible();
  });

  test("com todas completas, nenhum aviso e nenhuma correção", async ({ page }) => {
    await page.goto(urlFor("authorizations.coverage-well-formed"));

    await expect(page.getByText(/somem de qualquer consulta/)).toHaveCount(0);
    await expect(page.getByText(/Preencha o/)).toHaveCount(0);
  });
});

test.describe("geração mensal de fechamentos", () => {
  test("as horas sem acerto aparecem somadas, e não como adjetivo", async ({ page }) => {
    await page.goto(urlFor("closures.generation-with-losses"));

    await expect(page.getByText(/1 profissional trabalhou e não recebe fechamento/)).toBeVisible();
    // Aparece na linha do profissional e na soma: as duas são certas.
    await expect(page.getByText("São 140 horas sem acerto")).toBeVisible();
    // Os dois workers quase se cobrem: o buraco é estreito e precisa ser dito
    // com precisão, não como acusação geral.
    await expect(page.getByText(/Há dois workers envolvidos e eles quase se cobrem/)).toBeVisible();
    await expect(page.getByText("Estes o worker de desativação cobre")).toBeVisible();
  });

  test("a falha é apontada ao lado do sucesso que o Oban registrou", async ({ page }) => {
    await page.goto(urlFor("closures.generation-with-losses"));

    await expect(page.getByText(/O Oban registrou/)).toBeVisible();
    await expect(page.getByText("Falha registrada como sucesso")).toBeVisible();
    await expect(page.getByText(/não tenta de novo, e ninguém é avisado/)).toBeVisible();
  });

  test("cada profissional diz se foi pulado, se falhou ou se gerou", async ({ page }) => {
    await page.goto(urlFor("closures.generation-with-losses"));

    // Escopado à lista: "fechamento gerado" também aparece dentro de "sem
    // fechamento gerado", no aviso de falha.
    const lista = page.getByRole("listitem");
    await expect(lista.filter({ hasText: "pulado por estar inativo" })).toHaveCount(2);
    await expect(lista.filter({ hasText: "tentou e falhou" })).toHaveCount(1);
    await expect(lista.filter({ hasText: /^\S.*fechamento gerado$/ })).toHaveCount(2);
  });

  test("numa virada sem perda, os dois avisos calam", async ({ page }) => {
    await page.goto(urlFor("closures.generation-clean"));

    await expect(page.getByText("Virada sem perda")).toBeVisible();
    await expect(page.getByText(/não recebem fechamento/)).toHaveCount(0);
    await expect(page.getByText("Falha registrada como sucesso")).toHaveCount(0);
  });
});

test.describe("de onde vêm as ausências", () => {
  test("a tela abre pela proporção, e não pelo total", async ({ page }) => {
    await page.goto(urlFor("agenda.absence-origins"));

    await expect(
      page.getByText("O sistema conta 15 ausências. 27% mede comportamento da família."),
    ).toBeVisible();
  });

  test("cada origem diz o que mede", async ({ page }) => {
    await page.goto(urlFor("agenda.absence-origins"));

    // A etiqueta de origem aparece em cada registro; o resumo é o único lugar
    // que diz o que a origem mede.
    await expect(page.getByText("4 alguém registrou a falta")).toBeVisible();
    await expect(page.getByText(/o oposto de faltar/)).toBeVisible();
    await expect(page.getByText(/desorganização interna/)).toBeVisible();
  });

  test("as conversões automáticas têm aviso próprio, com os dias parados", async ({ page }) => {
    await page.goto(urlFor("agenda.absence-origins"));

    await expect(page.getByText("Ausências que ninguém observou")).toBeVisible();
    await expect(page.getByText(/convertida depois de 9 dias parada em atraso/)).toBeVisible();
    await expect(page.getByText(/Duas rotinas fazem isto/)).toBeVisible();
    await expect(page.getByText(/a criança pode ter vindo e o registro simplesmente não ter sido fechado/i)).toBeVisible();
  });

  test("com todas observadas, a separação cala", async ({ page }) => {
    await page.goto(urlFor("agenda.absence-all-observed"));

    await expect(page.getByText(/mede comportamento da família/)).toHaveCount(0);
    await expect(page.getByText("Ausências que ninguém observou")).toHaveCount(0);
  });

  test("“não iniciado” é qualificado na lista de atrasados", async ({ page }) => {
    await page.goto(urlFor("agenda.overdue-as-coordinator"));

    await expect(page.getByText("“Não iniciado” pode ser uma sessão desfeita")).toBeVisible();
    await expect(page.getByText(/por rotina automática e sem registro/)).toBeVisible();
  });
});

test.describe("a rotina que acusa o paciente", () => {
  test("a conversão da manhã seguinte é separada da de sete dias", async ({ page }) => {
    await page.goto(urlFor("agenda.absence-origins"));

    await expect(page.getByText("Uma das rotinas grava a culpa no paciente")).toBeVisible();
    await expect(page.getByText(/Basta a recepção não ter feito o check-in/)).toBeVisible();
  });

  test("a frase nomeia a diferença entre os dois motivos gravados", async ({ page }) => {
    await page.goto(urlFor("agenda.absence-origins"));

    // "atraso" não acusa ninguém; "paciente faltou" é afirmação sobre alguém.
    await expect(
      page.getByText(/a diferença entre “ninguém fechou isto” e uma afirmação sobre uma pessoa/),
    ).toBeVisible();
  });

  test("cada origem tem etiqueta própria na lista", async ({ page }) => {
    await page.goto(urlFor("agenda.absence-origins"));

    // Nos `article` de cada registro, e não nos `li` — o resumo também usa
    // lista, e o rótulo da origem aparece nos dois lugares.
    const registro = page.getByRole("article");
    await expect(registro.filter({ hasText: "Convertida após sete dias parada" })).toHaveCount(3);
    await expect(
      registro.filter({ hasText: "Convertida na manhã seguinte, culpando o paciente" }),
    ).toHaveCount(3);
  });
});

test.describe("os dois caminhos da inativação", () => {
  test("o caminho automático nomeia os vínculos que apaga, com as observações", async ({ page }) => {
    await page.goto(urlFor("patients.deactivation-by-worker"));

    await expect(page.getByText("Este caminho apaga os vínculos com os profissionais")).toBeVisible();
    await expect(page.getByText(/Responde pela fonoaudiologia desde a entrada/)).toBeVisible();
    await expect(page.getByText(/Supervisiona o caso desde março/)).toBeVisible();
  });

  test("e diz o que o outro caminho faria com os mesmos vínculos", async ({ page }) => {
    await page.goto(urlFor("patients.deactivation-by-worker"));

    await expect(page.getByText(/Inativando pela tela, eles permanecem/)).toBeVisible();
  });

  test("a justificativa clínica é dita, e não deduzida", async ({ page }) => {
    await page.goto(urlFor("patients.deactivation-by-worker"));

    await expect(page.getByText(/Famílias em terapia ABA pausam e voltam/)).toBeVisible();
    await expect(page.getByText(/2 desses vínculos têm observação escrita/)).toBeVisible();
  });

  test("pelo caminho manual, a tela diz que os vínculos permanecem", async ({ page }) => {
    await page.goto(urlFor("patients.deactivation-impact"));

    await expect(
      page.getByText("Este caminho preserva os vínculos com os profissionais"),
    ).toBeVisible();
    await expect(page.getByText(/Se a data chegar e o worker rodar/)).toBeVisible();
  });
});

test.describe("saída automática", () => {
  test("os registros antigos são separados dos de hoje", async ({ page }) => {
    await page.goto(urlFor("in-clinic.auto-checkout-absurd"));

    await expect(
      page.getByText("3 registros vão declarar uma presença que não aconteceu"),
    ).toBeVisible();
    await expect(page.getByText("Presenças de hoje")).toBeVisible();
  });

  test("a duração aparece em dias, e não em horas", async ({ page }) => {
    await page.goto(urlFor("in-clinic.auto-checkout-absurd"));

    // "2147 horas" obrigaria quem lê a dividir de cabeça.
    await expect(page.getByText("89 dias na unidade")).toBeVisible();
    await expect(page.getByText(/2147 horas/)).toHaveCount(0);
  });

  test("a tela reconhece que limpar a lista é a intenção certa", async ({ page }) => {
    await page.goto(urlFor("in-clinic.auto-checkout-absurd"));

    await expect(page.getByText(/Limpar a lista é a intenção certa/)).toBeVisible();
    await expect(page.getByText(/A rotina não filtra por data/)).toBeVisible();
  });

  test("com só check-ins de hoje, o aviso cala", async ({ page }) => {
    await page.goto(urlFor("in-clinic.auto-checkout-clean"));

    await expect(page.getByText(/vão declarar uma presença que não aconteceu/)).toHaveCount(0);
    await expect(page.getByText(/fecha a lista sem inventar duração nenhuma/)).toBeVisible();
  });

  test("cada registro fechado diz quem o fechou", async ({ page }) => {
    await page.goto(urlFor("in-clinic.auto-checkout-signed"));

    await expect(page.getByText("fechada pela rotina")).toBeVisible();
    await expect(page.getByText("fechada por Recepção — Bianca")).toBeVisible();
    await expect(page.getByText(/pareceria erro de quem estava no balcão/)).toBeVisible();
  });
});

test.describe("renovação da janela de autorização", () => {
  test("a janela que vai renovar vazia é apontada antes de renovar", async ({ page }) => {
    await page.goto(urlFor("authorizations.renewal-into-empty"));

    await expect(page.getByText("1 janela vai renovar sem sessão nenhuma")).toBeVisible();
    await expect(page.getByText(/não cria guia nova nem devolve sessão/)).toBeVisible();
  });

  test("cada linha diz o que a renovação muda e o que não muda", async ({ page }) => {
    await page.goto(urlFor("authorizations.renewal-into-empty"));

    await expect(page.getByText(/A renovação não acrescenta nenhuma/)).toBeVisible();
    await expect(page.getByText(/quem repõe saldo é uma guia nova/)).toBeVisible();
  });

  test("ligar a renovação numa segunda janela do mesmo paciente fica indisponível", async ({
    page,
  }) => {
    await page.goto(urlFor("authorizations.renewal-into-empty"));

    // O índice único só se manifestaria ao salvar. Aqui aparece antes — e os
    // dois lados importam: a Nina ainda pode ligar, o Théo não.
    const linhaDaNina = page.getByRole("article").filter({ hasText: "Nina Corrêa Bastos" });
    await expect(
      linhaDaNina.getByRole("button", { name: "Ligar a renovação automática" }),
    ).toBeEnabled();

    const segundaDoTheo = page
      .getByRole("article")
      .filter({ hasText: "Théo Andrade Lins" })
      .filter({ hasText: "não renova sozinha" });
    await expect(
      segundaDoTheo.getByRole("button", { name: "Ligar a renovação automática" }),
    ).toBeDisabled();
    await expect(page.getByText(/períodos sobrepostos/)).toBeVisible();
  });

  test("com todas com saldo, o aviso cala", async ({ page }) => {
    await page.goto(urlFor("authorizations.renewal-with-balance"));

    await expect(page.getByText(/vai renovar sem sessão nenhuma/)).toHaveCount(0);
    await expect(page.getByText(/A renovação não acrescenta nenhuma/).first()).toBeVisible();
  });
});

test.describe("envio do lote TISS", () => {
  test("o valor não faturado aparece somado", async ({ page }) => {
    await page.goto(urlFor("closures.tiss-batch-lost"));

    // O `Intl` pt-BR separa o símbolo com espaço não separável (U+00A0), e
    // não com espaço comum — casar por regex literal falharia.
    await expect(page.getByText(/23\.900,00 não foram faturados/)).toBeVisible();
    await expect(page.getByText(/A rotina de envio tenta uma vez só/)).toBeVisible();
    await expect(page.getByText(/nem agora, nem depois/)).toBeVisible();
  });

  test("cada tentativa perdida é marcada individualmente", async ({ page }) => {
    await page.goto(urlFor("closures.tiss-batch-lost"));

    await expect(page.getByText("Não vai ser reenviado por conta própria.")).toHaveCount(2);
  });

  test("recusa e exceção aparecem como desfechos distintos, com donos diferentes", async ({
    page,
  }) => {
    await page.goto(urlFor("closures.tiss-batch-indistinguishable"));

    await expect(page.getByText("Recusado pela operadora")).toBeVisible();
    await expect(page.getByText("Exceção ao gerar o XML")).toBeVisible();
    await expect(page.getByText(/Resolver é da operação, conversando com a operadora/)).toBeVisible();
    await expect(page.getByText(/Resolver é da engenharia/)).toBeVisible();
  });

  test("a resposta da operadora é mostrada, com a ressalva de que o código a descarta", async ({
    page,
  }) => {
    await page.goto(urlFor("closures.tiss-batch-indistinguishable"));

    await expect(page.getByText(/Beneficiário sem elegibilidade na data do atendimento/)).toBeVisible();
    await expect(page.getByText(/e o código descarta essa resposta/)).toBeVisible();
  });

  test("com todos enviados, os dois avisos calam", async ({ page }) => {
    await page.goto(urlFor("closures.tiss-batch-all-sent"));

    await expect(page.getByText(/não foram faturados/)).toHaveCount(0);
    await expect(page.getByText("Não vai ser reenviado por conta própria.")).toHaveCount(0);
  });
});

test.describe("distribuição de guias", () => {
  test("os atendimentos sem guia são nomeados, com o valor somado", async ({ page }) => {
    await page.goto(urlFor("authorizations.distribution-short"));

    await expect(page.getByText(/2 atendimentos ficaram sem guia/)).toBeVisible();
    await expect(page.getByText(/360,00/)).toBeVisible();
    // O nome aparece no aviso e na lista do dia — as duas ocorrências são
    // certas, e a asserção precisa dizer isso em vez de escolher uma.
    await expect(page.getByText(/Rafael Toledo Marinho/)).toHaveCount(2);
  });

  test("a tela diz que essa lista já existe no sistema e é descartada", async ({ page }) => {
    await page.goto(urlFor("authorizations.distribution-short"));

    await expect(page.getByText(/o distribuidor a monta enquanto decide/)).toBeVisible();
    await expect(page.getByText(/quando já não dá para pedir autorização/)).toBeVisible();
  });

  test("o horário do corte é dito, e a arbitrariedade declarada", async ({ page }) => {
    await page.goto(urlFor("authorizations.distribution-short"));

    await expect(page.getByText("Foi o relógio que decidiu")).toBeVisible();
    await expect(page.getByText(/o corte caiu às 15:00/)).toBeVisible();
    await expect(page.getByText(/Não é critério clínico nem de urgência/)).toBeVisible();
  });

  test("com saldo suficiente, os dois avisos calam", async ({ page }) => {
    await page.goto(urlFor("authorizations.distribution-enough"));

    await expect(page.getByText(/ficaram sem guia/)).toHaveCount(0);
    await expect(page.getByText("Foi o relógio que decidiu")).toHaveCount(0);
  });
});
