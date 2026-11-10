import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const markdown = await readFile(
  new URL("../public/MIGRACION_SPRING_BOOT.md", import.meta.url),
  "utf8",
);

test("la guía conserva los 15 capítulos", () => {
  const chapters = markdown.match(/^## \d+\./gm) || [];
  assert.equal(chapters.length, 15);
});

test("incluye configuración, Docker y esquema completo", () => {
  assert.match(markdown, /## 7\. Configuración de `application\.yml`/);
  assert.match(markdown, /## 8\. Docker Compose para MySQL/);
  assert.match(markdown, /CREATE TABLE workers/);
  assert.match(markdown, /CREATE TABLE motors/);
  assert.match(markdown, /CREATE TABLE upholsteries/);
  assert.match(markdown, /CREATE TABLE wheels/);
  assert.match(markdown, /CREATE TABLE vehicles/);
  assert.match(markdown, /CREATE TABLE vehicle_wheels/);
  assert.match(markdown, /CREATE TABLE simulation_executions/);
  assert.match(markdown, /CREATE TABLE simulation_mechanics/);
  assert.match(markdown, /CREATE TABLE simulation_robots/);
  assert.match(markdown, /CREATE TABLE assembly_history/);
  assert.match(markdown, /CREATE TABLE dashboard_events/);
});

test("documenta todos los dominios y contratos", () => {
  for (const term of [
    "Gestión de motores",
    "Gestión de tapicerías",
    "Gestión de ruedas",
    "Gestión de trabajadores",
    "Gestión de vehículos",
    "Cadena de montaje",
    "Comprobación de stock",
    "Simulaciones",
    "Dashboard",
    "Historial",
    "Estadísticas",
    "Endpoints REST completos",
    "Métodos principales de los servicios",
    "Validaciones necesarias",
    "Manejo de errores",
  ]) {
    assert.ok(markdown.includes(term), `Falta el contenido: ${term}`);
  }
});
