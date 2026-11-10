import { test, expect } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`documentación completa ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Migración completa a Spring Boot",
    );
    await expect(
      page.getByRole("heading", { name: /SQL completo/ }),
    ).toBeVisible();
    await expect(page.locator("#toc a")).toHaveCount(18);
    await expect(
      page.locator("pre code").filter({ hasText: "CREATE TABLE workers" }),
    ).toBeAttached();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    expect(errors).toEqual([]);
  });
}

test("búsqueda, deep link y copia están disponibles", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Buscar en la documentación").fill("Flyway");
  await expect(page.locator("#search-results")).toBeVisible();
  await expect(
    page.getByText(/secciones encontradas|sección encontrada/),
  ).toBeVisible();
  await expect(page).toHaveURL(/\?q=Flyway/);
  await page.keyboard.press("Escape");
  await expect(page.locator("#search-results")).toBeHidden();

  await page.goto("/#9-sql-completo-para-crear-las-tablas");
  await expect(
    page.getByRole("heading", { name: /SQL completo/ }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: /Copiar bloque de sql/ }).first(),
  ).toBeVisible();
});

test("el explorador 3D permite consultar el contrato completo", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/#18-resultado-final", { waitUntil: "domcontentloaded" });
  await page.locator(".api-inspector").waitFor();
  await page.locator("[data-api-canvas]").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-api-canvas]")).toBeInViewport();
  await expect(page.locator("[data-api-title]")).toHaveText(
    "Mapa de dependencias",
  );
  await page.locator('[data-api-id="simulation"]').click();
  await expect(page.locator("[data-api-title]")).toHaveText("Simulación");
  await expect(page.locator("[data-api-endpoints]")).toContainText(
    "/simulations",
  );
  await page.locator('[data-endpoint-index="0"]').click();
  await expect(page.locator("[data-api-contract-status]")).toContainText(
    "202 Accepted",
  );
  await expect(page.locator("[data-api-contract-request]")).toContainText(
    '"productionOrderId": 15',
  );
  await expect(page.locator("[data-api-contract-response]")).toContainText(
    '"status": "PENDING"',
  );
  await expect(page.locator("[data-api-role]")).not.toBeEmpty();
  await expect(page.locator("[data-api-transaction]")).not.toBeEmpty();
  await expect(page.locator("[data-api-entities]")).not.toBeEmpty();
  await expect(page.locator("[data-api-contract-errors]")).toContainText("409");
  await expect(page).toHaveURL(/api=simulation&endpoint=simulations/);
  await page.getByLabel("Buscar endpoint").fill("pausar");
  await expect(page.locator("[data-api-endpoints] button")).toHaveCount(1);
  await page.getByLabel("Buscar endpoint").fill("");
  await page.getByLabel("Método").selectOption("POST");
  await expect(page.locator("[data-api-endpoints]")).not.toContainText(
    "Consultar ejecución",
  );
  await page.getByRole("button", { name: "Arquitectura completa" }).click();
  await expect(page.locator("[data-api-title]")).toHaveText(
    "Mapa de dependencias",
  );
  await expect(page.locator("body")).not.toContainText("undefined");
  await page.screenshot({
    path: "test-results/api-explorer.png",
    fullPage: false,
  });
  await page.locator("[data-api-canvas]").screenshot({
    path: "test-results/api-canvas.png",
  });
});

test("restaura la selección desde URL y Three.js se carga diferido", async ({
  page,
}) => {
  const scripts = [];
  page.on("response", (response) => {
    if (response.url().includes("api-graph")) scripts.push(response.url());
  });
  await page.goto("/?api=orders&endpoint=confirm#18-resultado-final");
  await page.locator(".api-inspector").waitFor();
  await page.locator("[data-api-canvas]").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-api-title]")).toHaveText("Órdenes");
  await expect(page.locator("[data-api-contract-path]")).toHaveText(
    "/production-orders/{id}/confirm",
  );
  expect(scripts.some((url) => /api-graph-.*\.js/.test(url))).toBe(true);
});

test("reduced motion mantiene el explorador visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#18-resultado-final");
  await page.locator(".api-inspector").waitFor();
  await page.locator("[data-api-canvas]").scrollIntoViewIfNeeded();
  await page.locator('[data-api-id="orders"]').click();
  await expect(page.locator("[data-api-contract]")).toBeVisible();
});
