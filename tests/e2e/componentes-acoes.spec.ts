import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("galeria — link_button e copy_button", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => {
      const copies: string[] = [];
      Object.defineProperty(window, "__clipboardCopies", { value: copies });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async (text: string) => { copies.push(text); } },
      });
    });
    await page.goto("/componentes");
  });

  test("conta os dois portes somente com as demos completas", async ({ page }) => {
    await expect(page.getByText("47 de 47 portados do sistema")).toBeVisible();
    await expect(page.getByRole("heading", { name: "link_button", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "copy_button", exact: true })).toBeVisible();
  });

  test("link_button preserva destino, rest, variante, classes e ícones", async ({ page }) => {
    const back = page.getByRole("link", { name: "Voltar para programas" });
    await expect(back).toHaveAttribute("href", "#destino-link-button");
    await expect(back).toHaveAttribute("target", "_self");
    await expect(back).toHaveAttribute("rel", "bookmark");
    await expect(back).toHaveAttribute("type", "text/html");
    await expect(back).toHaveAttribute("hreflang", "pt-BR");
    await expect(back).toHaveAttribute("referrerpolicy", "no-referrer");
    await expect(back).toHaveClass(/max-w-fit/);
    await expect(back).toHaveClass(/border/);
    await expect(back.locator(".fa-arrow-left")).toHaveCount(1);

    const download = page.getByRole("link", { name: "Baixar guia sintética" });
    await expect(download).toHaveAttribute("download", "guia-sintetica.txt");
    await expect(download).toHaveAttribute("href", "data:text/plain,guia-sintetica");
    await expect(download).toHaveClass(/bg-\[var\(--color-brand-accent\)\]/);
    await expect(download.locator(".fa-arrow-right")).toHaveCount(1);

    const withoutNavigate = page.locator("#g-link-sem-navigate");
    await expect(withoutNavigate).toHaveCount(1);
    await expect(withoutNavigate).not.toHaveAttribute("href", /.+/);
    await expect(page.getByRole("link", { name: "Link sem destino" })).toHaveCount(0);
  });

  test("navega por teclado sem sair da suíte", async ({ page }) => {
    const link = page.getByRole("link", { name: "Voltar para programas" });
    await link.press("Enter");
    await expect(page).toHaveURL(/\/componentes#destino-link-button$/);
  });

  test("copy_button agrega cópias alternadas em uma pilha global persistente", async ({ page }) => {
    const checkin = page.getByRole("button", { name: "Link de Checkin" });
    const guia = page.getByRole("button", { name: "Código da guia" });
    const checkinText = "https://exemplo.invalid/auto-checkin/unidade-girassol";
    const guiaText = "GUIA-SINTETICA-2026";
    await expect(checkin).toHaveAttribute("id", "g-copy-checkin");
    await expect(checkin).toHaveAttribute("type", "button");
    await expect(checkin).toHaveAttribute("data-text", checkinText);
    await expect(checkin).toHaveAttribute("name", "link_checkin");
    await expect(checkin).toHaveAttribute("value", "unidade-girassol");
    await expect(checkin).toHaveClass(/block/);
    await expect(checkin.locator(".fa-link")).toHaveCount(1);
    await expect(guia).toHaveAttribute("form", "g-copy-form");

    const host = page.locator("[data-toast-host]");
    await expect(host).toHaveCount(1);
    await expect(page.locator("[aria-live='polite']")).toHaveCount(1);
    await checkin.press("Enter");
    await guia.press("Enter");
    await checkin.press("Enter");
    await guia.press("Enter");
    await expect.poll(() => page.evaluate(() => (window as unknown as { __clipboardCopies: string[] }).__clipboardCopies)).toEqual([
      checkinText, guiaText, checkinText, guiaText,
    ]);

    const toasts = host.locator("[data-toast-id]");
    await expect(toasts).toHaveCount(4);
    await expect(toasts.locator("p:first-child")).toHaveText(["Copiado!", "Copiado!", "Copiado!", "Copiado!"]);
    await expect.poll(() => toasts.evaluateAll((items) => items.map((item) => item.getAttribute("data-toast-id")))).toEqual(["1", "2", "3", "4"]);

    await toasts.nth(1).getByRole("button", { name: "Fechar Copiado!" }).press("Enter");
    await expect(toasts).toHaveCount(3);
    await expect.poll(() => toasts.evaluateAll((items) => items.map((item) => item.getAttribute("data-toast-id")))).toEqual(["1", "3", "4"]);
  });

  test("disabled, tamanho pequeno e ausência de cópia ficam nativos", async ({ page }) => {
    const disabled = page.getByRole("button", { name: "Copiar desabilitado" });
    await expect(disabled).toBeDisabled();
    await expect(disabled).toHaveAttribute("title", "Cópia indisponível");
    await expect(disabled).toHaveClass(/h-8/);
    await expect(disabled).toHaveClass(/bg-\[var\(--color-green\)\]/);
    await disabled.press("Enter");
    expect(await page.evaluate(() => (window as unknown as { __clipboardCopies: string[] }).__clipboardCopies)).toEqual([]);
    await expect(page.locator("[data-toast-id]")).toHaveCount(0);
  });

  test("publica sucesso imediatamente sem inventar estado para rejeição assíncrona", async ({ page }) => {
    await page.evaluate(() => {
      window.addEventListener("unhandledrejection", (event) => event.preventDefault());
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async () => { throw new Error("clipboard indisponível"); } },
      });
    });
    await page.getByRole("button", { name: "Link de Checkin" }).press("Enter");
    const liveRegion = page.locator("[aria-live='polite']");
    await expect(liveRegion.getByText("Copiado!", { exact: true })).toBeVisible();
    await expect(liveRegion.getByText(/erro|falha/i)).toHaveCount(0);
  });

  test("não introduz violações estruturais ou relações ARIA quebradas", async ({ page }) => {
    await page.getByRole("button", { name: "Link de Checkin" }).press("Enter");
    const results = await new AxeBuilder({ page })
      .include("#g-link-buttons")
      .include("#g-copy-buttons")
      .include("[data-toast-host]")
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
