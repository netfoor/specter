import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { NIA_LIMITES, fechaDelDia, validarMensajes } from '../../../shared/domain/nia'
import type { Schema } from '../../data/resource'
import { MODELO_POR_DEFECTO, orientar } from './nucleo'
import { LimiteDiarioError, registrarUso } from './uso'

const bedrock = new BedrockRuntimeClient()
const db = new DynamoDBClient()

/**
 * Los errores que ve el cliente son códigos estables: NO_AUTORIZADO, MENSAJE_INVALIDO,
 * LIMITE_DIARIO y NIA_NO_DISPONIBLE. Nunca se registra el contenido de la conversación.
 */
export const handler: Schema['nia']['functionHandler'] = async (event) => {
  const persona = (event.identity as { sub?: string } | null)?.sub
  if (!persona) throw new Error('NO_AUTORIZADO')

  const validacion = validarMensajes(event.arguments.mensajes)
  if (!validacion.ok) throw new Error(`MENSAJE_INVALIDO: ${validacion.motivo}`)

  const tope = Number(process.env.NIA_TOPE_DIARIO ?? NIA_LIMITES.topeDiario)
  const tabla = process.env.TABLA_USO_NIA
  if (!tabla) throw new Error('NIA_NO_DISPONIBLE')

  let restantes: number
  try {
    restantes = await registrarUso(db, tabla, persona, fechaDelDia(new Date()), tope)
  } catch (error) {
    if (error instanceof LimiteDiarioError) throw error
    console.error('No se pudo registrar el uso de NIA:', (error as Error).name)
    throw new Error('NIA_NO_DISPONIBLE', { cause: error })
  }

  try {
    const respuesta = await orientar(
      bedrock,
      process.env.NIA_MODEL_ID ?? MODELO_POR_DEFECTO,
      validacion.mensajes,
    )
    return { ...respuesta, restantes }
  } catch (error) {
    console.error('NIA no pudo responder:', (error as Error).name)
    throw new Error('NIA_NO_DISPONIBLE', { cause: error })
  }
}
