import { test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { pathFor } from "@brucesantos/design-space/testing";
import { scenarios } from "../../src/app/catalog.js";

// Temporário: identifica exatamente quais nós o axe reprova.
test("dump", async ({ page }) => {
  const scenario = scenarios.find((s) => s.id === "agenda.day")!;
  await page.goto(pathFor(scenario, { chrome: false }));
  await page.locator("#conteudo").waitFor();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  for (const v of results.violations) {
    console.log(`\n### ${v.id} [${v.impact}] — ${v.nodes.length} nó(s)`);
    for (const n of v.nodes) {
      console.log(`  target: ${JSON.stringify(n.target)}`);
      console.log(`  html:   ${n.html.slice(0, 200)}`);
      console.log(`  msg:    ${n.failureSummary?.replace(/\n/g, " | ")}`);
    }
  }

  // O painel do coletor está presente na página?
  const collectorPresent = await page.evaluate(() => ({
    dataFbc: document.querySelectorAll("[data-fbc]").length,
    panelText: document.body.innerText.includes("segure ALT + clique"),
  }));
  console.log(`\n### coletor: ${JSON.stringify(collectorPresent)}`);
});
