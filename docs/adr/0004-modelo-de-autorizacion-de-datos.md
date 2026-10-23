# ADR-0004: Modelo de autorización de datos

- **Estado:** aceptada
- **Fecha:** 2026-10-22

## Contexto

La spec exige que cada persona acceda solo a lo que le corresponde y que las transiciones de estado ocurran en el servidor. Amplify Data ofrece reglas por modelo y por campo (propietario, propietario definido en un campo, grupo, invitado), sin condiciones sobre el valor de otros campos.

## Decisión

1. **Contenido privado por participantes.** Solicitud, propuesta, contrato, expediente, mensaje, documento y actuación llevan una lista `participantes` con identidades `sub::username`. Solo ellos leen.
2. **Escritura del servidor.** Esos modelos no tienen regla de escritura para el cliente web. Las funciones de T14 a T17 los escriben con permisos propios.
3. **Campos con dueño distinto.** `etapa` y `lectores` del asunto, y `publicado` y `estadoVerificacion` del perfil, tienen regla de campo que impide al cliente escribirlos.
4. **Directorio público separado.** `PerfilPublico` es una copia sin datos privados que solo escribe `ADMIN` y que leen invitados y usuarios.
5. **Administrador acotado.** `ADMIN` administra perfiles; no lee asuntos, contratos ni expedientes.
6. **Sin borrado desde el cliente.** La dueña de un asunto no tiene `delete`: con reglas por campo, AppSync rechaza el borrado del registro completo (comprobado en el sandbox), y abrirlo exigiría permiso de borrado sobre `etapa`, con el riesgo de reiniciar un asunto contratado. Eliminar o cancelar será una acción del servidor.

## Alternativas descartadas

- **Un solo `PerfilAbogado` con `publicado`:** Amplify no puede abrir la lectura según ese campo.
- **Escribir mensajes desde el cliente con `participantes` enviado por el cliente:** permitiría inyectar mensajes en expedientes ajenos, porque no hay forma de validar `participantes` contra el expediente.
- **Valores por defecto en campos protegidos:** fallan al crear (se comprobó en el sandbox).

## Verificación

`npm run test:autorizacion` crea cuatro personas reales (cliente, abogado, cliente ajena y administrador) en el sandbox y comprueba 38 casos de lectura y escritura permitidas y denegadas, incluido el acceso de invitados. Requiere un sandbox desplegado y credenciales de AWS; no corre en CI.
