import { expect, test } from "@playwright/test";
import { pathFor } from "@brucesantos/design-space/testing";
import { activeScenarios as scenarios } from "./active-scenarios.js";

/**
 * A mesma URL em três fusos.
 *
 * O teste de determinismo que já existia compara a página **consigo mesma**, no
 * mesmo navegador e no mesmo fuso — e por isso passava enquanto a mesma URL
 * mostrava 08:00 em São Paulo, 12:00 em Lisboa e 20:00 em Tóquio.
 *
 * `Intl.DateTimeFormat` sem `timeZone` formata no fuso de quem olha. Horário de
 * atendimento é do lugar onde o atendimento acontece: o monólito fixa
 * `America/Sao_Paulo` em `CalendarHelper.local_timezone/0`, e este Design Space
 * passou a fixar o mesmo em `CLINIC_TIMEZONE`.
 *
 * Um recorte de cenários com horário visível basta — o formatador é um só, e
 * rodar três contextos por cenário nos 186 custaria minutos sem achar mais nada.
 */
const COM_HORARIO = [
  "agenda.day",
  "session.ready",
  "in-clinic.morning",
  "clinical-hours.week",
  "supervision.awaiting-signature",
  // `supervision.team` fica de fora **de propósito**: o horário dela só aparece
  // depois de escolher um paciente, e esta varredura mede a primeira tela. Posta
  // aqui, ela compararia três strings vazias e passaria sem medir nada. O fuso
  // dessa tela é verificado em `active-journey.spec.ts`, com o clique.
  "notifications.unread-list",
];

test.setTimeout(180_000);

test("a mesma URL mostra o mesmo horário em qualquer fuso", async ({ browser }) => {
  const divergem: string[] = [];
  const scenariosComHorario = scenarios.filter((scenario) => COM_HORARIO.includes(scenario.id));

  test.skip(
    scenariosComHorario.length === 0,
    "Nenhum cenário ativo desta entrega apresenta horário.",
  );

  for (const scenario of scenariosComHorario) {
    const leituras: Record<string, string> = {};

    for (const fuso of ["America/Sao_Paulo", "Europe/Lisbon", "Asia/Tokyo"]) {
      const contexto = await browser.newContext({ timezoneId: fuso });
      const page = await contexto.newPage();
      await page.goto(pathFor(scenario, { chrome: false }));
      await page.waitForSelector("#conteudo", { state: "attached" });
      await page
        .locator("#conteudo")
        .getByRole("heading")
        .first()
        .waitFor({ timeout: 5000 })
        .catch(() => {});

      leituras[fuso] = await page.evaluate(() => {
        const texto = (document.querySelector("#conteudo") as HTMLElement).innerText;
        return (texto.match(/\d{2}:\d{2}/g) ?? []).slice(0, 8).join(",");
      });

      await contexto.close();
    }

    const valores = [...new Set(Object.values(leituras))];
    if (valores.length > 1) {
      divergem.push(
        `${scenario.id}: ${Object.entries(leituras)
          .map(([fuso, horas]) => `${fuso}=${horas}`)
          .join(" | ")}`,
      );
    }
  }

  expect(divergem, "horário que muda com o fuso de quem olha").toEqual([]);
});
