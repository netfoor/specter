# ADR-0007: Documentos del expediente con enlaces firmados

- **Estado:** aceptada
- **Fecha:** 2026-10-23

## Contexto

Las partes de un expediente comparten documentos (spec HU-10). Solo ellas deben poder subirlos y descargarlos, con un máximo de 10 MB y tipos permitidos (PDF, JPG, PNG y DOCX). Amplify Storage asigna permisos por ruta e identidad, pero no puede decidir según los participantes de un expediente.

## Decisión

1. **Bucket privado** (`documentos`, en una pila propia): acceso público bloqueado, cifrado, TLS obligatorio y CORS solo para los orígenes de la app. Nadie lee ni escribe sin una firma emitida por la función.
2. **Subida en tres pasos**, todo en `flujo-asunto`:
   - `solicitarSubida`: comprueba que la persona sea parte y que el expediente siga en gestión, y entrega un POST firmado de 5 minutos. La ruta (`expedientes/{expediente}/{id}`) la genera el servidor. **S3 hace cumplir** el tamaño (1 byte a 10 MB), el tipo declarado y los metadatos de autor y nombre.
   - El navegador sube directo a S3.
   - `confirmarSubida`: consulta S3 y registra el documento y su actuación solo si el archivo existe, lo subió esa misma persona y cumple tipo y tamaño. Confirmar dos veces no duplica.
3. **Descarga** con `urlDeDescarga`: enlace firmado de 5 minutos como archivo adjunto, solo para las partes, también con el expediente concluido.
4. **Permisos mínimos:** la función solo puede `PutObject` y `GetObject` bajo `expedientes/*`.

## Verificación

- Integración contra S3 real (`tests/autorizacion/documentos.test.ts`, 11 casos): S3 rechazó un archivo de más de 10 MB (`EntityTooLarge`) y un tipo distinto del autorizado (403); el acceso directo sin firma devuelve 403; una persona ajena no obtiene enlaces; sin archivo o con otro autor no se registra; tras concluir no se suben documentos pero se descargan.
- Navegador: un `.txt` se rechaza antes de enviarse; la abogada descargó el PDF que subió la clienta con el contenido íntegro.

## Consecuencias

- Sin permiso de listar el bucket, un objeto inexistente responde 403 en lugar de 404; la función trata ambos como «sin archivo».
- Un archivo subido sin confirmar queda en S3 sin registro. Es dato de demostración; una limpieza programada queda pendiente para producción.
- El bucket se elimina con el backend porque solo guarda datos de demostración; en producción debe conservarse.
