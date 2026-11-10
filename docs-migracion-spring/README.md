# Fábrica Backend · Guía web

Web estática de documentación para la migración completa del proyecto Java/BlueJ a Spring Boot, REST, MySQL y Docker.

## Desarrollo

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Verificación

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

El contenido visible y la descarga usan una sola fuente: `public/MIGRACION_SPRING_BOOT.md`.
