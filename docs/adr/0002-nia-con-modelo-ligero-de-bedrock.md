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
