import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("galeria — seletores de data", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/componentes"); });

  test("mantém os quatro portes, contratos visíveis e erros associados", async ({ page }) => {
    await expect(page.getByText("47 de 47 portados do sistema")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Período", exact: true })).toBeVisible();
    const mes = page.getByRole("combobox", { name: "Mês da avaliação" });
    await expect(mes).toHaveValue("Ago 2026");
    await expect(mes).toHaveAttribute("aria-invalid", "true");
    await expect(mes).toHaveAttribute("aria-describedby", "g-mes-avaliacao-errors");
    await expect(page.locator("#g-periodo-dias-picker")).toHaveAttribute("data-static", "true");
    await expect(page.locator("#g-periodo-meses-picker")).toHaveAttribute("data-disable", '["2026-02-01"]');
  });

  test("date navigator atravessa mês, ano e bissexto sem relógio e publica o valor", async ({ page }) => {
    const navegador = page.locator("#datepicker-wrapper-g-navegador-data");
    const anterior = navegador.getByRole("button", { name: "Dia anterior" });
    const proximo = navegador.getByRole("button", { name: "Próximo dia" });
    const calendario = navegador.locator("#datepicker-g-navegador-data");
    await expect(calendario).toHaveAccessibleName("Hoje, 30 Jul 2026");
    await expect(page.locator('input[name="filtro[data]"]')).toHaveValue("2026-07-30");
    await anterior.click();
    await expect(page.locator('input[name="filtro[data]"]')).toHaveValue("2026-07-29");
    await proximo.click(); await proximo.click(); await proximo.click();
    await expect(page.locator('input[name="filtro[data]"]')).toHaveValue("2026-08-01");
    await calendario.press("Enter");
    await expect(page.getByRole("button", { name: "1 de Agosto de 2026", exact: true })).toBeFocused();
    await page.keyboard.press("PageUp"); await page.keyboard.press("PageUp"); await page.keyboard.press("Enter");
    await expect(page.locator('input[name="filtro[data]"]')).toHaveValue("2026-06-01");
    await anterior.click();
    await expect(page.locator('input[name="filtro[data]"]')).toHaveValue("2026-05-31");
    await page.getByRole("button", { name: "Carregar limite bissexto" }).click();
    await proximo.click();
    await expect(page.locator('input[name="filtro[data]"]')).toHaveValue("2024-02-29");
    await proximo.click();
    await expect(page.locator('input[name="filtro[data]"]')).toHaveValue("2024-03-01");
    await page.getByRole("button", { name: "Carregar fim do ano" }).click();
    await proximo.click();
    await expect(page.locator('input[name="filtro[data]"]')).toHaveValue("2026-01-01");
    await anterior.click();
    await expect(page.locator('input[name="filtro[data]"]')).toHaveValue("2025-12-31");
  });

  test("switch card fixa a correção intencional de multiple e valor customizado", async ({ page }) => {
    const chave = page.getByRole("checkbox", { name: /Registro Tipo ABC/ });
    await expect(chave).not.toBeChecked();
    await expect(chave).toHaveAttribute("name", "programa[is_abc]");
    await expect(chave).toHaveValue("true");
    await chave.press("Space");
    await expect(chave).toBeChecked();
    await chave.press("Space");
    await expect(chave).not.toBeChecked();
    await page.getByText("Ativa o formato ABC para detalhar o comportamento com antecedentes e consequências.", { exact: true }).click();
    await expect(chave).toBeChecked();
    const bloqueada = page.getByRole("checkbox", { name: /Fase de manutenção/ });
    await expect(bloqueada).toBeDisabled();
    await expect(bloqueada).toHaveAttribute("name", "programa[fases][]");
    await expect(bloqueada).toHaveValue("manutencao");
  });

  test("date navigator fixa a correção intencional dos três controles desabilitados", async ({ page }) => {
    const wrapper = page.locator("#datepicker-wrapper-g-navegador-bloqueado");
    await expect(wrapper).toHaveAttribute("data-disable", "true");
    await expect(wrapper.getByRole("button")).toHaveCount(3);
    for (const botao of await wrapper.getByRole("button").all()) await expect(botao).toBeDisabled();
    await expect(page.locator('input[name="filtro[data_bloqueada]"]')).toHaveValue("2026-08-15");
  });

  test("date navigator ancora popup, sincroniza atualização externa aberta e mantém relações ARIA", async ({ page }) => {
    const acionador = page.locator("#datepicker-g-navegador-data");
    await expect(acionador).toHaveAttribute("aria-haspopup", "dialog");
    await expect(acionador).toHaveAttribute("aria-controls", "g-navegador-data-popup");
    await expect(acionador).toHaveAttribute("aria-expanded", "false");
    await acionador.press("Enter");
    const popup = page.getByRole("dialog", { name: "Calendário" });
    await expect(acionador).toHaveAttribute("aria-expanded", "true");
    await expect(popup).toHaveAttribute("id", "g-navegador-data-popup");
    const [botaoBox, popupBox] = await Promise.all([acionador.boundingBox(), popup.boundingBox()]);
    expect(botaoBox).not.toBeNull();
    expect(popupBox).not.toBeNull();
    expect(Math.abs((popupBox!.x + popupBox!.width / 2) - (botaoBox!.x + botaoBox!.width / 2))).toBeLessThanOrEqual(1);
    expect(popupBox!.y).toBeGreaterThanOrEqual(botaoBox!.y + botaoBox!.height);
    await page.getByRole("button", { name: "Carregar valor externo" }).dispatchEvent("click");
    await expect(acionador).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('input[name="filtro[data]"]')).toHaveValue("2026-09-14");
    await expect(page.getByRole("button", { name: "14 de Setembro de 2026", exact: true })).toBeFocused();
  });

  test("date navigator fecha com Escape e clique externo e restaura foco", async ({ page }) => {
    const acionador = page.locator("#datepicker-g-navegador-data");
    await acionador.press("Enter");
    await page.keyboard.press("Escape");
    await expect(page.locator("#g-navegador-data-popup")).toHaveCount(0);
    await expect(acionador).toBeFocused();
    await acionador.press("Enter");
    await page.mouse.click(5, 5);
    await expect(page.locator("#g-navegador-data-popup")).toHaveCount(0);
    await expect(acionador).toBeFocused();
  });

  test("tabulação real alcança SwitchCard e DateNavigator", async ({ page }) => {
    const anteriorNaGaleria = page.getByRole("button", { name: "Passe o mouse ou dê Tab" });
    await anteriorNaGaleria.click();
    await expect(anteriorNaGaleria).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.locator("#g-registro-abc")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.locator("#datepicker-wrapper-g-navegador-data").getByRole("button", { name: "Dia anterior" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.locator("#datepicker-g-navegador-data")).toBeFocused();
  });

  test("timeline mantém lista ordenada e os dois marcadores do histórico", async ({ page }) => {
    const lista = page.getByRole("list").filter({ hasText: "Documento inicial anexado" });
    await expect(lista.getByRole("listitem")).toHaveCount(2);
    await expect(lista.getByText("Criado", { exact: true })).toBeVisible();
    await expect(lista.getByText("Editado", { exact: true })).toBeVisible();
  });

  test("range diário entra no calendário e completa tudo pelo teclado", async ({ page }) => {
    const campo = page.getByRole("combobox", { name: "Período", exact: true });
    await campo.press("ArrowDown");
    await expect(page.getByRole("button", { name: "3 de Agosto de 2026", exact: true })).toBeFocused();
    const dialog = page.getByRole("dialog", { name: "Calendário" });
    await expect(dialog.locator(".grid").first().locator("span").filter({ hasText: /^(Seg|Ter|Qua|Qui|Sex|Sáb|Dom)$/ })).toHaveText(["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]);
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("button", { name: "10 de Agosto de 2026", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Space");
    await expect(campo).toHaveValue("10/08/2026 até 12/08/2026");
    await expect(page.locator('input[name="g-periodo-dias"]')).toHaveValue("2026-08-10#2026-08-12");
    await expect(campo).toBeFocused();
  });

  test("range diário respeita disable, limites, mês/ano e seleção invertida", async ({ page }) => {
    const campo = page.getByRole("combobox", { name: "Período", exact: true });
    await campo.press("Enter");
    await expect(page.getByRole("button", { name: "15 de Agosto de 2026", exact: true })).toBeDisabled();
    await page.keyboard.press("PageUp");
    await expect(page.getByRole("button", { name: "3 de Agosto de 2026", exact: true })).toBeFocused();
    await page.keyboard.press("Home");
    await expect(page.getByRole("button", { name: "3 de Agosto de 2026", exact: true })).toBeFocused();
    await page.keyboard.press("PageDown");
    await expect(page.getByRole("button", { name: "3 de Setembro de 2026", exact: true })).toBeFocused();
    await page.keyboard.press("PageDown");
    await expect(page.getByRole("button", { name: "3 de Setembro de 2026", exact: true })).toBeFocused();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Home");
    await page.keyboard.press("Enter");
    await expect(page.locator('input[name="g-periodo-dias"]')).toHaveValue("2026-08-31#2026-09-06");
  });

  test("Escape e clique externo fecham e restauram o foco", async ({ page }) => {
    const campo = page.getByRole("combobox", { name: "Período", exact: true });
    await campo.press("ArrowDown");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Calendário" })).toHaveCount(0);
    await expect(campo).toBeFocused();
    await campo.press("ArrowDown");
    await page.mouse.click(5, 5);
    await expect(page.getByRole("dialog", { name: "Calendário" })).toHaveCount(0);
    await expect(campo).toBeFocused();
  });

  test("atualização controlada sincroniza cursor sem apagar seleção parcial", async ({ page }) => {
    const campo = page.getByRole("combobox", { name: "Período", exact: true });
    await campo.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Carregar período externo" }).click();
    await expect(campo).toHaveValue("07/09/2026 até 13/09/2026");
    await campo.press("ArrowDown");
    await expect(page.getByRole("button", { name: "10 de Agosto de 2026", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Carregar período externo" }).click();
    await campo.press("ArrowDown");
    await expect(page.getByRole("button", { name: "7 de Setembro de 2026", exact: true })).toBeFocused();
  });

  test("range mensal usa último dia, bissexto, inversão e travessia de ano", async ({ page }) => {
    const campo = page.getByRole("combobox", { name: "Período dos programas" });
    await page.getByRole("button", { name: "Carregar intervalo bissexto" }).click();
    await expect(page.locator('input[name="g-periodo-meses"]')).toHaveValue("2024-01-01#2024-02-29");
    await campo.press("ArrowDown");
    await expect(page.getByRole("button", { name: "Janeiro de 2024" })).toBeFocused();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.press("PageUp");
    await page.keyboard.press("Enter");
    await expect(page.locator('input[name="g-periodo-meses"]')).toHaveValue("2023-12-01#2024-12-31");
    await expect(campo).toBeFocused();
  });

  test("range mensal preserva seleção parcial durante atualização externa", async ({ page }) => {
    const campo = page.getByRole("combobox", { name: "Período dos programas" });
    await campo.press("Enter");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Carregar intervalo bissexto" }).click();
    await campo.press("ArrowDown");
    await expect(page.getByRole("button", { name: "Fevereiro de 2026" })).toBeFocused();
  });

  test("mês único navega por ano, seleciona e sincroniza valor externo", async ({ page }) => {
    const campo = page.getByRole("combobox", { name: "Mês da avaliação" });
    await campo.press("ArrowDown");
    await page.keyboard.press("PageDown");
    await page.keyboard.press("Home");
    await page.keyboard.press("Enter");
    await expect(page.locator('input[name="g-mes-avaliacao"]')).toHaveValue("2027-01-01");
    await expect(campo).toBeFocused();
    await page.getByRole("button", { name: "Carregar mês externo" }).click();
    await campo.press("ArrowDown");
    await expect(page.getByRole("button", { name: "Fevereiro de 2027" })).toBeFocused();
  });

  test("seletor semanal atravessa mês e ano", async ({ page }) => {
    await expect(page.getByText("29 - 04 de Janeiro", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Próxima semana" }).click();
    await expect(page.getByText("05 - 11 de Janeiro", { exact: true })).toBeVisible();
    await expect(page.getByText("Janeiro 2026", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Semana anterior" }).click();
    await expect(page.getByText("Dezembro 2025", { exact: true })).toBeVisible();
  });

  test("axe não encontra violações com cada popup aberto", async ({ page }) => {
    for (const nome of ["Período", "Período dos programas", "Mês da avaliação"]) {
      const campo = page.getByRole("combobox", { name: nome, exact: true });
      await campo.press("ArrowDown");
      const pickerId = await campo.getAttribute("aria-controls");
      expect(pickerId).toBeTruthy();
      await expect(campo).toHaveAttribute("role", "combobox");
      await expect(campo).toHaveAttribute("aria-haspopup", "dialog");
      await expect(campo).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator(`#${pickerId}`)).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include(`#${nome === "Período" ? "g-periodo-dias" : nome === "Período dos programas" ? "g-periodo-meses" : "g-mes-avaliacao"}-picker`)
        .disableRules(["color-contrast"])
        .analyze();
      expect(results.violations).toEqual([]);
      await page.keyboard.press("Escape");
    }

    const navegador = page.locator("#datepicker-g-navegador-data");
    await navegador.press("Enter");
    await expect(navegador).toHaveAttribute("aria-expanded", "true");
    const results = await new AxeBuilder({ page })
      .include("#datepicker-wrapper-g-navegador-data")
      // Contraste é uma dívida conhecida dos tokens espelhados; as relações e a operação do popup seguem escopadas.
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
