# ADR-0001: Amplify Gen 2 para la aplicación y Terraform para la plataforma

- **Estado:** reemplazada en parte por [ADR-0008](0008-solo-amplify-sin-terraform.md): ya no se usa Terraform
- **Fecha:** 2026-10-22

## Contexto

Se necesita un MVP desplegado en `specter.foor.dev` desde el primer día de desarrollo, con despliegue continuo desde GitHub e infraestructura como código. El DNS de `foor.dev` está en Cloudflare, no en Route 53.

## Opciones consideradas

| Criterio | Amplify Gen 2 | Terraform (todo) |
|---|---|---|
| Tiempo al primer despliegue | Horas | 1–2 días |
| Complejidad inicial | Baja; TypeScript junto al código | Media/alta |
| Control de recursos | Medio (escape a CDK) | Total |
| Reproducibilidad | Alta (sandbox por desarrollador, ambiente por rama) | Alta |
| Integración con GitHub | Nativa (build por push) | Se construye en Actions |
| Recursos fuera de AWS (Cloudflare) | No | Sí |
| Evolución | Buena; migrable a CDK puro | Excelente |

También se descartó **CDK puro**: ofrece más control que Amplify, pero exige construir a mano hosting, CI y el cableado del front, que Amplify ya resuelve.

## Decisión

Usar ambas herramientas, cada una con su responsabilidad:

- **Amplify Gen 2** define el backend de la aplicación (auth, data, storage, funciones) y el hosting. Es infraestructura como código sobre CDK.
- **Terraform** define la plataforma: `aws_amplify_app`, rama `main`, `aws_amplify_domain_association`, los registros DNS en Cloudflare (`proxied = false`), un AWS Budget con alerta y su estado remoto en S3 (cifrado, versionado, bloqueo nativo).

## Consecuencias

- Hay dos herramientas, pero no se traslapan.
- Si conectar `aws_amplify_app` al repositorio de GitHub vía Terraform resulta problemático, la app se crea con un script versionado (`aws amplify create-app`) y Terraform conserva DNS y presupuesto.
- El token de Cloudflare vive solo en `.env` local (`CLOUDFLARE_API_TOKEN`).
