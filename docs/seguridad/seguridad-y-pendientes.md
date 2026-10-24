# Seguridad, privacidad y pendientes

Simplificar el alcance no significa construir una base insegura. Esta página separa lo que se resuelve desde el primer día de lo que se pospone, con la condición para abordarlo.

## Controles desde el día 1

| Área | Control |
|---|---|
| Repositorio público | `.gitignore` para `.env`, estado de Terraform, `amplify_outputs.json` y documentos de contexto; secret scanning y push protection; Dependabot; protección de `main` con PR y checks |
| Secretos | Solo en `.env` local o en almacenes de secretos; las Lambdas usan roles IAM, no llaves |
| Identidad | Cognito con correo verificado, política de contraseñas, MFA TOTP opcional; `ADMIN` nunca por autorregistro |
| Autorización | Reglas por registro en Amplify Data; transiciones solo en el servidor; pruebas de autorización con varios usuarios |
| Validación | Las entradas se validan en el dominio compartido (`shared/domain`) antes de usarse en cualquier Lambda |
| Archivos | S3 privado y cifrado; URLs prefirmadas de vida corta solo para participantes; límite de 10 MB y tipos permitidos |
| Tránsito y reposo | HTTPS (Amplify + ACM); cifrado en DynamoDB y S3 |
| Observabilidad | Logs de CloudWatch con retención de 14 días, sin datos personales ni contenido de chat |
| Costos | AWS Budget con alerta; tope diario de mensajes a NIA |
| IA | Aviso permanente "NIA no sustituye a un abogado"; prompt de sistema que impide asesoría concreta; filtro de respuestas con respaldo; tope diario de 30 mensajes por persona; permiso limitado al modelo configurado; no se registra el contenido de las conversaciones. Evaluación en [nia-evaluacion.md](../validacion/nia-evaluacion.md) |
| Demostración | Banner "Entorno de demostración: no ingreses información real" |

## Datos personales y normativa

- **Hecho:** aunque los asuntos sean ficticios, el registro recoge correo y nombre y, en el caso de los abogados, fotografía y número de cédula. Son datos personales.
- **Requisito no aplazable:** un aviso de privacidad simplificado y términos de uso de la demostración, enlazados en el registro, antes de abrir el registro a terceros.
- **Estado (T19):** existen el aviso integral (`/privacidad`), el simplificado en el registro y los términos de la demostración (`/terminos`), redactados conforme a la [Ley Federal de Protección de Datos Personales en Posesión de los Particulares](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf), publicada en el DOF el 20 de marzo de 2025 (última reforma del 14 de noviembre de 2025): elementos del artículo 15, aviso simplificado del artículo 16 fr. II, plazo de respuesta del artículo 31 y autoridad del artículo 2 fr. XV (Secretaría Anticorrupción y Buen Gobierno).
- **Bloqueante antes de recabar datos de terceros:** completar la identidad, el domicilio y el correo del responsable (`src/features/legal/responsable.ts`, duda D5) y la revisión jurídica de ambos textos. Mientras tanto, las páginas dicen que están pendientes.
- El contexto (sec. XIX) remite a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, el Código de Comercio, el Código Civil Federal y el Código Nacional de Procedimientos Civiles y Familiares. El texto vigente y su aplicación deben revisarse con un abogado; este documento no constituye esa revisión.

## Pendientes

| # | Pendiente | Prioridad | Motivo | Condición para abordarlo |
|---|---|---|---|---|
| P1 | Aviso de privacidad integral, derechos ARCO, políticas de conservación | Alta | Protección de datos | Antes de usar datos reales |
| P2 | Verificación de identidad y de cédula profesional | Alta | Confianza de la red | Piloto con abogados reales |
| P3 | Firma electrónica con validez jurídica | Alta | Contratos válidos | Antes de contratos reales |
| P4 | Pasarela de pagos, dispersión al abogado, CFDI, estructura fiscal | Alta | Cobro real | Figura fiscal definida |
| P5 | MFA obligatorio para abogados y administradores | Media | Expedientes confidenciales | Datos reales |
| P6 | IAM Identity Center en lugar de llaves de usuario IAM; OIDC de GitHub para CI | Media | Credenciales de larga vida | Más de una persona en el equipo |
| P7 | Bedrock Guardrails y evaluación formal de NIA | Media | Riesgo de asesoría indebida | NIA con usuarios reales |
| P8 | WAF, CloudTrail, respaldos PITR, plan de respuesta a incidentes | Media | Operación productiva | Inicio del piloto |
| P9 | Revisión de publicidad de servicios jurídicos y del sistema de reputación | Media | Contexto, sec. XXII y XXXI | Antes de activar valoraciones |
