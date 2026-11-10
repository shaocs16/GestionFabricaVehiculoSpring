import { test, expect } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 900 },
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
    await expect(page.locator("#toc a")).toHaveCount(15);
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
