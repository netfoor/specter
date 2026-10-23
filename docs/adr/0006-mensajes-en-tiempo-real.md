# ADR-0006: Mensajes del expediente en tiempo real

- **Estado:** aceptada
- **Fecha:** 2026-10-23

## Contexto

La conversación del expediente debe llegar en vivo a la otra parte (spec HU-10). Por ADR-0004, el cliente web no crea mensajes: si enviara la lista de participantes, podría inyectar mensajes en un expediente ajeno. Las suscripciones de AppSync solo se disparan cuando la escritura pasa por la API, no cuando la función escribe directo en DynamoDB.

## Decisión

1. **Enviar** con la mutación `enviarMensaje` (grupos `CLIENTE` y `ABOGADO`). La función `flujo-asunto` comprueba que la persona sea parte del expediente y que siga en gestión, y crea el mensaje **a través de AppSync** con sus permisos de IAM (`allow.resource(flujoAsunto)` a nivel de esquema). Los participantes y el autor salen del expediente y de la identidad, nunca del cliente web.
2. **Recibir** con la suscripción `onCreate` del modelo `Mensaje`, filtrada por expediente. AppSync aplica la regla `ownersDefinedIn('participantes')` a cada mensaje antes de entregarlo.
3. **Respaldo honesto:** si la suscripción falla, la pantalla lo dice y ofrece traer los mensajes nuevos.
4. **Concluir** con `concluirExpediente` (solo el abogado de la solicitud): expediente y asunto concluidos y una actuación en la bitácora, en una transacción. Un expediente concluido ya no admite mensajes.

## Verificación

- Navegador, con tres sesiones: la abogada recibió el mensaje de la clienta en 0.9 s sin recargar y viceversa. Una tercera clienta se suscribió desde el código de la app, con filtro por expediente y sin filtro, y **no recibió ningún mensaje**.
- Integración (`tests/autorizacion/expediente.test.ts`): solo las partes escriben y leen; nadie crea mensajes directo con la API; solo el abogado concluye; un expediente concluido rechaza mensajes.

## Consecuencias

- La función necesita permiso de IAM sobre la API de datos (puede leer y escribir todos los modelos por esa vía); se limita en el código a crear mensajes.
- Las actuaciones de la bitácora siguen escribiéndose directo en DynamoDB, así que no llegan en vivo; aparecen al recargar.
