# Lenguaje ubicuo

Términos que se usan igual en conversaciones, documentación, interfaz y código. En el código, entidades y campos se nombran en español sin acentos (`Asunto`, `PerfilAbogado`, `estadoVerificacion`).

| Término | Definición | Código |
|---|---|---|
| Cliente | Persona física o moral que busca un servicio jurídico | grupo `CLIENTE`, `PerfilCliente` |
| Abogado | Profesional que ofrece servicios en la plataforma | grupo `ABOGADO`, `PerfilAbogado` |
| Administrador | Operador de Specter que controla la calidad de la red | grupo `ADMIN` |
| Perfil profesional | Información pública del abogado, visible solo si está publicada | `PerfilAbogado` |
| Verificación manual | Revisión realizada por un administrador; no implica verificación de identidad automatizada | `estadoVerificacion = VERIFICADO_MANUAL` |
| Asunto | Necesidad jurídica descrita por el cliente, antes y después de contratar | `Asunto` |
| Materia | Rama del derecho a la que pertenece el asunto (catálogo) | `Materia` (enum) |
| Coincidencia | Resultado del matching entre un asunto y un perfil, con puntuación y criterios | `Coincidencia` (valor calculado) |
| Solicitud de contratación | Invitación del cliente a un abogado para atender un asunto | `Solicitud` |
| Declaración de no conflicto | Manifestación del abogado de no tener conflicto de interés, previa a aceptar | `declaracionNoConflicto` |
| Propuesta de honorarios | Monto, alcance y forma de pago que ofrece el abogado | `Propuesta` |
| Desglose | Honorarios, comisión de Specter, monto que recibe el abogado e impuestos | `Desglose` (valor calculado) |
| Comisión Specter | 10% de los honorarios, descontado del abogado | `COMISION_PCT = 0.10` |
| Contrato | Contrato de prestación de servicios generado de la plantilla con los datos de la propuesta | `Contrato` |
| Expediente | Centro operativo del asunto contratado; nace cuando ambas partes aceptan el contrato | `Expediente` |
| Participantes | Cliente y abogado de un expediente; únicos con acceso | `participantes` |
| Mensaje | Comunicación dentro del expediente | `Mensaje` |
| Documento | Archivo asociado al expediente | `Documento` |
| Actuación | Registro de bitácora, solo de anexado | `Actuacion` |
| NIA | Asistente de IA que orienta, clasifica y prepara; no asesora | `nia` |

Términos que **no** se usan: "caso" (se usa *asunto* o *expediente*), "match" en la interfaz (se usa *coincidencia*), "consulta legal" para NIA (se usa *orientación*).
