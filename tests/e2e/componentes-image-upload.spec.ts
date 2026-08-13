import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const png = (name: string) => ({ name, mimeType: "image/png", buffer: PNG_1X1 });

test.describe("catálogo — image_upload", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const originalCreate = URL.createObjectURL.bind(URL);
      const originalRevoke = URL.revokeObjectURL.bind(URL);
      Object.defineProperty(window, "__imageUploadUrls", {
        value: { created: [] as string[], revoked: [] as string[] },
        configurable: true,
      });
      URL.createObjectURL = (object) => {
        const url = originalCreate(object);
        (window as typeof window & { __imageUploadUrls: { created: string[] } }).__imageUploadUrls.created.push(url);
        return url;
      };
      URL.revokeObjectURL = (url) => {
        (window as typeof window & { __imageUploadUrls: { revoked: string[] } }).__imageUploadUrls.revoked.push(url);
        originalRevoke(url);
      };
    });
    await page.goto("/?component=core.image-upload");
  });

  test("preserva contrato, aciona o seletor por ponteiro e anuncia a seleção", async ({ page }) => {
    const wrapper = page.locator("#g-image-upload-wrapper");
    const input = page.locator("#g-image-upload");
    const preview = wrapper.getByRole("img");

    await expect(wrapper).toHaveClass(/\bflex items-center gap-4\b/);
    await expect(input).toHaveAttribute("id", "g-image-upload");
    await expect(input).toHaveAttribute("name", "profissional[avatar_url]");
    await expect(input).toHaveAttribute("accept", ".jpg,.jpeg,.png");
    await expect(input).toHaveAttribute("type", "file");
    await expect(input).toHaveClass("hidden");
    await expect(preview).toHaveAttribute("alt", "Imagem atual");
    await expect(wrapper.getByRole("status")).toHaveCount(1);
    await expect(wrapper.getByRole("button", { name: "Adicionar Foto" })).toHaveAttribute("aria-controls", "g-image-upload");

    const chooserPromise = page.waitForEvent("filechooser");
    await wrapper.getByRole("button", { name: "Adicionar Foto" }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles(png("avatar-ponteiro.png"));

    await expect(preview).toHaveAttribute("src", /^blob:/);
    await expect(preview).toHaveAttribute("alt", "Pré-visualização de avatar-ponteiro.png");
    await expect(wrapper.getByRole("status")).toHaveText("avatar-ponteiro.png selecionado.");
    await expect(page.getByText("avatar-ponteiro.png pronto para envio.")).toBeVisible();
  });

  test("aciona com Enter, substitui duas vezes e revoga a primeira URL", async ({ page }) => {
    const wrapper = page.locator("#g-image-upload-wrapper");
    const choose = wrapper.getByRole("button", { name: "Adicionar Foto" });

    const firstChooserPromise = page.waitForEvent("filechooser");
    await choose.press("Enter");
    await (await firstChooserPromise).setFiles(png("avatar-primeiro.png"));

    const firstUrl = await wrapper.getByRole("img").getAttribute("src");
    expect(firstUrl).toMatch(/^blob:/);

    const secondChooserPromise = page.waitForEvent("filechooser");
    await choose.click();
    await (await secondChooserPromise).setFiles(png("avatar-segundo.png"));

    await expect(wrapper.getByRole("img")).toHaveAttribute("alt", "Pré-visualização de avatar-segundo.png");
    const urls = await page.evaluate(() =>
      (window as typeof window & { __imageUploadUrls: { created: string[]; revoked: string[] } }).__imageUploadUrls,
    );
    expect(urls.created).toHaveLength(2);
    expect(urls.revoked).toContain(firstUrl);
    expect(urls.revoked).not.toContain(urls.created[1]);
  });

  test("revoga a URL ativa no unmount e restaura previousUrl na remontagem", async ({ page }) => {
    const wrapper = page.locator("#g-image-upload-wrapper");
    const previousUrl = await wrapper.getByRole("img").getAttribute("src");

    const chooserPromise = page.waitForEvent("filechooser");
    await wrapper.getByRole("button", { name: "Adicionar Foto" }).click();
    await (await chooserPromise).setFiles(png("avatar-temporario.png"));
    const activeUrl = await wrapper.getByRole("img").getAttribute("src");
    expect(activeUrl).toMatch(/^blob:/);

    await page.getByRole("button", { name: /^avatar\b/ }).click();
    await expect(page).toHaveURL(/component=core\.avatar/);
    const afterUnmount = await page.evaluate(() =>
      (window as typeof window & { __imageUploadUrls: { revoked: string[] } }).__imageUploadUrls,
    );
    expect(afterUnmount.revoked).toContain(activeUrl);

    await page.goBack();
    await expect(page).toHaveURL(/component=core\.image-upload/);
    await expect(page.locator("#g-image-upload-wrapper").getByRole("img")).toHaveAttribute("src", previousUrl ?? "");
    await expect(page.locator("#g-image-upload-wrapper").getByRole("img")).toHaveAttribute("alt", "Imagem atual");
  });

  test("não introduz violações automáticas no wrapper", async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include("#g-image-upload-wrapper")
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
