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

/* ============================================================== financeiro */

test.describe("Financeiro", () => {
  test("a fila ordena por urgência e soma o que espera ação da clínica", async ({ page }) => {
    await page.goto(urlFor("finance.queue"));

    // Recusada primeiro: ordem cronológica esconderia a guia de três dias atrás.
    const firstRow = page.getByRole("row").nth(1);
    await expect(firstRow).toContainText("Recusada");

    // 1.425,00 + 960,00 das duas guias que aguardam a clínica.
    await expect(page.getByText("R$ 2.385,00")).toBeVisible();
  });

  test("convênio recusado mostra motivo e código, e bloqueia o reenvio nomeando o que falta", async ({
    page,
  }) => {
    await page.goto(urlFor("finance.insurance-denied"));

    await expect(page.getByRole("heading", { name: /Guia recusada — TUSS-3001/ })).toBeVisible();
    await expect(page.getByText(/relatório clínico assinado e laudo de exame anterior/)).toBeVisible();

    const resubmit = page.getByRole("button", { name: "Reenviar ao convênio" });
    await expect(resubmit).toBeVisible();
    await expect(resubmit).toBeDisabled();
    await expect(
      page.getByText("Falta anexar: Relatório clínico assinado, Laudo do exame anterior."),
    ).toBeVisible();
  });

  test("a recusa é anunciada para leitor de tela ao abrir a página", async ({ page }) => {
    await page.goto(urlFor("finance.insurance-denied"));

    // `role="alert"` é o que faz a informação mais importante da página ser
    // anunciada na chegada, e não descoberta depois de percorrer a estrutura.
    // É o que o campo `announces: ["claim.status"]` do cenário exige.
    await expect(page.getByRole("alert")).toContainText("Guia recusada — TUSS-3001");
  });

  test("anexar os documentos que faltam libera o reenvio na mesma tela", async ({ page }) => {
    await page.goto(urlFor("finance.insurance-denied"));

    const resubmit = page.getByRole("button", { name: "Reenviar ao convênio" });
    await expect(resubmit).toBeDisabled();

    // Cada clique remove o próprio botão da lista, então um `.all()` capturado de
    // antemão aponta para nós que já saíram do DOM.
    const attach = page.getByRole("button", { name: "Anexar" });
    while ((await attach.count()) > 0) {
      await attach.first().click();
    }

    await expect(page.getByText("2 de 4 documentos anexados")).toBeHidden();
    await expect(resubmit).toBeEnabled();

    await resubmit.click();
    await expect(page.getByRole("status").first()).toContainText("reenviada ao SulAmérica");
  });

  test("pendência de documento não é recusa", async ({ page }) => {
    await page.goto(urlFor("finance.pending-documents"));

    await expect(
      page.getByRole("heading", { name: "O convênio pediu documento adicional" }),
    ).toBeVisible();
    await expect(page.getByText("Exigido a partir da sexta sessão.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reenviar ao convênio" })).toBeDisabled();
  });

  test("guia em análise deixa claro que não há ação da clínica", async ({ page }) => {
    await page.goto(urlFor("finance.invoice-under-review"));

    await expect(page.getByRole("heading", { name: "Em análise no convênio" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reenviar ao convênio" })).toBeDisabled();
  });

  test("com documentação completa o reenvio libera e o motivo original continua visível", async ({
    page,
  }) => {
    await page.goto(urlFor("finance.resubmit-allowed"));

    await expect(page.getByRole("button", { name: "Reenviar ao convênio" })).toBeEnabled();
    // O contexto da recusa não desaparece só porque o problema foi resolvido.
    await expect(page.getByRole("heading", { name: /TUSS-3001/ })).toBeVisible();
  });

  test("o coordenador lê tudo e não reenvia", async ({ page }) => {
    await page.goto(urlFor("finance.resubmit-no-permission"));

    await expect(page.getByText("R$ 1.425,00")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reenviar ao convênio" })).toBeDisabled();
    await expect(page.getByText(/não reenvia guias/)).toBeVisible();
  });
});

/* =========================================================== transversais */

test.describe("jornada por teclado", () => {
  test("da fila até o reenvio sem usar o mouse", async ({ page }) => {
    await page.goto(urlFor("finance.resubmit-allowed"));

    const resubmit = page.getByRole("button", { name: "Reenviar ao convênio" });
    await resubmit.focus();
    await expect(resubmit).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("status").first()).toContainText("reenviada");
  });

  test("o link de pulo é o primeiro elemento focável", async ({ page }) => {
    await page.goto(urlFor("agenda.day"));

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused();
  });
});

test.describe("determinismo", () => {
  for (const scenarioId of ["agenda.day", "patients.list", "finance.queue"]) {
    test(`a mesma URL produz a mesma situação em "${scenarioId}"`, async ({ page }) => {
      const url = urlFor(scenarioId);

      await page.goto(url);
      const first = await page.locator("tbody").innerText();

      await page.goto("about:blank");
      await page.goto(url);
      const second = await page.locator("tbody").innerText();

      expect(second).toBe(first);
    });
  }
});

test.describe("navegação por permissão", () => {
  test("o menu esconde o financeiro de quem atende", async ({ page }) => {
    await page.goto(urlFor("agenda.cancel-no-permission"));

    // A terapeuta tem `schedules.list` e `patients.list`, e não tem
    // `authorizations.hub`. Um item visível e sem acesso ensina a pessoa a
    // clicar em algo que sempre falha.
    const nav = page.getByLabel("Navegação principal");
    await expect(nav.getByRole("link", { name: "Agenda" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Pacientes" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Financeiro" })).toHaveCount(0);
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
    await expect(nav.getByRole("link", { name: "Financeiro" })).toHaveCount(0);
  });

  test("a operação alcança a central de autorizações", async ({ page }) => {
    await page.goto(urlFor("finance.queue"));

    await expect(page.getByRole("link", { name: "Financeiro" })).toBeVisible();
  });
});
