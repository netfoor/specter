# Plan técnico del MVP

Basado en [spec.md](spec.md) y [constitucion.md](constitucion.md). Arquitectura detallada en [arquitectura/arquitectura.md](arquitectura/arquitectura.md). Tareas en [tasks.md](tasks.md).

## Estructura del repositorio

```
amplify/
  auth/resource.ts
  data/resource.ts
  storage/resource.ts
  functions/{post-confirmacion,flujo-asunto,nia-chat,url-documento}/
  backend.ts
src/
  app/                rutas, layout, proveedores
  features/           auth, perfiles, asuntos, matching, contratacion, expediente, nia, admin
  ui/                 componentes base y tokens visuales
shared/domain/        desglose, matching, estados (TS puro, con pruebas)
infra/terraform/      app de Amplify, dominio, DNS de Cloudflare, presupuesto
scripts/seed/         datos de demostración
tests/e2e/            Playwright
docs/                 esta documentación
```

## Stack y herramientas

| Necesidad | Elección |
|---|---|
| Paquetes | npm (Node 22) |
| Front | Vite, React, TypeScript, React Router, Amplify UI (`Authenticator`) |
| Backend | Amplify Gen 2 (`npx ampx`) |
| Validación | `zod` |
| Pruebas unitarias | Vitest |
| E2E | Playwright |
| Calidad | ESLint, Prettier, `tsc --noEmit` |
| IaC de plataforma | Terraform ≥ 1.10 con proveedores `aws` y `cloudflare` |

## Fases

| Fase | Día | Resultado visible | Tareas |
|---|---|---|---|
| F1 Base del repo y especificación | D0 | Repo y documentación | T01–T02 |
| F2 Esqueleto desplegado | D1 | Landing y login en `specter.foor.dev` | T03–T06 |
| F3 Red profesional | D2 | Directorio con perfiles de demostración y panel admin | T07–T10 |
| F4 Descubrimiento | D3–D4 | Asunto, matching, comparación y NIA | T11–T13 |
| F5 Contratación | D5 | Solicitud → contrato con desglose → expediente | T14–T15 |
| F6 Expediente | D6 | Chat en vivo, documentos, bitácora | T16–T17 |
| F7 Integración y pulido | D7 | Recorrido E2E verde, aviso de privacidad | T18–T19 |
| F8 Validación | D7 | Guion de demostración y backlog v2 | T20 |

**Paralelizables:** T04 ∥ T05 ∥ T06 (después de T03); T08 ∥ T09 ∥ T10 (después de T07); T13 ∥ T14; T19 en cualquier momento después de T03.

**Ruta crítica:** T01 → T03 → T04 → T07 → T11 → T12 → T14 → T15 → T16 → T18.

## Estrategia de pruebas

| Nivel | Qué cubre | Cuándo corre |
|---|---|---|
| Unitarias (Vitest) | `shared/domain`: desglose, matching, máquina de estados | Cada PR |
| Autorización | Tres usuarios (cliente, abogado, ajeno) contra el sandbox: lecturas y escrituras prohibidas | T07, T17 y antes de cada demostración |
| NIA | 10 descripciones de prueba con la materia esperada (≥ 8 aciertos) y casos que exigen derivar a un abogado | T13 y al cambiar de modelo |
| E2E (Playwright) | Recorrido completo contra `specter.foor.dev` | Manual (`workflow_dispatch`) |
| Humo de despliegue | `curl -I https://specter.foor.dev` → 200 | Después de cada despliegue |

## Flujo de trabajo

- Rama por tarea (`feat/t03-esqueleto`), PR con checks verdes y merge a `main`, que despliega automáticamente.
- Commits convencionales en español (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- La retroalimentación de las demostraciones se registra como GitHub Issues con la etiqueta `feedback`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Acceso a Bedrock no habilitado o cuota baja | Probar en T13 con `aws bedrock-runtime converse` y habilitar el acceso al modelo |
| Conexión de `aws_amplify_app` con GitHub vía Terraform | Alternativa: script con `aws amplify create-app` |
| Proxy de Cloudflare rompe la validación de ACM | Registros con `proxied = false` |
| Autorización entre participantes mal configurada | Pruebas obligatorias en T07 y T17 |
| Alcance de una semana | Lo visible primero; T13 y T17 pueden pasar a la semana 2 sin romper el flujo |
