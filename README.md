# Specter

Plataforma LegalTech que conecta a personas y empresas con abogados especializados y verificados, e integra en un solo lugar el descubrimiento, la contratación, la comunicación y la gestión de asuntos jurídicos.

> **Estado:** prototipo (MVP) en construcción. El entorno público en `https://specter.foor.dev` es una **demostración**: no debe ingresarse información real.

## Qué incluye el MVP

- Registro e inicio de sesión para clientes y abogados.
- Perfiles profesionales y directorio de abogados.
- Asuntos del cliente y matching explicado con abogados compatibles.
- Solicitud de contratación, propuesta de honorarios, contrato de demostración y desglose transparente de la comisión.
- Expediente digital con chat en tiempo real, documentos y bitácora de actuaciones.
- **NIA**, asistente de IA para orientar al usuario y clasificar la materia de su asunto. NIA no sustituye a un abogado.

El alcance completo, lo que se simplificó y lo que queda para después está en [docs/spec.md](docs/spec.md).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Backend | AWS Amplify Gen 2: Cognito, AppSync, DynamoDB, S3, Lambda |
| IA | Amazon Bedrock (modelo ligero configurable) |
| Plataforma | Amplify Hosting (`amplify.yml`), dominio en Cloudflare |
| CI/CD | GitHub Actions + Amplify Hosting |

## Desarrollo local

Requiere Node 22.

```bash
npm install
npm run dev          # servidor local en http://localhost:5173
npm run lint && npm run typecheck && npm test
npm run build        # genera dist/
```

## Despliegue

Amplify Hosting despliega backend y frontend con `amplify.yml` en cada push a `main` ([ADR-0008](docs/adr/0008-solo-amplify-sin-terraform.md)). Configuración inicial, una sola vez:

1. En la consola de Amplify Hosting, conectar el repositorio de GitHub, rama `main`.
2. En *Dominios personalizados*, agregar `foor.dev` con el subdominio `specter` hacia `main`.
3. En Cloudflare, crear los dos CNAME que indica Amplify (validación del certificado y `specter`) **con el proxy desactivado**.
4. En *Reescrituras y redirecciones*, agregar antes de la regla por defecto la regla de SPA `</^[^.]+$|\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>` hacia `/index.html` con estado 200. La regla por defecto (`/<*>`, 404-200) no basta: las rutas profundas reciben un 301 con diagonal final y terminan en 404.
5. Comprobar que `/abogados` carga al recargar la página.
6. Sembrar los datos de demostración en el backend de producción: generar sus salidas con `npx ampx generate outputs --app-id <id> --branch main --out-dir <carpeta>` y correr `AMPLIFY_OUTPUTS=<carpeta>/amplify_outputs.json npm run seed`.

## Backend personal (sandbox)

Cada persona despliega su propio backend de Amplify Gen 2 para desarrollar. Requiere credenciales de AWS con permisos sobre CloudFormation, Cognito, Lambda e IAM.

```bash
AWS_PROFILE=<tu-perfil> npx ampx sandbox --identifier <nombre>   # genera amplify_outputs.json
AWS_PROFILE=<tu-perfil> npx ampx sandbox delete --identifier <nombre>
```

`amplify_outputs.json` no se versiona. Sin ese archivo la app funciona, pero sin cuentas.

Con el sandbox desplegado, las pruebas de autorización crean personas de prueba reales, comprueban los permisos de cada modelo y las eliminan al terminar:

```bash
AWS_PROFILE=<tu-perfil> npm run test:autorizacion
```

## Datos de demostración

Para ver el producto con contenido, el script de siembra crea una cuenta de administración, una de cliente y 12 abogados ficticios (10 publicados y 2 pendientes de revisión, para probar el panel). Es idempotente, aplica en cada corrida la contraseña de `SEED_DEMO_PASSWORD` a las cuentas de demostración (para cambiarla basta con editar `.env` y volver a correrlo) y afecta solo al backend de `amplify_outputs.json` o del archivo indicado en `AMPLIFY_OUTPUTS`.

```bash
# En .env: SEED_DEMO_PASSWORD=<contraseña de al menos 12 caracteres para las cuentas demo>
npm run seed            # crea o actualiza los datos
npm run seed:limpiar    # retira los datos y las cuentas de demostración
```

Las cuentas son `admin@`, `cliente@` y `abogado01@` a `abogado12@` en `demo.specter.foor.dev`. Los correos no tienen buzón y las cédulas llevan el prefijo `DEMO`.

## Evaluar a NIA

Mide la clasificación de materias y los casos de seguridad de NIA contra Bedrock y falla si no alcanza el criterio de aceptación. Los resultados y sus límites están en [docs/validacion/nia-evaluacion.md](docs/validacion/nia-evaluacion.md).

```bash
AWS_PROFILE=<tu-perfil> npm run nia:evaluar
```

## Documentación

Toda la documentación vive en [`docs/`](docs/README.md) y puede abrirse como bóveda de Obsidian.

## Licencia

Por definir.
