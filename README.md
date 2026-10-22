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
| Plataforma | Terraform: app de Amplify, dominio, DNS en Cloudflare, presupuesto |
| CI/CD | GitHub Actions + Amplify Hosting |

## Desarrollo local

Requiere Node 22.

```bash
npm install
npm run dev          # servidor local en http://localhost:5173
npm run lint && npm run typecheck && npm test
npm run build        # genera dist/
```

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

## Documentación

Toda la documentación vive en [`docs/`](docs/README.md) y puede abrirse como bóveda de Obsidian.

## Licencia

Por definir.
