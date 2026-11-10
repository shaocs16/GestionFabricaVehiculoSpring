import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const markdown = await readFile(
  new URL("../public/MIGRACION_SPRING_BOOT.md", import.meta.url),
  "utf8",
);

test("la guía conserva los 18 capítulos y separa los niveles", () => {
  const chapters = markdown.match(/^## \d+\./gm) || [];
  assert.equal(chapters.length, 18);
  assert.match(markdown, /## 16\. Nivel mid-advanced: órdenes de fabricación/);
  assert.match(markdown, /## 17\. Nivel advanced: sistema completo de simulación/);
  assert.match(markdown, /## 18\. Resultado final/);
  assert.match(markdown, /data-api-graph/);
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
  assert.match(markdown, /CREATE TABLE production_orders/);
  assert.match(markdown, /CREATE TABLE production_order_lines/);
  assert.match(markdown, /CREATE TABLE component_reservations/);
  assert.match(markdown, /CREATE TABLE assembly_operations/);
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
    "órdenes de fabricación",
    "sistema completo de simulación",
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
