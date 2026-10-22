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

## Documentación

Toda la documentación vive en [`docs/`](docs/README.md) y puede abrirse como bóveda de Obsidian.

## Licencia

Por definir.
