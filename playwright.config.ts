import { defineConfig, devices } from "@playwright/test";
import { devPort } from "./dev-port.js";

/**
 * Playwright aponta direto para a URL do preview.
 *
 * Isso é consequência de D-11: como o preview é público, não há proteção de
 * acesso, então não há segredo de bypass, header de automação nem shareable link
 * a emitir e revogar. No CI, `PREVIEW_URL` é a URL que o `deploy.yml` acabou de
 * publicar — a jornada testa o artefato real, não um build local.
 *
 * Sem `PREVIEW_URL`, sobe o dev server local — mesmo teste, mesma jornada.
 */
const previewUrl = process.env.PREVIEW_URL;
const localUrl = `http://localhost:${devPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // `journey.spec.ts` é o arquivo histórico do baseline importado. Ele fica no
  // repositório como registro, mas `ported` não é trabalho validado nem caso de
  // teste. Jornadas ativas vivem em `active-journey.spec.ts`.
  testIgnore: ["**/journey.spec.ts"],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: previewUrl ?? localUrl,
    trace: "on-first-retry",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: previewUrl
    ? undefined
    : {
        command: "pnpm dev",
        url: localUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
