# Explorador de arquitectura — Rust

Aplicación documental para explorar la migración de Gestión Fábrica de Vehículos a Spring Boot. El servidor está escrito en Rust sin dependencias externas y el cliente usa Vite + Three.js con carga diferida.

## Desarrollo

```bash
npm install
npm run dev
```

## Build y servidor Rust

```bash
npm run build
cargo run --release
```

La aplicación queda disponible en `http://127.0.0.1:3000`. Se puede cambiar el puerto con la variable `PORT`.

## Validación

```bash
npm test
npm run test:e2e
cargo fmt -- --check
```
