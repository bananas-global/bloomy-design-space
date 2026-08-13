import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("catálogo — abas e select do sistema", () => {
  test("button_tabs move o marcador por clique e teclado", async ({ page }) => {
    await page.goto("/?component=core.button-tabs&fixture=marcador-movel-entre-abas");

    const wrapper = page.locator("#g-button-tabs");
    const tabs = wrapper.getByRole("tab");
    const marker = wrapper.locator("[data-button-tab-marker]");
    await expect(tabs).toHaveText(["Programas", "Protocolos", "Histórico"]);
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await expect(marker).not.toHaveClass(/hidden/);
    await expect(wrapper.getByRole("tabpanel")).toContainText("Programas estruturados");

    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(wrapper.getByRole("tabpanel")).toContainText("ABLLS-R");

    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(2)).toBeFocused();
  });

  test("select usa menu próprio, seleção, limpeza e estados", async ({ page }) => {
    await page.goto("/?component=core.input&fixture=selecao-com-menu-proprio");

    const specialty = page.getByRole("combobox", { name: "Especialidade", exact: true });
    const specialtyValue = page.locator('input[name="professional[specialty]"]');
    await expect(specialty).toHaveText(/Selecione a especialidade/);
    await specialty.click();
    const listbox = page.getByRole("listbox", { name: "Especialidade" });
    await expect(listbox).toBeVisible();
    await expect(listbox.getByRole("option")).toHaveCount(5);

    await specialty.press("End");
    await specialty.press("Enter");
    await expect(specialtyValue).toHaveValue("occupational-therapy");
    await expect(specialty).toContainText("Terapia Ocupacional");

    await page.getByRole("button", { name: "Limpar Especialidade" }).click();
    await expect(specialtyValue).toHaveValue("");
    await expect(specialty).toContainText("Selecione a especialidade");

    await specialty.press("Enter");
    await specialty.press("Escape");
    await expect(page.getByRole("listbox", { name: "Especialidade" })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Especialidade com erro" })).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("combobox", { name: "Especialidade indisponível" })).toBeDisabled();
  });

  test("lazy_tabs agrupa opções, move o marcador e carrega a seleção", async ({ page }) => {
    await page.goto("/?component=core.lazy-tabs&fixture=abas-agrupadas-do-perfil-do-paciente");

    const wrapper = page.locator("#g-lazy-tabs");
    const navigation = wrapper.getByRole("navigation", { name: "Perfil do paciente" });
    const marker = wrapper.locator("[data-lazy-tab-marker]");
    const anamneses = navigation.getByRole("button", { name: "Anamneses" });

    await expect(anamneses).toHaveAttribute("aria-current", "page");
    await expect(marker).not.toHaveClass(/hidden/);
    await expect(wrapper.getByRole("tabpanel")).toContainText("Resumo Clínico");

    await anamneses.click();
    const menu = page.getByRole("menu", { name: "Anamneses" });
    await expect(menu.getByRole("menuitemradio")).toHaveText([
      "Resumo Clínico",
      "Anamnese Geral",
      "Anamnese Clínica",
      "Externo",
    ]);
    await expect(menu.getByRole("menuitemradio", { name: "Resumo Clínico" })).toHaveAttribute("aria-checked", "true");

    await menu.getByRole("menuitemradio", { name: "Anamnese Clínica" }).click();
    await expect(wrapper.getByRole("tabpanel")).toContainText("Anamnese Clínica");
    await expect(wrapper.locator('[role="tabpanel"]')).toHaveCount(2);
    await expect(wrapper.locator('[role="tabpanel"][hidden]')).toContainText("Resumo Clínico");
    await expect(anamneses).toHaveAttribute("aria-current", "page");

    await navigation.getByRole("button", { name: "Evolução" }).click();
    await expect(wrapper.getByRole("tabpanel")).toContainText("Evolução");
    await expect(navigation.getByRole("button", { name: "Evolução" })).toHaveAttribute("aria-current", "page");
  });

  test("lazy_tabs abre o grupo e percorre opções pelo teclado", async ({ page }) => {
    await page.goto("/?component=core.lazy-tabs&fixture=abas-agrupadas-do-perfil-do-paciente");

    const navigation = page.getByRole("navigation", { name: "Perfil do paciente" });
    const anamneses = navigation.getByRole("button", { name: "Anamneses" });
    await anamneses.focus();
    await page.keyboard.press("ArrowDown");

    const menu = page.getByRole("menu", { name: "Anamneses" });
    await expect(menu.getByRole("menuitemradio").first()).toBeFocused();
    await page.keyboard.press("End");
    await expect(menu.getByRole("menuitemradio", { name: "Externo" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(anamneses).toBeFocused();
  });

  test("os dois componentes não introduzem relações ARIA quebradas", async ({ page }) => {
    for (const [url, selector] of [
      ["/?component=core.button-tabs&fixture=marcador-movel-entre-abas", "#g-button-tabs"],
      ["/?component=core.lazy-tabs&fixture=abas-agrupadas-do-perfil-do-paciente", "#g-lazy-tabs"],
      ["/?component=core.input&fixture=selecao-com-menu-proprio", "#g-select-wrapper"],
    ] as const) {
      await page.goto(url);
      const results = await new AxeBuilder({ page }).include(selector).disableRules(["color-contrast"]).analyze();
      expect(results.violations, url).toEqual([]);
    }
  });
});
