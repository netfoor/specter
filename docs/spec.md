# Especificación funcional del MVP

**Versión:** 0.1 · **Fecha:** 2026-10-22 · **Estado:** aprobada para iniciar la implementación

## 1. Propósito

Construir un prototipo funcional de extremo a extremo que demuestre el flujo central de Specter (necesidad → materia → especialistas → comparar → elegir → contratar → expediente → gestionar → concluir) y sirva para validar la propuesta con abogados y posibles compradores o suscriptores.

## 2. Supuestos y decisiones de alcance

| Tema | Decisión |
|---|---|
| Datos | Solo de demostración. Los perfiles de abogados pueden ser reales; asuntos y documentos son ficticios. |
| Pagos | Se muestra el desglose; no hay pasarela ni movimiento de dinero. |
| Comisión | 10% **descontado de los honorarios del abogado**. El cliente paga los honorarios (más impuestos aplicables) y el abogado recibe el 90%. |
| Impuestos | Se muestran como "por definir según el régimen fiscal"; no se calculan. |
| Contrato | Plantilla con aceptación digital de **demostración, sin validez jurídica**. |
| Verificación | Manual, realizada por un administrador. No se cargan identificaciones oficiales. |
| NIA | Modelo ligero de Bedrock para orientación y clasificación. |
| Banner | Permanente: "Entorno de demostración: no ingreses información real". |

## 3. Actores

| Actor | Responsabilidad en el MVP |
|---|---|
| Visitante | Conoce la propuesta y consulta el directorio público |
| Cliente | Describe su asunto (con o sin NIA), compara abogados, solicita, contrata y gestiona su expediente |
| Abogado | Mantiene su perfil, recibe solicitudes, declara ausencia de conflicto, propone honorarios y gestiona el expediente |
| Administrador | Publica y verifica perfiles y consulta los indicadores del piloto |
| NIA | Orienta, clasifica la materia y prepara el borrador del asunto |

## 4. Clasificación del alcance

### A. Imprescindible (de extremo a extremo)
Registro por rol, perfil del abogado, directorio, asunto, matching explicado, comparación, solicitud, aceptación con declaración de no conflicto, propuesta, contrato y desglose, expediente con chat, documentos y bitácora, conclusión del asunto.

### B. Simplificado
NIA (modelo ligero, solo orientación y clasificación), verificación manual, conflicto de interés como declaración, panel admin con contadores, MFA opcional.

### C. Etapas posteriores (se muestran como "Próximamente" cuando ayuden a comunicar la visión)
Pagos reales y CFDI, firma electrónica con validez, verificación de identidad o biometría, videollamadas, agenda y recordatorios, reputación verificada, NIA para abogados, analítica, líneas Business, Enterprise, Pro y Government.

## 5. Historias de usuario y criterios de aceptación

### HU-01 Registro por rol
Como visitante quiero registrarme como cliente o como abogado para usar la plataforma.
- [ ] El formulario permite elegir **Cliente** o **Abogado**; la opción Administrador no existe.
- [ ] Tras confirmar el correo, el usuario pertenece al grupo correspondiente (`CLIENTE` o `ABOGADO`).
- [ ] El inicio de sesión ofrece MFA TOTP opcional.
- [ ] El registro enlaza el aviso de privacidad y los términos de demostración.

### HU-02 Perfil profesional
Como abogado quiero completar mi perfil profesional para aparecer en el directorio.
- [ ] Puedo editar nombre, fotografía, materias, especialidades, ubicación, jurisdicciones, idiomas, años de experiencia, modalidad, rango orientativo de honorarios, disponibilidad y semblanza.
- [ ] Mi perfil queda `PENDIENTE` y no es público hasta que un administrador lo publique.
- [ ] No puedo modificar mi estado de verificación ni el de publicación.

### HU-03 Directorio público
Como visitante quiero ver los abogados disponibles para conocer la red.
- [ ] Solo se listan perfiles publicados.
- [ ] La insignia "Verificado manualmente por Specter" aparece solo si un administrador lo marcó.
- [ ] Ningún dato de clientes ni de asuntos aparece en un perfil.

### HU-04 Describir mi asunto
Como cliente quiero describir mi problema para encontrar al abogado adecuado.
- [ ] Puedo capturar título, descripción, materia, ubicación, modalidad y rango de presupuesto.
- [ ] El asunto se guarda como `BORRADOR` y solo yo puedo verlo.
- [ ] Al publicarlo pasa a `ABIERTO`.

### HU-05 Orientación con NIA
Como cliente quiero conversar con NIA para entender qué tipo de problema tengo.
- [ ] NIA responde en español, en lenguaje sencillo, y siempre muestra el aviso "NIA no sustituye a un abogado".
- [ ] NIA propone una materia del catálogo y un resumen; con un clic prellena el formulario del asunto.
- [ ] NIA no emite recomendaciones jurídicas concretas y deriva a un abogado cuando corresponde.
- [ ] Existe un tope diario de mensajes por usuario.

### HU-06 Matching y comparación
Como cliente quiero ver abogados compatibles y compararlos.
- [ ] Se listan perfiles publicados ordenados por puntuación, con los criterios que coincidieron (materia, ubicación, modalidad, presupuesto, disponibilidad, verificación).
- [ ] Puedo comparar hasta 3 perfiles lado a lado.

### HU-07 Solicitar contratación
Como cliente quiero enviar una solicitud a uno o varios abogados.
- [ ] Puedo enviar un asunto `ABIERTO` a un máximo de 3 abogados.
- [ ] El abogado solo ve el asunto cuando recibe la solicitud.
- [ ] Puedo retirar una solicitud mientras esté `ENVIADA`.

### HU-08 Aceptar y proponer honorarios
Como abogado quiero aceptar una solicitud y proponer mis honorarios.
- [ ] Para aceptar debo marcar la declaración de no conflicto de interés; se guarda con fecha.
- [ ] Puedo rechazar la solicitud.
- [ ] Propongo monto (MXN), alcance y forma de pago; el sistema genera el contrato a partir de la plantilla.

### HU-09 Contrato y desglose
Como cliente quiero revisar el contrato y el desglose antes de aceptar.
- [ ] El desglose muestra honorarios, comisión de Specter (10%), monto que recibe el abogado e impuestos "por definir". Ejemplo: 10,000.00 → 1,000.00 / 9,000.00.
- [ ] La leyenda "Aceptación de demostración, sin validez jurídica" es visible.
- [ ] Al aceptar ambas partes se crea el expediente, el asunto pasa a `CONTRATADO` y las demás solicitudes se retiran.

### HU-10 Expediente
Como participante quiero gestionar el asunto en un solo lugar.
- [ ] Los mensajes llegan en tiempo real a la otra parte.
- [ ] Puedo subir y descargar documentos (máx. 10 MB; PDF, imágenes, DOCX).
- [ ] La bitácora registra automáticamente contratación, documentos y cambios de estado.
- [ ] Un usuario que no participa no puede leer ni escribir nada del expediente.
- [ ] El abogado puede concluir el expediente; el asunto pasa a `CONCLUIDO`.

### HU-11 Administración
Como administrador quiero controlar la calidad de la red y medir el piloto.
- [ ] Puedo publicar u ocultar perfiles y marcarlos como verificados manualmente.
- [ ] Veo contadores: abogados registrados, verificados, clientes, asuntos, solicitudes, contrataciones y concluidos.

## 6. Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | HTTPS en todo el tráfico; datos cifrados en reposo (DynamoDB, S3). |
| RNF-02 | Autorización por registro aplicada en el servidor y cubierta con pruebas. |
| RNF-03 | Interfaz adaptable (móvil y escritorio), en español de México, siguiendo `ui-minimal`. |
| RNF-04 | Despliegue automático en cada merge a `main`. |
| RNF-05 | Logs sin datos personales ni contenido de chat; retención de 14 días. |
| RNF-06 | Costo controlado: alerta de presupuesto en AWS y tope de uso de NIA. |
| RNF-07 | Accesibilidad básica: contraste suficiente, navegación por teclado, etiquetas en formularios. |

## 7. Indicadores del piloto (contexto, sec. XXIX)

Abogados registrados y verificados, clientes, asuntos creados, coincidencias consultadas, solicitudes, contrataciones, conclusión y retroalimentación cualitativa del equipo y de posibles compradores.
