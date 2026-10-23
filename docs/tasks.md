# Tareas del MVP

Formato: `- [ ] Txx Descripción (est: Xh, real: Yh)`. La estimación se fija antes de empezar y el tiempo real se registra al cerrar. Dependencias entre corchetes.

## F1 · Base del repositorio y especificación

- [x] T01 Inicializar Git, `.gitignore`, remoto, protección de `main`, secret scanning y Dependabot (est: 0.5h, real: 0.2h)
  - Criterio: `git status` limpio; `init.md` y `contexto-inicial.md` ignorados; `main` exige PR y checks.
  - Verificación: `git check-ignore -v init.md contexto-inicial.md`; `gh api repos/netfoor/specter/branches/main/protection`.
- [x] T02 Documentación SDD/DDD: constitución, spec, dominio, arquitectura, ADR, seguridad, plan y tareas [T01] (est: 3h, real: 0.4h)
  - Criterio: `docs/` abre en Obsidian y GitHub con enlaces válidos.
  - Verificación: revisión del responsable del producto.

## F2 · Esqueleto desplegado (D1)

- [x] T03 Esqueleto Vite + React + TS, layout `ui-minimal`, landing, banner de demostración y sección "Próximamente" [T01] (est: 3h, real: 0.3h)
  - Criterio: `npm run build`, `npm run lint` y `npm test` pasan.
- [x] T04 Amplify Gen 2: auth por correo, grupos y post-confirmación por rol [T03] (est: 3h, real: 0.2h)
  - Criterio: un registro como cliente y otro como abogado quedan en su grupo; no existe ruta para autoasignarse `ADMIN`.
- [ ] T05 Terraform: estado en S3, app de Amplify, rama `main`, dominio, DNS en Cloudflare y presupuesto [T03] (est: 4h)
  - Criterio: `https://specter.foor.dev` sirve la landing con TLS válido; `terraform plan` sin cambios.
  - Bloqueo: token de Cloudflare con `Zone:DNS:Edit` sobre `foor.dev` en `.env`.
- [ ] T06 CI en GitHub Actions: lint, typecheck y pruebas [T03] (est: 1h)
  - Criterio: un PR con una prueba rota queda bloqueado.

## F3 · Red profesional (D2)

- [x] T07 Modelo de datos y reglas de autorización de todas las entidades [T04] (est: 4h, real: 0.7h)
  - Criterio: con tres usuarios (cliente, abogado, ajeno) ninguna lectura o escritura prohibida tiene éxito.
- [x] T08 Perfil de abogado (edición), directorio público y perfil detallado [T07] (est: 4h, real: 0.2h)
  - Criterio: un visitante ve solo perfiles publicados; el abogado no puede cambiar `publicado` ni `estadoVerificacion`.
- [x] T09 Panel admin: publicar, verificar manualmente y contadores del piloto [T07] (est: 2h, real: 0.6h)
  - Criterio: solo `ADMIN` accede; la insignia "Verificado manualmente por Specter" aparece al marcarlo.
- [x] T10 Script de datos de demostración: ~12 abogados ficticios y cuentas de prueba [T07] (est: 2h, real: 0.5h)
  - Criterio: ejecutarlo dos veces no duplica datos.

## F4 · Descubrimiento (D3–D4)

- [x] T11 Asunto: formulario guiado y "Mis asuntos" [T07] (est: 3h, real: 0.7h)
  - Criterio: el cliente crea, edita y publica un borrador; ningún otro usuario lo ve.
- [x] T12 `shared/domain/matching`, vista de coincidencias y comparación de hasta 3 perfiles [T08, T11] (est: 4h, real: 0.8h)
  - Criterio: resultados ordenados por puntuación, con los criterios que coincidieron; pruebas con casos tabla.
- [ ] T13 NIA: Lambda + Bedrock, chat, prellenado del asunto, aviso y tope diario [T11] (est: 5h)
  - Criterio: ≥ 8 de 10 materias correctas en el set de prueba; deriva a abogado y nunca da asesoría concreta.

## F5 · Contratación (D5)

- [ ] T14 `flujo-asunto`: solicitud, aceptación con declaración de no conflicto, rechazo, retiro y propuesta [T12] (est: 4h)
  - Criterio: transiciones inválidas rechazadas en el servidor; máximo 3 solicitudes activas por asunto.
- [ ] T15 Contrato desde plantilla, `calcularDesglose` y doble aceptación que crea el expediente [T14] (est: 3h)
  - Criterio: 10,000 → comisión 1,000 / abogado 9,000; leyenda "sin validez jurídica"; las demás solicitudes pasan a `RETIRADA`.

## F6 · Expediente (D6)

- [ ] T16 Expediente: chat en tiempo real, bitácora automática y conclusión [T15] (est: 4h)
  - Criterio: dos sesiones ven los mensajes en vivo; un tercero no tiene acceso; solo el abogado concluye.
- [ ] T17 Documentos: Lambda de URL prefirmada y lista en el expediente [T16] (est: 3h)
  - Criterio: solo participantes; máximo 10 MB y tipos permitidos; un usuario ajeno recibe acceso denegado.

## F7 · Integración y pulido (D7)

- [ ] T18 Prueba E2E con Playwright del recorrido completo contra `specter.foor.dev` [T16, T17] (est: 3h)
- [ ] T19 Aviso de privacidad y términos de demostración, pulido visual y accesibilidad básica [T03] (est: 2h)

## F8 · Validación (D7)

- [ ] T20 Guion de demostración, etiqueta `feedback`, issues de los pendientes P1–P9 y backlog v2 [T18] (est: 1h)
