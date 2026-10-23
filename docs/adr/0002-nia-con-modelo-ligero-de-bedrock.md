# ADR-0002: NIA con un modelo ligero de Amazon Bedrock

- **Estado:** aceptada
- **Fecha:** 2026-10-22

## Contexto

NIA es un diferenciador visible para posibles compradores, pero en el MVP solo necesita demostrar orientación y clasificación de la materia. El costo debe mantenerse bajo.

## Hechos

En `us-east-1`, Bedrock lista `amazon.nova-micro-v1:0` y `amazon.nova-lite-v1:0` (on-demand) y `anthropic.claude-haiku-5-5` (perfil de inferencia). Falta confirmar que el acceso a los modelos esté habilitado en la cuenta.

## Decisión

- Modelo por defecto: **`amazon.nova-lite-v1:0`**, configurable con la variable de entorno `NIA_MODEL_ID`. Si la calidad en español no alcanza el criterio de aceptación, se cambia a `claude-haiku-5-5` sin tocar código.
- Lambda `nia-chat` con Converse API, `maxTokens` acotado y salida estructurada `{ materia, resumen, datosFaltantes }`.
- Prompt de sistema que limita a NIA a orientar, clasificar y preparar, y que deriva a un abogado.
- Tope diario de mensajes por usuario.
- Las conversaciones no se persisten en el MVP; solo el borrador de asunto que el usuario decida guardar.

## Consecuencias

- Costo mínimo y modelo intercambiable.
- Bedrock Guardrails y una evaluación formal de NIA quedan como pendiente P7.

## Implementación (T13)

- **Función** `nia-chat` (`amplify/functions/nia-chat`): mutación `nia` de Amplify Data, solo para el grupo `CLIENTE`. Recibe la conversación (hasta 10 mensajes de 1,500 caracteres) y devuelve respuesta, materia, título, resumen, datos faltantes, si debe derivar a un abogado y cuántos mensajes le quedan hoy.
- **Salida estructurada forzada** con la herramienta `responder` de la API Converse; no se interpreta texto libre.
- **Filtro de seguridad** con un reintento y una respuesta de respaldo (ver [la evaluación](../validacion/nia-evaluacion.md)).
- **Tope diario** de 30 mensajes por persona (`NIA_TOPE_DIARIO`), contado de forma atómica en una tabla de DynamoDB con vencimiento. Se cuenta antes de llamar al modelo.
- **Permisos mínimos**: la función solo puede invocar el modelo configurado y actualizar esa tabla. Los errores que ve el cliente son códigos estables y nunca se registra el contenido de la conversación.
- **Cambiar de modelo**: `NIA_MODEL_ID` en el entorno al desplegar. El permiso de IAM se ajusta solo al modelo indicado; un perfil de inferencia entre regiones (por ejemplo, Haiku) requeriría ampliar ese permiso.
