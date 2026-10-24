# Dudas abiertas del dominio

Preguntas que el contexto no resuelve. Mientras no se respondan, el MVP usa el supuesto indicado.

| ID | Pregunta | Supuesto del MVP | Impacto si cambia | Estado |
|---|---|---|---|---|
| D1 | ¿Catálogo definitivo de materias y jurisdicciones? | Catálogo propuesto en [modelo.md](modelo.md) | Bajo (enum configurable) | Abierta |
| D2 | ¿Quién verifica abogados y con qué criterios y documentos? | Verificación manual de un admin, sin documentos | Alto para el piloto (carga de INE/cédula, consulta SEP) | Abierta |
| D3 | ¿Los honorarios son solo fijos o también por hora o por etapa? | Monto fijo por asunto | Medio (modelo de propuesta y desglose) | Abierta |
| D4 | ¿Cómo se tratan IVA y retenciones? | "Por definir según régimen fiscal" | Alto para el cobro real | Abierta |
| D5 | ¿Quién es el Responsable del tratamiento de datos (persona física o moral)? | Provisional: Fortino Romero Mantilla (persona física). Faltan domicilio y correo de contacto para derechos ARCO | Alto (aviso de privacidad) | Abierta |
| D6 | ¿Un asunto puede enviarse a varios abogados a la vez? | Sí, hasta 3 | Bajo | Abierta |
| D7 | ¿Quién puede concluir un expediente? | Solo el abogado | Bajo | Abierta |
| D8 | ¿Existen activos de marca (logo, paleta, tipografía)? | Identidad provisional sobria | Bajo | Abierta |
| D9 | ¿Qué jurisdicción aplica al contrato tipo? | Plantilla genérica de demostración | Alto antes de contratos reales | Abierta |
| D10 | ¿Qué peso tiene cada criterio del matching y se incorporan jurisdicción, especialidad, disponibilidad y valoraciones? | Pesos de [modelo.md](modelo.md): materia 40, ubicación 25, modalidad 15, presupuesto 15, verificación 5 | Medio (orden de los resultados) | Abierta |

## Resueltas

| ID | Pregunta | Resolución | Fecha |
|---|---|---|---|
| R-01 | El contexto se contradice sobre la comisión: la sec. XVI la suma al total del cliente y la XVII la descuenta al abogado | Se **descuenta al abogado** (ejemplo de la sec. XVII) | 2026-10-22 |
| R-02 | ¿Pagos reales en el MVP? | No; solo el desglose | 2026-10-22 |
| R-03 | ¿Datos reales en el MVP? | Solo de demostración | 2026-10-22 |
| R-04 | ¿Puede el abogado rechazar una solicitud que ya aceptó? | No; solo el cliente puede retirarla | 2026-10-23 |
| R-05 | ¿Se puede reenviar una solicitud al mismo abogado? | Solo si la anterior fue retirada o rechazada | 2026-10-23 |
