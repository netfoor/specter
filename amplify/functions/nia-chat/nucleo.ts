import {
  ConverseCommand,
  type BedrockRuntimeClient,
  type Message,
} from '@aws-sdk/client-bedrock-runtime'
import {
  RESPUESTA_DE_RESPALDO,
  esRespuestaSegura,
  interpretarSalida,
  type MensajeNia,
  type RespuestaNia,
} from '../../../shared/domain/nia'
import { HERRAMIENTA, REFUERZO_REINTENTO, SISTEMA } from './prompt'

export const MODELO_POR_DEFECTO = 'amazon.nova-lite-v1:0'

type Bedrock = Pick<BedrockRuntimeClient, 'send'>

async function consultar(
  bedrock: Bedrock,
  modeloId: string,
  mensajes: MensajeNia[],
  reforzar: boolean,
): Promise<RespuestaNia | null> {
  const conversacion: Message[] = mensajes.map((m) => ({
    role: m.rol === 'usuario' ? 'user' : 'assistant',
    content: [{ text: m.texto }],
  }))

  const respuesta = await bedrock.send(
    new ConverseCommand({
      modelId: modeloId,
      system: [{ text: reforzar ? SISTEMA + REFUERZO_REINTENTO : SISTEMA }],
      messages: conversacion,
      toolConfig: {
        tools: [HERRAMIENTA],
        toolChoice: { tool: { name: HERRAMIENTA.toolSpec.name } },
      },
      inferenceConfig: { maxTokens: 700, temperature: 0.2 },
    }),
  )
  const uso = respuesta.output?.message?.content?.find((c) => c.toolUse)?.toolUse
  return interpretarSalida(uso?.input)
}

/**
 * Orienta a la persona con la conversación recibida. Si la respuesta incumple los filtros de
 * seguridad (garantías, citas legales, cifras nuevas) se reintenta una vez con un refuerzo y, si
 * persiste, se entrega una respuesta de respaldo que deriva a un abogado.
 */
export async function orientar(
  bedrock: Bedrock,
  modeloId: string,
  mensajes: MensajeNia[],
): Promise<RespuestaNia> {
  const textoPersona = mensajes
    .filter((m) => m.rol === 'usuario')
    .map((m) => m.texto)
    .join('\n')
  const segura = (texto: string | null) =>
    texto === null || esRespuestaSegura(texto, textoPersona)

  let ultima: RespuestaNia | null = null
  for (const reforzar of [false, true]) {
    const salida = await consultar(bedrock, modeloId, mensajes, reforzar)
    ultima = salida ?? ultima
    if (salida && esRespuestaSegura(salida.respuesta, textoPersona)) {
      return {
        ...salida,
        titulo: segura(salida.titulo) ? salida.titulo : null,
        resumen: segura(salida.resumen) ? salida.resumen : null,
      }
    }
  }

  return {
    respuesta: RESPUESTA_DE_RESPALDO,
    materia: ultima?.materia ?? null,
    titulo: null,
    resumen: null,
    datosFaltantes: [],
    derivarAAbogado: true,
  }
}
