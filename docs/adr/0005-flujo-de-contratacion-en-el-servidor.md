# ADR-0005: Flujo de contratación en el servidor con transacciones

- **Estado:** aceptada
- **Fecha:** 2026-10-23

## Contexto

La solicitud, la aceptación con declaración de no conflicto y la propuesta de honorarios cambian estados que el cliente web no puede escribir (ADR-0004). Hay reglas que dependen de varios registros a la vez: máximo tres solicitudes activas por asunto, sin duplicados con el mismo abogado, y solo los abogados con solicitud activa pueden leer el asunto.

## Decisión

1. **Una función, `flujo-asunto`,** atiende cuatro mutaciones: `enviarSolicitud` y `retirarSolicitud` (grupo `CLIENTE`), y `responderSolicitud` y `proponerHonorarios` (grupo `ABOGADO`). El grupo se exige en el esquema; la función comprueba además que la persona participe en lo que cambia.
2. **Invariante:** `Asunto.lectores` contiene exactamente a los abogados con una solicitud activa (enviada o aceptada). Al enviar se agrega el abogado; al retirar o rechazar se quita. De ahí salen el límite, la prohibición de duplicados y quién lee el asunto.
3. **Leer, decidir y escribir con condiciones.** Cada operación lee los registros, decide con el dominio puro (`shared/domain/flujo.ts`) para dar un error preciso, y escribe en una transacción de DynamoDB cuyas condiciones repiten las reglas (dueño, asunto abierto, `NOT contains(lectores)`, `size(lectores) < 3`, estado de origen). Si algo cambió entre la lectura y la escritura, la transacción se cancela y se informa `CONFLICTO`.
4. **Reglas confirmadas con el responsable del producto:**
   - El abogado no puede rechazar una solicitud ya aceptada; solo el cliente puede retirarla.
   - Se puede reenviar al mismo abogado solo si la solicitud anterior fue retirada o rechazada.
5. **Una propuesta por solicitud:** su id es el de la solicitud y se reemplaza al actualizarla mientras el asunto siga disponible.
6. **Errores como códigos estables** (`NO_ENCONTRADO`, `SOLICITUD_DUPLICADA`, `LIMITE_SOLICITUDES`, `ESTADO_INVALIDO`, `DECLARACION_REQUERIDA`, `ASUNTO_NO_DISPONIBLE`, `DATOS_INVALIDOS`, `CONFLICTO`). Un asunto o una solicitud ajenos se informan como inexistentes.

## Alternativas descartadas

- **Mutaciones de Amplify Data desde la función (IAM):** no permiten condiciones sobre varios registros en una sola operación, así que el límite de tres podía romperse con envíos simultáneos.
- **Contar solicitudes con una consulta antes de escribir:** tiene la misma carrera. La prueba de integración envía dos solicitudes a la vez con un solo lugar libre y solo una entra.

## Consecuencias

- Las escrituras directas a DynamoDB no disparan suscripciones de AppSync; las pantallas se recargan tras cada acción.
- Si el cliente vuelve su asunto a borrador, los abogados con solicitud activa lo siguen leyendo, pero no pueden aceptar ni proponer hasta que vuelva a abrirse.
- La API de Amplify devuelve solo el `sub` en los campos de propietario como `lectores`, aunque en la base se guarde `sub::username`.

## Contrato y cierre (T15)

- **Preparar** (`prepararContrato`, solo el cliente de la solicitud): guarda una instantánea del contrato con su id igual al de la solicitud. Incluye el texto de la plantilla con los nombres de las partes (el del cliente, de Cognito; el del abogado, de su perfil), los montos del desglose y la versión de la propuesta.
- **Aceptar** (`aceptarContrato`, cliente o abogado): exige confirmar que es una aceptación de demostración sin validez jurídica. Desde la primera aceptación, la propuesta queda fija (`CONTRATO_EN_CURSO`). Si el abogado cambia la propuesta antes de cualquier aceptación, el contrato preparado se descarta y hay que prepararlo de nuevo.
- **Cerrar** con la segunda aceptación, en una sola transacción:
  - el contrato queda aceptado;
  - se crea el expediente con una primera actuación (`CONTRATACION`);
  - el asunto pasa a `CONTRATADO` y en `lectores` queda solo el abogado contratado;
  - las demás solicitudes activas pasan a `RETIRADA`.
- **Consistencia del cierre:** las demás solicitudes se buscan con el índice `solicitudsByAsuntoId`, que es eventualmente consistente; se cotejan con `lectores` (lectura consistente) y, si no cuadran, se cancela y se reintenta una vez. Una aceptación repetida al mismo tiempo deja un solo expediente.
- **Tras contratar** ya no se puede retirar, rechazar, enviar ni proponer sobre ese asunto (`ASUNTO_NO_DISPONIBLE`).
- **Plantilla de demostración** pendiente de revisión jurídica: la jurisdicción queda «pendiente de definir» (duda D9) y los impuestos «por definir» (duda D4).
