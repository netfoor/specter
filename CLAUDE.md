# Specter: reglas del repositorio

- Fuente de verdad: `docs/spec.md`, `docs/plan.md`, `docs/tasks.md` y `docs/dominio/`. Léelos antes de implementar una tarea.
- Ejecuta una tarea de `docs/tasks.md` a la vez, en su propia rama (`feat/tNN-…`), y detente al terminarla.
- Respeta `docs/constitucion.md`: no simules capacidades inexistentes; las transiciones de estado y los permisos se aplican en el servidor.
- Usa los términos de `docs/dominio/lenguaje-ubicuo.md` en código e interfaz (español, sin acentos en identificadores).
- El repositorio es **público**: nunca commitees secretos, `.env`, estado de Terraform, `amplify_outputs.json` ni IDs de cuenta.
- Lógica de dominio en `shared/domain/` con pruebas en Vitest.
- Interfaz: sigue la skill `ui-minimal`.
- Infraestructura solo como código: Amplify Gen 2 (`amplify/`) y Terraform (`infra/terraform/`).
- Antes de cerrar una tarea: `npm run lint && npm run typecheck && npm test`.
- Commits convencionales en español, sin líneas de coautoría.
