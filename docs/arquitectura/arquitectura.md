# Arquitectura del MVP

Decisiones: [ADR-0001](../adr/0001-amplify-gen2-y-terraform.md) · [ADR-0002](../adr/0002-nia-con-modelo-ligero-de-bedrock.md) · [ADR-0003](../adr/0003-autenticacion-con-cognito-y-authenticator.md)

## Vista general

```mermaid
flowchart LR
  U[Navegador] -->|HTTPS| CF[Cloudflare DNS<br/>CNAME specter, sin proxy]
  CF --> AH[Amplify Hosting<br/>CloudFront + build desde main]
  U --> COG[Cognito User Pool<br/>CLIENTE / ABOGADO / ADMIN]
  U -->|GraphQL + suscripciones| AS[AppSync<br/>Amplify Data]
  AS --> DDB[(DynamoDB)]
  AS --> LWF[Lambda flujo-asunto<br/>transiciones y desglose]
  AS --> LNIA[Lambda nia-chat]
  LNIA --> BR[Amazon Bedrock<br/>modelo ligero]
  AS --> LDOC[Lambda url-documento]
  LDOC --> S3[(S3 privado<br/>expedientes/id/)]
  COG --> LPC[Lambda post-confirmación<br/>asigna grupo]
  GH[GitHub main] -->|webhook| AH
```

## Componentes

| Componente | Responsabilidad | Tecnología |
|---|---|---|
| Web | SPA con todas las vistas por rol | React + TypeScript + Vite + React Router |
| Autenticación | Registro, sesión, grupos, MFA opcional | Cognito vía Amplify Auth, componente `Authenticator` |
| API de datos | CRUD autorizado por registro y suscripciones en tiempo real | AppSync + DynamoDB vía Amplify Data |
| `flujo-asunto` | Transiciones de estado (solicitud, aceptación, propuesta, contrato, expediente, conclusión) | Lambda (TS) como mutaciones personalizadas |
| `nia-chat` | Orientación y clasificación con salida estructurada | Lambda (TS) + Bedrock Converse API |
| `url-documento` | Verifica participación y emite URL prefirmada | Lambda (TS) + S3 |
| `indicadores` | Cuenta usuarios por grupo y filas de las tablas para el panel; solo la puede invocar `ADMIN` | Lambda (TS), consulta personalizada de Amplify Data |
| `post-confirmacion` | Agrega al usuario al grupo elegido (nunca `ADMIN`) | Trigger de Cognito |
| Dominio compartido | Desglose, matching, máquina de estados | `shared/domain/` (TS puro) |
| Plataforma | App de Amplify, dominio, DNS, presupuesto | Terraform (`infra/terraform/`) |

Fuera del MVP por falta de necesidad concreta: colas, procesamiento asíncrono, API REST separada y base de datos relacional.

## Autorización por modelo (resumen)

Implementada en `amplify/data/resource.ts` y verificada con `npm run test:autorizacion` contra un sandbox. Detalle y motivos en [ADR-0004](../adr/0004-modelo-de-autorizacion-de-datos.md).

| Modelo | Lectura | Escritura desde el cliente web |
|---|---|---|
| `PerfilAbogado` | Dueño; `ADMIN` | Dueño crea y edita, salvo `publicado` y `estadoVerificacion` (solo `ADMIN`) |
| `PerfilPublico` | Invitados y cualquier usuario | Solo `ADMIN` |
| `PerfilCliente` | Solo la propia persona | Dueña |
| `Asunto` | Dueño; abogados en `lectores` (sin ver `lectores`) | Dueño, salvo `etapa` y `lectores` (servidor) |
| `Solicitud`, `Propuesta`, `Contrato`, `Expediente` | `participantes` | Ninguna: solo el servidor (T14, T15) |
| `Mensaje`, `Documento`, `Actuacion` | `participantes` | Ninguna: solo el servidor (T16, T17) |

`ADMIN` no lee asuntos, contratos ni expedientes. Sus contadores los calcula la función `indicadores`, que solo cuenta y nunca devuelve contenido.

Publicación de perfiles (panel de administración): se cambia primero la copia pública (`PerfilPublico`) y después el perfil, porque la copia es lo que expone al abogado. Las acciones permitidas en cada situación están en `shared/domain/administracion.ts`.

## Flujo principal

```mermaid
sequenceDiagram
  actor C as Cliente
  participant W as Web
  participant N as NIA
  participant API as AppSync / flujo-asunto
  actor A as Abogado
  C->>N: describe su problema
  N-->>W: materia + resumen
  W->>API: crear Asunto (BORRADOR → ABIERTO)
  W->>W: matching sobre perfiles publicados
  C->>API: enviar Solicitud (máx. 3)
  A->>API: aceptar con declaración de no conflicto
  A->>API: proponer honorarios → Contrato
  C->>API: aceptar Contrato
  A->>API: aceptar Contrato
  API-->>W: Expediente creado, Asunto CONTRATADO
  C->>A: mensajes y documentos en tiempo real
  A->>API: concluir → Asunto CONCLUIDO
```

## Ambientes

| Ambiente | Origen | URL |
|---|---|---|
| Demostración | rama `main` | `https://specter.foor.dev` |
| Sandbox personal | `npx ampx sandbox` | local |
