# ADR-0003: Cognito con el componente Authenticator en lugar de Hosted UI

- **Estado:** aceptada
- **Fecha:** 2026-10-22

## Contexto

El MVP necesita autenticación real: hay tres roles con permisos distintos y expedientes privados. Se evaluó la Hosted UI (Managed Login) de Cognito para no construir el flujo de identidad.

## Decisión

- **Amazon Cognito** vía Amplify Auth, con inicio de sesión por correo y confirmación por correo.
- Componente **`Authenticator` de Amplify UI** con tema propio, en lugar de Hosted UI.
- Grupos `CLIENTE`, `ABOGADO` y `ADMIN`. Un trigger post-confirmación asigna el grupo elegido en el registro; `ADMIN` solo se asigna por script.
- MFA TOTP opcional.

## Motivos

- `Authenticator` se integra con Amplify Gen 2 sin configurar dominio de Cognito ni URLs de retorno, y respeta la identidad visual.
- Ninguna de las dos opciones implementa el flujo de identidad desde cero.

## Consecuencias

- Si se agrega inicio de sesión social (Google, Microsoft), se reevalúa Managed Login.
- MFA obligatorio para abogados y administradores queda como pendiente P5.
