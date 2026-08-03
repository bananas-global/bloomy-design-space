import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("galeria — campos compostos e somente leitura", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/componentes"); });

  test("publica os cinco portes somente com seus contratos completos", async ({ page }) => {
    await expect(page.getByText("47 de 47 portados do sistema")).toBeVisible();
    for (const name of ["input_with_select", "checkgroup", "fake_input", "input_switch_card", "fake_radio_group"]) {
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    }
  });

  test("input_with_select preserva ids, nomes, valores, opções e tabulação", async ({ page }) => {
    const value = page.getByRole("textbox", { name: "Critério de Avanço: valor" });
    const criterion = page.getByRole("combobox", { name: "Critério de Avanço: critério" });
    await expect(value).toHaveAttribute("id", "g-criterio-frequencia");
    await expect(value).toHaveAttribute("name", "programa[mastery_frequency]");
    await expect(value).toHaveValue("3");
    await expect(criterion).toHaveAttribute("name", "programa[mastery_criteria]");
    await expect(criterion.locator("option")).toHaveText(["Sessões Cumulativas", "Sessões Consecutivas"]);
    await value.click();
    await value.fill("5");
    await page.keyboard.press("Tab");
    await expect(criterion).toBeFocused();
    await criterion.selectOption("cumulative");
    await expect(criterion).toHaveValue("cumulative");
    const blocked = page.getByRole("textbox", { name: "Critério indisponível: valor" });
    await expect(blocked).toBeDisabled();
    await expect(blocked).toHaveAttribute("aria-invalid", "true");
    await expect(blocked).toHaveAttribute("aria-describedby", "g-criterio-bloqueado-frequencia-errors");
    await expect(page.locator("#g-criterio-bloqueado-frequencia-errors")).toContainText("não pode ser alterado");
  });

  test("checkgroup envia array, alterna por teclado e mantém grupo nomeado", async ({ page }) => {
    const group = page.getByRole("group", { name: "Atende nos dias da semana" });
    const monday = group.getByRole("checkbox", { name: "Segunda" });
    const wednesday = group.getByRole("checkbox", { name: "Quarta" });
    const friday = group.getByRole("checkbox", { name: "Sexta" });
    await expect(monday).toHaveAttribute("name", "unit_service_hour[service_hour][weekdays][][]");
    await expect(monday).toHaveAttribute("id", "g-dias-unit_service_hour[service_hour][weekdays][]-monday");
    await expect(monday).toHaveValue("monday");
    await expect(monday).toBeChecked();
    await monday.click();
    await page.keyboard.press("Tab");
    await expect(wednesday).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(friday).toBeFocused();
    await friday.press("Space");
    await expect(friday).toBeChecked();
    await expect(group.getByRole("checkbox", { name: "Domingo" })).toBeDisabled();
  });

  test("fake_input permanece estático e conserva as duas cores de rótulo", async ({ page }) => {
    const wrapper = page.locator("#g-fake-input-wrapper");
    await expect(wrapper.getByText("Helena M.", { exact: true })).toBeVisible();
    await expect(wrapper.getByText("Unidade Girassol", { exact: true })).toBeVisible();
    await expect(wrapper.locator("input, select, textarea, button")).toHaveCount(0);
    await expect(wrapper.getByText("Paciente", { exact: true })).toHaveClass(/neutral-400/);
    await expect(wrapper.getByText("Unidade", { exact: true })).toHaveClass(/brand-blue/);
  });

  test("input_switch_card alterna pela chave real e mantém nome e valor", async ({ page }) => {
    const wrapper = page.locator("#g-input-switch-card-wrapper");
    const toggle = wrapper.getByRole("checkbox", { name: "Mostrar horário" });
    const label = wrapper.getByText("Mostrar horário", { exact: true });
    await expect(toggle).toHaveAttribute("name", "relatorio[show_hours]");
    await expect(toggle).toHaveValue("true");
    await expect(toggle).not.toHaveAttribute("aria-label");
    await expect(label).toHaveAttribute("id", /input-switch-card-.+-label/);
    await expect(toggle).toHaveAttribute("aria-labelledby", await label.getAttribute("id") as string);
    await expect(toggle).toHaveAccessibleName("Mostrar horário");
    await expect(toggle).not.toBeChecked();
    await expect(wrapper.locator('input[type="hidden"]')).toHaveAttribute("name", "relatorio[show_hours]");
    await expect(wrapper.locator('input[type="hidden"]')).toHaveValue("false");
    expect(await wrapper.evaluate((form: HTMLFormElement) => new FormData(form).getAll("relatorio[show_hours]"))).toEqual(["false"]);
    await toggle.press("Space");
    await expect(toggle).toBeChecked();
    expect(await wrapper.evaluate((form: HTMLFormElement) => new FormData(form).getAll("relatorio[show_hours]"))).toEqual(["false", "true"]);
    await expect(wrapper.locator("div").first()).toHaveClass(/blue-light/);
  });

  test("fake_radio_group mantém só a resposta selecionada habilitada e ids únicos", async ({ page }) => {
    const group = page.getByRole("group", { name: "Qual foi o Foco da Terapia na Sessão" });
    const radios = group.getByRole("radio");
    await expect(radios).toHaveCount(3);
    await expect(group.getByRole("radio", { name: "Habilidades sociais" })).toBeChecked();
    await expect(group.getByRole("radio", { name: "Habilidades sociais" })).toBeEnabled();
    await expect(group.getByRole("radio", { name: "Comunicação" })).toBeDisabled();
    await expect(radios.nth(0)).toHaveAttribute("name", "therapy_focus");
    await expect(radios.nth(0)).toHaveValue("comunicacao");
    const ids = await radios.evaluateAll((nodes) => nodes.map((node) => node.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("não introduz violações estruturais ou relações ARIA quebradas", async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include("#g-input-with-select-wrapper")
      .include("#g-checkgroup-wrapper")
      .include("#g-fake-input-wrapper")
      .include("#g-input-switch-card-wrapper")
      .include("#g-fake-radio-group-wrapper")
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
